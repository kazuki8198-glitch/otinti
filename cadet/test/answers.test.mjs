// CADET — the answer map (content/answer-map.js): every question chapter 1 can ask is tied to the line of the textbook's
// part 1 that says its answer, and that line is the section's own (said by the class read in full, as the class says it).
// The map's rows are checked against FLIGHT LAB's banks (each row is the question it says it is) and against the book.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from '../tools/measure-ch1.mjs';
import { BANK_ANSWERS, SCENE_ANSWERS, DRILL_ANSWERS, LISTEN_ANSWERS, PFD_ANSWERS } from '../src/content/answer-map.js';
import { CLASS_CHAPTERS } from '../src/content/school.js';
import { EXAMS } from '../src/career/career.js';

const L = await load(), FL = L.FL;
const squash = (s) => String(s).replace(/\s+/g, '');
// each section's lines as the class says them in full (its own nodes: the section's book units)
function sectionLines() {
  const out = new Map();
  for (let i = 0; i < CLASS_CHAPTERS.length; i++) {
    const d = L.school.classDialogs(FL, i, { pace: 'full', notes: () => null }), N = d.dialogs.class.nodes;
    for (const id of L.school.pathOf(N, 'hello', {})) {
      const m = /^c(\d+)s(\d+)(?::u|$)/.exec(id); if (!m) continue;
      const sec = L.BOOK.chapters.find(c => c.id === CLASS_CHAPTERS[i][+m[1]]).sections[+m[2]].id;
      if (!out.has(sec)) out.set(sec, []);
      out.get(sec).push(N[id].text);
    }
  }
  return out;
}
const LINES = sectionLines();
const said = (sec, w) => (LINES.get(sec) || []).some(t => squash(t).includes(squash(w)));
const TUTOR_PARTS = ['all', 'att', 'ias', 'alt', 'vs', 'hsi', 'baro'];

test('answer map: one row for every question of chapter 1\'s banks, each the question it says it is', () => {
  const banks = [...new Set([...EXAMS.written1.banks, 'q_radio'])];
  assert.deepEqual(Object.keys(BANK_ANSWERS).sort(), [...banks].sort(), 'chapter 1\'s banks: the written test\'s and the radio\'s');
  for (const b of banks) {
    const bank = FL.quiz.BANKS.find(x => x.id === b);
    assert.equal(BANK_ANSWERS[b].length, bank.qs.length, `${b}: a row a question`);
    BANK_ANSWERS[b].forEach((x, i) => assert.ok(bank.qs[i][0].startsWith(x.q), `${b}#${i}: "${x.q}" is "${bank.qs[i][0]}"`));
  }
  assert.deepEqual(Object.keys(SCENE_ANSWERS).sort(), FL.radio.SCENES.map(s => s.id).sort(), 'every scene of k5');
  assert.deepEqual(Object.keys(DRILL_ANSWERS).sort(), Object.keys(FL.radio.DRILLS).sort(), 'every kind of k3');
  assert.deepEqual(Object.keys(LISTEN_ANSWERS).sort(), Object.keys(FL.radio.LISTEN).sort(), 'every kind of k6');
  for (const p of Object.values(PFD_ANSWERS)) assert.ok(TUTOR_PARTS.includes(p), `k2: ${p} is a part k1 shows`);
});

test('answer map: every answer\'s words are a line of its own section, as the class reads it in full', () => {
  const all = [...Object.entries(BANK_ANSWERS).flatMap(([b, l]) => l.map((x, i) => [`${b}#${i}`, x.a])),
    ...Object.entries(SCENE_ANSWERS), ...Object.entries(DRILL_ANSWERS), ...Object.entries(LISTEN_ANSWERS)];
  let n = 0;
  for (const [id, a] of all) {
    if (a === null) continue;
    assert.ok(Array.isArray(a) && a.length, `${id}: words to say`);
    for (const [sec, w] of a) {
      assert.ok(LINES.has(sec), `${id}: ${sec} is a section of part 1`);
      assert.ok(said(sec, w), `${id}: "${w}" is said in ${sec}`);
      n++;
    }
  }
  assert.ok(n > 200, `${n} lines checked`);
  // (what part 1 does not say is not asked in chapter 1: a few only)
  const none = all.filter(([, a]) => a === null).map(([id]) => id);
  assert.ok(none.length <= 8, `not in part 1: ${none.join(' ')}`);
});
