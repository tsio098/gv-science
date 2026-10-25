/**
 * Message in a Bottle の部品（ボード「ANCHOR TREE Message in a Bottle」版 81・実装手順_ボトルメール §0-1）。
 * ドット絵はボードの SVG のまま（crispEdges）。ロゴは CSS の文字（画像にしない）。色は tree-bottle.css と evTheme の bottle
 */
import type { CSSProperties } from 'react';
import type { BottleFragment } from '../../../lib/treeApi';
import '../../../styles/tree-bottle.css';

/* ── ボトル（14×15・いつも −14° 傾ける）──────────────────────── */
const B_CORK = 'M6 0h2v1H6zM6 1h2v1H6z';
const B_CORK_SIDE = 'M5 1h1v1H5zM8 1h1v1H8z';
const B_GLASS =
  'M5 2h4v1H5zM5 3h1v1H5zM8 3h1v1H8zM5 4h1v1H5zM8 4h1v1H8zM4 5h1v1H4zM9 5h1v1H9zM3 6h1v1H3zM10 6h1v1H10zM2 7h1v1H2zM11 7h1v1H11zM2 8h1v1H2zM11 8h1v1H11zM2 9h1v1H2zM11 9h1v1H11zM2 10h1v1H2zM11 10h1v1H11zM2 11h1v1H2zM11 11h1v1H11zM2 12h1v1H2zM11 12h1v1H11zM2 13h1v1H2zM11 13h1v1H11zM3 14h8v1H3z';
const B_SHINE = 'M6 3h1v1H6zM6 4h1v1H6zM5 5h1v1H5zM4 6h1v1H4zM3 7h1v1H3zM3 8h1v1H3zM3 9h1v1H3zM3 10h1v1H3zM3 11h1v1H3z';
const B_INSIDE =
  'M7 3h1v1H7zM7 4h1v1H7zM6 5h3v1H6zM5 6h5v1H5zM4 7h7v1H4zM4 8h1v1H4zM10 8h1v1H10zM4 9h1v1H4zM10 9h1v1H10zM4 10h1v1H4zM10 10h1v1H10zM4 11h1v1H4zM10 11h1v1H10zM3 12h2v1H3zM10 12h1v1H10zM3 13h8v1H3z';
const B_LETTER = 'M5 8h4v1H5zM5 9h1v1H5zM8 9h1v1H8zM5 10h4v1H5zM5 11h4v1H5zM5 12h4v1H5z';
const B_LETTER_SIDE = 'M9 8h1v1H9zM9 9h1v1H9zM9 10h1v1H9zM9 11h1v1H9zM9 12h1v1H9z';
const B_SEAL = 'M6 9h2v1H6z';

const BOTTLE_COLORS = {
  glass: { glass: '#7EEBC6', shine: '#E8FFF6', inside: 'rgba(126,235,198,.28)', letter: '#F6E3B4', letterSide: '#D9B97C' },
  // EVENT トロフィー（金のボトル・§0-3）: 台座・杯・手紙のマークは付けない（先生 2026-10-25）
  gold: { glass: '#F6D58E', shine: '#FFFBEA', inside: 'rgba(246,213,142,.38)', letter: '#FFFFFF', letterSide: '#AFC4E6' },
  // まだ流していない・使い切った（線だけ）
  dim: { glass: 'rgba(169,187,217,.45)', shine: 'rgba(169,187,217,.2)', inside: 'rgba(169,187,217,.08)', letter: 'rgba(169,187,217,.18)', letterSide: 'rgba(169,187,217,.12)' },
} as const;

