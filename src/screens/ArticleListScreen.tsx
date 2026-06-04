import { useMemo, useState } from 'react';
import { fetchArticles, fetchShares } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { CloseIcon, SearchIcon } from '../components/Icon';

interface Props {
  kind: 'articles' | 'share';
  nav: NavFn;
}

export function ArticleListScreen({ kind, nav }: Props) {
  const isArticles = kind === 'articles';
  const fetcher = isArticles ? fetchArticles : fetchShares;
  const { data, loading, error, reload } = useAsync(fetcher, [kind]);
  const list = data ?? [];

  const title = isArticles ? '理科関連記事' : 'シェア';
  const eyebrow = isArticles ? 'ARTICLES · 外部リンク' : 'SHARE · お知らせ';

  // 検索状態（記事タブのみ表示）
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return list;
    return list.filter((a) => {
      const inTitle = a.title.toLowerCase().includes(q);
      const inTag =
        (a.tags && a.tags.some((t) => t.toLowerCase().includes(q))) ||
        (a.tag && a.tag.toLowerCase().includes(q));
      return inTitle || inTag;
    });
  }, [list, q]);
  const showSearch = isArticles;

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

        {showSearch && (
          <>
            <div className={`search-box live ${q ? 'filled' : ''}`}>
              <SearchIcon size={16} />
              <input
                className="search-input"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="タイトル・科目で検索"
                autoComplete="off"
                spellCheck={false}
              />
              {q && (
                <button
                  type="button"
                  className="search-clear"
                  aria-label="検索条件をクリア"
                  onClick={() => setQuery('')}
                >
                  <CloseIcon size={12} />
                </button>
              )}
            </div>
            {q && (
              <div className="search-meta">
                「{query.trim()}」の検索結果 · {results.length} 件
              </div>
            )}
          </>
        )}

        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : list.length === 0 ? (
          <EmptyState
            hint={
              isArticles
                ? 'まだ記事はありません。'
                : 'まだお知らせはありません。'
            }
          />
        ) : showSearch && results.length === 0 ? (
          <div className="search-empty">
            <div className="search-empty-ic">
              <SearchIcon size={20} />
            </div>
            <div className="search-empty-t1">該当する記事がありません</div>
            <div className="search-empty-t2">
              キーワードを変えて検索してみてください。
            </div>
          </div>
        ) : (
          <div>
            {results.map((a) => {
              const displayTags =
                a.tags && a.tags.length > 0 ? a.tags : a.tag ? [a.tag] : [];
              return (
                <div
                  key={a.id}
                  className="art-card"
                  onClick={() => nav('ext', { url: a.url })}
                >
                  <div className={`art-thumb v${a.thumb}`}>
                    {a.image && (
                      <img
                        className="art-thumb-img"
                        src={a.image}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          // 画像取得失敗時はストライプ柄プレースホルダに戻す
                          (e.currentTarget as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                  </div>
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
