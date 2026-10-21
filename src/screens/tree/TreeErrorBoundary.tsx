/**
 * ANCHOR TREE の描画中の例外を受け止める（2026-10-22 デバッグで追加）。
 * 無いと想定外の応答 1 つで React の root ごと外れ、LIFF 全体が白画面になる → 「再読み込み / ホームへ戻る」を出す。
 */
import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** LIFF のときだけ（GV Science のホームへ戻る）*/
  onClose?: () => void;
}

export class TreeErrorBoundary extends Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error('[tree] render error', error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const btn = {
      width: 240, height: 48, borderRadius: 12, border: '1px solid rgba(255,255,255,.4)',
      background: 'transparent', color: '#fff', fontSize: 15,
    } as const;
    return (
      <div
        style={{
          position: 'fixed', inset: 0, background: '#043039', color: '#fff', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center', fontSize: 15, lineHeight: 1.7,
        }}
      >
        <div>表示中に問題が起きました。<br />もう一度読み込んでください。</div>
        <button type="button" style={btn} onClick={() => window.location.reload()}>
          再読み込み
        </button>
        {this.props.onClose && (
          <button
            type="button"
            style={btn}
            onClick={() => {
              this.setState({ failed: false });
              this.props.onClose?.();
            }}
          >
            ホームへ戻る
          </button>
        )}
      </div>
    );
  }
}
