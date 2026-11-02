// CADET Unity port — Stage 1 data conversion pipeline (v2).
// Extracts every data-shaped asset of the HTML tree into JSON under data/:
//  A) FLIGHT LAB's FL-global modules (loaded in a vm, the way the page loads them)
//  B) CADET's ES modules (exports serialized; functions kept as {__fn, src} markers
//     so their logic is preserved as the hand-port reference, never silently lost)
//  C) factory functions (gameBook(FL), *Spec(FL), dialog-tree builders) called and
//     their results serialized.
// Usage: node convert-data.mjs [treeRoot] [outDir]
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import path from 'node:path';

const TREE = process.argv[2] || '/home/hatch/workspace/cadet-wt-all';
const OUT = process.argv[3] || '/home/hatch/workspace/cadet-unity/data';
mkdirSync(OUT, { recursive: true });

// ---------- serializer ----------
function serialize(root) {
  const stats = { fn: 0, cycle: 0, nodes: 0 };
  const ser = (v, anc) => {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? String(v) : `{"__num":${JSON.stringify(String(v))}}`;
    if (t === 'string') return JSON.stringify(v);
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'undefined') return '{"__undef":true}';
    if (t === 'function') { stats.fn++; return `{"__fn":${JSON.stringify(v.name || 'anonymous')},"src":${JSON.stringify(String(v).slice(0, 4000))}}`; }
    if (t === 'object') {
      if (anc.has(v)) { stats.cycle++; return '{"__cycle":true}'; }
      stats.nodes++;
      anc.add(v);
      let out;
      if (Array.isArray(v)) out = '[' + v.map(x => ser(x, anc)).join(',') + ']';
      else out = '{' + Object.keys(v).map(k => JSON.stringify(k) + ':' + ser(v[k], anc)).join(',') + '}';
      anc.delete(v);
      return out;
    }
    return JSON.stringify(String(v));
  };
  return { json: ser(root, new Set()), stats };
}

const manifest = { tree: TREE, files: {}, failures: {}, counts: {} };
function emit(name, value) {
  const { json, stats } = serialize(value);
  writeFileSync(path.join(OUT, name + '.json'), json);
  manifest.files[name] = { bytes: json.length, fnMarkers: stats.fn, cycles: stats.cycle, objects: stats.nodes };
  console.log(`OK   ${name.padEnd(26)} ${String(json.length).padStart(9)} B  fn=${stats.fn} cyc=${stats.cycle} obj=${stats.nodes}`);
  return value;
}
function fail(name, e) { manifest.failures[name] = String(e && e.message || e).slice(0, 300); console.log(`FAIL ${name.padEnd(26)} ${String(e && e.message || e).slice(0, 150)}`); }

// ---------- A) FL harness ----------
globalThis.FL = {};
const FL_FILES = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js',
  'book-core.js', 'book-1.js', 'book-2.js', 'book-3.js', 'book-4.js', 'book-5.js', 'book-comm.js', 'book-figs.js', 'radio.js'];
for (const n of FL_FILES) {
  try { vm.runInThisContext(readFileSync(path.join(TREE, 'flight-lab/src', n), 'utf8'), { filename: n }); }
  catch (e) { fail('fl-load:' + n, e); }
}
const FL = globalThis.FL;
try { emit('quiz', { BANKS: FL.quiz.BANKS }); manifest.counts.quizBanks = FL.quiz.BANKS.length; manifest.counts.quizQuestions = FL.quiz.BANKS.reduce((a, b) => a + b.qs.length, 0); } catch (e) { fail('quiz', e); }
try {
  emit('syllabus', { STAGES: FL.syllabus.STAGES, PHASES: FL.syllabus.PHASES, FIELD: FL.syllabus.FIELD, KEYS: FL.syllabus.KEYS, landingSteps: FL.syllabus.landingSteps });
  manifest.counts.lessons = FL.syllabus.STAGES.reduce((a, s) => a + s.lessons.length, 0);
  manifest.counts.lessonIds = FL.syllabus.STAGES.flatMap(s => s.lessons.map(l => l.id));
} catch (e) { fail('syllabus', e); }
try { emit('textbook-fl', { PARTS: FL.book.PARTS, CHAPTERS: FL.book.CHAPTERS }); manifest.counts.bookChapters = FL.book.CHAPTERS.length; manifest.counts.bookSections = FL.book.CHAPTERS.reduce((a, c) => a + (c.secs ? c.secs.length : 0), 0); } catch (e) { fail('textbook-fl', e); }
try { emit('school-data', { LEVELS: FL.school.LEVELS, CHECKLISTS: FL.school.CHECKLISTS, FREE_STARTS: FL.school.FREE_STARTS, HOW: FL.school.HOW, ATC_Q: FL.school.ATC_Q, TGT_LABEL: FL.school.TGT_LABEL }); } catch (e) { fail('school-data', e); }
try { emit('sanford', { RUNWAYS: FL.sanford.RUNWAYS, FACTS: FL.sanford.FACTS, AIRSPACE: FL.sanford.AIRSPACE, SCENES: FL.sanford.SCENES, CALLSIGN: FL.sanford.CALLSIGN }); } catch (e) { fail('sanford', e); }
try { emit('physics-constants', { AIRCRAFT: FL.physics.AIRCRAFT, LAB_RWY: FL.physics.LAB_RWY, PAVED: FL.physics.PAVED, LAKES: FL.physics.LAKES, GROUND_FT: FL.physics.GROUND_FT }); } catch (e) { fail('physics-constants', e); }
try { emit('radio-data', FL.radio || {}); } catch (e) { fail('radio-data', e); }

