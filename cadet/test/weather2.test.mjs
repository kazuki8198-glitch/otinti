// CADET — the day's weather as a living thing (career/career.js): QNH varies by day and is the value the
// METAR prints; the morning's fog and low cloud move with the clock (weatherAt), not at the slot edges; and
// the forecast bust exists only where the caller allows it (the late chapters), with a TAF that promises
// VFR and an afternoon METAR that tells another story.
import test from 'node:test';
import assert from 'node:assert/strict';
import { weatherFor, weatherAt } from '../src/career/career.js';

test('weather2: QNH varies by day, stays in range, and the METAR prints it', () => {
  const seen = new Set();
  for (let seed = 1; seed <= 12; seed++) for (let day = 2; day <= 120; day++) {
    const W = weatherFor(seed, day);
    assert.ok(W.qnh >= 29.55 && W.qnh <= 30.25, `qnh ${W.qnh}`);
    seen.add(W.qnh);
    const printed = `A${String(Math.round(W.qnh * 100))}`;
    assert.ok(W.metar.am.includes(printed), `METAR ${printed} in ${W.metar.am}`);
  }
  assert.ok(seen.size > 20, `distinct QNH values: ${seen.size}`);
});

test('weather2: the morning evolves with the clock', () => {
  const fog = weatherFor(1, 1, { force: 'amFog' });
  assert.equal(weatherAt(fog, 7.7).fog, 0.85, 'full fog early');
  const mid = weatherAt(fog, 9.6).fog;
  assert.ok(mid > 0 && mid < 0.85, `thinning by mid-morning (${mid.toFixed(2)})`);
  assert.equal(weatherAt(fog, 14).fog, 0, 'gone by the afternoon');
  assert.ok(weatherAt(fog, 7.7).visSM < weatherAt(fog, 9.6).visSM, 'visibility recovers with it');
  const lc = weatherFor(1, 1, { force: 'amLowCloud' });
  assert.equal(weatherAt(lc, 7.7).ceilingFt, 600);
  assert.ok(weatherAt(lc, 10).ceilingFt > 1500 && weatherAt(lc, 10).ceilingFt < 3000, 'lifting through the morning');
  assert.equal(weatherAt(lc, 14).ceilingFt, 3500);
});

test('weather2: the forecast bust — only when allowed, TAF promises, PM tells the truth', () => {
  let busts = 0;
  for (let seed = 1; seed <= 30; seed++) for (let day = 2; day <= 200; day++) {
    const plain = weatherFor(seed, day);
    assert.notEqual(plain.kind, 'forecastBust', 'never without bustOk');
    const W = weatherFor(seed, day, { bustOk: true });
    if (W.kind !== 'forecastBust') continue;
    busts++;
    assert.equal(W.decision, 'early');
    assert.match(W.taf, /P6SM FEW035/, 'the TAF promised a VFR day');
    assert.match(W.metar.am, /10SM FEW035/, 'the morning was fine');
    assert.match(W.metar.pm, /TSRA/, 'the afternoon front arrived');
    assert.ok(W.debrief && W.debrief.length > 10, 'the dispatcher debrief line is kept');
  }
  assert.ok(busts >= 3, `bust days found: ${busts}`);
});
