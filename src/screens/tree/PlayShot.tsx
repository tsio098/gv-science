/**
 * 出題画面のスクショ（2026-10-17 先生の指示。出題画面だけ）。
 * 右下（解答パッドのすぐ上）のボタンで、いま見えている出題画面をそのまま画像にして全画面で見せる。
 * LINE 内ブラウザは画像のダウンロードが効かないことが多いので、画像の長押しで保存 + 対応端末は「共有」で写真・LINE へ送る
 * （共有シートが無い端末は「保存」＝ダウンロード）。撮っている間もタイマーは止めない。
 * 画像化のライブラリ（modern-screenshot）は押したときだけ読み込む。問題画像は blob URL なのでそのまま写る。
 * ボタンは撮る瞬間だけ透明にする（消すとパッドの並びが変わる）。プレビューは出題画面のいちばん外側に portal で出す（パッドの中だと閉じ込められる）。
 * スクロールしている問題はスクロール位置のまま写す（restoreScrollPosition）。アイコンは sprite に頼らずインラインで描く
 *
 * 2026-10-17 先生の報告「問題が写らない」: LINE（WebKit）では、画像を SVG foreignObject 経由で canvas に描く方式だと
 * 問題画像（blob URL の <img>）だけ抜け落ちることがある。→ 画面の DOM は今までどおり画像化し、問題画像はその上に
 * 自前で描き直す（drawQuestionImages）。画面に見えている位置・大きさ・はみ出し（スクロール・ピンチ拡大）はそのまま。
 * DOM 側の画像は複製の中で非表示にして二重に写らないようにする。
 */
import { useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";

/** このクラスの要素はスクショに写さない */
export const SHOT_SKIP = "tr-noshot";
/** 自前で描き直す画像に撮る間だけ付ける印（複製にも写る）*/
const SHOT_IMG = "data-shot-img";

type Rect = { left: number; top: number; right: number; bottom: number };

const intersect = (a: Rect, b: Rect): Rect | null => {
  const r = {
    left: Math.max(a.left, b.left),
    top: Math.max(a.top, b.top),
    right: Math.min(a.right, b.right),
    bottom: Math.min(a.bottom, b.bottom),
  };
  return r.right - r.left > 0.5 && r.bottom - r.top > 0.5 ? r : null;
};

/** 画面に写る問題画像（読み込み済みの blob URL の <img>。撮らない要素の中は除く）*/
function questionImages(root: HTMLElement): HTMLImageElement[] {
  return [...root.querySelectorAll<HTMLImageElement>("img")].filter(
    (im) =>
      im.src.startsWith("blob:") &&
      im.complete &&
      im.naturalWidth > 0 &&
      !im.closest(`.${SHOT_SKIP}`),
  );
}

/**
 * 画像を、画面に見えているとおり（先祖の overflow で切れる範囲だけ）canvas に描く。
 * 座標は root の左上を原点にした CSS px × scale
 */
function drawQuestionImages(
  ctx: CanvasRenderingContext2D,
  root: HTMLElement,
  imgs: HTMLImageElement[],
  scale: number,
) {
  const base = root.getBoundingClientRect();
  for (const im of imgs) {
    const ir = im.getBoundingClientRect();
    let clip: Rect | null = { left: base.left, top: base.top, right: base.right, bottom: base.bottom };
    for (let e = im.parentElement; e && clip; e = e.parentElement) {
      const cs = getComputedStyle(e);
      const clips = (v: string) => v === "hidden" || v === "auto" || v === "scroll" || v === "clip";
      if (clips(cs.overflowX) || clips(cs.overflowY)) {
        const r = e.getBoundingClientRect();
        clip = intersect(clip, {
          left: r.left + e.clientLeft,
          top: r.top + e.clientTop,
          right: r.left + e.clientLeft + e.clientWidth,
          bottom: r.top + e.clientTop + e.clientHeight,
        });
      }
      if (e === root) break;
    }
    const vis = clip && intersect(clip, { left: ir.left, top: ir.top, right: ir.right, bottom: ir.bottom });
    if (!vis) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(
      (vis.left - base.left) * scale,
      (vis.top - base.top) * scale,
      (vis.right - vis.left) * scale,
      (vis.bottom - vis.top) * scale,
    );
    ctx.clip();
    try {
      ctx.drawImage(im, (ir.left - base.left) * scale, (ir.top - base.top) * scale, ir.width * scale, ir.height * scale);
    } catch {
      /* 描けない画像は飛ばす（DOM 側の写りに任せる）*/
    }
    ctx.restore();
  }
}

/** 背景が透明なら親をたどって最初の色（無ければ白）*/
function bgOf(el: HTMLElement | null): string {
  for (let e = el; e; e = e.parentElement) {
    const c = getComputedStyle(e).backgroundColor;
    if (c && c !== "transparent" && !/^rgba\(.*,\s*0\)$/.test(c)) return c;
  }
  return "#ffffff";
}

const stamp = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

const CameraIcon = () => (
  <svg width={20} height={20} viewBox="0 0 24 24" aria-hidden="true">
    <g
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 8h3l1.6-2.4A1.4 1.4 0 0 1 9.8 5h4.4a1.4 1.4 0 0 1 1.2.6L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13" r="3.6" />
    </g>
  </svg>
);

export function PlayShot({ target }: { target: RefObject<HTMLElement> }) {
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState<{
    url: string;
    file: File;
    canShare: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const take = async () => {
    const el = target.current;
    if (!el || busy) return;
    setBusy(true);
    setError(null);
    // 自前で描き直す問題画像（先に 1 px の canvas に描けるか試し、描けるものだけ複製側で隠す）
    const probe = document.createElement("canvas").getContext("2d");
    const imgs = questionImages(el).filter((im) => {
      try {
        probe?.drawImage(im, 0, 0, 1, 1);
        return true;
      } catch {
        return false;
      }
    });
    try {
      const { domToCanvas } = await import("modern-screenshot");
      const scale = Math.min(2, window.devicePixelRatio || 1);
      imgs.forEach((im, i) => im.setAttribute(SHOT_IMG, String(i)));
      const canvas = await domToCanvas(el, {
        scale,
        backgroundColor: bgOf(el),
        filter: (n) =>
          !(n instanceof Element && n.classList.contains(SHOT_SKIP)),
        features: { restoreScrollPosition: true },
        onCloneNode: (clone) => {
          if (!(clone instanceof Element)) return;
          clone
            .querySelectorAll<HTMLElement>(`img[${SHOT_IMG}]`)
            .forEach((n) => (n.style.visibility = "hidden"));
        },
      });
      const ctx = canvas.getContext("2d");
      if (ctx) drawQuestionImages(ctx, el, imgs, scale);
      const url = canvas.toDataURL("image/png");
      const file = new File(
        [await (await fetch(url)).blob()],
        `anchor-tree-${stamp()}.png`,
        { type: "image/png" },
      );
      let canShare = false;
      try {
        canShare =
          typeof navigator.share === "function" &&
          !!navigator.canShare?.({ files: [file] });
      } catch {
        canShare = false;
      }
      setShot({ url, file, canShare });
    } catch {
      setError("スクショを作れませんでした。もう一度お試しください。");
    } finally {
      imgs.forEach((im) => im.removeAttribute(SHOT_IMG));
      setBusy(false);
    }
  };

  const send = async () => {
    if (!shot) return;
    if (shot.canShare) {
      try {
        await navigator.share({ files: [shot.file] });
      } catch {
        /* キャンセル・失敗は何もしない（長押しで保存できる）*/
      }
      return;
    }
    const a = document.createElement("a");
    a.href = shot.url;
    a.download = shot.file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const layer = (node: ReactNode) =>
    target.current ? createPortal(node, target.current) : node;

  return (
    <>
      <button
        type="button"
        className={`tr-shot${busy ? " is-shooting" : ""}`}
        aria-label="この画面のスクショを撮る"
        disabled={busy}
        onClick={() => void take()}
      >
        {busy ? (
          <span className="tr-shot-spin" aria-hidden="true" />
        ) : (
          <CameraIcon />
        )}
      </button>

      {error &&
        layer(
          <div className={`tr-overlay ${SHOT_SKIP}`} role="alertdialog">
            <div className="tr-card">
              <div>{error}</div>
              <button
                type="button"
                className="tr-ghost"
                onClick={() => setError(null)}
              >
                閉じる
              </button>
            </div>
          </div>,
        )}

      {shot &&
        layer(
          <div
            className={`tr-overlay tr-shot-overlay ${SHOT_SKIP}`}
            role="dialog"
            aria-label="スクショ"
          >
            <div className="tr-shot-card">
              <img
                src={shot.url}
                alt="この画面のスクショ"
                className="tr-shot-img"
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="tr-ghost"
                  style={{ flex: 1 }}
                  onClick={() => setShot(null)}
                >
                  閉じる
                </button>
                <button
                  type="button"
                  className="tr-cta"
                  style={{ flex: 1.4 }}
                  onClick={() => void send()}
                >
                  {shot.canShare ? "共有" : "保存"}
                </button>
              </div>
            </div>
          </div>,
        )}
    </>
  );
}
