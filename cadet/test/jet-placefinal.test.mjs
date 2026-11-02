// CADET — jet placeFinal regression (node --test): in the built game the FL modules load BEFORE
// main.js installs Sorajima, so syllabus.js's load-time capture of FL.physics is the lab's own
// physics. Its placeInAir/derive read state fields (elec, hobbs) that Sorajima states do not
// carry, and the two syllabus placement helpers (placeFinal for j4's re-approach, toFinal /
// placeFinal for j5's approach) called them on Sorajima states — every j4/j5 attempt threw
// TypeError mid-lesson and the FO phase dead-ended at fo1 (full-play audit, domain B, defect
// B-1). The helpers now place through the current FL.physics, as school.js does. This test
// flies j4 and j5 in the game context (Sorajima installed, CADET's flight bridge) and holds
// that both lessons run to completion.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '..', '..', 'flight-lab', 'src', m), 'utf8'), { filename: m });
const FL = globalThis.FL, SC = FL.school;
const { installSorajima } = await import('../src/flight/sorajima.js');
installSorajima(FL);
const { createFlight } = await import('../src/flight/flight.js');
const { makeBot } = await import('./helpers/bot.mjs');
const bot = makeBot(FL);

function flyLesson(id, bad, maxSec = 1800) {
  const fl = createFlight(FL, { store: null });
  fl.startLesson(id, 'basic', { sens: 'low' });
  return fl.runScripted((L, dt) => {
    const S = L.def.steps[L.step];
    if (S && S.checklist && L.check) {
      const s = L.s;
      if (S.checklist === 'before_takeoff_jet') { s.flapIdx = s.A.v.toFlaps || 1; s.trim = 0; s.thr = 0; s.fuelSel = s.fuel[1] > s.fuel[0] ? 'R' : 'L'; }
      if (S.checklist === 'before_landing_jet') { if (!s.gearDown) s.gearDown = true; s.flapIdx = Math.max(s.flapIdx, 1); }
      SC.checklistNext(L); return;
    }
    if (bad) { const s = L.s; if (S && S.atc && L.atc) { SC.answerAtc(L, L.atc.ok); return; } s.thr = 0; s.brake = true; s.pIn = 0; s.rIn = 0; return; }
    bot.fly(L, dt);
  }, maxSec);
}

test('jet lessons: the game context is Sorajima, whose states have no elec/hobbs', () => {
  assert.ok(FL.physics.SORAJIMA, 'Sorajima is the installed physics');
  assert.ok(!('elec' in FL.physics.newState({})), 'Sorajima states carry no elec (the field the lab derive reads)');
});

test('jet lessons: j4 reaches its re-approach placement and completes in the game context', () => {
  const L = flyLesson('j4', false);
  assert.equal(L.done, true, 'j4 runs to completion (it threw at the placeFinal step before the fix)');
});

test('jet lessons: j5 reaches its approach placement and completes in the game context', () => {
  const L = flyLesson('j5', true);
  assert.equal(L.done, true, 'j5 runs to completion (it threw at the placeFinal step before the fix)');
});
