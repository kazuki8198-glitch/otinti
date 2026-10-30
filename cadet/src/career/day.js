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
import { dayRadio, setCall, ctafRadio } from '../content/dialog/atc.js';
import { createAtc } from '../dialog/atc.js';
import { HOLD, HOLD_STOP, A1 } from '../flight/taxi.js';
import { compactAnalysis } from '../flight/analysis.js';
import { RUNUP } from '../aircraft/systems.js';

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
  ctaf: { label: 'CTAF 自家通報（LABEF・122.9）', radio: 'ctaf' },
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
const END_OF = { t1: 'air', t4: 'air', x3: 'air', t2: 'stopped', t3: 'stopped', e1: 'stopped', x1: 'stopped', x2: 'stopped', e2: 'failed', e3: 'failed', e4: 'failed', c1: 'failed',
  m1: 'air', m4: 'air', e6: 'air', m5: 'stopped', r1: 'stopped', cx2: 'stopped' };   // (e4/e6 from item 2; cx2 from item 6: cx1/cx3 end in the air and cf1 in the area by the fallback)
// the lessons that give their own take-off clearance (FLIGHT LAB's ATC step); before the others the tower gives it
const OWN_TAKEOFF = new Set(['t1', 'c1', 'cx1']);   // (cx1 carries its own clearance readback, like t1)
// the twin's lessons (M6): the Seminole takes off in m1 (or m4, whose engine fails after it) and lands in m5
const lessonOf = (FL, id) => FL.syllabus.STAGES.flatMap(s => s.lessons).find(l => l.id === id);
export const startKind = (FL, id) => START_OF[(lessonOf(FL, id) || {}).setup?.at] || 'area';
export const endKind = (FL, id) => END_OF[id] || (startKind(FL, id) === 'area' ? 'area' : 'air');

