// TEXTBOOK — build.mjs
// Builds ONE HTML file that opens with a double click (file://) and works offline: FLIGHT LAB's textbook, nothing else.
//  - FLIGHT LAB's plain-script modules, read from ../flight-lab/src (not copied: the textbook stays FLIGHT LAB's),
//  - this page's own scripts (src/render.js: chapters and sections → HTML strings; src/page.js: the DOM) and CSS.
// Output: outputs/TEXTBOOK.html (written only by `npm run build`; the tests call build({ write: false })).
// The same sources give the same bytes (no date, no git hash).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs');
export const FL_SRC = path.join(here, '..', 'flight-lab', 'src');
// the textbook and what it needs, in this order: physics.js first (book-1/3/4/5 use it while loading); book-2.js
// (wx, law, hf) before book-comm.js (its chapters go `before: 'hf'`); book-photos.js after book-core.js (the photos, as
// data URLs: bk.photo); school.js and syllabus.js for the lessons' names
export const FL_MODULES = ['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js', 'book-figs.js', 'book-core.js', 'book-photos.js', 'book-1.js', 'book-2.js', 'book-comm.js', 'book-3.js', 'book-4.js', 'book-5.js'];
export const PAGE_SCRIPTS = ['render.js', 'page.js'];
export const OUT_FILE = path.join(OUT, 'TEXTBOOK.html');

const read = f => fs.readFileSync(f, 'utf8');
// inline scripts must not contain "</script" (it would end the element)
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const safeCss = s => s.replace(/<\/style/gi, '<\\/style');

export function build({ quiet = false, write = false } = {}) {
  const scripts = [
    ...FL_MODULES.map(m => `<script>\n/* ---- FLIGHT LAB: ${m} ---- */\n${safeJs(read(path.join(FL_SRC, m)))}\n</script>`),
    ...PAGE_SCRIPTS.map(m => `<script>\n/* ---- TEXTBOOK: ${m} ---- */\n${safeJs(read(path.join(SRC, m)))}\n</script>`),
  ].join('\n');
  let html = read(path.join(SRC, 'index.html'));
  html = html.replace(/<!--BUILD:CSS-->[\s\S]*?<!--\/BUILD:CSS-->/, () => `<style>\n${safeCss(read(path.join(SRC, 'style.css')))}</style>`);
  html = html.replace(/<!--BUILD:JS-->[\s\S]*?<!--\/BUILD:JS-->/, () => scripts);
  const bytes = Buffer.byteLength(html);
  if (write) {
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(OUT_FILE, html);
    if (!quiet) console.log(`wrote ${path.relative(here, OUT_FILE)} (${bytes.toLocaleString('en-US')} bytes)`);
  }
  return { out: OUT_FILE, html, bytes };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) build({ write: true });
