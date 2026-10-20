/**
 * ドラッグで移動・ピンチ（2 本指）で拡大する共通フック。ツリー・問題画像・全画面ビューアで使う。
 *
 * - 中身は transform（translate + scale、transform-origin 0 0）だけで動かす（設計書 §8）。
 *   毎フレーム React を再描画しないよう、DOM の style を直接書き換える。
 * - 中身が表示枠より小さい向きは中央（縦は上寄せ / 中央を選べる）、大きい向きは枠からはみ出さない範囲に収める。
 * - ドラッグ後のクリックは捕捉フェーズで止める（ノードのボタンを誤って押さない）。
 * - タップ / ダブルタップは onTap / onDoubleTap で受け取れる（画像の全画面表示・等倍に戻す用）。
 */
import { useCallback, useEffect, useRef } from 'react';

export interface PanZoomOptions {
  /** 中身の大きさ（等倍時）。0 なら表示枠と同じ大きさとみなす */
  contentW: number;
  contentH: number;
  minZ: number;
  maxZ: number;
  /** 中身が枠より低いときの縦位置 */
  alignY?: 'top' | 'center';
  /** 下に余分に動かせる量（ポップオーバーに隠れたノードを持ち上げる用）*/
  extraBottom?: number;
  /** 等倍のときは 1 本指の縦ドラッグをページのスクロールに任せる（問題画像用）*/
  scrollAtRest?: boolean;
  onTap?: (x: number, y: number) => void;
  onDoubleTap?: () => void;
  /** 倍率が変わったとき（表示用）*/
  onZoom?: (z: number) => void;
  /** 表示が動いたとき（毎フレーム呼ぶので React の state を変えないこと。ツリーのイベントの目印の位置合わせ用・2026-10-21）*/
  onView?: (v: { x: number; y: number; z: number }, size: { w: number; h: number }) => void;
}

interface View {
  x: number;
  y: number;
  z: number;
}

const TAP_SLOP = 8;
const DOUBLE_TAP_MS = 300;

