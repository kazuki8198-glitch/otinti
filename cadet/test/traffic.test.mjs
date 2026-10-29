// CADET — pattern traffic tests (node --test): the day's gating (flight/traffic.js trafficForDay), the
// circuit itself (an analytic pose: continuous, on the pattern the lessons teach, at pattern altitude), and
// the traffic system (spacing round the circuit, the position calls timed to the legs, the tower's replies,
// go-around cycles, determinism). The physics is FLIGHT LAB's own, loaded as the other tests load it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installSorajima } from '../src/flight/sorajima.js';
import { trafficForDay, createTraffic, circuitPose, CIRCUIT_S, TRAFFIC_CALLS } from '../src/flight/traffic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const P = globalThis.FL.physics;

test('traffic: the day gate — ordinary Archer lesson days in VFR weather only', () => {
  const day = { seed: 12345, kind: 'flight', chapter: 'ch3', weather: 'good', slot: 'am' };
  assert.ok(trafficForDay(day) >= 0 && trafficForDay(day) <= 3);
  // the days the design wants the sky clear
  for (const kind of ['solo', 'xc', 'checkride', 'exam', 'study', 'class', 'off']) assert.equal(trafficForDay({ ...day, kind }), 0, kind);
  for (const chapter of ['prologue', 'ch1', 'ch5', 'ch6']) assert.equal(trafficForDay({ ...day, chapter }), 0, chapter);
  // weather a VFR pattern cannot work in
  for (const weather of ['lowCloud', 'pmStorm', 'storm']) assert.equal(trafficForDay({ ...day, weather }), 0, weather);
  assert.equal(trafficForDay({ ...day, weather: 'amFog', slot: 'am' }), 0);
  // across many seeds: a mix of empty and busy days, never more than three
  let empty = 0, busy = 0;
  for (let seed = 1; seed <= 300; seed++) { const n = trafficForDay({ ...day, seed }); assert.ok(n >= 0 && n <= 3); if (n) busy++; else empty++; }
  assert.ok(empty > 30 && busy > 100, `empty ${empty}, busy ${busy}`);
  // deterministic: the same day, the same sky
  assert.equal(trafficForDay(day), trafficForDay({ ...day }));
});

test('traffic: the circuit is continuous, on the taught pattern, at pattern altitude', () => {
  const a = {}, b = {};
  let prev = circuitPose(0, false, {});
  for (let t = 0.05; t <= CIRCUIT_S + 0.05; t += 0.05) {
    const p = circuitPose(t, false, {});
    const step = Math.hypot(p.along - prev.along, p.cross - prev.cross);
    assert.ok(step < 4, `position jump ${step.toFixed(1)} m at t=${t.toFixed(1)} (${prev.leg} → ${p.leg})`);
    let dh = Math.abs(p.hdgTrue - prev.hdgTrue); dh = Math.min(dh, 360 - dh);
    assert.ok(dh < 1.2, `heading jump ${dh.toFixed(2)}° at t=${t.toFixed(1)}`);
    assert.ok(p.altFt >= 55 && p.altFt <= 1055, `altitude ${p.altFt} at t=${t.toFixed(1)}`);
    prev = p;
  }
  // the downwind: 1,600 m west of the runway, level at 1,000 ft AGL, heading down the field
  const dw = circuitPose(CIRCUIT_S * 0.35, false, a);
  assert.equal(dw.leg, 'downwind'); assert.equal(dw.cross, -1600); assert.equal(dw.altFt, 1055);
  assert.ok(Math.abs(dw.hdgTrue - 174) < 1, `downwind heading ${dw.hdgTrue}`);
  // the final ends at the touchdown point, on the centreline, at field elevation
  const fin = circuitPose(CIRCUIT_S - 0.001, false, b);
  assert.equal(fin.leg, 'final'); assert.ok(Math.abs(fin.cross) < 1 && Math.abs(fin.altFt - 55) < 2, `final end ${fin.cross}, ${fin.altFt}`);
  // the quaternion the pose makes (the view's) reads back as the same pitch and bank: a left turn banks left
  const turn = circuitPose(CIRCUIT_S * 0.13, false, {});
  const att = P.attitude({ q: P.qFromHPB(turn.hdgTrue, turn.pitch, turn.bank) });
  assert.ok(Math.abs(att.bank - turn.bank) < 0.6 && att.bank < 0, `bank ${att.bank} vs ${turn.bank}`);
  assert.ok(Math.abs(att.pitch - turn.pitch) < 0.6, `pitch ${att.pitch} vs ${turn.pitch}`);
  // a go-around cycle never touches: the final bottoms out about 200 ft AGL and the upwind starts high
  let min = 1e9;
  for (let t = 0; t <= CIRCUIT_S; t += 0.25) min = Math.min(min, circuitPose(t, true, {}).altFt);
  assert.ok(min > 200, `go-around minimum ${min} ft MSL`);
});

