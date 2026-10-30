// CADET — the second airfield (flight/airfields.js + world/strip.js, B2.5): the grass strip at LAB-F —
// its data (where, which way, how long), its pattern geometry, a site the wheels can actually use (not a
// lake), and the drawn thing itself, cheap.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLayout } from '../src/world/layout.js';
import { buildStrip } from '../src/world/strip.js';
import { STRIP_LABEF, airfields, airfieldById, patternFor } from '../src/flight/airfields.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics;
const L = makeLayout(P);

test('strip: the data — at LABEF, 900 m of grass, uncontrolled, listed beside LAB', () => {
  const w = FL.avionics.wpt('LABEF');
  assert.equal(STRIP_LABEF.n, w.n); assert.equal(STRIP_LABEF.e, w.e);
  assert.equal(STRIP_LABEF.len, 900); assert.equal(STRIP_LABEF.surface, 'grass'); assert.equal(STRIP_LABEF.controlled, false);
  const all = airfields(P);
  assert.equal(all.length, 2);
  assert.equal(airfieldById(P, 'LABRW').surface, 'paved');
  assert.equal(airfieldById(P, 'LABEF').id, 'LABEF');
  assert.equal(P.inLake(STRIP_LABEF.n, STRIP_LABEF.e), false, 'the site is land, not a lake');
  assert.equal(P.pavedAt(STRIP_LABEF.n, STRIP_LABEF.e), null, 'grass for the wheels, as an uncontrolled strip should be');
});

test('strip: the pattern — left traffic at pattern height, legs that close', () => {
  const p = patternFor(STRIP_LABEF);
  assert.equal(p.altitudeFt, STRIP_LABEF.elevFt + 800);
  assert.ok(p.downwind.cross < 0, 'left traffic: the downwind is on the left');
  assert.equal(p.base.along, p.downwind.along[0], 'base turns at the downwind\'s end');
  assert.ok(p.final.along[0] < -STRIP_LABEF.len / 2, 'the final starts beyond the threshold');
});

test('strip: drawn — the mown strip, the markers, the apron, the hut, the sock (six calls)', () => {
  const { group } = buildStrip(L, STRIP_LABEF);
  let calls = 0; group.traverse(c => { if (c.isMesh || c.isInstancedMesh) calls++; });
  assert.equal(calls, 6, `draw calls: ${calls}`);
  const [gx, , gz] = L.toLocal(STRIP_LABEF.n, STRIP_LABEF.e);
  assert.equal(group.position.x, gx); assert.equal(group.position.z, gz);
});
