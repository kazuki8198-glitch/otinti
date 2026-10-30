#!/usr/bin/env node
// ledgers/validate.mjs — checks the W03 ledgers (README.md has the formats):
//   - every ledger parses, has its head (ledger, version, rows) and rows with unique ids and the fields its kind needs;
//   - statuses are known, a closed row has its place/reason and two different signatures (by ≠ checkedBy);
//   - PROVENANCE.json lists every id of the original basic course (flight-lab/kiso/data/kiso00..13.json: 393 sections,
//     376 questions, 161 figures, 85 photos) exactly once, each with a destination or a reason;
//   - every section a ledger names is in DESIGN 3.3's table of contents; cross references between ledgers resolve;
//   - the patch files units write (reports/<UNIT>.ledger.json) are well formed and name rows that exist;
//   - git sees no change under flight-lab/kiso/ (the original is kept byte for byte).
// Usage: node validate.mjs [--quiet] [--no-patches]      exit code 1 when anything is wrong.
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const COMBINED = path.resolve(HERE, '..');
const ROOT = path.resolve(COMBINED, '..', '..', '..');
const REPORTS = path.join(COMBINED, 'reports');
const quiet = process.argv.includes('--quiet');
const errors = [], warnings = [], notes = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

import { STATUS, SIGNED, REQUIRED, FILES, ledgerOfId, UNIT, checkPatchFile } from './src/schema.mjs';

// ---- the plan (DESIGN 3.3) and the original basic course ----------------------------------------------------------
const { plannedBook, jurItems, kiso } = await import(path.join(HERE, 'src', 'design.mjs'));
const BOOK = plannedBook();
// the sections the book has now: a ★ section of DESIGN 3.3 is "not there yet" only while the book does not have it (the
// chapter units register new sections from R1's P5 on; added by the R2B integrator). Without the book, DESIGN's ★ decides.
let IN_BOOK = null;
try {
  const { loadBook } = await import(path.join(COMBINED, 'tools', 'lib', 'load.mjs'));
  const { FL } = await loadBook({ extra: false });
  IN_BOOK = new Set(FL.book.CHAPTERS.flatMap(c => c.secs.map(s => s.id)));
} catch (e) { notes.push(`the book could not be loaded (${e.message}): DESIGN 3.3's ★ marks decide which sections are not there yet`); }
const notYet = s => !!BOOK.secs.get(s)?.isNew && !(IN_BOOK && IN_BOOK.has(s));
const JUR = new Set(jurItems().map(x => x.id));
const K = kiso();
const DEST = /^(door:p[0-7]|summary:[a-z0-9]+|written:[a-z0-9]+)$/;
const chapterIds = new Set(BOOK.chapters.map(c => c.id));
function checkDest(where, d) {
  if (BOOK.secs.has(d)) return;
  const m = d.match(DEST);
  if (m) { const ch = d.split(':')[1]; if (/^p\d$/.test(ch) || chapterIds.has(ch)) return; }
  err(where, `行き先 "${d}" が DESIGN 3.3 の目次の節でも door/summary/written の形でもない`);
}

