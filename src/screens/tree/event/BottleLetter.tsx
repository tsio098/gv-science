/**
 * 届いたボトルを開く（ボード B05・羊皮紙の手紙）。From・科目 / 種別 / 1 問・流した人のひとこと（空欄なら「この問題、解ける？」）・「正解すると +2PT」・赤い封蝋。
 * 「ボトルを開けて解く」で出題（制限時間なし・画面を離れたら即採点）。「あとで」はイベント画面へ戻る（時計は動かない）
 */
import type { BottleInboxItem } from '../../../lib/treeApi';
import { rootClass } from '../treeTheme';
import { PxBackIcon } from './EvParts';
import { PxBottle, PxLetterSeal } from './BottleParts';
import { BOTTLE_NOTE_DEFAULT, BOTTLE_QTYPE } from './BottleScreen';
import '../../../styles/tree-event.css';
import '../../../styles/tree-bottle.css';
import '../../../styles/tree-bottle-screens.css';

interface Props {
  item: BottleInboxItem;
  /** 未回答のボトルのうち何通目か（1 から）*/
  index: number;
  total: number;
  subjectName: (s: string) => string;
  starting: boolean;
  message?: string | null;
  onBack: () => void;
  onOpen: () => void;
}

/** 'M/D H:MM'（JST）*/
const mdhm = (ms: number) => {
  const d = new Date(ms + 9 * 3600_000);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};

export function BottleLetter({ item, index, total, subjectName, starting, message, onBack, onOpen }: Props) {
  const started = item.state === 'started';
  return (
    <div className={rootClass('ev-screen is-ev-bottle')}>
      <div className="bt-glow" aria-hidden="true" />

      <div className="ev-head">
        <button type="button" className="ev-sqbtn ev-px2" aria-label="イベント画面へ戻る" onClick={onBack}>
          <span className="ev-px2">
            <PxBackIcon fill="#F2F5FF" />
          </span>
        </button>
        <h1 className="bt-htitle">
          <span className="ev-dot" style={{ fontSize: 18 }}>届いたボトル</span>
          <span className="ev-arc" style={{ fontSize: 7, color: '#A9BBD9' }}>
            {Math.max(1, index)} OF {Math.max(1, total)}
          </span>
        </h1>
      </div>

      <div className="ev-body bt-body">
        {message && (
          <div className="ev-msg ev-dot" role="alert">
            {message}
          </div>
        )}
        <div className="bt-letter-shadow">
          <svg viewBox="0 0 4 3" width="24" height="18" shapeRendering="crispEdges" aria-hidden="true" style={{ position: 'absolute', right: 96, top: -54, transform: 'rotate(-20deg)' }}>
            <path fill="#C08A4A" d="M1 0h2v3H1z" />
            <path fill="#8A5A2B" d="M0 0h1v3H0zM3 0h1v3H3z" />
          </svg>
          <PxBottle size={70} tilt={24} style={{ position: 'absolute', right: 6, top: -86, filter: 'drop-shadow(4px 4px 0 #04102A) drop-shadow(0 0 12px rgba(126,235,198,.4))' }} />
          <div className="ev-px bt-letter-frame">
            <div className="ev-px bt-letter">
              <span className="bt-letter-band" style={{ top: 0, position: 'absolute' }} aria-hidden="true" />
              <span className="bt-letter-band" style={{ bottom: 0, position: 'absolute' }} aria-hidden="true" />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span className="ev-arc" style={{ fontSize: 9, color: '#7E5A1E' }}>A MESSAGE</span>
                <span className="ev-arc" style={{ fontSize: 7, color: '#7E5A1E' }}>{mdhm(item.sentAt)}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span className="ev-dot" style={{ fontSize: 13, color: '#6A4A1A' }}>From</span>
                <span className="ev-dot" style={{ fontSize: 24, color: '#2A1A06', wordBreak: 'break-all' }}>{item.from ?? 'だれか'}</span>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <span className="ev-px2 ev-dot bt-letter-chip is-dark">{subjectName(item.subject)}</span>
                <span className="ev-px2 ev-dot bt-letter-chip">{BOTTLE_QTYPE[item.qtype] ?? item.qtype}</span>
                <span className="ev-px2 ev-dot bt-letter-chip">1 問</span>
                {item.stage === 'back' && <span className="ev-px2 ev-arc bt-letter-chip" style={{ fontSize: 8 }}>ABYSS</span>}
              </div>
              <span className="ev-dot" style={{ fontSize: 15, lineHeight: 1.85, color: '#3A2608', wordBreak: 'break-all' }}>
                {item.note?.trim() || BOTTLE_NOTE_DEFAULT}
                <br />
                正解すると <span className="ev-arc" style={{ fontSize: 10, color: '#9A3A1E' }}>+2PT</span>
              </span>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <PxLetterSeal size={34} />
              </div>
            </div>
          </div>
        </div>
        <div className="ev-dot" style={{ fontSize: 12, lineHeight: 1.6, color: '#A9BBD9', marginTop: 6 }}>
          {started
            ? '前に開いたボトルです。開くと、決めた答えで採点します（続きは解けません）。'
            : '制限時間はありません。解いている途中で画面を離れる（アプリの切り替え・ホーム・画面ロック）と、その時点で採点されます。'}
        </div>
      </div>

      <div className="ev-foot">
        <div className="bt-foot-row">
          <button type="button" className="ev-ghost-wrap ev-px2" style={{ flex: 1 }} onClick={onBack}>
            <span className="ev-px2 ev-ghost" style={{ height: 48 }}>
              <span className="ev-dot" style={{ fontSize: 15 }}>あとで</span>
            </span>
          </button>
          <button type="button" className="ev-cta-wrap" style={{ flex: 2 }} disabled={starting} onClick={onOpen}>
            <span className="ev-px2 ev-cta">
              <span className="ev-dot" style={{ fontSize: 17 }}>{starting ? '準備中…' : started ? '開いて採点する' : 'ボトルを開けて解く'}</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
