import { fetchProblems } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn, Subject } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import { ErrorState } from '../components/ErrorState';
import { ChevRow } from '../components/Icon';

interface Props {
  subject: Subject;
  nav: NavFn;
}

const SUBJECT_LABEL: Record<Subject, string> = {
  chemistry: '化学',
  biology: '生物',
  earth: '地学',
};

export function ProblemListScreen({ subject, nav }: Props) {
  const { data, loading, error, reload } = useAsync(
    () => fetchProblems(subject),
    [subject]
  );
  const label = SUBJECT_LABEL[subject];
  const list = data ?? [];

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
          <div className="page-eyebrow">{subject.toUpperCase()} · 基礎問題</div>
          <h1 className="page-title">{label}の基礎問題</h1>
          <p className="page-sub">
            タップして問題を開き、解答は自分で考えてから確認しよう。
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : error ? (
          <ErrorState onRetry={reload} />
        ) : list.length === 0 ? (
          <EmptyState hint="まだ問題は登録されていません。" />
        ) : (
          <div className="group">
            <div className="group-label">
              <span className="label-text">問題 · {list.length} 問</span>
              <span className="label-aux">
                {list.filter((p) => p.isNew).length} 件 新着
              </span>
            </div>
            <div className="glass">
              {list.map((p) => (
                <div
                  key={p.id}
                  className="row"
                  onClick={() => nav('problem', { id: p.id, subject })}
                >
                  <div className="row-icon">
                    <span style={{ fontFamily: 'var(--f-en)' }}>
                      {String(p.no).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="row-body">
                    <div className="row-title">
                      <span>{p.title}</span>
                      {p.isNew && <span className="badge new">NEW</span>}
                    </div>
                    <div className="row-sub">{p.desc}</div>
                  </div>
                  <div className="row-trail">
                    <ChevRow />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
