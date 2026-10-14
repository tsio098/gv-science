/**
 * ANCHOR TREE — 結果（設計書 §5.2 / モック Result.dc.html）。
 * 今回の加算（新規正解 +75・時間ボーナス更新の差分）・累積スコア・マスター度・出題状況の前後・間違えた問題。
 * ニックネームはここで入力し、離れるときに保存する（/tree/profile）。順位は Phase 4。
 */
import { useState } from 'react';
import type { FieldGroup, NodeStats, SubmitResult, TreeManifest, TreeSession } from '../../lib/treeApi';
import { QTYPE_LABEL, circled, examLabel, treeImage } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { distPct, fmtScore, fmtTime, groupColor, groupSide } from './treeTheme';

interface Props {
  result: SubmitResult;
  session: TreeSession;
  manifest: TreeManifest;
  grade: string;
  nickname: string;
  onRetry: (nickname: string) => void;
  onBack: (nickname: string) => void;
  busy: boolean;
}

function Dist({ s, col, label }: { s: NodeStats | null; col: string; label: string }) {
  if (!s) return null;
  const w = distPct(s.dist, s.total);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 10, color: 'rgba(249,247,242,0.5)', width: 20 }}>{label}</span>
      <div className="tr-distbar" style={{ flex: 1, height: 8 }}>
        <i style={{ width: `${w.mastered}%`, background: col }} />
        <i style={{ width: `${w.solved}%`, background: col, opacity: 0.5 }} />
        <i style={{ width: `${w.review}%`, background: '#F7C59F' }} />
      </div>
    </div>
  );
}

function WrongItem({ label, answer, mine, body }: { label: string; answer: string; mine: string; body: string | null }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const toggle = () => {
    setOpen((v) => !v);
    if (!url && body) {
      setFailed(false);
      treeImage(body).then(setUrl).catch(() => setFailed(true));
    }
  };
  return (
    <button type="button" className="tr-wrong" onClick={toggle} aria-expanded={open}>
      <div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 12, color: '#A9B5A5' }}>{label}</div>
          <div style={{ fontSize: 13 }}>
            正解 <b className="tr-num" style={{ color: '#9CC297' }}>{answer}</b> <span style={{ color: '#A9B5A5' }}>·</span> あなた{' '}
            <b className="tr-num" style={{ color: '#F7C59F' }}>{mine}</b>
          </div>
        </div>
        <span style={{ color: '#A9B5A5', transform: open ? 'rotate(90deg)' : undefined, display: 'flex' }}>
          <Ico id="i-chev-right" size={16} />
        </span>
      </div>
      {open && (
        <div className="tr-paper">
          {url ? <img src={url} alt={label} /> : <div className="tr-imgph">{failed ? '画像を読み込めませんでした' : '読み込み中…'}</div>}
        </div>
      )}
    </button>
  );
}

