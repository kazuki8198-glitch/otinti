# CADET — tools/aircraft/cockpit_yokes.py : the two control wheels of the flown aircraft's cabin (aircraft/cockpit.js) and
# their boots at the panel, for tools/aircraft/build_cockpit.py (the group 'yokes'; the run, the helpers and the protocol
# are that script's):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-]
#   (a group alone, for its previews: … -- /tmp/cockpit.json /tmp/trial.glb /tmp/prev band,yokes — never into assets/model,
#   which must hold every group; tools/aircraft/trial-glb.mjs runs the game's tests against such a trial model)
# - each yoke (moving parts yokeL, yokeR; the Archer III's 'ram's horn' wheel, the same for both seats): a moulded centre
#   hub (a rounded block, a little narrower at the top, its faces domed a little) with a raised, bevelled emblem plate
#   on its aft face (plain: no print on a moving part — a satin field inside a bright bevelled rim); its boss forward of
#   it, tapering to a collar round the shaft (open at its front, which faces the panel); two horns, each one sweep of an
#   oval section from inside the hub out and a little down (flaring into the hub's side), round a bend and up into the
#   grip — thickening into the grip after a shallow groove (the grip's lip), the grip a flattened oval with four finger
#   hollows down its forward face, a palm swell, leaning a little aft, closed by a rounded top (no ball end); the chrome
#   shaft straight forward through the panel, open at its front (always behind the panel face).
#   The switches: on the pilot's (left) horn of the left yoke, the split electric-trim rocker on the grip's top, the
#   push-to-talk on its aft face under the top on the thumb's (inboard) side, the red autopilot-disconnect / trim-interrupt
#   button on its inboard face; on the right yoke, the instructor's push-to-talk on the right horn (the left's mirrored).
# - the boots (yokes.rubber, static): a small rubber grommet round each shaft where it goes into the panel, its lip on it;
#   no wider than the room under the PFD's bezel (15 mm from the shaft's axis to the bezel's bevelled lower edge).
# Made in place at the rest pose: cockpit.js turns each yoke's group about the shaft's axis through its pivot
# (∓yoke.x, yoke.y, yoke.z) (roll ±yoke.roll) and slides it along z (±yoke.travel), so the shaft lies on that axis; the
# shaft reaches 40 mm behind the panel face (pz) even at full aft travel. Everything else stays inside the yokes' hit
# boxes (yokeHit: the hub's box and the horns', which stay in code) and the arms' corridor between them, and out of the
# lines of sight from the eye to the screens' image and to the controls behind the yokes (cockpit.test.mjs: the PFD's and
# MFD's corners at rest; the aim points with a little nose-up trim — copied below, as the spec does not carry them);
# check() asserts all of it, with a margin.
# Coordinates and nodes: build_cockpit.py's (the cabin's frame, metres, x right, y up, z aft); built in each yoke's own
# frame (its pivot at the origin) and moved there. Nodes "yokes.<surface>.yokeL|yokeR" (yoke: the hub, the arms, the boss
# and collar, grained vinyl; grip: the grips, leather; alu: the emblem; chrome: the shaft; black: the trim rocker and the
# push-to-talk; red: the disconnect) and "yokes.rubber" (the boots). COLOR_0: rgb = the table's colour (cockpit.js's S),
# darker into the grip's groove, in the collar's groove and in the emblem's field (inside its rim); alpha = the local
# occlusion (build_cockpit.py bakes it: a moving part's from its own pieces only).
import math

GROUPS = ('yokes',)
MAX_TRIS = 2800                       # (it replaces cockpit.js's 2,656 moving triangles of the yokes and 192 of the boots)
DEG = math.pi / 180

# the views of the preview: yaw, pitch [, eye] (build_cockpit.py: yaw 0 looks forward, + to the left)
PREVIEW = {
    'ahead': (0, -8), 'down': (0, -30),
    'yokeL': (0, -25, (-0.30, 0.42, -0.62)),             # the left yoke close, from above and behind
    'yokeR': (-35, -25, (0.1, 0.45, -0.6)),              # the right yoke, from the middle of the cabin
    'profile': (90, -4, (-0.02, 0.29, -0.845)),          # the left yoke's right horn side on (looking along −x)
    'front': (180, 2, (-0.24, 0.30, -1.04)),             # the left yoke from the panel (looking aft)
    'hubSeat': (0, -35, (-0.30, 0.50, -0.62)),           # the left hub and the arms' roots from over the seat
    'trimL': (32.8, -32, (-0.42, 0.39, -0.80)),          # the left grip's switches close
}

