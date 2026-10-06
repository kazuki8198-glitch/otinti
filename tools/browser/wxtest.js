// The weather of a free flight (the menu's wind and visibility): each wind setting started on the runway, the wind
// the aircraft meets sampled for 60 s (its mean speed, direction against the runway, the gusts) and what the tower
// reports; the visibility setting's fog in the shaders. Offline. Exits 1 if any check failed.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  await page.evaluate(() => window.__ft.setup({ ac: 'c172', mode: 'runway' }));
  const results = [];
  const check = (name, ok, got) => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${JSON.stringify(got)}`); };
  const sample = (w) => page.evaluate((w) => {
    game.wind = w; game.vis = 'clear'; startMode('runway');
    const n = 600; let sx = 0, sz = 0, sp = [];
    for (let i = 0; i < n; i++) { const v = windAt([sim.pos[0], RWY.elev + 10, sim.pos[2]], i * 0.1, 10); sx += v[0]; sz += v[2]; sp.push(Math.hypot(v[0], v[2]) * KTS); }
    const mx = sx / n, mz = sz / n, from = (Math.atan2(-mx, mz) / DEG + 360) % 360, mean = sp.reduce((a, b) => a + b) / n, sd = Math.sqrt(sp.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const rel = Math.round(((from - RWY.hdg + 540) % 360) - 180);
    return { kt: +mean.toFixed(1), rel, sd: +sd.toFixed(2), wx: WX.kt, tower: atcWind(), rwy: Math.round(RWY.hdg) };
  }, w);
  const calm = await sample('calm'), cross = await sample('cross'), gusty = await sample('gusty');
  check('calm: the light breeze down the runway (as before)', calm.kt < 10 && Math.abs(Math.abs(calm.rel) - 0) < 30, calm);
  check('crosswind: about 12 kt, 60° off the runway', Math.abs(cross.kt - 12) < 3 && Math.abs(Math.abs(cross.rel) - 60) < 10, cross);
  check('strong and gusty: about 18 kt, gusts stronger than the crosswind\'s', Math.abs(gusty.kt - 18) < 4 && gusty.sd > cross.sd * 1.5, gusty);
  check('the tower reports the set wind', new RegExp(`at (${cross.wx - 3}|${cross.wx - 2}|${cross.wx - 1}|${cross.wx}|${cross.wx + 1}|${cross.wx + 2}|${cross.wx + 3})$`).test(cross.tower), cross.tower);
  const fog = await page.evaluate(() => { game.vis = 'fog'; game.wind = 'calm'; startMode('runway'); return { fogD: WX.fogD, env: ENV.fog }; });
  check('fog: the fog density raised (visibility about 1.5 km)', fog.fogD > fog.env * 20, fog);
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
