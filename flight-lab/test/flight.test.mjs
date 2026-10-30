// FLIGHT LAB — build, flight model, school, record and textbook tests (node --test).
// The scripted test pilot (bot.mjs) flies the lessons with the same inputs a keyboard pilot has.
import test from 'node:test';
import assert from 'node:assert/strict';
import { load, NODE_MODULES, NODE_LEAVE_OUT, CORE } from './load.mjs';
import { MODULES, modulePath, without, FL_ROOT } from '../src/modules.mjs';
import { makeBot, runLesson } from './bot.mjs';
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build, MAX_BYTES, moduleText, KISO_PHOTOS_FROM_ORIGINAL } from '../build.mjs';
const FL = load(...NODE_MODULES);   // src/modules.mjs less what Node leaves out (test/load.mjs)
const P = FL.physics, A = FL.avionics, SC = FL.school, SY = FL.syllabus, SF = FL.sanford, BK = FL.book, QZ = FL.quiz;
const DT = 1 / 120, clamp = P.clamp;
const run = (s, sec, fn) => { for (let i = 0; i < sec * 120; i++) { if (fn) fn(s); P.step(s, DT); } return s; };
const memStore = () => { const m = new Map(); return { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), get length() { return m.size; }, key: i => [...m.keys()][i], dump: () => [...m.values()].join('\n') }; };
const flightLessons = () => SC.lessonOrder().map(id => SC.lesson(id)).filter(l => l.steps);
// hands for the physics tests: the pitch hold (as W / S leave it) flown to a speed, the wings held level (A / D)
const hands = (s, kt, bank = 0) => { if (s.base == null) s.base = s.out.pitch; const e = s.out.ias - kt; s.base = clamp(s.base + e * 0.05 * DT, -15, 18); s.keyHold = true; s.pRate = 0; s.pTgt = clamp(s.base + 0.35 * e, -15, 18); s.rIn = clamp(0.045 * (bank - s.out.bank) - 0.012 * (-s.w[2] / P.DEG), -1, 1); };

// ------------------------------------------------------------------ the built single file
const B = build({ quiet: true });
const html = B.html;
// text: the page without the basic course's photos (base64): random letters can spell anything, so the placeholder
// and key checks read the rest
const text = html.replace(/data:image\/webp;base64,[A-Za-z0-9+/=]+/g, 'data:image/webp;base64,');

