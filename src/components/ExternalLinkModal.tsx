/**
 * 外部リンク確認モーダル。README 指定：必ず確認を経由してから開く。
 */
import { AlertIcon } from './Icon';
import { openExternal } from '../lib/liff';

interface Props {
  url: string;
  onClose: () => void;
}

export function ExternalLinkModal({ url, onClose }: Props) {
  return (
    <div className="modal-back" onClick={onClose} role="dialog">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon">
          <AlertIcon size={22} />
        </div>
        <div className="modal-title">外部リンクを開く</div>
        <div className="modal-body">
          このリンクは外部サイト (Google フォーム等) を開きます。LINE
          アプリ内ブラウザで開いてよろしいですか？
        </div>
        <div className="modal-foot">
          <button className="btn btn-quiet" onClick={onClose} type="button">
            キャンセル
          </button>
          <button
            className="btn btn-primary"
            type="button"
            onClick={() => {
              openExternal(url, false);
              onClose();
            }}
          >
            開く
          </button>
        </div>
      </div>
    </div>
  );
}
