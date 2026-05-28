/**
 * モックデータ。GAS API が未実装の段階で UI を駆動するためのものです。
 * 値は `design/data.jsx` をそのまま転記してあります。
 */
import type {
  Article,
  NextClass,
  Problem,
  Schedule,
  Subject,
  User,
} from '../lib/types';

export const SCHEDULES: Record<Exclude<Subject, 'earth'>, Schedule[]> = {
  chemistry: [
    {
      id: 'SCH001',
      subject: 'chemistry',
      date: '2026/04/11',
      dow: '土',
      title: '物質の構成',
      desc: '混合物と純物質、化合物と単体、同素体について整理し、身近な物質を例に分類の感覚をつかむ。',
      material: true,
      video: false,
      isNew: false,
    },
    {
      id: 'SCH002',
      subject: 'chemistry',
      date: '2026/04/18',
      dow: '土',
      title: '原子の構造',
      desc: '原子核と電子殻、電子配置の規則。周期表上の位置と化学的性質の関連を理解する。',
      material: true,
      video: true,
      isNew: false,
    },
    {
      id: 'SCH003',
      subject: 'chemistry',
      date: '2026/04/25',
      dow: '土',
      title: '化学結合',
      desc: 'イオン結合・共有結合・金属結合の違いを、結晶のモデルと共に整理する。',
      material: true,
      video: false,
      isNew: true,
    },
    {
      id: 'SCH004',
      subject: 'chemistry',
      date: '2026/05/09',
      dow: '土',
      title: 'モルの計算',
      desc: 'アボガドロ定数と物質量。質量・体積・粒子数の相互変換に慣れる。',
      material: true,
      video: true,
      isNew: true,
    },
    {
      id: 'SCH005',
      subject: 'chemistry',
      date: '2026/05/16',
      dow: '土',
      title: '化学反応式',
      desc: '反応式の書き方と量的関係。係数合わせの手順を体系化する。',
      material: false,
      video: false,
      isNew: false,
    },
    {
      id: 'SCH006',
      subject: 'chemistry',
      date: '2026/05/23',
      dow: '土',
      title: '酸と塩基',
      desc: '中和反応、pH、滴定。指示薬の選び方まで踏み込む。',
      material: true,
      video: false,
      isNew: false,
    },
  ],
  biology: [
    {
      id: 'SCH101',
      subject: 'biology',
      date: '2026/04/12',
      dow: '日',
      title: '細胞の構造',
      desc: '原核細胞と真核細胞、細胞小器官のはたらきを整理する。',
      material: true,
      video: false,
      isNew: false,
    },
    {
      id: 'SCH102',
      subject: 'biology',
      date: '2026/04/19',
      dow: '日',
      title: '酵素のはたらき',
      desc: '酵素の基質特異性、最適温度・最適pH。実験データの読み方を学ぶ。',
      material: true,
      video: true,
      isNew: false,
    },
    {
      id: 'SCH103',
      subject: 'biology',
      date: '2026/04/26',
      dow: '日',
      title: '光合成と呼吸',
      desc: 'エネルギー代謝の全体像。明反応・暗反応の整理。',
      material: true,
      video: false,
      isNew: true,
    },
    {
      id: 'SCH104',
      subject: 'biology',
      date: '2026/05/10',
      dow: '日',
      title: '遺伝情報',
      desc: 'DNAの構造、複製、転写・翻訳。',
      material: false,
      video: false,
      isNew: true,
    },
    {
      id: 'SCH105',
      subject: 'biology',
      date: '2026/05/17',
      dow: '日',
      title: '生態系',
      desc: '物質循環とエネルギー流。食物網と生産性。',
      material: true,
      video: false,
      isNew: false,
    },
  ],
};

