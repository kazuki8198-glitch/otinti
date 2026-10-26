// TEXTBOOK — browser tests (node --test, Playwright already on this machine; skipped when there is none).
// The page is built into test-output/ and opened from file:// with every http(s) request stopped and counted.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { build } from '../build.mjs';
import { loadChromium, openPage, PAGE } from './playwright.mjs';
import { ORDER, NOTICE, COUNTS } from './load.mjs';

const chromium = loadChromium();
const skip = chromium ? false : 'Playwright not found (PLAYWRIGHT, require("playwright"), /opt/node22/lib/node_modules/playwright)';
const BOARD = 'rgb(11, 20, 34)';
let browser;

test.before(async () => {
  if (!chromium) return;
  fs.mkdirSync(path.dirname(PAGE), { recursive: true });
  fs.writeFileSync(PAGE, build({ quiet: true }).html);
  browser = await chromium.launch();
});
test.after(async () => { if (browser) await browser.close(); });

test(`opens: the notes, ${COUNTS.secs} sections in the contents, the chapters in order, #aero.lift`, { skip }, async () => {
  const { ctx, page, errors, requests } = await openPage(browser, { hash: 'aero.lift' });
  const text = await page.locator('.tb-notice').innerText();
  for (const t of NOTICE) assert.ok(text.includes(t), t);
  assert.equal(await page.locator('#tbToc .bk-item').count(), COUNTS.secs);
  assert.deepEqual(await page.evaluate(() => FL.book.CHAPTERS.map(c => c.id)), ORDER);
  assert.equal(await page.evaluate(() => __tb.cur), 'aero.lift');
  assert.equal(await page.evaluate(() => document.getElementById('aero.lift') !== null), true);
  assert.equal(await page.locator('#tbToc .bk-item.sel .bk-num').innerText(), '2.2');
  assert.match(await page.locator('#tbToc .bk-item.sel').innerText(), /✓|揚力/);
  assert.ok(await page.locator('#tbView .tb-note').count() === 1);
  // the next section, the URL follows (replaceState)
  await page.locator('.tb-pager button.primary').click();
  await page.waitForFunction(() => __tb.cur !== 'aero.lift');
  assert.equal(await page.evaluate(() => location.hash), '#' + await page.evaluate(() => __tb.cur));
  assert.notEqual(await page.evaluate(() => __tb.cur), 'aero.lift');
  // read marks are kept in localStorage under textbook.*
  const keys = await page.evaluate(() => Object.keys(localStorage));
  assert.ok(keys.length && keys.every(k => k.startsWith('textbook.')), keys.join());
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('textbook.read')).includes('aero.lift')));
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  await ctx.close();
});

test('search: a section is found and the word marked in the text (figures untouched)', { skip }, async () => {
  const { ctx, page, errors, requests } = await openPage(browser, { hash: 'aero.forces' });
  const svgBefore = await page.evaluate(() => [...document.querySelectorAll('#tbView svg')].map(s => s.outerHTML));
  await page.fill('#tbSearch', 'vmc');
  await page.waitForSelector('#tbToc .tb-hit');
  const n = await page.locator('#tbToc .tb-hit').count();
  assert.ok(n > 0);
  await page.locator('#tbToc .tb-hit').first().click();
  await page.waitForSelector('#tbView mark.tb-mark');
  const marks = await page.evaluate(() => [...document.querySelectorAll('#tbView mark.tb-mark')].map(m => [m.textContent, !!m.closest('svg, button, input')]));
  assert.ok(marks.length > 0);
  for (const [t, inside] of marks) { assert.equal(t.toLowerCase(), 'vmc'); assert.equal(inside, false); }
  // a word inside a figure: the section is found, the SVG stays as it was
  await page.evaluate(() => { location.hash = 'aero.forces'; });
  await page.waitForFunction(() => __tb.cur === 'aero.forces');
  const figWord = await page.evaluate(() => document.querySelector('#tbView svg text').textContent.trim());
  await page.fill('#tbSearch', figWord);
  await page.waitForSelector('#tbToc .tb-hit');
  await page.locator('#tbToc .tb-hit[data-go="aero.forces"]').click();
  await page.waitForFunction(() => __tb.cur === 'aero.forces');
  assert.equal(await page.evaluate(() => document.querySelectorAll('#tbView svg mark').length), 0);
  assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#tbView svg')].map(s => s.outerHTML)), svgBefore);
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  await ctx.close();
});

