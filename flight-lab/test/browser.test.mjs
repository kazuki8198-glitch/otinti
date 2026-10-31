// FLIGHT LAB — browser test (node --test): opens outputs/FLIGHT-LAB.html from file:// in headless Chromium with the
// network blocked, runs a checklist and a read-back with the keys, flies with the keyboard, visits every page, answers
// a textbook question, a ground-school test and an ATC scene, and checks the Google
// layer with an OFFLINE FIXTURE (test/fixtures: not Google data) served in place of tile.googleapis.com: the tile is
// decoded in the worker with the embedded Draco, drawn, credited, and the key never reaches storage or the record.
// The second reads the basic course (kiso/) through its own page: every chapter and section, every figure and photo, the
// written questions, the glossary, the sources, the progress (apart from the textbook's, as the next start reads it), and two
// pages compared with kiso/preview.html; and what the page adds around the original (kiso-errata.js, DESIGN 6.1): the line
// under the title, the corrections outside the original's text, the questions rebuilt from the chapter's question pages,
// each figure's ids its own and each photo's alt from its caption.
// Needs Playwright (set PLAYWRIGHT to its module path if it is not installed next to this project); skipped otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from '../build.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
let chromium = null;
for (const p of [process.env.PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) { try { ({ chromium } = require(p)); break; } catch (e) { /* try the next */ } }
const FX = path.join(here, 'fixtures'), KEY = ['AIza', 'FAKE_FIXTURE_KEY_', '0123456789abcdefgh'].join('');

test('browser: offline start, the checklist and ATC by keys, keyboard flight, key help, every page, quizzes, the Google layer with a fixture', { skip: !chromium && 'Playwright not found' }, async () => {
  const { out } = build({ quiet: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage(), errors = [], requests = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    let googleOn = false;
    await ctx.route(/^https?:/, r => {
      const u = r.request().url(); requests.push(u);
      if (googleOn && u.startsWith('https://tile.googleapis.com/v1/3dtiles/root.json')) return r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(FX, 'root.json')) });
      if (googleOn && u.startsWith('https://tile.googleapis.com/v1/3dtiles/datasets/FIXTURE/files/tile.glb')) return r.fulfill({ status: 200, contentType: 'model/gltf-binary', headers: { 'access-control-allow-origin': '*' }, body: fs.readFileSync(path.join(FX, 'tile.glb')) });
      return r.abort();
    });
    await page.goto('file://' + out);
    await page.waitForFunction(() => window.__lab && __lab.sceneOk());
    // the first-run notice, then the start menu
    assert.equal(await page.isVisible('#ack'), true);
    await page.click('#ackOk');
    assert.equal(await page.isVisible('#ack'), false);
    assert.equal(await page.isVisible('#menu'), true);
    // the first-run tour (three cards), then the menu's "continue" card
    assert.equal(await page.isVisible('#tour'), true, 'the tour follows the notice');
    for (let i = 0; i < 3; i++) await page.click('#tourBody button.primary');
    assert.equal(await page.isVisible('#tour'), false);
    assert.match(await page.textContent('#menuHero'), /姿勢・出力・トリム/);
    // the settings dialog (Esc closes it)
    await page.click('#menuMini button:has-text("設定")');
    assert.equal(await page.isVisible('#settings'), true);
    await page.click('#optStrip button[data-v="mini"]');
    assert.equal((await page.evaluate(() => __lab.prefs())).strip, 'mini');
    await page.click('#optStrip button[data-v="full"]');
    await page.keyboard.press('Escape');
    assert.equal(await page.isVisible('#settings'), false);
    // the school: six stage tabs, lesson cards, the start button always in view
    await page.click('.tile:has-text("課程表")');
    assert.equal(await page.locator('.sch-tab').count(), 6);
    assert.ok(await page.locator('#sch-stages .sch-item').count() >= 5);
    assert.equal(await page.isVisible('#sch-start .sch-go'), true);
    // lesson t1: the before-takeoff checklist with Enter, the read-back with 1–3, then the takeoff roll with R
    await page.evaluate(() => __lab.start('t1', 'intro'));
    await page.waitForTimeout(300);
    for (let i = 0; i < 12 && await page.evaluate(() => !!__lab.lesson().check); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(60); }
    assert.equal(await page.evaluate(() => __lab.lesson().check), null, 'checklist done with Enter');
    await page.waitForFunction(() => !!__lab.lesson().atc);
    const ok = await page.evaluate(() => __lab.lesson().atc.ok);
    await page.keyboard.press(`Digit${ok + 1}`);
    await page.waitForTimeout(200);
    assert.ok(await page.evaluate(() => __lab.lesson().results.some(r => /復唱/.test(r.step) && r.rows[0].pass)), 'the right read-back');
    await page.waitForTimeout(400);
    // the instruments are drawn (not blank) and the control strip shows the throttle
    const lit = await page.evaluate(() => ['pfd', 'mfd'].map(id => { const c = document.getElementById(id), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n / (d.length / 16); }));
    assert.ok(lit[0] > 0.2 && lit[1] > 0.05, `PFD/MFD drawn ${lit}`);
    assert.match(await page.textContent('#ctl-strip'), /スロットル/);
    assert.equal(await page.isVisible('#sch-panel'), true, 'the instructor panel');
    const thr0 = await page.evaluate(() => __lab.lesson().s.thr);
    await page.keyboard.down('KeyR');
    await page.waitForFunction(() => __lab.lesson().s.thr > 0.9, null, { timeout: 20000 }).catch(() => {});   // headless frames are slow (software WebGL)
    await page.keyboard.up('KeyR');
    const thr1 = await page.evaluate(() => __lab.lesson().s.thr);
    assert.ok(thr1 > 0.9 && thr1 > thr0, `R opened the throttle: ${thr0} → ${thr1}`);
    await page.waitForFunction(() => __lab.state().o.ias > 8, null, { timeout: 20000 }).catch(() => {});   // headless frames are slow
    const st = await page.evaluate(() => __lab.state());
    assert.ok(st.o.ias > 8 && st.o.onRunway, `rolling: ${st.o.ias} kt`);
    // view, key help, pause by keys
    await page.keyboard.press('KeyC'); assert.equal((await page.evaluate(() => __lab.state())).view, 'chase');
    await page.keyboard.press('KeyH'); assert.equal(await page.isVisible('#keyhelp'), true); assert.match(await page.textContent('#keyhelp'), /スロットル/);
    await page.keyboard.press('KeyH'); assert.equal(await page.isVisible('#keyhelp'), false);
    await page.keyboard.press('KeyP'); assert.equal((await page.evaluate(() => __lab.state())).paused, true);
    await page.keyboard.press('KeyP'); assert.equal((await page.evaluate(() => __lab.state())).paused, false);
    // panel controls by clicks: COM swap, CDI softkey
    const before = await page.evaluate(() => __lab.state().av.com1.act);
    await page.click('#audio button:has-text("⇄")');
    assert.notEqual(await page.evaluate(() => __lab.state().av.com1.act), before);
    await page.click('#pfdKeys button:has-text("CDI")');
    assert.equal(await page.evaluate(() => __lab.state().av.cdi), 'NAV1');
    // the hood (instrument lessons) hides the outside view
    await page.evaluate(() => __lab.start('i1', 'intro'));
    assert.equal(await page.isVisible('#hood'), true, 'the hood is up as the lesson starts');
    // every page
    for (const t of ['book', 'kiso', 'quiz', 'guide', 'tutor', 'readq', 'sfb', 'radio', 'records', 'g3d', 'about']) { await page.evaluate(t => __lab.showPage(t), t); await page.waitForTimeout(120); }
    await page.evaluate(() => __lab.openSchool('m3')); await page.waitForTimeout(150);
    // the result screen: R starts the lesson again
    await page.evaluate(() => { __lab.start('a1', 'intro'); FL.pages().showDebrief(__lab.lesson()); });
    assert.equal(await page.isVisible('#debrief'), true);
    await page.keyboard.press('KeyR'); await page.waitForTimeout(150);
    assert.equal(await page.evaluate(() => __lab.state().screen), 'fly', 'R retried the lesson');
    // a chapter question in the textbook: the right answer is stored as progress
    await page.evaluate(() => __lab.showPage('book'));
    const last = await page.evaluate(() => { const c = FL.book.CHAPTERS.find(x => x.id === 'aero'); return `${c.n}.${c.secs.length}`; });
    await page.evaluate(n => [...document.querySelectorAll('#bkNav .bk-item')].find(b => b.querySelector('.bk-num').textContent.trim().startsWith(n)).click(), last);
    const ans = await page.evaluate(() => FL.book.CHAPTERS.find(c => c.id === 'aero').quiz[0].answer);
    await page.check(`input[name="q_aero_0"][value="${ans}"]`);
    await page.click('.quiz >> nth=0 >> button:has-text("答え合わせ")');
    assert.match(await page.textContent('.quiz >> nth=0 >> .res'), /正解/);
    assert.equal((await page.evaluate(() => __lab.progress())).bookQuiz['aero.0'], 100);
    // the chapter's 日米の違い at its end (DESIGN 3.2「章末」, from FL.jur): once, after the check questions, the rows of FL.book.jurTable
    const jt = await page.evaluate(() => {
      const t = document.querySelector('#bkArt .bk-jur-end'), q = document.querySelector('#bkArt .quiz');
      return { n: document.querySelectorAll('#bkArt .bk-jur-end').length, rows: t ? [...t.querySelectorAll('tr[data-jur]')].map(r => r.dataset.jur) : [],
        want: [...FL.book.jurTable('aero').matchAll(/data-jur="([^"]+)"/g)].map(m => m[1]), after: !!(t && q && (t.compareDocumentPosition(q) & Node.DOCUMENT_POSITION_PRECEDING)) };
    });
    assert.ok(jt.want.length >= 1, 'the aero chapter has a box');
    assert.deepEqual([jt.n, jt.rows, jt.after], [1, jt.want, true]);
    // a photo in the textbook (book-photos.js): shown from its data URL with its credit's links (when there are photos)
    const photoSec = await page.evaluate(() => { const s = FL.book.CHAPTERS.flatMap(c => c.secs).find(x => /class="bk-photo"/.test(FL.book.html(x))); return s ? `${FL.book.findSection(s.id).ch.n}.${FL.book.findSection(s.id).ch.secs.indexOf(s) + 1}` : null; });
    if (photoSec) {
      await page.evaluate(n => [...document.querySelectorAll('#bkNav .bk-item')].find(b => b.querySelector('.bk-num').textContent.trim() === n).click(), photoSec);
      const img = await page.evaluate(async () => { const i = document.querySelector('.bk-photo img'); i.loading = 'eager'; await i.decode(); return [i.currentSrc.slice(0, 22), i.naturalWidth, i.closest('figure').querySelectorAll('.bk-credit a[target="_blank"]').length]; });
      assert.deepEqual([img[0], img[1] > 0, img[2]], ['data:image/webp;base64', true, 2]);
    }
    // the records page has the textbook's line: the sections read that the book has (a stale id is not counted) and
    // the chapter questions answered right (DESIGN 6.4)
    const tb = await page.evaluate(() => { const BK = FL.book, p = __lab.progress(); p.read.push('no.such.section'); return { read: p.read.filter(id => BK.findSection(id)).length, secs: BK.CHAPTERS.reduce((a, c) => a + c.secs.length, 0), quiz: BK.CHAPTERS.reduce((a, c) => a + c.quiz.length, 0) }; });
    assert.ok(tb.read >= 1 && tb.read < (await page.evaluate(() => __lab.progress().read.length)));
    await page.evaluate(() => __lab.showPage('records'));
    assert.match(await page.textContent('#pageBody'), new RegExp(`教科書：読んだ節 ${tb.read} / ${tb.secs}・正解した章末の確認問題 1 / ${tb.quiz}`));
    // a ground-school test run to the end
    await page.evaluate(() => __lab.showPage('quiz'));
    await page.click('.qbanks .mission >> nth=0');
    for (let i = 0; i < 20; i++) {
      await page.click('.sq-opts button >> nth=0');
      const nx = page.locator('#pageBody button:has-text("次の問題"), #pageBody button:has-text("結果を見る")');
      if (!(await nx.count())) break; const txt = await nx.first().textContent(); await nx.first().click(); if (/結果/.test(txt)) break;
    }
    assert.match(await page.textContent('.sq-result'), /問正解/);
    assert.ok(Number.isFinite((await page.evaluate(() => __lab.progress())).quiz.q_aero), 'the score is kept');
    // an ATC read-back scene on the Sanford page
    await page.evaluate(() => __lab.showPage('sfb'));
    const sc = await page.evaluate(() => FL.sanford.SCENES[0]);
    await page.check(`input[name="atc_${sc.id}"][value="${sc.answer}"]`);
    await page.click('.scene >> nth=0 >> button:has-text("答え合わせ")');
    assert.match(await page.textContent('.scene >> nth=0 >> .res'), /正解/);
    assert.equal((await page.evaluate(() => __lab.progress())).atc[sc.id], true);
    // the English radio page: the whole flight, a read-back scene, a number drill run to the end, the glossary
    await page.evaluate(() => __lab.showPage('radio'));
    assert.ok(await page.locator('#pageBody .bk-radio tr').count() >= 50, 'the whole flight is listed');
    await page.click('#pageBody .rd-tabs button:has-text("復唱と応答")');
    const rs = await page.evaluate(() => FL.radio.SCENES[0]);
    await page.check(`input[name="ratc_${rs.id}"][value="${rs.answer}"]`);
    await page.click('.scene >> nth=0 >> button:has-text("答え合わせ")');
    assert.match(await page.textContent('.scene >> nth=0 >> .res'), /正解/);
    assert.equal((await page.evaluate(() => __lab.progress())).atc[rs.id], true);
    await page.click('#pageBody .rd-tabs button:has-text("数字とアルファベット")');
    await page.click('#pageBody button:has-text("10 問を始める")');
    for (let i = 0; i < 12; i++) {
      await page.click('.sq-opts button >> nth=0');
      const nx = page.locator('#pageBody button:has-text("次の問題"), #pageBody button:has-text("結果を見る")');
      if (!(await nx.count())) break; const txt = await nx.first().textContent(); await nx.first().click(); if (/結果/.test(txt)) break;
    }
    assert.match(await page.textContent('.sq-result'), /数字とアルファベット：\d+ \/ 10 問正解/);
    assert.equal((await page.evaluate(() => __lab.progress())).lessons.k3.tries, 1, 'the drill is recorded as the ground lesson');
    await page.click('#pageBody .rd-tabs button:has-text("用語集")');
    await page.fill('#pageBody input[type=search]', 'wilco');
    assert.match(await page.textContent('#pageBody'), /理解し、従う/);
    await page.evaluate(() => __lab.openSchool('k5')); await page.waitForTimeout(100);
    assert.match(await page.textContent('#sch-brief'), /復唱と応答/);
    // the Google layer, from its page, with the offline fixture
    googleOn = true;
    await page.evaluate(() => __lab.showPage('g3d'));
    await page.fill('#gkey', KEY);
    await page.click('#pageBody button:has-text("接続")');
    assert.equal(await page.inputValue('#gkey'), '', 'the key field is cleared after use');
    await page.click('#pageBody button:has-text("Sanford 上空へ")');
    await page.waitForFunction(() => { const g = __lab.google(); return g && g.drawn > 0 && g.credits; }, null, { timeout: 30000 });
    const g = await page.evaluate(() => __lab.google());
    assert.equal(g.state, 'on'); assert.equal(g.worker, 'worker', 'decoded in a worker'); assert.match(g.credits, /test fixture/);
    assert.equal(await page.isVisible('#gattr'), true); assert.match(await page.textContent('#gattr'), /Google Maps/);
    // the key: only in requests to Google's tile host; never in storage, never in a record or an export
    await page.keyboard.press('KeyP'); await page.click('#pz-save'); await page.click('#pz-resume');
    assert.ok((await page.evaluate(() => __lab.records())).some(r => r.lessonId === 'free'), 'the free-flight record is saved');
    const dump = JSON.stringify(await page.evaluate(() => __lab.storageDump()));
    assert.ok(!dump.includes(KEY) && !dump.includes('FAKE_FIXTURE'), 'no key in localStorage');
    const exported = await page.evaluate(() => FL.school.exportJSON(__lab.records(), __lab.progress()));
    assert.ok(!exported.includes(KEY));
    assert.ok(!page.url().includes('AIza'));
    const keyed = requests.filter(u => u.includes('key='));
    assert.ok(keyed.length >= 2 && keyed.every(u => u.startsWith('https://tile.googleapis.com/')), requests.join('\n'));
    // disconnect clears the key from memory
    await page.evaluate(() => __lab.showPage('g3d'));
    await page.click('#pageBody button:has-text("切断")');
    assert.equal((await page.evaluate(() => __lab.google())).hasKey, false);
    // the menu's textbook tile counts the sections read that the book has (the stale id above is not counted)
    await page.evaluate(() => __lab.openMenu());
    assert.equal(await page.textContent('#mainMenu .tile:has-text("教科書") .t-sub'), await page.evaluate(() => `全 ${FL.book.CHAPTERS.length} 章・${FL.book.CHAPTERS.reduce((a, c) => a + c.secs.length, 0)} 節（読んだ節 ${__lab.progress().read.filter(id => FL.book.findSection(id)).length}）`));
    assert.ok(await page.evaluate(() => __lab.progress().read.includes('no.such.section')), 'the record keeps it');
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => __lab.errors), []);
  } finally { await browser.close(); }
});

