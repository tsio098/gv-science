/**
 * 季節イベントの通知（2026-10-20・ClaudeCode指示_ハロウィン実装 §6・季節イベントのボード「獲得の演出と効果音」）。
 *   EVENT CLEAR!!  … その科目のイベントの MASTER がはじめて 100%（EVENT トロフィー ＋ 初めてなら錨のアイコン）。タップでイベント画面
 *   TICKET GET!    … テスト合格でイベント限定チケット（10/31 のみ使用可能）。タップでチケット画面
 * 部品と動きはトロフィーの通知と同じ（tt-beam / tt-in / tt-flash / tt-pop / tt-burst / tt-stamp / tt-blink / tt-name / tt-timer）。
 * 幅 272・6 秒・畳まない・その回の通知の最後（toastQueue の LATE）。WebView で止まっても .is-done で最後の状態が見える
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { toastSpeed } from './labSpeed';
import { CHROME } from './TrophyIcon';
import { toastNameSize, toastWidth, type ToastItem } from './toastQueue';
import { EV_ASSET } from '../event/evTheme';

const ORANGE_CHROME = CHROME.E;
const PURPLE_CHROME = CHROME.evPurple;

/** ドットのカレンダー（12px）*/
export function PxCalendar({ size = 12, fill = '#FF9A1F' }: { size?: number; fill?: string }) {
  return (
    <svg viewBox="0 0 8 8" width={size} height={size} shapeRendering="crispEdges" aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <path d="M0 1h8v7H0zM1 3h6v4H1zM2 4h2v2H2zM2 0h1v2H2zM5 0h1v2H5z" fill={fill} fillRule="evenodd" />
    </svg>
  );
}

