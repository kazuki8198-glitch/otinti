// Stage 10 golden: line.js duty scenarios (drivers mirror test/line.test.mjs).
import fs from 'node:fs';
const T = '/home/hatch/workspace/cadet-wt-free/cadet/src';
const { createLineDuty, lineBrief } = await import(T + '/flight/line.js');

const canonEvent = (e) => {
  if (e.type === 'event') { const v = e.event; return { type: 'event', event: { id: v.id, kind: v.kind, title: v.title, situation: v.situation, choices: v.choices, correctIndex: v.correctIndex, scores: v.scores, data: v.data, targetAltFt: v.targetAltFt ?? null, reason: v.reason } }; }
  if (e.type === 'task') { const t = e.task; return { type: 'task', task: { id: t.id, templateId: t.templateId, title: t.title, prompt: t.prompt, choices: t.choices, correctIndex: t.correctIndex } }; }
  return e;
};
const wrongIndex = (c) => (c.correctIndex + 1) % c.choices.length;
function findSeed(pred, route = 'HND-KMQ', role = 'PF') {
  for (let seed = 1; seed <= 600; seed++) { const d = createLineDuty({ route, role, seed }); if (pred(d)) return seed; }
  throw new Error('no seed');
}
function flyPF(stream, { seed, captain = null, route = 'HND-KMQ', dispatchAnswer = 'correct', eventAnswer = 'correct', touchdownPos = 'direct', compressFirst = false }) {
  const duty = createLineDuty({ route, role: 'PF', captain, seed });
  let t = 0;
  const U = (obs) => { const evs = duty.update({ t: (t += 10), ...obs }); stream.push({ call: 'update', events: evs.map(canonEvent) }); };
  stream.push({ call: 'advance', r: duty.advance() });
  stream.push({ call: 'dispatchCase', id: duty.dispatchCase.id });
  const r = duty.answerDispatch(dispatchAnswer === 'correct' ? duty.dispatchCase.correctIndex : wrongIndex(duty.dispatchCase));
  stream.push({ call: 'answerDispatch', r });
  if (r && r.noGo) { stream.push({ call: 'summary', summary: duty.summary() }); return duty; }
  U({ onGround: true, stopped: true, altFt: 36, distDestM: 290000 });
  U({ onGround: false, altFt: 600, ias: 165, vsFpm: 2200, distDestM: 280000 });
  U({ onGround: false, altFt: 12000, ias: 250, vsFpm: 1800, distDestM: 240000 });
  U({ onGround: false, altFt: 24000, ias: 280, mach: 0.74, vsFpm: 0, distDestM: 200000 });
  if (compressFirst) stream.push({ call: 'compressEarly', r: duty.compress() });
  if (duty.event && !duty.st.eventAnswer) stream.push({ call: 'answerEvent', r: duty.answerEvent(eventAnswer === 'correct' ? duty.event.correctIndex : wrongIndex(duty.event)) });
  U({ onGround: false, altFt: 24000, ias: 280, mach: 0.74, vsFpm: 0, distDestM: 190000 });
  stream.push({ call: 'compress', r: duty.compress() });
  if (duty.event && !duty.st.eventAnswer) stream.push({ call: 'answerEvent', r: duty.answerEvent(eventAnswer === 'correct' ? duty.event.correctIndex : wrongIndex(duty.event)) });
  U({ onGround: false, altFt: 9000, ias: 250, vsFpm: -1800, distDestM: 90000 });
  U({ onGround: false, altFt: 2000, ias: 150, vsFpm: -750, distDestM: 8000 });
  U({ onGround: false, altFt: 400, ias: 138, vsFpm: -650, distDestM: 1500 });
  let tdObs = { onGround: true, stopped: false };
  if (touchdownPos === 'frame') {
    const f = duty.destination, h = f.trueHdg * Math.PI / 180, ac = 350 - f.len / 2, C = 4;
    tdObs = { ...tdObs, n: f.n + ac * Math.cos(h) - C * Math.sin(h), e: f.e + ac * Math.sin(h) + C * Math.cos(h) };
  } else tdObs = { ...tdObs, tdAlongM: 350, tdCrossM: 3 };
  U(tdObs);
  U({ onGround: true, stopped: true });
  stream.push({ call: 'summary', summary: duty.summary() });
  return duty;
}
function ridePM(stream, { seed, captain = null }) {
  const duty = createLineDuty({ route: 'HND-KMQ', role: 'PM', captain, seed });
  let t = 0;
  stream.push({ call: 'advance', r: duty.advance() });
  stream.push({ call: 'dispatchCase', id: duty.dispatchCase.id });
  const r = duty.answerDispatch(duty.dispatchCase.correctIndex);
  stream.push({ call: 'answerDispatch', r });
  if (r && r.noGo) { stream.push({ call: 'summary', summary: duty.summary() }); return duty; }
  const pattern = ['correct', 'wrong', 'correct', 'correct', 'wrong'];
  let guard = 0;
  while (guard++ < 40) {
    const evs = duty.update({ t: (t += 20), altFt: 24000, ias: 270, mach: 0.74, headingDeg: 90, vsFpm: 0, distDestM: 150000 });
    stream.push({ call: 'update', events: evs.map(canonEvent) });
    if (duty.event && !duty.st.eventAnswer) stream.push({ call: 'answerEvent', r: duty.answerEvent(duty.event.correctIndex) });
    const task = duty.currentTask();
    if (task) {
      const want = pattern[duty.st.tasksIssued - 1] || 'correct';
      const idx = want === 'correct' ? task.correctIndex : wrongIndex(task);
      stream.push({ call: 'answerTask', id: task.id, r: duty.answer(task.id, idx) });
    }
    if (duty.st.tasksIssued >= 5 && !duty.currentTask()) break;
  }
  const evs = duty.update({ t: (t += 20), arrived: true });
  stream.push({ call: 'update', events: evs.map(canonEvent) });
  stream.push({ call: 'summary', summary: duty.summary() });
  return duty;
}

