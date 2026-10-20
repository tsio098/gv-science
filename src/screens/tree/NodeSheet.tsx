/**
 * 分野ノードをタップしたときの下部ポップオーバー（モック Main.dc.html の popover）。
 *   解放済み … 種別 3 行（問題数・マスター度・出題状況バー・挑戦）
 *   未解放   … 前提分野ごとの「52% / 70%」「達成」
 *   準備中   … 問題 0 問
 * 分野の順位・種別ごとの新着バッジ（Phase 4）。iPad 横（docked）は右の常設パネルに同じ中身を出す。
 */
import type { QType, RankInfo, TreeField, TreeManifest, TreeProgress } from '../../lib/treeApi';
import { QTYPES, QTYPE_LABEL } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { GROUP_NAME, QTYPE_ICON, REVIEW_COLOR, RETRO, T, alpha, distPct, fmtScore, groupColor, groupSide, pips20 } from './treeTheme';
import type { Dist } from '../../lib/treeApi';
import type { FieldGroup } from '../../lib/treeApi';

interface Props {
  field: TreeField;
  manifest: TreeManifest;
  progress: TreeProgress;
  starting: boolean;
  onClose: () => void;
  onStart: (qtype: QType) => void;
  onRanking?: () => void;
  /** iPad 横の右パネルに置く（ポップオーバーの枠・位置を使わない）*/
  docked?: boolean;
}

/**
 * 出題状況の 20 マス（レトロ寄りの見た目・ボード R02 / R03）。定着 = 系統色・正解済み = 系統色 45%・要復習 = 中空の枠・未着手 = 文字色 10%
 */
export function Pips({ dist, total, color, label }: { dist: Dist; total: number; color: string; label?: string }) {
  const fresh = Math.max(0, total - dist.mastered - dist.solved - dist.review);
  return (
    <div
      className="tr-pips"
      role="img"
      aria-label={`${label ? label + ' ' : ''}定着 ${dist.mastered}・正解済み ${dist.solved}・要復習 ${dist.review}・未着手 ${fresh}`}
      style={{ ['--pip' as string]: color }}
    >
      {pips20(dist, total).map((k, i) => (
        <i key={i} className={`is-${k}`} />
      ))}
    </div>
  );
}

