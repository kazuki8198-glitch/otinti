// CADET — flight bridge tests (node --test): CADET flies FLIGHT LAB's lessons exactly as FLIGHT LAB does.
//  - FLIGHT LAB's scripted pilot (flight-lab/test/bot.mjs) flying a lesson through the bridge (runScripted) gives
//    bit-identical results to bot.mjs runLesson: the rows, grade, score, lesson time, position and attitude — for a1 at
//    the three levels, with inputs that change the outcome (the nose held 5° up, the throttle at idle), and for other
//    lessons (a2, t1, the Seminole's m2). Reading the lesson for the HUD changes nothing.
//  - the controls (controls.js) are FLIGHT LAB's: updateControls and doAction are cut out of flight-lab/src/app.js and
//    run beside the port on long random key / dt / action sequences, on the ground and in the air, keyboard and stick;
//    every field of the state stays bit-identical. The key → action table is app.js's.
//  - the realtime path (frame) is app.js tick, also cut out of app.js and compared frame by frame; hands off, a1 passes
//    with S; nothing moves while paused or after the end; the frame dt is clamped and the steps capped.
//  - status() shows the step, the texts, the gauges and the hold (a1), the checklist and the read-back (t1); key() steps
//    the checklist, answers the tower and runs the action keys; the gamepad and CADET's cockpit steps work.
//  - a free flight standing on the apron stand stays put on the parking brake and taxis when it is released; a crash
//    against CADET's own obstacles ends a lesson; the records and the progress go to 'cadet.'-prefixed keys only.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeBot, runLesson } from '../../flight-lab/test/bot.mjs';
import { createFlight, H, MAX_STEPS } from '../src/flight/flight.js';
import { createControls, actionForKey, FLY_HELD, PREFS0 } from '../src/flight/controls.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const FLSRC = path.join(here, '../../flight-lab/src');
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']) vm.runInThisContext(fs.readFileSync(path.join(FLSRC, m), 'utf8'), { filename: m });
const FL = globalThis.FL, P = FL.physics, SC = FL.school;

const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), keys: () => [...m.keys()] }; };
// a seeded generator (the sequences are the same on every run)
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const keySet = (set) => ({ has: c => set.has(c), shift: false });
const NOKEYS = keySet(new Set());
// the state without the aircraft's constant tables (everything the controls, the physics and the school write)
const CONST = new Set(['A', 'AC', 'WHEELS', 'HARDPTS', 'TAILSKID']);
const view = (s) => { const o = {}; for (const k of Object.keys(s)) if (!CONST.has(k)) o[k] = s[k]; return o; };

// ------------------------------------------------------------------ FLIGHT LAB's own code, cut out of app.js
const APP = fs.readFileSync(path.join(FLSRC, 'app.js'), 'utf8');
function extract(name) {
  const i = APP.indexOf(`function ${name}(`); assert.ok(i >= 0, `app.js has function ${name}`);
  for (let k = APP.indexOf('{', i), d = 0; k < APP.length; k++) {
    if (APP[k] === '{') d++;
    else if (APP[k] === '}' && --d === 0) return APP.slice(i, k + 1);
  }
  throw new Error(`unbalanced braces in ${name}`);
}
const APP_SRC = ['updateControls', 'doAction', 'tick'].map(extract).join('\n');
// app.js's S and the helpers those functions use; padInput is a stub that returns the test's own stick reading
function appSandbox(prefs = {}) {
  const S = { L: null, screen: 'fly', paused: false, keys: new Set(), prefs: { ...PREFS0, sound: false, ...prefs }, rTrim: 0, thrHeld: 0, progress: { time: 0 }, pad: null };
  const ctx = vm.createContext({
    S, P, SC, clamp: P.clamp, Math, toast: () => {}, savePrefs: () => {}, lessonEnded: () => {},
    pressed: (...c) => c.some(k => S.keys.has(k)), padInput: () => S.pad,
    events: () => { S.L.evSeen = S.L.s.events.length; },
  });
  vm.runInContext(`var acc = 0; const H = 1 / 120; const flying = () => S.screen === 'fly' && !S.paused && S.L && !S.L.done;\n${APP_SRC}\nthis.fns = { updateControls, doAction, tick, acc: () => acc };`, ctx);
  return { S, ...ctx.fns };
}

