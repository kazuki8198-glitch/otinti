// CADET — flight/autopilot.js : a simple GFC700-class autopilot (MSFS-grade review, roadmap #9).
// Acron's real Archers carry the GFC700; CADET's PFD always had the heading bug and the selected altitude,
// but they were references only — the student hand-flew every leg, which makes the instrument chapter
// (ch4: intercepts, holds, the ILS) a test of stamina more than of instrument flying. This is the two-axis
// autopilot those bugs imply: HDG holds the heading bug, ALT holds the selected altitude, NAV tracks the
// CDI source the PFD is showing (the GPS leg, a VOR radial, the localizer) with an intercept, APR adds the
// glide slope once it is captured, VS climbs or descends at the rate it was engaged at towards an armed
// ALT, and LVL is the basic wings-level hold. A flight director runs the same laws without the servos:
// its bars (drawn on the PFD from av.fd) show what the AP would do, engaged or not. There is no throttle
// servo (the real GFC700 has none either): speed is the pilot's, with the throttle keys as always, and the
// law only writes the same control channels the hands use — the pitch hold's target (s.pTgt, as the
// keyboard's W/S and FLIGHT LAB's test bot do) and the roll stick (s.rIn) — so the yoke in the cockpit
// moves, and the trim follows the AP the way a trim servo would: eased towards trimLevel() until the
// stick force is the trim's, not the servo's. The control law is the test bot's (test/helpers/bot.mjs:
// headTo / bankTo / altVs / vsPitch), gains unchanged — it has been flying these lessons for years.
//
// The minimums, as implemented (the GFC700's AFM limits, simplified to the two that matter here):
//   - engage: at or above 800 ft AGL (below it, the AP softkey is refused with the reason);
//   - use: the AP disconnects itself at 200 ft AGL, on a stall warning, and when the pilot takes the
//     controls — a pitch or roll key (W/S/A/D, the arrows) held for 0.3 s counts as taking them, and so
//     does the gamepad's analogue stick pushed past a third of its travel for the same 0.3 s (the stick
//     writes s.pKey / s.rKey before the physics steps, so the AP can see it there), as does pressing AP
//     again (the DIS). A disconnect flashes the AP annunciation amber on the PFD for 2.5 s and sounds
//     the disconnect warble (fly-mode plays it when takeDiscTone() reports one).
// Career gating: none, deliberately. The real aeroplane has the AP from the first day, so the softkeys are
// live in every lesson and in free flight; the early chapters are VFR hand-flown by design (the lessons'
// steps are flown by hand because that is what they teach, and the grading reads the aircraft, not the
// hands — nothing here detects or penalises AP use). From chapter 4 the nav lessons are long enough that
// the AP is the difference between practising instrument flying and merely surviving it.
// Pure logic: no three.js, no DOM (drawApStrip draws on a canvas context it is handed).

export const AP_MIN_ENGAGE_FT = 800;       // AGL: below this the AP will not engage
export const AP_MIN_USE_FT = 200;          // AGL: below this the AP disconnects itself

