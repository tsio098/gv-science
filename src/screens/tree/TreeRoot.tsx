/**
 * ANCHOR TREE のルート。me / manifest / progress を読み、ツリー → 出題 → 結果 → ランキング を切り替える。
 * LIFF 内（ホームから開く）と外部ブラウザ（/tree）の両方でこれを使う。
 * LIFF 内は「…」から ID / URL のモーダル（別のブラウザで使う）を開ける。
 */
import { useCallback, useEffect, useState } from 'react';
import type {
  ArenaInfo,
  ArenaResult,
  ArenaSession,
  QType,
  SubmitResult,
  TreeManifest,
  TreeMe,
  TreeProgress,
  TreeSession,
  TreeStage,
} from '../../lib/treeApi';
import {
  TreeApiError,
  fetchArena,
  fetchTreeManifest,
  fetchTreeMe,
  fetchTreeProgress,
  reportTreeQuestion,
  saveTreeNickname,
  startArena,
  startTreeSession,
} from '../../lib/treeApi';
import { ArenaScreen } from './ArenaScreen';
import { ArenaResultScreen } from './ArenaResultScreen';
import { RankingScreen, type RankScope } from './RankingScreen';
import { TreeShareModal } from './TreeShareModal';
import { TreeSprite } from './TreeIcons';
import { T, alpha, rootClass, setTreeStage } from './treeTheme';
import { getLiffStatus } from '../../lib/liff';
import { type TreeSubject, pickTreeSubject, rememberTreeSubject, treeSubjectsFor } from '../../lib/treeSubject';
import { TreeScreen } from './TreeScreen';
import { PlayScreen } from './PlayScreen';
import { ResultScreen } from './ResultScreen';
import { StaffScreen } from './StaffScreen';
import { SUBJECT_JA, type ScheduleSubject } from '../../lib/types';
import '../../styles/tree.css';

/**
 * LINE 内で開いたときの自分の LINE の ID（userId）。「塾生専用です」画面に出し、
 * 先生用アカウントの登録や問い合わせに使う（本人の ID なので見せてよい。2026-10-15）
 */
function ownLineId(): string | null {
  const s = getLiffStatus();
  if (s.profile?.userId) return s.profile.userId;
  try {
    const part = s.idToken?.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof json.sub === 'string' ? json.sub : null;
  } catch {
    return null;
  }
}

type View =
  | { kind: 'tree' }
  | { kind: 'play'; session: TreeSession }
  | { kind: 'result'; session: TreeSession; result: SubmitResult }
  | { kind: 'ranking'; scope: RankScope; field: string | null; qtype: QType; back: View }
  /** 先生用 生徒の進捗一覧（2026-10-17・先生用アカウントだけ）*/
  | { kind: 'staff' }
  /** チャンピオンアリーナ（設計書 §5.7）: 入口 → 出題 → 結果 */
  | { kind: 'arena' }
  | { kind: 'arenaPlay'; session: ArenaSession }
  | { kind: 'arenaResult'; session: ArenaSession; result: ArenaResult };

interface Props {
  mode: 'liff' | 'external';
  /** LIFF: ホームへ戻る */
  onClose?: () => void;
  /** 外部ブラウザ: ログアウト（認証切れでも呼ぶ）*/
  onLogout?: () => void;
}

