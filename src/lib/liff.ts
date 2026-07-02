/**
 * LIFF v2 ラッパ。
 *
 * - `initLiff()` を main.tsx の起動時に 1 度だけ呼ぶ。
 * - 外部リンクは必ず `openExternal()` を通す（README 指定）。
 * - 開発時（ブラウザ直）でも壊れないように、VITE_LIFF_ID 未設定なら
 *   "skipped" モードでフォールバックする。
 */
import liff from '@line/liff';
import { prefetch } from './swrCache';
import { setPersistUser } from './persist';

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

/** LIFF ID の形式（`1234567890-abcd1234` = 数字列 + `-` + 英数字列）を満たすか。
 *
 *  ビルド変数の設定漏れやプレースホルダ文字列（例:
 *  「（LINE Developers Console で確認した実際の LIFF ID）」）が
 *  そのまま `liff.init()` に渡ると SDK が "Invalid LIFF ID" を投げて
 *  アプリ全体が初期化エラーで停止する。ここで形式を検査し、無効値は
 *  「未設定」と同じ扱い（undefined 化）にしてフォールバック分岐へ落とす。
 */
function normalizeLiffId(id: string | undefined): string | undefined {
  if (typeof id !== 'string') return undefined;
  const trimmed = id.trim();
  return /^\d{6,}-[0-9A-Za-z]+$/.test(trimmed) ? trimmed : undefined;
}

const LIFF_ID_A = normalizeLiffId(import.meta.env.VITE_LIFF_ID);
const LIFF_ID_B = normalizeLiffId(import.meta.env.VITE_LIFF_ID_B);

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
    // 先にトークンを反映しておく（この後の先読み fetchHome が参照する）。
    _status = { mode: 'ready', idToken, profile: null };

    // 永続キャッシュ（localStorage）の名前空間を userId で確定させる。
    // getProfile より前に id_token から sub を取り出して即セットしておくことで、
    // この後の画面描画（swrGet）がコールドでも前回データを即出しできる。
    try {
      const decoded = liff.getDecodedIDToken();
      setPersistUser(decoded && decoded.sub ? decoded.sub : null);
    } catch {
      /* デコード不可時は永続層を使わない（no-op） */
    }

    // 起動高速化(B): getProfile() の通信を待つ間に、ホームデータの取得を
    // 並行して先に走らせておく。アプリ表示時にはホームが揃っている（or 取得中で
    // 画面側と共有される）ため、初回起動の体感が縮む。api は動的 import で
    // 循環参照を避ける。
    import('./api')
      .then((m) => prefetch('home', m.fetchHome))
      .catch(() => {
        /* 先読み失敗は無視 */
      });

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
