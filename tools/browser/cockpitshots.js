// The cockpit as the pilot sees it: an aircraft put where a mode starts it (the Japan world, at an airport), the
// cockpit view, one or more look directions, a picture of each once the cockpit's model has loaded.
// SHOTS=c172:runway:0,0;b738:landing:0,-0.3 (aircraft:mode:look yaw,look pitch in radians; several separated by ;)
// EYE=[x,y,z] (the cockpit model's eye, in its own coordinates: to try a seat position) OUT=dir W/H AP=RJTT ONLINE=1 (the map's photos and buildings; default offline)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..'), out = process.env.OUT || '.';
  const W = +(process.env.W || 1280), H = +(process.env.H || 720);
  const shots = (process.env.SHOTS || 'c172:runway:0,0;b738:runway:0,0').split(';').map(x => { const [ac, mode, look, name] = x.split(':'); const [y, p] = (look || '0,0').split(',').map(Number); return { ac, mode, y, p, name: name || `${ac}_${mode}_${look || '0,0'}`.replace(/[,.-]/g, '_') }; });
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'], proxy: process.env.HTTPS_PROXY ? { server: process.env.HTTPS_PROXY, bypass: '127.0.0.1,localhost' } : undefined });
  const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: W, height: H } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  if (process.env.ONLINE) await page.route(/^https:/, async route => { try { const r = await route.fetch({ timeout: 60000 }); return route.fulfill({ response: r }); } catch (e) { return route.abort(); } });
  else await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state === 'menu', null, { timeout: 180000 });
  for (const s of shots) {
    if (process.env.EYE) await page.evaluate(([ac, e]) => { const d = cpRealDef(AIRCRAFT.find(a => a.id === ac)); if (d) d.eye = e; }, [s.ac, JSON.parse(process.env.EYE)]);
    await page.evaluate(o => window.__ft.setup(o), { ac: s.ac, ap: process.env.AP || 'RJTT', mode: s.mode });
    await page.evaluate(([y, p]) => { window.__ft.end(); game.extStep = true; cam.mode = 'cockpit'; cam.lookYaw = y; cam.lookPitch = p; }, [s.y, s.p]);
    if (process.env.JS) await page.evaluate(process.env.JS);   // (anything to set before the picture)   // (held still: the picture, not the flight)
    // the cockpit's model: loaded and drawn (a few frames after)
    await page.waitForFunction(() => typeof CPIT === 'undefined' || !CPIT.loading, null, { timeout: 120000 }).catch(() => {});
    await page.waitForTimeout(+(process.env.WAIT || 15000));
    const f = path.join(out, s.name + '.png'); await page.screenshot({ path: f, timeout: 180000 });
    const info = await page.evaluate(() => ({ ac: ACFT.id, deck: typeof cpLayout === 'function' ? (cpLayout(ACFT) || {}).deck : null, real: typeof cpRealDef === 'function' ? !!cpRealDef(ACFT) : null }));
    console.log(`SHOT ${f} ${JSON.stringify(info)}`);
  }
  await browser.close();
})();
