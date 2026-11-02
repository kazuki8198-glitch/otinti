// the polish pass's acceptance shots (not a test): the same staging every round.
//   PLAYWRIGHT=$HOME/workspace/glare-tools/pwshim node test/craft-polish.mjs [outDir]
// How a person is framed (learned across rounds 9's three failed baselines):
//  - the head is found by its OWNER (cast roots are named npc-<id>; 教官's root is unnamed) — a
//    nearest-head pick flips to a neighbour the moment the subject sits or steps away;
//  - the camera direction comes from the actor ROOT's quaternion (the body's facing), never the
//    head bone's: the head turns with the gaze, and a turned head throws the camera metres off;
//  - 朝日's 1.5 m frontal is NOT taken in the class: the peers sit in a column facing the lecturer
//    1.2 m apart, so a 1.5 m frontal camera lands 0.31 m behind 桐生's head, dead on the axis
//    (measured, round 9). Her conversational frontal is taken in the dorm common room instead,
//    where she sits facing open space. Every shot logs a blockage probe (any other head within
//    0.6 m of the camera) so a blocked frame can never pass silently again.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadChromium, openGame } from './shots.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const [outDir = path.resolve(here, '../../craft-previews/polish')] = process.argv.slice(2);
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
const aim = (who, dist = 0.7, azDeg = 0, lift = 0.03) => ev(({ who, dist, azDeg, lift }) => {
  const C = window.__cadet, cam = C.camera, V = cam.position.constructor;
  let best = null, root = null;
  C.scene.traverse(o => {
    if (o.name !== 'actor-head' || !o.visible || best) return;
    let p = o, owner = null;
    while (p) { if (p.name && p.name.startsWith('npc-')) { owner = p.name.slice(4); root = p; break; } if (p.name === 'actor' && !root) root = p; p = p.parent; }
    if (who === 'instructor' ? (owner === null && Math.abs(o.getWorldPosition(new V()).x) < 1000) : owner === who) best = o;
  });
  if (!best) return null;
  const hp = best.getWorldPosition(new V());
  const hq = (root || best).getWorldQuaternion(new cam.quaternion.constructor());
  const fwd = new V(0, 0, 1).applyQuaternion(hq); fwd.y = 0; fwd.normalize();
  const side = new V(1, 0, 0).applyQuaternion(hq);
  const az = azDeg * Math.PI / 180, dir = fwd.multiplyScalar(Math.cos(az)).add(side.multiplyScalar(Math.sin(az)));
  // the face-visibility check (front and three-quarter views only): the body's facing is not the
  // face's — 教官 in his preflight circuit stands with his back to where his root's +z points, and
  // any head may be turned hard away. If the head's own forward does not meet the camera, frame the
  // other side: a "front" shot of the back of a head passes every numeric check and judges nothing.
  if (azDeg !== 180) {
    const hf = new V(0, 0, 1).applyQuaternion(best.getWorldQuaternion(new cam.quaternion.constructor())); hf.y = 0; hf.normalize();
    if (hf.dot(dir) < 0.25) dir.multiplyScalar(-1);
  }
  const eye = hp.clone().add(dir.multiplyScalar(dist)); eye.y = hp.y + lift;
  C.setPose(eye.toArray(), hp.toArray());
  // the blockage probe: any other head within 0.6 m of the camera
  const blocked = [];
  C.scene.traverse(o => {
    if (o.name !== 'actor-head' || o === best) return;
    const p = o.getWorldPosition(new V());
    if (p.distanceTo(eye) < 0.6) blocked.push(p.distanceTo(eye).toFixed(2));
  });
  return { hp: hp.toArray().map(n => +n.toFixed(2)), blocked };
}, { who, dist, azDeg, lift });
const views = async (who, tag, with15 = true) => {
  const r = await aim(who, 0.7, 0, 0.03);
  const check = await ev((w) => window.__cadet.aim(w), who);
  console.log(who, tag, JSON.stringify(r), 'aim°:', check === null ? '—' : +check.toFixed(1));
  await shot(`${who}-front07-${tag}.png`);
  if (with15) { await aim(who, 1.5, 0, 0.05); await shot(`${who}-front15-${tag}.png`); }
  await aim(who, 0.9, 30, 0.05); await shot(`${who}-34-${tag}.png`);
  await aim(who, 1.0, 180, 0.08); await shot(`${who}-back-${tag}.png`);
};

// ---- the class (ch1 day 2): 朝日・桐生・森 at the briefing table, their own meshes
await ev(() => window.__cadet.career.set({ state: { chapter: 'ch1', day: 2, slot: 'am', done: { prologue: 1 } }, progress: { lessons: {} }, place: false }));
await settle(60);
await ev(() => { const C = window.__cadet, w = C.career.where('asahi'); C.placeWalker(w.a + 1.2, w.c, { a: w.a, c: w.c }); C.setMode('walk'); });
await sim(0.5);
await views('asahi', 'am', false);
await views('kiryu', 'am', false);
await views('mori', 'am', false);
await ev(() => window.__cadet.setTime(15.8));
await views('asahi', 'pm', false);
await ev(() => window.__cadet.setTime(9.6));

// ---- the dorm common room (ch1 day 2, evening): 朝日 facing open space — her 1.5 m frontal
await ev(() => window.__cadet.career.set({ state: { chapter: 'ch1', day: 2, slot: 'evening', done: { prologue: 1 } }, progress: { lessons: {} }, place: false }));
await settle(90);
await ev(() => { const C = window.__cadet, w = C.career.where('asahi'); if (w) { C.placeWalker(w.a, w.c + 1.2, { a: w.a, c: w.c }); C.setMode('walk'); } });
await sim(0.5);
console.log('dorm asahi at:', JSON.stringify(await ev(() => window.__cadet.career.where('asahi'))));
await views('asahi', 'dorm');

// ---- the instructor on the apron (ch3 flight day)
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
// he walks a preflight circuit and turns at every waypoint: wait for a pause before framing him
const headPos = (who) => ev((who) => {
  const C = window.__cadet, V = C.camera.position.constructor; let out = null;
  C.scene.traverse(o => {
    if (o.name !== 'actor-head' || !o.visible || out) return;
    let p = o, owner = null;
    while (p) { if (p.name && p.name.startsWith('npc-')) { owner = p.name.slice(4); break; } p = p.parent; }
    if (who === 'instructor' ? (owner === null && Math.abs(o.getWorldPosition(new V()).x) < 1000) : owner === who) out = o.getWorldPosition(new V()).toArray();
  });
  return out;
}, who);
const waitStill = async (who) => {
  for (let k = 0; k < 14; k++) {
    const a = await headPos(who); await sim(1.0); const b = await headPos(who);
    if (a && b && Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) < 0.03) return true;
  }
  return false;
};
console.log('instructor still:', await waitStill('instructor'));
await views('instructor', 'am');
await ev(() => window.__cadet.setTime(15.8));
console.log('instructor head at PM:', JSON.stringify(await headPos('instructor')));
await waitStill('instructor');
await views('instructor', 'pm');
// the SDF acceptance shot: PM side light on the cheek — his absolute yaw is the circuit's, not mine,
// so take the frontal at three azimuths and judge the set for the shaped shadow
for (const az of [-50, 0, 50]) { await aim('instructor', 0.7, az, 0.03); await shot(`instructor-sdf${az < 0 ? 'm50' : az > 0 ? 'p50' : '0'}-pm.png`); }
console.log('errors:', JSON.stringify(g.errors || []));
await g.browser.close();
