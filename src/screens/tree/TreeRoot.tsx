/**
 * ANCHOR TREE のルート。me / manifest / progress を読み、ツリー → 出題 → 結果 → ランキング を切り替える。
 * LIFF 内（ホームから開く）と外部ブラウザ（/tree）の両方でこれを使う。
 * LIFF 内は「…」から ID / URL のモーダル（別のブラウザで使う）を開ける。
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ArenaInfo,
  ArenaResult,
  ArenaSession,
  TreeTicket,
  QType,
  SubmitResult,
  TreeManifest,
  TreeMe,
  TreeProgress,
  TreeSession,
  TreeStage,
  TrophyItem,
} from '../../lib/treeApi';
import {
  ARENA_SUBJECTS,
  TreeApiError,
  fetchArena,
  fetchTreeTickets,
  fetchTreeEvents,
  markTreeEventsSeen,
  fetchTreeManifest,
  fetchTreeMe,
  fetchTreeProgress,
  fetchTrophyPending,
  markTrophiesSeen,
  reportTreeQuestion,
  saveTreeNickname,
  startArena,
  startTreeSession,
} from '../../lib/treeApi';
import { ArenaScreen } from './ArenaScreen';
import { useNoSwipeMinimize } from './useNoSwipeMinimize';
import { ArenaResultScreen } from './ArenaResultScreen';
import { ArenaTicketScreen } from './ArenaTicketScreen';
import { FxScreen } from './fx/FxScreen';
import { mergeTreeEvents, type MergedTreeEvent } from './fx/mergeEvents';
import { preloadFxImages } from './fx/fxKit';
import { FxLabScreen } from './fx/FxLabScreen';
import { RankingScreen, type RankScope } from './RankingScreen';
import { TreeShareModal } from './TreeShareModal';
import { TreeSprite } from './TreeIcons';
import { T, alpha, rootClass, setTreeStage } from './treeTheme';
import { getLiffStatus } from '../../lib/liff';
import { TREE_SUBJECT_NAME, type TreeSubject, pickTreeSubject, rememberTreeSubject, treeSubjectsFor } from '../../lib/treeSubject';
import { TreeScreen } from './TreeScreen';
import { PlayScreen } from './PlayScreen';
import { ResultScreen } from './ResultScreen';
import { StaffScreen } from './StaffScreen';
import { SUBJECT_JA, type ScheduleSubject } from '../../lib/types';
import { TrophyScreen } from './trophy/TrophyScreen';
import { TrophyDetailSheet, fieldInfoFrom } from './trophy/TrophyDetailSheet';
import { TrophySprite, GRADE_COLOR } from './trophy/TrophyIcon';
import { useToasts } from './trophy/useToasts';
import { newsToast, noticeToast, submitToasts, trophyToast } from './trophy/toastItems';
import { dropTrophyMemo, loadTrophies } from './trophy/trophyData';
import type { ToastItem } from './trophy/toastQueue';
import '../../styles/tree.css';
import '../../styles/tree-trophy.css';

/** 科目キー → 表示名（トロフィーの通知は今開いていない科目のこともある）*/
const subjectJa = (s: string) => TREE_SUBJECT_NAME[s as TreeSubject] ?? SUBJECT_JA[s as ScheduleSubject] ?? s;

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
  | { kind: 'arenaResult'; session: ArenaSession; result: ArenaResult }
  /** ボーナスチケット（本人のぶん。2026-10-17）*/
  | { kind: 'tickets'; back: View }
  /** 先生用: 演出の確認（2026-10-17 夕方）*/
  | { kind: 'fxlab' }
  /** トロフィー一覧（2026-10-19）*/
  | { kind: 'trophies'; back: View };

/**
 * 演出を止めるフラグ（LIFF WebView でアニメーションが固まったとき用）。
 * URL に ?fx=0 を付けて開く or localStorage['gvTree.fx']='0' で演出を出さない（既読にもしない）
 */
function fxDisabled(): boolean {
  try {
    const q = new URLSearchParams(window.location.search).get('fx');
    if (q === '0') localStorage.setItem('gvTree.fx', '0');
    if (q === '1') localStorage.removeItem('gvTree.fx');
    return localStorage.getItem('gvTree.fx') === '0';
  } catch {
    return false;
  }
}

/**
 * 先生用のテストのチケット（ABYSS・総合優勝の通常・プレミアム）。先生アカウントには本物が配られないので、
 * 半券を切る操作だけ試せる見本を出す（サーバには記録しない。2026-10-17 先生の依頼）
 */
