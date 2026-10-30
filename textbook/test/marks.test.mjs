// TEXTBOOK — the section's marks and the chapter-end 説明してみよう (W10b; textbook/rewrite/combined/DESIGN.md 3.2「節の
// データ」「章末」, 5 criterion 24): render.js draws FLIGHT LAB's FL.book.secMarks beside each title (the scope badge,
// 発展, the provenance line of a section written from the basic course) and FL.book.writtenHtml after the check
// questions, the same HTML as FLIGHT LAB's page; page.js opens and closes the answers (not recorded here), the search
// reaches them and shows the hidden one it found, and the print shows them open. Node (render.js) and the browser.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { loadBook } from './load.mjs';
import { build } from '../build.mjs';
import { loadChromium, openPage, PAGE } from './playwright.mjs';

const { FL, R } = loadBook();
const BK = FL.book;
const SECS = BK.CHAPTERS.flatMap(c => c.secs);
const WRITTEN = BK.CHAPTERS.filter(c => BK.writtenItems(c).length);

test('render.js: every section\'s title with FL.book.secMarks beside it — the badge, 発展, the provenance line; nothing on a section without data', () => {
  let marked = 0;
  for (const s of SECS) {
    const h = R.sectionHtml(s.id), m = BK.secMarks(s);
    assert.match(h, new RegExp(`<div class="bk-head"><h2 class="bk-title"><span class="tb-num">[0-9.]+</span> [^<]*</h2>${m.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}</div>`), s.id);
    if (m) marked++;
    assert.equal(/data-scope=/.test(h), s.scope !== undefined, `${s.id}: the badge`);
    assert.equal(/class="bk-from"/.test(h), s.from !== undefined, `${s.id}: the provenance line`);
  }
  assert.ok(marked >= 18, `${marked} sections with marks`);
  assert.match(R.sectionHtml('basics.alt'), /<span class="bk-from" data-from="kiso00\.12 kiso00\.13">パイロット基礎教材（第 3 版）第 0 章 12・13 節をもとに改稿<\/span>/);
  assert.match(R.sectionHtml('intro.cert'), /<span class="bk-scope bk-scope-mixed" data-scope="mixed">米国と日本の決まり<\/span>/);
  // the whole book (to print) has them too, at the level-3 titles
  const all = R.allHtml();
  assert.equal((all.match(/<div class="bk-head"><h3 class="bk-title">/g) || []).length, SECS.length);
  assert.equal((all.match(/data-scope="/g) || []).length, SECS.filter(s => s.scope !== undefined).length);
  // the sections' provenance lines, and the door of each part with one (the door of Part 1: kiso01.x1・kiso02.x1, R2)
  assert.equal((all.match(/class="bk-from"/g) || []).length, SECS.filter(s => s.from !== undefined).length + BK.PARTS.filter(p => p.door && p.door.from).length);
});

test('render.js: 説明してみよう on each chapter\'s last section — after the check questions, before the 日米の違い and the lessons; searchable; the contents mark 発展', () => {
  assert.ok(WRITTEN.length >= 3, WRITTEN.map(c => c.id).join());
  assert.ok(WRITTEN.reduce((a, c) => a + BK.writtenItems(c).length, 0) >= 22, 'the front part\'s 22 at least');
  for (const c of BK.CHAPTERS) {
    const end = R.endHtml(c), w = BK.writtenHtml(c);
    if (!w) { assert.doesNotMatch(end, /bk-written/, c.id); continue; }
    const at = end.indexOf(w);
    assert.ok(at > 0 && end.indexOf('bk-written') === end.lastIndexOf('bk-written'), `${c.id}: once`);
    if (c.quiz.length) assert.ok(end.lastIndexOf('class="quiz"') < at, `${c.id}: after the check questions`);
    const jt = end.indexOf('bk-jur-end'), ls = end.indexOf('tb-lessons');
    if (jt > 0) assert.ok(at < jt, `${c.id}: before the 日米の違い`);
    if (ls > 0) assert.ok(at < ls, `${c.id}: before the lessons`);
    assert.ok(R.sectionHtml(c.secs.at(-1).id).includes(w), `${c.id}: on the last section`);
    assert.ok(!R.sectionHtml(c.secs[0].id).includes('bk-written') || c.secs.length === 1, `${c.id}: not on the first`);
    // the answers' words are in the end matter's search text
    for (const it of BK.writtenItems(c)) assert.ok(R.endText(c).includes(it.q.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 20)), `${c.id} ${it.key}`);
  }
  // the end matter's first table is still the terms' (content.test.mjs reads it so)
  for (const c of WRITTEN) assert.match(R.endHtml(c), /^<div class="tb-end"><h3>英語の用語（English terms）<\/h3><div class="tb-scroll"><table class="terms">/, c.id);
  // a word only in a written answer is found in the end matter, on the chapter's last section
  const idx = R.index(), hit = findOnlyInWritten();
  assert.ok(hit, 'a word only in a written answer');
  assert.deepEqual(R.search(hit.word, idx).map(h => [h.id, h.inEnd]), [[hit.ch.secs.at(-1).id, true]]);
  // 発展 in the contents: aero.lift is made deep here, then put back; the book's own deep sections (R2: aero.struct …) carry
  // the mark, and only they
  const s = BK.findSection('aero.lift').sec;
  s.deep = true;
  try {
    assert.match(R.tocHtml([], null), /data-go="aero\.lift"><span class="bk-num">[0-9.]+<\/span><span>揚力はどうやって生まれるか <span class="tag bk-deep-tag">発展<\/span><\/span>/);
    assert.match(R.allHtml(), /data-jump="aero\.lift">[^<]*<\/a> <span class="tag bk-deep-tag">発展<\/span>/);
    assert.match(R.sectionHtml('aero.lift'), /<span class="bk-scope bk-deep-tag">発展<\/span>/);
  } finally { delete s.deep; }
  const toc = R.tocHtml([], null), deep = BK.CHAPTERS.flatMap(c => c.secs).filter(x => x.deep);
  assert.ok(deep.length >= 1 && deep.every(x => x.id !== 'aero.lift'), deep.map(x => x.id).join());
  assert.equal((toc.match(/bk-deep-tag/g) || []).length, deep.length);
  for (const x of deep) assert.match(toc, new RegExp(`data-go="${x.id.replace('.', '\\.')}"><span class="bk-num">[0-9.]+</span><span>[^<]* <span class="tag bk-deep-tag">発展</span>`), x.id);
});

// 10 letters of a written answer found there only: in no section (nor a chapter's English title or summary), in no
// other end matter, in no other written question or answer
function findOnlyInWritten() { return onlyInWritten(BK, R); }
function onlyInWritten(BK, R) {
  const bodies = R.index().map(e => e.body.toLowerCase()), plainOf = h => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  for (const c of BK.CHAPTERS) {
    const items = BK.writtenItems(c);
    for (const it of items) for (let i = 0, a = plainOf(it.a); i + 10 <= a.length; i += 5) {
      const word = a.slice(i, i + 10), lw = word.toLowerCase();
      if (!/^[\u3041-\u30ff\u4e00-\u9fff]{10}$/.test(word)) continue;
      if (bodies.some(b => b.includes(lw))) continue;
      if (BK.CHAPTERS.some(x => x !== c && R.endText(x).toLowerCase().includes(lw))) continue;
      if (R.endText({ ...c, written: [] }).toLowerCase().includes(lw)) continue;
      if (items.some(o => o !== it && plainOf(o.q + ' ' + o.a).toLowerCase().includes(lw)) || plainOf(it.q).toLowerCase().includes(lw)) continue;
      return { ch: c, word, key: it.key };
    }
  }
  return null;
}

// ---------------------------------------------------------------- the page (page.js)
const chromium = loadChromium();
const skip = chromium ? false : 'Playwright not found (PLAYWRIGHT, require("playwright"), /opt/node22/lib/node_modules/playwright)';
let browser;
test.before(async () => {
  if (!chromium) return;
  fs.mkdirSync(path.dirname(PAGE), { recursive: true });
  fs.writeFileSync(PAGE, build({ quiet: true }).html);
  browser = await chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); });

test('page: the badge beside the title and the provenance line under it; 説明してみよう — an answer opens and closes, the search shows the one it found, the print shows them all', { skip }, async () => {
  const { ctx, page, errors, requests } = await openPage(browser, { hash: 'basics.rules' });
  const m = await page.evaluate(() => {
    const t = document.querySelector('#tbView .bk-head .bk-title'), s = document.querySelector('#tbView .bk-head .bk-scope'), f = document.querySelector('#tbView .bk-head .bk-from'), r = e => e.getBoundingClientRect();
    return { scope: s.textContent, from: f.textContent, beside: r(s).left > r(t).right - 1 && r(s).top < r(t).bottom && r(s).bottom > r(t).top, under: r(f).top >= r(t).bottom - 1 };
  });
  assert.deepEqual(m, { scope: '共通', from: 'パイロット基礎教材（第 3 版）第 0 章 14 節、第 9 章 8 節、第 12 章 1 節をもとに改稿', beside: true, under: true });
  // the answers: hidden, then shown and hidden by the button; not kept in this page's storage
  await page.evaluate(() => { location.hash = FL.book.CHAPTERS.find(c => c.id === 'basics').secs.at(-1).id; });
  await page.waitForSelector('#tbView .bk-written');
  const n = await page.evaluate(() => FL.book.writtenItems(FL.book.CHAPTERS.find(c => c.id === 'basics')).length);
  assert.equal(await page.locator('#tbView .bk-w').count(), n);
  assert.equal(await page.locator('#tbView .bk-w-a:visible').count(), 0);
  const first = page.locator('#tbView .bk-w[data-w="basics.w0"]');
  await first.locator('.bk-w-btn').click();
  assert.equal(await first.locator('.bk-w-a').isVisible(), true);
  assert.deepEqual([await first.locator('.bk-w-btn').innerText(), await first.locator('.bk-w-btn').getAttribute('aria-expanded')], ['答えを閉じる', 'true']);
  await first.locator('.bk-w-btn').click();
  assert.equal(await first.locator('.bk-w-a').isVisible(), false);
  assert.equal(await first.locator('.bk-w-btn').getAttribute('aria-expanded'), 'false');
  assert.ok((await page.evaluate(() => Object.keys(localStorage))).every(k => k.startsWith('textbook.')));
  // an answer's link moves within the page
  await first.locator('.bk-w-btn').click();
  const target = await first.locator('.bk-w-a button[data-sec]').first().getAttribute('data-sec');
  await first.locator('.bk-w-a button[data-sec]').first().click();
  await page.waitForFunction(t => __tb.cur === t, target);
  // print (#all): the answers open by the style sheet, the buttons go; the folds open on beforeprint as before
  await page.evaluate(() => { location.hash = 'all'; });
  await page.waitForFunction(() => __tb.mode === 'all');
  const total = await page.evaluate(() => FL.book.CHAPTERS.reduce((a, c) => a + FL.book.writtenItems(c).length, 0));
  assert.equal(await page.locator('#tbView .bk-w-a[hidden]').count(), total);
  await page.emulateMedia({ media: 'print' });
  assert.deepEqual(await page.evaluate(() => [...new Set([...document.querySelectorAll('#tbView .bk-w-a')].map(a => getComputedStyle(a).display))]), ['block']);
  assert.deepEqual(await page.evaluate(() => [...new Set([...document.querySelectorAll('#tbView .bk-w-btn')].map(b => getComputedStyle(b).display))]), ['none']);
  await page.emulateMedia({ media: 'screen' });
  assert.equal(await page.locator('#tbView .bk-w-a:visible').count(), 0);
  // the search: a word only in a written answer opens the chapter's last section and shows that answer
  const hit = await page.evaluate(`(${findInPage})()`);
  assert.ok(hit, 'a word only in a written answer');
  await page.fill('#tbSearch', hit.word);
  await page.waitForSelector('#tbToc .tb-hit');
  await page.locator('#tbToc .tb-hit').first().click();
  await page.waitForSelector('#tbView mark.tb-mark');
  const shown = await page.evaluate(k => [...document.querySelectorAll('#tbView .bk-w')].filter(b => !b.querySelector('.bk-w-a').hidden).map(b => b.dataset.w), hit.key);
  assert.deepEqual(shown, [hit.key]);
  assert.equal(await page.locator(`#tbView .bk-w[data-w="${hit.key}"] .bk-w-btn`).getAttribute('aria-expanded'), 'true');
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  await ctx.close();
});

// the same search for a word as findOnlyInWritten, in the page (FL.book and TB there)
const findInPage = `() => { const r = (${onlyInWritten})(FL.book, TB.make(FL)); return r && { word: r.word, key: r.key }; }`;
