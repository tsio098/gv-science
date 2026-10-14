/**
 * 分野ノードをタップしたときの下部ポップオーバー（モック Main.dc.html の popover）。
 *   解放済み … 種別 3 行（問題数・マスター度・出題状況バー・挑戦）
 *   未解放   … 前提分野ごとの「52% / 70%」「達成」
 *   準備中   … 問題 0 問
 * 順位・新着バッジは Phase 4。
 */
import type { QType, TreeField, TreeManifest, TreeProgress } from '../../lib/treeApi';
import { QTYPES, QTYPE_LABEL } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { GROUP_NAME, QTYPE_ICON, distPct, fmtScore, groupColor, groupSide } from './treeTheme';
import type { FieldGroup } from '../../lib/treeApi';

interface Props {
  field: TreeField;
  manifest: TreeManifest;
  progress: TreeProgress;
  starting: boolean;
  onClose: () => void;
  onStart: (qtype: QType) => void;
}

export function NodeSheet({ field, manifest, progress, starting, onClose, onStart }: Props) {
  const p = progress.fields[field.id];
  const col = groupColor(field.group);
  const side = groupSide(field.group);
  const ready = field.total > 0;
  const open = !!p?.unlocked;
  const nameOf = (id: string) => manifest.fields.find((f) => f.id === id);

  const close = (
    <button type="button" className="tr-pop-close" aria-label="閉じる" onClick={onClose}>
      <Ico id="i-close" size={14} />
    </button>
  );

  if (!ready) {
    return (
      <div className="tr-card tr-pop" role="dialog" aria-label={field.name}>
        <div className="tr-pop-head">
          <div className="tr-pop-tile" style={{ border: '1.5px solid rgba(249,247,242,0.22)', color: 'rgba(249,247,242,0.5)' }}>
            <Ico id={field.icon} size={22} />
          </div>
          <div className="tr-pop-title">
            <div>
              <span className="tr-pop-name">{field.name}</span>
              <span className="tr-tag" style={{ color: '#A9B5A5' }}>準備中</span>
            </div>
            <div className="tr-pop-meta">まだ問題がありません。演習で扱うと追加されます。</div>
          </div>
          {close}
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="tr-card tr-pop" role="dialog" aria-label={field.name}>
        <div className="tr-pop-head">
          <div
            className="tr-pop-tile"
            style={{ background: '#2A3628', border: `1.5px solid ${col}`, color: col, boxShadow: '4px 4px 0 0 #1F2A1E' }}
          >
            <Ico id={field.icon} size={22} />
          </div>
          <div className="tr-pop-title">
            <div>
              <span className="tr-pop-name">{field.name}</span>
              <span className="tr-tag" style={{ color: '#A9B5A5' }}>
                <Ico id="i-lock" size={10} />
                未解放
              </span>
            </div>
            <div className="tr-pop-meta">
              {field.total} 問 · 前提の分野でスコア {progress.unlockPct}% に達すると解放されます
            </div>
          </div>
          {close}
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#A9B5A5' }}>
          解放条件 · 前提分野のスコアが {progress.unlockPct}% 以上
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {p?.prereqs.map((pr) => {
            const f = nameOf(pr.field);
            const g = (f?.group ?? 'theory') as FieldGroup;
            return (
              <div key={pr.field} className="tr-row" style={{ borderRadius: 12 }}>
                <div
                  className="tr-row-tile"
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    background: pr.done ? groupColor(g) : 'rgba(249,247,242,0.1)',
                    color: pr.done ? '#1F2A1E' : '#F9F7F2',
                  }}
                >
                  <Ico id={f?.icon ?? 'i-lock'} size={13} />
                </div>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{f?.name ?? pr.field}</span>
                <span className="tr-num" style={{ fontSize: 12, fontWeight: 700, color: pr.done ? '#9CC297' : '#F7C59F' }}>
                  {pr.done ? '達成' : `${Math.round(pr.pct)}% / ${progress.unlockPct}%`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="tr-card tr-pop" role="dialog" aria-label={field.name}>
      <div className="tr-pop-head">
        <div className="tr-pop-tile" style={{ background: col, color: '#1F2A1E', boxShadow: `4px 4px 0 0 ${side}` }}>
          <Ico id={field.icon} size={22} />
        </div>
        <div className="tr-pop-title">
          <div>
            <span className="tr-pop-name">{field.name}</span>
            <span className="tr-tag" style={{ color: col }}>{GROUP_NAME[field.group as FieldGroup] ?? ''}</span>
          </div>
          <div className="tr-pop-meta">
            マスター度 <b className="tr-num">{Math.round(p.mastery * 100)}%</b> · スコア{' '}
            <b className="tr-num">{fmtScore(p.score)}</b> / <span className="tr-num">{fmtScore(p.max)}</span>
          </div>
        </div>
        {close}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {QTYPES.map((t) => {
          const s = p.types[t];
          const count = s?.total ?? 0;
          const m = s ? Math.round(s.mastery * 100) : 0;
          const w = s ? distPct(s.dist, count) : { mastered: 0, solved: 0, review: 0 };
          return (
            <div key={t} className="tr-row">
              <div
                className="tr-row-tile"
                style={{ background: m > 0 ? col : 'rgba(249,247,242,0.1)', color: m > 0 ? '#1F2A1E' : '#F9F7F2' }}
              >
                <Ico id={QTYPE_ICON[t]} size={15} />
              </div>
              <div className="tr-row-body">
                <div className="tr-row-label">
                  <b>{QTYPE_LABEL[t]}</b>
                  <span>
                    {count} 問 · <span className="tr-num">{m}%</span>
                  </span>
                </div>
                <div className="tr-distbar">
                  <i style={{ width: `${w.mastered}%`, background: col }} />
                  <i style={{ width: `${w.solved}%`, background: col, opacity: 0.5 }} />
                  <i style={{ width: `${w.review}%`, background: '#F7C59F' }} />
                </div>
              </div>
              <button type="button" className="tr-go" disabled={!count || starting} onClick={() => onStart(t)}>
                {count ? '挑戦' : 'なし'}
              </button>
            </div>
          );
        })}
      </div>
      <div className="tr-note">次の出題は 出題回数の少ない問題から（未着手 → 要復習 → 正解済み）</div>
    </div>
  );
}