// ------------------------------------------------------------------ 1. the scripted pilot: bit-identical to bot.mjs
// measured with flight-lab/test/bot.mjs runLesson: grade, score (6 decimals), lesson time L.t (s), physics steps
const REF = {
  'a1 intro': ['S', '1.000000', '27.992', 3359], 'a1 basic': ['S', '1.000000', '38.000', 4560], 'a1 precision': ['S', '1.000000', '48.000', 5760],
  'a1 intro noseUp': ['S', '1.000000', '27.992', 3359], 'a1 basic noseUp': ['C', '0.653217', '47.525', 5703], 'a1 precision noseUp': ['C', '0.656073', '98.542', 11825],
  'a1 intro idle': ['S', '1.000000', '27.992', 3359], 'a1 basic idle': ['C', '0.190141', '130.000', 15600], 'a1 precision idle': ['C', '0.084875', '130.000', 15600],
};
const HOOKS = {
  '': undefined,
  noseUp: (L) => { if (L.step === 1 && L.st.t < 15) L.s.pTgt = 5; },          // the nose 5° up for the first 15 s of step 1
  idle: (L) => { L.s.thr = 0; },                                              // the throttle at idle all the way
};
function sameRun(ref, L, what) {
  assert.deepStrictEqual(L.results, ref.results, `${what}: rows`);
  for (const k of ['done', 'passed', 'grade', 'passPct', 'reason', 'step']) assert.equal(L[k], ref[k], `${what}: ${k}`);
  assert.ok(Object.is(L.score, ref.score), `${what}: score ${L.score} vs ${ref.score}`);
  assert.ok(Object.is(L.t, ref.t), `${what}: L.t ${L.t} vs ${ref.t}`);
  for (const k of ['pos', 'q', 'vel', 'w', 't', 'thr', 'trim', 'elev', 'ail']) assert.deepStrictEqual(L.s[k], ref.s[k], `${what}: s.${k}`);
  assert.deepStrictEqual(L.hist, ref.hist, `${what}: history`);
}

test('bridge: a1 flown by bot.mjs through runScripted is bit-identical to runLesson at every level, also with inputs that change the grade', () => {
  for (const [hn, hook] of Object.entries(HOOKS)) for (const lv of ['intro', 'basic', 'precision']) {
    const what = `a1 ${lv}${hn ? ' ' + hn : ''}`;
    const ref = runLesson(FL, 'a1', lv, 900, hook);
    const f = createFlight(FL, { store: null });
    f.startLesson('a1', lv, { sens: 'low', autoRud: false });
    const L = f.runScripted(makeBot(FL).fly, 900, hook);
    assert.equal(L, f.L);
    sameRun(ref, L, what);
    const [grade, score, t, steps] = REF[what];
    assert.deepEqual([L.grade, L.score.toFixed(6), L.t.toFixed(3), Math.round(L.s.t * 120)], [grade, score, t, steps], `${what}: FLIGHT LAB's numbers`);
  }
  // the hooks really are seen: the nose-up run at basic is graded C on the altitude, the hold is still met
  const f = createFlight(FL, { store: null }); f.startLesson('a1', 'basic', { autoRud: false });
  const L = f.runScripted(makeBot(FL).fly, 900, HOOKS.noseUp);
  assert.deepEqual(L.results.flatMap(r => r.rows).map(r => [r.name, r.val, r.pass]), [['高度', '77% が基準内（最大のずれ 146 ft）', false], ['連続保持', '最長 20 秒', true]]);
});

test('bridge: other lessons (a2, t1 with its checklist and read-back, the Seminole m2) at basic are bit-identical too', () => {
  for (const id of ['a2', 't1', 'm2']) {
    const ref = runLesson(FL, id, 'basic', 1200);
    assert.ok(ref.done && ref.passed, `${id}: the reference passes`);
    const f = createFlight(FL, { store: null });
    f.startLesson(id, 'basic', { sens: 'low', autoRud: !!SC.lesson(id).autoRud });
    sameRun(ref, f.runScripted(makeBot(FL).fly, 1200), id);
  }
});

test('bridge: reading the lesson for the HUD (status, panel, pose) every step changes nothing', () => {
  const ref = runLesson(FL, 'a1', 'basic', 900, HOOKS.noseUp);
  const f = createFlight(FL, { store: null }), out = { pos: [0, 0, 0], q: [0, 0, 0, 1] };
  f.startLesson('a1', 'basic', { autoRud: false });
  let seen = 0;
  const L = f.runScripted(makeBot(FL).fly, 900, (Lx, t) => {
    HOOKS.noseUp(Lx);
    const st = f.status(); f.panel(); f.pose(out);
    if (st.step === 1 && st.stats.length) seen++;
  });
  assert.ok(seen > 1000, 'the gauges were read');
  sameRun(ref, L, 'a1 basic, read every step');
});

