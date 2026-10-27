# CADET — tools/aircraft/build_cockpit.py : the parts of the flown aircraft's cabin (aircraft/cockpit.js) made in
# Blender (run in the background, no window):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-] [groups]
# groups: which parts, comma-separated (all of them when left out: band,seats,glareshield,yokes). The game takes each
# group from the model when the model has it, and makes its old simple shapes in code when it does not.
# - band (here): the top band — the headliner (its arch, sewn seams over the bows and down the middle, the cloth
#   sagging a little between the bows), the roof-edge trims over the joint between the window band and the headliner,
#   the windshield header (a moulding from the glass's top edge up to the headliner), the A-pillar trims round the
#   windshield's side edges, the rubber seals where these meet the glass, and the two sun visors (padded, on a hinge rod
#   held by two brackets to the headliner, stowed along its curve).
# - the others, each in its own file next to this one (cockpit_<name>.py: seats — the front seats and the rear bench;
#   glareshield; yokes), given this script's helpers and layout (ctx): MAX_TRIS (its triangle budget), parts(ctx) → {node
#   name: (Piece, colour function or None)}, and optionally proxies(ctx) (what stays in code round it, for the occlusion),
#   check(ctx, objs) (its own asserts once the meshes are made) and PREVIEW ({view: (yaw, pitch)} for the preview).
# Everything is made to the cabin's own layout (cockpit-spec.mjs reads aircraft/cockpit.js's CABIN: the eye, the window
# band, the roof's arch, the windshield, the panel, the seats' places, the yokes), so the parts meet what stays in code;
# the script checks its copies of the layout's curves against the spec's sample values.
# Coordinates: the cabin's frame (= the Archer's body frame; metres, x = the right wing, y = up, z = aft); written
# without the exporter's z-up conversion. The Seminole's cockpit is the same cabin (aircraft/cockpit.js moves it).
# Nodes, named "<group>.<surface>[.<moving part>][.pa28|.pa44]" (the band's groups: headliner, roofTrims, header,
# pillars, seals, visors, visorHw): the game takes each part's roughness, metalness and detail kind from cockpit.js's
# surface table under that name (roof, trim, rubber, wall, steel, seat, …); a moving part (yokeL …) is made in place at
# its rest pose and turns about cockpit.js's pivot for it; pa28 / pa44: one type's own. COLOR_0: rgb = the colour (sRGB,
# the table's colour, darker along seams), alpha = the occlusion of what is close by (rays 5 cm long against these parts
# and the cabin round them); the game multiplies it by the cabin's own sky occlusion (cockpit.js bakeAO: how much sky
# each point sees through the windows), as for every other part of the cabin.
import bpy, bmesh, json, math, sys, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
S = json.load(open(argv[0]))
OUT = argv[1]
PREVIEW = argv[2] if len(argv) > 2 and argv[2] != '-' else None
GROUPS = argv[3].split(',') if len(argv) > 3 else ['band', 'seats', 'glareshield', 'yokes']
MAX_TRIS = 2600                       # the band's share of the cockpit's triangles (cockpit.test: trianglesTwin ≤ 40,000)

DEG = math.pi / 180
def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t

# ---------------------------------------------------------------- the layout (aircraft/cockpit.js, via the spec)
EYE = Vector(S['eye'])
SILL, WTOP, HW, HWT, ROOF, AFT, KX, FLOOR = S['sill'], S['wtop'], S['hw'], S['hwt'], S['roof'], S['aft'], S['kx'], S['floor']
WS = S['ws']
# (cockpit.js: bandX, roofY, wsZ, lowX — checked against the spec's samples just below)
def bandX(y): return HW + KX * (y - SILL)
def roofY(x): return WTOP + (ROOF - WTOP) * math.sqrt(max(0.0, 1 - (x / HWT) ** 2))
def wsZ(x, y): return WS['z0'] + (WS['z1'] - WS['z0']) * (y - WS['y0']) / (WS['y1'] - WS['y0']) + WS['bow'] * (x / 0.5) ** 2
def lowX(y):                          # the lower wall's x at height y (its soft profile up from the floor)
    v = clamp((y - FLOOR) / (SILL - FLOOR), 0, 1); return HW - 0.10 * (1 - min(1, v / 0.45)) ** 2
