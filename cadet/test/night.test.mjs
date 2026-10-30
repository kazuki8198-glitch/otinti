// CADET — the final chapter's night flight (career.js laterSchedule, B5.1-M): after the review lesson
// and the written test, exactly one evening item — the pattern after dark, at the evening slot — stands
// between the cadet and the examiner's check; flown once, it is never offered again, and the check
// follows. Before that point (lesson or test outstanding) there is no night item.
import test from 'node:test';
import assert from 'node:assert/strict';
import { newCareer, schedule } from '../src/career/career.js';

const ch6State = (day, { r1 = true, exam = true, night = 0 } = {}) => {
  const st = newCareer(5);
  st.chapter = 'ch6'; st.day = day; st.slot = 'morning';
  if (r1) st.done['flight:r1'] = day - 5;
  if (exam) { st.exams.final = { tries: 1, best: 90, pass: true }; st.done['exam:final'] = day - 4; }
  if (night) st.done['night:t2'] = night;
  return st;
};
const prog = { lessons: { r1: { tries: 1, best: 'A', pass: true, levels: ['basic'] } } };

test('night: the evening item appears once, in order, and the check follows it', () => {
  let nightDay = 0, checkDay = 0;
  for (let day = 200; day <= 300 && (!nightDay || !checkDay); day++) {
    const sch = schedule(ch6State(day, { night: nightDay }), prog, { trust: 70 });
    const night = sch.find(x => x.kind === 'night');
    if (night && !nightDay) {
      nightDay = day;
      assert.equal(night.slot, 'evening', 'flown at the evening slot (extended to true night in main)');
      assert.equal(night.id, 't2', 'the pattern lesson, after dark');
      assert.ok(!sch.some(x => x.kind === 'checkride'), 'the check waits for the night flight');
    } else if (!night && nightDay && !checkDay && sch.some(x => x.kind === 'checkride')) checkDay = day;
    if (!nightDay) assert.ok(!sch.some(x => x.kind === 'checkride'), `no check before the night flight (day ${day})`);
  }
  assert.ok(nightDay > 0, 'a flyable evening came');
  assert.ok(checkDay > nightDay, 'the check is offered after');
});

test('night: not before its turn — the lesson or the test outstanding, no night item', () => {
  const progNoR1 = { lessons: {} };
  for (let day = 200; day <= 260; day++) {
    assert.ok(!schedule(ch6State(day), progNoR1, { trust: 70 }).some(x => x.kind === 'night'), 'r1 first');
    assert.ok(!schedule(ch6State(day, { exam: false }), prog, { trust: 70 }).some(x => x.kind === 'night'), 'the test first');
  }
});
