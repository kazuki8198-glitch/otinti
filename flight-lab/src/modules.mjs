// FLIGHT LAB — src/modules.mjs: the one list of FLIGHT LAB's plain-script modules, in the order a page loads them
// (each attaches itself to globalThis.FL; a later one may use an earlier one while it loads). The page does not load this
// file: the builds and the tests read it (textbook/rewrite/combined/DESIGN.md 6.2, rule 7).
//   flight-lab/build.mjs      FLIGHT LAB's page: every module (src/index.html, the dev page, lists the same <script src>)
//   flight-lab/test/load.mjs  FLIGHT LAB's Node tests: the list less NODE_LEAVE_OUT
//   textbook/build.mjs        TEXTBOOK's page (FL_MODULES): the list less its FL_LEAVE_OUT
//   cadet/build.mjs           CADET's page (FL_MODULES), and its tests (cadet/test/helpers/fl.mjs): the list less its FL_LEAVE_OUT
// A new file goes in here once, in its place in the order. A product that must not read it says so in its own leave-out
// list, with the reason. Each product's tests check that what it reads is this list less what it leaves out.
// Names are relative to src/, except the basic course's data (kiso/kiso-data.js, relative to flight-lab/: kept as it is).
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const FL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const MODULES = Object.freeze([
  'physics.js',          // the flight model (the textbook's numbers use it while loading)
  'avionics.js',         // the G1000-type displays
  'sanford-course.js',   // the Sanford material
  'school.js',           // the lessons' engine and the learning record
  'syllabus.js',         // the syllabus (stages and lessons)
  'book-figs.js',        // the textbook's figures (SVG) and calculators
  'book-core.js',        // the textbook's frame: parts, references, writing helpers, FL.book
  'book-terms.js',       // the table of terms (FL.terms: one concept, one name; DESIGN 3.5). Data only
  'book-jur.js',         // the US–Japan table (FL.jur, DESIGN 3.4): bk.jur・bk.us・bk.jp・bk.same draw from it. Data only
  'book-photos.js',      // the textbook's photos (data URLs, after book-core.js: bk.photo)
  'book-photos-k.js',    // the basic course's photos the book uses (FL.bookPhotosK, byte for byte; src from FL.kiso.photos when the build drops its bytes: build.mjs)
  'book-1.js',           // the chapters (book-2.js before book-comm.js: its chapters go before 'hf')
  'book-0.js',           // the front part p0 (序部, FL.book.addPart) and its new chapters: after book-1.js (they go before 'aero'), before book-5.js (whose 'sim' closes the front part)
  'book-2.js',
  'book-comm.js',
  'book-3.js',
  'book-4.js',
  'book-5.js',
  'book-gates.js',       // the parts' summary chapters g1〜g7 (each before the next part's first chapter) and the page「JCAB 学科の道」 (FL.book.jcabRoadHtml): after the parts' chapters (book-7.js when it comes: DESIGN 3.1)
  'kiso/kiso-data.js',   // the basic course (パイロット基礎教材 第 3 版, the original: never edited here)
  'kiso-errata.js',      // what the basic course's page shows over the original: the corrections and the written questions rebuilt (FLIGHT LAB only). Data only
  'quiz.js',             // the ground-school test banks
  'radio.js',            // English radio
  'ui.js',               // the app: its controls and icons
  'acmesh.js',           // the aircraft's 3D description (pure data)
  'scene.js',            // the 3D view
  'google3d.js',         // Google's 3D tiles (optional)
  'pages.js',            // the screens
  'app.js',              // the app's start
]);
// the flight model, the displays, the Sanford material, the school and the syllabus: the list's head
export const CORE = Object.freeze(['physics.js', 'avionics.js', 'sanford-course.js', 'school.js', 'syllabus.js']);
if (CORE.some((m, i) => MODULES[i] !== m)) throw new Error('modules.mjs: CORE must be the head of MODULES');
if (new Set(MODULES).size !== MODULES.length) throw new Error('modules.mjs: a module is listed twice');

// where a module's file is
export const modulePath = m => path.join(FL_ROOT, m.includes('/') ? m : path.join('src', m));

// the list less what a product leaves out ({ name: reason }), in the list's order. A name that is not in the list (a
// file renamed or gone) is an error, so a leave-out list cannot go stale without a word
export function without(leaveOut, who) {
  const stray = Object.keys(leaveOut).filter(m => !MODULES.includes(m));
  if (stray.length) throw new Error(`${who} leaves out ${stray.join(', ')}: not in flight-lab/src/modules.mjs`);
  const noReason = Object.keys(leaveOut).filter(m => typeof leaveOut[m] !== 'string' || !leaveOut[m].trim());
  if (noReason.length) throw new Error(`${who} leaves out ${noReason.join(', ')} without a reason`);
  return Object.freeze(MODULES.filter(m => !Object.hasOwn(leaveOut, m)));
}
