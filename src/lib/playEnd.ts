/**
 * 1 回だけの挑戦（アリーナ・イベントのテスト・ボトル・招待状）を終了するかの判定（PlayScreen の endNow）。
 * away = 画面を離れた・quit = 中断・resume = 前回離れたまま開いた・timeup = アリーナの全体の制限時間
 */
export type EndReason = 'away' | 'quit' | 'resume' | 'timeup';

/**
 * shown = 問題が一度でも画面に出たか。出る前（読み込み中・開始の通信が不安定）は離れても終了しない・中断はツリーに戻るだけ
 * （2026-10-28 不具合: 開始の応答が CPU 上限で落ち、押し直したら問題を一度も見ないまま「画面を離れた」で 0 点になった）。
 * resume（Proxy が終了扱いにした・端末に終了の印がある）と timeup は出ていなくても終了する
 * → 'end'（終了して採点）/ 'exit'（ツリーへ戻るだけ）/ 'ignore'（何もしない）
 */
export function endAction(shown: boolean, reason: EndReason): 'end' | 'exit' | 'ignore' {
  if (shown || reason === 'resume' || reason === 'timeup') return 'end';
  return reason === 'quit' ? 'exit' : 'ignore';
}
