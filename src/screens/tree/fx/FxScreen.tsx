/**
 * ANCHOR TREE — 演出 5 つ（2026-10-17 先生決定・ボード F1〜F5 / iPad 横 F1i〜F5i）。
 * ツリーを開いたとき /tree/events の未読を 1 つずつ全画面で出す（呼び出し側が順に出し、閉じたら既読にする）。
 *   F1 ABYSS 解放 / F2 アリーナ解放 / F3 シーズン優勝 / F4 総合優勝 / F5 新シーズン開始
 * 約 3 秒。画面タップで最後の状態へ。prefers-reduced-motion は最初から最後の状態。
 * 保険: 一定時間で最後の状態にする（WebView で animation が止まっても文字とボタンが出る）。
 * F1 に 選択・語句・数値 のチップは出さない／F4 に「総合チャンピオン」の文字は出さない（先生決定）。
 */
import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import type { TreeEvent } from '../../../lib/treeApi';
import { gradeLabel } from '../../../lib/treeApi';
import { arenaLeft, arenaPeriod, fmtScore } from '../treeTheme';
import { Col, Confetti, DROP_EASE, Flash, FxButton, FxContext, MiniTicket, Rays, Stage, an, img, useWide } from './fxKit';
import '../../../styles/tree-fx.css';

type FxAction = 'tree' | 'arena' | 'ticket';

interface Props {
  event: TreeEvent;
  subjectName: string;
  onClose: (action: FxAction) => void;
}

/** 演出の長さ（秒）+ 余裕。これを過ぎたら最後の状態にする */
const SAFETY_MS: Record<TreeEvent['type'], number> = {
  unlock_abyss: 4600,
  unlock_arena: 4000,
  champion: 5400,
  grand: 5600,
  season_start: 4000,
};

