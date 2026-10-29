// CADET — aircraft/systems.js : the Archer's engine and electrics behind the cockpit's switches (M4).
// The physics (FLIGHT LAB's, and this game's Sorajima model — the same states in both) has the engine systems: each
// engine's magnetos (s.eng[i].mag), mixture (mix), fuel selector (sel) and whether it has been started (on), with
// its own plain start (the key at START, fuel and a rich mixture, and it catches) and its own stops, and the
// powerplant model on top (leaning and EGT, the per-tank burn, carburettor ice), which also answers to the shared
// controls (s.mix / s.fuelSel / s.carbHeat). This module mirrors the cockpit's switches into both surfaces (sync,
// and the shared controls in update) and owns the mixture cut-off (s.eng[i].cut) as before, and layers the fuller
// start on top of the physics' plain one: the primer, flooding, the catch timing below and the run-up gauge are
// the cadet's, not the physics'. A lesson flown without touching the switches stays bit-identical to FLIGHT LAB
// (the tests check it): the mirrors write only the running configuration there.
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
  mag: 'OFF', fuelSel: 'L', mixture: 0, carbHeat: false, propCycleT: 0, propCycled: false };
// in the air or lined up: as FLIGHT LAB's lessons start (everything that is on in flight)
export const RUNNING = { master: true, avionics: true, fuelPump: true, beacon: true, nav: true, strobe: true, landing: false, taxi: false, pitot: false,
  mag: 'BOTH', fuelSel: 'L', mixture: 1, carbHeat: false, propCycleT: 0 };

// the reason a start did not work, in the instructor's words (M8: exported for its English, content/dialog/en.js)
export const NOCATCH = {
  fuel: '燃料が来ていません。燃料セレクターをタンクに。', mixture: 'ミクスチャーをフル リッチにしてからかけます。',
  prime: 'エンジンが冷えているので、プライマーを 2〜3 回押してからかけます。',
  flooded: 'プライマーの押しすぎで、燃料が多すぎます。スロットルを半分ほど開けて、もう一度かけます（かかったらすぐに戻す）。',
  starter: 'スターターは長く回し続けないようにします。少し待ってから、もう一度。',
};

