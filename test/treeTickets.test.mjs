/**
 * treeTickets.ts のユニットテスト（ヘッダーのチケットの枚数）。
 * 実行: node --experimental-strip-types --test test/treeTickets.test.mjs
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ticketExpired, usableTicketCount } from '../src/lib/treeTickets.ts';

const NOW = Date.parse('2026-11-01T00:00:00+09:00');

test('期限の無いチケットは期限切れにならない・usableUntil を過ぎたら期限切れ（ちょうどの時刻も）', () => {
  assert.equal(ticketExpired({ usableUntil: undefined }, NOW), false);
  assert.equal(ticketExpired({ usableUntil: null }, NOW), false);
  assert.equal(ticketExpired({ usableUntil: NOW + 1 }, NOW), false);
  assert.equal(ticketExpired({ usableUntil: NOW }, NOW), true);
  assert.equal(ticketExpired({ usableUntil: NOW - 1 }, NOW), true);
});

test('枚数: 使っていない・期限を過ぎていないものだけ数える（2026-10-22: 期限切れのイベントチケットが入っていた）', () => {
  const list = [
    { usedAt: null }, // ABYSS（期限なし）
    { usedAt: 123, usableUntil: null }, // 使用済み
    { usedAt: null, usableUntil: NOW - 1 }, // イベント・期限切れ
    { usedAt: null, usableUntil: NOW + 86400_000 }, // イベント・まだ使える（使える日の前も数える）
  ];
  assert.equal(usableTicketCount(list, NOW), 2);
  assert.equal(usableTicketCount([], NOW), 0);
});
