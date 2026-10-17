/**
 * 演出の部品（ボード F1〜F5 / F1i〜F5i）。座標はボードのまま（スマホ 390×844・iPad 1194×834）で描き、
 * Stage が画面に収まるよう拡大縮小して中央に置く。動きは CSS keyframes だけ（styles/tree-fx.css）。
 */
import { createContext, useContext, useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { BRAND, IPAD_MIN_W } from '../treeTheme';

export const img = (name: string) => `${BRAND}${name}.svg`;

/**
 * animation の指定。fill-mode は backwards（待ち時間の間だけ from を保つ）。
 * 基底が最後の状態なので、止まっても .is-done で最後の状態が見える
 */
export const an = (name: string, dur: number, delay: number, ease = 'ease'): CSSProperties => ({
  animation: `${name} ${dur}s ${ease} ${delay}s 1 backwards`,
  // 動く要素は最初から合成レイヤーに載せる（発光フィルタ入りの SVG を毎フレーム描き直さない。2026-10-17 カクつき対策）
  willChange: 'transform, opacity',
});

/** 演出で使う画像。ツリーを開いてイベントが来た時点で読み込み・デコードしておく（演出の途中で初めて描くとカクつく）*/
const FX_IMAGES = [
  'icon_abyss', 'icon_crown', 'icon_crown_mono', 'text_abyss-open', 'text_arena-open', 'text_champion',
  'text_premium', 'text_season', 'text_start',
];
let preloaded: Promise<void> | null = null;
export function preloadFxImages(): Promise<void> {
  if (!preloaded) {
    const wide = window.innerWidth >= IPAD_MIN_W;
    const names = [...FX_IMAGES, wide ? 'fx-bg_abyss_ipad' : 'login-bg_abyss'];
    preloaded = Promise.all(
      names.map((n) => {
        const im = new Image();
        im.src = img(n);
        return (im.decode ? im.decode() : Promise.resolve()).catch(() => {});
      })
    ).then(() => {});
  }
  return preloaded;
}

/**
 * ドット文字を左から段階的に出す（ボードの clip-path: inset の steps と同じ見た目）。
 * clip-path のアニメーションは GPU で合成されず毎フレーム描き直しになるので、
 * overflow: hidden の枠を左から動かし、中の画像を逆に動かして（どちらも transform）同じ見え方にする
 */
export function Reveal({ src, alt, style, dur, delay, steps }: { src: string; alt: string; style: CSSProperties; dur: number; delay: number; steps: number }) {
  const ease = `steps(${steps})`;
  return (
    <div className="fx-abs fx-reveal" style={{ ...style, ...an('fxRevealO', dur, delay, ease) }}>
      <img src={src} alt={alt} style={{ width: '100%', height: 'auto', display: 'block', ...an('fxRevealI', dur, delay, ease) }} />
    </div>
  );
}
export const DROP_EASE = 'cubic-bezier(0.2,0.8,0.2,1)';

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const f = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return vp;
}

/** 幅 900px 以上は iPad 版（F1i〜F5i）*/
export function useWide() {
  return useViewport().w >= IPAD_MIN_W;
}

/** ボードの大きさ（w×h）の舞台。はみ出した飾りは .fx-root の overflow で切る */
export function Stage({ w, h, children }: { w: number; h: number; children: ReactNode }) {
  const vp = useViewport();
  const s = Math.min(vp.w / w, vp.h / h, 1.3);
  return (
    <div className="fx-stage" style={{ width: w, height: h, transform: `translate(-50%, -50%) scale(${s})` }}>
      {children}
    </div>
  );
}

/** iPad 版の中央の 390px の列（スマホと同じ位置・同じタイミング）。スマホ版はそのまま */
export function Col({ wide, children }: { wide: boolean; children: ReactNode }) {
  return wide ? (
    <div className="fx-abs" style={{ left: 402, top: -5, width: 390, height: 844 }}>
      {children}
    </div>
  ) : (
    <>{children}</>
  );
}

/** ボタン: 自分の登場が終わったら（または最後の状態なら）押せる。登場中に押したら最後の状態へ飛ぶだけ */
interface FxCtl {
  done: boolean;
  finish: () => void;
  close: (action: 'tree' | 'arena' | 'ticket') => void;
}
export const FxContext = createContext<FxCtl>({ done: true, finish: () => {}, close: () => {} });

export function FxButton({ label, action, style }: { label: string; action: 'tree' | 'arena' | 'ticket'; style: CSSProperties }) {
  const ctl = useContext(FxContext);
  const [ready, setReady] = useState(false);
  return (
    <button
      type="button"
      className="fx-btn"
      style={style}
      onAnimationEnd={(e) => {
        if (e.target === e.currentTarget) setReady(true);
      }}
      onClick={(e) => {
        e.stopPropagation();
        if (ctl.done || ready) ctl.close(action);
        else ctl.finish();
      }}
    >
      {label}
    </button>
  );
}

