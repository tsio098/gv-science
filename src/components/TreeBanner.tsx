/**
 * GV Science ホームの ANCHOR TREE バナー（1200×400・2026-10-17 先生決定・デザインボード「バナー」）。
 * 背景 banner-bg_*.svg（ツリーのノード・アリーナは王冠まで入り）に、ロゴと文字を SVG で重ねる（座標はボードの見本 banner_*.svg と同じ）。
 *   route      = 通常（TAP TO START ▶）
 *   abyss      = どれか 1 科目でも ABYSS を解放した後（DIVE IN ▶）
 *   arenaStart = アリーナ開放済みで、新シーズン開始日（月）だけ「SEASON n START」＋期間
 *   arenaLast  = アリーナ開放済みで、シーズン最終日（日）だけ「LAST DAY」＋「SEASON n · 月/日（日）まで」
 * 日付は JST。発光は SVG フィルタ（静止）でアニメーションなし。
 * 着せ替えの錨（季節イベント・2026-10-20）: iconSkin があれば、ロゴの錨の部分だけを隠してそのアイコン（ハロウィン = かぼちゃの錨）を重ねる
 * （route / abyss のバナーだけ。アリーナのバナーは王冠なのでそのまま）。ホーム画面に追加したアイコンは人ごとに変えられないので対象外
 *   event      = 季節イベントの開催中・予告中（2026-10-23 先生「全員に出す」・2026-10-25 先生「予告から出す・アリーナのバナーはイベントより優先」）。
 *                予告中（Proxy の phase 'soon'）は締め切りの代わりに「11/1 0:00 スタート」・TAP TO START の代わりに COMING SOON。背景 ev/banner-bg_ev_<kind>@2x.png（4px ドット・
 *                pixelated）に、かぼちゃの錨・ドット文字「HALLOWEEN / CHALLENGE」・締め切り・TAP TO START を重ねる。素材の無いイベントは出さない
 *                Message in a Bottle（2026-10-25・kind 'bottle'・ボード H01）: 背景 banner-bg_ev_bottle（nano banana の月夜の海）にボトル（−14°）・ロゴ
 *                「MESSAGE / IN A / BOTTLE」（画像にせず HTML の文字・Press Start 2P と羊皮紙のクローム）・ドットの波線・締め切り・TAP TO START。
 *                ボードの 1200×400 の HTML をそのまま置き、バナーの幅に合わせて scale で縮める
 */
import { useLayoutEffect, useRef, useState, type ButtonHTMLAttributes, type RefObject } from 'react';
import type { ArenaSeason, TreeHomeEvent } from '../lib/treeApi';
import { EV_HAS_ART, EV_NAME, evColor, evMd, evMdHm } from '../screens/tree/event/evTheme';
import { PxBottle } from '../screens/tree/event/BottleParts';
import '../styles/tree-brand.css';

export type TreeBannerKind = 'route' | 'abyss' | 'arenaStart' | 'arenaLast' | 'event';

const BRAND = '/tree/brand/';
const MONO = "'IBM Plex Mono', 'SFMono-Regular', Menlo, monospace";
const JP = "'Hiragino Sans', 'Hiragino Kaku Gothic ProN', 'Noto Sans CJK JP', 'IBM Plex Sans JP', sans-serif";
const WEEKDAY = ['日', '月', '火', '水', '木', '金', '土'];
const JST_MS = 9 * 3600_000;

