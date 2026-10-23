/**
 * 季節イベントの見た目（素材・配色・文言）。実装手順_季節イベント.md §0-3 の配色・public/tree/brand/ev/ の素材。
 * 今はハロウィンだけ素材がある（クリスマス以降は期間と一緒に足す。無い kind はハロウィンの絵で代用しない＝「?」）
 */
const EV = '/tree/brand/ev/';

export interface EvAsset {
  /** 錨のかぼちゃ（透過・4px ドット）*/
  icon: string;
  icon2x: string;
  /** アプリアイコン（地つき角丸）。ホームのタイル・ログイン・着せ替えのプレビュー */
  appicon: string;
  appicon512: string;
  /** EVENT トロフィーの杯 */
  trophy: string;
  /** ドット文字 HALLOWEEN / 2 行（＋CHALLENGE）/ CLEAR!! */
  text: string;
  text2: string;
  clearText: string;
  ghost: string;
  star: string;
  moon: string;
  banner: string;
}

export const EV_ASSET = (kind: string): EvAsset => {
  const k = kind || 'halloween';
  return {
    icon: `${EV}icon_ev_${k}.svg`,
    icon2x: `${EV}icon_ev_${k}@2x.png`,
    appicon: `${EV}appicon_ev_${k}_192.png`,
    appicon512: `${EV}appicon_ev_${k}_512.png`,
    trophy: `${EV}icon_trophy_ev_${k}.svg`,
    text: `${EV}text_ev_${k}.svg`,
    text2: `${EV}text_ev_${k}_2line.svg`,
    clearText: `${EV}text_ev_clear.svg`,
    ghost: `${EV}deco_ev_${k}_ghost@2x.png`,
    star: `${EV}deco_ev_${k}_star@2x.png`,
    moon: `${EV}deco_ev_${k}_moon@2x.png`,
    banner: `${EV}banner-bg_ev_${k}@2x.png`,
  };
};

/** 素材のあるイベント（着せ替えで絵を出せるもの）*/
export const EV_HAS_ART = new Set(['halloween']);

/** 表示名（英語・ローマ字。先生の回答 v2 の 5）*/
export const EV_NAME: Record<string, string> = {
  halloween: 'HALLOWEEN',
  xmas: 'CHRISTMAS',
  newyear: 'OTOSHIDAMA',
  setsubun: 'ONIWASOTO',
};

/** 配色（§0-3）: 地・カード・主色 / 主色の上の文字・側面・文字 / サブ・差し色・rgb */
export const EV_COLOR: Record<string, { bg: string; card: string; main: string; onMain: string; side: string; text: string; sub: string; accent: string; rgb: string; chrome: string }> = {
  halloween: {
    bg: 'linear-gradient(180deg,#3A1A5A 0%,#1E0C36 45%,#0A0418 100%)',
    card: 'linear-gradient(180deg,#2E1650,#140828)',
    main: '#FF9A1F',
    onMain: '#1A0800',
    side: '#7A2C00',
    text: '#FFF1E0',
    sub: '#CDB4E8',
    accent: '#C9A2FF',
    rgb: '255,154,31',
    chrome: 'linear-gradient(180deg,#FFFFFF 0%,#FFE6C2 30%,#FF9A1F 52%,#B8480A 52%,#FF9A1F 74%,#FFC872 100%)',
  },
};
export const evColor = (kind: string) => EV_COLOR[kind] ?? EV_COLOR.halloween!;

const JST = 9 * 3600_000;
/** 'M/D'（JST）*/
export const evMd = (ms: number) => {
  const d = new Date(ms + JST);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};