test('the sections\' links, the calculators, the check questions, the lesson tags', { skip }, async () => {
  const { ctx, page, errors, requests } = await openPage(browser, { hash: 'ifr.upset' });
  // a data-sec button moves within the page
  const target = await page.locator('#tbView button[data-sec]').first().getAttribute('data-sec');
  await page.locator('#tbView button[data-sec]').first().click();
  await page.waitForFunction(t => __tb.cur === t, target);
  assert.equal(await page.evaluate(() => location.hash.slice(1)), target);
  // a calculator: inputs appear, the result changes
  await page.evaluate(() => { location.hash = FL.book.CHAPTERS.flatMap(c => c.secs).find(s => FL.book.html(s).includes('data-calc="xwind"')).id; });
  await page.waitForSelector('#tbView .bk-calc[data-calc="xwind"] input');
  const out = page.locator('#tbView .bk-calc[data-calc="xwind"] output');
  const before = await out.innerText();
  await page.locator('#tbView .bk-calc[data-calc="xwind"] input').nth(2).fill('30');
  await page.waitForFunction(b => document.querySelector('#tbView .bk-calc[data-calc="xwind"] output').innerText !== b, before);
  assert.notEqual(await out.innerText(), before);
  // a check question (the last section of chapter 2)
  await page.evaluate(() => { location.hash = FL.book.CHAPTERS[1].secs.at(-1).id; });
  await page.waitForSelector('#tbView .quiz');
  const q = await page.evaluate(() => FL.book.CHAPTERS[1].quiz[0]);
  const box = page.locator('#tbView .quiz').first();
  await box.locator('.tb-check').click();
  assert.equal(await box.locator('.res').innerText(), '選択肢を選んでください。');
  await box.locator(`input[value="${(q.answer + 1) % 4}"]`).check();
  await box.locator('.tb-check').click();
  assert.match(await box.locator('.res').innerText(), /^不正解（正答：/);
  await box.locator(`input[value="${q.answer}"]`).check();
  await box.locator('.tb-check').click();
  assert.match(await box.locator('.res').innerText(), /^正解（正答：/);
  assert.equal(await box.locator('.res.ok').count(), 1);
  // the lessons: tags with the lesson's name, no buttons left
  const tags = await page.locator('#tbView .tb-lessons .bk-lesson').allInnerTexts();
  const want = await page.evaluate(() => FL.book.CHAPTERS[1].lessons.map(id => `FLIGHT LAB の課目『${FL.school.lesson(id).title}』`));
  assert.deepEqual(tags, want);
  assert.equal(await page.locator('#tbView button[data-lesson]').count(), 0);
  // a tag opens the lesson's goal, reason and standard, and a link to FLIGHT LAB (in this repository); again closes it
  const tag = page.locator('#tbView .tb-lessons .bk-lesson').first();
  await tag.click();
  const info = page.locator('#tbView .tb-lessons .bk-lesson-info');
  await info.waitFor();
  const l = await page.evaluate(() => FL.school.lesson(FL.book.CHAPTERS[1].lessons[0]));
  const infoText = await info.innerText();
  for (const t of [l.goal, l.why, l.std]) assert.ok(infoText.includes(t), t);
  assert.equal(await tag.getAttribute('aria-expanded'), 'true');
  const href = await info.locator('a').evaluate(a => a.href);
  assert.ok(href.startsWith('file://') && fs.existsSync(decodeURIComponent(new URL(href).pathname)), href);
  assert.equal(await info.locator('a').getAttribute('target'), '_blank');
  await tag.click();
  assert.equal(await page.locator('#tbView .tb-lessons .bk-lesson-info').count(), 0);
  // a "try it in the simulator" box keeps its words, its buttons become tags
  await page.evaluate(() => { location.hash = FL.book.CHAPTERS.flatMap(c => c.secs).find(s => /data-lesson="t4"/.test(FL.book.html(s))).id; });
  await page.waitForSelector('#tbView .bk-sim .bk-lesson');
  assert.ok((await page.locator('#tbView .bk-sim .bk-lesson').allInnerTexts()).includes('FLIGHT LAB の課目『着陸復行（ゴーアラウンド）』'));
  assert.match(await page.locator('#tbView .bk-sim').first().innerText(), /シミュレータで体験：/);
  assert.equal(await page.locator('#tbView button[data-lesson]').count(), 0);
  // FLIGHT LAB's own pages: the note above
  await page.evaluate(() => { location.hash = 'sim.keys'; });
  await page.waitForFunction(() => __tb.cur === 'sim.keys');
  assert.equal(await page.locator('#tbView .tb-appnote').count(), 1);
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  await ctx.close();
});

