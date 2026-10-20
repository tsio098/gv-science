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
 */
import type { ButtonHTMLAttributes } from 'react';
import type { ArenaSeason } from '../lib/treeApi';
import '../styles/tree-brand.css';

export type TreeBannerKind = 'route' | 'abyss' | 'arenaStart' | 'arenaLast';

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

/**
 * どのバナーを出すか（実装手順 §5.8）。アリーナは開放済みのアカウントだけ・シーズン開始日と最終日の 2 日だけ。
 * プレシーズン（n < 1）はアリーナのバナーを出さない。
 */
export function treeBannerKind(
  home: { abyssOpen: boolean; arenaOpen: boolean; season: ArenaSeason } | null | undefined,
  now = Date.now()
): TreeBannerKind {
  if (!home) return 'route';
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

interface Props {
  kind: TreeBannerKind;
  season?: ArenaSeason;
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
};

export function TreeBanner({ kind, season, iconSkin, onOpen, buttonProps }: Props) {
  const skin = iconSkin ? SKIN_ICON[iconSkin] ?? null : null;
  const arena = kind === 'arenaStart' || kind === 'arenaLast';
  // アリーナの日でもシーズンが分からなければ通常へ
  const k: TreeBannerKind = arena && !season ? 'route' : kind;
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
