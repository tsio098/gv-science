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
  // 生物のツリーに合流した「生態系（基礎）」だけの系統（2026-10-19 先生の指示: 生態と同じ黄色。名前は生物基礎の章のまま）
  | 'kecosystem'
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
  /** 合流した生物基礎の分野（生物のツリーの「基」・2026-10-19）。アリーナには出ない */
  kiso?: boolean;
}

export interface TreeManifest {
  subject: string;
  /** ABYSS の manifest は 'back'（ROUTE は無いか 'front'）*/
  stage?: TreeStage;
  name: string;
  version: number;
  unlockPct: number;
  timeLimitSec: Record<QType, number>;
  /** kind = 'exam'（今年度に実施した演習）/ 'basic'（基本問題）。addedAt = その試験を初めて載せた日（新着の判定）*/
  exams: { exam: string; lastDate: string | null; count: number; kind?: string; addedAt?: string }[];
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
  /**
   * ABYSS が開いているか（先生は常に）。2026-10-17 夕方から 条件 = 全分野マスター度 60% 以上（cond・未達の分野）。
   * 一度 ABYSS で挑戦した生徒は条件を割っても開いたまま
   */
  abyss?: { open: boolean; cond?: { need: number; done: number; of: number; fields: { id: string; mastery: number }[] } };
}

export interface TreeMe {
  userId: string;
  loginId: string;
  grade: string;
  subjects: string[];
  nickname: string;
  /** 自分に割り当てたカニの種名（ニックネーム未記入のときの名前・2026-10-17）。古い Proxy・未割り当ては null / 無し */
  crab?: string | null;
  /** 着せ替えの錨（季節イベントの kind・'halloween' など。null = いつもの錨・2026-10-20）。古い Proxy は無し */
  iconSkin?: string | null;
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
  /** 一部の欄だけ順序を問わない（欄の番号 0〜 の組。例 [[0, 2]]。古い Proxy は付けない）*/
  unorderedGroups?: number[][];
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
  /** この提出で獲得したトロフィー（2026-10-19〜。古い Proxy では無い）*/
  trophies?: TrophyGet[];
  /** 数えるトロフィーが 80% に届いた（PROGRESS の通知。サーバが 1 回だけ返す）*/
  near?: TrophyNear[];
  /** この提出でその科目のトロフィーレベルがはじめて 30 に届いた（LV.30 チケット・2026-10-19）*/
  level30?: Level30Got | null;
  /** 季節イベントの挑戦のとき（2026-10-20）: イベントのマスター度の前後と、100% に届いたか */
  event?: SeasonEventSubmit;
}

