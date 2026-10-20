/**
 * ANCHOR TREE — 出題（設計書 §5.1・§5.2 / モック Play.dc.html）。
 *
 * - 単問: 本文画像を枠の残り高さいっぱいに（モック v30）。右上に全画面ボタン。出典は出さない（結果画面の間違えた問題一覧にだけ）。下に ①〜⑩ のパッド
 * - リードがある単問: リード文と設問を別の枠に分けて縦に並べ、スクロールで両方を見られるようにする（2026-10-15 先生の指示。切替ピルは廃止）
 * - セット（同じリードの小問）: リードを上に常時表示し、小問を縦に並べて欄ごとに選ぶ
 * - 原子量・定数など（given）は画像の上に、見出しなしのチップで出す（2026-10-15 先生の指示）
 * - 正解はサーバだけが持つので、ここでは正誤を出さずに次へ進み、最後にまとめて提出する
 * - 時間は単位（単問 / セット）ごとに、画像がそろってから「決定」までを測る。
 *   セットは小問に等分して送る（サーバはセット内の合計でタイムボーナスを出す）
 * - 画像はその場でピンチ拡大、タップで全画面ビューア（§4.6）。全画面中もタイマーは止めない
 * - ABYSS（二次問題・§5.6）: 設問ごとに画像の下へ解答欄（AbyssAnswer）を置き、数値はパッドの位置にキーパッドを出す。
 *   時間ボーナスは無いので経過時間だけ表示する
 * - チャンピオンアリーナ（§5.7）: 全員共通の 10 問。タイムボーナスは最大 75（基礎 25）。提出は /tree/arena/submit。
 *   開始で今シーズンの 1 回を使うので、答えた問題・選んだ答え・時間を端末（localStorage）に残し、閉じても続きから再開できる
 *   出す順番は挑戦ごとに違う（2026-10-18 先生の指示・Proxy の arenaOrder）。再開は「まだ決定していない最初の問題」から
 *   共通テスト後のシーズンは最後の 2 問が ABYSS の設問（2026-10-18 先生決定・1 問 7 分・タイムボーナスあり）。
 *   ABYSS の画面（解答欄・キーパッド）は問題ごとに切り替える（answer.kind = 'parts'）。欄の入力も端末に残す
 * - 出題画面のスクショボタンは廃止（2026-10-17 追加→アリーナは 2026-10-18・通常も 2026-10-19 先生の指示で削除）。
 *   スクショは結果画面の間違えた問題のカード（PlayShot）だけ。アリーナは画面を離れている間（アプリ切替・通知センター等）問題を覆って隠す。
 *   スマホ本体のボタン操作のスクショは Web からは止められない（隠せるのは画面を離れたときだけ）
 * - 季節イベント（2026-10-20）: イベントの挑戦（field = '_event'）は 5 問が分野・種別をまたぐので、見出しの種別は問題ごと（アリーナと同じ）・
 *   提出はふつうの /tree/session/submit。テスト（eventTest）は 20 問・時間ボーナスなし・1 回だけなので、アリーナと同じく途中を端末に残して再開できる。
 *   提出は /tree/season-event/test/submit。画面はハロウィンの色（is-ev-halloween）
 * - 復習チェック（2026-10-19 先生の要望・設計書 §5.1）: 「あとで復習」を付けた問題は、正解でも結果画面の一覧に出す。
 *   端末の中だけで持つ（提出 API には送らない）。選択肢に重ねないよう、単問は解答パッドの見出し行、セット・ABYSS は小問の見出し行に置く。アリーナには出さない
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { AbyssPart, ArenaResult, FieldGroup, PlayQuestion, SeasonEventTestResult, SubmitResult, TreeSession } from '../../lib/treeApi';
import { QTYPE_LABEL, TreeApiError, circled, submitArena, submitSeasonEventTest, submitTreeSession, treeImage } from '../../lib/treeApi';
import { EV_NAME } from './event/evTheme';
import { Ico } from './TreeIcons';
import { ZoomImage } from './ZoomImage';
import { PlayZoomScreen, type ZoomTab } from './PlayZoomScreen';
import { AbyssAnswer, AbyssKeypad, emptyRaw, isFilled, toValue, type RawVal } from './AbyssAnswer';
import { ARENA_GOLD, CROWN_MONO, RETRO, T, alpha, fmtTime, groupColor, rootClass } from './treeTheme';

interface Props {
  session: TreeSession;
  subjectName: string;
  fieldName: string;
  group: FieldGroup;
  onExit: () => void;
  /** marked = 「あとで復習」を付けた問題 ID（出題順）*/
  onDone: (result: SubmitResult, marked: string[]) => void;
  /** チャンピオンアリーナの提出結果（session.arena のとき）*/
  onArenaDone?: (result: ArenaResult) => void;
  /** 季節イベントのテストの提出結果（session.eventTest のとき）*/
  onEventTestDone?: (result: SeasonEventTestResult) => void;
}

