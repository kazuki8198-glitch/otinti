// CADET — the people up close (docs/actor): everyone by the aircraft on the day of the first solo, and some of them
// face to face, at 1280×720 (the game's own frame, no HUD). For comparing the people's models (before / after).
//   node test/actor-shots.mjs [quality] [outDir] [prefix] [page.html] [group,chief,…]   (only those)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const [q = 'high', outDir = path.resolve(here, '../docs/actor'), prefix = '', page = path.resolve(here, '../outputs/CADET.html'), only = ''] = process.argv.slice(2);
const ONLY = only ? only.split(',') : null;
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(loadChromium(), { q, w: 1280, h: 720, t: 0, file: path.resolve(page) });
const ev = (fn, a) => g.page.evaluate(fn, a);
await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
await ev(() => window.__cadet.pause(true));
const shot = async (name) => {
  if (ONLY && !ONLY.includes(name)) return;
  console.log('  shooting', name, new Date().toISOString().slice(11, 19));
  const url = await ev(() => { window.__cadet.simulate(0.4, 1 / 30); return window.__cadet.snapshot(2); });
  fs.writeFileSync(path.join(outDir, `${prefix}${name}.png`), Buffer.from(url.split(',')[1], 'base64'));
};
// the day of the first solo (as docs/m5 11): everyone on the apron by today's aircraft
const ground = Object.fromEntries(['k1', 'k2', 'k3', 'k4', 'k5', 'k6'].map(k => [k, { tries: 1, best: 'S', pass: true, levels: [] }]));
await ev((ground) => window.__cadet.career.set({ state: { chapter: 'ch2', day: 30, slot: 'am', done: { prologue: 1 } }, progress: { lessons: ground }, flags: { met_instructor: true, has_tablet: true }, place: false }), ground);
await ev(() => { window.__cadet.career.stageCelebrate(); });
const W = (fn, a) => ev(fn, a);
await W(() => { const C = window.__cadet; C.placeWalker(641.6, 216.4, { a: 637.6, c: 212.4 }); C.setMode('walk'); C.simulate(0.5, 1 / 30); });
await shot('group');
// face to face: 1.0 m in front of them (as they face), and their face from 0.55 m
for (const [id, d, name] of ['chief', 'asahi', 'mori', 'mechanic'].flatMap(id => [[id, 1.0, id], [id, 0.55, 'face-' + id]])) {
  if (ONLY && !ONLY.includes(name)) continue;
  const ok = await W(({ id, d }) => {
    const C = window.__cadet, w = C.career.where(id); if (!w) return false;
    const f = w.face || { a: w.a + 1, c: w.c }, da = f.a - w.a, dc = f.c - w.c, l = Math.hypot(da, dc) || 1;
    C.placeWalker(w.a + da / l * d, w.c + dc / l * d, { a: w.a, c: w.c }); C.lookAt(w.a, w.c, d < 0.8 ? 1.52 : 1.45); C.simulate(0.3, 1 / 30);
    return true;
  }, { id, d });
  if (ok) await shot(name); else console.log('  (not there)', id);
}
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
