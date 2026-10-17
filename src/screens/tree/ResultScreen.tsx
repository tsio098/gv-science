/**
 * ANCHOR TREE — 結果（設計書 §5.2 / モック Result.dc.html）。
 * 今回の加算（新規正解 +75・タイムボーナス更新の差分）・累積スコア・マスター度・間違えた問題（出題状況の前後は 2026-10-15 先生の指示で出さない）。
 * 間違えた問題は問題（画像）と自分の答えだけを見せ、正解は表示しない（2026-10-15 先生決定）。
 * ニックネームはここで入力し、離れるときに保存する（/tree/profile。NG ワードなら離れずに知らせる）。
 * 分野の順位の前後（Phase 4）・間違えた問題の報告（課題 #21）。ボタンで文章の入力欄を開き、問題画像と文章を先生の Google Chat に送る（2026-10-17）。
 */
import { useState } from 'react';
import type { FieldGroup, PartValue, PlayQuestion, SubmitResult, TreeManifest, TreeSession } from '../../lib/treeApi';
import { QTYPE_LABEL, circled, examLabel, gradeLabel, treeImage } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { REVIEW_COLOR, T, alpha, fmtScore, fmtTime, groupColor, groupSide, rootClass } from './treeTheme';

interface Props {
  result: SubmitResult;
  session: TreeSession;
  manifest: TreeManifest;
  grade: string;
  nickname: string;
  /** ニックネームを保存。だめならエラー文（NG ワード等）、良ければ null */
  onSaveNick: (nickname: string) => Promise<string | null>;
  onRetry: () => void;
  onBack: () => void;
  onRanking: () => void;
  onReport: (qid: string, message: string, label: string, img: string | null) => Promise<'sent' | 'already' | 'error'>;
  busy: boolean;
}

type ReportState = 'idle' | 'open' | 'sending' | 'sent' | 'already' | 'error';

const REPORT_MAX = 500;