test(`the whole book (#all): ${COUNTS.chapters} chapters, ${COUNTS.quiz} questions, ${COUNTS.terms} terms, ${COUNTS.refs} source links, ${COUNTS.figs} figures, ${COUNTS.photos} photos; boards dark`, { skip }, async () => {
  const { ctx, page, errors, requests } = await openPage(browser, { hash: 'all' });
  await page.waitForFunction(() => __tb.mode === 'all');
  const c = await page.evaluate(() => ({
    chapters: document.querySelectorAll('#tbView .tb-chapter').length, secs: document.querySelectorAll('#tbView .tb-sec').length,
    quiz: document.querySelectorAll('#tbView .quiz').length, terms: document.querySelectorAll('#tbView table.terms td.en').length,
    refs: document.querySelectorAll('#tbView .tb-end .bk-src a[target="_blank"][rel="noopener noreferrer"]').length,
    figs: document.querySelectorAll('#tbView .bk-fig svg').length, photos: document.querySelectorAll('#tbView .bk-photo img').length, calcs: document.querySelectorAll('#tbView .bk-calc').length,
    calcInputs: document.querySelectorAll('#tbView .bk-calc input').length, lessonButtons: document.querySelectorAll('#tbView button[data-lesson]').length,
    tags: document.querySelectorAll('#tbView .bk-lesson').length, names: new Set([...document.querySelectorAll('#tbView input[type=radio]')].map(i => i.name)).size,
    ids: document.querySelectorAll('[id="aero.lift"]').length, notes: document.querySelectorAll('#tbView .tb-note').length,
  }));
  assert.deepEqual(c, { chapters: COUNTS.chapters, secs: COUNTS.secs, quiz: COUNTS.quiz, terms: COUNTS.terms, refs: COUNTS.refs, figs: COUNTS.figs, photos: COUNTS.photos, calcs: COUNTS.calcs, calcInputs: c.calcInputs, lessonButtons: 0, tags: COUNTS.simTags + COUNTS.lessons, names: COUNTS.quiz, ids: 1, notes: COUNTS.secs });
  assert.ok(c.calcInputs >= 10);
  // the boards: figures, photos and calculators on #0b1422, in the light view and the dark one
  for (const theme of ['light', 'dark']) {
    await page.evaluate(t => { document.documentElement.dataset.theme = t; }, theme);
    const bg = await page.evaluate(() => [...document.querySelectorAll('#tbView .bk-fig, #tbView .bk-photo, #tbView .bk-calc')].map(e => getComputedStyle(e).backgroundColor));
    const boards = COUNTS.figs + COUNTS.photos + COUNTS.calcs;
    assert.ok(bg.length === boards && bg.every(b => b === 'rgb(11, 20, 34)'), `${theme}: ${bg.length} / ${boards}: ${[...new Set(bg)]}`);
  }
  // the photos: shown from their data URLs (decoded, not broken), each with its credit's two links
  const imgs = await page.evaluate(async () => {
    const list = [...document.querySelectorAll('#tbView .bk-photo img')];
    for (const i of list) { i.loading = 'eager'; try { await i.decode(); } catch (e) { /* counted below */ } }
    return list.map(i => [i.currentSrc.slice(0, 22), i.naturalWidth, i.closest('figure').querySelectorAll('.bk-credit a[target="_blank"][rel="noopener noreferrer"]').length]);
  });
  assert.equal(imgs.length, COUNTS.photos);
  for (const [src, w, links] of imgs) { assert.equal(src, 'data:image/webp;base64'); assert.ok(w > 0, 'decoded'); assert.equal(links, 2); }
  // print: the "考えてみよう" boxes open, then close again
  const closed = await page.evaluate(() => document.querySelectorAll('#tbView details:not([open])').length);
  assert.equal(closed, COUNTS.details);
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  assert.equal(await page.evaluate(() => document.querySelectorAll('#tbView details:not([open])').length), 0);
  await page.evaluate(() => window.dispatchEvent(new Event('afterprint')));
  assert.equal(await page.evaluate(() => document.querySelectorAll('#tbView details:not([open])').length), COUNTS.details);
  await page.emulateMedia({ media: 'print' });
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.bk-fig')).backgroundColor), BOARD);
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.tb-head')).display), 'none');
  // back to one section: the whole book leaves the DOM
  await page.emulateMedia({ media: 'screen' });
  await page.locator('#tbAll').click();
  await page.waitForFunction(() => __tb.mode === 'sec');
  assert.equal(await page.locator('#tbView .tb-chapter').count(), 0);
  assert.equal(await page.locator('#tbView .tb-sec').count(), 1);
  assert.deepEqual(errors, []); assert.deepEqual(requests, []);
  await ctx.close();
});