// a page's content in order: its text, each SVG's markup, each image's source and size (the wrappers left out, so the
// app's frames and the preview's compare)
function contentTokens(root) {
  const out = [];
  const walk = n => { for (const c of n.childNodes) {
    if (c.nodeType === 3) { const t = c.textContent.replace(/\s+/g, ' ').trim(); if (t) out.push('t:' + t); }
    else if (c.nodeType === 1) { if (c.tagName.toLowerCase() === 'svg') out.push('svg:' + c.outerHTML); else if (c.tagName === 'IMG') out.push(`img:${c.getAttribute('src')}:${c.getAttribute('width')}x${c.getAttribute('height')}`); else walk(c); }
  } };
  walk(root);
  return out;
}

test('browser: 基礎教材 — every chapter and section by 次の節, 161 figures and 85 photos with captions and credits, the written questions, the glossary, the sources, the record, as preview.html shows them', { skip: !chromium && 'Playwright not found' }, async () => {
  const { out } = build({ quiet: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript(() => { try { localStorage.setItem('flightlab-prefs-v2', JSON.stringify({ ack: true, tour: true })); } catch (e) { /* storage blocked */ } });
    await page.goto('file://' + out);
    await page.waitForFunction(() => window.__lab && __lab.sceneOk());
    const total = await page.evaluate(() => FL.kiso.chapters.reduce((a, c) => a + c.sections.length, 0));
    // the menu: 基礎教材 next to 教科書; the page says which law it assumes; the contents list the 14 chapters
    await page.evaluate(() => __lab.openMenu());
    const tiles = await page.$$eval('#mainMenu .tile .t-title', a => a.map(e => e.textContent));
    assert.equal(tiles[tiles.indexOf('教科書') + 1], '基礎教材', tiles.join(' '));
    await page.click('.tile:has-text("基礎教材")');
    assert.equal(await page.textContent('#pageTitle'), '基礎教材（日本の航空法 前提）');
    // under the title, one line: this is the original, kept; learn from the textbook (DESIGN 6.1). The corrections are
    // FL.kisoErrata's (kiso-errata.js), drawn outside the original's text; the contents say how many and where
    assert.equal(await page.textContent('#kzOrig'), '第 3 版・原本（保存版）です。学習は教科書（合本）で。原理は国を問わず共通、日本の数値は合本の第 7 部');
    assert.ok(await page.evaluate(() => !!FL.kisoErrata && FL.kisoErrata.items.length >= 20), 'kiso-errata.js is on the page');
    assert.match(await page.textContent('#kzArt .kz-fix-about'), new RegExp(`訂正と補足 ${await page.evaluate(() => FL.kisoErrata.items.length)} 件`));
    assert.equal(await page.locator('#kzArt .kz-toc-item').count(), 14);
    await page.click('#kzArt .kz-toc-item >> nth=0');
    assert.deepEqual(await page.$$eval('#kzArt .kz-tabs button', a => a.map(b => b.textContent.replace(/（.*/, ''))), ['本文', '確認問題', '用語', '出典']);
    // every section, one after the other with 次の節 →: no placeholder left, each figure's SVG and caption, each photo
    // decoded with its caption and credit, the text exactly the data's. The page's own additions, outside that text: the
    // section's corrections (FL.kisoErrata.at), each figure's ids its own (no id twice on the page, every url(#…) found
    // in its own figure) and each photo's alt from its caption (DESIGN 10.3)
    const walk = await page.evaluate(async () => {
      const K = FL.kiso, E = FL.kisoErrata, figs = new Set(), photos = new Set(), bad = [];
      const plain = html => { const d = document.createElement('div'); d.innerHTML = html; for (const e of d.querySelectorAll('.kiso-fig, .kiso-photo')) e.remove(); return d.textContent; };
      let n = 0, fixed = 0, svgIds = 0;
      for (;;) {
        const body = document.querySelector('#kzArt .kz-body'), id = body.dataset.kisoSec, c = K.chapters.find(x => id.startsWith(x.id + '.')), s = c.sections.find(x => x.id === id);
        n++;
        if (body.querySelector('.kiso-fig, .kiso-photo')) bad.push(`${id}: a placeholder is left`);
        for (const f of body.querySelectorAll('figure.kz-fig')) {
          const m = c.figures.find(x => x.id === f.dataset.fig);
          if (m && f.querySelector('svg') && f.querySelector('svg').outerHTML.length > 200 && f.querySelector('figcaption').textContent === plain(m.caption)) figs.add(m.id); else bad.push(`${id}: figure ${f.dataset.fig}`);
          const svg = f.querySelector('svg');
          for (const e of svg.querySelectorAll('[id]')) { svgIds++; if (!e.id.startsWith(f.dataset.fig + '--')) bad.push(`${id}: id ${e.id} in ${f.dataset.fig}`); }
          for (const e of svg.querySelectorAll('*')) for (const a of e.attributes) for (const r of a.value.matchAll(/url\(#([^)]+)\)/g)) if (!svg.querySelector(`[id="${r[1]}"]`)) bad.push(`${id}: ${f.dataset.fig} url(#${r[1]}) not in its figure`);
        }
        for (const f of body.querySelectorAll('figure.kz-photo')) {
          const m = c.photos.find(x => x.id === f.dataset.photo), im = f.querySelector('img');
          await im.decode().catch(() => {});
          const cap = f.querySelector('figcaption').children;
          if (m && im.naturalWidth > 0 && cap[0].textContent === plain(m.caption) && cap[1].textContent === plain(m.credit) && cap[1].textContent.trim()) photos.add(m.id); else bad.push(`${id}: photo ${f.dataset.photo}`);
          if (!im.alt || im.alt !== cap[0].textContent.replace(/\s+/g, ' ').trim()) bad.push(`${id}: photo ${f.dataset.photo} alt`);
        }
        const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
        if (new Set(ids).size !== ids.length) bad.push(`${id}: an id twice on the page`);
        const ours = body.cloneNode(true); for (const e of ours.querySelectorAll('figure')) e.remove();
        if (ours.textContent !== plain(s.html)) bad.push(`${id}: the text differs from the data`);
        // the corrections: the ones for this section, in a box before the original's text and outside it
        const want = E.at(id).map(x => x.id), got = [...document.querySelectorAll('#kzArt .kz-pane > aside.kz-fix .kz-fix-item')].map(e => e.dataset.fix);
        if (want.join() !== got.join()) bad.push(`${id}: corrections ${got} (want ${want})`);
        if (body.querySelector('.kz-fix') || (want.length && !(document.querySelector('#kzArt aside.kz-fix').compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING))) bad.push(`${id}: the corrections' place`);
        if (want.length) fixed++;
        const next = [...document.querySelectorAll('#kzArt .kz-pane .row button')].find(b => b.textContent === '次の節 →');
        if (!next) break;
        next.click();
      }
      const secPlaces = [...E.places()].filter(p => K.chapters.some(c => c.sections.some(s => s.id === p))).length;
      return { n, figs: figs.size, photos: photos.size, bad, fixed, secPlaces, svgIds, last: document.querySelector('#kzArt .kz-body').dataset.kisoSec };
    });
    assert.deepEqual(walk.bad, []);
    assert.equal(walk.n, total, 'every section'); assert.equal(walk.last, 'kiso13.28');
    assert.equal(walk.figs, 161, 'figures'); assert.equal(walk.photos, 85, 'photos');
    assert.ok(walk.fixed >= 20 && walk.fixed === walk.secPlaces, `${walk.fixed} sections with corrections (${walk.secPlaces})`);
    assert.ok(walk.svgIds > 132, `${walk.svgIds} ids in the figures, each its own`);
    await page.click('#kzArt .kz-pane button:has-text("← 前の節")');
    assert.equal(await page.getAttribute('#kzArt .kz-body', 'data-kiso-sec'), 'kiso13.27');
    // read sections: the course's own progress, not the textbook's
    let prog = await page.evaluate(() => __lab.progress());
    assert.equal(prog.kisoRead.length, total); assert.ok(!prog.read.some(id => /^kiso/.test(id)), 'not in the textbook\'s read');
    // the written questions of chapter 5: no choices, no grading; the answer opens on the button and is recorded. They are
    // rebuilt from the chapter's question pages (FL.kisoErrata.questions): the same 28, numbers and record keys
    await page.click('#kzNav .kz-ch:has-text("第 5 章")');
    await page.click('#kzArt .kz-tabs button:has-text("確認問題")');
    assert.equal(await page.locator('#kzArt .kz-qa').count(), 28);
    assert.deepEqual(await page.$$eval('#kzArt .kz-qa', a => a.map(e => e.dataset.q)), await page.evaluate(() => FL.kiso.chapters[5].qa.map(q => `kiso05.q${q.n}`)), 'the record keys');
    assert.equal(await page.locator('#kzArt .kz-pane input').count(), 0, 'written answers: nothing to choose');
    assert.equal(await page.isVisible('#kzArt .kz-qa >> nth=0 >> .kz-a'), false);
    await page.click('#kzArt .kz-qa >> nth=0 >> button:has-text("解答と解説を見る")');
    assert.equal(await page.isVisible('#kzArt .kz-qa >> nth=0 >> .kz-a'), true);
    assert.equal(await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = FL.kisoErrata.questions(FL.kiso.chapters[5]).items.find(i => i.n === 1).a; return document.querySelector('#kzArt .kz-qa .kz-a .kz-a-b').textContent === d.textContent; }), true, 'the answer as the answer page has it');
    prog = await page.evaluate(() => __lab.progress());
    assert.deepEqual(prog.kisoQa, ['kiso05.q1']); assert.deepEqual(prog.bookQuiz, {}, 'not the textbook\'s questions');
    // chapter 1 (its data lost the headings: <p>翼面積の定義</b></p>): each heading whole and bold, the groups' headings
    // and words back above their questions, not at the end of the question before (DESIGN 10.2 aero K-1)
    await page.click('#kzNav .kz-ch:has-text("第 1 章")');
    await page.click('#kzArt .kz-tabs button:has-text("確認問題")');
    assert.equal(await page.locator('#kzArt .kz-qa').count(), 24);
    assert.equal(await page.textContent('#kzArt .kz-qa >> nth=0 >> .kz-q b'), '翼面積の定義');
    assert.deepEqual(await page.$$eval('#kzArt .kz-qg-h', a => a.map(e => e.textContent)), ['演習 1　原理と定義', '演習 2　計算と条件', '演習 3　状況判断']);
    assert.doesNotMatch(await page.textContent('#kzArt .kz-qa >> nth=7 >> .kz-q'), /本文を閉じて答えてください/);
    assert.equal(await page.evaluate(() => [...document.querySelectorAll('#kzArt .kz-qa .kz-q, #kzArt .kz-qa .kz-a-b')].filter(e => !(e.firstElementChild && e.firstElementChild.firstElementChild && e.firstElementChild.firstElementChild.tagName === 'B' && e.firstElementChild.textContent === e.firstElementChild.firstElementChild.textContent)).length), 0, 'every question and answer of chapter 1 starts with its title in bold');
    // a correction at a written question (kiso08 問 11: the reserve fuel), outside the question and the answer
    await page.click('#kzNav .kz-ch:has-text("第 8 章")');
    await page.click('#kzArt .kz-tabs button:has-text("確認問題")');
    assert.equal(await page.locator('#kzArt [data-q="kiso08.q11"] > aside.kz-fix [data-fix="fuel-vfr"]').count(), 1);
    assert.equal(await page.locator('#kzArt .kz-q aside, #kzArt .kz-a aside').count(), 0);
    assert.deepEqual(await page.$$eval('#kzArt aside.kz-fix', a => a.map(e => e.dataset.fixAt)), await page.evaluate(() => FL.kiso.chapters[8].qa.map(q => `kiso08.q${q.n}`).filter(k => FL.kisoErrata.at(k).length)));
    // a correction at a chapter's sources (kiso11 [11]: the document's name), before the sources
    await page.click('#kzNav .kz-ch:has-text("第 11 章")');
    await page.click('#kzArt .kz-tabs button:has-text("出典")');
    assert.equal(await page.locator('#kzArt .kz-pane > aside.kz-fix:first-child [data-fix="jcab-syllabus-name"]').count(), 1);
    await page.click('#kzNav .kz-ch:has-text("第 8 章")');
    // the sections with corrections are marked in the contents
    assert.deepEqual(await page.$$eval('#kzNav .kz-si', a => a.filter(e => e.querySelector('.kz-fix-mark')).length), await page.evaluate(() => FL.kiso.chapters[8].sections.filter(s => FL.kisoErrata.at(s.id).length).length));
    await page.click('#kzNav .kz-ch:has-text("第 5 章")');
    // the glossary: the header and the rows, narrowed by the search
    await page.click('#kzArt .kz-tabs button:has-text("用語")');
    assert.equal(await page.locator('#kzArt .kz-gl tbody tr').count(), 40);
    assert.equal(await page.locator('#kzArt .kz-gl thead th').count(), await page.evaluate(() => FL.kiso.chapters[5].glossaryHeader.length));
    await page.fill('#kzArt .kz-search', '重心');
    const shown = await page.$$eval('#kzArt .kz-gl tbody tr', a => a.filter(r => !r.hidden).map(r => r.textContent));
    assert.ok(shown.length > 0 && shown.length < 40 && shown.every(t => t.includes('重心')), `${shown.length} rows`);
    await page.fill('#kzArt .kz-search', 'zzzz');
    assert.equal(await page.isVisible('#kzArt .kz-pane p:has-text("見つかりませんでした")'), true);
    // the sources: the chapter's sources and the photos' credits; the links open outside the app
    await page.click('#kzArt .kz-tabs button:has-text("出典")');
    const src = await page.textContent('#kzArt .kz-pane');
    assert.match(src, /写真の出典/); assert.match(src, /Ptrump16/);
    assert.ok(await page.$$eval('#kzArt .kz-pane a[href^="http"]', a => a.length > 0 && a.every(x => x.target === '_blank' && /noopener/.test(x.rel))));
    // the record: in localStorage as the next start reads it (SC.loadProgress, as app.js does), in the export, on the
    // records page; the About page's line. Not by page.reload(): headless Chromium loses a file:// page's localStorage
    // across a reload in some runs (a bare file:// page with one setItem lost it in 3 to 5 of 20 runs here)
    prog = await page.evaluate(() => FL.school.loadProgress(localStorage));
    assert.equal(prog.kisoRead.length, total); assert.deepEqual(prog.kisoQa, ['kiso05.q1']);
    assert.deepEqual(JSON.parse(await page.evaluate(() => FL.school.exportJSON(__lab.records(), __lab.progress()))).progress.kisoQa, ['kiso05.q1']);
    await page.evaluate(() => __lab.showPage('records'));
    assert.match(await page.textContent('#pageBody'), new RegExp(`基礎教材（日本の航空法 前提）：読んだ節 ${total} / ${total}・解答を開いた確認問題 1 / 376`));
    await page.evaluate(() => __lab.showPage('about'));
    assert.match(await page.textContent('#pageBody'), /基礎教材（日本の航空法 前提）の写真のクレジット（撮影者・ライセンス・出典）は、各写真の下と、章ごとの「出典」タブ/);
    // 第 5 章 11 節 (図 5-6) and the cover of 第 0 章 (写真 1): the same content as kiso/preview.html
    const prev = await ctx.newPage();
    prev.on('pageerror', e => errors.push('preview: ' + e.message));
    for (const [no, secNo] of [[5, 11], [0, null]]) {
      await page.evaluate(() => __lab.showPage('kiso'));
      const [ci, si] = await page.evaluate(([no, secNo]) => { const i = FL.kiso.chapters.findIndex(c => c.no === no); return [i, FL.kiso.chapters[i].sections.findIndex(s => (secNo == null ? /\.cover$/.test(s.id) : s.no === secNo))]; }, [no, secNo]);
      await page.evaluate(([i, j]) => FL.pages().openKiso(i, 'sec', j), [ci, si]);
      const ours = await page.evaluate(`(${contentTokens})(document.querySelector('#kzArt .kz-body'))`);
      const head = await page.evaluate(() => ['.bk-chap', '.bk-title', '.kz-sec-t'].map(k => document.querySelector('#kzArt ' + k).textContent));
      await prev.goto(`file://${path.join(here, '..', 'kiso', 'preview.html')}?ch=${ci}&s=${si}`);
      const theirs = await prev.evaluate(`(() => { const d = document.createElement('div'); d.innerHTML = document.getElementById('main').innerHTML.split('</h3>').slice(1).join('</h3>'); return (${contentTokens})(d); })()`);
      const theirHead = await prev.evaluate(() => [document.querySelector('#main .note').textContent, document.querySelector('#main h2').textContent, document.querySelector('#main h3').textContent]);
      assert.deepEqual(head, theirHead, `chapter ${no} section ${secNo}: the headings`);
      assert.deepEqual(ours, theirs, `chapter ${no} section ${secNo}: the content`);
      assert.equal(ours.filter(t => /^(svg|img):/.test(t)).length, 1, 'the figure or the photo');
    }
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => __lab.errors), []);
  } finally { await browser.close(); }
});

