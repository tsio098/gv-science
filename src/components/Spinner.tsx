export function Spinner({ label = '読み込み中…' }: { label?: string }) {
  return (
    <div className="spinner-wrap">
      <div className="spinner" />
      <div>{label}</div>
    </div>
  );
}