/** LV.30 チケットが出た（通知「LEVEL 30 REACHED!!」→ タップでチケット画面）*/
export interface Level30Got {
  subject: string;
  ticketId: string;
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
/**
 * c=2 = 残念トロフィー・LV.30 チケットに対応した LIFF（2026-10-19）。付けないと Proxy はそれらを返さない
 * （古い LIFF が Z のグレード・level30 のチケットを描けずに壊れないように）
 */
/**
 * c=4 = 季節イベント（EVENT トロフィー・イベントのチケット）に対応した LIFF（2026-10-20）。Proxy は c を数で比べるので、
 * c=4 でも残念トロフィー・LV.30 は返る（c=3 は MASTER100 の予約）。古い Proxy（c === '2' の完全一致）には c=2 として届かない →
 * Proxy を先に出すこと（実装手順 §4）
 */
const C2 = 'c=4';
/**
 * 先生用アカウントの日付の確認（季節イベント・2026-10-20）: LIFF の URL に ?evnow=2026-10-22T09:00+09:00（%2B09:00 でも可）を付けて開くと、
 * イベントの API に now= を付ける（Proxy は先生のときだけ使い、生徒は無視する）。evnow= を空にすると消す。
 * 2026-10-21: ?evnow を外して開き直しても進めた日付のまま残った（LINE が画面を閉じずに残すと sessionStorage も残る）→
 * 覚えるのは 30 分まで・ツリーの下に「確認用の日付」の札を出して × で消せるようにした（clearSeasonEventNow）
 */
const EVNOW_KEY = 'gvTree.evnow';
const EVNOW_TTL_MS = 30 * 60_000;
function evNow(): string | null {
  try {
    // URL の + は空白として読まれる（?evnow=…T09:00+09:00 → "…T09:00 09:00" で日付にならず、Proxy は黙って本当の時刻を使っていた）→ + に戻す
    const raw = new URLSearchParams(window.location.search).get('evnow');
    const q = raw == null ? null : raw.trim().replace(/ (\d{2}:?\d{2})$/, '+$1');
    if (q != null) {
      if (q) sessionStorage.setItem(EVNOW_KEY, JSON.stringify({ v: q, at: Date.now() }));
      else sessionStorage.removeItem(EVNOW_KEY);
    }
    const saved = sessionStorage.getItem(EVNOW_KEY);
    if (!saved) return null;
    const o = JSON.parse(saved) as { v?: unknown; at?: unknown };
    if (typeof o?.v !== 'string' || typeof o.at !== 'number' || Date.now() - o.at > EVNOW_TTL_MS) {
      sessionStorage.removeItem(EVNOW_KEY);
      return null;
    }
    return o.v;
  } catch {
    try {
      sessionStorage.removeItem(EVNOW_KEY);
    } catch {
      /* noop */
    }
    return null;
  }
}
/** 先生の確認用の日付を消す（URL の ?evnow も外す。外さないと次に読んだとき URL から戻る）*/
export function clearSeasonEventNow() {
  try {
    sessionStorage.removeItem(EVNOW_KEY);
    const u = new URL(window.location.href);
    if (u.searchParams.has('evnow')) {
      u.searchParams.delete('evnow');
      window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
    }
  } catch {
    /* noop */
  }
}
/** 先生の確認用の日付（?evnow）。画面の「あと n 日」なども合わせる */
export const seasonEventNowParam = evNow;
const evQ = () => {
  const n = evNow();
  return n ? `&now=${encodeURIComponent(n)}` : '';
};
export const submitTreeSession = (sessionId: string, answers: { qid: string; value: PartValue[]; timeMs: number }[]) =>
  post<SubmitResult>(`/tree/session/submit?${C2}${evQ()}`, { sessionId, answers });
export const saveTreeNickname = (nickname: string) => post<{ nickname: string }>('/tree/profile', { nickname });
export const fetchTreeRanking = (subject: string, field = '*', qtype: QType | '*' = '*', stage: TreeStage = 'front') => {
  const q = new URLSearchParams({ subject });
  if (stage === 'back') q.set('stage', 'back');
  if (field !== '*') q.set('field', field);
  if (qtype !== '*') q.set('qtype', qtype);
  return get<TreeRanking>('/tree/ranking?' + q.toString());
};
/** 問題の報告（課題 #21）。文章と問題画像を先生の Google Chat に送る。1 人 1 問 1 回（2 回目は already: true）*/
export const reportTreeQuestion = (r: { sessionId: string; qid: string; message: string; label: string; img: string | null }) =>
  post<{ ok: boolean; already: boolean }>('/tree/report', r);

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
  /**
   * 開放条件。2026-10-17 夕方から basis = 'rate'（全分野それぞれ今年度の正答率 need% 以上・rate が未達の分野の正答率）。
   * 古い Proxy は basis なし（マスター度 need%・mastery）
   */
  cond: { basis?: 'rate' | 'mastery'; need: number; done: number; of: number; fields: { id: string; mastery: number; rate?: number }[] };
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
  /** 先生用アカウント: 「記録として提出」を押せる（2026-10-18。押すまでアリーナ画面の先生のスコアに出ない）*/
  canRecord?: boolean;
  rank: RankInfo;
  season: ArenaSeason;
  /** この挑戦で獲得したトロフィー（2026-10-19〜）*/
  trophies?: TrophyGet[];
  level30?: Level30Got | null;
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
  /**
   * 先生のスコア（2026-10-19）: 順位を付けない行として順位表に差し込む。1 シーズン = その最高（記録として提出したもの）・
   * 合算 = 同じ先生アカウントで両シーズンそろった和の最大。記録が無ければ null（古い Proxy は undefined）
   */
  staff?: { score: number; elapsedMs: number } | null;
}

export const fetchArena = (subject: string) => get<ArenaInfo>(`/tree/arena?subject=${encodeURIComponent(subject)}`);
/** season = 画面が読み込んだシーズン（切り替わっていたら 409 SEASON_CHANGED。前シーズンの途中は猶予内なら再開）*/
export const startArena = (subject: string, season?: string) => post<ArenaSession>('/tree/arena/start', { subject, season });
export const submitArena = (sessionId: string, answers: { qid: string; value: PartValue[]; timeMs: number }[]) =>
  post<ArenaResult>(`/tree/arena/submit?${C2}`, { sessionId, answers });
