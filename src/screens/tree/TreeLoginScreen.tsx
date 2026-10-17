/**
 * 外部ブラウザ用ログイン（設計書 §3.1・モック Login.dc.html）。
 * ログインID（LINE userId の下 10 桁）→ POST /tree/login → セッション JWT を保存。
 * 見た目はデザインボード「ログイン」（2026-10-17）: 背景 login-bg_*.svg ＋縦組みロゴ lockup-stacked_*.svg。
 */
import { useState } from 'react';
import { TreeApiError, treeLogin } from '../../lib/treeApi';
import { saveTreeSession } from '../../lib/treeAuth';
import { Ico, TreeSprite } from './TreeIcons';
import '../../styles/tree-brand.css';

/**
 * ABYSS を一度でも解放した生徒がこの端末でログインしていたら深海版（TreeRoot が localStorage に印を残す。解除しない）。
 * ID を入れる前は誰か分からないので端末の印で決める（2026-10-17 先生決定）
 */
function abyssStyle(): boolean {
  try {
    return localStorage.getItem('gvTree.abyssStyle') === '1';
  } catch {
    return false;
  }
}

export function TreeLoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [abyss] = useState(abyssStyle);
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
    <div className={`tr-root tr-login${abyss ? ' is-abyss' : ''}`}>
      <TreeSprite />
      {/* 背景 = 実際のツリーと同じ部品のノードツリー（ロゴの後ろの濃い影・下へ向かって暗く、まで SVG に入っている）*/}
      <img className="tl-bg" src={`/tree/brand/login-bg_${abyss ? 'abyss' : 'route'}.svg`} alt="" aria-hidden="true" draggable={false} />
      <div className="tl-inner">
        <img className="tl-logo" src={`/tree/brand/lockup-stacked_${abyss ? 'abyss' : 'route'}.svg`} alt="ANCHOR TREE" draggable={false} />
        {abyss && <div className="tl-stage">STAGE · ABYSS</div>}

        <form className="tl-form" onSubmit={submit}>
          <label htmlFor="tr-login-id">ログインID</label>
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
          <button type="submit" className="tr-cta" disabled={!id.trim() || busy}>
            {busy ? 'ログイン中…' : 'ログイン'}
          </button>
          <div className="tl-hint">ログインIDは GV Science（LINE）のホーム →「別のブラウザで使う」からコピーできます</div>
        </form>

        {err && (
          <div className="tr-alert" role="alert" style={{ width: '100%' }}>
            <Ico id="i-alert" size={18} />
            <span>{err}</span>
          </div>
        )}

        <div className="tl-foot">このアプリは Great Voyage 理科教室の塾生専用です</div>
      </div>
    </div>
  );
}
