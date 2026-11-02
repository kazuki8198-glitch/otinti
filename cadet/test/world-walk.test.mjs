// CADET — world walk regression (node --test): the two routes the full-play audit (domain D) found
// unreachable on foot, walked end to end with the real builders, collision world, walker and doors,
// driven the way a player drives them:
//  - the control tower: hall → dog-leg stair (all five flights, lane changes at the landings' wall
//    corners, where a player enters the next flight at its foot) → cab → all the way back down.
//    Shipped defects: the east flights ran under their own arrival landings (head clearance 0.2–0.6 m),
//    the cab's south-west floor block hung over the last flight's treads (1.71 m), and 0.24 m risers
//    put two treads above the walker's step, so a landing could not be crossed into the next lane.
//  - the academy's second floor: lobby → stairs → through d-stairs2 → the 2F corridor and back.
//    Shipped defect: d-stairs2 stood at a 642.0–643.2, over the stair well — the only floor at its
//    level is the landing (a 637–640.2), so the 2F rooms could not be reached on foot at all.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- headless stubs (as in test/dorm-exit.test.mjs)
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
const { makeLayout, towerStairs, TOWER } = await import('../src/world/layout.js');
const { createCollisionWorld } = await import('../src/player/collide.js');
const { createWalker } = await import('../src/player/walker.js');
const { createInteractor } = await import('../src/player/interact.js');
const { createPropKit } = await import('../src/world/props.js');
const { buildTower } = await import('../src/world/tower.js');
const { towerSpec } = await import('../src/content/tower-spec.js');
const { buildAcademy } = await import('../src/world/academy.js');
const { academySpec } = await import('../src/content/academy-spec.js');

const L = makeLayout(FL.physics);
const world = createCollisionWorld();
const tspec = towerSpec();
const tower = buildTower({ L, FL, spec: tspec, kit: createPropKit(), world, audio: null });
const aspec = academySpec(FL);
const academy = buildAcademy({ L, FL, spec: aspec, kit: createPropKit(), world, audio: null });

const settings = { get: (k) => ({ headBob: false, fov: 75, sensitivity: 1, invertY: false })[k] };
const input = { takeLook: () => ({ x: 0, y: 0 }), down: () => false };
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const walker = createWalker({ camera, world, L, input, settings });
const hud = { prompt: () => {}, card: () => {} };
const interactor = createInteractor({ walker, world, L, hud });
for (const t of tower.doors.targets()) interactor.add({ ...t, use: () => tower.doors.toggle(t.door, walker.framePos) });
for (const t of academy.doors.targets()) interactor.add({ ...t, use: () => academy.doors.toggle(t.door, walker.framePos) });
for (const t of tower.targets || []) interactor.add(t);
for (const t of academy.targets || []) interactor.add(t);

const dt = 1 / 60;
function step() {
  walker.update(dt, { look: { x: 0, y: 0 } });
  tower.update(dt, walker.framePos);
  academy.update(dt, walker.framePos);
  interactor.update(camera);
}
function place(a, c, y = 0) {
  const [x, , z] = L.rwyToLocal(a, c);
  walker.setPose(x, z, 0, 0);
  walker.state.y = y;
  for (let k = 0; k < 5; k++) step();
}
// steer at a frame point; press E when the prompted door is a closed swing door, as a player would
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
    assert.ok(still <= 4, `stuck on leg "${label}" at a=${walker.framePos.a.toFixed(2)} c=${walker.framePos.c.toFixed(2)} y=${walker.framePos.y.toFixed(2)} (target ${a1}, ${c1})`);
  }
  assert.fail(`timed out on leg "${label}" at a=${walker.framePos.a.toFixed(2)} c=${walker.framePos.c.toFixed(2)}`);
}
const feet = () => walker.framePos.y;
// stand still a few frames so a descent's fall finishes before the height is asserted
function settle() { for (let k = 0; k < 15; k++) { walker.setAuto({ forward: 0 }); step(); } }

const S = towerStairs(TOWER);
const WL = (S.inC0 + (S.inC0 + S.laneW)) / 2;          // west lane centre
const EL = (S.inC0 + S.laneW + 0.2 + S.inC1) / 2;      // east lane centre

