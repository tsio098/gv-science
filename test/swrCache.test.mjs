/**
 * swrCache.ts のユニットテスト（メモリ Map 経路）。
 * 実行: node --experimental-strip-types --test test/swrCache.test.mjs
 * （Node には sessionStorage が無いので、自動的にメモリのみで動作する）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { swrGet, swrSet, prefetch } from '../src/lib/swrCache.ts';

test('未設定キーは undefined', () => {
  assert.equal(swrGet('nope'), undefined);
});

test('set した値を get で取り出せる', () => {
  swrSet('k1', { a: 1 });
  assert.deepEqual(swrGet('k1'), { a: 1 });
});

test('prefetch は未キャッシュ時に fn を実行して保存する', async () => {
  let called = 0;
  prefetch('k2', async () => {
    called++;
    return [1, 2, 3];
  });
  // prefetch は非同期なので少し待つ
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(called, 1);
  assert.deepEqual(swrGet('k2'), [1, 2, 3]);
});

test('prefetch は既にキャッシュがあれば fn を呼ばない', async () => {
  swrSet('k3', 'cached');
  let called = 0;
  prefetch('k3', async () => {
    called++;
    return 'fresh';
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(called, 0, 'キャッシュ済みなら取得しない');
  assert.equal(swrGet('k3'), 'cached');
});

test('prefetch の失敗は握りつぶす（例外を投げない）', async () => {
  prefetch('k4', async () => {
    throw new Error('boom');
  });
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(swrGet('k4'), undefined, '失敗時は保存されない');
});