export function PxBottle({
  size = 28,
  variant = 'glass',
  tilt = -14,
  glow = false,
  style,
}: {
  size?: number;
  variant?: keyof typeof BOTTLE_COLORS;
  tilt?: number;
  glow?: boolean;
  style?: CSSProperties;
}) {
  const c = BOTTLE_COLORS[variant];
  const glowC = variant === 'gold' ? 'rgba(246,213,142,.55)' : 'rgba(126,235,198,.45)';
  return (
    <svg
      viewBox="0 0 14 15"
      width={size}
      height={Math.round((size * 15) / 14)}
      shapeRendering="crispEdges"
      aria-hidden="true"
      style={{ display: 'block', flex: 'none', transform: tilt ? `rotate(${tilt}deg)` : undefined, filter: glow ? `drop-shadow(0 0 ${Math.max(4, size / 6)}px ${glowC})` : undefined, ...style }}
    >
      <path fill={variant === 'dim' ? 'rgba(169,187,217,.4)' : '#C08A4A'} d={B_CORK} />
      <path fill={variant === 'dim' ? 'rgba(169,187,217,.3)' : '#8A5A2B'} d={B_CORK_SIDE} />
      <path fill={c.glass} d={B_GLASS} />
      <path fill={c.shine} d={B_SHINE} />
      <path fill={c.inside} d={B_INSIDE} />
      <path fill={c.letter} d={B_LETTER} />
      <path fill={c.letterSide} d={B_LETTER_SIDE} />
      <path fill={variant === 'dim' ? 'rgba(169,187,217,.3)' : '#E0533D'} d={B_SEAL} />
    </svg>
  );
}

/* ── ABYSS のドットの錨（10×10・シアン）・招待状の封蝋（錨の紋の丸 16×16）──────────── */
export function PxAnchor({ size = 16, fill = '#00E5FF', glow = false, style }: { size?: number; fill?: string; glow?: boolean; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 10 10" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none', filter: glow ? 'drop-shadow(0 0 5px rgba(0,229,255,.6))' : undefined, ...style }}>
      <path
        fill={fill}
        d="M4 0h2v1H4zM3 1h1v1H3zM6 1h1v1H6zM4 2h2v1H4zM4 3h2v1H4zM1 4h8v1H1zM4 5h2v1H4zM0 6h1v1H0zM4 6h2v1H4zM9 6h1v1H9zM0 7h2v1H0zM4 7h2v1H4zM8 7h2v1H8zM1 8h2v1H1zM4 8h2v1H4zM7 8h2v1H7zM2 9h6v1H2z"
      />
    </svg>
  );
}
export function PxInviteSeal({ size = 56, closed = false, style }: { size?: number; closed?: boolean; style?: CSSProperties }) {
  // 不正解（THIS INVITATION IS CLOSED）は灰色の封蝋
  const face = closed ? '#5A6478' : '#00E5FF';
  const ink = closed ? '#1A1F2A' : '#031B24';
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none', filter: closed ? undefined : 'drop-shadow(0 0 12px rgba(0,229,255,.55))', ...style }}>
      <path
        fill={face}
        d="M7 0h2v1H7zM4 1h8v1H4zM3 2h10v1H3zM2 3h5v1H2zM9 3h5v1H9zM1 4h5v1H1zM7 4h2v1H7zM10 4h5v1H10zM1 5h6v1H1zM9 5h6v1H9zM1 6h6v1H1zM9 6h6v1H9zM0 7h4v1H0zM12 7h4v1H12zM0 8h7v1H0zM9 8h7v1H9zM1 9h2v1H1zM4 9h3v1H4zM9 9h3v1H9zM13 9h2v1H13zM1 10h2v1H1zM5 10h2v1H5zM9 10h2v1H9zM13 10h2v1H13zM1 11h3v1H1zM6 11h1v1H6zM9 11h1v1H9zM12 11h3v1H12zM2 12h3v1H2zM11 12h3v1H11zM3 13h10v1H3zM4 14h8v1H4zM7 15h2v1H7z"
      />
      <path
        fill={ink}
        d="M7 3h2v1H7zM6 4h1v1H6zM9 4h1v1H9zM7 5h2v1H7zM7 6h2v1H7zM4 7h8v1H4zM7 8h2v1H7zM3 9h1v1H3zM7 9h2v1H7zM12 9h1v1H12zM3 10h2v1H3zM7 10h2v1H7zM11 10h2v1H11zM4 11h2v1H4zM7 11h2v1H7zM10 11h2v1H10zM5 12h6v1H5z"
      />
    </svg>
  );
}

