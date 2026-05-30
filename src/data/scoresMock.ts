/**
 * 成績推移 API のモックデータ。
 * GAS が未設定 / 通信失敗時に fetchScores が返すフォールバック。
 *
 * - 5 科目分の分野定義をユーザー指定の正式表記で保持
 * - 化学・生物の合計点はデザインブリーフ §6 の実例値を採用
 * - 分野別月次は seeded PRNG で安定生成（再読込しても同じ値）
 */
import type {
  ScoresResponse,
  ScoresPerSubject,
  ScoresSubject,
  ScoreTestPoint,
} from '../lib/types';

/* ── 観測月（演習の月次平均） ─────────────────────────── */
const MONTHS = ['2026-02', '2026-03', '2026-04', '2026-05'];

/* ── 分野定義（科目ごと） ────────────────────────────── */
export const SCORES_FIELDS: Record<ScoresSubject, string[]> = {
  chemistry: [
    '物質', '原子の構造', '化学結合と結晶', '物質量と濃度', '酸塩基と中和',
    '酸化還元反応', '電池と電気分解', '物質の三態', '気体の性質', '溶液の性質',
    '熱化学', '反応速度', '化学平衡', '非金属', '典型金属', '遷移金属',
    '脂肪族化合物', '芳香族化合物', '天然高分子', '合成高分子',
  ],
  biology: [
    '生物の進化', '系統と分類', '細胞と分子', '代謝', '遺伝情報の発現',
    '発生', '遺伝子技術', '動物の環境応答', '植物の環境応答', '生態系',
  ],
  'chemistry-basic': [
    '物質の構成', '原子の構造と周期表', '化学結合と結晶の性質',
    '物質量', '濃度', '酸・塩基と中和', '酸化と還元', '電池・電気分解',
  ],
  'biology-basic': [
    '生物の特徴', '遺伝子の働き', 'ヒトの体内環境', '遷移', '植生と生態系',
  ],
  'earth-basic': [
    '地球の構造', '地震', '地層と岩石', '大気と海洋', '宇宙と太陽',
    '日本の季節と災害',
  ],
};

/* ── 合計点推移（実例ベース） ────────────────────────── */
const TOTAL_TREND_FIXTURE: Partial<Record<ScoresSubject, ScoreTestPoint[]>> = {
  chemistry: [
    { date: '2026/04/06', test: '駿台青パック',   total: 84, avg: 51.3, hensachi: 67.9 },
    { date: '2026/04/10', test: 'Z会 第2回',      total: 48, avg: 49.5, hensachi: 47.9 },
    { date: '2026/04/17', test: 'Z会 第3回',      total: 74, avg: 52.7, hensachi: 67.0 },
    { date: '2026/04/24', test: 'Z会 第4回',      total: 80, avg: 60.3, hensachi: 62.5 },
    { date: '2026/05/01', test: '河合 第3回',     total: 76, avg: 59.6, hensachi: 57.1 },
    { date: '2026/05/08', test: '東進センター',   total: 77, avg: 60.3, hensachi: 54.9 },
    { date: '2026/05/22', test: '駿台 第2回',     total: 87, avg: 64.9, hensachi: 63.3 },
    { date: '2026/05/29', test: '駿台 第3回',     total: 67, avg: 66.6, hensachi: 50.3 },
  ],
  biology: [
    { date: '2026/04/12', test: '進研模試',       total: 62, avg: 55.1, hensachi: 58.0 },
    { date: '2026/04/19', test: 'Z会 第2回',      total: 70, avg: 58.3, hensachi: 61.2 },
    { date: '2026/05/03', test: '河合 第2回',     total: 58, avg: 54.0, hensachi: 52.5 },
    { date: '2026/05/10', test: '駿台 第2回',     total: 75, avg: 60.1, hensachi: 63.8 },
    { date: '2026/05/17', test: '東進センター',   total: 80, avg: 63.4, hensachi: 66.0 },
    { date: '2026/05/24', test: '進研模試 2',     total: 72, avg: 61.0, hensachi: 60.3 },
  ],
  'chemistry-basic': [
    { date: '2026/04/13', test: '校内テスト',     total: 88, avg: 70.2, hensachi: 66.5 },
    { date: '2026/04/27', test: '共通形式 1',     total: 79, avg: 68.0, hensachi: 60.1 },
    { date: '2026/05/11', test: '共通形式 2',     total: 91, avg: 72.5, hensachi: 68.9 },
    { date: '2026/05/25', test: '共通形式 3',     total: 85, avg: 71.0, hensachi: 64.2 },
  ],
  'biology-basic': [
    { date: '2026/04/14', test: '校内テスト',     total: 82, avg: 68.0, hensachi: 62.0 },
    { date: '2026/04/28', test: '共通形式 1',     total: 76, avg: 67.0, hensachi: 58.4 },
    { date: '2026/05/12', test: '共通形式 2',     total: 88, avg: 70.8, hensachi: 66.0 },
    { date: '2026/05/26', test: '共通形式 3',     total: 84, avg: 69.6, hensachi: 63.1 },
  ],
  'earth-basic': [
    { date: '2026/04/15', test: '校内テスト',     total: 71, avg: 64.0, hensachi: 56.0 },
    { date: '2026/04/29', test: '共通形式 1',     total: 78, avg: 66.0, hensachi: 60.4 },
    { date: '2026/05/13', test: '共通形式 2',     total: 82, avg: 67.5, hensachi: 62.6 },
    { date: '2026/05/27', test: '共通形式 3',     total: 77, avg: 65.0, hensachi: 59.1 },
  ],
};

