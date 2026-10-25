/**
 * ツリーのイベントノード（ボード E01・E01b・Nodes）。根の分野の右・ほかのノードと線でつながない。
 * 状態: SOON（予告・シルエット）/ LOCK（参加条件 未達・鍵つき・条件の文は出さない）/ NEW（開催中・未挑戦）/ n%（進行中・下から 8 段で満ちる）/
 *       TEST（100%・テスト待ち・クロームで満タン）/ CLEAR（100% ＋ テスト済み・★）。下に 10 マスのバー・ドット文字・「あと n 日」
 * 角は分野の立方体と同じドットの角（ev-pxc）。押し出し・発光は外側の drop-shadow（clip-path で box-shadow が切れるため）
 * Message in a Bottle（mode 'bottle'・ボード Nodes・2026-10-25）: 同じ場所に同じ大きさ。状態は SOON / NEW（0 pt）/ 未読の本数（オレンジ）/
 *   {pt}PT（下から 8 段で満ちる・100 pt で満タン）/ ???（シアン・50 pt で招待状が未開封）/ CLEAR ★。ノード名は BottleLogo・下に「{pt} pt · あと n 日」
 */
import type { SeasonEventState } from '../../../lib/treeApi';
import { EV_ASSET, evColor, evMd, evPct } from './evTheme';
import { PxLock } from './EvParts';
import { BottleLogo, PxBottle } from './BottleParts';
import '../../../styles/tree-event.css';

export type EventNodeState = 'soon' | 'lock' | 'open' | 'prog' | 'test' | 'clear' | 'mail' | 'invite';

/** Message in a Bottle のイベントか（古い Proxy は mode が無い）*/
export const isBottleEvent = (s: SeasonEventState | null | undefined) => !!s?.event && (s.event.mode === 'bottle' || s.event.kind === 'bottle');

export function eventNodeState(s: SeasonEventState): EventNodeState | null {
  const ev = s.event;
  if (!ev || ev.phase === 'closed') return null;
  if (ev.phase === 'soon') return 'soon';
  if (isBottleEvent(s)) {
    const b = s.bottle;
    if (!b) return 'open';
    if (b.mystery) return 'invite';
    if (b.unread > 0) return 'mail';
    if (b.cleared || b.points >= b.clearAt) return 'clear';
    return b.points > 0 ? 'prog' : 'open';
  }
  if (!s.eligible?.met) return 'lock';
  if (!s.progress) return 'lock';
  if (s.cleared) return s.test?.status === 'done' ? 'clear' : 'test';
  return s.progress.untouched === s.progress.total ? 'open' : 'prog';
}

interface Props {
  state: SeasonEventState;
  /** ツリーの座標（ノードの左上）*/
  x: number;
  y: number;
  onOpen: () => void;
}

