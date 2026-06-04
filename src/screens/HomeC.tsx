/**
 * Home — C 案（README 採用方針）「今日中心」レイアウト。
 *   safe-top → ロゴ + HOME crumb → 挨拶 → Today カード →
 *   クイック 4 タイル → 記事フィード（横スクロール） → その他
 */
import { useEffect } from 'react';
import { fetchArticles, fetchHome, fetchSchedules } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { prefetch } from '../lib/swrCache';
import { preloadScoresScreen } from '../lib/lazyImports';
import { useScores } from '../lib/scoresStore';
import type { NavFn, ScheduleSubject } from '../lib/types';
import { SUBJECT_JA } from '../lib/types';
import { Logo } from '../components/Logo';
import { Greeting } from '../components/Greeting';
import { Spinner } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import { Sparkline } from '../components/ScoreCharts';
import {
  ChartIcon,
  ChevRightIcon,
  ChevRow,
  EarthIcon,
  FlaskIcon,
  LeafIcon,
  PencilIcon,
  QrIcon,
  TrendIcon,
} from '../components/Icon';

/** 科目キー → タイルに表示するアイコン */
const SUBJECT_ICON: Record<ScheduleSubject, JSX.Element> = {
  'chemistry':       <FlaskIcon size={20} />,
  'chemistry-basic': <FlaskIcon size={20} />,
  'biology':         <LeafIcon size={20} />,
  'biology-basic':   <LeafIcon size={20} />,
  'earth-basic':     <EarthIcon size={20} />,
};

interface HomeCProps {
  nav: NavFn;
}

