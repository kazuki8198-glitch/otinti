// CADET — precipitation (B3.2/B2.3): the render chain carries a rain pass with a precip uniform and a
// lightning flash; the sfx carry a thunder clap; main publishes the day's precipitation as
// window.__cadetPrecip; fly-mode writes the wet-runway flag onto the flight state; and the physics
// tolerates the flag (its friction effect is the flight model's own business).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createFlight } from '../src/flight/flight.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL;
const src = (p) => fs.readFileSync(path.join(here, p), 'utf8');

test('precip: the wiring is in place (rain pass, thunder, the published state, the wet flag)', () => {
  const post = src('../src/render/post.js');
  assert.match(post, /CadetRain/, 'the rain shader');
  assert.match(post, /setPrecip\(k\)/, 'the pipeline takes the day precip');
  assert.match(post, /flash\(\)/, 'the lightning flash');
  assert.match(src('../src/audio/sfx.js'), /function thunder\(/, 'the thunder clap');
  const main = src('../src/main.js');
  assert.match(main, /__cadetPrecip/, 'the window-level precip state');
  assert.match(main, /precipFor = \(kind, slot\)/, 'the per-kind precip table');
  assert.match(src('../src/flight/fly-mode.js'), /s\.surfaceWet = \(ctx\.precip/, 'fly-mode sets the wet flag from the day precip');
});

test('precip: the physics flies on with the wet flag set (no NaN, stays put on the brake)', () => {
  const f = createFlight(FL, { store: null });
  f.startFree('rwy', 'pa28', { sens: 'low', autoRud: true, assist: false });
  const s = f.s, p0 = [...s.pos];
  s.surfaceWet = true;
  const NOKEYS = { has: () => false, shift: false };
  for (let i = 0; i < 120; i++) f.frame(1 / 60, NOKEYS);
  assert.ok(s.pos.every(Number.isFinite), 'finite state');
  assert.ok(Math.hypot(s.pos[0] - p0[0], s.pos[2] - p0[2]) < 0.5, 'parked, as a dry day');
  assert.equal(s.surfaceWet, true, 'the flag rides the state');
});
