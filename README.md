# GV Science — LIFF 生徒向けアプリ

Great Voyage（理科専門・オンライン個別指導）の生徒向け LINE ミニアプリ。
ハンドオフ仕様（採用方針：**ロゴ B 案** × **ホーム C 案**）を、
**LIFF v2 + React 18 + TypeScript + Vite** で再実装したものです。

## できること

- ホーム（"今日中心" レイアウト）
  - 挨拶 / 次回授業の Today カード / クイック 4 タイル / 記事フィード / その他
- 化学・生物 授業予定リスト / 詳細
- 化学・生物・地学 基礎問題リスト / 詳細（自己採点の解答開閉）
- 理科関連記事 / シェア一覧
- 外部リンクは必ず確認モーダル経由 → `liff.openWindow({ external: false })`
- iOS 風 横スライド遷移（360ms cubic-bezier(0.32, 0.72, 0.16, 1)）
- ブラウザの戻る・Android のハードウェアバックも pop と等価

## セットアップ

```bash
# 1. 依存をインストール
npm install

# 2. 環境変数を用意
cp .env.example .env.local
# .env.local を編集して LIFF ID / GAS エンドポイントを入れる
#   VITE_LIFF_ID=xxxxxxxxxx-xxxxxxxx
#   VITE_GAS_ENDPOINT=https://script.google.com/macros/s/.../exec

# 3. 開発サーバ起動
npm run dev      # → http://localhost:5173

# 4. 本番ビルド
npm run build    # → dist/

# 5. ローカルでビルド成果物を確認
npm run preview
```

### LIFF / GAS が未設定でも動きます

- `VITE_LIFF_ID` 未設定なら LIFF init をスキップ → ブラウザでそのまま閲覧可能
- `VITE_GAS_ENDPOINT` 未設定なら全 API が `src/data/mock.ts` のモックデータを返す

UI 開発はこの状態で全画面確認できます。

## デプロイ

```bash
npm run build
# dist/ を任意の静的ホスト（Cloudflare Pages / GitHub Pages / Firebase Hosting 等）に置く
# 発行された URL を LIFF Console の "Endpoint URL" に登録
```

LIFF アプリ画面は LINE 公式アカウントのリッチメニュー等から起動できます。

## ディレクトリ構成

```
gv-science-liff/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig*.json
├── public/
│   └── assets/
│       ├── crab-cutout-orange.svg   ← ロゴ画像（暫定 SVG）
│       └── crab-orange.svg
└── src/
    ├── main.tsx                    ← エントリ / LIFF init / マウント
    ├── App.tsx                     ← スタック描画と遷移アニメ
    ├── styles/
    │   ├── tokens.css              ← :root デザイントークン（ハンドオフ準拠）
    │   └── app.css                 ← 各コンポーネント
    ├── lib/
    │   ├── types.ts                ← Schedule / Problem / Article / Route 型
    │   ├── liff.ts                 ← @line/liff の薄いラッパ
    │   ├── api.ts                  ← GAS 呼び出し（失敗時は mock）
    │   ├── nav.tsx                 ← スタック・ナビゲーション Context
    │   └── useAsync.ts             ← 最小 fetch フック
    ├── data/
    │   └── mock.ts                 ← デモ用データ（GAS と同じ形）
    ├── components/
    │   ├── Icon.tsx                ← SVG アイコン集
    │   ├── Logo.tsx                ← Logo / LogoMark（B 案バッジ）
    │   ├── TopNav.tsx              ← 戻る + パンくず
    │   ├── Greeting.tsx            ← 挨拶ブロック
    │   ├── ExternalLinkModal.tsx   ← 外部リンク確認モーダル
    │   ├── EmptyState.tsx          ← 0 件カード
    │   └── Spinner.tsx
    └── screens/
        ├── HomeC.tsx               ← 採用ホーム
        ├── ScheduleListScreen.tsx
        ├── ScheduleDetailScreen.tsx
        ├── ProblemListScreen.tsx
        ├── ProblemDetailScreen.tsx
        └── ArticleListScreen.tsx   ← articles / share 兼用
```

## デザイントークンの正

`src/styles/tokens.css` を正とし、ハンドオフの `--c-*` / `--f-*` / `--sh-*` を
そのまま転記しています。色・余白・角丸・影・タイポは README で確定値とされて
いるので、迂闊に書き換えないでください。

密度は本番では `regular` 固定（`<div class="gv-root dens-regular">`）。
Tweaks UI はプロトタイプ専用機能なので移植していません。

## GAS API 想定

ID トークンを `Authorization: Bearer <id_token>` に乗せて GAS に送ります。

```
GET ?action=home
GET ?action=schedules&subject=chemistry
GET ?action=schedule&id=SCH003
GET ?action=problems&subject=chemistry
GET ?action=problem&id=PRB003
GET ?action=articles
GET ?action=shares
```

レスポンス型は `src/lib/types.ts` 参照。GAS 側は `liff.getIDToken()` を verify して
スプレッドシートの内容を返す形でフロントとの契約は完成します。

## クラブ画像について

`public/assets/crab-cutout-orange.svg` は **暫定の SVG プレースホルダ** です。
クライアントから提供されている `crab-cutout-orange.png`（190×190 透過）を
同じファイル名で配置すれば差し替わります（`.svg` から `.png` に拡張子を変える場合は
`src/components/Logo.tsx` の `CRAB_SRC` を編集してください）。

## 次フェーズに残しているもの

- 認証未登録（学年・科目が空）のオンボーディング
- 通信エラー / オフライン状態の UI
- プッシュ通知の登録 UX
- 親（保護者）向けビュー
