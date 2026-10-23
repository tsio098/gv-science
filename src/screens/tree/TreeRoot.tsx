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
  SeasonEventState,
  SeasonEventTestResult,
  SeasonEventTestSession,
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
  fetchSeasonEvent,
  seasonEventNowParam,
  clearSeasonEventNow,
  startSeasonEventSession,
  startSeasonEventTest,
} from '../../lib/treeApi';
import { EventScreen } from './event/EventScreen';
import { EventTestResult } from './event/EventTestResult';
import { EventStaffScreen } from './event/EventStaffScreen';
import { DressUpScreen } from './event/DressUpScreen';
import { rememberIconSkin } from './event/evTheme';
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
import { usableTicketCount } from '../../lib/treeTickets';
import { TreeScreen } from './TreeScreen';
import { PlayScreen } from './PlayScreen';
import { ResultScreen } from './ResultScreen';
import { StaffScreen } from './StaffScreen';
import { StaffQuestionsScreen } from './StaffQuestionsScreen';
import { SUBJECT_JA, type ScheduleSubject } from '../../lib/types';
import { TrophyScreen } from './trophy/TrophyScreen';
import { TrophyDetailSheet, fieldInfoFrom } from './trophy/TrophyDetailSheet';
import { TrophySprite, GRADE_COLOR } from './trophy/TrophyIcon';
import { useToasts } from './trophy/useToasts';
import { eventTicketToast, level30Toast, level50Toast, newsToast, noticeToast, submitToasts, trophyToast } from './trophy/toastItems';
import { dropTrophyMemo, loadTrophies } from './trophy/trophyData';
import type { ToastItem } from './trophy/toastQueue';
import '../../styles/tree.css';
import '../../styles/tree-trophy.css';

/** 科目キー → 表示名（トロフィーの通知は今開いていない科目のこともある）*/
const subjectJa = (s: string) => TREE_SUBJECT_NAME[s as TreeSubject] ?? SUBJECT_JA[s as ScheduleSubject] ?? s;
/** 季節イベントの挑戦（field = '_event'）か */
const isEventSession = (s: TreeSession) => s.field === '_event' || !!(s as { event?: unknown }).event;
/** 通知（pending）を取り直す最短の間隔（ツリー・結果画面に移ったとき。D1 の読み取りを増やしすぎない）*/
const PENDING_GAP_MS = 30_000;
/** 問題を解いている画面（ここにいる間は通知を取りに行かない）*/
const isSolvingView = (k: string) => k === 'play' || k === 'arenaPlay' || k === 'eventTest';
/**
 * 移ったときに通知を取りに行く画面（2026-10-23 先生決定・D1 読み取り削減）: ツリーと結果画面（ROUTE/ABYSS・季節イベントのテスト）だけ。
 * アリーナの結果・ランキング・トロフィーなどに移ったとき・LINE から戻ったときは取らない
 */
