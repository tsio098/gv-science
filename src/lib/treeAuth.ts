/**
 * ANCHOR TREE の外部ブラウザ用セッション（設計書 §3.2）。
 * POST /tree/login で受け取ったセッション JWT を localStorage['gv_tree_session'] に置く。
 * LIFF 内では使わない（id_token を送る）。
 */
const KEY = 'gv_tree_session';

interface StoredSession {
  token: string;
  /** 失効時刻（UNIX 秒） */
  exp: number;
}

export function saveTreeSession(token: string, exp: number): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ token, exp } satisfies StoredSession));
  } catch {
    /* プライベートモード等。今回の表示中だけ使えればよい */
  }
  memo = { token, exp };
}

let memo: StoredSession | null = null;

/** 有効なセッション JWT（期限の 1 分前からは無効扱い）。無ければ null */
export function getTreeSessionToken(): string | null {
  if (!memo) {
    try {
      const raw = localStorage.getItem(KEY);
      memo = raw ? (JSON.parse(raw) as StoredSession) : null;
    } catch {
      memo = null;
    }
  }
  if (!memo || typeof memo.token !== 'string') return null;
  if (!memo.exp || memo.exp * 1000 - 60_000 <= Date.now()) return null;
  return memo.token;
}

export function clearTreeSession(): void {
  memo = null;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* noop */
  }
}