const reducedMotion = () => {
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

export function FxScreen({ event, subjectName, onClose }: Props) {
  const [done, setDone] = useState(reducedMotion);
  useEffect(() => {
    const t = window.setTimeout(() => setDone(true), SAFETY_MS[event.type] ?? 5000);
    return () => window.clearTimeout(t);
  }, [event.type]);
  const ctl = useMemo(() => ({ done, finish: () => setDone(true), close: onClose }), [done, onClose]);
  const p = { event, subjectName };
  const label =
    event.type === 'unlock_abyss'
      ? 'ABYSS 解放'
      : event.type === 'unlock_arena'
        ? 'チャンピオンアリーナ解放'
        : event.type === 'season_start'
          ? '新シーズン開始'
          : 'チャンピオン';

  return (
    <FxContext.Provider value={ctl}>
      <div
        className={`fx-root${event.type === 'unlock_abyss' ? ' is-abyss' : ''}${done ? ' is-done' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        onClick={() => setDone(true)}
      >
        {event.type === 'unlock_abyss' && <FxUnlockAbyss {...p} />}
        {event.type === 'unlock_arena' && <FxUnlockArena {...p} />}
        {event.type === 'champion' && <FxChampion {...p} />}
        {event.type === 'grand' && <FxGrandChampion {...p} />}
        {event.type === 'season_start' && <FxNewSeason {...p} />}
      </div>
    </FxContext.Provider>
  );
}

interface SceneProps {
  event: TreeEvent;
  subjectName: string;
}

/** 科目・学年・ニックネームの行 */
function WhoRow({ event, subjectName, top, wide, extend, nickSize, delay }: SceneProps & { top: number; wide: boolean; extend: number; nickSize: number; delay: number }) {
  return (
    <div className="fx-row" style={{ top, ...(wide ? { left: -extend, right: -extend } : {}), ...an('fxUp', 0.5, delay) }}>
      <span className="fx-chip">{subjectName}</span>
      {event.grade && <span className="fx-grade">{gradeLabel(event.grade)}</span>}
      <span className="fx-nick" style={{ fontSize: nickSize }}>
        {event.nickname || 'プレイヤー'}
      </span>
    </div>
  );
}

/** シーズンのカード（期間・あと n 日）*/
function SeasonCard({ event, top, delay, withName }: { event: TreeEvent; top: number; delay: number; withName: boolean }) {
  const s = event.season;
  if (!s) return null;
  return (
    <div className="fx-card" style={{ top, ...an('fxUp', 0.5, delay) }}>
      {withName ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="fx-mono" style={{ fontSize: 14, letterSpacing: '0.2em', color: '#FFD84A' }}>
            {s.n >= 1 ? `SEASON ${s.n}` : 'PRESEASON'}
          </span>
          <span style={{ fontSize: 12, color: '#CBBB93' }}>{arenaPeriod(s)}</span>
        </div>
      ) : (
        <span style={{ fontSize: 13, color: '#CBBB93' }}>{arenaPeriod(s)}</span>
      )}
      <span className="fx-dot" style={{ fontSize: 22, color: '#FFD84A', whiteSpace: 'nowrap' }}>
        {arenaLeft(s.end)}
      </span>
    </div>
  );
}

/* ── F1 ABYSS 解放: 暗転明け → 泡 → 錨が落ちて着地（波紋 2 重）→「ABYSS OPEN」が左から → 一言・ボタン ── */
const BUBBLES = [
  [40, 8, '#00E5FF', 3.2, 0.1],
  [92, 5, '#4FC3FF', 3.6, 0.4],
  [150, 10, '#00E5FF', 3, 0.2],
  [210, 6, '#D08BFF', 3.4, 0.6],
  [262, 9, '#00E5FF', 3.1, 0.3],
  [318, 5, '#4FC3FF', 3.7, 0.7],
  [350, 7, '#00E5FF', 3.3, 0.5],
] as const;

export function FxUnlockAbyss({ subjectName }: SceneProps) {
  const wide = useWide();
  // iPad は泡を左右に足す（全幅）
  const bubbles: (readonly [number, number, string, number, number])[] = wide
    ? [...BUBBLES.map(([x, d, c, t, w]) => [x + 20, d, c, t, w] as const), ...BUBBLES.map(([x, d, c, t, w], i) => [x * 2 + 420 + i * 9, d, c, t, w] as const)]
    : [...BUBBLES];
  return (
    <>
      <img
        src={img(wide ? 'fx-bg_abyss_ipad' : 'login-bg_abyss')}
        alt=""
        aria-hidden="true"
        className="fx-abs"
        style={{ inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: wide ? 0.7 : 0.4, ...an('fxFade', 1, 0) }}
      />
      <Stage w={wide ? 1194 : 390} h={wide ? 834 : 844}>
        <div
          aria-hidden="true"
          className="fx-abs"
          style={{
            ...(wide ? { left: 297, top: -40, width: 600, height: 600 } : { left: 45, top: 110, width: 300, height: 300 }),
            borderRadius: '50%',
            background: wide
              ? 'radial-gradient(circle, rgba(0,229,255,0.22) 0%, rgba(0,229,255,0) 65%)'
              : 'radial-gradient(circle, rgba(0,229,255,0.28) 0%, rgba(0,229,255,0) 70%)',
            ...an('fxFade', 0.8, 1.1),
          }}
        />
        {bubbles.map(([x, d, c, dur, delay], i) => (
          <div
            key={i}
            aria-hidden="true"
            className="fx-abs fx-gone"
            style={{
              left: x,
              bottom: wide ? -30 : -20,
              width: d,
              height: d,
              borderRadius: '50%',
              border: `1.5px solid ${c}`,
              ...an('fxRise', dur, delay, 'ease-out'),
            }}
          />
        ))}
        <Col wide={wide}>
          {(['#00E5FF', '#D08BFF'] as const).map((c, i) => (
            <div
              key={c}
              aria-hidden="true"
              className="fx-abs fx-gone"
              style={{
                left: 115,
                top: 215,
                width: 160,
                height: 160,
                boxSizing: 'border-box',
                borderRadius: '50%',
                border: `2px solid ${c}`,
                ...an('fxRing', wide ? 1.2 : 1.1, 1.15 + i * 0.2, 'ease-out'),
              }}
            />
          ))}
          <img src={img('icon_abyss')} alt="" className="fx-img" style={{ left: 129, top: 150, width: 132, ...an('fxDropA', 1, 0.3, DROP_EASE) }} />
          <div
            aria-hidden="true"
            className="fx-abs fx-gone"
            style={{
              left: 40,
              top: 330,
              width: 310,
              height: 130,
              borderRadius: '50%',
              background: 'radial-gradient(ellipse, rgba(232,250,255,0.55) 0%, rgba(0,229,255,0) 70%)',
              ...an('fxGlow', 0.9, 2.05),
            }}
          />
          <img src={img('text_abyss-open')} alt="ABYSS OPEN" className="fx-img" style={{ left: 65, top: 340, width: 260, ...an('fxReveal', 0.7, 1.4, 'steps(10)') }} />
          <div className="fx-abs" style={{ left: 0, right: 0, top: 486, textAlign: 'center', fontSize: 16, fontWeight: 600, ...an('fxUp', 0.5, 2.2) }}>
            {subjectName}の ROUTE をすべて解放しました
          </div>
          <FxButton label="深海へ" action="tree" style={{ bottom: wide ? 56 : 36, ...an('fxUp', 0.5, 2.6) }} />
        </Col>
      </Stage>
    </>
  );
}

/* ── F2 アリーナ解放: 光の筋 → 王冠が落ちて閃光 + 金の粒 →「ARENA OPEN」→ シーズンのカード・ボタン ── */
const BURST = [
  [8, '#FFD84A', 120, -80, 1.15],
  [6, '#FFF6DD', -130, -60, 1.15],
  [8, '#FFE38A', 70, -140, 1.15],
  [6, '#FFD84A', -60, -150, 1.15],
  [8, '#FF7AB8', 150, 30, 1.2],
  [6, '#D08BFF', -150, 40, 1.2],
  [6, '#FFD84A', 100, 110, 1.2],
  [8, '#FFF6DD', -100, 120, 1.2],
  [6, '#2DF4C6', 10, -170, 1.25],
  [6, '#4FC3FF', 170, -20, 1.25],
] as const;

export function FxUnlockArena({ event }: SceneProps) {
  const wide = useWide();
  return (
    <Stage w={wide ? 1194 : 390} h={wide ? 834 : 844}>
      {wide ? <Rays left={97} top={-215} size={1000} wide /> : <Rays left={-105} top={-20} size={600} />}
      <div
        aria-hidden="true"
        className="fx-abs"
        style={{
          ...(wide ? { left: 347, top: 30, width: 500, height: 500 } : { left: 45, top: 130, width: 300, height: 300 }),
          borderRadius: '50%',
          background: wide
            ? 'radial-gradient(circle, rgba(255,216,74,0.26) 0%, rgba(255,216,74,0) 65%)'
            : 'radial-gradient(circle, rgba(255,216,74,0.3) 0%, rgba(255,216,74,0) 70%)',
          ...an('fxFade', 0.8, 1),
        }}
      />
      <Col wide={wide}>
        <Flash left={115} top={200} size={160} delay={1.1} />
        {BURST.map(([s, c, x, y, d], i) => (
          <div
            key={i}
            aria-hidden="true"
            className="fx-abs fx-gone"
            style={{ left: 191, top: 276, width: s, height: s, background: c, '--x': `${x}px`, '--y': `${y}px`, ...an('fxBurst', 0.9, d, 'ease-out') } as CSSProperties}
          />
        ))}
        <img src={img('icon_crown')} alt="" className="fx-img" style={{ left: 115, top: 228, width: 160, ...an('fxDrop', 0.95, 0.35, DROP_EASE) }} />
        <div
          className="fx-abs fx-mono"
          style={{ left: 0, right: 0, top: 372, textAlign: 'center', fontSize: 12, letterSpacing: '0.3em', color: '#FFD84A', ...an('fxFade', 0.5, 1.4) }}
        >
          CHAMPION ARENA
        </div>
        <img src={img('text_arena-open')} alt="ARENA OPEN" className="fx-img" style={{ left: 65, top: 400, width: 260, ...an('fxReveal', 0.7, 1.55, 'steps(10)') }} />
        <SeasonCard event={event} top={580} delay={2.35} withName />
        <FxButton label="アリーナへ" action="arena" style={{ bottom: wide ? 56 : 36, ...an('fxUp', 0.5, 2.6) }} />
      </Col>
    </Stage>
  );
}

/* ── F3 シーズン優勝: スポットライト →「SEASON n」→ 王冠 →「CHAMPION」→ 科目・学年・ニックネーム → スコア → 紙吹雪 → ツリーへ ── */
export function FxChampion({ event, subjectName }: SceneProps) {
  const wide = useWide();
  const n = event.season?.n ?? 0;
  return (
    <Stage w={wide ? 1194 : 390} h={wide ? 834 : 844}>
      <div
        aria-hidden="true"
        className="fx-abs"
        style={{
          ...(wide ? { left: 197, width: 800, height: 640 } : { left: 0, right: 0, height: 620 }),
          top: 0,
          clipPath: wide ? 'polygon(42% 0, 58% 0, 96% 100%, 4% 100%)' : 'polygon(40% 0, 60% 0, 96% 100%, 4% 100%)',
          background: 'linear-gradient(180deg, rgba(255,216,74,0.26) 0%, rgba(255,216,74,0) 100%)',
          ...an('fxFade', 0.8, 0.1),
        }}
      />
      <Col wide={wide}>
        <div className="fx-row" style={{ top: 92, ...an('fxUp', 0.5, 0.2) }}>
          <img src={img('text_season')} alt="SEASON" style={{ width: 150, height: 'auto', display: 'block' }} />
          {n >= 1 && (
            <span className="fx-dot" style={{ fontSize: 40, color: '#FFD84A', textShadow: '0 0 12px rgba(255,216,74,0.6)' }}>
              {n}
            </span>
          )}
        </div>
        <Flash left={105} top={160} size={180} delay={1.15} />
        <img src={img('icon_crown')} alt="" className="fx-img" style={{ left: 110, top: 178, width: 170, ...an('fxDrop', 0.95, 0.5, DROP_EASE) }} />
        <img src={img('text_champion')} alt="CHAMPION" className="fx-img" style={{ left: 40, top: 306, width: 310, ...an('fxReveal', 0.8, 1.3, 'steps(12)') }} />
        <WhoRow event={event} subjectName={subjectName} top={396} wide={wide} extend={100} nickSize={22} delay={1.95} />
        {event.score != null && (
          <div className="fx-row" style={{ top: 446, alignItems: 'baseline', gap: 8, ...an('fxPop', 0.6, 2.2) }}>
            <span className="fx-dot" style={{ fontSize: 64, lineHeight: 1.1, color: '#FFD84A', textShadow: '0 0 18px rgba(255,216,74,0.6)' }}>
              {fmtScore(event.score)}
            </span>
            <span style={{ fontSize: 14, color: '#CBBB93' }}>/ 1,000</span>
          </div>
        )}
        <FxButton label="ツリーへ" action="tree" style={{ bottom: wide ? 56 : 36, ...an('fxUp', 0.5, 2.7) }} />
      </Col>
      <Confetti w={wide ? 1194 : 390} n={wide ? 30 : 21} fall={wide ? 900 : 920} />
    </Stage>
  );
}

/* ── F4 総合優勝: 光の筋 +「SEASON n–n+1」→ 王冠 →「CHAMPION」→ 科目・学年・ニックネーム → 合算スコア → チケットが滑り込む → チケットを見る ── */
export function FxGrandChampion({ event, subjectName }: SceneProps) {
  const wide = useWide();
  const pair = event.pair ?? [];
  const label = pair.length >= 2 ? `${pair[0]!.n}–${pair[1]!.n}` : '';
  const premium = !!event.ticket?.premium;
  const ticketStyle: CSSProperties = wide
    ? { left: 660, top: premium ? 236 : 250, width: 380, height: premium ? 220 : 190, ...an('fxTicketR', 0.8, 2.8, DROP_EASE) }
    : { left: 34, top: premium ? 456 : 470, width: 322, height: premium ? 186 : 160, ...an('fxTicket', 0.8, 2.8, DROP_EASE) };
  const content = (
    <>
      <div className="fx-row" style={{ top: 60, ...an('fxUp', 0.5, 0.2) }}>
        <img src={img('text_season')} alt="SEASON" style={{ width: 130, height: 'auto', display: 'block' }} />
        {label && (
          <span className="fx-dot" style={{ fontSize: 34, color: '#FFD84A', textShadow: '0 0 12px rgba(255,216,74,0.6)' }}>
            {label}
          </span>
        )}
      </div>
      <Flash left={105} top={110} size={180} delay={1.15} />
      <img src={img('icon_crown')} alt="" className="fx-img" style={{ left: 118, top: 124, width: 154, ...an('fxDrop', 0.95, 0.5, DROP_EASE) }} />
      <img src={img('text_champion')} alt="CHAMPION" className="fx-img" style={{ left: 45, top: 232, width: 300, ...an('fxReveal', 0.8, 1.3, 'steps(12)') }} />
      <WhoRow event={event} subjectName={subjectName} top={308} wide={wide} extend={60} nickSize={20} delay={1.95} />
      {event.score != null && (
        <div
          className="fx-row"
          style={{ top: wide ? 350 : 348, alignItems: 'baseline', gap: 8, ...(wide ? { left: -60, right: -60 } : {}), ...an('fxPop', 0.6, 2.2) }}
        >
          <span className="fx-dot" style={{ fontSize: wide ? 52 : 48, lineHeight: 1.1, color: '#FFD84A', textShadow: '0 0 16px rgba(255,216,74,0.6)' }}>
            {fmtScore(event.score)}
          </span>
          <span style={{ fontSize: 12, color: '#CBBB93' }}>2シーズン合算</span>
        </div>
      )}
    </>
  );
  return (
    <Stage w={wide ? 1194 : 390} h={wide ? 834 : 844}>
      {wide ? <Rays left={-125} top={-270} size={1000} wide /> : <Rays left={-105} top={-95} size={600} />}
      {wide ? (
        <div className="fx-abs" style={{ left: 180, top: 70, width: 390, height: 700 }}>
          {content}
        </div>
      ) : (
        content
      )}
      <MiniTicket premium={premium} wide={wide} style={ticketStyle} />
      <FxButton
        label="チケットを見る"
        action="ticket"
        style={wide ? { left: 660, right: 'auto', width: 380, top: 500, ...an('fxUp', 0.5, 3.4) } : { bottom: 30, ...an('fxUp', 0.5, 3.4) }}
      />
      <Confetti w={wide ? 1194 : 390} n={wide ? 26 : 19} fall={wide ? 900 : 920} />
    </Stage>
  );
}

/* ── F5 新シーズン開始: 走査線 3 本 → 床の格子 → 小さな王冠 →「SEASON」が左から → 数字が叩きつけられて揺れる →「START」→ 期間・あと n 日 → アリーナへ ── */
export function FxNewSeason({ event }: SceneProps) {
  const wide = useWide();
  const n = event.season?.n ?? 0;
  return (
    <Stage w={wide ? 1194 : 390} h={wide ? 834 : 844}>
      <div className="fx-shake" style={{ animation: 'fxShake 0.4s linear 1.45s 1' }}>
        <div
          aria-hidden="true"
          className="fx-grid"
          style={{
            ...(wide
              ? { left: -400, right: -400, height: 700, transform: 'perspective(360px) rotateX(64deg)', backgroundSize: '72px 72px' }
              : { left: -200, right: -200, height: 640, transform: 'perspective(320px) rotateX(62deg)', backgroundSize: '64px 64px' }),
            ...an('fxFade', 0.8, 0.2),
          }}
        />
        {(
          [
            ['#FFD84A', 3, 14, 0.05],
            ['#D08BFF', 2, 12, 0.2],
            ['#2DF4C6', 2, 12, 0.35],
          ] as const
        ).map(([c, h, g, d]) => (
          <div
            key={c}
            aria-hidden="true"
            className="fx-abs fx-gone"
            style={{ left: wide ? -400 : -100, right: wide ? -400 : -100, top: 0, height: h, background: c, boxShadow: `0 0 ${g}px ${c}`, ...an('fxScan', 0.9, d, 'ease-in') }}
          />
        ))}
        <Col wide={wide}>
          <img src={img('icon_crown_mono')} alt="" className="fx-img" style={{ left: 175, top: wide ? 120 : 140, width: 40, ...an('fxFade', 0.5, 0.5) }} />
          <img
            src={img('text_season')}
            alt="SEASON"
            className="fx-img"
            style={{ left: wide ? 75 : 95, top: wide ? 180 : 206, width: wide ? 240 : 200, ...an('fxSlideL', 0.55, 0.65, DROP_EASE) }}
          />
          <div
            aria-hidden="true"
            className="fx-abs fx-gone"
            style={{
              ...(wide ? { left: 70, top: 240, width: 250, height: 200 } : { left: 95, top: 260, width: 200, height: 170 }),
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,233,168,0.7) 0%, rgba(255,216,74,0) 65%)',
              ...an('fxGlow', 0.8, 1.4),
            }}
          />
          <div
            className="fx-abs fx-dot"
            style={{
              left: 0,
              right: 0,
              top: wide ? 240 : 262,
              textAlign: 'center',
              fontSize: wide ? 160 : 136,
              lineHeight: 1,
              color: '#FFD84A',
              textShadow: wide ? '0 0 26px rgba(255,216,74,0.7), 7px 7px 0 #A88A14' : '0 0 24px rgba(255,216,74,0.7), 6px 6px 0 #A88A14',
              ...an('fxSlam', 0.55, 1.1, 'cubic-bezier(0.3,0.7,0.3,1)'),
            }}
          >
            {n >= 1 ? n : ''}
          </div>
          <img
            src={img('text_start')}
            alt="START"
            className="fx-img"
            style={{ left: wide ? 70 : 85, top: 430, width: wide ? 250 : 220, ...an('fxReveal', 0.6, 1.75, 'steps(8)') }}
          />
          <SeasonCard event={event} top={wide ? 556 : 560} delay={2.35} withName={false} />
          <FxButton label="アリーナへ" action="arena" style={{ bottom: wide ? 56 : 36, ...an('fxUp', 0.5, 2.6) }} />
        </Col>
      </div>
    </Stage>
  );
}
