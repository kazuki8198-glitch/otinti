// Where a scene's time and memory go: one of the benchmark's scenes set up and played by the page's own frames for a
// while (after a settle), with Chrome's CPU profiler and its sampling heap profiler on. Printed: the JS heap after a
// garbage collection, the functions with the most time of their own, the functions allocating the most, and the
// frame times. SCENE=0..3 (the benchmark's), SEC=10, SETTLE=8, ONLINE=1 (the map's photos and buildings).
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2', '--enable-precise-memory-info'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 800, height: 400 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  if (process.env.ONLINE) await page.route(/^https:/, async route => { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { return route.abort(); } });
  else await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state === 'menu', null, { timeout: 180000 });
  const cdp = await page.context().newCDPSession(page);
  const heap = async () => { await cdp.send('HeapProfiler.collectGarbage'); const u = await cdp.send('Runtime.getHeapUsage'); return Math.round(u.usedSize / 1e6); };
  console.log(`heap at the menu: ${await heap()} MB`);
  const scenes = [
    { ac: 'c172', mode: 'runway', cam: 'cockpit' }, { ac: 'b738', mode: 'landing', cam: 'cockpit' },
    { ac: 'b738', mode: 'air', place: { lat: 35.69, lon: 139.73, agl: 460, hdg: 270, kt: 220 }, cam: 'chase' },
    { ac: 'b738', mode: 'air', place: { lat: 35.55, lon: 139.95, agl: 3050, hdg: 240, kt: 280 }, cam: 'cockpit' }];
  const sc = scenes[+(process.env.SCENE || 1)];
  await page.evaluate(async (sc) => { await window.__ft.setup(sc); window.__ft.end(); game.assist = true; if (sc.place) { game.ap = true; game.apAlt = sim.pos[1]; game.apHdg = sc.place.hdg; game.apLat = 'hdg'; game.apVert = 'alt'; game.apSpd = sc.place.kt; } cam.mode = sc.cam; }, sc);
  await page.waitForTimeout(1000 * +(process.env.SETTLE || 8));
  console.log(`heap after the setup and settle: ${await heap()} MB`);
  await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
  await cdp.send('HeapProfiler.enable'); await cdp.send('HeapProfiler.startSampling', { samplingInterval: 32768 });
  const f0 = await page.evaluate(() => DEV.frN);
  await page.waitForTimeout(1000 * +(process.env.SEC || 10));
  const prof = (await cdp.send('Profiler.stop')).profile, hs = (await cdp.send('HeapProfiler.stopSampling')).profile;
  const fr = await page.evaluate((f0) => { const st = devFrameStats(f0); return st && { fps: +st.fps.toFixed(1), p95: +st.p95.toFixed(1), max: +st.max.toFixed(1) }; }, f0);
  console.log(`frames: ${JSON.stringify(fr)}  heap now: ${await heap()} MB`);
  // CPU: self time per function
  const self = {}, dt = prof.timeDeltas, idx = {}; prof.nodes.forEach(n => idx[n.id] = n);
  const total = dt.reduce((a, b) => a + b, 0);
  prof.samples.forEach((id, i) => { const n = idx[id], cf = n.callFrame, k = `${cf.functionName || '(anon)'} :${cf.lineNumber + 1}`; self[k] = (self[k] || 0) + (dt[i] || 0); });
  console.log('CPU, own time (share of the profile):');
  Object.entries(self).sort((a, b) => b[1] - a[1]).slice(0, +(process.env.TOP || 25)).forEach(([k, v]) => console.log(`  ${(100 * v / total).toFixed(1).padStart(5)} %  ${k}`));
  // allocations: self size per function
  const al = {}; const walk = n => { const cf = n.callFrame, k = `${cf.functionName || '(anon)'} :${cf.lineNumber + 1}`; al[k] = (al[k] || 0) + n.selfSize; (n.children || []).forEach(walk); }; walk(hs.head);
  console.log('allocated in the window (sampled), by function:');
  Object.entries(al).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([k, v]) => console.log(`  ${(v / 1e6).toFixed(1).padStart(6)} MB  ${k}`));
  await browser.close();
})();
