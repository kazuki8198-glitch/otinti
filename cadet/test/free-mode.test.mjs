// CADET — free mode tests (node --test): the フリーモード as a first-class mode.
// 1) The option matrix the setup screen renders from (content/free-mode.js): every flyable type
//    incl. the Arrow, the three headline start states first, the existing presets for the rest.
// 2) The sandbox contract, flown for real: fly-mode's startFreeSession — the one path both the
//    outdoor flight and the device (simulator) session start through — is driven headlessly for
//    every aircraft × start state; each session flies briefly, leaves, and a real career's state
//    must be bit-identical before and after. The Arrow session must fly the Arrow's physics
//    (pa28r) on the Archer's visual, as on its career days.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- headless stubs (the doors/dorm-exit pattern, widened for fly-mode's fade sheet and panels)
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
const elStub = () => ({ style: {}, children: [], appendChild() {}, append() {}, remove() {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, addEventListener() {} });
globalThis.document = {
  createElement: (tag) => tag === 'canvas' ? { width: 1, height: 1, style: {}, getContext: () => ctx2d } : elStub(),
  body: elStub(), head: elStub(), getElementById: () => null,
};
globalThis.Image = class { constructor() { this.width = 4; this.height = 4; } decode() { return Promise.resolve(); } set src(v) {} };
{
  const map = {};
  for (const f of fs.readdirSync(path.join(here, '..', 'assets', 'tex')).sort()) {
    if (!/\.(webp|jpg|png)$/.test(f)) continue;
    map['tex/' + path.basename(f, path.extname(f))] = 'data:,';
  }
  globalThis.CADET_ASSETS = map;
}

for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'acmesh.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '..', '..', 'flight-lab', 'src', m), 'utf8'), { filename: m });
const { installSorajima } = await import('../src/flight/sorajima.js');
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics;
const { loadTextures } = await import('../src/render/textures.js');
await loadTextures();
const { makeLayout } = await import('../src/world/layout.js');
const { createCollisionWorld } = await import('../src/player/collide.js');
const { createFlyMode } = await import('../src/flight/fly-mode.js');
const { createCareer } = await import('../src/career/career.js');
const { createSettings } = await import('../src/ui/settings.js');
const { academySpec } = await import('../src/content/academy-spec.js');
const { FREE_AIRCRAFT, FREE_STARTS, buildFreeCfg, simDeviceCfg } = await import('../src/content/free-mode.js');

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };

// ---- the fly-mode rig, wired the way main.js wires it (stand, stubs for the world around it)
const L = makeLayout(P);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
const spec = academySpec(FL);
const parkedRoot = new THREE.Group(); scene.add(parkedRoot);
const events = { enter: 0, leave: [] };
const settings = createSettings(undefined, memStore());
const cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw);
const fly = createFlyMode({
  FL, L, scene, camera, toFrame: (x, z) => [x * cy - z * sy, x * sy + z * cy],
  renderer: { capabilities: { getMaxAnisotropy: () => 1 } },
  sky: { setShadowHalf() {}, state: { el: 40, az: 180 } },
  input: { requestLock() {}, exitLock() {}, takeLook: () => ({ x: 0, y: 0 }), takeWheel: () => 0, down: () => false, pressed: () => false },
  settings, audio: {}, toast: () => {}, hud: { prompt() {} }, dui: null, talkState: {}, saveTalk: () => {},
  instructor: null, instructorName: '早瀬 教官',
  stand: { a: spec.target.a, c: spec.target.c, hdgTrue: (P.LAB_RWY.trueHdg + 270) % 360 },
  parkedToday: () => parkedRoot, todayColliders: () => {}, world: createCollisionWorld(),
  flightHud: null, dayHud: null, today: () => null, aircraft: () => 'pa28', wind: { fromDeg: 260, kt: 5 },
  instructorHome: () => {}, onEnter: () => { events.enter++; }, onLeave: (then) => { events.leave.push(then); },
  onTalk: () => {}, onDayOver: () => {}, onSolo: () => {}, onIntroDone: () => {},
});

// a real career beside the rig: the sandbox contract is that none of this moves it
const career = createCareer({ store: memStore(), seed: 7 });
const careerJSON = () => JSON.stringify(career.state);
const before = careerJSON();

const SEL = { hour: 10, wind: 'light', windRel: 40, windKt: 12, loading: 'std', fail: 'none', failWhen: 'now', failMin: 10, failAlt: 2000 };
function flyBriefly(cfg, label) {
  assert.equal(fly.startFreeSession({ ...cfg, instant: true }), true, `${label}: the session starts`);
  const st0 = fly.status();
  assert.equal(st0.active, true, `${label}: active`);
  assert.equal(st0.flight.mode, 'free', `${label}: a free session, not a lesson`);
  for (let i = 0; i < 90; i++) fly.update(1 / 30);
  const st = fly.status();
  assert.equal(st.flight.crashed, false, `${label}: not crashed after 3 s hands-off`);
  fly.leave({ instant: true });
  assert.equal(fly.status().active, false, `${label}: left`);
  assert.equal(careerJSON(), before, `${label}: career state bit-identical`);
  return st0;
}

