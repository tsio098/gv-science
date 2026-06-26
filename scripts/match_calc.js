#!/usr/bin/env node
/**
 * 志望校マッチング 計算機（決定論・node・python不要）
 * 使い方: node match_calc.js <生徒raw.json> <shibouData.json> <itemId1,itemId2,...>
 * 出力(JSON): 各候補の 共テ傾斜後得点率(取れない大学はフラット) / ボーダー差 / バンド / 二次科目 / 二次適性。
 *
 * ★全大学で「共テ傾斜」を試みる（kyotsu をパース）。配点数値が無い大学はフラット共テ得点率で代替（flat:true）。
 * ★二次は記述模試を使わず、共テ科目別の得意・不得意から「二次で得点しやすいか」を推定。
 */
const fs = require('fs');
function rate(p) { if (!p) return null; const s = p[0], m = p[1]; return (m && s != null) ? s / m : null; }

function subjectRates(raw) {
  const rS = (raw.rika || []).reduce((a, x) => a + (x[0] || 0), 0);
  const rM = (raw.rika || []).reduce((a, x) => a + (x[1] || 0), 0);
  const eS = (raw.eigoR[0] || 0) + (raw.eigoL[0] || 0);
  const eM = (raw.eigoR[1] || 0) + (raw.eigoL[1] || 0);
  return {
    kokugo: rate(raw.kokugo),
    math: rate([raw.mathIA[0] + raw.mathIIB[0], raw.mathIA[1] + raw.mathIIB[1]]),
    eigoR: rate(raw.eigoR), eigoL: rate(raw.eigoL),
    engComb: eM ? eS / eM : null,
    rika: rM ? rS / rM : null,
    chiko: rate(raw.chiko), joho: rate(raw.joho),
  };
}

/** フラット共テ得点率(%) */
function flatPct(raw) {
  const all = [raw.kokugo, raw.eigoR, raw.eigoL, raw.mathIA, raw.mathIIB, raw.chiko, raw.joho].concat(raw.rika);
  let s = 0, m = 0; all.forEach((x) => { s += x[0] || 0; m += x[1] || 0; });
  return m ? 100 * s / m : null;
}

/** 共テ配点テキスト → 科目別配点。配点数値が（）内に無ければ parsed:false（フラット代替）。*/
function parseKyotsu(t) {
  if (!t) return { parsed: false };
  let manten = null;
  let m = t.match(/(?:共通テスト|共テ|共)[：:]?\s*([0-9]{2,4})/);
  if (m) manten = +m[1];
  if (!manten) { m = t.match(/([0-9]{3,4})\s*点/); if (m) manten = +m[1]; }
  // 配点は （...） 内の ／ or / 区切りでのみ採用（【…】や数値無しはフラット）
  const pm = t.match(/[（(]([^（）()]*)[）)]/);
  if (!pm) return { parsed: false, manten };
  const inner = pm[1];
  const toks = inner.split(/[／/]/);
  const h = { kokugo: 0, math: 0, eigoR: 0, eigoL: 0, eigo: 0, rika: 0, chiko: 0, joho: 0 };
  let found = 0;
  // 配点はトークン内の最大数値を採用（〔基礎2＋専門1〕等のノイズ数字を避ける。「地公1科目100」も100を取れる）
  const maxNum = (s) => { const a = s.match(/([0-9]+)/g); return a ? Math.max.apply(null, a.map(Number)) : null; };
  for (const tok of toks) {
    if (/外国語|英語|英/.test(tok)) {                       // 英語（国より先：外国語に国が含まれる）
      const r = tok.match(/R\s*([0-9]+)/), l = tok.match(/L\s*([0-9]+)/);
      if (r || l) { h.eigoR = r ? +r[1] : 0; h.eigoL = l ? +l[1] : 0; }
      else { const n = maxNum(tok); if (n != null) h.eigo = n; }
      if (h.eigoR || h.eigoL || h.eigo) found++;
      continue;
    }
    if (/地歴|公民|地公|社会/.test(tok)) { const n = maxNum(tok); if (n != null) { h.chiko = n; found++; } continue; } // 理より先（地理に理）
    if (/情報|情/.test(tok)) { const n = maxNum(tok); if (n != null) { h.joho = n; found++; } continue; }
    if (/理科|理/.test(tok)) { const n = maxNum(tok); if (n != null) { h.rika = n; found++; } continue; }
    if (/数学|数/.test(tok)) { const n = maxNum(tok); if (n != null) { h.math = n; found++; } continue; }
    if (/国語|国/.test(tok)) { const n = maxNum(tok); if (n != null) { h.kokugo = n; found++; } continue; }
  }
  // 配点合計で manten を補完／検証
  const sum = h.kokugo + h.math + h.eigoR + h.eigoL + h.eigo + h.rika + h.chiko + h.joho;
  if (!manten && sum > 0) manten = sum;
  const parsed = !!(manten && found >= 4 && sum > 0);
  return { ...h, manten, parsed };
}

