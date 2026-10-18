/**
 * トロフィー・通知のトースト（実装手順_トロフィー §6.3・ボード「通知のバリエーション」「ファーストトロフィー」「ツリー画面 — プラチナ獲得」）。
 * 左上だけ。スマホ: 左 12px・上 32px（セーフエリアの下）・幅 248px（プラチナ 272・ファースト 260）。幅 900px 以上（iPad 横）: 24 / 36 / 264。
 * 入場はコマ送り（光の線 → ブロックで描く → 白く光る + 音 → 落ちて弾ける → 見出しを打つ）。タップで次 / 詳細・左へスワイプで閉じる。
 */
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CHROME, GRADE_COLOR, PRISM, PX_ICON, PxIcon, TrophyIcon } from './TrophyIcon';
import { toastNameSize, toastWidth, type ToastItem, type ToastKind } from './toastQueue';

const ROUTE_BG = 'linear-gradient(180deg,#0C4250,#062530)';
const ABYSS_BG = 'linear-gradient(180deg,#111E3E,#050B1C)';
const ARENA_BG = 'linear-gradient(180deg,#2A1C45,#120B22)';

interface Look {
  c: string;
  d: string;
  rgb: string;
  chrome: string;
  bg: string;
  subc: string;
  icon?: string;
}

/** その他の通知の色・アイコン（ボード Toasts の notes）*/
const NOTE_LOOK: Record<Exclude<ToastKind, 'trophy'>, Look> = {
  node: { c: '#4FC3FF', d: '#1C6FA3', rgb: '79,195,255', chrome: CHROME.sky, bg: ROUTE_BG, subc: '#8ED4E0', icon: PX_ICON.unlock },
  master: { c: '#FF7AB8', d: '#A8336E', rgb: '255,122,184', chrome: CHROME.pink, bg: ROUTE_BG, subc: '#8ED4E0', icon: PX_ICON.star },
  rank: { c: '#2DF4C6', d: '#0E9C9A', rgb: '45,244,198', chrome: CHROME.aqua, bg: ROUTE_BG, subc: '#8ED4E0', icon: PX_ICON.up },
  news: { c: '#FF7A45', d: '#A8461F', rgb: '255,122,69', chrome: CHROME.orange, bg: ROUTE_BG, subc: '#8ED4E0', icon: PX_ICON.bang },
  progress: { c: '#C9D3E6', d: '#4A5470', rgb: '201,211,230', chrome: CHROME.S, bg: ROUTE_BG, subc: '#8ED4E0', icon: PX_ICON.flag },
  lastday: { c: '#FFD84A', d: '#A35A00', rgb: '255,216,74', chrome: CHROME.G, bg: ARENA_BG, subc: '#CBBB93', icon: PX_ICON.crown },
  arenaRank: { c: '#FFD84A', d: '#A35A00', rgb: '255,216,74', chrome: CHROME.G, bg: ARENA_BG, subc: '#CBBB93', icon: PX_ICON.podium },
  teacher: { c: '#2DF4C6', d: '#0E9C9A', rgb: '45,244,198', chrome: CHROME.aqua, bg: ARENA_BG, subc: '#CBBB93', icon: PX_ICON.cap },
  firstOther: { c: '#FF5A6E', d: '#5A0A1C', rgb: '255,90,110', chrome: CHROME.F, bg: ROUTE_BG, subc: '#8ED4E0' },
};

export function toastLook(t: ToastItem): Look {
  if (t.kind !== 'trophy') return NOTE_LOOK[t.kind];
  const g = GRADE_COLOR[t.grade ?? 'B'];
  if (t.grade === 'P') return { c: g.c, d: g.d, rgb: g.rgb, chrome: PRISM, bg: 'linear-gradient(180deg,#1A1440,#0A0820)', subc: '#CBB8FF' };
  if (t.grade === 'F') return { c: g.c, d: '#5A0A1C', rgb: g.rgb, chrome: CHROME.G, bg: 'linear-gradient(180deg,#3A0A18,#14040A)', subc: '#FFB0BC' };
  return { c: g.c, d: g.d, rgb: g.rgb, chrome: CHROME[t.grade ?? 'B'], bg: t.abyss ? ABYSS_BG : ROUTE_BG, subc: '#8ED4E0' };
}

