/**
 * トロフィー・通知のキュー（src/screens/tree/trophy/toastQueue.ts）のユニットテスト。
 * 実行: node --experimental-strip-types --test test/toastQueue.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sortToasts, mergeToasts, pickToast, toastMs, toastNameSize, toastWidth } from '../src/screens/tree/trophy/toastQueue.ts';

const tr = (key, grade, main = 'すべては最善') => ({ key, kind: 'trophy', grade, head: 'TROPHY GET!', main });
const note = (key, kind = 'node') => ({ key, kind, head: 'NODE OPEN!', main: '気体の性質' });

test('並び: ファースト > プラチナ > ゴールド > シルバー > ブロンズ > その他（同じ順位は入った順）', () => {
  const list = [note('n1'), tr('b', 'B'), tr('s', 'S'), note('n2', 'rank'), tr('f', 'F'), tr('g', 'G'), tr('p', 'P'), tr('b2', 'B')];
  assert.deepEqual(sortToasts(list).map((t) => t.key), ['f', 'p', 'g', 's', 'b', 'b2', 'n1', 'n2']);
});

test('同じキーは 2 回入れない・出したキーも入れない', () => {
  const q = mergeToasts([tr('a', 'B')], [tr('a', 'B'), tr('b', 'S'), tr('c', 'G')], new Set(['c']));
  assert.deepEqual(q.map((t) => t.key), ['a', 'b']);
});

test('1 件・2 件は 1 件ずつ（2 件は次がのぞく）。3 件以上は先頭 + ほか n 件に畳んで全部消費', () => {
  assert.equal(pickToast([]), null);
  const one = pickToast([tr('a', 'B')]);
  assert.deepEqual([one.item.key, one.more, one.peek, one.rest.length], ['a', 0, null, 0]);
  const two = pickToast([tr('a', 'B'), tr('b', 'G')]);
  assert.deepEqual([two.item.key, two.more, two.peek.key, two.rest.map((t) => t.key), two.consumed.length], ['b', 1, 'a', ['a'], 1]);
  const many = pickToast([tr('a', 'B'), note('n'), tr('b', 'S'), tr('c', 'P')]);
  assert.deepEqual([many.item.key, many.more, many.peek, many.rest.length, many.consumed.length], ['c', 3, null, 0, 4]);
});

test('表示の長さ: 4.5 秒（プラチナ 6・ファースト 7）', () => {
  assert.equal(toastMs(tr('a', 'B')), 4500);
  assert.equal(toastMs(tr('a', 'P')), 6000);
  assert.equal(toastMs(tr('a', 'F')), 7000);
  assert.equal(toastMs(note('n')), 4500);
});

test('名前の文字サイズ: 12 字まで 14px・13 字は 13px（プラチナ 15・iPad 14）。幅 248（プラチナ 272・ファースト 260・iPad 264）', () => {
  assert.equal(toastNameSize(tr('a', 'S', 'すべては最善')), 14);
  assert.equal(toastNameSize(tr('a', 'S', '明日も、明日も、また明日も')), 13);
  assert.equal(toastNameSize(tr('a', 'S', '明日も、明日も、また明日も'), true), 14);
  assert.equal(toastNameSize(tr('a', 'P', '時よ止まれ、お前は美しい')), 15);
  assert.equal(toastWidth(tr('a', 'B')), 248);
  assert.equal(toastWidth(tr('a', 'B'), true), 264);
  assert.equal(toastWidth(tr('a', 'P')), 272);
  assert.equal(toastWidth(tr('a', 'F')), 260);
});

test('残念トロフィー（Z）はブロンズと RANK DOWN の後・その他の前。LEVEL 30 は畳まず最後に 1 件で出す（2026-10-19）', () => {
  const lv = { key: 'lv', kind: 'level30', head: 'LEVEL 30 REACHED!!', main: 'トロフィーレベル 30' };
  const list = [note('n1'), tr('z', 'Z'), note('d', 'rankDown'), tr('b', 'B')];
  assert.deepEqual(sortToasts(list).map((t) => t.key), ['b', 'd', 'z', 'n1']);
  const many = pickToast([lv, tr('z', 'Z'), tr('b', 'B'), note('n')]);
  assert.deepEqual([many.item.key, many.more, many.consumed.length, many.rest.map((t) => t.key)], ['b', 2, 3, ['lv']], '3 件は畳んで LEVEL 30 は残す');
  const last = pickToast(many.rest);
  assert.deepEqual([last.item.key, last.more, last.peek, last.rest.length], ['lv', 0, null, 0]);
  const two = pickToast([lv, tr('b', 'B')]);
  assert.deepEqual([two.item.key, two.peek, two.rest.map((t) => t.key)], ['b', null, ['lv']], 'LEVEL 30 はのぞかせない');
  assert.deepEqual([toastMs(lv), toastWidth(lv), toastMs(tr('z', 'Z')), toastWidth(tr('z', 'Z'))], [6000, 272, 4500, 248]);
});
