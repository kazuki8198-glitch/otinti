// the craft pass's face close-ups, aimed by name: the head nearest the person's own frame position
// (the walker camera's world position gives the frame→world offset). 朝日 + 桐生 in the class (AM/PM),
// 教官 on the apron (AM/PM — the SDF swing in open sun).
//   PLAYWRIGHT=$HOME/workspace/glare-tools/pwshim node test/craft-faces.mjs [outDir]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const [outDir = path.resolve(here, '../../craft-previews/faces')] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const g = await openGame(loadChromium(), { q: 'high', w: 1280, h: 720, t: 9.6, file: path.resolve(here, '../outputs/CADET.html') });
const ev = (fn, a) => g.page.evaluate(fn, a);
const sim = (s) => ev((s) => window.__cadet.simulate(s, 1 / 30), s);
const settle = async (s = 60) => { for (let k = 0; k < s / 10; k++) await sim(10); };
await g.page.waitForFunction(() => !window.__cadet.career.cards(), null, { timeout: 60000 });
await ev(() => window.__cadet.pause(true));
const shot = async (name) => {
  const url = await ev(() => { window.__cadet.simulate(0.3, 1 / 30); return window.__cadet.snapshot(2); });
  fs.writeFileSync(path.join(outDir, name), Buffer.from(url.split(',')[1], 'base64'));
  console.log('  shot', name);
};
const closeFace = (who, dist = 0.42, azDeg = 0) => ev(({ who, dist, azDeg }) => {
  const C = window.__cadet, cam = C.camera, V = cam.position.constructor;
  const w = who === 'instructor' ? C.instructor().at : C.career.where(who);
  if (!w) return null;
  const pl = C.player(), off = cam.position.clone().sub(new V(pl.c, 0, -pl.a));
  const target = new V(w.c, 0, -w.a).add(off);
  let best = null, bd = 1e9;
  C.scene.traverse(o => {
    if (o.name === 'actor-head' && o.visible) {
      const p = o.getWorldPosition(new V());
      const d = Math.hypot(p.x - target.x, p.z - target.z);
      if (d < bd) { bd = d; best = o; }
    }
  });
  if (!best) return null;
  const hp = best.getWorldPosition(new V());
  const hq = best.getWorldQuaternion(new cam.quaternion.constructor());
  const fwd = new V(0, 0, 1).applyQuaternion(hq); fwd.y = 0; fwd.normalize();
  const side = new V(1, 0, 0).applyQuaternion(hq);
  const az = azDeg * Math.PI / 180, dir = fwd.multiplyScalar(Math.cos(az)).add(side.multiplyScalar(Math.sin(az)));
  const eye = hp.clone().add(dir.multiplyScalar(dist)); eye.y = hp.y + 0.01;
  C.setPose(eye.toArray(), hp.toArray());
  return { bd: +bd.toFixed(2) };
}, { who, dist, azDeg });

// the class
await ev(() => window.__cadet.career.set({ state: { chapter: 'ch1', day: 2, slot: 'am', done: { prologue: 1 } }, progress: { lessons: {} }, place: false }));
await settle(60);
await ev(() => { const C = window.__cadet, w = C.career.where('asahi'); C.placeWalker(w.a + 1.2, w.c, { a: w.a, c: w.c }); C.setMode('walk'); });
await sim(0.5);
console.log('asahi:', JSON.stringify(await closeFace('asahi')));
await shot('asahi-front-am.png');
await closeFace('asahi', 0.5, 28); await shot('asahi-34-am.png');
console.log('kiryu:', JSON.stringify(await closeFace('kiryu')));
await shot('kiryu-front-am.png');
await ev(() => window.__cadet.setTime(15.8));
await closeFace('kiryu'); await shot('kiryu-front-pm.png');
await closeFace('asahi'); await shot('asahi-front-pm.png');
await ev(() => window.__cadet.setTime(9.6));

// the instructor on the apron
const GROUND = ['k1', 'k2', 'k3', 'k4', 'k5', 'k6'], ALL2 = [...GROUND, 'a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't2', 't4', 'e1', 'e2', 'e3', 't1', 't3', 'c1'];
const passed = (ids) => ({ lessons: Object.fromEntries(ids.map(id => [id, { tries: 1, best: 'S', pass: true, levels: ['basic'] }])) });
const EX = (...ids) => Object.fromEntries(['written1', 'presolo', ...ids].map(id => [id, { tries: 1, best: 90, pass: true }]));
await ev((o) => {
  const K = window.__cadet.career;
  for (let dd = 40; dd < 160; dd++) {
    K.set({ state: { chapter: o.chapter, day: dd, slot: 'am', done: { prologue: 1 }, exams: o.exams, solo: { day: 30 }, checks: {}, decisions: [{ day: dd, choice: 'go', right: true }] }, progress: o.prog, flags: { met_instructor: true, has_tablet: true, briefed_today: true, brief_checked: true }, trust: { instructor: 75 }, place: false });
    if (K.schedule().some(x => x.kind === 'flight' || x.kind === 'solo') && K.weather().kind === 'good') return dd;
  }
  return -1;
}, { chapter: 'ch3', exams: EX(), prog: passed(ALL2) });
await settle(45);
await ev(() => { const C = window.__cadet, ins = C.instructor(); C.placeWalker(ins.at.a + 1.4, ins.at.c, { a: ins.at.a, c: ins.at.c }); C.setMode('walk'); });
await sim(0.5);
console.log('instructor:', JSON.stringify(await closeFace('instructor')));
await shot('instructor-front-am.png');
await ev(() => window.__cadet.setTime(15.8));
await closeFace('instructor'); await shot('instructor-front-pm.png');
await closeFace('instructor', 0.5, -25); await shot('instructor-34-pm.png');
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
