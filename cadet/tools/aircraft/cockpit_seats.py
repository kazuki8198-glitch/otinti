# CADET — tools/aircraft/cockpit_seats.py : the two front seats, the rear bench and their belts in the flown aircraft's
# cabin, a part module of tools/aircraft/build_cockpit.py (run by it, never alone; see its header):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-]
#   (a group alone, for its previews: … -- /tmp/cockpit.json /tmp/trial.glb /tmp/prev band,seats — never into assets/model,
#   which must hold every group; tools/aircraft/trial-glb.mjs runs the game's tests against such a trial model)
# The Archer TX's seats (Piper's TX photos: 19_Archer-TX_Interior_08, tx_topleft, tx_leftfront; audit-1's seat and belt
# items): one-colour light-grey synthetic leather (cockpit.js's S: the panels light grey, the bolsters and shells a little
# darker; no tan or brown), plain stitched panels with a few wide horizontal channels, and three-point belts on every seat.
# - the front seats (one made on the right and mirrored): the cushion and the back are separate, each a closed
#   upholstered body (the side bolsters, rolled round from their piping — a crisp welt along the panel, the one hard edge
#   — over the crown to the side, the sides, the bottom or the hard rear shell, the cushion's soft front roll with its
#   corners rounded in plan, the back's top rolled over into rounded shoulders) with its centre panel laid into a recess
#   between the bolsters — a pillow of its own, its crown 1.2 cm behind the bolsters' (on the back) or level with the old
#   insert's top (on the cushion), sewn across in wide channels (3 up the back, 3 along the cushion; each seam a groove
#   and darker), its edges tucked in under the bolsters' lips. The back swells a little at the lumbar; its bolsters ease
#   back towards its foot, which goes down behind the cushion; the cushion's rear is pushed into that foot, so the two
#   panels meet in a closed crease. The TX's tall back: no headrest on posts — the back rises to rounded shoulders and a
#   padded headrest is moulded on its top, an arch across nearly the back's width (its lower part sunk into the back,
#   its face crowned and bordered by seams, 2.5 cm proud of the back's face, its rear flush with the shell), so that the
#   back's top is the headrest, as in the TX photos. Under the cushion: the black seat pan and the
#   frame's two side plates, standing on the two aluminium seat tracks on the floor; outboard at the back's foot, the
#   recline lever (a housing and its handle).
# - the rear bench (the TX's: one fixed bench — audit-1): one wide cushion (two panels meeting in a seam down its middle,
#   one seam across them) and a back of two sections (each lofted across with raised rolls at its ends and down the
#   middle, its panel sewn in 3 channels), no headrests. It is seen from 1.1 m and further, mostly over and between the
#   front backs (its cushion only as a sliver of its right front corner, looking back right and down past the
#   instructor's seat), so it is plainer: its cushion's ends square, its panels flat across.
# - the belts (TX: dark charcoal webbing, a black push-button buckle with a red tab; the photos and audit-1): on every seat
#   a lap belt — its buckle half on a short strap from the inboard rear of the cushion, its outboard half from the
#   outboard rear, with a black adjuster — and an inertia-reel shoulder harness out of a black slot cover in the
#   headliner above and behind the seat (the front ones just behind the backs' tops, above the forward part of the rear
#   side window — on the right, aft of the door's rear edge —, the rear ones above the small aft windows), its end
#   clipped by a chrome snap hook to the lap belt by its tongue (the chrome latch plate). The rear belts lie buckled across their empty places, as in
#   Piper's photos (the harness over the back's outboard top and across its face to the buckle by the bench's middle).
#   The pilot's own lies open on the seat (the camera is the pilot): the harness over the back's outboard top and down
#   its face to the cushion, the outboard half and its tongue lying in across the cushion, the buckle on the inboard
#   bolster. The instructor's (cockpit.js's instructorSeat: actor.js seats him there, and he moves — he leans in to point,
#   turns, gestures — while a belt made here cannot) lies beside him, never through him: the buckle on the inboard
#   bolster under his left elbow, the outboard half and the tongue down the cushion's outboard side, the harness
#   unclipped and wound up in its reel, its end and snap hook hanging out of the slot behind his seat's top (his every
#   pose checked against them: cockpit.test, 'the instructor clear of the right seat's belts').
# How it is built: every upholstered part is a loft — rings (sections) along a path, closed at both ends by caps clipped
#   from the end rings (the bodies' recesses stay notches in them) — its rounded ends made by moving the end rings in
#   towards the ring's middle (cos θ) as they move out (sin θ); the seams are rings of their own (a groove of 7 mm, the
#   colour 0.78× the leather's), so the channels pillow under smooth shading; the sections turn by under 30° a point
#   wherever they are meant to look round (build_cockpit.py makes an edge hard over 38°); the stations are ≤ 8.6 cm
#   apart on the front seats' faces (the game bakes the sky's occlusion per vertex). A strap is a thin flat band swept
#   along a smooth path through its keys, each laid onto the seat it rests on (cast along the key's direction, the band
#   put on the highest point under its width, 1.2 mm off it) or hanging in the air; the hardware is blocks laid on the
#   seat the same way. Every part is closed and faces outwards (its shadow; check() tries each connected part on its
#   own), the headrest's face and body together (two nodes, the same seam edges).
# Made to the cabin's layout (the spec): the seats' places (seatX, seat.z), and what other code relies on — the
#   instructor on the right seat (cockpit.js's instructorSeat: the cushion's top under his hips and thighs as the old
#   insert's, −0.147 at z −0.41, raked 5°, no bolster under his thighs at x 0.13–0.45; the back and the headrest
#   BACK_AFT behind the old ones, as his hips are behind actor.js's SEATED_PA28 — the bolsters' crowns on the old back's
#   front plane moved back so, reclined 13°, nothing more than 1 cm in front of it, beside his arms; the panel recessed
#   behind it at his hips; the headrest's face behind the old one's insert moved back so, behind his head); the flap
#   handle's and the trim wheel's sight lines past the left seat (FLAP, TRIMW: clear by ≥ 2 cm); the console between
#   the seats (inner edges at |x| ≥ 0.07); the lower walls outboard (lowX) and the window band and the headliner above
#   them (the belts); the eye (nothing nearer than 0.2 m); the bench behind (the cabin within 2.2 m); the occlusion
#   proxy's boxes for the seats (AO_OCC: each part within its box or no further out than the old shapes were, but where
#   noted in check()) — check() asserts them all, and that no belt goes into a seat. The old shapes' numbers that the
#   spec has not (heights, recline, the bench) are copied from cockpit.js (seat(), the rear bench's lines), each marked.
# Coordinates: the cabin's frame (metres, x = the right wing, y = up, z = aft), as build_cockpit.py.
# Nodes ("<group>.<surface>", the surfaces cockpit.js's): seats.seat (the front seats' centre panels: cushions, backs,
#   headrests' faces), seats.seatSide (their bodies: bolsters, sides, shells, front rolls, headrests), seats.black (the
#   seat pans, the frames' side plates, the recline levers; the front belts' buckles, adjusters and slot covers),
#   seats.alu (the seat tracks), seats.chrome (the front belts' tongues and snap hooks), seats.red (the buckles' tabs),
#   seats.belt (the front belts' webbing); bench.seat (the bench's centre panels), bench.seatSide (its bodies), and its
#   belts' bench.belt, bench.black, bench.chrome, bench.red. (The webbing's surface is cockpit.js's S.belt; a spec
#   without it — a cockpit.js older than the belts — gets S.grip's, the yokes' dark leather, instead.) COLOR_0 rgb: the
#   table's colour, darker in the seams and the crevices along the panels' edges, the webbing's own charcoal (alpha:
#   build_cockpit.py's occlusion of what is close by).
import math
from mathutils import Vector
from mathutils.kdtree import KDTree
from mathutils.bvhtree import BVHTree

GROUPS = ('seats', 'bench')
MAX_TRIS = 4600                       # (they replace 6,440 triangles of rounded boxes in code; ~1,000 of it the belts)

DEG = math.pi / 180
# ---------------------------------------------------------------- the old shapes' numbers (cockpit.js) that the spec has not
# seat(): the cushion's leather insert rbox(w − 0.13, 0.035, 0.44) at y −0.15, z SEAT.z + 0.005, raked 5° (front up):
# its top 0.0175 over that → −0.1325 at z SEAT.z; the new panel's crown follows it (where the instructor sits)
CUSHION_TOP, RAKE = -0.1325, 5 * DEG
# seat(): the back rbox(w, 0.62, 0.105) at y by = 0.17, z bz = SEAT.z + 0.40, reclined 13°: its front (the bolsters'
# crowns now), its top, its thickness
BACK_Y, BACK_DZ, RECLINE, BACK_HALF = 0.17, 0.40, 13 * DEG, 0.0525
# the backs and the headrests stand this far behind the old ones: the instructor sits where cockpit.js's instructorSeat
# puts his hips (z −0.38, 3 cm behind actor.js's SEATED_PA28, so that his knees clear the right yoke's horns as it rolls),
# against them, not in them
BACK_AFT = 0.03
# seat(): the headrest rbox(0.25, 0.155, 0.085) at y 0.615, z bz + 0.06, tilted 8°, its insert's face at z −0.175; the TX's
# moulded one keeps its height, width and tilt, its face HEAD_BACK behind that (2.5 cm proud of the back's face, not 4)
HEAD_Y, HEAD_FRONT, HEAD_TILT, HEAD_BACK = 0.615, -0.172, 8 * DEG, 0.016
# seat(): the seat tracks at ±0.15 from the seat's middle, z SEAT.z − 0.05 ± 0.31 (FLOOR + 0.012 ± 0.0125)
TRACK_X, TRACK_Z = 0.15, (-0.36, 0.26)
# the rear bench (cockpit.js): its cushion's inserts at x ±0.25, top −0.1125 at z 0.48, raked 4°; its back at y 0.18,
# z 0.86, reclined 16°, 0.11 thick, x ±0.5 (the TX's taller than the old one: no headrests on it)
BENCH = {'z': 0.48, 'top': -0.1125, 'rake': 4 * DEG, 'x': 0.5, 'place': 0.255,
         'backY': 0.18, 'backZ': 0.86, 'recline': 16 * DEG, 'backHalf': 0.055}
