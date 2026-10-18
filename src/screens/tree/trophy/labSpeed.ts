/**
 * 通知の再生速度（先生用「演出の確認」のゆっくり再生だけで変える・2026-10-19 先生の依頼）。
 * 1 = 通常。0.25 = 1/4 の速さ（コマ送りを 1 コマずつ見られる）。表示時間・CSS アニメーション・効果音の鳴る時刻がこれに従う。
 * 生徒の画面では常に 1（演出の確認を閉じたら 1 に戻す）
 */
let speed = 1;
export const toastSpeed = () => speed;
export const setToastSpeed = (s: number) => {
  speed = s > 0 && s <= 1 ? s : 1;
};
