// FLIGHT LAB — build, flight model, school, record and textbook tests (node --test).
// The scripted test pilot (bot.mjs) flies the lessons with the same inputs a keyboard pilot has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, CORE } from './load.mjs';
import { makeBot, runLesson } from './bot.mjs';
import { build } from '../build.mjs';
const FL = load(...CORE, 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js', 'quiz.js', 'radio.js');
const P = FL.physics, A = FL.avionics, SC = FL.school, SY = FL.syllabus, SF = FL.sanford, BK = FL.book, QZ = FL.quiz;
const DT = 1 / 120, clamp = P.clamp;
const run = (s, sec, fn) => { for (let i = 0; i < sec * 120; i++) { if (fn) fn(s); P.step(s, DT); } return s; };
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i], dump: () => [...m.values()].join('\n') }; };
const flightLessons = () => SC.lessonOrder().map(id => SC.lesson(id)).filter(l => l.steps);
// hands for the physics tests: the pitch hold (as W / S leave it) flown to a speed, the wings held level (A / D)
const hands = (s, kt, bank = 0) => { if (s.base == null) s.base = s.out.pitch; const e = s.out.ias - kt; s.base = clamp(s.base + e * 0.05 * DT, -15, 18); s.keyHold = true; s.pRate = 0; s.pTgt = clamp(s.base + 0.35 * e, -15, 18); s.rIn = clamp(0.045 * (bank - s.out.bank) - 0.012 * (-s.w[2] / P.DEG), -1, 1); };

// ------------------------------------------------------------------ the built single file
const B = build({ quiet: true });
const html = B.html;

