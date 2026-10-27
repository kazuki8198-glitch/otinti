// CADET — career/day.js : a flying day, from the walk-around to the logbook (M4's first day; M5: any day of chapter
// 2 and the first solo), as one line through the game:
//   walk-around → before start → start → after start → ATIS → Ground (taxi) → taxi out → run-up → Tower (line up) →
//   lined up → the day's lessons, with the moves between them → Tower (off the runway) → taxi off → Ground → taxi in →
//   shutdown → debrief → logbook.
// The day's lessons come from the lesson to practise (planFor): a lesson in the practice area is flown between the
// take-off (t1) and the landing (t3) — t1 → Tower (frequency change) → to the practice area (skipped, or flown) → the
// lesson → Tower (back) → back to LAB → t3; the circuit's lessons (t2, t4) after t1 round the circuit; the ones that
// start rolling (e1, e2, c1) at once, the tower's clearance first where the lesson has none of its own; after a lesson
// that ends in a forced landing the instructor takes it back to LAB ('recover'). The first solo: t1, then three
// circuits to a full stop (t2), each one off again with the tower's clearance (stopgo).
// The lessons are FLIGHT LAB's own, started fresh where FLIGHT LAB starts them (t1 lined up on 36 at 30 m, a2 in the
// practice area, t3 on a 5 km final…), so their grades are FLIGHT LAB's for the same inputs. Everything between them
// is CADET's: its checklists (content/checklists-archer.js) tick themselves as the switches are set (an item to look at
// is confirmed with Enter), the radio (dialog/atc.js), the taxiing, the run-up's readings.
// update(c) every frame with what the aircraft is doing; the step changes come back as events. The game (fly-mode,
// day-mode) acts on them: starting a lesson, the radio panel, the instructor's words.
// Pure logic: no three.js, no DOM.
import { createWalkaround } from '../aircraft/walkaround.js';
import { CHECKLISTS as CHECKLISTS_ARCHER } from '../content/checklists-archer.js';
import { CHECKLISTS as CHECKLISTS_SEMINOLE } from '../content/checklists-seminole.js';
import { dayRadio, setCall } from '../content/dialog/atc.js';
import { createAtc } from '../dialog/atc.js';
import { HOLD, HOLD_STOP, A1 } from '../flight/taxi.js';
import { RUNUP, magState } from '../aircraft/systems.js';

