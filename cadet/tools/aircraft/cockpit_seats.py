# CADET — tools/aircraft/cockpit_seats.py : the two front seats and the rear bench of the flown aircraft's cabin, a part
# module of tools/aircraft/build_cockpit.py (run by it, never alone; see its header):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-]
#   (a group alone, for its previews: … -- /tmp/cockpit.json /tmp/trial.glb /tmp/prev band,seats — never into assets/model,
#   which must hold every group; tools/aircraft/trial-glb.mjs runs the game's tests against such a trial model)
# - the front seats (one made on the right and mirrored): leather in the Archer TX's light grey (cockpit.js's S: the
#   centre panels light grey, the bolsters and shells a little darker; no tan or brown). The cushion and the back are
#   separate, each a closed upholstered body (the side bolsters, rolled round from their piping — a crisp welt along
#   the panel, the one hard edge — over the crown to the side, the sides, the bottom or the hard rear shell, the
#   cushion's soft front roll with its corners rounded in plan, the back's top rolled over) with its centre panel laid
#   into a recess between the bolsters — a pillow of its own, its crown 1.2 cm behind the bolsters' (on the back) or
#   level with the old insert's top (on the cushion), sewn across in channels (5 up the back, 4 along the cushion;
#   each seam a groove and darker), its edges tucked in under the bolsters' lips. The back swells a little at the
#   lumbar; its bolsters ease back towards its foot, which goes down behind the cushion; the cushion's rear is pushed
#   into that foot, so the two panels meet in a closed crease. The headrest: a padded block, its ends and front
#   corners rounded, its face crowned (2 cm in all) and bordered by seams, on two chrome posts out of the back's top.
#   Under the cushion: the black seat pan and the frame's two side plates, standing on the two aluminium seat tracks
#   on the floor; outboard at the back's foot, the recline lever (a housing and its handle).
# - the rear bench (one piece, two places): a cushion and a back, each one body lofted across the cabin with raised
#   rolls at its ends and down the middle and two panels laid in between them (the back's sewn in 3 channels); its
#   two headrests (hidden from the seats behind the front backs: plain blocks on the back's top). It is seen from 1.1 m
#   and further, mostly over the front backs (its cushion only as a sliver of its right front corner, looking back right
#   and down past the instructor's seat), so it is plainer: its cushion's ends square, its panels flat across.
# How it is built: every part is a loft — rings (sections) along a path, closed at both ends by caps clipped from the
#   end rings (the bodies' recesses stay notches in them) — its rounded ends made by moving the end rings in towards the
#   ring's middle (cos θ) as they move out (sin θ); the seams are rings of their own (a groove of 7 mm, the colour 0.78×
#   the leather's), so the channels pillow under smooth shading; the sections turn by under 30° a point wherever they
#   are meant to look round (build_cockpit.py makes an edge hard over 38°); the stations are ≤ 8.6 cm apart on the front
#   seats' faces (the game bakes the sky's occlusion per vertex). Every part is closed and faces outwards (its shadow;
#   check() tries each connected part on its own), the headrest's face and body together (two nodes, the same seam
#   edges).
# Made to the cabin's layout (the spec): the seats' places (seatX, seat.z), and what other code relies on — the
#   instructor on the right seat (cockpit.js's instructorSeat: the cushion's top under his hips and thighs as the old
#   insert's, −0.147 at z −0.41, raked 5°, no bolster under his thighs at x 0.13–0.45; the back and the headrest
#   BACK_AFT behind the old ones, as his hips are behind actor.js's SEATED_PA28 — the bolsters' crowns on the old back's
#   front plane moved back so, reclined 13°, nothing more than 1 cm in front of it, beside his arms; the panel recessed
#   behind it at his hips; the headrest's face no further forward than the old one's insert moved back so, behind his
#   head); the flap handle's and the
#   trim wheel's sight lines past the left seat (FLAP, TRIMW: clear by ≥ 2 cm); the console between the seats (inner
#   edges at |x| ≥ 0.07); the lower walls outboard (lowX); the eye (nothing nearer than 0.2 m); the bench behind (the
#   cabin within 2.2 m); the occlusion proxy's boxes for the seats (AO_OCC: each part within its box or no further out
#   than the old shapes were, but where noted in check()) — check() asserts them all. The old shapes' numbers that the
#   spec has not (heights, recline, the bench) are copied from cockpit.js (seat(), the rear bench's lines), each marked.
# Coordinates: the cabin's frame (metres, x = the right wing, y = up, z = aft), as build_cockpit.py.
# Nodes ("<group>.<surface>", the surfaces cockpit.js's): seats.seat (the front seats' centre panels: cushions, backs,
#   headrests' faces), seats.seatSide (their bodies: bolsters, sides, shells, front rolls, headrests), seats.black (the
#   seat pans, the frames' side plates, the recline levers), seats.alu (the seat tracks), seats.chrome (the headrest
#   posts); bench.seat (the bench's centre panels), bench.seatSide (its bodies and headrests). COLOR_0 rgb: the table's
#   colour, darker in the seams and the crevices along the panels' edges (alpha: build_cockpit.py's occlusion of what
#   is close by).
import math
from mathutils import Vector
from mathutils.kdtree import KDTree

