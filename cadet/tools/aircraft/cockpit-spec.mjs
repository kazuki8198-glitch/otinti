// CADET — tools/aircraft/cockpit-spec.mjs : what the cockpit's top band is built to (for tools/aircraft/build_cockpit.py):
// the cabin's layout as aircraft/cockpit.js has it (the eye, the window band, the roof's arch, the windshield, the compass
// and the overhead console that stay in code), the surfaces' colours (sRGB, 0..1: the game reads each part's roughness,
// metalness and detail kind from the same table by the part's name), and sample values of the layout's curves so that the
// Blender script can check its own copies of them.
//   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
import { CABIN } from '../../src/aircraft/cockpit.js';

const C = CABIN, hex = h => [(h >> 16) & 255, (h >> 8) & 255, h & 255].map(v => v / 255);
const r6 = v => Math.round(v * 1e6) / 1e6;
const xs = [-0.49, -0.4, -0.3, -0.12, 0, 0.25, 0.45], ys = [0.38, 0.425, 0.6, 0.75, 0.815];
process.stdout.write(JSON.stringify({
  eye: C.EYE0, floor: C.FLOOR, fire: C.FIRE, aft: C.AFT, pz: C.PZ, sill: C.SILL, wtop: C.WTOP, hw: C.HW, hwt: C.HWT, roof: C.ROOF,
  ws: C.WS, kx: C.KX, compass: C.COMPASS, console: C.CONSOLE, compassCase: C.CASE,
  colours: Object.fromEntries(Object.entries(C.SURFACES).map(([k, s]) => [k, hex(s.c)])),
  samples: {
    bandX: ys.map(y => [y, r6(C.bandX(y))]),
    roofY: xs.map(x => [x, r6(C.roofY(x))]),
    wsZ: xs.flatMap(x => ys.map(y => [x, y, r6(C.wsZ(x, y))])),
  },
}, null, 1));
