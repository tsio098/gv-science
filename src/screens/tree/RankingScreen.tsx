/**
 * ANCHOR TREE — ランキング（設計書 §5.4 / モック Ranking.dc.html）。
 * 科目 / 分野 / 種別 の 3 階層。表示は学年 + ニックネーム、上位 50 + 自分の行（クリーム・下に固定）。
 * 分野・種別は、開いた場所（選んでいたノード・結果画面）を初期値にし、チップで切り替える。
 * 「アリーナ」タブ（ROUTE だけ・設計書 §5.7）: 今シーズン / 前シーズン / 2 シーズン合算（スコア → 時間の短い順）。
 * 前シーズンの 1 位は「チャンピオン」。2 シーズン合算の 1 位にボーナスチケット（未実装）
 */
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { ArenaRankWhich, ArenaSeason, QType, TreeManifest, TreeRanking, TreeStage } from '../../lib/treeApi';
import { QTYPES, QTYPE_LABEL, fetchArenaRanking, fetchTreeRanking, gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { ARENA_GOLD, CROWN_MONO, alpha, arenaPeriod, arenaSeasonName, fmtScore, fmtTime, groupColor, rootClass } from './treeTheme';

export type RankScope = 'subject' | 'field' | 'type' | 'arena';

interface Props {
  manifest: TreeManifest;
  /** ABYSS のランキングは ROUTE と別集計 */
  stage?: TreeStage;
  initial: { scope: RankScope; field: string | null; qtype: QType };
  /** チャンピオンアリーナのタブを出す（ROUTE で、Proxy がアリーナに対応しているとき）*/
  arena?: boolean;
  onBack: () => void;
}

/** アリーナの行は時間も出す（同点は時間の短い順）*/
type Row = TreeRanking['top'][number] & { elapsedMs?: number };

const SCOPES: { key: RankScope; label: string }[] = [
  { key: 'subject', label: '科目' },
  { key: 'field', label: '分野' },
  { key: 'type', label: '種別' },
  { key: 'arena', label: 'アリーナ' },
];
const PODIUM = [
  { top: '#FFD84A', side: '#A88A14', avatar: '#2DF4C6' },
  { top: '#C9D3CC', side: '#6B7869', avatar: '#FF7AB8' },
  { top: '#D9A47A', side: '#8A5A3C', avatar: '#D08BFF' },
];
/** アリーナタブの表彰台（夜の配色・2026-10-17）: 1 位 金 / 2 位 銀 / 3 位 銅 */
const ARENA_PODIUM = [
  { top: '#FFD84A', side: '#A88A14', avatar: '#2DF4C6', label: '#FFD84A' },
  { top: '#C9D3E6', side: '#6E7891', avatar: '#FF7AB8', label: '#DDE5F5' },
  { top: '#E3A26A', side: '#8A5530', avatar: '#D08BFF', label: '#F0B98A' },
];
const QTYPE_SHORT: Record<QType, string> = { tf: '正誤', calc: '計算', reason: '考察' };

export function RankingScreen({ manifest, stage = 'front', initial, arena = false, onBack }: Props) {
  const ready = useMemo(() => manifest.fields.filter((f) => f.total > 0), [manifest]);
  const arenaOn = arena && stage === 'front';
  const [scope, setScope] = useState<RankScope>(initial.scope === 'arena' && !arenaOn ? 'subject' : initial.scope);
  const [arenaSeason, setArenaSeason] = useState<ArenaRankWhich>('current');
  const [seasonInfo, setSeasonInfo] = useState<ArenaSeason[] | null>(null);
  const [played, setPlayed] = useState(false);
  const [field, setField] = useState<string>(() =>
    initial.field && ready.some((f) => f.id === initial.field) ? initial.field : ready[0]?.id ?? ''
  );
  const [qtype, setQtype] = useState<QType>(initial.qtype);
  const [data, setData] = useState<TreeRanking | null>(null);
  /** アリーナ: 先生のスコア（順位なしの行で差し込む・2026-10-19）*/
  const [staff, setStaff] = useState<{ score: number; elapsedMs: number } | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  const f = manifest.fields.find((x) => x.id === field);
  const typeCount = (t: QType) => (f?.types[t] ?? []).length;
  // 種別タブで問題の無い種別を選んでいたら、ある種別に寄せる
  useEffect(() => {
    if (scope === 'type' && f && !typeCount(qtype)) {
      const t = QTYPES.find((x) => typeCount(x) > 0);
      if (t) setQtype(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, field]);

  useEffect(() => {
    let alive = true;
    setError(false);
    setData(null);
    setStaff(null);
    if (scope === 'arena') {
      fetchArenaRanking(manifest.subject, arenaSeason)
        .then((d) => {
          if (!alive) return;
          setSeasonInfo(d.pair ?? [d.season]);
          setPlayed(d.me.played);
          setStaff(d.staff ?? null);
          setData({ subject: d.subject, field: '*', qtype: '*', count: d.count, top: d.top, me: d.me });
        })
        .catch(() => alive && setError(true));
      return () => {
        alive = false;
      };
    }
    const req =
      scope === 'subject'
        ? fetchTreeRanking(manifest.subject, '*', '*', stage)
        : scope === 'field'
          ? fetchTreeRanking(manifest.subject, field, '*', stage)
          : fetchTreeRanking(manifest.subject, field, qtype, stage);
    req.then((d) => alive && setData(d)).catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [scope, field, qtype, manifest.subject, stage, nonce, arenaSeason]);

  const isArena = scope === 'arena';
  const title = isArena
    ? seasonInfo
      ? seasonInfo.length > 1
        ? `${seasonInfo[0]!.n >= 1 ? `シーズン ${seasonInfo.map((s) => s.n).join('・')}` : 'プレシーズン'} 合算 · ${arenaPeriod({ start: seasonInfo[0]!.start, end: seasonInfo[seasonInfo.length - 1]!.end }, true)}`
        : `${arenaSeasonName(seasonInfo[0]!.n)} · ${arenaPeriod(seasonInfo[0]!, true)}`
      : ''
    : scope === 'subject'
      ? `${manifest.name} 全体`
      : scope === 'field'
        ? f?.name ?? ''
        : `${f?.name ?? ''} · ${QTYPE_SHORT[qtype]}`;
  const podium: Row[] = data?.top.slice(0, 3) ?? [];
  const rows: Row[] = data?.top.slice(3) ?? [];
  /**
   * 先生の行を入れる位置（スコア降順 → 時間の短い順の並びで、生徒の何人目の前か）。生徒の順位は変えない。
   * 1 位より上なら表彰台の上・表彰台の途中（1〜3 位のあいだ）なら表彰台のすぐ下に「n位とm位のあいだ」と添える
   */
  const staffAt = isArena && staff && data
    ? (() => {
        const i = (data.top as Row[]).findIndex((r) => r.score < staff.score || (r.score === staff.score && (r.elapsedMs ?? 0) > staff.elapsedMs));
        return i < 0 ? data.top.length : i;
      })()
    : null;
  const staffAbove = staffAt === 0 && podium.length > 0;
  /** 表彰台の途中に入る → 表彰台のすぐ下（リストの先頭）*/
  const staffMid = staffAt != null && staffAt > 0 && staffAt < podium.length;
  const staffListAt = staffMid ? podium.length : staffAt;
  const staffNote = staffMid ? `${podium[staffAt! - 1]!.rank}位と${podium[staffAt!]!.rank}位のあいだ` : '順位なし';
  const staffRow = staff && (
    <div className="tr-rank-row is-staff" aria-label={`先生 ${fmtScore(staff.score)} 点（${staffNote}）`}>
      <span className="tr-num tr-rank-n">—</span>
      <span className="tr-grade">先生</span>
      <span className="tr-rank-name">
        先生 <small>{staffNote}</small>
      </span>
      <span className="tr-num" style={{ fontSize: 11, color: 'var(--tr-sub)', fontWeight: 500 }}>
        {fmtTime(staff.elapsedMs)}
      </span>
      <span className="tr-num">{fmtScore(staff.score)}</span>
    </div>
  );
  /** 前シーズンの 1 位 = シーズンチャンピオン */
  const champion = (r: Row) => isArena && arenaSeason === 'prev' && r.rank === 1;

  return (
    // アリーナタブを選んでいる間は画面全体をアリーナ配色（夜の紫 + 金）に
    <div className={rootClass(isArena ? 'tr-rank is-arena' : 'tr-rank')}>
      <div className="tr-rank-head">
        <button type="button" className="tr-iconbtn" aria-label="戻る" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <div className="tr-rank-title">
          <span style={{ color: '#FFD84A', display: 'flex' }}>
            <Ico id="i-trophy" size={20} />
          </span>
          <span>ランキング</span>
          {stage === 'back' && <span className="ab-pill">ABYSS</span>}
        </div>
      </div>

      <div className="tr-rank-body">
        <div className="tr-seg" role="tablist">
          {SCOPES.filter((s) => s.key !== 'arena' || arenaOn).map((s) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={scope === s.key}
              className={scope === s.key ? 'is-on' : ''}
              onClick={() => setScope(s.key)}
            >
              {s.label}
            </button>
          ))}
        </div>

        {isArena && (
          <div className="tr-chips" role="listbox" aria-label="シーズン">
            {(['current', 'prev', 'pair'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={arenaSeason === s}
                className={arenaSeason === s ? 'is-on' : ''}
                onClick={() => setArenaSeason(s)}
              >
                {arenaSeason === s && <img src={CROWN_MONO} alt="" className="tr-ar-chipcrown" />}
                {s === 'current' ? '今シーズン' : s === 'prev' ? '前シーズン' : '2シーズン合算'}
              </button>
            ))}
          </div>
        )}

        {scope !== 'subject' && !isArena && (
          <div className="tr-chips" role="listbox" aria-label="分野">
            {ready.map((x) => (
              <button
                key={x.id}
                type="button"
                role="option"
                aria-selected={x.id === field}
                className={x.id === field ? 'is-on' : ''}
                style={
                  x.id === field
                    ? {
                        borderColor: groupColor(x.group),
                        color: groupColor(x.group),
                        boxShadow: `0 0 10px ${alpha(groupColor(x.group), 0.4)}`,
                      }
                    : undefined
                }
                onClick={() => setField(x.id)}
              >
                {x.name}
              </button>
            ))}
          </div>
        )}
        {scope === 'type' && (
          <div className="tr-chips" role="listbox" aria-label="種別">
            {QTYPES.map((t) => (
              <button
                key={t}
                type="button"
                role="option"
                aria-selected={t === qtype}
                className={t === qtype ? 'is-on' : ''}
                disabled={!typeCount(t)}
                onClick={() => setQtype(t)}
              >
                <Ico id={t === 'tf' ? 'i-tf' : t === 'calc' ? 'i-calc' : 'i-reason'} size={12} />
                {QTYPE_LABEL[t]}
              </button>
            ))}
          </div>
        )}

        <div className="tr-rank-sub">
          <span>{title}</span>
          {!isArena && <span style={{ whiteSpace: 'nowrap' }}>{data ? `スコア順 · ${data.count} 人` : ''}</span>}
        </div>

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
        ) : data.count === 0 ? (
          <>
          {staffRow && <div className="tr-rank-list">{staffRow}</div>}
          <div className="tr-panel" style={{ textAlign: 'center', color: 'var(--tr-sub)', fontSize: 13, padding: '28px 16px' }}>
            {isArena
              ? arenaSeason === 'prev'
                ? 'このシーズンの記録はありません。'
                : arenaSeason === 'pair'
                  ? 'この 2 シーズンの記録はまだありません。'
                  : '今シーズンはまだ誰も載っていません。ツリーの一番下のアリーナのノードから挑戦できます。'
              : 'まだ誰も載っていません。1 問正解するとランキングに載ります。'}
          </div>
          </>
        ) : (
          <>
            {staffAbove && <div className="tr-rank-list">{staffRow}</div>}
            <div className="tr-podium">
              {podium.map((p, i) => {
                const set = isArena ? ARENA_PODIUM : PODIUM;
                const c = set[Math.min(p.rank, 3) - 1] ?? set[i]!;
                const label = 'label' in c ? (c as (typeof ARENA_PODIUM)[number]).label : c.top;
                return (
                  <div
                    key={i}
                    className={`tr-podium-card${p.me ? ' is-me' : ''}${isArena && p.rank === 1 ? ' is-first' : ''}`}
                    style={{ borderColor: c.top, boxShadow: `4px 4px 0 0 ${c.side}` }}
                  >
                    <div className={`tr-num tr-podium-rank${champion(p) ? ' is-champ' : ''}`} style={{ color: label }}>
                      {champion(p) && <img src={CROWN_MONO} alt="" className="tr-ar-chipcrown" />}
                      {champion(p) ? 'チャンピオン' : `${p.rank}位`}
                    </div>
                    <div className="tr-avatar" style={{ background: c.avatar }}>
                      {[...p.nickname][0]}
                    </div>
                    <div className="tr-podium-name">{p.nickname}</div>
                    <div style={{ fontSize: 10, color: 'var(--tr-sub)' }}>{gradeLabel(p.grade)}</div>
                    <div className="tr-num tr-podium-score" style={isArena && p.rank === 1 ? { color: ARENA_GOLD } : undefined}>
                      {fmtScore(p.score)}
                    </div>
                    {isArena && p.elapsedMs != null && (
                      <div className="tr-num" style={{ fontSize: 10, color: 'var(--tr-sub)' }}>
                        {fmtTime(p.elapsedMs)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {(rows.length > 0 || (staffAt != null && !staffAbove)) && (
              <div className="tr-rank-list">
                {rows.map((r, i) => (
                  <Fragment key={i}>
                  {staffListAt != null && !staffAbove && staffListAt === i + podium.length && staffRow}
                  <div className={`tr-rank-row${r.me ? ' is-me' : ''}`}>
                    <span className="tr-num tr-rank-n">{r.rank}</span>
                    <span className="tr-grade">{gradeLabel(r.grade)}</span>
                    <span className="tr-rank-name">{r.nickname}</span>
                    {isArena && r.elapsedMs != null && (
                      <span className="tr-num" style={{ fontSize: 11, color: 'var(--tr-sub)', fontWeight: 500 }}>
                        {fmtTime(r.elapsedMs)}
                      </span>
                    )}
                    <span className="tr-num">{fmtScore(r.score)}</span>
                  </div>
                  </Fragment>
                ))}
                {staffListAt != null && !staffAbove && staffListAt >= rows.length + podium.length && staffRow}
              </div>
            )}
          </>
        )}
      </div>

      {data && (
        <div className="tr-rank-me">
          <div className="tr-rank-row is-pinned">
            <span className="tr-num tr-rank-n">{data.me.rank ?? '—'}</span>
            <span className="tr-grade">{gradeLabel(data.me.grade)}</span>
            <span className="tr-rank-name">
              {data.me.nickname} <small>あなた</small>
            </span>
            <span className="tr-num">{data.me.rank ? fmtScore(data.me.score) : '未掲載'}</span>
          </div>
          <div className="tr-rank-foot">
            {isArena
              ? data.me.rank
                ? 'ニックネームは結果画面で変えられます'
                : played
                  ? '0 点はランキングに載りません'
                  : arenaSeason === 'prev'
                    ? 'このシーズンは挑戦していません'
                    : arenaSeason === 'pair'
                      ? '2 シーズンとも挑戦すると合算に載ります'
                      : '今シーズン未挑戦 · ツリーの一番下のアリーナのノードから挑戦できます'
              : data.me.rank
                ? 'ニックネームは結果画面で変えられます'
                : '1 問正解するとランキングに載ります · ニックネームは結果画面で変えられます'}
          </div>
        </div>
      )}
    </div>
  );
}