/** JST の日付 'YYYY-MM-DD' */
export const jstDay = (ms: number) => new Date(ms + JST_MS).toISOString().slice(0, 10);
const md = (ms: number) => {
  const d = new Date(ms + JST_MS);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAY[d.getUTCDay()]}）`;
};

/** バナーの素材のあるイベント（着せ替えの素材 EV_HAS_ART ＋ ボトル。ボトルは着せ替えが無いので別に持つ）*/
const BANNER_ART = new Set([...EV_HAS_ART, 'bottle']);

/**
 * どのバナーを出すか（実装手順 §5.8）。アリーナは開放済みのアカウントだけ・シーズン開始日と最終日の 2 日だけ。
 * プレシーズン（n < 1）はアリーナのバナーを出さない。
 * アリーナの 2 日はアリーナのバナーが最優先（2026-10-25 先生。10-23 の「イベントが優先」から変更）。
 * それ以外の日は、季節イベントの開催中・予告中なら全員にイベントのバナー（予告からは 2026-10-25 先生）。終わりは Proxy の event.end（含まない）
 */
export function treeBannerKind(
  home: { abyssOpen: boolean; arenaOpen: boolean; season: ArenaSeason; event?: TreeHomeEvent | null } | null | undefined,
  now = Date.now()
): TreeBannerKind {
  if (!home) return 'route';
  const s = home.season;
  if (home.arenaOpen && s && s.n >= 1) {
    const today = jstDay(now);
    if (today === jstDay(s.start)) return 'arenaStart';
    if (today === jstDay(s.end - 1)) return 'arenaLast';
  }
  const ev = home.event;
  if (ev && BANNER_ART.has(ev.kind) && now < ev.end) return 'event';
  return home.abyssOpen ? 'abyss' : 'route';
}

/** 着せ替えの錨（素材のあるものだけ）*/
const SKIN_ICON: Record<string, string> = { halloween: BRAND + 'ev/icon_ev_halloween.svg' };

/** イベントの締め切り「10/30 AM5:00 まで」。0:00 ちょうどに終わるなら前の日「10/29 まで」（終わりは含まない）*/
const evUntil = (end: number) => {
  const e = new Date(end + JST_MS);
  return `${e.getUTCHours() === 0 && e.getUTCMinutes() === 0 ? evMd(end - 1) : evMdHm(end)} まで`;
};
/** 予告中か（古い Proxy は phase が無い = 開催中）*/
const evSoon = (ev: TreeHomeEvent) => ev.phase === 'soon';
/** 予告の開始「11/1 0:00 スタート」（ボード H01 の予告）*/
const evStartAt = (ev: TreeHomeEvent) => {
  if (ev.start == null) return 'まもなく スタート';
  const d = new Date(ev.start + JST_MS);
  return `${evMd(ev.start)} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')} スタート`;
};

interface Props {
  kind: TreeBannerKind;
  season?: ArenaSeason;
  /** 開催中の季節イベント（kind = 'event' のとき）*/
  event?: TreeHomeEvent | null;
  /** 着せ替えの錨（'halloween' など）。null / 無し = いつもの錨 */
  iconSkin?: string | null;
  onOpen: () => void;
  /** 長押し（別のブラウザで使う）などをホームから足す */
  buttonProps?: Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick' | 'type' | 'className'>;
}

const LABEL: Record<TreeBannerKind, string> = {
  route: 'ANCHOR TREE をひらく',
  abyss: 'ANCHOR TREE をひらく（ABYSS）',
  arenaStart: 'CHAMPION ARENA の新シーズン開始。ANCHOR TREE をひらく',
  arenaLast: 'CHAMPION ARENA のシーズン最終日。ANCHOR TREE をひらく',
  event: '季節イベント開催中。ANCHOR TREE をひらく',
};

/** バナーの幅 ÷ 1200（ボードの 1200×400 の HTML を縮める倍率）。描く前に測るので最初の表示から合う */
function useBannerScale(ref: RefObject<HTMLElement>) {
  const [scale, setScale] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // clientWidth は :active の transform に影響されない
    const update = () => setScale(el.clientWidth / 1200);
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return scale;
}

