// CADET — the craft pass's in-game shots (not a test): the DRAWN face where it is actually seen — 朝日
// seated in the ch1 class (her own meshes: the drawing, the mouth atlas, the SDF shadow under two suns,
// and a talk, which frames her face itself) and the instructor in the cockpit's right seat.
//   PLAYWRIGHT=$HOME/workspace/glare-tools/pwshim node test/craft-shots.mjs [outDir] [page.html]
// (after a career.set the cast WALKS to its places: give them a simulated minute to arrive and sit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [outDir = path.resolve(here, '../../craft-previews/game'), page = path.resolve(here, '../outputs/CADET.html')] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(loadChromium(), { q: 'high', w: 1280, h: 720, t: 9.6, file: path.resolve(page) });
const ev = (fn, a) => g.page.evaluate(fn, a);
const sim = (s) => ev((s) => window.__cadet.simulate(s, 1 / 30), s);
const settle = async (s = 60) => { for (let k = 0; k < s / 10; k++) await sim(10); };
await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
await ev(() => window.__cadet.pause(true));
const shot = async (name) => {
  const url = await ev(() => { window.__cadet.simulate(0.35, 1 / 30); return window.__cadet.snapshot(2); });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('  shot', name);
};

// ---- 朝日 in the ch1 class, seated (briefing room 2): her own meshes, the drawn face at 0.55 m
await ev(() => window.__cadet.career.set({ state: { chapter: 'ch1', day: 2, slot: 'am', done: { prologue: 1 } }, progress: { lessons: {} }, place: false }));
await settle(60);
const faceHer = async (d, y) => ev(({ d, y }) => {
  const C = window.__cadet, w = C.career.where('asahi'); if (!w) return false;
  const f = w.face || { a: w.a + 1, c: w.c }, da = f.a - w.a, dc = f.c - w.c, l = Math.hypot(da, dc) || 1;
  C.placeWalker(w.a + da / l * d, w.c + dc / l * d, { a: w.a, c: w.c }); C.setMode('walk'); C.lookAt(w.a, w.c, y);
  return { aim: C.aim('asahi') };
}, { d, y });
console.log('asahi aim:', JSON.stringify(await faceHer(0.55, 1.14)));
await sim(1.2);
await shot('asahi-face-am.png');                                  // the morning sun
await ev(() => window.__cadet.setTime(15.8)); await faceHer(0.55, 1.14); await sim(1.2);
await shot('asahi-face-pm.png');                                  // the afternoon sun: the SDF shadow has swung
await ev(() => window.__cadet.setTime(9.6));
// a talk: the game frames her face itself, and her mouth opens and closes on her lines (the atlas blend)
await faceHer(0.85, 1.14); await sim(0.6);
await ev(() => window.__cadet.talk());
for (let k = 0; k < 5; k++) { await sim(0.7); await shot(`asahi-talk${k}.png`); await ev(() => window.__cadet.dialogNext()); }
for (let k = 0; k < 14; k++) { const dl = await ev(() => window.__cadet.dialog()); if (!dl) break; await ev(() => window.__cadet.dialogNext()); }

// ---- the instructor in the cockpit (ch3 flight day, as cockpit-shots stages it)
const GROUND = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], ALL2 = [...GROUND, 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3', 'c1'];
const passed = (ids) => ({ lessons: Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: ['basic'] }])) });
const EX = (...ids) => Object.fromEntries(['written1', 'presolo', ...ids].map(id => [id, { tries: 1, best: 90, pass: true }]));
const d = await ev((o) => {
  const K = window.__cadet.career;
  for (let dd = 40; dd < 160; dd++) {
    K.set({ state: { chapter: o.chapter, day: dd, slot: 'am', done: { prologue: 1 }, exams: o.exams, solo: { day: 30 }, checks: {}, decisions: [{ day: dd, choice: 'go', right: true }] }, progress: o.prog, flags: { met_instructor: true, has_tablet: true, briefed_today: true, brief_checked: true }, trust: { instructor: 75 }, place: false });
    if (K.schedule().some(x => x.kind === 'flight' || x.kind === 'solo') && K.weather().kind === 'good') return dd;
  }
  return -1;
}, { chapter: 'ch3', exams: EX(), prog: passed(ALL2) });
console.log('flight day', d);
await settle(30);
await ev(() => window.__cadet.setMode('walk')); await sim(0.3);
await ev(() => window.__cadet.fly.board(true)); await sim(0.6);
for (let k = 0; k < 12; k++) {
  const dl = await ev(() => window.__cadet.dialog()); if (!dl) break;
  const re = ['^基礎', '^始めます', '^今日の 1 日'].find(r => dl.choices.some(c => new RegExp(r).test(c.text)));
  if (dl.choices.length) await ev((re) => window.__cadet.dialogChoose(re), re || dl.choices[0].text); else await ev(() => window.__cadet.dialogNext());
}
for (let k = 0; k < 5; k++) await sim(1);
await ev(() => window.__cadet.fly.look(-52, -3)); await sim(0.3);
await shot('instructor-face.png');
await ev(() => window.__cadet.fly.look(-30, -8)); await sim(0.3);
await shot('instructor-34.png');
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