GROUPS = ('seats', 'bench')
MAX_TRIS = 3600                       # (they replace 6,440 triangles of rounded boxes in code)

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
# seat(): the headrest rbox(0.25, 0.155, 0.085) at y 0.615, z bz + 0.06, tilted 8°, its insert's face at z −0.175
# (the new face 3 mm behind that); the posts at ±0.07 round y 0.52, z bz + 0.05, along the back's recline
HEAD_Y, HEAD_FRONT, HEAD_TILT, POST_X, POST_C = 0.615, -0.172, 8 * DEG, 0.07, (0.52, 0.05)
# seat(): the seat tracks at ±0.15 from the seat's middle, z SEAT.z − 0.05 ± 0.31 (FLOOR + 0.012 ± 0.0125)
TRACK_X, TRACK_Z = 0.15, (-0.36, 0.26)
# the rear bench (cockpit.js): its cushion's inserts at x ±0.25, top −0.1125 at z 0.48, raked 4°; its back at y 0.18,
# z 0.86, reclined 16°, 0.11 thick, x ±0.5 (its headrests, never seen, sit on the back's top here)
BENCH = {'z': 0.48, 'top': -0.1125, 'rake': 4 * DEG, 'x': 0.5, 'place': 0.255,
         'backY': 0.18, 'backZ': 0.86, 'recline': 16 * DEG, 'backHalf': 0.055}
# what stays in code round the seats (cockpit.js): the console between them (rbox(0.13, 0.13, 0.86) at y FLOOR + 0.065,
# z −0.33); the side panels on the lower walls (2.5 mm inside lowX)
CONSOLE = ((0.0, -0.335, -0.33), (0.13, 0.13, 0.86))

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
    H = Vector((X0, HEAD_Y, HEAD_FRONT + BACK_AFT)) + hw * (HEAD_FACE + HEAD_CROWN)   # (its face's crown at HEAD_FRONT, moved back)
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
# the headrest's section (h up, d aft of its middle), round from its face's top seam: the face (light) between the seams,
# the front corners rounded in three steps (none over 32°), the top and bottom round to the back (33°), its back (never
# seen but on the right one's inboard end) flat
HEAD_FACE, HEAD_CROWN = 0.0455, 0.009           # (the face's crown up its middle: 1 cm; across it, 0.9 cm more)
HEAD_SEC = [(0.064, -0.035), (0.0213, -HEAD_FACE), (-0.0213, -HEAD_FACE), (-0.064, -0.035), (-0.070, -0.029), (-0.0745, -0.021), (-0.0775, 0.0),
            (-0.068, 0.020), (0.068, 0.020), (0.0775, 0.0), (0.0745, -0.021), (0.070, -0.029)]
