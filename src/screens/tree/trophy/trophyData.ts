/**
 * トロフィー一覧の取得（科目ごとに 30 秒覚える。通知から詳細を開くときも同じものを使う）と表示用の小物。
 */
import { fetchTrophies, type TrophyItem, type TrophyList } from '../../../lib/treeApi';
import { GRADE_COLOR } from './TrophyIcon';

const MEMO_MS = 30_000;
const memo = new Map<string, { at: number; p: Promise<TrophyList> }>();

export function loadTrophies(subject: string, fresh = false): Promise<TrophyList> {
  const m = memo.get(subject);
  if (!fresh && m && Date.now() - m.at < MEMO_MS) return m.p;
  const p = fetchTrophies(subject);
  memo.set(subject, { at: Date.now(), p });
  p.catch(() => memo.delete(subject));
  return p;
}
/** 獲得の直後（通知が来た）は覚えた一覧を捨てる */
export const dropTrophyMemo = () => memo.clear();

/** 取得率の表示（7.9%）*/
export const rarityPct = (r: TrophyItem['rarity']) => (r.of ? `${(Math.round((r.n / r.of) * 1000) / 10).toFixed(1)}%` : '—');

const JST = 9 * 3600_000;
const pad = (n: number) => String(n).padStart(2, '0');
/** 10/18 */
export const mdJst = (ms: number) => {
  const d = new Date(ms + JST);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};
/** 2026.10.16 と 19:42 */
export const ymdJst = (ms: number, sep = '.') => {
  const d = new Date(ms + JST);
  return `${d.getUTCFullYear()}${sep}${pad(d.getUTCMonth() + 1)}${sep}${pad(d.getUTCDate())}`;
};
export const hmJst = (ms: number) => {
  const d = new Date(ms + JST);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
};

/**
 * 先生用（2026-10-22）: 生徒からは隠れているトロフィーか。
 *   'q'   = 獲得するまで ???（名前・条件・出典を出さない）… 隠しの B / S / G
 *   'off' = 獲得するまで一覧に出ない … プラチナ・ファースト・残念・イベント
 *   null  = ふつう（はじめから見える）
 */
export function secretKind(it: Pick<TrophyItem, 'grade' | 'secret' | 'first' | 'oops' | 'event'>): 'q' | 'off' | null {
  if (it.first || it.grade === 'P' || it.oops || it.event) return 'off';
  return it.secret ? 'q' : null;
}
export const SECRET_NOTE = { q: '生徒には獲得するまで ??? で表示', off: '生徒には獲得するまで一覧に出ません' } as const;

export const gradeOf = (it: Pick<TrophyItem, 'grade'>) => GRADE_COLOR[it.grade];