/** 手紙の封蝋（12×12・赤）*/
export function PxLetterSeal({ size = 34 }: { size?: number }) {
  return (
    <svg viewBox="0 0 12 12" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path fill="#B5402C" d="M4 0h4v1H4zM2 1h8v1H2zM1 2h10v1H1zM1 3h10v1H1zM0 4h12v4H0zM1 8h10v2H1zM2 10h8v1H2zM4 11h4v1H4z" />
      <path fill="#F6E3B4" d="M5 3h2v1H5zM5 4h2v1H5zM3 5h6v1H3zM5 6h2v3H5zM3 7h1v1H3zM8 7h1v1H8zM4 8h1v1H4zM7 8h1v1H7z" />
    </svg>
  );
}

/* ── 小さなドットのアイコン ─────────────────────────────── */
const icon = (vb: string, d: string, size: number, fill: string, evenodd = false, style?: CSSProperties) => (
  <svg viewBox={vb} width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none', ...style }}>
    <path d={d} fill={fill} fillRule={evenodd ? 'evenodd' : undefined} />
  </svg>
);
export const PxCheck = ({ size = 14, fill = '#7EEBC6' }: { size?: number; fill?: string }) =>
  icon('0 0 8 8', 'M6 1h2v2H7v1H6v1H5v1H4v1H2V6H1V5H0V3h2v1h1v1h1V4h1V3h1z', size, fill);
export const PxWarn = ({ size = 14, fill = '#FFB38A' }: { size?: number; fill?: string }) => icon('0 0 8 8', 'M3 0h2v5H3zM3 6h2v2H3z', size, fill);
export const PxCross = ({ size = 14, fill = 'currentColor' }: { size?: number; fill?: string }) =>
  icon('0 0 7 7', 'M0 0h2v1H0zM5 0h2v1H5zM1 1h2v1H1zM4 1h2v1H4zM2 2h3v3H2zM1 5h2v1H1zM4 5h2v1H4zM0 6h2v1H0zM5 6h2v1H5z', size, fill);