export function TreeBanner({ kind, season, event, iconSkin, onOpen, buttonProps }: Props) {
  if (kind === 'event' && event && event.kind === 'bottle') {
    return <BottleBanner event={event} onOpen={onOpen} buttonProps={buttonProps} />;
  }
  if (kind === 'event' && event && EV_HAS_ART.has(event.kind)) {
    return <EventBanner event={event} onOpen={onOpen} buttonProps={buttonProps} />;
  }
  const skin = iconSkin ? SKIN_ICON[iconSkin] ?? null : null;
  const arena = kind === 'arenaStart' || kind === 'arenaLast';
  // アリーナの日でもシーズンが分からなければ通常へ（イベントの情報が無いときも）
  const k: TreeBannerKind = (arena && !season) || kind === 'event' ? 'route' : kind;
  const bg = k === 'abyss' ? 'banner-bg_abyss.svg' : k === 'route' ? 'banner-bg_route.svg' : 'banner-bg_arena.svg';
  return (
    <button type="button" className="tb-banner" aria-label={LABEL[k]} onClick={onOpen} {...buttonProps}>
      <img className="tb-bg" src={BRAND + bg} alt="" aria-hidden="true" draggable={false} />
      <svg className="tb-over" viewBox="0 0 1200 400" aria-hidden="true">
        {k === 'route' || k === 'abyss' ? (
          <>
            {/* lockup-horizontal 580 幅（646.1×216.4）を縦中央に・その下に案内 */}
            {skin ? (
              <>
                {/* 錨（ロゴの左 26%）を隠して、着せ替えのアイコンを同じ位置に（文字・5 色の立方体はそのまま）*/}
                <defs>
                  <clipPath id="tb-noanchor">
                    <rect x={202} y={0} width={998} height={400} />
                  </clipPath>
                </defs>
                <image href={BRAND + `lockup-horizontal_${k}.svg`} x={50} y={79.9} width={580} height={194.3} clipPath="url(#tb-noanchor)" />
                <image href={skin} x={36} y={84} width={180} height={180} style={{ imageRendering: 'pixelated' }} />
              </>
            ) : (
              <image href={BRAND + `lockup-horizontal_${k}.svg`} x={50} y={79.9} width={580} height={194.3} />
            )}
            <text x={82} y={314.2} fontFamily={MONO} fontSize={18} fill={k === 'route' ? '#2DF4C6' : '#00E5FF'} letterSpacing={5}>
              {k === 'route' ? 'TAP TO START ▶' : 'DIVE IN ▶'}
            </text>
          </>
        ) : k === 'arenaStart' ? (
          <>
            <image href={BRAND + 'arena_logo-1line.svg'} x={46} y={96} width={600} height={75.9} />
            <text x={82} y={240.1} fontFamily={MONO} fontSize={30} fill="#FFD84A" letterSpacing={6}>
              SEASON {season!.n}
            </text>
            {/* 番号が 2 桁以上なら START を右へずらす（1 桁 ≒ 24px）*/}
            <image href={BRAND + 'text_start.svg'} x={300 + (String(season!.n).length - 1) * 24} y={189.9} width={230} height={64.1} />
            <text x={82} y={298} fontFamily={JP} fontSize={24} fill="#FFF6DD">
              {md(season!.start)} 〜 {md(season!.end - 1)}
            </text>
          </>
        ) : (
          <>
            <image href={BRAND + 'arena_logo-1line.svg'} x={46} y={96.6} width={600} height={75.9} />
            <image href={BRAND + 'text_last-day.svg'} x={64} y={188.5} width={330} height={65} />
            <text x={82} y={297.5} fontFamily={JP} fontSize={24} fill="#FFF6DD">
              SEASON {season!.n} · {md(season!.end - 1)}まで
            </text>
          </>
        )}
      </svg>
    </button>
  );
}

/**
 * 季節イベントのバナー（2026-10-23）。背景の左 55% は文字用の暗い余白（ANCHOR_TREE_logo/README「banner-bg_ev_halloween」）。
 * 錨（かぼちゃ）は 4px ドットなので pixelated。座標は 1200×400 の見本（vault ログ 2026-10-23「バナー C 案」）
 */
