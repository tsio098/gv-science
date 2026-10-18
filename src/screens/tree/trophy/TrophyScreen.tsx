/**
 * トロフィー一覧（実装手順_トロフィー §6.6・ボード「トロフィー一覧」）。
 * 上: トロフィーレベル（全科目の pt）・グレード別の獲得数（P / G / S / B）・プラチナの進み具合。
 * タブ: すべて / 獲得 / 未獲得。並び: 既定の順 / 新しい順。行 = アイコン・名前・条件・獲得日 or 進み具合・取得率。
 * ファーストは 3 状態（まだ誰も / 獲得者 · 受付終了 / あなたが獲得）。隠しは獲得まで「隠しトロフィー ???」。
 * 科目は今の科目（開ける科目が 2 つ以上なら上のセグメントで切り替え）。
 */
import { useEffect, useMemo, useState } from 'react';
import type { TrophyItem, TrophyList } from '../../../lib/treeApi';
import { TreeApiError, gradeLabel } from '../../../lib/treeApi';
import { TREE_SUBJECT_NAME, type TreeSubject } from '../../../lib/treeSubject';
import { Ico } from '../TreeIcons';
import { rootClass } from '../treeTheme';
import { CHROME, GRADE_COLOR, PRISM, TrophyIcon, TrophySprite } from './TrophyIcon';
import { TrophyDetailSheet, type FieldInfo } from './TrophyDetailSheet';
import { loadTrophies, mdJst, rarityPct } from './trophyData';
import '../../../styles/tree-trophy.css';

interface Props {
  subject: TreeSubject;
  subjects: TreeSubject[];
  fieldInfo: (subject: string, id: string) => FieldInfo | null;
  onBack: () => void;
  onShowTree: (subject: TreeSubject, field: string | null) => void;
}

type Tab = 'all' | 'got' | 'not';
const SEEN_KEY = 'gvTree.trophyListAt';

function readSeen(): number {
  try {
    return Number(localStorage.getItem(SEEN_KEY)) || 0;
  } catch {
    return 0;
  }
}

