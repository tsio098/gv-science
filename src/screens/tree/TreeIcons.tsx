/**
 * ANCHOR TREE のアイコン（SVG sprite）。モック Main.dc.html の symbol をそのまま写したもの。
 * 使う側は <svg><use href="#i-xxx" /></svg>。TreeRoot / ログイン画面で 1 回だけ描く。
 */
export function TreeSprite() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden="true">
      <defs>
        <symbol id="i-busshitsu" viewBox="0 0 24 24"><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-genshi" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="1.8" fill="currentColor"/><ellipse cx="12" cy="12" rx="9" ry="3.6"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.6" transform="rotate(120 12 12)"/></g></symbol>
        <symbol id="i-ketsugo" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="7" cy="12" r="3.2"/><circle cx="17" cy="12" r="3.2"/><path d="M10.2 12h3.6"/></g></symbol>
        <symbol id="i-ryo" viewBox="0 0 24 24"><path d="M12 4v16M5 20h14M6 7h12M6 7l-3 6h6l-3-6zM18 7l-3 6h6l-3-6z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></symbol>
        <symbol id="i-san" viewBox="0 0 24 24"><path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></symbol>
        <symbol id="i-sanka" viewBox="0 0 24 24"><path d="M4 8h13l-3-3M20 16H7l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-nodo" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round"><path d="M10 3h4M10.5 3v7.2A6 6 0 1 0 13.5 10.2V3M9.5 6.5h5M6.3 16h11.4"/></g></symbol>
        <symbol id="i-denchi" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><rect x="3" y="8" width="16" height="8" rx="2"/><path d="M21 11v2M12.5 9l-2.5 3h3l-2.5 3"/></g></symbol>
        <symbol id="i-santai" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="7" cy="16" r="2.6"/><circle cx="12" cy="7.5" r="2.6"/><circle cx="17" cy="16" r="2.6"/></g></symbol>
        <symbol id="i-kitai" viewBox="0 0 24 24"><path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11 2 3 3 0 0 0 1 6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></symbol>
        <symbol id="i-yoeki" viewBox="0 0 24 24"><path d="M6 3h12M8 3v6l-4 8v3h16v-3l-4-8V3M5.5 15h13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></symbol>
        <symbol id="i-netsu" viewBox="0 0 24 24"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 3 0-2 0-4 0-6z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></symbol>
        <symbol id="i-sokudo" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 16a8 8 0 0 1 16 0M12 16l4-5"/><circle cx="12" cy="16" r="1.4" fill="currentColor"/></g></symbol>
        <symbol id="i-heiko" viewBox="0 0 24 24"><path d="M5 9h12l-3-3M19 15H7l3 3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-hikinzoku" viewBox="0 0 24 24"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></symbol>
        <symbol id="i-tenkei" viewBox="0 0 24 24"><path d="M3 17l3-7h12l3 7zM6 10l3-4h9l3 4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"/></symbol>
        <symbol id="i-seni" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><circle cx="12" cy="12" r="3.5"/><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1"/></g></symbol>
        <symbol id="i-shibo" viewBox="0 0 24 24"><path d="M3 15l4-6 4 6 4-6 4 6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-hoko" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><circle cx="12" cy="12" r="4"/></g></symbol>
        <symbol id="i-tennen" viewBox="0 0 24 24"><path d="M4 20C4 10 10 4 20 4c0 10-6 16-16 16zM4 20L14 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></symbol>
        <symbol id="i-gosei" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="2.5" y="9" width="8" height="6" rx="3"/><rect x="13.5" y="9" width="8" height="6" rx="3"/><path d="M9 12h6"/></g></symbol>
        {/* 生物（Phase 6・2026-10-15。モックに無いので化学と同じ線画の流儀で作った）*/}
        {/* 細胞と分子 = 細胞（膜・核・小器官） */}
        <symbol id="i-saibo" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8"><ellipse cx="12" cy="12" rx="9" ry="7.5"/><circle cx="13.5" cy="11" r="3"/><circle cx="7.5" cy="14" r="1" fill="currentColor"/></g></symbol>
        {/* 代謝 = 回る矢印（エネルギーの流れ） */}
        <symbol id="i-taisha" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19.5 9.5A8 8 0 0 0 5 8M4.5 14.5A8 8 0 0 0 19 16"/><path d="M5 4v4h4M19 20v-4h-4"/></g></symbol>
        {/* 遺伝情報の発現 = 二重らせん */}
        <symbol id="i-hatsugen" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M7 3c0 5 10 5 10 9s-10 4-10 9M17 3c0 5-10 5-10 9s10 4 10 9"/><path d="M9 6.5h6M9 17.5h6"/></g></symbol>
        {/* 動物の環境応答 = ニューロン（細胞体・樹状突起・軸索） */}
        <symbol id="i-dobutsu" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="8" cy="8" r="3"/><path d="M5.5 6.3L3 4.5M8 5V2.5M5.2 9.5L3 11M10.2 10.2L19 19M16 19h3v-3"/></g></symbol>
        {/* 遺伝 = 交配表（2×2） */}
        <symbol id="i-iden" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="4" y="4" width="16" height="16" rx="2.5"/><path d="M12 4v16M4 12h16"/></g></symbol>
        {/* 遺伝子技術 = プラスミドに断片を組み込む */}
        <symbol id="i-gijutsu" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M15.5 5.2A7.5 7.5 0 1 1 8.5 5.2"/><path d="M10 3.5h4" strokeWidth="3"/></g></symbol>
        {/* 植物の環境応答 = 芽生え */}
        <symbol id="i-shokubutsu" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-9"/><path d="M12 14c-4.5 0-7-2.5-7-6.5 4.5 0 7 2.5 7 6.5zM12 12c0-4.5 2.5-7 7-7 0 4.5-2.5 7-7 7z"/></g></symbol>
        {/* 生物の進化 = 枝分かれ */}
        <symbol id="i-shinka" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21v-7M12 14L6 8M12 14l6-6M6 8V4M6 8L3 6M18 8V4M18 8l3-2"/></g></symbol>
        {/* 生態系 = 生態ピラミッド */}
        <symbol id="i-seitai" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3.5L21 20H3z"/><path d="M8.2 10.5h7.6M5.6 15.2h12.8"/></g></symbol>
        {/* 発生 = 卵割（4 細胞期） */}
        <symbol id="i-hassei" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="9"/><circle cx="9.2" cy="9.2" r="2.6"/><circle cx="14.8" cy="9.2" r="2.6"/><circle cx="9.2" cy="14.8" r="2.6"/><circle cx="14.8" cy="14.8" r="2.6"/></g></symbol>
        {/* 系統と分類 = 系統樹（直角の分岐） */}
        <symbol id="i-keito" viewBox="0 0 24 24"><path d="M3 12h4M7 6v12M7 6h6M7 18h13M13 6V3.5M13 6v3M13 3.5h7M13 9h7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        {/* 生物基礎（Phase 6・2026-10-16）。生物の特徴・遺伝子の働き・生態系は生物の i-saibo / i-hatsugen / i-seitai を使い回す */}
        {/* ヒトの体内環境 = 心臓と拍動 */}
        <symbol id="i-tainai" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7a4.3 4.3 0 0 1 7.5 2.8C19.5 15.4 12 20 12 20z"/><path d="M7 12h2.6l1.2-2.2 2.2 4.4 1.2-2.2H17"/></g></symbol>
        {/* 植生 = 林（2 本の木） */}
        <symbol id="i-shokusei" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3.5L3.5 12h9zM8 12v8M16 7.5l-3.8 7h7.6zM16 14.5V20M3 20.5h18"/></g></symbol>
        {/* 遷移 = 草 → 低木 → 高木 */}
        <symbol id="i-senni" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 20.5h19M4.5 20.5c0-1.8.4-2.8 1-3.3M6.5 20.5c0-1.8-.4-2.8-1-3.3M10.5 18v2.5M17 13v7.5"/><circle cx="10.5" cy="15.5" r="2.5"/><circle cx="17" cy="9" r="4"/></g></symbol>
        {/* 地学基礎（Phase 6・2026-10-16）。10 分野すべて新規 */}
        {/* 地球の形と内部構造 = 地殻・マントル・核の同心円 */}
        <symbol id="i-chikyu" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></g></symbol>
        {/* プレートと地震 = 地震計の波形 */}
        <symbol id="i-plate" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 12h4l1.5-5 3 10 3-12 2.5 9 1.5-2h3.5"/></g></symbol>
        {/* 火山と火成岩 = 火山と噴煙 */}
        <symbol id="i-kazan" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 20.5l6.5-10h6l6.5 10z"/><path d="M10.5 7.5c0-1.8 1.5-2 1.5-4M14 7.5c0-1.3 1.3-1.6 1.3-3"/></g></symbol>
        {/* 地層と堆積岩 = 傾いた地層 */}
        <symbol id="i-chiso" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="1.5"/><path d="M3 10l18-2.5M3 14.5l18-2.5M3 18.5l18-2.5"/></g></symbol>
        {/* 化石と地球の歴史 = アンモナイト */}
        <symbol id="i-kaseki" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 12.5a1.5 1.5 0 0 1 3 0a3 3 0 0 1-6 0a4.5 4.5 0 0 1 9 0a6 6 0 0 1-12 0a7.5 7.5 0 0 1 15 0"/></g></symbol>
        {/* 大気の構造と熱収支 = 太陽と大気の層 */}
        <symbol id="i-taiki" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 20.5h19M3.5 16c4-1.6 13-1.6 17 0M3.5 11.5c4-1.6 13-1.6 17 0"/><circle cx="12" cy="5" r="2"/></g></symbol>
        {/* 大気と海洋の循環 = 循環の矢印 */}
        <symbol id="i-junkan" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M18.5 8.5A7.5 7.5 0 0 0 5 9.5M5.5 15.5A7.5 7.5 0 0 0 19 14.5M19 4.5v4h-4M5 19.5v-4h4"/></g></symbol>
        {/* 宇宙と太陽系 = 環のある惑星 */}
        <symbol id="i-uchu" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><ellipse cx="12" cy="12" rx="10" ry="3.3" transform="rotate(-20 12 12)"/></g></symbol>
        {/* 日本の自然と災害 = 大波 */}
        <symbol id="i-saigai" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 19c2.5 0 3-1.5 4.5-1.5s2 1.5 4.5 1.5 3-1.5 4.5-1.5 2 1.5 5.5 1.5"/><path d="M4 15c0-6 5-10 10-10 3 0 5 1.5 5.5 3.5-2-1-4.5-.5-5.5 1.5s.5 4.5 2 5"/></g></symbol>
        {/* 地球環境 = 地球儀（経線と緯線） */}
        <symbol id="i-kankyo" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></g></symbol>
        <symbol id="i-tf" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="8" cy="12" r="4.5"/><path d="M15 8.5l6 7M21 8.5l-6 7"/></g></symbol>
        <symbol id="i-calc" viewBox="0 0 24 24"><path d="M6 5h12L11.5 12 18 19H6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-reason" viewBox="0 0 24 24"><path d="M9.5 18h5M10.5 21h3M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.5 1 2.5h6c0-1 .3-1.9 1-2.5A6 6 0 0 0 12 3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-lock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3"/><rect x="5" y="11" width="14" height="10" rx="2.5"/></g></symbol>
        <symbol id="i-star" viewBox="0 0 24 24"><path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9z" fill="currentColor"/></symbol>
        <symbol id="i-close" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/></symbol>
        <symbol id="i-clock" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></g></symbol>
        <symbol id="i-chev-down" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-chev-right" viewBox="0 0 24 24"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-more" viewBox="0 0 24 24"><g fill="currentColor"><circle cx="5" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="19" cy="12" r="2"/></g></symbol>
        <symbol id="i-back" viewBox="0 0 24 24"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-alert" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></g></symbol>
        <symbol id="i-lines" viewBox="0 0 24 24"><path d="M4 6h16M4 12h10M4 18h7" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-expand" viewBox="0 0 24 24"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        {/* 科目（左上の科目チップ。スマホ幅では科目名の代わりに出す・2026-10-17）: 化学 = 液の入ったフラスコ / 生物 = 葉 / 地学 = 地球 */}
        <symbol id="s-chem" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.5 3h5M10.5 3v6.5L5 19a1.4 1.4 0 0 0 1.2 2h11.6a1.4 1.4 0 0 0 1.2-2l-5.5-9.5V3"/><path d="M7.4 15h9.2"/><circle cx="10.5" cy="18" r=".9" fill="currentColor"/><circle cx="14" cy="17.2" r=".7" fill="currentColor"/></g></symbol>
        <symbol id="s-bio" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 19C5 10.5 10.5 5 19 5c0 8.5-5.5 14-14 14z"/><path d="M5 19l9-9"/></g></symbol>
        <symbol id="s-earth" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M4 9q8 3 16 0M4 15q8 3 16 0M12 3c-2.5 3-2.5 15 0 18"/></g></symbol>
        {/* ABYSS = 三重の波（錨 i-anchor はアプリロゴ専用）*/}
        <symbol id="i-depth" viewBox="0 0 24 24"><path d="M4 7c2.5 2 5.5 2 8 0s5.5-2 8 0M4 12c2.5 2 5.5 2 8 0s5.5-2 8 0M4 17c2.5 2 5.5 2 8 0s5.5-2 8 0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        {/* ROUTE = コンパス */}
        <symbol id="i-route" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></g></symbol>
        <symbol id="i-trophy" viewBox="0 0 24 24"><path d="M8 21h8M12 17v4M5 4h14v4a7 7 0 0 1-14 0zM5 6H3v2a3 3 0 0 0 3 3M19 6h2v2a3 3 0 0 1-3 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-flag" viewBox="0 0 24 24"><path d="M5 21V4M5 4h12l-2.5 4.5L17 13H5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-share" viewBox="0 0 24 24"><path d="M14 4h6v6M20 4l-9 9M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></symbol>
        <symbol id="i-anchor" viewBox="0 0 24 24"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="5" r="2"/><path d="M12 7v14M8 10h8M4 14a8 8 0 0 0 16 0M4 14l2-2M20 14l-2-2"/></g></symbol>
      </defs>
    </svg>
  );
}

export function Ico({ id, size = 16, className }: { id: string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} aria-hidden="true" className={className}>
      <use href={'#' + id.replace(/^#/, '')} />
    </svg>
  );
}
