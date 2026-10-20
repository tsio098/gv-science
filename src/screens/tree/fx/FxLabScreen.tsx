/**
 * ANCHOR TREE — 演出の確認（先生用アカウントだけ・2026-10-17 夕方 先生の依頼）。
 * 5 つの演出（＋総合優勝のプレミアム）を見本のデータで何度でも再生する。既読（/tree/events/seen）にはしない。
 * 通知（トロフィー・お知らせ）の確認（2026-10-19 先生の依頼）: 見本 25 種（2026-10-19 残念トロフィー 3・LEVEL 30 2・2026-10-20 季節イベント 4 を追加）・効果音 ON/OFF・ゆっくり再生（1/4）・音だけ鳴らす。
 * 実機（LINE 内ブラウザ・iPhone）でコマ送りと音を確かめるための画面。
 */
import { useEffect, useRef, useState } from 'react';
import { SEQ, reducedMotion, setSoundOn, sfx, soundOn, type SfxName } from '../trophy/sfx';
import { setToastSpeed } from '../trophy/labSpeed';
import { sfxFor } from '../trophy/useToasts';
import type { ArenaSeason, TreeEvent, TrophyGet } from '../../../lib/treeApi';
import type { ToastItem } from '../trophy/toastQueue';
import { eventClearToast, eventTicketToast, level30Toast, noticeToast, trophyToast } from '../trophy/toastItems';
import { Ico } from '../TreeIcons';
import { rootClass } from '../treeTheme';
import { FxScreen } from './FxScreen';
import { preloadFxImages } from './fxKit';

interface Props {
  grade: string;
  nickname: string;
  subject: string;
  subjectName: string;
  /** いまのシーズン（アリーナの無い科目・古い Proxy は null → 見本の日付）*/
  season: ArenaSeason | null;
  /** チケットの見本（半券を切るテスト）へ */
  onTickets?: () => void;
  /** 通知（トロフィー・お知らせ）の見本をキューに入れる（既読にしない・2026-10-19）*/
  onToasts?: (items: ToastItem[]) => void;
  onBack: () => void;
}

const DAY = 86400_000;

/** 見本のシーズン（n 番目・2 週間）。今シーズンが分かればそれを基準にする */
function seasonAt(base: ArenaSeason | null, offset: number): ArenaSeason {
  const len = 14 * DAY;
  const start = (base ? base.start : Date.now() - 3 * DAY) + offset * len;
  const n = Math.max(1, (base ? base.n : 1) + offset);
  return { n, key: new Date(start + 9 * 3600_000).toISOString().slice(0, 10), start, end: start + len };
}

/** 音だけ鳴らすボタン（どの通知で鳴る音か）*/
const SOUNDS: { name: SfxName; label: string }[] = [
  { name: 'bronze', label: 'ブロンズ' },
  { name: 'silver', label: 'シルバー' },
  { name: 'gold', label: 'ゴールド' },
  { name: 'platinum', label: 'プラチナ' },
  { name: 'firstSelf', label: 'ファースト（自分）' },
  { name: 'firstOther', label: 'ファースト（ほかの人）' },
  { name: 'node', label: '解放・マスター' },
  { name: 'rank', label: '順位アップ' },
  { name: 'rankDown', label: '順位ダウン' },
  { name: 'news', label: '新着' },
  { name: 'progress', label: '80% に届いた' },
  { name: 'arena', label: 'アリーナ（最終日・順位）' },
  { name: 'teacher', label: '先生の記録' },
  { name: 'oops', label: '残念トロフィー' },
  { name: 'level30', label: 'LEVEL 30' },
  { name: 'evClear', label: 'EVENT CLEAR!!' },
  { name: 'evTicket', label: 'TICKET GET!' },
];
const SOUND_LABEL = Object.fromEntries(SOUNDS.map((x) => [x.name, x.label])) as Record<SfxName, string>;

