# CADET — tools/aircraft/build_737.py : a 737-type twin-jet airliner in SHOYO AIRWAYS' colours (M8: the epilogue at
# Haneda), made in Blender the way build_archer.py makes the Archer (run in the background, no window):
#   blender -b --factory-startup -P tools/aircraft/build_737.py -- assets/model/jet737.glb [preview_dir|-]
# Everything is made by this script (no other files, no font: see assets/CREDITS.md). The shape is a generic
# narrow-body of the 737's size (some 39.5 m long, 35.8 m across the winglets, the fuselage 3.76 m wide): a lofted
# fuselage with the airliner's nose and upswept tail cone, low swept wings with a blended winglet, two turbofans under
# them on pylons (the nacelles a little flat underneath), the swept tailplane and fin with a dorsal fillet, the belly
# fairing, the gear down. The paint is the fictional SHOYO AIRWAYS' (white, a deep blue belly sweeping up into the fin,
# a gold line, a gold sun with a white wave on the fin, the name in block letters drawn here as strokes); it copies no
# real airline's colours.
# Coordinates (as the other models, glTF written as they are): x right (the right wing), y up (0: the ground under the
# wheels), z aft (the nose at z −19). One mesh, 'body' (one draw for each aircraft drawn).
# COLOR_0: rgb = the paint (sRGB), alpha = the ambient occlusion baked per vertex.
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
OUT = argv[0] if argv else '/tmp/jet737.glb'
PREVIEW = argv[1] if len(argv) > 1 and argv[1] != '-' else None
DEG, TAU = math.pi / 180, math.tau

def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t
def smooth(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- the paint (sRGB)
WHITE = (0.95, 0.95, 0.94)
NAVY = (0.075, 0.16, 0.36)            # SHOYO AIRWAYS' deep blue
GOLD = (0.85, 0.62, 0.18)
WING = (0.76, 0.77, 0.79)             # the wings and the tailplane: a light grey paint
WALK = (0.66, 0.67, 0.69)             # the walkway on the wing, a shade darker
GLASS = (0.10, 0.14, 0.19)            # (the game: dark, blue-grey → glass)
RUBBER = (0.09, 0.09, 0.10)
METAL = (0.55, 0.56, 0.57)            # struts, the inlet lip, the exhaust (→ metal)
DARK = (0.04, 0.045, 0.05)            # the fan face, the exhaust's inside
SEAM = (0.55, 0.57, 0.60)             # door outlines (a grey line, paint)
RED = (0.75, 0.08, 0.06)              # the beacons
GREEN = (0.05, 0.6, 0.15)

bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new('export'); bpy.context.scene.collection.children.link(COL)
AUX = bpy.data.collections.new('aux'); bpy.context.scene.collection.children.link(AUX)

class Piece:
    # triangles / quads with one colour per face, built in plain Python and turned into a mesh at the end
    def __init__(self): self.v = []; self.f = []; self.c = []
    def vert(self, p): self.v.append(Vector(p)); return len(self.v) - 1
    def face(self, idx, col): self.f.append(tuple(idx)); self.c.append(col)
    def grid(self, rows, col_of, closed=False, flip=False):
        base = len(self.v); n = len(rows[0])
        for r in rows:
            for p in r: self.v.append(Vector(p))
        m = n if closed else n - 1
        for i in range(len(rows) - 1):
            for j in range(m):
                a, b = base + i * n + j, base + i * n + (j + 1) % n
                c, d = base + (i + 1) * n + (j + 1) % n, base + (i + 1) * n + j
                self.face((a, b, c, d) if not flip else (d, c, b, a), col_of(i, j))
        return base
    def fan(self, ring, centre, col, flip=False):
        ci = self.vert(centre); n = len(ring)
        for j in range(n):
            a, b = ring[j], ring[(j + 1) % n]
            self.face((ci, b, a) if not flip else (ci, a, b), col)
    def add(self, o):
        k = len(self.v); self.v += o.v; self.f += [tuple(i + k for i in f) for f in o.f]; self.c += o.c; return self
    def transform(self, fn): self.v = [Vector(fn(p)) for p in self.v]; return self

def mirror_x(p):
    q = Piece(); q.v = [Vector((-v.x, v.y, v.z)) for v in p.v]; q.f = [tuple(reversed(f)) for f in p.f]; q.c = list(p.c); return q

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
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-5)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 40 * DEG: e.smooth = False
    bm.to_mesh(me); bm.free(); me.update()
    return ob

