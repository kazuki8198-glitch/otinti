// JS reference for day.js planFor/stepsFor equivalence (pure part).
import fs from 'node:fs';
const TEST = '/home/hatch/workspace/cadet-wt-all/flight-lab/test/';
const { load, CORE } = await import(TEST + 'load.mjs');
const FL = load(...CORE);
const day = await import('file:///home/hatch/workspace/cadet-wt-all/cadet/src/career/day.js');
const out = [];
const plan = p => ({ main: p.main, solo: !!p.solo, xc: !!p.xc, check: !!p.check, lessons: p.lessons, aircraft: p.aircraft || 'pa28', ctaf: !!p.ctaf, divertTo: p.divertTo || null, xcVariant: p.xcVariant || null });
const ids = [];
for (const st of FL.syllabus.STAGES) for (const l of st.lessons) if (l.steps) ids.push(l.id);
for (const id of ids) {
  const p = day.planFor(FL, id);
  out.push(JSON.stringify({ tag: 'plan', id, p: plan(p) }));
  let steps = null, err = null;
  try { steps = day.stepsFor(FL, p.lessons, { ctaf: !!p.ctaf }); } catch (e) { err = String(e.message || e); }
  out.push(JSON.stringify({ tag: 'steps', id, steps, err }));
}
out.push(JSON.stringify({ tag: 'plan', id: 'SOLO', p: plan(day.planFor(FL, 't2', { solo: true })) }));
out.push(JSON.stringify({ tag: 'plan', id: 'LABEF', p: plan(day.planFor(FL, 'n2', { xcVariant: 'labef' })) }));
for (const chk of [{ lessons: ['t1', 'n2', 't3'], kind: 'xc' }, { lessons: ['t1', 'x2', 't3'], kind: 'checkride' }, { lessons: ['j1', 'j5'], kind: 'checkride' }, { lessons: ['t1', 't3'], kind: 'checkride' }]) {
  const p = day.planFor(FL, '', { check: chk });
  out.push(JSON.stringify({ tag: 'plan', id: 'CHK:' + chk.lessons.join('+'), p: plan(p) }));
  let steps = null, err = null;
  try { steps = day.stepsFor(FL, p.lessons); } catch (e) { err = String(e.message || e); }
  out.push(JSON.stringify({ tag: 'steps', id: 'CHK:' + chk.lessons.join('+'), steps, err }));
}
out.push(JSON.stringify({ tag: 'order', o: day.ORDER }));
out.push(JSON.stringify({ tag: 'kinds', m: ids.map(id => [id, day.startKind(FL, id), day.endKind(FL, id)]) }));
fs.writeFileSync(new URL('./digest-day-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('day js lines:', out.length);