export function TrophyScreen({ subject: initial, subjects, fieldInfo, onBack, onShowTree }: Props) {
  const [subject, setSubject] = useState<TreeSubject>(initial);
  const [data, setData] = useState<TrophyList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [recent, setRecent] = useState(false);
  const [detail, setDetail] = useState<TrophyItem | null>(null);
  // 前に一覧を開いた時刻より後の獲得に NEW を付ける
  const [seenBefore] = useState(readSeen);
  useEffect(() => {
    try {
      localStorage.setItem(SEEN_KEY, String(Date.now()));
    } catch {
      /* noop */
    }
  }, []);

  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    loadTrophies(subject, true)
      .then((d) => live && setData(d))
      .catch((e) => live && setError(e instanceof TreeApiError ? e.code : 'NETWORK'));
    return () => {
      live = false;
    };
  }, [subject]);

  const rows = useMemo(() => {
    if (!data) return [];
    let list = data.items.filter((it) => it.grade !== 'P');
    if (tab === 'got') list = list.filter((it) => it.earnedAt != null);
    if (tab === 'not') list = list.filter((it) => it.earnedAt == null);
    return [...list].sort((a, b) => (recent ? (b.earnedAt ?? 0) - (a.earnedAt ?? 0) : 0) || a.order - b.order);
  }, [data, tab, recent]);

  const lv = data?.level;
  const plat = data?.platinum;
  const platItem = data?.items.find((it) => it.grade === 'P') ?? null;

  return (
    <div className={rootClass('tt-list')}>
      <TrophySprite />
      <div aria-hidden="true" style={{ position: 'absolute', left: -40, right: -40, top: -40, height: 220, background: 'radial-gradient(ellipse 60% 70% at 50% 0%,rgba(120,255,235,0.2),rgba(120,255,235,0) 70%)', pointerEvents: 'none' }} />
      <div className="tt-list-head" style={{ position: 'relative' }}>
        <button type="button" className="tr-iconbtn" aria-label="ツリーへ戻る" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <h1 className="tt-list-title">
          <span className="tt-arc tt-chrome" style={{ fontSize: 13, lineHeight: 1, alignSelf: 'flex-start', backgroundImage: CHROME.aqua }}>TROPHY</span>
          <span className="tt-dot" style={{ fontSize: 11, color: 'var(--tr-sub)' }}>トロフィー</span>
        </h1>
        {subjects.length > 1 && (
          <div className={`tt-seg tt-px2${subjects.length > 2 ? ' is-many' : ''}`} role="radiogroup" aria-label="科目">
            {subjects.map((s) => (
              <button key={s} type="button" role="radio" aria-checked={s === subject} className={`tt-btn tt-px2${s === subject ? ' is-on' : ''}`} onClick={() => setSubject(s)}>
                {TREE_SUBJECT_NAME[s]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="tt-list-body">
        <div>
          {error ? (
            <div className="tt-empty">{error === 'HTTP 404' || error === 'NOT_FOUND' ? 'トロフィーはまだ準備中です。' : '読み込めませんでした。通信状況を確かめてもう一度お試しください。'}</div>
          ) : !data ? (
            <div className="tr-center" style={{ position: 'relative', padding: 40 }}>
              <div className="tr-spinner" />
            </div>
          ) : (
            <>
              {lv && (
                <div className="tt-levelcard">
                  <div className="tt-px" style={{ padding: 3, background: '#2DF4C6' }}>
                    <div className="tt-px" style={{ position: 'relative', padding: '12px 14px 14px', background: 'linear-gradient(180deg,#0C4250,#062530)', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className="tt-arc" style={{ fontSize: 7, color: '#8ED4E0' }}>TROPHY LV.</span>
                          <span className="tt-arc tt-chrome" style={{ fontSize: 26, lineHeight: 1, backgroundImage: CHROME.aqua, filter: 'drop-shadow(3px 3px 0 #021014)' }}>{lv.lv}</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 2 }}>
                          <div className="tt-dot" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8ED4E0' }}>
                            <span>NEXT LV.{lv.lv + 1}</span>
                            <span>あと {Math.max(0, lv.need - lv.into)} pt</span>
                          </div>
                          <div className="tt-meter">
                            <span style={{ width: `${lv.need ? Math.min(100, (lv.into / lv.need) * 100) : 0}%` }} />
                          </div>
                        </div>
                      </div>
                      <div className="tt-tiles">
                        {(['P', 'G', 'S', 'B'] as const).map((k) => (
                          <div key={k} className="tt-tile tt-px2">
                            <TrophyIcon grade={k} size={20} stroke={0.8} scan={false} />
                            <span className="tt-arc" style={{ fontSize: 11, color: '#FFFFFF' }}>{data.counts[k]}</span>
                            <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{GRADE_COLOR[k].en}</span>
                          </div>
                        ))}
                      </div>
                      <div className="tt-scan" />
                    </div>
                  </div>
                </div>
              )}

              {plat && (
                <button type="button" className="tt-rowbtn" style={{ padding: 0, background: 'none', filter: 'drop-shadow(4px 4px 0 #1C1236)' }} onClick={() => platItem && setDetail(platItem)} aria-label={`プラチナ ${plat.name} ${plat.now} / ${plat.max}`}>
                  <div className="tt-px" style={{ padding: 3, background: PRISM }}>
                    <div className="tt-px" style={{ position: 'relative', padding: '10px 14px 12px 10px', background: 'linear-gradient(180deg,#1A1440,#0A0820)', display: 'flex', alignItems: 'center', gap: 12, overflow: 'hidden' }}>
                      <div className="tt-px2" style={{ width: 46, height: 46, flex: 'none', background: 'rgba(2,6,20,.9)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <TrophyIcon grade="P" size={32} style={plat.earned ? { filter: 'drop-shadow(0 0 6px rgba(208,139,255,.8))' } : { opacity: 0.45, filter: 'saturate(.5)' }} />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
                        <span className="tt-arc tt-chrome" style={{ fontSize: 8, lineHeight: 1.2, alignSelf: 'flex-start', backgroundImage: PRISM }}>PLATINUM</span>
                        <span className="tt-dot" style={{ fontSize: 15, color: '#FFFFFF', textShadow: '2px 2px 0 #021014', whiteSpace: 'nowrap', overflow: 'hidden' }}>{plat.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'rgba(234,251,255,.1)' }}>
                            <div style={{ width: `${plat.max ? Math.min(100, (plat.now / plat.max) * 100) : 0}%`, height: '100%', background: 'repeating-linear-gradient(90deg,#2DF4C6 0 6px,rgba(0,0,0,0) 6px 8px,#D08BFF 8px 14px,rgba(0,0,0,0) 14px 16px)' }} />
                          </div>
                          <span className="tt-arc" style={{ fontSize: 8, color: '#FFFFFF' }}>{plat.now}/{plat.max}</span>
                        </div>
                      </div>
                      <div className="tt-scan" />
                    </div>
                  </div>
                </button>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                <div style={{ display: 'flex', gap: 6 }} role="tablist">
                  {([
                    ['all', 'すべて', data.counts.all],
                    ['got', '獲得', data.counts.earned],
                    ['not', '未獲得', data.counts.all - data.counts.earned],
                  ] as const).map(([k, label, n]) => (
                    <button key={k} type="button" role="tab" aria-selected={tab === k} className={`tt-btn is-tab tt-px2${tab === k ? ' is-on' : ''}`} onClick={() => setTab(k)}>
                      {label} {n}
                    </button>
                  ))}
                </div>
                <button type="button" className="tt-dot" style={{ height: 32, padding: '0 4px', background: 'transparent', border: 0, color: '#8ED4E0', fontSize: 12, whiteSpace: 'nowrap' }} onClick={() => setRecent((v) => !v)}>
                  {recent ? '新しい順' : '既定の順'} ▼
                </button>
              </div>

              <div className="tt-rows">
                {rows.map((it) => (
                  <Row key={it.id} it={it} isNew={it.earnedAt != null && it.earnedAt > seenBefore && seenBefore > 0} onOpen={() => setDetail(it)} />
                ))}
                {!rows.length && <div className="tt-empty">{tab === 'got' ? 'まだ獲得したトロフィーはありません。' : 'すべて獲得しました。'}</div>}
              </div>
            </>
          )}
        </div>
      </div>
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 60, background: 'linear-gradient(180deg,rgba(4,48,57,0),#043039 80%)', pointerEvents: 'none' }} />

      {detail && (
        <TrophyDetailSheet
          item={detail}
          fieldInfo={(id) => fieldInfo(subject, id)}
          onClose={() => setDetail(null)}
          onShowTree={(field) => onShowTree(subject, field)}
        />
      )}
    </div>
  );
}

function Row({ it, isNew, onOpen }: { it: TrophyItem; isNew: boolean; onOpen: () => void }) {
  const g = GRADE_COLOR[it.grade];
  const got = it.earnedAt != null;
  const holder = it.firstHolder;
  const firstMine = it.first && got;
  const frame = firstMine
    ? 'linear-gradient(90deg,#FFD84A 0 10px,#FF5A6E 10px calc(100% - 10px),#FFD84A calc(100% - 10px))'
    : got
      ? g.c
      : `rgba(${g.rgb},${it.first && !holder ? 0.45 : 0.28})`;
  const bg = firstMine ? 'linear-gradient(180deg,#3A0A18,#14040A)' : got ? 'linear-gradient(180deg,#0C4250,#062530)' : 'rgba(4,40,48,.92)';
  const well = got ? `radial-gradient(circle,rgba(${g.rgb},.3),rgba(3,18,24,1) 72%)` : it.first ? 'rgba(20,4,10,.9)' : 'rgba(2,16,22,.8)';

  // 右の列: グレード・取得率（ファーストは獲得者）・獲得日 / 受付終了 / 未獲得
  let rate: string;
  let meta: string;
  let metaArc = false;
  let metaColor = '#8ED4E0';
  if (it.first) {
    if (got) {
      rate = 'あなたが獲得';
      meta = mdJst(it.earnedAt!);
      metaArc = true;
      metaColor = '#FFFFFF';
    } else if (holder && !it.repeat) {
      rate = `獲得者 ${gradeLabel(holder.grade)} ${holder.nickname}`;
      meta = '受付終了';
      metaColor = g.c;
    } else if (holder) {
      rate = `最新 ${gradeLabel(holder.grade)} ${holder.nickname}`;
      meta = '次の試験で';
      metaColor = g.c;
    } else {
      rate = 'まだ誰も獲得していません';
      meta = '最初の 1 人になれる';
      metaColor = '#FFB0BC';
    }
  } else {
    rate = `取得率 ${rarityPct(it.rarity)}`;
    if (got) {
      meta = mdJst(it.earnedAt!);
      metaArc = true;
      metaColor = '#FFFFFF';
    } else if (it.hidden) {
      meta = 'ウルトラレア';
      metaColor = g.c;
    } else {
      meta = '未獲得';
    }
  }

  return (
    <button type="button" className="tt-rowbtn tt-px2" style={{ background: frame }} onClick={onOpen} aria-label={`${it.hidden ? '隠しトロフィー' : it.name} ${g.en} ${got ? '獲得済み' : '未獲得'}`}>
      <div className="tt-rowin tt-px2" style={{ background: bg }}>
        <div className="tt-rowwell tt-px2" style={{ background: well }}>
          {it.hidden ? (
            <span className="tt-arc" style={{ fontSize: 16, color: 'rgba(255,216,74,.55)' }}>?</span>
          ) : (
            <TrophyIcon grade={it.grade} size={30} style={{ opacity: got ? 1 : it.first ? 0.55 : 0.4, filter: got ? `drop-shadow(0 0 4px rgba(${g.rgb},.6))` : 'saturate(.3)' }} />
          )}
        </div>
        {it.first && !it.hidden && <span className="tt-mini1 tt-arc" aria-hidden="true" style={{ left: 40, right: 'auto', top: 2 }}>1ST</span>}
        <div className="tt-rowtext">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span className="tt-dot tt-rowname" style={{ color: got ? '#FFFFFF' : 'rgba(234,251,255,.65)' }}>{it.hidden ? '隠しトロフィー' : it.name}</span>
            {isNew && <span className="tt-arc tt-px2" style={{ flex: 'none', padding: '3px 5px', background: '#FF7A45', color: '#140A05', fontSize: 6 }}>NEW</span>}
          </div>
          <div className="tt-dot tt-rowdesc">{it.hidden ? '獲得すると内容が見えます' : it.desc}</div>
          {it.progress && !got && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ flex: 1, height: 5, background: 'rgba(234,251,255,.1)' }}>
                <div style={{ width: `${Math.min(100, (it.progress.now / Math.max(1, it.progress.max)) * 100)}%`, height: '100%', background: `repeating-linear-gradient(90deg,${g.c} 0 5px,rgba(0,0,0,0) 5px 7px)` }} />
              </div>
              <span className="tt-arc" style={{ fontSize: 7 }}>{it.progress.now}/{it.progress.max}</span>
            </div>
          )}
        </div>
        <div className="tt-rowmeta">
          <span className="tt-arc" style={{ fontSize: 6, color: g.c }}>{g.en}</span>
          <span className="tt-dot" style={{ fontSize: 11, color: '#EAFBFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>{rate}</span>
          <span className={metaArc ? 'tt-arc' : 'tt-dot'} style={{ fontSize: metaArc ? 7 : 10, color: metaColor }}>{meta}</span>
        </div>
        <div className="tt-scan" style={{ opacity: 0.6 }} />
      </div>
    </button>
  );
}