# ---------------------------------------------------------------- the shape (in the yoke's frame: the pivot at the origin)
N = 12                                # points round the horns' section (every edge round it turns ≤ 32°: smooth)
SHAFT_R, SHAFT_SEG = 0.013, 16        # the shaft: 26 mm (the old 27), its sides only (its ends are hidden)
SHAFT_Z0, SHAFT_REACH = -0.034, 0.040  # its back end (inside the collar); how far behind the panel at full aft travel
# the hub: a rounded block — its outline (x half-width, y half-height, the outline's squareness, its centre's y, how much
# narrower at the top than at the bottom); along z the rings (z, how far in from the outline) from the front face to the
# aft: the front edge rounded, the side (a little fuller in the middle), the aft edge rounded — each band turning ≤ 35°
# from the next (build_cockpit.py keeps them smooth)
HUB_A, HUB_B, HUB_N, HUB_Y, HUB_TAPER = 0.047, 0.0285, 3.4, -0.003, 0.06
HUB_RINGS = [(-0.0205, 0.0054), (-0.0185, 0.0022), (-0.0145, 0.0004), (0.0195, 0.0004), (0.0235, 0.0022), (0.0255, 0.0054)]
HUB_SEG = 20                          # (18° steps, half a step off the axes: each flat side one straight edge, each corner
                                      # four 18° turns — 16 on the axes showed the corners as facets and the sides as a V)
HUB_FRONT_DOME, HUB_AFT_DOME = 0.0010, 0.0012
# the emblem plate on the hub's aft face: a rounded rectangle (w, h, corner), its foot sunk in the face, raised, its side
# bevelled (the top inset); inside its rim (EMB_RIM wide) the field steps down a little (EMB_STEP) — a framed badge whose
# field (EMB_FIELD × the alu: a satin finish, where the wordmark would be) is darker than its polished rim
EMB_W, EMB_H, EMB_R, EMB_Y = 0.046, 0.021, 0.0075, -0.001
EMB_Z0, EMB_Z2, EMB_IN = 0.0250, 0.0286, 0.0016
EMB_RIM, EMB_STEP, EMB_FIELD = 0.0018, 0.0003, 0.55
# the boss and the collar (r, z) from the collar's front edge back into the hub: the collar (open at its front, which
# faces the panel and is never seen; the shaft fills it), its back step into a groove, the boss widening into the hub
BOSS = [(0.0170, -0.0446), (0.0172, -0.0352), (0.0164, -0.0346), (0.0196, -0.0170)]
COLLAR_FRONT, COLLAR_BACK, GROOVE = 0, 1, 2           # (BOSS's rings)
BOSS_SEG = 12
# the horn's sweep (the right horn; the left mirrored): stations (x, y, z of the centre line; a: the half-thickness in the
# sweep's plane, bf / bb: the half-depth forward / aft (z), kind) — the arm ('a') from inside the hub out and a little
# down, round the bend, to the grip's groove ('g', where the arm's surface ends and the grip's begins) and lip ('l'), the
# grip (finger hollows 'd' and the ridges between them 'r' on its forward face, a palm swell), and the top ring ('t')
# before the dome. One sweep (the tangents through the groove are the same for both), cut at the groove. The first three
# stations flare the arm into the hub's lower side (a moulded root, not a tube pushed into a block): the first inside the
# hub, 40 × 29 mm; the second where it comes out (the hub's side at x 0.047), 33 × 24 mm; the third 18 mm out, 23 × 18
# mm, nearly the arm's 20 × 17 — most of the taper close to the hub, as a fillet.
FD = 0.0015                           # the finger hollows' depth
HORN = [(0.028, -0.0040, 0.0040, 0.0200, 0.0145, 0.0145, 'a'),
        (0.046, -0.0058, 0.0040, 0.0165, 0.0122, 0.0122, 'a'),
        (0.064, -0.0074, 0.0041, 0.0114, 0.0091, 0.0091, 'a'),
        (0.090, -0.0075, 0.0045, 0.0101, 0.0083, 0.0083, 'a'),
        (0.1185, -0.0010, 0.0052, 0.0106, 0.0089, 0.0089, 'a'),
        (0.1335, 0.0105, 0.0059, 0.0114, 0.0096, 0.0096, 'a'),
        (0.1435, 0.0255, 0.0065, 0.0121, 0.0102, 0.0102, 'a'),
        (0.1480, 0.0345, 0.0069, 0.0116, 0.0098, 0.0098, 'g'),
        (0.1494, 0.0392, 0.0071, 0.0140, 0.0118, 0.0118, 'l'),
        (0.1516, 0.0560, 0.0077, 0.0149, 0.0124 - FD, 0.0124, 'd'),
        (0.1524, 0.0665, 0.0081, 0.0153, 0.0127, 0.0127, 'r'),
        (0.1527, 0.0770, 0.0085, 0.0154, 0.0127 - FD, 0.0127, 'd'),
        (0.1526, 0.0872, 0.0088, 0.0153, 0.0126, 0.0126, 'r'),
        (0.1521, 0.0972, 0.0092, 0.0151, 0.0124 - FD, 0.0124, 'd'),
        (0.1513, 0.1070, 0.0095, 0.0147, 0.0121, 0.0121, 'r'),
        (0.1503, 0.1160, 0.0098, 0.0143, 0.0118 - FD, 0.0118, 'd'),
        (0.1492, 0.1250, 0.0101, 0.0139, 0.0115, 0.0115, 't')]