const OVR_KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function createAutopilot(FL) {
  const P = FL.physics, AV = FL.avionics, clamp = P.clamp;
  const st = { on: false, hdg: false, alt: false, nav: false, apr: false, vs: false, lvl: false, fd: false,
    vsSel: 0, gsCap: false, fdBank: 0, fdPitch: 0, discTone: false,
    flash: 0, pBase: null, lastVs: 0, engagePitch: 0, ovr: 0, L: null };
  const display = { on: false, hdg: false, alt: false, nav: false, apr: false, vs: false, lvl: false, flash: 0 };
  const latName = () => st.apr ? 'APR' : st.nav ? 'NAV' : st.hdg ? 'HDG' : '';
  const vertName = () => st.vs ? 'VS' : st.alt ? 'ALT' : '';
  const modes = () => [latName(), vertName()].filter(Boolean).join('・') || (st.lvl ? 'LVL（翼水平）' : 'ピッチ・ロール保持');
  // the CDI source as the nav computer sees it now (for APR's engage gate and the laws)
  const navNow = (flight) => { const s = flight.s; return AV.navSolve(flight.av, { n: -s.pos[2], e: s.pos[0] }, s.out, P.MAGVAR_W, P.LAB_RWY); };
  // the vertical speed now (the lesson context carries it; the raw state's own field is vsi)
  const vsNow = (flight) => flight.L && flight.L.last && Number.isFinite(flight.L.last.vs) ? flight.L.last.vs : (flight.s.out.vsi || 0);

  function engage(flight, what) {
    const s = flight.s;
    if (!flight.L || flight.L.done || !s) return '飛行が始まっていません';
    if (s.crashed) return '';
    if (s.onGround) return 'オートパイロットは空中で接続します';
    if (s.out.agl < AP_MIN_ENGAGE_FT) return `高度が足りません：オートパイロットの接続は対地 ${AP_MIN_ENGAGE_FT} ft 以上で`;
    if (what === 'AP_APR') { const n = navNow(flight); if (!n || n.src !== 'LOC1' || n.flag) return 'APR：ローカライザーの信号がありません（CDI を NAV1 に）'; }
    st.on = true; st.L = flight.L; st.flash = 0; st.ovr = 0; st.lvl = false; st.gsCap = false;
    st.nav = what === 'AP_NAV' || what === 'AP_APR'; st.apr = what === 'AP_APR';
    st.hdg = what === 'AP' || what === 'AP_HDG';
    st.alt = what === 'AP' || what === 'AP_ALT' || what === 'AP_VS';
    st.vs = what === 'AP_VS'; if (st.vs) st.vsSel = clamp(Math.round(vsNow(flight) / 100) * 100, -1500, 1500);
    st.engagePitch = s.out.pitch; st.pBase = null;
    return `オートパイロット接続：${modes()}（バグは PFD のノブで）`;
  }
  function disconnect(flash) {
    st.on = false; st.hdg = false; st.alt = false; st.nav = false; st.apr = false; st.vs = false; st.lvl = false; st.gsCap = false; st.pBase = null; st.ovr = 0;
    if (flash) { st.flash = 2.5; st.discTone = true; }
    // hand the pitch hold back where the nose is: no jump when the hands take over
    if (st.L && st.L.s && !st.L.s.onGround) { st.L.s.keyHold = true; st.L.s.pTgt = st.L.s.out.pitch; st.L.s.pRate = 0; }
  }
  // what: 'AP' | 'AP_HDG' | 'AP_ALT' | 'AP_NAV' | 'AP_APR' | 'AP_VS' | 'AP_LVL' | 'FD' (the PFD softkeys)
  // → the line for the toast ('' = nothing to say)
  function control(flight, what) {
    if (!flight || !flight.av) return '';
    if (what === 'FD') { st.fd = !st.fd; if (flight.L) st.L = flight.L; if (st.fd && flight.s) st.engagePitch = flight.s.out.pitch; return st.fd ? 'FD オン：フライトディレクター表示' : 'FD オフ'; }
    if (what === 'AP') { if (st.on) { disconnect(true); return 'オートパイロット解除'; } return engage(flight, 'AP'); }
    if (what === 'AP_LVL') {
      if (!st.on) { const r = engage(flight, 'AP'); if (!st.on) return r; }
      st.hdg = st.nav = st.apr = st.vs = st.alt = false; st.lvl = true; st.gsCap = false;
      if (flight.s) st.engagePitch = flight.s.out.pitch;
      return 'LVL：翼を水平に、いまのピッチを保ちます';
    }
    if (!st.on) return engage(flight, what);                       // (a mode key engages the AP in that mode)
    if (what === 'AP_HDG') { st.hdg = !st.hdg; if (st.hdg) { st.nav = st.apr = false; st.lvl = false; } return st.hdg ? 'HDG オン：方位バグへ' : 'HDG オフ：翼は水平に保ちます'; }
    if (what === 'AP_NAV') { st.nav = !st.nav; if (st.nav) { st.hdg = false; st.lvl = false; } else st.apr = false; return st.nav ? 'NAV オン：CDI ソースを追います' : 'NAV オフ'; }
    if (what === 'AP_APR') {
      if (!st.apr) { const n = navNow(flight); if (!n || n.src !== 'LOC1' || n.flag) return 'APR：ローカライザーの信号がありません（CDI を NAV1 に）'; }
      st.apr = !st.apr; if (st.apr) { st.nav = true; st.hdg = false; st.lvl = false; st.gsCap = false; }
      return st.apr ? 'APR オン：ローカライザーとグライドスロープへ' : 'APR オフ（NAV は継続）';
    }
    if (what === 'AP_VS') {
      st.vs = !st.vs;
      if (st.vs && flight.s) st.vsSel = clamp(Math.round(vsNow(flight) / 100) * 100, -1500, 1500);
      if (st.vs) st.pBase = null;
      return st.vs ? `VS オン：${st.vsSel > 0 ? '+' : ''}${st.vsSel} fpm（ALT は選択高度で待機）` : 'VS オフ';
    }
    if (what === 'AP_ALT') {
      st.alt = !st.alt;
      if (st.alt) { st.pBase = null; st.vs = false; }              // (capture the altitude afresh)
      else if (flight.s) st.engagePitch = flight.s.out.pitch;      // (pitch hold from here)
      return st.alt ? 'ALT オン：選択高度へ' : 'ALT オフ：いまのピッチを保ちます';
    }
    return '';
  }
  // the pilot the flight bridge calls before each physics step while the AP is on — or the FD is (flight.js's
  // pilot hook, in a lesson only when the frame asks for it: airPilot). The laws run either way: with the
  // servos off they only move the flight director's targets (st.fdBank / st.fdPitch, drawn from av.fd).
  // The bot's law, gains unchanged.
  function pilot(L, dt) {
    if ((!st.on && !st.fd) || L !== st.L) return;
    const s = L.s, av = L.av, c = L.last, o = s.out;
    if (!c || s.onGround || s.crashed) return;
    // lateral: NAV/APR fly the CDI needle (an intercept while it is pegged, a track once close), HDG the
    // bug; no lateral mode: wings level. Everything goes through a bank target (25° at most)
    let bankT = 0;
    if (st.nav || st.apr) {
      const nav = AV.navSolve(av, { n: -s.pos[2], e: s.pos[0] }, o, P.MAGVAR_W, P.LAB_RWY);
      if (nav && !nav.flag && nav.dots != null) {
        const hdgCmd = nav.src === 'GPS'
          ? nav.dtk + clamp(nav.dots * (Math.abs(nav.dots) >= 2 ? 16 : 10), -40, 40)        // (GPS: dots carry the cross-track)
          : nav.crs + clamp(nav.dots * (nav.src === 'LOC1' ? 13 : 9), -30, 30);            // (a needle is an angle already)
        if (hdgCmd != null && Number.isFinite(hdgCmd)) bankT = clamp(AV.wrap180(hdgCmd - c.hdg) * 1.5, -25, 25);
      }
    } else if (st.hdg) bankT = clamp(AV.wrap180(av.hdgBug - c.hdg) * 1.5, -25, 25);
    // vertical: APR rides the glide slope once captured (|GS| ≤ 1 dot; until then ALT or pitch holds),
    // VS flies its rate towards the armed ALT (capturing inside 100 ft), ALT the selected altitude
    // through a vertical speed (700 fpm at most); no vertical mode: the pitch held
    let vsLaw = null;   // { vsT } when a rate law is flying, else null (pitch hold)
    if (st.apr) {
      const nav = AV.navSolve(av, { n: -s.pos[2], e: s.pos[0] }, o, P.MAGVAR_W, P.LAB_RWY);
      if (nav && nav.gsDots != null && Math.abs(nav.gsDots) <= 1) st.gsCap = true;
      if (st.gsCap && nav && nav.gsDots != null) vsLaw = { vsT: clamp(-(o.gs || 0) * 5.31 + nav.gsDots * 120, -1200, 300) };
    }
    if (!vsLaw && st.vs) {
      if (Math.abs(av.altSel - c.alt) <= 100) { st.vs = false; st.alt = true; st.pBase = null; }   // (the armed ALT captures)
      else vsLaw = { vsT: st.vsSel };
    }
    if (!vsLaw && st.alt) vsLaw = { vsT: clamp((av.altSel - c.alt) * 3, -700, 700) };
    let pitchT;
    if (vsLaw) {
      if (st.pBase == null) { st.pBase = c.pitch; st.lastVs = c.vs; }
      st.pBase = clamp(st.pBase + (vsLaw.vsT - c.vs) * 0.0012 * dt, -10, 15);
      // (the bot's rate damping, as its vsPitch takes it: the rate's own trend held back, so a capture
      // settles on the altitude instead of swinging through it)
      const dvs = clamp((c.vs - st.lastVs) / Math.max(dt, 1e-4), -600, 600); st.lastVs = c.vs;
      pitchT = clamp(st.pBase + (vsLaw.vsT - c.vs) * 0.004 - 0.004 * dvs, -20, 22);
    } else pitchT = clamp(st.engagePitch, -20, 22);
    st.fdBank = bankT; st.fdPitch = pitchT;
    if (!st.on) return;                                     // (the FD alone moves no controls)
    const p = -s.w[2] / P.DEG;
    s.rIn = clamp(0.045 * (bankT - o.bank) - 0.012 * p, -1, 1);
    s.keyHold = true; s.pTgt = pitchT; s.pRate = 0;
    // the trim follows: eased towards the trim that holds this state hands-off (about 0.06 of the range a
    // second), so the wheel in the cockpit turns and disconnecting leaves the aircraft in trim
    const d = clamp(P.trimLevel(s) - s.trim, -0.06 * dt, 0.06 * dt);
    if (d) { s.trim += d; s.trimTgt = null; }   // (the AP's own servo owns the wheel while it flies: no T-key run-in pending)
  }
  // once a frame (fly-mode's update): the disconnects that are not the softkey's, the flash's clock, and the
  // lesson's end. Returns a line for the toast when the AP lets go on its own, else ''.
  function update(dt, flight, input) {
    if (st.flash > 0) st.flash = Math.max(0, st.flash - dt);
    if (!st.on) return '';
    const L = flight ? flight.L : null, s = flight ? flight.s : null;
    if (!L || L !== st.L || L.done || !s || s.crashed) { disconnect(false); return ''; }   // (the flight ended: silently)
    if (s.onGround) { disconnect(false); return ''; }
    if (s.out.agl < AP_MIN_USE_FT) { disconnect(true); return `オートパイロット解除：対地 ${AP_MIN_USE_FT} ft 以下では使えません`; }
    if (s.out.stallWarn) { disconnect(true); return 'オートパイロット解除：失速警報'; }
    let manual = false;
    if (input && input.down) for (const k of OVR_KEYS) if (input.down(k)) { manual = true; break; }
    // the gamepad's stick writes the same channels the keys ramp (s.pKey / s.rKey) before the physics
    // steps: a firm push held for the same 0.3 s is the pilot taking the controls, stick or keys alike
    if (Math.abs(s.pKey || 0) > 0.35 || Math.abs(s.rKey || 0) > 0.35) manual = true;
    st.ovr = manual ? st.ovr + dt : 0;
    if (st.ovr >= 0.3) { disconnect(true); return 'オートパイロット解除：操縦入力'; }
    return '';
  }
  // the annunciation's data onto the avionics state (the PFD's strip and the softkeys read av.ap; the
  // flight director's targets ride along as av.fd)
  function sync(av) {
    if (!av) return;
    const d = av.ap || (av.ap = { on: false, hdg: false, alt: false, flash: 0 });
    d.on = st.on; d.hdg = st.hdg; d.alt = st.alt; d.nav = st.nav; d.apr = st.apr; d.vs = st.vs; d.lvl = st.lvl; d.flash = st.flash;
    display.on = st.on; display.hdg = st.hdg; display.alt = st.alt; display.nav = st.nav; display.apr = st.apr; display.vs = st.vs; display.lvl = st.lvl; display.flash = st.flash;
    const f = av.fd || (av.fd = { on: false, bank: 0, pitch: 0 });
    f.on = st.fd || st.on; f.bank = st.fdBank; f.pitch = st.fdPitch;
  }
  function reset() { st.on = false; st.hdg = false; st.alt = false; st.nav = false; st.apr = false; st.vs = false; st.lvl = false; st.fd = false; st.gsCap = false; st.flash = 0; st.pBase = null; st.ovr = 0; st.L = null; }
  return { control, pilot, update, sync, reset,
    takeDiscTone() { const t = st.discTone; st.discTone = false; return t; },
    get on() { return st.on; }, get hdg() { return st.hdg; }, get alt() { return st.alt; }, get nav() { return st.nav; }, get apr() { return st.apr; },
    get vs() { return st.vs; }, get lvl() { return st.lvl; }, get fdOn() { return st.fd; }, get flash() { return st.flash; }, get display() { return display; } };
}

