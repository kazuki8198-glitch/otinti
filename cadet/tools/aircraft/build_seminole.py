# CADET — tools/aircraft/build_seminole.py : the school's Seminole (a PA-44-180 in SHOYO AIRWAYS' colours) seen from
# outside, made in Blender the way build_archer.py makes the Archer (run in the background, no window):
#   node tools/aircraft/spec.mjs pa44 > /tmp/seminole.json
#   blender -b --factory-startup -P tools/aircraft/build_seminole.py -- /tmp/seminole.json assets/model/seminole.glb [preview_dir|-] [near|far]
#   (near: assets/model/seminole.glb — the twin's days' aircraft; far: assets/model/seminole-far.glb — the parked ones)
# Everything is made by this script (no other files: see assets/CREDITS.md), to FLIGHT LAB's own dimensions for the
# PA-44 (spec.mjs pa44: the wing, the T-tail, the engines on the wings, the retractable gear), so the moving parts turn
# on acmesh's hinge lines and the lights, the walk-around's places and the colliders stay where they were. The cabin is
# the Archer's (the Seminole's cockpit is the Archer's moved to the Seminole's eye: build_archer.py's cabin moved by the
# same offset), ahead of it a pointed nose (the nose baggage), behind it a longer tail cone up to the T-tail.
# Coordinates and the glTF as build_archer.py's. One mesh per part, named as acmesh names them (aircraft/archer-model.js
# reads them): body (wings with the nacelles, fin, tail cone), cabin (the fuselage ahead of the cabin's rear ring, the
# nose, the windows), ailL ailR flapL flapR stab rud, prop.0 prop.1 (the left and the right engine's blades and spinner:
# the right one turns the other way, so its blades are the left's mirrored), gearN gearL gearR (down, as at rest), and
# reg.<registration>.
# COLOR_0: rgb = the paint (sRGB), alpha = the ambient occlusion baked per vertex.
import bpy, bmesh, json, math, sys, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.geometry import delaunay_2d_cdt

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
S = json.load(open(argv[0]))
OUT = argv[1]
PREVIEW = argv[2] if len(argv) > 2 and argv[2] != '-' else None
LOD = argv[3] if len(argv) > 3 else 'near'
NEAR = LOD == 'near'
# the resolution: ring stations and points round the fuselage, airfoil points and span stations, round parts
Q = dict(near=dict(fz=1.45, side=(3, 3, 1, 1, 5), arcB=6, arcT=10, foil=18, span=0.8, round=20, decal=0.045, off=0.004),
         far=dict(fz=0.3, side=(1, 1, 1, 1, 1), arcB=2, arcT=3, foil=4, span=0.2, round=6, decal=0.2, off=0.012))[LOD]
DEG, TAU = math.pi / 180, math.tau

def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t
def smooth(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- the paint (sRGB, as acmesh's colours)
WHITE = (0.94, 0.94, 0.92)
NAVY = (0.075, 0.16, 0.36)            # SHOYO AIRWAYS' deep blue
GOLD = (0.85, 0.62, 0.18)
GLASS = (0.10, 0.14, 0.19)            # (the game: dark, blue-grey → glass)
RUBBER = (0.09, 0.09, 0.10)           # tyres, seals, the wing walk (→ rubber)
METAL = (0.72, 0.73, 0.75)            # struts, the exhaust, the step (→ metal)
DARKMETAL = (0.62, 0.62, 0.63)
INLET = (0.05, 0.05, 0.055)           # the cowling's air inlets (dark openings)
SEAM = (0.50, 0.52, 0.55)             # panel joints (a grey line, still paint)
BLADE = (0.13, 0.13, 0.14)            # the propeller: black, yellow tips
TIP = (0.95, 0.78, 0.15)
LENS = (0.62, 0.64, 0.68)

# ---------------------------------------------------------------- the scene
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new('export'); bpy.context.scene.collection.children.link(COL)
AUX = bpy.data.collections.new('aux'); bpy.context.scene.collection.children.link(AUX)
PARTS = {}                           # part name → list of (bmesh-able piece objects) merged at the end

def new_bm(): return bmesh.new()

class Piece:
    # a list of triangles/quads with one colour per face, built in plain Python and turned into a mesh at the end
    def __init__(self):
        self.v = []; self.f = []; self.c = []; self.sharp = set()
    def vert(self, p):
        self.v.append(Vector(p)); return len(self.v) - 1
    def face(self, idx, col):
        self.f.append(tuple(idx)); self.c.append(col)
    def grid(self, rows, col_of, closed=False, flip=False):
        # rows: list of lists of points (same length); a quad strip between consecutive rows; col_of(i, j) → colour
        base = len(self.v); n = len(rows[0])
        for r in rows:
            for p in r: self.v.append(Vector(p))
        m = n if closed else n - 1
        for i in range(len(rows) - 1):
            for j in range(m):
                a, b = base + i * n + j, base + i * n + (j + 1) % n
                c, d = base + (i + 1) * n + (j + 1) % n, base + (i + 1) * n + j
                q = (a, b, c, d) if not flip else (d, c, b, a)
                self.face(q, col_of(i, j))
        return base
    def fan(self, ring_idx, centre, col, flip=False):
        ci = self.vert(centre); n = len(ring_idx)
        for j in range(n):
            a, b = ring_idx[j], ring_idx[(j + 1) % n]
            self.face((ci, b, a) if not flip else (ci, a, b), col)
    def add(self, other):
        o = len(self.v); self.v += other.v
        self.f += [tuple(i + o for i in f) for f in other.f]; self.c += other.c
        return self
    def transform(self, fn):
        self.v = [Vector(fn(p)) for p in self.v]; return self

def to_object(name, piece, coll=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in piece.v], [], [tuple(f) for f in piece.f]); me.update()
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name, me); (coll or AUX).objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    lay = bm.loops.layers.float_color.new('COLOR_0')
    bm.faces.ensure_lookup_table()
    for k, f in enumerate(bm.faces):
        c = piece.c[k] if k < len(piece.c) else WHITE
        for l in f.loops: l[lay] = (c[0], c[1], c[2], 1.0)
        f.smooth = True
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    # sharp where the surface folds (trailing edges, caps, the joints of the small parts)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 38 * DEG: e.smooth = False
    bm.to_mesh(me); bm.free(); me.update()
    return ob

def tris(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)

# ---------------------------------------------------------------- shapes
def naca4(m, p, t, f):
    # NACA 4-digit: camber m at p, thickness t; f = chord fraction → (upper, lower) heights (chord = 1)
    yt = 5 * t * (0.2969 * math.sqrt(max(f, 0)) - 0.1260 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1036 * f ** 4)
    if m == 0: return yt, -yt
    yc = m / (p * p) * (2 * p * f - f * f) if f < p else m / ((1 - p) ** 2) * ((1 - 2 * p) + 2 * p * f - f * f)
    return yc + yt, yc - yt

def cosspace(n, a=0.0, b=1.0):
    return [a + (b - a) * (0.5 - 0.5 * math.cos(math.pi * i / n)) for i in range(n + 1)]

def resample(poly, n):
    # a polyline resampled to n segments, evenly by length
    L = [0.0]
    for i in range(1, len(poly)): L.append(L[-1] + (Vector(poly[i]) - Vector(poly[i - 1])).length)
    out, k = [], 0
    for i in range(n + 1):
        s = L[-1] * i / n
        while k < len(L) - 2 and L[k + 1] < s: k += 1
        t = (s - L[k]) / max(L[k + 1] - L[k], 1e-9)
        out.append(Vector(poly[k]).lerp(Vector(poly[k + 1]), t))
    return out

# a monotone cubic through (x, y) keys (Fritsch–Carlson): smooth, no overshoot
def mono(keys):
    xs = [k[0] for k in keys]; ys = [k[1] for k in keys]; n = len(xs)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2 for i in range(1, n - 1)] + [d[-1]]
    for i in range(n - 1):
        if d[i] == 0: m[i] = m[i + 1] = 0; continue
        a, b = m[i] / d[i], m[i + 1] / d[i]
        s = a * a + b * b
        if s > 9: tau = 3 / math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(j for j in range(n - 1) if xs[j] <= x)
        h = xs[i + 1] - xs[i]; t = (x - xs[i]) / h
        return (ys[i] * (2 * t ** 3 - 3 * t * t + 1) + h * m[i] * (t ** 3 - 2 * t * t + t)
                + ys[i + 1] * (-2 * t ** 3 + 3 * t * t) + h * m[i + 1] * (t ** 3 - t * t))
    return f