function WrongItem({
  label,
  mine,
  body,
  onReport,
}: {
  label: string;
  mine: string;
  body: string | null;
  onReport: (message: string) => Promise<'sent' | 'already' | 'error'>;
}) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [report, setReport] = useState<ReportState>('idle');
  const [text, setText] = useState('');
  const toggle = () => {
    setOpen((v) => !v);
    if (!url && body) {
      setFailed(false);
      treeImage(body).then(setUrl).catch(() => setFailed(true));
    }
  };
  const send = async () => {
    if (!text.trim() || report === 'sending') return;
    setReport('sending');
    setReport(await onReport(text.trim()));
  };
  const writing = report === 'open' || report === 'sending' || report === 'error';
  return (
    <div className="tr-wrong">
      <button type="button" className="tr-wrong-head" onClick={toggle} aria-expanded={open}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 12, color: T.sub }}>{label}</div>
          <div style={{ fontSize: 13 }}>
            あなたの答え <b className="tr-num" style={{ color: REVIEW_COLOR }}>{mine}</b>
          </div>
        </div>
        <span style={{ color: T.sub, transform: open ? 'rotate(90deg)' : undefined, display: 'flex' }}>
          <Ico id="i-chev-right" size={16} />
        </span>
      </button>
      {open && (
        <>
          <div className="tr-paper">
            {url ? <img src={url} alt={label} /> : <div className="tr-imgph">{failed ? '画像を読み込めませんでした' : '読み込み中…'}</div>}
          </div>
          {report === 'idle' && (
            <button type="button" className="tr-report" onClick={() => setReport('open')}>
              <Ico id="i-flag" size={13} />
              この問題について先生に質問・報告
            </button>
          )}
          {writing && (
            <div className="tr-report-form">
              <textarea
                className="tr-report-text"
                value={text}
                maxLength={REPORT_MAX}
                rows={3}
                placeholder="聞きたいこと・おかしいと思うところを書いてください"
                onChange={(e) => setText(e.target.value)}
                disabled={report === 'sending'}
                autoFocus
              />
              {report === 'error' && <div className="tr-report-err">送れませんでした。もう一度送ってください</div>}
              <div className="tr-report-row">
                <span className="tr-num" style={{ fontSize: 11, color: T.sub }}>
                  {text.length}/{REPORT_MAX}
                </span>
                <button type="button" className="tr-report-cancel" onClick={() => setReport('idle')} disabled={report === 'sending'}>
                  やめる
                </button>
                <button type="button" className="tr-report-send" onClick={send} disabled={!text.trim() || report === 'sending'}>
                  {report === 'sending' ? '送信中…' : '先生に送る'}
                </button>
              </div>
            </div>
          )}
          {(report === 'sent' || report === 'already') && (
            <div className="tr-report is-sent">
              <Ico id="i-flag" size={13} />
              {report === 'sent' ? '送りました。先生が確認します' : 'この問題は送信済みです'}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/** 自分の答えの表示: ROUTE は ①・③、ABYSS は欄ごと（「共有結合 / イ / 4.00e-2」）*/
function mineLabel(q: PlayQuestion | undefined, value: PartValue[]) {
  if (!value.length || value.every((v) => (Array.isArray(v) ? !v.length : !String(v).trim()))) return '未回答';
  if (q && q.answer.kind === 'parts') {
    return value
      .map((v) => (Array.isArray(v) ? v.join('・') : String(v).replace(/e(-?\d+)$/, ' × 10^$1')) || '—')
      .join(' / ');
  }
  return value.map((v) => circled(String(v))).join('・');
}

const rankUp = (b: number | null, a: number | null) => a != null && (b == null || a < b);
/** 「12位 → ▲3」「初ランクイン · 38 人中」「変わらず」*/
function rankDelta(b: number | null, a: number | null, of: number) {
  if (a == null) return '1 問正解で掲載';
  if (b == null) return `初ランクイン · ${of} 人中`;
  if (a < b) return `${b}位 → ▲${b - a}`;
  if (a > b) return `${b}位 → ▼${a - b}`;
  return `${of} 人中`;
}

export function ResultScreen({ result, session, manifest, grade, nickname, onSaveNick, onRetry, onBack, onRanking, onReport, busy }: Props) {
  const field = manifest.fields.find((f) => f.id === session.field);
  const group = (field?.group ?? 'basic') as FieldGroup;
  const col = groupColor(group);
  const side = groupSide(group);
  const [nick, setNick] = useState(nickname === 'プレイヤー' ? '' : nickname);
  const [nickError, setNickError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** ニックネームを保存してから離れる（NG ならここに留まって知らせる）*/
  const leave = async (go: () => void) => {
    setSaving(true);
    const err = await onSaveNick(nick);
    setSaving(false);
    if (err) setNickError(err);
    else go();
  };
  const rank = result.rank;
  const play = result.fieldScore.after?.play;
  const unlockPlays = (manifest as { unlockPlays?: number }).unlockPlays ?? 5;
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
    <div className={rootClass('tr-result')}>
      <div className="tr-result-head">
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: col,
            color: T.onColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `3px 3px 0 0 ${side}`,
          }}
        >
          {field && <Ico id={field.icon} size={16} />}
        </div>
        <span style={{ flex: 1 }}>
          {field?.name ?? session.field} › <b>{QTYPE_LABEL[session.qtype]}</b> · 結果
        </span>
        <button type="button" className="tr-iconbtn" aria-label="ツリーへ戻る" disabled={saving} onClick={() => void leave(onBack)}>
          <Ico id="i-close" size={16} />
        </button>
      </div>

      <div className="tr-result-body">
        {unlockedNames.length > 0 && (
          <div className="tr-alert" style={{ borderColor: alpha(T.accent, 0.6), color: T.accent }}>
            <Ico id="i-lock" size={18} />
            <span>
              <b>{unlockedNames.join('・')}</b> が解放されました
            </span>
          </div>
        )}

        <div className="tr-card tr-hero" style={{ boxShadow: `6px 6px 0 0 ${col}, 0 0 20px ${alpha(T.accent, 0.14)}` }}>
          <div style={{ fontSize: 12, color: T.sub }}>今回の加算</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span className="tr-num tr-hero-num">+{fmtScore(summary.gain)}</span>
            <span style={{ fontSize: 13, color: T.sub }}>/ {summary.total * 100}</span>
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
            {summary.newCorrect > 0 && (
              <span className="tr-pill tr-num" style={{ background: alpha(T.accent, 0.18), color: T.accent }}>
                新規正解 {summary.newCorrect} 問 +{fmtScore(summary.newCorrectPoints)}
              </span>
            )}
            {summary.bonusPoints > 0 && (
              <span className="tr-pill tr-num" style={{ background: alpha(T.accent, 0.18), color: T.accent }}>
                タイムボーナス +{fmtScore(summary.bonusPoints)}
              </span>
            )}
            {keep > 0 && (
              <span className="tr-pill tr-num" style={{ border: `1px solid ${alpha(T.text, 0.25)}`, color: T.sub, fontWeight: 500 }}>
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
            <div className="tr-num" style={{ color: mAfter >= mBefore ? T.accent : REVIEW_COLOR }}>
              {mBefore}% → {mAfter >= mBefore ? '▲' : '▼'}
              {Math.abs(mAfter - mBefore)}
            </div>
          </div>
          {rank ? (
            <button type="button" className="tr-stat" onClick={() => void leave(onRanking)} aria-label="ランキングを見る">
              <div>分野の順位</div>
              <div className="tr-num">{rank.after.rank != null ? `${rank.after.rank}位` : '—'}</div>
              <div className="tr-num" style={{ color: rankUp(rank.before.rank, rank.after.rank) ? T.accent : T.sub, fontWeight: rankUp(rank.before.rank, rank.after.rank) ? 700 : 500 }}>
                {rankDelta(rank.before.rank, rank.after.rank, rank.after.of)}
              </div>
            </button>
          ) : (
            <div className="tr-stat">
              <div>この分野の正答率</div>
              <div className="tr-num">{play ? `${Math.round(play.rate)}%` : '—'}</div>
              <div className="tr-num" style={{ color: T.sub, fontWeight: 500 }}>
                {play ? `挑戦 ${play.count} 回` : ''}
              </div>
            </div>
          )}
        </div>
        {play && (
          <div className="tr-note" style={{ textAlign: 'right' }}>
            この分野 挑戦 <b className="tr-num" style={{ color: T.text }}>{play.count}</b> 回 · 正答率{' '}
            <b className="tr-num" style={{ color: T.text }}>{Math.round(play.rate)}%</b>（次の分野の解放: {unlockPlays} 回以上・
            {manifest.unlockPct}% 以上）
          </div>
        )}

        {wrong.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              <i style={{ width: 8, height: 8, borderRadius: 2, background: REVIEW_COLOR, display: 'block' }} />
              間違えた問題 {wrong.length} 問
            </div>
            {wrong.map((r) => {
              const q = session.questions[r.qid];
              const label = !q
                ? r.qid
                : q.answer.kind === 'parts'
                  ? `${examLabel(q.source.exam)} · ${q.label ?? ''}`
                  : `${q.source.kind === 'basic' ? '基本 · ' : ''}${examLabel(q.source.exam)} · 解答番号 ${q.answer.boxes.map((b) => b.n).join('・')}`;
              return (
                <WrongItem
                  key={r.qid}
                  label={label}
                  mine={mineLabel(q, r.value)}
                  body={q?.img.body ?? null}
                  onReport={(message) => onReport(r.qid, message, label, q?.img.body ?? null)}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="tr-foot">
        <label htmlFor="tr-nick" style={{ fontSize: 12, color: T.sub }}>
          ランキングに表示するニックネーム（空欄なら「プレイヤー」）
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {grade && (
            <span
              style={{
                height: 48,
                padding: '0 12px',
                borderRadius: 14,
                border: `1px solid ${alpha(T.text, 0.25)}`,
                color: T.accent,
                fontSize: 13,
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                flex: 'none',
              }}
            >
              {gradeLabel(grade)}
            </span>
          )}
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
          <button type="button" className="tr-ghost" style={{ flex: 1 }} disabled={busy || saving} onClick={() => void leave(onRetry)}>
            {busy ? '準備中…' : 'もう一度'}
          </button>
          <button type="button" className="tr-cta" style={{ flex: 1.4, height: 50, fontSize: 14 }} disabled={busy || saving} onClick={() => void leave(onRanking)}>
            ランキングを見る
          </button>
        </div>
      </div>
    </div>
  );
}
