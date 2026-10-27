// CADET — aircraft/systems.js : the engines and electrics behind the cockpit's switches (M4; the twin's: M6, round R3).
// FLIGHT LAB's physics has no engine start: its engine runs from the first step (a lesson starts in the air or lined up).
// The one thing it does have is the mixture cut-off (s.eng[i].cut): a cut engine makes no power and winds down. This
// module owns that one field and nothing else of the physics state, so a lesson flown without touching the switches
// stays bit-identical to FLIGHT LAB (the tests check it).
//  - the switches, as the G1000 NXi Archer's overhead panel has them (POH VB-2749 Fig 7-10): BATT MASTR (master),
//    ALTR, EMERG BATT (OFF / ARM), AVION MASTER (avionics), FUEL PUMP, MAG LEFT and MAG RIGHT (two rockers: no key),
//    START (momentary: true while the starter turns), the lights (LANDG LIGHT works the landing and the taxi lamps; the
//    3-position STROBE LIGHTS – OFF – FIN STROBE sets strobe + beacon, neither, or the beacon — the fin's — alone);
//    magState(sw) reads the magnetos and the starter as a key would show them;
//  - the Seminole's (the G1000 NXi PA-44-180, POH VB-2636 Fig 7-21: the engine switches under the left yoke, the switch
//    banks beside the throttles): per engine two magnetos (the left engine's magL / magR, the right's rMagL / rMagR),
//    a fuel pump (fuelPump, rFuelPump), an alternator (altr — LEFT ALTR —, rAltr); one START rocker, its left or its
//    right half held (start: 'L' | 'R'; false: let go; true, the Archer's form, cranks the first engine not running);
//    the lights PITOT HEAT, NAV, RECOG (recog: the wing tips' recognition lights — the game's aircraft model has no lamp
//    for them), LANDING (it works the landing and the taxi lamps: one breaker, LDG/TAXI LTS) and the same 3-position
//    strobe; EMERG BATT. Per engine its mixture lever (mixture: the left engine's — the Archer's one lever —, mixtureR:
//    the right's: the start needs each engine's own; the game's one throttle and one propeller control move their
//    pairs together, as FLIGHT LAB has one value for each) and its fuel selector lever (fuelSelL, fuelSelR: 'ON' — its
//    own nacelle's tank —, 'OFF', 'XFEED' — the other side's tank). The pair's alternate air (altAir: OPEN — lever down
//    —, the fuel-injected engine's unfiltered heated air: a small rpm drop, nothing else), the cowl flaps (cowlFlaps:
//    'OPEN' | 'INT' | 'CLOSED': no effect on the engine model, which has no temperatures), the combustion heater's switch
//    (heater: 'CABIN HEAT' | 'OFF' | 'FAN') and the vent fan (ventFan: 'HIGH' | 'OFF' | 'LOW'): information only;
//  - the electrics: BATT MASTR powers the starter and the lights; the displays are the cockpit's (the PFD and the G5
//    on the essential bus — BATT MASTR, or EMERG BATT ARM from the emergency battery —, the MFD with AVION MASTER too);
//  - the start (a cold, carburetted engine, as the NXi Archer's checklist has it): fuel on a tank, mixture rich,
//    throttle open about a quarter inch, primed 2–3 times (the PRIMER rocker), MAG LEFT ON (the impulse coupling is on
//    the left magneto: the right stays OFF while cranking), START held (the starter turns the propeller while it is);
//    the engine catches and START springs back (or after the starter's limit), then MAG RIGHT ON. Not primed: it does
//    not catch; primed too much: it floods and catches only with the throttle well open; both magnetos OFF: no spark;
//    the left one OFF (the right alone, no impulse coupling): it does not catch either (the instructor says why);
//  - the twin's start (the fuel-injected IO-360's, POH VB-2636 4.5c, each engine in turn, the left first): its FUEL
//    PUMP ON, both its magnetos ON, its MIXTURE PRIME then CUT-OFF — the prime is the time its mixture is forward with
//    its electric pump on, BATT MASTR on, fuel at its selector and the engine stopped (≥ PRIME.min s; a short one
//    catches late; ≥ PRIME.flood s floods it: then only with the throttle well open) —, ENG START held, the mixture
//    advanced as it fires: it runs on the prime for FIRE_S s, and stops if the mixture is still at cut-off then; a warm
//    engine (stopped since it last ran) needs no prime. A mixture left forward while it cranks (the pump on) feeds it
//    as a prime would. Its magnetos both OFF or the left one OFF (the impulse coupling's): it does not catch;
//  - running: it stops when the mixture is pulled to idle cut-off, both magnetos go OFF, or the selector is OFF (after
//    the fuel left in the lines, about 6 s) — on the twin each engine by its own switches and levers;
//  - the run-up readings: the rpm the tachometer shows drops on one magneto (left 120, right 95 at 2,000 rpm: inside
//    the published limits of 175 and 50 between them) and with carburettor heat on (about 70); on the twin each
//    engine's own (the right engine's 105 / 130), with the alternate air open (about 40), and while the propellers are
//    cycled. These are what the gauges show; the thrust stays the physics' own. The crossfeed draws on the other
//    tank only for the start's fuel check (FLIGHT LAB's physics burns each engine's own).
// Pure logic: no three.js, no DOM. The switches are the cockpit's object (cockpit.switches), shared.
// the magnetos and the starter as a key would show them: 'START' while the starter turns, else 'BOTH' | 'L' | 'R' | 'OFF'
// (L: the left magneto alone — MAG RIGHT OFF)
export const magState = (sw) => (sw.start ? 'START' : sw.magL ? (sw.magR ? 'BOTH' : 'L') : sw.magR ? 'R' : 'OFF');
// the twin's engine k (0: the left, 1: the right) the same way: its own magnetos, its half of the START rocker
export const magStateOf = (sw, k) => {
  const a = k ? sw.rMagL : sw.magL, b = k ? sw.rMagR : sw.magR;
  return sw.start === (k ? 'R' : 'L') ? 'START' : a ? (b ? 'BOTH' : 'L') : b ? 'R' : 'OFF';
};
export const RUNUP = { rpm: 2000, maxDrop: 175, maxDiff: 50, dropL: 120, dropR: 95, carb: 70, dropL2: 105, dropR2: 130, altAir: 40, feather: 1500, maxFeather: 500 };
const CRANK_RPM = 150, CATCH_RPM = 520, STARTER_MAX = 8, LINE_FUEL_S = 6;
// the twin's prime (seconds of fuel flow: enough, a full one, flooded) and how long it runs on it after it fires
export const PRIME = { min: 1.5, ok: 3, flood: 10 };
const FIRE_S = 5;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// cold: everything off, as the aircraft is left on the apron (the Archer's selector on the left tank; the Seminole's
// selectors ON, its cowl flaps closed, its mixtures at cut-off)
export const COLD = { master: false, altr: false, emergBatt: false, avionics: false, fuelPump: false, beacon: false, nav: false, strobe: false, landing: false, taxi: false,
  pitot: false, magL: false, magR: false, start: false, fuelSel: 'L', mixture: 0, carbHeat: false, propCycleT: 0, propCycled: false,
  rMagL: false, rMagR: false, rFuelPump: false, rAltr: false, recog: false, mixtureR: 0, fuelSelL: 'ON', fuelSelR: 'ON', altAir: false, cowlFlaps: 'CLOSED', heater: 'OFF', ventFan: 'OFF' };