# ================================================================ the fuselage
# Each station: the half-section (the right side, from the keel up to the crown) is a bottom arc (keel → the lower
# corner at yk, half-width Wb), the lower wall up to the belt (yc, the widest: W), the upper wall leaning in to the
# shoulder (ys, Ws) and the roof arc to the crown (yt). The cabin is shaped round the cockpit (cockpit.js: the inner
# walls 0.56 out at the sill 0.38, leaning in to 0.49 at the window tops 0.75, the roof 0.845; the windshield from
# (z −1.30, y 0.425) to (−0.84, 0.815): the Archer's numbers, moved here by DZ, DY); ahead of the windshield the nose
# (the baggage bay) narrowing to a rounded point, the tail cone to the physics' last ring (z 5.1, centre 0.42).
ZN, ZT = -3.33, 5.1
# the Archer's cabin (build_archer.py's stations from −1.30 to 1.25) moved by the eyes' offset: 0.2 m forward, 0.04 down
DZ, DY = -0.2, -0.04
FK = {  #   z      W     yc     Ws    ys     yt     Wb    yk     yb
    'z':  [-3.33, -3.25, -3.10, -2.80, -2.40, -1.90, -1.50, -1.25, -1.04, -0.60, 0.10, 0.60, 1.05, 1.60, 2.30, 3.00, 3.70, 4.40, 4.90, 5.10],
    'W':  [0.060, 0.160, 0.270, 0.400, 0.500, 0.570, 0.595, 0.600, 0.600, 0.600, 0.598, 0.585, 0.545, 0.480, 0.390, 0.300, 0.210, 0.130, 0.075, 0.045],
    'yc': [-0.010, 0.000, 0.015, 0.040, 0.070, 0.110, 0.160, 0.210, 0.260, 0.260, 0.260, 0.260, 0.260, 0.250, 0.250, 0.270, 0.300, 0.330, 0.360, 0.380],
    'Ws': [0.045, 0.120, 0.205, 0.310, 0.405, 0.475, 0.505, 0.515, 0.520, 0.525, 0.520, 0.505, 0.465, 0.400, 0.315, 0.235, 0.160, 0.100, 0.060, 0.035],
    'ys': [0.020, 0.060, 0.100, 0.160, 0.220, 0.290, 0.340, 0.520, 0.695, 0.725, 0.725, 0.700, 0.620, 0.540, 0.470, 0.430, 0.420, 0.430, 0.440, 0.440],
    'yt': [0.030, 0.090, 0.150, 0.230, 0.310, 0.380, 0.425, 0.660, 0.830, 0.850, 0.845, 0.810, 0.730, 0.640, 0.560, 0.505, 0.480, 0.475, 0.470, 0.460],
    'Wb': [0.050, 0.140, 0.250, 0.380, 0.480, 0.555, 0.580, 0.585, 0.585, 0.585, 0.580, 0.565, 0.520, 0.455, 0.365, 0.280, 0.195, 0.120, 0.070, 0.040],
    'yk': [-0.040, -0.110, -0.190, -0.300, -0.380, -0.425, -0.440, -0.440, -0.440, -0.440, -0.430, -0.400, -0.350, -0.270, -0.160, -0.050, 0.060, 0.170, 0.260, 0.300],
    'yb': [-0.060, -0.170, -0.280, -0.410, -0.510, -0.560, -0.580, -0.585, -0.588, -0.590, -0.585, -0.560, -0.510, -0.440, -0.330, -0.210, -0.080, 0.070, 0.200, 0.260],
}
FI = {k: mono(list(zip(FK['z'], FK[k]))) for k in FK if k != 'z'}
def sec(z): return {k: FI[k](z) for k in FI}

# the stripes: SHOYO AIRWAYS' deep blue band and a gold line above it, low along the cabin, sweeping up behind the
# wing to the fin; each edge a y at the station (the walls between yk and ys carry them)
STRIPES = [mono([(-3.4, -0.12), (-2.2, -0.06), (0.4, -0.01), (1.4, 0.04), (2.6, 0.17), (3.6, 0.28), (5.2, 0.36)]),     # blue, bottom
           mono([(-3.4, 0.0), (-2.2, 0.09), (0.4, 0.15), (1.4, 0.19), (2.6, 0.30), (3.6, 0.38), (5.2, 0.42)]),        # blue, top
           mono([(-3.4, 0.03), (-2.2, 0.125), (0.4, 0.185), (1.4, 0.225), (2.6, 0.325), (3.6, 0.40), (5.2, 0.43)]),   # gold, bottom
           mono([(-3.4, 0.045), (-2.2, 0.14), (0.4, 0.205), (1.4, 0.245), (2.6, 0.34), (3.6, 0.41), (5.2, 0.435)])]  # gold, top
SIDE_COL = [WHITE, NAVY, WHITE, GOLD, WHITE]          # corner → e1, e1 → e2, e2 → e3, e3 → e4, e4 → shoulder

def half_profile(z):
    # → list of (x, y) from the keel to the crown, and the colour of each segment (for the stripes)
    s = sec(z)
    W, yc, Ws, ys, yt, Wb, yk, yb = s['W'], s['yc'], s['Ws'], s['ys'], s['yt'], s['Wb'], s['yk'], s['yb']
    nb, nt = 2.6, 2.3
    kb = (W - Wb) / max(yc - yk, 1e-4); kt = (Ws - W) / max(ys - yc, 1e-4)
    def arcB(u):   # u 0 (keel) → 1 (corner)
        th = (1 - u) * math.pi / 2; c, sn = math.cos(th), math.sin(th)
        x = Wb * c ** (2 / nb); y = yk - (yk - yb) * sn ** (2 / nb)
        return (x + kb * (y - yk) * (x / Wb), y)
    def arcT(u):   # u 0 (shoulder) → 1 (crown)
        th = u * math.pi / 2; c, sn = math.cos(th), math.sin(th)
        x = Ws * c ** (2 / nt); y = ys + (yt - ys) * sn ** (2 / nt)
        return (x + kt * (y - ys) * (x / Ws), y)
    def wall(y):
        return (Wb + kb * (y - yk), y) if y <= yc else (W + kt * (y - yc), y)
    pts, cols = [], []
    nB = Q['arcB']
    for i in range(nB):
        u = i / nB; pts.append(arcB(u)); cols.append(WHITE)
    # the side: corner → stripe edges → shoulder (the edges clamped onto the walls, in order)
    e = [clamp(f(z), yk + 0.006, ys - 0.006) for f in STRIPES]
    for i in range(1, 4): e[i] = max(e[i], e[i - 1] + 0.003)
    ys_ = max(ys, e[3] + 0.004)
    marks = [yk] + e + [ys_]
    for k in range(5):
        n = Q['side'][k]; y0, y1 = marks[k], marks[k + 1]
        for i in range(n):
            # the belt: a point on it when it falls inside this run
            y = y0 + (y1 - y0) * i / n
            pts.append(wall(y)); cols.append(SIDE_COL[k])
    nT = Q['arcT']
    for i in range(nT + 1):
        u = i / nT
        # (the arc starts at ys; if a stripe pushed past it, the wall leads there)
        p = arcT(u) if ys_ <= ys + 1e-6 or u > 0 else wall(ys_)
        pts.append(p); cols.append(WHITE)
    return pts, cols

def ring(z):
    hp, cols = half_profile(z)
    right = [(x, y, z) for x, y in hp]
    left = [(-x, y, z) for x, y in reversed(hp[1:-1])]
    rcols = cols[:-1]; lcols = list(reversed(cols[:-1]))
    return right + left, rcols + lcols          # (round from the keel, up the right side, down the left)

def stations(z0, z1, per_m, fixed=()):
    n = max(2, int(math.ceil((z1 - z0) * per_m * 6)))
    zs = set(round(z0 + (z1 - z0) * (0.5 - 0.5 * math.cos(math.pi * i / n)) if False else z0 + (z1 - z0) * i / n, 6) for i in range(n + 1))
    for z in fixed:
        if z0 <= z <= z1: zs.add(round(z, 6))
    zs = sorted(zs)
    out = [zs[0]]
    for z in zs[1:]:
        if z - out[-1] > 0.012: out.append(z)
    if out[-1] != z1: out[-1] = z1
    return out

def fuselage_piece(z0, z1, cap0=False, cap1=False):
    zs = stations(z0, z1, Q['fz'], fixed=(-1.50, -1.25, -1.04, 0.10, 0.60, 1.60, S['zRear']) if NEAR else (-1.25, S['zRear']))
    rows, colrows = [], []
    for z in zs:
        r, c = ring(z); rows.append(r); colrows.append(c)
    p = Piece()
    n = len(rows[0])
    # winding: from z0 to z1 (aft), the ring going keel → right → crown → left: (a, b, c, d) points outward
    base = p.grid(rows, lambda i, j: colrows[i][j], closed=True, flip=False)
    if cap0: p.fan([base + j for j in range(n)], (0, sum(v[1] for v in rows[0]) / n, zs[0]), WHITE, flip=True)
    if cap1:
        last = base + (len(rows) - 1) * n
        p.fan([last + j for j in range(n)], (0, sum(v[1] for v in rows[-1]) / n, zs[-1] + 0.01), WHITE)
    return p, zs

