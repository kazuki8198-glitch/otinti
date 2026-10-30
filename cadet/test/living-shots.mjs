// CADET — the Phase 2 screenshots (docs/living): people walking, sitting and at their small doings, at 1280×720.
//   node test/living-shots.mjs [quality] [outDir]
// Needs Playwright's Chromium (test/shots.mjs loadChromium); on a machine without it this only says so.
// Scenes: 01 the class seated in briefing room 2 · 02 the dispatcher seated at her desk · 03 a cadet on his way
// through the south corridor (the slot changes under him: he walks) · 04 the evening in the dorm common room.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const chromium = loadChromium();
if (!chromium) { console.error('living-shots: Playwright not found — the screenshots need a machine with Chromium'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/living')] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(chromium, { q, w: 1280, h: 720, t: 0 });
const ev = (fn, a) => g.page.evaluate(fn, a);
const cdp = await g.page.context().newCDPSession(g.page);
const shot = async (name, frames = 2) => {
  await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
  await ev((n) => {
    document.body.classList.add('locked'); document.getElementById('toast')?.classList.remove('show');
    const url = window.__cadet.snapshot(n);
    const im = document.createElement('img'); im.id = 'shotbg'; im.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;z-index:0;pointer-events:none';
    document.getElementById('view').after(im);
    return new Promise((done) => { im.onload = () => done(); im.src = url; });
  }, frames);
  await g.page.waitForTimeout(400);
  const r = await cdp.send('Page.captureScreenshot', { format: 'jpeg', quality: 86 });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(r.data, 'base64'));
  await ev(() => { document.getElementById('shotbg')?.remove(); document.body.classList.remove('locked'); });
  console.log(name);
};
await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
await ev(() => window.__cadet.pause(true));
const sim = (s, dt = 1 / 30) => ev(({ s, dt }) => window.__cadet.simulate(s, dt), { s, dt });
const K = (o) => ev((o) => window.__cadet.career.set(o), o);
const place = (a, c, look) => ev(({ a, c, look }) => { const W = window.__cadet; W.placeWalker(a, c, look); W.setMode('walk'); }, { a, c, look });
const ground = Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(k => [k, { tries: 1, best: 'S', pass: true, levels: [] }]));

// 01 the class: the cadets seated in briefing room 2's chairs, the lecturer at the board
await K({ state: { chapter: 'ch1', day: 2, slot: 'am', done: { prologue: 1 } }, progress: { lessons: {} }, place: false });
await place(630.5, 258.6, { a: 622.0, c: 255.0 }); await sim(1.0);
await shot('01-class-seated.jpg');

// 02 dispatch: Saeki seated at her desk, at the screen
await K({ state: { chapter: 'ch2', day: 16, slot: 'morning', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: { lessons: { ...ground, a1: { tries: 1, best: 'S', pass: true, levels: ['basic'] } } }, flags: { met_instructor: true, has_tablet: true, met_dispatcher: true }, place: false });
await place(668.6, 256.4, { a: 667.0, c: 250.5 }); await sim(1.0);
await shot('02-dispatch-seated.jpg');

// 03 on the way: from the morning lobby the slot turns to the class — the cadets walk to briefing room 2 while
// the cadet watches from the south corridor (they pass its doors on the way)
await K({ state: { chapter: 'prologue', day: 1, slot: 'morning', done: {} }, place: false });
await place(643.0, 262.3, { a: 620.0, c: 262.3 }); await sim(0.5);
await K({ state: { chapter: 'ch1', day: 2, slot: 'am', done: { prologue: 1 } }, progress: { lessons: {} }, place: false });
await place(643.0, 262.3, { a: 620.0, c: 262.3 });
await sim(14);
await shot('03-walking-corridor.jpg');

// 04 the evening: the cadets on the common room's sofas, one at the table with a book
await K({ state: { chapter: 'ch2', day: 13, slot: 'evening', done: { prologue: 1 } }, progress: { lessons: { ...ground } }, flags: { met_instructor: true, has_tablet: true }, place: false });
await place(634.8, 384.5, { a: 632.0, c: 383.0 }); await sim(1.0);
await shot('04-dorm-evening.jpg');

await g.browser.close();
console.log('done', fs.readdirSync(outDir).join(' '));