// in the air or lined up: as FLIGHT LAB's lessons start (everything that is on in flight)
export const RUNNING = { master: true, altr: true, emergBatt: true, avionics: true, fuelPump: true, beacon: true, nav: true, strobe: true, landing: false, taxi: false,
  pitot: false, magL: true, magR: true, start: false, fuelSel: 'L', mixture: 1, carbHeat: false, propCycleT: 0,
  rMagL: true, rMagR: true, rFuelPump: true, rAltr: true, recog: false, mixtureR: 1, fuelSelL: 'ON', fuelSelR: 'ON', altAir: false, cowlFlaps: 'OPEN', heater: 'OFF', ventFan: 'OFF' };
// the starter without the master (the event's words; content/dialog/day1.js EVENT_LINES.nostarter says the same aloud;
// both types' BATT MASTR)
export const NOSTARTER = 'マスター スイッチ（BATT MASTR）が OFF なので、スターターが回りません。';

// the reason a start did not work, in the instructor's words (M8: exported for its English, content/dialog/en.js); the
// twin's (its own switches and its mixture prime: VB-2636 4.5c) after the Archer's
export const NOCATCH = {
  fuel: '燃料が来ていません。燃料セレクターをタンクに。', mixture: 'ミクスチャーをフル リッチにしてからかけます。',
  prime: 'エンジンが冷えているので、プライマーを 2〜3 回押してからかけます。',
  flooded: 'プライマーの押しすぎで、燃料が多すぎます。スロットルを半分ほど開けて、もう一度かけます（かかったらすぐに戻す）。',
  starter: 'スターターは長く回し続けないようにします。少し待ってから、もう一度。',
  mags: 'マグネトーが左右とも OFF です。左のマグネトー（MAG LEFT）を ON にしてから、もう一度。',
  magL: '左のマグネトー（MAG LEFT）が OFF です。始動の仕掛け（インパルス カップリング）は左にあるので、左を ON（右は OFF のまま）にしてから、もう一度。',
  twinFuel: '燃料が来ていません。そのエンジンの燃料セレクターを ON に。',
  twinPrime: 'エンジンが冷えているので、プライムが足りません。燃料ポンプ ON のまま、ミクスチャーを 3 秒ほど前へ出してからカットオフに戻し、もう一度。',
  twinFlooded: 'プライムのしすぎで、燃料が多すぎます。ミクスチャーはカットオフのまま、スロットルを大きく開けて、もう一度（かかったらすぐに戻す）。',
  twinMags: 'そのエンジンのマグネトーが左右とも OFF です。MAG LEFT と MAG RIGHT を両方 ON にしてから、もう一度。',
  twinMagL: 'そのエンジンの MAG LEFT が OFF です。始動の仕掛け（インパルス カップリング）は左のマグネトーにあるので、両方 ON にしてから、もう一度。',
};
const NOSPARK = '左右のマグネトー OFF';                     // (why it stopped: both magnetos off)
// (the twin's: which engine stopped, and the one the mixture was not advanced on as it fired)
export const SIDE_JA = ['左エンジン', '右エンジン'];
export const NOADVANCE = 'かかったときにミクスチャーを進めなかった';

