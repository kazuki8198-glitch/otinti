// CADET — the crew in English (M8, content/dialog/en.js), in Node: every line 早瀬 教官, 真壁 主任教官 and 黒田 審査官
// say in every talk — the briefings of all 39 lessons, the career's talks, the people's, the seat's, the debrief in
// their three voices, the later written tests and the navigation log — has its English, or is the course's own
// material (tagged, said as written); the data with the English still passes the validator (no dead end, no missing
// node, every placeholder of the English filled from the context); the English is English (Japanese only inside the
// quotes of what the course writes), names no real airline or maker; his words in the air too.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameBook } from '../src/content/book.js';
import { withEnglish, missingEnglish, english, airEnglish, EN, AIR_EN, CREW } from '../src/content/dialog/en.js';
import { instructorDialogs, sampleCtx } from '../src/content/dialog/instructor.js';
import { careerInstructorDialogs, CAREER_SAMPLE } from '../src/content/dialog/instructor-career.js';
import { peopleDialogs, SAMPLE_CTX } from '../src/content/dialog/people.js';
import { cockpitDialogs, careerBoardDialogs } from '../src/content/dialog/cockpit.js';
import { apronDialogs, dayDialogs, PHASE_LINES, ASSIST_LINES, RECOVER_LINE, EVENT_LINES } from '../src/content/dialog/day1.js';
import { debriefDialogs } from '../src/content/dialog/debrief.js';
import { examDialogs, navlogDialogs } from '../src/content/school.js';
import { EXAMS, CHECKS } from '../src/career/career.js';
import { temFor, THREATS, THREATS_EN } from '../src/career/tem.js';
import { validateDialogs } from '../src/dialog/validate.js';
import { createRunner, createDialogState } from '../src/dialog/engine.js';
import { installSorajima } from '../src/flight/sorajima.js';

const here = path.dirname(fileURLToPath(import.meta.url));
for (const m of ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'book-figs.js', 'book-core.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js', 'quiz.js', 'radio.js'])
  vm.runInThisContext(fs.readFileSync(path.join(here, '../../flight-lab/src', m), 'utf8'), { filename: m });
installSorajima(globalThis.FL);
const FL = globalThis.FL, BOOK = gameBook(FL);
const LESSONS = FL.syllabus.STAGES.flatMap(s => s.lessons);
const JA = /[ぁ-んァ-ヶ一-龯々]/;
// the English with the course's own words (in “”) and the placeholders taken out: no Japanese left
const plainEnglish = (en) => !JA.test(String(en).replace(/“[^”]*”/g, '').replace(/\{[\w.]+\}/g, ''));
const SUMS = [
  { walk: { anomalies: 2, found: 1, missed: [{ name: 'エンジン：オイルの量' }], tasksLeft: ['tie'] }, radio: { n: 8, first: 6, late: 1, wrong: 2 }, incursion: true, crash: '', fault: null, trust: 3,
    lessons: [{ id: 't1', title: '通常離陸と上昇', done: true, passed: true, grade: 'S', rows: [] }, { id: 'a2', title: '直線水平飛行', done: true, passed: false, grade: 'C', rows: [{ name: '高度', val: '+180 ft', std: '±100 ft', pass: false }] }, { id: 't3', title: '通常着陸', done: false }],
    tem: { threat: { ja: '午後の雷雨', en: { threat: 'afternoon thunderstorms' } }, named: false } },
  { walk: { anomalies: 0, found: 0, missed: [], tasksLeft: [] }, radio: { n: 0, first: 0 }, incursion: false, crash: '', fault: { decided: 'return', tries: 1 }, trust: 8, lessons: [], tem: { threat: { ja: '審査の緊張', en: { threat: 'check-ride nerves' } }, named: true } },
  { walk: { anomalies: 1, found: 1, missed: [], tasksLeft: [] }, radio: { n: 6, first: 6 }, incursion: false, crash: '機体の右翼端', fault: { decided: 'go', tries: 0 }, trust: -4, autoItems: 9,
    lessons: [{ id: 'm1', title: 'Vmc デモ', done: true, crashed: true }] },
];
// every talk the crew are in, with the context it is shown with
function talks() {
  const out = [];
  for (const l of LESSONS) {
    out.push([`brief ${l.id}`, instructorDialogs(FL, { lessonId: l.id }), sampleCtx(FL)]);
    out.push([`brief ${l.id} (a day)`, instructorDialogs(FL, { lessonId: l.id, day: ['t1', l.id, 't3'] }), sampleCtx(FL)]);
  }
  out.push(['career', careerInstructorDialogs(), CAREER_SAMPLE], ['people', peopleDialogs(), SAMPLE_CTX], ['seat', cockpitDialogs(FL, {}), {}], ['apron', apronDialogs(), {}], ['day', dayDialogs(), {}]);
  for (const r of ['none', 'done', 'weather', 'tired', 'brief']) out.push([`board ${r}`, careerBoardDialogs(FL, { reason: r, lessons: ['t1', 'a2', 't3'] }), {}]);
  out.push(['board ready', careerBoardDialogs(FL, { lessons: ['t1', 'a2', 't3'], ready: true }), {}]);
  for (const c of [{ title: 'ソロ前の審査', lessons: ['t1', 'a2', 't3'] }, ...Object.values(CHECKS).filter(c => c.kind === 'checkride')]) out.push([`board check ${c.title}`, careerBoardDialogs(FL, { lessons: c.lessons, checkride: true, checkTitle: c.title }), {}]);
  SUMS.forEach((s, i) => { for (const v of ['instructor', 'chief', 'examiner']) out.push([`debrief ${i} ${v}`, debriefDialogs(s, { voice: v }), { ai: { on: true } }]); });
  for (const id of Object.keys(EXAMS)) if (id !== 'written1') out.push([`exam ${id}`, examDialogs(FL, id, {}), { quiz: { right: 18, n: 20, pct: 90, pass: true } }]);
  out.push(['navlog', navlogDialogs(FL, {}), { quiz: { right: 5, n: 5, pct: 100, pass: true } }]);
  return out;
}

