// JS reference driver for createDay equivalence: a scripted first day
// (walk-around done properly, checklists via assist + a hand-flown run-up,
// radio answered right — with one deliberate wrong read-back — lessons
// reported ended by the game, taxi places teleported like the game's moves).
import fs from 'node:fs';
import vm from 'node:vm';
const TEST = '/home/hatch/workspace/cadet-wt-all/flight-lab/test/';
const { load, CORE } = await import(TEST + 'load.mjs');
const FL = load(...CORE);
const DAY = await import('file:///home/hatch/workspace/cadet-wt-all/cadet/src/career/day.js');
const SYS = await import('file:///home/hatch/workspace/cadet-wt-all/cadet/src/aircraft/systems.js');
const P = FL.physics;

const out = [];
const emit = o => out.push(JSON.stringify(o));
const seed = 5;
const plan = DAY.planFor(FL, 'a2');
const day = DAY.createDay(FL, { seed, level: 'basic', plan, weather: { info: 'Bravo', zulu: '1405', tempC: 22, dewC: 11, qnh: 29.85 } });
const s = FL.school.startLesson('t1', 'intro').s;
const sw = {};
const sys = SYS.createSystems(sw);
sys.setCold(s);
let park = false;
const av = { baro: 29.92 };
const c = { sw, sys, s, av, rpm: 0, pos: { a: 636.5, c: 207.6 }, v: 0, hdg: 354, onGround: true, dt: 0.1,
  get park() { return park; },
  act: (name, arg) => { if (name === 'parkBrake') park = !!arg; return ''; },
  setThr: (x) => { s.thr = x; }, setFlaps: (i) => { FL.school ? null : null; s.flapIdx = i; s.flapDeg = [0, 10, 25, 40][i]; }, prime: () => sys.prime() };
const phases = [day.phase];
const events = [];
let wrongDone = false;
function tick(n = 1) {
  for (let i = 0; i < n; i++) {
    sys.update(0.1, s);
    c.rpm = sys.rpm;
    const evs = day.update(c);
    for (const e of evs) { events.push(e); if (e.type === 'phase') phases.push(e.to); }
    for (let k = 0; k < 6; k++) P.step(s, 1 / 60);
  }
}
// --- walk-around: everything looked at, tasks done, anomalies reported/fixed
for (const p of day.walk.points) {
  day.walk.inspect(p.id);
  const v1 = day.walk.inspect(p.id);
  for (const ch of v1.choices) if (ch.act === 'task') day.walk.act(p.id, 'task');
  const v2 = day.walk.inspect(p.id);
  const plantedBad = day.walk.planted.includes(p.id);
  if (plantedBad) { day.walk.act(p.id, 'report'); const v3 = day.walk.inspect(p.id); for (const ch of v3.choices) if (ch.act === 'fix') day.walk.act(p.id, 'fix'); }
  else day.walk.act(p.id, 'ok');
}
day.boarded(); phases.push(day.phase);
// --- the day loop
const lessonStatus = { t1: { done: true, passed: true, grade: 'A', score: 0.9, t: 300, crashed: false, results: [{ step: '離陸滑走', rows: [{ name: '速度', val: 'Vr 55', std: '±5', pass: true, score: 1 }] }] },
  a2: { done: true, passed: true, grade: 'S', score: 1, t: 600, crashed: false, results: [] },
  t3: { done: true, passed: true, grade: 'A', score: 0.88, t: 240, crashed: false, exit: 'A2', results: [] } };
let guard = 0;
while (day.phase !== 'done' && guard++ < 4000) {
  const ph = day.phase, info = day.info(ph);
  if (info.lesson) { day.lessonEnded(ph, lessonStatus[ph]); tick(1); continue; }
  if (info.move) { day.lessonStarted(day.nextLesson()); tick(1); continue; }
  if (info.radio) {
    // drive the radio: answer when choosing; one deliberate wrong answer in gnd_rb
    let g2 = 0;
    while (day.phase === ph && g2++ < 300) {
      tick(1);
      const v = day.atc.view();
      if (v && v.phase === 'choose') {
        if (!wrongDone && v.id === 'gnd_rb') { const wrong = v.choices.findIndex(x => x.k !== day.atc.rightIndex()); day.atc.answer(wrong >= 0 ? wrong : 0); wrongDone = true; }
        else day.atc.answer(day.atc.rightIndex());
      }
    }
    continue;
  }
  if (ph === 'runup') {
    // hand-fly the run-up readings first (gauge rpm scripted through the systems' own drops)
    sw.mag = 'BOTH'; s.thr = 0.67; tick(15);                    // settle at ~2000, both read
    sw.mag = 'L'; tick(8); sw.mag = 'R'; tick(8); sw.mag = 'BOTH'; tick(4);
    sw.carbHeat = true; tick(8); sw.carbHeat = false; tick(4);
    s.thr = 0.0; tick(8); s.thr = 0.045; tick(8);               // idle check, back to 1000
  }
  if (info.list) {
    if (info.place === 'stand') { c.pos = { a: 636.5, c: 207.6 }; c.v = 0; }
    let g2 = 0;
    while (day.phase === ph && g2++ < 40) {
      const items = day.items();
      if (!items || items.i >= items.items.length) break;
      const cur = items.items[items.i];
      if (cur.confirm) day.confirm(c); else day.assist(c);
      tick(30);
    }
    tick(2);
    continue;
  }
  if (info.place) {
    if (info.place === 'hold') { c.pos = { a: 17.5, c: 44.5 }; c.v = 0; }
    if (info.place === 'lineup') { c.pos = { a: 30, c: 0 }; c.v = 0; c.hdg = 354; }
    if (info.place === 'clear') { c.pos = { a: 620, c: 120 }; c.v = 0; }
    if (info.place === 'stand') { c.pos = { a: 636.5, c: 207.6 }; c.v = 0; }
    tick(2);
    continue;
  }
  if (ph === 'debrief') { day.debriefRead(); tick(1); continue; }
  tick(1);
}
emit({ tag: 'phases', phases });
emit({ tag: 'events', events: events.map(e => [e.type, e.kind || '', e.list || '', e.i ?? '', e.from || '', e.to || '']) });
emit({ tag: 'memo', memo: { both: +day.st.memo.both.toFixed(1), dropL: day.st.memo.dropL, dropR: day.st.memo.dropR, carb: day.st.memo.carb, idle: day.st.memo.idle } });
emit({ tag: 'summary', sum: day.summary() });
emit({ tag: 'walk', planted: day.walk.planted, summary: day.walk.summary() });
fs.writeFileSync(new URL('./digest-day2-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('day2 js lines:', out.length, 'final phase:', day.phase, 'guard:', guard);