export function EventNode({ state, x, y, onOpen }: Props) {
  const st = eventNodeState(state);
  if (!st || !state.event) return null;
  if (isBottleEvent(state)) return <BottleNode state={state} st={st} x={x} y={y} onOpen={onOpen} />;
  const ev = state.event;
  const a = EV_ASSET(ev.kind);
  const c = evColor(ev.kind);
  const pct = st === 'test' || st === 'clear' ? 100 : state.progress ? evPct(state.progress.mastery) : 0;
  const full = pct >= 100;
  const dim = st === 'soon' || st === 'lock';
  const fill = full ? '100%' : `${Math.floor(pct / 12.5) * 12.5}%`;
  const badge = ({ soon: 'SOON', lock: 'LOCK', open: 'NEW', prog: `${pct}%`, test: 'TEST', clear: 'CLEAR', mail: '', invite: '' } as Record<EventNodeState, string>)[st];
  const label = st === 'soon' ? `${evMd(ev.startAt)} から` : st === 'lock' ? '' : `あと ${ev.daysLeft} 日`;
  const name = ev.name;
  const aria =
    st === 'soon'
      ? `${name}（${evMd(ev.startAt)} から）`
      : st === 'lock'
        ? `${name}（鍵つき）`
        : `${name}（${st === 'test' ? 'MASTER 100%・テストを受けられます' : st === 'clear' ? 'クリア' : `${pct}%`}・あと ${ev.daysLeft} 日）を開く`;

  const body = (
    <>
      <div className={`ev-node-cube is-${st}`} style={{ filter: dim ? 'drop-shadow(5px 5px 0 #1A0C2C)' : `drop-shadow(5px 5px 0 ${c.side}) drop-shadow(0 0 ${full ? 14 : 7}px rgba(${c.rgb},${full ? 0.75 : 0.55}))` }}>
        <div className="ev-pxc ev-node-edge" style={{ background: st === 'soon' ? 'rgba(234,251,255,.35)' : st === 'lock' ? `rgba(${c.rgb},.4)` : full ? '#FFFFFF' : c.main }}>
          <div className="ev-pxc ev-node-face" style={{ background: st === 'soon' ? '#053640' : 'linear-gradient(180deg,#3A1A5A,#0A0418)' }}>
            {!dim && <div className="ev-node-fill" style={{ height: fill, backgroundImage: full ? c.chrome : undefined, backgroundColor: full ? undefined : `rgba(${c.rgb},.45)` }} />}
            <img
              src={a.icon2x}
              alt=""
              className="ev-node-icon"
              style={{ filter: st === 'soon' ? 'grayscale(1) brightness(.6)' : st === 'lock' ? 'grayscale(.7) brightness(.45)' : undefined }}
            />
            {st === 'lock' && <PxLock size={24} fill="#FFE6C2" style={{ position: 'absolute', left: '50%', top: '50%', margin: '-12px 0 0 -12px' }} />}
            {st === 'clear' && (
              <svg viewBox="0 0 7 7" width="14" height="14" aria-hidden="true" style={{ position: 'absolute', left: 6, bottom: 6 }}>
                <path d="M3 0h1v2h3v1H6v1H5v3H4V6H3v1H2V4H1V3H0V2h3z" fill="#FFFFFF" />
              </svg>
            )}
          </div>
        </div>
      </div>
      <span className={`ev-node-badge is-${st}`}>
        <span className="ev-arc">{badge}</span>
      </span>
      <div className="ev-node-pips" aria-hidden="true">
        {Array.from({ length: 10 }, (_, j) => (
          <span key={j} style={{ background: dim ? 'rgba(234,251,255,.12)' : j < Math.floor(pct / 10) ? c.main : 'rgba(234,251,255,.16)' }} />
        ))}
      </div>
      <img src={a.text2} alt={name} className="ev-node-text" style={{ opacity: dim ? 0.55 : 1 }} />
      {label && <span className="ev-dot ev-node-days" style={{ color: st === 'soon' ? 'rgba(234,251,255,.6)' : '#FFE6C2' }}>{label}</span>}
    </>
  );

  // 予告・鍵つきは押せない（鍵つきに条件の文は出さない＝押しても何も出さない・先生の回答 3）
  return dim ? (
    <div className="ev-node" role="img" aria-label={aria} style={{ left: x, top: y }}>
      {body}
    </div>
  ) : (
    <button type="button" className="ev-node nd" aria-label={aria} style={{ left: x, top: y }} onClick={onOpen}>
      {body}
    </button>
  );
}

