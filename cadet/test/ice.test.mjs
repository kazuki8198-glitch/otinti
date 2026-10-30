// CADET — airframe icing (B3.4): the career gate (a seeded modifier on cold late-year low-cloud days only,
// ordinary lowCloud days untouched), the accretion/melting law, and what the ice does to the aeroplane.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { weatherFor, dayOfYear } from '../src/career/career.js';
import { iceInBand, iceStep, iceApply } from '../src/flight/ice.js';

const here = path.dirname(fileURLToPath(import.meta.url));

test('ice: the career gate — only cold late-year low-cloud days, and then it is cold', () => {
  let gated = 0, plain = 0;
  for (let seed = 1; seed <= 8; seed++) for (let day = 60; day <= 320; day++) {
    const W = weatherFor(seed, day, { force: 'lowCloud' });
    if (dayOfYear(day) < 295) assert.ok(!W.icing, `no icing before the cold season (day ${day})`);
    if (W.icing) { gated++; assert.ok(W.tempC >= -1 && W.tempC <= 2, `icing day temp ${W.tempC}`); assert.match(W.why, /着氷/); }
    else if (dayOfYear(day) >= 295) { plain++; assert.ok(W.tempC >= 17, `an ordinary lowCloud day keeps its temperature (${W.tempC})`); }
  }
  assert.ok(gated >= 5, `icing days found: ${gated}`);
  assert.ok(plain >= 5, `ordinary late lowCloud days remain: ${plain}`);
  // other kinds never carry it
  for (const kind of ['good', 'pmStorm', 'amFog']) assert.ok(!weatherFor(3, 300, { force: kind }).icing, kind);
});

test('ice: accretion in the band, melting out of it, faster in warm air', () => {
  assert.ok(iceInBand(true, 2000, 0) && !iceInBand(false, 2000, 0) && !iceInBand(true, 200, 0) && !iceInBand(true, 2000, 6) && !iceInBand(true, 2000, -20));
  let ice = 0;
  for (let i = 0; i < 60 * 4; i++) ice = iceStep(ice, true, 2000, 0, 1);   // four minutes in the band
  assert.ok(ice > 0.95, `accreted (${ice.toFixed(2)})`);
  for (let i = 0; i < 30; i++) ice = iceStep(ice, true, 200, 12, 1);       // warm air below
  assert.equal(ice, 0, 'melted in warm air');
  let slow = 0.5;
  slow = iceStep(slow, false, 2000, 0, 1);
  assert.ok(slow < 0.5 && slow > 0.48, 'out of the band it goes slowly');
});

test('ice: what it does to the aeroplane (lift, drag, stall, weight) — and the wiring', () => {
  const AC = { CL0: 0.28, CD0: 0.032, aStall: 0.28, mass: 1050 };
  const base = { ...AC };
  iceApply(AC, base, 1);
  assert.ok(AC.CL0 < base.CL0 * 0.8, 'lift down');
  assert.ok(AC.CD0 > base.CD0 * 1.8, 'drag up');
  assert.ok(AC.aStall < base.aStall, 'stalls earlier');
  assert.equal(AC.mass, base.mass + 14, 'the weight of it');
  iceApply(AC, base, 0);
  assert.deepEqual(AC, base, 'clean again at zero');
  const fm = fs.readFileSync(path.join(here, '../src/flight/fly-mode.js'), 'utf8');
  assert.match(fm, /iceStep\(s\.ice/, 'fly-mode accretes on the state');
  assert.match(fs.readFileSync(path.join(here, '../src/render/post.js'), 'utf8'), /uFrost/, 'the frost on the glass');
});
