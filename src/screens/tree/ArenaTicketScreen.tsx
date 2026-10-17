/**
 * ANCHOR TREE — チケット（2026-10-17 先生決定・実装手順_ロゴ・アリーナ・演出 §5.5）。
 * 2 種類: ABYSS チケット（全分野マスター度 60% を初めて満たした科目ごとに 1 枚・ボード TicketAbyss の深海配色）と、
 * 総合優勝のボーナスチケット（下）。使い方はどちらも同じ（半券を切る・サーバで 1 回だけ）。
 * 2 シーズン（組）の総合チャンピオンに 1 枚。先生の 2 シーズン合算を超えていればプレミアム。
 * 表記は「SEASON n–n+1 総合チャンピオン」・学年 · ニックネーム・小さく「先生へ提示してください」だけ（特典・番号・期限は出さない）。
 * 使い方: 先生の前で半券（横向きは右端・縦向きは下端の点線から先）を横へスワイプして切り取る →
 * 半券の幅の 60% を超えて離したらサーバに使用を記録（1 回だけ）→ 半券が飛んでいき、以後はギザギザの切り口・グレー・USED。
 * 途中で離した・通信に失敗したら半券は元に戻る。使用済み（409 TICKET_USED）なら使用済みの表示にする。
 */
import { useEffect, useRef, useState } from 'react';
import type { TreeTicket } from '../../lib/treeApi';
import { TreeApiError, gradeLabel, redeemTreeTicket } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { rootClass } from './treeTheme';
import '../../styles/tree-ticket.css';

const BRAND = '/tree/brand/';
/** 半券をこれ以上引いて離したら切り取る（半券の幅に対する割合）*/
const CUT_RATIO = 0.6;

interface Props {
  tickets: TreeTicket[];
  subjectName: (subject: string) => string;
  onUsed: (id: string, usedAt: number) => void;
  onBack: () => void;
  /**
   * 先生用のテスト（2026-10-17 先生の依頼）: 渡したチケットは見本。半券を切ってもサーバには記録せず、
   * 「もう一度試す」で元に戻せる（本物のチケットは先生アカウントには配られない）
   */
  demo?: boolean;
}

