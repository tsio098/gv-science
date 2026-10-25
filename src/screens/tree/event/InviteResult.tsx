/**
 * 招待状の結果（ボード B11 正解 = 欠片・B11b 不正解 = NOT YET.）。イベント画面の欠片のカードから来たときも B11（correct）。
 *   正解: CORRECT / "A piece of the way down is yours." / YOUR PIECE k/len・33 マスで自分の文字だけ光る・スクショ（欠片のカード）・ABYSS を見る
 *   不正解: 灰色の封蝋・NOT YET. / THIS INVITATION IS CLOSED（再挑戦なし・先生 2026-10-25）
 */
import { useRef } from 'react';
import type { BottleFragment } from '../../../lib/treeApi';
import { rootClass } from '../treeTheme';
import { PlayShot } from '../PlayShot';
import { FragGrid, PxCamera, PxCross, PxInviteSeal } from './BottleParts';
import { DeepMotes } from './InviteScreen';
import '../../../styles/tree-event.css';
import '../../../styles/tree-bottle.css';
import '../../../styles/tree-bottle-screens.css';

interface Props {
  correct: boolean;
  fragment: BottleFragment | null;
  onEvent: () => void;
  onTree: () => void;
  onAbyss?: () => void;
}

export function InviteResult({ correct, fragment, onEvent, onTree, onAbyss }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const n = fragment?.cells.length ?? 0;
  const len = fragment?.len ?? 33;
  return (
    <div className={rootClass('ev-screen is-ev-bottle bt-deep')} ref={root}>
      <DeepMotes n={correct ? 10 : 8} dim={!correct} />
      {!correct && <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 320, background: 'linear-gradient(180deg,rgba(2,5,14,0),#000208)', pointerEvents: 'none' }} />}

      <div className="bt-rhead">
        <span className="ev-dot bt-rhead-text" style={{ color: '#8A9AC8' }}>
          <span className="ev-arc" style={{ fontSize: 7, color: correct ? '#00E5FF' : '#8A9AC8' }}>INVITATION</span> · 結果
        </span>
        <button type="button" className="ev-sqbtn ev-px2" aria-label={correct ? 'イベント画面へ戻る' : 'Back to the event'} onClick={onEvent}>
          <span className="ev-px2">
            <PxCross size={14} fill="#E8EEFF" />
          </span>
        </button>
      </div>

      <div className="ev-body bt-body">
        {correct ? (
          <>
            <div className="bt-center" style={{ gap: 12, margin: '120px 0 18px' }}>
              <span className="ev-arc bt-chrome is-abyss" style={{ fontSize: 20, lineHeight: 1.3 }}>CORRECT</span>
              <span className="bt-en" lang="en" style={{ fontSize: 15, color: '#E8EEFF' }}>
                A piece of the way down is yours.
              </span>
            </div>
            <div className="bt-frag-shadow" ref={card}>
              <div className="ev-px bt-abyss-frame" style={{ background: '#00E5FF' }}>
                <div className="ev-px bt-frag-card" style={{ background: 'linear-gradient(180deg,#111E3E,#0A1328)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span className="ev-arc" style={{ fontSize: 7, color: '#8A9AC8' }}>ABYSS UNLOCK</span>
                    <span className="ev-arc" style={{ fontSize: 7, color: '#00E5FF' }}>
                      YOUR PIECE {n}/{len}
                    </span>
                  </div>
                  <FragGrid fragment={fragment} cell={24} cols={11} label={`開放条件の文 ${len} 文字のうち、あなたの欠片 ${n} 文字だけが見えている`} />
                  <div className="ev-scan" style={{ opacity: 0.3 }} />
                </div>
              </div>
            </div>
            <div className="ev-dot" style={{ fontSize: 12, lineHeight: 1.6, color: '#8A9AC8', marginTop: 4 }}>
              見えるのは自分の欠片だけ。ほかの人の欠片と合わせると、ABYSS の開放条件が分かる。
            </div>
          </>
        ) : (
          <div className="bt-center" style={{ gap: 22, margin: '110px 0 18px', padding: '0 12px' }}>
            <span style={{ display: 'block', filter: 'drop-shadow(3px 3px 0 #01060F)' }}>
              <PxInviteSeal size={76} closed />
            </span>
            <span className="ev-arc" style={{ fontSize: 26, lineHeight: 1.2, color: '#8A9AC8', textShadow: '3px 3px 0 #01060F' }}>NOT YET.</span>
            <p className="bt-en" lang="en" style={{ margin: 0, fontSize: 18, lineHeight: 1.7, color: '#E8EEFF' }}>
              You&apos;re not ready
              <br />
              for the ABYSS — yet.
            </p>
            <p className="bt-en" lang="en" style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#8A9AC8' }}>
              Keep diving through the ROUTE.
              <br />
              The deep can wait.
            </p>
            <span className="ev-arc ev-px2" style={{ padding: '6px 8px', fontSize: 7, background: 'rgba(232,238,255,.1)', color: '#8A9AC8' }}>
              THIS INVITATION IS CLOSED
            </span>
          </div>
        )}
      </div>

      <div className={`ev-foot bt-deep-foot${correct ? '' : ' is-closed'}`}>
        {correct ? (
          <div className="bt-foot-row">
            <PlayShot target={card} layer={root} className="ev-px2 bt-shot">
              <PxCamera size={14} fill="#00E5FF" />
              スクショ
            </PlayShot>
            {onAbyss ? (
              <button type="button" className="bt-deep-cta" style={{ flex: 1.4 }} onClick={onAbyss}>
                <span className="ev-px2 ev-dot">ABYSS を見る</span>
              </button>
            ) : (
              <button type="button" className="bt-deep-cta" style={{ flex: 1.4 }} onClick={onEvent}>
                <span className="ev-px2 ev-dot">イベントへ</span>
              </button>
            )}
          </div>
        ) : (
          <div className="bt-foot-row">
            <button type="button" className="ev-px2 bt-deep-ghost is-closed" onClick={onEvent}>
              <span className="ev-px2 ev-dot">イベントへ</span>
            </button>
            <button type="button" className="bt-deep-cta is-closed" style={{ flex: 1.4 }} onClick={onTree}>
              <span className="ev-px2 ev-dot">ツリーへ</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