def tris(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)

# a monotone cubic through (x, y) keys (Fritsch–Carlson): smooth, no overshoot
def mono(keys):
    xs = [k[0] for k in keys]; ys = [k[1] for k in keys]; n = len(xs)
    d = [(ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i]) for i in range(n - 1)]
    m = [d[0]] + [0.0 if d[i - 1] * d[i] <= 0 else (d[i - 1] + d[i]) / 2 for i in range(1, n - 1)] + [d[-1]]
    for i in range(n - 1):
        if d[i] == 0: m[i] = m[i + 1] = 0; continue
        a, b = m[i] / d[i], m[i + 1] / d[i]; s = a * a + b * b
        if s > 9: tau = 3 / math.sqrt(s); m[i] = tau * a * d[i]; m[i + 1] = tau * b * d[i]
    def f(x):
        if x <= xs[0]: return ys[0]
        if x >= xs[-1]: return ys[-1]
        i = max(j for j in range(n - 1) if xs[j] <= x)
        h = xs[i + 1] - xs[i]; t = (x - xs[i]) / h
        return (ys[i] * (2 * t ** 3 - 3 * t * t + 1) + h * m[i] * (t ** 3 - 2 * t * t + t) + ys[i + 1] * (-2 * t ** 3 + 3 * t * t) + h * m[i + 1] * (t ** 3 - t * t))
    return f

def cosspace(n, a=0.0, b=1.0): return [a + (b - a) * (0.5 - 0.5 * math.cos(math.pi * i / n)) for i in range(n + 1)]

# ================================================================ the fuselage
# Each station: the centre's height yc, the half-width W, the upper and lower half-heights Hu, Hl; a near-circle
# (superellipse) round it. The nose: rounded, its tip a little below the centre line; the tail cone sweeps up to the
# APU's exhaust.
FK = {
    'z':  [-19.00, -18.90, -18.65, -18.25, -17.70, -17.00, -16.10, -15.00, -13.50, -12.00, 7.50, 10.00, 12.50, 15.00, 17.20, 19.00, 20.30, 20.55],
    'yc': [2.66, 2.70, 2.78, 2.88, 2.98, 3.07, 3.14, 3.18, 3.20, 3.20, 3.20, 3.33, 3.55, 3.85, 4.15, 4.38, 4.50, 4.52],
    'W':  [0.04, 0.38, 0.72, 1.06, 1.36, 1.60, 1.76, 1.85, 1.88, 1.88, 1.88, 1.80, 1.58, 1.24, 0.86, 0.50, 0.24, 0.16],
    'Hu': [0.04, 0.42, 0.80, 1.18, 1.50, 1.75, 1.90, 1.98, 2.00, 2.00, 2.00, 1.90, 1.66, 1.32, 0.94, 0.56, 0.27, 0.18],
    'Hl': [0.04, 0.36, 0.70, 1.04, 1.36, 1.62, 1.82, 1.94, 2.00, 2.00, 2.00, 1.80, 1.44, 1.02, 0.66, 0.38, 0.20, 0.15],
}
FI = {k: mono(list(zip(FK['z'], FK[k]))) for k in FK if k != 'z'}
def sec(z): return {k: FI[k](z) for k in FI}
def surf(z, th):
    # the skin's point at station z and angle th (0: the right side at the centre's height, 90°: the crown)
    s = sec(z); c, sn = math.cos(th), math.sin(th)
    e = 2.25
    x = s['W'] * math.copysign(abs(c) ** (2 / e), c)
    y = s['yc'] + (s['Hu'] if sn >= 0 else s['Hl']) * math.copysign(abs(sn) ** (2 / e), sn)
    return Vector((x, y, z))
def surf_n(z, th, d=0.01):
    p = surf(z, th); a = surf(z + d, th) - p; b = surf(z, th + d) - p
    n = b.cross(a)
    if n.length < 1e-9: return Vector((math.cos(th), math.sin(th), 0))
    n.normalize()
    q = Vector((p.x, p.y - sec(z)['yc'], 0))
    if n.dot(q) < 0 and q.length > 1e-6: n = -n
    return n