// ------------------------------------------------------------------ 2. the controls: FLIGHT LAB's own functions beside the port
const ACTIONS = ['flaps', 'flapsUp', 'gear', 'trim', 'trimReset', 'thrFull', 'thrIdle', 'level', 'autoRud', 'feather0', 'feather1', 'restart0', 'restart1', 'rtrimL', 'rtrimR'];
const HELD = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyB', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown'];
const START = {
  'a1 (air, Archer)': () => { const L = SC.startLesson('a1', 'basic', { sens: 'low', autoRud: true }); L.s.opts.assist = false; return L; },
  'runway (ground, Archer)': () => SC.startFree('rwy', 'pa28', { sens: 'low', autoRud: true, assist: false }),
  'area (air, Seminole)': () => SC.startFree('area', 'pa44', { sens: 'mid', autoRud: false, assist: false }),
  'm2 (Seminole, engine failure)': () => { const L = SC.startLesson('m2', 'basic', { sens: 'low', autoRud: true }); L.s.opts.assist = false; return L; },
};
// one random flight: keys held for random spells, random frame dt (1/144 … 0.1 s), pauses, actions, sometimes a stick;
// after the controls and after the physics of each frame, the two states must be the same to the last bit
function controlsRun(name, seed, frames, prefs = {}) {
  const r = rng(seed), A = appSandbox(prefs), down = new Set();
  let pad = null;
  const C = createControls(FL, { prefs: { ...PREFS0, ...prefs }, readPad: () => pad });
  const LA = START[name](), LB = START[name]();
  A.S.L = LA;
  const thrBias = name.startsWith('runway') ? 0.5 : 0.1, seen = { ground: 0, air: 0, stick: 0, keys: 0 };
  for (let f = 0; f < frames; f++) {
    for (const k of HELD) if (r() < (k === 'KeyR' ? thrBias * 0.2 : 0.05)) { if (down.has(k)) down.delete(k); else down.add(k); }
    A.S.keys = new Set(down);
    // a stick on some spells (FLIGHT LAB turns its keyboard holds off then)
    if (r() < 0.02) pad = pad ? null : { stick: r() < 0.8, tr: r() * 2 - 1, tp: r() * 2 - 1, ty: r() < 0.5 ? 0 : r() * 2 - 1, brake: r() < 0.2 };
    A.S.pad = pad;
    const dt = r() < 0.1 ? 0.1 : 1 / 144 + r() * (0.1 - 1 / 144);
    const paused = r() < 0.03 || LA.done;
    A.S.paused = paused;
    A.updateControls(dt); C.update(LB, dt, keySet(down), !paused);
    assert.deepStrictEqual(view(LB.s), view(LA.s), `${name}: frame ${f} after the controls`);
    if (r() < 0.04) {
      const a = ACTIONS[Math.floor(r() * ACTIONS.length)];
      A.doAction(a); const text = C.action(LB, a);
      assert.equal(typeof text, 'string');
      assert.deepStrictEqual(view(LB.s), view(LA.s), `${name}: frame ${f} after ${a}`);
    }
    assert.ok(Object.is(C.rTrim, A.S.rTrim) && Object.is(C.thrHeld, A.S.thrHeld) && C.prefs.autoRud === A.S.prefs.autoRud, `${name}: frame ${f}: rudder trim / throttle hold / prefs`);
    if (!paused) for (let n = Math.round(dt * 120); n > 0; n--) {
      P.step(LA.s, H); P.step(LB.s, H);
      if (LA.free) { SC.freeUpdate(LA, H); SC.freeUpdate(LB, H); } else { SC.update(LA, H); SC.update(LB, H); }
    }
    assert.deepStrictEqual(view(LB.s), view(LA.s), `${name}: frame ${f} after the physics`);
    seen[LB.s.onGround ? 'ground' : 'air']++; seen[pad && pad.stick ? 'stick' : 'keys']++;
  }
  return seen;
}

test('controls: updateControls and doAction cut out of FLIGHT LAB\'s app.js and the port write bit-identical state (keys, stick, actions, ground and air)', () => {
  const seen = { ground: 0, air: 0, stick: 0, keys: 0 };
  let seed = 11;
  for (const name of Object.keys(START)) for (const prefs of [{}, { hold: 'spring', rhold: 'spring' }]) {
    const r = controlsRun(name, seed++, 1500, prefs);
    for (const k in seen) seen[k] += r[k];
  }
  // on the ground and in the air, keyboard and stick, were all exercised
  assert.ok(seen.ground > 1000 && seen.air > 1000 && seen.stick > 1000 && seen.keys > 1000, JSON.stringify(seen));
});

