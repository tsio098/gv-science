import { useState } from 'react';
import { fetchProblem } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import type { NavFn, Subject } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { Spinner } from '../components/Spinner';
import { CheckIcon, ChevRightIcon } from '../components/Icon';

interface Props {
  id: string;
  subject: Subject;
  nav: NavFn;
}

const SUBJECT_LABEL: Record<Subject, string> = {
  chemistry: '化学',
  biology: '生物',
  earth: '地学',
};

export function ProblemDetailScreen({ id, subject, nav }: Props) {
  const { data, loading } = useAsync(
    () => fetchProblem(id, subject),
    [id, subject]
  );
  const [open, setOpen] = useState(false);
  const label = SUBJECT_LABEL[subject];

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav
        crumb={`GV / ${label}基礎問題`}
        onBack={() => nav('back')}
        backLabel={`${label}基礎問題`}
      />
      <div className="app-scroll">
        {loading || !data ? (
          <Spinner />
        ) : (
          <>
            <div className="detail-hero">
              <div className="detail-eyebrow">
                <span className="gv-en">
                  No. {String(data.no).padStart(2, '0')}
                </span>
                <span>·</span>
                <span>{label}</span>
              </div>
              <h1 className="detail-title">{data.title}</h1>
            </div>

            <div className="detail-section">
              <div className="detail-section-label">問題</div>
              <div className="detail-card">
                <div className="detail-text">{data.desc}</div>
              </div>
            </div>

            {data.figureUrl !== undefined || true ? (
              <div className="detail-section">
                <div className="detail-section-label">図 (省略可)</div>
                {data.figureUrl ? (
                  <div className="detail-card">
                    <img
                      src={data.figureUrl}
                      alt=""
                      style={{ width: '100%', display: 'block', borderRadius: 8 }}
                    />
                  </div>
                ) : (
                  <div
                    className="detail-card"
                    style={{
                      height: 140,
                      background:
                        'repeating-linear-gradient(135deg, rgba(122,155,118,0.16) 0 10px, rgba(122,155,118,0.04) 10px 20px), linear-gradient(135deg, var(--c-primary-soft) 0%, var(--c-bg-warm) 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--c-text-sub)',
                      fontFamily: 'var(--f-en)',
                      fontSize: 12,
                      letterSpacing: '0.1em',
                    }}
                  >
                    FIGURE PLACEHOLDER
                  </div>
                )}
              </div>
            ) : null}

            <div className="detail-section">
              <div className="detail-section-label">解答</div>
              <div className="answer-box">
                <button
                  className={`answer-toggle ${open ? 'open' : ''}`}
                  onClick={() => setOpen(!open)}
                  type="button"
                >
                  <div
                    className="row-icon"
                    style={{ width: 28, height: 28, borderRadius: 8 }}
                  >
                    <CheckIcon size={15} />
                  </div>
                  <span>{open ? '解答を隠す' : 'タップで解答を表示'}</span>
                  <span className="chev-icon">
                    <ChevRightIcon size={14} />
                  </span>
                </button>
                <div className={`answer-content ${open ? 'open' : ''}`}>
                  <div>
                    <div className="answer-body">
                      <p style={{ margin: 0 }}>
                        <span className="key">答</span>
                        {data.answer}
                      </p>
                      {data.explanation && (
                        <>
                          <div style={{ height: 12 }} />
                          <p
                            style={{
                              margin: 0,
                              color: 'var(--c-text-sub)',
                              fontSize: 13.5,
                            }}
                          >
                            解説: {data.explanation}
                          </p>
                        </>
                      )}
                    </div>
                  </div>
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
