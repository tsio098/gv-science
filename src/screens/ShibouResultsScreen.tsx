/**
 * おすすめ志望校 — 表示画面。
 *  GAS `recoResults`（id_token認証・USERIDで自分の結果を取得）の行をカード表示。
 *  判定は絵文字を使わず、カード左の色帯＋ラベルボックスで表現。得点は「あなた vs 合格ライン」のバー図。
 *  ★過去の調査も閲覧可（2026-07-29・Compassと同方式）：GASは全調査インスタンスを返し、
 *   「書込時刻」でグループ化して依頼ごとにページ切替で表示する（0ページ目=最新の依頼）。
 */
import { useRef, useState } from 'react';
import { fetchRecoResults } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn, RecoResult } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

interface Props {
  nav: NavFn;
}

type BandMeta = { label: string; sub: string; accent: string; soft: string; ink: string };

/** 判定文字列（🟦安全/🟩適正/🟥挑戦/⬛再考/－成績未登録）→ 色とラベル（絵文字は使わない・語彙は大人向け）。 */
const BAND_DEFS: Array<{ key: string } & BandMeta> = [
  { key: '安全', label: '安全', sub: '合格圏', accent: '#4e9b73', soft: 'rgba(78,155,115,0.14)', ink: '#2f7d52' },
  { key: '適正', label: '適正', sub: '実力相応', accent: '#7aa84a', soft: 'rgba(120,170,90,0.16)', ink: '#5a7d2a' },
  { key: '挑戦', label: '挑戦', sub: 'やや上', accent: '#e0883c', soft: 'rgba(224,136,60,0.16)', ink: '#b5642a' },
  { key: '再考', label: '要再考', sub: '現状は厳しい', accent: '#c95b5b', soft: 'rgba(201,91,91,0.14)', ink: '#a13b3b' },
  { key: '推薦', label: '推薦', sub: '別ルート', accent: '#5b7fa1', soft: 'rgba(91,127,161,0.14)', ink: '#3f6088' },
];
function bandMeta(raw: string): BandMeta {
  const b = raw || '';
  // 判定トークンは文字列先頭に来る（括弧内の注記に「挑戦」「安全ルート」等が混ざり得るため、最初に現れた語で判定する）
  let hit: BandMeta | null = null; let pos = Infinity;
  for (const def of BAND_DEFS) { const i = b.indexOf(def.key); if (i >= 0 && i < pos) { pos = i; hit = def; } }
  if (hit) return hit;
  return { label: '判定保留', sub: '模試成績が未登録', accent: '#a7a79c', soft: 'rgba(120,120,110,0.12)', ink: '#777' };
}

/** あなたの得点 vs 合格ライン のバー */
function ScoreBar({ you, line, accent }: { you: number | null; line: number | null; accent: string }) {
  if (you == null) return null;
  const clamp = (n: number) => Math.max(0, Math.min(100, n));
  return (
    <div style={S.barWrap}>
      <div style={S.barTrack}>
        <div style={{ ...S.barFill, width: `${clamp(you)}%`, background: accent }} />
        {line != null && <div style={{ ...S.barLine, left: `${clamp(line)}%` }} />}
      </div>
      <div style={S.barLabels}>
        <span style={{ color: accent, fontWeight: 700 }}>あなた {you}%</span>
        {line != null && <span style={S.barLineLabel}>合格ライン {line}%</span>}
      </div>
    </div>
  );
}

function toNum(v: unknown): number | null {
  if (v === '' || v == null) return null;
  const n = Number(v);
  return isNaN(n) ? null : n;
}