CUT = next(i for i, s in enumerate(HORN) if s[6] == 'g')
DOME_H = 0.0135                       # the rounded top: how far it rises over the top ring
DOME = [(38 * DEG,), (68 * DEG,)]     # its rings (the angle up the dome), then the tip
SUPER = 2.2                           # the section's squareness (a superellipse: 2 an ellipse)
# the switches on the left yoke's left grip (and the right yoke's right grip: the push-to-talk): where on the grip (the
# station's height y, the angle round the section from the grip's outboard side, 90° = aft) and their size
PTT = (0.1085, 125 * DEG, 0.0046, 0.0032, 8)          # y, angle, radius, height out of the grip, sides
APD = (0.0880, 178 * DEG, 0.0040, 0.0026, 10)         # (178°: the inboard face, a little aft; red, so seen: rounder)
TRIM = (50 * DEG, 0.0090, 0.0042, 0.0022)             # its place on the dome (the angle up it, towards the aft side); one
                                                      # half's length (fore and aft), width, height
# the rocker's housing under the halves: a block a little larger than the pair, standing 0.8 mm proud of the dome's
# tangent plane at its middle and reaching 4 mm under it, so that its lower corners (where the dome falls away, about 3 mm
# at its footprint's corners) stay buried in the grip (check() asserts it): (the margin round the halves, its half
# height, how far its middle sits under the dome)
TRIM_BASE = (0.0007, 0.0024, 0.0016)
# the boots (in the cabin's frame, round each shaft): (r, z off the panel face) from inside the panel out to the lip; the
# ring turned half a step (its top a flat edge under the PFD's bezel, at r·cos 15°)
BOOT = [(0.0149, -0.0010), (0.0147, 0.0040), (0.0138, 0.0072)]
BOOT_SEG, BOOT_PHASE = 12, 15 * DEG

# what must stay seen past the yokes from the eye (cockpit.test.mjs; probed from cockpit.js's own build, in the cabin's
# frame): the screens' image points (corners, edge middles, 1 mm in) and the softkey strip's ends, with the yokes at
# rest — and the aim points of the controls behind or round the yokes (every one whose line of sight comes within 40 mm
# of the yokes' boxes; with the yokes at controlsCheck's pose: elev 0, trim 0.1 → 7 mm aft), from the PFD's softkeys
# to the switch row, the key, the primer, the circuit breakers, the park brake, the quadrant and the pedals
SCREENS = [(-0.404, 0.3005, -1.0825), (-0.3, 0.3005, -1.0825), (-0.196, 0.3005, -1.0825), (-0.404, 0.36512, -1.0825),
           (-0.196, 0.36512, -1.0825), (-0.404, 0.42975, -1.0825), (-0.3, 0.42975, -1.0825), (-0.196, 0.42975, -1.0825),
           (-0.404, 0.27981, -1.0825), (-0.196, 0.27981, -1.0825), (-0.053, 0.3005, -1.0825), (0.051, 0.3005, -1.0825),
           (0.155, 0.3005, -1.0825), (-0.053, 0.36512, -1.0825), (0.155, 0.36512, -1.0825), (-0.053, 0.42975, -1.0825),
           (0.051, 0.42975, -1.0825), (0.155, 0.42975, -1.0825), (-0.053, 0.27981, -1.0825), (0.155, 0.27981, -1.0825)]
