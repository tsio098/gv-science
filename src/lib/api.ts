/**
 * GAS Web App ラッパ。
 *
 * VITE_GAS_ENDPOINT が設定されているときだけ実際の fetch を行う。
 * 未設定（= ローカル開発）の場合は mock データを返す。
 *
 * 認証: `liff.getIDToken()` を `?token=` クエリパラメータで送る。
 *   GAS の doGet では Authorization ヘッダが取得できないため、
 *   クエリで渡す方針に統一している。GAS 側は LINE の verify エンドポイントへ
 *   POST して検証する。
 *
 * 同時アクセス対策:
 *   - 通信は withRetry で指数バックオフ付きリトライする。GAS は同時アクセスで
 *     一時的に 429/5xx やタイムアウトを返すが、多くは数百ms〜数秒で回復するため。
 *   - エンドポイント設定済み（= 本番）では、リトライしても失敗したときに
 *     **モックを黙って返さず例外を投げる**。画面側がエラー表示＋再試行を出し、
 *     ユーザーが「サンプルデータを本物と誤認する」事故を防ぐ。
 *   - エンドポイント未設定（= 開発）でだけ、従来どおりモックでフォールバックする。
 */
import {
  ARTICLES,
  NEXT_CLASS,
  PROBLEMS,
  SCHEDULES,
  SHARES,
  USER,
} from '../data/mock';
import { SCORES_MOCK } from '../data/scoresMock';
import { getLiffStatus } from './liff';
import { withRetry, isTransientError } from './retry';
import type {
  Article,
  AttendanceQR,
  HomeResponse,
  Problem,
  Schedule,
  RecoResult,
  ScheduleSubject,
  ScoresResponse,
  StudyBook,
  Subject,
} from './types';

const GAS = import.meta.env.VITE_GAS_ENDPOINT;

/** エンドポイント未設定（ローカル開発）のときだけモックで継続する。*/
const USE_MOCK_FALLBACK = !GAS;

async function gasGet<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!GAS) throw new Error('NO_ENDPOINT');
  const t = getLiffStatus().idToken;
  const usp = new URLSearchParams({
    action,
    ...(t ? { token: t } : {}),
    ...params,
  });
  const res = await fetch(`${GAS}?${usp.toString()}`, {
    method: 'GET',
    credentials: 'omit',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as { error?: string } & T;
  // GAS 側はエラーも 200 で返す（HTTP code を変えにくい仕様）
  // body.error がある場合は例外化してフォールバック/リトライ判定へ流す
  if (data && (data as { error?: string }).error) {
    throw new Error(`GAS_ERROR: ${(data as { error?: string }).error}`);
  }
  return data as T;
}

/** リトライ付きで GAS を呼ぶ。一時障害のみ自動リトライする。*/
function callGas<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  return withRetry(() => gasGet<T>(action, params), {
    retries: 3,
    baseMs: 300,
    maxMs: 4000,
    shouldRetry: (e) => isTransientError(e),
  });
}

/**
 * 本番（エンドポイント設定済み）では例外を再送出し、画面にエラーを出す。
 * 開発（未設定）では mock を返して継続する。
 */
function orMock<T>(err: unknown, mock: T): T {
  if (USE_MOCK_FALLBACK) return mock;
  throw err instanceof Error ? err : new Error(String(err));
}

/* ──────────────────────────────────────────────────────
   各エンドポイント。
   通信は callGas でリトライ。失敗時は orMock で
   「開発ならモック / 本番なら例外」に振り分ける。
   ────────────────────────────────────────────────────── */

export async function fetchHome(): Promise<HomeResponse> {
  try {
    return await callGas<HomeResponse>('home');
  } catch (e) {
    return orMock(e, { user: USER, nextClass: NEXT_CLASS });
  }
}

export async function fetchSchedules(
  subject: ScheduleSubject
): Promise<Schedule[]> {
  try {
    const r = await callGas<{ items: Schedule[] }>('schedules', { subject });
    return r.items;
  } catch (e) {
    return orMock(e, SCHEDULES[subject] ?? []);
  }
}

export async function fetchSchedule(
  id: string,
  subject: ScheduleSubject
): Promise<Schedule | undefined> {
  try {
    return await callGas<Schedule>('schedule', { id });
  } catch (e) {
    return orMock(e, (SCHEDULES[subject] ?? []).find((s) => s.id === id));
  }
}

