/**
 * ANCHOR TREE — 先生用 季節イベントの生徒の状況（2026-10-21 先生「イベントのページに達成率・挑戦回数・テストの点数を見られるページ」）。
 * イベント画面の「生徒の状況を見る」と「…」メニューから（先生用アカウントだけ）。科目ごとに、生徒の 達成率（EVENT MASTER）・
 * イベントの挑戦の回数と正答率・テストの点数と合否を本名つきで一覧にする。見た目は先生用の進捗一覧（st-*）と同じ。
 * 数字は Proxy の /tree/season-event/staff（生徒は key で、氏名なし）、本名は GAS の treeNames から直接（Proxy を通さない）。
 * 2026-10-21 先生「チケットを獲得した生徒一覧を追加」→ タイルの下に、その科目でチケットを持っている生徒（獲得の早い順・使ったか）。
 * 獲得日時 = テストの提出日時（チケットは合格の提出と同じ batch で出る）。
 * 2026-10-30 先生「11/1 からイベントの状況を Message in a Bottle のものに」→ Proxy が mode 'bottle' を返したら BottleStaffView
 *   （科目に関係なく 1 人 1 行なので科目の切り替えは出さない）。
 */
import { useEffect, useMemo, useState } from 'react';
import type { BottleEventStaff, BottleStaffRow, SeasonEventStaff, SeasonEventStaffRow } from '../../../lib/treeApi';
import { fetchSeasonEventStaff, fetchStaffNames, gradeLabel } from '../../../lib/treeApi';
import { TREE_SUBJECTS, TREE_SUBJECT_NAME, type TreeSubject } from '../../../lib/treeSubject';
import { Ico } from '../TreeIcons';
import { rootClass } from '../treeTheme';
import { evPeriod, evTicketDays } from './evTheme';

interface Props {
  /** 最初に開く科目（イベント画面の科目）*/
  subject: string | null;
  onBack: () => void;
}

type SortKey = 'mastery' | 'plays' | 'test' | 'name';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'mastery', label: '達成率' },
  { key: 'plays', label: '挑戦回数' },
  { key: 'test', label: 'テスト' },
  { key: 'name', label: '学年・名前' },
];
const GRADE_ORDER = ['H3', '既卒', 'H2', 'H1', 'J3', 'J2', 'J1'];
const PHASE_LABEL: Record<string, string> = { soon: '開催前', open: '開催中', closed: '終了' };

interface Row {
  s: SeasonEventStaffRow;
  name: string | null;
}

/** 参加した = イベントの挑戦かテストの記録がある */
const joined = (s: SeasonEventStaffRow) => s.plays > 0 || !!s.test || !!s.clearedAt;
const fmtRate = (c: number, t: number) => (t ? `${Math.round((c / t) * 100)}%` : '—');
/** 最終: M/D H:MM（JST）*/
const fmtLast = (ms: number | null) => {
  if (!ms) return '—';
  const j = new Date(ms + 9 * 3600_000);
  return `${j.getUTCMonth() + 1}/${j.getUTCDate()} ${j.getUTCHours()}:${String(j.getUTCMinutes()).padStart(2, '0')}`;
};
/** チケットの獲得日時 = 合格したテストの提出日時（無ければ null）*/
const ticketAt = (s: SeasonEventStaffRow) => (s.test?.status === 'done' ? s.test.submittedAt : null);
/** テストの並べ替えの値: 受験済みは点数、受験中は -1、未受験は -2 */
const testKey = (s: SeasonEventStaffRow) => (s.test?.status === 'done' ? s.test.correct : s.test ? -1 : -2);

