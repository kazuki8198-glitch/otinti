// CADET — the day's one wind field (career/career.js's winds aloft): the surface wind of the day's METAR and the
// wind at the nav altitude above it (veered 30°, doubled — the friction layer's rule of thumb). The morning's
// navigation log (content/school.js) is planned from it, and the solo cross-country flies in it (FLIGHT LAB's
// startLesson takes it as a given wind; the physics blends it with height). Scored lessons keep their own wind.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCareer, cleanCareer, weatherFor, surfaceWindOf, windsAloftFor, NAV_ALT_FT } from '../src/career/career.js';
import { NAVLOG, navlogDialogs, navlogNumbers } from '../src/content/school.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);                    // (the game's flight model: Sorajima's)
const FL = globalThis.FL, SC = FL.school, P = FL.physics;
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const d3 = (v) => String(Math.round((v + 360) % 360) || 360).padStart(3, '0');
const w360 = (v) => ((v % 360) + 360) % 360;
// the mean wind the physics gives at an altitude (the gusts averaged out): { from (true), kt }
function meanWind(s, aglM) {
  let x = 0, z = 0, n = 0;
  for (let t = 0; t <= 30; t += 1.5) { const w = P.windAt(s, t, aglM); x += w[0]; z += w[2]; n++; }
  return { from: w360(Math.atan2(-x / n, z / n) * 180 / Math.PI), kt: Math.hypot(x / n, z / n) * P.KT };
}
const near = (a, b, tol) => Math.abs(w360(a - b + 180) - 180) <= tol;

test('winds: the day\'s field — the afternoon METAR\'s surface wind, veered 30° and doubled at 3,000 ft', () => {
  assert.equal(NAV_ALT_FT, 3000);
  assert.deepEqual(surfaceWindOf('KLAB 021853Z 36005KT 10SM SCT045 20/11 A2992'), { from: 360, kt: 5 });
  assert.deepEqual(surfaceWindOf('KLAB 021853Z 09016G24KT 10SM'), { from: 90, kt: 16 });
  assert.deepEqual(surfaceWindOf('KLAB 021353Z 00000KT 1/2SM FG VV002'), { from: 360, kt: 0 });
  const cases = { good: [360, 5, 30, 10], crosswind: [90, 16, 120, 32], lowCloud: [30, 6, 60, 12], pmWind: [90, 18, 120, 36] };
  for (const [kind, [sf, sk, f, k]] of Object.entries(cases)) {
    const A = windsAloftFor(weatherFor(3, 2, { force: kind }));
    assert.deepEqual([A.surfFrom, A.surfKt, A.from, A.kt, A.altFt], [sf, sk, f, k, 3000], kind);
  }
  // (the same day, the same field — the seed decides it, not the hour it is asked)
  assert.deepEqual(windsAloftFor(weatherFor(9, 40)), windsAloftFor(weatherFor(9, 40)));
});

test('career: the wind field is kept with its day (and cleaned with the save)', () => {
  const c = createCareer({ store: memStore(), seed: 4 });
  const A = c.aloft({});                                    // (day 1: the prologue's forced fine day)
  assert.equal(A.day, 1);
  assert.deepEqual({ surfFrom: A.surfFrom, surfKt: A.surfKt, from: A.from, kt: A.kt }, { surfFrom: 360, surfKt: 5, from: 30, kt: 10 });
  assert.deepEqual(c.state.aloft, A, 'kept in the record');
  assert.deepEqual(cleanCareer(JSON.parse(JSON.stringify(c.state))).aloft, A, 'a save keeps it');
  assert.equal(cleanCareer({ v: 1, seed: 3, aloft: { day: 'x', surfFrom: 1, surfKt: 2, from: 3, kt: 4 } }).aloft, null, 'a spoiled one is dropped');
  c.sleep();                                                // (the next day: a new field for the new day)
  const B = c.aloft({});
  assert.equal(B.day, 2); assert.deepEqual(B, { day: 2, ...windsAloftFor(c.weather({})) });
});

