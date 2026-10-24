// CADET — test/helpers/play-day.mjs : plays a day from the walk-around to the debrief without a screen, as a careful
// cadet would (the options make them less careful): career/day.js with everything it drives — the walk-around, the
// checklists and the engine (aircraft/systems.js), the radio, the taxiing (flight/taxi.js) — and the day's lessons
// flown by FLIGHT LAB's bot through CADET's flight bridge (flight/flight.js runScripted). Each lesson is also flown
// by FLIGHT LAB's own runLesson with the same pilot (and hook), so the caller can compare the two.
// Between lessons the moves are skipped (the fade), as a cadet choosing "skip" would.
import { makeBot, runLesson } from './bot.mjs';
import { createFlight } from '../../src/flight/flight.js';
import { createSystems } from '../../src/aircraft/systems.js';
import { createDay } from '../../src/career/day.js';
import { routeOut, routeLineUp, routeIn, createTaxiPilot, exitFor } from '../../src/flight/taxi.js';
import { POINTS } from '../../src/content/walkaround-archer.js';
import { patternHook } from './pattern-hook.mjs';

const NOKEYS = { has: () => false };
export const STAND = { a: 636.5, c: 207.6 };

// hooks: { lessonId: (FL) => hook } — t2 gets the circuit's shape by default (FLIGHT LAB's bot cannot fly it alone)
export function playDay(FL, { plan = null, level = 'basic', anomalies = ['oil', 'r_sump'], skipWalk = [], wrongFirst = [], crossHold = false, seed = 3, hooks = { t2: patternHook } } = {}) {
  const P = FL.physics, R = P.LAB_RWY;
  const day = createDay(FL, { seed, level, anomalies, stand: STAND, plan });
  // ---- the walk-around: every place looked at; anomalies reported (and fixed by the cadet where they can be)
  for (const p of POINTS) {
    if (skipWalk.includes(p.id)) continue;
    const card = day.walk.inspect(p.id);
    if (card.choices.some(c => c.act === 'task')) day.walk.act(p.id, 'task');
    const bad = day.walk.planted.includes(p.id);
    day.walk.act(p.id, bad ? 'report' : 'ok');
    if (day.walk.inspect(p.id).choices.some(c => c.act === 'fix')) day.walk.act(p.id, 'fix');
  }
  // ---- in the seat: the aircraft as left on the stand
  const fl = createFlight(FL, { store: null }), sw = {}, sys = createSystems(sw);
  const [n, e] = P.rwyToNE(R, STAND.a, STAND.c);
  fl.startOnGround(n, e, (R.trueHdg + 270) % 360, 'pa28', { wind: { rel: 10, kt: 5, gust: 0.5 } });
  sys.setCold(fl.s);
  day.boarded();
  const phases = [], ref = [], got = [];
  const pos = () => { const p = P.ne(fl.s); const rc = P.rwyCoords(R, p.n, p.e); return { a: rc.along, c: rc.cross }; };
  const ctx = (dt) => ({ dt, sw, sys, s: fl.s, park: fl.controls.parkBrake, av: fl.av, rpm: sys.rpm, pos: pos(), v: Math.hypot(fl.s.vel[0], fl.s.vel[2]), hdg: P.attitude(fl.s).hdg,
    onGround: fl.s.onGround, act: (a, x) => fl.action(a, x), setThr: (x) => { fl.s.thr = x; }, setFlaps: (i) => { fl.s.flapIdx = i; }, prime: () => sys.prime() });
  let taxi = null, assistT = 0;
  const said = [];
  const answer = () => { const v = day.atc.view(); if (v && v.phase === 'choose') { const right = day.atc.rightIndex(); const k = wrongFirst.includes(v.id) && !v.last ? (right + 1) % 3 : right; day.atc.answer(k); } };
  const fly = (id) => {
    if (id === 't3' || id === 't4') day.atc.start('final');
    fl.startLesson(id, level, { sens: 'low', autoRud: !!FL.school.lesson(id).autoRud }); sys.setRunning(fl.s);
    const bot = makeBot(FL), hook = hooks[id] ? hooks[id](FL) : undefined, refHook = hooks[id] ? hooks[id](FL) : undefined;
    const L = fl.runScripted((L, dt) => { bot.fly(L, dt); sys.update(dt, L.s); for (const ev of day.atc.update(dt)) if (ev.type === 'say') said.push(ev.en); answer(); }, 900, hook);
    ref.push(runLesson(FL, id, level, 900, refHook)); got.push(L);
    const st = fl.status();
    day.lessonEnded(id, { ...st, results: L.results, exit: exitFor(pos().a) });
    fl.continueFree();
  };
  for (let f = 0; f < 60 * 60 * 30 && day.phase !== 'debrief' && day.phase !== 'done'; f++) {
    const dt = 1 / 60;
    const ph = day.phase;
    // the cadet's hands: the current checklist item set (a little at a time), the radio answered, the taxiing
    if ((assistT -= dt) <= 0 && day.st.list && !(ph === 'taxiIn' && !day.items())) { assistT = 0.25; day.assist(ctx(0)); }
    answer();
    if (ph === 'taxiOut' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeOut(STAND)); }
    if (ph === 'lineup' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeLineUp(), { speed: 2.2, turnSpeed: 1.8 }); }
    if (ph === 'taxiOff' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeIn(pos(), STAND).off); }
    if (ph === 'taxiIn' && !taxi) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, routeIn({ a: day.st.exit === 'A2' ? 590 : 1160, c: 0 }, STAND).in); }
    // a careless cadet rolls over the hold-short line before the tower is called
    if (crossHold && ph === 'tower' && !day.st.incursion) { fl.action('parkBrake', false); taxi = createTaxiPilot(FL, [{ ...pos() }, { a: 17.5, c: 30, stop: true }]); }
    fl.frame(dt, NOKEYS, { pilot: taxi ? taxi.fly : null });
    for (const ev of sys.update(dt, fl.s)) if (ev.type === 'nocatch') throw new Error('no start: ' + ev.why);
    for (const ev of day.update(ctx(dt))) {
      if (ev.type === 'radio' && ev.kind === 'say') said.push(ev.en);
      if (ev.type !== 'phase') continue;
      phases.push(ev.to); taxi = null;
      const info = day.info(ev.to);
      // a lesson that starts where the day is (lined up): flown at once; after a move: the move skipped, then flown
      if (info.lesson) fly(ev.to);
      else if (info.move) { day.transitFlown('skip'); day.lessonStarted(day.nextLesson()); }
      if (['runup', 'shutdown'].includes(ev.to)) fl.action('parkBrake', true);
    }
  }
  return { day, fl, sys, phases, ref, got, said };
}
