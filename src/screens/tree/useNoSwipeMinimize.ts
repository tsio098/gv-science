/**
 * LINE のブラウザで、ツリーを下に動かす（指を下にドラッグする）と LINE が「下スワイプ」と見なしてブラウザを縮小してしまう対策（2026-10-17）。
 *
 * LINE はページが一番上までスクロールされているときの下スワイプで縮小する（LIFF の最小化。アプリから止める設定・API は無い）。
 * ツリーは transform で動かしていてページ自体はスクロールしないので、いつも「一番上」と判定される。
 * → ANCHOR TREE を開いている間だけ、ページを OVER px 下にスクロールした状態に保つ（アプリ全体の #root を position: fixed にして中身は動かさない）。
 *   Telegram のミニアプリで同じ問題に使われている回避策と同じ考え方。
 * LINE 以外のブラウザでは何もしない。祖先の transform 等で fixed が効かず中身がずれるときは元に戻す。
 *
 * 2026-10-17 夜 先生の報告「直っていない」を受けて強化:
 *  - 高さは % でなく px で明示（body = 画面の高さ + OVER）
 *  - 指でページ自体がスクロールされて 0 に戻らないように、touchmove を止める（内側のスクロール領域の中で、まだ動ける向きのときだけ通す）。
 *    iOS は指を離すまで scrollTo が効かないので、scroll イベントで戻すだけでは間に合わない
 *  - 指を離したとき・画面に戻ったときにも OVER へ戻す
 *  - 状態を swipeDiag() で読めるようにして、先生用の「別のブラウザで使う」に出す（実機でしか確かめられないため）
 */
import { useEffect } from 'react';

const OVER = 100;
const CLASS = 'tr-noswipe';

export const inLineBrowser = () => typeof navigator !== 'undefined' && /\bLine\//i.test(navigator.userAgent);

export interface SwipeDiag {
  /** LINE のブラウザと判定したか */
  line: boolean;
  /** 対策が効いている間 true */
  active: boolean;
  /** 対策をやめた理由（やめていなければ null）*/
  undone: string | null;
  scrollY: number;
  bodyHeight: number;
  innerHeight: number;
  /** scroll イベントで OVER に戻した回数 */
  resets: number;
  /** touchmove を止めた回数 */
  blocked: number;
  /** 直前のタッチ（開始時と終了時の scrollY）*/
  lastTouch: { start: number; end: number } | null;
}

const diag: SwipeDiag = {
  line: false,
  active: false,
  undone: null,
  scrollY: 0,
  bodyHeight: 0,
  innerHeight: 0,
  resets: 0,
  blocked: 0,
  lastTouch: null,
};

/** いまの状態（表示用）*/
export function swipeDiag(): SwipeDiag {
  return {
    ...diag,
    line: inLineBrowser(),
    scrollY: typeof window === 'undefined' ? 0 : window.scrollY,
    bodyHeight: typeof document === 'undefined' ? 0 : document.body.getBoundingClientRect().height,
    innerHeight: typeof window === 'undefined' ? 0 : window.innerHeight,
  };
}

/**
 * target から上にたどって、指の向き dy（＋＝指が下へ＝内容が上へ戻る）にまだスクロールできる領域があれば true。
 * 文字入力の中は常に true（編集の邪魔をしない）。#root まで無ければ false（ページ自体が動いてしまう）
 */
function canScrollWithin(target: EventTarget | null, dy: number): boolean {
  let e = target instanceof Element ? target : null;
  for (; e && e !== document.body; e = e.parentElement) {
    if (e instanceof HTMLTextAreaElement || e instanceof HTMLInputElement) return true;
    if (e.scrollHeight <= e.clientHeight + 1) continue;
    const oy = getComputedStyle(e).overflowY;
    if (oy !== 'auto' && oy !== 'scroll') continue;
    const atTop = e.scrollTop <= 0;
    const atBottom = e.scrollTop + e.clientHeight >= e.scrollHeight - 1;
    if (dy > 0 ? !atTop : dy < 0 ? !atBottom : !(atTop && atBottom)) return true;
  }
  return false;
}

export function useNoSwipeMinimize() {
  useEffect(() => {
    if (!inLineBrowser()) return;
    const html = document.documentElement;
    const body = document.body;
    html.classList.add(CLASS);
    let active = true;
    diag.active = true;
    diag.undone = null;
    const setHeight = () => {
      body.style.height = `${window.innerHeight + OVER}px`;
    };
    const keep = () => {
      if (!active) return;
      if (window.scrollY < OVER) {
        diag.resets++;
        window.scrollTo(0, OVER);
      }
    };
    const later = () => window.requestAnimationFrame(keep);
    let startY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) startY = e.touches[0]!.clientY;
      diag.lastTouch = { start: window.scrollY, end: window.scrollY };
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!active || !e.cancelable || e.touches.length !== 1) return;
      const dy = e.touches[0]!.clientY - startY;
      if (!canScrollWithin(e.target, dy)) {
        diag.blocked++;
        e.preventDefault();
      }
    };
    const onTouchEnd = () => {
      if (diag.lastTouch) diag.lastTouch.end = window.scrollY;
      later();
    };
    const undo = (reason: string) => {
      if (!active) return;
      active = false;
      diag.active = false;
      diag.undone = reason;
      window.removeEventListener('scroll', keep);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      document.removeEventListener('visibilitychange', later);
      window.removeEventListener('pageshow', later);
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
      html.classList.remove(CLASS);
      body.style.height = '';
      window.scrollTo(0, 0);
    };
    const onResize = () => {
      setHeight();
      later();
    };
    setHeight();
    window.scrollTo(0, OVER);
    window.addEventListener('scroll', keep, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    document.addEventListener('visibilitychange', later);
    window.addEventListener('pageshow', later);
    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchEnd, { passive: true });
    // 念のため: ページはスクロールできているのに中身が上にずれていたら（fixed が効かない環境）元に戻す。読み込み中は .tr-root がまだ無いので何回か見る
    const check = () => {
      const el = document.getElementById('root');
      if (active && el && window.scrollY >= OVER / 2 && Math.abs(el.getBoundingClientRect().top) > 1) {
        undo(`root がずれた (top=${Math.round(el.getBoundingClientRect().top)})`);
      }
    };
    const timers = [0, 500, 2000].map((ms) => window.setTimeout(check, ms));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      undo('閉じた');
    };
  }, []);
}