# the belts: the webbing's width and thickness (2 in, as Piper's lap belts and harnesses), how far a strap lies off what
# it rests on (where it is tried across its width: ACROSS); the harnesses' slots in the headliner (x, z: over the front
# seats, just behind their backs' tops — 12 cm aft of the rear window's forward edge, 16–19 cm aft of the door's rear
# edge, cockpit.js W2 / map-walls' door seam — and over the bench, above the aft window W3's forward part); the webbing's
# colour without S.belt (sRGB)
BELT_W, BELT_T, BELT_GAP = 0.046, 0.0024, 0.0015
ACROSS = (-0.5, -0.375, -0.25, -0.125, 0.0, 0.125, 0.25, 0.375, 0.5)    # (where a strap is tried across its width)
SLOT_F, SLOT_R = (0.435, 0.03), (0.43, 1.00)
STOWED = 0.12                         # (how far the instructor's harness, unclipped and wound up, hangs out of its slot)
BELT_C = (0.153, 0.161, 0.176)

_G = {}                               # what parts() made, for check()

# ---------------------------------------------------------------- lofts
def ear_clip(pts):
    # a simple polygon [(x, y)] → triangles (index triples, with the polygon's own winding)
    n = len(pts); idx = list(range(n))
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    sg = 1 if area > 0 else -1
    cr = lambda o, a, b: ((a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])) * sg
    def inside(p, a, b, c): return cr(a, b, p) > 1e-12 and cr(b, c, p) > 1e-12 and cr(c, a, p) > 1e-12
    tris = []
    while len(idx) > 3:
        m = len(idx)
        for k in range(m):
            i0, i1, i2 = idx[k - 1], idx[k], idx[(k + 1) % m]
            if cr(pts[i0], pts[i1], pts[i2]) <= 1e-12: continue
            if any(inside(pts[j], pts[i0], pts[i1], pts[i2]) for j in idx if j not in (i0, i1, i2)): continue
            tris.append((i0, i1, i2)); idx.pop(k); break
        else:
            tris.append((idx[-1], idx[0], idx[1])); idx.pop(0)
    tris.append(tuple(idx))
    return tris

class Part:
    # a closed shell in the making: vertices, faces, a colour per vertex
    def __init__(self): self.v, self.f, self.vc = [], [], []
    def add(self, o):
        k = len(self.v); self.v += o.v; self.f += [tuple(i + k for i in f) for f in o.f]; self.vc += o.vc
        return self
    def mirrored(self):
        m = Part(); m.v = [Vector((-p.x, p.y, p.z)) for p in self.v]; m.f = [tuple(reversed(f)) for f in self.f]; m.vc = list(self.vc)
        return m
    def volume(self):
        vol = 0.0
        for f in self.f:
            a = self.v[f[0]]
            for i in range(1, len(f) - 1): vol += a.dot(self.v[f[i]].cross(self.v[f[i + 1]])) / 6
        return vol