const isPendingView = (k: string) => k === 'tree' || k === 'result' || k === 'eventTestResult';

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
  | { kind: 'result'; session: TreeSession; result: SubmitResult; marked: string[] }
  | { kind: 'ranking'; scope: RankScope; field: string | null; qtype: QType; back: View }
  /** 先生用 生徒の進捗一覧（2026-10-17・先生用アカウントだけ）*/
  | { kind: 'staff' }
  /** 先生用 問題の確認（2026-10-20）*/
  | { kind: 'staffQuestions' }
  /** チャンピオンアリーナ（設計書 §5.7）: 入口 → 出題 → 結果 */
  | { kind: 'arena' }
  | { kind: 'arenaPlay'; session: ArenaSession }
  | { kind: 'arenaResult'; session: ArenaSession; result: ArenaResult }
  /** ボーナスチケット（本人のぶん。2026-10-17）*/
  | { kind: 'tickets'; back: View }
  /** 先生用: 演出の確認（2026-10-17 夕方）*/
  | { kind: 'fxlab' }
  /** トロフィー一覧（2026-10-19）*/
  | { kind: 'trophies'; back: View }
  /** 季節イベント（2026-10-20）: イベント画面 → 挑戦（play）→ 結果（result）／テスト（eventTest）→ テストの結果 */
  | { kind: 'event' }
  | { kind: 'eventTest'; session: SeasonEventTestSession }
  | { kind: 'eventTestResult'; result: SeasonEventTestResult }
  /** 先生用 季節イベントの生徒の状況（2026-10-21・イベント画面と「…」メニューから）*/
  | { kind: 'eventStaff'; back: View }
  /** 錨のアイコンの着せ替え（「…」メニュー・イベント画面・テストの結果から）*/
  | { kind: 'dressUp'; back: View };

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
    // LV.50 チケット（2026-10-22。LV.30 は配った分だけ残る → 見本は LV.50 だけ）
    { ...base, kind: 'level50', id: 'demo-level50', pair: null, premium: false },
    // 季節イベントのチケット（見本は使える日の制限なし）
    {
      ...base, kind: 'event', id: 'demo-event', pair: null, premium: false, eventId: 'halloween-2026', eventKind: 'halloween', eventName: 'HALLOWEEN CHALLENGE',
      testRate: 0.85, usableFrom: Date.parse('2026-10-31T00:00:00+09:00'), usableUntil: Date.parse('2026-11-01T00:00:00+09:00'),
    },
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
  /** 季節イベント（いま開いている科目・2026-10-20）。古い Proxy・イベントの無い時期は event: null */
  const [seasonEvent, setSeasonEvent] = useState<SeasonEventState | null>(null);
  /** 季節イベントを読み込み中（その間は「開催されていません」を出さない・2026-10-21 検証で修正）*/
  const [seasonEventLoading, setSeasonEventLoading] = useState(false);
  /** 季節イベントの最後の読み込みが失敗した（「開催されていません」と言わずに、読み直しのボタンを出す）*/
  const [seasonEventFailed, setSeasonEventFailed] = useState(false);
  const [eventMessage, setEventMessage] = useState<string | null>(null);
  /** 先生の確認用の日付（?evnow）。ツリーの下に札を出して × で消す（2026-10-21: 外しても残ったため）*/
  const [evNowTag, setEvNowTag] = useState<string | null>(() => seasonEventNowParam());
  setTreeStage(stage);
  /** 通知のコールバック（先に作る）から呼ぶ loadTickets */
  const loadTicketsRef = useRef<() => void>(() => {});

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
  const playing = view.kind === 'play' || view.kind === 'arenaPlay' || view.kind === 'eventTest';
  const toastPaused = playing || !!events[0] || !manifest || !progress;
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
    // LV.30 / LV.50 チケット・イベントのチケットが出た → ヘッダーのチケットの枚数を取り直す（一覧の「LV.50 チケットを見る」も）
    if (items.some((t) => t.kind === 'level30' || t.kind === 'level50' || t.kind === 'evTicket')) {
      dropTrophyMemo();
      loadTicketsRef.current();
    }
  }, []);
  /** LEVEL 30 / LEVEL 50 の通知をタップ → チケット画面（今の画面に戻る）*/
  const viewRef = useRef<View>({ kind: 'tree' });
  const onToastTickets = useCallback(() => {
    loadTicketsRef.current();
    const back = viewRef.current;
    setView({ kind: 'tickets', back: back.kind === 'tickets' ? { kind: 'tree' } : back });
  }, []);
  const onToastOpen = useCallback((t: { subject: string; id: string }) => {
    loadTrophies(t.subject, true)
      .then((list) => {
        const item = list.items.find((x) => x.id === t.id);
        if (item) setToastDetail({ subject: t.subject, item });
      })
      .catch(() => {});
  }, []);
  /** EVENT CLEAR!! の通知をタップ → その科目のイベント画面（科目が違えば切り替えてから）*/
  const openEventRef = useRef<(subject: string) => void>(() => {});
  const onToastEvent = useCallback((s: string) => openEventRef.current(s), []);
  const toasts = useToasts({ paused: toastPaused, onShown: onToastShown, onOpenTrophy: onToastOpen, onOpenTickets: onToastTickets, onOpenEvent: onToastEvent });
  const pushToasts = toasts.push;
  /**
   * 未通知の獲得とお知らせ（ツリーを開いた・科目を切り替えたとき）。古い Proxy は空。
   * 走っている間は 2 本目を始めず、終わってから 1 回だけやり直す（2026-10-22 修正: 開いた直後の取得と科目の切替の取得が同時に 2 本走っていた）
   */
  const pendingRun = useRef({ busy: false, again: false });
  /** 最後に pending を取りに行った時刻（0 = まだ開いていない）*/
  const pendingAt = useRef(0);
  const loadPending = useCallback(() => {
    const st = pendingRun.current;
    if (st.busy) {
      st.again = true;
      return;
    }
    st.busy = true;
    const run = () => {
      // 問題を解いている画面に入っていたら取らない（2 本目のやり直しが出題中に走らないように。解き終わって画面が変わったときに取る）
      if (isSolvingView(viewRef.current.kind)) {
        st.busy = false;
        st.again = false;
        return;
      }
      pendingAt.current = Date.now();
      fetchTrophyPending()
        .then((p) => {
          setTrophyReady(p.available);
          pushToasts([
            ...p.trophies.map((t) => trophyToast(t, subjectJa(t.subject))),
            ...p.notices.map((n) => noticeToast(n, subjectJa(n.subject))).filter((x): x is ToastItem => !!x),
          ]);
        })
        .catch(() => {})
        .finally(() => {
          if (st.again) {
            st.again = false;
            run();
          } else st.busy = false;
        });
    };
    run();
  }, [pushToasts]);
  /**
   * ツリー・結果画面（isPendingView）に移ったときも取り直す（30 秒に 1 回まで）。問題を解いている画面にいる間は取らない（先生の指示）。
   * 解き終わって結果画面に移ったときは 30 秒以内でも必ず取る。
   * 2026-10-23 修正（先生の依頼）: 開いたとき・科目の切替だけだったので、続けて解いている間に抜かれても RANK DOWN（ほかの人のファースト・アリーナの通知も）が次に開き直すまで届かなかった
   * → 同日 D1 読み取り削減（先生決定）: 画面の切替ごと・LINE から戻ったときに取るのをやめ、ツリーと結果画面に移ったときだけにした
   */
  const viewKind = view.kind;
  const prevViewKind = useRef(viewKind);
  useEffect(() => {
    const from = prevViewKind.current;
    prevViewKind.current = viewKind;
    if (viewKind === from || !isPendingView(viewKind) || !pendingAt.current) return;
    if (isSolvingView(from) || Date.now() - pendingAt.current >= PENDING_GAP_MS) loadPending();
  }, [viewKind, loadPending]);

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
        // 読めなかったときは同じ科目の前の状態を残す（2026-10-22 修正: 一時的な通信失敗で null にして、ツリーからアリーナのノードが消えていた。季節イベントと同じ方針）
        if (arenaFor.current === s) setArena((a) => (a && a.subject === s ? a : null));
      });
  }, []);

  // 季節イベント（科目ごと）。遅れて返った前の科目の分で上書きしない
  // 読めなかったときは前の状態を残す（一時的な通信失敗でイベントが消えて「開催されていません」にならない・2026-10-22 デバッグで修正）
  const seasonEventFor = useRef<string | null>(null);
  const loadSeasonEvent = useCallback((s: string) => {
    seasonEventFor.current = s;
    setSeasonEventLoading(true);
    fetchSeasonEvent(s)
      .then((st) => {
        if (seasonEventFor.current !== s) return;
        setSeasonEvent(st.event ? st : null);
        setSeasonEventFailed(false);
      })
      .catch(() => {
        if (seasonEventFor.current === s) setSeasonEventFailed(true);
      })
      .finally(() => {
        if (seasonEventFor.current === s) setSeasonEventLoading(false);
      });
  }, []);

  const loadTickets = useCallback(() => {
    fetchTreeTickets()
      .then(setTickets)
      .catch(() => setTickets([]));
  }, []);
  loadTicketsRef.current = loadTickets;

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
   * ツリーに出す manifest・進捗の要求の番号（科目を開く openSubject・ROUTE⇄ABYSS の switchStage で共有）。
   * 反映の直前に最新の要求か確かめ、古ければ捨てる（2026-10-22 修正: ABYSS を押して待つ間に科目を変えると、
   * 後から返った前の科目の ABYSS で manifest・進捗・ステージが上書きされていた。refreshProgress の shownKey と同じ考え方）
   */
  const treeSeq = useRef(0);

  /**
   * 科目の manifest と進捗を読む。まだ問題が無い科目（NO_CONTENT）は一覧から外して次の科目へ。
   * 全部無ければ読み込みエラー。反映したら true、後から別の要求が来て捨てたら false（呼び出し側はその後の画面移動をしない）
   */
  const openSubject = useCallback(
    async (list: TreeSubject[], want: TreeSubject): Promise<boolean> => {
      const my = ++treeSeq.current;
      const stale = () => my !== treeSeq.current;
      const order = [want, ...list.filter((s) => s !== want)];
      const empty = new Set<TreeSubject>();
      for (const s of order) {
        try {
          const [mf, pg] = await Promise.all([fetchTreeManifest(s), fetchTreeProgress(s)]);
          if (stale()) return false;
          setSubjects(list.filter((x) => !empty.has(x)));
          setSubject(s);
          setStage('front');
          setAbyssOpen(!!pg.abyss?.open);
          setManifest(mf);
          setProgress(pg);
          setArena(null);
          loadArena(s);
          setSeasonEvent(null);
          loadSeasonEvent(s);
          const news = newsToast(mf, pg, subjectJa(s));
          if (news) pushToasts([news]);
          return true;
        } catch (e) {
          // 後から別の要求が来ていたら、この失敗は知らせない（今の要求の方が画面を決める）
          if (stale()) return false;
          // 問題がまだ無い科目・名簿の科目が変わって開けなくなった科目は飛ばす
          if (!(e instanceof TreeApiError && (e.code === 'NO_CONTENT' || e.code === 'SUBJECT_NOT_ALLOWED'))) throw e;
          empty.add(s);
        }
      }
      if (stale()) return false;
      throw new TreeApiError('NO_CONTENT', 404);
    },
    [loadArena, loadSeasonEvent, pushToasts]
  );

  const load = useCallback(() => {
    setError(null);
    fetchTreeMe()
      .then(async (m) => {
        setMe(m);
        // 着せ替えの錨を端末にも覚える（ログイン画面・GV Science のホームのタイルは誰か分かる前に描くので）
        if (m.iconSkin !== undefined) rememberIconSkin(m.iconSkin);
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
      setSeasonEvent(null);
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

  /**
   * ROUTE ⇄ ABYSS。ABYSS の問題がまだ無い科目（NO_CONTENT）は切り替えずに知らせる。
   * 反映したら true。後から科目の切替・別の切替が来たら、返った応答は捨てて false（treeSeq）
   */
  const switchStage = useCallback(
    async (next: TreeStage): Promise<boolean> => {
      if (!subject || next === stage) return true;
      const my = ++treeSeq.current;
      setSelected(null);
      setMessage(null);
      try {
        const [mf, pg] = await Promise.all([fetchTreeManifest(subject, next), fetchTreeProgress(subject, next)]);
        if (my !== treeSeq.current) return false;
        setStage(next);
        setManifest(mf);
        setProgress(pg);
        if (pg.abyss) setAbyssOpen(pg.abyss.open);
        return true;
      } catch (e) {
        if (my !== treeSeq.current) return false;
        if (e instanceof TreeApiError && e.code === 'NO_CONTENT') setMessage('この科目の ABYSS（二次問題）はまだ準備中です。');
        // ログイン切れ（外部ブラウザ）以外は、いまのツリーを残して知らせるだけ（前はツリー全体がエラー画面になった・2026-10-22 デバッグで修正）
        else if (e instanceof TreeApiError && e.code === 'UNAUTHORIZED') fail(e);
        else setMessage('切り替えられませんでした。通信状況を確かめてもう一度お試しください。');
        return false;
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
          // 後から別の科目を開いた（false）ときは、アリーナへ移らない
          openSubject(subjects, to as TreeSubject)
            .then((ok) => ok && setView({ kind: 'arena' }))
            .catch(fail);
        } else {
          if (subject) loadArena(subject);
          setView({ kind: 'arena' });
        }
      }
    },
    [subject, subjects, openSubject, switchStage, loadArena, loadTickets, fail]
  );

  // いま表示している科目・ステージ（遅れて返った前の科目・ステージの進捗で上書きしない・2026-10-22 デバッグで修正）
  const shownKey = useRef('');
  shownKey.current = `${subject}|${stage}`;
  const refreshProgress = useCallback(() => {
    // manifest が差し替わっていたら一緒に取り直す（版がずれると問題 ID が合わない）
    if (!subject) return;
    const key = `${subject}|${stage}`;
    fetchTreeProgress(subject, stage)
      .then((pg) => {
        if (shownKey.current !== key) return;
        setProgress(pg);
        if (pg.abyss) {
          // 挑戦の結果で ABYSS が開いた（60% に届いてチケットが出た）ら、ヘッダーのチケット枚数も取り直す
          if (pg.abyss.open && !abyssOpen) loadTickets();
          setAbyssOpen(pg.abyss.open);
        }
        if (manifest && pg.version !== manifest.version)
          fetchTreeManifest(subject, stage)
            .then((mf) => {
              if (shownKey.current === key) setManifest(mf);
            })
            .catch(() => {});
      })
      .catch(() => {});
    loadArena(subject);
    // 季節イベントは開催中・予告のとき（と前の読み込みが失敗したとき）だけ取り直す（イベントの無い時期に要求を増やさない。科目を開いたときには必ず取る）
    if (seasonEvent?.event || seasonEventFailed) loadSeasonEvent(subject);
  }, [manifest, subject, stage, loadArena, loadSeasonEvent, loadTickets, abyssOpen, seasonEvent, seasonEventFailed]);

  /**
   * 画面を開いたまま予告 → 開催（0:00）・開催 → 終わり（5:00）をまたいだら取り直す。時刻は Proxy の now との差で決める（端末の時計のずれを受けない）。
   * LINE が画面を残したまま戻ってきたとき（visible）も取り直す（1 分に 1 回まで）。2026-10-22 デバッグで追加
   */
  const seasonEventAt = useRef(0);
  useEffect(() => {
    if (!subject) return;
    const ev = seasonEvent?.event;
    const reload = () => {
      seasonEventAt.current = Date.now();
      loadSeasonEvent(subject);
      setEvNowTag(seasonEventNowParam());
    };
    let timer: number | undefined;
    if (ev) {
      const next = ev.phase === 'soon' ? ev.startAt : ev.phase === 'open' ? ev.endAt : null;
      const wait = next == null ? null : next - ev.now + 1000 + Math.floor(Math.random() * 20_000); // 一斉に来ないよう 1〜21 秒ずらす
      if (wait != null && wait > 0 && wait < 2 * 86400_000) timer = window.setTimeout(reload, wait);
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible' || Date.now() - seasonEventAt.current < 60_000) return;
      if (ev || seasonEventFailed) reload();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      if (timer !== undefined) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [subject, seasonEvent, seasonEventFailed, loadSeasonEvent]);

  /** 季節イベントの挑戦（5 問）を始める。100% の後は復習（マスター度は下がらない）*/
  const beginEvent = async () => {
    if (!subject) return;
    if (!seasonEvent?.event) {
      // 読み込みに失敗して状態が無い → 黙って何もしないのではなく、読み直して知らせる（2026-10-22 デバッグで修正）
      setEventMessage('イベントを読み込めませんでした。少し待ってもう一度お試しください。');
      loadSeasonEvent(subject);
      setView({ kind: 'event' });
      return;
    }
    setStarting(true);
    setEventMessage(null);
    try {
      const s = await startSeasonEventSession(subject, seasonEvent.event.id);
      setView({ kind: 'play', session: s });
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') return onLogout?.();
      setEventMessage(
        code === 'EVENT_CLOSED'
          ? 'イベントの期間が終わりました。'
          : code === 'EVENT_LOCKED'
            ? 'まだ参加できません。'
            : code === 'NO_QUESTIONS'
              ? 'イベントの問題を用意できませんでした。先生に知らせてください。'
              : '問題を読み込めませんでした。通信状況を確かめてもう一度お試しください。'
      );
      loadSeasonEvent(subject);
      setView({ kind: 'event' });
    } finally {
      setStarting(false);
    }
  };

  /** 季節イベントのテスト（20 問・1 回だけ・途中で画面を離れていたら終了扱い＝決定済みで採点）*/
  const beginEventTest = async () => {
    if (!subject) return;
    if (!seasonEvent?.event) {
      setEventMessage('イベントを読み込めませんでした。少し待ってもう一度お試しください。');
      loadSeasonEvent(subject);
      return;
    }
    setStarting(true);
    setEventMessage(null);
    try {
      const s = await startSeasonEventTest(subject, seasonEvent.event.id);
      setView({ kind: 'eventTest', session: s });
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'UNAUTHORIZED' && mode === 'external') return onLogout?.();
      setEventMessage(
        code === 'TEST_LOCKED'
          ? 'テストは MASTER 100% で受けられます。'
          : code === 'TEST_DONE'
            ? 'テストはもう受けました（1 回だけです）。'
            : code === 'EVENT_CLOSED'
              ? 'イベントの期間が終わりました。'
              : 'テストを読み込めませんでした。通信状況を確かめてもう一度お試しください。'
      );
      loadSeasonEvent(subject);
    } finally {
      setStarting(false);
    }
  };

  /** EVENT CLEAR!! の通知 → その科目のイベント画面 */
  openEventRef.current = (s: string) => {
    setEventMessage(null);
    if (s === subject) {
      // 結果画面から来る（100% に届いた提出の直後）→ ツリーの進捗も取り直す（2026-10-22 デバッグで修正）
      refreshProgress();
      loadSeasonEvent(s);
      setView({ kind: 'event' });
      return;
    }
    if (!subjects.includes(s as TreeSubject)) return;
    rememberTreeSubject(s as TreeSubject);
    setManifest(null);
    setProgress(null);
    setArena(null);
    setSeasonEvent(null);
    setSelected(null);
    openSubject(subjects, s as TreeSubject)
      .then((ok) => ok && setView({ kind: 'event' }))
      .catch(fail);
  };

  /** アリーナの挑戦を始める（途中で画面を離れていたら終了扱い＝決定済みで採点）。開始で今シーズンの 1 回を使う */
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

  /**
   * 結果画面の「送った改善要望」と「記録として提出」（挑戦の sessionId ごと）。ランキングから戻ると結果画面が作り直されるので、ここに持って渡す
   * （2026-10-22 修正: ランキングから戻ると「送信済み」「記録済み」の表示が消えて 'idle' に戻り、もう一度押せていた）
   */
  const resultMemo = useRef(new Map<string, { recorded: boolean; reports: Record<string, 'sent' | 'already'> }>());
  const memoOf = (sessionId: string) => {
    let m = resultMemo.current.get(sessionId);
    if (!m) {
      m = { recorded: false, reports: {} };
      resultMemo.current.set(sessionId, m);
    }
    return m;
  };

  const report = async (sessionId: string, qid: string, message: string, label: string, img: string | null): Promise<'sent' | 'already' | 'error'> => {
    try {
      const r = await reportTreeQuestion({ sessionId, qid, message, label, img });
      const st = r.already ? 'already' : 'sent';
      memoOf(sessionId).reports[qid] = st;
      return st;
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
        .then((ok) => ok && setSelected(field))
        .catch(fail);
      return;
    }
    setView({ kind: 'tree' });
    if (stage !== 'front') void switchStage('front').then((ok) => ok && setSelected(field));
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

  viewRef.current = view;
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
          onStaffQuestions={me.grade === '先生' ? () => setView({ kind: 'staffQuestions' }) : undefined}
          onStaffEvent={me.grade === '先生' ? () => setView({ kind: 'eventStaff', back: { kind: 'tree' } }) : undefined}
          onFxLab={me.grade === '先生' ? () => setView({ kind: 'fxlab' }) : undefined}
          // 期限の過ぎた季節イベントのチケットは数えない（2026-10-22 修正）
          tickets={usableTicketCount(tickets, Date.now())}
          onTickets={() => setView({ kind: 'tickets', back: { kind: 'tree' } })}
          onTrophies={!trophyReady ? undefined : () => {
            setTrophyDot(null);
            setView({ kind: 'trophies', back: { kind: 'tree' } });
          }}
          trophyDot={trophyDot}
          seasonEvent={seasonEvent && seasonEvent.event ? seasonEvent : null}
          onEvent={() => {
            setEventMessage(null);
            if (subject) loadSeasonEvent(subject);
            setView({ kind: 'event' });
          }}
          iconSkin={me.iconSkin ?? null}
          onDressUp={() => setView({ kind: 'dressUp', back: { kind: 'tree' } })}
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
      {view.kind === 'tree' && me.grade === '先生' && evNowTag && (
        <button
          type="button"
          className="tr-evnow"
          aria-label="確認用の日付を消す"
          onClick={() => {
            clearSeasonEventNow();
            setEvNowTag(null);
            if (subject) loadSeasonEvent(subject);
          }}
        >
          確認用の日付 {evNowLabel(evNowTag)} <span aria-hidden="true">×</span>
        </button>
      )}
      {view.kind === 'play' && (
        <PlayScreen
          session={view.session}
          subjectName={manifest.name}
          fieldName={fieldOf(view.session.field)?.name ?? view.session.field}
          group={fieldOf(view.session.field)?.group ?? 'basic'}
          onExit={() => {
            refreshProgress();
            // 季節イベントの挑戦はイベント画面へ戻る
            setView(isEventSession(view.session) ? { kind: 'event' } : { kind: 'tree' });
          }}
          onDone={(result, marked) => {
            // トロフィー・分野の解放・マスター・順位アップは結果画面に入ってから出す
            pushToasts(submitToasts(result, manifest, manifest.name, stage));
            // いまの画面がまだこの挑戦の出題のときだけ結果へ（2026-10-22 修正: 採点待ちの間に中断して別の挑戦を始めると、
            // 後から返った前の挑戦の結果で出題中の画面ごと結果画面に置き換わっていた）
            const id = view.session.sessionId;
            setView((v) => (v.kind === 'play' && v.session.sessionId === id ? { kind: 'result', session: v.session, result, marked } : v));
          }}
        />
      )}
      {view.kind === 'result' && (
        <ResultScreen
          result={view.result}
          session={view.session}
          marked={view.marked}
          manifest={manifest}
          grade={me.grade}
          nickname={me.nickname}
          crab={me.crab ?? null}
          busy={starting}
          onSaveNick={saveNick}
          onReport={(qid, message, label, img) => report(view.session.sessionId, qid, message, label, img)}
          reported={resultMemo.current.get(view.session.sessionId)?.reports}
          onRetry={() => {
            refreshProgress();
            if (isEventSession(view.session)) void beginEvent();
            else void start(view.session.field, view.session.qtype);
          }}
          onBack={() => {
            refreshProgress();
            setView({ kind: 'tree' });
          }}
          onEvent={
            isEventSession(view.session)
              ? () => {
                  refreshProgress();
                  setView({ kind: 'event' });
                }
              : undefined
          }
          onRanking={() => {
            refreshProgress();
            // 季節イベントの挑戦は分野をまたぐので科目のランキング
            setView(
              isEventSession(view.session)
                ? { kind: 'ranking', scope: 'subject', field: null, qtype: 'tf', back: view }
                : { kind: 'ranking', scope: 'field', field: view.session.field, qtype: view.session.qtype, back: view }
            );
          }}
        />
      )}
      {view.kind === 'event' && seasonEvent?.event && (
        <EventScreen
          state={seasonEvent}
          subject={subject ?? ''}
          subjectName={manifest.name}
          starting={starting}
          message={eventMessage}
          onBack={() => {
            setEventMessage(null);
            setView({ kind: 'tree' });
          }}
          onChallenge={() => void beginEvent()}
          onTest={() => void beginEventTest()}
          onDressUp={seasonEvent.rewards?.icon ? () => setView({ kind: 'dressUp', back: { kind: 'event' } }) : undefined}
          onStaffView={me.grade === '先生' ? () => setView({ kind: 'eventStaff', back: { kind: 'event' } }) : undefined}
          onTickets={
            seasonEvent.rewards?.ticket
              ? () => {
                  loadTickets();
                  setView({ kind: 'tickets', back: { kind: 'event' } });
                }
              : undefined
          }
        />
      )}
      {view.kind === 'event' && !seasonEvent?.event && (
        <div className={rootClass()}>
          <div className="tr-center">
            <div>{seasonEventLoading ? '読み込み中…' : seasonEventFailed ? 'イベントを読み込めませんでした。' : 'イベントは開催されていません。'}</div>
            {!seasonEventLoading && seasonEventFailed && subject && (
              <button type="button" className="tr-ghost" style={{ width: 240 }} onClick={() => loadSeasonEvent(subject)}>
                もう一度読み込む
              </button>
            )}
            <button type="button" className="tr-ghost" style={{ width: 240 }} onClick={() => setView({ kind: 'tree' })}>
              ツリーへ戻る
            </button>
          </div>
        </div>
      )}
      {view.kind === 'eventTest' && (
        <PlayScreen
          session={view.session}
          subjectName={manifest.name}
          fieldName="TEST"
          group="basic"
          onExit={() => {
            if (subject) loadSeasonEvent(subject);
            setView({ kind: 'event' });
          }}
          onDone={() => {}}
          onEventTestDone={(result) => {
            if (subject) loadSeasonEvent(subject);
            if (result.ticket) {
              loadTickets();
              // TICKET GET! はテストの結果画面に入ってから（キューの最後・畳まない）
              pushToasts([eventTicketToast({ subject: result.ticket.subject, eventId: result.ticket.eventId ?? result.event.id, usableFrom: result.ticket.usableFrom ?? null, kind: result.event.kind }, subjectJa(result.ticket.subject))]);
            }
            // いまの画面がまだこのテストの出題のときだけ結果へ（2026-10-22 修正・通常の挑戦と同じ）
            const id = view.session.sessionId;
            setView((v) => (v.kind === 'eventTest' && v.session.sessionId === id ? { kind: 'eventTestResult', result } : v));
          }}
        />
      )}
      {view.kind === 'eventTestResult' && (
        <EventTestResult
          result={view.result}
          subjectName={manifest.name}
          grade={me.grade}
          nickname={me.nickname}
          staff={me.grade === '先生'}
          onBack={() => {
            refreshProgress();
            setView({ kind: 'tree' });
          }}
          onEvent={() => {
            if (subject) loadSeasonEvent(subject);
            setView({ kind: 'event' });
          }}
          onDressUp={seasonEvent?.rewards?.icon ? () => setView({ kind: 'dressUp', back: { kind: 'tree' } }) : undefined}
          onTickets={() => {
            loadTickets();
            setView({ kind: 'tickets', back: { kind: 'tree' } });
          }}
        />
      )}
      {view.kind === 'dressUp' && (
        <DressUpScreen
          onBack={() => setView(view.back)}
          onSaved={(skin) => {
            setMe((m) => (m ? { ...m, iconSkin: skin } : m));
            rememberIconSkin(skin);
            setView(view.back);
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
      {view.kind === 'staffQuestions' && <StaffQuestionsScreen onBack={() => setView({ kind: 'tree' })} />}
      {view.kind === 'eventStaff' && <EventStaffScreen subject={subject} onBack={() => setView(view.back)} />}
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
            // 挑戦の状態（始めたまま・提出済み）を取り直す（2026-10-23 不具合調査: 終了画面から戻ると開始前の「挑戦する」のままだった）
            if (subject) loadArena(subject);
            setView({ kind: 'arena' });
          }}
          onDone={() => {}}
          onArenaDone={(result) => {
            pushToasts([
              ...(result.trophies ?? []).map((t) => trophyToast(t, subjectJa(t.subject))),
              ...(result.level30 ? [level30Toast(result.level30, subjectJa(result.level30.subject))] : []),
              ...(result.level50 ? [level50Toast(result.level50, subjectJa(result.level50.subject))] : []),
            ]);
            if (subject) loadArena(subject);
            // いまの画面がまだこの挑戦の出題のときだけ結果へ（2026-10-22 修正・通常の挑戦と同じ）
            const id = view.session.sessionId;
            setView((v) => (v.kind === 'arenaPlay' && v.session.sessionId === id ? { kind: 'arenaResult', session: v.session, result } : v));
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
          // 戻ったら結果画面へ（先生の「記録として提出」・間違えた問題がランキングを見た後も使える・2026-10-22 デバッグで修正）
          onRanking={() => setView({ kind: 'ranking', scope: 'arena', field: null, qtype: 'tf', back: view })}
          onReport={(qid, message, label, img) => report(view.session.sessionId, qid, message, label, img)}
          reported={resultMemo.current.get(view.session.sessionId)?.reports}
          recorded={!!resultMemo.current.get(view.session.sessionId)?.recorded}
          onRecorded={() => {
            memoOf(view.session.sessionId).recorded = true;
          }}
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
          onTickets={() => {
            loadTickets();
            setView({ kind: 'tickets', back: view });
          }}
        />
      )}
      {/* 出題中は演出・トロフィーの詳細を重ねない（閉じたときにツリーへ移って挑戦が消えていた・2026-10-22 デバッグで修正）*/}
      {toastDetail && !playing && (
        <TrophyDetailSheet
          item={toastDetail.item}
          fieldInfo={(id) => trophyFieldInfo(toastDetail.subject, id)}
          onClose={() => setToastDetail(null)}
          onShowTree={(field) => showTreeField(toastDetail.subject as TreeSubject, field)}
        />
      )}
      {toasts.layer}
      {sharing && <TreeShareModal loginId={me.loginId} staff={me.grade === '先生'} onClose={() => setSharing(false)} />}
      {events[0] && !playing && (
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

/** ?evnow の日付 → 「10/22 09:00」（JST）。読めなければそのまま */
function evNowLabel(v: string): string {
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return v;
  const d = new Date(t + 9 * 3600_000);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
