// CADET — cockpit tests (node --test): the flown Archer's cabin (src/aircraft/cockpit.js, src/aircraft/g1000.js), without a
// browser (the canvases are fakes that take every 2D call).
//  - it builds within budget: ≤ 40 draw calls, ≤ 40,000 triangles, ≤ 6 MB of textures; the screens are unlit (their
//    material not tone mapped: CADET's OutputPass still tone maps the whole image), never mipmapped;
//  - the view from the left seat: the PFD ahead and below, the MFD to its right, the whole of both displays in sight
//    (the bezels' lips hide nothing), the glareshield ~12–15° below the eye with the cowling over it, the roof ~0.2 m
//    over the head, nothing within 0.12 m of the eye;
//  - every control has a name, a kind, a hit box inside the cabin, is in sight and can be picked from the seat, and
//    says what to do (descriptors that FLIGHT LAB's own avionics control accepts); the flap handle, the trim wheel, the
//    fuel selector and the door handle in every position too;
//  - the yokes, pedals, levers (carb heat: ON down, OFF up), flap handle (its grip forward, up for more flap), trim wheel
//    and its pointer, fuel selector (L → R clockwise) and compass card follow the state;
//  - the Seminole's own (round R3, the G1000 NXi PA-44's): its switches on its panel, its levers one by one (each
//    mixture its own), the alternate air, the cowl flaps, the gear selector, the emergency gear knob, the park brake knob,
//    its console between the seats (the stabilator and rudder trim wheels, the flap handle, the two fuel selector levers:
//    in order, seen and picked in every position, following the state) — none of them in the Archer's view, none of the
//    Archer's own in its; no gear lights (the gear is on the MFD, the LANDING GEAR box: on the PFD while the MFD is dark);
//  - the Archer's overhead switch panel sits on the header made in Blender, its rockers follow the switches (their
//    print with them); the checklists point at controls each type has;
//  - the screens are redrawn on schedule (PFD 30 Hz, MFD 10 Hz; the G5 standby 15 Hz, lit when the PFD is), only when
//    seen, black without power (the NXi's buses, both types: the PFD and the G5 with BATT MASTR or EMERG BATT, the MFD
//    with AVION MASTER too), and the softkey labels only when the avionics change;
//  - update() works on the same objects every frame (no allocation), and so does the glass panel's drawing it calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { buildCockpit, PICK_LAYER, CABIN } from '../src/aircraft/cockpit.js';
import { BEZEL, SOFTKEYS } from '../src/aircraft/g1000.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { createActor, seatFromBody, GESTURE_NAMES } from '../src/npc/actor.js';
import { modelMeshes } from '../src/aircraft/archer-model.js';
import { CHECKLISTS as CHECKLISTS_ARCHER } from '../src/content/checklists-archer.js';
import { CHECKLISTS as CHECKLISTS_SEMINOLE } from '../src/content/checklists-seminole.js';
import { createDay, planFor } from '../src/career/day.js';
import { createFlight } from '../src/flight/flight.js';
import { createSystems } from '../src/aircraft/systems.js';
import { routeOut, createTaxiPilot } from '../src/flight/taxi.js';
import { KITS } from '../src/aircraft/walkaround.js';
const STROBES = ['FIN STROBE', 'OFF', 'STROBE LIGHTS'];

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics, SC = FL.school;
const AC = id => P.AIRCRAFT.find(a => a.id === id);
const DEG = Math.PI / 180, DT = 1 / 60;
const tris = g => (g.index ? g.index.count : g.attributes.position.count) / 3;

// a canvas that takes every 2D call (gradients and text metrics included) and counts them
function fakeCanvas(w, h) {
  const calls = { n: 0 };
  const grad = { addColorStop() {} };
  const g = new Proxy({}, {
    get: (t, k) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern' ? () => grad
      : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : () => { calls.n++; }),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  return { width: w, height: h, getContext: () => g, calls };
}
const build = (opts = {}) => buildCockpit(FL, AC('pa28'), { makeCanvas: fakeCanvas, ...opts });
const lesson = () => { const L = SC.startLesson('a1', 'basic'); for (let i = 0; i < 60; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); } return L; };
const run = (cp, L, seconds, o = {}) => { for (let t = 0; t < seconds - 1e-9; t += DT) cp.update(DT, { s: L.s, L, ...o }); };
const drawn = m => m.isMesh && m.visible && m.layers.test(new THREE.Layers()) && m.material.visible !== false;

test('cockpit: builds within budget', () => {
  const cp = build();
  assert.ok(cp.root instanceof THREE.Group);
  cp.root.updateMatrixWorld(true);
  let calls = 0, count = 0;
  const names = new Set();
  cp.root.traverse(o => { if (drawn(o)) { calls++; count += tris(o.geometry) * (o.isInstancedMesh ? o.count : 1); names.add(o.name); } });
  assert.ok(calls <= 40, `${calls} draw calls`);
  assert.equal(calls, cp.meshes.length, 'every drawn mesh is listed');
  assert.ok(cp.triangles <= 40000, `${cp.triangles} triangles`);
  assert.equal(count, cp.triangles);
  assert.ok(cp.textureBytes > 0 && cp.textureBytes <= 6e6, `${(cp.textureBytes / 1e6).toFixed(2)} MB of textures`);
  assert.ok(!cp.atlasFull, 'the labels fit their atlas');
  for (const n of ['cockpit-shell', 'cockpit-labels', 'cockpit-glass', 'cockpit-cowl', 'cockpit-pfd', 'cockpit-mfd', 'cockpit-yokeL', 'cockpit-yokeR',
    'cockpit-pedalsL', 'cockpit-pedalsR', 'cockpit-throttle', 'cockpit-mixture', 'cockpit-carb', 'cockpit-brake', 'cockpit-flap', 'cockpit-trim', 'cockpit-trimInd', 'cockpit-fuel', 'cockpit-compass-card',
    'cockpit-rockers', 'cockpit-rocker-print', 'cockpit-lit']) assert.ok(names.has(n), n);
  for (const n of ['cockpit-rockers-pa44', 'cockpit-rocker-print-pa44', 'cockpit-altAir', 'cockpit-cowlFlaps', 'cockpit-brakeK']) assert.ok(!names.has(n), `the Archer: no ${n}`);
  // the screens: unlit, the material not tone mapped, 1024 × 640, never mipmapped
  for (const k of ['pfd', 'mfd']) {
    const m = cp.screens[k].material;
    assert.ok(m.isMeshBasicMaterial && m.toneMapped === false, `${k}: unlit`);
    const tx = m.map;
    assert.equal(tx.image.width, 1024); assert.equal(tx.image.height, 640);
    assert.equal(tx.generateMipmaps, false); assert.equal(tx.minFilter, THREE.LinearFilter); assert.equal(tx.colorSpace, THREE.SRGBColorSpace);
    assert.equal(cp.screens[k].castShadow, false);
  }
  // the glass casts no shadow, the shell casts and takes them
  const shell = cp.meshes.find(m => m.name === 'cockpit-shell'), glass = cp.meshes.find(m => m.name === 'cockpit-glass');
  assert.ok(shell.castShadow && shell.receiveShadow && !glass.castShadow && glass.material.transparent && glass.userData.noAO);
  // without canvases it still builds (no drawing at all)
  const bare = buildCockpit(FL, AC('pa28'), { makeCanvas: null });
  assert.equal(bare.triangles, cp.triangles);
  const L = lesson();
  run(bare, L, 0.5);
  // another type's eye: the same cabin round it
  const tw = buildCockpit(FL, AC('pa44'), { makeCanvas: null });
  assert.deepEqual(tw.eye.toArray(), AC('pa44').eye);
  // the parts made in Blender (assets/model/cockpit.glb): every node read (none of the Seminole's without twin), none of
  // the groups made in code as well
  assert.deepEqual(cp.fromCode, []);
  assert.deepEqual([...cp.band].sort(), [
    'bench.belt.pa28', 'bench.black.pa28', 'bench.chrome.pa28', 'bench.red.pa28', 'bench.seat.pa28', 'bench.seatSide.pa28',
    'glareshield.glare', 'glareshield.glareLip', 'glareshield.lens', 'glareshield.rubber', 'glareshield.slot', 'header.wall', 'headliner.roof', 'pillars.wall',
    'roofTrims.trim', 'seals.rubber', 'seats.alu', 'seats.belt', 'seats.black', 'seats.chrome', 'seats.red', 'seats.seat', 'seats.seatSide',
    'visorHw.steel', 'visors.wall',
    'walls.black', 'walls.chrome', 'walls.postAlu', 'walls.rubber', 'walls.wall', 'walls.wallDark', 'walls.wallLow', 'walls.white',
    'yokes.alu.yokeL', 'yokes.alu.yokeR', 'yokes.black.yokeL', 'yokes.black.yokeR', 'yokes.chrome.yokeL', 'yokes.chrome.yokeR', 'yokes.grip.yokeL',
    'yokes.grip.yokeR', 'yokes.red.yokeL', 'yokes.rubber', 'yokes.yoke.yokeL', 'yokes.yoke.yokeR']);
  // the yokes from the model are moving parts (their own meshes, turned about their pivots); the rest is in the shell
  for (const k of ['yokeL', 'yokeR']) assert.ok(cp.parts[k].children.some(m => m.isMesh && m.name === 'cockpit-' + k && m.geometry.attributes.position.count > 3000), k);
  cp.dispose(); bare.dispose(); tw.dispose();
});

// the first drawn mesh of the cockpit along a ray from the eye (direction in the body frame)
function firstHit(cp, dir, from = cp.eye, skip = n => n === 'cockpit-glass') {
  const rc = new THREE.Raycaster(from.clone(), dir.clone().normalize(), 0, 5);
  const hits = rc.intersectObject(cp.root, true).filter(h => drawn(h.object) && !skip(h.object.name));
  return hits[0] || null;
}
const ahead = (down, right = 0) => new THREE.Vector3(Math.sin(right * DEG) * Math.cos(down * DEG), -Math.sin(down * DEG), -Math.cos(right * DEG) * Math.cos(down * DEG));

