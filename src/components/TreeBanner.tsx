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
 *   event      = 季節イベントの開催中（2026-10-23 先生「全員に出す・シーズンよりイベントが優先」）。背景 ev/banner-bg_ev_<kind>@2x.png（4px ドット・
 *                pixelated）に、かぼちゃの錨・ドット文字「HALLOWEEN / CHALLENGE」・締め切り・TAP TO START を重ねる。素材の無いイベントは出さない
 *                Message in a Bottle（2026-10-25・kind 'bottle'）: 背景 banner-bg_ev_bottle（月夜の海）にボトル（−14°）・ロゴ「MESSAGE / IN A / BOTTLE」
 *                （画像にせず SVG の文字・Press Start 2P と羊皮紙のクローム）・ドットの波線・締め切り・TAP TO START
 */
import type { ButtonHTMLAttributes } from 'react';
import type { ArenaSeason, TreeHomeEvent } from '../lib/treeApi';
import { EV_HAS_ART, EV_NAME, evColor, evMd, evMdHm } from '../screens/tree/event/evTheme';
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
 * 季節イベントの開催中は全員にイベントのバナー（アリーナの日より優先・2026-10-23 先生）。終わりは Proxy の event.end（含まない）
 */
export function treeBannerKind(
  home: { abyssOpen: boolean; arenaOpen: boolean; season: ArenaSeason; event?: TreeHomeEvent | null } | null | undefined,
  now = Date.now()
): TreeBannerKind {
  if (!home) return 'route';
  const ev = home.event;
  if (ev && BANNER_ART.has(ev.kind) && now < ev.end) return 'event';
  const s = home.season;
  if (home.arenaOpen && s && s.n >= 1) {
    const today = jstDay(now);
    if (today === jstDay(s.start)) return 'arenaStart';
    if (today === jstDay(s.end - 1)) return 'arenaLast';
  }
  return home.abyssOpen ? 'abyss' : 'route';
}

/** 着せ替えの錨（素材のあるものだけ）*/
const SKIN_ICON: Record<string, string> = { halloween: BRAND + 'ev/icon_ev_halloween.svg' };

/** イベントの締め切り「10/30 AM5:00 まで」。0:00 ちょうどに終わるなら前の日「10/29 まで」（終わりは含まない）*/
const evUntil = (end: number) => {
  const e = new Date(end + JST_MS);
  return `${e.getUTCHours() === 0 && e.getUTCMinutes() === 0 ? evMd(end - 1) : evMdHm(end)} まで`;
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
  return (
    <button
      type="button"
      className={`tb-banner is-ev is-ev-${k}`}
      aria-label={`${EV_NAME[k] ?? ''} CHALLENGE 開催中（${evUntil(event.end)}）。ANCHOR TREE をひらく`}
      onClick={onOpen}
      {...buttonProps}
    >
      <img className="tb-bg is-pixel" src={`${BRAND}ev/banner-bg_ev_${k}@2x.png`} alt="" aria-hidden="true" draggable={false} />
      <svg className="tb-over" viewBox="0 0 1200 400" aria-hidden="true">
        <image href={`${BRAND}ev/icon_ev_${k}.svg`} x={40} y={74} width={168} height={168} style={{ imageRendering: 'pixelated' }} />
        <image href={`${BRAND}ev/text_ev_${k}_2line.svg`} x={190} y={92} width={450} height={132} />
        <text x={82} y={304} fontFamily={JP} fontSize={24} fill={c.text}>
          {evUntil(event.end)}
        </text>
        <text x={82} y={348} fontFamily={MONO} fontSize={18} fill={c.main} letterSpacing={5}>
          TAP TO START ▶
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
const PS2P = "'Press Start 2P', 'DotGothic16', monospace";

/**
 * Message in a Bottle のバナー（2026-10-25・ボード Main のロゴ: MESSAGE 小・IN A 極小（シーグラス・線ではさむ）・BOTTLE 大（羊皮紙のクローム）＋ドットの波線）。
 * 文字は画像にせず SVG の文字（1200×400 の座標でそのまま縮む）。クロームは縦のグラデ・押し出しは同じ文字を右下にずらした影
 */
function BottleBanner({ event, onOpen, buttonProps }: { event: TreeHomeEvent; onOpen: () => void; buttonProps?: Props['buttonProps'] }) {
  const c = evColor('bottle');
  const chrome = (x: number, y: number, size: number, text: string, shadow: number) => (
    <>
      <text x={x + shadow} y={y + shadow} fontFamily={PS2P} fontSize={size} fill="#120A00">
        {text}
      </text>
      <text x={x} y={y} fontFamily={PS2P} fontSize={size} fill="url(#tb-bt-chrome)">
        {text}
      </text>
    </>
  );
  return (
    <button
      type="button"
      className="tb-banner is-ev is-ev-bottle"
      aria-label={`MESSAGE IN A BOTTLE 開催中（${evUntil(event.end)}）。ANCHOR TREE をひらく`}
      onClick={onOpen}
      {...buttonProps}
    >
      <img className="tb-bg is-pixel" src={`${BRAND}ev/banner-bg_ev_bottle@2x.png`} alt="" aria-hidden="true" draggable={false} />
      <svg className="tb-over" viewBox="0 0 1200 400" aria-hidden="true">
        <defs>
          <linearGradient id="tb-bt-chrome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".3" stopColor="#FFF1CF" />
            <stop offset=".52" stopColor="#F6D58E" />
            <stop offset=".52" stopColor="#A9792E" />
            <stop offset=".74" stopColor="#E7B85C" />
            <stop offset="1" stopColor="#FFE7A8" />
          </linearGradient>
          <filter id="tb-bt-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="9" />
          </filter>
        </defs>
        {/* ボトル（4px ドット・−14°）とシーグラスの弱い光 */}
        <g transform="rotate(-14 124 170)">
          <ellipse cx={124} cy={186} rx={52} ry={64} fill="#7EEBC6" opacity={0.18} filter="url(#tb-bt-glow)" />
          <image href={`${BRAND}ev/icon_ev_bottle_flat.svg`} x={44} y={84} width={160} height={168} style={{ imageRendering: 'pixelated' }} />
        </g>
        {/* MESSAGE ＋ —IN A— */}
        {chrome(236, 122, 28, 'MESSAGE', 3)}
        <rect x={448} y={106} width={22} height={5} fill="#7EEBC6" />
        <text x={482} y={120} fontFamily={PS2P} fontSize={16} fill="#04102A">
          IN A
        </text>
        <text x={480} y={118} fontFamily={PS2P} fontSize={16} fill="#7EEBC6">
          IN A
        </text>
        <rect x={552} y={106} width={22} height={5} fill="#7EEBC6" />
        {/* BOTTLE（大）*/}
        {chrome(230, 214, 68, 'BOTTLE', 5)}
        <svg x={232} y={232} width={404} height={12} viewBox="0 0 100 3" preserveAspectRatio="none" shapeRendering="crispEdges">
          <path d={WAVE_D} fill="#7EEBC6" opacity={0.8} />
        </svg>
        <text x={82} y={304} fontFamily={JP} fontSize={24} fill={c.text}>
          {evUntil(event.end)}
        </text>
        <text x={82} y={348} fontFamily={MONO} fontSize={18} fill={c.main} letterSpacing={5}>
          TAP TO START ▶
        </text>
      </svg>
    </button>
  );
}