ZR = S['zRear']
fus_front, zs_front = fuselage_piece(ZN, ZR, cap0=False)
fus_rear, zs_rear = fuselage_piece(ZR, ZT, cap1=True)
# the nose's point: the first ring rounded off forward to the tip (the nose baggage's cone)
def nose_cap():
    p = Piece()
    r0, c0 = ring(ZN)
    n = len(r0); cy = sec(ZN)['yc']
    rows = [r0]
    nr = 4 if NEAR else 2
    for i in range(1, nr):
        t = i / nr; k = math.cos(t * math.pi / 2); dz = 0.06 * math.sin(t * math.pi / 2)
        rows.append([(x * k, cy + (y - cy) * k, ZN - dz) for (x, y, z) in r0])
    base = p.grid(rows, lambda i, j: c0[j], closed=True, flip=True)
    p.fan([base + (len(rows) - 1) * n + j for j in range(n)], (0, cy, ZN - 0.06), WHITE, flip=True)
    return p
cowl = nose_cap()

# ================================================================ the wings
WG = S['wing']
TAN_D = math.tan(WG['dih'] * DEG)
def wchord(x):
    t = (x - WG['rootX']) / (WG['tipX'] - WG['rootX'])
    le = lerp(WG['rootLE'], WG['tipLE'], t); c = lerp(WG['rootC'], WG['tipC'], t)
    return le, c, WG['y'] + (x - WG['rootX']) * TAN_D, lerp(WG['t0'], WG['t1'], t)
HINGE = WG['hinge']; GAP = 0.012
def wing_section(x, f0, f1, n, nose=False, shrink=1.0, chord_scale=1.0, inset=0.0):
    # the airfoil (NACA 2415-ish, the physics' thickness) between chord fractions f0 and f1 at span x (x > 0): a closed
    # loop from the trailing (or f1) end along the upper surface to f0 and back along the lower; nose: f0 is a rounded
    # front (a control surface's leading edge, a half circle)
    le, c, yc, t = wchord(x)
    c *= chord_scale; le += inset
    fs = [f0 + (f1 - f0) * (0.5 - 0.5 * math.cos(math.pi * i / n)) for i in range(n + 1)] if f0 == 0 else [f0 + (f1 - f0) * i / n for i in range(n + 1)]
    up, lo = [], []
    for fr in fs:
        u, l = naca4(0.02, 0.4, t * shrink, fr)
        up.append((x, yc + u * c, le + fr * c)); lo.append((x, yc + l * c, le + fr * c))
    if nose:
        # a half circle from the lower to the upper surface at f0 (drawn forward)
        u0, l0 = naca4(0.02, 0.4, t * shrink, f0); mid = (u0 + l0) / 2 * c; rad = (u0 - l0) / 2 * c
        arc = []
        for i in range(1, 6):
            a = math.pi * i / 6
            arc.append((x, yc + mid - rad * math.cos(a), le + f0 * c - rad * math.sin(a) * 0.9))
        return list(reversed(up)) + arc[::-1][::-1][::-1] if False else list(reversed(up)) + list(reversed(arc)) + lo
    if f0 == 0:
        return list(reversed(up)) + lo[1:]          # (the leading edge shared)
    return list(reversed(up)) + lo                  # (a flat front: the spar's face, closed by the caller)

def loft_sections(secs, col_of, close0=True, close1=True, flip=False):
    p = Piece()
    base = p.grid(secs, col_of, closed=True, flip=flip)
    n = len(secs[0])
    if close0:
        c = Vector((0, 0, 0))
        for v in secs[0]: c += Vector(v)
        p.fan([base + j for j in range(n)], c / n, col_of(0, 0), flip=not flip)
    if close1:
        c = Vector((0, 0, 0))
        for v in secs[-1]: c += Vector(v)
        last = base + (len(secs) - 1) * n
        p.fan([last + j for j in range(n)], c / n, col_of(len(secs) - 2, 0), flip=flip)
    return p

def span_xs(x0, x1):
    n = max(1, int(math.ceil((x1 - x0) * Q['span'] * 2)))
    return [x0 + (x1 - x0) * i / n for i in range(n + 1)]

def mirror_x(p):
    q = Piece(); q.v = [Vector((-v.x, v.y, v.z)) for v in p.v]
    q.f = [tuple(reversed(f)) for f in p.f]; q.c = list(p.c)
    return q

