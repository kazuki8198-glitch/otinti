// FLIGHT LAB — flight, training, record and build tests (node --test).
// The scripted test pilot (bot.mjs) flies the tasks with the same controls a person uses.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load } from './load.mjs';
import { makeBot, runTask } from './bot.mjs';
import { build } from '../build.mjs';
const FL = load('physics.js', 'avionics.js', 'sanford-course.js', 'curriculum.js', 'training.js');
const P = FL.physics, A = FL.avionics, T = FL.training, CU = FL.curriculum, SF = FL.sanford;
const clamp = P.clamp, DT = 1 / 120;
const run = (s, sec, fn) => { for (let i = 0; i < sec * 120; i++) { if (fn) fn(s); P.step(s, DT); } return s; };
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i], dump: () => [...m.values()].join('\n') }; };

// ------------------------------------------------------------------ the built single file
const B = build({ quiet: true });
const html = B.html;

test('build: one HTML file, no external scripts or stylesheets, everything inline', () => {
  assert.doesNotMatch(html, /<script[^>]*\bsrc\s*=/i, 'no <script src>');
  assert.doesNotMatch(html, /<link[^>]*rel=["']?stylesheet/i, 'no external stylesheet');
  assert.doesNotMatch(html, /import\s*\(\s*['"]https?:/, 'no remote import()');
  assert.doesNotMatch(html, /importScripts\s*\(/, 'no importScripts from the network');
  assert.ok((html.match(/<script>/g) || []).length >= 9, 'inline scripts');
  assert.match(html, /FL\.DRACO_WASM_B64 = "AGFzbQ/, 'the Draco WebAssembly is embedded (base64 of \\0asm)');
  // the only remote endpoint the code calls is Google's tile host
  const fetchHosts = [...html.matchAll(/fetch\(\s*['"`](https?:\/\/[^/'"`]+)/g)].map(m => m[1]);
  assert.ok(fetchHosts.every(h => h === 'https://tile.googleapis.com'), JSON.stringify(fetchHosts));
});

test('build: no placeholders, no leftover template markers', () => {
  for (const re of [/\bTODO\b/, /\bFIXME\b/, /\bTBD\b/, /lorem ipsum/i, /PLACEHOLDER/, /<!--BUILD:/, /\{\{\s*\w+\s*\}\}/, /XXX/]) assert.doesNotMatch(html, re, String(re));
});

test('build: the PFD and MFD canvases, the audio panel and the required notices are on the page', () => {
  for (const id of ['pfd', 'mfd', 'audio', 'view3d', 'taskPanel', 'disclaimer']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH\/AFM、SOP、航空法規を優先してください。/);
  assert.match(html, /G1000型/); assert.match(html, /NOT FOR NAVIGATION/); assert.match(html, /模式図/); assert.match(html, /正式な飛行日誌ではありません/);
});

test('build: no duplicate element ids in the page', () => {
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]), seen = new Set(), dup = [];
  for (const i of ids) { if (seen.has(i)) dup.push(i); seen.add(i); }
  assert.deepEqual(dup, []);
  assert.ok(ids.length > 20);
});

// ------------------------------------------------------------------ content
test('curriculum: 16 chapters, each with explanation, English terms, examples, cautions, 2 quizzes with reasons, references', () => {
  assert.equal(CU.CHAPTERS.length, 16);
  assert.deepEqual(CU.CHAPTERS.map(c => c.no).sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1));
  for (const c of CU.CHAPTERS) {
    assert.ok(c.title && c.en && c.summary && c.body.length >= 2, `ch ${c.no} text`);
    assert.ok(c.terms.length >= 3 && c.terms.every(t => t[0] && t[1]), `ch ${c.no} terms`);
    assert.ok(c.examples.length >= 1 && c.cautions.length >= 1, `ch ${c.no} examples/cautions`);
    assert.equal(c.quiz.length, 2, `ch ${c.no} quizzes`);
    for (const q of c.quiz) { assert.ok(q.q && q.why && q.choices.length >= 3); assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length); }
    assert.ok(c.refs.length >= 1 && c.refs.every(r => /^https:\/\//.test(r.url)), `ch ${c.no} refs`);
    for (const id of c.tasks) assert.ok(T.task(id), `ch ${c.no} task ${id}`);
  }
  assert.equal(CU.PHASES.length, 6);
  assert.deepEqual(CU.PHASES.flatMap(p => p.chapters).sort((a, b) => a - b), Array.from({ length: 16 }, (_, i) => i + 1), 'every chapter in one phase');
});

test('Sanford: the four runways, the hot spot, the airspace, a schematic labelled NOT FOR NAVIGATION, ≥ 4 ATC scenes', () => {
  assert.deepEqual(SF.RUNWAYS.map(r => r.id), ['09L/27R', '09C/27C', '09R/27L', '18/36']);
  const facts = SF.FACTS.map(f => f.t).join(' ');
  for (const w of ['HS1', '27C', 'Class C', 'Class B', 'Line Up and Wait']) assert.ok(facts.includes(w), w);
  const svg = SF.diagramSvg(); assert.match(svg, /NOT FOR NAVIGATION/); assert.match(svg, /模式図/);
  assert.ok(SF.SCENES.length >= 4);
  for (const s of SF.SCENES) { assert.ok(s.atc && s.why && s.clarify && s.options.length >= 3); assert.ok(s.answer >= 0 && s.answer < s.options.length); }
  assert.ok(SF.SCENES.some(s => /line up and wait/i.test(s.atc)) && SF.SCENES.some(s => /hold short/i.test(s.atc) && /27C|Two Seven Cent(er|re)/i.test(s.atc)));
});

// ------------------------------------------------------------------ the tasks
test('tasks: 12 tasks × 3 levels all load, start finite and evaluate', () => {
  assert.equal(T.TASKS.length, 12);
  for (const t of T.TASKS) for (const L of T.LEVELS) {
    const k = T.startTask(t.id, L.id);
    run(k.s, 0.5);
    const c = T.makeCtx(k.s, k.av); T.update(k.run, c, 0.5);
    for (const v of [c.indAlt, c.hdgMag, c.trkMag, k.s.out.ias, k.s.out.vsi]) assert.ok(Number.isFinite(v), `${t.id} ${L.id}`);
    assert.ok(k.run.items.length >= 1 && k.run.items.every(i => i.label && typeof i.val === 'string'), `${t.id} items`);
    assert.ok(!k.run.done, `${t.id} ${L.id} should not end at once: ${k.run.reason}`);
    assert.ok(t.hints.length >= 3 && t.points.length >= 1 && t.stages.length >= 2);
  }
});

test('levels: tighter tolerances, longer holds and fewer hints from 導入 to 精度', () => {
  const [a, b, c] = T.LEVELS;
  assert.deepEqual([a.name, b.name, c.name], ['導入', '基礎', '精度']);
  for (const k of ['alt', 'spd', 'hdg', 'bank', 'xtk', 'cl', 'sink']) assert.ok(a[k] > b[k] && b[k] > c[k], k);
  assert.ok(a.hold < b.hold && b.hold < c.hold);
  const t1 = T.task('t1');
  assert.ok(T.visibleHints(t1, a).length > T.visibleHints(t1, b).length && T.visibleHints(t1, b).length > T.visibleHints(t1, c).length);
});

test('evaluation: the hold timer counts only while every condition holds, and resets to zero when one goes out', () => {
  const k = T.startTask('t1', 'basic');
  const c = T.makeCtx(k.s, k.av);
  T.update(k.run, c, 5); assert.ok(k.run.held >= 4.9, 'held while in the conditions');
  k.s.pos[2] -= 300 / P.FT; P.derive(k.s);                                  // 300 ft too high
  T.update(k.run, T.makeCtx(k.s, k.av), 0.1); assert.equal(k.run.held, 0, 'reset when out');
  assert.equal(k.run.stats[0].resets, 1);
  k.s.pos[2] += 300 / P.FT; P.derive(k.s);
  for (let i = 0; i < 25; i++) T.update(k.run, T.makeCtx(k.s, k.av), 1);
  assert.equal(k.run.stage, 1, 'stage 1 passed after 20 s held continuously (基礎)');
});

// ------------------------------------------------------------------ the flight model
test('physics: trimmed level flight holds hands-off for a minute; IAS, TAS and the altimeter are consistent', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100), a0 = s.out.altTrue;
  run(s, 60);
  assert.ok(Math.abs(s.out.altTrue - a0) < 60, `altitude ${s.out.altTrue}`);
  assert.ok(Math.abs(s.out.ias - 100) < 5, `ias ${s.out.ias}`);
  assert.ok(s.out.tas > s.out.ias, 'TAS > IAS at 3,000 ft');
});

test('physics: stall warning at a high angle of attack, before the critical angle', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 70);
  s.ctl.thr = 0; let warned = null, maxA = 0;
  run(s, 25, x => { x.ctl.elev = 0.85; if (x.out.stallWarn && warned == null) warned = x.out.alpha; maxA = Math.max(maxA, x.out.alpha); });
  assert.ok(warned != null, 'warned'); assert.ok(warned < s.out.aStall, `warned at ${warned}° < ${s.out.aStall}°`);
});

test('physics: engine stop (failure) → the engine_stop event, the RPM winds down, a glide near the teaching best-glide speed', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 76);
  s.engine.failed = true; const b = makeBot(FL), av = A.createAvionics();
  run(s, 40, x => b.fly(x, av, DT, { hdg: 360, ias: 76, thr: 0 }));
  assert.ok(s.events.some(e => e.type === 'engine_stop')); assert.equal(s.engine.running, false);
  assert.ok(s.out.rpm < 1500, `rpm ${s.out.rpm}`);
  assert.ok(s.out.vsi < -400 && s.out.vsi > -1300, `glide vsi ${s.out.vsi}`);
  const ratio = (s.out.gs * 101.3) / -s.out.vsi; assert.ok(ratio > 6 && ratio < 14, `glide ratio ${ratio}`);
  // fuel exhaustion stops the engine too
  const f = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100); f.fuel = [0, 0]; run(f, 1);
  assert.ok(f.events.some(e => e.type === 'engine_stop' && /燃料/.test(e.why)));
});

test('takeoff: the scripted pilot completes task 5 (導入) — lift-off near Vr, climb at Vy', () => {
  const b = makeBot(FL);
  const k = runTask(FL, 't5', 'intro', (k, c, dt) => {
    const s = k.s, o = s.out;
    if (s.onGround) { s.ctl.thr = 1; s.ctl.elev = o.ias < 55 ? 0 : 0.75; s.ctl.rud = clamp(-0.08 * o.rwyCross + 0.08 * A.hdgDiff(o.hdgTrue, P.LAB_RWY.trueHdg) - 0.04 * s.w[2] / P.DEG + 0.15, -1, 1); return; }
    b.fly(s, k.av, dt, { hdg: 360, ias: 76, thr: 1 });
  }, 300);
  assert.equal(k.run.result, 'success', k.run.reason);
});

function landPilot(b) {
  return (k, c, dt) => {
    const s = k.s, o = s.out, R = P.LAB_RWY, rc = P.rwyCoords(R, s.pos[0], s.pos[1]);
    const hPath = (300 - rc.along) * Math.tan(3 * P.DEG) * P.FT, hNow = o.altTrue - R.elevFt, trkM = A.trueToMag(o.trk, P.MAGVAR_W);
    if (s.onGround) { s.ctl.thr = 0; s.ctl.brake = 1; b.attitude(s, 0, 0); s.ctl.rud = clamp(-0.1 * rc.cross + 0.1 * A.hdgDiff(o.hdgTrue, R.trueHdg), -1, 1); return; }
    const trkWant = 360 + clamp(-rc.cross * 0.15, -20, 20), bankT = clamp(A.hdgDiff(trkM, trkWant) * 2, -15, 15);
    if (o.agl < 18) { s.ctl.thr = 0; b.attitude(s, clamp(o.pitch + (-o.vsi - 150) * 0.01, 0, 8), clamp(bankT * 0.3, -3, 3)); return; }
    b.fly(s, k.av, dt, { vs: -o.gs * 101.3 * Math.tan(3 * P.DEG) + clamp((hPath - hNow) * 4, -300, 300), ias: 66, bank: bankT });
  };
}
test('landing: the scripted pilot completes task 6 (導入 and 精度) — touchdown in the zone, stopped on the runway', () => {
  for (const lv of ['intro', 'precision']) {
    const k = runTask(FL, 't6', lv, landPilot(makeBot(FL)), 420);
    assert.equal(k.run.result, 'success', `${lv}: ${k.run.reason}`);
    const td = k.s.td; assert.ok(td && td.onRunway && td.fpm < 400 && !td.noseFirst, JSON.stringify(td));
  }
});

test('runway excursion: rolling off the paved surface is detected and ends the task', () => {
  const k = runTask(FL, 't5', 'intro', k => { k.s.ctl.thr = 0.6; k.s.ctl.rud = -1; }, 60);
  assert.ok(k.s.events.some(e => e.type === 'runway_excursion'), 'event');
  assert.equal(k.run.result, 'fail'); assert.match(k.run.reason, /逸脱/);
});

test('hard landing and crash: the sink rate before contact decides (600 / 1,000 fpm teaching limits)', () => {
  const drop = fpm => { const s = P.placeInAir(P.newState(), 0, -40000, P.GROUND_FT + 12, 354, 62); s.vel[2] = fpm / 196.85; s.ctl.thr = 0; run(s, 3, x => { if (!x.td) x.vel[2] = Math.max(x.vel[2], fpm / 196.85 * 0.98); }); return s; };
  const soft = drop(300); assert.ok(soft.td && soft.td.fpm < 600 && !soft.crashed && !soft.events.some(e => e.type === 'hard_landing'));
  const hard = drop(800); assert.ok(hard.events.some(e => e.type === 'hard_landing') && !hard.crashed, `hard ${hard.td && hard.td.fpm}`);
  const crash = drop(1400); assert.ok(crash.crashed && /1,000 fpm/.test(crash.crashReason), crash.crashReason);
});

test('every task can be flown: the scripted pilot completes the remaining tasks at 導入', () => {
  const b = () => makeBot(FL);
  const track = bt => (k, c, dt) => { const dtk = c.nav.dtk ?? 360, want = dtk + clamp(-(c.nav.xtk || 0) * 60, -30, 30); bt.fly(k.s, k.av, dt, { alt: 2500, hdg: c.hdgMag + A.hdgDiff(c.trkMag, want), ias: 100 }); };
  const pilots = {
    t1: bt => (k, c, dt) => bt.fly(k.s, k.av, dt, { alt: 3000, hdg: 360, ias: k.run.stage === 0 ? 100 : 90 }),
    t2: bt => (k, c, dt) => (k.run.stage === 0 ? bt.fly(k.s, k.av, dt, { hdg: 360, ias: 76, thr: 1 }) : bt.fly(k.s, k.av, dt, { alt: 3000, hdg: 360, ias: 97 })),
    t3: bt => (k, c, dt) => { const st = k.run.stage, tgt = [270, 270, 360, 360][st] ?? 360, hd = A.hdgDiff(c.hdgMag, tgt); bt.fly(k.s, k.av, dt, { alt: 3000, hdg: tgt, ias: 100, bank: st === 0 ? -20 : st === 2 ? 20 : Math.abs(hd) < 12 ? null : hd < 0 ? -20 : 20 }); },
    t4: bt => (k, c, dt) => { k.s.ctl.flap = k.run.stage === 0 ? 1 : 0; bt.fly(k.s, k.av, dt, { alt: 3000, hdg: 360, ias: k.run.stage === 0 ? 65 : 100 }); },
    t7: track, t8: track,
    t9: bt => { const tp = track(bt); return (k, c, dt) => { if (k.run.stage === 1 && !k.run.estimate) { const tr = T.estimateTruth(k.s, k.av); T.submitEstimate(k.run, k.s, k.av, { hdg: tr.brg + 5, dist: tr.dist * 1.1, eteMin: tr.eteMin }); } if (k.run.stage === 2) A.control(k.av, 'DIRECT', 'LABEF'); tp(k, c, dt); }; },
    t10: bt => (k, c, dt) => { const st = k.run.stage; bt.fly(k.s, k.av, dt, { alt: 3000, hdg: st === 0 ? 360 : 90, ias: 100, bank: st === 1 ? 15 : st === 2 && Math.abs(A.hdgDiff(c.hdgMag, 90)) > 12 ? 15 : null }); },
    t11: bt => (k, c, dt) => { const st = k.run.stage; if (st === 0) for (let i = 0; i < 20; i++) A.control(k.av, 'BARO', 1); if (st === 1) { k.av.altSel = 4000; k.av.hdgBug = 90; } bt.fly(k.s, k.av, dt, st < 2 ? { alt: 3000, hdg: 360, ias: 100 } : { alt: 4000, hdg: 90, ias: 97, bank: Math.abs(A.hdgDiff(c.hdgMag, 90)) > 15 ? 20 : null }); },
    t12: bt => { const land = landPilot(bt); return (k, c, dt) => { const s = k.s, o = s.out, R = P.LAB_RWY; if (s.engine.running) return bt.fly(s, k.av, dt, { alt: 2000, hdg: 360, ias: 100 }); const rc = P.rwyCoords(R, s.pos[0], s.pos[1]); if (o.agl < 18 || s.onGround) return land(k, c, dt); const ang = Math.atan2((o.altTrue - R.elevFt) / P.FT, Math.max(300 - rc.along, 50)) / P.DEG, trkM = A.trueToMag(o.trk, P.MAGVAR_W), want = 360 + clamp(-rc.cross * 0.05, -30, 30); if (k.run.stage >= 1) s.ctl.flap = ang > 7.5 ? 3 : ang > 6.5 ? 2 : ang > 5.8 ? 1 : 0; bt.fly(s, k.av, dt, { hdg: want, ias: s.ctl.flap >= 2 ? 70 : 76, thr: 0, bank: clamp(A.hdgDiff(trkM, want) * 2, -20, 20) }); }; },
  };
  for (const [id, mk] of Object.entries(pilots)) {
    const k = runTask(FL, id, 'intro', mk(b()), 900);
    assert.equal(k.run.result, 'success', `${id}: ${k.run.reason} (stage ${k.run.stage})`);
  }
});

// ------------------------------------------------------------------ the record
test('record: saved fields, the "not a logbook" note, and no API key — even one pasted into the memo', () => {
  const st = memStore(), KEY = ['AIza', 'FAKE', '-TEST-KEY-not-a-real-key-0123456789'].join('');   // (built at run time: no key-like literal in the source)
  const k = T.startTask('t1', 'intro'); run(k.s, 2); T.update(k.run, T.makeCtx(k.s, k.av), 2);
  const rec = T.addRecord(st, T.recordFromRun(k.run, k.s, `メモ ${KEY} と token=abcdefghijklmnop`));
  for (const f of ['taskId', 'datetime', 'level', 'mode', 'achievementPct', 'inCondSec', 'altHist', 'spdHist', 'events', 'memo']) assert.ok(f in rec, f);
  assert.match(rec.note, /正式な飛行日誌（logbook）ではなく/);
  assert.ok(!st.dump().includes(KEY) && !st.dump().includes('abcdefghijklmnop'), 'no key in storage');
  assert.ok(!T.exportJSON(T.loadRecords(st), {}).includes(KEY), 'no key in the export');
  assert.ok(!('flightHours' in rec) && !('pilotName' in rec));
});

test('record import: unknown fields (an api key, a token, map data) are dropped; malformed files are refused', () => {
  const evil = JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record', records: [{ id: 'r1', taskId: 't3', level: 'basic', mode: 'staged', datetime: '2026-01-02T03:04:05Z', result: 'success', achievementPct: 100, apiKey: 'AI' + 'zaSECRETSECRETSECRETSECRET123', googleTiles: [1, 2, 3], altHist: [1, 'x', 3], memo: 'ok' }, { taskId: 'nope' }], progress: { quiz: { 1: [true, false, 'x'] }, read: [1, 2, 99], atc: { luaw: true, 'bad key!': true } } });
  const j = T.importJSON(evil);
  assert.equal(j.records.length, 1);
  const r = j.records[0]; assert.ok(!('apiKey' in r) && !('googleTiles' in r)); assert.deepEqual(r.altHist, [1, 3]);
  assert.ok(!JSON.stringify(j).includes('SECRET'));
  assert.deepEqual(j.progress.read, [1, 2]); assert.deepEqual(j.progress.quiz['1'], [true, false, null]); assert.deepEqual(Object.keys(j.progress.atc), ['luaw']);
  assert.throws(() => T.importJSON('{"app":"other"}'), /学習記録ファイルではありません/);
  assert.throws(() => T.importJSON('not json'), /JSON/);
});

test('works without Google: every task runs and the record is written with no Google module and no network', () => {
  assert.equal(FL.google3d, undefined, 'google3d.js not loaded here');
  const st = memStore();
  for (const t of T.TASKS) { const k = T.startTask(t.id, 'intro'); run(k.s, 1); T.update(k.run, T.makeCtx(k.s, k.av), 1); T.addRecord(st, T.recordFromRun(k.run, k.s, '')); }
  assert.equal(T.loadRecords(st).length, 12);
});

test('debrief: stages, deviations, touchdown and the disclaimer line', () => {
  const k = runTask(FL, 't6', 'intro', landPilot(makeBot(FL)), 420);
  const d = T.debrief(k.run, k.s).map(x => x.text).join('\n');
  assert.match(d, /達成/); assert.match(d, /接地記録/); assert.match(d, /技能や資格の証明ではありません/);
});
