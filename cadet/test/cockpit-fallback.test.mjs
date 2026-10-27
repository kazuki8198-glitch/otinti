// CADET — the cockpit without its Blender model (node --test): src/aircraft/cockpit.js builds every group the model would
// have given it (the top band, the seats, the bench, the glareshield, the yokes, the walls) from its own simple shapes, within the
// same budgets, with the same view from the seat — what a page without assets/model/cockpit.glb, or with an older one,
// draws, and every control of each type still seen and picked from the seat (the stand-ins hide none: the sun visors
// folded up behind the overhead switch panel). The model is replaced by an empty glb (no meshes) before cockpit.js is
// loaded (archer-model.js reads the page's CADET_ASSETS first); the full checks on the cockpit with its model are
// cockpit.test.mjs's.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

// an empty glb: the header and a JSON chunk with no nodes (padded with spaces to 4 bytes)
const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, nodes: [] }).padEnd(48, ' '));
const glb = Buffer.alloc(12 + 8 + json.length);
glb.writeUInt32LE(0x46546c67, 0); glb.writeUInt32LE(2, 4); glb.writeUInt32LE(glb.length, 8);
glb.writeUInt32LE(json.length, 12); glb.writeUInt32LE(0x4e4f534a, 16); json.copy(glb, 20);
globalThis.CADET_ASSETS = { 'model/cockpit': glb.toString('base64') };

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
const { installSorajima } = await import('../src/flight/sorajima.js');
installSorajima(globalThis.FL);
const { buildCockpit, CABIN } = await import('../src/aircraft/cockpit.js');
const FL = globalThis.FL, P = FL.physics, SC = FL.school, AC = id => P.AIRCRAFT.find(a => a.id === id);
const DEG = Math.PI / 180;
const drawn = m => m.isMesh && m.visible && m.layers.test(new THREE.Layers()) && m.material.visible !== false;

test('cockpit without its model: every group made in code, within budget, the same view', () => {
  const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: null }), tw = buildCockpit(FL, AC('pa28'), { makeCanvas: null, twin: AC('pa44') });
  assert.deepEqual(cp.band, [], 'the model read, empty');
  assert.deepEqual(cp.fromCode, ['headliner', 'seats', 'bench', 'glareshield', 'yokes', 'walls']);
  cp.root.updateMatrixWorld(true);
  let calls = 0; cp.root.traverse(o => { if (drawn(o)) calls++; });
  assert.ok(calls <= 40 && cp.triangles <= 40000 && tw.trianglesTwin <= 40000, `${calls} draw calls, ${cp.triangles} / ${tw.trianglesTwin} triangles`);
  // the yokes are the old shapes on their moving parts; the glareshield's lip is the edge seen over the nose (12–15°)
  for (const k of ['yokeL', 'yokeR']) assert.ok(cp.parts[k].children.some(m => m.isMesh && m.name === 'cockpit-' + k), k);
  const ahead = d => new THREE.Vector3(0, -Math.sin(d * DEG), -Math.cos(d * DEG));
  const first = dir => new THREE.Raycaster(cp.eye.clone(), dir, 0, 5).intersectObject(cp.root, true).filter(h => drawn(h.object) && h.object.name !== 'cockpit-glass')[0];
  let edge = null;
  for (let d = 4; d <= 25 && !edge; d += 0.1) { const h = first(ahead(d)); if (h && h.object.name !== 'cockpit-cowl') edge = { d, h }; }
  assert.ok(edge && edge.d >= 12 && edge.d <= 15 && edge.h.object.name === 'cockpit-shell', `the glareshield's edge ${edge && edge.d.toFixed(1)}°`);
  assert.ok(edge.h.point.y > CABIN.PTOP, `the edge is the lip (${edge.h.point.toArray().map(x => x.toFixed(3))})`);
  const top = first(new THREE.Vector3(0, 1, 0));
  assert.ok(top && top.distance >= 0.17 && top.distance <= 0.25, 'the headliner over the eye');
  cp.dispose(); tw.dispose();
});

test('cockpit without its model: every control seen and picked from the seat', () => {
  const tw = buildCockpit(FL, AC('pa28'), { makeCanvas: null, twin: AC('pa44') });
  const L = SC.startLesson('a1', 'basic');
  for (let i = 0; i < 60; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); }
  const bad = [];
  for (const t of ['pa28', 'pa44']) {
    tw.setType(t);
    Object.assign(L.s, { elev: 0, trim: 0.1, ail: 0, rud: 0, rudEff: 0 });          // (as cockpit.test.mjs's controlsCheck)
    for (let i = 0; i < 30; i++) tw.update(1 / 60, { s: L.s, L });
    tw.root.updateMatrixWorld(true);
    const vis = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
    for (const c of tw.controls) {
      const to = tw.aimPoint(c, new THREE.Vector3()), dir = to.clone().sub(tw.eye).normalize();
      const got = tw.pick(new THREE.Raycaster(tw.eye.clone(), dir, 0, 3));
      if (got !== c) bad.push(`${t} ${c.id}: picks ${got ? got.id : 'nothing'}`);
      const f = new THREE.Raycaster(tw.eye.clone(), dir, 0, 5).intersectObject(tw.root, true)
        .filter(h => drawn(h.object) && vis(h.object) && h.object.name !== 'cockpit-glass' && !h.object.name.startsWith('cockpit-labels'))[0];
      if (f && f.distance < to.distanceTo(tw.eye) - 0.03 && f.object.name !== `cockpit-${c.part}`) bad.push(`${t} ${c.id}: hidden by ${f.object.name}`);
    }
  }
  assert.deepEqual(bad, [], 'controls hidden or not picked without the model');
  tw.dispose();
});