for y, v in S['samples']['bandX']: assert abs(bandX(y) - v) < 2e-6, ('bandX', y)
for x, v in S['samples']['roofY']: assert abs(roofY(x) - v) < 2e-6, ('roofY', x)
for x, y, v in S['samples']['wsZ']: assert abs(wsZ(x, y) - v) < 2e-6, ('wsZ', x, y)
for y, v in S['samples']['lowX']: assert abs(lowX(y) - v) < 2e-6, ('lowX', y)

C = S['colours']
ROOFC, TRIM, RUBBER, WALL, STEEL = (tuple(C[k]) for k in ('roof', 'trim', 'rubber', 'wall', 'steel'))
SEAMC = tuple(c * 0.8 for c in ROOFC)  # the headliner's seams: a shade darker than the cloth

# ---------------------------------------------------------------- the scene
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new('export'); bpy.context.scene.collection.children.link(COL)
AUX = bpy.data.collections.new('aux'); bpy.context.scene.collection.children.link(AUX)

class Piece:
    # faces in plain Python, a colour per corner (col_of(point) when given, else the face's colour)
    def __init__(self):
        self.v = []; self.f = []; self.c = []
    def grid(self, rows, col, closed=False, flip=False):
        # rows: lists of points (same length); a quad strip between consecutive rows
        base = len(self.v); n = len(rows[0])
        for r in rows: self.v += [Vector(p) for p in r]
        m = n if closed else n - 1
        for i in range(len(rows) - 1):
            for j in range(m):
                a, b = base + i * n + j, base + i * n + (j + 1) % n
                c, d = base + (i + 1) * n + (j + 1) % n, base + (i + 1) * n + j
                self.f.append((a, b, c, d) if not flip else (d, c, b, a)); self.c.append(col)
        return base
    def fan(self, ring, centre, col, flip=False):
        ci = len(self.v); self.v.append(Vector(centre)); n = len(ring)
        for j in range(n):
            a, b = ring[j], ring[(j + 1) % n]
            self.f.append((ci, b, a) if not flip else (ci, a, b)); self.c.append(col)
    def add(self, o):
        k = len(self.v); self.v += o.v; self.f += [tuple(i + k for i in f) for f in o.f]; self.c += o.c
        return self

def mirror_x(p):
    # the left-hand copy of a right-hand part: x negated, each face's winding reversed (so it still faces the same way)
    m = Piece(); m.v = [Vector((-v.x, v.y, v.z)) for v in p.v]; m.f = [tuple(reversed(f)) for f in p.f]; m.c = list(p.c)
    return m

def to_object(name, piece, coll=AUX, vcol=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in piece.v], [], [tuple(f) for f in piece.f]); me.update()
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name, me); coll.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    lay = bm.loops.layers.float_color.new('COLOR_0')
    bm.faces.ensure_lookup_table()
    for k, f in enumerate(bm.faces):
        for l in f.loops:
            c = vcol(l.vert.co) if vcol else piece.c[k]
            l[lay] = (c[0], c[1], c[2], 1.0)
        f.smooth = True
    bmesh.ops.remove_doubles(bm, verts=bm.verts[:], dist=1e-6)
    for e in bm.edges:
        if len(e.link_faces) == 2 and e.calc_face_angle(0) > 38 * DEG: e.smooth = False
    bm.to_mesh(me); bm.free(); me.update()
    me.color_attributes.active_color = me.color_attributes['COLOR_0']
    return ob

def tris(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)

# ---------------------------------------------------------------- the headliner
# The arch of cockpit.js (x = −HWT·cos φ, y = WTOP + (ROOF − WTOP)·sin φ) from just behind the windshield's top edge to
# the aft bulkhead. Bows across the cabin hold the cloth at BOWS; between them it sags a little (most at the middle of
# a bay and of the arch, nothing at the window band); the seams over the bows and the one down the middle sit a little
# up into the roof and are darker, and the cloth is shaded towards them (the light the pillowing would catch, which the
# cabin's soft light alone would hardly show). The front bays (the ones seen from the seats) have more rows.
BOWS = [-0.56, -0.30, -0.02, 0.32, 0.72, 1.18]
FINE = 3                              # the bows seen from the seats: their seams modelled, their bays with more rows
SAG, GROOVE, SEAM_W = 0.006, 0.0025, 0.011
def roof_point(phi, z, sag):
    a, b = HWT, ROOF - WTOP
    x, y = -a * math.cos(phi), WTOP + b * math.sin(phi)
    n = Vector((x / (a * a), (y - WTOP) / (b * b), 0)).normalized()        # the arch's outward normal (up and out)
    return Vector((x, y, z)) - n * sag
