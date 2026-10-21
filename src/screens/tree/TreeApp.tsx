/**
 * 外部ブラウザの入口（/tree）。LIFF は初期化しない（main.tsx が mode 'external' でここを描く）。
 * セッション JWT が無い・切れていればログイン画面。
 */
import { useEffect, useState } from 'react';
import { clearTreeSession, getTreeSessionToken } from '../../lib/treeAuth';
import { TreeLoginScreen } from './TreeLoginScreen';
import { TreeRoot } from './TreeRoot';
import { TreeErrorBoundary } from './TreeErrorBoundary';
import '../../styles/tree.css';

export function TreeApp() {
  const [authed, setAuthed] = useState(() => !!getTreeSessionToken());

  useEffect(() => {
    // 周囲（オーバースクロール・ノッチ）もツリーの色に
    const prev = document.documentElement.style.background;
    document.documentElement.style.background = '#043039';
    document.body.style.background = '#043039';
    const meta = document.querySelector('meta[name="theme-color"]');
    const prevTheme = meta?.getAttribute('content');
    meta?.setAttribute('content', '#0E6474');
    document.title = 'ANCHOR TREE';
    return () => {
      document.documentElement.style.background = prev;
      if (prevTheme) meta?.setAttribute('content', prevTheme);
    };
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0 }}>
      {authed ? (
        <TreeErrorBoundary>
          <TreeRoot
            mode="external"
            onLogout={() => {
              clearTreeSession();
              setAuthed(false);
            }}
          />
        </TreeErrorBoundary>
      ) : (
        <TreeLoginScreen onLoggedIn={() => setAuthed(true)} />
      )}
    </div>
  );
}
