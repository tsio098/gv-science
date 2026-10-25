/**
 * ABYSS からの招待状（ボード B10・50 pt で 1 通・化学か生物の人だけ）。ABYSS の色・英語の文言（実装手順_ボトルメール §0-4）。
 * ANSWER で ABYSS の 1 問（制限時間なし・画面を離れたら即採点・1 回だけ）。LATER はイベント画面へ（問題はまだ決まらない）
 */
import { rootClass } from '../treeTheme';
import { PxBackIcon } from './EvParts';
import { PxInviteSeal } from './BottleParts';
import '../../../styles/tree-event.css';
import '../../../styles/tree-bottle.css';
import '../../../styles/tree-bottle-screens.css';

interface Props {
  /** 招待状の科目（化学・生物。まだ決まっていなければ null）*/
  subjectName: string | null;
  /** 開いたが答えていない（続きから）*/
  resume?: boolean;
  starting: boolean;
  message?: string | null;
  onLater: () => void;
  onAnswer: () => void;
}

/** 深海の粒（位置は固定）*/
export const DEEP_MOTES: [number, number, string][] = [
  [24, 120, '#00E5FF'], [62, 300, '#7FEFFF'], [330, 150, '#00E5FF'], [352, 380, '#7FEFFF'], [40, 520, '#00E5FF'], [300, 560, '#7FEFFF'],
  [180, 70, '#7FEFFF'], [120, 640, '#00E5FF'], [250, 700, '#7FEFFF'], [16, 760, '#00E5FF'], [360, 720, '#00E5FF'], [210, 460, '#7FEFFF'],
];

export function DeepMotes({ n = 12, dim = false }: { n?: number; dim?: boolean }) {
  return (
    <>
      {DEEP_MOTES.slice(0, n).map(([x, y, c], i) => (
        <span key={i} className="bt-mote" aria-hidden="true" style={{ left: `${(x / 390) * 100}%`, top: y, background: c, boxShadow: `0 0 6px ${c}`, opacity: dim ? 0.5 : 1 }} />
      ))}
    </>
  );
}

export function InviteScreen({ subjectName, resume = false, starting, message, onLater, onAnswer }: Props) {
  return (
    <div className={rootClass('ev-screen is-ev-bottle bt-deep')}>
      <DeepMotes />
      <div className="ev-head">
        <button type="button" className="ev-sqbtn ev-px2" aria-label="Back" onClick={onLater}>
          <span className="ev-px2">
            <PxBackIcon fill="#E8EEFF" />
          </span>
        </button>
        <span className="ev-arc" style={{ fontSize: 8, color: '#8A9AC8', letterSpacing: '.1em' }}>
          ABYSS{subjectName ? ` · ${subjectName}` : ''}
        </span>
      </div>

      <div className="ev-body bt-body">
        {message && (
          <div className="ev-msg ev-dot" role="alert">
            {message}
          </div>
        )}
        <div className="bt-invite-shadow">
          <div className="ev-px bt-invite-frame">
            <div className="ev-px bt-invite">
              <div className="bt-invite-flap" aria-hidden="true" />
              <span className="bt-invite-seal" style={{ filter: 'drop-shadow(3px 3px 0 #01060F) drop-shadow(0 0 14px rgba(0,229,255,.7))' }}>
                <PxInviteSeal size={60} style={{ filter: 'none' }} />
              </span>
              <span className="ev-arc" style={{ marginTop: 44, fontSize: 8, color: '#8A9AC8', letterSpacing: '.14em' }}>AN INVITATION</span>
              <h1 className="ev-arc bt-chrome is-abyss" style={{ margin: 0, fontSize: 18, lineHeight: 1.5, fontWeight: 400 }}>FROM THE ABYSS</h1>
              <p className="bt-en" lang="en" style={{ margin: 0, fontSize: 15, lineHeight: 1.75, color: '#E8EEFF' }}>
                Your bottles have reached the deep.
                <br />
                The ABYSS has one question for you.
                <br />
                Answer it, and a piece of the way down
                <br />
                will be yours.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                <span className="ev-arc ev-px2 bt-invite-chip">ONE QUESTION</span>
                <span className="ev-arc ev-px2 bt-invite-chip">ONE CHANCE</span>
                <span className="ev-arc ev-px2 bt-invite-chip">NO TIME LIMIT</span>
              </div>
              <span className="bt-en" lang="en" style={{ fontSize: 12, lineHeight: 1.6, color: '#8A9AC8' }}>
                If you leave this screen, your answer is sealed.
              </span>
              <span className="ev-arc" style={{ alignSelf: 'flex-end', fontSize: 8, color: '#00E5FF' }}>— THE ABYSS</span>
              <div className="ev-scan" style={{ opacity: 0.3 }} />
            </div>
          </div>
        </div>
      </div>

      <div className="ev-foot bt-deep-foot">
        <div className="bt-foot-row">
          <button type="button" className="ev-px2 bt-deep-ghost" onClick={onLater}>
            <span className="ev-px2 ev-arc" style={{ fontSize: 9 }}>LATER</span>
          </button>
          <button type="button" className="bt-deep-cta" disabled={starting} onClick={onAnswer}>
            <span className="ev-px2 ev-arc" style={{ fontSize: 10 }}>{starting ? '...' : resume ? 'CONTINUE' : 'ANSWER'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
