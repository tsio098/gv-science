/**
 * トロフィー・通知の効果音（実装手順_トロフィー §6.5・ボード「出現アニメーションと効果音」の譜面）。
 * WebAudio の矩形波・三角波だけで鳴らす（音源ファイルなし）。
 * ブラウザは最初のタップまで音を出せないので、pointerdown を 1 回だけ拾って AudioContext を作る。
 * まだ解錠されていなければ鳴らさない（通知だけ出す。ツリーを開いた直後の通知は無音になりうる・仕様として受け入れる）。
 */

/** [midi, 開始秒, 長さ秒, 波形='square', 音量=1, 終わりの midi（グライド）] */
type Note = [number, number, number, OscillatorType?, number?, number?];

/** 既定は ON（ボードどおり。教室で鳴らさないかは先生の決定待ち＝実装手順 §9-4。変えるならここだけ）*/
export const SOUND_DEFAULT = true;
const SOUND_KEY = 'gvTree.sound';

export function soundOn(): boolean {
  try {
    const v = localStorage.getItem(SOUND_KEY);
    return v == null ? SOUND_DEFAULT : v === '1';
  } catch {
    return SOUND_DEFAULT;
  }
}

export function setSoundOn(on: boolean) {
  try {
    localStorage.setItem(SOUND_KEY, on ? '1' : '0');
  } catch {
    /* 保存できない端末はこの画面の間だけ */
  }
}

export const reducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let ac: AudioContext | null = null;
let unlocked = false;

/**
 * 音の解錠（2026-10-19 レビューで修正）: 指を離した・クリックしたとき（iOS はタッチの開始では解錠できないことがある）に
 * AudioContext を作って resume し、本当に running になってから解錠済みにする（失敗したら次のタップでもう一度）。
 * iOS はアプリを切り替えると 'interrupted' になるので、running 以外はすべて resume し直す
 */
const UNLOCK_EVENTS = ['pointerdown', 'pointerup', 'touchend', 'click'] as const;
function unlock() {
  if (unlocked) return;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ac = ac ?? new AC();
    const ok = () => {
      if (!ac || ac.state !== 'running' || unlocked) return;
      unlocked = true;
      for (const ev of UNLOCK_EVENTS) document.removeEventListener(ev, unlock, true);
    };
    if (ac.state !== 'running') void ac.resume().then(ok, () => {});
    ok();
  } catch {
    /* 音の出せない端末は無音 */
  }
}
if (typeof document !== 'undefined') for (const ev of UNLOCK_EVENTS) document.addEventListener(ev, unlock, true);