/** 幅 600px 以上は横向きのチケット（半券は右端）、それより狭いと縦向き（半券は下端）*/
function useWide() {
  const q = '(min-width: 600px)';
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(q).matches);
  useEffect(() => {
    if (!window.matchMedia) return;
    const m = window.matchMedia(q);
    const on = () => setWide(m.matches);
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  return wide;
}

export function ArenaTicketScreen({ tickets, subjectName, onUsed, onBack, demo = false }: Props) {
  const wide = useWide();
  /** テストのやり直し（チケットを作り直して半券を戻す）*/
  const [round, setRound] = useState(0);
  // ABYSS チケットだけなら深海の画面・見出しは錨 + 「{科目} · ABYSS」、総合優勝のチケットがあればアリーナの画面
  const abyssOnly = tickets.length > 0 && tickets.every((t) => t.kind === 'abyss');
  const subjects = [...new Set(tickets.map((t) => t.subject))];
  return (
    <div className={rootClass('tk-screen') + (abyssOnly ? ' is-abyss' : ' is-arena')}>
      <div className="tr-ar-head">
        {abyssOnly ? (
          <>
            <img className="crown" src={BRAND + 'icon_abyss.svg'} alt="" style={{ width: 26 }} />
            <span className="tk-abyss-head">{subjects.length === 1 ? `${subjectName(subjects[0]!)} · ABYSS` : 'ABYSS'}</span>
          </>
        ) : (
          <>
            <img className="crown" src={BRAND + 'icon_crown.svg'} alt="" style={{ width: 28 }} />
            <img className="logo" src={BRAND + 'arena_logo-1line.svg'} alt="CHAMPION ARENA" style={{ width: 160 }} />
          </>
        )}
        <button type="button" className="tr-ar-close" aria-label="閉じる" onClick={onBack}>
          <Ico id="i-close" size={16} />
        </button>
      </div>
      <div className="tk-body">
        {demo && <div className="tk-demo-note">先生用のテスト表示です。半券を切っても記録されません。</div>}
        {tickets.map((t) => (
          <div key={`${t.id}:${round}`} className="tk-item">
            {(tickets.length > 1 || demo) && (
              <div className="tk-cap">
                {demo
                  ? t.kind === 'abyss' ? 'ABYSS（見本）' : t.premium ? 'プレミアム（見本）' : '通常（見本）'
                  : `${subjectName(t.subject)} · ${t.kind === 'abyss' ? 'ABYSS' : '総合優勝'}`}
              </div>
            )}
            <Ticket ticket={t} wide={wide} onUsed={onUsed} demo={demo} subjectName={subjectName(t.subject)} />
          </div>
        ))}
        {demo && (
          <button type="button" className="tr-ar-btn2" onClick={() => setRound((n) => n + 1)}>
            もう一度試す
          </button>
        )}
      </div>
    </div>
  );
}

/** ABYSS チケットの泡（小さな円・静止）*/
function Bubbles() {
  return (
    <div className="tk-bubbles" aria-hidden="true">
      <i style={{ left: '62%', top: '18%', width: 9, height: 9, borderColor: 'rgba(0,229,255,0.5)' }} />
      <i style={{ left: '78%', top: '52%', width: 6, height: 6, borderColor: 'rgba(208,139,255,0.55)' }} />
      <i style={{ left: '84%', top: '26%', width: 12, height: 12, borderColor: 'rgba(79,195,255,0.45)' }} />
    </div>
  );
}

function Arrows() {
  return (
    <svg className="tk-arrows" width="54" height="22" viewBox="0 0 54 22" fill="none" strokeWidth="3" aria-hidden="true">
      <path d="M4 3l8 8-8 8M22 3l8 8-8 8M40 3l8 8-8 8" />
    </svg>
  );
}

type Phase = 'idle' | 'drag' | 'snap' | 'sending' | 'fly' | 'used';

function Ticket({ ticket, wide, onUsed, demo, subjectName }: { ticket: TreeTicket; wide: boolean; onUsed: (id: string, usedAt: number) => void; demo: boolean; subjectName: string }) {
  const [phase, setPhase] = useState<Phase>(ticket.usedAt ? 'used' : 'idle');
  const [dx, setDx] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  /** 半券の幅（引き始めに測る）*/
  const [stubW, setStubW] = useState(1);
  const stub = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; w: number } | null>(null);

  useEffect(() => {
    if (ticket.usedAt) setPhase('used');
  }, [ticket.usedAt]);

  const used = phase === 'used';
  const abyss = ticket.kind === 'abyss';
  const premium = !abyss && ticket.premium;
  const [s1, s2] = ticket.pair ?? [];
  const title = abyss ? `${subjectName} ABYSS 開放` : `SEASON ${s1?.n ?? ''}–${s2?.n ?? ''} 総合チャンピオン`;
  const who = `${gradeLabel(ticket.grade)} · ${ticket.nickname}`;

  const cut = async () => {
    setPhase('sending');
    try {
      // 先生用のテストはサーバに送らない（通信の間を少しだけ再現）
      const r = demo ? await new Promise<{ usedAt: number }>((ok) => window.setTimeout(() => ok({ usedAt: Date.now() }), 250)) : await redeemTreeTicket(ticket.kind, ticket.id, ticket.sig);
      setPhase('fly');
      window.setTimeout(() => {
        setPhase('used');
        onUsed(ticket.id, r.usedAt);
      }, 460);
    } catch (e) {
      const code = e instanceof TreeApiError ? e.code : '';
      if (code === 'TICKET_USED') {
        setPhase('fly');
        window.setTimeout(() => {
          setPhase('used');
          onUsed(ticket.id, Date.now());
        }, 460);
        return;
      }
      setErr(
        code === 'TICKET_INVALID' || code === 'NO_TICKET'
          ? 'このチケットは使えません。'
          : '通信できませんでした。もう一度切り取ってください。'
      );
      setDx(0);
      setPhase('snap');
    }
  };

  const onDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase !== 'idle' && phase !== 'snap') return;
    const el = stub.current;
    if (!el) return;
    drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY, w: el.offsetWidth || 1 };
    setStubW(el.offsetWidth || 1);
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* 古い WebView */
    }
    setErr(null);
    setPhase('drag');
  };
  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    setDx(Math.max(0, e.clientX - d.x));
  };
  const onUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const pulled = Math.max(0, e.clientX - d.x);
    if (e.type === 'pointerup' && pulled > d.w * CUT_RATIO) {
      setDx(pulled);
      void cut();
    } else {
      setDx(0);
      setPhase('snap');
    }
  };

  // 引いた量に応じて少し傾ける（横向き 9°・縦向き 6° まで）。飛ぶときは画面の外へ
  const w = stubW;
  const tilt = Math.min(1, dx / w) * (wide ? 9 : 6);
  const stubStyle: React.CSSProperties =
    phase === 'fly'
      ? { transform: `translate(${Math.max(dx, w) * 1.6}px, ${wide ? 40 : 60}px) rotate(${wide ? 28 : 22}deg)` }
      : { transform: dx ? `translateX(${dx}px) rotate(${tilt}deg)` : undefined };

  return (
    <>
      <div
        className={`tk ${wide ? 'tk--h' : 'tk--v'}${premium ? ' is-premium' : ''}${abyss ? ' is-abyss' : ''}${used ? ' is-used' : ''}`}
        role="group"
        aria-label={`${abyss ? 'ABYSS チケット' : 'ボーナスチケット'} ${title}${used ? '（使用済み）' : ''}`}
      >
        <div className="tk-main">
          <div className="tk-face">
            {premium && <div className="tk-shine" aria-hidden="true" />}
            {abyss && <Bubbles />}
            <div className="tk-content">
              <div className="tk-brand">
                <img className="tk-crown" src={BRAND + (abyss ? 'icon_abyss.svg' : 'icon_crown.svg')} alt="" />
                <div className="tk-words">
                  <img className="tk-champion" src={BRAND + (abyss ? 'text_abyss.svg' : 'text_champion.svg')} alt={abyss ? 'ABYSS' : 'CHAMPION'} />
                  {premium && <img className="tk-premium" src={BRAND + 'text_premium.svg'} alt="PREMIUM" />}
                  {!used && !(premium && wide) && <div className="tk-bonus">BONUS TICKET</div>}
                </div>
              </div>
              {!used && premium && wide && <div className="tk-bonus">BONUS TICKET</div>}
              <div className="tk-title">{title}</div>
              <div className="tk-who">{who}</div>
              {!wide && !used && <div className="tk-show">先生へ提示してください</div>}
            </div>
            {wide && !used && <div className="tk-show">先生へ提示してください</div>}
          </div>
        </div>
        {!used && (
          <>
            <div
              ref={stub}
              className={`tk-stub${dx > 0 || phase === 'fly' ? ' is-moving' : ''}${phase === 'snap' ? ' is-snap' : ''}${phase === 'fly' ? ' is-fly' : ''}`}
              style={stubStyle}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={onUp}
              onTransitionEnd={() => phase === 'snap' && setPhase('idle')}
              aria-label="半券（横へスワイプして切り取ると使用済みになります）"
            >
              <div className="tk-face">
                {premium && <div className="tk-shine" aria-hidden="true" />}
                <Arrows />
                <span className="tk-swipe">{phase === 'sending' ? '…' : 'SWIPE'}</span>
              </div>
            </div>
            <span className="tk-notch a" aria-hidden="true" />
            <span className="tk-notch b" aria-hidden="true" />
          </>
        )}
        {used && <div className="tk-used">USED</div>}
      </div>
      {err && (
        <div className="tk-err" role="alert">
          {err}
        </div>
      )}
    </>
  );
}
