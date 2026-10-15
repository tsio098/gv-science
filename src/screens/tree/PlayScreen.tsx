/**
 * ANCHOR TREE — 出題（設計書 §5.1・§5.2 / モック Play.dc.html）。
 *
 * - 単問: 本文画像を枠の残り高さいっぱいに（モック v30）。リードは枠左上のピル「リード文」で枠内を切り替え、右上に全画面ボタン。
 *   出典は出さない（結果画面の間違えた問題一覧にだけ）。下に ①〜⑩ のパッド
 * - セット（同じリードの小問）: リードを上に常時表示し、小問を縦に並べて欄ごとに選ぶ
 * - 正解はサーバだけが持つので、ここでは正誤を出さずに次へ進み、最後にまとめて提出する
 * - 時間は単位（単問 / セット）ごとに、画像がそろってから「決定」までを測る。
 *   セットは小問に等分して送る（サーバはセット内の合計でタイムボーナスを出す）
 * - 画像はその場でピンチ拡大、タップで全画面ビューア（§4.6）。全画面中もタイマーは止めない
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { FieldGroup, PlayQuestion, SubmitResult, TreeSession } from '../../lib/treeApi';
import { QTYPE_LABEL, TreeApiError, circled, submitTreeSession, treeImage } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { ZoomImage } from './ZoomImage';
import { PlayZoomScreen, type ZoomTab } from './PlayZoomScreen';
import { T, alpha, fmtTime, groupColor } from './treeTheme';

interface Props {
  session: TreeSession;
  subjectName: string;
  fieldName: string;
  group: FieldGroup;
  onExit: () => void;
  onDone: (result: SubmitResult) => void;
}

type ImgState = Record<string, string | 'error'>;

const boxLabel = (q: PlayQuestion) => q.answer.boxes.map((b) => b.n).join('・');

export function PlayScreen({ session, subjectName, fieldName, group, onExit, onDone }: Props) {
  const col = groupColor(group);
  const units = session.units;
  const totalQ = units.reduce((s, u) => s + u.qids.length, 0);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<Record<string, string[]>>({});
  const [imgs, setImgs] = useState<ImgState>({});
  const [leadOpen, setLeadOpen] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [zoomPath, setZoomPath] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [now, setNow] = useState(() => performance.now());
  const unitStart = useRef<number | null>(null);
  const times = useRef<Record<string, number>>({});
  const areaRef = useRef<HTMLDivElement>(null);

  const unit = units[idx]!;
  const qs = unit.qids.map((id) => session.questions[id]!).filter(Boolean);
  const isSet = !!unit.set;
  const first = qs[0];

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
  const bonus = Math.round(25 * Math.max(0, (limitMs - elapsed) / limitMs));
  const doneQ = units.slice(0, idx).reduce((s, u) => s + u.qids.length, 0);
  const allPicked = qs.every((q) => q.answer.boxes.every((_, k) => !!picks[q.id]?.[k]));

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
        u.qids.map((qid) => ({ qid, value: (picks[qid] ?? []).filter((v) => v !== ''), timeMs: Math.round(times.current[qid] ?? 0) }))
      );
      onDone(await submitTreeSession(session.sessionId, answers));
    } catch (e) {
      if (e instanceof TreeApiError && e.code === 'ALREADY_SUBMITTED') {
        setSubmitError('この挑戦はすでに提出されています。ツリーに戻って結果を確認してください。');
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
    if (idx + 1 >= units.length) {
      void submit();
      return;
    }
    unitStart.current = null;
    setLeadOpen(false);
    setZoomPath(null);
    setIdx(idx + 1);
    areaRef.current?.scrollTo({ top: 0 });
  };

  const crumb = useMemo(() => `${subjectName} › ${fieldName} › `, [subjectName, fieldName]);

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
  const shownPath = leadOpen && leadPath ? leadPath : first?.img.body ?? null;
  if (leadPath) zoomTabs.push({ label: 'リード文', path: leadPath });
  qs.forEach((q, i) => {
    if (q.img.body) zoomTabs.push({ label: isSet ? `小問 ${i + 1}` : '設問', path: q.img.body });
  });

  const renderChoices = (q: PlayQuestion, small: boolean) =>
    q.answer.boxes.map((b, k) => (
      <div key={b.n} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {q.answer.boxes.length > 1 && (
          <div className="tr-boxlabel">
            解答番号 <span className="tr-num">{b.n}</span>
            {q.answer.group === 'unordered' && k === 0 ? '（順不同）' : ''}
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
                onClick={() => pick(q.id, k, n, q.answer.boxes.length)}
              >
                {n}
              </button>
            );
          })}
        </div>
      </div>
    ));

  const given = (list: string[]) =>
    list.length > 0 && (
      <div className="tr-given">
        <b>必要な値</b>
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
    <div className="tr-root tr-play">
      <div className="tr-bar">
        <button type="button" className="tr-iconbtn" aria-label="中断してツリーへ" onClick={() => setConfirmExit(true)}>
          <Ico id="i-close" size={16} />
        </button>
        <div className="tr-bar-mid">
          <div className="tr-crumb">
            {crumb}
            <span style={{ color: col, fontWeight: 700 }}>{QTYPE_LABEL[session.qtype]}</span>
          </div>
          <div className="tr-progress">
            <div>
              <i style={{ width: `${(doneQ / totalQ) * 100}%`, background: col }} />
            </div>
            <span className="tr-num" style={{ fontSize: 13, fontWeight: 700 }}>
              {Math.min(doneQ + 1, totalQ)}
              {qs.length > 1 ? `–${doneQ + qs.length}` : ''}
              <span style={{ color: T.sub, fontWeight: 500 }}> / {totalQ}</span>
            </span>
          </div>
        </div>
        <div className="tr-timer">
          <div className="tr-num">
            <Ico id="i-clock" size={13} />
            {fmtTime(elapsed)}
            <span> / {fmtTime(limitMs)}</span>
          </div>
          <small className="tr-num" style={{ color: bonus > 0 ? T.accent : alpha(T.text, 0.45) }}>
            タイムボーナス +{bonus}
          </small>
        </div>
      </div>

      <div className={`tr-qarea${isSet ? '' : ' is-fill'}`} ref={areaRef}>
        {isSet ? (
          <>
            <div className="tr-frame">
              <div className="tr-paper">{renderImg(unit.lead, 'リード文')}</div>
              {given([...new Set(qs.flatMap((q) => q.given))])}
            </div>
            {qs.map((q, i) => (
              <div key={q.id} className="tr-frame tr-member">
                <div className="tr-member-head">
                  <span>
                    小問 {i + 1} / {qs.length}
                  </span>
                  <span className="tr-num" style={{ color: T.sub, fontWeight: 500 }}>
                    解答番号 {boxLabel(q)}
                  </span>
                </div>
                <div className="tr-paper">{renderImg(q.img.body, `問題 解答番号 ${boxLabel(q)}`)}</div>
                {renderChoices(q, true)}
              </div>
            ))}
          </>
        ) : (
          first && (
            <div className="tr-frame is-fill">
              <div className="tr-paper">
                <div className="tr-imgscroll" key={shownPath ?? ''}>
                  {renderImg(shownPath, leadOpen ? 'リード文' : `問題 解答番号 ${boxLabel(first)}`, false)}
                </div>
                {!leadOpen && first.text && <div className="tr-qtext">{first.text}</div>}
              </div>
              {first.img.lead && (
                <button
                  type="button"
                  className="tr-leadpill"
                  onClick={() => setLeadOpen((v) => !v)}
                  aria-pressed={leadOpen}
                  aria-label={leadOpen ? '設問にもどる' : '大問のリード文を見る'}
                >
                  <Ico id="i-lines" size={12} />
                  {leadOpen ? '設問' : 'リード文'}
                </button>
              )}
              {shownPath && imgs[shownPath] && imgs[shownPath] !== 'error' && (
                <button type="button" className="tr-expand" aria-label="全画面で見る" onClick={() => setZoomPath(shownPath)}>
                  <Ico id="i-expand" size={14} />
                </button>
              )}
              {given(first.given)}
            </div>
          )
        )}
      </div>

      <div className="tr-pad">
        {isSet ? (
          <div className="tr-pad-head">
            <span>小問ごとに解答をえらんでから決定</span>
            <span>
              <b className="tr-num">{qs.filter((q) => q.answer.boxes.every((_, k) => !!picks[q.id]?.[k])).length}</b> / {qs.length}
            </span>
          </div>
        ) : (
          first && (
            <>
              <div className="tr-pad-head">
                <span>解答をえらぶ</span>
                <span>
                  選択中: <b className="tr-num">{pickedLabel}</b>
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
        <div className="tr-overlay" role="dialog" aria-label="中断の確認">
          <div className="tr-card">
            <div style={{ fontWeight: 700, fontSize: 16 }}>中断しますか？</div>
            <div style={{ color: T.sub }}>この挑戦の解答は記録されません。</div>
            <button type="button" className="tr-cta" onClick={() => setConfirmExit(false)}>
              続ける
            </button>
            <button type="button" className="tr-ghost" onClick={onExit}>
              中断してツリーへ
            </button>
          </div>
        </div>
      )}

      {submitError && (
        <div className="tr-overlay" role="alertdialog">
          <div className="tr-card">
            <div>{submitError}</div>
            {!/すでに提出/.test(submitError) && (
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
