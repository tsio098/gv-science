/**
 * 外部ブラウザ用ログイン（設計書 §3.1・モック Login.dc.html）。
 * ログインID（LINE userId の下 10 桁）→ POST /tree/login → セッション JWT を保存。
 */
import { useState } from 'react';
import { TreeApiError, treeLogin } from '../../lib/treeApi';
import { saveTreeSession } from '../../lib/treeAuth';
import { Ico, TreeSprite } from './TreeIcons';
import { GROUP_COLOR, GROUP_SIDE, T, alpha } from './treeTheme';

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
        {/* 立方体のモチーフ（モック Login.dc.html の背景 SVG・390×300。中央の錨がアプリロゴ）*/}
        <div style={{ margin: '0 -24px', paddingTop: 'env(safe-area-inset-top, 0px)', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
          <LoginMotif />
        </div>
        <div
          style={{
            marginTop: -38,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
            position: 'relative',
          }}
        >
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

/** ログイン画面上部の飾り: 枝線と、点灯・未解放の立方体（静的・アニメなし）*/
function LoginMotif() {
  const line = alpha(T.text, 0.16);
  const lit = GROUP_COLOR.inorganic;
  const locked: [number, number, string][] = [
    [92, 202, GROUP_COLOR.organic],
    [262, 202, GROUP_COLOR.polymer],
    [52, 2, GROUP_COLOR.basic],
    [302, 2, GROUP_COLOR.inorganic],
  ];
  return (
    <svg width="390" height="300" viewBox="0 0 390 300" aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      <g stroke={line} strokeWidth="1.5" fill="none">
        <path d="M195 140 C195 110, 125 100, 125 70" />
        <path d="M195 140 C195 110, 265 100, 265 70" />
        <path d="M125 70 C125 50, 70 40, 70 20" />
        <path d="M265 70 C265 50, 320 40, 320 20" />
        <path d="M195 140 C195 180, 110 180, 110 220" />
        <path d="M195 140 C195 180, 280 180, 280 220" />
      </g>
      <rect x="113" y="58" width="36" height="36" rx="9" fill={T.sideDark} opacity="0.6" />
      <rect x="107" y="52" width="36" height="36" rx="9" fill={T.face} stroke={alpha(T.text, 0.18)} />
      <rect x="253" y="58" width="36" height="36" rx="9" fill={GROUP_SIDE.inorganic} opacity="0.6" />
      <rect x="247" y="52" width="36" height="36" rx="9" fill={lit} />
      {locked.map(([x, y, c]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width="36" height="36" rx="9" fill={T.faceLocked} stroke={c} strokeOpacity="0.7" strokeWidth="1.5" />
      ))}
      <rect x="178" y="123" width="48" height="48" rx="11" fill={GROUP_SIDE.basic} opacity="0.6" />
      <rect x="171" y="116" width="48" height="48" rx="11" fill={T.accent} />
      <g transform="translate(183 128)" fill="none" stroke={T.onColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="5" r="2" />
        <path d="M12 7v14M8 10h8M4 14a8 8 0 0 0 16 0M4 14l2-2M20 14l-2-2" />
      </g>
    </svg>
  );
}
