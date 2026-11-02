#!/usr/bin/env node
// CADET — the ground-school reading load, measured: for every chapter-1 class, run its dialog the way the game does
// (right answers) and count what a cadet must sit through on the REQUIRED path: the textbook units paged onto the
// screen ('page' hooks), the lines shown, the minutes of reading (school.js's own readingSeconds), the decisions
// and the drill's scored questions. A class's required path is the cards' way (the redesign's): each section
// comes as a card (its key points) and five scored questions close the class — the runner takes the first way
// offered at the format's choice, which is the cards'. (The choice has since been restored — じっくり reads
// the whole textbook instead; this tool still measures the cards' way, the redesign's own numbers.) --before
// <json> compares with a run of the classes as
// they were (the three paces of the old classDialogs, measured by the version of this tool from before the
// redesign). Usage: node tools/measure-zagaku.mjs [out.json] [--before before.json]
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSorajima } from '../src/flight/sorajima.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { createCareer } from '../src/career/career.js';
import { classDialogs, heardOf, readingSeconds, CLASS_CHAPTERS } from '../src/content/school.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL;

// a career that has finished the classes before class i (their sections heard), nothing else
const stateFor = (i) => {
  const C = createCareer({ seed: 7 });
  for (let k = 0; k < i; k++) C.done('class', String(k));
  return C.state;
};

// run one class dialog to its end; count the required-path reading load
function runClass(i) {
  const state = stateFor(i);
  const data = classDialogs(FL, i, { seed: 7, heard: heardOf(FL, state) });
  const st = createDialogState(), ctx = { quiz: null };
  const pages = new Set(), sections = new Set();
  let lines = 0, seconds = 0, choices = 0;
  const r = createRunner({ data, state: st, ctx, hooks: { onHook: (n, a) => { if (n === 'page') { const [sec, u] = String(a).split('#'); sections.add(sec); if (u != null) pages.add(a); } if (n === 'quizEnd') ctx.quiz = { n: +a }; } } });
  r.start('class');
  for (let k = 0; k < 6000 && r.running; k++) {
    const v = r.view(); lines++; seconds += readingSeconds(v.text);
    if (v.choices.length) {
      choices++;
      const qi = /^q(\d+)$/.exec(v.node), x = qi ? (data.questions || [])[+qi[1]] : null;
      let idx = 0;
      if (x) { const j = v.choices.findIndex(c => c.text === x.opts[x.ok]); idx = j >= 0 ? j : 0; }
      r.choose(idx);
    } else r.next();
  }
  if (r.running) throw new Error(`class ${i} did not end`);
  return { class: i, unitsPaged: pages.size, sectionsShown: sections.size, lines, readingMin: +(seconds / 60).toFixed(1), choices, scored: ctx.quiz ? ctx.quiz.n : 0 };
}

const rows = [];
for (let i = 0; i < CLASS_CHAPTERS.length; i++) rows.push(runClass(i));
const totals = { unitsPaged: rows.reduce((n, r) => n + r.unitsPaged, 0), lines: rows.reduce((n, r) => n + r.lines, 0), readingMin: +rows.reduce((n, r) => n + r.readingMin, 0).toFixed(1), scored: rows.reduce((n, r) => n + r.scored, 0), sections: rows.reduce((n, r) => n + r.sectionsShown, 0) };
console.log('after the redesign (all 6 classes):', JSON.stringify(totals));
for (const r of rows) console.log(`class ${r.class}: units ${r.unitsPaged}, sections ${r.sectionsShown}, lines ${r.lines}, ${r.readingMin} min, scored ${r.scored}`);
const bi = process.argv.indexOf('--before');
if (bi >= 0 && process.argv[bi + 1]) {
  const before = JSON.parse(fs.readFileSync(process.argv[bi + 1], 'utf8'));
  for (const [pace, t] of Object.entries(before.totals)) {
    const pct = (a, b) => `${((a - b) / b * 100).toFixed(0)}%`;
    console.log(`vs before (${pace}): units ${t.unitsPaged} → ${totals.unitsPaged} (${pct(totals.unitsPaged, t.unitsPaged)}), reading ${t.readingMin} min → ${totals.readingMin} min (${pct(totals.readingMin, t.readingMin)}), scored ${t.scored} → ${totals.scored}`);
  }
}
const outArg = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null;
if (outArg) { fs.writeFileSync(outArg, JSON.stringify({ rows, totals }, null, 1)); console.log('wrote', outArg); }