test('navlog: the log is planned from the given wind — the day\'s winds aloft, not the fixed example', () => {
  for (const wind of [{ from: 330, kt: 15 }, { from: 30, kt: 10 }, { from: 120, kt: 24 }, { from: 200, kt: 8 }]) {
    const d = navlogDialogs(FL, { seed: 5, wind });
    const want = navlogNumbers(FL, { ...NAVLOG, windFrom: wind.from, windKt: wind.kt });
    assert.deepEqual(d.numbers, want, `the numbers at ${wind.from}/${wind.kt}`);
    assert.deepEqual([d.given.windFrom, d.given.windKt], [wind.from, wind.kt]);
    const mh = d.questions[1];                              // (the heading question: its right answer is the number's)
    assert.equal(mh.opts[mh.ok], `${d3(want.mh)}°`);
    assert.match(mh.q, new RegExp(`${d3(wind.from)}° から ${wind.kt} kt`), 'the given wind is the one asked about');
  }
  const plain = navlogDialogs(FL, { seed: 5 });             // (no wind given: the textbook example, as before)
  assert.deepEqual(plain.numbers, navlogNumbers(FL));
  assert.deepEqual([plain.given.windFrom, plain.given.windKt], [NAVLOG.windFrom, NAVLOG.windKt]);
});

test('flight: the cross-country lesson flies in the day\'s field — at 3,000 ft, the logged wind itself', () => {
  const A = windsAloftFor(weatherFor(3, 2, { force: 'good' }));        // (360/5 on the ground, 030/10 at 3,000 ft)
  const given = { fromDeg: A.surfFrom - P.MAGVAR_W, kt: A.surfKt, gust: 0.6, topFrom: A.from - P.MAGVAR_W, topKt: A.kt, topFt: A.altFt };
  const L = SC.startLesson('n2', 'basic', { wind: given });
  assert.equal(L.s.wind.fromDeg, 354); assert.equal(L.s.wind.topFrom, 24); assert.equal(L.s.wind.topKt, 10);
  assert.equal(L.windStr, '360 at 5', 'the tower says the surface wind');
  const surf = meanWind(L.s, 0), mid = meanWind(L.s, 1500 / P.FT), top = meanWind(L.s, 3000 / P.FT);
  assert.ok(near(surf.from, 354, 5) && Math.abs(surf.kt - 5) < 2, `at the ground: ${surf.from.toFixed(0)}°/${surf.kt.toFixed(1)} kt`);
  assert.ok(near(mid.from, 9, 6) && Math.abs(mid.kt - 7.5) < 2, `half way up: ${mid.from.toFixed(0)}°/${mid.kt.toFixed(1)} kt`);
  assert.ok(near(top.from, 24, 5) && Math.abs(top.kt - 10) < 2, `at 3,000 ft: ${top.from.toFixed(0)}°/${top.kt.toFixed(1)} kt`);
  // (and that is the logged wind: the log planned with A is flown, at cruise, in A — magnetic for magnetic)
  assert.equal(Math.round(FL.avionics.trueToMag(top.from, P.MAGVAR_W)) || 360, A.from);
  assert.ok(Math.abs(top.kt - A.kt) < 2);
  // (the free flight takes the same field, in its own (runway-relative) form)
  const F = SC.startFree('rwy', 'pa28', { wind: { rel: given.fromDeg - P.LAB_RWY.trueHdg, kt: given.kt, gust: 0.5, topRel: given.topFrom - P.LAB_RWY.trueHdg, topKt: given.topKt, topFt: given.topFt } });
  assert.equal(F.s.wind.topFrom, 24); assert.equal(F.s.wind.topKt, 10);
});

test('flight: scored lessons keep their own wind (nothing given, nothing changed)', () => {
  const n2 = SC.startLesson('n2', 'basic');
  assert.ok(near(n2.s.wind.fromDeg, P.LAB_RWY.trueHdg + 270, 0.01)); assert.equal(n2.s.wind.kt, 12); assert.equal(n2.s.wind.topKt, undefined);
  const t1 = SC.startLesson('t1', 'basic');
  assert.ok(near(t1.s.wind.fromDeg, P.LAB_RWY.trueHdg + 10, 0.01)); assert.equal(t1.s.wind.kt, 5); assert.equal(t1.s.wind.topKt, undefined);
  const w = meanWind(t1.s, 3000 / P.FT);                    // (no top: the log profile only, the direction its own)
  assert.ok(near(w.from, t1.s.wind.fromDeg, 4), `a lesson's wind does not veer with height: ${w.from.toFixed(0)}°`);
});
