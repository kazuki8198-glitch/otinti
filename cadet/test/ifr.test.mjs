// CADET — next-wave item 3: IFR in practice — the hold (entry / wind / timing), the RNAV approach
// (PROC data, LPV minima, the missed approach), the real-IMC lesson, the LABEF diversion and its CTAF.
//  - the hold's arithmetic is flight/hold.js's: entry sectors by AIM 5-3-8, the outbound correction
//    tripled, the outbound time from the ground-speed ratio (measured values asserted, not ranges);
//  - FLIGHT LAB's bot flies i4 (hold, with its new entry and wind steps), i6 (RNAV, landing at DA)
//    and i7 (real IMC: the missed approach at DA) to a pass at the basic level;
//  - the CTAF set names the field that exists (LABEF, runway 09, 122.9 — no "Minami Field RWY 27"
//    anywhere) and is exercised end to end through dialog/atc.js, both on its own and inside a day
//    built on the LABEF cross-country variant (career/day.js);
//  - the divert flow (flight/divert.js, a CADET-side lesson type) is driven by a scripted pilot:
//    forecast-bust day → the decision → LABEF → the CTAF announcements → a scored landing on the
//    grass → the return to LAB. Continuing into the front fails it.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HOLD_LBV, entryForHold, onHoldingSide, windCorrection } from '../src/flight/hold.js';
import { createDivert, stripFrame, onStrip, XC_LABEF } from '../src/flight/divert.js';
import { STRIP_LABEF } from '../src/flight/airfields.js';
import { ctafRadio, CTAF, CTAF_AREA } from '../src/content/dialog/atc.js';
import { createAtc } from '../src/dialog/atc.js';
import { createDay, planFor, stepsFor } from '../src/career/day.js';
import { newCareer, schedule, weatherFor } from '../src/career/career.js';
import { runLesson } from './helpers/bot.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, A = FL.avionics, P = FL.physics;
const runAtc = (atc, sec) => { const ev = []; for (let t = 0; t < sec; t += 0.1) ev.push(...atc.update(0.1)); return ev; };
// answer a whole CTAF sequence right, first time (the test pilot of the radio)
function flyCtaf(atc) {
  atc.start('ctaf');
  for (let guard = 0; guard < 400 && atc.busy; guard++) {
    runAtc(atc, 0.5);
    const v = atc.view();
    if (v && v.phase === 'choose') assert.ok(atc.answer(atc.rightIndex()));
  }
  assert.ok(!atc.busy, 'the CTAF sequence ended');
  return atc.summary();
}

test('ifr hold: the entry sectors — direct within ±70°, teardrop from the holding side, parallel from the other', () => {
  const H = HOLD_LBV;
  assert.deepEqual([H.fix, H.inboundCourse, H.turns, H.altitudeFt, H.legSec], ['LBV', 90, 'right', 3000, 60]);
  assert.equal(entryForHold(H, { courseToFix: 90, holdingSide: false }), 'direct');
  assert.equal(entryForHold(H, { courseToFix: 20, holdingSide: false }), 'direct', 'the −70° boundary');
  assert.equal(entryForHold(H, { courseToFix: 160, holdingSide: true }), 'direct', 'the +70° boundary');
  assert.equal(entryForHold(H, { courseToFix: 270, holdingSide: true }), 'teardrop');
  assert.equal(entryForHold(H, { courseToFix: 200, holdingSide: true }), 'teardrop');
  assert.equal(entryForHold(H, { courseToFix: 270, holdingSide: false }), 'parallel');
  assert.equal(entryForHold(H, { courseToFix: 340, holdingSide: false }), 'parallel');
  // the holding side of an eastbound right-hand hold is the south side of the course
  assert.equal(onHoldingSide(H, -1000, 0), true, 'south of the fix: holding side');
  assert.equal(onHoldingSide(H, 1000, 0), false, 'north of the fix: non-holding side');
});

