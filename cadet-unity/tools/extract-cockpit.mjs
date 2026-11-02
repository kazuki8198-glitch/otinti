// CADET Unity Stage 6 — cockpit control extractor.
// Builds the real cockpit (cadet-wt-free, the current source of truth) in node
// exactly as the repo's own tests do, and dumps every control's pick geometry
// for the C# builder: id / kind / variant / label / hit-box (pos, size or
// cylinder, rotation) / aim point / moving part / extra hit boxes.
// Usage: node extract-cockpit.mjs > ../data/cockpit-controls.json
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import * as THREE from '/home/hatch/workspace/cadet-wt-free/cadet/node_modules/three/build/three.module.js';
import { buildCockpit } from '/home/hatch/workspace/cadet-wt-free/cadet/src/aircraft/cockpit.js';
import { installSorajima } from '/home/hatch/workspace/cadet-wt-free/cadet/src/flight/sorajima.js';

const FL_DIR = '/home/hatch/workspace/cadet-wt-free/flight-lab/src';
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js'])
  vm.runInThisContext(fs.readFileSync(path.join(FL_DIR, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics, SC = FL.school;
const AC = id => P.AIRCRAFT.find(a => a.id === id);

function fakeCanvas(w, h) {
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : () => {}),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g };
}

const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: fakeCanvas, twin: AC('pa44'), boeing: AC('b737') });
// give the cockpit a live lesson state so dynamic labels (softkeys etc.) resolve
const L = SC.startLesson('a1', 'basic');
for (let i = 0; i < 30; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); }
cp.update(1 / 60, { s: L.s, L, av: L.av });
cp.root.updateMatrixWorld(true);

const v3 = v => [v.x, v.y, v.z].map(n => Math.round(n * 1e6) / 1e6);
function shapeOf(mesh) {
  const g = mesh.geometry, p = g.parameters || {};
  if (p.width !== undefined) return { box: [p.width, p.height, p.depth] };
  if (p.radiusTop !== undefined) return { cyl: [Math.max(p.radiusTop, p.radiusBottom), p.height] };
  // fallback: bounding box of the geometry
  g.computeBoundingBox(); const b = g.boundingBox, s = new THREE.Vector3(); b.getSize(s);
  return { box: v3(s) };
}
function worldOf(obj) {
  const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
  obj.updateWorldMatrix(true, false); obj.matrixWorld.decompose(pos, q, sc);
  const e = new THREE.Euler().setFromQuaternion(q, 'XYZ');
  return { pos: v3(pos), rot: [e.x, e.y, e.z].map(n => Math.round(n * 1e6) / 1e6) };
}
function labelOf(c) {
  try { const l = c.label; return typeof l === 'string' ? l : String(l); } catch { return ''; }
}

const out = { source: 'cadet-wt-free/cadet/src/aircraft/cockpit.js', types: {}, switches0: JSON.parse(JSON.stringify(cp.switches)) };
for (const t of ['pa28', 'pa44', 'b737']) {
  cp.setType(t); cp.root.updateMatrixWorld(true);
  const list = [];
  for (const c of cp.controls) {
    const w = worldOf(c.target);
    const rec = { id: c.id, kind: c.kind, type: c.type || 'common', label: labelOf(c), part: c.part || null,
      pos: w.pos, rot: w.rot, aim: v3(c.at), ...shapeOf(c.target) };
    const more = [];
    for (const ch of c.target.children) { const cw = worldOf(ch); more.push({ pos: cw.pos, ...shapeOf(ch) }); }
    if (more.length) rec.more = more;
    list.push(rec);
  }
  out.types[t] = { eye: v3(cp.eye), count: list.length, controls: list };
}
process.stdout.write(JSON.stringify(out, null, 1) + '\n');
