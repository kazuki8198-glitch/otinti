// CADET — the first-officer line-operations machine (flight/line.js + the line airfields in
// flight/airfields.js, design S3): a PF duty driven end to end on scripted observations, a PM ride,
// the dispatch decision's effect on the score, a weather diversion to the alternate, determinism,
// and the airfield/route data against the design memo's tables. Pure logic: node --test only.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createLineDuty, ROUTES, DISPATCH_CASES, PM_TASK_TEMPLATES, PM_TASKS_PER_RIDE, CAPTAINS, gradeOf,
} from '../src/flight/line.js';
import { LINE_AIRFIELDS, lineAirfieldById, airfields, airfieldById, stripFrameFor } from '../src/flight/airfields.js';

// find a seed whose duty (on the first route) matches a predicate — the deck and the event are
// seed-drawn, so the tests pick their seeds by the machine's own published data, not by luck
function findSeed(pred, route = 'HND-KMQ') {
  for (let seed = 1; seed <= 600; seed++) {
    const d = createLineDuty({ route, seed });
    if (pred(d)) return seed;
  }
  throw new Error('no seed matched');
}
const wrongIndex = (c) => (c.correctIndex + 1) % c.choices.length;

// drive a PF duty from brief to debrief on a scripted observation sequence (HND-KMQ, via cruise
// compression). Answers the dispatch case and any in-flight event correctly unless told otherwise.
function flyPF({ seed, captain = null, dispatchAnswer = 'correct', onEvent = null, touchdownPos = 'direct' } = {}) {
  const duty = createLineDuty({ route: 'HND-KMQ', role: 'PF', captain, seed });
  let t = 0;
  const U = (obs) => duty.update({ t: (t += 10), ...obs });
  duty.advance();                                   // brief → dispatch
  const dc = duty.dispatchCase;
  const r = duty.answerDispatch(dispatchAnswer === 'correct' ? dc.correctIndex : wrongIndex(dc));
  if (r && r.noGo) return { duty, summary: duty.summary(), plan: null };
  U({ onGround: true, stopped: true, altFt: 36, distDestM: 290000 });
  U({ onGround: false, altFt: 600, ias: 165, vsFpm: 2200, distDestM: 280000 });
  U({ onGround: false, altFt: 12000, ias: 250, vsFpm: 1800, distDestM: 240000 });
  U({ onGround: false, altFt: 24000, ias: 280, mach: 0.74, vsFpm: 0, distDestM: 200000 });   // → cruise
  if (duty.event && !duty.st.eventAnswer) duty.answerEvent(duty.event.correctIndex);          // turbulence, if any
  U({ onGround: false, altFt: 24000, ias: 280, mach: 0.74, vsFpm: 0, distDestM: 190000 });
  const plan = duty.compress();                                                              // → descent (TOD)
  if (duty.event && !duty.st.eventAnswer) {                                                  // weather / hold, if any
    if (onEvent) onEvent(duty); else duty.answerEvent(duty.event.correctIndex);
  }
  U({ onGround: false, altFt: 9000, ias: 250, vsFpm: -1800, distDestM: 90000 });              // → approach
  U({ onGround: false, altFt: 2000, ias: 150, vsFpm: -750, distDestM: 8000 });
  U({ onGround: false, altFt: 400, ias: 138, vsFpm: -650, distDestM: 1500 });
  let tdObs = { onGround: true, stopped: false };
  if (touchdownPos === 'frame') {
    const f = duty.destination, h = f.trueHdg * Math.PI / 180, ac = 350 - f.len / 2, C = 4;
    tdObs = { ...tdObs, n: f.n + ac * Math.cos(h) - C * Math.sin(h), e: f.e + ac * Math.sin(h) + C * Math.cos(h) };
  } else tdObs = { ...tdObs, tdAlongM: 350, tdCrossM: 3 };
  U(tdObs);                                                                                  // → landed
  U({ onGround: true, stopped: true });                                                      // → debrief
  return { duty, summary: duty.summary(), plan };
}

// drive a PM ride: answer every monitor task (and any event) correctly, then arrive
function runPM({ seed, captain = null } = {}) {
  const duty = createLineDuty({ route: 'HND-KMQ', role: 'PM', captain, seed });
  let t = 0;
  duty.advance();
  duty.answerDispatch(duty.dispatchCase.correctIndex);                                       // → ride
  let guard = 0;
  while (duty.phase === 'ride' && guard++ < 40) {
    const task = duty.currentTask();
    if (task) duty.answer(task.id, task.correctIndex);
    if (duty.event && !duty.st.eventAnswer) duty.answerEvent(duty.event.correctIndex);
    if (duty.tasks.length >= PM_TASKS_PER_RIDE && duty.tasks.every(x => x.answered)) break;
    duty.update({ t: (t += 20), altFt: 24000, ias: 270, mach: 0.74, headingDeg: 90, vsFpm: 0, distDestM: 150000 });
  }
  duty.update({ t: (t += 20), arrived: true });                                              // → debrief
  return { duty, summary: duty.summary() };
}

