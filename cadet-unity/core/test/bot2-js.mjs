// Equivalence bot #2 (JS reference): tem.js + guide.js sweeps.
import fs from 'node:fs';
import { temFor, errorsOf, errorsOfEn, threatOf, THREATS } from '../../../cadet-wt-all/cadet/src/career/tem.js';
import { nextStep, makeRouter } from '../../../cadet-wt-all/cadet/src/career/guide.js';

const out = [];
const stable = (v) => {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  const o = {};
  for (const k of Object.keys(v).sort()) { const x = stable(v[k]); if (x !== undefined) o[k] = x; }
  return o;
};
const emit = (o) => out.push(JSON.stringify(stable(o)));

// ---- TEM sweep
const weathers = ['good', 'pmStorm', 'lowCloud', 'crosswind', 'pmWind', 'amLowCloud', 'amFog', 'forecastBust', 'southFlow', null];
for (const weather of weathers)
  for (const fatigue of [0, 44, 45, 90])
    for (const check of [false, true])
      for (const xc of [false, true])
        for (const aircraft of ['pa28', 'pa44'])
          for (const chapter of ['ch3', 'ch4', 'ch5'])
            for (const traffic of [0, 3])
              for (const cb of [false, true])
                for (const day of [1, 2, 7, 30])
                  emit({ tag: 'tem', r: temFor({ weather, fatigue, check, xc, aircraft, chapter, traffic, cb, day }) });
emit({ tag: 'threatOf', ids: THREATS.map(t => t.id), got: THREATS.map(t => { const x = threatOf(t.id); return x ? x.ja : null; }), none: threatOf('zzz') });

// ---- errorsOf on shared sums
const sc = JSON.parse(fs.readFileSync(new URL('./scenarios.json', import.meta.url), 'utf8'));
for (const sum of sc.sums) emit({ tag: 'errors', ja: errorsOf(sum), en: errorsOfEn(sum) });

// ---- guide nextStep on shared scenarios
for (const s of sc.guide) emit({ tag: 'guide', r: nextStep(s) });

// ---- router over the converted academy spec
const spec = JSON.parse(fs.readFileSync(new URL('../../data/academy-spec.json', import.meta.url), 'utf8'));
const router = makeRouter(spec);
const roomIds = spec.rooms.map(r => r.id);
const pairs = [];
for (const a of roomIds) for (const b of roomIds) pairs.push([a, b, router.next(a, b)]);
emit({ tag: 'router', pairs, centres: roomIds.map(id => router.centre(id)), missing: router.next('zzz', roomIds[0]), same: router.next(roomIds[0], roomIds[0]) });

fs.writeFileSync(new URL('./digest2-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('js2 digest lines:', out.length);
