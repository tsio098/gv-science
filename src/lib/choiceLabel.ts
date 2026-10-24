/**
 * 選択肢の表示名（冊子の ⓪ⓐⓑ など。build の optionLabels → 欄の labels・2026-10-24）。
 * treeApi.ts から再輸出する（テストが node の型の取り除きだけで読めるように、ここは依存なし）
 */
const CIRCLED_DIGITS = ['⓪', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩'];
const circledNum = (v: string | number) => CIRCLED_DIGITS[Number(v)] ?? String(v);

type LabeledBox = { min?: number; labels?: string[] } | undefined;

/** ボタンに出す選択肢の文字（表示名があればそれ・無ければ番号）*/
export const choiceText = (b: LabeledBox, v: string | number) => b?.labels?.[Number(v) - (b.min ?? 1)] ?? String(v);

/** 結果・正解の表示。表示名があれば 0〜9 → ⓪〜⑨・a〜z → ⓐ〜ⓩ（冊子の記号）、無ければ丸数字 */
export const circledChoice = (b: LabeledBox, v: string | number) => {
  const l = b?.labels?.[Number(v) - (b.min ?? 1)];
  if (l == null) return circledNum(v);
  if (/^\d$/.test(l)) return circledNum(l);
  if (/^[a-z]$/.test(l)) return String.fromCodePoint(0x24d0 + l.charCodeAt(0) - 97);
  return l;
};
