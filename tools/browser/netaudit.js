// What the page downloads, and how often: the flight benchmark (?bench=flight) run online in headless Chromium, every
// request recorded (URL, size, type); printed: totals by host and kind, and any URL fetched more than once (a sign of
// something loaded twice), plus the benchmark's own lines. OUT=file.json for the full list.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1056, height: 520 } });
  const reqs = [];
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { const b = fs.readFileSync(p); reqs.push({ url: route.request().url(), size: b.length, t: Date.now() }); route.fulfill({ status: 200, body: b, contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { try { const r = await route.fetch({ timeout: 60000 }); const b = await r.body(); reqs.push({ url: route.request().url(), size: b.length, t: Date.now(), type: route.request().resourceType() }); return route.fulfill({ response: r, body: b }); } catch (e) { reqs.push({ url: route.request().url(), size: 0, failed: true }); return route.abort(); } });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  page.on('worker', w => console.log('WORKER ' + w.url().slice(0, 80)));
  const t0 = Date.now();
  await page.goto('http://127.0.0.1:8765/flight-sim.html?bench=flight', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__flightBench, null, { timeout: +(process.env.TIMEOUT || 900000), polling: 2000 }).catch(() => console.log('bench did not finish'));
  const bench = await page.evaluate(() => window.__flightBench || null);
  if (bench) console.log(typeof bench === 'string' ? bench : JSON.stringify(bench, null, 1).slice(0, 2000));
  const host = u => { try { return new URL(u).host; } catch (e) { return '?'; } };
  const by = {}; for (const r of reqs) { const k = host(r.url); by[k] = by[k] || { n: 0, mb: 0, fail: 0 }; by[k].n++; by[k].mb += r.size / 1e6; if (r.failed) by[k].fail++; }
  console.log(`requests ${reqs.length} in ${Math.round((Date.now() - t0) / 1000)} s, ${(reqs.reduce((a, r) => a + r.size, 0) / 1e6).toFixed(1)} MB`);
  for (const [k, v] of Object.entries(by).sort((a, b) => b[1].mb - a[1].mb)) console.log(`  ${k}: ${v.n} requests, ${v.mb.toFixed(1)} MB${v.fail ? `, ${v.fail} failed` : ''}`);
  const cnt = {}; for (const r of reqs) { const u = r.url.replace(/[?&]key=[^&]*/, ''); cnt[u] = (cnt[u] || 0) + 1; }
  const dup = Object.entries(cnt).filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]);
  console.log(`URLs fetched more than once: ${dup.length}`); for (const [u, n] of dup.slice(0, 25)) console.log(`  ${n}× ${u.slice(0, 150)}`);
  if (process.env.OUT) fs.writeFileSync(process.env.OUT, JSON.stringify(reqs, null, 1));
  await browser.close();
})();
