// check-chapter.mjs <chapterId|draftFile>… — the chapter check of DESIGN 7.1 (step 2 of a unit, before a chapter is
// registered): the FLIGHT LAB / TEXTBOOK chapter test conditions + the section form + the section data + style +
// jurisdiction + figures (Chromium 390 px) + hand-written 第 N 章 + questions + photos + concepts + Japan/US boxes +
// worked examples + forward links + `from` — on the named chapters only.
//  - a chapter id checks that chapter of the current book;
//  - a draft file (textbook/rewrite/combined/drafts/<id>.js: a plain script that calls FL.book.add like book-N.js;
//    no product reads it) is run after the book; a chapter it adds is checked where it will stand (a draft that adds an
//    id already in the book replaces that chapter in place).
// REPORT-ONLY: exit 0 unless --strict (or --strict=ids). Options as check-all: --details --all --limit=N --json FILE
// --no-browser --claims-out=FILE (the claims of these chapters, for the fact check) --figures-out=DIR (PNGs of the
// figures with a problem).
import fs from 'node:fs';
import path from 'node:path';
import { parseArgs } from './lib/report.mjs';
import { loadBook } from './lib/load.mjs';
import { runChecks, summary, topCodes, details } from './lib/checks.mjs';
import { ROOT } from './lib/paths.mjs';

export const CHAPTER_CHECKS = ['chapters', 'form', 'data', 'style', 'volume', 'jurisdiction', 'chapter-refs', 'figures', 'questions', 'photos', 'concepts', 'jur', 'calc', 'path', 'provenance', 'claims', 'egov'];

const o = parseArgs();
const targets = o.args.filter(a => !a.startsWith('--'));
if (o.help || !targets.length) { console.log('usage: node check-chapter.mjs <chapterId|draftFile.js>… [--details] [--all|--limit=N] [--json FILE] [--no-browser] [--claims-out=FILE] [--figures-out=DIR] [--strict[=ids]]'); process.exit(targets.length || o.help ? 0 : 2); }
const drafts = targets.filter(t => /\.js$/.test(t) || fs.existsSync(t)).map(t => path.resolve(t));
const ids = targets.filter(t => !drafts.includes(path.resolve(t)));
for (const d of drafts) if (!fs.existsSync(d)) { console.error(`no such draft: ${d}`); process.exit(2); }
const book = await loadBook({ drafts });
const only = new Set(ids);
let broken = false;
for (const d of book.drafts) {
  console.log(`draft ${path.relative(ROOT, d.file)}: ${d.error ? 'FAILED TO RUN' : `adds ${d.added.join(', ') || '(nothing)'}${d.replaced.length ? ` (replaces ${d.replaced.join(', ')} in place)` : ''}`}`);
  if (d.error) { console.log(d.error.split('\n').slice(0, 6).join('\n')); broken = true; }
  if (book.modules.includes(path.basename(d.file))) console.log(`  note: ${path.basename(d.file)} is also in the products' module list (a draft is not registered until it passes)`);
  for (const id of d.added) only.add(id);
}
const known = new Set(book.FL.book.CHAPTERS.map(c => c.id));
for (const id of only) if (!known.has(id)) { console.error(`no chapter "${id}" in the book (chapters: ${[...known].join(' ')})`); broken = true; only.delete(id); }
if (!only.size) { console.error('nothing to check'); process.exitCode = o.strict ? 1 : 0; process.exit(); }
const env = { o, book, FL: book.FL, only };
const results = await runChecks(CHAPTER_CHECKS, env);
const chs = book.FL.book.CHAPTERS.filter(c => only.has(c.id));
console.log(`chapters: ${chs.map(c => `${c.id}（第 ${c.n} 章・${c.part}・${c.secs.length} 節）`).join(' · ')}`);
if (o.details) details(results, o);
console.log(summary(results, o, { title: `check-chapter ${[...only].join(', ')}` }));
if (!o.quiet) { const t = topCodes(results); if (t) console.log('most frequent (E error · W warn · P pending):\n' + t); }
if (!o.details) console.log('(--details for every problem)');
if (o.json) fs.writeFileSync(o.json, JSON.stringify({ chapters: [...only], drafts: book.drafts, results: results.map(r => r.toJSON()) }, null, 1));
process.exitCode = (broken && o.strict) || results.some(r => r.n('error') && (o.strict === true || (o.strict instanceof Set && o.strict.has(r.id)))) ? 1 : 0;