export function ResultScreen({ result, session, manifest, grade, nickname, onRetry, onBack, busy }: Props) {
  const field = manifest.fields.find((f) => f.id === session.field);
  const group = (field?.group ?? 'theory') as FieldGroup;
  const col = groupColor(group);
  const side = groupSide(group);
  const [nick, setNick] = useState(nickname === 'プレイヤー' ? '' : nickname);
  const { summary, node } = result;
  const before = node.before;
  const after = node.after;
  const mBefore = before ? Math.round(before.mastery * 100) : 0;
  const mAfter = after ? Math.round(after.mastery * 100) : 0;
  const keep = result.results.filter((r) => r.correct && !r.firstCorrect && r.bonusUp === 0).length;
  const wrong = result.results.filter((r) => !r.correct);
  const unlockedNames = result.newlyUnlocked
    .map((id) => manifest.fields.find((f) => f.id === id))
    .filter((f) => f && f.total > 0)
    .map((f) => f!.name);
  const fs = result.fieldScore;

  return (
    <div className="tr-root tr-result">
      <div className="tr-result-head">
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: col,
            color: '#1F2A1E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `3px 3px 0 0 ${side}`,
          }}
        >
          {field && <Ico id={field.icon} size={16} />}
        </div>
        <span>
          {field?.name ?? session.field} › <b>{QTYPE_LABEL[session.qtype]}</b> · 結果
        </span>
      </div>

      <div className="tr-result-body">
        {unlockedNames.length > 0 && (
          <div className="tr-alert" style={{ borderColor: 'rgba(156,194,151,0.6)', color: '#9CC297' }}>
            <Ico id="i-lock" size={18} />
            <span>
              <b>{unlockedNames.join('・')}</b> が解放されました
            </span>
          </div>
        )}

        <div className="tr-card tr-hero" style={{ boxShadow: `6px 6px 0 0 ${col}` }}>
          <div style={{ fontSize: 12, color: '#A9B5A5' }}>今回の加算</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="tr-num tr-hero-num">+{fmtScore(summary.gain)}</span>
            <span style={{ fontSize: 13, color: '#A9B5A5' }}>/ {summary.total * 100}</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 13, color: '#A9B5A5', flexWrap: 'wrap' }}>
            <span>
              正答 <b className="tr-num" style={{ fontSize: 16, color: '#F9F7F2' }}>{summary.correct}</b> / {summary.total}
            </span>
            <span>
              時間 <b className="tr-num" style={{ fontSize: 16, color: '#F9F7F2' }}>{fmtTime(summary.elapsedMs)}</b>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 2 }}>
            {summary.newCorrect > 0 && (
              <span className="tr-pill tr-num" style={{ background: 'rgba(156,194,151,0.18)', color: '#9CC297' }}>
                新規正解 {summary.newCorrect} 問 +{fmtScore(summary.newCorrectPoints)}
              </span>
            )}
            {summary.bonusPoints > 0 && (
              <span className="tr-pill tr-num" style={{ background: 'rgba(156,194,151,0.18)', color: '#9CC297' }}>
                時間ボーナス +{fmtScore(summary.bonusPoints)}
              </span>
            )}
            {keep > 0 && (
              <span className="tr-pill tr-num" style={{ border: '1px solid rgba(249,247,242,0.25)', color: '#A9B5A5', fontWeight: 500 }}>
                正解済み {keep} 問 ±0
              </span>
            )}
          </div>
        </div>

        <div className="tr-stat3">
          <div className="tr-stat">
            <div>分野スコア</div>
            <div className="tr-num">{fmtScore(fs.after?.score ?? 0)}</div>
            <div className="tr-num">{summary.gain > 0 ? `▲${fmtScore(summary.gain)}` : '±0'}</div>
          </div>
          <div className="tr-stat">
            <div>マスター度</div>
            <div className="tr-num">{mAfter}%</div>
            <div className="tr-num" style={{ color: mAfter >= mBefore ? '#9CC297' : '#F7C59F' }}>
              {mBefore}% → {mAfter >= mBefore ? '▲' : '▼'}
              {Math.abs(mAfter - mBefore)}
            </div>
          </div>
          <div className="tr-stat">
            <div>分野の達成度</div>
            <div className="tr-num">{Math.round(fs.after?.pct ?? 0)}%</div>
            <div className="tr-num" style={{ color: '#A9B5A5', fontWeight: 500 }}>
              解放ライン {manifest.unlockPct}%
            </div>
          </div>
        </div>

        {after && (
          <div className="tr-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#A9B5A5' }}>
              <span>出題状況（{after.total} 問）</span>
              <span>
                未着手 {before?.dist.fresh ?? 0} → {after.dist.fresh}
              </span>
            </div>
            <Dist s={before} col={col} label="前" />
            <Dist s={after} col={col} label="後" />
            <div className="tr-legend">
              <span>
                <i style={{ background: col }} />
                定着
              </span>
              <span>
                <i style={{ background: col, opacity: 0.5 }} />
                正解済み
              </span>
              <span>
                <i style={{ background: '#F7C59F' }} />
                要復習
              </span>
              <span>
                <i style={{ background: 'rgba(249,247,242,0.2)' }} />
                未着手
              </span>
            </div>
          </div>
        )}

        {wrong.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: '#F7C59F', display: 'block' }} />
              間違えた問題 {wrong.length} 問
            </div>
            {wrong.map((r) => {
              const q = session.questions[r.qid];
              const label = q
                ? `${examLabel(q.source.exam)} · 解答番号 ${q.answer.boxes.map((b) => b.n).join('・')}`
                : r.qid;
              return (
                <WrongItem
                  key={r.qid}
                  label={label}
                  answer={r.answer.map(circled).join('・')}
                  mine={r.value.length ? r.value.map(circled).join('・') : '未回答'}
                  body={q?.img.body ?? null}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="tr-foot">
        <label htmlFor="tr-nick" style={{ fontSize: 12, color: '#A9B5A5' }}>
          ランキングに表示するニックネーム（空欄なら「プレイヤー」）
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {grade && (
            <span
              style={{
                height: 48,
                padding: '0 12px',
                borderRadius: 14,
                border: '1px solid rgba(249,247,242,0.25)',
                color: '#CFE1C9',
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                flex: 'none',
              }}
            >
              {grade}
            </span>
          )}
          <input
            id="tr-nick"
            className="tr-input"
            type="text"
            placeholder="プレイヤー"
            maxLength={12}
            value={nick}
            onChange={(e) => setNick(e.target.value)}
          />
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="tr-ghost" style={{ flex: 1 }} disabled={busy} onClick={() => onRetry(nick)}>
            {busy ? '準備中…' : 'もう一度'}
          </button>
          <button type="button" className="tr-cta" style={{ flex: 1.4, height: 50, fontSize: 14 }} disabled={busy} onClick={() => onBack(nick)}>
            ツリーへ
          </button>
        </div>
      </div>
    </div>
  );
}