def roof_front(x):
    return wsZ(x, min(roofY(x), WS['y1'])) + 0.004
# across: uniform in φ (denser where the arch bends near the windows), plus a narrow seam down the middle
phis = [math.pi * i / 16 for i in range(17)]
phis = sorted(set(phis + [math.pi / 2 - SEAM_W / HWT, math.pi / 2 + SEAM_W / HWT]))
# along: (z, kind) — kind 'e' an edge, 'b' a bay's interior row (its fraction t in the bay), 's' a seam's centre,
# 'g' a seam's side
def headliner_rows():
    rows = []
    stops = BOWS + [AFT]
    prev = None                       # the bay's start (None: the front edge, which depends on x)
    for k, z1 in enumerate(stops):
        fine = k < FINE
        ts = [1 / 3, 2 / 3] if fine else [0.5]
        for t in ts: rows.append(('b', prev, z1, t))
        if z1 == AFT: rows.append(('e', AFT)); break
        if fine: rows += [('g', z1 - 0.012), ('s', z1), ('g', z1 + 0.012)]
        else: rows += [('s', z1)]
        prev = z1
    return [('e', None)] + rows
def headliner():
    p = Piece(); rows = []
    for row in headliner_rows():
        pts = []
        for phi in phis:
            x = -HWT * math.cos(phi); across = math.sin(phi) ** 0.7
            zf = roof_front(x)
            if row[0] == 'e': z, sag = (zf if row[1] is None else row[1]), 0.0
            elif row[0] == 'b':
                z0 = zf if row[1] is None else row[1]; z = lerp(z0, row[2], row[3]); sag = SAG * math.sin(math.pi * row[3]) * across
            elif row[0] == 's': z, sag = row[1], -GROOVE * across
            else: z, sag = row[1], 0.0
            if abs(x) < 1e-9 and row[0] == 'b': sag -= GROOVE * 0.6               # the middle seam: up into the roof
            pts.append(roof_point(phi, z, sag))
        rows.append(pts)
    # faces down (into the cabin): along × across
    p.grid(rows, ROOFC, flip=False)
    return p
def headliner_col(co):
    seam = 0.0
    for z in BOWS[:FINE]: seam = max(seam, 1 - clamp(abs(co.z - z) / 0.013, 0, 1))      # (the seams with their sides modelled)
    if abs(co.x) < SEAM_W * 0.6 and co.y > WTOP + 0.05: seam = max(seam, 1.0)
    stops = [roof_front(co.x)] + BOWS + [AFT]                          # the bay the point is in, and where in it
    k = max(0, min(len(stops) - 2, sum(1 for z in stops[1:-1] if co.z > z)))
    t = clamp((co.z - stops[k]) / (stops[k + 1] - stops[k]), 0, 1)
    edge = (k == 0 and t < 0.5) or (k == len(stops) - 2 and t > 0.5)   # towards the front edge, the aft bulkhead: no seam
    shade = 1.0 if edge else lerp(0.86, 1.0, math.sin(math.pi * t) ** 0.5)
    return tuple(lerp(a, b, seam) * shade for a, b in zip(ROOFC, SEAMC))

# ---------------------------------------------------------------- the roof-edge trims
# Over the joint of the window band and the headliner (at x = ±HWT, y = WTOP, where both are nearly upright): a moulded
# strip with soft lips, from just behind the A-pillar to the aft bulkhead. Profile: (depth inwards from the wall, height
# from WTOP); its back is buried in the wall and the headliner.
TRIM_PROF = [(-0.003, -0.022), (0.005, -0.023), (0.009, -0.019), (0.011, -0.010), (0.012, 0.004), (0.012, 0.014), (0.010, 0.021), (0.005, 0.024)]
def roof_trim():
    p = Piece(); z0 = wsZ(HWT, WTOP) + 0.045
    zs = [lerp(z0, AFT, i / 10) for i in range(11)]
    rows = [[(HWT - d, WTOP + h, z) for d, h in TRIM_PROF] for z in zs]
    p.grid(rows, TRIM, flip=True)
    ring = list(range(len(TRIM_PROF)))                    # the front end: a cap over the profile
    p.fan(ring, (HWT - 0.006, WTOP, z0), TRIM, flip=True)
    return p