// createSystems(sw) → the systems for one aircraft; sw: the cockpit's switches (changed here only for the key's spring
// return). update(dt, s) every frame (or every physics step) returns the events since the last call (the same array,
// emptied each time): { type: 'crank' | 'catch' | 'nocatch' | 'stop' | 'nostarter' | 'surge', why? }.
export function createSystems(sw) {
  // (M7) a fault the run-up finds: { dropL } a left magneto (a fouled plug or the magneto itself) dropping more than the
  // limit; null: none
  let fault = null;
  const st = { eng: 'off', dead: false, crankT: 0, primes: 0, warm: false, rpm: 0, lineT: LINE_FUEL_S, oil: 0, oilT: null, starterTried: false, reason: '' };
  // the electrical model: one battery (17 Ah), one alternator (55 A from about 1,000 rpm, through the master).
  // The loads are the switches' own (avionics, lights, the fuel pump, the starter while it cranks); the bus
  // voltage and the charge/discharge current are what the MFD shows. A flat battery turns nothing: no starter,
  // and (through fly-mode passing the voltage on) dark screens. An alternator failure is a day's fault, set the
  // way the magneto fault is (setElecFault); the battery then carries the panel for a while and the volts sag.
  const elec = { batt: 1, volts: 12.6, amps: 0, altFail: false, flat: false };
  let hobbs = 471.2;                                       // (this airframe's meter; session only — nothing saves it)
  function elecUpdate(dt, rpmNow, cranking) {
    const gen = sw.master && !elec.altFail ? clamp((rpmNow - 500) / 500, 0, 1) * 55 : 0;
    let load = 0;
    if (sw.avionics) load += 9; if (sw.beacon) load += 2; if (sw.nav) load += 2.5; if (sw.strobe) load += 1.5;
    if (sw.landing) load += 9; if (sw.taxi) load += 6; if (sw.pitot) load += 4; if (sw.fuelPump) load += 2.5;
    if (cranking) load += 65;
    let net = gen - load;
    if (net > 0 && elec.batt >= 1) net *= 0.06;            // (a full battery takes only a trickle)
    elec.batt = clamp(elec.batt + net * dt / (17 * 3600), 0, 1);
    const dead = elec.batt <= 0.001 && gen <= 1;
    elec.volts = dead ? 0 : gen > 1 ? 13.9 + 0.3 * (gen / 55) : 11.3 + 1.5 * elec.batt;
    elec.amps = dead ? 0 : Math.round(net);
    elec.flat = elec.batt <= 0.02;
  }
  // oil temperature (°F, the holder is st or one twin engine): minutes behind power, cooling slowly stopped;
  // until the first update it is the day's outside air
  function oilTemp(holder, dt, s, running, power) {
    const oatF = ((s.out && s.out.oat != null) ? s.out.oat : 15) * 9 / 5 + 32;
    if (holder.oilT == null) holder.oilT = oatF;
    const tgt = running ? 130 + 70 * clamp(power, 0, 1) : oatF;
    holder.oilT += (tgt - holder.oilT) * dt / (running ? 240 : 600);
  }
  const events = [];
  const emit = (type, why = '') => events.push({ type, why });
  // (k: one engine of a twin; without it every engine)
  function cut(s, on, k = null) {
    const es = k == null ? s.eng : [s.eng[k]];
    for (const e of es) { if (!e) continue; e.cut = !!on; if (!on) e.on = true; }   // (releasing the cut is always a catch or a lesson's running start: the physics' engine is started too)
    s.engStopNoted = !!on;                                     // (this module says why it stopped)
  }
  // the physics' engine systems follow the cockpit's switches, so anything reading the physics (the instruments,
  // a restart in the physics' own terms) sees the same engine the cadet has. The switches are the aircraft's one
  // set, so every engine gets the same mag / mixture / selector.
  function sync(s) {
    if (!s || !s.eng) return;
    for (const e of s.eng) { e.mag = sw.mag; e.mix = sw.mixture; e.sel = sw.fuelSel; }
  }
  // (M6) the twin: the same switches (one key, one primer, the mixtures together); START turns the starter of the
  // first engine not yet running — the left, then the right; each catches as the Archer's does
  const twin = [{ eng: 'off', crankT: 0, catchAt: Infinity, rpm: 0, oil: 0, oilT: null }, { eng: 'off', crankT: 0, catchAt: Infinity, rpm: 0, oil: 0, oilT: null }];
  const twinState = () => (twin.every(t => t.eng === 'run') ? 'run' : twin.some(t => t.eng === 'crank') ? 'crank' : twin.some(t => t.eng === 'run') ? 'half' : twin.some(t => t.eng === 'stopping') ? 'stopping' : 'off');
  // the aircraft as left on the apron: switches off, the engine stopped and still
  function setCold(s) {
    Object.assign(sw, COLD);
    st.eng = 'off'; st.dead = false; st.crankT = 0; st.primes = 0; st.warm = false; st.rpm = 0; st.lineT = LINE_FUEL_S; st.oil = 0; st.oilT = null; st.reason = '';
    elec.batt = 1; elec.volts = 12.6; elec.amps = 0; elec.flat = false;   // (a serviced battery; an alternator fault set for the day stays set)
    if (s) { cut(s, true); sync(s); for (const e of s.eng) { e.rpm = 0; } s.rpm = 0; }
    for (const t of twin) Object.assign(t, { eng: 'off', crankT: 0, catchAt: Infinity, rpm: 0, oil: 0, oilT: null });
  }
  // the aircraft as a lesson starts it: everything on, the engine running (the physics' own rpm)
  function setRunning(s) {
    Object.assign(sw, RUNNING);
    st.eng = 'run'; st.dead = false; st.crankT = 0; st.warm = true; st.lineT = LINE_FUEL_S; st.reason = '';
    if (s) { if (s.eng.some(e => e.cut)) cut(s, false); sync(s); st.rpm = s.eng[0] ? s.eng[0].rpm || 0 : 0; }
    for (const t of twin) Object.assign(t, { eng: 'run', crankT: 0, catchAt: Infinity, oil: 65, oilT: 190 });
    st.oil = 70; st.oilT = 190; elec.altFail = false;
  }
  // a new physics state for the same aircraft (a lesson started where the cadet is: FLIGHT LAB's state, running): the
  // switches stay as the cadet set them; the engine runs on (or, if it was not running, everything is set running)
  function adopt(s) {
    if (st.eng !== 'run' || !s) { setRunning(s); return; }
    if (s.eng.some(e => e.cut)) cut(s, false);
    sync(s);
    st.rpm = s.eng[0] ? s.eng[0].rpm || 0 : 0; st.dead = false;
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
  function update(dt, s) {
    events.length = 0;
    if (!s) return events;
    dt = clamp(dt || 0, 0, 0.25);
    sync(s);
    // the engine's controls, mirrored into the physics' shared controls too (its mixture, its feeding tank and its
    // carburettor heat are real there): leaning in the cruise, a dry selected tank and carburettor ice on a humid
    // day all answer to these — the same switches, so the two surfaces never disagree
    s.mix = sw.mixture; s.fuelSel = sw.fuelSel; s.carbHeat = sw.carbHeat;
    if (s.eng.length > 1) return twinUpdate(dt, s);
    const e = s.eng[0], master = !!sw.master;
    if (st.eng === 'off' || st.eng === 'stopping') {
      if (sw.mag === 'START') {
        if (!master) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', 'マスター スイッチが OFF なので、スターターが回りません。'); } }
        else if (elec.batt <= 0.02) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', 'バッテリーが上がっています。外部電源か整備を呼んでください。'); } }
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
        const drop = (sw.mag === 'L' ? (fault && fault.dropL) || RUNUP.dropL : sw.mag === 'R' ? RUNUP.dropR : 0) * k + (sw.carbHeat ? RUNUP.carb * k : 0);
        st.rpm = Math.max(0, r - drop);
        st.oil += (clamp(55 + r * 0.012, 0, 85) - st.oil) * Math.min(1, dt * 1.5);
      }
    }
    oilTemp(st, dt, s, st.eng === 'run', (st.rpm - 650) / 2000);
    elecUpdate(dt, st.rpm, st.eng === 'crank');
    if (st.eng === 'run') hobbs += dt / 3600;
    return events;
  }
  // the twin, engine by engine (the stops — mixture, magnetos, fuel — stop both: the switches are shared). The
  // propellers cycled in the run-up (the levers pulled back to the feather detent's edge and pushed forward again,
  // sw.propCycleT counting down): the rpm sags about 400 and comes back
  function twinUpdate(dt, s) {
    const master = !!sw.master;
    let cyc = 0;
    if (sw.propCycleT > 0) {
      sw.propCycleT = Math.max(0, sw.propCycleT - dt);
      cyc = Math.sin(Math.PI * clamp(1 - sw.propCycleT / 2.6, 0, 1));
      if (sw.propCycleT === 0 && s.onGround) sw.propCycled = true;
    }
    if (sw.mag === 'START') {
      const k = twin.findIndex(t => t.eng !== 'run');
      if (k < 0) sw.mag = 'BOTH';
      else if (!master) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', 'マスター スイッチが OFF なので、スターターが回りません。'); } }
      else if (elec.batt <= 0.02) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', 'バッテリーが上がっています。外部電源か整備を呼んでください。'); } }
      else if (twin[k].eng !== 'crank') { twin[k].eng = 'crank'; twin[k].crankT = 0; twin[k].catchAt = catchTime(s); emit('crank', k ? '右エンジン' : '左エンジン'); }
    } else st.starterTried = false;
    twin.forEach((t, k) => {
      const e = s.eng[k];
      if (t.eng === 'crank') {
        t.crankT += dt; t.rpm = CRANK_RPM * (0.8 + 0.2 * Math.sin(t.crankT * 2 * Math.PI * 4));
        if (sw.mag !== 'START' || !master) t.eng = 'off';
        else if (t.crankT >= t.catchAt) {
          t.eng = 'run'; st.warm = true; st.primes = 0; st.lineT = LINE_FUEL_S;
          cut(s, false, k); if (e) e.rpm = CATCH_RPM; t.rpm = CATCH_RPM;
          sw.mag = 'BOTH'; emit('catch', k ? '右エンジン' : '左エンジン');
        } else if (t.crankT >= STARTER_MAX) { sw.mag = 'BOTH'; t.eng = 'off'; emit('nocatch', NOCATCH[st.reason] || NOCATCH.starter); }
      } else if (t.eng === 'off' || t.eng === 'stopping') {
        if (e && !e.cut && t.eng === 'off') cut(s, true, k);
        const wind = s.onGround ? 0 : e ? e.rpm || 0 : 0;
        t.rpm = Math.max(wind, t.rpm - (t.rpm * 1.6 + 140) * dt);
        if (t.rpm <= 0.5 && t.eng === 'stopping') t.eng = 'off';
      } else if (t.eng === 'run') {
        if (e && (e.failed || e.feather)) { t.rpm = e.rpm || 0; return; }
        // (the constant-speed propeller's governor keeps the physics' rpm up; at low power on the ground the gauge
        // reads as the lever is set: about 1,000 rpm a little open, 2,000 for the run-up)
        const lever = s.thr < 0.045 ? 650 + s.thr / 0.045 * 350 : 1000 + (s.thr - 0.045) / 0.625 * 1000, r = Math.min(e ? e.rpm || 0 : 0, lever), kk = clamp((r - 700) / 1300, 0, 1.25);
        const drop = (sw.mag === 'L' ? RUNUP.dropL : sw.mag === 'R' ? RUNUP.dropR : 0) * kk + (sw.carbHeat ? RUNUP.carb * kk : 0) + 400 * cyc * kk;
        t.rpm = Math.max(0, r - drop);
      }
    });
    if (twin.some(t => t.eng === 'run')) {
      st.lineT = sw.fuelSel === 'OFF' ? st.lineT - dt : LINE_FUEL_S;
      let why = '';
      if (sw.mixture < 0.15) why = 'ミクスチャー アイドル カットオフ';
      else if (sw.mag === 'OFF') why = 'マグネトー OFF';
      else if (st.lineT <= 0) why = '燃料セレクター OFF';
      if (why) { twin.forEach((t, k) => { if (t.eng === 'run') { t.eng = 'stopping'; cut(s, true, k); } }); emit('stop', why); }
    }
    const was = st.eng; st.eng = twinState();
    if (was === 'run' && st.eng !== 'run' && !events.some(e => e.type === 'stop') && s.eng.some(e => e.failed)) emit('stop', '故障');
    // the gauge: the left engine's (the cockpit has one tachometer; the MFD shows both)
    // (an engine failed or feathered in a lesson — m2, m5 — leaves the gauge to the other)
    const live = (k) => (twin[k].eng === 'run' || twin[k].eng === 'crank') && !(s.eng[k] && (s.eng[k].failed || s.eng[k].feather));
    st.rpm = live(0) ? twin[0].rpm : live(1) ? twin[1].rpm : Math.max(twin[0].rpm, twin[1].rpm);
    const on = twin.filter(t => t.eng === 'run').length;
    st.oil += ((on ? clamp(55 + st.rpm * 0.012, 0, 85) : 0) - st.oil) * Math.min(1, dt * 1.5);
    // each engine's own oil (the MFD's L/R pair): pressure off its own gauge rpm, temperature behind its power
    for (const t of twin) {
      if (t.eng === 'run') t.oil += (clamp(55 + t.rpm * 0.012, 0, 85) - t.oil) * Math.min(1, dt * 1.5);
      else t.oil = Math.max(0, t.oil - 60 * dt);
      oilTemp(t, dt, s, t.eng === 'run', (t.rpm - 650) / 2000);
    }
    elecUpdate(dt, Math.max(twin[0].rpm, twin[1].rpm), twin.some(t => t.eng === 'crank'));
    if (on) hobbs += dt / 3600;
    return events;
  }
  return {
    sw, st, setCold, setRunning, adopt, prime, update, catchTime,
    setFault(f) { fault = f && f.dropL > 0 ? { dropL: +f.dropL } : null; }, get fault() { return fault; },
    setElecFault(on) { elec.altFail = !!on; }, get elecFault() { return elec.altFail; },
    get elec() { return elec; }, get oilT() { return st.oilT; }, get hobbs() { return hobbs; },
    get twin() { return twin.map(t => ({ eng: t.eng, rpm: t.rpm, oil: t.oil, oilT: t.oilT })); }, get runningL() { return twin[0].eng === 'run'; },
    twinLive: twin,                                          // (read only: the gauges each frame, without copying)
    get running() { return st.eng === 'run'; }, get cranking() { return st.eng === 'crank'; },
    get rpm() { return st.rpm; }, get oil() { return st.oil; }, get primes() { return st.primes; },
    get powered() { return !!sw.master; }, get avionicsOn() { return !!(sw.master && sw.avionics); },
  };
}
