/**
 * ANCHOR TREE — スキルツリー本体（設計書 §8・モック v26 Main.dc.html / TreeIPad.dc.html・配色は v31 ネオン）。
 *
 * キャンバスは画面より大きい（スマホ 600×1,300px / iPad 680×1,200px）。縦横ドラッグで移動・ピンチで拡大し、
 * 初期位置は左右中央。座標は manifest の pos に treeTheme の倍率を掛けるだけで、毎回レイアウト計算はしない。
 * ノード = 立方体（面が下からマスター度ぶん系統色で満ちる）+ 種別の正方形 3 つ + 分野名ラベル。
 * ノードを選んだら、ポップオーバーに隠れない位置（画面上部 100〜480px）へ自動で動かす。
 * 幅 900px 以上（iPad 横）は右 400px に常設の詳細パネル（未選択なら科目サマリー）。それ未満はポップオーバー。
 * 幅 600〜900px（iPad 縦）はスマホのレイアウトを画面幅に合わせて拡大して始める（課題 #23）。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { usePanZoom } from './usePanZoom';
import type { ArenaInfo, QType, SeasonEventState, TreeManifest, TreeProgress, TreeStage } from '../../lib/treeApi';
import { TREE_SUBJECT_ICON, TREE_SUBJECT_NAME, type TreeSubject } from '../../lib/treeSubject';
import { QTYPES } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { NodeSheet } from './NodeSheet';
import { TreeSummaryPanel } from './TreeSummaryPanel';
import { HeadPodium, HeadTrophy } from './trophy/TrophyIcon';
import { setSoundOn, soundOn } from './trophy/sfx';
import {
  IPAD_GEOM,
  IPAD_MIN_W,
  MASTER_AT,
  PHONE_GEOM,
  NEW_COLOR,
  QTYPE_ICON,
  T,
  alpha,
  ARENA_LOGO,
  CROWN,
  arenaLeft,
  groupColor,
  groupSide,
  rootClass,
  RETRO,
  BRAND,
} from './treeTheme';
import { EventNode, eventNodeState } from './event/EventNode';
import { EV_ASSET, EV_HAS_ART } from './event/evTheme';

/** イベントノード（.ev-node）の幅・その中の立方体の左端までの距離（(124 - 66) / 2）・長方形とのすき間 */
const EV_NODE_W = 124;
const EV_CUBE_DX = 29;
const EV_GAP = 16;

interface Props {
  manifest: TreeManifest;
  progress: TreeProgress;
  /** 開ける科目（2 つ以上なら科目チップで切り替え。Phase 6）*/
  subjects: TreeSubject[];
  onSubject: (s: TreeSubject) => void;
  /** いまのステージと、ABYSS を開けるか（ROUTE 全解放 / 先生）。開けるときだけ ROUTE / ABYSS のトグルを出す */
  stage: TreeStage;
  abyssOpen: boolean;
  onStage: (s: TreeStage) => void;
  selected: string | null;
  onSelect: (field: string | null) => void;
  onStart: (field: string, qtype: QType) => void;
  starting: boolean;
  /** LIFF 内ならホームへ戻るボタン、外部ブラウザならメニュー（ログアウト）*/
  onClose?: () => void;
  onLogout?: () => void;
  /** LIFF 内: 「別のブラウザで使う」（ID / URL のモーダル）*/
  onShare?: () => void;
  /** ランキング（選んでいる分野があればその分野から）*/
  onRanking: (field: string | null) => void;
  /** 先生用アカウントだけ: 生徒の進捗一覧（2026-10-17）*/
  onStaff?: () => void;
  /** 先生用 問題の確認（2026-10-20）*/
  onStaffQuestions?: () => void;
  /** 先生用アカウントだけ: 演出の確認（5 つの演出を何度でも再生。2026-10-17 夕方）*/
  onFxLab?: () => void;
  /** 未使用のチケットの枚数（ABYSS・総合優勝）。1 枚以上のときだけヘッダーにボタン */
  tickets?: number;
  onTickets?: () => void;
  /** トロフィー一覧（2026-10-19）。trophyDot = この画面で通知したトロフィーのグレード色（一覧を開くまで点を出す）*/
  onTrophies?: () => void;
  trophyDot?: string | null;
  /** チャンピオンアリーナ（設計書 §5.7）。ROUTE のツリーの一番下にノードを置く。古い Proxy では null */
  arena?: ArenaInfo | null;
  onArena?: () => void;
  /** 季節イベント（2026-10-20）: ROUTE のツリーの一番上・根の分野の右にイベントノード。無い・古い Proxy は null */
  seasonEvent?: SeasonEventState | null;
  onEvent?: () => void;
  /** 着せ替えの錨（「…」メニューの見出し）と、着せ替え画面（錨を 1 つでも持っていれば）*/
  iconSkin?: string | null;
  onDressUp?: () => void;
  loginId?: string;
  grade: string;
  nickname: string;
  message?: string | null;
  onDismissMessage?: () => void;
}