AIMS = {}                             # (filled in below from AIMS_TXT: id x y z)
AIMS_TXT = '''
cb 0.49 0.13 -1.092 / mag -0.48513 0.1041 -1.078 / mfd.alt.inner -0.069 0.26 -1.065
mfd.alt.outer -0.07388 0.2676 -1.071 / mfd.sk1 -0.04525 0.25875 -1.078 / parkBrake -0.112 -0.037 -1.087
pfd.alt.inner -0.42 0.26 -1.065 / pfd.alt.outer -0.41714 0.26857 -1.071 / pfd.fms.inner -0.18 0.252 -1.065
pfd.fms.outer -0.1828 0.26059 -1.071 / pfd.sk1 -0.39625 0.25875 -1.078 / pfd.sk10 -0.23875 0.25875 -1.078
pfd.sk11 -0.22125 0.25875 -1.078 / pfd.sk12 -0.20375 0.25875 -1.078 / pfd.sk2 -0.37875 0.25875 -1.078
pfd.sk3 -0.36125 0.25875 -1.078 / pfd.sk4 -0.34375 0.25875 -1.078 / pfd.sk5 -0.32625 0.25875 -1.078
pfd.sk6 -0.30875 0.25875 -1.078 / pfd.sk7 -0.29125 0.25875 -1.078 / pfd.sk8 -0.27375 0.25875 -1.078
pfd.sk9 -0.25625 0.25875 -1.078 / primer -0.468 0.183 -1.088 / sw.avionics -0.392 0.095 -1.092
sw.beacon -0.326 0.095 -1.092 / sw.fuelPump -0.356 0.095 -1.092 / sw.landing -0.212 0.095 -1.092
sw.master -0.428 0.095 -1.092 / sw.nav -0.278 0.095 -1.092 / sw.pitot -0.14 0.095 -1.092
sw.strobe -0.248 0.095 -1.092 / sw.taxi -0.176 0.095 -1.092 / pfd.ent -0.1737 0.2695 -1.077
pfd.clr -0.1863 0.2695 -1.077 / pfd.proc -0.1737 0.2785 -1.077 / pfd.fpl -0.1863 0.2785 -1.077
audio.COPLT -0.11 0.28 -1.078 / audio.PILOT -0.139 0.28 -1.078 / pedals -0.3 -0.27 -1.21
mfd.sk2 -0.02775 0.25875 -1.078 / carbHeat@pa44 -0.0775 -0.05474 -1.0082 / carbHeat -0.05 -0.05474 -1.0082
pfd.direct -0.1863 0.2875 -1.077 / pfd.menu -0.1737 0.2875 -1.077 / audio.PLAY -0.139 0.2948 -1.078
mfd.sk3 -0.01025 0.25875 -1.078 / throttle -0.005 0.01532 -1.01598 / pfd.range -0.18 0.304 -1.073
throttle@pa44 -0.036 -0.08927 -1.01226 / prop 0.012 0.06033 -1.03329 / audio.MANSQ -0.11 0.3096 -1.078
audio.AUX -0.139 0.3096 -1.078 / mfd.sk4 0.00725 0.25875 -1.078 / stby.alt 0.255 0.244 -1.09
mfd.sk5 0.02475 0.25875 -1.078 / audio.NAV2 -0.11 0.3244 -1.078 / audio.NAV1 -0.139 0.3244 -1.078
pfd.crs.inner -0.18 0.336 -1.065
'''
# the panel round the boots (the spec's panel: cockpit.js's PFD, MFD, STBY_X, STBY_Y and g1000.js's BEZEL): the displays'
# bezels (cockpit.js's slab() bevels them by 0.002, and three's ExtrudeGeometry pushes the bevel outwards, so the PFD's
# lower edge is 2 mm under its outline: 15 mm over the left shaft) and the standby altimeter's (a 0.07 square, its corners
# rounded 6 mm, from 3 to 15 mm off the panel, beside the right shaft — see check()); worked out in layout()
BEZEL_BEVEL, STBY_SIZE = 0.002, ((0.07, 0.07, 0.015), 0.006)
for _row in AIMS_TXT.replace('\n', ' / ').split(' / '):
    if _row.strip():
        _k, _x, _y, _z = _row.split(); AIMS[_k] = (float(_x), float(_y), float(_z))
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
    # the hit boxes in the yoke's frame: (min, max) — the hub's, the right horn's, the left horn's, and the arms' corridor
    # between them (as deep as the horns' box, from the hub's box to the horns', up to a third of the horns' box)
    hw, hh, hd, ox, oy, oz = H['hub']; L.HUB = (V((ox - hw / 2, oy - hh / 2, oz - hd / 2)), V((ox + hw / 2, oy + hh / 2, oz + hd / 2)))
    w, h, d, ox, oy, oz = H['horn']
    L.HORN_R = (V((ox - w / 2, oy - h / 2, oz - d / 2)), V((ox + w / 2, oy + h / 2, oz + d / 2)))
    L.HORN_L = (V((-ox - w / 2, oy - h / 2, oz - d / 2)), V((-ox + w / 2, oy + h / 2, oz + d / 2)))
    L.CORR = (V((L.HUB[1].x, L.HUB[0].y, L.HORN_R[0].z)), V((L.HORN_R[0].x, L.HORN_R[0].y + h / 3, L.HORN_R[1].z)))
    L.SHAFT_Z1 = (L.PZ - L.Z0) - L.TRAVEL - SHAFT_REACH   # the shaft's front end (yoke frame): behind the panel at full aft
    P = S['panel']; L.BEZEL = P['BEZEL']; L.BEZELS = (P['PFD'], P['MFD'])
    L.PFD_BEZEL_BOT = P['PFD'][1] - P['BEZEL']['h'] / 2 - BEZEL_BEVEL
    L.STBY_ALT = ((P['STBY_X'], P['STBY_Y'][2]),) + STBY_SIZE
    AIMS['stby.alt'] = (P['STBY_X'],) + AIMS['stby.alt'][1:]   # (the standby altimeter's aim: on its centre)
    ctx._yokes = L
    return L


# ---------------------------------------------------------------- helpers
def oval(phi, a, b, n=2.0):
    # the point of the superellipse |u/a|^n + |w/b|^n = 1 whose normal is at the angle phi (so that equal steps of phi turn
    # the normal equally: no edge sharper than the step, and build_cockpit.py keeps every one of them smooth)
    m = n / (n - 1); c, s = math.cos(phi), math.sin(phi)
    S = abs(a * c) ** m + abs(b * s) ** m
    return math.copysign(a * abs(a * c) ** (1 / (n - 1)) / S ** (1 / n), c), math.copysign(b * abs(b * s) ** (1 / (n - 1)) / S ** (1 / n), s)


def tangents(ctx, cs):
    # the centre line's tangent at each station (central differences)
    out = []
    for i in range(len(cs)):
        a, b = cs[max(0, i - 1)], cs[min(len(cs) - 1, i + 1)]
        out.append((b - a).normalized())
    return out


def frame(ctx, t):
    # the section's frame: U in the sweep's plane (W × T: up along the arm, inboard up the grip), W the depth (aft)
    Z = ctx.Vector((0, 0, 1)); W = (Z - t * Z.dot(t)).normalized(); U = W.cross(t).normalized()
    return U, W


