// Equivalence bot (JS reference): drives cadet/src/career/career.js through a
// full career (prologue -> ch1..ch7 -> fo1 -> fo2 line check) with a fixed,
// deterministic op script, emitting one JSON digest line per step.
// The C# bot (BotCs.cs) performs the identical script; diff-digests.py compares.
import fs from 'node:fs';
import { createCareer, lessonGrowth, ftdGrowth, classGrowth, noteGround, missAsk, trustBand, graduationRank, CHECKS } from '../../../cadet-wt-all/cadet/src/career/career.js';

const out = [];
const stable = (v) => {
  if (v === null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map(stable);
  const o = {};
  for (const k of Object.keys(v).sort()) { const x = stable(v[k]); if (x !== undefined) o[k] = x; }
  return o;
};
const emit = (o) => out.push(JSON.stringify(stable(o)));

const VAL = { S: 95, A: 85, B: 72, C: 55 };
const ORD = { '': 0, C: 1, B: 2, A: 3, S: 4 };
const GRADES = ['S', 'A', 'B', 'A', 'C', 'A'];
const MISSKEYS = ['alt', 'hdg', 'spd', 'proc', 'wx', 'radio', 'fuel', 'checklist', 'judge', 'fatigue'];

function flyRecord(prog, id, grade, level) {
  let r = prog.lessons[id] || (prog.lessons[id] = { tries: 0, best: '', pass: false, score: 0, levels: [] });
  const first = r.tries === 0;
  r.tries++;
  const val = VAL[grade];
  if (val >= 60) { r.pass = true; if (!r.levels.includes(level)) r.levels.push(level); }
  r.score = val;
  if (ORD[grade] > ORD[r.best || '']) r.best = grade;
  return first;
}

function runCareer(seed) {
  const store = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); } };
  const C = createCareer({ store, seed });
  const prog = { lessons: {} };
  let doneDay = -1;
  emit({ tag: 'init', seed, state: C.state });
  for (let day = 1; day <= 420; day++) {
    if (day % 11 === 5) { const k = MISSKEYS[day % 10]; C.noteMiss(k, 'レッスン ' + k); }
    if (day % 13 === 7) C.decision(day % 2 ? 'go' : 'cancel', C.weather(prog));
    const sch = C.schedule(prog, { trust: 62 });
    emit({ tag: 'D0', day, state: C.state, sch, gate62: C.gate(prog, 62), gate40: C.gate(prog, 40), wx: C.weather(prog), fly: C.flyingWeather(prog), aloft: C.aloft(prog), miss: missAsk(C.state), prog });
    sch.forEach((it, idx) => {
      const grade = GRADES[(day + idx) % 6];
      switch (it.kind) {
        case 'ceremony': C.done('ceremony', 'welcome'); break;
        case 'tour': C.done('tour', 'tour'); break;
        case 'brief': C.done('brief', 'meet'); C.finishPrologue(); break;
        case 'class': {
          const pace = ['need', 'full', 'quick'][(day + idx) % 3];
          C.setPace(pace); C.tire(6);
          for (const [axis, v] of classGrowth(pace)) C.grow(axis, v, 'class:' + it.id);
          C.heardSection('sec' + it.id + 'a', (day + idx) % 2 ? 'f' : 'q');
          C.done('class', it.id); break;
        }
        case 'ftd': {
          const pct = [100, 95, 80][(day + idx) % 3];
          const { rec, first } = noteGround(prog.lessons[it.id] || null, pct >= 60, pct);
          prog.lessons[it.id] = rec;
          if (first) C.firstTry(rec.pass);
          for (const [axis, v] of ftdGrowth(it.id)) C.grow(axis, v, 'ftd:' + it.id);
          C.done('ftd', it.id); break;
        }
        case 'flight': case 'solo': case 'checkride': case 'xc': case 'night': {
          const id = it.id;
          const level = day % 17 === 0 ? 'intro' : ('inxe'.includes(id[0]) ? 'precision' : 'basic');
          const first = flyRecord(prog, id, grade, level);
          if (first) C.firstTry(VAL[grade] >= 60);
          for (const [axis, v] of lessonGrowth(grade, level, id, C.tired())) C.grow(axis, v, 'lesson:' + id);
          C.tire(14);
          C.done(it.kind, id);
          if (it.kind === 'solo') C.soloDone();
          if ((it.kind === 'checkride' || it.kind === 'xc') && CHECKS[id]) C.check(id, grade !== 'C');
          break;
        }
        case 'exam': C.exam(it.id, [88, 93, 76, 97, 84][(day + idx) % 5]); C.done('exam', it.id); break;
        case 'ground': C.decision(day % 2 ? C.weather(prog).decision : 'go', C.weather(prog)); C.done('ground', 'weather'); break;
        case 'weather': C.decision(day % 2 ? 'go' : C.weather(prog).decision, C.weather(prog)); C.done('weather', it.id); break;
        case 'study':
          if (it.id === 'weather') { C.decision('go', C.weather(prog)); C.done('study', 'weather'); }
          else if (it.id === 'remedial') { C.drill(); C.done('study', 'remedial'); }
          else C.done('study', it.id || 'std');
          break;
        case 'navlog': C.done('navlog', 'xc'); break;
        case 'line': C.recordLeg({ route: it.route, role: it.role, blockMin: it.blockMin, score: [82, 90, 77][day % 3], captainEval: [82, 90, 77][day % 3], diverted: day % 29 === 0 }); C.done('line', 'line'); break;
        case 'linecheck': C.recordLineCheck(day % 2 === 0); break;
        case 'graduation': C.done('graduation', 'grad'); break;
        case 'off': case 'rest': break;
        default: if (it.id) C.done(it.kind, it.id); break;
      }
      C.advance();
    });
    const ch = C.state.chapter;
    if (!C.gate(prog, 62).length) {
      if (ch === 'ch6') { C.graduate(prog); C.beginEndorsement(); }
      else if (ch === 'ch7') C.beginFirstOfficer();
      else if (ch !== 'fo2') C.advanceChapter(prog, 62);
    }
    C.sleep({ late: day % 5 === 3 });
    emit({ tag: 'D1', day, state: C.state });
    if (C.state.fo && C.state.fo.done && doneDay < 0) doneDay = day;
    if (doneDay > 0 && day >= doneDay + 5) break;
  }
  emit({ tag: 'final', seed, state: C.state, rank: graduationRank(C.state, prog), prog });
}

