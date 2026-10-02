// level tracking along a route (ROUTE=json of [e, n, h, wayId, highway, kind]): the car's ground (the page's own groundAt, from
// 1.5 m above the last height, as the driving does) against the way's own profile; no drawing
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 640, height: 360 } });
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 5; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 800 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/plateau-three.html?norender=1', { waitUntil: 'load' });
  for (let i = 0; i < 60; i++) { await page.waitForTimeout(5000); if (await page.evaluate(() => __three.areaBuilt)) break; }
  await page.waitForTimeout(5000);
  for (const file of process.env.ROUTES.split(',')) {
    const pts = JSON.parse(fs.readFileSync(file, 'utf8'));
    // in steps of 40 points: the car put at the step's start and the page left to run (its tiles, the roads' BVHs) before the
    // step's points are tried, each from the height found at the one before
    let yPrev = null, last = null; const all = [];
    const busy = () => page.evaluate(() => Object.values(__three.sets).reduce((a, t) => a + t.stats.downloading + t.stats.parsing, 0));
    for (let i0 = 0; i0 < pts.length; i0 += 40) {
      const [e, n] = pts[i0];
      await page.evaluate(([e, n]) => { const T = __three, p = T.enuToWorld(e, n, 0); T.C.x = p.x; T.C.z = p.z; T.C.v = 0; T.areaNear(); }, [e, n]);
      if (!last || Math.hypot(e - last[0], n - last[1]) > 120) { for (let k = 0; k < 20; k++) { await page.waitForTimeout(700); if (await busy() === 0) break; } last = [e, n]; }
      await page.waitForTimeout(500);
      const r = await page.evaluate(([seg, yPrev]) => {
        const T = __three, out = []; T.gatherHits();
        for (const [e, nn, h] of seg) { const p = T.enuToWorld(e, nn, h); if (yPrev === null) yPrev = p.y; const y = T.groundAt(p.x, p.z, yPrev); out.push([y - p.y, y - yPrev]); yPrev = y; }
        return { out, yPrev };
      }, [pts.slice(i0, i0 + 40), yPrev]);
      yPrev = r.yPrev; all.push(...r.out);
    }
    const errs = all.map(a => Math.abs(a[0])).sort((a, b) => a - b), N = errs.length, bad = [], jumps = [];
    all.forEach(([err, dy], i) => { const [e, n, h, id, hw, kind] = pts[i]; if (Math.abs(err) > 1.5) bad.push([i, +e.toFixed(1), +n.toFixed(1), +h.toFixed(1), +err.toFixed(2), hw, kind, id]); if (Math.abs(dy) > 0.8) jumps.push([i, +e.toFixed(1), +n.toFixed(1), +dy.toFixed(2), hw, kind]); });
    const firstBad = bad.length ? bad[0][0] : -1, around = firstBad < 0 ? [] : all.slice(Math.max(0, firstBad - 6), firstBad + 4).map((a, k) => [Math.max(0, firstBad - 6) + k, +pts[Math.max(0, firstBad - 6) + k][2].toFixed(2), +a[0].toFixed(2)]);
    const r = { n: N, p50: errs[N >> 1], p95: errs[Math.floor(N * 0.95)], max: errs[N - 1], bad: bad.length, badFirst: bad.slice(0, 8), around, jumps: jumps.length, jumpFirst: jumps.slice(0, 8) };
    r.area = await page.evaluate(() => { const A = __three.AREA; return { chunksMade: A.made, chunksFreed: A.freed, chunksHeld: A.chunks.filter(c => c.grp).length, of: A.chunks.length, MB: +(A.bytes / 1e6).toFixed(1), heapMB: performance.memory ? +(performance.memory.usedJSHeapSize / 1e6).toFixed(0) : null }; });
    console.log('ROUTE ' + file + ' ' + JSON.stringify(r));
  }
  await browser.close();
})();