def wing_right():
    # the fixed wing (spanwise panels, the moving surfaces cut out of the trailing edge) and the moving surfaces
    nF = Q['foil']
    body = Piece(); surf = {}
    fl0, fl1 = WG['flap']; al0, al1 = WG['ail']
    edges = sorted({WG['rootX'], fl0, fl1, al0, al1, WG['tipX'] - 0.08})
    cut = lambda x: (fl0 <= x <= fl1) or (al0 <= x <= al1)
    for a, b in zip(edges[:-1], edges[1:]):
        mid = (a + b) / 2
        xs = span_xs(a, b)
        if cut(mid):
            secs = [wing_section(x, 0.0, HINGE - GAP / 2, nF) for x in xs]
            body.add(loft_sections(secs, lambda i, j: WHITE, close0=True, close1=True, flip=True))
            # the moving surface: from just behind the hinge, its front rounded into the cove
            secs = [wing_section(x + (0.004 if i == 0 else -0.004 if i == len(xs) - 1 else 0), HINGE + GAP / 2, 1.0, max(4, nF // 3), nose=True) for i, x in enumerate(xs)]
            surf['flap' if mid < al0 else 'ail'] = loft_sections(secs, lambda i, j: WHITE, flip=True)
        else:
            secs = [wing_section(x, 0.0, 1.0, nF) for x in xs]
            body.add(loft_sections(secs, lambda i, j: WHITE, close0=(a == WG['rootX']), close1=False, flip=True))
    # the tip: the last panel rounds off (thinner and shorter towards the very tip), the nav light at its front
    xt = WG['tipX'] - 0.08
    secs = []
    nt = 5 if NEAR else 2
    for i in range(nt + 1):
        u = i / nt; x = xt + 0.088 * math.sin(u * math.pi / 2)
        k = math.cos(u * math.pi / 2) ** 0.7
        secs.append(wing_section(x, 0.0, 1.0, nF, shrink=max(k, 0.08), chord_scale=lerp(1, 0.82, u ** 2), inset=0.02 * u ** 2))
    tip = loft_sections(secs, lambda i, j: NAVY, close0=False, close1=True, flip=True)
    body.add(tip)
    return body, surf

wingR, surfR = wing_right()

# the wing walk (right wing root, black non-skid) and the fuel caps, the stall-warning vane, the pitot mast, the
# tie-down rings: small parts on the surfaces
def surface_y(x, f, upper=True):
    le, c, yc, t = wchord(abs(x))
    u, l = naca4(0.02, 0.4, t, f)
    return yc + (u if upper else l) * c, le + f * c

def patch_on_wing(x0, x1, f0, f1, col, upper=True, lift=0.003, nx=6, nf=8):
    p = Piece(); rows = []
    for i in range(nx + 1):
        x = lerp(x0, x1, i / nx); row = []
        for j in range(nf + 1):
            f = lerp(f0, f1, j / nf); y, z = surface_y(x, f, upper)
            row.append((x, y + (lift if upper else -lift), z))
        rows.append(row)
    p.grid(rows, lambda i, j: col, flip=upper)
    return p

SMALL = 8 if NEAR else 5                              # round small parts (struts, tubes, caps)
def cyl(p0, p1, r0, r1, n, col, cap0=True, cap1=True):
    n = n if NEAR else min(n, SMALL)
    p0, p1 = Vector(p0), Vector(p1); ax = (p1 - p0).normalized()
    t = ax.orthogonal().normalized(); b = ax.cross(t)
    p = Piece(); rows = []
    for (c, r) in ((p0, r0), (p1, r1)):
        rows.append([c + (t * math.cos(TAU * j / n) + b * math.sin(TAU * j / n)) * r for j in range(n)])
    base = p.grid(rows, lambda i, j: col, closed=True, flip=False)
    if cap0: p.fan([base + j for j in range(n)], p0, col)
    if cap1: p.fan([base + n + j for j in range(n)], p1, col, flip=True)
    return p

def box(c, size, col, rot=None):
    c = Vector(c); hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
    corners = [Vector((sx * hx, sy * hy, sz * hz)) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    if rot: corners = [rot @ v for v in corners]
    p = Piece(); idx = [p.vert(c + v) for v in corners]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        p.face([idx[k] for k in f], col)
    return p

def disc_on_wing(x, f, r, col, n=None, h=0.008):
    n = n or max(8, Q['round'] // 2)
    y, z = surface_y(x, f, True)
    return cyl((x, y - 0.004, z), (x, y + h, z), r, r * 0.92, n, col)

def fuel_cap(x, f):
    # the tank's cap, as the walk-around looks at it (B4): a rim standing proud of the skin, the centre a step
    # higher, the flip lever across it. From any distance the plain disc was enough, and far keeps it.
    if not NEAR: return disc_on_wing(x, f, 0.05, DARKMETAL)
    y, z = surface_y(x, f, True)
    p = Piece()
    p.add(cyl((x, y - 0.004, z), (x, y + 0.003, z), 0.052, 0.050, 18, DARKMETAL))
    p.add(cyl((x, y - 0.004, z), (x, y + 0.0065, z), 0.040, 0.040, 18, DARKMETAL))
    p.add(box((x, y + 0.0075, z), (0.011, 0.0025, 0.05), DARKMETAL))
    return p

def mast_blade(cx, ySkin, zc, col):
    # the pitot mast (B4): a blade tapered in thickness and chord from the skin down to the tube's line, where
    # before there was a plain box; three sections keep the taper smooth-shaded rather than stepped
    def ring(y, w, c):
        return [(cx - w / 2, y, zc - c / 2), (cx + w / 2, y, zc - c / 2), (cx + w / 2, y, zc + c / 2), (cx - w / 2, y, zc + c / 2)]
    rows = [ring(ySkin + 0.012, 0.024, 0.13), ring(ySkin - 0.055, 0.019, 0.108), ring(ySkin - 0.115, 0.014, 0.088)]
    p = Piece(); base = p.grid(rows, lambda i, j: col, closed=True)
    p.fan([base + j for j in range(4)], (cx, ySkin + 0.012, zc), col)
    p.fan([base + 8 + j for j in range(4)], (cx, ySkin - 0.115, zc), col, flip=True)
    return p

smallR = Piece()
smallR.add(patch_on_wing(0.62, 1.12, 0.06, 0.62, RUBBER, nx=6 if NEAR else 1, nf=8 if NEAR else 2))                                    # the wing walk
smallR.add(fuel_cap(3.5, (-0.55 - wchord(3.5)[0]) / wchord(3.5)[1]))     # the fuel cap (at the walk-around's ±3.5, where B4 found it drawn at 3.2)
smallL = Piece()
smallL.add(fuel_cap(3.5, (-0.55 - wchord(3.5)[0]) / wchord(3.5)[1]))
# the tanks' sump drains under the wings (the right one is the walk-around's sample point), in smallR so the
# mirror gives the left wing its own: a collar on the skin and the valve's short stub below it
dx_ = 3.5; dy_, dz_ = surface_y(dx_, (-0.55 - wchord(dx_)[0]) / wchord(dx_)[1], False)
smallR.add(cyl((dx_, dy_ + 0.004, dz_), (dx_, dy_ - 0.004, dz_), 0.011, 0.011, 8, DARKMETAL))
smallR.add(cyl((dx_, dy_ - 0.002, dz_), (dx_, dy_ - 0.02, dz_), 0.006, 0.005, 8, DARKMETAL))
# the pitot mast under the left wing (x −3.9), the tube forward of the leading edge
yb_, zb_ = surface_y(3.9, 0.32, False)
smallL.add(mast_blade(3.9, yb_, zb_, METAL) if NEAR else box((3.9, yb_ - 0.06, zb_), (0.012, 0.12, 0.10), METAL))
smallL.add(cyl((3.9, yb_ - 0.115, zb_ + 0.04), (3.9, yb_ - 0.115, zb_ - 0.42), 0.011, 0.011, 18 if NEAR else 10, METAL))
# the stall-warning vane on the left leading edge (x −3.3)
le_, c_, yc_, t_ = wchord(3.3)
smallL.add(box((3.3, yc_ - 0.01, le_ - 0.012), (0.03, 0.006, 0.03), METAL))
# tie-down rings under each wing
for side in (smallR, smallL):
    y, z = surface_y(3.6, 0.45, False)
    side.add(cyl((3.6, y + 0.01, z), (3.6, y - 0.05, z), 0.012, 0.012, 8, METAL, cap0=False))
wingR.add(smallR)
wingL = mirror_x(wingR)
# (the left wing's own small parts, mirrored into place)
wingL.add(mirror_x(smallL))

# ================================================================ the tail
HS, VS = S['hstab'], S['vstab']
def stabilator():
    # the all-moving tailplane (NACA 0009) on top of the fin (the T-tail), its leading edge swept back to the tips,
    # the tips rounded (one piece on its hinge)
    nF = Q['foil']
    def sect(x, sh=1.0, cs=1.0, back=0.0):
        le0 = lerp(HS['rootLE'], HS['tipLE'], min(x / HS['span'], 1)); c = HS['te'] - le0
        cc = c * cs; le = le0 + (c - cc) * 0.5 + back
        fs = cosspace(nF)
        up = [(x, HS['y'] + naca4(0, 0.4, HS['t'] * sh, f)[0] * cc, le + f * cc) for f in fs]
        lo = [(x, HS['y'] + naca4(0, 0.4, HS['t'] * sh, f)[1] * cc, le + f * cc) for f in fs]
        return list(reversed(up)) + lo[1:]
    span = HS['span']; xt = span - 0.09
    xs = span_xs(0.0, xt)
    secs = [sect(x) for x in xs]
    nt = 5 if NEAR else 2
    for i in range(1, nt + 1):
        u = i / nt; secs.append(sect(xt + 0.09 * math.sin(u * math.pi / 2), max(math.cos(u * math.pi / 2) ** 0.7, 0.08), lerp(1, 0.86, u * u)))
    right = loft_sections(secs, lambda i, j: WHITE, close0=False, close1=True, flip=True)
    p = Piece(); p.add(right); p.add(mirror_x(right))
    return p
stab = stabilator()

def fin_and_rudder():
    # the fin (NACA 0010) from inside the tail cone up to the stabilator (1.95 m), its leading edge swept; the rudder
    # behind the hinge
    nF = Q['foil']; t = VS['t']
    y0, y1 = VS['y0'], VS['y1']
    def le(y): return lerp(VS['rootLE'], VS['topLE'], (y - y0) / (y1 - y0))
    te = VS['te'] + 0.02
    def sect(y, f0, f1, nose=False, n=nF):
        a = le(y); c = te - a
        fs = cosspace(n, f0, f1) if f0 == 0 else [f0 + (f1 - f0) * i / n for i in range(n + 1)]
        right = [(naca4(0, 0.4, t, f)[0] * c, y, a + f * c) for f in fs]
        left = [(-q[0], q[1], q[2]) for q in right]
        if nose:
            u0 = naca4(0, 0.4, t, f0)[0] * c; arc = []
            for i in range(1, 6):
                ang = math.pi * i / 6
                arc.append((u0 * math.cos(ang), y, a + f0 * c - u0 * math.sin(ang) * 0.9))
            return list(reversed(right)) + arc + left
        return (list(reversed(right)) + left[1:]) if f0 == 0 else (list(reversed(right)) + left)
    ns = max(3, int(6 * Q['span'] * 2))
    ys = [lerp(y0, y1, i / ns) for i in range(ns + 1)]
    fh = lambda y: (VS['hinge'] - le(y)) / (te - le(y))
    fin = loft_sections([sect(y, 0.0, fh(y) - 0.006, n=nF) for y in ys], lambda i, j: NAVY if ys[i] > 1.05 else WHITE, close0=True, close1=True, flip=False)
    # the upper part navy; the rudder from above the tail cone to just under the stabilator
    rys = [y for y in ys if y >= 0.5]
    rys[-1] = y1 - 0.06
    rud = loft_sections([sect(y, fh(y) + 0.002, 1.0, nose=True, n=max(4, nF // 3)) for y in rys], lambda i, j: NAVY if rys[i] > 1.05 else WHITE, close0=True, close1=True, flip=False)
    # the fairing where the stabilator sits on the fin (a slim pod along the top, navy)
    n = max(8, Q['round'] // 2); m = 8 if NEAR else 3; rows = []
    z0, z1 = VS['topLE'] - 0.12, VS['te'] + 0.08
    for i in range(1, m):
        u = i / m; z = lerp(z0, z1, u); r = 0.075 * math.sin(math.pi * u) ** 0.45
        rows.append([(r * 0.8 * math.cos(TAU * j / n), y1 + r * math.sin(TAU * j / n), z) for j in range(n)])
    pod = Piece(); base = pod.grid(rows, lambda i, j: NAVY, closed=True, flip=False)
    pod.fan([base + j for j in range(n)], (0, y1, z0), NAVY, flip=True)
    pod.fan([base + (len(rows) - 1) * n + j for j in range(n)], (0, y1, z1), NAVY, flip=False)
    fin.add(pod)
    return fin, rud
fin, rud = fin_and_rudder()

def dorsal():
    # the dorsal fin: a low fillet along the tail cone's top into the fin's leading edge
    p = Piece(); rows = []
    nd = 8 if NEAR else 3
    for i in range(nd + 1):
        u = i / nd; z = lerp(2.35, 3.55, u)
        top = sec(z)['yt']; h = 0.11 * u ** 1.6 + 0.005
        w = 0.035 * (1 - u * 0.3)
        rows.append([(w, top - 0.03, z), (w * 0.35, top + h * 0.8, z), (0, top + h, z), (-w * 0.35, top + h * 0.8, z), (-w, top - 0.03, z)])
    p.grid(rows, lambda i, j: WHITE, flip=False)
    return p
fin.add(dorsal())

# ================================================================ the gear (retractable: drawn down, as at rest)
# Each leg hangs from acmesh's pivot (the mains swing in towards the fuselage about z, the nose leg aft about x), so the
# game folds it into the wing or the nose the way the physics' gear moves.
GR = S['gear']; WR = GR['wheelR']; HZ = S['hinges']
def wheel(c, width=0.15):
    # a tyre (a rounded torus section) and the hub; near carries more of both than the general roundness (B4:
    # the twin's wheels stand uncovered at the walk-around), far keeps the counts it had
    c = Vector(c); n = Q['round'] + (4 if NEAR else 0); m = max(6, n // 3) if NEAR else 3
    p = Piece(); rows = []
    for i in range(m + 1):
        a = math.pi * i / m                       # round the tyre's cross-section, from the inner side to the outer
        rr = WR - 0.055 + 0.055 * math.sin(a); xx = -width / 2 * math.cos(a)
        rows.append([c + Vector((xx, rr * math.cos(TAU * j / n), rr * math.sin(TAU * j / n))) for j in range(n)])
    p.grid(rows, lambda i, j: RUBBER, closed=True, flip=False)
    for sd in (-1, 1) if NEAR else ():
        p.add(cyl(c + Vector((sd * width * 0.32, 0, 0)), c + Vector((sd * width * 0.42, 0, 0)), WR - 0.07, WR - 0.12, n, METAL))
    return p

def main_gear(sd):
    # the oleo strut inboard of the wheel (white cylinder, chrome piston), the axle out to the wheel, the torque links,
    # the drag brace up to the wing, and the leg's door on the strut's inner side
    ax = Vector((sd * GR['mains'][0][0], GR['mains'][0][1], GR['mains'][0][2]))
    pv = Vector(HZ['gearR' if sd > 0 else 'gearL']['pivot'])
    xs = ax.x - sd * 0.11; rn = max(8, Q['round'] // 2) + (2 if NEAR else 0)     # the leg's roundness (B4)
    p = Piece()
    p.add(wheel(ax, width=0.16))
    p.add(cyl((xs, pv.y + 0.02, pv.z), (xs, ax.y + 0.30, ax.z), 0.048, 0.048, rn, WHITE))
    p.add(cyl((xs, ax.y + 0.31, ax.z), (xs, ax.y + 0.02, ax.z), 0.032, 0.032, rn, METAL))
    p.add(cyl((xs, ax.y, ax.z), (ax.x, ax.y, ax.z), 0.03, 0.03, rn, DARKMETAL))
    p.add(box((xs, ax.y + 0.22, ax.z - 0.07), (0.022, 0.14, 0.03), DARKMETAL))
    p.add(cyl((xs, pv.y - 0.28, pv.z), (xs, pv.y - 0.02, pv.z + 0.34), 0.016, 0.016, 8, METAL))
    p.add(box((xs - sd * 0.06, (pv.y + ax.y + 0.3) / 2 - 0.02, ax.z), (0.012, (pv.y - ax.y - 0.3) * 0.82, 0.34), WHITE))
    return p

def nose_gear():
    # the strut from the nose's well, the chrome piston, a fork round the wheel, the torque link and the taxi light
    ax = Vector(GR['nose']); pv = Vector(HZ['gearN']['pivot']); rn = max(8, Q['round'] // 2) + (2 if NEAR else 0)     # the leg's roundness (B4)
    p = Piece()
    p.add(wheel(ax, width=0.13))
    p.add(cyl((0, pv.y + 0.02, pv.z), (0, ax.y + 0.36, ax.z - 0.01), 0.044, 0.044, rn, WHITE))
    p.add(cyl((0, ax.y + 0.37, ax.z - 0.01), (0, ax.y + 0.17, ax.z), 0.03, 0.03, rn, METAL))
    p.add(box((0, ax.y + 0.17, ax.z), (0.22, 0.03, 0.06), DARKMETAL))                     # the fork's crown
    for s_ in (-1, 1): p.add(box((s_ * 0.1, ax.y + 0.08, ax.z), (0.02, 0.2, 0.05), DARKMETAL))
    p.add(box((0, ax.y + 0.30, ax.z - 0.06), (0.02, 0.10, 0.03), DARKMETAL))              # the torque link
    p.add(box((0, pv.y - 0.20, pv.z - 0.05), (0.14, 0.03, 0.05), DARKMETAL))              # the steering arms
    p.add(cyl((0, pv.y - 0.30, pv.z - 0.05), (0, pv.y - 0.30, pv.z - 0.10), 0.04, 0.045, 12, LENS))   # the taxi light
    return p

gearR = main_gear(1); gearL = main_gear(-1); gearN = nose_gear()

# ================================================================ the nacelles (the engines on the wings)
EN = S['engines'][0]; PR = EN['r']
SPIN_R = 0.15
NAC = [  # z      half-width  top     bottom
    (-1.98, 0.19, -0.15, -0.55), (-1.85, 0.25, -0.08, -0.62), (-1.50, 0.29, -0.03, -0.67), (-1.00, 0.30, -0.02, -0.69),
    (-0.50, 0.29, -0.05, -0.69), (0.00, 0.26, -0.12, -0.67), (0.60, 0.20, -0.21, -0.60), (1.10, 0.12, -0.27, -0.50),
    (1.40, 0.04, -0.32, -0.40)]
NACI = [mono([(k[0], k[i]) for k in NAC]) for i in (1, 2, 3)]
def nacelle(xc):
    # a cowled engine and its nacelle along the wing (a superellipse in section, the wing passing through it): the
    # cowling's front rolling in to the spinner's back plate with two air inlets beside it, a joint behind the cowling,
    # the exhaust under its outer side
    hub = Vector((xc, EN['y'], EN['z'])); n = Q['round'] + 4 if NEAR else 8
    def nring(z):
        w, t, b = (f(z) for f in NACI); yc, h = (t + b) / 2, (t - b) / 2
        pts = []
        for j in range(n):
            th = -math.pi / 2 + TAU * j / n; c, s_ = math.cos(th), math.sin(th)
            pts.append((xc + w * math.copysign(abs(c) ** (2 / 2.6), c), yc + h * math.copysign(abs(s_) ** (2 / 2.6), s_), z))
        return pts
    zs = stations(NAC[0][0], NAC[-1][0], Q['fz'], fixed=(-1.85, -1.5, -0.95, -0.93, 0.0, 0.6) if NEAR else ())
    p = Piece()
    rows = [nring(z) for z in zs]
    seam = [i for i in range(len(zs) - 1) if NEAR and abs(zs[i] + 0.95) < 1e-6]
    base = p.grid(rows, lambda i, j: SEAM if i in seam else WHITE, closed=True, flip=False)
    p.fan([base + (len(rows) - 1) * n + j for j in range(n)], (xc, sum(v[1] for v in rows[-1]) / n, zs[-1] + 0.02), WHITE)
    # the front: the lip, the face (dark inlets left and right of the spinner), to the spinner's back plate
    r0 = rows[0]; front = [r0]
    for t, dz in (((0.3, -0.025), (0.6, -0.045), (1.0, -0.05)) if NEAR else ((0.6, -0.04), (1.0, -0.05))):
        row = []
        for (x, y, z) in r0:
            v = Vector((x - xc, y - hub.y)); L = v.length
            rr = lerp(L, SPIN_R + 0.006, t) if t < 1 else SPIN_R + 0.004
            k = rr / max(L, 1e-6); row.append((xc + v.x * k, hub.y + v.y * k, NAC[0][0] + dz))
        front.append(row)
    def face_col(i, j):
        th = -math.pi / 2 + TAU * (j + 0.5) / n
        return INLET if i == 1 and abs(math.sin(th)) < 0.45 else WHITE
    p.grid(front, face_col, closed=True, flip=True)
    # the exhaust under the outer side, the cowl flap's lip behind the cowling
    so = 1 if xc > 0 else -1
    p.add(cyl((xc + so * 0.2, -0.60, -0.70), (xc + so * 0.23, -0.66, -0.42), 0.035, 0.032, max(8, Q['round'] // 2), DARKMETAL, cap1=False))
    if NEAR:
        for sd in (-1, 1): p.add(box((xc + sd * 0.1, -0.66, -0.96), (0.14, 0.012, 0.05), SEAM))
    return p
nacR = nacelle(EN['x']); nacL = nacelle(-EN['x'])

# ================================================================ the propellers and the spinners
def propeller(hub):
    p = Piece(); nF = max(6, Q['foil'] // 2) if NEAR else 3
    nr = 12 if NEAR else 5
    rs = [0.13 + (PR - 0.13) * i / nr for i in range(nr + 1)]
    for side in (1, -1):
        secs = []
        for k, r in enumerate(rs):
            u = (r - 0.13) / (PR - 0.13)
            chord = 0.11 + 0.08 * math.sin(math.pi * min(u / 0.8, 1) * 0.75) - (0.07 * ((u - 0.85) / 0.15) ** 2 if u > 0.85 else 0)
            chord = max(chord, 0.04)
            beta = lerp(38, 13, u) * DEG                         # the twist
            th = lerp(0.16, 0.06, u)
            sec_ = []
            fs = cosspace(nF)
            for f in fs:                                         # front face (−z, cambered) then the back
                sec_.append((f, naca4(0.04, 0.35, th, f)[0]))
            for f in reversed(fs[1:-1]):
                sec_.append((f, naca4(0.04, 0.35, th, f)[1]))
            pts = []
            for (f, h) in sec_:
                cx = (0.35 - f) * chord; cz = -h * chord          # chordwise: the leading edge at +x (the way it turns)
                x = cx * math.cos(beta) - cz * math.sin(beta) * -1
                zz = -cx * math.sin(beta) + cz * math.cos(beta)
                pts.append((x * side, side * r, hub.z + zz))
            secs.append([Vector((hub.x + q[0], hub.y + q[1], q[2])) for q in pts])
        tipcol = lambda i, j: TIP if rs[i] > PR - 0.09 else BLADE
        p.add(loft_sections(secs, tipcol, close0=True, close1=True, flip=False))   # (the other blade: turned 180°, not mirrored)
    # the spinner: a navy cone from the back plate to its point
    n = Q['round']; m = max(6, Q['round'] // 3) if NEAR else 3; rows = []
    for i in range(m + 1):
        u = i / m; z = hub.z + 0.03 - u * 0.36
        rr = SPIN_R * (1 - u ** 1.9) ** 0.62
        rows.append([(hub.x + rr * math.cos(TAU * j / n), hub.y + rr * math.sin(TAU * j / n), z) for j in range(n)])
    rows[-1] = [(hub.x, hub.y, hub.z + 0.03 - 0.36)] * n
    p.grid(rows, lambda i, j: NAVY, closed=True, flip=True)
    return p
# the left engine's (acmesh's prop 0, at −x) turns as the Archer's; the right one the other way: its blades mirrored
prop0 = propeller(Vector(HZ['prop.0']['pivot']))
prop1 = mirror_x(prop0)

# ================================================================ assemble the skin, then the decals on it
skin_cabin = Piece().add(fus_front).add(cowl)
skin_rest = Piece().add(fus_rear)
ob_cabin = to_object('cabin', skin_cabin)
ob_rest = to_object('fuse-rear', skin_rest)

# a BVH of the fuselage skin (with smooth normals) for projecting things onto it
def skin_bvh(objs):
    bm = bmesh.new()
    for ob in objs:
        tmp = bmesh.new(); tmp.from_mesh(ob.data); tmp.transform(ob.matrix_world)
        me = bpy.data.meshes.new('t'); tmp.to_mesh(me); tmp.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.verts.ensure_lookup_table(); bm.faces.ensure_lookup_table(); bm.normal_update()
    return bm, BVHTree.FromBMesh(bm)
SKIN_BM, SKIN = skin_bvh([ob_cabin, ob_rest])

def smooth_normal(loc, fi):
    f = SKIN_BM.faces[fi]; a, b, c = [v.co for v in f.verts]
    from mathutils.geometry import barycentric_transform
    # barycentric weights
    v0, v1, v2 = b - a, c - a, loc - a
    d00, d01, d11, d20, d21 = v0.dot(v0), v0.dot(v1), v1.dot(v1), v2.dot(v0), v2.dot(v1)
    den = d00 * d11 - d01 * d01 or 1e-12
    w1 = (d11 * d20 - d01 * d21) / den; w2 = (d00 * d21 - d01 * d20) / den; w0 = 1 - w1 - w2
    n = f.verts[0].normal * w0 + f.verts[1].normal * w1 + f.verts[2].normal * w2
    return n.normalized() if n.length > 1e-9 else f.normal

class Frame:
    # a projection: plane coordinates (u, v) → a ray from outside along `d` onto the skin
    def __init__(self, o, u, v, d): self.o, self.u, self.v, self.d = Vector(o), Vector(u), Vector(v), Vector(d).normalized()
    def hit(self, a, b):
        start = self.o + self.u * a + self.v * b - self.d * 2.0
        loc, nrm, fi, dist = SKIN.ray_cast(start, self.d, 4.0)
        if loc is None: return None
        n = smooth_normal(loc, fi)
        if n.dot(self.d) > 0: n = -n
        return loc, n
    def coords(self, p):
        q = Vector(p) - self.o; return (q.dot(self.u), q.dot(self.v))

def capsule(a, b, r, n=6):
    # a stroke from a to b with round ends, as a polygon (2D)
    a, b = Vector(a), Vector(b); d = (b - a); L = d.length
    if L < 1e-9: d = Vector((1, 0)); L = 1e-9
    d /= L; nrm = Vector((-d.y, d.x)); pts = []
    for i in range(n + 1):
        t = math.pi * i / n; pts.append(b + (nrm * math.cos(t) - d * -math.sin(t)) * r * -1 if False else b + nrm * (r * math.cos(t)) + d * (r * math.sin(t)))
    for i in range(n + 1):
        t = math.pi * i / n; pts.append(a - nrm * (r * math.cos(t)) - d * (r * math.sin(t)))
    return pts

def rounded_poly(pts, r, n=4):
    pts = [Vector(p) for p in pts]; out = []
    for i in range(len(pts)):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
        a, b = (p0 - p1), (p2 - p1)
        rr = min(r, a.length * 0.45, b.length * 0.45)
        a.normalize(); b.normalize()
        s, e = p1 + a * rr, p1 + b * rr
        for k in range(n + 1):
            t = k / n; q = s.lerp(p1, t).lerp(p1.lerp(e, t), t)      # a quadratic corner
            out.append(q)
    return out

def decal(frame, polys, col, off=None, res=None, interior=True):
    # polygons (2D, in the frame) united, triangulated with points inside, each point projected onto the skin
    off = Q['off'] if off is None else off; res = res or Q['decal']
    verts, faces = [], []
    for poly in polys:
        idx = []
        for q in poly: verts.append(Vector((q[0], q[1]))); idx.append(len(verts) - 1)
        faces.append(idx)
    if interior:
        xs = [v.x for v in verts]; ys = [v.y for v in verts]
        nx, ny = int((max(xs) - min(xs)) / res), int((max(ys) - min(ys)) / res)
        for i in range(1, nx):
            for j in range(1, ny):
                verts.append(Vector((min(xs) + i * res + (j % 2) * res * 0.5, min(ys) + j * res)))
    out = delaunay_2d_cdt(verts, [], faces, 1, 1e-7)
    V2, F2 = out[0], out[2]
    p = Piece(); m = {}
    for i, q in enumerate(V2):
        h = frame.hit(q.x, q.y)
        if h: m[i] = p.vert(h[0] + h[1] * off)
    for f in F2:
        if all(i in m for i in f):
            ids = [m[i] for i in f]
            a, b, c = [p.v[i] for i in ids[:3]]
            n = (b - a).cross(c - a)
            h = frame.hit(*V2[f[0]])
            if h and n.dot(h[1]) < 0: ids = list(reversed(ids))
            p.face(ids, col)
    return p

def ribbon(frame, line, width, col, off=None, closed=False):
    # a thin strip along a polyline (2D in the frame) lying on the skin
    off = (Q['off'] if off is None else off) * 0.8
    pts = [frame.hit(*q) for q in line]
    pts = [h for h in pts if h]
    p = Piece(); rows = [[], []]
    n = len(pts)
    for i, (loc, nrm) in enumerate(pts):
        a = pts[(i - 1) % n][0] if (closed or i > 0) else loc
        b = pts[(i + 1) % n][0] if (closed or i < n - 1) else loc
        t = (b - a).normalized(); s = nrm.cross(t).normalized() * (width / 2)
        rows[0].append(loc + nrm * off - s); rows[1].append(loc + nrm * off + s)
    if closed: rows = [r + [r[0]] for r in rows]
    base = len(p.v)
    for r in rows:
        for v in r: p.v.append(v)
    m = len(rows[0])
    for j in range(m - 1):
        a, b, c, d = base + j, base + j + 1, base + m + j + 1, base + m + j
        q = [a, b, c, d]
        nn = (p.v[b] - p.v[a]).cross(p.v[d] - p.v[a])
        if nn.dot(pts[min(j, n - 1)][1]) < 0: q = list(reversed(q))
        p.face(q, col)
    return p

# ---- the windshield and the side windows (from the cockpit's openings: cockpit.js W1–W3, the windshield WS; the
# Archer's, moved by DZ, DY with the cockpit)
WS = dict(z0=-1.30 + DZ, y0=0.425 + DY, z1=-0.84 + DZ, y1=0.815 + DY, bow=0.12)
SILL, WTOP, HW, HWT = 0.38 + DY, 0.75 + DY, 0.56, 0.49
KX = -(HW - HWT) / (WTOP - SILL)
def bandX(y): return HW + KX * (y - SILL)
def wsZ(x, y): return WS['z0'] + (WS['z1'] - WS['z0']) * (y - WS['y0']) / (WS['y1'] - WS['y0']) + WS['bow'] * (x / 0.5) ** 2
glass = Piece()
vslope = Vector((0, WS['y1'] - WS['y0'], WS['z1'] - WS['z0'])).normalized()
nws = Vector((0, -vslope.z, vslope.y))                    # outward: up and forward
if nws.z > 0: nws = -nws
F_WS = Frame((0, 0.62 + DY, -1.07 + DZ), (1, 0, 0), vslope, -nws)
outline = []
ylo, yhi = WS['y0'] + 0.015, WS['y1'] + 0.035
NE, NS = (12, 9) if NEAR else (5, 3)
for i in range(NE + 1):                                   # the base (right to left), up the left post, the top, down the right
    x = 0.47 - i / NE * 0.94; outline.append((x, ylo, wsZ(x, ylo) - 0.035))
for i in range(1, NS):
    y = ylo + (yhi - ylo) * i / NS; x = -(bandX(y) - 0.03) * (1 - 0.16 * (i / NS) ** 2); outline.append((x, y, wsZ(x, y) - 0.03))
for i in range(NE + 1):
    x = -0.40 + i / NE * 0.80; outline.append((x, yhi, wsZ(x, yhi) - 0.025))
for i in range(NS - 1, 0, -1):
    y = ylo + (yhi - ylo) * i / NS; x = (bandX(y) - 0.03) * (1 - 0.16 * (i / NS) ** 2); outline.append((x, y, wsZ(x, y) - 0.03))
ws2 = rounded_poly([F_WS.coords(p) for p in outline], 0.06, 4 if NEAR else 1)
glass.add(decal(F_WS, [ws2], GLASS, res=0.045 if NEAR else 0.085, interior=NEAR))
seams = Piece()
if NEAR: seams.add(ribbon(F_WS, ws2 + [ws2[0]], 0.012, RUBBER, off=Q['off'] * 1.25))
W1 = [(z + DZ, y + DY) for z, y in [(-1.13, 0.405), (-0.26, 0.405), (-0.26, 0.732), (-0.755, 0.732)]]
W2 = [(z + DZ, y + DY) for z, y in [(-0.09, 0.405), (0.60, 0.405), (0.52, 0.715), (-0.09, 0.722)]]
W3 = [(z + DZ, y + DY) for z, y in [(0.80, 0.425), (1.20, 0.47), (1.17, 0.66), (0.80, 0.69)]]
def grow(poly, d):
    c = Vector((sum(p[0] for p in poly) / len(poly), sum(p[1] for p in poly) / len(poly)))
    return [tuple(c + (Vector(p) - c) * (1 + d / max((Vector(p) - c).length, 1e-6))) for p in poly]
for sd in (1, -1):
    fr = Frame((0, 0, 0), (0, 0, 1), (0, 1, 0), (-sd, 0, 0))
    for W, r in ((W1, 0.05), (W2, 0.06), (W3, 0.04)):
        poly = rounded_poly(grow(W, 0.012), r, 4 if NEAR else 1)
        glass.add(decal(fr, [poly], GLASS, res=0.06 if NEAR else 0.12, interior=NEAR))
        if NEAR: seams.add(ribbon(fr, poly + [poly[0]], 0.01, RUBBER, off=Q['off'] * 1.25))

# ---- the panel joints: the nose's (its baggage door on the left, the cone's joint), the cabin door and the baggage
# door on the right
inlets = Piece()
if NEAR:
    for sd in (1, -1):
        fr = Frame((0, 0, 0), (0, 0, 1), (0, 1, 0), (-sd, 0, 0))
        seams.add(ribbon(fr, [(-2.95, y) for y in [lerp(-0.28, 0.15, i / 8) for i in range(9)]], 0.006, SEAM))
        if sd == 1:
            door = rounded_poly([(z + DZ, y + DY) for z, y in [(-1.10, -0.30), (-0.16, -0.30), (-0.16, 0.80), (-0.70, 0.80), (-1.12, 0.47)]], 0.05, 3)
            seams.add(ribbon(fr, door + [door[0]], 0.007, SEAM))
            bag = rounded_poly([(1.16, -0.22), (1.56, -0.20), (1.54, 0.30), (1.17, 0.33)], 0.035, 3)
            seams.add(ribbon(fr, bag + [bag[0]], 0.006, SEAM))
        else:
            nb = rounded_poly([(-2.70, -0.20), (-1.95, -0.22), (-1.95, 0.22), (-2.62, 0.16)], 0.04, 3)
            seams.add(ribbon(fr, nb + [nb[0]], 0.007, SEAM))
    F_TOP = Frame((0, 0, 0), (1, 0, 0), (0, 0, 1), (0, -1, 0))
    seams.add(ribbon(F_TOP, [(x, -2.95) for x in [lerp(-0.3, 0.3, i / 8) for i in range(9)]], 0.006, SEAM))
# the door handle, the antennas, the step (the step goes with the body: it stands off the side); the landing and taxi
# lights in the nose's point are the game's (aircraft/exterior.js lightSpots)
extras_cabin = Piece()
extras_cabin.add(box((0.605, 0.28 + DY, -0.38 + DZ), (0.02, 0.025, 0.12), METAL))
for z, h in ((-0.35, 0.24), (0.35, 0.20)):                 # the comm antennas on the roof (raked aft)
    top = sec(z)['yt']
    extras_cabin.add(box((0, top + h / 2 - 0.01, z + h * 0.18), (0.012, h, 0.07), RUBBER, rot=Matrix.Rotation(-0.35, 3, 'X')))
extras_cabin.add(box((0, sec(0.0)['yb'] - 0.03, 0.0), (0.012, 0.08, 0.05), RUBBER))   # (the transponder's, under the floor)
extras_body = Piece()
extras_body.add(cyl((0.52, -0.49, 0.72), (0.66, -0.70, 0.74), 0.016, 0.016, 8, METAL))
extras_body.add(box((0.70, -0.705, 0.74), (0.13, 0.012, 0.09), METAL))
extras_body.add(box((0, sec(3.6)['yt'] + 0.01, 3.6), (0.03, 0.03, 0.12), RUBBER))     # the ELT's
# the tail tie-down under the tail cone
extras_body.add(cyl((0, sec(4.5)['yb'] + 0.02, 4.5), (0, sec(4.5)['yb'] - 0.06, 4.5), 0.012, 0.012, 8, METAL, cap0=False))

# ---- the registration on the aft fuselage, both sides: block letters (a stroke font made here)
GLYPH = {   # strokes on a 0..1 × 0..1 cell (x right, y up)
    'N': [[(0, 0), (0, 1), (1, 0), (1, 1)]],
    'S': [[(1, 0.9), (0.75, 1), (0.25, 1), (0, 0.85), (0, 0.62), (0.25, 0.5), (0.75, 0.5), (1, 0.38), (1, 0.15), (0.75, 0), (0.25, 0), (0, 0.1)]],
    'Y': [[(0, 1), (0.5, 0.5), (1, 1)], [(0.5, 0.5), (0.5, 0)]],
    '0': [[(0.25, 0), (0.75, 0), (1, 0.2), (1, 0.8), (0.75, 1), (0.25, 1), (0, 0.8), (0, 0.2), (0.25, 0)]],
    '1': [[(0.2, 0.8), (0.55, 1), (0.55, 0)], [(0.2, 0), (0.9, 0)]],
    '2': [[(0, 0.8), (0.25, 1), (0.75, 1), (1, 0.8), (1, 0.6), (0, 0), (1, 0)]],
    '3': [[(0, 0.88), (0.25, 1), (0.75, 1), (1, 0.82), (1, 0.62), (0.7, 0.5), (0.35, 0.5)], [(0.7, 0.5), (1, 0.38), (1, 0.18), (0.75, 0), (0.25, 0), (0, 0.12)]],
    '4': [[(0.8, 0), (0.8, 1), (0, 0.32), (1, 0.32)]],
    '5': [[(1, 1), (0.05, 1), (0, 0.55), (0.7, 0.6), (1, 0.42), (1, 0.18), (0.75, 0), (0.25, 0), (0, 0.12)]],
    '6': [[(0.9, 0.95), (0.6, 1), (0.25, 0.92), (0, 0.6), (0, 0.2), (0.25, 0), (0.75, 0), (1, 0.2), (1, 0.42), (0.75, 0.6), (0.25, 0.6), (0, 0.45)]],
    '7': [[(0, 1), (1, 1), (0.35, 0)]],
    '8': [[(0.5 + 0.40 * math.sin(TAU * i / 14), 0.77 + 0.23 * math.cos(TAU * i / 14)) for i in range(15)], [(0.5 + 0.48 * math.sin(TAU * i / 16), 0.27 + 0.27 * math.cos(TAU * i / 16)) for i in range(17)]],
    '9': [[(0.1, 0.05), (0.4, 0), (0.75, 0.08), (1, 0.4), (1, 0.8), (0.75, 1), (0.25, 1), (0, 0.8), (0, 0.58), (0.25, 0.4), (0.75, 0.4), (1, 0.55)]],
}
def registration(reg, sd):
    # each side reads left to right as seen from that side: from the tail forward on the right, from the nose aft on
    # the left; the base line rises with the blue band's lower edge
    fr = Frame((0, 0, 0), (0, 0, 1), (0, 1, 0), (-sd, 0, 0))
    H, Wc, gap, stroke = 0.21, 0.125, 0.05, 0.025
    total = len(reg) * Wc + (len(reg) - 1) * gap
    z0 = 2.25
    polys, out = [], Piece()
    for k, ch in enumerate(reg):
        for line in GLYPH[ch]:
            pts = []
            for (gx, gy) in line:
                r = k * (Wc + gap) + gx * Wc
                z = z0 + (total - r if sd > 0 else r)
                pts.append((z, STRIPES[0](z) - 0.045 - H + gy * H))
            caps = [capsule(a, b, stroke / 2, 2) for a, b in zip(pts[:-1], pts[1:])]
            # a closed loop (the 8's): each stroke on its own (united, the triangulation would fill the loop's inside)
            if math.dist(line[0], line[-1]) < 1e-6:
                for c in caps: out.add(decal(fr, [c], NAVY, res=0.04, interior=False))
            else: polys += caps
    return out.add(decal(fr, polys, NAVY, res=0.04))

# ================================================================ the objects
def obj(name, piece): return to_object(name, piece)
ob_cabin_all = to_object('cabin', Piece().add(skin_cabin).add(glass).add(seams).add(inlets).add(extras_cabin), COL)
bpy.data.objects.remove(ob_cabin); bpy.data.objects.remove(ob_rest)
ob_cabin_all.name = 'cabin'; ob_cabin_all.data.name = 'cabin'
body = Piece().add(skin_rest).add(wingR).add(wingL).add(nacR).add(nacL).add(fin).add(extras_body)
objs = {'cabin': ob_cabin_all, 'body': to_object('body', body, COL)}
hz = S['hinges']
surf_list = [('ailR', surfR['ail'], False), ('ailL', mirror_x(surfR['ail']), False), ('flapR', surfR['flap'], False), ('flapL', mirror_x(surfR['flap']), False),
             ('stab', stab, False), ('rud', rud, False), ('prop.0', prop0, False), ('prop.1', prop1, False), ('gearN', gearN, False), ('gearL', gearL, False), ('gearR', gearR, False)]
for name, piece, _ in surf_list:
    objs[name] = to_object(name, piece, COL)
for reg in S['tails'] if NEAR else []:            # (far: none — the letters would be a few pixels high there)
    r = Piece().add(registration(reg, 1)).add(registration(reg, -1))
    objs['reg.' + reg] = to_object('reg.' + reg, r, COL)
for k, ob in objs.items(): ob.name = k; ob.data.name = k

# ---------------------------------------------------------------- triangulate; the ambient occlusion (rays) → alpha
def triangulate(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(ob.data); bm.free(); ob.data.update()
for ob in objs.values(): triangulate(ob)
occl = bmesh.new()
for k, ob in objs.items():
    if k.startswith('reg.') and k != 'reg.' + S['tails'][0]: continue          # (one set of letters is enough)
    me = ob.data; tmp = bmesh.new(); tmp.from_mesh(me)
    m2 = bpy.data.meshes.new('o'); tmp.to_mesh(m2); tmp.free(); occl.from_mesh(m2); bpy.data.meshes.remove(m2)
# the ground under the wheels (the occlusion under the aircraft parked)
gy = GR['nose'][1] - WR
for (a, b, c, d) in [((-8, gy, -6), (8, gy, -6), (8, gy, 7), (-8, gy, 7))]:
    vs = [occl.verts.new(v) for v in (a, b, c, d)]; occl.faces.new(vs)
OBVH = BVHTree.FromBMesh(occl)
DIRS = []
NDIR = 40 if NEAR else 24
for i in range(NDIR):                                     # a Fibonacci sphere
    y = 1 - 2 * (i + 0.5) / NDIR; r = math.sqrt(1 - y * y); a = i * math.pi * (3 - math.sqrt(5))
    DIRS.append(Vector((math.cos(a) * r, y, math.sin(a) * r)))
def bake_ao(ob, reach=0.9, strength=0.85, floor=0.35):
    me = ob.data; me.calc_normals_split() if hasattr(me, 'calc_normals_split') else None
    vals = []
    for v in me.vertices:
        n = v.normal; hit = tot = 0.0
        for d in DIRS:
            c = d.dot(n)
            if c <= 0.05: continue
            tot += c
            loc, _, _, dist = OBVH.ray_cast(v.co + n * 0.004, d, reach)
            if loc is not None: hit += c * (1 - dist / reach) ** 0.5
        vals.append(clamp(1 - strength * (hit / tot if tot else 0), floor, 1))
    col = me.color_attributes.get('COLOR_0')
    for l in me.loops:
        c = col.data[l.index].color; col.data[l.index].color = (c[0], c[1], c[2], vals[l.vertex_index])
    me.color_attributes.active_color = col
for k, ob in objs.items():
    bake_ao(ob, reach=0.25 if k.startswith('prop') or k.startswith('reg.') else 0.9)

print('triangles', LOD, {k: tris(ob) for k, ob in objs.items() if not k.startswith('reg.') or k == 'reg.N452SY'}, 'total', sum(tris(ob) for k, ob in objs.items() if not k.startswith('reg.')))

# ---------------------------------------------------------------- a preview (Workbench) and the glTF
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    sc = bpy.context.scene
    # Cycles on the CPU (no display here): the paint from COLOR_0 times its occlusion (alpha), a sun and the sky
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 1200, 760
    mat = bpy.data.materials.new('paint'); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'COLOR_0'
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
    nt.links.new(ca.outputs['Color'], mul.inputs[6]); nt.links.new(ca.outputs['Alpha'], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.3
    for o in objs.values():
        o.data.materials.clear(); o.data.materials.append(mat)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); bpy.context.scene.collection.objects.link(sun)
    sun.data.energy = 3.5; sun.rotation_euler = (math.radians(-50), math.radians(25), 0)
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.65, 0.8, 1); world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    gp = bpy.data.objects.new('ground', bpy.data.meshes.new('ground')); bpy.context.scene.collection.objects.link(gp)
    gb = bmesh.new(); vs = [gb.verts.new((x, GR['nose'][1] - WR - 0.001, z)) for x, z in ((-30, -30), (30, -30), (30, 30), (-30, 30))]; gb.faces.new(vs); gb.to_mesh(gp.data); gb.free()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.scene.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 40
    for o in objs.values():
        if o.name.startswith('reg.') and o.name != 'reg.N452SY': o.hide_render = True
    # (the frame is y-up; Blender's camera looks down its −z, with +y up in the picture)
    shots = {'34front': (Vector((6.5, 2.6, -8.5)), Vector((0, 0, 0))), 'side': (Vector((11, 0.3, 0.2)), Vector((0, 0, 0.3))),
             'rear': (Vector((-5, 3.5, 9)), Vector((0, 0.2, 0.5))), 'nose': (Vector((1.8, 0.4, -6.0)), Vector((0, 0, -2.5))),
             'top': (Vector((0.01, 12, 0.3)), Vector((0, 0, 0.3))), 'ws': (Vector((1.3, 1.5, -2.6)), Vector((0.2, 0.55, -1.0))), 'gear': (Vector((3.2, -0.6, -1.6)), Vector((1.6, -1.0, 0.2))), 'tail': (Vector((3.2, 1.2, 6.2)), Vector((0, 0.5, 3.0)))}
    for name, (eye, at) in shots.items():
        d = (at - eye).normalized()
        up = Vector((0, 1, 0))
        rx = d.cross(up).normalized(); uy = rx.cross(d)
        M = Matrix((rx, uy, -d)).transposed().to_4x4(); M.translation = eye
        cam.matrix_world = M
        sc.render.filepath = os.path.join(PREVIEW, f'{LOD}-{name}.png')
        bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='DESELECT')
for o in objs.values(): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=False, export_apply=True,
    export_materials='NONE', export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_skins=False, export_morph=False, export_extras=False, export_tangents=False)
print('wrote', OUT, os.path.getsize(OUT))
