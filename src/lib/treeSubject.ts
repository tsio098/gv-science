/**
 * ANCHOR TREE の科目（Phase 6・2026-10-15）。ツリーは科目ごとに別。
 * 生徒は履修科目（名簿の科目 = /tree/me の subjects・ホームの user.subjects）のうちツリーがある科目だけ。
 * 先生（学年「先生」）はツリーがある科目すべて。最後に開いた科目を端末に覚えておく。
 * 2026-10-16 先生決定: 選択科目以外は開けない（Worker も SUBJECT_NOT_ALLOWED で拒否）。履修科目が無い・ツリーが無い生徒は空
 * 同日 先生決定: 生物の生徒は生物基礎も開ける（ALSO_OPENS。Worker の canOpenSubject と同じ。化学 → 化学基礎には広げない）
 */

/** ツリーを作った科目（R2 に manifest がある順）。科目を足したらここに足す */
export const TREE_SUBJECTS = ['chemistry', 'biology', 'chemistry-basic', 'biology-basic'] as const;
export type TreeSubject = (typeof TREE_SUBJECTS)[number];

export const TREE_SUBJECT_NAME: Record<TreeSubject, string> = {
  chemistry: '化学',
  biology: '生物',
  'chemistry-basic': '化学基礎',
  'biology-basic': '生物基礎',
};

/** 履修科目に加えて開ける科目（Worker の ALSO_OPENS と同じ）*/
const ALSO_OPENS: Partial<Record<string, readonly TreeSubject[]>> = { biology: ['biology-basic'] };

const KEY = 'tree:subject';

/** 開ける科目の一覧（履修科目＋ALSO_OPENS のうちツリーがある科目。無ければ空 = ツリーを開けない）*/
export function treeSubjectsFor(subjects: readonly string[], staff = false): TreeSubject[] {
  if (staff) return [...TREE_SUBJECTS];
  return TREE_SUBJECTS.filter((s) => subjects.some((k) => k === s || ALSO_OPENS[k]?.includes(s)));
}

/** 最後に開いた科目（一覧に無ければ先頭。一覧が空なら null）*/
export function pickTreeSubject(list: readonly TreeSubject[]): TreeSubject | null {
  if (!list.length) return null;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
  } catch {
    /* プライベートブラウズ等 */
  }
  return (list.find((s) => s === saved) ?? list[0]) as TreeSubject;
}

export function rememberTreeSubject(s: TreeSubject) {
  try {
    localStorage.setItem(KEY, s);
  } catch {
    /* 覚えられなくても動く */
  }
}
