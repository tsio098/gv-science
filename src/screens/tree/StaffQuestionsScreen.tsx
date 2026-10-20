/**
 * ANCHOR TREE — 先生用 問題の確認（2026-10-20）。先生用アカウント（学年「先生」）だけ「…」メニューから開ける。
 * 科目（ROUTE 5 科目＋化学・生物の ABYSS）→ 試験の一覧（新しく入った順・新着 / 今年度の演習 / 基本問題）→ その試験の問題。
 * 問題ごとに 分野・種別・出る場所・正解・必要な値、開くと問題画像（リード文つき）。画像を押すと全画面で拡大。
 * 試験の一覧は manifest（/tree/manifest）、問題と正解は Proxy の /tree/staff/questions（先生用アカウントだけ）。
 */
import { useEffect, useMemo, useState } from 'react';
import type { AbyssPart, QType, StaffQuestion, StaffQuestions, StaffSolution, TreeManifest, TreeStage } from '../../lib/treeApi';
import { QTYPE_LABEL, circled, examLabel, fetchStaffQuestions, fetchTreeManifest, treeImage } from '../../lib/treeApi';
import { TREE_SUBJECTS, TREE_SUBJECT_NAME, type TreeSubject } from '../../lib/treeSubject';
import { Ico } from './TreeIcons';
import { PlayZoomScreen, type ZoomTab } from './PlayZoomScreen';
import { groupColor, rootClass } from './treeTheme';

interface Props {
  onBack: () => void;
}

/** 'chemistry' / 'chemistry@back' */
const BACK_SUBJECTS: TreeSubject[] = ['chemistry', 'biology'];
const DS_LIST = [...TREE_SUBJECTS, ...BACK_SUBJECTS.map((s) => `${s}@back`)];
const splitDs = (ds: string) => ({ subject: ds.replace(/@back$/, '') as TreeSubject, stage: (ds.endsWith('@back') ? 'back' : 'front') as TreeStage });
const dsLabel = (ds: string) => {
  const { subject, stage } = splitDs(ds);
  return TREE_SUBJECT_NAME[subject] + (stage === 'back' ? ' ABYSS' : '');
};

type ExamFilter = 'all' | 'new' | 'exam' | 'basic';
const EXAM_FILTERS: { key: ExamFilter; label: string }[] = [
  { key: 'all', label: 'すべて' },
  { key: 'new', label: '新着' },
  { key: 'exam', label: '今年度の演習' },
  { key: 'basic', label: '基本問題' },
];
/** Proxy の新着と同じ（addedAt から 14 日・manifest.newDays で変わる）*/
const NEW_DAYS = 14;