export function NodeSheet({ field, manifest, progress, starting, onClose, onStart, onRanking, docked }: Props) {
  const box = docked ? 'tr-dock-sec' : 'tr-card tr-pop';
  const rank: RankInfo | undefined = progress.rank?.fields[field.id];
  const p = progress.fields[field.id];
  const col = groupColor(field.group);
  const side = groupSide(field.group);
  const ready = field.total > 0;
  const open = !!p?.unlocked;
  const nameOf = (id: string) => manifest.fields.find((f) => f.id === id);

  const close = (
    <button type="button" className="tr-pop-close" aria-label="閉じる" onClick={onClose}>
      <Ico id={RETRO ? 'i-px-close' : 'i-close'} size={RETRO ? 12 : 14} />
    </button>
  );

  if (!ready) {
    return (
      <div className={box} role="dialog" aria-label={field.name}>
        <div className="tr-pop-in">
        <div className="tr-pop-head">
          <div className="tr-pop-tile" style={{ border: `1.5px solid ${alpha(T.text, 0.2)}`, color: alpha(T.text, 0.45) }}>
            <Ico id={field.icon} size={22} />
          </div>
          <div className="tr-pop-title">
            <div>
              <span className="tr-pop-name">{field.name}</span>
              <span className="tr-tag" style={{ color: T.sub }}>準備中</span>
            </div>
            <div className="tr-pop-meta">
              {T.name === 'ABYSS' ? 'まだ二次問題がありません。追加されるまでお待ちください。' : 'まだ問題がありません。演習で扱うと追加されます。'}
            </div>
          </div>
          {close}
        </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className={box} role="dialog" aria-label={field.name}>
        <div className="tr-pop-in">
        <div className="tr-pop-head">
          <div
            className="tr-pop-tile"
            style={{
              background: T.faceLocked,
              border: `1.5px solid ${alpha(col, 0.35)}`,
              color: alpha(col, 0.45),
              boxShadow: `4px 4px 0 0 ${T.sideDark}`,
            }}
          >
            <Ico id={field.icon} size={22} />
          </div>
          <div className="tr-pop-title">
            <div>
              <span className="tr-pop-name">{field.name}</span>
              <span className="tr-tag" style={{ color: T.sub }}>
                <Ico id="i-lock" size={10} />
                未解放
              </span>
            </div>
            <div className="tr-pop-meta">
              {field.total} 問
            </div>
          </div>
          {close}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: T.sub }}>
          解放条件 · 前提分野で挑戦 {progress.unlockPlays ?? 5} 回以上・正答率 {progress.unlockPct}% 以上
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {p?.prereqs.map((pr) => {
            const f = nameOf(pr.field);
            const g = groupColor(f?.group ?? 'basic');
            return (
              <div key={pr.field} className="tr-row" style={{ borderRadius: 12 }}>
                <div
                  className="tr-row-tile"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: pr.done ? g : 'transparent',
                    color: pr.done ? T.onColor : alpha(T.text, 0.5),
                    boxShadow: pr.done ? `0 0 10px ${alpha(g, 0.6)}` : `inset 0 0 0 1px ${alpha(T.text, 0.2)}`,
                  }}
                >
                  <Ico id={f?.icon ?? 'i-lock'} size={13} />
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f?.name ?? pr.field}</span>
                <span className="tr-num" style={{ fontSize: 12, fontWeight: 700, color: pr.done ? T.accent : REVIEW_COLOR }}>
                  {pr.done ? '達成' : '未達成'}
                </span>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    );
  }

  const glowBox = docked
    ? undefined
    : {
        borderColor: col,
        boxShadow: `0 0 0 1px rgba(0,0,0,0.3), 0 0 28px ${alpha(col, 0.4)}, 0 24px 60px -16px rgba(0,0,0,0.7)`,
        // レトロ寄りの見た目（ボード R02）: 上の角がドットのシートの枠と光
        ['--tr-pop-c' as string]: col,
        ['--tr-pop-glow' as string]: alpha(col, 0.4),
      };
  return (
    <div className={box} role="dialog" aria-label={field.name} style={glowBox}>
      <div className="tr-pop-in">
      <div className="tr-pop-head">
        <div
          className="tr-pop-tile"
          style={{
            background: col,
            color: T.onColor,
            boxShadow: `4px 4px 0 0 ${side}, 0 0 16px ${alpha(col, 0.4)}`,
            ['--tr-cf' as string]: T.face,
            ['--tr-cb' as string]: col,
            ['--tr-cfl' as string]: `drop-shadow(4px 4px 0 ${side}) drop-shadow(0 0 8px ${alpha(col, 0.55)})`,
          }}
        >
          {/* レトロ寄りの見た目（ボード R02）: 角がドットの立方体・下からマスター度ぶん満ちる */}
          {RETRO && <span className="tr-pop-tile-fill" style={{ height: `${Math.round(p.mastery * 100)}%`, background: col }} />}
          <Ico id={field.icon} size={22} />
        </div>
        <div className="tr-pop-title">
          <div>
            <span className="tr-pop-name">{field.name}</span>
            <span className="tr-tag" style={{ color: col, boxShadow: `0 0 8px ${alpha(col, 0.4)}` }}>
              {field.kiso ? '生物基礎 · ' : ''}
              {GROUP_NAME[field.group as FieldGroup] ?? ''}
            </span>
          </div>
          <div className="tr-pop-meta">
            {!RETRO && (
              <>
                マスター度 <b className="tr-num">{Math.round(p.mastery * 100)}%</b> ·{' '}
              </>
            )}
            スコア{' '}
            <b className="tr-num">{fmtScore(p.score)}</b> / <span className="tr-num">{fmtScore(p.max)}</span>
            {rank?.rank != null && (
              <>
                {' '}
                · <b className="tr-num">{rank.rank}</b> 位 / <span className="tr-num">{rank.of}</span> 人
              </>
            )}
          </div>
        </div>
        {RETRO && (
          // MASTER の % のクローム（ボード R02）。分野色のグラデーション
          <div className="tr-pop-master">
            <span className="tr-arc">MASTER</span>
            <span
              className="tr-arc tr-chr"
              style={{ backgroundImage: `linear-gradient(180deg,#FFFFFF 0%,${alpha(col, 0.35)} 30%,${col} 52%,${side} 52%,${col} 74%,${alpha(col, 0.4)} 100%)` }}
            >
              {Math.round(p.mastery * 100)}%
            </span>
          </div>
        )}
        {close}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QTYPES.map((t) => {
          const s = p.types[t];
          const count = s?.total ?? 0;
          const m = s ? Math.round(s.mastery * 100) : 0;
          const w = s ? distPct(s.dist, count) : { mastered: 0, solved: 0, review: 0 };
          const nw = s?.newCount ?? 0;
          return (
            <div key={t} className="tr-row">
              <div
                className="tr-row-tile"
                style={{
                  background: m > 0 ? col : 'transparent',
                  border: `1px solid ${col}`,
                  color: m > 0 ? T.onColor : col,
                  boxShadow: `0 0 ${m > 0 ? 10 : 6}px ${alpha(col, m > 0 ? 0.6 : 0.25)}`,
                }}
              >
                <Ico id={QTYPE_ICON[t]} size={15} />
              </div>
              <div className="tr-row-body">
                <div className="tr-row-label">
                  <b>{QTYPE_LABEL[t]}</b>
                  <span>
                    {count} 問 · <span className="tr-num">{m}%</span>
                  </span>
                  {nw > 0 && <span className="tr-new">新着 {nw}</span>}
                </div>
                {RETRO && s ? (
                  <Pips dist={s.dist} total={count} color={col} label={QTYPE_LABEL[t]} />
                ) : (
                  <div className="tr-distbar">
                    <i style={{ width: `${w.mastered}%`, background: col, boxShadow: `0 0 8px ${col}` }} />
                    <i style={{ width: `${w.solved}%`, background: col, opacity: 0.45 }} />
                    <i style={{ width: `${w.review}%`, background: REVIEW_COLOR }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                className="tr-go"
                disabled={!count || starting}
                onClick={() => onStart(t)}
                style={{ ['--tr-go' as string]: col, ['--tr-go-side' as string]: side }}
              >
                {count ? '挑戦' : 'なし'}
              </button>
            </div>
          );
        })}
      </div>
      {onRanking && (
        <div className="tr-pop-foot">
          <button type="button" className="tr-link" onClick={onRanking}>
            <Ico id="i-trophy" size={13} />
            ランキング
          </button>
        </div>
      )}
      </div>
    </div>
  );
}
