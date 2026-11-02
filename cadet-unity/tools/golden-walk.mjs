// CADET Unity port — Stage 9 golden: interiors, doors, walking.
// Builds the game's own world (buildings + academy + dorm + tower, one
// collision world, as main.js does) with the real builders, then:
//  - dumps every collider box (id order) and every built door's final spec
//  - drives the dorm-exit regression route (from test/dorm-exit.test.mjs)
//  - drives the academy day-1 route (academy-spec start → route → target)
//  - drives into both hangars
//  - computes door-graph reachability per building from the specs
//  - computes a move()-based grid BFS reachability per building
//  - plans NPC routes over the door graphs (walker-npc planRoute)
// Output: flight/test/golden-walk.json (the C# harness replays all of it).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const T = '/home/hatch/workspace/cadet-wt-free';
const OUT = '/home/hatch/workspace/cadet-unity/flight/test/golden-walk.json';

// ---- headless stubs (as in test/dorm-exit.test.mjs)
const grad = { addColorStop: () => {} };
const ctx2d = new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 10 });
    if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => grad;
    if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4), width: 1, height: 1 });
    if (k === 'createImageData') return (w, h) => ({ data: new Uint8ClampedArray(w * h * 4), width: w, height: h });
    if (k in t) return t[k];
    return () => {};
  },
  set: (t, k, v) => { t[k] = v; return true; },
});
globalThis.document = { createElement: (tag) => tag === 'canvas' ? { width: 1, height: 1, getContext: () => ctx2d } : {} };
globalThis.Image = class { constructor() { this.width = 4; this.height = 4; } decode() { return Promise.resolve(); } set src(v) {} };
{
  const map = {};
  for (const f of fs.readdirSync(path.join(T, 'cadet', 'assets', 'tex')).sort()) {
    if (!/\.(webp|jpg|png)$/.test(f)) continue;
    map['tex/' + path.basename(f, path.extname(f))] = 'data:,';
  }
  globalThis.CADET_ASSETS = map;
}
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js'])
  vm.runInThisContext(fs.readFileSync(path.join(T, 'flight-lab', 'src', m), 'utf8'), { filename: m });
const { installSorajima } = await import(T + '/cadet/src/flight/sorajima.js');
installSorajima(globalThis.FL);
const FL = globalThis.FL;
const { loadTextures } = await import(T + '/cadet/src/render/textures.js');
await loadTextures();
const { makeLayout } = await import(T + '/cadet/src/world/layout.js');
const { createCollisionWorld } = await import(T + '/cadet/src/player/collide.js');
const { createWalker, BODY } = await import(T + '/cadet/src/player/walker.js');
const { createInteractor } = await import(T + '/cadet/src/player/interact.js');
const { createPropKit } = await import(T + '/cadet/src/world/props.js');
const { buildBuildings } = await import(T + '/cadet/src/world/buildings.js');
const { buildAcademy } = await import(T + '/cadet/src/world/academy.js');
const { buildDorm } = await import(T + '/cadet/src/world/dorm.js');
const { buildTower } = await import(T + '/cadet/src/world/tower.js');
const { dormSpec } = await import(T + '/cadet/src/content/dorm-spec.js');
const { academySpec } = await import(T + '/cadet/src/content/academy-spec.js');
const { towerSpec } = await import(T + '/cadet/src/content/tower-spec.js');
const { planRoute, roomOf } = await import(T + '/cadet/src/npc/walker-npc.js');
const THREE = await import(T + '/cadet/node_modules/three/build/three.module.js');

const L = makeLayout(FL.physics);
const world = createCollisionWorld();
const buildings = buildBuildings(L, { world, kit: createPropKit() });
const aspec = academySpec(FL);
const academy = buildAcademy({ L, FL, spec: aspec, kit: createPropKit(), world, audio: null });
const dspec = dormSpec();
const dorm = buildDorm({ L, FL, spec: dspec, kit: createPropKit(), world, audio: null });
const tspec = towerSpec();
const tower = buildTower({ L, spec: tspec, kit: createPropKit(), world, audio: null });

const out = { layout: { G: L.G, frameYaw: L.frameYaw }, boxes: [], doors: [], traces: {}, graph: {}, bfs: {}, npcRoutes: [] };

// ---- boxes + doors dump
for (const v of world.query(-1e5, -1e5, 1e5, 1e5))
  out.boxes.push({ id: v.id, x0: v.x0, x1: v.x1, y0: v.y0, y1: Number.isFinite(v.y1) ? v.y1 : null, z0: v.z0, z1: v.z1, tag: v.tag || null });
for (const sys of [academy.doors, dorm.doors, tower.doors])
  for (const d of sys.doors)
    out.doors.push({ id: d.id, kind: d.kind, wall: d.wall, at: d.at, from: d.from, to: d.to, y: d.y || 0, slideOffset: d.slideOffset || 0, wallT: d.wallT, rooms: d.rooms || [] });

