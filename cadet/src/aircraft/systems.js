// CADET — aircraft/systems.js : the Archer's engine and electrics behind the cockpit's switches (M4).
// FLIGHT LAB's physics has no engine start: its engine runs from the first step (a lesson starts in the air or lined up).
// The one thing it does have is the mixture cut-off (s.eng[i].cut): a cut engine makes no power and winds down. This
// module owns that one field and nothing else of the physics state, so a lesson flown without touching the switches
// stays bit-identical to FLIGHT LAB (the tests check it).
//  - the electrics: MASTER powers the starter, the lights and (with AVIONICS) the G1000 type displays;
//  - the start (a cold, carburetted engine, as the published PA-28-181 checklists describe it): fuel on a tank, mixture
//    rich, throttle open about a quarter inch, primed 2–3 strokes, the key to START (the starter turns the propeller
//    while it is held there); the engine catches, the key springs back to BOTH. Not primed: it does not catch; primed
//    too much: it floods and catches only with the throttle well open (the instructor says why);
//  - running: it stops when the mixture is pulled to idle cut-off, the magnetos go OFF, or the selector is OFF (after
//    the fuel left in the lines, about 6 s);
//  - the run-up readings: the rpm the tachometer shows drops on one magneto (left 120, right 95 at 2,000 rpm: inside
//    the published limits of 175 and 50 between them) and with carburettor heat on (about 70). These are what the
//    gauge shows; the thrust stays the physics' own.
// Pure logic: no three.js, no DOM. The switches are the cockpit's object (cockpit.switches), shared.
export const MAG = ['OFF', 'R', 'L', 'BOTH', 'START'];
export const RUNUP = { rpm: 2000, maxDrop: 175, maxDiff: 50, dropL: 120, dropR: 95, carb: 70 };
const CRANK_RPM = 150, CATCH_RPM = 520, STARTER_MAX = 8, LINE_FUEL_S = 6;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// cold: everything off, as the aircraft is left on the apron (the selector on the left tank)
export const COLD = { master: false, avionics: false, fuelPump: false, beacon: false, nav: false, strobe: false, landing: false, taxi: false, pitot: false,
  mag: 'OFF', fuelSel: 'L', mixture: 0, carbHeat: false };
// in the air or lined up: as FLIGHT LAB's lessons start (everything that is on in flight)
export const RUNNING = { master: true, avionics: true, fuelPump: true, beacon: true, nav: true, strobe: true, landing: false, taxi: false, pitot: false,
  mag: 'BOTH', fuelSel: 'L', mixture: 1, carbHeat: false };

