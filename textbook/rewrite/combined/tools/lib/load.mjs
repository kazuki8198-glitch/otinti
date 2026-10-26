// tools/lib/load.mjs — loads FLIGHT LAB's book into a fresh vm context, the way the pages do (each plain script
// attaches itself to FL), so the checks read the same book the three products read. Nothing is written.
//  - the module list is TEXTBOOK's FL_MODULES (textbook/build.mjs: FLIGHT LAB's one list, flight-lab/src/modules.mjs, less
//    what TEXTBOOK leaves out — the fullest list of the book's files, in order), then quiz.js and quiz-jcab.js if present.
//    There is no list of its own here (DESIGN 6.2 rule 7): if textbook/build.mjs cannot be read, the shared list's book
//    files are used;
//  - a draft chapter file (textbook/rewrite/combined/drafts/<id>.js) can be run after the book: a chapter it adds with
//    an id that is already in the book replaces that chapter in place (so a rewrite of an existing chapter is checked
//    where it will stand).
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, FL_SRC } from './paths.mjs';

export const EXTRA = ['quiz.js', 'quiz-jcab.js'];

// the shared list (W02: flight-lab/src/modules.mjs, with modulePath for names outside src/), when it is there
async function shared() {
  const f = path.join(FL_SRC, 'modules.mjs');
  if (!fs.existsSync(f)) return null;
  try { const m = await import(pathToFileURL(f).href); return Array.isArray(m.MODULES) ? m : null; } catch (e) { console.error(`[load] modules.mjs: ${e.message}`); return null; }
}
let SHARED;
const fileOf = m => (SHARED && SHARED.modulePath ? SHARED.modulePath(m) : path.join(FL_SRC, m));

export async function moduleList() {
  SHARED ??= (await shared()) || false;
  try {
    const m = await import(pathToFileURL(path.join(ROOT, 'textbook', 'build.mjs')).href);
    if (Array.isArray(m.FL_MODULES) && m.FL_MODULES.length) return { list: [...m.FL_MODULES], from: 'textbook/build.mjs FL_MODULES' + (SHARED ? ' (flight-lab/src/modules.mjs)' : '') };
  } catch (e) { console.error(`[load] textbook/build.mjs: ${e.message}`); }
  if (SHARED) return { list: SHARED.MODULES.filter(m => /^(physics|avionics|sanford-course|school|syllabus|book-[^/]*)\.js$/.test(m)), from: 'flight-lab/src/modules.mjs (book files: textbook/build.mjs not readable)' };
  throw new Error('[load] neither textbook/build.mjs FL_MODULES nor flight-lab/src/modules.mjs could be read');
}

function makeContext() {
  const quiet = { log() {}, info() {}, debug() {}, warn: (...a) => console.error('[book]', ...a), error: (...a) => console.error('[book]', ...a) };
  const ctx = vm.createContext({ console: quiet, URL, TextEncoder, TextDecoder, setTimeout, clearTimeout });
  ctx.globalThis = ctx;
  return ctx;
}

// loadBook({ drafts: [file…], extra: true }) → { FL, modules, from, unlisted, drafts: [{ file, added: [chapterId…], replaced: [chapterId…], error }] }
export async function loadBook({ drafts = [], extra = true } = {}) {
  const { list, from } = await moduleList();
  const ctx = makeContext();
  const loaded = [];
  for (const m of list) {
    const f = fileOf(m);
    if (!fs.existsSync(f)) continue;
    vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: m });
    loaded.push(m);
  }
  if (extra) for (const m of EXTRA) {
    const f = fileOf(m);
    if (loaded.includes(m) || !fs.existsSync(f)) continue;
    try { vm.runInContext(fs.readFileSync(f, 'utf8'), ctx, { filename: m }); loaded.push(m); } catch (e) { console.error(`[load] ${m}: ${e.message}`); }
  }
  const FL = ctx.FL;
  const out = [];
  for (const file of drafts) {
    const rec = { file, added: [], replaced: [], error: null };
    const B = FL.book, orig = B.add;
    B.add = ch => {
      const i = B.CHAPTERS.findIndex(c => c.id === ch.id);
      if (i >= 0) { if (!ch.before && B.CHAPTERS[i + 1]) ch.before = B.CHAPTERS[i + 1].id; B.CHAPTERS.splice(i, 1); rec.replaced.push(ch.id); }
      rec.added.push(ch.id);
      return orig(ch);
    };
    try { vm.runInContext(fs.readFileSync(file, 'utf8'), ctx, { filename: path.basename(file) }); } catch (e) { rec.error = e.stack || String(e); }
    B.add = orig;
    out.push(rec);
  }
  const unlisted = fs.readdirSync(FL_SRC).filter(f => /^(book-.*|quiz.*)\.js$/.test(f) && !loaded.includes(f));
  const notShared = SHARED ? fs.readdirSync(FL_SRC).filter(f => /^(book-.*|quiz.*)\.js$/.test(f) && !SHARED.MODULES.includes(f)) : [];
  return { FL, ctx, modules: loaded, from, unlisted, notShared, drafts: out };
}

// the raw section HTML before {ch:} is turned into 第 N 章 (to find hand-written chapter numbers)
export function rawHtml(sec) { return String(typeof sec.h === 'function' ? sec.h() : sec.h); }
