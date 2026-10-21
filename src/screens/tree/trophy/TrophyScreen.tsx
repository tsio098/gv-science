/**
 * トロフィー一覧（実装手順_トロフィー §6.6・ボード「トロフィー一覧」）。
 * 上: トロフィーレベル（全科目の pt）・グレード別の獲得数（P / G / S / B）・プラチナの進み具合。
 * タブ: すべて / 獲得 / 未獲得。並び: 既定の順 / 新しい順。行 = アイコン・名前・条件・獲得日 or 進み具合・取得率。
 * ファーストは 3 状態（まだ誰も / 獲得者 · 受付終了 / あなたが獲得）。隠しは獲得まで「隠しトロフィー ???」。
 * 科目は今の科目（開ける科目が 2 つ以上なら上のセグメントで切り替え）。
 * 残念トロフィー（2026-10-19）: 獲得したものだけ、いちばん下の別枠「OOPS 残念トロフィー n」に（タブの数に入れない・0 個なら枠ごと出さない）。
 * Lv30（LV.30 チケット）: レベルのカードを MAX の見た目にし、「LV.30 チケットを見る ▶」
 */
import { useEffect, useMemo, useState } from 'react';
import type { TrophyItem, TrophyList } from '../../../lib/treeApi';
import { TreeApiError, fetchStaffNames, gradeLabel } from '../../../lib/treeApi';
import { TREE_SUBJECT_NAME, type TreeSubject } from '../../../lib/treeSubject';
import { Ico } from '../TreeIcons';
import { rootClass } from '../treeTheme';
import { CHROME, GRADE_COLOR, LV30_BAND, PRISM, TrophyIcon } from './TrophyIcon';
import { TrophyDetailSheet, type FieldInfo } from './TrophyDetailSheet';
import { loadTrophies, mdJst, rarityPct } from './trophyData';
import '../../../styles/tree-trophy.css';

