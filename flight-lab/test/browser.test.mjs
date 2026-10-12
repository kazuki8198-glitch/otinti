// FLIGHT LAB — browser test (node --test): opens outputs/FLIGHT-LAB.html from file:// in headless Chromium with the
// network blocked, runs a checklist and a read-back with the keys, flies with the keyboard, visits every page, answers
// a textbook question, a ground-school test and an ATC scene, and checks the Google
// layer with an OFFLINE FIXTURE (test/fixtures: not Google data) served in place of tile.googleapis.com: the tile is
// decoded in the worker with the embedded Draco, drawn, credited, and the key never reaches storage or the record.
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
    for (const t of ['book', 'quiz', 'guide', 'tutor', 'readq', 'sfb', 'radio', 'records', 'g3d', 'about']) { await page.evaluate(t => __lab.showPage(t), t); await page.waitForTimeout(120); }
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
