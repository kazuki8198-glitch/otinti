// CADET — flight/autopilot.js : a simple GFC700-class autopilot (MSFS-grade review, roadmap #9).
// Acron's real Archers carry the GFC700; CADET's PFD always had the heading bug and the selected altitude,
// but they were references only — the student hand-flew every leg, which makes the instrument chapter
// (ch4: intercepts, holds, the ILS) a test of stamina more than of instrument flying. This is the two-axis
// autopilot those bugs imply: HDG holds the heading bug, ALT holds the selected altitude, and with neither
// mode on it holds the pitch it was engaged at and keeps the wings level. There is no flight director and
// no throttle servo (the real GFC700 has none either): speed is the pilot's, with the throttle keys as
// always, and the law only writes the same control channels the hands use — the pitch hold's target
// (s.pTgt, as the keyboard's W/S and FLIGHT LAB's test bot do) and the roll stick (s.rIn) — so the yoke in
// the cockpit moves, and the trim follows the AP the way a trim servo would: eased towards trimLevel()
// until the stick force is the trim's, not the servo's. The control law is the test bot's (test/helpers/
// bot.mjs: headTo / bankTo / altVs / vsPitch), gains unchanged — it has been flying these lessons for years.
//
// The minimums, as implemented (the GFC700's AFM limits, simplified to the two that matter here):
//   - engage: at or above 800 ft AGL (below it, the AP softkey is refused with the reason);
//   - use: the AP disconnects itself at 200 ft AGL, on a stall warning, and when the pilot takes the
//     controls — a pitch or roll key (W/S/A/D, the arrows) held for 0.3 s counts as taking them, as does
//     pressing AP again (the DIS). A disconnect flashes the AP annunciation amber on the PFD for 2.5 s.
//   - a gamepad's analogue stick is not read as an override: with a stick in hand, disconnect with the
//     AP softkey (the stick's own inputs are applied after the AP's each frame, so it still wins the fight
//     while it is moved — the AP just does not know to let go).
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
  const st = { on: false, hdg: false, alt: false, flash: 0, pBase: null, lastVs: 0, engagePitch: 0, ovr: 0, L: null };
  const display = { on: false, hdg: false, alt: false, flash: 0 };
  const modes = () => `${st.hdg ? 'HDG' : ''}${st.hdg && st.alt ? '・' : ''}${st.alt ? 'ALT' : ''}` || 'ピッチ・ロール保持';

  function engage(flight, what) {
    const s = flight.s;
    if (!flight.L || flight.L.done || !s) return '飛行が始まっていません';
    if (s.crashed) return '';
    if (s.onGround) return 'オートパイロットは空中で接続します';
    if (s.out.agl < AP_MIN_ENGAGE_FT) return `高度が足りません：オートパイロットの接続は対地 ${AP_MIN_ENGAGE_FT} ft 以上で`;
    st.on = true; st.L = flight.L; st.flash = 0; st.ovr = 0;
    st.hdg = what !== 'AP_ALT'; st.alt = what !== 'AP_HDG';
    st.engagePitch = s.out.pitch; st.pBase = null;
    return `オートパイロット接続：${modes()}（バグは PFD のノブで）`;
  }
  function disconnect(flash) {
    st.on = false; st.hdg = false; st.alt = false; st.pBase = null; st.ovr = 0;
    if (flash) st.flash = 2.5;
    // hand the pitch hold back where the nose is: no jump when the hands take over
    if (st.L && st.L.s && !st.L.s.onGround) { st.L.s.keyHold = true; st.L.s.pTgt = st.L.s.out.pitch; st.L.s.pRate = 0; }
  }
  // what: 'AP' | 'AP_HDG' | 'AP_ALT' (the PFD softkeys) → the line for the toast ('' = nothing to say)
  function control(flight, what) {
    if (!flight || !flight.av) return '';
    if (what === 'AP') { if (st.on) { disconnect(true); return 'オートパイロット解除'; } return engage(flight, 'AP'); }
    if (!st.on) return engage(flight, what);                       // (a mode key engages the AP in that mode)
    if (what === 'AP_HDG') { st.hdg = !st.hdg; return st.hdg ? 'HDG オン：方位バグへ' : 'HDG オフ：翼は水平に保ちます'; }
    if (what === 'AP_ALT') {
      st.alt = !st.alt;
      if (st.alt) st.pBase = null;                                 // (capture the altitude afresh)
      else if (flight.s) st.engagePitch = flight.s.out.pitch;      // (pitch hold from here)
      return st.alt ? 'ALT オン：選択高度へ' : 'ALT オフ：いまのピッチを保ちます';
    }
    return '';
  }
  // the pilot the flight bridge calls before each physics step while the AP is on (flight.js's pilot hook,
  // in a lesson only when the frame asks for it: airPilot). The bot's law, gains unchanged.
  function pilot(L, dt) {
    if (!st.on || L !== st.L) return;
    const s = L.s, av = L.av, c = L.last, o = s.out;
    if (!c || s.onGround || s.crashed) return;
    // lateral: the heading bug, through a bank target (25° at most); no mode: wings level
    const bankT = st.hdg ? clamp(AV.wrap180(av.hdgBug - c.hdg) * 1.5, -25, 25) : 0;
    const p = -s.w[2] / P.DEG;
    s.rIn = clamp(0.045 * (bankT - o.bank) - 0.012 * p, -1, 1);
    // vertical: the selected altitude, through a vertical speed (700 fpm at most); no mode: the pitch held
    if (st.alt) {
      if (st.pBase == null) { st.pBase = c.pitch; st.lastVs = c.vs; }
      const vsT = clamp((av.altSel - c.alt) * 3, -700, 700);
      st.pBase = clamp(st.pBase + (vsT - c.vs) * 0.0012 * dt, -10, 15);
      // (the bot's rate damping, as its vsPitch takes it: the rate's own trend held back, so a capture
      // settles on the altitude instead of swinging through it)
      const dvs = clamp((c.vs - st.lastVs) / Math.max(dt, 1e-4), -600, 600); st.lastVs = c.vs;
      s.keyHold = true; s.pTgt = clamp(st.pBase + (vsT - c.vs) * 0.004 - 0.004 * dvs, -20, 22); s.pRate = 0;
    } else {
      s.keyHold = true; s.pTgt = clamp(st.engagePitch, -20, 22); s.pRate = 0;
    }
    // the trim follows: eased towards the trim that holds this state hands-off (about 0.06 of the range a
    // second), so the wheel in the cockpit turns and disconnecting leaves the aircraft in trim
    const d = clamp(P.trimLevel(s) - s.trim, -0.06 * dt, 0.06 * dt);
    if (d) s.trim += d;
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
    st.ovr = manual ? st.ovr + dt : 0;
    if (st.ovr >= 0.3) { disconnect(true); return 'オートパイロット解除：操縦入力'; }
    return '';
  }
  // the annunciation's data onto the avionics state (the PFD's strip and the softkeys read av.ap)
  function sync(av) {
    if (!av) return;
    const d = av.ap || (av.ap = { on: false, hdg: false, alt: false, flash: 0 });
    d.on = st.on; d.hdg = st.hdg; d.alt = st.alt; d.flash = st.flash;
    display.on = st.on; display.hdg = st.hdg; display.alt = st.alt; display.flash = st.flash;
  }
  function reset() { st.on = false; st.hdg = false; st.alt = false; st.flash = 0; st.pBase = null; st.ovr = 0; st.L = null; }
  return { control, pilot, update, sync, reset,
    get on() { return st.on; }, get hdg() { return st.hdg; }, get alt() { return st.alt; }, get flash() { return st.flash; }, get display() { return display; } };
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
    const m = ap.hdg || ap.alt ? `${ap.hdg ? 'HDG' : ''}${ap.hdg && ap.alt ? '  ' : ''}${ap.alt ? 'ALT' : ''}` : 'ROL · PIT';
    g.textAlign = 'center'; g.fillText(m, W / 2 + 12 * u, y + h / 2 + u);
  }
  g.restore();
}
