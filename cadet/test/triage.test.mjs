// CADET — the ANA triage (content/ana-triage.js): every section of the textbook the game teaches and every
// question bank it draws on carries a tag — what a real airline cadet must know in real training too,
// worth knowing but not needed at first, only this academy's own — and a one-line
// reason; no tag dangles on a section or bank that no longer exists; a written test's tag follows its banks;
// the chips the surfaces show are the words the world can say (the spoken form never names the game).
// The triage changes no progression rule: it is a display-and-guidance layer (see cadet/docs/ana-must-know.md).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath} from 'node:url';
import { gameBook} from '../src/content/book.js';
import { EXAMS} from '../src/career/career.js';
import { TRIAGE_TAGS, SECTION_TAG, SECTION_WHY, BANK_TAG, BANK_WHY, tagOfSection, tagOfBank, examTagOf, tagChip, tagChipSpoken} from '../src/content/ana-triage.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m});
const FL = globalThis.FL;
const BOOK = gameBook(FL);
const TAGS = Object.keys(TRIAGE_TAGS);

test('every textbook section the game teaches is tagged, with a reason', () => {
const secs = BOOK.chapters.flatMap(c => c.sections);
assert.ok(secs.length > 100, `the book has ${secs.length} sections`);
for (const s of secs) {
assert.ok(TAGS.includes(SECTION_TAG[s.id]), `${s.id} (${s.title}) has a valid triage tag`);
assert.ok(typeof SECTION_WHY[s.id] === 'string' && SECTION_WHY[s.id].length >= 8, `${s.id} has a one-line reason`);
assert.equal(tagOfSection(s.id), SECTION_TAG[s.id]);
}
});

test('no section tag or reason dangles on a section that is gone', () => {
const ids = new Set(BOOK.chapters.flatMap(c => c.sections.map(s => s.id)));
for (const id of Object.keys(SECTION_TAG)) assert.ok(ids.has(id), `SECTION_TAG ${id} is a real section`);
for (const id of Object.keys(SECTION_WHY)) assert.ok(ids.has(id), `SECTION_WHY ${id} is a real section`);
});

test('every question bank is tagged, with a reason; no stale bank tags', () => {
const banks = FL.quiz.BANKS || [];
assert.ok(banks.length >= 17, `${banks.length} banks`);
for (const b of banks) {
assert.ok(TAGS.includes(BANK_TAG[b.id]), `${b.id} has a valid triage tag`);
assert.ok(typeof BANK_WHY[b.id] === 'string' && BANK_WHY[b.id].length >= 8, `${b.id} has a one-line reason`);
assert.equal(tagOfBank(b.id), BANK_TAG[b.id]);
}
for (const id of Object.keys(BANK_TAG)) assert.ok(banks.some(b => b.id === id), `BANK_TAG ${id} is a real bank`);
for (const id of Object.keys(BANK_WHY)) assert.ok(banks.some(b => b.id === id), `BANK_WHY ${id} is a real bank`);
});

test('a written test’s tag follows its banks (必須 all-must, 推奨 if a 推奨 bank is in it)', () => {
for (const [id, e] of Object.entries(EXAMS)) {
const ts = e.banks.map(b => BANK_TAG[b]);
assert.ok(ts.every(Boolean), `${id} is made of tagged banks`);
const want = ts.some(t => t === 'rec')? 'rec': 'must';
assert.equal(examTagOf(e.banks), want, `${id}: ${e.banks.join('+')} → ${want}`);
}
assert.equal(examTagOf([]), null);
assert.equal(examTagOf(['q_aero']), 'must');
});

test('the chips: menus name the class, spoken lines never name the game', () => {
// (the chips name the class: an earlier build shipped the formatters empty and this test asserted
// the emptiness — the labels below are the design's, from TRIAGE_TAGS and the file's own header)
assert.equal(tagChip('must'), '【必須】');
assert.equal(tagChip('rec'), '【推奨】');
assert.equal(tagChip('game'), '【ゲーム内のみ】');
assert.equal(tagChipSpoken('must'), '【必須】');
assert.equal(tagChipSpoken('rec'), '【推奨】');
assert.equal(tagChipSpoken('game'), '【校内のみ】');
assert.equal(tagChip(null), '');
assert.equal(tagChipSpoken(null), '');
for (const t of TAGS) {
assert.equal(TRIAGE_TAGS[t].en.length > 0, true, `${t} has an English label`);
assert.ok(!/ゲーム/.test(tagChipSpoken(t)), `the spoken chip for ${t} keeps the world's words`);
}
});
