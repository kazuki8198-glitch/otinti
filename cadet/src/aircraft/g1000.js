// CADET — aircraft/g1000.js : the G1000-type glass panel of the 3D Archer, drawn on canvases.
//  - the PFD and the MFD: FLIGHT LAB's own drawPFD / drawMFD (logical 640×400) on 1024×640 textures, redrawn on a
//    schedule by the cockpit (PFD 30 Hz, MFD 10 Hz) — black when the master or the avionics switch is off;
//  - the softkey labels shown along the bottom of each screen, above the 12 keys of the bezel (redrawn only when the
//    avionics state changes), and the three standby instruments (airspeed, attitude, altimeter), on one small canvas;
//  - the bezel's layout (where each knob and key sits) and what each softkey does in each menu, so a click turns into
//    FLIGHT LAB's own avionics control (FL.avionics.control) — the cockpit returns it; the game applies it.
// The canvases come from a factory (opts.makeCanvas), so the cockpit also builds without a DOM (tests): no factory,
// no drawing. Generic bezels, no maker's name or logo ("G1000 型").
import * as THREE from 'three';
import { panelText } from '../ui/flight-hud.js';
import { drawApStrip } from '../flight/autopilot.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const SANS = '"Arial Narrow", "Helvetica Neue", Arial, Helvetica, sans-serif';

// ---------------------------------------------------------------- the bezel (metres, from its centre; +y up)
// A 10.4" display unit: the screen (4:3) with the softkey labels along its bottom (the strip), 12 keys under it,
// the knobs in the two side columns (NAV / HDG / ALT on the left, COM / CRS-BARO / RANGE / keys / FMS on the right).
export const BEZEL = { w: 0.27, h: 0.21, depth: 0.02, screenW: 0.21, screenH: 0.1575, screenY: 0.012 };
BEZEL.stripH = BEZEL.screenW * 32 / 512;                                     // the label strip: 512 × 32 px
BEZEL.imageH = BEZEL.screenW * 400 / 640;                                    // the display itself: 640 × 400 (16:10)
BEZEL.screenBot = BEZEL.screenY - BEZEL.screenH / 2;
BEZEL.keyY = BEZEL.screenBot - 0.0145;
export const KEY_X = i => -BEZEL.screenW / 2 + (i + 0.5) * BEZEL.screenW / 12;
// knobs: dual = an outer ring and an inner knob (two controls); r = the outer radius
export const KNOBS = [
  { id: 'navVol', x: -0.12, y: 0.086, r: 0.0062, label: 'NAV VOL' },
  { id: 'nav', x: -0.12, y: 0.044, r: 0.0105, dual: true, label: 'NAV' },
  { id: 'hdg', x: -0.12, y: -0.006, r: 0.0085, label: 'HDG' },
  { id: 'alt', x: -0.12, y: -0.080, r: 0.0105, dual: true, label: 'ALT' },
  { id: 'comVol', x: 0.12, y: 0.086, r: 0.0062, label: 'COM VOL' },
  { id: 'com', x: 0.12, y: 0.044, r: 0.0105, dual: true, label: 'COM' },
  { id: 'crs', x: 0.12, y: -0.004, r: 0.0105, dual: true, label: 'CRS/BARO' },
  { id: 'range', x: 0.12, y: -0.036, r: 0.0080, label: 'RANGE' },
  { id: 'fms', x: 0.12, y: -0.088, r: 0.0105, dual: true, label: 'FMS' },
];
// keys in the side columns: the frequency transfer keys and the six function keys (two per row)
export const KEYS = [
  { id: 'navSwap', x: -0.12, y: 0.067, w: 0.013, label: '⇆' },
  { id: 'comSwap', x: 0.12, y: 0.067, w: 0.013, label: '⇆' },
  { id: 'direct', x: 0.1137, y: -0.0525, w: 0.0108, label: 'D→' }, { id: 'menu', x: 0.1263, y: -0.0525, w: 0.0108, label: 'MENU' },
  { id: 'fpl', x: 0.1137, y: -0.0615, w: 0.0108, label: 'FPL' }, { id: 'proc', x: 0.1263, y: -0.0615, w: 0.0108, label: 'PROC' },
  { id: 'clr', x: 0.1137, y: -0.0705, w: 0.0108, label: 'CLR' }, { id: 'ent', x: 0.1263, y: -0.0705, w: 0.0108, label: 'ENT' },
];

