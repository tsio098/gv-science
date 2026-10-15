/**
 * ANCHOR TREE の色・寸法（ブリーフ §2.1 v31 ネオン / モック NeonPalette.dc.html・Main.dc.html）。
 * 色は「消灯 → 点灯 → 全面発光」のネオン管。発光は box-shadow だけ（アニメーションは足さない）。
 */
import type { Dist, FieldGroup, QType } from '../../lib/treeApi';

/** 系統色（面・枠・枝線）。ROUTE / ABYSS で共通 */
export const GROUP_COLOR: Record<FieldGroup, string> = {
  basic: '#2DF4C6',
  applied: '#4FC3FF',
  inorganic: '#FF7AB8',
  organic: '#FFD84A',
  polymer: '#D08BFF',
  // 生物は化学の 5 色を使い回す（2026-10-15 先生決定）
  matter: '#2DF4C6',
  gene: '#4FC3FF',
  response: '#FF7AB8',
  ecology: '#FFD84A',
  evolution: '#D08BFF',
};
/** 系統色（立方体の側面 5px）*/
export const GROUP_SIDE: Record<FieldGroup, string> = {
  basic: '#0F8F77',
  applied: '#1C6FA3',
  inorganic: '#A8336E',
  organic: '#A88A14',
  polymer: '#7A47B0',
  matter: '#0F8F77',
  gene: '#1C6FA3',
  response: '#A8336E',
  ecology: '#A88A14',
  evolution: '#7A47B0',
};
export const GROUP_NAME: Record<FieldGroup, string> = {
  basic: '理論 · 化学基礎範囲',
  applied: '理論 · 化学応用範囲',
  inorganic: '無機化学',
  organic: '有機化学',
  polymer: '高分子化合物',
  matter: '生命現象と物質',
  gene: '遺伝情報と発生',
  response: '環境応答',
  ecology: '生態',
  evolution: '進化と系統',
};
export const QTYPE_ICON: Record<QType, string> = { tf: 'i-tf', calc: 'i-calc', reason: 'i-reason' };

export const groupColor = (g: string) => GROUP_COLOR[g as FieldGroup] ?? GROUP_COLOR.basic;
export const groupSide = (g: string) => GROUP_SIDE[g as FieldGroup] ?? GROUP_SIDE.basic;

/** 8 桁 hex の透明度（0〜1）を付ける: alpha('#2DF4C6', 0.4) → '#2DF4C666' */
export const alpha = (hex: string, a: number) =>
  hex + Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, '0').toUpperCase();

/**
 * ステージの色（ROUTE = 浅い海 / ABYSS = 深海）。CSS 側は tree.css の .tr-root / .tr-root.is-abyss と同じ値。
 * インラインの style で使う分だけここに置く（hex なので alpha() を掛けられる）。
 */
export interface StageTheme {
  name: 'ROUTE' | 'ABYSS';
  /** 文字（白に近い）*/
  text: string;
  sub: string;
  /** ステージ色（主 CTA・選択中・正解・▲）*/
  accent: string;
  /** ステージ色・系統色の塗りの上の濃い文字 */
  onColor: string;
  card: string;
  face: string;
  faceLocked: string;
  /** 未解放・未着手の側面 */
  sideDark: string;
}
export const STAGE: Record<'front' | 'back', StageTheme> = {
  front: {
    name: 'ROUTE',
    text: '#EAFBFF',
    sub: '#8ED4E0',
    accent: '#2DF4C6',
    onColor: '#04302B',
    card: '#073E4B',
    face: '#0B4B59',
    faceLocked: '#053640',
    sideDark: '#031E24',
  },
  back: {
    name: 'ABYSS',
    text: '#E8EEFF',
    sub: '#8A9AC8',
    accent: '#00E5FF',
    onColor: '#031B24',
    card: '#0A1328',
    face: '#111E3E',
    faceLocked: '#070E22',
    sideDark: '#01030A',
  },
};
/**
 * いま描くステージの色。各画面は描画のたびに T.xxx を読むので、TreeRoot がステージを切り替えたら
 * setTreeStage() で中身を入れ替えてから描き直す（ABYSS・2026-10-15）
 */
export const T: StageTheme = { ...STAGE.front };
export function setTreeStage(stage: 'front' | 'back') {
  Object.assign(T, STAGE[stage]);
}
/** 画面の外枠の class（ABYSS は .is-abyss で CSS 変数を深海に）*/
export const rootClass = (extra = '') => `tr-root${T.name === 'ABYSS' ? ' is-abyss' : ''}${extra ? ' ' + extra : ''}`;

/** 役割色（ROUTE / ABYSS 共通）*/
export const NEW_COLOR = '#FF7A45';
export const NEW_FG = '#140A05';
export const REVIEW_COLOR = '#FFB38A';

/** マスター度がこれ以上でマスター表示（★・文字色の枠・強い発光）*/
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
  labelColor: { open: alpha(T.text, 0.7), locked: alpha(T.text, 0.4), empty: alpha(T.text, 0.28) },
};

export const IPAD_GEOM: TreeGeom = {
  w: 680,
  h: 1200,
  x: (p) => Math.round(p * 1.7),
  y: (l) => 150 + 130 * l,
  labelW: 96,
  labelDy: 48,
  labelColor: { open: alpha(T.text, 0.72), locked: alpha(T.text, 0.4), empty: alpha(T.text, 0.28) },
};

/** iPad レイアウトに切り替える幅（設計書 §8 の min-width: 900px）*/
export const IPAD_MIN_W = 900;

/** 出題状況バーの幅（%）: 定着・正解済み・要復習（残りは未出題）*/
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