test('traffic: the system — spacing, calls on the legs, the tower replying, determinism', () => {
  const run = (seed) => {
    const sys = createTraffic(P); sys.set(3, seed);
    const calls = [];
    for (let t = 0; t < CIRCUIT_S * 2.2; t += 0.25) for (const ev of sys.update(0.25)) calls.push({ at: Math.round((t + 0.25) * 10) / 10, ...ev });
    return { sys, calls };
  };
  const { sys, calls } = run(777);
  assert.equal(sys.poses.length, 3);
  // spaced: no two trainers ever close (sampled across two circuits)
  const s2 = createTraffic(P); s2.set(3, 777);
  for (let t = 0; t < CIRCUIT_S * 2; t += 1) {
    s2.update(1);
    for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++)
      assert.ok(Math.hypot(s2.poses[i].n - s2.poses[j].n, s2.poses[i].e - s2.poses[j].e) > 500, `too close at t=${t}`);
  }
  // every trainer reports abeam, base and final, more than once in two circuits; the tower clears each final
  for (const cs of TRAFFIC_CALLS) {
    const mine = calls.filter(c => c.en.includes(cs.short));
    assert.ok(mine.filter(c => /abeam/.test(c.en)).length >= 2, `${cs.short} abeam`);
    assert.ok(mine.filter(c => /turning base/.test(c.en)).length >= 2, `${cs.short} base`);
    assert.ok(mine.filter(c => /final runway 36/.test(c.en)).length >= 2, `${cs.short} final`);
    assert.ok(mine.filter(c => /cleared touch and go/.test(c.en)).length >= 2, `${cs.short} cleared`);
  }
  // a clearance follows its final call, never precedes it
  for (const cs of TRAFFIC_CALLS) {
    const fin = calls.find(c => c.en.includes(cs.short) && /final runway 36/.test(c.en));
    const clr = calls.find(c => c.en.includes(cs.short) && /cleared touch and go/.test(c.en));
    assert.ok(clr.at > fin.at && clr.at - fin.at < 6, `${cs.short}: clearance ${clr.at} after final ${fin.at}`);
  }
  // the spoken form spells the call sign out (the speech synthesis reads what it is given)
  assert.ok(calls.every(c => !/\dSY,/.test(c.say) || /One Sierra Yankee|Five Sierra Yankee|Niner Sierra Yankee/.test(c.say)));
  // the same seed flies the same sky, call for call
  assert.deepEqual(run(777).calls, calls);
  // and an empty day stays silent
  const none = createTraffic(P); none.set(0, 5);
  for (let t = 0; t < 300; t += 0.5) assert.equal(none.update(0.5).length, 0);
});

test('traffic: a go-around in five cycles or so, called on the final', () => {
  const sys = createTraffic(P); sys.set(1, 4242);
  let ga = 0, finals = 0;
  for (let t = 0; t < CIRCUIT_S * 40; t += 0.25) for (const ev of sys.update(0.25)) {
    if (/going around/.test(ev.en)) ga++;
    if (/final runway 36/.test(ev.en)) finals++;
  }
  assert.ok(finals >= 38, `finals ${finals}`);
  assert.ok(ga >= 2 && ga <= 16, `go-arounds ${ga} of ${finals} finals`);
});
