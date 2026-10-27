// textbook/rewrite/tools/counts.mjs [srcDir] — prints the book's fixed numbers (as textbook/test/load.mjs COUNTS) for the
// FLIGHT LAB sources in srcDir (default: ../../../flight-lab/src), so COUNTS can be updated after a chapter is rewritten.
// The modules are TEXTBOOK's (textbook/build.mjs FL_MODULES: FLIGHT LAB's one list less what TEXTBOOK leaves out).
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
import { FL_MODULES as MODS } from '../../build.mjs';
const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(process.argv[2] || path.join(here, '../../../flight-lab/src'));
const ctx = vm.createContext({ console, URL }); ctx.globalThis = ctx;
for (const m of MODS) if (fs.existsSync(path.join(SRC, m))) vm.runInContext(fs.readFileSync(path.join(SRC, m), 'utf8'), ctx, { filename: m });
const BK = ctx.FL.book, secs = BK.CHAPTERS.flatMap(c => c.secs), sum = k => BK.CHAPTERS.reduce((a, c) => a + (c[k] || []).length, 0);
const html = secs.map(s => BK.html(s)).join('\n');
const c = { parts: BK.PARTS.length, chapters: BK.CHAPTERS.length, secs: secs.length, quiz: sum('quiz'), terms: sum('terms'), examples: sum('examples'), cautions: sum('cautions'), refs: sum('refs'), lessons: sum('lessons'),
  figs: (html.match(/<figure class="bk-fig"><svg /g) || []).length, photos: (html.match(/<figure class="bk-photo"/g) || []).length, calcs: (html.match(/data-calc="/g) || []).length,
  simTags: (html.match(/<div class="bk-sim">[\s\S]*?<\/div>/g) || []).reduce((a, b) => a + (b.match(/data-lesson=/g) || []).length, 0), details: (html.match(/<details class="bk-q">/g) || []).length };
console.log('export const COUNTS = ' + JSON.stringify(c).replace(/"(\w+)":/g, '$1: ').replace(/,/g, ', ') + ';');