def section(ctx, c, t, a, bf, bb):
    # the section's ring: counter-clockwise about the tangent (so a strip of rings faces outwards); bf the depth forward
    # (−W), bb aft (+W); the first point outboard / down (−U), so that the angle 90° is aft
    U, W = frame(ctx, t)
    ring = []
    for j in range(N):
        phi = math.pi + 2 * math.pi * j / N
        u, w = oval(phi, a, bb if math.sin(phi) > 0 else bf, SUPER)
        ring.append(c + U * u + W * w)
    return ring


def surface_point(ctx, st, t, ang):
    # a point on a station's section at the angle ang from the outboard side (90° aft, 180° inboard) and its normal
    x, y, z, a, bf, bb, kind = st
    c = ctx.Vector((x, y, z)); U, W = frame(ctx, t)
    phi = math.pi + ang
    u, w = oval(phi, a, bb if math.sin(phi) > 0 else bf, SUPER)
    return c + U * u + W * w, (U * math.cos(phi) + W * math.sin(phi)).normalized()


def horn_rows(ctx):
    # the horn's sections along its stations (one sweep), then the dome's rings over the top one; and the dome's tip
    V = ctx.Vector
    cs = [V(st[:3]) for st in HORN]; ts = tangents(ctx, cs)
    rows = [section(ctx, c, t, st[3], st[4], st[5]) for c, t, st in zip(cs, ts, HORN)]
    c, t, st = cs[-1], ts[-1], HORN[-1]
    for (phi,) in DOME:
        k = math.cos(phi); rows.append(section(ctx, c + t * (DOME_H * math.sin(phi)), t, st[3] * k, st[4] * k, st[5] * k))
    return rows, cs[-1] + ts[-1] * DOME_H


def horn(ctx, part):
    # the right horn's arm (from inside the hub to the groove: open at its start) or grip (from the groove over the top)
    rows, tip = horn_rows(ctx); P = ctx.Piece()
    if part == 'arm': P.grid(rows[:CUT + 1], ctx.C['yoke'], closed=True); return P
    P.grid(rows[CUT:], ctx.C['grip'], closed=True)
    base = len(P.v) - N; P.fan(list(range(base, base + N)), tip, ctx.C['grip'], flip=True)
    return P


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
def hub(ctx):
    # the centre block: a rounded outline (a little wider at the bottom, where the arms come in) along z through its rings,
    # its front and aft faces domed fans
    P = ctx.Piece(); V = ctx.Vector; col = ctx.C['yoke']
    def outline(d, z):
        pts = []
        for j in range(HUB_SEG):
            u, w = oval(2 * math.pi * (j + 0.5) / HUB_SEG, HUB_A - d, HUB_B - d, HUB_N)
            pts.append(V((u * (1 - HUB_TAPER * w / HUB_B), HUB_Y + w, z)))        # (narrower at the top)
        return pts
    rows = [outline(d, z) for z, d in HUB_RINGS]
    base = P.grid(rows, col, closed=True)
    P.fan(list(range(base, base + HUB_SEG)), V((0, HUB_Y, HUB_RINGS[0][0] - HUB_FRONT_DOME)), col, flip=False)
    last = base + (len(rows) - 1) * HUB_SEG
    P.fan(list(range(last, last + HUB_SEG)), V((0, HUB_Y, HUB_RINGS[-1][0] + HUB_AFT_DOME)), col, flip=True)
    return P


def emblem(ctx):
    # the plate: its foot sunk into the hub's aft face, its bevelled side (leaning in) up to the rim, the rim's inner edge
    # stepping down to the flat field
    P = ctx.Piece(); V = ctx.Vector; col = ctx.C['alu']
    o = rounded_outline(EMB_W, EMB_H, EMB_R, 2)
    oi = rounded_outline(EMB_W - 2 * EMB_IN, EMB_H - 2 * EMB_IN, EMB_R - EMB_IN, 2)
    k = EMB_IN + EMB_RIM; of = rounded_outline(EMB_W - 2 * k, EMB_H - 2 * k, EMB_R - k, 2)
    rows = [[V((x, EMB_Y + y, EMB_Z0)) for x, y in o], [V((x, EMB_Y + y, EMB_Z2)) for x, y in oi],
            [V((x, EMB_Y + y, EMB_Z2 - EMB_STEP)) for x, y in of]]
    base = P.grid(rows, col, closed=True)
    last = base + 2 * len(o)
    P.fan(list(range(last, last + len(o))), V((0, EMB_Y, EMB_Z2 - EMB_STEP)), col, flip=True)
    return P


def boss(ctx): return ring_strip(ctx, BOSS, BOSS_SEG, ctx.C['yoke'])


def shaft(ctx):
    L = layout(ctx)
    return ring_strip(ctx, [(SHAFT_R, L.SHAFT_Z1), (SHAFT_R, SHAFT_Z0)], SHAFT_SEG, ctx.C['chrome'])


def grip_station(ctx, y):
    # the horn's station at height y on the grip (interpolated; the aft half is the same at a hollow as at a ridge) and its
    # tangent
    cs = [ctx.Vector(st[:3]) for st in HORN]; ts = tangents(ctx, cs)
    for i in range(CUT, len(HORN) - 1):
        a, b = HORN[i], HORN[i + 1]
        if a[1] <= y <= b[1]:
            t = (y - a[1]) / (b[1] - a[1])
            return tuple(ctx.lerp(a[k], b[k], t) for k in range(6)) + (a[6],), (ts[i] * (1 - t) + ts[i + 1] * t).normalized()
    raise ValueError(y)