/* ── seeded PRNG (mulberry32) ───────────────────────────── */
function mul32(seed: number): () => number {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
const r1 = (v: number) => Math.round(v * 10) / 10;

/* ── 分野別 月次平均を生成 ──────────────────────────── */
function genMonthly(subject: ScoresSubject, seed: number) {
  const fields = SCORES_FIELDS[subject];
  const rnd = mul32(seed);
  const rate: Record<string, Array<number | null>> = {};
  const avgRate: Record<string, Array<number | null>> = {};
  const hensachi: Record<string, Array<number | null>> = {};
  fields.forEach((f) => {
    const base = 44 + rnd() * 42;
    const slope = (rnd() - 0.42) * 7;
    const rArr: number[] = [];
    const aArr: number[] = [];
    const hArr: number[] = [];
    MONTHS.forEach((_, m) => {
      const noise = (rnd() - 0.5) * 9;
      const r = clamp(base + slope * m + noise, 18, 99);
      const a = clamp(r - (14 + rnd() * 12), 12, 92);
      const h = clamp(50 + (r - a) * 0.62 + (rnd() - 0.5) * 3, 32, 78);
      rArr.push(r1(r));
      aArr.push(r1(a));
      hArr.push(r1(h));
    });
    rate[f] = rArr;
    avgRate[f] = aArr;
    hensachi[f] = hArr;
  });
  return { rate, avgRate, hensachi };
}

const SEEDS: Record<ScoresSubject, number> = {
  chemistry: 1287,
  biology: 5521,
  'chemistry-basic': 9043,
  'biology-basic': 3142,
  'earth-basic': 7700,
};

function buildSubject(subject: ScoresSubject): ScoresPerSubject {
  const monthly = genMonthly(subject, SEEDS[subject]);
  return {
    fields: SCORES_FIELDS[subject],
    totalTrend: TOTAL_TREND_FIXTURE[subject] ?? [],
    months: MONTHS,
    ...monthly,
  };
}

/* ── デモ用：5 科目すべて持つレスポンス ────────────────── */
export const SCORES_MOCK: ScoresResponse = {
  name: '太郎',
  subjects: [
    'chemistry',
    'chemistry-basic',
    'biology',
    'biology-basic',
    'earth-basic',
  ],
  data: {
    chemistry:         buildSubject('chemistry'),
    'chemistry-basic': buildSubject('chemistry-basic'),
    biology:           buildSubject('biology'),
    'biology-basic':   buildSubject('biology-basic'),
    'earth-basic':     buildSubject('earth-basic'),
  },
};

/* ── ユーティリティ ─────────────────────────────────── */
/** "2026-04" → "4月" */
export function monthShort(ym: string): string {
  const m = ym.split('-')[1];
  return `${parseInt(m, 10)}月`;
}
/** "2026/04/06" → "4/6" */
export function dateShort(d: string): string {
  const [, m, day] = d.split('/');
  return `${parseInt(m, 10)}/${parseInt(day, 10)}`;
}
