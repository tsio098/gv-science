/**
 * トロフィー・通知のキュー（実装手順_トロフィー §0・§6.3）。純粋関数だけ（テストは test/toastQueue.test.mjs）。
 *   並び = ファースト > プラチナ > ゴールド > シルバー > ブロンズ > RANK DOWN > 残念 > その他の通知（同じ順位は入った順）
 *   同時に 3 件以上は先頭 1 件 +「ほか n 件」に畳む（残りは出さずに既読）。2 件は 1 件ずつ（後ろの 1 件が下にのぞく）
 *   LEVEL 30（LV.30 チケット・2026-10-19）は畳まず、ほかの通知をすべて出した後に 1 件で出す
 *   季節イベントの EVENT CLEAR!! / TICKET GET!（2026-10-20）も畳まず最後に（同じ回なら LEVEL 30 → EVENT CLEAR!! → TICKET GET! の順）
 *   表示 4.5 秒（プラチナ・LEVEL 30・EVENT CLEAR!!・TICKET GET! は 6 秒・ファースト 7 秒）
 */
/** E = 季節イベントの EVENT トロフィー（通知は evClear にまとめるので、ふつうは trophy の通知にならない）*/
export type ToastGrade = 'B' | 'S' | 'G' | 'P' | 'F' | 'Z' | 'E';

/** 通知の種類（トロフィー以外はドットのアイコン）*/
export type ToastKind =
  | 'trophy'
  | 'node'
  | 'master'
  | 'rank'
  | 'rankDown'
  | 'news'
  | 'progress'
  | 'lastday'
  | 'arenaRank'
  | 'teacher'
  | 'firstOther'
  /** トロフィーレベル 30（LV.30 チケット）。タップでチケット画面 */
  | 'level30'
  /** 季節イベントの MASTER 100%（EVENT トロフィー ＋ 錨）。タップでイベント画面 */
  | 'evClear'
  /** 季節イベントのテスト合格（イベント限定チケット）。タップでチケット画面 */
  | 'evTicket';

export interface ToastItem {
  /** 一意のキー（同じキーは 2 回入れない）*/
  key: string;
  kind: ToastKind;
  /** トロフィーのグレード（kind = 'trophy'）*/
  grade?: ToastGrade;
  /** 見出し（Press Start 2P）*/
  head: string;
  /** 名前・本文（DotGothic16）*/
  main: string;
  /** 3 行目 */
  sub?: string;
  /** トロフィーの pt（+30PT）*/
  pt?: number;
  /** PROGRESS のバー */
  prog?: { now: number; max: number };
  /** ABYSS の画面で出すトロフィー（地を深海に）*/
  abyss?: boolean;
  /** タップで詳細を開くトロフィー（科目・id）*/
  trophy?: { subject: string; id: string };
  /** 表示したら既読にする notice の key（/tree/trophies/seen）*/
  noticeKey?: string;
  /** タップでチケット画面（LEVEL 30・TICKET GET!）*/
  ticket?: boolean;
  /** 季節イベント（EVENT CLEAR!! / TICKET GET!）: イベントの kind・科目・札（「10/31」「100%」）。タップでイベント画面（evClear）*/
  ev?: { kind: string; subject: string; stamp: string; firstIcon?: boolean };
}

const GRADE_RANK: Record<ToastGrade, number> = { F: 0, P: 1, G: 2, S: 3, B: 4, Z: 6, E: 8 };
/** 畳まずに最後に 1 件ずつ出す通知（LEVEL 30 → EVENT CLEAR!! → TICKET GET!）*/
const LATE: Partial<Record<ToastKind, number>> = { level30: 9, evClear: 10, evTicket: 11 };
export const isLateToast = (t: ToastItem) => LATE[t.kind] != null;
/** RANK DOWN は残念（順位の残念と同時に出る）より前 */
export const toastRank = (t: ToastItem) => (t.kind === 'trophy' && t.grade ? GRADE_RANK[t.grade] : t.kind === 'rankDown' ? 5 : LATE[t.kind] ?? 7);

