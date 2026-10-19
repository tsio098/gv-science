/**
 * treeSubject.ts のユニットテスト（開ける科目。Worker の canOpenSubject と同じ判定）。
 * 実行: node --experimental-strip-types --test test/treeSubject.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { treeSubjectsFor } from '../src/lib/treeSubject.ts';

test('生物基礎は生物のツリーに合流（2026-10-19）: 生物の生徒は生物基礎を開けない', () => {
  assert.deepEqual(treeSubjectsFor(['chemistry', 'biology']), ['chemistry', 'biology']);
  assert.deepEqual(treeSubjectsFor(['biology', 'biology-basic']), ['biology'], '名簿に両方あっても生物だけ');
  assert.deepEqual(treeSubjectsFor(['biology-basic', 'earth-basic']), ['biology-basic', 'earth-basic']);
  assert.deepEqual(treeSubjectsFor(['chemistry']), ['chemistry'], '化学の生徒に化学基礎は出さない');
  assert.deepEqual(treeSubjectsFor([]), []);
  assert.ok(treeSubjectsFor([], true).includes('biology-basic'), '先生は全科目');
});
