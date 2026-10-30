// CADET — aircraft/cockpit.js : the cabin of the flown Archer, built at start-up (mostly in code) in the aircraft's BODY
// frame (x = right wing, y = up, −z = the nose; metres; origin at the CG), to be parented to the flown aircraft's root.
// The aircraft: a PA-28-181 Archer TX with the G1000 NXi (POH VB-2749), carbureted (its Supplement 6: carb heat, an
// electric primer), a Garmin G5 standby, the light-grey interior (cool greys, a black panel); the wet compass, a Piper
// option, at its classic place on the windshield's centre strip. Seen from the left seat (FLIGHT LAB's eye, A.eye) it is
// the real layout: the glareshield ~12° below the eye with the white cowling over it, the windshield up to the roof, the
// overhead switch panel on the windshield's header (every engine, electrical and light switch: no key, no plunger), the
// G5 at the panel's far left, the PFD in front of the pilot, the audio panel and the MFD to its right, the ELT switch,
// the hour meters and the heat / defrost sliders right of the MFD, the pitot heat and fan switches under the audio panel,
// the dimmers, the circuit breakers, the throttle quadrant with the carb heat lever beside it and the pedestal under it,
// the hand brake, two yokes, the rudder pedals over the foot wells' mats, the flap handle (its grip forward at the
// pedestal's foot) and the trim wheel in the black console between the seats, the fuel selector on the left kick panel,
// the door on the right, the seats, the rear bench and the aft windows; overhead, aft of the switch panel, the air duct's
// fairing with an eyeball outlet over each seat, and a dome light over each front seat.
// The Seminole (twin: a PA-44-180 G1000 NXi, POH VB-2636, built into the same cabin, shown by setType('pa44')) has its
// own panel switches instead of the overhead panel — the engine switches under the left yoke (each engine's MAG LEFT /
// RIGHT, the L ENG | R ENG START rocker), the switch banks beside the throttles, the fuel pumps, its dimmers, the
// emergency gear knob and the gear selector left of the quadrant, the park brake knob, ELEV TRIM, the heater's levers
// and switches —, its six-lever quadrant with the alternate air and the cowl flaps, its console between the seats (the
// stabilator trim wheel in its hump, the rudder trim wheel lying flat, the two ON / OFF / X FEED fuel selector levers,
// the flap handle beside them: the Archer's handle, wheel and wall selector are not there), its nose; no gear lights
// (the gear is on the MFD).
// The cabin is larger than the acmesh fuselage (hidden in the outside view, where the cockpit is not drawn).
// The top band — the headliner, the windshield header, the A-pillar and roof-edge trims, their rubber seals and
// the sun visors —, the seats, the glareshield, the yokes and the side walls (the windows' surrounds and seals, the
// moulded lower panels and armrests, the map pocket and the hand mic, the kick panel round the fuel selector, the door's
// seal, handle cup and upper latch, the storm window) are made in Blender to this layout (tools/aircraft/build_cockpit.py
// → assets/model/cockpit.glb, see CABIN below) and go into the static shell like the rest; without the model, simple
// shapes made here stand in.
// Light without new lights: the sun comes in through the window openings (the shell casts shadows; the glass does
// not), and the sky's light inside is scaled by an occlusion baked per vertex at build time — rays from each vertex
// against a proxy of the cabin (its box, the window openings and the big occluders: panel, glareshield, seats).
// Draw calls: the static shell is one mesh per material; each moving part is its own mesh (the rocker switches one
// instanced mesh a type, the Archer's rockers' print another). The cockpit never applies a control: act() returns what
// the game should do.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { clearGlassMaterial, tickGlassRain } from '../render/materials.js';
import { NOISE } from '../render/glsl.js';
import { createGlass, BEZEL, KNOBS, KEYS, KEY_X, softkeysOf, DYN, dynUV } from './g1000.js';
import { modelMeshes } from './archer-model.js';
import { RUNNING } from './systems.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const PICK_LAYER = 7;                       // the invisible hit meshes live only on this layer

// ---------------------------------------------------------------- the layout (metres, body frame, around the Archer's eye)
const EYE0 = [-0.3, 0.62, -0.4];
const FLOOR = -0.40, FIRE = -1.45, AFT = 1.65;     // the cabin floor, the firewall, the aft bulkhead
const PZ = -1.10, PTOP = 0.465, PBOT = 0.03;      // the instrument panel's face, its top and bottom edges
const SILL = 0.38, WTOP = 0.75, HW = 0.56, HWT = 0.49, ROOF = 0.845;   // the side window band leans in towards the roof
const WS = { z0: -1.30, y0: 0.425, z1: -0.84, y1: 0.815, bow: 0.12 };  // the windshield: base, top, and how far its sides sweep back
const KX = -(HW - HWT) / (WTOP - SILL);
const bandX = y => HW + KX * (y - SILL);
const lowX = y => { const v = clamp((y - FLOOR) / (SILL - FLOOR), 0, 1); return HW - 0.10 * Math.pow(1 - Math.min(1, v / 0.45), 2); };
const roofY = x => WTOP + (ROOF - WTOP) * Math.sqrt(Math.max(0, 1 - (x / HWT) ** 2));
const wsZ = (x, y) => WS.z0 + (WS.z1 - WS.z0) * (y - WS.y0) / (WS.y1 - WS.y0) + WS.bow * (x / 0.5) ** 2;
const PFD = [-0.30, 0.34], MFD = [0.051, 0.34], AUD = [-0.1245, 0.34];
// the standby, a Garmin G5 (a 3.5" unit, near-square, one knob at its lower right): at the panel's far left (POH VB-2749
// Fig 7-9 item 1, ~0.08 of the panel's width; the game's displays sit ~4.5 cm left of the real cluster), its screen
// (screenW × screenH: 4:3, the unit's 320 × 240 display) screenY above the bezel's middle, the bezel depth proud of the
// panel; seen past the left yoke's horn
const G5 = { c: [-0.49, 0.33], w: 0.086, h: 0.086, screenW: 0.072, screenH: 0.054, screenY: 0.0095, depth: 0.016 };
const SEAT_X = 0.29;
const YOKE = { x: 0.30, y: 0.218, z: -0.855, travel: 0.07, roll: 42 * DEG };
const PEDAL_X = [-0.39, -0.21, 0.21, 0.39], PEDAL = { y: -0.27, z: -1.21, travel: 0.045 };
const LEVER = { y: -0.045, z: -1.24, len: 0.22, idle: -11 * DEG, full: 27 * DEG };
// the Seminole's six levers (cockpit.js TWIN_LV): the same, their pivot dy higher (Piper's NXi photo: its quadrant's
// knobs up between the yokes' hubs, the alternate air ~10 cm under the mixtures at cut-off)
const LEVER44 = { ...LEVER, dy: 0.07, y: LEVER.y + 0.07 };
// the floor console between the front seats (black, as the pedestal; the Just Flight manual's render, Piper's LX Steel
// photo): w wide, its top y1 from its aft end z1 forward to zt, its face sloping from there down to the floor at z0; the
// low black cover [w, h] on the floor from the pedestal's foot back to it, under the flap handle
const FCON = { w: 0.13, y1: -0.27, zt: -0.375, z0: -0.50, z1: 0.10, cover: [0.09, 0.03] };
// the flap handle (POH VB-2266 7.9; the LX Steel photo, the Just Flight render): its pivot in a boss at the console's
// forward end, the bar lying FORWARD from it — rest: its angle to level (level: its grip rides high enough between the
// cushions' fronts to be seen from the seat, over the left cushion's inboard bolster) — len to the silver button
// at its tip, the black ribbed grip [from, r] along it at the pedestal's foot between the front cushions; pulled up (+x
// turn) it lowers the flaps, the detents' angles up from rest (UP / 10 / 25 / 40°)
const FLAP = { y: -0.268, z: -0.40, len: 0.37, rest: 0 * DEG, grip: [0.255, 0.0165], det: [0, 11 * DEG, 22 * DEG, 33 * DEG] };
// a point of the flap handle at rest: d along the bar from the pivot, h square to it (up), x across (F: FLAP, or the
// Seminole's, CON44.flap, off the middle by its x)
const flapAt = (d, h = 0, x = 0, F = FLAP) => [(F.x || 0) + x, F.y + d * Math.sin(F.rest) + h * Math.cos(F.rest), F.z - d * Math.cos(F.rest) + h * Math.sin(F.rest)];
FLAP.aim = flapAt((FLAP.grip[0] + FLAP.len) / 2, 0.014, 0.008);       // (the grip's top, its middle, a little right of its crest: the line clears the left cushion more)
// the elevator trim wheel (POH VB-2266 7.9: on the floor between the front seats), half sunk in the console AFT of the
// flap's pivot (its top rolled forward: nose down); its position pointer in a slot on the pilot's side of it (ind: the
// slot's x and length; DN forward, UP aft)
const TRIMW = { y: -0.30, z: -0.28, r: 0.072, turns: 1.6, ind: { x: -0.044, len: 0.09 } };
TRIMW.aim = [0, TRIMW.y + TRIMW.r - 0.004, TRIMW.z];                                    // (the wheel's top)
// the Seminole's console between the seats (POH VB-2636 7.15 Fig 7-15 'FLAP AND TRIM CONTROLS', 7.19 Fig 7-19 'FUEL
// SYSTEM CONTROLS': "one cover over the trim wheels and the flap handle"; the Frasca NXi replica): the same black console
// (FCON) carrying, forward to aft, trim, the stabilator trim wheel — upright, rolling fore and aft (forward = nose down,
// as the Archer's), half sunk in a hump of its own (hump: across x0 … x1, its top y, from z1 where the console's top ends
// forward to z0 where it has rounded down to the floor), its position pointer in a slot on the hump's top left of it
// (ind: the slot's x and length; DN forward, UP aft, the takeoff band at its middle — "set the stabilator trim
// indicator in the takeoff range", 4.5h —); rud, the rudder trim — Fig 7-15 / 7-19's big knurled wheel standing across
// the console (r: its rim, h thick; its middle x, on the console's top, at z), turned like a steering wheel about the
// fore-aft axis (seen from aft clockwise = R) ±ang over the trim's range (max: the game's, flight/controls.js rTrim),
// its lower half sunk in the console and the rounded cover (cover: its radius, to z1 aft) that runs aft from it to the
// fuel plate, the L – R scale on the cover's top just aft of the wheel (band: its half-angle round the cover), the
// index a white mark on the wheel's face at its top —; fuel, the fuel selector plate — its middle x, z and size w × d, the two
// levers (the left one the left engine's) in fore-aft slots dx either side of its middle, pivoted pivot under its top,
// turned ±ang: ON forward, OFF, X FEED aft (Fig 7-19's placard) —; and alongside them on the right flap, the flap handle
// (as FLAP, off the middle by x: its pivot in a boss beside the rudder trim, the bar lying forward past the trims, its
// grip at the pedestal's foot). Fig 7-15 has the fuel plate further aft, at the console's end level with the seats' backs
// (the pilot leans or works it by feel); here it is just aft of the rudder trim, as far aft as the pilot's seat back lets
// the left lever be seen from the eye at X FEED
const CON44 = {
  trim: { x: -0.010, y: -0.266, z: -0.435, r: 0.04, w: 0.018, turns: 1.6, ind: { x: -0.032, len: 0.05 } },
  hump: { x0: -0.050, x1: 0.014, y: -0.246, z1: -0.375, z0: -0.548 },
  rud: { x: -0.012, z: -0.365, r: 0.042, h: 0.012, cover: 0.031, z1: -0.302, band: 50 * DEG, ang: 40 * DEG, max: 0.6 },
  fuel: { x: 0.006, z: -0.252, w: 0.062, d: 0.094, dx: 0.017, pivot: 0.06, ang: 20 * DEG },
  flap: { x: 0.038, y: -0.258, z: -0.33, len: 0.41, rest: 0, grip: [0.295, 0.0165] },
};
CON44.flap.aim = flapAt((CON44.flap.grip[0] + CON44.flap.len) / 2, 0.014, 0.006, CON44.flap);   // (the grip's top, its middle, a little right of its crest)
const SEAT = { z: -0.58, w: 0.44 };               // the front seats (at ±SEAT_X): their cushions' centre z and width
const INSTRUCTOR = { hip: [SEAT_X, -0.03, -0.38], seatY: -0.15 };    // where the right seat holds the instructor (see instructorSeat): his knees
// clear of the right yoke's horns as it rolls; the seats made in Blender are shaped round him there (cockpit_seats.py BACK_AFT)
// the glareshield's lip in profile ([z, y], from under it to the top of its roll; then the hood falls to the windshield);
// bow: the glareshield's bow like the real one's (Piper's Archer TX panel photo; POH VB-2749 Fig 7-9) — flat to |x|,
// then a quartic fall of depth to the roll's end at |x| (the spec carries it to tools/aircraft/cockpit_glareshield.py,
// whose check() holds it to what must stay seen under the ends: the panel's top print binds, the Seminole's speeds
// placard tightest). The panel's top edge below falls by the same bow (panelTopY), and a cheek at each A-pillar's foot
// (below) fills where the dropped end leaves the windshield's base (WS.y0 stays straight: the exterior and FLIGHT LAB
// share it)
const GLARE = { x: 0.553, lip: [[PZ + 0.004, 0.451], [-1.045, 0.451], [-1.031, 0.457], [-1.027, 0.4665], [-1.032, 0.4765], [-1.05, 0.4795]], bow: [0.25, 0.545, 0.028, 4] };
const glareDrop = x => { const [x0, x1, d, p] = GLARE.bow, ax = Math.abs(x); return ax <= x0 ? 0 : d * Math.min(1, (ax - x0) / (x1 - x0)) ** p; };
const panelTopY = x => PTOP - 0.008 - glareDrop(x);       // the panel frame's and face's top edge, following the bow
// the panel's top corners turn a little towards the side walls (Fig 7-9's outline): past |x| 0.535 the face and the
// frame sweep aft, 12 mm at the corner (the G5, at the left end, sits on the flat part, as its placard does)
const panelWrapZ = x => { const ax = Math.abs(x); return ax <= 0.535 ? 0 : 0.012 * ((ax - 0.535) / 0.018) ** 2; };
// the yokes' hit boxes ([w, h, d] and an offset from the yoke's pivot; the horns' at ±x; top: the tall hub's narrower upper
// part, over the hub's box — one box as wide as the hub's foot would take the clicks on the dimmers —, up to the cap of
// the 0.134 m hub made in Blender (round R3, tools/aircraft/cockpit_yokes.py: ~72 % of the grips' height, as in Piper's
// photos; the line from the eye to the door's handle — WALLS.door.cup.aim, on the lever's upper part — passes ~3.5 cm
// over the right yoke's box)): a model of a yoke stays in them
const YOKE_HIT = { hub: [0.118, 0.07, 0.06, 0, 0, 0.004], top: [0.074, 0.069, 0.05, 0, 0.0685, -0.001], horn: [0.042, 0.15, 0.045, 0.152, 0.075, 0.008] };
const COMPASS = [0, 0.737, -0.892];
// the Seminole's panel (POH VB-2636 Fig 7-33 and 7-21; Piper's NXi photo). The game's displays sit ~4.5 cm left of
// the real cluster (as the Archer's) and its yokes ~5 cm further apart, so each group is placed as the real one is
// against the PFD and the left yoke, then moved just clear of what the left yoke — its tall hub, its horns, their hit
// boxes — hides from the seat: eng, the ENGINE SWITCHES under the left yoke (the row's y; the four magnetos' x — the
// left engine's LEFT / RIGHT, the right engine's — and the horizontal L ENG | R ENG START rocker's, a little higher:
// Fig 7-21's; the blank place in each 3-place bezel left out: the row fits between the left horn and the hub);
// bankL, the LEFT SWITCH BANK beside the throttles (BATT MASTR, LEFT ALTR, RIGHT ALTR, AVION MASTER; EMERG BATT in a
// bezel of its own); bankR, the RIGHT one (PITOT HEAT, NAV, RECOG, LANDING, STROBE) — both just under the displays, as
// in the photo; pump, the L / R FUEL PUMP rockers (below and right of the left yoke); dim, the DIMMING knobs (under
// the left bank: the Archer's place, ~3 cm lower, is behind the hub from the seat here); emerg, the red EMERGENCY GEAR
// EXTENSION knob (its middle, r) under its placard; GEAR (below), the selector left of the quadrant; brake, the PARK
// BRAKE PULL knob (its middle, r, how far it comes out set: the real one is low under the left control column, where
// the yoke's hub and its bar hide it from the seat — here over the alternate static placard's left end, under the START
// rocker); trim, the ELEV TRIM push switch over the G5's right edge, beside the PFD (Fig 7-33 item 2)
const SEM = {
  eng: { y: 0.112, mags: [-0.482, -0.463, -0.392, -0.373], start: -0.427 },
  bankL: { y: 0.208, x: [-0.227, -0.208, -0.189, -0.170], emerg: -0.143 },
  bankR: { y: 0.208, x: [0.036, 0.055, 0.074, 0.093, 0.112] },
  pump: { y: 0.105, x: [-0.228, -0.209] },
  dim: { y: 0.158, x: [-0.215, -0.18, -0.145] },
  emerg: { c: [-0.172, 0.054], r: 0.0135 },
  brake: { c: [-0.44, 0.083], r: 0.0095, pull: 0.03 },
  trim: [-0.4475, 0.396],
};
// the Archer's overhead switch panel (POH VB-2749 Fig 7-10, the Archer III's since 1995: every engine, electrical, light
// and avionics-master switch in one black strip on the windshield header; the Just Flight manual's render for its look):
// a plate laid on the header's face (ovhAt below: x across, s up the face from the plate's lower edge, h off it towards
// the cabin), ±x × h — Fig 7-10's proportions at 0.46 m (the aircraft's is ~0.6 × 0.065 m: the header here, under the
// roof's arch, is lower and narrower) —, lift: off the face's chord (the face bulges ≤ 1.3 mm off it: it stays behind);
// the rockers' row at s = row, the bezels' cells (cell: w × h), the guard bars (bar: s, off the plate, r), the LIGHT DOME
// knobs on the header outboard of the plate (dome)
const OVH = { x: 0.23, h: 0.048, lift: 0.003, row: 0.024, cell: [0.0185, 0.0315], bezel: [0.005, 0.043], bar: [0.0185, 0.0125, 0.002], dome: 0.2445 };
// the slots, left to right: x, the switch (cockpit.switches' key; primer: the PRIMER rocker, the carbureted Archer's —
// Supplement 6 —, in Fig 7-10's first 'Reserved' place; null: a blank), its kind (2: OFF / ON; 3: three positions, top /
// OFF / bottom; m: momentary), the print on the rocker (the upper half's / the lower half's: OFF over the name; three
// positions: top, middle, bottom), the control's label; then the bezels (slots i..j; g: under a guard bar)
const OVH_SW = [
  [-0.203, 'start', 'm', [null, ['START']], 'スターター（START：押している間回る・かかったら離す）'],
  [-0.1798, 'primer', 'm', [null, ['PRIMER']], 'プライマー（PRIMER：押すごとに 1 回）'],
  [-0.1424, 'master', 2, [['OFF'], ['BATT', 'MASTR']], 'バッテリー マスター（BATT MASTR）'],
  [-0.1192, 'altr', 2, [['OFF'], ['ALTR']], 'オルタネーター（ALTR）'],
  [-0.096, 'fuelPump', 2, [['OFF'], ['FUEL', 'PUMP']], '燃料ポンプ（FUEL PUMP）'],
  [-0.0592, 'magL', 2, [['OFF'], ['MAG', 'LEFT']], '左マグネトー（MAG LEFT）'],
  [-0.036, 'magR', 2, [['OFF'], ['MAG', 'RIGHT']], '右マグネトー（MAG RIGHT）'],
  [0.0352, 'landing', 2, [['OFF'], ['LANDG', 'LIGHT']], '着陸灯（LANDG LIGHT：タキシー灯も）'],
  [0.0584, 'nav', 2, [['OFF'], ['NAV', 'LIGHT']], '航法灯（NAV LIGHT）'],
  [0.0816, 'strobe', 3, [['STROBE', 'LIGHTS'], ['OFF'], ['FIN', 'STROBE']], null],
  [0.1182, null],
  [0.1559, 'emergBatt', 2, [['OFF'], ['ARM'], ['EMERG', 'BATT']], '非常用バッテリー（EMERG BATT：OFF / ARM）'],
  [0.1978, 'avionics', 2, [['OFF'], ['AVION', 'MASTER']], 'アビオニクス マスター（AVION MASTER）'],
];
const OVH_BEZ = [[0, 1, 'g'], [2, 4], [5, 6, 'g'], [7, 9], [10, 10], [11, 11, 'g'], [12, 12]];
// the three-position rockers' positions, bottom to top (the strobe: FIN STROBE — the fin's anti-collision light alone —,
// OFF, STROBE LIGHTS — the wing tips' strobes with it; the fan — the Archer's FAN, the Seminole's VENT FAN —: LOW, OFF,
// HIGH; the Seminole's combustion heater: FAN, OFF, CABIN HEAT — POH VB-2636 7.23); each one's switch field and its
// rocker's key
const STROBE_POS = ['FIN STROBE', 'OFF', 'STROBE LIGHTS'], FAN_POS = ['LOW', 'OFF', 'HIGH'], HEATER_POS = ['FAN', 'OFF', 'CABIN HEAT'];
const POS3 = { strobe: [STROBE_POS, 'strobeSel'], fan: [FAN_POS, 'fan'], ventFan: [FAN_POS, 'ventFan'], heater: [HEATER_POS, 'heater'] };
// the rockers (the overhead's and the panel block's: one shape): w × h, the face's depth at its ends and in its middle
// (two halves a little apart, the rocker's look), turned ±tilt about the pivot behind its middle (lifted pivot off the
// plate); the print's quads on each half
const RK = { w: 0.0155, h: 0.028, d1: 0.0045, d0: 0.003, tilt: 10 * DEG, pivot: 0.0025 };
// the Archer's switch block under the audio panel (POH VB-2749 Fig 7-9 item 12; the TX photo): PITOT HEAT and FAN (HIGH /
// OFF / LOW) — the autopilot's FD/AP and the air conditioning's places blank (options) —, its bezel's middle, its pitch
const PBLK = { x: -0.11, y: 0.19, dx: 0.019, sw: [['pitot', 2, [['OFF'], ['PITOT', 'HEAT']], 'ピトー ヒート（PITOT HEAT）'], ['fan', 3, [['FAN', 'HIGH'], ['OFF'], ['FAN', 'LOW']], null], [null], [null]] };
// the windshield header made in Blender (tools/aircraft/build_cockpit.py header_section, HDR 0.016): at x, its face from
// just over its lip, (yT − HDR + 0.002, wsZ(x, yT − HDR) + 0.030), up to where it rounds into the headliner, (roofY − 0.003,
// wsZ(x, yT) + 0.050) (yT: the glass's top, or the roof's where that is lower); the plate centred on that chord
const HDR = 0.016;
// a point of the overhead plate's frame: x across, s up the header's face from the plate's lower edge, h off the plate
// towards the cabin (the face's normal in the y-z plane: down and aft)
function ovhAt(x, s, h, out = new THREE.Vector3()) {
  const yR = roofY(x), yT = Math.min(yR, WS.y1), y0 = yT - HDR;
  const ay = y0 + 0.002, az = wsZ(x, y0) + 0.030, by = yR - 0.003, bz = wsZ(x, yT) + 0.050;
  const l = Math.hypot(by - ay, bz - az), ty = (by - ay) / l, tz = (bz - az) / l, ss = s + Math.max(0, (l - OVH.h) / 2), hh = h + OVH.lift;
  return out.set(x, ay + ty * ss - tz * hh, az + tz * ss + ty * hh);
}
// the plate's frame there as a matrix (its basis: along the plate, up its face, towards the cabin; at the point)
function ovhMatrix(x, s, h, out = new THREE.Matrix4()) {
  const p = ovhAt(x, s, h), ex = ovhAt(x + 0.002, s, h).sub(ovhAt(x - 0.002, s, h)).normalize(), ey = ovhAt(x, s + 0.002, h).sub(p).normalize();
  ey.addScaledVector(ex, -ey.dot(ex)).normalize();
  return out.makeBasis(ex, ey, new THREE.Vector3().crossVectors(ex, ey)).setPosition(p);
}
// the fuel selector (POH VB-2266 7.15; Piper's TX photos): low on the left wall's kick panel ahead of the pilot's seat,
// ~0.33 m over the floor — a round black placard plate (r) recessed in a bezel (rim wide round it), facing in, aft and a
// little up as the kick panel angles in towards the nose (n: turned aft by aft, tilted up by up; seen from the seat ~45°
// off its face, not edge-on), its rim's outboard edge just inside the wall's side panel: c, the plate's middle, where the
// red pointer handle turns about n (the kick panel made in Blender must be flat in that plane round it). Its marks as one
// sees the plate, clockwise from 12 o'clock (L TANK 24 GAL at 11, R TANK 24 GAL at 3, FUEL OFF at 8: tx_fuel, the POH) —
// L → R clockwise, OFF counter-clockwise (the handle's button pushed)
const FUELSEL = (() => {
  const y = -0.07, z = -1.0, r = 0.066, rim = 0.011, aft = 20 * DEG, up = 12 * DEG;
  const n = new THREE.Vector3(Math.cos(up) * Math.cos(aft), Math.sin(up), Math.cos(up) * Math.sin(aft));
  const ey = new THREE.Vector3(0, 1, 0).addScaledVector(n, -n.y).normalize(), ex = new THREE.Vector3().crossVectors(ey, n);
  let x = -Infinity;                                                 // (the rim's points 2 mm inside the side panel, 2.5 mm inside the wall)
  for (let i = 0; i < 48; i++) { const a = i / 48 * Math.PI * 2, u = ex.clone().multiplyScalar(Math.cos(a)).addScaledVector(ey, Math.sin(a)).multiplyScalar(r + rim); x = Math.max(x, -lowX(y + u.y) + 0.0045 - u.x); }
  return { c: [x, y, z], n: n.toArray(), r, rim, clock: { L: -30, R: 90, OFF: -120 } };
})();
const FUEL_ANG = Object.fromEntries(Object.entries(FUELSEL.clock).map(([k, c]) => [k, -c * DEG])), FUEL_AXIS = new THREE.Vector3(...FUELSEL.n);   // (about n, towards the eye: anticlockwise)
const FUEL = ['L', 'R', 'OFF'];
// the circuit breakers (POH VB-2749 Fig 7-8): the first place's x and the pitch, the rows' y (the top row on the panel, the
// lower two on a sub-panel [x0, x1, y0, y1] subZ proud of it; all clear of the right yoke's shaft), each place's name
// (the real panel's, its options' included: the print is there whether or not the option is) and the buses' brackets
const CB = { x0: 0.140, dx: 0.025, y: [0.150, 0.110, 0.070], sub: [0.1225, 0.4825, 0.048, 0.128], subZ: 0.004 };
const CB_NAMES = [
  ['NON-ESS BUS', 'LIGHTING BUS', 'AVIONICS BUS', 'PANEL DIMMER', 'AVIONICS DIMMER', 'CABIN LIGHTS', 'NAV LIGHTS', 'LANDING LIGHT', 'ANTI COLL', 'ENG START', 'VENT FAN', 'AIR COND', 'ALTR', 'BATT'],
  ['EMERG BATT', 'PITOT HEAT', 'GEA', 'PFD', 'INTEG AV 1', 'COM 1', '', 'ADAHRS', 'AUDIO MKR', 'STBY INSTR', 'XPDR', 'FUEL PUMP', 'ALTR FIELD', 'LTNG PROT'],
  ['PITCH TRIM', 'AUTO PILOT', '', 'MFD', 'INTEG AV 2', 'COM 2', 'DME', 'TAS', 'XM', 'ADF', 'MAINT DATA', '', 'USB PORT', 'CO DETECTOR'],
];
const CB_BUS = [[[3, 8, 'LIGHTING BUS'], [9, 11, 'NON-ESS BUS'], [12, 13, 'ESS BUS']], [[0, 13, 'ESS BUS']], [[0, 9, 'AVIONICS BUS'], [12, 13, 'NON-ESS BUS']]];
// the Seminole's top two rows (Piper's NXi panel photo: 17 places a row, here the game's 14 — the twin's own kept: START,
// CABIN HEATER, LEFT / RIGHT ALTR — three big ones —, GEAR PUMP, each engine's FUEL PUMP and ALTR FIELD; left out:
// CABIN LIGHTS, ADC, AUDIO MKR, LTNG PROT); its bottom row as the Archer's ('|': where a name breaks in two)
const CB44_NAMES = [
  ['NON-ESS BUS', 'LIGHTING BUS', 'AVIONICS BUS', 'PANEL DIMMER', 'AVIONICS DIMMER', 'NAV LIGHTS', 'LANDING LIGHT', 'ANTI COLL', 'START', 'VENT FAN', 'CABIN HEATER', 'LEFT ALTR', 'RIGHT ALTR', 'BATT'],
  ['EMERG BATT', 'PITOT HEAT', 'GEA', 'PFD', 'INTEG AV 1', 'COM 1', 'AHRS', 'STBY INSTR', 'XPDR', 'GEAR PUMP', 'L FUEL|PUMP', 'R FUEL|PUMP', 'L ALTR|FIELD', 'R ALTR|FIELD'],
];
const CB44_BUS = [[[3, 7, 'LIGHTING BUS'], [8, 10, 'NON-ESS BUS'], [11, 13, 'ESS BUS']], [[0, 13, 'ESS BUS']]];
const DIM = { x: [-0.215, -0.18, -0.145], y: 0.125 };   // the Archer's DIMMING knobs (POH Fig 7-9 item 14: under the PFD's right part)
const ALT_STATIC = [-0.415, 0.047];                      // the alternate static source's pull knob (the panel's lower left)
// the Archer's throttle quadrant (two levers: THROTTLE, MIXTURE; the friction lever on its right side): its face's middle
// x and width, its bottom and top; the carb heat lever in its own slot right of it (VB-2749 Supplement 6; the TX photo's
// ALT AIR slot): its pivot behind the panel, the arm to the knob, ±ang from level: OFF up, ON down
const QUAD = { x: 0.02, w: 0.104, y0: -0.105, y1: 0.065 };
const CARB = { x: 0.10, y: 0.085, z: PZ - 0.10, len: 0.12, ang: 16 * DEG };
// the pedestal under it (a black curved plate down to the floor between the pedals: Piper's LX Steel photo): its middle x
// and width; the profile (z, y) from the quadrant's foot round to the floor; the rudder trim knob low on its right
const PED = { x: 0.01, w: 0.13, prof: [[-1.068, -0.105], [-1.065, -0.20]], foot: -0.765 };
for (let i = 1; i <= 8; i++) { const a = i / 8 * Math.PI / 2; PED.prof.push([-1.065 + 0.27 * (1 - Math.cos(a)), -0.20 - 0.19 * Math.sin(a)]); }
PED.prof.push([PED.foot, -0.39]);
// (the plate's normal at each profile point, [z, y]: towards the cabin)
PED.n = PED.prof.map((p, j, pr) => { const a = pr[Math.max(0, j - 1)], b = pr[Math.min(pr.length - 1, j + 1)], dz = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dz, dy); return [-dy / l, dz / l]; });
// the Archer's hand brake: a pistol grip hanging from its pivot under the panel's lower edge, left of the pedestal
// (POH VB-2266 7.9; the TX photo); pulled aft (set) it swings back by ang
const BRAKE = { x: -0.11, y: 0.024, z: PZ + 0.012, ang: 30 * DEG };