// the first day's lessons (M4); every other day is built the same way from its lesson (planFor)
export const DAY1 = { id: 'day1', n: 1, title: '最初の 1 日', lessons: ['t1', 'a2', 't3'], aircraft: 'N738SY', type: 'PA-28-181' };
// the steps that are not lessons: a checklist, a radio sequence, a place to get to, or a move between two lessons
// (move: the game starts the next lesson — the cadet flies there or it is skipped; 'recover' is always skipped)
export const STEPS = {
  walk: { label: '外部点検' },
  prestart: { label: 'エンジン始動前', list: 'before_start' },
  start: { label: 'エンジン始動', list: 'start' },
  afterStart: { label: 'エンジン始動後', list: 'after_start' },
  atis: { label: 'ATIS を聞く', radio: 'atis' },
  ground: { label: '地上管制を呼ぶ', radio: 'ground' },
  taxiOut: { label: 'タキシー：A1 の停止線まで', place: 'hold' },
  runup: { label: 'ランナップ', list: 'runup' },
  tower: { label: '管制塔を呼ぶ', radio: 'tower' },
  lineup: { label: '滑走路 36 に入って待つ', place: 'lineup' },
  takeoff: { label: '管制塔：離陸の許可', radio: 'takeoff' },
  leave: { label: '管制塔：周波数の変更', radio: 'leave' },
  transit: { label: '訓練空域へ', move: 'transit' },
  back: { label: '管制塔を呼ぶ（帰投）', radio: 'back' },
  return: { label: 'LAB へ戻る', move: 'return' },
  closed: { label: '管制塔：場周経路', radio: 'closed' },
  pattern: { label: '場周経路を回る', move: 'pattern' },
  recover: { label: '教官が出力を戻して LAB へ', move: 'recover' },
  stopgo: { label: '管制塔：もう一度離陸', radio: 'stopgo' },
  recycle: { label: 'もう一度離陸して場周経路へ', move: 'recycle' },
  exit: { label: '管制塔：滑走路を出る', radio: 'exit' },
  taxiOff: { label: '滑走路を出て止まる', place: 'clear' },
  groundIn: { label: '地上管制を呼ぶ', radio: 'groundIn' },
  taxiIn: { label: 'タキシー：駐機場へ', place: 'stand', list: 'after_landing', soft: true },
  shutdown: { label: 'エンジン停止', list: 'shutdown' },
  debrief: { label: '講評' },
  done: { label: '1 日の終わり' },
};
const GROUND_OUT = ['walk', 'prestart', 'start', 'afterStart', 'atis', 'ground', 'taxiOut', 'runup', 'tower', 'lineup'];
const GROUND_IN = ['exit', 'taxiOff', 'groundIn', 'taxiIn', 'shutdown', 'debrief', 'done'];
// where a lesson starts (FLIGHT LAB's setup.at) and how it ends: in the air (t1, t4: climbing away), in the practice
// area, stopped on the runway (t2, t3: landed; e1: the take-off rejected), or with the engine failed and the aircraft
// down (e2, e3, c1: FLIGHT LAB flies the forced landing to the end)
const START_OF = { runway: 'runway', area: 'area', away: 'area', final: 'pattern', downwind: 'pattern', ils: 'pattern' };
const END_OF = { t1: 'air', t4: 'air', x3: 'air', t2: 'stopped', t3: 'stopped', e1: 'stopped', x1: 'stopped', x2: 'stopped', e2: 'failed', e3: 'failed', c1: 'failed',
  m1: 'air', m4: 'air', m5: 'stopped', r1: 'stopped' };
// the lessons that give their own take-off clearance (FLIGHT LAB's ATC step); before the others the tower gives it
const OWN_TAKEOFF = new Set(['t1', 'c1']);
// the twin's lessons (M6): the Seminole takes off in m1 (or m4, whose engine fails after it) and lands in m5
const lessonOf = (FL, id) => FL.syllabus.STAGES.flatMap(s => s.lessons).find(l => l.id === id);
export const startKind = (FL, id) => START_OF[(lessonOf(FL, id) || {}).setup?.at] || 'area';
export const endKind = (FL, id) => END_OF[id] || (startKind(FL, id) === 'area' ? 'area' : 'air');

