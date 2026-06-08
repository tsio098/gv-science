/**
 * 成績推移画面（gradetrend）。
 *
 *   骨格: nav → page-head → 科目タブ(sticky) → 生徒名 + 科目ラベル
 *        → 合計点の推移カード → 分野別の推移カード
 *
 * 設計判断 (デザインブリーフ §4.2 / handoff README より):
 *   - 科目切替UI: 履修科目 3 以上 → 横スクロールチップ（案A）
 *                履修科目 2 以下 → セグメント・コントロール（案B）
 *   - 分野ビュー: 折れ線 / 得点傾向 の 2 ビュー（ヒートマップは廃止）
 *   - 偏差値:    合計点グラフに第2軸（右軸）で重ねる
 *   - データ取得: 履修科目分を 1 リクエストで取得（タブ切替で再フェッチ無し）
 */
import { useEffect, useState } from 'react';
import { useScores } from '../lib/scoresStore';
import { monthShort } from '../data/scoresMock';
import { fmt1, fmtSigned1 } from '../lib/format';
import { SCORES_SUBJECT_LABEL } from '../lib/types';
import type {
  NavFn,
  ScoresResponse,
  ScoresSubject,
} from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { AlertIcon, ChartIcon, RefreshIcon } from '../components/Icon';
import {
  FIELD_COLORS,
  FieldLineChart,
  TotalTrendChart,
  type FieldSeries,
} from '../components/ScoreCharts';

type Metric = 'rate' | 'avgRate' | 'hensachi';
type FieldView = 'lines' | 'strengths';
type RangeKey = 'all' | 12 | 30;

const METRICS: Array<{ key: Metric; label: string; unit: string }> = [
  { key: 'rate', label: '得点率', unit: '%' },
  { key: 'avgRate', label: '平均得点率', unit: '%' },
  { key: 'hensachi', label: '偏差値', unit: '' },
];

/** 分野インデックスを安定色に対応させる */
function colorForField(fields: string[], field: string): string {
  const idx = fields.indexOf(field);
  if (idx < 0) return FIELD_COLORS[0];
  return FIELD_COLORS[((idx % FIELD_COLORS.length) + FIELD_COLORS.length) % FIELD_COLORS.length];
}

/** 直近月の上位3 + 下位3 = 強弱6 を返す（欠測は除外） */
function defaultFields(
  fields: string[],
  rate: Record<string, Array<number | null>>,
  months: string[]
): string[] {
  const lastIdx = months.length - 1;
  const withVal = fields
    .map((f) => ({ f, v: rate[f]?.[lastIdx] }))
    .filter((x): x is { f: string; v: number } =>
      typeof x.v === 'number' && Number.isFinite(x.v)
    );
  withVal.sort((a, b) => b.v - a.v);
  const top = withVal.slice(0, 3).map((x) => x.f);
  const bot = withVal.slice(-3).map((x) => x.f);
  const seen = new Set<string>();
  const out: string[] = [];
  [...top, ...bot].forEach((f) => {
    if (!seen.has(f)) {
      seen.add(f);
      out.push(f);
    }
  });
  return out;
}

interface ScoresScreenProps {
  nav: NavFn;
}

export function ScoresScreen({ nav }: ScoresScreenProps) {
  const scores = useScores();

  // 初回ロード = キャッシュ無し & まだ fetch 中。データがあれば SWR で即描画。
  if (scores.loading && !scores.data) {
    return (
      <ScoresFrame nav={nav}>
        <div className="gt-state">
          <div className="gt-card gt-skel">
            <div className="gt-skel-bar" style={{ width: '40%', height: 14 }} />
            <div className="gt-skel-plot" />
          </div>
          <div className="gt-card gt-skel">
            <div className="gt-skel-bar" style={{ width: '52%', height: 14 }} />
            <div className="gt-skel-plot" />
          </div>
          <Spinner />
        </div>
      </ScoresFrame>
    );
  }

  if (scores.error || !scores.data) {
    return (
      <ScoresFrame nav={nav}>
        <div className="gt-empty">
          <div
            className="gt-empty-ic"
            style={{ background: 'var(--c-accent-soft)', color: '#B14A0C' }}
          >
            <AlertIcon size={24} />
          </div>
          <div className="gt-empty-t1">データを取得できませんでした</div>
          <div className="gt-empty-t2">
            通信環境を確認して、もう一度お試しください。
          </div>
          <button
            type="button"
            className="btn btn-quiet btn-full"
            style={{ marginTop: 18 }}
            onClick={() => scores.refresh()}
            disabled={scores.refreshing}
          >
            <RefreshIcon size={16} />
            <span style={{ marginLeft: 6 }}>
              {scores.refreshing ? '読み込み中…' : 'もう一度試す'}
            </span>
          </button>
        </div>
      </ScoresFrame>
    );
  }

  if (!scores.data.subjects.length) {
    return (
      <ScoresFrame nav={nav}>
        <div className="gt-empty">
          <div className="gt-empty-ic">
            <ChartIcon size={26} />
          </div>
          <div className="gt-empty-t1">まだ点数報告がありません</div>
          <div className="gt-empty-t2">
            点数報告フォームから成績を入力すると、ここに推移が表示されます。
          </div>
          <button
            type="button"
            className="btn btn-primary btn-full"
            style={{ marginTop: 18 }}
            onClick={() =>
              nav('ext', {
                url: 'https://script.google.com/macros/s/AKfycbwEvKrlRh_kjcVwhiVK9X3FJ2RHQlR4iOzZCu7mFZFq1CVFIvDIJX5Y5MNYNDowTeJUJw/exec',
              })
            }
          >
            点数報告フォームを開く
          </button>
        </div>
      </ScoresFrame>
    );
  }

  return <ScoresContent nav={nav} scores={scores.data} />;
}

