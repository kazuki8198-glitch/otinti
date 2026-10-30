// CADET — the standards analysis layer (flight/analysis.js, next wave item 1), without a screen:
//  - a synthetic 10 Hz recording of a stabilised approach scores STABLE at the 500 ft gate and its landing
//    reads back the numbers it was built with (touchdown point, sink, centreline, float); a fast approach
//    is UNSTABLE with the speed element failed;
//  - maneuver windows score against the ACS tolerances (±10 kt / ±100 ft / ±10°) with the school's own
//    pass rule, and a level run / a turn are found and scored in a recording;
//  - the recorder's snapshot keeps the position / altitude / vertical speed the analysis needs (the
//    fallbacks to pos / altTrue / vsi), a bot-flown t3 (FLIGHT LAB's scripted pilot, the real physics)
//    produces a real gate and a real landing, and the logbook keeps the compact analysis so the history
//    and its statistics read back;
//  - the debrief card gains the analysis groups without its grade, pass or counts changing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { analyzeRecording, scoreWindow, findManeuvers, gateAt, findLandings, analysisRows, compactAnalysis, cleanAnalysis, landingHistory, landingStats, sparkline, rwyCoords, RWY, FIELD_ELEV_FT } from '../src/flight/analysis.js';
import { createRecorder, snapshot } from '../src/flight/recorder.js';
import { createLogbook, entryFrom } from '../src/career/logbook.js';
import { debriefOf } from '../src/ui/flight-hud.js';
import { runLesson } from './helpers/bot.mjs';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, P = FL.physics;
const FT = P.FT, DEG = Math.PI / 180;

// a sample on the runway frame: along / cross (m), altitude (ft MSL), magnetic heading, ias, flap, gear
function mkSample(t, { along = 0, cross = 0, altFt = FIELD_ELEV_FT, hdgM = 360, pitch = 0, bank = 0, ias = 0, gs = 0, flap = 0, gear = 1, onGround = false } = {}) {
  const h = RWY.trueHdg * DEG, dn = along * Math.cos(h) - cross * Math.sin(h), de = along * Math.sin(h) + cross * Math.cos(h);
  return { t, n: RWY.n + dn, e: RWY.e + de, h: altFt / FT, q: P.qFromHPB(hdgM - P.MAGVAR_W, pitch, bank), ias, gs, vs: 0, alt: altFt, pIn: 0, rIn: 0, rud: 0, thr: 0.3, gear, flap, onGround, rpm: 1800, failed: false };
}
// a 3° approach from 5 km, flaring from 12 ft AGL at sinkFpm to the contact (the touchdown point is
// wherever the geometry ends: returned as tdAlong); iasAt500 lets a test make the gate fast.
// Samples at 10 Hz, then a ground roll to a stop.
function approachRec({ ias = 70, iasAt500 = null, cross = 4, sinkFpm = 130, flap = 40, gear = 1 } = {}) {
  const xs = [], gsMs = ias * 0.514444, tan3 = Math.tan(3 * DEG);
  let along = -4700, altFt = FIELD_ELEV_FT + (300 - along) * tan3 * FT, t = 0;
  const step = gsMs * 0.1;
  while (altFt > FIELD_ELEV_FT) {
    const agl = altFt - FIELD_ELEV_FT;
    const sink = agl > 12 ? gsMs * tan3 * 196.85 : sinkFpm;
    const spd = iasAt500 != null && Math.abs(agl - 500) < 60 ? iasAt500 : ias;
    xs.push(mkSample(t, { along, cross, altFt, ias: spd, gs: ias, flap, gear, pitch: -3 }));
    altFt = Math.max(FIELD_ELEV_FT, altFt - sink / 600); along += step; t += 0.1;
  }
  const tdAlong = Math.round(along);
  xs.push(mkSample(t, { along, cross, altFt: FIELD_ELEV_FT, ias, gs: ias, flap, gear, onGround: true }));
  for (let k = 1; k <= 30; k++) xs.push(mkSample(t + k * 0.1, { along: along + k * 2, cross, altFt: FIELD_ELEV_FT, ias: Math.max(0, ias - k * 3), gs: Math.max(0, ias - k * 3), flap, gear, onGround: true }));
  return { rec: { meta: { title: 'synthetic' }, samples: xs }, tdAlong };
}

