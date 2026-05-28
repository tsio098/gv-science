interface EmptyStateProps {
  title?: string;
  hint?: string;
}

export function EmptyState({
  title = 'まだありません',
  hint,
}: EmptyStateProps) {
  return (
    <div className="empty-card">
      <div style={{ fontWeight: 500, color: 'var(--c-text)' }}>{title}</div>
      {hint && (
        <div style={{ marginTop: 6, fontSize: 12.5 }}>{hint}</div>
      )}
    </div>
  );
}
