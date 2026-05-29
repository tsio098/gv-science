import { fetchArticles, fetchShares } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';

interface Props {
  kind: 'articles' | 'share';
  nav: NavFn;
}

export function ArticleListScreen({ kind, nav }: Props) {
  const isArticles = kind === 'articles';
  const fetcher = isArticles ? fetchArticles : fetchShares;
  const { data, loading } = useAsync(fetcher, [kind]);
  const list = data ?? [];

  const title = isArticles ? '理科関連記事' : 'シェア';
  const eyebrow = isArticles ? 'ARTICLES · 外部リンク' : 'SHARE · お知らせ';

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav
        crumb={`GV / ${title}`}
        onBack={() => nav('back')}
        backLabel="ホーム"
      />
      <div className="app-scroll">
        <div className="page-head">
          <div className="page-eyebrow">{eyebrow}</div>
          <h1 className="page-title">{title}</h1>
          <p className="page-sub">
            {isArticles
              ? '読みものを通じて、授業の外でも理科に触れよう。'
              : '体験授業や公式情報、SNSアカウントの一覧です。'}
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState
            hint={
              isArticles
                ? 'まだ記事はありません。'
                : 'まだお知らせはありません。'
            }
          />
        ) : (
          <div>
            {list.map((a) => {
              const displayTags =
                a.tags && a.tags.length > 0 ? a.tags : a.tag ? [a.tag] : [];
              return (
                <div
                  key={a.id}
                  className="art-card"
                  onClick={() => nav('ext', { url: a.url })}
                >
                  {a.image ? (
                    <div
                      className={`art-thumb v${a.thumb}`}
                      style={{
                        backgroundImage: `url(${a.image})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                      }}
                    />
                  ) : (
                    <div className={`art-thumb v${a.thumb}`} />
                  )}
                  <div className="art-body">
                    <div className="art-tag">
                      {displayTags.map((t, i) => (
                        <span key={t} style={{ marginRight: i < displayTags.length - 1 ? 6 : 0 }}>
                          {t}
                          {i < displayTags.length - 1 && (
                            <span style={{ marginLeft: 6, opacity: 0.5 }}>·</span>
                          )}
                        </span>
                      ))}
                    </div>
                    <div className="art-title">{a.title}</div>
                    {a.summary && <div className="art-sum">{a.summary}</div>}
                    {a.date && <div className="art-date gv-num">{a.date}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
