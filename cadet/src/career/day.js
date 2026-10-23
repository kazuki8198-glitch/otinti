// CADET — career/day.js : the first day (M4), from the walk-around to the logbook, as one thin line through the game:
//   walk-around → before start → start → after start → ATIS → Ground (taxi) → taxi out → run-up → Tower (line up) →
//   lined up → t1 (FLIGHT LAB) → Tower (frequency change) → to the practice area (skipped, or flown) → a2 (FLIGHT LAB) →
//   Tower (back) → back to LAB (skipped, or flown) → t3 (FLIGHT LAB; the landing clearance on final) → Tower (off the runway) → taxi off → Ground → taxi in
//   → shutdown → debrief → logbook.
// The lessons are FLIGHT LAB's own, started fresh where FLIGHT LAB starts them (t1 lined up on 36 at 30 m, a2 in the
// practice area, t3 on a 5 km final), so their grades are FLIGHT LAB's for the same inputs. Everything between them
// is CADET's: its checklists (content/checklists-archer.js) tick themselves as the switches are set (an item to look at
// is confirmed with Enter), the radio (dialog/atc.js), the taxiing, the run-up's readings.
// update(c) every frame with what the aircraft is doing; the phase changes come back as events. The game (fly-mode)
// acts on them: starting a lesson, the radio panel, the instructor's words.
// Pure logic: no three.js, no DOM.
import { createWalkaround } from '../aircraft/walkaround.js';
import { CHECKLISTS } from '../content/checklists-archer.js';
import { dayRadio } from '../content/dialog/atc.js';
import { createAtc } from '../dialog/atc.js';
import { HOLD, HOLD_STOP, A1 } from '../flight/taxi.js';

export const DAY1 = { id: 'day1', n: 1, title: '最初の 1 日', lessons: ['t1', 'a2', 't3'], aircraft: 'N738SY', type: 'PA-28-181' };
// phase → what it is: a checklist, a radio sequence, a place to get to, a lesson
export const PHASES = {
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
  t1: { label: '課目 t1：通常離陸と上昇', lesson: 't1' },
  leave: { label: '管制塔：周波数の変更', radio: 'leave' },
  transit: { label: '訓練空域へ' },
  a2: { label: '課目 a2：直線水平飛行', lesson: 'a2' },
  back: { label: '管制塔を呼ぶ（帰投）', radio: 'back' },
  return: { label: 'LAB へ戻る' },
  t3: { label: '課目 t3：通常着陸', lesson: 't3' },
  exit: { label: '管制塔：滑走路を出る', radio: 'exit' },
  taxiOff: { label: '滑走路を出て止まる', place: 'clear' },
  groundIn: { label: '地上管制を呼ぶ', radio: 'groundIn' },
  taxiIn: { label: 'タキシー：駐機場へ', place: 'stand', list: 'after_landing', soft: true },
  shutdown: { label: 'エンジン停止', list: 'shutdown' },
  debrief: { label: '講評' },
  done: { label: '1 日の終わり' },
};
export const ORDER = Object.keys(PHASES);
const w180 = (a) => ((a % 360) + 540) % 360 - 180;

