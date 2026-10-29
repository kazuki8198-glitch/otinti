# CADET — tools/aircraft/cockpit_yokes.py : the two control wheels of the flown aircraft's cabin (aircraft/cockpit.js) and
# their boots at the panel, for tools/aircraft/build_cockpit.py (the group 'yokes'; the run, the helpers and the protocol
# are that script's):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-]
#   (a group alone, for its previews: … -- /tmp/cockpit.json /tmp/trial.glb /tmp/prev band,yokes — never into assets/model,
#   which must hold every group; tools/aircraft/trial-glb.mjs runs the game's tests against such a trial model)
# - each yoke (moving parts yokeL, yokeR; the G1000 NXi Archer's M600-style wheel, the same for both seats — Piper's TX,
#   LX Steel and Seminole NXi photos): a moulded wedge of a hub, a tall shield (0.134 m from its foot to its cap's top,
#   ~72 % of the grips' height as in Piper's TX and Seminole NXi panel photos, where the cap's top is ~70–73 % of the
#   way from the hub's foot to the grips' tops — round R3: the Seminole's old switch row, which held it to 0.11 m, is
#   gone),
#   widest at its foot where the horns grow out of it, narrowing fast up its flanks to where the arms leave them and
#   then gently to its top (the TX photo's tall plate: its sides nearly straight above the arms, its top ~half its
#   foot's width), its
#   aft face one plane leaning forward 15° (towards the pilot, who looks down at it ~40°), a raised plate covering that
#   face a shade lighter than the hub, carrying Piper's chevron in its lower half (two light-grey triangles, raised: a
#   large one cut by a diagonal gap from a small one at its lower right — modelled: no print on a moving part; its base
#   ~a quarter of the way up the hub, its apex under the half, ~2/3 of the plate's width there, as in the TX photo),
#   and a rounded cap on the hub's top, narrower than it (its shoulders either side), jutting aft over the plate's top
#   edge; the boss forward of it round the shaft (a collar, open at its front, which faces the panel and is
#   never seen); two thick horns, each one sweep of an oval section out of the hub's lower half (their underside on the
#   hub's foot line), round two bends (horizontal → 45° → upright: the hit boxes leave the bend no other room) into a
#   fat grip, the horn and the grip one moulding (a pebbled finish), the grip's top hooked aft and inboard so that its
#   top face looks up at the pilot. On the outboard
#   grips (the left yoke's left, the right yoke's right) a switch pod on that face: a black housing, the split electric-
#   trim rocker on it, the red autopilot-disconnect / trim-interrupt button at its inboard end (the pilot's yoke only:
#   the table has no red for the right yoke), the push-to-talk trigger under the hooked top on the grip's forward face;
#   on the inboard grips a plain black pad on that face. The shaft straight forward through the panel, a black-finished
#   tube (Piper's NXi photos show no bright metal), open at its front (always behind the panel face).
# - the boots (yokes.rubber, static): a small rubber grommet round each shaft where it goes into the panel, its lip on it;
#   no wider than the room under the PFD's bezel (15 mm from the shaft's axis to the bezel's bevelled lower edge).
# Made in place at the rest pose: cockpit.js turns each yoke's group about the shaft's axis through its pivot
# (∓yoke.x, yoke.y, yoke.z) (roll ±yoke.roll) and slides it along z (±yoke.travel), so the shaft lies on that axis; the
# shaft reaches 40 mm behind the panel face (pz) even at full aft travel. Everything else stays inside the yokes' hit
# boxes (yokeHit: the hub's box, its top's — the hub's narrower upper part — and the horns', which stay in code: picking
# takes the first box a ray meets) and the arms' corridor between them, and out of the lines of sight from the eye to
# the screens' image, to the controls behind the yokes (cockpit.test.mjs: the PFD's and MFD's corners at rest; the aim
# points with a little nose-up trim — copied below,
# as the spec does not carry them), and to what the panel keeps beside and under the yokes (the G5, the dimmers, the
# alternate static, the quadrant's levers and carb heat, the switch block under the audio panel, the Seminole's engine
# switches and left bank: at rest and trimmed), and the hit boxes out of the controls' lines of sight;
# check() asserts all of it, with a margin.
# Coordinates and nodes: build_cockpit.py's (the cabin's frame, metres, x right, y up, z aft); built in each yoke's own
# frame (its pivot at the origin) and moved there. Nodes "yokes.<surface>.yokeL|yokeR" (yoke: the hub, its plate and cap,
# the boss; grip: the horns and grips, the pebbled moulding; alu: the chevron; chrome: the shaft — the node keeps the
# table's polished-metal surface for the tube's sheen, cockpit.test.mjs lists it, but its colour is a black finish, not
# the table's chrome; black: the pod, its rocker, the push-to-talk, the inboard pad; red: the disconnect) and
# "yokes.rubber" (the boots). COLOR_0: rgb = the table's colour (cockpit.js's S) — the plate's face lighter, its bevelled
# rim darker (the groove round it), the shaft's the black finish; alpha = the local occlusion (build_cockpit.py bakes it:
# a moving part's from its own pieces only).
import math

GROUPS = ('yokes',)
MAX_TRIS = 2800                       # (it replaces cockpit.js's 2,656 moving triangles of the yokes and 192 of the boots)
DEG = math.pi / 180

# the views of the preview: yaw, pitch [, eye] (build_cockpit.py: yaw 0 looks forward, + to the left)
PREVIEW = {
    'seat': (0, -38),                                    # the left yoke as the pilot sees it
    'seatClose': (0, -43, (-0.30, 0.45, -0.58)),         # the same, nearer along his line of sight
    'right': (-50, -27),                                 # the right yoke from the left seat (Piper's LX Steel close-up)
    'photo': (0, -14, (0.0, 0.60, -0.30)),               # both, from the middle of the cabin (Piper's TX panel photo)
    'front': (0, -4, (-0.30, 0.25, -0.58)),              # the left yoke level from behind (the Seminole NXi photo)
    'hub': (0, -40, (-0.30, 0.36, -0.68)),               # the left hub close
    'pod': (-22, -42, (-0.47, 0.42, -0.77)),             # the left grip's pod close
    'profile': (90, -4, (-0.02, 0.29, -0.845)),          # the left yoke side on (looking along −x)
    'trigger': (160, 10, (-0.40, 0.29, -1.0)),           # the left grip's forward face from the panel (the push-to-talk)
}

