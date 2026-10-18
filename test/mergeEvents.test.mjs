/**
 * 演出のイベントをまとめる（src/screens/tree/fx/mergeEvents.ts）。
 * 実行: node --experimental-strip-types --test test/mergeEvents.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeTreeEvents } from '../src/screens/tree/fx/mergeEvents.ts';

const S1 = { n: 1, key: '2026-10-19', start: 0, end: 1 };
const ev = (type, subject, extra = {}) => ({ key: `${type}:${subject}${extra.season ? ':' + extra.season.key : ''}`, type, subject, grade: 'H3', nickname: 'x', ...extra });

test('同じシーズンの新シーズン開始（化学・生物）は 1 つにまとめ、閉じたら両方を既読にする', () => {
  const out = mergeTreeEvents([ev('season_start', 'chemistry', { season: S1 }), ev('season_start', 'biology', { season: S1 })]);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].seenKeys, ['season_start:chemistry:2026-10-19', 'season_start:biology:2026-10-19']);
  assert.deepEqual(out[0].subjects, ['chemistry', 'biology']);
});

test('解放・優勝は科目ごとのまま。並びは変えない', () => {
  const out = mergeTreeEvents([
    ev('unlock_arena', 'chemistry', { season: S1 }),
    ev('unlock_arena', 'biology', { season: S1 }),
    ev('champion', 'chemistry', { season: S1 }),
    ev('season_start', 'chemistry', { season: S1 }),
    ev('season_start', 'biology', { season: S1 }),
  ]);
  assert.deepEqual(out.map((e) => `${e.type}:${e.subjects.join('+')}`), ['unlock_arena:chemistry', 'unlock_arena:biology', 'champion:chemistry', 'season_start:chemistry+biology']);
});
