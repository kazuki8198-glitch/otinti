// CADET — dorm exit regression (node --test): the walk from the player's dorm room out of the building,
// across to the academy entrance, and the whole way back — headless, with the real builders, collision
// world, walker, interactor and door groups, driven the way a player drives them (steer + E on the
// door under the prompt). Regression guarded: the entrance hall's bench stood dead-centre of the front
// doorway lane (dorm-spec bench at a 643.2, c 367.8, rot 90 — collider c 367.0–368.6 × a 642.98–643.43),
// 0.6 m inside the sliding doors; walking straight out stopped at c=368.88 with the doors wide open —
// the player's 「寮の外に出られない」. The outward leg therefore walks the doorway's own centre line
// (a = 643.2) with NO sidestep waypoint.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- headless stubs (as in test/doors.test.mjs)
const grad = { addColorStop: () => {} };
const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
    if (k in t) return t[k];
    return () => {};
  },
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.document = { createElement: (tag) => tag === 'canvas' ? { width: 1, height: 1, getContext: () => ctx2d } : {} };
globalThis.Image = class { constructor() { this.width = 4; this.height = 4; } decode() { return Promise.resolve(); } set src(v) {} };
{
  const map = {};
  for (const f of fs.readdirSync(path.join(here, '..', 'assets', 'tex')).sort()) {
    if (!/\.(webp|jpg|png)$/.test(f)) continue;
    map['tex/' + path.basename(f, path.extname(f))] = 'data:,';
  }
  globalThis.CADET_ASSETS = map;
}

for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '..', '..', 'flight-lab', 'src', m), 'utf8'), { filename: m });
const { installSorajima } = await import('../src/flight/sorajima.js');
installSorajima(globalThis.FL);
const FL = globalThis.FL;
const { loadTextures } = await import('../src/render/textures.js');
await loadTextures();
const { makeLayout } = await import('../src/world/layout.js');
const { createCollisionWorld } = await import('../src/player/collide.js');
const { createWalker } = await import('../src/player/walker.js');
const { createInteractor } = await import('../src/player/interact.js');
const { createPropKit } = await import('../src/world/props.js');
const { buildDorm } = await import('../src/world/dorm.js');
const { dormSpec } = await import('../src/content/dorm-spec.js');
const { buildAcademy } = await import('../src/world/academy.js');
const { academySpec } = await import('../src/content/academy-spec.js');

const L = makeLayout(FL.physics);
const world = createCollisionWorld();
const dspec = dormSpec();
const dorm = buildDorm({ L, FL, spec: dspec, kit: createPropKit(), world, audio: null });
const spec = academySpec(FL);
const academy = buildAcademy({ L, FL, spec, kit: createPropKit(), world, audio: null });

const settings = { get: (k) => ({ headBob: false, fov: 75, sensitivity: 1, invertY: false })[k] };
const input = { takeLook: () => ({ x: 0, y: 0 }), down: () => false };
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const walker = createWalker({ camera, world, L, input, settings });
const hud = { prompt: () => {}, card: () => {} };
const interactor = createInteractor({ walker, world, L, hud });
for (const t of dorm.doors.targets()) interactor.add({ ...t, use: () => dorm.doors.toggle(t.door, walker.framePos) });
for (const t of academy.doors.targets()) interactor.add({ ...t, use: () => academy.doors.toggle(t.door, walker.framePos) });

{
  const [x, , z] = L.rwyToLocal(dspec.start.a, dspec.start.c);
  walker.setPose(x, z, 0, 0);
  walker.lookAt(...L.rwyToLocal(dspec.start.face.a, dspec.start.face.c, 1.5));
}

const dt = 1 / 60;
const prompted = new Set();
let mainDoorMaxOpen = 0;
function step() {
  walker.update(dt, { look: { x: 0, y: 0 } });
  dorm.update(dt, walker.framePos);
  academy.update(dt, walker.framePos);
  interactor.update(camera);
  const cur = interactor.current;
  if (cur && cur.door) prompted.add(cur.door.id);
  const main = dorm.doors.doors.find(d => d.id === 'x-dorm-main');
  if (main && main.open > mainDoorMaxOpen) mainDoorMaxOpen = main.open;
}

