import { fetchSchedules } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn, Subject } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { EmptyState } from '../components/EmptyState';
import {
  ChevRow,
  FlaskIcon,
  LeafIcon,
  SearchIcon,
} from '../components/Icon';

interface Props {
  subject: Exclude<Subject, 'earth'>;
  nav: NavFn;
}

export function ScheduleListScreen({ subject, nav }: Props) {
  const { data, loading } = useAsync(() => fetchSchedules(subject), [subject]);
  const isChem = subject === 'chemistry';
  const label = isChem ? '化学' : '生物';
  const eyebrow = isChem ? 'CHEMISTRY' : 'BIOLOGY';
  const list = data ?? [];

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / 授業予定" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll">
        <div className="page-head">
          <div className="page-eyebrow">{eyebrow} · 授業予定</div>
          <h1 className="page-title">{label}の授業</h1>
          <p className="page-sub">直近の予定です。日付をタップで詳細・資料へ。</p>
        </div>

        <div className="search-box">
          <SearchIcon size={16} />
          <span>授業を検索</span>
        </div>

        {loading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <EmptyState hint="授業予定はまだ登録されていません。" />
        ) : (
          <div className="group">
            <div className="group-label">
              <span className="label-text">予定 · {list.length} 件</span>
              <span className="label-aux">
                {list.filter((d) => d.isNew).length} 件 新着
              </span>
            </div>
            <div className="glass">
              {list.map((row) => (
                <div
                  key={row.id}
                  className="row"
                  onClick={() => nav('schedule', { id: row.id, subject })}
                >
                  <div className={`row-icon ${isChem ? '' : 'accent'}`}>
                    {isChem ? <FlaskIcon size={20} /> : <LeafIcon size={20} />}
                  </div>
                  <div className="row-body">
                    <div className="row-title">
                      <span>{row.title}</span>
                      {row.isNew && <span className="badge new">NEW</span>}
                    </div>
                    <div className="row-sub">
                      <span className="gv-num">
                        {row.date} ({row.dow})
                      </span>
                      {row.material && <span className="badge material">資料</span>}
                      {row.video && <span className="badge video">動画</span>}
                    </div>
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
