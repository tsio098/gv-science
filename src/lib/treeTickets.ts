/**
 * チケットの数え方（ヘッダーのチケットの枚数）。純粋関数（test/treeTickets.test.mjs）。
 */
import type { TreeTicket } from './treeApi';

/** 使える日（usableUntil）を過ぎたか。期限の無いチケット（ABYSS・総合優勝・LV.30）は過ぎない */
export const ticketExpired = (t: Pick<TreeTicket, 'usableUntil'>, now: number) => t.usableUntil != null && now >= t.usableUntil;

/**
 * まだ使えるチケットの枚数（使っていない・期限を過ぎていない）。時刻は端末の Date.now() でよい（表示の目安。使えるかは Proxy が決める）
 * （2026-10-22 修正: 期限の過ぎた季節イベントのチケットもヘッダーの枚数に入っていた）
 */
export const usableTicketCount = (list: Pick<TreeTicket, 'usedAt' | 'usableUntil'>[], now: number) =>
  list.filter((t) => !t.usedAt && !ticketExpired(t, now)).length;
