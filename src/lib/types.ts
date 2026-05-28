/**
 * GV Science — 共通型定義
 *
 * GAS シート列とほぼ 1:1。README の "データモデル" セクションと合わせている。
 */

export type Subject = 'chemistry' | 'biology' | 'earth';

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
  /** chemistry / biology のみ。地学は授業対象外 */
  subject: Exclude<Subject, 'earth'>;
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
  /** "CHEMISTRY" / "BIOLOGY" / "EARTH" / "PHYSICS" 等の大文字英字 */
  tag: string;
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
}

export interface NextClass {
  id: string;
  subject: Exclude<Subject, 'earth'>;
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
  | { name: 'schedules'; params: { subject: Exclude<Subject, 'earth'> } }
  | {
      name: 'schedule';
      params: { id: string; subject: Exclude<Subject, 'earth'> };
    }
  | { name: 'problems'; params: { subject: Subject } }
  | { name: 'problem'; params: { id: string; subject: Subject } }
  | { name: 'articles' }
  | { name: 'share' };

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
    params: { subject: Exclude<Subject, 'earth'> }
  ): void;
  (
    name: 'schedule',
    params: { id: string; subject: Exclude<Subject, 'earth'> }
  ): void;
  (name: 'problems', params: { subject: Subject }): void;
  (
    name: 'problem',
    params: { id: string; subject: Subject }
  ): void;
  (name: 'articles'): void;
  (name: 'share'): void;
};

/* ──────────────────────────────────────────────────────
   GAS API レスポンス型
   ────────────────────────────────────────────────────── */
export interface HomeResponse {
  user: User;
  nextClass: NextClass;
}
