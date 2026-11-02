// Equivalence bot #3 (JS reference): v:2 dirty-save cleaning (actually loads)
// + chapter/weather probes + fo2 rest / line-check boundary schedules.
import fs from 'node:fs';
import { createCareer } from '../../../cadet-wt-all/cadet/src/career/career.js';

const out = [];
const stable = (v) => {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  const o = {};
  for (const k of Object.keys(v).sort()) { const x = stable(v[k]); if (x !== undefined) o[k] = x; }
  return o;
};
const emit = (o) => out.push(JSON.stringify(stable(o)));

const store = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); } };
const C = createCareer({ store, seed: 5 });
const dirty = { v: 2, seed: -3, day: 99999, slot: 'xxx', chapter: 'zzz', fatigue: -5, started: 'yes',
  abilities: { hand: 999, know: -2, comm: 'x', judge: 55.5, extra: 10 }, firstTry: { pass: 9, total: 4 },
  exams: { written1: { tries: 2.7, best: 130, pass: 1 }, bogus: { tries: 1 }, nav: 'junk' },
  decisions: Array.from({ length: 250 }, (_, i) => ({ day: i + 1, choice: 'go', right: i % 2 === 0 })),
  growth: Object.fromEntries(Array.from({ length: 250 }, (_, i) => ['k' + i, i])),
  answers: Object.fromEntries(Array.from({ length: 500 }, (_, i) => ['q' + i, i % 2 === 0])),
  heard: { good1: 'f', 'BAD ID!': 'f', ok2: 'x', ok3: 'q' }, walked: ['room-1', 'room-1', 'BAD!', 'tower'],
  miss: { day: 3, key: 'alt', label: '高度' }, fo: { hired: 1, sectors: 30.9, blockMin: -4, evalSum: 40, evalN: 8, lineCheck: { day: 5, pass: true }, done: 0, failSectors: 12 },
  attempts: { 'ftd:k1': 3, 'bad key': 2 }, drills: { day: 2, n: 9 }, examDay: { written1: 4 }, aloft: { day: 2, from: 360, kt: 8, at3000: { from: 30, kt: 16 } },
  solo: { day: 40 }, checks: { xc: { tries: 1, pass: true, day: 30 }, ir: { tries: 'x' } }, graduated: { day: 60, rank: '優等' }, done: { 'flight:a1': 3, junk: 'x' } };
emit({ tag: 'B2-clean', okLoad: C.load(dirty), state: C.state });

for (const [chapter, day] of [['ch4', 100], ['ch4', 300], ['ch3', 1], ['fo1', 50], ['ch2', 200]]) {
  C.load({ v: 2, seed: 777, day, chapter, started: true });
  emit({ tag: 'B2-probe', chapter, day, wx: C.weather(null), sch: C.schedule(null, { trust: 62 }), gate: C.gate(null, 62) });
}
C.load({ v: 2, seed: 42, day: 100, chapter: 'fo2', started: true, fatigue: 70, fo: { hired: true, sectors: 3, blockMin: 200 } });
emit({ tag: 'B2-rest', sch: C.schedule(null, { trust: 62 }), state: C.state });
C.load({ v: 2, seed: 42, day: 100, chapter: 'fo2', started: true, fatigue: 64, fo: { hired: true, sectors: 12, blockMin: 950 } });
emit({ tag: 'B2-linecheck', sch: C.schedule(null, { trust: 62 }) });
C.load({ v: 2, seed: 42, day: 101, chapter: 'fo2', started: true, fatigue: 10, fo: { hired: true, sectors: 12, blockMin: 950, lineCheck: { day: 99, pass: false }, failSectors: 12 } });
emit({ tag: 'B2-afterfail', sch: C.schedule(null, { trust: 62 }) });
C.load({ v: 2, seed: 42, day: 101, chapter: 'fo2', started: true, fatigue: 10, fo: { hired: true, sectors: 16, blockMin: 1200, lineCheck: { day: 99, pass: false }, failSectors: 12 } });
emit({ tag: 'B2-afterfail16', sch: C.schedule(null, { trust: 62 }) });
// v1 save migration path (v:1 accepted)
emit({ tag: 'B2-v1', okLoad: C.load({ v: 1, seed: 9, day: 30, chapter: 'ch2', started: true }), state: C.state });

fs.writeFileSync(new URL('./digest3-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('js3 digest lines:', out.length);
