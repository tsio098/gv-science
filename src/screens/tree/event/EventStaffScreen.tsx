/**
 * ANCHOR TREE — 先生用 季節イベントの生徒の状況（2026-10-21 先生「イベントのページに達成率・挑戦回数・テストの点数を見られるページ」）。
 * イベント画面の「生徒の状況を見る」と「…」メニューから（先生用アカウントだけ）。科目ごとに、生徒の 達成率（EVENT MASTER）・
 * イベントの挑戦の回数と正答率・テストの点数と合否を本名つきで一覧にする。見た目は先生用の進捗一覧（st-*）と同じ。
 * 数字は Proxy の /tree/season-event/staff（生徒は key で、氏名なし）、本名は GAS の treeNames から直接（Proxy を通さない）。
 */
import { useEffect, useMemo, useState } from 'react';
import type { SeasonEventStaff, SeasonEventStaffRow } from '../../../lib/treeApi';
import { fetchSeasonEventStaff, fetchStaffNames, gradeLabel } from '../../../lib/treeApi';
import { TREE_SUBJECTS, TREE_SUBJECT_NAME, type TreeSubject } from '../../../lib/treeSubject';
import { Ico } from '../TreeIcons';
import { rootClass } from '../treeTheme';
import { evPeriod } from './evTheme';

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
/** テストの並べ替えの値: 受験済みは点数、受験中は -1、未受験は -2 */
const testKey = (s: SeasonEventStaffRow) => (s.test?.status === 'done' ? s.test.correct : s.test ? -1 : -2);

export function EventStaffScreen({ subject: initial, onBack }: Props) {
  const [subject, setSubject] = useState<TreeSubject>(
    (TREE_SUBJECTS as readonly string[]).includes(initial ?? '') ? (initial as TreeSubject) : TREE_SUBJECTS[0]
  );
  const [data, setData] = useState<SeasonEventStaff | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [names, setNames] = useState<Record<string, string> | null>(null);
  const [nameErr, setNameErr] = useState(false);
  const [sort, setSort] = useState<SortKey>('mastery');

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

  const rows = useMemo<Row[]>(() => {
    const list: Row[] = (data?.students ?? []).map((s) => ({ s, name: names?.[s.key] ?? null }));
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
  }, [data, names, sort]);

  const sum = useMemo(() => {
    const list = data?.students ?? [];
    const j = list.filter(joined);
    const done = list.filter((s) => s.test?.status === 'done');
    return {
      joined: j.length,
      cleared: list.filter((s) => s.clearedAt).length,
      tested: done.length,
      passed: done.filter((s) => s.test?.status === 'done' && s.test.pass).length,
      avg: j.length ? Math.round(j.reduce((a, s) => a + s.mastery, 0) / j.length) : null,
    };
  }, [data]);

  const ev = data?.event ?? null;

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
              {ev
                ? `${PHASE_LABEL[ev.phase] ?? ''} · ${evPeriod(ev.startAt, ev.endAt)} · ${data?.size ?? 0} 題 · テスト合格 ${data?.passAt ?? 0}/${data?.testSize ?? 0}（${Math.round((data?.passRate ?? 0) * 100)}%）`
                : ''}
            </div>
          </div>
          <button type="button" className="st-chipbtn" aria-label="再読み込み" onClick={() => setNonce((n) => n + 1)}>
            更新
          </button>
        </div>

        <div className="tr-chips" role="listbox" aria-label="科目">
          {TREE_SUBJECTS.map((s) => (
            <button key={s} type="button" role="option" aria-selected={subject === s} className={subject === s ? 'is-on' : ''} onClick={() => setSubject(s)}>
              {TREE_SUBJECT_NAME[s]}
            </button>
          ))}
        </div>

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
        ) : (
          <>
            <div className="st-tiles">
              <Tile label="参加した生徒" value={`${sum.joined}`} unit={` / ${rows.length} 人`} sub="挑戦かテストの記録あり" />
              <Tile label="MASTER 100%" value={`${sum.cleared}`} unit=" 人" sub={`平均達成率 ${sum.avg == null ? '—' : sum.avg + '%'}（参加者）`} />
              <Tile label="テスト 合格" value={`${sum.passed}`} unit={` / ${sum.tested} 人`} sub="受験した生徒のうち" />
              <Tile label="挑戦の合計" value={`${rows.reduce((a, r) => a + r.s.plays, 0)}`} unit=" 回" sub="1 回 = 5 問" />
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
              正答率 = イベントの挑戦で解いた問題のうち正解の割合。テスト = MASTER 100% の後に 1 回だけ受けられる {data.testSize ?? 20} 問のテストの点数（合格で 10/31 限定のチケット）。
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