test('analysis: a stabilised approach is STABLE at the 500 ft gate, and the landing reads back its numbers', () => {
  const { rec, tdAlong } = approachRec({});
  const a = analyzeRecording(rec, { vref: 70, gearRequired: true });
  assert.ok(a, 'an analysis');
  assert.equal(a.landings.length, 1);
  const L = a.landings[0];
  assert.equal(L.along, tdAlong); assert.equal(L.cross, 4); assert.ok(L.inZone, 'in the touchdown zone');
  assert.ok(Math.abs(L.sinkFpm - 130) <= 35, `sink ${L.sinkFpm} fpm ≈ the built 130`);
  assert.ok(Math.abs(L.floatM - (tdAlong - 9)) <= 30, `float ${L.floatM} m (50 ft crossing at along ≈9 to the touchdown at ${tdAlong})`);
  const g = a.gate;
  assert.ok(g, 'a gate'); assert.equal(g.stable, true, JSON.stringify(g));
  assert.ok(Math.abs(g.spd.v - 70) <= 1 && Math.abs(g.gp.v - 3) <= 0.15 && g.vs.v < -300 && g.vs.v > -450, JSON.stringify(g));
  assert.equal(g.flap.v, 40); assert.equal(g.gear.pass, true);
  // the debrief rows carry the numbers
  const rows = analysisRows(a);
  const gateGroup = rows.find(r => /ゲート/.test(r.step)), landGroup = rows.find(r => /着陸分析/.test(r.step));
  assert.ok(gateGroup.rows.some(r => r.name === 'ゲート判定' && /STABLE/.test(r.val) && r.pass));
  assert.ok(landGroup.rows[0].val.includes(`${tdAlong} m`) && landGroup.rows[0].val.includes('沈下'), landGroup.rows[0].val);
});

test('analysis: a fast, shallow-configured approach is UNSTABLE, element by element', () => {
  const a = analyzeRecording(approachRec({ iasAt500: 88, flap: 10, gear: 0 }).rec, { vref: 70, gearRequired: true });
  const g = a.gate;
  assert.ok(g); assert.equal(g.stable, false);
  assert.equal(g.spd.pass, false, `speed ${g.spd.v} vs the 70 kt reference`);
  assert.equal(g.flap.pass, false); assert.equal(g.gear.pass, false);
  assert.equal(g.gp.pass, true, 'the path itself was flown');
  const jud = analysisRows(a).find(r => /ゲート/.test(r.step)).rows.find(r => r.name === 'ゲート判定');
  assert.ok(/UNSTABLE/.test(jud.val) && !jud.pass);
});

test('analysis: scoreWindow applies the ACS tolerances with the school pass rule', () => {
  const xs = [];
  for (let i = 0; i < 200; i++) xs.push(mkSample(i * 0.1, { along: -20000, altFt: 3050, hdgM: 93, ias: 102 }));
  const good = scoreWindow(xs, { name: 'x', targets: { alt: { v: 3000 }, hdg: { v: 90 }, spd: { v: 100 } } });
  assert.ok(good.pass && good.rows.every(r => r.pct === 100), JSON.stringify(good.rows));
  const xs2 = xs.map(x => ({ ...x, alt: 3200 }));
  const bad = scoreWindow(xs2, { name: 'x', targets: { alt: { v: 3000 } } });
  assert.equal(bad.pass, false); assert.equal(bad.rows[0].pct, 0); assert.equal(bad.rows[0].max, 200);
  // a heading 25° off wraps the short way
  const xs3 = xs.map(x => ({ ...x, q: P.qFromHPB(115 - P.MAGVAR_W, 0, 0) }));
  const hw = scoreWindow(xs3, { name: 'x', targets: { hdg: { v: 90 } } });
  assert.equal(hw.rows[0].max, 25);
});

test('analysis: level runs and turns are found in a recording and scored', () => {
  const xs = [];
  let t = 0, along = -30000, altFt = 3000;
  for (let i = 0; i < 200; i++, t += 0.1) xs.push(mkSample(t, { along: along + i * 5, altFt: altFt + Math.sin(i / 30) * 8, hdgM: 90, ias: 100, gs: 100 }));
  for (let i = 0; i < 150; i++, t += 0.1) xs.push(mkSample(t, { along: along + 1000 + i * 4, altFt: altFt + Math.cos(i / 7) * 15, hdgM: (90 + i * 2.4) % 360, bank: 25, ias: 100, gs: 100 }));
  const ms = findManeuvers(xs);
  assert.ok(ms.some(m => /直線水平/.test(m.name)), JSON.stringify(ms.map(m => m.name)));
  assert.ok(ms.some(m => /旋回/.test(m.name)), JSON.stringify(ms.map(m => m.name)));
  const lv = ms.find(m => /直線水平/.test(m.name));
  assert.ok(lv.rows.find(r => r.key === 'alt').pass && lv.rows.find(r => r.key === 'hdg').pass, JSON.stringify(lv.rows));
});

test('recorder: the snapshot keeps position, altitude and vertical speed for the analysis', () => {
  const s = { pos: [1234, 3000 / FT, -5678], q: [0, 0, 0, 1], out: { ias: 90, gs: 95, altTrue: 3000, vsi: -420 }, eng: [{ thr: 0.4, rpm: 2000 }], flaps: { deg: 25 }, gearPos: 1, onGround: false };
  const x = snapshot(s, 3);
  assert.equal(x.n, 5678); assert.equal(x.e, 1234); assert.equal(x.alt, 3000); assert.equal(x.vs, -420);
  // a state that carries n/e and vs itself is read as before
  const y = snapshot({ ...s, n: 11, e: 22, out: { ias: 1, gs: 2, vs: 77 } }, 0);
  assert.equal(y.n, 11); assert.equal(y.e, 22); assert.equal(y.vs, 77);
});

