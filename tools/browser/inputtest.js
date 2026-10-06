// The keys and the wheel where two features used to share them: each case pressed in the real page (keyboard and
// mouse events through the browser), and the state read back. Offline; the island world is enough.
//   K (the car) with the analog instruments on; Shift+K (how to read them); H in the cockpit (only the cockpit's own
//   display); the wheel in the orbit view (the camera's distance, not the throttle); Shift+wheel (the throttle)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => typeof game !== 'undefined' && game.state === 'menu', null, { timeout: 180000 });
  const st = () => page.evaluate(() => ({ car: CAR.on, explain: !!SCHOOL.explain, hud: game.hud, cpHud: game.cpHud, thr: +sim.thr.toFixed(2), dist: +cam.dist.toFixed(1), cam: cam.mode, state: game.state }));
  const results = [];
  const check = (name, ok, a, b) => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${JSON.stringify(a)} -> ${JSON.stringify(b)}`); };
  await page.evaluate(() => { startMode('runway'); SCHOOL.analog = true; window.__t = []; const o = toast; toast = (m, d) => { window.__t.push(m); return o(m, d); }; });   // (on the runway: on land, where the car can come out)
  await page.waitForTimeout(1500); await page.mouse.click(320, 180);
  let a = await st(); await page.keyboard.press('Shift+KeyK'); await page.waitForTimeout(400); let b = await st();
  const said = await page.evaluate(() => window.__t.slice(-1)[0] || '');
  check('Shift+K: the instruments\' explanation, not the car', /計器の読み方/.test(said) && !b.car, a, { ...b, said });
  a = b; await page.keyboard.press('KeyK'); await page.waitForTimeout(1500); b = await st();
  check('K with the analog instruments on: the car', b.car && b.explain === a.explain, a, b);
  await page.keyboard.press('KeyK'); await page.waitForTimeout(1500);
  await page.evaluate(() => { cam.mode = 'cockpit'; });
  a = await st(); await page.keyboard.press('KeyH'); await page.waitForTimeout(400); b = await st();
  check('H in the cockpit: the cockpit display only', b.cpHud !== a.cpHud && b.hud === a.hud, a, b);
  await page.evaluate(() => { cam.mode = 'orbit'; sim.thr = 0.5; });
  a = await st(); await page.mouse.move(320, 180); await page.mouse.wheel(0, 300); await page.waitForTimeout(400); b = await st();
  check('the wheel in the orbit view: the distance, not the throttle', b.dist !== a.dist && b.thr === a.thr, a, b);
  a = b; await page.keyboard.down('Shift'); await page.mouse.wheel(0, -300); await page.keyboard.up('Shift'); await page.waitForTimeout(400); b = await st();
  check('Shift+wheel: the throttle', b.thr > a.thr, a, b);
  await page.evaluate(() => { cam.mode = 'chase'; sim.thr = 0.5; });
  a = await st(); await page.mouse.wheel(0, -300); await page.waitForTimeout(400); b = await st();
  check('the wheel in the view behind: the throttle (as before)', b.thr > a.thr, a, b);
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
