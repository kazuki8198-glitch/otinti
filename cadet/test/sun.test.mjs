// CADET — the sun is drawn for the career's own date (career/career.js dayOfYear → render/sky.js sunPosition):
// the career runs from April into the autumn, and the sunrise, the sunset and the sun's height at a given clock
// hour must drift with it, not sit at the sky's old fixed day (285, mid-October).
import test from 'node:test';
import assert from 'node:assert/strict';
import { sunPosition } from '../src/render/sky.js';
import { dayOfYear, dateOf } from '../src/career/career.js';

test('sun: the career day maps to its calendar day of the year', () => {
  assert.equal(dayOfYear(1), 91, 'day 1 is 2027-04-01');
  assert.equal(dateOf(1).m, 4);
  // a long career reaches the autumn: day 200 is in October
  assert.equal(dateOf(200).m, 10);
  assert.ok(dayOfYear(200) > 280 && dayOfYear(200) < 300, `day 200 → ${dayOfYear(200)}`);
  assert.ok(dayOfYear(200) > dayOfYear(1), 'the year advances');
});

test('sun: the elevation at the same clock hour differs between April and October', () => {
  const apr = sunPosition(9.6, dayOfYear(1)), oct = sunPosition(9.6, dayOfYear(200));
  assert.ok(Math.abs(apr.el - oct.el) > 3, `April ${apr.el.toFixed(1)}° vs October ${oct.el.toFixed(1)}° at 09:36`);
  // and the evening: in April the sun is still up at the evening slot; by mid-October it has set
  const aprE = sunPosition(18.6, dayOfYear(1)), octE = sunPosition(18.6, 285);
  assert.ok(aprE.el > 0, `April evening sun up (${aprE.el.toFixed(1)}°)`);
  assert.ok(octE.el < aprE.el - 5, `October evening sun much lower (${octE.el.toFixed(1)}°)`);
});
