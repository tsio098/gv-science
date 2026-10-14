/**
 * ANCHOR TREE — スキルツリー本体（設計書 §8・モック Main.dc.html）。
 *
 * 座標はモックと同じ 390px 幅の系（manifest の fields[].pos）。画面幅に合わせて
 * キャンバス全体を transform: scale で拡縮し、縦はスクロール。毎回レイアウト計算はしない。
 * ノード = 立方体（面が下からマスター度ぶん系統色で満ちる）+ 種別の正方形 3 つ。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { QType, TreeManifest, TreeProgress } from '../../lib/treeApi';
import { QTYPES } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { NodeSheet } from './NodeSheet';
import {
  CANVAS_W,
  MASTER_AT,
  QTYPE_ICON,
  groupColor,
  groupSide,
  layerY,
} from './treeTheme';

interface Props {
  manifest: TreeManifest;
  progress: TreeProgress;
  selected: string | null;
  onSelect: (field: string | null) => void;
  onStart: (field: string, qtype: QType) => void;
  starting: boolean;
  /** LIFF 内ならホームへ戻るボタン、外部ブラウザならメニュー（ログアウト）*/
  onClose?: () => void;
  onLogout?: () => void;
  loginId?: string;
  message?: string | null;
  onDismissMessage?: () => void;
}

