// extract-dialog.mjs — Stage 8: build the remaining assembled dialog datasets
// the way main.js / the game's tests do (the instructor's per-lesson data and
// the merged instructor+career runtime shape), for the C# engine/validator
// equivalence harness. The fixed trees already live in data/dialog-trees.json.
// Usage: node extract-dialog.mjs [treeRoot] [outFile]
import { writeFileSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import vm from 'node:vm';
import path from 'node:path';

const TREE = process.argv[2] || '/home/hatch/workspace/cadet-wt-free';
const OUT = process.argv[3] || '/home/hatch/workspace/cadet-unity/data/dialog-extra.json';

globalThis.FL = {};
// book-figs must precede book-1..5: they capture FIG = FL.bookFigs at load time
const FL_FILES = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'quiz.js',
  'book-core.js', 'book-figs.js', 'book-1.js', 'book-2.js', 'book-3.js', 'book-4.js', 'book-5.js', 'book-comm.js', 'radio.js'];
for (const n of FL_FILES) vm.runInThisContext(readFileSync(path.join(TREE, 'flight-lab/src', n), 'utf8'), { filename: n });
const FL = globalThis.FL;

const imp = (rel) => import(pathToFileURL(path.join(TREE, rel)).href);
const instructor = await imp('cadet/src/content/dialog/instructor.js');
const career = await imp('cadet/src/content/dialog/instructor-career.js');
const book = await imp('cadet/src/content/book.js');
const BOOK = book.gameBook(FL);

const LESSONS = FL.syllabus.STAGES.flatMap(s => s.lessons.map(l => l.id));
const sampleCtx = instructor.sampleCtx(FL);
const sections = [];
for (const c of BOOK.chapters || []) for (const s of c.sections || []) sections.push(s.id);

const out = { sampleCtx, sections, lessons: LESSONS, instructor: {}, instructorMerged: {} };
const careerData = career.careerInstructorDialogs();
const merge = (d, c) => ({
  speakers: { ...d.speakers, ...c.speakers },
  flags: [...new Set([...d.flags, ...c.flags])],
  hooks: [...new Set([...d.hooks, ...c.hooks])],
  dialogs: { ...d.dialogs, ...c.dialogs },
});
let fnMarkers = 0;
const scan = (v) => { if (v && typeof v === 'object') { if (typeof v === 'function') fnMarkers++; for (const x of Object.values(v)) scan(x); } };
for (const id of LESSONS) {
  out.instructor[id] = instructor.instructorDialogs(FL, { lessonId: id });
  out.instructor[id + '#repeat'] = instructor.instructorDialogs(FL, { lessonId: id, repeat: true });
  out.instructorMerged[id] = merge(out.instructor[id], careerData);
}
scan(out);
writeFileSync(OUT, JSON.stringify(out));
const count = (d) => Object.values(d.dialogs).reduce((a, x) => a + Object.keys(x.nodes).length, 0);
console.log('lessons:', LESSONS.length, 'sections:', sections.length, 'fnMarkers:', fnMarkers);
console.log('a1 nodes:', count(out.instructor.a1), 'merged a1 nodes:', count(out.instructorMerged.a1));
console.log('wrote', OUT);
