// FLIGHT LAB — the 737-class jet (first-officer phase S2): the aircraft, its spool-and-N1 powerplant, the
// reversers and spoilers, the steady states the design memo's target table quotes, and a fixed-value
// snapshot proving the piston Archer's numbers did not move.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';
const FL = load('physics.js');
const P = FL.physics;
const DT = 1 / 120, clamp = P.clamp;
const run = (s, sec, fn) => { for (let i = 0; i < sec * 120; i++) { if (fn) fn(s); P.step(s, DT); } return s; };
const jet = (mass) => { const s = P.newState({ aircraft: 'b737', mass }); return s; };

test('jet: the aircraft exists, is a twin jet, and derives finite numbers', () => {
  const A = P.AIRCRAFT.find(a => a.id === 'b737');
  assert.ok(A, 'b737 in AIRCRAFT');
  assert.equal(A.jet, true); assert.equal(A.engines1, 2); assert.equal(A.gear.fixed, false);
  assert.deepEqual(A.flapLabels, ['UP', '5', '15', '40']);
  assert.equal(A.phys.engine.type, 'jet');
  const s = jet(); P.placeOnRunway(s);
  for (const k of ['mass', 'S', 'b', 'c', 'CL0', 'CLa', 'CD0', 'K']) assert.ok(Number.isFinite(s.AC[k]), `AC.${k} finite`);
  assert.ok(s.WHEELS.length === 3 && s.HARDPTS.length > 0);
  assert.ok(Number.isFinite(s.out.vs0) && s.out.vs0 > 80 && s.out.vs0 < 115, `vs0 ${s.out.vs0}`);
  assert.equal(s.out.jet, true);
  run(s, 2); assert.ok([s.out.ias, s.out.altTrue, s.out.n1].every(Number.isFinite), 'outputs finite after steps');
});

test('jet: the standard load is the 48,000 kg reference, in the CG band', () => {
  const A = P.AIRCRAFT.find(a => a.id === 'b737');
  const wb = P.computeWB(A, P.stdLoading());
  assert.equal(wb.kg, 48000);
  assert.equal(wb.ok, true, JSON.stringify(wb.problems));
  assert.ok(wb.cgIn >= wb.fwdIn && wb.cgIn <= wb.aftIn);
});

test('jet: the spool lags — N1 rises monotonically, seconds behind the lever, past 90 by about 7 s', () => {
  const s = jet(); P.placeOnRunway(s); s.brake = true; s.thr = 1;
  const seen = [];
  for (let i = 0; i < 9 * 120; i++) { P.step(s, DT); if (i % 60 === 59) seen.push(s.eng[0].n1); }
  for (let i = 1; i < seen.length; i++) assert.ok(seen[i] >= seen[i - 1] - 1e-9, `monotone at ${i}: ${seen[i - 1]} → ${seen[i]}`);
  const at = sec => seen[Math.round(sec * 2) - 1];   // seen[i] is the sample at t = (i + 1) × 0.5 s
  assert.ok(at(2) < 75, `lag: N1 at 2 s is ${at(2).toFixed(1)}, not yet at power`);
  assert.ok(at(7) > 90, `N1 at 7 s is ${at(7).toFixed(1)}`);
  assert.ok(at(9) > 100, `N1 settles toward the 104 % target: ${at(9).toFixed(1)}`);
  assert.ok(s.out.egts[0] > 800 && s.out.egts[0] <= 1050, `EGT at full power is a turbine °C: ${s.out.egts[0]}`);
  assert.equal(s.eng[0].cyl, null, 'a jet grows no cylinder temperatures');
});

test('jet: fuel flow in flight is turbine-sized (the shaft-power proxy, ffK-tuned)', () => {
  const s = jet(); P.placeInAir(s, 0, -40000, 3000, 354, 200, 0, 0, 1); s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  run(s, 8);
  assert.ok(s.eng[0].ff > 400 && s.eng[0].ff < 800, `full-power FF per engine at 200 kt: ${Math.round(s.eng[0].ff)} gal/h`);
  const c = jet(); P.placeInAir(c, 0, -40000, 35000, 354, 250, 0, 0, P.steadyState(c, 250, 0, { altFt: 35000 }).thr);
  c.wind = { fromDeg: 0, kt: 0, gust: 0 }; run(c, 12);
  assert.ok(c.eng[0].ff > 250 && c.eng[0].ff < 450, `cruise FF per engine: ${Math.round(c.eng[0].ff)} gal/h (the ≈330 class)`);
});