export async function fetchProblems(subject: Subject): Promise<Problem[]> {
  try {
    const r = await callGas<{ items: Problem[] }>('problems', { subject });
    return r.items;
  } catch (e) {
    return orMock(e, PROBLEMS[subject]);
  }
}

export async function fetchProblem(
  id: string,
  subject: Subject
): Promise<Problem | undefined> {
  try {
    return await callGas<Problem>('problem', { id });
  } catch (e) {
    return orMock(e, PROBLEMS[subject].find((p) => p.id === id));
  }
}

export async function fetchArticles(): Promise<Article[]> {
  try {
    const r = await callGas<{ items: Article[] }>('articles');
    return r.items;
  } catch (e) {
    return orMock(e, ARTICLES);
  }
}

/**
 * 考察問題集（基礎問題タイル）。
 * GAS 側で生徒の理科使用科目に応じて自動フィルタされる。
 */
export async function fetchStudyBooks(): Promise<StudyBook[]> {
  try {
    const r = await callGas<{ items: StudyBook[] }>('studyBooks');
    return r.items;
  } catch (e) {
    // 学習リストの mock は空配列。開発では空、本番では例外で再試行を出す。
    return orMock(e, [] as StudyBook[]);
  }
}

export async function fetchShares(): Promise<Article[]> {
  try {
    const r = await callGas<{ items: Article[] }>('shares');
    return r.items;
  } catch (e) {
    return orMock(e, SHARES);
  }
}

/**
 * 出席用 QR を取得。
 * GAS が「生徒ID」シートで LINE userId を引き当て、A列(名前)・C列(学年)・
 * D列(ID) を返す。失敗時は開発では USER のモック値、本番では例外。
 */
export async function fetchAttendanceQR(): Promise<AttendanceQR> {
  try {
    return await callGas<AttendanceQR>('qr');
  } catch (e) {
    return orMock(e, { name: USER.name, grade: USER.grade, qrText: '' });
  }
}

/**
 * 成績推移データを取得。
 *
 * GAS 側は「演習点数報告」スプレッドシート（生徒IDシートとは別ファイル）の
 * 各科目の成績シートから、生徒名 (A列) で完全一致する行を集めて返す。
 * 履修科目分すべてを 1 リクエストで返す（タブ切替後の再フェッチ不要）。
 *
 *  - NO_DATA（成績がまだ無い）: モックではなく「空の成績」を返す。
 *    画面側は「データなし」表示になり、サンプルを本物と誤認しない。
 *  - 通信失敗: 開発ではモック、本番では例外（scoresStore がエラー表示）。
 *
 * @param fresh true なら GAS 側のキャッシュ（30 分）を破棄して再取得
 */
/**
 * 志望校調査を依頼する。フォーム入力を「志望校調査依頼」タブへ1行追記する。
 * 認証は callGas が自動付与する id_token（GAS 側で USERID を確定）。
 * 氏名はクライアントから送らない・保存しない（USERID のみで処理）。
 */
export async function requestShibou(input: {
  region: string;
  want: string;
  examType: string;
  note: string;
  grades?: string; // 共通テスト自己採点の生JSON(keisha raw形式) or ''（未入力）。GAS側で「自己採点」列へ保存。
}): Promise<{ ok: boolean }> {
  // 本番(エンドポイント設定済み)では失敗時に例外を投げ、画面側でエラー表示。
  // 開発(未設定)では送信せず成功扱いにして UI を確認できるようにする。
  if (USE_MOCK_FALLBACK) return { ok: true };
  return await callGas<{ ok: boolean }>('requestShibou', {
    region: input.region,
    want: input.want,
    examType: input.examType,
    note: input.note,
    grades: input.grades || '',
  });
}

/**
 * おすすめ志望校（定期エージェントが書き込んだ自分の結果）を取得。
 * action は recoResults（Proxyの "shibou" 接頭辞振り分けを避けるため）。氏名は含まれない。
 */
export async function fetchRecoResults(): Promise<RecoResult[]> {
  try {
    const r = await callGas<{ results: RecoResult[] }>('recoResults');
    return r.results ?? [];
  } catch (e) {
    return orMock(e, [] as RecoResult[]);
  }
}

export async function fetchScores(fresh = false): Promise<ScoresResponse> {
  try {
    return await callGas<ScoresResponse>('scores', fresh ? { fresh: '1' } : {});
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/NO_DATA/.test(msg)) {
      return { name: '', subjects: [], data: {} };
    }
    return orMock(e, SCORES_MOCK);
  }
}
