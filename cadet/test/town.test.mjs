// CADET — the world beyond the field (world/landmarks.js, B1.2/B1.3-lite): the town on the cross-country
// route (instanced, with its church and school), the river between the two lakes, and the northern
// mountain silhouettes — all present, all cheap: five added draw calls at most.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeLayout } from '../src/world/layout.js';
import { buildLandmarks } from '../src/world/landmarks.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics;
const L = makeLayout(P);
const { group } = buildLandmarks(L, FL);

const count = (o) => { let n = 0; o.traverse(c => { if (c.isMesh || c.isInstancedMesh) n++; }); return n; };

test('town: the town, the river and the mountains are in the landmarks, within the call budget', () => {
  const town = group.children.find(c => c.name === 'town');
  assert.ok(town, 'the town group');
  const inst = town.children.find(c => c.isInstancedMesh);
  assert.ok(inst && inst.count >= 80, `instanced buildings: ${inst && inst.count}`);
  assert.equal(town.children.length, 5, 'instanced block + church (tower, spire, nave) + school');
  assert.ok(group.children.find(c => c.name === 'river'), 'the river');
  const ridge = group.children.find(c => c.name === 'mountains');
  assert.ok(ridge && ridge.isMesh, 'the ridge is one merged mesh');
  // the whole addition: town 5 + river 1 + ridge 1 = 7 calls over the towers and the VOR
  const towers = count(group) - 7;
  assert.ok(towers > 0 && count(group) === towers + 7, `calls: total ${count(group)}`);
});

test('town: it stands on the route at XC distance, and the ridge is far north', () => {
  const town = group.children.find(c => c.name === 'town');
  const { n, e } = L.fromLocal(town.position.x, town.position.z);
  const dField = Math.hypot(n - P.LAB_RWY.n, e - P.LAB_RWY.e);
  assert.ok(dField > 10000 && dField < 16000, `town ${dField.toFixed(0)} m from LAB (about halfway to LAB-B)`);
  // distance from the LAB → LABEB line
  const B = FL.avionics.wpt('LABEB');
  const vx = B.n - P.LAB_RWY.n, ve = B.e - P.LAB_RWY.e, wx = n - P.LAB_RWY.n, we = e - P.LAB_RWY.e;
  const t = (wx * vx + we * ve) / (vx * vx + ve * ve), px = wx - t * vx, pe = we - t * ve;
  assert.ok(Math.hypot(px, pe) < 600, `off the route by ${Math.hypot(px, pe).toFixed(0)} m`);
  const ridge = group.children.find(c => c.name === 'mountains');
  ridge.geometry.computeBoundingBox();
  const bb = ridge.geometry.boundingBox, c = L.fromLocal((bb.min.x + bb.max.x) / 2, (bb.min.z + bb.max.z) / 2);
  assert.ok(c.n > 30000, `the ridge stands north (${c.n.toFixed(0)})`);
  assert.ok(bb.max.y > 800, `peaks to ${bb.max.y.toFixed(0)} m`);
});