test('jet: the reverser throws the thrust negative on the ground only', () => {
  const s = jet(); P.placeOnRunway(s); s.brake = true;
  run(s, 3); assert.ok(Math.abs(s.thrust) < 5000, `idle thrust small: ${Math.round(s.thrust)}`);
  // rolling at 50 kt on the runway, reversers out: the thrust must go clearly negative
  const h = 354 * P.DEG, v = 50 / P.KT;
  s.brake = false; s.vel = [Math.sin(h) * v, 0, -Math.cos(h) * v]; s.rev = 1;
  run(s, 0.5);
  assert.ok(s.thrust < -10000, `reverse thrust: ${Math.round(s.thrust)} N`);
  // in the air the same lever does nothing (the model's ground-only condition)
  const a = jet(); P.placeInAir(a, 0, -40000, 3000, 354, 150, 0, 0, 0); a.rev = 1;
  run(a, 1);
  assert.ok(a.thrust > -1, `no reverse in flight: ${Math.round(a.thrust)} N`);
});

test('jet: the spoilers add drag and dump lift', () => {
  const mk = sp => { const s = jet(); P.placeInAir(s, 0, -40000, 8000, 354, 220, 0, 0, 0.55); s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.spoiler = sp; run(s, 0.25); return s; };
  const clean = mk(0), sp = mk(1);
  assert.ok(sp.dragN > clean.dragN * 1.2, `drag ${Math.round(clean.dragN)} → ${Math.round(sp.dragN)} N`);
  assert.ok(sp.CL < clean.CL - 0.05, `CL ${clean.CL.toFixed(2)} → ${sp.CL.toFixed(2)}`);
});

test('jet: one engine out — half the thrust, a yaw toward the dead side, and the live one still spools', () => {
  const s = jet(); P.placeInAir(s, 0, -40000, 5000, 354, 180, 0, 0, 1);
  s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.eng[1].failed = true;
  run(s, 9);
  assert.ok(s.eng[0].n1 > 93 && s.eng[1].n1 < 15, `N1 L/R: ${s.eng[0].n1.toFixed(0)} / ${s.eng[1].n1.toFixed(0)}`);
  assert.ok(s.thrust > 30000, `one engine still gives real thrust: ${Math.round(s.thrust)} N`);
});

test('jet: the steady states meet the design table (climb, cruise M 0.78, Vref band)', () => {
  const s = jet(); P.placeOnRunway(s);
  const climbDn = P.steadyState(s, s.A.v.y, null, { pwr: 'full', altFt: 100, flaps: 1, gear: true });
  assert.ok(climbDn.fpm > 2600 && climbDn.fpm < 3400, `initial climb (takeoff config): ${Math.round(climbDn.fpm)} fpm`);
  const cruise = P.steadyState(s, 250, 0, { altFt: 35000 });
  const atm = P.atmos(35000 / P.FT), mach = (250 / Math.sqrt(atm.sigma)) / P.KT / atm.a;
  assert.ok(cruise.ok && cruise.thr < 1, `FL350 M 0.78 is reachable (thr ${cruise.thr.toFixed(2)})`);
  assert.ok(Math.abs(mach - 0.78) < 0.02, `Mach ${mach.toFixed(3)}`);
  // Vref from the model's own CLmax at F40: Vs × 1.3 in the table's bands at both weights
  for (const [m, lo, hi] of [[48000, 120, 130], [62000, 135, 145]]) {
    const j = jet(m), AC = j.AC, f = 1;
    const clmax = AC.CL0 + AC.flapCL * f + AC.CLa * (AC.aStall - AC.flapStall * f);
    const vref = Math.sqrt(2 * AC.mass * P.G / (1.225 * AC.S * clmax)) * P.KT * 1.3;
    assert.ok(vref >= lo && vref <= hi, `Vref at ${m} kg: ${vref.toFixed(1)} kt`);
  }
});

test('regression: the piston Archer flies its recorded numbers (the jet work changed nothing there)', () => {
  const pa28 = P.newState({ aircraft: 'pa28' }); P.placeOnRunway(pa28);
  const V = pa28.A.v;
  const climb = P.steadyState(pa28, V.y, null, { pwr: 'full', altFt: 100 });
  assert.ok(Math.abs(climb.fpm - 776.7) < 1, `pa28 climb ${climb.fpm}`);
  assert.ok(Math.abs(climb.pitch - 10.71) < 0.05, `pa28 climb pitch ${climb.pitch}`);
  const cruise = P.steadyState(pa28, V.cruise, 0, { altFt: 3000 });
  assert.ok(Math.abs(cruise.thr - 0.7604) < 0.001, `pa28 cruise thr ${cruise.thr}`);
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100); s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  run(s, 10);
  assert.ok(Math.abs(s.out.ias - 99.04) < 0.5, `pa28 ias ${s.out.ias}`);
  assert.ok(Math.abs(s.out.altTrue - 2997.8) < 1.5, `pa28 alt ${s.out.altTrue}`);
  assert.ok(Math.abs(s.out.rpm - 2272.8) < 5, `pa28 rpm ${s.out.rpm}`);
  assert.equal(s.out.jet, false);
});