// ---------- B) ES modules ----------
const MODULES = [
  ['cadet/src/career/career.js', 'career-constants'],
  ['cadet/src/career/tem.js', 'tem'],
  ['cadet/src/content/school.js', 'school-content'],
  ['cadet/src/content/lecture-summaries.js', 'lecture-summaries'],
  ['cadet/src/content/lecture-units.js', 'lecture-units'],
  ['cadet/src/content/lecture-notes/index.js', 'lecture-notes'],
  ['cadet/src/content/people.js', 'people'],
  ['cadet/src/content/checklists-archer.js', 'checklists-archer'],
  ['cadet/src/content/checklists-seminole.js', 'checklists-seminole'],
  ['cadet/src/content/checklists-jet.js', 'checklists-jet'],
  ['cadet/src/content/usable.js', 'usable'],
  ['cadet/src/content/walkaround-archer.js', 'walkaround-archer'],
  ['cadet/src/content/walkaround-seminole.js', 'walkaround-seminole'],
  ['cadet/src/content/answer-map.js', 'answer-map'],
  ['cadet/src/content/class-talk.js', 'class-talk'],
  ['cadet/src/content/dialog/en.js', 'dialog-en'],
  ['cadet/src/aircraft/registrations.js', 'registrations'],
  ['cadet/src/flight/airfields.js', 'airfields'],
  ['cadet/src/content/dialog/day1.js', 'dialog-day1-lines'],
  ['cadet/src/content/dialog/instructor.js', 'dialog-instructor-lines'],
  ['cadet/src/content/dialog/first-officer.js', 'dialog-first-officer-lines'],
];
const loaded = {};
for (const [rel, name] of MODULES) {
  try { const mod = await import(pathToFileURL(path.join(TREE, rel)).href); loaded[name] = mod; emit(name, { ...mod }); }
  catch (e) { fail(name, e); }
}

// ---------- C) factories ----------
try { emit('gamebook', loaded['book'] ? null : (await import(pathToFileURL(path.join(TREE, 'cadet/src/content/book.js')).href)).gameBook(FL)); } catch (e) { fail('gamebook', e); }
for (const [rel, name, fn] of [
  ['cadet/src/content/academy-spec.js', 'academy-spec', 'academySpec'],
  ['cadet/src/content/dorm-spec.js', 'dorm-spec', 'dormSpec'],
  ['cadet/src/content/tower-spec.js', 'tower-spec', 'towerSpec'],
  ['cadet/src/content/hangar-spec.js', 'hangar-spec', 'hangarSpec'],
]) {
  try { const mod = await import(pathToFileURL(path.join(TREE, rel)).href); emit(name, mod[fn](FL)); } catch (e) { fail(name, e); }
}
// dialog trees: fixed (non-parameterized or default-arg) builders
const TREES = {};
async function addTrees(name, rel, calls) {
  try {
    const mod = await import(pathToFileURL(path.join(TREE, rel)).href);
    for (const [key, fn] of Object.entries(calls)) { try { TREES[key] = fn(mod); } catch (e) { fail('tree:' + key, e); } }
  } catch (e) { fail('trees:' + name, e); }
}
await addTrees('day1', 'cadet/src/content/dialog/day1.js', { day: m => m.dayDialogs(), apron: m => m.apronDialogs() });
await addTrees('epilogue', 'cadet/src/content/dialog/epilogue.js', { epilogue: m => m.epilogueDialogs(''), epilogueHonors: m => m.epilogueDialogs('優等') });
await addTrees('first-officer', 'cadet/src/content/dialog/first-officer.js', { join: m => m.joinDialogs() });
await addTrees('instructor-career', 'cadet/src/content/dialog/instructor-career.js', { career: m => m.careerInstructorDialogs() });
await addTrees('intro', 'cadet/src/content/dialog/intro.js', { introAir: m => m.introAirDialogs() });
await addTrees('people', 'cadet/src/content/dialog/people.js', { people: m => m.peopleDialogs() });
await addTrees('ch1-events', 'cadet/src/content/dialog/ch1-events.js', Object.fromEntries(['forces', 'pitot', 'spell', 'readback', 'metar', 'imsafe', 'week'].map(id => ['event_' + id, m => m.eventDialogs(id, {})])));
await addTrees('atc', 'cadet/src/content/dialog/atc.js', { dayRadioGood: m => m.dayRadio({ kind: 'good' }), ctaf: m => m.ctafRadio() });
emit('dialog-trees', TREES);
function countNodes(v, acc = { n: 0 }) { if (v && typeof v === 'object') { acc.n++; for (const x of Object.values(v)) countNodes(x, acc); } return acc.n; }
manifest.counts.dialogTreeObjects = countNodes(TREES);
try { manifest.counts.people = Object.keys((await import(pathToFileURL(path.join(TREE, 'cadet/src/content/people.js')).href)).PEOPLE).length; } catch {}
writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 1));
console.log('counts:', JSON.stringify(manifest.counts));
console.log('failures:', Object.keys(manifest.failures).length ? JSON.stringify(manifest.failures, null, 1) : 'none');
