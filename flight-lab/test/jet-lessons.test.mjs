// FLIGHT LAB — jet-lessons.test.mjs (first-officer S1, stream B)
// The type-transition stage s7 (j1–j5 on the b737), the jet checklists, the guide's N1 power text, and the
// type-rating written banks (q_jet / q_jperf / q_jsys).
// Run directly (package.json is owned by another stream):
//   node --test test/jet-lessons.test.mjs
// The flight-completion test (c) needs the b737 physics (stream A): while AIRCRAFT has no b737 it SKIPS
// itself and says so; once the physics is present it must pass — completion + no crash is the minimum line
// (the scripted bot of test/bot.mjs is a piston pilot: it is not expected to PASS a jet lesson, only to
// prove the lesson can be flown through end to end).
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';
import { makeBot } from './bot.mjs';

const FL = load(...CORE, 'quiz.js');
const P = FL.physics, SC = FL.school, SY = FL.syllabus, QZ = FL.quiz;
const JET = P.AIRCRAFT.find(a => a.id === 'b737');
const hasJet = !!(JET && JET.jet);

// ---------------------------------------------------------------- (a) structure
test('s7 stage and j1–j5 exist, are all on the b737, and every lesson starts', () => {
  const s7 = SY.STAGES[SY.STAGES.length - 1];
  assert.equal(s7.id, 's7');
  assert.deepEqual(s7.lessons.map(l => l.id), ['j1', 'j2', 'j3', 'j4', 'j5']);
  for (const def of s7.lessons) {
    assert.equal(def.aircraft, 'b737', def.id);
    assert.ok(def.title && def.goal && def.why && def.brief.length && def.std, `${def.id} carries its teaching texts`);
    assert.ok(def.steps.length >= 5, `${def.id} steps`);
    for (const S of def.steps) if (S.checklist) assert.ok(SC.CHECKLISTS[S.checklist], `${def.id} checklist ${S.checklist} exists`);
    const L = SC.startLesson(def.id, 'intro');            // (starts even before the physics lands: newState falls back)
    assert.equal(L.step, 0, `${def.id} opens on its first step`);
    assert.equal(L.def.steps[L.step].name.length > 0, true);
  }
  // the design's end states: j1 ends in the air, j4 / j5 end stopped on the ground
  assert.equal(s7.lessons[0].setup.at, 'runway');
  assert.equal(s7.lessons[3].setup.at, 'final');
  assert.equal(s7.lessons[2].steps.some(S => S.fail === 'engR'), true, 'j3 fails the right engine mid-lesson');
  assert.ok(s7.lessons[4].steps.length >= 12 && s7.lessons[4].steps.length <= 16, 'j5 is a 12–16 step checkride profile');
});

test('jet checklists exist and their judged items read the physics state', () => {
  for (const id of ['before_takeoff_jet', 'before_landing_jet']) {
    const C = SC.CHECKLISTS[id];
    assert.ok(C && C.items.length >= 6, id);
    const text = C.items.map(it => it[0]).join(' ');
    assert.doesNotMatch(text, /マグネト|ミクスチャ|プロペラ/, `${id} has no piston items`);
  }
  assert.match(SC.CHECKLISTS.before_takeoff_jet.items.map(it => it[0]).join(' '), /燃料ポンプ|フラップ|スタブトリム|速度バグ/);
  assert.match(SC.CHECKLISTS.before_landing_jet.items.map(it => it[0]).join(' '), /スポイラー|オートブレーキ/);
});

// ---------------------------------------------------------------- (b) the written banks
test('q_jet / q_jperf / q_jsys: three separate banks of 10 well-formed questions each', () => {
  const ids = QZ.BANKS.map(b => b.id);
  assert.equal(new Set(ids).size, ids.length, 'no bank id is duplicated (CADET finds banks by id)');
  assert.ok(ids.includes('q_perf') && ids.includes('q_sys'), 'the older general-aviation banks are untouched');
  for (const id of ['q_jet', 'q_jperf', 'q_jsys']) {
    const b = QZ.BANKS.find(x => x.id === id);
    assert.ok(b, id);
    assert.equal(b.qs.length, 10, `${id} has exactly 10 questions`);
    for (const q of b.qs) {
      assert.equal(q[1].length, 4, q[0]);
      assert.equal(new Set(q[1]).size, 4, q[0]);
      assert.ok(Number.isInteger(q[2]) && q[2] >= 0 && q[2] < q[1].length, q[0]);
      assert.ok(q[3] && q[3].length > 10, `${q[0]} — a reason is given`);
    }
  }
});

// ---------------------------------------------------------------- (c) flown through with the scripted pilot
// bot.mjs's generic checklist hand is piston-shaped (a takeoff checklist puts the flaps UP); the jet's
// before-takeoff list verifies the takeoff flap instead, so the checklist steps get a jet-aware hand here —
// the rest of the flying is bot.mjs's own pilot, in runLesson's loop shape.
function runJetLesson(id, maxSec = 1200, hook) {
  const bot = makeBot(FL), dt = 1 / 120;
  const L = SC.startLesson(id, 'intro');
  for (let i = 0; i < maxSec * 120 && !L.done; i++) {
    const S = L.def.steps[L.step];
    if (S && S.checklist && L.check) {
      const s = L.s;
      if (S.checklist === 'before_takeoff_jet') { s.flapIdx = s.A.v.toFlaps || 1; s.trim = 0; s.thr = 0; s.fuelSel = s.fuel[1] > s.fuel[0] ? 'R' : 'L'; }
      if (S.checklist === 'before_landing_jet') { if (!s.gearDown) s.gearDown = true; s.flapIdx = Math.max(s.flapIdx, 1); }
      SC.checklistNext(L);
    } else bot.fly(L, dt);
    if (hook) hook(L, i * dt);
    P.step(L.s, dt);
    SC.update(L, dt);
  }
  return L;
}

test('j1 and j4 fly end to end with the scripted pilot (no crash)', { skip: !hasJet && 'b737 physics not present yet (stream A) — structure tests only; re-check at integration' }, (t) => {
  let n1Guide = '';
  const j1 = runJetLesson('j1', 1200, (L) => { if (L.step === 3 && !n1Guide) n1Guide = L.guideText || ''; });
  t.diagnostic(`j1: done=${j1.done} passed=${j1.passed} grade=${j1.grade || '―'}`);
  assert.equal(j1.done, true, 'j1 completes');
  assert.equal(j1.s.crashed, false, 'j1 does not crash');
  assert.equal(j1.last.onGround, false, 'j1 ends in the air (END_OF air)');
  assert.match(n1Guide, /N1 約 \d+%/, 'the guide quotes power as N1% for the jet (pwrTxt jet branch)');

  const j4 = runJetLesson('j4');
  t.diagnostic(`j4: done=${j4.done} passed=${j4.passed} grade=${j4.grade || '―'}`);
  assert.equal(j4.done, true, 'j4 completes (go-around, re-approach, landing)');
  assert.equal(j4.s.crashed, false, 'j4 does not crash');
  assert.equal(j4.last.onGround, true, 'j4 ends on the ground');
  assert.ok(j4.last.gsK < 3, 'j4 ends stopped (END_OF stopped)');
});
