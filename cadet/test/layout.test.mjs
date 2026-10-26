// CADET — layout tests (node --test): the drawn world agrees with FLIGHT LAB's physics.
//  - what is drawn as runway / taxiway / apron is exactly what FL.physics.pavedAt says the wheels roll on;
//  - the game's own surfaces (walkways, the car park) never cover FLIGHT LAB's pavement and are not paved for the wheels;
//  - the lakes' outlines are the water the wheels find;
//  - the drawn origin round-trips, and the runway frame used by the meshes matches FL.physics.rwyToNE.
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { makeLayout } from '../src/world/layout.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { loadFL } from './helpers/fl.mjs';

loadFL('physics.js', 'avionics.js');
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, P = FL.physics;
const L = makeLayout(P);
const rnd = (() => { let s = 12345; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; })();

test('layout: every drawn cell has the kind FL.physics.pavedAt gives at its centre', () => {
  for (const c of L.cells) {
    const [n, e] = P.rwyToNE(L.R, (c.a0 + c.a1) / 2, (c.c0 + c.c1) / 2), k = P.pavedAt(n, e);
    if (['rwy', 'twy', 'apron'].includes(c.kind)) assert.equal(k, c.kind, `cell ${JSON.stringify(c)}`);
    else assert.equal(k, null, `game surface or grass over FLIGHT LAB pavement: ${JSON.stringify(c)}`);
  }
});

test('layout: 20,000 random points on the airfield — drawn pavement = physics pavement', () => {
  let paved = 0;
  for (let i = 0; i < 20000; i++) {
    const a = L.region.a0 + rnd() * (L.region.a1 - L.region.a0), c = L.region.c0 + rnd() * (L.region.c1 - L.region.c0);
    const [n, e] = P.rwyToNE(L.R, a, c), k = P.pavedAt(n, e), cell = L.cellAt(a, c);
    assert.ok(cell, `no cell at ${a}, ${c}`);
    const drawn = ['rwy', 'twy', 'apron'].includes(cell.kind) ? cell.kind : null;
    assert.equal(drawn, k, `at along ${a.toFixed(2)} across ${c.toFixed(2)}`);
    if (k) paved++;
  }
  assert.ok(paved > 1500, 'the sample should hit the pavement often');
});

test('layout: the game surfaces stay off FLIGHT LAB pavement', () => {
  for (const s of L.SITE) for (const p of P.PAVED) {
    const overlap = Math.min(s[1], p[1]) - Math.max(s[0], p[0]) > 0 && Math.min(s[3], p[3]) - Math.max(s[2], p[2]) > 0;
    assert.ok(!overlap, `${s[4]} ${s.slice(0, 4)} overlaps ${p[4]} ${p.slice(0, 4)}`);
  }
});

test('layout: the lakes drawn are the water the wheels find', () => {
  for (const k of L.lakes) {
    for (let i = 0; i < 64; i++) {
      const a = i / 64 * 2 * Math.PI, r = L.lakeRadius([k.n, k.e, k.r, k.seed], a);
      assert.equal(P.inLake(k.n + 0.97 * r * Math.sin(a), k.e + 0.97 * r * Math.cos(a)), true);
      assert.equal(P.inLake(k.n + 1.03 * r * Math.sin(a), k.e + 1.03 * r * Math.cos(a)), false);
    }
  }
});

test('layout: the drawn origin round-trips and the runway frame matches the physics', () => {
  const p = [P.LAB_RWY.e + 123.4, 50, -(P.LAB_RWY.n + 567.8)];
  assert.deepEqual(L.localToPhys(L.physToLocal(p)).map(v => +v.toFixed(6)), p.map(v => +v.toFixed(6)));
  const frame = new THREE.Group(); frame.position.set(0, L.G, 0); frame.rotation.y = L.frameYaw; frame.updateMatrixWorld();
  for (const [a, c] of [[0, 0], [1200, 0], [300, -15], [600, 230], [-40, 15]]) {
    const w = new THREE.Vector3(c, 0, -a).applyMatrix4(frame.matrixWorld), r = L.rwyToLocal(a, c);
    assert.ok(Math.hypot(w.x - r[0], w.y - r[1], w.z - r[2]) < 1e-6, `frame (${a}, ${c})`);
    const back = L.localToRwy(r[0], r[2]);
    assert.ok(Math.abs(back.along - a) < 1e-6 && Math.abs(back.cross - c) < 1e-6);
  }
  // the threshold of 36 is the drawn origin, on the ground
  assert.deepEqual(L.rwyToLocal(0, 0).map(v => +v.toFixed(9)), [0, +L.G.toFixed(9), 0]);
});
