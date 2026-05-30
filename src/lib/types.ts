/**
 * GV Science — 共通型定義
 *
 * GAS シート列とほぼ 1:1。README の "データモデル" セクションと合わせている。
 */

/**
 * 基礎問題シート用の科目キー（化学基礎/生物基礎/地学基礎 PDF リスト）。
 * Problem.subject は引き続きこれを使う。
 */
export type Subject = 'chemistry' | 'biology' | 'earth';

/**
 * 授業カレンダー用の科目キー。生徒1人ごとに `user.subjects` に列挙される。
 *   - 化学 → chemistry
 *   - 化学基礎 → chemistry-basic
 *   - 生物 → biology
 *   - 生物基礎 → biology-basic
 *   - 地学基礎 → earth-basic
 * （物理 / 物理基礎は授業カレンダー未整備のため非対応）
 */
export type ScheduleSubject =
  | 'chemistry'
  | 'chemistry-basic'
  | 'biology'
  | 'biology-basic'
  | 'earth-basic';

/** 全 ScheduleSubject の列挙順（HomeC のタイル並び順と一致） */
export const SCHEDULE_SUBJECT_ORDER: ScheduleSubject[] = [
  'chemistry',
  'chemistry-basic',
  'biology',
  'biology-basic',
  'earth-basic',
];

/** subject キー → 日本語表記 */
export const SUBJECT_JA: Record<ScheduleSubject, string> = {
  'chemistry':       '化学',
  'chemistry-basic': '化学基礎',
  'biology':         '生物',
  'biology-basic':   '生物基礎',
  'earth-basic':     '地学基礎',
};

/** subject キー → 英字大文字（記事タグ等で使う） */
export const SUBJECT_EN: Record<ScheduleSubject, string> = {
  'chemistry':       'CHEMISTRY',
  'chemistry-basic': 'CHEMISTRY · 基礎',
  'biology':         'BIOLOGY',
  'biology-basic':   'BIOLOGY · 基礎',
  'earth-basic':     'GEOLOGY · 基礎',
};

/** ScheduleSubject → 対応する基礎問題シートの Subject（無ければ null） */
export function basicSubjectFor(s: ScheduleSubject): Subject | null {
  if (s === 'chemistry' || s === 'chemistry-basic') return 'chemistry';
  if (s === 'biology' || s === 'biology-basic') return 'biology';
  if (s === 'earth-basic') return 'earth';
  return null;
}

/**
 * 教材リンク。スプレッドシートの列名がそのまま label になり、
 * セル値が url になる。列が追加されても自動で配列に追加される。
 */
export interface ResourceLink {
  label: string;
  url: string;
}

export interface Schedule {
  id: string;
  /** 7 種類の科目キー。それぞれが個別の授業カレンダーシートを参照する */
  subject: ScheduleSubject;
  /** YYYY/MM/DD */
  date: string;
  /** 曜日（日本語） */
  dow: string;
  title: string;
  desc: string;
  /** 後方互換: materials の最初の URL が入っていれば true */
  material: boolean;
  materialUrl?: string;
  /** 後方互換: videos の最初の URL が入っていれば true */
  video: boolean;
  videoUrl?: string;
  /** 教材リンク一覧（練習問題・解答・リードLight 等を列名ごと集約） */
  materials?: ResourceLink[];
  /** 動画系リンク一覧（スタサプ等） */
  videos?: ResourceLink[];
  isNew: boolean;
  isFavorited?: boolean;
}

export interface Problem {
  id: string;
  subject: Subject;
  no: number;
  title: string;
  desc: string;
  /** 改行のみ許可。HTML は許可しない */
  answer: string;
  explanation: string;
  figureUrl?: string;
  /** Glide テーブル「化学基礎 / 生物基礎 / 地学基礎」の PDF リンク */
  pdfUrl?: string;
  isNew: boolean;
  isFavorited?: boolean;
}

/**
 * 考察問題集の 1 行（基礎問題タイルで表示する）。
 * GAS の `studyBooks` エンドポイントから取得。
 */
export interface StudyBook {
  id: string;
  /** 表示タイトル */
  title: string;
  /** 開く先（PDF or Drive 共有 URL） */
  url: string;
  /** D列のサムネイル画像 URL（=IMAGE() 式の URL もしくは直 URL） */
  image?: string;
  /** subject 列をパースした ScheduleSubject 配列 */
  subjects: ScheduleSubject[];
  /** subjects の日本語表示（例 ["化学基礎", "化学"]） */
  subjectsJa: string[];
  isFavorited?: boolean;
}

export interface Article {
  id: string;
  /** "CHEMISTRY" / "BIOLOGY" / "GEOLOGY" / "PHYSICS" 等の大文字英字 */
  tag: string;
  /** 複数科目（例: ["BIOLOGY", "CHEMISTRY"]）。空なら tag を使う */
  tags?: string[];
  title: string;
  summary: string;
  /** YYYY/MM/DD or "—" */
  date: string;
  url: string;
  /** 1..4 — サムネのパターン番号（image が空のときフォールバックで使う） */
  thumb: 1 | 2 | 3 | 4;
  /** Glide テーブルの実画像 URL（あれば thumb より優先したい） */
  image?: string;
  isFavorited?: boolean;
}

