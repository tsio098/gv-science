/**
 * ABYSS（二次問題）の解答欄（設計書 §5.6 / モック BackPlay・BackPlayPlain・BackPlayTerm）。
 *
 * - choice  … 記号のボタン。作り変えた問題は選択肢の文（optionText）、構造式は候補の画像（optionImg）を並べる。multi は「すべて選ぶ」
 * - term    … 端末キーボード + 記号バー（₂ ₃ ₄ ⁺ ⁻ → ⇌ ( ) ・）。全角/半角・添え字の違いはサーバで吸収する
 * - numeric … 専用キーパッド（出題画面の下に出す）。sci = 仮数 × 10^指数 / plain = 整数・小数。単位は表示だけ
 * 正解はサーバだけが持つので、ここでは入力を集めるだけ。
 */
import { useEffect, useRef, useState } from 'react';
import type { AbyssPart, PartValue, PlayQuestion } from '../../lib/treeApi';
import { treeImage } from '../../lib/treeApi';
import { T } from './treeTheme';

/** 入力中の値: choice = 記号（multi は配列）/ term = 文字列 / numeric = 仮数と指数 */
export type RawVal = string | string[] | { m: string; e: string };

export const emptyRaw = (p: AbyssPart): RawVal =>
  p.kind === 'numeric' ? { m: '', e: '' } : p.kind === 'choice' && p.multi ? [] : '';

export function isFilled(p: AbyssPart, v: RawVal | undefined): boolean {
  if (v === undefined) return false;
  if (p.kind === 'numeric') return typeof v === 'object' && !Array.isArray(v) && /[0-9]/.test(v.m);
  if (Array.isArray(v)) return v.length > 0;
  return typeof v === 'string' && v.trim() !== '';
}

/** 送る値（numeric は '1.6e-3'。fixedExp の欄・plain は仮数だけ）*/
export function toValue(p: AbyssPart, v: RawVal | undefined): PartValue {
  if (v === undefined) return '';
  if (p.kind === 'numeric') {
    const n = v as { m: string; e: string };
    const e = n.e.replace(/^-$/, '');
    return p.format === 'sci' && p.fixedExp == null && e !== '' && e !== '0' ? `${n.m}e${e}` : n.m;
  }
  return v as PartValue;
}

const SUP: Record<string, string> = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
const sup = (s: string) => s.split('').map((c) => SUP[c] ?? c).join('');

/** 数値の表示（「1.6 × 10⁻³ mol」）*/
export function numericLabel(p: AbyssPart & { kind: 'numeric' }, v: { m: string; e: string }) {
  if (!v.m) return '—';
  const exp = p.fixedExp != null ? String(p.fixedExp) : p.format === 'sci' ? v.e.replace(/^-$/, '') : '';
  return `${v.m}${exp && exp !== '0' ? ` × 10${sup(exp)}` : ''}${p.unit ? ` ${p.unit}` : ''}`;
}

const SYMBOLS: [string, string][] = [
  ['₂', '下付き 2'], ['₃', '下付き 3'], ['₄', '下付き 4'], ['⁺', '上付き プラス'], ['⁻', '上付き マイナス'], ['²⁺', '2 プラス'],
  ['→', '右矢印'], ['⇌', '可逆矢印'], ['(', '左かっこ'], [')', '右かっこ'], ['[', '左角かっこ'], [']', '右角かっこ'],
  ['-', 'マイナス・単結合'], ['=', '二重結合'], ['・', '中点'],
];

