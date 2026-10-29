// CADET — today's Archer from outside (docs/aircraft): round it on its stand, close to the nose and the tail, and along
// the row of parked aircraft, at 1280×720 (the game's own frame, no HUD). For comparing the aircraft's models
// (before / after).
//   node test/aircraft-shots.mjs [quality] [outDir] [prefix] [page.html] [front,side,…]   (only those)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/aircraft'), prefix = '', page = path.resolve(here, '../outputs/CADET.html'), only = ''] = process.argv.slice(2);
const ONLY = only ? only.split(',') : null;
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(loadChromium(), { q, w: 1280, h: 720, t: 9.6, file: path.resolve(page) });
const ev = (fn, a) => g.page.evaluate(fn, a);
await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
await ev(() => window.__cadet.pause(true));
// a morning of chapter 2 (today's aircraft on its stand, its walk-around not begun)
const ground = Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(k => [k, { tries: 1, best: 'S', pass: true, levels: [] }]));
await ev((ground) => window.__cadet.career.set({ state: { chapter: 'ch2', day: 12, slot: 'am', done: { prologue: 1 } }, progress: { lessons: ground }, flags: { met_instructor: true, has_tablet: true }, place: false }), ground);
await ev(() => { window.__cadet.setMode('walk'); window.__cadet.simulate(0.5, 1 / 30); });
// today's aircraft: on stand 19 (along 636.5, across 207.2), its nose to the west (−across), its right wing to the north
const A = 636.5, C = 207.2;
const VIEWS = {
  front: [[A + 6.5, C - 7.5], [A, C - 0.6, 0.9]],
  side: [[A + 10.5, C + 0.2], [A, C + 0.2, 0.9]],
  rear: [[A - 6.5, C + 8.5], [A, C + 1.0, 1.0]],
  nose: [[A + 1.8, C - 5.6], [A + 0.1, C - 3.0, 0.75]],
  wing: [[A + 4.5, C - 2.6], [A + 1.6, C + 0.2, 0.3]],
  tail: [[A + 2.8, C + 6.8], [A, C + 3.6, 1.35]],
  row: [[A + 14, C - 16], [A - 70, C - 6, 0.6]],
};
for (const [name, [[wa, wc], [la, lc, ly]]] of Object.entries(VIEWS)) {
  if (ONLY && !ONLY.includes(name)) continue;
  console.log('  shooting', name, new Date().toISOString().slice(11, 19));
  const url = await ev(({ wa, wc, la, lc, ly }) => {
    const W = window.__cadet; W.placeWalker(wa, wc, { a: la, c: lc }); W.lookAt(la, lc, ly); W.simulate(0.4, 1 / 30);
    return W.snapshot(2);
  }, { wa, wc, la, lc, ly });
  fs.writeFileSync(path.join(outDir, `${prefix}${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
}
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
