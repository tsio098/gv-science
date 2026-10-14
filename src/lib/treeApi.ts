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
export const QTYPES: QType[] = ['tf', 'calc', 'reason'];
export const QTYPE_LABEL: Record<QType, string> = { tf: '正誤問題', calc: '計算問題', reason: '考察問題' };

export type FieldGroup = 'theory' | 'inorganic' | 'organic' | 'polymer';

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
  /** 新着（追加から 14 日以内の試験）のうち未着手の数。Phase 3 の Proxy では無い */
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
  prereqs: { field: string; pct: number; done: boolean }[];
  types: Record<QType, NodeStats>;
}

export interface TreeProgress {
  subject: string;
  version: number;
  unlockPct: number;
  total: NodeStats & { pct: number };
  fields: Record<string, FieldProgress>;
  /** 科目・分野ごとの自分の順位（Phase 4）*/
  rank?: { total: RankInfo; fields: Record<string, RankInfo> };
  newDays?: number;
}

export interface TreeMe {
  userId: string;
  loginId: string;
  grade: string;
  subjects: string[];
  nickname: string;
}

export interface PlayQuestion {
  id: string;
  type: QType;
  field: string;
  /** min: 0 は ⓪〜⑨ の数字マーク（Phase 5 の Proxy から。無ければ 1）*/
  answer: { kind: 'choice'; boxes: { n: number; choices: number; min?: number }[]; group: 'unordered' | null };
  img: { lead: string | null; body: string | null };
  given: string[];
  text: string | null;
  source: { kind: string; exam: string; n: number | null };
  set: string | null;
}

export interface PlayUnit {
  set: string | null;
  qids: string[];
  limitSec: number;
  lead: string | null;
}

export interface TreeSession {
  sessionId: string;
  subject: string;
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
  value: string[];
  answer: string[];
  timeMs: number;
  bonus: number;
  gain: number;
  firstCorrect: boolean;
  bonusUp: number;
}

export interface SubmitResult {
  sessionId: string;
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
  fieldScore: { before: (NodeStats & { pct: number; unlocked: boolean }) | null; after: (NodeStats & { pct: number; unlocked: boolean }) | null };
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
export const fetchTreeManifest = (subject: string) => get<TreeManifest>(`/tree/manifest?subject=${encodeURIComponent(subject)}`);
export const fetchTreeProgress = (subject: string) => get<TreeProgress>(`/tree/progress?subject=${encodeURIComponent(subject)}`);
export const startTreeSession = (subject: string, field: string, qtype: QType) =>
  post<TreeSession>('/tree/session/start', { subject, field, qtype });
export const submitTreeSession = (sessionId: string, answers: { qid: string; value: string[]; timeMs: number }[]) =>
  post<SubmitResult>('/tree/session/submit', { sessionId, answers });
export const saveTreeNickname = (nickname: string) => post<{ nickname: string }>('/tree/profile', { nickname });
export const fetchTreeRanking = (subject: string, field = '*', qtype: QType | '*' = '*') => {
  const q = new URLSearchParams({ subject });
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
