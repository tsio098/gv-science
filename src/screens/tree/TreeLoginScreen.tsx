/**
 * 外部ブラウザ用ログイン（設計書 §3.1・モック Login.dc.html）。
 * ログインID（LINE userId の下 10 桁）→ POST /tree/login → セッション JWT を保存。
 */
import { useState } from 'react';
import { TreeApiError, treeLogin } from '../../lib/treeApi';
import { saveTreeSession } from '../../lib/treeAuth';
import { Ico, TreeSprite } from './TreeIcons';
import { T, alpha, groupSide } from './treeTheme';

export function TreeLoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [id, setId] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id.trim() || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await treeLogin(id);
      saveTreeSession(r.token, r.exp);
      onLoggedIn();
    } catch (x) {
      const code = x instanceof TreeApiError ? x.code : '';
      if (code === 'NOT_REGISTERED') setErr('登録されていないIDです。IDを確認するか、先生に連絡してください。');
      else if (code === 'TOO_MANY') {
        const min = Math.max(1, Math.ceil(((x as TreeApiError).retryAfter ?? 60) / 60));
        setErr(`試行回数が多すぎます。${min} 分ほど待ってからもう一度お試しください。`);
      } else setErr('ログインできませんでした。通信状況を確かめてもう一度お試しください。');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tr-root tr-login">
      <TreeSprite />
      <div className="tr-login-inner">
        <div
          style={{
            marginTop: 'calc(env(safe-area-inset-top, 0px) + 96px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 13,
              background: T.accent,
              color: T.onColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: `7px 7px 0 0 ${groupSide('basic')}, 0 0 18px ${alpha(T.accent, 0.5)}`,
              marginBottom: 18,
            }}
          >
            <Ico id="i-anchor" size={28} />
          </div>
          <div className="tr-num" style={{ fontWeight: 700, fontSize: 20, color: T.accent }}>
            GV Science
          </div>
          <div className="tr-num" style={{ fontSize: 30, fontWeight: 700, letterSpacing: '0.12em' }}>
            ANCHOR TREE
          </div>
          <div style={{ fontSize: 13, color: T.sub }}>演習の問題を解き直して、ツリーを育てよう</div>
        </div>

        <form
          className="tr-card"
          onSubmit={submit}
          style={{
            marginTop: 32,
            padding: '22px 20px',
            boxShadow: `0 0 20px ${alpha(T.accent, 0.14)}, 0 24px 60px -16px rgba(0,0,0,0.5)`,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <label htmlFor="tr-login-id" style={{ fontSize: 13, fontWeight: 700 }}>
            ログインID
          </label>
          <input
            id="tr-login-id"
            className="tr-login-id"
            type="text"
            inputMode="text"
            autoCapitalize="off"
            autoComplete="off"
            spellCheck={false}
            placeholder="例: a3f9c1d07e"
            value={id}
            onChange={(e) => setId(e.target.value)}
          />
          <div style={{ fontSize: 12, color: T.sub, lineHeight: 1.6 }}>
            ログインIDは GV Science（LINE）のホーム →「別のブラウザで使う」からコピーできます。
          </div>
          <button type="submit" className="tr-cta" disabled={!id.trim() || busy}>
            {busy ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        {err && (
          <div className="tr-alert" role="alert" style={{ marginTop: 14 }}>
            <Ico id="i-alert" size={18} />
            <span>{err}</span>
          </div>
        )}

        <div
          style={{
            marginTop: 'auto',
            padding: '24px 0 calc(env(safe-area-inset-bottom, 0px) + 34px)',
            textAlign: 'center',
            fontSize: 11,
            color: alpha(T.text, 0.4),
          }}
        >
          このアプリは Great Voyage 理科教室の塾生専用です
        </div>
      </div>
    </div>
  );
}