test('line (a): a PF duty driven end to end reaches debrief with a scored summary', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo && (!d.scheduledEvent || d.scheduledEvent.kind !== 'weather' || d.scheduledEvent.correctIndex === 1));
  const { duty, summary } = flyPF({ seed });
  assert.equal(duty.phase, 'debrief');
  assert.equal(summary.done, true);
  assert.equal(summary.role, 'PF');
  assert.equal(summary.route, 'HND-KMQ');
  assert.equal(typeof summary.landingScore, 'number');
  assert.ok(summary.landingScore >= 0 && summary.landingScore <= 100);
  assert.equal(summary.decisionScore, 100, 'dispatch and event both answered correctly');
  assert.equal(summary.diverted, false);
  assert.equal(summary.touchdown.at, 'KMQ');
  assert.equal(summary.touchdown.sinkFpm, 650, 'the sink of the last airborne sample');
  assert.ok(['S', 'A', 'B', 'C'].includes(summary.grade));
  assert.ok(summary.rows.length >= 2, 'debrief rows are produced');
});

test('line (b): a PM duty driven through the ride reaches debrief, tasks scored', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo);
  const { duty, summary } = runPM({ seed });
  assert.equal(duty.phase, 'debrief');
  assert.equal(summary.done, true);
  assert.equal(summary.role, 'PM');
  assert.equal(summary.tasksTotal, PM_TASKS_PER_RIDE);
  assert.equal(summary.tasksCorrect, PM_TASKS_PER_RIDE, 'every generated task was answered correctly');
  assert.equal(summary.taskScore, 100);
  assert.equal(summary.decisionScore, 100);
  assert.equal(summary.total, 100);
  assert.equal(summary.grade, 'S');
  const templates = new Set(duty.tasks.map(x => x.templateId));
  assert.ok(templates.size >= 4, `tasks came from several templates (${[...templates].join(', ')})`);
});

test('line (c): the dispatch answer moves the decision score', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo && !!d.scheduledEvent);
  const good = flyPF({ seed, dispatchAnswer: 'correct' }).summary;
  const bad = flyPF({ seed, dispatchAnswer: 'wrong' }).summary;
  assert.equal(good.decisionScore, 100);
  assert.equal(bad.decisionScore, 40, 'dispatch (weight 3) wrong, event (weight 2) right: 2/5');
  assert.ok(good.total > bad.total);
  assert.equal(bad.landingScore, good.landingScore, 'the flying itself was identical — only the decision differed');
});

test('line (d): the weather event — diverting switches the destination to the alternate and lands there', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo && d.scheduledEvent && d.scheduledEvent.kind === 'weather' && d.scheduledEvent.correctIndex === 0);
  let destAtEvent = null;
  const { duty, summary } = flyPF({
    seed, touchdownPos: 'frame',
    onEvent: (d) => { const r = d.answerEvent(0); destAtEvent = r.destination; },
  });
  assert.equal(destAtEvent, 'HND', 'KMQ\'s alternate is HND');
  assert.equal(duty.diverted, true);
  assert.equal(duty.destination.id, 'HND');
  assert.equal(summary.diverted, true);
  assert.equal(summary.destination, 'HND');
  assert.equal(summary.touchdown.at, 'HND', 'the landing was judged at the alternate');
  assert.equal(summary.touchdown.alongM, 350, 'the touchdown position came out of the alternate\'s runway frame');
  assert.equal(summary.phase, 'debrief');
});

test('line (e): determinism — the same seed, observations and answers give the same summary', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo && !!d.scheduledEvent);
  const a = flyPF({ seed }).summary, b = flyPF({ seed }).summary;
  assert.deepEqual(a, b);
  const pmSeed = findSeed(d => d.dispatchCase.correctGo);
  assert.deepEqual(runPM({ seed: pmSeed }).summary, runPM({ seed: pmSeed }).summary);
  const other = createLineDuty({ route: 'HND-KMQ', seed: seed + 1 });
  assert.ok(other.dispatchCase && other.phase === 'brief');
});

test('line (f): the line airfields — five fields, the design memo\'s lengths and headings', () => {
  assert.equal(LINE_AIRFIELDS.length, 5);
  const want = {
    HND: { n: -120000, e: 60000, trueHdg: 340, len: 3000, elevFt: 21 },
    KMQ: { n: -60000, e: -120000, trueHdg: 60, len: 2500, elevFt: 36 },
    CTS: { n: 150000, e: 20000, trueHdg: 10, len: 3000, elevFt: 70 },
    FUK: { n: -30000, e: -160000, trueHdg: 160, len: 2800, elevFt: 30 },
    OKA: { n: -190000, e: -190000, trueHdg: 180, len: 3000, elevFt: 12 },
  };
  for (const [id, w] of Object.entries(want)) {
    const f = lineAirfieldById(id);
    assert.ok(f, id);
    for (const [k, v] of Object.entries(w)) assert.equal(f[k], v, `${id}.${k}`);
    assert.equal(airfieldById(null, id).id, id, 'reachable through airfieldById too');
    assert.equal(airfieldById(id).id, id, 'and through the one-argument form');
  }
  // the training world's own list is untouched
  const P = { LAB_RWY: { n: 0, e: -40000, trueHdg: 354, len: 1200, wid: 30, elevFt: 55 } };
  assert.deepEqual(airfields(P).map(a => a.id), ['LABRW', 'LABEF']);
  assert.equal(airfieldById(P, 'LABRW').surface, 'paved');
  // the runway frame: the centre is (0,0), a point 1 km down the landing direction is along ≈ 1000
  const hnd = lineAirfieldById('HND'), h = hnd.trueHdg * Math.PI / 180;
  const c = stripFrameFor(hnd, { n: hnd.n, e: hnd.e });
  assert.equal(Math.round(c.along), 0); assert.equal(Math.round(c.cross), 0);
  const p = stripFrameFor(hnd, { n: hnd.n + Math.cos(h) * 1000, e: hnd.e + Math.sin(h) * 1000 });
  assert.ok(Math.abs(p.along - 1000) < 0.01 && Math.abs(p.cross) < 0.01, `frame: ${JSON.stringify(p)}`);
});

