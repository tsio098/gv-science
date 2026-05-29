/**
 * ペアリング画面（別プロバイダの LINE アカウント対応）
 *
 *   - 生徒IDシートで現在の LIFF userId が見つからなかったときに HomeC から
 *     切り替えて表示する。
 *   - 生徒は教師から共有された「ペアリングコード」（生徒IDシート D 列の
 *     `Uxxxx_既卒` 形式の ID）を入力する。
 *   - GAS の `action=pair` エンドポイントが該当行の LIFF_USERID 列に
 *     現在の LIFF userId を書き込む。
 *   - 成功したら親（App）に通知してホームを再フェッチさせる。
 */
import { useState } from 'react';
import { pairAccount } from '../lib/api';
import { Logo } from '../components/Logo';

interface Props {
  onPaired: () => void;
}

export function PairingScreen({ onPaired }: Props) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setError('ペアリングコードを入力してください。');
      return;
    }
    setSubmitting(true);
    setError(null);
    const res = await pairAccount({ code: trimmed });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(`${res.name || '生徒'}さん、紐付けが完了しました。`);
      // 少し待ってからホームへ戻す
      window.setTimeout(() => onPaired(), 1100);
    } else if (res.error === 'NOT_FOUND') {
      setError('コードが見つかりません。コードを確認してもう一度お試しください。');
    } else {
      setError(`紐付けに失敗しました（${res.error ?? '不明なエラー'}）`);
    }
  };

  return (
    <div className="app">
      <div className="safe-top" />
      <div className="nav" style={{ justifyContent: 'space-between' }}>
        <Logo size={26} />
        <div className="nav-crumb" style={{ flex: 'none' }}>
          ペアリング
        </div>
      </div>
      <div className="app-scroll">
        <div className="page-head">
          <div className="page-eyebrow">PAIRING · 初回連携</div>
          <h1 className="page-title">アカウント連携</h1>
          <p className="page-sub">
            あなたの LINE アカウントを Great Voyage Science に紐付けます。
            <br />
            講師から共有された「ペアリングコード」を入力してください。
          </p>
        </div>

        <div className="group">
          <div className="glass" style={{ padding: '16px 14px' }}>
            <label
              htmlFor="pair-code"
              style={{
                display: 'block',
                fontSize: 12,
                color: 'var(--c-text-sub)',
                marginBottom: 8,
              }}
            >
              ペアリングコード
            </label>
            <input
              id="pair-code"
              type="text"
              autoComplete="off"
              spellCheck={false}
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                setError(null);
              }}
              placeholder="例: Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx_既卒"
              disabled={submitting || !!success}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 14,
                fontFamily: 'var(--f-en)',
                border: '1px solid var(--c-divider)',
                borderRadius: 10,
                background: 'var(--c-bg)',
                color: 'var(--c-text)',
                boxSizing: 'border-box',
              }}
            />
            {error && (
              <div
                style={{
                  marginTop: 10,
                  color: '#c2410c',
                  fontSize: 12.5,
                  lineHeight: 1.4,
                }}
              >
                {error}
              </div>
            )}
            {success && (
              <div
                style={{
                  marginTop: 10,
                  color: 'var(--c-primary-deep)',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {success}
              </div>
            )}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || !!success}
              style={{
                marginTop: 14,
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                fontWeight: 600,
                color: '#fff',
                background: success
                  ? 'var(--c-primary-deep)'
                  : 'var(--c-primary)',
                border: 'none',
                borderRadius: 10,
                cursor: submitting || success ? 'default' : 'pointer',
                opacity: submitting && !success ? 0.6 : 1,
              }}
            >
              {success ? '完了' : submitting ? '紐付け中…' : '紐付ける'}
            </button>
          </div>
        </div>

        <div
          style={{
            margin: '18px 14px',
            padding: '12px 14px',
            background: 'var(--c-bg-warm)',
            borderRadius: 10,
            fontSize: 12.5,
            color: 'var(--c-text-sub)',
            lineHeight: 1.55,
          }}
        >
          <strong style={{ color: 'var(--c-text)' }}>ペアリングコードとは？</strong>
          <br />
          講師から個別に共有される、あなた専用の文字列です。
          このコードを使って、別の LINE アカウントから新しい端末でも同じ生徒情報にアクセスできるようになります。
          コードが分からない場合は講師にご連絡ください。
        </div>

        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}