export function TreeScreen(props: Props) {
  const { manifest, progress, selected, onSelect } = props;
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.innerWidth >= IPAD_MIN_W);
  const [menu, setMenu] = useState(false);
  const [subjMenu, setSubjMenu] = useState(false);
  const [sound, setSound] = useState(soundOn);
  const canSwitch = props.subjects.length > 1;

  useEffect(() => {
    const update = () => setWide(window.innerWidth >= IPAD_MIN_W);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const geom = wide ? IPAD_GEOM : PHONE_GEOM;
  const DOCK_W = 400;
  const maxLayer = Math.max(0, ...manifest.fields.map((f) => f.pos.layer));
  /** ツリーそのものの幅（初めの表示の中央・アリーナの位置はこれで決める。イベントノードがはみ出すときだけキャンバスを右に広げる）*/
  const treeW = geom.w;
  // チャンピオンアリーナのノード（ROUTE だけ）は最下層の分野の下
  const showArena = props.stage === 'front' && !!props.arena && props.arena.subject === manifest.subject;
  const arenaY = geom.y(maxLayer) + 170;
  // イベントノード（ROUTE だけ）。ほかのノードと線でつながない（2026-10-21 先生・モック https://claude.ai/artifact/X9wdaPuKFNwK2PoAbQvKqK）:
  //   ツリーの長方形（分野ノードを囲む・右辺 = いちばん右の分野の立方体の右端・上辺 = いちばん上の分野の立方体の上端）の右の外に、
  //   イベントの立方体を 16px あけて置き、立方体の上端を長方形の上辺にそろえる。
  //   生物基礎だけは横は前の位置（根の分野の右上）のまま、縦は他の科目と同じ（長方形の上辺）
  const showEvent = props.stage === 'front' && !!props.seasonEvent && eventNodeState(props.seasonEvent) != null;
  const topLayer = Math.min(...manifest.fields.map((x) => x.pos.layer));
  const roots = manifest.fields.filter((f) => f.pos.layer === topLayer);
  const rootX = roots.length ? Math.max(...roots.map((f) => geom.x(f.pos.x))) : treeW / 2;
  const treeRight = manifest.fields.length ? Math.max(...manifest.fields.map((f) => geom.x(f.pos.x))) + 23 : treeW / 2;
  const treeTop = geom.y(topLayer) - 23;
  const evX = manifest.subject === 'biology-basic' ? Math.min(treeW - 130, rootX + 120 - 62) : treeRight + EV_GAP - EV_CUBE_DX;
  const evY = treeTop;
  const canvasW = showEvent ? Math.max(treeW, evX + EV_NODE_W + EV_GAP) : treeW;
  const canvasH = Math.max(geom.h, showArena ? arenaY + 130 : geom.y(maxLayer) + 170);

  const pz = usePanZoom({
    contentW: canvasW,
    contentH: canvasH,
    minZ: 0.6,
    maxZ: 2,
    extraBottom: selected && !wide ? 360 : 0,
  });

  // 初期位置: 左右中央・上端（スマホは左右 105px ずつ隠れる）。iPad 縦は幅に合わせて拡大（最大 1.35 倍）
  useEffect(() => {
    const { w } = pz.size();
    if (!w) return;
    const z = !wide && w > treeW ? Math.min(1.35, w / treeW) : 1;
    pz.setView({ x: (w - treeW * z) / 2, y: 0, z });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [treeW, wide]);

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
    // 枝線はネオン管: 到達 = 系統色 85% の芯 + 25% の光 6px / 未到達 = 文字色 18% の破線
    const edges: { d: string; color: string; dash: string; glow: string | null }[] = [];
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
          color: open ? alpha(col, 0.85) : alpha(T.text, 0.18),
          dash: open ? '0' : '3 5',
          glow: open ? alpha(col, 0.25) : null,
        });
      }
    }
    return { edges };
  }, [manifest, progress, geom]);

  const sel = selected ? manifest.fields.find((f) => f.id === selected) ?? null : null;
  const pct = Math.round(progress.total.mastery * 100);

  const share = props.onShare;
  const rightCount = (props.tickets && props.onTickets ? 1 : 0) + (props.onTrophies ? 1 : 0) + 2 + (props.onClose ? 1 : 0);
  const chromeCrowd = wide || !props.abyssOpen || rightCount < 4 ? '' : rightCount >= 5 ? ' is-crowded is-packed' : ' is-crowded';
  return (
    <div className={rootClass(wide ? 'tr-treeview is-wide' : 'tr-treeview')}>
      <div className="tr-caustic" />
      <div className="tr-pan" ref={pz.viewRef} onClick={() => {
          if (menu) setMenu(false);
          if (subjMenu) setSubjMenu(false);
        }}>
        <div>
          <div className="tr-canvas" ref={pz.contentRef} style={{ width: canvasW, height: canvasH }}>
            <svg
              width={canvasW}
              height={canvasH}
              viewBox={`0 0 ${canvasW} ${canvasH}`}
              aria-hidden="true"
              style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
            >
              {layout.edges.map((e, i) =>
                e.glow ? <path key={`g${i}`} d={e.d} stroke={e.glow} strokeWidth={6} fill="none" strokeLinecap="round" /> : null,
              )}
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
              const started = ready && open && m > 0;
              // ネオン管: 未解放 = 消灯 / 解放 = 点灯（輪郭 + 外側の光）/ 進行中 = 下から満ちる / マスター = 全面発光
              let face: string, border: string, icon: string, shadow: string;
              if (!ready) {
                face = 'transparent';
                border = alpha(T.text, 0.2);
                icon = alpha(T.text, 0.3);
                shadow = 'none';
              } else if (!open) {
                face = T.faceLocked;
                border = alpha(col, 0.35);
                icon = alpha(col, 0.45);
                shadow = `5px 5px 0 0 ${T.sideDark}`;
              } else if (!started) {
                face = T.face;
                border = col;
                icon = col;
                shadow = `5px 5px 0 0 ${side}, 0 0 10px ${alpha(col, 0.4)}`;
              } else {
                face = T.face;
                border = master ? T.text : col;
                icon = m >= 0.5 ? T.onColor : col;
                shadow = `5px 5px 0 0 ${side}, 0 0 14px ${alpha(col, 0.55)}`;
              }
              if (master) shadow = `5px 5px 0 0 ${side}, 0 0 18px ${alpha(col, 0.8)}, 0 0 40px ${alpha(col, 0.4)}`;
              if (isSel) {
                shadow = `${ready ? `5px 5px 0 0 ${open ? side : T.sideDark}, ` : ''}0 0 0 3px ${alpha(T.text, 0.35)}, 0 0 30px 6px ${alpha(col, 0.65)}`;
              }
              // レトロ寄りの見た目（.is-retro・ボード E01）: 角をドットに切る（clip-path）ので、同じ側面・発光を drop-shadow で
              const ds = (sd: string, blur = 0, glow = '') => `drop-shadow(5px 5px 0 ${sd})${glow ? ` drop-shadow(0 0 ${blur}px ${glow})` : ''}`;
              let filter = !ready ? 'none' : !open ? ds(T.sideDark) : !started ? ds(side, 5, alpha(col, 0.4)) : ds(side, 7, alpha(col, 0.55));
              if (master) filter = `${ds(side, 9, alpha(col, 0.8))} drop-shadow(0 0 16px ${alpha(col, 0.4)})`;
              if (isSel) filter = `${ready ? ds(open ? side : T.sideDark) + ' ' : ''}drop-shadow(0 0 2px ${alpha(T.text, 0.7)}) drop-shadow(0 0 14px ${alpha(col, 0.65)})`;
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
                      ['--tr-cf' as string]: face,
                      ['--tr-cb' as string]: border,
                      ['--tr-cfl' as string]: filter,
                    }}
                  >
                    {/* 枠 → 面の 2 重（.is-retro のときだけ角を切る。ふだんは display: contents で今のまま）*/}
                    <div className="tr-cube-b">
                    <div className="tr-cube-f">
                    <span className="tr-cube-fill" style={{ height: `${started ? m * 100 : 0}%`, background: col }} />
                    {/* 合流した生物基礎の分野は左上の角に「基」（2026-10-19 先生決定・印 1）。満ちた面に重なったら濃い文字に */}
                    {f.kiso && (
                      <i
                        className="tr-kcorner"
                        style={{ color: !ready ? icon : started && m >= 0.72 ? T.onColor : open ? col : alpha(col, 0.5) }}
                      >
                        基
                      </i>
                    )}
                    <Ico id={f.icon} size={24} />
                    </div>
                    </div>
                  </div>
                  {ready &&
                    QTYPES.map((t, k) => {
                      const ts = p?.types[t];
                      const has = (f.types[t] || []).length > 0;
                      const tStarted = open && !!ts && ts.mastery > 0;
                      return (
                        <div
                          key={t}
                          className="tr-sq"
                          style={{
                            left: x - 23 + k * 15.5,
                            top: y + 29,
                            background: !open ? T.faceLocked : tStarted ? col : T.face,
                            borderColor: !open ? alpha(col, 0.3) : col,
                            color: !open ? alpha(col, 0.4) : tStarted ? T.onColor : col,
                            boxShadow: !open
                              ? `2px 2px 0 0 ${T.sideDark}`
                              : `2px 2px 0 0 ${tStarted ? side : T.sideDark}, 0 0 6px ${alpha(col, tStarted ? 0.6 : 0.33)}`,
                            opacity: has ? 1 : 0.35,
                            ['--tr-cf' as string]: !open ? T.faceLocked : tStarted ? col : T.face,
                            ['--tr-cb' as string]: !open ? alpha(col, 0.3) : col,
                            ['--tr-cfl' as string]: !open
                              ? `drop-shadow(2px 2px 0 ${T.sideDark})`
                              : `drop-shadow(2px 2px 0 ${tStarted ? side : T.sideDark}) drop-shadow(0 0 3px ${alpha(col, tStarted ? 0.6 : 0.33)})`,
                          }}
                        >
                          <div className="tr-cube-b">
                            <div className="tr-cube-f">
                              <Ico id={QTYPE_ICON[t]} size={9} />
                            </div>
                          </div>
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
                    // 基の分野は左上の角に「基」があるので、★は右上へ（2026-10-19）
                    <span className="tr-badge" style={{ left: f.kiso ? x + 14 : x - 31, top: y - 31, background: T.text, color: side, boxShadow: `0 0 10px ${alpha(col, 0.7)}` }}>
                      <Ico id="i-star" size={10} />
                    </span>
                  )}
                  {ready && open && (p?.newCount ?? 0) > 0 && (
                    // 新着の「+n」は控えめに（2026-10-21 先生「主張が強すぎる」）: 塗りと発光をやめ、細い枠と文字の色だけ
                    <span
                      className="tr-badge tr-num tr-newbadge"
                      style={{ left: f.kiso && master ? x + 34 : x + 14, top: y - 29, color: NEW_COLOR }}
                      aria-label={`新着 ${p!.newCount} 問`}
                    >
                      +{p!.newCount}
                    </span>
                  )}
                  {!ready && (
                    <span
                      className="tr-badge"
                      style={{ left: x - 24, top: y + 27, color: alpha(T.text, 0.35), fontWeight: 500 }}
                    >
                      準備中
                    </span>
                  )}
                </div>
              );
            })}
            {showEvent && (
              <EventNode
                state={props.seasonEvent!}
                x={evX}
                y={evY}
                onOpen={() => {
                  setMenu(false);
                  onSelect(null);
                  props.onEvent?.();
                }}
              />
            )}
            {showArena && (
              <ArenaNode
                info={props.arena!}
                wide={wide}
                x={treeW / 2}
                y={arenaY}
                onOpen={() => {
                  setMenu(false);
                  onSelect(null);
                  props.onArena?.();
                }}
              />
            )}
          </div>
        </div>
      </div>

      <div className="tr-fade-top" />
      <div className="tr-fade-bottom" />
      <div className="tr-stagemark">{T.name}</div>

      {/* スマホ幅でボタンが多いとき（トロフィーのボタンを足した 2026-10-19）: 4 つ以上ならステージの切替をアイコンだけに、5 つなら丸ボタンを 32px に */}
      <div className={`tr-chrome${chromeCrowd}`}>
        <button
          type="button"
          className="tr-subject"
          aria-label={`${manifest.name} マスター度 ${pct}%${canSwitch ? '・科目を切り替える' : ''}`}
          aria-expanded={canSwitch ? subjMenu : undefined}
          onClick={() => {
            if (!canSwitch) return;
            setMenu(false);
            setSubjMenu((v) => !v);
          }}
        >
          {/* スマホ幅は科目名の代わりに科目アイコン（基礎科目は「基」付き）。科目名は切り替えメニューに出す（2026-10-17 先生の指示）*/}
          <SubjectIcon subject={manifest.subject} />
          {wide && manifest.name} <span className="tr-num">{pct}%</span>
          {canSwitch && <Ico id="i-chev-down" size={wide ? 14 : 12} />}
        </button>
        {props.abyssOpen && (
          // 選択中の側だけ「アイコン + 名前」、もう片方はアイコンだけ（2026-10-15 先生決定）
          <div className="tr-stagetoggle" role="radiogroup" aria-label="ステージ">
            {(['front', 'back'] as const).map((st) => {
              const on = props.stage === st;
              return (
                <button
                  key={st}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={st === 'front' ? 'ROUTE（共通テスト型）' : 'ABYSS（二次問題）'}
                  className={on ? 'is-on' : undefined}
                  onClick={() => !on && props.onStage(st)}
                >
                  <Ico id={st === 'front' ? 'i-route' : 'i-depth'} size={15} />
                  {on && <span className="tr-stagelabel">{st === 'front' ? 'ROUTE' : 'ABYSS'}</span>}
                </button>
              );
            })}
          </div>
        )}
        <div className="tr-chrome-r">
          {!!props.tickets && props.onTickets && (
            <button type="button" className="tr-iconbtn tr-ticketbtn" aria-label={`チケット ${props.tickets} 枚`} onClick={props.onTickets}>
              <Ico id="i-ticket" size={18} />
              <span className="tr-ticketbtn-n">{props.tickets}</span>
            </button>
          )}
          {props.onTrophies && (
            // トロフィー一覧（ドットのトロフィー）。通知したトロフィーがあって一覧をまだ開いていなければ右上に点（2026-10-19）
            <button type="button" className="tr-iconbtn tt-headbtn" aria-label={`トロフィー${props.trophyDot ? '（新しい獲得あり）' : ''}`} onClick={props.onTrophies}>
              <HeadTrophy size={20} />
              {props.trophyDot && <span className="tt-dotping" style={{ background: props.trophyDot, boxShadow: `0 0 8px ${props.trophyDot}` }} />}
            </button>
          )}
          <button type="button" className="tr-iconbtn" aria-label="ランキング" onClick={() => props.onRanking(selected)}>
            {props.onTrophies ? <HeadPodium size={19} /> : <Ico id="i-trophy" size={18} />}
          </button>
          <button type="button" className="tr-iconbtn" aria-label="その他" aria-expanded={menu} onClick={() => {
            setSubjMenu(false);
            setMenu((v) => !v);
          }}>
            <Ico id="i-more" size={18} />
          </button>
          {props.onClose && (
            <button type="button" className="tr-iconbtn" aria-label="ホームへ戻る" onClick={props.onClose}>
              <Ico id="i-close" size={16} />
            </button>
          )}
        </div>
      </div>

      {subjMenu && (
        <div className="tr-card tr-menu tr-subjmenu" role="menu">
          {props.subjects.map((s) => (
            <button
              key={s}
              type="button"
              role="menuitemradio"
              aria-checked={s === manifest.subject}
              className={s === manifest.subject ? 'is-on' : undefined}
              onClick={() => {
                setSubjMenu(false);
                props.onSubject(s);
              }}
            >
              <SubjectIcon subject={s} />
              {TREE_SUBJECT_NAME[s]}
            </button>
          ))}
        </div>
      )}

      {menu && (
        <div className="tr-card tr-menu" role="menu">
          {/* 見出し: 選んでいる錨（着せ替え・2026-10-20）*/}
          <div className="tr-menu-head" aria-hidden="true">
            <img
              src={props.iconSkin && EV_HAS_ART.has(props.iconSkin) ? EV_ASSET(props.iconSkin).icon2x : BRAND + 'icon_route.svg'}
              alt=""
              style={{ width: 26, height: 26, display: 'block', objectFit: 'contain', imageRendering: 'pixelated' }}
            />
            <span className="tr-arc" style={{ fontSize: 8 }}>ANCHOR TREE</span>
          </div>
          {props.onDressUp && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                props.onDressUp?.();
              }}
            >
              <Ico id="i-star" size={15} />
              アイコンの着せ替え
            </button>
          )}
          {props.onStaff && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                props.onStaff?.();
              }}
            >
              <Ico id="i-lines" size={15} />
              生徒の進捗（先生用）
            </button>
          )}
          {props.onStaffQuestions && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                props.onStaffQuestions?.();
              }}
            >
              <Ico id="i-lines" size={15} />
              問題の確認（先生用）
            </button>
          )}
          {props.onFxLab && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                props.onFxLab?.();
              }}
            >
              <Ico id="i-star" size={15} />
              演出の確認（先生用）
            </button>
          )}
          <button
            type="button"
            role="menuitemcheckbox"
            aria-checked={sound}
            onClick={() => {
              setSoundOn(!sound);
              setSound(!sound);
            }}
          >
            <Ico id={sound ? 'i-sound' : 'i-sound-off'} size={15} />
            効果音 {sound ? 'ON' : 'OFF'}
          </button>
          {props.loginId && !share && (
            <div>
              ログインID <span className="tr-mono" style={{ color: T.text }}>{props.loginId}</span>
            </div>
          )}
          {share && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setMenu(false);
                share();
              }}
            >
              <Ico id="i-share" size={15} />
              別のブラウザで使う
            </button>
          )}
          {props.onLogout && (
            <button type="button" role="menuitem" onClick={props.onLogout}>
              ログアウト
            </button>
          )}
        </div>
      )}

      {props.message && (
        <div className="tr-alert tr-toast" role="status" onClick={props.onDismissMessage}>
          <Ico id="i-alert" size={18} />
          <span>{props.message}</span>
        </div>
      )}

      {wide && (
        <aside
          className="tr-dock"
          style={
            sel && sel.total > 0 && progress.fields[sel.id]?.unlocked
              ? {
                  width: DOCK_W,
                  borderLeftColor: groupColor(sel.group),
                  boxShadow: `0 0 28px ${alpha(groupColor(sel.group), 0.4)}`,
                }
              : { width: DOCK_W }
          }
          aria-label="詳細"
        >
          {sel ? (
            <NodeSheet
              key={sel.id}
              docked
              field={sel}
              manifest={manifest}
              progress={progress}
              starting={props.starting}
              onClose={() => onSelect(null)}
              onStart={(t) => props.onStart(sel.id, t)}
              onRanking={() => props.onRanking(sel.id)}
            />
          ) : (
            <TreeSummaryPanel
              manifest={manifest}
              progress={progress}
              grade={props.grade}
              nickname={props.nickname}
              onSelect={(id) => onSelect(id)}
              onRanking={() => props.onRanking(null)}
            />
          )}
        </aside>
      )}

      {!wide && sel && (
        <NodeSheet
          key={sel.id}
          field={sel}
          manifest={manifest}
          progress={progress}
          starting={props.starting}
          onClose={() => onSelect(null)}
          onStart={(t) => props.onStart(sel.id, t)}
          onRanking={() => props.onRanking(sel.id)}
        />
      )}
    </div>
  );
}

