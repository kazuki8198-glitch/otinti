// CADET — flight/flight.js : the flight bridge. FLIGHT LAB's physics (120 Hz) and school (lessons, grading, records)
// driven exactly as FLIGHT LAB's app drives them, so a lesson flown in CADET's cockpit is the same lesson, with the same
// score, as in FLIGHT LAB:
//  - frame(dt): the realtime path of app.js tick — the controls once per frame (frame dt clamped to 0.1 s), then fixed
//    1/120 s steps from an accumulator (at most 30; the rest dropped), each P.step followed by SC.update (or
//    SC.freeUpdate in free flight); nothing moves while paused or after the lesson ended;
//  - runScripted(pilot): FLIGHT LAB's test loop (bot.mjs runLesson) on the current lesson, one pilot call per step and
//    no key layer, so a scripted pilot gives bit-identical results in CADET and in FLIGHT LAB.
// The bridge reads the lesson for the HUD (status) without touching it, keeps the previous step's pose for a smooth
// picture between steps (display only), and saves records and progress under 'cadet.'-prefixed keys.
// Pure logic: no three.js, no DOM.
import { createControls, actionForKey, PREFS0 } from './controls.js';
import { ourCall } from '../content/dialog/atc.js';

export const H = 1 / 120;
export const MAX_STEPS = 30;
// free-flight winds (relative to runway 36), as FLIGHT LAB's menu offers them
export const WINDS = {
  calm: { rel: 0, kt: 0, gust: 0.3 }, light: { rel: 10, kt: 5, gust: 0.5 },
  cross: { rel: 60, kt: 12, gust: 1.2 }, gusty: { rel: 70, kt: 15, gust: 2.5 },
};

const DEG = Math.PI / 180;
// FLIGHT LAB's own texts call it teaching material here and there (a checklist 「教材の簡略版」, a hard landing over the
// 「教材基準」, an engine failure 「（教材の想定）」); in the aircraft they are just the school's rules
const IN_WORLD = [[/（教材(では[^）]*|の想定)）/g, ''], [/教材の簡略版/g, '簡略版'], [/教材基準/g, '基準'], [/教材/g, '訓練']];
export function inWorld(text) {
  if (typeof text !== 'string' || text.indexOf('教材') < 0) return text;
  for (const [re, by] of IN_WORLD) text = text.replace(re, by);
  return text;
}
const rowsInWorld = (results) => results.map(r => ({ ...r, step: inWorld(r.step), rows: r.rows.map(x => ({ ...x, name: inWorld(x.name), val: inWorld(x.val), std: inWorld(x.std) })) }));

const defaultStore = () => { try { return globalThis.localStorage || null; } catch (e) { return null; } };
// CADET's own records and progress: the same format as FLIGHT LAB's, under keys of its own (a page on the same origin,
// file:// included, never merges with FLIGHT LAB's)
export function prefixedStore(base, prefix = 'cadet.') {
  if (!base) return null;
  return {
    getItem: (k) => base.getItem(prefix + k),
    setItem: (k, v) => base.setItem(prefix + k, v),
    removeItem: (k) => base.removeItem(prefix + k),
  };
}