// createSystems(sw) → the systems for one aircraft; sw: the cockpit's switches (changed here only for the key's spring
// return). update(dt, s) every frame (or every physics step) returns the events since the last call (the same array,
// emptied each time): { type: 'crank' | 'catch' | 'nocatch' | 'stop' | 'nostarter' | 'surge', why? }.
export function createSystems(sw) {
  const st = { eng: 'off', dead: false, crankT: 0, primes: 0, warm: false, rpm: 0, lineT: LINE_FUEL_S, oil: 0, starterTried: false, reason: '' };
  const events = [];
  const emit = (type, why = '') => events.push({ type, why });
  function cut(s, on) {
    const e = s.eng[0]; if (!e) return;
    if (on) { e.cut = true; s.engStopNoted = true; }          // (this module says why it stopped)
    else { e.cut = false; s.engStopNoted = false; }
  }
  // the aircraft as left on the apron: switches off, the engine stopped and still
  function setCold(s) {
    Object.assign(sw, COLD);
    st.eng = 'off'; st.dead = false; st.crankT = 0; st.primes = 0; st.warm = false; st.rpm = 0; st.lineT = LINE_FUEL_S; st.oil = 0; st.reason = '';
    if (s) { cut(s, true); for (const e of s.eng) { e.rpm = 0; } s.rpm = 0; }
  }
  // the aircraft as a lesson starts it: everything on, the engine running (the physics' own rpm)
  function setRunning(s) {
    Object.assign(sw, RUNNING);
    st.eng = 'run'; st.dead = false; st.crankT = 0; st.warm = true; st.lineT = LINE_FUEL_S; st.reason = '';
    if (s) { if (s.eng[0] && s.eng[0].cut) cut(s, false); st.rpm = s.eng[0] ? s.eng[0].rpm || 0 : 0; }
    st.oil = 70;
  }
  // what the primer does (one stroke); a stroke without fuel does nothing
  function prime() { if (sw.fuelSel !== 'OFF') st.primes = Math.min(st.primes + 1, 9); return st.primes; }
  const tankFuel = (s) => (sw.fuelSel === 'L' ? s.fuel[0] : sw.fuelSel === 'R' ? s.fuel[1] : 0);
  // how long the starter has to turn before it catches (Infinity: it will not)
  function catchTime(s) {
    if (sw.fuelSel === 'OFF' || tankFuel(s) < 0.2) { st.reason = 'fuel'; return Infinity; }
    if (sw.mixture < 0.7) { st.reason = 'mixture'; return Infinity; }
    if (st.primes >= 6) { if (s.thr >= 0.45) { st.reason = ''; return 3.2; } st.reason = 'flooded'; return Infinity; }
    if (st.warm) { st.reason = ''; return 0.9; }
    if (st.primes === 0) { st.reason = 'prime'; return Infinity; }
    st.reason = '';
    return (st.primes === 1 ? 2.6 : 1.2) + (sw.fuelPump ? 0 : 0.4);
  }
  // the reason a start did not work, in the instructor's words
  const NOCATCH = {
    fuel: '燃料が来ていません。燃料セレクターをタンクに。', mixture: 'ミクスチャーをフル リッチにしてからかけます。',
    prime: 'エンジンが冷えているので、プライマーを 2〜3 回押してからかけます。',
    flooded: 'プライマーの押しすぎで、燃料が多すぎます。スロットルを半分ほど開けて、もう一度かけます（かかったらすぐに戻す）。',
    starter: 'スターターは長く回し続けないようにします。少し待ってから、もう一度。',
  };
  function update(dt, s) {
    events.length = 0;
    if (!s) return events;
    dt = clamp(dt || 0, 0, 0.25);
    // a twin (FLIGHT LAB's Seminole, flown from this cockpit in its lessons): its engines are the physics' alone
    if (s.eng.length > 1) { st.eng = 'run'; st.rpm = s.rpm || 0; st.oil = 70; return events; }
    const e = s.eng[0], master = !!sw.master;
    if (st.eng === 'off' || st.eng === 'stopping') {
      if (sw.mag === 'START') {
        if (!master) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', 'マスター スイッチが OFF なので、スターターが回りません。'); } }
        else { st.eng = 'crank'; st.crankT = 0; st.catchAt = catchTime(s); emit('crank'); }
      } else st.starterTried = false;
      // the propeller winds down (the physics' windmilling rpm in the air)
      const wind = s.onGround ? 0 : e ? e.rpm || 0 : 0;
      st.rpm = Math.max(wind, st.rpm - (st.rpm * 1.6 + 140) * dt);
      if (st.rpm <= 0.5 && st.eng === 'stopping') st.eng = 'off';
      st.oil = Math.max(0, st.oil - 60 * dt);
    }
    if (st.eng === 'crank') {
      st.crankT += dt;
      // the starter drags the propeller round, slowed at each compression
      st.rpm = CRANK_RPM * (0.8 + 0.2 * Math.sin(st.crankT * 2 * Math.PI * 4));
      if (sw.mag !== 'START' || !master) { st.eng = 'off'; }
      else if (st.crankT >= st.catchAt) {
        st.eng = 'run'; st.warm = true; st.primes = 0; st.lineT = LINE_FUEL_S;
        cut(s, false); if (e) e.rpm = CATCH_RPM; st.rpm = CATCH_RPM;
        sw.mag = 'BOTH';                                     // the key springs back
        emit('catch');
        if (s.thr > 0.35) emit('surge', 'スロットルが開きすぎています。かかった瞬間に回転が上がりすぎました。');
      } else if (st.crankT >= STARTER_MAX) {
        sw.mag = 'BOTH'; st.eng = 'off';
        emit('nocatch', NOCATCH[st.reason] || NOCATCH.starter);
      }
    }
    if (st.eng === 'run') {
      st.lineT = sw.fuelSel === 'OFF' ? st.lineT - dt : LINE_FUEL_S;
      let why = '';
      if (sw.mixture < 0.15) why = 'ミクスチャー アイドル カットオフ';
      else if (sw.mag === 'OFF') why = 'マグネトー OFF';
      else if (st.lineT <= 0) why = '燃料セレクター OFF';
      if (why) { st.eng = 'stopping'; cut(s, true); emit('stop', why); }
      else if (e && (e.failed || s.fuel[0] + s.fuel[1] <= 0)) {
        // stopped by the physics itself (a lesson's engine failure, no fuel left): the physics' own state is left alone
        // (a restart there brings it back), the gauge shows its rpm
        if (!st.dead) { st.dead = true; emit('stop', e.failed ? '故障' : '燃料切れ'); }
        st.rpm = e.rpm || 0; st.oil = Math.max(0, st.oil - 30 * dt);
      } else {
        st.dead = false;
        if (sw.mag === 'START') sw.mag = 'BOTH';             // (the starter does not engage while running: the key is let go)
        const r = e ? e.rpm || 0 : 0, k = clamp((r - 700) / 1300, 0, 1.25);
        const drop = (sw.mag === 'L' ? RUNUP.dropL : sw.mag === 'R' ? RUNUP.dropR : 0) * k + (sw.carbHeat ? RUNUP.carb * k : 0);
        st.rpm = Math.max(0, r - drop);
        st.oil += (clamp(55 + r * 0.012, 0, 85) - st.oil) * Math.min(1, dt * 1.5);
      }
    }
    return events;
  }
  return {
    sw, st, setCold, setRunning, prime, update, catchTime,
    get running() { return st.eng === 'run'; }, get cranking() { return st.eng === 'crank'; },
    get rpm() { return st.rpm; }, get oil() { return st.oil; }, get primes() { return st.primes; },
    get powered() { return !!sw.master; }, get avionicsOn() { return !!(sw.master && sw.avionics); },
  };
}