export function usePanZoom(opts: PanZoomOptions) {
  const viewRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const o = useRef(opts);
  o.current = opts;
  const v = useRef<View>({ x: 0, y: 0, z: 1 });
  const size = useRef({ w: 0, h: 0 });
  const lastZ = useRef(1);

  const contentSize = () => ({
    cw: o.current.contentW || size.current.w,
    ch: o.current.contentH || size.current.h,
  });

  const clampView = useCallback((n: View): View => {
    const { minZ, maxZ, alignY = 'top', extraBottom = 0 } = o.current;
    const { w: vw, h: vh } = size.current;
    const { cw, ch } = contentSize();
    const z = Math.min(maxZ, Math.max(minZ, n.z));
    const sw = cw * z;
    const sh = ch * z;
    const x = sw <= vw ? (vw - sw) / 2 : Math.min(0, Math.max(vw - sw, n.x));
    const y =
      sh + extraBottom <= vh
        ? alignY === 'center'
          ? (vh - sh) / 2
          : 0
        : Math.min(0, Math.max(vh - sh - extraBottom, n.y));
    return { x, y, z };
  }, []);

  const apply = useCallback(
    (animate = false) => {
      const el = contentRef.current;
      const view = viewRef.current;
      if (!el) return;
      const { x, y, z } = v.current;
      el.style.transition = animate ? 'transform 0.22s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none';
      el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${z})`;
      if (view && o.current.scrollAtRest) view.style.touchAction = z > 1.001 ? 'none' : 'pan-y';
      if (z !== lastZ.current) {
        lastZ.current = z;
        o.current.onZoom?.(z);
      }
      o.current.onView?.(v.current, size.current);
    },
    []
  );

  const setView = useCallback(
    (n: Partial<View>, animate = false) => {
      v.current = clampView({ ...v.current, ...n });
      apply(animate);
    },
    [apply, clampView]
  );

  /** 表示枠内の点 (cx, cy) を中心に倍率を z にする */
  const zoomTo = useCallback(
    (z: number, cx?: number, cy?: number, animate = false) => {
      const { w, h } = size.current;
      const px = cx ?? w / 2;
      const py = cy ?? h / 2;
      const cur = v.current;
      const nz = Math.min(o.current.maxZ, Math.max(o.current.minZ, z));
      setView({ z: nz, x: px - ((px - cur.x) * nz) / cur.z, y: py - ((py - cur.y) * nz) / cur.z }, animate);
    },
    [setView]
  );

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const measure = () => {
      size.current = { w: view.clientWidth, h: view.clientHeight };
      v.current = clampView(v.current);
      apply();
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(view);

    const pts = new Map<number, { x: number; y: number }>();
    let moved = false;
    let suppressClick = false;
    let downAt = 0;
    let downPos = { x: 0, y: 0 };
    let pinch: { d: number; z: number; mx: number; my: number; vx: number; vy: number } | null = null;
    let lastTap = 0;
    let tapTimer = 0;

    const local = (e: { clientX: number; clientY: number }) => {
      const r = view.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const startPinch = () => {
      const [a, b] = [...pts.values()];
      if (!a || !b) return;
      const c = v.current;
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, z: c.z, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, vx: c.x, vy: c.y };
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = local(e);
      pts.set(e.pointerId, p);
      if (pts.size === 1) {
        moved = false;
        suppressClick = false;
        downAt = performance.now();
        downPos = p;
      }
      if (pts.size === 2) {
        moved = true;
        startPinch();
      }
    };
    const onMove = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      pts.set(e.pointerId, p);
      if (pts.size >= 2 && pinch) {
        const [a, b] = [...pts.values()];
        if (!a || !b) return;
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
        const z = Math.min(o.current.maxZ, Math.max(o.current.minZ, (pinch.z * d) / pinch.d));
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        v.current = clampView({
          z,
          x: mx - ((pinch.mx - pinch.vx) * z) / pinch.z,
          y: my - ((pinch.my - pinch.vy) * z) / pinch.z,
        });
        apply();
        e.preventDefault();
        return;
      }
      if (!moved && Math.hypot(p.x - downPos.x, p.y - downPos.y) > TAP_SLOP) {
        moved = true;
        suppressClick = true;
        try {
          view.setPointerCapture(e.pointerId);
        } catch {
          /* noop */
        }
      }
      if (moved) {
        v.current = clampView({ ...v.current, x: v.current.x + p.x - prev.x, y: v.current.y + p.y - prev.y });
        apply();
      }
    };
    const onUp = (e: PointerEvent) => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size === 1) startPinch();
      if (pts.size < 2) pinch = null;
      if (pts.size === 0 && !moved && e.type === 'pointerup' && performance.now() - downAt < 350) {
        const now = performance.now();
        if (o.current.onDoubleTap && now - lastTap < DOUBLE_TAP_MS) {
          window.clearTimeout(tapTimer);
          lastTap = 0;
          o.current.onDoubleTap();
        } else {
          lastTap = now;
          const { x, y } = downPos;
          if (o.current.onTap) {
            // ダブルタップの 2 回目を待ってからタップとして扱う
            const wait = o.current.onDoubleTap ? DOUBLE_TAP_MS : 0;
            tapTimer = window.setTimeout(() => o.current.onTap?.(x, y), wait);
          }
        }
      }
    };
    const onClick = (e: MouseEvent) => {
      if (suppressClick) {
        e.stopPropagation();
        e.preventDefault();
        suppressClick = false;
      }
    };
    const onWheel = (e: WheelEvent) => {
      const zoomGesture = e.ctrlKey || e.metaKey;
      // 問題画像は等倍のときホイールをページのスクロールに任せる
      if (!zoomGesture && o.current.scrollAtRest && v.current.z <= 1.001) return;
      e.preventDefault();
      const p = local(e);
      if (zoomGesture) {
        const z = v.current.z * Math.exp(-e.deltaY * 0.01);
        zoomTo(z, p.x, p.y);
      } else {
        setView({ x: v.current.x - e.deltaX, y: v.current.y - e.deltaY });
      }
    };

    view.addEventListener('pointerdown', onDown);
    view.addEventListener('pointermove', onMove, { passive: false });
    view.addEventListener('pointerup', onUp);
    view.addEventListener('pointercancel', onUp);
    view.addEventListener('click', onClick, true);
    view.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      ro?.disconnect();
      window.clearTimeout(tapTimer);
      view.removeEventListener('pointerdown', onDown);
      view.removeEventListener('pointermove', onMove);
      view.removeEventListener('pointerup', onUp);
      view.removeEventListener('pointercancel', onUp);
      view.removeEventListener('click', onClick, true);
      view.removeEventListener('wheel', onWheel);
    };
  }, [apply, clampView, setView, zoomTo]);

  // 中身の大きさ・下の余白が変わったら収め直す
  useEffect(() => {
    v.current = clampView(v.current);
    apply(true);
  }, [opts.contentW, opts.contentH, opts.extraBottom, apply, clampView]);

  return {
    viewRef,
    contentRef,
    get: () => v.current,
    size: () => size.current,
    setView,
    zoomTo,
    reset: (animate = true) => setView({ x: 0, y: 0, z: 1 }, animate),
  };
}