// W10b (textbook/rewrite/combined/DESIGN.md 3.2「節のデータ」「章末」, 5 criterion 24, 6.4): the textbook page draws the
// section's marks beside its title (FL.book.secMarks: the scope badge, 発展, the provenance line) and the chapter-end
// 説明してみよう (FL.book.writtenHtml): an answer opens with its button, is kept in the progress (bookWritten), printed open;
// a question rewritten from the basic course says so when its original was opened there (kisoQa, never read as ours).
test('browser: 教科書 — the scope badge and the provenance line beside the title, 発展 in the contents, 説明してみよう with its answers and its record, the door of Part 1 and 「JCAB 学科の道」', { skip: !chromium && 'Playwright not found' }, async () => {
  const { out } = build({ quiet: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript(() => { try { localStorage.setItem('flightlab-prefs-v2', JSON.stringify({ ack: true, tour: true })); } catch (e) { /* storage blocked */ } });
    await page.goto('file://' + out);
    await page.waitForFunction(() => window.__lab && __lab.sceneOk());
    await page.evaluate(() => __lab.showPage('book'));
    // a section through its item in the contents (N.M)
    const open = id => page.evaluate(id => {
      const f = FL.book.findSection(id), n = `${f.ch.n}.${f.ch.secs.indexOf(f.sec) + 1}`;
      [...document.querySelectorAll('#bkNav .bk-item')].find(b => b.querySelector('.bk-num').textContent.trim() === n).click();
    }, id);
    // the marks: the badge beside the title (on its line), the provenance line under it
    await open('basics.rules');
    const m = await page.evaluate(() => {
      const t = document.querySelector('#bkArt .bk-head .bk-title'), s = document.querySelector('#bkArt .bk-head .bk-scope'), f = document.querySelector('#bkArt .bk-head .bk-from');
      const r = e => e.getBoundingClientRect();
      return { title: t.textContent, scope: s && s.textContent, from: f && f.textContent, beside: !!s && r(s).left > r(t).right - 1 && r(s).top < r(t).bottom && r(s).bottom > r(t).top, under: !!f && r(f).top >= r(t).bottom - 1 };
    });
    assert.deepEqual(m, { title: '飛行方式と気象状態は別の軸', scope: '共通', from: 'パイロット基礎教材（第 3 版）第 0 章 14 節、第 9 章 8 節、第 12 章 1 節をもとに改稿', beside: true, under: true });
    await open('intro.japan');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#bkArt .bk-head .bk-scope, #bkArt .bk-head .bk-from')].map(e => e.textContent)), ['日本の決まり', 'パイロット基礎教材（第 3 版）第 9 章 3 節をもとに改稿']);
    await open('ground.walk');                     // no section data yet (Part 2 is rewritten in R3): nothing is guessed
    assert.equal(await page.locator('#bkArt .bk-scope, #bkArt .bk-from').count(), 0);
    await open('intro.marks');                     // the promises explain the badge, the line and 発展, now drawn
    const marks = await page.textContent('#bkArt');
    for (const t of ['範囲の札', '由来の行', '発展']) assert.ok(marks.includes(t), t);
    // 発展: a deep section has its badge in the contents and beside its title (aero.lift is not deep: it is made so here)
    await page.evaluate(() => { FL.book.findSection('aero.lift').sec.deep = true; __lab.showPage('book'); });
    await open('aero.lift');
    assert.deepEqual(await page.evaluate(() => { const b = document.querySelector('#bkNav .bk-item.sel'); return [b && b.querySelector('.bk-deep-tag') && b.querySelector('.bk-deep-tag').textContent, b && b.lastChild.textContent, document.querySelector('#bkArt .bk-head .bk-deep-tag').textContent]; }),
      ['発展', '揚力はどうやって生まれるか', '発展']);
    await page.evaluate(() => { delete FL.book.findSection('aero.lift').sec.deep; __lab.showPage('book'); });
    // 説明してみよう on the chapter's last section: after the check questions, before the chapter's 日米の違い
    await open('basics.case');
    const n = await page.evaluate(() => FL.book.writtenItems(FL.book.CHAPTERS.find(c => c.id === 'basics')).length);
    assert.ok(n >= 14);
    const w = await page.evaluate(() => {
      const box = document.querySelector('#bkArt .bk-written'), q = [...document.querySelectorAll('#bkArt .quiz')].pop(), jt = document.querySelector('#bkArt .bk-jur-end');
      return { n: box.querySelectorAll('.bk-w').length, hidden: [...box.querySelectorAll('.bk-w-a')].every(a => a.hidden && a.offsetHeight === 0), head: box.querySelector('h3').textContent, cnt: box.querySelector('.bk-w-cnt').textContent,
        afterQuiz: !!(q.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING), beforeJur: !jt || !!(box.compareDocumentPosition(jt) & Node.DOCUMENT_POSITION_FOLLOWING) };
    });
    assert.deepEqual(w, { n, hidden: true, head: '説明してみよう', cnt: `答えを開いた問題 0 / ${n}`, afterQuiz: true, beforeJur: true });
    const first = page.locator('#bkArt .bk-w[data-w="basics.w0"]');
    await first.locator('.bk-w-btn').click();
    assert.equal(await first.locator('.bk-w-a').isVisible(), true);
    assert.deepEqual([await first.locator('.bk-w-btn').textContent(), await first.locator('.bk-w-btn').getAttribute('aria-expanded')], ['答えを閉じる', 'true']);
    assert.deepEqual((await page.evaluate(() => __lab.progress())).bookWritten, ['basics.w0']);
    assert.equal(await page.textContent('#bkArt .bk-w-cnt'), `答えを開いた問題 1 / ${n}`);
    assert.match(await first.getAttribute('class'), /\bseen\b/);
    await first.locator('.bk-w-btn').click();
    assert.equal(await first.locator('.bk-w-a').isVisible(), false);
    // printed open, without the buttons
    await page.emulateMedia({ media: 'print' });
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('#bkArt .bk-w-a')).display, getComputedStyle(document.querySelector('#bkArt .bk-w-btn')).display]), ['block', 'none']);
    await page.emulateMedia({ media: 'screen' });
    // the answer's link opens its section; coming back, the opened one is marked; the record is where the next start reads it
    await first.locator('.bk-w-btn').click();
    await first.locator('.bk-w-a button[data-sec]').first().click();
    assert.equal(await page.textContent('#bkArt .bk-title'), '一便の流れと、訓練の 1 回のフライト（予告）');
    await open('basics.case');
    assert.match(await page.locator('#bkArt .bk-w[data-w="basics.w0"]').getAttribute('class'), /\bseen\b/);
    assert.doesNotMatch(await page.locator('#bkArt .bk-w[data-w="basics.w1"]').getAttribute('class'), /\bseen\b/);
    assert.deepEqual((await page.evaluate(() => FL.school.loadProgress(localStorage))).bookWritten, ['basics.w0']);
    assert.deepEqual(JSON.parse(await page.evaluate(() => FL.school.exportJSON([], __lab.progress()))).progress.bookWritten, ['basics.w0']);
    // a question rewritten from the basic course says so (its from: basics.w0 ← kiso00.q1; two merged in one: basics.w4);
    // when its original was opened there (kisoQa), that is said too, and it is not recorded as ours (intro.w0 ← kiso09.q3)
    assert.equal(await page.textContent('#bkArt .bk-w[data-w="basics.w0"] .bk-w-from'), 'パイロット基礎教材（第 3 版）第 0 章 問 1 をもとに改稿');
    assert.equal(await page.textContent('#bkArt .bk-w[data-w="basics.w4"] .bk-w-from'), 'パイロット基礎教材（第 3 版）第 0 章 問 9・10 をもとに改稿');
    await page.evaluate(() => { __lab.progress().kisoQa.push('kiso09.q3'); });
    await open('intro.study');
    assert.equal(await page.textContent('#bkArt .bk-w[data-w="intro.w0"] .bk-w-from'), 'パイロット基礎教材（第 3 版）第 9 章 問 3 をもとに改稿 原本で開いた問題');
    assert.equal(await page.locator('#bkArt .bk-w-kiso').count(), 1);
    assert.deepEqual((await page.evaluate(() => __lab.progress())).bookWritten, ['basics.w0']);
    await page.evaluate(() => { __lab.progress().kisoQa.pop(); });
    // R2 (W25, DESIGN 3.2「部の扉」, 3.3 付録): the door of Part 1 under its title in the contents and 「JCAB 学科の道」 at the
    // end: not sections (no number, not marked read); the door has the lessons with their test banks; a link opens its section
    const read0 = (await page.evaluate(() => __lab.progress())).read.length;
    await page.locator('#bkNav .bk-page[data-page="door:p1"]').click();
    const d = await page.evaluate(() => ({ chap: document.querySelector('#bkArt .bk-chap').textContent, h: document.querySelector('#bkArt .bk-door h3').textContent,
      links: document.querySelectorAll('#bkArt .bk-door button[data-sec]').length, banks: (document.querySelector('#bkArt .bk-door').textContent.match(/学科テスト：/g) || []).length,
      sel: [...document.querySelectorAll('#bkNav .sel')].map(b => b.dataset.page || 'item') }));
    assert.deepEqual([d.chap, d.h, d.sel], ['部の扉', '第 1 部　地上学科（英語の座学）', ['door:p1']]);
    assert.ok(d.links >= 100 && d.banks === 6, JSON.stringify(d));
    await page.locator('#bkArt .bk-door button[data-sec="g1.review"]').click();
    assert.equal(await page.textContent('#bkArt .bk-title'), '第 1 部の振り返り：問いと口述の練習');
    await page.locator('#bkNav .bk-page[data-page="jcab"]').click();
    assert.equal(await page.textContent('#bkArt .bk-road h3'), 'JCAB 学科の道');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#bkArt .bk-road h4')].map(e => e.textContent)), ['航空工学', '航空気象', '空中航法', '航空通信', '航空法規', '計器飛行一般']);
    const read1 = (await page.evaluate(() => __lab.progress())).read;
    assert.equal(read1.length, read0 + (read1.includes('g1.review') && !read1.slice(0, read0).includes('g1.review') ? 1 : 0), 'only the section opened is marked read');
    assert.ok(read1.every(id => !/^(door:|jcab)/.test(id)));
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => __lab.errors), []);
  } finally { await browser.close(); }
});

