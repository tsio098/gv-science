/**
 * Message in a Bottle のイベント画面（ボード B02・実装手順_ボトルメール §3-3）。
 *   見出し（戻る・ロゴ・期間）→ EVENT POINTS（大きい数字・流した n 通 +n・正解 n 本 +2n・20 マスのバー・50 は「50 ???」）
 *   → 今日流せる（ボトル 2 本の印・n/2）→ ???（50 pt・招待状が届いた人だけ・ABYSS の色）→ INBOX → 招待状の欠片のカード（正解した人だけ）
 *   → 下に「ボトルを流す +1PT」
 * 50 pt の中身（ABYSS からの招待状）はここでも書かない（「???」「深海から 何かが届いた」だけ・先生 2026-10-25）
 * 上部（2026-10-25 夜・ボード B02 案・先生採用）: ホームのバナーと同じ月夜の海の絵（上 210px・右寄せ・下 28% を地へぼかし・左から暗く）の上に
 *   ロゴ（MESSAGE 11px / —IN A— 8px / BOTTLE 29px）と期間。前の月の飾り（bt-glow・bt-moon）は外した。中身は絵の高さ −12px から
 */
import type { BottleInboxItem, BottleState } from '../../../lib/treeApi';
import { rootClass } from '../treeTheme';
import { evLeftText, evPeriod, useEvNow } from './evTheme';
import { PxBackIcon } from './EvParts';
import { FragGrid, PointBar, PxAnchor, PxBottle, PxInviteSeal, bottleWhen } from './BottleParts';
import '../../../styles/tree-event.css';
import '../../../styles/tree-bottle.css';
import '../../../styles/tree-bottle-screens.css';

/** 種別の短い名前（行・手紙・見出し）*/
export const BOTTLE_QTYPE: Record<string, string> = { tf: '正誤', calc: '計算', reason: '考察' };
/** 届いた手紙の一文。流す人がひとことを書かなかったらこれ（2026-10-26 先生）*/
export const BOTTLE_NOTE_DEFAULT = 'この問題、解ける？';
/** ひとことの上限の字数（Proxy の BOTTLE_NOTE_MAX と同じ・字数は Array.from で数える）*/
export const BOTTLE_NOTE_MAX = 30;

interface Props {
  state: BottleState;
  subjectName: (s: string) => string;
  message?: string | null;
  onBack: () => void;
  onSend: () => void;
  onLetter: (item: BottleInboxItem) => void;
  onInvite: () => void;
  onFragment: () => void;
  /** 先生用 生徒の状況（2026-10-30・イベントの状況と同じ画面）*/
  onStaffView?: () => void;
}

