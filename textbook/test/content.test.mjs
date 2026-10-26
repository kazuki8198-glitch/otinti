// TEXTBOOK — content tests (node --test, no browser): FLIGHT LAB's textbook as this page loads it, and render.js.
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadBook, ORDER, SEC_NOTE, APP_NOTE } from './load.mjs';

const { FL, R } = loadBook();
const BK = FL.book;
const SECS = BK.CHAPTERS.flatMap(c => c.secs);
const sum = k => BK.CHAPTERS.reduce((a, c) => a + (c[k] || []).length, 0);

test('the book: 6 parts, 27 chapters in this order, 120 sections', () => {
  assert.equal(BK.PARTS.length, 6);
  assert.equal(BK.CHAPTERS.length, 27);
  assert.equal(SECS.length, 120);
  assert.deepEqual(BK.CHAPTERS.map(c => c.id), ORDER);
  BK.CHAPTERS.forEach((c, i) => {
    assert.equal(c.n, i + 1, c.id);
    assert.ok(BK.PARTS.some(p => p.id === c.part), `${c.id}: part`);
  });
  assert.equal(new Set(SECS.map(s => s.id)).size, 120, 'section ids are unique');
});

test('every section renders with FL.book.html, no {ch: left, the same string each time', () => {
  for (const s of SECS) {
    let h;
    assert.doesNotThrow(() => { h = BK.html(s); }, s.id);
    assert.ok(h.length > 50, s.id);
    assert.doesNotMatch(h, /\{ch:/, s.id);
    assert.doesNotMatch(h, /<script|<a\s/i, s.id);
    assert.equal(BK.html(s), h, `${s.id}: stable`);
  }
});

test('the end matter: 83 questions, 271 terms, 55 examples, 55 cautions, 124 sources, 65 lessons', () => {
  assert.equal(sum('quiz'), 83); assert.equal(sum('terms'), 271); assert.equal(sum('examples'), 55);
  assert.equal(sum('cautions'), 55); assert.equal(sum('refs'), 124); assert.equal(sum('lessons'), 65);
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
  assert.equal(n, 120);
  const all = R.allHtml();
  assert.equal((all.match(/<article class="tb-chapter"/g) || []).length, 27);
  assert.equal((all.match(/<section class="tb-sec"/g) || []).length, 120);
  assert.equal((all.match(/class="quiz"/g) || []).length, 83);
  const ends = [...all.matchAll(/<div class="tb-end">[\s\S]*?<\/table>/g)].map(m => m[0]).join('');
  assert.equal((ends.match(/<td class="en">/g) || []).length, 271);
  assert.equal((all.match(/<a href="https?:[^"]+" target="_blank" rel="noopener noreferrer">/g) || []).length, 124);
  assert.equal((all.match(/class="row tb-lessons"/g) || []).length, BK.CHAPTERS.filter(c => (c.lessons || []).length).length);
  // the end matter's strings go in as text (escaped), {ch:} fixed
  const c = BK.CHAPTERS.find(x => x.quiz.some(q => /\{ch:/.test(q.why) || /\{ch:/.test(q.q))) || BK.CHAPTERS[1];
  assert.doesNotMatch(R.endHtml(c), /\{ch:/);
  assert.equal(R.esc('<b>&"'), '&lt;b&gt;&amp;&quot;');
  const toc = R.tocHtml([], 'aero.lift');
  assert.equal((toc.match(/class="bk-item/g) || []).length, 120);
  for (const p of BK.PARTS) assert.ok(toc.includes(p.title), p.id);
  assert.match(toc, /data-go="aero.lift" aria-current="true"><span class="bk-num">2\.2<\/span>/);
});

test('the search: the body (with the figures\' words), case-insensitive, the end matter → the last section', () => {
  const idx = R.index();
  assert.equal(idx.length, 120);
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