/** 依頼（調査インスタンス＝書込時刻）ごとのグループ。旧データ（書込時刻なし）は調査日でまとめる。 */
type Group = { key: string; want: string; date: string; ts: number; rows: RecoResult[] };
function groupByRequest(results: RecoResult[]): Group[] {
  const groups: Group[] = [];
  for (const r of results) {
    const wa = String(r['書込時刻'] || '');
    const d = String(r['調査日'] || '');
    const key = wa || d;
    const g = groups.find((x) => x.key === key);
    if (g) g.rows.push(r);
    else groups.push({ key, want: String(r['依頼内容'] || ''), date: d, ts: wa ? (new Date(wa).getTime() || 0) : 0, rows: [r] });
  }
  groups.sort((a, b) => b.ts - a.ts); // 新しい依頼を先頭ページに（安定ソート＝時刻不明の旧データはGASの返却順を維持）
  return groups;
}

export function ShibouResultsScreen({ nav }: Props) {
  const { data, loading, error, reload } = useAsync(fetchRecoResults, [], { cacheKey: 'recoResults' });
  const results = data ?? [];
  const [page, setPage] = useState(0); // 依頼単位のページ（0=最新の依頼）
  const scrollRef = useRef<HTMLDivElement>(null); // ページ切替時にスクロールを先頭へ戻す

  const groups = groupByRequest(results);
  const cur = Math.min(page, Math.max(0, groups.length - 1)); // 再読込でページ数が減っても範囲内に収める
  const g = groups[cur];
  const gotoPage = (n: number) => { setPage(n); scrollRef.current?.scrollTo({ top: 0 }); };
  const pager = groups.length > 1 && (
    <div style={S.pager}>
      <button style={{ ...S.pagerBtn, ...(cur === 0 ? S.pagerBtnDisabled : null) }} disabled={cur === 0} onClick={() => gotoPage(cur - 1)}>‹ 新しい依頼</button>
      <span style={S.pagerPos}>{cur + 1} / {groups.length}{cur === 0 ? '（最新）' : ''}</span>
      <button style={{ ...S.pagerBtn, ...(cur >= groups.length - 1 ? S.pagerBtnDisabled : null) }} disabled={cur >= groups.length - 1} onClick={() => gotoPage(cur + 1)}>古い依頼 ›</button>
    </div>
  );

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / おすすめ志望校" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll" ref={scrollRef}>
        <div style={S.pad}>
          <div className="page-head" style={S.headFlush}>
            <div className="page-eyebrow">RECOMMEND</div>
            <h1 className="page-title">おすすめ志望校</h1>
            <p className="page-sub">あなたの希望（やりたいこと）と成績をもとに、研究内容を最優先に選定した候補です。{groups.length > 1 ? '過去に依頼した調査も、ページを切り替えて見られます。' : ''}</p>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : results.length === 0 ? (
            <EmptyState hint="まだおすすめはありません。ホームの「志望校調査を依頼」から送信すると、調査結果がここに表示されます（反映まで少し時間がかかります）。" />
          ) : (
            <div>
              {pager}
              <div style={S.groupHead}>
                <div style={S.groupWant}>{g.want || `調査日 ${g.date || '不明'}`}</div>
                <div style={S.groupSub}>{g.want ? `調査日 ${g.date || '不明'}・` : ''}{g.rows.length}校</div>
              </div>
              {g.rows.map((r, i) => {
                const m = bandMeta(String(r['判定'] || ''));
                const you = toNum(r['傾斜後得点率']);
                const line = toNum(r['ボーダー']);
                return (
                  <div key={i} style={{ ...S.card, borderLeft: `5px solid ${m.accent}` }}>
                    <div style={S.cardTop}>
                      <div style={S.rank}>{r['順位'] ?? i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.school}>{r['大学']}</div>
                        <div style={S.dept}>{r['学部学科/日程']}</div>
                      </div>
                      <div style={{ ...S.bandBox, background: m.accent }}>
                        <div style={S.bandLabel}>{m.label}</div>
                        <div style={S.bandSub}>{m.sub}</div>
                      </div>
                    </div>

                    <ScoreBar you={you} line={line} accent={m.accent} />

                    {r['研究適合'] && (
                      <div style={S.block}>
                        <div style={S.blockHead}>研究内容</div>
                        <div style={S.blockBody}>{r['研究適合']}</div>
                      </div>
                    )}
                    {r['注意'] && (
                      <div style={{ ...S.block, background: m.soft }}>
                        <div style={{ ...S.blockHead, color: m.ink }}>注意</div>
                        <div style={S.blockBody}>{r['注意']}</div>
                      </div>
                    )}
                  </div>
                );
              })}
              {pager}
              <p style={S.foot}>※研究内容を最優先に選定しています。判定（得点の目安）は参考値です。最終的な出願は先生と相談してください。</p>
            </div>
          )}
        </div>
        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  pad: { paddingLeft: 'calc(var(--pad-x) + 6px)', paddingRight: 'calc(var(--pad-x) + 6px)' },
  headFlush: { paddingLeft: 0, paddingRight: 0 },
  card: {
    background: 'var(--c-surface, #fff)',
    border: '1px solid var(--c-line, #e8e5de)',
    borderRadius: 16,
    padding: 14,
    marginTop: 14,
    boxShadow: '0 8px 22px -14px rgba(45,58,42,0.22)',
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  rank: {
    flex: 'none', width: 26, height: 26, lineHeight: '26px', textAlign: 'center',
    borderRadius: 8, background: 'var(--c-text, #2c2c2c)', color: '#fff', fontSize: 13, fontWeight: 700,
  },
  school: { fontSize: 16, fontWeight: 700, color: 'var(--c-text, #2c2c2c)', lineHeight: 1.3 },
  dept: { fontSize: 12.5, color: 'var(--c-text-mute, #8a8a82)', marginTop: 2 },
  bandBox: {
    flex: 'none', minWidth: 64, textAlign: 'center', color: '#fff',
    borderRadius: 10, padding: '6px 10px',
  },
  bandLabel: { fontSize: 14, fontWeight: 800, lineHeight: 1.1 },
  bandSub: { fontSize: 9.5, opacity: 0.92, marginTop: 2, lineHeight: 1.1 },
  barWrap: { marginTop: 12 },
  barTrack: { position: 'relative', height: 10, borderRadius: 999, background: 'rgba(45,58,42,0.08)' },
  barFill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 999 },
  barLine: { position: 'absolute', top: -3, bottom: -3, width: 2, background: 'var(--c-text, #2c2c2c)', borderRadius: 2 },
  barLabels: { display: 'flex', justifyContent: 'space-between', marginTop: 5, fontSize: 11.5 },
  barLineLabel: { color: 'var(--c-text-sub, #6b7869)' },
  block: { marginTop: 10, borderRadius: 10, padding: '9px 11px', background: 'rgba(45,58,42,0.04)' },
  blockHead: { fontSize: 11, fontWeight: 700, color: 'var(--c-primary-deep, #3a7d5c)', marginBottom: 3 },
  blockBody: { fontSize: 13.5, lineHeight: 1.65, color: 'var(--c-text, #2c2c2c)' },
  foot: { fontSize: 11.5, color: 'var(--c-text-mute, #8a8a82)', lineHeight: 1.7, marginTop: 16 },
  pager: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 14 },
  pagerBtn: {
    flex: 'none', border: '1px solid var(--c-line, #e8e5de)', background: 'var(--c-surface, #fff)',
    color: 'var(--c-text, #2c2c2c)', borderRadius: 10, padding: '8px 12px', fontSize: 12.5, fontWeight: 700,
  },
  pagerBtnDisabled: { opacity: 0.35 },
  pagerPos: { fontSize: 12, color: 'var(--c-text-sub, #6b7869)', fontWeight: 700 },
  groupHead: { marginTop: 14 },
  groupWant: { fontSize: 14.5, fontWeight: 700, color: 'var(--c-text, #2c2c2c)', lineHeight: 1.5 },
  groupSub: { fontSize: 11.5, color: 'var(--c-text-mute, #8a8a82)', marginTop: 3 },
};
