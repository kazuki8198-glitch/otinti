// CADET — tools/measure-ch2.mjs : chapter 2 measured, not changed (the brief: its numbers and how it might be fixed go
// into the report). Node only. For each of chapter 2's lessons (career.js CH2 and c1): the instructor's briefing as the
// game gives it (content/dialog/instructor.js instructorDialogs, today's lessons t1 → it → t3), run with its first
// choices; the lines that every briefing says alike; the textbook sections each lesson links to, and how many of them
// are in part 2 (chapters no class of chapter 1 teaches).
//   node tools/measure-ch2.mjs > out.json
import { load, runTalk, readingSeconds, patternOf } from './measure-ch1.mjs';
import { pathToFileURL } from 'node:url';

// (the cadet has met the instructor: the first meeting's lines are not the briefing's)
const met = (L) => { const st = L.engine.createDialogState(); st.flags.met_instructor = true; return st; };
export async function measureCh2() {
  const L = await load(), FL = L.FL, C = L.career, ins = await import(pathToFileURL(new URL('../src/content/dialog/instructor.js', import.meta.url).pathname).href);
  const taught = new Set(C.CLASSES.flat()), out = { lessons: [], same: [], links: { all: 0, part2: 0, byLesson: {} } };
  const seen = new Map();
  for (const id of [...C.CH2, 'c1']) {
    const d = ins.instructorDialogs(FL, { lessonId: id, day: ['t1', id, 't3'] });
    // (the briefing's menu: each of its items once, then off to the aircraft — as a cadet who asks everything)
    const chosen = new Set(), policy = (v) => { const i = v.choices.findIndex(c => !chosen.has(c.text) && !/そろそろ|行きます/.test(c.text)); const k = i >= 0 ? i : Math.max(0, v.choices.findIndex(c => /そろそろ|行きます/.test(c.text))); chosen.add(v.choices[k].text); return k; };
    const start = Object.keys(d.dialogs)[0], r = runTalk(L, d, d.dialogs.brief ? 'brief' : start, { policy, state: met(L), ctx: { career: { chapter: 'ch2', slot: 'am', day: 12 }, today: {}, weather: {}, imsafe: { honest: true }, tem: { on: false } } });
    const lines = r.lines.map(l => l.text);
    for (const t of new Set(lines.map(patternOf))) seen.set(t, (seen.get(t) || 0) + 1);
    const secs = L.BOOK.lessonSections(id), part2 = secs.filter(s => !taught.has(L.BOOK.section(s.id).chapter.id));
    out.links.all += secs.length; out.links.part2 += part2.length; out.links.byLesson[id] = { all: secs.length, part2: part2.map(s => s.id) };
    out.lessons.push({ id, lines: lines.length, minutes: +(r.lines.reduce((a, l) => a + l.t, 0) / 60).toFixed(1) });
  }
  const n = out.lessons.length;
  out.same = [...seen.entries()].filter(([, k]) => k === n).map(([p]) => p);
  out.briefings = n;
  return out;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.stdout.write(JSON.stringify(await measureCh2(), null, 1) + '\n');
