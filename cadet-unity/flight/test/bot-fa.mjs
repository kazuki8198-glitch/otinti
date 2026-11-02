// JS reference driver for failures.js + analysis.js equivalence.
// Emits digest-fa-js.jsonl next to this file.
import fs from 'node:fs';

import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = '/home/hatch/workspace/cadet-wt-all';
const { pathToFileURL } = await import('node:url');
const CA = {
  failures: await import(pathToFileURL(`${ROOT}/cadet/src/aircraft/failures.js`).href),
  analysis: await import(pathToFileURL(`${ROOT}/cadet/src/flight/analysis.js`).href),
  recorder: await import(pathToFileURL(`${ROOT}/cadet/src/flight/recorder.js`).href),
  profile: await import(pathToFileURL(`${ROOT}/cadet/src/flight/profile.js`).href),
};
const out = [];
const emit = o => out.push(JSON.stringify(o));

// ---- failures ----
for (const mode of ['career', 'free']) for (const ac of ['pa28', 'pa44', 'b737']) for (const lesson of ['', 'a1', 'i5', 't2'])
  for (let seed = 1; seed <= 12; seed++) for (const day of [1, 3, 8, 15, 22, 40])
    emit({ tag: 'rf', seed, day, mode, ac, lesson, rf: CA.failures.randomFailureFor({ seed, day, mode, aircraft: ac, lessonId: lesson, kind: 'flight' }) });
emit({ tag: 'rf2', x: CA.failures.randomFailureFor({ seed: 3, day: 5, mode: 'career', kind: 'ground' }) });
emit({ tag: 'rf3', x: CA.failures.randomFailureFor({ seed: 3, day: 5, mode: 'career', exam: true }) });
emit({ tag: 'rf4', x: CA.failures.randomFailureFor({ seed: 3, day: 5, mode: 'career', firstLesson: true }) });
emit({ tag: 'rf5', x: CA.failures.randomFailureFor({ seed: 3, day: 5, mode: 'weird' }) });
for (const n of [0, 1, 2, 3, 7, -2, 1.5]) emit({ tag: 'pjb', n, v: CA.failures.preflightJudgeBase(n) });
for (const [src, item] of [['task', 'pitot'], ['task', 'lock'], ['task', 'zzz'], ['defect', 'pitotBlock'], ['defect', 'static'], ['defect', 'oil'], ['defect', 'cap'], ['x', 'y']])
  emit({ tag: 'hook', src, item, h: CA.failures.preflightHookFor(src, item) });
emit({ tag: 'sched', a: CA.failures.makeSchedule('mag', { atMin: 5 }), b: CA.failures.makeSchedule('zzz', { atMin: 5 }), c: CA.failures.makeSchedule('gear'),
       d: [CA.failures.failureDue({ kind: 'mag', atMin: 5 }, { elapsedMin: 4.9 }), CA.failures.failureDue({ kind: 'mag', atMin: 5 }, { elapsedMin: 5 }), CA.failures.failureDue({ kind: 'gear', atAltFt: 800 }, { altFt: 900 }), CA.failures.failureDue({ kind: 'gear' }, {})],
       e: CA.failures.dueSchedule([{ kind: 'mag', atMin: 5 }, { kind: 'gear', atAltFt: 800 }, { kind: 'pump' }], { elapsedMin: 3, altFt: 900 }).map(x => x.kind) });
emit({ tag: 'schedOf', a: CA.failures.scheduleOf({ kind: 'engine', trigger: { type: 'atAltFt', atAltFt: 2000 } }), b: CA.failures.scheduleOf({ kind: 'mag', trigger: { type: 'runup' } }), c: CA.failures.scheduleOf({ kind: 'carb', trigger: { type: 'afterMin', afterMin: 12 } }), d: CA.failures.scheduleOf(null) });

