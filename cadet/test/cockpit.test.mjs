// CADET — cockpit tests (node --test): the flown Archer's cabin (src/aircraft/cockpit.js, src/aircraft/g1000.js), without a
// browser (the canvases are fakes that take every 2D call).
//  - it builds within budget: ≤ 40 draw calls, ≤ 40,000 triangles, ≤ 6 MB of textures; the screens are unlit (their
//    material not tone mapped: CADET's OutputPass still tone maps the whole image), never mipmapped;
//  - the view from the left seat: the PFD ahead and below, the MFD to its right, the whole of both displays in sight
//    (the bezels' lips hide nothing), the glareshield ~12–15° below the eye with the cowling over it, the roof ~0.2 m
//    over the head, nothing within 0.12 m of the eye;
//  - every control has a name, a kind, a hit box inside the cabin, is in sight and can be picked from the seat, and
//    says what to do (descriptors that FLIGHT LAB's own avionics control accepts);
//  - the yokes, pedals, levers, flap handle, trim wheel and compass card follow the state;
//  - the screens are redrawn on schedule (PFD 30 Hz, MFD 10 Hz), only when seen, black without power, and the softkey
//    labels only when the avionics change;
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
import { createActor, seatFromBody } from '../src/npc/actor.js';
import { modelMeshes } from '../src/aircraft/archer-model.js';

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
    'cockpit-pedalsL', 'cockpit-pedalsR', 'cockpit-throttle', 'cockpit-flap', 'cockpit-trim', 'cockpit-compass-card', 'cockpit-rockers']) assert.ok(names.has(n), n);
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
    'bench.seat', 'bench.seatSide', 'glareshield.glare', 'glareshield.glareLip', 'glareshield.rubber', 'header.wall', 'headliner.roof', 'pillars.wall',
    'roofTrims.trim', 'seals.rubber', 'seats.alu', 'seats.black', 'seats.chrome', 'seats.seat', 'seats.seatSide', 'visorHw.steel', 'visors.wall',
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

const KINDS = new Set(['button', 'knob', 'lever', 'switch', 'handle']);
const TYPES = new Set(['flight', 'av', 'switch', 'select', 'exit', 'prime', 'info']);
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
    // from the eye, along the line to where one aims at it (where its part is now)
    assert.ok(c.at.isVector3, `${c.id}: an aim point`);
    const to = cp.aimPoint(c, new THREE.Vector3());
    const rc = new THREE.Raycaster(cp.eye.clone(), to.clone().sub(cp.eye).normalize(), 0, 3);
    const got = cp.pick(rc);
    if (got !== c) unpicked.push(`${c.id} (${got ? got.id : 'nothing'})`);
    assert.equal(rc.layers.mask, new THREE.Layers().mask, 'pick() leaves the raycaster as it was');
    // and seen there: nothing drawn stands in front of the aim point (picking goes through what is drawn, so a control
    // hidden behind a seat or the yoke could be clicked without being seen)
    const front = firstHit(cp, to.clone().sub(cp.eye), cp.eye, n => n === 'cockpit-glass' || n === 'cockpit-labels');
    if (front && front.distance < to.distanceTo(cp.eye) - 0.03 && front.object.name !== `cockpit-${c.part}`) unseen.push(`${c.id} (${front.object.name})`);
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
const COMMON_IDS = ['pfd.hdg', 'pfd.alt.inner', 'pfd.alt.outer', 'pfd.crs.outer', 'mfd.range', 'sw.master', 'sw.avionics', 'sw.landing', 'mag', 'throttle',
  'mixture', 'parkBrake', 'yokeL', 'pedals', 'flaps', 'trim', 'fuelSel', 'door', 'compass', 'stby.att', 'audio.COM1MIC', 'pfd.sk3', 'mfd.sk3'];
test('cockpit: every control can be found, picked from the seat, and says what to do', () => {
  const cp = build();
  const ids = controlsCheck(cp, lesson(), [...COMMON_IDS, 'carbHeat']);
  assert.ok(!ids.has('gear') && !ids.has('prop'), 'the Archer: no gear selector, no propeller levers');
  cp.dispose();
});