def switches(ctx, which):
    # the right grip's (mirrored for the left yoke's left grip): the push-to-talk; and with 'pilot' the trim rocker (black)
    # and the disconnect (red)
    V = ctx.Vector
    blk, red = ctx.Piece(), ctx.Piece()
    y, ang, r, h, seg = PTT; st, tg = grip_station(ctx, y); p, n = surface_point(ctx, st, tg, ang)
    blk.add(button(ctx, p, n, r, h, ctx.C['black'], seg))
    if which == 'pilot':
        y, ang, r, h, seg = APD; st, tg = grip_station(ctx, y); p, n = surface_point(ctx, st, tg, ang)
        red.add(button(ctx, p, n, r, h, ctx.C['red'], seg))
        # the trim rocker: two halves side by side on their housing, on the dome towards the aft side, rocking fore and aft
        q, nrm, U, along = trim_place(ctx)
        phi, ln, wd, ht = TRIM; mg, bh, sink = TRIM_BASE
        top = -sink + bh                                                        # (the housing's top over the tangent plane)
        blk.add(ctx.box(q + nrm * (top - bh), (wd + mg, bh, ln / 2 + mg), (U, nrm, along), ctx.C['black']))
        for sd in (-1, 1):
            blk.add(ctx.box(q + nrm * (top + ht / 2 - 0.0003) + U * (sd * (wd / 2 + 0.0004)), (wd / 2, ht / 2, ln / 2), (U, nrm, along), ctx.C['black']))
    return blk, red


def trim_place(ctx):
    # the trim rocker's place on the right grip's dome (towards the aft side): the point, the dome's normal there, the
    # across (U) and the fore-and-aft (up the slope) directions
    V = ctx.Vector; phi = TRIM[0]
    s = HORN[-1]; c = V(s[:3]); t = tangents(ctx, [V(q[:3]) for q in HORN])[-1]; U, W = frame(ctx, t)
    k = math.cos(phi)
    q = c + t * (DOME_H * math.sin(phi)) + W * (s[5] * k)                      # on the dome's aft slope
    nrm = (t * math.sin(phi) / DOME_H + W * math.cos(phi) / s[5]).normalized()
    along = nrm.cross(U).normalized()                                           # (fore and aft, up the slope)
    if along.dot(W) > 0: along = -along
    return q, nrm, U, along


def placed(ctx, piece, sd):
    # a piece of the yoke's frame moved to the yoke at side sd (−1: the left one, +1: the right)
    L = layout(ctx); o = ctx.Vector((sd * L.X0, L.Y0, L.Z0))
    piece.v = [v + o for v in piece.v]
    return piece


def mirrored(ctx, piece):
    return ctx.mirror_x(piece)


def yoke_pieces(ctx, sd):
    # one yoke's nodes ({surface: Piece}) in its own frame; sd: which seat (its switches)
    arm, grp = horn(ctx, 'arm'), horn(ctx, 'grip')
    out = {
        'yoke': ctx.Piece().add(hub(ctx)).add(boss(ctx)).add(arm).add(mirrored(ctx, arm)),
        'grip': ctx.Piece().add(grp).add(mirrored(ctx, grp)),
        'alu': emblem(ctx),
        'chrome': shaft(ctx),
    }
    if sd < 0:                                                 # the pilot's: on the left grip (the right one's mirrored)
        blk, red = switches(ctx, 'pilot'); out['black'] = mirrored(ctx, blk); out['red'] = mirrored(ctx, red)
    else:                                                      # the instructor's: his push-to-talk on the right grip
        blk, _ = switches(ctx, 'copilot'); out['black'] = blk
    return out


def boots(ctx):
    L = layout(ctx); P = ctx.Piece()
    for sd in (-1, 1):
        P.add(ring_strip(ctx, [(r, L.PZ + dz) for r, dz in BOOT], BOOT_SEG, ctx.C['rubber'], centre=(sd * L.X0, L.Y0), phase=BOOT_PHASE))
    return P


# ---------------------------------------------------------------- the colours
def local(ctx, co):
    L = layout(ctx); sd = -1 if co.x < 0 else 1
    return ctx.Vector((co.x - sd * L.X0, co.y - L.Y0, co.z - L.Z0))


def yoke_col(ctx):
    # the vinyl's colour; darker into the grip's groove (the arm's last ring) and in the collar's groove
    base = ctx.C['yoke']; gx, gy = HORN[CUT][0], HORN[CUT][1]
    def f(co):
        p = local(ctx, co); k = 1.0
        d = math.hypot(abs(p.x) - gx, p.y - gy)
        if d < 0.012: k = min(k, ctx.lerp(0.55, 1.0, ctx.clamp(d / 0.012, 0, 1)))
        if math.hypot(p.x, p.y) < 0.02 and BOSS[COLLAR_BACK][1] - 0.002 < p.z < BOSS[GROOVE][1] + 0.0025: k = min(k, 0.6)
        return tuple(c * k for c in base)
    return f