test('cockpit: the view from the left seat', () => {
  const cp = build();
  cp.root.updateMatrixWorld(true);
  assert.deepEqual(cp.eye.toArray(), AC('pa28').eye, 'FLIGHT LAB\'s eye');
  const centre = m => { m.geometry.computeBoundingBox(); return m.geometry.boundingBox.getCenter(new THREE.Vector3()).applyMatrix4(m.matrixWorld); };
  const pfd = centre(cp.screens.pfd), mfd = centre(cp.screens.mfd);
  const toPfd = pfd.clone().sub(cp.eye);
  assert.ok(toPfd.angleTo(new THREE.Vector3(0, 0, -1)) < 35 * DEG && toPfd.y < 0, `the PFD is ${(toPfd.angleTo(new THREE.Vector3(0, 0, -1)) / DEG).toFixed(1)}° from straight ahead`);
  assert.ok(Math.abs(pfd.x - cp.eye.x) < 0.03, 'the PFD in front of the pilot');
  assert.ok(toPfd.length() > 0.6 && toPfd.length() < 0.85, `the PFD ${toPfd.length().toFixed(2)} m from the eye`);
  assert.ok(mfd.x > pfd.x + 0.25 && Math.abs(mfd.y - pfd.y) < 0.01, 'the MFD to the right, level with the PFD');
  // a 10.4" screen in a bezel about 0.27 × 0.21 m
  assert.ok(Math.abs(BEZEL.screenW - 0.21) < 0.01 && Math.abs(BEZEL.screenH - 0.158) < 0.01 && Math.abs(BEZEL.w - 0.27) < 0.02 && Math.abs(BEZEL.h - 0.21) < 0.02);
  // the bezel's lip hides nothing of either display from the seat (the PFD's top bar, the MFD's engine strip): the
  // image's corners and edge middles (1 mm in), and both ends of the softkey labels' strip, are the first thing seen
  const lit = cp.meshes.find(m => m.name === 'cockpit-lit');
  for (const k of ['pfd', 'mfd']) {
    const m = cp.screens[k], bb = m.geometry.boundingBox, w = bb.max.x - bb.min.x - 0.002;
    const sy = bb.min.y - (BEZEL.screenH - BEZEL.imageH - BEZEL.stripH) - BEZEL.stripH / 2;
    const pts = [[0, 0], [0.5, 0], [1, 0], [0, 0.5], [1, 0.5], [0, 1], [0.5, 1], [1, 1]].map(([u, v]) => [bb.min.x + 0.001 + u * w, bb.min.y + 0.001 + v * (bb.max.y - bb.min.y - 0.002), m])
      .concat([[bb.min.x + 0.001, sy, lit], [bb.max.x - 0.001, sy, lit]]);
    for (const [x, y, want] of pts) {
      const h = firstHit(cp, new THREE.Vector3(x, y, bb.max.z).applyMatrix4(m.matrixWorld).sub(cp.eye));
      assert.ok(h && h.object === want, `${k}: the point (${x.toFixed(3)}, ${y.toFixed(3)}) is hidden by ${h && h.object.name}`);
    }
  }
  // over the nose: the glareshield's edge 12–15° under the eye (scanned down the pilot's line of sight), the cowling
  // over it, the windshield in front of it all
  let edge = null, edgeHit = null;
  for (let d = 4; d <= 25 && edge === null; d += 0.1) { const h = firstHit(cp, ahead(d)); if (h && h.object.name !== 'cockpit-cowl') { edge = d; edgeHit = h; } }
  assert.ok(edge >= 12 && edge <= 15, `the glareshield's edge ${edge && edge.toFixed(1)}° below the eye`);
  // (the glareshield's lip, over the panel's top and aft of the hood: not the panel's frame or anything under it)
  const ep = edgeHit.point;
  assert.ok(ep.y > CABIN.PTOP && ep.z > CABIN.GLARE.lip[1][0] - 0.03 && ep.z < CABIN.GLARE.lip[2][0] + 0.01, `the edge is the lip (${ep.toArray().map(x => x.toFixed(3))})`);
  const hc = firstHit(cp, ahead(edge - 1));
  assert.ok(hc && hc.object.name === 'cockpit-cowl', `the cowling shows over the glareshield (${hc && hc.object.name})`);
  const hs = firstHit(cp, ahead(edge + 0.5));
  assert.ok(hs && hs.object.name === 'cockpit-shell', `then the glareshield (${hs && hs.object.name})`);
  for (const d of [-15, 0, 6]) {
    const h = firstHit(cp, ahead(d), cp.eye, () => false);
    assert.ok(h && h.object.name === 'cockpit-glass', `the windshield ahead at ${d}°`);
  }
  // up: the sky at 20° above the horizon, the roof at 35°; the headliner ~0.2 m over the eye
  const up20 = firstHit(cp, ahead(-20)), up35 = firstHit(cp, ahead(-35));
  assert.ok(!up20 || up20.distance > 1, `20° up: ${up20 && up20.object.name}`);
  assert.ok(up35 && up35.object.name === 'cockpit-shell', '35° up: the roof');
  const top = firstHit(cp, new THREE.Vector3(0, 1, 0));
  assert.ok(top && top.distance >= 0.17 && top.distance <= 0.25, `the headliner ${top && top.distance.toFixed(3)} m over the eye`);
  // the walls at the shoulders (0.27 m under the eye: the window sills) about ±0.56, the side windows from there up
  const sh = cp.eye.clone().add(new THREE.Vector3(0, -0.27, 0));
  for (const sx of [-1, 1]) {
    const w = firstHit(cp, new THREE.Vector3(sx, 0, 0), sh, n => n === 'cockpit-glass' || n.startsWith('cockpit-yoke'));
    assert.ok(w && Math.abs(Math.abs(w.point.x) - 0.56) < 0.04, `the wall at x ${w && w.point.x.toFixed(3)}`);
    const win = firstHit(cp, new THREE.Vector3(sx, 0.1, 0), cp.eye, () => false);
    assert.ok(win && win.object.name === 'cockpit-glass', `a side window at eye level (${sx})`);
  }
  // behind: the seats' backs and the rear bench, the aft bulkhead within the cabin
  const back = firstHit(cp, new THREE.Vector3(0.6, -0.3, 1));
  assert.ok(back && back.distance < 2.2, 'the cabin behind');
  // nothing of the cockpit within 0.12 m of the eye (every triangle of every drawn mesh)
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), q = new THREE.Vector3(), tri = new THREE.Triangle();
  let near = Infinity, nearName = '';
  for (const m of cp.meshes) {
    const p = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : p.count;
    const insts = m.isInstancedMesh ? m.count : 1, im = new THREE.Matrix4(), w = new THREE.Matrix4();
    for (let k = 0; k < insts; k++) {
      if (m.isInstancedMesh) { m.getMatrixAt(k, im); w.multiplyMatrices(m.matrixWorld, im); } else w.copy(m.matrixWorld);
      for (let i = 0; i < n; i += 3) {
        const i0 = idx ? idx.getX(i) : i, i1 = idx ? idx.getX(i + 1) : i + 1, i2 = idx ? idx.getX(i + 2) : i + 2;
        tri.set(a.fromBufferAttribute(p, i0).applyMatrix4(w), b.fromBufferAttribute(p, i1).applyMatrix4(w), c.fromBufferAttribute(p, i2).applyMatrix4(w));
        const d = tri.closestPointToPoint(cp.eye, q).distanceTo(cp.eye);
        if (d < near) { near = d; nearName = m.name; }
      }
    }
  }
  assert.ok(near >= 0.12, `${nearName} is ${near.toFixed(3)} m from the eye`);
  // the instructor's seat: on the right, his eye where the pilot's would be mirrored, his feet towards the right pedals
  const st = cp.instructorSeat;
  assert.ok(st.hip[0] > 0.2 && st.hip[0] < 0.4 && st.hip[1] < cp.eye.y - 0.5 && st.hip[2] > -0.6 && st.hip[2] < -0.2, `hip ${st.hip}`);
  assert.ok(Math.abs(st.eye[0] + cp.eye.x) < 0.02 && Math.abs(st.eye[1] - cp.eye.y) < 0.03, `eye ${st.eye}`);
  assert.ok(st.ankleL[0] > 0.1 && st.ankleR[0] > st.ankleL[0] && st.ankleL[2] < st.hip[2] - 0.5 && st.ankleL[1] < st.hip[1], 'feet forward, on the right pedals');
  assert.equal(st.yaw, Math.PI);
  cp.dispose();
});

// the instructor in the right seat (fly-mode.js: seatFromBody(instructorSeat)) and the right yoke moving in front of his
// knees: no triangle of the yoke crosses one of his, over the pitch the lessons fly (elevator + trim −0.1 … 0.3) and the
// whole roll (a crossing, not a vertex inside: the horn is thinner than his legs' triangles)
test('cockpit: the right yoke clears the instructor\'s knees', () => {
  const cp = build(), L = lesson(), st = cp.instructorSeat, seat = seatFromBody(st, st.yaw);
  const a = createActor({ seed: 1 }), scene = new THREE.Group();
  scene.add(cp.root, a.root); a.root.position.set(...seat.position); a.root.rotation.set(0, seat.yaw, 0);
  assert.equal(a.setSeated(seat.seat), true);
  for (let i = 0; i < 60; i++) a.update(1 / 30, { lookAt: cp.eye });
  scene.updateMatrixWorld(true);
  const tris = (meshes) => {
    const out = [];
    for (const m of meshes) {
      const p = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : p.count;
      for (let i = 0; i < n; i += 3) {
        const v = [0, 1, 2].map(k => new THREE.Vector3().fromBufferAttribute(p, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld));
        out.push({ v, box: new THREE.Box3().setFromPoints(v) });
      }
    }
    return out;
  };
  const crosses = (t1, t2) => {                         // an edge of either through the other (Möller–Trumbore)
    const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), d = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3();
    const seg = (p, q, [a, b, c]) => {
      d.subVectors(q, p); e1.subVectors(b, a); e2.subVectors(c, a); pv.crossVectors(d, e2);
      const det = e1.dot(pv); if (Math.abs(det) < 1e-12) return false;
      tv.subVectors(p, a); const u = tv.dot(pv) / det; if (u < 0 || u > 1) return false;
      qv.crossVectors(tv, e1); const w = d.dot(qv) / det; if (w < 0 || u + w > 1) return false;
      const s = e2.dot(qv) / det; return s >= 0 && s <= 1;
    };
    for (const [x, y] of [[t1, t2], [t2, t1]]) for (let k = 0; k < 3; k++) if (seg(x.v[k], x.v[(k + 1) % 3], y.v)) return true;
    return false;
  };
  const him = tris(a.meshes.filter(m => m.isMesh && m.visible)), yoke = cp.parts.yokeR.children.filter(m => m.isMesh), bad = [];
  for (const pc of [-0.1, 0, 0.1, 0.2, 0.3]) for (const ail of [-1, -0.75, -0.5, 0, 0.5, 0.75, 1]) {
    Object.assign(L.s, { elev: pc, trim: 0, ail }); cp.update(1 / 60, { s: L.s, L }); scene.updateMatrixWorld(true);
    const yt = tris(yoke), ybox = new THREE.Box3(); for (const t of yt) ybox.union(t.box);
    const near = him.filter(t => t.box.intersectsBox(ybox));
    if (near.some(t1 => yt.some(t2 => t1.box.intersectsBox(t2.box) && crosses(t1, t2)))) bad.push(`elev+trim ${pc}, aileron ${ail}`);
  }
  assert.deepEqual(bad, [], 'the right yoke through the instructor');
  cp.dispose();
});

// and in the right seat made in Blender: his thighs sink a little into the cushion (it gives), nothing else of him goes
// into the seat (his arms hang beside the back's eased bolster, his head in front of the headrest) — measured against the
// model's seat parts, closed solids (a point inside: an odd number of crossings along a ray)
test('cockpit: the instructor sits in the right seat, not through it', () => {
  const mm = modelMeshes('cockpit'), cp = build(), st = cp.instructorSeat, seat = seatFromBody(st, st.yaw);
  const geo = new THREE.BufferGeometry(), seatParts = ['seats.seatSide', 'seats.seat'].map(k => mm.get(k));
  const pos = new Float32Array(seatParts.reduce((n, q) => n + q.pos.length, 0)); let o = 0;
  for (const q of seatParts) { pos.set(q.pos, o); o += q.pos.length; }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const solid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); solid.updateMatrixWorld(true);
  const rc = new THREE.Raycaster(), up = new THREE.Vector3(0.3, 1, 0.2).normalize();
  const depth = p => { let d = Infinity; for (const v of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { rc.set(p, new THREE.Vector3(...v)); const h = rc.intersectObject(solid)[0]; if (h) d = Math.min(d, h.distance); } return d; };
  const a = createActor({ seed: 1 }); a.root.position.set(...seat.position); a.root.rotation.set(0, seat.yaw, 0);
  assert.equal(a.setSeated(seat.seat), true);
  for (let i = 0; i < 60; i++) a.update(1 / 30, { lookAt: cp.eye, talking: i > 30 });
  a.root.updateMatrixWorld(true);
  const deep = {}, v = new THREE.Vector3();
  for (const m of a.meshes) {
    if (!m.isMesh || !m.visible) continue;
    const p = m.geometry.attributes.position;
    for (let k = 0; k < p.count; k += 2) {
      v.fromBufferAttribute(p, k).applyMatrix4(m.matrixWorld);
      if (v.x < 0.05 || v.x > 0.53 || v.z > 0) continue;
      rc.set(v, up); if (rc.intersectObject(solid).length % 2 === 0) continue;
      deep[m.name] = Math.max(deep[m.name] || 0, depth(v));
    }
  }
  for (const [n, d] of Object.entries(deep)) assert.ok(d < (/thigh/.test(n) ? 0.015 : 0.005), `${n} ${(d * 100).toFixed(1)} cm into the seat`);
  cp.dispose();
});

