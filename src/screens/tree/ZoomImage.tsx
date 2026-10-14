/**
 * 出題画面の問題画像（設計書 §4.6）。その場でピンチして 1〜4 倍・ダブルタップで等倍、
 * タップか右下のボタンで全画面ビューア（PlayZoomScreen）を開く（単問の出題画面は枠の右上に別のボタンを置くので btn=false）。
 * 等倍のときは 1 本指の縦ドラッグをページのスクロールに任せる（リード文が長いセットで画像の上からもスクロールできるように）。
 */
import { usePanZoom } from './usePanZoom';
import { Ico } from './TreeIcons';

export function ZoomImage({ src, alt, onOpen, btn = true }: { src: string; alt: string; onOpen: () => void; btn?: boolean }) {
  const pz = usePanZoom({
    contentW: 0,
    contentH: 0,
    minZ: 1,
    maxZ: 4,
    scrollAtRest: true,
    onTap: onOpen,
    onDoubleTap: () => pz.reset(),
  });
  return (
    <div className="tr-zimg" ref={pz.viewRef}>
      <div ref={pz.contentRef} className="tr-zimg-content">
        <img src={src} alt={alt} draggable={false} />
      </div>
      {btn && (
        <button
          type="button"
          className="tr-zimg-btn"
          aria-label="問題画像を全画面で拡大"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onOpen();
          }}
        >
          <Ico id="i-expand" size={14} />
        </button>
      )}
    </div>
  );
}
