/**
 * ANCHOR TREE — 結果（設計書 §5.2 / モック Result.dc.html）。
 * 今回の加算（新規正解 +75・タイムボーナス更新の差分）・累積スコア・マスター度・間違えた問題（出題状況の前後は 2026-10-15 先生の指示で出さない）。
 * 間違えた問題は問題（画像）と自分の答えだけを見せ、正解は表示しない（2026-10-15 先生決定）。
 * ニックネームはここで入力し、離れるときに保存する（/tree/profile。NG ワードなら離れずに知らせる）。
 * 分野の順位の前後（Phase 4）・間違えた問題の報告（課題 #21）。ボタンで文章の入力欄を開き、問題画像と文章を先生の Google Chat に送る（2026-10-17）。
 * 2026-10-19 先生の指示: 間違えた問題にリード文も出す（設問の上）・スクショ（そのカードだけを画像に・PlayShot）・「質問・報告」→「改善要望」。
 * 2026-10-19 先生の要望: 出題中に「あとで復習」を付けた問題も結果に出す。間違いと見分けられるよう一覧を 2 つに分ける（同日 先生の指示）:
 * 「間違えた問題」（チェックも付けた問題は「チェック」の印）と「チェックした問題」（正解したがチェックを付けた問題・ラベンダー）。
 * 季節イベントの挑戦（result.event・ボード R05・2026-10-20）: ハロウィンの色（is-ev-halloween）・見出しは「HALLOWEEN · 科目 · 結果」・
 * 加算のカードの下に「EVENT MASTER 64% → 70%」の行と「定着 +4 題 · あと 6 日」・3 枚のタイルは科目の値（累積スコア・マスター度・順位）・
 * 左下のボタンは「イベントへ」（イベント画面に戻る）・出題状況はイベントの 70 題（2026-10-21 先生の指示・科目全体の問題数ではなく）
 */
import { useRef, useState, type RefObject } from 'react';
import type { Dist, FieldGroup, PartValue, PlayQuestion, SubmitResult, TreeManifest, TreeSession } from '../../lib/treeApi';
import { QTYPE_LABEL, circled, examLabel, gradeLabel, treeImage } from '../../lib/treeApi';
import { Ico } from './TreeIcons';
import { PlayShot, SHOT_SKIP } from './PlayShot';
import { CHECK_COLOR, REVIEW_COLOR, RETRO, T, alpha, fmtScore, fmtTime, groupColor, groupSide, rootClass } from './treeTheme';
import { Pips } from './NodeSheet';
import { EV_ASSET, EV_NAME, evPct } from './event/evTheme';

interface Props {
  result: SubmitResult;
  session: TreeSession;
  /** 出題中に「あとで復習」を付けた問題 ID */
  marked: string[];
  manifest: TreeManifest;
  grade: string;
  nickname: string;
  /** 自分のカニの種名（空欄で保存したときの名前）。無ければ「プレイヤー」 */
  crab: string | null;
  /** ニックネームを保存。だめならエラー文（NG ワード等）、良ければ null */
  onSaveNick: (nickname: string) => Promise<string | null>;
  onRetry: () => void;
  onBack: () => void;
  onRanking: () => void;
  onReport: (qid: string, message: string, label: string, img: string | null) => Promise<'sent' | 'already' | 'error'>;
  busy: boolean;
  /** 季節イベントの挑戦の結果: イベント画面へ（左下の「イベントへ」）*/
  onEvent?: () => void;
}

type ReportState = 'idle' | 'open' | 'sending' | 'sent' | 'already' | 'error';

const REPORT_MAX = 500;

/** 問題画像 1 枚（読み込み中・失敗の表示つき）*/
function PaperImg({ url, failed, alt }: { url: string | null; failed: boolean; alt: string }) {
  return url ? <img src={url} alt={alt} /> : <div className="tr-imgph">{failed ? '画像を読み込めませんでした' : '読み込み中…'}</div>;
}

