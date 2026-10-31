// TEXTBOOK — the line 使う場面 and the notes on the exams under a section's title (W10c; textbook/rewrite/combined/DESIGN.md
// 3.2「節のデータ」use・jcab・faa, 5 criterion 24, 6.2 rules 6 and 13): render.js draws FLIGHT LAB's FL.book.secMarks, so the
// line is FLIGHT LAB's HTML — less its test banks (this page does not load quiz.js) —; page.js makes its links work here:
// a lesson opens its goal, reason and standard under the line (a short link, not one of the lesson tags), まとめ 1 opens
// the summary chapter, 「JCAB 航空工学」 the page of the road, and the notes on the exams show and hide with their button
// (printed open). Node (render.js) and the browser.
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

test('render.js: the line 使う場面 under the title where the data says something — lessons, summary chapters, JCAB subjects; no test bank here; every link has its target', () => {
  assert.equal(FL.quiz, undefined, 'this page has no test banks (quiz.js is left out)');
  const lessons = FL.syllabus.STAGES.flatMap(s => s.lessons);
  let lined = 0, noted = 0;
  for (const s of SECS) {
    const h = R.sectionHtml(s.id), m = BK.secMarks(s);
    const line = (h.match(/<span class="bk-use" data-use-for="[^"]+">([\s\S]*?)<\/span>(?=<span class="bk-exam"|<\/div>)/) || [])[1];
    const named = lessons.filter(l => (l.book || []).includes(s.id)).map(l => l.id);
    if (named.length || s.use || s.jcab || s.faa) assert.ok(line !== undefined, `${s.id}: the line`);
    if (line === undefined) { assert.doesNotMatch(m, /bk-use/, s.id); continue; }
    lined++;
    assert.ok(h.includes(m), `${s.id}: FLIGHT LAB's HTML`);
    for (const id of named) assert.ok(line.includes(`data-use-lesson="${id}"`), `${s.id}: ${id}`);
    for (const [, id] of line.matchAll(/data-use-lesson="([^"]+)"/g)) assert.ok(FL.school.lesson(id), `${s.id} → ${id}`);
    for (const [, id] of line.matchAll(/data-sec="([^"]+)"/g)) assert.ok(BK.findSection(id) && /^g[1-9]$/.test(BK.findSection(id).ch.id), `${s.id} → ${id}`);
    for (const [, p] of line.matchAll(/data-page="([^"]+)"/g)) assert.ok(R.pageHtml(p), `${s.id} → page ${p}`);
    assert.doesNotMatch(line, /data-use-bank|学科テスト|data-lesson=/, `${s.id}: no bank here; not a lesson tag`);
    if (/class="bk-exam"/.test(h)) { noted++; assert.ok(h.includes(`<span class="bk-exam" id="bkx-${s.id}" hidden>`), s.id); }
  }
  assert.ok(lined >= 100 && noted >= 80, `${lined} lines, ${noted} notes`);
  // the whole book: each line once, each note's id once (the page is one document)
  const all = R.allHtml(), ids = [...all.matchAll(/ id="(bkx-[^"]+)"/g)].map(m => m[1]);
  assert.equal((all.match(/<span class="bk-use" /g) || []).length, lined);
  assert.equal(ids.length, noted); assert.equal(new Set(ids).size, ids.length);
  // the search reads the sections' text, not the marks
  assert.doesNotMatch(R.index().map(e => e.body).join(' '), /使う場面：|試験の項目を見る|出題範囲参考の見出し/);
});

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

test('page: the line 使う場面 — a lesson opens its goal under the line, まとめ 1 and 「JCAB 学科の道」 open; the notes on the exams shown, hidden and printed open; nothing wider than a phone', { skip }, async () => {
  const { ctx, page, errors, requests } = await openPage(browser, { hash: 'aero.stall' });
  const lessons = await page.evaluate(() => FL.syllabus.STAGES.flatMap(s => s.lessons).filter(l => (l.book || []).includes('aero.stall')).map(l => l.id));
  assert.ok(lessons.length >= 2, lessons.join());
  const u = await page.evaluate(() => {
    const t = document.querySelector('#tbView .bk-head .bk-title'), line = document.querySelector('#tbView .bk-head .bk-use'), x = document.querySelector('#tbView .bk-head .bk-exam'), r = e => e.getBoundingClientRect();
    return { text: line.textContent, under: r(line).top >= r(t).bottom - 1, hidden: x.hidden && x.offsetHeight === 0, expanded: [...line.querySelectorAll('[data-use-lesson]')].map(b => b.getAttribute('aria-expanded')), tags: line.querySelectorAll('.bk-lesson').length };
  });
  assert.match(u.text, /^使う場面：課目 [a-z0-9・]+／まとめ 1／JCAB 航空工学試験の項目を見る$/);
  assert.deepEqual([u.under, u.hidden, u.tags], [true, true, 0]);
  assert.ok(u.expanded.every(v => v === 'false'));
  // a lesson: its goal under the line; the same again closes it, another takes its place
  const first = page.locator(`#tbView .bk-use [data-use-lesson="${lessons[0]}"]`), second = page.locator(`#tbView .bk-use [data-use-lesson="${lessons[1]}"]`);
  await first.click();
  const info = () => page.evaluate(() => { const i = document.querySelector('#tbView .bk-head .bk-use + .bk-lesson-info'); return i ? [i.dataset.lessonId, i.textContent.includes('目的：'), i.querySelector('a') && i.querySelector('a').getAttribute('target')] : null; });
  assert.deepEqual(await info(), [lessons[0], true, '_blank']);
  assert.equal(await first.getAttribute('aria-expanded'), 'true');
  await second.click();
  assert.deepEqual(await info(), [lessons[1], true, '_blank']);
  assert.deepEqual([await first.getAttribute('aria-expanded'), await second.getAttribute('aria-expanded')], ['false', 'true']);
  await second.click();
  assert.equal(await info(), null);
  assert.equal(await page.locator('#tbView .bk-lesson-info').count(), 0);
  // the notes on the exams
  await page.locator('#tbView .bk-exam-btn').click();
  const ex = await page.evaluate(() => { const x = document.querySelector('#tbView .bk-exam'), b = document.querySelector('#tbView .bk-exam-btn'); return [!x.hidden && x.offsetHeight > 0, x.textContent.includes('（FAA の学科を受けるかは未公表）'), x.textContent.startsWith('JCAB 出題範囲参考の見出し：事業用 １（１）ア'), b.textContent, b.getAttribute('aria-expanded')]; });
  assert.deepEqual(ex, [true, true, true, '試験の項目を閉じる', 'true']);
  await page.locator('#tbView .bk-exam-btn').click();
  assert.equal(await page.locator('#tbView .bk-exam').isVisible(), false);
  await page.emulateMedia({ media: 'print' });
  assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('#tbView .bk-exam')).display, getComputedStyle(document.querySelector('#tbView .bk-exam-btn')).display]), ['block', 'none']);
  await page.emulateMedia({ media: 'screen' });
  // まとめ 1 → the summary chapter; 「JCAB 航空工学」 → the page of the road
  await page.locator('#tbView .bk-use button[data-sec="g1.review"]').click();
  await page.waitForFunction(() => __tb.cur === 'g1.review');
  await page.evaluate(() => { location.hash = 'aero.stall'; });
  await page.waitForFunction(() => __tb.cur === 'aero.stall' && document.querySelector('#tbView .bk-use'));
  await page.locator('#tbView .bk-use button[data-page="jcab"]').click();
  await page.waitForFunction(() => __tb.mode === 'page');
  assert.equal(await page.textContent('#tbView .bk-road h3'), 'JCAB 学科の道');
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  await ctx.close();
  // a phone, dark: the line and the open notes wrap inside the screen
  const phone = await openPage(browser, { width: 390, height: 800, colorScheme: 'dark', hash: 'sys.eis' });
  await phone.page.locator('#tbView .bk-exam-btn').click();
  const w = await phone.page.evaluate(() => ({ doc: document.documentElement.scrollWidth, line: Math.ceil(document.querySelector('#tbView .bk-use').getBoundingClientRect().right), notes: Math.ceil(document.querySelector('#tbView .bk-exam').getBoundingClientRect().right) }));
  assert.ok(w.doc <= 390 && w.line <= 390 && w.notes <= 390, JSON.stringify(w));
  // the whole book: the lines' lessons stay links (not tags), each note opens on its own
  await phone.page.evaluate(() => { location.hash = 'all'; });
  await phone.page.waitForFunction(() => __tb.mode === 'all');
  const a = await phone.page.evaluate(() => ({ links: document.querySelectorAll('#tbView .bk-use [data-use-lesson]').length, tags: document.querySelectorAll('#tbView .bk-use .bk-lesson').length, notes: document.querySelectorAll('#tbView .bk-exam').length }));
  assert.ok(a.links >= 40 && a.tags === 0 && a.notes >= 80, JSON.stringify(a));
  await phone.page.locator('#tbView .bk-exam-btn[aria-controls="bkx-aero.stall"]').click();
  assert.equal(await phone.page.evaluate(() => [...document.querySelectorAll('#tbView .bk-exam')].filter(x => !x.hidden).map(x => x.id).join()), 'bkx-aero.stall');
  assert.deepEqual(phone.errors, []); assert.deepEqual(phone.requests, []);
  await phone.ctx.close();
});
