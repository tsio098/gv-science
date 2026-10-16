/**
 * ANCHOR TREE（/tree/*）クライアント。設計書 §7。
 *
 * - 送り先は Proxy Worker（GAS は経由しない）。
 * - Authorization: Bearer は LIFF なら id_token、外部ブラウザならセッション JWT。
 * - 問題画像は認証付き配信なので <img src> に直接書けない → fetch して blob URL にする。
 */
import { getLiffStatus } from './liff';
import { getTreeSessionToken } from './treeAuth';
import { withRetry, isTransientError } from './retry';

const BASE = (import.meta.env.VITE_TREE_ENDPOINT || 'https://gv-science-proxy.t-siotani.workers.dev').replace(/\/+$/, '');
const FETCH_TIMEOUT_MS = 30_000;

export type QType = 'tf' | 'calc' | 'reason';
/** ステージ: ROUTE（表・共通テスト型）/ ABYSS（裏・二次問題）。設計書 §5.6 */
export type TreeStage = 'front' | 'back';
export const QTYPES: QType[] = ['tf', 'calc', 'reason'];
export const QTYPE_LABEL: Record<QType, string> = { tf: '正誤問題', calc: '計算問題', reason: '考察問題' };

/**
 * 系統（分野色）。モック v31 で理論化学を 化学基礎範囲（basic）/ 化学応用範囲（applied）に分けた。
 * 旧 manifest の 'theory' は読み込み時に分野 ID で振り分ける（normalizeGroups）。
 */
export type FieldGroup =
  | 'basic' | 'applied' | 'inorganic' | 'organic' | 'polymer'
  // 生物（2026-10-15 Phase 6・教科書の編）: 生命現象と物質 / 遺伝情報と発生 / 環境応答 / 生態 / 進化と系統
  | 'matter' | 'gene' | 'response' | 'ecology' | 'evolution'
  // 化学基礎（2026-10-16 Phase 6・教科書の章）: 物質の構成 / 化学結合 / 物質量と濃度 / 酸と塩基 / 酸化還元
  | 'composition' | 'bonding' | 'mole' | 'acidbase' | 'redox'
  // 生物基礎（2026-10-16 Phase 6・教科書の章）: 生物の特徴 / 遺伝子とその働き / ヒトのからだの調節 / 植生と遷移 / 生態系とその保全
  | 'feature' | 'genefunc' | 'body' | 'vegetation' | 'ecosystem'
  // 地学基礎（2026-10-16 Phase 6・教科書の編）: 固体地球 / 地球の歴史 / 大気と海洋 / 宇宙 / 自然との共生
  | 'solid' | 'history' | 'atmos' | 'space' | 'coexist';
type RawFieldGroup = FieldGroup | 'theory';

/** 理論化学のうち化学基礎範囲の分野（ブリーフ §2.1）。残りの理論は化学応用範囲 */
const THEORY_BASIC = new Set(['busshitsu', 'genshi', 'ketsugo', 'ryo', 'san', 'sanka']);

function normalizeGroups(m: TreeManifest): TreeManifest {
  const fields = m.fields.map((f) =>
    (f.group as RawFieldGroup) === 'theory' ? { ...f, group: (THEORY_BASIC.has(f.id) ? 'basic' : 'applied') as FieldGroup } : f,
  );
  return { ...m, fields };
}

export interface TreeField {
  id: string;
  name: string;
  group: FieldGroup;
  icon: string;
  pos: { x: number; layer: number };
  prereqs: string[];
  types: Record<QType, string[]>;
  total: number;
}

export interface TreeManifest {
  subject: string;
  /** ABYSS の manifest は 'back'（ROUTE は無いか 'front'）*/
  stage?: TreeStage;
  name: string;
  version: number;
  unlockPct: number;
  timeLimitSec: Record<QType, number>;
  exams: { exam: string; lastDate: string; count: number }[];
  fields: TreeField[];
}

export interface Dist {
  fresh: number;
  review: number;
  solved: number;
  mastered: number;
}

export interface NodeStats {
  total: number;
  score: number;
  max: number;
  /** 0〜1 */
  mastery: number;
  solved: number;
  dist: Dist;
  /** 新着（追加から 14 日以内の試験）のうち未出題の数。Phase 3 の Proxy では無い */
  newCount?: number;
}

/** 順位。rank = null は 0 点（まだ載っていない）。of = 載っている人数 */
export interface RankInfo {
  rank: number | null;
  of: number;
}

export interface FieldProgress extends NodeStats {
  pct: number;
  unlocked: boolean;
  /** この分野の挑戦（提出）回数と、全解答の正答率（%）。解放条件に使う（2026-10-15〜）*/
  play?: { count: number; rate: number };
  prereqs: { field: string; pct: number; plays?: number; rate?: number; done: boolean }[];
  types: Record<QType, NodeStats>;
}

