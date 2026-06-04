import { fetchSchedule } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn, ResourceLink, ScheduleSubject, Subject } from '../lib/types';
import { SUBJECT_EN, SUBJECT_JA } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { ErrorState } from '../components/ErrorState';
import {
  ChevRightIcon,
  DownloadIcon,
  ExtIcon,
  PencilIcon,
  PlayIcon,
} from '../components/Icon';

interface Props {
  id: string;
  subject: ScheduleSubject;
  nav: NavFn;
}

/** スケジュール科目 → 関連基礎問題の Subject */
function relatedProblemSubject(s: ScheduleSubject): Subject {
  if (s === 'chemistry' || s === 'chemistry-basic') return 'chemistry';
  if (s === 'biology'   || s === 'biology-basic')   return 'biology';
  return 'earth';
}

/** URL からホスト名を取り出す（取れなければ空文字） */
function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

export function ScheduleDetailScreen({ id, subject, nav }: Props) {
  const { data, loading, error, reload } = useAsync(
    () => fetchSchedule(id, subject),
    [id, subject],
    { cacheKey: 'schedule:' + subject + ':' + id }
  );
  const label = SUBJECT_JA[subject];
  const eyebrow = SUBJECT_EN[subject];
  const problemSubject = relatedProblemSubject(subject);

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav
        crumb={`GV / ${label}授業予定`}
        onBack={() => nav('back')}
        backLabel={`${label}授業予定`}
      />
      <div className="app-scroll">
        {error && !loading ? (
          <ErrorState onRetry={reload} />
        ) : loading || !data ? (
          <Spinner />
        ) : (
          <>
            <div className="detail-hero">
              <div className="detail-eyebrow">
                <span>{eyebrow}</span>
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

            {data.desc && (
              <div className="detail-section">
                <div className="detail-section-label">授業内容</div>
                <div className="detail-text">{data.desc}</div>
              </div>
            )}

            {(() => {
              // 資料リンク群: 新フィールド materials が優先、無ければ旧 materialUrl にフォールバック
              const materialLinks: ResourceLink[] =
                data.materials && data.materials.length > 0
                  ? data.materials
                  : data.material && data.materialUrl
                  ? [{ label: '配布資料 PDF', url: data.materialUrl }]
                  : [];

              // 関連動画リンク群: 新フィールド videos が優先、無ければ旧 videoUrl にフォールバック
              const videoLinks: ResourceLink[] =
                data.videos && data.videos.length > 0
                  ? data.videos
                  : data.video && data.videoUrl
                  ? [{ label: '授業動画', url: data.videoUrl }]
                  : [];

              return (
                <>
                  <div className="detail-section">
                    <div className="detail-section-label">資料</div>
                    {materialLinks.length > 0 ? (
                      materialLinks.map((m, i) => (
                        <div
                          key={`mat-${i}`}
                          className="detail-link"
                          onClick={() => nav('ext', { url: m.url })}
                        >
                          <div className="ic">
                            <DownloadIcon size={18} />
                          </div>
                          <div className="tx">
                            <div className="t1">{m.label}</div>
                            <div className="t2">
                              <span className="gv-en">{hostnameOf(m.url)}</span>
                            </div>
                          </div>
                          <div className="ar">
                            <ExtIcon size={14} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className="detail-card"
                        style={{ color: 'var(--c-text-sub)', fontSize: 13.5 }}
                      >
                        この回の資料はまだ公開されていません。
                      </div>
                    )}
                  </div>

                  <div className="detail-section">
                    <div className="detail-section-label">関連動画</div>
                    {videoLinks.length > 0 ? (
                      videoLinks.map((v, i) => (
                        <div
                          key={`vid-${i}`}
                          className="detail-link"
                          onClick={() => nav('ext', { url: v.url })}
                        >
                          <div className="ic acc">
                            <PlayIcon size={18} />
                          </div>
                          <div className="tx">
                            <div className="t1">{v.label}</div>
                            <div className="t2">
                              <span className="gv-en">{hostnameOf(v.url)}</span>
                            </div>
                          </div>
                          <div className="ar">
                            <ExtIcon size={14} />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div
                        className="detail-card"
                        style={{ color: 'var(--c-text-sub)', fontSize: 13.5 }}
                      >
                        関連動画はまだ登録されていません。
                      </div>
                    )}
                  </div>
                </>
              );
            })()}

            <div className="detail-section">
              <div className="detail-section-label">関連</div>
              <div
                className="detail-link"
                onClick={() => nav('problems', { subject: problemSubject })}
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