test('build: one HTML file, no external scripts or stylesheets, everything inline; the only remote host is Google\'s tile host', () => {
  assert.doesNotMatch(html, /<script[^>]*\bsrc\s*=/i, 'no <script src>');
  assert.doesNotMatch(html, /<link[^>]*rel=["']?stylesheet/i, 'no external stylesheet');
  assert.doesNotMatch(html, /import\s*\(\s*['"]https?:/, 'no remote import()');
  assert.doesNotMatch(html, /importScripts\s*\(/, 'no importScripts from the network');
  assert.ok((html.match(/<script>/g) || []).length >= 15, 'inline scripts');
  assert.match(html, /FL\.DRACO_WASM_B64 = "AGFzbQ/, 'the Draco WebAssembly is embedded (base64 of \\0asm)');
  const fetchHosts = [...html.matchAll(/fetch\(\s*['"`](https?:\/\/[^/'"`]+)/g)].map(m => m[1]);
  assert.ok(fetchHosts.every(h => h === 'https://tile.googleapis.com'), JSON.stringify(fetchHosts));
});

test('build: no placeholders, no template markers, no API keys', () => {
  for (const re of [/\bTODO\b/, /\bFIXME\b/, /\bTBD\b/, /lorem ipsum/i, /PLACEHOLDER/, /<!--BUILD:/, /\{\{\s*\w+\s*\}\}/, /XXX/]) assert.doesNotMatch(html, re, String(re));
  assert.doesNotMatch(html, /sk-ant-api/); assert.doesNotMatch(html, /AIza[0-9A-Za-z_-]{30,}/);
});

test('build: the displays, the instructor panel, the control strip and the required notices are on the page', () => {
  for (const id of ['pfd', 'mfd', 'audio', 'view3d', 'sch-panel', 'ctl-strip', 'keyhelp', 'menu', 'school', 'debrief', 'page', 'ack', 'gattr']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH\/AFM、SOP、航空法規を優先してください。/);
  assert.match(html, /G1000型配置と基本概念を学ぶ教材/); assert.match(html, /NOT FOR NAVIGATION/); assert.match(html, /模式図/); assert.match(html, /正式な飛行日誌ではありません/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]), seen = new Set(), dup = [];
  for (const i of ids) { if (seen.has(i)) dup.push(i); seen.add(i); }
  assert.deepEqual(dup, [], 'no duplicate element ids');
});

// ------------------------------------------------------------------ the flight model (Sorajima's, with the Archer and Seminole data)
test('physics: the Archer trimmed in level flight holds altitude and speed hands-off for a minute', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100), a0 = s.out.altTrue;
  run(s, 60);
  assert.ok(!s.crashed && Math.abs(s.out.altTrue - a0) < 100, `altitude ${s.out.altTrue.toFixed(0)} from ${a0.toFixed(0)}`);
  assert.ok(Math.abs(s.out.ias - 100) < 6, `ias ${s.out.ias}`);
  assert.ok(s.out.tas > s.out.ias, 'TAS > IAS at 3,000 ft');
});

test('physics: performance near the published training numbers (Archer Vy climb, cruise; Seminole climb and one engine at Vyse)', () => {
  const pa28 = P.newState({ aircraft: 'pa28' }), pa44 = P.newState({ aircraft: 'pa44' }), V = pa28.A.v, W = pa44.A.v;
  const climb = P.steadyState(pa28, V.y, null, { pwr: 'full', altFt: 100 });
  assert.ok(climb.fpm > 650 && climb.fpm < 900, `Archer Vy climb ${climb.fpm.toFixed(0)} fpm (teaching value ~700–800)`);
  const cruise = P.steadyState(pa28, V.cruise, 0, { altFt: 3000 });
  assert.ok(Math.abs(cruise.thr - V.cruiseThr) < 0.06 && cruise.rpm > 2250 && cruise.rpm < 2550, `cruise ${V.cruise} kt: thr ${cruise.thr.toFixed(2)} rpm ${cruise.rpm | 0}`);
  const both = P.steadyState(pa44, W.y, null, { pwr: 'full', altFt: 100 }), oei = P.steadyState(pa44, W.yse, null, { pwr: 'full', oei: true, altFt: 100 });
  assert.ok(both.fpm > 1000 && both.fpm < 1500, `Seminole both engines ${both.fpm.toFixed(0)} fpm`);
  assert.ok(oei.fpm > 180 && oei.fpm < 400, `Seminole one engine at Vyse ${oei.fpm.toFixed(0)} fpm`);
  assert.ok(oei.fpm < both.fpm * 0.3, 'one engine loses far more than half the climb (AFH: often 80 % or more)');
  // the dynamic model agrees with the estimate: full power at Vy with the pitch hold
  const s = P.placeInAir(P.newState(), 0, -40000, 2000, 354, V.y, 0, 0, 1), vs = [];
  s.opts.autoRud = true;
  run(s, 40, x => { hands(x, V.y); if (x.t > 15) vs.push(x.out.vsi); });
  const avg = vs.reduce((a, b) => a + b, 0) / vs.length, est = P.steadyState(s, V.y, null, { pwr: 'full', altFt: 2500 }).fpm;
  assert.ok(Math.abs(avg - est) < est * 0.3, `dynamic ${avg.toFixed(0)} fpm vs estimate ${est.toFixed(0)}`);
});

test('physics: the stall warning sounds at a high angle of attack before the critical angle', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 70);
  s.thr = 0; s.ovr = { elev: 0.85, ail: 0, rud: 0 }; let warned = null;
  run(s, 25, x => { x.ovr.ail = clamp(-0.05 * x.out.bank, -1, 1); if (x.out.stallWarn && warned == null) warned = x.out.alpha; });
  assert.ok(warned != null, 'warned'); assert.ok(warned < s.out.aStall, `warned at ${warned.toFixed(1)}° < ${s.out.aStall.toFixed(1)}°`);
});

test('physics: an engine failure in the Archer gives a glide near the best-glide speed (ratio about 8–11)', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 76, 0, 0, 0);
  s.eng[0].failed = true; s.opts.autoRud = true; const vs = [], gs = [];
  run(s, 50, x => { hands(x, 76); if (x.t > 20) { vs.push(x.out.vsi); gs.push(x.out.gs); } });
  assert.ok(!P.engineRunning(s), 'the engine is stopped');
  const v = vs.reduce((a, b) => a + b, 0) / vs.length, g = gs.reduce((a, b) => a + b, 0) / gs.length, ratio = g * 101.3 / -v;
  assert.ok(Math.abs(s.out.ias - 76) < 8, `ias ${s.out.ias.toFixed(0)}`); assert.ok(ratio > 7 && ratio < 12, `glide ratio ${ratio.toFixed(1)} (${v.toFixed(0)} fpm)`);
});

test('physics: Seminole one engine out — the rudder needed grows as the speed falls and reaches full rudder at the red line (Vmc 56 kt, 5° bank)', () => {
  const hold = kias => {
    const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 1000, 354, kias + 10, 0, 0, 1);
    s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.thr = 1; s.ovr = { elev: 0, ail: 0, rud: 0 };
    let eI = 0, pT = s.out.pitch, drift = 0, rud = 0;
    for (let i = 0; i < 120 * 40 && !s.crashed; i++) {
      const o = s.out, tgt = i < 120 * 15 ? kias + 10 - 10 * i / (120 * 15) : kias;
      pT = clamp(pT + (o.ias - tgt) * 0.5 / 120, -10, 30); eI = clamp(eI + (pT - o.pitch) * 0.02 / 12, -1, 1);
      s.ovr.elev = clamp(0.06 * (pT - o.pitch) - 0.03 * s.w[0] / P.DEG + eI, -1, 1);
      s.ovr.ail = clamp(0.06 * (5 - o.bank) + 0.02 * s.w[2] / P.DEG, -1, 1);
      s.ovr.rud = clamp(-0.25 * P.wrap180(o.hdgTrue - 354) + 0.5 * s.w[1] / P.DEG + (s.rudNeed || 0), -1, 1);
      P.step(s, DT);
      if (i > 120 * 15) { drift = Math.max(drift, Math.abs(P.wrap180(s.out.hdgTrue - 354))); rud = Math.max(rud, Math.abs(s.ovr.rud)); }
    }
    return { drift, rud };
  };
  const h70 = hold(70), h62 = hold(62), h56 = hold(56);
  assert.ok(h70.drift < 10 && h70.rud < 0.75, `70 kt: heading held with ${h70.rud.toFixed(2)} rudder`);
  assert.ok(h62.rud > h70.rud + 0.08, `62 kt: more rudder ${h62.rud.toFixed(2)}`);
  assert.ok(h56.rud > 0.97, `56 kt: full rudder ${h56.rud.toFixed(2)} — no margin left (the red line)`);
});

test('physics: feathering the dead engine\'s propeller reduces drag (better climb or less descent at Vyse)', () => {
  const fly = feather => { const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 4000, 354, 88, 0, 0, 1); s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.eng[0].feather = feather; s.opts.autoRud = true; const vs = [];
    run(s, 40, x => { hands(x, 88, s.eng[0].failed ? 3 : 0); if (x.t > 20) vs.push(x.out.vsi); }); return vs.reduce((a, b) => a + b, 0) / vs.length; };
  const f = fly(true), w = fly(false);
  assert.ok(f > w + 100, `feathered ${f.toFixed(0)} fpm vs windmilling ${w.toFixed(0)} fpm`);
});

// ------------------------------------------------------------------ the school (Sorajima's instructor engine)
test('syllabus: the lessons follow the published course order, each says what, why, how (keys) and the standard', () => {
  const L = flightLessons();
  assert.ok(L.length >= 30, `${L.length} flight lessons`);
  assert.deepEqual(SY.STAGES.map(s => s.phase), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  for (const l of L) {
    assert.ok(l.title && l.goal && l.why && l.std && Array.isArray(l.brief) && l.brief.length >= 1, `${l.id} brief`);
    assert.ok(['pa28', 'pa44'].includes(l.aircraft), `${l.id} aircraft`);
    assert.ok(l.steps.length >= 1 && l.steps.every(S => S.say || S.checklist || S.atc || S.name), `${l.id} steps`);
    assert.ok(l.steps.some(S => S.keys), `${l.id}: at least one step says which keys to use`);
    for (const b of l.book || []) assert.ok(BK.findSection(b), `${l.id} book ${b}`);
  }
  assert.ok(L.filter(l => l.aircraft === 'pa44').length >= 5, 'Seminole lessons');
});

test('school: every flight lesson starts at all three levels and runs without NaN', () => {
  for (const l of flightLessons()) for (const lv of SC.LEVELS) {
    const L = SC.startLesson(l.id, lv.id);
    for (let i = 0; i < 120 * 3 && !L.done; i++) { P.step(L.s, DT); SC.update(L, DT); }
    const c = L.last;
    for (const k of ['alt', 'kias', 'hdg', 'vs', 'pitch', 'bank']) assert.ok(Number.isFinite(c[k]), `${l.id} ${lv.id} ${k}=${c[k]}`);
    assert.ok(!L.done || L.def.steps.length === 0, `${l.id} ${lv.id} ended at once: ${L.reason}`);
    assert.ok(L.sayText || L.atc || L.check, `${l.id} the instructor says something`);
  }
});

test('levels: 導入 widens the tolerances and halves the hold, 精度 narrows them and hides the hints', () => {
  const [a, b, c] = SC.LEVELS;
  assert.deepEqual([a.name, b.name, c.name], ['導入', '基礎', '精度']);
  assert.ok(a.k > b.k && b.k > c.k && b.k === 1); assert.ok(a.holdK < b.holdK && b.holdK < c.holdK);
  assert.ok(a.hints && b.hints && !c.hints);
});

test('continuous hold: the timer counts only while every target is inside, and resets to zero when one goes out', () => {
  const L = SC.startLesson('a2', 'basic'), bot = makeBot(FL);
  while (!L.def.steps[L.step].hold) { bot.fly(L, DT); P.step(L.s, DT); SC.update(L, DT); }
  for (let i = 0; i < 120 * 60 && L.st.holdT < 4; i++) { bot.fly(L, DT); P.step(L.s, DT); SC.update(L, DT); }
  const before = L.st.holdT; assert.ok(before > 3, `held ${before.toFixed(1)} s`);
  L.s.pos[1] += 400 / P.FT; P.derive(L.s);                                 // 400 ft too high: out of ±100
  P.step(L.s, DT); SC.update(L, DT);
  assert.equal(L.st.holdT, 0, 'reset when out'); assert.ok(L.st.holdBest >= before - 0.1, 'the best hold is remembered');
});

test('grading: ≥ 85 % of the time inside and the largest deviation within 1.6 × the tolerance; S / A / B / C', () => {
  const L = runLesson(FL, 'a2', 'basic', 400);
  assert.ok(L.done && L.passed, `a2 passed: ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  assert.ok(['S', 'A', 'B'].includes(L.grade));
  const rows = L.results.flatMap(r => r.rows);
  assert.ok(rows.some(r => /連続保持/.test(r.name)), 'the continuous hold is graded');
  // a step flown badly fails: the same lesson with the throttle left at idle
  const bad = runLesson(FL, 'a2', 'basic', 400, Lx => { Lx.s.thr = 0; });
  assert.ok(bad.done && !bad.passed && bad.grade !== 'S', `idle: ${bad.grade}`);
});

test('the scripted pilot flies and passes the lessons a script can fly (Archer, Seminole, instruments, navigation)', () => {
  const fails = [];
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't1', 't3', 't4', 'e1', 'e2', 'e3', 'c1', 'x3', 'n1', 'n2', 'n3', 'i3', 'i4', 'i5', 'm1', 'm2', 'm3', 'm4']) {
    const L = runLesson(FL, id, 'basic', 1200);
    if (!(L.done && L.passed)) fails.push(`${id}: ${L.grade} ${L.reason} ${L.results.flatMap(r => r.rows).filter(r => !r.pass).map(r => r.name + ' ' + r.val).join(' / ')}`);
  }
  assert.deepEqual(fails, []);
});

test('checklists and ATC: an item that is not set is refused until it is set; a wrong read-back is graded as wrong', () => {
  const L = SC.startLesson('t1', 'basic');
  assert.ok(L.check, 't1 starts with the before-takeoff checklist');
  L.s.flapIdx = 2;                                                          // flaps not up
  let refused = null;
  for (let n = 0; n < 20 && L.check; n++) { const it = SC.checklistItem(L), r = SC.checklistNext(L); if (!r.ok) { refused = it[0]; L.s.flapIdx = 0; L.s.trim = 0; L.s.thr = 0; } }
  assert.equal(refused, 'フラップ'); assert.equal(L.check, null, 'the checklist is complete');
  P.step(L.s, DT); SC.update(L, DT);
  assert.ok(L.atc, 'then the read-back to the tower');
  const r = SC.answerAtc(L, (L.atc.ok + 1) % L.atc.opts.length);
  assert.equal(r.ok, false); assert.match(L.results.at(-1).rows[0].val, /誤り/);
  const I = SC.startLesson('i5', 'basic'); assert.ok(I.atc, 'the ILS starts with the approach clearance'); assert.equal(SC.answerAtc(I, I.atc.ok).ok, true);
});

test('diversion estimate (n2): within the tolerance passes, far off fails', () => {
  const L = SC.startLesson('n2', 'basic'), t = SY.estimateTruth(L);
  SY.submitEstimate(L, { hdg: t.brg + 5, dist: t.dist * 1.1, eteMin: t.eteMin * 0.9 });
  assert.ok(SY.estimateRows(L).every(r => r.pass), JSON.stringify(SY.estimateRows(L)));
  SY.submitEstimate(L, { hdg: t.brg + 60, dist: t.dist * 2, eteMin: '' });
  assert.ok(SY.estimateRows(L).some(r => !r.pass));
});

test('failures: the AHRS lesson fails the AHRS, the Seminole lessons fail an engine, and auto-rudder is off for one engine', () => {
  const i3 = runLesson(FL, 'i3', 'basic', 12);
  assert.equal(i3.av.fail.ahrs, true);
  const m2 = runLesson(FL, 'm2', 'basic', 60);
  assert.ok(m2.s.eng.some(e => e.failed), 'an engine failed'); assert.equal(m2.s.opts.autoRud, false, 'no automatic rudder with one engine');
});

// ------------------------------------------------------------------ the record (localStorage + JSON)
test('record: saved fields, the "not a logbook" note, and no key or token — even pasted into the memo', () => {
  const st = memStore(), KEY = ['AIza', 'FAKE', '-TEST-KEY-not-a-real-key-0123456789'].join('');   // built at run time: no key-like literal in the source
  const L = runLesson(FL, 'a1', 'intro', 200);
  const rec = SC.addRecord(st, SC.recordFromLesson(L, `メモ ${KEY} と token=abcdefghijklmnop`));
  for (const f of ['lessonId', 'datetime', 'level', 'aircraft', 'result', 'grade', 'passPct', 'steps', 'altHist', 'spdHist', 'events', 'memo', 'note']) assert.ok(f in rec, f);
  assert.match(rec.note, /正式な飛行日誌（logbook）ではなく/);
  assert.ok(!st.dump().includes(KEY) && !st.dump().includes('abcdefghijklmnop'), 'no key in storage');
  assert.ok(!SC.exportJSON(SC.loadRecords(st), {}).includes(KEY), 'no key in the export');
  assert.ok(!('flightHours' in rec) && !('pilotName' in rec) && !('email' in rec));
});

test('record import: unknown fields (an API key, map data) are dropped; malformed files are refused', () => {
  const evil = JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record', records: [{ id: 'r1', lessonId: 'a4', level: 'basic', aircraft: 'pa28', datetime: '2026-01-02T03:04:05Z', result: 'pass', grade: 'A', apiKey: 'AI' + 'zaSECRETSECRETSECRETSECRET123', googleTiles: [1, 2, 3], altHist: [1, 'x', 3], memo: 'ok' }, { lessonId: 'nope' }], progress: { quiz: { q_aero: 90, 'bad key!': 5 }, read: ['aero.forces', 'x'.repeat(80)], atc: { luaw: true, 'bad key!': true } } });
  const j = SC.importJSON(evil);
  assert.equal(j.records.length, 1);
  const r = j.records[0]; assert.ok(!('apiKey' in r) && !('googleTiles' in r)); assert.deepEqual(r.altHist, [1, 3]);
  assert.ok(!JSON.stringify(j).includes('SECRET'));
  assert.deepEqual(j.progress.read, ['aero.forces']); assert.deepEqual(j.progress.quiz, { q_aero: 90 }); assert.deepEqual(Object.keys(j.progress.atc), ['luaw']);
  assert.throws(() => SC.importJSON('{"app":"other"}'), /学習記録ファイルではありません/);
  assert.throws(() => SC.importJSON('not json'), /JSON/);
});

test('works without Google: every lesson runs and its record is written with no Google module and no network', () => {
  assert.equal(FL.google3d, undefined, 'google3d.js not loaded here');
  const st = memStore();
  for (const l of flightLessons()) { const L = SC.startLesson(l.id, 'intro'); for (let i = 0; i < 120; i++) { P.step(L.s, DT); SC.update(L, DT); } SC.addRecord(st, SC.recordFromLesson(L, '')); }
  assert.equal(SC.loadRecords(st).length, flightLessons().length);
});

// ------------------------------------------------------------------ the textbook, the tests, Sanford
test('textbook: ≥ 16 chapters in the six parts, each with sections, English terms, examples, cautions, ≥ 2 questions with reasons and sources', () => {
  assert.ok(BK.CHAPTERS.length >= 16, `${BK.CHAPTERS.length} chapters`);
  assert.deepEqual([...new Set(BK.CHAPTERS.map(c => c.part))], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  const ids = new Set();
  for (const c of BK.CHAPTERS) {
    assert.ok(c.t && c.en && c.summary && c.secs.length >= 2, `${c.id} text`);
    for (const s of c.secs) { assert.ok(!ids.has(s.id), `duplicate section ${s.id}`); ids.add(s.id); assert.ok(BK.text(s).length > 200, `${s.id} too short`); }
    assert.ok(c.terms.length >= 3 && c.terms.every(t => t[0] && t[1]), `${c.id} terms`);
    assert.ok(c.examples.length >= 1 && c.cautions.length >= 1, `${c.id} examples / cautions`);
    assert.ok(c.quiz.length >= 2, `${c.id} questions`);
    for (const q of c.quiz) { assert.ok(q.q && q.why && q.choices.length >= 3); assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length); }
    assert.ok(c.refs.length >= 1 && c.refs.every(r => r && /^https:\/\//.test(r.url)), `${c.id} refs`);
    for (const id of c.lessons || []) assert.ok(SC.lesson(id), `${c.id} lesson ${id}`);
  }
  assert.ok(ids.size >= 80, `${ids.size} sections`);
});

test('textbook: every cross-link resolves (sections, lessons, calculators) and the disclaimer is in the book', () => {
  const lessons = new Set(SC.lessonOrder());
  for (const c of BK.CHAPTERS) for (const s of c.secs) {
    const h = BK.html(s);
    for (const m of h.matchAll(/data-sec="([^"]+)"/g)) assert.ok(BK.findSection(m[1]), `${s.id} → ${m[1]}`);
    for (const m of h.matchAll(/data-lesson="([^"]+)"/g)) assert.ok(lessons.has(m[1]), `${s.id} → lesson ${m[1]}`);
    for (const m of h.matchAll(/data-calc="([^"]+)"/g)) assert.equal(typeof FL.bookCalc[m[1]], 'function', `${s.id} → calc ${m[1]}`);
  }
  const all = BK.CHAPTERS.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
  assert.match(all, /本アプリは公開情報を基にした非公式の自主学習用教材です。/);
  for (const w of ['Vmc', 'METAR', '91.155', 'ゴーアラウンド', 'ILS', 'TEM', 'IMSAFE', '偏流修正']) assert.ok(all.includes(w), w);
});

test('ground-school tests: ≥ 12 banks of 4-choice questions with reasons, linked to the textbook', () => {
  assert.ok(QZ.BANKS.length >= 12);
  const lessons = new Set(SC.lessonOrder());
  let n = 0;
  for (const b of QZ.BANKS) {
    assert.ok(b.title && BK.findSection(b.book), `${b.id} book link`); assert.ok(!lessons.has(b.id), `${b.id} collides with a lesson id`);
    assert.ok(b.qs.length >= 8, `${b.id} questions`);
    for (const q of b.qs) { n++; assert.equal(q[1].length, 4, q[0]); assert.equal(new Set(q[1]).size, 4, q[0]); assert.ok(Number.isInteger(q[2]) && q[2] >= 0 && q[2] < 4 && q[3], q[0]); }
  }
  assert.ok(n >= 120, `${n} questions`);
});

test('Sanford: the four runways, the hot spot, the airspace, a schematic labelled NOT FOR NAVIGATION, ≥ 4 ATC scenes', () => {
  assert.deepEqual(SF.RUNWAYS.map(r => r.id), ['09L/27R', '09C/27C', '09R/27L', '18/36']);
  const facts = SF.FACTS.map(f => f.t).join(' ');
  for (const w of ['HS1', '27C', 'Class C', 'Class B', 'Line Up and Wait']) assert.ok(facts.includes(w), w);
  const svg = SF.diagramSvg(); assert.match(svg, /NOT FOR NAVIGATION/); assert.match(svg, /模式図/);
  assert.ok(SF.SCENES.length >= 4);
  for (const s of SF.SCENES) { assert.ok(s.atc && s.why && s.clarify && s.options.length >= 3); assert.ok(s.answer >= 0 && s.answer < s.options.length); }
});

// ------------------------------------------------------------------ English radio (the textbook's five chapters and the practice page)
const RD = FL.radio;
test('radio textbook: five chapters before "human factors", numbered in order; every {ch:} reference resolves; no hard-coded chapter number is wrong', () => {
  const ids = BK.CHAPTERS.map(c => c.id), at = ids.indexOf('radio1');
  assert.deepEqual(ids.slice(at, at + 6), ['radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf']);
  BK.CHAPTERS.forEach((c, i) => assert.equal(c.n, i + 1, c.id));
  const every = [...BK.CHAPTERS.flatMap(c => [c.summary, ...(c.examples || []), ...(c.cautions || []), ...c.quiz.flatMap(q => [q.q, q.why]), ...c.secs.map(s => BK.html(s))]), ...QZ.BANKS.flatMap(b => b.qs.flatMap(q => [BK.fix(q[0]), BK.fix(q[3])]))].join('\n');
  assert.doesNotMatch(BK.fix(every), /\{ch:|（別の章）/);
  assert.equal(BK.fix('{ch:crm}'), `第 ${BK.CHAPTERS.find(c => c.id === 'crm').n} 章`);
  const radio = BK.CHAPTERS.filter(c => /^radio/.test(c.id)), text = radio.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
  assert.ok(radio.reduce((a, c) => a + c.secs.length, 0) >= 20, 'sections');
  for (const w of ['AIM 4-2-3', 'AIM 4-3-18', 'AIM 4-4-7', 'AIM 3-2-4', 'AIM 4-1-9', 'AIM 6-3', '91.185', 'line up and wait', 'cleared for takeoff', 'Say again', 'Wilco', 'Unable', 'MAYDAY', 'PAN-PAN', '7600', 'CTAF', 'decimal', 'QNH', 'student pilot']) assert.ok(text.includes(w), w);
  assert.doesNotMatch(text, /gusts/i, 'gust phraseology was not verified');
});

test('radio: numbers are said as the AIM shows (4-2-8 … 4-2-12) and the controller phrases as JO 7110.65', () => {
  const S = RD.SAY;
  for (const [ft, w] of [[500, 'five hundred'], [4500, 'four thousand five hundred'], [10000, 'one zero thousand'], [13500, 'one three thousand five hundred'], [12000, 'one two thousand'], [12500, 'one two thousand five hundred'], [19000, 'flight level one niner zero'], [27500, 'flight level two seven five']]) assert.equal(S.altitude(ft), w, ft);
  assert.equal(S.freq('122.1'), 'one two two point one');
  assert.equal(S.freq('119.75'), 'one one niner point seven five');
  assert.equal(S.heading(5), 'heading zero zero five'); assert.equal(S.heading(100), 'heading one zero zero'); assert.equal(S.heading(0), 'heading three six zero');
  assert.equal(S.speed(250), 'two five zero knots'); assert.equal(S.speed(190), 'one niner zero knots');
  assert.equal(S.time('0920'), 'zero niner two zero Zulu');
  assert.equal(S.digits('10'), 'one zero');
  assert.equal(S.altimeter('30.01'), 'altimeter three zero zero one');
  assert.equal(S.squawk('0425'), 'squawk zero four two five');
  assert.equal(S.runway('9R'), 'runway niner right'); assert.equal(S.runway('27C'), 'runway two seven center'); assert.equal(S.runway('36'), 'runway three six');
  assert.equal(S.wind(220, 15), 'wind two two zero at one five'); assert.equal(S.wind(100, 2), 'wind calm');
  assert.equal(S.spell('N7LA'), 'November seven Lima Alfa');
  assert.equal(RD.ALPHA.length, 26); assert.equal(RD.DIGW[9], 'niner');
});

test('radio: a whole flight in order (ATIS → ground → tower → departure → approach → tower → ground), every call with its meaning', () => {
  assert.deepEqual(RD.FLIGHT.map(p => p.id), ['atis', 'gnd1', 'twr1', 'dep', 'app', 'twr2', 'gnd2']);
  const lines = RD.FLIGHT.flatMap(p => p.lines), said = lines.filter(l => l[0] !== 'ACT');
  assert.ok(said.length >= 30, `${said.length} calls`);
  for (const p of RD.FLIGHT) assert.ok(BK.findSection(p.sec), p.sec);
  for (const [who, en, jp] of lines) { assert.ok(RD.WHO[who], who); assert.ok(jp && jp.length > 3, en); if (who !== 'ACT') assert.ok(en.length > 8); }
  // every read-back carries the call sign; the first call to each facility uses the full call sign
  for (const [who, en] of said) if (who === 'P') assert.match(en, /Archer (Seven Lima Alpha|7LA)/, en);
  const seen = new Set();
  for (const [who, en] of said) { const m = who === 'P' && /^LAB (Ground|Tower|Departure|Approach),/.exec(en); if (m && !seen.has(m[1])) { seen.add(m[1]); assert.match(en, /Archer Seven Lima Alpha/, en); } }
  assert.equal(seen.size, 4);
  const all = said.map(l => l[1]).join(' ');
  for (const w of ['information Bravo', 'hold short of taxiway Charlie', 'line up and wait', 'cleared for takeoff', 'radar contact', 'squawk VFR', 'cleared to land', 'contact Ground point seven']) assert.ok(all.includes(w), w);
  assert.equal(RD.tts('Contact departure, Archer 7LA.'), 'Contact departure, Archer Seven Lima Alpha.');
});

test('radio: ≥ 30 read-back / response scenes in every phase (the six Sanford scenes kept by id), each with one right answer, a reason and sources', () => {
  assert.ok(RD.SCENES.length >= 30, `${RD.SCENES.length}`);
  const ids = new Set(); for (const sc of RD.SCENES) { assert.ok(!ids.has(sc.id), sc.id); ids.add(sc.id); assert.match(sc.id, /^[a-z0-9_]{1,20}$/); }
  for (const s of SF.SCENES) assert.ok(ids.has(s.id), s.id);
  for (const [g] of RD.GROUPS) assert.ok(RD.SCENES.filter(s => s.g === g).length >= 2, g);
  for (const sc of RD.SCENES) {
    assert.equal(sc.options.length, 4, sc.id); assert.equal(new Set(sc.options).size, 4, sc.id);
    assert.ok(Number.isInteger(sc.answer) && sc.answer >= 0 && sc.answer < 4, sc.id);
    assert.ok(sc.title && sc.situation && sc.q && sc.why && sc.clarify, sc.id);
    assert.ok(sc.refs.length && sc.refs.every(k => RD.ref(k) && /^https:\/\//.test(RD.ref(k).url)), sc.id);
  }
  // the progress keeps a scene id (the same rule as the record)
  const p = SC.sanitizeProgress({ atc: Object.fromEntries(RD.SCENES.map(s => [s.id, true])) });
  assert.equal(Object.keys(p.atc).length, RD.SCENES.length);
});

test('radio drills and listening: four different choices, the right one among them, for every kind (1,000 draws)', () => {
  const rng = RD.mulberry(42);
  for (let k = 0; k < 100; k++) for (const [set] of RD.DRILL_SETS) for (const q of RD.drill(10, rng, set)) {
    assert.equal(q.opts.length, 4, q.q); assert.equal(new Set(q.opts).size, 4, q.q); assert.ok(q.opts.includes(q.ok), q.q); assert.ok(q.why, q.q);
  }
  for (let k = 0; k < 100; k++) for (const q of RD.listen(10, rng)) { assert.equal(new Set(q.opts).size, 4, q.q); assert.ok(q.opts.includes(q.ok)); assert.ok(q.say.length > 10); }
  assert.ok(RD.GLOSSARY.length >= 50);
  for (const g of RD.GLOSSARY) assert.ok(g[0] && g[1] && g[3] && g[4], g[0]);
  // the ground-school stage has the four radio lessons, and the practical test bank exists
  for (const id of ['k3', 'k4', 'k5', 'k6']) assert.ok(SC.lesson(id) && SC.lesson(id).radio, id);
  assert.ok(QZ.BANKS.find(b => b.id === 'q_radio'));
});
