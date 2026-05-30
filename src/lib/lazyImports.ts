/**
 * 遅延ロード対象画面の dynamic import を一元管理する。
 *
 * App.tsx 側で `lazy()` に渡しつつ、HomeC など別の場所からも
 * 同じ import 関数を呼んでプリロードを発火する。
 * モジュール経由で共有することで、App.tsx ↔ HomeC の循環参照を避ける。
 *
 * `import()` は同一モジュールに対してブラウザ側でリクエストを
 * デデュープするので、preload → 実遷移 のシーケンスで二重ロードは起きない。
 */
export const importScoresScreen = () => import('../screens/ScoresScreen');

/** ScoresScreen のチャンクを先読み。失敗は無視（実遷移で再試行される）。 */
export function preloadScoresScreen(): void {
  void importScoresScreen();
}
