// CADET Godot port — Phase 2b JS 参照値ジェネレータ (school / syllabus / controls)
// 移植元 (898fe8a): flight-lab/src/{physics,avionics,school,syllabus}.js と
// cadet/src/flight/controls.js を Node で FL グローバルに組み立て、単純な規則ベースの
// スクリプトパイロット (test/run_tests2b.gd 側と同一ロジック) で a1 / t1 / t2 / t3 を
// 駆動し、ステップ遷移・スコア・合否・履歴を test/reference2b.json に書き出す。
// 併せて controls の駆動・アクション、記録/進捗の整形、ガイド文・ATC・チェックリストの
// 文字列も参照値化する。
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const LAB = path.join(here, '..', '..', 'cadet-wt-next', 'flight-lab', 'src');
const CAD = path.join(here, '..', '..', 'cadet-wt-next', 'cadet', 'src');
for (const n of ['physics.js', 'avionics.js', 'school.js', 'syllabus.js'])
  vm.runInThisContext(fs.readFileSync(path.join(LAB, n), 'utf8'), { filename: n });
const FL = globalThis.FL;
const P = FL.physics, SC = FL.school, SY = FL.syllabus;
const CT = await import(pathToFileURL(path.join(CAD, 'flight', 'controls.js')).href);

// ---------------------------------------------------------------- the scripted pilot
// (規則ベース: 目標姿勢・出力へのフィードバックのみ。GDScript 側と一字一句同じ規則)
function makePilot() {
  const clamp = P.clamp;
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const st = { pBase: null, iThr: 0, lastIas: null, lastStep: -1, flare: false, p0: 0, base: null };
  function reset() { st.pBase = null; st.iThr = 0; st.lastIas = null; st.flare = false; st.base = null; }
  function pitchTo(s, deg) { s.keyHold = true; s.pTgt = clamp(deg, -20, 22); s.pRate = 0; }
  function bankTo(s, bankT) { const o = s.out, p = -s.w[2] / (Math.PI / 180); s.rIn = clamp(0.045 * (bankT - o.bank) - 0.012 * p, -1, 1); }
  function headTo(s, c, hdgT, maxBank = 25) { bankTo(s, clamp(w180(hdgT - c.hdg) * 1.5, -maxBank, maxBank)); }
  function speedThr(s, c, kt, dt) { const e = kt - c.kias; st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + st.iThr * 0.5) * dt * 2, 0, 1); }
  function speedPitch(s, c, kt, dt) {
    const dv = st.lastIas == null ? 0 : (c.kias - st.lastIas) / dt;
    if (st.pBase == null) st.pBase = c.pitch;
    st.pBase = clamp(st.pBase + (c.kias - kt) * 0.05 * dt, -15, 18);
    pitchTo(s, st.pBase + 0.35 * (c.kias - kt) + 1.5 * dv);
  }
  function vsPitch(s, c, vsT, dt) {
    if (st.pBase == null) st.pBase = c.pitch;
    st.pBase = clamp(st.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15);
    pitchTo(s, st.pBase + (vsT - c.vs) * 0.004);
  }
  const altVs = (c, alt) => clamp((alt - c.alt) * 3, -700, 700);
  function fly(L, dt) {
    const s = L.s, c = L.last, S = L.def.steps[L.step];
    if (!S || L.done) return;
    if (L.step !== st.lastStep) { st.lastStep = L.step; reset(); }
    if (S.checklist && L.check) {
      if (S.checklist.includes('landing')) { s.flapIdx = Math.max(s.flapIdx, 3); if (!s.A.gear.fixed) s.gearDown = true; s.mix = 1; s.fuelSel = s.fuel[1] > s.fuel[0] ? 'R' : 'L'; }
      if (S.checklist.includes('takeoff')) { s.flapIdx = 0; s.trim = 0; s.thr = 0; s.fuelSel = s.fuel[1] > s.fuel[0] ? 'R' : 'L'; }
      SC.checklistNext(L); return;
    }
    if (S.atc && L.atc) { SC.answerAtc(L, L.atc.ok); return; }
    s.opts.autoRud = true;
    const g = (S.g && typeof S.g === 'object') ? S.g : {};
    const name = S.name || '';
    const tv = k => { const sp = S.tgt && S.tgt[k]; return sp ? (typeof sp[0] === 'function' ? sp[0](L, c) : sp[0]) : null; };
    if (name.includes('接地')) {
      if (c.onGround) { s.thr = 0; s.brake = c.gsK < 60; s.opts.autoRud = false; s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1); st.lastIas = c.kias; return; }
      const crab = w180(c.hdg - c.trk);
      headTo(s, c, 360 - clamp(c.cross * 0.5, -8, 8) - clamp(c.latV * 2, -6, 6) + (c.aglR > 12 ? crab : 0), 8);
      if (c.aglR < 16 || st.flare) {
        if (!st.flare) { st.flare = true; st.p0 = c.pitch; }
        s.thr = 0; pitchTo(s, clamp(st.p0 + (16 - c.aglR) / 16 * 8 + clamp((-c.vs - 150) * 0.01, 0, 3), -2, 8));
      } else {
        const vsT = -(c.gsK * 5.3) - clamp((c.gp - 3) * 250, -300, 300);
        vsPitch(s, c, vsT, dt); speedThr(s, c, g.kt || L.V.appr - 2, dt);
      }
      st.lastIas = c.kias; return;
    }
    if (c.onGround && (name.includes('離陸') || name.includes('ローテーション') || name.includes('滑走'))) {
      s.brake = false; s.thr = 1; s.opts.autoRud = false;
      s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1);
      s.pIn = c.kias > L.V.rotate - 1 ? 0.65 : 0; s.rIn = 0; st.lastIas = c.kias; return;
    }
    if (g.flaps != null && s.flapIdx !== g.flaps) s.flapIdx = g.flaps;
    const how = g.how || 'level';
    const altT = tv('alt') != null ? tv('alt') : L.alt0;
    let hdgT = tv('hdg') != null ? tv('hdg') : L.hdg0;
    if (S.tgt && S.tgt.rhdg) hdgT = 360;
    if (S.tgt && S.tgt.dwhdg) hdgT = 180;
    if (how === 'climbFull') { s.thr = 1; speedPitch(s, c, g.kt, dt); headTo(s, c, (S.tgt && S.tgt.rhdg) ? 360 : hdgT); }
    else if (how === 'turn') { const dir = name.includes('左') ? -1 : 1; speedThr(s, c, g.kt, dt); vsPitch(s, c, altVs(c, altT), dt); bankTo(s, dir * ((S.tgt && S.tgt.abank) ? S.tgt.abank[0] : (g.bank || 30))); }
    else if (how === 'rate') {
      if (st.base == null) { st.base = clamp(P.steadyState(s, g.kt, g.fpm || 0, { altFt: c.alt }).thr, 0, 1); s.thr = st.base; }
      vsPitch(s, c, g.fpm || 0, dt);
      const e = g.kt - c.kias; st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.3, 0.3); s.thr = clamp(st.base + e * 0.02 + st.iThr, 0, 1);
      headTo(s, c, hdgT);
    }
    else if (how === 'approach' || how === 'ils' || how === 'pattern') {
      const vsT = how === 'ils' ? -(c.gsK * 5.3) + clamp(c.gsd * 2.5, -2, 2) * 200 : how === 'pattern' ? (g.fpm || -500) : -(c.gsK * 5.3) - clamp((c.gp - 3) * 250, -300, 300);
      vsPitch(s, c, vsT, dt); speedThr(s, c, g.kt, dt);
      let h = hdgT;
      if (name.includes('ベース')) h = Math.abs(c.cross) > 400 ? 90 : 360 - clamp(c.cross * 0.3, -25, 25);
      else if (how === 'approach') h = 360 - clamp(c.cross * 0.12, -30, 30) + (c.gsK > 30 ? w180(c.hdg - c.trk) : 0);
      headTo(s, c, h, 20);
    }
    else if (how === 'slow') {
      speedPitch(s, c, g.kt, dt);
      const e = altT - c.alt; st.iThr = clamp(st.iThr + e * 0.0004 * dt, -0.3, 0.3); s.thr = clamp(0.55 + e * 0.004 + st.iThr, 0, 1);
      headTo(s, c, hdgT, 10);
    }
    else if (how === 'glide' || g.pwr === 'dead') { s.thr = 0; speedPitch(s, c, g.kt, dt); headTo(s, c, hdgT); }
    else { speedThr(s, c, g.kt || 100, dt); vsPitch(s, c, altVs(c, altT), dt); headTo(s, c, hdgT); }
    st.lastIas = c.kias;
  }
  return { fly };
}

