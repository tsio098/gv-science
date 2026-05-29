/**
 * GAS Web App ラッパ。
 *
 * VITE_GAS_ENDPOINT が設定されているときだけ実際の fetch を行う。
 * 未設定（または通信失敗）の場合は mock データを返す。
 *
 * 認証: `liff.getIDToken()` を `?token=` クエリパラメータで送る。
 *   GAS の doGet では Authorization ヘッダが取得できないため、
 *   クエリで渡す方針に統一している。GAS 側は LINE の verify エンドポイントへ
 *   POST して検証する。
 */
import {
  ARTICLES,
  NEXT_CLASS,
  PROBLEMS,
  SCHEDULES,
  SHARES,
  USER,
} from '../data/mock';
import { getLiffStatus } from './liff';
import type {
  Article,
  AttendanceQR,
  HomeResponse,
  Problem,
  Schedule,
  ScheduleSubject,
  Subject,
} from './types';

const GAS = import.meta.env.VITE_GAS_ENDPOINT;

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
  // body.error がある場合は例外化してフォールバックへ流す
  if (data && (data as { error?: string }).error) {
    throw new Error(`GAS_ERROR: ${(data as { error?: string }).error}`);
  }
  return data as T;
}

/* ──────────────────────────────────────────────────────
   各エンドポイント。
   GAS が落ちている / 未設定 のときは mock を返してフォールバック。
   ────────────────────────────────────────────────────── */

export async function fetchHome(): Promise<HomeResponse> {
  try {
    return await gasGet<HomeResponse>('home');
  } catch {
    return { user: USER, nextClass: NEXT_CLASS };
  }
}

export async function fetchSchedules(
  subject: ScheduleSubject
): Promise<Schedule[]> {
  try {
    const r = await gasGet<{ items: Schedule[] }>('schedules', { subject });
    return r.items;
  } catch {
    return SCHEDULES[subject] ?? [];
  }
}

export async function fetchSchedule(
  id: string,
  subject: ScheduleSubject
): Promise<Schedule | undefined> {
  try {
    return await gasGet<Schedule>('schedule', { id });
  } catch {
    return (SCHEDULES[subject] ?? []).find((s) => s.id === id);
  }
}

export async function fetchProblems(subject: Subject): Promise<Problem[]> {
  try {
    const r = await gasGet<{ items: Problem[] }>('problems', { subject });
    return r.items;
  } catch {
    return PROBLEMS[subject];
  }
}

export async function fetchProblem(
  id: string,
  subject: Subject
): Promise<Problem | undefined> {
  try {
    return await gasGet<Problem>('problem', { id });
  } catch {
    return PROBLEMS[subject].find((p) => p.id === id);
  }
}

export async function fetchArticles(): Promise<Article[]> {
  try {
    const r = await gasGet<{ items: Article[] }>('articles');
    return r.items;
  } catch {
    return ARTICLES;
  }
}

export async function fetchShares(): Promise<Article[]> {
  try {
    const r = await gasGet<{ items: Article[] }>('shares');
    return r.items;
  } catch {
    return SHARES;
  }
}

/**
 * 出席用 QR を取得。
 * GAS が「生徒ID」シートで LINE userId を引き当て、A列(名前)・C列(学年)・
 * D列(ID) を返す。失敗時は USER のモック値 + 空 qrText でフォールバック。
 */
export async function fetchAttendanceQR(): Promise<AttendanceQR> {
  try {
    return await gasGet<AttendanceQR>('qr');
  } catch {
    return { name: USER.name, grade: USER.grade, qrText: '' };
  }
}
