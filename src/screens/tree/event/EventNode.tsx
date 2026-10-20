/**
 * ツリーのイベントノード（ボード E01・E01b・Nodes）。根の分野の右・ほかのノードと線でつながない。
 * 状態: SOON（予告・シルエット）/ LOCK（参加条件 未達・鍵つき・条件の文は出さない）/ NEW（開催中・未挑戦）/ n%（進行中・下から 8 段で満ちる）/
 *       TEST（100%・テスト待ち・クロームで満タン）/ CLEAR（100% ＋ テスト済み・★）。下に 10 マスのバー・ドット文字・「あと n 日」
 * 角は分野の立方体と同じドットの角（ev-pxc）。押し出し・発光は外側の drop-shadow（clip-path で box-shadow が切れるため）
 */
import type { SeasonEventState } from '../../../lib/treeApi';
import { EV_ASSET, evColor, evMd, evPct } from './evTheme';
import { PxLock } from './EvParts';
import '../../../styles/tree-event.css';

export type EventNodeState = 'soon' | 'lock' | 'open' | 'prog' | 'test' | 'clear';

export function eventNodeState(s: SeasonEventState): EventNodeState | null {
  const ev = s.event;
  if (!ev || ev.phase === 'closed') return null;
  if (ev.phase === 'soon') return 'soon';
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
  const ev = state.event;
  const a = EV_ASSET(ev.kind);
  const c = evColor(ev.kind);
  const pct = st === 'test' || st === 'clear' ? 100 : state.progress ? evPct(state.progress.mastery) : 0;
  const full = pct >= 100;
  const dim = st === 'soon' || st === 'lock';
  const fill = full ? '100%' : `${Math.floor(pct / 12.5) * 12.5}%`;
  const badge = { soon: 'SOON', lock: 'LOCK', open: 'NEW', prog: `${pct}%`, test: 'TEST', clear: 'CLEAR' }[st];
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