export function EventToastCard({ item, wide, out = false, onTap }: { item: ToastItem; wide: boolean; out?: boolean; onTap: () => void }) {
  const clear = item.kind === 'evClear';
  const w = toastWidth(item, wide);
  const fs = toastNameSize(item, wide);
  const kind = item.ev?.kind ?? 'halloween';
  const a = EV_ASSET(kind);
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

  const frame = clear
    ? 'linear-gradient(120deg,#FF9A1F 0%,#FFC872 35%,#C9A2FF 70%,#8A4FE0 100%)'
    : 'linear-gradient(120deg,#C9A2FF 0%,#8A4FE0 35%,#FF9A1F 70%,#FFC872 100%)';
  const glow = `drop-shadow(4px 4px 0 #3A1458) drop-shadow(0 0 14px ${clear ? 'rgba(255,154,31,.55)' : 'rgba(201,162,255,.55)'})`;
  const timerBg = clear
    ? 'repeating-linear-gradient(90deg,#FF9A1F 0 8px,rgba(0,0,0,0) 8px 10px,#C9A2FF 10px 18px,rgba(0,0,0,0) 18px 20px)'
    : 'repeating-linear-gradient(90deg,#C9A2FF 0 8px,rgba(0,0,0,0) 8px 10px,#FF9A1F 10px 18px,rgba(0,0,0,0) 18px 20px)';
  const aria = clear
    ? `EVENT CLEAR。EVENT トロフィー ${item.main} を獲得。${item.sub ?? ''}。タップでイベント画面`
    : `TICKET GET。${item.main}。${item.sub ?? ''}。タップでチケットを見る`;

  return (
    <div ref={slotRef} className={`tt-slot ev-tslot${done ? ' is-done' : ''}${out ? ' is-out' : ''}`} style={{ width: w + 14, height: 90 }}>
      <span className="tt-beamline tt-beam" aria-hidden="true" style={{ top: 31, width: w, boxShadow: `0 0 8px ${clear ? '#FF9A1F' : '#C9A2FF'},0 0 2px #FFFFFF` }} />
      <button ref={ref} type="button" className="tt-toast tt-in is-ev" style={{ width: w, filter: glow }} aria-label={aria} onClick={onTap}>
        <span className="tt-frame tt-px" style={{ background: frame, padding: 4 }}>
          <span className="tt-body tt-px" style={{ background: 'linear-gradient(180deg,#2E1650,#0E0520)', padding: '8px 10px 11px 8px', gap: 10 }}>
            <span
              className={`tt-well tt-px2${clear ? ' tt-pop' : ''}`}
              style={{
                width: 50,
                height: 50,
                overflow: 'hidden',
                background: clear ? 'radial-gradient(circle,rgba(255,154,31,.45),rgba(14,5,32,1) 72%)' : 'radial-gradient(circle,rgba(201,162,255,.4),rgba(14,5,32,1) 72%)',
              }}
            >
              {clear ? (
                <img src={a.trophy} alt="" style={{ width: 44, height: 44, display: 'block', objectFit: 'contain', imageRendering: 'pixelated' }} />
              ) : (
                <span className="ev-tk-mini ev-slide">
                  <img src={a.icon2x} alt="" style={{ width: 20, height: 20, display: 'block', imageRendering: 'pixelated' }} />
                  <i aria-hidden="true" />
                </span>
              )}
            </span>
            <span className="tt-text" style={{ gap: 5 }}>
              {clear ? (
                <span className="tt-head tt-blink" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span className="tt-arc tt-chrome" style={{ fontSize: 7, lineHeight: 1, backgroundImage: ORANGE_CHROME }}>EVENT</span>
                  <img src={a.clearText} alt="CLEAR!!" style={{ height: 14, width: 'auto', display: 'block' }} />
                </span>
              ) : (
                <span className="tt-arc tt-chrome tt-head tt-blink" style={{ backgroundImage: PURPLE_CHROME }}>{item.head}</span>
              )}
              <span className="tt-dot tt-main tt-name" style={{ fontSize: fs, lineHeight: 1.1, color: '#FFFFFF', textShadow: '2px 2px 0 #140600' }}>
                {item.main}
              </span>
              <span className="tt-row tt-name">
                {clear ? (
                  <span className="tt-dot tt-sub" style={{ color: '#E6D2FF' }}>{item.sub}</span>
                ) : (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', minWidth: 0 }}>
                    <PxCalendar size={9} />
                    <span className="tt-arc tt-chrome" style={{ fontSize: 7, lineHeight: 1, backgroundImage: ORANGE_CHROME, filter: 'none' }}>{item.ev?.stamp}</span>
                    <span className="tt-dot" style={{ fontSize: 10, lineHeight: 1, color: '#FFE6C2' }}>のみ使用可能</span>
                  </span>
                )}
                <span className="tt-arc tt-pt">TAP ▶</span>
              </span>
              {clear && (
                <span className="tt-l30bar" aria-hidden="true">
                  <span className="l-fill ev-fill" />
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
        {clear && (
          <span
            className="tt-burstdot tt-burst"
            aria-hidden="true"
            style={{ left: 33, top: 33, width: 4, height: 4, color: '#FFFFFF', boxShadow: '0 -16px #FF9A1F,12px -12px #FFC872,16px 0 #C9A2FF,12px 12px #FF9A1F,0 16px #FFC872,-12px 12px #C9A2FF,-16px 0 #FF9A1F,-12px -12px #FFC872' }}
          />
        )}
        <span className={`tt-stamp1 tt-arc tt-stamp ev-stamp${clear ? '' : ' is-ticket'}`} aria-hidden="true">
          {item.ev?.stamp}
        </span>
        {clear && (
          <span className="ev-tghost" aria-hidden="true">
            <img className="ev-bob" src={a.ghost} alt="" />
          </span>
        )}
        <img className="tt-sparkle tt-spark" src={a.star} alt="" aria-hidden="true" style={{ left: clear ? 58 : 62, bottom: -9, width: 13, height: 13, imageRendering: 'pixelated' }} />
        <img
          className="tt-sparkle tt-spark"
          src={a.star}
          alt=""
          aria-hidden="true"
          style={{ ...(clear ? { left: -7, top: 6 } : { right: 30, bottom: -8 }), width: 10, height: 10, imageRendering: 'pixelated', animationDelay: '1.45s' }}
        />
      </button>
    </div>
  );
}