// W10c (textbook/rewrite/combined/DESIGN.md 3.2「節のデータ」use・jcab・faa, 5 criterion 24): under the title, the line
// 使う場面 (FL.book.secMarks) — a lesson and a test bank open the syllabus at their card (the brief and its start button,
// not a flight), まとめ 1 opens the summary chapter, 「JCAB 航空工学」 the page of the road — and the notes on the exams behind
// their button (JCAB's headings, the ACS elements, 「FAA の学科を受けるかは未公表」), printed open.
test('browser: 教科書 — the line 使う場面 under the title (lessons and tests open their card in the syllabus, まとめ 1 and 「JCAB 学科の道」 open), the notes on the exams shown and hidden', { skip: !chromium && 'Playwright not found' }, async () => {
  const { out } = build({ quiet: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 768 } });
    const page = await ctx.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    await ctx.route(/^https?:/, r => r.abort());
    await page.addInitScript(() => { try { localStorage.setItem('flightlab-prefs-v2', JSON.stringify({ ack: true, tour: true })); } catch (e) { /* storage blocked */ } });
    await page.goto('file://' + out);
    await page.waitForFunction(() => window.__lab && __lab.sceneOk());
    const open = async id => {
      await page.evaluate(() => __lab.showPage('book'));
      await page.evaluate(id => {
        const f = FL.book.findSection(id), n = `${f.ch.n}.${f.ch.secs.indexOf(f.sec) + 1}`;
        [...document.querySelectorAll('#bkNav .bk-item')].find(b => b.querySelector('.bk-num').textContent.trim() === n).click();
      }, id);
    };
    await open('aero.stall');
    const want = await page.evaluate(() => ({ html: FL.book.secMarks('aero.stall'), lessons: FL.syllabus.STAGES.flatMap(s => s.lessons).filter(l => (l.book || []).includes('aero.stall')).map(l => l.id) }));
    const u = await page.evaluate(() => {
      const t = document.querySelector('#bkArt .bk-head .bk-title'), f = document.querySelector('#bkArt .bk-head .bk-from'), line = document.querySelector('#bkArt .bk-head .bk-use'), x = document.querySelector('#bkArt .bk-head .bk-exam'), r = e => e.getBoundingClientRect();
      return { text: line.textContent, under: r(line).top >= r(f).bottom - 1 && r(f).top >= r(t).bottom - 1, inside: r(line).right <= r(document.querySelector('#bkArt')).right + 1,
        hidden: x.hidden && x.offsetHeight === 0, lessons: [...line.querySelectorAll('[data-use-lesson]')].map(b => b.dataset.useLesson), btn: line.querySelector('.bk-exam-btn').getAttribute('aria-expanded') };
    });
    assert.ok(want.html.includes('bk-use') && want.lessons.length >= 1, JSON.stringify(want.lessons));
    assert.match(u.text, /^使う場面：課目 .*／学科テスト「飛行の原理」.*／まとめ 1／JCAB 航空工学試験の項目を見る$/);
    assert.deepEqual([u.under, u.inside, u.hidden, u.lessons, u.btn], [true, true, true, want.lessons, 'false']);
    // the notes: shown and hidden by their button; printed open, without the button
    await page.locator('#bkArt .bk-exam-btn').click();
    const ex = await page.evaluate(() => { const x = document.querySelector('#bkArt .bk-exam'), b = document.querySelector('#bkArt .bk-exam-btn'); return { shown: !x.hidden && x.offsetHeight > 0, text: x.textContent, b: [b.textContent, b.getAttribute('aria-expanded')] }; });
    assert.ok(ex.shown);
    assert.match(ex.text, /^JCAB 出題範囲参考の見出し：事業用 １（１）ア（オ）（ケ）／自家用 １（１）ア（オ）（ケ）FAA ACS の知識の項目：自家用 PA\.I\.F\.K3、.*（FAA の学科を受けるかは未公表）$/);
    assert.deepEqual(ex.b, ['試験の項目を閉じる', 'true']);
    await page.locator('#bkArt .bk-exam-btn').click();
    assert.equal(await page.locator('#bkArt .bk-exam').isVisible(), false);
    await page.emulateMedia({ media: 'print' });
    assert.deepEqual(await page.evaluate(() => [getComputedStyle(document.querySelector('#bkArt .bk-exam')).display, getComputedStyle(document.querySelector('#bkArt .bk-exam-btn')).display]), ['block', 'none']);
    await page.emulateMedia({ media: 'screen' });
    // まとめ 1 opens the summary chapter; 「JCAB 航空工学」 the page of the road
    await page.locator('#bkArt .bk-use button[data-sec="g1.review"]').click();
    assert.equal(await page.textContent('#bkArt .bk-title'), '第 1 部の振り返り：問いと口述の練習');
    await open('aero.stall');
    await page.locator('#bkArt .bk-use button[data-page="jcab"]').click();
    assert.equal(await page.textContent('#bkArt .bk-road h3'), 'JCAB 学科の道');
    assert.deepEqual(await page.evaluate(() => [...document.querySelectorAll('#bkNav .bk-page.sel')].map(b => b.dataset.page)), ['jcab']);
    // a lesson opens the syllabus at its card: its brief and its start button (nothing is flown from the book)
    await open('aero.stall');
    await page.locator(`#bkArt .bk-use [data-use-lesson="${want.lessons[0]}"]`).click();
    const s1 = await page.evaluate(id => ({ school: !document.getElementById('school').hidden, sel: [...document.querySelectorAll('#sch-stages .sch-item.sel')].map(c => c.dataset.id), h: document.querySelector('#sch-brief h2').textContent, go: !!document.querySelector('#sch-start .sch-go'), flying: !!(__lab.lesson() && !__lab.lesson().free && __lab.lesson().id === id) }), want.lessons[0]);
    assert.deepEqual(s1, { school: true, sel: [want.lessons[0]], h: await page.evaluate(id => FL.school.lesson(id).title, want.lessons[0]), go: true, flying: false });
    // a test bank: its card in the first stage, with 「テストを始める」
    await open('aero.stall');
    await page.locator('#bkArt .bk-use [data-use-bank="q_aero"]').click();
    const s2 = await page.evaluate(() => ({ school: !document.getElementById('school').hidden, sel: [...document.querySelectorAll('#sch-stages .sch-item.sel')].map(c => c.dataset.id), go: document.querySelector('#sch-start .sch-go').textContent.trim() }));
    assert.deepEqual(s2, { school: true, sel: ['q_aero'], go: 'テストを始める' });
    // a section the links do not name has no line (ground.walk: R3 writes Part 2)
    await open('ground.walk');
    assert.equal(await page.locator('#bkArt .bk-use').count(), await page.evaluate(() => (/bk-use/.test(FL.book.secMarks('ground.walk')) ? 1 : 0)));
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => __lab.errors), []);
  } finally { await browser.close(); }
});
