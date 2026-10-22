/**
 * トロフィーの詳細シート（ボード「トロフィーの詳細」）。
 * 大きいトロフィー・グレード + pt・名前・出典と原文・条件・関係する分野のチップ・獲得した日・塾内の取得率・閉じる / ツリーで見る。
 */
import { useEffect, useState } from 'react';
import type { TrophyItem } from '../../../lib/treeApi';
import { gradeLabel } from '../../../lib/treeApi';
import { MASTER_AT, groupColor, groupSide } from '../treeTheme';
import { CHROME, GRADE_COLOR, PRISM, TrophyIcon } from './TrophyIcon';
import { SECRET_NOTE, hmJst, rarityPct, secretKind, ymdJst } from './trophyData';

export interface FieldInfo {
  name: string;
  group: string;
  /** マスター済み（★）*/
  master?: boolean;
}

interface Props {
  item: TrophyItem;
  /** 分野 ID → 名前・系統（今の科目の manifest・進捗から。分からなければチップを出さない）*/
  fieldInfo: (id: string) => FieldInfo | null;
  onClose: () => void;
  /** ツリーで見る（関係する分野があれば最初の分野を選ぶ）*/
  onShowTree: (field: string | null) => void;
  /** 先生用アカウント（2026-10-20）: 獲得者の表示名（本名。取れなければニックネーム）。あれば獲得者の一覧を出す */
  holderName?: (h: { key: string; nickname: string }) => string;
}

const SPARK = 'M2 0h1v2h2v1H3v2H2V3H0V2h2z';

