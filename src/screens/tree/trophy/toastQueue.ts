/**
 * トロフィー・通知のキュー（実装手順_トロフィー §0・§6.3）。純粋関数だけ（テストは test/toastQueue.test.mjs）。
 *   並び = ファースト > プラチナ > ゴールド > シルバー > ブロンズ > その他の通知（同じ順位は入った順）
 *   同時に 3 件以上は先頭 1 件 +「ほか n 件」に畳む（残りは出さずに既読）。2 件は 1 件ずつ（後ろの 1 件が下にのぞく）
 *   表示 4.5 秒（プラチナ 6 秒・ファースト 7 秒）
 */
export type ToastGrade = 'B' | 'S' | 'G' | 'P' | 'F';

/** 通知の種類（トロフィー以外はドットのアイコン）*/
export type ToastKind =
  | 'trophy'
  | 'node'
  | 'master'
  | 'rank'
  | 'news'
  | 'progress'
  | 'lastday'
  | 'arenaRank'
  | 'teacher'
  | 'firstOther';

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
}

const GRADE_RANK: Record<ToastGrade, number> = { F: 0, P: 1, G: 2, S: 3, B: 4 };
export const toastRank = (t: ToastItem) => (t.kind === 'trophy' && t.grade ? GRADE_RANK[t.grade] : 5);

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
  const sorted = sortToasts(queue);
  const [item, ...others] = sorted as [ToastItem, ...ToastItem[]];
  if (sorted.length >= 3) return { item, more: others.length, peek: null, consumed: sorted, rest: [] };
  return { item, more: others.length, peek: others[0] ?? null, consumed: [item], rest: others };
}

/** 表示の長さ（ミリ秒）*/
export const toastMs = (t: ToastItem) => (t.kind === 'trophy' && t.grade === 'F' ? 7000 : t.kind === 'trophy' && t.grade === 'P' ? 6000 : 4500);

/** 名前の文字サイズ（px）: 12 字まで 14・13 字は 13（プラチナ 15・iPad 14）*/
export function toastNameSize(t: Pick<ToastItem, 'kind' | 'grade' | 'main'>, wide = false): number {
  if (t.kind === 'trophy' && t.grade === 'P') return 15;
  if (wide) return 14;
  return [...t.main].length >= 13 ? 13 : 14;
}

/** 通知の幅（px）*/
export function toastWidth(t: Pick<ToastItem, 'kind' | 'grade'>, wide = false): number {
  if (t.kind === 'trophy' && t.grade === 'P') return 272;
  if (t.kind === 'trophy' && t.grade === 'F') return 260;
  return wide ? 264 : 248;
}
