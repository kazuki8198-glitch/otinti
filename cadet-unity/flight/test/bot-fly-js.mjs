// JS-side digest runner for the lesson-bot equivalence check (Stage 2).
// Usage: node bot-fly-js.mjs > digest-fly-js.jsonl
const TEST = new URL('../../../cadet-wt-all/flight-lab/test/', import.meta.url).pathname;
const { load, CORE } = await import(TEST + 'load.mjs');
const FL = load(...CORE);
const { runLesson } = await import(TEST + 'bot.mjs');

const ids = [];
for (const st of FL.syllabus.STAGES) for (const l of st.lessons) if (l.steps) ids.push(l.id);
const levels = ['intro', 'basic', 'precision'];
for (const id of ids) {
  for (const lv of levels) {
    let L, err = null;
    try { L = runLesson(FL, id, lv, 900); } catch (e) { err = String(e && e.message || e); }
    if (err) { console.log(JSON.stringify({ id, level: lv, error: err })); continue; }
    const rows = [];
    for (const r of L.results) for (const row of r.rows) rows.push([r.step, row.name, row.pass, row.score == null ? null : +row.score.toFixed(4)]);
    console.log(JSON.stringify({
      id, level: lv, done: L.done, passed: L.passed, grade: L.grade ?? null,
      score: L.score == null ? null : +L.score.toFixed(4), passPct: L.passPct ?? null, t: +L.t.toFixed(2), rows,
    }));
  }
}