# ---------------------------------------------------------------- the shape (in the yoke's frame: the pivot at the origin)
N = 12                                # points round the horns' section (every edge round it turns ≤ 32°: smooth)
SUPER = 2.2                           # the section's squareness (a superellipse: 2 an ellipse)
SHAFT_R, SHAFT_SEG = 0.013, 16        # the shaft: 26 mm, its sides only (its ends are hidden)
SHAFT_Z0, SHAFT_REACH = -0.034, 0.040  # its back end (inside the collar); how far behind the panel at full aft travel
# the hub: horizontal rounded-rectangle rings (x across, z fore and aft) up its height; its outline (HUB_W: y, half-width,
# corners' radius) at the foot (HUB_YB), where the arms leave its flanks and at the top (HUB_YT), straight between them —
# the sides lean in ~18° beside the arms, ~6° above them, kept inside the hit boxes: the hub's (±0.059 up to y 0.035)
# and its top's (±0.037 over it) —, its aft face's z at the foot and the top (HUB_ZA: one plane leaning forward 15°),
# the front face upright at HUB_ZF; the rings (y, how far in from that outline): the foot's bevel, the side (a ring where
# its lean changes), the top's rounded edge. Its height: the aircraft's (above); from the seat its cap hides the panel up
# to y ~0.17 behind it (x −0.34…−0.26: blank on both types — the Seminole's engine switches, fuel pumps and left bank
# stand round that window, cockpit.js SEM); its top's hit box (to y 0.103) passes well under the line from the eye to
# the door's handle (cockpit.js WALLS.door.cup.aim) over the right yoke's hub.
HUB_YB, HUB_YT, HUB_ZF = -0.034, 0.089, -0.024
HUB_W = [(-0.034, 0.056, 0.0085), (0.030, 0.0365, 0.0078), (0.089, 0.031, 0.0068)]
HUB_ZA = (0.031, -0.002)
HUB_RINGS = [(-0.034, 0.004), (-0.031, 0.0), (0.030, 0.0), (0.086, 0.0), (0.0872, 0.0015), (0.089, 0.004)]
# the plate on the aft face (the face's own frame: x across, s up the slope from PLATE_Y0, n out of it): a rounded
# outline (its foot's corner radius, its height up the slope) whose sides follow the face's flat part (the hub's outline
# less its corners' radius) PLATE_EDGE in from it (PLATE_EXTRA more points up each side), its foot sunk in the face,
# raised PLATE_H with a bevelled rim PLATE_IN wide; its top hides under the cap. The plate a shade lighter than the hub,
# its rim (the groove the photos show round it) darker.
PLATE_Y0, PLATE_R, PLATE_S, PLATE_EDGE, PLATE_EXTRA = -0.0265, 0.007, 0.109, 0.0025, 4
PLATE_SINK, PLATE_H, PLATE_IN = 0.0005, 0.0012, 0.0006
PLATE_K, PLATE_RIM_K = 1.4, 0.6
# Piper's chevron (the photos' outline, the base 0…1 across): the large piece (its left foot, the gap's foot, the gap's
# top on the right edge, the apex) and the small one (the gap's other foot, the right foot, the gap's top) — the gap a
# band parallel to the large piece's cut; its width across and where its base sits up the plate (its lower half, as on
# the aircraft); raised, its foot sunk
CHEVRON = ([(0, 0), (0.505, 0), (0.709, 0.3335), (0.534, 0.534)], [(0.592, 0), (1, 0), (0.757, 0.2785)])
LOGO_W, LOGO_S, LOGO_H, LOGO_SINK = 0.048, 0.026, 0.0006, 0.0003
# the cap on the hub's top: rings (y, half-width, front z, aft z — over the aft face's z there —, corner radius) from its
# foot (buried in the hub) up its side (jutting ~1 cm aft of the plate) and round its top edge; a low dome over it
CAP = [(0.0731, 0.015, -0.0175, -0.0014, 0.005), (0.0796, 0.020, -0.0205, 0.0105, 0.0075), (0.0951, 0.020, -0.0205, 0.0105, 0.0075),
       (0.0979, 0.0192, -0.0197, 0.0097, 0.0067), (0.0995, 0.0172, -0.0177, 0.0077, 0.0047)]
CAP_TOP = 0.1000
# the boss and the collar (r, z) from the collar's front edge back into the hub: the collar (open at its front; the
# shaft fills it), the boss widening from its back edge into the hub
BOSS = [(0.0168, -0.0446), (0.0172, -0.0350), (0.0196, -0.0200)]
COLLAR_FRONT, COLLAR_BACK = 0, 1                      # (BOSS's rings)
BOSS_SEG = 12
# the horn (the right one; the left mirrored): its sections along one sweep — (the centre (x, y, z), the sweep's
# direction there: in the x–y plane at an angle (degrees from +x), or for the hooked top tilted aft and inboard
# (degrees), the half-thickness across, the half-depth forward / aft) — from inside the hub out along the arm, round the
# first bend (radius 40 mm about ARC1) onto a 45° run, round the second (35 mm about ARC2) up into the grip, the grip
# filling out towards its top, and the top tilting until its face looks up, aft and inboard (the last ring, then a low
# dome). The first two sections flare the arm into the hub's flank (a moulded fillet: the arm's top rises into it, its
# underside runs on along the hub's foot). The hit boxes shape the bend: the horns' box starts at y 0 (no part of the
# horn under it outboard of x 0.131) and the corridor stops at y 0.05, so the 45° run crosses x 0.131 between the two
# with its full 34 mm.
ARC1, R1, ARC2, R2 = (0.0764, 0.0275), 0.040, (0.1185, 0.0625), 0.035
def _a1(t): return (ARC1[0] + R1 * math.sin(t * DEG), ARC1[1] - R1 * math.cos(t * DEG))
def _a2(t): return (ARC2[0] + R2 * math.cos(t * DEG), ARC2[1] + R2 * math.sin(t * DEG))
HORN = [((0.024, -0.0060, -0.0015), 0, 0.0220, 0.0130, 0.0090),       # (the root, inside the hub: open)
        ((0.044, -0.0085, 0.0040), 0, 0.0250, 0.0180, 0.0185),         # (the fillet out of the hub's side)
        (_a1(0) + (0.0045,), 0, 0.0210, 0.0185, 0.0190),
        (_a1(22.5) + (0.0050,), 22.5, 0.0192, 0.0185, 0.0180),
        (_a1(45) + (0.0055,), 45, 0.0178, 0.0185, 0.0160),
        ((0.1240, 0.0185, 0.0060), 45, 0.0172, 0.0185, 0.0150),
        (_a2(-45) + (0.0065,), 45, 0.0170, 0.0188, 0.0158),
        (_a2(-22.5) + (0.0070,), 67.5, 0.0172, 0.0192, 0.0175),
        (_a2(0) + (0.0080,), 90, 0.0175, 0.0198, 0.0190),
        ((0.1525, 0.0940, 0.0085), 92, 0.0188, 0.0205, 0.0200),
        ((0.1515, 0.1135, 0.0095), (13, 10), 0.0198, 0.0205, 0.0198),
        ((0.1510, 0.1225, 0.0110), (26, 20), 0.0193, 0.0198, 0.0190),
        ((0.1500, 0.1290, 0.0128), (38, 30), 0.0186, 0.0188, 0.0180)]
DOME_H = 0.0015                       # the top's low dome over the last ring
# the switch pod on the outboard grip's top face (that face's frame: across, fore and aft, out): a rounded rectangle
# (half sizes, corner; then out of the face: its foot, sunk under it, its side's top, a bevel in, its flat top) — the
# inboard grip's pad the same, smaller, thinner and unbevelled
POD = (0.0145, 0.0120, 0.006, -0.002, 0.0055, 0.0012, 0.0065)          # hu, hw, r, foot, side top, bevel in, top
PAD = (0.0125, 0.0105, 0.006, -0.0015, 0.0028, 0, 0.0028)
# on the pod's top: the trim rocker's two halves side by side (its centre across / fore and aft, a half's half sizes
# across, out, fore and aft, the gap between them; its foot sunk 0.4 mm), the disconnect (across, fore and aft, radius,
# height out of the top, sides)
TRIM = (-0.0030, 0.0020, 0.0027, 0.0013, 0.0055, 0.0008)
APD = (0.0078, -0.0025, 0.0032, 0.0022, 8)
# the push-to-talk trigger: a block out of the grip's forward face under the hooked top (centre, half sizes)
PTT = ((0.1508, 0.1040, -0.0108), (0.0060, 0.0045, 0.0035))
# the boots (in the cabin's frame, round each shaft): (r, z off the panel face) from inside the panel out to the lip; the
# ring turned half a step (its top a flat edge under the PFD's bezel, at r·cos 15°)
BOOT = [(0.0149, -0.0010), (0.0147, 0.0040), (0.0138, 0.0072)]
BOOT_SEG, BOOT_PHASE = 12, 15 * DEG

# what must stay seen past the yokes from the eye (cockpit.test.mjs; probed from cockpit.js's own build, in the cabin's
# frame): the screens' image points (corners, edge middles, 1 mm in) and the softkey strip's ends, with the yokes at
# rest — and the aim points of the controls behind or round the yokes (every one whose line of sight comes within 40 mm
# of the yokes' boxes; with the yokes at controlsCheck's pose: elev 0, trim 0.1 → 7 mm aft), from the PFD's softkeys
# to the Seminole's engine switches (its four magnetos, the L / R start rocker), its left bank and EMERG BATT, the right
# bank's first two, its fuel pumps, dimmers, heater levers and rockers, gear selector and emergency gear and park brake
# knobs (round R3: POH VB-2636 Fig 7-33), the G5, the Archer's dimmers, the alternate static, carb heat, the circuit
# breakers, heat and defrost, the ELT, the Archer's park brake, the quadrants, the rudder trim and the pedals
SCREENS = [(-0.404, 0.3005, -1.0825), (-0.3, 0.3005, -1.0825), (-0.196, 0.3005, -1.0825), (-0.404, 0.36512, -1.0825),
           (-0.196, 0.36512, -1.0825), (-0.404, 0.42975, -1.0825), (-0.3, 0.42975, -1.0825), (-0.196, 0.42975, -1.0825),
           (-0.404, 0.27981, -1.0825), (-0.196, 0.27981, -1.0825), (-0.053, 0.3005, -1.0825), (0.051, 0.3005, -1.0825),
           (0.155, 0.3005, -1.0825), (-0.053, 0.36512, -1.0825), (0.155, 0.36512, -1.0825), (-0.053, 0.42975, -1.0825),
           (0.051, 0.42975, -1.0825), (0.155, 0.42975, -1.0825), (-0.053, 0.27981, -1.0825), (0.155, 0.27981, -1.0825)]