export const PROBLEMS: Record<Subject, Problem[]> = {
  chemistry: [
    {
      id: 'PRB001',
      subject: 'chemistry',
      no: 1,
      title: '電子配置と価電子',
      desc: '原子番号17の塩素について、電子配置を答えよ。',
      answer: 'K 殻に 2、L 殻に 8、M 殻に 7 個。価電子の数は 7。',
      explanation:
        '塩素の電子配置は (2, 8, 7) と表現される。最外殻電子(M 殻)が 7 個あるため、価電子は 7。あと 1 個で閉殻になることから、塩素は陰イオン(Cl⁻)になりやすい。',
      isNew: false,
    },
    {
      id: 'PRB002',
      subject: 'chemistry',
      no: 2,
      title: 'イオン化エネルギー',
      desc: 'NaとMgのうち、第一イオン化エネルギーが大きいのはどちらか。',
      answer: 'Mg。',
      explanation:
        'Mg は最外殻に 2 個の電子をもち、電子配置は閉殻に近い (Ne) 配置から 2 つ電子を持っている形。電子をひとつ取り去るためのエネルギーは Na より大きい。',
      isNew: false,
    },
    {
      id: 'PRB003',
      subject: 'chemistry',
      no: 3,
      title: 'モル質量の計算',
      desc: '水(H₂O)11.2gは何molか。',
      answer: '0.622 mol（≒ 0.62 mol）。',
      explanation:
        'H₂O のモル質量は 18 g/mol。11.2 / 18 = 0.6222... mol となる。',
      isNew: true,
    },
    {
      id: 'PRB004',
      subject: 'chemistry',
      no: 4,
      title: '化学反応式の係数',
      desc: 'C₃H₈ の完全燃焼を化学反応式で表せ。',
      answer: 'C₃H₈ + 5O₂ → 3CO₂ + 4H₂O',
      explanation:
        '炭素 3 → CO₂ は 3、水素 8 → H₂O は 4。酸素は右辺で 6+4 = 10 個、左辺は 2×5 = 10 個でつり合う。',
      isNew: true,
    },
    {
      id: 'PRB005',
      subject: 'chemistry',
      no: 5,
      title: '中和滴定',
      desc: '0.10 mol/L 塩酸20.0mL を、0.10 mol/L NaOH 水溶液で中和するのに必要な体積は。',
      answer: '20.0 mL。',
      explanation:
        'HCl + NaOH → NaCl + H₂O より 1:1 で反応する。同濃度なので必要な体積は等しく 20.0 mL。',
      isNew: false,
    },
  ],
  biology: [
    {
      id: 'PRB101',
      subject: 'biology',
      no: 1,
      title: '細胞小器官のはたらき',
      desc: 'ミトコンドリアと葉緑体の機能の違いを述べよ。',
      answer:
        'ミトコンドリアは呼吸（ATP 合成）の場、葉緑体は光合成（光エネルギー → 有機物）の場。',
      explanation:
        'どちらも二重膜構造で、独自の DNA をもつ点が共通する。エネルギー変換の方向が逆である点に注意。',
      isNew: false,
    },
    {
      id: 'PRB102',
      subject: 'biology',
      no: 2,
      title: '酵素のグラフ',
      desc: '酵素濃度を一定にして基質濃度を上げたときの反応速度のグラフは。',
      answer: '基質濃度を上げると反応速度は上昇するが、やがて一定値（Vmax）に近づく曲線になる。',
      explanation:
        '基質濃度が低いうちは反応速度は基質濃度に比例し、酵素がすべて基質と結合する濃度を超えると速度は頭打ちになる（飽和）。',
      isNew: true,
    },
    {
      id: 'PRB103',
      subject: 'biology',
      no: 3,
      title: 'DNA の複製',
      desc: '半保存的複製を示した実験を簡潔に説明せよ。',
      answer:
        'メセルソンとスタールの実験。¹⁵N で標識した DNA を ¹⁴N 培地に移し、世代ごとの DNA 密度を測定して半保存的複製を実証した。',
      explanation:
        '1 回目の複製で中間密度、2 回目で軽密度と中間密度が 1:1 になることが半保存的複製と一致する。',
      isNew: false,
    },
  ],
  earth: [
    {
      id: 'PRB201',
      subject: 'earth',
      no: 1,
      title: '地球の内部構造',
      desc: '地殻・マントル・核について、構成物質と物性を整理せよ。',
      answer:
        '地殻：岩石（花こう岩〜玄武岩質）。マントル：かんらん岩質、流動性あり。核：鉄ニッケル合金、外核は液体、内核は固体。',
      explanation:
        '地震波の速度変化から、各層の境界面（モホロビチッチ面、グーテンベルク面、レーマン面）が推定された。',
      isNew: false,
    },
    {
      id: 'PRB202',
      subject: 'earth',
      no: 2,
      title: 'プレートテクトニクス',
      desc: '海洋プレートと大陸プレートの境界での運動を3種類挙げよ。',
      answer: '発散境界（中央海嶺）、収束境界（海溝）、すれ違い境界（トランスフォーム断層）。',
      explanation:
        '発散境界では新しいプレートが生成、収束境界では一方が沈み込む、すれ違い境界では水平にずれる運動が起こる。',
      isNew: true,
    },
  ],
};

