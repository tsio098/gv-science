/**
 * ANCHOR TREE — ランキング（設計書 §5.4 / モック Ranking.dc.html）。
 * 科目 / 分野 / 種別 の 3 階層。表示は学年 + ニックネーム、上位 50 + 自分の行（クリーム・下に固定）。
 * 分野・種別は、開いた場所（選んでいたノード・結果画面）を初期値にし、チップで切り替える。
 * 「アリーナ」タブ（ROUTE だけ・設計書 §5.7）: チャンピオンアリーナの今シーズン / 前シーズン（スコア → 時間の短い順）。前シーズンの 1 位に王冠
 */
import { useEffect, useMemo, useState } from 'react';
import type { ArenaSeason, QType, TreeManifest, TreeRanking, TreeStage } from '../../lib/treeApi';
import { QTYPES, QTYPE_LABEL, fetchArenaRanking, fetchTreeRanking, gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { ARENA_GOLD, T, alpha, arenaPeriod, arenaSeasonName, fmtScore, fmtTime, groupColor, rootClass } from './treeTheme';

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
const QTYPE_SHORT: Record<QType, string> = { tf: '正誤', calc: '計算', reason: '考察' };

export function RankingScreen({ manifest, stage = 'front', initial, arena = false, onBack }: Props) {
  const ready = useMemo(() => manifest.fields.filter((f) => f.total > 0), [manifest]);
  const arenaOn = arena && stage === 'front';
  const [scope, setScope] = useState<RankScope>(initial.scope === 'arena' && !arenaOn ? 'subject' : initial.scope);
  const [arenaSeason, setArenaSeason] = useState<'current' | 'prev'>('current');
  const [seasonInfo, setSeasonInfo] = useState<ArenaSeason | null>(null);
  const [played, setPlayed] = useState(false);
  const [field, setField] = useState<string>(() =>
    initial.field && ready.some((f) => f.id === initial.field) ? initial.field : ready[0]?.id ?? ''
  );
  const [qtype, setQtype] = useState<QType>(initial.qtype);
  const [data, setData] = useState<TreeRanking | null>(null);
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
    if (scope === 'arena') {
      fetchArenaRanking(manifest.subject, arenaSeason)
        .then((d) => {
          if (!alive) return;
          setSeasonInfo(d.season);
          setPlayed(d.me.played);
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
      ? `${arenaSeasonName(seasonInfo.n)} · ${arenaPeriod(seasonInfo, true)}`
      : ''
    : scope === 'subject'
      ? `${manifest.name} 全体`
      : scope === 'field'
        ? f?.name ?? ''
        : `${f?.name ?? ''} · ${QTYPE_SHORT[qtype]}`;
  const podium: Row[] = data?.top.slice(0, 3) ?? [];
  const rows: Row[] = data?.top.slice(3) ?? [];
  /** 前シーズンの 1 位 = シーズンチャンピオン */
  const champion = (r: Row) => isArena && arenaSeason === 'prev' && r.rank === 1;

  return (
    <div className={rootClass('tr-rank')}>
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
            {(['current', 'prev'] as const).map((s) => (
              <button
                key={s}
                type="button"
                role="option"
                aria-selected={arenaSeason === s}
                className={arenaSeason === s ? 'is-on' : ''}
                style={arenaSeason === s ? { borderColor: ARENA_GOLD, color: ARENA_GOLD, boxShadow: `0 0 10px ${alpha(ARENA_GOLD, 0.4)}` } : undefined}
                onClick={() => setArenaSeason(s)}
              >
                <Ico id="i-crown" size={12} />
                {s === 'current' ? '今シーズン' : '前シーズン'}
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
          <span>{data ? `${isArena ? 'スコア→時間順' : 'スコア順'} · ${data.count} 人` : ''}</span>
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
          <div className="tr-panel" style={{ textAlign: 'center', color: T.sub, fontSize: 13, padding: '28px 16px' }}>
            {isArena
              ? arenaSeason === 'prev'
                ? 'このシーズンの記録はありません。'
                : '今シーズンはまだ誰も載っていません。ツリーの一番下の門から挑戦できます。'
              : 'まだ誰も載っていません。1 問正解するとランキングに載ります。'}
          </div>
        ) : (
          <>
            <div className="tr-podium">
              {podium.map((p, i) => {
                const c = PODIUM[Math.min(p.rank, 3) - 1] ?? PODIUM[i]!;
                return (
                  <div
                    key={i}
                    className={`tr-podium-card${p.me ? ' is-me' : ''}`}
                    style={{ borderColor: c.top, boxShadow: `4px 4px 0 0 ${c.side}` }}
                  >
                    <div className="tr-num" style={{ fontSize: 12, fontWeight: 700, color: c.top, display: 'flex', alignItems: 'center', gap: 3 }}>
                      {champion(p) && <Ico id="i-crown" size={12} />}
                      {champion(p) ? '王者' : `${p.rank}位`}
                    </div>
                    <div className="tr-avatar" style={{ background: c.avatar }}>
                      {[...p.nickname][0]}
                    </div>
                    <div className="tr-podium-name">{p.nickname}</div>
                    <div style={{ fontSize: 10, color: T.sub }}>{gradeLabel(p.grade)}</div>
                    <div className="tr-num" style={{ fontSize: 13, fontWeight: 700 }}>
                      {fmtScore(p.score)}
                    </div>
                    {isArena && p.elapsedMs != null && (
                      <div className="tr-num" style={{ fontSize: 10, color: T.sub }}>
                        {fmtTime(p.elapsedMs)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {rows.length > 0 && (
              <div className="tr-rank-list">
                {rows.map((r, i) => (
                  <div key={i} className={`tr-rank-row${r.me ? ' is-me' : ''}`}>
                    <span className="tr-num tr-rank-n">{r.rank}</span>
                    <span className="tr-grade">{gradeLabel(r.grade)}</span>
                    <span className="tr-rank-name">{r.nickname}</span>
                    {isArena && r.elapsedMs != null && (
                      <span className="tr-num" style={{ fontSize: 11, color: T.sub, fontWeight: 500 }}>
                        {fmtTime(r.elapsedMs)}
                      </span>
                    )}
                    <span className="tr-num">{fmtScore(r.score)}</span>
                  </div>
                ))}
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
                    : '今シーズン未挑戦 · ツリーの一番下の門から挑戦できます'
              : data.me.rank
                ? 'ニックネームは結果画面で変えられます'
                : '1 問正解するとランキングに載ります · ニックネームは結果画面で変えられます'}
          </div>
        </div>
      )}
    </div>
  );
}