/** アリーナの途中経過（端末に残す）*/
interface ArenaSaved {
  idx: number;
  picks: Record<string, string[]>;
  times: Record<string, number>;
  /** ABYSS の設問の欄の入力（共通テスト後のシーズン）。古い保存には無い */
  raws?: Record<string, RawVal[]>;
}
const arenaKey = (sessionId: string) => `tr-arena:${sessionId}`;
function loadArena(sessionId: string): ArenaSaved | null {
  try {
    const v = JSON.parse(localStorage.getItem(arenaKey(sessionId)) || 'null');
    return v && typeof v.idx === 'number' && v.picks && v.times ? v : null;
  } catch {
    return null;
  }
}
function saveArena(sessionId: string, v: ArenaSaved | null) {
  try {
    if (v) localStorage.setItem(arenaKey(sessionId), JSON.stringify(v));
    else localStorage.removeItem(arenaKey(sessionId));
  } catch {
    /* 保存できない端末でも挑戦はできる（再開は最初の問題から）*/
  }
}

type ImgState = Record<string, string | 'error'>;

/** ROUTE のマーク欄（ABYSS の設問は空）*/
/** タイムボーナスが減り始めるまでの猶予（Proxy の BONUS_GRACE_SEC）*/
const BONUS_GRACE_MS = 25_000;
const boxesOf = (q: PlayQuestion) => (q.answer.kind === 'choice' ? q.answer.boxes : []);
const boxLabel = (q: PlayQuestion) => boxesOf(q).map((b) => b.n).join('・');
/**
 * 「二つ選べ（順不同）」のように、順不同で選択肢がそろった複数欄は 1 行から欄の数だけ選ぶ（2026-10-17 先生の報告:
 * 欄ごとの行だと 1 行目で 2 つ目を押すと 1 つ目が外れ「1 つしか選べない」ように見える）。選んだ番号は小さい順に欄へ入れる
 */
const multiPick = (q: PlayQuestion) => {
  const bs = boxesOf(q);
  return (
    q.answer.kind === 'choice' &&
    q.answer.group === 'unordered' &&
    bs.length > 1 &&
    bs.every((b) => (b.choices || 10) === (bs[0]!.choices || 10) && (b.min ?? 1) === (bs[0]!.min ?? 1))
  );
};
const partsOf = (q: PlayQuestion): AbyssPart[] => (q.answer.kind === 'parts' ? q.answer.parts : []);

/** 「あとで復習」のチェック（選択肢のボタンとは別の、小さなピル）*/
function MarkToggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" className={`tr-mark${on ? ' is-on' : ''}`} aria-pressed={on} onClick={onToggle}>
      <i className="tr-mark-box" aria-hidden="true">
        {on && (
          <svg viewBox="0 0 12 12" width="10" height="10">
            <path d="M2.2 6.3 4.8 8.8 9.8 3.4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </i>
      あとで復習
    </button>
  );
}

/**
 * アリーナ: 画面を離れている間 true（2026-10-18 先生の指示・スクショ対策）。
 * visibilitychange（アプリ切替・ホーム）と blur（通知センター・コントロールセンターなど）で隠し、戻ったら出す。タイマーは止めない。
 * 戻ったときに focus が届かない WebView でも出せなくならないよう、hasFocus は見ない＋覆いをタップしても出す（reveal）
 */
