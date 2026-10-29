// CADET — tools/class-table.mjs : README's table of the classes (node only): each class's chapters, and for each pace
// its lines and minutes — the lines said once the pace is chosen, always taking the first choice (the right answer at a
// question), the chapters' questions and the score included; the minutes the subtitles' reading time (school.js
// readingSeconds: 10 characters a second and a second a line).
//   node tools/class-table.mjs
import { load, readingSeconds } from './measure-ch1.mjs';
import { createRunner, createDialogState } from '../src/dialog/engine.js';

const L = await load(), FL = L.FL, S = L.school, BOOK = L.BOOK;
const NAME = { need: '今日の訓練に要るところ', full: 'じっくり', quick: '要点だけ' };
const PACE = { need: /^今日の訓練に要る/, full: /^じっくり/, quick: /^要点だけ/ };
function run(data, pace) {
  const r = createRunner({ data, state: createDialogState(), ctx: { quiz: { right: 0, n: 0, pct: 0, pass: false } }, hooks: { onHook: () => {} } });
  const out = []; let on = false;
  r.start('class');
  for (let k = 0; k < 6000 && r.running; k++) {
    const v = r.view();
    if (on) out.push(v.text);
    if (!v.choices.length) { r.next(); continue; }
    const m = /^q(\d+)$/.exec(v.node), x = m ? data.questions[+m[1]] : null;
    const i = x ? v.choices.findIndex(c => c.text === x.opts[x.ok]) : v.node === 'pace' ? v.choices.findIndex(c => PACE[pace].test(c.text)) : 0;
    if (v.node === 'pace') on = true;
    r.choose(i);
  }
  return out;
}
const rows = [`| 授業 | 章 | ${S.PACES.map(p => NAME[p]).join(' | ')} |`, `|---|---|${S.PACES.map(() => '---').join('|')}|`];
S.CLASS_CHAPTERS.forEach((ids, i) => {
  const d = S.classDialogs(FL, i, {}), chs = ids.map(id => BOOK.chapters.find(c => c.id === id));
  const cells = S.PACES.map(p => { const l = run(d, p), m = l.reduce((s, t) => s + readingSeconds(t), 0) / 60; return `${l.length} 行・約 ${m < 12 ? Math.max(1, Math.round(m)) : Math.round(m / 5) * 5} 分`; });
  rows.push(`| ${i + 1} 回目（午後 ${L.career.CLASS_FTD[i]}） | ${chs.map(c => `第 ${c.n} 章 ${c.title}`).join('・')} | ${cells.join(' | ')} |`);
});
console.log(rows.join('\n'));
