/**
 * 選択肢の表示名（冊子の ⓪ⓐⓑ など・build の optionLabels → 欄の labels。2026-10-24）。
 * 実行: node --experimental-strip-types --test test/choiceLabels.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { choiceText, circledChoice } from '../src/lib/choiceLabel.ts';

const labels = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', 'a', 'b'];

test('表示名がある欄: ボタンは 1〜9・0・a・b、結果は ①〜⑨・⓪・ⓐ・ⓑ', () => {
  const b = { min: 1, labels };
  assert.deepEqual([7, 10, 11, 12].map((v) => choiceText(b, v)), ['7', '0', 'a', 'b']);
  assert.deepEqual(['7', '10', '11', '12'].map((v) => circledChoice(b, v)), ['⑦', '⓪', 'ⓐ', 'ⓑ']);
});

test('表示名が無い欄はいままでどおり（番号・丸数字。数字マークの ⓪ も）', () => {
  assert.equal(choiceText({ min: 1 }, 3), '3');
  assert.equal(circledChoice({ min: 1 }, '3'), '③');
  assert.equal(circledChoice({ min: 0 }, '0'), '⓪');
  assert.equal(circledChoice(undefined, '12'), '12');
});
