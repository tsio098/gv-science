/**
 * ANCHOR TREE — 先生用 生徒の進捗一覧（2026-10-17）。先生用アカウント（学年「先生」）だけ「…」メニューから開ける。
 * 選んだ日（JST）と前日の スコアの増加・挑戦回数・正答率、その日の終わりの総スコア、分野ごとのスコア・マスター度・正答率を本名つきで一覧にする。
 * 数字は Proxy の /tree/staff/overview（生徒は key で、氏名なし）、本名は GAS の treeNames から直接（Proxy を通さない）。
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { StaffDay, StaffOverview, StaffStudent, StaffSubject, TreeManifest } from '../../lib/treeApi';
import { fetchStaffNames, fetchStaffOverview, fetchTreeManifest, gradeLabel } from '../../lib/treeApi';
import { TREE_SUBJECTS, TREE_SUBJECT_NAME, treeSubjectsFor, type TreeSubject } from '../../lib/treeSubject';
import { Ico } from './TreeIcons';
import { fmtScore, groupColor, rootClass } from './treeTheme';

interface Props {
  onBack: () => void;
}

type SortKey = 'gain' | 'score' | 'plays' | 'rate' | 'name';
const SORTS: { key: SortKey; label: string }[] = [
  { key: 'gain', label: '増加' },
  { key: 'score', label: '総スコア' },
  { key: 'plays', label: 'プレイ' },
  { key: 'rate', label: '正答率' },
  { key: 'name', label: '学年・名前' },
];
const GRADE_ORDER = ['H3', '既卒', 'H2', 'H1', 'J3', 'J2', 'J1'];

/** 'chemistry@back' → { subject, back } */
const splitDs = (ds: string) => ({ subject: ds.replace(/@back$/, '') as TreeSubject, back: ds.endsWith('@back') });
const dsLabel = (ds: string) => {
  const { subject, back } = splitDs(ds);
  return (TREE_SUBJECT_NAME[subject] ?? subject) + (back ? ' ABYSS' : '');
};

const zeroDay = (): StaffDay => ({ gain: 0, plays: 0, correct: 0, total: 0 });
const addDay = (a: StaffDay, b: StaffDay): StaffDay => ({
  gain: a.gain + b.gain,
  plays: a.plays + b.plays,
  correct: a.correct + b.correct,
  total: a.total + b.total,
});
const rateOf = (d: { correct: number; total: number }) => (d.total ? (d.correct / d.total) * 100 : null);
const fmtRate = (r: number | null) => (r == null ? '—' : `${Math.round(r)}%`);
const fmtGain = (g: number) => (g > 0 ? '+' + fmtScore(g) : '0');
/** マスター度（いまの値）。古い Proxy は返さないので — */
const fmtMastery = (m: number | undefined) => (m == null ? '—' : `${Math.round(m)}%`);
/** 今年度の正答率がこれ未満の分野はオレンジ（解いた問題が LOW_MIN 問以上のときだけ）*/
const LOW_RATE = 50;
const LOW_MIN = 10;
const zeroSeason = { plays: 0, correct: 0, total: 0 };

interface Row {
  s: StaffStudent;
  name: string | null;
  score: number;
  day: StaffDay;
  prev: StaffDay;
  /** 展開したときに出す科目（記録がある科目・絞り込み中はその科目だけ）*/
  dss: string[];
}

/** 'YYYY-MM-DD' を n 日ずらす */
const shiftDate = (d: string, n: number) => {
  const t = Date.parse(d + 'T00:00:00Z') + n * 86400_000;
  return new Date(t).toISOString().slice(0, 10);
};
const WEEK = ['日', '月', '火', '水', '木', '金', '土'];
const fmtDate = (d: string) => {
  const t = new Date(d + 'T00:00:00Z');
  return `${t.getUTCMonth() + 1}/${t.getUTCDate()}（${WEEK[t.getUTCDay()]}）`;
};
/** 最終プレイ: 今日なら時刻、それ以外は月/日（JST）*/
const fmtLast = (ms: number | null, today: string) => {
  if (!ms) return '—';
  const j = new Date(ms + 9 * 3600_000);
  const d = j.toISOString().slice(0, 10);
  if (d === today) return `${j.getUTCHours()}:${String(j.getUTCMinutes()).padStart(2, '0')}`;
  return `${j.getUTCMonth() + 1}/${j.getUTCDate()}`;
};