def grip_col(ctx):
    # the leather's colour, a shade darker in the finger hollows and the groove at the grip's foot
    base = ctx.C['grip']; dips = [st for st in HORN if st[6] == 'd']; g, l = HORN[CUT], HORN[CUT + 1]
    def f(co):
        p = local(ctx, co); k = 1.0
        for st in dips:
            if p.z < st[2] - 0.004: k = min(k, ctx.lerp(0.8, 1.0, ctx.clamp(abs(p.y - st[1]) / 0.007, 0, 1)))
        if p.y < l[1]: k = min(k, ctx.lerp(0.6, 1.0, ctx.clamp((p.y - g[1]) / (l[1] - g[1]), 0, 1)))
        return tuple(c * k for c in base)
    return f


def emblem_col(ctx):
    # the plate's metal: a badge, not a window — its bevel and rim bright (polished), the field inside the rim a satin
    # metal a good deal darker, the bevel's foot a shade darker than the rim
    base = ctx.C['alu']
    def f(co):
        p = local(ctx, co)
        if p.z > EMB_Z2 - 1e-5: k = 1.0                                        # (the rim)
        elif p.z < EMB_Z0 + 1e-5: k = 0.85                                     # (the bevel's foot)
        else: k = EMB_FIELD                                                     # (the field)
        return tuple(c * k for c in base)
    return f


# ---------------------------------------------------------------- the protocol
def parts(ctx):
    out = {}
    cols = {'yoke': yoke_col(ctx), 'grip': grip_col(ctx), 'alu': emblem_col(ctx)}
    for sd, name in ((-1, 'yokeL'), (1, 'yokeR')):
        for surf, pc in yoke_pieces(ctx, sd).items():
            out[f'yokes.{surf}.{name}'] = (placed(ctx, pc, sd), cols.get(surf))
    out['yokes.rubber'] = (boots(ctx), None)
    return out