const scenarios = [];
const seedEvent = findSeed(d => d.scheduledEvent);
const seedNoGo = findSeed(d => !d.dispatchCase.correctGo);
const seedDivert = findSeed(d => d.scheduledEvent && d.scheduledEvent.kind === 'weather' && d.scheduledEvent.correctIndex === 0);
const seedTurb = findSeed(d => d.scheduledEvent && d.scheduledEvent.kind === 'turbulence');
const seedNone = findSeed(d => !d.scheduledEvent);
const seedPM = findSeed(d => true, 'HND-KMQ', 'PM');
const S = (name, cfg, fn) => { const stream = []; fn(stream, cfg); scenarios.push({ name, cfg, stream }); };
S('pf-event-correct', { seed: seedEvent }, (s, c) => flyPF(s, c));
S('pf-none-ono', { seed: seedNone, captain: 'ono' }, (s, c) => flyPF(s, c));
S('pf-wrong-dispatch', { seed: seedEvent, dispatchAnswer: 'wrong' }, (s, c) => flyPF(s, c));
S('pf-nogo', { seed: seedNoGo }, (s, c) => flyPF(s, c));
S('pf-divert-frame', { seed: seedDivert, touchdownPos: 'frame' }, (s, c) => flyPF(s, c));
S('pf-compress-blocked', { seed: seedTurb, compressFirst: true }, (s, c) => flyPF(s, c));
S('pf-cts-kashiwagi', { seed: 7, route: 'HND-CTS', captain: { id: 'kashiwagi' } }, (s, c) => flyPF(s, c));
S('pm-ride', { seed: seedPM }, (s, c) => ridePM(s, c));
S('pm-ride-strict', { seed: 3, captain: 0.9 }, (s, c) => ridePM(s, c));
const briefs = ['HND-KMQ', 'HND-CTS', 'HND-FUK', 'HND-OKA'].map(r => lineBrief(r));
fs.writeFileSync('/home/hatch/workspace/cadet-unity/flight/test/golden-line.json', JSON.stringify({ scenarios, briefs }));
console.log('line golden:', scenarios.length, 'scenarios; seeds', { seedEvent, seedNoGo, seedDivert, seedTurb, seedNone, seedPM });