test('ifr hold: the wind correction and the timing — measured values', () => {
  // the i4 lesson's own wind (010° at 5 kt, TAS 100 kt): a −2.8° inbound correction, tripled outbound
  const w = windCorrection(HOLD_LBV, { windFrom: 10, windKt: 5, tasKt: 100 });
  assert.equal(w.wcaInDeg, -2.8); assert.equal(w.inboundHdg, 87); assert.equal(w.outboundHdg, 278);
  assert.equal(w.gsInKt, 99); assert.equal(w.gsOutKt, 100.7); assert.equal(w.outboundSec, 59);
  // a pure tailwind inbound (270° at 15): no correction angle, but the outbound leg runs long so the
  // inbound leg still takes its minute — 81 s, not 60
  const t = windCorrection(HOLD_LBV, { windFrom: 270, windKt: 15, tasKt: 100 });
  assert.equal(t.wcaInDeg, 0); assert.equal(t.gsInKt, 115); assert.equal(t.gsOutKt, 85); assert.equal(t.outboundSec, 81);
  // calm: the textbook minute, straight courses
  const c = windCorrection(HOLD_LBV, { windFrom: 0, windKt: 0, tasKt: 100 });
  assert.equal(c.outboundSec, 60); assert.equal(c.inboundHdg, 90); assert.equal(c.outboundHdg, 270);
});

