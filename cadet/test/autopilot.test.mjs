// CADET — autopilot tests (node --test): the GFC700-class AP (flight/autopilot.js) against FLIGHT LAB's own
// physics, flown through the flight bridge exactly as fly-mode flies it (the pilot hook before each step).
//   - the engage rules: not on the ground, not below 800 ft AGL; a mode key engages in that mode;
//   - HDG captures and holds the heading bug; ALT captures and holds the selected altitude (the bot's law);
//   - no mode: the pitch held, the wings levelled; the trim follows the AP;
//   - the disconnects: the AP key, a held pitch / roll key (the hands taking over), 200 ft AGL, a stall
//     warning, the flight's end — and the amber flash after;
//   - the bridge's parity guard: the pilot hook stays out of lessons unless airPilot is asked for;
//   - the PFD softkeys (AP / HDG / ALT in the PFD menu) and the annunciation strip's drawing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFlight, H } from '../src/flight/flight.js';
import { createAutopilot, drawApStrip, AP_MIN_ENGAGE_FT, AP_MIN_USE_FT } from '../src/flight/autopilot.js';
import { SOFTKEYS } from '../src/aircraft/g1000.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics, AV = FL.avionics;
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const NOINPUT = { down: () => false };
const w180 = (d) => AV.wrap180(d);

// a free flight in the practice area (3,000 ft, heading 090), the AP engaged through its own control
function airborne() {
  const flight = createFlight(FL, { store: memStore() });
  flight.startFree('area', 'pa28', {});
  const ap = createAutopilot(FL);
  return { flight, ap, pilot: (L, dt) => ap.pilot(L, dt) };
}

test('ap: the engage rules — airborne, at or above 800 ft AGL; a mode key engages in that mode', () => {
  const { flight, ap } = airborne();
  // on the ground it refuses
  const g = createFlight(FL, { store: memStore() }); g.startOnGround(-39000, 0, 350, 'pa28', {});
  assert.match(ap.control(g, 'AP'), /空中/); assert.equal(ap.on, false);
  // in the air it engages, both modes from the AP key
  assert.match(ap.control(flight, 'AP'), /接続/);
  assert.ok(ap.on && ap.hdg && ap.alt);
  assert.match(ap.control(flight, 'AP'), /解除/); assert.equal(ap.on, false); assert.ok(ap.flash > 0);
  // a mode key engages in that mode only
  assert.match(ap.control(flight, 'AP_HDG'), /接続/); assert.ok(ap.on && ap.hdg && !ap.alt);
  ap.control(flight, 'AP');
  assert.match(ap.control(flight, 'AP_ALT'), /接続/); assert.ok(ap.on && !ap.hdg && ap.alt);
  ap.control(flight, 'AP');
  // below the engage floor it refuses, with the floor named
  P.placeInAir(flight.s, 7000, -37500, AP_MIN_ENGAGE_FT + 55 - 100, AV.magToTrue(90, P.MAGVAR_W), 90);
  flight.runScripted(() => {}, 0.5);
  assert.ok(flight.s.out.agl < AP_MIN_ENGAGE_FT, `agl ${flight.s.out.agl}`);
  assert.match(ap.control(flight, 'AP'), new RegExp(String(AP_MIN_ENGAGE_FT)));
  assert.equal(ap.on, false);
});

test('ap: HDG captures and holds the heading bug, ALT the altitude through the turn', () => {
  const { flight, ap, pilot } = airborne();
  flight.av.hdgBug = 200; flight.av.altSel = 3000;
  ap.control(flight, 'AP');
  flight.runScripted(pilot, 50);
  const c = flight.L.last;
  assert.ok(Math.abs(w180(200 - c.hdg)) <= 4, `heading ${c.hdg}`);
  assert.ok(Math.abs(c.bank) <= 4, `bank ${c.bank}`);
  assert.ok(Math.abs(c.alt - 3000) <= 100, `altitude ${c.alt}`);
  // and it stays held
  flight.runScripted(pilot, 20);
  const c2 = flight.L.last;
  assert.ok(Math.abs(w180(200 - c2.hdg)) <= 3, `heading later ${c2.hdg}`);
  assert.ok(Math.abs(c2.alt - 3000) <= 80, `altitude later ${c2.alt}`);
});