/* ────────────────────────────────────────────────────────
   共通フレーム
   ──────────────────────────────────────────────────────── */
function ScoresFrame({
  nav,
  children,
}: {
  nav: NavFn;
  children: React.ReactNode;
}) {
  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / 成績推移" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll">
        <div className="page-head">
          <div className="page-eyebrow">REPORT · 成績推移</div>
          <h1 className="page-title">
            成績<span className="accent">推移</span>
          </h1>
        </div>
        {children}
        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
   メイン本体（データあり）
   ──────────────────────────────────────────────────────── */
function ScoresContent({
  nav,
  scores,
}: {
  nav: NavFn;
  scores: ScoresResponse;
}) {
  const { refresh, refreshing } = useScores();
  const subjects = scores.subjects;
  const [subject, setSubject] = useState<ScoresSubject>(subjects[0]);
  const [metric, setMetric] = useState<Metric>('rate');
  const [fv, setFv] = useState<FieldView>('lines');
  const [range, setRange] = useState<RangeKey>('all');

  // 履修科目 2 以下 → セグメント、3 以上 → 横スクロールチップ
  const useSegmented = subjects.length <= 2;

  const subjectData = scores.data[subject];

  // 初期状態は「分野が一つも選択されていない」。
  // 「強弱6」プリセットボタンで上位3+下位3 を後付け選択できる。
  const [sel, setSel] = useState<Set<string>>(new Set());

  // 科目切替時は選択をクリア
  useEffect(() => {
    if (!subjectData) return;
    setSel(new Set());
    setRange('all');
  }, [subject, subjectData]);

  // 折れ線→得点傾向 に切替時、平均得点率が選ばれていれば得点率にフォールバック
  useEffect(() => {
    if (fv === 'strengths' && metric === 'avgRate') {
      setMetric('rate');
    }
  }, [fv, metric]);

  if (!subjectData) {
    return (
      <ScoresFrame nav={nav}>
        <div className="gt-empty">
          <div className="gt-empty-ic">
            <ChartIcon size={26} />
          </div>
          <div className="gt-empty-t1">この科目のデータがありません</div>
        </div>
      </ScoresFrame>
    );
  }

  const tt = subjectData.totalTrend;
  const view = range === 'all' ? tt : tt.slice(-range);
  const latest = tt[tt.length - 1];
  const prev = tt.length >= 2 ? tt[tt.length - 2] : null;
  const delta = prev ? latest.total - prev.total : 0;

  const toggleField = (f: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(f)) n.delete(f);
      else n.add(f);
      return n;
    });

  const orderedSelected = subjectData.fields.filter((f) => sel.has(f));
  // 分野別チャートは 3 指標（得点率・平均得点率・偏差値）を 1 本にまとめて重ねる。
  // 分野ごとに同色、指標は線種（実線 / 破線 / 細線=右軸）で描き分ける。
  const series: FieldSeries[] = orderedSelected.map((f) => ({
    name: f,
    color: colorForField(subjectData.fields, f),
    rate: subjectData.rate[f] ?? [],
    avgRate: subjectData.avgRate[f] ?? [],
    hensachi: subjectData.hensachi[f] ?? [],
  }));
  const curMetric = METRICS.find((m) => m.key === metric)!;

  // 得点傾向（直近月 + 現在の metric）
  // 化学・生物 → 上位/下位 5 件ずつ、基礎 3 科目 → 3 件ずつ。
  // 分野総数が少ない基礎科目で 5 件取ると上位と下位が完全に被ってしまうため。
  const lastIdx = subjectData.months.length - 1;
  const rankAll = subjectData.fields
    .map((f) => ({
      f,
      v: subjectData[metric][f]?.[lastIdx],
      prev: subjectData[metric][f]?.[lastIdx - 1] ?? null,
    }))
    .filter(
      (x): x is { f: string; v: number; prev: number | null } =>
        typeof x.v === 'number' && Number.isFinite(x.v)
    )
    .sort((a, b) => b.v - a.v);
  const isBasicSubject =
    subject === 'chemistry-basic' ||
    subject === 'biology-basic' ||
    subject === 'earth-basic';
  const swCount = isBasicSubject ? 3 : 5;
  const strong = rankAll.slice(0, swCount);
  const weak = rankAll.slice(-swCount).reverse();

  const subjLabel = SCORES_SUBJECT_LABEL[subject];

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / 成績推移" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll">
        <div className="page-head" style={{ paddingBottom: 10 }}>
          <div className="page-eyebrow">REPORT · 成績推移</div>
          <h1 className="page-title">
            成績<span className="accent">推移</span>
          </h1>
        </div>

        {/* ── 科目切替（sticky） ─────────────────────────── */}
        <div className="gt-tabs-wrap">
          {useSegmented ? (
            <div className="gt-seg" role="tablist">
              {subjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={s === subject}
                  className={`gt-seg-btn ${s === subject ? 'on' : ''}`}
                  onClick={() => setSubject(s)}
                >
                  {SCORES_SUBJECT_LABEL[s].ja}
                </button>
              ))}
            </div>
          ) : (
            <div className="gt-chips" role="tablist">
              {subjects.map((s) => (
                <button
                  key={s}
                  type="button"
                  role="tab"
                  aria-selected={s === subject}
                  className={`gt-chip-sub ${s === subject ? 'on' : ''}`}
                  onClick={() => setSubject(s)}
                >
                  {s === subject && <span className="gt-chip-dot" />}
                  {SCORES_SUBJECT_LABEL[s].ja}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 科目切替で内容クロスフェード */}
        <div key={subject} className="gt-fade">
          {/* 生徒名 + 科目 */}
          <div className="gt-who">
            <span className="gt-who-name">{scores.name}さん</span>
            <span className="gt-who-sep">の</span>
            <span className="gt-who-subj">{subjLabel.ja}</span>
            <span className="gt-who-en gv-en">{subjLabel.en}</span>
          </div>

          {/* ── 合計点の推移カード ──────────────────────── */}
          <div className="group">
            <div className="gt-card">
              <div className="gt-card-head">
                <div className="gt-card-title">合計点の推移</div>
                <div
                  className="gt-card-aux gv-en"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}
                >
                  <button
                    type="button"
                    className="gt-refresh-btn"
                    onClick={() => refresh()}
                    disabled={refreshing}
                    aria-label="最新データに更新"
                    title="最新データに更新"
                  >
                    <RefreshIcon size={14} />
                  </button>
                  <span>{tt.length} TESTS</span>
                </div>
              </div>

              {/* サマリー */}
              {latest && (
                <div className="gt-summary">
                  <div className="gt-sum-main">
                    <div className="gt-sum-k">直近</div>
                    <div className="gt-sum-v">
                      <span className="gv-num">{fmt1(latest.total)}</span>
                      <span className="gt-sum-u">点</span>
                    </div>
                    {prev && (
                      <div
                        className={`gt-sum-delta ${delta >= 0 ? 'up' : 'down'}`}
                      >
                        {delta >= 0 ? '▲' : '▼'}{' '}
                        <span className="gv-num">{fmt1(Math.abs(delta))}</span>
                      </div>
                    )}
                  </div>
                  <div className="gt-sum-sub">
                    <div className="gt-sum-cell">
                      <span className="k">平均</span>
                      <span className="v gv-num">{fmt1(latest.avg)}</span>
                    </div>
                    <div className="gt-sum-cell acc">
                      <span className="k">偏差値</span>
                      <span className="v gv-num">{fmt1(latest.hensachi)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* 期間チップ（テスト件数が多いときだけ） */}
              {tt.length > 14 && (
                <div className="gt-range">
                  {(
                    [
                      ['直近12', 12],
                      ['直近30', 30],
                      ['全期間', 'all'],
                    ] as Array<[string, RangeKey]>
                  ).map(([lb, v]) => (
                    <button
                      key={lb}
                      type="button"
                      className={`gt-range-btn ${range === v ? 'on' : ''}`}
                      onClick={() => setRange(v)}
                    >
                      {lb}
                    </button>
                  ))}
                  <span className="gt-range-count gv-num">
                    {view.length} / {tt.length} 件
                  </span>
                </div>
              )}

              {view.length >= 2 ? (
                <>
                  <TotalTrendChart points={view} />
                  <div className="gt-legend">
                    <span className="gt-leg">
                      <span className="gt-leg-line main" />
                      合計点
                    </span>
                    <span className="gt-leg">
                      <span className="gt-leg-line dash" />
                      平均点
                    </span>
                    <span className="gt-leg">
                      <span className="gt-leg-line acc" />
                      偏差値{' '}
                      <span className="gv-en" style={{ opacity: 0.6 }}>
                        (右軸)
                      </span>
                    </span>
                  </div>
                </>
              ) : (
                <div className="gt-note">
                  データが {view.length} 件のため、推移グラフは 2 件以上で表示されます。
                </div>
              )}

              {/* テストごとの記録（カード内固定高さスクロール） */}
              <div className="gt-tests">
                <div className="gt-tests-h">
                  <span>テストごとの記録</span>
                  <span className="gt-tests-count gv-num">
                    全 {tt.length} 件
                  </span>
                </div>
                <div className="gt-scroll">
                  {[...tt].reverse().map((p, i) => (
                    <div key={`${p.date}-${i}`} className="gt-test-row">
                      <span className="gt-test-date gv-num">
                        {p.date.slice(5)}
                      </span>
                      <span className="gt-test-name">{p.test}</span>
                      <span className="gt-test-score gv-num">
                        {fmt1(p.total)}
                        <small>点</small>
                      </span>
                      <span className="gt-test-hen gv-num">
                        偏 {fmt1(p.hensachi)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* ── 分野別の推移カード ──────────────────────── */}
          <div className="group">
            <div className="gt-card">
              <div className="gt-card-head">
                <div className="gt-card-title">
                  分野別の推移
                  <span className="gt-card-title-sub">月次平均</span>
                </div>
                <div className="gt-card-aux gv-en">
                  {subjectData.fields.length} 分野
                </div>
              </div>

              {/* 分野ビュー切替（折れ線 / 得点傾向） */}
              <div className="gt-vchips">
                {(
                  [
                    ['lines', '折れ線'],
                    ['strengths', '得点傾向'],
                  ] as Array<[FieldView, string]>
                ).map(([v, lb]) => (
                  <button
                    key={v}
                    type="button"
                    className={`gt-chip-sub ${fv === v ? 'on' : ''}`}
                    onClick={() => setFv(v)}
                  >
                    {fv === v && <span className="gt-chip-dot" />}
                    {lb}
                  </button>
                ))}
              </div>

              {/* metric サブタブは「得点傾向」ビュー専用。
                  「折れ線」ビューは 3 指標（得点率・平均得点率・偏差値）を
                  1 つのグラフにまとめて表示するため、指標切替は不要。
                  得点傾向では「平均得点率」(クラス平均) を除外する
                  — 個人の得点傾向ではなくクラス全体の難易度になるため。 */}
              {fv === 'strengths' && (
                <div className="gt-seg gt-seg-sm">
                  {METRICS.filter((m) => m.key !== 'avgRate').map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      className={`gt-seg-btn ${m.key === metric ? 'on' : ''}`}
                      onClick={() => setMetric(m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              )}

              {fv === 'lines' && (
                <>
                  <div className="gt-presets">
                    <button
                      type="button"
                      className="gt-preset"
                      onClick={() =>
                        setSel(
                          new Set(
                            defaultFields(
                              subjectData.fields,
                              subjectData.rate,
                              subjectData.months
                            )
                          )
                        )
                      }
                    >
                      強弱6
                    </button>
                    <button
                      type="button"
                      className="gt-preset"
                      onClick={() => setSel(new Set(subjectData.fields))}
                    >
                      全て
                    </button>
                    <button
                      type="button"
                      className="gt-preset"
                      onClick={() => setSel(new Set())}
                    >
                      クリア
                    </button>
                    <span className="gt-presets-count gv-num">
                      {sel.size}/{subjectData.fields.length}
                    </span>
                  </div>
                  <FieldLineChart
                    months={subjectData.months}
                    series={series}
                  />
                  <div className="gt-legend">
                    <span className="gt-leg">
                      <span className="gt-leg-line solid-n" />
                      得点率
                    </span>
                    <span className="gt-leg">
                      <span className="gt-leg-line dash-n" />
                      平均得点率
                    </span>
                    <span className="gt-leg">
                      <span className="gt-leg-line thin-n" />
                      偏差値{' '}
                      <span className="gv-en" style={{ opacity: 0.6 }}>
                        (右軸)
                      </span>
                    </span>
                    <span className="gt-leg gt-leg-note">線の色＝分野</span>
                  </div>
                  <div className="gt-fieldchips">
                    {subjectData.fields.map((f) => {
                      const on = sel.has(f);
                      const c = colorForField(subjectData.fields, f);
                      return (
                        <button
                          key={f}
                          type="button"
                          className={`gt-fchip ${on ? 'on' : ''}`}
                          onClick={() => toggleField(f)}
                          style={
                            on
                              ? {
                                  borderColor: c,
                                  color: c,
                                  background: c + '14',
                                }
                              : undefined
                          }
                        >
                          <span
                            className="gt-fchip-dot"
                            style={{
                              background: on ? c : 'var(--c-text-mute)',
                            }}
                          />
                          {f}
                        </button>
                      );
                    })}
                  </div>

                  {/* 選択した分野の月毎（カード内スクロール） */}
                  <div className="gt-fd">
                    <div className="gt-tests-h">
                      <span>分野ごとの月次</span>
                      <span className="gt-tests-count gv-num">
                        得点率 · 偏差値 / {orderedSelected.length} 分野
                      </span>
                    </div>
                    {orderedSelected.length ? (
                      <div className="gt-scroll">
                        {orderedSelected.map((f) => {
                          const c = colorForField(subjectData.fields, f);
                          return (
                            <div key={f} className="gt-fd-group">
                              <div className="gt-fd-name">
                                <span
                                  className="gt-fchip-dot"
                                  style={{ background: c }}
                                />
                                {f}
                              </div>
                              {subjectData.months.map((m, i) => {
                                const r = subjectData.rate[f]?.[i];
                                const h = subjectData.hensachi[f]?.[i];
                                return (
                                  <div key={i} className="gt-fd-row">
                                    <span className="gt-fd-month gv-num">
                                      {monthShort(m)}
                                    </span>
                                    <span className="gt-fd-rate gv-num">
                                      {fmt1(r)}
                                      <small>%</small>
                                    </span>
                                    <span className="gt-fd-hen gv-num">
                                      偏 {fmt1(h)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="gt-note gt-note-soft">
                        分野を選択すると、月毎の得点率・偏差値が一覧表示されます。
                      </div>
                    )}
                  </div>

                  <div className="gt-note gt-note-soft">
                    チップをタップで分野の線を表示／非表示。「強弱6」で直近月の上位3・下位3を一括選択。
                  </div>
                </>
              )}

              {fv === 'strengths' && (
                <div className="gt-sw">
                  <div className="gt-sw-col">
                    <div className="gt-sw-h">
                      <span className="gt-sw-badge strong">得意</span>
                      直近月の上位
                    </div>
                    {strong.map(({ f, v, prev }) => {
                      const dv =
                        prev != null
                          ? Math.round((v - prev) * 10) / 10
                          : null;
                      return (
                        <div key={f} className="gt-sw-row">
                          <span
                            className="gt-sw-bar"
                            style={{
                              background: 'var(--c-primary)',
                              width: `${Math.max(8, v)}%`,
                            }}
                          />
                          <span className="gt-sw-name">{f}</span>
                          <span className="gt-sw-v gv-num">
                            {fmt1(v)}
                            {curMetric.unit}
                          </span>
                          <span
                            className={`gt-sw-d ${(dv ?? 0) >= 0 ? 'up' : 'down'} gv-num`}
                          >
                            {fmtSigned1(dv)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="gt-sw-col">
                    <div className="gt-sw-h">
                      <span className="gt-sw-badge weak">苦手</span>
                      直近月の下位
                    </div>
                    {weak.map(({ f, v, prev }) => {
                      const dv =
                        prev != null
                          ? Math.round((v - prev) * 10) / 10
                          : null;
                      return (
                        <div key={f} className="gt-sw-row">
                          <span
                            className="gt-sw-bar"
                            style={{
                              background: 'var(--c-accent)',
                              width: `${Math.max(8, v)}%`,
                            }}
                          />
                          <span className="gt-sw-name">{f}</span>
                          <span className="gt-sw-v gv-num">
                            {fmt1(v)}
                            {curMetric.unit}
                          </span>
                          <span
                            className={`gt-sw-d ${(dv ?? 0) >= 0 ? 'up' : 'down'} gv-num`}
                          >
                            {fmtSigned1(dv)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
