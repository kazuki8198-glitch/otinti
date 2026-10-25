// CADET — test/perf.mjs : the draw calls and triangles of the busiest places as the game shows them (not the visit
// camera's viewpoints): the apron by today's aircraft with the instructor and the mechanic, the lobby on the morning
// everyone is there (the graduation), the Seminole's day on the apron, and its cockpit. No pictures (the frames are
// drawn by the page's own loop for a moment, then read). One browser.
//   node test/perf.mjs [quality=high] [apron,lobby,seminole,cockpit]  (the software renderer here runs out of memory
//   after three or four places: the cockpit in a run of its own)
import { loadChromium, openGame } from './shots.mjs';

const [q = 'high', only = ''] = process.argv.slice(2);
const want = (k) => !only || only.split(',').includes(k);
const g = await openGame(loadChromium(), { q, w: 960, h: 540, t: 9.6 });
const ev = (f, a) => g.page.evaluate(f, a);
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
await ev(() => window.__cadet.pause(true));
const G = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'];
const ALL = [...G, 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3', 'c1', 'x3', 'x1', 'x2', 'n1', 'n2', 'n3', 'i1', 'i2', 'i3', 'i4', 'i5', 'm1', 'm2', 'm3', 'm4', 'm5', 'r1'];
async function measure(name) {
  await ev(() => window.__cadet.frame(3));
  const s = await ev(() => window.__cadet.stats());
  console.log(`${name.padEnd(28)} calls ${String(s.calls).padStart(4)}  triangles ${String(s.triangles).padStart(7)}  (all passes ${s.all})`);
  return s;
}
const day = (chapter, kind, extra = {}) => ev(({ chapter, kind, ALL, G, extra }) => {
  const K = window.__cadet.career;
  const P = { lessons: Object.fromEntries(ALL.filter(id => chapter === 'ch2' ? G.includes(id) : true).filter(id => !(chapter === 'ch5' && /^m/.test(id)) && !(chapter === 'ch6' && id === 'r1')).map(id => [id, { tries: 1, best: 'S', pass: true, levels: G.includes(id) ? [] : ['basic'] }])) };
  const EX = Object.fromEntries(['written1', 'presolo', 'nav', 'instr', 'multi', 'final'].map(id => [id, { tries: 1, best: 90, pass: true }]));
  for (let d = 40; d < 160; d++) {
    K.set({ state: { chapter, day: d, slot: 'morning', done: { prologue: 1 }, exams: EX, solo: { day: 30 }, checks: { xc: { tries: 1, pass: true, day: 40 }, ir: { tries: 1, pass: true, day: 40 }, me: { tries: 1, pass: true, day: 40 }, ...(extra.checks || {}) }, decisions: [{ day: d, choice: 'go', right: true }] }, progress: P, flags: { met_instructor: true, has_tablet: true, briefed_today: true }, trust: { instructor: 70 } });
    if (K.schedule().some(x => x.kind === kind)) return d;
  }
  return -1;
}, { chapter, kind, ALL, G, extra });
const out = {};
// the apron (chapter 2): by today's Archer, the instructor waiting there
if (want('apron')) {
await day('ch2', 'flight');
await ev(() => { const C = window.__cadet, t = C.spec.target; C.setMode('walk'); C.placeWalker(t.a + 9, t.c + 7, { a: t.a, c: t.c }); });
out.apron = await measure('apron (Archer)');
}
// the lobby on the graduation morning (everyone there)
if (want('lobby')) {
await day('ch6', 'graduation', { checks: { final: { tries: 1, pass: true, day: 41 } } });
await ev(() => { const C = window.__cadet; C.setMode('walk'); C.placeWalker(655.0, 274.0, { a: 655.0, c: 262.0 }); });
out.lobby = await measure('lobby (graduation)');
}
// the Seminole's day on the apron, and its cockpit
if (want('seminole') || want('cockpit')) {
await day('ch5', 'flight');
await ev(() => { const C = window.__cadet, t = C.spec.target; C.setMode('walk'); C.placeWalker(t.a + 9, t.c + 7, { a: t.a, c: t.c }); });
if (want('seminole')) out.seminole = await measure('apron (Seminole)');
if (want('cockpit')) {
await ev(() => window.__cadet.fly.board(true)); await sleep(500);
await ev(() => { const C = window.__cadet; while (C.dialog()) { const v = C.dialog(); if (v.choices.length) C.dialogChoose(0); else C.dialogNext(); } C.fly.view('cockpit'); C.fly.look(0, -8); });
}
if (want('cockpit')) out.cockpit = await measure('cockpit (Seminole)');
}
console.log(JSON.stringify(out));
console.log('errors:', g.errors.filter(e => !/KHR_parallel/.test(e)).join(' | ') || 'none');
await g.browser.close();