# ---------------------------------------------------------------- the windshield header and its seal
# A moulding along the glass's top edge: its toe on the glass, a rounded lip, its face rising and curving back into the
# headliner. yT: the glass's visible top (the roof's arch where it is lower than the glass, near the sides).
HDR = 0.016                                          # the header's toe under the glass's top (the seal shows 5 mm under it)
def header_section(x):
    yR = roofY(x); yT = min(yR, WS['y1']); y0 = yT - HDR
    zg = lambda y: wsZ(x, y)
    return [(x, y0, zg(y0) + 0.002), (x, y0 - 0.004, zg(y0) + 0.012), (x, y0 + 0.002, zg(y0) + 0.030), (x, yR - 0.012, zg(yT) + 0.040),
            (x, yR - 0.003, zg(yT) + 0.050), (x, yR + 0.003, zg(yT) + 0.060)]
def header_seal_section(x):
    yT = min(roofY(x), WS['y1']); y0 = yT - HDR
    zg = lambda y: wsZ(x, y)
    return [(x, y0 - 0.0055, zg(y0 - 0.0055) - 0.0035), (x, y0 - 0.0035, zg(y0 - 0.0035) + 0.0005), (x, y0 + 0.001, zg(y0 + 0.001) + 0.0025)]
HEADER_XS = [-HWT + 2 * HWT * (0.5 - 0.5 * math.cos(math.pi * i / 26)) for i in range(27)]   # denser near the ends
def header():
    rows = [header_section(x) for x in HEADER_XS]
    p = Piece(); p.grid(rows, WALL, flip=True); return p
def header_seal():
    rows = [header_seal_section(x) for x in HEADER_XS]
    p = Piece(); p.grid(rows, RUBBER, flip=True); return p

# ---------------------------------------------------------------- the A-pillar trims (right hand; the left mirrored)
# Horizontal sections up the windshield's side edge: from a toe on the glass, round the corner of the glass and the
# window band, to a toe on the band's post. corner(y): where the glass's edge meets the band.
PIL_YS = [lerp(WS['y0'] - 0.02, WTOP + 0.02, i / 10) for i in range(11)]
def pillar_section(y):
    xb = bandX(y); zc = wsZ(xb, y)
    g = lambda dx, w: (xb - dx, y, wsZ(xb - dx, y) + w)                 # on the glass, dx inboard, w aft of it
    return [g(0.032, 0.002), g(0.035, 0.009), g(0.026, 0.019), (xb - 0.016, y, zc + 0.026), (xb - 0.011, y, zc + 0.035),
            (xb - 0.007, y, zc + 0.040), (xb - 0.002, y, zc + 0.043), (xb + 0.002, y, zc + 0.041)]
def pillar_seal_section(y):
    xb = bandX(y)
    g = lambda dx, w: (xb - dx, y, wsZ(xb - dx, y) + w)
    return [g(0.039, -0.0035), g(0.036, 0.0005), g(0.031, 0.0025)]
def pillar():
    p = Piece(); p.grid([pillar_section(y) for y in PIL_YS], WALL, flip=False); return p
def pillar_seal():
    p = Piece(); p.grid([pillar_seal_section(y) for y in PIL_YS], RUBBER, flip=False); return p

