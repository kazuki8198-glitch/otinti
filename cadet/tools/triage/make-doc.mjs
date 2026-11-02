// make-doc.mjs — regenerate the tables of cadet/docs/ana-must-know.md from the triage data
// (src/content/ana-triage.js) and the game's own content, so the doc can never drift from the game.
// Usage: node tools/triage/make-doc.mjs  (rewrites the doc in place, keeping the prose around the markers)
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameBook } from '../../src/content/book.js';
import { EXAMS } from '../../src/career/career.js';
import { SECTION_TAG, SECTION_WHY, BANK_TAG, BANK_WHY, examTagOf } from '../../src/content/ana-triage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..', '..');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(root, '../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL;
const BOOK = gameBook(FL);
const LBL = { must: '必須', rec: '推奨', game: 'ゲーム内のみ' };

const secRows = [];
for (const c of BOOK.chapters) for (const s of c.sections)
  secRows.push(`| ${c.n} | ${s.id} | ${s.title} | ${LBL[SECTION_TAG[s.id]]} | ${SECTION_WHY[s.id]} |`);
const secTable = ['| 章 | 節 ID | 節 | 区分 | 理由 |', '|---|---|---|---|---|', ...secRows].join('\n');

const bankRows = (FL.quiz.BANKS || []).map(b => `| ${b.id} | ${b.title} | ${b.qs.length} | ${LBL[BANK_TAG[b.id]]} | ${BANK_WHY[b.id]} |`);
const bankTable = ['| バンク ID | 分野 | 問題数 | 区分 | 理由 |', '|---|---|---|---|---|', ...bankRows].join('\n');

const examRows = Object.entries(EXAMS).map(([id, e]) => `| ${id} | ${e.title} | ${e.banks.join('、')} | ${LBL[examTagOf(e.banks)]} |`);
const examTable = ['| 試験 ID | 試験 | 出題バンク | 区分 |', '|---|---|---|---|', ...examRows].join('\n');

const docPath = path.join(root, 'docs/ana-must-know.md');
let doc = fs.readFileSync(docPath, 'utf8');
const put = (tag, body) => {
  const re = new RegExp(`(<!-- ${tag}:START -->)[\\s\\S]*?(<!-- ${tag}:END -->)`);
  if (!re.test(doc)) throw new Error(`marker ${tag} not found in the doc`);
  doc = doc.replace(re, `$1\n${body}\n$2`);
};
put('SECTIONS', secTable);
put('BANKS', bankTable);
put('EXAMS', examTable);
// the aggregates line, measured not typed
const sc = t => Object.values(SECTION_TAG).filter(x => x === t).length;
const qc = t => (FL.quiz.BANKS || []).filter(b => BANK_TAG[b.id] === t).reduce((a, b) => a + b.qs.length, 0);
const totS = Object.keys(SECTION_TAG).length, totQ = (FL.quiz.BANKS || []).reduce((a, b) => a + b.qs.length, 0);
put('COUNTS', `| 節 | ${totS} | ${sc('must')}（${Math.round(sc('must') / totS * 100)}%） | ${sc('rec')}（${Math.round(sc('rec') / totS * 100)}%） | ${sc('game')}（0%） |\n| 問題（バンク） | ${totQ} | ${qc('must')}（${Math.round(qc('must') / totQ * 100)}%） | ${qc('rec')}（${Math.round(qc('rec') / totQ * 100)}%） | ${qc('game')}（0%） |`);
fs.writeFileSync(docPath, doc);
console.log(`doc tables regenerated: ${totS} sections, ${totQ} questions`);