/** 紙吹雪（分野色）。幅 w に n 枚を並べ、落ち方は番号から決める（毎回同じ）*/
const CONFETTI = ['#2DF4C6', '#FFD84A', '#FF7AB8', '#4FC3FF', '#D08BFF', '#FFD84A', '#2DF4C6', '#FFF6DD'];
export function Confetti({ w, n, fall = 920 }: { w: number; n: number; fall?: number }) {
  const items = Array.from({ length: n }, (_, i) => {
    const second = i >= Math.ceil(n * 0.66);
    const sq = i % 3 === 1;
    return {
      left: Math.round(((i * 0.61803) % 1) * (w - 20)) + 10,
      w: sq ? 7 : 6,
      h: sq ? 7 : i % 2 ? 10 : 11,
      color: CONFETTI[i % CONFETTI.length]!,
      dx: (i % 2 ? -1 : 1) * (15 + ((i * 7) % 26)),
      r: 380 + ((i * 53) % 320),
      dur: 2.6 + ((i * 37) % 8) / 10,
      delay: (second ? 1.7 : 1.15) + ((i * 29) % 5) / 10,
    };
  });
  return (
    <div aria-hidden="true" className="fx-abs" style={{ inset: 0, pointerEvents: 'none' }}>
      {items.map((c, i) => (
        <div
          key={i}
          className="fx-abs fx-gone"
          style={
            {
              left: c.left,
              top: -20,
              width: c.w,
              height: c.h,
              background: c.color,
              '--dx': `${c.dx}px`,
              '--r': `${c.r}deg`,
              '--fall': `${fall}px`,
              ...an('fxFall', c.dur, c.delay, 'ease-in'),
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

/** 光の筋（30 秒で 1 回転・iPad は 40 秒）*/
export function Rays({ left, top, size, wide }: { left: number; top: number; size: number; wide?: boolean }) {
  return (
    <div aria-hidden="true" className="fx-abs" style={{ left, top, width: size, height: size, ...an('fxFade', 1, 0.3) }}>
      <div className={`fx-rays${wide ? ' is-wide' : ''}`} />
    </div>
  );
}

/** 閃光（白金の円が広がって消える）*/
export function Flash({ left, top, size, delay }: { left: number; top: number; size: number; delay: number }) {
  return (
    <div
      aria-hidden="true"
      className="fx-abs fx-gone"
      style={{
        left,
        top,
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,250,230,0.95) 0%, rgba(255,216,74,0) 65%)',
        ...an('fxFlash', 0.7, delay, 'ease-out'),
      }}
    />
  );
}

/** 演出の中のチケット（簡略版。総合チャンピオンの文字は出さない）*/
export function MiniTicket({ premium, wide, style }: { premium: boolean; wide: boolean; style: CSSProperties }) {
  const k = wide
    ? premium
      ? { notch: 276, nsz: 26, perf: 288, py: 20, cx: 18, cy: 18, gap: 8, crown: 48, champ: 226, prem: 170, arrow: 292, aw: 40, ah: 18, fs: 11 }
      : { notch: 280, nsz: 26, perf: 292, py: 20, cx: 20, cy: 22, gap: 10, crown: 52, champ: 230, prem: 0, arrow: 296, aw: 40, ah: 18, fs: 11 }
    : premium
      ? { notch: 233, nsz: 24, perf: 244, py: 18, cx: 14, cy: 14, gap: 6, crown: 40, champ: 186, prem: 140, arrow: 247, aw: 36, ah: 16, fs: 10 }
      : { notch: 236, nsz: 24, perf: 247, py: 18, cx: 16, cy: 18, gap: 8, crown: 44, champ: 190, prem: 0, arrow: 250, aw: 36, ah: 16, fs: 10 };
  const off = -Math.round(k.nsz / 2) - 2;
  const body = (
    <>
      {premium && <div aria-hidden="true" className="fx-ticket-shine" />}
      <div
        aria-hidden="true"
        className="fx-notch"
        style={{ left: k.notch, top: off, width: k.nsz, height: k.nsz, ...(premium ? { border: '3px solid #D08BFF' } : {}) }}
      />
      <div
        aria-hidden="true"
        className="fx-notch"
        style={{ left: k.notch, bottom: off, width: k.nsz, height: k.nsz, ...(premium ? { border: '3px solid #FF7AB8' } : {}) }}
      />
      <div
        aria-hidden="true"
        className="fx-perf"
        style={{ left: k.perf, top: k.py, bottom: k.py, ...(premium ? { borderLeftColor: 'rgba(208,139,255,0.6)' } : {}) }}
      />
      <div className="fx-abs" style={{ left: k.cx, top: k.cy, width: 260, display: 'flex', flexDirection: 'column', gap: k.gap }}>
        <img src={img('icon_crown')} alt="" style={{ width: k.crown, height: 'auto', display: 'block' }} />
        <img src={img('text_champion')} alt="CHAMPION" style={{ width: k.champ, height: 'auto', display: 'block' }} />
        {premium && <img src={img('text_premium')} alt="PREMIUM" style={{ width: k.prem, height: 'auto', display: 'block' }} />}
        <div className="fx-ticket-label" style={{ fontSize: k.fs }}>
          BONUS TICKET
        </div>
      </div>
      <div className="fx-abs" style={{ left: k.arrow, right: 0, top: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={k.aw} height={k.ah} viewBox="0 0 54 22" fill="none" stroke={premium ? '#FF7AB8' : '#FFD84A'} strokeWidth="3" aria-hidden="true">
          <path d="M4 3l8 8-8 8M22 3l8 8-8 8M40 3l8 8-8 8" />
        </svg>
      </div>
    </>
  );
  return premium ? (
    <div className="fx-ticket is-premium" style={style}>
      <div className="fx-ticket-in">{body}</div>
    </div>
  ) : (
    <div className="fx-ticket" style={style}>
      {body}
    </div>
  );
}
