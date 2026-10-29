// CADET — flight/intro-flight.js : the introductory flight (体験飛行) of the first day, over the practice area (FLIGHT
// LAB's free start 'area': 3,000 ft, 090, 115 KIAS, trimmed). 早瀬 教官 is the pilot: the take-off, the way there and
// back and the landing are his, behind the cards; in the air he hands the cadet the yoke for about two minutes. The
// steps (INTRO_STEPS): his talk (the attitude, the controls handed over), 20 seconds straight and level, a talk (a
// prediction, the look before the turn), the look out to the right, a right turn to 180, a talk (where LAB is), the
// nose turned to LAB, the controls handed back. The talks are content/dialog/intro.js; the flight waits while he talks.
// While the cadet flies he says a line now and then (INTRO_AIR, at most one every 4 s); a few limits are a word
// (soft), a few take the controls back (take: he says I have control, levels it, then the calls both ways and the
// controls again; the second time he keeps them). The cadet may also just watch: he flies the same steps.
// The cadet's hands are the yoke only (fly-mode lets W / S / A / D and the arrows through): the throttle, the flaps, the
// trim and the rudder are his — pilot(), run before every physics step, pins them (a gamepad's buttons too) and, when
// the controls are his, flies the bank he wants on a level flight path through Sorajima's assist.
// createIntro() → events for fly-mode: { type: 'say', key, text } | { type: 'talk', id } | { type: 'task', id, hud, bug }
// | { type: 'hud', hud: null } | { type: 'end', summary, delay? }. Its clocks are physics seconds (the steps flown).
// runIntroScripted() flies it all with a scripted cadet (the measure, the tests).
// Pure logic: no three.js, no DOM.
import { introAirDialogs, INTRO_AIR, INTRO_RIGHT, introPanel } from '../content/dialog/intro.js';
import { createRunner, createDialogState } from '../dialog/engine.js';
import { H } from './flight.js';

export const INTRO_STEPS = [{ talk: 'intro' }, { task: 'level' }, { talk: 'introB' }, { task: 'look' }, { task: 'turn' }, { talk: 'introC' }, { task: 'toward' }, { talk: 'introD' }];
// the tasks: the course's own for a first flight (not a standard to pass)
// src: level — AFH (FAA-H-8083-3C) ch.3 "Straight-and-Level Flight" (the nose on the horizon, wings level; ±100 ft is the
//   private pilot ACS's own for straight and level, FAA-S-ACS-6C, given here only as a target);
// src: turn — 115 KIAS is about 120 KTAS at 3,000 ft (σ ≈ 0.915); rate ≈ 1,091 × tan(bank) ÷ TAS: 15° gives 2.4°/s, 20°
//   3.3°/s, so 90° takes about 27–37 s plus the roll in and out (the book's aero.turn has the formula); the roll-out led
//   by about half the bank (AFH ch.3 "Level Turns"; FAA-H-8083-15B Instrument Flying Handbook "Turns to Predetermined
//   Headings"); 30 s with no bank ends it (no turn is forced);
// src: look — 14 CFR 91.113(b), AC 90-48D, AFH ch.3 "Turns" (the side of the turn cleared first); the head turned 45°
//   right or more (fly-mode's yaw: + is left)
export const INTRO_TASKS = {
  level: { secs: 20, alt: 100, bank: 5, share: 0.8 },
  look: { max: 15, yaw: -45, hintAt: 6 },
  turn: { to: 180, max: 60, noBank: 30, bank: [10, 25], alt: 150, hdgTol: 10, settle: 2, near: 30 },
  toward: { max: 45, hdgTol: 10, settle: 4 },
};
// the limits while the cadet flies: a word (soft) or the controls taken back (take). The course's own for a first
// flight, not regulations. src: soft kias — Vno 125 KIAS, the top of the green arc (sorajima.js pa28 v.no: a teaching
// value, the POH governs), the yellow arc above it for smooth air only (PHAK (FAA-H-8083-25C) ch.8 "Airspeed Indicator
// Markings"); 45° of bank is the steep turn's (AFH ch.3 "Steep Turns"), 70 KIAS well above Vs1 50 (sorajima.js v.s1)
export const INTRO_LIMITS = {
  soft: { bank: 30, kias: 125, alt: 150 },
  take: { bank: 45, pitchUp: 15, pitchDown: -10, kiasHi: 140, kiasLo: 70, alt: 400 },
  takeMax: 2, recoverMax: 6, handsMax: 150,
};
// the instructor's own: his bank in a demonstration (15°: SENS.low gives 30° for the full stick), the gaps between his
// lines (any, and a soft limit's), how settled the aircraft is before he talks after a takeover
const DEMO_BANK = 15, SAY_GAP = 4, SOFT_GAP = 8, CALM = { bank: 5, vs: 300, secs: 1.5 };
// (main.js DAY_WIND: the first day is always a fine one — career.js forcedWeather)
export const INTRO_WIND = { fromDeg: 4, kt: 5 };

