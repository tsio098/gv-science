/**
 * Message in a Bottle の通知（2026-10-25・ボード Nodes / FX_bottle / FX_trophy・実装手順_ボトルメール §0-2）。
 *   NEW BOTTLE!   … ツリーを開いたとき未読のボトルがある（スタンプ x{n}）。タップでイベント画面
 *   ???           … 50 pt に届いた後に 1 回だけ（招待状とは書かない・スタンプ 50PT・シアン）。タップで招待状
 *   RETURNED      … 流したボトルの相手が見つからなかった（銀・スタンプなし・音なし）
 *   EVENT CLEAR!! … 100 pt（金のボトル・バーが 8 段で満ちる・スタンプ 100PT）。タップでイベント画面
 * 部品と動きはトロフィー・EVENT CLEAR!! の通知と同じ（tt-beam / tt-in / tt-flash / tt-pop / tt-burst / tt-stamp / tt-blink / tt-name / tt-timer）＋
 * ボトル用の bt-rise（ボトルが浮かび上がる）・bt-bub（泡）。幅 272・6 秒・畳まない。WebView で止まっても .is-done で最後の状態が見える
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toastSpeed } from './labSpeed';
import { toastNameSize, toastWidth, type ToastItem } from './toastQueue';
import { PxBottle } from '../event/BottleParts';
import '../../../styles/tree-bottle.css';

const GOLD = 'linear-gradient(180deg,#FFFFFF 0%,#FFF1CF 30%,#F6D58E 52%,#A9792E 52%,#E7B85C 74%,#FFE7A8 100%)';
const CYAN = 'linear-gradient(180deg,#FFFFFF 0%,#C9FAFF 30%,#00E5FF 52%,#0089A8 52%,#2CC8E0 74%,#B8F7FF 100%)';
const SILVER = 'linear-gradient(180deg,#FFFFFF 0%,#EEF2FA 30%,#C9D3E6 52%,#6E7A92 52%,#A7B2C8 74%,#E6ECF7 100%)';

/** 招待状の ??? の絵（深海の「?」8×10・シアン。ボード FX_bottle の SVG のまま・2026-10-26 しずくから戻す）*/
function PxQuestion() {
  return (
    <svg viewBox="0 0 8 10" width="24" height="30" shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', filter: 'drop-shadow(0 0 6px rgba(0,229,255,.8))' }}>
      <path fill="#00E5FF" d="M1 0h6v1H1zM0 1h2v2H0zM6 1h2v2H6zM5 3h2v1H5zM4 4h2v1H4zM3 5h2v2H3zM3 8h2v2H3z" />
    </svg>
  );
}

