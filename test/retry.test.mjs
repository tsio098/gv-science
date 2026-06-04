/**
 * retry.ts のユニットテスト。
 * 実行: node --experimental-strip-types --test test/retry.test.mjs
 * （TypeScript を型ストリップで直接読み込む。Node 22.6+ 必要）
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  withRetry,
  backoffDelay,
  isTransientError,
} from '../src/lib/retry.ts';

const noSleep = async () => {};

test('成功時はそのまま値を返し、リトライしない', async () => {
  let calls = 0;
  const v = await withRetry(
    async () => {
      calls++;
      return 42;
    },
    { sleep: noSleep }
  );
  assert.equal(v, 42);
  assert.equal(calls, 1);
});

test('一時障害は指定回数までリトライして最終的に成功', async () => {
  let calls = 0;
  const v = await withRetry(
    async () => {
      calls++;
      if (calls < 3) throw new Error('HTTP 503');
      return 'ok';
    },
    { retries: 3, sleep: noSleep }
  );
  assert.equal(v, 'ok');
  assert.equal(calls, 3);
});

test('リトライ回数を使い切ったら最後のエラーを投げる', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error('HTTP 500');
        },
        { retries: 2, sleep: noSleep }
      ),
    /HTTP 500/
  );
  assert.equal(calls, 3, '初回 + 2 リトライ = 3 回');
});

test('shouldRetry が false ならリトライせず即 throw', async () => {
  let calls = 0;
  await assert.rejects(
    () =>
      withRetry(
        async () => {
          calls++;
          throw new Error('GAS_ERROR: UNAUTHORIZED');
        },
        {
          retries: 5,
          sleep: noSleep,
          shouldRetry: (e) => isTransientError(e),
        }
      ),
    /UNAUTHORIZED/
  );
  assert.equal(calls, 1, '恒久エラーは 1 回で諦める');
});

test('isTransientError の判定', () => {
  // 一時障害（リトライすべき）
  assert.equal(isTransientError(new Error('HTTP 429')), true);
  assert.equal(isTransientError(new Error('HTTP 503')), true);
  assert.equal(isTransientError(new Error('GAS_ERROR: INTERNAL_ERROR')), true);
  assert.equal(isTransientError(new Error('Failed to fetch')), true);
  // 恒久エラー（リトライ無意味）
  assert.equal(isTransientError(new Error('GAS_ERROR: UNAUTHORIZED')), false);
  assert.equal(isTransientError(new Error('GAS_ERROR: NEEDS_PAIRING')), false);
  assert.equal(isTransientError(new Error('GAS_ERROR: NO_DATA')), false);
  assert.equal(isTransientError(new Error('NO_ENDPOINT')), false);
});

test('backoffDelay は指数的に増え、maxMs で頭打ち', () => {
  const noJitter = () => 0.5; // jitter 中央 = 0
  assert.equal(backoffDelay(0, 300, 4000, 0.25, noJitter), 300);
  assert.equal(backoffDelay(1, 300, 4000, 0.25, noJitter), 600);
  assert.equal(backoffDelay(2, 300, 4000, 0.25, noJitter), 1200);
  assert.equal(backoffDelay(10, 300, 4000, 0.25, noJitter), 4000); // 上限
});

test('backoffDelay は負にならない', () => {
  const minRand = () => 0; // jitter 最小（-側いっぱい）
  const d = backoffDelay(0, 300, 4000, 0.25, minRand);
  assert.ok(d >= 0, `delay should be >= 0, got ${d}`);
});
