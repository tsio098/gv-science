/**
 * LIFF v2 ラッパ。
 *
 * - `initLiff()` を main.tsx の起動時に 1 度だけ呼ぶ。
 * - 外部リンクは必ず `openExternal()` を通す（README 指定）。
 * - 開発時（ブラウザ直）でも壊れないように、VITE_LIFF_ID 未設定なら
 *   "skipped" モードでフォールバックする。
 */
import liff from '@line/liff';

export type LiffMode = 'ready' | 'skipped' | 'error';

export interface LiffStatus {
  mode: LiffMode;
  /** 取得済みの ID トークン（GAS の Authorization に乗せる） */
  idToken: string | null;
  /** liff.getProfile() のキャッシュ */
  profile: { userId: string; displayName: string } | null;
  /** error 詳細メッセージ */
  error?: string;
}

const LIFF_ID_A = import.meta.env.VITE_LIFF_ID;
const LIFF_ID_B = import.meta.env.VITE_LIFF_ID_B;

/** パスから初期化に使うべき LIFF_ID を判定する。
 *  /pair-b で始まるパスなら別プロバイダ用 LIFF-B、それ以外はメインの LIFF-A。 */
function pickLiffId(): string | undefined {
  if (typeof window !== 'undefined' &&
      window.location.pathname.startsWith('/pair-b')) {
    return LIFF_ID_B;
  }
  return LIFF_ID_A;
}

let _status: LiffStatus = {
  mode: 'skipped',
  idToken: null,
  profile: null,
};

export async function initLiff(): Promise<LiffStatus> {
  const LIFF_ID = pickLiffId();
  // LIFF_ID が未設定 → 開発ブラウザ用のフォールバック
  if (!LIFF_ID) {
    _status = { mode: 'skipped', idToken: null, profile: null };
    if (import.meta.env.DEV) {
      console.info(
        '[liff] VITE_LIFF_ID が未設定です。LIFF を初期化せずに開発モードで進みます。'
      );
    }
    return _status;
  }

  try {
    await liff.init({ liffId: LIFF_ID });

    // ログインしていなければログインへ
    if (!liff.isLoggedIn()) {
      // LINE 内ブラウザならそのまま、外部ブラウザだとリダイレクト発生
      liff.login();
      // login() はリダイレクトするため戻ってこないが、念のため
      _status = { mode: 'ready', idToken: null, profile: null };
      return _status;
    }

    const idToken = liff.getIDToken();
    let profile: LiffStatus['profile'] = null;
    try {
      const p = await liff.getProfile();
      profile = { userId: p.userId, displayName: p.displayName };
    } catch {
      profile = null;
    }

    _status = { mode: 'ready', idToken, profile };
    return _status;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    _status = {
      mode: 'error',
      idToken: null,
      profile: null,
      error: msg,
    };
    return _status;
  }
}

export function getLiffStatus(): LiffStatus {
  return _status;
}

/**
 * 外部 URL を開く。LIFF が有効なら liff.openWindow、無効なら window.open。
 * 第二引数は `external` フラグ。LINE 内ブラウザで開く場合は false（既定）。
 */
export function openExternal(url: string, external = false): void {
  if (!url || url === '#') return;
  try {
    if (_status.mode === 'ready') {
      liff.openWindow({ url, external });
      return;
    }
  } catch {
    /* fallthrough */
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** LINE 内なら LIFF を閉じる */
export function closeLiff(): void {
  try {
    if (_status.mode === 'ready' && liff.isInClient()) {
      liff.closeWindow();
    }
  } catch {
    /* noop */
  }
}
