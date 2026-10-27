// CADET — aircraft/g1000.js : the G1000-type glass panel of the 3D Archer, drawn on canvases.
//  - the PFD and the MFD: FLIGHT LAB's own drawPFD / drawMFD (logical 640×400) on 1024×640 textures, redrawn on a
//    schedule by the cockpit (PFD 30 Hz, MFD 10 Hz) — black without power (the NXi's buses: the PFD on the essential
//    bus, BATT MASTR or EMERG BATT ARM; the MFD on the avionics bus, AVION MASTER too: cockpit.js update());
//  - the softkey labels shown along the bottom of each screen, above the 12 keys of the bezel (redrawn only when the
//    avionics state changes), and the standby's screen (a Garmin G5's attitude page: the attitude, the airspeed and
//    altitude tapes, the heading), on one small canvas;
//  - the bezel's layout (where each knob and key sits) and what each softkey does in each menu, so a click turns into
//    FLIGHT LAB's own avionics control (FL.avionics.control) — the cockpit returns it; the game applies it.
// The canvases come from a factory (opts.makeCanvas), so the cockpit also builds without a DOM (tests): no factory,
// no drawing. Generic bezels, no maker's name or logo ("G1000 型").
import * as THREE from 'three';
import { panelText } from '../ui/flight-hud.js';

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
  pfdTop: [K(''), DIM('INSET'), K('PFD', () => ['PFD_MENU', 'PFD']), DIM('OBS'), K('CDI', () => ['CDI', 1]), DIM('DME'), DIM('XPDR'),
    DIM('IDENT'), DIM('TMR/REF'), DIM('NRST'), K(''), DIM('ALERTS')],
  pfdMenu: [DIM('SYN VIS'), DIM('DFLTS'), K('WIND', () => ['WIND', 1], av => av.wind), DIM('DME'), DIM('BRG1'), DIM('HSI FRMT'), DIM('BRG2'), K(''),
    K('ALT UNIT', () => ['ALT_UNIT', 1], av => av.baroUnit === 'HPA'), K('STD BARO', () => ['STD_BARO', 1]), K('BACK', () => ['PFD_MENU', 'TOP']), DIM('ALERTS')],
  mfd: [DIM('ENGINE'), K(''), K('MAP', () => ['MFD_MAP', 1], av => av.mfdPage === 'MAP'), K('FPL', () => ['MFD_FPL', 1], av => av.mfdPage === 'FPL'), K(''),
    K(av => (av.mapNorthUp ? 'NORTH UP' : 'TRACK UP'), () => ['NORTH_UP', 1]), K(''), K('PREV LEG', () => ['FPL_NEXT', -1]), K('NEXT LEG', () => ['FPL_NEXT', 1]),
    K(''), DIM('DCLTR'), DIM('SHW CHRT')],
};
export const softkeysOf = (which, av) => (which === 'mfd' ? SOFTKEYS.mfd : av && av.pfdMenu === 'PFD' ? SOFTKEYS.pfdMenu : SOFTKEYS.pfdTop);

// ---------------------------------------------------------------- the canvases and their textures
const SCR_W = 1024, SCR_H = 640, LW = 640, LH = 400;
const DYN_W = 512, DYN_H = 192;
// regions of the small canvas: the two label strips, the G5's screen (its 0.072 × 0.054 m — 4:3, the unit's 320 × 240
// display — at 160 × 120 px), a white patch (lamps take its colour)
export const DYN = { W: DYN_W, H: DYN_H, strip: { pfd: [0, 0, 512, 32], mfd: [0, 32, 512, 32] }, g5: [0, 64, 160, 120], white: [420, 100, 16, 16] };
export const dynUV = ([x, y, w, h]) => [x / DYN_W, 1 - (y + h) / DYN_H, (x + w) / DYN_W, 1 - y / DYN_H];   // [u0, v0, u1, v1]

const FONT_S = `700 11px ${SANS}`, FONT_L = `700 14px ${SANS}`;

function canvasTex(cv, mips) {
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.generateMipmaps = mips; t.minFilter = mips ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; t.magFilter = THREE.LinearFilter;
  return t;
}

