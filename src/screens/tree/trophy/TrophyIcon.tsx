/**
 * ドットのトロフィー（実装手順_トロフィー §6.2・ボード「トロフィーの仕組み」）。
 * 下に 1px ずらした側面 → 面（縦グラデ・52% で切れるクローム）→ 走査線 の 3 枚。輪郭は #06121A（paint-order: stroke）。
 * グラデは TrophySprite に 1 回だけ置き、url(#tr-fc-*) で参照する（TreeRoot・FxLab で 1 つ）。
 */
import type { CSSProperties } from 'react';
import type { ToastGrade } from './toastQueue';

const PATH = 'M3 2H13V3H15V6H14V7H12V8H11V9H10V10H9V12H11V13H12V15H4V13H5V12H7V10H6V9H5V8H4V7H2V6H1V3H3ZM2 4V6H4V4ZM12 4V6H14V4Z';

/** グレード → 面（0 / 22 / 50 | 50 / 62 / 100%）と側面の色 */
const FACE: Record<ToastGrade, [string, string, string, string, string, string]> = {
  B: ['#FFFFFF', '#FFE6CF', '#E3A26A', '#6B3514', '#9A5A2E', '#F5C79C'],
  S: ['#FFFFFF', '#F4F7FF', '#C9D3E6', '#4A5470', '#6E7891', '#E6ECF8'],
  G: ['#FFFFFF', '#FFF4C2', '#FFD84A', '#A35A00', '#C9790A', '#FFE38A'],
  P: ['#FFFFFF', '#D9FFF6', '#4FC3FF', '#6A2FB0', '#B05BD6', '#FFB8E6'],
  F: ['#FFFFFF', '#FFD6DC', '#FF5A6E', '#7A0C24', '#B3203E', '#FFB0BC'],
};
const SIDE: Record<ToastGrade, [string, string]> = {
  B: ['#7A4420', '#2A1206'],
  S: ['#5A6480', '#1E2333'],
  G: ['#9A6300', '#3A2000'],
  P: ['#5B4A92', '#1C1236'],
  F: ['#6A1024', '#22040C'],
};

/** グレードの色（枠・文字）・暗い側（影）・rgb */
export const GRADE_COLOR: Record<ToastGrade, { c: string; d: string; rgb: string; en: string; pt: number }> = {
  B: { c: '#E3A26A', d: '#6B3514', rgb: '227,162,106', en: 'BRONZE', pt: 15 },
  S: { c: '#C9D3E6', d: '#4A5470', rgb: '201,211,230', en: 'SILVER', pt: 30 },
  G: { c: '#FFD84A', d: '#A35A00', rgb: '255,216,74', en: 'GOLD', pt: 90 },
  P: { c: '#D08BFF', d: '#1C1236', rgb: '208,139,255', en: 'PLATINUM', pt: 300 },
  F: { c: '#FF5A6E', d: '#7A0C24', rgb: '255,90,110', en: 'FIRST', pt: 180 },
};

/** クロームの文字（見出し）: 52% で切れる縦グラデ */
const ch = (a: string, b: string, c: string, d: string, e: string, f: string) =>
  `linear-gradient(180deg,${a} 0%,${b} 30%,${c} 52%,${d} 52%,${e} 72%,${f} 100%)`;
export const CHROME = {
  B: ch('#FFFFFF', '#FFE6CF', '#E3A26A', '#9A5A2E', '#C98450', '#F5C79C'),
  S: ch('#FFFFFF', '#F4F7FF', '#C9D3E6', '#6E7891', '#9AA5BE', '#E6ECF8'),
  G: ch('#FFFFFF', '#FFF4C2', '#FFD84A', '#C9790A', '#E09A1E', '#FFE38A'),
  F: ch('#FFFFFF', '#FFD6DC', '#FF5A6E', '#7A0C24', '#B3203E', '#FFB0BC'),
  aqua: ch('#FFFFFF', '#B6FFEF', '#2DF4C6', '#0E9C9A', '#17B5A8', '#9BEBFF'),
  sky: ch('#FFFFFF', '#CDEFFF', '#4FC3FF', '#1C6FA3', '#2C8FCB', '#BDE8FF'),
  pink: ch('#FFFFFF', '#FFD6EA', '#FF7AB8', '#A8336E', '#D0508E', '#FFC2DF'),
  orange: ch('#FFFFFF', '#FFE0D0', '#FF7A45', '#A8461F', '#D05C2C', '#FFC1A3'),
};
/** プラチナの枠・見出し（分野色 5 色の帯）*/
export const PRISM = 'linear-gradient(90deg,#2DF4C6 0 20%,#4FC3FF 20% 40%,#D08BFF 40% 60%,#FF7AB8 60% 80%,#FFD84A 80%)';

const gid = (g: ToastGrade) => g.toLowerCase();