# the paint line: the deep blue belly below hb(z) (as a fraction of the half-height, −1 the keel … +1 the crown),
# sweeping up behind the wing into the fin; the gold line just above it
HB = mono([(-19.2, -0.15), (-16.0, -0.36), (-10.0, -0.42), (2.0, -0.42), (7.5, -0.30), (11.0, 0.05), (14.0, 0.55), (16.5, 1.2), (21.0, 1.4)])
def hfrac(z, th): return math.sin(th)
def fuse_col(z, th):
    h = hfrac(z, th), HB(z)
    if h[0] < h[1]: return NAVY
    if h[0] < h[1] + 0.07: return GOLD
    return WHITE
def zs_fuse():
    out, z = [], FK['z'][0]
    while z < FK['z'][-1] - 1e-6:
        out.append(z)
        z += 0.12 if z < -18.0 else 0.35 if z < -14.5 else 1.0 if z < 7.0 else 0.45
    out.append(FK['z'][-1]); return out
fuse = Piece()
ZS = zs_fuse()
# each ring's angles put points exactly on the paint's edges (the belly's top, the gold line's top), so the lines run
# smooth along the fuselage: per half, keel → belly edge (N1), the gold line (1), → crown (N3); the left half mirrored
N1, N3 = 7, 8
GL = 0.07
def ring_angles(z):
    hb = HB(z)
    a1 = math.asin(clamp(hb, -0.97, 0.97)); a2 = math.asin(clamp(hb + GL, -0.96, 0.98))
    if a2 <= a1 + 0.01: a2 = a1 + 0.01
    right = [lerp(-math.pi / 2, a1, k / N1) for k in range(N1)] + [a1] + [lerp(a2, math.pi / 2, k / N3) for k in range(N3)]
    # (right: keel → crown, 16 angles; left: crown → keel, mirrored)
    left = [math.pi - a for a in reversed(right[1:])] + [3 * math.pi / 2]
    return right + left[:-1], hb
def seg_col(k, hb):
    # the face from angle k to k+1 (the right half; the left mirrored)
    NH = N1 + 1 + N3                                    # (faces 0 … NH−2 the right half, NH−1 over the crown)
    kk = k if k < NH else 2 * NH - 2 - k
    if hb > 0.93: return NAVY
    if kk < N1: return NAVY
    if kk == N1: return GOLD
    return WHITE
rows, HBS = [], []
for z in ZS:
    angs, hb = ring_angles(z); HBS.append(hb)
    rows.append([surf(z, a) for a in angs])
NA = len(rows[0])
def fcol(i, j): return seg_col(j, max(HBS[i], HBS[i + 1]) if min(HBS[i], HBS[i + 1]) > 0.9 else HBS[i])
base = fuse.grid(rows, fcol, closed=True, flip=True)
fuse.fan([base + j for j in range(NA)], Vector((0, FI['yc'](-19.0), -19.03)), NAVY, flip=False)
# the APU's exhaust at the tail's end: a dark ring and its hole
last = base + (len(ZS) - 1) * NA
fuse.fan([last + j for j in range(NA)], Vector((0, FI['yc'](20.55), 20.62)), DARK, flip=True)

# ---- decals: flat shapes laid on the skin, a little off it (windows, the windshield, door outlines, the name)
def on_skin(z, th, off=0.012): return surf(z, th) + surf_n(z, th) * off
def th_at(z, h, side):
    # the angle where the skin is at height fraction h on that side (side +1 right, −1 left)
    a = math.asin(clamp(h, -0.999, 0.999))
    return a if side > 0 else math.pi - a
def quad_on(z0, z1, h0, h1, side, col, n=3):
    # a patch of the skin from (z0, h0) to (z1, h1) on one side, n×n, lifted off it
    p = Piece()
    rows = [[on_skin(lerp(z0, z1, i / n), th_at(lerp(z0, z1, i / n), lerp(h0, h1, k / n), side)) for k in range(n + 1)] for i in range(n + 1)]
    p.grid(rows, lambda i, j: col, flip=side > 0)
    return p
def quad_th(z0, z1, t0, t1, col, n=3, flip=False):
    # a patch by angles (the windshield, round the nose)
    p = Piece()
    rows = [[on_skin(lerp(z0, z1, i / n), lerp(t0, t1, k / n) * DEG, 0.015) for k in range(n + 1)] for i in range(n + 1)]
    p.grid(rows, lambda i, j: col, flip=flip)
    return p
