// CADET — the first-officer phase played through end to end (S4's reachability check): a graduated
// career joins the airline, passes the type-rating written test and lessons (the FLIGHT LAB bot
// covers the flying itself: flight-lab/test/jet-lessons.test.mjs), passes the type check, then flies
// real line duties — the actual flight/line.js machines, driven on scripted observations, their
// summaries recorded with the career exactly as main.js records them — until the line check is due,
// flies it, and reaches 一人前FO (state.fo.done). No step may jam: every day must offer the next
// thing, and the milestone must arrive in a bounded number of days.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createCareer, schedule, isOff } from '../src/career/career.js';
import { createLineDuty, routeById } from '../src/flight/line.js';

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const rec = () => ({ tries: 1, best: 'A', pass: true, levels: ['basic'] });

// drive one PF duty of the given route to its debrief (correct answers, a sound touchdown)
function flyPF(duty, route) {
  let t = 0; const U = (obs) => duty.update({ t: (t += 10), ...obs });
  const D = route.distKm * 1000, FL = route.cruiseAltFt;
  duty.advance();
  const r = duty.answerDispatch(duty.dispatchCase.correctIndex);
  if (r && r.noGo) return { noGo: true, summary: duty.summary() };
  U({ onGround: true, stopped: true, altFt: 36, distDestM: D });
  U({ onGround: false, altFt: 600, ias: 165, vsFpm: 2200, distDestM: D * 0.96 });
  U({ onGround: false, altFt: 12000, ias: 250, vsFpm: 1800, distDestM: D * 0.8 });
  U({ onGround: false, altFt: FL, ias: 280, mach: 0.78, vsFpm: 0, distDestM: D * 0.6 });
  if (duty.event && !duty.st.eventAnswer) duty.answerEvent(duty.event.correctIndex);
  U({ onGround: false, altFt: FL, ias: 280, mach: 0.78, vsFpm: 0, distDestM: D * 0.55 });
  duty.compress();
  if (duty.event && !duty.st.eventAnswer) duty.answerEvent(duty.event.correctIndex);
  U({ onGround: false, altFt: 9000, ias: 250, vsFpm: -1800, distDestM: 90000 });
  U({ onGround: false, altFt: 2000, ias: 150, vsFpm: -700, distDestM: 8000 });
  U({ onGround: false, altFt: 400, ias: 138, vsFpm: -350, distDestM: 1500 });
  U({ onGround: true, stopped: false, tdAlongM: 350, tdCrossM: 3 });
  U({ onGround: true, stopped: true });
  return { noGo: false, summary: duty.summary() };
}
// drive one PM ride: every monitor task answered, then the arrival
function ridePM(duty, route) {
  let t = 0;
  duty.advance();
  const r = duty.answerDispatch(duty.dispatchCase.correctIndex);
  if (r && r.noGo) return { noGo: true, summary: duty.summary() };
  let guard = 0;
  while (duty.phase === 'ride' && guard++ < 40) {
    const task = duty.currentTask();
    if (task) duty.answer(task.id, task.correctIndex);
    if (duty.event && !duty.st.eventAnswer) duty.answerEvent(duty.event.correctIndex);
    if (duty.tasks.length >= 5 && duty.tasks.every(x => x.answered)) break;
    duty.update({ t: (t += 20), altFt: route.cruiseAltFt, ias: 270, mach: 0.78, headingDeg: 90, vsFpm: 0, distDestM: route.distKm * 500 });
  }
  duty.update({ t: (t += 20), arrived: true });
  return { noGo: false, summary: duty.summary() };
}

test('fo run: graduation → joining → type rating → line sectors → line check → 一人前FO', () => {
  const C = createCareer({ store: memStore(), seed: 5 });
  C.state.chapter = 'ch6'; C.state.day = 50; C.state.graduated = { day: 49, rank: '優秀' };
  assert.equal(C.beginFirstOfficer(), true, 'a graduate can join');
  assert.equal(C.state.chapter, 'fo1');
  C.exam('type', 92);
  const prog = { lessons: Object.fromEntries(['j1', 'j2', 'j3', 'j4'].map(id => [id, rec()])) };
  // the fo1 schedule runs its course: written → lessons → the check is offered
  const seen = [];
  for (let i = 0; i < 12 && !(C.state.checks && C.state.checks.typerate); i++) {
    const items = schedule(C.state, prog, { trust: 50 });
    for (const it of items) if (it.kind === 'checkride' || it.kind === 'exam' || it.kind === 'flight') seen.push(it.kind + ':' + (it.id || ''));
    if (items.some(it => it.kind === 'checkride')) break;
    C.state.day++;
  }
  assert.ok(seen.some(s => s.startsWith('checkride')), `the type check is offered (saw: ${seen.join(', ')})`);
  C.check('typerate', true);
  assert.equal(C.state.chapter, 'fo2', 'the type check passed: the line chapter');

  // the line: fly the roster, day by day (a night's sleep between: −50 fatigue, as the game does)
  let days = 0, legs = 0, checked = false;
  while (!C.state.fo.done && days < 60) {
    days++;
    const items = schedule(C.state, prog, { trust: 50 });
    const item = items.find(x => x.kind === 'line' || x.kind === 'linecheck');
    if (item) {
      const route = routeById(item.route);
      const duty = createLineDuty({ route: item.route, role: item.role, captain: item.captain === 'examiner' ? { id: 'examiner', strict: 0.92 } : item.captain, seed: (C.state.seed * 100003 + C.state.day * 131) >>> 0 });
      const { noGo, summary } = item.role === 'PM' ? ridePM(duty, route) : flyPF(duty, route);
      assert.equal(duty.phase, 'debrief', `day ${C.state.day}: the duty completes (${item.route} ${item.role})`);
      if (!noGo) {
        C.recordLeg({ route: item.route, role: item.role, blockMin: item.blockMin, score: summary.total, captainEval: summary.total, diverted: !!summary.diverted });
        legs++;
        if (item.kind === 'linecheck') { checked = true; C.recordLineCheck(summary.total >= 70); }
      }
    }
    C.state.day++; while (isOff(C.state.day)) C.state.day++;
    C.state.fatigue = Math.max(0, C.state.fatigue - 50);
  }
  assert.ok(checked, 'the line check was offered and flown');
  assert.equal(C.state.fo.done, true, 'the milestone: 一人前FO');
  assert.ok(C.state.fo.sectors >= 12, `sectors ${C.state.fo.sectors} ≥ 12`);
  assert.ok(C.state.fo.blockMin >= 900, `block ${C.state.fo.blockMin} ≥ 900`);
  assert.ok(legs >= 13, `legs flown: ${legs} (12+ sectors and the check)`);
});