test('light and dark: the OS setting, the button, the text size; nothing wider than the screen', { skip }, async () => {
  for (const colorScheme of ['light', 'dark']) {
    const { ctx, page, errors, requests } = await openPage(browser, { colorScheme, hash: 'perf.wb' });
    const bodyBg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const os = await bodyBg();
    assert.equal(os, colorScheme === 'dark' ? 'rgb(7, 16, 29)' : 'rgb(246, 248, 251)');
    await page.locator('#tbTheme').click();               // 自動 → 明るい
    assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
    assert.equal(await bodyBg(), 'rgb(246, 248, 251)');
    await page.locator('#tbTheme').click();               // → 暗い
    assert.equal(await bodyBg(), 'rgb(7, 16, 29)');
    assert.equal(await page.locator('#tbTheme').innerText(), '表示：暗い');
    assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.bk-calc, .bk-fig')).backgroundColor), BOARD);
    const fs0 = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize));
    await page.locator('#tbBigger').click();
    assert.equal(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize)), fs0 + 1);
    assert.equal(JSON.parse(await page.evaluate(() => localStorage.getItem('textbook.prefs'))).theme, 'dark');
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    await ctx.close();
  }
  // a phone: no sideways scroll of the page (the weight-and-balance calculator and wide tables scroll by themselves)
  for (const hash of ['perf.wb', 'all']) {
    const { ctx, page, errors, requests } = await openPage(browser, { width: 390, height: 844, hash });
    const w = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
    assert.ok(w[0] <= w[1], `${hash}: ${w}`);
    assert.deepEqual(errors, []); assert.deepEqual(requests, []);
    await ctx.close();
  }
});

test('localStorage refused: the page still works', { skip }, async () => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => { Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } }); });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await ctx.route(/^https?:/, r => r.abort());
  await page.goto('file://' + PAGE + '#hf.body');
  await page.waitForFunction(() => window.__tb && __tb.ready && __tb.cur === 'hf.body');
  await page.locator('.tb-pager button.primary').click();
  await page.waitForFunction(() => __tb.cur !== 'hf.body');
  assert.deepEqual(errors, []);
  await ctx.close();
});