const fmtYmd = (s: string | undefined) => {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${y}/${Number(m)}/${Number(d)}`;
};

/** 正解の表示（欄ごと）。pub = 出題の欄（数値の書式 sci / plain）*/
function solutionLines(sol: StaffSolution, pub: AbyssPart[]): string[] {
  if (sol.kind === 'choice') {
    const one = sol.boxes.length === 1;
    const main = sol.boxes.map((b) => (one ? circled(b.correct) : `${b.n}: ${circled(b.correct)}`)).join('　');
    const out = [main + (sol.group === 'unordered' ? '（順不同）' : '')];
    if (sol.alts.length) out.push('別の正しい組: ' + sol.alts.map((t) => t.map((v) => circled(v)).join('')).join(' / '));
    return out;
  }
  const out = sol.parts.map((p, i) => {
    const lab = p.label ? p.label + ' ' : '';
    if (p.kind === 'choice') return lab + (Array.isArray(p.correct) ? p.correct.join('・') + '（すべて）' : p.correct);
    if (p.kind === 'term') return lab + p.accept.join(' / ');
    const sci = pub[i]?.kind === 'numeric' && (pub[i] as { format: string }).format === 'sci';
    return lab + fmtNumeric(p.value, p.sig, sci) + (p.unit ? ' ' + p.unit : '') + (p.sig ? `（有効数字 ${p.sig} 桁）` : '');
  });
  if (sol.unordered) out.push('（欄の順序は問わない）');
  return out;
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
function fmtNumeric(v: number, sig: number | null, sci: boolean) {
  if (!Number.isFinite(v)) return String(v);
  if (!sig) return String(v);
  const plain = v.toPrecision(sig); // '7.52' / '64' / '0.040'（桁が大きいと '6.4e+2'）
  if (!sci && !plain.includes('e')) return plain;
  const e = v.toExponential(sig - 1); // '4.0e-2'
  const [m, x] = e.split('e');
  const n = Number(x);
  if (n === 0) return m!;
  return `${m}×10${String(n).split('').map((c) => SUP[c] ?? c).join('')}`;
}

export function StaffQuestionsScreen({ onBack }: Props) {
  const [ds, setDs] = useState<string>('chemistry');
  const [manifests, setManifests] = useState<Record<string, TreeManifest | 'error'>>({});
  const [exam, setExam] = useState<string | null>(null);
  const [filter, setFilter] = useState<ExamFilter>('all');
  const [query, setQuery] = useState('');

  const mf = manifests[ds];
  useEffect(() => {
    if (ds in manifests) return;
    const { subject, stage } = splitDs(ds);
    fetchTreeManifest(subject, stage)
      .then((m) => setManifests((x) => ({ ...x, [ds]: m })))
      .catch(() => setManifests((x) => ({ ...x, [ds]: 'error' })));
  }, [ds, manifests]);

  const exams = useMemo(() => {
    if (!mf || mf === 'error') return [];
    const days = (mf as TreeManifest & { newDays?: number }).newDays || NEW_DAYS;
    const now = Date.now();
    const q = query.trim().replace(/\s+/g, '_');
    return [...mf.exams]
      .map((e) => {
        const t = Date.parse(e.addedAt ?? '');
        return { ...e, isNew: Number.isFinite(t) && now - t < days * 86400_000 };
      })
      .filter((e) => (filter === 'new' ? e.isNew : filter === 'exam' ? e.kind !== 'basic' : filter === 'basic' ? e.kind === 'basic' : true))
      .filter((e) => !q || e.exam.includes(q))
      .sort((a, b) => (b.addedAt ?? '').localeCompare(a.addedAt ?? '') || b.exam.localeCompare(a.exam, 'ja'));
  }, [mf, filter, query]);

  if (exam && mf && mf !== 'error') {
    return <ExamView ds={ds} exam={exam} manifest={mf} onBack={() => setExam(null)} />;
  }

  const total = mf && mf !== 'error' ? mf.exams.length : 0;
  return (
    <div className={rootClass('tr-rank st-root')}>
      <div className="tr-rank-head">
        <button type="button" className="tr-iconbtn" aria-label="戻る" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <div className="tr-rank-title">
          <Ico id="i-lines" size={20} />
          <span>問題の確認</span>
          <span className="st-badge">先生用</span>
        </div>
      </div>
      <div className="tr-rank-body st-body">
        <div className="tr-chips" role="listbox" aria-label="科目">
          {DS_LIST.map((x) => (
            <button key={x} type="button" role="option" aria-selected={ds === x} className={ds === x ? 'is-on' : ''} onClick={() => setDs(x)}>
              {dsLabel(x)}
            </button>
          ))}
        </div>
        <div className="st-sortbar">
          <span>試験</span>
          <div className="tr-chips" role="listbox" aria-label="試験の絞り込み">
            {EXAM_FILTERS.map((x) => (
              <button key={x.key} type="button" role="option" aria-selected={filter === x.key} className={filter === x.key ? 'is-on' : ''} onClick={() => setFilter(x.key)}>
                {x.label}
              </button>
            ))}
          </div>
        </div>
        <input
          className="sq-search"
          type="search"
          value={query}
          placeholder="試験名で探す（例: 河合 第3回）"
          onChange={(e) => setQuery(e.target.value)}
        />

        {mf === 'error' ? (
          <div className="tr-panel" style={{ textAlign: 'center', fontSize: 13, padding: '28px 16px' }}>
            この科目の問題はまだありません（または読み込めませんでした）。
          </div>
        ) : !mf ? (
          <div className="tr-center" style={{ position: 'static', padding: '40px 0' }}>
            <div className="tr-spinner" />
          </div>
        ) : (
          <>
            <div className="sq-note">
              {dsLabel(ds)}: {total} 試験・{mf.exams.reduce((a, e) => a + e.count, 0)} 問。新しく入った順。
            </div>
            {exams.length === 0 ? (
              <div className="tr-panel" style={{ textAlign: 'center', fontSize: 13, padding: '28px 16px' }}>
                該当する試験はありません。
              </div>
            ) : (
              <div className="sq-exams">
                {exams.map((e) => (
                  <button key={e.exam} type="button" className="sq-exam" onClick={() => setExam(e.exam)}>
                    <span className="sq-exam-main">
                      <b>{examLabel(e.exam)}</b>
                      <small>
                        {e.kind === 'basic' ? '基本問題' : '今年度の演習'}
                        {e.lastDate ? ` · 実施 ${fmtYmd(e.lastDate)}` : ''} · 追加 {fmtYmd(e.addedAt)}
                      </small>
                    </span>
                    {e.isNew && <span className="sq-new">新着</span>}
                    <span className="sq-count tr-num">{e.count} 問</span>
                    <Ico id="i-chev-right" size={14} />
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ExamView({ ds, exam, manifest, onBack }: { ds: string; exam: string; manifest: TreeManifest; onBack: () => void }) {
  const [data, setData] = useState<StaffQuestions | null>(null);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const [field, setField] = useState<string>('all');
  const [openAll, setOpenAll] = useState(false);
  const [zoom, setZoom] = useState<{ tabs: ZoomTab[]; initial: number } | null>(null);
  const [imgs, setImgs] = useState<Record<string, string | 'error'>>({});

  useEffect(() => {
    let alive = true;
    setError(false);
    setData(null);
    const { subject, stage } = splitDs(ds);
    fetchStaffQuestions(subject, stage, exam)
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [ds, exam, nonce]);

  const fieldOf = (id: string) => manifest.fields.find((f) => f.id === id);
  const fieldsHere = useMemo(() => {
    const ids = new Set<string>();
    for (const q of data?.questions ?? []) for (const p of q.places) ids.add(p.field);
    return manifest.fields.filter((f) => ids.has(f.id));
  }, [data, manifest]);
  const list = useMemo(
    () => (data?.questions ?? []).filter((q) => field === 'all' || q.places.some((p) => p.field === field)),
    [data, field],
  );

  const openZoom = (tabs: ZoomTab[], initial: number) => {
    for (const t of tabs) {
      if (imgs[t.path]) continue;
      treeImage(t.path)
        .then((u) => setImgs((m) => ({ ...m, [t.path]: u })))
        .catch(() => setImgs((m) => ({ ...m, [t.path]: 'error' })));
    }
    setZoom({ tabs, initial });
  };

  return (
    <div className={rootClass('tr-rank st-root')}>
      <div className="tr-rank-head">
        <button type="button" className="tr-iconbtn" aria-label="試験の一覧へ" onClick={onBack}>
          <Ico id="i-back" size={20} />
        </button>
        <div className="tr-rank-title" style={{ minWidth: 0 }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{examLabel(exam)}</span>
          <span className="st-badge" style={{ flex: 'none', whiteSpace: 'nowrap' }}>{dsLabel(ds)}</span>
        </div>
      </div>
      <div className="tr-rank-body st-body">
        {error ? (
          <div className="tr-center" style={{ position: 'static', padding: '40px 0' }}>
            <div>読み込めませんでした。</div>
            <button type="button" className="tr-ghost" style={{ width: 200 }} onClick={() => setNonce((n) => n + 1)}>
              再読み込み
            </button>
          </div>
        ) : !data ? (
          <div className="tr-center" style={{ position: 'static', padding: '40px 0' }}>
            <div className="tr-spinner" />
          </div>
        ) : (
          <>
            {fieldsHere.length > 1 && (
              <div className="tr-chips" role="listbox" aria-label="分野">
                {[{ id: 'all', name: 'すべての分野' }, ...fieldsHere].map((f) => (
                  <button key={f.id} type="button" role="option" aria-selected={field === f.id} className={field === f.id ? 'is-on' : ''} onClick={() => setField(f.id)}>
                    {f.name}
                  </button>
                ))}
              </div>
            )}
            <div className="st-datebar">
              <span style={{ fontSize: 12, color: 'var(--tr-sub)' }}>{list.length} 問</span>
              <button type="button" className="st-chipbtn" onClick={() => setOpenAll((v) => !v)}>
                {openAll ? '画像をすべて閉じる' : '画像をすべて開く'}
              </button>
            </div>
            <div className="sq-list">
              {list.map((q) => (
                <QuestionCard
                  key={q.id + (openAll ? ':o' : ':c')}
                  q={q}
                  data={data}
                  initialOpen={openAll}
                  fieldName={(id) => fieldOf(id)?.name ?? id}
                  fieldColor={(id) => groupColor(fieldOf(id)?.group ?? 'basic')}
                  onZoom={openZoom}
                />
              ))}
            </div>
            <div className="st-foot">
              正解は先生用アカウントにだけ出ます。外した問題（問題報告で除外）と前年度の演習はここに出ません。
              「出る場所」= その問題が出るノード（分野 × 種別）。セットの小問は考察のノードにまとめて出ます。
            </div>
          </>
        )}
      </div>
      {zoom && <PlayZoomScreen tabs={zoom.tabs} initial={zoom.initial} imgs={imgs} onClose={() => setZoom(null)} />}
    </div>
  );
}

function QuestionCard({
  q,
  data,
  initialOpen,
  fieldName,
  fieldColor,
  onZoom,
}: {
  q: StaffQuestion;
  data: StaffQuestions;
  initialOpen: boolean;
  fieldName: (id: string) => string;
  fieldColor: (id: string) => string;
  onZoom: (tabs: ZoomTab[], initial: number) => void;
}) {
  const [open, setOpen] = useState(initialOpen);
  const set = q.set ? data.sets[q.set] : null;
  const lead = set?.lead ?? q.img.lead;
  const body = q.img.body;
  const [leadUrl, setLeadUrl] = useState<string | 'error' | null>(null);
  const [bodyUrl, setBodyUrl] = useState<string | 'error' | null>(null);
  useEffect(() => {
    if (!open) return;
    if (lead && !leadUrl) treeImage(lead).then(setLeadUrl).catch(() => setLeadUrl('error'));
    if (body && !bodyUrl) treeImage(body).then(setBodyUrl).catch(() => setBodyUrl('error'));
  }, [open, lead, body, leadUrl, bodyUrl]);

  const back = data.stage === 'back';
  const title = back
    ? q.label ?? String(q.source.n ?? '')
    : q.answer.kind === 'choice'
      ? `解答番号 ${q.answer.boxes.map((b) => b.n).join('・')}`
      : String(q.source.n ?? '');
  const tabs: ZoomTab[] = [...(lead ? [{ label: 'リード文', path: lead }] : []), ...(body ? [{ label: '設問', path: body }] : [])];
  const memberIdx = set ? set.members.indexOf(q.id) : -1;
  const sol = solutionLines(q.solution, q.answer.kind === 'parts' ? q.answer.parts : []);

  return (
    <div className="tr-wrong sq-card">
      <button type="button" className="tr-wrong-head" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div className="sq-card-title">
            <b>{title}</b>
            <span className="sq-tag">
              <i style={{ background: fieldColor(q.field) }} />
              {fieldName(q.field)}
            </span>
            <span className="sq-tag">{QTYPE_LABEL[q.type]}</span>
            {set && <span className="sq-tag">セット {memberIdx + 1}/{set.members.length}</span>}
            {q.origType && q.origType !== q.type && <span className="sq-tag is-sub">元は{QTYPE_LABEL[q.origType as QType]}</span>}
            {q.standalone && <span className="sq-tag is-sub">単独</span>}
          </div>
          <div className="sq-answer">
            <span>正解</span>
            <b className="tr-num">
              {sol.map((l, i) => (
                <span key={i} style={{ display: 'block' }}>
                  {l}
                </span>
              ))}
            </b>
          </div>
        </div>
        <span style={{ color: 'var(--tr-sub)', transform: open ? 'rotate(90deg)' : undefined, display: 'flex' }}>
          <Ico id="i-chev-right" size={16} />
        </span>
      </button>
      {open && (
        <>
          <div className="sq-places">
            出る場所:
            {q.places.map((p, i) => (
              <span key={i} className="sq-tag">
                <i style={{ background: fieldColor(p.field) }} />
                {fieldName(p.field)} · {QTYPE_LABEL[p.type]}
              </span>
            ))}
          </div>
          {q.prompt && <div className="sq-text">問い（作り変え）: {q.prompt}</div>}
          {q.text && <div className="sq-text">{q.text}</div>}
          {q.answer.kind === 'parts' &&
            q.answer.parts.map((p, i) =>
              p.kind === 'choice' && p.optionText ? (
                <div key={i} className="sq-text">
                  {p.label ? p.label + ' ' : ''}
                  {Object.entries(p.optionText).map(([k, t]) => `${k} ${t}`).join(' / ')}
                </div>
              ) : null,
            )}
          {q.given.length > 0 && <div className="sq-given">{q.given.join('　')}</div>}
          {lead && (
            <>
              <div className="tr-wrong-cap">リード文</div>
              <button type="button" className="tr-paper sq-paper" onClick={() => onZoom(tabs, 0)} aria-label="リード文を拡大">
                <Img url={leadUrl} alt={`${title} リード文`} />
              </button>
              <div className="tr-wrong-cap">設問</div>
            </>
          )}
          {body && (
            <button type="button" className="tr-paper sq-paper" onClick={() => onZoom(tabs, lead ? 1 : 0)} aria-label="設問を拡大">
              <Img url={bodyUrl} alt={title} />
            </button>
          )}
          <div className="sq-id tr-mono">{q.id}</div>
        </>
      )}
    </div>
  );
}

function Img({ url, alt }: { url: string | 'error' | null; alt: string }) {
  if (url && url !== 'error') return <img src={url} alt={alt} />;
  return <div className="tr-imgph">{url === 'error' ? '画像を読み込めませんでした' : '読み込み中…'}</div>;
}
