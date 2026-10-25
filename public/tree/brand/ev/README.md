# 季節イベントの素材（ハロウィン 2026）
元は `大学リサーチ+app/ANCHOR_TREE_logo/`（`python3 _gen_events.py --png` で作り直し → ここへコピー）。2026-10-20 夜に配置。
- 錨の着せ替え: `icon_ev_halloween(.svg|_flat.svg|@1x.png|@2x.png)`・アプリ内タイル/ログイン用 `appicon_ev_halloween(.svg|_180/_192/_512.png)`
- ドット文字: `text_ev_halloween(_2line).svg`（HALLOWEEN / ＋CHALLENGE）・`text_ev_clear.svg`（CLEAR!!）・`text_ev_challenge.svg`
- EVENT トロフィー: `icon_trophy_ev_halloween(_flat).svg`
- フレーム: `frame_ev_halloween(_flat).svg`・`frame_ev_halloween_64/128/256.png`。44×44 セルの固定の箱・頭文字のタイルは左上 25%・大きさ 50%・飾りは箱の外側の余白まで（親は overflow: visible）
- 小物: `deco_ev_halloween_{ghost,star,pumpkin,moon}`（svg・_flat.svg・@1x/@2x.png）
- バナー背景: `banner-bg_ev_halloween@1x.png`（1200×400）/`@2x.png`（2400×800）。1 ドット 4px / 8px なので **CSS は `image-rendering: pixelated`**、表示は 1200×400 の整数倍か cover で
- 4px ドットの絵（icon・deco・banner）は @1x/@2x の PNG がにじまない。SVG はなめらかに縮小したいとき

# Message in a Bottle（2026-11-01〜12-04 5:00）
元は `大学リサーチ+app/ANCHOR_TREE_logo/`（`python3 _gen_ev_bottle.py` で作り直し → ここへコピー）。2026-10-25 に配置。
- ボトル: `icon_ev_bottle(.svg|_flat.svg|@1x.png|@2x.png)`（傾けない素の向き・画面で −14°）
- EVENT トロフィー（金のボトル）: `icon_trophy_ev_bottle(.svg|_flat.svg|@1x.png|@2x.png)`
- バナー背景: `banner-bg_ev_bottle@1x.png`（1200×400）/`@2x.png`（2400×800）。1 ドット 4px / 8px → `image-rendering: pixelated`
- ドット文字（MESSAGE IN A BOTTLE）は画像にせず CSS の文字（BottleParts の BottleLogo）
