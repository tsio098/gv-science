/**
 * 各画面共通：戻る + パンくず のトップナビ。
 */
import { ChevLeftIcon } from './Icon';

interface TopNavProps {
  crumb?: string;
  onBack: () => void;
  backLabel?: string;
}

export function TopNav({ crumb, onBack, backLabel = '戻る' }: TopNavProps) {
  return (
    <div className="nav">
      <button className="nav-back" onClick={onBack} type="button">
        <ChevLeftIcon size={18} />
        <span>{backLabel}</span>
      </button>
      {crumb ? <div className="nav-crumb">{crumb}</div> : null}
    </div>
  );
}
