/**
 * 基礎問題タイルから開く「考察問題集」一覧。
 * - GAS の studyBooks エンドポイントが、生徒の理科使用科目に応じて
 *   フィルタ済みの行を返す。
 * - subject 列の各タグ（化学基礎/化学 等）を複数表示。
 * - D 列の image をサムネ表示、無ければ既存のパターン背景。
 */
import { useMemo, useState } from 'react';
import { fetchStudyBooks } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { CloseIcon, SearchIcon } from '../components/Icon';

interface Props {
  nav: NavFn;
}

export function StudyBookListScreen({ nav }: Props) {
  const { data, loading } = useAsync(fetchStudyBooks, []);
  const list = data ?? [];

  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return list;
    return list.filter((b) => {
      const inTitle = b.title.toLowerCase().includes(q);
      const inTag =
        b.subjectsJa &&
        b.subjectsJa.some((t) => t.toLowerCase().includes(q));
      return inTitle || inTag;
    });
  }, [list, q]);

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav
        crumb="GV / 基礎問題"
        onBack={() => nav('back')}
        backLabel="ホーム"
      />
      <div className="app-scroll">
        <div className="page-head">
          <div className="page-eyebrow">STUDY · 基礎問題</div>
          <h1 className="page-title">基礎問題</h1>
          <p className="page-sub">
            あなたの理科使用科目に応じた問題集を表示しています。
          </p>
        </div>

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

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState hint="まだ問題集はありません。" />
        ) : results.length === 0 ? (
          <div className="search-empty">
            <div className="search-empty-ic">
              <SearchIcon size={20} />
            </div>
            <div className="search-empty-t1">該当する問題集がありません</div>
            <div className="search-empty-t2">
              キーワードを変えて検索してみてください。
            </div>
          </div>
        ) : (
          <div>
            {results.map((b) => (
              <div
                key={b.id}
                className="art-card"
                onClick={() => nav('ext', { url: b.url })}
              >
                <div className={`art-thumb v${(parseInt(b.id.replace(/\D/g, '') || '1', 10) % 4) + 1}`}>
                  {b.image && (
                    <img
                      className="art-thumb-img"
                      src={b.image}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                </div>
                <div className="art-body">
                  <div className="art-tag">
                    {b.subjectsJa.map((t, i) => (
                      <span key={t} style={{ marginRight: i < b.subjectsJa.length - 1 ? 6 : 0 }}>
                        {t}
                        {i < b.subjectsJa.length - 1 && (
                          <span style={{ marginLeft: 6, opacity: 0.5 }}>·</span>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="art-title">{b.title}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
