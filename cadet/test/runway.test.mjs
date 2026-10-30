// CADET — the runway in use (career/career.js activeRunway + the southFlow day; flight/traffic.js's mirrored
// circuit): a southerly day is flyable, puts 18 in use, and the pattern traffic flies the mirrored circuit
// and names 18 in its calls. Scripted lessons keep runway 36 — nothing here touches their winds or starts.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weatherFor, activeRunway, WEATHER } from '../src/career/career.js';
import { installSorajima } from '../src/flight/sorajima.js';
import { createTraffic } from '../src/flight/traffic.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const P = globalThis.FL.physics;

test('runway: southFlow days exist, are flyable, and put 18 in use', () => {
  let found = 0;
  for (let seed = 1; seed <= 40 && found < 5; seed++) for (let day = 2; day <= 240 && found < 5; day++) {
    const W = weatherFor(seed, day);
    if (W.kind !== 'southFlow') continue;
    found++;
    assert.equal(W.decision, 'go');
    assert.deepEqual(W.fly, { am: true, pm: true });
    assert.match(W.metar.pm, /19008KT/);
    assert.equal(activeRunway(W), '18', 'a southerly wind puts 18 in use');
    assert.match(W.why, /18/, 'the dispatcher text names the runway in use');
    assert.match(WEATHER.southFlow.why, /追い風/, 'the tailwind judgement is in the minima conversation');
  }
  assert.ok(found >= 3, `southFlow days found: ${found}`);
  // an ordinary northerly day keeps 36
  const G = weatherFor(3, 2, { force: 'good' });
  assert.equal(activeRunway(G), '36');
  assert.equal(activeRunway(weatherFor(3, 2, { force: 'crosswind' })), '36', 'a crosswind day keeps 36');
});

test('runway: the traffic circuit mirrors for 18 and names it in the calls', () => {
  const t36 = createTraffic(P); t36.set(1, 777, '36');
  const t18 = createTraffic(P); t18.set(1, 777, '18');
  const heard18 = [];
  for (let s = 0; s < 400; s++) { t36.update(1); for (const ev of t18.update(1)) heard18.push(ev.en); }
  const [a] = t36.poses, [b] = t18.poses;
  // the same moment of the same circuit, turned end for end about the field's centre: p18 = 2C − p36 in the
  // north/east plane (C = the runway centre), the height the same
  const [cn, ce] = P.rwyToNE(P.LAB_RWY, 600, 0);
  assert.ok(Math.abs(a.n + b.n - 2 * cn) < 5 && Math.abs(a.e + b.e - 2 * ce) < 5, `mirror: 36 (${a.n.toFixed(0)},${a.e.toFixed(0)}) vs 18 (${b.n.toFixed(0)},${b.e.toFixed(0)}), centre (${cn.toFixed(0)},${ce.toFixed(0)})`);
  assert.ok(Math.abs(a.y - b.y) < 0.01, 'same height');
  assert.ok(heard18.some(x => /runway 18/.test(x)), 'the calls name runway 18');
  assert.ok(!heard18.some(x => /runway 36/.test(x)), 'no call names 36 on an 18 day');
});
