/**
 * Home — C 案（README 採用方針）「今日中心」レイアウト。
 *   safe-top → ロゴ + HOME crumb → 挨拶 → Today カード →
 *   クイック 4 タイル → 記事フィード（横スクロール） → その他
 */
import { fetchArticles, fetchHome } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn } from '../lib/types';
import { Logo } from '../components/Logo';
import { Greeting } from '../components/Greeting';
import { Spinner } from '../components/Spinner';
import {
  ChartIcon,
  ChevRightIcon,
  ChevRow,
  FlaskIcon,
  LeafIcon,
  PencilIcon,
  QrIcon,
  ShareIcon,
} from '../components/Icon';

interface HomeCProps {
  nav: NavFn;
}

export function HomeC({ nav }: HomeCProps) {
  const home = useAsync(fetchHome, []);
  const arts = useAsync(fetchArticles, []);

  if (home.loading || !home.data) {
    return (
      <div className="app">
        <div className="safe-top" />
        <Spinner />
      </div>
    );
  }

  const { user, nextClass } = home.data;
  const feed = (arts.data ?? []).slice(0, 4);

  const quick = [
    {
      l: '化学 授業',
      ic: <FlaskIcon size={20} />,
      go: () => nav('schedules', { subject: 'chemistry' }),
    },
    {
      l: '生物 授業',
      ic: <LeafIcon size={20} />,
      go: () => nav('schedules', { subject: 'biology' }),
    },
    {
      l: '基礎問題',
      ic: <PencilIcon size={20} />,
      go: () => nav('problems', { subject: 'chemistry' }),
    },
    {
      l: '点数報告',
      ic: <ChartIcon size={20} />,
      go: () =>
        nav('ext', {
          url: 'https://example.com/score-report',
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
            <div className="row" onClick={() => nav('share')}>
              <div className="row-icon">
                <ShareIcon size={18} />
              </div>
              <div className="row-body">
                <div className="row-title">シェア</div>
                <div className="row-sub">体験授業のお知らせなど</div>
              </div>
              <div className="row-trail">
                <ChevRow />
              </div>
            </div>
            <div
              className="row"
              onClick={() =>
                nav('ext', { url: 'https://example.com/score-report' })
              }
            >
              <div className="row-icon accent">
                <ChartIcon size={18} />
              </div>
              <div className="row-body">
                <div className="row-title">点数報告フォーム</div>
                <div className="row-sub">外部リンク（Google フォーム）</div>
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
