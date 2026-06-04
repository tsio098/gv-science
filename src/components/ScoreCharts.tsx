/**
 * 成績推移画面で使う手書き SVG チャート群。
 * 外部チャートライブラリ不使用（バンドル増を避け、LIFF WebView の負荷を抑える）。
 *
 *  - Sparkline       : ホーム CTA 等で使う極小折れ線
 *  - TotalTrendChart : 合計点の推移（左軸=点数, 右軸=偏差値, 3系列）
 *  - FieldLineChart  : 分野別の月次推移（任意分野を可視/非可視に切替）
 *
 * デザインリファレンス: design/gradetrend-charts.jsx 完全準拠。
 * 線は基底状態で可視（LIFF/WebView でアニメ凍結しても内容が読める）。
 */
import { dateShort, monthShort } from '../data/scoresMock';
import type { ScoreTestPoint } from '../lib/types';

/* ── 落ち着いた categorical パレット（ブランドに調和） ──────── */
export const FIELD_COLORS = [
  '#5F8159', '#C77A3D', '#6E8FA6', '#B0593F', '#8A9B5A',
  '#9C6F94', '#3F7E72', '#C29A3A', '#7A6BA6', '#B85C6E',
  '#5E8C6A', '#A9743B',
];

/* ── 軸スケール用ユーティリティ ──────────────────────────── */
function bounds(values: number[], padFrac = 0.12, step = 5) {
  const filtered = values.filter((v) => Number.isFinite(v));
  if (filtered.length === 0) return { min: 0, max: step };
  const lo = Math.min(...filtered);
  const hi = Math.max(...filtered);
  const span = Math.max(hi - lo, step);
  let min = Math.floor((lo - span * padFrac) / step) * step;
  let max = Math.ceil((hi + span * padFrac) / step) * step;
  if (min === max) max = min + step;
  return { min, max };
}
function ticks(min: number, max: number, n = 4): number[] {
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    out.push(Math.round(min + ((max - min) * i) / n));
  }
  return out;
}

/* ────────────────────────────────────────────────────────
   Sparkline — ホーム入口カードの右側に置く極小折れ線
   ──────────────────────────────────────────────────────── */