/** 先生: 採点した挑戦を記録にする（何度押しても同じ）*/
export const recordArena = (sessionId: string) => post<{ ok: true }>('/tree/arena/record', { sessionId });
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
  ticket?: { id: string; premium?: boolean; kind?: TreeTicketKind };
}

/** ホームのカード・バナー用（/tree/progress?home=1）*/
export interface TreeHomeFlags {
  abyssOpen: boolean;
  arenaOpen: boolean;
  season: ArenaSeason;
  /** 着せ替えの錨（季節イベント・2026-10-20）。古い Proxy は無し */
  iconSkin?: string | null;
}

export const fetchArenaTickets = () => get<{ tickets: ArenaTicket[] }>('/tree/arena/tickets');

/**
 * チケット（ABYSS チケットと総合優勝のボーナスチケット）。2026-10-17 夕方〜
 * ABYSS チケット = 全分野マスター度 60% を初めて満たした科目ごとに 1 枚（化学・生物）。使い方はボーナスと同じ（半券を切る・1 回だけ）
 */
export type TreeTicketKind = 'abyss' | 'grand' | 'level30' | 'event';
export interface TreeTicket extends Omit<ArenaTicket, 'pair' | 'score'> {
  kind: TreeTicketKind;
  /** grand: 組の 2 シーズン / abyss・level30・event: null */
  pair: ArenaSeason[] | null;
  score: number | null;
  issuedAt?: number;
  /** 季節イベントのチケット（kind = 'event'・2026-10-20）: イベント・テストの正答率（0〜1）・使える日（usableFrom〜usableUntil だけ）*/
  eventId?: string;
  eventKind?: string | null;
  eventName?: string | null;
  testRate?: number;
  usableFrom?: number | null;
  usableUntil?: number | null;
}
/** 両方のチケット。新しい Proxy が無い（404）ときは総合優勝のチケットだけ（/tree/arena/tickets）*/
export async function fetchTreeTickets(): Promise<TreeTicket[]> {
  try {
    return (await get<{ tickets: TreeTicket[] }>(`/tree/tickets?${C2}`)).tickets ?? [];
  } catch (e) {
    if (!(e instanceof TreeApiError && e.status === 404)) throw e;
    return ((await fetchArenaTickets()).tickets ?? []).map((t) => ({ ...t, kind: 'grand' as const }));
  }
}
/** 使用（総合優勝のチケットは古い Proxy でも通る /tree/arena/ticket/use）*/
export const redeemTreeTicket = (kind: TreeTicketKind, id: string, sig: string) =>
  kind === 'grand' ? redeemArenaTicket(id, sig) : post<{ ok: boolean; usedAt: number }>('/tree/ticket/use', { kind, id, sig });
export const redeemArenaTicket = (id: string, sig: string) => post<{ ok: boolean; usedAt: number }>('/tree/arena/ticket/use', { id, sig });
export const fetchTreeEvents = () => get<{ events: TreeEvent[] }>('/tree/events');
export const markTreeEventsSeen = (keys: string[]) => post<{ ok: boolean }>('/tree/events/seen', { keys });
export const fetchTreeHome = (subject: string) =>
  get<TreeProgress & { home?: TreeHomeFlags }>(`/tree/progress?subject=${encodeURIComponent(subject)}&home=1`);

/* ── トロフィー・通知（2026-10-19・実装手順_トロフィー）────────────
 * 科目ごとに別に獲得。グレード B / S / G / P（プラチナ）/ F（ファースト = 塾内で最初の 1 人だけ）。
 * 通知は左上のトースト（trophy/TrophyToast）。未通知の獲得と、アリーナ・ファーストのお知らせは /tree/trophies/pending。 */

/**
 * Z = 残念トロフィー（OOPS・pt 0・獲得するまで一覧に何も出さない。2026-10-19）。
 * E = 季節イベントの EVENT トロフィー（pt 0・レベル / プラチナに数えない・獲得するまで出さない。2026-10-20）
 */
export type TrophyGrade = 'B' | 'S' | 'G' | 'P' | 'F' | 'Z' | 'E';