# ---------------------------------------------------------------- the sun visors (right hand; the left mirrored)
# Padded, stowed up under the headliner: rolled about the cabin's axis to follow the arch's slope over their span, the
# rear edge a little up. The hinge rod along the front edge, a pivot bracket at the inner end and a clip at the outer.
VX0, VX1, VD, VT = 0.12, 0.38, 0.135, 0.014        # span (x), depth, thickness
HINGE_Z, CLEAR, PITCH = -0.71, 0.006, 2 * DEG      # (the hinge behind the header, which reaches furthest aft at the sides)
def visor_frame():
    # the visor's plane: origin on the hinge line at the outer end, u along the span (inwards), v back (aft, rising)
    yo, yi = roofY(VX1) - CLEAR - VT - VD * math.sin(PITCH), roofY(VX0) - CLEAR - VT - VD * math.sin(PITCH)
    o = Vector((VX1, yo, HINGE_Z)); u = (Vector((VX0, yi, HINGE_Z)) - o).normalized()
    v = Vector((0, math.sin(PITCH), math.cos(PITCH))); v = (v - u * v.dot(u)).normalized(); n = u.cross(v).normalized()
    if n.y < 0: n = -n
    return o, u, v, n, (Vector((VX0, yi, HINGE_Z)) - o).length
def rounded_rect(w, d, r, seg):
    pts = []
    for cx, cy, a0 in ((w - r, d - r, 0), (r, d - r, 90), (r, r, 180), (w - r, r, 270)):
        for k in range(seg + 1):
            a = (a0 + 90 * k / seg) * DEG; pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts
def visor():
    o, u, v, n, span = visor_frame()
    P = lambda s, t, h: o + u * s + v * t + n * h
    out = rounded_rect(span, VD, 0.02, 5); inset = rounded_rect(span - 0.012, VD - 0.012, 0.014, 5)
    inset = [(s + 0.006, t + 0.006) for s, t in inset]
    p = Piece()
    edge = [P(s, t, VT / 2) for s, t in out]
    top = [P(s, t, VT) for s, t in inset]; bot = [P(s, t, 0.0) for s, t in inset]
    p.grid([top, edge], WALL, closed=True, flip=True)       # the upper roll, outwards
    p.grid([edge, bot], WALL, closed=True, flip=True)       # the lower roll
    nt = len(p.v); p.v += [Vector(q) for q in top]; p.fan(list(range(nt, nt + len(top))), P(span / 2, VD / 2, VT + 0.002), WALL, flip=True)
    nb = len(p.v); p.v += [Vector(q) for q in bot]; p.fan(list(range(nb, nb + len(bot))), P(span / 2, VD / 2, -0.002), WALL, flip=False)
    return p
def cyl(a, b, r, seg=8, col=None):
    # a closed cylinder from a to b (steel unless col)
    col = col or STEEL
    ax = (b - a).normalized(); t = ax.cross(Vector((0, 1, 0))) if abs(ax.y) < 0.9 else ax.cross(Vector((1, 0, 0))); t.normalize(); bb = ax.cross(t)
    ring = lambda c: [c + (t * math.cos(2 * math.pi * k / seg) + bb * math.sin(2 * math.pi * k / seg)) * r for k in range(seg)]
    p = Piece(); r0, r1 = ring(a), ring(b)
    p.grid([r0, r1], col, closed=True)
    p.fan(list(range(0, seg)), a, col); p.fan(list(range(seg, 2 * seg)), b, col, flip=True)      # (the caps outwards: −axis at a, +axis at b)
    return p
def box(c, half, axes, col=None):
    # a closed box at c, half sizes along three axes (steel unless col)
    col = col or STEEL
    p = Piece(); ex, ey, ez = (a * h for a, h in zip(axes, half))
    corners = [c + ex * sx + ey * sy + ez * sz for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)):
        p.v += [corners[i] for i in f]; k = len(p.v) - 4; p.f.append((k, k + 1, k + 2, k + 3)); p.c.append(col)
    return p
def visor_hardware():
    o, u, v, n, span = visor_frame()
    a = o + u * (-0.006) + n * (VT / 2) + v * (-0.004); b = o + u * (span + 0.012) + n * (VT / 2) + v * (-0.004)
    p = Piece().add(cyl(a, b, 0.0045, 8))
    for s, w in ((span + 0.008, 0.010), (0.004, 0.008)):      # the pivot bracket (inner), the clip (outer)
        q = o + u * s + n * (VT / 2) + v * (-0.004)
        top = roofY(q.x) + 0.004; h = (top - q.y) / 2
        p.add(box(Vector((q.x, q.y + h, q.z)), (w / 2, h, 0.009), (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))))
    return p

