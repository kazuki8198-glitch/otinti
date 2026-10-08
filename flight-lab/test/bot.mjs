// A scripted test pilot for the tests: simple attitude / speed / heading controllers acting on the same controls
// as the keyboard or a gamepad (elevator, aileron, rudder, throttle, brakes). It proves the tasks can be flown.
export function makeBot(FL) {
  const P = FL.physics, A = FL.avionics, clamp = P.clamp;
  const st = { iAlt: 0, iSpd: 0 };
  // hold pitch / bank attitudes (degrees) with the stick
  function attitude(s, pitchT, bankT) {
    const o = s.out, q = s.w[1] / P.DEG, p = s.w[0] / P.DEG;
    s.ctl.elev = clamp(0.06 * (pitchT - o.pitch) - 0.025 * q, -1, 1);
    s.ctl.ail = clamp(0.05 * (bankT - o.bank) - 0.012 * p, -1, 1);
    s.ctl.rud = clamp(0.08 * o.beta - 0.05 * s.w[2] / P.DEG * (s.onGround ? 1 : 0), -1, 1);
  }
  // fly: target altitude (indicated ft), magnetic heading, IAS; or a target vertical speed instead of altitude
  function fly(s, av, dt, { alt, hdg, ias, vs, bank, thr }) {
    const o = s.out, ind = A.indicatedAlt(o.altTrue, s.qnh, av.baro), hdgM = A.trueToMag(o.hdgTrue, P.MAGVAR_W);
    let vsT = vs != null ? vs : clamp((alt - ind) * 3, -700, 700);
    let pitchT;
    if (thr != null) {
      // speed on pitch (climb / glide): pitch up when fast
      // with the speed's rate of change as damping (otherwise the long speed / height swing grows)
      const dv = st.lastIas == null ? 0 : (o.ias - st.lastIas) / dt;
      pitchT = clamp(o.pitch + 0.25 * (o.ias - ias) + 1.2 * dv, -15, 15);
      s.ctl.thr = thr;
    } else {
      pitchT = clamp((vsT - o.vsi) * 0.004 + o.alpha + vsT / 101.3 / Math.max(o.tas, 40) * 57.3, -12, 15);
      st.iSpd = clamp(st.iSpd + (ias - o.ias) * dt * 0.02, -0.5, 0.5);
      s.ctl.thr = clamp(s.ctl.thr + ((ias - o.ias) * 0.02 + st.iSpd * 0.02) * dt * 3, 0, 1);
    }
    st.lastIas = o.ias;
    const bankT = bank != null ? bank : clamp(A.hdgDiff(hdgM, hdg) * 1.5, -25, 25);
    attitude(s, pitchT, bankT);
    // trim like a pilot: slowly take out the steady stick force
    if (!s.onGround) s.ctl.trim = clamp(s.ctl.trim + s.ctl.elev * dt * 0.25, -1, 1);
  }
  return { fly, attitude, st };
}
// run a task with a pilot function for up to maxSec; returns the run
export function runTask(FL, taskId, levelId, pilot, maxSec = 700, setupHook) {
  const T = FL.training, P = FL.physics, dt = 1 / 120;
  const k = T.startTask(taskId, levelId, 'staged');
  if (setupHook) setupHook(k);
  let c = T.makeCtx(k.s, k.av);
  for (let i = 0; i < maxSec * 120 && !k.run.done; i++) {
    pilot(k, c, dt);
    P.step(k.s, dt);
    c = T.makeCtx(k.s, k.av);
    T.update(k.run, c, dt);
  }
  return k;
}
