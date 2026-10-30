// TEXTBOOK — content tests (node --test, no browser): FLIGHT LAB's textbook as this page loads it, and render.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadBook, ORDER, SEC_NOTE, APP_NOTE, COUNTS } from './load.mjs';
import { FL_MODULES } from '../build.mjs';
import { modulePath } from '../../flight-lab/src/modules.mjs';

const { FL, R } = loadBook();
const BK = FL.book;
const SECS = BK.CHAPTERS.flatMap(c => c.secs);
const sum = k => BK.CHAPTERS.reduce((a, c) => a + (c[k] || []).length, 0);

test(`the book: ${COUNTS.parts} parts, ${COUNTS.chapters} chapters in this order, ${COUNTS.secs} sections`, () => {
  assert.equal(BK.PARTS.length, COUNTS.parts);
  // the front part 序部 (p0, added by book-0.js) and parts 1–6, in this order; none of them is empty (DESIGN 3.1)
  assert.deepEqual(BK.PARTS.map(p => p.id), ['p0', 'p1', 'p2', 'p3', 'p4', 'p5', 'p6']);
  for (const p of BK.PARTS) assert.ok(BK.CHAPTERS.some(c => c.part === p.id), `${p.id}: has chapters`);
  assert.equal(BK.CHAPTERS.length, COUNTS.chapters);
  assert.equal(SECS.length, COUNTS.secs);
  assert.deepEqual(BK.CHAPTERS.map(c => c.id), ORDER);
  BK.CHAPTERS.forEach((c, i) => {
    assert.equal(c.n, i + 1, c.id);
    assert.ok(BK.PARTS.some(p => p.id === c.part), `${c.id}: part`);
  });
  assert.equal(new Set(SECS.map(s => s.id)).size, COUNTS.secs, 'section ids are unique');
  // the page's header says how big the book is; it must follow the book
  const brand = fs.readFileSync(new URL('../src/index.html', import.meta.url), 'utf8').match(/全 (\d+) 部・(\d+) 章・(\d+) 節/);
  assert.ok(brand, 'the header names the parts, chapters and sections');
  assert.deepEqual(brand.slice(1).map(Number), [BK.PARTS.length, COUNTS.chapters, COUNTS.secs], 'the header matches the book');
});