export function TreeScreen(props: Props) {
  const { manifest, progress, selected, onSelect } = props;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(CANVAS_W);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth || CANVAS_W);
    update();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    ro?.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro?.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  const maxLayer = Math.max(0, ...manifest.fields.map((f) => f.pos.layer));
  const canvasH = layerY(maxLayer) + 23 + 29 + 15 + 70;
  const scale = Math.min(Math.max(width / CANVAS_W, 0.8), 1.5);

  const layout = useMemo(() => {
    const byId = new Map(manifest.fields.map((f) => [f.id, f]));
    const edges: { d: string; color: string; dash: string }[] = [];
    for (const f of manifest.fields) {
      const p = progress.fields[f.id];
      const open = !!p?.unlocked && f.total > 0;
      const col = groupColor(f.group);
      const y = layerY(f.pos.layer);
      for (const pre of f.prereqs) {
        const a = byId.get(pre);
        if (!a) continue;
        const ay = layerY(a.pos.layer);
        edges.push({
          d: `M ${a.pos.x} ${ay + 24} C ${a.pos.x} ${ay + 64}, ${f.pos.x} ${y - 64}, ${f.pos.x} ${y - 24}`,
          color: open ? col + '8C' : 'rgba(249,247,242,0.16)',
          dash: open ? '0' : '3 5',
        });
      }
    }
    return { edges };
  }, [manifest, progress]);

  const sel = selected ? manifest.fields.find((f) => f.id === selected) ?? null : null;
  const pct = Math.round(progress.total.mastery * 100);

  return (
    <div className="tr-root">
      <div className="tr-scroll" ref={scrollRef} onClick={() => menu && setMenu(false)}>
        <div
          className="tr-sizer"
          style={{ width: CANVAS_W * scale, height: canvasH * scale + (sel ? 320 : 0) }}
        >
          <div className="tr-canvas" style={{ width: CANVAS_W, height: canvasH, transform: `scale(${scale})` }}>
            <svg
              width={CANVAS_W}
              height={canvasH}
              viewBox={`0 0 ${CANVAS_W} ${canvasH}`}
              aria-hidden="true"
              style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
            >
              {layout.edges.map((e, i) => (
                <path
                  key={i}
                  d={e.d}
                  stroke={e.color}
                  strokeWidth={2}
                  strokeDasharray={e.dash}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
            </svg>
            {manifest.fields.map((f) => {
              const p = progress.fields[f.id];
              const x = f.pos.x;
              const y = layerY(f.pos.layer);
              const col = groupColor(f.group);
              const side = groupSide(f.group);
              const ready = f.total > 0;
              const open = !!p?.unlocked;
              const m = p ? p.mastery : 0;
              const master = ready && open && m >= MASTER_AT;
              const isSel = selected === f.id;
              let face: string, border: string, icon: string, shadow: string;
              if (!ready) {
                face = 'transparent';
                border = 'rgba(249,247,242,0.22)';
                icon = 'rgba(249,247,242,0.3)';
                shadow = 'none';
              } else if (!open) {
                face = '#2E3B2B';
                border = col + 'B3';
                icon = col + 'B3';
                shadow = '6px 6px 0 0 #1F2A1E';
              } else if (m <= 0) {
                face = '#4A5C45';
                border = 'rgba(249,247,242,0.18)';
                icon = '#F9F7F2';
                shadow = '6px 6px 0 0 #2F3C2C';
              } else {
                face = '#4A5C45';
                border = master ? 'rgba(249,247,242,0.9)' : 'transparent';
                icon = m >= 0.5 ? '#1F2A1E' : '#F9F7F2';
                shadow = `6px 6px 0 0 ${side}`;
              }
              if (master) shadow = `6px 6px 0 0 ${side}, 0 0 16px 2px ${col}66`;
              if (isSel) {
                shadow = `${shadow === 'none' ? '' : `6px 6px 0 0 ${open && ready ? side : '#1F2A1E'}, `}0 0 0 4px rgba(249,247,242,0.22), 0 0 24px 4px ${col}80`;
              }
              const label = `${f.name}${!ready ? ' 準備中' : open ? ` マスター度 ${Math.round(m * 100)}%` : ' 未解放'}`;
              return (
                <div key={f.id}>
                  <button
                    type="button"
                    className="tr-hit"
                    style={{ left: x - 28, top: y - 28 }}
                    aria-label={label}
                    aria-pressed={isSel}
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenu(false);
                      onSelect(isSel ? null : f.id);
                    }}
                  />
                  <div
                    className="tr-cube"
                    style={{
                      left: x - 23,
                      top: y - 23,
                      background: face,
                      borderColor: border,
                      color: icon,
                      boxShadow: shadow,
                      transform: isSel ? 'scale(1.14)' : undefined,
                      zIndex: isSel ? 10 : 2,
                    }}
                  >
                    <span style={{ height: `${ready && open ? m * 100 : 0}%`, background: col }} />
                    <Ico id={f.icon} size={24} />
                  </div>
                  {ready &&
                    QTYPES.map((t, k) => {
                      const ts = p?.types[t];
                      const has = (f.types[t] || []).length > 0;
                      const started = open && !!ts && ts.mastery > 0;
                      return (
                        <div
                          key={t}
                          className="tr-sq"
                          style={{
                            left: x - 23 + k * 15.5,
                            top: y + 29,
                            background: !open ? '#2E3B2B' : started ? col : '#4A5C45',
                            borderColor: !open ? col + '80' : started ? col : 'rgba(249,247,242,0.18)',
                            color: !open ? col + '99' : started ? '#1F2A1E' : '#F9F7F2',
                            boxShadow: `2px 2px 0 0 ${!open ? '#1F2A1E' : started ? side : '#2F3C2C'}`,
                            opacity: has ? 1 : 0.35,
                          }}
                        >
                          <Ico id={QTYPE_ICON[t]} size={9} />
                        </div>
                      );
                    })}
                  {master && (
                    <span className="tr-badge" style={{ left: x - 31, top: y - 31, background: '#F9F7F2', color: side }}>
                      <Ico id="i-star" size={10} />
                    </span>
                  )}
                  {!ready && (
                    <span
                      className="tr-badge"
                      style={{ left: x - 24, top: y + 27, color: 'rgba(249,247,242,0.35)', fontWeight: 500 }}
                    >
                      準備中
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="tr-chrome">
        <button type="button" className="tr-subject" aria-label={`${manifest.name} マスター度 ${pct}%`}>
          {manifest.name} <span className="tr-num">{pct}%</span>
        </button>
        {props.onClose ? (
          <button type="button" className="tr-iconbtn" aria-label="ホームへ戻る" onClick={props.onClose}>
            <Ico id="i-close" size={16} />
          </button>
        ) : (
          <button type="button" className="tr-iconbtn" aria-label="その他" onClick={() => setMenu((v) => !v)}>
            <Ico id="i-more" size={18} />
          </button>
        )}
      </div>

      {menu && (
        <div className="tr-card tr-menu" role="menu">
          {props.loginId && (
            <div>
              ログインID <span className="tr-mono" style={{ color: '#F9F7F2' }}>{props.loginId}</span>
            </div>
          )}
          <button type="button" role="menuitem" onClick={props.onLogout}>
            ログアウト
          </button>
        </div>
      )}

      {props.message && (
        <div className="tr-alert tr-toast" role="status" onClick={props.onDismissMessage}>
          <Ico id="i-alert" size={18} />
          <span>{props.message}</span>
        </div>
      )}

      {!sel && <div className="tr-hint">ノードをタップで詳細</div>}

      {sel && (
        <NodeSheet
          key={sel.id}
          field={sel}
          manifest={manifest}
          progress={progress}
          starting={props.starting}
          onClose={() => onSelect(null)}
          onStart={(t) => props.onStart(sel.id, t)}
        />
      )}
    </div>
  );
}