interface Props {
  subject: TreeSubject;
  subjects: TreeSubject[];
  fieldInfo: (subject: string, id: string) => FieldInfo | null;
  onBack: () => void;
  onShowTree: (subject: TreeSubject, field: string | null) => void;
  /** LV.30 チケットを見る（チケット画面）*/
  onTickets?: () => void;
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

export function TrophyScreen({ subject: initial, subjects, fieldInfo, onBack, onShowTree, onTickets }: Props) {
  const [subject, setSubject] = useState<TreeSubject>(initial);
  const [data, setData] = useState<TrophyList | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('all');
  const [recent, setRecent] = useState(false);
  const [detail, setDetail] = useState<TrophyItem | null>(null);
  /** 先生用アカウント（2026-10-20）: 獲得者の本名 { key: 氏名 }。GAS から直接（Proxy を通さない）。null = 未取得・失敗 */
  const [names, setNames] = useState<Record<string, string> | null>(null);
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
      .then((d) => {
        if (!live) return;
        setData(d);
        if (d.names) fetchStaffNames(d.names).then((n) => live && setNames(n)).catch(() => {});
      })
      .catch((e) => live && setError(e instanceof TreeApiError ? e.code : 'NETWORK'));
    return () => {
      live = false;
    };
  }, [subject]);
  const staff = !!data && data.items.some((it) => it.holders !== undefined);
  /** 獲得者の表示名: 本名（取れなければニックネーム）*/
  const holderName = (h: { key: string; nickname: string }) => names?.[h.key] ?? h.nickname;

  const rows = useMemo(() => {
    if (!data) return [];
    // その科目のプラチナ（全獲得）は上のカードに出す。ほかのプラチナ（範囲のランキング制覇・出藍の誉れ）は行に出す
    let list = data.items.filter((it) => it.id !== data.platinum?.id && !it.oops && !it.event);
    if (tab === 'got') list = list.filter((it) => it.earnedAt != null);
    if (tab === 'not') list = list.filter((it) => it.earnedAt == null);
    return [...list].sort((a, b) => (recent ? (b.earnedAt ?? 0) - (a.earnedAt ?? 0) : 0) || a.order - b.order);
  }, [data, tab, recent]);

  // 残念トロフィー（獲得したものだけ返る）。並びは新しい順の切り替えに合わせる
  const oops = useMemo(
    () => [...(data?.items ?? []).filter((it) => it.oops)].sort((a, b) => (recent ? (b.earnedAt ?? 0) - (a.earnedAt ?? 0) : 0) || a.order - b.order),
    [data, recent],
  );
  // EVENT トロフィー（季節イベント・2026-10-20）: 獲得したものだけ（先生は全部）・別枠「EVENT n」（タブの数・レベルに入れない）
  const events = useMemo(
    () => [...(data?.items ?? []).filter((it) => it.event)].sort((a, b) => (recent ? (b.earnedAt ?? 0) - (a.earnedAt ?? 0) : 0) || a.order - b.order),
    [data, recent],
  );
  const lv = data?.level;
  const lvMax = !!lv && lv.lv >= (lv.max ?? 30);
  const plat = data?.platinum;
  const platItem = data?.items.find((it) => it.id === plat?.id) ?? null;

  return (
    <div className={rootClass('tt-list')}>
      {/* グラデ（TrophySprite）は TreeRoot の 1 つを使う。ここにも置くと、一覧を閉じたときに iOS（WebKit）が同じ id のグラデを全部見失い、
          以後のトロフィーが輪郭だけになる（2026-10-22 先生の報告・LINE の演出の確認で発生）*/}
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
                <div className="tt-levelcard" style={lvMax ? { filter: 'drop-shadow(4px 4px 0 #5B4A92) drop-shadow(0 0 10px rgba(79,195,255,.3))' } : undefined}>
                  <div className="tt-px" style={{ padding: 3, background: lvMax ? LV30_BAND : '#2DF4C6' }}>
                    <div className="tt-px" style={{ position: 'relative', padding: '12px 14px 14px', background: lvMax ? 'linear-gradient(180deg,#1E1A4A,#0A0820)' : 'linear-gradient(180deg,#0C4250,#062530)', display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <span className="tt-arc" style={{ fontSize: 7, color: lvMax ? '#B6E9FF' : '#8ED4E0' }}>TROPHY LV.</span>
                          <span className="tt-arc tt-chrome" style={{ fontSize: 26, lineHeight: 1, backgroundImage: lvMax ? CHROME.P30 : CHROME.aqua, filter: `drop-shadow(3px 3px 0 ${lvMax ? '#0A0620' : '#021014'})` }}>{lv.lv}</span>
                        </div>
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 2 }}>
                          {lvMax ? (
                            // Lv30（2026-10-19 ボード「トロフィーレベル 30」）: MAX・バー満タン（プラチナの面の 2 色）
                            <div className="tt-dot" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: '#B6E9FF' }}>
                              <span className="tt-arc" style={{ fontSize: 8, color: '#FFFFFF' }}>MAX</span>
                              <span>レベル 30 達成</span>
                            </div>
                          ) : (
                            <div className="tt-dot" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8ED4E0' }}>
                              {/* 科目ごとに Lv1〜30（2026-10-19 先生決定）*/}
                              <span>{`NEXT LV.${lv.lv + 1}`}</span>
                              <span>{`あと ${Math.max(0, lv.need - lv.into)} pt`}</span>
                            </div>
                          )}
                          <div className="tt-meter">
                            <span
                              style={{
                                width: `${lvMax ? 100 : lv.need ? Math.min(100, (lv.into / lv.need) * 100) : 0}%`,
                                ...(lvMax ? { background: 'repeating-linear-gradient(90deg,#4FC3FF 0 6px,rgba(0,0,0,0) 6px 8px,#B05BD6 8px 14px,rgba(0,0,0,0) 14px 16px)' } : {}),
                              }}
                            />
                          </div>
                        </div>
                      </div>
                      {lvMax && data.level30Ticket && onTickets && (
                        <button
                          type="button"
                          className="tt-px2 tt-dot"
                          style={{ position: 'relative', zIndex: 1, height: 44, border: 0, cursor: 'pointer', background: '#4FC3FF', color: '#0A0620', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, filter: 'drop-shadow(3px 3px 0 #5B4A92)' }}
                          onClick={onTickets}
                        >
                          <TrophyIcon grade="P" size={22} scan={false} />
                          {data.level30Ticket.used ? 'LV.30 チケット（使用済み）▶' : 'LV.30 チケットを見る ▶'}
                        </button>
                      )}
                      {/* プラチナは隠し要素（2026-10-19 先生決定）: 獲得するまでタイルも出さない */}
                      <div className="tt-tiles" style={{ gridTemplateColumns: `repeat(${data.counts.P > 0 ? 4 : 3}, minmax(0, 1fr))` }}>
                        {(data.counts.P > 0 ? (['P', 'G', 'S', 'B'] as const) : (['G', 'S', 'B'] as const)).map((k) => (
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
                  <Row key={it.id} it={it} isNew={it.earnedAt != null && it.earnedAt > seenBefore && seenBefore > 0} onOpen={() => setDetail(it)} holderName={staff ? holderName : undefined} />
                ))}
                {!rows.length && <div className="tt-empty">{tab === 'got' ? 'まだ獲得したトロフィーはありません。' : 'すべて獲得しました。'}</div>}
                {staff && (
                  <div className="tt-dot" style={{ fontSize: 11, lineHeight: 1.6, color: '#8ED4E0' }}>
                    先生用: 各トロフィーの下に獲得した生徒（{names ? '本名' : 'ニックネーム'}・獲得の早い順）。押すと全員の一覧が開きます。隠し・ファースト・プラチナも条件つきで出ています。
                  </div>
                )}
              </div>

              {/* EVENT トロフィー: 獲得したものだけ・別枠（季節イベントの 100%。期間を逃すと取れないのでレベル・すべて n に数えない）*/}
              {events.length > 0 && tab !== 'not' && (
                <div className="tt-rows" style={{ marginTop: 6 }}>
                  <div className="tt-px2" style={{ padding: 2, background: 'linear-gradient(90deg,#FF9A1F,#C9A2FF)' }}>
                    <div className="tt-px2" style={{ padding: '8px 12px', background: 'linear-gradient(180deg,#2E1650,#140828)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="tt-arc tt-chrome" style={{ fontSize: 8, backgroundImage: CHROME.E }}>EVENT</span>
                      <span className="tt-dot" style={{ flex: 1, fontSize: 13, color: '#FFF1E0' }}>イベントトロフィー</span>
                      <span className="tt-arc" style={{ fontSize: 9, color: '#FFFFFF' }}>{data.counts.event?.earned ?? events.filter((it) => it.earnedAt != null).length}</span>
                    </div>
                  </div>
                  {events.map((it) => (
                    <Row key={it.id} it={it} isNew={it.earnedAt != null && it.earnedAt > seenBefore && seenBefore > 0} onOpen={() => setDetail(it)} holderName={staff ? holderName : undefined} />
                  ))}
                </div>
              )}

              {/* 残念トロフィー: 獲得したものだけ・別枠（全部で何個あるかは出さない）。未獲得のタブでは出さない */}
              {oops.length > 0 && tab !== 'not' && (
                <div className="tt-rows" style={{ marginTop: 6 }}>
                  <div className="tt-px2" style={{ padding: 2, background: 'rgba(169,176,154,.45)' }}>
                    <div className="tt-px2" style={{ padding: '8px 12px', background: 'rgba(20,23,15,.92)', display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="tt-arc tt-chrome" style={{ fontSize: 8, backgroundImage: CHROME.Z }}>OOPS</span>
                      <span className="tt-dot" style={{ flex: 1, fontSize: 13, color: '#E4E8D8' }}>残念トロフィー</span>
                      <span className="tt-arc" style={{ fontSize: 9, color: '#FFFFFF' }}>{data.counts.oops?.earned ?? oops.length}</span>
                    </div>
                  </div>
                  {oops.map((it) => (
                    <Row key={it.id} it={it} isNew={it.earnedAt != null && it.earnedAt > seenBefore && seenBefore > 0} onOpen={() => setDetail(it)} holderName={staff ? holderName : undefined} />
                  ))}
                </div>
              )}
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
          holderName={staff ? holderName : undefined}
        />
      )}
    </div>
  );
}