function runLesson(id, levelId, maxSec) {
  const dt = 1 / 120, pilot = makePilot();
  const L = SC.startLesson(id, levelId);
  const start = {
    alt0: L.alt0, hdg0: L.hdg0, windStr: L.windStr, guideText: L.guideText, sayText: L.sayText, keysText: L.keysText,
    av: { baro: L.av.baro, hdgBug: L.av.hdgBug, altSel: L.av.altSel, cdi: L.av.cdi, crs: L.av.crs },
    ctx: { alt: L.last.alt, altTrue: L.last.altTrue, aglR: L.last.aglR, kias: L.last.kias, hdg: L.last.hdg, along: L.last.along, cross: L.last.cross, thr: L.last.thr, flaps: L.last.flaps },
    guides: L.def.steps.map(S => ({ name: S.name, guide: SC.stepGuide(S, L), say: S.say ? SC.fillText(S.say, L) : null, keys: S.keys ? SC.fillText(S.keys, L) : null })),
  };
  const trans = [];
  let lastStep = -99, n = 0;
  for (let i = 0; i < maxSec * 120 && !L.done; i++) {
    if (L.step !== lastStep) { lastStep = L.step; trans.push({ at: Math.round(L.t * 1000) / 1000, step: L.step, name: (L.def.steps[L.step] || {}).name || '' }); }
    pilot.fly(L, dt);
    P.step(L.s, dt);
    SC.update(L, dt);
    n++;
  }
  return {
    start, transitions: trans, stepsEntered: lastStep + 1, updates: n,
    final: { done: L.done, passed: L.passed, grade: L.grade, score: L.score, passPct: L.passPct, t: Math.round(L.t * 1000) / 1000, results: L.results, histAlt: L.hist.alt, histIas: L.hist.ias, landings: L.landings || 0 },
    L,
  };
}