// and the belts made with the seats (tools/aircraft/cockpit_seats.py), which cannot move with him: his lie beside him (the
// buckle on the inboard bolster, the outboard half down the cushion's side, the harness wound up in its slot), so that no
// triangle of him crosses one of the right seat's belts (their webbing, buckle, tab, tongue — and what shares their nodes:
// the seat's pan, frame plates and recline lever) as he sits, talks, points (at the student's PFD, at the pedals) and
// makes every other gesture
test('cockpit: the instructor clear of the right seat\'s belts', () => {
  const mm = modelMeshes('cockpit'), cp = build(), st = cp.instructorSeat, seat = seatFromBody(st, st.yaw);
  cp.root.updateMatrixWorld(true);
  const belt = [], bbox = new THREE.Box3();
  for (const [name, m] of mm) {
    if (!/^seats\.(belt|black|red|chrome)$/.test(name)) continue;
    for (let i = 0; i < m.count; i += 3) {
      const v = [0, 1, 2].map(k => new THREE.Vector3().fromArray(m.pos, (i + k) * 3));
      if (v.some(p => p.x < 0.03)) continue;                                    // (the right seat's)
      const box = new THREE.Box3().setFromPoints(v); belt.push({ v, box }); bbox.union(box);
    }
  }
  assert.ok(belt.length > 100, `${belt.length} triangles of the right seat's belts`);
  const e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), d = new THREE.Vector3(), pv = new THREE.Vector3(), tv = new THREE.Vector3(), qv = new THREE.Vector3();
  const seg = (p, q, [a, b, c]) => {                    // the segment p–q through the triangle a b c (Möller–Trumbore)
    d.subVectors(q, p); e1.subVectors(b, a); e2.subVectors(c, a); pv.crossVectors(d, e2);
    const det = e1.dot(pv); if (Math.abs(det) < 1e-12) return false;
    tv.subVectors(p, a); const u = tv.dot(pv) / det; if (u < 0 || u > 1) return false;
    qv.crossVectors(tv, e1); const w = d.dot(qv) / det; if (w < 0 || u + w > 1) return false;
    const s = e2.dot(qv) / det; return s >= 0 && s <= 1;
  };
  const crosses = (t1, t2) => { for (const [x, y] of [[t1, t2], [t2, t1]]) for (let k = 0; k < 3; k++) if (seg(x.v[k], x.v[(k + 1) % 3], y.v)) return true; return false; };
  const bad = new Set(), v = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()];
  const look = (a, what) => {
    a.root.updateMatrixWorld(true);
    for (const m of a.meshes) {
      if (!m.isMesh || !m.visible) continue;
      const p = m.geometry.attributes.position, idx = m.geometry.index, n = idx ? idx.count : p.count;
      for (let i = 0; i < n; i += 3) {
        for (let k = 0; k < 3; k++) v[k].fromBufferAttribute(p, idx ? idx.getX(i + k) : i + k).applyMatrix4(m.matrixWorld);
        const t = { v, box: new THREE.Box3().setFromPoints(v) };
        if (t.box.intersectsBox(bbox) && belt.some(b => t.box.intersectsBox(b.box) && crosses(t, b))) bad.add(`${what}: ${m.name}`);
      }
    }
  };
  const seated = () => {
    const a = createActor({ seed: 1 }); a.root.position.set(...seat.position); a.root.rotation.set(0, seat.yaw, 0);
    assert.equal(a.setSeated(seat.seat), true);
    for (let i = 0; i < 60; i++) a.update(1 / 30, { lookAt: cp.eye });
    return a;
  };
  { const a = seated(); look(a, 'sitting'); for (let i = 0; i < 240; i++) { a.update(1 / 30, { lookAt: cp.eye, talking: true }); if (i % 20 === 10) look(a, 'talking'); } }
  const g = cp.screens.pfd.geometry; g.computeBoundingBox();                   // (fly-mode.js pointAtPanel: the PFD's middle, the pedals' aim)
  const pfd = cp.screens.pfd.localToWorld(g.boundingBox.getCenter(new THREE.Vector3())), pedals = cp.aimPoint(cp.controls.find(c => c.id === 'pedals'), new THREE.Vector3());
  for (const name of GESTURE_NAMES) for (const at of name === 'point' ? [pfd, pedals] : [null]) {
    const a = seated(); if (at) a.pointAt(at);
    const dur = a.gesture(name);
    for (let t = 0, k = 0; t < dur; t += 1 / 30, k++) { a.update(1 / 30, { lookAt: cp.eye }); if (k % 4 === 2) look(a, name); }
  }
  assert.deepEqual([...bad], [], 'the instructor through the right seat\'s belts');
  cp.dispose();
});

const KINDS = new Set(['button', 'knob', 'lever', 'switch', 'handle']);
const TYPES = new Set(['flight', 'av', 'switch', 'select', 'exit', 'prime', 'info']);
// from the eye, along the line to where one aims at a control (where its part is now): is it the control picked, and is
// it seen there — nothing drawn stands in front of the aim point (picking goes through what is drawn, so a control
// hidden behind a seat or the yoke could be clicked without being seen)? → [picked, seen, what was picked, what hides it]
function sightOf(cp, c) {
  const to = cp.aimPoint(c, new THREE.Vector3());
  const rc = new THREE.Raycaster(cp.eye.clone(), to.clone().sub(cp.eye).normalize(), 0, 3);
  const got = cp.pick(rc);
  assert.equal(rc.layers.mask, new THREE.Layers().mask, 'pick() leaves the raycaster as it was');
  const front = firstHit(cp, to.clone().sub(cp.eye), cp.eye, n => n === 'cockpit-glass' || n === 'cockpit-labels');
  const hidden = front && front.distance < to.distanceTo(cp.eye) - 0.03 && front.object.name !== `cockpit-${c.part}`;
  return [got === c, !hidden, got ? got.id : 'nothing', hidden ? front.object.name : null];
}
function controlsCheck(cp, L, required) {
  Object.assign(L.s, { elev: 0, trim: 0.1, ail: 0, rud: 0, rudEff: 0 });          // hands off, a little nose-up trim
  run(cp, L, 0.5);
  cp.root.updateMatrixWorld(true);
  const shell = cp.meshes.find(m => m.name === 'cockpit-shell');
  const cabin = new THREE.Box3().setFromObject(shell, true).expandByScalar(0.01);
  const ids = new Set(), unpicked = [], unseen = [];
  for (const c of cp.controls) {
    assert.ok(!ids.has(c.id), `duplicate ${c.id}`); ids.add(c.id);
    assert.ok(typeof c.label === 'string' && /[぀-ヿ一-鿿]/.test(c.label), `${c.id}: a Japanese label (${c.label})`);
    assert.ok(KINDS.has(c.kind), `${c.id}: kind ${c.kind}`);
    assert.ok(c.target && c.target.isMesh && c.target.layers.mask === 1 << PICK_LAYER, `${c.id}: a hit mesh on the pick layer only`);
    assert.ok(cabin.containsBox(new THREE.Box3().setFromObject(c.target, true)), `${c.id}: inside the cabin`);
    for (const [dir, wheel] of [[1, false], [1, true], [-1, true]]) {
      const r = c.act(dir, wheel);
      assert.ok(r === null || (r && TYPES.has(r.type)), `${c.id}: act(${dir}, ${wheel}) → ${JSON.stringify(r)}`);
      if (r && r.type === 'info') assert.ok(r.text.length > 4, `${c.id}: info text`);
    }
    // from the eye, along the line to where one aims at it (where its part is now): picked, and seen there
    assert.ok(c.at.isVector3, `${c.id}: an aim point`);
    const [picked, seen, got, by] = sightOf(cp, c);
    if (!picked) unpicked.push(`${c.id} (${got})`);
    if (!seen) unseen.push(`${c.id} (${by})`);
  }
  assert.deepEqual(unpicked, [], 'controls that cannot be picked from the seat');
  assert.deepEqual(unseen, [], 'controls hidden from the seat');
  // hidden (the chase view), nothing is picked
  const anyCtl = cp.controls[0], ray = new THREE.Raycaster(cp.eye.clone(), cp.aimPoint(anyCtl, new THREE.Vector3()).sub(cp.eye).normalize(), 0, 3);
  assert.equal(cp.pick(ray), anyCtl);
  cp.setVisible(false); assert.equal(cp.pick(ray), null, 'nothing picked while hidden'); cp.setVisible(true);
  for (const id of required) assert.ok(ids.has(id), id);
  // a ray at nothing picks nothing
  assert.equal(cp.pick(new THREE.Raycaster(cp.eye.clone(), new THREE.Vector3(0, 1, 0), 0, 3)), null);
  return ids;
}
// both types' (the same switch fields; on the Archer on its overhead panel, on the Seminole on its panel's banks; no
// key, no BEACON or TAXI switch on either: FIN STROBE is the beacon, the landing light switch works the taxi lamp)
// (the flap handle, the trim wheel and the rudder trim: each type's own at its own place — the Archer's rudder trim knob
// on the pedestal, the Seminole's wheels and handle on its console)
const COMMON_IDS = ['pfd.hdg', 'pfd.alt.inner', 'pfd.alt.outer', 'pfd.crs.outer', 'mfd.range', 'sw.master', 'sw.avionics', 'sw.landing', 'sw.fuelPump', 'sw.nav', 'sw.strobe',
  'sw.pitot', 'sw.altr', 'sw.magL', 'sw.magR', 'sw.emergBatt', 'dim.switch', 'dim.panel', 'dim.avionics', 'throttle', 'mixture', 'parkBrake', 'yokeL', 'pedals', 'flaps', 'trim',
  'rudderTrim', 'door', 'compass', 'stby.g5', 'audio.COM1MIC', 'pfd.sk3', 'mfd.sk3', 'cb', 'elt', 'altStatic'];
// the Archer's own: the panel's (A), the overhead switch panel's and the panel block's switches, its one START, its
// primer, its carb heat, its fuel selector on the left kick panel
const ARCHER_IDS = ['cabinHeat', 'defrost', 'sw.start', 'sw.fan', 'dome.left', 'dome.right', 'primer', 'carbHeat', 'fuelSel'];
// the Seminole's own (POH VB-2636 Fig 7-21, 7-33, 7-19): the right engine's switches, the START rocker's halves, RECOG,
// the right mixture, the propellers, the alternate air, the cowl flaps, the friction lever, the gear selector, the
// emergency gear knob, ELEV TRIM, the heater's and the vent fan's, the two fuel selector levers between the seats
const SEMINOLE_IDS = ['gear', 'prop', 'mixtureR', 'sw.startL', 'sw.startR', 'sw.rMagL', 'sw.rMagR', 'sw.rAltr', 'sw.rFuelPump', 'sw.recog', 'altAir', 'cowlFlaps', 'friction',
  'emergGear', 'elevTrim', 'sw.heater', 'sw.ventFan', 'heatAir', 'heatTemp', 'heatDef', 'fuelSelL', 'fuelSelR'];
test('cockpit: every control can be found, picked from the seat, and says what to do', () => {
  const cp = build();
  const ids = controlsCheck(cp, lesson(), [...COMMON_IDS, ...ARCHER_IDS]);
  for (const id of SEMINOLE_IDS) assert.ok(!ids.has(id), `the Archer: no ${id}`);
  cp.dispose();
});

// the controls that move a long way stay in sight and pickable from the seat wherever they are (the yoke centred): the
// flap handle at each detent, the trim wheel and its pointer at either end, the fuel selector at L, R and OFF, the door
// handle with them
test('cockpit: the flap handle, trim wheel, fuel selector and door handle seen and picked in every position', () => {
  const cp = build(), L = lesson(), s = L.s, bad = [];
  const ctl = id => cp.controls.find(c => c.id === id);
  for (const flapIdx of [0, 1, 2, 3]) for (const trim of [-P.TRIM_MAX, 0, P.TRIM_MAX]) for (const fuel of ['L', 'R', 'OFF']) {
    Object.assign(s, { elev: -trim, ail: 0, rud: 0, rudEff: 0, flapIdx, trim }); cp.switches.fuelSel = fuel;   // (the yoke centred: the elevator against the trim)
    run(cp, L, 1); cp.root.updateMatrixWorld(true);
    for (const id of ['flaps', 'trim', 'fuelSel', 'door']) {
      const [picked, seen, got, by] = sightOf(cp, ctl(id));
      if (!picked || !seen) bad.push(`${id} at flaps ${flapIdx}, trim ${trim.toFixed(2)}, fuel ${fuel}: ${picked ? '' : `picked ${got} `}${seen ? '' : `hidden by ${by}`}`);
    }
  }
  assert.deepEqual(bad, []);
  cp.dispose();
});

