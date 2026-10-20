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
  // 化学基礎も同じ 5 色を使い回す（2026-10-16）
  composition: '#2DF4C6',
  bonding: '#4FC3FF',
  mole: '#FF7AB8',
  acidbase: '#FFD84A',
  redox: '#D08BFF',
  // 生物基礎も同じ 5 色を使い回す（2026-10-16）
  feature: '#2DF4C6',
  genefunc: '#4FC3FF',
  body: '#FF7AB8',
  vegetation: '#FFD84A',
  ecosystem: '#D08BFF',
  // 生物のツリーに合流した「生態系（基礎）」は生態と同じ黄色（2026-10-19 先生の指示。生物基礎だけのツリーは紫のまま）
  kecosystem: '#FFD84A',
  // 地学基礎も同じ 5 色を使い回す（2026-10-16）
  solid: '#2DF4C6',
  history: '#4FC3FF',
  atmos: '#FF7AB8',
  space: '#FFD84A',
  coexist: '#D08BFF',
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
  composition: '#0F8F77',
  bonding: '#1C6FA3',
  mole: '#A8336E',
  acidbase: '#A88A14',
  redox: '#7A47B0',
  feature: '#0F8F77',
  genefunc: '#1C6FA3',
  body: '#A8336E',
  vegetation: '#A88A14',
  ecosystem: '#7A47B0',
  kecosystem: '#A88A14',
  solid: '#0F8F77',
  history: '#1C6FA3',
  atmos: '#A8336E',
  space: '#A88A14',
  coexist: '#7A47B0',
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
  composition: '物質の構成',
  bonding: '化学結合',
  mole: '物質量と濃度',
  acidbase: '酸と塩基',
  redox: '酸化還元',
  feature: '生物の特徴',
  genefunc: '遺伝子とその働き',
  body: 'ヒトのからだの調節',
  vegetation: '植生と遷移',
  ecosystem: '生態系とその保全',
  kecosystem: '生態系とその保全',
  solid: '固体地球',
  history: '地球の歴史',
  atmos: '大気と海洋',
  space: '宇宙',
  coexist: '自然との共生',
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
/**
 * レトロ寄りの見た目（2026-10-20 先生決定・季節イベントのボード R01〜R05・アリーナ A01r〜A15r）。
 * CSS は src/styles/tree-retro.css の `.tr-root.is-retro …` だけ。LINE 内ブラウザで重いなどで戻すときはここを false に
 */
export const RETRO = true;
/** 画面の外枠の class（ABYSS は .is-abyss で CSS 変数を深海に・レトロ寄りの見た目は .is-retro）*/
export const rootClass = (extra = '') => `tr-root${RETRO ? ' is-retro' : ''}${T.name === 'ABYSS' ? ' is-abyss' : ''}${extra ? ' ' + extra : ''}`;

/** 役割色（ROUTE / ABYSS 共通）*/
export const NEW_COLOR = '#FF7A45';
export const NEW_FG = '#140A05';
export const REVIEW_COLOR = '#FFB38A';
/** 「あとで復習」のチェック（間違いのオレンジと見分ける・2026-10-19）。tree.css の --tr-check と同じ */
export const CHECK_COLOR = '#B9A6FF';

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

/**
 * 出題状況の 20 マス（レトロ寄りの見た目・ボード R02 / R03）: 定着 → 正解済み → 要復習 → 未着手 の順に、問題数を 20 マスに換算（最大剰余）。
 * 問題が 1 問以上ある状態は 0 マスにしない（要復習 1 問が見えなくならないように）
 */
export type PipKind = 'mastered' | 'solved' | 'review' | 'fresh';
export function pips20(d: Dist, total: number, n = 20): PipKind[] {
  const keys: PipKind[] = ['mastered', 'solved', 'review', 'fresh'];
  const fresh = Math.max(0, total - d.mastered - d.solved - d.review);
  const raw = { mastered: d.mastered, solved: d.solved, review: d.review, fresh };
  if (!total) return Array.from({ length: n }, () => 'fresh' as const);
  const cnt = Object.fromEntries(keys.map((k) => [k, raw[k] > 0 ? Math.max(1, Math.floor((raw[k] / total) * n)) : 0])) as Record<PipKind, number>;
  let sum = keys.reduce((a, k) => a + cnt[k], 0);
  const rem = (k: PipKind) => (raw[k] / total) * n - cnt[k];
  while (sum < n) {
    const k = [...keys].sort((a, b) => rem(b) - rem(a))[0]!;
    cnt[k]++;
    sum++;
  }
  while (sum > n) {
    const k = [...keys].filter((x) => cnt[x] > 1).sort((a, b) => rem(a) - rem(b))[0]!;
    cnt[k]--;
    sum--;
  }
  return keys.flatMap((k) => Array.from({ length: cnt[k] }, () => k));
}

export const fmtTime = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export const fmtScore = (n: number) => Math.round(n).toLocaleString('ja-JP');

/* チャンピオンアリーナ（設計書 §5.7）*/
/** アリーナの金（ランキングの 1 位と同じ。他の色は tree.css の .tr-root.is-arena）*/
export const ARENA_GOLD = '#FFD84A';
/** ロゴ素材（public/tree/brand/・元は 大学リサーチ+app/ANCHOR_TREE_logo/svg。発光は SVG フィルタで静止）*/
export const BRAND = '/tree/brand/';
/** ドット王冠（大 = 34〜40px・小 = 16〜20px は mono）とアリーナのドット文字 */
export const CROWN = BRAND + 'icon_crown.svg';
export const CROWN_MONO = BRAND + 'icon_crown_mono.svg';
export const ARENA_LOGO = BRAND + 'arena_logo-1line.svg';

/** 残り時間の表示（「あと 9 日」「あと 5 時間」）*/
export function arenaLeft(end: number, now = Date.now()) {
  const ms = Math.max(0, end - now);
  const h = Math.floor(ms / 3600_000);
  return h >= 24 ? `あと ${Math.floor(h / 24)} 日` : h >= 1 ? `あと ${h} 時間` : `あと ${Math.max(1, Math.ceil(ms / 60_000))} 分`;
}

/** シーズンの呼び名（起点より前は「プレシーズン」）*/
export const arenaSeasonName = (n: number) => (n >= 1 ? `シーズン ${n}` : 'プレシーズン');


const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];
/** シーズンの期間（JST）「10/19（月）〜 11/1（日）」。end は次のシーズンの開始なので 1 ms 戻す */
export function arenaPeriod(s: { start: number; end: number }, short = false) {
  const f = (ms: number) => {
    const d = new Date(ms + 9 * 3600_000);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}${short ? '' : `（${WEEKDAY[d.getUTCDay()]}）`}`;
  };
  return short ? `${f(s.start)}〜${f(s.end - 1)}` : `${f(s.start)} 〜 ${f(s.end - 1)}`;
}
