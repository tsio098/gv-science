/**
 * データ取得失敗時の共通表示。
 * 本番でリトライしても通信に失敗したとき、サンプル（モック）を本物として
 * 見せる代わりにこれを出す。ユーザーは「再試行」で自分で再取得できる。
 */
interface ErrorStateProps {
  title?: string;
  hint?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'データを取得できませんでした',
  hint = '通信環境を確認して、もう一度お試しください。',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="empty-card">
      <div style={{ fontWeight: 500, color: 'var(--c-text)' }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 12.5 }}>{hint}</div>
      {onRetry && (
        <button
          type="button"
          className="btn btn-quiet"
          style={{ marginTop: 14 }}
          onClick={onRetry}
        >
          再試行
        </button>
      )}
    </div>
  );
}