export interface TreeProgress {
  subject: string;
  version: number;
  /** 解放に要る正答率（%）*/
  unlockPct: number;
  /** 解放に要る挑戦回数（2026-10-15〜。古い Proxy では無い）*/
  unlockPlays?: number;
  total: NodeStats & { pct: number };
  fields: Record<string, FieldProgress>;
  /** 科目・分野ごとの自分の順位（Phase 4）*/
  rank?: { total: RankInfo; fields: Record<string, RankInfo> };
  newDays?: number;
  stage?: TreeStage;
  /** ABYSS が開いているか（ROUTE の全分野が解放 / 先生は常に。2026-10-15〜）*/
  abyss?: { open: boolean };
}

export interface TreeMe {
  userId: string;
  loginId: string;
  grade: string;
  subjects: string[];
  nickname: string;
}

/** ROUTE のマーク式。min: 0 は ⓪〜⑨ の数字マーク（Phase 5 の Proxy から。無ければ 1）*/
export interface ChoiceAnswer {
  kind: 'choice';
  boxes: { n: number; choices: number; min?: number }[];
  group: 'unordered' | null;
}

/**
 * ABYSS の解答欄（正解は渡ってこない）。
 *   choice  … options（ア・(a) 等）。optionText = 作り変えた選択肢の文 / optionImg = 構造式の候補画像。multi = すべて選ぶ
 *   term    … 語句・化学式（端末キーボード + 記号バー）。equation = 反応式
 *   numeric … 専用キーパッド。sci = 仮数 × 10^指数 / plain = 整数・小数。fixedExp があれば仮数だけ
 */
export type AbyssPart =
  | { kind: 'choice'; label: string | null; options: string[]; multi: boolean; optionText?: Record<string, string>; optionImg?: Record<string, string> }
  | { kind: 'term'; label: string | null; equation: boolean }
  | { kind: 'numeric'; label: string | null; format: 'sci' | 'plain'; unit: string | null; fixedExp?: number };

export interface PartsAnswer {
  kind: 'parts';
  parts: AbyssPart[];
  /** 欄の順序を問わない（「3 つ答えよ」等）*/
  unordered: boolean;
}

export interface PlayQuestion {
  id: string;
  type: QType;
  field: string;
  answer: ChoiceAnswer | PartsAnswer;
  img: { lead: string | null; body: string | null };
  given: string[];
  text: string | null;
  /** ABYSS: 設問の見出し（例「1 問2 ア」）*/
  label?: string | null;
  /** ABYSS: 作り変えた問い（説明・構造式・式を答える問題を選択式にしたもの）。画像の問題文の代わりにこれに答える */
  prompt?: string | null;
  source: { kind: string; exam: string; n: number | string | null };
  set: string | null;
}

/** 欄の値: choice は記号（multi は配列）、term・numeric は文字列（numeric は '1.6e-3' の形）*/
export type PartValue = string | string[];

export interface PlayUnit {
  set: string | null;
  qids: string[];
  limitSec: number;
  lead: string | null;
}

export interface TreeSession {
  sessionId: string;
  subject: string;
  stage?: TreeStage;
  field: string;
  qtype: QType;
  version: number;
  startedAt: number;
  units: PlayUnit[];
  questions: Record<string, PlayQuestion>;
}

export interface AnswerResult {
  qid: string;
  set: string | null;
  correct: boolean;
  /** ROUTE は選んだ番号、ABYSS は欄ごとの値 */
  value: PartValue[];
  /** 正解は返さない（2026-10-15〜）。古い Proxy の応答にだけある */
  answer?: string[];
  timeMs: number;
  bonus: number;
  gain: number;
  firstCorrect: boolean;
  bonusUp: number;
}

export interface SubmitResult {
  sessionId: string;
  stage?: TreeStage;
  nickname: string | null;
  results: AnswerResult[];
  summary: {
    gain: number;
    newCorrect: number;
    newCorrectPoints: number;
    bonusPoints: number;
    correct: number;
    total: number;
    elapsedMs: number;
  };
  node: { field: string; qtype: QType; before: NodeStats | null; after: NodeStats | null };
  fieldScore: {
    before: (NodeStats & { pct: number; unlocked: boolean; play?: { count: number; rate: number } }) | null;
    after: (NodeStats & { pct: number; unlocked: boolean; play?: { count: number; rate: number } }) | null;
  };
  newlyUnlocked: string[];
  /** 分野の順位の前後（Phase 4）*/
  rank?: { before: RankInfo; after: RankInfo };
}

export interface RankRow {
  rank: number;
  grade: string;
  nickname: string;
  score: number;
  me: boolean;
}

export interface TreeRanking {
  subject: string;
  stage?: TreeStage;
  field: string;
  qtype: QType | '*';
  count: number;
  top: RankRow[];
  me: { rank: number | null; score: number; grade: string; nickname: string };
}

