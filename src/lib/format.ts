/**
 * 成績推移画面の数値表示ユーティリティ。
 *
 * 全ての成績関連数値（合計点・偏差値・得点率・差分など）を
 * 小数第一位まで（例: 50.0 / 12.3 / —）に統一する。
 * null / undefined / 非数値は em-dash で表示。
 */

/** 1 桁丸め + 1 桁固定表示。null は em-dash。 */
export function fmt1(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return (Math.round(n * 10) / 10).toFixed(1);
}

/** 符号付き 1 桁表示。0 はそのまま「0.0」。 */
export function fmtSigned1(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  const v = Math.round(n * 10) / 10;
  if (v > 0) return '+' + v.toFixed(1);
  return v.toFixed(1);
}
