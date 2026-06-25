/**
 * 志望校調査を依頼 — 入力フォーム。
 *  入力: 希望地域(都道府県+希望なし, 複数) / 大学でやりたいこと / 入試形式(複数) / 補足
 *  希望地域・入試形式はプルダウンで選び、選択をタグで積む（×で外せる・複数可）。
 *  送信: callGas('requestShibou', {region, want, examType, note})
 *  ※ USERID は id_token から GAS 側で確定。氏名はクライアントに出さない・保存しない。
 */
import { useState } from 'react';
import { requestShibou } from '../lib/api';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';

interface Props {
  nav: NavFn;
}

/** 地方ブロック → 都道府県（全47） */
const REGION_GROUPS: { region: string; prefs: string[] }[] = [
  { region: '北海道・東北', prefs: ['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島'] },
  { region: '関東', prefs: ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'] },
  { region: '中部', prefs: ['新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知'] },
  { region: '近畿', prefs: ['三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'] },
  { region: '中国', prefs: ['鳥取', '島根', '岡山', '広島', '山口'] },
  { region: '四国', prefs: ['徳島', '香川', '愛媛', '高知'] },
  { region: '九州・沖縄', prefs: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'] },
];

const EXAM_TYPES = [
  '総合型選抜',
  '学校推薦型選抜',
  '一般選抜（前期）',
  '一般選抜（後期）',
  '共通テスト利用',
  'まだ決めていない',
];

const NO_PREF = '希望なし（どこでもよい）';

type Phase = 'edit' | 'submitting' | 'done' | 'error';

/** 選択済みタグ（×で削除） */
function SelectedTags({ items, onRemove }: { items: string[]; onRemove: (v: string) => void }) {
  if (items.length === 0) return null;
  return (
    <div style={S.tagWrap}>
      {items.map((v) => (
        <span key={v} style={S.tag}>
          {v}
          <button type="button" style={S.tagX} aria-label={`${v} を外す`} onClick={() => onRemove(v)}>
            ×
          </button>
        </span>
      ))}
    </div>
  );
}

export function ShibouRequestScreen({ nav }: Props) {
  const [prefs, setPrefs] = useState<string[]>([]);
  const [noPref, setNoPref] = useState(false);
  const [want, setWant] = useState('');
  const [exams, setExams] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [phase, setPhase] = useState<Phase>('edit');
  const [errMsg, setErrMsg] = useState('');

  // 希望地域：プルダウンで追加
  const addRegion = (v: string) => {
    if (!v) return;
    if (v === NO_PREF) {
      setNoPref(true);
      setPrefs([]);
      return;
    }
    setNoPref(false);
    setPrefs((p) => (p.includes(v) ? p : [...p, v]));
  };
  const removeRegion = (v: string) => {
    if (v === NO_PREF) { setNoPref(false); return; }
    setPrefs((p) => p.filter((x) => x !== v));
  };

  // 入試形式：プルダウンで追加
  const addExam = (v: string) => {
    if (!v) return;
    setExams((e) => (e.includes(v) ? e : [...e, v]));
  };
  const removeExam = (v: string) => setExams((e) => e.filter((x) => x !== v));

  const regionSelected = noPref ? [NO_PREF] : prefs;
  const regionStr = noPref ? '希望なし' : prefs.join('、');
  const examStr = exams.join('、');
  const canSubmit =
    phase !== 'submitting' &&
    (noPref || prefs.length > 0 || want.trim() !== '' || exams.length > 0 || note.trim() !== '');

  const submit = async () => {
    if (!canSubmit) return;
    setPhase('submitting');
    setErrMsg('');
    try {
      await requestShibou({
        region: regionStr,
        want: want.trim(),
        examType: examStr,
        note: note.trim(),
      });
      setPhase('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  // 送信完了画面
  if (phase === 'done') {
    return (
      <div className="app">
        <div className="safe-top" />
        <TopNav crumb="GV / 志望校調査" onBack={() => nav('home')} backLabel="ホーム" />
        <div className="app-scroll">
          <div style={S.doneWrap}>
            <div style={S.doneCheck}>✓</div>
            <div style={S.doneTitle}>依頼を受け付けました</div>
            <p style={S.doneSub}>
              先生がAIと一緒におすすめの志望校を調べます。準備ができたら「おすすめ志望校」に表示されます（少し時間がかかります）。
            </p>
            <button type="button" style={S.primaryBtn} onClick={() => nav('home')}>
              ホームに戻る
            </button>
          </div>
          <div className="empty-pad-bottom" />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="safe-top" />
      <TopNav crumb="GV / 志望校調査" onBack={() => nav('back')} backLabel="ホーム" />
      <div className="app-scroll">
        <div style={S.formPad}>
        <div className="page-head" style={S.headFlush}>
          <div className="page-eyebrow">SHIBOU · 志望校調査</div>
          <h1 className="page-title">志望校調査を依頼</h1>
          <p className="page-sub">
            やりたいこと・希望条件を教えてください。あなたの成績と合わせて、研究内容を最優先におすすめの大学を調べます。
          </p>
        </div>

        {/* 希望地域 */}
        <section style={S.section}>
          <div style={S.label}>希望地域<span style={S.opt}>（複数選択可）</span></div>
          <select
            style={S.select}
            value=""
            onChange={(e) => { addRegion(e.target.value); e.currentTarget.selectedIndex = 0; }}
          >
            <option value="">＋ 地域を追加…</option>
            <option value={NO_PREF}>{NO_PREF}</option>
            {REGION_GROUPS.map((g) => (
              <optgroup key={g.region} label={g.region}>
                {g.prefs
                  .filter((p) => !prefs.includes(p))
                  .map((p) => <option key={p} value={p}>{p}</option>)}
              </optgroup>
            ))}
          </select>
          <SelectedTags items={regionSelected} onRemove={removeRegion} />
        </section>

        {/* やりたいこと */}
        <section style={S.section}>
          <div style={S.label}>大学でやりたいこと・興味のある分野</div>
          <textarea
            style={S.textarea}
            rows={4}
            value={want}
            onChange={(e) => setWant(e.target.value)}
            placeholder="例：脳や神経の仕組みを研究したい／再生医療に興味がある／英語を活かせる学部がいい"
          />
        </section>

        {/* 入試形式 */}
        <section style={S.section}>
          <div style={S.label}>希望する入試形式<span style={S.opt}>（複数選択可）</span></div>
          <select
            style={S.select}
            value=""
            onChange={(e) => { addExam(e.target.value); e.currentTarget.selectedIndex = 0; }}
          >
            <option value="">＋ 入試形式を追加…</option>
            {EXAM_TYPES.filter((v) => !exams.includes(v)).map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
          <SelectedTags items={exams} onRemove={removeExam} />
        </section>

        {/* 補足 */}
        <section style={S.section}>
          <div style={S.label}>補足・こだわり条件<span style={S.opt}>（任意）</span></div>
          <textarea
            style={S.textarea}
            rows={3}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例：理科の配点が高い大学がいい／面接がない大学がいい／自宅から通えるところ"
          />
        </section>

        {phase === 'error' && (
          <div style={S.errBox}>
            送信に失敗しました。通信環境を確認してもう一度お試しください。
            <div style={S.errDetail}>{errMsg}</div>
          </div>
        )}

        <button type="button" style={canSubmit ? S.primaryBtn : S.primaryBtnDisabled} disabled={!canSubmit} onClick={submit}>
          {phase === 'submitting' ? '送信中…' : 'この内容で依頼する'}
        </button>
        </div>

        <div className="empty-pad-bottom" />
      </div>
    </div>
  );
}

/* ── スタイル（既存デザインに馴染む最小インライン。トークンが無くても崩れないよう自己完結） ── */
const S: Record<string, React.CSSProperties> = {
  // 左右にゆとり：標準ガター(--pad-x)＋α でフォーム全体をくくる
  formPad: { paddingLeft: 'calc(var(--pad-x) + 6px)', paddingRight: 'calc(var(--pad-x) + 6px)' },
  headFlush: { paddingLeft: 0, paddingRight: 0 },
  section: { marginTop: 22 },
  label: { fontSize: 14.5, fontWeight: 700, color: 'var(--c-text, #2c2c2c)', marginBottom: 8 },
  opt: { fontSize: 12, fontWeight: 400, color: 'var(--c-text-mute, #8a8a82)', marginLeft: 6 },
  select: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '11px 12px',
    borderRadius: 12,
    border: '1px solid var(--c-line, #d9d9d2)',
    background: 'var(--c-surface, #fff)',
    color: 'var(--c-text, #2c2c2c)',
    fontSize: 14.5,
    fontFamily: 'inherit',
    appearance: 'none',
    WebkitAppearance: 'none',
  },
  tagWrap: { display: 'flex', flexWrap: 'wrap', marginTop: 8 },
  tag: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 6px 6px 12px',
    margin: '0 6px 6px 0',
    borderRadius: 999,
    background: 'var(--c-primary, #4e9b73)',
    color: '#fff',
    fontSize: 13.5,
    fontWeight: 600,
  },
  tagX: {
    border: 'none',
    background: 'rgba(255,255,255,0.25)',
    color: '#fff',
    width: 18,
    height: 18,
    lineHeight: '16px',
    borderRadius: 999,
    fontSize: 14,
    cursor: 'pointer',
    padding: 0,
  },
  textarea: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid var(--c-line, #d9d9d2)',
    background: 'var(--c-surface, #fff)',
    color: 'var(--c-text, #2c2c2c)',
    fontSize: 14.5,
    lineHeight: 1.6,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  primaryBtn: {
    width: '100%',
    marginTop: 24,
    padding: '14px 16px',
    borderRadius: 14,
    border: 'none',
    background: 'var(--c-primary, #4e9b73)',
    color: '#fff',
    fontSize: 15.5,
    fontWeight: 700,
    cursor: 'pointer',
  },
  primaryBtnDisabled: {
    width: '100%',
    marginTop: 24,
    padding: '14px 16px',
    borderRadius: 14,
    border: 'none',
    background: 'var(--c-line, #d9d9d2)',
    color: 'var(--c-text-mute, #8a8a82)',
    fontSize: 15.5,
    fontWeight: 700,
    cursor: 'not-allowed',
  },
  errBox: {
    marginTop: 20,
    padding: '12px 14px',
    borderRadius: 12,
    background: 'rgba(200,60,60,0.08)',
    border: '1px solid rgba(200,60,60,0.3)',
    color: '#a13030',
    fontSize: 13.5,
  },
  errDetail: { fontSize: 11, opacity: 0.7, marginTop: 4, wordBreak: 'break-all' },
  doneWrap: { textAlign: 'center', padding: '48px 24px 24px' },
  doneCheck: {
    width: 64, height: 64, lineHeight: '64px', borderRadius: 999, margin: '0 auto 16px',
    background: 'var(--c-primary, #4e9b73)', color: '#fff', fontSize: 32, fontWeight: 700,
  },
  doneTitle: { fontSize: 18, fontWeight: 700, color: 'var(--c-text, #2c2c2c)' },
  doneSub: { fontSize: 14, lineHeight: 1.7, color: 'var(--c-text-mute, #8a8a82)', marginTop: 10, marginBottom: 24 },
};
