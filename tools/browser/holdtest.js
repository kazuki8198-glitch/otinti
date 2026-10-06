// The keyboard's pitch hold: W/S (pressed through the page's input code each step) move the nose attitude to hold;
// released, the aircraft holds it. Cases per aircraft, in the air at its approach speed and at cruise: a 2-second S
// press then release (the nose up and staying there: the error and the wobble over the next 15 s), a short tap (a
// small change, as in a flare), the hold through a 20° turn; and a landing flared by key taps. Offline. (The C172 is
// bumped about 1° by the gusts of the light breeze: the limits allow for it.)
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
  for (const ac of ['c172', 'b738']) for (const fast of [false, true]) {
    const r = await page.evaluate(([ac, fast]) => {
      const A = AIRCRAFT.find(a => a.id === ac), kt = fast ? A.v.cruise * 0.85 : A.v.appr + 10;
      window.__ft.setup({ ac, mode: 'air', place: { lat: 35.4, lon: 139.95, agl: 2000, hdg: 90, kt } });
      game.assist = false; sim.flapIdx = fast ? 0 : 2; sim.flapDeg = FLAP_DEG[sim.flapIdx] || 0; sim.gearDown = !fast; sim.gearPos = fast ? 0 : 1;
      const thr0 = sim.thr = fast ? 0.75 : 0.55; let keyS = 0;
      // the page's input each step: S held while keyS > 0, the throttle kept, the wings level by the ailerons
      const step = (s, c, dt) => { keys.KeyS = keyS > 0; keyS -= dt; updateControls(dt); s.thr = thr0; s.ovr = null; };
      window.__ft.run(5, step);                                         // settle
      const p0 = attitude().pitch; keyS = 2;
      window.__ft.run(2.5, step); const tgt = sim.pTgt;
      const ps = []; window.__ft.run(15, (s, c, dt) => { step(s, c, dt); ps.push(c.pitch); }); const over = Math.max(...ps) - tgt;
      const err = ps.slice(-600).map(p => p - tgt), mean = err.reduce((a, b) => a + b) / err.length, wob = Math.max(...ps.slice(-600)) - Math.min(...ps.slice(-600));
      const t1 = sim.pTgt; keyS = 0.15; window.__ft.run(3, step); const tap = sim.pTgt - t1;
      // a turn: about 20° of bank (D, with the assist holding the bank), the pitch target held
      const pt = sim.pTgt, pp = []; game.assist = true; window.__ft.run(12, (s, c, dt) => { keys.KeyD = c.bank < 20; step(s, c, dt); keys.KeyD = false; pp.push(c.pitch); }); game.assist = false;
      keys.KeyS = false; keys.KeyD = false;
      return { over: +over.toFixed(2), kt: Math.round(kt), p0: +p0.toFixed(1), tgt: +tgt.toFixed(1), raised: +(tgt - p0).toFixed(1), mean: +mean.toFixed(2), wob: +wob.toFixed(2), tap: +tap.toFixed(2), turnErr: +(Math.max(...pp.slice(-300).map(p => Math.abs(p - pt)))).toFixed(1) };
    }, [ac, fast]);
    check(`${ac} ${fast ? 'cruise' : 'approach'}: S 2 s raises the nose and it stays (error, wobble), a tap moves it a little`, r.raised > 3 && r.over < 1.5 && Math.abs(r.mean) < 0.6 && r.wob < 1.5 && r.tap > 0.1 && r.tap < 1 && r.turnErr < 2, r);
  }
  // a landing flared by key taps: the approach flown by flighttest.js's pilot to 18 ft (35 ft for the 737), then hands off
  // the elevator: idle, and S held while the sink is more than about 200 ft/min (a pilot's flare by eye), released when it slows
  for (const ac of ['c172', 'b738']) {
    const r = await page.evaluate((ac) => {
      window.__ft.setup({ ac, mode: 'landing' }); game.assist = false;
      const big = ACFT.v.appr > 100, vref = ACFT.v.appr, hand = big ? 35 : 18; let thr = sim.thr, pI = 0, prevBank = 0, prevPitch = 0, keyS = 0, taps = 0, wait = 0, mine = false;
      const w180 = a => ((a + 540) % 360) - 180;
      const pilot = (s, c, dt) => {
        const aim = -c.len / 2 + 300, tgt = Math.max(0, Math.tan(3 * DEG) * (aim - c.u) * 3.28084);
        const hdgCmd = c.rwyHdg + clamp(big ? -c.v * 0.5 - c.latV * 2 : -c.v * 1.2 - c.latV * 3, -15, 15), bankCmd = c.onGround ? 0 : clamp(w180(hdgCmd - c.hdg) * (big ? 1 : 2), -4, 4);
        const ail = (bankCmd - c.bank) * (big ? 0.025 : 0.05) - (c.bank - prevBank) / dt * (big ? 0.04 : 0.02); prevBank = c.bank;
        if (!mine && c.aglR > hand && !c.onGround) {
          const vsCmd = -c.gs * 101.27 * Math.tan(3 * DEG) + (tgt - c.aglR) * 6; pI = clamp(pI + (vsCmd - c.vs) * dt * (big ? 0.00004 : 0.0001), -0.3, 0.3);
          const elev = (vsCmd - c.vs) * (big ? 0.0006 : 0.0015) + pI - (c.pitch - prevPitch) / dt * 0.05; prevPitch = c.pitch;
          thr = clamp(thr + (vref - c.kias) * dt * 0.05, 0.05, 1); s.ovr = { elev, ail, rud: 0 }; s.thr = thr; keys.KeyS = false; updateControls(dt); return;
        }
        if (!mine) { mine = true; sim.pTgt = c.pitch; }
        const want = !c.onGround && c.vs < -(big ? 200 : 150) && c.aglR < hand; if (want && keyS <= 0) taps++; keyS = want ? 0.05 : 0;
        keys.KeyS = keyS > 0; keyS -= dt; updateControls(dt);
        s.ovr = null; s.ail = ail; s.thr = big ? (c.aglR > 20 ? thr : 0) : 0; s.brake = c.onGround && c.gs < (big ? 120 : 55);
        s.ovr = null;                                                     // (from here the page's controls fly it: the keys' pitch hold)
      };
      const r = window.__ft.run(240, (s, c, dt) => { s.ovr = null; pilot(s, c, dt); });
      keys.KeyS = false;
      const td = r.first || r.td;
      return { taps, fpm: td && td.fpm, bounces: td && td.bounces, noseFirst: td && td.noseFirst, crashed: r.crashed };
    }, ac);
    check(`${ac} flared by key taps: a soft touchdown`, r.fpm != null && r.fpm < 450 && !r.bounces && !r.noseFirst && !r.crashed, r);
  }
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