// ---------------------------------------------------------------- the softkeys: label and function per menu
// act(av) → [what, dir] for FL.avionics.control, or null (a key this training does not use: dim label, no function)
const K = (label, act = null, on = null) => ({ label, act, on });
const DIM = l => K(l);
export const SOFTKEYS = {
  pfdTop: [K(''), DIM('INSET'), K('PFD', () => ['PFD_MENU', 'PFD']), K('OBS', () => ['OBS', 1], av => !!av.obs), K('CDI', () => ['CDI', 1]), K('BRG1', () => ['BRG1', 1], av => !!av.brg1), K('XPDR', () => ['XPDR', 1], av => av.pfdMenu === 'XPDR'),
    K('IDENT', () => ['XPDR_IDENT', 1], av => (av.xpdrIdent || 0) > 0), K('BRG2', () => ['BRG2', 1], av => !!av.brg2), DIM('NRST'), K(''), K('ALERTS', () => ['ALERTS', 1], av => av.pfdMenu === 'ALERTS' || !!av._alertsUnacked)],
  pfdMenu: [K('NAV', () => ['AP_NAV', 1], av => !!(av.ap && av.ap.on && av.ap.nav)), K('APR', () => ['AP_APR', 1], av => !!(av.ap && av.ap.on && av.ap.apr)), K('WIND', () => ['WIND', 1], av => av.wind),
    K('AP', () => ['AP', 1], av => !!(av.ap && av.ap.on)), K('HDG', () => ['AP_HDG', 1], av => !!(av.ap && av.ap.on && av.ap.hdg)),
    K('ALT', () => ['AP_ALT', 1], av => !!(av.ap && av.ap.on && av.ap.alt)), K('VS', () => ['AP_VS', 1], av => !!(av.ap && av.ap.on && av.ap.vs)),
    K('LVL', () => ['AP_LVL', 1], av => !!(av.ap && av.ap.on && av.ap.lvl)), K('FD', () => ['FD', 1], av => !!(av.fd && av.fd.on)),
    K('ALT UNIT', () => ['ALT_UNIT', 1], av => av.baroUnit === 'HPA'), K('STD BARO', () => ['STD_BARO', 1]), K('BACK', () => ['PFD_MENU', 'TOP'])],
  // the transponder's own row: the code's digits (0–7, four set it), the mode, backspace, back; the last slot
  // shows what is being typed, or the code in use
  xpdr: [...[0, 1, 2, 3, 4, 5, 6, 7].map(d => K(`${d}`, () => ['XPDR_DIGIT', d])), K('MODE', () => ['XPDR_MODE', 1], av => av.xpdr && av.xpdr.mode !== 'ALT'),
    K('⌫', () => ['XPDR_BKSP', 1]), K('BACK', () => ['XPDR', 1]), K(av => (av.xpdr ? (av.xpdr.entry || String(av.xpdr.code).padStart(4, '0')) : '----'))],
  mfd: [K('ENGINE', () => ['MFD_ENG', 1], av => av.mfdPage === 'ENGINE'), K('SYSTEM', () => ['MFD_SYS', 1], av => av.mfdPage === 'SYSTEM'), K('MAP', () => ['MFD_MAP', 1], av => av.mfdPage === 'MAP'), K('FPL', () => ['MFD_FPL', 1], av => av.mfdPage === 'FPL'), K('NRST', () => ['MFD_NRST', 1], av => av.mfdPage === 'NRST'),
    K(av => (av.mapNorthUp ? 'NORTH UP' : 'TRACK UP'), () => ['NORTH_UP', 1]), K(''), K('PREV LEG', () => ['FPL_NEXT', -1]), K('NEXT LEG', () => ['FPL_NEXT', 1]),
    K(''), DIM('DCLTR'), DIM('SHW CHRT')],
};
export const softkeysOf = (which, av) => (which === 'mfd' ? SOFTKEYS.mfd : av && av.pfdMenu === 'XPDR' ? SOFTKEYS.xpdr : av && av.pfdMenu === 'PFD' ? SOFTKEYS.pfdMenu : SOFTKEYS.pfdTop);