runCareer(12345);
runCareer(777);

// ---- scenario B: dirty-save cleaning + weather probes + trust bands
{
  const store = { m: new Map(), getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }, setItem(k, v) { this.m.set(k, String(v)); } };
  const C = createCareer({ store, seed: 5 });
  const dirty = { v: 99, seed: -3, day: 99999, slot: 'xxx', chapter: 'zzz', fatigue: -5, started: 'yes',
    abilities: { hand: 999, know: -2, comm: 'x', judge: 55.5, extra: 10 }, firstTry: { pass: 9, total: 4 },
    exams: { written1: { tries: 2.7, best: 130, pass: 1 }, bogus: { tries: 1 }, nav: 'junk' },
    decisions: Array.from({ length: 250 }, (_, i) => ({ day: i + 1, choice: 'go', right: i % 2 === 0 })),
    growth: Object.fromEntries(Array.from({ length: 250 }, (_, i) => ['k' + i, i])),
    answers: Object.fromEntries(Array.from({ length: 500 }, (_, i) => ['q' + i, i % 2 === 0])),
    heard: { good1: 'f', 'BAD ID!': 'f', ok2: 'x', ok3: 'q' }, walked: ['room-1', 'room-1', 'BAD!', 'tower'],
    miss: { day: 3, key: 'alt', label: '高度' }, fo: { hired: 1, sectors: 30.9, blockMin: -4, evalSum: 40, evalN: 8, lineCheck: { day: 5, pass: true }, done: 0, failSectors: 12 },
    attempts: { 'ftd:k1': 3, 'bad key': 2 }, drills: { day: 2, n: 9 }, examDay: { written1: 4 }, aloft: { day: 2, from: 360, kt: 8, at3000: { from: 30, kt: 16 } },
    solo: { day: 40 }, checks: { xc: { tries: 1, pass: true, day: 30 }, ir: { tries: 'x' } }, graduated: { day: 60, rank: '優等' }, done: { 'flight:a1': 3, junk: 'x' } };
  const okLoad = C.load(dirty);
  emit({ tag: 'B-clean', okLoad, state: C.state });
  for (const [chapter, day] of [['ch4', 100], ['ch4', 300], ['ch3', 1], ['fo1', 50], ['ch2', 200]]) {
    C.load({ v: 3, seed: 777, day, chapter, started: true });
    emit({ tag: 'B-probe', chapter, day, wx: C.weather(null), sch: C.schedule(null, { trust: 62 }), gate: C.gate(null, 62) });
  }
  emit({ tag: 'B-trust', bands: [0, 7, 20, 33, 50, 59, 60, 80, 100].map(t => trustBand(t)) });
}

fs.writeFileSync(new URL('./digest-js.jsonl', import.meta.url), out.join('\n') + '\n');
console.log('js digest lines:', out.length);
