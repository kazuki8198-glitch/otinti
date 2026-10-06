// Other traffic at the active runway (headless test bench, the traffic stepped with the physics). Cases:
//   arrival, runway free: it lands, rolls out, turns off and is gone
//   arrival, the player on the runway: it goes around, no collision
//   departure: it lines up, rolls, climbs out and is gone
//   ATC: the player at the holding point calls ready while an arrival is on short final: held short, then cleared
//     for takeoff once the runway is free again
// Offline. Prints each check; exits 1 if any failed.
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
  // the player held still: on the runway (as the mode starts it) or moved off it to the holding point beside it
  const setup = (offRunway) => page.evaluate((off) => {
    window.__ft.setup({ ac: 'c172', mode: 'runway' });
    if (off) { const p = rwyToWorld(-RWY.len / 2 + 250, -(RWY.wid / 2 + 70)); const g = groundAt(p[0], p[2]); sim.pos = [p[0], g.h - WHEEL_BOTTOM + 0.05, p[2]]; sim.vel = [0, 0, 0]; }
    TRAF.list.length = 0; TRAF.next = 1e9;
  }, offRunway);
  const run = (sec, kind) => page.evaluate(([sec, kind]) => {
    if (kind) trafSpawn(kind);
    const seen = new Set(), T0 = TRAF.list[0];
    const r = window.__ft.run(sec, s => { s.ovr = { elev: 0, ail: 0, rud: 0 }; s.thr = 0; s.brake = true; for (const T of TRAF.list) seen.add(T.st); }, 0, { traffic: true });
    return { states: [...seen], left: TRAF.list.length, last: T0 ? { st: T0.st, u: Math.round(T0.u), h: Math.round(T0.h), spd: Math.round(T0.spd) } : null, crashed: r.crashed, reason: r.reason || '', atc: ATC.log.map(l => l.en), st: ATC.st, need: !!ATC.need };
  }, [sec, kind]);

  await setup(true); let a = await run(260, 'arr');
  check('arrival, runway free: lands, rolls out, turns off, gone', ['final', 'flare', 'land', 'exit'].every(x => a.states.includes(x)) && !a.left && !a.crashed, a);
  await setup(false); a = await run(260, 'arr');
  check('arrival, the player on the runway: goes around, no collision', a.states.includes('goaround') && !a.states.includes('land') && !a.crashed, a);
  await setup(true); a = await run(200, 'dep');
  check('departure: lines up, rolls, climbs out, gone', ['lineup', 'roll', 'takeoff', 'climb'].every(x => a.states.includes(x)) && !a.left && !a.crashed, a);
  // ATC: an arrival on short final when the player calls ready
  await setup(true);
  await page.evaluate(() => { trafSpawn('arr'); TRAF.list[0].u = -RWY.len / 2 + 300 - 5000; atcKey(); atcStep(0); atcKey(); });
  a = await page.evaluate(() => ({ st: ATC.st, need: !!ATC.need, last: ATC.log[ATC.log.length - 1].en }));
  check('ready while an arrival is on short final: hold short', /hold short/.test(a.last), a);
  await page.evaluate(() => atcKey());
  a = await run(135);
  check('the runway free again: cleared for takeoff (to read back)', a.atc.some(l => /^JA4172, wind .*cleared for takeoff/.test(l)) && !a.crashed, { st: a.st, atc: a.atc.slice(-3) });
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
