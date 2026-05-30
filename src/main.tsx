/**
 * エントリ。LIFF init を待ってから React をマウントする。
 *  - LIFF_ID 未設定なら init をスキップして開発用にそのまま起動。
 *  - init で error が起きた場合はエラー画面（再読み込み導線）を出す。
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initLiff } from './lib/liff';
import './styles/tokens.css';
import './styles/app.css';
import './styles/scores.css';

const root = createRoot(document.getElementById('root')!);

function Boot({ children }: { children: React.ReactNode }) {
  return <StrictMode>{children}</StrictMode>;
}

function BootSpinner({ label }: { label: string }) {
  return (
    <div className="boot">
      <div className="spinner" />
      <div>{label}</div>
    </div>
  );
}

function BootError({ message }: { message: string }) {
  return (
    <div className="boot">
      <div className="err">
        LIFF の初期化に失敗しました。
        <br />
        LINE 公式アカウントから開きなおすか、再読み込みしてください。
      </div>
      <div style={{ fontFamily: 'var(--f-mono)', fontSize: 11, opacity: 0.6 }}>
        {message}
      </div>
      <button
        className="btn btn-quiet"
        type="button"
        onClick={() => window.location.reload()}
      >
        再読み込み
      </button>
    </div>
  );
}

root.render(<Boot><BootSpinner label="準備中…" /></Boot>);

initLiff().then((status) => {
  if (status.mode === 'error') {
    root.render(
      <Boot>
        <BootError message={status.error ?? 'unknown error'} />
      </Boot>
    );
    return;
  }
  root.render(
    <Boot>
      <App />
    </Boot>
  );
});