test('controls: the edges — each key held through its ramps at 0.1 s and 1/60 s frames, the rudder trim to its stops', () => {
  for (const name of ['a1 (air, Archer)', 'runway (ground, Archer)']) {
    const A = appSandbox(), C = createControls(FL), LA = START[name](), LB = START[name]();
    A.S.L = LA;
    const frame = (keys, dt) => {
      A.S.keys = new Set(keys); A.updateControls(dt); C.update(LB, dt, keySet(A.S.keys), true);
      assert.deepStrictEqual(view(LB.s), view(LA.s), `${name}: ${keys} at ${dt}`);
      assert.ok(Object.is(C.thrHeld, A.S.thrHeld), `${name}: ${keys}: throttle held ${C.thrHeld} vs ${A.S.thrHeld}`);
    };
    for (const k of ['KeyR', 'KeyF', 'PageUp', 'PageDown', 'KeyS', 'KeyW', 'ArrowDown', 'ArrowUp', 'KeyD', 'KeyA', 'KeyE', 'KeyQ', 'KeyB', 'Space'])
      for (const dt of [0.1, 1 / 60]) { for (let i = 0; i < 12; i++) frame([k], dt); for (let i = 0; i < 6; i++) frame([], dt); }
    for (const a of ['rtrimR', 'rtrimL']) for (let i = 0; i < 30; i++) {
      A.doAction(a); C.action(LB, a); assert.ok(Object.is(C.rTrim, A.S.rTrim), `${a} ×${i + 1}: ${C.rTrim} vs ${A.S.rTrim}`);
      frame([], 1 / 60);
    }
  }
});

