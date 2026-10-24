// CADET — test/shots.mjs : opens outputs/CADET.html from file:// in headless Chromium (software WebGL), waits for the
// world, and saves a screenshot of every viewpoint (and errors from the page) to test-output/.
//   node test/shots.mjs [quality=ultra] [width=1280] [height=720] [hours=9.6] [views=1,2,...]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
export function loadChromium() {
  for (const p of [process.env.PLAYWRIGHT, 'playwright', '/opt/node22/lib/node_modules/playwright'].filter(Boolean)) { try { return require(p).chromium; } catch (e) { /* next */ } }
  return null;
}
export async function openGame(chromium, { q = 'ultra', w = 1280, h = 720, t = 9.6, extra = '', file = path.resolve(here, '../outputs/CADET.html') } = {}) {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.type() + ': ' + m.text()); });
  await ctx.route(/^https?:/, r => { requests.push(r.request().url()); return r.abort(); });
  await page.goto(`file://${file}?q=${q}&t=${t}&auto${extra}`);
  try { await page.waitForFunction(() => window.__cadet && window.__cadet.ready, null, { timeout: 240000 }); } catch (e) {
    const msg = await page.evaluate(() => document.querySelector('#bootMsg')?.textContent).catch(() => '');
    await browser.close();
    throw new Error(`the game did not start: ${msg}\n${errors.join('\n')}`);
  }
  return { browser, page, errors, requests };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [q = 'ultra', w = '1280', h = '720', t = '9.6', views = '', extra = ''] = process.argv.slice(2);
  const chromium = loadChromium(); if (!chromium) { console.error('Playwright not found'); process.exit(1); }
  const out = path.resolve(here, '../test-output'); fs.mkdirSync(out, { recursive: true });
  const t0 = Date.now();
  const { browser, page, errors, requests } = await openGame(chromium, { q, w: +w, h: +h, t: +t, extra });
  console.log('ready in', ((Date.now() - t0) / 1000).toFixed(1), 's');
  await page.evaluate(() => window.__cadet.pause(true));
  const n = await page.evaluate(() => window.__cadet.VIEWS.length);
  const list = views ? views.split(',').map(Number) : Array.from({ length: n }, (_, i) => i + 1);
  for (const i of list) {
    const t1 = Date.now();
    await page.evaluate((i) => window.__cadet.setView(i - 1), i);
    const url = await page.evaluate(() => window.__cadet.snapshot(3));
    const st = await page.evaluate(() => window.__cadet.stats());
    const f = path.join(out, `view${i}-${q}-${t}${extra.replace(/[^a-z]/g, '')}.png`);
    fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64'));
    console.log(f, ((Date.now() - t1) / 1000).toFixed(1) + 's', JSON.stringify(st));
  }
  console.log('errors:', errors.length ? errors.slice(0, 20).join('\n') : 'none');
  console.log('network requests:', requests.length);
  await browser.close();
}
