import { fetchSchedule } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn, Subject } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import {
  ChevRightIcon,
  DownloadIcon,
  ExtIcon,
  PencilIcon,
  PlayIcon,
} from '../components/Icon';

interface Props {
  id: string;
  subject: Exclude<Subject, 'earth'>;
  nav: NavFn;
}

export function ScheduleDetailScreen({ id, subject, nav }: Props) {
  const { data, loading } = useAsync(
    () => fetchSchedule(id, subject),
    [id, subject]
  );
  const isChem = subject === 'chemistry';
  const label = isChem ? '化学' : '生物';

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav
        crumb={`GV / ${label}授業予定`}
        onBack={() => nav('back')}
        backLabel={`${label}授業予定`}
      />
      <div className="app-scroll">
        {loading || !data ? (
          <Spinner />
        ) : (
          <>
            <div className="detail-hero">
              <div className="detail-eyebrow">
                <span>{isChem ? 'CHEMISTRY' : 'BIOLOGY'}</span>
                {data.isNew && <span className="badge new">NEW</span>}
              </div>
              <h1 className="detail-title">{data.title}</h1>
              <div className="detail-meta">
                <span className="gv-num">
                  {data.date} ({data.dow})
                </span>
                <span
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: 99,
                    background: 'var(--c-text-mute)',
                  }}
                />
                <span>{label}受講者</span>
              </div>
            </div>

            <div className="detail-section">
              <div className="detail-section-label">授業内容</div>
              <div className="detail-text">{data.desc}</div>
            </div>

            <div className="detail-section">
              <div className="detail-section-label">資料・動画</div>
              {data.material && (
                <div
                  className="detail-link"
                  onClick={() =>
                    nav('ext', {
                      url: data.materialUrl ?? 'https://example.com/material',
                    })
                  }
                >
                  <div className="ic">
                    <DownloadIcon size={18} />
                  </div>
                  <div className="tx">
                    <div className="t1">配布資料 PDF</div>
                    <div className="t2">
                      <span className="gv-en">drive.google.com</span> · 1.4 MB
                    </div>
                  </div>
                  <div className="ar">
                    <ExtIcon size={14} />
                  </div>
                </div>
              )}
              {data.video && (
                <div
                  className="detail-link"
                  onClick={() =>
                    nav('ext', {
                      url: data.videoUrl ?? 'https://youtu.be/dQw4w9WgXcQ',
                    })
                  }
                >
                  <div className="ic acc">
                    <PlayIcon size={18} />
                  </div>
                  <div className="tx">
                    <div className="t1">授業動画</div>
                    <div className="t2">
                      <span className="gv-en">youtu.be</span> · 約 52 分
                    </div>
                  </div>
                  <div className="ar">
                    <ExtIcon size={14} />
                  </div>
                </div>
              )}
              {!data.material && !data.video && (
                <div
                  className="detail-card"
                  style={{ color: 'var(--c-text-sub)', fontSize: 13.5 }}
                >
                  この回の資料はまだ公開されていません。
                </div>
              )}
            </div>

            <div className="detail-section">
              <div className="detail-section-label">関連</div>
              <div
                className="detail-link"
                onClick={() => nav('problems', { subject })}
              >
                <div className="ic">
                  <PencilIcon size={18} />
                </div>
                <div className="tx">
                  <div className="t1">関連の基礎問題</div>
                  <div className="t2">{label}基礎問題から探す</div>
                </div>
                <div className="ar">
                  <ChevRightIcon size={14} />
                </div>
              </div>
            </div>
            <div className="empty-pad-bottom" />
          </>
        )}
      </div>
    </div>
  );
}