// (M6; round R3: the G1000 NXi PA-44's) the Seminole's own: its panel's switches, its quadrant (two of each lever),
// the alternate air, the cowl flaps, the gear selector, the emergency gear and park brake knobs, its nose
test('cockpit: the Seminole\'s — its levers and gear selector found, picked and seen from the seat; within budget', () => {
  const cp = build({ twin: AC('pa44') });
  const tri0 = cp.triangles;
  // (round R3) the rear seats from the model, each type its own: the Archer TX's bench (pa28), the Seminole's two seats (pa44)
  for (const v of ['pa28', 'pa44']) for (const k of ['belt', 'black', 'chrome', 'red', 'seat', 'seatSide']) assert.ok(cp.band.includes(`bench.${k}.${v}`), `bench.${k}.${v}`);
  assert.equal(cp.type, 'pa28');
  assert.ok(!cp.controls.some(c => c.id === 'gear'), 'the Archer\'s view first');
  cp.setType('pa44');
  assert.equal(cp.type, 'pa44');
  const L = SC.startLesson('m1', 'basic'); for (let i = 0; i < 60; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); }
  const ids = controlsCheck(cp, L, [...COMMON_IDS, ...SEMINOLE_IDS]);
  assert.equal([...ids].filter(id => id === 'throttle').length, 1, 'one throttle control for the pair');
  for (const id of ARCHER_IDS) assert.ok(!ids.has(id), `the Seminole: no ${id}`);
  // what is drawn: the Seminole's parts, not the Archer's
  cp.root.updateMatrixWorld(true);
  const names = new Set(); let calls = 0, count = 0;
  cp.root.traverse(o => { let v = true; for (let p = o; p; p = p.parent) v = v && p.visible; if (v && drawn(o)) { calls++; count += tris(o.geometry) * (o.isInstancedMesh ? o.count : 1); names.add(o.name); } });
  for (const n of ['cockpit-nose', 'cockpit-thrL', 'cockpit-thrR', 'cockpit-propL', 'cockpit-propR', 'cockpit-mixL', 'cockpit-mixR', 'cockpit-gearLever', 'cockpit-shell-pa44', 'cockpit-labels-pa44',
    'cockpit-rockers-pa44', 'cockpit-rocker-print-pa44', 'cockpit-altAir', 'cockpit-cowlFlaps', 'cockpit-brakeK', 'cockpit-brakeK-print']) assert.ok(names.has(n), n);
  for (const n of ['cockpit-cowl', 'cockpit-throttle', 'cockpit-mixture', 'cockpit-carb', 'cockpit-brake', 'cockpit-shell-pa28', 'cockpit-rockers', 'cockpit-rocker-print', 'cockpit-key', 'cockpit-lit-pa44'])
    assert.ok(!names.has(n), `no ${n}`);
  assert.ok(calls <= 44, `${calls} draw calls`);
  assert.equal(count, cp.trianglesTwin);
  assert.ok(cp.trianglesTwin <= 40000 && tri0 === cp.triangles, `${cp.trianglesTwin} triangles`);
  // the levers and the selector follow the state: the throttles together, each mixture its own
  const p = cp.parts, s = L.s, sw = cp.switches, C0 = Object.fromEntries(cp.controls.map(c => [c.id, c]));
  Object.assign(s, { thr: 0 }); run(cp, L, 0.3); const t0 = p.thrL.rotation.x;
  Object.assign(s, { thr: 1 }); run(cp, L, 0.3);
  assert.ok(p.thrL.rotation.x < t0 - 20 * DEG && p.thrR.rotation.x === p.thrL.rotation.x, 'the throttles forward together');
  sw.mixture = 1; sw.mixtureR = 0; run(cp, L, 0.05);
  assert.ok(p.mixR.rotation.x > p.mixL.rotation.x + 20 * DEG, 'the right mixture at cut-off, the left forward');
  sw.mixtureR = 1; run(cp, L, 0.05); assert.equal(p.mixR.rotation.x, p.mixL.rotation.x);
  const g0 = p.gearLever.rotation.x;
  Object.assign(s, { gearDown: false }); run(cp, L, 0.1);
  assert.ok(p.gearLever.rotation.x < g0 - 30 * DEG, 'the gear selector up');
  Object.assign(s, { gearDown: true });
  // the knob where one aims at it: the alternate air OPEN down, CLOSE up; the cowl flaps OPEN forward (−z), CLOSED aft;
  // the park brake knob out (+z) when set
  const aim = id => { cp.root.updateMatrixWorld(true); return cp.aimPoint(cp.controls.find(c => c.id === id), new THREE.Vector3()); };
  sw.altAir = true; run(cp, L, 0.05); const yOn = aim('altAir').y;
  sw.altAir = false; run(cp, L, 0.05); const yOff = aim('altAir').y;
  assert.ok(yOn < yOff - 0.012, `the alternate air: OPEN ${yOn.toFixed(3)} below CLOSE ${yOff.toFixed(3)}`);
  const cz = {}; for (const v of ['OPEN', 'INT', 'CLOSED']) { sw.cowlFlaps = v; run(cp, L, 0.05); cz[v] = aim('cowlFlaps').z; }
  assert.ok(cz.OPEN < cz.INT - 0.005 && cz.INT < cz.CLOSED - 0.005, `the cowl flaps: ${JSON.stringify(cz)}`);
  sw.cowlFlaps = 'OPEN';
  const b0 = aim('parkBrake').z; cp.update(DT, { s, L, parkBrake: true }); const b1 = aim('parkBrake').z; cp.update(DT, { s, L });
  assert.ok(b1 > b0 + 0.02, `the park brake knob out (${b0.toFixed(3)} → ${b1.toFixed(3)})`);
  const prop0 = p.propL.rotation.x;
  sw.propCycleT = 1.3; run(cp, L, 0.05);
  assert.ok(p.propL.rotation.x > prop0 + 20 * DEG, 'the propeller levers pulled back while cycled');
  // (the feather check: into the feather detent, the slots' aft end — where a mixture is at cut-off —; the alternate air
  // seen and picked under them then)
  sw.mixtureR = 0; run(cp, L, 0.02);
  assert.ok(Math.abs(p.propL.rotation.x - p.mixR.rotation.x) < 0.5 * DEG, `the propeller levers at the feather end (${(p.propL.rotation.x / DEG).toFixed(1)}° against the cut-off mixture's ${(p.mixR.rotation.x / DEG).toFixed(1)}°)`);
  { const [picked, seen, got, by] = sightOf(cp, C0.altAir); assert.ok(picked && seen, `the alternate air while the propellers are cycled: ${picked ? '' : 'picked ' + got} ${seen ? '' : 'hidden by ' + by}`); }
  sw.propCycleT = 0;
  // every lever at its aft end (the throttles idle, the propellers feathered, the mixtures at idle cut-off) clear of the
  // alternate air's knobs (≥ 5 mm), the alternate air CLOSE (up) or OPEN
  Object.assign(s, { thr: 0 }); sw.mixture = 0; sw.mixtureR = 0;
  for (const open of [false, true]) {
    sw.altAir = open; sw.propCycleT = 1.3; run(cp, L, 0.02); cp.root.updateMatrixWorld(true);
    const box = n => new THREE.Box3().setFromObject(cp.root.getObjectByName(n), true), alt = box('cockpit-altAir');
    for (const n of ['cockpit-mixL', 'cockpit-mixR', 'cockpit-propL', 'cockpit-propR', 'cockpit-thrL', 'cockpit-thrR']) {
      const b = box(n), gap = Math.max(alt.min.x - b.max.x, b.min.x - alt.max.x, alt.min.y - b.max.y, b.min.y - alt.max.y, alt.min.z - b.max.z, b.min.z - alt.max.z);
      assert.ok(gap >= 0.005, `${n} at the aft end ${(gap * 1000).toFixed(1)} mm from the alternate air (${open ? 'OPEN' : 'CLOSE'})`);
    }
  }
  sw.altAir = false; sw.propCycleT = 0; sw.mixture = 1; sw.mixtureR = 1; run(cp, L, 0.05);
  // what the controls do: the START rocker's halves (held, let go), the right engine's switches, the alternate air, the
  // cowl flaps a notch at a time (the wheel forward opens), each mixture, the heater's and the vent fan's three positions
  const C = Object.fromEntries(cp.controls.map(c => [c.id, c]));
  assert.deepEqual(C['sw.startL'].act(1, false), { type: 'select', id: 'start', value: 'L' });
  assert.deepEqual(C['sw.startR'].act(1, false), { type: 'select', id: 'start', value: 'R' });
  assert.equal(C['sw.startL'].act(1, true), null, 'START is not held by the wheel');
  sw.start = 'L'; assert.deepEqual(C['sw.startL'].act(1, false), { type: 'select', id: 'start', value: false }, 'a click again lets it go'); sw.start = false;
  for (const id of ['rMagL', 'rMagR', 'rAltr', 'rFuelPump']) assert.deepEqual(C['sw.' + id].act(-1, true), { type: 'switch', id, on: false }, id);
  assert.deepEqual(C['sw.recog'].act(1, false), { type: 'switch', id: 'recog', on: true });
  assert.deepEqual(C.altAir.act(1, false), { type: 'switch', id: 'altAir', on: true });
  assert.deepEqual(C.cowlFlaps.act(1, false), { type: 'select', id: 'cowlFlaps', value: 'INT' }, 'a click: a notch towards closed');
  assert.equal(C.cowlFlaps.act(1, true), null, 'the wheel forward at OPEN: nothing');
  sw.cowlFlaps = 'CLOSED'; assert.deepEqual(C.cowlFlaps.act(1, false), { type: 'select', id: 'cowlFlaps', value: 'OPEN' }, 'and round to open'); sw.cowlFlaps = 'OPEN';
  assert.deepEqual(C.mixtureR.act(-1, true), { type: 'select', id: 'mixtureR', value: 0.9 });
  assert.deepEqual(C.mixtureR.act(1, false), { type: 'select', id: 'mixtureR', value: 0 }, 'on the ground (m1 starts lined up): idle cut-off');
  assert.deepEqual(C['sw.heater'].act(1, true), { type: 'select', id: 'heater', value: 'CABIN HEAT' });
  assert.deepEqual(C['sw.ventFan'].act(1, false), { type: 'select', id: 'ventFan', value: 'LOW' });
  for (const id of ['emergGear', 'elevTrim', 'friction', 'heatAir', 'heatTemp', 'heatDef']) assert.equal(C[id].act(1, false).type, 'info', id);
  assert.deepEqual(C.gear.act(1, false), { type: 'flight', name: 'gear' });
  assert.deepEqual(C.parkBrake.act(1, false), { type: 'flight', name: 'parkBrake' });
  // its rockers follow the switches: one rocker turns for each, the START rocker's halves in turn, its print with it
  const rk = cp.meshes.find(m => m.name === 'cockpit-rockers-pa44'), pr = cp.meshes.find(m => m.name === 'cockpit-rocker-print-pa44');
  const snap = mesh => Array.from({ length: mesh.count }, (_, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m; });
  const changed = (x, y) => x.map((m, i) => (m.equals(y[i]) ? -1 : i)).filter(i => i >= 0);
  run(cp, L, 0.05);
  for (const key of ['rMagR', 'master', 'rAltr', 'recog', 'fuelPump']) {
    const r0 = snap(rk), p0 = snap(pr); sw[key] = !sw[key]; run(cp, L, 0.05);
    assert.equal(changed(r0, snap(rk)).length, 1, `${key}: one rocker`); assert.ok(changed(p0, snap(pr)).length >= 1, `${key}: its print`);
    sw[key] = !sw[key]; run(cp, L, 0.05);
  }
  { const r0 = snap(rk); sw.start = 'L'; run(cp, L, 0.05); const r1 = snap(rk); sw.start = 'R'; run(cp, L, 0.05); const r2 = snap(rk); sw.start = false; run(cp, L, 0.05);
    assert.equal(changed(r0, r1).length, 1, 'START: its left half'); assert.deepEqual(changed(r1, r2), changed(r0, r1), 'its right half: the same rocker'); assert.equal(changed(r0, snap(rk)).length, 0, 'and back'); }
  cp.setType('pa28'); assert.equal(cp.type, 'pa28');
  cp.dispose();
});

