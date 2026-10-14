/**
 * ANCHOR TREE — スキルツリー本体（設計書 §8・モック v26 Main.dc.html / TreeIPad.dc.html）。
 *
 * キャンバスは画面より大きい（スマホ 600×1,300px / iPad 680×1,200px）。縦横ドラッグで移動・ピンチで拡大し、
 * 初期位置は左右中央。座標は manifest の pos に treeTheme の倍率を掛けるだけで、毎回レイアウト計算はしない。
 * ノード = 立方体（面が下からマスター度ぶん系統色で満ちる）+ 種別の正方形 3 つ + 分野名ラベル。
 * ノードを選んだら、ポップオーバーに隠れない位置（画面上部 100〜480px）へ自動で動かす。
 */
import { useEffect, useMemo, useState } from 'react';
import { usePanZoom } from './usePanZoom';
import type { QType, TreeManifest, TreeProgress } from '../../lib/treeApi';
import { QTYPES } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { NodeSheet } from './NodeSheet';
import {
  IPAD_GEOM,
  IPAD_MIN_W,
  MASTER_AT,
  PHONE_GEOM,
  QTYPE_ICON,
  groupColor,
  groupSide,
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
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= IPAD_MIN_W);
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const update = () => setWide(window.innerWidth >= IPAD_MIN_W);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const geom = wide ? IPAD_GEOM : PHONE_GEOM;
  const maxLayer = Math.max(0, ...manifest.fields.map((f) => f.pos.layer));
  const canvasW = geom.w;
  const canvasH = Math.max(geom.h, geom.y(maxLayer) + 170);

  const pz = usePanZoom({
    contentW: canvasW,
    contentH: canvasH,
    minZ: 0.6,
    maxZ: 2,
    extraBottom: selected ? 360 : 0,
  });

  // 初期位置: 左右中央・上端（スマホは左右 105px ずつ隠れる）
  useEffect(() => {
    const { w } = pz.size();
    if (!w) return;
    pz.setView({ x: (w - canvasW) / 2, y: 0, z: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasW]);

  // 選んだノードを、ポップオーバーに隠れない位置へ
  useEffect(() => {
    if (!selected) return;
    const f = manifest.fields.find((x) => x.id === selected);
    if (!f) return;
    const { x, y, z } = pz.get();
    const { w: vw, h: vh } = pz.size();
    const sx = geom.x(f.pos.x) * z + x;
    const sy = geom.y(f.pos.layer) * z + y;
    const top = 100;
    const bottom = wide ? vh - 120 : Math.min(480, vh - 120);
    const nx = sx < 40 || sx > vw - 40 ? x + (vw / 2 - sx) : x;
    const ny = sy < top || sy > bottom ? y + ((top + bottom) / 2 - sy) : y;
    if (nx !== x || ny !== y) pz.setView({ x: nx, y: ny }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, wide]);

  const layout = useMemo(() => {
    const byId = new Map(manifest.fields.map((f) => [f.id, f]));
    const edges: { d: string; color: string; dash: string }[] = [];
    for (const f of manifest.fields) {
      const p = progress.fields[f.id];
      const open = !!p?.unlocked && f.total > 0;
      const col = groupColor(f.group);
      const fx = geom.x(f.pos.x);
      const y = geom.y(f.pos.layer);
      for (const pre of f.prereqs) {
        const a = byId.get(pre);
        if (!a) continue;
        const ax = geom.x(a.pos.x);
        const ay = geom.y(a.pos.layer);
        edges.push({
          d: `M ${ax} ${ay + 24} C ${ax} ${ay + 64}, ${fx} ${y - 64}, ${fx} ${y - 24}`,
          color: open ? col + '8C' : 'rgba(249,247,242,0.16)',
          dash: open ? '0' : '3 5',
        });
      }
    }
    return { edges };
  }, [manifest, progress, geom]);

  const sel = selected ? manifest.fields.find((f) => f.id === selected) ?? null : null;
  const pct = Math.round(progress.total.mastery * 100);

  return (
    <div className="tr-root">
      <div className="tr-pan" ref={pz.viewRef} onClick={() => menu && setMenu(false)}>
        <div>
          <div className="tr-canvas" ref={pz.contentRef} style={{ width: canvasW, height: canvasH }}>
            <svg
              width={canvasW}
              height={canvasH}
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              aria-hidden="true"
              style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
            >
              {layout.edges.map((e, i) => (
                <path
                  key={i}
                  d={e.d}
                  stroke={e.color}
                  strokeWidth={1.5}
                  strokeDasharray={e.dash}
                  fill="none"
                  strokeLinecap="round"
                />
              ))}
            </svg>
            {manifest.fields.map((f) => {
              const p = progress.fields[f.id];
              const x = geom.x(f.pos.x);
              const y = geom.y(f.pos.layer);
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
                  <span
                    className="tr-label"
                    style={{
                      left: x - geom.labelW / 2,
                      top: y + geom.labelDy,
                      width: geom.labelW,
                      color: !ready ? geom.labelColor.empty : open ? geom.labelColor.open : geom.labelColor.locked,
                    }}
                  >
                    {f.name}
                  </span>
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

      <div className="tr-fade-top" />
      <div className="tr-fade-bottom" />

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

      {!sel && <div className="tr-hint">ドラッグで移動 · ピンチで拡大 · ノードをタップで詳細</div>}

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