export function sfx(seq: Note[], delay = 0) {
  if (!unlocked || !ac || !soundOn() || reducedMotion()) return;
  try {
    // アプリを切り替えた後など（suspended / interrupted）は鳴らし直す。戻らなければ今回は無音
    if (ac.state !== 'running') void ac.resume().catch(() => {});
    const t0 = ac.currentTime + delay;
    const out = ac.createGain();
    out.gain.value = 0.12;
    out.connect(ac.destination);
    const hz = (m: number) => 440 * 2 ** ((m - 69) / 12);
    for (const [m, s, d, type = 'square', v = 1, m2] of seq) {
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.type = type;
      o.frequency.setValueAtTime(hz(m), t0 + s);
      if (m2) o.frequency.exponentialRampToValueAtTime(hz(m2), t0 + s + d);
      g.gain.setValueAtTime(0.0001, t0 + s);
      g.gain.linearRampToValueAtTime(v, t0 + s + 0.005);
      g.gain.setValueAtTime(v, t0 + s + d * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
      o.connect(g);
      g.connect(out);
      o.start(t0 + s);
      o.stop(t0 + s + d + 0.03);
    }
  } catch {
    /* 鳴らせなくても通知は出す */
  }
}

const roll: Note[] = Array.from({ length: 10 }, (_, i) => [i % 2 ? 45 : 43, i * 0.055, 0.045, 'triangle', 0.5 + i * 0.05] as Note);

export const SEQ = {
  bronze: [[88, 0, 0.07], [95, 0.07, 0.16]],
  silver: [[84, 0, 0.06], [88, 0.06, 0.06], [91, 0.12, 0.06], [96, 0.18, 0.22], [96, 0.42, 0.12, 'square', 0.3]],
  gold: [[48, 0, 0.55, 'triangle', 0.9], [84, 0, 0.06], [88, 0.06, 0.06], [91, 0.12, 0.06], [96, 0.18, 0.1], [100, 0.28, 0.06], [103, 0.34, 0.3], [108, 0.66, 0.05, 'square', 0.4], [105, 0.72, 0.05, 'square', 0.3], [108, 0.78, 0.1, 'square', 0.3]],
  platinum: [[48, 0, 0.27, 'triangle', 0.9], [55, 0.27, 0.35, 'triangle', 0.9], [48, 0.62, 0.9, 'triangle', 0.9], [79, 0, 0.08], [79, 0.09, 0.08], [79, 0.18, 0.08], [84, 0.27, 0.3], [84, 0.62, 0.04], [88, 0.66, 0.04], [91, 0.7, 0.04], [96, 0.74, 0.04], [100, 0.78, 0.04], [103, 0.82, 0.04], [108, 0.86, 0.6], [100, 0.86, 0.6, 'square', 0.5], [103, 0.86, 0.6, 'square', 0.4], [115, 1.2, 0.05, 'square', 0.3], [112, 1.28, 0.05, 'square', 0.25], [115, 1.36, 0.12, 'square', 0.25]],
  node: [[81, 0, 0.06], [93, 0.06, 0.12]],
  rank: [[74, 0, 0.2, 'square', 0.8, 98], [96, 0.22, 0.12]],
  /** 順位ダウン: 上がる音を逆に（下がるグライド → 低い音）*/
  rankDown: [[98, 0, 0.2, 'square', 0.8, 74], [70, 0.22, 0.14, 'triangle', 1]],
  news: [[93, 0, 0.05], [93, 0.09, 0.05], [100, 0.18, 0.1]],
  progress: [[91, 0, 0.05], [96, 0.06, 0.12, 'triangle', 1]],
  arena: [[48, 0, 0.1, 'triangle', 0.9], [67, 0, 0.08], [72, 0.1, 0.08], [79, 0.2, 0.2], [55, 0.2, 0.2, 'triangle', 0.9]],
  teacher: [[88, 0, 0.2, 'triangle', 1], [84, 0.22, 0.32, 'triangle', 1], [100, 0.22, 0.06, 'square', 0.25]],
  firstOther: [[91, 0, 0.06], [96, 0.07, 0.06], [103, 0.14, 0.16]],
  /** 残念トロフィー（2026-10-19）: 下がっていく 4 音（ワ・ワ・ワ・ワーン・最後はグライドで下がる）*/
  oops: [[67, 0, 0.22, 'square', 0.55], [66, 0.26, 0.22, 'square', 0.55], [65, 0.52, 0.22, 'square', 0.55], [64, 0.78, 0.62, 'square', 0.55, 59], [40, 0.78, 0.62, 'triangle', 0.8, 36]],
  /** トロフィーレベル 30（LV.30 チケット）: 駆け上がり → 和音 → キラッ */
  level30: [
    [48, 0, 0.5, 'triangle', 0.9], [72, 0, 0.07], [76, 0.07, 0.07], [79, 0.14, 0.07], [84, 0.21, 0.07], [88, 0.28, 0.07], [91, 0.35, 0.07],
    [96, 0.42, 0.5], [100, 0.42, 0.5, 'square', 0.45], [91, 0.42, 0.5, 'square', 0.35], [55, 0.42, 0.55, 'triangle', 0.9],
    [103, 0.98, 0.05, 'square', 0.3], [108, 1.04, 0.05, 'square', 0.3], [112, 1.1, 0.16, 'square', 0.25],
  ],
  /**
   * 季節イベント（2026-10-20・ClaudeCode指示_ハロウィン実装 §6・ボード「獲得の演出と効果音」）
   * EVENT CLEAR!!: 短調で下がる 4 音 → ミが沈む → 速く上がる 4 音 → スタンプと同時にイ短調の和音 → おばけの「ひゅ〜」
   */
  evClear: [
    [45, 0, 0.4, 'triangle', 0.9], [88, 0, 0.06], [84, 0.07, 0.06], [81, 0.14, 0.06], [77, 0.21, 0.06], [76, 0.28, 0.1, 'square', 1, 75],
    [69, 0.4, 0.03, 'square', 0.8], [72, 0.43, 0.03, 'square', 0.8], [76, 0.46, 0.03, 'square', 0.8], [81, 0.49, 0.03, 'square', 0.8],
    [88, 0.52, 0.5], [84, 0.52, 0.5, 'square', 0.45], [81, 0.52, 0.5, 'square', 0.35], [45, 0.52, 0.6, 'triangle', 0.9], [57, 0.52, 0.6, 'triangle', 0.6],
    [93, 0.92, 0.45, 'triangle', 0.4, 86],
  ],
  /** TICKET GET!: すべり込みのグライド → ト短調で上がる 3 音 → スタンプと同時に和音と低い「ドン」→ キラッ 3 音 */
  evTicket: [
    [74, 0, 0.3, 'square', 0.3, 98], [79, 0.36, 0.05], [82, 0.41, 0.05], [86, 0.46, 0.05],
    [91, 0.52, 0.32], [86, 0.52, 0.32, 'square', 0.45], [82, 0.52, 0.32, 'square', 0.35], [43, 0.52, 0.4, 'triangle', 0.9], [31, 0.52, 0.14, 'triangle', 1],
    [103, 0.9, 0.05, 'square', 0.3], [98, 0.96, 0.05, 'square', 0.25], [103, 1.02, 0.12, 'square', 0.25],
  ],
  /**
   * Message in a Bottle（2026-10-25・ボード FX_bottle / FX_trophy の SEQ のまま）。RETURNED は鳴らさない
   * NEW BOTTLE!: 水のしずく → 駆け上がり → 和音 → 泡の 3 音
   */
  evBottle: [[84,0,.16,'sine',.9,57],[60,.1,.12,'triangle',.5],[76,.36,.05],[79,.41,.05],[84,.46,.05],
    [88,.52,.4],[84,.52,.4,'square',.45],[79,.52,.4,'square',.35],[48,.52,.5,'triangle',.9],
    [96,.9,.04,'sine',.5,101],[99,.98,.04,'sine',.45,104],[103,1.06,.06,'sine',.4,108]],
  /** ???: 低い響き → 下がる 3 音 → 短調の和音 → 深海の光 */
  evMystery: [[33,0,.7,'triangle',1],[45,0,.5,'triangle',.5],[75,.36,.05],[72,.41,.05],[68,.46,.05],
    [75,.52,.55,'square',.4],[70,.52,.55,'square',.3],[66,.52,.55,'square',.3],[39,.52,.7,'triangle',.9],[87,1.0,.35,'sine',.35,99]],
  /** EVENT CLEAR!!（金のボトル）*/
  evBottleClear: [[48,0,.4,'triangle',.9],[88,0,.06],[84,.07,.06],[79,.14,.06],[76,.21,.06],[72,.28,.1,'square',1,74],
    [72,.40,.03,'square',.8],[76,.43,.03,'square',.8],[79,.46,.03,'square',.8],[84,.49,.03,'square',.8],
    [88,.52,.5],[84,.52,.5,'square',.45],[79,.52,.5,'square',.35],[48,.52,.6,'triangle',.9],[60,.52,.6,'triangle',.6],
    [96,.95,.04,'sine',.5,101],[99,1.02,.04,'sine',.45,104],[103,1.09,.08,'sine',.4,108]],
  /** 鳴らさない（RETURNED）*/
  silent: [],
  firstSelf: [
    ...roll, // ドラムロール
    [31, 0.58, 0.22, 'triangle', 1], [60, 0.58, 0.09, 'square', 0.6], [64, 0.58, 0.09, 'square', 0.5], [67, 0.58, 0.09, 'square', 0.5], // ドン
    [79, 0.74, 0.08], [84, 0.82, 0.08], [88, 0.9, 0.08], [91, 0.98, 0.08], // ファンファーレ
    [96, 1.06, 0.62], [100, 1.06, 0.62, 'square', 0.45], [91, 1.06, 0.62, 'square', 0.35], [48, 1.06, 0.7, 'triangle', 0.9],
    [108, 1.52, 0.05, 'square', 0.3], [111, 1.58, 0.05, 'square', 0.25], [115, 1.64, 0.14, 'square', 0.25], // キラッ
  ],
} satisfies Record<string, Note[]>;

export type SfxName = keyof typeof SEQ;

/** 通知を出してから鳴らすまで（白く光るコマと同時。ファースト（自分）はドラムロールが入場に重なる）*/
export const SFX_DELAY: Partial<Record<SfxName, number>> = { firstSelf: 0.32, firstOther: 0.5 };
/** speed = 再生速度（ゆっくり再生では鳴らす時刻だけ遅らせる。音そのものの速さは変えない）*/
export const playSfx = (name: SfxName, speed = 1) => sfx(SEQ[name] as Note[], (SFX_DELAY[name] ?? 0.62) / speed);
/** 音の状態（先生用「演出の確認」に出す）: 鳴らせるか・まだ最初のタップ前か */
export const soundState = () => ({ unlocked, running: !!ac && ac.state === 'running' });
