// CADET — tools/aircraft/spec.mjs : what the Archer's model is built to (for tools/aircraft/build_archer.py): FLIGHT
// LAB's description of the aircraft (the physics' own dimensions: fuselage rings, wing, tail, gear, engine), the hinge
// lines of its moving parts (acmesh's pivots and axes: the model's surfaces turn on them), where the cabin section ends
// (the cockpit view takes it away) and the registrations painted on the school's Archers.
//   node tools/aircraft/spec.mjs > /tmp/archer.json
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TAILS } from '../../src/aircraft/registrations.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'acmesh.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../../flight-lab/src', m), 'utf8'), { filename: m });
const FL = globalThis.FL, A = FL.physics.AIRCRAFT.find(a => a.id === 'pa28');
const { cabinRear } = await import('../../src/aircraft/exterior.js');
const hinges = {};
for (const p of FL.acmesh.buildParts(A)) if (p.pivot) hinges[p.name] = { pivot: [...p.pivot], axis: p.axis ? [...p.axis] : null };
const pick = (o, ks) => Object.fromEntries(ks.map(k => [k, o[k]]));
process.stdout.write(JSON.stringify({
  ...pick(A, ['fuse', 'wing', 'hstab', 'vstab', 'eye', 'engines', 'gear']),
  hinges, zRear: cabinRear(A), tails: TAILS.filter(t => t.type === 'pa28').map(t => t.reg),
}, null, 1));