// the standby airspeed dial's full scale for a type: the Archer's ends at 175 kt; a faster type (the Seminole,
// Vne 202) needs 220 for its caution arc and red line to land on the dial at all
export const asiTop = V => (V && V.ne > 175 ? 220 : 175);

// ---------------------------------------------------------------- the canvases and their textures
const SCR_W = 1024, SCR_H = 640, LW = 640, LH = 400;
const DYN_W = 512, DYN_H = 192;
// regions of the small canvas: the two label strips, the three standby dials, a white patch (lamps take its colour)
export const DYN = { W: DYN_W, H: DYN_H, strip: { pfd: [0, 0, 512, 32], mfd: [0, 32, 512, 32] }, asi: [0, 64, 128, 128], att: [128, 64, 128, 128], alt: [256, 64, 128, 128], white: [420, 100, 16, 16] };
export const dynUV = ([x, y, w, h]) => [x / DYN_W, 1 - (y + h) / DYN_H, (x + w) / DYN_W, 1 - y / DYN_H];   // [u0, v0, u1, v1]

const FONT_S = `700 11px ${SANS}`, FONT_L = `700 14px ${SANS}`;

function canvasTex(cv, mips) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mips; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}

// createGlass(FL, makeCanvas) → { pfd, mfd, dyn: { canvas, texture } | null, stats, drawScreen, blankScreen, drawStrips, drawStandby,
//   setAnisotropy, bytes, dispose }
export function createGlass(FL, makeCanvas) {
  const AV = FL.avionics, P = FL.physics;
  const mk = (w, h, mips) => {
    const cv = makeCanvas ? makeCanvas(w, h) : null;
    if (!cv) return null;
    const g = cv.getContext('2d');
    // FLIGHT LAB's screens carry its own notes (教材・未実装); the aircraft's screens say what the aircraft would
    if (g && typeof g.fillText === 'function') {
      const fill = g.fillText;
      g.fillText = function (s, x, y, mw) { s = panelText(s); return mw === undefined ? fill.call(this, s, x, y) : fill.call(this, s, x, y, mw); };
    }
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    return { canvas: cv, g, texture: canvasTex(cv, mips), w, h };
  };
  const pfd = mk(SCR_W, SCR_H, false), mfd = mk(SCR_W, SCR_H, false), dyn = mk(DYN_W, DYN_H, false);
  if (dyn) { const [x, y, w, h] = DYN.white; dyn.g.fillStyle = '#fff'; dyn.g.fillRect(x, y, w, h); }

  // FLIGHT LAB's panelData (app.js), into objects made once
  const ENG = [{ run: true, rpm: 0, feather: false }, { run: true, rpm: 0, feather: false }];
  const ENG1 = [ENG[0]];
  const OILP1 = [0], OILP2 = [0, 0], OILT1 = [0], OILT2 = [0, 0];   // (the systems' oil, handed to the MFD in place of the physics'; one array per engine count — the MFD reads a pair as L/R)
  const d = { o: {}, av: null, nav: null, varW: P.MAGVAR_W, qnh: 29.92, eng: ENG1, V: null, fuelCap: 24, pos: { n: 0, e: 0 } };
  const stats = { pfd: 0, mfd: 0, blank: 0, strips: 0, standby: 0 };      // draws so far (tests, the perf overlay)
  // the standby dials, drawn 15 times a second: the gradients, fonts and numerals are made once
  const grads = new Map(), fonts = new Map(), NUM = [];
  for (let i = 0; i <= 240; i++) NUM.push(String(i));
  const font = (w, px) => { const k = w * 1000 + px; let f = fonts.get(k); if (!f) { f = `${w} ${px}px ${SANS}`; fonts.set(k, f); } return f; };
  const BANK_MARKS = [-90, -60, -30, -20, -10, 10, 20, 30, 60, 90];
  const baroText = { v: NaN, hpa: false, text: '' };
  const V_DEF = { s0: 45, s1: 50, fe: 102, no: 125, ne: 154 };          // the Archer's, if the type has none
  // (the Archer's dial: 2.5° a knot above 40, the needle pegging just past the top at 175; a faster type's dial
  // spreads the same 300° sweep over its own range instead — see asiTop)
  const asiAng = (kt, top) => (kt <= 40 ? Math.max(0, kt) / 40 * 30 : 30 + (Math.min(kt, top) - 40) * (top > 175 ? 300 / (top - 40) : 2.5)) * DEG;

  // ================================================================ per frame (no allocation below this line; FLIGHT LAB's
  // drawPFD / drawMFD / navSolve allocate inside, the drawing here does not)
  // eng (optional): the engine as the cockpit's systems have it ({ rpm, run }: the tachometer's reading, the run-up's
  // magneto drop included; aircraft/systems.js), in place of the physics' own for a single engine
  function fill(s, av, eng) {
    Object.assign(d.o, s.out); d.o.onGround = s.onGround;
    d.av = av; d.pos.n = -s.pos[2]; d.pos.e = s.pos[0];
    d.traffic = av && Array.isArray(av.trafficPos) ? av.trafficPos : null;   // (CADET's pattern traffic, when fly-mode hands it over)
    d.nav = AV.navSolve(av, d.pos, s.out, P.MAGVAR_W, P.LAB_RWY);
    d.qnh = s.qnh; d.V = s.A.v; d.fuelCap = s.A.fuelCap;
    d.eng = s.eng.length > 1 ? ENG : ENG1;
    for (let i = 0; i < d.eng.length && i < s.eng.length; i++) { const e = s.eng[i], o = d.eng[i]; o.run = e.run; o.rpm = e.rpm; o.feather = e.feather; }
    if (eng && eng.elec) { d.o.volts = eng.elec.volts; d.o.amps = eng.elec.amps; }
    if (eng && s.eng.length === 1) { d.eng[0].rpm = eng.rpm; d.eng[0].run = eng.run; d.o.rpm = eng.rpm;
      // the systems' oil, in place of the physics' (the physics does not model the start: its pressure would
      // follow rpm the cadet never turned)
      if (eng.oil != null) { OILP1[0] = eng.oil; d.o.oilP = OILP1; if (eng.oilT != null) { OILT1[0] = eng.oilT; d.o.oilT = OILT1; } } }
    // (M6) the twin on the ground: each engine as the systems have it (started one by one, the run-up's drops)
    else if (eng && eng.twin && s.onGround) { for (let i = 0; i < 2 && i < d.eng.length; i++) { d.eng[i].rpm = eng.twin[i].rpm; d.eng[i].run = eng.twin[i].eng === 'run'; }
      OILP2[0] = eng.twin[0].oil || 0; OILP2[1] = eng.twin[1].oil || 0; d.o.oilP = OILP2;
      if (eng.twin[0].oilT != null && eng.twin[1].oilT != null) { OILT2[0] = eng.twin[0].oilT; OILT2[1] = eng.twin[1].oilT; d.o.oilT = OILT2; } }
    return d;
  }
  function drawScreen(which, s, av, eng) {
    const sc = which === 'mfd' ? mfd : pfd;
    if (!sc || !s || !av) return;
    stats[which]++;
    sc.g.setTransform(SCR_W / LW, 0, 0, SCR_H / LH, 0, 0);
    if (which === 'mfd') AV.drawMFD(sc.g, LW, LH, fill(s, av, eng));
    else {
      AV.drawPFD(sc.g, LW, LH, fill(s, av, eng)); drawApStrip(sc.g, LW, av);
      // the flight director's command bars (av.fd, from the autopilot's own laws): a magenta bar the
      // pilot — or the AP — flies the aircraft symbol into; it rolls and pitches against the attitude
      if (av.fd && av.fd.on && s.out) {
        const g = sc.g, cx = LW * 0.47, cy = LH * 0.36, ppd = LH * 0.0115, u = LW / 640;
        g.save(); g.translate(cx, cy + (s.out.pitch - av.fd.pitch) * ppd); g.rotate((av.fd.bank - s.out.bank) * Math.PI / 180);
        g.strokeStyle = '#ff4fd8'; g.lineWidth = Math.max(2, 3 * u); g.beginPath();
        g.moveTo(-52 * u, 0); g.lineTo(-14 * u, 0); g.lineTo(0, 10 * u); g.lineTo(14 * u, 0); g.lineTo(52 * u, 0); g.stroke(); g.restore();
      }
    }
    sc.g.setTransform(1, 0, 0, 1, 0, 0);
    sc.texture.needsUpdate = true;
  }
  function blankScreen(which) {
    const sc = which === 'mfd' ? mfd : pfd;
    if (!sc) return;
    stats.blank++;
    sc.g.setTransform(1, 0, 0, 1, 0, 0); sc.g.fillStyle = '#000'; sc.g.fillRect(0, 0, SCR_W, SCR_H);
    sc.texture.needsUpdate = true;
  }

  // the softkey labels: 12 slots; a used key in white (cyan while its function is on), an unused one dim grey
  function strip(which, av, powered) {
    const [x0, y0, w, h] = DYN.strip[which], g = dyn.g, sw = w / 12;
    g.fillStyle = '#000'; g.fillRect(x0, y0, w, h);
    if (!powered) return;
    const keys = softkeysOf(which, av);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 12; i++) {
      const k = keys[i], label = typeof k.label === 'function' ? k.label(av) : k.label, cx = x0 + (i + 0.5) * sw;
      g.fillStyle = '#2a3038'; g.fillRect(x0 + i * sw + 1, y0 + 4, sw - 2, h - 6);            // the label box, as on the display
      if (!label) continue;
      const on = k.on && av && k.on(av);
      g.fillStyle = !k.act ? '#6c737c' : on ? '#33d6ff' : '#f2f4f7';
      g.font = label.length > 7 ? FONT_S : FONT_L;
      g.fillText(label, cx, y0 + h / 2 + 1, sw - 3);
      if (on) { g.fillStyle = '#33d6ff'; g.fillRect(x0 + i * sw + 4, y0 + h - 4, sw - 8, 2); }
    }
  }
  function drawStrips(av, powered) {
    if (!dyn) return;
    stats.strips++;
    strip('pfd', av, powered); strip('mfd', av, powered);
    dyn.texture.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the standby instruments (2¼" dials)
  function face(g, cx, cy, R) {
    let gr = grads.get(cx);
    if (!gr) { gr = g.createRadialGradient(cx, cy - R * 0.3, R * 0.1, cx, cy, R); gr.addColorStop(0, '#1b1d20'); gr.addColorStop(1, '#0a0b0c'); grads.set(cx, gr); }
    g.fillStyle = '#000'; g.fillRect(cx - R - 2, cy - R - 2, 2 * R + 4, 2 * R + 4);
    g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.fill();
  }
  function needle(g, cx, cy, ang, len, w, tail, col) {
    g.save(); g.translate(cx, cy); g.rotate(ang);
    g.fillStyle = col; g.beginPath(); g.moveTo(-w, tail); g.lineTo(-w * 0.55, -len * 0.82); g.lineTo(0, -len); g.lineTo(w * 0.55, -len * 0.82); g.lineTo(w, tail); g.closePath(); g.fill();
    g.restore();
  }
  // airspeed: knots, 40 at about 1 o'clock, 160 at 11 o'clock; white (flaps), green (normal), yellow (caution) arcs, red line
  function arcBand(g, cx, cy, r, w, a0, a1, col) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r, a0 - Math.PI / 2, a1 - Math.PI / 2); g.stroke();
  }
  function drawASI(g, cx, cy, R, ias, V) {
    face(g, cx, cy, R);
    const v = V || V_DEF, top = asiTop(v), tickMax = Math.floor((top - 1) / 20) * 20;
    arcBand(g, cx, cy, R * 0.80, R * 0.07, asiAng(v.s0, top), asiAng(v.fe, top), '#f2f2f2');
    arcBand(g, cx, cy, R * 0.88, R * 0.08, asiAng(v.s1, top), asiAng(v.no, top), '#21b04b');
    arcBand(g, cx, cy, R * 0.88, R * 0.08, asiAng(v.no, top), asiAng(v.ne, top), '#f1c40f');
    g.lineCap = 'butt';
    g.strokeStyle = '#e8eaec';
    for (let kt = 40; kt <= tickMax; kt += 5) {
      const a = asiAng(kt, top) - Math.PI / 2, big = kt % 10 === 0, r0 = R * (big ? 0.80 : 0.85);
      g.lineWidth = big ? 2.2 : 1.2; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * R * 0.93, cy + Math.sin(a) * R * 0.93); g.stroke();
    }
    { const a = asiAng(v.ne, top) - Math.PI / 2; g.strokeStyle = '#e02a1f'; g.lineWidth = 3.2; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * 0.74, cy + Math.sin(a) * R * 0.74); g.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); g.stroke(); }
    g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(700, Math.round(R * 0.2));
    for (let kt = 40; kt <= tickMax; kt += 20) { const a = asiAng(kt, top) - Math.PI / 2; g.fillText(NUM[kt], cx + Math.cos(a) * R * 0.58, cy + Math.sin(a) * R * 0.58); }
    g.font = font(600, Math.round(R * 0.13)); g.fillText('KNOTS', cx, cy - R * 0.28); g.fillText('AIRSPEED', cx, cy + R * 0.32);
    needle(g, cx, cy, asiAng(ias, top), R * 0.86, R * 0.05, R * 0.16, '#f4f4f4');
    g.fillStyle = '#26282b'; g.beginPath(); g.arc(cx, cy, R * 0.09, 0, Math.PI * 2); g.fill();
  }
  // altimeter: three pointers (100 ft, 1,000 ft, 10,000 ft), the setting window at 3 o'clock (inHg, or hPa)
  function drawALT(g, cx, cy, R, alt, baro, hpa) {
    face(g, cx, cy, R);
    g.strokeStyle = '#e8eaec';
    for (let i = 0; i < 50; i++) {
      const a = i / 50 * Math.PI * 2 - Math.PI / 2, big = i % 5 === 0, r0 = R * (big ? 0.78 : 0.86);
      g.lineWidth = big ? 2.2 : 1.1; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * R * 0.94, cy + Math.sin(a) * R * 0.94); g.stroke();
    }
    g.fillStyle = '#f2f2f2'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = font(700, Math.round(R * 0.22));
    for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2; g.fillText(NUM[i], cx + Math.cos(a) * R * 0.62, cy + Math.sin(a) * R * 0.62); }
    // the setting window
    const wx = cx + R * 0.30, wy = cy - R * 0.11, ww = R * 0.42, wh = R * 0.22;
    g.fillStyle = '#000'; g.fillRect(wx, wy, ww, wh); g.strokeStyle = '#555'; g.lineWidth = 1; g.strokeRect(wx, wy, ww, wh);
    g.fillStyle = '#f2f2f2'; g.font = font(700, Math.round(R * 0.15));
    if (baroText.v !== baro || baroText.hpa !== hpa) { baroText.v = baro; baroText.hpa = hpa; baroText.text = hpa ? String(Math.round(baro * 33.8639)) : baro.toFixed(2); }
    g.fillText(baroText.text, wx + ww / 2, wy + wh / 2 + 0.5);
    g.font = font(600, Math.round(R * 0.12)); g.fillText('ALT', cx, cy - R * 0.30); g.fillText('100 FEET', cx, cy + R * 0.34);
    const a = Math.max(0, alt);
    needle(g, cx, cy, (a % 100000) / 100000 * Math.PI * 2, R * 0.92, R * 0.022, 0, '#d8d8d8');             // 10,000 ft (thin)
    needle(g, cx, cy, (a % 10000) / 10000 * Math.PI * 2, R * 0.52, R * 0.075, R * 0.1, '#f4f4f4');        // 1,000 ft (short)
    needle(g, cx, cy, (a % 1000) / 1000 * Math.PI * 2, R * 0.84, R * 0.045, R * 0.16, '#f4f4f4');         // 100 ft (long)
    g.fillStyle = '#26282b'; g.beginPath(); g.arc(cx, cy, R * 0.08, 0, Math.PI * 2); g.fill();
  }
  // attitude: the sky / ground card turns with the bank and moves with the pitch; the bank scale and the orange
  // aircraft symbol are fixed to the case
  function drawATT(g, cx, cy, R, pitch, bank) {
    face(g, cx, cy, R);
    const k = R / 32;                                                       // px per degree of pitch
    g.save(); g.beginPath(); g.arc(cx, cy, R * 0.96, 0, Math.PI * 2); g.clip();
    g.translate(cx, cy); g.rotate(-bank * DEG); g.translate(0, clamp(pitch, -40, 40) * k);
    g.fillStyle = '#2b78c8'; g.fillRect(-R * 2, -R * 3, R * 4, R * 3);
    g.fillStyle = '#7b4b25'; g.fillRect(-R * 2, 0, R * 4, R * 3);
    g.strokeStyle = '#ffffff'; g.lineWidth = 2; g.beginPath(); g.moveTo(-R * 2, 0); g.lineTo(R * 2, 0); g.stroke();
    g.lineWidth = 1.4; g.fillStyle = '#fff'; g.font = font(700, Math.round(R * 0.13)); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let p = -30; p <= 30; p += 5) {
      if (!p) continue;
      const y = -p * k, w = p % 10 === 0 ? R * 0.30 : R * 0.14;
      g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke();
      if (p % 10 === 0) { g.fillText(NUM[Math.abs(p)], -w - R * 0.12, y); g.fillText(NUM[Math.abs(p)], w + R * 0.12, y); }
    }
    g.translate(0, -clamp(pitch, -40, 40) * k);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(0, -R * 0.74); g.lineTo(-R * 0.07, -R * 0.62); g.lineTo(R * 0.07, -R * 0.62); g.closePath(); g.fill();
    g.restore();
    // the case: bank marks at 10, 20, 30, 60 and 90, the zero index
    g.strokeStyle = '#f2f2f2';
    for (let i = 0; i < BANK_MARKS.length; i++) {
      const b = BANK_MARKS[i];
      const a = b * DEG - Math.PI / 2, big = Math.abs(b) === 30 || Math.abs(b) === 60 || Math.abs(b) === 90;
      g.lineWidth = big ? 2.4 : 1.5; g.beginPath(); g.moveTo(cx + Math.cos(a) * R * (big ? 0.78 : 0.84), cy + Math.sin(a) * R * (big ? 0.78 : 0.84)); g.lineTo(cx + Math.cos(a) * R * 0.95, cy + Math.sin(a) * R * 0.95); g.stroke();
    }
    g.fillStyle = '#f2f2f2'; g.beginPath(); g.moveTo(cx, cy - R * 0.80); g.lineTo(cx - R * 0.08, cy - R * 0.95); g.lineTo(cx + R * 0.08, cy - R * 0.95); g.closePath(); g.fill();
    g.strokeStyle = '#ff8a1c'; g.fillStyle = '#ff8a1c'; g.lineWidth = R * 0.06; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.moveTo(cx - R * 0.55, cy); g.lineTo(cx - R * 0.18, cy); g.lineTo(cx - R * 0.08, cy + R * 0.09); g.lineTo(cx, cy); g.lineTo(cx + R * 0.08, cy + R * 0.09); g.lineTo(cx + R * 0.18, cy); g.lineTo(cx + R * 0.55, cy); g.stroke();
    g.beginPath(); g.arc(cx, cy - R * 0.02, R * 0.035, 0, Math.PI * 2); g.fill();
    g.lineCap = 'butt'; g.lineJoin = 'miter';
    // the case's black rim (covers the card's edge)
    g.strokeStyle = '#050505'; g.lineWidth = R * 0.08; g.beginPath(); g.arc(cx, cy, R * 0.98, 0, Math.PI * 2); g.stroke();
  }
  // all three at once: o = s.out, alt = indicated altitude (ft), baro (inHg), hpa = the setting shown in hPa
  function drawStandby(o, alt, baro, hpa, V) {
    if (!dyn) return;
    stats.standby++;
    const g = dyn.g;
    const A = DYN.asi, T = DYN.att, H = DYN.alt;
    drawASI(g, A[0] + A[2] / 2, A[1] + A[3] / 2, A[2] / 2 - 2, o.ias || 0, V);
    drawATT(g, T[0] + T[2] / 2, T[1] + T[3] / 2, T[2] / 2 - 2, o.pitch || 0, o.bank || 0);
    drawALT(g, H[0] + H[2] / 2, H[1] + H[3] / 2, H[2] / 2 - 2, alt, baro, hpa);
    dyn.texture.needsUpdate = true;
  }
  // ================================================================ end of the per-frame code

  const list = [pfd, mfd, dyn].filter(Boolean);
  return {
    pfd, mfd, dyn, stats, drawScreen, blankScreen, drawStrips, drawStandby,
    setAnisotropy(n) { for (const c of list) c.texture.anisotropy = n; },
    bytes: list.reduce((b, c) => b + c.w * c.h * 4, 0),
    dispose() { for (const c of list) c.texture.dispose(); },
  };
}
