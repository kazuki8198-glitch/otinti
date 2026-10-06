// The aircraft's systems, switch by switch: each step sets the switches as a pilot would, lets the systems run for a
// while (the test bench steps the physics and the systems at 120 Hz, nothing drawn, the aircraft held on the runway
// with the brakes), and checks what the engine, the electrics and the fuel did. The C172 (piston) and the 737-800
// (turbine). Offline. Prints each check and the totals; exits 1 if any failed.
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
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state === 'menu', null, { timeout: 180000 });
  const results = [];
  const check = (name, ok, got) => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${JSON.stringify(got)}`); };
  // set the switches (a function body run in the page), then let it run sec seconds; returns the systems' state
  const step = (sec, js = '', thr = 0) => page.evaluate(([sec, js, thr]) => {
    if (js) new Function(js)();
    const hold = (s) => { s.ovr = { elev: 0, ail: 0, rud: 0 }; s.thr = thr; s.brake = true; };
    return window.__ft.run(sec, hold, 0, { systems: true }).sys;
  }, [sec, js, thr]);

  // ---- C172: piston ----
  await page.evaluate(() => window.__ft.setup({ ac: 'c172', mode: 'runway' }));
  let r = await step(0.5, 'sysReset(true)');
  check('C172 cold: engine stopped, no power', !r.run && !r.bus, r);
  r = await step(1, 'SYS.bat = true');
  check('C172 BAT on: the bus has power from the battery', r.bus && r.volts > 20 && r.amps < 0, r);
  r = await step(4, 'SYS.mags = 0; SYS.mix = 1; SYS.startHeld = true');
  check('C172 starter with the key OFF: turns but no start', !r.run, r);
  r = await step(3, 'SYS.mags = 3; SYS.mix = 1; SYS.startHeld = true');
  r = await step(3, 'SYS.startHeld = false');
  check('C172 key BOTH, mixture RICH, starter: the engine runs', r.run && r.rpm > 500, r);
  r = await step(5, 'SYS.alt = true');
  check('C172 alternator on with the engine running: charging', r.gen && r.amps > 0, r);
  r = await step(5, 'SYS.alt = false');
  check('C172 alternator off: the battery carries the load', !r.gen && r.amps < 0, r);
  r = await step(5, 'SYS.alt = true; SYS.mix = 0');
  check('C172 mixture to cut-off: the engine stops', !r.run, r);
  r = await step(3, 'SYS.mix = 1; SYS.startHeld = true'); r = await step(2, 'SYS.startHeld = false');
  r = await step(10, 'SYS.fuelSel = 0');
  check('C172 fuel selector OFF: the engine stops once the lines run dry', !r.run, r);
  r = await step(3, 'SYS.fuelSel = 3; SYS.startHeld = true'); r = await step(2, 'SYS.startHeld = false');
  r = await step(2, 'SYS.mags = 0');
  check('C172 key OFF: the engine stops', !r.run, r);
  r = await step(3, 'SYS.mags = 3; SYS.startHeld = true'); r = await step(2, 'SYS.startHeld = false');
  const f0 = await page.evaluate(() => [SYS.fuelL, SYS.fuelR]);
  r = await step(60, 'SYS.fuelSel = 1', 1);
  check('C172 selector LEFT at full power: only the left tank goes down', r.fuelL < f0[0] - 0.05 && Math.abs(r.fuelR - f0[1]) < 0.01 && r.flow > 0, { ...r, f0 });
  r = await step(60, 'SYS.fuelSel = 3', 1);
  check('C172 selector BOTH: both tanks go down', r.fuelR < f0[1] - 0.02, r);

  // ---- 737-800: turbine ----
  await page.evaluate(() => window.__ft.setup({ ac: 'b738', mode: 'runway' }));
  r = await step(0.5, 'sysReset(true)');
  check('737 cold: engines stopped, no power', !r.run && !r.bus, r);
  r = await step(1, 'SYS.bat = true');
  check('737 BAT on: power from the battery', r.bus, r);
  r = await step(60, 'SYS.fuelOn = true; SYS.start = true');
  check('737 start switch with the fuel lever on: the engine lights and comes to idle (N1 about 21 %)', r.run && r.spin >= 1 && r.rpm >= 18 && r.rpm <= 25, r);
  r = await step(5, 'SYS.alt = true');
  check('737 generator on: charging', r.gen && r.amps > 0, r);
  r = await step(3, 'SYS.bat = false');
  check('737 BAT off with the generators running: the buses stay powered', r.bus, r);
  r = await step(3, 'SYS.bat = true; SYS.fuelOn = false');
  check('737 fuel lever to CUTOFF: the engine stops', !r.run, r);

  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
