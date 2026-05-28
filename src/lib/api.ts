/**
 * GAS Web App ラッパ。
 *
 * VITE_GAS_ENDPOINT が設定されているときだけ実際の fetch を行う。
 * 未設定（または通信失敗）の場合は mock データを返す。
 *
 * 認証: `liff.getIDToken()` を Authorization ヘッダに乗せる想定。
 *      GAS 側は `Authorization: Bearer <id_token>` を verify する。
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
  HomeResponse,
  Problem,
  Schedule,
  Subject,
} from './types';

const GAS = import.meta.env.VITE_GAS_ENDPOINT;

async function gasGet<T>(
  action: string,
  params: Record<string, string> = {}
): Promise<T> {
  if (!GAS) throw new Error('NO_ENDPOINT');
  const usp = new URLSearchParams({ action, ...params });
  const headers: Record<string, string> = {};
  const t = getLiffStatus().idToken;
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(`${GAS}?${usp.toString()}`, {
    method: 'GET',
    headers,
    credentials: 'omit',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
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
  subject: Exclude<Subject, 'earth'>
): Promise<Schedule[]> {
  try {
    const r = await gasGet<{ items: Schedule[] }>('schedules', { subject });
    return r.items;
  } catch {
    return SCHEDULES[subject];
  }
}

export async function fetchSchedule(
  id: string,
  subject: Exclude<Subject, 'earth'>
): Promise<Schedule | undefined> {
  try {
    return await gasGet<Schedule>('schedule', { id });
  } catch {
    return SCHEDULES[subject].find((s) => s.id === id);
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