// the day's lessons for a lesson to practise: the take-off (t1) and the landing (t3) around it where it needs them;
// the first solo: the take-off, then three circuits to a full stop (t2)
// (M6) a check's own lessons in its order (career.js CHECKS); the solo cross-country flies n2 alone (xc)
export function planFor(FL, id, { solo = false, check = null } = {}) {
  if (check) return { main: check.lessons.find(x => !/^t[13]$/.test(x)) || check.lessons[0], solo: check.kind === 'xc', xc: check.kind === 'xc', check: check.kind === 'checkride', lessons: check.lessons.slice(), aircraft: aircraftOf(FL, check.lessons) };
  if (solo) return { main: 't2', solo: true, lessons: ['t1', 't2', 't2', 't2'], aircraft: 'pa28' };
  const k = startKind(FL, id), e = endKind(FL, id);
  let lessons;
  if (aircraftOf(FL, [id]) === 'pa44') {
    // the twin: up with m1 (m4 is its own take-off), down with m5
    if (id === 'm5') lessons = ['m1', 'm5'];
    else if (k === 'runway') lessons = [id, 'm5'];
    else lessons = ['m1', id, 'm5'];
    return { main: id, solo: false, lessons, aircraft: 'pa44' };
  }
  if (k === 'runway') lessons = e === 'stopped' ? [id] : [id, 't3'];
  else if (id === 't3') lessons = ['t1', 't3'];
  else lessons = ['t1', id, ...(e === 'stopped' ? [] : ['t3'])];
  return { main: id, solo: false, lessons, aircraft: 'pa28' };
}
// the aircraft a day's lessons are flown in (FLIGHT LAB's lesson says)
export const aircraftOf = (FL, lessons) => (lessons.some(id => (lessonOf(FL, id) || {}).aircraft === 'pa44') ? 'pa44' : 'pa28');
// the steps of a day with these lessons
export function stepsFor(FL, lessons) {
  const out = GROUND_OUT.slice();
  lessons.forEach((id, i) => {
    const k = startKind(FL, id);
    if (i === 0) {
      if (k !== 'runway') throw new Error(`the day's first lesson starts on the runway (${id} does not)`);
      if (!OWN_TAKEOFF.has(id)) out.push('takeoff');
    } else {
      const pe = endKind(FL, lessons[i - 1]);
      if (k === 'runway') throw new Error(`${id} starts on the runway: only as the day's first lesson`);
      if (pe === 'failed') out.push('recover');
      else if (k === 'area') out.push('leave', 'transit');
      else if (pe === 'area') out.push('back', 'return');
      else if (pe === 'air') out.push('closed', 'pattern');
      else out.push('stopgo', 'recycle');
    }
    out.push(id);
  });
  if (endKind(FL, lessons[lessons.length - 1]) !== 'stopped') throw new Error('the day ends with a landing');
  return out.concat(GROUND_IN);
}
// M4's first day, step by step
export const ORDER = [...GROUND_OUT, 't1', 'leave', 'transit', 'a2', 'back', 'return', 't3', ...GROUND_IN];
const w180 = (a) => ((a % 360) + 540) % 360 - 180;