test('controls: the key → action table is app.js\'s keydown table', () => {
  const line = APP.match(/const act = (\{[^\n]*\})\[e\.code\];/);
  assert.ok(line, 'app.js keydown table');
  const table = new Function('e', `return ${line[1]}[e.code];`);
  for (const code of ['KeyV', 'KeyR', 'KeyF', 'KeyG', 'KeyT', 'KeyL', 'KeyU', 'BracketLeft', 'BracketRight', 'KeyZ', 'KeyX', 'KeyW', 'KeyQ', 'Enter', 'Digit1'])
    for (const shiftKey of [false, true]) assert.equal(actionForKey(code, shiftKey) ?? null, table({ code, shiftKey }) ?? null, `${code} shift ${shiftKey}`);
  assert.deepEqual(FLY_HELD, JSON.parse(APP.match(/const FLY_HELD = (\[[^\]]*\]);/)[1].replace(/'/g, '"')));
});

test('controls: CADET\'s cockpit steps — trim wheel ±0.02 (not under the assist), throttle ±0.05, the latched parking brake', () => {
  const f = createFlight(FL, { store: null });
  const L = f.startFree('area', 'pa28', { assist: false }), s = L.s;
  const t0 = s.trim, th0 = s.thr;
  assert.match(f.action('trimStep', +1), /トリム 機首上げ/); assert.ok(Math.abs(s.trim - (t0 + 0.02)) < 1e-12);
  f.action('trimStep', -1); f.action('trimStep', -1); assert.ok(Math.abs(s.trim - (t0 - 0.02)) < 1e-12);
  for (let i = 0; i < 40; i++) f.action('trimStep', +1);
  assert.equal(s.trim, P.TRIM_MAX, 'the trim stops at its end');
  f.action('thrStep', +1); assert.ok(Math.abs(s.thr - Math.min(1, th0 + 0.05)) < 1e-12);
  for (let i = 0; i < 30; i++) f.action('thrStep', -1);
  assert.equal(s.thr, 0);
  assert.match(f.action('parkBrake'), /セット/); assert.equal(f.controls.parkBrake, true);
  f.frame(1 / 60, NOKEYS); assert.equal(s.brake, true, 'held every frame without a key');
  f.action('parkBrake'); f.frame(1 / 60, NOKEYS); assert.equal(s.brake, false);
  const A = f.startFree('area', 'pa28', { assist: true }), tA = A.s.trim;
  assert.match(f.action('trimStep', +1), /アシスト/); assert.equal(A.s.trim, tA, 'refused under the assist');
});

test('controls: a gamepad — the left stick is the yoke (holds off), the triggers the throttle, B flaps, Start pauses', () => {
  const btn = (n) => Array.from({ length: 18 }, (_, i) => ({ value: n.includes(i) ? 1 : 0 }));
  const gp = { id: 'Test pad', connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: btn([]) };
  const f = createFlight(FL, { store: null, getGamepads: () => [null, gp] });
  const L = f.startFree('area', 'pa28'), s = L.s, thr0 = s.thr = 0.4;
  let r = f.frame(1 / 60, NOKEYS);
  assert.ok(r.pad.some(e => e.type === 'toast' && /コントローラー/.test(e.text)), 'the pad is recognised');
  gp.axes = [0, 0.8, 0, 0]; gp.buttons = btn([7]);
  for (let i = 0; i < 30; i++) f.frame(1 / 60, NOKEYS);
  assert.equal(s.keyHold, false, 'the stick turns the pitch hold off'); assert.ok(s.pIn > 0.5, `pulled: pIn ${s.pIn}`);
  assert.ok(s.thr > thr0 + 0.2, 'RT opens the throttle');
  gp.axes = [0, 0, 0, 0]; gp.buttons = btn([1]); const fl = s.flapIdx;
  r = f.frame(1 / 60, NOKEYS);
  assert.equal(s.flapIdx, (fl + 1) % 4, 'B: flaps'); assert.ok(r.pad.some(e => e.type === 'toast' && /フラップ/.test(e.text)));
  r = f.frame(1 / 60, NOKEYS); assert.equal(s.flapIdx, (fl + 1) % 4, 'a held button acts once');
  gp.buttons = btn([9]); r = f.frame(1 / 60, NOKEYS);
  assert.ok(r.pad.some(e => e.type === 'pause'));
  gp.buttons = btn([]); f.frame(1 / 60, NOKEYS);
  // the checklist with A (t1 starts with one; the first items have no condition)
  const T = f.startLesson('t1', 'basic'); const i0 = T.check.i;
  gp.buttons = btn([0]); r = f.frame(1 / 60, NOKEYS);
  assert.ok(r.pad.some(e => e.type === 'checklist' && e.r.ok)); assert.equal(T.check.i, i0 + 1);
});

// ------------------------------------------------------------------ 3. the realtime path: app.js tick
test('realtime: frame() is app.js tick (controls once per frame, 1/120 s steps from the accumulator) to the last bit', () => {
  for (const [id, lv, seed] of [['a1', 'basic', 5], ['a2', 'intro', 6]]) {
    const r = rng(seed), A = appSandbox(), down = new Set();
    const f = createFlight(FL, { store: null });
    const LB = f.startLesson(id, lv, { sens: 'low', autoRud: true });
    const LA = SC.startLesson(id, lv, { sens: 'low', autoRud: true }); LA.s.opts.assist = false;
    A.S.L = LA;
    let steps = 0;
    for (let fr = 0; fr < 3000 && !LA.done; fr++) {
      // a gentle pilot: short taps (so the lesson keeps going), a few actions; nothing held as the lesson starts
      if (fr > 0) for (const k of ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF']) if (down.has(k) ? r() < 0.3 : r() < 0.01) { if (down.has(k)) down.delete(k); else down.add(k); }
      A.S.keys = new Set(down);
      // long frames (clamped), frames of exactly one or two steps, and anything between
      const u = r(), dt = u < 0.05 ? 0.25 : u < 0.15 ? H : u < 0.25 ? 1 / 60 : 1 / 144 + r() * (1 / 20 - 1 / 144), paused = r() < 0.02;
      A.S.paused = paused;
      A.tick(Math.min(0.1, dt));
      const res = f.frame(dt, keySet(down), { paused });
      steps += res.steps;
      if (r() < 0.01 && !LA.done) { const a = ['trim', 'rtrimL', 'rtrimR', 'flaps', 'flapsUp'][Math.floor(r() * 5)]; A.doAction(a); f.action(a); }
      assert.deepStrictEqual(view(LB.s), view(LA.s), `${id} frame ${fr}`);
      assert.ok(Object.is(f.acc, A.acc()), `${id} frame ${fr}: accumulator ${f.acc} vs ${A.acc()}`);
      assert.ok(Object.is(LB.t, LA.t) && LB.step === LA.step, `${id} frame ${fr}: lesson time / step`);
    }
    assert.deepStrictEqual(LB.results, LA.results);
    assert.equal(steps, Math.round(LB.s.t * 120), 'every step reported');
  }
});

test('realtime: hands off, a1 passes with S at every level (the keyboard pitch hold keeps the attitude)', () => {
  for (const lv of ['intro', 'basic', 'precision']) {
    const f = createFlight(FL, { store: null });
    const L = f.startLesson('a1', lv);
    let ended = 0, chime = 0;
    for (let i = 0; i < 60 * 200 && !L.done; i++) { const r = f.frame(1 / 60, NOKEYS); if (r.ended) ended++; chime = Math.max(chime, f.status().chime); }
    const st = f.status();
    assert.ok(st.done && st.passed && st.grade === 'S', `a1 ${lv}: ${st.grade} ${st.reason} ${JSON.stringify(st.results)}`);
    assert.equal(ended, 1, 'ended reported once'); assert.equal(chime, 2, 'two steps');
    assert.equal(L.s.keyHold, true); assert.equal(L.s.rollHold, true);
  }
});

test('realtime: no steps while paused or after the end; the frame dt is clamped to 0.1 s and the steps capped', () => {
  const f = createFlight(FL, { store: null });
  const L = f.startLesson('a1', 'intro'), t0 = L.s.t;
  for (let i = 0; i < 30; i++) assert.equal(f.frame(1 / 60, NOKEYS, { paused: true }).steps, 0);
  assert.equal(L.s.t, t0); assert.equal(f.acc, 0);
  // the keys the pilot still holds while paused do nothing, and are released to the centre
  f.frame(1 / 60, keySet(new Set(['KeyA', 'KeyB'])), { paused: true });
  assert.equal(L.s.rIn, 0); assert.equal(L.s.brake, false);
  // a long frame (the tab was hidden) runs at most 0.1 s of flight
  let r = f.frame(10, NOKEYS);
  assert.ok(r.steps >= 11 && r.steps <= 13 && r.steps <= MAX_STEPS, `steps ${r.steps}`);
  assert.ok(f.acc >= 0 && f.acc < H, `accumulator ${f.acc}`);
  for (let i = 0; i < 60 * 60 && !L.done; i++) f.frame(1 / 60, NOKEYS);
  assert.ok(L.done);
  const t1 = L.s.t, lt = L.t;
  for (let i = 0; i < 30; i++) { r = f.frame(1 / 30, NOKEYS); assert.equal(r.steps, 0); assert.equal(r.ended, false); }
  assert.equal(L.s.t, t1); assert.equal(L.t, lt);
  assert.equal(f.action('flaps'), '', 'no actions after the end');
  // the picture after the end is the last state
  const p = f.pose();
  assert.deepEqual(p.pos, L.s.pos); assert.ok(Math.abs(Math.abs(p.q[0] * L.s.q[0] + p.q[1] * L.s.q[1] + p.q[2] * L.s.q[2] + p.q[3] * L.s.q[3]) - 1) < 1e-12);
});

test('realtime: keys held when a flight starts are ignored until released (FLIGHT LAB clears its keys)', () => {
  const f = createFlight(FL, { store: null }), held = new Set(['KeyE', 'KeyS']);
  const L = f.startLesson('a1', 'intro');
  for (let i = 0; i < 30; i++) f.frame(1 / 60, keySet(held));
  assert.equal(L.s.rud, 0, 'E held from the dialogue: no rudder'); assert.equal(L.s.pRate, 0);
  held.clear(); f.frame(1 / 60, keySet(held));
  held.add('KeyE'); for (let i = 0; i < 30; i++) f.frame(1 / 60, keySet(held));
  assert.ok(L.s.rud > 0.4, `pressed again: rudder ${L.s.rud}`);
});

test('realtime: the pose between steps blends the last two (display only)', () => {
  const f = createFlight(FL, { store: null });
  const L = f.startFree('area', 'pa28');
  f.frame(1 / 60, NOKEYS); f.frame(1 / 200, NOKEYS);
  const a = f.acc / H, s = L.s, p = f.pose(), p0 = f.pose(undefined, 0), p1 = f.pose(undefined, 1);
  assert.ok(a > 0 && a < 1, `alpha ${a}`);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(p1.pos[i] - s.pos[i]) < 1e-9);
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(p.pos[i] - (p0.pos[i] + (p1.pos[i] - p0.pos[i]) * a)) < 1e-6);
  const v = Math.hypot(...s.vel);
  assert.ok(Math.abs(Math.hypot(p1.pos[0] - p0.pos[0], p1.pos[1] - p0.pos[1], p1.pos[2] - p0.pos[2]) - v * H) < 0.01, 'one step apart');
  assert.ok(Math.abs(Math.hypot(...p.q) - 1) < 1e-12);
});

test('status: what the HUD shows of a1 — the step, the texts, the gauge, the hold; a checklist and a read-back in t1', () => {
  const f = createFlight(FL, { store: null });
  f.startLesson('a1', 'basic');
  let st = f.status();
  assert.equal(st.mode, 'lesson'); assert.equal(st.title, '姿勢・出力・トリム'); assert.equal(st.levelName, '基礎');
  assert.deepEqual([st.step, st.steps.length, st.stepName, st.kind, st.dur], [0, 2, '姿勢と計器の確認', 'fly', 10]);
  assert.match(st.sayText, /何も操作せず/); assert.equal(st.keysText, '操作しない（観察）');
  for (let i = 0; i < 60 * 20; i++) f.frame(1 / 60, NOKEYS);
  st = f.status();
  assert.equal(st.step, 1); assert.match(st.keysText, /T＝いまの速度でトリム/); assert.match(st.guideText, /^目安：スロットル/);
  assert.equal(st.stats.length, 1); assert.equal(st.stats[0].key, 'alt'); assert.equal(st.stats[0].label, '高度'); assert.equal(st.stats[0].tol, 100);
  assert.equal(st.need, 20); assert.ok(st.holdT > 0 && st.graded, `holding ${st.holdT}`); assert.match(st.hint, /良い調子|高度/);
  // precision shows no guide and no hints
  f.startLesson('a1', 'precision'); for (let i = 0; i < 60 * 12; i++) f.frame(1 / 60, NOKEYS);
  st = f.status(); assert.equal(st.guideText, ''); assert.equal(st.hint, '');
  // t1: the checklist refuses the flaps until they are up, then the tower's read-back
  f.startLesson('t1', 'basic');
  st = f.status(); assert.equal(st.kind, 'checklist'); assert.ok(st.check && st.check.items[0].cur);
  f.L.s.flapIdx = 2;
  let r; for (let n = 0; n < 20 && f.L.check; n++) { r = f.checklistNext(); if (!r.ok) { assert.match(r.text, /フラップ/); f.L.s.flapIdx = 0; } }
  assert.equal(f.status().check, null);
  f.frame(1 / 60, NOKEYS);
  st = f.status(); assert.equal(st.kind, 'atc'); assert.equal(st.atc.opts.length, 3);
  r = f.answerAtc(st.atc.ok); assert.equal(r.ok, true);
  assert.equal(f.status().atcResult.ok, true); assert.equal(f.status().atcResult.right, st.atc.opts[st.atc.ok]);
  // free flight
  f.startFree('pattern'); st = f.status();
  assert.equal(st.mode, 'free'); assert.deepEqual(st.steps, []); assert.equal(st.check, null);
  const pn = f.panel(); assert.ok(pn.ias > 80 && pn.alt > 900 && pn.flapLabel === 'UP' && pn.keyHold === true, JSON.stringify(pn));
});

test('keys: Enter steps the checklist, 1–3 answer the tower, V / Shift+V / Shift+R / T act; the held keys are left to frame()', () => {
  const f = createFlight(FL, { store: null });
  const T = f.startLesson('t1', 'basic');
  assert.equal(f.key('Digit1'), null, 'no question yet');
  T.s.flapIdx = 1;
  let r; for (let n = 0; n < 20 && T.check; n++) { r = f.key('Enter'); if (!r.ok) { assert.match(r.text, /フラップ/); T.s.flapIdx = 0; } }
  assert.equal(r.kind, 'checklist'); assert.equal(T.check, null);
  f.frame(1 / 60, NOKEYS);
  const wrong = (T.atc.ok + 1) % 3;
  r = f.key(`Digit${wrong + 1}`);
  assert.equal(r.kind, 'atc'); assert.equal(r.ok, false); assert.match(r.text, /^不正解。正しくは「Runway 36, cleared for takeoff/);
  const L = f.startFree('area', 'pa28'), s = L.s;
  r = f.key('KeyV'); assert.deepEqual([r.kind, r.name, s.flapIdx], ['action', 'flaps', 1]); assert.match(r.text, /^フラップ 10°/);
  f.key('KeyV', true); assert.equal(s.flapIdx, 0);
  assert.equal(f.key('KeyR'), null, 'R alone is the held throttle');
  r = f.key('KeyR', true); assert.equal(s.thr, 1); assert.equal(r.name, 'thrFull');
  f.frame(1 / 60, NOKEYS); r = f.key('KeyT'); assert.equal(r.name, 'trim'); assert.match(r.text, /トリム/);
  assert.equal(f.key('KeyC'), null); assert.equal(f.key('KeyH'), null);
  // the player's preference for the automatic rudder (U) carries over to the next lesson, as in FLIGHT LAB
  const saved = [];
  const g = createFlight(FL, { store: null, savePrefs: p => saved.push({ ...p }) });
  g.startLesson('a1', 'intro'); assert.equal(g.s.opts.autoRud, true);
  g.key('KeyU'); assert.equal(g.s.opts.autoRud, false); assert.equal(saved.at(-1).autoRud, false);
  g.startLesson('a1', 'intro'); assert.equal(g.s.opts.autoRud, false);
});

// ------------------------------------------------------------------ 4. on the ground, crashes, records
test('ground: on the apron stand the parking brake holds it for 30 s; released, the throttle taxis it', () => {
  const R = P.LAB_RWY, [n, e] = P.rwyToNE(R, 636.5, 207.6);
  const f = createFlight(FL, { store: null });
  const L = f.startOnGround(n, e, 264), s = L.s;
  assert.equal(P.pavedAt(n, e), 'apron');
  assert.ok(s.onGround && f.controls.parkBrake && s.brake && s.thr === 0);
  assert.ok(Math.abs(P.attitude(s).hdg - 264) < 1e-9);
  assert.equal(L.hdg0, 270, 'heading reference in magnetic');
  const p0 = s.pos.slice();
  for (let i = 0; i < 60; i++) f.frame(1 / 60, NOKEYS);
  const p1 = s.pos.slice();
  for (let i = 0; i < 60 * 29; i++) f.frame(1 / 60, NOKEYS);
  const moved = Math.hypot(s.pos[0] - p0[0], s.pos[2] - p0[2]);
  assert.ok(moved < 0.002, `stays put: moved ${moved} m while settling on the wheels`);
  assert.deepEqual([s.pos[0], s.pos[2]], [p1[0], p1[2]], 'then not at all (FLIGHT LAB\'s viscous tyres alone creep ≈ 5 mm/s at idle)');
  assert.ok(s.onGround && !s.crashed && s.out.gs < 0.1, 'still and on its wheels');
  assert.ok(Math.abs(P.wrap180(P.attitude(s).hdg - 264)) < 0.2, `heading ${P.attitude(s).hdg}`);
  assert.ok(!s.events.length, JSON.stringify(s.events));
  // the brake off, a little power: it rolls
  assert.match(f.action('parkBrake'), /解除/);
  const R2 = new Set(['KeyR']);
  for (let i = 0; i < 30; i++) f.frame(1 / 60, keySet(R2));
  assert.ok(s.thr > 0.2 && s.thr < 0.5, `throttle ${s.thr}`);
  for (let i = 0; i < 60 * 15; i++) f.frame(1 / 60, NOKEYS);
  const rolled = Math.hypot(s.pos[0] - p0[0], s.pos[2] - p0[2]);
  assert.ok(rolled > 10 && s.out.gs > 2 && s.out.gs < 25 && s.onGround && !s.crashed, `taxied ${rolled.toFixed(1)} m at ${s.out.gs.toFixed(1)} kt`);
  // the brakes stop it
  f.frame(1 / 60, keySet(new Set(['KeyF'])));
  for (let i = 0; i < 60 * 3; i++) f.frame(1 / 60, keySet(new Set(['KeyF', 'KeyB'])));
  for (let i = 0; i < 60 * 10; i++) f.frame(1 / 60, keySet(new Set(['KeyB'])));
  assert.ok(s.out.gs < 0.5, `stopped: ${s.out.gs.toFixed(2)} kt`);
});

test('crash: CADET\'s own obstacle damages the airframe — an event, and a lesson ends without a grade', () => {
  const f = createFlight(FL, { store: null });
  f.startFree('rwy');
  f.crash('格納庫に接触');
  let r = f.frame(1 / 60, NOKEYS);
  assert.deepEqual(r.events.map(e => [e.type, e.why]), [['crash', '格納庫に接触']]);
  assert.equal(f.s.crashed, true); assert.deepEqual(f.s.vel, [0, 0, 0]);
  f.crash('again'); assert.equal(f.frame(1 / 60, NOKEYS).events.length, 0, 'once');
  const L = f.startLesson('a1', 'intro');
  f.frame(1 / 60, NOKEYS); f.crash('鳥と衝突');
  r = f.frame(1 / 60, NOKEYS);
  assert.ok(L.done && !L.passed && L.grade === '―' && L.reason === '鳥と衝突' && r.ended);
});

test('records: a finished lesson is noted once in CADET\'s own keys (cadet.…), never in FLIGHT LAB\'s', () => {
  const base = memStore(), f = createFlight(FL, { store: base });
  f.startLesson('a1', 'intro');
  for (let i = 0; i < 60 * 60 && !f.L.done; i++) f.frame(1 / 60, NOKEYS);
  assert.equal(f.status().grade, 'S');
  const rec = f.finish();
  assert.ok(rec && rec.lessonId === 'a1' && rec.result === 'pass' && rec.grade === 'S' && rec.level === 'intro');
  assert.equal(f.finish(), null, 'once per lesson');
  assert.deepEqual(base.keys().sort(), ['cadet.' + SC.PROG_KEY, 'cadet.' + SC.STORE_KEY].sort());
  assert.equal(base.getItem(SC.STORE_KEY), null); assert.equal(base.getItem(SC.PROG_KEY), null);
  const prog = f.progress();
  assert.deepEqual(prog.lessons.a1, { tries: 1, best: 'S', pass: true, levels: ['intro'] });
  assert.ok(Math.abs(prog.time - f.L.s.t) < 1e-6, `training time ${prog.time}`);
  assert.equal(f.records().length, 1);
  // an aborted lesson: a record of the abort when the integrator asks for it
  f.startLesson('a1', 'basic'); for (let i = 0; i < 60 * 5; i++) f.frame(1 / 60, NOKEYS);
  f.abort('中止'); assert.equal(f.status().grade, '―');
  assert.equal(f.finish().result, 'abort');
  assert.deepEqual(f.progress().lessons.a1.tries, 2);
  // a free flight keeps its time, not a record
  f.startFree('area'); for (let i = 0; i < 60 * 2; i++) f.frame(1 / 60, NOKEYS);
  assert.equal(f.finish(), null); assert.equal(f.records().length, 2);
  // no storage at all: nothing breaks
  const g = createFlight(FL, { store: null }); g.startLesson('a1', 'intro'); g.abort();
  assert.equal(g.finish().result, 'abort'); assert.equal(g.records().length, 0);
});