// what each type shows is its own: in the Archer's view none of the Seminole's own meshes or controls (and its rockers
// are not posed by the Seminole's switches), in the Seminole's none of the Archer's own (the overhead switch panel, the
// carb heat lever, the hand brake, the rudder trim knob, the HEAT / DEF sliders, the flap handle and trim wheel of its
// console, its fuel selector, the cowling); the parts of the cabin both have are drawn in both
test('cockpit: no Archer-only parts in the Seminole\'s view, no Seminole-only parts in the Archer\'s', () => {
  const cp = build({ twin: AC('pa44') }), L = lesson();
  const seen = () => { cp.root.updateMatrixWorld(true); const n = new Set(); cp.root.traverse(o => { let v = true; for (let p = o; p; p = p.parent) v = v && p.visible; if (v && drawn(o)) n.add(o.name); }); return n; };
  const own = { pa28: ['cockpit-shell-pa28', 'cockpit-labels-pa28', 'cockpit-cowl', 'cockpit-throttle', 'cockpit-mixture', 'cockpit-carb', 'cockpit-brake', 'cockpit-rockers', 'cockpit-rocker-print',
      'cockpit-flap', 'cockpit-trim', 'cockpit-trimInd', 'cockpit-fuel'],
    pa44: ['cockpit-shell-pa44', 'cockpit-labels-pa44', 'cockpit-nose', 'cockpit-thrL', 'cockpit-mixR', 'cockpit-propL', 'cockpit-altAir', 'cockpit-cowlFlaps', 'cockpit-gearLever', 'cockpit-brakeK', 'cockpit-rockers-pa44', 'cockpit-rocker-print-pa44',
      'cockpit-flap44', 'cockpit-trim44', 'cockpit-trimInd44', 'cockpit-rudTrim', 'cockpit-fuelL', 'cockpit-fuelR'] };
  const shared = ['cockpit-shell', 'cockpit-labels', 'cockpit-pfd', 'cockpit-mfd', 'cockpit-yokeL', 'cockpit-compass-card'];
  for (const [t, o] of [['pa28', 'pa44'], ['pa44', 'pa28']]) {
    cp.setType(t); run(cp, L, 0.05);
    const n = seen(), ids = new Set(cp.controls.map(c => c.id));
    for (const m of own[t]) assert.ok(n.has(m), `${t}: its ${m}`);
    for (const m of own[o]) assert.ok(!n.has(m), `${t}: no ${m}`);
    for (const m of shared) assert.ok(n.has(m), `${t}: ${m}`);
    for (const id of t === 'pa28' ? SEMINOLE_IDS : ARCHER_IDS) assert.ok(!ids.has(id), `${t}: no ${id}`);
    assert.ok(cp.controls.every(c => !c.type || c.type === t), `${t}: only its own and the shared controls`);
  }
  // the Archer's overhead switch panel is not there in the Seminole's view: from the eye, up at its middle, the header
  cp.setType('pa44'); cp.root.updateMatrixWorld(true);
  const mid = CABIN.ovhAt(0, CABIN.OVH.h / 2, 0.003), shown = o => { for (let q = o; q; q = q.parent) if (!q.visible) return false; return true; };
  const hit = new THREE.Raycaster(cp.eye.clone(), mid.clone().sub(cp.eye).normalize(), 0, 5).intersectObject(cp.root, true).filter(h => drawn(h.object) && shown(h.object) && h.object.name !== 'cockpit-glass')[0];
  assert.ok(hit && !/rocker|pa28/.test(hit.object.name) && hit.distance > mid.distanceTo(cp.eye) - 0.001, `up at the header: ${hit && hit.object.name}`);
  // each type's own LIMITATIONS placard on the left wall's sill band (its print in the type's labels), the Seminole's
  // emergency exit (the handle's cover on the post between the first and second left windows, its placard over it)
  const W = CABIN.WALLS, Lp = new THREE.Vector3(-CABIN.lowX(W.limits.y), W.limits.y, W.limits.z);
  const near = (name, p, d) => { const m = cp.meshes.find(x => x.name === name), a = m.geometry.attributes.position, v = new THREE.Vector3(); for (let i = 0; i < a.count; i++) if (v.fromBufferAttribute(a, i).distanceTo(p) < d) return true; return false; };
  for (const t of ['pa28', 'pa44']) assert.ok(near(`cockpit-labels-${t}`, Lp, W.limits.w * 0.6), `${t}: its LIMITATIONS placard`);
  const ex = W.exit, onBand = (y, z) => new THREE.Vector3(-CABIN.bandX(y), y, z);
  assert.ok(near('cockpit-shell-pa44', onBand((ex.cover.y[0] + ex.cover.y[1]) / 2, (ex.cover.z[0] + ex.cover.z[1]) / 2), 0.02) && !near('cockpit-shell-pa28', onBand((ex.cover.y[0] + ex.cover.y[1]) / 2, (ex.cover.z[0] + ex.cover.z[1]) / 2), 0.02), 'the Seminole\'s emergency exit cover');
  assert.ok(near('cockpit-labels-pa44', onBand(ex.placard.y, ex.placard.z), 0.025), 'its EMERGENCY EXIT placard');
  cp.dispose();
});

// (round R3) the Seminole's console between the seats (POH VB-2636 Fig 7-15, 7-19): forward to aft the stabilator trim
// wheel in its hump, the rudder trim wheel, the fuel selector levers (the left one the left engine's), the flap handle
// alongside them on the right, its grip forward; each seen and picked from the seat in every position (the flap handle
// at each detent, both trims at either end, the levers at ON, OFF and X FEED); they follow the state and say what the
// game should do
test('cockpit: the Seminole\'s console — its trims, flap handle and fuel selector levers in place, seen, picked and following', () => {
  const cp = build({ twin: AC('pa44') }); cp.setType('pa44');
  const L = SC.startLesson('m1', 'basic'); for (let i = 0; i < 60; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); }
  const s = L.s, sw = cp.switches, p = cp.parts, C = Object.fromEntries(cp.controls.map(c => [c.id, c]));
  const aim = id => { cp.root.updateMatrixWorld(true); return cp.aimPoint(C[id], new THREE.Vector3()); };
  Object.assign(s, { elev: 0, trim: 0, ail: 0, rud: 0, rudEff: 0, flapIdx: 0 }); sw.fuelSelL = 'ON'; sw.fuelSelR = 'ON'; run(cp, L, 1);
  // the order (forward = −z; right = +x): the flap grip ahead of the wheels, on their right; the levers aft
  const [tr, rt, fl, fr, fp] = ['trim', 'rudderTrim', 'fuelSelL', 'fuelSelR', 'flaps'].map(aim);
  assert.ok(fp.z < tr.z - 0.1 && tr.z < rt.z - 0.05 && rt.z < Math.min(fl.z, fr.z) - 0.03, `forward to aft: flap grip ${fp.z.toFixed(3)}, stabilator trim ${tr.z.toFixed(3)}, rudder trim ${rt.z.toFixed(3)}, fuel ${fl.z.toFixed(3)}`);
  assert.ok(fp.x > tr.x + 0.03 && fp.x > rt.x + 0.03 && fl.x < fr.x, 'the flap handle on the right of the trims; the left engine\'s lever on the left');
  for (const v of [tr, rt, fl, fr, fp]) assert.ok(Math.abs(v.x) < CABIN.FCON.w / 2 && v.y < CABIN.FCON.y1 + 0.08, 'on the console');
  // seen and picked in every position (the yoke centred: the elevator against the trim)
  const bad = [];
  for (const flapIdx of [0, 1, 2, 3]) for (const trim of [-P.TRIM_MAX, P.TRIM_MAX]) for (const [fuel, rTrim] of [['ON', -0.6], ['OFF', 0], ['XFEED', 0.6]]) {
    Object.assign(s, { elev: -trim, flapIdx, trim }); sw.fuelSelL = fuel; sw.fuelSelR = fuel;
    run(cp, L, 1, { rTrim }); cp.root.updateMatrixWorld(true);
    for (const id of ['flaps', 'trim', 'rudderTrim', 'fuelSelL', 'fuelSelR']) {
      const [picked, seen, got, by] = sightOf(cp, C[id]);
      if (!picked || !seen) bad.push(`${id} at flaps ${flapIdx}, trim ${trim.toFixed(2)}, fuel ${fuel}, rudder trim ${rTrim}: ${picked ? '' : `picked ${got} `}${seen ? '' : `hidden by ${by}`}`);
    }
  }
  assert.deepEqual(bad, []);
  // they follow: the flap handle up for more flap, the stabilator trim wheel and its pointer (aft, UP, with nose-up trim),
  // the rudder trim's index (to the right, R, with right trim), each lever (ON forward, X FEED aft)
  Object.assign(s, { elev: 0, trim: 0, flapIdx: 0 }); sw.fuelSelL = 'ON'; sw.fuelSelR = 'ON'; run(cp, L, 1.5);
  const f0 = aim('flaps').y, w0 = p.trim44.rotation.x, i0 = p.trimInd44.position.z;
  Object.assign(s, { flapIdx: 2, elev: -0.3, trim: 0.3 }); run(cp, L, 1.5, { rTrim: 0.6 });
  assert.ok(Math.abs(p.flap44.rotation.x - 22 * DEG) < 0.5 * DEG && aim('flaps').y > f0 + 0.1, 'the flap handle at 25°, its grip up');
  assert.ok(p.trim44.rotation.x !== w0 && p.trimInd44.position.z > i0 + 0.01, 'the trim wheel turns, its pointer aft (UP)');
  // (the rudder trim's wheel stands across the console, turned about the fore-aft axis: clockwise seen from aft is R)
  assert.ok(Math.abs(p.rudTrim.rotation.z + CABIN.CON44.rud.ang) < 1e-6, 'the rudder trim wheel turned clockwise (seen from aft), its index to R, at full right trim');
  assert.ok(new THREE.Vector3(0, 1, 0).applyQuaternion(p.rudTrim.quaternion).x > 0.5, 'its top to the right');
  run(cp, L, 0.1); assert.equal(p.rudTrim.rotation.z, 0, 'neutral without the game\'s rudder trim');
  const zOf = (id, v) => { sw[id] = v; run(cp, L, 0.05); return aim(id).z; };
  for (const id of ['fuelSelL', 'fuelSelR']) {
    const z = { ON: zOf(id, 'ON'), OFF: zOf(id, 'OFF'), XFEED: zOf(id, 'XFEED') };
    assert.ok(z.ON < z.OFF - 0.02 && z.OFF < z.XFEED - 0.02, `${id}: ON forward, X FEED aft ${JSON.stringify(z)}`);
    sw[id] = 'ON';
  }
  run(cp, L, 0.05);
  // what they do: the flap handle and the stabilator trim as the Archer's; the rudder trim's wheel the game's rudder trim
  // (a click says so); each lever its own engine's selector — a click ON ↔ X FEED, the wheel a notch (forward = up)
  Object.assign(s, { flapIdx: 0 });
  assert.deepEqual(C.flaps.act(1, false), { type: 'flight', name: 'flaps' });
  assert.deepEqual(C.trim.act(1, true), { type: 'flight', name: 'trimStep', arg: -1 }, 'the trim wheel forward: nose down');
  assert.deepEqual(C.rudderTrim.act(1, true), { type: 'flight', name: 'rtrimR' });
  assert.deepEqual(C.rudderTrim.act(-1, true), { type: 'flight', name: 'rtrimL' });
  assert.equal(C.rudderTrim.act(1, false).type, 'info');
  assert.deepEqual(C.fuelSelL.act(1, false), { type: 'select', id: 'fuelSelL', value: 'XFEED' });
  assert.deepEqual(C.fuelSelR.act(-1, true), { type: 'select', id: 'fuelSelR', value: 'OFF' }, 'the wheel back: a notch aft');
  assert.equal(C.fuelSelR.act(1, true), null, 'ON is the forward end');
  sw.fuelSelL = 'XFEED'; assert.deepEqual(C.fuelSelL.act(1, false), { type: 'select', id: 'fuelSelL', value: 'ON' }); assert.equal(C.fuelSelL.act(-1, true), null);
  sw.fuelSelL = 'OFF'; assert.deepEqual(C.fuelSelL.act(1, false), { type: 'select', id: 'fuelSelL', value: 'ON' }); sw.fuelSelL = 'ON';
  assert.match(C.fuelSelR.label, /右エンジン.*ON/);
  cp.dispose();
});