/** Message in a Bottle のノード（ボード Nodes）*/
function BottleNode({ state, st, x, y, onOpen }: Props & { st: EventNodeState }) {
  const ev = state.event!;
  const b = state.bottle;
  const pt = b?.points ?? 0;
  const max = b?.clearAt ?? 100;
  const c = evColor('bottle');
  const soon = st === 'soon';
  const full = st === 'clear' || pt >= max;
  const fill = full ? '100%' : `${Math.floor(Math.min(1, pt / max) * 8) * 12.5}%`;
  const badge = { soon: 'SOON', open: 'NEW', mail: String(b?.unread ?? 0), prog: `${pt}PT`, invite: '???', clear: 'CLEAR', lock: '', test: '' }[st];
  const badgeStyle =
    st === 'mail' || st === 'open'
      ? { background: '#FF7A45', color: '#140A05', boxShadow: st === 'mail' ? '0 0 10px rgba(255,122,69,.6)' : undefined }
      : st === 'invite'
        ? { background: '#00E5FF', color: '#031B24', boxShadow: '0 0 10px rgba(0,229,255,.6)' }
        : soon
          ? { background: 'rgba(234,251,255,.3)', color: '#EAFBFF' }
          : { background: c.main, color: c.onMain, boxShadow: `0 0 10px rgba(${c.rgb},.6)` };
  const label = soon ? `${evMd(ev.startAt)} から` : full ? 'トロフィー獲得' : `${pt} pt · あと ${ev.daysLeft} 日`;
  const name = 'MESSAGE IN A BOTTLE';
  const aria = soon
    ? `${name}（${evMd(ev.startAt)} から）`
    : `${name}（${pt} pt${st === 'mail' ? `・未読のボトル ${b?.unread ?? 0} 本` : ''}${st === 'invite' ? '・??? が届いた' : ''}・あと ${ev.daysLeft} 日）を開く`;
  const body = (
    <>
      <div
        className={`ev-node-cube is-${st}`}
        style={{ filter: soon ? 'drop-shadow(5px 5px 0 #021C20)' : `drop-shadow(5px 5px 0 ${c.side}) drop-shadow(0 0 ${full ? 14 : 8}px rgba(${c.rgb},${full ? 0.75 : 0.45}))`, opacity: soon ? 0.55 : 1 }}
      >
        <div className="ev-pxc ev-node-edge" style={{ background: soon ? 'rgba(234,251,255,.35)' : full ? '#FFFFFF' : c.main }}>
          <div className="ev-pxc ev-node-face" style={{ background: soon ? '#053640' : 'linear-gradient(180deg,#1C3F6E,#06132A)' }}>
            {!soon && <div className="ev-node-fill" style={{ height: fill, backgroundImage: full ? c.chrome : undefined, backgroundColor: full ? undefined : `rgba(${c.rgb},.5)` }} />}
            <PxBottle size={40} style={{ position: 'relative', filter: soon ? 'grayscale(1) brightness(.55)' : undefined }} />
            {full && (
              <svg viewBox="0 0 7 7" width="14" height="14" aria-hidden="true" style={{ position: 'absolute', left: 6, bottom: 6 }}>
                <path d="M3 0h1v2h3v1H6v1H5v3H4V6H3v1H2V4H1V3H0V2h3z" fill="#FFFFFF" />
              </svg>
            )}
          </div>
        </div>
      </div>
      <span className="ev-node-badge" style={badgeStyle}>
        <span className="ev-arc">{badge}</span>
      </span>
      <div className="ev-node-pips" aria-hidden="true">
        {Array.from({ length: 10 }, (_, j) => (
          <span key={j} style={{ background: soon ? 'rgba(234,251,255,.12)' : j < Math.floor((pt / max) * 10) ? c.main : 'rgba(234,251,255,.16)' }} />
        ))}
      </div>
      <BottleLogo size="node" style={{ alignItems: 'center', marginTop: 2, opacity: soon ? 0.55 : 1 }} />
      <span className="ev-dot ev-node-days" style={{ color: soon ? 'rgba(234,251,255,.6)' : '#FFF1CF' }}>{label}</span>
    </>
  );
  return soon ? (
    <div className="ev-node" role="img" aria-label={aria} style={{ left: x, top: y }}>
      {body}
    </div>
  ) : (
    <button type="button" className="ev-node nd" aria-label={aria} style={{ left: x, top: y }} onClick={onOpen}>
      {body}
    </button>
  );
}