AIMS_TXT = '''
mfd.alt.inner -0.069 0.26 -1.065 / mfd.alt.outer -0.07388 0.2676 -1.071 / mfd.sk1 -0.04525 0.25875 -1.078
pfd.alt.inner -0.42 0.26 -1.065 / pfd.alt.outer -0.41714 0.26857 -1.071 / pfd.fms.inner -0.18 0.252 -1.065
pfd.fms.outer -0.1828 0.26059 -1.071 / pfd.sk1 -0.39625 0.25875 -1.078 / pfd.sk10 -0.23875 0.25875 -1.078
pfd.sk11 -0.22125 0.25875 -1.078 / pfd.sk12 -0.20375 0.25875 -1.078 / pfd.sk2 -0.37875 0.25875 -1.078
pfd.sk3 -0.36125 0.25875 -1.078 / pfd.sk4 -0.34375 0.25875 -1.078 / pfd.sk5 -0.32625 0.25875 -1.078
pfd.sk6 -0.30875 0.25875 -1.078 / pfd.sk7 -0.29125 0.25875 -1.078 / pfd.sk8 -0.27375 0.25875 -1.078
pfd.sk9 -0.25625 0.25875 -1.078 / sw.pitot -0.1385 0.197 -1.086 / sw.fan -0.1195 0.197 -1.086
pfd.ent -0.1737 0.2695 -1.077 / pfd.clr -0.1863 0.2695 -1.077 / pfd.proc -0.1737 0.2785 -1.077
pfd.fpl -0.1863 0.2785 -1.077 / audio.COPLT -0.11 0.28 -1.078 / audio.PILOT -0.139 0.28 -1.078
pedals -0.3 -0.27 -1.21 / mfd.sk2 -0.02775 0.25875 -1.078 / pfd.direct -0.1863 0.2875 -1.077
pfd.menu -0.1737 0.2875 -1.077 / audio.PLAY -0.139 0.2948 -1.078 / mfd.sk3 -0.01025 0.25875 -1.078
throttle -0.005 0.01532 -1.01598 / pfd.range -0.18 0.304 -1.073 / prop 0.012 0.06033 -1.03329
audio.MANSQ -0.11 0.3096 -1.078 / audio.AUX -0.139 0.3096 -1.078 / mfd.sk4 0.00725 0.25875 -1.078
mfd.sk5 0.02475 0.25875 -1.078 / audio.NAV2 -0.11 0.3244 -1.078 / audio.NAV1 -0.139 0.3244 -1.078
pfd.crs.inner -0.18 0.336 -1.065 / stby.g5 -0.49 0.3365 -1.0875 / elt 0.345 0.364 -1.09
cabinHeat 0.2945 0.278 -1.089 / defrost 0.2945 0.256 -1.089 / cb 0.24 0.11 -1.091
dim.switch -0.215 0.125 -1.088 / dim.panel -0.18 0.125 -1.088 / dim.avionics -0.145 0.125 -1.088
altStatic -0.415 0.047 -1.083 / carbHeat 0.1 0.1192 -1.0808 / parkBrake -0.11 -0.071 -1.068
rudderTrim 0.059 -0.2681 -1.0367 / sw.magL@pa44 -0.482 0.119 -1.086 / sw.magR@pa44 -0.463 0.119 -1.086
sw.rMagL@pa44 -0.392 0.119 -1.086 / sw.rMagR@pa44 -0.373 0.119 -1.086 / sw.startL@pa44 -0.435 0.12 -1.089
sw.startR@pa44 -0.419 0.12 -1.089 / sw.master@pa44 -0.227 0.215 -1.086 / sw.altr@pa44 -0.208 0.215 -1.086
sw.rAltr@pa44 -0.189 0.215 -1.086 / sw.avionics@pa44 -0.17 0.215 -1.086 / sw.emergBatt@pa44 -0.143 0.215 -1.086
sw.pitot@pa44 0.036 0.215 -1.086 / sw.nav@pa44 0.055 0.215 -1.086 / sw.fuelPump@pa44 -0.228 0.112 -1.086
sw.rFuelPump@pa44 -0.209 0.112 -1.086 / dim.switch@pa44 -0.215 0.158 -1.088 / dim.panel@pa44 -0.18 0.158 -1.088
dim.avionics@pa44 -0.145 0.158 -1.088 / heatAir@pa44 0.2815 0.291 -1.089 / heatTemp@pa44 0.2815 0.272 -1.089
heatDef@pa44 0.2815 0.253 -1.089 / sw.heater@pa44 0.369 0.281 -1.086 / sw.ventFan@pa44 0.388 0.281 -1.086
throttle@pa44 -0.041 -0.01927 -1.01226 / gear@pa44 -0.13 0.078 -1.07056 / emergGear@pa44 -0.172 0.06 -1.0855
parkBrake@pa44 -0.44 0.083 -1.0778 / prop@pa44 0.01 0.13033 -1.03329 / fuelSel -0.50903 -0.05526 -0.98774
door 0.5805 0.258 -1.035
'''
# and what the panel keeps beside and under the yokes, seen at rest (and trimmed): the dimmers' knobs and the alternate
# static's (their faces: the middle and four points round it), the throttle's knob (its ends and middle, at the aim's
# pose and at idle), the mixture's (full rich and cut-off), carb heat's (OFF up, ON down) — copied from cockpit.js's
# panel — and the room kept for the switch block under the audio panel (x −0.15…−0.07, y 0.16…0.22: a grid over it;
# the points whose line of sight meets a yoke's hit box are left out — picking takes the yoke there whatever its shape
# — and check() prints where they begin)
REST_TXT = '''
dim.switch -0.215 0.125 -1.088 0.007 / dim.panel -0.18 0.125 -1.088 0.007 / dim.avionics -0.145 0.125 -1.088 0.007
altStatic -0.415 0.047 -1.0795 0.006 / throttle.L -0.040 0.01532 -1.01598 0 / throttle.M -0.005 0.01532 -1.01598 0
throttle.R 0.016 0.01532 -1.01598 0 / throttle.idleL -0.040 -0.045 -1.008 0 / throttle.idleR 0.016 -0.045 -1.008 0
mixture.rich 0.045 0.0603 -1.0333 0.004 / mixture.cut 0.045 -0.045 -1.008 0.004 / carbHeat.off 0.1 0.1192 -1.0808 0.004
carbHeat.on 0.1 0.050 -1.080 0.004
'''
SWITCH_AREA = ((-0.15, -0.07), (0.16, 0.22), -1.090)    # x, y, the rockers' faces' z
SWITCH_GRID = (9, 4)                                     # points across, up
# and the Seminole's switch banks round the left yoke (cockpit.js SEM; round R3, POH VB-2636 Fig 7-33): its engine
# switches under the left horn's arm (the four magnetos and the L / R start rocker, with their guards) and its left bank
# beside the left yoke's right horn (BATT MASTR, the two ALTRs, AVION MASTER, the guarded EMERG BATT) — grids over them,
# tried the same way (each point seen past the models unless a hit box is before it, at rest and trimmed): {name: (x, y,
# the rockers' faces' z), (points across, up)}
SEM_AREAS = {'engine switches': (((-0.492, -0.363), (0.10, 0.13), -1.086), (8, 3)),
             'left bank': (((-0.237, -0.133), (0.20, 0.225), -1.086), (7, 2))}