test('every section renders with FL.book.html, no {ch: left, the same string each time', () => {
  for (const s of SECS) {
    let h;
    assert.doesNotThrow(() => { h = BK.html(s); }, s.id);
    assert.ok(h.length > 50, s.id);
    assert.doesNotMatch(h, /\{ch:/, s.id);
    // no scripts; links only in a photo's credit (author, licence, source), each opening a new tab
    assert.doesNotMatch(h, /<script/i, s.id);
    assert.doesNotMatch(h.replace(/<span class="bk-credit">[\s\S]*?<\/span>/g, ''), /<a\s/i, s.id);
    for (const m of h.matchAll(/<a\s[^>]*>/g)) assert.match(m[0], /^<a href="https:\/\/[^"]+" target="_blank" rel="noopener noreferrer">$/, s.id);
    assert.equal(BK.html(s), h, `${s.id}: stable`);
  }
});

test(`the end matter: ${COUNTS.quiz} questions, ${COUNTS.terms} terms, ${COUNTS.examples} examples, ${COUNTS.cautions} cautions, ${COUNTS.refs} sources, ${COUNTS.lessons} lessons`, () => {
  assert.equal(sum('quiz'), COUNTS.quiz); assert.equal(sum('terms'), COUNTS.terms); assert.equal(sum('examples'), COUNTS.examples);
  assert.equal(sum('cautions'), COUNTS.cautions); assert.equal(sum('refs'), COUNTS.refs); assert.equal(sum('lessons'), COUNTS.lessons);
  for (const c of BK.CHAPTERS) for (const q of c.quiz || []) {
    assert.equal(q.choices.length, 4, c.id); assert.ok(q.answer >= 0 && q.answer < 4, c.id);
  }
});

test('every lesson (in the end matter and in the section bodies) has a name in FL.school', () => {
  const ids = new Set(BK.CHAPTERS.flatMap(c => c.lessons || []));
  for (const s of SECS) for (const m of BK.html(s).matchAll(/data-lesson="([^"]+)"/g)) ids.add(m[1]);
  assert.ok(ids.size > 0);
  for (const id of ids) { const l = FL.school.lesson(id); assert.ok(l && l.title, id); assert.equal(R.lessonTitle(id), l.title); }
  assert.equal(R.lessonTitle('t4'), '着陸復行（ゴーアラウンド）');
});

test('render.js: every section and chapter to HTML; the notes; the end matter escaped and on the last section', () => {
  let n = 0;
  for (const c of BK.CHAPTERS) c.secs.forEach((s, k) => {
    const h = R.sectionHtml(s.id, { nav: true });
    n++;
    assert.ok(h.startsWith(`<section class="tb-sec" id="${s.id}"`), s.id);
    assert.ok(h.includes(BK.html(s)), `${s.id}: FLIGHT LAB's body unchanged`);
    assert.ok(h.includes(SEC_NOTE), `${s.id}: the note`);
    assert.equal(h.includes(APP_NOTE), c.id === 'sim' || s.id === 'intro.study', `${s.id}: the app note`);
    assert.equal(h.includes('この章で学ぶこと：'), k === 0, `${s.id}: the summary`);
    assert.equal(h.includes('class="tb-end"'), k === c.secs.length - 1, `${s.id}: the end matter`);
    assert.doesNotMatch(h, /\{ch:/, s.id);
  });
  assert.equal(n, COUNTS.secs);
  const all = R.allHtml();
  assert.equal((all.match(/<article class="tb-chapter"/g) || []).length, COUNTS.chapters);
  assert.equal((all.match(/<section class="tb-sec"/g) || []).length, COUNTS.secs);
  assert.equal((all.match(/class="quiz"/g) || []).length, COUNTS.quiz);
  const ends = [...all.matchAll(/<div class="tb-end">[\s\S]*?<\/table>/g)].map(m => m[0]).join('');
  assert.equal((ends.match(/<td class="en">/g) || []).length, COUNTS.terms);
  // the sources' links, and each photo's two (its licence and its source page)
  assert.equal((all.match(/<a href="https?:[^"]+" target="_blank" rel="noopener noreferrer">/g) || []).length, COUNTS.refs + 2 * COUNTS.photos);
  assert.equal((all.match(/<figure class="bk-fig"><svg /g) || []).length, COUNTS.figs);
  assert.equal((all.match(/<figure class="bk-photo"/g) || []).length, COUNTS.photos);
  assert.equal((all.match(/class="row tb-lessons"/g) || []).length, BK.CHAPTERS.filter(c => (c.lessons || []).length).length);
  // the end matter's strings go in as text (escaped), {ch:} fixed
  const c = BK.CHAPTERS.find(x => x.quiz.some(q => /\{ch:/.test(q.why) || /\{ch:/.test(q.q))) || BK.CHAPTERS[1];
  assert.doesNotMatch(R.endHtml(c), /\{ch:/);
  assert.equal(R.esc('<b>&"'), '&lt;b&gt;&amp;&quot;');
  const toc = R.tocHtml([], 'aero.lift');
  assert.equal((toc.match(/class="bk-item/g) || []).length, COUNTS.secs);
  for (const p of BK.PARTS) assert.ok(toc.includes(p.title), p.id);
  // aero.lift is section 3 of chapter 5: the front part's four chapters (intro, basics, english, sim) come first (W09, W10)
  // and aero.wing stands before aero.lift (R2's aero, registered in R2B): DESIGN 6.1
  assert.match(toc, /data-go="aero.lift" aria-current="true"><span class="bk-num">5\.3<\/span>/);
});

// DESIGN 3.2「章末」(W08): the chapter's 日米の違い, drawn from FL.jur (FL.book.jurTable), on its last section after the
// check questions and before the lessons; none on a chapter without a US–Japan box, and none on a summary chapter
// (g1〜g7: its gN.japan draws the part's items as its own tables — R2, book-gates.js)
test('the end matter: the chapter\'s 日米の違い on the chapters with US–Japan boxes, and only there (not on a summary chapter)', () => {
  let n = 0;
  for (const c of BK.CHAPTERS) {
    const end = R.endHtml(c), jt = BK.jurTable(c.id);
    assert.equal(Boolean(jt), !/^g\d+$/.test(c.id) && c.secs.some(s => BK.html(s).includes('data-jur="')), `${c.id}: a table when the chapter has a box (a summary chapter has none)`);
    if (!jt) { assert.doesNotMatch(end, /bk-jur-end/, c.id); continue; }
    n++;
    const at = end.indexOf(jt);
    assert.ok(at > 0 && end.indexOf('bk-jur-end') === end.lastIndexOf('bk-jur-end'), `${c.id}: the table, once`);
    if (c.quiz.length) assert.ok(end.lastIndexOf('class="quiz"') < at, `${c.id}: after the check questions`);
    if ((c.lessons || []).length) assert.ok(at < end.indexOf('tb-lessons'), `${c.id}: before the lessons`);
    assert.match(R.sectionHtml(c.secs[c.secs.length - 1].id), /<div class="bk-jur bk-jur-end">/, `${c.id}: on the last section`);
  }
  assert.ok(n > 0);
});

test('the search: the body (with the figures\' words), case-insensitive, the end matter → the last section', () => {
  const idx = R.index();
  assert.equal(idx.length, COUNTS.secs);
  const a = R.search('vmc', idx).map(h => h.id), b = R.search('VMC', idx).map(h => h.id);
  assert.ok(a.length > 0); assert.deepEqual(a, b);
  // a word found only in a chapter's end matter (an English term) opens that chapter's last section
  const ch = BK.CHAPTERS.find(c => c.id === 'aero');
  const term = ch.terms.map(t => t[0]).find(t => !SECS.some(s => (s.t + BK.text(s)).toLowerCase().includes(t.toLowerCase())) && !BK.CHAPTERS.some(x => x !== ch && R.endText(x).toLowerCase().includes(t.toLowerCase())));
  assert.ok(term, 'a term only in the end matter');
  const hits = R.search(term, idx);
  assert.deepEqual(hits.map(h => h.id), [ch.secs.at(-1).id]);
  assert.equal(hits[0].inEnd, true);
  assert.equal(R.search('  ', idx).length, 0);
});

// the textbook's photos (book-photos.js) and the basic course's photos the book uses (book-photos-k.js: placed by the
// chapters as their sections come; textbook/test/photos.test.mjs checks the files themselves)
test('the photos: data URLs (WebP), each with its alt text, caption and credit (author, an allowed licence, links); every textbook photo used, sizes', () => {
  assert.ok(FL.bookPhotos && typeof FL.bookPhotos === 'object', 'book-photos.js is loaded');
  assert.ok(FL.bookPhotosK && typeof FL.bookPhotosK === 'object', 'book-photos-k.js is loaded');
  const P = { ...FL.bookPhotos, ...FL.bookPhotosK };
  assert.equal(Object.keys(P).length, Object.keys(FL.bookPhotos).length + Object.keys(FL.bookPhotosK).length, 'no id in both files');
  const used = new Map();
  for (const s of SECS) for (const m of BK.html(s).matchAll(/<figure class="bk-photo" data-photo="([^"]+)">/g)) used.set(m[1], (used.get(m[1]) || 0) + 1);
  assert.equal([...used.values()].reduce((a, b) => a + b, 0), COUNTS.photos);
  let total = 0;
  for (const [id, p] of Object.entries(P)) {
    // every textbook photo is used; a basic course photo is used once its chapter places it (DESIGN 4.2: W13〜W41)
    if (FL.bookPhotos[id]) assert.ok(used.has(id), `${id}: used in a section`);
    assert.match(p.src, /^data:image\/webp;base64,[A-Za-z0-9+/]+=*$/, id);
    const bytes = Buffer.from(p.src.split(',')[1], 'base64');
    assert.equal(bytes.subarray(0, 4).toString(), 'RIFF', id); assert.equal(bytes.subarray(8, 12).toString(), 'WEBP', id);
    assert.ok(bytes.length <= 120 * 1024, `${id}: ${bytes.length} bytes`);
    const chunks = []; for (let o = 12; o + 8 <= bytes.length; o += 8 + bytes.readUInt32LE(o + 4) + (bytes.readUInt32LE(o + 4) & 1)) chunks.push(bytes.subarray(o, o + 4).toString('latin1'));
    assert.ok(chunks.length && !chunks.some(c => ['EXIF', 'XMP ', 'ICCP'].includes(c)), `${id}: no metadata chunks (${chunks})`);
    assert.ok(Math.max(p.w, p.h) <= 1200 && p.w > 0 && p.h > 0, `${id}: ${p.w}x${p.h}`);
    total += bytes.length;
    assert.ok(p.alt && p.alt.length >= 4 && p.caption && p.caption.length >= 4, `${id}: alt and caption`);
    const c = p.credit;
    assert.ok(c && c.author && c.license && c.licenseUrl && c.source, `${id}: credit`);
    assert.match(c.license, /^(Public domain.*|CC0 1\.0|CC BY(-SA)? (1\.0|2\.0|2\.5|3\.0|4\.0)( [A-Za-z]+)?)$/, `${id}: licence ${c.license}`);
    assert.match(c.licenseUrl, /^https:\/\//, id); assert.match(c.source, /^https:\/\//, id);
  }
  for (const id of used.keys()) assert.ok(P[id], `${id}: in book-photos.js or book-photos-k.js`);
  // every bk.photo('…') written in the chapters' source names a photo that is there (a missing one would show nothing)
  // (the chapters' files: the book-*.js of FL_MODULES — FLIGHT LAB's one list — less the frame and the photos)
  for (const f of FL_MODULES.filter(m => /^book-.*\.js$/.test(m) && !['book-figs.js', 'book-core.js'].includes(m) && !m.startsWith('book-photos')))
    for (const m of fs.readFileSync(modulePath(f), 'utf8').matchAll(/bk\.photo\('([^']+)'\)/g)) assert.ok(P[m[1]], `${f}: bk.photo('${m[1]}') is in neither book-photos.js nor book-photos-k.js`);
  assert.ok(total <= 5 * 1024 * 1024, `${total} bytes in all`);
  // the credits page lists every photo
  const credits = fs.readFileSync(new URL('../../flight-lab/PHOTO-CREDITS.md', import.meta.url), 'utf8');
  for (const id of Object.keys(P)) assert.ok(credits.includes('`' + id + '`'), `${id}: in PHOTO-CREDITS.md`);
  // the caption line ends with the photo's own modification label (mod, DESIGN 4.2), not one line for all
  for (const [id, n] of used) assert.ok(n >= 1 && BK.bk.photo(id).includes(`・${P[id].mod}</span></figcaption>`), `${id}: its mod under it`);
  // without the photo files (CADET) a photo is nothing
  const keep = FL.bookPhotos, keepK = FL.bookPhotosK; FL.bookPhotos = undefined; FL.bookPhotosK = undefined;
  try { assert.equal(BK.bk.photo(Object.keys(keep)[0] || 'x'), ''); assert.equal(BK.bk.photo('ch00-photo5'), ''); } finally { FL.bookPhotos = keep; FL.bookPhotosK = keepK; }
  assert.equal(BK.bk.photo('no-such-photo'), '');
});

// textbook/rewrite/combined/DESIGN.md 6.2 rule 6 (W02): what the reader sees has no （別の章） (a {ch:} to a chapter that
// is not in the book) and no link without a target. Read as the page builds it (render.js: the built file carries
// FLIGHT LAB's code, whose fix() holds the words （別の章） for that case): the whole book (to print), every section with
// its pager, the contents, the search's results, every check's answer. A target: a section (data-go, data-sec,
// data-jump, href="#…" to an id on the page), a lesson FLIGHT LAB has (data-lesson: page.js makes it a tag), a
// calculator (data-calc), an https page (<a href>).
test('no （別の章） and no link without a target: the whole book, every section with its pager, the contents, the answers', () => {
  const ids = new Set(SECS.map(s => s.id));
  const all = R.allHtml(), anchors = new Set([...all.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
  const pages = [all, R.tocHtml([], SECS[0].id), R.resultsHtml('VMC', R.search('VMC')), ...SECS.map(s => R.sectionHtml(s.id, { nav: true })), ...R.pages().map(R.pageHtml)];
  const answers = BK.CHAPTERS.flatMap(c => (c.quiz || []).flatMap((q, qi) => q.choices.map((x, k) => R.quizResult(c, qi, k).text)));
  for (const t of [...pages, ...answers]) assert.doesNotMatch(t, /（別の章）|\{ch:/, t.slice(0, 80));
  let links = 0;
  for (const h of pages) {
    for (const m of h.matchAll(/data-(go|sec|jump)="([^"]*)"/g)) { links++; assert.ok(ids.has(m[2]), m[0]); }
    for (const m of h.matchAll(/data-lesson="([^"]*)"/g)) { links++; assert.ok(FL.school.lesson(m[1]), m[0]); }
    for (const m of h.matchAll(/data-calc="([^"]*)"/g)) { links++; assert.equal(typeof FL.bookCalc[m[1]], 'function', m[0]); }
    for (const m of h.matchAll(/<a\b([^>]*)>/g)) {
      links++;
      const href = (m[1].match(/\shref="([^"]*)"/) || [])[1];
      assert.ok(href && (/^https:\/\/\S+$/.test(href) || (href[0] === '#' && anchors.has(href.slice(1)))), m[0]);
    }
  }
  assert.ok(links > 1000, `${links} links`);
});

// DESIGN 3.2「部の扉」 and 3.3 付録 (R2: W25, registered in R2C): the pages that are not sections — the door of Part 1
// (FL.book.doorHtml) and 「JCAB 学科の道」 (FL.book.jcabRoadHtml, book-gates.js) — open from the contents with
// button[data-page] (not a numbered item: the contents still have one .bk-item per section), are FLIGHT LAB's HTML, and
// are printed in the whole book (the door before the part's first chapter, the appendix after the last chapter).
// TEXTBOOK does not load the ground-school tests (quiz.js), so the door's lessons table has no test column.
test('render.js: the door of Part 1 and the page 「JCAB 学科の道」 — from the contents, FLIGHT LAB\'s HTML, in the whole book', () => {
  assert.deepEqual(R.pages(), ['door:p1', 'jcab']);
  const toc = R.tocHtml([], 'aero.lift');
  assert.match(toc, /<h3 class="tb-part">第 1 部　地上学科（英語の座学）<\/h3><button type="button" class="tb-page" data-page="door:p1">扉：この部の目標と読み方<\/button>/);
  assert.match(toc, /<h3 class="tb-appx">付録<\/h3><button type="button" class="tb-page" data-page="jcab">JCAB 学科の道<\/button>$/);
  assert.equal((toc.match(/class="tb-page/g) || []).length, 2);
  assert.match(R.tocHtml([], 'jcab'), /class="tb-page sel" data-page="jcab" aria-current="true"/);
  const door = R.pageHtml('door:p1'), road = R.pageHtml('jcab');
  assert.ok(door.includes(BK.doorHtml('p1')) && road.includes(BK.jcabRoadHtml()), 'FLIGHT LAB\'s HTML as it is');
  assert.match(door, /<div class="bk-door" data-part="p1"><h3>第 1 部　地上学科（英語の座学）<\/h3>/);
  assert.match(door, /<h4>課目と、先に読む節<\/h4>/, 'the lessons and the sections to read first');
  assert.doesNotMatch(door, /学科テスト：/, 'no test column: TEXTBOOK has no ground-school tests');
  assert.ok((door.match(/data-sec="/g) || []).length >= 100, 'the door links the sections to read');
  assert.match(door, /data-sec="g1\.review">→ 第 20 章　第 1 部のまとめ/, 'the door ends with the summary chapter');
  assert.match(road, /<div class="bk-road"><h3>JCAB 学科の道<\/h3>/);
  for (const t of ['航空工学', '航空気象', '空中航法', '航空通信', '航空法規', '計器飛行一般']) assert.ok(road.includes(`<h4>${t}</h4>`), t);
  assert.equal(R.pageHtml('door:p2'), '', 'a part without a door has no page');
  assert.equal(R.pageHtml('aero.lift'), '', 'a section is not a page');
  const all = R.allHtml();
  assert.equal((all.match(/<article class="tb-door" data-part="p1">/g) || []).length, 1);
  assert.ok(all.indexOf('<article class="tb-door" data-part="p1">') < all.indexOf('<article class="tb-chapter" data-chapter="aero">'), 'the door before the part\'s first chapter');
  assert.ok(all.indexOf('<article class="tb-door" data-part="p1">') > all.indexOf('<article class="tb-chapter" data-chapter="sim">'));
  assert.ok(all.indexOf('<article class="tb-appendix" data-page="jcab">') > all.lastIndexOf('<article class="tb-chapter"'), 'the appendix after the chapters');
  // the summary chapter g1: at the end of Part 1, no chapter-end 日米 table (g1.japan is it)
  const g1 = BK.CHAPTERS.find(c => c.id === 'g1');
  assert.equal(g1.part, 'p1');
  assert.equal(BK.CHAPTERS[g1.n].part, 'p2');
  assert.doesNotMatch(R.endHtml(g1), /bk-jur-end/);
});
