/**
 * 「別のブラウザで使う」モーダル（設計書 §3.5 / モック ShareModal.dc.html）。
 * ログインID（下 10 桁）と ANCHOR TREE の URL をそれぞれコピーでき、外部ブラウザで開ける。
 * LIFF 内のツリー画面の「…」と、ホームの ANCHOR TREE カードの長押しから開く。
 * ホームからも使うので、アイコンは sprite に頼らずインラインで描く。
 */
import { useEffect, useState } from 'react';
import { TreeApiError, fetchTreeMe } from '../../lib/treeApi';
import { openExternal } from '../../lib/liff';
import { swipeDiag } from './useNoSwipeMinimize';
import '../../styles/tree.css';
// レトロ寄りの見た目（2026-10-20）。tree.css と同じチャンクの後ろに入るよう、tree.css を読むところでは続けて読む
import '../../styles/tree-retro.css';

interface Props {
  /** 分かっていれば渡す（無ければ /tree/me で取る）*/
  loginId?: string | null;
  /** 先生用アカウントなら、LINE の縮小対策の状態（実機でしか確かめられない）を下に出す */
  staff?: boolean;
  onClose: () => void;
}

/** 先生用: LINE の下スワイプ縮小対策がその端末で効いているかを読むための行 */
function SwipeDiagRows() {
  const [d, setD] = useState(() => swipeDiag());
  useEffect(() => {
    const t = setInterval(() => setD(swipeDiag()), 500);
    return () => clearInterval(t);
  }, []);
  const ua = navigator.userAgent.match(/\bLine\/[\d.]+/i)?.[0] ?? '—';
  const rows = [
    ['LINE 判定', d.line ? `はい（${ua}）` : 'いいえ'],
    ['対策', d.active ? '有効' : `無効${d.undone ? `（${d.undone}）` : ''}`],
    ['scrollY', `${Math.round(d.scrollY)} / body ${Math.round(d.bodyHeight)} / 画面 ${Math.round(d.innerHeight)}`],
    ['戻した回数', `${d.resets}　止めた touchmove ${d.blocked}　横スクロール ${d.sideways}`],
    ['直前のタッチ', d.lastTouch ? `開始 ${Math.round(d.lastTouch.start)} → 終了 ${Math.round(d.lastTouch.end)}` : '—'],
  ];
  return (
    <div className="tr-share-note" style={{ marginTop: 10, lineHeight: 1.7 }}>
      <div style={{ fontWeight: 700 }}>LINE の縮小対策（先生用の確認）</div>
      {rows.map(([k, v]) => (
        <div key={k}>
          {k}: <span className="tr-mono">{v}</span>
        </div>
      ))}
    </div>
  );
}

/** clipboard API → だめなら textarea + execCommand（LINE 内ブラウザ対策）*/
async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* fallthrough */
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="9" y="9" width="11" height="11" rx="2" />
    <path d="M5 15V5a1 1 0 0 1 1-1h9" />
  </svg>
);

type CopyState = 'idle' | 'done' | 'failed';

function CopyRow({ label, value, big, note }: { label: string; value: string; big?: boolean; note?: string }) {
  const [state, setState] = useState<CopyState>('idle');
  useEffect(() => {
    if (state !== 'done') return;
    const t = setTimeout(() => setState('idle'), 1500);
    return () => clearTimeout(t);
  }, [state]);
  return (
    <div className="tr-share-item">
      <div className="tr-share-label">{label}</div>
      <div className="tr-share-box">
        <span className={`tr-mono${big ? ' is-big' : ''}`}>{value || '—'}</span>
        <button
          type="button"
          className={`tr-copy${state === 'done' ? ' is-done' : ''}`}
          disabled={!value}
          onClick={async () => setState((await copyText(value)) ? 'done' : 'failed')}
        >
          <CopyIcon />
          {state === 'done' ? 'コピー済' : 'コピー'}
        </button>
      </div>
      {state === 'failed' && <div className="tr-share-note is-warn">コピーできませんでした。文字を長押ししてコピーしてください。</div>}
      {note && state !== 'failed' && <div className="tr-share-note">{note}</div>}
    </div>
  );
}

export function TreeShareModal({ loginId, staff = false, onClose }: Props) {
  const [id, setId] = useState<string | null>(loginId ?? null);
  const [error, setError] = useState<string | null>(null);
  const url = `${window.location.origin}/tree`;
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  useEffect(() => {
    if (id) return;
    let alive = true;
    fetchTreeMe()
      .then((m) => alive && setId(m.loginId))
      .catch((e) => {
        if (!alive) return;
        setError(
          e instanceof TreeApiError && e.code === 'NOT_REGISTERED'
            ? '登録がまだ反映されていません（最大 30 分）。しばらくしてから開きなおしてください。'
            : 'ログインID を読み込めませんでした。通信状況を確かめてください。'
        );
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tr-root tr-share-back" role="dialog" aria-label="別のブラウザで使う" onClick={onClose}>
      <div className="tr-share" onClick={(e) => e.stopPropagation()}>
        <div className="tr-share-head">
          <div>
            <div className="tr-share-title">別のブラウザで使う</div>
            <div className="tr-share-lead">PC や Safari から ANCHOR TREE を開くときは、下の URL を開いてログインID を入力します。</div>
          </div>
          <button type="button" className="tr-pop-close" aria-label="閉じる" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        {error ? (
          <div className="tr-share-note is-warn">{error}</div>
        ) : (
          <CopyRow label="あなたのログインID" value={id ?? ''} big note="他の人に教えないでください（あなたの記録が書き換えられます）" />
        )}
        <CopyRow label="ANCHOR TREE の URL" value={url} />
        <button type="button" className="tr-ghost tr-share-open" onClick={() => openExternal(url, true)}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
          </svg>
          {isIOS ? 'Safari で開く' : 'ブラウザで開く'}
        </button>
        {staff && <SwipeDiagRows />}
      </div>
    </div>
  );
}