test('analysis: a bot-flown t3 produces a real gate and a real landing (the numbers print)', () => {
  const rec = createRecorder(); rec.start({ title: 't3' });
  const L = runLesson(FL, 't3', 'basic', 600, (l) => rec.push(l.s, l.s.t || 0));
  assert.ok(L.done && L.passed, `the bot passes t3 (${L.grade})`);
  rec.done();
  const a = analyzeRecording(rec.last(), { vref: L.V.appr, gearRequired: false });
  assert.ok(a, 'an analysis of the bot flight');
  console.log(`[analysis bot t3] samples=${a.samples} landings=${JSON.stringify(a.landings)} gate=${JSON.stringify(a.gate)} maneuvers=${a.maneuvers.map(m => `${m.name}:${m.score}`).join(' ')}`);
  assert.equal(a.landings.length, 1, 'one landing');
  const td = a.landings[0];
  assert.ok(td.onRunway && td.along > -100 && td.along < 1200, `touchdown on the runway at ${td.along} m`);
  assert.ok(td.sinkFpm > 0 && td.sinkFpm < 900, `a measured sink of ${td.sinkFpm} fpm`);
  assert.ok(a.gate, 'the 500 ft gate was crossed and judged');
  assert.ok(Number.isFinite(a.gate.spd.v) && Number.isFinite(a.gate.gp.v) && Number.isFinite(a.gate.vs.v));
});

test('logbook: the compact analysis is kept, cleaned and read back as history with statistics', () => {
  const s1 = approachRec({}), s2 = approachRec({ sinkFpm: 260 });
  const a = analyzeRecording(s1.rec, { vref: 70, gearRequired: true });
  const ana = compactAnalysis(a);
  assert.ok(ana && ana.td && ana.td.along === s1.tdAlong && ana.gate && ana.gate.stable === true, JSON.stringify(ana));
  assert.deepEqual(cleanAnalysis(ana), ana, 'the compact form survives its own cleaning');
  assert.equal(cleanAnalysis({ td: { along: 'x' }, gate: 4, man: 'no' }), null, 'junk is dropped');
  const book = createLogbook({ getItem: () => null, setItem: () => {}, removeItem: () => {} });
  const sum = { lessons: [{ id: 't3', title: '通常着陸', grade: 'A', passed: true, done: true, ana }], blockT: 1800, landings: 1, trust: 3 };
  const e1 = entryFrom(sum, { date: '2026-05-01', dayN: 40 });
  book.add(e1);
  assert.equal(e1.lessons[0].ana.td.along, s1.tdAlong, 'the entry keeps the touchdown');
  const e2 = entryFrom({ ...sum, lessons: [{ ...sum.lessons[0], ana: compactAnalysis(analyzeRecording(s2.rec, { vref: 70 })) }] }, { date: '2026-05-02', dayN: 41 });
  book.add(e2);
  const hist = landingHistory(book.entries);
  assert.equal(hist.length, 2);
  const st = landingStats(hist);
  assert.equal(st.n, 2); assert.equal(st.alongMean, Math.round((s1.tdAlong + s2.tdAlong) / 2)); assert.ok(st.sinkMax >= 200, `the harder landing's sink ${st.sinkMax} fpm`);
  assert.equal(st.inZonePct, 100); assert.equal(st.gateStablePct, 100);
  assert.equal(sparkline(hist.map(x => x.along)).length, 2, 'a trend glyph per landing');
  // an old entry without analysis stays clean and adds nothing to the history
  const old = entryFrom({ lessons: [{ id: 'a2', title: '直線水平飛行', grade: 'B', passed: true, done: true }], blockT: 900, landings: 0, trust: 0 }, { date: '2026-04-01', dayN: 3 });
  assert.ok(!('ana' in old.lessons[0]));
});

test('debrief: the analysis groups join the detail, the grade and counts do not move', () => {
  const { rec, tdAlong } = approachRec({});
  const a = analyzeRecording(rec, { vref: 70, gearRequired: true });
  const sum = { mode: 'lesson', title: '通常着陸', levelName: '基礎', grade: 'A', passed: true, t: 300, step: 2, steps: ['a', 'b'],
    results: [{ step: 'ファイナル', rows: [{ name: '速度', val: '…', std: '±5 kt', pass: true }] }] };
  const plain = debriefOf(sum), withAna = debriefOf({ ...sum, analysis: a });
  assert.equal(withAna.grade, plain.grade); assert.equal(withAna.status, plain.status);
  assert.equal(withAna.okN, plain.okN); assert.equal(withAna.rowsN, plain.rowsN);
  assert.ok(withAna.results.length > plain.results.length, 'extra detail groups');
  const land = withAna.results.find(r => /着陸分析/.test(r.step));
  assert.ok(land && land.rows[0].val.includes(`${tdAlong} m`) && /沈下/.test(land.rows[0].val), land && land.rows[0].val);
  assert.ok(withAna.results.some(r => /ゲート/.test(r.step) && r.rows.some(x => /STABLE/.test(x.val))));
});
