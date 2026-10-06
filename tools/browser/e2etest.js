// One whole flight, gate to gate as far as the sim goes: free flight from the runway at Haneda, the radio (Q) used
// throughout, the takeoff, a circuit (climb out, a crosswind leg, a long downwind, an intercept heading), the
// autopilot's APR down the ILS, the landing by hand from 100 ft (the scripted pilot of flighttest.js), stopped and
// the parking brake set. Expected: the phases in order, the clearances read back, the debrief (FLIGHT COMPLETE) with
// the landing graded and the flight's summary, nothing noted by ATC. CASES=c172,b738 (default c172)
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
  let bad = 0;
  for (const ac of (process.env.CASES || 'c172').split(',')) {
    const r = await page.evaluate((ac) => {
      window.__ft.setup({ ac, mode: 'runway' }); SYS.run = true; SYS.pbrake = false;
      atcKey(); atcStep(0); atcKey(); atcKey();                       // radio on, ready for departure, the clearance read back
      const big = ACFT.v.appr > 100, vr = ACFT.v.rotate, th = big ? 14 : 9, H = RWY.hdg, vref = ACFT.v.appr, cruiseAlt = (big ? 3000 : 2000) / FT;
      let leg = 'takeoff', legT = 0, pv = 0, lastQ = 0, ldg = null, events = [];
      const w180 = a => ((a + 540) % 360) - 180;
      const mark = (n, c) => { events.push(`${Math.round(c.t)}s ${n}`); leg = n; legT = c.t; };
      // the landing pilot (flighttest.js), from the autopilot's 100 ft to the stop
      const makeLdg = () => { let thr = sim.thr, pI = 0, prevBank = 0, prevPitch = 0; const flareH = big ? 40 : 22;
        return (s, c, dt) => { const aim = -c.len / 2 + 300, dist = aim - c.u, tgt = Math.max(0, Math.tan(3 * DEG) * dist * 3.28084);
          const hdgCmd = c.rwyHdg + clamp(big ? -c.v * 0.5 - c.latV * 2 : -c.v * 1.2 - c.latV * 3, -15, 15), bankCmd = c.onGround ? 0 : clamp(w180(hdgCmd - c.hdg) * (big ? 1 : 2), -4, 4);
          const ail = (bankCmd - c.bank) * (big ? 0.025 : 0.05) - (c.bank - prevBank) / dt * (big ? 0.04 : 0.02); prevBank = c.bank;
          let vsCmd = -c.gs * 101.27 * Math.tan(3 * DEG) + (tgt - c.aglR) * 6; if (c.aglR < flareH && !c.onGround) vsCmd = Math.max(vsCmd, -Math.max(big ? 160 : 60, c.aglR * (big ? 9 : 6)));
          pI = clamp(pI + (vsCmd - c.vs) * dt * (big ? 0.00004 : 0.0001), -0.3, 0.3);
          let elev = (vsCmd - c.vs) * (big ? 0.0006 : 0.0015) + pI - (c.pitch - prevPitch) / dt * 0.05; prevPitch = c.pitch; if (c.onGround) elev = big ? -0.05 : 0.1, pI = 0;
          thr = c.aglR < flareH * 0.5 || c.onGround ? 0 : clamp(thr + (vref - c.kias) * dt * 0.05, 0.05, 1);
          s.ovr = { elev, ail, rud: c.onGround ? clamp(w180(c.rwyHdg - c.hdg) * 0.08 - c.v * 0.05, -1, 1) : 0 }; s.thr = thr; s.brake = c.onGround && c.gs < (big ? 120 : 55); }; };
      const pilot = (s, c, dt) => {
        // the radio: answer and call when there is something to say (a few seconds apart, as a pilot would)
        if ((ATC.need || ATC.call) && c.t - lastQ > 3) { lastQ = c.t; atcKey(); }
        if (leg === 'takeoff') {
          let elev = 0; if (c.kias >= vr || !c.onGround) elev = (th - c.pitch) * 0.06 - (c.pitch - pv) / dt * (big ? 0.06 : 0.03); pv = c.pitch;
          if (!c.onGround && c.aglR > 100) s.gearDown = false;
          s.ovr = { elev, ail: -c.bank * 0.04, rud: c.onGround ? clamp(w180(H - c.hdg) * 0.1 - c.v * 0.05, -1, 1) : 0 }; s.thr = 1; s.brake = false;
          if (c.aglR > 1000) { s.flapIdx = 0; s.ovr = null; game.ap = false; doAction('ap'); game.apLat = 'hdg'; game.apHdg = (H + 90) % 360; game.apAlt = cruiseAlt + RWY.elev; game.apVert = 'flc'; if (big) game.apSpd = 210; mark('crosswind', c); }
          return;
        }
        s.ovr = null;
        if (!big) s.thr = leg === 'final' ? clamp(s.thr + (vref + 5 - c.kias) * 0.0006 - c.vs * 0.000002, 0.05, 1) : 0.75;
        if (leg === 'crosswind' && c.t - legT > (big ? 45 : 60)) { game.apHdg = (H + 180) % 360; mark('downwind', c); }
        if (leg === 'downwind' && c.u < -RWY.len / 2 - (big ? 16000 : 11000)) {
          if (big) { game.apSpd = 170; s.gearDown = true; }
          s.flapIdx = big ? 2 : 1; game.apHdg = (H + (c.v > 0 ? -150 : 150) + 360) % 360; mark('base', c); }
        if (leg === 'base' && Math.abs(w180(game.apHdg - c.hdg)) < 5) { game.apHdg = (H + (c.v > 0 ? -30 : 30) + 360) % 360; doAction('apr'); game.apHdg = (H + (c.v > 0 ? -30 : 30) + 360) % 360; s.gearDown = true; s.flapIdx = big ? 3 : 2; mark('final', c); }
        if (leg === 'final' && !game.ap) { ldg = makeLdg(); mark('landing', c); }
        if (leg === 'landing') { ldg(s, c, dt); if (c.onGround && c.gs < 1) { SYS.pbrake = true; } }
      };
      const out = window.__ft.run(1500, pilot, 0, { systems: true });
      const td = sim.tdLast;
      return { events, phases: [...new Set(out.phases.map(p => p[2]))], result: out.result, crashed: out.crashed, reason: out.reason, t: out.t, atc: ATC.log.slice(-3).map(l => l.en), notes: ATC.notes, td: td && { fpm: td.fpm, kt: Math.round(td.kias), v: +td.v.toFixed(1), u: Math.round(td.u) } };
    }, ac);
    const ok = !r.crashed && r.result && /管制/.test(r.result.join('|')) && r.result.some(x => /飛行時間/.test(x)) && !r.notes.length && ['上昇', '進入', '着陸', '着陸滑走'].every(p => r.phases.includes(p));
    if (!ok) bad++;
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${ac}: ${r.t} s, crashed ${r.crashed} ${r.reason || ''}`);
    console.log('  legs: ' + r.events.join(' → '));
    console.log('  phases: ' + r.phases.join(' → '));
    console.log('  touchdown: ' + JSON.stringify(r.td) + '  ATC notes: ' + JSON.stringify(r.notes));
    console.log('  last radio: ' + r.atc.join(' / '));
    console.log('  debrief: ' + (r.result ? r.result.join(' | ') : 'none'));
    await page.evaluate(() => window.__ft.end());
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