AIMS, REST = {}, {}                   # (filled in below from AIMS_TXT: id x y z; from REST_TXT: id x y z r)
for _row in AIMS_TXT.replace('\n', ' / ').split(' / '):
    if _row.strip():
        _k, _x, _y, _z = _row.split(); AIMS[_k] = (float(_x), float(_y), float(_z))
for _row in REST_TXT.replace('\n', ' / ').split(' / '):
    if _row.strip():
        _k, _x, _y, _z, _r = _row.split(); _c = (float(_x), float(_y), float(_z)); _r = float(_r)
        REST[_k] = _c
        if _r: REST.update({f'{_k}+{n}': (_c[0] + _r * math.cos(n * 90 * DEG), _c[1] + _r * math.sin(n * 90 * DEG), _c[2]) for n in range(4)})
# the panel round the boots (the spec's panel: cockpit.js's PFD, MFD and g1000.js's BEZEL): the displays' bezels
# (cockpit.js's slab() bevels them by 0.002, and three's ExtrudeGeometry pushes the bevel outwards, so the PFD's lower edge
# is 2 mm under its outline: 15 mm over the left shaft); and the G5 standby at the panel's far left (the spec's panel.G5),
# which must stay in sight past the left yoke's left horn: its screen's corners (2 mm in) and middle, and its knob, are
# lines of sight in check(); worked out in layout()
BEZEL_BEVEL = 0.002
CHECK_DZ = 0.007                      # controlsCheck's pose: trim 0.1 × the travel (the yokes 7 mm aft of rest)
MARGIN = 0.0015                       # each line of sight is tested with four more, this far to each side


class _L:                             # the layout, worked out once from the spec
    pass


def layout(ctx):
    if getattr(ctx, '_yokes', None): return ctx._yokes
    S, V = ctx.S, ctx.Vector
    L = _L(); Y = S['yoke']; H = S['yokeHit']
    L.X0, L.Y0, L.Z0, L.TRAVEL = Y['x'], Y['y'], Y['z'], Y['travel']
    L.PZ, L.EYE, L.S = S['pz'], ctx.EYE, S
    # the hit boxes in the yoke's frame: (min, max) — the hub's, its top's, the right horn's, the left horn's, and the arms' corridor
    # between them (as deep as the horns' box, from the hub's box to the horns', up to a third of the horns' box)
    hw, hh, hd, ox, oy, oz = H['hub']; L.HUB = (V((ox - hw / 2, oy - hh / 2, oz - hd / 2)), V((ox + hw / 2, oy + hh / 2, oz + hd / 2)))
    hw, hh, hd, ox, oy, oz = H['top']; L.TOP = (V((ox - hw / 2, oy - hh / 2, oz - hd / 2)), V((ox + hw / 2, oy + hh / 2, oz + hd / 2)))
    w, h, d, ox, oy, oz = H['horn']
    L.HORN_R = (V((ox - w / 2, oy - h / 2, oz - d / 2)), V((ox + w / 2, oy + h / 2, oz + d / 2)))
    L.HORN_L = (V((-ox - w / 2, oy - h / 2, oz - d / 2)), V((-ox + w / 2, oy + h / 2, oz + d / 2)))
    L.CORR = (V((L.HUB[1].x, L.HUB[0].y, L.HORN_R[0].z)), V((L.HORN_R[0].x, L.HORN_R[0].y + h / 3, L.HORN_R[1].z)))
    L.SHAFT_Z1 = (L.PZ - L.Z0) - L.TRAVEL - SHAFT_REACH   # the shaft's front end (yoke frame): behind the panel at full aft
    P = S['panel']; L.BEZEL = P['BEZEL']; L.BEZELS = (P['PFD'], P['MFD'])
    L.PFD_BEZEL_BOT = P['PFD'][1] - P['BEZEL']['h'] / 2 - BEZEL_BEVEL
    G5 = P['G5']; gx, gy, gz = G5['c'][0], G5['c'][1] + G5['screenY'], S['pz'] + G5['depth'] - 0.0035   # (the G5's screen)
    hw, hh = G5['screenW'] / 2 - 0.002, G5['screenH'] / 2 - 0.002
    L.G5 = {'stby.g5': (gx, gy, gz), 'G5 knob': (gx + 0.032, G5['c'][1] - 0.0335, S['pz'] + G5['depth'] + 0.009)}
    L.G5.update({'G5 screen %s%s' % (v, u): (gx + sx * hw, gy + sy * hh, gz) for sx, u in ((-1, 'L'), (1, 'R')) for sy, v in ((-1, 'low'), (1, 'top'))})
    (x0, x1), (y0, y1), z = SWITCH_AREA; nx, ny = SWITCH_GRID
    L.SWITCHES = {(round(ctx.lerp(x0, x1, i / (nx - 1)), 4), round(ctx.lerp(y0, y1, j / (ny - 1)), 4)): (ctx.lerp(x0, x1, i / (nx - 1)), ctx.lerp(y0, y1, j / (ny - 1)), z)
                  for i in range(nx) for j in range(ny)}
    L.SEM = {}
    for name, (((x0, x1), (y0, y1), z), (nx, ny)) in SEM_AREAS.items():
        L.SEM[name] = {(round(ctx.lerp(x0, x1, i / (nx - 1)), 4), round(ctx.lerp(y0, y1, j / (ny - 1)), 4)): (ctx.lerp(x0, x1, i / (nx - 1)), ctx.lerp(y0, y1, j / (ny - 1)), z)
                       for i in range(nx) for j in range(ny)}
    # the aft face's own frame (x across, s up its slope, n out of it) and the horn's sections
    s = (HUB_ZA[1] - HUB_ZA[0]) / (HUB_YT - HUB_YB)                   # (dz / dy up the face)
    L.FACE_O = V((0, PLATE_Y0, hub_at(PLATE_Y0)[1]))
    L.FACE_X = V((1, 0, 0)); L.FACE_S = V((0, 1, s)).normalized(); L.FACE_N = L.FACE_X.cross(L.FACE_S).normalized()
    L.STATIONS = [station(ctx, *st) for st in HORN]
    ctx._yokes = L
    return L


def hub_at(y):
    # the hub's outline at height y: (half-width, aft z, corner radius) — HUB_W's piecewise straight sides, the aft
    # face's plane (both carried on past the ends: the cap's foot is over the top)
    k = 0 if y < HUB_W[1][0] else 1
    (y0, a0, r0), (y1, a1, r1) = HUB_W[k], HUB_W[k + 1]; t = (y - y0) / (y1 - y0)
    return a0 + (a1 - a0) * t, HUB_ZA[0] + (HUB_ZA[1] - HUB_ZA[0]) * (y - HUB_YB) / (HUB_YT - HUB_YB), r0 + (r1 - r0) * t


def plate_half(s):
    # the plate's half-width a share s of its height up the slope: the face's flat part there, less PLATE_EDGE
    a, za, rc = hub_at(PLATE_Y0 + s * math.cos(math.atan((HUB_ZA[0] - HUB_ZA[1]) / (HUB_YT - HUB_YB))))
    return a - rc - PLATE_EDGE


def station(ctx, c, d, a, bf, bb):
    # a horn section: its centre, the sweep's direction T (an angle in the x–y plane, or (aft, inboard) degrees of tilt
    # off the upright), its frame (W the depth: +z made square to T; U = W × T: up along the arm, inboard up the grip, so
    # that U × W = T and a ring round it faces outwards) and its size
    V = ctx.Vector
    if isinstance(d, tuple): T = V((-math.tan(d[1] * DEG), 1, math.tan(d[0] * DEG))).normalized()
    else: T = V((math.cos(d * DEG), math.sin(d * DEG), 0))
    Z = V((0, 0, 1)); W = (Z - T * Z.dot(T)).normalized(); U = W.cross(T).normalized()
    return V(c), T, U, W, a, bf, bb