export function FxLabScreen({ grade, nickname, subject, subjectName, season, onTickets, onToasts, onBack }: Props) {
  const demoN = useRef(0);
  const [sound, setSound] = useState(soundOn);
  const [slow, setSlow] = useState(false);
  const reduced = reducedMotion();
  // この画面を閉じたら速さを戻す（生徒と同じ通常の速さ）
  useEffect(() => () => setToastSpeed(1), []);
  // n: 同じ演出をもう一度押したときも最初から再生し直す
  const [playing, setPlaying] = useState<{ ev: TreeEvent; n: number } | null>(null);
  const who = { subject, grade, nickname };
  const cur = seasonAt(season, 0);
  const prev = seasonAt(season, -1);
  const items: { label: string; ev: TreeEvent }[] = [
    { label: 'ABYSS 解放', ev: { ...who, key: 'lab:abyss', type: 'unlock_abyss' } },
    { label: 'アリーナ解放', ev: { ...who, key: 'lab:arena', type: 'unlock_arena', season: cur } },
    { label: 'シーズン優勝', ev: { ...who, key: 'lab:champion', type: 'champion', season: prev, score: 812 } },
    { label: '総合優勝（通常）', ev: { ...who, key: 'lab:grand', type: 'grand', pair: [seasonAt(season, -2), prev], score: 1540, ticket: { id: 'lab', premium: false } } },
    { label: '総合優勝（プレミアム）', ev: { ...who, key: 'lab:grand-p', type: 'grand', pair: [seasonAt(season, -2), prev], score: 1880, ticket: { id: 'lab', premium: true } } },
    { label: '新シーズン開始', ev: { ...who, key: 'lab:season', type: 'season_start', season: cur } },
  ];

  // 通知の見本（キーを毎回変えて何度でも出す。trophy / noticeKey を外して既読・詳細に行かない）
  const demo = (list: ToastItem[]) => {
    const n = ++demoN.current;
    // 季節イベントの見本は科目を外す（EVENT CLEAR!! をタップしてもイベント画面へ行かない）
    onToasts?.(list.map((t) => ({ ...t, key: `demo:${n}:${t.key}`, trophy: undefined, noticeKey: undefined, ...(t.ev ? { ev: { ...t.ev, subject: '' } } : {}) })));
  };
  const tg = (grade: TrophyGet['grade'], name: string, pt: number, note: string | null = null): ToastItem =>
    trophyToast({ subject, id: name, grade, name, pt, first: grade === 'F', desc: '', ...(grade === 'Z' ? { oops: true, note } : {}) }, subjectName);
  const notes: { label: string; items: () => ToastItem[] }[] = [
    { label: 'ブロンズ', items: () => [tg('B', 'すべては最善', 1)] },
    { label: 'シルバー（13 字は 13px）', items: () => [tg('S', '明日も、明日も、また明日も', 2)] },
    { label: 'ゴールド', items: () => [tg('G', '大地もそのすべても君のもの', 6)] },
    { label: 'プラチナ', items: () => [tg('P', '時よ止まれ、お前は美しい', 20)] },
    { label: 'ファースト（自分）', items: () => [tg('F', 'われ発見せり', 12)] },
    {
      label: 'ファースト（ほかの人）',
      items: () => [noticeToast({ key: 'first', type: 'first_broadcast', subject, holder: { grade: 'H3', nickname: 'たまき' }, trophy: { id: 'f', name: 'われ発見せり', desc: 'ROUTE の全分野をマスター' } }, subjectName)!],
    },
    { label: 'NODE OPEN（分野の解放）', items: () => [{ key: 'node', kind: 'node', head: 'NODE OPEN!', main: '気体の性質', sub: `${subjectName} · ROUTE` }] },
    { label: 'MASTER（種別のマスター）', items: () => [{ key: 'master', kind: 'master', head: 'MASTER!', main: '非金属 · 正誤', sub: 'マスター度 80%' }] },
    { label: 'RANK UP（順位アップ）', items: () => [{ key: 'rank', kind: 'rank', head: 'RANK UP!', main: '非金属 7 位 → 5 位', sub: '38 人中' }] },
    { label: 'RANK DOWN（順位ダウン）', items: () => [noticeToast({ key: 'rd', type: 'rank_down', subject, rank: 7, prevRank: 5, of: 38 }, subjectName)!] },
    { label: 'NEW（新着）', items: () => [{ key: 'news', kind: 'news', head: 'NEW +3', main: '非金属に新着 3 問', sub: `${subjectName} · ROUTE` }] },
    { label: 'PROGRESS（80% に届いた）', items: () => [{ key: 'near', kind: 'progress', head: 'PROGRESS 40/50', main: '待て、そして希望せよ', prog: { now: 40, max: 50 } }] },
    { label: 'LAST DAY（アリーナ最終日）', items: () => [noticeToast({ key: 'ld', type: 'arena_last_day', subject, season: cur }, subjectName)!] },
    {
      label: 'RANKING UPDATE（アリーナの順位）',
      items: () => [noticeToast({ key: 'ar', type: 'arena_rank', subject, season: cur, rank: 4, prevRank: 3, of: 21, leader: { grade: 'H3', nickname: 'たまき' }, leaderChanged: true }, subjectName)!],
    },
    { label: 'TEACHER RECORD（先生の記録）', items: () => [noticeToast({ key: 'tr', type: 'teacher_record', subject, season: cur, score: 912 }, subjectName)!] },
    { label: '2 件（次がのぞく）', items: () => [tg('S', 'その倍の速さで走れ', 2), tg('B', 'すべては最善', 1)] },
    { label: '3 件まとめて（ほか n 件）', items: () => [tg('B', 'すべては最善', 1), tg('S', 'その倍の速さで走れ', 2), tg('G', '時は金なり', 6)] },
    // 2026-10-19 残念トロフィー・LV.30 チケット
    { label: '残念トロフィー（セット）', items: () => [tg('Z', 'すべて失われたわけではない', 0)] },
    { label: '残念トロフィー（ランキング）', items: () => [tg('Z', '高ぶりは滅びに先立つ', 0, `${subjectName} 1 位 → 6 位`)] },
    { label: '残念トロフィー（正答率）', items: () => [tg('Z', '二度あることは三度ある', 0, '直近 3 セットの平均 27%')] },
    { label: 'LEVEL 30（タップでチケット）', items: () => [level30Toast({ subject }, subjectName)] },
    { label: 'トロフィー + 残念 + LEVEL 30（並び）', items: () => [level30Toast({ subject }, subjectName), tg('Z', 'ホメロスも居眠りする', 0), tg('G', '時は金なり', 6)] },
    // 2026-10-20 季節イベント（ハロウィン）: EVENT CLEAR!!（初めての 100% = トロフィー ＋ アイコン / 2 科目目 = EVENT トロフィー）・TICKET GET!
    {
      label: 'EVENT CLEAR!!（初めて・トロフィー ＋ アイコン）',
      items: () => [eventClearToast({ subject, id: 'ev_halloween', grade: 'E', name: '何か邪悪なものがやって来る', pt: 0, first: false, desc: '', event: true, firstIcon: true }, subjectName)],
    },
    {
      label: 'EVENT CLEAR!!（2 科目目）',
      items: () => [eventClearToast({ subject, id: 'ev_halloween', grade: 'E', name: '何か邪悪なものがやって来る', pt: 0, first: false, desc: '', event: true, firstIcon: false }, subjectName)],
    },
    {
      label: 'TICKET GET!（10/31 のみ使用可能）',
      items: () => [eventTicketToast({ subject, eventId: 'halloween-2026', usableFrom: Date.parse('2026-10-31T00:00:00+09:00'), kind: 'halloween' }, subjectName)],
    },
    {
      label: 'トロフィー + LEVEL 30 + EVENT CLEAR!! + TICKET GET!（並び）',
      items: () => [
        eventTicketToast({ subject, eventId: 'halloween-2026', usableFrom: Date.parse('2026-10-31T00:00:00+09:00'), kind: 'halloween' }, subjectName),
        eventClearToast({ subject, id: 'ev_halloween', grade: 'E', name: '何か邪悪なものがやって来る', pt: 0, first: false, desc: '', event: true, firstIcon: true }, subjectName),
        level30Toast({ subject }, subjectName),
        tg('G', '時は金なり', 6),
      ],
    },
  ];

  return (
    <div className={rootClass('tr-rank')}>
      <div className="tr-rank-head">
        <button type="button" className="tr-iconbtn" aria-label="戻る" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <div className="tr-rank-title">
          <Ico id="i-star" size={18} />
          <span>演出の確認（先生用）</span>
        </div>
      </div>
      <div className="tr-rank-body">
        {onToasts && (
          <div className="tr-fxlab">
            <div className="tr-note" style={{ color: 'inherit', fontWeight: 700 }}>通知（トロフィー・お知らせ）</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button
                type="button"
                className={sound ? 'tr-cta' : 'tr-ghost'}
                style={{ flex: 1, minWidth: 140 }}
                aria-pressed={sound}
                onClick={() => {
                  setSoundOn(!sound);
                  setSound(!sound);
                }}
              >
                効果音 {sound ? 'ON' : 'OFF'}
              </button>
              <button
                type="button"
                className={slow ? 'tr-cta' : 'tr-ghost'}
                style={{ flex: 1, minWidth: 140 }}
                aria-pressed={slow}
                onClick={() => {
                  setToastSpeed(slow ? 1 : 0.25);
                  setSlow(!slow);
                }}
              >
                {slow ? 'ゆっくり（1/4）' : '通常の速さ'}
              </button>
            </div>
            <div className="tr-note">
              ボタンを押すと左上に出ます（生徒の画面と同じ部品・既読にはしません）。ゆっくり（1/4）は動きと表示時間を 4 倍にします（音は鳴る時刻だけ遅らせ、音そのものは通常の速さ）。効果音の ON / OFF はツリーの「…」と同じ設定です。
            </div>
            <div className="tr-note">
              音が鳴らないとき: iPhone・iPad は本体の消音モード（マナーモード）だと鳴りません。音量ボタンで音量も確かめてください。LINE を開いて最初の 1 回は画面のどこかをタップしてから鳴ります（生徒もツリーを開いた直後の通知は無音のことがあります）。
            </div>
            {reduced && (
              <div className="tr-note" style={{ color: '#FFB38A' }}>
                この端末は「視差効果を減らす」が ON なので、通知は動かさず最後の形だけ出し、音も鳴らしません（生徒の端末でも同じ扱い）。動きと音を確かめるときは 設定 → アクセシビリティ → 動作 → 視差効果を減らす を OFF にしてください。
              </div>
            )}
            {notes.map((n) => (
              <button key={n.label} type="button" className="tr-ghost" onClick={() => demo(n.items())}>
                {n.label}
                <span style={{ fontSize: 11, opacity: 0.6, marginLeft: 6 }}>♪ {SOUND_LABEL[sfxFor(n.items()[0]!)]}</span>
              </button>
            ))}
            <div className="tr-note" style={{ marginTop: 6 }}>音だけ鳴らす</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
              {SOUNDS.map((x) => (
                <button key={x.name} type="button" className="tr-ghost" onClick={() => sfx(SEQ[x.name] as Parameters<typeof sfx>[0], 0.05)}>
                  ♪ {x.label}
                </button>
              ))}
            </div>
            <div className="tr-note" style={{ marginTop: 10, color: 'inherit', fontWeight: 700 }}>演出（全画面）</div>
          </div>
        )}
        <div className="tr-note">見本のデータで再生します。生徒の既読には影響しません。画面をタップすると最後の状態へ飛びます。</div>
        <div className="tr-fxlab">
          {items.map((it) => (
            <button
              key={it.ev.key}
              type="button"
              className="tr-ghost"
              onPointerDown={() => void preloadFxImages()}
              onClick={() => setPlaying((p) => ({ ev: it.ev, n: (p?.n ?? 0) + 1 }))}
            >
              {it.label}
            </button>
          ))}
          {onTickets && (
            <button type="button" className="tr-ghost" onClick={onTickets}>
              <Ico id="i-ticket" size={16} />
              チケットの見本（半券を切るテスト）
            </button>
          )}
        </div>
      </div>
      {playing && <FxScreen key={`${playing.ev.key}:${playing.n}`} event={playing.ev} subjectName={subjectName} onClose={() => setPlaying(null)} />}
    </div>
  );
}