// steer at a frame point; press E only when the prompt's door is a closed swing door, as a player would
function driveTo(a1, c1, label, maxT = 60) {
  let t = 0, lastD = Infinity, still = 0;
  while (t < maxT) {
    const fp = walker.framePos, d = Math.hypot(a1 - fp.a, c1 - fp.c);
    if (d < 0.3) return;
    const [wx, , wz] = L.rwyToLocal(a1, c1);
    walker.state.yaw = Math.atan2(-(wx - walker.state.x), -(wz - walker.state.z));
    walker.state.pitch = -0.1;
    walker.setAuto({ forward: Math.min(1, 0.25 + d / 0.8) });
    step();
    t += dt;
    const cur = interactor.current;
    if (cur && cur.door && Math.abs(cur.door.target) < 0.01 && cur.door.kind !== 'locked' && cur.door.kind !== 'sliding_auto') {
      interactor.use();
      for (let k = 0; k < 50; k++) { walker.setAuto({ forward: 0 }); step(); t += dt; }
    }
    if (d > lastD - 1e-4) still += dt; else still = 0;
    lastD = d;
    assert.ok(still <= 4, `stuck on leg "${label}" at a=${walker.framePos.a.toFixed(2)} c=${walker.framePos.c.toFixed(2)} (target ${a1}, ${c1})`);
  }
  assert.fail(`timed out on leg "${label}" at a=${walker.framePos.a.toFixed(2)} c=${walker.framePos.c.toFixed(2)}`);
}

test('dorm exit: room → corridor → hall → straight out the front doors on the centre line', () => {
  driveTo(624.4, 376.2, 'east of the desk');
  driveTo(623.0, 377.4, 'through the room door');
  driveTo(643.0, 378.2, 'corridor, before the entrance door');
  driveTo(643.0, 375.0, 'through the entrance door into the hall');
  driveTo(643.2, 369.2, 'hall, before the front doors');
  // the regression leg: straight out along the doorway's centre line, no sidestep
  driveTo(643.2, 363.0, 'OUTSIDE, straight through the front doors');
  const fp = walker.framePos;
  assert.equal(dorm.inside(fp.a, fp.c), false, 'outside the dorm');
  assert.ok(mainDoorMaxOpen > 0.9, `the sliding doors opened on approach (max open ${mainDoorMaxOpen.toFixed(2)})`);
  for (const id of ['d-dorm-room', 'd-dorm-entrance']) assert.ok(prompted.has(id), `the E prompt for ${id} appeared`);
});

test('onward to the academy entrance, and the whole way back to the room', () => {
  driveTo(643.2, 340.0, 'across the car park');
  driveTo(650.0, 300.0, 'towards the academy');
  driveTo(655.0, 276.5, 'the academy entrance');
  prompted.clear();
  mainDoorMaxOpen = 0;
  driveTo(650.0, 300.0, 'back towards the dorm');
  driveTo(643.2, 340.0, 'back across the car park');
  driveTo(643.2, 363.0, 'back to the dorm doors');
  driveTo(643.2, 370.0, 'in through the front doors, centre line again');
  assert.equal(dorm.inside(walker.framePos.a, walker.framePos.c), true, 'inside the dorm again');
  assert.ok(mainDoorMaxOpen > 0.9, 'the sliding doors opened from outside too');
  driveTo(643.0, 375.0, 'hall, before the entrance door');
  driveTo(643.0, 378.2, 'through the entrance door back to the corridor');
  driveTo(623.0, 377.4, 'corridor, before the room door');
  driveTo(623.0, 376.2, 'through the room door, on its centre line');
  driveTo(624.4, 376.2, 'east along the wall, past the desk (the same line as on the way out)');
  driveTo(dspec.start.a, dspec.start.c, 'back at the room start');
  for (const id of ['d-dorm-room', 'd-dorm-entrance']) assert.ok(prompted.has(id), `the E prompt for ${id} appeared on the way back`);
});
