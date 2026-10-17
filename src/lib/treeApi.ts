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

/* ── チャンピオンアリーナ（設計書 §5.7・2026-10-17）────────────
 * ROUTE の全分野それぞれのマスター度 70% 以上で開放。2 週間 1 シーズン・全員共通の 10 問・1 人 1 回。
 * スコアは 基礎 25 : タイムボーナス 75（不正解は 0）。自己ベスト・通常のランキングとは別。 */

export interface ArenaSeason {
  /** 番号（起点 2026-10-19 = 1。それより前は 0 以下）*/
  n: number;
  /** 開始日 'YYYY-MM-DD'（JST）*/
  key: string;
  start: number;
  end: number;
}

export interface ArenaInfo {
  subject: string;
  season: ArenaSeason;
  /** 開放済み（条件を満たした / 今シーズンに挑戦を始めた / 先生）*/
  open: boolean;
  /** 開放条件: 全分野それぞれマスター度 need% 以上。fields = まだ届いていない分野 */
  cond: { need: number; done: number; of: number; fields: { id: string; mastery: number }[] };
  entry: null | {
    status: 'started' | 'done';
    startedAt: number;
    score: number | null;
    correct: number | null;
    total: number | null;
    elapsedMs: number | null;
    rank: RankInfo;
  };
  /** 今シーズンの掲載人数 */
  count: number;
  /** 前シーズンのチャンピオン（1 位。同点なら複数）*/
  champion: null | { season: ArenaSeason; list: { grade: string; nickname: string; score: number }[] };
  /**
   * 先生のスコア（2026-10-17 先生決定・ランキングには入れない）。今シーズン最高・今の組の 2 シーズン合算（同じ先生アカウントで両方そろったときだけ）。
   * 先生の記録が無ければ null。古い Proxy（v1）は boolean（＝見ている人が先生か）を返していた
   */
  staff: null | boolean | { seasonBest: number | null; pairSum: number | null };
  /** 見ている人が先生用アカウント（v2〜）*/
  staffSelf?: boolean;
  /** 今の組（ボーナスチケットの 2 シーズン・v2〜）*/
  pair?: ArenaSeason[];
}

/** アリーナを置く科目（2026-10-17 先生決定: 化学・生物だけ）*/
export const ARENA_SUBJECTS: readonly string[] = ['chemistry', 'biology'];
/** 見ている人が先生か（v1 の boolean と v2 の staffSelf の両方に対応）*/
export const arenaIsStaffSelf = (a: ArenaInfo) => a.staffSelf ?? a.staff === true;
/** 先生のスコア行（v2 のオブジェクトのときだけ）*/
export const arenaStaffScore = (a: ArenaInfo) => (a.staff && typeof a.staff === 'object' ? a.staff : null);

export interface ArenaSession extends TreeSession {
  arena: true;
  /** 途中で閉じた挑戦の再開（開始時刻はそのまま＝時間は進み続ける）*/
  resumed: boolean;
  season: ArenaSeason;
}

export interface ArenaResult {
  sessionId: string;
  arena: true;
  nickname: string | null;
  results: { qid: string; type: QType; correct: boolean; value: PartValue[]; timeMs: number; bonus: number; gain: number }[];
  summary: { score: number; basePoints: number; bonusPoints: number; correct: number; total: number; elapsedMs: number; max: number };
  rank: RankInfo;
  season: ArenaSeason;
}

export interface ArenaRankRow extends RankRow {
  correct: number;
  elapsedMs: number;
}

export interface ArenaRanking {
  subject: string;
  season: ArenaSeason;
  /** 2 シーズン合算（season=pair）のときの 2 シーズン。ボーナスチケットはこの合算 1 位に配る（未実装）*/
  pair?: ArenaSeason[];
  count: number;
  top: ArenaRankRow[];
  me: { rank: number | null; score: number; played: boolean; grade: string; nickname: string };
}

export const fetchArena = (subject: string) => get<ArenaInfo>(`/tree/arena?subject=${encodeURIComponent(subject)}`);
export const startArena = (subject: string) => post<ArenaSession>('/tree/arena/start', { subject });
export const submitArena = (sessionId: string, answers: { qid: string; value: PartValue[]; timeMs: number }[]) =>
  post<ArenaResult>('/tree/arena/submit', { sessionId, answers });
export type ArenaRankWhich = 'current' | 'prev' | 'pair';
export const fetchArenaRanking = (subject: string, season: ArenaRankWhich = 'current') =>
  get<ArenaRanking>(`/tree/arena/ranking?subject=${encodeURIComponent(subject)}${season === 'current' ? '' : `&season=${season}`}`);