/** 獲得した 1 件（通知用）*/
export interface TrophyGet {
  subject: string;
  id: string;
  grade: TrophyGrade;
  name: string;
  pt: number;
  first: boolean;
  /** 条件の文 */
  desc: string;
  /** 残念トロフィー（grade = 'Z'）*/
  oops?: boolean;
  /** 残念トロフィーの通知の札（何が起きたか。null なら「残念トロフィー」）*/
  note?: string | null;
  /** EVENT トロフィー（grade = 'E'）。通知は TROPHY GET! でなく EVENT CLEAR!! */
  event?: boolean;
  eventId?: string;
  /** アカウントで初めての 100%（錨のアイコンも一緒に手に入った）*/
  firstIcon?: boolean;
}

/** 数えるトロフィーが 80% に届いた（PROGRESS）*/
export interface TrophyNear {
  subject: string;
  id: string;
  grade: TrophyGrade;
  name: string;
  now: number;
  max: number;
}

export type TreeNotice =
  | { key: string; type: 'first_broadcast'; subject: string; holder: { grade: string; nickname: string }; trophy: { id: string; name: string; desc: string } }
  | {
      key: string;
      type: 'arena_rank';
      subject: string;
      season: ArenaSeason;
      rank: number;
      prevRank: number | null;
      of: number;
      leader: { grade: string; nickname: string } | null;
      leaderChanged: boolean;
    }
  | { key: string; type: 'teacher_record'; subject: string; season: ArenaSeason; score: number }
  | { key: string; type: 'arena_last_day'; subject: string; season: ArenaSeason }
  /** 科目ランキングの順位ダウン（2026-10-19・ほかの人に抜かれた。ツリーを開いたとき 1 回）*/
  | { key: string; type: 'rank_down'; subject: string; rank: number; prevRank: number; of: number }
  /** LV.30 チケット（まだ知らせていないもの・2026-10-19）*/
  | { key: string; type: 'level30'; subject: string; ticketId: string }
  /** 季節イベントのチケット（TICKET GET! をまだ出していないもの・2026-10-20）*/
  | { key: string; type: 'event_ticket'; subject: string; eventId: string; ticketId: string; usableFrom: number | null; usableUntil: number | null };

export interface TrophyPending {
  trophies: TrophyGet[];
  notices: TreeNotice[];
}

export interface TrophyItem {
  id: string;
  grade: TrophyGrade;
  /** 隠し・未獲得は '???' */
  name: string;
  desc: string;
  source: string;
  original: string;
  /** 隠しトロフィーで未獲得（??? で出す）*/
  hidden: boolean;
  /** 隠しトロフィーか（獲得後も）*/
  secret: boolean;
  first: boolean;
  earnedAt: number | null;
  progress: { now: number; max: number } | null;
  /** 取得率 = n / of（of = 全生徒 = 在籍生徒・先生除く。その科目を選んでいない生徒も含む・2026-10-19）*/
  rarity: { n: number; of: number };
  firstHolder: { grade: string; nickname: string; at: number; me: boolean } | null;
  /** 試験が入るたびに 1 人（f_new_exam）→ 「受付終了」と出さない */
  repeat?: boolean;
  /** 残念トロフィー（獲得したものだけ items に入る）*/
  oops?: boolean;
  /** EVENT トロフィー（獲得したものだけ items に入る・2026-10-20）*/
  event?: boolean;
  /** 関係する分野 ID（詳細のチップ）*/
  fields: string[];
  order: number;
  /** 先生用アカウントだけ（2026-10-20）: 獲得した生徒（古い順）。本名は key で GAS treeNames から */
  holders?: TrophyHolder[];
}

export interface TrophyHolder {
  key: string;
  grade: string;
  nickname: string;
  at: number;
}

export interface TrophyList {
  subject: string;
  /** 全科目合計の pt。into = 今のレベルに入ってからの pt・need = そのレベルの幅 */
  /** 科目ごとのトロフィーレベル Lv1〜max（30）。into = 今のレベルに入ってからの pt、need = 次のレベルまでの幅（max では 0）*/
  level: { lv: number; max?: number; pt: number; into: number; need: number };
  /** all / earned は件数、B〜F は獲得数 */
  counts: { all: number; earned: number; B: number; S: number; G: number; P: number; F: number; oops?: { earned: number }; event?: { earned: number } };
  /** LV.30 チケット（その科目で持っていれば）*/
  level30Ticket?: { id: string; used: boolean } | null;
  /** プラチナは隠し要素（2026-10-19）: 獲得するまで null。ファーストも獲得するまで items に入らない */
  platinum: { now: number; max: number; earned: boolean; name: string; id: string } | null;
  items: TrophyItem[];
  /** 先生用アカウントだけ: 本名を GAS から取るチケット（AGENT_KEY が無い環境では null）*/
  names?: StaffOverview['names'];
}

