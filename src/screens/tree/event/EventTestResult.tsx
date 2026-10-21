/**
 * 季節イベントのテストの結果（ボード E04）。SCORE n/20・PASS・正答率・ライン 90% の印（2026-10-21 先生: 80% → 90%） → 合格ならチケット（10/31 のみ使用可能）。
 * 時間ボーナスなし・正解は出さない（ほかの結果画面と同じ）。TICKET GET! の通知は TreeRoot がこの画面に入ってから出す
 */
import type { SeasonEventTestResult } from '../../../lib/treeApi';
import { gradeLabel } from '../../../lib/treeApi';
import { fmtTime, rootClass } from '../treeTheme';
import { EV_ASSET, EV_TEST_PASS_PCT, evMd } from './evTheme';
import { EvDayTag, PxLock, PxStar } from './EvParts';
import '../../../styles/tree-event.css';

interface Props {
  result: SeasonEventTestResult;
  subjectName: string;
  grade: string;
  nickname: string;
  staff: boolean;
  onBack: () => void;
  onEvent: () => void;
  onDressUp?: () => void;
  onTickets?: () => void;
}

export function EventTestResult({ result, subjectName, grade, nickname, staff, onBack, onEvent, onDressUp, onTickets }: Props) {
  const ev = result.event;
  const a = EV_ASSET(ev.kind);
  const s = result.summary;
  const pct = s.total ? Math.floor((s.correct / s.total) * 100 + 1e-9) : 0;
  const t = result.ticket;
  return (
    <div className={rootClass('ev-screen ev-result is-ev-' + ev.kind)}>
      <div aria-hidden="true" className="ev-rays" />
      <div className="ev-result-head">
        <span className="ev-arc" style={{ fontSize: 10, color: '#FFDD33' }}>EVENT TEST</span>
        <span className="ev-dot" style={{ fontSize: 13, color: 'var(--ev-sub)' }}>
          {ev.name} · {subjectName} · 結果
        </span>
      </div>

      <div className="ev-body" style={{ paddingTop: 12 }}>
        <div className="ev-shadow is-test">
          <div className="ev-px ev-frame" style={{ background: s.pass ? '#FFDD33' : 'rgba(255,241,224,.4)' }}>
            <div className="ev-px ev-card" style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <span className="ev-arc" style={{ fontSize: 7, color: 'var(--ev-sub)' }}>SCORE</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span className="ev-arc ev-chrome is-gold" style={{ fontSize: 34, lineHeight: 1 }}>{s.correct}</span>
                    <span className="ev-arc" style={{ fontSize: 12, color: 'var(--ev-sub)' }}>/{s.total}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <span className={`ev-arc ev-px2 ev-pass${s.pass ? '' : ' is-miss'}`}>{s.pass ? 'PASS' : 'MISS'}</span>
                  <span className="ev-arc" style={{ fontSize: 16, color: '#FFFFFF' }}>{pct}%</span>
                </div>
              </div>
              <div className="ev-testbar">
                <span style={{ width: `${pct}%` }} />
                <i style={{ left: `${s.total ? (s.passAt / s.total) * 100 : EV_TEST_PASS_PCT}%` }} aria-hidden="true" />
              </div>
              <div className="ev-dot" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--ev-sub)' }}>
                <span>
                  経過 <span className="ev-arc" style={{ fontSize: 8, color: 'var(--ev-text)' }}>{fmtTime(s.elapsedMs)}</span>
                </span>
                <span>
                  ライン <span className="ev-arc" style={{ fontSize: 8, color: 'var(--ev-text)' }}>{EV_TEST_PASS_PCT}%</span>（{s.passAt} 問）
                </span>
              </div>
              <div className="ev-scan" style={{ opacity: 0.4 }} />
            </div>
          </div>
        </div>

        {t ? (
          <>
            <div className="ev-ticket" role="group" aria-label={`${ev.name} ボーナスチケット ${subjectName} CLEAR`}>
              <div className="ev-ticket-in">
                <PxStar size={12} fill="#FFFFFF" style={{ position: 'absolute', left: 30, top: 40 }} />
                <PxStar size={9} fill="#C9A2FF" style={{ position: 'absolute', right: 34, top: 96 }} />
                <div className="ev-ticket-main">
                  <img src={a.icon2x} alt="" style={{ width: 66, height: 66, display: 'block', imageRendering: 'pixelated' }} />
                  <img src={a.text2} alt={ev.name} style={{ width: 178, height: 'auto', display: 'block' }} />
                  <span className="ev-arc" style={{ fontSize: 8, letterSpacing: '.3em', color: 'var(--ev-main)' }}>BONUS TICKET</span>
                  <span style={{ fontSize: 15, marginTop: 4 }}>
                    <span className="ev-dot">{subjectName}</span> <span className="ev-arc" style={{ fontSize: 10 }}>CLEAR</span>
                  </span>
                  <span className="ev-arc" style={{ fontSize: 7, color: 'var(--ev-accent)' }}>MASTER 100% · TEST {Math.round((t.testRate ?? s.rate) * 100)}%</span>
                  <span className="ev-dot" style={{ fontSize: 12, color: 'var(--ev-sub)' }}>
                    {gradeLabel(grade)} · {nickname}
                  </span>
                  <span className="ev-dot" style={{ marginTop: 'auto', fontSize: 11, color: 'var(--ev-sub)' }}>先生へ提示してください</span>
                  {t.usableFrom != null && <EvDayTag from={t.usableFrom} />}
                </div>
                <div className="ev-ticket-cut" aria-hidden="true" />
                <div className="ev-ticket-stub">
                  <PxLock size={16} />
                  <span className="ev-arc" style={{ fontSize: 7, letterSpacing: '.2em', color: 'var(--ev-sub)' }}>
                    SWIPE ON {t.usableFrom != null ? evMd(t.usableFrom) : ''}
                  </span>
                </div>
              </div>
              <span aria-hidden="true" className="ev-ticket-notch a" />
              <span aria-hidden="true" className="ev-ticket-notch b" />
            </div>
            <span className="ev-arc" style={{ textAlign: 'center', fontSize: 9, color: '#FFC872' }}>TICKET GET!</span>
          </>
        ) : (
          <div className="ev-px2 ev-note-frame">
            <div className="ev-px2 ev-note">
              <span className="ev-dot" style={{ fontSize: 12, color: 'var(--ev-sub)', lineHeight: 1.6 }}>
                {s.pass
                  ? staff
                    ? '合格です（先生用アカウントにはチケットは出ません）。'
                    : '合格です。チケットはチケット画面で確かめてください。'
                  : `合格ライン（${s.passAt} 問）に届きませんでした。テストは 1 回だけです。イベントの挑戦は期間中いつでも続けられます。`}
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="ev-foot" style={{ background: 'transparent', borderTop: 0 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="ev-ghost-wrap ev-px2" style={{ flex: 1 }} onClick={t ? onBack : onEvent}>
            <span className="ev-px2 ev-ghost">
              <span className="ev-dot" style={{ fontSize: 15 }}>{t ? 'ツリーへ' : 'イベントへ'}</span>
            </span>
          </button>
          {t && onDressUp ? (
            <button type="button" className="ev-cta-wrap" style={{ flex: 1.6 }} onClick={onDressUp}>
              <span className="ev-px2 ev-cta">
                <span className="ev-dot" style={{ fontSize: 16 }}>着せ替えへ</span>
              </span>
            </button>
          ) : t && onTickets ? (
            <button type="button" className="ev-cta-wrap" style={{ flex: 1.6 }} onClick={onTickets}>
              <span className="ev-px2 ev-cta">
                <span className="ev-dot" style={{ fontSize: 16 }}>チケットを見る</span>
              </span>
            </button>
          ) : (
            <button type="button" className="ev-cta-wrap" style={{ flex: 1.6 }} onClick={onBack}>
              <span className="ev-px2 ev-cta">
                <span className="ev-dot" style={{ fontSize: 16 }}>ツリーへ</span>
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