const R = {};
// ---------------------------------------------------------------- meta / guides / atc / checklists / free starts
R.meta = SY.STAGES.map(st => ({
  id: st.id, title: st.title, phase: st.phase, desc: st.desc,
  lessons: st.lessons.map(l => {
    const o = {};
    for (const k of ['id', 'title', 'goal', 'aircraft', 'tutor', 'read', 'radio', 'book', 'why', 'brief', 'std', 'setup', 'autoRud'])
      if (l[k] !== undefined) o[k] = l[k];
    o.nSteps = (['a1', 't1', 't2', 't3'].includes(l.id) && l.steps) ? l.steps.length : -1; // -1 = not ported yet (Phase 3)
    return o;
  }),
}));
{
  const L = SC.startLesson('t1', 'intro');
  R.atc = {};
  for (const k of ['takeoff', 'landing', 'pattern', 'climb', 'ils', 'rnav', 'divert', 'mayday', 'lost', 'oei']) R.atc[k] = SC.ATC_Q[k](L);
  R.checklists = {};
  for (const id of ['before_takeoff', 'before_landing', 'cruise', 'ms_before_takeoff', 'ms_before_landing', 'cx_before_takeoff', 'cx_before_landing', 'ms_engine_failure']) {
    const C = SC.CHECKLISTS[id];
    R.checklists[id] = { title: C.title, items: C.items.map(it => [it[0], SC.checklistText(it, L.s), !!it[2]]) };
  }
  // checklistText for the landing list reads the final state (flaps down) — use t3's state too
  const L3 = SC.startLesson('t3', 'intro');
  R.checklists.before_landing_final = { title: SC.CHECKLISTS.before_landing.title, items: SC.CHECKLISTS.before_landing.items.map(it => [it[0], SC.checklistText(it, L3.s), !!it[2]]) };
}
R.freeStarts = {};
for (const fs of SC.FREE_STARTS) {
  const L = SC.startFree(fs.id);
  R.freeStarts[fs.id] = { alt0: L.alt0 ?? null, hdg0: L.hdg0 ?? null, av: { baro: L.av.baro, hdgBug: L.av.hdgBug, altSel: L.av.altSel, cdi: L.av.cdi }, ctx: { alt: L.last.alt, aglR: L.last.aglR, kias: L.last.kias, hdg: L.last.hdg, along: L.last.along, cross: L.last.cross, thr: L.last.thr, flaps: L.last.flaps } };
}

