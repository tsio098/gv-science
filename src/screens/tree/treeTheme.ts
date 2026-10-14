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

/**
 * キャンバスの寸法（モック v26・2026-10-14 変更）。manifest の pos.x（55〜335）・layer は変えず、ここで倍率を掛ける。
 *   スマホ: 層間 140px・列 300 + (x − 195) × 1.6・600 × 1,300px（画面より縦横に大きい。ドラッグで移動）
 *   iPad 横（幅 900px 以上）: 層間 130px・列 x × 1.7・680 × 1,200px
 */
export interface TreeGeom {
  w: number;
  h: number;
  x: (posX: number) => number;
  y: (layer: number) => number;
  labelW: number;
  labelDy: number;
  /** 分野名ラベルの色（解放済み / 未解放 / 準備中）*/
  labelColor: { open: string; locked: string; empty: string };
}

export const PHONE_GEOM: TreeGeom = {
  w: 600,
  h: 1300,
  x: (p) => Math.round(300 + (p - 195) * 1.6),
  y: (l) => 150 + 140 * l,
  labelW: 84,
  labelDy: 50,
  labelColor: { open: 'rgba(249,247,242,0.62)', locked: 'rgba(249,247,242,0.38)', empty: 'rgba(249,247,242,0.28)' },
};

export const IPAD_GEOM: TreeGeom = {
  w: 680,
  h: 1200,
  x: (p) => Math.round(p * 1.7),
  y: (l) => 150 + 130 * l,
  labelW: 96,
  labelDy: 48,
  labelColor: { open: 'rgba(249,247,242,0.72)', locked: 'rgba(249,247,242,0.35)', empty: 'rgba(249,247,242,0.28)' },
};

/** iPad レイアウトに切り替える幅（設計書 §8 の min-width: 900px）*/
export const IPAD_MIN_W = 900;

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
