/**
 * ANCHOR TREE — 演出の確認（先生用アカウントだけ・2026-10-17 夕方 先生の依頼）。
 * 5 つの演出（＋総合優勝のプレミアム）を見本のデータで何度でも再生する。既読（/tree/events/seen）にはしない。
 */
import { useState } from 'react';
import type { ArenaSeason, TreeEvent } from '../../../lib/treeApi';
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

export function FxLabScreen({ grade, nickname, subject, subjectName, season, onTickets, onBack }: Props) {
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
