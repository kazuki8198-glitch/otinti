// Failures in free flight (the menu's 故障 setting): each kind started in the air on the test bench (systems on),
// and its effect checked; the "soon" setting taking effect 500 ft after a takeoff. Offline. Exits 1 if any failed.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'] });
  const page = await browser.newPage({ viewport: { width: 480, height: 270 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  const results = [];
  const check = (name, ok, got) => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${JSON.stringify(got)}`); };
  // in the air (as the bench's place option), engines running, hands off with the throttle set
  const air = (ac) => page.evaluate((ac) => { window.__ft.setup({ ac, mode: 'air', place: { lat: 35.4, lon: 139.95, agl: 1500, hdg: 90, kt: ac === 'b738' ? 220 : 100 } }); sysReset(false); SYS.run = true; return ACFT.id; }, ac);
  const fly = (sec, js) => page.evaluate(([sec, js]) => { if (js) new Function(js)(); const r = window.__ft.run(sec, s => { s.ovr = null; s.thr = 0.8; }, 0, { systems: true }); return { gen: SYS.gen, amps: +SYS.amps.toFixed(1), eng: SYS.eng ? SYS.eng.map(E => E.run) : null, dead: !!sim.dead, gear: +sim.gearPos.toFixed(2), flap: +sim.flapDeg.toFixed(1), fpm: Math.round(sim.vs * 196.85), kt: Math.round(sim.ias * KTS), kind: FAIL.kind, crashed: r.crashed }; }, [sec, js]);
  const pilotAP = 'game.ap = false; doAction("ap");';   // (the autopilot holds the height: what the engine can still do shows in the speed)

  await air('c172'); let a0 = await fly(20, pilotAP), a = await fly(40, 'failNow("engine")');
  check('C172 engine: stops, the speed falls holding height', a.dead && a.kt < a0.kt - 10, { before: a0, after: a });
  await air('b738'); a = await fly(10, 'failNow("engine")');
  check('737 engine: one of the two stops', a.eng && a.eng.filter(x => x).length === 1, a);
  await air('c172'); a = await fly(10, 'failNow("generator")');
  check('generator: not charging, the battery discharging', !a.gen && a.amps < 0, a);
  await air('b738'); a = await fly(10, 'sim.gearDown = false; sim.gearPos = 0; failNow("gear"); doAction("gear")');
  check('gear: selected down, does not come down', a.gear === 0, a);
  a = await fly(32, 'FAIL.gearMan = true');
  check('gear: cranked down by hand in about 30 s', a.gear === 1, a);
  await air('c172'); a = await fly(10, 'sim.flapIdx = 0; sim.flapDeg = 0; failNow("flaps"); sim.flapIdx = 2');
  check('flaps: set, do not move', a.flap === 0, a);
  // "soon": 500 ft after a takeoff
  const soon = await page.evaluate(() => {
    window.__ft.setup({ ac: 'c172', mode: 'runway', fail: true }); game.fail = 'soon'; failReset(); SYS.run = true; SYS.pbrake = false;
    let pv = 0, at = null;
    const r = window.__ft.run(90, (s, c, dt) => { let elev = 0; if (c.kias >= ACFT.v.rotate || !c.onGround) elev = (9 - c.pitch) * 0.06 - (c.pitch - pv) / dt * 0.03; pv = c.pitch; s.ovr = { elev, ail: -c.bank * 0.04, rud: 0 }; s.thr = 1; s.brake = false; if (FAIL.kind && !at) at = Math.round(c.aglR); });
    game.fail = 'none'; return { kind: FAIL.kind, at, crashed: r.crashed };
  });
  check('"soon": a failure once 500 ft up after the takeoff', soon.kind && soon.at >= 500 && soon.at < 650, soon);
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
