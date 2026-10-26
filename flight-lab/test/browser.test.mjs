// FLIGHT LAB — browser test (node --test): opens outputs/FLIGHT-LAB.html from file:// in headless Chromium with the
// network blocked, runs a checklist and a read-back with the keys, flies with the keyboard, visits every page, answers
// a textbook question, a ground-school test and an ATC scene, and checks the Google
// layer with an OFFLINE FIXTURE (test/fixtures: not Google data) served in place of tile.googleapis.com: the tile is
// decoded in the worker with the embedded Draco, drawn, credited, and the key never reaches storage or the record.
// The second reads the basic course (kiso/) through its own page: every chapter and section, every figure and photo, the
// written questions, the glossary, the sources, the progress (apart from the textbook's, kept across a reload), and two
// pages compared with kiso/preview.html.
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
    // a photo in the textbook (book-photos.js): shown from its data URL with its credit's links (when there are photos)
    const photoSec = await page.evaluate(() => { const s = FL.book.CHAPTERS.flatMap(c => c.secs).find(x => /class="bk-photo"/.test(FL.book.html(x))); return s ? `${FL.book.findSection(s.id).ch.n}.${FL.book.findSection(s.id).ch.secs.indexOf(s) + 1}` : null; });
    if (photoSec) {
      await page.evaluate(n => [...document.querySelectorAll('#bkNav .bk-item')].find(b => b.querySelector('.bk-num').textContent.trim() === n).click(), photoSec);
      const img = await page.evaluate(async () => { const i = document.querySelector('.bk-photo img'); i.loading = 'eager'; await i.decode(); return [i.currentSrc.slice(0, 22), i.naturalWidth, i.closest('figure').querySelectorAll('.bk-credit a[target="_blank"]').length]; });
      assert.deepEqual([img[0], img[1] > 0, img[2]], ['data:image/webp;base64', true, 2]);
    }
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
    assert.equal(await page.locator('#kzArt .kz-toc-item').count(), 14);
    await page.click('#kzArt .kz-toc-item >> nth=0');
    assert.deepEqual(await page.$$eval('#kzArt .kz-tabs button', a => a.map(b => b.textContent.replace(/（.*/, ''))), ['本文', '確認問題', '用語', '出典']);
    // every section, one after the other with 次の節 →: no placeholder left, each figure's SVG and caption, each photo
    // decoded with its caption and credit, the text exactly the data's
    const walk = await page.evaluate(async () => {
      const K = FL.kiso, figs = new Set(), photos = new Set(), bad = [];
      const plain = html => { const d = document.createElement('div'); d.innerHTML = html; for (const e of d.querySelectorAll('.kiso-fig, .kiso-photo')) e.remove(); return d.textContent; };
      let n = 0;
      for (;;) {
        const body = document.querySelector('#kzArt .kz-body'), id = body.dataset.kisoSec, c = K.chapters.find(x => id.startsWith(x.id + '.')), s = c.sections.find(x => x.id === id);
        n++;
        if (body.querySelector('.kiso-fig, .kiso-photo')) bad.push(`${id}: a placeholder is left`);
        for (const f of body.querySelectorAll('figure.kz-fig')) {
          const m = c.figures.find(x => x.id === f.dataset.fig);
          if (m && f.querySelector('svg') && f.querySelector('svg').outerHTML.length > 200 && f.querySelector('figcaption').textContent === plain(m.caption)) figs.add(m.id); else bad.push(`${id}: figure ${f.dataset.fig}`);
        }
        for (const f of body.querySelectorAll('figure.kz-photo')) {
          const m = c.photos.find(x => x.id === f.dataset.photo), im = f.querySelector('img');
          await im.decode().catch(() => {});
          const cap = f.querySelector('figcaption').children;
          if (m && im.naturalWidth > 0 && cap[0].textContent === plain(m.caption) && cap[1].textContent === plain(m.credit) && cap[1].textContent.trim()) photos.add(m.id); else bad.push(`${id}: photo ${f.dataset.photo}`);
        }
        const ours = body.cloneNode(true); for (const e of ours.querySelectorAll('figure')) e.remove();
        if (ours.textContent !== plain(s.html)) bad.push(`${id}: the text differs from the data`);
        const next = [...document.querySelectorAll('#kzArt .kz-pane .row button')].find(b => b.textContent === '次の節 →');
        if (!next) break;
        next.click();
      }
      return { n, figs: figs.size, photos: photos.size, bad, last: document.querySelector('#kzArt .kz-body').dataset.kisoSec };
    });
    assert.deepEqual(walk.bad, []);
    assert.equal(walk.n, total, 'every section'); assert.equal(walk.last, 'kiso13.28');
    assert.equal(walk.figs, 161, 'figures'); assert.equal(walk.photos, 85, 'photos');
    await page.click('#kzArt .kz-pane button:has-text("← 前の節")');
    assert.equal(await page.getAttribute('#kzArt .kz-body', 'data-kiso-sec'), 'kiso13.27');
    // read sections: the course's own progress, not the textbook's
    let prog = await page.evaluate(() => __lab.progress());
    assert.equal(prog.kisoRead.length, total); assert.ok(!prog.read.some(id => /^kiso/.test(id)), 'not in the textbook\'s read');
    // the written questions of chapter 5: no choices, no grading; the answer opens on the button and is recorded
    await page.click('#kzNav .kz-ch:has-text("第 5 章")');
    await page.click('#kzArt .kz-tabs button:has-text("確認問題")');
    assert.equal(await page.locator('#kzArt .kz-qa').count(), 28);
    assert.equal(await page.locator('#kzArt .kz-pane input').count(), 0, 'written answers: nothing to choose');
    assert.equal(await page.isVisible('#kzArt .kz-qa >> nth=0 >> .kz-a'), false);
    await page.click('#kzArt .kz-qa >> nth=0 >> button:has-text("解答と解説を見る")');
    assert.equal(await page.isVisible('#kzArt .kz-qa >> nth=0 >> .kz-a'), true);
    assert.equal(await page.evaluate(() => { const d = document.createElement('div'); d.innerHTML = FL.kiso.chapters[5].qa[0].a; return document.querySelector('#kzArt .kz-qa .kz-a > div:last-child').textContent === d.textContent; }), true, 'the answer as the data has it');
    prog = await page.evaluate(() => __lab.progress());
    assert.deepEqual(prog.kisoQa, ['kiso05.q1']); assert.deepEqual(prog.bookQuiz, {}, 'not the textbook\'s questions');
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
    // the record: kept across a reload (localStorage), in the export, on the records page; the About page's line
    await page.reload();
    await page.waitForFunction(() => window.__lab && __lab.sceneOk());
    prog = await page.evaluate(() => __lab.progress());
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