// ---- walker + interactor, driven like the game's own tests
const settings = { get: (k) => ({ headBob: false, fov: 75, sensitivity: 1, invertY: false })[k] };
const input = { takeLook: () => ({ x: 0, y: 0 }), down: () => false };
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const walker = createWalker({ camera, world, L, input, settings });
const hud = { prompt: () => {}, card: () => {} };
const interactor = createInteractor({ walker, world, L, hud });
const doorSystems = [dorm, academy, tower];
for (const b of doorSystems) for (const t of b.doors.targets()) interactor.add({ ...t, use: () => b.doors.toggle(t.door, walker.framePos) });

const dt = 1 / 60;
const prompted = new Set();
let mainDoorMaxOpen = 0;
let trace = null;
function step() {
  walker.update(dt, { look: { x: 0, y: 0 } });
  for (const b of doorSystems) b.doors.update(dt, walker.framePos);
  interactor.update(camera);
  const cur = interactor.current;
  if (cur && cur.door) prompted.add(cur.door.id);
  const main = dorm.doors.doors.find(d => d.id === 'x-dorm-main');
  if (main && main.open > mainDoorMaxOpen) mainDoorMaxOpen = main.open;
  if (trace) { const fp = walker.framePos; trace.push([fp.a, fp.c, fp.y]); }
}
function driveTo(a1, c1, label, maxT = 90) {
  let t = 0, lastD = Infinity, still = 0;
  while (t < maxT) {
    const fp = walker.framePos, d = Math.hypot(a1 - fp.a, c1 - fp.c);
    if (d < 0.3) return true;
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
    if (still > 4) { console.error(`STUCK leg "${label}" at a=${fp.a.toFixed(2)} c=${fp.c.toFixed(2)} target ${a1},${c1}`); return false; }
  }
  console.error(`TIMEOUT leg "${label}"`);
  return false;
}
function poseAt(a, c, faceA, faceC) {
  const [x, , z] = L.rwyToLocal(a, c);
  walker.setPose(x, z, 0, 0);
  walker.lookAt(...L.rwyToLocal(faceA, faceC, 1.5));
}

// ---- T1: the dorm-exit regression route (verbatim legs from the test)
{
  poseAt(dspec.start.a, dspec.start.c, dspec.start.face.a, dspec.start.face.c);
  trace = []; prompted.clear(); mainDoorMaxOpen = 0;
  const legs = [
    [624.4, 376.2], [623.0, 377.4], [643.0, 378.2], [643.0, 375.0], [643.2, 369.2], [643.2, 363.0],
    [643.2, 340.0], [650.0, 300.0], [655.0, 276.5],
    [650.0, 300.0], [643.2, 340.0], [643.2, 363.0], [643.2, 370.0], [643.0, 375.0], [643.0, 378.2],
    [623.0, 377.4], [623.0, 376.2], [624.4, 376.2], [dspec.start.a, dspec.start.c],
  ];
  let ok = true;
  for (const [a, c] of legs) if (!driveTo(a, c, `dorm-exit ${a},${c}`)) { ok = false; break; }
  out.traces.dormExit = { steps: trace, ok, prompted: [...prompted], mainDoorMaxOpen };
  trace = null;
  console.log('dormExit ok=', ok, 'steps=', out.traces.dormExit.steps.length);
}

// ---- T2: the academy day-1 route (start in brief-1 → route → the aircraft)
{
  poseAt(aspec.start.a, aspec.start.c, aspec.start.yawToward.a, aspec.start.yawToward.c);
  trace = []; prompted.clear();
  let ok = true;
  for (const p of aspec.route) if (!driveTo(p.a, p.c, `academy-route ${p.note}`)) { ok = false; break; }
  if (ok && !driveTo(aspec.target.a, aspec.target.c, 'academy target')) ok = false;
  out.traces.academyRoute = { steps: trace, ok };
  trace = null;
  console.log('academyRoute ok=', ok, 'steps=', out.traces.academyRoute.steps.length);
}

// ---- T3: hangars (open doors; from the apron into each, and back out)
{
  poseAt(495, 232, 495, 260);
  trace = [];
  let ok = driveTo(495, 261.5, 'hangar-1 centre') && driveTo(495, 232, 'hangar-1 out');
  ok = driveTo(563, 232, 'to hangar-2') && driveTo(563, 261.5, 'hangar-2 centre') && ok;
  out.traces.hangars = { steps: trace, ok };
  trace = null;
  console.log('hangars ok=', ok, 'steps=', out.traces.hangars.steps.length);
}