// (M6) the Seminole's own: its quadrant (two of each lever), its gear selector and lights, its nose; the same panel
test('cockpit: the Seminole\'s — its levers and gear selector found, picked and seen from the seat; within budget', () => {
  const cp = build({ twin: AC('pa44') });
  const tri0 = cp.triangles;
  assert.equal(cp.type, 'pa28');
  assert.ok(!cp.controls.some(c => c.id === 'gear'), 'the Archer\'s view first');
  cp.setType('pa44');
  assert.equal(cp.type, 'pa44');
  const L = SC.startLesson('m1', 'basic'); for (let i = 0; i < 60; i++) { P.step(L.s, 1 / 120); SC.update(L, 1 / 120); }
  const ids = controlsCheck(cp, L, [...COMMON_IDS, 'gear', 'prop', 'carbHeat']);
  assert.equal([...ids].filter(id => id === 'throttle').length, 1, 'one throttle control for the pair');
  // what is drawn: the Seminole's parts, not the Archer's
  cp.root.updateMatrixWorld(true);
  const names = new Set(); let calls = 0, count = 0;
  cp.root.traverse(o => { let v = true; for (let p = o; p; p = p.parent) v = v && p.visible; if (v && drawn(o)) { calls++; count += tris(o.geometry) * (o.isInstancedMesh ? o.count : 1); names.add(o.name); } });
  for (const n of ['cockpit-nose', 'cockpit-thrL', 'cockpit-thrR', 'cockpit-propL', 'cockpit-propR', 'cockpit-mixL', 'cockpit-mixR', 'cockpit-gearLever', 'cockpit-shell-pa44', 'cockpit-labels-pa44']) assert.ok(names.has(n), n);
  for (const n of ['cockpit-cowl', 'cockpit-throttle', 'cockpit-mixture', 'cockpit-shell-pa28']) assert.ok(!names.has(n), `no ${n}`);
  assert.ok(calls <= 44, `${calls} draw calls`);
  assert.equal(count, cp.trianglesTwin);
  assert.ok(cp.trianglesTwin <= 40000 && tri0 === cp.triangles, `${cp.trianglesTwin} triangles`);
  // the levers and the selector follow the state; the lights: three green down and locked, red in transit
  const p = cp.parts, s = L.s;
  Object.assign(s, { thr: 0 }); run(cp, L, 0.3); const t0 = p.thrL.rotation.x;
  Object.assign(s, { thr: 1 }); run(cp, L, 0.3);
  assert.ok(p.thrL.rotation.x < t0 - 20 * DEG && p.thrR.rotation.x === p.thrL.rotation.x, 'the throttles forward together');
  const g0 = p.gearLever.rotation.x;
  Object.assign(s, { gearDown: false }); run(cp, L, 0.1);
  assert.ok(p.gearLever.rotation.x < g0 - 30 * DEG, 'the gear selector up');
  const prop0 = p.propL.rotation.x;
  cp.switches.propCycleT = 1.3; run(cp, L, 0.05);
  assert.ok(p.propL.rotation.x > prop0 + 20 * DEG, 'the propeller levers pulled back while cycled');
  cp.setType('pa28'); assert.equal(cp.type, 'pa28');
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
  // switches: a click toggles, the wheel sets (or does nothing)
  assert.deepEqual(C['sw.landing'].act(1, false), { type: 'switch', id: 'landing', on: true });
  assert.deepEqual(C['sw.master'].act(1, false), { type: 'switch', id: 'master', on: false });
  assert.equal(C['sw.master'].act(1, true), null, 'already on');
  assert.deepEqual(C['mag'].act(-1, true), { type: 'select', id: 'mag', value: 'L' });
  assert.equal(C['mag'].act(1, true).value, 'START');
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
  // the switches' defaults: everything on except the landing and taxi lights and the pitot heat
  assert.deepEqual(Object.entries(cp.switches).filter(([k, v]) => v === false).map(([k]) => k).sort(), ['carbHeat', 'landing', 'pitot', 'propCycled', 'taxi']);
  cp.dispose();
});