// ---------------------------------------------------------------- the lessons, flown
R.lessons = {};
const runs = {};
for (const [key, id, lv, max] of [['a1_intro', 'a1', 'intro', 300], ['a1_basic', 'a1', 'basic', 300], ['t1', 't1', 'intro', 600], ['t2', 't2', 'intro', 900], ['t3', 't3', 'intro', 600]]) {
  const r = runLesson(id, lv, max);
  runs[key] = r;
  const { L, ...rest } = r;
  R.lessons[key] = rest;
  console.log(key, 'done=', r.final.done, 'passed=', r.final.passed, 'grade=', r.final.grade, 'score=', +r.final.score.toFixed(3), 't=', r.final.t, 'steps=', r.stepsEntered);
}

// ---------------------------------------------------------------- controls
{
  const out = {};
  const codes = ['KeyV', 'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyL', 'KeyU', 'BracketLeft', 'BracketRight', 'KeyZ', 'KeyX', 'KeyQ', 'Enter'];
  out.actionForKey = codes.map(c => [c, CT.actionForKey(c, false), CT.actionForKey(c, true)]);
  out.bound = [
    CT.actionForKeyBound('KeyV', false, { flaps: 'KeyC' }), CT.actionForKeyBound('KeyC', false, { flaps: 'KeyC' }), CT.actionForKeyBound('KeyC', true, { flaps: 'KeyC' }),
    CT.actionForKeyBound('KeyT', false, { flaps: 'KeyC', trim: 'KeyV' }), CT.actionForKeyBound('KeyV', false, { flaps: 'KeyC', trim: 'KeyV' }),
    CT.actionForKeyBound('KeyV', false, null), CT.actionForKeyBound('KeyV', false, { bogus: 'KeyC' }), CT.actionForKeyBound('KeyC', false, { flaps: 123 }),
    CT.actionForKeyBound('BracketLeft', true, { restart0: 'KeyP' }), CT.actionForKeyBound('KeyP', true, { restart0: 'KeyP' }),
  ];
  out.prefs0 = CT.PREFS0; out.held0 = CT.HELD0; out.padmap0 = CT.PADMAP0;
  out.padMapOf = [CT.padMapOf(null), CT.padMapOf({ padMap: { pitch: { axis: 3, inv: true, pad: 1, dz: 0.3 }, thr: { axis: 6 }, yaw: null, bogus: { axis: 1 } } }), CT.padMapOf({ padMap: { roll: { axis: 99 } } }), CT.padMapOf({ padMap: { roll: { axis: 2.5 } } })];
  const keysOf = (...cs) => { const s = new Set(cs); s.shift = false; return s; };
  const dt = 1 / 60;
  const saved = [];
  const L = SC.startFree('area');
  const ctl = CT.createControls(FL, { savePrefs: p => saved.push(JSON.parse(JSON.stringify(p))) });
  const samples = [];
  const snap = () => samples.push({ pIn: L.s.pIn, pKey: L.s.pKey ?? 0, rIn: L.s.rIn, thr: L.s.thr, rud: L.s.rud, brake: L.s.brake, pTgt: L.s.pTgt, keyHold: !!L.s.keyHold });
  const drive = (frames, keys) => { for (let i = 0; i < frames; i++) { ctl.update(L, dt, keys, true); P.step(L.s, dt); } snap(); };
  drive(60, keysOf('KeyW'));
  drive(60, keysOf());
  ctl.setPrefs({ hold: 'hold' });
  drive(120, keysOf('KeyS'));
  drive(60, keysOf('KeyR'));
  drive(30, keysOf('KeyB', 'KeyE'));
  drive(30, keysOf());
  out.drive = samples;
  out.actions = [];
  const actState = () => ({ flapIdx: L.s.flapIdx, thr: L.s.thr, trim: L.s.trim, rTrim: ctl.rTrim, parkBrake: ctl.parkBrake, autoRud: !!L.s.opts.autoRud, gearDown: L.s.gearDown });
  for (const [a, arg] of [['flaps'], ['flaps'], ['flapsUp'], ['gear'], ['trim'], ['thrFull'], ['thrIdle'], ['trimReset'], ['level'], ['autoRud'], ['autoRud'], ['rtrimR'], ['rtrimL'], ['trimStep', 1], ['trimStep', -1], ['thrStep', 1], ['thrStep', -1], ['parkBrake'], ['parkBrake'], ['feather0'], ['restart0'], ['nope']]) {
    const text = ctl.action(L, a, arg);
    out.actions.push({ a, arg: arg ?? null, text, kind: ctl.kind, st: actState() });
  }
  out.savedPrefs = saved;
  out.prefs = ctl.prefs;
  // the gamepad: one fake standard pad through getGamepads
  let padState = { axes: [0.6, -0.4, 0.2, 0.0], buttons: Array.from({ length: 18 }, (_, i) => ({ value: [1, 7].includes(i) ? 0 : (i === 0 ? 0 : 0) })) };
  padState.buttons[6] = { value: 0.2 }; padState.buttons[7] = { value: 0.8 }; padState.buttons[1] = { value: 1 };
  const ctl2 = CT.createControls(FL, { getGamepads: () => [{ connected: true, id: 'Fake Pad', mapping: 'standard', ...padState }] });
  const L2 = SC.startFree('area');
  const padSamples = [];
  const padSnap = () => { padSamples.push({ pIn: L2.s.pIn, rIn: L2.s.rIn, thr: L2.s.thr, trim: L2.s.trim, brake: L2.s.brake, padOut: JSON.parse(JSON.stringify(ctl2.padOut)) }); ctl2.padOut.length = 0; };
  for (let f = 0; f < 2; f++) { ctl2.update(L2, dt, keysOf(), true); P.step(L2.s, dt); padSnap(); }
  padState = { axes: [0, 0, 0, 0], buttons: Array.from({ length: 18 }, () => ({ value: 0 })) };
  ctl2.update(L2, dt, keysOf(), true); P.step(L2.s, dt); padSnap();
  padState.buttons[2] = { value: 1 };
  ctl2.update(L2, dt, keysOf(), true); P.step(L2.s, dt); padSnap();
  out.pad = { samples: padSamples, padId: ctl2.padId };
  R.controls = out;
}

