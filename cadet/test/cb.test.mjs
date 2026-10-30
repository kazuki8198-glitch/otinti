// CADET — the day's cumulonimbus (flight/cb.js, B3.3): one cell on a storm day, 10–20 km out to the west,
// clear of the pattern, the practice area, the XC route and the final; its volume's strength is nothing
// outside, full at the core, and capped in height.
import test from 'node:test';
import assert from 'node:assert/strict';
import { cbFor, cbEffect, CB_RADIUS, CB_TOP_M } from '../src/flight/cb.js';

test('cb: seeded, far out, and west — never over the field, the area or the route', () => {
  for (let seed = 1; seed <= 6; seed++) for (let day = 1; day <= 90; day++) {
    const cb = cbFor(seed, day);
    assert.deepEqual(cb, cbFor(seed, day), 'the same cell for the same day');
    const d = Math.hypot(cb.dn, cb.de);
    assert.ok(d >= 10000 && d <= 20000, `distance ${d.toFixed(0)}`);
    assert.ok(cb.de < -8000, `west of the field (de ${cb.de.toFixed(0)})`);
    // the places it must keep away from, in offsets from the field centre: the pattern (0,0 r<2500), the
    // practice area (about +8700 N, +2400 E), the XC route north-east, the final's line (the runway axis)
    assert.ok(Math.hypot(cb.dn - 8700, cb.de - 2400) > 5000, 'clear of the practice area');
    assert.ok(!(cb.dn > 3000 && cb.de > 3000), 'not on the north-east route');
  }
});

test('cb: the volume — nothing outside, the core sinks hardest, a top to it', () => {
  const cb = cbFor(3, 40);
  assert.equal(cbEffect(cb, cb.dn + CB_RADIUS + 500, cb.de, 1000), 0, 'outside');
  assert.equal(cbEffect(cb, cb.dn, cb.de, CB_TOP_M + 100), 0, 'above the dangerous air');
  const core = cbEffect(cb, cb.dn, cb.de, 1000);
  assert.ok(core > 0.99, `the core (${core})`);
  const edge = cbEffect(cb, cb.dn + CB_RADIUS * 0.8, cb.de, 1000);
  assert.ok(edge > 0 && edge < 0.3, `the edge fades (${edge.toFixed(2)})`);
  assert.equal(cbEffect(null, 0, 0, 100), 0, 'no cell, no effect');
});