test('ap: ALT captures a new selected altitude, gently (the law clamps the rate)', () => {
  const { flight, ap, pilot } = airborne();
  flight.av.altSel = 3500;
  ap.control(flight, 'AP');
  let maxVs = 0;
  flight.runScripted(pilot, 70, (L) => { maxVs = Math.max(maxVs, Math.abs(L.last.vs)); });
  const c = flight.L.last;
  assert.ok(Math.abs(c.alt - 3500) <= 60, `altitude ${c.alt}`);
  assert.ok(maxVs <= 760, `max |vs| ${Math.round(maxVs)}`);
});

test('ap: no modes — the pitch held, the wings levelled; the trim follows', () => {
  const { flight, ap, pilot } = airborne();
  // roll it first, then engage pitch/roll only (the ALT key's AP: alt on — turn both modes off by hand)
  flight.runScripted((L) => { L.s.rIn = 0.55; }, 1.2);
  assert.ok(Math.abs(flight.L.last.bank) > 8, `bank before ${flight.L.last.bank}`);
  ap.control(flight, 'AP_ALT');
  ap.control(flight, 'AP_ALT');                       // ALT back off: pitch hold from here, wings level
  const pitch0 = flight.s.out.pitch;
  flight.runScripted(pilot, 14);
  assert.ok(Math.abs(flight.L.last.bank) <= 3, `bank after ${flight.L.last.bank}`);
  assert.ok(Math.abs(flight.s.out.pitch - pitch0) <= 2.5, `pitch ${flight.s.out.pitch} vs ${pitch0}`);
  // the trim follows towards the hands-off trim while the AP flies (a level hold at cruise)
  const f2 = airborne(); f2.ap.control(f2.flight, 'AP');
  const gap0 = Math.abs(P.trimLevel(f2.flight.s) - f2.flight.s.trim);
  f2.flight.runScripted(f2.pilot, 45);
  const gap1 = Math.abs(P.trimLevel(f2.flight.s) - f2.flight.s.trim);
  assert.ok(gap1 < gap0 * 0.7, `trim gap ${gap0.toFixed(3)} → ${gap1.toFixed(3)}`);
});

test('ap: the disconnects — the hands, the floor, a stall warning, the end of the flight', () => {
  const { flight, ap, pilot } = airborne();
  ap.control(flight, 'AP'); flight.runScripted(pilot, 3);
  // a held pitch key for less than the override time: still engaged; past it: the hands have it
  assert.equal(ap.update(0.2, flight, { down: (c) => c === 'KeyS' }), '');
  assert.ok(ap.on);
  assert.match(ap.update(0.2, flight, { down: (c) => c === 'KeyS' }), /操縦入力/);
  assert.ok(!ap.on && ap.flash > 0);
  // a released key resets the timer
  ap.control(flight, 'AP');
  ap.update(0.25, flight, { down: (c) => c === 'KeyA' });
  ap.update(0.25, flight, NOINPUT);
  assert.ok(ap.on, 'a tap does not disconnect');
  // low: the AP lets go at the use floor, with the reason
  P.placeInAir(flight.s, 7000, -37500, AP_MIN_USE_FT + 55 - 15, AV.magToTrue(90, P.MAGVAR_W), 90);
  flight.runScripted(() => {}, 0.3);
  assert.match(ap.update(0.05, flight, NOINPUT), new RegExp(String(AP_MIN_USE_FT)));
  assert.ok(!ap.on && ap.flash > 0);
  // a stall warning disconnects it
  P.placeInAir(flight.s, 7000, -37500, 3000, AV.magToTrue(90, P.MAGVAR_W), 90);
  flight.runScripted(() => {}, 0.3);
  ap.control(flight, 'AP'); assert.ok(ap.on);
  flight.s.stallWarn = true; P.derive(flight.s);
  assert.match(ap.update(0.05, flight, NOINPUT), /失速警報/);
  assert.ok(!ap.on);
  // the flight's end: silently, no flash
  ap.control(flight, 'AP'); assert.ok(ap.on);
  flight.finish();
  const other = createFlight(FL, { store: memStore() }); other.startFree('area', 'pa28', {});
  ap.update(0.05, other, NOINPUT);                     // (a new flight under it: a different L)
  assert.ok(!ap.on && ap.flash === 0);
});

