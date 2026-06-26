/**
 * 志望校調査を依頼 — 入力フォーム。
 *  入力: 希望地域(都道府県+希望なし, 複数) / 大学でやりたいこと / 入試形式(複数) / 補足
 *  希望地域・入試形式は「開いたまま複数選択できるパネル式」プルダウン（チェックして閉じない）。
 *  送信: callGas('requestShibou', {region, want, examType, note})
 *  ※ USERID は id_token から GAS 側で確定。氏名はクライアントに出さない・保存しない。
 */
import { useEffect, useState } from 'react';
import { requestShibou } from '../lib/api';
import type { NavFn } from '../lib/types';
import { TopNav } from '../components/TopNav';
import { BUNDLED_TAGS, loadTagSets, type TagGroup, type TagSets } from '../lib/tags';

interface Props {
  nav: NavFn;
}

const REGION_GROUPS: { region: string; prefs: string[] }[] = [
  { region: '北海道・東北', prefs: ['北海道', '青森', '岩手', '宮城', '秋田', '山形', '福島'] },
  { region: '関東', prefs: ['茨城', '栃木', '群馬', '埼玉', '千葉', '東京', '神奈川'] },
  { region: '中部', prefs: ['新潟', '富山', '石川', '福井', '山梨', '長野', '岐阜', '静岡', '愛知'] },
  { region: '近畿', prefs: ['三重', '滋賀', '京都', '大阪', '兵庫', '奈良', '和歌山'] },
  { region: '中国', prefs: ['鳥取', '島根', '岡山', '広島', '山口'] },
  { region: '四国', prefs: ['徳島', '香川', '愛媛', '高知'] },
  { region: '九州・沖縄', prefs: ['福岡', '佐賀', '長崎', '熊本', '大分', '宮崎', '鹿児島', '沖縄'] },
];

const EXAM_TYPES = ['総合型選抜', '学校推薦型選抜', '一般選抜（前期）', '一般選抜（後期）', '共通テスト利用', 'まだ決めていない'];
const NO_PREF = '希望なし（どこでもよい）';

type Phase = 'edit' | 'submitting' | 'done' | 'error';

/** チェック行（タップで選択トグル・パネルは閉じない） */
function OptRow({ label, checked, onToggle }: { label: string; checked: boolean; onToggle: () => void }) {
  return (
    <button type="button" style={S.optRow} onClick={onToggle} aria-pressed={checked}>
      <span style={{ ...S.checkbox, ...(checked ? S.checkboxOn : null) }}>{checked ? '✓' : ''}</span>
      <span style={checked ? S.optLabelOn : S.optLabel}>{label}</span>
    </button>
  );
}