// ---------------------------------------------------------------- records / progress
{
  const out = {};
  const rec = SC.recordFromLesson(runs.a1_intro.L, 'test memo sk-abcdefghijklmnop1234 and AIza1234567890123456789012345');
  rec.id = 'ID'; rec.datetime = 'DT';
  out.fromLesson = rec;
  const sanIn = [
    { v: 2, id: 'r-abc_1', lessonId: 'a1', level: 'basic', aircraft: 'pa44', datetime: '2026-10-29T12:34:56.789Z', result: 'pass', grade: 'S', reason: '', passPct: 95.4, practiceSec: 123.6, steps: [{ step: 'x', pass: true, rows: [{ name: 'n', val: 'v key=abcdefgh12345678', std: 's', pass: true }] }], sampleSec: 7, altHist: [100, 200.4, 300], spdHist: [90], events: [{ t: 1.24, type: 'touchdown', fpm: 123.45, kias: 70, onRunway: true, why: 'ok' }, { t: 2, type: 'bogus' }, { t: 3, type: 'crash', why: '湖' }], td: { t: 1, fpm: 100, kias: 65, along: 300, cross: 1.234, bounces: 0 }, memo: 'hello token: abcdefghij' },
    { lessonId: 'nope' },
    { lessonId: 'free', aircraft: 'xx', level: 'weird', result: 'weird', grade: 'Z', datetime: 'garbage', passPct: -5, practiceSec: -3, steps: 'no', altHist: 'no', events: [null, 5], td: 'x', memo: 42 },
    { id: '!!!', lessonId: 't1', datetime: '2026-01-01' },
    null, 42, 'str',
  ];
  out.sanitize = sanIn.map(r => { const o = SC.sanitizeRecord(r); if (o && r && r.id === '!!!') o.id = 'RAND'; return o; });
  const progIn = [
    { lessons: { a1: { tries: 2.6, best: 'A', pass: 1, score: 88.8, levels: ['intro', 'bogus', 'basic', 'precision', 'intro'] }, 'BAD KEY!': { tries: 1 }, t2: { tries: -1, best: 'Z', score: 150 } }, time: 12345.6, landings: 7.4, read: ['aero.1', 'aero.1', 'bad key!', 'ops.trim'], quiz: { q1: 55.5, q2: -3, 'bad!': 10 }, bookQuiz: {}, atc: { takeoff: true, landing: 1, 'x y': true }, kisoRead: ['kiso.1', 'kiso.1', 'nope'], kisoQa: [] },
    {}, null,
  ];
  out.progress = progIn.map(p => SC.sanitizeProgress(p));
  let prog = SC.sanitizeProgress({});
  prog = SC.noteLesson(prog, { id: 'a1', free: false, done: true, passed: true, grade: 'A', score: 0.85, level: SC.level('intro') });
  prog = SC.noteLesson(prog, { id: 'a1', free: false, done: true, passed: false, grade: 'C', score: 0.5, level: SC.level('basic') });
  prog = SC.noteLesson(prog, { id: 't1', free: false, done: true, passed: true, grade: 'S', score: 0.99, level: SC.level('intro') });
  out.noteFlow = prog;
  const sr = i => SC.sanitizeRecord(sanIn[i]);
  out.mergeRecords = SC.mergeRecords([sr(0), { ...sr(0), id: 'r2', datetime: '2026-01-02T00:00:00.000Z', passPct: 10 }], [{ ...sr(0), id: 'r2', datetime: '2026-01-02T00:00:00.000Z', passPct: 77 }, { ...sr(0), id: 'r3', datetime: '2026-01-03T00:00:00.000Z' }]);
  out.mergeProgress = SC.mergeProgress(
    { lessons: { a1: { tries: 3, best: 'B', pass: false, score: 60, levels: ['intro'] } }, time: 100, landings: 5, read: ['aero.1'], quiz: { q1: 40 }, atc: { takeoff: false }, kisoRead: ['kiso.1'], kisoQa: [] },
    { lessons: { a1: { tries: 2, best: 'A', pass: true, score: 55, levels: ['basic'] }, t1: { tries: 1, best: 'S', pass: true, score: 99, levels: [] } }, time: 250, landings: 3, read: ['ops.trim'], quiz: { q1: 30, q2: 80 }, atc: { takeoff: true, landing: true }, kisoRead: [], kisoQa: ['kiso.9'] });
  const storeData = {};
  const store = { getItem: k => (k in storeData ? storeData[k] : null), setItem: (k, v) => { storeData[k] = String(v); } };
  SC.addRecord(store, sanIn[0]);
  SC.addRecord(store, { ...sanIn[0], id: 'r-second', lessonId: 't2', datetime: '2026-11-01T00:00:00.000Z' });
  const loaded = SC.loadRecords(store);
  SC.saveProgress(store, out.noteFlow);
  const loadedProg = SC.loadProgress(store);
  const exp = SC.exportJSON(loaded, loadedProg);
  const expParsed = JSON.parse(exp); expParsed.exported = 'DT';
  const imported = SC.importJSON(exp);
  SC.deleteRecord(store, loaded[0].id);
  const afterDelete = SC.loadRecords(store);
  out.storeFlow = { loaded, loadedProg, expParsed, imported, afterDelete, keys: Object.keys(storeData).sort() };
  R.records = out;
}

fs.writeFileSync(path.join(here, '..', 'test', 'reference2b.json'), JSON.stringify(R));
console.log('reference2b.json written');