const NONE = Object.freeze([]);            // (a frame with nothing to tell)
const wrap180 = (a) => ((a % 360) + 540) % 360 - 180;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const round5 = (b) => (Math.round(b / 5) * 5) % 360 || 360;

// where LAB is from here: its runway's midpoint, the magnetic bearing, relative to the nose (+ right), the side as the
// talk says it (introC c2), the distance
export function relLab(FL, pos, hdgMag) {
  const P = FL.physics, AV = FL.avionics, R = P.LAB_RWY;
  const [n, e] = P.rwyToNE(R, R.len / 2, 0), lab = { n, e };
  const brg = AV.trueToMag(AV.neBearing(pos, lab), P.MAGVAR_W), rel = wrap180(brg - hdgMag);
  const side = Math.abs(rel) < 10 ? 'f' : rel > 0 ? (rel > 80 ? 'rb' : 'r') : (rel < -80 ? 'lb' : 'l');
  return { brg, rel, side, nm: AV.neDistNm(pos, lab) };
}

// thr0: the throttle he keeps; alt0 / hdg0: the start's (3,000 ft, 090)
export function createIntro({ FL, thr0 = 0.84, alt0 = 3000, hdg0 = 90 } = {}) {
  const P = FL.physics;
  let step = -1, watch = false, hands = false, done = false, crashed = false;
  let task = null;                         // the task flown now: { id, t, ... }
  let take = null;                         // he has taken the controls back: { t, calm, talked }
  let takes = 0, handsS = 0, airS = 0, sayT = 0, softT = 0, touched = false, trim0 = null;
  let bug = hdg0, lab = null;
  let dtS = 0, posNow = null;              // (this frame's physics seconds and position, for the tasks)
  const out = { level: null, look: null, turn: null, toward: null };
  const log = [];                          // the tasks and the takeovers as they ended: { task, secs, result }
  const said = new Set();                  // (the lines said once in a task)

  const say = (evs, key, force = false) => { if (!force && sayT > 0) return false; evs.push({ type: 'say', key, text: INTRO_AIR[key] }); sayT = SAY_GAP; return true; };
  const once = (key) => { if (said.has(key)) return false; said.add(key); return true; };
  // the next of INTRO_STEPS: a talk, or a task begun
  function next(evs) {
    step++;
    const s = INTRO_STEPS[step];
    if (!s) return;
    if (s.talk) { task = null; evs.push({ type: 'talk', id: s.talk }); } else begin(s.task, evs);
  }
  function begin(id, evs) {
    task = { id, t: 0, in: 0, took: false, banked: false, rolled: false, out: false, settle: 0, lo: 0, hi: 0, peak: 0, nolook: !!(task && task.nolook) };
    said.clear();
    if (id === 'turn') bug = INTRO_TASKS.turn.to;
    if (id === 'toward' && lab) bug = round5(lab.brg);
    evs.push({ type: 'task', id, hud: introPanel(watch ? 'watch' : id, { brg: bug }), bug });
    const line = watch ? { level: 'D_level', look: 'D_look', toward: 'D_toward' }[id] : id === 'toward' ? 'W_how' : null;
    if (line) say(evs, line, true);
  }
  function finish(result, evs) {
    out[task.id] = result;
    log.push({ task: task.id, secs: task.t, result, peak: task.peak, lo: task.lo, hi: task.hi });
    next(evs);
  }

  // ---- the tasks, each frame
  function level(c, evs) {
    const T = INTRO_TASKS.level, dAlt = c.alt - alt0;
    if (Math.abs(dAlt) <= T.alt && Math.abs(c.bank) <= T.bank) task.in += dtS;
    if (!watch) {
      if (dAlt > 60) say(evs, 'L_hi'); else if (dAlt < -60) say(evs, 'L_lo'); else if (Math.abs(c.bank) > 4) say(evs, 'L_wing');
      else if (!touched && task.t >= 8 && sayT <= 0 && once('L_hands')) say(evs, 'L_hands');
      else if (task.t >= 12 && sayT <= 0 && once('L_good')) say(evs, 'L_good');
    }
    if (task.t >= T.secs) finish(watch ? 'watch' : task.took ? 'took' : task.in / task.t >= T.share ? 'good' : 'drift', evs);
  }
  function look(c, evs, lookDeg) {
    const T = INTRO_TASKS.look;
    if (watch) { if (task.t >= 3) finish('watch', evs); return; }
    if (lookDeg <= T.yaw) { say(evs, 'K_ok', true); finish(task.nolook ? 'late' : 'ok', evs); return; }
    // (banked before looking: said once, and the turn will say it again)
    if (!task.nolook && task.rolled && Math.abs(c.bank) > 5) { task.nolook = true; say(evs, 'K_first', true); }
    else if (task.t >= T.hintAt && sayT <= 0 && once('K_how')) say(evs, 'K_how');
    if (task.t >= T.max) { say(evs, 'K_time', true); finish('time', evs); }
  }
  function turn(c, evs) {
    const T = INTRO_TASKS.turn, toGo = wrap180(T.to - c.hdg), lead = Math.abs(c.bank) / 2 + 2, dAlt = c.alt - alt0;
    task.peak = Math.max(task.peak, c.bank); task.lo = Math.min(task.lo, dAlt); task.hi = Math.max(task.hi, dAlt);
    if (c.bank >= T.bank[0]) task.banked = true;
    if (!task.out && task.banked && toGo <= lead) { task.out = true; say(evs, watch ? 'D_roll' : 'T_roll', true); }
    if (!watch && sayT <= 0) {
      if (c.bank > 28) say(evs, 'T_steep');
      else if (dAlt < -80) say(evs, 'T_low');
      else if (dAlt > 80) say(evs, 'T_high');
      else if (!task.banked && ((task.t >= 10 && once('T_how')) || (task.t >= 20 && once('T_how2')))) say(evs, 'T_how');
      // (Sorajima's stick springs back: a shallow bank comes off by itself — the AFH's shallow turn)
      else if (task.banked && !task.out && c.bank < T.bank[0] && toGo > T.near) say(evs, 'T_shallow');
      else if (!task.out && toGo <= T.near && toGo > lead && once('T_near')) say(evs, 'T_near');
    }
    task.settle = Math.abs(toGo) <= T.hdgTol && Math.abs(c.bank) < 5 ? task.settle + dtS : 0;
    if (task.settle >= T.settle) {
      if (!watch) say(evs, 'T_ok', true);
      lab = relLab(FL, posNow, c.hdg);
      finish(watch ? 'watch' : task.took ? 'took' : task.nolook ? 'nolook' : task.lo < -T.alt ? 'low' : task.hi > T.alt ? 'high' : 'good', evs);
    } else if (!watch && !task.banked && task.t >= T.noBank) { lab = relLab(FL, posNow, c.hdg); finish('none', evs); }
    else if (task.t >= T.max) { say(evs, 'T_time', true); lab = relLab(FL, posNow, c.hdg); finish(watch ? 'watch' : 'none', evs); }
  }
  function toward(c, evs) {
    const T = INTRO_TASKS.toward, toGo = wrap180(bug - c.hdg), dAlt = c.alt - alt0;
    if (!watch && sayT <= 0) {
      if (Math.abs(c.bank) > 28) say(evs, 'T_steep');
      else if (dAlt < -80) say(evs, 'T_low');
      else if (dAlt > 80) say(evs, 'T_high');
    }
    task.settle = Math.abs(toGo) <= T.hdgTol ? task.settle + dtS : 0;
    if (task.settle >= T.settle) { say(evs, 'W_ok', true); finish(watch ? 'watch' : 'good', evs); }
    else if (task.t >= T.max) { say(evs, 'W_time', true); finish(watch ? 'watch' : 'time', evs); }
  }

  // ---- the limits while the cadet flies
  function tooFar(c) {
    const X = INTRO_LIMITS.take;
    return Math.abs(c.bank) > X.bank || c.pitch > X.pitchUp || c.pitch < X.pitchDown || c.kias > X.kiasHi || c.kias < X.kiasLo || c.stall || Math.abs(c.alt - alt0) > X.alt;
  }
  function soft(c, evs) {
    if (softT > 0 || sayT > 0) return;
    const S = INTRO_LIMITS.soft, k = Math.abs(c.bank) > S.bank ? 'G_bank' : c.kias > S.kias ? 'G_fast' : Math.abs(c.alt - alt0) > S.alt ? 'G_alt' : null;
    if (k && say(evs, k)) softT = SOFT_GAP;
  }
  // he takes them: I have control (the first call, at once), the panel says he flies
  function takeOver(evs) {
    takes++; hands = false; take = { t: 0, calm: 0, talked: false };
    if (task) task.took = true;
    say(evs, 'X_take', true);
    evs.push({ type: 'task', id: task ? task.id : 'level', hud: introPanel('watch'), bug });
  }
  // levelled and settled (or 6 s): the calls both ways and the controls again — or, the second time, he keeps them
  function recover(c, evs) {
    take.t += dtS;
    take.calm = Math.abs(c.bank) < CALM.bank && Math.abs(c.vs) < CALM.vs ? take.calm + dtS : 0;
    if (!take.talked && (take.calm >= CALM.secs || take.t >= INTRO_LIMITS.recoverMax)) {
      take.talked = true;
      log.push({ task: 'take', secs: take.t, result: takes >= INTRO_LIMITS.takeMax ? 'kept' : 'back' });
      evs.push({ type: 'talk', id: takes >= INTRO_LIMITS.takeMax ? 'introEnd' : 'introTake' });
    }
  }

  // ---- the aircraft's controls, before every physics step (flight.frame's pilot)
  // (his hands — a demonstration or a recovery — leave pTgt empty: when they are the cadet's again, the keyboard's
  // pitch hold takes the attitude of that moment, controls.js)
  function demoBank(c) {
    if (!task || !c || take) return 0;
    if (task.id === 'turn') { const toGo = wrap180(INTRO_TASKS.turn.to - c.hdg); return toGo > Math.abs(c.bank) / 2 + 2 ? DEMO_BANK : 0; }
    if (task.id === 'toward') { const toGo = wrap180(bug - c.hdg); return Math.abs(toGo) > Math.abs(c.bank) / 2 + 2 ? DEMO_BANK * Math.sign(toGo) : 0; }
    return 0;
  }
  function pilot(L) {
    const s = L.s;
    if (trim0 == null) trim0 = s.trim;
    s.thr = thr0; s.flapIdx = 0; s.trim = trim0; s.opts.autoRud = true; s.opts.levelT = 0;
    if (hands && !take && !done) {
      s.opts.assist = false;
      if (Math.abs(s.pKey || 0) > 0.05 || Math.abs(s.rKey || 0) > 0.05) touched = true;
      if (task && task.id === 'look' && Math.abs(s.rKey || 0) > 0.2) task.rolled = true;
      return;
    }
    // (the assist: the stick's side is a bank, SENS's for the full stick; its fore and aft a climb angle — none)
    s.opts.assist = true; s.keyHold = false; s.pTgt = null; s.pIn = 0;
    s.rIn = clamp(demoBank(L.last) / (P.SENS[s.opts.sens] || P.SENS.low).bank, -1, 1);
  }
  // the flight as it went: for the logbook (airSec: the seconds flown here; cut: left before the end) and the tests
  function summary({ cut = false } = {}) {
    return { cut: cut || crashed, watched: watch, airSec: airS, handsS, takes, level: out.level, look: out.look, turn: out.turn, toward: out.toward, labSide: lab ? lab.side : null, labRel: lab ? lab.rel : null };
  }

  return {
    begin() { step = -1; const evs = []; next(evs); return evs; },
    // a frame flown: physS its physics seconds, c FLIGHT LAB's context (L.last), pos { n, e }, lookDeg the head's yaw
    update(physS, c, pos, lookDeg = 0) {
      if (done || !c || !(physS > 0) || (!task && !take)) return NONE;
      const evs = [];
      dtS = physS; posNow = pos;
      airS += physS; sayT -= physS; softT -= physS;
      if (take) { if (!take.talked) recover(c, evs); return evs; }
      if (hands) {
        if (tooFar(c)) { takeOver(evs); return evs; }
        handsS += physS;
        soft(c, evs);
        // (the minutes at the controls kept short: on to the hand-back)
        if (handsS >= INTRO_LIMITS.handsMax) { out[task.id] = out[task.id] || 'time'; log.push({ task: task.id, secs: task.t, result: 'time' }); step = INTRO_STEPS.length - 2; next(evs); return evs; }
      }
      task.t += physS;
      if (task.id === 'level') level(c, evs);
      else if (task.id === 'look') look(c, evs, lookDeg);
      else if (task.id === 'turn') turn(c, evs);
      else if (task.id === 'toward') toward(c, evs);
      return evs;
    },
    // a talk over, with its last 'intro' hook: what comes next
    onTalkEnd(go) {
      const evs = [];
      if (done) return evs;
      if (go === 'level' || go === 'watch') { watch = go === 'watch'; hands = !watch; next(evs); }
      else if (go === 'look' || go === 'toward') next(evs);
      else if (go === 'resume') {
        take = null; hands = true;
        // (the 20 seconds again; the turn and LAB go on where they were: their clocks waited)
        if (task && task.id === 'level') { task.t = 0; task.in = 0; }
        if (task) evs.push({ type: 'task', id: task.id, hud: introPanel(task.id, { brg: bug }), bug });
      } else if (go === 'back') { done = true; task = null; evs.push({ type: 'hud', hud: null }, { type: 'end', summary: summary() }); }
      return evs;
    },
    // the airframe damaged (it should not be: the limits take it back long before): his word, and the end
    crashed() { if (done) return []; done = true; crashed = true; task = null; return [{ type: 'say', key: 'X_crash', text: INTRO_AIR.X_crash }, { type: 'hud', hud: null }, { type: 'end', summary: summary({ cut: true }), delay: 2 }]; },
    pilot,
    get cadetHands() { return hands && !take && !done; },
    get done() { return done; },
    get log() { return log.slice(); },
    // the talks' context (content/dialog/intro.js)
    ctx() { return { level: out.level, watch, turn: out.turn, labSide: lab ? lab.side : 'r', toward: out.toward }; },
    summary,
    view() { return { step, task: task ? task.id : null, t: task ? task.t : 0, hands: hands && !take && !done, watch, take: !!take, takes, handsS, airS, bug, lab: lab ? { ...lab } : null, results: { ...out }, done }; },
  };
}