# ---------------------------------------------------------------- the objects
def triangulate(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(ob.data); bm.free(); ob.data.update()
# facing: the open surfaces face into the cabin (towards its axis), the closed ones outwards (positive volume)
def facing_share(ob, axis_y=0.5):
    me = ob.data; good = 0
    for pl in me.polygons:
        c = pl.center; axis = Vector((0, axis_y, c.z))
        if pl.normal.dot(axis - c) > 0: good += 1
    return good / max(1, len(me.polygons))
def volume(ob):
    me = ob.data; vol = 0.0
    for pl in me.polygons:
        a, b, c = (me.vertices[i].co for i in pl.vertices); vol += a.dot(b.cross(c)) / 6
    return vol
def gap(ob, other):
    # the smallest distance from ob's vertices to other's surface
    t = BVHTree.FromObject(other, bpy.context.evaluated_depsgraph_get())
    return min(t.find_nearest(v.co)[3] for v in ob.data.vertices)

class Ctx: pass
ctx = Ctx()
ctx.__dict__.update(S=S, C=C, EYE=EYE, SILL=SILL, WTOP=WTOP, HW=HW, HWT=HWT, ROOF=ROOF, AFT=AFT, KX=KX, FLOOR=FLOOR, WS=WS,
    bandX=bandX, roofY=roofY, wsZ=wsZ, lowX=lowX, clamp=clamp, lerp=lerp, DEG=DEG, math=math, Vector=Vector, Matrix=Matrix,
    BVHTree=BVHTree, bpy=bpy, Piece=Piece, mirror_x=mirror_x, cyl=cyl, box=box, rounded_rect=rounded_rect,
    facing_share=facing_share, volume=volume, gap=gap, tris=tris)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.dont_write_bytecode = True   # (no __pycache__ in the repo)
import importlib
MODULES = {g: importlib.import_module('cockpit_' + g) for g in GROUPS if g != 'band'}

parts, owner = {}, {}
if 'band' in GROUPS:
    for k, v in {
        'headliner.roof': (headliner(), headliner_col),
        'roofTrims.trim': (Piece().add(roof_trim()).add(mirror_x(roof_trim())), None),
        'header.wall': (header(), None),
        'pillars.wall': (Piece().add(pillar()).add(mirror_x(pillar())), None),
        'seals.rubber': (Piece().add(header_seal()).add(pillar_seal()).add(mirror_x(pillar_seal())), None),
        'visors.wall': (Piece().add(visor()).add(mirror_x(visor())), None),
        'visorHw.steel': (Piece().add(visor_hardware()).add(mirror_x(visor_hardware())), None),
    }.items(): parts[k] = v; owner[k] = 'band'
for g, mod in MODULES.items():
    for k, v in mod.parts(ctx).items():
        assert k not in parts, ('two parts named', k)
        assert k.split('.')[0] in mod.GROUPS, (g, 'a node outside its groups', k, mod.GROUPS)
        parts[k] = v; owner[k] = g
for k in parts:                       # "<group>.<surface>[.<moving part>][.pa28|.pa44]", the surface one of cockpit.js's
    bits = k.split('.'); assert 2 <= len(bits) <= 4 and bits[1] in C, ('a node name the game cannot read', k)
objs = {k: to_object(k, pc, COL, vcol) for k, (pc, vcol) in parts.items()}
for k, ob in objs.items(): ob.name = k; ob.data.name = k
for ob in objs.values(): triangulate(ob)

if 'band' in GROUPS:
    for k in ('headliner.roof', 'header.wall', 'pillars.wall', 'roofTrims.trim'):
        assert facing_share(objs[k]) > 0.8, (k, 'faces outwards', facing_share(objs[k]))
    for k in ('visors.wall', 'visorHw.steel'):
        assert volume(objs[k]) > 0, (k, 'inside out', volume(objs[k]))
    # the visors and their hardware clear the header (they hang from the headliner behind it)
    for k in ('visors.wall', 'visorHw.steel'):
        d = gap(objs[k], objs['header.wall']); assert d > 0.003, (k, 'touches the header', d)
for g, mod in MODULES.items():
    if hasattr(mod, 'check'): mod.check(ctx, objs)

# ---------------------------------------------------------------- the occlusion of what is close by → alpha
# Rays 5 cm long (cosine-weighted over the hemisphere) against these parts and a proxy of the cabin round them: the
# top of the window band, the aft bulkhead, the overhead console, the compass case and the windshield's centre post,
# and what each group adds (proxies). The preview shows the proxy (grey) round the parts.
# A moving part's occlusion comes from its own pieces only (it moves against everything else), and it shades nothing.
def moving_of(k): return next((t for t in k.split('.')[2:] if t not in ('pa28', 'pa44')), None)
def bvh_of(keys):
    bm = bmesh.new()
    for k in keys:
        m2 = objs[k].data.copy(); bm.from_mesh(m2); bpy.data.meshes.remove(m2)
    return bm
occl = bvh_of([k for k in objs if not moving_of(k)]); prox = bmesh.new()
def proxy_quad(a, b, c, d):
    for bm in (occl, prox):
        vs = [bm.verts.new(v) for v in (a, b, c, d)]; bm.faces.new(vs)
def proxy_box(c, s):
    hx, hy, hz = (v / 2 for v in s); cs = [Vector((c[0] + sx * hx, c[1] + sy * hy, c[2] + sz * hz)) for sx in (-1, 1) for sy in (-1, 1) for sz in (-1, 1)]
    for f in ((0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)): proxy_quad(*(cs[i] for i in f))
for sd in (-1, 1):
    y0 = WTOP - 0.05
    proxy_quad((sd * bandX(y0), y0, S['fire']), (sd * bandX(WTOP), WTOP, S['fire']), (sd * bandX(WTOP), WTOP, AFT), (sd * bandX(y0), y0, AFT))
proxy_quad((-HW, S['floor'], AFT), (HW, S['floor'], AFT), (HW, ROOF + 0.02, AFT), (-HW, ROOF + 0.02, AFT))
proxy_box(S['console']['pos'], S['console']['size'])
cc = S['compass']
for key in ('body', 'hanger'):
    w, h, d, ox, oy, oz = S['compassCase'][key]; proxy_box((cc[0] + ox, cc[1] + oy, cc[2] + oz), (w, h, d))
for k in range(6):                                       # (the windshield's centre strip: cockpit.js's flat double strip)
    y0, y1 = lerp(WS['y0'] - 0.004, WS['y1'] - 0.01, k / 6), lerp(WS['y0'] - 0.004, WS['y1'] - 0.01, (k + 1) / 6)
    proxy_quad((-0.0095, y0, wsZ(0, y0) + 0.0016), (0.0095, y0, wsZ(0, y0) + 0.0016), (0.0095, y1, wsZ(0, y1) + 0.0016), (-0.0095, y1, wsZ(0, y1) + 0.0016))
for g, mod in MODULES.items():
    for pr in (mod.proxies(ctx) if hasattr(mod, 'proxies') else []):
        if pr[0] == 'quad': proxy_quad(*pr[1:])
        else: proxy_box(*pr[1:])
OBVH = BVHTree.FromBMesh(occl)
MBVH = {m: BVHTree.FromBMesh(bvh_of([k for k in objs if moving_of(k) == m])) for m in sorted({moving_of(k) for k in objs} - {None})}
NDIR = 32
DIRS = []
for i in range(NDIR):                                    # a cosine-weighted hemisphere (local z up)
    u = (i + 0.5) / NDIR; r = math.sqrt(u); a = i * 2.399963
    DIRS.append((r * math.cos(a), r * math.sin(a), math.sqrt(1 - u)))
def bake_local_ao(ob, bvh, reach=0.05, strength=0.6, floor=0.6):
    me = ob.data; vals = []
    for vt in me.vertices:
        n = vt.normal
        t = n.cross(Vector((0, 1, 0))) if abs(n.y) < 0.9 else n.cross(Vector((1, 0, 0))); t.normalize(); b = n.cross(t)
        hit = 0.0
        for dx, dy, dz in DIRS:
            d = t * dx + b * dy + n * dz
            loc, _, _, dist = bvh.ray_cast(vt.co + n * 0.002, d, reach)
            if loc is not None: hit += (1 - dist / reach) ** 0.5
        vals.append(clamp(1 - strength * hit / NDIR, floor, 1))
    col = me.color_attributes['COLOR_0']
    for l in me.loops:
        c = col.data[l.index].color; col.data[l.index].color = (c[0], c[1], c[2], vals[l.vertex_index])
    me.color_attributes.active_color = col
for k, ob in objs.items(): bake_local_ao(ob, MBVH[moving_of(k)] if moving_of(k) else OBVH)

counts = {k: tris(ob) for k, ob in objs.items()}
print('triangles', counts, 'total', sum(counts.values()))
for g in GROUPS:
    n, cap = sum(v for k, v in counts.items() if owner[k] == g), MAX_TRIS if g == 'band' else MODULES[g].MAX_TRIS
    print('group', g, n, 'of', cap); assert n <= cap, ('over the budget of', g, n, cap)

# ---------------------------------------------------------------- a preview (Cycles, from the pilot's eye) and the glTF
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    sc = bpy.context.scene
    sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24; sc.cycles.use_denoising = False
    sc.render.resolution_x, sc.render.resolution_y = 1000, 640
    mat = bpy.data.materials.new('band'); mat.use_nodes = True
    nt = mat.node_tree; bsdf = nt.nodes['Principled BSDF']
    ca = nt.nodes.new('ShaderNodeVertexColor'); ca.layer_name = 'COLOR_0'
    mul = nt.nodes.new('ShaderNodeMix'); mul.data_type = 'RGBA'; mul.blend_type = 'MULTIPLY'; mul.inputs[0].default_value = 1.0
    gam = nt.nodes.new('ShaderNodeGamma'); gam.inputs['Gamma'].default_value = 2.2
    nt.links.new(ca.outputs['Color'], gam.inputs['Color']); nt.links.new(gam.outputs['Color'], mul.inputs[6]); nt.links.new(ca.outputs['Alpha'], mul.inputs[7])
    nt.links.new(mul.outputs[2], bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value = 0.7
    for o in objs.values(): o.data.materials.clear(); o.data.materials.append(mat)
    pm = bpy.data.meshes.new('context'); prox.to_mesh(pm); po = bpy.data.objects.new('context', pm); AUX.objects.link(po)
    gm = bpy.data.materials.new('context'); gm.diffuse_color = (0.35, 0.35, 0.36, 1); gm.use_nodes = True
    gm.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (0.25, 0.25, 0.26, 1); pm.materials.append(gm)
    sun = bpy.data.objects.new('sun', bpy.data.lights.new('sun', 'SUN')); sun.data.energy = 2.5; sc.collection.objects.link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
    world = bpy.data.worlds.new('w'); sc.world = world; world.use_nodes = True
    world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.6, 0.7, 0.85, 1); world.node_tree.nodes['Background'].inputs['Strength'].default_value = 1.0
    cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.sensor_fit = 'VERTICAL'; cam.data.angle = 75 * DEG; cam.data.clip_start = 0.02
    views = {}
    if 'band' in GROUPS: views.update({'band-ahead': (0, 10), 'band-up': (0, 40), 'band-left': (35, 25), 'band-right': (-40, 20)})
    for g, mod in MODULES.items(): views.update({f'{g}-{k}': v for k, v in getattr(mod, 'PREVIEW', {}).items()})
    for name, view in views.items():
        yaw, pitch = view[0], view[1]; eye = Vector(view[2]) if len(view) > 2 else EYE
        d = Vector((-math.sin(yaw * DEG) * math.cos(pitch * DEG), math.sin(pitch * DEG), -math.cos(yaw * DEG) * math.cos(pitch * DEG)))
        rx = d.cross(Vector((0, 1, 0))).normalized(); uy = rx.cross(d)
        M = Matrix((rx, uy, -d)).transposed().to_4x4(); M.translation = eye
        cam.matrix_world = M
        sc.render.filepath = os.path.join(PREVIEW, f'{name}.png')
        bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='DESELECT')
for o in objs.values(): o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', use_selection=True, export_yup=False, export_apply=True,
    export_materials='NONE', export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
    export_animations=False, export_skins=False, export_morph=False, export_extras=False, export_tangents=False)
print('wrote', OUT, os.path.getsize(OUT))
