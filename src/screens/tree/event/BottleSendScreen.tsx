/**
 * ボトルを流す（ボード B03）→ 流した（B04）。実装手順_ボトルメール §3-4。
 *   問題 ID の入力＋「貼り付け」→ 入力が止まって 400ms で /tree/bottle/preview（問題の画像の縮小・科目 · 種別 · 分野・試験 · 問）
 *   → 宛先のニックネーム（空欄なら同じ科目のだれかへ）→ 注意 3 行 → 「ボトルを流す +1PT」
 *   相手がいなかった（returned）ときはこの画面に知らせて、ポイント・今日の数は減らない（RETURNED の通知は TreeRoot）
 */
import { useEffect, useRef, useState } from 'react';
import type { BottlePreview, BottleSendResult, BottleState } from '../../../lib/treeApi';
import { TreeApiError, examLabel, fetchBottlePreview, sendBottle, treeImage } from '../../../lib/treeApi';
import { rootClass } from '../treeTheme';
import { PxBackIcon } from './EvParts';
import { PxBottle, PxCheck, PxWarn } from './BottleParts';
import { BOTTLE_QTYPE } from './BottleScreen';
import '../../../styles/tree-event.css';
import '../../../styles/tree-bottle.css';
import '../../../styles/tree-bottle-screens.css';

interface Props {
  state: BottleState;
  /** 自分が開ける科目キー */
  subjects: string[];
  subjectName: (s: string) => string;
  onBack: () => void;
  onSent: (r: BottleSendResult) => void;
  onTree: () => void;
  onEvent: () => void;
}

type Pv = { status: 'idle' | 'loading' } | { status: 'ok'; p: BottlePreview } | { status: 'ng'; text: string };

const PREVIEW_WAIT_MS = 400;