// the day's lessons for a lesson to practise: the take-off (t1) and the landing (t3) around it where it needs them;
// the first solo: the take-off, then three circuits to a full stop (t2)
// (M6) a check's own lessons in its order (career.js CHECKS); the solo cross-country flies n2 alone (xc)
export function planFor(FL, id, { solo = false, check = null, xcVariant = null } = {}) {
  // (next-wave item 3) the LABEF cross-country variant: the solo XC's lessons, flown with the divert
  // to LABEF in the middle — n2's diversion becomes a real landing at the grass strip, announced on
  // its CTAF (122.9, RWY 09), and t3's landing is the return leg's, back at LAB
  if (xcVariant === 'labef') return { main: 'n2', solo: true, xc: true, xcVariant: 'labef', ctaf: true, divertTo: 'LABEF', lessons: ['t1', 'n2', 't3'], aircraft: 'pa28' };
  if (check) return { main: check.lessons.find(x => !/^t[13]$/.test(x)) || check.lessons[0], solo: check.kind === 'xc', xc: check.kind === 'xc', check: check.kind === 'checkride', lessons: check.lessons.slice(), aircraft: aircraftOf(FL, check.lessons) };
  if (solo) return { main: 't2', solo: true, lessons: ['t1', 't2', 't2', 't2'], aircraft: 'pa28' };
  const k = startKind(FL, id), e = endKind(FL, id);
  let lessons;
  if (aircraftOf(FL, [id]) === 'pa28r') {
    // (next-wave item 6) the complex endorsement's day: up with cx1, down with the GUMPS landing cx2 —
    // the go-around lesson and the CFI ride sit between them (both end in the air / the area)
    const lessons = id === 'cx1' || id === 'cx2' ? ['cx1', 'cx2'] : ['cx1', id, 'cx2'];
    return { main: id, solo: false, lessons, aircraft: 'pa28r' };
  }
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
export const aircraftOf = (FL, lessons) => lessons.map(id => (lessonOf(FL, id) || {}).aircraft).find(a => a && a !== 'pa28') || 'pa28';   // (the day's non-Archer type, if any: pa44, or the endorsement's pa28r)
// the steps of a day with these lessons (opts.ctaf: the LABEF variant — the CTAF self-announce
// sequence is played on the way back from the area lesson, before the tower is called again)
export function stepsFor(FL, lessons, { ctaf = false } = {}) {
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
      else if (pe === 'area') out.push(...(ctaf && !out.includes('ctaf') ? ['ctaf'] : []), 'back', 'return');
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
export function createDay(FL, { seed = 1, level = 'basic', anomalies, stand = { a: 636.5, c: 207.6 }, plan = null, weather = {}, fault = null, elecFault = false } = {}) {
  const P = FL.physics, SC = FL.school, R = P.LAB_RWY;
  const PLAN = plan || { main: 'a2', solo: false, lessons: DAY1.lessons };
  // the level the day is actually flown at: chosen in the seat when the day begins (the game says it with
  // setLevel) — the summary reports it, and the growth of the day's lessons is read off it
  let flownLevel = ['intro', 'basic', 'precision'].includes(level) ? level : 'basic';
  setCall(PLAN.aircraft || 'pa28');                          // (today's aircraft is the radio's call sign)
  const steps = stepsFor(FL, PLAN.lessons, { ctaf: !!PLAN.ctaf });
  const intent = PLAN.lessons.some(id => startKind(FL, id) === 'area') ? 'area' : 'pattern';
  // the weather the lessons fly in (FLIGHT LAB's: their wind and altimeter), for the ATIS
  const L1 = SC.startLesson(PLAN.lessons[0], 'intro'), wm = /^(\d+) at (\d+)$/.exec(L1.windStr || '');
  // the day's own QNH (the career weather's — it varies now): the ATIS reads it, and fly-mode sets the
  // flight's air to it, so the altimeter setting the cadet makes is the day's, not a constant
  const dayQnh = weather.qnh != null ? weather.qnh : L1.s.qnh;
  const radio = dayRadio({ ...weather, windMag: wm ? +wm[1] : 10, windKt: wm ? +wm[2] : 5, qnh: dayQnh, intent, solo: PLAN.solo && !PLAN.xc, xc: !!PLAN.xc });
  // (the LABEF variant's day carries the CTAF set in the same radio, so the day's own runner plays
  // the 'ctaf' step like any other sequence)
  if (PLAN.ctaf) { const c = ctafRadio(); Object.assign(radio.exchanges, c.exchanges); radio.sequences.ctaf = c.sequences.ctaf; }
  const atc = createAtc(radio, { seed });
  const AIRCRAFT = PLAN.aircraft || 'pa28', CHECKLISTS = AIRCRAFT === 'pa44' ? CHECKLISTS_SEMINOLE : CHECKLISTS_ARCHER;
  const walk = createWalkaround({ seed, anomalies, aircraft: AIRCRAFT });
  const st = {
    phase: 'walk', step: 0, list: null, i: 0, flown: [], ticked: [], skipped: [], memo: { both: 0, dropL: 0, dropR: 0, carb: 0, idle: false, hold: { L: 0, R: 0, C: 0 } },
    lessons: {}, incursion: false, overHold: false, exit: '', stopAt: null, transit: 'skip', t: 0, airT: 0, blockT: 0, started: false, shutdown: false,
    trust: 0, notes: [], auto: { list: 0, taxi: 0 }, leftOn: [],
    fault: fault === 'mag' ? { kind: 'mag', asked: false, tries: 0, decided: null, drop: 0 } : fault === 'carb' ? { kind: 'carb' } : fault === 'pitot' ? { kind: 'pitot' } : fault === 'gear' ? { kind: 'gear' } : fault === 'pump' ? { kind: 'pump' } : fault === 'static' ? { kind: 'static' } : null,   // 'carb': a humid day — carburettor ice in flight, found on the instruments, not in the run-up; 'pitot': a day in visible moisture (the tube blocks with the heat off); 'gear': the Seminole's transit stalls (the emergency handle is the way down); 'pump': an engine-driven fuel pump on its way out; 'static': the static port blocked (the altimeter/VSI freeze; the alternate source is the way back) — seeded by aircraft/failures.js on eligible days only
    // (next-wave item 4) what the walk-around left behind, captured at boarded() BEFORE the instructor's
    // look-round (walk.settle) puts the ground items right for the debrief's record: the flight hooks
    // (aircraft/failures.js PREFLIGHT_HOOKS) fly-mode seeds from this — a left pitot cover / blocked
    // tube to the PS1 pitot path, a taped static port to the static block, low oil to the oil quantity
    preflightEffects: [],
    // an alternator-failure day: nothing to find on the ground — the bus sags in flight (systems.setElecFault);
    // the day only carries the flag, fly-mode watches the voltage and the logbook notes it
    elecFault: !!elecFault,
    // (gap audit v2, B4.1) the clearance state UNDER the radio scripts: the scripted sequences SET these
    // flags as they complete; the world checks them when the cadet actually moves. Forgiving by design:
    // a tower call-out, a forced go-around instruction and a debrief remark — never a failed day.
    atcState: { atisCopied: '', atisCurrent: radio.weather.info, taxi: false, lineup: false, takeoff: false, landing: false, freqChange: false, closed: false,
      noClearTakeoff: 0, noClearLanding: 0, staleAtis: false, nearMiss: [], trafficGA: 0 },
    _og: true, _lWarn: false, _atisAdvanced: false,
  };
  // what happened since the last update() (a phase entered from outside it — a lesson ended, the cadet boarded —
  // is told at the next one)
  const events = [];
  const emit = (e) => events.push(e);
  // a step by its id: a lesson's own (its title from FLIGHT LAB's syllabus), or one of STEPS
  const info = (id) => STEPS[id] || { label: `課目 ${id}：${(lessonOf(FL, id) || {}).title || id}`, lesson: id };
  // enter the step at index k (or the next step with this id: a step entered from outside, a crash's debrief)
  const INFO_WORDS = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];
  // (B4.4) the ATIS is a broadcast, not a step: its letter advances once in the day (the weather slot's
  // second half — by the time the cadet comes back, a new information is out). A copy made before that is
  // stale, and the tower says so on the return call.
  function advanceAtis() {
    const A = st.atcState; if (st._atisAdvanced) return; st._atisAdvanced = true;
    const i = INFO_WORDS.indexOf(A.atisCurrent); if (i < 0) return;
    A.atisCurrent = INFO_WORDS[(i + 1) % INFO_WORDS.length];
    if (A.atisCopied && A.atisCopied !== A.atisCurrent && !A.staleAtis) {
      A.staleAtis = true;
      emit({ type: 'atc', kind: 'staleAtis', en: `${radio.call.short}, LAB Tower, information ${A.atisCurrent} is now current. Verify you have ${A.atisCurrent}.` });
    }
  }
  // listen to the broadcast again (any time): the lines heard, with the CURRENT letter; copying afresh
  // clears the staleness. The game wires this to tuning the ATIS frequency.
  function listenAtis() {
    const A = st.atcState; A.atisCopied = A.atisCurrent;
    const en = radio.atisText.replace(`information ${radio.weather.info}`, `information ${A.atisCurrent}`).replace(`have information ${radio.weather.info}`, `have information ${A.atisCurrent}`);
    return { en, letter: A.atisCurrent };
  }
  function enter(phase, k) {
    if (k == null) { k = steps.indexOf(phase, st.step + 1); if (k < 0) k = steps.indexOf(phase); }
    const from = st.phase; st.phase = phase; st.step = k;
    const ph = info(phase);
    st.list = ph.list || null; st.i = 0;
    if (phase === 'back') advanceAtis();
    if (ph.radio) atc.start(ph.radio, phase === 'exit' || phase === 'groundIn' ? st.exit : undefined);
    emit({ type: 'phase', from, to: phase });
  }
  const list = () => (st.list ? CHECKLISTS[st.list] : null);
  // the current checklist item, as the HUD shows it
  function items() {
    const C = list(); if (!C) return null;
    return { id: st.list, title: C.title, i: st.i, items: C.items.map((it, k) => ({ name: it[0], what: it[1], confirm: !it[2], ctl: it[3], note: it[4], ok: k < st.i, cur: k === st.i })) };
  }
  // the run-up's readings: the rpm on both magnetos, then the drop on each (held half a second), carb heat, the idle
  function watchRunup(c, dt) {
    const m = st.memo, rpm = c.rpm;
    if (st.phase !== 'runup' || !dt) return;
    // read only when the rpm has settled (the engine takes a few seconds to wind up to a new throttle setting)
    const steady = m.prev != null && Math.abs(rpm - m.prev) / dt < 25 && m.prevMag === c.sw.mag && m.prevCarb === c.sw.carbHeat;
    m.prev = rpm; m.prevMag = c.sw.mag; m.prevCarb = c.sw.carbHeat;
    m.steadyT = steady ? (m.steadyT || 0) + dt : 0;
    if (c.sw.mag === 'BOTH' && !c.sw.carbHeat && rpm > 1850 && m.steadyT > 0.3) m.both = rpm;
    for (const [k, on] of [['L', c.sw.mag === 'L'], ['R', c.sw.mag === 'R'], ['C', c.sw.carbHeat && c.sw.mag === 'BOTH']]) {
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
    for (const e of atc.update(dt)) {
      if (e.type === 'done') {                       // (B4.1) a completed script SETS the clearance state
        const A = st.atcState;
        if (e.seq === 'atis') A.atisCopied = A.atisCurrent;
        else if (e.seq === 'ground') A.taxi = true;
        else if (e.seq === 'tower') A.lineup = true;
        else if (e.seq === 'takeoff' || e.seq === 'stopgo') A.takeoff = true;
        else if (e.seq === 'final') A.landing = true;
        else if (e.seq === 'leave') A.freqChange = true;
        else if (e.seq === 'closed') A.closed = true;
      }
      emit({ ...e, type: 'radio', kind: e.type });
    }
    // (B4.1) acting without the state, outside the lessons (a lesson's own clearances are FLIGHT LAB's):
    // a departure with no takeoff clearance, or an approach with no landing clearance. The tower calls
    // out; the debrief remembers. Training-forgiving: no day failure.
    if (c.onGround != null && info(st.phase).lesson) st._og = c.onGround;   // (keep the edge detector honest across lessons)
    if (c.onGround != null && !info(st.phase).lesson) {
      const A = st.atcState;
      if (st._og && c.onGround === false) {
        if (!A.takeoff) { A.noClearTakeoff++; st.trust -= 4; emit({ type: 'atc', kind: 'noClearTakeoff', en: `${radio.call.short}, LAB Tower, you departed without a takeoff clearance.` }); }
        A.takeoff = false; st._lWarn = false;
      }
      if (!st._og && c.onGround === true) A.landing = false;
      if (c.onGround === false && c.pos && c.pos.a < -250 && c.pos.a > -3200 && Math.abs(c.pos.c) < 80 && !A.landing && !st._lWarn
        && ['return', 'pattern', 'recycle', 'transit'].includes(st.phase)) {
        st._lWarn = true; A.noClearLanding++; st.trust -= 3;
        emit({ type: 'atc', kind: 'noClearLanding', en: `${radio.call.short}, LAB Tower, go around, you have no landing clearance.` });
      }
      st._og = c.onGround;
    }
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
  function boarded() { if (st.phase === 'walk') { st.preflightEffects = walk.consequences(); walk.settle(); enter('prestart'); } }
  function lessonEnded(id, status) {
    if (st.phase !== id) return;                                  // (a lesson the day did not start)
    if (status.t > 0) { st.blockT += status.t; st.airT += status.t; }
    // (an engine-failure lesson that ends in a field, gently, is a forced landing FLIGHT LAB passes: not a crash for the
    // day — the physics marks every touchdown off the runway as one)
    const forced = !!status.crashed && !!status.done && !!status.passed;
    const rec = { id, title: (lessonOf(FL, id) || {}).title || id, grade: status.grade, score: status.score, passed: status.passed, t: status.t, done: status.done,
      // (next wave item 1) the standards analysis of this lesson's recording, compacted for the logbook:
      // display/history data only — the grade, the pass and the growth above never read it
      ana: status.analysis ? compactAnalysis(status.analysis) : null,
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
  // (B4.2) the traffic's events the game saw (fly-mode routes them here): a near miss is a see-and-avoid
  // entry for the debrief; a trainer's go-around caused by the cadet is counted, not blamed by name
  function noteTraffic(kind, w) {
    const A = st.atcState;
    if (kind === 'nearMiss') { if (!A.nearMiss.includes(w)) A.nearMiss.push(w); }
    else if (kind === 'trafficGoAround') A.trafficGA++;
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
    return { walk: w, radio: r, lessons, plan: { main: PLAN.main, solo: !!PLAN.solo, xc: !!PLAN.xc, check: !!PLAN.check, aircraft: PLAN.aircraft || 'pa28', lessons: PLAN.lessons.slice(), ...(PLAN.ctaf ? { ctaf: true, divertTo: PLAN.divertTo || 'LABEF', xcVariant: PLAN.xcVariant || null } : {}) }, solo: !!PLAN.solo, landings,
      atcState: { copied: st.atcState.atisCopied, current: st.atcState.atisCurrent, noClearTakeoff: st.atcState.noClearTakeoff, noClearLanding: st.atcState.noClearLanding, staleAtis: st.atcState.staleAtis, nearMiss: st.atcState.nearMiss.slice(), trafficGA: st.atcState.trafficGA },
      incursion: st.incursion, crash: st.crash || '', fault: st.fault && st.fault.decided ? { ...st.fault } : null, dayFault: st.fault ? st.fault.kind : null, preflightEffects: st.preflightEffects.slice(), transit: st.transit, blockT: st.blockT, airT: st.airT, autoItems: st.auto.list, leftOn: st.leftOn.slice(), trust: Math.max(-10, Math.min(12, trust)), level: flownLevel };
  }
  return {
    radio, atc, walk, st, steps, plan: PLAN, info, nextLesson, update, confirm, assist, items, boarded, lessonEnded, lessonStarted, transitFlown, debriefRead, abortTo, summary, next, decideFault, qnh: dayQnh, listenAtis, noteTraffic,
    setLevel(lv) { if (['intro', 'basic', 'precision'].includes(lv)) flownLevel = lv; },
    get phase() { return st.phase; }, get label() { return info(st.phase).label; }, get level() { return flownLevel; },
  };
}
