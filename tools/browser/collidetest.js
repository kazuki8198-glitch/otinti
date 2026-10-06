// Building collisions at speed: an aircraft flown level and low straight at a building (the default: the Landmark
// Tower in Yokohama, from the bay to its east: no other building on the way), the frame loop's building check run
// at a chosen frame rate. A low frame rate is where a check made only at each frame's position let a fast aircraft
// pass through. Printed per case: what hit, and when.
// Online (the buildings come from OpenFreeMap). AC=b738 LAT,LON = the target, FROM=metres east of it, AGL, KT, FPS=60,10
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const lat = +(process.env.LAT || 35.4547), lon = +(process.env.LON || 139.6316), from = +(process.env.FROM || 1500);   // (FROM: metres east of the target)
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 640, height: 360 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, async route => { for (let i = 0; i < 4; i++) { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { await new Promise(r => setTimeout(r, 1000 * (i + 1))); } } return route.abort(); });
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  for (const fps of (process.env.FPS || '60,10').split(',').map(Number)) {
    const place = { lat, lon: lon + from / (111320 * Math.cos(lat * Math.PI / 180)), agl: +(process.env.AGL || 100), hdg: 270, kt: +(process.env.KT || 180) };
    await page.evaluate(o => window.__ft.setup(o), { ac: process.env.AC || 'b738', mode: 'air', place });
    const ok = await page.waitForFunction(([la, lo]) => window.__ft.cityReady(la, lo) && JW.online, [lat, lon], { timeout: 240000, polling: 2000 }).then(() => true).catch(() => false);
    await page.evaluate(o => window.__ft.setup(o), { ac: process.env.AC || 'b738', mode: 'air', place });   // (back to the start, the buildings now loaded)
    const r = await page.evaluate(([sec, fps]) => {
      let pv = 0;
      const level = (s, c, dt) => { const e = (0 - c.vs) * 0.0006 - (c.pitch - pv) / dt * 0.05; pv = c.pitch; s.ovr = { elev: e, ail: -c.bank * 0.03, rud: 0 }; };
      return window.__ft.run(sec, level, fps);
    }, [from / (+(process.env.KT || 180) / 1.944) + 6, fps]);
    console.log(`FPS ${fps} buildings loaded ${ok}: hit ${r.hit ? r.hit.part + ' at ' + r.hit.t + ' s' : 'none'}, crashed ${r.crashed} ${r.reason || ''}, flew ${r.t} s, last agl ${r.log.length ? r.log[r.log.length - 1][3] : '?'} ft`);
    await page.evaluate(() => window.__ft.end());
  }
  await browser.close();
})();
