// CADET — the aerial perspective's density (render/haze.js): thinner air on a clear day (the ground's pattern
// readable from training altitudes), and a fog day's density unchanged (the visibility the METAR promised —
// fog 0.85 ≈ 800 m, 1/2 SM — is what the cadet's go / no-go was decided on).
import test from 'node:test';
import assert from 'node:assert/strict';
import { hazeDensity } from '../src/render/haze.js';

// the density the game shipped with, before the clear day was thinned
const OLD = (fog = 0, grey = 0, clear = 1) => 0.000085 * (1 + 80 * fog * fog) * (1 + grey) * clear;
// the fog fraction the shader makes of a density (post.js's AerialShader: height falloff 0.00055, ground 16.8)
const fogAt = (density, camY, dist, rdY) => {
  const k = 0.00055, h0 = Math.max(camY - 16.8, 0), dy = rdY * dist;
  const shape = Math.abs(k * dy) > 1e-4 ? (1 - Math.exp(-k * dy)) / (k * dy) : 1;
  return 1 - Math.exp(-density * Math.exp(-k * h0) * dist * shape);
};

test('haze: a clear day is thinner than it was, a fog day is exactly as thick', () => {
  assert.equal(hazeDensity(0, 0, 1), 0.000055, 'the clear base');
  for (const fog of [0.55, 0.85, 0.97]) assert.ok(Math.abs(hazeDensity(fog, 0, 1) - OLD(fog)) < OLD(fog) * 0.001, `fog ${fog}: the poor-weather density is kept`);
  assert.ok(Math.abs(hazeDensity(0.55, 0.55, 1) - OLD(0.55, 0.55)) < OLD(0.55, 0.55) * 0.001, 'low cloud (fog and grey together) is kept');
  assert.equal(hazeDensity(0, 0, 0.3), 0.000055 * 0.3, 'the epilogue\'s clear morning still scales');
});

test('haze: density rises with fog and grey, and the fog day still hides the ground', () => {
  assert.ok(hazeDensity(0.2) > hazeDensity(0) && hazeDensity(0.85) > hazeDensity(0.2), 'monotone in fog');
  assert.ok(hazeDensity(0, 0.7) > hazeDensity(0), 'an overcast is murkier than a clear day');
  // fog 0.85 at ground level: at the METAR's 800 m the ground is nearly gone (as the shader's sky is the fog's colour)
  assert.ok(fogAt(hazeDensity(0.85), 16.8, 800, 0) > 0.9, 'fog day: 800 m is white');
  assert.ok(fogAt(hazeDensity(0.85), 16.8, 3000, 0) > 0.999, 'fog day: 3 km is gone');
});

test('haze: from training altitudes a clear day keeps the field pattern readable', () => {
  // 3,000 ft up, the ground 10 km off: it was half haze; it keeps two thirds of its contrast now
  const before = fogAt(OLD(0), 16.8 + 914, 10000, -914 / 10000), after = fogAt(hazeDensity(0), 16.8 + 914, 10000, -914 / 10000);
  assert.ok(before > 0.45 && after < 0.38 && after < before - 0.1, `10 km at 3,000 ft: ${before.toFixed(2)} → ${after.toFixed(2)}`);
  // the pattern at 1,000 ft, 5 km off (the circuit's references)
  assert.ok(fogAt(hazeDensity(0), 16.8 + 305, 5000, -305 / 5000) < 0.25, 'the circuit\'s ground stays clear');
});