function TermInput({ value, equation, onChange, label }: { value: string; equation: boolean; onChange: (v: string) => void; label: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const insert = (sym: string) => {
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const next = value.slice(0, start) + sym + value.slice(end);
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + sym.length, start + sym.length);
    });
  };
  return (
    <div className="ab-term">
      <input
        ref={ref}
        className="ab-input"
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
        placeholder={equation ? '反応式を入力（例 2H₂ + O₂ → 2H₂O）' : 'ここに入力'}
        aria-label={label}
        value={value}
        maxLength={200}
        onChange={(e) => onChange(e.target.value)}
      />
      <div className="ab-syms" aria-label="記号を入れる">
        {SYMBOLS.map(([s, aria]) => (
          <button
            key={s}
            type="button"
            className="ab-sym"
            aria-label={aria}
            // フォーカスを入力欄から外さない（iOS でキーボードが閉じないように）
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insert(s)}
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}

function StructOption({ path, alt }: { path: string; alt: string }) {
  const [url, setUrl] = useState<string | 'error' | null>(null);
  useEffect(() => {
    let alive = true;
    treeImage(path)
      .then((u) => alive && setUrl(u))
      .catch(() => alive && setUrl('error'));
    return () => {
      alive = false;
    };
  }, [path]);
  if (!url) return <div className="ab-struct-ph">読み込み中…</div>;
  if (url === 'error') return <div className="ab-struct-ph">読み込めませんでした</div>;
  return <img className="ab-struct-img" src={url} alt={alt} draggable={false} />;
}

interface Props {
  q: PlayQuestion;
  values: RawVal[];
  onChange: (i: number, v: RawVal) => void;
  /** いまキーパッドで入力している numeric 欄（この設問の i 番目なら強調）*/
  numFocus: number | null;
  onNumFocus: (i: number) => void;
}

export function AbyssAnswer({ q, values, onChange, numFocus, onNumFocus }: Props) {
  if (q.answer.kind !== 'parts') return null;
  const { parts, unordered, unorderedGroups } = q.answer;
  const many = parts.length > 1;
  const partLabel = (i: number) => parts[i]?.label || `欄 ${i + 1}`;
  return (
    <div className="ab-answer">
      {q.prompt && (
        <div className="ab-prompt">
          <span className="ab-prompt-tag">問い</span>
          {q.prompt}
        </div>
      )}
      {unordered && <div className="ab-hint">順不同（どの欄から答えてもよい）</div>}
      {!unordered &&
        (unorderedGroups || []).map((g, k) => (
          <div key={'g' + k} className="ab-hint">
            {g.map(partLabel).join('・')} は順不同（どちらの欄から答えてもよい）
          </div>
        ))}
      {parts.map((p, i) => {
        const v = values[i] ?? emptyRaw(p);
        const label = p.label || (many ? `欄 ${i + 1}` : '解答');
        return (
          <div key={i} className="ab-part">
            <div className="ab-part-head">
              <span>{label}</span>
              <small>
                {p.kind === 'choice'
                  ? p.multi
                    ? 'すべて選ぶ'
                    : '1 つ選ぶ'
                  : p.kind === 'term'
                    ? p.equation
                      ? '反応式'
                      : '語句'
                    : p.format === 'sci' && p.fixedExp == null
                      ? '数値（仮数 × 10^指数）'
                      : '数値'}
              </small>
            </div>
            {p.kind === 'choice' && (
              <div className={p.optionImg ? 'ab-struct-grid' : p.optionText ? 'ab-optlist' : 'ab-chips'}>
                {p.options.map((o) => {
                  const on = Array.isArray(v) ? v.includes(o) : v === o;
                  const toggle = () => {
                    if (p.multi) {
                      const cur = Array.isArray(v) ? v : [];
                      onChange(i, on ? cur.filter((x) => x !== o) : [...cur, o]);
                    } else onChange(i, on ? '' : o);
                  };
                  return (
                    <button
                      key={o}
                      type="button"
                      className={`ab-opt${on ? ' is-sel' : ''}`}
                      aria-pressed={on}
                      aria-label={`${label} ${o}`}
                      onClick={toggle}
                    >
                      <span className="ab-opt-key">{o}</span>
                      {p.optionText?.[o] && <span className="ab-opt-text">{p.optionText[o]}</span>}
                      {p.optionImg?.[o] && <StructOption path={p.optionImg[o]!} alt={`${o} の構造式`} />}
                    </button>
                  );
                })}
              </div>
            )}
            {p.kind === 'term' && (
              <TermInput value={typeof v === 'string' ? v : ''} equation={p.equation} label={label} onChange={(s) => onChange(i, s)} />
            )}
            {p.kind === 'numeric' && (
              <button
                type="button"
                className={`ab-num${numFocus === i ? ' is-focus' : ''}`}
                data-num={`${q.id}#${i}`}
                aria-label={`${label} を入力`}
                onClick={() => onNumFocus(i)}
              >
                <span className="tr-mono">{numericLabel(p, v as { m: string; e: string })}</span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** 数値キーパッド（モック BackPlay）。sci は「指数」で欄を切り替え、「±」は入力中の欄（仮数・指数）の符号。
 *  plain でも ± で負の数を入れられる（2026-10-28 先生決定・都立大 2026 化学 3 問2 ΔH = −98。どの数値欄でも押せるので答えの符号のヒントにならない）*/
export function AbyssKeypad({
  part,
  value,
  onChange,
  onClose,
  onNext,
}: {
  part: AbyssPart & { kind: 'numeric' };
  value: { m: string; e: string };
  onChange: (v: { m: string; e: string }) => void;
  onClose: () => void;
  /** 同じ画面の次の数値欄へ（無ければ undefined）*/
  onNext?: () => void;
}) {
  const sci = part.format === 'sci' && part.fixedExp == null;
  const [field, setField] = useState<'m' | 'e'>('m');
  const f = sci ? field : 'm';
  const tap = (k: string) => {
    const cur = value[f];
    if (k === '⌫') return onChange({ ...value, [f]: cur.slice(0, -1) });
    if (k === '指数') return setField(f === 'm' ? 'e' : 'm');
    if (k === '±') return onChange({ ...value, [f]: cur.startsWith('-') ? cur.slice(1) : '-' + cur });
    if (k === '.' && (f === 'e' || cur.includes('.'))) return;
    if (f === 'e' && cur.replace('-', '').length >= 2) return;
    if (f === 'm' && cur.replace(/[.-]/g, '').length >= 8) return;
    onChange({ ...value, [f]: cur + k });
  };
  const keys = ['7', '8', '9', '⌫', '4', '5', '6', '指数', '1', '2', '3', '±', '0', '.'];
  const preview = !value.m
    ? sci
      ? '指数が無い答えは × 10 の欄を空のままにします'
      : '数字だけを入力します（単位は不要）'
    : `= ${numericLabel(part, value)} として判定します`;
  return (
    <div className="ab-keypad">
      <div className="ab-keypad-head">
        <span>{sci ? (f === 'm' ? '仮数を入力中（1.6 のように・± で符号）' : '指数を入力中（± で符号）') : '整数・小数をそのまま入力（± で符号）'}</span>
        <span style={{ display: 'flex', gap: 8 }}>
          {onNext && (
            <button type="button" className="tr-link" onClick={onNext}>
              次の欄 →
            </button>
          )}
          <button type="button" className="tr-link" onClick={onClose}>
            閉じる
          </button>
        </span>
      </div>
      {sci && (
        <div className="ab-sci">
          <button type="button" className={`ab-sci-box${f === 'm' ? ' is-on' : ''}`} onClick={() => setField('m')} aria-label="仮数を入力">
            <span className="tr-mono">{value.m || '—'}</span>
          </button>
          <span className="tr-num">× 10</span>
          <button type="button" className={`ab-sci-exp${f === 'e' ? ' is-on' : ''}`} onClick={() => setField('e')} aria-label="指数を入力">
            <span className="tr-mono">{value.e || '0'}</span>
          </button>
          {part.unit && <span className="tr-num" style={{ color: T.accent }}>{part.unit}</span>}
        </div>
      )}
      <div className="ab-preview">{preview}</div>
      <div className="ab-keys">
        {keys.map((k) => {
          const special = k === '⌫' || k === '指数' || k === '±';
          const disabled = !sci && k === '指数';
          const active = k === '指数' && f === 'e';
          return (
            <button
              key={k}
              type="button"
              className={`ab-key${special ? ' is-special' : ''}${active ? ' is-active' : ''}`}
              disabled={disabled}
              aria-label={k === '⌫' ? '1 文字消す' : k === '指数' ? '指数に切り替え' : k === '±' ? (f === 'e' ? '指数の符号' : '符号') : k}
              onClick={() => tap(k)}
            >
              {k}
            </button>
          );
        })}
      </div>
    </div>
  );
}
