// CADET — the Phase 4 screenshots (docs/tower): the tower's hall, its stair, the cab with the controller,
// hangar 2's workshop and hangar 1's spare aircraft, at 1280×720.
//   node test/tower-shots.mjs [quality] [outDir]
// Needs Playwright's Chromium (test/shots.mjs loadChromium); on a machine without it this only says so.
// The climb is the real thing: walkRoute walks the cadet through the entrance, the stair door and all five
// flights with the game's own walker, collisions and doors — if the stair cannot be climbed, scene 03 fails.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const chromium = loadChromium();
if (!chromium) { console.error('tower-shots: Playwright not found — the screenshots need a machine with Chromium'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/tower')] = process.argv.slice(2);
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
await K({ state: { chapter: 'ch2', day: 16, slot: 'am', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: { lessons: { ...ground, a1: { tries: 1, best: 'S', pass: true, levels: ['basic'] } } }, flags: { met_instructor: true, has_tablet: true }, place: false });

// 01 the hall: in the entrance, looking at the shaft and the stair door
await place(721.0, 255.5, { a: 723.3, c: 261.0 }); await sim(1.0);
await shot('01-tower-hall.jpg');

// 02 + 03 the climb and the cab: walk the whole stair with the real walker, then look out over the apron
const route = await ev(() => window.__cadet.walkRoute([
  { a: 721.0, c: 258.5 }, { a: 722.4, c: 261.0 }, { a: 723.9, c: 261.0 },          // the hall, to and through the stair door
  { a: 721.0, c: 260.9 }, { a: 719.4, c: 262.0 }, { a: 721.0, c: 263.15 }, { a: 722.6, c: 262.0 },
  { a: 721.0, c: 260.9 }, { a: 719.4, c: 262.0 }, { a: 721.0, c: 263.15 }, { a: 722.6, c: 262.0 },
  { a: 721.0, c: 260.9 }, { a: 720.6, c: 262.6 },                                  // flight 5, and into the cab
], { maxT: 240 }));
console.log('walkRoute:', JSON.stringify(route && route.log ? route.log.slice(-2) : route).slice(0, 200));
await ev(() => window.__cadet.lookAt(640.0, 214.0, 2.0)); await sim(0.6);
await shot('03-tower-cab.jpg');

// 04 hangar 2 in the afternoon: the mechanic at work by the hangar's aircraft, the benches behind the camera turn
await K({ state: { chapter: 'ch2', day: 16, slot: 'pm', done: { prologue: 1 }, exams: { written1: { tries: 1, best: 90, pass: true } } }, progress: { lessons: { ...ground, a1: { tries: 1, best: 'S', pass: true, levels: ['basic'] } } }, flags: { met_instructor: true, has_tablet: true }, place: false });
await place(558.0, 266.0, { a: 552.0, c: 279.5 }); await sim(1.0);
await shot('04-hangar-workshop.jpg');

// 05 hangar 1: the spare aircraft under the roof, the shelves along the back wall
await place(492.0, 249.0, { a: 497.0, c: 264.0 }); await sim(1.0);
await shot('05-hangar-spare.jpg');

console.log('done:', outDir);
