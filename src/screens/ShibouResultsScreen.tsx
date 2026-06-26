/**
 * おすすめ志望校 — 表示画面。
 *  GAS `recoResults`（id_token認証・USERIDで自分の結果を取得）の行を、GV Compass風カードで表示。
 *  ※Proxyの "shibou" 接頭辞振り分けを避けるため action 名は recoResults。
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

/** 判定文字列から色を決める（🟦安全/🟩適正/🟥挑戦/⬛再考/－成績未登録） */
function bandStyle(band: string): React.CSSProperties {
  const b = band || '';
  let bg = 'var(--c-line, #d9d9d2)', fg = 'var(--c-text, #2c2c2c)';
  if (b.includes('安全')) { bg = 'rgba(78,155,115,0.16)'; fg = '#2f7d52'; }
  else if (b.includes('適正')) { bg = 'rgba(120,170,90,0.16)'; fg = '#5a7d2a'; }
  else if (b.includes('挑戦')) { bg = 'rgba(220,120,60,0.16)'; fg = '#b5642a'; }
  else if (b.includes('再考')) { bg = 'rgba(90,90,90,0.16)'; fg = '#555'; }
  return { ...S.band, background: bg, color: fg };
}

export function ShibouResultsScreen({ nav }: Props) {
  const { data, loading, error, reload } = useAsync(fetchRecoResults, [], {
    cacheKey: 'recoResults',
  });
  const results = data ?? [];

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / おすすめ志望校" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll">
        <div style={S.pad}>
          <div className="page-head" style={S.headFlush}>
            <div className="page-eyebrow">RECOMMEND · おすすめ志望校</div>
            <h1 className="page-title">おすすめ志望校</h1>
            <p className="page-sub">あなたの依頼内容と成績から、研究内容を最優先に調べた候補です。</p>
          </div>

          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState onRetry={reload} />
          ) : results.length === 0 ? (
            <EmptyState hint="まだおすすめはありません。ホームの「志望校調査を依頼」から依頼すると、先生がAIと一緒に調べてここに表示します（少し時間がかかります）。" />
          ) : (
            <div>
              {results.map((r, i) => {
                const rate = r['傾斜後得点率'];
                const border = r['ボーダー'];
                return (
                  <div key={i} style={S.card}>
                    <div style={S.cardTop}>
                      <div style={S.rank}>{r['順位'] ?? i + 1}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={S.school}>{r['大学']}</div>
                        <div style={S.dept}>{r['学部学科/日程']}</div>
                      </div>
                      {r['判定'] && <span style={bandStyle(String(r['判定']))}>{r['判定']}</span>}
                    </div>

                    {(rate !== '' && rate != null) && (
                      <div style={S.metaRow}>
                        <span style={S.metaPill}>傾斜後 {rate}%</span>
                        {(border !== '' && border != null) && (
                          <span style={S.metaPillSub}>ボーダー {border}%</span>
                        )}
                      </div>
                    )}

                    {r['研究適合'] && (
                      <div style={S.why}>
                        <span style={S.whyLabel}>研究適合</span>
                        {r['研究適合']}
                      </div>
                    )}
                    {r['注意'] && <div style={S.caution}>⚠️ {r['注意']}</div>}
                  </div>
                );
              })}
              <p style={S.foot}>
                ※研究内容を最優先に選んでいます。判定（傾斜後得点率）は目安です。最終的な出願は先生と相談してください。
              </p>
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
    marginTop: 12,
    boxShadow: '0 6px 18px -12px rgba(45,58,42,0.18)',
  },
  cardTop: { display: 'flex', alignItems: 'flex-start', gap: 10 },
  rank: {
    flex: 'none', width: 26, height: 26, lineHeight: '26px', textAlign: 'center',
    borderRadius: 999, background: 'var(--c-primary, #4e9b73)', color: '#fff',
    fontSize: 13, fontWeight: 700,
  },
  school: { fontSize: 16, fontWeight: 700, color: 'var(--c-text, #2c2c2c)', lineHeight: 1.3 },
  dept: { fontSize: 12.5, color: 'var(--c-text-mute, #8a8a82)', marginTop: 2 },
  band: { flex: 'none', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' },
  metaRow: { display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' },
  metaPill: { padding: '3px 10px', borderRadius: 999, background: 'var(--c-bg-warm, #f4efe6)', color: 'var(--c-text, #2c2c2c)', fontSize: 12.5, fontWeight: 600 },
  metaPillSub: { padding: '3px 10px', borderRadius: 999, background: 'rgba(45,58,42,0.05)', color: 'var(--c-text-mute, #8a8a82)', fontSize: 12.5 },
  why: { marginTop: 10, fontSize: 13.5, lineHeight: 1.65, color: 'var(--c-text, #2c2c2c)' },
  whyLabel: { display: 'inline-block', marginRight: 6, padding: '1px 7px', borderRadius: 6, background: 'rgba(78,155,115,0.14)', color: 'var(--c-primary-deep, #3a7d5c)', fontSize: 11, fontWeight: 700 },
  caution: { marginTop: 8, fontSize: 12.5, lineHeight: 1.6, color: 'var(--c-text-sub, #6b7869)', background: 'rgba(45,58,42,0.04)', borderRadius: 10, padding: '8px 10px' },
  foot: { fontSize: 11.5, color: 'var(--c-text-mute, #8a8a82)', lineHeight: 1.6, marginTop: 16 },
};