function Row({ it, isNew, onOpen, holderName }: { it: TrophyItem; isNew: boolean; onOpen: () => void; holderName?: (h: { key: string; nickname: string }) => string }) {
  const g = GRADE_COLOR[it.grade];
  const got = it.earnedAt != null;
  const holder = it.firstHolder;
  const firstMine = it.first && got;
  const oops = !!it.oops;
  const ev = !!it.event;
  const frame = firstMine
    ? 'linear-gradient(90deg,#FFD84A 0 10px,#FF5A6E 10px calc(100% - 10px),#FFD84A calc(100% - 10px))'
    : oops
      ? g.c
    : got
      ? g.c
      : `rgba(${g.rgb},${it.first && !holder ? 0.45 : 0.28})`;
  const bg = firstMine
    ? 'linear-gradient(180deg,#3A0A18,#14040A)'
    : oops
      ? 'linear-gradient(180deg,#2B3026,#14170F)'
      : ev
        ? 'linear-gradient(180deg,#2E1650,#140828)'
        : got ? 'linear-gradient(180deg,#0C4250,#062530)' : 'rgba(4,40,48,.92)';
  const well = oops
    ? 'radial-gradient(circle,rgba(169,176,154,.3),rgba(12,14,9,1) 72%)'
    : got ? `radial-gradient(circle,rgba(${g.rgb},.3),rgba(3,18,24,1) 72%)` : it.first ? 'rgba(20,4,10,.9)' : 'rgba(2,16,22,.8)';

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
    } else {
      meta = '未獲得';
    }
  }

  // 先生用: 取得した人数と、獲得者の名前（1 行・はみ出しは …）
  const holders = holderName ? it.holders : undefined;
  if (holders) {
    rate = `取得 ${holders.length} 人 · ${rarityPct(it.rarity)}`;
    if (!got) {
      meta = holders.length ? `最初 ${mdJst(holders[0]!.at)}` : 'まだ誰も';
      metaArc = false;
      metaColor = holders.length ? '#EAFBFF' : '#8ED4E0';
    }
  }

  return (
    <button type="button" className="tt-rowbtn tt-px2" style={{ background: frame }} onClick={onOpen} aria-label={`${it.hidden ? '隠しトロフィー' : it.name} ${g.en} ${got ? '獲得済み' : '未獲得'}`}>
      <div className="tt-rowin tt-px2" style={{ background: bg }}>
        <div className="tt-rowwell tt-px2" style={{ background: well }}>
          {it.hidden ? (
            <span className="tt-arc" style={{ fontSize: 16, color: 'rgba(255,216,74,.55)' }}>?</span>
          ) : oops ? (
            <TrophyIcon grade="Z" size={30} chip style={{ transform: 'rotate(-14deg)' }} />
          ) : (
            <TrophyIcon grade={it.grade} size={ev ? 34 : 30} style={{ opacity: got ? 1 : it.first ? 0.55 : 0.4, filter: got ? `drop-shadow(0 0 4px rgba(${g.rgb},.6))` : 'saturate(.3)' }} />
          )}
        </div>
        {it.first && !it.hidden && <span className="tt-mini1 tt-arc" aria-hidden="true" style={{ left: 40, right: 'auto', top: 2 }}>1ST</span>}
        <div className="tt-rowtext">
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0 }}>
            <span className="tt-dot tt-rowname" style={{ color: oops ? '#E4E8D8' : got ? '#FFFFFF' : 'rgba(234,251,255,.65)' }}>{it.hidden ? '隠しトロフィー' : it.name}</span>
            {isNew && <span className="tt-arc tt-px2" style={{ flex: 'none', padding: '3px 5px', background: '#FF7A45', color: '#140A05', fontSize: 6 }}>NEW</span>}
          </div>
          <div className="tt-dot tt-rowdesc" style={oops ? { color: '#A9B09A' } : undefined}>{it.hidden ? '獲得すると内容が見えます' : it.desc}</div>
          {holders && holders.length > 0 && (
            <div className="tt-dot" style={{ fontSize: 11, color: '#FFE9A8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {holders.map((h) => `${gradeLabel(h.grade)} ${holderName!(h)}`).join('、')}
            </div>
          )}
          {it.progress && !got && !holders && (
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