test('ap: the bridge keeps the pilot hook out of lessons unless airPilot is asked (FLIGHT LAB parity)', () => {
  const flight = createFlight(FL, { store: memStore() });
  flight.startLesson('a1', 'basic', {});
  let calls = 0;
  const spy = () => { calls++; };
  const keys = { has: () => false };
  for (let i = 0; i < 30; i++) flight.frame(1 / 60, keys, { pilot: spy });
  assert.equal(calls, 0, 'no pilot in a lesson by default');
  for (let i = 0; i < 30; i++) flight.frame(1 / 60, keys, { pilot: spy, airPilot: true });
  assert.ok(calls > 0, 'the AP hook runs when asked');
});

test('ap: the PFD softkeys and the annunciation strip', () => {
  const menu = SOFTKEYS.pfdMenu, byLabel = (l) => menu.find(k => k.label === l);
  const av = { ap: { on: false, hdg: false, alt: false, flash: 0 } };
  assert.deepEqual(byLabel('AP').act(av), ['AP', 1]);
  assert.deepEqual(byLabel('HDG').act(av), ['AP_HDG', 1]);
  assert.deepEqual(byLabel('ALT').act(av), ['AP_ALT', 1]);
  assert.ok(!byLabel('AP').on(av) && !byLabel('HDG').on(av));
  av.ap.on = true; av.ap.hdg = true;
  assert.ok(byLabel('AP').on(av) && byLabel('HDG').on(av) && !byLabel('ALT').on(av));
  // the strip: nothing when off and quiet; AP and the modes when on; the amber AP while the flash lasts
  const draws = [];
  const g = { save() {}, restore() {}, fillRect() {}, strokeRect() {}, fillText(t) { draws.push(t); } };
  drawApStrip(g, 640, { ap: { on: false, hdg: false, alt: false, flash: 0 } });
  assert.equal(draws.length, 0);
  drawApStrip(g, 640, { ap: { on: true, hdg: true, alt: true, flash: 0 } });
  assert.ok(draws.includes('AP') && draws.some(t => /HDG/.test(t) && /ALT/.test(t)), draws.join(','));
  draws.length = 0;
  drawApStrip(g, 640, { ap: { on: false, hdg: false, alt: false, flash: 2.4 } });
  assert.ok(draws.some(t => /A P/.test(t)), 'the flashing AP after a disconnect');
});

test('ap: NAV tracks the GPS leg to a direct-to point', () => {
  const { flight, ap, pilot } = airborne();
  AV.control(flight.av, 'DIRECT', 'LABED');
  assert.match(ap.control(flight, 'AP_NAV'), /接続/);
  assert.ok(ap.on && ap.nav && !ap.hdg && !ap.alt, 'NAV engages lateral only (pitch hold), like the real unit');
  ap.control(flight, 'AP_ALT');                        // the pilot adds the altitude hold
  flight.runScripted(pilot, 90);
  const nav = AV.navSolve(flight.av, P.ne(flight.s), flight.s.out, P.MAGVAR_W, P.LAB_RWY);
  assert.ok(Math.abs(nav.dots) <= 0.6, `CDI dots ${nav.dots}`);
  assert.ok(Math.abs(w180(nav.dtk - flight.L.last.hdg)) <= 15, `heading ${flight.L.last.hdg} vs dtk ${nav.dtk}`);
});

