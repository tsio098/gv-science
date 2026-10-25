/**
 * ABYSS が未開放のときのシート（ボード B12・2026-10-25 先生「ABYSS の開放条件は画面に出さない」）。
 * 条件の文（33 字）は伏せたマスで出し、招待状に正解した人だけ自分の欠片の文字が光る。ツリーの鍵つきの ABYSS ボタンから開く
 */
import type { BottleFragment } from '../../../lib/treeApi';
import { FragGrid, PxAnchor } from './BottleParts';
import '../../../styles/tree-bottle.css';

export function AbyssLockedSheet({ fragment, onEvent, onClose }: { fragment: BottleFragment | null; onEvent?: () => void; onClose: () => void }) {
  return (
    <div className="tr-overlay bt-lock-overlay" role="dialog" aria-label="ABYSS（未開放）" onClick={onClose}>
      <div className="bt-lock-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="bt-lock-frame">
          <div className="bt-lock-body">
            <div className="bt-lock-head">
              <PxAnchor size={20} glow />
              <span className="ev-arc" style={{ fontSize: 11, color: '#00E5FF', letterSpacing: '.12em' }}>ABYSS</span>
              <span className="ev-px2 ev-dot bt-lock-tag">未開放</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              <span className="ev-dot" style={{ fontSize: 13, color: '#8A9AC8' }}>招待状の欠片</span>
              <FragGrid
                fragment={fragment}
                cell={24}
                label={fragment ? `開放条件の文は伏せてある。あなたの欠片 ${fragment.cells.length} 文字だけ見えている` : '開放条件の文は伏せてある'}
              />
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {onEvent && (
                <button type="button" className="bt-lock-cta" onClick={onEvent}>
                  <span className="ev-px2 ev-dot">イベントへ</span>
                </button>
              )}
              <button type="button" className="ev-px2 bt-lock-close" onClick={onClose}>
                <span className="ev-px2 ev-dot">閉じる</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