// ---- door-graph reachability (locked doors impassable; 'opening' passable)
function graphReach(spec, startRoom) {
  const adj = new Map();
  const link = (x, y) => { if (!adj.has(x)) adj.set(x, new Set()); adj.get(x).add(y); };
  for (const d of spec.doors) {
    if (d.kind === 'locked') continue;
    const [r1, r2] = d.rooms;
    if (r1 && r2) { link(r1, r2); link(r2, r1); }
  }
  const seen = new Set([startRoom]);
  const q = [startRoom];
  while (q.length) { const r = q.shift(); for (const n of adj.get(r) || []) if (!seen.has(n)) { seen.add(n); q.push(n); } }
  return spec.rooms.map(r => r.id).filter(id => seen.has(id)).sort();
}
out.graph.dorm = graphReach(dspec, 'dorm-room');
out.graph.academy = graphReach(aspec, 'brief-1');
out.graph.tower = graphReach(tspec, 'tower-hall');

// ---- move()-based grid BFS reachability
// (doors that can open are held open first — swing leaves swung, sliding
// leaves slid; locked doors stay shut, as they should)
for (const b of doorSystems) {
  b.doors.openAll();
  for (const d of b.doors.doors) if (d.kind === 'sliding_auto') { d.open = 1; d.openTarget = 1; }
  b.doors.update(0, null);
}
function bfs(name, bbox, startA, startC, rooms) {
  const CELL = 0.4;
  const [a0, a1, c0, c1] = bbox;
  const key = (i, k, y) => i + ',' + k + ',' + Math.round(y * 4);
  const startX = startC, startZ = -startA;
  const startY = world.groundAt(startX, startZ, 0, BODY);
  const seen = new Set([key(Math.round(startX / CELL), Math.round(startZ / CELL), startY)]);
  const q = [{ x: startX, z: startZ, y: startY }];
  const visited = [];
  while (q.length) {
    const p = q.shift();
    visited.push(p);
    for (const [dx, dz] of [[CELL, 0], [-CELL, 0], [0, CELL], [0, -CELL]]) {
      const r = world.move({ x: p.x, y: p.y, z: p.z }, dx, dz, BODY);
      const moved = Math.hypot(r.x - p.x, r.z - p.z);
      if (moved < CELL * 0.75) continue;
      if (-r.z < a0 || -r.z > a1 || r.x < c0 || r.x > c1) continue;   // stay in the building's region
      const ny = world.groundAt(r.x, r.z, p.y, BODY);
      if (ny - p.y > BODY.step + 1e-9) continue;
      const kk = key(Math.round(r.x / CELL), Math.round(r.z / CELL), ny);
      if (seen.has(kk)) continue;
      seen.add(kk);
      q.push({ x: r.x, z: r.z, y: ny });
    }
  }
  const verdicts = {};
  for (const r of rooms) {
    const fy = r.floorY || 0;
    const rects = r.floorRects || [[r.a0, r.a1, r.c0, r.c1]];
    verdicts[r.id] = visited.some(p => rects.some(([ra0, ra1, rc0, rc1]) => -p.z >= ra0 && -p.z <= ra1 && p.x >= rc0 && p.x <= rc1) && Math.abs(p.y - fy) <= 1.6);
  }
  out.bfs[name] = { visited: visited.length, verdicts };
  console.log('bfs', name, 'visited=', visited.length, 'reachable rooms=', Object.values(verdicts).filter(Boolean).length, '/', rooms.length);
}
bfs('dorm', [614, 670, 362, 394], dspec.start.a, dspec.start.c, dspec.rooms);
bfs('academy', [604, 706, 244, 282], aspec.start.a, aspec.start.c, aspec.rooms);
bfs('tower', [706, 738, 246, 278], tspec.hall.a, tspec.hall.c, tspec.rooms);

// ---- NPC routes over the door graphs (walker-npc planRoute)
const specs = [aspec, dspec, tspec];
for (const [from, to] of [
  [{ a: 624, c: 372 }, { a: 655, c: 253 }],     // dorm room → academy lobby
  [{ a: 655, c: 253 }, { a: 721, c: 258 }],     // academy lobby → tower hall
  [{ a: 721, c: 258 }, { a: 624, c: 384 }],     // tower hall → dorm common room
  [{ a: 642.2, c: 254.6 }, { a: 620, c: 250.5 }], // brief-1 → academy roof
]) {
  const r = planRoute(specs, from, to, { hub: { a: 648, c: 322 } });
  out.npcRoutes.push({ from, to, points: r ? r.map(p => ({ a: p.a, c: p.c, door: p.door || null })) : null });   // (planRoute's points carry the door ID string already)
  console.log('npc route', JSON.stringify(from), '→', JSON.stringify(to), r ? r.length + ' pts' : 'NULL');
}

fs.writeFileSync(OUT, JSON.stringify(out));
console.log('golden-walk written:', (fs.statSync(OUT).size / 1e6).toFixed(2), 'MB; boxes=', out.boxes.length, 'doors=', out.doors.length);
