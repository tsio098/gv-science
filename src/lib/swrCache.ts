/**
 * 超軽量な SWR（stale-while-revalidate）キャッシュ。
 *
 * 目的: 一度取得した画面データをメモリ（＋sessionStorage）に保持し、
 *   次に同じ画面を開いたときに**スピナーを出さず即表示**する。
 *   表示と同時に裏で最新を取り直し、差分があれば差し替える。
 *
 *   - メモリ Map … SPA 内の画面遷移では即ヒット（ページ再読み込み不要）。
 *   - sessionStorage … タブ内のフル再読み込みでも生き残る。タブを閉じると消えるので
 *     ペアリング切替や別アカウントによるデータ混入リスクは小さい。
 *
 * scores は専用の scoresStore が同等の仕組みを持つため対象外。
 *
 * 3 層構成:
 *   メモリ Map → sessionStorage（タブ内）→ localStorage（userId 単位・タブを超えて永続）。
 *   3 層目はコールド再表示（新規タブ）でも前回データを即描画するための保険。
 */
import { pcGet, pcSet } from './persist.ts';

const mem = new Map<string, unknown>();
const SS_PREFIX = 'swr:v1:';

export function swrGet<T>(key: string): T | undefined {
  if (mem.has(key)) return mem.get(key) as T;
  try {
    if (typeof sessionStorage !== 'undefined') {
      const raw = sessionStorage.getItem(SS_PREFIX + key);
      if (raw !== null) {
        const v = JSON.parse(raw) as T;
        mem.set(key, v);
        return v;
      }
    }
  } catch {
    /* JSON 壊れ / プライベートモード等は無視 */
  }
  // 3 層目: userId 単位の永続キャッシュ（コールド再表示の即描画用）
  const pv = pcGet<T>(key);
  if (pv !== undefined) {
    mem.set(key, pv);
    return pv;
  }
  return undefined;
}

export function swrSet<T>(key: string, val: T): void {
  mem.set(key, val);
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem(SS_PREFIX + key, JSON.stringify(val));
    }
  } catch {
    /* quota 超過などは無視。メモリには載るので機能は維持 */
  }
  // userId 単位の永続層にも保存（タブを閉じても残す）
  pcSet(key, val);
}

/**
 * 取得中（in-flight）リクエストの共有。
 * 同じ key の取得が同時に走らないようにし、先読みと画面側の取得が
 * 重複して GAS を 2 回叩くのを防ぐ。成功時はキャッシュにも保存する。
 */
const inflight = new Map<string, Promise<unknown>>();

export function swrFetch<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const existing = inflight.get(key);
  if (existing) return existing as Promise<T>;
  const p = fn()
    .then((d) => {
      swrSet(key, d);
      return d;
    })
    .finally(() => {
      inflight.delete(key);
    });
  inflight.set(key, p);
  return p;
}

/**
 * 先読み（prefetch）。まだキャッシュが無ければバックグラウンドで取得して保存する。
 * 画面遷移前や起動時に呼んでおくと、タップ時／表示時に即表示できる。
 * swrFetch 経由なので、直後に画面側が同じ key を取得しても 1 回にまとまる。
 * 失敗しても握りつぶす。
 */
export function prefetch<T>(key: string, fn: () => Promise<T>): void {
  if (swrGet<T>(key) !== undefined) return;
  swrFetch(key, fn).catch(() => {
    /* 先読み失敗は無視 */
  });
}