// ---- a scripted cadet (the measure, the tests): the keys held for a task, from the aircraft's state.
// cadet: hands off for the 20 s (the trim and the pitch hold keep it), the head to the right, D held to 12° (the roll
// goes on to about 19° once it is let go), tapped again under 10°, A at the lead (half the bank), S when 60 ft low;
// none: nothing at all; watch: D held all along (the gamepad's stick, which fly-mode's key filter does not stop: his
// hands must win); wild: S, then W, then D, 10 s each (the takeovers). mem: what it keeps between frames (per task)
export function scriptedKeys(hands, task, c, t, mem = {}, alt0 = 3000) {
  const k = new Set();
  if (!c || hands === 'none') return k;
  if (hands === 'watch') { k.add('KeyD'); return k; }
  if (hands === 'wild') { const w = t < 1 ? null : ['KeyS', 'KeyW', 'KeyD'][Math.floor((t - 1) / 10) % 3]; if (w) k.add(w); return k; }
  if (task !== 'turn' && task !== 'toward') return k;
  // (a moment to reach for the yoke: a key already held when the flight goes on waits for its release, controls.js)
  if (mem.t0 == null) mem.t0 = t;
  if (t - mem.t0 < 0.3) return k;
  const toGo = task === 'turn' ? wrap180(INTRO_TASKS.turn.to - c.hdg) : wrap180(mem.bug - c.hdg), dir = task === 'turn' ? 1 : Math.sign(toGo) || 1;
  const key = dir > 0 ? 'KeyD' : 'KeyA', b = c.bank * dir;
  if (!mem.out && Math.abs(toGo) > Math.abs(c.bank) / 2 + 2) {
    if (!mem.rolled) { if (b < 12) k.add(key); else mem.rolled = true; }
    else if (b < 10) k.add(key);
  } else { mem.out = true; if (c.bank > 2) k.add('KeyA'); else if (c.bank < -2) k.add('KeyD'); }
  if (c.alt - alt0 < -60) k.add('KeyS');
  return k;
}

