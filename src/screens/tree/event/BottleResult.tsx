/**
 * 届いたボトルの結果（ボード B07 正解・B08 不正解）。正解 / 不正解だけ（タイムボーナス・スコアは出さない）。
 *   正解: CORRECT! と +2PT・前 → 後・20 マスのバー・「??? まで あと n pt」/「トロフィーまで あと n pt」
 *   不正解: MISS と間違えた問題のカード（ResultScreen の WrongList = 問題・あなたの答え・スクショ・改善要望・問題 ID＋コピー。正解は出さない）
 *   下に「イベントへ」と「次のボトル n」
 */
import { useRef } from 'react';
import type { BottleResult as BottleResultData, BottleSession } from '../../../lib/treeApi';
import { rootClass } from '../treeTheme';
import { WrongList } from '../ResultScreen';
import { PointBar, PxBigCheck, PxCross } from './BottleParts';
import { BOTTLE_QTYPE } from './BottleScreen';
import '../../../styles/tree-event.css';
import '../../../styles/tree-bottle.css';
import '../../../styles/tree-bottle-screens.css';

interface Props {
  result: BottleResultData;
  session: BottleSession;
  subjectName: string;
  /** まだ解いていないボトルの数（0 なら「次のボトル」を出さない）*/
  nextCount: number;
  onEvent: () => void;
  onNext: () => void;
  onReport: (qid: string, message: string, label: string, img: string | null) => Promise<'sent' | 'already' | 'error'>;
  reported?: Record<string, 'sent' | 'already'>;
}

export function BottleResult({ result, session, subjectName, nextCount, onEvent, onNext, onReport, reported }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const first = session.questions[session.units[0]?.qids[0] ?? ''];
  const qtype = first?.type ?? result.results[0]?.type ?? session.qtype;
  const inviteAt = result.inviteAt ?? 50;
  const clearAt = result.clearAt ?? 100;
  const after = result.points.after;
  const toGo = after < inviteAt ? { label: '??? まで', n: inviteAt - after, color: '#7FEFFF' } : after < clearAt ? { label: 'トロフィーまで', n: clearAt - after, color: '#F6D58E' } : null;

  return (
    <div className={rootClass('ev-screen is-ev-bottle')} ref={root}>
      {result.correct && <div className="bt-ok-glow" aria-hidden="true" />}
      <div className="bt-rhead">
        <span className="ev-dot bt-rhead-text">
          <span className="ev-arc" style={{ fontSize: 7, color: '#F6D58E' }}>BOTTLE</span> · {subjectName} › {BOTTLE_QTYPE[qtype] ?? qtype} · 結果
        </span>
        <button type="button" className="ev-sqbtn ev-px2" aria-label="イベント画面へ戻る" onClick={onEvent}>
          <span className="ev-px2">
            <PxCross size={14} fill="#F2F5FF" />
          </span>
        </button>
      </div>

      <div className="ev-body bt-body">
        {result.correct ? (
          <>
            <div className="bt-center">
              <PxBigCheck size={110} />
              <span className="ev-arc bt-chrome is-glass" style={{ fontSize: 30, lineHeight: 1.2, filter: 'drop-shadow(3px 3px 0 #04261C)' }}>CORRECT!</span>
            </div>
            <div className="ev-shadow">
              <div className="ev-px ev-frame" style={{ background: '#F6D58E' }}>
                <div className="ev-px ev-card" style={{ padding: '14px 16px 15px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="ev-arc ev-px2 bt-pt-chip is-gold" style={{ fontSize: 10 }}>+{Math.max(0, result.gained)}PT</span>
                    <span className="ev-dot" style={{ fontSize: 15, color: '#C4D1E8' }}>
                      <span className="ev-arc" style={{ fontSize: 9 }}>{result.points.before}</span> →{' '}
                      <span className="ev-arc" style={{ fontSize: 12, color: '#F6D58E' }}>{after}</span> pt
                    </span>
                  </div>
                  <PointBar points={after} max={clearAt} inviteAt={inviteAt} label={false} />
                  <span className="ev-dot" style={{ fontSize: 12, color: '#A9BBD9' }}>
                    {toGo ? (
                      <>
                        {toGo.label} あと <span className="ev-arc" style={{ fontSize: 8, color: toGo.color }}>{toGo.n}</span> pt
                      </>
                    ) : (
                      <span className="ev-arc" style={{ fontSize: 8, color: '#F6D58E' }}>EVENT CLEAR</span>
                    )}
                  </span>
                  {result.stored && (
                    <span className="ev-dot" style={{ fontSize: 11, color: '#A9BBD9' }}>このボトルは採点済みです（前に送った答えの結果）。</span>
                  )}
                  <div className="ev-scan" style={{ opacity: 0.4 }} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bt-miss-head">
              <span style={{ display: 'block', filter: 'drop-shadow(4px 4px 0 #7A3A1E) drop-shadow(0 0 12px rgba(255,179,138,.45))' }}>
                <PxCross size={44} fill="#FFB38A" />
              </span>
              <span className="ev-arc bt-chrome is-miss" style={{ fontSize: 24, filter: 'drop-shadow(3px 3px 0 #2A0E00)' }}>MISS</span>
            </div>
            <div className="ev-dot" style={{ fontSize: 12, lineHeight: 1.6, color: '#A9BBD9', textAlign: 'center' }}>
              ポイントは増えません（正解したときだけ +2PT）。問題を見直して、次のボトルへ。
            </div>
            <WrongList results={result.results} session={session} layer={root} onReport={onReport} reported={reported} />
          </>
        )}
      </div>

      <div className="ev-foot">
        <div className="bt-foot-row">
          <button type="button" className="ev-ghost-wrap ev-px2" style={{ flex: 1 }} onClick={onEvent}>
            <span className="ev-px2 ev-ghost">
              <span className="ev-dot" style={{ fontSize: 15 }}>イベントへ</span>
            </span>
          </button>
          {nextCount > 0 && (
            <button type="button" className="ev-cta-wrap" style={{ flex: 1.3 }} onClick={onNext}>
              <span className="ev-px2 ev-cta" style={{ height: 50, gap: 8 }}>
                <span className="ev-dot" style={{ fontSize: 15 }}>次のボトル</span>
                <span className="ev-arc" style={{ fontSize: 8 }}>{nextCount}</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