test('every line the crew say has its English, or is the course\'s own material; the English still passes the validator', () => {
  let n = 0, mat = 0;
  for (const [name, raw, ctx] of talks()) {
    const data = withEnglish(raw);
    assert.deepEqual(missingEnglish(data), [], `${name}: lines with no English`);
    // the data with its English: no dead end, nothing missing, the English's placeholders filled from the context
    const r = validateDialogs(data, { sectionExists: BOOK.sectionExists, lessonExists: (id) => LESSONS.some(l => l.id === id), sampleCtx: { ...ctx, ...sampleCtx(FL) } });
    assert.deepEqual(r.errors.filter(e => / en\b|placeholder/.test(e) || /dead end|leads to|no way/.test(e)), [], `${name}: ${r.errors.slice(0, 3)}`);
    for (const dd of Object.values(data.dialogs)) for (const [id, nd] of Object.entries(dd.nodes)) {
      if (!CREW.includes(nd.speaker)) continue;
      if (nd.tag === 'material') { mat++; continue; }
      n++;
      assert.ok(plainEnglish(nd.en), `${name} ${id}: not English: ${nd.en}`);
      assert.doesNotMatch(nd.en, /\bANA\b|All Nippon|Acron|Garmin|JAL\b/, `${name} ${id}`);
    }
  }
  assert.ok(n > 1500 && mat > 1000, `${n} lines in English, ${mat} of the material`);
});

test('a talk run in English: the views carry the English, filled from the context; the Japanese stays the text', () => {
  const data = withEnglish(careerInstructorDialogs());
  const st = createDialogState(); st.flags.met_instructor = true;
  const t = temFor({ weather: 'pmStorm', fatigue: 0, chapter: 'ch3', aircraft: 'pa28', check: false, xc: false, day: 3 });
  const ctx = { ...CAREER_SAMPLE, tem: { on: true, o0: t.options[0], o1: t.options[1], o2: t.options[2], threat: t.threat.ja, why: t.threat.why, plan: t.threat.plan, not: t.others[(t.right + 1) % 3], en: { ...t.threat.en, not: t.othersEn[(t.right + 1) % 3] } } };
  const r = createRunner({ data, state: st, ctx: () => ctx });
  r.start('day');
  let v = r.view();
  assert.match(v.en, /^Good morning\. Before we start/); assert.match(v.text, /^おはようございます/);
  r.choose(0); v = r.view(); assert.equal(v.en, 'Good. Then, today\'s lesson.');
  r.next(); v = r.view(); assert.match(v.en, /^Before we fly, TEM/);
  r.choose((t.right + 1) % 3); v = r.view();
  assert.equal(v.en, `${t.othersEn[(t.right + 1) % 3]}. Today's biggest threat is "afternoon thunderstorms". ${THREATS_EN.storm.why}. The plan: ${THREATS_EN.storm.plan}.`);
  assert.ok(plainEnglish(v.en));
});

test('the course\'s words in a line keep their quotes; the threats, the checks and the exams have their English', () => {
  assert.equal(english('ホワイトボードを見てください。今日の課目は「直線水平飛行」です。'), 'Look at the whiteboard. Today\'s lesson is “直線水平飛行”.');
  assert.equal(english('シートベルト、ドア、よし。……では、計器飛行の審査を始めます。'), 'Seat belt, door: good. ...Now, we begin the instrument check.');
  assert.equal(english('今日は「通常離陸と上昇」、「直線水平飛行」、「通常着陸」。離陸して訓練空域で練習し、戻って着陸します。ブリーフィングのとおりにやってみましょう。'),
    'Today: “通常離陸と上昇”, “直線水平飛行”, “通常着陸”. We take off, practise in the area, and come back to land. Let\'s do it as briefed.');
  assert.equal(english('まだ英語にしていない新しい台詞'), null);
  for (const th of THREATS) { const e = THREATS_EN[th.id]; assert.ok(e && e.ja && e.why && e.plan && (e.not || th.id === 'traffic'), th.id); for (const x of Object.values(e)) assert.ok(plainEnglish(x), `${th.id}: ${x}`); }
  for (const v of Object.values(EN)) assert.ok(plainEnglish(v), v);
});

test('his words in the air: every line of the day in English', () => {
  const lines = [...Object.values(PHASE_LINES), ...Object.values(ASSIST_LINES), RECOVER_LINE, EVENT_LINES.incursion, EVENT_LINES.nostarter, EVENT_LINES.surge, EVENT_LINES.noClear,
    EVENT_LINES.walkFound('ピトー管のカバー。'), EVENT_LINES.stopped('燃料切れ')];
  for (const l of lines) { const e = airEnglish(l); assert.ok(e, l); assert.ok(plainEnglish(e.replace(/ピトー管のカバー。|燃料切れ/, '')), e); }
  assert.ok(Object.keys(AIR_EN).length >= 25);
  assert.equal(airEnglish('右に 10° 修正。'), null, 'a lesson\'s own hint stays as written');
});