export function TrophyDetailSheet({ item, fieldInfo, onClose, onShowTree, holderName }: Props) {
  const g = GRADE_COLOR[item.grade];
  const chrome = item.grade === 'P' ? PRISM : item.grade === 'F' ? CHROME.F : CHROME[item.grade];
  const got = item.earnedAt != null;
  const fields = item.fields.map((id) => ({ id, f: fieldInfo(id) })).filter((x): x is { id: string; f: FieldInfo } => !!x.f);
  const [shown, setShown] = useState(false);
  useEffect(() => setShown(true), []);
  const frame = item.grade === 'P' ? PRISM : item.grade === 'F' ? 'linear-gradient(90deg,#FFD84A 0 14px,#FF5A6E 14px calc(100% - 14px),#FFD84A calc(100% - 14px))' : g.c;
  const holder = item.firstHolder;
  // 先生用: 生徒からは隠れているか（2026-10-22）
  const sk = holderName ? secretKind(item) : null;

  return (
    <>
      <div className="tt-sheet-bg" onClick={onClose} aria-hidden="true" />
      <div className="tt-sheet" role="dialog" aria-modal="true" aria-label="トロフィーの詳細" style={{ filter: `drop-shadow(0 -4px 14px rgba(${g.rgb},.3))` }}>
        <div className="tt-pxtop" style={{ padding: '3px 3px 0', background: frame }}>
          <div className="tt-pxtop tt-sheet-in">
            <div style={{ display: 'flex', gap: 4 }} aria-hidden="true">
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 8, height: 4, background: 'rgba(234,251,255,.3)' }} />
              ))}
            </div>

            <div style={{ position: 'relative', width: 220, height: 130, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {got && (
                <div
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: `repeating-conic-gradient(from 0deg at 50% 50%,rgba(${g.rgb},.16) 0deg 10deg,rgba(${g.rgb},0) 10deg 20deg)`,
                    WebkitMaskImage: 'radial-gradient(circle,#000 30%,transparent 68%)',
                    maskImage: 'radial-gradient(circle,#000 30%,transparent 68%)',
                  }}
                />
              )}
              {item.hidden ? (
                <span className="tt-arc" style={{ fontSize: 44, color: 'rgba(255,216,74,.55)' }}>?</span>
              ) : (
                <TrophyIcon
                  grade={item.grade}
                  size={104}
                  stroke={0.55}
                  // 残念トロフィー: 倒れた姿（-14°）と足もとのかけら（2026-10-19）
                  chip={item.grade === 'Z'}
                  style={{
                    position: 'relative',
                    filter: got ? `drop-shadow(0 0 10px rgba(${g.rgb},.65))` : 'saturate(.3)',
                    opacity: got ? 1 : 0.45,
                    transform: item.grade === 'Z' ? 'rotate(-14deg)' : undefined,
                  }}
                />
              )}
              {item.first && !item.hidden && (
                <span className="tt-arc" style={{ position: 'absolute', right: 46, top: 10, padding: '5px 6px', background: '#FFD84A', color: '#5A0A1C', fontSize: 10, transform: 'rotate(-10deg)', boxShadow: '3px 3px 0 #7A0C24' }}>
                  1ST
                </span>
              )}
              {got && (
                <>
                  <svg viewBox="0 0 5 5" width="14" height="14" style={{ position: 'absolute', left: 34, top: 16 }} aria-hidden="true"><path d={SPARK} fill="#FFFFFF" /></svg>
                  <svg viewBox="0 0 5 5" width="10" height="10" style={{ position: 'absolute', right: 40, top: 30 }} aria-hidden="true"><path d={SPARK} fill={g.c} /></svg>
                  <svg viewBox="0 0 5 5" width="10" height="10" style={{ position: 'absolute', right: 30, bottom: 18 }} aria-hidden="true"><path d={SPARK} fill="#FFFFFF" /></svg>
                </>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', maxWidth: '100%' }}>
              <div className="tt-arc tt-chrome" style={{ fontSize: 10, backgroundImage: chrome }}>
                {g.en} +{g.pt}PT
              </div>
              {sk && (
                <div className="tt-dot tt-px2" style={{ padding: '3px 8px', background: 'rgba(208,139,255,.22)', border: '1px solid #D08BFF', color: '#E9CCFF', fontSize: 11 }}>
                  隠しトロフィー（先生用）· {SECRET_NOTE[sk]}
                </div>
              )}
              <h2 className="tt-dot" style={{ margin: 0, fontSize: [...item.name].length > 13 ? 18 : 21, fontWeight: 400, color: '#FFFFFF', textShadow: '3px 3px 0 #021014' }}>
                {item.hidden ? '隠しトロフィー' : item.name}
              </h2>
              {!item.hidden && item.source && (
                <p className="tt-dot" style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: '#C9D3E6' }}>
                  — {item.source}
                  {item.original && item.original !== '—' && (
                    <>
                      <br />
                      <span style={{ fontFamily: 'var(--f-jp)', fontStyle: 'italic', color: '#8ED4E0' }}>{item.original}</span>
                    </>
                  )}
                </p>
              )}
              <p className="tt-dot" style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: '#8ED4E0' }}>
                {item.hidden ? '獲得すると内容が見えます' : item.desc}
                {item.first && (item.repeat ? '（試験が入るたびに塾内で最初の 1 人）' : '（塾内で最初の 1 人だけ）')}
              </p>
            </div>

            {fields.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6 }}>
                {fields.map(({ id, f }) => (
                  <span key={id} className="tt-dot tt-px2 tt-chip" style={{ background: groupSide(f.group) }}>
                    {f.master && <span style={{ color: '#FFFFFF', textShadow: `0 0 6px ${groupColor(f.group)}` }}>★</span>}
                    {f.name}
                  </span>
                ))}
              </div>
            )}

            <div style={{ alignSelf: 'stretch', display: 'grid', gridTemplateColumns: 'repeat(2,minmax(0,1fr))', gap: 8 }}>
              <div className="tt-px2 tt-stat">
                <span className="tt-dot" style={{ fontSize: 11, color: '#8ED4E0' }}>{got ? '獲得した日' : item.first && holder ? (item.repeat ? '最新の獲得者' : '獲得者') : item.progress ? '進み具合' : '獲得した日'}</span>
                {got ? (
                  <span className="tt-arc" style={{ fontSize: 10, lineHeight: 1.5 }}>
                    {ymdJst(item.earnedAt!)}
                    <br />
                    <span style={{ fontSize: 8, color: '#8ED4E0' }}>{hmJst(item.earnedAt!)}</span>
                  </span>
                ) : item.first && holder ? (
                  <span className="tt-dot" style={{ fontSize: 13, lineHeight: 1.5 }}>
                    {gradeLabel(holder.grade)} {holder.nickname}
                    <br />
                    <span style={{ fontSize: 11, color: '#8ED4E0' }}>
                      {ymdJst(holder.at, '/')}
                      {!item.repeat && ' · 受付終了'}
                    </span>
                  </span>
                ) : item.progress ? (
                  <span className="tt-arc" style={{ fontSize: 10, lineHeight: 1.5 }}>
                    {item.progress.now} / {item.progress.max}
                    <br />
                    <span className="tt-dot" style={{ fontSize: 11, color: '#8ED4E0' }}>未獲得</span>
                  </span>
                ) : (
                  <span className="tt-dot" style={{ fontSize: 13, color: '#8ED4E0' }}>未獲得</span>
                )}
              </div>
              <div className="tt-px2 tt-stat">
                <span className="tt-dot" style={{ fontSize: 11, color: '#8ED4E0' }}>塾内の取得率</span>
                <span className="tt-arc" style={{ fontSize: 10, lineHeight: 1.5 }}>
                  {rarityPct(item.rarity)}
                  <br />
                  <span className="tt-dot" style={{ fontSize: 12, color: '#8ED4E0' }}>
                    {item.rarity.n} / {item.rarity.of} 人
                  </span>
                </span>
              </div>
            </div>

            {holderName && item.holders && (
              <div className="tt-px2 tt-stat" style={{ alignSelf: 'stretch', alignItems: 'stretch', textAlign: 'left' }}>
                <span className="tt-dot" style={{ fontSize: 11, color: '#8ED4E0' }}>獲得した生徒 {item.holders.length} 人（早い順・先生用）</span>
                {item.holders.length === 0 ? (
                  <span className="tt-dot" style={{ fontSize: 13, color: '#8ED4E0' }}>まだ誰も獲得していません</span>
                ) : (
                  <div style={{ maxHeight: 180, overflowY: 'auto', WebkitOverflowScrolling: 'touch', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {item.holders.map((h) => (
                      <div key={h.key} className="tt-dot" style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13 }}>
                        <span style={{ flex: 'none', minWidth: 30, color: '#8ED4E0', fontSize: 11 }}>{gradeLabel(h.grade)}</span>
                        <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {holderName(h)}
                          {holderName(h) !== h.nickname && <span style={{ fontSize: 11, color: '#8ED4E0' }}> {h.nickname}</span>}
                        </span>
                        <span className="tt-arc" style={{ flex: 'none', fontSize: 8, color: '#8ED4E0' }}>{ymdJst(h.at, '/')}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div style={{ alignSelf: 'stretch', display: 'flex', gap: 10, paddingTop: 2 }}>
              <button type="button" className="tt-dot tt-px2" style={{ flex: 1, height: 50, background: 'rgba(4,48,57,.9)', border: 0, color: '#EAFBFF', fontSize: 15 }} onClick={onClose}>
                閉じる
              </button>
              <button
                type="button"
                className="tt-dot tt-px2"
                style={{ flex: 1.4, height: 50, background: '#2DF4C6', border: 0, color: '#04302B', fontSize: 15, filter: 'drop-shadow(3px 3px 0 #0E9C9A)' }}
                onClick={() => onShowTree(fields[0]?.id ?? null)}
                disabled={!shown}
              >
                ツリーで見る ▶
              </button>
            </div>
            <div className="tt-scan" style={{ opacity: 0.5 }} />
          </div>
        </div>
      </div>
    </>
  );
}

/** マスター済みかを含む分野の情報（manifest + 進捗から）*/
export function fieldInfoFrom(
  manifest: { subject: string; fields: { id: string; name: string; group: string }[] } | null,
  progress: { fields: Record<string, { mastery: number }> } | null,
) {
  return (id: string): FieldInfo | null => {
    const f = manifest?.fields.find((x) => x.id === id);
    if (!f) return null;
    return { name: f.name, group: f.group, master: (progress?.fields[id]?.mastery ?? 0) >= MASTER_AT };
  };
}
