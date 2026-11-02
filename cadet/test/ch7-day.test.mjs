// CADET — ch7 Arrow day regression (node --test): a complex-endorsement day (cx1, flown in the
// PA-28R Arrow) played from the walk-around to the debrief through the real day flow. The ch7
// days reuse the Archer checklist set, whose run-up item ("スロットル 2,000 rpm", window
// 1900–2120 rpm) was assisted by the instructor's fixed setThr(0.67) — exactly 2,000 rpm in the
// Archer, but the Arrow's constant-speed prop turns 0.67 into the 2,700 rpm redline, so the item
// could never complete and every Arrow day stalled at the run-up forever (full-play audit,
// domain A, defect A-3). The instructor's hand now sets an Arrow-appropriate throttle. This test
// also covers the play-day helper's walkaround fallback (aircraft without a kit — pa28r, b737 —
// walk the Archer's points, as the game itself falls back).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCareer } from '../src/career/career.js';
import { planFor } from '../src/career/day.js';
import { playDay } from './helpers/play-day.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js', 'radio.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL;
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };

test('ch7: the cx1 Arrow day gets past the run-up and completes to the debrief', () => {
  const C = createCareer({ store: memStore(), seed: 21 });
  C.load({ ...C.state, chapter: 'ch6', day: 100, graduated: { day: 99, rank: '通常', total: 40, firstRate: 60, examTries: 8, avgScore: 70 },
    checks: { xc: { tries: 1, pass: true, day: 50 }, ir: { tries: 1, pass: true, day: 65 }, me: { tries: 1, pass: true, day: 80 }, final: { tries: 1, pass: true, day: 98 } },
    exams: { final: { tries: 1, best: 85, pass: true } } });
  assert.equal(C.beginEndorsement(), true, 'the endorsement opens from a graduated record');
  const r = playDay(FL, { plan: planFor(FL, 'cx1'), anomalies: [], seed: 101 });
  const seq = r.phases.join('>');
  assert.ok(seq.includes('runup>tower'), `the day leaves the run-up for the tower (phases: ${seq})`);
  assert.equal(r.day.phase, 'debrief', 'the day completes to the debrief');
  assert.ok(r.got.some(L => L.id === 'cx1'), 'the cx1 lesson was flown');
});