// ---------------------------------------------------------------- surfaces (sRGB colour, roughness, metalness, detail kind)
// kinds: 0 smooth, 1 textured paint, 2 leather, 3 carpet, 4 grained vinyl, 5 woven headliner, 6 pebbled grip
// The Archer TX's light scheme (Piper's TX photos: cool greys, no warm cast): the panel, the quadrant, the pedestal and
// the console matte black, the display bezels a shade lighter (the TX panel photo: panel #141614, bezel #1b1d1c — that
// photo's exposure: a matte black paint reflects 3–5 %, so the panel is lifted to ~1.4 % linear, or it renders as a void
// in the shade under the glareshield; the black knobs satin, for an edge highlight); the walls two-tone — near-white
// above the sill band (wall: the window surrounds, the posts, and the parts made in Blender with it: the header, the
// A-pillar trims, the visors) over a light cool grey (wallLow) —, the headliner a cool light grey, the carpet charcoal
// (the foot wells' mats under the pedals black), the seats one light grey (their shells a little darker), the pedals
// light-grey pads; the yokes dark charcoal, satin (lighter than the panel in the TX photo), their pebbled grips a shade
// darker.
const S = {
  panel: { c: 0x1f2123, r: 0.75, k: 1 }, glare: { c: 0x1c1d20, r: 0.9, k: 1 }, glareLip: { c: 0x232427, r: 0.62, k: 4 },
  bezel: { c: 0x292b2d, r: 0.48 }, key: { c: 0x26282c, r: 0.5 }, knob: { c: 0x1b1c1e, r: 0.35 }, knobRing: { c: 0x2b2d31, r: 0.35 },
  wall: { c: 0xe6e8ea, r: 0.6, k: 4 }, wallLow: { c: 0xb9bdc0, r: 0.64, k: 4 }, sidePanel: { c: 0xaeb2b6, r: 0.66, k: 4 }, wallDark: { c: 0x8c9095, r: 0.6, k: 4 },
  roof: { c: 0xd8dadc, r: 0.95, k: 5 }, trim: { c: 0xd2d5d8, r: 0.55, k: 4 },
  arm: { c: 0xa4a8ac, r: 0.6, k: 4 }, carpet: { c: 0x2a2b2d, r: 1, k: 3 }, footMat: { c: 0x161718, r: 0.95, k: 3 }, seat: { c: 0xb4b8bb, r: 0.55, k: 2 }, seatSide: { c: 0x9ea2a6, r: 0.5, k: 2 },
  belt: { c: 0x27292d, r: 0.6, k: 4 },                      // (the belts' charcoal webbing: made with the seats, tools/aircraft/cockpit_seats.py)
  // (postAlu: the windshield strip's light aluminium, mostly diffuse — a metal shows almost no colour of its own under the
  // cabin's dim environment light: sky.js ENV_INTENSITY, and envMapIntensity is not applied)
  pedal: { c: 0xa7aaad, r: 0.75, k: 4 }, postAlu: { c: 0xa9adb1, r: 0.5, m: 0.2 }, screw: { c: 0x3a3d41, r: 0.35, m: 0.7 },
  chrome: { c: 0xc8ccd1, r: 0.16, m: 1 }, alu: { c: 0x9ba1a7, r: 0.34, m: 0.9 }, steel: { c: 0x5d6268, r: 0.4, m: 0.8 },
  black: { c: 0x1b1c1e, r: 0.35 }, rubber: { c: 0x151515, r: 0.9 }, red: { c: 0xb3231c, r: 0.42 }, white: { c: 0xe8e9ea, r: 0.4 },
  yoke: { c: 0x2a2c2f, r: 0.45, k: 4 }, grip: { c: 0x26282b, r: 0.6, k: 6 }, cbBody: { c: 0x0e0e0f, r: 0.45 }, slot: { c: 0x050506, r: 0.9 },
  lens: { c: 0xf2efe6, r: 0.2 }, caseBlack: { c: 0x0c0c0d, r: 0.5 },
  blue: { c: 0x1f4f9a, r: 0.42 },                           // (M6) the Seminole's propeller levers' knobs
};
// the black ribbed or pebbled grips in code (the hand brake's, the trim wheel's ribs: S.grip is the yokes'); the flap
// handle's a lighter satin charcoal (the LX Steel photo: its ribs read by their sheen against the black console); a light
// satin metal for small bright parts that must read in the cabin's dim light (a full metal there shows only the
// environment: S.postAlu's note) — the flap handle's button, the dome lights' rings, the outlets' bezels
const GRIPBLK = { ...S.black, r: 0.55, k: 6 }, FLAPGRIP = { c: 0x2e3033, r: 0.45, k: 6 }, SATIN = { c: 0xc6cacf, r: 0.38, m: 0.25 };

// ---------------------------------------------------------------- geometry helpers (everything ends non-indexed)
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1);
function at(g, p, r) { _e.set(r ? r[0] : 0, r ? r[1] : 0, r ? r[2] : 0); _q.setFromEuler(_e); _p.set(p[0], p[1], p[2]); return g.applyMatrix4(_m4.compose(_p, _q, _one)); }
const rbox = (w, h, d, r = 0.004, seg = 1) => { const rr = Math.min(r, Math.min(w, h, d) * 0.49); return rr < 0.0025 ? new THREE.BoxGeometry(w, h, d) : new RoundedBoxGeometry(w, h, d, seg, rr); };
const cylZ = (rFront, rBack, h, seg = 16) => new THREE.CylinderGeometry(rFront, rBack, h, seg).rotateX(Math.PI / 2);   // along z, the front (+z) radius first
const cylX = (r, h, seg = 16) => new THREE.CylinderGeometry(r, r, h, seg).rotateZ(Math.PI / 2);
const tube = (pts, r, ts = 12, rs = 8) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(p[0], p[1], p[2]))), ts, r, rs, false);
const sphere = (r, ws = 12, hs = 8) => new THREE.SphereGeometry(r, ws, hs);
// a surface over u, v ∈ [0, 1]: fn(u, v, out) sets the point; faces along du × dv (flip turns them round)
function sheet(fn, nu, nv, flip = false) {
  const pos = new Float32Array((nu + 1) * (nv + 1) * 3), idx = [], o = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { fn(i / nu, j / nv, o); const k = (j * (nu + 1) + i) * 3; pos[k] = o.x; pos[k + 1] = o.y; pos[k + 2] = o.z; }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1;
    if (flip) idx.push(a, c, b, b, c, d); else idx.push(a, b, c, b, d, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// a closed outline with rounded corners (pts: [[x, y], …])
function rounded(path, pts, r) {
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const d0 = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]), d1 = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]), rr = Math.min(r, d0 * 0.45, d1 * 0.45);
    const ax = p1[0] + (p0[0] - p1[0]) / d0 * rr, ay = p1[1] + (p0[1] - p1[1]) / d0 * rr, bx = p1[0] + (p2[0] - p1[0]) / d1 * rr, by = p1[1] + (p2[1] - p1[1]) / d1 * rr;
    if (i === 0) path.moveTo(ax, ay); else path.lineTo(ax, ay);
    path.quadraticCurveTo(p1[0], p1[1], bx, by);
  }
  path.closePath();
  return path;
}
const rectPts = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
// an extruded outline (with holes) whose front face lies at z = front, soft (smoothed) edges
function slab(outline, r, holes, depth, front, bevel = 0.003, curveSeg = 5, bevelSeg = 2) {
  const sh = rounded(new THREE.Shape(), outline, r);
  for (const [pts, hr] of holes) sh.holes.push(rounded(new THREE.Path(), pts, hr));
  const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bevelSeg, curveSegments: curveSeg });
  g.translate(0, 0, front - depth - bevel);
  return smooth(g);
}
// merge the vertices by position and recompute smooth normals (soft bevels)
function smooth(g) {
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-5); m.computeVertexNormals();
  return m;
}

// ---------------------------------------------------------------- the occlusion proxy (sky light reaching each vertex)
const AO_BOX = { x: 0.555, y0: FLOOR, y1: ROOF, z0: FIRE, z1: AFT };
const AO_WIN = [[-1.10, -0.27, 0.41, 0.72], [-0.08, 0.58, 0.41, 0.71], [0.81, 1.18, 0.44, 0.66]];
// the side windows (z, y): the opening, the ring round it (its outer edge), the corner radius; and the posts between
const W1 = [[-1.13, 0.405], [-0.26, 0.405], [-0.26, 0.732], [-0.755, 0.732]], W2 = [[-0.09, 0.405], [0.60, 0.405], [0.52, 0.715], [-0.09, 0.722]], W3 = [[0.80, 0.425], [1.20, 0.47], [1.17, 0.66], [0.80, 0.69]];
const zf1 = y => -1.1635 + 1.147 * (y - 0.405), zr2 = y => 0.6227 - 0.258 * (y - 0.405), zr3 = y => 1.222 - 0.158 * (y - 0.47);
const WINDOWS = [
  [W1, [[zf1(SILL), SILL], [-0.238, SILL], [-0.238, WTOP], [zf1(WTOP), WTOP]], 0.05],
  [W2, [[-0.112, SILL], [zr2(SILL), SILL], [zr2(WTOP), WTOP], [-0.112, WTOP]], 0.06],
  [W3, [[0.778, SILL], [zr3(SILL), SILL], [zr3(WTOP), WTOP], [0.778, WTOP]], 0.04],
];
const POSTS = [[y => wsZ(bandX(y) + 0.004, y) - 0.03, zf1], [() => -0.238, () => -0.112], [zr2, () => 0.778], [zr3, () => AFT]];
const GLASS = 0.016;                               // the side windows' glass: this far outboard of the window band's plane
// the walls made in Blender (tools/aircraft/cockpit_walls.py, the group 'walls'; without it, the simple shapes made here),
// to Piper's TX photos (the left wall, the rear wall, the door's handle cup, its top latch) and the POH: sb, the split
// under the windows — the near-white upper band (the windows' raised surrounds, the posts, and on the left the
// LIMITATIONS placard: limits, its middle and size) over the light-grey lower panels, these proud of it by proud[0] above
// y proud[3], by proud[1] below y proud[2] (round the fuel selector's plate and the seats' pans); joint, the lower
// panels' joint aft of the front seats (on the right the door's aft edge); arm, armRear, the moulded armrests (z from the
// top's front tip to the aft end, their top y1, h tall with the finger recess under it, d deep) — the front ones where
// tx_leftfront has them, measured against the split and the window's foot (beside the pilot's knee and forearm, ahead of
// the instructor's elbow: test/actor.test.mjs has a copy of the door's box), the rear ones under the rear windows from the
// joint back (tx_leftrear); pocket, the left wall's mesh map pocket on the armrest's forward part (the hand mic in it); door (right,
// hinged at its front edge, carrying the front window), its outline round its inner panel (the front edge z0 low down,
// the aft edge z1, the sill y0, the top along the roof trim) and the inside handle in a black oval cup (its middle,
// half-sizes a × b, depth: in plain sight from the left seat between the panel and the right yoke's horn), the upper
// latch's plate (at z latch) on the fuselage's top frame; storm, the pilot's storm window in the left front window (its
// hinge strip and wire bail on the glass, standing on the window's lower edge; its forward end over the LIMITATIONS
// placard's aft end as in both photos; 24 cm wide and 17 cm tall, the photos' proportions — 0.72 of its width —, its
// top 4 cm under the eye, off the horizon); usb, usbSw, the rear walls' USB bezel and its
// switch (z, y); vents, the low air outlets on the kick panels ([z, y]: left, right). The door's handle sits ahead of
// the right yoke's horn: with the yoke centred (one gets out with it so) it is in plain sight and picked; with the yoke
// at full deflection the horn can hide it
const WALLS = {
  sb: 0.265, proud: [0.006, 0.0025, 0.0, 0.06], joint: -0.17, limits: { y: 0.305, z: -0.96, w: 0.22, h: 0.055 },
  arm: { z0: -0.92, z1: -0.56, y1: 0.166, h: 0.066, d: 0.058 }, armRear: { z0: -0.10, z1: 0.56, y1: 0.12, h: 0.06, d: 0.05 },
  pocket: { z0: -1.00, z1: -0.76, y0: 0.172, y1: 0.252 },
  door: { z0: -1.14, z1: -0.17, y0: -0.30, top: 0.725, cup: { z: -1.035, y: 0.25, a: 0.055, b: 0.085, depth: 0.034 }, latch: -0.43 },
  storm: { z0: -0.86, z1: -0.62, y0: 0.4055, y1: 0.578 },
  usb: [0.40, 0.175], usbSw: [0.10, 0.18], vents: [[-1.22, -0.24], [-1.26, -0.24]],
  // (the Seminole's) the emergency exit's handle cover on the left post between the first and second windows (the post
  // flat from the front window's surround at z −0.238 to the second's at −0.112): its z, y and thickness; its placard
  exit: { cover: { z: [-0.234, -0.19], y: [0.43, 0.63], t: 0.006 }, placard: { z: -0.146, y: 0.662, w: 0.032, h: 0.013 } },
};
// the door's inside handle in its cup (made in Blender: a lever lying on the cup's flat bottom, its pivot up, its grip
// down and turned out towards the cabin): the 'door' control's box round it and where one aims at it (the lever's face
// a little under its pivot: the line from the eye to it passes ~3.5 cm over the right yoke's hit boxes — to its grip,
// 4 cm lower, it passed 3 mm over them)
{ const c = WALLS.door.cup, xb = HW - WALLS.proud[0] + c.depth;
  c.hit = { size: [0.03, 0.12, 0.05], pos: [xb - 0.014, c.y - 0.005, c.z] }; c.aim = [xb - 0.0075, c.y + 0.008, c.z]; }
// what shades the sky's light in the cabin ([x0, x1, y0, y1, z0, z1]): the panel, the glareshield, the pedestal; each
// front seat's cushion (its bolsters' tops, its front roll), back (up to its shoulders) and moulded headrest (the TX's
// arch, as wide as the back: made with the seats, tools/aircraft/cockpit_seats.py, which checks its parts against these);
// the bench's cushion and back; the console between the front seats (its full height to where its face slopes down —
// FCON.zt —, then the face's lower half); the baggage floor
const AO_OCC = [
  [-0.42, 0.42, PBOT - 0.01, PTOP + 0.01, FIRE, PZ], [-0.25, 0.25, 0.44, 0.49, -1.31, -1.02], [-0.08, 0.10, -0.11, 0.07, FIRE, -1.065],
  [-0.51, -0.07, FLOOR, -0.095, -0.94, -0.245], [-0.51, -0.07, -0.15, 0.56, -0.30, -0.02], [-0.48, -0.10, 0.49, 0.69, -0.13, 0.01],
  [0.07, 0.51, FLOOR, -0.095, -0.94, -0.245], [0.07, 0.51, -0.15, 0.56, -0.30, -0.02], [0.10, 0.48, 0.49, 0.69, -0.13, 0.01],
  [-0.52, 0.52, FLOOR, -0.085, 0.22, 0.78], [-0.52, 0.52, -0.13, 0.54, 0.74, 0.95], [-0.07, 0.07, FLOOR, FCON.y1 - 0.01, FCON.zt - 0.02, FCON.z1],
  [-0.56, 0.56, FLOOR, -0.22, 0.95, AFT], [-0.065, 0.065, FLOOR, (FLOOR + FCON.y1) / 2, FCON.z0 + 0.03, FCON.zt - 0.02],
  // the glareshield's bowed ends, either side of its middle box (the second box above): stepped down with the bow —
  // appended, not inserted: tools/aircraft/cockpit_seats.py reads the seats' boxes by their places in this list.
  // Each step's top is the roll's top at its inner (highest) edge with the middle box's margin over it (~1 cm), its
  // bottom the roll's underside at its outer (lowest) edge: the ends' boxes used to span the whole end at the middle
  // step's heights, which left a slab of phantom shade over the dropped ends and a leak under them
  [-0.42, -0.25, 0.44, 0.487, -1.31, -1.02], [0.25, 0.42, 0.44, 0.487, -1.31, -1.02],
  [-0.50, -0.42, 0.402, 0.484, -1.22, -1.02], [0.42, 0.50, 0.402, 0.484, -1.22, -1.02],
  // (graphics stage A4) the panel's own stepped sides, and what the first box above used to cover at full height over
  // the corners: the panel's top edge falls with the same bow (panelTopY), so past |x| 0.42 the straight box shaded
  // air above the lowered corners — each step's top is its span's highest frame top with the first box's margin
  // (PTOP + 0.01 over 0.457); and the A-pillars' cheeks, which fill the corners against the windshield's base and
  // were missing here altogether, so the sky leaked through them onto the panel's corners
  [-0.50, -0.42, PBOT - 0.01, 0.472, FIRE, PZ], [0.42, 0.50, PBOT - 0.01, 0.472, FIRE, PZ],
  [-0.56, -0.50, PBOT - 0.01, 0.461, FIRE, PZ], [0.50, 0.56, PBOT - 0.01, 0.461, FIRE, PZ],
  [-0.56, -0.50, 0.388, 0.472, -1.22, -1.02], [0.50, 0.56, 0.388, 0.472, -1.22, -1.02],
  [-0.558, -0.498, 0.420, 0.4515, -1.185, -1.028], [0.498, 0.558, 0.420, 0.4515, -1.185, -1.028],
];
// the overhead air duct's fairing along the roof's centreline aft of the overhead switch panel (POH VB-2266 7.23: the
// outlets overhead at each seat, the duct fed by the blower; the brochure photo through the door: a raised centre
// fairing): its flat underside w0 across, h under the roof, its sides curving up into the headliner at ±w1/2,
// from z0 to z1, its ends ramping up into the headliner over ramp; an eyeball outlet each side of its underside (at ±ex)
// over each row of seats (eyes: z), each turned towards its seat; the two dome lights on the headliner beside it, one
// over each front seat (at ±x, z: a round frosted lens of r in a chrome ring ring wide; LIGHT DOME on the switch panel)
const DUCT = { w0: 0.12, w1: 0.19, h: 0.03, z0: -0.71, z1: 1.0, ramp: 0.08, ex: 0.031, eyes: [-0.47, 0.56] };
const DOME = { x: 0.17, z: -0.46, r: 0.05, ring: 0.008 };
// the duct's box, and the compass case on the windshield's centre post (its body, its hanger: [w, h, d] and an offset
// from COMPASS): built below, and seen by tools/aircraft/build_cockpit.py as what shades the top band
const CONSOLE = { pos: [0, ROOF - DUCT.h / 2 + 0.003, (DUCT.z0 + DUCT.z1) / 2], size: [DUCT.w1, DUCT.h + 0.006, DUCT.z1 - DUCT.z0] };
const CASE = { body: [0.064, 0.056, 0.040, 0, 0, -0.015], hanger: [0.012, 0.03, 0.03, 0, 0.038, -0.012] };
// the cabin's layout and surfaces for tools/aircraft/cockpit-spec.mjs (the parts made in Blender — the top band, the
// seats and belts, the glareshield, the yokes, the side walls: assets/model/cockpit.glb — are made to these)
export const CABIN = {
  EYE0, FLOOR, FIRE, AFT, PZ, PTOP, PBOT, SILL, WTOP, HW, HWT, ROOF, WS, KX, COMPASS, CONSOLE, CASE, SURFACES: S, bandX, roofY, wsZ, lowX,
  SEAT_X, SEAT, INSTRUCTOR, AO_OCC, FLAP, TRIMW, FCON, FUELSEL, DUCT, DOME, LEVER, PEDAL, PEDAL_X, YOKE, YOKE_HIT, GLARE, WALLS,
  CON44,                                           // (the Seminole's console: not in the spec yet; the tests')
  WIN: { W: [W1, W2, W3], r: WINDOWS.map(w => w[2]), glass: GLASS },   // (the side windows: openings, corners, glass)
  PANEL: { PFD, MFD, AUD, G5, BEZEL: { w: BEZEL.w, h: BEZEL.h, depth: BEZEL.depth } },
  OVH, ovhAt,                                      // (the overhead switch panel: not in the spec; the tests' and the tools')
};
const AO_N = 40, AO_DIRS = new Float32Array(AO_N * 3);
for (let i = 0; i < AO_N; i++) { const u = (i + 0.5) / AO_N, r = Math.sqrt(u), ph = i * 2.399963; AO_DIRS[i * 3] = r * Math.cos(ph); AO_DIRS[i * 3 + 1] = r * Math.sin(ph); AO_DIRS[i * 3 + 2] = Math.sqrt(1 - u); }
function rayOpen(ox, oy, oz, dx, dy, dz) {
  const B = AO_BOX;
  let t = Infinity, face = -1, tt;
  if (dx > 1e-6) { tt = (B.x - ox) / dx; if (tt < t) { t = tt; face = 0; } } else if (dx < -1e-6) { tt = (-B.x - ox) / dx; if (tt < t) { t = tt; face = 0; } }
  if (dy > 1e-6) { tt = (B.y1 - oy) / dy; if (tt < t) { t = tt; face = 2; } } else if (dy < -1e-6) { tt = (B.y0 - oy) / dy; if (tt < t) { t = tt; face = 3; } }
  if (dz > 1e-6) { tt = (B.z1 - oz) / dz; if (tt < t) { t = tt; face = 4; } } else if (dz < -1e-6) { tt = (B.z0 - oz) / dz; if (tt < t) { t = tt; face = 5; } }
  for (const b of AO_OCC) {
    if (ox > b[0] && ox < b[1] && oy > b[2] && oy < b[3] && oz > b[4] && oz < b[5]) continue;
    let t0 = 0, t1 = t;
    for (let a = 0; a < 3 && t0 <= t1; a++) {
      const o = a === 0 ? ox : a === 1 ? oy : oz, d = a === 0 ? dx : a === 1 ? dy : dz, lo = b[a * 2], hi = b[a * 2 + 1];
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) t1 = -1; continue; }
      let ta = (lo - o) / d, tb = (hi - o) / d; if (ta > tb) { const s = ta; ta = tb; tb = s; }
      if (ta > t0) t0 = ta; if (tb < t1) t1 = tb;
    }
    if (t0 <= t1) return false;
  }
  const ex = ox + dx * t, ey = oy + dy * t, ez = oz + dz * t;
  if (face === 0) { for (const w of AO_WIN) if (ez > w[0] && ez < w[1] && ey > w[2] && ey < w[3]) return true; return false; }
  if (face === 2) return ez < wsZ(ex, WS.y1);
  if (face === 5) return ey > WS.y0 + 0.01;
  return false;
}
// cosine-weighted sky visibility of a point with a normal (0..1)
function skyVis(px, py, pz, nx, ny, nz) {
  const ox = clamp(px + nx * 0.006, -AO_BOX.x + 1e-3, AO_BOX.x - 1e-3), oy = clamp(py + ny * 0.006, AO_BOX.y0 + 1e-3, AO_BOX.y1 - 1e-3), oz = clamp(pz + nz * 0.006, AO_BOX.z0 + 1e-3, AO_BOX.z1 - 1e-3);
  let tx = 0, ty = 0, tz = 0;
  if (Math.abs(nx) < 0.9) { tx = 0; ty = nz; tz = -ny; } else { tx = -nz; ty = 0; tz = nx; }
  const tl = Math.hypot(tx, ty, tz) || 1; tx /= tl; ty /= tl; tz /= tl;
  const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
  let open = 0;
  for (let i = 0; i < AO_N; i++) {
    const a = AO_DIRS[i * 3], b = AO_DIRS[i * 3 + 1], c = AO_DIRS[i * 3 + 2];
    if (rayOpen(ox, oy, oz, tx * a + bx * b + nx * c, ty * a + by * b + ny * c, tz * a + bz * b + nz * c)) open++;
  }
  return open / AO_N;
}
// (graphics stage A4: the curve used to run at one slope to saturation at a visibility of 0.45, so everything that
// saw half the sky — the walls by the windows and the middle of the cabin alike — took the sky's full light and
// the fall of the light from the windows read flat. The slope is kept where the shade is (under 0.3 the curve is
// the old one, so the deep shade and the mid-tones do not move) and eased above it, reaching full light only at
// 0.75: the bright band by the glass is spread out instead of clipped)
const aoOf = vis => 0.16 + 0.84 * (vis <= 0.3 ? vis * 2.2 : Math.min(1, 0.66 + (vis - 0.3) * 0.75));
// bake into the 4th component of cdMat (multiplied with the surface's own factor); a cache for repeated vertices
function bakeAO(g, cache) {
  const p = g.attributes.position, n = g.attributes.normal, m = g.attributes.cdMat;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), nx = n.getX(i), ny = n.getY(i), nz = n.getZ(i);
    const key = `${Math.round(x * 400)},${Math.round(y * 400)},${Math.round(z * 400)},${Math.round(nx * 8)},${Math.round(ny * 8)},${Math.round(nz * 8)}`;
    let ao = cache.get(key);
    if (ao === undefined) { ao = aoOf(skyVis(x, y, z, nx, ny, nz)); cache.set(key, ao); }
    m.setW(i, m.getW(i) * ao);
  }
}
// split edges longer than len (both triangles sharing an edge split it the same way: no cracks), so the occlusion
// baked per vertex has enough vertices on big flat faces
function refine(g, len) {
  const names = Object.keys(g.attributes), src = names.map(k => g.attributes[k]), out = names.map(() => []);
  const l2 = len * len, P = g.attributes.position;
  const emit = (v) => { for (let k = 0; k < names.length; k++) for (let c = 0; c < src[k].itemSize; c++) out[k].push(v[k][c]); };
  const vert = i => src.map(a => { const r = []; for (let c = 0; c < a.itemSize; c++) r.push(a.array[i * a.itemSize + c]); return r; });
  const mid = (a, b) => a.map((arr, k) => { const r = arr.map((x, c) => (x + b[k][c]) / 2); if (names[k] === 'normal') { const l = Math.hypot(r[0], r[1], r[2]) || 1; r[0] /= l; r[1] /= l; r[2] /= l; } return r; });
  const d2 = (a, b) => { const pa = a[0], pb = b[0]; return (pa[0] - pb[0]) ** 2 + (pa[1] - pb[1]) ** 2 + (pa[2] - pb[2]) ** 2; };
  const tri = (a, b, c, depth) => {
    const s0 = d2(a, b) > l2, s1 = d2(b, c) > l2, s2 = d2(c, a) > l2;
    if (depth > 7 || (!s0 && !s1 && !s2)) { emit(a); emit(b); emit(c); return; }
    const ab = s0 ? mid(a, b) : null, bc = s1 ? mid(b, c) : null, ca = s2 ? mid(c, a) : null;
    if (s0 && s1 && s2) { tri(a, ab, ca, depth + 1); tri(ab, b, bc, depth + 1); tri(ca, bc, c, depth + 1); tri(ab, bc, ca, depth + 1); return; }
    if (s0 && s1) { tri(ab, b, bc, depth + 1); tri(a, ab, bc, depth + 1); tri(a, bc, c, depth + 1); return; }
    if (s1 && s2) { tri(bc, c, ca, depth + 1); tri(a, b, bc, depth + 1); tri(a, bc, ca, depth + 1); return; }
    if (s2 && s0) { tri(ca, a, ab, depth + 1); tri(ab, b, c, depth + 1); tri(ab, c, ca, depth + 1); return; }
    if (s0) { tri(a, ab, c, depth + 1); tri(ab, b, c, depth + 1); return; }
    if (s1) { tri(a, b, bc, depth + 1); tri(a, bc, c, depth + 1); return; }
    tri(a, b, ca, depth + 1); tri(ca, b, c, depth + 1);
  };
  for (let i = 0; i + 2 < P.count; i += 3) tri(vert(i), vert(i + 1), vert(i + 2), 0);
  const r = new THREE.BufferGeometry();
  names.forEach((k, j) => r.setAttribute(k, new THREE.BufferAttribute(new Float32Array(out[j]), src[j].itemSize)));
  return r;
}