test('cockpit: the controls say what the game should do', () => {
  const cp = build(), L = lesson(), av = L.av;
  run(cp, L, 0.1);
  const C = Object.fromEntries(cp.controls.map(c => [c.id, c]));
  const apply = (r) => { assert.equal(r.type, 'av'); return AV.control(av, r.what, r.dir, r.big); };
  // the bezel knobs turn FLIGHT LAB's own avionics
  const hdg = av.hdgBug; apply(C['pfd.hdg'].act(1, true)); assert.equal(av.hdgBug, hdg % 360 + 1);
  apply(C['pfd.hdg'].act(1, false));
  assert.equal(av.hdgBug, Math.round(AV.trueToMag(L.s.out.hdgTrue, P.MAGVAR_W)) || 360, 'a push on HDG syncs the bug to the heading');
  const alt = av.altSel; apply(C['pfd.alt.outer'].act(1, true)); apply(C['pfd.alt.inner'].act(-1, true)); assert.equal(av.altSel, alt + 900);
  const baro = av.baro; apply(C['pfd.crs.outer'].act(1, true)); assert.ok(Math.abs(av.baro - baro - 0.01) < 1e-9, 'CRS/BARO outer: the baro setting');
  const crs = av.crs; apply(C['pfd.crs.inner'].act(-1, true)); assert.equal(av.crs, (crs + 358) % 360 + 1);
  const rng = av.mfdRangeIdx; apply(C['mfd.range'].act(-1, true)); assert.equal(av.mfdRangeIdx, rng - 1);
  const com = av.com1.stby; apply(C['pfd.com.inner'].act(1, true)); assert.notEqual(av.com1.stby, com);
  apply(C['pfd.comSwap'].act(1)); assert.equal(av.com1.act, com + 25);
  // the softkeys follow the menus: PFD → the PFD menu (WIND, ALT UNIT, STD BARO, BACK) → BACK
  const sk = (which, label) => cp.controls.find(c => c.id === `${which}.sk${(which === 'mfd' ? SOFTKEYS.mfd : av.pfdMenu === 'PFD' ? SOFTKEYS.pfdMenu : SOFTKEYS.pfdTop).findIndex(k => (typeof k.label === 'function' ? k.label(av) : k.label) === label) + 1}`);
  apply(sk('pfd', 'PFD').act(1)); assert.equal(av.pfdMenu, 'PFD');
  run(cp, L, 0.05);
  const wind = av.wind; apply(sk('pfd', 'WIND').act(1)); assert.equal(av.wind, !wind);
  apply(sk('pfd', 'STD BARO').act(1)); assert.equal(av.baro, 29.92);
  apply(sk('pfd', 'BACK').act(1)); assert.equal(av.pfdMenu, 'TOP');
  apply(sk('mfd', 'FPL').act(1)); assert.equal(av.mfdPage, 'FPL');
  assert.equal(C['pfd.sk1'].act(1).type, 'info', 'an unused key explains itself');
  // the audio panel: the monitor lamps
  const mon = av.audio.monitor.NAV1; apply(C['audio.NAV1'].act(1)); assert.equal(av.audio.monitor.NAV1, !mon);
  // switches (the overhead panel's rockers): a click toggles, the wheel sets (or does nothing)
  assert.deepEqual(C['sw.landing'].act(1, false), { type: 'switch', id: 'landing', on: true });
  assert.deepEqual(C['sw.master'].act(1, false), { type: 'switch', id: 'master', on: false });
  assert.equal(C['sw.master'].act(1, true), null, 'already on');
  for (const id of ['altr', 'magL', 'magR', 'emergBatt']) assert.deepEqual(C['sw.' + id].act(-1, true), { type: 'switch', id, on: false }, id);
  // START: a click holds it (the systems let it go), PRIMER: a stroke a press
  assert.deepEqual(C['sw.start'].act(1, false), { type: 'switch', id: 'start', on: true });
  assert.equal(C['sw.start'].act(-1, true), null, 'START is not held');
  // the three positions: the strobe (STROBE LIGHTS — strobes and beacon —, OFF, FIN STROBE — the beacon alone), the fan
  const sw = cp.switches;
  assert.equal(sw.strobeSel, 'STROBE LIGHTS'); assert.equal(C['sw.strobe'].act(1, true), null, 'at the top');
  assert.deepEqual(C['sw.strobe'].act(1, false), { type: 'select', id: 'strobeSel', value: 'OFF' }, 'a click: the top → OFF');
  sw.strobeSel = 'OFF'; assert.ok(!sw.strobe && !sw.beacon, 'OFF: neither');
  assert.deepEqual(C['sw.strobe'].act(1, false), { type: 'select', id: 'strobeSel', value: 'FIN STROBE' }, 'a click: OFF → FIN STROBE');
  assert.deepEqual(C['sw.strobe'].act(1, true), { type: 'select', id: 'strobeSel', value: 'STROBE LIGHTS' }, 'the wheel up: the top');
  sw.strobeSel = 'FIN STROBE'; assert.ok(!sw.strobe && sw.beacon, 'FIN STROBE: the beacon alone');
  assert.match(C['sw.strobe'].label, /FIN STROBE/);
  sw.strobeSel = 'STROBE LIGHTS'; assert.ok(sw.strobe && sw.beacon);
  assert.equal(sw.fan, 'OFF');
  assert.deepEqual(C['sw.fan'].act(1, false), { type: 'select', id: 'fan', value: 'LOW' }); assert.deepEqual(C['sw.fan'].act(1, true), { type: 'select', id: 'fan', value: 'HIGH' });
  assert.deepEqual(C['sw.pitot'].act(1, false), { type: 'switch', id: 'pitot', on: true });
  // the Archer's LANDG LIGHT works the taxi lamp too
  sw.landing = true; assert.equal(sw.taxi, true); sw.landing = false; assert.equal(sw.taxi, false);
  assert.deepEqual(C['fuelSel'].act(1, false), { type: 'select', id: 'fuelSel', value: 'R' });
  // the engine's controls (M4): the selector's OFF on the wheel, the mixture (cut-off on the ground only), carb heat, the primer
  cp.switches.fuelSel = 'R'; assert.deepEqual(C['fuelSel'].act(1, true), { type: 'select', id: 'fuelSel', value: 'OFF' }); cp.switches.fuelSel = 'L';
  assert.equal(C['fuelSel'].act(-1, true), null, 'L is the first');
  cp.switches.mixture = 1; assert.equal(C['mixture'].act(1, false).type, 'info', 'no cut-off in the air');
  assert.deepEqual(C['mixture'].act(-1, true), { type: 'select', id: 'mixture', value: 0.9 });
  cp.switches.mixture = 0.4; assert.deepEqual(C['mixture'].act(1, false), { type: 'select', id: 'mixture', value: 1 }, 'a click: full rich');
  cp.switches.mixture = 1;
  assert.deepEqual(C['carbHeat'].act(1, false), { type: 'switch', id: 'carbHeat', on: true });
  assert.deepEqual(C['primer'].act(1, false), { type: 'prime' });
  // what the panel has that the game does not simulate says so (the G5, the ELT, the dimmers, heat and defrost, the
  // alternate static source, the rudder trim knob: the keys'), the breakers too
  for (const id of ['stby.g5', 'elt', 'dim.switch', 'dim.panel', 'dim.avionics', 'cabinHeat', 'defrost', 'altStatic', 'rudderTrim', 'cb']) for (const [d, w] of [[1, false], [1, true], [-1, true]]) assert.equal(C[id].act(d, w).type, 'info', id);
  // flight controls: the bridge's own actions
  assert.deepEqual(C['throttle'].act(1, true), { type: 'flight', name: 'thrStep', arg: 1 });
  assert.deepEqual(C['throttle'].act(-1, true), { type: 'flight', name: 'thrStep', arg: -1 });
  assert.deepEqual(C['trim'].act(1, true), { type: 'flight', name: 'trimStep', arg: -1 }, 'the trim wheel forward: nose down');
  assert.deepEqual(C['trim'].act(-1, true), { type: 'flight', name: 'trimStep', arg: 1 });
  assert.deepEqual(C['flaps'].act(1, false), { type: 'flight', name: 'flaps' });
  assert.equal(C['flaps'].act(-1, true).type, 'info', 'no flap up from UP');
  L.s.flapIdx = 3; run(cp, L, 0.05);
  assert.equal(C['flaps'].act(1, false).type, 'info', 'no wrap from 40° to UP');
  assert.deepEqual(C['flaps'].act(-1, true), { type: 'flight', name: 'flapsUp' });
  assert.deepEqual(C['parkBrake'].act(1), { type: 'flight', name: 'parkBrake' });
  assert.deepEqual(C['door'].act(1), { type: 'exit' });
  // the switches' defaults: everything on except the landing and taxi lights, the pitot heat and START (as aircraft/
  // systems.js RUNNING), the fan OFF
  assert.deepEqual(Object.entries(cp.switches).filter(([k, v]) => v === false).map(([k]) => k).sort(), ['altAir', 'carbHeat', 'landing', 'pitot', 'propCycled', 'recog', 'start', 'taxi']);
  assert.equal(cp.switches.fan, 'OFF');
  cp.dispose();
});

test('cockpit: the moving parts follow the state', () => {
  const cp = build(), L = lesson(), s = L.s, p = cp.parts;
  const pose = (o) => { Object.assign(s, o); run(cp, L, 1.5); };
  pose({ elev: 0, trim: 0, ail: 0, rud: 0, rudEff: 0, thr: 0, flapIdx: 0 });
  const yz = p.yokeL.position.z, thr0 = p.throttle.rotation.x, trim0 = p.trim.rotation.x, ind0 = p.trimInd.position.z;
  pose({ elev: 0.5 });
  assert.ok(p.yokeL.position.z > yz + 0.02 && p.yokeR.position.z === p.yokeL.position.z, 'pulled back (aft = +z) with up elevator');
  pose({ elev: -0.5 });
  assert.ok(p.yokeL.position.z < yz - 0.02, 'pushed forward');
  pose({ elev: 0, trim: 0.3 });
  assert.ok(p.yokeL.position.z > yz + 0.01, 'the stabilator\'s trimmed position');
  assert.ok(p.trim.rotation.x !== trim0, 'the trim wheel turns');
  assert.ok(p.trimInd.position.z > ind0 + 0.01, 'its pointer aft (UP) with nose-up trim');
  pose({ trim: 0, ail: 0.8 });
  assert.ok(p.yokeL.rotation.z < -20 * DEG && p.yokeR.rotation.z === p.yokeL.rotation.z, 'turned right (clockwise as the pilot sees it)');
  pose({ ail: 0, rudEff: 0.6 });
  assert.ok(p.pedalsR.position.z < -0.01 && p.pedalsL.position.z > 0.01, 'right rudder: the right pedals forward (−z), the left ones back');
  pose({ rudEff: 0, thr: 1 });
  assert.ok(p.throttle.rotation.x < thr0 - 20 * DEG, 'the throttle forward');
  // the flap handle: its grip forward at the pedestal's foot, pulled up for more flap (where one aims at it: higher)
  const flaps = cp.controls.find(c => c.id === 'flaps'), gripY = () => { cp.root.updateMatrixWorld(true); return cp.aimPoint(flaps, new THREE.Vector3()).y; };
  const fy0 = gripY();
  pose({ thr: 0, flapIdx: 2 });
  assert.ok(Math.abs(p.flap.rotation.x - 22 * DEG) < 0.5 * DEG, `the flap handle at 25° (${(p.flap.rotation.x / DEG).toFixed(1)})`);
  assert.ok(gripY() > fy0 + 0.1, `its grip up (${fy0.toFixed(3)} → ${gripY().toFixed(3)})`);
  // the fuel selector's handle turns about its plate's normal: clockwise (as one faces the plate) from L to R
  const fuelAim = () => { cp.root.updateMatrixWorld(true); return cp.aimPoint(cp.controls.find(c => c.id === 'fuelSel'), new THREE.Vector3()); };
  const c0 = new THREE.Vector3(...CABIN.FUELSEL.c), nF = new THREE.Vector3(...CABIN.FUELSEL.n), onPlate = v => v.sub(c0).projectOnPlane(nF);
  cp.switches.fuelSel = 'L'; cp.update(DT, { s, L }); const aL = onPlate(fuelAim());
  cp.switches.fuelSel = 'R'; cp.update(DT, { s, L }); const aR = onPlate(fuelAim());
  assert.ok(new THREE.Vector3().crossVectors(aL, aR).dot(nF) < 0 && aL.angleTo(aR) > 100 * DEG, 'L → R: clockwise, ~120°');
  cp.switches.fuelSel = 'L'; cp.update(DT, { s, L });
  // the compass card turns with the magnetic heading (true + 6°), the reading under the lubber line
  const card = p.compass;
  s.out.hdgTrue = 84; run(cp, L, 6);
  assert.ok(Math.abs(card.rotation.y - 90 * DEG) < 1 * DEG, `the card at ${(card.rotation.y / DEG).toFixed(1)}° for 090`);
  s.out.hdgTrue = 174; cp.update(DT, { s, L });
  assert.ok(Math.abs(card.rotation.y - 90 * DEG) < 5 * DEG, 'it swings round, not jumps');
  run(cp, L, 8);
  assert.ok(Math.abs(card.rotation.y - 180 * DEG) < 1 * DEG, 'and settles');
  // the park brake handle: its grip swings aft (+z) when set
  const grip = cp.controls.find(c => c.id === 'parkBrake'), at = () => { cp.root.updateMatrixWorld(true); return cp.aimPoint(grip, new THREE.Vector3()); };
  const pb = at(); cp.update(DT, { s, L, parkBrake: true }); const pb1 = at();
  assert.ok(pb1.z > pb.z + 0.02, `the hand brake pulled aft (${pb.z.toFixed(3)} → ${pb1.z.toFixed(3)})`);
  cp.update(DT, { s, L, parkBrake: false });
  // carb heat: ON down, OFF up (the knob where one aims at it)
  const carb = cp.controls.find(c => c.id === 'carbHeat'), knobY = () => { cp.root.updateMatrixWorld(true); return cp.aimPoint(carb, new THREE.Vector3()).y; };
  cp.switches.carbHeat = true; cp.update(DT, { s, L }); const yOn = knobY();
  cp.switches.carbHeat = false; cp.update(DT, { s, L }); const yOff = knobY();
  assert.ok(yOn < yOff - 0.05, `carb heat: ON ${yOn.toFixed(3)} below OFF ${yOff.toFixed(3)}`);
  cp.dispose();
});