def loft(P, rings, cols):
    # rings: stations along the path, each a ring of local points (a, b, t) (a, b in the ring's plane, t along), the
    # same count each, mapped by P; cols: a colour per point per ring. Closed by caps clipped from the end rings, every
    # face turned outwards.
    p = Part(); n = len(rings[0])
    for r, cs in zip(rings, cols): p.v += [P(*q) for q in r]; p.vc += list(cs)
    tube = []
    for i in range(len(rings) - 1):
        for j in range(n):
            a, b = i * n + j, i * n + (j + 1) % n
            tube.append((a, b, b + n, a + n))
    # the tube outwards: its face furthest from the path's middle points away from it
    mid = (len(rings) - 1) // 2; cen = sum((p.v[mid * n + j] for j in range(n)), Vector()) / n
    far = max((f for f in tube if f[0] // n == mid), key=lambda f: (sum((p.v[i] for i in f), Vector()) / 4 - cen).length)
    fc = sum((p.v[i] for i in far), Vector()) / 4
    nrm = (p.v[far[1]] - p.v[far[0]]).cross(p.v[far[3]] - p.v[far[0]])
    if nrm.dot(fc - cen) < 0: tube = [tuple(reversed(f)) for f in tube]
    p.f += tube
    for k, other in ((0, 1), (len(rings) - 1, len(rings) - 2)):     # the caps, facing away from the next ring in
        tri = ear_clip([(q[0], q[1]) for q in rings[k]])
        c0 = sum((p.v[k * n + j] for j in range(n)), Vector()) / n; c1 = sum((p.v[other * n + j] for j in range(n)), Vector()) / n
        for t in tri:
            f = tuple(k * n + j for j in t)
            nr = (p.v[f[1]] - p.v[f[0]]).cross(p.v[f[2]] - p.v[f[0]])
            p.f.append(f if nr.dot(c0 - c1) >= 0 else tuple(reversed(f)))
    return p

def end_rounding(ring, th, hc=None, uc=None):
    # an end ring rounded by θ: the points above hc come down towards it (cos θ); those beyond ±uc in towards it
    out = []
    for a, b, t in ring:
        if uc is not None and abs(a) > uc: a = math.copysign(uc + (abs(a) - uc) * math.cos(th), a)
        if hc is not None and b > hc: b = hc + (b - hc) * math.cos(th)
        out.append((a, b, t))
    return out

def sym_ring(half):
    # a ring symmetric about a = 0 from its right half [(a, b)] listed from the middle outwards: up the right side,
    # across the top, down the left side (the bottom closes it)
    return list(reversed(half)) + [(-a, b) for a, b in half]

def shade(c, k): return tuple(v * k for v in c)
def clamp(v, a, b): return a if v < a else b if v > b else v

# ---------------------------------------------------------------- the front seat (the right one; the left mirrored)
def frames(ctx):
    S = ctx.S; X0, Z0 = S['seatX'], S['seat']['z']
    cr, sr = math.cos(RAKE), math.sin(RAKE)
    O = Vector((X0, CUSHION_TOP, Z0)); n = Vector((0, cr, sr)); f = Vector((0, sr, -cr))
    cushion = lambda u, h, s: O + Vector((u, 0, 0)) + n * h + f * s            # u across, h up, s forward
    cb, sb = math.cos(RECLINE), math.sin(RECLINE)
    B = Vector((X0, BACK_Y, Z0 + BACK_DZ + BACK_AFT)); v = Vector((0, cb, sb)); w = Vector((0, -sb, cb))
    back = lambda u, d, a: B + Vector((u, 0, 0)) + w * d + v * a              # u across, d aft, a up the back
    ch, shh = math.cos(HEAD_TILT), math.sin(HEAD_TILT)
    hv = Vector((0, ch, shh)); hw = Vector((0, -shh, ch))
    H = Vector((X0, HEAD_Y, HEAD_FRONT + BACK_AFT + HEAD_BACK)) + hw * (HEAD_FACE + HEAD_CROWN)   # (its face's crown there)
    head = lambda h, d, u: H + Vector((u, 0, 0)) + hw * d + hv * h           # h up, d aft, u across (its loft's path)
    return cushion, back, head, v

# the cushion's body: its section's right half from the middle out — the recess floor's edge (under the panel's tucked
# edge), the piping (a crisp welt, the bolster's one hard edge: it turns 44° there), the bolster's top over its crown
# at u 0.19 to its outer shoulder and the side's top (every turn under 30°, so smooth shading rounds it: build_cockpit.py
# makes an edge hard over 38°), the bottom corner — (u, h); over the front roll the recess is closed. The panel's: its
# crown, its edge, its tucked edge (height over the crown line).
CUSH_HALF = [(0.160, -0.024), (0.165, 0.005), (0.178, 0.0144), (0.190, 0.017), (0.2025, 0.0134), (0.2111, 0.0051), (0.219, -0.0146),
             (0.216, -0.115)]
CUSH_ROLL = [(0.160, 0.004), (0.165, 0.006)] + CUSH_HALF[2:]
PANEL_HALF = [(0.075, -0.0015), (0.149, -0.005), (0.157, -0.022)]
# the back's, the same way: the recess floor's edge, the piping, the bolster round its crown (the old back's front plane:
# d −BACK_HALF) to the side's front, the rear corner (the hard shell across behind) — (u, d), d aft of the back's middle
# plane; over the top roll the recess is closed. The panel's crown 1.2 cm behind the bolsters' (BACK_RECESS)
BACK_SEC = [(0.160, -0.019), (0.165, -0.041), (0.178, -0.0499), (0.190, -BACK_HALF), (0.2025, -0.0489), (0.2111, -0.0406), (0.219, -0.0209),
            (0.214, 0.050)]
BACK_ROLL = [(0.160, -0.050), (0.165, -0.051)] + BACK_SEC[2:]
BACK_EASE = (0, 0.002, 0.0025, 0.003, 0.005, 0.0085, 0.013, 0)     # how far each point eases back at the foot (aft, m)
BACK_RECESS = 0.012
# the TX's tall back: its straight stations up to its shoulders (a up the back; the top's the old back's 0.232 + 0.086:
# y ≈ 0.48 where the old back's top roll ended), the top roll over BACK_TOP[1] from BACK_TOP[0] (the shoulders' top at
# y ≈ 0.555, under the headrest moulded on it), its corners drawn in to ±BACK_TOP[2] as it rolls over
BACK_STA = (-0.35, -0.28, -0.195, -0.11, -0.025, 0.06, 0.146, 0.232, 0.318)
BACK_TOP = (0.330, 0.064, 0.15)
# the arms beside the backs: the instructor's left arm hangs beside the right seat's inboard bolster (fly mode seats him
# at cockpit.js's instructorSeat), the student's right arm beside the left's — the inboard bolsters ease back there,
# graded in from the piping to the crown so that no step shows: (how far back, at which a up the back, over how far
# each way; the band where the arm hangs, y 0.05–0.20)
ELBOW = (0.022, -0.045, 0.11)
def elbow_ease(u, a):
    if u >= -0.160: return 0.0
    t = clamp(1 - abs(a - ELBOW[1]) / ELBOW[2], 0, 1); w = clamp((-u - 0.160) / 0.030, 0, 1)
    return ELBOW[0] * t * t * (3 - 2 * t) * w * w * (3 - 2 * w)
BPANEL_HALF = [(0.075, -0.001), (0.149, -0.0065), (0.157, -0.0195)]
# the headrest moulded on the back's top: its section (h up, d aft of its middle), round from its face's top seam — the
# face (light) between the seams, its lower front rolled under into the back's face (sunk in it from h −0.086 down), the
# bottom and the rear inside the back (the rear flush with the shell above the shoulders: HEAD_REAR, worked out below),
# the top rounded over to the rear (no turn over 32°)
HEAD_FACE, HEAD_CROWN = 0.0455, 0.009           # (the face's crown up its middle: 1 cm; across it, 0.9 cm more)
HEAD_LOW = [(-0.073, -0.027), (-0.086, -0.012), (-0.112, 0.012)]
HEAD_NF = 4                                     # (the face: the section's first 4 points, the seams its first and last)
HEAD_HALF, HEAD_SEAM, HEAD_END = 0.19, 0.090, 0.03   # its half width (nearly the back's: the back's top is the headrest); its face's side
                                                # seams; its ends' rounding (over the last 3 cm: its bottom seam, where it sinks into
                                                # the reclined back, level to there)
HEAD_ARCH = (0.12, 0.20)                        # its top an arch across, down to the back's shoulders: (the share of its height over its
                                                # bottom seam left at the arch's foot, the arch's half width)
def head_sec(ctx):
    # the section, its rear at the back's shell: d where the back's rear plane meets the line through the headrest's
    # middle at height h (aft along its frame), 3 mm inside
    cushion, back, head, bv = frames(ctx); S = ctx.S
    cb, sb = math.cos(RECLINE), math.sin(RECLINE)
    zrear = lambda y: S['seat']['z'] + BACK_DZ + BACK_AFT + (y - BACK_Y) * math.tan(RECLINE) + 0.050 / cb
    def rear(h):
        d = 0.08
        for _ in range(4): p = head(h, d, 0.0); d += (zrear(p.y) - p.z) / math.cos(HEAD_TILT)
        return d - 0.003
    r0, r1 = rear(-0.112), rear(0.05)
    return ([(0.064, -0.035), (0.0213, -HEAD_FACE), (-0.0213, -HEAD_FACE), (-0.064, -0.035)] + HEAD_LOW +
            [(-0.112, r0), (0.050, r1), (0.0685, r1 - 0.014), (0.0775, 0.032), (0.0775, 0.0), (0.0745, -0.021), (0.070, -0.029)])

def panel_rings(rows, half, depth_sign, top_of):
    # a channelled panel's rings: rows [(t, kind)] with kind 'tuck' (its end, thin), 'edge' (rolled down at an end),
    # 'crown' (a channel's middle) or 'seam'; half: its right half from the middle out (crown points, its edge, its
    # tucked edge) as (a, b), b its height over the crown (depth_sign −1: b measured forwards, for a back); top_of(t, a,
    # b) shapes the crown along the panel (the lumbar) → rings (tuck R … the middle … tuck L), the rows' kinds
    rings, kinds = [], []
    drop = {'crown': 0.0, 'seam': 0.007, 'edge': 0.009}
    for t, kind in rows:
        r = []
        for k, (a, b) in enumerate([(0.0, 0.0)] + half):
            if k < len(half):                                            # (the tucked edge stays where it is)
                b = half[-1][1] + 0.0045 if kind == 'tuck' else top_of(t, a, b) - drop[kind]
            r.append((a, b))
        full = list(reversed(r)) + [(-a, b) for a, b in r[1:]]
        rings.append([(a, depth_sign * b, t) for a, b in full]); kinds.append(kind)
    return rings, kinds

def channel_rows(t0, t1, n, tuck=0.009):
    # a panel's rows from t0 to t1: its ends tucked in (tuck beyond them), n channels between
    sm = [t0 + (t1 - t0) * k / n for k in range(n + 1)]
    rows = [(t0 - tuck, 'tuck'), (t0, 'edge')]
    for k in range(n):
        rows += [((sm[k] + sm[k + 1]) / 2, 'crown'), (sm[k + 1], 'seam' if k < n - 1 else 'edge')]
    return rows + [(t1 + tuck, 'tuck')]

def panel_cols(rings, kinds, col, edge):
    # the panel's colours: the seams and its rolled ends darker, its tucked edges in the crevice darker still
    k = {'crown': 1.0, 'seam': 0.78, 'edge': 0.86, 'tuck': 0.62}
    return [[shade(col, 0.62) if abs(q[0]) > edge else shade(col, k[kind]) for q in r] for r, kind in zip(rings, kinds)]

def body_cols(half, recess, base, last):
    # a body's ring colours: the recess's edge and the piping darker (unless the recess is closed there), the bottom or
    # rear corner shaded by last
    h = [shade(base, 0.55 if recess else 0.92), shade(base, 0.8 if recess else 0.95)] + [base] * (len(half) - 3) + [shade(base, last)]
    return list(reversed(h)) + h

def split(p, pick):
    # a Part's faces in two (pick(face) → the first), each with its own vertices (and their sources' indices: src)
    a, b = Part(), Part()
    for f in p.f: (a if pick(f) else b).f.append(f)
    for q in (a, b):
        used = sorted({i for f in q.f for i in f}); remap = {o: k for k, o in enumerate(used)}
        q.v = [p.v[o] for o in used]; q.vc = [p.vc[o] for o in used]; q.f = [tuple(remap[i] for i in f) for f in q.f]; q.src = used
    return a, b

def front_seat(ctx):
    C, S = ctx.C, ctx.S; cushion, back, head, bv = frames(ctx)
    TAN, BROWN, BLACK, ALU = (tuple(C[k]) for k in ('seat', 'seatSide', 'black', 'alu'))
    X0, Z0, F = S['seatX'], S['seat']['z'], S['floor']
    # ---- the cushion's body: its rear end pushed into the back's foot (they meet in the crease; its last 2.5 cm, the
    # end's notch and the panel's end in it, are inside the back), the recess along the middle, the front roll
    # (the recess closed in front of the panel's end, then rounded down to the front face over 6 cm, in 30° steps; the
    # front corners rounded in plan too, the outer 7 cm of each side drawn in as the roll goes down)
    st = [(s, CUSH_HALF, 0) for s in (-0.305 - BACK_AFT, -0.25, -0.165, -0.08, 0.005, 0.095, 0.186)]   # (its rear as far back as the back)
    st += [(0.198 + 0.061 * math.sin(th * DEG), CUSH_ROLL, th) for th in (0, 30, 60, 85)]
    rings = [end_rounding([(a, b, s) for a, b in sym_ring(half)], th * DEG, -0.050, 0.15) for s, half, th in st]
    body = loft(cushion, rings, [body_cols(half, half is not CUSH_ROLL, BROWN, 0.85) for s, half, th in st])
    # ---- its panel: 3 wide channels from the crease to the front roll (its rear end, inside the back's panel, not tucked)
    prings, kinds = panel_rings(channel_rows(-0.295 - BACK_AFT, 0.178, 3, 0.008)[1:], PANEL_HALF, 1, lambda t, a, b: b)
    panel = loft(cushion, prings, panel_cols(prings, kinds, TAN, 0.155))
    # ---- the back's body: its foot behind the cushion's rear (the recess open down there, filled by the cushion), the
    # recess, up to the shoulders, the top rolled over towards the back's middle plane, its corners rounded in
    bst = [(a, BACK_SEC, 0) for a in BACK_STA]
    bst += [(BACK_TOP[0] + BACK_TOP[1] * math.sin(th * DEG), BACK_ROLL, th) for th in (0, 35, 65, 85)]
    # (the bolsters ease back towards the foot, where they meet the cushion: the left one's inboard edge clears the flap
    # handle's sight line by as much as the old back's rounded corner did)
    ease = lambda a: clamp((-0.05 - a) / 0.20, 0.0, 1.0)
    rings = []
    for a, half, th in bst:
        c = math.cos(th * DEG); e = ease(a); uc = BACK_TOP[2]
        half = [(u, d + e * dd) for (u, d), dd in zip(half, BACK_EASE)]
        rings.append([(math.copysign(uc + (abs(u) - uc) * c, u) if abs(u) > uc else u, (d + elbow_ease(u, a)) * c, a) for u, d in sym_ring(half)])
    bbody = loft(back, rings, [body_cols(half, half is BACK_SEC, BROWN, 0.9) for a, half, th in bst])
    # ---- its panel: 3 wide channels from behind the cushion's rear up to under the shoulders (its foot, inside the
    # cushion, not tucked), swelling a little at the lumbar
    lumbar = lambda t, a, b: b + 0.005 * math.exp(-((t + 0.12) / 0.10) ** 2) * (1 - (a / 0.16) ** 2)
    prings, kinds = panel_rings(channel_rows(-0.338, BACK_STA[-1] - 0.007, 3, 0.007)[1:], BPANEL_HALF, -1, lumbar)
    prings = [[(u, d - BACK_HALF + BACK_RECESS, a) for u, d, a in r] for r in prings]
    bpanel = loft(back, prings, panel_cols(prings, kinds, TAN, 0.155))
    # ---- the headrest moulded on the top: a loft across, its ends rounded in four steps (22° each: the section's top
    # half drawn down and all of it in — its lower half, the face's bottom seam level across it and the parts sunk in the
    # back, stays); its face crowned across and up, between the seams
    HSEC = head_sec(ctx)
    ends, r0 = (82, 60, 38, 16), HEAD_HALF - HEAD_END                # (its ends rounded over their last HEAD_END only)
    hst = [(-r0 - HEAD_END * math.sin(th * DEG), th) for th in ends] + [(u, 0) for u in (-r0, -HEAD_SEAM, -0.045, 0.0, 0.045, HEAD_SEAM, r0)]
    hst += [(r0 + HEAD_END * math.sin(th * DEG), th) for th in reversed(ends)]
    nf = HEAD_NF; seams = (0, nf - 1)
    rings, cols = [], []
    for u, th in hst:
        c = math.cos(th * DEG); crown = HEAD_CROWN * max(0.0, 1 - (u / HEAD_SEAM) ** 2)
        arch = HEAD_ARCH[0] + (1 - HEAD_ARCH[0]) * math.sqrt(max(0.0, 1 - (u / HEAD_ARCH[1]) ** 2))     # (its top, an arch across)
        ring = []
        for k, (h, d) in enumerate(HSEC):
            if 0 < k < nf - 1: d -= crown
            ring.append((-0.064 + (h + 0.064) * arch if h > -0.064 else h, d * (0.35 + 0.65 * c), u))
        rings.append(ring)
        cols.append([shade(BROWN, 0.85) if k in seams else BROWN for k in range(len(HSEC))])
    hbody = loft(head, rings, cols)
    n = len(HSEC); i0 = len(ends) + 1                             # (the face: stations ±HEAD_SEAM, ring points 0 … nf − 1)
    face, rest = split(hbody, lambda f: len(f) == 4 and i0 <= min(i // n for i in f) < i0 + 4 and max(i % n for i in f) <= nf - 1)
    face.vc = [shade(TAN, 0.85) if (o % n in seams or o // n in (i0, i0 + 4)) else TAN for o in face.src]
    rest.vc = [shade(BROWN, 0.85) if (o % n < nf and o // n in (i0, i0 + 4)) else c for o, c in zip(rest.src, rest.vc)]
    # ---- the pan under the cushion, the frame's side plates standing on the tracks, the recline lever
    hw = Part()
    hw.add(hexa([cushion(u, h, s) for u in (-0.2, 0.2) for h in (-0.113, -0.134) for s in (-0.235, 0.235)], BLACK))
    for sx in (-1, 1):                                # (each plate from the track's top up into the pan, its top raked)
        pe = [cushion(sx * TRACK_X, -0.133, s) for s in (-0.215, 0.215)]
        hw.add(hexa([Vector((X0 + sx * TRACK_X + du, F + 0.024 if yy else q.y + 0.004, q.z)) for du in (-0.004, 0.004) for yy in (1, 0) for q in pe], BLACK))
    # (the lever at the back's foot, outboard: a housing block on the seat's side and the handle forward from it along
    # the cushion, both hexa(), which turns its faces outwards whatever the corners' order)
    piv = back(0.222, 0.018, -0.335)
    lever = hexa([Vector((x, piv.y + dy, piv.z + dz)) for x in (X0 + 0.212, X0 + 0.232) for dy in (-0.014, 0.014) for dz in (-0.016, 0.016)], BLACK)
    p0 = Vector((X0 + 0.229, piv.y, piv.z)); tip = p0 + Vector((0, 0.012, -0.10)); ax = (tip - p0).normalized()
    up = Vector((0, 1, 0)); up = (up - ax * up.dot(ax)).normalized()
    lever.add(hexa([p0 + Vector((dx, 0, 0)) + up * dy + ax * l for dx in (-0.0045, 0.0045) for dy in (-0.009, 0.009) for l in (-0.005, 0.105)], BLACK))
    # ---- the tracks (aluminium), under the frame's plates
    trk = Part()
    for sx in (-1, 1):
        c = Vector((X0 + sx * TRACK_X, F + 0.0115, Z0 + (TRACK_Z[0] + TRACK_Z[1]) / 2))
        trk.add(as_part(ctx.box(c, (0.015, 0.0135, (TRACK_Z[1] - TRACK_Z[0]) / 2), (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))), ALU), ALU))
    _G['front'] = {'cushion': [body, panel], 'frame': [hw, trk], 'back': [bbody, bpanel], 'head': [hbody], 'lever': lever}
    return {'seats.seatSide': Part().add(body).add(bbody).add(rest), 'seats.seat': Part().add(panel).add(bpanel).add(face),
            'seats.black': Part().add(hw).add(lever), 'seats.alu': trk}

def as_part(piece, col):
    # one of build_cockpit.py's Pieces (its helpers' cylinders and boxes) → a Part of one colour
    p = Part(); p.v = [Vector(v) for v in piece.v]; p.f = list(piece.f); p.vc = [col] * len(piece.v)
    return p

def hexa(c, col):
    # a closed six-sided block from its 8 corners, indexed 4i + 2j + k (i, j, k: each axis' two sides)
    p = Part(); p.v = [Vector(v) for v in c]; p.vc = [col] * 8
    p.f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    if p.volume() < 0: p.f = [tuple(reversed(f)) for f in p.f]
    return p

def block(c, ex, ey, ez, col):
    # a box at c from its three half-axes (vectors)
    return hexa([c + ex * i + ey * j + ez * k for i in (-1, 1) for j in (-1, 1) for k in (-1, 1)], col)

# ---------------------------------------------------------------- the rear bench
def bench_frames():
    b = BENCH
    cr, sr = math.cos(b['rake']), math.sin(b['rake'])
    O = Vector((0, b['top'], b['z'])); n = Vector((0, cr, sr)); f = Vector((0, sr, -cr))
    cush = lambda u, h, s: O + Vector((u, 0, 0)) + n * h + f * s                # u across, h up, s forward
    cb, sb = math.cos(b['recline']), math.sin(b['recline'])
    Bc = Vector((0, b['backY'], b['backZ'])); v = Vector((0, cb, sb)); w = Vector((0, -sb, cb))
    back = lambda u, d, a: Bc + Vector((u, 0, 0)) + w * d + v * a              # u across, d aft, a up
    return cush, back, n, v, w

def bench(ctx):
    C = ctx.C; TAN, BROWN = tuple(C['seat']), tuple(C['seatSide'])
    b = BENCH; X, P0 = b['x'], b['place']
    cush, back, n, v, w = bench_frames()
    # the bodies are lofted across: stations at the rounded ends, the outer rolls' crowns, the recesses (the panels'
    # places), the middle roll's crowns (the back's: the cushion is one wide piece, recessed from end roll to end roll);
    # the cushion's ends square (seen at most as the right front corner's outline against the wall, past the
    # instructor's seat)
    across = [(-X + 0.035 * (1 - math.sin(70 * DEG)), 70, True), (-X + 0.035, 0, True), (-P0 - 0.17, 0, False), (-P0 + 0.17, 0, False),
              (-0.045, 0, True)]
    across += [(-u, th, r) for u, th, r in reversed(across)]
    across_c = [(-X, 0, True), (-P0 - 0.17, 0, False), (0.0, 0, False), (P0 + 0.17, 0, False), (X, 0, True)]
    # the cushion's section (s, h) round from the bottom's rear corner: the recess's top 3.6 cm under the rolls'; its
    # bottom as low as the old one's (11 cm over the floor)
    def cush_sec(H): return [(-0.245, -0.16), (-0.25, -0.035), (-0.226, H), (0.165, H), (0.20, 0.012), (0.238, -0.02), (0.25, -0.085), (0.243, -0.16)]
    rings = []
    for u, th, ridge in across_c:
        c = math.cos(th * DEG)
        rings.append([(s * (0.6 + 0.4 * c), -0.06 + (h + 0.06) * c, u) for s, h in cush_sec(0.012 if ridge else -0.024)])
    cbody = loft(lambda s, h, u: cush(u, h, s), rings, [[shade(BROWN, 0.85) if q[1] < -0.1 else BROWN for q in r] for r in rings])
    # its two panels, each from the middle (where they meet in a seam) to the end roll, sewn once across
    cpanels = Part(); PW = (P0 + 0.17) / 2
    for sx in (-1, 1):
        pr, kinds = panel_rings([(-0.222, 'tuck'), (-0.212, 'edge'), (-0.123, 'crown'), (-0.029, 'seam'), (0.062, 'crown'), (0.154, 'edge'), (0.164, 'tuck')],
                                [(PW - 0.012, -0.005), (PW - 0.004, -0.022)], 1, lambda t, a, bb: bb)
        pc = panel_cols(pr, kinds, TAN, PW - 0.006)
        cpanels.add(loft(lambda u, h, s, o=sx * PW: cush(u + o, h, s), pr, pc))
    # the back's section (a, d) round from the bottom's front (the top 6 cm higher than the old one's: no headrests on it)
    def back_sec(D): return [(-0.36, -0.045), (-0.33, D), (0.282, D), (0.312, -0.052), (0.35, -0.036), (0.37, 0.0), (0.35, 0.045), (-0.36, 0.055)]
    rings = []
    for u, th, ridge in across:
        c = math.cos(th * DEG)
        rings.append([(a * (0.85 + 0.15 * c), d * c, u) for a, d in back_sec(-b['backHalf'] if ridge else -0.024)])
    bbody = loft(lambda a, d, u: back(u, d, a), rings, [[BROWN] * len(r) for r in rings])
    bpanels = Part()
    for sx in (-1, 1):
        pr, kinds = panel_rings(channel_rows(-0.31, 0.272, 3, 0.008), [(0.150, -0.0065), (0.158, -0.0205)], -1, lambda t, a, bb: bb)
        pr = [[(a, d - b['backHalf'] + 0.011, t) for a, d, t in r] for r in pr]
        bpanels.add(loft(lambda u, d, a, o=sx * P0: back(u + o, d, a), pr, panel_cols(pr, kinds, TAN, 0.156)))
    _G['bench'] = {'cushion': [cbody, cpanels], 'back': [bbody, bpanels]}
    return {'bench.seatSide': Part().add(cbody).add(bbody), 'bench.seat': Part().add(cpanels).add(bpanels)}

# ---------------------------------------------------------------- the belts
def both_ways(f):
    # a face's triangles: a quad split along both its diagonals (a quad not flat is two surfaces, one for each way the
    # exporter may cut it: a strap laid on both clears either)
    return [(f[0], f[1], f[2]), (f[0], f[2], f[3]), (f[0], f[1], f[3]), (f[1], f[2], f[3])] if len(f) == 4 else [tuple(f)]

def bvh_of(parts, owners=None):
    # a tree of the parts' faces (both_ways); owners: a list to fill with each triangle's face
    vs, fs = [], []
    for p in parts:
        k = len(vs); vs += [tuple(q) for q in p.v]
        for n, f in enumerate(p.f):
            ts = both_ways([i + k for i in f]); fs += ts
            if owners is not None: owners += [n] * len(ts)
    return BVHTree.FromPolygons(vs, fs)

def catmull(keys, step, straight=()):
    # samples along the Catmull–Rom curve through the key points (straight between those of the segments in straight):
    # (point, key segment, t in it)
    out, n = [], len(keys)
    for i in range(n - 1):
        p0, p1, p2, p3 = keys[max(i - 1, 0)], keys[i], keys[i + 1], keys[min(i + 2, n - 1)]
        m = max(1, int(math.ceil((p2 - p1).length / step)))
        for k in range(m):
            t = k / m
            if i in straight: out.append((p1.lerp(p2, t), i, t)); continue
            out.append((0.5 * (2 * p1 + (p2 - p0) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (3 * p1 - p0 - 3 * p2 + p3) * t * t * t), i, t))
    out.append((keys[-1], n - 2, 1.0))
    return out

def laid(bvh, keys, step=0.02, w=BELT_W, t=BELT_T):
    # a strap's path: keys (point, toward, face) — toward: the direction it lies onto a seat along (cast that way from
    # 5 cm short of the point, at nine points across its width; it is laid on what they meet, its face square to their
    # normals' mean — but those of a side it overhangs —, BELT_GAP off the highest of them), or None for a strap in the
    # air (face: its face's normal) → stations (middle, face normal), every 2 cm along a smooth curve through the keys
    # where it lies (the samples between two lying keys, and a lying key's own), straight where it hangs; then made
    # good below, and thinned where it runs straight (simplify())
    pts = catmull([k[0] for k in keys], step, {i for i in range(len(keys) - 1) if keys[i][1] is None or keys[i + 1][1] is None}); out = []
    for j, (q, i, tt) in enumerate(pts):
        a, b = keys[i], keys[i + 1]
        tg = (pts[min(j + 1, len(pts) - 1)][0] - pts[max(j - 1, 0)][0]).normalized()
        lie = (a[1] is not None and b[1] is not None) or (tt == 0 and a[1] is not None) or (tt == 1 and b[1] is not None)   # (a lying key's own station lies)
        if lie:
            d = (a[1] if b[1] is None else b[1] if a[1] is None else a[1].lerp(b[1], tt)).normalized(); wd = tg.cross(-d).normalized(); hits = []
            for e in ACROSS:
                hit = bvh.ray_cast(q + wd * (e * w) - d * 0.05, d, 0.15)
                if hit[0] is not None: hits.append(hit)
            assert hits, ('a strap lies on nothing', tuple(round(c, 3) for c in q))
            nf = sum((h[1] for h in hits if h[1].dot(-d) > 0.8), -d * 0.5).normalized()   # (not tilted by a side it overhangs)
            c0 = q - d * 0.05 + d * min(h[3] for h in hits)
            out.append((c0 + nf * (max((h[0] - c0).dot(nf) for h in hits) + t / 2 + BELT_GAP), nf))
        else:
            na = a[2] if a[1] is None else -a[1]; nb = b[2] if b[1] is None else -b[1]
            out.append((q, na.lerp(nb, tt).normalized()))
        out[-1] += (lie,)
    # in the air it runs straight (taut) from where it leaves a seat (or its slot) to where it meets the next
    j = 0
    while j < len(out):
        if out[j][2]: j += 1; continue
        k = j
        while k < len(out) and not out[k][2]: k += 1
        a, b = (out[j - 1] if j > 0 else out[j]), (out[k] if k < len(out) else out[k - 1])
        tg = (b[0] - a[0]).normalized()
        # (its width as where it meets a seat — bent over the edge it comes down on, not twisted)
        e = out[k] if k < len(out) else out[j - 1] if j > 0 else None
        we = None
        if e is not None:
            m2 = k if k < len(out) else j - 1; te = (out[min(m2 + 1, len(out) - 1)][0] - out[max(m2 - 1, 0)][0]).normalized()
            we = te.cross(e[1]); we = (we - tg * we.dot(tg)).normalized()
        for m in range(j, k):
            f = (m - j + (1 if j > 0 else 0)) / max(1, (k - j + (1 if j > 0 else 0) - (0 if k < len(out) else 1)))
            out[m] = (a[0].lerp(b[0], f), we.cross(tg).normalized() if we is not None else out[m][1], False)
        j = k
    # (and kept off a seat it runs close to, as where it leaves a face it lay down: each station pushed out from the
    # nearest point of the seat to any of its corners, its face turned square to it there)
    for _ in range(4):
        for m, (c, nr, l) in enumerate(out):
            if l: continue
            tg = (out[min(m + 1, len(out) - 1)][0] - out[max(m - 1, 0)][0]).normalized(); wd = tg.cross(nr).normalized(); nn = wd.cross(tg)
            for e in ACROSS[::2]:
                for sd in (-1, 1):
                    q = c + wd * (e * w) + nn * (sd * t / 2); hit = bvh.find_nearest(q)
                    if hit[0] is not None and hit[3] < BELT_GAP and (q - hit[0]).dot(hit[1]) > -1e-6:
                        c = c + hit[1] * (BELT_GAP - hit[3]); nr = hit[1] if abs(hit[1].dot(tg)) < 0.5 else nr
            out[m] = (c, nr, l)
    # pulled taut: it spans a dip (a crevice, a seam, a crease's corner) from its neighbours instead of going down into it
    for _ in range(12):
        for j in range(1, len(out) - 1):
            (ca, na, la), (c, nr, l), (cb, nb, lb) = out[j - 1], out[j], out[j + 1]
            if la and l and lb:
                dip = ((ca + cb) / 2 - c).dot(nr)
                if dip > 0: out[j] = (c + nr * dip, nr, l)
    # then over a convex seat (a roll, a crown; its facets' ridges) the band's flat run between two stations would cut
    # into it: each run's middle and quarters are tried across the width too (against what is under it, not a side
    # rising beside it: a crease), and both its ends lifted by what it lacks (≤ 6 mm: a sag, no more)
    for _ in range(3):
        for j in range(len(out) - 1):
            (c0, n0, l0), (c1, n1, l1) = out[j], out[j + 1]
            if not (l0 and l1): continue
            tg = (c1 - c0).normalized(); lack = 0.0
            for f in (0.25, 0.5, 0.75):
                c, nr = c0.lerp(c1, f), n0.lerp(n1, f).normalized(); wd = tg.cross(nr).normalized()
                for e in ACROSS:
                    hit = bvh.ray_cast(c + wd * (e * w) + nr * 0.012, -nr, 0.012 + t / 2 + BELT_GAP)
                    if hit[0] is not None and hit[1].dot(nr) > 0.5: lack = max(lack, 0.012 + t / 2 + BELT_GAP - hit[3])
            lack = min(lack, 0.006)
            if lack > 0: out[j] = (c0 + n0 * lack, n0, l0); out[j + 1] = (c1 + n1 * lack, n1, l1)
    path = simplify(bvh, [(c, nr) for c, nr, l in out])
    # and last, wherever the band still cuts a seat or comes within a millimetre of it (a sharp ridge between two
    # stations: a roll's front over its panel), both ends of that run lifted a millimetre at a time until it clears
    for _ in range(12):
        own = []; tree = bvh_of([band(path, (0, 0, 0), w + 0.002, t + 0.002)], own)
        bad = {own[f] // 4 for f, g in tree.overlap(bvh) if own[f] < 4 * (len(path) - 1)}
        if not bad: break
        for i in bad:
            for k in (i, i + 1): path[k] = (path[k][0] + path[k][1] * 0.001, path[k][1])
    return path

def simplify(bvh, path, tol=0.003, ang=12 * DEG, w=BELT_W, t=BELT_T):
    # fewer stations where a strap runs straight: a station goes if it is within tol of the line between its neighbours,
    # its face turns less than ang from theirs, and the band along that line stays BELT_GAP / 2 clear of the seat under
    # it (tried at its quarters across its width)
    keep = list(path)
    def clear(a, na, b, nb):
        tg = (b - a).normalized()
        for f in (0.2, 0.4, 0.6, 0.8):
            c, nr = a.lerp(b, f), na.lerp(nb, f).normalized(); wd = tg.cross(nr).normalized()
            for e in (-0.5, -0.25, 0.0, 0.25, 0.5):
                hit = bvh.ray_cast(c + wd * (e * w) + nr * 0.015, -nr, 0.015 + t / 2 + BELT_GAP / 2)
                if hit[0] is not None and hit[1].dot(nr) > 0.3: return False
        return True
    while True:
        best = None
        for j in range(1, len(keep) - 1):
            (a, na), (c, nc), (b, nb) = keep[j - 1], keep[j], keep[j + 1]
            ab = b - a; f = clamp((c - a).dot(ab) / max(ab.length_squared, 1e-12), 0, 1); off = (a + ab * f - c).length
            if off < tol and na.angle(nc) < ang and nb.angle(nc) < ang and na.angle(nb) < ang and (best is None or off < best[0]) and clear(a, na, b, nb):
                best = (off, j)
        if best is None: return keep
        keep.pop(best[1])

def band(path, col, w=BELT_W, t=BELT_T):
    # a strap: a thin flat band (w × t) swept along the stations, closed at its ends, faces outwards
    p = Part(); n = len(path)
    for i, (c, nr) in enumerate(path):
        tg = (path[min(i + 1, n - 1)][0] - path[max(i - 1, 0)][0]).normalized()
        wd = tg.cross(nr).normalized(); nn = wd.cross(tg).normalized()
        for a, b in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
            p.v.append(c + wd * (a * w / 2) + nn * (b * t / 2)); p.vc.append(col)
    for i in range(n - 1):
        for j in range(4):
            a, b = i * 4 + j, i * 4 + (j + 1) % 4
            p.f.append((a, a + 4, b + 4, b))
    p.f += [(0, 1, 2, 3), tuple(4 * (n - 1) + k for k in (3, 2, 1, 0))]
    if p.volume() < 0: p.f = [tuple(reversed(f)) for f in p.f]
    return p

def lay_block(bvh, c, ax, toward, half, col):
    # a block (half sizes: along ax, across, up) laid on what is under it along toward: cast at its corners and middle,
    # set BELT_GAP over the highest point
    d = toward.normalized(); up = -d; ax = (ax - up * ax.dot(up)).normalized(); ac = up.cross(ax).normalized()
    near = None
    for i, j in ((0, 0), (-1, -1), (-1, 1), (1, -1), (1, 1)):
        hit = bvh.ray_cast(c + ax * (i * half[0]) + ac * (j * half[1]) - d * 0.05, d, 0.15)
        if hit[0] is not None: near = hit[3] if near is None else min(near, hit[3])
    assert near is not None, ('a buckle lies on nothing', tuple(round(v, 3) for v in c))
    m = c - d * 0.05 + d * (near - BELT_GAP) + up * half[2]
    return block(m, ax * half[0], ac * half[1], up * half[2], col), m, ax, ac, up

def slot(ctx, x, z, col, along=False):
    # the harness's slot cover on the headliner at (x, z): a black block along the arch's slope there (along: along the
    # cabin, for a strap hanging turned that way), its top sunk 4 mm in, its bottom 16 mm out (the strap starts inside it)
    # → the block and where the strap comes out
    a, b = ctx.HWT, ctx.ROOF - ctx.WTOP
    y = ctx.roofY(abs(x)); nrm = Vector((-x / (a * a), -(y - ctx.WTOP) / (b * b), 0)).normalized()    # (into the cabin)
    tng = Vector((-nrm.y, nrm.x, 0)); c = Vector((x, y, z)) + nrm * 0.006
    ex, ez = (tng * 0.008, Vector((0, 0, 0.026))) if along else (tng * 0.026, Vector((0, 0, 0.0095)))
    return block(c, ex, nrm * 0.010, ez, col), Vector((x, y, z)) + nrm * 0.009

def front_belts(ctx, seat, cols):
    # the right seat's belts, the instructor's (beside him) and the pilot's (open on the seat: built here on the right
    # seat, mirrored onto the left), laid on its parts (seat) → {'pilot': {surface: Part}, 'instructor': {…}}
    cushion, back, head, bv = frames(ctx); bvh = bvh_of(seat)
    cb, sb = math.cos(RECLINE), math.sin(RECLINE); V_ = Vector((0, cb, sb)); W_ = Vector((0, -sb, cb))
    N_ = Vector((0, math.cos(RAKE), math.sin(RAKE))); X_ = Vector((1, 0, 0)); FWD = Vector((0, 0, -1))
    BELT, BLACK, RED, CHROME = cols
    out = {}
    for who in ('pilot', 'instructor'):
        o = out[who] = {k: Part() for k in ('belt', 'black', 'red', 'chrome')}
        sl, top = slot(ctx, SLOT_F[0], SLOT_F[1], BLACK, along=who == 'instructor'); o['black'].add(sl)
        # the buckle's strap from the inboard rear of the cushion (out of the crease) along the inboard bolster's crown,
        # the buckle on its end (its mouth forward)
        bp = into(laid(bvh, [(cushion(-0.19, 0.03, s), -N_, None) for s in (-0.298, -0.275, -0.255, -0.24)])); o['belt'].add(band(bp, BELT))
        buckle(o, bvh, cushion(-0.189, 0.03, -0.205), cushion(-0.19, 0, -0.17) - cushion(-0.19, 0, -0.24), -N_, cols)
        if who == 'pilot':
            # the outboard half: out of the crease on the outboard bolster, in across the cushion to its tongue
            lap = into(laid(bvh, [(cushion(u, 0.04, s), -N_, None) for u, s in ((0.20, -0.298), (0.198, -0.27), (0.188, -0.215), (0.163, -0.165),
                                                                          (0.125, -0.13), (0.09, -0.112), (0.06, -0.105))]))
            o['belt'].add(band(lap, BELT)); adjuster(o, lap, 0.55, BLACK); tongue(o, bvh, lap, CHROME)
            # the harness: out of its slot, down onto the outboard slope of the back's top (the headrest's arch), over it
            # and down the face along the outboard bolster, into the crease, onto the cushion and over the lap belt to its
            # snap hook by the tongue
            keys = [(top, None, FWD), (Vector((SLOT_F[0] + 0.012, 0.66, SLOT_F[1] - 0.03)), None, FWD),
                    (back(0.17, -0.01, 0.43), -V_, None), (back(0.17, -0.07, 0.355), (W_ - V_).normalized(), None)]
            keys += [(back(0.17, -0.075, a), W_, None) for a in (0.27, 0.15, 0.03, -0.09, -0.20, -0.27)]
            keys += [(back(0.165, -0.07, -0.315), (W_ - N_).normalized(), None), (cushion(0.155, 0.04, -0.27), -N_, None),
                     (cushion(0.142, 0.04, -0.215), -N_, None), (cushion(0.128, 0.04, -0.168), -N_, None)]
        else:
            # the outboard half: up the cushion's outboard side from the frame under it to its tongue, hanging forward
            lap = laid(bvh, [(cushion(0.245, h, s), -X_, None) for h, s in ((-0.088, -0.29), (-0.080, -0.25), (-0.072, -0.21), (-0.066, -0.17), (-0.064, -0.145))])
            o['belt'].add(band(lap, BELT)); adjuster(o, lap, 0.6, BLACK); tongue(o, bvh, lap, CHROME)
            # the harness unclipped, wound up in its reel: its end hanging out of the slot (turned along it: its face
            # inboard), the snap hook on it
            hp = [(top, -X_), (top + Vector((0, -STOWED, 0)), -X_)]
            o['belt'].add(band(hp, BELT)); c, nr = hp[-1]
            o['chrome'].add(block(c + Vector((0, -0.010, 0)), Vector((0, 0.013, 0)), Vector((0, 0, 0.0065)), Vector((0.0028, 0, 0)), CHROME))
            continue
        hp = laid(bvh_of(seat + [band(lap, BELT)]), keys); o['belt'].add(band(hp, BELT)); snap(o, hp, CHROME)
    return out

def into(path, run=0.016):
    # a strap anchored in the crease between a cushion and its back: its first station run on back into it (check()
    # lets it go in there; its seat mirrored, on both sides)
    (c0, n0), (c1, _) = path[0], path[1]; p = c0 + (c0 - c1).normalized() * run - n0 * 0.004
    _G.setdefault('anchors', []); _G['anchors'] += [p.copy(), Vector((-p.x, p.y, p.z))]
    return [(p, n0)] + path

def buckle(o, bvh, c, ax, toward, cols):
    # the buckle (black, its mouth along ax) laid at c, the red tab on its top at the mouth → where its mouth is
    BELT, BLACK, RED, CHROME = cols
    bk, m, ax, ac, up = lay_block(bvh, c, ax, toward, (0.034, 0.017, 0.0085), BLACK)
    o['black'].add(bk); o['red'].add(block(m + ax * 0.017 + up * 0.0095, ax * 0.0105, ac * 0.0075, up * 0.0022, RED))
    return m + ax * 0.034

def tongue(o, bvh, p, col, length=0.036):
    # the tongue on a lap belt's end (its last station, its face): a chrome latch plate on from it, laid on the seat
    (c, nr), (c0, _) = p[-1], p[-2]; ax = (c - c0).normalized()
    o['chrome'].add(lay_block(bvh, c + ax * (length / 2 - 0.004), ax, -nr, (length / 2, 0.0125, 0.0016), col)[0])

def snap(o, p, col):
    # the harness's snap hook on its end (laid over the lap belt), on its top face
    (c, nr), ax = p[-1], (p[-1][0] - p[-3][0]).normalized()
    o['chrome'].add(block(c + nr * (BELT_T / 2 + 0.0028), ax * 0.013, nr.cross(ax).normalized() * 0.0065, nr * 0.0028, col))

def along(p, f):
    # the point a share f of the way along a strap's stations: (middle, face normal, direction)
    ls = [(p[i + 1][0] - p[i][0]).length for i in range(len(p) - 1)]; d = f * sum(ls)
    for i, l in enumerate(ls):
        if d <= l or i == len(ls) - 1:
            t = clamp(d / max(l, 1e-9), 0, 1)
            return p[i][0].lerp(p[i + 1][0], t), p[i][1].lerp(p[i + 1][1], t).normalized(), (p[i + 1][0] - p[i][0]).normalized()
        d -= l

def adjuster(o, p, f, col):
    # the lap belt's adjuster (a black slide across it) a share f of the way along it
    c, nr, ax = along(p, f)
    o['black'].add(block(c + nr * 0.0022, ax * 0.0095, nr.cross(ax).normalized() * 0.027, nr * 0.0042, col))

def bench_belts(ctx, seat, cols):
    # the right place's belts, buckled across it (mirrored onto the left place), laid on the bench's parts (seat) →
    # {surface: Part}
    cush, back, n, v, w = bench_frames(); FWD = Vector((0, 0, -1)); bvh = bvh_of(seat)
    BELT, BLACK, RED, CHROME = cols
    o = {k: Part() for k in ('belt', 'black', 'red', 'chrome')}
    sl, top = slot(ctx, SLOT_R[0], SLOT_R[1], BLACK); o['black'].add(sl)
    # the buckle's strap out of the crease by the middle, the buckle turned outboard and forward
    bp = into(laid(bvh, [(cush(u, 0.03, s), -n, None) for u, s in ((0.035, -0.205), (0.04, -0.18), (0.05, -0.155), (0.064, -0.13))]))
    o['belt'].add(band(bp, BELT))
    fwd = cush(0, 0, 1) - cush(0, 0, 0)
    mouth = buckle(o, bvh, cush(0.083, 0.03, -0.103), Vector((0.62, 0, 0)) + fwd * 0.78, -n, cols)
    # the outboard half: from the buckle (its tongue in it) across the place to the outboard crease, with its adjuster
    lap = laid(bvh, [(mouth.copy(), -n, None)] + [(cush(u, 0.03, s), -n, None) for u, s in ((0.16, -0.06), (0.25, -0.048), (0.34, -0.07), (0.41, -0.13),
                                                                                           (0.445, -0.19), (0.452, -0.205))])
    lap = list(reversed(into(list(reversed(lap)))))
    o['belt'].add(band(lap, BELT)); adjuster(o, lap, 0.5, BLACK)
    # the harness: out of its slot onto the back's outboard top, across its face to the buckle, over the lap belt to its
    # snap hook by the tongue
    keys = [(top, None, FWD), (Vector((SLOT_R[0] - 0.005, 0.64, SLOT_R[1] - 0.02)), None, FWD),
            (back(0.40, 0.0, 0.40), -v, None), (back(0.385, -0.06, 0.335), (w - v).normalized(), None)]
    keys += [(back(u, -0.07, a), w, None) for u, a in ((0.345, 0.24), (0.29, 0.12), (0.235, 0.0), (0.18, -0.12), (0.14, -0.23), (0.12, -0.30))]
    keys += [(cush(0.125, 0.03, -0.20), -n, None), (cush(0.135, 0.03, -0.14), -n, None), (cush(0.142, 0.03, -0.095), -n, None)]
    hp = laid(bvh_of(seat + [band(lap, BELT)]), keys); o['belt'].add(band(hp, BELT)); snap(o, hp, CHROME)
    return o

# ---------------------------------------------------------------- the nodes
def to_piece(ctx, part):
    # a Part → build_cockpit.py's Piece and its colour function (each vertex's own colour, found by position)
    p = ctx.Piece(); p.v = list(part.v); p.f = list(part.f); p.c = [part.vc[f[0]] for f in part.f]
    kd = KDTree(len(part.v))
    for i, v in enumerate(part.v): kd.insert(v, i)
    kd.balance()
    cols = part.vc
    return p, (lambda co: cols[kd.find(co)[1]])

def parts(ctx):
    C = ctx.C
    nodes = {k: Part().add(p).add(p.mirrored()) for k, p in front_seat(ctx).items()}
    nodes.update(bench(ctx))
    # the belts, laid on the seats (the front ones on the right seat; the pilot's then mirrored onto the left)
    surf = 'belt' if 'belt' in C else 'grip'
    cols = (tuple(C['belt']) if 'belt' in C else BELT_C, tuple(C['black']), tuple(C['red']), tuple(C['chrome']))
    fb = front_belts(ctx, _G['front']['cushion'] + _G['front']['back'] + _G['front']['head'], cols)
    bb = bench_belts(ctx, _G['bench']['cushion'] + _G['bench']['back'], cols)
    _G['belts'] = {'pilot': [p.mirrored() for p in fb['pilot'].values()], 'instructor': list(fb['instructor'].values()),
                   'bench': [q for p in bb.values() for q in (p, p.mirrored())]}
    for k, name in (('belt', surf), ('black', 'black'), ('red', 'red'), ('chrome', 'chrome')):
        nodes['seats.' + name] = nodes.get('seats.' + name, Part()).add(fb['instructor'][k]).add(fb['pilot'][k].mirrored())
        nodes['bench.' + name] = Part().add(bb[k]).add(bb[k].mirrored())
    _G['nodes'] = nodes
    return {k: to_piece(ctx, p) for k, p in nodes.items()}

def proxies(ctx):
    # what stays in code round the seats: the floor, the console between the front seats (cockpit.js FCON: its full
    # height from its aft end to its face, the face's slope left out; the low cover on the floor from the pedestal's foot
    # to it), and the lower walls' side panels when the walls are not made in this run (with them — cockpit_walls.py —
    # their own meshes shade the seats: a plane here would cover their recesses, the door handle's cup)
    S = ctx.S; F = S['floor']; out = []
    out.append(('quad', (-0.56, F, -1.25), (0.56, F, -1.25), (0.56, F, S['aft']), (-0.56, F, S['aft'])))
    fc = S['floorConsole']; cw, ch = fc['cover']; c0, c1 = -0.77, fc['z0'] + 0.03          # (the cover: cockpit.js, from the pedestal's foot to the console's face)
    out.append(('box', (0.0, (F + fc['y1']) / 2, (fc['zt'] + fc['z1']) / 2), (fc['w'], fc['y1'] - F, fc['z1'] - fc['zt'])))
    out.append(('box', (0.0, F + ch / 2, (c0 + c1) / 2), (cw, ch, c1 - c0)))
    if 'walls' in getattr(ctx, 'groups', ()): return out
    ys = [F, -0.33, -0.26, -0.19, -0.12, -0.04, S['sill']]
    for sd in (-1, 1):
        for y0, y1 in zip(ys, ys[1:]):
            x0, x1 = sd * (ctx.lowX(y0) + 0.001), sd * (ctx.lowX(y1) + 0.001)       # (just behind cockpit.js's side panels and the band)
            out.append(('quad', (x0, y0, -1.17), (x1, y1, -1.17), (x1, y1, S['aft']), (x0, y0, S['aft'])))
    return out

# the preview: as the shots see the seats (the quadrant, the right, looking back right and left — the pilot's own back
# and headrest from 0.2 m), the pilot's own headrest, looking down at the pilot's own seat, the right seat's inboard
# side from the left, and the cabin from in front of the seats looking aft; the belts: straight down at the pilot's own
# cushion, the instructor's from the left seat, between the backs at the bench
PREVIEW = {'quadrant': (-4, -40), 'right': (-60, -10), 'backR': (-145, -14), 'backL': (145, -14), 'headL': (165, -8), 'downL': (150, -45),
           'sideR': (-105, -38), 'inboardR': (-80, -42), 'aft': (180, -20, (0.0, 0.45, -1.0)), 'bench': (180, -28, (0.0, 0.35, 0.05)),
           'lap': (0, -75), 'beltR': (-100, -12), 'between': (-165, -22)}

# ---------------------------------------------------------------- the checks
def check(ctx, objs):
    S, V, bpy = ctx.S, ctx.Vector, ctx.bpy
    dg = bpy.context.evaluated_depsgraph_get()
    mine = {k: ob for k, ob in objs.items() if k.split('.')[0] in GROUPS}
    bvh = {k: ctx.BVHTree.FromObject(ob, dg) for k, ob in mine.items()}
    up = ('seats.seat', 'seats.seatSide')
    def cast(keys, o, d, far=5.0):
        best = None
        for k in keys:
            loc, nrm, i, dist = bvh[k].ray_cast(V(o), V(d).normalized(), far)
            if loc is not None and (best is None or dist < best[1]): best = (loc, dist, k)
        return best
    def verts(keys):
        for k in keys:
            for vt in mine[k].data.vertices: yield k, vt.co
    # every part closed and facing out: each edge between two faces, but for the seams where a part is split between two
    # nodes (the headrests' faces): those edges open in both, the same edge in each
    import bmesh
    key = lambda co: tuple(round(c * 1e5) for c in co)
    open_edges = {}
    for k, ob in mine.items():
        bm = bmesh.new(); bm.from_mesh(ob.data)
        for e in bm.edges:
            assert len(e.link_faces) in (1, 2), (k, 'an edge of more than two faces', tuple(e.verts[0].co))
            if len(e.link_faces) == 1: open_edges.setdefault(tuple(sorted((key(e.verts[0].co), key(e.verts[1].co)))), []).append(k)
        bm.free()
        assert ctx.volume(ob) > 0, (k, 'inside out', ctx.volume(ob))
    for e, ks in open_edges.items(): assert len(ks) == 2 and ks[0] != ks[1], ('an open edge', e, ks)
    # … and part by part (a small part inside out would hide in its node's volume behind the big ones): all the nodes in
    # one mesh, welded (the headrests' faces back onto their bodies), split into its connected parts, each closed (every
    # edge between two faces) with a positive volume
    bm = bmesh.new()
    for ob in mine.values(): bm.from_mesh(ob.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    bm.faces.ensure_lookup_table(); seen, comps = set(), []
    for f0 in bm.faces:
        if f0.index in seen: continue
        stack, comp = [f0], []; seen.add(f0.index)
        while stack:
            f = stack.pop(); comp.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if g.index not in seen: seen.add(g.index); stack.append(g)
        comps.append(comp)
    for comp in comps:
        edges = {e for f in comp for e in f.edges}
        assert all(len(e.link_faces) == 2 for e in edges), ('a part not closed', tuple(comp[0].verts[0].co))
        vol = sum(f.verts[0].co.dot(f.verts[1].co.cross(f.verts[2].co)) / 6 for f in comp)
        assert vol > 0, ('a part inside out', tuple(round(c, 3) for c in comp[0].verts[0].co), vol)
    _G['parts'] = len(comps)
    bm.free()
    # the right cushion's top where the instructor sits: the old insert's (−0.147 at z −0.41, −0.142 at −0.47; raked
    # 5°), the channels' crowns on it, their seams under it; no bolster under his thighs (x 0.13–0.45)
    X0, Z0 = S['seatX'], S['seat']['z']
    old_top = lambda z: CUSHION_TOP + (z - Z0) * -math.tan(RAKE)
    for z, want in ((-0.41, -0.147), (-0.47, -0.142)): assert abs(old_top(z) - want) < 0.001, ('the old cushion top', z)
    for k in range(37):                               # (over the channels: z −0.36 … −0.72)
        z = -0.36 - 0.01 * k
        h = cast(up, (X0, 0.5, z), (0, -1, 0)); dy = h[0].y - old_top(z)
        assert -0.0095 < dy < 0.0035, ('the cushion top under the instructor', z, dy)
    for i in range(32):
        for k in range(19):
            x, z = 0.135 + 0.01 * i, -0.36 - 0.02 * k
            h = cast(up, (x, 0.5, z), (0, -1, 0)); assert h[0].y < old_top(z) + 0.0035, ('a bolster under his thighs', x, z, h[0].y - old_top(z))
    # the backs: the bolsters' crowns on the old back's front plane (reclined 13°) moved back by BACK_AFT, nothing more
    # than 1 cm in front of it (his arms hang beside the back at x 0.06 and 0.53), the panel recessed behind it (his hips)
    cb, sb = math.cos(RECLINE), math.sin(RECLINE)
    old_plane = lambda y: (Z0 + BACK_DZ) - BACK_HALF * cb + (y - BACK_Y - BACK_HALF * sb) * math.tan(RECLINE)
    for y, want in ((0.10, -0.2488), (0.30, -0.2027)): assert abs(old_plane(y) - want) < 0.005, ('the old back plane', y, old_plane(y))
    plane = lambda y: old_plane(y) + BACK_AFT
    for x in (0.10, 0.48):
        for y in (0.0, 0.10, 0.30):
            # (the inboard one eased back beside his arm: up to ELBOW's depth, as the back's stations interpolate it)
            back = ELBOW[0] if x < X0 and elbow_ease(x - X0, (y - BACK_Y) / cb) > 0 else 0.0
            h = cast(up, (x, y, -1.0), (0, 0, 1)); dz = h[0].z - plane(y)
            assert -0.004 < dz < back + 0.004, ('a bolster off the plane', x, y, dz, back)
    for k, co in verts(up):
        if co.x > 0 and -0.12 < co.y < 0.47 and co.z > plane(co.y) - 0.05: assert co.z > plane(co.y) - 0.010, ('the back forward of the plane', tuple(co))
    for y in (-0.06, -0.035, 0.0, 0.05, 0.10):
        h = cast(['seats.seat'], (X0, y, -1.0), (0, 0, 1)); assert h[0].z > plane(y) + 0.005, ('the panel not recessed at the hips', y, h[0].z - plane(y))
    # the headrests: the left's face ≥ 0.2 m from the eye; the right's no further forward than the old one's insert moved
    # back by BACK_AFT (the instructor's head just clear of that: z −0.1751 at y 0.615, tilted 8°, + BACK_AFT), and the
    # moulded one's face no further forward up to the top of the old back's front plane (the shoulders under his neck)
    eye = ctx.EYE
    for k in mine:
        near = bvh[k].find_nearest(eye)[3]; assert near >= 0.20, (k, 'too near the eye', near)
    for k in range(12):
        y = 0.56 + 0.01 * k; old = -0.1751 + BACK_AFT + (y - 0.615) * math.tan(HEAD_TILT)
        h = cast(up, (X0, y, -1.0), (0, 0, 1)); assert h[0].z > old + 0.002, ('the headrest forward of the old one', y, h[0].z - old)
    for k in range(9):
        y = 0.47 + 0.01 * k
        h = cast(up, (X0, y, -1.0), (0, 0, 1)); assert h[0].z > min(plane(y), -0.1751 + BACK_AFT + (y - 0.615) * math.tan(HEAD_TILT)) + 0.002, ('the back\'s top forward', y)
    # the flap handle's and the trim wheel's sight lines from the eye past the left seat (they are aimed at past it: the
    # flap handle's grip at the pedestal's foot, the trim wheel's top — cockpit.js's aim points, in the spec)
    for name, aim in (('flaps', V(S['flap']['aim'])), ('trim', V(S['trimWheel']['aim']))):
        d = aim - eye; L = d.length
        h = cast(list(mine), eye, d, L - 0.03); assert h is None, (name, 'sight line blocked by', h and h[2])
        clear = min((bvh[k].find_nearest(eye + d * (t / L))[3], k, tuple(round(c, 3) for c in bvh[k].find_nearest(eye + d * (t / L))[0])) for k in mine for t in [0.12 + 0.005 * i for i in range(int((L - 0.15) / 0.005))])
        assert clear[0] > 0.02, (name, 'sight line passes the seats within', clear)
        _G[name] = clear
    # the console between the front seats, the lower walls outboard, the window band and the headliner over them (the
    # harnesses: their slot covers sunk ≤ 7 mm in the headliner), the bench within the cabin
    def in_cabin(k, co, margin):
        if co.y <= ctx.SILL: assert abs(co.x) < ctx.lowX(co.y) - margin, (k, 'into the wall', tuple(co))
        elif co.y <= ctx.WTOP: assert abs(co.x) < ctx.bandX(co.y) - 0.004, (k, 'through the window band', tuple(co))
        else: assert abs(co.x) < ctx.HWT and co.y < ctx.roofY(abs(co.x)) + 0.007, (k, 'through the headliner', tuple(co))
    for k, co in verts([k for k in mine if k.startswith('seats.')]):
        assert abs(co.x) >= 0.07 - 1e-6, (k, 'into the console', tuple(co))
        in_cabin(k, co, 0.005)
        if k in up: assert abs(co.x) <= 0.51 + 1e-6, (k, 'wider than the old seat', tuple(co))
    for k, co in verts([k for k in mine if k.startswith('bench.')]):
        assert abs(co.x) <= BENCH['x'] + 1e-6, (k, 'wider than the bench', tuple(co))
        in_cabin(k, co, 0.01)
    # the belts on the seats, not in them: no triangle of a strap or its hardware crosses one of a seat's
    seats = _G['front']['cushion'] + _G['front']['back'] + _G['front']['head']
    seat_parts = seats + [p.mirrored() for p in seats] + _G['bench']['cushion'] + _G['bench']['back']
    seats = bvh_of(seat_parts); seat_t = [[p.v[k] for k in t] for p in seat_parts for g in p.f for t in both_ways(g)]   # (its triangles, as in the tree)
    # (but a strap's end anchored in the crease between a cushion and its back, which goes into the crease by up to 2.5 cm)
    _G['belt_tris'] = 0
    for who, ps in _G['belts'].items():
        for p in ps:
            if not p.f: continue
            own = []; tree = bvh_of([p], own)
            for i, j in tree.overlap(seats):
                i = own[i]; c = sum((p.v[k] for k in p.f[i]), Vector()) / len(p.f[i])
                ok = min((c - a).length for a in _G['anchors']) < 0.025
                assert ok, (who, 'a belt through a seat', [tuple(round(v, 4) for v in p.v[k]) for k in p.f[i]], 'the seat\'s triangle', [tuple(round(v, 4) for v in q) for q in seat_t[j]])
            _G['belt_tris'] += sum(len(f) - 2 for f in p.f)
    # the cabin behind (cockpit.test: a ray from the eye along (0.6, −0.3, 1) meets something within 2.2 m): the bench
    h = cast(['bench.seat', 'bench.seatSide'], eye, (0.6, -0.3, 1)); assert h and h[1] < 2.2, ('the bench behind', h)
    # the occlusion proxy's boxes for the seats (cockpit.js AO_OCC: the right seat's cushion, back, headrest; the bench's
    # cushion, back): each part's extent within its box, or as far out as the old shapes were (+5 mm); but the cushions'
    # bolsters and rolls stand 1.2–2 cm over the old inserts' tops at their fronts (the panels keep those), the front
    # cushions' rears go 4.5 cm further aft, into the backs' feet, and the backs' feet go down behind the cushions' rears,
    # 5 cm lower than the old backs, which stopped at the cushions' tops; the TX's back rises to its shoulders (y 0.56,
    # where the old one's posts were; its shell there 5 cm further aft) and its moulded headrest, an arch nearly as wide
    # as the back (±0.19, the old one ±0.125), has the shell's rear, 6 cm behind the old headrest's, and is sunk in the
    # back from y 0.49 (the recline lever, outboard of the cushion's box, and the belts, thin, are left out)
    OLD = [((0.07, 0.51), (S['floor'], -0.095), (-0.94, -0.274 + BACK_AFT)), ((0.07, 0.51), (-0.185, 0.560), (-0.30 + BACK_AFT, -0.045 + BACK_AFT)),
           ((0.095, 0.485), (0.48, 0.693), (-0.18 + BACK_AFT, -0.015 + BACK_AFT)),
           ((-0.5, 0.5), (-0.289, -0.085), (0.229, 0.731)), ((-0.5, 0.5), (-0.185, 0.67), (0.715, 1.016))]
    groups = [_G['front']['cushion'] + _G['front']['frame'], _G['front']['back'], _G['front']['head'], _G['bench']['cushion'], _G['bench']['back']]
    _G['extents'] = []
    for row, old, g in zip(S['aoOcc'][6:11], OLD, groups):
        pts = [p for part in g for p in part.v]
        ext = [(min(p[a] for p in pts), max(p[a] for p in pts)) for a in range(3)]
        _G['extents'].append(ext)
        for a in range(3):
            lo, hi = min(row[2 * a], old[a][0]) - 0.005, max(row[2 * a + 1], old[a][1]) + 0.005
            assert lo <= ext[a][0] and ext[a][1] <= hi, ('outside the occlusion box', row, 'xyz'[a], ext[a], (lo, hi))
    print('seats:', _G['parts'], 'closed parts; belts', _G['belt_tris'], 'triangles; sight lines clear the seats by', {k: (round(_G[k][0], 4),) + _G[k][1:] for k in ('flaps', 'trim')}, 'extents', [[tuple(round(v, 3) for v in e) for e in ex] for ex in _G['extents']])