interface SparklineProps {
  values: number[];
  w?: number;
  h?: number;
  color?: string;
}
export function Sparkline({
  values,
  w = 76,
  h = 30,
  color = 'var(--c-primary-deep)',
}: SparklineProps) {
  if (!values || values.length < 2) return null;
  const { min, max } = bounds(values, 0.18, 1);
  const n = values.length;
  const x = (i: number) => 2 + ((w - 4) * i) / (n - 1);
  const y = (v: number) => 2 + (h - 4) * (1 - (v - min) / (max - min));
  const d = values
    .map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`)
    .join(' ');
  const last = values.length - 1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" aria-hidden="true">
      <path
        d={`${d} L ${x(last).toFixed(1)} ${h} L ${x(0).toFixed(1)} ${h} Z`}
        fill={color}
        opacity="0.10"
      />
      <path d={d} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(last)} cy={y(values[last])} r="2.6" fill={color} />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────
   TotalTrendChart — 合計点 / 平均点 / 偏差値 を重ねた折れ線
   ──────────────────────────────────────────────────────── */
interface TotalTrendChartProps {
  points: ScoreTestPoint[];
}
export function TotalTrendChart({ points }: TotalTrendChartProps) {
  const W = 336;
  const H = 196;
  const padL = 30;
  const padR = 32;
  const padT = 16;
  const padB = 30;
  const iW = W - padL - padR;
  const iH = H - padT - padB;
  const n = points.length;

  const scoreVals = points.flatMap((p) => [p.total, p.avg]);
  const sB = bounds(scoreVals, 0.14, 5);
  const hB = bounds(points.map((p) => p.hensachi), 0.16, 5);

  const X = (i: number) =>
    padL + (n === 1 ? iW / 2 : (iW * i) / (n - 1));
  const Ys = (v: number) =>
    padT + iH * (1 - (v - sB.min) / (sB.max - sB.min));
  const Yh = (v: number) =>
    padT + iH * (1 - (v - hB.min) / (hB.max - hB.min));

  const line = (vals: number[], Y: (v: number) => number) =>
    vals
      .map((v, i) => `${i ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`)
      .join(' ');
  const totalD = line(points.map((p) => p.total), Ys);
  const avgD = line(points.map((p) => p.avg), Ys);
  const hensD = line(points.map((p) => p.hensachi), Yh);
  const areaD = `${totalD} L ${X(n - 1).toFixed(1)} ${(padT + iH).toFixed(
    1
  )} L ${X(0).toFixed(1)} ${(padT + iH).toFixed(1)} Z`;

  const sT = ticks(sB.min, sB.max, 4);
  const hT = ticks(hB.min, hB.max, 4);
  // 24件超のときは個別ドットを省き、線として全件1フレームに収める
  const dense = n > 24;
  const maxLabels = 6;
  let xIdx: number[];
  if (n <= maxLabels) {
    xIdx = points.map((_, i) => i);
  } else {
    const step = (n - 1) / (maxLabels - 1);
    xIdx = [
      ...new Set(
        Array.from({ length: maxLabels }, (_, k) => Math.round(k * step))
      ),
    ];
  }

  return (
    <svg
      className="gt-chart"
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="合計点の推移グラフ"
    >
      {/* グリッド + 左軸（点数）目盛 */}
      {sT.map((t, i) => (
        <g key={`g${i}`}>
          <line
            x1={padL}
            y1={Ys(t)}
            x2={padL + iW}
            y2={Ys(t)}
            stroke="var(--c-divider)"
            strokeWidth="1"
            opacity="0.7"
          />
          <text x={padL - 6} y={Ys(t) + 3} textAnchor="end" className="gt-axis">
            {t}
          </text>
        </g>
      ))}
      {/* 右軸（偏差値）目盛 */}
      {hT.map((t, i) => (
        <text
          key={`h${i}`}
          x={padL + iW + 6}
          y={Yh(t) + 3}
          textAnchor="start"
          className="gt-axis gt-axis-acc"
        >
          {t}
        </text>
      ))}
      {/* X 軸ラベル */}
      {xIdx.map((i) => (
        <text
          key={`x${i}`}
          x={X(i)}
          y={H - 9}
          textAnchor="middle"
          className="gt-axis"
        >
          {dateShort(points[i].date)}
        </text>
      ))}

      {/* total エリア + 3 系列 */}
      <path d={areaD} fill="var(--c-primary)" opacity="0.08" />
      <path
        d={avgD}
        fill="none"
        stroke="var(--c-text-mute)"
        strokeWidth="1.6"
        strokeDasharray="3 4"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path
        d={hensD}
        fill="none"
        stroke="var(--c-accent)"
        strokeWidth={dense ? 1.4 : 1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.55"
      />
      <path
        d={totalD}
        fill="none"
        stroke="var(--c-primary-deep)"
        strokeWidth={dense ? 2.2 : 3}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* ドット — sparse 時のみ全件、dense 時は最新だけ */}
      {!dense &&
        points.map((p, i) => (
          <circle
            key={`dh${i}`}
            cx={X(i)}
            cy={Yh(p.hensachi)}
            r="2.2"
            fill="#fff"
            stroke="var(--c-accent)"
            strokeWidth="1.4"
            opacity="0.7"
          />
        ))}
      {!dense &&
        points.map((p, i) => (
          <circle
            key={`dt${i}`}
            cx={X(i)}
            cy={Ys(p.total)}
            r="3.1"
            fill="#fff"
            stroke="var(--c-primary-deep)"
            strokeWidth="2"
          />
        ))}
      {dense && (
        <circle
          cx={X(n - 1)}
          cy={Ys(points[n - 1].total)}
          r="3.4"
          fill="#fff"
          stroke="var(--c-primary-deep)"
          strokeWidth="2.2"
        />
      )}
    </svg>
  );
}

/* ────────────────────────────────────────────────────────
   FieldLineChart — 月をX、分野ごとに 1 本の線
   ──────────────────────────────────────────────────────── */
export interface FieldSeries {
  name: string;
  color: string;
  values: Array<number | null>;
}
interface FieldLineChartProps {
  months: string[];
  series: FieldSeries[];
  unit?: string;
}
export function FieldLineChart({ months, series, unit = '%' }: FieldLineChartProps) {
  const W = 336;
  const H = 188;
  const padL = 30;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const iW = W - padL - padR;
  const iH = H - padT - padB;
  const n = months.length;

  const all = series.flatMap((s) =>
    s.values.filter((v): v is number => v !== null && Number.isFinite(v))
  );
  const B = bounds(all.length ? all : [0, 100], 0.12, 5);
  const X = (i: number) =>
    padL + (n === 1 ? iW / 2 : (iW * i) / (n - 1));
  const Y = (v: number) => padT + iH * (1 - (v - B.min) / (B.max - B.min));
  const yT = ticks(B.min, B.max, 4);

  /**
   * 欠測 (null) の月は「点を打たずにスキップ」し、線は切らない。
   * 存在する月同士を直接つないで連続した 1 本の線として描く
   * （データのある月だけで繋ぐので、グラフが途中で途切れることはない）。
   */
  const renderPath = (values: Array<number | null>): string => {
    let d = '';
    let started = false;
    values.forEach((v, i) => {
      if (v === null || !Number.isFinite(v)) {
        // 欠測月はスキップ（started は維持）。次の有効な月まで線が伸びる。
        return;
      }
      d += `${started ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v as number).toFixed(1)} `;
      started = true;
    });
    return d.trim();
  };

  return (
    <svg
      className="gt-chart"
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="分野別の推移グラフ"
    >
      {yT.map((t, i) => (
        <g key={`g${i}`}>
          <line
            x1={padL}
            y1={Y(t)}
            x2={padL + iW}
            y2={Y(t)}
            stroke="var(--c-divider)"
            strokeWidth="1"
            opacity="0.7"
          />
          <text x={padL - 6} y={Y(t) + 3} textAnchor="end" className="gt-axis">
            {t}
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <text
          key={`x${i}`}
          x={X(i)}
          y={H - 8}
          textAnchor="middle"
          className="gt-axis"
        >
          {monthShort(m)}
        </text>
      ))}

      {series.length === 0 && (
        <text
          x={W / 2}
          y={H / 2}
          textAnchor="middle"
          className="gt-axis"
          style={{ fontSize: 11 }}
        >
          分野を選択してください
        </text>
      )}

      {series.map((s) => {
        const d = renderPath(s.values);
        return (
          <g key={s.name}>
            {d && (
              <path
                d={d}
                fill="none"
                stroke={s.color}
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {s.values.map((v, i) =>
              v === null || !Number.isFinite(v) ? null : (
                <circle
                  key={i}
                  cx={X(i)}
                  cy={Y(v as number)}
                  r="2.4"
                  fill="#fff"
                  stroke={s.color}
                  strokeWidth="1.6"
                />
              )
            )}
          </g>
        );
      })}
      {/* unit を unused にしないため tooltip 用に保持 */}
      <title>{`分野別の推移 (${unit})`}</title>
    </svg>
  );
}
