// usage: node render-ch.mjs <chapterId> [--text]   prints a chapter's sections (HTML, or text with figures' words) and end matter
// textbook/rewrite/tools/render-ch.mjs — prints one chapter of FLIGHT LAB's textbook as the app renders it (for reading and reviewing).
import { load } from '../../../flight-lab/test/load.mjs';
import { FL_MODULES } from '../../build.mjs';
const FL = load(...FL_MODULES);   // the book as TEXTBOOK reads it (FLIGHT LAB's one list less what TEXTBOOK leaves out)
const B = FL.book, id = process.argv[2], asText = process.argv.includes('--text');
const ch = B.CHAPTERS.find(c => c.id === id);
if (!ch) { console.error('no chapter', id, B.CHAPTERS.map(c => c.id).join(' ')); process.exit(1); }
console.log(`# 第 ${ch.n} 章 ${ch.t} (${ch.id}, part ${ch.part}) — ${ch.en}\nsummary: ${B.fix(ch.summary)}\n`);
for (const s of ch.secs) {
  let h = B.html(s);
  if (asText) h = h.replace(/<svg[\s\S]*?<\/svg>/g, m => '[図: ' + (m.match(/aria-label="([^"]*)"/) || [, ''])[1] + ']').replace(/<\/(p|li|tr|h3|h4|div|figure|table|ul|ol)>/g, '\n').replace(/<td>|<th>/g, ' | ').replace(/<[^>]+>/g, '').replace(/\n\s*\n+/g, '\n');
  console.log(`## ${s.id} ${s.t}\n${h.trim()}\n`);
}
console.log('## terms'); for (const t of ch.terms) console.log('- ' + t.join(' / '));
console.log('## examples'); for (const t of ch.examples) console.log('- ' + B.fix(t));
console.log('## cautions'); for (const t of ch.cautions) console.log('- ' + B.fix(t));
console.log('## quiz'); ch.quiz.forEach((q, i) => console.log(`${i + 1}. ${B.fix(q.q)}\n   ${q.choices.map((c, k) => (k === q.answer ? '[○]' : '[ ]') + c).join(' ')}\n   why: ${B.fix(q.why)}`));
console.log('## refs'); for (const r of ch.refs) console.log(`- ${r.label} ${r.url}${r.note ? ' (' + r.note + ')' : ''}`);
console.log('## lessons', ch.lessons.map(l => `${l} ${FL.school.lesson(l)?.title}`).join(', '));
