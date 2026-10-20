/**
 * ANCHOR TREE — チャンピオンアリーナの結果（設計書 §5.7）。
 * スコア（/ 1,000）と今シーズンの順位だけ（2026-10-17 先生の指示）。
 * ニックネームは通常の結果画面と同じく、離れるときに保存する。見た目は夜の紫 + 金（ボード A09）。
 * 先生用アカウントは「記録として提出」を押した挑戦だけが先生の記録になる（2026-10-18 先生の指示。押さなければテスト扱い）。
 * 先生用アカウントだけ、間違えた問題（問題画像と自分の答え・改善要望）を通常の結果画面と同じ形で出す（2026-10-19 先生の指示。生徒はスコアと順位だけのまま）。
 */
import { useRef, useState } from 'react';
import type { ArenaResult, ArenaSession } from '../../lib/treeApi';
import { gradeLabel, recordArena } from '../../lib/treeApi';
import { ArenaHead, ArenaSparks } from './ArenaScreen';
import { Ico } from './TreeIcons';
import { WrongList } from './ResultScreen';
import { RETRO, arenaSeasonName, fmtScore, rootClass } from './treeTheme';

interface Props {
  result: ArenaResult;
  session: ArenaSession;
  /** 先生用アカウント（間違えた問題を出す）*/
  staff: boolean;
  grade: string;
  nickname: string;
  /** 自分のカニの種名（空欄で保存したときの名前）。無ければ「プレイヤー」 */
  crab: string | null;
  onSaveNick: (nickname: string) => Promise<string | null>;
  onBack: () => void;
  onRanking: () => void;
  onReport: (qid: string, message: string, label: string, img: string | null) => Promise<'sent' | 'already' | 'error'>;
}

export function ArenaResultScreen({ result, session, staff, grade, nickname, crab, onSaveNick, onBack, onRanking, onReport }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [nick, setNick] = useState(nickname === 'プレイヤー' || nickname === crab ? '' : nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [record, setRecord] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const sendRecord = async () => {
    setRecord('sending');
    try {
      await recordArena(result.sessionId);
      setRecord('done');
    } catch {
      setRecord('error');
    }
  };
  const leave = async (go: () => void) => {
    setSaving(true);
    const err = await onSaveNick(nick);
    setSaving(false);
    if (err) setNickError(err);
    else go();
  };

  return (
    <div className={rootClass('is-arena tr-ar-screen')} ref={rootRef}>
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

        {result.canRecord && (
          <div className="tr-ar-card" style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--tr-sub)', lineHeight: 1.7 }}>
              {record === 'done'
                ? '記録しました。アリーナ画面の先生のスコアに反映されます（今シーズンの最高）。'
                : '先生用アカウント: このスコアは「記録として提出」を押すまでアリーナ画面に表示されません。押さなければテストとして扱います。'}
            </div>
            {record === 'error' && (
              <div role="alert" style={{ fontSize: 12, color: 'var(--tr-review)' }}>
                記録できませんでした。通信状況を確かめて、もう一度押してください。
              </div>
            )}
            <button type="button" className="tr-ar-btn" style={{ height: 48, fontSize: 15 }} disabled={record === 'sending' || record === 'done' || saving} onClick={() => void sendRecord()}>
              {record === 'sending' ? '送信中…' : record === 'done' ? '記録済み' : '記録として提出'}
            </button>
          </div>
        )}

        <button type="button" className="tr-ar-card tr-ar-rankbtn" onClick={() => void leave(onRanking)} aria-label="アリーナのランキングを見る">
          <div>
            <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>今シーズンの順位</div>
            <div className="tr-ar-dot" style={{ fontSize: 26, marginTop: 2 }}>
              {result.rank.rank != null ? `${result.rank.rank}位` : '—'}
            </div>
          </div>
          <span style={{ color: 'var(--ar-gold)', display: 'flex' }}>
            <Ico id={RETRO ? 'i-px-next' : 'i-chev-right'} size={RETRO ? 14 : 18} />
          </span>
        </button>

        {staff && <WrongList results={result.results} session={session} layer={rootRef} onReport={onReport} />}
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