test('build: one HTML file, no external scripts or stylesheets, everything inline; the only remote host is Google\'s tile host', () => {
  assert.doesNotMatch(html, /<script[^>]*\bsrc\s*=/i, 'no <script src>');
  assert.doesNotMatch(html, /<link[^>]*rel=["']?stylesheet/i, 'no external stylesheet');
  assert.doesNotMatch(html, /import\s*\(\s*['"]https?:/, 'no remote import()');
  assert.doesNotMatch(html, /importScripts\s*\(/, 'no importScripts from the network');
  assert.ok((html.match(/<script>/g) || []).length >= 15, 'inline scripts');
  assert.match(html, /FL\.DRACO_WASM_B64 = "AGFzbQ/, 'the Draco WebAssembly is embedded (base64 of \\0asm)');
  const fetchHosts = [...html.matchAll(/fetch\(\s*['"`](https?:\/\/[^/'"`]+)/g)].map(m => m[1]);
  assert.ok(fetchHosts.every(h => h === 'https://tile.googleapis.com'), JSON.stringify(fetchHosts));
});

test('build: no placeholders, no template markers, no API keys', () => {
  for (const re of [/\bTODO\b/, /\bFIXME\b/, /\bTBD\b/, /lorem ipsum/i, /PLACEHOLDER/, /<!--BUILD:/, /\{\{\s*\w+\s*\}\}/, /XXX/]) assert.doesNotMatch(text, re, String(re));
  assert.doesNotMatch(text, /sk-ant-api/); assert.doesNotMatch(text, /AIza[0-9A-Za-z_-]{30,}/);
});

test('build: the displays, the instructor panel, the control strip and the required notices are on the page', () => {
  for (const id of ['pfd', 'mfd', 'audio', 'view3d', 'sch-panel', 'ctl-strip', 'keyhelp', 'menu', 'school', 'debrief', 'page', 'ack', 'gattr']) assert.match(html, new RegExp(`id="${id}"`), id);
  assert.match(html, /本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH\/AFM、SOP、航空法規を優先してください。/);
  assert.match(html, /G1000型配置と基本概念を学ぶ教材/); assert.match(html, /NOT FOR NAVIGATION/); assert.match(html, /模式図/); assert.match(html, /正式な飛行日誌ではありません/);
  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]), seen = new Set(), dup = [];
  for (const i of ids) { if (seen.has(i)) dup.push(i); seen.add(i); }
  assert.deepEqual(dup, [], 'no duplicate element ids');
});

// ------------------------------------------------------------------ the basic course (kiso/: Japan's aviation law, a separate book)
// kiso/kiso-data.js is generated (never edited here): read in its own context, as the page reads it (window.FL.kiso),
// and copied into this one (plain data: the other context's arrays are not this one's for deepEqual)
const KISO_JS = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'kiso', 'kiso-data.js');
const KZ = (() => { const box = {}; box.window = box; vm.runInNewContext(fs.readFileSync(KISO_JS, 'utf8'), box, { filename: 'kiso-data.js' }); return JSON.parse(JSON.stringify(box.FL.kiso)); })();

test('build: the basic course (kiso/kiso-data.js) inline as it is, after the textbook and before the tests', () => {
  const at = k => html.indexOf(k);
  assert.ok(at('/* ---- book-5.js ---- */') < at('/* ---- kiso/kiso-data.js ---- */') && at('/* ---- kiso/kiso-data.js ---- */') < at('/* ---- quiz.js ---- */'), 'script order');
  assert.ok(html.includes(fs.readFileSync(KISO_JS, 'utf8')), 'kiso-data.js unchanged in the page');
});

// the basic course's photos that the book uses (book-photos-k.js, W22): while the page carries the original
// (kiso-data.js), the build leaves out the file's own copy of the photos and each one's src is read from FL.kiso.photos
// — the same bytes, not twice in the page (textbook/rewrite/combined/DESIGN.md 8.2). TEXTBOOK carries the whole file.
test('build: the basic course\'s photos the book uses (book-photos-k.js) are in the page once, read from FL.kiso.photos (DESIGN 8.2)', () => {
  const PK_JS = path.join(FL_ROOT, 'src', 'book-photos-k.js');
  const block = html.match(/\/\* ---- book-photos-k\.js ---- \*\/\n([\s\S]*?)\n<\/script>/)[1];
  assert.ok(block.includes('/*SRC*/{}/*/SRC*/'), 'its SRC block is left out');
  assert.equal((block.match(/data:image\/webp;base64,/g) || []).length, 0, 'no photo bytes of its own');
  assert.ok(Buffer.byteLength(block) < 120 * 1024, `${Buffer.byteLength(block)} bytes`);
  assert.equal(block, moduleText('book-photos-k.js'));
  // as the page runs them (kiso-data.js after it, read when a photo is drawn), and the whole file on its own
  const page = {}; page.window = page;
  vm.runInNewContext(block, page, { filename: 'book-photos-k.js (page)' }); vm.runInNewContext(fs.readFileSync(KISO_JS, 'utf8'), page, { filename: 'kiso-data.js' });
  const whole = {}; vm.runInNewContext(fs.readFileSync(PK_JS, 'utf8'), whole, { filename: 'book-photos-k.js' });
  const K = page.FL.bookPhotosK, W = whole.FL.bookPhotosK;
  assert.ok(Object.keys(K).length >= 51);
  assert.deepEqual(Object.keys(K), Object.keys(W));
  for (const [id, p] of Object.entries(K)) {
    assert.ok(p.kiso && KZ.photos[p.kiso], `${id}: a photo of the original`);
    assert.ok(p.src.startsWith('data:image/webp;base64,') && p.src === KZ.photos[p.kiso] && p.src === W[id].src, `${id}: the same bytes`);
  }
  assert.equal(KISO_PHOTOS_FROM_ORIGINAL, MODULES.includes('kiso/kiso-data.js'));
});

test('basic course: chapters 0–13, the counts its README gives, every figure and photo placed once with its caption and credit, apart from the textbook', () => {
  assert.deepEqual(KZ.chapters.map(c => c.no), [...Array(14).keys()]);
  assert.deepEqual(KZ.chapters.map(c => c.qa.length), [20, 24, 24, ...Array(11).fill(28)]);
  assert.equal(KZ.chapters.reduce((a, c) => a + c.glossary.length, 0), 555);
  const figs = KZ.chapters.flatMap(c => c.figures), photos = KZ.chapters.flatMap(c => c.photos), used = { fig: [], photo: [] };
  assert.equal(figs.length, 161); assert.equal(photos.length, 85);
  assert.deepEqual(Object.keys(KZ.figs).sort(), figs.map(f => f.id).sort()); assert.deepEqual(Object.keys(KZ.photos).sort(), photos.map(p => p.id).sort());
  const book = new Set(BK.CHAPTERS.flatMap(c => [c.id, ...c.secs.map(s => s.id)])), ids = new Set();
  for (const c of KZ.chapters) {
    assert.match(c.id, /^kiso\d\d$/); assert.ok(c.label && c.title && c.sections.length && c.sourcesHtml && c.photoCreditsHtml, c.id);
    for (const s of c.sections) {
      assert.ok(s.id.startsWith(c.id + '.') && !ids.has(s.id) && !book.has(s.id), s.id); ids.add(s.id); assert.ok(s.title && s.html, s.id);
      for (const m of s.html.matchAll(/<div class="kiso-(fig|photo)" data-\1="([^"]+)"><\/div>/g)) used[m[1]].push(m[2]);
    }
    for (const q of c.qa) assert.ok(Number.isInteger(q.n) && q.q && q.a, `${c.id} q${q.n}`);
    assert.ok(c.glossaryHeader.length >= 2 && c.glossary.every(r => r.length === c.glossaryHeader.length && r[0]), `${c.id} glossary`);
  }
  assert.deepEqual(used.fig.sort(), figs.map(f => f.id).sort(), 'every figure placed once');
  assert.deepEqual(used.photo.sort(), photos.map(p => p.id).sort(), 'every photo placed once');
  for (const f of figs) { assert.match(KZ.figs[f.id], /^<svg[\s\S]*<\/svg>$/, f.id); assert.ok(f.caption, f.id); }
  for (const p of photos) { assert.match(KZ.photos[p.id], /^data:image\/webp;base64,UklGR/, p.id); assert.ok(p.caption && p.w && p.h, p.id); assert.match(p.credit, /CC BY|CC0|パブリックドメイン|Attribution/, `${p.id} credit`); }
  // shown with innerHTML: only the tags its README names, no scripts, no handlers
  const all = KZ.chapters.flatMap(c => [...c.sections.map(s => s.html), ...c.qa.flatMap(q => [q.q, q.a]), ...c.glossaryHeader, ...c.glossary.flat(), c.sourcesHtml, c.photoCreditsHtml, ...c.figures.map(f => f.caption), ...c.photos.flatMap(p => [p.caption, p.credit])]).join('\n');
  assert.deepEqual([...new Set([...all.matchAll(/<([a-z0-9]+)/g)].map(m => m[1]))].filter(t => !['p', 'b', 'sub', 'sup', 'a', 'br', 'ul', 'li', 'h4', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'div'].includes(t)), []);
  for (const x of [all, ...Object.values(KZ.figs)]) assert.doesNotMatch(x, /<script|<style|<iframe|<foreignObject|\son[a-z]+\s*=|javascript:/i);
  assert.ok(BK.CHAPTERS.every(c => !/^kiso/.test(c.id)), 'the textbook has no basic-course chapter');
});

test('basic course progress: its own fields (kisoRead, kisoQa) through the sanitiser, the export and the merge, apart from the textbook\'s read', () => {
  const p = SC.sanitizeProgress({ read: ['aero.forces'], kisoRead: ['kiso05.11', 'kiso05.11', 'aero.forces', 'kiso<x>', 5], kisoQa: ['kiso05.q1', 'kiso' + 'x'.repeat(80)] });
  assert.deepEqual(p.read, ['aero.forces']); assert.deepEqual(p.kisoRead, ['kiso05.11']); assert.deepEqual(p.kisoQa, ['kiso05.q1']);
  assert.deepEqual([SC.sanitizeProgress({}).kisoRead, SC.sanitizeProgress({}).kisoQa], [[], []]);
  const j = SC.importJSON(SC.exportJSON([], p)); assert.deepEqual([j.progress.kisoRead, j.progress.kisoQa], [['kiso05.11'], ['kiso05.q1']]);
  const m = SC.mergeProgress(p, { kisoRead: ['kiso00.cover'], kisoQa: ['kiso05.q1', 'kiso00.q2'] });
  assert.deepEqual([m.read, m.kisoRead, m.kisoQa], [['aero.forces'], ['kiso05.11', 'kiso00.cover'], ['kiso05.q1', 'kiso00.q2']]);
  // the whole course fits: every section and every question
  const secs = KZ.chapters.flatMap(c => c.sections.map(s => s.id)), qa = KZ.chapters.flatMap(c => c.qa.map(q => `${c.id}.q${q.n}`));
  const all = SC.sanitizeProgress({ kisoRead: secs, kisoQa: qa });
  assert.deepEqual([all.kisoRead.length, all.kisoQa.length], [secs.length, 376]);
});

// The original is kept byte for byte (textbook/rewrite/combined/DESIGN.md 5 章の基準 10, 6.2 rule 12): kiso-data.js and
// every file of kiso/ by sha256 (the course as it came: commit c454d94), and git sees no change in the folder.
const KISO_DATA_SHA256 = '7f7373bf5caeffcb6ce321889c2fd4f5a5b79ed82a43000d0412949a1f2d2513';   // kiso/kiso-data.js
const KISO_FILES = 264, KISO_ALL_SHA256 = 'f49dc4e969ab11baa095277b92c8dbf5a358720a82874fdd24d80644ed7c317c';   // "sha256  path" lines, sorted
const KISO_GIT_TREE = 'f2038799cb0467ffe607f9966060bae30064b234';   // git's tree of flight-lab/kiso at c454d94
test('basic course: the original (kiso/) is kept byte for byte — kiso-data.js and every file by sha256, and git sees no change', async t => {
  const { createHash } = await import('node:crypto'), { execFileSync } = await import('node:child_process');
  const sha = b => createHash('sha256').update(b).digest('hex'), dir = path.join(FL_ROOT, 'kiso'), files = [];
  assert.equal(sha(fs.readFileSync(KISO_JS)), KISO_DATA_SHA256, 'kiso/kiso-data.js');
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else files.push(p); } };
  walk(dir);
  files.sort();
  assert.equal(files.length, KISO_FILES, 'the number of files');
  assert.equal(sha(files.map(f => `${sha(fs.readFileSync(f))}  ${path.relative(dir, f).split(path.sep).join('/')}`).join('\n') + '\n'), KISO_ALL_SHA256, 'every file of kiso/');
  let tree = null;
  try { tree = execFileSync('git', ['rev-parse', 'HEAD:./kiso'], { cwd: FL_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { /* not a git checkout */ }
  if (tree === null) { t.diagnostic('git not available: the sha256 checks above stand alone'); return; }
  assert.equal(tree, KISO_GIT_TREE, 'the committed folder');
  assert.equal(execFileSync('git', ['status', '--porcelain', '--', 'kiso'], { cwd: FL_ROOT, encoding: 'utf8' }).trim(), '', 'git sees a change in kiso/');
});

// kiso-errata.js (FL.kisoErrata): what the basic course's page shows over the original. Read in a context of its own (the
// shared module list is the integrator's to change); results are copied into this context (plain data) to compare.
const KE = (() => { const box = {}; vm.runInNewContext(fs.readFileSync(path.join(FL_ROOT, 'src', 'kiso-errata.js'), 'utf8'), box, { filename: 'kiso-errata.js' }); return box.FL.kisoErrata; })();
const plainCopy = x => JSON.parse(JSON.stringify(x));
const strayB = h => /<\/b>/.test(h) && !/<b>/.test(h.split('</b>')[0]);   // a </b> with no <b> before it

test('basic course: the written questions rebuilt from each chapter\'s question pages — 376 with the same numbers and record keys, every heading whole, the groups\' words back in place, every line of the pages kept', () => {
  assert.equal(KZ.chapters.reduce((a, c) => a + c.qa.filter(q => strayB(q.q)).length, 0), 188, 'the data as it is (c.qa): 188 headings start with a stray </b>');
  const text = h => h.replace(/<[^>]+>/g, '').replace(/\s+/g, '');
  // a question's number in the original's forms: alone (dropped: the page shows 問 N) or before its title or text
  const NUM = [/^<p><b>問題 \d+<\/b><\/p>$/, /^<p><b>問 \d+<\/b><\/p>$/];
  const OFF = [[/^<p><b>\d{1,2} (.+)<\/b><\/p>$/, '<p><b>$1</b></p>'], [/^<p><b>\d+\.　<\/b>/, '<p>'], [/^<p><b>問 \d+　<\/b>/, '<p>'], [/^<p><b>問 \d+<\/b>　/, '<p>'], [/^<p>問 \d+　/, '<p>']];
  let n = 0;
  for (const c of KZ.chapters) {
    const R = plainCopy(KE.questions(c));
    assert.ok(R && Array.isArray(R.items), c.id);
    const qs = R.items.filter(i => i.kind === 'q');
    assert.deepEqual(qs.map(q => q.n), c.qa.map(q => q.n), `${c.id}: the numbers`);
    assert.deepEqual(qs.map(q => q.key), c.qa.map(q => `${c.id}.q${q.n}`), `${c.id}: the record keys`);
    assert.ok(R.items[0].kind === 'group' && R.items[0].h, `${c.id}: the first group's heading`);
    for (const q of qs) {
      assert.ok(!strayB(q.q) && !strayB(q.a), `${q.key}: a stray </b>`);
      // the words are the original's: c.qa has the same text, and sometimes the next group's words after it
      const o = c.qa.find(x => x.n === q.n);
      assert.ok(text(q.q) && text(o.q).startsWith(text(q.q)), `${q.key}: the question's text`);
      assert.ok(text(q.a) && text(o.a).startsWith(text(q.a)), `${q.key}: the answer's text`);
    }
    // every line of the two pages is shown once somewhere: as written, or with the question's number taken off; the
    // answer pages' own group headings (解答と解説 …) mirror the question groups and are not repeated
    const shown = new Set(R.items.flatMap(i => (i.kind === 'group' ? [i.h && `<h4>${i.h}</h4>`, ...i.html.split('\n')]
      : [...i.q.split('\n'), ...i.a.split('\n'), ...[...i.pre, ...i.post].flatMap(x => [x.h && `<h4>${x.h}</h4>`, ...x.html.split('\n')])])).filter(Boolean));
    for (const [page, html] of [['questions', c.questionsHtml], ['answers', c.answersHtml]]) for (const line of html.split('\n').filter(l => l.trim())) {
      const ok = shown.has(line) || NUM.some(re => re.test(line)) || OFF.some(([re, to]) => re.test(line) && shown.has(line.replace(re, to))) || (page === 'answers' && /^<h4>(\d+ )?解答と解説/.test(line));
      assert.ok(ok, `${c.id} ${page}: not shown: ${line.slice(0, 60)}`);
    }
    n += qs.length;
  }
  assert.equal(n, 376);
  // DESIGN 10.2 overview K1 and aero K-1, as the data had them: the instructions of the next group back under its heading
  const k0 = plainCopy(KE.questions(KZ.chapters[0])).items, k1 = plainCopy(KE.questions(KZ.chapters[1])).items;
  assert.deepEqual(k0.filter(i => i.kind === 'group').map(i => i.h), ['17 理解確認問題　基本概念', '18 理解確認問題　数量と計算', '計算の記録', '19 理解確認問題　状況の説明']);
  assert.ok(KZ.chapters[0].qa[7].q.includes('問題 9〜14 では') && !k0.find(i => i.n === 8).q.includes('問題 9〜14 では'), 'kiso00 問 8');
  assert.ok(k0.find(i => i.kind === 'group' && i.h.startsWith('18 ')).html.includes('問題 9〜14 では'));
  assert.deepEqual(k0.find(i => i.n === 14).post.map(x => x.h), ['計算問題の確認基準']);
  assert.ok(k1.find(i => i.n === 1).q.startsWith('<p><b>翼面積の定義</b></p>') && k1.find(i => i.n === 1).a.startsWith('<p><b>投影面積、AR＝6.25</b></p>'));
  assert.deepEqual(k1.filter(i => i.kind === 'group').map(i => i.h), ['演習 1　原理と定義', '演習 2　計算と条件', '演習 3　状況判断']);
  assert.ok(!k1.find(i => i.n === 8).q.includes('本文を閉じて答えてください'), 'kiso01 問 8: the next group\'s words');
  // a chapter whose pages do not match its questions is shown from c.qa as it is (the page falls back)
  assert.equal(KE.questions({ ...KZ.chapters[5], questionsHtml: KZ.chapters[5].questionsHtml.replace('<p><b>問 28</b></p>', '') }), null);
});

test('basic course: the corrections over the original (FL.kisoErrata) — from the ledger\'s overlay rows, at places the original has, plain text with primary sources, Japanese rules as e-Gov and FL.jur have them', () => {
  const ROOT = path.join(FL_ROOT, '..'), ERR = JSON.parse(fs.readFileSync(path.join(ROOT, 'textbook/rewrite/combined/ledgers/ERRATA.json'), 'utf8')).rows;
  const items = plainCopy(KE.items), held = plainCopy(KE.HELD), kinds = plainCopy(KE.KINDS);
  assert.ok(items.length >= 20 && items.length <= 30, `${items.length} corrections (DESIGN 6.1: about 25)`);
  assert.equal(new Set(items.map(i => i.id)).size, items.length, 'ids');
  // every ledger row marked for the overlay (safety and Japanese law, DESIGN 10.2) is shown, or held with its reason
  const overlay = ERR.filter(r => r.book === 'kiso' && r.overlay).map(r => r.id), shown = new Set(items.flatMap(i => i.rows));
  for (const id of overlay) assert.ok(shown.has(id) !== Object.hasOwn(held, id), `${id}: shown, or held with its reason (not both)`);
  for (const id of shown) assert.ok(overlay.includes(id), `${id}: not an overlay row of ERRATA.json`);
  for (const [id, why] of Object.entries(held)) assert.ok(overlay.includes(id) && why.length > 40 && why.includes('〔要確認〕'), `${id}: held`);
  // the places: a section, a written question (its record key) or a chapter's sources, as the original has them
  const secs = new Set(KZ.chapters.flatMap(c => c.sections.map(s => s.id))), qkeys = new Set(KZ.chapters.flatMap(c => c.qa.map(q => `${c.id}.q${q.n}`)));
  const chs = new Set(KZ.chapters.map(c => c.id));
  for (const it of items) {
    assert.ok(kinds[it.kind], `${it.id}: kind`);
    if (it.rows.some(id => ERR.find(r => r.id === id).safety)) assert.equal(it.kind, 'safety', `${it.id}: a 〔安全〕 row`);
    assert.ok(it.at.length, it.id);
    for (const p of it.at) assert.ok(secs.has(p) || qkeys.has(p) || (/\.src$/.test(p) && chs.has(p.slice(0, -4))), `${it.id}: ${p}`);
    // plain text (the page escapes it), whole sentences
    for (const s of [it.title, it.says, ...it.fix]) assert.doesNotMatch(s, /[<>]/, `${it.id}: plain text`);
    for (const s of [it.says, ...it.fix]) assert.match(s, /。$/, `${it.id}: a sentence`);
    assert.equal(it.checked, KE.CHECKED);
    assert.ok(it.src.length && it.src.every(s => s.t && /^https:\/\//.test(s.url)), `${it.id}: its sources`);
  }
  assert.ok(KE.at('kiso08.q11').some(i => i.id === 'fuel-vfr') && KE.at('kiso11.src').length === 1 && KE.at('kiso05.11').length === 0);
  // a Japanese article in a correction is one it cites; a cited e-Gov article copied by W05 (textbook/rewrite/sources/egov)
  // is linked at the copy's version and anchor. Two may not be copied yet (read on e-Gov's API at the same versions; W37
  // adds them to the copies, and then they are checked like the rest): 航空法第 73 条 and 航空法施行規則第 199 条
  const EGOV = path.join(ROOT, 'textbook/rewrite/sources/egov/articles'), lawKey = u => (u.includes('/327AC0000000231/') ? 'kokuho' : u.includes('/327M50000800056/') ? 'kokuho-kisoku' : null);
  let copied = 0;
  const uncopied = new Set();
  for (const it of items) {
    const cited = new Set();
    for (const s of it.src.filter(s => s.url.startsWith('https://laws.e-gov.go.jp/'))) {
      const key = lawKey(s.url), num = (/At_(\d+(?:_\d+)*)$/.exec(s.url) || [])[1];
      assert.ok(key && num, `${it.id}: ${s.url}`);
      cited.add(`${key}:${num}`);
      const copy = path.join(EGOV, key, `${num}.json`);
      if (!fs.existsSync(copy)) { uncopied.add(`${key}:${num}`); assert.match(s.url, key === 'kokuho' ? /\/20251201_507AC0000000055#/ : /\/20261001_508M60000800082#/, `${it.id}: the pinned version`); continue; }
      const a = JSON.parse(fs.readFileSync(copy, 'utf8'));
      assert.equal(s.url, a.url, `${it.id}: ${a.law}${a.label} as W05's copy links it`);
      copied++;
    }
    for (const m of it.fix.join('').matchAll(/(航空法施行規則|施行規則|航空法)第 (\d+) 条(?:の (\d+))?/g)) {
      const key = m[1] === '航空法' ? 'kokuho' : 'kokuho-kisoku';
      assert.ok(cited.has(`${key}:${m[2]}${m[3] ? '_' + m[3] : ''}`), `${it.id}: ${m[0]} is not in its sources`);
    }
  }
  assert.ok(copied >= 15, `${copied} links checked against W05's copies`);
  assert.deepEqual([...uncopied].filter(k => !['kokuho-kisoku:199', 'kokuho:73'].includes(k)), [], 'e-Gov articles not in W05\'s copies');
  // the same Japanese rule as FL.jur (book-jur.js) has it: every number of the FL.jur row is in the correction
  for (const it of items) for (const id of it.jur) {
    const row = FL.jur.byId(id);
    assert.ok(row, `${it.id}: FL.jur ${id}`);
    const all = it.fix.join(' ');
    for (const num of row.jp.match(/\d[\d,]*(?:\.\d+)?/g) || []) assert.ok(all.includes(num), `${it.id}: FL.jur ${id} says ${num}`);
  }
  // every basic-course row of the ledger is in the list for the owner's Word original (DESIGN 10.2), and every correction
  // drawn over the page is named there
  const word = fs.readFileSync(path.join(ROOT, 'textbook/rewrite/combined/ERRATA-FOR-WORD.md'), 'utf8');
  for (const r of ERR.filter(r => r.book === 'kiso')) assert.ok(word.includes(`\`${r.id}\``), `ERRATA-FOR-WORD.md: ${r.id}`);
  for (const it of items) assert.ok(word.includes(`\`${it.id}\``), `ERRATA-FOR-WORD.md: ${it.id}`);
});

// ------------------------------------------------------------------ the flight model (Sorajima's, with the Archer and Seminole data)
test('physics: the Archer trimmed in level flight holds altitude and speed hands-off for a minute', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100), a0 = s.out.altTrue;
  run(s, 60);
  assert.ok(!s.crashed && Math.abs(s.out.altTrue - a0) < 100, `altitude ${s.out.altTrue.toFixed(0)} from ${a0.toFixed(0)}`);
  assert.ok(Math.abs(s.out.ias - 100) < 6, `ias ${s.out.ias}`);
  assert.ok(s.out.tas > s.out.ias, 'TAS > IAS at 3,000 ft');
});

test('physics: performance near the published training numbers (Archer Vy climb, cruise; Seminole climb and one engine at Vyse)', () => {
  const pa28 = P.newState({ aircraft: 'pa28' }), pa44 = P.newState({ aircraft: 'pa44' }), V = pa28.A.v, W = pa44.A.v;
  const climb = P.steadyState(pa28, V.y, null, { pwr: 'full', altFt: 100 });
  assert.ok(climb.fpm > 650 && climb.fpm < 900, `Archer Vy climb ${climb.fpm.toFixed(0)} fpm (teaching value ~700–800)`);
  const cruise = P.steadyState(pa28, V.cruise, 0, { altFt: 3000 });
  assert.ok(Math.abs(cruise.thr - V.cruiseThr) < 0.06 && cruise.rpm > 2250 && cruise.rpm < 2550, `cruise ${V.cruise} kt: thr ${cruise.thr.toFixed(2)} rpm ${cruise.rpm | 0}`);
  const both = P.steadyState(pa44, W.y, null, { pwr: 'full', altFt: 100 }), oei = P.steadyState(pa44, W.yse, null, { pwr: 'full', oei: true, altFt: 100 });
  assert.ok(both.fpm > 1000 && both.fpm < 1500, `Seminole both engines ${both.fpm.toFixed(0)} fpm`);
  assert.ok(oei.fpm > 180 && oei.fpm < 400, `Seminole one engine at Vyse ${oei.fpm.toFixed(0)} fpm`);
  assert.ok(oei.fpm < both.fpm * 0.3, 'one engine loses far more than half the climb (AFH: often 80 % or more)');
  // the dynamic model agrees with the estimate: full power at Vy with the pitch hold
  const s = P.placeInAir(P.newState(), 0, -40000, 2000, 354, V.y, 0, 0, 1), vs = [];
  s.opts.autoRud = true;
  run(s, 40, x => { hands(x, V.y); if (x.t > 15) vs.push(x.out.vsi); });
  const avg = vs.reduce((a, b) => a + b, 0) / vs.length, est = P.steadyState(s, V.y, null, { pwr: 'full', altFt: 2500 }).fpm;
  assert.ok(Math.abs(avg - est) < est * 0.3, `dynamic ${avg.toFixed(0)} fpm vs estimate ${est.toFixed(0)}`);
});

test('physics: rigged straight at cruise — hands and feet off for two minutes the wings stay within 5° (no roll input at all)', () => {
  for (const ac of ['pa28', 'pa44']) {
    const s = P.placeInAir(P.newState({ aircraft: ac }), 0, -40000, 3000, 354, P.newState({ aircraft: ac }).A.v.cruise);
    s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.keyHold = true; s.pTgt = P.attitude(s).pitch;
    let worst = 0; run(s, 120, x => { x.rIn = 0; worst = Math.max(worst, Math.abs(P.attitude(x).bank)); });
    assert.ok(worst < 5, `${ac}: bank reached ${worst.toFixed(1)}°`);
  }
});

test('physics: a side force on the fin rolls as well as yaws (the slipstream on the fin, the fin offset, the rudder) — no runaway left roll in a full-power climb', () => {
  const s0 = P.newState(); assert.ok(s0.AC.el.finYZ > 0.15 && s0.AC.el.finYZ < 0.4, `fin height / arm ${s0.AC.el.finYZ}`);
  const climb = (o) => {
    const s = P.placeInAir(P.newState(), 0, -40000, 2000, 354, s0.A.v.y, 4, 0, 1);
    s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.keyHold = true; s.pTgt = P.attitude(s).pitch; s.opts.autoRud = o.autoRud; s.rollHold = o.rollHold;
    const b = []; run(s, 60, (x) => { x.rIn = 0; if (Math.round(x.t * 120) % 1200 === 0) b.push(P.attitude(x).bank); });
    return b;
  };
  // the ball centred (auto rudder) and hands off: the torque and the rudder's roll still lean it left, but slowly (as in a real climb: a little right aileron)
  const free = climb({ autoRud: true, rollHold: false });
  assert.ok(free[1] < 0 && free[1] > -7, `after 10 s ${free[1].toFixed(1)}° (left, gentle)`);
  // the keyboard's bank hold (A / D released) keeps the wings level for the whole minute
  const held = climb({ autoRud: true, rollHold: true });
  assert.ok(held.every(x => Math.abs(x) < 3), `held: ${held.map(x => x.toFixed(1)).join(' ')}`);
  // and holds a 25° turn
  const t = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100); t.q = P.qFromHPB(354, P.attitude(t).pitch, 25);
  t.wind = { fromDeg: 0, kt: 0, gust: 0 }; t.keyHold = true; t.pTgt = P.attitude(t).pitch; t.opts.autoRud = true; t.rollHold = true;
  run(t, 30, x => { x.rIn = 0; }); assert.ok(Math.abs(P.attitude(t).bank - 25) < 3, `turn ${P.attitude(t).bank.toFixed(1)}°`);
});

test('physics: lateral stability — a dutch roll dies out, a 15° bank released with no rudder comes back toward level (dihedral)', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 110); s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.keyHold = true; s.pTgt = P.attitude(s).pitch;
  const beta = []; run(s, 12, x => { x.ovr = { elev: x.elev, ail: 0, rud: x.t < 0.5 ? 0.5 : 0 }; beta.push(Math.abs(x.out.beta)); });
  const early = Math.max(...beta.slice(0, 240)), late = Math.max(...beta.slice(-240));
  assert.ok(late < early * 0.2, `sideslip ${early.toFixed(1)}° → ${late.toFixed(2)}°`);
  const r = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 100); r.wind = { fromDeg: 0, kt: 0, gust: 0 }; r.keyHold = true;
  r.q = P.qFromHPB(354, P.attitude(r).pitch, 15); r.pTgt = P.attitude(r).pitch;
  run(r, 40, x => { x.rIn = 0; }); assert.ok(Math.abs(P.attitude(r).bank) < 6, `bank after 40 s ${P.attitude(r).bank.toFixed(1)}°`);
});

test('physics: the stall warning sounds at a high angle of attack before the critical angle', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 70);
  s.thr = 0; s.ovr = { elev: 0.85, ail: 0, rud: 0 }; let warned = null;
  run(s, 25, x => { x.ovr.ail = clamp(-0.05 * x.out.bank, -1, 1); if (x.out.stallWarn && warned == null) warned = x.out.alpha; });
  assert.ok(warned != null, 'warned'); assert.ok(warned < s.out.aStall, `warned at ${warned.toFixed(1)}° < ${s.out.aStall.toFixed(1)}°`);
});

test('physics: an engine failure in the Archer gives a glide near the best-glide speed (ratio about 8–11)', () => {
  const s = P.placeInAir(P.newState(), 0, -40000, 3000, 354, 76, 0, 0, 0);
  s.eng[0].failed = true; s.opts.autoRud = true; const vs = [], gs = [];
  run(s, 50, x => { hands(x, 76); if (x.t > 20) { vs.push(x.out.vsi); gs.push(x.out.gs); } });
  assert.ok(!P.engineRunning(s), 'the engine is stopped');
  const v = vs.reduce((a, b) => a + b, 0) / vs.length, g = gs.reduce((a, b) => a + b, 0) / gs.length, ratio = g * 101.3 / -v;
  assert.ok(Math.abs(s.out.ias - 76) < 8, `ias ${s.out.ias.toFixed(0)}`); assert.ok(ratio > 7 && ratio < 12, `glide ratio ${ratio.toFixed(1)} (${v.toFixed(0)} fpm)`);
});

test('physics: Seminole one engine out — the rudder needed grows as the speed falls and reaches full rudder at the red line (Vmc 56 kt, 5° bank)', () => {
  const hold = kias => {
    const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 1000, 354, kias + 10, 0, 0, 1);
    s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.thr = 1; s.ovr = { elev: 0, ail: 0, rud: 0 };
    let eI = 0, pT = s.out.pitch, drift = 0, rud = 0;
    for (let i = 0; i < 120 * 40 && !s.crashed; i++) {
      const o = s.out, tgt = i < 120 * 15 ? kias + 10 - 10 * i / (120 * 15) : kias;
      pT = clamp(pT + (o.ias - tgt) * 0.5 / 120, -10, 30); eI = clamp(eI + (pT - o.pitch) * 0.02 / 12, -1, 1);
      s.ovr.elev = clamp(0.06 * (pT - o.pitch) - 0.03 * s.w[0] / P.DEG + eI, -1, 1);
      s.ovr.ail = clamp(0.06 * (5 - o.bank) + 0.02 * s.w[2] / P.DEG, -1, 1);
      s.ovr.rud = clamp(-0.25 * P.wrap180(o.hdgTrue - 354) + 0.5 * s.w[1] / P.DEG + (s.rudNeed || 0), -1, 1);
      P.step(s, DT);
      if (i > 120 * 15) { drift = Math.max(drift, Math.abs(P.wrap180(s.out.hdgTrue - 354))); rud = Math.max(rud, Math.abs(s.ovr.rud)); }
    }
    return { drift, rud };
  };
  const h70 = hold(70), h62 = hold(62), h56 = hold(56);
  assert.ok(h70.drift < 10 && h70.rud < 0.75, `70 kt: heading held with ${h70.rud.toFixed(2)} rudder`);
  assert.ok(h62.rud > h70.rud + 0.08, `62 kt: more rudder ${h62.rud.toFixed(2)}`);
  assert.ok(h56.rud > 0.97, `56 kt: full rudder ${h56.rud.toFixed(2)} — no margin left (the red line)`);
});

test('physics: feathering the dead engine\'s propeller reduces drag (better climb or less descent at Vyse)', () => {
  const fly = feather => { const s = P.newState({ aircraft: 'pa44' }); P.placeInAir(s, 0, -40000, 4000, 354, 88, 0, 0, 1); s.gearDown = false; s.gearPos = 0; s.eng[0].failed = true; s.eng[0].feather = feather; s.opts.autoRud = true; const vs = [];
    run(s, 40, x => { hands(x, 88, s.eng[0].failed ? 3 : 0); if (x.t > 20) vs.push(x.out.vsi); }); return vs.reduce((a, b) => a + b, 0) / vs.length; };
  const f = fly(true), w = fly(false);
  assert.ok(f > w + 100, `feathered ${f.toFixed(0)} fpm vs windmilling ${w.toFixed(0)} fpm`);
});

// ------------------------------------------------------------------ the school (Sorajima's instructor engine)
test('syllabus: the lessons follow the published course order, each says what, why, how (keys) and the standard', () => {
  const L = flightLessons();
  assert.ok(L.length >= 30, `${L.length} flight lessons`);
  assert.deepEqual(SY.STAGES.map(s => s.phase), ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  for (const l of L) {
    assert.ok(l.title && l.goal && l.why && l.std && Array.isArray(l.brief) && l.brief.length >= 1, `${l.id} brief`);
    assert.ok(['pa28', 'pa44'].includes(l.aircraft), `${l.id} aircraft`);
    assert.ok(l.steps.length >= 1 && l.steps.every(S => S.say || S.checklist || S.atc || S.name), `${l.id} steps`);
    assert.ok(l.steps.some(S => S.keys), `${l.id}: at least one step says which keys to use`);
    for (const b of l.book || []) assert.ok(BK.findSection(b), `${l.id} book ${b}`);
  }
  assert.ok(L.filter(l => l.aircraft === 'pa44').length >= 5, 'Seminole lessons');
});

// the stall recovery the lessons teach is the textbook's (AFH FAA-H-8083-3C ch. 5 p. 5-16, the template of AC 120-109A
// appendix 1): the autopilot off first where there is one, then ① reduce the angle of attack ② wings level ③ power as needed
// ④ back to the desired flightpath — in a7's and a8's briefs (CADET's instructor reads them aloud: cadet/test/content.test.mjs)
// and in the recovery step's words (DESIGN 10.5, ERRATA SYNC.stall-recovery). c1 links the pre-solo check (DESIGN 6.1)
test('syllabus: the stall lessons teach the AFH recovery order, as the textbook does; c1 links the pre-solo check', () => {
  const inOrder = (s, words, what) => {
    let at = -1;
    for (const w of words) { const i = s.indexOf(w, at + 1); assert.ok(i > at, `${what}: "${w}" not after the step before it: ${s}`); at = i; }
  };
  const plain = s => s.replace(/<[^>]+>/g, '');
  const steps = ['①機首を下げて迎え角を減らす（失速警報が止まるまで）', '②翼を水平にする', '③出力', '④速度が付いたら元の経路'];
  const recovery = id => SC.lesson(id).steps.find(s => s.name === '失速からの回復');   // the name the scripted pilots look for
  for (const id of ['a7', 'a8']) {
    const l = SC.lesson(id), brief = plain(l.brief.join(''));
    inOrder(brief, ['まず自動操縦を切る', ...steps], `${id} brief`);
    assert.doesNotMatch(brief, /②フルパワー|出力（すでに全開）→ 翼水平|迎え角を減らす → 出力/, `${id}: the old order is gone`);
    assert.equal(l.book[0], 'aero.stall', `${id}: CADET still shows aero.stall's figure first`);
    assert.ok(l.book.includes('ops.stall'), `${id}: the section with the recovery figure`);
  }
  assert.match(plain(SC.lesson('a7').brief.join('')), /③出力を必要なだけ足す（ここではフルパワーでゴーアラウンド）/);
  assert.match(plain(SC.lesson('a8').brief.join('')), /③出力は必要なだけ足す（もう全開なので、全開を確かめる）/);
  // the recovery step (a7, a8 and the check c1): the same words in the same order. The grading: a secondary stall fails; the
  // altitude lost is a reference row that never fails (the owner's decision 11, DECISIONS.md; TEST-CONSTANTS.md)
  for (const id of ['a7', 'a8', 'c1']) {
    const r = recovery(id);
    assert.ok(r, `${id}: a recovery step`);
    inOrder(r.say, ['①機首を下げて迎え角を減らす', '②翼を水平', '③出力を必要なだけ', '④速度が付いたら元の経路'], `${id} say`);
    inOrder(r.g, ['W で機首を水平線付近', '失速警報が止まるまで', 'A / D で翼を水平', 'R で出力を足す', '上昇姿勢'], `${id} g`);
    const rows = r.result({ level: { k: 1 } }, { start: 3000, min: 2750, second: false });
    assert.deepEqual(rows.map(x => [x.name, x.std, x.pass]), [['回復で失った高度（参考）', '参考：合否に使わない（目安 300 ft）', true], ['二次失速', 'なし', true]], `${id}: grading`);
    assert.ok(r.result({ level: { k: 1 } }, { start: 3000, min: 2400, second: false }).every(x => x.pass), `${id}: 600 ft lost alone does not fail`);
    assert.deepEqual(r.result({ level: { k: 1 } }, { start: 3000, min: 2650, second: true }).map(x => x.pass), [true, false], `${id}: a secondary stall fails`);
  }
  // the textbook says the same order (the lesson links these sections)
  inOrder(BK.text(BK.findSection('aero.stall').sec), ['まず自動操縦を切', '迎え角を減ら', '翼を水平', '出力を必要'], 'aero.stall');
  inOrder(BK.text(BK.findSection('ops.stall').sec), ['迎え角を減ら', '翼を水平', '出力を必要', '元の飛行経路'], 'ops.stall');
  // c1 (the pre-solo check) links the section on what the check looks at, not the introduction
  assert.deepEqual(SC.lesson('c1').book, ['solo.check']);
  assert.deepEqual(SC.lesson('a4').book, ['aero.turn', 'ops.turns']);
  assert.deepEqual(SC.lesson('a5').book, ['aero.turn', 'aero.vn', 'ops.turns']);
});

// (W07d's second run, ERRATA SYNC.*: the lessons said what the textbook and the primary sources say) a7 enters the stall
// from a stabilised approach descent (AFH p. 5-17, ACS PA.VII.B); x2's brief, standard and grading say the same ±60 m (a
// teaching width, the ACS's named beside it, as the textbook ops.short shows both); m1 grades the gear at the 500 ft its standard says; m2's bank is about 2° (AFH ch. 13);
// m3 keeps the automatic rudder off with the left engine at idle; n2's estimate is the heading (wind-corrected) and the
// time on the new leg; n3's numbers come from the navaid data; i5 joins the glide slope from below; t4 and the keys name
// Shift+V; the distress call is in AIM 6-3-2's order; the ILS hint is the IFH's pitch for the path, power for the speed
test('syllabus: the lessons agree with the textbook and the sources (W07d2: a7 entry, x2 standard, m1 gear, m2 bank, m3 rudder, n2, n3, i5, t4, mayday, ILS)', () => {
  const a7 = SC.lesson('a7').steps.map(s => s.name);
  assert.deepEqual(a7.slice(0, 3), ['進入の降下を安定させる', '失速への進入', '失速からの回復']);
  assert.equal(SC.lesson('a7').steps[0].g.pwr, 'idle');
  // x2: the brief, the standard and the grading agree (±60 m); m1: 500 ft
  const x2 = SC.lesson('x2').steps.find(s => s.name === '短距離接地');
  const zone = along => x2.result({ level: { k: 1 } }, { td: { along: 300 + along, fpm: 200, cross: 0, kias: 62, onRunway: true, noseFirst: false, latV: 0, crab: 0 }, stopAlong: 300 + along + 200 }).find(r => r.name === '接地位置').pass;
  assert.deepEqual([zone(-70), zone(-55), zone(0), zone(55), zone(70)], [false, true, true, true, false]);
  for (const t of [SC.lesson('x2').std, SC.lesson('x2').brief.join('')]) assert.match(t, /±60 m|前後 60 m/);
  assert.match(SC.lesson('x2').std, /ACS/);
  const m1 = SC.lesson('m1').steps.find(s => s.name === '正の上昇・脚上げ');
  assert.equal(m1.result({ s: { gearDown: false }, last: { aglR: 550 } }, {})[0].pass, false, 'm1: UP above 500 ft fails');
  assert.equal(m1.result({ s: { gearDown: false }, last: { aglR: 450 } }, {})[0].pass, true);
  // m2: about 2° toward the live engine, 0–4°; the brief and the say
  const m2 = SC.lesson('m2'), hold = m2.steps.find(s => s.name === '片発で飛ぶ（Vyse）');
  assert.deepEqual([hold.tgt.bank[0]({ s: { eng: [{ failed: true }, {}] } }), hold.tgt.bank[1]], [2, 2]);
  assert.match(m2.brief.join(''), /約 2° バンク/); assert.doesNotMatch(m2.brief.join('') + hold.say + SC.lesson('m4').brief.join(''), /2〜5°/);
  assert.match(m2.brief.join(''), /ゆっくり<\/b>絞って/);
  assert.match(SC.lesson('m4').brief.join(''), /全部前.*脚 UP.*Identify/);
  // m3: the automatic rudder stays off though no engine has failed
  const L3 = SC.startLesson('m3', 'basic'); L3.s.opts.autoRud = true; P.step(L3.s, DT); SC.update(L3, DT);
  assert.equal(L3.s.opts.autoRud, false, 'm3: no automatic rudder');
  assert.ok(L3.s.eng.every(e => !e.failed), 'm3: the left engine idles, it has not failed');
  // n2: the heading is the course corrected for the wind, the time is on the new leg
  const L2 = SC.startLesson('n2', 'basic'), t2 = SY.estimateTruth(L2);
  assert.ok(Number.isFinite(t2.crs) && Number.isFinite(t2.gs), JSON.stringify(t2));
  const wca = ((t2.brg - t2.crs + 540) % 360) - 180;
  assert.ok(Math.abs(wca) > 0.5 && Math.abs(wca) < 15, `the wind correction ${wca}°`);
  assert.ok(Math.abs(t2.eteMin - t2.dist / t2.gs * 60) < 0.15, 'the time at the groundspeed on the new course');
  // n3: from the navaid data (the point the lesson ends at: 600 m north of the threshold)
  const vor = A.NAVAIDS.find(x => x.type === 'VOR'), pt = { n: P.LAB_RWY.n + 600, e: P.LAB_RWY.e };
  const brg = Math.round(A.trueToMag(A.neBearing(vor, pt), P.MAGVAR_W)), nm = A.neDistNm(vor, pt).toFixed(1);
  assert.ok(SC.lesson('n3').steps.at(-1).say.includes(`約 ${brg}°・${nm} NM`), SC.lesson('n3').steps.at(-1).say);
  assert.ok(SC.lesson('n3').brief.join('').includes(`約 ${nm} NM`));
  // i5: the start (17 km out) puts the localizer intercept below the glide slope
  assert.equal(SC.lesson('i5').setup.km, 17);
  // t4 and the key text: Shift+V raises the flaps one step
  assert.match(SC.lesson('t4').brief.join(''), /Shift\+V で 1 段ずつ/); assert.match(SY.KEYS.flaps, /Shift\+V＝/);
  assert.deepEqual(FL.ui ? FL.ui.parseKeys(SY.KEYS.flaps).map(p => p.keys) : [['V'], ['Shift+V']], [['V'], ['Shift+V']]);
  // the distress call: nature → intentions → position → altitude (AIM 6-3-2), and its source
  const L5 = SC.startLesson('e3', 'basic'), q = SC.ATC_Q.mayday(L5), ok = q.opts[q.ok];
  const at = w => ok.indexOf(w);
  assert.ok(at('engine failure') < at('landing LAB runway 36') && at('landing LAB runway 36') < at('of LAB') && at('of LAB') < at('feet'), ok);
  assert.match(q.why, /AIM 6-3-2/); assert.doesNotMatch(q.why, /6-3-1/);
  assert.match(SC.ATC_Q.lost(L5).why, /訓練で使われる語呂 5C/); assert.doesNotMatch(SC.ATC_Q.lost(L5).why, /AIM 6-2 の考え方/);
  // the ILS: the descent rate with the nose, the speed with the power (IFH, the textbook ifr.ils)
  assert.match(SC.HOW.ils, /機首を少し下げて降下率/); assert.match(SC.HOW.ils, /速度のずれは出力/);
  // the before-landing checklist has the published checklist's fuel pump and landing light
  const bl = SC.CHECKLISTS.before_landing.items.map(i => i[0]);
  for (const w of ['電動燃料ポンプ', '着陸灯']) assert.ok(bl.includes(w), w);
});

// (DESIGN 5 criterion 7「①〜⑦の文はテストで確かめる」, the safety review reports/safety-R1.md) the seven items, as the
// review checked them against the AFH, the AIM, the AWH and 14 CFR: ① the failed engine found by the feet and checked by
// the throttle, slowly (me.oei) ② a lost visual reference while circling: a climbing turn toward the landing runway (ifr.np,
// AIM 5-4-21; the section ifr.circle comes in R3) ③ VFR into cloud: wings level, away from terrain, a shallow 180° only
// when the way back is clear, help (hf.body, AFH ch. 18; the section emg.imc comes in R3) ④ a microburst: the nose not
// lowered too far, but the stall warning first (wx.shear) ⑤ the stall recovery (the test above) ⑥ alcohol: 91.17 and the
// AIM's 12–24 hours (hf.self; the box is FL.jur's: jur.test.mjs) ⑦ VFR fuel to the first point of intended landing
// (91.151), and Japan's law fixes no amount for a private or training VFR flight (FL.jur). With them the two lessons the
// review read: e3 slows to the best glide speed before the glide (AFH ch. 9), i2's spiral unloads before the wings level
// (AFH ch. 5); and a7's goal puts the angle of attack before the altitude (AC 120-109A)
test('textbook: the seven safety items (DESIGN 5 criterion 7) are said as the safety review checked them', () => {
  const inOrder = (s, words, what) => {
    let at = -1;
    for (const w of words) { const i = s.indexOf(w, at + 1); assert.ok(i > at, `${what}: "${w}" not after the words before it: ${s}`); at = i; }
  };
  const T = id => BK.text(BK.findSection(id).sec), plain = s => s.replace(/<[^>]+>/g, '');
  // ①
  inOrder(T('me.oei'), ['特定（Identify）', 'Dead foot, dead engine', '確認（Verify）', 'ゆっくり絞る', 'フェザー'], 'me.oei');
  // ②
  inOrder(T('ifr.np'), ['周回進入（circling approach）の途中で滑走路の目印を見失ったとき', '着陸する滑走路へ向かって上昇旋回', '進入復行のコースに乗るまで', '周回進入で滑走路の目印を見失ったら、着陸する滑走路へ向かって上昇旋回する'], 'ifr.np');
  // ③
  const body = T('hf.body');
  inOrder(body, ['VFR で雲に入ってしまったら', '翼を水平に保つ', 'バンク 10° 以下', '上昇と旋回を同時にしません', '地形が許すとき', '180° 旋回', '助けを求めます'], 'hf.body');
  inOrder(body, ['まず計器で翼を水平に保ち、地形から離れる', '180° 旋回は浅く（10° 以下）、来た方が確実に晴れて地形が許すときだけ', '管制に助けを求める'], 'hf.body: key points');
  // ④
  inOrder(T('wx.shear'), ['機首を下げすぎません', '失速警報（stall warning）が鳴ったら、警報が止まるまで迎え角（angle of attack）を減らすのが先'], 'wx.shear');
  // ⑥
  const self = T('hf.self');
  for (const w of ['14 CFR 91.17', '8 時間以内', '0.04', '12〜24 時間', 'この朝は飛びません']) assert.ok(self.includes(w), `hf.self: ${w}`);
  // ⑦
  for (const id of ['perf.fuel', 'nav.log']) assert.ok(T(id).includes('最初の着陸予定地'), `${id}: the first point of intended landing`);
  assert.ok(T('law.rules').includes('米国の VFR の燃料（91.151）は、最初の着陸予定地まで'), 'law.rules: the key point names its country');
  inOrder(FL.jur.byId('fuel.vfr').jp, ['航空運送事業の機と計器飛行方式の飛行だけ', '法定の最低量はない', '学校の規程の量'], 'FL.jur fuel.vfr');
  // the lessons
  const e3 = SC.lesson('e3'), glide = e3.steps.find(s => s.name === 'エンジン故障：滑空開始');
  assert.match(glide.say, /^エンジン停止！ 高度を保って \d+ kt まで減速し、それから滑空の姿勢/, 'e3: slow down first');
  assert.match(plain(e3.brief[0]), /高度を保って \d+ kt まで減速してから滑空の姿勢/, 'e3: the briefing');
  inOrder(plain(SC.lesson('i2').brief.join('')), ['出力を足す（減速の程度に合わせて', '機首を下げる', '翼を水平', 'パワー アイドル', '少し押して荷重を抜く', '翼を水平', '機首をゆっくり上げる'], 'i2 brief');
  assert.equal(SC.lesson('a7').goal, '着陸形態での失速を体験し、迎え角を先に減らして確実に回復する');
});

test('school: every flight lesson starts at all three levels and runs without NaN', () => {
  for (const l of flightLessons()) for (const lv of SC.LEVELS) {
    const L = SC.startLesson(l.id, lv.id);
    for (let i = 0; i < 120 * 3 && !L.done; i++) { P.step(L.s, DT); SC.update(L, DT); }
    const c = L.last;
    for (const k of ['alt', 'kias', 'hdg', 'vs', 'pitch', 'bank']) assert.ok(Number.isFinite(c[k]), `${l.id} ${lv.id} ${k}=${c[k]}`);
    assert.ok(!L.done || L.def.steps.length === 0, `${l.id} ${lv.id} ended at once: ${L.reason}`);
    assert.ok(L.sayText || L.atc || L.check, `${l.id} the instructor says something`);
  }
});

test('levels: 導入 widens the tolerances and halves the hold, 精度 narrows them and hides the hints', () => {
  const [a, b, c] = SC.LEVELS;
  assert.deepEqual([a.name, b.name, c.name], ['導入', '基礎', '精度']);
  assert.ok(a.k > b.k && b.k > c.k && b.k === 1); assert.ok(a.holdK < b.holdK && b.holdK < c.holdK);
  assert.ok(a.hints && b.hints && !c.hints);
});

test('continuous hold: the timer counts only while every target is inside, and resets to zero when one goes out', () => {
  const L = SC.startLesson('a2', 'basic'), bot = makeBot(FL);
  while (!L.def.steps[L.step].hold) { bot.fly(L, DT); P.step(L.s, DT); SC.update(L, DT); }
  for (let i = 0; i < 120 * 60 && L.st.holdT < 4; i++) { bot.fly(L, DT); P.step(L.s, DT); SC.update(L, DT); }
  const before = L.st.holdT; assert.ok(before > 3, `held ${before.toFixed(1)} s`);
  L.s.pos[1] += 400 / P.FT; P.derive(L.s);                                 // 400 ft too high: out of ±100
  P.step(L.s, DT); SC.update(L, DT);
  assert.equal(L.st.holdT, 0, 'reset when out'); assert.ok(L.st.holdBest >= before - 0.1, 'the best hold is remembered');
});

test('grading: ≥ 85 % of the time inside and the largest deviation within 1.6 × the tolerance; S / A / B / C', () => {
  const L = runLesson(FL, 'a2', 'basic', 400);
  assert.ok(L.done && L.passed, `a2 passed: ${JSON.stringify(L.results.flatMap(r => r.rows).filter(r => !r.pass))}`);
  assert.ok(['S', 'A', 'B'].includes(L.grade));
  const rows = L.results.flatMap(r => r.rows);
  assert.ok(rows.some(r => /連続保持/.test(r.name)), 'the continuous hold is graded');
  // a step flown badly fails: the same lesson with the throttle left at idle
  const bad = runLesson(FL, 'a2', 'basic', 400, Lx => { Lx.s.thr = 0; });
  assert.ok(bad.done && !bad.passed && bad.grade !== 'S', `idle: ${bad.grade}`);
});

test('the scripted pilot flies and passes the lessons a script can fly (Archer, Seminole, instruments, navigation)', () => {
  const fails = [];
  for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8', 't1', 't3', 't4', 'e1', 'e2', 'e3', 'c1', 'x3', 'n1', 'n2', 'n3', 'i3', 'i4', 'i5', 'm1', 'm2', 'm3', 'm4']) {
    const L = runLesson(FL, id, 'basic', 1200);
    if (!(L.done && L.passed)) fails.push(`${id}: ${L.grade} ${L.reason} ${L.results.flatMap(r => r.rows).filter(r => !r.pass).map(r => r.name + ' ' + r.val).join(' / ')}`);
  }
  assert.deepEqual(fails, []);
});

test('checklists and ATC: an item that is not set is refused until it is set; a wrong read-back is graded as wrong', () => {
  const L = SC.startLesson('t1', 'basic');
  assert.ok(L.check, 't1 starts with the before-takeoff checklist');
  L.s.flapIdx = 2;                                                          // flaps not up
  let refused = null;
  for (let n = 0; n < 20 && L.check; n++) { const it = SC.checklistItem(L), r = SC.checklistNext(L); if (!r.ok) { refused = it[0]; L.s.flapIdx = 0; L.s.trim = 0; L.s.thr = 0; } }
  assert.equal(refused, 'フラップ'); assert.equal(L.check, null, 'the checklist is complete');
  P.step(L.s, DT); SC.update(L, DT);
  assert.ok(L.atc, 'then the read-back to the tower');
  const r = SC.answerAtc(L, (L.atc.ok + 1) % L.atc.opts.length);
  assert.equal(r.ok, false); assert.match(L.results.at(-1).rows[0].val, /誤り/);
  const I = SC.startLesson('i5', 'basic'); assert.ok(I.atc, 'the ILS starts with the approach clearance'); assert.equal(SC.answerAtc(I, I.atc.ok).ok, true);
});

test('diversion estimate (n2): within the tolerance passes, far off fails', () => {
  const L = SC.startLesson('n2', 'basic'), t = SY.estimateTruth(L);
  SY.submitEstimate(L, { hdg: t.brg + 5, dist: t.dist * 1.1, eteMin: t.eteMin * 0.9 });
  assert.ok(SY.estimateRows(L).every(r => r.pass), JSON.stringify(SY.estimateRows(L)));
  SY.submitEstimate(L, { hdg: t.brg + 60, dist: t.dist * 2, eteMin: '' });
  assert.ok(SY.estimateRows(L).some(r => !r.pass));
});

test('failures: the AHRS lesson fails the AHRS, the Seminole lessons fail an engine, and auto-rudder is off for one engine', () => {
  const i3 = runLesson(FL, 'i3', 'basic', 12);
  assert.equal(i3.av.fail.ahrs, true);
  const m2 = runLesson(FL, 'm2', 'basic', 60);
  assert.ok(m2.s.eng.some(e => e.failed), 'an engine failed'); assert.equal(m2.s.opts.autoRud, false, 'no automatic rudder with one engine');
});

// ------------------------------------------------------------------ the record (localStorage + JSON)
test('record: saved fields, the "not a logbook" note, and no key or token — even pasted into the memo', () => {
  const st = memStore(), KEY = ['AIza', 'FAKE', '-TEST-KEY-not-a-real-key-0123456789'].join('');   // built at run time: no key-like literal in the source
  const L = runLesson(FL, 'a1', 'intro', 200);
  const rec = SC.addRecord(st, SC.recordFromLesson(L, `メモ ${KEY} と token=abcdefghijklmnop`));
  for (const f of ['lessonId', 'datetime', 'level', 'aircraft', 'result', 'grade', 'passPct', 'steps', 'altHist', 'spdHist', 'events', 'memo', 'note']) assert.ok(f in rec, f);
  assert.match(rec.note, /正式な飛行日誌（logbook）ではなく/);
  assert.ok(!st.dump().includes(KEY) && !st.dump().includes('abcdefghijklmnop'), 'no key in storage');
  assert.ok(!SC.exportJSON(SC.loadRecords(st), {}).includes(KEY), 'no key in the export');
  assert.ok(!('flightHours' in rec) && !('pilotName' in rec) && !('email' in rec));
});

test('record import: unknown fields (an API key, map data) are dropped; malformed files are refused', () => {
  const evil = JSON.stringify({ app: 'FLIGHT LAB', kind: 'learning-record', records: [{ id: 'r1', lessonId: 'a4', level: 'basic', aircraft: 'pa28', datetime: '2026-01-02T03:04:05Z', result: 'pass', grade: 'A', apiKey: 'AI' + 'zaSECRETSECRETSECRETSECRET123', googleTiles: [1, 2, 3], altHist: [1, 'x', 3], memo: 'ok' }, { lessonId: 'nope' }], progress: { quiz: { q_aero: 90, 'bad key!': 5 }, read: ['aero.forces', 'x'.repeat(80)], atc: { luaw: true, 'bad key!': true } } });
  const j = SC.importJSON(evil);
  assert.equal(j.records.length, 1);
  const r = j.records[0]; assert.ok(!('apiKey' in r) && !('googleTiles' in r)); assert.deepEqual(r.altHist, [1, 3]);
  assert.ok(!JSON.stringify(j).includes('SECRET'));
  assert.deepEqual(j.progress.read, ['aero.forces']); assert.deepEqual(j.progress.quiz, { q_aero: 90 }); assert.deepEqual(Object.keys(j.progress.atc), ['luaw']);
  assert.throws(() => SC.importJSON('{"app":"other"}'), /学習記録ファイルではありません/);
  assert.throws(() => SC.importJSON('not json'), /JSON/);
});

test('works without Google: every lesson runs and its record is written with no Google module and no network', () => {
  assert.equal(FL.google3d, undefined, 'google3d.js not loaded here');
  const st = memStore();
  for (const l of flightLessons()) { const L = SC.startLesson(l.id, 'intro'); for (let i = 0; i < 120; i++) { P.step(L.s, DT); SC.update(L, DT); } SC.addRecord(st, SC.recordFromLesson(L, '')); }
  assert.equal(SC.loadRecords(st).length, flightLessons().length);
});

// ------------------------------------------------------------------ the textbook, the tests, Sanford
test('textbook: ≥ 16 chapters in the parts p0–p6 (序部 and parts 1–6, none empty), each with sections, English terms, examples, cautions, ≥ 2 questions with reasons and sources', () => {
  assert.ok(BK.CHAPTERS.length >= 16, `${BK.CHAPTERS.length} chapters`);
  // the parts in reading order (the front part p0 from book-0.js: DESIGN 3.1), and the chapters in the parts' order
  assert.deepEqual(BK.PARTS.map(p => p.id), ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  assert.deepEqual([...new Set(BK.CHAPTERS.map(c => c.part))], ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  const ids = new Set();
  for (const c of BK.CHAPTERS) {
    assert.ok(c.t && c.en && c.summary && c.secs.length >= 2, `${c.id} text`);
    for (const s of c.secs) { assert.ok(!ids.has(s.id), `duplicate section ${s.id}`); ids.add(s.id); assert.ok(BK.text(s).length > 200, `${s.id} too short`); }
    assert.ok(c.terms.length >= 3 && c.terms.every(t => t[0] && t[1]), `${c.id} terms`);
    assert.ok(c.examples.length >= 1 && c.cautions.length >= 1, `${c.id} examples / cautions`);
    assert.ok(c.quiz.length >= 2, `${c.id} questions`);
    for (const q of c.quiz) { assert.ok(q.q && q.why && q.choices.length >= 3); assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.choices.length); }
    assert.ok(c.refs.length >= 1 && c.refs.every(r => r && /^https:\/\//.test(r.url)), `${c.id} refs`);
    for (const id of c.lessons || []) assert.ok(SC.lesson(id), `${c.id} lesson ${id}`);
  }
  assert.ok(ids.size >= 80, `${ids.size} sections`);
});

test('textbook: every cross-link resolves (sections, lessons, calculators) and the disclaimer is in the book', () => {
  const lessons = new Set(SC.lessonOrder());
  for (const c of BK.CHAPTERS) for (const s of c.secs) {
    const h = BK.html(s);
    for (const m of h.matchAll(/data-sec="([^"]+)"/g)) assert.ok(BK.findSection(m[1]), `${s.id} → ${m[1]}`);
    for (const m of h.matchAll(/data-lesson="([^"]+)"/g)) assert.ok(lessons.has(m[1]), `${s.id} → lesson ${m[1]}`);
    for (const m of h.matchAll(/data-calc="([^"]+)"/g)) assert.equal(typeof FL.bookCalc[m[1]], 'function', `${s.id} → calc ${m[1]}`);
  }
  const all = BK.CHAPTERS.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
  assert.match(all, /本アプリは公開情報を基にした非公式の自主学習用教材です。/);
  for (const w of ['Vmc', 'METAR', '91.155', 'ゴーアラウンド', 'ILS', 'TEM', 'IMSAFE', '偏流修正']) assert.ok(all.includes(w), w);
});

// DESIGN 3.1 and 6.2 rules 2–3 (W09): a part is added by the file of its chapters (FL.book.addPart); the front part 序部
// (p0, book-0.js) holds the two chapters that were finished before it ('intro' first, 'sim' last), and the stage titles
// follow the part numbers (decision 8: 第 1 段階 goes with 第 1 部; ids and phases unchanged)
test('textbook: FL.book.addPart, the front part 序部 (p0) with intro, basics, english and sim, no 「ロンドン相当」, the stages numbered as the parts', () => {
  const p0 = BK.PARTS[0];
  assert.equal(p0.id, 'p0'); assert.equal(p0.title, '序部　出発の前に（日本で準備する）'); assert.doesNotMatch(p0.title, /第 0 部/);
  // W09 moved intro and sim here; W10 wrote basics and english (book-0.js, before: 'aero', so between them)
  assert.deepEqual(BK.CHAPTERS.filter(c => c.part === 'p0').map(c => c.id), ['intro', 'basics', 'english', 'sim']);
  assert.deepEqual(BK.CHAPTERS.slice(0, 4).map(c => c.id), ['intro', 'basics', 'english', 'sim'], 'the front part comes first, so its chapters are numbered first');
  assert.equal(BK.PARTS.find(p => p.id === 'p1').title, '第 1 部　地上学科（英語の座学）');
  for (const p of BK.PARTS) assert.doesNotMatch(p.title, /ロンドン相当/, p.id);
  for (const st of SY.STAGES) assert.doesNotMatch(st.title, /ロンドン相当/, st.id);
  // each stage: 第 N 段階 with N = its phase's part number (s0 → p1 → 第 1 段階)
  assert.deepEqual(SY.STAGES.map(st => [st.id, st.phase, /^第 (\d+) 段階　/.exec(st.title)?.[1]]),
    [['s0', 'p1', '1'], ['s1', 'p2', '2'], ['s2', 'p3', '3'], ['s3', 'p4', '4'], ['s4', 'p5', '5'], ['s5', 'p6', '6']]);
  // addPart: an error for a part that is there, a "before" that names no part, no id or title; nothing changes then
  const n = BK.PARTS.length;
  assert.throws(() => BK.addPart({ id: 'p0', title: '二つめ' }), /there already/);
  assert.throws(() => BK.addPart({ id: 'p9', title: 'x', before: 'p8' }), /not a part/);
  assert.throws(() => BK.addPart({ id: 'x1', title: 'x' }), /an id/);
  assert.throws(() => BK.addPart({ id: 'p9' }), /a title/);
  assert.equal(BK.PARTS.length, n);
  // in front of a part, or at the end without "before" (taken out again: the book is shared by these tests)
  try {
    BK.addPart({ id: 'p8', title: 'テストの部 8' }); BK.addPart({ id: 'p9', title: 'テストの部 9', before: 'p8' });
    assert.deepEqual(BK.PARTS.slice(-2).map(p => p.id), ['p9', 'p8']);
  } finally { for (const id of ['p8', 'p9']) { const i = BK.PARTS.findIndex(p => p.id === id); if (i >= 0) BK.PARTS.splice(i, 1); } }
  assert.equal(BK.PARTS.length, n);
});

test('ground-school tests: ≥ 12 banks of 4-choice questions with reasons, linked to the textbook', () => {
  assert.ok(QZ.BANKS.length >= 12);
  const lessons = new Set(SC.lessonOrder());
  let n = 0;
  for (const b of QZ.BANKS) {
    assert.ok(b.title && BK.findSection(b.book), `${b.id} book link`); assert.ok(!lessons.has(b.id), `${b.id} collides with a lesson id`);
    assert.ok(b.qs.length >= 8, `${b.id} questions`);
    for (const q of b.qs) { n++; assert.equal(q[1].length, 4, q[0]); assert.equal(new Set(q[1]).size, 4, q[0]); assert.ok(Number.isInteger(q[2]) && q[2] >= 0 && q[2] < 4 && q[3], q[0]); }
  }
  assert.ok(n >= 120, `${n} questions`);
});

// The banks are CADET's written exams (cadet/src/career/career.js EXAMS) as well as FLIGHT LAB's tests: their ids and
// order stay, questions are only added at the end (DESIGN 6.2 rule 4), and an added question carries its meta
// { sec, scope, jur? } (quiz.js): the section its reason cites (the {ch:} is that section's chapter, one CADET has),
// scope 'common' or 'us' only — never Japanese law (rule 14, 5 criterion 18) —, an FL.jur item it cites when it has one.
// Each bank's added questions spread their right answers over the four places (15–35 % each).
test('ground-school tests: the 14 banks in order; questions added only at the end, each with its section and a common/us scope, no Japanese law, answers spread', () => {
  const BASE = { q_aero: 10, q_sys: 10, q_perf: 10, q_wx: 10, q_law: 10, q_comm: 10, q_radio: 15, q_hf: 10, q_ops: 10, q_emg: 10, q_nav: 10, q_ifr: 10, q_me: 10, q_crm: 10 };
  assert.deepEqual(QZ.BANKS.slice(0, 14).map(b => b.id), Object.keys(BASE));
  const NOT_IN_CADET = /^(intro|english|sim|g\d+|jlaw|jair|jatc|jwx|jifr|jexam)$/;
  const JP_LAW = /航空法(?!規)|施行規則|第\s?\d+\s?条|電波法|告示|通達/;
  const US_RULE = /14\s?CFR|(?<![A-Za-z])Part\s?(?:1|23|43|61|67|91|97|121|135|141|830)\b|(?<![\d.,])(?:43|61|67|91|97|121|135|141)\.\d{1,4}|(?<![A-Za-z])AIM(?![A-Za-z])|(?<![A-Za-z])FARs?(?![A-Za-z])/;
  const GAME = /ゲーム|ソフト|プレイヤー|FLIGHT LAB|シミュレータ|キーボード|メニュー/;   // what CADET's teachers never say (cadet/test/school.test.mjs)
  let added = 0;
  for (const b of QZ.BANKS.slice(0, 14)) {
    const base = BASE[b.id], old = b.qs.slice(0, base), more = b.qs.slice(base);
    assert.equal(old.length, base, `${b.id}: the first ${base} questions are there`);
    assert.ok(old.every(q => q.length === 4), `${b.id}: the first ${base} questions are the old ones (no meta)`);
    more.forEach((q, i) => {
      const at = `${b.id}[${base + i}]`, [text, choices, , why, meta] = q, all = [text, ...choices, why].join('\n');
      assert.ok(meta && typeof meta === 'object', `${at}: meta`);
      assert.ok(['common', 'us'].includes(meta.scope), `${at}: scope ${meta.scope}`);
      const found = BK.findSection(meta.sec);
      assert.ok(found, `${at}: section ${meta.sec}`);
      assert.ok(['common', 'us'].includes(found.sec.scope), `${at}: ${meta.sec} is ${found.sec.scope}`);
      const chs = [...why.matchAll(/\{ch:([a-z0-9]+)\}/g)].map(m => m[1]);
      assert.equal(chs[0], found.ch.id, `${at}: the reason's {ch:} is the chapter of ${meta.sec}`);
      for (const c of chs) assert.ok(!NOT_IN_CADET.test(c), `${at}: {ch:${c}} is not in CADET's book`);
      assert.doesNotMatch(all, JP_LAW, `${at}: Japanese law in a bank CADET reads`);
      if (US_RULE.test(all)) assert.equal(meta.scope, 'us', `${at}: a US rule, so scope us`);
      assert.doesNotMatch(choices.join('\n'), /\{ch:/, `${at}: choices are shown as written`);
      assert.doesNotMatch(all.replace(/\{ch:[a-z0-9]+\}/g, ''), /[{}]/, `${at}: a brace (CADET reads {…} as a placeholder)`);
      assert.doesNotMatch(all, GAME, `${at}: words about the game`);
      if (meta.jur) {
        const row = FL.jur.byId(meta.jur);
        assert.ok(row, `${at}: FL.jur ${meta.jur}`);
        assert.ok((row.usSrc.match(/\d+-\d+-\d+|\d{1,3}\.\d+/g) || []).some(t => why.includes(t)), `${at}: cites ${row.usSrc} as FL.jur ${meta.jur} does`);
      }
      added++;
    });
    if (more.length >= 6) {
      const c = [0, 0, 0, 0]; for (const q of more) c[q[2]]++;
      for (let k = 0; k < 4; k++) { const s = c[k] / more.length; assert.ok(s >= 0.15 && s <= 0.35, `${b.id}: the added questions' right answer is ${'ABCD'[k]} ${(s * 100).toFixed(0)}%`); }
    }
  }
  assert.ok(added >= 81, `${added} questions added (R2: Part 1)`);
});

test('Sanford: the four runways, the hot spot, the airspace, a schematic labelled NOT FOR NAVIGATION, ≥ 4 ATC scenes', () => {
  assert.deepEqual(SF.RUNWAYS.map(r => r.id), ['09L/27R', '09C/27C', '09R/27L', '18/36']);
  const facts = SF.FACTS.map(f => f.t).join(' ');
  for (const w of ['HS1', '27C', 'Class C', 'Class B', 'Line Up and Wait']) assert.ok(facts.includes(w), w);
  const svg = SF.diagramSvg(); assert.match(svg, /NOT FOR NAVIGATION/); assert.match(svg, /模式図/);
  assert.ok(SF.SCENES.length >= 4);
  for (const s of SF.SCENES) { assert.ok(s.atc && s.why && s.clarify && s.options.length >= 3); assert.ok(s.answer >= 0 && s.answer < s.options.length); }
});

// ------------------------------------------------------------------ English radio (the textbook's five chapters and the practice page)
const RD = FL.radio;
test('radio textbook: five chapters before "human factors", numbered in order; every {ch:} reference resolves; no hard-coded chapter number is wrong', () => {
  const ids = BK.CHAPTERS.map(c => c.id), at = ids.indexOf('radio1');
  assert.deepEqual(ids.slice(at, at + 6), ['radio1', 'radio2', 'radio3', 'radio4', 'radio5', 'hf']);
  BK.CHAPTERS.forEach((c, i) => assert.equal(c.n, i + 1, c.id));
  const every = [...BK.CHAPTERS.flatMap(c => [c.summary, ...(c.examples || []), ...(c.cautions || []), ...c.quiz.flatMap(q => [q.q, q.why]), ...c.secs.map(s => BK.html(s))]), ...QZ.BANKS.flatMap(b => b.qs.flatMap(q => [BK.fix(q[0]), BK.fix(q[3])]))].join('\n');
  assert.doesNotMatch(BK.fix(every), /\{ch:|（別の章）/);
  assert.equal(BK.fix('{ch:crm}'), `第 ${BK.CHAPTERS.find(c => c.id === 'crm').n} 章`);
  const radio = BK.CHAPTERS.filter(c => /^radio/.test(c.id)), text = radio.flatMap(c => c.secs.map(s => BK.text(s))).join(' ');
  assert.ok(radio.reduce((a, c) => a + c.secs.length, 0) >= 20, 'sections');
  for (const w of ['AIM 4-2-3', 'AIM 4-3-18', 'AIM 4-4-7', 'AIM 3-2-4', 'AIM 4-1-9', 'AIM 6-3', '91.185', 'line up and wait', 'cleared for takeoff', 'Say again', 'Wilco', 'Unable', 'MAYDAY', 'PAN-PAN', '7600', 'CTAF', 'decimal', 'QNH', 'student pilot']) assert.ok(text.includes(w), w);
  assert.doesNotMatch(text, /gusts/i, 'gust phraseology was not verified');
});

test('radio: numbers are said as the AIM shows (4-2-8 … 4-2-12) and the controller phrases as JO 7110.65', () => {
  const S = RD.SAY;
  for (const [ft, w] of [[500, 'five hundred'], [4500, 'four thousand five hundred'], [10000, 'one zero thousand'], [13500, 'one three thousand five hundred'], [12000, 'one two thousand'], [12500, 'one two thousand five hundred'], [19000, 'flight level one niner zero'], [27500, 'flight level two seven five']]) assert.equal(S.altitude(ft), w, ft);
  assert.equal(S.freq('122.1'), 'one two two point one');
  assert.equal(S.freq('119.75'), 'one one niner point seven five');
  assert.equal(S.heading(5), 'heading zero zero five'); assert.equal(S.heading(100), 'heading one zero zero'); assert.equal(S.heading(0), 'heading three six zero');
  assert.equal(S.speed(250), 'two five zero knots'); assert.equal(S.speed(190), 'one niner zero knots');
  assert.equal(S.time('0920'), 'zero niner two zero Zulu');
  assert.equal(S.digits('10'), 'one zero');
  assert.equal(S.altimeter('30.01'), 'altimeter three zero zero one');
  assert.equal(S.squawk('0425'), 'squawk zero four two five');
  assert.equal(S.runway('9R'), 'runway niner right'); assert.equal(S.runway('27C'), 'runway two seven center'); assert.equal(S.runway('36'), 'runway three six');
  assert.equal(S.wind(220, 15), 'wind two two zero at one five'); assert.equal(S.wind(100, 2), 'wind calm');
  assert.equal(S.spell('N7LA'), 'November seven Lima Alfa');
  assert.equal(RD.ALPHA.length, 26); assert.equal(RD.DIGW[9], 'niner');
});

test('radio: a whole flight in order (ATIS → ground → tower → departure → approach → tower → ground), every call with its meaning', () => {
  assert.deepEqual(RD.FLIGHT.map(p => p.id), ['atis', 'gnd1', 'twr1', 'dep', 'app', 'twr2', 'gnd2']);
  const lines = RD.FLIGHT.flatMap(p => p.lines), said = lines.filter(l => l[0] !== 'ACT');
  assert.ok(said.length >= 30, `${said.length} calls`);
  for (const p of RD.FLIGHT) assert.ok(BK.findSection(p.sec), p.sec);
  for (const [who, en, jp] of lines) { assert.ok(RD.WHO[who], who); assert.ok(jp && jp.length > 3, en); if (who !== 'ACT') assert.ok(en.length > 8); }
  // every read-back carries the call sign; the first call to each facility uses the full call sign
  for (const [who, en] of said) if (who === 'P') assert.match(en, /Archer (Seven Lima Alpha|7LA)/, en);
  const seen = new Set();
  for (const [who, en] of said) { const m = who === 'P' && /^LAB (Ground|Tower|Departure|Approach),/.exec(en); if (m && !seen.has(m[1])) { seen.add(m[1]); assert.match(en, /Archer Seven Lima Alpha/, en); } }
  assert.equal(seen.size, 4);
  const all = said.map(l => l[1]).join(' ');
  for (const w of ['information Bravo', 'hold short of taxiway Charlie', 'line up and wait', 'cleared for takeoff', 'radar contact', 'squawk VFR', 'cleared to land', 'contact Ground point seven']) assert.ok(all.includes(w), w);
  assert.equal(RD.tts('Contact departure, Archer 7LA.'), 'Contact departure, Archer Seven Lima Alpha.');
});

test('radio: ≥ 30 read-back / response scenes in every phase (the six Sanford scenes kept by id), each with one right answer, a reason and sources', () => {
  assert.ok(RD.SCENES.length >= 30, `${RD.SCENES.length}`);
  const ids = new Set(); for (const sc of RD.SCENES) { assert.ok(!ids.has(sc.id), sc.id); ids.add(sc.id); assert.match(sc.id, /^[a-z0-9_]{1,20}$/); }
  for (const s of SF.SCENES) assert.ok(ids.has(s.id), s.id);
  for (const [g] of RD.GROUPS) assert.ok(RD.SCENES.filter(s => s.g === g).length >= 2, g);
  for (const sc of RD.SCENES) {
    assert.equal(sc.options.length, 4, sc.id); assert.equal(new Set(sc.options).size, 4, sc.id);
    assert.ok(Number.isInteger(sc.answer) && sc.answer >= 0 && sc.answer < 4, sc.id);
    assert.ok(sc.title && sc.situation && sc.q && sc.why && sc.clarify, sc.id);
    assert.ok(sc.refs.length && sc.refs.every(k => RD.ref(k) && /^https:\/\//.test(RD.ref(k).url)), sc.id);
  }
  // the progress keeps a scene id (the same rule as the record)
  const p = SC.sanitizeProgress({ atc: Object.fromEntries(RD.SCENES.map(s => [s.id, true])) });
  assert.equal(Object.keys(p.atc).length, RD.SCENES.length);
});

test('radio drills and listening: four different choices, the right one among them, for every kind (1,000 draws)', () => {
  const rng = RD.mulberry(42);
  for (let k = 0; k < 100; k++) for (const [set] of RD.DRILL_SETS) for (const q of RD.drill(10, rng, set)) {
    assert.equal(q.opts.length, 4, q.q); assert.equal(new Set(q.opts).size, 4, q.q); assert.ok(q.opts.includes(q.ok), q.q); assert.ok(q.why, q.q);
  }
  for (let k = 0; k < 100; k++) for (const q of RD.listen(10, rng)) { assert.equal(new Set(q.opts).size, 4, q.q); assert.ok(q.opts.includes(q.ok)); assert.ok(q.say.length > 10); }
  assert.ok(RD.GLOSSARY.length >= 50);
  for (const g of RD.GLOSSARY) assert.ok(g[0] && g[1] && g[3] && g[4], g[0]);
  // the ground-school stage has the four radio lessons, and the practical test bank exists
  for (const id of ['k3', 'k4', 'k5', 'k6']) assert.ok(SC.lesson(id) && SC.lesson(id).radio, id);
  assert.ok(QZ.BANKS.find(b => b.id === 'q_radio'));
});

test('ui: key chips are made from every lesson\'s key text, and the keyboard map has every key a lesson names', () => {
  const U = FL.ui;
  assert.deepEqual(U.parseKeys('S＝機首上げ・W＝機首下げ（離すとその姿勢を保つ）　A / D＝左右に傾ける').map(p => p.keys), [['S'], ['W'], ['A', 'D']]);
  assert.deepEqual(U.keysUsed('[＝左のプロペラをフェザー・]＝右のプロペラをフェザー　B / Space＝ブレーキ'), ['[', ']', 'B', 'Space']);
  assert.match(U.keyChips('R＝スロットル増'), /<kbd>R<\/kbd><span>スロットル増<\/span>/);
  const onMap = new Set(U.KB.map(k => k[0].toUpperCase()));
  for (const l of SC.lessonOrder().map(id => SC.lesson(id)).filter(l => l.steps)) for (const st of l.steps) {
    const kt = st.keys || '';
    for (const p of U.parseKeys(kt)) { if (!p.keys.length) continue; assert.ok(p.what.length > 1, `${l.id}: "${kt}" has a key with no meaning`); for (const k of p.keys) assert.ok(onMap.has(k.replace(/^Shift\+/, '').toUpperCase()), `${l.id}: key ${k} is not on the keyboard map`); }
  }
  const svg = U.keyboardSvg(['W', 'S']); assert.match(svg, /^<svg/); assert.equal((svg.match(/filter="url\(#kbglow\)"/g) || []).length, 2, 'two keys lit');
});

// ------------------------------------------------------------------ the product's frame (textbook/rewrite/combined/DESIGN.md 6.2 rules 6–8; W02)
test('build: the page is at most MAX_BYTES (12 MiB); a page over the limit is refused, not written', () => {
  assert.equal(MAX_BYTES, 12 * 1024 * 1024);
  assert.equal(B.bytes, Buffer.byteLength(html));
  assert.ok(B.bytes <= MAX_BYTES, `${(B.bytes / 1048576).toFixed(2)} MiB (limit ${MAX_BYTES / 1048576} MiB)`);
  assert.throws(() => build({ quiet: true, maxBytes: 1024 * 1024 }), /over the limit[\s\S]*not written/);
});

test('modules: one list (src/modules.mjs) — the build reads all of it in order, the dev page lists the same, the tests read it less what Node leaves out', () => {
  // every name is a file, listed once; every plain script in src/ is in the list (a new file cannot be left out by mistake)
  assert.equal(new Set(MODULES).size, MODULES.length);
  for (const m of MODULES) assert.ok(fs.existsSync(modulePath(m)), m);
  assert.deepEqual(fs.readdirSync(path.join(FL_ROOT, 'src')).filter(f => f.endsWith('.js') && !MODULES.includes(f)), [], 'src/*.js not in the list');
  // the built page: after the build's own head script, the list's modules, all of them, in its order
  assert.deepEqual([...html.matchAll(/<script>\n\/\* ---- (\S+) ---- \*\//g)].map(m => m[1]), [...MODULES]);
  // the dev page (src/index.html, opened from src/): the same files in the same order (book-photos.js among them)
  const dev = fs.readFileSync(path.join(FL_ROOT, 'src', 'index.html'), 'utf8');
  assert.deepEqual([...dev.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]), MODULES.map(m => (m.includes('/') ? '../' + m : m)));
  assert.ok(dev.includes('<script src="book-photos.js"></script>') && dev.includes('<script src="book-photos-k.js"></script>'));
  // the Node tests: the list less NODE_LEAVE_OUT (each with its reason), in its order; CORE is the list's head
  assert.deepEqual([...NODE_MODULES], MODULES.filter(m => !Object.hasOwn(NODE_LEAVE_OUT, m)));
  for (const [m, why] of Object.entries(NODE_LEAVE_OUT)) { assert.ok(MODULES.includes(m), m); assert.ok(why.length >= 10, `${m}: the reason`); }
  assert.deepEqual(MODULES.slice(0, CORE.length), [...CORE]);
  assert.equal(FL.google3d, undefined); assert.equal(FL.kiso, undefined); assert.equal(FL.bookPhotos, undefined); assert.equal(FL.bookPhotosK, undefined);
  // a leave-out list that names a file not in the list (renamed, gone) is an error; so is one without a reason
  assert.throws(() => without({ 'no-such-file.js': 'a reason here' }, 'a test'), /no-such-file\.js: not in flight-lab\/src\/modules\.mjs/);
  assert.throws(() => without({ 'quiz.js': '' }, 'a test'), /without a reason/);
  assert.throws(() => load('no-such-file.js'), /not in src\/modules\.mjs/);
});

test('modules: TEXTBOOK\'s FL_MODULES are the same list less what it says it leaves out', async () => {
  const TB = await import('../../textbook/build.mjs');
  assert.deepEqual([...TB.FL_MODULES], MODULES.filter(m => !Object.hasOwn(TB.FL_LEAVE_OUT, m)));
  for (const m of Object.keys(TB.FL_LEAVE_OUT)) assert.ok(MODULES.includes(m), m);
  assert.ok(TB.FL_MODULES.includes('book-photos.js') && TB.FL_MODULES.includes('book-photos-k.js') && !TB.FL_MODULES.includes('kiso/kiso-data.js'));
});

// What the reader sees (the textbook page, the chapters' end matter, the ground-school tests) has no （別の章） (a {ch:} to
// a chapter that is not in the book) and no {ch: left; every link has a target: a section, a lesson, a calculator, an
// https page. FLIGHT LAB shows the chapter questions' and the tests' choices as written (not through BK.fix).
test('book: no （別の章） in what the reader sees, and no link without a target (sections, end matter, tests, lessons, English radio)', () => {
  const lessons = new Set(SC.lessonOrder()), shown = [];
  for (const c of BK.CHAPTERS) {
    shown.push(BK.fix(c.summary || ''), ...(c.examples || []).map(BK.fix), ...(c.cautions || []).map(BK.fix), ...c.quiz.flatMap(q => [BK.fix(q.q), ...q.choices, BK.fix(q.why)]));
    for (const s of c.secs) {
      const h = BK.html(s);
      shown.push(s.t, h);
      for (const m of h.matchAll(/data-sec="([^"]*)"/g)) assert.ok(BK.findSection(m[1]), `${s.id} → ${m[1]}`);
      for (const m of h.matchAll(/data-lesson="([^"]*)"/g)) assert.ok(lessons.has(m[1]), `${s.id} → lesson ${m[1]}`);
      for (const m of h.matchAll(/data-calc="([^"]*)"/g)) assert.equal(typeof FL.bookCalc[m[1]], 'function', `${s.id} → calc ${m[1]}`);
      for (const m of h.matchAll(/<a\b([^>]*)>/g)) assert.match(m[1], /\shref="https:\/\/[^"\s]+"/, `${s.id}: ${m[0]}`);
    }
    for (const id of c.lessons || []) assert.ok(lessons.has(id), `${c.id}: lesson ${id}`);
    for (const r of c.refs) assert.match(r.url, /^https:\/\/\S+$/, `${c.id}: ${r.label}`);
  }
  for (const b of QZ.BANKS) { assert.ok(BK.findSection(b.book), `${b.id} → ${b.book}`); shown.push(...b.qs.flatMap(q => [BK.fix(q[0]), ...q[1], BK.fix(q[3])])); }
  for (const id of lessons) for (const sid of SC.lesson(id).book || []) assert.ok(BK.findSection(sid), `${id} → ${sid}`);
  for (const p of RD.FLIGHT) assert.ok(BK.findSection(p.sec), `radio → ${p.sec}`);
  assert.deepEqual(shown.filter(t => /（別の章）|\{ch:/.test(t)).map(t => String(t).slice(0, 120)), []);
});

// ------------------------------------------------------------------ W10b: what the pages draw from the book's data
// (textbook/rewrite/combined/DESIGN.md 3.2「節のデータ」「節の形」「章末」, 5 criterion 24, 6.4): the section's marks
// (FL.book.secMarks), the boxes of the section form (bk.deep・bk.drill・bk.judge・bk.dont・bk.recall), the chapter-end
// 説明してみよう (FL.book.writtenHtml) and its record (bookWritten). The pages themselves: browser.test.mjs.
const KISO_PLACES = (() => {
  const s = new Set();
  for (const c of KZ.chapters) { for (const x of c.sections) s.add(x.id); for (const q of c.qa) s.add(`${c.id}.q${q.n}`); }
  return s;
})();
test('book: FL.book.secMarks — the scope badge on every section that has a scope, 発展 on a deep one, the provenance line from the original\'s own ids', () => {
  const SCOPE = { common: '共通', us: '米国の決まり', jp: '日本の決まり', mixed: '米国と日本の決まり' };
  assert.deepEqual({ ...BK.SCOPE }, SCOPE);
  let scoped = 0, from = 0;
  for (const c of BK.CHAPTERS) for (const s of c.secs) {
    const m = BK.secMarks(s);
    assert.equal(BK.secMarks(s.id), m, `${s.id}: by id or by section, the same`);
    if (s.scope === undefined && s.from === undefined && !s.deep) { assert.equal(m, '', s.id); continue; }
    assert.match(m, /^<div class="bk-marks">[\s\S]*<\/div>$/, s.id);
    if (s.scope !== undefined) { scoped++; assert.ok(m.includes(`<span class="bk-scope bk-scope-${s.scope}" data-scope="${s.scope}">${SCOPE[s.scope]}</span>`), s.id); }
    else assert.doesNotMatch(m, /data-scope=/, `${s.id}: no badge is guessed`);
    assert.equal(m.includes('>発展</span>'), !!s.deep, `${s.id}: 発展`);
    if (s.from !== undefined) {
      from++;
      for (const id of s.from) assert.ok(KISO_PLACES.has(id), `${s.id}: ${id} is a section of the original (kiso/)`);
      assert.match(m, new RegExp(`<span class="bk-from" data-from="${s.from.join(' ').replace(/\./g, '\\.')}">パイロット基礎教材（第 3 版）第 \\d+ 章 .+をもとに改稿</span>`), s.id);
    } else assert.doesNotMatch(m, /bk-from|改稿/, s.id);
  }
  // the front part: its sections have their scope, 12 of them their provenance (R1); the lines as the reader sees them
  const p0 = BK.CHAPTERS.filter(c => c.part === 'p0' && c.id !== 'sim').flatMap(c => c.secs);
  assert.ok(p0.length >= 18 && p0.every(s => /data-scope=/.test(BK.secMarks(s))), 'every front-part section written in R1 shows its scope');
  assert.ok(scoped >= 18 && from >= 12, `${scoped} scoped, ${from} with from`);
  const line = id => BK.secMarks(id).match(/<span class="bk-from"[^>]*>([^<]*)<\/span>/)[1];
  assert.equal(line('intro.marks'), 'パイロット基礎教材（第 3 版）第 0 章 扉をもとに改稿');
  assert.equal(line('intro.study'), 'パイロット基礎教材（第 3 版）第 0 章 導入の節と扉をもとに改稿');
  assert.equal(line('basics.speed'), 'パイロット基礎教材（第 3 版）第 0 章 9・10・11 節をもとに改稿');
  assert.equal(line('basics.rules'), 'パイロット基礎教材（第 3 版）第 0 章 14 節、第 9 章 8 節、第 12 章 1 節をもとに改稿');
  assert.equal(line('intro.japan'), 'パイロット基礎教材（第 3 版）第 9 章 3 節をもとに改稿');
  assert.match(BK.secMarks('intro.cert'), />米国と日本の決まり</);
  assert.match(BK.secMarks('intro.japan'), />日本の決まり</);
  // a typo does not hide; a section that is not there has no marks
  assert.throws(() => BK.secMarks({ id: 'x.y', scope: 'japan' }), /scope "japan"/);
  assert.throws(() => BK.secMarks({ id: 'x.y', scope: 'common', from: ['kiso5.14'] }), /basic course/);
  assert.throws(() => BK.secMarks({ id: 'x.y', from: [] }), /from must be a list/);
  assert.equal(BK.secMarks('no.such.section'), '');
  assert.equal(BK.secMarks({ id: 'x.y', scope: 'jp', from: ['kiso05.14', 'kiso05.16', 'kiso09.q3'] }).match(/>(パイロット[^<]*)</)[1], 'パイロット基礎教材（第 3 版）第 5 章 14・16 節、第 9 章 問 3 をもとに改稿');
  // intro.marks explains the badge, the line and 発展 now that the pages draw them (its rows wait for the parts)
  const marks = BK.html(BK.findSection('intro.marks').sec);
  for (const t of ['範囲の札', '由来の行', 'パイロット基礎教材（第 3 版）第 N 章 x 節をもとに改稿', '<b>発展</b>']) assert.ok(marks.includes(t), t);
});

test('book: the boxes of the section form — もっと深く・計算演習 fold, 判断の目・ここを混同しない take items or a block, 思い出そう needs its link', () => {
  const b = BK.bk;
  assert.equal(b.deep('揚力係数と迎え角', '<p>本文</p>'), '<details class="bk-deep"><summary>もっと深く：揚力係数と迎え角</summary><div class="bk-fold"><p>本文</p></div></details>');
  assert.equal(b.drill('単位の換算', '<p>70 NM は何 km？</p>', '<p>70 × 1.852 ＝ 129.64 km</p>'),
    '<details class="bk-drill"><summary>計算演習：単位の換算</summary><div class="bk-fold"><p>70 NM は何 km？</p><div class="bk-drill-a"><b>答えと解き方</b><p>70 × 1.852 ＝ 129.64 km</p></div></div></details>');
  assert.equal(b.drill('問だけ', '<p>問</p>'), '<details class="bk-drill"><summary>計算演習：問だけ</summary><div class="bk-fold"><p>問</p></div></details>');
  assert.throws(() => b.deep('', '<p>x</p>'), /needs a title/);
  assert.equal(b.judge('雲が下がってきたら引き返す', '<b>燃料</b>が予定より減っていたら降りる'), '<div class="bk-judge"><b>判断の目</b><ul><li>雲が下がってきたら引き返す</li><li><b>燃料</b>が予定より減っていたら降りる</li></ul></div>');
  assert.equal(b.dont('<p>IAS と TAS</p>'), '<div class="bk-dont"><b>ここを混同しない</b><p>IAS と TAS</p></div>');
  assert.match(b.dont(b.t(['語', '意味'], [['IAS', '指示対気速度']])), /^<div class="bk-dont"><b>ここを混同しない<\/b><table class="bk-t">/);
  const r = b.recall('高度計は静圧の差で高さを示します。', ['basics.alt', '高度の種類と高度計の基準']);
  assert.equal(r, '<div class="bk-recall"><b>思い出そう</b><p>高度計は静圧の差で高さを示します。 <button type="button" data-sec="basics.alt">→ 高度の種類と高度計の基準</button></p></div>');
  // the checks read a recall to its first </div> (check-concepts.mjs): the link is inside
  assert.match(r.match(/<div class="bk-recall"[\s\S]*?<\/div>/)[0], /data-sec="basics\.alt"/);
  assert.throws(() => b.recall('リンクのない呼び戻し。'), /needs a link/);
  assert.throws(() => b.recall('x', 'basics.alt'), /needs a link/);
  assert.throws(() => b.recall('<div>x</div>', ['basics.alt', 'y']), /no <div>/);
  // the classes are the ones the section form's order is checked by (check-form.mjs: bk-deep … bk-recall)
  for (const [k, cls] of [['deep', 'bk-deep'], ['drill', 'bk-drill'], ['judge', 'bk-judge'], ['dont', 'bk-dont']]) assert.match(b[k]('題', '<p>x</p>'), new RegExp(`^<(details|div) class="${cls}">`), k);
});

test('book: 説明してみよう — FL.book.writtenHtml on the chapters with written (the front part\'s 22 first), each answer hidden behind its button with its record key; links resolve, no （別の章）', () => {
  let n = 0;
  for (const c of BK.CHAPTERS) {
    const items = BK.writtenItems(c), w = BK.writtenHtml(c);
    assert.equal(BK.writtenHtml(c.id), w, c.id);
    if (!items.length) { assert.equal(w, '', c.id); continue; }
    n += items.length;
    assert.ok(w.startsWith(`<div class="bk-written" data-ch="${c.id}"><h3>説明してみよう</h3>`), c.id);
    assert.equal((w.match(/<div class="bk-w" data-w="/g) || []).length, items.length, c.id);
    items.forEach((it, i) => {
      assert.equal(it.key, `${c.id}.w${i}`);
      assert.ok(w.includes(`<div class="bk-w" data-w="${c.id}.w${i}"><div class="bk-w-q"><b class="bk-w-n">問 ${i + 1}.</b> `), `${c.id} ${i}`);
      assert.ok(w.includes(`<button type="button" class="bk-w-btn" aria-expanded="false" aria-controls="bkw-${c.id}-${i}">答えを見る</button><div class="bk-w-a" id="bkw-${c.id}-${i}" hidden><b>答えの例</b>`), `${c.id} ${i}: hidden behind its button`);
      assert.ok(it.q.trim() && it.a.trim(), `${c.id} ${i}`);
      assert.match(it.a, /data-sec="/, `${c.id} ${i}: the answer links its section (criterion 20)`);
      // a question rewritten from the basic course names the original's questions (they are there: kiso/), and says so
      if (it.from) {
        for (const id of it.from) assert.ok(KISO_PLACES.has(id), `${c.id} ${i}: ${id} is a question of the original (kiso/)`);
        assert.ok(w.includes(`<div class="bk-w-from" data-kiso="${it.from.join(' ')}">パイロット基礎教材（第 3 版）第 `), `${c.id} ${i}: its provenance line`);
      }
    });
    for (const m of w.matchAll(/data-sec="([^"]*)"/g)) assert.ok(BK.findSection(m[1]), `${c.id} → ${m[1]}`);
    assert.doesNotMatch(w, /（別の章）|\{ch:/, c.id);
  }
  const front = ['intro', 'basics', 'english'].map(id => BK.writtenItems(BK.CHAPTERS.find(c => c.id === id)).length);
  assert.ok(front[0] >= 1 && front[1] >= 14 && front[2] >= 7, `the front part's written: ${front}`);
  // the front part's questions rewritten from the basic course (PROVENANCE: kiso00.q1・q2・q6〜q16・q19・q20 → basics,
  // kiso09.q3 → intro) carry their from; english's are new
  const fromOf = id => BK.writtenItems(BK.CHAPTERS.find(c => c.id === id)).map(w => (w.from || []).join(' '));
  assert.deepEqual(fromOf('intro'), ['kiso09.q3']);
  assert.deepEqual([...new Set(fromOf('basics').join(' ').split(' '))].sort(), ['q1', 'q2', 'q6', 'q7', 'q8', 'q9', 'q10', 'q11', 'q12', 'q13', 'q14', 'q15', 'q16', 'q19', 'q20'].map(q => `kiso00.${q}`).sort());
  assert.ok(fromOf('basics').every(Boolean) && fromOf('english').every(f => f === ''));
  assert.ok(n >= 22, `${n}`);
  // { q, a, from }: the original's question it was rewritten from, as the reader sees it; a malformed one is an error
  const ch = { id: 'zz', written: [['問い', '答え'], { q: '問い 2', a: '答え 2（{ch:aero}）', from: ['kiso09.q3'] }] };
  const w = BK.writtenHtml(ch), aero = BK.CHAPTERS.find(c => c.id === 'aero').n;
  assert.ok(w.includes('<div class="bk-w-from" data-kiso="kiso09.q3">パイロット基礎教材（第 3 版）第 9 章 問 3 をもとに改稿</div>'));
  assert.ok(w.includes(`答え 2（第 ${aero} 章）`) && BK.writtenItems(ch)[1].key === 'zz.w1');
  assert.throws(() => BK.writtenHtml({ id: 'zz', written: [['問いだけ']] }), /question and an answer/);
  assert.throws(() => BK.writtenHtml({ id: 'zz', written: [{ q: 'q', a: 'a', from: ['kiso09.3'] }] }), /kisoNN\.qM/);
  assert.throws(() => BK.writtenHtml({ id: 'zz', written: 'x' }), /must be a list/);
});

test('progress: bookWritten (the 説明してみよう answers opened) through the sanitiser, the export and the merge; an R1 export (version 2, no bookWritten) still imports', () => {
  const p = SC.sanitizeProgress({ bookWritten: ['basics.w0', 'basics.w0', 'intro.w0', 'basics.0', 'Basics.w1', 'basics.w1000', 'kiso05.q1', 5, null] });
  assert.deepEqual(p.bookWritten, ['basics.w0', 'intro.w0']);
  assert.deepEqual(SC.sanitizeProgress({}).bookWritten, []);
  assert.deepEqual(SC.sanitizeProgress({ bookWritten: 'basics.w0' }).bookWritten, []);
  const many = Array.from({ length: 1200 }, (_, i) => `c${i}.w0`);
  assert.equal(SC.sanitizeProgress({ bookWritten: many }).bookWritten.length, 1000, 'at most 1,000');
  const e = JSON.parse(SC.exportJSON([], p));
  assert.equal(e.version, 2, 'the export stays version 2');
  assert.deepEqual(e.progress.bookWritten, ['basics.w0', 'intro.w0']);
  assert.deepEqual(SC.importJSON(JSON.stringify(e)).progress.bookWritten, ['basics.w0', 'intro.w0']);
  const m = SC.mergeProgress(p, { bookWritten: ['english.w2', 'basics.w0'], kisoQa: ['kiso00.q1'] });
  assert.deepEqual([m.bookWritten, m.kisoQa], [['basics.w0', 'intro.w0', 'english.w2'], ['kiso00.q1']]);
  // never read from the basic course's own record (DESIGN 6.4), nor the other way round
  assert.deepEqual(SC.sanitizeProgress({ kisoQa: ['kiso09.q3'] }).bookWritten, []);
  assert.deepEqual(SC.sanitizeProgress({ bookWritten: ['intro.w0'] }).kisoQa, []);
  // an export written by R1's FLIGHT LAB (test/fixtures/progress-export-r1.json: before bookWritten): read as it was
  const old = fs.readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'progress-export-r1.json'), 'utf8');
  const oj = JSON.parse(old);
  assert.equal(oj.version, 2); assert.equal('bookWritten' in oj.progress, false);
  const j = SC.importJSON(old);
  assert.equal(j.records.length, 1); assert.equal(j.records[0].lessonId, 'a1');
  assert.deepEqual([j.progress.read, j.progress.bookQuiz, j.progress.kisoRead, j.progress.kisoQa, j.progress.bookWritten],
    [oj.progress.read, oj.progress.bookQuiz, oj.progress.kisoRead, oj.progress.kisoQa, []]);
  assert.deepEqual(j.progress.lessons, oj.progress.lessons);
  const merged = SC.mergeProgress(j.progress, p);
  assert.deepEqual([merged.read, merged.bookWritten], [oj.progress.read, ['basics.w0', 'intro.w0']]);
});