# ---------------------------------------------------------------- helpers
def oval(phi, a, b, n=2.0):
    # the point of the superellipse |u/a|^n + |w/b|^n = 1 whose normal is at the angle phi (so that equal steps of phi turn
    # the normal equally: no edge sharper than the step, and build_cockpit.py keeps every one of them smooth)
    m = n / (n - 1); c, s = math.cos(phi), math.sin(phi)
    S = abs(a * c) ** m + abs(b * s) ** m
    return math.copysign(a * abs(a * c) ** (1 / (n - 1)) / S ** (1 / n), c), math.copysign(b * abs(b * s) ** (1 / (n - 1)) / S ** (1 / n), s)


def section(ctx, st):
    # a station's ring: counter-clockwise about its T (so a strip of rings faces outwards); its first point outboard /
    # down (−U), the angle 90° aft (+W)
    c, T, U, W, a, bf, bb = st
    ring = []
    for j in range(N):
        phi = math.pi + 2 * math.pi * j / N
        u, w = oval(phi, a, bb if math.sin(phi) > 0 else bf, SUPER)
        ring.append(c + U * u + W * w)
    return ring


def rr_ring(ctx, y, hx, zf, za, rc, seg=3):
    # a horizontal rounded rectangle (x ±hx, z zf…za, corners rc) at height y: its corners' arcs in turn — aft right, front
    # right, front left, aft left — so that a strip of such rings going up faces outwards
    V = ctx.Vector; out = []
    for cx, cz, a0 in ((hx - rc, za - rc, 90), (hx - rc, zf + rc, 0), (-hx + rc, zf + rc, -90), (-hx + rc, za - rc, 180)):
        for k in range(seg + 1):
            a = (a0 - 90 * k / seg) * DEG; out.append(V((cx + rc * math.cos(a), y, cz + rc * math.sin(a))))
    return out


def ring_strip(ctx, prof, seg, col, centre=(0.0, 0.0), phase=0.0):
    # a surface of revolution about the z axis (through centre): prof = [(r, z)], front to back (z rising); faces outwards;
    # its points at phase + k·360°/seg
    P = ctx.Piece(); V = ctx.Vector
    ang = [phase + 2 * math.pi * k / seg for k in range(seg)]
    rows = [[V((centre[0] + r * math.cos(a), centre[1] + r * math.sin(a), z)) for a in ang] for r, z in prof]
    P.grid(rows, col, closed=True)
    return P


def rounded_outline(w, h, r, seg):
    # a rounded rectangle centred on the origin, counter-clockwise about +z (build_cockpit.py's rounded_rect, moved)
    out = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(seg + 1):
            a = (a0 + 90 * k / seg) * DEG; out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def slab(ctx, o, eu, ew, en, prof, col, back=False):
    # a raised rounded-rectangle slab on a surface (origin o, across eu, along ew, out en: eu × ew = en): prof = (half
    # sizes, corner, then along en its foot, its side's top, the bevel in, its flat top) — its side, the bevel (if any),
    # its top a fan; back: closed under its foot too (for check()'s seating tests)
    hu, hw, r, foot, side, bev, top = prof
    P = ctx.Piece()
    o1, o2 = rounded_outline(2 * hu, 2 * hw, r, 3), rounded_outline(2 * (hu - bev), 2 * (hw - bev), r - bev, 3)
    rows = [[o + eu * x + ew * y + en * h for x, y in ol] for ol, h in ((o1, foot), (o1, side), (o2, top))][:3 if bev else 2]
    base = P.grid(rows, col, closed=True); n = len(o1); last = base + (len(rows) - 1) * n
    P.fan(list(range(last, last + n)), o + en * top, col, flip=True)
    if back: P.fan(list(range(base, base + n)), o + en * foot, col, flip=False)
    return P


