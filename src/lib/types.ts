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
 *   - 物理 → physics
 *   - 物理基礎 → physics-basic
 *   - 地学基礎 → earth-basic
 */
export type ScheduleSubject =
  | 'chemistry'
  | 'chemistry-basic'
  | 'biology'
  | 'biology-basic'
  | 'physics'
  | 'physics-basic'
  | 'earth-basic';

/** 全 ScheduleSubject の列挙順（HomeC のタイル並び順と一致） */
export const SCHEDULE_SUBJECT_ORDER: ScheduleSubject[] = [
  'chemistry',
  'chemistry-basic',
  'biology',
  'biology-basic',
  'physics',
  'physics-basic',
  'earth-basic',
];

/** subject キー → 日本語表記 */
export const SUBJECT_JA: Record<ScheduleSubject, string> = {
  'chemistry':       '化学',
  'chemistry-basic': '化学基礎',
  'biology':         '生物',
  'biology-basic':   '生物基礎',
  'physics':         '物理',
  'physics-basic':   '物理基礎',
  'earth-basic':     '地学基礎',
};

/** subject キー → 英字大文字（記事タグ等で使う） */
export const SUBJECT_EN: Record<ScheduleSubject, string> = {
  'chemistry':       'CHEMISTRY',
  'chemistry-basic': 'CHEMISTRY · 基礎',
  'biology':         'BIOLOGY',
  'biology-basic':   'BIOLOGY · 基礎',
  'physics':         'PHYSICS',
  'physics-basic':   'PHYSICS · 基礎',
  'earth-basic':     'GEOLOGY · 基礎',
};

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
  | { name: 'qr' };

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
  (name: 'qr'): void;
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
