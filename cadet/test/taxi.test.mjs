// CADET — the ways round LAB field on the ground and the taxi pilot (flight/taxi.js), on FLIGHT LAB's physics:
//  - from today's stand to the hold-short line of runway 36 at A1 (stopped short of the line, facing the runway),
//    then lined up on 36 where FLIGHT LAB's take-off lessons start (along 30 m, on the centre line, heading 354°);
//  - after t3 flown by FLIGHT LAB's bot (stopped on the runway), off at the next connector and back to the stand;
//  - every wheel stays on the pavement the physics knows, the wing tips keep clear of the parked aircraft, nothing
//    is damaged, and the speeds stay a walking pace.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBot } from './helpers/bot.mjs';
import { createFlight } from '../src/flight/flight.js';
import { createSystems } from '../src/aircraft/systems.js';
import { routeOut, routeLineUp, routeIn, createTaxiPilot, exitFor, HOLD, LINEUP } from '../src/flight/taxi.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { loadFL, CORE } from './helpers/fl.mjs';

loadFL(CORE);
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, P = FL.physics, R = P.LAB_RWY;
const NOKEYS = { has: () => false };
const STAND = { a: 636.5, c: 207.6 };
// the other parked aircraft (main.js: these tie-down spots, noses west); today's is the one at STAND
const SPOTS = [0, 2, 3, 5, 8, 10, 13, 16, 22].map(i => ({ a: 470 + Math.floor(i / 2) * 18.5, c: i % 2 ? 208 : 168 }));
const SPAN = 10.8, HALF = SPAN / 2;

function onApron() {
  const fl = createFlight(FL, { store: null });
  const [n, e] = P.rwyToNE(R, STAND.a, STAND.c);
  fl.startOnGround(n, e, (R.trueHdg + 270) % 360, 'pa28', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  const sys = createSystems({}); sys.setRunning(fl.s);
  return { fl, sys };
}
const where = (s) => { const p = P.ne(s); return P.rwyCoords(R, p.n, p.e); };
// drive a route at 60 fps; check every frame
function drive(fl, points, opts, maxT = 900) {
  const tp = createTaxiPilot(FL, points, opts);
  fl.action('parkBrake', false);
  let t = 0, vmax = 0, minClear = Infinity;
  while (!tp.state.done && t < maxT) {
    fl.frame(1 / 60, NOKEYS, { pilot: tp.fly }); t += 1 / 60;
    const s = fl.s;
    assert.ok(!s.crashed, `damaged at ${t.toFixed(1)} s`);
    for (const w of s.WHEELS) {
      const off = P.qrot(s.q, w.off), n = -(s.pos[2] + off[2]), e = s.pos[0] + off[0];
      assert.ok(P.pavedAt(n, e), `a wheel off the pavement at ${t.toFixed(1)} s (${JSON.stringify(where(s))})`);
    }
    // the wing tips (in the runway frame) against the parked aircraft (each a box of its span × its length)
    const rc = where(s), h = (P.attitude(s).hdg - R.trueHdg) * Math.PI / 180;
    for (const sd of [-1, 1]) {
      const ta = rc.along - Math.sin(h) * HALF * sd, tc = rc.cross + Math.cos(h) * HALF * sd;
      for (const p of SPOTS) minClear = Math.min(minClear, Math.max(Math.abs(ta - p.a) - HALF, tc - (p.c + 5), (p.c - 3) - tc));
    }
    vmax = Math.max(vmax, tp.state.v);
  }
  for (let k = 0; k < 60; k++) fl.frame(1 / 60, NOKEYS, { pilot: tp.fly });
  return { done: tp.state.done, t, vmax, minClear, at: where(fl.s), hdg: P.attitude(fl.s).hdg, v: Math.hypot(fl.s.vel[0], fl.s.vel[2]) };
}

test('taxi: today\'s stand to the hold-short line at A1, then lined up where the take-off lessons start', () => {
  const { fl } = onApron();
  const out = drive(fl, routeOut(STAND));
  assert.ok(out.done, 'reached the hold-short line');
  assert.ok(out.at.cross > HOLD.c + 4 && out.at.cross < HOLD.c + 10, `stopped short of the line: ${out.at.cross}`);
  assert.ok(Math.abs(out.at.along - 17.5) < 1.5, `on A1's centre line: ${out.at.along}`);
  assert.ok(Math.abs(P.wrap180(out.hdg - (R.trueHdg + 270))) < 6, `facing the runway: ${out.hdg}`);
  assert.ok(out.v < 0.1 && out.vmax < 5.2, `a walking pace (max ${out.vmax} m/s), stopped`);
  assert.ok(out.minClear > 1.5, `clear of the parked aircraft: ${out.minClear} m`);
  assert.ok(out.t < 260, `about three minutes: ${out.t} s`);
  const up = drive(fl, routeLineUp(), { speed: 2.2, turnSpeed: 1.8 });
  assert.ok(up.done);
  assert.ok(Math.abs(up.at.along - LINEUP.a) < 1.5 && Math.abs(up.at.cross) < 0.6, `lined up: ${JSON.stringify(up.at)}`);
  assert.ok(Math.abs(P.wrap180(up.hdg - R.trueHdg)) < 2, `heading 36: ${up.hdg}`);
});

test('taxi: after t3 (FLIGHT LAB\'s bot) off the runway at the next connector and back onto today\'s stand', () => {
  for (const lv of ['intro', 'basic']) {
    const { fl, sys } = onApron();
    fl.startLesson('t3', lv, { sens: 'low', autoRud: false }); sys.setRunning(fl.s);
    const L = fl.runScripted(makeBot(FL).fly, 600);
    assert.ok(L.done && L.passed, `${lv}: t3 passed`);
    const stop = where(fl.s);
    fl.continueFree();
    assert.ok(fl.free && fl.s === L.s, 'the same aircraft, now in a free flight');
    const r = routeIn({ a: stop.along, c: stop.cross }, STAND);
    assert.equal(r.exit, exitFor(stop.along));
    const back = drive(fl, r.points);
    assert.ok(back.done, `${lv}: reached the stand`);
    assert.ok(Math.hypot(back.at.along - STAND.a, back.at.cross - STAND.c) < 3, `${lv}: on the stand ${JSON.stringify(back.at)}`);
    assert.ok(back.minClear > 1.5, `${lv}: clear of the parked aircraft (${back.minClear} m)`);
  }
});