// createDay(FL, opts): opts { seed, level ('intro' | 'basic' | 'precision'), anomalies (tests), stand { a, c } }
export function createDay(FL, { seed = 1, level = 'basic', anomalies, stand = { a: 636.5, c: 207.6 } } = {}) {
  const P = FL.physics, SC = FL.school, R = P.LAB_RWY;
  // the weather the lessons fly in (FLIGHT LAB's: their wind and altimeter), for the ATIS
  const L1 = SC.startLesson('t1', 'intro'), wm = /^(\d+) at (\d+)$/.exec(L1.windStr || '');
  const radio = dayRadio({ windMag: wm ? +wm[1] : 10, windKt: wm ? +wm[2] : 5, qnh: L1.s.qnh });
  const atc = createAtc(radio, { seed });
  const walk = createWalkaround({ seed, anomalies });
  const st = {
    phase: 'walk', list: null, i: 0, ticked: [], skipped: [], memo: { both: 0, dropL: 0, dropR: 0, carb: 0, idle: false, hold: { L: 0, R: 0, C: 0 } },
    lessons: {}, incursion: false, overHold: false, exit: '', stopAt: null, transit: 'skip', t: 0, airT: 0, blockT: 0, started: false, shutdown: false,
    trust: 0, notes: [], auto: { list: 0, taxi: 0 }, leftOn: [],
  };
  // what happened since the last update() (a phase entered from outside it — a lesson ended, the cadet boarded —
  // is told at the next one)
  const events = [];
  const emit = (e) => events.push(e);
  function enter(phase) {
    const from = st.phase; st.phase = phase;
    const ph = PHASES[phase];
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
    prep(c);
    const C = list(); if (!C || st.i >= C.items.length) return false;
    const it = C.items[st.i];
    if (it[2]) { tick(c); return false; }
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
    if (c.sys && c.sys.running && !PHASES[st.phase].lesson) { st.started = true; st.blockT += dt; if (c.onGround === false) st.airT += dt; }
    // across the hold-short line without a clearance (before the tower's line up and wait)
    if (['taxiOut', 'runup', 'tower'].includes(st.phase) && c.pos && c.pos.c < HOLD.c - 0.5 && c.pos.a < A1.a + 30 && !st.incursion) {
      st.incursion = true; st.trust -= 8; emit({ type: 'incursion' });
    }
    watchRunup(c, dt);
    for (const e of atc.update(dt)) emit({ ...e, type: 'radio', kind: e.type });
    const ph = PHASES[st.phase];
    if (ph.list) tick(c);
    if (ph.radio) { if (!atc.busy) next(); }
    else if (ph.place) { if (at(ph.place, c) && (!ph.list || ph.soft || listDone())) next(); }
    else if (ph.list) { if (listDone()) next(); }
    return events.splice(0);
  }
  // the next phase (the lessons' and the transit's are started by the game: lessonStarted)
  function next() {
    const k = ORDER.indexOf(st.phase), to = ORDER[k + 1];
    if (!to) return;
    if (st.phase === 'taxiIn') { const C = CHECKLISTS.after_landing; if (st.list === 'after_landing' && st.i < C.items.length) st.leftOn.push('after_landing'); }
    enter(to);
  }
  // the game tells: boarded (the walk-around is over), a lesson started / ended, the transit flown or skipped, the
  // landing's stop, the debrief read
  function boarded() { if (st.phase === 'walk') { walk.settle(); enter('prestart'); } }
  function lessonEnded(id, status) {
    if (status.t > 0 && !st.lessons[id]) { st.blockT += status.t; st.airT += status.t; }
    st.lessons[id] = { grade: status.grade, score: status.score, passed: status.passed, t: status.t, done: status.done, crashed: status.crashed, reason: status.reason,
      rows: (status.results || []).flatMap(r => r.rows.map(x => ({ step: r.step, ...x }))) };
    if (status.crashed) { enter('debrief'); return; }
    if (id === 't1' && st.phase === 't1') next();
    else if (id === 'a2' && st.phase === 'a2') next();
    else if (id === 't3' && st.phase === 't3') { st.exit = status.exit || 'A2'; next(); }
  }
  function lessonStarted(id) {
    if (id === 'a2' && st.phase === 'transit') enter('a2');
    if (id === 't3' && st.phase === 'return') enter('t3');
  }
  function transitFlown(how) { st.transit = how; }
  function debriefRead() { if (st.phase === 'debrief') enter('done'); }
  function abortTo(phase) { if (PHASES[phase]) enter(phase); }

  // ---- the results for the debrief and the logbook
  function summary() {
    const w = walk.summary(), r = atc.summary();
    const lessons = DAY1.lessons.map(id => ({ id, title: SC.lesson(id).title, ...(st.lessons[id] || { grade: '', passed: false }) }));
    const flown = lessons.filter(l => l.done);
    // the cadet's own work: what the trust moves by
    let trust = st.trust;
    trust += w.found * 2 - w.missed.length * 3 - w.tasksLeft.length * 2;
    trust += Math.round(r.first / 2) - r.wrong - r.late;
    for (const l of flown) trust += l.passed ? (l.grade === 'S' ? 2 : 1) : -1;
    if (st.auto.list > 6) trust -= 1;
    if (st.crash) trust -= 6;
    return { walk: w, radio: r, lessons, incursion: st.incursion, crash: st.crash || '', transit: st.transit, blockT: st.blockT, airT: st.airT, autoItems: st.auto.list, leftOn: st.leftOn.slice(), trust: Math.max(-10, Math.min(12, trust)), level };
  }
  return {
    radio, atc, walk, st, update, confirm, assist, items, boarded, lessonEnded, lessonStarted, transitFlown, debriefRead, abortTo, summary, next,
    get phase() { return st.phase; }, get label() { return PHASES[st.phase].label; }, get level() { return level; },
  };
}
