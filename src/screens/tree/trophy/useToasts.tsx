/**
 * 通知のキュー（TreeRoot に 1 つ）。出題中・演出中（paused）は出さず、終わったら続きを出す。
 * 表示を始めたら onShown（既読の送信・ヘッダーの点）と効果音。表示 4.5 秒（プラチナ 6・ファースト 7）で左へ畳む。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { IPAD_MIN_W } from '../treeTheme';
import { playSfx, type SfxName } from './sfx';
import { toastSpeed } from './labSpeed';
import { ToastLayer } from './TrophyToast';
import { mergeToasts, pickToast, toastMs, type ToastItem, type ToastPick } from './toastQueue';

const OUT_MS = 320;

export function sfxFor(t: ToastItem): SfxName {
  switch (t.kind) {
    case 'trophy':
      return t.grade === 'F' ? 'firstSelf' : t.grade === 'P' ? 'platinum' : t.grade === 'G' ? 'gold' : t.grade === 'S' ? 'silver' : 'bronze';
    case 'node':
    case 'master':
      return 'node';
    case 'rank':
      return 'rank';
    case 'news':
      return 'news';
    case 'progress':
      return 'progress';
    case 'lastday':
    case 'arenaRank':
      return 'arena';
    case 'teacher':
      return 'teacher';
    case 'firstOther':
      return 'firstOther';
  }
}

function useWideToast() {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= IPAD_MIN_W);
  useEffect(() => {
    const f = () => setWide(window.innerWidth >= IPAD_MIN_W);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return wide;
}

export function useToasts({
  paused,
  onShown,
  onOpenTrophy,
}: {
  paused: boolean;
  /** 表示を始めた（畳んで出さない分も含む）*/
  onShown?: (items: ToastItem[]) => void;
  /** トロフィーの通知をタップ（次が無いとき）→ 詳細 */
  onOpenTrophy?: (t: { subject: string; id: string }) => void;
}) {
  const [queue, setQueue] = useState<ToastItem[]>([]);
  const [cur, setCur] = useState<(ToastPick & { n: number }) | null>(null);
  const [out, setOut] = useState(false);
  const shown = useRef(new Set<string>());
  const seq = useRef(0);
  const wide = useWideToast();
  const cb = useRef({ onShown, onOpenTrophy });
  cb.current = { onShown, onOpenTrophy };

  const push = useCallback((items: ToastItem[]) => {
    if (!items.length) return;
    setQueue((q) => mergeToasts(q, items, shown.current));
  }, []);

  // 次を出す
  useEffect(() => {
    if (cur || paused || !queue.length) return;
    const pick = pickToast(queue);
    if (!pick) return;
    for (const t of pick.consumed) shown.current.add(t.key);
    setQueue(pick.rest);
    setOut(false);
    setCur({ ...pick, n: ++seq.current });
    cb.current.onShown?.(pick.consumed);
    playSfx(sfxFor(pick.item), toastSpeed());
  }, [cur, paused, queue]);

  // 出題・演出・読み込みが始まったら今の通知を下げ、キューの先頭に戻す（見せないまま消さない・2026-10-19 レビューで修正）
  useEffect(() => {
    if (paused && cur) {
      for (const t of cur.consumed) shown.current.delete(t.key);
      setQueue((q) => mergeToasts(cur.consumed, q, shown.current));
      setCur(null);
      setOut(false);
      if (closing.current) window.clearTimeout(closing.current);
      closing.current = 0;
    }
  }, [paused, cur]);

  // 閉じる処理は 1 回だけ（畳んでいる最中のスワイプで 2 回目のタイマーが次の通知を消さないように）
  const closing = useRef(0);
  const close = useCallback(() => {
    if (closing.current) return;
    setOut(true);
    closing.current = window.setTimeout(() => {
      closing.current = 0;
      setCur(null);
      setOut(false);
    }, OUT_MS / toastSpeed());
  }, []);

  // 表示時間が過ぎたら畳む
  useEffect(() => {
    if (!cur || out) return;
    const t = window.setTimeout(close, toastMs(cur.item) / toastSpeed());
    return () => window.clearTimeout(t);
  }, [cur, out, close]);

  const tap = useCallback(() => {
    if (!cur || out) return;
    if (!cur.peek && cur.item.trophy) cb.current.onOpenTrophy?.(cur.item.trophy);
    close();
  }, [cur, out, close]);

  const layer = cur && !paused ? (
    <ToastLayer key={cur.n} item={cur.item} more={cur.more} peek={cur.peek} wide={wide} out={out} onTap={tap} onSwipe={close} />
  ) : null;

  return { layer, push };
}