def proxies(ctx):
    # what stays in code round the boots (cockpit.js): the panel's face, the displays' bezels (the PFD's over the left boot),
    # the standby altimeter's (beside the right one); and the shaft through each boot (always there, whatever the travel)
    L = layout(ctx); V = ctx.Vector; z = L.PZ + 0.0002
    out = [('quad', V((-0.545, L.S['pbot'] + 0.008, z)), V((0.545, L.S['pbot'] + 0.008, z)), V((0.545, L.S['ptop'] - 0.008, z)), V((-0.545, L.S['ptop'] - 0.008, z)))]
    B = L.BEZEL
    for cx, cy in L.BEZELS: out.append(('box', (cx, cy, L.PZ + B['depth'] / 2), (B['w'], B['h'], B['depth'])))
    (cx, cy), (w, h, d), _ = L.STBY_ALT
    out.append(('box', (cx, cy, L.PZ + 0.003 + (d - 0.003) / 2), (w, h, d - 0.003)))
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
    # nothing: the arms' and the grips' first ring, the buttons' feet, the shaft's and the boots' axes) is positive
    for k, ob in mine.items():
        for pls, o in components(ob):
            vol = 0.0
            for pl in pls:
                a, b, c = (ob.data.vertices[i].co - o for i in pl.vertices); vol += a.dot(b.cross(c)) / 6
            assert vol > 0, (k, 'a piece inside out', tuple(o), vol)
    # no slits: every open edge of a piece is on a small loop (the hidden ends: the arms' start inside the hub, the grooves,
    # the buttons' and the emblem's feet, the shaft's and the boss's ends, the boots')
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
    def inside(v, box, eps=1e-6): return all(box[0][i] - eps <= v[i] <= box[1][i] + eps for i in range(3))
    room = {}
    for n, p in piv.items():
        for k, ob in mine.items():
            if not k.endswith('.' + n) or '.chrome.' in k: continue
            for v in verts(ob):
                q = v - p
                if q.z < L.HUB[0].z: assert math.hypot(q.x, q.y) <= BOSS[-1][0] + 1e-6, (k, 'forward of the hub, off the shaft', tuple(q))
                else: assert any(inside(q, b) for b in (L.HUB, L.HORN_R, L.HORN_L, L.CORR)) or inside(V((-q.x, q.y, q.z)), L.CORR), (k, 'outside the hit boxes', tuple(q))
        g = [v - p for v in verts(mine[f'yokes.grip.{n}'])]
        room[n] = (L.HORN_R[1].y - max(v.y for v in g), L.HORN_R[1].x - max(abs(v.x) for v in g), min(abs(v.x) for v in g) - L.HORN_R[0].x)
    # the lines of sight from the eye: the screens' points with the yokes at rest, the controls' aim points with them 7 mm
    # aft (cockpit.test.mjs: nothing drawn more than 30 mm before the point) — each line and four more 1.5 mm to its sides
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
                if loc is not None: blocked.append((name, n, tuple(round(c, 4) for c in loc))); return
            # (for the report: how close the line comes to the yoke's surface, sampled along it)
            best = min(T[(n, dz)].find_nearest(EYE + a * (far * i / 60))[3] for i in range(10, 61))
            close[name] = min(close.get(name, 9), best)
    for p in SCREENS: look('screen %s' % (p,), p, 0.0)
    for k, p in AIMS.items(): look(k, p, CHECK_DZ)
    assert not blocked, ('the yokes hide', blocked)
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
    # the switches seated: the trim rocker's housing's lower corners and the buttons' feet inside the grip (ray parity
    # against the grip's faces, up and fore and aft — away from its open foot)
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
    def feet():
        # the right grip's (the yoke's frame): the push-to-talk's foot ring, the disconnect's, the housing's lower corners
        out = {}
        for nm, (y, ang, r, h, seg) in (('ptt', PTT), ('apd', APD)):
            st, tg = grip_station(ctx, y); p, n = surface_point(ctx, st, tg, ang)
            t = n.cross(V((0, 1, 0))) if abs(n.y) < 0.9 else n.cross(V((1, 0, 0))); t.normalize(); b = n.cross(t)
            out[nm] = [p - n * 0.002 + (t * math.cos(2 * math.pi * k / seg) + b * math.sin(2 * math.pi * k / seg)) * r for k in range(seg)]
        q, nrm, U, along = trim_place(ctx); phi, ln, wd, ht = TRIM; mg, bh, sink = TRIM_BASE
        out['trim'] = [q - nrm * (sink + bh) + U * (su * (wd + mg)) + along * (sa * (ln / 2 + mg)) for su in (-1, 1) for sa in (-1, 1)]
        return out
    # the hidden ends inside the hub (its own closed piece): the arms' open first rings, the emblem's foot, the boss's back
    # end — none of them may show at the hub's surface
    hp = hub(ctx); hub_t = BVHTree.FromPolygons(hp.v, hp.f)
    rows, _ = horn_rows(ctx)
    ends = {'arm': rows[0] + [V((-q.x, q.y, q.z)) for q in rows[0]],
            'emblem': [V((x, EMB_Y + y, EMB_Z0)) for x, y in rounded_outline(EMB_W, EMB_H, EMB_R, 2)],
            'boss': [V((BOSS[-1][0] * math.cos(2 * math.pi * k / BOSS_SEG), BOSS[-1][0] * math.sin(2 * math.pi * k / BOSS_SEG), BOSS[-1][1])) for k in range(BOSS_SEG)]}
    buried = {}
    for nm, pts in ends.items():
        out = [tuple(round(c, 4) for c in q) for q in pts if not inside(hub_t, q)]
        assert not out, (nm, 'its hidden end shows out of the hub', out)
        buried[nm] = round(min(hub_t.find_nearest(q)[3] for q in pts) * 1000, 2)
    seated = {}
    for n, p in piv.items():
        me = mine[f'yokes.grip.{n}'].data
        gt = BVHTree.FromPolygons([v.co for v in me.vertices], [tuple(pl.vertices) for pl in me.polygons])
        sd = -1 if n == 'yokeL' else 1
        for nm, pts in feet().items():
            if sd > 0 and nm != 'ptt': continue                                 # (the right yoke: its push-to-talk only)
            pts = [V((sd * q.x, q.y, q.z)) + p for q in pts]
            out = [round(gt.find_nearest(q)[3] * 1000, 2) for q in pts if not inside(gt, q)]
            assert not out, (n, nm, 'not seated in the grip: corners out by (mm)', out)
            seated[f'{n}.{nm}'] = round(min(gt.find_nearest(q)[3] for q in pts) * 1000, 2)
    # the right shaft and boot against the standby altimeter's bezel (cockpit.js's rounded square, from 3 to 15 mm off
    # the panel: the boot reaches 7 mm out, so both meet it): the distance from the shaft's axis to the bezel's outline,
    # less the shaft's and the boot's radius — at least 2 mm (cockpit.js's STBY_X keeps the stack clear of the shaft)
    (cx, cy), (w, h, d), rc = L.STBY_ALT
    qx, qy = abs(L.X0 - cx) - (w / 2 - rc), abs(L.Y0 - cy) - (h / 2 - rc)
    to_bezel = math.hypot(max(qx, 0), max(qy, 0)) + min(max(qx, qy), 0) - rc
    alt_gap = (to_bezel - SHAFT_R, to_bezel - max(r for r, z in BOOT))
    assert min(alt_gap) > 0.002, ('the right shaft or boot against the standby altimeter\'s bezel (cockpit.js STBY_X)', alt_gap)
    tight = sorted(close.items(), key=lambda kv: kv[1])[:8]
    sharp = {}
    for k, ob in mine.items():
        at = ob.data.attributes.get('sharp_edge')
        sharp[k.split('.', 1)[1]] = sum(1 for d in at.data if d.value) if at else 0
    print('yokes: room in the horns\' boxes (top, outboard, inboard) %s mm; the closest lines of sight (to the surface) %s; '
          'the left boot %.1f mm under the PFD\'s bezel, the boots\' lips %.2f mm off the shafts; the ends in the hub buried by '
          '(mm) %s; the switches by %s; '
          'the right shaft / boot to the standby altimeter\'s bezel %.1f / %.1f mm%s; sharp edges %s'
          % ({n: tuple(round(r * 1000, 1) for r in v) for n, v in room.items()}, [(k, round(v * 1000, 1)) for k, v in tight],
             (L.PFD_BEZEL_BOT - top) * 1000, lip * 1000, buried, seated, alt_gap[0] * 1000, alt_gap[1] * 1000,
             ' (INTO IT: cockpit.js\'s STBY_X)' if min(alt_gap) < 0 else '', sharp))
