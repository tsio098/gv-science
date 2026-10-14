/**
 * ANCHOR TREE の色・寸法（デザインブリーフ v2 / モック Main.dc.html）。
 */
import type { Dist, FieldGroup, QType } from '../../lib/treeApi';

/** 系統色（面）*/
export const GROUP_COLOR: Record<FieldGroup, string> = {
  theory: '#9CC297',
  inorganic: '#6FB2C0',
  organic: '#E3B04B',
  polymer: '#B08BC9',
};
/** 系統色（立方体の側面）*/
export const GROUP_SIDE: Record<FieldGroup, string> = {
  theory: '#5E7F5A',
  inorganic: '#3F6E79',
  organic: '#8C6A26',
  polymer: '#6B507C',
};
export const GROUP_NAME: Record<FieldGroup, string> = {
  theory: '理論化学',
  inorganic: '無機化学',
  organic: '有機化学',
  polymer: '高分子',
};
export const QTYPE_ICON: Record<QType, string> = { tf: 'i-tf', calc: 'i-calc', reason: 'i-reason' };

export const groupColor = (g: string) => GROUP_COLOR[g as FieldGroup] ?? GROUP_COLOR.theory;
export const groupSide = (g: string) => GROUP_SIDE[g as FieldGroup] ?? GROUP_SIDE.theory;

/** マスター度がこれ以上でマスター表示（★・クリーム枠・発光）*/
export const MASTER_AT = 0.8;

/** キャンバス（モックの 390px 幅の座標系）*/
export const CANVAS_W = 390;
export const LAYER_TOP = 104;
export const LAYER_GAP = 86;
export const layerY = (layer: number) => LAYER_TOP + LAYER_GAP * layer;

/** 出題状況バーの幅（%）: 定着・正解済み・要復習（残りは未着手）*/
export function distPct(d: Dist, total: number) {
  const t = total || 1;
  return {
    mastered: (d.mastered / t) * 100,
    solved: (d.solved / t) * 100,
    review: (d.review / t) * 100,
  };
}

export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const fmtScore = (n: number) => Math.round(n).toLocaleString('ja-JP');