test('line: the route table is the design memo\'s, with one alternate each', () => {
  const want = {
    'HND-KMQ': { distKm: 290, blockMin: 65, cruiseFL: 240, alternate: 'HND' },
    'HND-CTS': { distKm: 820, blockMin: 95, cruiseFL: 370, alternate: 'HND' },
    'HND-FUK': { distKm: 880, blockMin: 115, cruiseFL: 380, alternate: 'KMQ' },
    'HND-OKA': { distKm: 1550, blockMin: 155, cruiseFL: 390, alternate: 'FUK' },
  };
  assert.equal(ROUTES.length, 4);
  for (const r of ROUTES) {
    const w = want[r.id]; assert.ok(w, r.id);
    for (const [k, v] of Object.entries(w)) assert.equal(r[k], v, `${r.id}.${k}`);
    assert.ok(lineAirfieldById(r.alternate), `${r.id}'s alternate exists`);
  }
  assert.ok(DISPATCH_CASES.length >= 6, `dispatch deck: ${DISPATCH_CASES.length} cases`);
  assert.ok(PM_TASK_TEMPLATES.length >= 8, `PM templates: ${PM_TASK_TEMPLATES.length}`);
  for (const c of DISPATCH_CASES) { assert.equal(c.choices.length, 3, c.id); assert.ok(c.reason, c.id); }
});

test('line: cruise compression reports the jump instead of doing it', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo);
  const { duty, plan } = flyPF({ seed });
  assert.ok(plan && plan.compressRequested, 'compress() in cruise returned a plan');
  assert.ok(plan.toDistDestM < plan.fromDistM);
  assert.equal(plan.toDistDestM, Math.round((24000 - 3000) / 1000 * 3 * 1852), 'the TOD distance for FL240');
  assert.ok(plan.fuelUsedKg > 0 && plan.elapsedMin > 0, 'the skipped cruise is charged fuel and time');
  assert.equal(duty.compressRequested, true);
  assert.equal(duty.st.compression, plan);
  assert.equal(duty.compress().compressRequested, false, 'no second compression after the descent');
});

test('line: a correct no-go ends the duty at the briefing table', () => {
  const seed = findSeed(d => !d.dispatchCase.correctGo);
  const duty = createLineDuty({ route: 'HND-KMQ', role: 'PF', seed });
  duty.advance();
  const r = duty.answerDispatch(duty.dispatchCase.correctIndex);
  assert.equal(r.noGo, true);
  assert.equal(duty.phase, 'debrief');
  const s = duty.summary();
  assert.equal(s.noGo, true);
  assert.equal(s.landingScore, null, 'nothing was flown, so nothing was landed');
  assert.equal(s.decisionScore, 100, 'the decision alone carries the score');
  // and the same case answered wrongly departs anyway, with the mistake recorded
  const duty2 = createLineDuty({ route: 'HND-KMQ', role: 'PF', seed });
  duty2.advance();
  duty2.answerDispatch(wrongIndex(duty2.dispatchCase));
  assert.equal(duty2.phase, 'depart');
  assert.equal(duty2.summary().decisionScore, 0);
});

test('line: the captain\'s coefficient moves the total, capped at 100', () => {
  const seed = findSeed(d => d.dispatchCase.correctGo && (!d.scheduledEvent || d.scheduledEvent.kind !== 'weather' || d.scheduledEvent.correctIndex === 1));
  const standard = flyPF({ seed, captain: CAPTAINS[1] }).summary;   // strict 1.0
  const strict = flyPF({ seed, captain: CAPTAINS[0] }).summary;     // strict 0.95
  assert.equal(standard.captain.strict, 1.0);
  assert.equal(strict.captain.strict, 0.95);
  assert.ok(strict.total < standard.total, `${strict.total} < ${standard.total}`);
  assert.ok(standard.total <= 100);
  assert.equal(gradeOf(95), 'S'); assert.equal(gradeOf(84), 'A'); assert.equal(gradeOf(70), 'B'); assert.equal(gradeOf(10), 'C');
});