function demoTickets(me: TreeMe, arena: ArenaInfo | null, subject: string): TreeTicket[] {
  const now = Date.now();
  const pair = arena?.pair ?? (arena ? [arena.season, arena.season] : [{ n: 1, key: '', start: now, end: now }, { n: 2, key: '', start: now, end: now }]);
  const base = { subject, grade: me.grade, nickname: me.nickname, score: null, usedAt: null, sig: '' };
  return [
    { ...base, kind: 'abyss', id: 'demo-abyss', pair: null, premium: false },
    { ...base, kind: 'grand', id: 'demo-normal', pair, premium: false },
    { ...base, kind: 'grand', id: 'demo-premium', pair, premium: true },
  ];
}

/** ABYSS をどれか 1 科目でも解放した端末は、以後ログイン画面を深海版にする（解除しない。2026-10-17 先生決定）*/
function rememberAbyssStyle() {
  try {
    localStorage.setItem('gvTree.abyssStyle', '1');
  } catch {
    /* ストレージが使えない端末は ROUTE 版のまま */
  }
}

interface Props {
  mode: 'liff' | 'external';
  /** LIFF: ホームへ戻る */
  onClose?: () => void;
  /** 外部ブラウザ: ログアウト（認証切れでも呼ぶ）*/
  onLogout?: () => void;
}