function EventBanner({ event, onOpen, buttonProps }: { event: TreeHomeEvent; onOpen: () => void; buttonProps?: Props['buttonProps'] }) {
  const k = event.kind;
  const c = evColor(k);
  const soon = evSoon(event);
  const when = soon ? evStartAt(event) : evUntil(event.end);
  return (
    <button
      type="button"
      className={`tb-banner is-ev is-ev-${k}`}
      aria-label={`${EV_NAME[k] ?? ''} CHALLENGE ${soon ? `予告（${when}）` : `開催中（${when}）`}。ANCHOR TREE をひらく`}
      onClick={onOpen}
      {...buttonProps}
    >
      <img className="tb-bg is-pixel" src={`${BRAND}ev/banner-bg_ev_${k}@2x.png`} alt="" aria-hidden="true" draggable={false} />
      <svg className="tb-over" viewBox="0 0 1200 400" aria-hidden="true">
        <image href={`${BRAND}ev/icon_ev_${k}.svg`} x={40} y={74} width={168} height={168} style={{ imageRendering: 'pixelated' }} />
        <image href={`${BRAND}ev/text_ev_${k}_2line.svg`} x={190} y={92} width={450} height={132} />
        <text x={82} y={304} fontFamily={JP} fontSize={24} fill={c.text}>
          {when}
        </text>
        <text x={82} y={348} fontFamily={MONO} fontSize={18} fill={c.main} letterSpacing={5}>
          {soon ? 'COMING SOON ▶' : 'TAP TO START ▶'}
        </text>
      </svg>
    </button>
  );
}

/** ドットの波線（100×3 のマス・ボードのロゴの下の線）*/
const WAVE_D = (() => {
  let d = '';
  for (let x = 0; x < 100; x += 4) d += `M${x} 2h2v1H${x}zM${x + 2} 1h1v1H${x + 2}zM${x + 3} 0h1v1H${x + 3}z`;
  return d;
})();

/**
 * Message in a Bottle のバナー（2026-10-25 夜・ボード「ANCHOR TREE Message in a Bottle」H01・先生採用）。
 * 1200×400 の座標: ボトル（126×135・−14°・影 5px と シーグラスの発光）left 58 / top 78・その右 34px にロゴ（MESSAGE 26px・—IN A— 12px・
 * BOTTLE 66px・波線 408×12）・締め切り left 84 / top 280（DotGothic16 24px）・TAP TO START ▶ left 84 / top 334（Press Start 2P 14px・字間 .28em）。
 * 予告（10/30 5:00〜）は「11/1 0:00 スタート」と COMING SOON ▶（シーグラス）
 */
function BottleBanner({ event, onOpen, buttonProps }: { event: TreeHomeEvent; onOpen: () => void; buttonProps?: Props['buttonProps'] }) {
  const ref = useRef<HTMLButtonElement>(null);
  const scale = useBannerScale(ref);
  const soon = evSoon(event);
  const when = soon ? evStartAt(event) : evUntil(event.end);
  return (
    <button
      ref={ref}
      type="button"
      className="tb-banner is-ev is-ev-bottle"
      aria-label={`MESSAGE IN A BOTTLE ${soon ? `予告（${when}）` : `開催中（${when}）`}。ANCHOR TREE をひらく`}
      onClick={onOpen}
      {...buttonProps}
    >
      <img className="tb-bg is-pixel" src={`${BRAND}ev/banner-bg_ev_bottle@2x.png`} alt="" aria-hidden="true" draggable={false} />
      <span className="tb-bt" aria-hidden="true" style={{ transform: `scale(${scale})`, visibility: scale > 0 ? undefined : 'hidden' }}>
        <span className="tb-bt-lockup">
          <PxBottle size={126} style={{ filter: 'drop-shadow(5px 5px 0 #04102A) drop-shadow(0 0 18px rgba(126,235,198,.5))' }} />
          <span className="tb-bt-col">
            <span className="tb-bt-logo">
              <span className="tb-bt-row">
                <span className="tb-bt-chrome" style={{ fontSize: 26 }}>MESSAGE</span>
                <span className="tb-bt-ina">
                  <i />
                  IN A
                  <i />
                </span>
              </span>
              <span className="tb-bt-chrome" style={{ fontSize: 66, letterSpacing: '.02em' }}>BOTTLE</span>
            </span>
            <svg viewBox="0 0 100 3" width={408} height={12} shapeRendering="crispEdges" style={{ display: 'block', opacity: 0.8 }}>
              <path fill="#7EEBC6" d={WAVE_D} />
            </svg>
          </span>
        </span>
        <span className="tb-bt-when">{when}</span>
        <span className="tb-bt-cta" style={{ color: soon ? '#7EEBC6' : '#F6D58E' }}>
          {soon ? 'COMING SOON' : 'TAP TO START'} ▶
        </span>
      </span>
    </button>
  );
}
