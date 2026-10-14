/**
 * ANCHOR TREE のルート。me / manifest / progress を読み、ツリー → 出題 → 結果 を切り替える。
 * LIFF 内（ホームから開く）と外部ブラウザ（/tree）の両方でこれを使う。
 */
import { useCallback, useEffect, useState } from 'react';
import type { QType, SubmitResult, TreeManifest, TreeMe, TreeProgress, TreeSession } from '../../lib/treeApi';
import {
  TreeApiError,
  fetchTreeManifest,
  fetchTreeMe,
  fetchTreeProgress,
  saveTreeNickname,
  startTreeSession,
} from '../../lib/treeApi';
import { TreeSprite } from './TreeIcons';
import { TreeScreen } from './TreeScreen';
import { PlayScreen } from './PlayScreen';
import { ResultScreen } from './ResultScreen';
import '../../styles/tree.css';

/** Phase 3 は化学のみ（manifest があるのは化学だけ）*/
const SUBJECT = 'chemistry';

type View =
  | { kind: 'tree' }
  | { kind: 'play'; session: TreeSession }
  | { kind: 'result'; session: TreeSession; result: SubmitResult };

interface Props {
  mode: 'liff' | 'external';
  /** LIFF: ホームへ戻る */
  onClose?: () => void;
  /** 外部ブラウザ: ログアウト（認証切れでも呼ぶ）*/
  onLogout?: () => void;
}

export function TreeRoot({ mode, onClose, onLogout }: Props) {
  const [me, setMe] = useState<TreeMe | null>(null);
  const [manifest, setManifest] = useState<TreeManifest | null>(null);
  const [progress, setProgress] = useState<TreeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'tree' });
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const fail = useCallback(
    (e: unknown) => {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') {
        onLogout?.();
        return;
      }
      setError(code || 'NETWORK');
    },
    [mode, onLogout]
  );

  const load = useCallback(() => {
    setError(null);
    Promise.all([fetchTreeMe(), fetchTreeManifest(SUBJECT), fetchTreeProgress(SUBJECT)])
      .then(([m, mf, pg]) => {
        setMe(m);
        setManifest(mf);
        setProgress(pg);
      })
      .catch(fail);
  }, [fail]);

  useEffect(load, [load]);

  const refreshProgress = useCallback(() => {
    // manifest が差し替わっていたら一緒に取り直す（版がずれると問題 ID が合わない）
    fetchTreeProgress(SUBJECT)
      .then((pg) => {
        setProgress(pg);
        if (manifest && pg.version !== manifest.version) fetchTreeManifest(SUBJECT).then(setManifest).catch(() => {});
      })
      .catch(() => {});
  }, [manifest]);

  const start = async (field: string, qtype: QType) => {
    setStarting(true);
    setMessage(null);
    try {
      const s = await startTreeSession(SUBJECT, field, qtype);
      setView({ kind: 'play', session: s });
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') return onLogout?.();
      setMessage(
        code === 'LOCKED'
          ? 'この分野はまだ解放されていません。'
          : code === 'NO_QUESTIONS'
            ? 'この種別の問題はまだありません。'
            : '問題を読み込めませんでした。通信状況を確かめてもう一度お試しください。'
      );
      refreshProgress();
      setView({ kind: 'tree' });
    } finally {
      setStarting(false);
    }
  };

  const saveNick = (nick: string) => {
    if (!me) return;
    const next = nick.trim() || 'プレイヤー';
    if (next === me.nickname) return;
    setMe({ ...me, nickname: next });
    saveTreeNickname(next)
      .then((r) => setMe((m) => (m ? { ...m, nickname: r.nickname } : m)))
      .catch(() => {});
  };

  if (error) {
    const notRegistered = error === 'NOT_REGISTERED';
    return (
      <div className="tr-root">
        <TreeSprite />
        <div className="tr-center">
          {notRegistered ? (
            <>
              <div style={{ color: '#F9F7F2', fontWeight: 700, fontSize: 16 }}>このアプリは塾生専用です</div>
              <div>登録が反映されるまで最大 30 分かかります。しばらくしてから開きなおすか、先生に連絡してください。</div>
            </>
          ) : (
            <>
              <div style={{ color: '#F9F7F2', fontWeight: 700, fontSize: 16 }}>読み込めませんでした</div>
              <div>通信状況を確かめて、もう一度お試しください。</div>
              <button type="button" className="tr-cta" style={{ maxWidth: 240 }} onClick={load}>
                再読み込み
              </button>
            </>
          )}
          {onClose && (
            <button type="button" className="tr-ghost" style={{ width: 240 }} onClick={onClose}>
              ホームへ戻る
            </button>
          )}
          {mode === 'external' && notRegistered && (
            <button type="button" className="tr-ghost" style={{ width: 240 }} onClick={onLogout}>
              別のIDでログイン
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!me || !manifest || !progress) {
    return (
      <div className="tr-root">
        <div className="tr-center">
          <div className="tr-spinner" />
          <div>ANCHOR TREE を準備中…</div>
        </div>
      </div>
    );
  }

  const fieldOf = (id: string) => manifest.fields.find((f) => f.id === id);

  return (
    <>
      <TreeSprite />
      {view.kind === 'tree' && (
        <TreeScreen
          manifest={manifest}
          progress={progress}
          selected={selected}
          onSelect={setSelected}
          onStart={start}
          starting={starting}
          onClose={mode === 'liff' ? onClose : undefined}
          onLogout={mode === 'external' ? onLogout : undefined}
          loginId={me.loginId}
          message={message}
          onDismissMessage={() => setMessage(null)}
        />
      )}
      {view.kind === 'play' && (
        <PlayScreen
          session={view.session}
          subjectName={manifest.name}
          fieldName={fieldOf(view.session.field)?.name ?? view.session.field}
          group={fieldOf(view.session.field)?.group ?? 'theory'}
          onExit={() => {
            refreshProgress();
            setView({ kind: 'tree' });
          }}
          onDone={(result) => setView({ kind: 'result', session: view.session, result })}
        />
      )}
      {view.kind === 'result' && (
        <ResultScreen
          result={view.result}
          session={view.session}
          manifest={manifest}
          grade={me.grade}
          nickname={me.nickname}
          busy={starting}
          onRetry={(nick) => {
            saveNick(nick);
            refreshProgress();
            void start(view.session.field, view.session.qtype);
          }}
          onBack={(nick) => {
            saveNick(nick);
            refreshProgress();
            setView({ kind: 'tree' });
          }}
        />
      )}
    </>
  );
}