export function StaffScreen({ onBack }: Props) {
  const [date, setDate] = useState<string | null>(null);
  const [data, setData] = useState<StaffOverview | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [names, setNames] = useState<Record<string, string> | null>(null);
  const [nameErr, setNameErr] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('gain');
  const [open, setOpen] = useState<Set<string>>(() => new Set());
  /** 科目の manifest（null = 読み込み中・'error' = 読めなかった。「もう一度読み込む」で消して読み直す）*/
  const [manifests, setManifests] = useState<Record<string, TreeManifest | null | 'error'>>({});

  useEffect(() => {
    let alive = true;
    setError(false);
    fetchStaffOverview(date ?? undefined)
      .then((d) => {
        if (!alive) return;
        setData(d);
        if (d.names) {
          fetchStaffNames(d.names)
            .then((n) => alive && (setNames(n), setNameErr(false)))
            .catch(() => alive && setNameErr(true));
        } else setNameErr(true);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [date, nonce]);

  // 絞り込みのチップ: ROUTE は全科目、ABYSS は記録がある科目だけ
  const chips = useMemo(() => {
    const back = new Set<string>();
    for (const s of data?.students ?? []) for (const ds of Object.keys(s.subj)) if (ds.endsWith('@back')) back.add(ds);
    return [...TREE_SUBJECTS, ...TREE_SUBJECTS.map((s) => `${s}@back`).filter((ds) => back.has(ds))];
  }, [data]);

  // 展開した生徒の科目の manifest（分野名・色・問題数）
  const needDs = useMemo(() => {
    const out = new Set<string>();
    if (filter !== 'all') out.add(filter);
    for (const s of data?.students ?? []) if (open.has(s.key)) for (const ds of Object.keys(s.subj)) out.add(ds);
    return [...out];
  }, [filter, open, data]);
  useEffect(() => {
    for (const ds of needDs) {
      if (ds in manifests) continue;
      setManifests((m) => ({ ...m, [ds]: null }));
      const { subject, back } = splitDs(ds);
      // 失敗は 'error' として覚え、詳細に文と「もう一度読み込む」を出す（2026-10-22 修正: 失敗すると「分野を読み込み中…」のままだった）
      fetchTreeManifest(subject, back ? 'back' : 'front')
        .then((mf) => setManifests((m) => ({ ...m, [ds]: mf })))
        .catch(() => setManifests((m) => ({ ...m, [ds]: 'error' })));
    }
  }, [needDs, manifests]);
  /** 読めなかった科目の manifest を読み直す（覚えた 'error' を消すと上の effect が取り直す）*/
  const retryManifest = (ds: string) =>
    setManifests((m) => {
      const { [ds]: _drop, ...rest } = m;
      return rest;
    });

  const rows = useMemo<Row[]>(() => {
    if (!data) return [];
    const list: Row[] = [];
    for (const s of data.students) {
      const name = names?.[s.key] ?? null;
      if (filter === 'all') {
        const sj = Object.values(s.subj);
        list.push({
          s,
          name,
          score: sj.reduce((a, x) => a + x.score, 0),
          day: sj.reduce((a, x) => addDay(a, x.day), zeroDay()),
          prev: sj.reduce((a, x) => addDay(a, x.prev), zeroDay()),
          dss: Object.keys(s.subj).sort((a, b) => chips.indexOf(a) - chips.indexOf(b)),
        });
        continue;
      }
      const { subject, back } = splitDs(filter);
      const sj: StaffSubject | undefined = s.subj[filter];
      // ROUTE は開ける科目の生徒を全員（0 点も）、ABYSS は記録がある生徒だけ
      if (!sj && (back || !treeSubjectsFor(s.subjects).includes(subject))) continue;
      list.push({ s, name, score: sj?.score ?? 0, day: sj?.day ?? zeroDay(), prev: sj?.prev ?? zeroDay(), dss: [filter] });
    }
    const byName = (a: Row, b: Row) => {
      const g = (x: Row) => {
        const i = GRADE_ORDER.indexOf(x.s.grade);
        return i < 0 ? 99 : i;
      };
      return g(a) - g(b) || (a.name ?? a.s.nickname).localeCompare(b.name ?? b.s.nickname, 'ja');
    };
    const cmp: Record<SortKey, (a: Row, b: Row) => number> = {
      gain: (a, b) => b.day.gain - a.day.gain || b.day.plays - a.day.plays || b.score - a.score,
      score: (a, b) => b.score - a.score,
      plays: (a, b) => b.day.plays - a.day.plays || b.day.gain - a.day.gain,
      rate: (a, b) => (rateOf(b.day) ?? -1) - (rateOf(a.day) ?? -1) || b.day.plays - a.day.plays,
      name: byName,
    };
    return list.sort((a, b) => cmp[sort](a, b) || byName(a, b));
  }, [data, names, filter, sort, chips]);

  const sum = useMemo(() => {
    const day = rows.reduce((a, r) => addDay(a, r.day), zeroDay());
    const prev = rows.reduce((a, r) => addDay(a, r.prev), zeroDay());
    return {
      day,
      prev,
      active: rows.filter((r) => r.day.plays > 0).length,
      activePrev: rows.filter((r) => r.prev.plays > 0).length,
    };
  }, [rows]);

  const toggle = (key: string) =>
    setOpen((o) => {
      const n = new Set(o);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });

  const isToday = !!data && data.date === data.today;

  return (
    <div className={rootClass('tr-rank st-root')}>
      <div className="tr-rank-head">
        <button type="button" className="tr-iconbtn" aria-label="戻る" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <div className="tr-rank-title">
          <Ico id="i-lines" size={20} />
          <span>生徒の進捗</span>
          <span className="st-badge">先生用</span>
        </div>
      </div>

      <div className="tr-rank-body st-body">
        <div className="st-datebar">
          <button
            type="button"
            className="tr-iconbtn"
            aria-label="前の日"
            disabled={!data || data.date <= data.minDate}
            onClick={() => data && setDate(shiftDate(data.date, -1))}
          >
            <span className="st-flip">
              <Ico id="i-chev-right" size={16} />
            </span>
          </button>
          <div className="st-date">
            <div className="st-date-main">
              {data ? fmtDate(data.date) : '…'}
              {isToday && <span className="st-today">今日</span>}
            </div>
            <div className="st-date-sub">{data ? `前日 ${fmtDate(data.prevDate)} と比べる` : ''}</div>
          </div>
          <button
            type="button"
            className="tr-iconbtn"
            aria-label="次の日"
            disabled={!data || isToday}
            onClick={() => data && setDate(shiftDate(data.date, 1))}
          >
            <Ico id="i-chev-right" size={16} />
          </button>
          {data && !isToday && (
            <button type="button" className="st-chipbtn" onClick={() => setDate(null)}>
              今日へ
            </button>
          )}
          <button type="button" className="st-chipbtn" aria-label="再読み込み" onClick={() => setNonce((n) => n + 1)}>
            更新
          </button>
        </div>

        <div className="tr-chips" role="listbox" aria-label="科目">
          {['all', ...chips].map((ds) => (
            <button
              key={ds}
              type="button"
              role="option"
              aria-selected={filter === ds}
              className={filter === ds ? 'is-on' : ''}
              onClick={() => setFilter(ds)}
            >
              {ds === 'all' ? '全科目' : dsLabel(ds)}
            </button>
          ))}
        </div>

        <div className="st-sortbar">
          <span>並べ替え</span>
          <div className="tr-chips" role="listbox" aria-label="並べ替え">
            {SORTS.map((x) => (
              <button
                key={x.key}
                type="button"
                role="option"
                aria-selected={sort === x.key}
                className={sort === x.key ? 'is-on' : ''}
                onClick={() => setSort(x.key)}
              >
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
        ) : (
          <>
            <div className="st-tiles">
              <Tile label="プレイした生徒" value={`${sum.active}`} unit={` / ${rows.length} 人`} prev={`${sum.activePrev} 人`} />
              <Tile label="プレイ回数" value={`${sum.day.plays}`} unit=" 回" prev={`${sum.prev.plays} 回`} />
              <Tile label="スコアの増加" value={fmtGain(sum.day.gain)} prev={fmtGain(sum.prev.gain)} />
              <Tile label="正答率" value={fmtRate(rateOf(sum.day))} prev={fmtRate(rateOf(sum.prev))} />
            </div>

            {rows.length === 0 ? (
              <div className="tr-panel" style={{ textAlign: 'center', fontSize: 13, padding: '28px 16px' }}>
                この科目の生徒はいません。
              </div>
            ) : (
              <div className="st-list">
                <div className="st-row st-headrow" aria-hidden>
                  <span>名前</span>
                  <span>総スコア</span>
                  <span>増加</span>
                  <span>プレイ</span>
                  <span>正答率</span>
                  <span>最終</span>
                </div>
                {rows.map((r) => {
                  const on = open.has(r.s.key);
                  return (
                    <Fragment key={r.s.key}>
                      <button
                        type="button"
                        className={`st-row${on ? ' is-open' : ''}${r.day.plays ? ' is-active' : ''}`}
                        aria-expanded={on}
                        onClick={() => toggle(r.s.key)}
                      >
                        <span className="st-name">
                          <span className="tr-grade">{gradeLabel(r.s.grade)}</span>
                          <span className="st-name-txt">
                            <b>{r.name ?? (names ? '（名簿に無し）' : r.s.nickname)}</b>
                            <small>
                              {r.name || names ? r.s.nickname : ''}
                              <span className="st-last-inline"> · 最終 {fmtLast(r.s.lastAt, data.today)}</span>
                            </small>
                          </span>
                        </span>
                        <Cell label="総スコア" main={fmtScore(r.score)} />
                        <Cell label="増加" main={fmtGain(r.day.gain)} sub={`前日 ${fmtGain(r.prev.gain)}`} hot={r.day.gain > 0} />
                        <Cell label="プレイ" main={`${r.day.plays}`} sub={`前日 ${r.prev.plays}`} hot={r.day.plays > 0} />
                        <Cell label="正答率" main={fmtRate(rateOf(r.day))} sub={`前日 ${fmtRate(rateOf(r.prev))}`} />
                        <span className="st-cell st-last tr-num">{fmtLast(r.s.lastAt, data.today)}</span>
                      </button>
                      {on && <Detail row={r} manifests={manifests} onRetry={retryManifest} />}
                    </Fragment>
                  );
                })}
              </div>
            )}
            <div className="st-foot">
              増加 = その日に上がったスコア（自己ベストの更新分）。総スコア = その日の終わりの時点。正答率 = その日に解いた問題のうち正解の割合。
              行を押すと分野ごとの内訳（マスター度と今年度の正答率つき。{LOW_MIN} 問以上解いて {LOW_RATE}% 未満の分野はオレンジ）が開きます。
              マスター度 = 生徒のツリーと同じ値で、日付を戻してもいまの値です。
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, unit, prev }: { label: string; value: string; unit?: string; prev: string }) {
  return (
    <div className="st-tile">
      <div className="st-tile-label">{label}</div>
      <div className="st-tile-value tr-num">
        {value}
        {unit && <small>{unit}</small>}
      </div>
      <div className="st-tile-prev">前日 {prev}</div>
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

/** 展開: 科目ごとに分野の内訳（manifest の順。問題がある分野は 0 点でも出す）*/
function Detail({ row, manifests, onRetry }: { row: Row; manifests: Record<string, TreeManifest | null | 'error'>; onRetry: (ds: string) => void }) {
  const dss = row.dss;
  if (!dss.length) return <div className="st-detail st-detail-empty">今年度の記録はまだありません。</div>;
  return (
    <div className="st-detail">
      {dss.map((ds) => {
        const sj = row.s.subj[ds];
        const got = manifests[ds];
        const failed = got === 'error';
        const mf = failed ? null : got;
        const fields = mf
          ? mf.fields.filter((f) => f.total > 0 || sj?.fields[f.id])
          : Object.keys(sj?.fields ?? {}).map((id) => ({ id, name: id, group: 'basic', total: 0 }));
        const seasonRate = sj ? rateOf(sj.season) : null;
        return (
          <div key={ds} className="st-subj">
            <div className="st-subj-head">
              <span>{dsLabel(ds)}</span>
              <span className="tr-num">
                {sj
                  ? `今年度 ${sj.season.plays} 回 · 正答率 ${fmtRate(seasonRate)} · マスター度 ${fmtMastery(sj.mastery)}`
                  : '記録なし'}
              </span>
            </div>
            {failed ? (
              <div className="st-detail-empty">
                分野を読み込めませんでした。
                <button type="button" className="tr-ghost" style={{ width: 200, marginTop: 6 }} onClick={() => onRetry(ds)}>
                  もう一度読み込む
                </button>
              </div>
            ) : (
              !mf && <div className="st-detail-empty">分野を読み込み中…</div>
            )}
            <div className="st-frows">
              <div className="st-frow st-fhead" aria-hidden>
                <span>分野</span>
                <span>スコア</span>
                <span>マスター度</span>
                <span>増加</span>
                <span>プレイ</span>
                <span>正答率</span>
                <span>今年度</span>
              </div>
              {fields.map((f) => {
                const x = sj?.fields[f.id];
                const max = f.total * 100;
                const pct = max && x ? Math.min(100, (x.score / max) * 100) : 0;
                const day = x?.day ?? zeroDay();
                const prev = x?.prev ?? zeroDay();
                const season = x?.season ?? zeroSeason;
                const sr = rateOf(season);
                const low = sr != null && season.total >= LOW_MIN && sr < LOW_RATE;
                return (
                  <div key={f.id} className={`st-frow${x && (x.score > 0 || season.plays || day.plays || prev.plays) ? '' : ' is-zero'}`}>
                    <span className="st-fname">
                      <i style={{ background: groupColor(f.group) }} />
                      {f.name}
                    </span>
                    <span className="st-fscore">
                      <span className="tr-num">{fmtScore(x?.score ?? 0)}</span>
                      {max > 0 && (
                        <span className="st-bar">
                          <span style={{ width: `${pct}%`, background: groupColor(f.group) }} />
                        </span>
                      )}
                    </span>
                    <span className="tr-num st-fcell">
                      {fmtMastery(x ? x.mastery : sj?.mastery == null ? undefined : 0)}
                      <small>いま</small>
                    </span>
                    <span className={`tr-num st-fcell${day.gain > 0 ? ' is-hot' : ''}`}>
                      {fmtGain(day.gain)}
                      <small>前日 {fmtGain(prev.gain)}</small>
                    </span>
                    <span className={`tr-num st-fcell${day.plays > 0 ? ' is-hot' : ''}`}>
                      {day.plays} 回<small>前日 {prev.plays}</small>
                    </span>
                    <span className="tr-num st-fcell">
                      {fmtRate(rateOf(day))}
                      <small>前日 {fmtRate(rateOf(prev))}</small>
                    </span>
                    <span className={`tr-num st-fcell${low ? ' is-low' : ''}`}>
                      {fmtRate(sr)}
                      <small>今年度 {season.plays} 回</small>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