/**
 * 未通知の獲得とお知らせ。古い Proxy（404）・D1 0010 の前は空で available: false
 * （トロフィーのボタンを出さない → LIFF を Proxy より先に出しても生徒の画面は今までどおり）
 */
export async function fetchTrophyPending(): Promise<TrophyPending & { available: boolean }> {
  try {
    const r = await get<Partial<TrophyPending> & { ready?: boolean }>(`/tree/trophies/pending?${C2}`);
    return { trophies: r.trophies ?? [], notices: r.notices ?? [], available: r.ready !== false };
  } catch (e) {
    if (e instanceof TreeApiError && (e.status === 404 || e.status === 503)) return { trophies: [], notices: [], available: false };
    throw e;
  }
}
/** 通知を出した（表示を始めた）ものを既読に */
export const markTrophiesSeen = (trophies: { subject: string; id: string }[], keys: string[]) =>
  post<{ ok: boolean }>('/tree/trophies/seen', { trophies, keys });
export const fetchTrophies = (subject: string) => get<TrophyList>(`/tree/trophies?subject=${encodeURIComponent(subject)}&${C2}`);

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
  /** いまのマスター度（%）。過去の日でもいまの値。古い Proxy には無い */
  mastery?: number;
  day: StaffDay;
  prev: StaffDay;
  /** 今年度の累計（いまの時点）*/
  season: { plays: number; correct: number; total: number };
  /** 分野ごと。season = その分野の今年度の累計 */
  fields: Record<string, { score: number; mastery?: number; day: StaffDay; prev: StaffDay; season: StaffSubject['season'] }>;
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

/* ── 先生用 問題の確認（2026-10-20）──────────────────────── */

/** 先生用の正解。ROUTE = 欄ごとのマーク（'3' = ③。alts = 別の正しい組）・ABYSS = 欄ごと */
export type StaffSolution =
  | { kind: 'choice'; group: 'unordered' | null; boxes: { n: number; correct: string; min: number }[]; alts: string[][] }
  | {
      kind: 'parts';
      unordered: boolean;
      unorderedGroups?: number[][];
      parts: (
        | { kind: 'choice'; label: string | null; correct: string | string[] }
        | { kind: 'term'; label: string | null; accept: string[] }
        | { kind: 'numeric'; label: string | null; value: number; sig: number | null; unit: string | null; fixedExp?: number }
      )[];
    };

export interface StaffQuestion extends PlayQuestion {
  solution: StaffSolution;
  /** セットに入れた小問の元の種別・分野 */
  origType: QType | null;
  origField: string | null;
  standalone: boolean;
  /** 出る場所（分野 × 種別。分野へのコピー・alsoSolo も含む）*/
  places: { field: string; type: QType }[];
}

export interface StaffQuestions {
  subject: string;
  stage: TreeStage;
  version: number;
  exam: string;
  questions: StaffQuestion[];
  sets: Record<string, { id: string; field: string; lead: string | null; members: string[]; timeLimitSec: number | null }>;
}

export const fetchStaffQuestions = (subject: string, stage: TreeStage, exam: string) =>
  get<StaffQuestions>(`/tree/staff/questions?subject=${encodeURIComponent(subject)}${stageQ(stage)}&exam=${encodeURIComponent(exam)}`);

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

/* ── 季節イベント（ハロウィンチャレンジ・2026-10-20・vault 実装手順_季節イベント.md「先生の回答 3」）──────────────
 * 期間 10/22 0:00〜10/30 5:00（JST）。参加条件 = その科目の分野ノードを半分以上開放。科目ごとに全員共通の 70 題。
 * マスター度 = イベントの挑戦の解答だけ（2 回続けて正解で定着）。100% で錨（アイコン・アカウントに 1 つ）と EVENT トロフィー（科目ごと）。
 * 100% の後に 1 回だけテスト（20 問・80% で合格）→ イベント限定チケット（10/31 のみ使用可能）。
 * パスは /tree/season-event（/tree/events は演出のイベント）。古い Proxy・D1 0016 の前は event: null（ノードを出さない） */

