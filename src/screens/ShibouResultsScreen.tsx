/**
 * おすすめ志望校 — 表示画面。
 *  GAS `recoResults`（id_token認証・USERIDで自分の結果を取得）の行をカード表示。
 *  判定は絵文字を使わず、カード左の色帯＋ラベルボックスで表現。得点は「あなた vs 合格ライン」のバー図。
 */
import { fetchRecoResults } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';

interface Props {
  nav: NavFn;
}

type BandMeta = { label: string; sub: string; accent: string; soft: string; ink: string };

/** 判定文字列（🟦安全/🟩適正/🟥挑戦/⬛再考/－成績未登録）→ 色とラベル（絵文字は使わない・語彙は大人向け）。 */
function bandMeta(raw: string): BandMeta {
  const b = raw || '';
  if (b.includes('安全')) return { label: '安全', sub: '合格圏', accent: '#4e9b73', soft: 'rgba(78,155,115,0.14)', ink: '#2f7d52' };
  if (b.includes('適正')) return { label: '適正', sub: '実力相応', accent: '#7aa84a', soft: 'rgba(120,170,90,0.16)', ink: '#5a7d2a' };
  if (b.includes('挑戦')) return { label: '挑戦', sub: 'やや上', accent: '#e0883c', soft: 'rgba(224,136,60,0.16)', ink: '#b5642a' };
  if (b.includes('再考')) return { label: '要再考', sub: '現状は厳しい', accent: '#c95b5b', soft: 'rgba(201,91,91,0.14)', ink: '#a13b3b' };
  if (b.includes('推薦')) return { label: '推薦', sub: '別ルート', accent: '#5b7fa1', soft: 'rgba(91,127,161,0.14)', ink: '#3f6088' };
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

export function ShibouResultsScreen({ nav }: Props) {
  const { data, loading, error, reload } = useAsync(fetchRecoResults, [], { cacheKey: 'recoResults' });
  const results = data ?? [];

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / おすすめ志望校" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll">
        <div style={S.pad}>
          <div className="page-head" style={S.headFlush}>
            <div className="page-eyebrow">RECOMMEND</div>
            <h1 className="page-title">おすすめ志望校</h1>
            <p className="page-sub">あなたの希望（やりたいこと）と成績をもとに、研究内容を最優先に選定した候補です。</p>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : results.length === 0 ? (
            <EmptyState hint="まだおすすめはありません。ホームの「志望校調査を依頼」から送信すると、調査結果がここに表示されます（反映まで少し時間がかかります）。" />
          ) : (
            <div>
              {results.map((r, i) => {
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
};
