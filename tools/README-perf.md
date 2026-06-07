# 読み込み速度の計測（Claude in Chrome / DevTools）

`tools/perf-measure.js` を、動作中の LIFF ページのコンテキストで実行すると、
ホーム表示・成績推移の読み込み速度を実測できます。アプリ自身が叩いている GAS
（Cloudflare proxy）エンドポイントと id_token を自動検出するので、URL や
トークンの手入力は不要です。

## 何を測るか

| 関数 | 測るもの |
|---|---|
| `gvPerf()` | `home` / `scores` の **データ取得時間**（warm）。各5回の min/median/p95/mean(ms) |
| `gvPerf({cold:true})` | 上記に加えて `fresh=1`（全再計算）の **コールド取得**（負荷高・少回数） |
| `gvPerfPaint('.c-today')` | 「呼んだ瞬間」から **ホーム本体が描画される**までの ms |
| `gvPerfPaint('.gt-fade')` | 同じく **成績本体が描画される**までの ms（`.gt-skel`＝ローディング） |
| `gvPerfBoot()` | フルリロード時の TTFB / DOMContentLoaded / load(ms) |

> 信頼する一次指標は **fetch promise の実測 ms** と **GAS 実行ログの実行時間**。
> ブラウザの「描画検知」は背景タブでスロットルされるため、必ず**前面タブ**で実行します。

## Claude in Chrome での手順

1. Chrome で本番 LIFF（または検証用 URL）を開き、LINE ログインを済ませて
   **ホームを1回表示**しておく（自動検出のため）。
2. `tools/perf-measure.js` の中身を**ページ内で実行**（`javascript_tool` に貼り付け）。
   → `gvPerf` などが `window` に生える。
3. データ取得を計測：
   ```js
   await gvPerf();              // warm（通常アクセス）
   await gvPerf({ cold:true }); // コールド(fresh=1)も。サーバ負荷が高いので頻発させない
   ```
4. 画面描画を計測（遷移の直前に呼ぶ）：
   ```js
   // ホーム再表示の直前（戻る/リロード直前）に：
   const p = gvPerfPaint('.c-today'); /* …ホームへ遷移… */ await p;
   // 成績タップの直前に：
   const q = gvPerfPaint('.gt-fade'); /* …成績ボタンをタップ… */ await q;
   ```

## 読み方の目安（今回の高速化後）

- `home (warm)` … L1/L2 ヒットで概ね **数百ms〜1.5秒台**。これが「表示までの速度」の主因。
- `scores(warm)` … 30分キャッシュ/localStorage 復元で速い。初回や非fresh時は batchGet で短縮。
- `*(cold fresh=1)` … 全再計算なので長い（裏更新で使う想定）。ここが長くても
  ユーザー体感（warm）には乗りません。

## 計測の落とし穴（先生用ダッシュボード §7 の教訓）

- **背景タブで測らない**（`setInterval`/タイマーがスロットルされ過大計測）。
- **連続リロード＋並行 fetch を避ける**（GAS 側に再計算が滞留して値が乱れる）。
  本ハーネスは逐次＋間隔(`gapMs`)で実行します。
- **コールド(fresh=1)を連打しない**（全再計算が直列化して待つ）。
- 数値が疑わしいときは **GAS の実行ログ（実行時間）** を一次情報として突き合わせる。
- パスワード/ログインを挟み直して測りたいときは `sessionStorage.clear()` ＋ reload。
  （userId 永続キャッシュも消すなら `localStorage.clear()`）

## batchGet が効いているかの確認

`gvPerf({cold:true})` の `scores(cold)` が短ければ batchGet が効いています。長いままなら
GAS エディタで **Advanced Sheets Service（Sheets v4）が有効か**を確認してください
（未有効だと従来の per-sheet 読みにフォールバックします。SETUP.md §9）。
