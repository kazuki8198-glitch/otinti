// CADET — multi-device gamepad tests (game-quality wave, item 3): the axis map's device assignment.
// A yoke, a throttle quadrant and a set of pedals are three separate USB devices; the browser's
// enumeration order is not stable across reconnects, so an assignment may name its device (padMap
// entry id, matched against the gamepad's own id string) and then follows the device, not the slot.
// Mocked gamepad arrays only — no browser. The no-map single-pad path must read exactly as before.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createControls, padMapOf, PADMAP0 } from '../src/flight/controls.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'school.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics;

const pad = (id, axes, btnVals = {}) => ({
  id, connected: true, mapping: 'standard', axes,
  buttons: Array.from({ length: 18 }, (_, i) => ({ value: btnVals[i] || 0, pressed: (btnVals[i] || 0) > 0.5 })),
});
const state = (ac = 'pa28') => { const s = P.newState({ aircraft: ac }); s.opts = s.opts || {}; return { s, check: null, atc: null, free: true }; };
const dz = (v, z = 0.12) => Math.abs(v) < z ? 0 : (v - Math.sign(v) * z) / (1 - z);
const approx = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, `${msg}: ${a} != ${b}`);

// three devices, each with its own axis numbering — the setup the assignment exists for
const yoke = () => pad('Virtual Yoke Pro (Vendor: 068e)', [0.5, -0.5, 0, 0]);
const pedals = () => pad('Sim Pedals USB', [0, 0, -0.25, 0.2, 0.6]);
const quadrant = () => pad('Twin Quadrant TQ6', [0, 0.0, -0.4, 0]);
const MAP3 = {
  pitch: { axis: 1, inv: false, pad: -1, id: 'Yoke' }, roll: { axis: 0, inv: false, pad: -1, id: 'Yoke' },
  yaw: { axis: 2, inv: false, pad: -1, id: 'Pedals' }, trim: null,
  thr: null, thrL: { axis: 1, inv: false, pad: -1, id: 'Quadrant' }, thrR: { axis: 2, inv: false, pad: -1, id: 'Quadrant' },
  brakeL: { axis: 3, inv: false, pad: -1, id: 'Pedals' }, brakeR: { axis: 4, inv: false, pad: -1, id: 'Pedals' },
};

test('pads: three devices by name — yoke flies, pedals yaw and brake, the quadrant throttles', () => {
  const C = createControls(FL, { prefs: { padMap: MAP3 }, getGamepads: () => [yoke(), pedals(), quadrant()] });
  const L = state('pa44');
  const out = C.padInput(L, 1 / 60);
  assert.equal(out.stick, true);
  approx(out.tr, dz(0.5), 'roll from the yoke axis 0');
  approx(out.tp, dz(-0.5), 'pitch from the yoke axis 1');
  approx(out.ty, dz(-0.25), 'yaw from the pedals axis 2');
  approx(out.brakeL, 0.6, 'left toe brake (0.2+1)/2');
  approx(out.brakeR, 0.8, 'right toe brake (0.6+1)/2');
  approx(L.s.eng[0].thr, 0.5, 'left lever (0.0+1)/2');
  approx(L.s.eng[1].thr, 0.3, 'right lever (-0.4+1)/2');
});

test('pads: the assignment follows the device when the enumeration order changes', () => {
  const run = (list) => {
    const C = createControls(FL, { prefs: { padMap: MAP3 }, getGamepads: () => list });
    const L = state('pa44');
    const out = C.padInput(L, 1 / 60);
    return [out.tr, out.tp, out.ty, out.brakeL, out.brakeR, L.s.eng[0].thr, L.s.eng[1].thr];
  };
  assert.deepEqual(run([quadrant(), yoke(), pedals()]), run([pedals(), quadrant(), yoke()]));
});

test('pads: a named device unplugged reads as no axis — and does not fall through to another device', () => {
  const C = createControls(FL, { prefs: { padMap: MAP3 }, getGamepads: () => [yoke(), pedals()] });
  const L = state('pa44');
  const out = C.padInput(L, 1 / 60);
  assert.equal(L.s.eng[0].thr, null, 'the left lever is not written without its quadrant');
  assert.equal(L.s.eng[1].thr, null, 'nor the right');
  approx(out.tr, dz(0.5), 'the yoke still flies');
  approx(out.brakeR, 0.8, 'the pedals still brake');
});

test('pads: assignment by pad number still works (maps saved before device names)', () => {
  const map = { ...MAP3, thrL: { axis: 1, inv: false, pad: 2 }, thrR: { axis: 2, inv: false, pad: 2 } };
  const C = createControls(FL, { prefs: { padMap: map }, getGamepads: () => [yoke(), pedals(), quadrant()] });
  const L = state('pa44');
  C.padInput(L, 1 / 60);
  approx(L.s.eng[0].thr, 0.5, 'pad 3 (index 2) axis 1 drives the left lever');
  approx(L.s.eng[1].thr, 0.3, 'pad 3 axis 2 the right');
});

test('pads: no map, one standard pad — FLIGHT LAB\u2019s reading, unchanged', () => {
  const gp = pad('Standard Gamepad', [0.25, 0.75, 0, 0], { 7: 1 });
  const C = createControls(FL, { prefs: {}, getGamepads: () => [gp] });
  const L = state('pa28'); L.s.thr = 0.2;
  const out = C.padInput(L, 0.1);
  assert.equal(out.stick, true);
  approx(out.tr, dz(0.25), 'left stick x is the roll');
  approx(out.tp, dz(0.75), 'left stick y is the pitch');
  approx(L.s.thr, 0.2 + 0.5 * 0.1, 'the right trigger walks the throttle up');
  const C2 = createControls(FL, { prefs: {}, getGamepads: () => [pad('Standard Gamepad', [0, 0, 0, 0], { 0: 1 })] });
  const out2 = C2.padInput(state('pa28'), 0.1);
  assert.equal(out2.brake, true, 'button 0 brakes');
  assert.equal(out2.brakeL, null, 'no toe brakes without a map');
});

test('pads: padMapOf keeps a device name, drops what cannot be one', () => {
  const m = padMapOf({ padMap: { pitch: { axis: 1, inv: true, pad: -1, id: 'Yoke' }, yaw: { axis: 2, inv: false, pad: -1, id: 42 }, thr: { axis: 99, inv: false, pad: -1 } } });
  assert.equal(m.pitch.id, 'Yoke');
  assert.equal(m.pitch.inv, true);
  assert.equal(m.yaw.id, undefined, 'a non-string id is dropped, the axis assignment kept');
  assert.equal(m.yaw.axis, 2);
  assert.deepEqual(m.thr, PADMAP0.thr, 'an out-of-range axis falls back to the standard entry');
  assert.deepEqual(padMapOf({}), PADMAP0, 'no map is the standard map');
  assert.deepEqual(padMapOf({ padMap: { brakeL: null } }).brakeL, null, 'an explicit null unmaps');
});
