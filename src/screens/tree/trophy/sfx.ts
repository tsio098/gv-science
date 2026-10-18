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