test('ifr lessons: the bot flies the hold (i4), the RNAV (i6) and the real-IMC missed approach (i7)', { timeout: 900000 }, () => {
  for (const id of ['i4', 'i6', 'i7']) {
    const L = runLesson(FL, id, 'basic', 1500);
    assert.ok(L.done && L.passed, `${id} passed: ${L.grade} ${L.reason || ''} ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  }
  // i6 really is the RNAV: the procedure is loaded, on GPS, from the lesson's own start
  const L6 = FL.school.startLesson('i6', 'basic');
  assert.equal(L6.av.proc.type, 'RNAV'); assert.equal(L6.av.cdi, 'GPS'); assert.equal(L6.av.direct, 'LABRW');
});

test('ifr RNAV: the PROC data — FAF 5.0 NM / 2,000 ft, LPV DA 305 ft, LNAV MDA 505 ft, the missed to LAB-D at 3,000', () => {
  const P36 = A.procedureById('RNAV36');
  assert.deepEqual([P36.fafDistNm, P36.fafAltFt, P36.daFt, P36.mdaFt, P36.missed.to, P36.missed.altFt], [5.0, 2000, 305, 505, 'LABED', 3000]);
  const av = A.createAvionics();
  const msg = A.control(av, 'PROC_RNAV');
  assert.match(msg, /RNAV \(GPS\) RWY 36/); assert.equal(av.proc.daFt, 305); assert.equal(av.proc.mdaFt, 505);
  // on the final, on the 3° path: approach CDI scale (0.3 NM) and centred LPV vertical guidance
  const R = P.LAB_RWY, [pn, pe] = P.rwyToNE(R, -4000, 0);
  const o = { altTrue: R.elevFt + (300 + 4000) * Math.tan(3 * Math.PI / 180) * 3.28084, gs: 70, trk: R.trueHdg, hdgTrue: R.trueHdg };
  const n = A.navSolve(av, { n: pn, e: pe }, o, P.MAGVAR_W, R);
  assert.equal(n.cdiScale, 0.3); assert.ok(n.gsDots != null && Math.abs(n.gsDots) < 0.1, `LPV path centred: ${n.gsDots}`);
  // the missed approach sequences like the ILS's: direct LAB-D, 3,000 ft selected; a third press unloads
  A.control(av, 'PROC_RNAV');
  assert.equal(av.proc.missed, true); assert.equal(av.direct, 'LABED'); assert.ok(av.altSel >= 3000);
  A.control(av, 'PROC_RNAV'); assert.equal(av.proc, null);
  // and the ILS's own PROC cycle is untouched
  const av2 = A.createAvionics(); A.control(av2, 'PROC'); assert.equal(av2.proc.name, 'ILS 36'); assert.equal(av2.cdi, 'NAV1');
});

test('ifr CTAF: the set names LABEF runway 09 on 122.9 — and is exercised end to end', () => {
  assert.equal(CTAF.freq, '122.9'); assert.equal(CTAF.field, 'LABEF'); assert.equal(CTAF.rwy, '09'); assert.equal(CTAF_AREA, 'LABEF');
  const radio = ctafRadio(), text = JSON.stringify(radio);
  assert.ok(!/Minami|two seven|runway 27/.test(text), 'the fictional Minami Field RWY 27 is gone');
  assert.match(text, /runway zero niner/);
  for (const [id, x] of Object.entries(radio.exchanges)) {
    assert.equal(x.choices.filter(c => c.ok).length, 1, id);
    assert.equal(x.freq, '122.9', id);
    for (const c of x.choices) if (!c.ok) assert.ok(c.why && c.why.length > 8, `${id}: a reason`);
  }
  const sum = flyCtaf(createAtc(radio));
  assert.equal(sum.n, 5); assert.equal(sum.first, 5); assert.equal(sum.wrong, 0);
});

test('ifr divert: a forecast-bust day — decide, LABEF, the CTAF, a scored landing on the grass, and home', () => {
  const d = createDivert({ weatherKind: 'forecastBust' });
  assert.equal(d.phase, 'enroute');
  d.update(31, { n: -6000, e: -36000, altFt: 2500, onGround: false });
  assert.equal(d.phase, 'decide');
  assert.ok(d.decide('divert'));
  // navigate to within 1 NM of the strip, then the announcements, made for real
  d.update(0.1, { n: STRIP_LABEF.n + 500, e: STRIP_LABEF.e - 1200, altFt: 1200, onGround: false });
  assert.equal(d.phase, 'ctaf');
  flyCtaf(d.atc);
  for (let i = 0; i < 50 && !d.ctafDone; i++) d.update(0.2, { n: STRIP_LABEF.n, e: STRIP_LABEF.e - 1500, altFt: 900, onGround: false });
  assert.equal(d.phase, 'final');
  // touch down on the grass, 100 m past the centre, 3 m off the centre line
  const tdPos = { n: STRIP_LABEF.n - 3, e: STRIP_LABEF.e + 100 };
  assert.ok(onStrip(tdPos));
  d.update(0.1, { ...tdPos, altFt: STRIP_LABEF.elevFt, onGround: true });
  assert.equal(d.phase, 'landed');
  d.update(0.1, { ...tdPos, altFt: 900, onGround: false });
  assert.equal(d.phase, 'return');
  d.update(0.1, { n: 100, e: -39800, altFt: 55, onGround: true });
  const sum = d.summary();
  assert.equal(sum.done, true); assert.equal(sum.passed, true, JSON.stringify(sum.rows));
  assert.ok(sum.rows.every(r => r.pass));
  // the strip frame itself: the centre, the ends, off the side
  assert.deepEqual(stripFrame({ n: STRIP_LABEF.n, e: STRIP_LABEF.e }), { along: 0, cross: 0 });
  assert.equal(onStrip({ n: STRIP_LABEF.n, e: STRIP_LABEF.e + STRIP_LABEF.len / 2 + 100 }), false, 'past the far end is not the strip');
  // pressing on into the front fails the flow at the decision
  const bad = createDivert({ weatherKind: 'forecastBust' });
  bad.update(31, {}); assert.ok(bad.decide('continue'));
  assert.equal(bad.phase, 'failed'); assert.equal(bad.summary().passed, false);
  // and a day that is not a forecast bust has no divert to fly
  assert.equal(createDivert({ weatherKind: 'good' }).phase, 'refused');
  assert.deepEqual([XC_LABEF.lessons.join(' '), XC_LABEF.rwy, XC_LABEF.freq], ['t1 n2 t3', '09', '122.9']);
});

test('ifr day wiring: the LABEF variant plans t1 → n2 → t3 with a CTAF step the day itself can play', () => {
  const plan = planFor(FL, null, { xcVariant: 'labef' });
  assert.deepEqual(plan.lessons, ['t1', 'n2', 't3']); assert.equal(plan.ctaf, true); assert.equal(plan.divertTo, 'LABEF');
  const steps = stepsFor(FL, plan.lessons, { ctaf: true });
  assert.ok(steps.includes('ctaf'), steps.join(' '));
  assert.ok(steps.indexOf('n2') < steps.indexOf('ctaf') && steps.indexOf('ctaf') < steps.indexOf('t3'), 'the announcements sit between the diversion and the return landing');
  const day = createDay(FL, { seed: 5, plan });
  const sum = flyCtaf(day.atc);
  assert.equal(sum.n, 5, 'the day runner exercises the CTAF sequence');
  assert.equal(day.summary().plan.ctaf, true);
  assert.equal(day.summary().plan.divertTo, 'LABEF');
});

test('ifr career wiring: a forecast-bust flight day in the late chapters carries the LABEF divert', () => {
  const st = newCareer(3); st.chapter = 'ch5';
  const W = weatherFor(st.seed, st.day, { force: 'forecastBust' });
  const sch = schedule(st, { lessons: {} }, { weather: W });
  const flight = sch.find(x => x.kind === 'flight');
  assert.ok(flight, sch.map(x => `${x.kind}:${x.id}`).join(' '));
  assert.deepEqual(flight.divert, { to: 'LABEF', rwy: '09', freq: '122.9', ctaf: true });
  const calm = schedule(st, { lessons: {} }, { weather: weatherFor(st.seed, st.day, { force: 'good' }) });
  assert.equal(calm.find(x => x.kind === 'flight').divert, undefined, 'an ordinary day carries no divert');
});
