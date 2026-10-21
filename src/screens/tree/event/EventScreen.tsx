/**
 * 季節イベントの画面（ボード E02 進行中・E03 100% 達成。2026-10-20 先生の回答 3）。
 *   見出し（戻る・HALLOWEEN のドット文字・CHALLENGE · 科目）→ マスター度のカード（% のクローム・あと n 日・期間・70 マス・凡例）
 *   → REWARDS（錨・EVENT トロフィー・チケット）→ 進行中はテストの案内「テストは MASTER 100% で受けられます／締め切り 10/30 AM5:00」
 *   先生用アカウントは「生徒の状況」（達成率・挑戦回数・テストの点数・2026-10-21）へ
 *   → 下に「挑戦する 5Q」。100% の後は「復習する」と「テストを受ける 20Q · 1 回のみ」（テストのカードは置かない）
 * 「次は 未着手 5 問」は出さない（先生の回答 3）。月と星は素材（deco_ev_halloween_{moon,star}）
 */
import type { SeasonEventState } from '../../../lib/treeApi';
import { rootClass } from '../treeTheme';
import { EV_ASSET, EV_TEST_PASS_PCT, EV_TROPHY_NAME, evMd, evMdHm, evPct, evPeriod } from './evTheme';
import { EvCells, EvLegend, PxBackIcon, PxLock } from './EvParts';
import '../../../styles/tree-event.css';

interface Props {
  state: SeasonEventState;
  /** 科目キー（EVENT トロフィーの名前は科目ごと）*/
  subject: string;
  subjectName: string;
  starting: boolean;
  message: string | null;
  onBack: () => void;
  onChallenge: () => void;
  onTest: () => void;
  /** 錨のアイコンを持っていれば着せ替えへ */
  onDressUp?: () => void;
  /** イベントのチケットを持っていればチケット画面へ */
  onTickets?: () => void;
  /** 先生用アカウントだけ: 生徒の状況（達成率・挑戦回数・テストの点数）*/
  onStaffView?: () => void;
}

