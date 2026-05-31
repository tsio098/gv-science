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
 *
 *  Provider B 用 LIFF (LIFF-B) のエンドポイント URL は
 *  `https://gv-science.t-siotani.workers.dev/b/` （SETUP.md §別プロバイダ運用）。
 *  /b または /b/... で来た場合は LIFF_ID_B で初期化する。
 *
 *  後方互換: 旧ペアリング画面のパス `/pair-b` も B 扱い。
 *  どちらにも一致しなければ LIFF_ID_A（Provider A）。
 */
function pickLiffId(): string | undefined {
  if (typeof window === 'undefined') return LIFF_ID_A;
  const p = window.location.pathname;
  const isProviderB =
    p === '/b' || p.startsWith('/b/') ||
    p === '/pair-b' || p.startsWith('/pair-b/');
  if (isProviderB) {
    if (!LIFF_ID_B && import.meta.env.DEV) {
      console.warn(
        '[liff] Provider B のパスでアクセスされましたが VITE_LIFF_ID_B が未設定です。'
      );
    }
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
    // Provider B のパスで来ているのに LIFF_ID_B が未設定 → 設定漏れ
    // 黙ってモック表示にすると原因が分からないので明示的にエラー扱いにする。
    const p = typeof window !== 'undefined' ? window.location.pathname : '';
    const isProviderBPath =
      p === '/b' || p.startsWith('/b/') ||
      p === '/pair-b' || p.startsWith('/pair-b/');
    if (isProviderBPath) {
      _status = {
        mode: 'error',
        idToken: null,
        profile: null,
        error: 'VITE_LIFF_ID_B が未設定です。Cloudflare のビルド変数を確認してください。',
      };
      return _status;
    }
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
