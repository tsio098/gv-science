/**
 * ANCHOR TREE — チャンピオンアリーナの結果（設計書 §5.7）。
 * スコア（/ 1,000）と今シーズンの順位だけ（2026-10-17 先生の指示）。
 * ニックネームは通常の結果画面と同じく、離れるときに保存する。
 */
import { useState } from 'react';
import type { ArenaResult } from '../../lib/treeApi';
import { gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { ARENA_GOLD, ARENA_GOLD_SIDE, REVIEW_COLOR, T, alpha, arenaSeasonName, fmtScore, rootClass } from './treeTheme';

interface Props {
  result: ArenaResult;
  grade: string;
  nickname: string;
  onSaveNick: (nickname: string) => Promise<string | null>;
  onBack: () => void;
  onRanking: () => void;
}

export function ArenaResultScreen({ result, grade, nickname, onSaveNick, onBack, onRanking }: Props) {
  const [nick, setNick] = useState(nickname === 'プレイヤー' ? '' : nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const leave = async (go: () => void) => {
    setSaving(true);
    const err = await onSaveNick(nick);
    setSaving(false);
    if (err) setNickError(err);
    else go();
  };

  return (
    <div className={rootClass('tr-result')}>
      <div className="tr-result-head">
        <div className="tr-arena-tile">
          <Ico id="i-crown" size={16} />
        </div>
        <span style={{ flex: 1 }}>
          <b>CHAMPION ARENA</b> · {arenaSeasonName(result.season.n)} · 結果
        </span>
        <button type="button" className="tr-iconbtn" aria-label="ツリーへ戻る" disabled={saving} onClick={() => void leave(onBack)}>
          <Ico id="i-close" size={16} />
        </button>
      </div>

      <div className="tr-result-body">
        <div className="tr-card tr-hero" style={{ boxShadow: `6px 6px 0 0 ${ARENA_GOLD_SIDE}, 0 0 20px ${alpha(ARENA_GOLD, 0.2)}`, borderColor: alpha(ARENA_GOLD, 0.6) }}>
          <div style={{ fontSize: 12, color: T.sub }}>アリーナスコア</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="tr-num tr-hero-num" style={{ color: ARENA_GOLD }}>{fmtScore(result.summary.score)}</span>
            <span style={{ fontSize: 13, color: T.sub }}>/ {fmtScore(result.summary.max)}</span>
          </div>
        </div>

        <button type="button" className="tr-stat" style={{ width: '100%' }} onClick={() => void leave(onRanking)} aria-label="アリーナのランキングを見る">
          <div>今シーズンの順位</div>
          <div className="tr-num">{result.rank.rank != null ? `${result.rank.rank}位` : '—'}</div>
        </button>
      </div>

      <div className="tr-foot">
        <label htmlFor="tr-nick" style={{ fontSize: 12, color: T.sub }}>
          ランキングに表示するニックネーム（空欄なら「プレイヤー」）
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {grade && <span className="tr-arena-grade">{gradeLabel(grade)}</span>}
          <input
            id="tr-nick"
            className="tr-input"
            type="text"
            placeholder="プレイヤー"
            maxLength={12}
            value={nick}
            aria-invalid={!!nickError}
            onChange={(e) => {
              setNick(e.target.value);
              setNickError(null);
            }}
          />
        </div>
        {nickError && (
          <div role="alert" style={{ fontSize: 12, color: REVIEW_COLOR }}>
            {nickError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="tr-ghost" style={{ flex: 1 }} disabled={saving} onClick={() => void leave(onBack)}>
            ツリーへ
          </button>
          <button type="button" className="tr-cta tr-arena-cta" style={{ flex: 1.4, height: 50, fontSize: 14 }} disabled={saving} onClick={() => void leave(onRanking)}>
            ランキングを見る
          </button>
        </div>
      </div>
    </div>
  );
}
