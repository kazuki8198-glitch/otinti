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
import { build, MAX_BYTES } from '../build.mjs';
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
  // the recovery step (a7, a8 and the check c1): the same words in the same order, the same grading as before
  for (const id of ['a7', 'a8', 'c1']) {
    const r = recovery(id);
    assert.ok(r, `${id}: a recovery step`);
    inOrder(r.say, ['①機首を下げて迎え角を減らす', '②翼を水平', '③出力を必要なだけ', '④速度が付いたら元の経路'], `${id} say`);
    inOrder(r.g, ['W で機首を水平線付近', '失速警報が止まるまで', 'A / D で翼を水平', 'R で出力を足す', '上昇姿勢'], `${id} g`);
    const rows = r.result({ level: { k: 1 } }, { start: 3000, min: 2750, second: false });
    assert.deepEqual(rows.map(x => [x.name, x.std, x.pass]), [['回復で失った高度', '300 ft 以内', true], ['二次失速', 'なし', true]], `${id}: grading`);
    assert.equal(r.result({ level: { k: 1 } }, { start: 3000, min: 2650, second: true }).some(x => x.pass), false, `${id}: 350 ft and a secondary stall fail`);
  }
  // the textbook says the same order (the lesson links these sections)
  inOrder(BK.text(BK.findSection('aero.stall').sec), ['まず自動操縦を切', '迎え角を減ら', '翼を水平', '出力を必要'], 'aero.stall');
  inOrder(BK.text(BK.findSection('ops.stall').sec), ['迎え角を減ら', '翼を水平', '出力を必要', '元の飛行経路'], 'ops.stall');
  // c1 (the pre-solo check) links the section on what the check looks at, not the introduction
  assert.deepEqual(SC.lesson('c1').book, ['solo.check']);
  assert.deepEqual(SC.lesson('a4').book, ['aero.turn', 'ops.turns']);
  assert.deepEqual(SC.lesson('a5').book, ['aero.turn', 'aero.vn', 'ops.turns']);
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
test('textbook: ≥ 16 chapters in the six parts, each with sections, English terms, examples, cautions, ≥ 2 questions with reasons and sources', () => {
  assert.ok(BK.CHAPTERS.length >= 16, `${BK.CHAPTERS.length} chapters`);
  assert.deepEqual([...new Set(BK.CHAPTERS.map(c => c.part))], ['p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
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
  assert.ok(dev.includes('<script src="book-photos.js"></script>'));
  // the Node tests: the list less NODE_LEAVE_OUT (each with its reason), in its order; CORE is the list's head
  assert.deepEqual([...NODE_MODULES], MODULES.filter(m => !Object.hasOwn(NODE_LEAVE_OUT, m)));
  for (const [m, why] of Object.entries(NODE_LEAVE_OUT)) { assert.ok(MODULES.includes(m), m); assert.ok(why.length >= 10, `${m}: the reason`); }
  assert.deepEqual(MODULES.slice(0, CORE.length), [...CORE]);
  assert.equal(FL.google3d, undefined); assert.equal(FL.kiso, undefined); assert.equal(FL.bookPhotos, undefined);
  // a leave-out list that names a file not in the list (renamed, gone) is an error; so is one without a reason
  assert.throws(() => without({ 'no-such-file.js': 'a reason here' }, 'a test'), /no-such-file\.js: not in flight-lab\/src\/modules\.mjs/);
  assert.throws(() => without({ 'quiz.js': '' }, 'a test'), /without a reason/);
  assert.throws(() => load('no-such-file.js'), /not in src\/modules\.mjs/);
});

test('modules: TEXTBOOK\'s FL_MODULES are the same list less what it says it leaves out', async () => {
  const TB = await import('../../textbook/build.mjs');
  assert.deepEqual([...TB.FL_MODULES], MODULES.filter(m => !Object.hasOwn(TB.FL_LEAVE_OUT, m)));
  for (const m of Object.keys(TB.FL_LEAVE_OUT)) assert.ok(MODULES.includes(m), m);
  assert.ok(TB.FL_MODULES.includes('book-photos.js') && !TB.FL_MODULES.includes('kiso/kiso-data.js'));
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