// no gear lights in either cockpit (round R3: the G1000 NXi Seminole has none — POH VB-2636 7.11): its landing gear is
// on the MFD, the LANDING GEAR box at the engine strip's foot (FLIGHT LAB's drawMFD), and while the MFD is dark
// (AVION MASTER OFF) on the PFD, as its reversionary display shows it; the Archer's displays show no such box
test('cockpit: no gear lights — the Seminole\'s landing gear on its MFD, on its PFD while the MFD is dark', () => {
  const made = [];
  const rec = (w, h) => { const c = fakeCanvas(w, h), g = c.getContext('2d'), texts = []; g.fillText = (t) => { texts.push(String(t)); }; made.push({ w, h, texts }); return c; };
  const cp = buildCockpit(FL, AC('pa28'), { makeCanvas: rec, twin: AC('pa44') }), L = SC.startLesson('m1', 'basic');
  for (let i = 0; i < 60; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); }
  assert.ok(!cp.meshes.some(m => /^cockpit-lit-pa(28|44)$/.test(m.name)), 'no gear lamps\' mesh');
  const [pfd, mfd] = made.filter(c => c.w === 1024 && c.h === 640), gearOn = c => c.texts.includes('LANDING GEAR');
  const clear = () => { pfd.texts.length = 0; mfd.texts.length = 0; };
  run(cp, lesson(), 0.3);
  assert.ok(!gearOn(pfd) && !gearOn(mfd), 'the Archer: no landing gear box');
  cp.switches.avionics = false; clear(); run(cp, lesson(), 0.3); cp.switches.avionics = true;
  assert.ok(!gearOn(pfd), 'nor on its PFD with its MFD dark');
  cp.setType('pa44'); clear(); run(cp, L, 0.3);
  assert.ok(gearOn(mfd) && !gearOn(pfd), 'the Seminole: the box on the MFD');
  cp.switches.avionics = false; clear(); run(cp, L, 0.3);
  assert.ok(gearOn(pfd) && !gearOn(mfd), 'the MFD dark: the box on the PFD');
  cp.switches.avionics = true;
  cp.dispose();
});

// the Archer's overhead switch panel (POH VB-2749 Fig 7-10): laid on the windshield header made in Blender (nothing of
// the band in front of the plate's face; the header right behind every point of it, nearer than the plate's edges reach
// back: no gap to see through); its rockers posed by the switches (two positions: ON — the lower half in, the upper out;
// START while held, PRIMER a moment after a press), each one's print turning with it; the checklists point at controls
// each type has
test('cockpit: the Archer\'s overhead switch panel — on the header, the rockers follow the switches, the checklists\' controls are there', () => {
  const O = CABIN.OVH, at = CABIN.ovhAt, mm = modelMeshes('cockpit');
  const band = ['header.wall', 'headliner.roof', 'seals.rubber', 'visors.wall', 'visorHw.steel'].map(k => {
    const q = mm.get(k), g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(q.pos, 3));
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide })); m.updateMatrixWorld(); return m;
  });
  const rc = new THREE.Raycaster(); let front = Infinity, gap = 0, edgeGap = 0;
  for (let x = -O.x; x <= O.x + 1e-9; x += 0.01) for (let s = 0; s <= O.h + 1e-9; s += O.h / 8) {
    const p = at(x, s, 0), n = at(x, s, 0.001).sub(p).normalize();
    rc.set(p.clone().addScaledVector(n, 1e-4), n); rc.far = 0.05;
    const f = rc.intersectObjects(band)[0]; if (f) front = Math.min(front, f.distance);
    rc.set(p.clone().addScaledVector(n, 1e-4), n.clone().negate()); rc.far = 0.05;
    const b = rc.intersectObjects(band)[0], d = b ? b.distance : Infinity;
    gap = Math.max(gap, d); if (s < 1e-9 || s > O.h - 1e-6 || Math.abs(Math.abs(x) - O.x) < 1e-6) edgeGap = Math.max(edgeGap, d);
  }
  assert.equal(front, Infinity, 'nothing of the band in front of the plate');
  assert.ok(gap < 0.006 && edgeGap < 0.004, `the header behind the plate: ${(gap * 1000).toFixed(1)} mm at most, ${(edgeGap * 1000).toFixed(1)} mm at its edges (they reach 4 mm back)`);
  // the rockers and their print
  const cp = build({ twin: AC('pa44') }), L = lesson(), sw = cp.switches;
  run(cp, L, 0.1);
  const rk = cp.meshes.find(m => m.name === 'cockpit-rockers'), pr = cp.meshes.find(m => m.name === 'cockpit-rocker-print');
  const snap = mesh => Array.from({ length: mesh.count }, (_, i) => { const m = new THREE.Matrix4(); mesh.getMatrixAt(i, m); return m; });
  const changed = (a, b) => a.map((m, i) => (m.equals(b[i]) ? -1 : i)).filter(i => i >= 0);
  const C = Object.fromEntries(cp.controls.map(c => [c.id, c]));
  // the rocker's upper end, off the plate (along its control's hit box's normal): out (ON) or in (OFF)
  const topOut = (m, id) => { const hit = C[id].target, n = new THREE.Vector3().setFromMatrixColumn(hit.matrix, 2).normalize(); return new THREE.Vector3(0, 0.014, 0.0045).applyMatrix4(m).sub(hit.position).dot(n); };
  for (const [id, key] of [['sw.master', 'master'], ['sw.magL', 'magL'], ['sw.avionics', 'avionics'], ['sw.pitot', 'pitot']]) {
    const r0 = snap(rk), p0 = snap(pr), on0 = !!sw[key];
    sw[key] = !on0; run(cp, L, 0.05);
    const r1 = snap(rk), p1 = snap(pr), dr = changed(r0, r1), dp = changed(p0, p1);
    assert.equal(dr.length, 1, `${id}: one rocker turned`); assert.ok(dp.length >= 1, `${id}: its print with it`);
    assert.ok(new THREE.Vector3().setFromMatrixPosition(r1[dr[0]]).distanceTo(C[id].target.position) < 0.012, `${id}: the rocker under its control`);
    const t0 = topOut(r0[dr[0]], id), t1 = topOut(r1[dr[0]], id);
    assert.ok(on0 ? t1 < t0 - 0.003 : t1 > t0 + 0.003, `${id}: ${on0 ? 'OFF: the upper half in' : 'ON: the upper half out'} (${(t0 * 1000).toFixed(1)} → ${(t1 * 1000).toFixed(1)} mm)`);
    for (const j of dp) assert.ok(new THREE.Vector3().setFromMatrixPosition(p1[j]).distanceTo(new THREE.Vector3().setFromMatrixPosition(r1[dr[0]])) < 0.02, `${id}: the print on its rocker`);
    sw[key] = on0; run(cp, L, 0.05);
  }
  // START pressed while the starter is held; PRIMER a moment after a press; the strobe's three positions three poses
  { const r0 = snap(rk); sw.start = true; run(cp, L, 0.05); assert.equal(changed(r0, snap(rk)).length, 1, 'START pressed'); sw.start = false; run(cp, L, 0.05); assert.equal(changed(r0, snap(rk)).length, 0, 'and let go'); }
  { const r0 = snap(rk); assert.deepEqual(C.primer.act(1, false), { type: 'prime' }); run(cp, L, 0.1); assert.equal(changed(r0, snap(rk)).length, 1, 'PRIMER pressed'); run(cp, L, 0.5); assert.equal(changed(r0, snap(rk)).length, 0, 'and back'); }
  { const poses = STROBES.map(v => { sw.strobeSel = v; run(cp, L, 0.05); return snap(rk); });
    assert.equal(changed(poses[0], poses[1]).length, 1); assert.equal(changed(poses[1], poses[2]).length, 1); assert.equal(changed(poses[0], poses[2]).length, 1); sw.strobeSel = 'STROBE LIGHTS'; }
  // the rockers and their print are the Archer's: not in the Seminole's view
  cp.setType('pa44'); cp.root.updateMatrixWorld(true);
  for (const m of [rk, pr]) { let v = true; for (let q = m; q; q = q.parent) v = v && q.visible; assert.ok(!v, `${m.name}: not in the Seminole`); }
  // every checklist item's control is one the type's cockpit has (the guidance ring)
  for (const [t, lists] of [['pa28', CHECKLISTS_ARCHER], ['pa44', CHECKLISTS_SEMINOLE]]) {
    cp.setType(t); const ids = new Set(cp.controls.map(c => c.id));
    // (an item of several switches rings them in turn: its function's ids — content/checklists-seminole.js ring)
    for (const [k, list] of Object.entries(lists)) for (const it of list.items) for (const id of typeof it[3] === 'function' ? it[3].ids : it[3] ? [it[3]] : []) assert.ok(ids.has(id), `${t} ${k}: ${it[0]} → ${id}`);
  }
  cp.dispose();
});