test('the option matrix: every flyable type, the three headline starts first', () => {
  assert.deepEqual(FREE_AIRCRAFT.map(([id]) => id), ['pa28', 'pa44', 'pa28r', 'b737']);
  for (const [id] of FREE_AIRCRAFT) assert.ok(P.AIRCRAFT.some(a => a.id === id), `${id} is a real physics type`);
  assert.deepEqual(FREE_STARTS.slice(0, 3).map(([id]) => id), ['ramp', 'rwy', 'area'],
    '駐機コールド＆ダーク / 滑走路・離陸準備完了 / 空中・巡航 lead the list');
  for (const [id] of FREE_STARTS) assert.ok(['ramp', 'rwy', 'pattern', 'final', 'area', 'ils'].includes(id), `${id} is a start FL knows`);
});

test('the cfg builders: the outdoor flight keeps the screen\'s choices; the device keeps its own', () => {
  const cfg = buildFreeCfg({ ...SEL, start: 'area', aircraft: 'pa44', wind: 'cross', loading: 'heavy', fail: 'elec', failWhen: 'alt', failAlt: 3000 });
  assert.equal(cfg.start, 'area'); assert.equal(cfg.aircraft, 'pa44'); assert.equal(cfg.hour, 10);
  assert.deepEqual(cfg.wind, { rel: 80, kt: 10, gust: 0.5 });
  assert.deepEqual(cfg.loading, { fuel: 'std', front: 2, rear: 2, bagKg: 25 });
  assert.equal(cfg.fail, 'elec'); assert.deepEqual(cfg.failAt, { atAltFt: 3000 });
  const dev = simDeviceCfg({ start: 'pattern', aircraft: 'pa28r' });
  assert.equal(dev.start, 'pattern'); assert.equal(dev.aircraft, 'pa28r');
  assert.deepEqual(dev.wind, { rel: 10, kt: 5, gust: 0.5 }, 'the device\'s light wind');
  assert.deepEqual(dev.loading, { fuel: 'std', front: 2, rear: 0, bagKg: 0 }, 'the device\'s standard load');
  assert.equal(dev.fail, null, 'no failure in the device');
});

for (const [acId] of FREE_AIRCRAFT) {
  test(`free flight: ${acId} × 駐機 (cold & dark)`, () => {
    const st = flyBriefly(buildFreeCfg({ ...SEL, start: 'ramp', aircraft: acId }), `${acId}/ramp`);
    assert.equal(st.flight.aircraft, acId, 'the physics type flown is the one chosen');
    assert.equal(st.engine.running, false, 'cold & dark: the engine is the player\'s to start');
  });
  test(`free flight: ${acId} × 滑走路 (ready)`, () => {
    const st = flyBriefly(buildFreeCfg({ ...SEL, start: 'rwy', aircraft: acId }), `${acId}/rwy`);
    assert.equal(st.flight.aircraft, acId);
    assert.equal(st.engine.running, true, 'on the runway, engine running');
  });
  test(`free flight: ${acId} × 空中 (cruise)`, () => {
    const st = flyBriefly(buildFreeCfg({ ...SEL, start: 'area', aircraft: acId }), `${acId}/area`);
    assert.equal(st.flight.aircraft, acId);
    assert.equal(st.engine.running, true);
    assert.ok(fly.altitude() >= 0, 'altitude reads');
  });
}

test('the simulator entry: the device session, flown the device\'s way', () => {
  const cfg = simDeviceCfg({ start: 'pattern', aircraft: 'pa28' });
  assert.equal(fly.startFreeSession({ ...cfg, instant: true }), true, 'the device session starts');
  const st = fly.status();
  assert.equal(st.flight.mode, 'free');
  assert.ok(fly.altitude() > 150, `pattern start is airborne (AGL ${fly.altitude().toFixed(0)} m)`);
  for (let i = 0; i < 60; i++) fly.update(1 / 30);
  fly.leave({ instant: true });
  assert.equal(fly.status().active, false);
  assert.equal(careerJSON(), before, 'career state bit-identical after the device session');
});

test('the wiring: the mode screen and the device seat share the one session path', () => {
  const menuSrc = fs.readFileSync(path.join(here, '..', 'src', 'ui', 'menu.js'), 'utf8');
  const mainSrc = fs.readFileSync(path.join(here, '..', 'src', 'main.js'), 'utf8');
  assert.ok(menuSrc.includes("['free', 'フリーモード']"), 'the mode tab is the free mode');
  assert.ok(menuSrc.includes('フリーモード（自由飛行・シミュレーター）'), 'the main tab carries the mode entry');
  assert.ok(menuSrc.includes("data-act=\"sim-start\"") && menuSrc.includes('onSimSetup'), 'the simulator button is wired');
  assert.ok(mainSrc.includes('onSimSetup'), 'main.js answers the simulator button');
  assert.ok(mainSrc.includes('startDeviceFree') && mainSrc.includes('fly.startFreeSession(simDeviceCfg(sel))'),
    'the menu entry and the seat start the same device session');
  const simFlight = mainSrc.slice(mainSrc.indexOf('function simFlight'), mainSrc.indexOf('function pcUse'));
  assert.ok(simFlight.includes('startDeviceFree(cfg0)'), 'the in-world seat keeps working through the same starter');
});