// the whole introductory flight flown by a scripted cadet: FLIGHT LAB's free start 'area' through flight/flight.js
// (createFlight passed in: a store of its own), the talks answered by policy (v → a choice's index, or null: the right
// one where a check asks, else the first; the watch: its choice), the frames 1/60 s. keys(task, c, t) in place of
// scriptedKeys (the tests' random hands); onFrame(c, view) after each frame (the tests' watch on the aircraft).
// → { steps: [{ talk, id, ctx } | { task, id, secs, result, peak }], sum, says, flight, t }
export function runIntroScripted(FL, createFlight, { hands = 'cadet', store = null, policy = null, keys = null, onFrame = null, maxSec = 600 } = {}) {
  const P = FL.physics, flight = createFlight(FL, { store });
  flight.startFree('area', 'pa28', { sens: 'low', autoRud: true, assist: false, wind: { rel: INTRO_WIND.fromDeg - P.LAB_RWY.trueHdg, kt: INTRO_WIND.kt, gust: 0.5 } });
  const intro = createIntro({ FL, thr0: flight.s.thr, alt0: flight.L.alt0, hdg0: flight.L.hdg0 });
  const data = introAirDialogs(), state = createDialogState(), steps = [], says = [];
  const NO = { has: () => false };
  const pick = (v) => {
    if (hands === 'watch' && v.node === 'a:yhc:ask') return v.choices.findIndex(c => /見ているだけ/.test(c.text));
    const p = policy ? policy(v) : null; if (p != null && p >= 0) return p;
    const re = INTRO_RIGHT[v.node], i = re ? v.choices.findIndex(c => re.test(c.text)) : -1;
    return i >= 0 ? i : 0;
  };
  // a talk: run to its end (the flight waits), its last 'intro' hook told back
  const talk = (id) => {
    const ctx = { intro: intro.ctx() };
    steps.push({ talk: id, id, ctx: { ...ctx.intro } });
    let go = null;
    const r = createRunner({ data, state, ctx, hooks: { onHook: (n, a) => { if (n === 'intro') go = a; } } });
    r.start(id);
    for (let k = 0; k < 200 && r.running; k++) { const v = r.view(); if (v.choices.length) r.choose(pick(v)); else r.next(); }
    flight.controls.clearKeys();                     // (fly-mode: the keys held through a talk wait for their release)
    return go;
  };
  let logged = 0, sum = null, t = 0, mem = {}, task = null, taskT = 0;
  const flush = () => { const l = intro.log; for (; logged < l.length; logged++) steps.push({ ...l[logged], id: l[logged].task }); };
  let pending = intro.begin();
  while (!sum && t < maxSec) {
    while (pending.length && !sum) {
      const e = pending.shift();
      if (e.type === 'say') says.push({ key: e.key, t });
      else if (e.type === 'talk') { flush(); pending.push(...intro.onTalkEnd(talk(e.id))); }
      else if (e.type === 'task') { flush(); if (e.id !== task) { task = e.id; taskT = t; mem = { bug: e.bug }; } }
      else if (e.type === 'end') { flush(); sum = e.summary; }
    }
    if (sum) break;
    const c = flight.L.last, v = intro.view();
    const held = intro.cadetHands || hands === 'watch' ? (keys ? keys(v.task, c, v.handsS) : scriptedKeys(hands, v.task, c, v.handsS, mem, flight.L.alt0)) : null;
    const res = flight.frame(1 / 60, held ? { has: (k) => held.has(k) } : NO, { pilot: intro.pilot });
    t += res.steps * H;
    for (const ev of res.events) if (ev.type === 'crash') pending.push(...intro.crashed(ev.why));
    // (the head: to the right two seconds into the look)
    const lookDeg = (hands === 'cadet' || hands === 'wild') && v.task === 'look' && t - taskT >= 2 ? -60 : 0;
    pending.push(...intro.update(res.steps * H, flight.L.last, P.ne(flight.s), lookDeg));
    if (onFrame) onFrame(flight.L.last, intro.view());
  }
  flush();
  return { steps, sum, says, flight, t };
}