function WrongItem({
  label,
  mine,
  wrong,
  checked,
  lead,
  body,
  layer,
  onReport,
}: {
  label: string;
  mine: string;
  /** 不正解か（チェックした問題の一覧の、正解した問題は false）*/
  wrong: boolean;
  /** 「あとで復習」を付けたか */
  checked: boolean;
  /** リード文の画像（無ければ null）*/
  lead: string | null;
  body: string | null;
  /** スクショのプレビューを出す先（結果画面のいちばん外側）*/
  layer: RefObject<HTMLElement>;
  onReport: (message: string) => Promise<'sent' | 'already' | 'error'>;
}) {
  const card = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [leadUrl, setLeadUrl] = useState<string | null>(null);
  const [leadFailed, setLeadFailed] = useState(false);
  const [report, setReport] = useState<ReportState>('idle');
  const [text, setText] = useState('');
  const toggle = () => {
    setOpen((v) => !v);
    if (!url && body) {
      setFailed(false);
      treeImage(body).then(setUrl).catch(() => setFailed(true));
    }
    if (!leadUrl && lead) {
      setLeadFailed(false);
      treeImage(lead).then(setLeadUrl).catch(() => setLeadFailed(true));
    }
  };
  const send = async () => {
    if (!text.trim() || report === 'sending') return;
    setReport('sending');
    setReport(await onReport(text.trim()));
  };
  const writing = report === 'open' || report === 'sending' || report === 'error';
  return (
    <div className="tr-wrong" ref={card}>
      <button type="button" className="tr-wrong-head" onClick={toggle} aria-expanded={open}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 12, color: 'var(--tr-sub)' }}>{label}</div>
          <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>
              あなたの答え <b className="tr-num" style={{ color: wrong ? REVIEW_COLOR : T.text }}>{mine}</b>
            </span>
            {wrong && checked && <span className="tr-checktag">チェック</span>}
          </div>
        </div>
        <span style={{ color: 'var(--tr-sub)', transform: open ? 'rotate(90deg)' : undefined, display: 'flex' }}>
          <Ico id="i-chev-right" size={16} />
        </span>
      </button>
      {open && (
        <>
          {lead && (
            <>
              <div className="tr-wrong-cap">リード文</div>
              <div className="tr-paper">
                <PaperImg url={leadUrl} failed={leadFailed} alt={`${label} リード文`} />
              </div>
              <div className="tr-wrong-cap">設問</div>
            </>
          )}
          <div className="tr-paper">
            <PaperImg url={url} failed={failed} alt={label} />
          </div>
          <div className={`tr-wrong-actions ${SHOT_SKIP}`} ref={actions}>
            <PlayShot target={card} layer={layer} cropAt={actions} className={`tr-report ${SHOT_SKIP}`}>
              スクショ
            </PlayShot>
            {report === 'idle' && (
              <button type="button" className="tr-report" onClick={() => setReport('open')}>
                <Ico id="i-flag" size={13} />
                この問題への改善要望
              </button>
            )}
          </div>
          {writing && (
            <div className={`tr-report-form ${SHOT_SKIP}`}>
              <textarea
                className="tr-report-text"
                value={text}
                maxLength={REPORT_MAX}
                rows={3}
                placeholder="おかしいと思うところ・直してほしいところを書いてください"
                onChange={(e) => setText(e.target.value)}
                disabled={report === 'sending'}
                autoFocus
              />
              {report === 'error' && <div className="tr-report-err">送れませんでした。もう一度送ってください</div>}
              <div className="tr-report-row">
                <span className="tr-num" style={{ fontSize: 11, color: 'var(--tr-sub)' }}>
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
            <div className={`tr-report is-sent ${SHOT_SKIP}`}>
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

/**
 * 間違えた問題の一覧（通常の結果画面・先生用のアリーナ結果画面で共通）。
 * 問題（リード文・設問の画像）と自分の答えだけ。正解は出さない（2026-10-15 先生決定）。
 */
export function WrongList({
  results,
  session,
  marked = [],
  layer,
  onReport,
}: {
  results: { qid: string; correct: boolean; value: PartValue[] }[];
  session: TreeSession;
  /** 「あとで復習」を付けた問題 ID（正解でも一覧に出す）*/
  marked?: string[];
  layer: RefObject<HTMLElement>;
  onReport: (qid: string, message: string, label: string, img: string | null) => Promise<'sent' | 'already' | 'error'>;
}) {
  const checked = new Set(marked);
  const wrong = results.filter((r) => !r.correct);
  /** 正解したがチェックを付けた問題（間違えてチェックした問題は「間違えた問題」の方に出す）*/
  const okChecked = results.filter((r) => r.correct && checked.has(r.qid));
  if (!wrong.length && !okChecked.length) return null;
  /** セットの問題はリード文がセット（出題の単位）の方にある */
  const leadOf = (qid: string, q: PlayQuestion | undefined) =>
    q?.img.lead ?? session.units.find((u) => u.qids.includes(qid))?.lead ?? null;
  const item = (r: (typeof results)[number]) => {
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
        wrong={!r.correct}
        checked={checked.has(r.qid)}
        lead={leadOf(r.qid, q)}
        body={q?.img.body ?? null}
        layer={layer}
        onReport={(message) => onReport(r.qid, message, label, q?.img.body ?? null)}
      />
    );
  };
  const head = (color: string, text: string) => (
    <div className="tr-wrong-title" style={{ fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
      {RETRO ? (
        // レトロ寄りの見た目（ボード R03）: 見出しの札 MISS / CHECK
        <span className="tr-arc tr-wrong-tag" style={{ background: color }}>
          {color === CHECK_COLOR ? 'CHECK' : 'MISS'}
        </span>
      ) : (
        <i style={{ width: 8, height: 8, borderRadius: 2, background: color, display: 'block' }} />
      )}
      {text}
    </div>
  );
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {wrong.length > 0 && head(REVIEW_COLOR, `間違えた問題 ${wrong.length} 問`)}
      {wrong.map(item)}
      {okChecked.length > 0 && (
        <div style={{ marginTop: wrong.length ? 10 : 0 }}>{head(CHECK_COLOR, `チェックした問題 ${okChecked.length} 問`)}</div>
      )}
      {okChecked.map(item)}
    </div>
  );
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

export function ResultScreen({ result, session, marked, manifest, grade, nickname, crab, onSaveNick, onRetry, onBack, onRanking, onReport, busy, onEvent }: Props) {
  const ev = result.event ?? null;
  const field = manifest.fields.find((f) => f.id === session.field);
  const group = (field?.group ?? 'basic') as FieldGroup;
  const col = groupColor(group);
  const side = groupSide(group);
  const [nick, setNick] = useState(nickname === 'プレイヤー' || nickname === crab ? '' : nickname);
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
  // 出題状況のカード: ふつうはその種別の問題・季節イベントはイベントの 70 題（ev.after・定着/正解済み/要復習/未着手）
  const distCard: { label: string; total: number; dist: Dist } | null = ev
    ? {
        label: 'イベント',
        total: ev.after.total,
        dist: { mastered: ev.after.settled, solved: ev.after.correct, review: ev.after.review, fresh: ev.after.untouched },
      }
    : after
      ? {
          label: QTYPE_LABEL[session.qtype] ?? manifest.name,
          total: after.total,
          dist: { ...after.dist, fresh: Math.max(0, after.total - after.dist.mastered - after.dist.solved - after.dist.review) },
        }
      : null;
  const mBefore = before ? Math.round(before.mastery * 100) : 0;
  const mAfter = after ? Math.round(after.mastery * 100) : 0;
  const keep = result.results.filter((r) => r.correct && !r.firstCorrect && r.bonusUp === 0).length;
  const unlockedNames = result.newlyUnlocked
    .map((id) => manifest.fields.find((f) => f.id === id))
    .filter((f) => f && f.total > 0)
    .map((f) => f!.name);
  const fs = result.fieldScore;
  const rootRef = useRef<HTMLDivElement>(null);

  return (
    <div className={rootClass('tr-result' + (ev ? ` is-ev-${ev.kind}` : ''))} ref={rootRef}>
      <div className="tr-result-head">
        {ev ? (
          <img src={EV_ASSET(ev.kind).icon2x} alt="" aria-hidden="true" style={{ width: 30, height: 30, flex: 'none', display: 'block', imageRendering: 'pixelated' }} />
        ) : (
        <div
          className="tr-result-tile"
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
            ['--tr-cf' as string]: col,
            ['--tr-cfl' as string]: `drop-shadow(3px 3px 0 ${side}) drop-shadow(0 0 6px ${alpha(col, 0.5)})`,
          }}
        >
          {field && <Ico id={field.icon} size={16} />}
        </div>
        )}
        <span style={{ flex: 1 }}>
          {ev ? (
            <>
              <b>{EV_NAME[ev.kind] ?? ev.name}</b> · {manifest.name} · 結果
            </>
          ) : session.field === '_event' ? (
            // イベントの挑戦なのに event が返らなかった（古い Proxy など）: 「_event › undefined」と出さない
            <>
              <b>イベント</b> · {manifest.name} · 結果
            </>
          ) : (
            <>
              {field?.name ?? session.field} › <b>{QTYPE_LABEL[session.qtype]}</b> · 結果
            </>
          )}
        </span>
        <button type="button" className="tr-iconbtn" aria-label="ツリーへ戻る" disabled={saving} onClick={() => void leave(onBack)}>
          <Ico id={RETRO ? 'i-px-close' : 'i-close'} size={RETRO ? 14 : 16} />
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

        {RETRO ? (
          // レトロ寄りの見た目（ボード R03）: 主色の枠 ＋ 押し出し ＋ 走査線・「+256」のクローム・内訳はチップ（数字は Press Start 2P）
          <div className="tr-card tr-hero is-retro">
            <div className="tr-hero-top">
              <span>今回の加算</span>
              <span className="tr-arc">SCORE</span>
            </div>
            <div className="tr-hero-line">
              <span className="tr-arc tr-chr tr-hero-big">+{fmtScore(summary.gain)}</span>
              <span className="tr-arc tr-hero-max">/{summary.total * 100}</span>
            </div>
            {(summary.newCorrect > 0 || summary.bonusPoints > 0 || keep > 0) && (
              <div className="tr-hero-chips">
                {summary.newCorrect > 0 && (
                  <span className="tr-pill">
                    新規正解 {summary.newCorrect} 問<span className="tr-arc">+{fmtScore(summary.newCorrectPoints)}</span>
                  </span>
                )}
                {summary.bonusPoints > 0 && (
                  <span className="tr-pill">
                    タイムボーナス<span className="tr-arc">+{fmtScore(summary.bonusPoints)}</span>
                  </span>
                )}
                {keep > 0 && (
                  <span className="tr-pill is-zero">
                    正解済み {keep} 問<span className="tr-arc">±0</span>
                  </span>
                )}
              </div>
            )}
            <div className="tr-hero-sub">
              <span>
                正答 <b className="tr-arc">{summary.correct}/{summary.total}</b>
              </span>
              <span>
                時間 <b className="tr-arc">{fmtTime(summary.elapsedMs)}</b>
              </span>
            </div>
          </div>
        ) : (
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
        )}

        {ev && <EventMasterRow ev={ev} />}

        {RETRO ? (
          // ボード R03: 3 枚のタイル = 前の値（小）→ 後の値（大）。順位が上がったら主色 ＋ ドットの ▲
          <div className="tr-stat3 is-retro">
            <div className="tr-stat">
              <div>{ev ? '累積スコア' : '分野スコア'}</div>
              <div className="tr-stat-from">
                <span className="tr-arc">{fmtScore((fs.before?.score ?? Math.max(0, (fs.after?.score ?? 0) - summary.gain)))}</span>
                <span className="tr-arc">→</span>
              </div>
              <div className="tr-stat-to">
                <span className="tr-arc">{fmtScore(fs.after?.score ?? 0)}</span>
              </div>
            </div>
            <div className="tr-stat">
              <div>マスター度</div>
              <div className="tr-stat-from">
                <span className="tr-arc">{mBefore}%</span>
                <span className="tr-arc">→</span>
              </div>
              <div className={`tr-stat-to${mAfter > mBefore ? ' is-up' : mAfter < mBefore ? ' is-down' : ''}`}>
                <span className="tr-arc">{mAfter}%</span>
              </div>
            </div>
            {rank ? (
              <button type="button" className="tr-stat" onClick={() => void leave(onRanking)} aria-label="ランキングを見る">
                <div>{ev ? '順位' : '分野の順位'}</div>
                <div className="tr-stat-from">
                  {rank.before.rank != null ? (
                    <>
                      <span className="tr-arc">{rank.before.rank}</span>位
                    </>
                  ) : (
                    '—'
                  )}
                  <span className="tr-arc">→</span>
                </div>
                <div className={`tr-stat-to${rankUp(rank.before.rank, rank.after.rank) ? ' is-up' : ''}`}>
                  {rank.after.rank != null ? (
                    <>
                      <span className="tr-arc">{rank.after.rank}</span>
                      <span>位</span>
                      {rankUp(rank.before.rank, rank.after.rank) && <Ico id="i-px-up" size={10} />}
                    </>
                  ) : (
                    <span>—</span>
                  )}
                </div>
                <div className="tr-stat-note">{rank.after.rank == null ? '1 問正解で掲載' : rank.before.rank == null ? `初ランクイン · ${rank.after.of} 人中` : `${rank.after.of} 人中`}</div>
              </button>
            ) : (
              <div className="tr-stat">
                <div>この分野の正答率</div>
                <div className="tr-stat-from">{play ? <>挑戦 <span className="tr-arc">{play.count}</span> 回</> : ''}</div>
                <div className="tr-stat-to">
                  <span className="tr-arc">{play ? `${Math.round(play.rate)}%` : '—'}</span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="tr-stat3">
            <div className="tr-stat">
              <div>{ev ? '累積スコア' : '分野スコア'}</div>
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
                <div>{ev ? '順位' : '分野の順位'}</div>
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
        )}
        {play && (
          <div className="tr-note" style={{ textAlign: 'right' }}>
            この分野 挑戦 <b className="tr-num" style={{ color: T.text }}>{play.count}</b> 回 · 正答率{' '}
            <b className="tr-num" style={{ color: T.text }}>{Math.round(play.rate)}%</b>（次の分野の解放: {unlockPlays} 回以上・
            {manifest.unlockPct}% 以上）
          </div>
        )}

        {RETRO && distCard && (
          // ボード R03: 出題状況（R02 と同じ 20 マス・要復習は中空の枠）。季節イベントはイベントの 70 題
          <div className="tr-panel tr-dist-card">
            <div className="tr-dist-title">
              出題状況（{distCard.label} <span className="tr-arc">{distCard.total}</span> {ev ? '題' : '問'}）
            </div>
            <Pips dist={distCard.dist} total={distCard.total} color={ev ? '#FF9A1F' : T.accent} />
            <div className="tr-dist-legend">
              <span><i className="is-mastered" />定着 <b className="tr-arc">{distCard.dist.mastered}</b></span>
              <span><i className="is-solved" />正解済み <b className="tr-arc">{distCard.dist.solved}</b></span>
              <span><i className="is-review" />要復習 <b className="tr-arc">{distCard.dist.review}</b></span>
              <span><i className="is-fresh" />未着手 <b className="tr-arc">{distCard.dist.fresh}</b></span>
            </div>
          </div>
        )}

        <WrongList results={result.results} session={session} marked={marked} layer={rootRef} onReport={onReport} />
      </div>

      <div className="tr-foot">
        <label htmlFor="tr-nick" style={{ fontSize: 12, color: T.sub }}>
          ランキングに表示するニックネーム（空欄なら「{crab || 'プレイヤー'}」）
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {grade && (
            <span
              className="tr-gradebox"
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
          <div role="alert" style={{ fontSize: 12, color: REVIEW_COLOR }}>
            {nickError}
          </div>
        )}
        <div className="tr-foot-btns" style={{ display: 'flex', gap: 8 }}>
          {ev && onEvent ? (
            // ボード R05: 左下は「イベントへ」（イベント画面に戻る）
            <button type="button" className="tr-ghost" style={{ flex: 1 }} disabled={saving} onClick={() => void leave(onEvent)}>
              イベントへ
            </button>
          ) : (
            RETRO && (
              // ボード R03: ツリーへ / もう一度（副）・ランキング（主）
              <button type="button" className="tr-ghost" style={{ flex: 1 }} disabled={saving} onClick={() => void leave(onBack)}>
                ツリーへ
              </button>
            )
          )}
          <button type="button" className="tr-ghost" style={{ flex: 1 }} disabled={busy || saving} onClick={() => void leave(onRetry)}>
            {busy ? '準備中…' : 'もう一度'}
          </button>
          <button type="button" className="tr-cta" style={{ flex: 1.4, height: 50, fontSize: 14 }} disabled={busy || saving} onClick={() => void leave(onRanking)}>
            {RETRO ? 'ランキング' : 'ランキングを見る'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 季節イベントの挑戦の結果: 「EVENT MASTER 64% → 70%」（後の % はクローム・バーは前の分を主色・増えた分を淡い色）と「定着 +4 題 · あと 6 日」*/
function EventMasterRow({ ev }: { ev: NonNullable<SubmitResult['event']> }) {
  const b = ev.cleared && !ev.clearedNow ? 100 : evPct(ev.before.mastery);
  const a = ev.cleared ? 100 : evPct(ev.after.mastery);
  return (
    <div className="tr-ev-master" role="group" aria-label={`EVENT MASTER ${b}% から ${a}%`}>
      <div className="tr-ev-master-top">
        <span className="tr-arc">EVENT MASTER</span>
        <span>
          {b === a ? (
            <b className="tr-arc tr-chr">{a}%</b>
          ) : (
            <>
              <span className="tr-arc">{b}%</span> → <b className="tr-arc tr-chr">{a}%</b>
            </>
          )}
        </span>
      </div>
      <div className="tr-ev-master-bar" aria-hidden="true">
        <i className="is-before" style={{ width: `${Math.min(b, a)}%` }} />
        <i className="is-gain" style={{ width: `${Math.max(0, a - b)}%` }} />
      </div>
      <div className="tr-ev-master-note">
        {ev.clearedNow ? (
          <>MASTER 100% 達成 · テストを受けられます</>
        ) : !ev.recorded ? (
          <>{ev.cleared ? '復習（マスター度は下がりません）' : 'イベントの期間の後の提出（ふだんの記録には入りました）'}</>
        ) : (
          <>
            定着 <span className="tr-arc">{ev.settledGain >= 0 ? `+${ev.settledGain}` : ev.settledGain}</span> 題 · あと <span className="tr-arc">{ev.daysLeft}</span> 日
          </>
        )}
      </div>
    </div>
  );
}