// createSystems(sw) → the systems for one aircraft; sw: the cockpit's switches (changed here only for START's spring
// return). update(dt, s) every frame (or every physics step) returns the events since the last call (the same array,
// emptied each time): { type: 'crank' | 'catch' | 'nocatch' | 'stop' | 'nostarter' | 'surge', why? } (the twin's crank
// and catch: why = SIDE_JA[k]; its stop: '<SIDE_JA[k]>：<why>').
export function createSystems(sw) {
  // (M7) a fault the run-up finds: { dropL } a left magneto (a fouled plug or the magneto itself) dropping more than the
  // limit; null: none
  let fault = null, autoT = 0;
  const st = { eng: 'off', dead: false, crankT: 0, primes: 0, warm: false, rpm: 0, lineT: LINE_FUEL_S, oil: 0, starterTried: false, reason: '' };
  const events = [];
  const emit = (type, why = '') => events.push({ type, why });
  // (k: one engine of a twin; without it every engine)
  function cut(s, on, k = null) {
    const es = k == null ? s.eng : [s.eng[k]];
    for (const e of es) { if (!e) continue; e.cut = !!on; }
    s.engStopNoted = !!on;                                     // (this module says why it stopped)
  }
  // (M6, round R3) the twin, engine by engine: each its own switches, mixture and selector (the module's header); per
  // engine its state, the starter's time and when it will catch, the gauge's rpm, its prime (s of fuel flow), warm
  // (it ran since the cold start), the fuel left in its lines, fireT (running on the prime: its mixture to be advanced)
  const twin = [0, 1].map(() => ({ eng: 'off', crankT: 0, catchAt: Infinity, rpm: 0, prime: 0, warm: false, lineT: LINE_FUEL_S, fireT: 0, reason: '', oil: 0 }));
  const twinState = () => (twin.every(t => t.eng === 'run') ? 'run' : twin.some(t => t.eng === 'crank') ? 'crank' : twin.some(t => t.eng === 'run') ? 'half' : twin.some(t => t.eng === 'stopping') ? 'stopping' : 'off');
  const twinCold = { eng: 'off', crankT: 0, catchAt: Infinity, rpm: 0, prime: 0, warm: false, lineT: LINE_FUEL_S, fireT: 0, reason: '', oil: 0 };
  // the aircraft as left on the apron: switches off, the engine stopped and still
  function setCold(s) {
    Object.assign(sw, COLD);
    st.eng = 'off'; st.dead = false; st.crankT = 0; st.primes = 0; st.warm = false; st.rpm = 0; st.lineT = LINE_FUEL_S; st.oil = 0; st.reason = '';
    if (s) { cut(s, true); for (const e of s.eng) { e.rpm = 0; } s.rpm = 0; }
    for (const t of twin) Object.assign(t, twinCold);
    autoT = 0;
  }
  // the aircraft as a lesson starts it: everything on, the engine running (the physics' own rpm)
  function setRunning(s) {
    Object.assign(sw, RUNNING);
    st.eng = 'run'; st.dead = false; st.crankT = 0; st.warm = true; st.lineT = LINE_FUEL_S; st.reason = '';
    if (s) { if (s.eng.some(e => e.cut)) cut(s, false); st.rpm = s.eng[0] ? s.eng[0].rpm || 0 : 0; }
    for (const t of twin) Object.assign(t, twinCold, { eng: 'run', warm: true, oil: 70 });
    autoT = 0;
    st.oil = 70;
  }
  // a new physics state for the same aircraft (a lesson started where the cadet is: FLIGHT LAB's state, running): the
  // switches stay as the cadet set them; the engine runs on (or, if it was not running, everything is set running)
  function adopt(s) {
    if (st.eng !== 'run' || !s) { setRunning(s); return; }
    if (s.eng.some(e => e.cut)) cut(s, false);
    st.rpm = s.eng[0] ? s.eng[0].rpm || 0 : 0; st.dead = false;
  }
  // what the primer does (one stroke); a stroke without fuel does nothing
  function prime() { if (sw.fuelSel !== 'OFF') st.primes = Math.min(st.primes + 1, 9); return st.primes; }
  const tankFuel = (s) => (sw.fuelSel === 'L' ? s.fuel[0] : sw.fuelSel === 'R' ? s.fuel[1] : 0);
  // how long the starter has to turn before it catches (Infinity: it will not)
  function catchTime(s) {
    if (sw.fuelSel === 'OFF' || tankFuel(s) < 0.2) { st.reason = 'fuel'; return Infinity; }
    if (sw.mixture < 0.7) { st.reason = 'mixture'; return Infinity; }
    if (!sw.magL && !sw.magR) { st.reason = 'mags'; return Infinity; }
    if (!sw.magL) { st.reason = 'magL'; return Infinity; }
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
    if (s.eng.length > 1) return twinUpdate(dt, s);
    const e = s.eng[0], master = !!sw.master;
    if (st.eng === 'off' || st.eng === 'stopping') {
      if (sw.start) {
        if (!master) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', NOSTARTER); } }
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
      if (!sw.start || !master) { st.eng = 'off'; }
      else if (st.crankT >= st.catchAt) {
        st.eng = 'run'; st.warm = true; st.primes = 0; st.lineT = LINE_FUEL_S;
        cut(s, false); if (e) e.rpm = CATCH_RPM; st.rpm = CATCH_RPM;
        sw.start = false;                                    // START springs back (the hand let go)
        emit('catch');
        if (s.thr > 0.35) emit('surge', 'スロットルが開きすぎています。かかった瞬間に回転が上がりすぎました。');
      } else if (st.crankT >= STARTER_MAX) {
        sw.start = false; st.eng = 'off';
        emit('nocatch', NOCATCH[st.reason] || NOCATCH.starter);
      }
    }
    if (st.eng === 'run') {
      st.lineT = sw.fuelSel === 'OFF' ? st.lineT - dt : LINE_FUEL_S;
      let why = '';
      if (sw.mixture < 0.15) why = 'ミクスチャー アイドル カットオフ';
      else if (!sw.magL && !sw.magR) why = NOSPARK;
      else if (st.lineT <= 0) why = '燃料セレクター OFF';
      if (why) { st.eng = 'stopping'; cut(s, true); emit('stop', why); }
      else if (e && (e.failed || s.fuel[0] + s.fuel[1] <= 0)) {
        // stopped by the physics itself (a lesson's engine failure, no fuel left): the physics' own state is left alone
        // (a restart there brings it back), the gauge shows its rpm
        if (!st.dead) { st.dead = true; emit('stop', e.failed ? '故障' : '燃料切れ'); }
        st.rpm = e.rpm || 0; st.oil = Math.max(0, st.oil - 30 * dt);
      } else {
        st.dead = false;
        if (sw.start) sw.start = false;                      // (the starter does not engage while running: START is let go)
        const r = e ? e.rpm || 0 : 0, k = clamp((r - 700) / 1300, 0, 1.25), mag = magState(sw);
        const drop = (mag === 'L' ? (fault && fault.dropL) || RUNUP.dropL : mag === 'R' ? RUNUP.dropR : 0) * k + (sw.carbHeat ? RUNUP.carb * k : 0);
        st.rpm = Math.max(0, r - drop);
        st.oil += (clamp(55 + r * 0.012, 0, 85) - st.oil) * Math.min(1, dt * 1.5);
      }
    }
    return events;
  }
  // the twin, engine by engine (module header). The propellers cycled in the run-up (the levers pulled back to the
  // feather detent's edge and pushed forward again, sw.propCycleT counting down): the rpm sags about 400 and comes back
  const mixOf = k => +((k ? sw.mixtureR : sw.mixture) ?? 1), pumpOf = k => !!(k ? sw.rFuelPump : sw.fuelPump);
  const selOf = k => (k ? sw.fuelSelR : sw.fuelSelL) || 'ON';
  // the tank engine k draws from: its own (ON), the other side's (XFEED), none (OFF)
  const tankOf = (s, k) => { const v = selOf(k); return v === 'OFF' ? 0 : s.fuel[v === 'XFEED' ? 1 - k : k] || 0; };
  // how long engine k's starter has to turn before it catches (Infinity: it will not; t.reason: why — NOCATCH's key)
  function twinCatch(s, k) {
    const t = twin[k], a = k ? sw.rMagL : sw.magL, b = k ? sw.rMagR : sw.magR;
    t.reason = '';
    if (selOf(k) === 'OFF' || tankOf(s, k) < 0.2) { t.reason = 'twinFuel'; return Infinity; }
    if (!a && !b) { t.reason = 'twinMags'; return Infinity; }
    if (!a) { t.reason = 'twinMagL'; return Infinity; }
    // (its mixture forward while it cranks, the pump on: fed as a prime would feed it)
    const p = mixOf(k) >= 0.5 && pumpOf(k) ? Math.max(t.prime, PRIME.ok) : t.prime;
    if (p >= PRIME.flood) { if (s.thr >= 0.45) return 3.2; t.reason = 'twinFlooded'; return Infinity; }
    if (t.warm) return 0.9;
    if (p < PRIME.min) { t.reason = 'twinPrime'; return Infinity; }
    return p < PRIME.ok ? 2.6 : 1.2;
  }
  function twinUpdate(dt, s) {
    const master = !!sw.master;
    let cyc = 0;
    if (sw.propCycleT > 0) {
      sw.propCycleT = Math.max(0, sw.propCycleT - dt);
      cyc = Math.sin(Math.PI * clamp(1 - sw.propCycleT / 2.6, 0, 1));
      if (sw.propCycleT === 0 && s.onGround) sw.propCycled = true;
    }
    // (the instructor's start: the next engine's half of START a moment after the last one caught)
    if (autoT > 0) {
      const k = twin.findIndex(t => t.eng !== 'run');
      if (k < 0) autoT = 0;
      else if (!sw.start && twin.every(t => t.eng !== 'crank') && (autoT -= dt) <= 0) { sw.start = k ? 'R' : 'L'; autoT = 0.5; }
    }
    // the START rocker's half held: that engine's starter (BATT MASTR on); let go at once if it runs already
    const want = sw.start === 'L' ? 0 : sw.start === 'R' ? 1 : sw.start ? twin.findIndex(t => t.eng !== 'run') : -1;
    if (sw.start && (want < 0 || twin[want].eng === 'run')) sw.start = false;
    else if (want >= 0) {
      const t = twin[want];
      if (!master) { if (!st.starterTried) { st.starterTried = true; emit('nostarter', NOSTARTER); } }
      else if (t.eng !== 'crank') { t.eng = 'crank'; t.crankT = 0; t.catchAt = twinCatch(s, want); emit('crank', SIDE_JA[want]); }
    } else st.starterTried = false;
    twin.forEach((t, k) => {
      const e = s.eng[k], mix = mixOf(k);
      // its prime: the time fuel flows into it while it is stopped (the mixture forward, the electric pump on)
      if (t.eng !== 'run' && master && pumpOf(k) && mix >= 0.5 && tankOf(s, k) > 0.2) t.prime = Math.min(t.prime + dt, 30);
      if (t.eng === 'crank') {
        t.crankT += dt; t.rpm = CRANK_RPM * (0.8 + 0.2 * Math.sin(t.crankT * 2 * Math.PI * 4));
        // (flooded: cranking with its mixture at cut-off blows the fuel out — slowly with the throttle closed, fast
        // with it well open, as VB-2636's flooded start has it — until it can catch)
        if (mix < 0.5) t.prime = Math.max(0, t.prime - (s.thr >= 0.45 ? 1.5 : 0.1) * dt);
        if (t.reason === 'twinFlooded' && t.prime < PRIME.flood) { t.reason = ''; t.catchAt = t.crankT + 1.5; }
        if (want !== k || !master) t.eng = 'off';
        else if (t.crankT >= t.catchAt) {
          t.eng = 'run'; t.warm = true; t.prime = 0; t.lineT = LINE_FUEL_S; t.fireT = mix < 0.15 ? FIRE_S : 0;
          cut(s, false, k); if (e) e.rpm = CATCH_RPM; t.rpm = CATCH_RPM;
          sw.start = false; emit('catch', SIDE_JA[k]);
          if (s.thr > 0.35) emit('surge', 'スロットルが開きすぎています。かかった瞬間に回転が上がりすぎました。');
        } else if (t.crankT >= STARTER_MAX) { sw.start = false; t.eng = 'off'; autoT = 0; emit('nocatch', NOCATCH[t.reason] || NOCATCH.starter); }
      } else if (t.eng === 'off' || t.eng === 'stopping') {
        if (e && !e.cut && t.eng === 'off') cut(s, true, k);
        const wind = s.onGround ? 0 : e ? e.rpm || 0 : 0;
        t.rpm = Math.max(wind, t.rpm - (t.rpm * 1.6 + 140) * dt);
        if (t.rpm <= 0.5 && t.eng === 'stopping') t.eng = 'off';
      } else if (t.eng === 'run') {
        // its stops: its mixture at idle cut-off (once it has had its moment on the prime), both its magnetos OFF,
        // its selector OFF (after the fuel in its lines) — a lesson's failed or feathered engine too (the shutdown after
        // m5 cuts it off)
        t.lineT = selOf(k) === 'OFF' ? t.lineT - dt : LINE_FUEL_S;
        if (t.fireT > 0) { if (mix >= 0.15) t.fireT = 0; else t.fireT = Math.max(-1, t.fireT - dt) || -1; }
        let why = '';
        if (mix < 0.15 && !(t.fireT > 0)) why = t.fireT < 0 ? NOADVANCE : 'ミクスチャー アイドル カットオフ';
        else if (!(k ? sw.rMagL || sw.rMagR : sw.magL || sw.magR)) why = NOSPARK;
        else if (t.lineT <= 0) why = '燃料セレクター OFF';
        if (why) { t.eng = 'stopping'; t.fireT = 0; cut(s, true, k); emit('stop', `${SIDE_JA[k]}：${why}`); return; }
        if (e && (e.failed || e.feather)) { t.rpm = e.rpm || 0; return; }
        // (the constant-speed propeller's governor keeps the physics' rpm up; at low power on the ground the gauge
        // reads as the lever is set: about 1,000 rpm a little open, 2,000 for the run-up)
        const lever = s.thr < 0.045 ? 650 + s.thr / 0.045 * 350 : 1000 + (s.thr - 0.045) / 0.625 * 1000, r = Math.min(e ? e.rpm || 0 : 0, lever), kk = clamp((r - 700) / 1300, 0, 1.25);
        const mag = magStateOf(sw, k), dL = k ? RUNUP.dropL2 : (fault && fault.dropL) || RUNUP.dropL, dR = k ? RUNUP.dropR2 : RUNUP.dropR;
        const drop = (mag === 'L' ? dL : mag === 'R' ? dR : 0) * kk + (sw.altAir ? RUNUP.altAir * kk : 0) + 400 * cyc * kk;
        t.rpm = Math.max(0, r - drop);
      }
    });
    const was = st.eng; st.eng = twinState();
    if (was === 'run' && st.eng !== 'run' && !events.some(e => e.type === 'stop') && s.eng.some(e => e.failed)) emit('stop', '故障');
    // the gauge: the left engine's (the cockpit has one tachometer; the MFD shows both)
    // (an engine failed or feathered in a lesson — m2, m5 — leaves the gauge to the other)
    const live = (k) => (twin[k].eng === 'run' || twin[k].eng === 'crank') && !(s.eng[k] && (s.eng[k].failed || s.eng[k].feather));
    st.rpm = live(0) ? twin[0].rpm : live(1) ? twin[1].rpm : Math.max(twin[0].rpm, twin[1].rpm);
    // the oil pressure: each engine's (the MFD shows both), the gauge the higher
    for (const t of twin) t.oil = (t.oil || 0) + ((t.eng === 'run' ? clamp(55 + t.rpm * 0.012, 0, 85) : 0) - (t.oil || 0)) * Math.min(1, dt * 1.5);
    st.oil = Math.max(twin[0].oil, twin[1].oil);
    return events;
  }
  return {
    sw, st, setCold, setRunning, adopt, prime, update, catchTime,
    setFault(f) { fault = f && f.dropL > 0 ? { dropL: +f.dropL } : null; }, get fault() { return fault; },
    get twin() { return twin.map(t => ({ eng: t.eng, rpm: t.rpm })); }, get runningL() { return twin[0].eng === 'run'; },
    get runningR() { return twin[1].eng === 'run'; }, get anyRunning() { return st.eng === 'run' || st.eng === 'half'; },
    twinLive: twin,                                          // (read only: the gauges each frame — eng, rpm, prime, oil —, without copying)
    // the instructor's hands start it (a free flight from the apron): START held — the twin's left, then its right
    autoStart() { autoT = 0.5; sw.start = sw.start || true; },
    get running() { return st.eng === 'run'; }, get cranking() { return st.eng === 'crank'; },
    get rpm() { return st.rpm; }, get oil() { return st.oil; }, get primes() { return st.primes; },
    // the buses: the main (BATT MASTR), the avionics (the MFD: AVION MASTER on the main bus); the essential bus (the PFD,
    // the G5) is the cockpit's to work out (cockpit.js update(): BATT MASTR or EMERG BATT ARM, both types)
    get powered() { return !!sw.master; }, get avionicsOn() { return !!(sw.master && sw.avionics); },
  };
}