/** 並べ替え（安定）*/
export function sortToasts(list: ToastItem[]): ToastItem[] {
  return list
    .map((t, i) => ({ t, i }))
    .sort((a, b) => toastRank(a.t) - toastRank(b.t) || a.i - b.i)
    .map((x) => x.t);
}

/** 既にあるキーを除いて足す */
export function mergeToasts(queue: ToastItem[], add: ToastItem[], shown: Set<string> = new Set()): ToastItem[] {
  const have = new Set(queue.map((t) => t.key));
  const out = [...queue];
  for (const t of add) {
    if (have.has(t.key) || shown.has(t.key)) continue;
    have.add(t.key);
    out.push(t);
  }
  return out;
}

export interface ToastPick {
  /** いま出す 1 件 */
  item: ToastItem;
  /** 「ほか n 件」（0 なら出さない）*/
  more: number;
  /** 下にのぞく次の 1 件（2 件のときだけ）*/
  peek: ToastItem | null;
  /** 一緒に既読にするもの（畳んで出さない分も含む）*/
  consumed: ToastItem[];
  /** 残りのキュー */
  rest: ToastItem[];
}

/** キューから次に出すものを選ぶ。3 件以上は先頭 + ほか n 件に畳み、全部を消費する */
export function pickToast(queue: ToastItem[]): ToastPick | null {
  if (!queue.length) return null;
  // LEVEL 30・EVENT CLEAR!!・TICKET GET! は畳まない: ほかの通知が残っている間は後ろに置いておき、なくなってから 1 件ずつ出す
  const late = sortToasts(queue.filter(isLateToast));
  const main = sortToasts(queue.filter((t) => !isLateToast(t)));
  if (!main.length) {
    const [item, ...rest] = late as [ToastItem, ...ToastItem[]];
    return { item, more: 0, peek: null, consumed: [item], rest };
  }
  const [item, ...others] = main as [ToastItem, ...ToastItem[]];
  if (main.length >= 3) return { item, more: others.length, peek: null, consumed: main, rest: late };
  return { item, more: others.length, peek: others[0] ?? null, consumed: [item], rest: [...others, ...late] };
}

/** 表示の長さ（ミリ秒）*/
export const toastMs = (t: ToastItem) =>
  t.kind === 'trophy' && t.grade === 'F' ? 7000 : (t.kind === 'trophy' && t.grade === 'P') || isLateToast(t) ? 6000 : 4500;

/** 名前の文字サイズ（px）: 12 字まで 14・13 字は 13（プラチナ 15・iPad 14）*/
export function toastNameSize(t: Pick<ToastItem, 'kind' | 'grade' | 'main'>, wide = false): number {
  // EVENT CLEAR!! は 13 字の名前を 13px・TICKET GET! は 14px（ボード「獲得の演出と効果音」）
  if (t.kind === 'evClear') return 13;
  if (t.kind === 'evTicket') return 14;
  if ((t.kind === 'trophy' && t.grade === 'P') || t.kind === 'level30') return 15;
  if (wide) return 14;
  return [...t.main].length >= 13 ? 13 : 14;
}

/** 通知の幅（px）*/
export function toastWidth(t: Pick<ToastItem, 'kind' | 'grade'> & { main?: string }, wide = false): number {
  // 新着は 1 行の小さい札: 文字数に合わせる（12px × 字数 ＋ アイコン・NEW・余白）
  if (t.kind === 'news') return Math.min(wide ? 264 : 248, Math.max(140, 78 + [...(t.main ?? '')].length * 12));
  if ((t.kind === 'trophy' && t.grade === 'P') || t.kind === 'level30' || t.kind === 'evClear' || t.kind === 'evTicket') return 272;
  if (t.kind === 'trophy' && t.grade === 'F') return 260;
  return wide ? 264 : 248;
}