decals = Piece()
# the windshield: two front panes, two side panes each side (the frames between them are the white skin)
for (z0, z1, t0, t1) in [(-17.80, -16.98, 50, 87.5), (-16.92, -16.22, 34, 58), (-16.16, -15.66, 30, 50)]:
    decals.add(quad_th(z0, z1, t0, t1, GLASS, 4, flip=True))
    decals.add(quad_th(z0, z1, 180 - t1, 180 - t0, GLASS, 4, flip=True))
# the cabin windows: a row each side, the exits' places left out
WIN = [z for z in [-12.7 + 0.508 * k for k in range(42)] if not (-0.35 < z < 2.35) and z < 8.6]
for side in (1, -1):
    for z in WIN:
        decals.add(quad_on(z - 0.13, z + 0.13, 0.20, 0.38, side, GLASS, 2))
    # the over-wing exits' two windows
    for z in (0.15, 1.55): decals.add(quad_on(z - 0.13, z + 0.13, 0.20, 0.38, side, GLASS, 2))
def outline(z0, z1, h0, h1, side, w=0.035, col=SEAM):
    p = Piece()
    p.add(quad_on(z0, z0 + w, h0, h1, side, col, 1)); p.add(quad_on(z1 - w, z1, h0, h1, side, col, 1))
    p.add(quad_on(z0, z1, h0, h0 + w / 2, side, col, 1)); p.add(quad_on(z0, z1, h1 - w / 2, h1, side, col, 1))
    return p
for side in (1, -1):
    decals.add(outline(-15.35, -14.45, -0.62, 0.62, side))        # the forward door
    decals.add(outline(14.05, 14.80, -0.40, 0.70, side))          # the aft door
    for z in (0.15, 1.55): decals.add(outline(z - 0.32, z + 0.32, 0.02, 0.52, side))   # the over-wing exits
    decals.add(outline(-11.8, -11.1, -0.95, -0.55, side, 0.03))   # the forward cargo door
# the name, both sides: SHOYO AIRWAYS in block letters (strokes), above the windows, reading left to right as seen from
# that side (nose → tail on the left side, tail → nose on the right)
GLYPH = {
    'S': [[(1, 0.9), (0.75, 1), (0.25, 1), (0, 0.85), (0, 0.62), (0.25, 0.5), (0.75, 0.5), (1, 0.38), (1, 0.15), (0.75, 0), (0.25, 0), (0, 0.1)]],
    'H': [[(0, 0), (0, 1)], [(1, 0), (1, 1)], [(0, 0.5), (1, 0.5)]],
    'O': [[(0.3, 0), (0.7, 0), (1, 0.25), (1, 0.75), (0.7, 1), (0.3, 1), (0, 0.75), (0, 0.25), (0.3, 0)]],
    'Y': [[(0, 1), (0.5, 0.5), (1, 1)], [(0.5, 0.5), (0.5, 0)]],
    'A': [[(0, 0), (0.5, 1), (1, 0)], [(0.22, 0.42), (0.78, 0.42)]],
    'I': [[(0.5, 0), (0.5, 1)]],
    'R': [[(0, 0), (0, 1), (0.72, 1), (1, 0.82), (1, 0.66), (0.72, 0.5), (0, 0.5)], [(0.5, 0.5), (1, 0)]],
    'W': [[(0, 1), (0.22, 0), (0.5, 0.65), (0.78, 0), (1, 1)]],
    ' ': [],
}
def stroke(a, b, side, wid):
    # a stroke from a to b, each (z, h): a strip on the skin, cut every 0.1 m so it follows the skin's curve
    za, ha = a; zb, hb = b
    L = math.hypot(zb - za, (hb - ha) * 2.0) or 1e-6
    nz, nh = -(hb - ha) * 2.0 / L * wid / 2, (zb - za) / L * wid / 2 / 2.0
    n = max(1, math.ceil(L / 0.1))
    p = Piece()
    rows = []
    for k in range(n + 1):
        z, h = lerp(za, zb, k / n), lerp(ha, hb, k / n)
        rows.append([on_skin(z - nz, th_at(z - nz, h - nh, side), 0.016), on_skin(z + nz, th_at(z + nz, h + nh, side), 0.016)])
    nrm = (rows[1][0] - rows[0][0]).cross(rows[0][1] - rows[0][0])
    out = surf_n(za, th_at(za, ha, side))
    p.grid(rows, lambda i, j: NAVY, flip=nrm.dot(out) < 0)
    return p
