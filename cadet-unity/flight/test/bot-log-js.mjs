// JS reference for the logbook port.
import fs from 'node:fs';
const LB = await import('file:///home/hatch/workspace/cadet-wt-all/cadet/src/career/logbook.js');
const out = [];
const emit = o => out.push(JSON.stringify(o));
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const sumA = { lessons: [
  { id: 't1', title: '離陸', grade: 'A', passed: true, done: true, crashed: false },
  { id: 'i5', title: '計器', grade: 'S', passed: true, done: true, crashed: false },
  { id: 'a2', title: '場周', grade: 'B', passed: false, done: true, crashed: false },
  { id: 'x1', title: '航法', grade: '', passed: false, done: false, crashed: false }],
  blockT: 4567, solo: false, landings: 2, trust: 7, plan: { aircraft: 'pa28' } };
const sumB = { lessons: [{ id: 't3', title: '着陸', grade: 'A', passed: true, done: true, crashed: false }],
  blockT: 1800, solo: true, trust: 3, plan: { aircraft: 'pa44' } };
const book = LB.createLogbook(memStore());
const eA = book.add(LB.entryFrom(sumA, { date: '2026-10-23', remarks: 'よくできました', dayN: 4, skippedSec: 300 }));
const eB = book.add(LB.entryFrom(sumB, { date: '2026-11-02', dayN: 21, xc: true }));
const eI = book.add(LB.introEntry({ date: '2026-10-20', dayN: 1, airSec: 2400, level: 'level', turn: 'right', takes: 2, trust: 1 }));
emit({ tag: 'entries', eA, eB, eI });
emit({ tag: 'totals', totals: book.totals() });
// read-back: a dirty saved book through createLogbook's cleaning
const dirty = { v: 1, entries: [
  { day: 2.5, date: '2026-10-24T99', aircraft: '', reg: 'TOOLONGREGX', from: '', to: 'LABX', total: 1.25, dual: 1.25, solo: -3, landings: 25, lessons: [{ id: 'T1', title: 'x'.repeat(50), grade: 'SS', passed: 1 }, { id: 'ok99', title: '航法', grade: 'A', passed: true }], remarks: 'r'.repeat(250), skipped: 2.5, trust: 'x', sig: { name: '', cert: '' }, signed: false, endorsement: 'e'.repeat(150) },
  { total: 'nope' }, null, { total: 0.5, lessons: 'no' }] };
const store2 = memStore(); store2.setItem(LB.LOGBOOK_KEY, JSON.stringify(dirty));
const book2 = LB.createLogbook(store2);
emit({ tag: 'cleaned', entries: book2.entries, totals: book2.totals() });
emit({ tag: 'tenths', vals: [0, 59, 60, 359, 360, 540, 3599, 3600].map(LB.tenths) });
fs.writeFileSync(new URL('./digest-log-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('log js lines:', out.length);