/** グラデの定義（画面に 1 つ）*/
export function TrophySprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        {(Object.keys(FACE) as ToastGrade[]).map((g) => {
          const f = FACE[g];
          const s = SIDE[g];
          return [
            <linearGradient key={'fc' + g} id={`tr-fc-${gid(g)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={f[0]} />
              <stop offset=".22" stopColor={f[1]} />
              <stop offset=".5" stopColor={f[2]} />
              <stop offset=".5" stopColor={f[3]} />
              <stop offset=".62" stopColor={f[4]} />
              <stop offset="1" stopColor={f[5]} />
            </linearGradient>,
            <linearGradient key={'sd' + g} id={`tr-sd-${gid(g)}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={s[0]} />
              <stop offset="1" stopColor={s[1]} />
            </linearGradient>,
          ];
        })}
        <pattern id="tr-scan" width="1" height="1" patternUnits="userSpaceOnUse">
          <rect y=".62" width="1" height=".38" fill="#001018" opacity=".24" />
        </pattern>
      </defs>
    </svg>
  );
}

/** ドットのトロフィー。dim = 未獲得（薄く・彩度を落とす）*/
export function TrophyIcon({
  grade,
  size,
  stroke = 0.7,
  scan = true,
  style,
  className,
}: {
  grade: ToastGrade;
  size: number;
  stroke?: number;
  scan?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  const k = gid(grade);
  return (
    <svg viewBox="0 1 17 16" width={size} height={size} aria-hidden="true" style={{ overflow: 'visible', ...style }} className={className}>
      <path transform="translate(1 1)" d={PATH} fillRule="evenodd" fill={`url(#tr-sd-${k})`} stroke="#06121A" strokeWidth={stroke} style={{ paintOrder: 'stroke' }} />
      <path d={PATH} fillRule="evenodd" fill={`url(#tr-fc-${k})`} stroke="#06121A" strokeWidth={stroke} style={{ paintOrder: 'stroke' }} />
      {scan && <path d={PATH} fillRule="evenodd" fill="url(#tr-scan)" />}
    </svg>
  );
}

/** ドット絵（'#' = 1 マス）→ path（ボードの px(rows)）*/
export const px = (rows: string[]) => {
  let d = '';
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (ch === '#') d += `M${x} ${y}h1v1h-1z`;
  }));
  return d;
};

export const PX_ICON = {
  unlock: px(['...###...', '..#...#..', '..#......', '..#......', '.#######.', '.###.###.', '.###.###.', '.#######.']),
  star: px(['....#....', '....#....', '...###...', '#########', '.#######.', '..#####..', '..##.##..', '.##...##.', '.#.....#.']),
  up: px(['....#....', '...###...', '..#####..', '.#######.', '...###...', '...###...', '...###...', '...###...']),
  bang: px(['...###...', '...###...', '...###...', '...###...', '...###...', '.........', '...###...', '...###...']),
  flag: px(['.#.......', '.######..', '.#######.', '.######..', '.#.......', '.#.......', '.#.......', '###......']),
  crown: px(['#...#...#', '##.###.##', '#########', '#########', '.#######.', '.........', '.#######.']),
  podium: px(['...###...', '...###...', '######...', '######...', '#########', '#########', '#########']),
  cap: px(['....#....', '..#####..', '#########', '..#####..', '..#####.#', '..#####.#', '.......##']),
};

/** 通知のドットのアイコン（側面の色を 1 マス右下にずらして重ねる）*/
export function PxIcon({ d, c, side, size = 24 }: { d: string; c: string; side: string; size?: number }) {
  return (
    <svg viewBox="-.5 -.5 10.5 10.5" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <path transform="translate(1 1)" d={d} fill={side} />
      <path d={d} fill={c} />
    </svg>
  );
}

/** ヘッダーのトロフィー（16×16 のドット・ボード TreeToast）*/
export function HeadTrophy({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <g fill="currentColor">
        <rect x="3" y="2" width="10" height="1" />
        <rect x="4" y="3" width="8" height="5" />
        <rect x="5" y="8" width="6" height="1" />
        <rect x="6" y="9" width="4" height="1" />
        <rect x="1" y="3" width="3" height="1" />
        <rect x="1" y="4" width="1" height="2" />
        <rect x="2" y="6" width="2" height="1" />
        <rect x="12" y="3" width="3" height="1" />
        <rect x="14" y="4" width="1" height="2" />
        <rect x="12" y="6" width="2" height="1" />
        <rect x="7" y="10" width="2" height="2" />
        <rect x="5" y="12" width="6" height="1" />
        <rect x="4" y="13" width="8" height="2" />
      </g>
    </svg>
  );
}

/** ヘッダーの表彰台（ランキング・ドット）*/
export function HeadPodium({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="-.5 -1.5 10 10" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true">
      <path d={PX_ICON.podium} fill="currentColor" />
    </svg>
  );
}