export function EventStaffScreen({ subject: initial, onBack }: Props) {
  const [subject, setSubject] = useState<TreeSubject>(
    (TREE_SUBJECTS as readonly string[]).includes(initial ?? '') ? (initial as TreeSubject) : TREE_SUBJECTS[0]
  );
  const [data, setData] = useState<SeasonEventStaff | BottleEventStaff | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [names, setNames] = useState<Record<string, string> | null>(null);
  const [nameErr, setNameErr] = useState(false);
  const [sort, setSort] = useState<SortKey>('mastery');
  /** 科目を切り替える。本名と「本名を読み込めませんでした」は前の科目のものなので戻す（2026-10-22 修正: 切り替えても残っていた）*/
  const pickSubject = (s: TreeSubject) => {
    if (s === subject) return;
    setNames(null);
    setNameErr(false);
    setSubject(s);
  };

  useEffect(() => {
    let alive = true;
    setError(false);
    setData(null);
    fetchSeasonEventStaff(subject)
      .then((d) => {
        if (!alive) return;
        setData(d);
        if (d.names) {
          fetchStaffNames(d.names)
            .then((n) => alive && (setNames(n), setNameErr(false)))
            .catch(() => alive && setNameErr(true));
        } else if (d.event) setNameErr(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [subject, nonce]);

  /** 70 題チャレンジ（ハロウィン）/ ボトル */
  const ch = data && data.mode !== 'bottle' ? data : null;
  const bt = data && data.mode === 'bottle' ? data : null;

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = (ch?.students ?? []).map((s) => ({ s, name: names?.[s.key] ?? null }));
    const byName = (a: Row, b: Row) => {
      const g = (x: Row) => {
        const i = GRADE_ORDER.indexOf(x.s.grade);
        return i < 0 ? 99 : i;
      };
      return g(a) - g(b) || (a.name ?? a.s.nickname).localeCompare(b.name ?? b.s.nickname, 'ja');
    };
    const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
      mastery: (a, b) => b.s.mastery - a.s.mastery || b.s.plays - a.s.plays,
      plays: (a, b) => b.s.plays - a.s.plays || b.s.mastery - a.s.mastery,
      test: (a, b) => testKey(b.s) - testKey(a.s) || b.s.mastery - a.s.mastery,
      name: byName,
    };
    return list.sort((a, b) => cmp[sort](a, b) || byName(a, b));
  }, [ch, names, sort]);

  const sum = useMemo(() => {
    const list = ch?.students ?? [];
    const j = list.filter(joined);
    const done = list.filter((s) => s.test?.status === 'done');
    return {
      joined: j.length,
      cleared: list.filter((s) => s.clearedAt).length,
      tested: done.length,
      passed: done.filter((s) => s.test?.status === 'done' && s.test.pass).length,
      avg: j.length ? Math.round(j.reduce((a, s) => a + s.mastery, 0) / j.length) : null,
    };
  }, [ch]);

  /** チケットを獲得した生徒（獲得の早い順）*/
  const ticketRows = useMemo(
    () => rows.filter((r) => r.s.ticket).sort((a, b) => (ticketAt(a.s) ?? Infinity) - (ticketAt(b.s) ?? Infinity)),
    [rows]
  );

  const ev = data?.event ?? null;
  const ticketDays = ev ? evTicketDays(ev.ticketFrom, ev.ticketUntil) : null;

  return (
    <div className={rootClass('tr-rank st-root')}>
      <div className="tr-rank-head">
        <button type="button" className="tr-iconbtn" aria-label="戻る" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <div className="tr-rank-title">
          <Ico id="i-lines" size={20} />
          <span>イベントの状況</span>
          <span className="st-badge">先生用</span>
        </div>
      </div>

      <div className="tr-rank-body st-body">
        <div className="st-datebar">
          <div className="st-date">
            <div className="st-date-main">{ev ? ev.name : data ? 'イベントはありません' : '…'}</div>
            <div className="st-date-sub">
              {!ev
                ? ''
                : bt
                  ? `${PHASE_LABEL[ev.phase] ?? ''} · ${evPeriod(ev.startAt, ev.endAt)} · 1 日 ${bt.daily} 通 · 正解 +2 pt · ${bt.inviteAt} pt で招待状`
                  : `${PHASE_LABEL[ev.phase] ?? ''} · ${evPeriod(ev.startAt, ev.endAt)} · ${ch?.size ?? 0} 題 · テスト合格 ${ch?.passAt ?? 0}/${ch?.testSize ?? 0}（${Math.round((ch?.passRate ?? 0) * 100)}%）`}
            </div>
          </div>
          <button type="button" className="st-chipbtn" aria-label="再読み込み" onClick={() => setNonce((n) => n + 1)}>
            更新
          </button>
        </div>

        {!bt && (
        <div className="tr-chips" role="listbox" aria-label="科目">
          {TREE_SUBJECTS.map((s) => (
            <button key={s} type="button" role="option" aria-selected={subject === s} className={subject === s ? 'is-on' : ''} onClick={() => pickSubject(s)}>
              {TREE_SUBJECT_NAME[s]}
            </button>
          ))}
        </div>

        )}

        {!bt && (
        <div className="st-sortbar">
          <span>並べ替え</span>
          <div className="tr-chips" role="listbox" aria-label="並べ替え">
            {SORTS.map((x) => (
              <button key={x.key} type="button" role="option" aria-selected={sort === x.key} className={sort === x.key ? 'is-on' : ''} onClick={() => setSort(x.key)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        )}

        {nameErr && (
          <div className="tr-alert">
            <Ico id="i-alert" size={16} />
            <span>本名を読み込めませんでした（ニックネームで表示しています）。「更新」で読み直せます。</span>
          </div>
        )}

        {error ? (
          <div className="tr-center" style={{ position: 'static', padding: '40px 0' }}>
            <div>読み込めませんでした。</div>
            <button type="button" className="tr-ghost" style={{ width: 200 }} onClick={() => setNonce((n) => n + 1)}>
              再読み込み
            </button>
          </div>
        ) : !data ? (
          <div className="tr-center" style={{ position: 'static', padding: '40px 0' }}>
            <div className="tr-spinner" />
          </div>
        ) : !ev ? (
          <div className="tr-panel" style={{ textAlign: 'center', fontSize: 13, padding: '28px 16px' }}>
            表示できるイベントはありません。
          </div>
        ) : bt ? (
          <BottleStaffView data={bt} names={names} />
        ) : (
          <>
            <div className="st-tiles">
              <Tile label="参加した生徒" value={`${sum.joined}`} unit={` / ${rows.length} 人`} sub="挑戦かテストの記録あり" />
              <Tile label="MASTER 100%" value={`${sum.cleared}`} unit=" 人" sub={`平均達成率 ${sum.avg == null ? '—' : sum.avg + '%'}（参加者）`} />
              <Tile label="テスト 合格" value={`${sum.passed}`} unit={` / ${sum.tested} 人`} sub="受験した生徒のうち" />
              <Tile label="挑戦の合計" value={`${rows.reduce((a, r) => a + r.s.plays, 0)}`} unit=" 回" sub="1 回 = 5 問" />
            </div>

            <div className="st-tk">
              <div className="st-tk-head">
                <Ico id="i-ticket" size={18} />
                <span>チケットを獲得した生徒</span>
                <b className="tr-num">{ticketRows.length} 人</b>
                <small>テスト合格で 1 枚{ticketDays ? ` · ${ticketDays} だけ使える` : ''}</small>
              </div>
              {ticketRows.length === 0 ? (
                <div className="st-tk-empty">まだいません。</div>
              ) : (
                ticketRows.map((r) => {
                  const s = r.s;
                  const t = s.test?.status === 'done' ? s.test : null;
                  const used = s.ticket?.usedAt ?? null;
                  return (
                    <div key={s.key} className="st-tk-row">
                      <span className="st-name">
                        <span className="tr-grade">{gradeLabel(s.grade)}</span>
                        <span className="st-name-txt">
                          <b>{r.name ?? (names ? '（名簿に無し）' : s.nickname)}</b>
                          <small>{r.name || names ? s.nickname : ''}</small>
                        </span>
                      </span>
                      <Cell label="テスト" main={t ? `${t.correct}/${t.total}` : '—'} sub="合格" />
                      <Cell label="獲得" main={fmtLast(ticketAt(s))} />
                      <Cell label="使用" main={used ? '使用済み' : '未使用'} sub={used ? fmtLast(used) : undefined} hot={!used} />
                    </div>
                  );
                })
              )}
            </div>

            {rows.length === 0 ? (
              <div className="tr-panel" style={{ textAlign: 'center', fontSize: 13, padding: '28px 16px' }}>
                この科目の生徒はいません。
              </div>
            ) : (
              <div className="st-list">
                <div className="st-row st-headrow" aria-hidden>
                  <span>名前</span>
                  <span>達成率</span>
                  <span>挑戦回数</span>
                  <span>正答率</span>
                  <span>テスト</span>
                  <span>最終</span>
                </div>
                {rows.map((r) => {
                  const s = r.s;
                  const t = s.test;
                  return (
                    <div key={s.key} className={`st-row${joined(s) ? ' is-active' : ''}`}>
                      <span className="st-name">
                        <span className="tr-grade">{gradeLabel(s.grade)}</span>
                        <span className="st-name-txt">
                          <b>{r.name ?? (names ? '（名簿に無し）' : s.nickname)}</b>
                          <small>
                            {r.name || names ? s.nickname : ''}
                            <span className="st-last-inline"> · 最終 {fmtLast(s.lastAt)}</span>
                          </small>
                        </span>
                      </span>
                      <Cell label="達成率" main={`${s.mastery}%`} sub={s.clearedAt ? '100% 達成' : `定着 ${s.settled}/${s.total}`} hot={!!s.clearedAt} />
                      <Cell label="挑戦回数" main={`${s.plays} 回`} sub={`${s.answered} 問`} />
                      <Cell label="正答率" main={fmtRate(s.answeredCorrect, s.answered)} sub="イベントの挑戦" />
                      <Cell
                        label="テスト"
                        main={t?.status === 'done' ? `${t.correct}/${t.total}` : t ? '受験中' : '—'}
                        sub={t?.status === 'done' ? (t.pass ? (s.ticket ? '合格 · チケット' : '合格') : '不合格') : t ? '途中' : s.clearedAt ? '未受験' : ''}
                        hot={t?.status === 'done' && t.pass}
                      />
                      <span className="st-cell st-last tr-num">{fmtLast(s.lastAt)}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="st-foot">
              達成率 = 生徒のイベント画面の EVENT MASTER（2 回続けて正解で「定着」・100% の後は 100%）。挑戦回数 = イベントの挑戦（5 問）を提出した回数と解いた問題数。
              正答率 = イベントの挑戦で解いた問題のうち正解の割合。テスト = MASTER 100% の後に 1 回だけ受けられる {ch?.testSize ?? 20} 問のテストの点数（合格で{ticketDays ? ` ${ticketDays} 限定の` : ''}チケット）。
              先生用アカウントの記録は入りません。数字は 30 秒ごとに新しくなります（「更新」）。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, unit, sub }: { label: string; value: string; unit?: string; sub: string }) {
  return (
    <div className="st-tile">
      <div className="st-tile-label">{label}</div>
      <div className="st-tile-value tr-num">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="st-tile-prev">{sub}</div>
    </div>
  );
}

function Cell({ label, main, sub, hot }: { label: string; main: string; sub?: string; hot?: boolean }) {
  return (
    <span className={`st-cell${hot ? ' is-hot' : ''}`}>
      <span className="st-cell-label">{label}</span>
      <span className="st-cell-main tr-num">{main}</span>
      {sub && <span className="st-cell-sub tr-num">{sub}</span>}
    </span>
  );
}

/* ── Message in a Bottle（2026-10-30 先生「送った数・受け取った数・正解した数・ポイントの累計・ABYSS からの招待状の成否」）── */

type BtSortKey = 'points' | 'sent' | 'received' | 'correct' | 'invite' | 'name';
const BT_SORTS: { key: BtSortKey; label: string }[] = [
  { key: 'points', label: 'ポイント' },
  { key: 'sent', label: '送った' },
  { key: 'received', label: '受け取った' },
  { key: 'correct', label: '正解' },
  { key: 'invite', label: '招待状' },
  { key: 'name', label: '学年・名前' },
];
type InviteStatus = BottleStaffRow['invite']['status'];
/** 招待状の並べ替えの順（成功 → 失敗 → 挑戦中 → 未開封 → 50 pt 前 → 対象外）*/
const INVITE_ORDER: InviteStatus[] = ['correct', 'wrong', 'opened', 'ready', 'locked', 'none'];
/** 参加した = 流したか、届いたボトルを解いた */
const btJoined = (s: BottleStaffRow) => s.sent > 0 || s.answered > 0;

function inviteCell(s: BottleStaffRow, inviteAt: number): { main: string; sub?: string; hot?: boolean } {
  const subj = s.invite.subject ? TREE_SUBJECT_NAME[s.invite.subject as TreeSubject] ?? '' : '';
  switch (s.invite.status) {
    case 'correct':
      return { main: '成功', sub: subj, hot: true };
    case 'wrong':
      return { main: '失敗', sub: subj };
    case 'opened':
      return { main: '挑戦中', sub: subj };
    case 'ready':
      return { main: '未開封', sub: '届いた' };
    case 'locked':
      return { main: '—', sub: `あと ${Math.max(0, inviteAt - s.points)} pt` };
    default:
      return { main: '対象外', sub: '基礎科目のみ' };
  }
}

function BottleStaffView({ data, names }: { data: BottleEventStaff; names: Record<string, string> | null }) {
  const [sort, setSort] = useState<BtSortKey>('points');
  const rows = useMemo(() => {
    const list = data.students.map((s) => ({ s, name: names?.[s.key] ?? null }));
    type R = (typeof list)[number];
    const byName = (a: R, b: R) => {
      const g = (x: R) => {
        const i = GRADE_ORDER.indexOf(x.s.grade);
        return i < 0 ? 99 : i;
      };
      return g(a) - g(b) || (a.name ?? a.s.nickname).localeCompare(b.name ?? b.s.nickname, 'ja');
    };
    const inv = (x: R) => INVITE_ORDER.indexOf(x.s.invite.status);
    const cmp: Record<BtSortKey, (a: R, b: R) => number> = {
      points: (a, b) => b.s.points - a.s.points || b.s.sent - a.s.sent,
      sent: (a, b) => b.s.sent - a.s.sent || b.s.points - a.s.points,
      received: (a, b) => b.s.received - a.s.received || b.s.answered - a.s.answered,
      correct: (a, b) => b.s.correct - a.s.correct || b.s.answered - a.s.answered,
      invite: (a, b) => inv(a) - inv(b) || b.s.points - a.s.points,
      name: byName,
    };
    return list.sort((a, b) => cmp[sort](a, b) || byName(a, b));
  }, [data, names, sort]);

  const sum = useMemo(() => {
    const list = data.students;
    const add = (f: (s: BottleStaffRow) => number) => list.reduce((a, s) => a + f(s), 0);
    const st = (k: InviteStatus) => list.filter((s) => s.invite.status === k).length;
    return {
      joined: list.filter(btJoined).length,
      cleared: list.filter((s) => s.clearedAt != null).length,
      sent: add((s) => s.sent),
      answered: add((s) => s.answered),
      correct: add((s) => s.correct),
      invited: st('ready') + st('opened') + st('correct') + st('wrong'),
      inviteOk: st('correct'),
      inviteDone: st('correct') + st('wrong'),
    };
  }, [data]);

  return (
    <>
      <div className="st-sortbar">
        <span>並べ替え</span>
        <div className="tr-chips" role="listbox" aria-label="並べ替え">
          {BT_SORTS.map((x) => (
            <button key={x.key} type="button" role="option" aria-selected={sort === x.key} className={sort === x.key ? 'is-on' : ''} onClick={() => setSort(x.key)}>
              {x.label}
            </button>
          ))}
        </div>
      </div>

      <div className="st-tiles">
        <Tile label="参加した生徒" value={`${sum.joined}`} unit={` / ${rows.length} 人`} sub={`クリア ${sum.cleared} 人`} />
        <Tile label="流したボトル" value={`${sum.sent}`} unit=" 通" sub={`1 人 1 日 ${data.daily} 通まで`} />
        <Tile label="正解したボトル" value={`${sum.correct}`} unit={` / ${sum.answered} 通`} sub="届いたボトルを解いた数のうち" />
        <Tile label="招待状 成功" value={`${sum.inviteOk}`} unit={` / ${sum.inviteDone} 人`} sub={`届いた ${sum.invited} 人`} />
      </div>

      {rows.length === 0 ? (
        <div className="tr-panel" style={{ textAlign: 'center', fontSize: 13, padding: '28px 16px' }}>
          生徒はいません。
        </div>
      ) : (
        <div className="st-list">
          <div className="st-row is-bt st-headrow" aria-hidden>
            <span>名前</span>
            <span>送った</span>
            <span>受け取った</span>
            <span>正解</span>
            <span>ポイント</span>
            <span>招待状</span>
            <span>最終</span>
          </div>
          {rows.map((r) => {
            const s = r.s;
            const iv = inviteCell(s, data.inviteAt);
            const cleared = s.clearedAt != null;
            return (
              <div key={s.key} className={`st-row is-bt${btJoined(s) ? ' is-active' : ''}`}>
                <span className="st-name">
                  <span className="tr-grade">{gradeLabel(s.grade)}</span>
                  <span className="st-name-txt">
                    <b>{r.name ?? (names ? '（名簿に無し）' : s.nickname)}</b>
                    <small>
                      {r.name || names ? s.nickname : ''}
                      <span className="st-last-inline"> · 最終 {fmtLast(s.lastAt)}</span>
                    </small>
                  </span>
                </span>
                <Cell label="送った" main={`${s.sent} 通`} />
                <Cell label="受け取った" main={`${s.received} 通`} sub={`解いた ${s.answered}`} />
                <Cell label="正解" main={`${s.correct} 通`} sub={s.answered ? `正答率 ${fmtRate(s.correct, s.answered)}` : undefined} />
                <Cell label="ポイント" main={`${s.points} pt`} sub={cleared ? 'クリア' : `/ ${s.clearAt}`} hot={cleared} />
                <Cell label="招待状" main={iv.main} sub={iv.sub} hot={iv.hot} />
                <span className="st-cell st-last tr-num">{fmtLast(s.lastAt)}</span>
              </div>
            );
          })}
        </div>
      )}
      <div className="st-foot">
        送った = 流して相手に届いたボトルの数（だれにも届かず戻ってきたボトルは数えない）。受け取った = 届いたボトルの数（解いた数）。正解 = 届いたボトルのうち正解した数。
        ポイント = イベントのポイントの累計（流すと +1・正解で +2。化学・生物の生徒は {data.clearAt} pt、基礎科目だけの生徒は {data.basicClearAt} pt でクリアして、それより増えない）。
        招待状 = {data.inviteAt} pt で届く ABYSS からの招待状（化学・生物の生徒だけ・1 人 1 回）の成否。科目に関係なく 1 人 1 行です。
        先生用アカウントの記録は入りません。数字は 30 秒ごとに新しくなります（「更新」）。
      </div>
    </>
  );
}