// opts: store (localStorage-like, default the browser's), prefs (controls.js PREFS0), savePrefs(prefs),
// getGamepads / readPad (controls.js)
export function createFlight(FL, { store = defaultStore(), prefs, savePrefs, getGamepads, readPad } = {}) {
  const P = FL.physics, SC = FL.school, AV = FL.avionics;
  const db = prefixedStore(store);
  const ctl = createControls(FL, { prefs: { ...PREFS0, ...(prefs || {}) }, savePrefs, getGamepads, readPad });
  let L = null, acc = 0, lastRight = '';
  // the pose before the last step (the picture blends it with the current one by acc / H)
  const prev = { pos: [0, 0, 0], q: [0, 0, 0, 1] };
  // frame()'s result: the same object every frame (read it before the next frame)
  const res = { steps: 0, events: [], pad: [], ended: false };
  // training time and landings since the progress was last saved
  const tally = { time: 0, landings: 0 };
  // is the current step being graded now (its graded seconds grew during the last frame)
  const gr = { step: -1, n: 0, on: false };
  // where the parking brake holds the aircraft (position and true heading)
  const pin = { on: false, x: 0, z: 0, h: 0 };
  // the lesson's rows as status() shows them (made again only when a row is added)
  const shown = { L: null, n: -1, results: [] };

  function snap() {
    if (!L) return; const s = L.s;
    prev.pos[0] = s.pos[0]; prev.pos[1] = s.pos[1]; prev.pos[2] = s.pos[2];
    prev.q[0] = s.q[0]; prev.q[1] = s.q[1]; prev.q[2] = s.q[2]; prev.q[3] = s.q[3];
  }
  function begin(nl) {
    L = nl; acc = 0; lastRight = '';
    ctl.reset();
    res.steps = 0; res.events.length = 0; res.pad.length = 0; res.ended = false;
    gr.step = -1; gr.n = 0; gr.on = false; pin.on = false;
    snap();
    return L;
  }

  // ---------------------------------------------------------------- starts (as app.js startLesson / startFree)
  // the stick sensitivity and the automatic rudder come from the player's preferences unless given
  function startLesson(id, levelId = 'intro', { sens = ctl.prefs.sens, autoRud = ctl.prefs.autoRud, wind = null } = {}) {
    const def = SC.lesson(id); if (!def || !def.steps) return null;
    const nl = SC.startLesson(id, levelId, { sens, autoRud, ...(wind ? { wind } : {}) });
    nl.s.opts.assist = false;
    return begin(nl);
  }
  function startFree(startId = 'rwy', aircraft = 'pa28', { sens = ctl.prefs.sens, autoRud = ctl.prefs.autoRud, assist = ctl.prefs.assist, wind = 'light' } = {}) {
    const W = typeof wind === 'object' && wind ? wind : WINDS[wind] || WINDS.light;
    return begin(SC.startFree(startId, aircraft, { sens, autoRud, assist, wind: W }));
  }
  // a free flight standing still on any paved point (the apron stand): FLIGHT LAB's placeOnRunway at n / e / heading,
  // not on the runway, with the parking brake set
  function startOnGround(n, e, hdgTrue, aircraft = 'pa28', opts = {}) {
    const nl = SC.startFree('rwy', aircraft, { sens: opts.sens || ctl.prefs.sens, autoRud: opts.autoRud ?? ctl.prefs.autoRud, assist: opts.assist ?? ctl.prefs.assist,
      wind: typeof opts.wind === 'object' && opts.wind ? opts.wind : WINDS[opts.wind] || WINDS.light });
    const s = nl.s;
    s.q = P.qFromHPB(hdgTrue, 0, 0);
    s.pos = [e, P.GROUND_M - s.WHEEL_BOTTOM + 0.02, -n];         // (the wheels just touching)
    s.flapIdx = 0; s.flapDeg = 0; s.thr = 0; s.trim = 0; s.brake = false; s.gearDown = true; s.gearPos = 1;
    s.onGround = true; s.airTime = 0; s.wasOnRunway = false; s.lastRwyT = s.t;
    s.contacts = s.WHEELS.map(() => true);
    s.rpm = P.rpmFor(s.A, 0, 0); for (const en of s.eng) en.rpm = s.rpm;
    P.derive(s);
    // the lesson's references follow the new place (heading bug on the nose); the turn-rate filter starts afresh
    nl.hdg0 = Math.round(AV.trueToMag(hdgTrue, P.MAGVAR_W)) || 360; nl.av.hdgBug = nl.hdg0;
    nl.prevHdg = null; nl.rateF = null; nl.last = SC.ctx(nl);
    begin(nl);
    // the parking brake set, holding it exactly on the given spot and heading from the first step
    ctl.action(nl, 'parkBrake', true);
    pin.on = true; pin.x = s.pos[0]; pin.z = s.pos[2]; pin.h = hdgTrue;
    return nl;
  }

  // a free flight that carries on from where the current one is (the same aircraft state and avionics): after a lesson
  // has ended (lined up after t1's climb, stopped on the runway after t3) the day goes on in CADET's own flight. The
  // lesson itself is finished (its record is FLIGHT LAB's); nothing of it is changed.
  function continueFree() {
    if (!L) return null;
    const old = L, s = old.s;
    const nl = SC.startFree('rwy', s.A.id, { sens: s.opts.sens, autoRud: !!s.opts.autoRud, assist: false });
    nl.s = s; nl.av = old.av; nl.A = s.A; nl.V = s.A.v; nl.evSeen = old.evSeen;
    nl.alt0 = old.alt0; nl.hdg0 = old.hdg0; nl.prevHdg = null; nl.rateF = null;
    nl.last = SC.ctx(nl);
    const keepPark = ctl.parkBrake;
    begin(nl);
    if (keepPark) ctl.action(nl, 'parkBrake', true);
    return nl;
  }

  // ---------------------------------------------------------------- the realtime path (app.js tick)
  // keys: { has(code) } (CADET's input.keys, or { has: input.down }); opts.paused stops everything; opts.pilot(L, H), in a
  // free flight only (CADET's taxi pilot), writes the controls before each step as FLIGHT LAB's bot does;
  // opts.airPilot lets the same hook run in a lesson (CADET's autopilot: flight/autopilot.js) — the default
  // path, and every test of FLIGHT LAB parity, is exactly as before
  function frame(dt, keys, { paused = false, pilot = null, airPilot = false } = {}) {
    res.steps = 0; res.events.length = 0; res.pad.length = 0; res.ended = false;
    if (!L) return res;
    const dtr = Math.min(0.1, Math.max(0, dt || 0)), wasDone = L.done;
    const flying = !paused && !L.done;
    ctl.update(L, dtr, keys, flying);
    // what the gamepad asked for: the dialogs are answered here, after the controls (so A on the last checklist item
    // does not also brake, and B / X / Y answering the tower do not also work the flaps or the view as in FLIGHT LAB);
    // the rest goes to the integrator
    const po = ctl.padOut;
    for (let i = 0; i < po.length; i++) {
      const e = po[i];
      if (e.type === 'checklist') e.r = checklistNext(); else if (e.type === 'atc') e.r = answerAtc(e.i);
      res.pad.push(e);
    }
    po.length = 0;
    if (!flying) { acc = 0; snap(); collect(); return res; }
    acc += dtr; let n = 0;
    const s = L.s;
    while (acc >= H && n < MAX_STEPS) {
      prev.pos[0] = s.pos[0]; prev.pos[1] = s.pos[1]; prev.pos[2] = s.pos[2];
      prev.q[0] = s.q[0]; prev.q[1] = s.q[1]; prev.q[2] = s.q[2]; prev.q[3] = s.q[3];
      if (pilot && (L.free || airPilot)) pilot(L, H);
      P.step(L.s, H); parkHold(L.s);
      if (L.free) SC.freeUpdate(L, H); else SC.update(L, H);
      acc -= H; n++;
    }
    if (n === MAX_STEPS) acc = 0;
    res.steps = n; tally.time += n * H;
    if (n) gradedNow();
    collect();
    if (L.done) snap();
    res.ended = !wasDone && L.done;
    return res;
  }
  // the parking brake holds the aircraft where it stopped, heading included. (FLIGHT LAB's tyres are viscous: braked or
  // not, idle thrust alone lets it creep about 5 mm/s, and the idle prop and the wind slowly turn it.) It takes hold
  // on the ground below 0.3 m/s, holds through the gear springs' first bounce (wheels off for < 0.5 s) and lets go when
  // it is released; the springs still settle the height, the pitch and the bank.
  function parkHold(s) {
    if (!ctl.parkBrake || s.crashed || (!s.onGround && s.airTime > 0.5)) { pin.on = false; return; }
    if (!pin.on) { if (!s.onGround || Math.hypot(s.vel[0], s.vel[2]) > 0.3) return; pin.on = true; pin.x = s.pos[0]; pin.z = s.pos[2]; pin.h = P.attitude(s).hdg; }
    s.pos[0] = pin.x; s.pos[2] = pin.z; s.vel[0] = 0; s.vel[2] = 0; s.w[1] = 0;
    // back to the held heading by a turn about the vertical (q is body → world: a world turn multiplies from the left)
    const d = P.wrap180(pin.h - P.attitude(s).hdg) * DEG;
    if (d) s.q = P.qmul([0, Math.sin(-d / 2), 0, Math.cos(-d / 2)], s.q);
  }
  // the physics events since the last frame (touchdown, hard_landing, crash, ...), read with the lesson's own cursor;
  // a reason worded for FLIGHT LAB comes as a copy worded for the aircraft (inWorld)
  function collect() {
    const ev = L.s.events;
    while (L.evSeen < ev.length) {
      const e = ev[L.evSeen++];
      res.events.push(e.why && inWorld(e.why) !== e.why ? { ...e, why: inWorld(e.why) } : e);
      if (e.type === 'touchdown') tally.landings++;
    }
  }
  function gradedNow() {
    let sum = 0; const st = L.st;
    if (st && st.stats) for (const k in st.stats) sum += st.stats[k].n;
    gr.on = gr.step === L.step && sum > gr.n;
    gr.step = L.step; gr.n = sum;
  }

  // ---------------------------------------------------------------- FLIGHT LAB's test loop (bot.mjs runLesson)
  // pilot(L, dt) and hook(L, t) write the state directly; nothing else touches it between the steps
  function runScripted(pilot, maxSec = 900, hook) {
    if (!L) return null;
    const dt = H;
    for (let i = 0; i < maxSec * 120 && !L.done; i++) {
      pilot(L, dt);
      if (hook) hook(L, i * dt);
      P.step(L.s, dt);
      if (L.free) SC.freeUpdate(L, dt); else SC.update(L, dt);
    }
    acc = 0; snap();
    return L;
  }

  // ---------------------------------------------------------------- the pilot's other inputs
  // an action by name (controls.js: flaps, flapsUp, gear, trim, trimReset, thrFull, thrIdle, level, autoRud,
  // feather0/1, restart0/1, rtrimL/R, trimStep ±1, thrStep ±1, parkBrake) → the explanation ('' = nothing to say)
  function action(name, arg) {
    if (!L || L.done) return '';
    return ctl.action(L, name, arg);
  }
  // the next checklist item (Enter): { ok, item?, text } — a refused item says what to set first
  function checklistNext() {
    if (!L) return { ok: false, text: '' };
    const r = SC.checklistNext(L);
    r.text = !r.ok && r.item ? inWorld(L.hint || '') : '';
    return r;
  }
  // the read-back (1–3): { ok, why, right } | null
  function answerAtc(i) {
    if (!L) return null;
    const r = SC.answerAtc(L, i);
    if (r) { lastRight = r.right; r.why = inWorld(r.why); }
    return r;
  }
  // a key pressed (once per press; the held keys are read by frame): Enter → the checklist, 1–3 → the read-back, then
  // FLIGHT LAB's action keys (V, Shift+V, Shift+R, Shift+F, G, T, Shift+T, L, U, [ ], Z, X) → { kind, text, ok?, tone? } |
  // null when the key is not one of these (C, H, Esc and the held keys are the integrator's)
  function key(code, shift = false) {
    if (!L || L.done) return null;
    if ((code === 'Enter' || code === 'NumpadEnter') && L.check) { const r = checklistNext(); return { kind: 'checklist', ok: r.ok, text: r.text }; }
    if (/^(Digit|Numpad)[123]$/.test(code) && L.atc) {
      const r = answerAtc(+code.slice(-1) - 1);
      return r ? { kind: 'atc', ok: r.ok, text: (r.ok ? '正解。' : `不正解。正しくは「${ourCall(r.right)}」。`) + r.why } : null;
    }
    const a = actionForKey(code, shift); if (!a) return null;
    return { kind: 'action', name: a, text: ctl.action(L, a), tone: ctl.kind };
  }
  function abort(reason = '中止') { if (L && !L.free) SC.abort(L, reason); }
  // CADET's own obstacles (buildings, parked aircraft): the airframe is damaged as physics would have it
  function crash(reason) {
    if (!L) return; const s = L.s;
    if (s.crashed) return;
    s.crashed = true; s.crashReason = reason; s.vel = [0, 0, 0]; s.w = [0, 0, 0];
    s.events.push({ t: s.t, type: 'crash', why: reason });
    P.derive(s);
  }

  // ---------------------------------------------------------------- the record and the progress (app.js lessonEnded)
  function flush(prog) { prog.time += tally.time; prog.landings += tally.landings; tally.time = 0; tally.landings = 0; return prog; }
  // once per finished lesson: the progress (tries, best grade, levels passed, time, landings) and the record.
  // A free flight only saves its time and landings.
  function finish() {
    if (!L) return null;
    if (L.free) { SC.saveProgress(db, flush(SC.loadProgress(db))); return null; }
    if (!L.done || L.endHandled) return null;
    L.endHandled = true;
    const prog = flush(SC.loadProgress(db));
    SC.noteLesson(prog, L); SC.saveProgress(db, prog);
    const rec = SC.recordFromLesson(L, '');
    if (rec) {
      rec.reason = inWorld(rec.reason);
      for (const S of rec.steps) { S.step = inWorld(S.step); for (const x of S.rows) { x.name = inWorld(x.name); x.val = inWorld(x.val); x.std = inWorld(x.std); } }
      for (const e of rec.events) if (e.why) e.why = inWorld(e.why);
    }
    return SC.addRecord(db, rec);
  }
  const progress = () => SC.loadProgress(db);
  const records = () => SC.loadRecords(db);

  // ---------------------------------------------------------------- what the HUD shows (reads only: L.last, never SC.ctx)
  // (the texts as the aircraft words them: inWorld; the tower's lines with today's call sign: ourCall)
  function status() {
    if (!L) return null;
    const s = L.s, lv = L.level, S = L.def.steps[L.step] || null, st = L.st || null;
    const stats = [];
    if (S && S.tgt && st) for (const k in st.stats) {
      const q = st.stats[k], lab = SC.TGT_LABEL[k] || [k, ''];
      stats.push({ key: k, label: lab[0], unit: lab[1], dp: SC.DP[k] || 0, tv: q.tv, d: q.d, tol: q.tol, inside: q.inside });
    }
    let check = null;
    if (L.check) {
      const C = SC.CHECKLISTS[L.check.id], at = L.check.i;
      check = { id: L.check.id, title: inWorld(C.title), i: at, items: C.items.map((it, i) => ({ name: inWorld(it[0]), text: inWorld(SC.checklistText(it, s)), ok: i < at, cur: i === at })) };
    }
    if (shown.L !== L || shown.n !== L.results.length) { shown.L = L; shown.n = L.results.length; shown.results = rowsInWorld(L.results); }
    const ar = L.atcResult;
    return {
      mode: L.free ? 'free' : 'lesson', id: L.id, title: L.def.title, level: lv.id, levelName: lv.name, aircraft: L.A.id,
      done: !!L.done, passed: !!L.passed, grade: L.grade || '', score: L.score || 0, passPct: L.passPct || 0, reason: inWorld(L.reason || ''),
      t: L.t, step: L.step, steps: L.def.steps.map(x => x.name), stepName: S ? S.name : '',
      kind: !S ? '' : S.checklist ? 'checklist' : S.atc ? 'atc' : S.estimate ? 'estimate' : 'fly',
      sayText: inWorld(L.sayText || ''), keysText: inWorld(L.keysText || ''), guideText: lv.guide ? inWorld(L.guideText || '') : '', hint: inWorld(L.hint || ''), chime: L.chime || 0,
      check, atc: L.atc ? { msg: ourCall(L.atc.msg), opts: L.atc.opts.map(ourCall), ok: L.atc.ok } : null,
      atcResult: ar ? { ok: ar.ok, why: inWorld(ar.why), t: ar.t, right: ourCall(lastRight) } : null,
      stats, holdT: st ? st.holdT : 0, need: st ? st.need || 0 : 0, stepT: st ? st.t : 0, turned: st ? st.turned : 0,
      dur: S && S.dur || 0, max: S && S.max || 0, graded: gr.on,
      results: shown.results, hood: !!L.hood, crashed: !!s.crashed, crashReason: inWorld(s.crashReason || ''),
      alt0: L.alt0, hdg0: L.hdg0, ctx: L.last || null,
    };
  }
  // the control strip's numbers for the HUD (one object, reused): the levers, the holds, the brakes, the basic readings
  const pnl = { thr: 0, rpm: 0, pitch: 0, pTgt: 0, keyHold: false, pIn: 0, trimPct: 0, flapLabel: '', flapMoving: false, brake: false, parkBrake: false,
    autoRud: false, rud: 0, rTrim: 0, stall: false, engRun: true, onGround: false, ias: 0, alt: 0, hdg: 0, vs: 0, gear: null };
  function panel(out = pnl) {
    if (!L) return out;
    const s = L.s, o = s.out, c = L.last || {};
    out.thr = s.thr; out.rpm = s.rpm; out.pitch = o.pitch; out.pTgt = s.pTgt == null ? o.pitch : s.pTgt;
    out.keyHold = !!s.keyHold && !s.onGround; out.pIn = s.pIn || 0;
    out.trimPct = Math.round(s.trim / P.TRIM_MAX * 100);
    out.flapLabel = s.A.flapLabels[s.flapIdx]; out.flapMoving = Math.abs(P.FLAP_DEG[s.flapIdx] - s.flapDeg) > 0.5;
    out.brake = !!s.brake; out.parkBrake = ctl.parkBrake; out.autoRud = !!s.opts.autoRud; out.rud = s.rudEff ?? s.rud; out.rTrim = ctl.rTrim;
    out.stall = !!o.stallWarn; out.onGround = !!s.onGround;
    // (a retractable gear: 'down' — the three green lights —, 'up', or 'moving' — the red light)
    out.gear = s.A.gear && s.A.gear.fixed === false ? (s.gearPos >= 0.995 ? 'down' : s.gearPos <= 0.005 ? 'up' : 'moving') : null;
    out.engRun = true; for (let i = 0; i < s.eng.length; i++) if (!s.eng[i].run) out.engRun = false;
    out.ias = c.kias ?? o.ias; out.alt = c.alt ?? o.altTrue; out.hdg = c.hdg ?? 0; out.vs = c.vs ?? o.vsi;
    return out;
  }
  // the pose to draw: physics position (m) and body→world quaternion, between the last two steps by alpha (acc / H)
  function pose(out = { pos: [0, 0, 0], q: [0, 0, 0, 1] }, alpha) {
    if (!L) return out;
    const s = L.s, a = Math.min(1, Math.max(0, alpha == null ? acc / H : alpha)), p0 = prev.pos, p1 = s.pos, q0 = prev.q, q1 = s.q;
    out.pos[0] = p0[0] + (p1[0] - p0[0]) * a; out.pos[1] = p0[1] + (p1[1] - p0[1]) * a; out.pos[2] = p0[2] + (p1[2] - p0[2]) * a;
    // the shorter way round, normalised
    const sg = q0[0] * q1[0] + q0[1] * q1[1] + q0[2] * q1[2] + q0[3] * q1[3] < 0 ? -1 : 1;
    const x = q0[0] + (sg * q1[0] - q0[0]) * a, y = q0[1] + (sg * q1[1] - q0[1]) * a, z = q0[2] + (sg * q1[2] - q0[2]) * a, w = q0[3] + (sg * q1[3] - q0[3]) * a;
    const n = Math.hypot(x, y, z, w) || 1;
    out.q[0] = x / n; out.q[1] = y / n; out.q[2] = z / n; out.q[3] = w / n;
    return out;
  }

  return {
    startLesson, startFree, startOnGround, continueFree, frame, runScripted, action, key, checklistNext, answerAtc, abort, crash,
    finish, progress, records, status, panel, pose,
    get L() { return L; }, get s() { return L ? L.s : null; }, get av() { return L ? L.av : null; }, get free() { return !!(L && L.free); },
    get acc() { return acc; }, get controls() { return ctl; }, get prefs() { return ctl.prefs; }, get store() { return db; },
  };
}
