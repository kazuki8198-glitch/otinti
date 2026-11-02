// CADET — fly-mode's per-frame update, wired the way the REAL game wires it (node --test).
// Regression for the frozen-view bug (2026-11-02): in a real browser, starting ANY flight froze
// the 3D view on the last walk frame with only the flight HUD alive. fly-mode's update() threw
// 'object is not iterable' on the first flight frame — it array-destructured P.ne(), which
// returns the OBJECT { n, e } — at two sites:
//   (1) the traffic-audio block:  const [pn, pe] = P.ne(flight.s)   (sorajima.js ne: {n, e})
//   (2) the cumulonimbus block:   const [n, e] = P.ne(s)
// The headless suites never saw it: their fly-mode rigs pass audio: {} (no traffic method, so
// block (1) is skipped) and no ctx.cb (so block (2) is skipped). This rig therefore passes the
// REAL audio shape — every method createAudio returns (audio/sfx.js), as recording stubs — and
// a real CB context, then steps real update frames and asserts the session lives, the traffic
// audio is actually fed (proof block (1) ran), the CB context is consulted (proof block (2)
// ran), and the camera is the cockpit's eye, not the walk camera's.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';

const here = path.dirname(fileURLToPath(import.meta.url));

// ---- headless stubs (the free-mode.test pattern)
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
const { createSettings } = await import('../src/ui/settings.js');
const { academySpec } = await import('../src/content/academy-spec.js');
const { buildFreeCfg } = await import('../src/content/free-mode.js');
const { cbFor } = await import('../src/flight/cb.js');

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), m }; };
const settings = createSettings(undefined, memStore());

// the REAL audio shape: exactly the methods createAudio() returns (audio/sfx.js), present and
// recording. This is the piece the older rigs lacked (audio: {}), which is why block (1) —
// guarded by `if (audio.traffic)` — never ran headlessly.
const AUDIO_METHODS = ['engine', 'traffic', 'starter', 'crank', 'fire', 'squelch', 'radio', 'touchdown', 'chime', 'click', 'knob', 'apDisc', 'ident', 'thunder'];
function makeAudio() {
  const calls = {};
  const audio = { setVolume() {}, setVolumes() {}, footstep() {}, ui() {} };
  for (const m of AUDIO_METHODS) { calls[m] = []; audio[m] = (...a) => { calls[m].push(a); }; }
  return { audio, calls };
}

// a fly-mode rig wired the way main.js wires it (stand + the world around it stubbed, as in
// free-mode.test.mjs) — but with the real-shaped audio and, when asked, the day's CB context
// (main.js passes cb: () => cbNow; on a storm day cbNow is a real cell from cbFor).
function makeRig({ cb } = {}) {
  const L = makeLayout(P);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
  const spec = academySpec(FL);
  const parkedRoot = new THREE.Group(); scene.add(parkedRoot);
  const { audio, calls } = makeAudio();
  const cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw);
  const fly = createFlyMode({
    FL, L, scene, camera, toFrame: (x, z) => [x * cy - z * sy, x * sy + z * cy],
    renderer: { capabilities: { getMaxAnisotropy: () => 1 } },
    sky: { setShadowHalf() {}, state: { el: 40, az: 180 } },
    input: { requestLock() {}, exitLock() {}, takeLook: () => ({ x: 0, y: 0 }), takeWheel: () => 0, down: () => false, pressed: () => false },
    settings, audio, toast: () => {}, hud: { prompt() {} }, dui: null, talkState: {}, saveTalk: () => {},
    instructor: null, instructorName: '早瀬 教官',
    stand: { a: spec.target.a, c: spec.target.c, hdgTrue: (P.LAB_RWY.trueHdg + 270) % 360 },
    parkedToday: () => parkedRoot, todayColliders: () => {}, world: createCollisionWorld(),
    flightHud: null, dayHud: null, today: () => null, aircraft: () => 'pa28', wind: { fromDeg: 260, kt: 5 },
    instructorHome: () => {}, onEnter: () => {}, onLeave: () => {},
    onTalk: () => {}, onDayOver: () => {}, onSolo: () => {}, onIntroDone: () => {},
    ...(cb ? { cb } : {}),
  });
  return { fly, camera, calls };
}

// step real update frames; a throw is the bug — surface it as the assertion failure it is
function stepFrames(fly, n, label) {
  let err = null;
  try { for (let i = 0; i < n; i++) fly.update(1 / 30); } catch (e) { err = e; }
  assert.equal(err, null, `${label}: update() must not throw (got: ${err && err.message})`);
}

const SEL = { hour: 10, wind: 'light', windRel: 40, windKt: 12, loading: 'std', fail: 'none', failWhen: 'now', failMin: 10, failAlt: 2000 };

test('a free flight with the real audio shape: frames run, traffic audio is fed, the cockpit camera is live', () => {
  const { fly, camera, calls } = makeRig();
  assert.equal(fly.startFreeSession({ ...buildFreeCfg({ ...SEL, start: 'rwy', aircraft: 'pa28' }), instant: true }), true, 'the session starts');
  stepFrames(fly, 90, 'traffic-audio block');
  const st = fly.status();
  assert.equal(st.active, true, 'the session is still active after 3 s of frames');
  assert.equal(st.flight.crashed, false, 'not crashed');
  assert.equal(st.view, 'cockpit', 'the view is the cockpit, not the walk view');
  const eye = camera.position.toArray();
  assert.ok(eye.every(Number.isFinite) && eye.some(v => Math.abs(v) > 0.01),
    `the camera sits at the cockpit eye, not the walk camera's origin (eye ${eye.map(v => v.toFixed(2)).join(', ')})`);
  assert.ok(Number.isFinite(fly.altitude()), 'the simulation is stepping (altitude reads)');
  // proof the traffic-audio block actually executed — with the old rigs' audio: {} it never did,
  // and on the unfixed code the first frame already threw inside it
  assert.ok(calls.traffic.length >= 30, `audio.traffic fed every frame (${calls.traffic.length} calls)`);
  assert.ok(calls.engine.length >= 30, `audio.engine fed every frame (${calls.engine.length} calls)`);
  fly.leave({ instant: true });
  assert.equal(fly.status().active, false, 'left cleanly');
});

test('a CB day: the cumulonimbus block runs every frame without throwing', () => {
  let cbCalls = 0;
  const cell = cbFor(3, 40);                       // a real storm-day cell, 10–20 km west
  const { fly, calls } = makeRig({ cb: () => { cbCalls++; return cell; } });
  assert.equal(fly.startFreeSession({ ...buildFreeCfg({ ...SEL, start: 'area', aircraft: 'pa28' }), instant: true }), true, 'the session starts');
  stepFrames(fly, 60, 'cumulonimbus block');
  const st = fly.status();
  assert.equal(st.active, true, 'the session is still active');
  assert.equal(st.flight.crashed, false, 'not crashed (the cell is far west; the frame code still runs)');
  assert.ok(cbCalls >= 30, `the CB context was consulted per frame (${cbCalls} calls) — the block ran`);
  assert.ok(calls.traffic.length >= 30, 'the traffic-audio block ran on the CB day too');
  fly.leave({ instant: true });
  assert.equal(fly.status().active, false, 'left cleanly');
});