export function BottleScreen({ state, subjectName, message, onBack, onSend, onLetter, onInvite, onFragment, onStaffView }: Props) {
  const now = useEvNow();
  const ev = state.event!;
  const open = ev.phase === 'open';
  const staff = !!state.staff;
  const left = Math.max(0, state.todayLeft);
  const canSend = open && (staff || left > 0);
  const unread = state.inbox.filter((b) => b.state !== 'answered').length;
  const invite = state.invite;
  const showMystery = open && (state.mystery || invite?.state === 'opened');
  const correctN = state.solved;

  return (
    <div className={rootClass('ev-screen is-ev-bottle')}>
      <div className="bt-hero" aria-hidden="true">
        <img src="/tree/brand/ev/banner-bg_ev_bottle@2x.png" alt="" draggable={false} />
        <span className="bt-hero-shade" />
      </div>

      <div className="ev-head">
        <button type="button" className="ev-sqbtn ev-px2" aria-label="ツリーへ戻る" onClick={onBack}>
          <span className="ev-px2">
            <PxBackIcon fill="#F2F5FF" />
          </span>
        </button>
      </div>
      <h1 className="bt-hero-title">
        <span className="bt-logo" role="img" aria-label="MESSAGE IN A BOTTLE" style={{ gap: 8 }}>
          <span className="bt-logo-row" style={{ gap: 8 }}>
            <span className="ev-arc bt-chrome" style={{ fontSize: 11 }}>MESSAGE</span>
            <span className="bt-hero-ina">
              <i />
              <span className="ev-arc bt-ina" style={{ fontSize: 8 }}>IN A</span>
              <i />
            </span>
          </span>
          <span className="ev-arc bt-chrome" style={{ fontSize: 29 }}>BOTTLE</span>
        </span>
        <span className="ev-dot bt-hero-period">
          <span className="ev-arc" style={{ fontSize: 8 }}>{evPeriod(ev.startAt, ev.endAt)}</span>
          {open ? ` · ${evLeftText(ev.endAt, now)}` : ev.phase === 'soon' ? ' · まもなく' : ' · 終了'}
        </span>
      </h1>

      <div className="ev-body bt-body is-hero">
        {message && (
          <div className="ev-msg ev-dot" role="alert">
            {message}
          </div>
        )}

        <div className="ev-shadow">
          <div className="ev-px ev-frame" style={{ background: '#F6D58E' }}>
            <div className="ev-px ev-card bt-points">
              <div className="bt-points-top">
                <div className="bt-points-num">
                  <span className="ev-arc" style={{ fontSize: 7, color: '#A9BBD9' }}>EVENT POINTS</span>
                  <span style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span className="ev-arc bt-chrome" style={{ fontSize: 32 }}>{state.points}</span>
                    <span className="ev-arc" style={{ fontSize: 9, color: '#A9BBD9' }}>/{state.clearAt}PT</span>
                  </span>
                </div>
                <div className="ev-dot bt-points-break">
                  <span>
                    流した {state.sent} 通<span className="ev-arc" style={{ fontSize: 8, color: '#7EEBC6' }}>+{state.sent}</span>
                  </span>
                  <span>
                    正解 {correctN} 本<span className="ev-arc" style={{ fontSize: 8, color: '#F6D58E' }}>+{correctN * 2}</span>
                  </span>
                </div>
              </div>
              <PointBar points={state.points} max={state.clearAt} inviteAt={state.inviteAt} />
              {state.cleared && (
                <span className="ev-dot" style={{ fontSize: 12, color: '#F6D58E' }}>
                  <span className="ev-arc" style={{ fontSize: 8 }}>EVENT CLEAR</span> · EVENT トロフィーを獲得しました
                </span>
              )}
              <div className="ev-scan" style={{ opacity: 0.45 }} />
            </div>
          </div>
        </div>

        <div className="ev-px2 bt-thin-frame">
          <div className="ev-px2 bt-thin">
            <span className="ev-dot" style={{ fontSize: 13, color: '#F2F5FF' }}>今日 流せる</span>
            <span style={{ display: 'flex', gap: 6 }} role="img" aria-label={staff ? '先生用は上限なし' : `今日はあと ${left} 通流せる`}>
              {Array.from({ length: state.daily }, (_, i) => (
                <PxBottle key={i} size={18} variant={staff || i < left ? 'glass' : 'dim'} />
              ))}
            </span>
            <span className="ev-arc" style={{ fontSize: 9, color: left > 0 || staff ? '#7EEBC6' : '#FFB38A' }}>
              {staff ? '∞' : `${left}/${state.daily}`}
            </span>
            {!open && (
              <span className="ev-dot" style={{ marginLeft: 'auto', fontSize: 11, color: '#A9BBD9' }}>
                {ev.phase === 'soon' ? '開催前' : '期間外'}
              </span>
            )}
          </div>
        </div>

        {showMystery && (
          <button type="button" className="bt-abyss-shadow" onClick={onInvite} aria-label={invite?.state === 'opened' ? '深海から届いたものを続きから開く' : '深海から届いたものを開く'}>
            <span className="ev-px bt-abyss-frame">
              <span className="ev-px bt-abyss-card">
                <span className="bt-abyss-row">
                  <PxInviteSeal size={26} />
                  <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <span className="ev-arc" style={{ fontSize: 12, color: '#00E5FF' }}>???</span>
                    <span className="ev-dot" style={{ fontSize: 13, color: '#E8EEFF' }}>
                      深海から 何かが届いた{invite?.state === 'opened' ? '（続きから）' : ''}
                    </span>
                  </span>
                  <span className="ev-arc" style={{ fontSize: 7, color: '#00E5FF' }}>{state.inviteAt}PT</span>
                  <span className="ev-dot" style={{ fontSize: 12, color: '#00E5FF' }}>▶</span>
                </span>
                <span className="ev-scan" style={{ opacity: 0.3 }} />
              </span>
            </span>
          </button>
        )}

        <div className="bt-label-row">
          <span className="ev-arc" style={{ fontSize: 8, color: '#F6D58E' }}>INBOX</span>
          <span className="ev-dot" style={{ fontSize: 11, color: '#A9BBD9' }}>
            未読 <span className="ev-arc" style={{ fontSize: 8, color: unread ? '#FF7A45' : '#A9BBD9' }}>{unread}</span>
          </span>
        </div>
        <div className="bt-inbox">
          {state.inbox.length === 0 && <div className="ev-dot bt-empty">まだボトルは届いていません。ボトルを流して待ってみよう。</div>}
          {state.inbox.map((m) => (
            <InboxRow key={m.id} m={m} subjectName={subjectName} onOpen={() => onLetter(m)} />
          ))}
        </div>

        {state.fragment ? (
          <button type="button" className="bt-abyss-shadow" style={{ marginTop: 4 }} onClick={onFragment} aria-label={`招待状の欠片 ${state.fragment.cells.length} / ${state.fragment.len} を見る`}>
            <span className="ev-px bt-abyss-frame">
              <span className="ev-px bt-abyss-card">
                <span className="bt-abyss-row">
                  <PxAnchor size={16} glow />
                  <span className="ev-dot" style={{ flex: 1, fontSize: 13, color: '#E8EEFF' }}>招待状の欠片</span>
                  <span className="ev-arc" style={{ fontSize: 7, color: '#00E5FF' }}>
                    {state.fragment.cells.length}/{state.fragment.len}
                  </span>
                  <span className="ev-dot" style={{ fontSize: 12, color: '#00E5FF' }}>▶</span>
                </span>
                <FragGrid fragment={state.fragment} cell={22} cols={11} />
                <span className="ev-scan" style={{ opacity: 0.3 }} />
              </span>
            </span>
          </button>
        ) : invite?.state === 'wrong' ? (
          <div className="ev-dot bt-closed-note" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <PxAnchor size={12} fill="#8A9AC8" />
            招待状は閉じました
          </div>
        ) : null}

        {staff && (
          <div className="ev-dot" style={{ fontSize: 11, lineHeight: 1.6, color: '#A9BBD9' }}>
            先生用: 1 日の上限なし・招待状は何度でも開き直せます。トロフィーは出ません。
          </div>
        )}
        {staff && onStaffView && (
          <button type="button" className="ev-ghost-wrap ev-px2" onClick={onStaffView}>
            <span className="ev-px2 ev-ghost">
              <span className="ev-dot" style={{ fontSize: 14 }}>生徒の状況を見る（先生用）</span>
            </span>
          </button>
        )}
      </div>

      <div className="ev-foot">
        <button type="button" className="ev-cta-wrap" disabled={!canSend} onClick={onSend}>
          <span className="ev-px2 ev-cta">
            {canSend ? (
              <>
                <span className="ev-dot" style={{ fontSize: 18 }}>ボトルを流す</span>
                <span className="ev-arc" style={{ fontSize: 8 }}>+1PT</span>
              </>
            ) : (
              <span className="ev-dot" style={{ fontSize: 17 }}>
                {!open ? (ev.phase === 'soon' ? 'まだ流せません' : '期間が終わりました') : `今日の ${state.daily} 通は流しました`}
              </span>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

function InboxRow({ m, subjectName, onOpen }: { m: BottleInboxItem; subjectName: (s: string) => string; onOpen: () => void }) {
  const done = m.state === 'answered';
  const tag =
    m.state === 'new' ? { t: 'NEW', c: 'is-new' } : m.state === 'started' ? { t: 'OPEN', c: 'is-open' } : m.correct ? { t: '+2', c: 'is-ok' } : { t: 'MISS', c: 'is-miss' };
  const from = m.from ? `${m.from} から` : 'だれかから';
  const label = `${subjectName(m.subject)} ${BOTTLE_QTYPE[m.qtype] ?? ''}・${from}・${bottleWhen(m.sentAt)}・${tag.t}`;
  const inner = (
    <span className="ev-px2 bt-row">
      <span className="ev-px2 bt-row-well">
        <PxBottle size={26} />
      </span>
      <span className="bt-row-text">
        <span className="ev-dot bt-row-main">
          {subjectName(m.subject)} <span style={{ fontSize: 11, color: '#A9BBD9' }}>· {BOTTLE_QTYPE[m.qtype] ?? m.qtype}</span>
          {m.stage === 'back' && (
            <>
              {' '}
              <span className="ev-arc ev-px2 bt-tag is-abyss">ABYSS</span>
            </>
          )}
        </span>
        <span className="ev-dot bt-row-sub">
          {from} · {bottleWhen(m.sentAt)}
        </span>
      </span>
      <span className={`ev-arc ev-px2 bt-tag ${tag.c}`}>{tag.t}</span>
    </span>
  );
  return done ? (
    <div className="ev-px2 bt-row-frame is-done" aria-label={label}>
      {inner}
    </div>
  ) : (
    <button type="button" className="ev-px2 bt-row-frame" aria-label={`${label}（開く）`} onClick={onOpen}>
      {inner}
    </button>
  );
}
