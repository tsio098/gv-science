/**
 * 問題画像の全画面ビューア（設計書 §4.6 / モック PlayZoom.dc.html）。
 * 深い背景・リード文 / 設問の切替・ピンチとドラッグ・「− / 等倍 / +」・「解答にもどる」。
 * 出題画面の上に重ねて出すだけなので、タイマーは止まらない。
 */
import { useEffect, useState } from 'react';
import { usePanZoom } from './usePanZoom';
import { Ico } from './TreeIcons';

export interface ZoomTab {
  label: string;
  path: string;
}

const STEP = 0.4;

function ZoomStage({ url, alt, onClose }: { url: string | 'error' | undefined; alt: string; onClose: () => void }) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [stageW, setStageW] = useState(0);
  const [pct, setPct] = useState(100);
  const fitW = Math.max(0, stageW - 32);
  const fitH = natural ? (fitW * natural.h) / natural.w : 0;
  const pz = usePanZoom({
    contentW: fitW,
    contentH: fitH,
    minZ: 1,
    maxZ: 4,
    alignY: 'center',
    onDoubleTap: () => pz.reset(),
    onZoom: (z) => setPct(Math.round(z * 100)),
  });

  useEffect(() => {
    const el = pz.viewRef.current;
    if (!el) return;
    const update = () => setStageW(el.clientWidth);
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const zoom = (z: number) => pz.zoomTo(z, undefined, undefined, true);

  return (
    <>
      <div className="tr-zoom-stage" ref={pz.viewRef}>
        <div ref={pz.contentRef} style={{ position: 'absolute', left: 0, top: 0, transformOrigin: '0 0' }}>
          {url && url !== 'error' && (
            <img
              src={url}
              alt={alt}
              draggable={false}
              className="tr-zoom-img"
              style={{ width: fitW, height: fitH || undefined }}
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth || 1, h: e.currentTarget.naturalHeight || 1 })}
            />
          )}
        </div>
        {!url && <div className="tr-center">読み込み中…</div>}
        {url === 'error' && <div className="tr-center">画像を読み込めませんでした</div>}
        <div className="tr-zoom-hint">ピンチで拡大 · ドラッグで移動 · ダブルタップで等倍</div>
      </div>
      <div className="tr-zoom-ctrl">
        <button type="button" aria-label="縮小" className="tr-num" onClick={() => zoom(pz.get().z - STEP)}>
          −
        </button>
        <button type="button" className="is-reset" onClick={() => pz.reset()}>
          等倍
        </button>
        <button type="button" aria-label="拡大" className="tr-num" onClick={() => zoom(pz.get().z + STEP)}>
          +
        </button>
        <span className="tr-num tr-zoom-pct">{pct}%</span>
        <div style={{ flex: 1 }} />
        <button type="button" className="tr-zoom-back" onClick={onClose}>
          解答にもどる
        </button>
      </div>
    </>
  );
}

export function PlayZoomScreen({
  tabs,
  initial,
  imgs,
  onClose,
}: {
  tabs: ZoomTab[];
  initial: number;
  imgs: Record<string, string | 'error'>;
  onClose: () => void;
}) {
  const [tab, setTab] = useState(Math.min(Math.max(0, initial), tabs.length - 1));
  const cur = tabs[tab];
  return (
    <div className="tr-zoom" role="dialog" aria-label="問題画像の拡大">
      <div className="tr-zoom-bar">
        <button type="button" className="tr-iconbtn" aria-label="閉じる" onClick={onClose}>
          <Ico id="i-close" size={16} />
        </button>
        {tabs.length > 1 && (
          <div className="tr-zoom-tabs" role="tablist">
            {tabs.map((t, i) => (
              <button
                key={t.path}
                type="button"
                role="tab"
                aria-selected={i === tab}
                className={i === tab ? 'is-on' : ''}
                onClick={() => setTab(i)}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {cur && <ZoomStage key={cur.path} url={imgs[cur.path]} alt={cur.label} onClose={onClose} />}
    </div>
  );
}
