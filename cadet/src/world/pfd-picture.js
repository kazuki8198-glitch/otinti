// CADET — world/pfd-picture.js : a G1000-type PFD picture for the training device room's screen (M5, k1 and k2):
// FLIGHT LAB's own drawPFD (avionics.js) given an aircraft placed in the air with the numbers asked for (speed,
// altitude, heading, climb or descent, bank), drawn on a 2D canvas of any size; k1's tutorial puts a frame round the
// part being explained. Only the drawing: no three.js.
import { panelText } from '../ui/flight-hud.js';

// the parts of FLIGHT LAB's PFD (logical 640 × 400) the tutorial points at
export const PFD_PARTS = {
  att: [190, 22, 225, 150], ias: [44, 54, 82, 202], alt: [478, 30, 82, 226], vs: [556, 78, 42, 132], hsi: [228, 220, 146, 172], baro: [478, 232, 80, 24],
};
const LW = 640, LH = 400;

// pic: { ias kt, alt ft, hdg (magnetic), vs fpm, bank deg (+ right) }
export function pfdState(FL, pic) {
  const P = FL.physics, AV = FL.avionics, s = P.newState({ aircraft: 'pa28' });
  const off = AV.trueToMag(0, P.MAGVAR_W), hdgTrue = ((pic.hdg - off) % 360 + 360) % 360;
  const v = pic.ias / 1.944, gamma = Math.asin(Math.max(-0.3, Math.min(0.3, (pic.vs / 196.85) / v))) * 180 / Math.PI;
  P.placeInAir(s, 9000, -30000, pic.alt, hdgTrue, pic.ias, gamma, 0, 0.6);
  const pitch = P.attitude(s).pitch;
  s.q = P.qFromHPB(hdgTrue, pitch, pic.bank || 0);
  P.derive(s);
  const av = AV.createAvionics();
  av.baro = 29.92;
  return { s, av };
}
export function drawPfdPicture(FL, g, w, h, pic, { highlight = null, title = '' } = {}) {
  const P = FL.physics, AV = FL.avionics, { s, av } = pfdState(FL, pic);
  const pos = { n: -s.pos[2], e: s.pos[0] };
  const d = { o: { ...s.out, onGround: false }, av, nav: AV.navSolve(av, pos, s.out, P.MAGVAR_W, P.LAB_RWY), varW: P.MAGVAR_W, qnh: 29.92,
    eng: [{ run: true, rpm: s.rpm || 2300, feather: false }], V: s.A.v, fuelCap: s.A.fuelCap, pos };
  // FLIGHT LAB's screen notes (教材・未実装) say what the aircraft's would
  const fill = g.fillText;
  g.fillText = function (t, x, y, mw) { t = panelText(t); return mw === undefined ? fill.call(this, t, x, y) : fill.call(this, t, x, y, mw); };
  g.save();
  g.fillStyle = '#05080c'; g.fillRect(0, 0, w, h);
  // the display (16:10) in the middle, a bezel round it
  const sw = Math.min(w * 0.86, (h * 0.84) * LW / LH), sh = sw * LH / LW, x0 = (w - sw) / 2, y0 = (h - sh) / 2 + (title ? h * 0.03 : 0);
  g.fillStyle = '#1b1e22'; g.fillRect(x0 - sw * 0.025, y0 - sw * 0.025, sw * 1.05, sh + sw * 0.05);
  g.save(); g.translate(x0, y0); g.scale(sw / LW, sh / LH);
  AV.drawPFD(g, LW, LH, d);
  if (highlight && PFD_PARTS[highlight]) {
    const [x, y, ww, hh] = PFD_PARTS[highlight];
    g.fillStyle = 'rgba(0, 0, 0, .45)';
    g.fillRect(0, 0, LW, y); g.fillRect(0, y + hh, LW, LH - y - hh); g.fillRect(0, y, x, hh); g.fillRect(x + ww, y, LW - x - ww, hh);
    g.strokeStyle = '#ffd25a'; g.lineWidth = 3; g.strokeRect(x, y, ww, hh);
  }
  g.restore();
  if (title) { g.fillStyle = '#e8f0fa'; g.font = `600 ${Math.round(h * 0.045)}px "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif`; g.textBaseline = 'top'; g.fillText(title, w * 0.04, h * 0.025, w * 0.92); }
  g.restore();
  g.fillText = fill;
}
