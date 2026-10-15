/**
 * iPad 横の右パネル・ノード未選択時（モック TreeIPad.dc.html の「subject summary」）。
 * 科目のマスター度・スコア・順位、新着の問題、次に解放されそうな分野。行をタップするとその分野を選ぶ。
 */
import type { FieldGroup, QType, TreeManifest, TreeProgress } from '../../lib/treeApi';
import { QTYPES, QTYPE_LABEL, gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { REVIEW_COLOR, T, alpha, fmtScore, groupColor, groupSide } from './treeTheme';

interface Props {
  manifest: TreeManifest;
  progress: TreeProgress;
  grade: string;
  nickname: string;
  onSelect: (field: string) => void;
  onRanking: () => void;
}

export function TreeSummaryPanel({ manifest, progress, grade, nickname, onSelect, onRanking }: Props) {
  const t = progress.total;
  const rank = progress.rank?.total;
  const byId = new Map(manifest.fields.map((f) => [f.id, f]));

  const fresh: { field: string; qtype: QType; n: number }[] = [];
  for (const f of manifest.fields) {
    const p = progress.fields[f.id];
    if (!p?.unlocked) continue;
    for (const q of QTYPES) {
      const n = p.types[q]?.newCount ?? 0;
      if (n > 0) fresh.push({ field: f.id, qtype: q, n });
    }
  }
  fresh.sort((a, b) => b.n - a.n);

  // あと一歩: 未解放（問題あり）で、足りない前提がすべて解放済みの分野。残りが少ない順
  const next = manifest.fields
    .filter((f) => f.total > 0 && !progress.fields[f.id]?.unlocked)
    .map((f) => {
      const unmet = (progress.fields[f.id]?.prereqs ?? []).filter((p) => !p.done);
      const reachable = unmet.every((p) => progress.fields[p.field]?.unlocked);
      // 残り: 挑戦回数の不足（1 回 = 10 点扱い）+ 正答率の不足
      const need = progress.unlockPlays ?? 5;
      const gap = unmet.reduce((s, p) => s + Math.max(0, need - (p.plays ?? 0)) * 10 + Math.max(0, progress.unlockPct - (p.rate ?? 0)), 0);
      return { f, unmet, reachable, gap };
    })
    .filter((x) => x.reachable && x.unmet.length > 0)
    .sort((a, b) => a.gap - b.gap)
    .slice(0, 3);

  return (
    <div className="tr-dock-sec">
      <div className="tr-pop-head">
        <div className="tr-pop-tile" style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: T.accent,
            color: T.onColor,
            boxShadow: `5px 5px 0 0 ${groupSide('basic')}, 0 0 16px ${alpha(T.accent, 0.4)}`,
          }}>
          <Ico id="i-anchor" size={26} />
        </div>
        <div className="tr-pop-title">
          <div>
            <span className="tr-pop-name" style={{ fontSize: 20 }}>{manifest.name}</span>
          </div>
          <div className="tr-pop-meta">
            {[gradeLabel(grade), nickname].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>

      <div className="tr-sumstats">
        <div>
          <span>マスター度</span>
          <b className="tr-num">{Math.round(t.mastery * 100)}%</b>
        </div>
        <div>
          <span>スコア</span>
          <b className="tr-num">{fmtScore(t.score)}</b>
        </div>
        <button type="button" onClick={onRanking} aria-label="ランキングを見る">
          <span>順位</span>
          <b className="tr-num">
            {rank?.rank ?? '—'}
            {rank?.rank != null && <small> / {rank.of}</small>}
          </b>
        </button>
      </div>

      {fresh.length > 0 && (
        <>
          <div className="tr-sumhead">新着の問題</div>
          <div className="tr-sumlist">
            {fresh.slice(0, 6).map((x) => {
              const f = byId.get(x.field)!;
              return (
                <button key={x.field + x.qtype} type="button" onClick={() => onSelect(x.field)}>
                  <i style={{ background: groupColor(f.group as FieldGroup) }}>
                    <Ico id={f.icon} size={14} />
                  </i>
                  <span>
                    {f.name} · {QTYPE_LABEL[x.qtype]}
                  </span>
                  <em className="tr-new">+{x.n}</em>
                </button>
              );
            })}
          </div>
        </>
      )}

      {next.length > 0 && (
        <>
          <div className="tr-sumhead">次に解放されそうな分野</div>
          <div className="tr-sumlist">
            {next.map(({ f, unmet }) => {
              const col = groupColor(f.group as FieldGroup);
              const worst = [...unmet].sort((a, b) => (a.plays ?? 0) - (b.plays ?? 0) || (a.rate ?? 0) - (b.rate ?? 0))[0]!;
              return (
                <button key={f.id} type="button" onClick={() => onSelect(f.id)}>
                  <i style={{ background: T.faceLocked, border: `1.5px solid ${col}`, color: col, boxShadow: `0 0 8px ${alpha(col, 0.4)}` }}>
                    <Ico id={f.icon} size={14} />
                  </i>
                  <span>{f.name}</span>
                  <em className="tr-num" style={{ color: REVIEW_COLOR, fontStyle: 'normal', fontSize: 12, fontWeight: 700 }}>
                    {byId.get(worst.field)?.name ?? worst.field} {worst.plays ?? 0}/{progress.unlockPlays ?? 5} 回 · {Math.round(worst.rate ?? 0)}%
                  </em>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="tr-note">ノードをタップすると、ここに分野の詳細が出ます。</div>
    </div>
  );
}