def button(ctx, base, n, r, h, col, seg=8):
    # a round push button out of a surface: its foot sunk 2 mm (base, outward normal n), its side, its face a low dome
    P = ctx.Piece(); V = ctx.Vector
    t = n.cross(V((0, 1, 0))) if abs(n.y) < 0.9 else n.cross(V((1, 0, 0))); t.normalize(); b = n.cross(t)
    ring = lambda c, rr: [c + (t * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * rr for k in range(seg)]
    rows = [ring(base - n * 0.002, r), ring(base + n * h, r)]
    P.grid(rows, col, closed=True)
    k = len(P.v) - seg; P.fan(list(range(k, k + seg)), base + n * (h + 0.0008), col, flip=True)
    return P


# ---------------------------------------------------------------- the pieces (in the yoke's frame)
def hub_body(ctx):
    # the wedge: its rings up from the foot's bevel to the top's rounded edge, a flat foot and a low top (under the cap)
    P = ctx.Piece(); V = ctx.Vector; col = ctx.C['yoke']
    rows = []
    for y, d in HUB_RINGS:
        a, za, rc = hub_at(y); rows.append(rr_ring(ctx, y, a - d, HUB_ZF + d, za - d, max(0.001, rc - d)))
    base = P.grid(rows, col, closed=True); n = len(rows[0])
    a, za, rc = hub_at(HUB_YB); P.fan(list(range(base, base + n)), V((0, HUB_YB, (HUB_ZF + za) / 2)), col, flip=False)
    last = base + (len(rows) - 1) * n; a, za, rc = hub_at(HUB_YT)
    P.fan(list(range(last, last + n)), V((0, HUB_YT + 0.0004, (HUB_ZF + za) / 2)), col, flip=True)
    return P


def plate_point(L, x, s, n):
    # a point of the aft face's frame: x across, s up the slope from the plate's foot, n out of the face
    return L.FACE_O + L.FACE_X * x + L.FACE_S * s + L.FACE_N * n


def plate_outline(w, h, r, seg, extra):
    # rounded_outline with extra points along its two long sides (each side cut in extra + 1), counter-clockwise from the
    # top right corner: that corner, the top left, down the left side, the bottom left, the bottom right, up the right side
    # → the points, and the right side's and the left side's indices from the foot up (each point and its mirror)
    pts = rounded_outline(w, h, r, seg); c = seg + 1
    side = lambda sx, a, b: [(sx * w / 2, a + (b - a) * (k + 1) / (extra + 1)) for k in range(extra)]
    out = pts[:2 * c] + side(-1, h / 2 - r, -h / 2 + r) + pts[2 * c:4 * c] + side(1, -h / 2 + r, h / 2 - r)
    e = extra
    right = [2 * c + e + c + k for k in range(c)] + [4 * c + e + k for k in range(e)] + list(range(c))
    left = [2 * c + e + c - 1 - k for k in range(c)] + [2 * c + e - 1 - k for k in range(e)] + [2 * c - 1 - k for k in range(c)]
    return out, right, left


def plate(ctx):
    # the plate on the aft face: a rounded outline narrowing towards its top (the face's), its foot sunk in the face, its
    # bevelled rim (dark: the groove round it), its face lighter than the hub — a strip of quads across it from its foot
    # to its top (the occlusion the cap casts on its top and the arms on its foot then shades it up its height, not in
    # long slivers out of one middle point); closed under its foot
    L = layout(ctx); P = ctx.Piece(); base = ctx.C['yoke']
    face, rim = tuple(c * PLATE_K for c in base), tuple(c * PLATE_RIM_K for c in base)
    def outline(inset):
        # (a rounded rectangle as wide as the plate's foot, each point's x then scaled to the plate's width at its height)
        w0 = plate_half(0.0); pts, right, left = plate_outline(2 * (w0 - inset), PLATE_S - 2 * inset, PLATE_R - inset, 3, PLATE_EXTRA)
        return [(x * (plate_half(y + PLATE_S / 2) - inset) / (w0 - inset), y + PLATE_S / 2) for x, y in pts], right, left
    (o1, _, _), (o2, right, left) = outline(0), outline(PLATE_IN)
    rows = [[plate_point(L, x, s, -PLATE_SINK) for x, s in o1], [plate_point(L, x, s, PLATE_H) for x, s in o2]]
    b = P.grid(rows, rim, closed=True); n = len(o1)
    for j in range(len(right) - 1):
        P.f.append(tuple(b + n + i for i in (right[j], right[j + 1], left[j + 1], left[j]))); P.c.append(face)
    P.fan(list(range(b, b + n)), plate_point(L, 0, PLATE_S / 2, -PLATE_SINK), rim, flip=False)
    return P


def chevron(ctx):
    # Piper's two triangles on the plate, raised (each a prism: its side and its flat top; its foot sunk in the plate)
    L = layout(ctx); P = ctx.Piece(); col = ctx.C['alu']
    for poly in CHEVRON:
        pts = [((u - 0.5) * LOGO_W, LOGO_S + v * LOGO_W) for u, v in poly]
        b = P.grid([[plate_point(L, x, s, PLATE_H - LOGO_SINK) for x, s in pts], [plate_point(L, x, s, PLATE_H + LOGO_H) for x, s in pts]], col, closed=True)
        n = len(pts); P.f.append(tuple(range(b + n, b + 2 * n))); P.c.append(col)
    return P


def cap(ctx):
    # the rounded cap on the hub's top: its foot inside the hub, its side jutting aft of the plate, its rounded top edge
    # and a low dome
    P = ctx.Piece(); V = ctx.Vector; col = ctx.C['yoke']
    rows = [rr_ring(ctx, *cap_ring(k)) for k in range(len(CAP))]
    b = P.grid(rows, col, closed=True); n = len(rows[0]); last = b + (len(rows) - 1) * n
    y, hx, zf, za, rc = cap_ring(len(CAP) - 1); P.fan(list(range(last, last + n)), V((0, CAP_TOP, (zf + za) / 2)), col, flip=True)
    return P


def cap_ring(k):
    # CAP's ring k with its aft z over the aft face's (at the cap's side: the face carried up to there)
    y, hx, zf, za, rc = CAP[k]
    return y, hx, zf, za + hub_at(CAP[1][0])[1], rc


def boss(ctx): return ring_strip(ctx, BOSS, BOSS_SEG, ctx.C['yoke'])


def shaft(ctx):
    # (the black finish: the table's steel darkened — under the chrome surface's metalness a reflectance like black
    # paint's, so it reads as a glossy black tube, not a bright rod)
    L = layout(ctx)
    return ring_strip(ctx, [(SHAFT_R, L.SHAFT_Z1), (SHAFT_R, SHAFT_Z0)], SHAFT_SEG, tuple(c * 0.55 for c in ctx.C['steel']))


def horn(ctx):
    # the right horn: one sweep of its sections (open at its root inside the hub), the top closed by a low dome
    L = layout(ctx); P = ctx.Piece(); col = ctx.C['grip']
    rows = [section(ctx, st) for st in L.STATIONS]
    P.grid(rows, col, closed=True)
    c, T = L.STATIONS[-1][:2]; base = len(P.v) - N
    P.fan(list(range(base, base + N)), c + T * DOME_H, col, flip=True)
    return P


def top_frame(ctx):
    # the grip's top face: its middle, across (U: inboard and down), fore and aft (W: aft and down), out (T)
    c, T, U, W = layout(ctx).STATIONS[-1][:4]
    return c, U, W, T


def pod(ctx, which):
    # the outboard grip's switch pod (the right grip's; mirrored for the left yoke): the housing, the trim rocker's halves
    # and the push-to-talk trigger (black); the disconnect (red) on the pilot's
    V = ctx.Vector; c, U, W, T = top_frame(ctx)
    blk, red = ctx.Piece(), ctx.Piece()
    blk.add(slab(ctx, c, U, W, T, POD, ctx.C['black']))
    tu, tw, hu, ht, hw, gap = TRIM; top = POD[6]
    for sd in (-1, 1):
        q = c + U * (tu + sd * (hu + gap / 2)) + W * tw + T * (top + ht - 0.0004)
        blk.add(ctx.box(q, (hu, hw, ht), (U, W, T), ctx.C['black']))
    (px, py, pz), half = PTT
    blk.add(ctx.box(V((px, py, pz)), half, (V((1, 0, 0)), V((0, 1, 0)), V((0, 0, 1))), ctx.C['black']))
    if which == 'pilot':
        au, aw, r, h, seg = APD
        red.add(button(ctx, c + U * au + W * aw + T * top, T, r, h, ctx.C['red'], seg))
    return blk, red


def pad(ctx):
    # the inboard grip's plain black pad on its top face (the right grip's; mirrored for the right yoke)
    c, U, W, T = top_frame(ctx)
    return slab(ctx, c, U, W, T, PAD, ctx.C['black'])


def placed(ctx, piece, sd):
    # a piece of the yoke's frame moved to the yoke at side sd (−1: the left one, +1: the right)
    L = layout(ctx); o = ctx.Vector((sd * L.X0, L.Y0, L.Z0))
    piece.v = [v + o for v in piece.v]
    return piece


def mirrored(ctx, piece):
    return ctx.mirror_x(piece)


def yoke_pieces(ctx, sd):
    # one yoke's nodes ({surface: Piece}) in its own frame; sd: which seat (its pod: on its outboard grip)
    hn = horn(ctx)
    out = {
        'yoke': ctx.Piece().add(hub_body(ctx)).add(plate(ctx)).add(cap(ctx)).add(boss(ctx)),
        'grip': ctx.Piece().add(hn).add(mirrored(ctx, hn)),
        'alu': chevron(ctx),
        'chrome': shaft(ctx),
    }
    if sd < 0:                                                 # the pilot's: the pod on the left grip (the right one's mirrored)
        blk, red = pod(ctx, 'pilot'); out['black'] = mirrored(ctx, blk).add(pad(ctx)); out['red'] = mirrored(ctx, red)
    else:                                                      # the instructor's: the pod on the right grip, no disconnect
        blk, _ = pod(ctx, 'copilot'); out['black'] = blk.add(mirrored(ctx, pad(ctx)))
    return out


def boots(ctx):
    L = layout(ctx); P = ctx.Piece()
    for sd in (-1, 1):
        P.add(ring_strip(ctx, [(r, L.PZ + dz) for r, dz in BOOT], BOOT_SEG, ctx.C['rubber'], centre=(sd * L.X0, L.Y0), phase=BOOT_PHASE))
    return P


# ---------------------------------------------------------------- the protocol
def parts(ctx):
    out = {}
    for sd, name in ((-1, 'yokeL'), (1, 'yokeR')):
        for surf, pc in yoke_pieces(ctx, sd).items():
            out[f'yokes.{surf}.{name}'] = (placed(ctx, pc, sd), None)
    out['yokes.rubber'] = (boots(ctx), None)
    return out


def proxies(ctx):
    # what stays in code round the boots (cockpit.js): the panel's face, the displays' bezels (the PFD's over the left
    # boot); and the shaft through each boot (always there, whatever the travel)
    L = layout(ctx); V = ctx.Vector; z = L.PZ + 0.0002
    out = [('quad', V((-0.545, L.S['pbot'] + 0.008, z)), V((0.545, L.S['pbot'] + 0.008, z)), V((0.545, L.S['ptop'] - 0.008, z)), V((-0.545, L.S['ptop'] - 0.008, z)))]
    B = L.BEZEL
    for cx, cy in L.BEZELS: out.append(('box', (cx, cy, L.PZ + B['depth'] / 2), (B['w'], B['h'], B['depth'])))
    for sd in (-1, 1): out.append(('box', (sd * L.X0, L.Y0, L.PZ + 0.03), (2 * SHAFT_R * 0.9, 2 * SHAFT_R * 0.9, 0.06)))
    return out


def check(ctx, objs):
    L = layout(ctx); V, EYE, BVHTree = ctx.Vector, ctx.EYE, ctx.BVHTree
    mine = {k: ob for k, ob in objs.items() if k.split('.')[0] == 'yokes'}
    want = {f'yokes.{s}.{n}' for n in ('yokeL', 'yokeR') for s in ('yoke', 'grip', 'alu', 'chrome', 'black')} | {'yokes.red.yokeL', 'yokes.rubber'}
    assert set(mine) == want, ('the yokes\' nodes', sorted(mine))
    piv = {'yokeL': V((-L.X0, L.Y0, L.Z0)), 'yokeR': V((L.X0, L.Y0, L.Z0))}
    def verts(ob): return [v.co.copy() for v in ob.data.vertices]
    def components(ob):
        # the node's pieces (faces joined by shared vertices) → [(faces, the centre of its open edges, or of its vertices)]
        me = ob.data; up = list(range(len(me.vertices)))
        def root(i):
            while up[i] != i: up[i] = up[up[i]]; i = up[i]
            return i
        for pl in me.polygons:
            for i in pl.vertices[1:]: up[root(i)] = root(pl.vertices[0])
        edges = {}
        for pl in me.polygons:
            for e in pl.edge_keys: edges[e] = edges.get(e, 0) + 1
        out = {}
        for pl in me.polygons: out.setdefault(root(pl.vertices[0]), []).append(pl)
        res = []
        for r, pls in out.items():
            vs = {i for pl in pls for i in pl.vertices}
            rim = {i for e, n in edges.items() if n == 1 for i in e if i in vs}
            pts = [me.vertices[i].co for i in (rim or vs)]
            res.append((pls, sum(pts, V()) / len(pts)))
        return res
    # every piece faces outwards: its signed volume about the centre of its open edges (where the missing caps would add
    # nothing: the horns' root rings, the buttons', slabs' and chevron's feet, the shaft's and the boots' axes) is positive
    for k, ob in mine.items():
        for pls, o in components(ob):
            vol = 0.0
            for pl in pls:
                a, b, c = (ob.data.vertices[i].co - o for i in pl.vertices); vol += a.dot(b.cross(c)) / 6
            assert vol > 0, (k, 'a piece inside out', tuple(o), vol)
    # no slits: every open edge of a piece is on a small loop (the hidden ends: the horns' roots inside the hub, the
    # buttons', the slabs' and the chevron's feet, the shaft's and the boss's ends, the boots')
    for k, ob in mine.items():
        me = ob.data; cnt = {}
        for pl in me.polygons:
            for e in pl.edge_keys: cnt[e] = cnt.get(e, 0) + 1
        up = {}
        def root(i):
            while up.setdefault(i, i) != i: i = up[i]
            return i
        for (a, b), n in cnt.items():
            if n == 1: up[root(a)] = root(b)
        loops = {}
        for i in up: loops.setdefault(root(i), []).append(me.vertices[i].co)
        for vs in loops.values():
            span = max((p - q).length for p in vs for q in vs)
            assert span < 0.06, (k, 'an open edge loop %.3f m long: a slit' % span)
    # the shaft: on the roll axis, from inside the collar to 40 mm behind the panel face at full aft travel
    for n, p in piv.items():
        vs = [v - p for v in verts(mine[f'yokes.chrome.{n}'])]
        assert all(abs(math.hypot(v.x, v.y) - SHAFT_R) < 1e-5 for v in vs), (n, 'the shaft off its axis')
        z1 = min(v.z for v in vs); assert z1 + p.z + L.TRAVEL <= L.PZ - SHAFT_REACH + 1e-6, (n, 'the shaft comes out of the panel', z1)
        assert BOSS[COLLAR_FRONT][1] < max(v.z for v in vs) <= BOSS[-1][1], (n, 'the shaft\'s back end not inside the collar and boss')
    # everything else of each yoke inside its hit boxes (the hub's, the horns') or the arms' corridor between them, and the
    # boss and collar round the shaft forward of the hub's box
    def inbox(v, box, eps=1e-6): return all(box[0][i] - eps <= v[i] <= box[1][i] + eps for i in range(3))
    room = {}
    for n, p in piv.items():
        for k, ob in mine.items():
            if not k.endswith('.' + n) or '.chrome.' in k: continue
            for v in verts(ob):
                q = v - p
                if q.z < L.HUB[0].z: assert math.hypot(q.x, q.y) <= BOSS[-1][0] + 1e-6, (k, 'forward of the hub, off the shaft', tuple(q))
                else: assert any(inbox(q, b) for b in (L.HUB, L.TOP, L.HORN_R, L.HORN_L, L.CORR)) or inbox(V((-q.x, q.y, q.z)), L.CORR), (k, 'outside the hit boxes', tuple(q))
        g = [v - p for k, ob in mine.items() if k.endswith('.' + n) and k.split('.')[1] in ('grip', 'black', 'red') for v in verts(ob) if abs(v.x - p.x) > L.HORN_R[0].x - 0.002]
        room[n] = (L.HORN_R[1].y - max(v.y for v in g), L.HORN_R[1].x - max(abs(v.x) for v in g),
                   min(abs(v.x) for v in g if v.y > L.CORR[1].y) - L.HORN_R[0].x)
    # the lines of sight from the eye: the screens' points with the yokes at rest, the controls' aim points with them 7 mm
    # aft (cockpit.test.mjs: nothing drawn more than 30 mm before the point), the G5 and what the panel keeps beside and
    # under the yokes both at rest and trimmed — each line and four more 1.5 mm to its sides
    trees = {}
    for n in piv:
        obs = [ob for k, ob in mine.items() if k.endswith('.' + n)]
        vs, fs = [], []
        for ob in obs:
            b = len(vs); vs += verts(ob); fs += [tuple(i + b for i in pl.vertices) for pl in ob.data.polygons]
        trees[n] = (vs, fs)
    def tree(n, dz): vs, fs = trees[n]; return BVHTree.FromPolygons([v + V((0, 0, dz)) for v in vs], fs)
    T = {(n, dz): tree(n, dz) for n in piv for dz in (0.0, CHECK_DZ)}
    blocked, close = [], {}
    def look(name, tgt, dz):
        tgt = V(tgt); d0 = tgt - EYE; far = d0.length - 0.03
        a = d0.normalized(); s1 = a.cross(V((0, 1, 0))).normalized(); s2 = a.cross(s1).normalized()
        for n in piv:
            for off in (V((0, 0, 0)), s1 * MARGIN, -s1 * MARGIN, s2 * MARGIN, -s2 * MARGIN):
                e = EYE + off; d = (tgt + off) - e
                loc, nrm, i, dist = T[(n, dz)].ray_cast(e, d.normalized(), far)
                if loc is not None: blocked.append((name, n, dz, tuple(round(c, 4) for c in loc))); return
            # (for the report: how close the line comes to the yoke's surface, sampled along it)
            best = min(T[(n, dz)].find_nearest(EYE + a * (far * i / 60))[3] for i in range(10, 61))
            close[name] = min(close.get(name, 9), best)
    def behind_box(tgt, dz):
        # whether the line from the eye meets one of the yokes' hit boxes before tgt (then picking takes the yoke there,
        # whatever the model: no shape inside the boxes can show it)
        tgt = V(tgt); d = tgt - EYE; far = d.length - 0.03; d = d / d.length
        for n, p in piv.items():
            for box in (L.HUB, L.TOP, L.HORN_R, L.HORN_L):
                lo, hi = box[0] + p + V((0, 0, dz)), box[1] + p + V((0, 0, dz)); t0, t1 = 0.0, far
                for i in range(3):
                    if abs(d[i]) < 1e-12:
                        if not lo[i] <= EYE[i] <= hi[i]: t0 = 9; break
                        continue
                    ta, tb = (lo[i] - EYE[i]) / d[i], (hi[i] - EYE[i]) / d[i]
                    t0, t1 = max(t0, min(ta, tb)), min(t1, max(ta, tb))
                if t0 <= t1: return True
        return False
    for p in SCREENS: look('screen %s' % (p,), p, 0.0)
    for k, p in AIMS.items(): look(k, p, CHECK_DZ)
    for k, p in list(L.G5.items()) + list(REST.items()): look(k, p, 0.0); look(k, p, CHECK_DZ)
    hidden_by_box = {}
    for dz in (0.0, CHECK_DZ):
        for k, p in L.SWITCHES.items():
            if behind_box(p, dz): hidden_by_box.setdefault(dz, []).append(k)
            else: look('switch block %s' % (k,), p, dz)
    sem_seen = {}
    for name, pts in L.SEM.items():
        for dz in (0.0, CHECK_DZ):
            for k, p in pts.items():
                if behind_box(p, dz): continue
                look('%s %s' % (name, k), p, dz); sem_seen[(name, dz)] = sem_seen.get((name, dz), 0) + 1
    assert not blocked, ('the yokes hide', blocked)
    # (and the hit boxes themselves, which picking takes first: no control's line meets one — the hub's top box, the
    # taller hub's, under the door handle's line over the right yoke)
    boxed = [k for k, p in AIMS.items() if behind_box(p, CHECK_DZ)]
    assert not boxed, ('the yokes\' hit boxes before', boxed)
    sem_clear = {name: round(min([close.get('%s %s' % (name, k), 9) for k in pts]) * 1000, 1) for name, pts in L.SEM.items()}
    g5_clear = min(close.get(k, 9) for k in L.G5)
    rest_clear = min(close.get(k, 9) for k in REST)
    # (the switch block: per row, the x from which the left yoke's right horn's hit box hides it — at rest and trimmed;
    # bisected between the grid's points)
    sw_limit = {}
    (x0, x1), (y0, y1), zs = SWITCH_AREA
    for dz in (0.0, CHECK_DZ):
        for y in sorted({y for x, y in L.SWITCHES}):
            if not behind_box((x1, y, zs), dz): continue
            lo, hi = x0, x1
            for _ in range(30):
                mid = (lo + hi) / 2
                if behind_box((mid, y, zs), dz): hi = mid
                else: lo = mid
            sw_limit.setdefault(dz, {})[y] = round(hi, 4)
    # the boots: the left one under the PFD's bezel (its bevelled lower edge; the ring's top is a flat edge, so its highest
    # points are vertices), and both clear of their shafts at any roll (points round the shaft's circle — its 16-gon's
    # corners as it turns — tested against the boots' faces, not just their vertices: the ring's edges cut inside its
    # corners by r·(1 − cos 15°))
    bv = verts(mine['yokes.rubber'])
    top = max(v.y for v in bv if v.x < 0)
    assert top < L.PFD_BEZEL_BOT - 0.0005, ('the left boot under the PFD\'s bezel', top, L.PFD_BEZEL_BOT)
    me = mine['yokes.rubber'].data
    bt = BVHTree.FromPolygons([v.co for v in me.vertices], [tuple(pl.vertices) for pl in me.polygons])
    lip = min(bt.find_nearest(V((sd * L.X0 + SHAFT_R * math.cos(a * DEG), L.Y0 + SHAFT_R * math.sin(a * DEG), L.PZ + dz)))[3]
              for sd in (-1, 1) for a in range(0, 360, 2) for dz in (BOOT[0][1], 0.0, BOOT[1][1], BOOT[-1][1]))
    assert lip > 0.0001, ('the boots touch the shafts', lip)
    # what is seated in what (ray parity against the host's faces, along three directions): the horns' roots, the plate's
    # foot, the cap's foot and the boss's back end inside the hub; the chevron's feet inside the plate; the pod's and the
    # pad's feet and the trigger's back inside the grip; the rocker's and the disconnect's feet inside the pod
    def inside(tree, p):
        votes = 0
        for d in (V((0.05, 1, 0.08)), V((0.07, 0.1, 1)), V((-0.06, 0.12, -1))):
            o, n = p.copy(), 0
            while n < 40:
                loc, _, _, _ = tree.ray_cast(o, d.normalized(), 1.0)
                if loc is None: break
                n += 1; o = loc + d.normalized() * 1e-6
            votes += n % 2
        return votes >= 2
    def bvh(pc): return BVHTree.FromPolygons(pc.v, [tuple(f) for f in pc.f])
    hb, pl, hn = hub_body(ctx), plate(ctx), horn(ctx)
    c, U, W, Tn = top_frame(ctx)
    def slab_foot(prof): hu, hw, r, foot = prof[:4]; return [c + U * x + W * y + Tn * foot for x, y in rounded_outline(2 * hu, 2 * hw, r, 3)]
    tu, tw, hu, ht, hw, gap = TRIM; au, aw, ar, ah, aseg = APD
    t1 = Tn.cross(V((0, 1, 0))).normalized() if abs(Tn.y) < 0.9 else Tn.cross(V((1, 0, 0))).normalized(); t2 = Tn.cross(t1)
    (px, py, pz), (hx, hy, hzz) = PTT
    seats = {
        ('hub', 'horn roots'): (hb, section(ctx, L.STATIONS[0])),
        ('hub', 'plate foot'): (hb, pl.v[:len(plate_outline(1, 1, 0.1, 3, PLATE_EXTRA)[0])]),
        ('hub', 'cap foot'): (hb, rr_ring(ctx, *cap_ring(0))),
        ('hub', 'boss end'): (hb, [V((BOSS[-1][0] * math.cos(2 * math.pi * k / BOSS_SEG), BOSS[-1][0] * math.sin(2 * math.pi * k / BOSS_SEG), BOSS[-1][1])) for k in range(BOSS_SEG)]),
        ('plate', 'chevron feet'): (pl, [plate_point(L, (u - 0.5) * LOGO_W, LOGO_S + v * LOGO_W, PLATE_H - LOGO_SINK) for poly in CHEVRON for u, v in poly]),
        ('grip', 'pod foot'): (hn, slab_foot(POD)),
        ('grip', 'pad foot'): (hn, slab_foot(PAD)),
        ('grip', 'trigger back'): (hn, [V((px + sx * hx, py + sy * hy, pz + hzz)) for sx in (-1, 1) for sy in (-1, 1)]),
        ('pod', 'rocker feet'): (slab(ctx, c, U, W, Tn, POD, (0, 0, 0), back=True), [c + U * (tu + sd * (hu + gap / 2) + su * hu) + W * (tw + sw * hw) + Tn * (POD[6] - 0.0004)
                                                                       for sd in (-1, 1) for su in (-1, 1) for sw in (-1, 1)]),
        ('pod', 'disconnect foot'): (slab(ctx, c, U, W, Tn, POD, (0, 0, 0), back=True), [c + U * au + W * aw + Tn * (POD[6] - 0.002) + (t1 * math.cos(2 * math.pi * k / aseg) + t2 * math.sin(2 * math.pi * k / aseg)) * ar for k in range(aseg)]),
    }
    seated = {}
    for (host, what), (pc, pts) in seats.items():
        t = bvh(pc)
        out = [tuple(round(x, 4) for x in q) for q in pts if not inside(t, q)]
        assert not out, (what, 'not inside the', host, out)
        seated[what] = round(min(t.find_nearest(q)[3] for q in pts) * 1000, 2)
    tight = sorted(close.items(), key=lambda kv: kv[1])[:8]
    sharp = {}
    for k, ob in mine.items():
        at = ob.data.attributes.get('sharp_edge')
        sharp[k.split('.', 1)[1]] = sum(1 for d in at.data if d.value) if at else 0
    print('yokes: room in the horns\' boxes (top, outboard, inboard) %s mm; the closest lines of sight (to the surface) %s; '
          'the left boot %.1f mm under the PFD\'s bezel, the boots\' lips %.2f mm off the shafts; seated by (mm) %s; '
          'the G5\'s lines of sight %.1f mm from the yokes at the closest, the dimmers\', alternate static\'s, quadrant\'s and '
          'carb heat\'s %.1f mm; the switch block (x −0.15…−0.07, y 0.16…0.22) seen past the models at %d of %d points, the '
          'rest behind the left yoke\'s right horn\'s hit box from x %s at rest, %s trimmed (per row y); the Seminole\'s banks '
          'seen past the models at (rest, trimmed) %s of %s points, %s mm from them at the closest; sharp edges %s'
          % ({n: tuple(round(r * 1000, 1) for r in v) for n, v in room.items()}, [(k, round(v * 1000, 1)) for k, v in tight],
             (L.PFD_BEZEL_BOT - top) * 1000, lip * 1000, seated, g5_clear * 1000, rest_clear * 1000,
             len(L.SWITCHES) - len(hidden_by_box.get(0.0, [])), len(L.SWITCHES), sw_limit.get(0.0, {}), sw_limit.get(CHECK_DZ, {}),
             {n: (sem_seen.get((n, 0.0), 0), sem_seen.get((n, CHECK_DZ), 0)) for n in L.SEM}, {n: len(p) for n, p in L.SEM.items()}, sem_clear, sharp))