// the parts made in Blender (tools/aircraft/build_cockpit.py → assets/model/cockpit.glb) into the cabin: each node
// "<group>.<surface>[.<moving part>][.pa28|.pa44]" with that surface's roughness, metalness and detail kind, its own
// colours (sRGB) per vertex, and its alpha (the occlusion of what is close by) as the starting occlusion that bakeAO
// multiplies by the sky's; into the static shell, a moving part (made in place: see PIV), or one type's own shell (the
// Seminole's only with twin) → the nodes' names, or null when the model is not there
function addBand(B, twin) {
  const m = modelMeshes('cockpit');
  if (!m) return null;
  const c = new THREE.Color(), names = [];
  for (const [name, mm] of m) {
    const [, surf, ...tags] = name.split('.'), s = S[surf];
    if (!s) throw new Error('cockpit: no surface for ' + name);
    const v = tags.find(t => t === 'pa28' || t === 'pa44') || null, part = tags.find(t => t !== v) || null;
    if (v === 'pa44' && !twin) continue;                     // (the Archer alone: none of the Seminole's)
    const n = mm.count, col = new Float32Array(n * 3), mat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      c.setRGB(mm.col[i * 3], mm.col[i * 3 + 1], mm.col[i * 3 + 2], THREE.SRGBColorSpace);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      mat[i * 4] = s.r ?? 0.6; mat[i * 4 + 1] = s.m ?? 0; mat[i * 4 + 2] = s.k ?? 0; mat[i * 4 + 3] = mm.ao[i];
    }
    const g = new THREE.BufferGeometry();                    // (the model's arrays are shared: copied)
    g.setAttribute('position', new THREE.BufferAttribute(mm.pos.slice(), 3)); g.setAttribute('normal', new THREE.BufferAttribute(mm.nrm.slice(), 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('cdMat', new THREE.BufferAttribute(mat, 4));
    if (part) { if (!B.moving.has(part)) B.moving.set(part, []); B.moving.get(part).push(g); if (v) B.partV.set(part, v); }
    else (v ? B.kitV[v] : B.kit).push(g);
    names.push(name);
  }
  return names;
}

// ---------------------------------------------------------------- materials
// the cabin's material: colour per vertex, roughness / metalness / detail kind / occlusion per vertex (cdMat), a fine
// procedural surface detail by kind (paint, leather grain, carpet pile, vinyl grain, woven cloth, the grips' coarser
// pebble) that fades out before it can alias, and the occlusion applied to the sky's light only (the sun is shadowed
// by the shadow map). The detail's strength is the caller's quality preset (opts.quality.cockpitDetail, as the
// ground's detail follows groundDetail): full at high and ultra, weaker at medium, off at low — the heights are in
// metres and the normal is perturbed from the height's screen-space gradient, so no texture is involved
const VERT = (sh) => {
  sh.vertexShader = sh.vertexShader
    .replace('#include <common>', '#include <common>\nattribute vec4 cdMat; varying vec4 vMat; varying vec3 vOP; varying vec3 vON;')
    .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMat = cdMat; vOP = position; vON = normal;');
};
const AO_FRAG = /* glsl */`
  float ambientOcclusion = vMat.w;
  reflectedLight.indirectDiffuse *= ambientOcclusion;
  #if defined( USE_ENVMAP ) && defined( STANDARD )
    float dotNVo = saturate( dot( geometryNormal, geometryViewDir ) );
    reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNVo, ambientOcclusion, material.roughness );
  #endif`;
function kitMaterial(detail = 1) {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1, envMapIntensity: 1 });
  const uDetail = { value: detail };
  m.userData.uDetail = uDetail;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uCdDetail = uDetail;
    VERT(sh);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uCdDetail;
        varying vec4 vMat; varying vec3 vOP; varying vec3 vON;
        ${NOISE}
        float cdH = 0.0, cdR = 1.0;
        vec3 cdPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection) {
          vec3 vSigmaX = normalize(dFdx(surf_pos)), vSigmaY = normalize(dFdy(surf_pos)), vN = surf_norm;
          vec3 R1 = cross(vSigmaY, vN), R2 = cross(vN, vSigmaX);
          float fDet = dot(vSigmaX, R1) * faceDirection;
          vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
          return normalize(abs(fDet) * surf_norm - vGrad);
        }`)
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        {
          int kind = int(vMat.z + 0.5);
          vec3 an = abs(vON);
          vec2 dp = an.y > an.x && an.y > an.z ? vOP.xz : (an.x > an.z ? vOP.zy : vOP.xy);
          float freq = 0.0, amp = 0.0, alb = 0.0, n = 0.5;
          if (kind == 1) { freq = 650.0; n = cdNoise(dp * freq); amp = 0.00006; alb = 0.06; cdR = 0.88 + 0.24 * n; }
          else if (kind == 2) { freq = 330.0; n = cdNoise(dp * freq) * 0.65 + cdNoise(dp * freq * 2.3) * 0.35; amp = 0.00012; alb = 0.10; cdR = 0.75 + 0.5 * n; }
          else if (kind == 3) { freq = 800.0; n = cdNoise(dp * freq) * 0.55 + cdNoise(dp * 95.0) * 0.45; amp = 0.00025; alb = 0.32; cdR = 1.0; }
          else if (kind == 4) { freq = 420.0; n = cdNoise(dp * freq); amp = 0.00004; alb = 0.035; cdR = 0.9 + 0.2 * n; }
          else if (kind == 5) { freq = 1400.0; vec2 q = dp * freq; n = 0.5 + 0.25 * (sin(q.x) * sin(q.y * 0.97)) + 0.25 * cdNoise(dp * 180.0); amp = 0.00004; alb = 0.08; cdR = 1.0; }
          else if (kind == 6) { freq = 190.0; n = cdNoise(dp * freq) * 0.6 + cdNoise(dp * freq * 2.7) * 0.4; amp = 0.00022; alb = 0.13; cdR = 0.7 + 0.6 * n; }
          float fade = freq > 0.0 ? 1.0 - smoothstep(0.35, 1.0, length(fwidth(dp)) * freq) : 0.0;
          diffuseColor.rgb *= 1.0 + alb * (n - 0.5) * 2.0 * mix(0.35, 1.0, fade) * uCdDetail;
          cdH = n * amp * fade * uCdDetail;
          cdR = mix(1.0, cdR, fade * uCdDetail);
        }`)
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = clamp(vMat.x * cdR, 0.04, 1.0);')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMat.y;')
      .replace('#include <normal_fragment_maps>', /* glsl */`
        {
          vec3 sp = -vViewPosition;
          float lx = max(length(dFdx(sp)), 1e-6), ly = max(length(dFdy(sp)), 1e-6);
          vec2 dHdxy = vec2(dFdx(cdH) / lx, dFdy(cdH) / ly);
          if (abs(dHdxy.x) + abs(dHdxy.y) > 0.0) normal = cdPerturb(sp, normal, dHdxy, faceDirection);
        }`)
      .replace('#include <aomap_fragment>', AO_FRAG);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-kit';
  return m;
}
// labels and placards' ink: the atlas holds only the ink's coverage (one channel), the colour comes from the vertices;
// roughness / metalness / backlight / occlusion per vertex; at night only the backlit labels glow (cdMat.z ≥ 1: in their
// own colour, the emissive white), and those lit by day too a little (cdMat.z − 1 of their colour: the panel's cyan-green
// print, whose backlight shows in the shade under the glareshield — the TX photo). base: an opaque variant, the ink over
// a ground of that colour (the compass card); inst: for an instanced mesh of one quad, each instance's place in the atlas
// its own (an instanced attribute uvRect: u0, v0, u1, v1 — the rockers' print)
function decalMaterial(map, key, base = null, inst = false) {
  const m = new THREE.MeshStandardMaterial({ map, vertexColors: true, emissive: 0xffffff, emissiveIntensity: 0, roughness: 1, metalness: 1,
    transparent: !base, depthWrite: !!base, polygonOffset: !base, polygonOffsetFactor: -2, polygonOffsetUnits: -4 });
  const ground = base ? new THREE.Color(base) : null;
  m.onBeforeCompile = (sh) => {
    VERT(sh);
    if (inst) sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 uvRect;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\n#ifdef USE_MAP\n  vMapUv = mix(uvRect.xy, uvRect.zw, uv);\n#endif');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec4 vMat; varying vec3 vOP; varying vec3 vON; float cdCov = 1.0;')
      .replace('#include <map_fragment>', '#ifdef USE_MAP\n  cdCov = texture2D( map, vMapUv ).r;\n#endif')
      .replace('#include <color_fragment>', '#include <color_fragment>\n' + (ground
        ? `diffuseColor.rgb = mix(vec3(${ground.r.toFixed(4)}, ${ground.g.toFixed(4)}, ${ground.b.toFixed(4)}), diffuseColor.rgb, cdCov);`
        : 'diffuseColor.a *= cdCov;'))
      .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = vMat.x;')
      .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vMat.y;')
      .replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance = vColor.rgb * cdCov * (totalEmissiveRadiance * min(vMat.z, 1.0) + max(vMat.z - 1.0, 0.0));')
      .replace('#include <aomap_fragment>', AO_FRAG);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-decal-' + key;
  return m;
}
// a display (self-lit, exact colours): the texture is never mipmapped (redrawn up to 30 times a second), so it is
// filtered here instead: 4 bilinear taps over the pixel's footprint — sharp up close, no shimmer from the seat
function screenMaterial(map, vertexColors = false) {
  const m = new THREE.MeshBasicMaterial({ map, toneMapped: false, vertexColors });
  m.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', /* glsl */`
      #ifdef USE_MAP
        vec2 sdx = dFdx(vMapUv), sdy = dFdy(vMapUv);
        vec4 sampledDiffuseColor = 0.25 * (texture2D(map, vMapUv + 0.125 * sdx + 0.375 * sdy) + texture2D(map, vMapUv - 0.125 * sdx - 0.375 * sdy)
          + texture2D(map, vMapUv + 0.375 * sdx - 0.125 * sdy) + texture2D(map, vMapUv - 0.375 * sdx + 0.125 * sdy));
        diffuseColor *= sampledDiffuseColor;
      #endif`);
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-screen-' + vertexColors;
  return m;
}
// the cowling seen over the glareshield: the aircraft's glossy white paint, with its seams, the oil door and the
// fasteners drawn from the position (no texture)
// (twin: the Seminole's nose — no cowling, only the nose cone's joint and its baggage door on the left)
function cowlMaterial(twin = false) {
  const m = new THREE.MeshPhysicalMaterial({ color: 0xefefea, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.07, envMapIntensity: 1.1 });
  if (twin) {
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vOP; float cdSeam = 0.0;')
        .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
          {
            float w = max(fwidth(vOP.z), fwidth(vOP.x)) * 1.2 + 0.0015;
            float joint = 1.0 - smoothstep(0.0, w, abs(vOP.z + 2.75));                                 // the nose cone's joint
            float door = (1.0 - smoothstep(0.0, w, min(abs(vOP.z + 1.75), abs(vOP.z + 2.5)))) * step(vOP.x, -0.2)
                       + (1.0 - smoothstep(0.0, w, abs(vOP.y - 0.2))) * step(vOP.x, -0.2) * step(-2.5, vOP.z) * step(vOP.z, -1.75);
            cdSeam = clamp(joint + door, 0.0, 1.0);
            diffuseColor.rgb *= 1.0 - 0.55 * cdSeam;
          }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, cdSeam);');
    };
    m.customProgramCacheKey = () => 'cadet-cockpit-nose';
    return m;
  }
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vOP;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvOP = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vOP; float cdSeam = 0.0;')
      .replace('#include <color_fragment>', /* glsl */`#include <color_fragment>
        {
          float w = max(fwidth(vOP.z), fwidth(vOP.x)) * 1.2 + 0.0015;
          float joint = 1.0 - smoothstep(0.0, w, abs(vOP.z + 1.47));                                   // the cowling's rear joint
          float door = (1.0 - smoothstep(0.0, w, abs(abs(vOP.x) - 0.11))) * step(-2.78, vOP.z) * step(vOP.z, -2.42)
                     + (1.0 - smoothstep(0.0, w, min(abs(vOP.z + 2.42), abs(vOP.z + 2.78)))) * step(abs(vOP.x), 0.11);
          float split = (1.0 - smoothstep(0.0, w, abs(vOP.y - 0.205))) * step(vOP.z, -1.47);           // upper / lower cowling
          float fz = fract((vOP.z + 1.47) / 0.085);
          float dots = (1.0 - smoothstep(0.002, 0.0035, length(vec2((fz - 0.5) * 0.085, vOP.y - 0.218)))) * step(vOP.z, -1.5);
          cdSeam = clamp(joint + door + split + dots * 0.7, 0.0, 1.0);
          diffuseColor.rgb *= 1.0 - 0.55 * cdSeam;
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.7, cdSeam);');
  };
  m.customProgramCacheKey = () => 'cadet-cockpit-cowl';
  return m;
}

// ---------------------------------------------------------------- the decal atlas (labels and placards, drawn once)
// One channel: the ink's coverage, drawn white on black (a colour canvas uploaded as R8 — a quarter of the memory);
// the ink's colour is the decal's vertex colour, and a placard's ground is a plate of its own under the ink. Its scale
// (pixels per millimetre) is the largest at which everything fits; an item's res scales it for itself (print too small
// to be read from the seat even zoomed in — the breakers' labels, the wall's placard seen edge-on — at fewer pixels).
// 4096 × 1024 since graphics stage A2 (2026-10-30; it was 1024 × 256): four times the density each way, so the panel's
// print stays sharp in the close-up view. Every item is laid out in millimetres and every draw works in fractions of
// its own box, so raising the canvas and the density (ATLAS_K) scales the whole atlas as one picture.
const SANS = '"Arial Narrow", "Helvetica Neue", Arial, Helvetica, sans-serif';
const ATLAS_W = 4096, ATLAS_H = 1024, ATLAS_K = 16, INK = 0xeeeeea;
// the panel's own backlit print (the dimmers, the breakers, carb heat: Piper's TX photo — cyan-green, lit by day too)
const GLOW = { col: 0x6fe6cf, lit: 1.12 };
class Atlas {
  constructor(W, H) { this.W = W; this.H = H; this.k = ATLAS_K; this.used = 0; this.items = []; }
  // a region of w × h millimetres; draw(g, w, h) in pixels
  add(wmm, hmm, draw, res = 1) {
    const it = { wmm, hmm, res, x: 0, y: 0, w: 0, h: 0, draw };
    this.items.push(it);
    return it;
  }
  // tallest first, each where it rests lowest on the skyline of those before it (then leftmost), apart by a gap that
  // scales with k (¾ of a pixel per mm, margins of ½), at k pixels per mm: does it fit? (The gaps and margins were
  // 3 px and 2 px at the old k of 4; scaling them with k keeps the layout the same picture at any density.)
  packAt(k) {
    const mg = k / 2, gap = k * 0.75;
    let sky = [{ x: mg, y: mg, w: this.W - mg }], top = 0;
    for (const it of [...this.items].sort((a, b) => b.hmm * b.res - a.hmm * a.res || b.wmm * b.res - a.wmm * a.res)) {
      it.w = Math.max(2, Math.round(it.wmm * k * it.res)); it.h = Math.max(2, Math.round(it.hmm * k * it.res));
      let bx = -1, by = Infinity;
      for (let i = 0; i < sky.length && sky[i].x + it.w + mg <= this.W; i++) {
        let y = 0;
        for (let j = i; j < sky.length && sky[j].x < sky[i].x + it.w + gap; j++) y = Math.max(y, sky[j].y);
        if (y < by) { by = y; bx = sky[i].x; }
      }
      if (bx < 0) { this.used = Infinity; return false; }
      it.x = bx; it.y = by; top = Math.max(top, by + it.h + gap);
      const x1 = bx + it.w + gap, next = [];                    // (the skyline: its new step over [bx, x1), what it covers cut away)
      for (const s of sky) {
        if (s.x + s.w <= bx || s.x >= x1) { next.push(s); continue; }
        if (s.x < bx) next.push({ x: s.x, y: s.y, w: bx - s.x });
        if (s.x + s.w > x1) next.push({ x: x1, y: s.y, w: s.x + s.w - x1 });
      }
      next.push({ x: bx, y: by + it.h + gap, w: x1 - bx }); next.sort((a, b) => a.x - b.x);
      sky = [];
      for (const s of next) { const l = sky[sky.length - 1]; if (l && l.y === s.y && l.x + l.w === s.x) l.w += s.w; else sky.push(s); }
    }
    this.used = (top - k / 4) / this.H;
    return this.used <= 1;
  }
  pack(kMax = ATLAS_K) { for (this.k = kMax; this.k > kMax * 0.375 && !this.packAt(this.k); this.k -= kMax / 80); return this; }
  get full() { return this.used > 1; }
  uv(it) { return [it.x / this.W, 1 - (it.y + it.h) / this.H, (it.x + it.w) / this.W, 1 - it.y / this.H]; }
  render(cv) {
    const g = cv.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, this.W, this.H);
    for (const it of this.items) { g.save(); g.translate(it.x, it.y); g.beginPath(); g.rect(0, 0, it.w, it.h); g.clip(); g.fillStyle = '#fff'; g.strokeStyle = '#fff'; it.draw(g, it.w, it.h); g.restore(); }
  }
}
// text (white ink): lines (strings), size = the cap height in mm (about)
function textDraw(lines, { weight = 700, align = 'center', font = SANS } = {}) {
  return (g, w, h) => {
    g.textBaseline = 'middle'; g.textAlign = align;
    const n = lines.length, lh = h / n, fs = lh * 0.78;
    g.font = `${weight} ${fs}px ${font}`;
    lines.forEach((l, i) => g.fillText(l, align === 'center' ? w / 2 : align === 'left' ? w * 0.04 : w * 0.96, lh * (i + 0.55), w * 0.94));
  };
}

// ---------------------------------------------------------------- the builder: parts collected per material / moving part
// (M6) variant: while set ('pa28' | 'pa44'), what is added belongs to that type only (its own meshes, shown by setType)
function makeBuilder() {
  const kit = [], decals = [], glass = [], cowl = [], unlit = [], moving = new Map();
  const kitV = { pa28: [], pa44: [] }, decalsV = { pa28: [], pa44: [] }, partV = new Map();
  const surfOf = s => { const c = new THREE.Color(s.c); return [c.r, c.g, c.b, s.r ?? 0.6, s.m ?? 0, s.k ?? 0]; };
  // a part of the cabin's material: surface s; into the static mesh, or a moving part (name); refine: split big faces
  function add(g, s, part = null, refineLen = 0) {
    let geo = g.index ? g.toNonIndexed() : g;
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    if (!geo.attributes.normal) geo.computeVertexNormals();
    const [r, gg, b, ro, me, ki] = surfOf(s), n = geo.attributes.position.count;
    const col = new Float32Array(n * 3), mat = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) { col[i * 3] = r; col[i * 3 + 1] = gg; col[i * 3 + 2] = b; mat[i * 4] = ro; mat[i * 4 + 1] = me; mat[i * 4 + 2] = ki; mat[i * 4 + 3] = s.ao ?? 1; }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setAttribute('cdMat', new THREE.BufferAttribute(mat, 4));
    if (refineLen) geo = refine(geo, refineLen);
    if (part) { if (!moving.has(part)) moving.set(part, []); moving.get(part).push(geo); if (B.variant) partV.set(part, B.variant); }
    else (B.variant ? kitV[B.variant] : kit).push(geo);
    return geo;
  }
  const B = { kit, decals, glass, cowl, unlit, moving, add, kitV, decalsV, partV, variant: null, decalsPart: [] };   // (decalsPart: prints that ride on a moving part: { g, part })
  return B;
}
// a rocker switch (cockpit.js RK: its pivot at the origin, behind the face's middle; the face +z): its two halves
// sloping out to its ends, the rocker's shape
function rockerShape() {
  const hh = RK.h / 2, V = THREE.Vector2;
  const sh = new THREE.Shape([new V(0, -hh), new V(RK.d1, -hh), new V(RK.d0, 0), new V(RK.d1, hh), new V(0, hh)]);
  const g = new THREE.ExtrudeGeometry(sh, { depth: RK.w, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(RK.w / 2, 0, 0);
  g.deleteAttribute('uv');
  return g;
}
// a quad facing +z (w × h), uv = [u0, v0, u1, v1], placed; attrs for the decal-like materials
function quad(w, h, uv, p, r) {
  const g = new THREE.PlaneGeometry(w, h);
  const a = g.attributes.uv;
  for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
  return at(g.toNonIndexed(), p, r);
}
function withMat(g, rough, metal, z, ao = 1) {
  const n = g.attributes.position.count, m = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) { m[i * 4] = rough; m[i * 4 + 1] = metal; m[i * 4 + 2] = z; m[i * 4 + 3] = ao; }
  g.setAttribute('cdMat', new THREE.BufferAttribute(m, 4));
  return g;
}
function withCol(g, hex) {
  const c = new THREE.Color(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
  g.setAttribute('color', new THREE.BufferAttribute(a, 3));
  return g;
}

// ================================================================ buildCockpit
// buildCockpit(FL, A, opts) → { root, eye, instructorSeat: { hip, ankleL, ankleR, eye, yaw, seatY }, screens: { pfd, mfd }, band, fromCode,
//   controls, switches, parts, pick(raycaster), aimPoint(control, out), update(dt, o), setVisible(v), setAnisotropy(n),
//   markDirty(), triangles, meshes, textureBytes, stats, dispose() }. root goes under the flown aircraft's root (the body
//   frame); eye and instructorSeat are in that frame. update(dt, { s, L, av = L.av, parkBrake, night 0..1, eng, rTrim })
//   every frame.
// controls: [{ id, label (Japanese, short), kind, target (its hit mesh, on PICK_LAYER), at (where to aim, at rest),
//   act(dir, wheel) }]: dir +1 = a click or the wheel turned up (clockwise / forward / on), −1 = the wheel down; act
//   returns what the game should do, or null for nothing: { type: 'flight', name, arg? } (the flight bridge's action),
//   { type: 'av', what, dir, big } (FL.avionics.control(L.av, what, dir, big); the softkey labels and the lamps follow
//   av by themselves), { type: 'switch', id, on } and { type: 'select', id, value } (set cockpit.switches[id]; the
//   lights and the engine are the game's to apply: aircraft/systems.js), { type: 'prime' } (one stroke of the primer),
//   { type: 'exit' }, { type: 'info', text }.
// pick(raycaster): the control whose hit box the ray meets first (what is drawn does not block it, so every aim point
//   is kept in plain sight from the eye: see the tests), null while the cockpit is hidden.
// The screens are unlit and toneMapped: false, but CADET's composer tone maps the whole image in its OutputPass (AgX),
//   so their colours come out somewhat darker and less saturated than FLIGHT LAB's canvases.
// opts: { makeCanvas(w, h) → canvas | null (default: a DOM canvas when there is a document), anisotropy }
export function buildCockpit(FL, A, opts = {}) {
  const P = FL.physics, AV = FL.avionics;
  const makeCanvas = opts.makeCanvas !== undefined ? opts.makeCanvas
    : (typeof document !== 'undefined' ? (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } : null);
  const B = makeBuilder(), add = B.add;
  const atlas = new Atlas(ATLAS_W, ATLAS_H);
  // ink from the atlas on a quad of w × h mm at p (turned by r), in the colour col; lit: backlit at night
  const decal = (wmm, hmm, draw, p, r, { lit = 1, rough = 0.55, col = INK, res = 1, it: had = null } = {}) => {
    // (graphics stage A4) at night the panel's light is strongest round the instruments and falls off towards the
    // pedestal's foot, the side walls and the back of the cabin: a backlit print's level follows where it sits.
    // lit 0 stays unlit, and a level over 1 (the panel's own print, GLOW: its day term is max(z − 1, 0)) is left
    // alone — those prints are all on the panel's face, where the fall is least
    const lv = lit > 0 && lit <= 1 ? lit * Math.min(1, Math.max(0.4, 1.12 - 0.7 * Math.hypot(p[0], p[1] - 0.26, p[2] - PZ))) : lit;
    const it = had || atlas.add(wmm, hmm, draw, res), g = withCol(withMat(quad(wmm / 1000, hmm / 1000, [0, 0, 1, 1], p, r), rough, 0, lv), col);
    g.userData = { it }; (B.variant ? B.decalsV[B.variant] : B.decals).push(g);
    return it;
  };
  // (the same print again — the Seminole's dimmers, its labels shared with the Archer's — takes the same place in the atlas)
  const labelIts = new Map();
  const label = (text, p, { size = 2.2, r = null, lit = 1, col = INK, weight, wmm = null, align, res } = {}) => {
    const lines = Array.isArray(text) ? text : [text], n = lines.length, longest = Math.max(...lines.map(l => l.length));
    const w = wmm || Math.max(3, longest * size * 0.66 + size * 0.6), h = size * 1.45 * n, key = `${lines.join('\n')}|${w}|${h}|${weight}|${align}|${res}`;
    const it = decal(w, h, textDraw(lines, { weight, align }), p, r, { lit, col, res, it: labelIts.get(key) || null });
    labelIts.set(key, it);
    return it;
  };
  // a placard (Piper's: black, the ink white): its ground (a plate in the cabin's material, on the surface) and its ink
  // just in front of it (along the placard's own normal: r turns it from facing +z)
  const placard = (lines, wmm, hmm, p, { bg = 0x111214, fg = INK, r = null, lift = 0.0004, res, draw = null } = {}) => {
    const n = new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(...(r || [0, 0, 0]))), off = d => [p[0] + n.x * d, p[1] + n.y * d, p[2] + n.z * d];
    add(at(new THREE.PlaneGeometry(wmm / 1000, hmm / 1000), off(lift), r), { c: bg, r: 0.32 });
    return decal(wmm, hmm, draw || placardDraw(lines), off(lift + 0.0003), r, { lit: 0, rough: 0.32, col: fg, res });
  };
  const controls = [], hitMat = new THREE.MeshBasicMaterial({ visible: false }), hits = [], hitGeos = [];
  const hitRoot = new THREE.Group(); hitRoot.name = 'cockpit-hits';
  // a control: target = an invisible box (or cylinder) a little larger than the thing (more: further boxes [size, pos] of
  // the same control, e.g. a yoke's two horns); part = the moving part it rides on; at = where to aim at it
  function control(c) {
    const g = c.cyl ? cylZ(c.cyl[0], c.cyl[0], c.cyl[1], 12) : new THREE.BoxGeometry(c.size[0], c.size[1], c.size[2]);
    const mesh = new THREE.Mesh(g, hitMat);
    mesh.position.set(c.pos[0], c.pos[1], c.pos[2]); if (c.rot) mesh.rotation.set(c.rot[0], c.rot[1], c.rot[2]);
    mesh.layers.set(PICK_LAYER); mesh.name = 'hit-' + c.id;
    const ctl = { id: c.id, label: c.label, kind: c.kind, target: mesh, at: new THREE.Vector3(...(c.aim || c.pos)), part: c.part || null, act: c.act, type: B.variant };
    if (typeof c.label === 'function') Object.defineProperty(ctl, 'label', { get: c.label, enumerable: true });     // it changes (a softkey's function)
    mesh.updateMatrix();
    ctl.aimLocal = ctl.at.clone().applyMatrix4(mesh.matrix.clone().invert());     // where to aim, in the hit mesh's frame (moves with it)
    mesh.userData.control = ctl;
    for (const [sz, p] of c.more || []) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sz[0], sz[1], sz[2]), hitMat);
      m.position.set(p[0] - c.pos[0], p[1] - c.pos[1], p[2] - c.pos[2]); m.layers.set(PICK_LAYER); m.name = mesh.name; m.userData.control = ctl;
      mesh.add(m); hitGeos.push(m.geometry);
    }
    hits.push({ mesh, part: c.part || null }); hitGeos.push(g);
    controls.push(ctl);
    return ctl;
  }
  const cur = { s: null, av: null, L: null };                 // the last state update() saw (act() reads it)
  // the switches: as a lesson starts (aircraft/systems.js RUNNING: everything on but the landing light and the pitot
  // heat), the fan OFF. Two are read through the switch the type has: taxi (both types' landing light switch works
  // the taxi lamp too — the Archer's LANDG LIGHT, the Seminole's LANDING LIGHT on its LDG/TAXI LTS breaker —: it
  // follows landing; set, it does nothing), strobeSel (the three-position strobe: STROBE_POS from the lamps strobe and
  // beacon, and set, it sets them). (The magnetos as a key would show them: systems.js magState.)
  let type = 'pa28';
  const switches = { ...RUNNING, propCycled: false, fan: 'OFF' };
  Object.defineProperties(switches, {
    taxi: { enumerable: true, get() { return !!this.landing; }, set() {} },
    strobeSel: { get() { return STROBE_POS[this.strobe ? 2 : this.beacon ? 0 : 1]; }, set(v) { this.strobe = v === STROBE_POS[2]; this.beacon = v !== STROBE_POS[1]; } },
  });
  const twinA = opts.twin || null;                            // (M6) the Seminole's own parts too: setType('pa44') shows them
  const flight = (name, arg) => (arg === undefined ? { type: 'flight', name } : { type: 'flight', name, arg });
  const info = text => ({ type: 'info', text });
  const avc = (what, dir = 1, big = false) => ({ type: 'av', what, dir, big });

  // ============================================================ the shell
  // the parts made in Blender (null: none; a group missing from the model: its simple shapes made here)
  const band = addBand(B, twinA), fromModel = group => !!band && band.some(n => n.split('.')[0] === group);
  // floor (carpet), firewall, the plate under the panel
  add(sheet((u, v, o) => o.set(-0.462 + 0.924 * u, FLOOR, FIRE + (AFT - FIRE) * v), 6, 18, true), S.carpet);
  // the foot wells' black mats on it, under the pedals, back to the seats' rails (the LX Steel photo; rounded corners)
  for (const sd of [-1, 1]) add(slab(rectPts(sd < 0 ? -0.455 : 0.14, 0.95, sd < 0 ? -0.14 : 0.455, 1.30), 0.04, [], 0.003, FLOOR + 0.004, 0, 3).rotateX(-Math.PI / 2), S.footMat, null, 0.3);
  add(sheet((u, v, o) => o.set(-0.53 + 1.06 * u, FLOOR + (WS.y0 - 0.06 - FLOOR) * v, FIRE), 8, 8, false), S.carpet);   // (its top under the cowling's sides)
  add(sheet((u, v, o) => o.set(-0.55 + 1.1 * u, PBOT - 0.004, PZ - 0.02 + (FIRE - PZ + 0.02) * v), 6, 4, true), { ...S.black, ao: 0.6 });
  // (without the model's walls) the lower walls (to the window sill): a soft profile from the floor up, light grey up to
  // the sill band, near-white on it (SB up to the sill: the band under the windows that carries the LIMITATIONS placard on
  // the left); the window band's rings and posts, the sill trims, the armrests, the B-pillar trims
  const SB = WALLS.sb, walls = fromModel('walls');
  for (const sd of [-1, 1]) {
    const zp = y => wsZ(bandX(y) + 0.004, y) - 0.03;
    if (!walls) {
      add(sheet((u, v, o) => { const y = FLOOR + (SB - FLOOR) * v; o.set(sd * lowX(y), y, FIRE + (AFT - FIRE) * u); }, 22, 7, sd < 0), S.wallLow);
      add(sheet((u, v, o) => { const y = SB + (SILL - SB) * v; o.set(sd * lowX(y), y, FIRE + (AFT - FIRE) * u); }, 22, 1, sd < 0), S.wall);
      // the upholstered side panel (on the right: the door's), a shade darker than the wall, up to the sill band
      add(sheet((u, v, o) => { const y = -0.27 + (SB - 0.012 + 0.27) * v; o.set(sd * (lowX(y) - 0.0025), y, -1.17 + 1.01 * u); }, 6, 6, sd < 0), S.sidePanel);
      // the window band (leaning in towards the roof): a ring round each window (its thick, soft-edged reveal) and the
      // posts between them, all in the band's plane
      const len = Math.hypot(KX, 1), nx = sd / len, ny = -KX / len;
      // (sx, sy, sz) → x = sd·bandX(sy) + (0.016 − sz)·n, y = sy + (0.016 − sz)·n.y, z = sd·sx  (sx = sd·z keeps the faces' winding)
      const M = new THREE.Matrix4().set(0, sd * KX, -nx, sd * (HW - KX * SILL) + 0.016 * nx, 0, 1, -ny, 0.016 * ny, sd, 0, 0, 0, 0, 0, 0, 1);
      const mir = pts => pts.map(([z, y]) => [sd * z, y]);
      for (const [win, ring, r] of WINDOWS) add(slab(mir(ring), 0.002, [[mir(win), r]], 0.014, 0.016, 0.005, 5, 1).applyMatrix4(M), S.wall);
      for (const [z0, z1] of POSTS) add(sheet((u, v, o) => { const y = SILL + (WTOP - SILL) * v, z = z0(y) + (z1(y) - z0(y)) * u; o.set(sd * bandX(y), y, z); }, 4, 6, sd < 0), S.wall);
      // the sill trim and the armrest
      add(at(rbox(0.035, 0.022, AFT - zp(SILL) - 0.02, 0.008, 1), [sd * (HW - 0.012), SILL + 0.004, (AFT + zp(SILL)) / 2]), S.trim);
      add(at(rbox(0.06, 0.05, 0.42, 0.014, 2), [sd * (HW - 0.035), 0.205, -0.62]), S.arm);
      add(at(rbox(0.05, 0.045, 0.36, 0.012, 2), [sd * (HW - 0.03), 0.20, 0.42]), S.arm);
      // the B-pillar trim between the front and rear windows (leaning in with the window band: 1 cm proud of it all the way up)
      add(at(rbox(0.024, WTOP - SILL + 0.02, 0.15, 0.010, 2), [sd * (HW - 0.034), (WTOP + SILL) / 2, -0.175], [0, 0, sd * Math.atan(-KX)]), S.trim);
    }
    // (without the model) the A-pillar trim along the windshield's edge, and the upper trim along the roof
    if (!fromModel('headliner')) {
      const pil = []; for (let i = 0; i <= 8; i++) { const y = WS.y0 - 0.02 + (WTOP + 0.02 - WS.y0) * i / 8; pil.push([sd * (bandX(y) - 0.012), y, wsZ(bandX(y), y) + 0.02]); }
      add(tube(pil, 0.028, 16, 8), S.trim);
      add(at(rbox(0.04, 0.03, AFT - zp(WTOP) + 0.02, 0.01, 1), [sd * (HWT - 0.005), WTOP + 0.002, (AFT + zp(WTOP)) / 2]), S.trim);
    }
  }
  // (without the model) the headliner: an arch from window top to window top, from the windshield's top edge to the aft
  // bulkhead; the windshield's top bow
  if (!fromModel('headliner')) {
    add(sheet((u, v, o) => {
      const ph = Math.PI * u, x = -HWT * Math.cos(ph), y = WTOP + (ROOF - WTOP) * Math.sin(ph), z0 = wsZ(x, Math.min(y, WS.y1)) + 0.004;
      o.set(x, y, z0 + (AFT - z0) * v);
    }, 16, 18, false), S.roof);
    const pts = []; for (let i = 0; i <= 12; i++) { const x = -HWT + 2 * HWT * i / 12, y = Math.min(roofY(x), WS.y1 + 0.01) - 0.01; pts.push([x, y, wsZ(x, Math.min(y, WS.y1)) + 0.025]); }
    add(tube(pts, 0.026, 24, 8), S.trim);
  }
  // the windshield's centre strip: a flat riveted double strip of light aluminium (the hat section's two flanges, 8 mm
  // wide with a 3 mm gap, a little narrower at the top; Piper's TX photo, the maintenance manual) on a darker strip that
  // shows in the gap, flat on the glass; from under the line of sight over the glareshield's crest up into the header
  { const y0 = WS.y0 - 0.004, y1 = WS.y1 - 0.01, up = new THREE.Vector3(0, WS.y1 - WS.y0, WS.z1 - WS.z0).normalize();
    const flat = (xa, xb, lift, s) => add(sheet((u, v, o) => { const y = y0 + (y1 - y0) * v, x = (xa + (xb - xa) * u) * (1 - 0.18 * v); o.set(x, y, wsZ(x, y) + lift); }, 1, 4), s);
    flat(-0.0095, 0.0095, 0.001, S.steel);
    for (const sx of [-1, 1]) {
      flat(sx < 0 ? -0.0095 : 0.0015, sx < 0 ? -0.0015 : 0.0095, 0.0016, S.postAlu);
      for (let i = 0; i < 12; i++) {                                                      // the rivets, every 5 cm
        const v = (i + 0.5) / 12, y = y0 + (y1 - y0) * v, x = sx * 0.0055 * (1 - 0.18 * v);
        add(at(new THREE.CircleGeometry(0.0011, 5), [x, y, wsZ(x, y) + 0.0019], [Math.atan2(up.z, up.y), 0, 0]), S.postAlu);
      }
    }
  }
  // the aft bulkhead and the baggage floor
  add(sheet((u, v, o) => { const x = -HW + 2 * HW * u, y = FLOOR + (ROOF - FLOOR) * v; o.set(x, Math.min(y, roofY(x) + 0.01), AFT); }, 8, 8, true), S.wallDark);
  add(at(rbox(1.04, 0.18, AFT - 0.95, 0.02), [0, FLOOR + 0.09, (AFT + 0.95) / 2]), S.carpet);

  // ============================================================ the panel, the glareshield
  // the panel's frame: a box whose top edge falls with the glareshield's bow (panelTopY); its top under the sight
  // line over the glareshield's crest. The outline is drawn 1.5 mm inside, the bevel bringing it back to size
  { const sh = new THREE.Shape(), x0 = -0.5515, x1 = 0.5515, yb = PBOT - 0.0025;
    sh.moveTo(x0, yb);
    for (let i = 0; i <= 28; i++) { const x = x0 + (x1 - x0) * i / 28; sh.lineTo(x, panelTopY(x) - 0.0015); }
    sh.lineTo(x1, yb); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.032, bevelEnabled: true, bevelThickness: 0.0015, bevelSize: 0.0015, bevelSegments: 1 });
    g.translate(0, 0, PZ - 0.034);                       // (its faces where the old box's were: front PZ − 0.0005, back PZ − 0.0355)
    // (the frame is NOT swept aft at its corners as the face is: its cap is triangulated with long diagonals, so
    // shifting only the corner vertices would tent the whole front across the panel and bury the switches under
    // it. Its front stays 0.7 mm behind the face everywhere — the face carries the sweep, and the cheeks above
    // fill the corners where the two part)
    add(smooth(g), S.panel);
  }
  add(sheet((u, v, o) => { const x = -0.545 + 1.09 * u; o.set(x, PBOT + 0.008 + (panelTopY(x) - PBOT - 0.008) * v, PZ + 0.0002 + panelWrapZ(x)); }, 36, 9), S.panel);
  // its screw heads (dark steel, round its edges; the sub-panels' and plates' with them)
  const screw = (x, y, z = PZ + 0.0004) => add(at(new THREE.CircleGeometry(0.0021, 6), [x, y, z]), S.screw);
  for (const sx of [-1, 1]) for (const y of [0.115, 0.205, 0.415]) screw(sx * 0.541, y, PZ + 0.0004 + panelWrapZ(0.541));
  for (const x of [-0.49, -0.33, -0.19, 0.11, 0.30, 0.49]) screw(x, PBOT + 0.007);
  // (without the model) the glareshield: a hood from under its lip, over the rounded lip, forward to the windshield's
  // base; the lip falls with the bow, as the model's does
  if (!fromModel('glareshield')) add(sheet((u, v, o) => {
    const x = -GLARE.x + 2 * GLARE.x * u, zb = wsZ(x, WS.y0);
    const z1 = zb - 0.002, y1 = WS.y0 - 0.002, slope = (f) => [-1.05 + (z1 + 1.05) * f, 0.4795 + (y1 - 0.4795) * f];   // the hood falls straight to the windshield
    const prof = [...GLARE.lip.map(([z, y]) => [z, y - glareDrop(x)]), slope(0.33), slope(0.67), [z1, y1]];
    const f = v * (prof.length - 1), i = Math.min(prof.length - 2, Math.floor(f)), t = f - i;
    o.set(x, prof[i][1] + (prof[i + 1][1] - prof[i][1]) * t, prof[i][0] + (prof[i + 1][0] - prof[i][0]) * t);
  }, 36, 16, false), S.glare);
  // the A-pillars' feet: a cheek in the wall's colour at each end, filling the corner the bowed glareshield end leaves
  // against the windshield's base — from the glass (its front edge 2–4 mm off it), over the panel's bowed top corner,
  // back under the roll's dropped end (its top tucked into the hood and the roll); its underside follows the panel's
  // top edge. In code, with or without the model (it is an interior piece; WS itself stays straight)
  for (const sd of [-1, 1]) {
    const sh = new THREE.Shape(), prof = [[-1.183, 0.400], [-1.148, 0.4245], [-1.085, 0.4495], [-1.030, 0.4435], [-1.030, 0.400]];
    sh.moveTo(prof[0][0], prof[0][1]); for (const q of prof.slice(1)) sh.lineTo(q[0], q[1]); sh.closePath();
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.056, bevelEnabled: false });
    g.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 1, 0), new THREE.Vector3(sd, 0, 0)).setPosition(sd * 0.500, 0, 0));
    const p = g.attributes.position;
    if (sd > 0) for (let i = 0; i < p.count; i += 3) {   // (the basis swaps the axes (a reflection): turn its faces back outwards)
      const ax = p.getX(i + 1), ay = p.getY(i + 1), az = p.getZ(i + 1);
      p.setXYZ(i + 1, p.getX(i + 2), p.getY(i + 2), p.getZ(i + 2)); p.setXYZ(i + 2, ax, ay, az);
    }
    for (let i = 0; i < p.count; i++) if (Math.abs(p.getY(i) - 0.400) < 1e-6) p.setY(i, panelTopY(p.getX(i)) - 0.004);
    add(smooth(g), S.wall);
  }

  // ============================================================ the displays (G1000 type)
  const BZ = PZ + BEZEL.depth;                                       // the bezels' front face
  const screens = { pfd: null, mfd: null };
  const scr = { pfd: [], mfd: [] }, strips = [];
  for (const [which, C] of [['pfd', PFD], ['mfd', MFD]]) {
    const hw = BEZEL.w / 2, hh = BEZEL.h / 2, sw = BEZEL.screenW / 2, sy0 = BEZEL.screenBot, sy1 = BEZEL.screenBot + BEZEL.screenH;
    // the glass sits just behind the bezel's rounded lip, and the opening is wider than the screen by the bevel (whose
    // middle narrows the opening by its size): seen from the seat (≈25° down onto the PFD, ≈27° from the left onto the
    // MFD) the lip hides none of the top bar or the engine strip
    const bev = 0.002, m = bev + 0.0002;
    const fr = slab(rectPts(-hw, -hh, hw, hh), 0.009, [[rectPts(-sw - m, sy0 - m, sw + m, sy1 + m), 0.003]], BEZEL.depth - 0.003, BZ, bev);
    add(at(fr, [C[0], C[1], 0]), S.bezel);
    // the screen itself (the display, then the label strip under it), the black case behind its edges
    const zS = BZ - bev - 0.0005;
    add(at(new THREE.PlaneGeometry(BEZEL.screenW + 0.008, BEZEL.screenH + 0.008), [C[0], C[1] + BEZEL.screenY, zS - 0.001]), S.caseBlack);
    scr[which].push(quad(BEZEL.screenW, BEZEL.imageH, [0, 0, 1, 1], [C[0], C[1] + sy1 - BEZEL.imageH / 2, zS]));
    strips.push(quad(BEZEL.screenW, BEZEL.stripH, dynUV(DYN.strip[which]), [C[0], C[1] + sy0 + BEZEL.stripH / 2, zS]));
    const band = sy1 - BEZEL.imageH - sy0 - BEZEL.stripH;
    if (band > 1e-4) { const q = quad(BEZEL.screenW, band, dynUV(DYN.white), [C[0], C[1] + sy0 + BEZEL.stripH + band / 2, zS]); q.userData.black = true; B.unlit.push(q); }
    // softkeys
    for (let i = 0; i < 12; i++) {
      const x = C[0] + KEY_X(i), y = C[1] + BEZEL.keyY;
      add(at(rbox(0.0125, 0.0068, 0.008, 0.0018), [x, y, BZ - 0.001]), S.key);
      const tag = `${which === 'pfd' ? 'PFD' : 'MFD'} ソフトキー ${i + 1}`;
      const now = () => { const k = softkeysOf(which, cur.av)[i], l = k && (typeof k.label === 'function' ? (cur.av ? k.label(cur.av) : '') : k.label); return l && k.act ? `${tag}（${l}）` : tag; };
      control({ id: `${which}.sk${i + 1}`, label: now, kind: 'button', size: [0.016, 0.011, 0.02], pos: [x, y, BZ + 0.002],
        act: () => { const k = softkeysOf(which, cur.av)[i], w = k && k.act ? k.act(cur.av) : null; return w ? avc(w[0], w[1]) : info('このキーはこの飛行では使いません'); } });
    }
    // knobs: dual (outer ring + inner knob) or single, with the labels around them
    for (const kn of KNOBS) {
      const x = C[0] + kn.x, y = C[1] + kn.y;
      add(at(new THREE.CircleGeometry(kn.r + 0.003, 16), [x, y, BZ + 0.0006]), S.knobRing);
      if (kn.dual) {
        add(at(knurled(kn.r, 0.0085, 20), [x, y, BZ + 0.005]), S.knob);
        add(at(knurled(kn.r * 0.62, 0.0085, 14), [x, y, BZ + 0.0125]), S.knob);
      } else add(at(knurled(kn.r, 0.011, 16), [x, y, BZ + 0.0065]), S.knob);
      label(kn.label, [x, y + kn.r + 0.0048, BZ + 0.0002], { size: 1.8, wmm: kn.label.length * 1.25 + 1.5 });
      knobControls(which, kn, x, y);
    }
    for (const k of KEYS) {
      const x = C[0] + k.x, y = C[1] + k.y;
      add(at(rbox(k.w, 0.0068, 0.006, 0.0015), [x, y, BZ + 0.001]), S.key);
      label(k.label, [x, y, BZ + 0.0041], { size: 1.5, wmm: k.w * 1000 - 1 });
      keyControl(which, k, x, y);
    }
  }
  function knurled(r, h, n) {
    const g = new THREE.CylinderGeometry(r, r, h, n, 1, false);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), rr = Math.hypot(x, z); if (rr > r * 0.9) { const k = 1 + 0.03 * (i % 2 ? 1 : -1); p.setX(i, x * k); p.setZ(i, z * k); } }
    g.computeVertexNormals();
    return g.rotateX(Math.PI / 2);
  }
  function knobControls(which, kn, x, y) {
    const id = `${which}.${kn.id}`, z = BZ + 0.012;
    const dual = (name, outer, inner, push, labOut, labIn) => {
      const ex = EYE0[0] - x, ey = EYE0[1] - y, el = Math.hypot(ex, ey) || 1;                 // the ring's side towards the eye
      control({ id: id + '.outer', label: `${name}（外側）${labOut}`, kind: 'knob', cyl: [kn.r + 0.003, 0.012], pos: [x, y, BZ + 0.004], aim: [x + ex / el * kn.r * 0.86, y + ey / el * kn.r * 0.86, BZ + 0.009],
        act: (dir, wheel) => outer(wheel ? dir : 1) });
      control({ id: id + '.inner', label: `${name}（内側）${labIn}`, kind: 'knob', cyl: [kn.r * 0.62 + 0.0015, 0.01], pos: [x, y, z + 0.003],
        act: (dir, wheel) => (wheel || !push ? inner(wheel ? dir : 1) : push()) });
    };
    if (kn.id === 'nav') dual('NAV 周波数', d => avc('NAV_MHZ', d), d => avc('NAV_KHZ', d), () => avc('NAV_SEL'), 'MHz', 'kHz・押すと NAV1/2');
    else if (kn.id === 'com') dual('COM 周波数', d => avc('COM_MHZ', d), d => avc('COM_KHZ', d), () => avc('COM_SEL'), 'MHz', 'kHz・押すと COM1/2');
    else if (kn.id === 'alt') dual('高度選択 ALT', d => avc('ALT', d, true), d => avc('ALT', d), null, '1000 ft', '100 ft');
    else if (kn.id === 'crs') dual('CRS / BARO', d => avc('BARO', d), d => avc('CRS', d), null, '気圧設定', 'コース');
    else if (kn.id === 'fms') dual('FMS', d => avc('FPL_NEXT', d), d => avc('FPL_NEXT', d), null, '飛行計画のレグ', '飛行計画のレグ');
    else if (kn.id === 'hdg') control({ id, label: 'HDG ヘディング バグ（押すと今の機首方位に合わせる）', kind: 'knob', cyl: [kn.r + 0.003, 0.016], pos: [x, y, BZ + 0.007],
      act: (dir, wheel) => (wheel ? avc('HDG', dir) : avc('HDG_SYNC', cur.s ? Math.round(AV.trueToMag(cur.s.out.hdgTrue || 0, P.MAGVAR_W)) : 360)) });
    else if (kn.id === 'range') control({ id, label: 'RANGE 地図の範囲', kind: 'knob', cyl: [kn.r + 0.003, 0.016], pos: [x, y, BZ + 0.007], act: (dir) => avc('RANGE', dir < 0 ? -1 : 1) });
    else control({ id, label: `${kn.label}（音量）`, kind: 'knob', cyl: [kn.r + 0.003, 0.016], pos: [x, y, BZ + 0.007], act: () => info('音量はこの飛行では変えません') });
  }
  function keyControl(which, k, x, y) {
    const id = `${which}.${k.id}`, size = [k.w + 0.0015, 0.0088, 0.016], pos = [x, y, BZ + 0.003];    // (neighbours' boxes do not overlap)
    const wps = AV.WAYPOINTS.filter(w => w.kind !== 'ref').map(w => w.id);
    const acts = {
      navSwap: () => avc('NAV_SWAP'), comSwap: () => avc('COM_SWAP'), fpl: () => avc('MFD_PAGE'),
      direct: () => { const now = cur.av && cur.av.direct, i = wps.indexOf(now); return avc('DIRECT', i + 1 < wps.length ? wps[i + 1] : null); },
    };
    const labels = { navSwap: 'NAV 周波数の入れ替え', comSwap: 'COM 周波数の入れ替え', fpl: 'FPL（飛行計画のページ）', direct: 'D→（直行先を順に選ぶ）', menu: 'MENU キー', proc: 'PROC キー', clr: 'CLR キー', ent: 'ENT キー' };
    control({ id, label: labels[k.id], kind: 'button', size, pos, act: acts[k.id] || (() => info('このキーはこの飛行では使いません')) });
  }
  // the screens' and strips' textures come later (createGlass); remember the quads
  // ============================================================ the audio panel (GMA type)
  const AUDIO = [['COM1 MIC', 'COM1'], ['COM2 MIC', 'COM2'], ['COM3 MIC', 'COM3'], ['COM1/2', 'TEL'], ['PA', 'SPKR'], ['MKR/MUTE', 'HI SENS'], ['DME', 'ADF'], ['NAV1', 'NAV2'], ['AUX', 'MAN SQ'], ['PLAY', ''], ['PILOT', 'COPLT']];
  const lamps = [];                                        // { key, verts: [first, count] } in the unlit mesh
  {
    const [cx, cy] = AUD, w = 0.062, h = BEZEL.h;
    add(at(rbox(w, h, 0.018, 0.006, 2), [cx, cy, PZ + 0.009]), S.bezel);
    AUDIO.forEach((row, j) => row.forEach((name, i) => {
      if (!name) return;
      const x = cx + (i ? 0.0145 : -0.0145), y = cy + 0.088 - j * 0.0148, z = PZ + 0.018;
      add(at(rbox(0.024, 0.0105, 0.006, 0.0018), [x, y, z + 0.002]), S.key);
      label(name, [x, y - 0.0012, z + 0.0051], { size: 1.35, wmm: 15 });
      const lampKey = { 'COM1 MIC': 'micCOM1', 'COM2 MIC': 'micCOM2', COM1: 'monCOM1', COM2: 'monCOM2', NAV1: 'monNAV1', NAV2: 'monNAV2' }[name] || null;
      B.unlit.push(quad(0.009, 0.0016, dynUV(DYN.white), [x, y + 0.0037, z + 0.0052]));
      lamps.push({ key: lampKey, index: B.unlit.length - 1 });
      const act = name === 'COM1 MIC' || name === 'COM2 MIC' ? () => { const r = name.slice(0, 4); return cur.av && cur.av.audio.mic === r ? info(`送信はすでに ${r} です`) : avc('MIC'); }
        : /^(COM1|COM2|NAV1|NAV2)$/.test(name) ? () => avc('MON', name) : () => info('このボタンはこの飛行では使いません');
      control({ id: 'audio.' + name.replace(/[^A-Z0-9]/g, ''), label: `オーディオ ${name}`, kind: 'button', size: [0.026, 0.0125, 0.016], pos: [x, y, z + 0.004], act });
    }));
    add(at(knurled(0.0085, 0.008, 32), [cx, cy - 0.080, PZ + 0.022]), S.knob);
    add(at(knurled(0.0055, 0.008, 26), [cx, cy - 0.080, PZ + 0.029]), S.knob);
    label('VOL', [cx, cy - 0.066, PZ + 0.0182], { size: 1.4 });
    add(at(rbox(0.03, 0.007, 0.005, 0.0015), [cx, cy - 0.097, PZ + 0.019]), S.red);
    label('DISPLAY BACKUP', [cx, cy - 0.097, PZ + 0.0216], { size: 1.1, wmm: 28 });
  }

  // ============================================================ the standby: a Garmin G5 at the panel's far left
  // its bezel (a rounded square, the screen's opening in its upper part, the knob at its lower right, the small power
  // button at its lower left), the screen (the attitude page drawn on the small canvas, g1000.js drawStandby: lit when
  // the PFD is lit), the speeds printed over it (white straight on the panel: the TX photo)
  { const [x, y] = G5.c, hw = G5.w / 2, hh = G5.h / 2, sw = G5.screenW / 2, sh = G5.screenH / 2, sy = y + G5.screenY, zf = PZ + G5.depth, bev = 0.0015;
    add(slab(rectPts(x - hw, y - hh, x + hw, y + hh), 0.007, [[rectPts(x - sw - 0.001, sy - sh - 0.001, x + sw + 0.001, sy + sh + 0.001), 0.002]], G5.depth - 2 * bev, zf, bev, 3, 1), S.bezel);
    add(at(new THREE.PlaneGeometry(G5.screenW + 0.006, G5.screenH + 0.006), [x, sy, zf - 0.0045]), S.caseBlack);
    B.unlit.push(quad(G5.screenW, G5.screenH, dynUV(DYN.g5), [x, sy, zf - 0.0035]));
    add(at(knurled(0.0062, 0.009, 26), [x + 0.032, y - 0.0335, zf + 0.0045]), S.knob);
    add(at(cylZ(0.0028, 0.0028, 0.002, 10), [x - 0.032, y - 0.0335, zf + 0.001]), S.key);
    control({ id: 'stby.g5', label: '予備の計器 G5（姿勢・速度・高度・方位）', kind: 'button', size: [G5.w + 0.004, G5.h + 0.004, 0.024], pos: [x, y, PZ + 0.012], aim: [x, sy, zf - 0.0035],
      act: () => info('予備の計器（G5）：PFD が使えないときの姿勢・速度・高度・方位。PFD と同じ気圧設定で読みます') });
    // the maneuvering speeds and the demonstrated crosswind (the Archer's; the Seminole's — Piper's NXi panel photo, by its
    // registration plate over the PFD; POH VB-2636 2.3: VO at the two weights, the gear's VLO down / up and VLE, the
    // demonstrated crosswind — here over the G5, as the Archer's: the game's panel has no registration plate)
    B.variant = 'pa28';
    label(['VO 113 KIAS AT 2550 LBS', 'VO 98 KIAS AT 1917 LBS', 'DEMO X-WIND 17 KTS'], [x, y + hh + 0.032, PZ + 0.0002], { size: 2.6, wmm: 50, lit: 0 });
    B.variant = twinA ? 'pa44' : null;
    if (twinA) label(['VO 135 AT 3800 LBS', 'VO 115 AT 2870 LBS', 'VLO 140 DN, 109 UP', 'VLE 140 MAX.', 'DEMO. X-WIND 17 KTS'], [x, y + hh + 0.034, PZ + 0.0002], { size: 2.1, wmm: 40, lit: 0 });
    B.variant = null;
  }

  // ============================================================ the switches
  // the Archer's on the overhead panel and in the block under the audio panel; the Seminole's on its panel (the engine
  // switches, the two banks beside the throttles, the fuel pumps, the heater's) — rockers: one shape, one instanced mesh a
  // type, their print in one of its own (assembled below)
  const RKS = { pa28: { list: [], print: [] }, pa44: { list: [], print: [] } };   // each type's rockers ({ m: its frame at rest, key, kind, p0, p1: its print's quads }), the print's quads
  const pressT = { primer: 0 };                              // (the picture only: PRIMER shown pressed a moment after a press)
  // a rocker's act: a click toggles, the wheel sets (or does nothing); three positions: the wheel steps, a click cycles
  // OFF → the bottom → the top → OFF; START is held by a click (a click again lets it go; it springs back when the engine
  // catches: aircraft/systems.js) — the Seminole's, one half of its rocker for each engine (side 'L' | 'R'); PRIMER: one
  // stroke a click
  function rockerAct(key, kind, side = null) {
    // (the electric primer — VB-2266 7.15: its solenoid after the electric fuel pump — primes only with BATT MASTR and
    // the pump on; the wheel does nothing)
    if (key === 'primer') return (dir, wheel) => {
      if (wheel) return null;
      pressT.primer = 0.35;
      if (!switches.master) return info('バッテリー マスター（BATT MASTR）が OFF なので、プライマーが働きません');
      return switches.fuelPump ? { type: 'prime' } : info('燃料ポンプ（FUEL PUMP）が OFF なので、プライマーから燃料が送られません');
    };
    if (side) return (dir, wheel) => (wheel ? null : { type: 'select', id: 'start', value: switches.start === side ? false : side });
    if (kind === 3) {
      const [P, id] = POS3[key];
      return (dir, wheel) => { const i = P.indexOf(switches[id]), j = wheel ? clamp(i + (dir > 0 ? 1 : -1), 0, 2) : [2, 0, 1][i]; return j === i ? null : { type: 'select', id, value: P[j] }; };
    }
    return (dir, wheel) => { const on = wheel ? dir > 0 : !switches[key]; return on === !!switches[key] && wheel ? null : { type: 'switch', id: key, on }; };
  }
  const rockerLabel = (key, ja) => (key === 'strobe' ? () => `ストロボ灯（${switches.strobeSel}）` : key === 'fan' ? () => `ファン（FAN ${switches.fan}）`
    : key === 'ventFan' ? () => `換気ファン（VENT FAN ${switches.ventFan}）` : key === 'heater' ? () => `キャビン ヒーター（${switches.heater}）` : ja);
  // a rocker at frame m (its pivot behind the face's middle, the face +z): its print — OFF over the name on the upper and
  // lower halves; three positions: the top, the middle, the bottom; the Seminole's START ('h': turned a quarter, a half
  // each side): its two halves', upright on them —, each group a quad on its half's slope, just off it (white, backlit
  // at night; OFF one place in the atlas for all)
  const slope = Math.atan2(RK.d1 - RK.d0, RK.h / 2), printIt = new Map(), upright = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -Math.PI / 2));
  function rocker(m, key, kind, print) {
    const set = RKS[B.variant || 'pa28'], r = { m, key, kind, p0: set.print.length, p1: 0 }, three = print.length === 3;
    print.forEach((lines, k) => {
      if (!lines) return;
      const y = three ? [0.0095, 0, -0.0095][k] : k ? -0.0075 : 0.0075, w = lines[0] === 'OFF' && lines.length === 1 ? 9 : 12.5, h = (lines[0] === 'OFF' || lines[0] === 'ARM') && lines.length === 1 ? 3.2 : 3.6 * lines.length;
      const tag = lines.join('/');
      if (!printIt.has(tag)) printIt.set(tag, atlas.add(w, h, textDraw(lines)));
      const z = (y ? RK.d0 + (RK.d1 - RK.d0) * Math.abs(y) / (RK.h / 2) + 0.00025 : RK.d0 + 0.0004);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(y > 0 ? slope : y < 0 ? -slope : 0, 0, 0));
      if (kind === 'h') q.multiply(upright);
      set.print.push({ L: new THREE.Matrix4().compose(new THREE.Vector3(0, y, z), q, new THREE.Vector3(w / 1000, h / 1000, 1)), it: printIt.get(tag) });
    });
    r.p1 = set.print.length; set.list.push(r);
  }

  // ---- the overhead switch panel (the Archer's): the plate on the header's face, a bezel round each group of rockers (a
  // cell for each; the blank place plugged), the guard bars over START + PRIMER, the magnetos and EMERG BATT, the screws
  // (the corners, two in the middle with the NO SMOKING placard between them), the LIGHT DOME knobs with their lights on
  // the header at the ends
  B.variant = 'pa28';
  { const X = OVH.x, H = OVH.h, D = 0.004, [cw, ch] = OVH.cell;
    // a part built flat in the plate's frame (x along it, y up its face, z off it) laid onto it, every vertex through
    // ovhAt (a long edge as a sheet's rows: it follows the header's curve); soft: smoothed normals
    const onPlate = (g, soft = false) => {
      const q = g.index ? g.toNonIndexed() : g;
      for (const k of Object.keys(q.attributes)) if (k !== 'position') q.deleteAttribute(k);
      const p = q.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) { ovhAt(p.getX(i), p.getY(i), p.getZ(i), v); p.setXYZ(i, v.x, v.y, v.z); }
      if (soft) return smooth(q);
      q.computeVertexNormals(); return q;
    };
    const frame = (x, s, h) => { const m = ovhMatrix(x, s, h), e = new THREE.Euler().setFromRotationMatrix(m); return { p: new THREE.Vector3().setFromMatrixPosition(m).toArray(), r: [e.x, e.y, e.z], m }; };
    // the plate: its face, its edges back into the header
    add(onPlate(sheet((u, v, o) => o.set(-X + 2 * X * u, H * v, 0), 23, 1)), S.panel);
    add(onPlate(sheet((u, v, o) => o.set(-X + 2 * X * u, 0, -D * v), 23, 1, true)), S.panel);
    add(onPlate(sheet((u, v, o) => o.set(-X + 2 * X * u, H, -D * v), 23, 1)), S.panel);
    for (const sd of [-1, 1]) add(onPlate(sheet((u, v, o) => o.set(sd * X, H * u, -D * v), 2, 1, sd > 0)), S.panel);
    // the bezels (flat: a group is short enough to sit on the curve), their cells' dark backs, the guard bars
    for (const [i, j, guard] of OVH_BEZ) {
      const x0 = OVH_SW[i][0] - cw / 2 - 0.0035, x1 = OVH_SW[j][0] + cw / 2 + 0.0035, [s0, s1] = OVH.bezel, xm = (x0 + x1) / 2, sm = (s0 + s1) / 2;
      const holes = OVH_SW.slice(i, j + 1).map(([x]) => [rectPts(x - xm - cw / 2, OVH.row - sm - ch / 2, x - xm + cw / 2, OVH.row - sm + ch / 2), 0.0012]);
      add(slab(rectPts(x0 - xm, s0 - sm, x1 - xm, s1 - sm), 0.002, holes, 0.0037, 0.0022, 0, 1).applyMatrix4(ovhMatrix(xm, sm, 0)), S.bezel);
      if (guard) {
        const [bs, bh, br] = OVH.bar, a = x0 - 0.0035, b = x1 + 0.0035;
        add(onPlate(at(cylX(br, b - a + 0.003, 10), [(a + b) / 2, bs, bh]), true), S.black);
        for (const px of [a, b]) add(onPlate(at(new THREE.BoxGeometry(0.003, 0.0035, bh + 0.001), [px, bs, bh / 2 - 0.0005])), S.black);
      }
    }
    OVH_SW.forEach(([x, key, kind, print, ja]) => {
      add(onPlate(at(new THREE.PlaneGeometry(cw, ch), [x, OVH.row, 0.0003])), S.slot);
      if (!key) { add(onPlate(at(new THREE.BoxGeometry(RK.w, RK.h, 0.002), [x, OVH.row, 0.001])), S.caseBlack); return; }       // (a blank)
      rocker(ovhMatrix(x, OVH.row, RK.pivot), key, kind, print);
      const f = frame(x, OVH.row, 0.006);
      control({ id: key === 'primer' ? 'primer' : 'sw.' + key, label: rockerLabel(key, ja), kind: 'switch', size: [0.019, 0.032, 0.012], pos: f.p, rot: f.r,
        aim: ovhAt(x, OVH.row + 0.007, 0.012).toArray(), act: rockerAct(key, kind) });
    });
    for (const [x, s] of [[-X + 0.0055, 0.0055], [X - 0.0055, 0.0055], [X - 0.0055, H - 0.0055], [-X + 0.0055, H - 0.0055], [0, 0.0075], [0, H - 0.0075]]) {
      add(onPlate(at(new THREE.CircleGeometry(0.0021, 6), [x, s, 0.0003])), S.screw);
    }
    { const f = frame(0, OVH.row, 0); placard(['NO SMOKING'], 31, 8, f.p, { r: f.r }); }
    // the LIGHT DOME rheostats (the dome lights' brightness: the lights are on the headliner, DOME) on the header just
    // outboard of the plate
    for (const sd of [-1, 1]) {
      const x = sd * OVH.dome, hd = -OVH.lift;                                           // (hd: the header's face, about)
      add(onPlate(at(knurled(0.0062, 0.009, 16), [x, 0.031, hd + 0.0045]), true), S.knob);
      const lf = frame(sd * (OVH.dome + 0.0145), 0.031, hd + 0.0017);
      label(['LIGHT', 'DOME'], lf.p, { size: 1.3, r: lf.r, lit: 0, col: 0x2c2f33 });
      const kf = frame(x, 0.031, hd + 0.0045);
      control({ id: sd < 0 ? 'dome.left' : 'dome.right', label: '天井灯の明るさ（LIGHT DOME）', kind: 'knob', size: [0.017, 0.017, 0.014], pos: kf.p, rot: kf.r, aim: ovhAt(x, 0.031, hd + 0.0095).toArray(),
        act: () => info('天井灯（LIGHT DOME）の明るさ：この飛行では変えません（明るさは時刻に合わせてあります）') });
    }
  }
  // ---- the switch block under the audio panel (the Archer's): PITOT HEAT and FAN in a bezel of four cells
  { const { x: cx, y: cy, dx } = PBLK, n = PBLK.sw.length, [cw, ch] = OVH.cell, w = n * dx + 0.007, h = ch + 0.0085, xi = i => cx + (i - (n - 1) / 2) * dx;
    const holes = PBLK.sw.map((q, i) => [rectPts(xi(i) - cw / 2, cy - ch / 2, xi(i) + cw / 2, cy + ch / 2), 0.0012]);
    add(slab(rectPts(cx - w / 2, cy - h / 2, cx + w / 2, cy + h / 2), 0.002, holes, 0.004, PZ + 0.0026, 0, 1), S.bezel);
    PBLK.sw.forEach(([key, kind, print, ja], i) => {
      const x = xi(i);
      add(at(new THREE.PlaneGeometry(cw, ch), [x, cy, PZ + 0.0004]), S.slot);
      if (!key) { add(at(new THREE.BoxGeometry(RK.w, RK.h, 0.002), [x, cy, PZ + 0.0014]), S.caseBlack); return; }
      rocker(new THREE.Matrix4().makeTranslation(x, cy, PZ + RK.pivot), key, kind, print);
      control({ id: 'sw.' + key, label: rockerLabel(key, ja), kind: 'switch', size: [0.018, 0.032, 0.014], pos: [x, cy, PZ + 0.007], aim: [x, cy + 0.007, PZ + 0.014], act: rockerAct(key, kind) });
    });
  }
  B.variant = null;

  // (the Seminole's) a bezel of rockers on the panel at y: cells [x, key, kind, print, label]; guard: the bar along their
  // lower part
  const bank = (y, cells, { guard = false } = {}) => {
    const [cw, ch] = OVH.cell, z0 = PZ + 0.0026, x0 = cells[0][0] - cw / 2 - 0.0035, x1 = cells[cells.length - 1][0] + cw / 2 + 0.0035, h = ch + 0.0085;
    add(slab(rectPts(x0, y - h / 2, x1, y + h / 2), 0.002, cells.map(([x]) => [rectPts(x - cw / 2, y - ch / 2, x + cw / 2, y + ch / 2), 0.0012]), 0.004, z0, 0, 1), S.bezel);
    for (const [x, key, kind, print, ja] of cells) {
      add(at(new THREE.PlaneGeometry(cw, ch), [x, y, PZ + 0.0004]), S.slot);
      rocker(new THREE.Matrix4().makeTranslation(x, y, PZ + RK.pivot), key, kind, print);
      control({ id: 'sw.' + key, label: rockerLabel(key, ja), kind: 'switch', size: [0.018, 0.032, 0.014], pos: [x, y, PZ + 0.007], aim: [x, y + 0.007, PZ + 0.014], act: rockerAct(key, kind) });
    }
    if (guard) {
      const yb = y - 0.0095, zb = PZ + 0.0095, a0 = x0 - 0.002, a1 = x1 + 0.002;
      add(at(cylX(0.0022, a1 - a0, 10), [(a0 + a1) / 2, yb, zb]), S.black);
      for (const px of [a0, a1]) add(at(new THREE.BoxGeometry(0.003, 0.004, zb - PZ), [px, yb, (zb + PZ) / 2]), S.black);
    }
  };
  let bracketIt = null;                                      // (the DIMMING bracket's print: one place in the atlas for both types)
  // ---- the Seminole's switches on its panel (SEM; POH VB-2636 Fig 7-21, Piper's NXi photo): black rockers in bezels,
  // OFF over the name as the Archer's; a rounded guard bar along the lower part of each magneto pair and of EMERG BATT
  if (twinA) {
    B.variant = 'pa44';
    const [cw, ch] = OVH.cell, z0 = PZ + 0.0026;
    const { eng, bankL, bankR, pump } = SEM, [mL, mR, rL, rR] = eng.mags;
    // the ENGINE SWITCHES: the left engine's magnetos, the START rocker (a quarter turned: its left half the left
    // engine's starter, its right half the right's, each held while it cranks), the right engine's magnetos
    bank(eng.y, [[mL, 'magL', 2, [['OFF', 'LEFT', 'ENG'], ['MAG', 'LEFT']], '左エンジンの左マグネトー（L ENG MAG LEFT）'], [mR, 'magR', 2, [['OFF', 'LEFT', 'ENG'], ['MAG', 'RIGHT']], '左エンジンの右マグネトー（L ENG MAG RIGHT）']], { guard: true });
    bank(eng.y, [[rL, 'rMagL', 2, [['OFF', 'RIGHT', 'ENG'], ['MAG', 'LEFT']], '右エンジンの左マグネトー（R ENG MAG LEFT）'], [rR, 'rMagR', 2, [['OFF', 'RIGHT', 'ENG'], ['MAG', 'RIGHT']], '右エンジンの右マグネトー（R ENG MAG RIGHT）']], { guard: true });
    { const x = eng.start, y = eng.y + 0.006, w = ch + 0.007, h = cw + 0.0085;
      add(slab(rectPts(x - w / 2, y - h / 2, x + w / 2, y + h / 2), 0.002, [[rectPts(x - ch / 2, y - cw / 2, x + ch / 2, y + cw / 2), 0.0012]], 0.004, z0, 0, 1), S.bezel);
      add(at(new THREE.PlaneGeometry(ch, cw), [x, y, PZ + 0.0004]), S.slot);
      rocker(new THREE.Matrix4().makeRotationZ(Math.PI / 2).setPosition(x, y, PZ + RK.pivot), 'start', 'h', [['L ENG', 'START'], ['R ENG', 'START']]);
      for (const [side, sx, ja] of [['L', -1, '左'], ['R', 1, '右']]) {
        control({ id: 'sw.start' + side, label: `${ja}エンジンのスターター（${side} ENG START：押している間回る・かかったら離す）`, kind: 'switch', size: [0.0145, 0.018, 0.014], pos: [x + sx * 0.0075, y, PZ + 0.007],
          aim: [x + sx * 0.008, y + 0.002, PZ + 0.011], act: rockerAct('start', 'h', side) });
      }
    }
    // the LEFT SWITCH BANK (EMERG BATT in a bezel of its own, guarded) and the RIGHT one beside the throttles
    bank(bankL.y, [[bankL.x[0], 'master', 2, [['OFF'], ['BATT', 'MASTR']], 'バッテリー マスター（BATT MASTR）'], [bankL.x[1], 'altr', 2, [['OFF'], ['LEFT', 'ALTR']], '左オルタネーター（LEFT ALTR）'],
      [bankL.x[2], 'rAltr', 2, [['OFF'], ['RIGHT', 'ALTR']], '右オルタネーター（RIGHT ALTR）'], [bankL.x[3], 'avionics', 2, [['OFF'], ['AVION', 'MASTER']], 'アビオニクス マスター（AVION MASTER）']]);
    bank(bankL.y, [[bankL.emerg, 'emergBatt', 2, [['OFF'], ['ARM'], ['EMERG', 'BATT']], '非常用バッテリー（EMERG BATT：OFF / ARM）']], { guard: true });
    bank(bankR.y, [[bankR.x[0], 'pitot', 2, [['OFF'], ['PITOT', 'HEAT']], 'ピトー ヒート（PITOT HEAT）'], [bankR.x[1], 'nav', 2, [['OFF'], ['NAV', 'LIGHTS']], '航法灯（NAV LIGHTS）'],
      [bankR.x[2], 'recog', 2, [['OFF'], ['RECOG', 'LIGHTS']], '識別灯（RECOG LIGHTS：翼端の白い灯）'], [bankR.x[3], 'landing', 2, [['OFF'], ['LANDING', 'LIGHT']], '着陸灯（LANDING LIGHT：タキシー灯も）'],
      [bankR.x[4], 'strobe', 3, [['STROBE', 'LIGHTS'], ['OFF'], ['FIN', 'STROBE']], null]]);
    // the L / R FUEL PUMP rockers
    bank(pump.y, [[pump.x[0], 'fuelPump', 2, [['OFF', 'LEFT'], ['FUEL', 'PUMP']], '左の燃料ポンプ（LEFT FUEL PUMP）'], [pump.x[1], 'rFuelPump', 2, [['OFF', 'RIGHT'], ['FUEL', 'PUMP']], '右の燃料ポンプ（RIGHT FUEL PUMP）']]);
    // the DIMMING knobs (SWITCH, PANEL, AVIONICS) under their backlit bracket, as the Archer's
    { const { y, x: dx } = SEM.dim;
      bracketIt = decal(88, 6, bracketDraw, [(dx[0] + dx[2]) / 2, y + 0.0165, PZ + 0.0002], null, { ...GLOW, it: bracketIt });
      [['SWITCH', 'switch', 'スイッチと文字の照明'], ['PANEL', 'panel', 'パネルの照明'], ['AVIONICS', 'avionics', '画面の明るさ']].forEach(([name, id, ja], i) => {
        add(at(knurled(0.0085, 0.012, 28), [dx[i], y, PZ + 0.006]), S.knob);
        label(name, [dx[i], y + 0.0118, PZ + 0.0002], { size: 1.25, wmm: 12, ...GLOW });
        control({ id: 'dim.' + id, label: `${ja}の調光（DIMMING ${name}）`, kind: 'knob', cyl: [0.0105, 0.015], pos: [dx[i], y, PZ + 0.0075], aim: [dx[i], y, PZ + 0.012],
          act: () => info(`${ja}の調光：この飛行では変えません（明るさは時刻に合わせてあります）`) });
      });
    }
    // the ELEV TRIM push switch (the electric pitch trim on / off: the trim here is the wheel and the keys) over the G5's
    // right edge: a square button in its bezel, ELEV. TRIM over it, PUSH ON/OFF under it
    { const [x, y] = SEM.trim;
      add(at(rbox(0.0135, 0.0135, 0.004, 0.0015), [x, y, PZ + 0.002]), S.bezel);
      add(at(rbox(0.0095, 0.0095, 0.004, 0.0015), [x, y, PZ + 0.005]), S.key);
      label('ELEV. TRIM', [x, y + 0.0115, PZ + 0.0002], { size: 1.3, ...GLOW }); label('PUSH ON/OFF', [x, y - 0.0115, PZ + 0.0002], { size: 1.1, ...GLOW });
      control({ id: 'elevTrim', label: '電動トリムのスイッチ（ELEV TRIM：押して ON / OFF）', kind: 'button', size: [0.016, 0.016, 0.014], pos: [x, y, PZ + 0.006], aim: [x, y, PZ + 0.007],
        act: () => info('電動トリム（ELEV TRIM）のスイッチ：ふだんは ON。トリムは床のホイールか、キー（または左の操縦輪のスイッチ）で動かします') });
    }
    B.variant = null;
  }

  // ============================================================ right of the MFD (POH VB-2749 Fig 7-9 items 6-10, Piper's TX photo)
  // the ELT's remote switch: a small black plate, its toggle (ARM down, as it stays; ON up), the red lamp over it
  { const x = 0.345, y = 0.37, z = PZ + 0.003;
    add(at(new THREE.BoxGeometry(0.03, 0.046, 0.003), [x, y, PZ + 0.0015]), S.caseBlack);
    for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) screw(x + sx * 0.0115, y + sy * 0.0195, z + 0.0002);
    add(at(cylZ(0.0042, 0.0042, 0.003, 8), [x, y - 0.004, z + 0.0015]), S.chrome);
    add(at(cylZ(0.0014, 0.0022, 0.011, 6), [x, y - 0.0064, z + 0.008], [0.45, 0, 0]), S.chrome);
    add(at(cylZ(0.0026, 0.0026, 0.003, 8), [x, y + 0.012, z + 0.0015]), { c: 0x8c1812, r: 0.25 });
    label('ELT', [x, y + 0.0185, z + 0.0002], { size: 1.5 });
    label('ON', [x + 0.0095, y + 0.002, z + 0.0002], { size: 1.1 }); label('ARM', [x + 0.0095, y - 0.010, z + 0.0002], { size: 1.1 });
    control({ id: 'elt', label: 'ELT（非常用の位置発信機）のスイッチ', kind: 'switch', size: [0.032, 0.048, 0.02], pos: [x, y, PZ + 0.009], aim: [x, y - 0.006, z + 0.007],
      act: () => info('ELT のスイッチ：ふだんは ARM のまま。強い衝撃を受けると自分で発信します（ON は試験と非常のとき）') });
  }
  // the hour meters, BILLING over MAINTENANCE, at the far upper right (electro-mechanical counters ~38 × 23 mm, a screw
  // each side: the TX photo)
  // (the Seminole's third under them: HEATER — its combustion heater's hours, POH VB-2636 7.23)
  for (const [y, name, digits, v] of [[0.372, 'BILLING', '0 4 7 1 2'], [0.334, 'MAINTENANCE', '0 4 6 9 3'], [0.296, 'HEATER', '0 0 1 8 6', 'pa44']]) {
    if (v && !twinA) continue;
    B.variant = v || null;
    add(at(new THREE.BoxGeometry(0.038, 0.023, 0.004), [0.42, y, PZ + 0.002]), S.caseBlack);
    for (const sx of [-1, 1]) screw(0.42 + sx * 0.0245, y + 0.002);
    decal(28, 8, (g, w, h) => { g.font = `700 ${h * 0.7}px ${SANS}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(digits, w / 2, h * 0.55); }, [0.42, y + 0.001, PZ + 0.0042], null, { lit: 0, col: 0xf0f0f0 });
    label(name, [0.42, y - 0.0155, PZ + 0.0002], { size: 1.3 });
  }
  B.variant = null;
  // cabin heat and defrost (the Archer's: the Seminole has a combustion heater): two short sliders, chrome knobs, OFF at
  // the left end (where they rest: neither is modelled); one legend between them — OFF at the left, HEAT over DEF, ON at
  // the right (the TX photo)
  B.variant = 'pa28';
  label('OFF', [0.2815, 0.267, PZ + 0.0002], { size: 1.6 }); label('ON', [0.348, 0.267, PZ + 0.0002], { size: 1.6 });
  label(['HEAT', 'DEF'], [0.3045, 0.267, PZ + 0.0002], { size: 1.3, align: 'left', wmm: 9 });
  for (const [y, name, id, ja] of [[0.278, 'HEAT', 'cabinHeat', 'キャビン ヒート'], [0.256, 'DEFROST', 'defrost', 'デフロスター']]) {
    add(at(new THREE.BoxGeometry(0.048, 0.0035, 0.0015), [0.315, y, PZ + 0.0008]), S.slot);
    add(at(cylZ(0.0042, 0.0045, 0.009, 10), [0.2945, y, PZ + 0.0065]), S.chrome);
    control({ id, label: `${ja}（${name === 'HEAT' ? '暖房' : '窓の曇り取り'}）`, kind: 'lever', size: [0.054, 0.012, 0.018], pos: [0.315, y, PZ + 0.007], aim: [0.2945, y, PZ + 0.011],
      act: () => info(`${ja}：この飛行では使いません（OFF のまま）`) });
  }
  B.variant = null;
  // the Seminole's combustion heater and ventilation (POH VB-2636 7.23; Fig 7-33 items 7, 12, 13; the NXi photo): three
  // short horizontal levers — AIR INTAKE (CLOSED at the left, OPEN at the right), TEMP. (WARMER to the right), DEF. (OFF,
  // ON) —, chrome knobs at their left ends (where they rest: the heater is not modelled), their names left of them; right
  // of them the 3-position CABIN HEAT – OFF – FAN and VENT FAN rockers (sw.heater, sw.ventFan: the checklists' items, no
  // effect); the panel's own print, backlit (GLOW)
  if (twinA) {
    B.variant = 'pa44';
    const hx = 0.302, ys = [0.291, 0.272, 0.253];
    [['AIR INTAKE', 'heatAir', '吸気（AIR INTAKE）', ['CLOSED', 'OPEN'], 'ヒーターとファンに外の空気を入れる口。ヒーターを使うときに開けます。この飛行では閉じたまま（ヒーターは使いません）'],
      ['TEMP.', 'heatTemp', '温度（TEMP.）', [null, 'WARMER'], '右へ動かすほど暖かく。この飛行では使いません'],
      ['DEF.', 'heatDef', 'デフロスター（DEF.）', ['OFF', 'ON'], '暖かい空気を窓へ送って曇りを取ります。この飛行では使いません']].forEach(([name, id, ja, ends, why], i) => {
      const y = ys[i], kx = hx - 0.0205;
      add(at(new THREE.BoxGeometry(0.048, 0.0035, 0.0015), [hx, y, PZ + 0.0008]), S.slot);
      add(at(cylZ(0.0042, 0.0045, 0.009, 10), [kx, y, PZ + 0.0065]), S.chrome);
      label(name, [kx - 0.0145, y, PZ + 0.0002], { size: 1.5, align: 'right', wmm: 15, ...GLOW });
      ends.forEach((t, k) => { if (t) label(t, [hx + (k ? 0.02 : -0.02), y - 0.0058, PZ + 0.0002], { size: 1.0, ...GLOW }); });
      control({ id, label: `ヒーターの${ja}`, kind: 'lever', size: [0.054, 0.012, 0.018], pos: [hx, y, PZ + 0.007], aim: [kx, y, PZ + 0.011], act: () => info(`ヒーターの${ja}：${why}`) });
    });
    bank(0.274, [[0.369, 'heater', 3, [['CABIN', 'HEAT'], ['OFF'], ['FAN']], null], [0.388, 'ventFan', 3, [['HIGH'], ['OFF'], ['LOW']], null]]);
    label('VENT FAN', [0.388, 0.2955, PZ + 0.0002], { size: 1.1, ...GLOW });
    // the heater's shutdown placard over the levers, the oil coolers' winterization placard over that (the NXi photo;
    // white print straight on the panel, at a lower resolution: read only up close)
    label(['HEATER', 'SHUTDOWN OPERATION', 'LEAVE AIR INTAKE', 'OPEN FOR 15 SEC', 'AFTER SWITCHING OFF', 'GROUND OPERATION', 'SWITCH TO FAN', 'FOR 2 MIN BEFORE', 'SWITCHING OFF'],
      [0.272, 0.336, PZ + 0.0002], { size: 1.0, lit: 0, res: 0.6 });
    label(['OIL COOLER WINTERIZATION PLATES', 'TO BE REMOVED WHEN AMBIENT', 'TEMPERATURE EXCEEDS 50°F'], [0.293, 0.405, PZ + 0.0002], { size: 1.05, lit: 0, res: 0.6 });
    B.variant = null;
  }

  // ============================================================ the circuit breakers (lower right; POH VB-2749 Fig 7-8)
  // three rows of 14 at a 0.025 pitch, the lower two rows on a raised sub-panel, each row's names (and its buses) on a
  // strip under it; ALTR and BATT, bigger with hex collars, at the top row's right end; the bottom row's last four
  // places plugged. In the shell (an instanced mesh would be the same triangles and one more draw call); the strips'
  // print at a low resolution (about a millimetre high: not readable from the seat, as in the aircraft), backlit (GLOW)
  { const sx0 = CB.sub[0], sx1 = CB.sub[1], sy0 = CB.sub[2], sy1 = CB.sub[3], cbx = i => CB.x0 + i * CB.dx;
    add(at(new THREE.BoxGeometry(sx1 - sx0, sy1 - sy0, CB.subZ), [(sx0 + sx1) / 2, (sy0 + sy1) / 2, PZ + CB.subZ / 2]), S.panel);
    for (const [x, y] of [[sx0 + 0.0045, sy0 + 0.0045], [sx1 - 0.0045, sy0 + 0.0045], [sx1 - 0.0045, sy1 - 0.0045], [sx0 + 0.0045, sy1 - 0.0045]]) screw(x, y, PZ + CB.subZ + 0.0002);
    const big = (x, y, z) => { add(at(cylZ(0.0074, 0.0074, 0.004, 6), [x, y + 0.006, z + 0.0014], [0, 0, Math.PI / 6]), S.screw); add(at(button(0.0042, 0.0075, 8), [x, y + 0.006, z + 0.0034]), S.cbBody); };
    const small = (x, y, z) => { add(at(new THREE.CircleGeometry(0.0054, 6), [x, y, z]), S.screw); add(at(button(0.0033, 0.007, 6), [x, y, z]), S.cbBody); };
    CB_NAMES.forEach((row, j) => {
      const z = PZ + (j ? CB.subZ : 0) + 0.0006, y = CB.y[j];
      row.forEach((n, i) => {
        const x = cbx(i);
        if (j === 2 && i >= 10) add(at(new THREE.CircleGeometry(0.0052, 8), [x, y, z]), S.cbBody);                                  // (plugged)
        else if (j === 0 && i >= 12) big(x, y, z);                                                                                    // (ALTR, BATT)
        else if (j === 0 && i === 11 && twinA) { B.variant = 'pa28'; small(x, y, z); B.variant = 'pa44'; big(x, y, z); B.variant = null; }   // (the Seminole's LEFT ALTR)
        else small(x, y, z);
      });
      // (each type's names on its top two rows: the bottom row's strip is both types')
      const at0 = [(cbx(0) + cbx(13)) / 2, y - 0.0118, z - 0.0004];
      B.variant = j < 2 && twinA ? 'pa28' : null;
      decal(352, 5.2, (g, w, h) => cbStrip(g, w, h, row, CB_BUS[j]), at0, null, { res: 0.45, ...GLOW });
      if (j < 2 && twinA) { B.variant = 'pa44'; decal(352, 5.2, (g, w, h) => cbStrip(g, w, h, CB44_NAMES[j], CB44_BUS[j]), at0, null, { res: 0.45, ...GLOW }); }
      B.variant = null;
    });
    control({ id: 'cb', label: 'サーキット ブレーカー', kind: 'button', size: [sx1 - sx0 + 0.004, 0.13, 0.022], pos: [(sx0 + sx1) / 2, 0.107, PZ + 0.009], aim: [cbx(4), CB.y[1], PZ + CB.subZ + 0.005],
      act: () => info('サーキット ブレーカー：飛び出しているもの（切れた回路）がないか、目で確かめます') });
  }
  // a breaker's button: n sides and its front cap, h out from its foot (open there)
  function button(r, h, n) {
    const side = new THREE.CylinderGeometry(r, r * 1.08, h, n, 1, true).rotateX(Math.PI / 2).translate(0, 0, h / 2), cap = new THREE.CircleGeometry(r, n).translate(0, 0, h);
    return mergeGeometries([side.toNonIndexed(), cap.toNonIndexed()].map(g => { g.deleteAttribute('uv'); return g; }));
  }
  // a breaker row's strip: each name in two lines under its breaker, the bus brackets under them
  function cbStrip(g, w, h, names, buses) {
    const cw = w / 14;
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h * 0.26}px ${SANS}`;
    names.forEach((n, i) => {
      const sp = n.includes('|') ? n.indexOf('|') : n.indexOf(' '), l = sp < 0 ? [n] : [n.slice(0, sp), n.slice(sp + 1)];
      l.forEach((t, k) => g.fillText(t, cw * (i + 0.5), h * (l.length === 1 ? 0.2 : 0.12 + 0.26 * k), cw * 0.94));
    });
    g.lineWidth = Math.max(1, h * 0.05); g.font = `600 ${h * 0.2}px ${SANS}`;
    for (const [a, b, name] of buses) {
      const x0 = cw * (a + 0.1), x1 = cw * (b + 0.9), yl = h * 0.68;
      g.beginPath(); g.moveTo(x0, yl - h * 0.1); g.lineTo(x0, yl); g.lineTo(x1, yl); g.lineTo(x1, yl - h * 0.1); g.stroke();
      g.fillText(name, (x0 + x1) / 2, h * 0.87, x1 - x0);
    }
  }

  // ============================================================ the lower panel: the dimmers, the alternate static source, the jacks
  // the Archer's dimmers: SWITCH, PANEL and AVIONICS under one backlit bracket, under the PFD's right part (POH VB-2749 7.23: the
  // switches' and placards' backlight, the LED strip under the glareshield, the displays) — info controls (the lights
  // here follow the time of day)
  B.variant = 'pa28';
  { const y = DIM.y;
    bracketIt = decal(88, 6, bracketDraw, [(DIM.x[0] + DIM.x[2]) / 2, y + 0.0165, PZ + 0.0002], null, { ...GLOW, it: bracketIt });
    [['SWITCH', 'switch', 'スイッチと文字の照明'], ['PANEL', 'panel', 'パネルの照明'], ['AVIONICS', 'avionics', '画面の明るさ']].forEach(([name, id, ja], i) => {
      const x = DIM.x[i];
      add(at(knurled(0.0085, 0.012, 28), [x, y, PZ + 0.006]), S.knob);
      label(name, [x, y + 0.0118, PZ + 0.0002], { size: 1.25, wmm: 12, ...GLOW });
      control({ id: 'dim.' + id, label: `${ja}の調光（DIMMING ${name}）`, kind: 'knob', cyl: [0.0105, 0.015], pos: [x, y, PZ + 0.0075], aim: [x, y, PZ + 0.012],
        act: () => info(`${ja}の調光：この飛行では変えません（明るさは時刻に合わせてあります）`) });
    });
  }
  B.variant = null;
  // the alternate static source: its pull knob at the panel's lower left, the placard over it (VB-2749 Fig 7-9; pulled,
  // the instruments' static line opens to the cabin) — an info control
  { const [x, y] = ALT_STATIC;
    placard([], 78, 6.5, [x, y + 0.0185, PZ], { draw: altStaticDraw });
    add(at(cylZ(0.0032, 0.0032, 0.012, 8), [x, y, PZ + 0.006]), S.steel);
    add(at(cylZ(0.0075, 0.0072, 0.007, 14), [x, y, PZ + 0.0135]), S.black);
    control({ id: 'altStatic', label: '代替静圧源（ふだんは押し込んで閉じておく）', kind: 'knob', size: [0.022, 0.022, 0.024], pos: [x, y, PZ + 0.012], aim: [x, y, PZ + 0.017],
      act: () => info('代替静圧源：静圧孔が詰まったときに引いて開けます。ふだんは押し込んで閉じておきます（この飛行では使いません）') });
  }
  // the headset jacks (PHONE over MIC) and a USB port at both lower corners: the pilot's, the instructor's
  for (const sx of [-1, 1]) {
    const x = sx * 0.522;
    add(at(new THREE.BoxGeometry(0.02, 0.05, 0.002), [x, 0.062, PZ + 0.001]), S.caseBlack);
    for (const [y, t] of [[0.077, 'PHONE'], [0.059, 'MIC']]) { add(at(new THREE.RingGeometry(0.0022, 0.0045, 8), [x, y, PZ + 0.0022]), S.chrome); label(t, [x, y - 0.0068, PZ + 0.0022], { size: 0.9, res: 0.6 }); }
    add(at(new THREE.PlaneGeometry(0.009, 0.0045), [x, 0.0425, PZ + 0.0022]), S.slot);
  }
  // the LIMITATIONS placard on the left wall's sill band, just aft of the panel, facing in (Piper's TX photos; seen nearly
  // edge-on from the seat: its print at a lower resolution) — each type's own: the Archer's; the Seminole's (Piper's NXi
  // panel photo — POH VB-2636 2.33 carries it as a picture —: the normal category, no acrobatics or spins, VFR / IFR
  // day and night non-icing, the one-engine-inoperative air minimum control speed and its stalls; its right-hand column
  // as the Archer's)
  B.variant = 'pa28';
  { const L = WALLS.limits; placard([], L.w * 1000, L.h * 1000, [-lowX(L.y) + 0.0015, L.y, L.z], { r: [0, Math.PI / 2, 0], res: 0.46, draw: limitsDraw }); }
  if (twinA) { B.variant = 'pa44'; const L = WALLS.limits; placard([], L.w * 1000, L.h * 1000, [-lowX(L.y) + 0.0015, L.y, L.z], { r: [0, Math.PI / 2, 0], res: 0.46, draw: limits44Draw }); }
  B.variant = null;
  // (the Seminole's) the pilot's window is the emergency exit (POH VB-2636 7.3, 2.33; the NXi interior photo): its release
  // handle under a moulded cover on the post between the first and second left windows — the cover on the post's
  // forward part beside the front window's surround, a finger slot down its middle —, the red placard at the post's top
  // aft of it (EMERGENCY EXIT / REMOVE COVER PANEL / PULL HANDLE FORWARD / PUSH WINDOW OUT); flat on the window band's
  // leaning plane (made in Blender with it: the post between the surrounds is flat there)
  if (twinA) {
    B.variant = 'pa44';
    const E = WALLS.exit, nIn = new THREE.Vector3(1, KX, 0).normalize(), ey = new THREE.Vector3(-KX, 1, 0).normalize(), ex = new THREE.Vector3(0, 0, -1);
    const onBand = (y, z, h) => [-bandX(y) + nIn.x * h, y + nIn.y * h, z];
    const m = new THREE.Matrix4().makeBasis(ex, ey, nIn), rot = new THREE.Euler().setFromRotationMatrix(m).toArray().slice(0, 3);
    { const [z0, z1] = E.cover.z, [y0, y1] = E.cover.y, t = E.cover.t, yc = (y0 + y1) / 2, zc = (z0 + z1) / 2;
      const place = (g, y, z, h) => { const p = onBand(y, z, h); return g.applyMatrix4(new THREE.Matrix4().copy(m).setPosition(p[0], p[1], p[2])); };
      add(place(rbox(z1 - z0, y1 - y0, t, 0.006, 2), yc, zc, t / 2 - 0.001), S.wall);
      add(place(rbox(0.0045, 0.05, 0.002, 0.002), yc + 0.01, zc, t - 0.0006), S.slot);
    }
    placard(['EMERGENCY EXIT', 'REMOVE COVER PANEL', 'PULL HANDLE FORWARD', 'PUSH WINDOW OUT'], E.placard.w * 1000, E.placard.h * 1000, onBand(E.placard.y, E.placard.z, 0.0012),
      { r: rot, bg: 0xb3231c, fg: 0xf4f2ee, res: 0.6 });
    B.variant = null;
  }
  function bracketDraw(g, w, h) {
    const y = h * 0.6, tw = w * 0.34;
    g.lineWidth = Math.max(1, h * 0.09);
    g.beginPath(); g.moveTo(w * 0.03, h * 0.97); g.lineTo(w * 0.03, y); g.lineTo(w / 2 - tw / 2, y); g.moveTo(w / 2 + tw / 2, y); g.lineTo(w * 0.97, y); g.lineTo(w * 0.97, h * 0.97); g.stroke();
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h * 0.55}px ${SANS}`; g.fillText('DIMMING', w / 2, y, tw * 0.94);
  }
  function altStaticDraw(g, w, h) {
    g.lineWidth = Math.max(1, h * 0.06); g.strokeRect(g.lineWidth, g.lineWidth, w - 2 * g.lineWidth, h - 2 * g.lineWidth);
    g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h * 0.5}px ${SANS}`;
    g.fillText('ALTERNATE STATIC SOURCE - PULL AFT TO OPEN', w / 2, h * 0.53, w * 0.8);
    for (const x of [w * 0.05, w * 0.95]) { g.beginPath(); g.moveTo(x - h * 0.22, h * 0.28); g.lineTo(x + h * 0.22, h * 0.28); g.lineTo(x, h * 0.78); g.closePath(); g.fill(); }
  }
  // a LIMITATIONS placard: its frame, the title, the lines (from y0 down by dy, the font fs: of its height), the right-hand
  // column (operating information in the handbook; WARNING: the strobes in cloud)
  function limitsDrawOf(lines, y0, dy, fs) {
    return (g, w, h) => {
      const m = h * 0.05, tw = w * 0.77, cx = m + tw / 2, rx0 = tw + m * 2, rcx = (rx0 + w - m * 2) / 2, rw = w - rx0 - m * 3;
      g.lineWidth = Math.max(1, h * 0.012); g.strokeRect(m, m, w - 2 * m, h - 2 * m); g.strokeRect(rx0, m * 2, w - rx0 - m * 2, h - m * 4);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = `700 ${h * 0.085}px ${SANS}`; g.fillText('LIMITATIONS', cx, h * 0.12);
      g.font = `600 ${h * fs}px ${SANS}`;
      lines.forEach((l, i) => g.fillText(l, cx, h * (y0 + i * dy), tw * 0.95));
      g.font = `700 ${h * 0.1}px ${SANS}`; g.fillText('WARNING', rcx, h * 0.45);
      g.font = `600 ${h * 0.05}px ${SANS}`;
      ['OPERATING', 'INFORMATION', 'IN THE PILOT\'S', 'HANDBOOK'].forEach((l, i) => g.fillText(l, rcx, h * (0.16 + i * 0.065), rw));
      ['TURN OFF STROBE', 'LIGHTS WHEN IN', 'CLOUD, FOG OR', 'HAZE'].forEach((l, i) => g.fillText(l, rcx, h * (0.6 + i * 0.075), rw));
    };
  }
  function limitsDraw(g, w, h) {
    limitsDrawOf(['THIS AIRPLANE MUST BE OPERATED AS A NORMAL OR UTILITY CATEGORY AIRPLANE IN COMPLIANCE WITH THE', 'OPERATING LIMITATIONS STATED IN THE FORM OF PLACARDS, MARKINGS AND MANUALS.',
    'ALL MARKINGS AND PLACARDS ON THIS AIRPLANE APPLY TO ITS OPERATION AS A NORMAL CATEGORY AIRPLANE.', 'NO ACROBATIC MANEUVERS ARE APPROVED FOR NORMAL CATEGORY OPERATIONS.',
    'SPINS ARE PROHIBITED FOR NORMAL AND UTILITY CATEGORY.', 'UTILITY CATEGORY OPERATION ONLY', '(1) NO AFT PASSENGERS ALLOWED.',
    '(2) ACROBATIC MANEUVERS ARE LIMITED TO THE FOLLOWING:            ENTRY SPEED', 'STEEP TURNS 113 KIAS     LAZY EIGHTS 113 KIAS     CHANDELLES 113 KIAS'], 0.23, 0.083, 0.056)(g, w, h);
  }
  function limits44Draw(g, w, h) {
    limitsDrawOf(['THE MARKINGS & PLACARDS INSTALLED IN THIS AIRPLANE CONTAIN OPERATING', 'LIMITATIONS WHICH MUST BE COMPLIED WITH WHEN OPERATING THIS',
    'AIRPLANE IN THE NORMAL CATEGORY. OTHER OPERATING LIMITATIONS WHICH', 'MUST BE COMPLIED WITH WHEN OPERATING THIS AIRPLANE IN THIS',
    'CATEGORY ARE CONTAINED IN THE AIRPLANE FLIGHT MANUAL. NO', 'ACROBATIC MANEUVERS, INCLUDING SPINS, APPROVED. THIS AIRCRAFT',
    'APPROVED FOR VFR, IFR, DAY AND NIGHT NON-ICING FLIGHT WHEN', 'EQUIPPED IN ACCORDANCE WITH FAR 91 OR FAR 135.',
    'ONE ENGINE INOPERATIVE AIR MINIMUM CONTROL SPEED 56 KIAS.', 'ONE ENGINE INOPERATIVE STALLS NOT RECOMMENDED. CAN CAUSE',
    '300 FT. LOSS OF ALTITUDE AND 30° PITCH ANGLE.'], 0.205, 0.068, 0.05)(g, w, h);
  }
  function placardDraw(lines) {
    return (g, w, h) => {
      g.lineWidth = Math.max(1, h * 0.03); g.strokeRect(g.lineWidth * 1.5, g.lineWidth * 1.5, w - g.lineWidth * 3, h - g.lineWidth * 3);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const lh = (h * 0.86) / lines.length; g.font = `700 ${lh * 0.72}px ${SANS}`;
      lines.forEach((l, i) => g.fillText(l, w / 2, h * 0.07 + lh * (i + 0.5), w * 0.94));
    };
  }

  // ============================================================ the throttle quadrant, the carb heat, the pedestal, the hand brake
  // the Archer's quadrant (POH VB-2749 Fig 7-9, Piper's TX photo): a black face with two slots, each named up its left
  // side (OPEN / CLOSE, RICH / LEAN at its ends) — THROTTLE (a black cylinder ~Ø29 × 62 mm lying across its lever's end;
  // no TO/GA button on it: the game has no autopilot) and MIXTURE (a red star knob ~Ø32) — and the friction lever out of
  // its right side
  B.variant = 'pa28';
  { const qz = PZ + 0.035, qy0 = QUAD.y0, qy1 = QUAD.y1, fx = QUAD.x + QUAD.w / 2;
    add(at(rbox(QUAD.w, qy1 - qy0, 0.05, 0.008, 2), [QUAD.x, (qy0 + qy1) / 2, qz - 0.025]), S.panel);
    for (const [x, name, sub] of [[-0.005, 'THROTTLE', ['OPEN', 'CLOSE']], [0.045, 'MIXTURE', ['RICH', 'LEAN']]]) {
      add(at(rbox(0.009, 0.16, 0.004, 0.003), [x, -0.017, qz + 0.0005]), S.slot);
      label(name, [x - 0.0105, 0.022, qz + 0.0021], { size: 2.6, r: [0, 0, Math.PI / 2] });
      label(sub[0], [x + 0.013, 0.045, qz + 0.0021], { size: 1.25 }); label(sub[1], [x + 0.013, -0.085, qz + 0.0021], { size: 1.25 });
    }
    add(at(new THREE.BoxGeometry(0.016, 0.005, 0.006), [fx + 0.007, -0.043, qz - 0.012], [0, 0, 0.35]), S.steel);
    add(at(sphere(0.0048, 10, 6), [fx + 0.015, -0.040, qz - 0.012]), S.knob);
    label('FRICTION', [fx - 0.011, -0.045, qz + 0.0021], { size: 1.05, wmm: 7.5 });
    // the levers: an arm from a pivot behind the face, a knob at its end (built at 0°: pointing aft)
    const lever = (x, part, knob, s, kx = x) => {
      add(at(new THREE.BoxGeometry(0.006, 0.006, LEVER.len), [x, LEVER.y, LEVER.z + LEVER.len / 2]), S.steel, part);
      add(at(knob, [kx, LEVER.y, LEVER.z + LEVER.len + 0.012]), s, part);
    };
    lever(-0.005, 'throttle', cylX(0.0145, 0.062, 28), S.black, -0.012);
    lever(0.045, 'mixture', star(0.016, 0.014, 8), S.red);
    const lp = (x, a) => [x, LEVER.y + Math.sin(a) * (LEVER.len + 0.012), LEVER.z + Math.cos(a) * (LEVER.len + 0.012)];
    control({ id: 'throttle', label: 'スロットル（R / F）', kind: 'lever', part: 'throttle', size: [0.066, 0.034, 0.034], pos: lp(-0.012, 0), aim: lp(-0.005, 0), act: (dir) => flight('thrStep', dir >= 0 ? 1 : -1) });
    // the mixture: a click, full rich or (on the ground only) idle cut-off; the wheel, a tenth at a time
    control({ id: 'mixture', label: () => `ミクスチャー（${switches.mixture >= 0.95 ? 'リッチ' : switches.mixture < 0.15 ? 'アイドル カットオフ' : 'リーン'}）`, kind: 'lever', part: 'mixture', size: [0.036, 0.036, 0.032], pos: lp(0.045, 0),
      act: (dir, wheel) => {
        if (wheel) { const v = clamp(Math.round((switches.mixture + (dir > 0 ? 0.1 : -0.1)) * 10) / 10, 0, 1); return v === switches.mixture ? null : { type: 'select', id: 'mixture', value: v }; }
        if (switches.mixture < 0.95) return { type: 'select', id: 'mixture', value: 1 };
        return cur.s && !cur.s.onGround ? info('飛んでいる間は、ミクスチャーはリッチのままにします') : { type: 'select', id: 'mixture', value: 0 };
      } });
    // carb heat (VB-2749 Supplement 6): its own slot right of the quadrant, a small lever with a round light-grey knob, OFF
    // up and ON down (update() turns it by ∓CARB.ang about its pivot behind the panel), the backlit column OFF / CARB HEAT
    // / ON right of the slot (the TX photo's ALT AIR slot: CLOSE / ALT AIR / OPEN)
    add(at(new THREE.BoxGeometry(0.008, 0.077, 0.0015), [CARB.x, CARB.y, PZ + 0.0008]), S.slot);
    add(at(new THREE.BoxGeometry(0.004, 0.004, 0.03), [CARB.x, CARB.y, CARB.z + CARB.len - 0.02]), S.steel, 'carb');
    add(at(cylZ(0.0065, 0.0068, 0.009, 22), [CARB.x, CARB.y, CARB.z + CARB.len]), S.white, 'carb');
    label('OFF', [CARB.x + 0.0135, CARB.y + 0.031, PZ + 0.0002], { size: 2.1, ...GLOW });
    label(['CARB', 'HEAT'], [CARB.x + 0.0135, CARB.y, PZ + 0.0002], { size: 1.9, ...GLOW });
    label('ON', [CARB.x + 0.0135, CARB.y - 0.031, PZ + 0.0002], { size: 2.1, ...GLOW });
    control({ id: 'carbHeat', label: () => `キャブレター ヒート（${switches.carbHeat ? 'ON' : 'OFF'}）`, kind: 'lever', part: 'carb', size: [0.02, 0.02, 0.02], pos: [CARB.x, CARB.y, CARB.z + CARB.len], aim: [CARB.x, CARB.y, CARB.z + CARB.len + 0.004],
      act: (dir, wheel) => { const on = wheel ? dir > 0 : !switches.carbHeat; return on === switches.carbHeat ? null : { type: 'switch', id: 'carbHeat', on }; } });
  }
  // the pedestal (both types'; the Seminole's carries its cowl flap levers): a black plate from the quadrant's foot
  // curving down to the floor between the pedals, its edges (5 mm) seen, its screws along them; the Archer's rudder trim
  // on its right just under the quadrant (the LX Steel photo) — a knurled wheel through a slot in the plate, its
  // indicator over it (an info control: the rudder trim is the keys' Z / X)
  B.variant = null;
  { const hw = PED.w / 2, pr = PED.prof, n = pr.length - 1, T = 0.005, N = PED.n;
    const prof = (v, inset) => { const j = Math.round(v * n); return [pr[j][0] - N[j][0] * inset, pr[j][1] - N[j][1] * inset]; };
    add(sheet((u, v, o) => { const [z, y] = prof(v, 0); o.set(PED.x - hw + PED.w * u, y, z); }, 1, n, true), S.panel);
    for (const sd of [-1, 1]) {
      add(sheet((u, v, o) => { const [z, y] = prof(v, T * u); o.set(PED.x + sd * hw, y, z); }, 1, n, sd > 0), S.panel);
      for (const j of [1, 5, 9]) { const [z, y] = pr[j]; screw(PED.x + sd * (hw - 0.007), y + N[j][1] * 0.0004, z + N[j][0] * 0.0004); }
    }
    B.variant = 'pa28';
    // (on the plate, turned to its slope at profile point j: off its face by d)
    const onPlate = (g, j, x, d) => at(g, [x, pr[j][1] + N[j][1] * d, pr[j][0] + N[j][0] * d], [Math.atan2(-N[j][1], N[j][0]), 0, 0]);
    const wx = PED.x + hw - 0.016, kj = 3;
    add(at(knurled(0.019, 0.012, 32).rotateY(Math.PI / 2), [wx, pr[kj][1] - N[kj][1] * 0.008, pr[kj][0] - N[kj][0] * 0.008]), S.knob);
    add(onPlate(new THREE.PlaneGeometry(0.018, 0.046), kj, wx, 0.0005), S.slot);
    add(onPlate(new THREE.BoxGeometry(0.014, 0.026, 0.008), 1, wx, 0.004), S.caseBlack);
    add(onPlate(new THREE.PlaneGeometry(0.009, 0.0016), 1, wx, 0.0082), S.white);
    decal(14, 5, textDraw(['L   R']), [wx, pr[1][1] + 0.0185, pr[1][0] + N[1][0] * 0.0006], [Math.atan2(-N[1][1], N[1][0]), 0, 0]);
    control({ id: 'rudderTrim', label: 'ラダー トリム（Z / X で動かします）', kind: 'knob', size: [0.022, 0.044, 0.044], pos: [wx, pr[kj][1] - N[kj][1] * 0.008, pr[kj][0] - N[kj][0] * 0.008],
      aim: [wx, pr[kj][1] + N[kj][1] * 0.009, pr[kj][0] + N[kj][0] * 0.009], act: () => info('ラダー トリム：キーボードの Z / X で動かします（右へ回すと機首が右へ）') });
  }
  // the hand brake: a pistol grip hanging from its pivot under the panel's lower edge, left of the pedestal (the TX
  // photo; POH VB-2266 7.9): pulled aft to set (it swings back), its round PARK BRAKE PUSH button on its left side
  { const { x, y, z } = BRAKE;
    add(at(new THREE.BoxGeometry(0.026, 0.012, 0.024), [x, y - 0.002, PZ + 0.004]), S.black);
    add(at(new THREE.BoxGeometry(0.012, 0.05, 0.007), [x, y - 0.025, z]), S.black, 'brake');
    const grip = [rbox(0.022, 0.078, 0.028, 0.008, 1)];
    for (let i = 0; i < 4; i++) grip.push(at(new THREE.BoxGeometry(0.02, 0.003, 0.0295), [0, -0.024 + i * 0.016, 0]));
    add(at(mergeGeometries(grip.map(g => { const q = g.index ? g.toNonIndexed() : g; q.deleteAttribute('uv'); return q; })), [x, y - 0.088, z + 0.006], [0.15, 0, 0]), GRIPBLK, 'brake');
    add(at(cylX(0.0062, 0.004, 14), [x - 0.0125, y - 0.058, z + 0.004]), { c: 0xc4c7cb, r: 0.4 }, 'brake');
    label('PARK BRAKE', [x, PBOT + 0.007, PZ + 0.0002], { size: 1.4, wmm: 22 });
    control({ id: 'parkBrake', label: 'パーキングブレーキ', kind: 'lever', part: 'brake', size: [0.036, 0.1, 0.04], pos: [x, y - 0.075, z + 0.006], aim: [x, y - 0.095, z + 0.02], act: () => flight('parkBrake') });
  }
  function star(r, h, n) {                                    // a star knob of n points along z (every other rim vertex in)
    const g = new THREE.CylinderGeometry(r, r, h, 2 * n, 1, false), p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), pz = p.getZ(i);
      if (Math.hypot(px, pz) < r * 0.5) continue;
      if (((Math.round(Math.atan2(pz, px) / (Math.PI / n)) % 2) + 2) % 2) { p.setX(i, px * 0.7); p.setZ(i, pz * 0.7); }
    }
    g.computeVertexNormals();
    return g.rotateX(Math.PI / 2);
  }
  B.variant = null;
  // (M6, round R3) the Seminole's quadrant (POH VB-2636 Fig 7-1, Piper's NXi photo): six levers, each pair the left
  // engine's then the right's — the THROTTLES (black, big round knobs), the PROPELLERS (blue, square ribbed, aft through
  // the feather detent), the MIXTURES (red, fluted; aft to idle cut-off) —, the FRICTION lever out of its right side, the
  // ALTERNATE AIR pair on its lower face; the COWL FLAP pair on the pedestal under it; the gear selector left of it
  // (GEAR) with the red emergency gear knob (SEM.emerg); the PARK BRAKE PULL knob (SEM.brake). The throttles and the
  // propellers move in pairs (FLIGHT LAB has one throttle; the propellers' one control cycles both in the run-up); each
  // mixture is its engine's own (the start needs it: aircraft/systems.js)
  // (fix of round R3: the levers' own frame, LEVER44 — the Archer's pivot 7 cm higher, so the knobs sit as the photo's
  // do, up between the yokes' hubs level with the switch banks' foot at full and well clear of the alternate air at idle
  // cut-off; the knobs and their pitch nearer the photo's: the throttles ~25 mm across, the pairs 22 mm apart)
  const TWIN_LV = { thrL: -0.052, thrR: -0.030, propL: -0.001, propR: 0.021, mixL: 0.051, mixR: 0.073 };
  // its face (x0 … x1, y0 … y1: down over the pedestal's top, where the alternate air sits); the alternate air levers
  // (their x, the pivot's y on the face, the arm aft to the mushroom knob, UP = CLOSE, DOWN = OPEN); the cowl flap levers
  // (Fig 7-3: big tapered knobs hanging from stalks out of the pedestal, a lock tab on each; PUSH – OPEN, PULL – CLOSE,
  // three notches): their x, the stalks' pivot [y, z] behind the plate, the knob's middle [y, z], each notch's turn
  const TWIN_Q = { x0: -0.066, x1: 0.09, y0: -0.13, y1: 0.065 + LEVER44.dy, alt: { x: [-0.013, 0.037], y: -0.112, len: 0.03, close: -20 * DEG, open: 20 * DEG },
    cowl: { x: [-0.025, 0.045], pivot: [-0.13, -1.11], knob: [-0.195, -1.04], ang: { OPEN: 8 * DEG, INT: 0, CLOSED: -8 * DEG } } };
  const COWL_POS = ['CLOSED', 'INT', 'OPEN'];                                         // (aft to forward)
  // the gear selector (VB-2636 7.11: two positions, its wheel-shaped knob pulled out to move it), immediately left of the
  // quadrant under the PFD: its pivot in the panel, the lever to the knob, DOWN / UP turns (just left of, and over, where
  // the left yoke's right horn and its bar hide the panel from the seat)
  const GEAR = { x: -0.13, y: 0.095, len: 0.03, down: 30 * DEG, up: -30 * DEG };
  if (twinA) {
    B.variant = 'pa44';
    const { x0, x1, y0, y1, alt, cowl } = TWIN_Q, qz = PZ + 0.035, qx = (x0 + x1) / 2;
    add(at(rbox(x1 - x0, y1 - y0, 0.05, 0.01, 2), [qx, (y0 + y1) / 2, qz - 0.025]), S.panel);
    const LV = LEVER44, dy = LV.dy;
    for (const x of Object.values(TWIN_LV)) add(at(rbox(0.008, 0.148, 0.004, 0.003), [x, -0.018 + dy, qz + 0.0005]), S.slot);
    // each pair's name up between its slots (the photo's), FEATHER at the propellers' aft end
    for (const [x, name] of [[-0.041, 'THROTTLE'], [0.010, 'PROP. RPM'], [0.062, 'MIXTURE']]) label(name, [x, 0.014 + dy, qz + 0.0021], { size: 1.7, r: [0, 0, Math.PI / 2] });
    label('FEATHER', [0.010, -0.077 + dy, qz + 0.0021], { size: 1.2, r: [0, 0, Math.PI / 2] });
    const lever = (x, part, knob, sf, kx = x) => {
      add(at(new THREE.BoxGeometry(0.005, 0.005, LV.len), [x, LV.y, LV.z + LV.len / 2]), S.steel, part);
      add(at(knob, [kx, LV.y, LV.z + LV.len + 0.011]), sf, part);
    };
    lever(TWIN_LV.thrL, 'thrL', cylX(0.0125, 0.02, 26), S.black); lever(TWIN_LV.thrR, 'thrR', cylX(0.0125, 0.02, 26), S.black);
    lever(TWIN_LV.propL, 'propL', ribbed(0.018, 0.021, 0.024), S.blue); lever(TWIN_LV.propR, 'propR', ribbed(0.018, 0.021, 0.024), S.blue);
    lever(TWIN_LV.mixL, 'mixL', star(0.0105, 0.017, 7), S.red); lever(TWIN_LV.mixR, 'mixR', star(0.0105, 0.017, 7), S.red);
    const lp = (x, a) => [x, LV.y + Math.sin(a) * (LV.len + 0.012), LV.z + Math.cos(a) * (LV.len + 0.012)];
    const mid = (a, b) => (a + b) / 2, rich = v => (v >= 0.95 ? 'リッチ' : v < 0.15 ? 'アイドル カットオフ' : 'リーン');
    control({ id: 'throttle', label: 'スロットル 左右（R / F）', kind: 'lever', part: 'thrL', size: [0.046, 0.03, 0.04], pos: lp(mid(TWIN_LV.thrL, TWIN_LV.thrR), 0), act: (dir) => flight('thrStep', dir >= 0 ? 1 : -1) });
    control({ id: 'prop', label: () => `プロペラ 左右（${switches.propCycleT > 0 ? 'サイクル中' : '高回転'}）`, kind: 'lever', part: 'propL', size: [0.042, 0.03, 0.036], pos: lp(mid(TWIN_LV.propL, TWIN_LV.propR), 0),
      act: () => {
        if (!cur.s || !cur.s.onGround) return info('プロペラのレバーは、前（高回転）のままにします');
        if (!(cur.s.eng || []).every(e => !e.cut)) return info('プロペラのサイクルは、両方のエンジンが回っているときに（ランナップで）');
        return switches.propCycleT > 0 ? null : { type: 'select', id: 'propCycleT', value: 2.6 };
      } });
    // each mixture: a click, full rich or (on the ground only) idle cut-off; the wheel, a tenth at a time
    const mixAct = id => (dir, wheel) => {
      const v0 = switches[id];
      if (wheel) { const v = clamp(Math.round((v0 + (dir > 0 ? 0.1 : -0.1)) * 10) / 10, 0, 1); return v === v0 ? null : { type: 'select', id, value: v }; }
      if (v0 < 0.95) return { type: 'select', id, value: 1 };
      return cur.s && !cur.s.onGround ? info('飛んでいる間は、ミクスチャーはリッチのままにします') : { type: 'select', id, value: 0 };
    };
    control({ id: 'mixture', label: () => `左エンジンのミクスチャー（${rich(switches.mixture)}）`, kind: 'lever', part: 'mixL', size: [0.02, 0.03, 0.036], pos: lp(TWIN_LV.mixL, 0), act: mixAct('mixture') });
    control({ id: 'mixtureR', label: () => `右エンジンのミクスチャー（${rich(switches.mixtureR)}）`, kind: 'lever', part: 'mixR', size: [0.02, 0.03, 0.036], pos: lp(TWIN_LV.mixR, 0), act: mixAct('mixtureR') });
    // the friction lever out of the quadrant's right side (an info control)
    add(at(new THREE.BoxGeometry(0.016, 0.005, 0.006), [x1 + 0.007, -0.043 + dy, qz - 0.012], [0, 0, 0.35]), S.steel);
    add(at(sphere(0.0048, 10, 6), [x1 + 0.015, -0.040 + dy, qz - 0.012]), S.knob);
    label('FRICTION', [x1 - 0.008, -0.046 + dy, qz + 0.0021], { size: 1.05, wmm: 7.5 });
    control({ id: 'friction', label: 'スロットル レバーの摩擦（FRICTION）', kind: 'lever', size: [0.016, 0.014, 0.016], pos: [x1 + 0.013, -0.041 + dy, qz - 0.012], aim: [x1 + 0.015, -0.0375 + dy, qz - 0.012],
      act: () => info('摩擦の調整（FRICTION）：6 本のレバーが勝手に動かないように重さを調整します。地上点検の終わりに締めます（この飛行では動かしません）') });
    // the alternate air pair on the quadrant's lower face: a short slot each, the lever's arm out of it, a mushroom knob
    // (one part: they move together), CLOSE / ALT. AIR / OPEN between them
    for (const x of alt.x) {
      add(at(rbox(0.0055, 0.03, 0.003, 0.0018), [x, alt.y, qz + 0.0005]), S.slot);
      add(at(new THREE.BoxGeometry(0.0035, 0.0035, alt.len), [x, alt.y, qz + alt.len / 2]), S.steel, 'altAir');
      add(at(cylZ(0.0035, 0.0035, 0.006, 10), [x, alt.y, qz + alt.len - 0.002]), S.knob, 'altAir');
      add(at(new THREE.SphereGeometry(0.0078, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), [x, alt.y, qz + alt.len]), S.knob, 'altAir');
    }
    label('CLOSE', [qx, alt.y + 0.012, qz + 0.0021], { size: 1.3 }); label('ALT. AIR', [qx, alt.y, qz + 0.0021], { size: 1.5 }); label('OPEN', [qx, alt.y - 0.012, qz + 0.0021], { size: 1.3 });
    const altAim = [alt.x[1], alt.y, qz + alt.len + 0.0075];
    control({ id: 'altAir', label: () => `代替空気 左右（ALT AIR ${switches.altAir ? 'OPEN：下' : 'CLOSE：上'}）`, kind: 'lever', part: 'altAir', size: [alt.x[1] - alt.x[0] + 0.02, 0.022, 0.02], pos: [qx, alt.y, qz + alt.len], aim: altAim,
      act: (dir, wheel) => { const on = wheel ? dir > 0 : !switches.altAir; return on === !!switches.altAir ? null : { type: 'switch', id: 'altAir', on }; } });
    // the cowl flap pair on the pedestal under it: each a stalk from its pivot behind the plate through a slot, the lock
    // tab on it, the tapered knob at its end (one part: they move together; a click a notch towards closed, round to
    // open again; the wheel forward opens), the placard between them
    { const [py, pzv] = cowl.pivot, [ky, kz] = cowl.knob, dy = ky - py, dz = kz - pzv, len = Math.hypot(dy, dz), th = Math.atan2(-dy, dz);
      const plate = y => -1.068 + (y + 0.105) / -0.095 * 0.003;                       // (the plate's z on its upright part)
      for (const x of cowl.x) {
        add(at(rbox(0.006, 0.026, 0.002, 0.0015), [x, -0.171, plate(-0.171) + 0.0006]), S.slot);
        add(at(new THREE.BoxGeometry(0.0045, 0.0045, len), [x, (py + ky) / 2, (pzv + kz) / 2], [th, 0, 0]), S.steel, 'cowlFlaps');
        add(at(new THREE.BoxGeometry(0.008, 0.003, 0.009), [x, ky + 0.019, kz - 0.016], [th, 0, 0]), S.chrome, 'cowlFlaps');
        add(at(cylZ(0.0125, 0.0095, 0.026, 24), [x, ky, kz]), S.knob, 'cowlFlaps');
      }
      const py2 = -0.19, cx = (cowl.x[0] + cowl.x[1]) / 2;
      placard(['PULL - CLOSE', 'L   COWL   R', 'FLAP', 'PUSH - OPEN'], 30, 22, [cx, py2, plate(py2)], { r: [-Math.atan2(0.003, 0.095), 0, 0], res: 0.7 });
      control({ id: 'cowlFlaps', label: () => `カウル フラップ 左右（${({ OPEN: '開', INT: '中間', CLOSED: '閉' })[switches.cowlFlaps] || switches.cowlFlaps}：押すと開く・引くと閉じる）`, kind: 'lever', part: 'cowlFlaps',
        size: [cowl.x[1] - cowl.x[0] + 0.028, 0.03, 0.034], pos: [cx, ky, kz], aim: [cowl.x[1], ky + 0.008, kz + 0.011],
        act: (dir, wheel) => { const i = COWL_POS.indexOf(switches.cowlFlaps), j = wheel ? clamp(i + (dir > 0 ? 1 : -1), 0, 2) : (i + 2) % 3; return j === i ? null : { type: 'select', id: 'cowlFlaps', value: COWL_POS[j] }; } });
    }
    // the gear selector: a chrome bushing, the lever, the black tyre-shaped knob with its hubs (DOWN: the lever down);
    // UP 109 KIAS MAX / GEAR / DOWN 140 KIAS MAX left of it, the panel's backlit print
    { const { x, y, len } = GEAR, k = [x, y, PZ + len + 0.004];
      add(at(cylZ(0.0062, 0.0068, 0.004, 14), [x, y, PZ + 0.002]), S.chrome);
      add(at(new THREE.BoxGeometry(0.0042, 0.0042, len), [x, y, PZ + len / 2]), S.chrome, 'gearLever');
      add(at(cylX(0.0145, 0.011, 26), k), S.rubber, 'gearLever');
      add(at(cylX(0.0058, 0.0118, 16), k), S.steel, 'gearLever');
      label(['UP 109', 'KIAS MAX'], [x - 0.022, y + 0.021, PZ + 0.0002], { size: 1.15, ...GLOW });
      label('GEAR', [x - 0.022, y, PZ + 0.0002], { size: 1.6, ...GLOW });
      label(['DOWN 140', 'KIAS MAX'], [x - 0.022, y - 0.021, PZ + 0.0002], { size: 1.15, ...GLOW });
      control({ id: 'gear', label: () => `脚のレバー（${cur.s && !cur.s.gearDown ? 'UP' : 'DOWN'}・G）`, kind: 'lever', part: 'gearLever', size: [0.024, 0.034, 0.03], pos: k, act: () => flight('gear') });
    }
    // the emergency gear extension knob: red, PULL TO RELEASE on its face, the wire guard across it, its placard over it
    // (VB-2636 2.33; the panel's print, backlit) — an info control (the game's gear has no hydraulics to fail)
    { const { c: [x, y], r } = SEM.emerg;
      add(at(cylZ(r + 0.003, r + 0.003, 0.003, 24), [x, y, PZ + 0.0015]), S.black);
      add(at(cylZ(r, r, 0.011, 24), [x, y, PZ + 0.0085]), S.red);
      label(['PULL', 'TO', 'RELEASE'], [x, y, PZ + 0.0142], { size: 1.2, lit: 0, col: 0xf4f4f2 });
      add(at(cylX(0.0011, 2 * r + 0.008, 6), [x, y + 0.0015, PZ + 0.0172]), S.chrome);
      for (const sx of [-1, 1]) add(at(cylZ(0.0011, 0.0011, 0.0172, 6), [x + sx * (r + 0.004), y + 0.0015, PZ + 0.0086]), S.chrome);
      label(['EMERGENCY', 'GEAR', 'EXTENSION'], [x, y + 0.044, PZ + 0.0002], { size: 1.7, ...GLOW });
      label(['PULL TO RELEASE', 'SEE A.F.M. BEFORE', 'RE-ENGAGEMENT'], [x, y + 0.0235, PZ + 0.0002], { size: 0.95, ...GLOW });
      control({ id: 'emergGear', label: '非常用の脚下げ（EMERGENCY GEAR EXTENSION：引く）', kind: 'knob', size: [0.034, 0.03, 0.022], pos: [x, y, PZ + 0.009], aim: [x, y + 0.006, PZ + 0.0145],
        act: () => info('非常用の脚下げ：脚が電動の油圧で下りないときに、針金のガードをどけて引くと、油圧が抜けて脚が自分の重さで下ります（訓練では引きません）') });
    }
    // the park brake: a round black knob on a chrome stem in its bezel, PARK BRAKE PULL in white on its face (a print
    // that rides on it), pulled out (aft) when set
    { const { c: [x, y], r } = SEM.brake;
      add(at(cylZ(r + 0.0035, r + 0.0035, 0.003, 20), [x, y, PZ + 0.0015]), S.bezel);
      add(at(cylZ(0.0028, 0.0028, 0.012, 10), [x, y, PZ + 0.006]), S.chrome, 'brakeK');
      add(at(cylZ(r, r * 0.96, 0.012, 20), [x, y, PZ + 0.016]), S.knob, 'brakeK');
      { const it = atlas.add(13, 11, textDraw(['PARK', 'BRAKE', 'PULL'])), g = withCol(withMat(quad(0.013, 0.011, [0, 0, 1, 1], [x, y, PZ + 0.0223]), 0.55, 0, 0), 0xf2f2f0);
        g.userData = { it }; B.decalsPart.push({ g, part: 'brakeK' }); }
      control({ id: 'parkBrake', label: 'パーキングブレーキ（PARK BRAKE：引く）', kind: 'lever', part: 'brakeK', size: [2 * r + 0.006, 2 * r + 0.006, 0.026], pos: [x, y, PZ + 0.013], aim: [x, y, PZ + 0.0222], act: () => flight('parkBrake') });
    }
    B.variant = null;
  }
  function ribbed(w, h, d) {
    const parts = [rbox(w, h, d, 0.004, 2)];
    for (let i = 0; i < 4; i++) parts.push(at(new THREE.BoxGeometry(w + 0.002, 0.0022, d * 0.8), [0, -h / 2 + 0.004 + i * (h - 0.008) / 3, 0]));
    return mergeGeometries(parts.map(g => (g.index ? g.toNonIndexed() : g)).map(g => { for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); return g; }));
  }

  // ============================================================ the yokes
  for (const sd of [-1, 1]) {
    const part = sd < 0 ? 'yokeL' : 'yokeR', x0 = sd * YOKE.x, y0 = YOKE.y, z0 = YOKE.z;
    const P3 = (x, y, z) => [x0 + x, y0 + y, z0 + z];
    if (!fromModel('yokes')) {                                 // (without the model) the yoke and its boot at the panel
      add(at(rbox(0.078, 0.052, 0.036, 0.013, 2), P3(0, 0, 0)), S.yoke, part);
      add(at(rbox(0.056, 0.03, 0.004, 0.006, 2), P3(0, 0.002, 0.018)), S.alu, part);
      add(at(cylZ(0.0135, 0.0135, 0.40, 16), P3(0, 0, -0.20)), S.chrome, part);
      add(at(cylZ(0.017, 0.017, 0.02, 16), P3(0, 0, -0.027)), S.yoke, part);
      for (const s of [-1, 1]) {
        add(tube([P3(s * 0.03, 0, 0), P3(s * 0.085, -0.008, 0.004), P3(s * 0.13, 0.004, 0.01), P3(s * 0.152, 0.036, 0.012)], 0.0115, 12, 8), S.yoke, part);
        add(tube([P3(s * 0.150, 0.03, 0.012), P3(s * 0.159, 0.068, 0.011), P3(s * 0.158, 0.103, 0.006), P3(s * 0.149, 0.128, 0.0)], 0.0158, 10, 8), S.grip, part);
        add(at(sphere(0.0158, 8, 6), P3(s * 0.149, 0.128, 0.0)), S.grip, part);
      }
      if (sd < 0) add(at(cylZ(0.0048, 0.0048, 0.006, 12), P3(-0.152, 0.112, 0.016)), S.red, part);           // push-to-talk
      add(at(cylZ(0.032, 0.03, 0.01, 24), [x0, y0, PZ + 0.005]), S.rubber);                                  // the boot at the panel
    }
    control({ id: part, label: sd < 0 ? '操縦輪（W / S・A / D）' : '右席の操縦輪（左と連動）', kind: 'handle', part,
      size: YOKE_HIT.hub.slice(0, 3), pos: [x0 + YOKE_HIT.hub[3], y0 + YOKE_HIT.hub[4], z0 + YOKE_HIT.hub[5]],
      more: [...[-1, 1].map(k => [YOKE_HIT.horn.slice(0, 3), [x0 + k * YOKE_HIT.horn[3], y0 + YOKE_HIT.horn[4], z0 + YOKE_HIT.horn[5]]]),
        [YOKE_HIT.top.slice(0, 3), [x0 + YOKE_HIT.top[3], y0 + YOKE_HIT.top[4], z0 + YOKE_HIT.top[5]]]], act: () => info('操縦輪：W / S（↑ / ↓）で機首の上げ下げ、A / D（← / →）で傾き') });
  }

  // ============================================================ rudder pedals (left pair, right pair: they move opposite ways)
  // the NXi's (Piper's TX and LX photos): light-grey pads with a pointed-arch top and a raised grid, on black arms down
  // to the torque tube
  const padArch = (() => {                                    // (its outline: straight sides, two arcs meeting in a point)
    const w = 0.036, y0 = 0.012, h = 0.045, R = (w * w + h * h) / (2 * w), cx = w - R, top = Math.acos(-cx / R), sh = new THREE.Shape();
    sh.moveTo(-w, -0.05); sh.lineTo(w, -0.05);
    for (let i = 0; i <= 4; i++) { const a = top * i / 4; sh.lineTo(cx + R * Math.cos(a), y0 + R * Math.sin(a)); }
    for (let i = 3; i >= 0; i--) { const a = top * i / 4; sh.lineTo(-(cx + R * Math.cos(a)), y0 + R * Math.sin(a)); }
    const g = new THREE.ExtrudeGeometry(sh, { depth: 0.009, bevelEnabled: false }); g.deleteAttribute('uv'); return g;
  })();
  PEDAL_X.forEach((x, i) => {
    const part = i % 2 === 0 ? 'pedalsL' : 'pedalsR', tilt = -30 * DEG, c = Math.cos(tilt), sn = Math.sin(tilt);
    const onPad = (u, w) => [x, PEDAL.y + u * c - w * sn, PEDAL.z + u * sn + w * c];   // u up the pad, w off its face
    add(at(padArch.clone(), onPad(0.005, -0.009), [tilt, 0, 0]), S.pedal, part);
    for (const k of [-1, 1]) add(at(new THREE.BoxGeometry(0.003, 0.074, 0.002), onPad(0.002, 0.0005), [tilt, 0, 0]).translate(k * 0.012, 0, 0), { ...S.pedal, c: 0x8e9195 }, part);
    for (let k = 0; k < 4; k++) add(at(new THREE.BoxGeometry(0.064, 0.003, 0.002), onPad(-0.032 + k * 0.019, 0.0005), [tilt, 0, 0]), { ...S.pedal, c: 0x8e9195 }, part);
    add(tube([onPad(-0.03, -0.012), [x, PEDAL.y - 0.09, PEDAL.z - 0.06], [x, FLOOR + 0.035, PEDAL.z - 0.11]], 0.009, 4, 6), S.black, part);
  });
  add(at(cylX(0.016, 0.98, 12), [0, FLOOR + 0.035, PEDAL.z - 0.115]), S.black);
  control({ id: 'pedals', label: 'ラダー ペダル（Q / E）', kind: 'handle', size: [0.30, 0.16, 0.12], pos: [-0.30, PEDAL.y, PEDAL.z], act: () => info('ラダー ペダル：Q / E で踏みます。つま先のブレーキは B / Space') });

  // ============================================================ the seats
  const seat = (x, z, w, front) => {
    // the pan, the cushion with its leather insert, the back reclined 13°, the headrest on two posts
    add(at(rbox(w, 0.11, 0.52, 0.04, 2), [x, -0.21, z], [5 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(w - 0.13, 0.035, 0.44, 0.016, 2), [x, -0.15, z + 0.005], [5 * DEG, 0, 0]), S.seat);
    const bz = z + 0.40, by = 0.17;
    add(at(rbox(w, 0.62, 0.105, 0.045, 2), [x, by, bz], [13 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(w - 0.13, 0.48, 0.03, 0.014, 2), [x, by + 0.01, bz - 0.054], [13 * DEG, 0, 0]), S.seat);
    for (const k of [-1, 1]) add(at(rbox(w - 0.13, 0.008, 0.01, 0.002), [x, by - 0.02 + k * 0.12, bz - 0.067 + k * 0.03], [13 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(0.25, 0.155, 0.085, 0.035, 2), [x, 0.615, bz + 0.06], [8 * DEG, 0, 0]), S.seatSide);
    add(at(rbox(0.19, 0.11, 0.02, 0.009, 2), [x, 0.615, bz + 0.015], [8 * DEG, 0, 0]), S.seat);
    for (const k of [-1, 1]) add(at(new THREE.CylinderGeometry(0.0055, 0.0055, 0.08, 8), [x + k * 0.07, 0.52, bz + 0.05], [13 * DEG, 0, 0]), S.chrome);
    if (front) {
      add(at(rbox(w - 0.06, 0.12, 0.40, 0.01), [x, FLOOR + 0.07, z]), S.black);
      for (const k of [-1, 1]) add(at(rbox(0.03, 0.025, 0.62, 0.002), [x + k * 0.15, FLOOR + 0.012, z - 0.05]), S.alu);
    }
  };
  if (!fromModel('seats')) { seat(-SEAT_X, SEAT.z, SEAT.w, true); seat(SEAT_X, SEAT.z, SEAT.w, true); }     // (without the model)
  // (without the model) the rear bench, both types': two places, one piece (the model has each type's own — the Archer's
  // bench, the Seminole's two seats: tools/aircraft/cockpit_seats.py)
  if (!fromModel('bench')) {
    add(at(rbox(1.0, 0.14, 0.50, 0.04, 2), [0, -0.205, 0.48], [4 * DEG, 0, 0]), S.seatSide);
    for (const x of [-0.25, 0.25]) add(at(rbox(0.32, 0.035, 0.42, 0.015, 2), [x, -0.13, 0.48], [4 * DEG, 0, 0]), S.seat);
    add(at(rbox(1.0, 0.62, 0.11, 0.045, 2), [0, 0.18, 0.86], [16 * DEG, 0, 0]), S.seatSide);
    for (const x of [-0.25, 0.25]) {
      add(at(rbox(0.32, 0.48, 0.03, 0.014, 2), [x, 0.19, 0.80], [16 * DEG, 0, 0]), S.seat);
      add(at(rbox(0.24, 0.14, 0.08, 0.032, 2), [x, 0.60, 0.97], [10 * DEG, 0, 0]), S.seatSide);
    }
  }

  // ============================================================ between the seats: the console, the flap handle, the trim wheel
  // the console (FCON; black, as the pedestal): its profile — the top from its aft end forward, the face sloping down to
  // the floor — across its width, soft edges; the low cover on the floor from the pedestal's foot back to its face, its
  // screws along its edges (the LX Steel photo)
  { const { w, y1, zt, z0, z1, cover: [cw, ch] } = FCON, b = 0.004;
    const prof = [[b - z1, FLOOR - 0.01], [b - z1, y1 - b], [-zt, y1 - b], [-z0, FLOOR - 0.01]];   // ([−z, y], inside the bevel b: turned below so that it runs across)
    add(slab(prof, 0.02, [], w - 2 * b, w / 2, b, 4, 1).rotateY(Math.PI / 2), S.panel, null, 0.2);
    const c0 = PED.foot - 0.005, c1 = z0 + 0.03, top = FLOOR + ch - 0.004;
    add(at(rbox(cw, ch, c1 - c0, 0.008, 1), [0, top - ch / 2, (c0 + c1) / 2]), S.panel);
    for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) add(at(new THREE.CircleGeometry(0.0021, 6), [sx * (cw / 2 - 0.009), top + 0.0004, c0 + 0.03 + i * (c1 - c0 - 0.07) / 3], [-Math.PI / 2, 0, 0]), S.screw);
  }
  // a flap handle (F: FLAP, or the Seminole's CON44.flap; made at rest, turned about its pivot; its moving part): the bar
  // forward from the pivot, the ribbed grip (a lathe: the bar's end flaring into it, five ribs, its end rounded under
  // the button), the silver button at its tip; its hit box round the grip (it rides on the handle), aimed at the grip's top
  function flapHandle(F, part) {
    const [g0, gr] = F.grip, L = F.len, tilt = [F.rest, 0, 0], p = d => flapAt(d, 0, 0, F);
    add(at(cylZ(0.0085, 0.0085, g0 + 0.012, 10), p((g0 + 0.012) / 2), tilt), S.black, part);
    const prof = [[0.0085, 0], [0.0135, 0.004], [gr, 0.010]];
    for (let k = 0; k < 5; k++) prof.push([gr - 0.0016, 0.016 + 0.017 * k], [gr, 0.0215 + 0.017 * k]);
    prof.push([gr - 0.0012, L - g0 - 0.016], [0.0105, L - g0 - 0.007], [0, L - g0 - 0.005]);
    add(at(new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), 10).rotateX(-Math.PI / 2), p(g0), tilt), FLAPGRIP, part);
    add(at(cylZ(0.0075, 0.0072, 0.007, 12), p(L - 0.0035), tilt), SATIN, part);
    control({ id: 'flaps', label: 'フラップ レバー（V / Shift+V）', kind: 'lever', part, size: [0.044, 0.046, L - g0 + 0.02], pos: p((g0 + L) / 2), rot: tilt, aim: F.aim,
      act: (dir, wheel) => {
        const s = cur.s, n = s ? s.A.flapLabels.length : 4, i = s ? s.flapIdx : 0, down = dir > 0;                // up on the handle = more flap
        if (down) return i < n - 1 ? flight('flaps') : info('フラップはいちばん下（40°）です');
        return i > 0 ? flight('flapsUp') : info('フラップは上がっています（UP）');
      } });
  }
  // a trim wheel's ribbed rim (the wheel's radius r, w wide across x, at c: n ribs [along the rim, out of it] every k-th
  // white), on its moving part
  const trimRibs = (c, r, w, n, [rl, rd], k, part) => { for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; add(at(new THREE.BoxGeometry(w + 0.002, rl, rd), [c[0], c[1] + Math.sin(a) * r, c[2] + Math.cos(a) * r], [-a, 0, 0]), i % k === 0 ? S.white : GRIPBLK, part); } };
  // a trim pointer's slot on a flat top at height y (its x, its middle z, its length), the ticks on its left, DN at its
  // forward end, UP at its aft end (upright as the pilot looks down at them); the pointer (part) moves along it
  const trimScale = (ix, y, z, il, part, to = false) => {
    const flat = [-Math.PI / 2, 0, 0];
    add(at(new THREE.PlaneGeometry(0.0055, il + 0.008), [ix, y + 0.0004, z], flat), S.slot);
    for (let k = 0; k <= 4; k++) add(at(new THREE.PlaneGeometry(k === 2 && to ? 0.008 : 0.006, 0.0012), [ix - (k === 2 && to ? 0.009 : 0.008), y + 0.0004, z + (k - 2) * il / 4], flat), S.white);
    if (to) add(at(new THREE.PlaneGeometry(0.0022, il * 0.22), [ix - 0.0045, y + 0.0004, z], flat), S.white);      // (the takeoff band)
    label('DN', [ix - 0.002, y + 0.0005, z - il / 2 - 0.008], { size: 2.2, r: flat, lit: 0 });
    label('UP', [ix - 0.002, y + 0.0005, z + il / 2 + 0.008], { size: 2.2, r: flat, lit: 0 });
    add(at(new THREE.BoxGeometry(0.011, 0.0028, 0.0026), [ix - 0.0015, y + 0.0014, z]), S.white, part);
  };
  const trimAct = (dir) => flight('trimStep', dir >= 0 ? -1 : 1);
  // the Archer's flap handle (FLAP) — the boss over its pivot on the console's forward edge — and its trim wheel (TRIMW:
  // rolls fore and aft; forward = nose down) through a slot in a bezel on the console's top, its pointer in a slot on the
  // pilot's side (a part of its own: update())
  B.variant = 'pa28';
  add(at(rbox(0.05, 0.036, 0.062, 0.008), [0, FLAP.y + 0.002, FLAP.z]), S.black);
  flapHandle(FLAP, 'flap');
  { const g = new THREE.CylinderGeometry(TRIMW.r, TRIMW.r, 0.022, 36).rotateZ(Math.PI / 2), y1 = FCON.y1, flat = [-Math.PI / 2, 0, 0];
    add(at(g, [0, TRIMW.y, TRIMW.z]), S.black, 'trim');
    trimRibs([0, TRIMW.y, TRIMW.z], TRIMW.r, 0.022, 18, [0.009, 0.006], 6, 'trim');
    add(at(rbox(0.05, 0.008, 0.18, 0.003), [0, y1 + 0.002, TRIMW.z]), S.black);
    add(at(new THREE.PlaneGeometry(0.03, 0.166), [0, y1 + 0.0062, TRIMW.z], flat), S.slot);
    trimScale(TRIMW.ind.x, y1, TRIMW.z, TRIMW.ind.len, 'trimInd');
    // (its hit box stays put: the wheel turns about its own axle, the part above the console is always there)
    control({ id: 'trim', label: 'トリム ホイール（前へ回すと機首下げ）', kind: 'lever', size: [0.04, 0.06, 0.16], pos: [0, TRIMW.y + 0.04, TRIMW.z], aim: TRIMW.aim, act: trimAct });
  }
  B.variant = null;
  // (round R3) the Seminole's console (CON44): the stabilator trim wheel in its hump on the console's forward end, its
  // pointer beside it (DN / the takeoff band / UP); the rudder trim wheel upright across the console, half sunk, its
  // cover running aft from it with the scale on its top (ticks round its top, L left, R right; the index on the wheel,
  // turned by the game's rudder trim: update()); the fuel selector plate (Fig 7-19's placard on it: LEFT ENGINE and
  // RIGHT ENGINE along its edges, ON, FUEL 54 GAL PER SIDE, OFF, X FEED between the slots), each lever a red paddle on a
  // stem out of its slot; the flap handle on the right of them, its boss on the console's top
  const FSEL = ['ON', 'OFF', 'XFEED'], FSEL_ANG = { ON: -CON44.fuel.ang, OFF: 0, XFEED: CON44.fuel.ang };    // (forward to aft)
  if (twinA) {
    B.variant = 'pa44';
    const { trim: T, hump: H, rud: R, fuel: F, flap: FH } = CON44, y1 = FCON.y1, flat = [-Math.PI / 2, 0, 0], b = 0.004;
    // the hump ([−z, y] inside the bevel b, across x0 … x1: from the console's top, over the wheel, round and down to the
    // floor in front of the console's face)
    const top = H.y - b, za = -H.z1 + b, zf = -H.z0 - b;
    add(slab([[za, y1 - 0.006], [za, top], [zf - 0.05, top], [zf - 0.006, top - 0.06], [zf, FLOOR + 0.002], [za + 0.03, FLOOR + 0.002]], 0.022, [], H.x1 - H.x0 - 2 * b, H.x1, b, 5, 1).rotateY(Math.PI / 2), S.panel, null, 0.2);
    add(at(new THREE.CylinderGeometry(T.r, T.r, T.w, 32).rotateZ(Math.PI / 2), [T.x, T.y, T.z]), S.black, 'trim44');
    trimRibs([T.x, T.y, T.z], T.r, T.w, 16, [0.0075, 0.005], 4, 'trim44');
    const chord = Math.sqrt(T.r * T.r - (H.y - T.y) ** 2);
    add(at(new THREE.PlaneGeometry(T.w + 0.008, 2 * chord + 0.004), [T.x, H.y + 0.0003, T.z], flat), S.slot);
    trimScale(T.ind.x, H.y, T.z, T.ind.len, 'trimInd44', true);
    control({ id: 'trim', label: 'スタビレーター トリム ホイール（前へ回すと機首下げ）', kind: 'lever', size: [T.w + 0.012, 0.03, 2 * chord + 0.01], pos: [T.x, H.y + 0.011, T.z], aim: [T.x, T.y + T.r - 0.003, T.z], act: trimAct });
    // the rudder trim: the cover (a half cylinder along the console from inside the wheel to the fuel plate), its dark
    // scale band round its top just aft of the wheel with the ticks (every 10°, the middle longer), L and R at the band's
    // ends; the wheel (a knurled disc about z, its inner part inside the cover) and its index
    { const zw = R.z + R.h / 2, zc0 = R.z, zc1 = R.z1, bw = 0.009, zb = zw + 0.001 + bw / 2, rc = R.cover;
      add(new THREE.CylinderGeometry(rc, rc, zc1 - zc0, 24, 1, false, -Math.PI / 2, Math.PI).rotateX(-Math.PI / 2).translate(R.x, y1, (zc0 + zc1) / 2), S.panel);
      add(new THREE.CylinderGeometry(rc + 0.0006, rc + 0.0006, bw, 16, 1, true, -R.band, 2 * R.band).rotateX(-Math.PI / 2).translate(R.x, y1, zb), { c: 0x111214, r: 0.32 });
      for (let i = -4; i <= 4; i++) {
        const a = i * 10 * DEG, l = i === 0 ? 0.008 : i % 2 ? 0.004 : 0.006;
        add(new THREE.PlaneGeometry(0.0011, l).rotateX(-Math.PI / 2).rotateZ(-a).translate(R.x + Math.sin(a) * (rc + 0.0012), y1 + Math.cos(a) * (rc + 0.0012), zw + 0.0005 + l / 2), S.white);
      }
      for (const [t, sx] of [['L', -1], ['R', 1]]) {                  // (flat on the band, turned round the cover: text up forward, as the console's prints)
        const a = sx * (R.band - 3 * DEG), e = new THREE.Euler().setFromQuaternion(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -a).multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...flat))));
        label(t, [R.x + Math.sin(a) * (rc + 0.0010), y1 + Math.cos(a) * (rc + 0.0010), zb], { size: 2.2, r: [e.x, e.y, e.z], lit: 0 });
      }
      add(knurled(R.r, R.h, 40).translate(R.x, y1, R.z), S.knob, 'rudTrim');
      add(new THREE.PlaneGeometry(0.0022, R.r - rc - 0.002).translate(R.x, y1 + (R.r + rc) / 2, zw + 0.0004), S.white, 'rudTrim');
      add(new THREE.PlaneGeometry(0.0022, R.r - rc - 0.002).rotateY(Math.PI).translate(R.x, y1 + (R.r + rc) / 2, R.z - R.h / 2 - 0.0004), S.white, 'rudTrim');
      const hy0 = y1 + rc * 0.55, hy1 = y1 + R.r + 0.003;
      control({ id: 'rudderTrim', label: 'ラダー トリム（ホイール・Z / X）', kind: 'knob', size: [2 * R.r * 0.9, hy1 - hy0, R.h + 0.008], pos: [R.x, (hy0 + hy1) / 2, R.z], aim: [R.x, y1 + R.r - 0.003, R.z - R.h / 2 - 0.0005],
        act: (dir, wheel) => (wheel ? flight(dir > 0 ? 'rtrimR' : 'rtrimL') : info('ラダー トリム：ホイールを回すか、キーボードの Z / X（右へ回すと機首が右へ。片発では、生きているエンジンの側へ）')) });
    }
    // the fuel selector plate and its levers
    { const yt = y1 + 0.004, xs = [F.x - F.dx, F.x + F.dx], hw = F.w / 2, hd = F.d / 2;
      add(at(new THREE.BoxGeometry(F.w, 0.004, F.d), [F.x, y1 + 0.002, F.z]), { c: 0x111214, r: 0.32 });
      for (const [w, d, x, z] of [[F.w - 0.005, 0.0008, F.x, F.z - hd + 0.0025], [F.w - 0.005, 0.0008, F.x, F.z + hd - 0.0025], [0.0008, F.d - 0.005, F.x - hw + 0.0025, F.z], [0.0008, F.d - 0.005, F.x + hw - 0.0025, F.z]])
        add(at(new THREE.PlaneGeometry(w, d), [x, yt + 0.0003, z], flat), S.white);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) add(at(new THREE.CircleGeometry(0.0019, 6), [F.x + sx * (hw - 0.0055), yt + 0.0004, F.z + sz * (hd - 0.0055)], flat), S.screw);
      const run = Math.tan(F.ang) * F.pivot;                                         // (where a stem crosses the plate at ON / X FEED)
      for (const x of xs) add(at(new THREE.PlaneGeometry(0.0045, 2 * run + 0.008), [x, yt + 0.0004, F.z], flat), S.slot);
      const mark = (t, z, size, res) => label(t, [F.x, yt + 0.0005, F.z + z], { size, r: flat, lit: 0, res });
      // (ON and OFF the carb heat's prints' size: the same place in the atlas)
      mark('ON', -run - 0.004, 2.1); mark('FUEL', -0.0145, 2); mark(['54 GAL', 'PER SIDE'], -0.0065, 1.3, 0.6); mark('OFF', 0.003, 2.1); mark('X FEED', run + 0.004, 2.1);
      for (const [t, sx] of [['LEFT ENGINE', -1], ['RIGHT ENGINE', 1]]) label(t, [F.x + sx * (hw - 0.0062), yt + 0.0005, F.z], { size: 1.6, r: [-Math.PI / 2, 0, sx * Math.PI / 2], lit: 0, res: 0.6 });
      xs.forEach((x, k) => {
        const part = k ? 'fuelR' : 'fuelL', id = k ? 'fuelSelR' : 'fuelSelL', ja = k ? '右' : '左';
        add(at(new THREE.BoxGeometry(0.0034, 0.032, 0.0026), [x, yt + 0.009, F.z]), S.steel, part);
        add(at(rbox(0.012, 0.015, 0.0055, 0.0024), [x, yt + 0.028, F.z]), S.red, part);
        control({ id, label: () => `${ja}エンジンの燃料セレクター（${switches[id]}：前から ON・OFF・XFEED）`, kind: 'lever', part, size: [0.018, 0.026, 0.016], pos: [x, yt + 0.026, F.z], aim: [x, yt + 0.0345, F.z],
          act: (dir, wheel) => {
            // a click: ON ↔ X FEED (the check before taxiing; OFF to ON); the wheel, a notch forward (up) or aft
            const v0 = switches[id], i = Math.max(0, FSEL.indexOf(v0)), v = wheel ? FSEL[clamp(i + (dir > 0 ? -1 : 1), 0, 2)] : v0 === 'ON' ? 'XFEED' : 'ON';
            return v === v0 ? null : { type: 'select', id, value: v };
          } });
      });
    }
    // the flap handle: its boss on the console's top over the pivot, the handle
    add(at(rbox(0.026, 0.026, 0.05, 0.006), [FH.x, y1 + 0.011, FH.z]), S.black);
    flapHandle(FH, 'flap44');
    B.variant = null;
  }

  // ============================================================ the Archer's fuel selector (FUELSEL: the left kick panel, low)
  // (the Seminole's are the levers on its console, above; its kick panel is bare there, as the real one's)
  // made in the plate's frame (x to the right as one faces it, y up its face, z = n off it, at c): the bezel (a ring, its
  // skirt back into the kick panel, its inside down to the plate), the black placard plate, its marks (not backlit; bold
  // white caps ~6 mm tall, two lines near the rim, as tx_fuel's — they read from the seat), the red pointer handle (made
  // pointing at 12 o'clock; update() turns it about n) — its flat tapered base (~3.5 cm across, the real wedge's), the
  // ridged fin one grips along it, the release button on its tail (pushed to turn it to OFF)
  B.variant = 'pa28';
  { const F = FUELSEL, R = F.r, rim = F.rim, ez = new THREE.Vector3(...F.n), ey = new THREE.Vector3(0, 1, 0).addScaledVector(ez, -ez.y).normalize();
    const M = new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(ey, ez), ey, ez).setPosition(...F.c);
    const E = new THREE.Euler().setFromRotationMatrix(M), r = [E.x, E.y, E.z], P = (x, y, z) => new THREE.Vector3(x, y, z).applyMatrix4(M).toArray();
    const lathe = (pts, n) => new THREE.LatheGeometry(pts.map(([a, h]) => new THREE.Vector2(a, h)), n).rotateX(Math.PI / 2);
    add(lathe([[R + rim, -0.006], [R + rim - 0.0015, 0.003], [R + rim * 0.5, 0.0066], [R + 0.0012, 0.0052], [R - 0.0005, 0.0012]], 24).applyMatrix4(M), S.black);
    add(new THREE.CircleGeometry(R, 28).translate(0, 0, 0.0012).applyMatrix4(M), { ...S.black, r: 0.5 });
    // (without the model's walls: behind the bezel, back into the wall, the kick panel's moulding round it, in the side
    // panel's grey; the model's kick panel is flat in the plate's plane there and hides it)
    if (!walls) add(lathe([[R + rim + 0.014, -0.09], [R + rim + 0.0005, -0.0045]], 24).applyMatrix4(M), S.sidePanel);
    const mark = (lines, clock, rr) => label(lines, P(Math.sin(clock * DEG) * rr, Math.cos(clock * DEG) * rr, 0.0015), { size: 6.5, r, lit: 0, col: 0xe6e6e0, res: 0.55 });
    mark(['L TANK', '24 GAL'], F.clock.L, 0.042); mark(['R TANK', '24 GAL'], F.clock.R, 0.042); mark(['FUEL', 'OFF'], F.clock.OFF, 0.044);
    const base = slab([[0, 0.048], [0.017, 0.004], [0.013, -0.032], [0, -0.039], [-0.013, -0.032], [-0.017, 0.004]], 0.003, [], 0.005, 0.0092, 0.0015, 1, 1);
    const fin = slab([[-0.02, 0.007], [0.034, 0.007], [0.03, 0.013], [0.006, 0.0235], [-0.012, 0.0222], [-0.02, 0.016]], 0.002, [], 0.0041, 0.00325, 0.0012, 1, 1)
      .applyMatrix4(new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1));               // ([along it, off the plate] → y, z: across it x)
    for (const g of [base, fin]) add(g.applyMatrix4(M), S.red, 'fuel');
    add(cylZ(0.0042, 0.0042, 0.004, 10).translate(0, -0.028, 0.0105).applyMatrix4(M), S.chrome, 'fuel');
    control({ id: 'fuelSel', label: '燃料セレクター（左 / 右 / OFF）', kind: 'switch', part: 'fuel', size: [0.04, 0.096, 0.03], pos: P(0, 0.004, 0.0125), rot: r, aim: P(0, 0.012, 0.022),
      act: (dir, wheel) => {
        // a click: the other tank; the wheel: L → R → OFF and back
        const i = FUEL.indexOf(switches.fuelSel), v = wheel ? FUEL[clamp(i + (dir > 0 ? 1 : -1), 0, FUEL.length - 1)] : (switches.fuelSel === 'L' ? 'R' : 'L');
        return v === switches.fuelSel ? null : { type: 'select', id: 'fuelSel', value: v };
      } });
  }
  B.variant = null;

  // ============================================================ the door (right), its handle and latch
  // with the model's walls (WALLS.door): the inside handle's lever in its black cup on the door's forward part — the
  // control's box round the lever, aimed at its grip; OPEN over it on the cup's flat bottom (panel_right: a black tag, a
  // shade lighter than the cup, its white OPEN ~5 mm tall, over the up arrow); ENGAGE LATCH BEFORE FLIGHT on
  // the roof trim's face aft of the upper latch (Piper's TX photos, the POH). Without them: the old simple door (its seams
  // below the sill, the map pocket, a chrome handle mid-door with its DOOR LATCH label, the top latch over its window)
  if (walls) {
    const c = WALLS.door.cup, xb = HW - WALLS.proud[0] + c.depth;
    placard(['OPEN'], 20, 10, [xb - 0.0006, c.y + 0.046, c.z], { bg: 0x2a2c2f, r: [0, -Math.PI / 2, 0], res: 0.6,
      draw: (g, w, h) => { g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `700 ${h * 0.62}px ${SANS}`; g.fillText('OPEN', w / 2, h * 0.54, w * 0.9); } });
    placard(['ENGAGE LATCH', 'BEFORE FLIGHT'], 38, 11, [HWT - 0.0118, WTOP + 0.003, WALLS.door.latch + 0.075], { r: [0, -Math.PI / 2, 0], res: 0.7 });
    control({ id: 'door', label: 'ドア ハンドル（降りる）', kind: 'handle', size: c.hit.size, pos: c.hit.pos, aim: c.aim, act: () => ({ type: 'exit' }) });
  } else {
    const x = HW - 0.004, D = { z0: -1.20, z1: -0.13, y0: -0.30 };
    // its outline (dark seams following the wall), the upholstered panel inside it, the map pocket
    const seam = (y0, y1, z0, z1) => add(sheet((u, v, o) => { const y = y0 + (y1 - y0) * v; o.set(lowX(y) - 0.0035, y, z0 + (z1 - z0) * u); }, 1, 6), { ...S.wallDark, c: 0x2b2d30, ao: 0.6 });
    seam(D.y0, SILL, D.z0 - 0.003, D.z0 + 0.003); seam(D.y0, SILL, D.z1 - 0.003, D.z1 + 0.003); seam(D.y0 - 0.003, D.y0 + 0.003, D.z0, D.z1);
    add(at(rbox(0.02, 0.10, 0.34, 0.006), [lowX(-0.15) - 0.011, -0.15, -0.86]), { ...S.arm, c: 0x3b3e42 });
    add(at(rbox(0.03, 0.022, 0.12, 0.006), [x - 0.02, 0.27, -0.76]), S.chrome);
    add(at(rbox(0.012, 0.016, 0.03, 0.004), [x - 0.012, 0.27, -0.685]), S.black);
    // the top latch: hanging from the window ring's top edge over the door's window, against the wall's plane
    add(at(rbox(0.022, 0.03, 0.09, 0.006), [bandX(0.73) - 0.0105, 0.722, -0.60]), S.chrome);
    label(['DOOR', 'LATCH'], [x - 0.0005, 0.302, -0.76], { size: 1.8, r: [0, -Math.PI / 2, 0], lit: 0 });
    control({ id: 'door', label: 'ドア ハンドル（降りる）', kind: 'handle', size: [0.05, 0.05, 0.16], pos: [x - 0.02, 0.27, -0.74], act: () => ({ type: 'exit' }) });
  }

  // ============================================================ the wet compass on the windshield's centre post, the sun visors
  { const [cx, cy, cz] = COMPASS;
    // the case: its body round the back of the card, and its face with the window the card is read through
    const [bw, bh, bd, bx, by, bz] = CASE.body, [hw, hh, hd, hx, hy, hz] = CASE.hanger;
    add(at(rbox(bw, bh, bd, 0.008, 2), [cx + bx, cy + by, cz + bz]), S.caseBlack);
    add(slab(rectPts(cx - 0.032, cy - 0.028, cx + 0.032, cy + 0.028), 0.008, [[rectPts(cx - 0.025, cy - 0.0145, cx + 0.025, cy + 0.0145), 0.004]], 0.019, cz + 0.025, 0.002, 3, 1), S.caseBlack);
    add(at(rbox(hw, hh, hd, 0.002), [cx + hx, cy + hy, cz + hz]), S.caseBlack);
    const card = new THREE.CylinderGeometry(0.024, 0.024, 0.014, 48, 1, true);
    const it = atlas.add(151, 14, compassCard, 0.75), cg = card.toNonIndexed(), a = cg.attributes.uv;     // (seen through a 5 cm window: ¾ of the scale is still finer than the screen from the seat)
    for (let i = 0; i < a.count; i++) a.setXY(i, a.getX(i), a.getY(i));
    cg.userData = { it }; cg.deleteAttribute('normal'); cg.computeVertexNormals();
    B.cardGeo = at(cg, [cx, cy, cz]);
    B.glass.push(at(new THREE.PlaneGeometry(0.05, 0.03), [cx, cy, cz + 0.0235]));
    decal(2, 26, (g, w, h) => { g.fillRect(w * 0.3, 0, w * 0.4, h); }, [cx, cy, cz + 0.0238], null, { lit: 1, col: 0xf2f2ee });
    // the deviation card under it: FOR (the heading wanted) / STEER (what the compass shows then)
    const cardY = cy - 0.0285 - 0.0105;
    add(at(new THREE.PlaneGeometry(0.046, 0.021), [cx, cardY, cz + 0.0218]), { c: 0xe4e1d9, r: 0.35 });
    decal(46, 21, (g, w, h) => {
      const rows = [0.2, 0.42, 0.64, 0.86], cx0 = 0.28, dx = 0.125;
      const steer = [2, 31, 59, 88, 119, 151, 182, 211, 240, 269, 300, 331];
      g.textBaseline = 'middle'; g.textAlign = 'left'; g.font = `700 ${h * 0.13}px ${SANS}`;
      ['FOR', 'STEER', 'FOR', 'STEER'].forEach((t, i) => g.fillText(t, w * 0.025, h * rows[i], w * 0.16));
      g.textAlign = 'center'; g.font = `700 ${h * 0.16}px ${SANS}`;
      ['N', '30', '60', 'E', '120', '150', 'S', '210', '240', 'W', '300', '330'].forEach((t, i) => {
        const x = w * (cx0 + (i % 6) * dx), r = i < 6 ? 0 : 2;
        g.fillText(t, x, h * rows[r], w * 0.11); g.fillText(String(steer[i]).padStart(3, '0'), x, h * rows[r + 1], w * 0.11);
      });
      g.fillRect(0, h * 0.53, w, Math.max(1, h * 0.02)); g.fillRect(w * 0.205, 0, Math.max(1, w * 0.008), h);
    }, [cx, cardY, cz + 0.0221], null, { lit: 0, rough: 0.3, col: 0x151515, res: 0.75 });
    control({ id: 'compass', label: '磁気コンパス', kind: 'button', size: [0.07, 0.07, 0.07], pos: [cx, cy, cz], act: () => info('磁気コンパス：機首の磁方位（PFD が使えないときの予備）') });
  }
  function compassCard(g, w, h) {
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let d = 0; d < 360; d += 5) {
      const u = 1 - d / 360, x = (u % 1) * w, big = d % 30 === 0;
      g.lineWidth = Math.max(1, w / 400); g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h * (big ? 0.34 : d % 10 === 0 ? 0.26 : 0.18)); g.stroke();
      if (big) { g.font = `700 ${h * 0.5}px ${SANS}`; const t = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' }[d] || String(d / 10); g.fillText(t, x, h * 0.68); if (x < 20) g.fillText(t, x + w, h * 0.68); }
    }
  }
  // (without the model) the sun visors, folded up flat under the headliner (along its arch) aft of the overhead switch
  // panel: down, they would hide its switches from the seat
  if (!fromModel('headliner')) for (const sd of [-1, 1]) {
    add(at(rbox(0.25, 0.012, 0.13, 0.006), [sd * 0.25, roofY(sd * 0.25) - 0.016, -0.67], [0, 0, -sd * 6.6 * DEG]), S.trim);
    add(at(cylX(0.005, 0.24, 8), [sd * 0.25, roofY(sd * 0.25) - 0.012, -0.74], [0, 0, -sd * 6.6 * DEG]), S.steel);
  }
  // the overhead duct's fairing (DUCT): its section swept along the roof's centreline — the flat underside, the sides
  // curving up to edges 6 mm over the roof's arch (behind the headliner made in Blender: its cloth sags ≤ 6 mm between
  // the bows, its seams go 2.5 mm up; and behind the one made here) —, its ends ramping up flush into the headliner
  { const { w0, w1, h, z0, z1, ramp } = DUCT, f0 = w0 / w1, ss = [-1, -0.9, -0.8, -0.7, -f0, f0, 0.7, 0.8, 0.9, 1], zs = [];
    for (const t of [0, 0.15, 0.35, 0.6]) zs.push(z0 + ramp * t);
    for (let k = 0; k <= 9; k++) zs.push(z0 + ramp + (z1 - z0 - 2 * ramp) * k / 9);
    for (const t of [0.6, 0.35, 0.15, 0]) zs.push(z1 - ramp * t);
    const duct = (s, z, o) => {
      const x = s * w1 / 2, t = Math.abs(s), yb = roofY(x) + 0.006, e = Math.sin(Math.PI / 2 * clamp(Math.min(z - z0, z1 - z) / ramp, 0, 1));
      const f = t <= f0 ? 1 : 0.5 + 0.5 * Math.cos(Math.PI * (t - f0) / (1 - f0));
      return o.set(x, yb + (ROOF - h * e - yb) * f, z);
    };
    add(sheet((u, v, o) => duct(ss[Math.round(u * (ss.length - 1))], zs[Math.round(v * (zs.length - 1))], o), ss.length - 1, zs.length - 1), S.trim);
    // the eyeball outlets on its underside: a chrome bezel, the black ball in it, its nozzle turned towards the head of
    // the seat under it (the front seats' eyes, the rear passengers' heads), the nozzle's dark mouth
    for (const z of DUCT.eyes) for (const sd of [-1, 1]) {
      const c = new THREE.Vector3(sd * DUCT.ex, ROOF - h - 0.0005, z), head = z < 0 ? [sd * SEAT_X, EYE0[1], -0.36] : [sd * 0.25, 0.6, 0.72];
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...head).sub(c).normalize());
      add(new THREE.LatheGeometry([[0.0118, -0.0015], [0.0145, -0.0027], [0.0175, -0.0015], [0.0185, 0.0015]].map(([r, hh]) => new THREE.Vector2(r, hh)), 10).translate(c.x, c.y + 0.0005, c.z), SATIN);
      add(new THREE.SphereGeometry(0.0125, 8, 4, 0, Math.PI * 2, 1.2, Math.PI - 1.2).translate(c.x, c.y, c.z), S.knob);       // (its part out of the bezel)
      add(new THREE.CylinderGeometry(0.0055, 0.0055, 0.006, 8, 1, true).translate(0, 0.014, 0).applyQuaternion(q).translate(c.x, c.y, c.z), S.black);
      add(new THREE.CircleGeometry(0.0046, 6).rotateX(-Math.PI / 2).translate(0, 0.0165, 0).applyQuaternion(q).translate(c.x, c.y, c.z), S.slot);
    }
  }
  // the dome lights (DOME): a shallow frosted lens (near-white, rough) in a chrome ring on the headliner, square to its
  // arch there; set 5.5 mm under the arch, the ring's skirt going up into it (the cloth sags there: the lens never behind
  // it). The ring and the outlets' bezels in a light satin metal (SATIN): a full metal reflects only the environment,
  // which the cabin's dim light turns dark olive with a blue edge (as S.postAlu notes). The lenses are kept apart
  // (domeLens, below): they take the shell's material with an emissive of their own at the assembly, so at night the
  // lamps the LIGHT DOME rheostats feed can be seen to be on
  const domeLens = [];
  for (const sd of [-1, 1]) {
    const x = sd * DOME.x, y = roofY(x), n = new THREE.Vector3(-x / (HWT * HWT), -(y - WTOP) / (ROOF - WTOP) ** 2, 0).normalize(), R = DOME.r, rise = 0.0065;
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), n), c = new THREE.Vector3(x, y, DOME.z).addScaledVector(n, 0.0055);
    const Rs = (R * R + rise * rise) / (2 * rise), th = Math.asin(R / Rs);                      // (the lens: a cap of a sphere, rise high)
    add(new THREE.LatheGeometry([[R + DOME.ring + 0.001, -0.009], [R + DOME.ring, 0.0005], [R + 0.004, 0.003], [R - 0.0005, 0.0012]].map(([r, h]) => new THREE.Vector2(r, h)), 18).applyQuaternion(q).translate(c.x, c.y, c.z), SATIN);
    domeLens.push(add(new THREE.SphereGeometry(Rs, 16, 2, 0, Math.PI * 2, 0, th).translate(0, 0.0012 - Rs * Math.cos(th), 0).applyQuaternion(q).translate(c.x, c.y, c.z), { c: 0xf4f4f2, r: 0.75 }));
  }

  // ============================================================ the glass: windshield and side windows (no shadows, no AO)
  B.glass.push(sheet((u, v, o) => { const y = WS.y0 + (WS.y1 - WS.y0) * v, x = (-1 + 2 * u) * (bandX(y) + 0.006); o.set(x, y, wsZ(x, y) - 0.004); }, 16, 6, true));
  for (const sd of [-1, 1]) {
    for (const [w] of WINDOWS) {
      const sh = rounded(new THREE.Shape(), w.map(([z, y]) => [z, y]), 0.03), g = new THREE.ShapeGeometry(sh, 6), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const z = p.getX(i), y = p.getY(i); p.setXYZ(i, sd * (bandX(y) + GLASS), y, z); }
      g.computeVertexNormals(); B.glass.push(g);
    }
  }

  // ============================================================ the cowling seen over the glareshield
  B.cowl.push(sheet((u, v, o) => {
    const zr = -1.31, zn = -3.22, z = zr + (zn - zr) * v;
    const yTop = 0.418 - 0.07 * Math.pow(v, 1.8), w = 0.552 - 0.22 * Math.pow(v, 2.4), h = 0.2 - 0.05 * v, yc = yTop - h;
    // u: down the right side, over the top, down the left side
    const side = 0.12, y0 = -0.25;
    let x, y;
    if (u < side) { const t = u / side; x = w; y = y0 + (yc - y0) * t; }
    else if (u > 1 - side) { const t = (u - 1 + side) / side; x = -w; y = yc + (y0 - yc) * t; }
    else { const ph = (u - side) / (1 - 2 * side) * Math.PI, c = Math.cos(ph), s = Math.sin(ph); x = w * Math.sign(c) * Math.pow(Math.abs(c), 0.45); y = yc + h * Math.pow(s, 0.32); }
    const zb = wsZ(x, WS.y0) - 0.01; o.set(x, y, zb + (zn - zb) * v + 0 * z);
  }, 32, 20, true));
  // (M6) the Seminole's nose (no engine in it): tools/aircraft/build_seminole.py's stations (z, belt half-width W at
  // yc, shoulder Ws at ys, crown yt), moved into this frame with the cockpit (0.2 m aft, 0.04 up), to its point
  if (twinA) {
    const K = [[-1.5, 0.595, 0.16, 0.505, 0.34, 0.425], [-1.9, 0.57, 0.11, 0.475, 0.29, 0.38], [-2.4, 0.5, 0.07, 0.405, 0.22, 0.31], [-2.8, 0.4, 0.04, 0.31, 0.16, 0.23],
      [-3.1, 0.27, 0.015, 0.205, 0.1, 0.15], [-3.25, 0.16, 0, 0.12, 0.06, 0.09], [-3.33, 0.06, -0.01, 0.045, 0.02, 0.03]];
    const nose = (z) => {
      let i = 0; while (i < K.length - 2 && z < K[i + 1][0]) i++;
      const a = K[i], b = K[i + 1], t = clamp((z - a[0]) / (b[0] - a[0]), 0, 1);
      return a.map((x, k) => x + (b[k] - x) * t);
    };
    B.cowl.push(sheet((u, v, o) => {
      const side = 0.16, e = 2 / 2.3;
      // (twice: the base follows the windshield's curved base, so z depends on x, and the section on z)
      let x = 0, y = 0, z = -1.3;
      for (let pass = 0; pass < 3; pass++) {
        const zb = wsZ(clamp(x, -0.55, 0.55), WS.y0) - 0.01; z = zb + (-3.12 - zb) * v;
        const [, W, yc, Ws, ys, yt] = nose(z - 0.2);
        if (u < side) { const t = u / side; x = W + (Ws - W) * t; y = yc + (ys - yc) * t; }
        else if (u > 1 - side) { const t = (u - 1 + side) / side; x = -(Ws + (W - Ws) * t); y = ys + (yc - ys) * t; }
        else { const ph = (u - side) / (1 - 2 * side) * Math.PI, c = Math.cos(ph), sn = Math.sin(ph); x = Ws * Math.sign(c) * Math.pow(Math.abs(c), e); y = ys + (yt - ys) * Math.pow(sn, e); }
      }
      o.set(x, y + 0.04, z);
    }, 32, 22, true));
  }

  // ============================================================ assemble: occlusion, merging, textures, materials
  const cache = new Map();
  for (const g of [...B.kit, ...B.kitV.pa28, ...B.kitV.pa44]) bakeAO(g, cache);
  for (const list of B.moving.values()) for (const g of list) bakeAO(g, cache);
  for (const g of [...B.decals, ...B.decalsV.pa28, ...B.decalsV.pa44, ...B.decalsPart.map(d => d.g)]) bakeAO(g, cache);

  const root = new THREE.Group(); root.name = 'cockpit';
  const cabin = new THREE.Group(); cabin.name = 'cockpit-cabin';
  const off = [A.eye[0] - EYE0[0], A.eye[1] - EYE0[1], A.eye[2] - EYE0[2]];       // another type's eye: the same cabin round it
  cabin.position.set(off[0], off[1], off[2]);
  root.add(cabin);
  const meshes = [], mats = [], texs = [];
  const mesh = (geo, mat, name, { cast = true, receive = true } = {}) => { const m = new THREE.Mesh(geo, mat); m.name = name; m.castShadow = cast; m.receiveShadow = receive; meshes.push(m); return m; };
  const kitMat = kitMaterial(opts.quality ? (opts.quality.cockpitDetail ?? 1) : 1); mats.push(kitMat);
  cabin.add(mesh(mergeGeometries(B.kit.filter(g => !domeLens.includes(g))), kitMat, 'cockpit-shell'));
  // the dome lights' lenses (kept out of the shell's merge above; baked with it, so by day they are the shell's):
  // the same material with a warm emissive, whose strength update() sets with the night — the lamps read as on,
  // brightest overhead, which is where the cabin's night gradient falls from
  const domeMat = kitMaterial(opts.quality ? (opts.quality.cockpitDetail ?? 1) : 1);
  domeMat.emissive.set(0xffe9c4); domeMat.emissiveIntensity = 0; mats.push(domeMat);
  cabin.add(mesh(mergeGeometries(domeLens), domeMat, 'cockpit-dome'));

  // the atlas (labels and placards), the compass card's uv into it
  atlas.pack();
  const atlasCv = makeCanvas ? makeCanvas(atlas.W, atlas.H) : null;
  if (atlasCv) atlas.render(atlasCv);
  let atlasTex = null;
  if (atlasCv) {
    atlasTex = new THREE.CanvasTexture(atlasCv); atlasTex.format = THREE.RedFormat; atlasTex.colorSpace = THREE.NoColorSpace;
    atlasTex.generateMipmaps = true; atlasTex.minFilter = THREE.LinearMipmapLinearFilter; atlasTex.anisotropy = opts.anisotropy || 8; texs.push(atlasTex);
  }
  for (const g of [...B.decals, ...B.decalsV.pa28, ...B.decalsV.pa44, ...B.decalsPart.map(d => d.g)]) { const uv = atlas.uv(g.userData.it), a = g.attributes.uv; for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1])); }
  const decalMat = decalMaterial(atlasTex, 'labels'); mats.push(decalMat);
  const decalMesh = mesh(mergeGeometries(B.decals), decalMat, 'cockpit-labels', { cast: false }); decalMesh.renderOrder = 1; decalMesh.userData.noAO = true;
  cabin.add(decalMesh);
  // (M6) each type's own: its shell parts and its labels (the throttle quadrant, the placards; the Seminole's gear)
  const VG = { pa28: new THREE.Group(), pa44: new THREE.Group() };
  VG.pa28.name = 'cockpit-pa28'; VG.pa44.name = 'cockpit-pa44'; VG.pa44.visible = false;
  cabin.add(VG.pa28, VG.pa44);
  for (const t of ['pa28', 'pa44']) {
    if (B.kitV[t].length) VG[t].add(mesh(mergeGeometries(B.kitV[t]), kitMat, 'cockpit-shell-' + t));
    if (B.decalsV[t].length) { const m = mesh(mergeGeometries(B.decalsV[t]), decalMat, 'cockpit-labels-' + t, { cast: false }); m.renderOrder = 1; m.userData.noAO = true; VG[t].add(m); }
  }

  // glass
  const glassMat = clearGlassMaterial({ tint: 0x0b1216, env: 1.2, rain: true }); mats.push(glassMat);
  const glassGeo = mergeGeometries(B.glass.map(g => { const n = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal') n.deleteAttribute(k); return n; }));
  const glassMesh = mesh(glassGeo, glassMat, 'cockpit-glass', { cast: false, receive: false }); glassMesh.renderOrder = 2; glassMesh.userData.noAO = true;
  cabin.add(glassMesh);
  // cowling (the Archer's); the Seminole's nose
  const cowlMat = cowlMaterial(); mats.push(cowlMat);
  VG.pa28.add(mesh(B.cowl[0].toNonIndexed(), cowlMat, 'cockpit-cowl'));
  if (twinA) { const noseMat = cowlMaterial(true); mats.push(noseMat); VG.pa44.add(mesh(B.cowl[1].toNonIndexed(), noseMat, 'cockpit-nose')); }

  // the displays and the small instrument canvas
  const glassPanel = createGlass(FL, makeCanvas);
  const pfdMat = screenMaterial(glassPanel.pfd ? glassPanel.pfd.texture : null), mfdMat = screenMaterial(glassPanel.mfd ? glassPanel.mfd.texture : null);
  const dynTex = glassPanel.dyn ? glassPanel.dyn.texture : null;
  const unlitMat = screenMaterial(dynTex, true);
  mats.push(pfdMat, mfdMat, unlitMat);
  if (glassPanel.pfd) glassPanel.setAnisotropy(opts.anisotropy || 8);
  screens.pfd = mesh(scr.pfd[0], pfdMat, 'cockpit-pfd', { cast: false });
  screens.mfd = mesh(scr.mfd[0], mfdMat, 'cockpit-mfd', { cast: false });
  cabin.add(screens.pfd, screens.mfd);
  // the label strips, the black band over them, the G5's screen and the audio panel's lamps: one unlit mesh with vertex
  // colours (lamps change colour); a type's own lamps in an unlit mesh of its own under that type (the Seminole's gear
  // lights: the Archer draws none of them)
  const unlitOf = (lead, list, name) => {
    const geos = [...lead, ...list].map(g => { const n = g.attributes.position.count, c = new Float32Array(n * 3).fill(g.userData.black ? 0 : 1); g.setAttribute('color', new THREE.BufferAttribute(c, 3)); if (!g.attributes.normal) g.computeVertexNormals(); return g; });
    let v = lead.reduce((a, g) => a + g.attributes.position.count, 0);
    const first = list.map(g => { const f = v; v += g.attributes.position.count; return f; });
    return { mesh: mesh(mergeGeometries(geos), unlitMat, name, { cast: false }), first, list };
  };
  const unlit = { all: unlitOf(strips, B.unlit, 'cockpit-lit') }, unlitMesh = unlit.all.mesh;
  cabin.add(unlitMesh);
  for (const l of lamps) { const u = unlit.all; l.first = u.first[l.index]; l.count = u.list[l.index].attributes.position.count; l.col = u.mesh.geometry.attributes.color; }
  const lampCols = [...new Set(lamps.map(l => l.col))];

  // moving parts: each in a group at its pivot (the geometry was built in place)
  const PIV = {
    yokeL: [-YOKE.x, YOKE.y, YOKE.z], yokeR: [YOKE.x, YOKE.y, YOKE.z], pedalsL: [0, 0, 0], pedalsR: [0, 0, 0],
    throttle: [-0.005, LEVER.y, LEVER.z], mixture: [0.045, LEVER.y, LEVER.z], carb: [CARB.x, CARB.y, CARB.z],
    ...Object.fromEntries(Object.entries(TWIN_LV).map(([k, x]) => [k, [x, LEVER44.y, LEVER44.z]])), gearLever: [GEAR.x, GEAR.y, PZ],
    altAir: [0, TWIN_Q.alt.y, PZ + 0.035], cowlFlaps: [0, ...TWIN_Q.cowl.pivot], brakeK: [SEM.brake.c[0], SEM.brake.c[1], PZ],
    flap: [0, FLAP.y, FLAP.z], trim: [0, TRIMW.y, TRIMW.z], trimInd: [TRIMW.ind.x, FCON.y1, TRIMW.z], fuel: FUELSEL.c, brake: [BRAKE.x, BRAKE.y, BRAKE.z],
    flap44: [CON44.flap.x, CON44.flap.y, CON44.flap.z], trim44: [CON44.trim.x, CON44.trim.y, CON44.trim.z], trimInd44: [CON44.trim.ind.x, CON44.hump.y, CON44.trim.z],
    rudTrim: [CON44.rud.x, FCON.y1, CON44.rud.z], fuelL: [CON44.fuel.x - CON44.fuel.dx, FCON.y1 + 0.004 - CON44.fuel.pivot, CON44.fuel.z], fuelR: [CON44.fuel.x + CON44.fuel.dx, FCON.y1 + 0.004 - CON44.fuel.pivot, CON44.fuel.z],
  };
  const parts = {}, CASTS = new Set(['yokeL', 'yokeR', 'throttle', 'mixture', 'flap', 'flap44', 'thrL', 'thrR']);   // the small ones cast no shadow
  for (const [name, list] of B.moving) {
    if (!PIV[name]) throw new Error('cockpit: no pivot for the moving part ' + name);
    const p = PIV[name], g = mergeGeometries(list); g.translate(-p[0], -p[1], -p[2]);
    const grp = new THREE.Group(); grp.name = 'cockpit-' + name; grp.position.set(p[0], p[1], p[2]);
    grp.add(mesh(g, kitMat, 'cockpit-' + name, { cast: CASTS.has(name) }));
    (B.partV.has(name) ? VG[B.partV.get(name)] : cabin).add(grp); parts[name] = grp;
  }
  parts.fuel.quaternion.setFromAxisAngle(FUEL_AXIS, FUEL_ANG[switches.fuelSel] || 0);      // (as update() poses it)
  // the prints that ride on a moving part (the Seminole's park brake knob's face): the labels' material, under the part
  for (const { g, part } of B.decalsPart) {
    if (!parts[part]) continue;
    const p = PIV[part]; g.translate(-p[0], -p[1], -p[2]);
    const m = mesh(g, decalMat, 'cockpit-' + part + '-print', { cast: false }); m.renderOrder = 1; m.userData.noAO = true; parts[part].add(m);
  }
  // the compass card (labels material, turns about y)
  { const uv = atlas.uv(B.cardGeo.userData.it), a = B.cardGeo.attributes.uv;
    for (let i = 0; i < a.count; i++) a.setXY(i, uv[0] + a.getX(i) * (uv[2] - uv[0]), uv[1] + a.getY(i) * (uv[3] - uv[1]));
    withCol(withMat(B.cardGeo, 0.5, 0, 1, 0.55), 0xf0efe8); B.cardGeo.translate(-COMPASS[0], -COMPASS[1], -COMPASS[2]);
    const grp = new THREE.Group(); grp.position.set(COMPASS[0], COMPASS[1], COMPASS[2]); grp.name = 'cockpit-compass';
    const cm = mesh(B.cardGeo, decalMaterial(atlasTex, 'card', 0x121212), 'cockpit-compass-card', { cast: false }); mats.push(cm.material);
    grp.add(cm); cabin.add(grp); parts.compass = grp;
  }
  // the rocker switches: an instanced mesh a type, posed in update() — the Archer's (the overhead panel and the block
  // under the audio panel), the Seminole's (its panel's banks): black —; each type's rockers' print in an instanced mesh
  // of its own (the labels' material, each quad's place in the atlas per instance: it turns with its rocker)
  const blk = new THREE.Color(0x1f2023);
  B.add(rockerShape(), { c: 0xffffff, r: 0.38 });
  const rkGeo0 = B.kit.pop(), printMat = decalMaterial(atlasTex, 'rocker-print', null, true); mats.push(printMat);
  const rkSets = [];                                         // { inst, prints, n, m, key, kind, p0, p1, L (the print's local matrices), last }
  for (const t of ['pa28', 'pa44']) {
    const R = RKS[t];
    if (!R.list.length) continue;
    const rkGeo = rkGeo0.clone(), sfx = t === 'pa28' ? '' : '-' + t;
    { const q = rkGeo.clone().applyMatrix4(R.list.find(r => r.key === 'master').m); bakeAO(q, cache); rkGeo.attributes.cdMat.copy(q.attributes.cdMat); }   // (its occlusion where BATT MASTR sits)
    const inst = new THREE.InstancedMesh(rkGeo, kitMat, R.list.length);
    inst.name = 'cockpit-rockers' + sfx; inst.castShadow = false; inst.receiveShadow = true; meshes.push(inst);
    for (let i = 0; i < R.list.length; i++) inst.setColorAt(i, blk);
    VG[t].add(inst);
    const printGeo = withCol(withMat(new THREE.PlaneGeometry(1, 1).toNonIndexed(), 0.5, 0, 1, 0.85), INK), uvRect = new Float32Array(R.print.length * 4);
    R.print.forEach((q, j) => uvRect.set(atlas.uv(q.it), j * 4));
    printGeo.setAttribute('uvRect', new THREE.InstancedBufferAttribute(uvRect, 4));
    const prints = new THREE.InstancedMesh(printGeo, printMat, R.print.length);
    prints.name = 'cockpit-rocker-print' + sfx; prints.castShadow = false; prints.receiveShadow = true; prints.renderOrder = 1; prints.userData.noAO = true; meshes.push(prints);
    VG[t].add(prints);
    rkSets.push({ inst, prints, n: R.list.length, m: R.list.map(r => r.m), key: R.list.map(r => r.key), kind: R.list.map(r => r.kind), p0: R.list.map(r => r.p0), p1: R.list.map(r => r.p1),
      L: R.print.map(q => q.L), last: new Array(R.list.length).fill(-1) });
  }
  rkGeo0.dispose();

  // the hit meshes: on their moving part, or on the cabin; the aim points in the cockpit's (root's) frame
  for (const c of controls) { c.at.x += off[0]; c.at.y += off[1]; c.at.z += off[2]; }
  for (const h of hits) {
    if (h.part && parts[h.part]) { const p = PIV[h.part]; h.mesh.position.x -= p[0]; h.mesh.position.y -= p[1]; h.mesh.position.z -= p[2]; parts[h.part].add(h.mesh); }
    else hitRoot.add(h.mesh);
  }
  cabin.add(hitRoot);

  // ============================================================ the instructor's seat (right): where his hips, ankles and eyes go
  const v3 = (x, y, z) => [x + off[0], y + off[1], z + off[2]];
  const instructorSeat = { hip: v3(...INSTRUCTOR.hip), ankleL: v3(0.21, -0.25, -1.06), ankleR: v3(0.39, -0.25, -1.06), eye: v3(0.30, 0.625, -0.40), yaw: Math.PI, seatY: INSTRUCTOR.seatY + off[1] };

  let triangles = 0;
  // (the Archer's view: the Seminole's own parts are hidden then; trianglesTwin the Seminole's)
  let trianglesTwin = 0;
  const inType = (m, g) => { for (let o = m; o; o = o.parent) if (o === g) return true; return false; };
  for (const m of meshes) {
    const n = (m.geometry.index ? m.geometry.index.count : m.geometry.attributes.position.count) / 3 * (m.isInstancedMesh ? m.count : 1);
    if (!inType(m, VG.pa44)) triangles += n;
    if (!inType(m, VG.pa28)) trianglesTwin += n;
  }

  // what update() works with (made here, once)
  const RK_Q = new THREE.Quaternion(), RK_M = new THREE.Matrix4(), RK_M2 = new THREE.Matrix4(), RK_E = new THREE.Euler();
  const avSeen = { pfdMenu: '', wind: null, baroUnit: '', mfdPage: '', north: null, mic: '', c1: null, c2: null, n1: null, n2: null, powered: null, cdi: '' };
  const comp = { a: 0, v: 0, init: false };
  const t = { pfd: 1, mfd: 1, stby: 1 };
  const RATE = { pfd: 1 / 30, mfd: 1 / 10, stby: 1 / 15 };
  let visible = true, flapAng = 0, night = -1, g5On = null;

  // ================================================================ per frame (no allocation below this line)
  function avChanged(av, powered) {
    const a = av.audio, m = a.monitor;
    if (avSeen.pfdMenu === av.pfdMenu && avSeen.wind === av.wind && avSeen.baroUnit === av.baroUnit && avSeen.mfdPage === av.mfdPage && avSeen.north === av.mapNorthUp
      && avSeen.mic === a.mic && avSeen.c1 === m.COM1 && avSeen.c2 === m.COM2 && avSeen.n1 === m.NAV1 && avSeen.n2 === m.NAV2 && avSeen.powered === powered && avSeen.cdi === av.cdi) return false;
    avSeen.pfdMenu = av.pfdMenu; avSeen.wind = av.wind; avSeen.baroUnit = av.baroUnit; avSeen.mfdPage = av.mfdPage; avSeen.north = av.mapNorthUp;
    avSeen.mic = a.mic; avSeen.c1 = m.COM1; avSeen.c2 = m.COM2; avSeen.n1 = m.NAV1; avSeen.n2 = m.NAV2; avSeen.powered = powered; avSeen.cdi = av.cdi;
    return true;
  }
  function lampOn(key, av) {
    if (!key || !av) return false;
    const a = av.audio;
    if (key === 'micCOM1') return a.mic === 'COM1';
    if (key === 'micCOM2') return a.mic === 'COM2';
    if (key === 'monCOM1') return !!a.monitor.COM1;
    if (key === 'monCOM2') return !!a.monitor.COM2;
    if (key === 'monNAV1') return !!a.monitor.NAV1;
    return key === 'monNAV2' && !!a.monitor.NAV2;
  }
  function setLamps(av, powered) {
    for (let i = 0; i < lamps.length; i++) {
      const l = lamps[i], on = powered && lampOn(l.key, av);
      for (let k = 0; k < l.count; k++) l.col.setXYZ(l.first + k, on ? 0.35 : 0.035, on ? 1.0 : 0.04, on ? 0.45 : 0.035);
    }
    for (let i = 0; i < lampCols.length; i++) lampCols[i].needsUpdate = true;
  }
  // the rockers of each type, each turned by its switch about its pivot (two positions: ON — the lower half in —, OFF —
  // the upper half in: its print OFF —; three: the top half in, level, the bottom half in; START and PRIMER in while held:
  // START while the starter turns; the Seminole's START: level, its left or right half in while that engine's starter is
  // held), its print with it
  function poseRockers(dt) {
    if (pressT.primer > 0) pressT.primer = Math.max(0, pressT.primer - dt);
    for (let k = 0; k < rkSets.length; k++) {
      const R = rkSets[k];
      let changed = false;
      for (let i = 0; i < R.n; i++) {
        const key = R.key[i], kind = R.kind[i];
        let st = 0;
        if (kind === 3) st = POS3[key][0].indexOf(switches[POS3[key][1]]);
        else if (kind === 'h') st = switches.start === 'L' ? 1 : switches.start === 'R' ? 2 : 0;
        else if (key === 'primer' ? pressT.primer > 0 : switches[key]) st = 1;
        if (R.last[i] === st) continue;
        R.last[i] = st; changed = true;
        RK_E.set(kind === 3 ? (1 - st) * RK.tilt : kind === 'h' ? (st === 1 ? -RK.tilt : st === 2 ? RK.tilt : 0) : st ? RK.tilt : -RK.tilt, 0, 0); RK_Q.setFromEuler(RK_E);
        RK_M.makeRotationFromQuaternion(RK_Q).premultiply(R.m[i]);
        R.inst.setMatrixAt(i, RK_M);
        for (let j = R.p0[i]; j < R.p1[i]; j++) R.prints.setMatrixAt(j, RK_M2.multiplyMatrices(RK_M, R.L[j]));
      }
      if (changed) { R.inst.instanceMatrix.needsUpdate = true; R.prints.instanceMatrix.needsUpdate = true; }
    }
  }
  // dt (s); o: { s, L, av (default L.av), parkBrake, night 0..1, eng: { rpm, run } (the engine as the systems have it, for
  // the MFD's tachometer; default the physics'), rTrim (the rudder trim, flight/controls.js's: the Seminole's wheel shows
  // it; default 0) }
  function update(dt, o) {
    if (!o) return;
    if (!(dt >= 0)) dt = 0; else if (dt > 0.25) dt = 0.25;
    const s = o.s || null, av = o.av || (o.L ? o.L.av : null);
    cur.s = s; cur.av = av; cur.L = o.L || null;
    // (B2) the rain on the glass: the amount is the title's weather (render/materials.js setGlassRain, eased
    // there), the airflow over the windshield is the indicated airspeed
    tickGlassRain(dt, s && s.out ? s.out.ias || 0 : 0);
    poseRockers(dt);
    const nt = clamp(o.night || 0, 0, 1);
    if (nt !== night) {
      night = nt;
      decalMat.emissiveIntensity = 0.7 * nt; printMat.emissiveIntensity = 0.7 * nt; domeMat.emissiveIntensity = 1.5 * nt;
      pfdMat.color.setScalar(1 - 0.45 * nt); mfdMat.color.setScalar(1 - 0.45 * nt); unlitMat.color.setScalar(1 - 0.35 * nt);
    }
    if (!s) return;
    // the controls: the yokes ride fore and aft with the stabilator (elevator + trim; aft = nose up) and turn with
    // the ailerons; the pedals with the rudder after the auto-rudder; the levers, the flap handle (eased between its
    // detents; its grip forward, up for more flap), the trim wheel and its pointer (forward: nose down), the fuel
    // selector (about its plate's normal), the park brake handle (the Archer's) or knob (the Seminole's); carb heat ON
    // is down, OFF up
    const pc = clamp((s.elev || 0) + (s.trim || 0), -1, 1), roll = -clamp(s.ail || 0, -1, 1) * YOKE.roll;
    parts.yokeL.position.z = YOKE.z + pc * YOKE.travel; parts.yokeL.rotation.z = roll;
    parts.yokeR.position.z = YOKE.z + pc * YOKE.travel; parts.yokeR.rotation.z = roll;
    const rud = clamp((s.rudEff != null ? s.rudEff : s.rud) || 0, -1, 1);
    parts.pedalsL.position.z = rud * PEDAL.travel; parts.pedalsR.position.z = -rud * PEDAL.travel;
    const thrA = -(LEVER.idle + (LEVER.full - LEVER.idle) * clamp(s.thr || 0, 0, 1)), mixA = -(LEVER.idle + (LEVER.full - LEVER.idle) * clamp(switches.mixture, 0, 1));
    if (type === 'pa44' && parts.thrL) {
      // the Seminole's: the throttle and propeller pairs (the propellers pulled back into the feather detent at the slots'
      // aft end and pushed forward again while they are cycled — the ground check's feather check), each mixture its own; the alternate air pair (CLOSE up, OPEN down), the cowl flap pair (forward
      // OPEN), the gear selector up or down, the park brake knob out when set
      const pc = switches.propCycleT > 0 ? Math.sin(Math.PI * clamp(1 - switches.propCycleT / 2.6, 0, 1)) : 0;
      const propA = -(LEVER.full - (LEVER.full - LEVER.idle) * pc), mixRA = -(LEVER.idle + (LEVER.full - LEVER.idle) * clamp(switches.mixtureR ?? 1, 0, 1));
      parts.thrL.rotation.x = thrA; parts.thrR.rotation.x = thrA; parts.mixL.rotation.x = mixA; parts.mixR.rotation.x = mixRA;
      parts.propL.rotation.x = propA; parts.propR.rotation.x = propA;
      parts.altAir.rotation.x = switches.altAir ? TWIN_Q.alt.open : TWIN_Q.alt.close;
      parts.cowlFlaps.rotation.x = TWIN_Q.cowl.ang[switches.cowlFlaps] || 0;
      parts.gearLever.rotation.x = s.gearDown === false ? GEAR.up : GEAR.down;
      parts.brakeK.position.z = PZ + (o.parkBrake ? SEM.brake.pull : 0);
    } else {
      parts.throttle.rotation.x = thrA; parts.mixture.rotation.x = mixA; parts.carb.rotation.x = switches.carbHeat ? CARB.ang : -CARB.ang;
    }
    const fi = clamp(s.flapIdx | 0, 0, FLAP.det.length - 1);
    flapAng += (FLAP.det[fi] - flapAng) * (1 - Math.exp(-dt * 12));
    parts.flap.rotation.x = flapAng;
    const tr = clamp((s.trim || 0) / P.TRIM_MAX, -1, 1);
    parts.trim.rotation.x = tr * TRIMW.turns * Math.PI * 2; parts.trimInd.position.z = TRIMW.z + tr * TRIMW.ind.len / 2;
    parts.fuel.quaternion.setFromAxisAngle(FUEL_AXIS, FUEL_ANG[switches.fuelSel] || 0);
    parts.brake.rotation.x = o.parkBrake ? -BRAKE.ang : 0;                                // (the grip swings aft)
    if (parts.flap44) {
      // the Seminole's console: its flap handle and stabilator trim wheel as the Archer's; the rudder trim wheel (o.rTrim:
      // the game's rudder trim, −max … max, right +: turned clockwise as seen from aft, its index towards R), each fuel
      // selector lever (ON forward, X FEED aft)
      const C = CON44;
      parts.flap44.rotation.x = flapAng;
      parts.trim44.rotation.x = tr * C.trim.turns * Math.PI * 2; parts.trimInd44.position.z = C.trim.z + tr * C.trim.ind.len / 2;
      parts.rudTrim.rotation.z = 0 - clamp((o.rTrim || 0) / C.rud.max, -1, 1) * C.rud.ang;   // (seen from aft clockwise: R)
      parts.fuelL.rotation.x = FSEL_ANG[switches.fuelSelL] || 0; parts.fuelR.rotation.x = FSEL_ANG[switches.fuelSelR] || 0;
    }
    // the wet compass: the card follows the magnetic heading, a little behind and swinging (damped)
    const mag = ((s.out.hdgTrue || 0) + P.MAGVAR_W) * DEG;
    if (!comp.init) { comp.a = mag; comp.v = 0; comp.init = true; }
    let da = mag - comp.a; da -= Math.round(da / (Math.PI * 2)) * Math.PI * 2;
    for (let left = dt; left > 1e-9; left -= 0.02) {
      const h = Math.min(left, 0.02);
      comp.v += (da * 9 - comp.v * 3.6) * h; comp.a += comp.v * h; da -= comp.v * h;
    }
    parts.compass.rotation.y = comp.a;
    // the displays: on a schedule, only when seen; black without power — the G1000 NXi's buses (both types'): the PFD,
    // the G5 and the audio panel on the essential bus (BATT MASTR ON, or EMERG BATT ARM: the emergency battery), the MFD
    // on the avionics bus (AVION MASTER too, from the main bus); the Seminole's MFD dark, its PFD shows the landing gear
    // as the reversionary display would (VB-2636 7.11)
    if (!visible) return;
    const ess = !!(switches.master || switches.emergBatt), avb = !!(switches.master && switches.avionics), powered = (ess ? 1 : 0) + (avb ? 2 : 0), g5 = ess;
    t.pfd += dt; t.mfd += dt; t.stby += dt;
    if (av && avChanged(av, powered)) {
      glassPanel.drawStrips(av, ess, avb); setLamps(av, ess);
      if (!ess) glassPanel.blankScreen('pfd');
      if (!avb) glassPanel.blankScreen('mfd');
      t.pfd = RATE.pfd; t.mfd = RATE.mfd;
    }
    if (av) {
      if (ess && t.pfd >= RATE.pfd - 1e-6) { t.pfd = Math.min(t.pfd - RATE.pfd, RATE.pfd); glassPanel.drawScreen('pfd', s, av, o.eng, type === 'pa44' && !avb); }
      if (avb && t.mfd >= RATE.mfd - 1e-6) { t.mfd = Math.min(t.mfd - RATE.mfd, RATE.mfd); glassPanel.drawScreen('mfd', s, av, o.eng); }
    }
    if (g5 !== g5On) { g5On = g5; if (!g5) glassPanel.blankStandby(); t.stby = RATE.stby; }
    if (g5 && t.stby >= RATE.stby - 1e-6) {
      t.stby = Math.min(t.stby - RATE.stby, RATE.stby);
      const baro = av ? av.baro : s.qnh;
      glassPanel.drawStandby(s.out, AV.indicatedAlt(s.out.altTrue || 0, s.qnh, baro), baro, !!(av && av.baroUnit === 'HPA'), s.A.v);
    }
  }
  // ================================================================ end of the per-frame code

  // where to aim at a control now (world): its aim point, carried by its moving part
  function aimPoint(ctl, out) { return out.copy(ctl.aimLocal).applyMatrix4(ctl.target.matrixWorld); }
  function pick(raycaster) {
    if (!visible) return null;                                // (the raycaster sees hidden objects: not in the chase view)
    const mask = raycaster.layers.mask;
    raycaster.layers.set(PICK_LAYER);
    const out = raycaster.intersectObject(cabin, true);
    raycaster.layers.mask = mask;
    for (const h of out) { const c = h.object.userData.control; if (c && (!c.type || c.type === type)) return c; }
    return null;
  }
  // (M6) the type the cockpit is in: the Archer's quadrant and cowling, or the Seminole's levers, gear and nose
  const byType = { pa28: controls.filter(c => c.type !== 'pa44'), pa44: controls.filter(c => c.type !== 'pa28') };
  function setType(t) {
    if (t === 'pa44' && !twinA) t = 'pa28';
    type = t; VG.pa28.visible = t === 'pa28'; VG.pa44.visible = t === 'pa44'; avSeen.powered = null;
  }
  poseRockers(0);
  const bytes = glassPanel.bytes + (atlasCv ? Math.round(atlas.W * atlas.H * 4 / 3) : 0);      // the atlas: one byte a texel, mipmapped
  return {
    root, eye: new THREE.Vector3(A.eye[0], A.eye[1], A.eye[2]), instructorSeat, screens, switches, parts, pick, aimPoint, update, setType, band,
    fromCode: ['headliner', 'seats', 'bench', 'glareshield', 'yokes', 'walls'].filter(g => !fromModel(g)),     // (the groups the model lacked: made here)
    get controls() { return byType[type]; }, get type() { return type; }, allControls: controls,
    setVisible(v) { visible = !!v; root.visible = visible; if (visible) { avSeen.powered = null; g5On = null; t.pfd = RATE.pfd; t.mfd = RATE.mfd; t.stby = RATE.stby; } },
    get visible() { return visible; },
    markDirty() { avSeen.powered = null; g5On = null; },
    setAnisotropy(n) { glassPanel.setAnisotropy(n); if (atlasTex) { atlasTex.anisotropy = n; atlasTex.needsUpdate = true; } },
    triangles, trianglesTwin, meshes, textureBytes: bytes, atlasFull: atlas.full, atlasUsed: atlas.used, atlasScale: atlas.k, stats: glassPanel.stats,
    dispose() {
      for (const m of meshes) m.geometry.dispose();
      for (const R of rkSets) { R.inst.dispose(); R.prints.dispose(); }       // (their instance buffers)
      for (const g of hitGeos) g.dispose();
      for (const m of mats) m.dispose();
      hitMat.dispose(); glassPanel.dispose(); for (const tx of texs) tx.dispose();
      root.removeFromParent();
    },
  };
}