const SPARK = 'M2 0h1v2h2v1H3v2H2V3H0V2h2z';
function Spark({ size, fill, style }: { size: number; fill: string; style: CSSProperties }) {
  return (
    <svg className="tt-spark tt-sparkle" viewBox="0 0 5 5" width={size} height={size} style={style} aria-hidden="true">
      <path d={SPARK} fill={fill} />
    </svg>
  );
}

/** 入場の保険: 1.5 秒で描き終わっていなければ（WebView で animation が止まった）最後の状態にする。描き終わる頃にも */
const DONE_MS: Record<string, number> = { P: 4200, F: 3900 };

export function ToastCard({ item, more, peek, wide, out = false, onTap }: { item: ToastItem; more: number; peek: ToastItem | null; wide: boolean; out?: boolean; onTap: () => void }) {
  const look = toastLook(item);
  const w = toastWidth(item, wide);
  const fs = toastNameSize(item, wide);
  const isP = item.kind === 'trophy' && item.grade === 'P';
  const isF = item.kind === 'trophy' && item.grade === 'F';
  const isFo = item.kind === 'firstOther';
  const isTrophy = item.kind === 'trophy';
  const box = isP ? 50 : isFo ? 36 : 40;
  const ref = useRef<HTMLButtonElement>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    const check = window.setTimeout(() => {
      const el = ref.current;
      if (!el) return;
      const cp = getComputedStyle(el).clipPath || '';
      if (/100%/.test(cp)) setDone(true); // まだ「描く前」（inset(0 100% 0 0)）のまま
    }, 1500);
    const t = window.setTimeout(() => setDone(true), DONE_MS[isTrophy ? item.grade ?? '' : ''] ?? 3200);
    return () => {
      window.clearTimeout(check);
      window.clearTimeout(t);
    };
  }, [isTrophy, item.grade]);

  const frameBg = isP
    ? PRISM
    : isF
      ? 'linear-gradient(90deg,#FFD84A 0 14px,#FF5A6E 14px calc(100% - 14px),#FFD84A calc(100% - 14px))'
      : look.c;
  const glow = isP
    ? 'drop-shadow(4px 4px 0 #1C1236) drop-shadow(0 0 14px rgba(208,139,255,.6))'
    : isF
      ? 'drop-shadow(3px 3px 0 #5A0A1C) drop-shadow(0 0 12px rgba(255,90,110,.6))'
      : isFo
        ? 'drop-shadow(3px 3px 0 #5A0A1C) drop-shadow(0 0 8px rgba(255,90,110,.4))'
        : `drop-shadow(3px 3px 0 ${look.d}) drop-shadow(0 0 10px rgba(${look.rgb},.5))`;
  const timerBg = isP
    ? 'repeating-linear-gradient(90deg,#2DF4C6 0 8px,rgba(0,0,0,0) 8px 10px,#D08BFF 10px 18px,rgba(0,0,0,0) 18px 20px,#FFD84A 20px 28px,rgba(0,0,0,0) 28px 30px)'
    : isF
      ? 'repeating-linear-gradient(90deg,#FF5A6E 0 8px,rgba(0,0,0,0) 8px 10px,#FFD84A 10px 18px,rgba(0,0,0,0) 18px 20px)'
      : `repeating-linear-gradient(90deg,${look.c} 0 8px,rgba(0,0,0,0) 8px 10px)`;
  const aria =
    isTrophy
      ? `${isP ? 'プラチナトロフィー' : isF ? 'ファーストトロフィー' : 'トロフィー'} ${item.main} を獲得。${more ? `ほか ${more} 件。` : ''}${peek ? 'タップで次へ' : 'タップで詳細'}`
      : `${item.head} ${item.main}${item.sub ? ' ' + item.sub : ''}`;

  const head = (
    <span className={`tt-arc tt-chrome tt-head${isFo ? '' : ' tt-blink'}`} style={{ backgroundImage: isP ? PRISM : look.chrome }}>
      {item.head}
    </span>
  );

  let row: JSX.Element | null = null;
  if (isTrophy) {
    const tag = isP || isF ? <span className="tt-dot tt-sub" style={{ color: look.subc }}>{item.sub}</span> : <span className="tt-arc tt-en" style={{ color: look.c }}>{GRADE_COLOR[item.grade ?? 'B'].en}</span>;
    row = (
      <span className="tt-row tt-name">
        {tag}
        {more > 0 ? <span className="tt-dot tt-px2 tt-more">ほか {more} 件</span> : <span className="tt-arc tt-pt">+{item.pt ?? GRADE_COLOR[item.grade ?? 'B'].pt}PT</span>}
      </span>
    );
  } else if (item.prog) {
    row = (
      <span className="tt-bar tt-name" style={{ display: 'block' }}>
        <span style={{ width: `${Math.min(100, (item.prog.now / Math.max(1, item.prog.max)) * 100)}%`, background: `repeating-linear-gradient(90deg,${look.c} 0 6px,rgba(0,0,0,0) 6px 8px)` }} />
      </span>
    );
  } else if (item.sub || more > 0) {
    row = (
      <span className="tt-row tt-name">
        <span className="tt-dot tt-sub" style={{ color: look.subc, fontSize: 11 }}>{item.sub}</span>
        {more > 0 && <span className="tt-dot tt-px2 tt-more">ほか {more} 件</span>}
      </span>
    );
  }

  const beamTop = isP ? 37 : isFo ? 0 : 30;
  return (
    <div className={`tt-slot${done ? ' is-done' : ''}${out ? ' is-out' : ''}`} style={{ width: w + 14, height: isP ? 86 : 80 }}>
      {isP && (
        <>
          <span className="tt-aura" aria-hidden="true" />
          {[
            [30, 118, 6, '#2DF4C6', 1],
            [96, 114, 4, '#FFD84A', 1.3],
            [170, 120, 6, '#D08BFF', 1.15],
            [236, 112, 4, '#FF7AB8', 1.45],
          ].map(([x, y, s, c, dl], i) => (
            <span key={i} className="tt-fallbit tt-fall" aria-hidden="true" style={{ left: x as number, top: y as number, width: s as number, height: s as number, background: c as string, animationDelay: `${dl}s` }} />
          ))}
        </>
      )}
      {peek && (
        <span className="tt-peekcard tt-px tt-peek" aria-hidden="true" style={{ width: w, background: toastLook(peek).c }} />
      )}
      {!isFo && (
        <span className="tt-beamline tt-beam" aria-hidden="true" style={{ top: beamTop, width: w, boxShadow: `0 0 8px ${look.c},0 0 2px #FFFFFF` }} />
      )}
      <button
        ref={ref}
        type="button"
        className={`tt-toast tt-in${isP ? ' is-p' : isF ? ' is-f' : isFo ? ' is-fo' : ''}`}
        style={{ width: w, filter: glow }}
        aria-label={aria}
        onClick={onTap}
      >
        <span className={`tt-frame tt-px${isP ? ' tt-prism' : ''}${isF ? ' tt-shake' : ''}`} style={{ background: frameBg, padding: isP ? 4 : isFo ? 2 : 3 }}>
          <span className="tt-body tt-px" style={{ background: look.bg, padding: isP ? '8px 10px 11px 8px' : isFo ? '7px 10px 9px 7px' : undefined, gap: isP ? 10 : 9 }}>
            <span
              className={`tt-well tt-px2${isFo ? '' : ' tt-pop'}`}
              style={{
                width: box,
                height: box,
                background: isFo ? 'rgba(20,4,10,.9)' : `radial-gradient(circle,rgba(${look.rgb},${isTrophy ? (isP || isF ? 0.45 : 0.38) : 0.32}),${isP ? 'rgba(10,8,32,1)' : isF ? 'rgba(20,4,10,1)' : 'rgba(3,18,24,1)'} 72%)`,
              }}
            >
              {isTrophy || isFo ? (
                <TrophyIcon
                  grade={isFo ? 'F' : item.grade ?? 'B'}
                  size={isP ? 38 : isFo ? 24 : 30}
                  scan={!isFo}
                  style={isFo ? undefined : { filter: `drop-shadow(0 0 ${isP ? 6 : 5}px rgba(${look.rgb},${isP || isF ? 0.8 : 0.7}))` }}
                />
              ) : (
                <PxIcon d={look.icon ?? ''} c={look.c} side={look.d} />
              )}
            </span>
            <span className="tt-text" style={{ gap: isP ? 5 : 4 }}>
              {head}
              <span className={`tt-dot tt-main${isTrophy || isFo ? ' tt-name' : ''}`} style={{ fontSize: fs, lineHeight: isP ? 1.1 : 1.15 }}>
                {item.main}
              </span>
              {row}
            </span>
            <span className="tt-scan" />
            <span className="tt-flashbox tt-flash" />
            {!isFo && (
              <span className="tt-timerbox">
                <span className="tt-timer" style={{ background: timerBg }} />
              </span>
            )}
          </span>
        </span>
        {isTrophy && (
          <span
            className="tt-burstdot tt-burst"
            aria-hidden="true"
            style={
              isP
                ? { left: 37, top: 37, width: 4, height: 4, color: '#FFD84A', boxShadow: '0 -16px #2DF4C6,12px -12px #4FC3FF,16px 0 #D08BFF,12px 12px #FF7AB8,0 16px #FFD84A,-12px 12px #2DF4C6,-16px 0 #4FC3FF,-12px -12px #FF7AB8' }
                : isF
                  ? { left: 30, top: 31, width: 4, height: 4, color: '#FFD84A', boxShadow: '0 -16px #FF5A6E,12px -12px #FFD84A,16px 0 #FF5A6E,12px 12px #FFD84A,0 16px #FF5A6E,-12px 12px #FFD84A,-16px 0 #FF5A6E,-12px -12px #FFD84A' }
                  : { left: 30, top: 31, color: look.c, boxShadow: '0 -15px,11px -11px,15px 0,11px 11px,0 15px,-11px 11px,-15px 0,-11px -11px' }
            }
          />
        )}
        {isF && (
          <>
            <span
              className="tt-burstdot tt-confetti"
              aria-hidden="true"
              style={{ right: 16, top: 2, width: 4, height: 4, color: '#FFFFFF', boxShadow: '0 -22px #FFD84A,16px -16px #FF5A6E,22px 0 #FFD84A,16px 16px #FF5A6E,0 22px #FFD84A,-16px 16px #FF5A6E,-22px 0 #FFD84A,-16px -16px #FF5A6E,8px -26px #FFFFFF,-26px 6px #FFFFFF' }}
            />
            <span className="tt-stamp1 tt-arc tt-stamp" aria-hidden="true">1ST</span>
          </>
        )}
        {isTrophy && (
          isP ? (
            <>
              <Spark size={14} fill="#FFD84A" style={{ right: -8, top: -8 }} />
              <Spark size={10} fill="#2DF4C6" style={{ left: -6, bottom: -4, animationDelay: '1.45s' }} />
              <Spark size={10} fill="#FF7AB8" style={{ left: 120, top: -9, animationDelay: '1.6s' }} />
              <Spark size={8} fill="#4FC3FF" style={{ right: 40, bottom: -8, animationDelay: '1.35s' }} />
            </>
          ) : isF ? (
            <>
              <Spark size={10} fill="#FFD84A" style={{ left: 58, bottom: -8 }} />
              <Spark size={8} fill="#FF5A6E" style={{ left: -6, top: 6, animationDelay: '1.5s' }} />
            </>
          ) : (
            <>
              <Spark size={12} fill="#FFFFFF" style={{ right: -6, top: -6 }} />
              <Spark size={8} fill={look.c} style={{ left: 50, bottom: -6, animationDelay: '1.3s' }} />
            </>
          )
        )}
      </button>
    </div>
  );
}

/**
 * 通知の置き場所（左上）。左へスワイプで閉じる・タップは onTap。out = 左へ畳む途中
 */
export function ToastLayer({
  item,
  more,
  peek,
  wide,
  out,
  onTap,
  onSwipe,
}: {
  item: ToastItem;
  more: number;
  peek: ToastItem | null;
  wide: boolean;
  out: boolean;
  onTap: () => void;
  onSwipe: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  return (
    <div
      className={`tt-layer${wide ? ' is-wide' : ''}`}
      role="status"
      aria-live="polite"
      onPointerDown={(e) => {
        start.current = { x: e.clientX, y: e.clientY };
        swiped.current = false;
      }}
      onPointerMove={(e) => {
        const s = start.current;
        if (!s || swiped.current) return;
        if (s.x - e.clientX > 36 && Math.abs(e.clientY - s.y) < 40) {
          swiped.current = true;
          onSwipe();
        }
      }}
      onPointerUp={() => {
        start.current = null;
      }}
      onClickCapture={(e) => {
        if (swiped.current) e.stopPropagation();
      }}
    >
      <ToastCard key={item.key} item={item} more={more} peek={peek} wide={wide} out={out} onTap={onTap} />
    </div>
  );
}