HEAD_NF = 4                                     # (the face: the section's first 4 points, the seams its first and last)
HEAD_HALF, HEAD_SEAM = 0.125, 0.090            # its half width; its face's side seams

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
    TAN, BROWN, BLACK, ALU, CHROME = (tuple(C[k]) for k in ('seat', 'seatSide', 'black', 'alu', 'chrome'))
    X0, Z0, F = S['seatX'], S['seat']['z'], S['floor']
    # ---- the cushion's body: its rear end pushed into the back's foot (they meet in the crease; its last 2.5 cm, the
    # end's notch and the panel's end in it, are inside the back), the recess along the middle, the front roll
    # (the recess closed in front of the panel's end, then rounded down to the front face over 6 cm, in 30° steps; the
    # front corners rounded in plan too, the outer 7 cm of each side drawn in as the roll goes down)
    st = [(s, CUSH_HALF, 0) for s in (-0.305 - BACK_AFT, -0.25, -0.165, -0.08, 0.005, 0.095, 0.186)]   # (its rear as far back as the back)
    st += [(0.198 + 0.061 * math.sin(th * DEG), CUSH_ROLL, th) for th in (0, 30, 60, 85)]
    rings = [end_rounding([(a, b, s) for a, b in sym_ring(half)], th * DEG, -0.050, 0.15) for s, half, th in st]
    body = loft(cushion, rings, [body_cols(half, half is not CUSH_ROLL, BROWN, 0.85) for s, half, th in st])
    # ---- its panel: 4 channels from the crease to the front roll (its rear end, inside the back's panel, not tucked)
    prings, kinds = panel_rings(channel_rows(-0.295 - BACK_AFT, 0.178, 4, 0.008)[1:], PANEL_HALF, 1, lambda t, a, b: b)
    panel = loft(cushion, prings, panel_cols(prings, kinds, TAN, 0.155))
    # ---- the back's body: its foot behind the cushion's rear (the recess open down there, filled by the cushion), the
    # recess, the top rolled over towards the back's middle plane, its corners rounded in
    bst = [(a, BACK_SEC, 0) for a in (-0.35, -0.28, -0.195, -0.11, -0.025, 0.06, 0.146, 0.232)]
    bst += [(0.244 + 0.064 * math.sin(th * DEG), BACK_ROLL, th) for th in (0, 35, 65, 85)]
    # (the bolsters ease back towards the foot, where they meet the cushion: the left one's inboard edge clears the flap
    # handle's sight line by as much as the old back's rounded corner did)
    ease = lambda a: clamp((-0.05 - a) / 0.20, 0.0, 1.0)
    rings = []
    for a, half, th in bst:
        c = math.cos(th * DEG); e = ease(a)
        half = [(u, d + e * dd) for (u, d), dd in zip(half, BACK_EASE)]
        rings.append([(math.copysign(0.17 + (abs(u) - 0.17) * c, u) if abs(u) > 0.17 else u, (d + elbow_ease(u, a)) * c, a) for u, d in sym_ring(half)])
    bbody = loft(back, rings, [body_cols(half, half is BACK_SEC, BROWN, 0.9) for a, half, th in bst])
    # ---- its panel: 5 channels from behind the cushion's rear up (its foot, inside the cushion, not tucked), swelling a
    # little at the lumbar
    lumbar = lambda t, a, b: b + 0.005 * math.exp(-((t + 0.12) / 0.10) ** 2) * (1 - (a / 0.16) ** 2)
    prings, kinds = panel_rings(channel_rows(-0.338, 0.225, 5, 0.007)[1:], BPANEL_HALF, -1, lumbar)
    prings = [[(u, d - BACK_HALF + BACK_RECESS, a) for u, d, a in r] for r in prings]
    bpanel = loft(back, prings, panel_cols(prings, kinds, TAN, 0.155))
    # ---- the headrest: a loft across, its ends rounded in four steps (22° each); its face crowned across and up,
    # between the seams
    ends = (82, 60, 38, 16)
    hst = [(-HEAD_SEAM - (HEAD_HALF - HEAD_SEAM) * math.sin(th * DEG), th) for th in ends] + [(u, 0) for u in (-HEAD_SEAM, -0.045, 0.0, 0.045, HEAD_SEAM)]
    hst += [(HEAD_SEAM + (HEAD_HALF - HEAD_SEAM) * math.sin(th * DEG), th) for th in reversed(ends)]
    nf = HEAD_NF; seams = (0, nf - 1)
    rings, cols = [], []
    for u, th in hst:
        c = math.cos(th * DEG); crown = HEAD_CROWN * max(0.0, 1 - (u / HEAD_SEAM) ** 2)
        ring = []
        for k, (h, d) in enumerate(HEAD_SEC):
            if 0 < k < nf - 1: d -= crown
            ring.append((h * (0.5 + 0.5 * c), d * (0.35 + 0.65 * c), u))
        rings.append(ring)
        cols.append([shade(BROWN, 0.85) if k in seams else BROWN for k in range(len(HEAD_SEC))])
    hbody = loft(head, rings, cols)
    n = len(HEAD_SEC); i0 = len(ends)                             # (the face: stations ±HEAD_SEAM, ring points 0 … nf − 1)
    face, rest = split(hbody, lambda f: len(f) == 4 and i0 <= min(i // n for i in f) < i0 + 4 and max(i % n for i in f) <= nf - 1)
    face.vc = [shade(TAN, 0.85) if (o % n in seams or o // n in (i0, i0 + 4)) else TAN for o in face.src]
    rest.vc = [shade(BROWN, 0.85) if (o % n < nf and o // n in (i0, i0 + 4)) else c for o, c in zip(rest.src, rest.vc)]
    # ---- the posts (chrome): along the back's recline, from inside the back up into the headrest
    posts = Part()
    for sx in (-1, 1):
        c = Vector((X0 + sx * POST_X, POST_C[0], Z0 + BACK_DZ + BACK_AFT + POST_C[1]))
        posts.add(rod(c - bv * 0.085, c + bv * 0.068, 0.0055, 10, CHROME))
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
    _G['front'] = {'cushion': [body, panel], 'frame': [hw, trk], 'back': [bbody, bpanel], 'head': [hbody, posts], 'lever': lever}
    return {'seats.seatSide': Part().add(body).add(bbody).add(rest), 'seats.seat': Part().add(panel).add(bpanel).add(face),
            'seats.black': Part().add(hw).add(lever), 'seats.alu': trk, 'seats.chrome': posts}

def as_part(piece, col):
    # one of build_cockpit.py's Pieces (its helpers' cylinders and boxes) → a Part of one colour
    p = Part(); p.v = [Vector(v) for v in piece.v]; p.f = list(piece.f); p.vc = [col] * len(piece.v)
    return p

def rod(a, b, r, seg, col):
    # a closed round rod from a to b (enough sides to shade smooth: under build_cockpit.py's 38° hard edges)
    ax = (b - a).normalized(); t = ax.cross(Vector((1, 0, 0))).normalized(); bb = ax.cross(t)
    frame = lambda x, y, z: a + t * x + bb * y + ax * z
    ring = [(r * math.cos(2 * math.pi * k / seg), r * math.sin(2 * math.pi * k / seg)) for k in range(seg)]
    return loft(frame, [[(x, y, z) for x, y in ring] for z in (0.0, (b - a).length)], [[col] * seg] * 2)

def hexa(c, col):
    # a closed six-sided block from its 8 corners, indexed 4i + 2j + k (i, j, k: each axis' two sides)
    p = Part(); p.v = [Vector(v) for v in c]; p.vc = [col] * 8
    p.f = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    if p.volume() < 0: p.f = [tuple(reversed(f)) for f in p.f]
    return p

# ---------------------------------------------------------------- the rear bench
def bench(ctx):
    C = ctx.C; TAN, BROWN = tuple(C['seat']), tuple(C['seatSide'])
    b = BENCH; X, P0 = b['x'], b['place']
    cr, sr = math.cos(b['rake']), math.sin(b['rake'])
    O = Vector((0, b['top'], b['z'])); n = Vector((0, cr, sr)); f = Vector((0, sr, -cr))
    cush = lambda u, h, s: O + Vector((u, 0, 0)) + n * h + f * s                # u across, h up, s forward
    cb, sb = math.cos(b['recline']), math.sin(b['recline'])
    Bc = Vector((0, b['backY'], b['backZ'])); v = Vector((0, cb, sb)); w = Vector((0, -sb, cb))
    back = lambda u, d, a: Bc + Vector((u, 0, 0)) + w * d + v * a              # u across, d aft, a up
    # the bodies are lofted across: stations at the rounded ends, the outer rolls' crowns, the recesses (the panels'
    # places), the middle roll's crowns; the cushion's ends square (seen at most as the right front corner's outline
    # against the wall, past the instructor's seat)
    across = [(-X + 0.035 * (1 - math.sin(70 * DEG)), 70, True), (-X + 0.035, 0, True), (-P0 - 0.17, 0, False), (-P0 + 0.17, 0, False),
              (-0.045, 0, True)]
    across += [(-u, th, r) for u, th, r in reversed(across)]
    across_c = [(-X, 0, True)] + across[2:-2] + [(X, 0, True)]
    # the cushion's section (s, h) round from the bottom's rear corner: the recess's top 3.6 cm under the rolls'; its
    # bottom as low as the old one's (11 cm over the floor)
    def cush_sec(H): return [(-0.245, -0.16), (-0.25, -0.035), (-0.226, H), (0.165, H), (0.20, 0.012), (0.238, -0.02), (0.25, -0.085), (0.243, -0.16)]
    rings = []
    for u, th, ridge in across_c:
        c = math.cos(th * DEG)
        rings.append([(s * (0.6 + 0.4 * c), -0.06 + (h + 0.06) * c, u) for s, h in cush_sec(0.012 if ridge else -0.024)])
    cbody = loft(lambda s, h, u: cush(u, h, s), rings, [[shade(BROWN, 0.85) if q[1] < -0.1 else BROWN for q in r] for r in rings])
    cpanels = Part()
    for sx in (-1, 1):
        pr, kinds = panel_rings([(-0.222, 'tuck'), (-0.212, 'edge'), (-0.03, 'crown'), (0.154, 'edge'), (0.164, 'tuck')],
                                [(0.150, -0.005), (0.158, -0.022)], 1, lambda t, a, bb: bb)
        pc = panel_cols(pr, kinds, TAN, 0.156)
        cpanels.add(loft(lambda u, h, s, o=sx * P0: cush(u + o, h, s), pr, pc))
    # the back's section (a, d) round from the bottom's front
    def back_sec(D): return [(-0.36, -0.045), (-0.33, D), (0.222, D), (0.252, -0.052), (0.29, -0.036), (0.31, 0.0), (0.29, 0.045), (-0.36, 0.055)]
    rings = []
    for u, th, ridge in across:
        c = math.cos(th * DEG)
        rings.append([(a * (0.85 + 0.15 * c), d * c, u) for a, d in back_sec(-b['backHalf'] if ridge else -0.024)])
    bbody = loft(lambda a, d, u: back(u, d, a), rings, [[BROWN] * len(r) for r in rings])
    bpanels = Part()
    for sx in (-1, 1):
        pr, kinds = panel_rings(channel_rows(-0.31, 0.215, 3, 0.008), [(0.150, -0.0065), (0.158, -0.0205)], -1, lambda t, a, bb: bb)
        pr = [[(a, d - b['backHalf'] + 0.011, t) for a, d, t in r] for r in pr]
        bpanels.add(loft(lambda u, d, a, o=sx * P0: back(u + o, d, a), pr, panel_cols(pr, kinds, TAN, 0.156)))
    # the headrests: plain blocks sitting on the back's top (never seen from the seats: they only cast their shadows)
    heads = Part()
    for sx in (-1, 1):
        Hc = back(sx * P0, 0.002, 0.31 + 0.055)
        heads.add(hexa([Hc + Vector((u, 0, 0)) + v * h + w * d for u in (-0.115, 0.115) for h in (-0.053, 0.053) for d in (-0.034, 0.034)], BROWN))
    _G['bench'] = {'cushion': [cbody, cpanels], 'back': [bbody, bpanels, heads]}
    return {'bench.seatSide': Part().add(cbody).add(bbody).add(heads), 'bench.seat': Part().add(cpanels).add(bpanels)}

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
    nodes = {k: Part().add(p).add(p.mirrored()) for k, p in front_seat(ctx).items()}
    nodes.update(bench(ctx))
    _G['nodes'] = nodes
    return {k: to_piece(ctx, p) for k, p in nodes.items()}

def proxies(ctx):
    # what stays in code round the seats: the floor, the console between the front seats, the lower walls' side panels
    S = ctx.S; F = S['floor']; out = []
    out.append(('quad', (-0.56, F, -1.25), (0.56, F, -1.25), (0.56, F, S['aft']), (-0.56, F, S['aft'])))
    out.append(('box',) + CONSOLE)
    ys = [F, -0.33, -0.26, -0.19, -0.12, -0.04, S['sill']]
    for sd in (-1, 1):
        for y0, y1 in zip(ys, ys[1:]):
            x0, x1 = sd * (ctx.lowX(y0) - 0.0025), sd * (ctx.lowX(y1) - 0.0025)
            out.append(('quad', (x0, y0, -1.17), (x1, y1, -1.17), (x1, y1, S['aft']), (x0, y0, S['aft'])))
    return out

# the preview: as the shots see the seats (the quadrant, the right, looking back right and left — the pilot's own back
# and headrest from 0.2 m), the pilot's own headrest, looking down at the pilot's own seat, the right seat's inboard
# side from the left, and the cabin from in front of the seats looking aft
PREVIEW = {'quadrant': (-4, -40), 'right': (-60, -10), 'backR': (-145, -14), 'backL': (145, -14), 'headL': (165, -8), 'downL': (150, -45),
           'sideR': (-105, -38), 'inboardR': (-80, -42), 'aft': (180, -20, (0.0, 0.45, -1.0)), 'bench': (180, -28, (0.0, 0.35, 0.05))}

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
    # back by BACK_AFT (the instructor's head just clear of that: z −0.1751 at y 0.615, tilted 8°, + BACK_AFT)
    eye = ctx.EYE
    for k in mine:
        near = bvh[k].find_nearest(eye)[3]; assert near >= 0.20, (k, 'too near the eye', near)
    for k in range(12):
        y = 0.56 + 0.01 * k; old = -0.1751 + BACK_AFT + (y - 0.615) * math.tan(HEAD_TILT)
        h = cast(up, (X0, y, -1.0), (0, 0, 1)); assert h[0].z > old + 0.002, ('the headrest forward of the old one', y, h[0].z - old)
    # the flap handle's and the trim wheel's sight lines from the eye past the left seat (they are aimed at past it)
    fl, tw = S['flap'], S['trimWheel']
    for name, aim in (('flaps', V((0, fl['y'] + 0.004, fl['z'] + 0.14))), ('trim', V((0, tw['y'] + tw['r'] - 0.004, tw['z'])))):
        d = aim - eye; L = d.length
        h = cast(list(mine), eye, d, L - 0.03); assert h is None, (name, 'sight line blocked by', h and h[2])
        clear = min((bvh[k].find_nearest(eye + d * (t / L))[3], k, tuple(round(c, 3) for c in bvh[k].find_nearest(eye + d * (t / L))[0])) for k in mine for t in [0.12 + 0.005 * i for i in range(int((L - 0.15) / 0.005))])
        assert clear[0] > 0.02, (name, 'sight line passes the seats within', clear)
        _G[name] = clear
    # the console between the front seats, the lower walls outboard, the bench within the cabin
    for k, co in verts([k for k in mine if k.startswith('seats.')]):
        assert abs(co.x) >= 0.07 - 1e-6, (k, 'into the console', tuple(co))
        assert abs(co.x) < ctx.lowX(co.y) - 0.005, (k, 'into the wall', tuple(co))
        if k in up: assert abs(co.x) <= 0.51 + 1e-6, (k, 'wider than the old seat', tuple(co))
    for k, co in verts([k for k in mine if k.startswith('bench.')]):
        assert abs(co.x) <= BENCH['x'] + 1e-6 and abs(co.x) < ctx.lowX(co.y) - 0.01, (k, 'into the wall', tuple(co))
    # the cabin behind (cockpit.test: a ray from the eye along (0.6, −0.3, 1) meets something within 2.2 m): the bench
    h = cast(['bench.seat', 'bench.seatSide'], eye, (0.6, -0.3, 1)); assert h and h[1] < 2.2, ('the bench behind', h)
    # the occlusion proxy's boxes for the seats (cockpit.js AO_OCC: the right seat's cushion, back, headrest; the bench's
    # cushion, back): each part's extent within its box, or as far out as the old shapes were (+5 mm); but the cushions'
    # bolsters and rolls stand 1.2–2 cm over the old inserts' tops at their fronts (the panels keep those), the front
    # cushions' rears go 4.5 cm further aft, into the backs' feet, and the backs' feet go down behind the cushions' rears,
    # 5 cm lower than the old backs, which stopped at the cushions' tops (the recline lever, outboard of the cushion's box,
    # too small to matter, is left out)
    OLD = [((0.07, 0.51), (S['floor'], -0.095), (-0.94, -0.274 + BACK_AFT)), ((0.07, 0.51), (-0.185, 0.474), (-0.30 + BACK_AFT, -0.069 + BACK_AFT)),
           ((0.165, 0.415), (0.48, 0.693), (-0.18 + BACK_AFT, -0.072 + BACK_AFT)),
           ((-0.5, 0.5), (-0.289, -0.085), (0.229, 0.731)), ((-0.5, 0.5), (-0.185, 0.67), (0.715, 1.016))]
    groups = [_G['front']['cushion'] + _G['front']['frame'], _G['front']['back'], _G['front']['head'][:1], _G['bench']['cushion'], _G['bench']['back']]
    _G['extents'] = []
    for row, old, g in zip(S['aoOcc'][6:11], OLD, groups):
        pts = [p for part in g for p in part.v]
        ext = [(min(p[a] for p in pts), max(p[a] for p in pts)) for a in range(3)]
        _G['extents'].append(ext)
        for a in range(3):
            lo, hi = min(row[2 * a], old[a][0]) - 0.005, max(row[2 * a + 1], old[a][1]) + 0.005
            assert lo <= ext[a][0] and ext[a][1] <= hi, ('outside the occlusion box', row, 'xyz'[a], ext[a], (lo, hi))
    print('seats:', _G['parts'], 'closed parts; sight lines clear the seats by', {k: (round(_G[k][0], 4),) + _G[k][1:] for k in ('flaps', 'trim')}, 'extents', [[tuple(round(v, 3) for v in e) for e in ex] for ex in _G['extents']])