/* ── ボーナスチケット・演出（2026-10-17 先生決定・実装手順_ロゴ・アリーナ・演出）────────────
 * チケット = 2 シーズン（組）の総合チャンピオンに 1 枚（先生の合算を超えたらプレミアム）。半券をスワイプで切ると使用済み（サーバで 1 回だけ）。
 * 演出 = ABYSS 解放 / アリーナ解放 / シーズン優勝 / 総合優勝 / 新シーズン開始。各 1 回だけ（既読はサーバ）。 */

export interface ArenaTicket {
  id: string;
  subject: string;
  /** 組の 2 シーズン [前半, 後半] */
  pair: ArenaSeason[];
  premium: boolean;
  grade: string;
  nickname: string;
  score: number;
  usedAt: number | null;
  /** id の署名（使用のときに送り返す）*/
  sig: string;
}

export type TreeEventType = 'unlock_abyss' | 'unlock_arena' | 'champion' | 'grand' | 'season_start';

export interface TreeEvent {
  key: string;
  type: TreeEventType;
  subject: string;
  grade: string;
  nickname: string;
  season?: ArenaSeason;
  pair?: ArenaSeason[];
  score?: number;
  ticket?: { id: string; premium: boolean };
}

/** ホームのカード・バナー用（/tree/progress?home=1）*/
export interface TreeHomeFlags {
  abyssOpen: boolean;
  arenaOpen: boolean;
  season: ArenaSeason;
}

export const fetchArenaTickets = () => get<{ tickets: ArenaTicket[] }>('/tree/arena/tickets');
export const redeemArenaTicket = (id: string, sig: string) => post<{ ok: boolean; usedAt: number }>('/tree/arena/ticket/use', { id, sig });
export const fetchTreeEvents = () => get<{ events: TreeEvent[] }>('/tree/events');
export const markTreeEventsSeen = (keys: string[]) => post<{ ok: boolean }>('/tree/events/seen', { keys });
export const fetchTreeHome = (subject: string) =>
  get<TreeProgress & { home?: TreeHomeFlags }>(`/tree/progress?subject=${encodeURIComponent(subject)}&home=1`);

/* ── 先生用 進捗一覧（2026-10-17）──────────────────────────
 * Proxy は生徒を key（userId のハッシュ）で返し、氏名は持たない。
 * 本名は先生のブラウザが GAS（action=treeNames）から { key: 氏名 } を直接もらう（Proxy を通さない）。 */

/** その日（JST）の挑戦の集計。gain = スコアの増加（自己ベストの増分）*/
export interface StaffDay {
  gain: number;
  plays: number;
  correct: number;
  total: number;
}

export interface StaffSubject {
  /** その日の終わりのスコア */
  score: number;
  day: StaffDay;
  prev: StaffDay;
  /** 今年度の累計（いまの時点）*/
  season: { plays: number; correct: number; total: number };
  /** 分野ごと。season = その分野の今年度の累計 */
  fields: Record<string, { score: number; day: StaffDay; prev: StaffDay; season: StaffSubject['season'] }>;
}

export interface StaffStudent {
  key: string;
  grade: string;
  nickname: string;
  subjects: string[];
  lastAt: number | null;
  /** 科目キー（ABYSS は 'chemistry@back'）→ 集計。記録が無い科目は無い */
  subj: Record<string, StaffSubject>;
}

export interface StaffOverview {
  date: string;
  prevDate: string;
  today: string;
  minDate: string;
  students: StaffStudent[];
  names: { url: string; exp: number; sig: string } | null;
}

export const fetchStaffOverview = (date?: string) =>
  get<StaffOverview>('/tree/staff/overview' + (date ? '?date=' + encodeURIComponent(date) : ''));

let namesMemo: { at: number; names: Record<string, string> } | null = null;
const NAMES_MEMO_MS = 10 * 60_000;

/** 本名 { key: 氏名 } を GAS から直接取る（Proxy を通さない）。10 分は覚えておく */
export async function fetchStaffNames(ticket: NonNullable<StaffOverview['names']>): Promise<Record<string, string>> {
  if (namesMemo && Date.now() - namesMemo.at < NAMES_MEMO_MS) return namesMemo.names;
  const q = new URLSearchParams({ action: 'treeNames', exp: String(ticket.exp), sig: ticket.sig });
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), FETCH_TIMEOUT_MS);
  try {
    // ヘッダーを付けない単純な GET（GAS はプリフライトに答えない）
    const res = await fetch(ticket.url + '?' + q.toString(), { credentials: 'omit', signal: ac.signal });
    const data = (await res.json().catch(() => null)) as { names?: Record<string, string>; error?: string } | null;
    if (!res.ok || !data || data.error || !data.names) throw new TreeApiError(data?.error || `HTTP ${res.status}`, res.status);
    namesMemo = { at: Date.now(), names: data.names };
    return data.names;
  } finally {
    clearTimeout(timer);
  }
}

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