export const PxBigCheck = ({ size = 110 }: { size?: number }) => (
  <svg viewBox="0 0 10 8" width={size} height={Math.round(size * 0.8)} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none', filter: 'drop-shadow(5px 5px 0 #2A8C72) drop-shadow(0 0 18px rgba(126,235,198,.55))' }}>
    <path fill="#7EEBC6" d="M8 0h2v2H9v1H8v1H7v1H6v1H5v1H4v1H3V7H2V6H1V5H0V3h2v1h1v1h1V4h1V3h1V2h1V1h1z" />
  </svg>
);
export const PxCopy = ({ size = 9, fill = 'currentColor' }: { size?: number; fill?: string }) =>
  icon('0 0 8 8', 'M2 0h4v1h2v7H0V1h2zM1 2v5h6V2z', size, fill, true);
export const PxCamera = ({ size = 13, fill = '#F6D58E' }: { size?: number; fill?: string }) =>
  icon('0 0 8 8', 'M2 1h4v1h2v6H0V2h2zM3 3v1H2v2h1v1h2V6h1V4H5V3z', size, fill);
export const PxChevron = ({ size = 12, fill = '#A9BBD9', style }: { size?: number; fill?: string; style?: CSSProperties }) =>
  icon('0 0 8 8', 'M2 1h1v1h1v1h1v1h1v1H5v1H4v1H3v1H2z', size, fill, false, style);

/* ── ロゴ（MESSAGE 小・IN A 極小・BOTTLE 大＋ドットの波線）── */
const LOGO = {
  // イベント画面の見出し（B02）
  lg: { msg: 9, ina: 7, bottle: 21, gap: 5, wave: 0 },
  // 招待状・送った画面など中くらい
  sm: { msg: 8, ina: 6, bottle: 16, gap: 4, wave: 0 },
  // ノード名（ツリーでは 6px / 10px・2026-10-25 デザイン §0-1）
  node: { msg: 6, ina: 5, bottle: 10, gap: 3, wave: 0 },
  // 大きい見出し（ボード Main・バナー）
  xl: { msg: 16, ina: 9, bottle: 40, gap: 9, wave: 1 },
} as const;
export function BottleLogo({ size = 'lg', style }: { size?: keyof typeof LOGO; style?: CSSProperties }) {
  const z = LOGO[size];
  return (
    <span className="bt-logo" role="img" aria-label="MESSAGE IN A BOTTLE" style={{ gap: z.gap, ...style }}>
      <span className="bt-logo-row" style={{ gap: z.gap + 1 }}>
        <span className="ev-arc bt-chrome" style={{ fontSize: z.msg }}>MESSAGE</span>
        <span className="ev-arc bt-ina" style={{ fontSize: z.ina }}>IN A</span>
      </span>
      <span className="ev-arc bt-chrome" style={{ fontSize: z.bottle }}>BOTTLE</span>
      {z.wave ? <BottleWave width={z.bottle * 6} /> : null}
    </span>
  );
}
/** ドットの波線 */
export function BottleWave({ width = 120, style }: { width?: number; style?: CSSProperties }) {
  let d = '';
  for (let x = 0; x < 100; x += 4) d += `M${x} 2h2v1H${x}zM${x + 2} 1h1v1H${x + 2}zM${x + 3} 0h1v1H${x + 3}z`;
  return (
    <svg viewBox="0 0 100 3" width={width} height={Math.max(4, Math.round(width * 0.03))} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', opacity: 0.8, ...style }}>
      <path fill="#7EEBC6" d={d} />
    </svg>
  );
}

/* ── ポイントのバー（20 マス・50 の印は「50 ???」・100 トロフィー）── */
export function PointBar({ points, max = 100, inviteAt = 50, segs = 20, label = true }: { points: number; max?: number; inviteAt?: number; segs?: number; label?: boolean }) {
  const per = max / segs;
  const filled = Math.min(segs, Math.floor(points / per));
  return (
    <div className="bt-bar-wrap">
      <div className="bt-bar" role="img" aria-label={`${points} pt / ${max} pt。${inviteAt} pt で ???、${max} pt でトロフィー`}>
        {Array.from({ length: segs }, (_, i) => (
          <span key={i} className={i < filled ? 'is-on' : i === filled && points < max ? 'is-next' : undefined} />
        ))}
        <i className="bt-bar-mark" style={{ left: `calc(${(inviteAt / max) * 100}% - 1px)` }} />
      </div>
      {label && (
        <div className="bt-bar-labels ev-dot">
          <span className="ev-arc" style={{ fontSize: 7 }}>0</span>
          <span className="bt-bar-mid" style={{ left: `${(inviteAt / max) * 100}%` }}>
            <span className="ev-arc" style={{ fontSize: 7 }}>{inviteAt} ???</span>
          </span>
          <span style={{ color: '#F6D58E' }}>
            <span className="ev-arc" style={{ fontSize: 7 }}>{max}</span> トロフィー
          </span>
        </div>
      )}
    </div>
  );
}

/* ── 招待状の欠片（条件の文 33 マス・自分の文字だけ光る・ほかは伏せ字）── */
export function FragGrid({ fragment, len = 33, cell = 22, cols = 11, label }: { fragment: BottleFragment | null; len?: number; cell?: number; cols?: number; label?: string }) {
  const n = fragment?.len ?? len;
  const at = new Map((fragment?.cells ?? []).map((c) => [c.i, c.ch]));
  return (
    <span
      className="bt-frag"
      role="img"
      aria-label={label ?? (fragment ? `開放条件の文 ${n} 文字のうち、あなたの欠片 ${at.size} 文字` : `開放条件の文 ${n} 文字（伏せてある）`)}
      style={{ gridTemplateColumns: `repeat(${cols}, ${cell}px)`, ['--cell' as string]: `${cell}px` }}
    >
      {Array.from({ length: n }, (_, i) => {
        const ch = at.get(i);
        return (
          <span key={i} className={`ev-dot bt-frag-cell${ch ? ' is-mine' : ''}`}>
            {ch ?? ''}
          </span>
        );
      })}
    </span>
  );
}

/** 日時（JST）: 今日 7:42 / 昨日 21:10 / 11/22 */
export function bottleWhen(ms: number, now = Date.now()) {
  const J = 9 * 3600_000;
  const d = new Date(ms + J);
  const day = Math.floor((ms + J) / 86400_000);
  const today = Math.floor((now + J) / 86400_000);
  const hm = `${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
  if (day === today) return `今日 ${hm}`;
  if (day === today - 1) return `昨日 ${hm}`;
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
}