export function BottleSendScreen({ state, subjects, subjectName, onBack, onSent, onTree, onEvent }: Props) {
  const staff = !!state.staff;
  const [qid, setQid] = useState('');
  const [to, setTo] = useState('');
  const [pv, setPv] = useState<Pv>({ status: 'idle' });
  const [img, setImg] = useState<string | 'error' | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const [err, setErr] = useState<{ where: 'id' | 'to' | 'all'; text: string } | null>(null);
  const [pasteNote, setPasteNote] = useState<string | null>(null);
  const [returned, setReturned] = useState<string | null>(null);
  const [left, setLeft] = useState(state.todayLeft);
  const [sent, setSent] = useState<BottleSendResult | null>(null);
  const id = qid.trim();

  // 入力が止まってから 400ms でプレビュー（遅れて返った前の ID の結果で上書きしない）
  const seq = useRef(0);
  useEffect(() => {
    const my = ++seq.current;
    setImg(null);
    if (!id) {
      setPv({ status: 'idle' });
      return;
    }
    setPv({ status: 'loading' });
    const t = window.setTimeout(() => {
      fetchBottlePreview(id)
        .then((p) => {
          if (my !== seq.current) return;
          setPv({ status: 'ok', p });
          if (p.img) {
            treeImage(p.img)
              .then((u) => my === seq.current && setImg(u))
              .catch(() => my === seq.current && setImg('error'));
          }
        })
        .catch((e) => {
          if (my !== seq.current) return;
          const nf = e instanceof TreeApiError && (e.status === 404 || e.code === 'QID_UNKNOWN');
          setPv({ status: 'ng', text: nf ? 'この ID の問題が見つかりません。ID をもう一度確かめてください' : '問題を確かめられませんでした。通信状況を確かめてください' });
        });
    }, PREVIEW_WAIT_MS);
    return () => window.clearTimeout(t);
  }, [id]);

  const p = pv.status === 'ok' ? pv.p : null;
  const idNg = pv.status === 'ng' ? pv.text : p?.sent ? 'この問題はもう流しました。同じ問題は 1 回だけです' : p && !p.solved ? 'まだ解いていない問題は流せません（自分が解いた問題だけ）' : null;
  const subjectLabel = p ? subjectName(p.subject) : subjects.length === 1 ? subjectName(subjects[0]!) : '同じ科目';
  const noLeft = !staff && left <= 0;
  const canSend = !!p && !idNg && !noLeft && !sending && state.event?.phase === 'open';

  const paste = async () => {
    setPasteNote(null);
    try {
      if (!navigator.clipboard?.readText) throw new Error('no clipboard');
      const t = (await navigator.clipboard.readText()).trim();
      if (t) setQid(t);
      else setPasteNote('コピーした ID がありません。結果画面で「コピー」を押してから貼り付けてください');
    } catch {
      setPasteNote('この画面では自動で貼り付けられません。入力欄を長押しして貼り付けてください');
    }
  };

  const send = async () => {
    if (!canSend || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    setErr(null);
    setReturned(null);
    const name = to.trim();
    try {
      const r = await sendBottle(id, name);
      if (r.returned || !r.ok) {
        setReturned(`${subjectName(r.subject)} に相手がいなかったので、ボトルが戻ってきました（ポイント・今日の数は減っていません）`);
        onSent(r);
        return;
      }
      if (r.todayLeft != null) setLeft(r.todayLeft);
      onSent(r);
      setSent(r);
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'BOTTLE_LIMIT') {
        setLeft(0);
        setErr({ where: 'all', text: `今日はもう流せません（1 日 ${state.daily} 通まで）。明日また流そう` });
      } else if (code === 'BOTTLE_DUP') setErr({ where: 'id', text: 'この問題はもう流しました。同じ問題は 1 回だけです' });
      else if (code === 'QID_UNKNOWN') setErr({ where: 'id', text: 'この ID の問題が見つかりません。ID をもう一度確かめてください' });
      else if (code === 'QID_NOT_SOLVED') setErr({ where: 'id', text: 'まだ解いていない問題は流せません（自分が解いた問題だけ）' });
      else if (code === 'TO_NOT_FOUND') setErr({ where: 'to', text: `「${name}」という名前の人は ${subjectLabel} にいません` });
      else if (code === 'TO_SELF') setErr({ where: 'to', text: '自分には流せません' });
      // 受け取りは 1 人 1 日 3 本まで（2026-10-25 先生）
      else if (code === 'TO_FULL') setErr({ where: 'to', text: `${name} さんは今日もう 3 本受け取りました。明日また流すか、宛先を空欄にしてください` });
      else if (code === 'EVENT_CLOSED') setErr({ where: 'all', text: 'イベントの期間ではないので流せません' });
      else setErr({ where: 'all', text: '流せませんでした。通信状況を確かめて、もう一度お試しください' });
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  if (sent) return <SentView r={sent} subjectName={subjectName} onTree={onTree} onEvent={onEvent} />;

  const idText = err?.where === 'id' ? err.text : idNg;
  const toNg = err?.where === 'to' ? err.text : null;

  return (
    <div className={rootClass('ev-screen is-ev-bottle')}>
      <div className="bt-glow" aria-hidden="true" style={{ opacity: 0.9 }} />

      <div className="ev-head">
        <button type="button" className="ev-sqbtn ev-px2" aria-label="イベント画面へ戻る" onClick={onBack}>
          <span className="ev-px2">
            <PxBackIcon fill="#F2F5FF" />
          </span>
        </button>
        <h1 className="bt-htitle">
          <span className="ev-dot" style={{ fontSize: 18 }}>ボトルを流す</span>
          <span className="ev-arc" style={{ fontSize: 7, color: '#A9BBD9' }}>SEND A BOTTLE</span>
        </h1>
        <span className="ev-px2 bt-left-pill">
          <span className="ev-px2 ev-dot">
            今日 あと <span className="ev-arc" style={{ fontSize: 9, color: noLeft ? '#FFB38A' : '#7EEBC6' }}>{staff ? '∞' : Math.max(0, left)}</span> 通
          </span>
        </span>
      </div>

      <div className="ev-body bt-body">
        <label htmlFor="bt-qid" className="ev-dot bt-flabel">
          <span>
            <span className="ev-arc" style={{ fontSize: 8, color: '#F6D58E' }}>01</span>　問題 ID
          </span>
        </label>
        <div style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <span className={`ev-px2 bt-input-frame${idText ? ' is-ng' : ''}`}>
            <input
              id="bt-qid"
              className="ev-px2 bt-input is-id"
              value={qid}
              placeholder="結果画面の問題 ID を貼り付け"
              autoComplete="off"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              onChange={(e) => {
                setQid(e.target.value);
                if (err?.where === 'id') setErr(null);
                setReturned(null);
              }}
            />
          </span>
          <button type="button" className="ev-px2 bt-paste" onClick={() => void paste()}>
            <span className="ev-px2 ev-dot">貼り付け</span>
          </button>
        </div>
        {pasteNote && <div className="ev-dot" style={{ fontSize: 12, lineHeight: 1.5, color: '#A9BBD9' }}>{pasteNote}</div>}

        {pv.status === 'loading' && <div className="ev-dot" style={{ fontSize: 12, color: '#A9BBD9' }}>問題を確かめています…</div>}
        {p && (
          <div className="ev-px2 bt-preview-frame">
            <div className="ev-px2 bt-preview">
              <span className="ev-px2 bt-preview-img">
                {img && img !== 'error' ? <img src={img} alt="問題の画像" /> : img === 'error' ? <span>画像を<br />読めません</span> : p.img ? <span>読み込み中…</span> : <span>画像なし</span>}
              </span>
              <span className="bt-preview-text">
                <span className="ev-dot" style={{ fontSize: 14 }}>
                  {subjectName(p.subject)}{' '}
                  <span style={{ color: '#A9BBD9' }}>
                    · {BOTTLE_QTYPE[p.type] ?? p.type} · {p.fieldName}
                  </span>
                  {p.stage === 'back' && (
                    <>
                      {' '}
                      <span className="ev-arc ev-px2 bt-tag is-abyss">ABYSS</span>
                    </>
                  )}
                </span>
                <span className="ev-dot" style={{ fontSize: 11, color: '#A9BBD9', lineHeight: 1.5 }}>
                  {examLabel(p.exam)}
                  {p.label ? ` · ${p.label}` : p.n ? ` · 問 ${p.n}` : ''}
                </span>
              </span>
            </div>
          </div>
        )}
        {idText && (
          <div className="ev-px2 bt-err-frame" role="alert">
            <div className="ev-px2 bt-err">
              <span className="ev-arc ev-px2 bt-err-tag">NG</span>
              <span className="ev-dot bt-err-text">{idText}</span>
            </div>
          </div>
        )}

        <label htmlFor="bt-to" className="ev-dot bt-flabel" style={{ marginTop: 10 }}>
          <span>
            <span className="ev-arc" style={{ fontSize: 8, color: '#F6D58E' }}>02</span>　宛先のニックネーム
          </span>
          <span style={{ fontSize: 11, color: '#A9BBD9' }}>任意</span>
        </label>
        <span className={`ev-px2 bt-input-frame${toNg ? ' is-ng' : to.trim() ? ' is-ok' : ' is-plain'}`} style={{ flex: 'none' }}>
          <input
            id="bt-to"
            className="ev-px2 bt-input"
            value={to}
            maxLength={24}
            placeholder={`空欄なら ${subjectLabel} のだれかへ`}
            autoComplete="off"
            onChange={(e) => {
              setTo(e.target.value);
              if (err?.where === 'to') setErr(null);
            }}
          />
        </span>
        {toNg && (
          <div className="ev-dot bt-hint" style={{ color: '#FFB38A' }} role="alert">
            <PxWarn />
            {toNg}
          </div>
        )}
        {!toNg && to.trim() && (
          <div className="ev-dot bt-hint" style={{ color: '#7EEBC6' }}>
            <PxCheck />
            {to.trim()} さんに届きます（名前がまちがっていたら流せません）
          </div>
        )}

        {err?.where === 'all' && (
          <div className="ev-px2 bt-err-frame" role="alert">
            <div className="ev-px2 bt-err">
              <span className="ev-arc ev-px2 bt-err-tag">NG</span>
              <span className="ev-dot bt-err-text">{err.text}</span>
            </div>
          </div>
        )}
        {returned && (
          <div className="ev-px2 bt-thin-frame" role="status" style={{ background: 'rgba(169,187,217,.45)' }}>
            <div className="ev-px2 bt-thin">
              <PxBottle size={18} variant="dim" />
              <span className="ev-dot" style={{ fontSize: 12, lineHeight: 1.5, color: '#E4EAF8' }}>{returned}</span>
            </div>
          </div>
        )}

        <div className="ev-px2 bt-notes-frame">
          <div className="ev-px2 ev-dot bt-notes">
            <span>
              <i />
              <span>
                流すと <span className="ev-arc" style={{ fontSize: 8, color: '#7EEBC6' }}>+1PT</span>。相手が正解すると相手に{' '}
                <span className="ev-arc" style={{ fontSize: 8, color: '#F6D58E' }}>+2PT</span>
              </span>
            </span>
            <span>
              <i />
              同じ問題は 1 回だけ
            </span>
            <span>
              <i />
              相手には問題だけが届く
            </span>
            <span>
              <i />
              1 人が受け取れるのは 1 日 3 本まで
            </span>
          </div>
        </div>
      </div>

      <div className="ev-foot">
        <button type="button" className="ev-cta-wrap" disabled={!canSend} onClick={() => void send()}>
          <span className="ev-px2 ev-cta">
            {sending ? (
              <span className="ev-dot" style={{ fontSize: 17 }}>流しています…</span>
            ) : noLeft ? (
              <span className="ev-dot" style={{ fontSize: 17 }}>今日の {state.daily} 通は流しました</span>
            ) : (
              <>
                <span className="ev-dot" style={{ fontSize: 18 }}>ボトルを流す</span>
                <span className="ev-arc" style={{ fontSize: 8 }}>+1PT</span>
              </>
            )}
          </span>
        </button>
      </div>
    </div>
  );
}

/** 流した（B04）: 月夜の海に流したボトル・BOTTLE SENT!・+1PT・前 → 後 */
function SentView({ r, subjectName, onTree, onEvent }: { r: BottleSendResult; subjectName: (s: string) => string; onTree: () => void; onEvent: () => void }) {
  const lines: [number, number, string, number][] = [
    [312, 0, 'rgba(255,241,207,.4) 0 20px,rgba(0,0,0,0) 20px 44px', 0],
    [332, -12, 'rgba(126,235,198,.35) 0 28px,rgba(0,0,0,0) 28px 60px', 0],
    [358, -30, 'rgba(126,235,198,.25) 0 36px,rgba(0,0,0,0) 36px 72px', 0],
    [392, 0, 'rgba(126,235,198,.18) 0 44px,rgba(0,0,0,0) 44px 92px', 0],
  ];
  return (
    <div className={rootClass('ev-screen is-ev-bottle')}>
      <div className="bt-scene" aria-hidden="true">
        <div className="bt-scene-glow" />
        <div className="bt-scene-moon" />
        <span className="bt-scene-star" style={{ left: 30, top: 96 }} />
        <span className="bt-scene-star" style={{ left: 96, top: 178, opacity: 0.6 }} />
        <span className="bt-scene-star" style={{ right: 56, top: 90, opacity: 0.7 }} />
        <div className="bt-sea-line" style={{ top: 300, background: 'rgba(255,241,207,.35)' }} />
        <div className="bt-sea" />
        {lines.map(([top, left, g], i) => (
          <div key={i} className="bt-sea-line" style={{ top, left, background: `repeating-linear-gradient(90deg,${g})` }} />
        ))}
        <PxBottle
          size={84}
          tilt={-58}
          style={{ position: 'absolute', left: 'calc(50% - 99px)', top: 236, filter: 'drop-shadow(5px 5px 0 #04102A) drop-shadow(0 0 16px rgba(126,235,198,.45))' }}
        />
      </div>

      <div className="bt-sent-text">
        <span className="ev-arc bt-chrome" style={{ fontSize: 22, lineHeight: 1.2, filter: 'drop-shadow(3px 3px 0 #120A00)' }}>BOTTLE SENT!</span>
        <span className="ev-dot" style={{ fontSize: 16 }}>{r.to ? `${r.to} さんへ流しました` : `${subjectName(r.subject)} のだれかへ流しました`}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="ev-arc ev-px2 bt-pt-chip is-glass">+1PT</span>
          {r.points && (
            <span className="ev-dot" style={{ fontSize: 14, color: '#C4D1E8' }}>
              <span className="ev-arc" style={{ fontSize: 9 }}>{r.points.before}</span> →{' '}
              <span className="ev-arc" style={{ fontSize: 11, color: '#F6D58E' }}>{r.points.after}</span> pt
            </span>
          )}
        </div>
        {r.todayLeft != null && (
          <span className="ev-dot" style={{ fontSize: 12, color: '#A9BBD9' }}>
            今日はあと {r.todayLeft} 通
          </span>
        )}
      </div>

      <div className="ev-foot" style={{ background: 'transparent', borderTop: 0 }}>
        <div className="bt-foot-row">
          <button type="button" className="ev-ghost-wrap ev-px2" style={{ flex: 1 }} onClick={onTree}>
            <span className="ev-px2 ev-ghost">
              <span className="ev-dot" style={{ fontSize: 15 }}>ツリーへ</span>
            </span>
          </button>
          <button type="button" className="ev-cta-wrap" style={{ flex: 1.3 }} onClick={onEvent}>
            <span className="ev-px2 ev-cta" style={{ height: 50 }}>
              <span className="ev-dot" style={{ fontSize: 15 }}>イベントへ</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