export function TreeRoot({ mode, onClose, onLogout }: Props) {
  useNoSwipeMinimize();
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
  /** チャンピオンアリーナ（ROUTE の科目ごと）。古い Proxy・マイグレーション前は null（ノードを出さない）*/
  const [arena, setArena] = useState<ArenaInfo | null>(null);
  const [arenaMessage, setArenaMessage] = useState<string | null>(null);
  /** 本人のチケット（ABYSS・総合優勝。古い Proxy・0006 前は空）*/
  const [tickets, setTickets] = useState<TreeTicket[]>([]);
  /** まだ見ていない演出（順に 1 つずつ全画面で出す）*/
  const [events, setEvents] = useState<MergedTreeEvent[]>([]);
  setTreeStage(stage);

  /* ── トロフィー・通知（2026-10-19・実装手順_トロフィー §6）──
   * キューは 1 つ。出題中（play / arenaPlay）と演出中（events）は出さず、終わったら続きを出す。
   * 表示を始めたら既読（/tree/trophies/seen）。この画面で通知したトロフィーはヘッダーのボタンに点（一覧を開くまで）*/
  const [trophyDot, setTrophyDot] = useState<string | null>(null);
  /** Proxy がトロフィーに対応しているか（pending が返ったら true。古い Proxy ではトロフィーのボタンを出さない）*/
  const [trophyReady, setTrophyReady] = useState(false);
  const [toastDetail, setToastDetail] = useState<{ subject: string; item: TrophyItem } | null>(null);
  /** トロフィー一覧の分野チップ用（今の科目以外の manifest）*/
  const [otherManifests, setOtherManifests] = useState<Record<string, TreeManifest>>({});
  // 読み込み中（manifest / progress が無い間）は通知の層を描かないので止める（2026-10-19 レビューで修正）
  const toastPaused = view.kind === 'play' || view.kind === 'arenaPlay' || !!events[0] || !manifest || !progress;
  const onToastShown = useCallback((items: ToastItem[]) => {
    const trophies = items.filter((t) => t.trophy).map((t) => t.trophy!);
    const keys = items.filter((t) => t.noticeKey).map((t) => t.noticeKey!);
    // 一度に送るのは 50 件ずつ（公開前の到達者は何十件もまとめて届く。Proxy は 1 回 100 件まで）
    for (let i = 0; i < Math.max(trophies.length, keys.length); i += 50) {
      markTrophiesSeen(trophies.slice(i, i + 50), keys.slice(i, i + 50)).catch(() => {});
    }
    const best = items.find((t) => t.trophy && t.grade);
    if (best?.grade) {
      setTrophyDot(GRADE_COLOR[best.grade].c);
      dropTrophyMemo();
    }
  }, []);
  const onToastOpen = useCallback((t: { subject: string; id: string }) => {
    loadTrophies(t.subject, true)
      .then((list) => {
        const item = list.items.find((x) => x.id === t.id);
        if (item) setToastDetail({ subject: t.subject, item });
      })
      .catch(() => {});
  }, []);
  const toasts = useToasts({ paused: toastPaused, onShown: onToastShown, onOpenTrophy: onToastOpen });
  const pushToasts = toasts.push;
  /** 未通知の獲得とお知らせ（ツリーを開いた・科目を切り替えたとき）。古い Proxy は空 */
  const loadPending = useCallback(() => {
    fetchTrophyPending()
      .then((p) => {
        setTrophyReady(p.available);
        pushToasts([
          ...p.trophies.map((t) => trophyToast(t, subjectJa(t.subject))),
          ...p.notices.map((n) => noticeToast(n, subjectJa(n.subject))).filter((x): x is ToastItem => !!x),
        ]);
      })
      .catch(() => {});
  }, [pushToasts]);

  // アリーナは化学・生物だけ（2026-10-17 先生決定）。他の科目では取りに行かずノードも出さない。
  // 科目をすぐ切り替えたとき、遅れて返った前の科目のアリーナで上書きしない（最後に頼んだ科目だけ反映）
  const arenaFor = useRef<string | null>(null);
  const loadArena = useCallback((s: string) => {
    arenaFor.current = s;
    if (!ARENA_SUBJECTS.includes(s)) {
      setArena(null);
      return;
    }
    fetchArena(s)
      .then((a) => {
        if (arenaFor.current === s) setArena(a);
      })
      .catch(() => {
        if (arenaFor.current === s) setArena(null);
      });
  }, []);

  const loadTickets = useCallback(() => {
    fetchTreeTickets()
      .then(setTickets)
      .catch(() => setTickets([]));
  }, []);

  useEffect(() => {
    if (abyssOpen) rememberAbyssStyle();
  }, [abyssOpen]);

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
          const news = newsToast(mf, pg, subjectJa(s));
          if (news) pushToasts([news]);
          return;
        } catch (e) {
          // 問題がまだ無い科目・名簿の科目が変わって開けなくなった科目は飛ばす
          if (!(e instanceof TreeApiError && (e.code === 'NO_CONTENT' || e.code === 'SUBJECT_NOT_ALLOWED'))) throw e;
          empty.add(s);
        }
      }
      throw new TreeApiError('NO_CONTENT', 404);
    },
    [loadArena, pushToasts]
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
        loadTickets();
        // 演出（ABYSS 解放・アリーナ解放・優勝・新シーズン）は開いたときに 1 回だけ取る。
        // 通知（pending）は演出が決まってから取る（先に通知が出て、演出が始まった瞬間に消えるのを防ぐ・2026-10-19 レビューで修正）
        if (!fxDisabled()) {
          fetchTreeEvents()
            .then((r) => {
              const list = r.events ?? [];
              if (list.length) void preloadFxImages(); // 演出の画像を先にデコード（カクつき対策）
              setEvents(mergeTreeEvents(list)); // 同じシーズンの新シーズン開始（化学・生物）は 1 回にまとめる
              if (list.some((e) => e.type === 'unlock_abyss')) rememberAbyssStyle();
            })
            .catch(() => {})
            .finally(loadPending);
        } else {
          loadPending();
        }
      })
      .catch(fail);
  }, [fail, openSubject, loadTickets, loadPending]);


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
      openSubject(subjects, s)
        .then(loadPending)
        .catch(fail);
    },
    [subject, subjects, openSubject, fail, loadPending]
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

  /** 演出を閉じた → 既読にして次へ。ボタンに応じてツリー（ABYSS 解放は深海へ）/ アリーナ / チケットへ */
  const closeFx = useCallback(
    (ev: MergedTreeEvent, action: 'tree' | 'arena' | 'ticket') => {
      markTreeEventsSeen(ev.seenKeys).catch(() => {});
      setEvents((list) => list.filter((e) => e.key !== ev.key));
      if (action === 'tree') {
        setView({ kind: 'tree' });
        if (ev.type === 'unlock_abyss' && ev.subject === subject) void switchStage('back');
      } else if (action === 'ticket') {
        loadTickets();
        setView({ kind: 'tickets', back: { kind: 'tree' } });
      } else if (action === 'arena' && ev.subjects.some((s) => ARENA_SUBJECTS.includes(s))) {
        // まとめた新シーズン開始は、いま開いている科目がその中にあればその科目のアリーナへ
        const to = subject && ev.subjects.includes(subject) ? subject : ev.subject;
        if (to !== subject && subjects.includes(to as TreeSubject)) {
          rememberTreeSubject(to as TreeSubject);
          setManifest(null);
          setProgress(null);
          setArena(null);
          setSelected(null);
          openSubject(subjects, to as TreeSubject)
            .then(() => setView({ kind: 'arena' }))
            .catch(fail);
        } else {
          if (subject) loadArena(subject);
          setView({ kind: 'arena' });
        }
      }
    },
    [subject, subjects, openSubject, switchStage, loadArena, loadTickets, fail]
  );

  const refreshProgress = useCallback(() => {
    // manifest が差し替わっていたら一緒に取り直す（版がずれると問題 ID が合わない）
    if (!subject) return;
    fetchTreeProgress(subject, stage)
      .then((pg) => {
        setProgress(pg);
        if (pg.abyss) {
          // 挑戦の結果で ABYSS が開いた（60% に届いてチケットが出た）ら、ヘッダーのチケット枚数も取り直す
          if (pg.abyss.open && !abyssOpen) loadTickets();
          setAbyssOpen(pg.abyss.open);
        }
        if (manifest && pg.version !== manifest.version) fetchTreeManifest(subject, stage).then(setManifest).catch(() => {});
      })
      .catch(() => {});
    loadArena(subject);
  }, [manifest, subject, stage, loadArena, loadTickets, abyssOpen]);

  /** アリーナの挑戦を始める（途中なら再開）。開始で今シーズンの 1 回を使う */
  const beginArena = async () => {
    if (!subject) return;
    setStarting(true);
    setArenaMessage(null);
    try {
      const s = await startArena(subject, arena && arena.subject === subject ? arena.season.key : undefined);
      setView({ kind: 'arenaPlay', session: s });
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') return onLogout?.();
      setArenaMessage(
        code === 'SEASON_CHANGED'
          ? 'シーズンが切り替わりました。最新の状態に更新したので、もう一度確かめてください。'
          : code === 'ARENA_LOCKED'
          ? 'まだ開放されていません。全分野の今年度の正答率を 70% 以上にすると挑戦できます。'
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
            ? 'ABYSS は全分野のマスター度を 60% 以上にすると開きます。'
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

  /** ニックネームの保存。NG ワードと他の人のカニの名前だけは止めて知らせる（通信エラーは止めない。次の機会に保存し直せる）*/
  const saveNick = async (nick: string): Promise<string | null> => {
    if (!me) return null;
    const next = nick.trim() || me.crab || 'プレイヤー';
    if (next === me.nickname) return null;
    try {
      const r = await saveTreeNickname(next);
      setMe((m) => (m ? { ...m, nickname: r.nickname } : m));
      return null;
    } catch (e) {
      if (e instanceof TreeApiError && e.code === 'NG_NICKNAME') {
        return 'このニックネームは使えません。別の名前にしてください。';
      }
      if (e instanceof TreeApiError && e.code === 'NICKNAME_TAKEN') {
        return 'この名前は他の人が使っています。別の名前にしてください。';
      }
      return null;
    }
  };

  const report = async (sessionId: string, qid: string, message: string, label: string, img: string | null): Promise<'sent' | 'already' | 'error'> => {
    try {
      const r = await reportTreeQuestion({ sessionId, qid, message, label, img });
      return r.already ? 'already' : 'sent';
    } catch {
      return 'error';
    }
  };

  /** トロフィー一覧・詳細を開いたら、分野チップ用に各科目の ROUTE の manifest を読んでおく */
  const wantManifests = view.kind === 'trophies' || !!toastDetail;
  useEffect(() => {
    if (!wantManifests) return;
    for (const s of subjects) {
      if (otherManifests[s] || (s === subject && stage === 'front')) continue;
      fetchTreeManifest(s)
        .then((mf) => setOtherManifests((m) => ({ ...m, [s]: mf })))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantManifests, subjects, subject, stage]);

  /** トロフィーの「ツリーで見る」: その科目の ROUTE のツリーへ戻り、分野を選ぶ */
  const showTreeField = (s: TreeSubject, field: string | null) => {
    setToastDetail(null);
    setMessage(null);
    if (s !== subject) {
      rememberTreeSubject(s);
      setManifest(null);
      setProgress(null);
      setArena(null);
      setSelected(null);
      setView({ kind: 'tree' });
      openSubject(subjects, s)
        .then(() => setSelected(field))
        .catch(fail);
      return;
    }
    setView({ kind: 'tree' });
    if (stage !== 'front') void switchStage('front').then(() => setSelected(field));
    else setSelected(field);
  };

  /** 分野チップの名前・系統（今の科目は進捗も見て★）*/
  const trophyFieldInfo = (s: string, id: string) => {
    const here = s === subject && stage === 'front';
    return fieldInfoFrom(here ? manifest : otherManifests[s] ?? null, here ? progress : null)(id);
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
      <TrophySprite />
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
          onFxLab={me.grade === '先生' ? () => setView({ kind: 'fxlab' }) : undefined}
          tickets={tickets.filter((t) => !t.usedAt).length}
          onTickets={() => setView({ kind: 'tickets', back: { kind: 'tree' } })}
          onTrophies={!trophyReady ? undefined : () => {
            setTrophyDot(null);
            setView({ kind: 'trophies', back: { kind: 'tree' } });
          }}
          trophyDot={trophyDot}
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
          onDone={(result) => {
            // トロフィー・分野の解放・マスター・順位アップは結果画面に入ってから出す
            pushToasts(submitToasts(result, manifest, manifest.name, stage));
            setView({ kind: 'result', session: view.session, result });
          }}
        />
      )}
      {view.kind === 'result' && (
        <ResultScreen
          result={view.result}
          session={view.session}
          manifest={manifest}
          grade={me.grade}
          nickname={me.nickname}
          crab={me.crab ?? null}
          busy={starting}
          onSaveNick={saveNick}
          onReport={(qid, message, label, img) => report(view.session.sessionId, qid, message, label, img)}
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
      {view.kind === 'fxlab' && (
        <FxLabScreen grade={me.grade} nickname={me.nickname} subject={subject} subjectName={manifest.name} season={arena?.season ?? null} onTickets={() => setView({ kind: 'tickets', back: { kind: 'fxlab' } })} onToasts={pushToasts} onBack={() => setView({ kind: 'tree' })} />
      )}
      {view.kind === 'arena' && arena && (
        <ArenaScreen
          info={arena}
          manifest={manifest}
          starting={starting}
          message={arenaMessage}
          tickets={me.grade === '先生' ? Math.max(1, tickets.length) : tickets.filter((t) => t.kind === 'grand').length}
          ticketLabel={me.grade === '先生' && !tickets.length ? 'チケット（テスト）' : undefined}
          onTickets={() => setView({ kind: 'tickets', back: { kind: 'arena' } })}
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
            pushToasts((result.trophies ?? []).map((t) => trophyToast(t, subjectJa(t.subject))));
            if (subject) loadArena(subject);
            setView({ kind: 'arenaResult', session: view.session, result });
          }}
        />
      )}
      {view.kind === 'arenaResult' && (
        <ArenaResultScreen
          result={view.result}
          session={view.session}
          staff={me.grade === '先生'}
          grade={me.grade}
          nickname={me.nickname}
          crab={me.crab ?? null}
          onSaveNick={saveNick}
          onBack={() => {
            refreshProgress();
            setView({ kind: 'tree' });
          }}
          onRanking={() => setView({ kind: 'ranking', scope: 'arena', field: null, qtype: 'tf', back: { kind: 'tree' } })}
          onReport={(qid, message, label, img) => report(view.session.sessionId, qid, message, label, img)}
        />
      )}
      {view.kind === 'tickets' && (
        <ArenaTicketScreen
          tickets={me.grade === '先生' && !tickets.length ? demoTickets(me, arena, subject) : tickets}
          demo={me.grade === '先生' && !tickets.length}
          subjectName={(s) => SUBJECT_JA[s as ScheduleSubject] ?? s}
          onUsed={(id, usedAt) => setTickets((list) => list.map((t) => (t.id === id ? { ...t, usedAt } : t)))}
          onBack={() => setView(view.back)}
        />
      )}
      {view.kind === 'trophies' && (
        <TrophyScreen
          subject={subject}
          subjects={subjects}
          fieldInfo={trophyFieldInfo}
          onBack={() => setView(view.back)}
          onShowTree={showTreeField}
        />
      )}
      {toastDetail && (
        <TrophyDetailSheet
          item={toastDetail.item}
          fieldInfo={(id) => trophyFieldInfo(toastDetail.subject, id)}
          onClose={() => setToastDetail(null)}
          onShowTree={(field) => showTreeField(toastDetail.subject as TreeSubject, field)}
        />
      )}
      {toasts.layer}
      {sharing && <TreeShareModal loginId={me.loginId} staff={me.grade === '先生'} onClose={() => setSharing(false)} />}
      {events[0] && (
        <FxScreen
          key={events[0].key}
          event={events[0]}
          subjectName={SUBJECT_JA[events[0].subject as ScheduleSubject] ?? events[0].subject}
          onClose={(action) => closeFx(events[0]!, action)}
        />
      )}
    </>
  );
}
