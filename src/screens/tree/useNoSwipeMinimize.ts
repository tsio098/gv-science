/**
 * LINE のブラウザで、ツリーを下に動かす（指を下にドラッグする）と LINE が「下スワイプ」と見なしてブラウザを縮小してしまう対策（2026-10-17）。
 *
 * LINE はページが一番上までスクロールされているときの下スワイプで縮小する（LIFF の最小化。アプリから止める設定・API は無い）。
 * ツリーは transform で動かしていてページ自体はスクロールしないので、いつも「一番上」と判定される。
 * → ANCHOR TREE を開いている間だけ、ページを OVER px 下にスクロールした状態に保つ（アプリ全体の #root を position: fixed にして中身は動かさない）。
 *   Telegram のミニアプリで同じ問題に使われている回避策と同じ考え方。
 * LINE 以外のブラウザでは何もしない。祖先の transform 等で fixed が効かず中身がずれるときは元に戻す。
 */
import { useEffect } from 'react';

const OVER = 100;
const CLASS = 'tr-noswipe';

export const inLineBrowser = () => typeof navigator !== 'undefined' && /\bLine\//i.test(navigator.userAgent);

export function useNoSwipeMinimize() {
  useEffect(() => {
    if (!inLineBrowser()) return;
    const html = document.documentElement;
    html.classList.add(CLASS);
    let active = true;
    const keep = () => {
      if (active && window.scrollY < OVER / 2) window.scrollTo(0, OVER);
    };
    const undo = () => {
      if (!active) return;
      active = false;
      window.removeEventListener('scroll', keep);
      window.removeEventListener('resize', keep);
      html.classList.remove(CLASS);
      window.scrollTo(0, 0);
    };
    window.scrollTo(0, OVER);
    window.addEventListener('scroll', keep, { passive: true });
    window.addEventListener('resize', keep);
    // 念のため: 中身が上にずれていたら（fixed が効かない環境）元に戻す。読み込み中は .tr-root がまだ無いので何回か見る
    const check = () => {
      const el = document.getElementById('root');
      if (active && el && Math.abs(el.getBoundingClientRect().top) > 1) undo();
    };
    const timers = [0, 500, 2000].map((ms) => window.setTimeout(check, ms));
    return () => {
      timers.forEach((t) => window.clearTimeout(t));
      undo();
    };
  }, []);
}
