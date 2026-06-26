/**
 * GV Compass と共通のタグ体系（志望校調査フォームの「タグから選ぶ」用）。
 *  - FIELD_SYSTEMS … 学問分野（9大系統 → 中分類）。「大学でやりたいこと」の興味タグ。
 *  - TARGET_GROUPS … 研究対象（生きもの・素材）。図鑑的な入口。同じく興味タグ。
 *  - EXAM_GROUPS   … 入試条件（区分・配点・科目・形式）。「補足・こだわり条件」の条件タグ。
 * 選んだタグは送信時に want / note へ追記し、エージェントの検索条件に使う。
 *
 * ★同期: 実体は GV Compass の taxonomy。フォーム起動時に loadTagSets() で
 *   `<GV Compass>/data/taxonomy.json` を取得し、GV Compass のタグ更新を即反映する
 *   （GV Compass を再デプロイすれば次回読み込みで反映＝再ビルド不要）。
 *   取得に失敗したら下記の同梱定数にフォールバックする。
 */

export interface TagGroup { name: string; tags: string[] }

/** 学問分野：9大系統 → 中分類（中分類が選択単位） */
export const FIELD_SYSTEMS: TagGroup[] = [
  { name: '人文科学', tags: ['文学・言語学', '歴史・地理', '哲学・思想・宗教', '心理・人間科学', '芸術学・美学', '文化人類・社会学', '考古学'] },
  { name: '社会科学', tags: ['法学', '政治・行政', '経済', '経営・商・会計', '社会・国際関係', '公共政策・地域', '社会福祉・ソーシャルワーク'] },
  { name: '教育', tags: ['教育学・教育心理', '教科教育', '特別支援・養護', '幼児・保育'] },
  { name: '理学', tags: ['数学', '物理学', '化学', '生物学', '地球・惑星・宇宙科学'] },
  { name: '工学', tags: ['機械・航空宇宙', '電気・電子・通信', '材料・物質', '化学工学', '土木・建築・都市', '環境・防災', 'エネルギー'] },
  { name: '情報・データ', tags: ['情報科学・計算機', '人工知能・機械学習', 'データサイエンス'] },
  { name: '農・生命・環境', tags: ['農学・作物・園芸', '生命科学・バイオ', '食品・栄養', '森林・水産', '環境科学', '獣医学'] },
  { name: '医療・健康', tags: ['医学', '歯学', '薬学', '看護', 'リハビリ', '検査・放射線', '公衆衛生'] },
  { name: '芸術・スポーツ', tags: ['美術・デザイン', '音楽', 'スポーツ・体育・健康'] },
];

/** 研究対象（生きもの・素材）：図鑑的入口 */
export const TARGET_GROUPS: TagGroup[] = [
  { name: '動物', tags: ['哺乳類', 'マウス', 'ラット', 'ヒト', '霊長類', '野生動物', '鳥類', 'カラス', '猛禽類', '魚類', 'メダカ', 'ゼブラフィッシュ', 'フグ', 'アユ', 'ウナギ', 'マグロ', 'サケ', 'マサバ', '両生類', 'カエル', 'イモリ', '昆虫', 'カイコ', 'コオロギ', 'アリ', 'シロアリ', 'スズメバチ', 'ショウジョウバエ', '害虫', '甲殻類', 'イセエビ', '棘皮動物', 'ウニ', 'サンゴ', 'ホヤ', '線虫', '寄生虫', '貝類', '節足動物', 'ダニ類', '鯨類', 'シカ', 'イノシシ', '家畜', '黒毛和牛', 'プランクトン'] },
  { name: '植物', tags: ['植物', 'イネ', 'コムギ', 'ダイズ', 'トウモロコシ', 'ジャガイモ', 'シロイヌナズナ', '藻類', '海藻', 'ワカメ', 'コンブ', '微細藻類', 'ユーグレナ', '野菜', 'トマト', 'キュウリ', '果樹', 'カンキツ', 'ブドウ', 'イチゴ', 'リンゴ', 'チャ', '牧草', '樹木', 'スギ', 'マツ', '高山植物'] },
  { name: '微生物・菌', tags: ['微生物', '細菌', 'シアノバクテリア', 'ウイルス', '酵母', 'ワイン酵母', '麹菌', '乳酸菌', 'ビフィズス菌', '病原菌', '土壌微生物', '菌類', 'きのこ', 'シイタケ', 'カビ', '大腸菌', '枯草菌', '放線菌', '糸状菌', '菌根菌', 'トリュフ', '真菌', '原虫'] },
];

/** 入試条件（区分・共テ割合・科目数・強い科目・苦手回避・形式・その他） */
export const EXAM_GROUPS: TagGroup[] = [
  { name: '入試区分', tags: ['前期', '後期', '中期', '総合型選抜', '学校推薦型選抜', '夜間主'] },
  { name: '共通テストの割合', tags: ['共通テスト重視型', 'バランス型', '二次重視型', '共通テストのみ型', '共テ課さない'] },
  { name: '二次の科目数', tags: ['二次1科目型', '二次2科目型', '二次3科目型', '二次4科目型'] },
  { name: '強い科目で選ぶ', tags: ['英語重視型', '数学重視型', '理科重視型', '国語重視型', '小論文重視型', '実技重視型'] },
  { name: '苦手を避ける', tags: ['国語不要', '数学不要', '地歴公民不要', '理科不要'] },
  { name: '試験の形式', tags: ['面接あり', '面接重視型', '小論文あり', '総合問題型', '二段階選抜あり', '書類選考'] },
  { name: 'その他', tags: ['情報あり', '選択科目あり', '共通テスト利用'] },
];

export interface TagSets { fieldSystems: TagGroup[]; targetGroups: TagGroup[]; examGroups: TagGroup[] }

/** 取得失敗時のフォールバック（上の同梱定数）。 */
export const BUNDLED_TAGS: TagSets = { fieldSystems: FIELD_SYSTEMS, targetGroups: TARGET_GROUPS, examGroups: EXAM_GROUPS };

const COMPASS_URL = (import.meta.env.VITE_GV_COMPASS_URL as string | undefined) || 'https://gv-compass.pages.dev';

function isGroups(v: unknown): v is TagGroup[] {
  return Array.isArray(v) && v.every((g) => g && typeof (g as TagGroup).name === 'string' && Array.isArray((g as TagGroup).tags));
}

/**
 * GV Compass の taxonomy.json を取得し、最新のタグ体系を返す。
 * 失敗（オフライン・CORS・不正形）時は同梱の BUNDLED_TAGS を返すので、フォームは必ず動く。
 */
export async function loadTagSets(): Promise<TagSets> {
  try {
    const res = await fetch(`${COMPASS_URL}/data/taxonomy.json`, { cache: 'no-cache' });
    if (!res.ok) return BUNDLED_TAGS;
    const j = await res.json();
    if (isGroups(j?.fieldSystems) && isGroups(j?.targetGroups) && isGroups(j?.examGroups)) {
      return { fieldSystems: j.fieldSystems, targetGroups: j.targetGroups, examGroups: j.examGroups };
    }
    return BUNDLED_TAGS;
  } catch {
    return BUNDLED_TAGS;
  }
}
