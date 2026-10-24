// CADET — test/helpers/pattern-hook.mjs : the shape of the circuit for FLIGHT LAB's scripted pilot in t2.
// FLIGHT LAB's bot (flight-lab/test/bot.mjs) flies t2's descent and base by turning straight from abeam the threshold
// onto the centre line, so it reaches the runway high and lands hard (FLIGHT LAB's own tests leave t2 out). This hook —
// runLesson's own place for one (it runs after the bot's hands, before each physics step) — flies the circuit the way
// the lesson grades it: from abeam the downwind carried on, the descent shallow enough to be on a long final, stable,
// by 500 ft (the base leg at 090°, the turn onto the centre line led a little); from there the approach and the landing
// are the bot's own (only the bank keeps helping above 150 ft). It writes the same inputs a keyboard pilot has (the
// pitch hold's target, the stick, the throttle). The same hook in FLIGHT LAB's runLesson and in CADET's flight gives
// the same inputs, so the same score.
export function patternHook(FL) {
  const DEG = Math.PI / 180, clamp = FL.physics.clamp, w180 = (a) => ((a % 360) + 540) % 360 - 180;
  const FINAL = -2700;                         // where the turn onto final ends (m before the threshold): 500 ft on a 3° path
  const st = { step: -1, pBase: null, iThr: 0 };
  return (L, t, dt = 1 / 120) => {
    const S = L.def.steps[L.step], c = L.last, s = L.s;
    if (!S || L.done || !c) return;
    if (st.step !== L.step) { st.step = L.step; st.pBase = null; if (!/接地/.test(S.name)) st.iThr = 0; }
    let h = null;
    const down = /降下開始/.test(S.name), base = /ベース/.test(S.name), fin = /ファイナル/.test(S.name);
    if (down || base) {
      const onBase = base && c.along < FINAL + 150;
      h = !onBase ? 180 : c.cross < -520 ? 90 : 360 - clamp(c.cross * 0.35, -45, 45);
      // the height for where we are: 550 ft at the end of the turn onto final, 3° (and a little) above that before it
      const togo = (onBase ? 0 : Math.max(0, c.along - FINAL)) + Math.abs(c.cross);
      const aglT = Math.min(1000, 550 + togo * 0.06 * 3.28084), vsT = clamp((aglT - c.aglR) * 2.5, -600, 150);
      if (st.pBase == null) st.pBase = c.pitch;
      st.pBase = clamp(st.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15);
      s.keyHold = true; s.pTgt = clamp(st.pBase + (vsT - c.vs) * 0.004, -20, 22); s.pRate = 0;
      const kt = down ? 80 : 75, e = kt - c.kias;
      st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + st.iThr * 0.5) * dt * 2, 0, 1);
    } else if (fin || (/接地/.test(S.name) && c.aglR > 16)) {
      // (the heading for a track onto the centre line: the crab the wind needs added — r1's crosswind kept it 30 m off)
      if (c.aglR > 150) h = 360 - clamp(c.cross * 0.35, -45, 45) + (c.gsK > 30 ? clamp(w180(c.hdg - c.trk), -20, 20) : 0);
      // three knots above the bot's own speed (from the approach speed itself its flare floats down to the slowest
      // touchdown the lesson allows); the power alone, as the bot's own speed hold does it
      if (!c.onGround) { const e = L.V.appr + 3 - c.kias; st.iThr = clamp(st.iThr + e * 0.004 * dt, -0.4, 0.4); s.thr = clamp(s.thr + (e * 0.02 + st.iThr * 0.5) * dt * 2, 0, 1); }
    }
    // the flare: not so much that it balloons (climbing again a few feet up, it floats on and lands slow)
    if (/接地/.test(S.name) && !c.onGround && c.aglR < 16 && c.vs > -90) s.pTgt = Math.min(s.pTgt, c.pitch - 0.6);
    if (h == null) return;
    const bankT = clamp(w180(h - c.hdg) * 1.5, -25, 25), p = -s.w[2] / DEG;
    s.rIn = clamp(0.045 * (bankT - s.out.bank) - 0.012 * p, -1, 1);
  };
}
