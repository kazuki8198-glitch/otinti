// CADET — browser test (node --test): opens outputs/CADET.html from file:// in headless Chromium (software WebGL,
// network blocked) and checks that the world starts with no errors and no requests, that every viewpoint draws a real
// picture within the draw budget, that the time of day and the presets switch, and that the bench reports.
// Needs Playwright (PLAYWRIGHT=its module path if it is not installed next to this project); skipped otherwise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from '../build.mjs';
import { loadChromium, openGame } from './shots.mjs';

const chromium = loadChromium();
// the picture's contrast (standard deviation of the luminance, 0–255) and its mean
const analyse = (page, url) => page.evaluate(async (url) => {
  const img = new Image(); img.src = url; await img.decode();
  const c = document.createElement('canvas'); c.width = 160; c.height = 90; const g = c.getContext('2d'); g.drawImage(img, 0, 0, 160, 90);
  const d = g.getImageData(0, 0, 160, 90).data; let s = 0, s2 = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) { const y = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; s += y; s2 += y * y; n++; }
  return { mean: s / n, sd: Math.sqrt(s2 / n - (s / n) ** 2) };
}, url);

test('browser: offline start, every viewpoint draws within budget, time and presets switch, the bench reports', { skip: !chromium && 'Playwright not found', timeout: 1200000 }, async () => {
  build({ quiet: true });
  const { browser, page, errors, requests } = await openGame(chromium, { q: 'high', w: 800, h: 450, t: 10 });
  try {
    await page.evaluate(() => window.__cadet.pause(true));
    const views = await page.evaluate(() => window.__cadet.VIEWS.map(v => v.id));
    assert.equal(views.length, 7);
    for (let i = 0; i < views.length; i++) {
      const url = await page.evaluate((i) => { window.__cadet.setView(i); return window.__cadet.snapshot(2); }, i);
      const a = await analyse(page, url), st = await page.evaluate(() => window.__cadet.stats());
      assert.ok(a.sd > 8, `${views[i]}: the picture has no contrast (sd ${a.sd.toFixed(1)})`);
      assert.ok(a.mean > 40 && a.mean < 235, `${views[i]}: too dark or too bright (mean ${a.mean.toFixed(0)})`);
      assert.ok(st.calls < 400, `${views[i]}: ${st.calls} draw calls`);
      assert.ok(st.triangles < 900000, `${views[i]}: ${st.triangles} triangles`);
    }
    // dusk: the sun goes down, the airfield lights come on, still a picture
    await page.evaluate(() => { window.__cadet.setView(0); window.__cadet.setTime(19.4); });
    const dusk = await analyse(page, await page.evaluate(() => window.__cadet.snapshot(2)));
    assert.ok(dusk.sd > 3 && dusk.mean < 160, `dusk: mean ${dusk.mean.toFixed(0)} sd ${dusk.sd.toFixed(1)}`);
    // presets switch without errors (by day: the first frame after a switch must already be a full picture)
    await page.evaluate(() => window.__cadet.setTime(10));
    for (const q of ['low', 'ultra', 'high']) {
      await page.evaluate((q) => window.__cadet.setQuality(q), q);
      const a = await analyse(page, await page.evaluate(() => window.__cadet.snapshot(1)));
      assert.ok(a.sd > 8 && a.mean > 40, `preset ${q}: mean ${a.mean.toFixed(0)} sd ${a.sd.toFixed(1)}`);
      assert.equal(await page.evaluate(() => window.__cadet.stats().preset), q);
    }
    // the bench: one result per viewpoint
    await page.evaluate(() => window.__cadet.pause(false));
    const r = await page.evaluate(() => window.__cadet.runBench(1, 1));
    assert.equal(r.views.length, 7);
    for (const v of r.views) assert.ok(v.avgMs > 0 && v.calls > 0 && v.triangles > 0, JSON.stringify(v));
    assert.deepEqual(errors.filter(e => !/KHR_parallel_shader_compile/.test(e)), [], 'page errors');
    assert.deepEqual(requests, [], 'network requests');
  } finally { await browser.close(); }
});