/** タグ群（見出し＋タグの2列グリッド）をパネル内に描画 */
function TagGroups({ groups, selected, onToggle }: { groups: TagGroup[]; selected: string[]; onToggle: (t: string) => void }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.name}>
          <div style={S.groupName}>{g.name}</div>
          <div style={S.prefGrid}>
            {g.tags.map((t) => (
              <div key={t} style={S.prefCell}>
                <OptRow label={t} checked={selected.includes(t)} onToggle={() => onToggle(t)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

/** タイトル横の「タグから選ぶ」トグル */
function TagToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button type="button" style={S.tagToggle} onClick={onToggle}>
      タグから選ぶ <span style={S.tagCaret}>{open ? '▲' : '▼'}</span>
    </button>
  );
}

/** 開いたまま複数選択できるプルダウン */
function MultiField({ open, onToggle, summary, children }: { open: boolean; onToggle: () => void; summary: string; children: React.ReactNode }) {
  return (
    <div>
      <button type="button" style={S.field} onClick={onToggle}>
        <span style={summary ? S.fieldVal : S.fieldPlaceholder}>{summary || 'タップして選択（複数えらべます）'}</span>
        <span style={S.caret}>{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div style={S.panel}>
          {children}
          <button type="button" style={S.doneBtn} onClick={onToggle}>選択を終える</button>
        </div>
      )}
    </div>
  );
}

export function ShibouRequestScreen({ nav }: Props) {
  const [prefs, setPrefs] = useState<string[]>([]);
  const [noPref, setNoPref] = useState(false);
  const [want, setWant] = useState('');
  const [exams, setExams] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [fieldTags, setFieldTags] = useState<string[]>([]); // 興味タグ（分野・研究対象）→ want へ
  const [condTags, setCondTags] = useState<string[]>([]);   // 条件タグ（入試条件）→ note へ
  const [phase, setPhase] = useState<Phase>('edit');
  const [errMsg, setErrMsg] = useState('');
  const [regionOpen, setRegionOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [fieldTagOpen, setFieldTagOpen] = useState(false);
  const [condTagOpen, setCondTagOpen] = useState(false);
  // タグ体系は GV Compass の taxonomy.json を実行時取得（失敗時は同梱定数）。GV Compass更新に追従。
  const [tagSets, setTagSets] = useState<TagSets>(BUNDLED_TAGS);
  useEffect(() => { let alive = true; loadTagSets().then((t) => { if (alive) setTagSets(t); }); return () => { alive = false; }; }, []);

  const togglePref = (p: string) => {
    setNoPref(false);
    setPrefs((s) => (s.includes(p) ? s.filter((x) => x !== p) : [...s, p]));
  };
  const toggleNoPref = () => { setNoPref((v) => !v); setPrefs([]); };
  const toggleExam = (v: string) => setExams((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  const toggleFieldTag = (t: string) => setFieldTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));
  const toggleCondTag = (t: string) => setCondTags((s) => (s.includes(t) ? s.filter((x) => x !== t) : [...s, t]));

  const regionStr = noPref ? '希望なし' : prefs.join('、');
  const examStr = exams.join('、');
  const regionSummary = noPref ? '希望なし' : prefs.length ? `${prefs.length}件：${prefs.join('・')}` : '';
  const examSummary = exams.length ? `${exams.length}件：${exams.join('・')}` : '';
  // 自由記述＋選択タグを合成して送信（タグはエージェントの検索条件に効く）
  const wantOut = [want.trim(), fieldTags.length ? `【興味タグ】${fieldTags.join('、')}` : ''].filter(Boolean).join('\n');
  const noteOut = [note.trim(), condTags.length ? `【条件タグ】${condTags.join('、')}` : ''].filter(Boolean).join('\n');
  const canSubmit = phase !== 'submitting' &&
    (noPref || prefs.length > 0 || wantOut !== '' || exams.length > 0 || noteOut !== '');

  const submit = async () => {
    if (!canSubmit) return;
    setPhase('submitting'); setErrMsg('');
    try {
      await requestShibou({ region: regionStr, want: wantOut, examType: examStr, note: noteOut });
      setPhase('done');
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : String(e));
      setPhase('error');
    }
  };

  if (phase === 'done') {
    return (
      <div className="app">
        <div className="safe-top" />
        <TopNav crumb="GV / 志望校調査" onBack={() => nav('home')} backLabel="ホーム" />
        <div className="app-scroll">
          <div style={S.doneWrap}>
            <div style={S.doneCheck}>✓</div>
            <div style={S.doneTitle}>依頼を受け付けました</div>
            <p style={S.doneSub}>研究内容を最優先に、あなたに合った志望校を調べます。準備ができ次第「おすすめ志望校」に表示されます（反映まで少し時間がかかります）。</p>
            <button type="button" style={S.primaryBtn} onClick={() => nav('home')}>ホームに戻る</button>
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
        <div style={S.pad}>
          <div className="page-head" style={S.headFlush}>
            <div className="page-eyebrow">SHIBOU · 志望校調査</div>
            <h1 className="page-title">志望校調査を依頼</h1>
            <p className="page-sub">やりたいこと・希望条件を教えてください。あなたの成績とあわせて、研究内容を最優先に志望校を調べます。</p>
          </div>

          {/* 希望地域 */}
          <section style={S.section}>
            <div style={S.label}>希望地域<span style={S.opt}>（複数選択可）</span></div>
            <MultiField open={regionOpen} onToggle={() => setRegionOpen((v) => !v)} summary={regionSummary}>
              <OptRow label={NO_PREF} checked={noPref} onToggle={toggleNoPref} />
              {!noPref && REGION_GROUPS.map((g) => (
                <div key={g.region}>
                  <div style={S.groupName}>{g.region}</div>
                  <div style={S.prefGrid}>
                    {g.prefs.map((p) => (
                      <div key={p} style={S.prefCell}>
                        <OptRow label={p} checked={prefs.includes(p)} onToggle={() => togglePref(p)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </MultiField>
          </section>

          {/* やりたいこと */}
          <section style={S.section}>
            <div style={S.labelRow}>
              <div style={S.label}>大学でやりたいこと・興味のある分野</div>
              <TagToggle open={fieldTagOpen} onToggle={() => setFieldTagOpen((v) => !v)} />
            </div>
            <textarea style={S.textarea} rows={4} value={want} onChange={(e) => setWant(e.target.value)}
              placeholder="例：脳や神経の仕組みを研究したい／再生医療に興味がある／英語を活かせる学部がいい" />
            {fieldTags.length > 0 && (
              <div style={S.chips}>
                {fieldTags.map((t) => (
                  <button type="button" key={t} style={S.chip} onClick={() => toggleFieldTag(t)}>{t} <span style={S.chipX}>×</span></button>
                ))}
              </div>
            )}
            {fieldTagOpen && (
              <div style={S.panel}>
                <div style={S.subHead}>分野で選ぶ</div>
                <TagGroups groups={tagSets.fieldSystems} selected={fieldTags} onToggle={toggleFieldTag} />
                <div style={{ ...S.subHead, marginTop: 12 }}>研究対象・生きもので選ぶ</div>
                <TagGroups groups={tagSets.targetGroups} selected={fieldTags} onToggle={toggleFieldTag} />
                <button type="button" style={S.doneBtn} onClick={() => setFieldTagOpen(false)}>選択を終える</button>
              </div>
            )}
          </section>

          {/* 入試形式 */}
          <section style={S.section}>
            <div style={S.label}>希望する入試形式<span style={S.opt}>（複数選択可）</span></div>
            <MultiField open={examOpen} onToggle={() => setExamOpen((v) => !v)} summary={examSummary}>
              {EXAM_TYPES.map((v) => (
                <OptRow key={v} label={v} checked={exams.includes(v)} onToggle={() => toggleExam(v)} />
              ))}
            </MultiField>
          </section>

          {/* 補足 */}
          <section style={S.section}>
            <div style={S.labelRow}>
              <div style={S.label}>補足・こだわり条件<span style={S.opt}>（任意）</span></div>
              <TagToggle open={condTagOpen} onToggle={() => setCondTagOpen((v) => !v)} />
            </div>
            <textarea style={S.textarea} rows={3} value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="例：理科の配点が高い大学がいい／面接がない大学がいい／自宅から通えるところ" />
            {condTags.length > 0 && (
              <div style={S.chips}>
                {condTags.map((t) => (
                  <button type="button" key={t} style={S.chip} onClick={() => toggleCondTag(t)}>{t} <span style={S.chipX}>×</span></button>
                ))}
              </div>
            )}
            {condTagOpen && (
              <div style={S.panel}>
                <div style={S.subHead}>入試の条件で選ぶ</div>
                <TagGroups groups={tagSets.examGroups} selected={condTags} onToggle={toggleCondTag} />
                <button type="button" style={S.doneBtn} onClick={() => setCondTagOpen(false)}>選択を終える</button>
              </div>
            )}
          </section>

          {phase === 'error' && (
            <div style={S.errBox}>送信に失敗しました。通信環境を確認してもう一度お試しください。<div style={S.errDetail}>{errMsg}</div></div>
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

const S: Record<string, React.CSSProperties> = {
  pad: { paddingLeft: 'calc(var(--pad-x) + 6px)', paddingRight: 'calc(var(--pad-x) + 6px)' },
  headFlush: { paddingLeft: 0, paddingRight: 0 },
  section: { marginTop: 22 },
  labelRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 },
  label: { fontSize: 14.5, fontWeight: 700, color: 'var(--c-text, #2c2c2c)' },
  opt: { fontSize: 12, fontWeight: 400, color: 'var(--c-text-mute, #8a8a82)', marginLeft: 6 },
  tagToggle: {
    flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 999,
    border: '1px solid var(--c-primary, #4e9b73)', background: 'rgba(78,155,115,0.08)',
    color: 'var(--c-primary-deep, #3a7d5c)', fontSize: 12.5, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
  },
  tagCaret: { fontSize: 9 },
  subHead: { fontSize: 12, fontWeight: 700, color: 'var(--c-primary-deep, #3a7d5c)', margin: '2px 4px 4px' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 9px', borderRadius: 999,
    border: '1px solid var(--c-primary, #4e9b73)', background: 'var(--c-primary, #4e9b73)', color: '#fff',
    fontSize: 12, fontWeight: 600, cursor: 'pointer',
  },
  chipX: { fontSize: 12, opacity: 0.85 },
  field: {
    width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 8, padding: '11px 12px', borderRadius: 12, border: '1px solid var(--c-line, #d9d9d2)',
    background: 'var(--c-surface, #fff)', color: 'var(--c-text, #2c2c2c)', fontSize: 14, cursor: 'pointer', textAlign: 'left',
  },
  fieldVal: { color: 'var(--c-text, #2c2c2c)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fieldPlaceholder: { color: 'var(--c-text-mute, #8a8a82)' },
  caret: { flex: 'none', color: 'var(--c-text-mute, #8a8a82)', fontSize: 11 },
  panel: {
    marginTop: 6, border: '1px solid var(--c-line, #d9d9d2)', borderRadius: 12, background: 'var(--c-surface, #fff)',
    padding: 8, maxHeight: 320, overflowY: 'auto', boxShadow: '0 10px 26px -14px rgba(45,58,42,0.25)',
  },
  groupName: { fontSize: 12, color: 'var(--c-text-mute, #8a8a82)', margin: '8px 4px 2px' },
  prefGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 },
  prefCell: {},
  optRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 8px', borderRadius: 8,
    border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
  },
  checkbox: {
    flex: 'none', width: 20, height: 20, lineHeight: '18px', textAlign: 'center', borderRadius: 6,
    border: '1.5px solid var(--c-line, #c8c8c0)', background: '#fff', color: '#fff', fontSize: 13, fontWeight: 800,
  },
  checkboxOn: { background: 'var(--c-primary, #4e9b73)', borderColor: 'var(--c-primary, #4e9b73)' },
  optLabel: { fontSize: 14, color: 'var(--c-text, #2c2c2c)' },
  optLabelOn: { fontSize: 14, color: 'var(--c-primary-deep, #3a7d5c)', fontWeight: 700 },
  doneBtn: {
    width: '100%', marginTop: 8, padding: '9px', borderRadius: 10, border: 'none',
    background: 'var(--c-bg-warm, #f4efe6)', color: 'var(--c-primary-deep, #3a7d5c)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 12, border: '1px solid var(--c-line, #d9d9d2)',
    background: 'var(--c-surface, #fff)', color: 'var(--c-text, #2c2c2c)', fontSize: 14.5, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit',
  },
  primaryBtn: { width: '100%', marginTop: 24, padding: '14px 16px', borderRadius: 14, border: 'none', background: 'var(--c-primary, #4e9b73)', color: '#fff', fontSize: 15.5, fontWeight: 700, cursor: 'pointer' },
  primaryBtnDisabled: { width: '100%', marginTop: 24, padding: '14px 16px', borderRadius: 14, border: 'none', background: 'var(--c-line, #d9d9d2)', color: 'var(--c-text-mute, #8a8a82)', fontSize: 15.5, fontWeight: 700, cursor: 'not-allowed' },
  errBox: { marginTop: 20, padding: '12px 14px', borderRadius: 12, background: 'rgba(200,60,60,0.08)', border: '1px solid rgba(200,60,60,0.3)', color: '#a13030', fontSize: 13.5 },
  errDetail: { fontSize: 11, opacity: 0.7, marginTop: 4, wordBreak: 'break-all' },
  doneWrap: { textAlign: 'center', padding: '48px 24px 24px' },
  doneCheck: { width: 64, height: 64, lineHeight: '64px', borderRadius: 999, margin: '0 auto 16px', background: 'var(--c-primary, #4e9b73)', color: '#fff', fontSize: 32, fontWeight: 700 },
  doneTitle: { fontSize: 18, fontWeight: 700, color: 'var(--c-text, #2c2c2c)' },
  doneSub: { fontSize: 14, lineHeight: 1.7, color: 'var(--c-text-mute, #8a8a82)', marginTop: 10, marginBottom: 24 },
};
