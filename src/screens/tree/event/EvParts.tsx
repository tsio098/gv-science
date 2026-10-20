/**
 * 季節イベントの画面の部品（ボード E02〜E05・Tickets）。ドットの角（ev-px / ev-px2）・走査線・クロームの文字は tree-event.css。
 */
import type { CSSProperties } from 'react';
import { PxCalendar } from '../trophy/EventToast';
import { evMd } from './evTheme';

const SPARK = 'M2 0h1v2h2v1H3v2H2V3H0V2h2z';

/** ドットの星（静止）*/
export function PxStar({ size = 7, fill = '#C9A2FF', style }: { size?: number; fill?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 5 5" width={size} height={size} aria-hidden="true" style={{ display: 'block', flex: 'none', ...style }}>
      <path d={SPARK} fill={fill} />
    </svg>
  );
}

/** ドットの ◀（戻る）と ×（閉じる）*/
export function PxBackIcon({ fill = 'currentColor' }: { fill?: string }) {
  return (
    <svg viewBox="0 0 8 8" width="14" height="14" shapeRendering="crispEdges" aria-hidden="true">
      <path d="M5 1h1v1H5v1H4v2h1v1h1v1H5V6H4V5H3V3h1V2h1z" fill={fill} />
    </svg>
  );
}

/** ドットの鍵 */
export function PxLock({ size = 16, fill = '#CDB4E8', style }: { size?: number; fill?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none', ...style }}>
      <path d="M2 3V2h1V1h2v1h1v1h1v5H1V3zM3 3h2V2H3zM3 5v2h2V5z" fill={fill} fillRule="evenodd" />
    </svg>
  );
}

/**
 * 「10/31 のみ使用可能」の札（2026-10-20 22:08 先生の表記・22:11「浮いている」→ 装飾）。
 * 外枠 2px 橙 → 紫・角丸 7px・中は紫の地・ドットのカレンダー ＋ クロームの日付 ＋ 文字・左右にドットの星
 */
export function EvDayTag({ from, compact = false }: { from: number; compact?: boolean }) {
  return (
    <span className="ev-daytag" role="note" aria-label={`${evMd(from)} のみ使用可能`}>
      {!compact && <PxStar fill="#C9A2FF" />}
      <span className="ev-daytag-frame">
        <span className="ev-daytag-in">
          <PxCalendar size={12} />
          <span className="ev-arc ev-chrome ev-daytag-date">{evMd(from)}</span>
          <span className="ev-dot ev-daytag-txt">のみ使用可能</span>
        </span>
      </span>
      {!compact && <PxStar fill="#FF9A1F" />}
    </span>
  );
}

/**
 * 70 題の状態（10 列）。定着 = 主色（上 25% は明るい色）+ 側面 2px／正解済み = 下半分だけ主色／要復習 = #FFB38A の 2px の枠だけ（中は空）／未着手 = 文字色 10%。
 * 要復習は色でなく形（中空）で見分ける（ハロウィンの橙と近いため）
 */
export function EvCells({ cells, label }: { cells: number[]; label: string }) {
  // マスの大きさは CSS（--ev-cell: 20px・幅 389px 以下は 18px）
  return (
    <div className="ev-cells" role="img" aria-label={label}>
      {cells.map((c, i) => (
        <span key={i} className={`ev-cell s${c}`} />
      ))}
    </div>
  );
}

/** 凡例の 1 行 */
export function EvLegend({ state, label, n }: { state: 0 | 1 | 2 | 3; label: string; n: number }) {
  return (
    <div className="ev-legend">
      <span className={`ev-cell s${state}`} style={{ width: 12, height: 12 }} />
      <span className="ev-dot" style={{ fontSize: 12 }}>{label}</span>
      <span className="ev-arc" style={{ fontSize: 8, marginLeft: 'auto' }}>{n}</span>
    </div>
  );
}