export const ARTICLES: Article[] = [
  {
    id: 'ART001',
    tag: 'CHEMISTRY',
    title: '日常に潜む化学反応：パンが膨らむ仕組み',
    summary:
      'イーストの発酵で生じる二酸化炭素。気体の溶解度から見直すと、料理が化学実験に変わる。',
    date: '2026/05/22',
    url: 'https://example.com/articles/01',
    thumb: 1,
  },
  {
    id: 'ART002',
    tag: 'BIOLOGY',
    title: '腸内細菌の多様性が決めるもの',
    summary: '近年の研究は、腸内フローラと免疫・感情の意外な関係を示している。',
    date: '2026/05/15',
    url: 'https://example.com/articles/02',
    thumb: 2,
  },
  {
    id: 'ART003',
    tag: 'EARTH',
    title: 'なぜ富士山はあの形になったのか',
    summary: '成層火山の構造と、噴出物の粘性。地形を読むと地球の動きが見える。',
    date: '2026/05/08',
    url: 'https://example.com/articles/03',
    thumb: 3,
  },
  {
    id: 'ART004',
    tag: 'PHYSICS',
    title: 'スマホの中の量子力学',
    summary: '半導体やフラッシュメモリの背後で働く、トンネル効果の話。',
    date: '2026/05/01',
    url: 'https://example.com/articles/04',
    thumb: 4,
  },
];

export const SHARES: Article[] = [
  {
    id: 'SHR001',
    tag: 'LINE',
    title: '体験授業のお知らせ',
    summary: '5月28日(木) 19:00 から、化学の体験授業を行います。',
    date: '2026/05/26',
    url: 'https://example.com/share/01',
    thumb: 1,
  },
  {
    id: 'SHR002',
    tag: 'WEB',
    title: '公式サイト',
    summary: 'Great Voyage の最新情報、講師紹介、入会案内。',
    date: '—',
    url: 'https://example.com/share/02',
    thumb: 3,
  },
  {
    id: 'SHR003',
    tag: 'YOUTUBE',
    title: '無料解説動画',
    summary: '基礎問題の解説動画を毎週公開しています。',
    date: '2026/05/20',
    url: 'https://example.com/share/03',
    thumb: 2,
  },
];

/** "Next class" のデモ。SCH003（化学結合）を採用 */
const _next: Schedule = SCHEDULES.chemistry[2]!;
export const NEXT_CLASS: NextClass = {
  id: _next.id,
  subject: _next.subject,
  title: _next.title,
  date: _next.date,
  dow: _next.dow,
  daysLeft: 3,
  startAt: '13:00',
  material: _next.material,
  series: '化学 · 第 3 回',
};

export const USER: User = { name: '太郎', grade: '高2' };