test('cockpit: the moving parts follow the state', () => {
  const cp = build(), L = lesson(), s = L.s, p = cp.parts;
  const pose = (o) => { Object.assign(s, o); run(cp, L, 1.5); };
  pose({ elev: 0, trim: 0, ail: 0, rud: 0, rudEff: 0, thr: 0, flapIdx: 0 });
  const yz = p.yokeL.position.z, thr0 = p.throttle.rotation.x, trim0 = p.trim.rotation.x;
  pose({ elev: 0.5 });
  assert.ok(p.yokeL.position.z > yz + 0.02 && p.yokeR.position.z === p.yokeL.position.z, 'pulled back (aft = +z) with up elevator');
  pose({ elev: -0.5 });
  assert.ok(p.yokeL.position.z < yz - 0.02, 'pushed forward');
  pose({ elev: 0, trim: 0.3 });
  assert.ok(p.yokeL.position.z > yz + 0.01, 'the stabilator\'s trimmed position');
  assert.ok(p.trim.rotation.x !== trim0, 'the trim wheel turns');
  pose({ trim: 0, ail: 0.8 });
  assert.ok(p.yokeL.rotation.z < -20 * DEG && p.yokeR.rotation.z === p.yokeL.rotation.z, 'turned right (clockwise as the pilot sees it)');
  pose({ ail: 0, rudEff: 0.6 });
  assert.ok(p.pedalsR.position.z < -0.01 && p.pedalsL.position.z > 0.01, 'right rudder: the right pedals forward (−z), the left ones back');
  pose({ rudEff: 0, thr: 1 });
  assert.ok(p.throttle.rotation.x < thr0 - 20 * DEG, 'the throttle forward');
  pose({ thr: 0, flapIdx: 2 });
  assert.ok(Math.abs(p.flap.rotation.x + 22 * DEG) < 0.5 * DEG, `the flap handle at 25° (${(p.flap.rotation.x / DEG).toFixed(1)})`);
  // the compass card turns with the magnetic heading (true + 6°), the reading under the lubber line
  const card = p.compass;
  s.out.hdgTrue = 84; run(cp, L, 6);
  assert.ok(Math.abs(card.rotation.y - 90 * DEG) < 1 * DEG, `the card at ${(card.rotation.y / DEG).toFixed(1)}° for 090`);
  s.out.hdgTrue = 174; cp.update(DT, { s, L });
  assert.ok(Math.abs(card.rotation.y - 90 * DEG) < 5 * DEG, 'it swings round, not jumps');
  run(cp, L, 8);
  assert.ok(Math.abs(card.rotation.y - 180 * DEG) < 1 * DEG, 'and settles');
  // the park brake handle
  const pb = p.brake.rotation.x; cp.update(DT, { s, L, parkBrake: true }); assert.ok(p.brake.rotation.x !== pb);
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
  // no power: black screens, no drawing (the standby instruments go on)
  cp.switches.avionics = false; run(cp, L, 0.1);
  const at3 = { ...st };
  assert.ok(st.blank >= 2, 'blanked');
  run(cp, L, 1);
  assert.equal(st.pfd, at3.pfd); assert.equal(st.mfd, at3.mfd);
  assert.ok(st.standby > at3.standby, 'the standby instruments need no power');
  cp.switches.avionics = true; run(cp, L, 0.1);
  assert.ok(st.pfd > at3.pfd, 'back on');
  // night: the labels and dials are backlit
  const lab = cp.meshes.find(m => m.name === 'cockpit-labels').material;
  cp.update(DT, { s: L.s, L, night: 0 }); assert.equal(lab.emissiveIntensity, 0);
  cp.update(DT, { s: L.s, L, night: 1 }); assert.ok(lab.emissiveIntensity > 0.3);
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
