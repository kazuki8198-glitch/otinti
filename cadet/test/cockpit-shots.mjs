// CADET — the cockpit from the left seat (docs/cockpit): the Archer's (chapter 2) and the Seminole's (chapter 5), on
// the stand with the engines off, at 1280×720 (the game's own frame). For comparing the cockpits (before / after).
//   node test/cockpit-shots.mjs [quality] [outDir] [prefix] [page.html] [pa28|pa44|both] [ahead,quadrant,left,right,up,backR]
// (up: the headliner and the visors; backR: the pilot's own seat back and headrest, close, and the instructor's seat)
// (in the cloud's software renderer the browser's memory grows by gigabytes with each picture: one view a run there)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/cockpit'), prefix = '', page = path.resolve(here, '../outputs/CADET.html'), which = 'both', only = ''] = process.argv.slice(2);
const ONLY = only ? only.split(',') : null;
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(loadChromium(), { q, w: 1280, h: 720, t: 9.6, file: path.resolve(page) });
const ev = (fn, a) => g.page.evaluate(fn, a);
const sim = (s) => ev((s) => window.__cadet.simulate(s, 1 / 30), s);
const shot = async (name) => { const url = await ev(() => window.__cadet.snapshot(2)); fs.writeFileSync(path.join(outDir, prefix + name), Buffer.from(url.split(',')[1], 'base64')); console.log('  shot', name); };
await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
await ev(() => window.__cadet.pause(true));
const GROUND = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], ALL2 = [...GROUND, 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3', 'c1'];
const passed = (ids) => ({ lessons: Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: ['basic'] }])) });
const EX = (...ids) => Object.fromEntries(['written1', 'presolo', ...ids].map(id => [id, { tries: 1, best: 90, pass: true }]));
const CHK = (...ids) => Object.fromEntries(ids.map(id => [id, { tries: 1, pass: true, day: 40 }]));
const day = (o) => ev((o) => {
  const K = window.__cadet.career;
  for (let d = 40; d < 160; d++) {
    K.set({ state: { chapter: o.chapter, day: d, slot: 'am', done: { prologue: 1 }, exams: o.exams, solo: { day: 30 }, checks: o.checks || {}, decisions: [{ day: d, choice: 'go', right: true }] }, progress: o.prog, flags: { met_instructor: true, has_tablet: true, briefed_today: true, brief_checked: true }, trust: { instructor: 75 }, place: false });
    if (K.schedule().some(x => x.kind === 'flight' || x.kind === 'solo') && K.weather().kind === 'good') return d;
  }
  return -1;
}, o);
const types = which === 'both' ? ['pa28', 'pa44'] : [which];
for (const t of types) {
  const d = t === 'pa28' ? await day({ chapter: 'ch3', exams: EX(), prog: passed(ALL2) })
    : await day({ chapter: 'ch5', exams: EX('nav', 'instr'), checks: CHK('xc', 'ir'), prog: passed([...ALL2, 'x3', 'x1', 'x2', 'n1', 'n2', 'n3', 'i1', 'i2', 'i3', 'i4', 'i5']) });
  console.log(t, 'day', d, await ev(() => window.__cadet.career.aircraft()));
  await ev(() => window.__cadet.setMode('walk')); await sim(0.3);
  await ev(() => window.__cadet.fly.board(true)); await sim(0.6);
  // the talk on sitting down: the day begun (the engines still cold), so the head is the cadet's own again
  for (let k = 0; k < 12; k++) {
    const d = await ev(() => window.__cadet.dialog()); if (!d) break;
    const re = ['^基礎', '^始めます', '^今日の 1 日'].find(r => d.choices.some(c => new RegExp(r).test(c.text)));
    if (d.choices.length) await ev((re) => window.__cadet.dialogChoose(re), re || d.choices[0].text); else await ev(() => window.__cadet.dialogNext());
  }
  for (let k = 0; k < 5; k++) await sim(1);                     // (the instructor's lines: the head goes to him while he talks)
  // (yaw + to the left)
  for (const [name, yaw, pitch] of [['ahead', 0, -8], ['quadrant', -4, -40], ['left', 70, -10], ['right', -60, -6], ['up', 0, 28], ['backR', -145, -14]]) {
    if (ONLY && !ONLY.includes(name)) continue;
    await ev(({ yaw, pitch }) => window.__cadet.fly.look(yaw, pitch), { yaw, pitch }); await sim(0.2);
    await shot(`${t}-${name}.png`);
  }
  await ev(() => window.__cadet.fly.leave()); await sim(0.6);
}
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