// createDay(FL, opts): opts { seed, level ('intro' | 'basic' | 'precision'), anomalies (tests), stand { a, c },
// plan (planFor: the day's lessons; M4's first day when left out), weather (for the ATIS: { info, zulu, tempC, dewC }) }
// (M7) fault: 'mag' — the left magneto drops beyond the limit in the run-up (the game sets it in aircraft/systems.js):
// the day stops at that item and asks the cadet (decideFault: 'return' to the stand and the mechanic, 'burn' — a lean
// run-up to clear a fouled plug, tried once; it stays out — or 'go', which the instructor will not let happen)
export function createDay(FL, { seed = 1, level = 'basic', anomalies, stand = { a: 636.5, c: 207.6 }, plan = null, weather = {}, fault = null } = {}) {
  const P = FL.physics, SC = FL.school, R = P.LAB_RWY;
  const PLAN = plan || { main: 'a2', solo: false, lessons: DAY1.lessons };
  setCall(PLAN.aircraft || 'pa28');                          // (today's aircraft is the radio's call sign)
  const steps = stepsFor(FL, PLAN.lessons);
  const intent = PLAN.lessons.some(id => startKind(FL, id) === 'area') ? 'area' : 'pattern';
  // the weather the lessons fly in (FLIGHT LAB's: their wind and altimeter), for the ATIS
  const L1 = SC.startLesson(PLAN.lessons[0], 'intro'), wm = /^(\d+) at (\d+)$/.exec(L1.windStr || '');
  const radio = dayRadio({ ...weather, windMag: wm ? +wm[1] : 10, windKt: wm ? +wm[2] : 5, qnh: L1.s.qnh, intent, solo: PLAN.solo && !PLAN.xc, xc: !!PLAN.xc });
  const atc = createAtc(radio, { seed });
  const AIRCRAFT = PLAN.aircraft || 'pa28', CHECKLISTS = AIRCRAFT === 'pa44' ? CHECKLISTS_SEMINOLE : CHECKLISTS_ARCHER;
  const walk = createWalkaround({ seed, anomalies, aircraft: AIRCRAFT });
  const st = {
    phase: 'walk', step: 0, list: null, i: 0, flown: [], ticked: [], skipped: [], memo: { both: 0, dropL: 0, dropR: 0, carb: 0, idle: false, hold: { L: 0, R: 0, C: 0 } },
    lessons: {}, incursion: false, overHold: false, exit: '', stopAt: null, transit: 'skip', t: 0, airT: 0, blockT: 0, started: false, shutdown: false,
    trust: 0, notes: [], auto: { list: 0, taxi: 0 }, leftOn: [],
    fault: fault === 'mag' ? { kind: 'mag', asked: false, tries: 0, decided: null, drop: 0 } : null,
  };
  // what happened since the last update() (a phase entered from outside it — a lesson ended, the cadet boarded —
  // is told at the next one)
  const events = [];
  const emit = (e) => events.push(e);
  // a step by its id: a lesson's own (its title from FLIGHT LAB's syllabus), or one of STEPS
  const info = (id) => STEPS[id] || { label: `課目 ${id}：${(lessonOf(FL, id) || {}).title || id}`, lesson: id };
  // enter the step at index k (or the next step with this id: a step entered from outside, a crash's debrief)
  function enter(phase, k) {
    if (k == null) { k = steps.indexOf(phase, st.step + 1); if (k < 0) k = steps.indexOf(phase); }
    const from = st.phase; st.phase = phase; st.step = k;
    const ph = info(phase);
    st.list = ph.list || null; st.i = 0;
    if (ph.radio) atc.start(ph.radio, phase === 'exit' || phase === 'groundIn' ? st.exit : undefined);
    emit({ type: 'phase', from, to: phase });
  }
  const list = () => (st.list ? CHECKLISTS[st.list] : null);
  // the current checklist item, as the HUD shows it
  function items() {
    const C = list(); if (!C) return null;
    return { id: st.list, title: C.title, i: st.i, items: C.items.map((it, k) => ({ name: it[0], what: it[1], confirm: !it[2], ctl: it[3], note: it[4], ok: k < st.i, cur: k === st.i })) };
  }
  // the run-up's readings: the rpm on both magnetos, then the drop on each alone (held half a second: L — the left
  // alone, MAG RIGHT OFF; R — the right alone), carb heat, the idle
  function watchRunup(c, dt) {
    const m = st.memo, rpm = c.rpm, mag = magState(c.sw);
    if (st.phase !== 'runup' || !dt) return;
    // read only when the rpm has settled (the engine takes a few seconds to wind up to a new throttle setting)
    const steady = m.prev != null && Math.abs(rpm - m.prev) / dt < 25 && m.prevMag === mag && m.prevCarb === c.sw.carbHeat;
    m.prev = rpm; m.prevMag = mag; m.prevCarb = c.sw.carbHeat;
    m.steadyT = steady ? (m.steadyT || 0) + dt : 0;
    if (mag === 'BOTH' && !c.sw.carbHeat && rpm > 1850 && m.steadyT > 0.3) m.both = rpm;
    for (const [k, on] of [['L', mag === 'L'], ['R', mag === 'R'], ['C', c.sw.carbHeat && mag === 'BOTH']]) {
      m.hold[k] = on && m.both && m.steadyT > 0.3 ? m.hold[k] + dt : 0;
      if (m.hold[k] > 0.4) { const d = Math.round(m.both - rpm); if (k === 'L') m.dropL = d; else if (k === 'R') m.dropR = d; else m.carb = d; }
    }
    if (rpm > 300 && rpm < 820 && m.both) m.idle = true;
  }
  // the checklist: items tick in order as they become true; a confirm item waits for confirm()
  function tick(c) {
    const C = list(); if (!C) return;
    while (st.i < C.items.length) {
      const it = C.items[st.i];
      if (!it[2] || !it[2](c)) break;
      st.ticked.push(`${st.list}:${st.i}`); st.i++; emit({ type: 'tick', list: st.list, i: st.i - 1 });
    }
  }
  const prep = (c) => { c.memo = st.memo; c.walk = true; c.qnh = radio.weather.qnh; return c; };
  function confirm(c) {
    prep(c); tick(c);                                    // (the items already set tick first: Enter is for the one waiting)
    const C = list(); if (!C || st.i >= C.items.length) return false;
    const it = C.items[st.i];
    if (it[2]) return false;
    st.ticked.push(`${st.list}:${st.i}`); st.i++; emit({ type: 'tick', list: st.list, i: st.i - 1, confirmed: true });
    tick(c);
    return true;
  }
  // the instructor's hands on the current item (the cadet left it to him)
  function assist(c) {
    prep(c);
    const C = list(); if (!C || st.i >= C.items.length) return false;
    const it = C.items[st.i];
    if (!it[2]) { st.auto.list++; return confirm(c); }
    if (it[5]) it[5](c);
    st.auto.list++;
    return true;
  }
  const listDone = () => { const C = list(); return !C || st.i >= C.items.length; };
  // where the aircraft is (c.pos: { a, c } in the runway frame, c.v m/s, c.hdg true)
  function at(where, c) {
    const p = c.pos, v = c.v, h = c.hdg;
    if (where === 'hold') return Math.hypot(p.a - HOLD_STOP.a, p.c - HOLD_STOP.c) < 7 && v < 0.3;
    if (where === 'lineup') return p.a > 10 && p.a < 150 && Math.abs(p.c) < 4 && Math.abs(w180(h - R.trueHdg)) < 10 && v < 1.0;
    if (where === 'clear') return p.c > HOLD.c + 2 && v < 0.5;
    if (where === 'stand') return Math.hypot(p.a - stand.a, p.c - stand.c) < 4 && v < 0.2;
    return false;
  }
  // c: { sw, sys, s, park, av, rpm (the tachometer's), pos, v, hdg, onGround, qnh, act, setThr, setFlaps, prime, dt }
  function update(c) {
    const dt = c.dt || 0; st.t += dt;
    prep(c);
    // the time from the start to the shutdown (the lessons' own time is added when each ends: FLIGHT LAB's clock)
    if (c.sys && c.sys.running && !info(st.phase).lesson) { st.started = true; st.blockT += dt; if (c.onGround === false) st.airT += dt; }
    // across the hold-short line without a clearance (before the tower's line up and wait)
    if (['taxiOut', 'runup', 'tower'].includes(st.phase) && c.pos && c.pos.c < HOLD.c - 0.5 && c.pos.a < A1.a + 30 && !st.incursion) {
      st.incursion = true; st.trust -= 8; emit({ type: 'incursion' });
    }
    watchRunup(c, dt);
    // the run-up's fault: the drop on the left magneto held beyond the limit (or the two too far apart)
    const F = st.fault;
    if (F && !F.decided && !F.asked && st.phase === 'runup' && st.memo.dropL > RUNUP.maxDrop) {
      F.asked = true; F.drop = st.memo.dropL; emit({ type: 'fault', kind: F.kind, drop: F.drop, tries: F.tries });
    }
    for (const e of atc.update(dt)) emit({ ...e, type: 'radio', kind: e.type });
    const ph = info(st.phase);
    if (ph.list) tick(c);
    if (F && F.asked && !F.decided && st.phase === 'runup') return events.splice(0);      // (waiting for the decision)
    if (ph.radio) { if (!atc.busy) next(); }
    else if (ph.place) { if (at(ph.place, c) && (!ph.list || ph.soft || listDone())) next(); }
    else if (ph.list) { if (listDone()) next(); }
    return events.splice(0);
  }
  // the next phase (the lessons' and the transit's are started by the game: lessonStarted)
  function next() {
    const to = steps[st.step + 1];
    if (!to) return;
    if (st.phase === 'taxiIn') { const C = CHECKLISTS.after_landing; if (st.list === 'after_landing' && st.i < C.items.length) st.leftOn.push('after_landing'); }
    enter(to, st.step + 1);
  }
  // the game tells: boarded (the walk-around is over), a lesson started / ended, the transit flown or skipped, the
  // landing's stop, the debrief read
  function boarded() { if (st.phase === 'walk') { walk.settle(); enter('prestart'); } }
  function lessonEnded(id, status) {
    if (st.phase !== id) return;                                  // (a lesson the day did not start)
    if (status.t > 0) { st.blockT += status.t; st.airT += status.t; }
    // (an engine-failure lesson that ends in a field, gently, is a forced landing FLIGHT LAB passes: not a crash for the
    // day — the physics marks every touchdown off the runway as one)
    const forced = !!status.crashed && !!status.done && !!status.passed;
    const rec = { id, title: (lessonOf(FL, id) || {}).title || id, grade: status.grade, score: status.score, passed: status.passed, t: status.t, done: status.done,
      crashed: !!status.crashed && !forced, forced, reason: status.reason, end: endKind(FL, id), rows: (status.results || []).flatMap(r => r.rows.map(x => ({ step: r.step, ...x }))) };
    st.flown.push(rec); st.lessons[id] = rec;
    if (rec.crashed) { st.crash = status.reason || status.crashReason || 'crash'; enter('debrief'); return; }
    if (rec.end === 'stopped') st.exit = status.exit || 'A2';
    next();
  }
  // the move before a lesson is over (skipped, flown there, or the instructor's 'recover'): the lesson begins
  function lessonStarted(id) {
    if (info(st.phase).move && steps[st.step + 1] === id) next();
  }
  // what comes next in the day (the HUD, the game's moves)
  const nextLesson = () => steps.slice(st.step + 1).find(x => !STEPS[x]) || null;
  function transitFlown(how) { st.transit = how; }
  // the cadet's decision on the run-up's fault: 'burn' (tried once: the drop stays: asked again), 'return' or 'go' (the
  // instructor takes it back to the stand: the mechanic will look; no lesson today)
  function decideFault(arg) {
    const F = st.fault; if (!F || !F.asked || F.decided) return null;
    if (arg === 'burn' && F.tries < 1) { F.tries++; F.asked = false; st.memo.dropL = 0; st.memo.hold.L = 0; return 'again'; }
    F.decided = arg === 'go' ? 'go' : 'return';
    st.trust += F.decided === 'return' ? 3 : -5;
    st.exit = 'A1';
    enter('taxiIn', steps.indexOf('taxiIn'));
    return F.decided;
  }
  function debriefRead() { if (st.phase === 'debrief') enter('done'); }
  function abortTo(phase) { if (steps.includes(phase)) enter(phase, steps.lastIndexOf(phase)); }

  // ---- the results for the debrief and the logbook
  function summary() {
    const w = walk.summary(), r = atc.summary();
    const lessons = st.flown.map(l => ({ ...l }));
    const flown = lessons.filter(l => l.done);
    // the cadet's own work: what the trust moves by
    let trust = st.trust;
    trust += w.found * 2 - w.missed.length * 3 - w.tasksLeft.length * 2;
    trust += Math.round(r.first / 2) - r.wrong - r.late;
    for (const l of flown) trust += l.passed ? (l.grade === 'S' ? 2 : 1) : -1;
    if (st.auto.list > 6) trust -= 1;
    if (st.crash) trust -= 6;
    const landings = lessons.filter(l => l.done && !l.crashed && l.end === 'stopped').length;
    return { walk: w, radio: r, lessons, plan: { main: PLAN.main, solo: !!PLAN.solo, xc: !!PLAN.xc, check: !!PLAN.check, aircraft: PLAN.aircraft || 'pa28', lessons: PLAN.lessons.slice() }, solo: !!PLAN.solo, landings,
      incursion: st.incursion, crash: st.crash || '', fault: st.fault && st.fault.decided ? { ...st.fault } : null, transit: st.transit, blockT: st.blockT, airT: st.airT, autoItems: st.auto.list, leftOn: st.leftOn.slice(), trust: Math.max(-10, Math.min(12, trust)), level };
  }
  return {
    radio, atc, walk, st, steps, plan: PLAN, info, nextLesson, update, confirm, assist, items, boarded, lessonEnded, lessonStarted, transitFlown, debriefRead, abortTo, summary, next, decideFault,
    get phase() { return st.phase; }, get label() { return info(st.phase).label; }, get level() { return level; },
  };
}
