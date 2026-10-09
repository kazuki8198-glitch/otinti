// A scripted test pilot for the tests. It uses the SAME inputs a keyboard pilot has: the pitch hold's target attitude
// (W / S move it), the roll stick (A / D), the rudder (Q / E), the throttle (R / F), flaps, gear, brakes, the feather
// keys, the checklist (Enter) and the ATC answers (1–3). It reads what the instructor asks for — the current step's
// guide (speed, power, climb rate, bank) and its targets — and flies it with simple controllers. It proves the
// lessons can be flown and graded; it is not a model of a good pilot.
export function makeBot(FL) {
  const P = FL.physics, SC = FL.school, DEG = Math.PI / 180, clamp = P.clamp;
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const st = { pBase: null, iThr: 0, lastIas: null, lastStep: -1, flare: false };
  function reset() { st.pBase = null; st.iThr = 0; st.lastIas = null; st.flare = false; st.base = null; }
  // the hands: a pitch target (the hold), a bank target (the stick), the rudder
  function pitchTo(s, deg) { s.keyHold = true; s.pTgt = clamp(deg, -20, 22); s.pRate = 0; }
  function bankTo(s, bankT) { const o = s.out, p = -s.w[2] / DEG; s.rIn = clamp(0.045 * (bankT - o.bank) - 0.012 * p, -1, 1); }
  function headTo(s, c, hdgT, maxBank = 25) { bankTo(s, clamp(w180(hdgT - c.hdg) * 1.5, -maxBank, maxBank)); }
  // speed with the throttle (level flight)
  function speedThr(s, c, kt, dt) { const e = kt - c.kias; st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + st.iThr * 0.5) * dt * 2, 0, 1); }
  // speed with the nose (climb / glide / approach): pitch up when fast, with the speed trend as damping
  function speedPitch(s, c, kt, dt) {
    const dv = st.lastIas == null ? 0 : (c.kias - st.lastIas) / dt;
    if (st.pBase == null) st.pBase = c.pitch;
    st.pBase = clamp(st.pBase + (c.kias - kt) * 0.05 * dt, -15, 18);
    pitchTo(s, st.pBase + 0.35 * (c.kias - kt) + 1.5 * dv);
  }
  // altitude / vertical speed with the nose (level flight)
  function vsPitch(s, c, vsT, dt) {
    if (st.pBase == null) st.pBase = c.pitch;
    st.pBase = clamp(st.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15);
    pitchTo(s, st.pBase + (vsT - c.vs) * 0.004);
  }
  const altVs = (c, alt) => clamp((alt - c.alt) * 3, -700, 700);
  function rudder(s, c) {
    if (s.A.twin && s.eng.some(e => !e.run)) { s.rud = clamp((s.rudNeed || 0) + 0.04 * c.beta, -1, 1); return; }
    s.opts.autoRud = true;
  }
  // the instructor's request → the controls
  function fly(L, dt) {
    const s = L.s, c = L.last, S = L.def.steps[L.step];
    if (!S || L.done) return;
    if (L.step !== st.lastStep) { st.lastStep = L.step; reset(); }
    // dialogs: the checklist (set up what it checks, then confirm), the ATC read-back (the right answer)
    if (S.checklist && L.check) {
      if (S.checklist.includes('landing')) { s.flapIdx = Math.max(s.flapIdx, s.A.twin ? 1 : 3); if (!s.A.gear.fixed) s.gearDown = true; }
      if (S.checklist.includes('takeoff')) { s.flapIdx = 0; s.trim = 0; s.thr = 0; }
      if (S.checklist.includes('engine_failure')) { s.flapIdx = 0; s.gearDown = false; }
      SC.checklistNext(L); return;
    }
    if (S.atc && L.atc) { SC.answerAtc(L, L.atc.ok); return; }
    if (S.estimate && !L.estimate) { const t = FL.syllabus.estimateTruth(L, S.estimate); FL.syllabus.submitEstimate(L, { hdg: t.brg, dist: t.dist, eteMin: t.eteMin }); return; }
    rudder(s, c);
    const g = S.g && typeof S.g === 'object' ? S.g : {}, name = S.name || '';
    const tv = k => { const sp = S.tgt && S.tgt[k]; return sp ? (typeof sp[0] === 'function' ? sp[0](L, c) : sp[0]) : null; };
    const alt = tv('alt') != null ? tv('alt') : L.alt0, hdg = tv('hdg') != null ? tv('hdg') : L.hdg0;
    // on the ground: full power, the rudder on the centre line, rotate at Vr
    if (c.onGround && /離陸|ローテーション|滑走|フルパワー/.test(name)) {
      s.brake = false; s.thr = 1; s.opts.autoRud = false;
      s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1);
      s.pIn = c.kias > L.V.rotate - 1 ? 0.65 : 0; s.rIn = 0; return;
    }
    if (/離陸中止/.test(name)) { s.thr = 0; s.brake = true; s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1); return; }
    // landing: the flare and the roll-out
    if (/接地|着陸$|滑走路視認/.test(name)) {
      if (c.onGround) { s.thr = 0; s.brake = c.gsK < 60; s.pIn = 0; s.opts.autoRud = false; s.rud = clamp(-0.06 * w180(c.hdg - 360) - 0.02 * c.cross, -1, 1); return; }
      { const crab = w180(c.hdg - c.trk); headTo(s, c, 360 - clamp(c.cross * 0.5, -8, 8) - clamp(c.latV * 2, -6, 6) + (c.aglR > 12 ? crab : 0), 8); }
      if (c.aglR < 16 || st.flare) {
        // the flare: idle, the nose up as the ground comes, more if the sink is fast
        if (!st.flare) { st.flare = true; st.p0 = c.pitch; }
        s.thr = 0; pitchTo(s, clamp(st.p0 + (16 - c.aglR) / 16 * 8 + clamp((-c.vs - 150) * 0.01, 0, 3), -2, 8));
      } else {
        // the bot flies the path with the nose and the speed with the power (steadier for a script)
        const vsT = -(c.gsK * 5.3) - clamp((c.gp - 3) * 250, -300, 300);
        vsPitch(s, c, vsT, dt); speedThr(s, c, (S.g && S.g.kt) || L.V.appr - 2, dt);
      }
      return;
    }
    // stalls: idle (or full) and the nose up slowly; the recovery
    if (/失速への進入/.test(name)) { s.thr = /パワーオン|全開/.test(L.sayText) ? 1 : 0; pitchTo(s, Math.min(c.pitch + 1.0, 18)); headTo(s, c, hdg); return; }
    if (/失速からの回復/.test(name)) { s.thr = 1; if (c.kias < L.V.x) pitchTo(s, 0); else pitchTo(s, 8); bankTo(s, 0); return; }
    // the engine-out drills
    if (S.fail === 'engine' || g.pwr === 'dead') {
      if (s.A.twin) {
        const dead = s.eng.findIndex(e => e.failed); if (dead >= 0 && !s.eng[dead].feather && L.t - (L.fail.engL ?? L.fail.engR ?? L.t) > 3) { s.eng[dead].feather = true; s.eng[dead].cut = true; }
        s.thr = 1; if (!s.gearDown) {} else if (c.aglR > 50) s.gearDown = false;
        speedPitch(s, c, g.kt || L.V.yse, dt); const live = s.eng[0].failed ? 1 : -1;
        bankTo(s, 3 * live + clamp(w180((tv('hdg') != null ? hdg : c.rwyHdg && /上昇/.test(name) ? 360 : hdg) - c.hdg) * 0.5, -5, 5));
        return;
      }
      s.thr = 0; speedPitch(s, c, g.kt || L.V.glide, dt);
      // toward the runway threshold area (the 'final' point 2 km out), then line up
      const pos = P.ne(s), R = P.LAB_RWY, aim = P.rwyToNE(R, c.aglR > 600 ? -1500 : 200, 0);
      const brg = FL.avionics.trueToMag(FL.avionics.neBearing(pos, { n: aim[0], e: aim[1] }), P.MAGVAR_W);
      headTo(s, c, c.along > -1700 && c.aglR < 700 && Math.abs(c.cross) < 600 ? 360 - clamp(c.cross * 0.3, -20, 20) : brg, 30);
      if (c.aglR < 350 && c.along > -1500) s.flapIdx = 2;
      if (c.aglR < 18) { s.thr = 0; pitchTo(s, 5); }
      return;
    }
    // flight by the guide
    const how = g.how || 'level';
    if (g.flaps != null && s.flapIdx !== g.flaps && !/接地/.test(name)) s.flapIdx = g.flaps;
    if (s.A.twin && !c.onGround && c.aglR > 150 && c.vs > 100 && s.gearDown && how === 'climbFull') s.gearDown = false;
    if (how === 'climbFull') { s.thr = 1; speedPitch(s, c, g.kt, dt); headTo(s, c, S.tgt && S.tgt.rhdg ? 360 : hdg); }
    else if (how === 'turn') { const dir = /左/.test(name) ? -1 : 1; speedThr(s, c, g.kt, dt); vsPitch(s, c, altVs(c, alt), dt); bankTo(s, dir * (S.tgt && S.tgt.abank ? S.tgt.abank[0] : g.bank || 30)); if (S.tgt && S.tgt.arate) bankTo(s, Math.abs(L.st.turned) > 80 ? 0 : dir * (g.bank || 17)); }
    else if (how === 'rate') {
      // the guide's power for the rate, trimmed by the error; the speed with the nose
      if (st.base == null) st.base = clamp(P.steadyState(s, g.kt, g.fpm || 0, { altFt: c.alt }).thr, 0, 1);
      const e = (g.fpm || 0) - c.vs; st.iThr = clamp(st.iThr + e * 0.00008 * dt, -0.3, 0.3);
      s.thr = clamp(st.base + e * 0.0003 + st.iThr, 0, 1); speedPitch(s, c, g.kt, dt); headTo(s, c, hdg);
    }
    else if (how === 'approach' || how === 'ils' || how === 'pattern') {
      // the vertical path: from the PAPI angle (or the glide slope), power for the path, pitch for speed
      const vsT = how === 'ils' ? -(c.gsK * 5.3) + clamp(c.gsd, -2, 2) * 200 : how === 'pattern' ? (g.fpm || -500) : -(c.gsK * 5.3) - clamp((c.gp - 3) * 250, -300, 300);
      vsPitch(s, c, vsT, dt); speedThr(s, c, g.kt, dt);
      const crab = c.gsK > 30 ? w180(c.hdg - c.trk) : 0, lat = (how === 'ils' ? 360 + clamp(c.loc * 12, -30, 30) : 360 - clamp(c.cross * 0.12, -30, 30)) + crab;
      headTo(s, c, lat, 20);
    }
    else if (how === 'oei') { s.thr = 1; speedPitch(s, c, g.kt, dt); const live = s.eng[0].failed ? 1 : -1; bankTo(s, 3 * live + clamp(w180(hdg - c.hdg) * 0.4, -4, 4)); }
    else if (how === 'slow') { speedPitch(s, c, g.kt, dt); const e = alt - c.alt; st.iThr = clamp(st.iThr + e * 0.0004 * dt, -0.3, 0.3); s.thr = clamp(0.55 + e * 0.004 + st.iThr, 0, 1); headTo(s, c, hdg, 10); }
    else {
      // level: altitude by the nose, speed by the throttle; heading (or the CDI, or a waypoint)
      speedThr(s, c, g.kt || 100, dt);
      vsPitch(s, c, altVs(c, alt), dt);
      let h = hdg;
      if (S.tgt && (S.tgt.cdi || S.tgt.loc)) h = (L.av.crs || 360) + clamp(c.cdi * 15, -30, 30);
      if (/ローカライザー/.test(name)) h = c.navFlag || Math.abs(c.loc) > 1.6 ? L.intHdg || 330 : 360 + clamp(c.loc * 12, -30, 30);
      if (/LAB-A/.test(name)) h = brgTo(L, 'LABEA'); if (/LAB-F/.test(name)) h = brgTo(L, 'LABEF');
      if (S.tgt && S.tgt.trk) h = hdg + (hdg - c.trk);
      headTo(s, c, h);
    }
    st.lastIas = c.kias;
  }
  function brgTo(L, id) { const A = FL.avionics, w = A.wpt(id); return A.trueToMag(A.neBearing(P.ne(L.s), w), P.MAGVAR_W); }
  return { fly, reset, st };
}
// run a lesson with the bot for up to maxSec; returns the lesson
export function runLesson(FL, id, levelId = 'intro', maxSec = 900, hook) {
  const SC = FL.school, P = FL.physics, dt = 1 / 120, bot = makeBot(FL);
  const L = SC.startLesson(id, levelId);
  for (let i = 0; i < maxSec * 120 && !L.done; i++) {
    bot.fly(L, dt);
    if (hook) hook(L, i * dt);
    P.step(L.s, dt);
    SC.update(L, dt);
  }
  return L;
}