export interface User {
  name: string;
  /** 学年（例: "高2"） */
  grade: string;
  /**
   * 生徒の理科使用科目（生徒IDシート E 列由来）。
   * 例: ['chemistry', 'biology'] / ['chemistry-basic', 'biology-basic']
   * 未設定または未回答時は空配列。
   */
  subjects: ScheduleSubject[];
}

export interface NextClass {
  id: string;
  subject: ScheduleSubject;
  title: string;
  date: string;
  dow: string;
  /** あと何日 */
  daysLeft: number;
  /** 開始時刻（例: "13:00"） */
  startAt: string;
  material: boolean;
  /** "第 N 回" 等 */
  series: string;
}

/* ──────────────────────────────────────────────────────
   Route
   ────────────────────────────────────────────────────── */
export type Route =
  | { name: 'home' }
  | { name: 'schedules'; params: { subject: ScheduleSubject } }
  | {
      name: 'schedule';
      params: { id: string; subject: ScheduleSubject };
    }
  | { name: 'problems'; params: { subject: Subject } }
  | { name: 'problem'; params: { id: string; subject: Subject } }
  | { name: 'articles' }
  | { name: 'share' }
  | { name: 'studyBooks' }
  | { name: 'qr' }
  | { name: 'scores' };

export type RouteName = Route['name'];

/* ──────────────────────────────────────────────────────
   nav() の API
   ──────────────────────────────────────────────────────
   - nav('home')        → reset
   - nav('back')        → pop
   - nav('ext', { url }) → 外部リンクモーダル
   - nav('schedules', { subject }) などは push
*/
export type NavFn = {
  (name: 'home'): void;
  (name: 'back'): void;
  (name: 'ext', params: { url: string }): void;
  (
    name: 'schedules',
    params: { subject: ScheduleSubject }
  ): void;
  (
    name: 'schedule',
    params: { id: string; subject: ScheduleSubject }
  ): void;
  (name: 'problems', params: { subject: Subject }): void;
  (
    name: 'problem',
    params: { id: string; subject: Subject }
  ): void;
  (name: 'articles'): void;
  (name: 'share'): void;
  (name: 'studyBooks'): void;
  (name: 'qr'): void;
  (name: 'scores'): void;
};

/* ──────────────────────────────────────────────────────
   GAS API レスポンス型
   ────────────────────────────────────────────────────── */
export interface HomeResponse {
  user: User;
  nextClass: NextClass;
}

export interface AttendanceQR {
  /** 氏名（生徒IDシート A列） */
  name: string;
  /** 学年（生徒IDシート C列） */
  grade: string;
  /** QR にエンコードする文字列（生徒IDシート D列の ID。空なら未登録） */
  qrText: string;
}

/* ──────────────────────────────────────────────────────
   成績推移（演習点数報告スプレッドシート由来）
   ────────────────────────────────────────────────────── */

/**
 * 成績推移で扱える科目。ScheduleSubject の 5 種類と同じだが、
 * 「対応する成績シートが存在する科目だけ」しか data に含まれない。
 */
export type ScoresSubject = ScheduleSubject;

/** ScoresSubject → 表示用ラベル */
export const SCORES_SUBJECT_LABEL: Record<ScoresSubject, { ja: string; en: string }> = {
  'chemistry':       { ja: '化学',     en: 'CHEMISTRY' },
  'chemistry-basic': { ja: '化学基礎', en: 'CHEM · BASIC' },
  'biology':         { ja: '生物',     en: 'BIOLOGY' },
  'biology-basic':   { ja: '生物基礎', en: 'BIO · BASIC' },
  'earth-basic':     { ja: '地学基礎', en: 'GEO · BASIC' },
};

/** テストごとの合計点 1 行 */
export interface ScoreTestPoint {
  /** "2026/04/06" 形式 */
  date: string;
  test: string;
  total: number;
  avg: number;
  hensachi: number;
}

/** 1 科目分の成績データ（チャート用にフラットに整形済み） */
export interface ScoresPerSubject {
  /** その科目の分野名（順序固定） */
  fields: string[];
  /** 合計点推移（実施日昇順） */
  totalTrend: ScoreTestPoint[];
  /** 月ラベル（"2026-04" 形式、昇順） */
  months: string[];
  /** 分野ごとの月次得点率（本人）— months と同じ長さ。null は欠測 */
  rate: Record<string, Array<number | null>>;
  /** 分野ごとの月次平均得点率（クラス）*/
  avgRate: Record<string, Array<number | null>>;
  /** 分野ごとの月次偏差値（本人）*/
  hensachi: Record<string, Array<number | null>>;
}

/**
 * 成績推移 API のレスポンス。
 * 履修科目をまとめて返す（タブ切替で再フェッチ不要にする設計）。
 */
export interface ScoresResponse {
  /** 生徒名（生徒IDシート由来） */
  name: string;
  /** 表示順（生徒の履修科目のうち、成績データが存在するものだけ）*/
  subjects: ScoresSubject[];
  /** 科目キー → その科目の集計データ */
  data: Partial<Record<ScoresSubject, ScoresPerSubject>>;
}