export function HomeC({ nav }: HomeCProps) {
  const home = useAsync(fetchHome, [], { cacheKey: 'home' });
  const arts = useAsync(fetchArticles, [], { cacheKey: 'articles' });
  // Sparkline 用に直近の合計点を 1 系列だけ取得。Provider 経由で
  // ScoresScreen と共有するため、fetch は 1 回のみ。
  const scores = useScores();

  // ScoresScreen のチャンクを先読みしておく（タップ時に Suspense fallback を出さない）
  useEffect(() => {
    preloadScoresScreen();
  }, []);

  // 履修科目が分かったら、授業予定をバックグラウンドで先読みしてキャッシュに入れる。
  // → ホームから授業タイルをタップした瞬間にスピナー無しで表示できる。
  const subjectsKey = (home.data?.user?.subjects ?? []).join(',');
  useEffect(() => {
    const u = home.data?.user;
    if (!u) return;
    const subs =
      u.subjects && u.subjects.length > 0
        ? u.subjects
        : (['chemistry', 'biology'] as ScheduleSubject[]);
    subs.forEach((s) => prefetch('schedules:' + s, () => fetchSchedules(s)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectsKey]);

  if (home.error && !home.loading) {
    return (
      <div className="app">
        <div className="safe-top" />
        <ErrorState onRetry={home.reload} />
      </div>
    );
  }

  if (home.loading || !home.data) {
    return (
      <div className="app">
        <div className="safe-top" />
        <Spinner />
      </div>
    );
  }

  const { user, nextClass } = home.data;
  // 日付降順で並んでいる前提だが、念のためフロントでも安定ソート
  const feed = [...(arts.data ?? [])]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .slice(0, 4);

  // user.subjects に応じて授業タイルを動的生成。subjects が空なら
  // フォールバックで 化学 + 生物 を出す（未登録ユーザー向け）。
  const subjects =
    user.subjects && user.subjects.length > 0
      ? user.subjects
      : (['chemistry', 'biology'] as ScheduleSubject[]);

  const quick = [
    ...subjects.map((s) => ({
      l: `${SUBJECT_JA[s]} 授業`,
      ic: SUBJECT_ICON[s],
      go: () => nav('schedules', { subject: s }),
    })),
    {
      l: '問題集',
      ic: <PencilIcon size={20} />,
      go: () => nav('studyBooks'),
    },
    {
      l: '点数報告',
      ic: <ChartIcon size={20} />,
      go: () =>
        nav('ext', {
          url: 'https://script.google.com/macros/s/AKfycbwEvKrlRh_kjcVwhiVK9X3FJ2RHQlR4iOzZCu7mFZFq1CVFIvDIJX5Y5MNYNDowTeJUJw/exec',
        }),
    },
  ];

  return (
    <div className="app">
      <div className="safe-top" />
      <div className="nav" style={{ justifyContent: 'space-between' }}>
        <Logo size={26} />
        <div className="nav-crumb" style={{ flex: 'none' }}>
          HOME
        </div>
      </div>
      <div className="app-scroll">
        <Greeting user={user} nextClass={nextClass} />

        {/* Today カード */}
        <div
          className="c-today"
          onClick={() =>
            nav('schedule', { id: nextClass.id, subject: nextClass.subject })
          }
        >
          <div className="c-today-top">
            <div className="c-today-eyebrow">
              <span className="pulse" />
              <span>NEXT · あと {nextClass.daysLeft} 日</span>
            </div>
            <div className="c-today-title">{nextClass.title}</div>
            <div className="c-today-date">
              <span className="big gv-num">{nextClass.date}</span>
              <span
                style={{
                  width: 3,
                  height: 3,
                  borderRadius: 99,
                  background: 'var(--c-text-mute)',
                }}
              />
              <span>
                ({nextClass.dow}) {nextClass.startAt} 〜
              </span>
            </div>
          </div>
          <div className="c-today-body">
            {nextClass.material && (
              <span className="badge material">資料あり</span>
            )}
            <span className="badge outline">{nextClass.series}</span>
            <span style={{ flex: 1 }} />
            <span
              className="gv-en"
              style={{
                fontSize: 12,
                color: 'var(--c-primary-deep)',
                fontWeight: 500,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              開く <ChevRightIcon size={12} />
            </span>
          </div>
        </div>

        {/* 出席用 QR — 次回授業カード直後・クイックアクセスの上 */}
        <button
          className="qr-cta"
          type="button"
          onClick={() => nav('qr')}
        >
          <div className="qr-cta-ic">
            <QrIcon size={22} />
          </div>
          <div className="qr-cta-tx">
            <div className="t1">出席用QRコード</div>
            <div className="t2">受付でこの画面を提示</div>
          </div>
          <div className="qr-cta-ar">
            <ChevRightIcon size={14} />
          </div>
        </button>

        {/* クイックアクセス */}
        <div className="c-feed-head">
          <div className="ttl">クイックアクセス</div>
        </div>
        <div className="c-quick">
          {quick.map((q, i) => (
            <div
              key={i}
              className="c-quick-tile"
              onClick={q.go}
              role="button"
              tabIndex={0}
            >
              <div className="ico">{q.ic}</div>
              <div className="lbl">{q.l}</div>
            </div>
          ))}
        </div>

        {/* 成績推移 — 入口。直近の合計点スパークラインつき。
            データ取得失敗時は Sparkline 部分を非表示でフォールバック。*/}
        <button
          type="button"
          className="gt-home-cta"
          onClick={() => nav('scores')}
        >
          <div className="gt-home-ic">
            <TrendIcon size={22} />
          </div>
          <div className="gt-home-tx">
            <div className="t1">成績推移を見る</div>
            <div className="t2">テストごとの推移と分野別の得意・苦手</div>
          </div>
          <div className="gt-home-spark">
            {(() => {
              const d = scores.data;
              if (!d || !d.subjects.length) return null;
              const first = d.data[d.subjects[0]];
              const vals = first?.totalTrend.map((t) => t.total) ?? [];
              return vals.length >= 2 ? <Sparkline values={vals} /> : null;
            })()}
          </div>
        </button>

        {/* 記事フィード（横スクロール） */}
        <div className="c-feed-head">
          <div className="ttl">理科の世界</div>
          <div className="all" onClick={() => nav('articles')}>
            すべて見る ›
          </div>
        </div>
        <div className="c-feed">
          {feed.map((a) => (
            <div
              key={a.id}
              className="c-feed-card"
              onClick={() => nav('ext', { url: a.url })}
            >
              <div className={`c-feed-thumb var${(a.thumb % 3) + 1}`}>
                {a.image && (
                  <img
                    className="c-feed-thumb-img"
                    src={a.image}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <span className="kind">{a.tag}</span>
              </div>
              <div className="c-feed-body">
                <div className="c-feed-title">{a.title}</div>
                <div className="c-feed-date">{a.date}</div>
              </div>
            </div>
          ))}
        </div>

        {/* その他 */}
        <div className="group">
          <div className="group-label">
            <span className="label-text">その他</span>
          </div>
          <div className="glass">
            <div
              className="row"
              onClick={() =>
                nav('ext', {
                  url: 'https://script.google.com/macros/s/AKfycbwEvKrlRh_kjcVwhiVK9X3FJ2RHQlR4iOzZCu7mFZFq1CVFIvDIJX5Y5MNYNDowTeJUJw/exec',
                })
              }
            >
              <div className="row-icon accent">
                <ChartIcon size={18} />
              </div>
              <div className="row-body">
                <div className="row-title">点数報告フォーム</div>
              </div>
              <div className="row-trail">
                <ChevRow />
              </div>
            </div>
          </div>
        </div>

        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