// ---- read ---------------------------------------------------------------------------------------------------
const L = {};
for (const f of FILES) {
  const file = path.join(HERE, f), name = f.replace(/\.json$/, '');
  if (!fs.existsSync(file)) { err(f, 'ない'); continue; }
  let raw;
  try { raw = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { err(f, `JSON として読めない：${e.message}`); continue; }
  if (raw.ledger !== name) err(f, `ledger が "${raw.ledger}"（"${name}" のはず）`);
  if (typeof raw.version !== 'number') err(f, 'version がない');
  if (!Array.isArray(raw.rows)) { err(f, 'rows が配列でない'); continue; }
  L[name] = raw;
}

// ---- generic row checks ---------------------------------------------------------------------------------------
for (const [name, raw] of Object.entries(L)) {
  const ids = new Set();
  for (const [i, row] of raw.rows.entries()) {
    const at = `${name} ${row && row.id ? row.id : '#' + i}`;
    if (!row || typeof row !== 'object') { err(at, '行がオブジェクトでない'); continue; }
    for (const k of REQUIRED[name]) if (!(k in row)) err(at, `${k} がない`);
    if (typeof row.id !== 'string' || !row.id) { err(at, 'id が文字列でない'); continue; }
    if (ids.has(row.id)) err(at, '同じ id が 2 回'); ids.add(row.id);
    const owner = ledgerOfId(row.id);
    if (owner !== name) err(at, `id の形が ${owner || '不明'} の台帳のもの`);
    if (row.unit && !UNIT.test(row.unit)) err(at, `unit "${row.unit}" が作業の単位の形（W01・W07a など）でない`);
    for (const u of row.alsoUnits || []) if (!UNIT.test(u)) err(at, `alsoUnits の "${u}" が作業の単位の形でない`);
    const st = STATUS[name];
    if (st) {
      if (!(row.status in st)) { err(at, `status "${row.status}" は ${Object.keys(st).join('・')} のどれでもない`); continue; }
      for (const need of st[row.status]) if (row[need] === null || row[need] === undefined || row[need] === '') err(at, `status ${row.status} なのに ${need} がない`);
      if ((SIGNED[name] || []).includes(row.status)) {
        if (!row.by) err(at, `status ${row.status} なのに by（直した・書いた単位）がない`);
        else if (!row.checkedBy) warn(at, `status ${row.status}：確かめ役の署名（checkedBy）待ち。署名がそろうまで基準 1・2・11 は閉じない`);
        else if (row.by === row.checkedBy) err(at, 'by と checkedBy が同じ（別の人が確かめる）');
      }
    }
  }
  // tombstones of removed rows (apply-patches.mjs, op "remove"): each says who removed it and why, and the row is gone
  for (const [i, t] of (raw.removed || []).entries()) {
    const at = `${name} removed ${t && t.id ? t.id : '#' + i}`;
    if (!t || typeof t.id !== 'string' || !t.by || !t.note) err(at, '外した行の記録に id・by・note がない');
    else if (ids.has(t.id)) err(at, '外した行の id が rows にもある');
  }
  notes.push(`${name}: ${raw.rows.length} 行${STATUS[name] ? '（' + Object.entries(raw.rows.reduce((a, r) => ((a[r.status] = (a[r.status] || 0) + 1), a), {})).map(([k, v]) => `${k} ${v}`).join('・') + '）' : ''}`);
}

// ---- ledger-specific checks ----------------------------------------------------------------------------------------
const E = L.ERRATA, R = L.RULINGS;
if (E) {
  const rid = new Set((R ? R.rows : []).map(r => r.id));
  for (const r of E.rows) {
    if (!['textbook', 'kiso', 'app', 'syllabus'].includes(r.book)) err(`ERRATA ${r.id}`, `book "${r.book}"`);
    if (!r.source || typeof r.source !== 'object' || !r.source.report) err(`ERRATA ${r.id}`, 'source.report がない');
    if (r.book === 'kiso' && r.word !== true) err(`ERRATA ${r.id}`, '基礎教材の行は word:true（ERRATA-FOR-WORD.md に全部を書く）');
    for (const x of r.rulings || []) if (!rid.has(x)) err(`ERRATA ${r.id}`, `rulings の ${x} が RULINGS にない`);
    if (r.dupOf && !E.rows.some(x => x.id === r.dupOf)) err(`ERRATA ${r.id}`, `dupOf ${r.dupOf} がない`);
    if (r.status !== 'open' && r.status !== 'not-error' && r.status !== 'wontfix' && r.verified !== true) err(`ERRATA ${r.id}`, '直したのに verified が true でない（一次資料で確かめてから直す：DESIGN 10）');
  }
  const by = E.rows.reduce((a, r) => ((a[r.book] = (a[r.book] || 0) + 1), a), {});
  if (by.textbook !== 79) err('ERRATA', `教科書の行が ${by.textbook}（DESIGN 10.1 は 79）`);
  if (by.kiso !== 53) err('ERRATA', `基礎教材の行が ${by.kiso}（DESIGN 10.2 は 53）`);
}
if (R) {
  const eid = new Set((E ? E.rows : []).map(r => r.id));
  for (const r of R.rows) {
    const at = `RULINGS ${r.id}`;
    if (!r.classes.every(c => ['A', 'B', 'C'].includes(c)) || r.class !== r.classes[0]) err(at, `class・classes の形（${r.class}・${r.classes}）`);
    if (r.classes.includes('A') && !JUR.has(r.jur)) err(at, `A の行の jur "${r.jur}" が DESIGN 3.4 の 47 項目にない`);
    if (r.classes.includes('C') && !r.term && !r.termNA) err(at, 'C の行に term（用語の表へ）も termNA（用語でない理由）もない');
    if (r.classes.includes('B') && !r.wrong && r.class === 'B') err(at, 'B の行に wrong（どちら側を直すか）がない');
    for (const x of r.errata || []) if (!eid.has(x)) err(at, `errata の ${x} が ERRATA にない`);
  }
}
if (L.PROVENANCE) {
  const want = { section: [], question: [], figure: [], photo: [] };
  for (const c of K.chapters) {
    want.section.push(...c.sections.map(s => s.id));
    want.question.push(...c.qa.map(q => `${c.id}.q${q.n}`));
    want.figure.push(...c.figures.map(f => f.id));
    want.photo.push(...c.photos.map(p => p.id));
  }
  const seen = new Map();
  for (const r of L.PROVENANCE.rows) {
    seen.set(r.id, (seen.get(r.id) || 0) + 1);
    const at = `PROVENANCE ${r.id}`;
    if (!want[r.kind]) { err(at, `kind "${r.kind}"`); continue; }
    if (!want[r.kind].includes(r.id)) err(at, `原本の JSON に ${r.kind} として ない ID`);
    if (!Array.isArray(r.to)) { err(at, 'to が配列でない'); continue; }
    if (!r.to.length && !r.reason) err(at, '行き先も外した理由もない');
    if (r.to.length && r.plan === 'drop') err(at, 'plan が drop なのに行き先がある');
    for (const d of r.to) checkDest(at, d);
  }
  for (const [kind, ids] of Object.entries(want)) {
    const missing = ids.filter(id => !seen.has(id)), dup = ids.filter(id => seen.get(id) > 1);
    if (missing.length) err('PROVENANCE', `${kind} の ${missing.length} 件が由来表にない：${missing.slice(0, 10).join(' ')}${missing.length > 10 ? ' …' : ''}`);
    if (dup.length) err('PROVENANCE', `${kind} の ${dup.length} 件が 2 回以上：${dup.slice(0, 10).join(' ')}`);
    notes.push(`PROVENANCE ${kind}: ${ids.length - missing.length} / ${ids.length}（原本の JSON）`);
  }
}
for (const name of ['JCAB-MAP', 'ACS-MAP']) {
  const M = L[name]; if (!M) continue;
  let unmapped = 0;
  for (const r of M.rows) {
    const at = `${name} ${r.id}`;
    if (!r.sections.length && !r.excluded) { unmapped++; err(at, '節も「対象外（理由）」もない（未対応）'); }
    for (const s of r.sections) if (!BOOK.secs.has(s)) err(at, `節 "${s}" が DESIGN 3.3 の目次にない`);
    const missing = r.sections.filter(notYet);
    if (r.status === 'mapped' && missing.length) err(at, `status mapped なのにまだない節がある（${missing.join('・')}）：open にする`);
    if (r.topicMap) for (const [t, ss] of Object.entries(r.topicMap)) for (const s of ss) if (!r.sections.includes(s)) err(at, `topicMap の「${t}」の ${s} が sections にない`);
  }
  notes.push(`${name}: 未対応 ${unmapped}`);
}
if (L.UNVERIFIED) {
  for (const r of L.UNVERIFIED.rows) for (const j of r.jur || []) if (!JUR.has(j)) err(`UNVERIFIED ${r.id}`, `jur "${j}" が 47 項目にない`);
  const covered = new Set(L.UNVERIFIED.rows.flatMap(r => r.jur || []));
  for (const x of jurItems().filter(x => x.unverified)) if (!covered.has(x.id)) err('UNVERIFIED', `〔要確認〕の日米の項目 ${x.id} の行がない`);
}
if (L.CONCEPTS) for (const r of L.CONCEPTS.rows) for (const s of [r.address, ...r.recalls, ...(r.distinct || []).map(d => d.address)]) if (!BOOK.secs.has(s)) err(`CONCEPTS ${r.id}`, `節 "${s}" が DESIGN 3.3 の目次にない`);
if (L.COUNTS) { const mm = L.COUNTS.rows.filter(r => r.match === false); if (mm.length) notes.push(`COUNTS: 設計書の中の食い違い ${mm.length}（${mm.map(r => r.id).join('・')}）`); }

if (!process.argv.includes('--no-patches') && fs.existsSync(REPORTS)) {
  const files = fs.readdirSync(REPORTS).filter(f => /\.ledger\.json$/.test(f));
  for (const f of files) for (const m of checkPatchFile(path.join(REPORTS, f), L)) err('patch', m);
  notes.push(`patch files: ${files.length}`);
}

// ---- the original stays untouched ----------------------------------------------------------------------------------
try {
  const st = execFileSync('git', ['status', '--porcelain', '--', 'flight-lab/kiso'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (st) err('flight-lab/kiso', `git が変更を見ている（原本は変えない）：${st.split('\n').slice(0, 3).join(' / ')}`);
  else notes.push('flight-lab/kiso: git の差分なし');
} catch (e) { warn('git', `git status を読めなかった：${e.message}`); }

if (!quiet || errors.length) {
  for (const n of notes) console.log('  ' + n);
  for (const w of warnings) console.log('warn  ' + w);
  for (const e of errors.slice(0, 200)) console.log('ERROR ' + e);
}
console.log(`ledgers: ${errors.length ? 'FAIL' : 'ok'} — ${errors.length} error(s), ${warnings.length} warning(s)`);
if (import.meta.url === `file://${process.argv[1]}`) process.exitCode = errors.length ? 1 : 0;