/** 'AM5:00' / 'PM8:30'（JST・12 時間制。2026-10-21 先生「10/30 AM5:00」）*/
const evAmPm = (ms: number) => {
  const d = new Date(ms + JST);
  const h = d.getUTCHours();
  return `${h < 12 ? 'AM' : 'PM'}${h % 12 || (h < 12 ? 0 : 12)}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
};
/** 'M/D AMh:MM'（JST）。締め切り「10/30 AM5:00」*/
export const evMdHm = (ms: number) => `${evMd(ms)} ${evAmPm(ms)}`;
/**
 * 期間「10/22-10/30 AM5:00」（2026-10-21 先生）。終わりが 0:00 ちょうどなら前の日まで「10/22-10/29」（終わりは含まない）
 */
export const evPeriod = (start: number, end: number) => {
  const e = new Date(end + JST);
  const midnight = e.getUTCHours() === 0 && e.getUTCMinutes() === 0;
  return `${evMd(start)}-${midnight ? evMd(end - 1) : evMdHm(end)}`;
};

/**
 * チケットを使える日「10/31」/「12/25-12/26」（ticketUntil は含まない）。無ければ null（2026-10-23 不具合調査 ○13: 先生用の画面が「10/31」の固定文字だった）
 */
export const evTicketDays = (from: number | null | undefined, until: number | null | undefined) => {
  if (from == null || until == null) return null;
  const a = evMd(from);
  const b = evMd(until - 1);
  return a === b ? a : `${a}-${b}`;
};

/** テストの合格ライン（%）。表示用（判定は Proxy・20 問なら 18 問。2026-10-21 先生: 80% → 90%）*/
export const EV_TEST_PASS_PCT = 90;

/**
 * EVENT トロフィーの名前（科目ごと・2026-10-21 先生「5 科目でそれぞれ別々に」）。Proxy の rewards.trophyName が無いときの予備
 * （Proxy src/trophies.js の EVENT_TROPHIES と同じ）
 */
export const EV_TROPHY_NAME: Record<string, Record<string, string>> = {
  halloween: {
    chemistry: '火よ燃えよ、大釜よ煮え立て',
    'chemistry-basic': '人は一つにあらず、二つなり',
    biology: '生き物の鈍い黄色の眼が開く',
    'biology-basic': '夜の子らの奏でる音楽',
    'earth-basic': '今は魔の刻、墓場が口を開く',
  },
};

/** マスター度の表示は切り捨て（99.x% を 100% と出さない）*/
export const evPct = (mastery: number) => Math.floor(Math.max(0, Math.min(1, mastery)) * 100 + 1e-9);

/** 着せ替えの錨を端末にも覚える（ログイン画面は誰か分かる前に出すので）*/
const SKIN_KEY = 'gvTree.iconSkin';
export function rememberIconSkin(skin: string | null | undefined) {
  try {
    if (skin) localStorage.setItem(SKIN_KEY, skin);
    else localStorage.removeItem(SKIN_KEY);
  } catch {
    /* 覚えられない端末はいつもの錨 */
  }
  applyHomeIcon(skin ?? null);
}

/**
 * ホーム画面に追加したときのアイコン（/tree の apple-touch-icon・icon・manifest。index.html と同じ名前）。2026-10-21:
 * 着せ替えの錨に合わせる。iOS・Android とも「ホーム画面に追加」した時点の絵になる（後から変えたら追加し直す）
 */
const HOME_ICON: Record<string, { i180: string; i192: string; manifest: string }> = {
  route: { i180: '/tree/icon/anchor-tree-180.png', i192: '/tree/icon/anchor-tree-192.png', manifest: '/tree/anchor-tree.webmanifest' },
  halloween: { i180: `${EV}appicon_ev_halloween_180.png`, i192: `${EV}appicon_ev_halloween_192.png`, manifest: '/tree/anchor-tree-halloween.webmanifest' },
};
export function applyHomeIcon(skin: string | null) {
  try {
    const p = location.pathname;
    if (p !== '/tree' && !p.startsWith('/tree/')) return; // GV Science 側（LIFF のホーム）にはアイコンを付けない
    const h = HOME_ICON[skin ?? ''] ?? HOME_ICON.route!;
    const set = (sel: string, href: string) => {
      const el = document.head.querySelector<HTMLLinkElement>(sel);
      if (el && el.getAttribute('href') !== href) el.setAttribute('href', href);
    };
    set('link[rel="apple-touch-icon"]', h.i180);
    set('link[rel="icon"][sizes="192x192"]', h.i192);
    set('link[rel="manifest"]', h.manifest);
  } catch {
    /* 失敗してもいつもの錨のまま */
  }
}
export function rememberedIconSkin(): string | null {
  try {
    const v = localStorage.getItem(SKIN_KEY);
    return v && EV_HAS_ART.has(v) ? v : null;
  } catch {
    return null;
  }
}