/** API のエラー。code は Worker の error（NOT_REGISTERED / LOCKED / TOO_MANY …）か HTTP_xxx */
export class TreeApiError extends Error {
  constructor(public code: string, public status: number, public retryAfter?: number) {
    super(code);
  }
}

function bearer(): string | null {
  const s = getLiffStatus();
  if (s.mode === 'ready' && s.idToken) return s.idToken;
  return getTreeSessionToken();
}

async function rawFetch(path: string, init: RequestInit = {}, auth = true): Promise<Response> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (auth) {
    const t = bearer();
    if (!t) throw new TreeApiError('UNAUTHORIZED', 401);
    headers.Authorization = 'Bearer ' + t;
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(BASE + path, { ...init, headers, credentials: 'omit', signal: ac.signal });
  } catch (e) {
    if (ac.signal.aborted) throw new Error('TIMEOUT');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function call<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const res = await rawFetch(path, init, auth);
  const data = (await res.json().catch(() => null)) as ({ error?: string; retryAfter?: number } & T) | null;
  if (!res.ok || !data || data.error) {
    const code = (data && data.error) || `HTTP ${res.status}`;
    throw new TreeApiError(code, res.status, data?.retryAfter);
  }
  return data;
}

/** 4xx（認証・未登録・LOCKED 等）は待っても直らないのでリトライしない */
const retryable = (e: unknown) =>
  e instanceof TreeApiError ? e.status === 429 || e.status >= 500 : isTransientError(e);

const get = <T>(path: string) => withRetry(() => call<T>(path), { retries: 2, shouldRetry: retryable });
const post = <T>(path: string, body: unknown, auth = true) =>
  call<T>(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, auth);

export const treeLogin = (loginId: string) => post<{ token: string; exp: number }>('/tree/login', { loginId }, false);
export const fetchTreeMe = () => get<TreeMe>('/tree/me');
const stageQ = (stage: TreeStage) => (stage === 'back' ? '&stage=back' : '');
export const fetchTreeManifest = (subject: string, stage: TreeStage = 'front') =>
  get<TreeManifest>(`/tree/manifest?subject=${encodeURIComponent(subject)}${stageQ(stage)}`).then(normalizeGroups);
export const fetchTreeProgress = (subject: string, stage: TreeStage = 'front') =>
  get<TreeProgress>(`/tree/progress?subject=${encodeURIComponent(subject)}${stageQ(stage)}`);
export const startTreeSession = (subject: string, field: string, qtype: QType, stage: TreeStage = 'front') =>
  post<TreeSession>('/tree/session/start', stage === 'back' ? { subject, field, qtype, stage } : { subject, field, qtype });
export const submitTreeSession = (sessionId: string, answers: { qid: string; value: PartValue[]; timeMs: number }[]) =>
  post<SubmitResult>('/tree/session/submit', { sessionId, answers });
export const saveTreeNickname = (nickname: string) => post<{ nickname: string }>('/tree/profile', { nickname });
export const fetchTreeRanking = (subject: string, field = '*', qtype: QType | '*' = '*', stage: TreeStage = 'front') => {
  const q = new URLSearchParams({ subject });
  if (stage === 'back') q.set('stage', 'back');
  if (field !== '*') q.set('field', field);
  if (qtype !== '*') q.set('qtype', qtype);
  return get<TreeRanking>('/tree/ranking?' + q.toString());
};
/** 解答表の誤り報告（課題 #21）。1 人 1 問 1 回（2 回目は already: true）*/
export const reportTreeQuestion = (sessionId: string, qid: string) =>
  post<{ ok: boolean; already: boolean }>('/tree/report', { sessionId, qid });

const imageCache = new Map<string, Promise<string>>();

/** 認証付き画像 → blob URL（同じパスは 1 回だけ取る。失敗したら次回取り直す）*/
export function treeImage(path: string): Promise<string> {
  let p = imageCache.get(path);
  if (!p) {
    p = withRetry(async () => {
      const res = await rawFetch(path);
      if (!res.ok) throw new TreeApiError(`HTTP ${res.status}`, res.status);
      return URL.createObjectURL(await res.blob());
    }, { retries: 2, shouldRetry: retryable });
    p.catch(() => imageCache.delete(path));
    imageCache.set(path, p);
  }
  return p;
}

export const CIRCLED = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
export const circled = (v: string | number) => CIRCLED[Number(v)] ?? String(v);

/** 学年の表示（D1 は 'H3' '既卒' など）*/
export const gradeLabel = (g: string) => {
  const m = /^([HJ])([1-3])$/i.exec(g || '');
  return m ? (m[1]!.toUpperCase() === 'H' ? '高' : '中') + m[2] : g || '';
};

/** '2025_河合_共通テストK-パック_化学' → '2025 河合 共通テストK-パック 化学' */
export const examLabel = (exam: string) => exam.replace(/_/g, ' ');
