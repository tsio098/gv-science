/**
 * userId 単位の永続キャッシュ（localStorage）。
 *
 * sessionStorage はタブを閉じると消えるため、LINE が毎回新しい LIFF タブを開く
 * 運用ではコールド表示で必ずスピナーが出てしまう。これを補うために、LINE userId を
 * 名前空間に含めて localStorage にも前回レスポンスを保存し、再訪時（コールド含む）に
 * 即描画 → 裏で最新化（SWR）する。
 *
 * 別アカウント混入対策:
 *   - キーに userId を含めるので、別ユーザーのタブは自分のキーしか読まない。
 *   - setPersistUser() のたびに「現在の userId 以外」の pc: キーを掃除する。
 *   - userId が未確定の間は読み書きとも no-op（誤って共有しない）。
 */
const PREFIX = 'pc:v1:';
let currentUser: string | null = null;

/** LIFF 初期化後に確定した LINE userId をセット。他ユーザーの残骸を掃除する。 */
export function setPersistUser(userId: string | null | undefined): void {
  currentUser = userId && typeof userId === 'string' ? userId : null;
  if (!currentUser) return;
  try {
    if (typeof localStorage === 'undefined') return;
    const keep = PREFIX + currentUser + ':';
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX) && !k.startsWith(keep)) toRemove.push(k);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* private mode 等は無視 */
  }
}

function keyOf(name: string): string | null {
  if (!currentUser) return null;
  return PREFIX + currentUser + ':' + name;
}

/** 永続キャッシュから読む。userId 未確定・未保存・破損時は undefined。 */
export function pcGet<T>(name: string): T | undefined {
  try {
    const k = keyOf(name);
    if (!k || typeof localStorage === 'undefined') return undefined;
    const raw = localStorage.getItem(k);
    if (raw === null) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

/** 永続キャッシュへ保存。userId 未確定・quota 超過・private mode 等は no-op。 */
export function pcSet<T>(name: string, val: T): void {
  try {
    const k = keyOf(name);
    if (!k || typeof localStorage === 'undefined') return;
    localStorage.setItem(k, JSON.stringify(val));
  } catch {
    /* quota / private mode 等は無視 */
  }
}