test('ap: VS flies its rate and the armed ALT captures', () => {
  const { flight, ap, pilot } = airborne();
  flight.runScripted((L) => { L.s.keyHold = true; L.s.pTgt = 7; L.s.pRate = 0; }, 4);   // a climb first
  assert.ok(flight.L.last.vs > 250, `climbing at ${Math.round(flight.L.last.vs)}`);
  flight.av.altSel = 3400;
  assert.match(ap.control(flight, 'AP_VS'), /接続/);
  assert.ok(ap.vs && ap.alt, 'VS active, ALT armed');
  flight.runScripted(pilot, 90);
  assert.equal(ap.vs, false, 'VS gives up its rate at the capture');
  assert.ok(Math.abs(flight.L.last.alt - 3400) <= 90, `altitude ${flight.L.last.alt}`);
});

test('ap: APR refuses without a localizer, then flies LOC + GS down the path', () => {
  const { flight, ap, pilot } = airborne();
  assert.match(ap.control(flight, 'AP_APR'), /ローカライザー/); assert.equal(ap.on, false);
  const R = P.LAB_RWY, [n, e] = P.rwyToNE(R, -6000, 300);
  const pathFt = R.elevFt + (300 + 6000) * Math.tan(3 * Math.PI / 180) * 3.28084;
  P.placeInAir(flight.s, n, e, pathFt, R.trueHdg, 90);
  flight.runScripted(() => {}, 1);
  flight.av.cdi = 'NAV1'; flight.av.nav1.act = 109900; flight.av.altSel = 3000;
  assert.match(ap.control(flight, 'AP_APR'), /接続/);
  assert.ok(ap.apr && ap.nav);
  const alt0 = flight.L.last.alt;
  flight.runScripted(pilot, 45);
  const nav = AV.navSolve(flight.av, P.ne(flight.s), flight.s.out, P.MAGVAR_W, R);
  assert.ok(Math.abs(nav.dots) <= 0.6, `LOC dots ${nav.dots}`);
  assert.ok(Math.abs(nav.gsDots) <= 1.1, `GS dots ${nav.gsDots}`);
  assert.ok(flight.L.last.alt < alt0 - 200, `descended ${Math.round(alt0)} → ${Math.round(flight.L.last.alt)}`);
});

test('ap: the gamepad stick takes the controls too, and the disconnect asks for its tone', () => {
  const { flight, ap, pilot } = airborne();
  ap.control(flight, 'AP'); flight.runScripted(pilot, 2);
  flight.s.rKey = 0.6;
  assert.equal(ap.update(0.2, flight, NOINPUT), '');
  assert.match(ap.update(0.2, flight, NOINPUT), /操縦入力/);
  assert.equal(ap.on, false);
  assert.equal(ap.takeDiscTone(), true); assert.equal(ap.takeDiscTone(), false);
  flight.s.rKey = 0;
});

test('ap: FD alone computes the bars and touches nothing; LVL levels the wings', () => {
  const { flight, ap, pilot } = airborne();
  assert.match(ap.control(flight, 'FD'), /FD オン/);
  const pitch0 = flight.s.out.pitch;
  flight.runScripted(pilot, 6);
  ap.sync(flight.av);
  assert.equal(ap.on, false);
  assert.ok(flight.av.fd && flight.av.fd.on, 'the FD is annunciated for the PFD');
  assert.ok(Math.abs(flight.av.fd.pitch - pitch0) <= 2, `FD pitch ${flight.av.fd.pitch} vs ${pitch0}`);
  // LVL from a bank: engage, roll via HDG off-path, then LVL
  ap.control(flight, 'FD');
  flight.runScripted((L) => { L.s.rIn = 0.55; }, 1.2);
  assert.ok(Math.abs(flight.L.last.bank) > 8);
  assert.match(ap.control(flight, 'AP_LVL'), /LVL/);
  assert.ok(ap.on && ap.lvl && !ap.hdg && !ap.nav);
  flight.runScripted(pilot, 14);
  assert.ok(Math.abs(flight.L.last.bank) <= 3, `bank after LVL ${flight.L.last.bank}`);
});
