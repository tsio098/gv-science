/**
 * ANCHOR TREE — チャンピオンアリーナの結果（設計書 §5.7）。
 * スコア（/ 1,000）と今シーズンの順位だけ（2026-10-17 先生の指示）。
 * ニックネームは通常の結果画面と同じく、離れるときに保存する。見た目は夜の紫 + 金（ボード A09）。
 */
import { useState } from 'react';
import type { ArenaResult } from '../../lib/treeApi';
import { gradeLabel } from '../../lib/treeApi';
import { ArenaHead, ArenaSparks } from './ArenaScreen';
import { Ico } from './TreeIcons';
import { arenaSeasonName, fmtScore, rootClass } from './treeTheme';

interface Props {
  result: ArenaResult;
  grade: string;
  nickname: string;
  /** 自分のカニの種名（空欄で保存したときの名前）。無ければ「プレイヤー」 */
  crab: string | null;
  onSaveNick: (nickname: string) => Promise<string | null>;
  onBack: () => void;
  onRanking: () => void;
}

export function ArenaResultScreen({ result, grade, nickname, crab, onSaveNick, onBack, onRanking }: Props) {
  const [nick, setNick] = useState(nickname === 'プレイヤー' || nickname === crab ? '' : nickname);
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
    <div className={rootClass('is-arena tr-ar-screen')}>
      <div className="tr-ar-glow" aria-hidden="true" />
      <ArenaSparks />
      <ArenaHead compact sub={`${arenaSeasonName(result.season.n)} · 結果`} closeLabel="ツリーへ戻る" disabled={saving} onClose={() => void leave(onBack)} />

      <div className="tr-ar-body">
        <div className="tr-ar-hero">
          <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>アリーナスコア</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginTop: 4 }}>
            <span className="tr-ar-dot tr-ar-score">{fmtScore(result.summary.score)}</span>
            <span style={{ fontSize: 14, color: 'var(--tr-sub)' }}>/ {fmtScore(result.summary.max)}</span>
          </div>
        </div>

        <button type="button" className="tr-ar-card tr-ar-rankbtn" onClick={() => void leave(onRanking)} aria-label="アリーナのランキングを見る">
          <div>
            <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>今シーズンの順位</div>
            <div className="tr-ar-dot" style={{ fontSize: 26, marginTop: 2 }}>
              {result.rank.rank != null ? `${result.rank.rank}位` : '—'}
            </div>
          </div>
          <span style={{ color: 'var(--ar-gold)', display: 'flex' }}>
            <Ico id="i-chev-right" size={18} />
          </span>
        </button>
      </div>

      <div className="tr-ar-foot" style={{ gap: 10 }}>
        <label htmlFor="tr-nick" style={{ fontSize: 12, color: 'var(--tr-sub)' }}>
          ランキングに表示するニックネーム（空欄なら「{crab || 'プレイヤー'}」）
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {grade && <span className="tr-ar-gradebox">{gradeLabel(grade)}</span>}
          <input
            id="tr-nick"
            className="tr-input tr-ar-input"
            type="text"
            placeholder={crab || 'プレイヤー'}
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
          <div role="alert" style={{ fontSize: 12, color: 'var(--tr-review)' }}>
            {nickError}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
          <button type="button" className="tr-ar-btn2" style={{ flex: 1 }} disabled={saving} onClick={() => void leave(onBack)}>
            ツリーへ
          </button>
          <button type="button" className="tr-ar-btn" style={{ flex: 1.4, height: 52, fontSize: 15 }} disabled={saving} onClick={() => void leave(onRanking)}>
            ランキングを見る
          </button>
        </div>
      </div>
    </div>
  );
}