function useAway(on: boolean): [boolean, () => void] {
  const [away, setAway] = useState(false);
  useEffect(() => {
    if (!on) return;
    const hide = () => setAway(true);
    const check = () => setAway(document.hidden);
    window.addEventListener('blur', hide);
    window.addEventListener('pagehide', hide);
    window.addEventListener('focus', check);
    window.addEventListener('pageshow', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('blur', hide);
      window.removeEventListener('pagehide', hide);
      window.removeEventListener('focus', check);
      window.removeEventListener('pageshow', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [on]);
  return [on && away, () => setAway(false)];
}

export function PlayScreen({ session, subjectName, fieldName, group, onExit, onDone, onArenaDone, onEventTestDone }: Props) {
  const isArena = (session as { arena?: boolean }).arena === true;
  /** 季節イベント: 挑戦（5 問・ふつうの提出）とテスト（20 問・1 回だけ）*/
  const evKind = (session as { event?: { kind?: string } }).event?.kind ?? null;
  const isEventTest = (session as { eventTest?: boolean }).eventTest === true;
  const isEvent = !!evKind;
  /** 途中を端末に残して再開する挑戦（1 回だけのもの）*/
  const keepsProgress = isArena || isEventTest;
  const col = isArena ? ARENA_GOLD : isEvent ? '#FF9A1F' : groupColor(group);
  const bonusMax = isArena ? 75 : 25;
  const units = session.units;
  const totalQ = units.reduce((s, u) => s + u.qids.length, 0);
  const [saved] = useState(() => (keepsProgress ? loadArena(session.sessionId) : null));
  // 再開はまだ決定していない最初の問題から（決定した問題は times に入る。順番が変わっても取りこぼさない）
  const [idx, setIdx] = useState(() => {
    if (!saved) return 0;
    const open = units.findIndex((u) => u.qids.some((id) => saved.times[id] == null));
    return open < 0 ? units.length - 1 : open;
  });
  const [picks, setPicks] = useState<Record<string, string[]>>(() => saved?.picks ?? {});
  const [marked, setMarked] = useState<Set<string>>(() => new Set());
  const toggleMark = (qid: string) =>
    setMarked((s) => {
      const n = new Set(s);
      if (n.has(qid)) n.delete(qid);
      else n.add(qid);
      return n;
    });
  const mark = (qid: string) => (isArena || isEventTest ? null : <MarkToggle on={marked.has(qid)} onToggle={() => toggleMark(qid)} />);
  /** ABYSS: 設問ごとの欄の入力と、キーパッドで入力中の数値欄 */
  const isBackStage = session.stage === 'back';
  const [raws, setRaws] = useState<Record<string, RawVal[]>>(() => saved?.raws ?? {});
  const [numFocus, setNumFocus] = useState<{ qid: string; i: number } | null>(null);
  const [imgs, setImgs] = useState<ImgState>({});
  const [confirmExit, setConfirmExit] = useState(false);
  const [zoomPath, setZoomPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const unitStart = useRef<number | null>(null);
  const times = useRef<Record<string, number>>(saved?.times ?? {});
  const areaRef = useRef<HTMLDivElement>(null);
  const [away, reveal] = useAway(isArena);

  const unit = units[idx]!;
  const qs = unit.qids.map((id) => session.questions[id]!).filter(Boolean);
  const isSet = !!unit.set;
  const first = qs[0];
  // ABYSS の画面にするか: ABYSS の挑戦、またはアリーナの ABYSS の設問（共通テスト後）
  const isBack = isBackStage || (!!first && first.answer.kind === 'parts');

  const unitPaths = (i: number) => {
    const u = units[i];
    if (!u) return [];
    const list = u.qids.map((id) => session.questions[id]);
    const leads = u.lead ? [u.lead] : list.map((q) => q?.img.lead).filter(Boolean);
    return [...new Set([...leads, ...list.map((q) => q?.img.body)].filter((p): p is string => !!p))];
  };

  // 画像は最初に全部取りにいく（今の単位から順に）
  useEffect(() => {
    let alive = true;
    const all = units.flatMap((_, i) => unitPaths(i));
    for (const path of [...new Set(all)]) {
      treeImage(path)
        .then((url) => alive && setImgs((s) => ({ ...s, [path]: url })))
        .catch(() => alive && setImgs((s) => ({ ...s, [path]: 'error' })));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sessionId]);

  // キーパッドを出すと問題の枠が縮むので、入力中の数値欄を見える位置へ（スマホでキーパッドの裏に隠れないように）
  useEffect(() => {
    if (!numFocus) return;
    const id = requestAnimationFrame(() => {
      const el = areaRef.current?.querySelector(`[data-num="${CSS.escape(`${numFocus.qid}#${numFocus.i}`)}"]`);
      el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    });
    return () => cancelAnimationFrame(id);
  }, [numFocus]);

  const ready = unitPaths(idx).every((p) => imgs[p]);
  useEffect(() => {
    if (ready && unitStart.current === null) unitStart.current = performance.now();
  }, [ready, idx]);

  useEffect(() => {
    const t = setInterval(() => setNow(performance.now()), 250);
    return () => clearInterval(t);
  }, []);

  const elapsed = unitStart.current === null ? 0 : now - unitStart.current;
  const limitMs = unit.limitSec * 1000;
  // 開始から 25 秒は満点、その後は制限時間まで直線で 0 へ（Proxy の bonusSpeed と同じ・2026-10-17 先生決定）
  const graceMs = limitMs > BONUS_GRACE_MS ? BONUS_GRACE_MS : 0;
  const bonus = Math.round(bonusMax * Math.min(1, Math.max(0, (limitMs - elapsed) / (limitMs - graceMs))));
  const doneQ = units.slice(0, idx).reduce((s, u) => s + u.qids.length, 0);
  const filledQ = (q: PlayQuestion) =>
    q.answer.kind === 'parts'
      ? partsOf(q).every((p, i) => isFilled(p, raws[q.id]?.[i]))
      : boxesOf(q).every((_, k) => !!picks[q.id]?.[k]);
  const allPicked = qs.every(filledQ);
  const setRaw = (qid: string, i: number, v: RawVal) =>
    setRaws((s) => {
      const q = session.questions[qid];
      const cur = s[qid] ? [...s[qid]!] : partsOf(q!).map(emptyRaw);
      cur[i] = v;
      return { ...s, [qid]: cur };
    });

  /** 1 行から size 個選ぶ（選び済みを押すと外す。size 個選んだ後は一番古いものと入れ替え）*/
  const pickMulti = (qid: string, n: number, size: number) => {
    setPicks((s) => {
      const v = String(n);
      let cur = (s[qid] ?? []).filter(Boolean);
      if (cur.includes(v)) cur = cur.filter((x) => x !== v);
      else cur = [...(cur.length >= size ? cur.slice(1) : cur), v];
      const sorted = [...cur].sort((a, b) => Number(a) - Number(b));
      return { ...s, [qid]: [...sorted, ...Array<string>(size - sorted.length).fill('')] };
    });
  };

  const pick = (qid: string, k: number, n: number, boxes: number) => {
    setPicks((s) => {
      const cur = s[qid] ? [...s[qid]!] : Array<string>(boxes).fill('');
      cur[k] = cur[k] === String(n) ? '' : String(n);
      return { ...s, [qid]: cur };
    });
  };

  const submit = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const answers = units.flatMap((u) =>
        u.qids.map((qid) => {
          const q = session.questions[qid];
          const value =
            q && q.answer.kind === 'parts'
              ? partsOf(q).map((p, i) => toValue(p, raws[qid]?.[i]))
              : (picks[qid] ?? []).filter((v) => v !== '');
          return { qid, value, timeMs: Math.round(times.current[qid] ?? 0) };
        })
      );
      if (isArena) {
        const r = await submitArena(session.sessionId, answers);
        saveArena(session.sessionId, null);
        onArenaDone?.(r);
      } else if (isEventTest) {
        const r = await submitSeasonEventTest(session.sessionId, answers);
        saveArena(session.sessionId, null);
        onEventTestDone?.(r);
      } else {
        onDone(
          await submitTreeSession(session.sessionId, answers),
          answers.map((a) => a.qid).filter((id) => marked.has(id))
        );
      }
    } catch (e) {
      if (e instanceof TreeApiError && e.code === 'ALREADY_SUBMITTED') {
        if (keepsProgress) saveArena(session.sessionId, null);
        setSubmitError('この挑戦はすでに提出されています。ツリーに戻って結果を確認してください。');
      } else if (e instanceof TreeApiError && e.code === 'ARENA_CLOSED') {
        if (isArena) saveArena(session.sessionId, null);
        setSubmitError('このシーズンは終了しました。この挑戦は提出できません。');
      } else if (e instanceof TreeApiError && e.code === 'EVENT_CLOSED') {
        if (keepsProgress) saveArena(session.sessionId, null);
        setSubmitError('イベントの期間が終わりました。このテストは提出できません。');
      } else if (e instanceof TreeApiError && e.code === 'NO_SESSION') {
        // 別の端末で始め直した（先生）などで、この挑戦がもう無い。何度送っても通らないので再送ボタンは出さない
        if (keepsProgress) saveArena(session.sessionId, null);
        setSubmitError('この挑戦は見つかりませんでした（別の端末で始め直した可能性があります）。ツリーに戻ってください。');
      } else {
        setSubmitError('提出できませんでした。通信状況を確かめて、もう一度送ってください。');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const decide = () => {
    if (!allPicked || submitting) return;
    const spent = unitStart.current === null ? 0 : performance.now() - unitStart.current;
    for (const id of unit.qids) times.current[id] = spent / unit.qids.length;
    if (keepsProgress) saveArena(session.sessionId, { idx: Math.min(idx + 1, units.length - 1), picks, times: times.current, raws });
    if (idx + 1 >= units.length) {
      void submit();
      return;
    }
    unitStart.current = null;
    setZoomPath(null);
    setNumFocus(null);
    setIdx(idx + 1);
    areaRef.current?.scrollTo({ top: 0 });
  };

  const crumb = useMemo(
    () =>
      isArena
        ? 'CHAMPION ARENA › '
        : evKind
          ? `${EV_NAME[evKind] ?? 'EVENT'} ${isEventTest ? 'TEST' : 'CHALLENGE'} › `
          : `${subjectName} › ${fieldName} › `,
    [isArena, evKind, isEventTest, subjectName, fieldName],
  );

  const renderImg = (path: string | null, alt: string, btn = true) => {
    if (!path) return null;
    const s = imgs[path];
    if (!s) return <div className="tr-imgph">読み込み中…</div>;
    if (s === 'error') {
      return (
        <button
          type="button"
          className="tr-imgph"
          onClick={() => {
            setImgs((x) => {
              const { [path]: _drop, ...rest } = x;
              return rest;
            });
            treeImage(path)
              .then((url) => setImgs((x) => ({ ...x, [path]: url })))
              .catch(() => setImgs((x) => ({ ...x, [path]: 'error' })));
          }}
        >
          画像を読み込めませんでした（タップで再読み込み）
        </button>
      );
    }
    return <ZoomImage key={path} src={s} alt={alt} btn={btn} onOpen={() => setZoomPath(path)} />;
  };

  // 全画面ビューアの切替タブ: リード文 → 設問（セットは小問ごと）
  const zoomTabs: ZoomTab[] = [];
  const leadPath = isSet ? unit.lead : first?.img.lead ?? null;
  if (leadPath) zoomTabs.push({ label: 'リード文', path: leadPath });
  qs.forEach((q, i) => {
    if (q.img.body) zoomTabs.push({ label: isSet ? `小問 ${i + 1}` : '設問', path: q.img.body });
  });

  const renderChoices = (q: PlayQuestion, small: boolean) => {
    if (multiPick(q)) {
      const bs = boxesOf(q);
      const b0 = bs[0]!;
      const mine = picks[q.id] ?? [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div className="tr-boxlabel">
            解答番号 <span className="tr-num">{bs.map((b) => b.n).join('・')}</span>（{bs.length} つ選ぶ・順不同）
          </div>
          <div className="tr-choices">
            {Array.from({ length: b0.choices || 10 }, (_, i) => i + (b0.min ?? 1)).map((n) => {
              const on = mine.includes(String(n));
              return (
                <button
                  key={n}
                  type="button"
                  className={`tr-ch${on ? ' is-sel' : ''}${small ? ' is-sm' : ''}`}
                  aria-label={`解答番号 ${bs.map((b) => b.n).join('・')} 選択肢 ${n}`}
                  aria-pressed={on}
                  onClick={() => pickMulti(q.id, n, bs.length)}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>
      );
    }
    return boxesOf(q).map((b, k) => (
      <div key={b.n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {boxesOf(q).length > 1 && (
          <div className="tr-boxlabel">
            解答番号 <span className="tr-num">{b.n}</span>
            {q.answer.kind === 'choice' && q.answer.group === 'unordered' && k === 0 ? '（順不同）' : ''}
          </div>
        )}
        <div className="tr-choices">
          {Array.from({ length: b.choices || 10 }, (_, i) => i + (b.min ?? 1)).map((n) => {
            const on = picks[q.id]?.[k] === String(n);
            return (
              <button
                key={n}
                type="button"
                className={`tr-ch${on ? ' is-sel' : ''}${small ? ' is-sm' : ''}`}
                aria-label={`解答番号 ${b.n} 選択肢 ${n}`}
                aria-pressed={on}
                onClick={() => pick(q.id, k, n, boxesOf(q).length)}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    ));
  };

  const given = (list: string[]) =>
    list.length > 0 && (
      <div className="tr-given" aria-label="問題で使う値">
        {RETRO && <b className="tr-given-k">GIVEN</b>}
        {list.map((g) => (
          <span key={g} className="tr-num">
            {g}
          </span>
        ))}
      </div>
    );

  const pickedLabel = first
    ? (picks[first.id] ?? []).filter(Boolean).map(circled).join('・') || '—'
    : '—';
  const isLast = idx + 1 >= units.length;

  return (
    <div className={rootClass(isArena ? 'tr-play is-arena' : evKind ? `tr-play is-ev-${evKind}` : 'tr-play')}>
      <div className="tr-bar">
        <button type="button" className="tr-iconbtn" aria-label="中断してツリーへ" onClick={() => setConfirmExit(true)}>
          <Ico id={RETRO ? 'i-px-close' : 'i-close'} size={RETRO ? 14 : 16} />
        </button>
        <div className="tr-bar-mid">
          <div className="tr-crumb">
            {isBack && <span className="ab-pill">ABYSS</span>}
            {isArena && <img src={CROWN_MONO} alt="" className="tr-ar-chipcrown" style={{ width: 16 }} />}
            {crumb}
            <span style={{ color: col, fontWeight: 700 }}>{QTYPE_LABEL[(isArena || isEvent) && first ? first.type : session.qtype]}</span>
          </div>
          <div className="tr-progress">
            {RETRO ? (
              // レトロ寄りの見た目（ボード R04 / A07r）: 問題数ぶんのマス（済み = 主色・今 = 白・まだ = 14%）
              <div className="tr-qpips" role="img" aria-label={`${totalQ} 問中 ${Math.min(doneQ + 1, totalQ)} 問目`} style={{ ['--pip' as string]: col }}>
                {Array.from({ length: totalQ }, (_, i) => (
                  <i key={i} className={i < doneQ ? 'is-done' : i < doneQ + qs.length ? 'is-now' : undefined} />
                ))}
              </div>
            ) : (
              <div>
                <i style={{ width: `${(doneQ / totalQ) * 100}%`, background: col }} />
              </div>
            )}
            <span className="tr-num" style={{ fontSize: 13, fontWeight: 700 }}>
              {Math.min(doneQ + 1, totalQ)}
              {qs.length > 1 ? `–${doneQ + qs.length}` : ''}
              <span style={{ color: 'var(--tr-sub)', fontWeight: 500 }}> / {totalQ}</span>
            </span>
          </div>
        </div>
        <div className="tr-timer">
          <div className="tr-num">
            <Ico id="i-clock" size={13} />
            {fmtTime(elapsed)}
            {!isBackStage && <span> / {fmtTime(limitMs)}</span>}
          </div>
          {isBackStage || isEventTest ? (
            <small style={{ color: alpha(T.text, 0.45) }}>時間ボーナスなし</small>
          ) : (
            <small className="tr-num" style={{ color: bonus > 0 ? T.accent : alpha(T.text, 0.45) }}>
              タイムボーナス +{bonus}
            </small>
          )}
        </div>
      </div>

      <div className={`tr-qarea${isBack || isSet || leadPath ? '' : ' is-fill'}`} ref={areaRef}>
        {given(isSet ? [...new Set(qs.flatMap((q) => q.given))] : first?.given ?? [])}
        {isBack ? (
          <>
            {leadPath && (
              <div className="tr-frame">
                <div className="tr-member-head">
                  <span>リード文</span>
                </div>
                <div className="tr-paper">{renderImg(leadPath, 'リード文')}</div>
              </div>
            )}
            {qs.map((q, i) => (
              <div key={q.id} className="tr-frame tr-member">
                <div className="tr-member-head">
                  <span>{isSet ? `小問 ${i + 1} / ${qs.length}` : '設問'}</span>
                  <span className="tr-member-right">
                    {q.label && (
                      <span className="tr-num" style={{ color: 'var(--tr-sub)', fontWeight: 500 }}>
                        {q.label}
                      </span>
                    )}
                    {mark(q.id)}
                  </span>
                </div>
                <div className="tr-paper">{renderImg(q.img.body, `問題 ${q.label ?? ''}`)}</div>
                <AbyssAnswer
                  q={q}
                  values={raws[q.id] ?? partsOf(q).map(emptyRaw)}
                  onChange={(k, v) => setRaw(q.id, k, v)}
                  numFocus={numFocus?.qid === q.id ? numFocus.i : null}
                  onNumFocus={(k) => setNumFocus({ qid: q.id, i: k })}
                />
              </div>
            ))}
          </>
        ) : isSet ? (
          <>
            <div className="tr-frame">
              <div className="tr-member-head">
                <span>リード文</span>
              </div>
              <div className="tr-paper">{renderImg(unit.lead, 'リード文')}</div>
            </div>
            {qs.map((q, i) => (
              <div key={q.id} className="tr-frame tr-member">
                <div className="tr-member-head">
                  <span>
                    小問 {i + 1} / {qs.length}
                  </span>
                  <span className="tr-member-right">
                    <span style={{ color: 'var(--tr-sub)', fontWeight: 500 }}>
                      解答番号 <span className="tr-num">{boxLabel(q)}</span>
                    </span>
                    {mark(q.id)}
                  </span>
                </div>
                <div className="tr-paper">{renderImg(q.img.body, `問題 解答番号 ${boxLabel(q)}`)}</div>
                {renderChoices(q, true)}
              </div>
            ))}
          </>
        ) : first && leadPath ? (
          <>
            <div className="tr-frame">
              <div className="tr-member-head">
                <span>リード文</span>
              </div>
              <div className="tr-paper">{renderImg(leadPath, 'リード文')}</div>
            </div>
            <div className="tr-frame">
              <div className="tr-member-head">
                <span>設問</span>
                <span style={{ color: 'var(--tr-sub)', fontWeight: 500 }}>
                  解答番号 <span className="tr-num">{boxLabel(first)}</span>
                </span>
              </div>
              <div className="tr-paper">
                {renderImg(first.img.body, `問題 解答番号 ${boxLabel(first)}`)}
                {first.text && <div className="tr-qtext">{first.text}</div>}
              </div>
            </div>
          </>
        ) : (
          first && (
            <div className="tr-frame is-fill">
              <div className="tr-paper">
                <div className="tr-imgscroll" key={first.img.body ?? ''}>
                  {renderImg(first.img.body, `問題 解答番号 ${boxLabel(first)}`, false)}
                </div>
                {first.text && <div className="tr-qtext">{first.text}</div>}
              </div>
              {first.img.body && imgs[first.img.body] && imgs[first.img.body] !== 'error' && (
                <button type="button" className="tr-expand" aria-label="全画面で見る" onClick={() => setZoomPath(first.img.body)}>
                  <Ico id="i-expand" size={14} />
                </button>
              )}
            </div>
          )
        )}
      </div>

      <div className="tr-pad">
        {isBack ? (
          (() => {
            const fq = numFocus ? session.questions[numFocus.qid] : null;
            const fp = fq ? partsOf(fq)[numFocus!.i] : null;
            if (fq && fp && fp.kind === 'numeric') {
              const v = (raws[fq.id]?.[numFocus!.i] as { m: string; e: string } | undefined) ?? { m: '', e: '' };
              return (
                <AbyssKeypad
                  key={`${fq.id}:${numFocus!.i}`}
                  part={fp}
                  value={v}
                  onChange={(nv) => setRaw(fq.id, numFocus!.i, nv)}
                  onClose={() => setNumFocus(null)}
                  onNext={(() => {
                    // この画面（単位）の数値欄を上から順に。最後の欄なら出さない
                    const order = qs.flatMap((q) => partsOf(q).flatMap((p, k) => (p.kind === 'numeric' ? [{ qid: q.id, i: k }] : [])));
                    const at = order.findIndex((x) => x.qid === fq.id && x.i === numFocus!.i);
                    const next = order[at + 1];
                    return next ? () => setNumFocus(next) : undefined;
                  })()}
                />
              );
            }
            return (
              <div className="tr-pad-head">
                <span>すべての欄に答えてから決定</span>
                <span>
                  <b className="tr-num">{qs.filter(filledQ).length}</b> / {qs.length}
                </span>
              </div>
            );
          })()
        ) : isSet ? (
          <div className="tr-pad-head">
            <span>小問ごとに解答をえらんでから決定</span>
            <span>
              <b className="tr-num">{qs.filter(filledQ).length}</b> / {qs.length}
            </span>
          </div>
        ) : (
          first && (
            <>
              <div className="tr-pad-head">
                <span>解答をえらぶ</span>
                <span className="tr-member-right">
                  <span>
                    選択中: <b className="tr-num">{pickedLabel}</b>
                  </span>
                  {mark(first.id)}
                </span>
              </div>
              {renderChoices(first, false)}
            </>
          )
        )}
        <button type="button" className="tr-cta" disabled={!allPicked || submitting} onClick={decide}>
          {submitting ? '採点中…' : isLast ? '決定して採点へ' : '決定'}
        </button>
      </div>

      {zoomPath && (
        <PlayZoomScreen
          tabs={zoomTabs}
          initial={Math.max(0, zoomTabs.findIndex((t) => t.path === zoomPath))}
          imgs={imgs}
          onClose={() => setZoomPath(null)}
        />
      )}

      {confirmExit && (
        <div className={`tr-overlay${isArena ? ' tr-ar-overlay' : ''}`} role="dialog" aria-label="中断の確認">
          <div className={isArena ? 'tr-ar-dialog' : 'tr-card'}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>中断しますか？</div>
            <div style={isArena ? { color: 'var(--tr-sub)', fontSize: 13, lineHeight: 1.8 } : { color: 'var(--tr-sub)' }}>
              {isArena
                ? '今シーズンの挑戦はもう始まっています（やり直しはできません）。中断しても時間は進み続けます。ツリーの一番下のアリーナのノードから、続きの問題を再開できます。'
                : isEventTest
                  ? 'テストはもう始まっています（受けられるのは 1 回だけです）。中断しても、イベント画面の「テストを再開」から続きの問題を解けます。'
                  : 'この挑戦の解答は記録されません。'}
            </div>
            <button type="button" className={isArena ? 'tr-ar-btn' : 'tr-cta'} onClick={() => setConfirmExit(false)}>
              続ける
            </button>
            <button type="button" className={isArena ? 'tr-ar-btn2' : 'tr-ghost'} style={isArena ? { height: 50 } : undefined} onClick={onExit}>
              中断してツリーへ
            </button>
          </div>
        </div>
      )}

      {away && (
        <div className="tr-ar-away" onPointerDown={reveal} onClick={reveal}>
          <img src={CROWN_MONO} alt="" style={{ width: 40, height: 'auto', display: 'block' }} />
          <div>タップすると問題に戻ります</div>
        </div>
      )}

      {submitError && (
        <div className="tr-overlay" role="alertdialog">
          <div className="tr-card">
            <div>{submitError}</div>
            {!/すでに提出|終了しました|見つかりませんでした/.test(submitError) && (
              <button type="button" className="tr-cta" disabled={submitting} onClick={() => void submit()}>
                {submitting ? '送信中…' : 'もう一度送る'}
              </button>
            )}
            <button type="button" className="tr-ghost" onClick={onExit}>
              ツリーへ戻る
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
