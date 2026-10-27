// TEXTBOOK — build.mjs
// Builds ONE HTML file that opens with a double click (file://) and works offline: FLIGHT LAB's textbook, nothing else.
//  - FLIGHT LAB's plain-script modules, read from ../flight-lab/src (not copied: the textbook stays FLIGHT LAB's),
//  - this page's own scripts (src/render.js: chapters and sections → HTML strings; src/page.js: the DOM) and CSS.
// Output: outputs/TEXTBOOK.html (written only by `npm run build`; the tests call build({ write: false })).
// The same sources give the same bytes (no date, no git hash).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { without, modulePath } from '../flight-lab/src/modules.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, 'src'), OUT = path.join(here, 'outputs');
export const FL_SRC = path.join(here, '..', 'flight-lab', 'src');
// the textbook and what it needs: FLIGHT LAB's one list of modules (flight-lab/src/modules.mjs), in its order (physics.js
// first: book-1/3/4/5 use it while loading; book-photos.js after book-core.js: the photos, as data URLs, for bk.photo;
// school.js and syllabus.js for the lessons' names), less what this page does not read:
export const FL_LEAVE_OUT = Object.freeze({
  'kiso/kiso-data.js': 'the basic course (the original, kept as it is): FLIGHT LAB\'s own page; the combined book takes from it by rewriting, not by loading it',
  'kiso-errata.js': 'what FLIGHT LAB\'s basic course page shows over the original: TEXTBOOK has no basic course page',
  'quiz.js': 'FLIGHT LAB\'s ground-school tests (a page of the app)',
  'radio.js': 'FLIGHT LAB\'s English radio practice (a page of the app)',
  'ui.js': 'FLIGHT LAB\'s app: its controls and icons',
  'acmesh.js': 'FLIGHT LAB\'s app: the aircraft\'s 3D description',
  'scene.js': 'FLIGHT LAB\'s app: the 3D view',
  'google3d.js': 'FLIGHT LAB\'s app: Google\'s 3D tiles',
  'pages.js': 'FLIGHT LAB\'s app: its screens',
  'app.js': 'FLIGHT LAB\'s app: its start',
});
export const FL_MODULES = without(FL_LEAVE_OUT, 'TEXTBOOK (textbook/build.mjs)');
export const PAGE_SCRIPTS = ['render.js', 'page.js'];
export const OUT_FILE = path.join(OUT, 'TEXTBOOK.html');

const read = f => fs.readFileSync(f, 'utf8');
// inline scripts must not contain "</script" (it would end the element)
const safeJs = s => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');
const safeCss = s => s.replace(/<\/style/gi, '<\\/style');

export function build({ quiet = false, write = false } = {}) {
  const scripts = [
    ...FL_MODULES.map(m => `<script>\n/* ---- FLIGHT LAB: ${m} ---- */\n${safeJs(read(modulePath(m)))}\n</script>`),
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