export function EventScreen({ state, subject, subjectName, starting, message, onBack, onChallenge, onTest, onDressUp, onTickets, onStaffView }: Props) {
  const ev = state.event!;
  const a = EV_ASSET(ev.kind);
  const p = state.progress;
  const cleared = !!state.cleared;
  const pct = cleared ? 100 : p ? evPct(p.mastery) : 0;
  const test = state.test;
  const rewards = state.rewards;
  const testDone = test?.status === 'done';
  const staff = !!state.staff;
  // 先生は提出した後も受け直せる（Proxy は先生の done を消して始め直す・2026-10-22 デバッグで修正: ボタンが出ず説明と食い違っていた）
  const testOpen = cleared && !!test && (test.status === 'ready' || test.status === 'started' || (staff && test.status === 'done'));

  const ticketState = rewards?.ticket
    ? 'GET'
    : testDone
      ? `${test!.correct ?? 0}/${test!.total ?? 0}`
      : cleared
        ? 'TEST'
        : 'LOCK';

  return (
    <div className={rootClass('ev-screen is-ev-' + ev.kind)}>
      <img className="ev-moon" src={a.moon} alt="" aria-hidden="true" />
      <img className="ev-star" src={a.star} alt="" aria-hidden="true" style={{ left: 34, top: 88, width: 21, height: 21 }} />
      <img className="ev-star" src={a.star} alt="" aria-hidden="true" style={{ left: 176, top: 66, width: 14, height: 14, opacity: 0.85 }} />
      <img className="ev-star" src={a.star} alt="" aria-hidden="true" style={{ left: 258, top: 100, width: 14, height: 14, opacity: 0.7 }} />

      <div className="ev-head">
        <button type="button" className="ev-sqbtn ev-px2" aria-label="ツリーへ戻る" onClick={onBack}>
          <span className="ev-px2">
            <PxBackIcon />
          </span>
        </button>
        <h1 className="ev-title">
          <img src={a.text} alt={ev.name.split(' ')[0]} className="ev-title-img" />
          <span className="ev-dot ev-title-sub">
            <span className="ev-arc" style={{ fontSize: 8 }}>CHALLENGE</span> · {subjectName}
          </span>
        </h1>
      </div>

      <div className="ev-body">
        {message && (
          <div className="ev-msg ev-dot" role="alert">
            {message}
          </div>
        )}

        <div className={`ev-shadow${cleared ? ' is-full' : ''}`}>
          <div className="ev-px ev-frame" style={{ background: cleared ? '#FFFFFF' : 'var(--ev-main)' }}>
            <div className="ev-px ev-card ev-master">
              {cleared ? (
                <>
                  <div className="ev-master-top">
                    <div className="ev-master-pct">
                      <span className="ev-arc" style={{ fontSize: 7, color: 'var(--ev-sub)' }}>EVENT MASTER</span>
                      <span className="ev-arc ev-chrome ev-big">100%</span>
                    </div>
                    <img src={a.clearText} alt="CLEAR!!" className="ev-clear-img" />
                  </div>
                  <div className="ev-master-grid" style={{ alignItems: 'center' }}>
                    <EvCells cells={(p?.cells ?? []).map(() => 3)} label={`${p?.total ?? 70} 題すべて定着`} />
                    <div className="ev-side">
                      <span className="ev-arc" style={{ fontSize: 16, color: '#FFFFFF' }}>
                        {p?.total ?? 70}/{p?.total ?? 70}
                      </span>
                      {state.clearedAt && (
                        <span className="ev-dot" style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--ev-sub)' }}>
                          {evMd(state.clearedAt)} に<br />すべて定着
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="ev-master-top">
                    <div className="ev-master-pct">
                      <span className="ev-arc" style={{ fontSize: 7, color: 'var(--ev-sub)' }}>EVENT MASTER</span>
                      <span className="ev-arc ev-chrome ev-big">{pct}%</span>
                    </div>
                    <div className="ev-master-days">
                      <div className="ev-dot ev-days-row">
                        <span>あと {ev.daysLeft} 日</span>
                        <span className="ev-arc" style={{ fontSize: 8, color: 'var(--ev-text)', alignSelf: 'center' }}>
                          {evPeriod(ev.startAt, ev.endAt)}
                        </span>
                      </div>
                      <div className="ev-bar">
                        <span style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                  <div className="ev-master-grid">
                    <EvCells
                      cells={p?.cells ?? []}
                      label={`${p?.total ?? 70} 題の状態：定着 ${p?.settled ?? 0}・正解済み ${p?.correct ?? 0}・要復習 ${p?.review ?? 0}・未着手 ${p?.untouched ?? 0}`}
                    />
                    <div className="ev-side">
                      <EvLegend state={3} label="定着" n={p?.settled ?? 0} />
                      <EvLegend state={2} label="正解済み" n={p?.correct ?? 0} />
                      <EvLegend state={1} label="要復習" n={p?.review ?? 0} />
                      <EvLegend state={0} label="未着手" n={p?.untouched ?? 0} />
                      <span className="ev-dot" style={{ fontSize: 11, lineHeight: 1.5, color: 'var(--ev-sub)', marginTop: 2 }}>
                        2 回続けて正解で「定着」
                      </span>
                    </div>
                  </div>
                </>
              )}
              <div className="ev-scan" />
            </div>
          </div>
        </div>

        <span className="ev-arc ev-label">REWARDS</span>
        <div className="ev-rewards">
          <RewardRow
            img={a.appicon}
            iw={30}
            name={ev.name.split(' ')[0] + ' ICON'}
            cond={rewards?.icon ? 'アイコンを着せ替えられます' : 'MASTER 100%'}
            st={rewards?.icon ? 'GET' : staff && cleared ? 'STAFF' : 'LOCK'}
            got={!!rewards?.icon}
            onClick={rewards?.icon ? onDressUp : undefined}
          />
          <RewardRow
            img={a.trophy}
            iw={28}
            name={rewards?.trophyName ?? EV_TROPHY_NAME[ev.kind]?.[subject] ?? 'EVENT トロフィー'}
            cond={rewards?.trophy ? 'EVENT トロフィー' : 'EVENT トロフィー · MASTER 100%'}
            st={rewards?.trophy ? 'GET' : staff && cleared ? 'STAFF' : 'LOCK'}
            got={!!rewards?.trophy}
          />
          <RewardRow
            img={a.icon2x}
            iw={30}
            name={ev.name.split(' ')[0] + ' TICKET'}
            cond={`MASTER 100% ＋ テスト ${EV_TEST_PASS_PCT}%`}
            st={ticketState}
            got={!!rewards?.ticket}
            test={ticketState === 'TEST'}
            onClick={rewards?.ticket ? onTickets : undefined}
          />
        </div>

        {!cleared && (
          <div className="ev-px2 ev-note-frame">
            <div className="ev-px2 ev-note">
              <PxLock size={16} />
              <span className="ev-dot" style={{ fontSize: 12, color: 'var(--ev-sub)', lineHeight: 1.5, flex: 1 }}>
                テストは <span className="ev-arc" style={{ fontSize: 8, color: 'var(--ev-text)' }}>MASTER 100%</span> で受けられます
                <br />
                締め切り <span className="ev-arc" style={{ fontSize: 8, color: 'var(--ev-text)' }}>{evMdHm(ev.endAt)}</span>
              </span>
            </div>
          </div>
        )}
        {cleared && testDone && (
          <div className="ev-dot" style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--ev-sub)' }}>
            テスト {test!.correct ?? 0}/{test!.total ?? 0}（{test!.pass ? '合格' : `合格は ${test!.passAt} 問以上`}）
            {staff && test!.pass && ' · 先生用アカウントにはチケットは出ません'}
          </div>
        )}
        {staff && (
          <div className="ev-dot" style={{ fontSize: 11, lineHeight: 1.6, color: 'var(--ev-sub)' }}>
            先生用: 挑戦・テストの記録はしますが、錨・トロフィー・チケットは出ません。テストは何度でも受けられます。
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
        {!cleared ? (
          <button type="button" className="ev-cta-wrap" disabled={starting || !p} onClick={onChallenge}>
            <span className="ev-px2 ev-cta">
              <span className="ev-dot" style={{ fontSize: 18 }}>{starting ? '準備中…' : '挑戦する'}</span>
              {!starting && <span className="ev-arc" style={{ fontSize: 9 }}>5Q</span>}
            </span>
          </button>
        ) : (
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="ev-ghost-wrap ev-px2" style={{ flex: 1 }} disabled={starting} onClick={onChallenge}>
              <span className="ev-px2 ev-ghost">
                <span className="ev-dot" style={{ fontSize: 15 }}>{starting ? '準備中…' : '復習する'}</span>
              </span>
            </button>
            {testOpen && (
              <button type="button" className="ev-cta-wrap is-test" style={{ flex: 1.6 }} disabled={starting} onClick={onTest}>
                <span className="ev-px2 ev-cta is-test">
                  <span className="ev-dot" style={{ fontSize: 16, lineHeight: 1 }}>{test!.status === 'started' ? 'テストを再開' : test!.status === 'done' ? 'もう一度受ける' : 'テストを受ける'}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, lineHeight: 1 }}>
                    <span className="ev-arc" style={{ fontSize: 8 }}>{test!.size || 20}Q</span>
                    {!staff && <span className="ev-dot" style={{ fontSize: 11 }}>· 1 回のみ</span>}
                  </span>
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function RewardRow({
  img,
  iw,
  name,
  cond,
  st,
  got,
  test = false,
  onClick,
}: {
  img: string;
  iw: number;
  name: string;
  cond: string;
  st: string;
  got: boolean;
  test?: boolean;
  onClick?: () => void;
}) {
  const inner = (
    <span className={`ev-px2 ev-reward${got ? ' is-got' : ''}`}>
      <span className="ev-px2 ev-reward-well">
        <img src={img} alt="" style={{ width: iw, height: iw, objectFit: 'contain', display: 'block', opacity: got ? 1 : 0.55, filter: got ? undefined : 'saturate(.5)', imageRendering: 'pixelated' }} />
      </span>
      <span className="ev-reward-text">
        <span className="ev-dot ev-reward-name">{name}</span>
        <span className="ev-dot ev-reward-cond">{cond}</span>
      </span>
      <span className={`ev-arc ev-px2 ev-reward-st${got ? ' is-got' : test ? ' is-test' : ''}`}>{st}</span>
    </span>
  );
  const frame = got ? 'var(--ev-main)' : test ? 'rgba(255,221,51,.6)' : 'rgba(255,154,31,.35)';
  return onClick ? (
    <button type="button" className="ev-px2 ev-reward-frame" style={{ background: frame }} onClick={onClick} aria-label={`${name} ${cond}`}>
      {inner}
    </button>
  ) : (
    <div className="ev-px2 ev-reward-frame" style={{ background: frame }}>
      {inner}
    </div>
  );
}