/**
 * ツリーの一番下のチャンピオンアリーナのノード（設計書 §5.7・ボード A01 / A02 / A02s）。
 * 表示はシーズン終了までの日数だけ（2026-10-17 先生の指示）。中身は ドット王冠 → ドット文字 → 「あと n 日」。
 * 開放 = 周りと同じ ROUTE の面 + 金の枠・側面・発光。押している間とアリーナ画面へ移る間だけ面が夜になり、周りに紫のにじみ（選択中）。
 * 未開放 = 破線枠 + 鍵 + ドット文字をグレー
 */
function ArenaNode({ info, x, y, wide, onOpen }: { info: ArenaInfo; x: number; y: number; wide: boolean; onOpen: () => void }) {
  const open = info.open;
  const [lit, setLit] = useState(false);
  const going = useRef(false);
  const w = wide ? 244 : 234;
  const h = wide ? 106 : 102;
  return (
    <>
      {lit && open && <div className="tr-arena-haze" aria-hidden="true" style={{ left: x - w, top: y - h * 1.5, width: w * 2, height: h * 3 }} />}
      <button
        type="button"
        className={`tr-arena-gate${open ? ' is-open' : ''}${lit && open ? ' is-lit' : ''}`}
        style={{ left: x - w / 2, top: y - h / 2, width: w, height: h }}
        aria-label={`チャンピオンアリーナ${open ? '' : '（未開放）'} シーズン終了まで${arenaLeft(info.season.end).replace('あと', '')}`}
        onPointerDown={() => setLit(true)}
        onPointerUp={() => !going.current && setLit(false)}
        onPointerLeave={() => !going.current && setLit(false)}
        onPointerCancel={() => !going.current && setLit(false)}
        onClick={(ev) => {
          ev.stopPropagation();
          if (going.current) return;
          // 選択中（夜の面）を一瞬見せてからアリーナ画面へ
          going.current = true;
          setLit(true);
          window.setTimeout(() => {
            going.current = false;
            setLit(false);
            onOpen();
          }, open ? 160 : 0);
        }}
      >
        {open ? (
          <>
            <img className="tr-arena-crown" src={CROWN} alt="" style={{ width: wide ? 42 : 40 }} />
            <img className="tr-arena-logo" src={ARENA_LOGO} alt="" style={{ width: wide ? 190 : 182 }} />
            <span className="tr-arena-meta tr-ar-dot">{arenaLeft(info.season.end)}</span>
          </>
        ) : (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="tr-arena-ic">
                <Ico id={RETRO ? 'i-px-lock' : 'i-lock'} size={14} />
              </span>
              <img className="tr-arena-logo is-off" src={ARENA_LOGO} alt="" style={{ width: 164 }} />
            </span>
            <span className="tr-arena-meta">{arenaLeft(info.season.end)}</span>
          </>
        )}
      </button>
    </>
  );
}

/** 科目アイコン（基礎科目は右上に「基」）。未知の科目キーなら何も出さない */
function SubjectIcon({ subject }: { subject: string }) {
  const def = (TREE_SUBJECT_ICON as Record<string, { icon: string; kiso: boolean } | undefined>)[subject];
  if (!def) return null;
  return (
    <span className="tr-subj-ic">
      <Ico id={def.icon} size={18} />
      {def.kiso && <i className="tr-kiso">基</i>}
    </span>
  );
}