export function TreeRoot({ mode, onClose, onLogout }: Props) {
  const [me, setMe] = useState<TreeMe | null>(null);
  /** 開ける科目（履修科目のうちツリーがあるもの。先生は全部）と、いま開いている科目（Phase 6）*/
  const [subjects, setSubjects] = useState<TreeSubject[]>([]);
  const [subject, setSubject] = useState<TreeSubject | null>(null);
  const [manifest, setManifest] = useState<TreeManifest | null>(null);
  const [progress, setProgress] = useState<TreeProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: 'tree' });
  const [selected, setSelected] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  /**
   * ステージ（ROUTE / ABYSS・設計書 §5.6）。ABYSS は ROUTE を全解放した生徒（先生は常に）だけ開ける。
   * abyssOpen は ROUTE の進捗の abyss.open（ABYSS を見ている間も保つ）
   */
  const [stage, setStage] = useState<TreeStage>('front');
  const [abyssOpen, setAbyssOpen] = useState(false);
  /** チャンピオンアリーナ（ROUTE の科目ごと）。古い Proxy・マイグレーション前は null（門を出さない）*/
  const [arena, setArena] = useState<ArenaInfo | null>(null);
  const [arenaMessage, setArenaMessage] = useState<string | null>(null);
  setTreeStage(stage);

  const loadArena = useCallback((s: string) => {
    fetchArena(s)
      .then(setArena)
      .catch(() => setArena(null));
  }, []);

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

  /**
   * 科目の manifest と進捗を読む。まだ問題が無い科目（NO_CONTENT）は一覧から外して次の科目へ。
   * 全部無ければ読み込みエラー。
   */
  const openSubject = useCallback(
    async (list: TreeSubject[], want: TreeSubject) => {
      const order = [want, ...list.filter((s) => s !== want)];
      const empty = new Set<TreeSubject>();
      for (const s of order) {
        try {
          const [mf, pg] = await Promise.all([fetchTreeManifest(s), fetchTreeProgress(s)]);
          setSubjects(list.filter((x) => !empty.has(x)));
          setSubject(s);
          setStage('front');
          setAbyssOpen(!!pg.abyss?.open);
          setManifest(mf);
          setProgress(pg);
          setArena(null);
          loadArena(s);
          return;
        } catch (e) {
          // 問題がまだ無い科目・名簿の科目が変わって開けなくなった科目は飛ばす
          if (!(e instanceof TreeApiError && (e.code === 'NO_CONTENT' || e.code === 'SUBJECT_NOT_ALLOWED'))) throw e;
          empty.add(s);
        }
      }
      throw new TreeApiError('NO_CONTENT', 404);
    },
    [loadArena]
  );

  const load = useCallback(() => {
    setError(null);
    fetchTreeMe()
      .then(async (m) => {
        setMe(m);
        const list = treeSubjectsFor(m.subjects, m.grade === '先生');
        const want = pickTreeSubject(list);
        if (!want) throw new TreeApiError('NO_CONTENT', 404); // 選択科目にツリーが無い（2026-10-16 先生決定: 他の科目は開けない）
        await openSubject(list, want);
      })
      .catch(fail);
  }, [fail, openSubject]);

  /** 科目チップから科目を切り替える（ツリーに戻し、選択を外す）*/
  const switchSubject = useCallback(
    (s: TreeSubject) => {
      if (s === subject) return;
      rememberTreeSubject(s);
      setManifest(null);
      setProgress(null);
      setArena(null);
      setSelected(null);
      setMessage(null);
      setView({ kind: 'tree' });
      openSubject(subjects, s).catch(fail);
    },
    [subject, subjects, openSubject, fail]
  );

  useEffect(load, [load]);

  /** ROUTE ⇄ ABYSS。ABYSS の問題がまだ無い科目（NO_CONTENT）は切り替えずに知らせる */
  const switchStage = useCallback(
    async (next: TreeStage) => {
      if (!subject || next === stage) return;
      setSelected(null);
      setMessage(null);
      try {
        const [mf, pg] = await Promise.all([fetchTreeManifest(subject, next), fetchTreeProgress(subject, next)]);
        setStage(next);
        setManifest(mf);
        setProgress(pg);
        if (pg.abyss) setAbyssOpen(pg.abyss.open);
      } catch (e) {
        if (e instanceof TreeApiError && e.code === 'NO_CONTENT') setMessage('この科目の ABYSS（二次問題）はまだ準備中です。');
        else fail(e);
      }
    },
    [subject, stage, fail]
  );

  const refreshProgress = useCallback(() => {
    // manifest が差し替わっていたら一緒に取り直す（版がずれると問題 ID が合わない）
    if (!subject) return;
    fetchTreeProgress(subject, stage)
      .then((pg) => {
        setProgress(pg);
        if (pg.abyss) setAbyssOpen(pg.abyss.open);
        if (manifest && pg.version !== manifest.version) fetchTreeManifest(subject, stage).then(setManifest).catch(() => {});
      })
      .catch(() => {});
    loadArena(subject);
  }, [manifest, subject, stage, loadArena]);

  /** アリーナの挑戦を始める（途中なら再開）。開始で今シーズンの 1 回を使う */
  const beginArena = async () => {
    if (!subject) return;
    setStarting(true);
    setArenaMessage(null);
    try {
      const s = await startArena(subject);
      setView({ kind: 'arenaPlay', session: s });
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') return onLogout?.();
      setArenaMessage(
        code === 'ARENA_LOCKED'
          ? 'まだ開放されていません。全分野のマスター度を 70% 以上にすると挑戦できます。'
          : code === 'ARENA_DONE'
            ? '今シーズンはもう挑戦しました。次のシーズンをお待ちください。'
            : code === 'NO_QUESTIONS'
              ? 'アリーナの問題を用意できませんでした。先生に知らせてください。'
              : '問題を読み込めませんでした。通信状況を確かめてもう一度お試しください。'
      );
      loadArena(subject);
    } finally {
      setStarting(false);
    }
  };

  const start = async (field: string, qtype: QType) => {
    setStarting(true);
    setMessage(null);
    try {
      if (!subject) return;
      const s = await startTreeSession(subject, field, qtype, stage);
      setView({ kind: 'play', session: s });
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') return onLogout?.();
      setMessage(
        code === 'LOCKED'
          ? 'この分野はまだ解放されていません。'
          : code === 'ABYSS_LOCKED'
            ? 'ABYSS は ROUTE の全分野を解放すると開きます。'
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

  /** ニックネームの保存。NG ワードだけは止めて知らせる（通信エラーは止めない。次の機会に保存し直せる）*/
  const saveNick = async (nick: string): Promise<string | null> => {
    if (!me) return null;
    const next = nick.trim() || 'プレイヤー';
    if (next === me.nickname) return null;
    try {
      const r = await saveTreeNickname(next);
      setMe((m) => (m ? { ...m, nickname: r.nickname } : m));
      return null;
    } catch (e) {
      if (e instanceof TreeApiError && e.code === 'NG_NICKNAME') {
        return 'このニックネームは使えません。別の名前にしてください。';
      }
      return null;
    }
  };

  const report = async (sessionId: string, qid: string): Promise<'sent' | 'already' | 'error'> => {
    try {
      const r = await reportTreeQuestion(sessionId, qid);
      return r.already ? 'already' : 'sent';
    } catch {
      return 'error';
    }
  };

  if (error) {
    const notRegistered = error === 'NOT_REGISTERED';
    const noTree = error === 'NO_CONTENT' || error === 'SUBJECT_NOT_ALLOWED';
    return (
      <div className={rootClass()}>
        <TreeSprite />
        <div className="tr-center">
          {notRegistered ? (
            <>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>このアプリは塾生専用です</div>
              <div>登録が反映されるまで最大 30 分かかります。しばらくしてから開きなおすか、先生に連絡してください。</div>
              {mode === 'liff' && ownLineId() && (
                <div style={{ fontSize: 11, color: alpha(T.text, 0.55), lineHeight: 1.7 }}>
                  問い合わせ用 ID（先生に伝えるとき）
                  <div className="tr-mono" style={{ fontSize: 12, color: T.text, userSelect: 'all', WebkitUserSelect: 'all', wordBreak: 'break-all' }}>
                    {ownLineId()}
                  </div>
                </div>
              )}
            </>
          ) : noTree ? (
            <>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>選択科目の ANCHOR TREE はまだありません</div>
              <div>
                {me && me.subjects.length
                  ? `あなたの選択科目（${me.subjects.map((s) => SUBJECT_JA[s as ScheduleSubject] ?? s).join('・')}）のツリーは準備中です。`
                  : '理科の選択科目が登録されていません。先生に確認してください。'}
                ANCHOR TREE は選択科目のツリーだけ開けます。
              </div>
            </>
          ) : (
            <>
              <div style={{ color: T.text, fontWeight: 700, fontSize: 16 }}>読み込めませんでした</div>
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
          {mode === 'external' && (notRegistered || noTree) && (
            <button type="button" className="tr-ghost" style={{ width: 240 }} onClick={onLogout}>
              別のIDでログイン
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!me || !manifest || !progress || !subject) {
    return (
      <div className={rootClass()}>
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
          subjects={subjects}
          onSubject={switchSubject}
          stage={stage}
          abyssOpen={abyssOpen}
          onStage={(st) => void switchStage(st)}
          selected={selected}
          onSelect={setSelected}
          onStart={start}
          starting={starting}
          onClose={mode === 'liff' ? onClose : undefined}
          onLogout={mode === 'external' ? onLogout : undefined}
          onShare={mode === 'liff' ? () => setSharing(true) : undefined}
          onRanking={(field) =>
            setView({ kind: 'ranking', scope: field ? 'field' : 'subject', field, qtype: 'tf', back: { kind: 'tree' } })
          }
          onStaff={me.grade === '先生' ? () => setView({ kind: 'staff' }) : undefined}
          arena={arena}
          onArena={() => {
            setArenaMessage(null);
            if (subject) loadArena(subject);
            setView({ kind: 'arena' });
          }}
          loginId={me.loginId}
          grade={me.grade}
          nickname={me.nickname}
          message={message}
          onDismissMessage={() => setMessage(null)}
        />
      )}
      {view.kind === 'play' && (
        <PlayScreen
          session={view.session}
          subjectName={manifest.name}
          fieldName={fieldOf(view.session.field)?.name ?? view.session.field}
          group={fieldOf(view.session.field)?.group ?? 'basic'}
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
          onSaveNick={saveNick}
          onReport={(qid) => report(view.session.sessionId, qid)}
          onRetry={() => {
            refreshProgress();
            void start(view.session.field, view.session.qtype);
          }}
          onBack={() => {
            refreshProgress();
            setView({ kind: 'tree' });
          }}
          onRanking={() => {
            refreshProgress();
            setView({ kind: 'ranking', scope: 'field', field: view.session.field, qtype: view.session.qtype, back: view });
          }}
        />
      )}
      {view.kind === 'ranking' && (
        <RankingScreen
          manifest={manifest}
          stage={stage}
          arena={!!arena}
          initial={{ scope: view.scope, field: view.field, qtype: view.qtype }}
          onBack={() => setView(view.back)}
        />
      )}
      {view.kind === 'staff' && <StaffScreen onBack={() => setView({ kind: 'tree' })} />}
      {view.kind === 'arena' && arena && (
        <ArenaScreen
          info={arena}
          manifest={manifest}
          starting={starting}
          message={arenaMessage}
          onStart={() => void beginArena()}
          onRanking={() => setView({ kind: 'ranking', scope: 'arena', field: null, qtype: 'tf', back: { kind: 'arena' } })}
          onBack={() => setView({ kind: 'tree' })}
        />
      )}
      {view.kind === 'arena' && !arena && (
        <div className={rootClass()}>
          <div className="tr-center">
            <div>チャンピオンアリーナを読み込めませんでした。</div>
            <button type="button" className="tr-ghost" style={{ width: 240 }} onClick={() => setView({ kind: 'tree' })}>
              ツリーへ戻る
            </button>
          </div>
        </div>
      )}
      {view.kind === 'arenaPlay' && (
        <PlayScreen
          session={view.session}
          subjectName={manifest.name}
          fieldName="CHAMPION ARENA"
          group="basic"
          onExit={() => {
            refreshProgress();
            setView({ kind: 'arena' });
          }}
          onDone={() => {}}
          onArenaDone={(result) => {
            if (subject) loadArena(subject);
            setView({ kind: 'arenaResult', session: view.session, result });
          }}
        />
      )}
      {view.kind === 'arenaResult' && (
        <ArenaResultScreen
          result={view.result}
          session={view.session}
          grade={me.grade}
          nickname={me.nickname}
          onSaveNick={saveNick}
          onReport={(qid) => report(view.session.sessionId, qid)}
          onBack={() => {
            refreshProgress();
            setView({ kind: 'tree' });
          }}
          onRanking={() => setView({ kind: 'ranking', scope: 'arena', field: null, qtype: 'tf', back: { kind: 'tree' } })}
        />
      )}
      {sharing && <TreeShareModal loginId={me.loginId} onClose={() => setSharing(false)} />}
    </>
  );
}
