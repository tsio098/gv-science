/**
 * 指数バックオフ付きリトライ。
 *
 * GAS バックエンドは同時アクセスが集中すると一時的に 429 / 5xx を返したり
 * タイムアウトしたりする（実行枠の枯渇）。多くは数百ミリ秒〜数秒で解消する
 * ため、一定回数だけ自動リトライすることで「モックにフォールバックする前に
 * 自力で回復」させる。これが 70 人同時アクセス時の体感を最も大きく改善する。
 *
 * shouldRetry が false を返した時点で即座に最後のエラーを投げる
 * （例: 認証エラーやデータ不正など、待っても直らないもの）。
 */
export interface RetryOptions {
  /** 最大リトライ回数（初回は含めない）。既定 3。*/
  retries?: number;
  /** 初回待機ミリ秒。回ごとに倍々で増える。既定 300。*/
  baseMs?: number;
  /** 待機の上限ミリ秒。既定 4000。*/
  maxMs?: number;
  /** 0〜jitterRatio の割合でランダムに待機を増減（同時リトライの集中回避）。既定 0.25。*/
  jitterRatio?: number;
  /** この回数目はリトライすべきか。false なら即座に throw。既定: 常に true。*/
  shouldRetry?: (err: unknown, attempt: number) => boolean;
  /** sleep 実装の差し替え（テスト用）。既定は setTimeout。*/
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) =>
  new Promise<void>((res) => setTimeout(res, ms));

/** attempt（0 始まり）に対する待機ミリ秒を計算する。テストのため独立関数に。*/
export function backoffDelay(
  attempt: number,
  baseMs: number,
  maxMs: number,
  jitterRatio: number,
  rand: () => number = Math.random
): number {
  const raw = baseMs * Math.pow(2, attempt);
  const capped = Math.min(raw, maxMs);
  const jitter = capped * jitterRatio * (rand() * 2 - 1);
  return Math.max(0, Math.round(capped + jitter));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    retries = 3,
    baseMs = 300,
    maxMs = 4000,
    jitterRatio = 0.25,
    shouldRetry = () => true,
    sleep = defaultSleep,
  } = options;

  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const hasNext = attempt < retries;
      if (!hasNext || !shouldRetry(err, attempt)) break;
      await sleep(backoffDelay(attempt, baseMs, maxMs, jitterRatio));
    }
  }
  throw lastErr;
}

/**
 * GAS / ネットワーク由来の一時障害かどうかを判定する。
 * 一時障害（true）: ネットワーク失敗、HTTP 429 / 5xx、GAS の INTERNAL_ERROR。
 * 恒久エラー（false）: 認証エラー（UNAUTHORIZED / NEEDS_PAIRING）など、
 *   待っても直らないもの。これらはリトライせず即座にフォールバック判定へ。
 */
export function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  if (/UNAUTHORIZED|NEEDS_PAIRING|UNKNOWN_ACTION|NO_DATA/i.test(msg)) return false;
  if (/HTTP\s+(429|5\d\d)/.test(msg)) return true;
  if (/INTERNAL_ERROR/i.test(msg)) return true;
  if (/NO_ENDPOINT/.test(msg)) return false; // エンドポイント未設定はリトライ無意味
  // fetch のネットワーク例外（"Failed to fetch" 等）や不明なものは一時障害扱い。
  return true;
}