export type SeasonEventPhase = 'soon' | 'open' | 'closed';

export interface SeasonEventInfo {
  id: string;
  kind: string;
  name: string;
  startAt: number;
  endAt: number;
  ticketFrom: number | null;
  ticketUntil: number | null;
  phase: SeasonEventPhase;
  daysLeft: number;
  /** Proxy の時刻（先生の ?evnow のときはその時刻）*/
  now: number;
}

/** 70 題の状態。cells = 0 未着手 / 1 要復習 / 2 正解済み / 3 定着（70 個・全員共通の並び）*/
export interface SeasonEventProgress {
  total: number;
  /** 0〜1（表示は切り捨て）*/
  mastery: number;
  settled: number;
  correct: number;
  review: number;
  untouched: number;
  cells: number[];
}

export interface SeasonEventTest {
  status: 'locked' | 'ready' | 'started' | 'done';
  size: number;
  passAt: number;
  correct?: number;
  total?: number;
  pass?: boolean;
}

export interface SeasonEventState {
  event: SeasonEventInfo | null;
  /** 参加条件（その科目の分野ノードを半分以上開放）。予告の間は null */
  eligible?: { met: boolean; open: number; need: number; of: number } | null;
  progress?: SeasonEventProgress | null;
  cleared?: boolean;
  clearedAt?: number | null;
  rewards?: { icon: boolean; trophy: boolean; ticket: { id: string; usedAt: number | null } | null } | null;
  test?: SeasonEventTest | null;
  staff?: boolean;
}

/** 提出（/tree/session/submit）の event */
export interface SeasonEventSubmit {
  id: string;
  kind: string;
  name: string;
  endAt: number;
  daysLeft: number;
  before: SeasonEventProgress;
  after: SeasonEventProgress;
  settledGain: number;
  cleared: boolean;
  clearedNow: boolean;
  firstIcon?: boolean;
  /** イベントの記録を付けたか（期間の後の提出・100% の後の復習は false）*/
  recorded: boolean;
  rewards: ('icon' | 'trophy')[];
}

export interface SeasonEventSession extends TreeSession {
  event: { id: string; kind: string; review?: boolean };
}

export interface SeasonEventTestSession extends TreeSession {
  eventTest: true;
  resumed: boolean;
  event: { id: string; kind: string };
  passAt: number;
}

export interface SeasonEventTestResult {
  sessionId: string;
  eventTest: true;
  results: { qid: string; type: QType; correct: boolean; value: PartValue[]; timeMs: number; bonus: number; gain: number }[];
  summary: { correct: number; total: number; rate: number; pass: boolean; passAt: number; elapsedMs: number };
  event: { id: string; kind: string; name: string };
  ticket: (TreeTicket & { kind: 'event' }) | null;
}

/** いまのイベント（その科目）。古い Proxy（404）・D1 0016 の前（503）は event: null */
export async function fetchSeasonEvent(subject: string): Promise<SeasonEventState> {
  try {
    return await get<SeasonEventState>(`/tree/season-event?subject=${encodeURIComponent(subject)}${evQ()}`);
  } catch (e) {
    if (e instanceof TreeApiError && (e.status === 404 || e.status === 503)) return { event: null };
    throw e;
  }
}
export const startSeasonEventSession = (subject: string, eventId: string) =>
  post<SeasonEventSession>(`/tree/season-event/session/start?${C2}${evQ()}`, { subject, eventId });
export const startSeasonEventTest = (subject: string, eventId: string) =>
  post<SeasonEventTestSession>(`/tree/season-event/test/start?${C2}${evQ()}`, { subject, eventId });
export const submitSeasonEventTest = (sessionId: string, answers: { qid: string; value: PartValue[]; timeMs: number }[]) =>
  post<SeasonEventTestResult>(`/tree/season-event/test/submit?${C2}${evQ()}`, { sessionId, answers });

/** 着せ替え（錨のアイコンだけ・フレームは作らない）。kinds = 着せ替えの並び（いつもの + この順）*/
export interface TreeCosmetics {
  kinds: string[];
  icons: { item: string; eventId: string; awardedAt: number }[];
  selected: string | null;
}
export const fetchCosmetics = () => get<TreeCosmetics>('/tree/cosmetics');
export const saveIconSkin = (icon: string | null) => post<{ selected: string | null }>('/tree/cosmetics', { icon });

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
