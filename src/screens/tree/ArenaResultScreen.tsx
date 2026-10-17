/**
 * ANCHOR TREE — チャンピオンアリーナの結果（設計書 §5.7）。
 * スコア（/ 1,000）・正答・時間・基礎点とタイムボーナスの内訳・今シーズンの順位・間違えた問題（正解は出さない・誤り報告できる）。
 * ニックネームは通常の結果画面と同じく、離れるときに保存する。
 */
import { useState } from 'react';
import type { ArenaResult, TreeSession } from '../../lib/treeApi';
import { QTYPE_LABEL, examLabel, gradeLabel } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { WrongItem, mineLabel } from './ResultScreen';
import { ARENA_GOLD, ARENA_GOLD_SIDE, REVIEW_COLOR, T, alpha, arenaSeasonName, fmtScore, fmtTime, rootClass } from './treeTheme';

interface Props {
  result: ArenaResult;
  session: TreeSession;
  grade: string;
  nickname: string;
  onSaveNick: (nickname: string) => Promise<string | null>;
  onReport: (qid: string) => Promise<'sent' | 'already' | 'error'>;
  onBack: () => void;
  onRanking: () => void;
}

export function ArenaResultScreen({ result, session, grade, nickname, onSaveNick, onReport, onBack, onRanking }: Props) {
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
  const { summary, rank } = result;
  const wrong = result.results.filter((r) => !r.correct);

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
            <span className="tr-num tr-hero-num" style={{ color: ARENA_GOLD }}>{fmtScore(summary.score)}</span>
            <span style={{ fontSize: 13, color: T.sub }}>/ {fmtScore(summary.max)}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: T.sub, flexWrap: 'wrap' }}>
            <span>
              正答 <b className="tr-num" style={{ fontSize: 16, color: T.text }}>{summary.correct}</b> / {summary.total}
            </span>
            <span>
              時間 <b className="tr-num" style={{ fontSize: 16, color: T.text }}>{fmtTime(summary.elapsedMs)}</b>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            <span className="tr-pill tr-num" style={{ background: alpha(T.accent, 0.18), color: T.accent }}>
              基礎点 +{fmtScore(summary.basePoints)}
            </span>
            <span className="tr-pill tr-num" style={{ background: alpha(ARENA_GOLD, 0.18), color: ARENA_GOLD }}>
              タイムボーナス +{fmtScore(summary.bonusPoints)}
            </span>
          </div>
        </div>

        <button type="button" className="tr-stat" style={{ width: '100%' }} onClick={() => void leave(onRanking)} aria-label="アリーナのランキングを見る">
          <div>今シーズンの順位</div>
          <div className="tr-num">{rank.rank != null ? `${rank.rank}位` : '—'}</div>
          <div className="tr-num" style={{ color: T.sub, fontWeight: 500 }}>
            {rank.rank != null ? `${rank.of} 人中（シーズン終了まで変わります）` : summary.score > 0 ? '先生用アカウントは載りません' : '0 点はランキングに載りません'}
          </div>
        </button>

        <div className="tr-arena-qlist" aria-label="問題ごとの点">
          {result.results.map((r, i) => (
            <div key={r.qid} className={`tr-arena-q${r.correct ? ' is-ok' : ''}`}>
              <span className="tr-num">{i + 1}</span>
              <span>{QTYPE_LABEL[r.type]?.replace('問題', '') ?? ''}</span>
              <b className="tr-num">{r.correct ? `+${fmtScore(r.gain)}` : '0'}</b>
            </div>
          ))}
        </div>

        {wrong.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: REVIEW_COLOR, display: 'block' }} />
              間違えた問題 {wrong.length} 問
            </div>
            {wrong.map((r) => {
              const q = session.questions[r.qid];
              const label =
                !q || q.answer.kind !== 'choice'
                  ? r.qid
                  : `${q.source.kind === 'basic' ? '基本 · ' : ''}${examLabel(q.source.exam)} · 解答番号 ${q.answer.boxes.map((b) => b.n).join('・')}`;
              return <WrongItem key={r.qid} label={label} mine={mineLabel(q, r.value)} body={q?.img.body ?? null} onReport={() => onReport(r.qid)} />;
            })}
          </div>
        )}
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
