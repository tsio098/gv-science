/**
 * playEnd.ts のユニットテスト（1 回だけの挑戦を終了するか・2026-10-28 不具合）。
 * 実行: node --experimental-strip-types --test test/playEnd.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { endAction } from '../src/lib/playEnd.ts';

test('問題が画面に出る前: 画面を離れても終了しない・中断はツリーに戻るだけ（開始の応答が落ちて押し直したら 0 点になった不具合）', () => {
  assert.equal(endAction(false, 'away'), 'ignore');
  assert.equal(endAction(false, 'quit'), 'exit');
});

test('問題が画面に出た後: 離れる・中断は今までどおり終了して採点', () => {
  assert.equal(endAction(true, 'away'), 'end');
  assert.equal(endAction(true, 'quit'), 'end');
});

test('Proxy が終了扱いにした（resume）・全体の制限時間（timeup）は出ていなくても終了', () => {
  for (const shown of [false, true]) {
    assert.equal(endAction(shown, 'resume'), 'end');
    assert.equal(endAction(shown, 'timeup'), 'end');
  }
});