const KEYS = ['kokugo', 'math', 'rika', 'chiko', 'joho'];
function keishaPct(R, h) {
  if (!h || !h.parsed || !h.manten) return null;
  let tot = 0;
  for (const k of KEYS) tot += (R[k] || 0) * (h[k] || 0);
  if (h.eigoR || h.eigoL) tot += (R.eigoR || 0) * h.eigoR + (R.eigoL || 0) * h.eigoL;
  else if (h.eigo) tot += (R.engComb || 0) * h.eigo;
  return 100 * tot / h.manten;
}
function band(gap) {
  if (gap == null) return '–';
  if (gap >= 5) return '🟦安全'; if (gap >= -5) return '🟩適正';
  if (gap >= -10) return '🟥挑戦'; return '⬛再考';
}
function parseNiji(t) {
  if (!t) return [];
  const s = [];
  if (/外国語|英語|英/.test(t)) s.push('英語');
  if (/数/.test(t)) s.push('数学');
  if (/物理|化学|生物|地学|理科|(?<!地)理/.test(t)) s.push('理科');   // 地理は除外
  if (/地歴|世界史|日本史|地理|公民|政治|経済/.test(t)) s.push('地歴公民');
  if (/現代文|古文|漢文|国語|(?<!外)国/.test(t)) s.push('国語');       // 外国(語)は除外
  if (/面接/.test(t)) s.push('面接');
  if (/小論文|小論/.test(t)) s.push('小論文');
  return s;
}
function nijiAptitude(R, subs) {
  const map = { '数学': R.math, '理科': R.rika, '英語': R.engComb, '国語': R.kokugo, '地歴公民': R.chiko };
  const acad = subs.filter((x) => map[x] != null);
  const lvl = (r) => r >= 0.75 ? '得意' : r >= 0.6 ? 'ふつう' : '不得意';
  const detail = acad.map((x) => `${x}${Math.round(map[x] * 100)}%(${lvl(map[x])})`).join('・');
  const avg = acad.length ? acad.reduce((a, x) => a + map[x], 0) / acad.length : null;
  let verdict;
  if (avg == null) verdict = '学科試験なし（面接/小論等）';
  else if (avg >= 0.75) verdict = '二次で得点しやすい（得意科目中心）';
  else if (avg >= 0.6) verdict = '二次はおおむね対応可';
  else verdict = '二次は不得意科目を含み不利寄り';
  return { verdict, detail, nonAcademic: subs.filter((x) => map[x] == null), nijiAvg: avg != null ? +(avg * 100).toFixed(0) : null };
}

// ── main ──
const raw = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const d = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'));
const ids = (process.argv[4] || '').split(',').filter(Boolean);
const R = subjectRates(raw);
const FLAT = flatPct(raw);
const byId = {}; d.items.forEach((it) => { byId[it.id] = it; });

const cands = ids.map((id) => {
  const it = byId[id];
  if (!it) return [{ id, error: 'NOT_FOUND' }];
  return (it.schedules || []).map((sc) => {
    const h = parseKyotsu(sc.kyotsu);
    let pct = keishaPct(R, h), usedFlat = false;
    if (pct == null) { pct = FLAT; usedFlat = true; }
    const border = (sc.rate2026 != null && sc.rate2026 !== '') ? Number(sc.rate2026) : null;
    const gap = (pct != null && border != null) ? pct - border : null;
    const niji = parseNiji(sc.kobetsu);
    return {
      id, school: it.school, dept: it.dept, term: sc.term, pref: it.pref,
      kekisha: pct != null ? +pct.toFixed(1) : null, flat: usedFlat,
      haiten: h.parsed ? { kokugo: h.kokugo, math: h.math, eigoR: h.eigoR, eigoL: h.eigoL, eigo: h.eigo, rika: h.rika, chiko: h.chiko, joho: h.joho, manten: h.manten } : null,
      border, gap: gap != null ? +gap.toFixed(1) : null, band: band(gap),
      nijiSubjects: niji, nijiAptitude: nijiAptitude(R, niji),
    };
  });
}).flat();

console.log(JSON.stringify({
  studentRates: { kokugo: Math.round(R.kokugo * 100), math: Math.round(R.math * 100), eigoR: Math.round(R.eigoR * 100), eigoL: Math.round(R.eigoL * 100), rika: Math.round(R.rika * 100), chiko: Math.round(R.chiko * 100), joho: Math.round(R.joho * 100) },
  flatPct: +FLAT.toFixed(1),
  candidates: cands,
}, null, 2));
