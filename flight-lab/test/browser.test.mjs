// FLIGHT LAB — browser test (node --test): opens outputs/FLIGHT-LAB.html from file:// in headless Chromium with the
// network blocked, flies with the keyboard, visits every tab, answers a quiz and an ATC scene, and checks the Google
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
const FX = path.join(here, 'fixtures'), KEY = 'AIzaFAKE_FIXTURE_KEY_0123456789abcdefgh';

test('browser: offline start, keyboard flight, every tab, quiz and ATC, the Google layer with a fixture', { skip: !chromium && 'Playwright not found' }, async () => {
  const { out } = build({ quiet: true });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1366, height: 700 } });
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
    // the first-run notice
    assert.equal(await page.isVisible('#ack'), true);
    await page.click('#ackOk');
    assert.equal(await page.isVisible('#ack'), false);
    // the instruments are drawn (not blank)
    await page.waitForTimeout(600);
    const lit = await page.evaluate(() => ['pfd', 'mfd'].map(id => { const c = document.getElementById(id), g = c.getContext('2d'), d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 16) if (d[i] + d[i + 1] + d[i + 2] > 60) n++; return n / (d.length / 16); }));
    assert.ok(lit[0] > 0.2 && lit[1] > 0.05, `PFD/MFD drawn ${lit}`);
    // takeoff roll by keyboard: W (throttle) for 3 s, then the speed is rising on the runway
    await page.evaluate(() => __lab.start('t5', 'intro', 'staged'));
    await page.focus('#view3d').catch(() => {});
    await page.keyboard.down('KeyW'); await page.waitForTimeout(2500); await page.keyboard.up('KeyW');
    await page.waitForTimeout(1500);
    const st = await page.evaluate(() => __lab.state());
    assert.ok(st.o.ias > 8 && st.o.onRunway, `rolling: ${st.o.ias} kt`);
    // view, pause, flaps by keys
    await page.keyboard.press('KeyC'); assert.equal((await page.evaluate(() => __lab.state())).view, 'chase');
    await page.keyboard.press('KeyP'); assert.equal((await page.evaluate(() => __lab.state())).paused, true);
    await page.keyboard.press('KeyP');
    // panel controls by clicks: COM swap, CDI softkey, BARO
    const before = await page.evaluate(() => __lab.state().av.com1.act);
    await page.click('#audio button:has-text("⇄")');
    assert.notEqual(await page.evaluate(() => __lab.state().av.com1.act), before);
    await page.click('#pfdKeys button:has-text("CDI")');
    assert.equal(await page.evaluate(() => __lab.state().av.cdi), 'NAV1');
    // the hood (task 10) hides the outside view
    await page.evaluate(() => __lab.start('t10', 'intro', 'staged'));
    await page.waitForTimeout(200);
    assert.equal(await page.isVisible('#hood'), true);
    // every tab
    for (const t of ['curr', 'book', 'sfb', 'rec', 'g3d', 'about', 'fly']) { await page.evaluate(t => __lab.showTab(t), t); await page.waitForTimeout(150); }
    // a textbook quiz: the right answer is stored as progress
    await page.evaluate(() => __lab.showTab('book'));
    await page.click('#bookToc button:has-text("第 6 章")');
    const ans = await page.evaluate(() => FL.curriculum.CHAPTERS.find(c => c.no === 6).quiz[0].answer);
    await page.check(`input[name="q6_0"][value="${ans}"]`);
    await page.click('.quiz >> nth=0 >> button:has-text("答え合わせ")');
    assert.match(await page.textContent('.quiz >> nth=0 >> .res'), /正解/);
    assert.equal((await page.evaluate(() => __lab.progress())).quiz['6'][0], true);
    // an ATC scene
    await page.evaluate(() => __lab.showTab('sfb'));
    const sc = await page.evaluate(() => FL.sanford.SCENES[0]);
    await page.check(`input[name="atc_${sc.id}"][value="${sc.answer}"]`);
    await page.click('.scene >> nth=0 >> button:has-text("答え合わせ")');
    assert.match(await page.textContent('.scene >> nth=0 >> .res'), /正解/);
    // the Google layer, from the settings tab, with the offline fixture
    googleOn = true;
    await page.evaluate(() => __lab.showTab('g3d'));
    await page.fill('#gkey', KEY);
    await page.click('#g3dPage button.primary');
    assert.equal(await page.inputValue('#gkey'), '', 'the key field is cleared after use');
    await page.click('text=Sanford 上空へ（自由練習）');
    await page.waitForFunction(() => { const g = __lab.google(); return g && g.drawn > 0 && g.credits; }, null, { timeout: 30000 });
    const g = await page.evaluate(() => __lab.google());
    assert.equal(g.state, 'on'); assert.equal(g.worker, 'worker', 'decoded in a worker'); assert.match(g.credits, /test fixture/);
    assert.equal(await page.isVisible('#gattr'), true); assert.match(await page.textContent('#gattr'), /Google Maps/);
    // the key: only in requests to Google's tile host; never in storage, never in a record or an export
    await page.evaluate(() => { __lab.showTab('fly'); });
    await page.click('#debrief button:has-text("記録を保存")');
    const dump = JSON.stringify(await page.evaluate(() => __lab.storageDump()));
    assert.ok(!dump.includes(KEY) && !dump.includes('FAKE_FIXTURE'), 'no key in localStorage');
    const exported = await page.evaluate(() => FL.training.exportJSON(__lab.records(), __lab.progress()));
    assert.ok(!exported.includes(KEY));
    assert.ok(!page.url().includes('AIza'));
    const keyed = requests.filter(u => u.includes('key='));
    assert.ok(keyed.length >= 2 && keyed.every(u => u.startsWith('https://tile.googleapis.com/')), requests.join('\n'));
    // disconnect clears the key from memory
    await page.evaluate(() => __lab.showTab('g3d'));
    await page.click('text=切断（キーも消去）');
    assert.equal((await page.evaluate(() => __lab.google())).hasKey, false);
    assert.deepEqual(errors, []);
    assert.deepEqual(await page.evaluate(() => __lab.errors), []);
  } finally { await browser.close(); }
});