// ---- analysis on synthetic recordings ----
// quaternion for attitude: heading H (true), pitch P, bank B — Q = yaw* pitch * roll (x-east, y-up, z-south frame of the recorder)
const D = Math.PI / 180;
function quat(hdgT, pitch, bank) {
  const cy = Math.cos(hdgT * D / 2), sy = Math.sin(hdgT * D / 2);
  const cp = Math.cos(pitch * D / 2), sp = Math.sin(pitch * D / 2);
  const cr = Math.cos(bank * D / 2), sr = Math.sin(bank * D / 2);
  // yaw about Y (from north toward east = -z? recorder frame: fwd = q*[0,0,-1]); build via three.js-style multiply Y*X*Z
  const qy = [0, sy, 0, cy], qx = [sp, 0, 0, cp], qz = [0, 0, sr, cr];
  const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
  return mul(mul(qy, qx), qz);
}
function mkSamples() {
  // 300 s flight: takeoff roll, climb, level cruise w/ a turn, final approach, touchdown at ~240 s, rollout
  const xs = [];
  const pos = (along, cross) => { const h = 354 * D; return { n: along * Math.cos(h) - cross * Math.sin(h), e: -40000 + along * Math.sin(h) + cross * Math.cos(h) }; };
  for (let i = 0; i <= 3000; i++) {
    const t = i / 10;
    let alt, ias, along, cross = 2, hdg = 354, pitch = 0, bank = 0, gnd = false, vs = 0;
    if (t < 20) { alt = 55; ias = t * 3.5; along = 30 + t * t * 1.1; gnd = t < 18; pitch = t > 17 ? 8 : 0; }
    else if (t < 60) { alt = 55 + (t - 20) * 25; ias = 75; along = 500 + (t - 20) * 45; pitch = 10; vs = 1500; }
    else if (t < 150) { alt = 2055; ias = 100; along = 2300 + (t - 60) * 52; if (t > 90 && t < 120) { bank = 20; hdg = 354 + (t - 90) * 3; } else hdg = t >= 120 ? 354 + 90 : 354; }
    else if (t < 200) { alt = 2055 - (t - 150) * 20; ias = 85; along = 7000 - (t - 150) * 40; vs = -1150; }
    else if (t < 240) { const f = (t - 200) / 40; alt = 1055 - f * 1000; ias = 70; along = 5000 - f * 4700; vs = -530; }
    else { alt = 55; ias = Math.max(0, 65 - (t - 240) * 4); along = 300 + (t - 240) * 30; gnd = true; }
    const p = pos(along, cross);
    xs.push({ t, n: p.n, e: p.e, h: alt / 3.28084, q: quat(hdg, pitch, bank), ias, gs: ias, vs, alt, pIn: pitch / 10, rIn: bank / 30, rud: 0, thr: 0.7, gear: 1, flap: t > 190 ? 30 : 0, onGround: gnd, rpm: 2000, failed: false });
  }
  return xs;
}
const rec = { meta: { title: 'TEST & <flight>', startISO: '2026-11-02T01:02:03.000Z' }, samples: mkSamples() };
fs.writeFileSync(path.join(here, 'samples-fa.json'), JSON.stringify(rec));
const a = CA.analysis.analyzeRecording(rec, { vref: 70, flapMinDeg: 25, gearRequired: true });
emit({ tag: 'ana', a });
emit({ tag: 'rows', rows: CA.analysis.analysisRows(a) });
emit({ tag: 'compact', c: CA.analysis.compactAnalysis(a) });
emit({ tag: 'clean', c: CA.analysis.cleanAnalysis({ td: { along: 350.24, cross: -3.33, sink: 180.9, float: 120.4, zone: 1 }, gate: { stable: 1, ias: 71.26, gp: 3.14, vs: -512.8 }, man: [{ name: '直線水平（保持）', score: 0.876 }, { name: '', score: 0.5 }] }) });
emit({ tag: 'clean2', c: CA.analysis.cleanAnalysis(null), d: CA.analysis.cleanAnalysis({ td: {}, gate: null, man: [] }) });
const entries = [{ date: '2026-11-01', lessons: [{ id: 't2', ana: CA.analysis.compactAnalysis(a) }, { id: 'a1' }, { id: 't3', ana: { td: { along: 900, cross: 8, sink: 350, float: 300, zone: false }, gate: { stable: false } } }] }];
emit({ tag: 'hist', h: CA.analysis.landingHistory(entries), s: CA.analysis.landingStats(CA.analysis.landingHistory(entries)) });
emit({ tag: 'spark', a: CA.analysis.sparkline([1, 2, 3, 4, 5]), b: CA.analysis.sparkline([5, 4, 3, 2, 1], { invert: true }), c: CA.analysis.sparkline([]) });
emit({ tag: 'series', s: CA.profile.seriesOf(rec, 60) });
emit({ tag: 'tdprof', p: CA.profile.touchdownOf(rec, a) });
emit({ tag: 'scale', s: CA.profile.scaleLine([0, 5, 10], 100, 50) });
emit({ tag: 'csv', csv: CA.recorder.toCSV(rec).slice(0, 400) });
emit({ tag: 'gpx', gpx: CA.recorder.toGPX(rec, ([n, e]) => [35 + n / 111320, 139 + e / 92000]).slice(0, 500) });
emit({ tag: 'dur', d: CA.recorder.duration(rec) });
emit({ tag: 'sampleAt', s: CA.recorder.sampleAt(rec, 123.45) });

fs.writeFileSync(path.join(here, 'digest-fa-js.jsonl'), out.join('\n') + '\n');
console.log('fa js lines:', out.length);