def lettering(text, side, z0=-10.6, Wc=0.62, gap=0.24, h0=0.47, H=0.30, wid=0.13):
    p = Piece(); total = len(text) * Wc + (len(text) - 1) * gap
    for k, ch in enumerate(text):
        for line in GLYPH[ch]:
            pts = []
            for gx, gy in line:
                r = k * (Wc + gap) + gx * Wc
                z = z0 + (r if side < 0 else total - r)
                pts.append((z, h0 + gy * H))
            for a, b in zip(pts[:-1], pts[1:]): p.add(stroke(a, b, side, wid))
    return p
decals.add(lettering('SHOYO AIRWAYS', 1)).add(lettering('SHOYO AIRWAYS', -1))
# the beacons (red, on the crown and the belly over the wing)
def blob(c, r, col, n=8):
    p = Piece(); rings = []
    for i in range(1, n // 2):
        a = math.pi * i / (n // 2) - math.pi / 2
        rings.append([Vector(c) + Vector((r * math.cos(a) * math.cos(TAU * j / n), r * math.sin(a), r * math.cos(a) * math.sin(TAU * j / n))) for j in range(n)])
    b = p.grid(rings, lambda i, j: col, closed=True, flip=True)
    p.fan([b + j for j in range(n)], Vector(c) + Vector((0, -r, 0)), col, flip=False)
    p.fan([b + (len(rings) - 1) * n + j for j in range(n)], Vector(c) + Vector((0, r, 0)), col, flip=True)
    return p
decals.add(blob((0, 5.22, -1.0), 0.12, RED)).add(blob((0, 1.18, 3.2), 0.12, RED))

# ================================================================ the wings
def foil(t, camber=0.02):
    # a thin airliner section: (upper, lower) around a chord 0..1, cosine spaced
    fs = cosspace(10)
    up, lo = [], []
    for f in fs:
        yt = 5 * t * (0.2969 * math.sqrt(f) - 0.1260 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1036 * f ** 4)
        yc = camber * 4 * f * (1 - f)
        up.append((f, yc + yt)); lo.append((f, yc - yt))
    return up, lo
def lifting(stations, col_of, close_tip=True, vertical=False):
    # stations: [(le point, chord, thickness, twist deg)] root → tip; the section's outline (upper TE → LE → lower TE)
    # placed along +z (aft) from the leading edge; vertical: the section in the x–z plane (a fin)
    p = Piece(); rings = []
    for (le, ch, t, tw) in stations:
        up, lo = foil(t, 0.0 if vertical else 0.018)
        outline = list(reversed(up)) + lo[1:]
        ring = []
        for f, y in outline:
            a = tw * DEG
            dz, dy = f * ch * math.cos(a) + y * ch * math.sin(a), y * ch * math.cos(a) - f * ch * math.sin(a)
            ring.append(Vector(le) + (Vector((dy, 0, dz)) if vertical else Vector((0, dy, dz))))
        rings.append(ring)
    n = len(rings[0])
    b = p.grid(rings, lambda i, j: col_of(i, j, n), closed=True, flip=vertical)
    if close_tip:
        last = [b + (len(rings) - 1) * n + j for j in range(n)]
        c = sum((rings[-1][j] for j in range(n)), Vector()) / n
        p.fan(last, c, col_of(len(rings) - 2, 0, n), flip=vertical)
    return p
# the right wing: the root inside the fuselage, the leading edge swept 27°, 6° up; the walkway grey near the root
SW, DIH = 27 * DEG, 6 * DEG
def wing_le(x): return Vector((x, 1.92 + (x - 1.4) * math.tan(DIH), -4.9 + (x - 1.4) * math.tan(SW)))
def wing_ch(x): return lerp(7.2, 1.35, (x - 1.4) / (16.9 - 1.4)) if x > 1.4 else 7.2
XS = [1.0, 1.4, 3.0, 5.0, 7.0, 9.5, 12.0, 14.5, 16.4, 16.9]
wR = lifting([(wing_le(x), wing_ch(x), lerp(0.135, 0.095, (x - 1.0) / 15.9), lerp(2.0, -1.5, (x - 1.0) / 15.9)) for x in XS],
             lambda i, j, n: WALK if (i in (1, 2) and j < n // 2) else WING)
# the blended winglet: up and out from the tip, swept back, deep blue with a gold tip
def wl_le(k):
    a = wing_le(16.9); u = k / 5
    return a + Vector((0.55 * math.sin(u * math.pi / 2) ** 0.7, 2.35 * u ** 1.1, 1.15 * u ** 1.2 + 0.05))
wl = Piece()
# (the section turns from flat to upright as the winglet rises: its thickness from y to x)
rings = []
for k in range(6):
    le = wl_le(k); ch = lerp(1.35, 0.55, k / 5); up, lo = foil(0.09, 0.0); out = list(reversed(up)) + lo[1:]
    ang = (k / 5) * math.pi / 2 * 0.9
    nx, ny = math.cos(ang), math.sin(ang)       # the thickness's direction: +y (flat) turning to −x (upright)
    rings.append([le + Vector((-ny * y * ch, nx * y * ch, f * ch)) for f, y in out])
n = len(rings[0])
b = wl.grid(rings, lambda i, j: GOLD if i == 4 else NAVY, closed=True)
wl.fan([b + 5 * n + j for j in range(n)], sum(rings[5], Vector()) / n, GOLD)
wR.add(wl)
# the green navigation light at the right tip (red on the left: painted after the mirror)
wR.add(blob(tuple(wing_le(16.9) + Vector((0.05, 0.05, 0.25))), 0.07, GREEN, 6))
wL = mirror_x(wR)
wL.c = [RED if c == GREEN else c for c in wL.c]
# the belly fairing: a long low blister under the wing roots
fair = Piece()
FR = [(-7.0, 0.0, 0.0), (-6.0, 1.0, 0.35), (-4.0, 1.55, 0.55), (0.0, 1.75, 0.62), (4.0, 1.6, 0.55), (6.5, 1.1, 0.35), (7.6, 0.0, 0.0)]
frow = []
for (z, w, d) in FR:
    s = sec(z); yb = s['yc'] - s['Hl'] * 0.86
    frow.append([Vector((w * math.cos(a), yb - d * math.sin(a) - 0.02, z)) for a in [math.pi * k / 10 for k in range(11)]])
fair.grid(frow, lambda i, j: NAVY, flip=False)

# ================================================================ the engines (under the wings, on pylons)
def nacelle(cx):
    p = Piece()
    cy = 1.55
    # stations: z, outer radius (the bottom a little flatter)
    ST = [(-7.75, 0.86), (-7.65, 0.95), (-7.3, 1.02), (-6.4, 1.04), (-5.2, 1.0), (-4.2, 0.9), (-3.4, 0.78)]
    N = 20
    def ring(z, r, inner=False):
        out = []
        for j in range(N):
            a = TAU * j / N; s = math.sin(a)
            out.append(Vector((cx + r * math.cos(a), cy + r * s * (0.86 if s < 0 else 1.0), z)))
        return out
    rows = [ring(z, r) for z, r in ST]
    b = p.grid(rows, lambda i, j: METAL if i == 0 else (GOLD if i == 1 else NAVY), closed=True, flip=True)
    # the inlet's inside, the fan (dark) a little in
    lip_in = [ring(-7.75, 0.80), ring(-7.45, 0.78)]
    p.grid([rows[0], lip_in[0], lip_in[1]], lambda i, j: METAL if i == 0 else DARK, closed=True, flip=True)
    fan = [p.vert(v) for v in lip_in[1]]
    p.fan(fan, Vector((cx, cy, -7.2)), DARK, flip=True)
    # the exhaust: the core's nozzle and its cone
    core = [ring(-3.4, 0.62), ring(-2.6, 0.48)]
    p.grid([rows[-1], core[0], core[1]], lambda i, j: METAL if i else DARK, closed=True, flip=True)
    cb = [p.vert(v) for v in core[1]]
    p.fan(cb, Vector((cx, cy, -2.0)), METAL, flip=True)
    # the pylon: from the nacelle's top up into the wing
    top = cy + 0.9
    for (z0, z1) in [(-6.6, -2.6)]:
        y0, y1 = top, wing_le(abs(cx))[1] + 0.05
        w = 0.17
        box = [Vector((cx - w, y0, z0)), Vector((cx + w, y0, z0)), Vector((cx + w, y0, z1)), Vector((cx - w, y0, z1)),
               Vector((cx - w * 0.8, y1, z0 + 1.6)), Vector((cx + w * 0.8, y1, z0 + 1.6)), Vector((cx + w * 0.8, y1, z1 + 0.6)), Vector((cx - w * 0.8, y1, z1 + 0.6))]
        ids = [p.vert(v) for v in box]
        for f in [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]: p.face([ids[k] for k in f], WHITE)
    return p
engR = nacelle(4.95); engL = nacelle(-4.95)

# ================================================================ the tail
# the tailplane: swept 32°, a little dihedral, on the tail cone
def stab_le(x): return Vector((x, 4.05 + (x - 0.6) * math.tan(7 * DEG), 15.3 + (x - 0.6) * math.tan(32 * DEG)))
SX = [0.4, 0.6, 2.5, 4.5, 6.4, 7.0]
stR = lifting([(stab_le(x), lerp(4.0, 1.15, (x - 0.6) / 6.4), 0.10, 0) for x in SX], lambda i, j, n: WING)
stL = mirror_x(stR)
# the fin: swept 37°, deep blue; the dorsal fillet ahead of it
def fin_le(h): return Vector((0, 4.95 + h, 12.7 + h * math.tan(37 * DEG)))
FH = [-0.3, 0.0, 1.5, 3.0, 4.5, 6.2, 6.6]
fin = lifting([(fin_le(h), lerp(6.3, 1.9, max(0, h) / 6.6), 0.11, 0) for h in FH], lambda i, j, n: NAVY, vertical=True)
dors = Piece()
for side in (1, -1):
    a = Vector((0.0, 4.95, 9.4)); b2 = Vector((0.0, 6.2, 12.7 + 1.25 * math.tan(37 * DEG))); c = Vector((side * 0.18, 4.98, 12.9))
    ids = [dors.vert(v) for v in (a, b2, c)]; dors.face(ids if side < 0 else list(reversed(ids)), NAVY)
# the fin's sun: a gold disc with a white wave across it, both sides (flat, on the fin's skin)
def fin_half(h, zz):
    le = fin_le(h); ch = lerp(6.3, 1.9, max(0, h) / 6.6); f = clamp((zz - le.z) / ch, 0, 1)
    return 5 * 0.11 * (0.2969 * math.sqrt(f) - 0.1260 * f - 0.3516 * f * f + 0.2843 * f ** 3 - 0.1036 * f ** 4) * ch
logo = Piece()
SUN = (17.45, 8.3, 0.95)                      # z, y (centre), radius
def on_fin(zz, yy, side, off=0.012): return Vector((side * (fin_half(yy - 4.95, zz) + off), yy, zz))
for side in (1, -1):
    ring = [on_fin(SUN[0] + SUN[2] * math.cos(TAU * j / 28), SUN[1] + SUN[2] * math.sin(TAU * j / 28), side) for j in range(28)]
    ids = [logo.vert(v) for v in ring]
    logo.fan(ids, on_fin(SUN[0], SUN[1], side), GOLD, flip=side > 0)
    # the wave: a white band across the lower part of the sun (two sine curves)
    K = 14
    up = [on_fin(SUN[0] - 1.15 + 2.3 * k / K, SUN[1] - 0.30 + 0.15 * math.sin(k / K * TAU), side, 0.02) for k in range(K + 1)]
    lo = [on_fin(SUN[0] - 1.15 + 2.3 * k / K, SUN[1] - 0.55 + 0.15 * math.sin(k / K * TAU + 0.6), side, 0.02) for k in range(K + 1)]
    logo.grid([lo, up] if side > 0 else [up, lo], lambda i, j: WHITE)

# ================================================================ the gear (down)
def cyl(p0, p1, r0, r1, n, col, cap0=True, cap1=True):
    p = Piece(); a, b = Vector(p0), Vector(p1); ax = (b - a).normalized()
    u = ax.orthogonal().normalized(); v = ax.cross(u)
    r0s = [a + (u * math.cos(TAU * j / n) + v * math.sin(TAU * j / n)) * r0 for j in range(n)]
    r1s = [b + (u * math.cos(TAU * j / n) + v * math.sin(TAU * j / n)) * r1 for j in range(n)]
    base = p.grid([r0s, r1s], lambda i, j: col, closed=True)
    if cap0: p.fan([base + j for j in range(n)], a, col, flip=True)
    if cap1: p.fan([base + n + j for j in range(n)], b, col)
    return p
def wheel(c, r, w, n=14):
    p = cyl((c[0] - w / 2, c[1], c[2]), (c[0] + w / 2, c[1], c[2]), r, r, n, RUBBER)
    p.add(cyl((c[0] - w / 2 - 0.01, c[1], c[2]), (c[0] + w / 2 + 0.01, c[1], c[2]), r * 0.55, r * 0.55, n, METAL))
    return p
gear = Piece()
for sd in (1, -1):
    x = sd * 2.86
    gear.add(cyl((x, 2.05, -0.55), (x, 0.56, -0.4), 0.13, 0.11, 10, METAL))
    gear.add(cyl((x - 0.5, 0.56, -0.4), (x + 0.5, 0.56, -0.4), 0.07, 0.07, 8, METAL))
    for dx in (-0.42, 0.42): gear.add(wheel((x + dx, 0.56, -0.4), 0.56, 0.36))
gear.add(cyl((0, 2.2, -16.05), (0, 0.36, -16.0), 0.09, 0.08, 10, METAL))
for dx in (-0.2, 0.2): gear.add(wheel((dx, 0.36, -16.0), 0.36, 0.22, 12))

# ================================================================ one object, the occlusion baked, the glTF
body = Piece().add(fuse).add(decals).add(wR).add(wL).add(fair).add(engR).add(engL).add(stR).add(stL).add(fin).add(dors).add(logo).add(gear)
ob = to_object('body', body, COL)
bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(ob.data); bm.free(); ob.data.update()
occl = bmesh.new(); occl.from_mesh(ob.data)
vs = [occl.verts.new(v) for v in ((-30, 0, -30), (30, 0, -30), (30, 0, 30), (-30, 0, 30))]; occl.faces.new(vs)
OBVH = BVHTree.FromBMesh(occl)
DIRS = []
for i in range(36):
    y = 1 - 2 * (i + 0.5) / 36; r = math.sqrt(1 - y * y); a = i * math.pi * (3 - math.sqrt(5))
    DIRS.append(Vector((math.cos(a) * r, y, math.sin(a) * r)))
me = ob.data; vals = []
for v in me.vertices:
    nn = v.normal; hit = tot = 0.0
    for d in DIRS:
        c = d.dot(nn)
        if c <= 0.05: continue
        tot += c
        loc, _, _, dist = OBVH.ray_cast(v.co + nn * 0.01, d, 4.0)
        if loc is not None: hit += c * (1 - dist / 4.0) ** 0.5
    vals.append(clamp(1 - 0.85 * (hit / tot if tot else 0), 0.35, 1))
col = me.color_attributes.get('COLOR_0')
for l in me.loops:
    c = col.data[l.index].color; col.data[l.index].color = (c[0], c[1], c[2], vals[l.vertex_index])
me.color_attributes.active_color = col
print('triangles', tris(ob))

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 1200, 700
    mat = bpy.data.materials.new('paint'); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'COLOR_0'
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
    nt.links.new(ca.outputs['Color'], mul.inputs[6]); nt.links.new(ca.outputs['Alpha'], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.3
    ob.data.materials.clear(); ob.data.materials.append(mat)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); bpy.context.scene.collection.objects.link(sun)
    sun.data.energy = 3.5; sun.rotation_euler = (math.radians(-50), math.radians(25), 0)
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.55, 0.65, 0.8, 1); world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
    gp = bpy.data.objects.new('ground', bpy.data.meshes.new('ground')); bpy.context.scene.collection.objects.link(gp)
    gb = bmesh.new(); vs = [gb.verts.new((x, -0.001, z)) for x, z in ((-80, -80), (80, -80), (80, 80), (-80, 80))]; gb.faces.new(vs); gb.to_mesh(gp.data); gb.free()
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); bpy.context.scene.collection.objects.link(cam); sc.camera = cam
    cam.data.lens = 40; cam.data.clip_end = 500
    shots = {'34front': (Vector((26, 9, -34)), Vector((0, 3, -2))), 'side': (Vector((52, 4.5, 0.5)), Vector((0, 4.5, 0.5))),
             'rear': (Vector((-24, 12, 40)), Vector((0, 4, 4))), 'nose': (Vector((7, 4.5, -30)), Vector((0, 3.5, -15)))}
    for name, (eye, at) in shots.items():
        d = (at - eye).normalized(); up = Vector((0, 1, 0))
        rx = d.cross(up).normalized(); uy = rx.cross(d)
        M = Matrix((rx, uy, -d)).transposed().to_4x4(); M.translation = eye
        cam.matrix_world = M
        sc.render.filepath = os.path.join(PREVIEW, f'737-{name}.png')
        bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='DESELECT'); ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=False, export_apply=True,
    export_materials='NONE', export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_skins=False, export_morph=False, export_extras=False, export_tangents=False)
print('wrote', OUT, os.path.getsize(OUT))
