// Air traffic control in free flight: the radio calls of a flight, pressed (Q) as a pilot would, with the flights
// flown by the same scripted pilots as flighttest.js (headless test bench). Cases:
//   departure: on the runway, ready for departure, the takeoff clearance read back, the takeoff, the handoff to
//     departure and the check-in; expected: the calls in order, nothing noted
//   no clearance: the radio on, the takeoff without calling; expected: noted
//   arrival: on final, the tower's landing clearance read back, the landing, the vacate instruction; expected: the
//     landing graded with nothing about ATC
//   no landing clearance: the radio on, the landing without calling; expected: in the landing grade's notes
// Offline. Prints each check; exits 1 if any failed.
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
(async () => {
  const root = process.env.ROOT || path.resolve(__dirname, '../..');
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--disable-http2'] });
  const page = await browser.newPage({ viewport: { width: 640, height: 360 } });
  await page.route(/^http:\/\/127\.0\.0\.1:8765\//, route => { const p = path.join(root, decodeURIComponent(new URL(route.request().url()).pathname)); try { route.fulfill({ status: 200, body: fs.readFileSync(p), contentType: p.endsWith('.html') ? 'text/html' : 'application/octet-stream' }); } catch (e) { route.fulfill({ status: 404, body: '' }); } });
  await page.route(/^https:/, route => route.abort());
  page.on('pageerror', e => console.log('PAGEERROR: ' + e.message + ' | ' + String(e.stack || '').split('\n').slice(1, 3).join(' < ')));
  await page.goto('http://127.0.0.1:8765/flight-sim.html', { waitUntil: 'load' });
  await page.waitForFunction(() => window.__ft && typeof game !== 'undefined' && game.state !== 'loading', null, { timeout: 180000 });
  const results = [];
  const check = (name, ok, got) => { results.push(ok); console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}  ${JSON.stringify(got)}`); };
  // the pilots (as flighttest.js), put in the page once
  await page.evaluate(() => {
    window.__toPilot = () => { const big = ACFT.v.appr > 100, vr = ACFT.v.rotate, th = big ? 14 : 9; let pv = 0;
      return (s, c, dt) => { let elev = 0; if (c.kias >= vr || !c.onGround) elev = (th - c.pitch) * 0.06 - (c.pitch - pv) / dt * (big ? 0.06 : 0.03); pv = c.pitch;
        if (!c.onGround && c.aglR > 100 && c.vs > 0) s.gearDown = false; const hdgErr = ((c.rwyHdg - c.hdg + 540) % 360) - 180;
        s.ovr = { elev, ail: -c.bank * 0.04, rud: c.onGround ? Math.max(-1, Math.min(1, hdgErr * 0.1 - c.v * 0.05)) : 0 }; s.thr = 1; s.brake = false; }; };
    window.__ldgPilot = () => { const big = ACFT.v.appr > 100, flareH = big ? 40 : 22, vref = ACFT.v.appr; let thr = sim.thr, pI = 0, prevBank = 0, prevPitch = 0; const w180 = a => ((a + 540) % 360) - 180;
      return (s, c, dt) => { const aim = -c.len / 2 + 300, dist = aim - c.u, tgt = Math.max(0, Math.tan(3 * Math.PI / 180) * dist * 3.28084);
        const hdgCmd = c.rwyHdg + Math.max(-15, Math.min(15, big ? -c.v * 0.5 - c.latV * 2 : -c.v * 1.2 - c.latV * 3)), bl = c.aglR < 60 ? 4 : 15, bankCmd = c.onGround ? 0 : Math.max(-bl, Math.min(bl, w180(hdgCmd - c.hdg) * (big ? 1.0 : 2)));
        const ail = (bankCmd - c.bank) * (big ? 0.025 : 0.05) - (c.bank - prevBank) / dt * (big ? 0.04 : 0.02); prevBank = c.bank;
        let vsCmd = -c.gs * 101.27 * Math.tan(3 * Math.PI / 180) + (tgt - c.aglR) * 6; if (c.aglR < flareH && !c.onGround) vsCmd = Math.max(vsCmd, -Math.max(big ? 160 : 60, c.aglR * (big ? 9 : 6)));
        pI += (vsCmd - c.vs) * dt * (big ? 0.00004 : 0.0001); pI = Math.max(-0.3, Math.min(0.3, pI));
        let elev = (vsCmd - c.vs) * (big ? 0.0006 : 0.0015) + pI - (c.pitch - prevPitch) / dt * 0.05; prevPitch = c.pitch; if (c.onGround) elev = big ? -0.05 : 0.1, pI = 0;
        if (c.aglR < flareH * 0.5 || c.onGround) thr = 0; else thr = Math.max(0.05, Math.min(1, thr + (vref - c.kias) * dt * 0.05));
        const rud = c.onGround ? Math.max(-1, Math.min(1, w180(c.rwyHdg - c.hdg) * 0.08 - c.v * 0.05)) : 0;
        s.ovr = { elev, ail, rud }; s.thr = thr; s.brake = c.onGround && c.gs < (big ? 120 : 55); }; };
    window.__atc = () => ({ st: ATC.st, need: !!ATC.need, call: ATC.call && ATC.call.h, notes: ATC.notes.slice(), clrTO: ATC.clrTO, clrLand: ATC.clrLand, log: ATC.log.map(l => (l.who === 'me' ? 'ME ' : l.unit + ': ') + l.en) });
  });
  const q = () => page.evaluate(() => { atcKey(); return window.__atc(); });
  const run = (sec, pilot) => page.evaluate(([sec, pilot]) => { const p = pilot ? window['__' + pilot + 'Pilot']() : (s => { s.ovr = { elev: 0, ail: 0, rud: 0 }; s.thr = 0; s.brake = true; }); const r = window.__ft.run(sec, p); return { ...window.__atc(), result: r.result, crashed: r.crashed }; }, [sec, pilot]);

  // ---- departure ----
  await page.evaluate(() => window.__ft.setup({ ac: 'c172', mode: 'runway' }));
  await q(); let a = await run(0.2);
  check('on the runway, Q: the next call is ready for departure', a.st === 'taxi' && /離陸準備/.test(a.call || ''), a);
  await q(); a = await q();
  check('ready, the clearance, read back: cleared for takeoff', a.clrTO && a.st === 'takeoff' && a.log.some(l => /cleared for takeoff\.$/.test(l)), a.log);
  a = await run(100, 'to');
  check('after the takeoff: the tower hands over to departure', a.need && a.st === 'handoff' && a.log.some(l => /contact departure/.test(l)), a);
  await q(); a = await run(0.1, 'to'); await q(); a = await q();
  check('departure: checked in, climb instruction read back, nothing noted', a.st === 'enroute' && !a.notes.length && /Climb and maintain/.test(a.log[a.log.length - 1]), a);
  await page.evaluate(() => window.__ft.end());

  // ---- no takeoff clearance ----
  await page.evaluate(() => window.__ft.setup({ ac: 'c172', mode: 'runway' }));
  await q(); a = await run(20, 'to');
  check('takeoff without the clearance: noted', a.notes.some(n => /離陸許可/.test(n)), a.notes);
  await page.evaluate(() => window.__ft.end());

  // ---- arrival ----
  for (const ac of ['c172', 'b738']) {
    await page.evaluate(o => window.__ft.setup(o), { ac, mode: 'landing' });
    await q(); a = await run(0.2, 'ldg');
    check(`${ac} on final, Q: the call is to the tower`, a.st === 'tower' && /タワー/.test(a.call || ''), a);
    await q(); a = await q();
    check(`${ac} the landing clearance read back`, a.clrLand && a.st === 'landing', a.log.slice(-2));
    a = await run(220, 'ldg');
    check(`${ac} landed: vacate instruction, no ATC note in the grade`, a.log.some(l => /vacate runway/.test(l)) && a.result && !a.result.some(r => /管制/.test(r)), { log: a.log.slice(-1), result: a.result && a.result.slice(-2) });
    await page.evaluate(() => window.__ft.end());
  }
  // ---- no landing clearance ----
  await page.evaluate(() => window.__ft.setup({ ac: 'c172', mode: 'landing' }));
  await q(); a = await run(220, 'ldg');
  check('landing without the clearance: in the grade', a.result && a.result.some(r => /管制：着陸許可/.test(r)), a.result && a.result.slice(-3));
  await page.evaluate(() => window.__ft.end());
  console.log(`${results.filter(x => x).length}/${results.length} passed`);
  await browser.close();
  process.exit(results.every(x => x) ? 0 : 1);
})();