// createGlass(FL, makeCanvas) → { pfd, mfd, dyn: { canvas, texture } | null, stats, drawScreen, blankScreen, drawStrips, drawStandby,
//   blankStandby, setAnisotropy, bytes, dispose }
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
  const d = { o: {}, av: null, nav: null, varW: P.MAGVAR_W, qnh: 29.92, eng: ENG1, V: null, fuelCap: 24, pos: { n: 0, e: 0 } };
  const stats = { pfd: 0, mfd: 0, blank: 0, strips: 0, standby: 0 };      // draws so far (tests, the perf overlay)
  // the G5's page, drawn 15 times a second: the fonts and every string it shows are made once (speeds and pitch
  // numerals, the altitude tape's hundreds and the readout's tens, the headings)
  const fonts = new Map(), NUM = [], ALT100 = [], ALT10 = [], HDG3 = [], HDG10 = [];
  for (let i = 0; i <= 400; i++) NUM.push(String(i));
  for (let i = 0; i <= 300; i++) ALT100.push(String(i * 100));
  for (let i = 0; i <= 3000; i++) ALT10.push(String(i * 10));
  for (let i = 0; i < 360; i++) HDG3.push(String(i).padStart(3, '0') + '°');
  for (let i = 0; i < 36; i++) HDG10.push(({ 0: 'N', 9: 'E', 18: 'S', 27: 'W' })[i] || String(i));
  const font = (w, px) => { const k = w * 1000 + px; let f = fonts.get(k); if (!f) { f = `${w} ${px}px ${SANS}`; fonts.set(k, f); } return f; };
  const G5_BANK = [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60];
  const G5C = { sky: '#2c6fd1', gnd: '#9a6b2c', tape: 'rgba(14, 16, 20, 0.58)', box: '#000', white: '#f4f5f6', yellow: '#ffd21f', cyan: '#3fd0ff', magenta: '#ff40ff' };
  const baroText = { v: NaN, hpa: false, text: '' };
  const V_DEF = { s0: 45, s1: 50, fe: 102, no: 125, ne: 154 };          // the Archer's, if the type has none

  // ================================================================ per frame (no allocation below this line; FLIGHT LAB's
  // drawPFD / drawMFD / navSolve allocate inside, the drawing here does not)
  // eng (optional): the engine as the cockpit's systems have it ({ rpm, run }: the tachometer's reading, the run-up's
  // magneto drop included; aircraft/systems.js), in place of the physics' own for a single engine
  function fill(s, av, eng) {
    Object.assign(d.o, s.out); d.o.onGround = s.onGround;
    d.av = av; d.pos.n = -s.pos[2]; d.pos.e = s.pos[0];
    d.nav = AV.navSolve(av, d.pos, s.out, P.MAGVAR_W, P.LAB_RWY);
    d.qnh = s.qnh; d.V = s.A.v; d.fuelCap = s.A.fuelCap;
    d.eng = s.eng.length > 1 ? ENG : ENG1;
    for (let i = 0; i < d.eng.length && i < s.eng.length; i++) { const e = s.eng[i], o = d.eng[i]; o.run = e.run; o.rpm = e.rpm; o.feather = e.feather; }
    if (eng && s.eng.length === 1) { d.eng[0].rpm = eng.rpm; d.eng[0].run = eng.run; d.o.rpm = eng.rpm; }
    // (M6) the twin on the ground: each engine as the systems have it (started one by one, the run-up's drops)
    else if (eng && eng.twin && s.onGround) for (let i = 0; i < 2 && i < d.eng.length; i++) { d.eng[i].rpm = eng.twin[i].rpm; d.eng[i].run = eng.twin[i].eng === 'run'; }
    return d;
  }
  function drawScreen(which, s, av, eng) {
    const sc = which === 'mfd' ? mfd : pfd;
    if (!sc || !s || !av) return;
    stats[which]++;
    sc.g.setTransform(SCR_W / LW, 0, 0, SCR_H / LH, 0, 0);
    if (which === 'mfd') AV.drawMFD(sc.g, LW, LH, fill(s, av, eng)); else AV.drawPFD(sc.g, LW, LH, fill(s, av, eng));
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
  // (pfdOn, mfdOn: each display's power — its bus)
  function drawStrips(av, pfdOn, mfdOn = pfdOn) {
    if (!dyn) return;
    stats.strips++;
    strip('pfd', av, pfdOn); strip('mfd', av, mfdOn);
    dyn.texture.needsUpdate = true;
  }

  // ---------------------------------------------------------------- the standby: a Garmin G5's attitude page
  // (the TX panel photo) the sky and the ochre ground behind the pitch ladder, turning with the bank and moving with the
  // pitch; the heading tape across the top, its readout boxed in its middle; the bank scale under it with its pointer
  // and the slip / skid bar under the pointer; the yellow aircraft symbol; the airspeed tape on the left (its arcs at its
  // edge), the altitude tape on the right, each with its readout; along the bottom the ground speed in a box at the left
  // (magenta) and the baro setting under the altitude tape (cyan)
  function band(g, x, w, cy, ref, a, b, k, col) {             // a tape's arc: from a to b (knots), ref at cy, k px a knot
    g.fillStyle = col; g.fillRect(x, cy - (b - ref) * k, w, (b - a) * k);
  }
  function readout(g, x, y, w, h, text, right) {              // a readout box, its point towards the tape (right or left)
    g.fillStyle = G5C.box; g.strokeStyle = G5C.white; g.lineWidth = 1;
    g.beginPath(); g.moveTo(x, y - h / 2); g.lineTo(x + w, y - h / 2);
    if (right) { g.lineTo(x + w, y - 3); g.lineTo(x + w + 4, y); g.lineTo(x + w, y + 3); }
    g.lineTo(x + w, y + h / 2); g.lineTo(x, y + h / 2);
    if (!right) { g.lineTo(x, y + 3); g.lineTo(x - 4, y); g.lineTo(x, y - 3); }
    g.closePath(); g.fill(); g.stroke();
    g.fillStyle = G5C.white; g.font = font(700, 11); g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, x + w / 2, y + 0.5, w - 2);
  }
  // o = s.out, alt = indicated altitude (ft), baro (inHg), hpa = the setting shown in hPa, V = the type's speeds
  function drawStandby(o, alt, baro, hpa, V) {
    if (!dyn) return;
    stats.standby++;
    const g = dyn.g, R = DYN.g5, x0 = R[0], y0 = R[1], W = R[2], H = R[3], v = V || V_DEF;
    const ias = Math.max(0, o.ias || 0), pitch = clamp(o.pitch || 0, -60, 60), bank = o.bank || 0;
    const hdg = ((AV.trueToMag(o.hdgTrue || 0, P.MAGVAR_W) % 360) + 360) % 360;
    const cx = x0 + W * 0.5, cy = y0 + 66, K = 2.2, rb = 40;                    // the attitude's centre; px a degree of pitch; the bank scale's radius
    const tt = y0 + 1, tb = y0 + H - 16, sx = x0 + 1, SW = 28, KT = 1.6;        // the tapes' top and bottom; the airspeed tape, px a knot
    const ax = x0 + W - 35, AW = 34, FT = 0.16, by = y0 + H - 15;               // the altitude tape, px a foot; the bottom row's top
    const hy = y0 + 1, hx0 = sx + SW + 2, hx1 = ax - 2, hcx = (hx0 + hx1) / 2, DG = 1.9;      // the heading strip (13 px tall), px a degree
    g.save(); g.beginPath(); g.rect(x0, y0, W, H); g.clip();
    g.save(); g.translate(cx, cy); g.rotate(-bank * DEG); g.translate(0, pitch * K);
    g.fillStyle = G5C.sky; g.fillRect(-W, -H * 3, W * 2, H * 3);
    g.fillStyle = G5C.gnd; g.fillRect(-W, 0, W * 2, H * 3);
    g.strokeStyle = G5C.white; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-W, 0); g.lineTo(W, 0); g.stroke();
    g.restore();
    // the pitch ladder, in the middle only (inside the bank scale, over the bottom row)
    g.save(); g.beginPath(); g.rect(cx - 42, cy - rb + 13, 84, by - 3 - (cy - rb + 13)); g.clip();
    g.translate(cx, cy); g.rotate(-bank * DEG); g.translate(0, pitch * K);
    g.strokeStyle = G5C.white; g.lineWidth = 1; g.fillStyle = G5C.white; g.font = font(700, 8); g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let p = -30; p <= 30; p += 5) {
      if (!p) continue;
      const y = -p * K, w = p % 10 ? 6 : 13;
      g.beginPath(); g.moveTo(-w, y); g.lineTo(w, y); g.stroke();
      if (!(p % 10)) { g.fillText(NUM[p < 0 ? -p : p], -w - 7, y); g.fillText(NUM[p < 0 ? -p : p], w + 7, y); }
    }
    g.restore();
    // the bank scale (its zero index fixed) and the pointer under it (turning with the sky)
    g.strokeStyle = G5C.white; g.fillStyle = G5C.white; g.lineWidth = 1.2;
    g.beginPath(); g.arc(cx, cy, rb, -150 * DEG, -30 * DEG); g.stroke();
    for (let i = 0; i < G5_BANK.length; i++) {
      const b = G5_BANK[i], a = (b - 90) * DEG, r1 = rb + (b === 30 || b === -30 || b === 60 || b === -60 ? 7 : 4);
      g.beginPath(); g.moveTo(cx + Math.cos(a) * rb, cy + Math.sin(a) * rb); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke();
    }
    g.beginPath(); g.moveTo(cx, cy - rb - 1); g.lineTo(cx - 4.5, cy - rb - 8); g.lineTo(cx + 4.5, cy - rb - 8); g.closePath(); g.fill();
    g.save(); g.translate(cx, cy); g.rotate(-bank * DEG);
    g.beginPath(); g.moveTo(0, -rb + 1); g.lineTo(-4.5, -rb + 8); g.lineTo(4.5, -rb + 8); g.closePath(); g.fill();
    g.fillRect(-4.5 + clamp(o.slip || 0, -1.5, 1.5) * 4, -rb + 9.5, 9, 2.5);                    // (the slip / skid bar)
    g.restore();
    // the aircraft symbol
    g.fillStyle = G5C.yellow; g.strokeStyle = G5C.box; g.lineWidth = 1;
    g.fillRect(cx - 34, cy - 1.5, 20, 3); g.strokeRect(cx - 34, cy - 1.5, 20, 3); g.fillRect(cx + 14, cy - 1.5, 20, 3); g.strokeRect(cx + 14, cy - 1.5, 20, 3);
    g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 11, cy + 7); g.lineTo(cx - 5, cy + 7); g.lineTo(cx, cy + 4); g.lineTo(cx + 5, cy + 7); g.lineTo(cx + 11, cy + 7); g.closePath(); g.fill(); g.stroke();
    // the airspeed tape: 5 kt ticks, the tens numbered, the arcs (white: flaps, green: normal, yellow: caution, red: Vne on)
    g.fillStyle = G5C.tape; g.fillRect(sx, tt, SW, tb - tt);
    g.save(); g.beginPath(); g.rect(sx, tt, SW, tb - tt); g.clip();
    band(g, sx + SW - 4, 2, cy, ias, v.s0, v.fe, KT, '#eeeeee'); band(g, sx + SW - 2, 2, cy, ias, v.s1, v.no, KT, '#22b14c');
    band(g, sx + SW - 2, 2, cy, ias, v.no, v.ne, KT, '#f1c40f'); band(g, sx + SW - 2, 2, cy, ias, v.ne, v.ne + 80, KT, '#e02a1f');
    g.strokeStyle = G5C.white; g.fillStyle = G5C.white; g.lineWidth = 1; g.font = font(700, 9); g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let kt = Math.max(0, Math.floor((ias - 40) / 5) * 5); kt <= ias + 40; kt += 5) {
      const y = cy - (kt - ias) * KT;
      g.beginPath(); g.moveTo(sx + SW - 5, y); g.lineTo(sx + SW - (kt % 10 ? 8 : 10), y); g.stroke();
      if (!(kt % 10) && kt >= 20 && kt <= 400) g.fillText(NUM[kt], sx + SW - 11, y);
    }
    g.restore();
    readout(g, sx, cy, SW - 2, 15, NUM[Math.min(400, Math.round(ias))], true);
    // the altitude tape: 20 ft ticks, the hundreds numbered
    g.fillStyle = G5C.tape; g.fillRect(ax, tt, AW, tb - tt);
    g.save(); g.beginPath(); g.rect(ax, tt, AW, tb - tt); g.clip();
    g.strokeStyle = G5C.white; g.fillStyle = G5C.white; g.font = font(700, 8.5); g.textAlign = 'left';
    for (let a = Math.floor((alt - 350) / 20) * 20; a <= alt + 350; a += 20) {
      const y = cy - (a - alt) * FT;
      g.beginPath(); g.moveTo(ax, y); g.lineTo(ax + (a % 100 ? 3 : 6), y); g.stroke();
      if (!(a % 100) && a >= 0 && a <= 30000) g.fillText(ALT100[a / 100], ax + 8, y);
    }
    g.restore();
    readout(g, ax + 4, cy, AW - 5, 15, ALT10[clamp(Math.round(alt / 10), 0, 3000)], false);
    // the heading across the top (its ticks up from the tape's foot, the tens numbered), its readout boxed in the middle
    g.fillStyle = G5C.tape; g.fillRect(hx0, hy, hx1 - hx0, 13);
    g.save(); g.beginPath(); g.rect(hx0, hy, hx1 - hx0, 13); g.clip();
    g.strokeStyle = G5C.white; g.fillStyle = G5C.white; g.font = font(700, 8); g.textAlign = 'center';
    for (let d = Math.floor((hdg - 30) / 5) * 5; d <= hdg + 30; d += 5) {
      const x = hcx + (d - hdg) * DG, dd = ((d % 360) + 360) % 360;
      g.beginPath(); g.moveTo(x, hy + 13); g.lineTo(x, hy + 13 - (dd % 10 ? 3 : 5)); g.stroke();
      if (!(dd % 10)) g.fillText(HDG10[dd / 10], x, hy + 5);
    }
    g.restore();
    g.fillStyle = G5C.box; g.strokeStyle = G5C.white; g.fillRect(hcx - 15, hy, 30, 15); g.strokeRect(hcx - 15, hy, 30, 15);
    g.fillStyle = G5C.white; g.font = font(700, 10); g.fillText(HDG3[Math.round(hdg) % 360], hcx, hy + 8);
    // along the bottom: the ground speed (left), the baro setting (under the altitude tape)
    g.fillStyle = G5C.box; g.fillRect(sx, by, SW + 10, 14); g.fillRect(ax, by, AW, 14);
    g.fillStyle = G5C.white; g.font = font(700, 7); g.textAlign = 'left'; g.fillText('GS', sx + 2, by + 7.5);
    g.fillStyle = G5C.magenta; g.font = font(700, 9); g.textAlign = 'right'; g.fillText(NUM[clamp(Math.round(o.gs || 0), 0, 400)], sx + SW + 8, by + 7.5);
    if (baroText.v !== baro || baroText.hpa !== hpa) { baroText.v = baro; baroText.hpa = hpa; baroText.text = hpa ? String(Math.round(baro * 33.8639)) : baro.toFixed(2); }
    g.fillStyle = G5C.cyan; g.font = font(700, 9); g.textAlign = 'center'; g.fillText(baroText.text, ax + AW / 2, by + 7.5, AW - 2);
    g.restore();
    dyn.texture.needsUpdate = true;
  }
  // its screen dark (the G5 off with the PFD)
  function blankStandby() {
    if (!dyn) return;
    stats.blank++;
    const R = DYN.g5; dyn.g.fillStyle = '#000'; dyn.g.fillRect(R[0], R[1], R[2], R[3]);
    dyn.texture.needsUpdate = true;
  }
  // ================================================================ end of the per-frame code

  const list = [pfd, mfd, dyn].filter(Boolean);
  return {
    pfd, mfd, dyn, stats, drawScreen, blankScreen, drawStrips, drawStandby, blankStandby,
    setAnisotropy(n) { for (const c of list) c.texture.anisotropy = n; },
    bytes: list.reduce((b, c) => b + c.w * c.h * 4, 0),
    dispose() { for (const c of list) c.texture.dispose(); },
  };
}