// (round R3's fix) a cadet who does only what the guidance ring shows: the Seminole's day from the walk-around through
// its checklists — before start, both engines' start, before taxi with the crossfeed, the taxi out, the ground check
// with each engine's magnetos — and then the shutdown, each item done by clicking the control it rings (through the
// control's own act(), as the game applies it; an item of several switches moves its ring along them), the throttle by
// clicks and the wheel towards the item's rpm, an item to look at confirmed: every item ticks, the instructor is never
// needed, and the run-up's readings are each engine's own
test('cockpit: the Seminole\'s checklists done by clicking only the ringed controls', () => {
  const P_ = FL.physics, STAND = { a: 636.5, c: 207.6 }, NOKEYS = { has: () => false };
  const day = createDay(FL, { seed: 3, level: 'basic', anomalies: [], stand: STAND, plan: planFor(FL, 'm1') });
  for (const p of KITS.pa44.POINTS) { const card = day.walk.inspect(p.id); if (card.choices.some(c => c.act === 'task')) day.walk.act(p.id, 'task'); day.walk.act(p.id, 'ok'); }
  const cp = build({ twin: AC('pa44') }); cp.setType('pa44');
  const C = Object.fromEntries(cp.controls.filter(c => c.type !== 'pa28').map(c => [c.id, c]));
  const fl = createFlight(FL, { store: null }), sw = cp.switches, sys = createSystems(sw);
  const [n, e] = P_.rwyToNE(P_.LAB_RWY, STAND.a, STAND.c);
  fl.startOnGround(n, e, (P_.LAB_RWY.trueHdg + 270) % 360, 'pa44', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  sys.setCold(fl.s); day.boarded();
  const pos = () => { const p = P_.ne(fl.s), rc = P_.rwyCoords(P_.LAB_RWY, p.n, p.e); return { a: rc.along, c: rc.cross }; };
  const ctx = (dt) => ({ dt, sw, sys, s: fl.s, park: fl.controls.parkBrake, av: fl.av, rpm: sys.rpm, pos: pos(), v: Math.hypot(fl.s.vel[0], fl.s.vel[2]), hdg: P_.attitude(fl.s).hdg,
    onGround: fl.s.onGround, act: (a, x) => fl.action(a, x), setThr: (x) => { fl.s.thr = x; }, setFlaps: (i) => { fl.s.flapIdx = i; }, prime: () => sys.prime() });
  const apply = (d) => { if (!d) return; if (d.type === 'flight') fl.action(d.name, d.arg); else if (d.type === 'switch') sw[d.id] = d.on; else if (d.type === 'select') sw[d.id] = d.value; else if (d.type === 'av') AV.control(fl.av, d.what, d.dir, d.big); };
  const stuck = [], ticked = [];
  let key = '', wait = 0, clicks = 0, taxi = null, shut = false, T = 0;
  for (let f = 0; f < 60 * 60 * 20 && !(shut && day.phase !== 'shutdown'); f++) {
    const dt = 1 / 60; T += dt;
    if ((day.phase === 'tower' || day.phase === 'lineup') && !shut) { shut = true; day.abortTo('shutdown'); fl.s.thr = 0.045; continue; }
    const L = day.items(), it = L && L.items[L.i];
    if (it) {
      const k = `${L.id}:${L.i}`;
      if (k !== key) { key = k; wait = 0; clicks = 0; }
      if ((wait -= dt) <= 0) {
        wait = it.ctl === 'throttle' ? 1.5 : 3;                    // (a look at what it did before the next click)
        if (it.confirm) day.confirm(ctx(0));
        else if (++clicks > 24) { stuck.push(`${k} ${it.name} — ${it.what}: '${it.ctl}' clicked, never true`); day.assist(ctx(0)); clicks = 0; }
        else if (!it.ctl || !C[it.ctl]) { if (clicks > 10) stuck.push(`${k} ${it.name}: no ring (${it.ctl})`); }   // (one that ticks by itself: the walk-around done, the oil pressure)
        else if (sys.cranking) clicks--;                             // (START held: let it catch)
        else if (it.ctl === 'throttle') {
          // the throttle: up by a click, down by the wheel, towards the item's rpm (idle first where it says so)
          const m = /([\d,]+) rpm/.exec(it.what), idle = /アイドル/.test(it.what) && (!m || !day.st.memo.idle), want = idle ? 0 : m ? +m[1].replace(',', '') : null;
          if (want === 0 || (want != null && sys.rpm > want + 60)) apply(C.throttle.act(-1, true)); else apply(C.throttle.act(1, false));
        } else apply(C[it.ctl].act(1, false));
      }
    }
    { const v = day.atc.view(); if (v && v.phase === 'choose') day.atc.answer(day.atc.rightIndex()); }
    if (day.phase === 'taxiOut' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeOut(STAND)); }
    fl.frame(dt, NOKEYS, { pilot: taxi ? taxi.fly : null });
    sys.update(dt, fl.s);
    cp.update(dt, { s: fl.s, L: null, av: fl.av, parkBrake: fl.controls.parkBrake });
    for (const ev of day.update(ctx(dt))) {
      if (ev.type === 'tick') ticked.push(`${ev.list}:${ev.i}`);
      if (ev.type === 'phase') { taxi = null; if (ev.to === 'runup') fl.action('parkBrake', true); }
    }
  }
  assert.deepEqual(stuck, [], 'items the ring alone could not do');
  assert.equal(day.st.auto.list, 0, 'the instructor never needed');
  for (const [list, C_] of Object.entries({ before_start: 0, start: 0, after_start: 0, runup: 0, shutdown: 0 })) {
    const nItems = CHECKLISTS_SEMINOLE[list].items.length;
    for (let i = 0; i < nItems; i++) assert.ok(ticked.includes(`${list}:${i}`), `${list}:${i} ${CHECKLISTS_SEMINOLE[list].items[i][0]} ticked`);
  }
  const m = day.st.memo;
  assert.ok(m.dropL > 100 && m.dropL < 125 && m.dropR > 80 && m.dropR < 100 && m.rDropL > 90 && m.rDropL < 110 && m.rDropR > 115 && m.rDropR < 135, `each engine's own drops ${JSON.stringify({ dL: m.dropL, dR: m.dropR, rL: m.rDropL, rR: m.rDropR })}`);
  assert.ok(m.xfeed && !sys.anyRunning, 'the crossfeed seen; both engines stopped at the end');
  cp.dispose();
});

test('cockpit: the screens are redrawn on schedule, only when seen and powered', () => {
  const cp = build(), L = lesson(), st = cp.stats;
  run(cp, L, 0.1);
  const at0 = { ...st };
  run(cp, L, 2);
  assert.ok(Math.abs(st.pfd - at0.pfd - 60) <= 2, `PFD ${st.pfd - at0.pfd} draws in 2 s`);
  assert.ok(Math.abs(st.mfd - at0.mfd - 20) <= 1, `MFD ${st.mfd - at0.mfd} draws in 2 s`);
  assert.ok(Math.abs(st.standby - at0.standby - 30) <= 1, `standby ${st.standby - at0.standby} draws in 2 s`);
  assert.equal(st.strips, at0.strips, 'the softkey labels only when the avionics change');
  AV.control(L.av, 'PFD_MENU', 'PFD'); run(cp, L, 0.05);
  assert.equal(st.strips, at0.strips + 1, 'redrawn after a menu change');
  // at 144 Hz still 30 / 10 a second
  const at1 = { ...st };
  for (let i = 0; i < 288; i++) cp.update(1 / 144, { s: L.s, L });
  assert.ok(Math.abs(st.pfd - at1.pfd - 60) <= 2 && Math.abs(st.mfd - at1.mfd - 20) <= 1, `at 144 Hz: PFD ${st.pfd - at1.pfd}, MFD ${st.mfd - at1.mfd}`);
  // not seen: nothing drawn (the parts still move)
  cp.setVisible(false);
  const at2 = { ...st }, yz = cp.parts.yokeL.position.z;
  L.s.elev = 0.7; run(cp, L, 1);
  assert.deepEqual(st, at2, 'no drawing while hidden');
  assert.ok(cp.parts.yokeL.position.z !== yz);
  assert.equal(cp.root.visible, false);
  cp.setVisible(true); cp.update(DT, { s: L.s, L });
  assert.equal(st.pfd, at2.pfd + 1, 'drawn at once when seen again');
  // the power, the G1000 NXi's buses (a black screen is not drawn; the G5 standby lit, and drawn, exactly when the PFD
  // is): AVION MASTER OFF — the MFD black, the PFD and the G5 on (the essential bus); BATT MASTR OFF with EMERG BATT ARM
  // — the same, from the emergency battery; both OFF — all black
  const b0 = st.blank;
  cp.switches.avionics = false; run(cp, L, 0.1);
  assert.equal(st.blank, b0 + 1, 'the MFD blanked');
  const at3 = { ...st };
  run(cp, L, 1);
  assert.equal(st.mfd, at3.mfd, 'no MFD without AVION MASTER');
  assert.ok(st.pfd > at3.pfd + 25 && st.standby > at3.standby + 12, 'the PFD and the G5 on the essential bus');
  cp.switches.avionics = true; cp.switches.master = false; run(cp, L, 0.1);
  const at4 = { ...st };
  run(cp, L, 1);
  assert.equal(st.mfd, at4.mfd, 'no MFD without BATT MASTR'); assert.ok(st.pfd > at4.pfd + 25 && st.standby > at4.standby + 12, 'EMERG BATT ARM: the PFD and the G5');
  cp.switches.emergBatt = false; run(cp, L, 0.1);
  const at5 = { ...st };
  run(cp, L, 1);
  assert.equal(st.pfd, at5.pfd, 'no PFD with neither BATT MASTR nor EMERG BATT'); assert.equal(st.standby, at5.standby, 'nor the G5');
  cp.switches.master = true; cp.switches.emergBatt = true; run(cp, L, 0.1);
  assert.ok(st.pfd > at5.pfd && st.mfd > at5.mfd && st.standby > at5.standby, 'back on');
  // night: the labels and dials are backlit
  const lab = cp.meshes.find(m => m.name === 'cockpit-labels').material;
  cp.update(DT, { s: L.s, L, night: 0 }); assert.equal(lab.emissiveIntensity, 0);
  cp.update(DT, { s: L.s, L, night: 1 }); assert.ok(lab.emissiveIntensity > 0.3);
  assert.equal(cp.meshes.find(m => m.name === 'cockpit-rocker-print').material.emissiveIntensity, lab.emissiveIntensity, 'the rockers\' print backlit with them');
  // bad steps do no harm
  cp.update(NaN, { s: L.s, L }); cp.update(-1, { s: L.s, L }); cp.update(5, { s: L.s, L }); cp.update(DT, null); cp.update(DT, {});
  assert.ok(Number.isFinite(cp.parts.compass.rotation.y) && Number.isFinite(cp.parts.flap.rotation.x));
  cp.dispose();
});

test('cockpit: update() works on the same objects every frame (no allocation)', () => {
  const cp = build(), L = lesson(), s = L.s;
  run(cp, L, 0.5);
  const objs = [];
  cp.root.traverse(o => objs.push(o, o.position, o.quaternion, o.rotation, o.scale, o.matrix, o.geometry || null, o.material || null));
  const P3 = [THREE.Vector3, THREE.Quaternion, THREE.Matrix4, THREE.Euler, THREE.Matrix3, THREE.Color].map(C => C.prototype);
  const orig = P3.map(p => p.clone);
  let clones = 0;
  P3.forEach((p, i) => { p.clone = function () { clones++; return orig[i].call(this); }; });
  try {
    for (let i = 0; i < 600; i++) {
      s.elev = Math.sin(i * 0.05) * 0.6; s.ail = Math.cos(i * 0.03); s.rudEff = Math.sin(i * 0.02); s.thr = (i % 200) / 200; s.flapIdx = (i / 150) | 0;
      if (i === 300) { cp.switches.nav = false; AV.control(L.av, 'MFD_FPL'); }
      cp.update(DT, { s, L, night: i > 400 ? 1 : 0, parkBrake: i % 120 < 60 });
    }
  } finally { P3.forEach((p, i) => { p.clone = orig[i]; }); }
  assert.equal(clones, 0, 'clone() during update()');
  const after = [];
  cp.root.traverse(o => after.push(o, o.position, o.quaternion, o.rotation, o.scale, o.matrix, o.geometry || null, o.material || null));
  assert.equal(after.length, objs.length);
  after.forEach((o, i) => assert.ok(o === objs[i], `object ${i} was replaced`));
  // and the per-frame code has no constructors, clones, spreads, closures or literals in it (the cockpit's, and the glass
  // panel's drawing that it calls: the screens, the softkey labels, the standby dials)
  for (const f of ['cockpit.js', 'g1000.js']) {
    const src = fs.readFileSync(path.join(here, '../src/aircraft', f), 'utf8');
    const a = src.indexOf('per frame (no allocation below this line'), b = src.indexOf('end of the per-frame code');
    assert.ok(a > 0 && b > a, `${f}: the per-frame code is marked`);
    const body = src.slice(a, b).replace(/\/\/.*$/gm, '');
    assert.ok(body.length > 2000, `${f}: found the per-frame code`);
    for (const [re, what] of [[/\bnew\s/, 'new'], [/\.clone\(/, 'clone()'], [/\.\.\./, 'spread'], [/=>/, 'closure'], [/\[\s*\]|\{\s*\}/, 'literal'], [/`/, 'template string']]) {
      assert.ok(!re.test(body), `${f}: ${what} in the per-frame code`);
    }
  }
  cp.dispose();
});

test('cockpit: dispose() frees it', () => {
  const cp = build(), parent = new THREE.Group();
  parent.add(cp.root);
  let disposed = 0;
  for (const m of cp.meshes) m.geometry.addEventListener('dispose', () => disposed++);
  cp.dispose();
  assert.equal(cp.root.parent, null);
  assert.equal(disposed, cp.meshes.length);
});