// the AFCS annunciation: a strip at the top centre of the PFD, over FLIGHT LAB's drawing (g in the PFD's
// own coordinates, W its width: 640 logical on both the cockpit screens and the 2D panel). Green while
// engaged (the modes in force: HDG / ALT, or ROL · PIT for the basic hold), the AP in amber, flashing,
// for a moment after a disconnect. Nothing at all while the AP is off and quiet — as the real one.
export function drawApStrip(g, W, av) {
  const ap = av && av.ap;
  if (!ap || (!ap.on && !(ap.flash > 0))) return;
  const u = W / 640, w = 176 * u, x = (W - w) / 2, y = 2 * u, h = 19 * u;
  g.save();
  g.fillStyle = 'rgba(6,8,10,0.88)'; g.fillRect(x, y, w, h);
  g.strokeStyle = '#454e57'; g.lineWidth = u; g.strokeRect(x, y, w, h);
  g.textBaseline = 'middle'; g.font = `700 ${11.5 * u}px "Segoe UI", system-ui, sans-serif`;
  if (!ap.on) {
    if ((ap.flash * 2.2) % 1 < 0.58) { g.fillStyle = '#ffb02e'; g.textAlign = 'center'; g.fillText('A P', W / 2, y + h / 2 + u); }
  } else {
    g.fillStyle = '#41d97e'; g.textAlign = 'left'; g.fillText('AP', x + 7 * u, y + h / 2 + u);
    const lat = ap.apr ? 'APR' : ap.nav ? 'NAV' : ap.hdg ? 'HDG' : '', vert = ap.vs ? 'VS' : ap.alt ? 'ALT' : '';
    const m = lat || vert ? [lat, vert].filter(Boolean).join('  ') : ap.lvl ? 'LVL' : 'ROL · PIT';
    g.textAlign = 'center'; g.fillText(m, W / 2 + 12 * u, y + h / 2 + u);
  }
  g.restore();
}