test('tower: the dog-leg stair walks from the hall to the cab and all the way back down', () => {
  // into the shaft, at flight 0's foot (the east end of the west lane)
  place(S.inA1 - 0.35, 261.0, 0);
  driveTo(S.inA1 - 0.3, WL, 'to flight 0 foot');
  // flight 0 (west lane, climbing west) → the west landing at 3.44
  driveTo(S.inA0 + 0.35, WL, 'flight 0 climb');
  assert.ok(Math.abs(feet() - S.rise) < 0.05, `on the first landing (y=${feet()})`);
  // lane change at the wall corner (the next flight's foot), then flight 1 (east lane) → 6.88
  driveTo(S.inA0 + 0.32, EL, 'lane change at the west landing');
  driveTo(S.inA1 - 0.35, EL, 'flight 1 climb');
  assert.ok(Math.abs(feet() - S.rise * 2) < 0.05, `on the second landing (y=${feet()})`);
  // flight 2 (west lane) → 10.32
  driveTo(S.inA1 - 0.32, WL, 'lane change at the east landing');
  driveTo(S.inA0 + 0.35, WL, 'flight 2 climb');
  assert.ok(Math.abs(feet() - S.rise * 3) < 0.05, `on the third landing (y=${feet()})`);
  // flight 3 (east lane) → 13.76
  driveTo(S.inA0 + 0.32, EL, 'lane change at the west landing (2)');
  driveTo(S.inA1 - 0.35, EL, 'flight 3 climb');
  assert.ok(Math.abs(feet() - S.rise * 4) < 0.05, `on the fourth landing (y=${feet()})`);
  // flight 4 (west lane) → the cab floor at 17.2
  driveTo(S.inA1 - 0.32, WL, 'lane change at the east landing (2)');
  driveTo(S.inA0 + 0.55, WL, 'flight 4 climb');
  assert.ok(Math.abs(feet() - TOWER.cabFloor) < 0.05, `standing on the cab floor (y=${feet()})`);
  // onto the cab's east-lane floor block beside the stair head: the tower-visit usable prompts from
  // here (it hangs over the stair opening at (721.6, 261.6), within the interactor's reach)
  driveTo(S.inA0 + 0.55, 262.4, 'onto the cab floor by the stair head');
  assert.ok(Math.abs(feet() - TOWER.cabFloor) < 0.05, 'standing on the cab floor');
  {
    const it = tspec.interactables.find(x => x.id === 'tower-visit');
    assert.ok(it, 'the tower-visit usable exists');
    walker.lookAt(...L.rwyToLocal(it.a, it.c, it.y));
    for (let k = 0; k < 10; k++) { walker.setAuto({ forward: 0 }); step(); }
    assert.equal(interactor.current && interactor.current.id, 'ex:tower-visit', 'the tower visit prompts from the cab floor');
  }
  // …and all the way back down: flight 4 descent first (its lower treads pass under the cab floor block)
  driveTo(719.65, WL, 'back to flight 4 head');
  driveTo(S.inA1 - 0.2, WL, 'flight 4 descent');
  settle();
  assert.ok(Math.abs(feet() - S.rise * 4) < 0.05, `back on the fourth landing (y=${feet()})`);
  driveTo(S.inA1 - 0.32, EL, 'lane change for flight 3 descent');
  driveTo(S.inA0 + 0.35, EL, 'flight 3 descent');
  driveTo(S.inA0 + 0.32, WL, 'lane change for flight 2 descent');
  driveTo(S.inA1 - 0.35, WL, 'flight 2 descent');
  driveTo(S.inA1 - 0.32, EL, 'lane change for flight 1 descent');
  driveTo(S.inA0 + 0.35, EL, 'flight 1 descent');
  driveTo(S.inA0 + 0.32, WL, 'lane change for flight 0 descent');
  driveTo(S.inA1 - 0.2, WL, 'flight 0 descent');
  settle();
  assert.ok(Math.abs(feet()) < 0.05, `back on the shaft floor (y=${feet()})`);
});

test('academy: the second floor is reached on foot through d-stairs2, and left the same way', () => {
  // the stairwell: enter at the ground floor, climb flight 1 (lane c 264–266.4) to the landing
  place(645.6, 265.2, 0);
  driveTo(639.2, 265.2, 'academy flight 1 climb');
  assert.ok(Math.abs(feet() - 4.22) < 0.1, `on the 2F landing (y=${feet()})`);
  // through d-stairs2 (its span sits on the landing) into the south corridor — no fall into the well
  driveTo(639.5, 264.2, 'to the d-stairs2 front (stairs side)');
  driveTo(639.5, 262.2, 'through d-stairs2 into corridor2-s');
  assert.ok(Math.abs(feet() - 4.22) < 0.1, `standing in corridor2-s at 2F level (y=${feet()})`);
  // along the corridor to the big classroom (south, through the c 261.0 wall) and back
  driveTo(620.1, 262.3, 'along corridor2-s to d-class2');
  driveTo(620.1, 259.6, 'into class2');
  driveTo(620.1, 262.3, 'back into corridor2-s');
  // and out again through d-stairs2 to the landing
  driveTo(639.5, 262.2, 'back along corridor2-s');
  driveTo(639.5, 264.4, 'through d-stairs2 back to the stairs side');
  assert.ok(Math.abs(feet() - 4.22) < 0.1, `back on the landing at 2F level (y=${feet()})`);
  // down flight 1 to the ground floor
  driveTo(645.6, 265.2, 'academy flight 1 descent');
  driveTo(644.0, 272.0, 'off the flight, onto the stairwell floor');
  assert.ok(Math.abs(feet()) < 0.1, `back on the ground floor (y=${feet()})`);
});
