// CADET — the clearance state under the radio scripts (career/day.js, gap audit v2 B4.1/B4.4): the
// scripted sequences set the flags; moving without them is called out by the tower and remembered for
// the debrief (never a failed day). The ATIS is a broadcast: re-listenable, its letter advancing once
// in the day, a stale copy noted on the return call.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDay } from '../src/career/day.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL;

const C = (over = {}) => ({ dt: 0.1, sys: null, sw: null, s: null, park: false, av: null, rpm: 0, pos: { a: -6000, c: 0 }, v: 0, hdg: 354, onGround: true, ...over });

test('atc state: a departure without the takeoff clearance is called out and remembered', () => {
  const day = createDay(FL, { seed: 3 });
  day.abortTo('lineup');
  day.update(C());                                        // on the ground, detector armed
  const evs = day.update(C({ onGround: false }));         // airborne, no sequence ever completed
  assert.ok(evs.some(e => e.type === 'atc' && e.kind === 'noClearTakeoff'), 'the tower calls it out');
  assert.equal(day.summary().atcState.noClearTakeoff, 1);
  day.update(C({ onGround: false }));
  day.update(C({ onGround: true, pos: { a: 400, c: 0 } }));
  assert.equal(day.summary().atcState.noClearTakeoff, 1, 'once per departure');
});

test('atc state: an approach on a move phase without the landing clearance draws the go-around call', () => {
  const day = createDay(FL, { seed: 3 });
  day.abortTo('return');
  const evs = day.update(C({ onGround: false, pos: { a: -1500, c: 0 } }));
  assert.ok(evs.some(e => e.type === 'atc' && e.kind === 'noClearLanding' && /go around/.test(e.en)));
  assert.equal(day.summary().atcState.noClearLanding, 1);
  const again = day.update(C({ onGround: false, pos: { a: -1200, c: 0 } }));
  assert.ok(!again.some(e => e.kind === 'noClearLanding'), 'once per approach');
});

test('atis: re-listen copies the current letter; the letter advances on the return and staleness is noted', () => {
  const day = createDay(FL, { seed: 3, weather: { info: 'Alpha' } });
  const l1 = day.listenAtis();
  assert.equal(l1.letter, 'Alpha'); assert.match(l1.en, /information Alpha/);
  day.abortTo('back');                                    // entering the return: a new information is out
  const evs = day.update(C());
  assert.ok(evs.some(e => e.type === 'atc' && e.kind === 'staleAtis'), 'the tower notes the stale copy');
  const st = day.summary().atcState;
  assert.equal(st.current, 'Bravo'); assert.equal(st.copied, 'Alpha'); assert.equal(st.staleAtis, true);
  const l2 = day.listenAtis();                            // copying afresh
  assert.equal(l2.letter, 'Bravo'); assert.match(l2.en, /information Bravo/);
  assert.equal(day.summary().atcState.copied, 'Bravo');
});

test('traffic notes reach the summary (near miss by call sign, go-arounds counted)', () => {
  const day = createDay(FL, { seed: 3 });
  day.noteTraffic('nearMiss', 'Archer 1SY'); day.noteTraffic('nearMiss', 'Archer 1SY'); day.noteTraffic('trafficGoAround');
  const st = day.summary().atcState;
  assert.deepEqual(st.nearMiss, ['Archer 1SY']); assert.equal(st.trafficGA, 1);
});