export function BottleToastCard({ item, wide, out = false, onTap }: { item: ToastItem; wide: boolean; out?: boolean; onTap: () => void }) {
  const w = toastWidth(item, wide);
  const fs = toastNameSize(item, wide);
  const ref = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  useLayoutEffect(() => {
    const sp = toastSpeed();
    if (sp === 1) return;
    try {
      for (const an of slotRef.current?.getAnimations({ subtree: true }) ?? []) an.playbackRate = sp;
    } catch {
      /* 古い端末は通常の速さ */
    }
  }, [out]);
  // 入場の保険（トロフィーの通知と同じ）: 1.5 秒で描き終わっていなければ最後の状態に・3.6 秒でも
  useEffect(() => {
    const sp = toastSpeed();
    const check = window.setTimeout(() => {
      const el = ref.current;
      if (el && /100%/.test(getComputedStyle(el).clipPath || '')) setDone(true);
    }, 1500 / sp);
    const t = window.setTimeout(() => setDone(true), 3600 / sp);
    return () => {
      window.clearTimeout(check);
      window.clearTimeout(t);
    };
  }, []);

  const k = item.kind;
  const mystery = k === 'bottleMystery';
  const returned = k === 'bottleReturned';
  const clear = k === 'bottleClear';
  const frame = mystery
    ? 'linear-gradient(120deg,#00E5FF 0%,#B8F7FF 35%,#D08BFF 70%,#5A2E9A 100%)'
    : returned
      ? 'linear-gradient(120deg,#C9D3E6 0%,#FFFFFF 35%,#7F93B8 70%,#3E4A66 100%)'
      : clear
        ? 'linear-gradient(120deg,#FFF1CF 0%,#F6D58E 35%,#E7B85C 65%,#7E5A1E 100%)'
        : 'linear-gradient(120deg,#F6D58E 0%,#FFF1CF 35%,#7EEBC6 70%,#2A8C72 100%)';
  const glowC = mystery ? 'rgba(0,229,255,.55)' : returned ? 'rgba(201,211,230,.35)' : 'rgba(246,213,142,.5)';
  const glow = `drop-shadow(4px 4px 0 ${mystery ? '#01060F' : '#04102A'}) drop-shadow(0 0 14px ${glowC})`;
  const bg = mystery ? 'linear-gradient(180deg,#111E3E,#02050E)' : 'linear-gradient(180deg,#183C68,#071631)';
  const well = mystery
    ? 'radial-gradient(circle,rgba(0,229,255,.4),rgba(2,5,14,1) 72%)'
    : returned
      ? 'radial-gradient(circle,rgba(201,211,230,.3),rgba(7,22,49,1) 72%)'
      : clear
        ? 'radial-gradient(circle,rgba(246,213,142,.5),rgba(7,22,49,1) 72%)'
        : 'radial-gradient(circle,rgba(126,235,198,.45),rgba(7,22,49,1) 72%)';
  const chrome = mystery ? CYAN : returned ? SILVER : GOLD;
  const timerBg = mystery
    ? 'repeating-linear-gradient(90deg,#00E5FF 0 8px,rgba(0,0,0,0) 8px 10px,#D08BFF 10px 18px,rgba(0,0,0,0) 18px 20px)'
    : returned
      ? 'repeating-linear-gradient(90deg,#C9D3E6 0 8px,rgba(0,0,0,0) 8px 10px,#7F93B8 10px 18px,rgba(0,0,0,0) 18px 20px)'
      : 'repeating-linear-gradient(90deg,#F6D58E 0 8px,rgba(0,0,0,0) 8px 10px,#7EEBC6 10px 18px,rgba(0,0,0,0) 18px 20px)';
  const stamp = item.bottle?.stamp;
  const aria = `${item.head}。${item.main}。${item.sub ?? ''}。${returned ? '' : mystery ? 'タップで開く' : 'タップでイベント画面'}`;

  return (
    <div ref={slotRef} className={`tt-slot ev-tslot${done ? ' is-done' : ''}${out ? ' is-out' : ''}`} style={{ width: w + 14, height: 90 }}>
      <span className="tt-beamline tt-beam" aria-hidden="true" style={{ top: 31, width: w, boxShadow: `0 0 8px ${mystery ? '#00E5FF' : '#F6D58E'},0 0 2px #FFFFFF` }} />
      <button ref={ref} type="button" className="tt-toast tt-in is-ev" style={{ width: w, filter: glow }} aria-label={aria} onClick={onTap}>
        <span className="tt-frame tt-px" style={{ background: frame, padding: 4 }}>
          <span className="tt-body tt-px" style={{ background: bg, padding: '8px 10px 11px 8px', gap: 10 }}>
            <span className={`tt-well tt-px2 ${clear ? 'tt-pop' : 'bt-rise'}`} style={{ width: 50, height: 50, overflow: 'hidden', background: well }}>
              {mystery ? <PxQuestion /> : <PxBottle size={34} variant={clear ? 'gold' : returned ? 'dim' : 'glass'} glow={clear} />}
            </span>
            <span className="tt-text" style={{ gap: 5 }}>
              <span className="tt-arc tt-chrome tt-head tt-blink" style={{ backgroundImage: chrome }}>
                {item.head}
              </span>
              <span className="tt-dot tt-main tt-name" style={{ fontSize: fs, lineHeight: 1.1, color: '#FFFFFF', textShadow: '2px 2px 0 #04102A', whiteSpace: 'nowrap' }}>
                {item.main}
              </span>
              <span className="tt-row tt-name">
                <span className={mystery ? 'tt-arc' : 'tt-dot tt-sub'} style={{ color: '#C4D1E8', fontSize: mystery ? 7 : 10, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.sub}
                </span>
                {!returned && <span className="tt-arc tt-pt">TAP ▶</span>}
              </span>
              {clear && (
                <span className="tt-l30bar" aria-hidden="true">
                  <span className="l-fill bt-fill" />
                </span>
              )}
            </span>
            <span className="tt-scan" />
            <span className="tt-flashbox tt-flash" />
            <span className="tt-timerbox">
              <span className="tt-timer ev-timer" style={{ background: timerBg }} />
            </span>
          </span>
        </span>
        {!returned && (
          <span
            className="tt-burstdot tt-burst"
            aria-hidden="true"
            style={{
              left: 33, top: 33, width: 4, height: 4, color: '#FFFFFF',
              boxShadow: mystery
                ? '0 -16px #00E5FF,12px -12px #B8F7FF,16px 0 #D08BFF,12px 12px #00E5FF,0 16px #B8F7FF,-12px 12px #D08BFF,-16px 0 #00E5FF,-12px -12px #B8F7FF'
                : '0 -16px #F6D58E,12px -12px #7EEBC6,16px 0 #FFF1CF,12px 12px #F6D58E,0 16px #7EEBC6,-12px 12px #FFF1CF,-16px 0 #F6D58E,-12px -12px #7EEBC6',
            }}
          />
        )}
        {stamp && (
          <span className={`tt-stamp1 tt-arc tt-stamp bt-stamp${mystery ? ' is-cyan' : ''}`} aria-hidden="true">
            {stamp}
          </span>
        )}
        {/* 泡（ボトルの上に 3 つ・3 回だけ浮かぶ）*/}
        {!returned && (
          <>
            <span className="bt-bub" aria-hidden="true" style={{ left: 26, top: 4, width: 5, height: 5 }} />
            <span className="bt-bub" aria-hidden="true" style={{ left: 40, top: -2, width: 4, height: 4, animationDelay: '1.5s' }} />
            <span className="bt-bub" aria-hidden="true" style={{ left: 18, top: -6, width: 3, height: 3, animationDelay: '1.7s' }} />
          </>
        )}
      </button>
    </div>
  );
}
