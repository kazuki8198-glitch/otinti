// CADET — tools/aircraft/cockpit-spec.mjs : what the cockpit's parts made in Blender are built to (for
// tools/aircraft/build_cockpit.py): the cabin's layout as aircraft/cockpit.js has it (the eye, the window band, the roof's
// arch, the windshield, the panel, the compass and the overhead console that stay in code; the seats' places and the
// instructor's hips, the occlusion proxy's boxes, the flap handle, the yokes and their hit boxes, the glareshield's lip,
// the displays' and the standby instruments' places),
// the surfaces' colours (sRGB, 0..1: the game reads each part's roughness, metalness and detail kind from the same table
// by the part's name), and sample values of the layout's curves so that the Blender script can check its own copies.
//   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
import { CABIN } from '../../src/aircraft/cockpit.js';

const C = CABIN, hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
const r6 = v => Math.round(v * 1e6) / 1e6;
const xs = [-0.49, -0.4, -0.3, -0.12, 0, 0.25, 0.45], ys = [0.38, 0.425, 0.6, 0.75, 0.815], lows = [-0.4, -0.3, -0.2, -0.1, 0, 0.1, 0.2, 0.38];
process.stdout.write(JSON.stringify({
  eye: C.EYE0, floor: C.FLOOR, fire: C.FIRE, aft: C.AFT, pz: C.PZ, ptop: C.PTOP, pbot: C.PBOT, sill: C.SILL, wtop: C.WTOP, hw: C.HW, hwt: C.HWT, roof: C.ROOF,
  ws: C.WS, kx: C.KX, compass: C.COMPASS, console: C.CONSOLE, compassCase: C.CASE,
  seatX: C.SEAT_X, seat: C.SEAT, instructor: C.INSTRUCTOR, aoOcc: C.AO_OCC, flap: C.FLAP, trimWheel: C.TRIMW, lever: C.LEVER,
  pedal: C.PEDAL, pedalX: C.PEDAL_X, yoke: C.YOKE, yokeHit: C.YOKE_HIT, glare: C.GLARE, panel: C.PANEL,
  colours: Object.fromEntries(Object.entries(C.SURFACES).map(([k, s]) => [k, hex(s.c)])),
  samples: {
    bandX: ys.map(y => [y, r6(C.bandX(y))]),
    roofY: xs.map(x => [x, r6(C.roofY(x))]),
    wsZ: xs.flatMap(x => ys.map(y => [x, y, r6(C.wsZ(x, y))])),
    lowX: lows.map(y => [y, r6(C.lowX(y))]),
  },
}, null, 1));
