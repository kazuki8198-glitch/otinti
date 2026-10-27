# CADET — tools/aircraft/cockpit_walls.py : the side walls of the flown aircraft's cabin (aircraft/cockpit.js) — the walls
# under and round the windows, the door, the armrests, the window surrounds and the pilot's storm window —, a part module
# of tools/aircraft/build_cockpit.py (run by it, never alone; see its header):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-]
#   (a group alone, for its previews: … -- /tmp/cockpit.json /tmp/trial.glb /tmp/prev band,seats,glareshield,yokes,walls —
#   never into assets/model, which must hold every group; tools/aircraft/trial-glb.mjs runs the game's tests against such
#   a trial model)
# The Archer TX's light interior as Piper's photos show it (tx_leftfront, tx_leftrear, tx_topleft, the interior through
# the door, panel_right's handle cup, tx_top's latch plate; the POH, the maintenance manual's door), on both sides:
# - the upper band (walls.wall, near-white): one moulding from the split under the windows (walls.sb) up the window band to
#   under the roof-edge trim, from the panel to the aft bulkhead, round the three side windows: each window in a raised
#   surround (5.5 cm wide, 1 cm high, its inner edge rounded down into the reveal to the glass; along the roof trim it
#   flattens out under the trim, and in front it runs in under the A-pillar trim), the posts between them flat; white
#   screw heads along its foot and on the front and rear surrounds' lower edges. The windows' rubber seal (walls.rubber)
#   where the reveal meets the glass: the openings and the glass are cockpit.js's (WIN: the outlines W1–W3, their corners
#   rounded as its rounded() draws them, the glass 1.6 cm outboard of the band's plane); the seal covers 4.6 mm round
#   them, outside the opening.
# - the lower panels (walls.wallLow, light grey): proud of the band (walls.proud: 6 mm up by the split, 2.5 mm low down,
#   by the fuel selector and the seats' pans), their top edge a rounded lip along the split, following the lower wall's
#   soft profile (lowX) to the floor; a joint between the front and rear ones aft of the front seats (walls.joint; on the
#   right it is the door's aft edge). Moulded armrests (flat top, rounded front edge, the finger recess under it, the
#   front end angled back towards the foot; walls.arm, armRear): beside the front seats as tx_leftfront has them —
#   measured against the split and the window's foot: their top ~11 cm under the split, ahead of the instructor's elbow —,
#   and on the rear panels from the joint back under the rear windows (tx_leftrear), with a black USB bezel and a small
#   switch over them.
# - the left wall forward of the pilot: the mesh map pocket (a light-grey frame, its top lip wider, the black mesh bulging
#   at its foot) under the split, over the armrest's forward part; the hand mic in it, its cord over the rim, hanging in a
#   loop ahead of the armrest and running forward to the panel's corner (clear of the fuel selector and of the line of
#   sight to it); the kick panel: the wall turned in, flat in the fuel selector's plane (cockpit.js FUELSEL: the plane
#   4 mm behind its plate) from where it meets the wall down to the floor and forward to ~9 cm ahead of the plate's
#   middle, its top easing back into the wall, ending forward in a step back to the wall (unseen: every view is from the
#   seats). Round the bezel's upper aft edge the wall comes ~2 mm in front of that plane (FUELSEL puts the bezel's
#   outboard edge 2 mm inside the wall), so the bezel's skirt goes into the wall there. A low air outlet ahead of it (one
#   on the right too). The pilot's storm window in the front window, standing on its lower edge in its forward half: the
#   pane's edges do not show in the photos — its hinge strip along its foot with its knuckles' notches, and the
#   trapezoid wire bail on the strip's ends up to near the pane's top (walls.postAlu — a light alu: a metal renders dark
#   under the cabin's dim environment light —, walls.black). The game's front window leans back at its front edge (with
#   the windshield's post), so the storm window (22 × 22 cm) is lower than the photos' (they show it nearly as tall as
#   the window, close to its front edge).
# - the door (right): its outline as a dark rubber seal round its inner panel (along the A-pillar trim, under the roof
#   trim over its window — there it covers the glass's top 4.5 mm, just under the trim's lip —, down its aft edge with big
#   rounded corners, along the sill and up its low front edge); the inside handle in a black oval cup on its forward part
#   just behind the panel, between the panel and the right yoke's horn as the pilot sees it: a rubber rim (standing on the
#   band over the split, on the lower panel under it), the lever on the cup's flat bottom (pivot up, grip down, turned
#   out), its pivot screw, the white up / down arrows (OPEN is cockpit.js's label); the upper latch a little aft of the
#   middle of its top edge (the chrome slotted plate under the roof trim, the black lever hooked into it; ENGAGE LATCH
#   BEFORE FLIGHT is cockpit.js's placard); the black scuff plate under its sill.
# Made to the cabin's layout (the spec: the window band and the lower wall's curves, WIN, FUELSEL, the walls' own layout
# walls — the split, the armrests', the pocket's, the door's, its cup's and the storm window's places, the door control's
# box and aim that cockpit.js keeps with them), and to what other code relies on: the openings and the glass (not moved,
# not narrowed), the band's A-pillar and roof trims (the surrounds run in under them: build_cockpit.py's pillar_section
# and TRIM_PROF), the shoulder ray's wall (cockpit.test: ±x from (−0.30, 0.35, −0.40) meets the wall at |x| 0.52–0.60)
# and the eye-level glass, the fuel selector's and the door handle's sight lines, the door's hit box inside its cup, the
# seats' pans, the yokes' sweep (fore and aft, rolled both ways), the instructor's arms (actor.test's copies of the right
# wall and the door armrest's box), the LIMITATIONS placard flat on the band — check() asserts them.
# How it is built: the band and the lower panels are surfaces over the wall's (z, y), triangulated (mathutils'
# constrained Delaunay) round the holes the surrounds sit in and the cup, with rows of vertices where the profile bends
# and enough in between for the sky's occlusion that cockpit.js bakes per vertex; each window's surround is a loft of
# one profile round its opening (squeezed where a trim is close), the armrests lofts of one section, the rest small
# lofts, tubes and boxes. The left side is made on the right (x > 0) and mirrored.
# Coordinates: the cabin's frame (metres, x = the right wing, y = up, z = aft), as build_cockpit.py.
# Nodes ("<group>.<surface>", the surfaces cockpit.js's S): walls.wall, walls.wallLow (the lower panels, their lip, the
# armrests, the pocket's frame lighter, the panels' joint darker), walls.rubber (the windows' and the door's seals, the
# cup's rim), walls.black (the pocket's mesh, the mic and its cord, the cup and its lever, the USB bezels, the vents, the
# latch lever, the scuff plate, the hinge strip's notches), walls.chrome (the latch plate, screws), walls.postAlu (the
# storm window's hinge strip and bail), walls.white (the cup's arrows). COLOR_0 rgb: the table's colours (the joint and
# the cup's lever shaded); alpha: build_cockpit.py's occlusion of what is close by.
import math
from mathutils import Vector, geometry
from mathutils.bvhtree import BVHTree

GROUPS = ('walls',)
MAX_TRIS = 4300                       # (they replace ~6,100 triangles of sheets, slabs and rounded boxes in code)
DEG = math.pi / 180
_G = {}

# the views of the preview (yaw, pitch [, eye]; build_cockpit.py: yaw 0 looks forward, + to the left)
PREVIEW = {
    'left': (72, -14), 'leftDown': (48, -38), 'storm': (58, -2), 'kick': (30, -55, (-0.30, 0.40, -0.62)),
    'right': (-58, -14), 'cup': (-62, -12, (0.18, 0.40, -0.70)), 'rightUp': (-68, 14), 'latch': (-90, 20, (0.20, 0.62, -0.42)),
    'backL': (128, -12), 'backR': (-128, -12), 'rearL': (95, -15, (0.10, 0.45, 0.30)),
}

def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t
def smooth(a, b, x):
    t = clamp((x - a) / (b - a), 0.0, 1.0); return t * t * (3 - 2 * t)
def shade(c, k): return tuple(v * k for v in c)
def mix(a, b, t): return tuple(lerp(p, q, t) for p, q in zip(a, b))
def V2(z, y): return Vector((z, y))

# ---------------------------------------------------------------- the layout (the spec), made on the right (x > 0)
class Lay: pass
def layout(ctx):
    if 'L' in _G: return _G['L']
    S = ctx.S; o = Lay(); o.ctx = ctx; o.S = S
    for k in ('SILL', 'WTOP', 'HW', 'HWT', 'AFT', 'FLOOR', 'KX', 'ROOF', 'EYE'): setattr(o, k, getattr(ctx, k))
    o.FIRE, o.PZ, o.PBOT, o.PTOP = S['fire'], S['pz'], S['pbot'], S['ptop']
    o.bandX, o.lowX, o.wsZ = ctx.bandX, ctx.lowX, ctx.wsZ
    o.W = S['walls']; o.SB = o.W['sb']; o.FIL = 0.02                 # (FIL: the round where the band leans in at the sill)
    win = S['windows']; o.WINS = [([V2(*p) for p in w], r) for w, r in zip(win['W'], win['r'])]; o.GLASS = win['glass']
    # the fuel selector (on the left: made here on the right, mirrored): its plate's middle and normal, the kick panel's
    # plane 4 mm behind the plate's (cockpit.js FUELSEL: the bezel's rim goes 6 mm behind the plate, its moulding behind
    # that); the flat patch round it to zF (forward) and yh (up), its top easing into the wall over hr
    fs = S['fuelSel']; c, n = Vector(fs['c']), Vector(fs['n'])
    o.fsc, o.fsn = Vector((-c.x, c.y, c.z)), Vector((-n.x, n.y, n.z))
    o.fcp = o.fsc - o.fsn * 0.004; o.fsR = fs['r'] + fs['rim']
    o.zF = c.z - 0.092; o.yh = c.y + 0.095 * math.sqrt(1 - n.y ** 2) + 0.002; o.hr = 0.07
    o.zc_h = crease_z(o, o.yh)
    D = o.W['door']; o.cup = D['cup']
    _G['L'] = o
    return o

# the band (right side): upright to SILL − FIL, the window band's leaning plane (bandX) from SILL + FIL, a round between;
# a point h in from it along its normal (towards the cabin)
def band_x(o, y):
    if y <= o.SILL - o.FIL: return o.HW
    if y >= o.SILL + o.FIL: return o.bandX(y)
    return o.HW + o.KX * (y - o.SILL + o.FIL) ** 2 / (4 * o.FIL)
def band_dx(o, y):
    if y <= o.SILL - o.FIL: return 0.0
    if y >= o.SILL + o.FIL: return o.KX
    return o.KX * (y - o.SILL + o.FIL) / (2 * o.FIL)
def band_n(o, y):
    s = band_dx(o, y); L = math.sqrt(1 + s * s); return Vector((-1 / L, s / L, 0))
def band_pt(o, z, y, h):
    return Vector((band_x(o, y), y, z)) + band_n(o, y) * h
# the lower panels: proud of lowX by t (2.5 mm low down, 6 mm up by the split)
def wall_t(o, y):
    p = o.W['proud']; return lerp(p[1], p[0], smooth(p[2], p[3], y))
def wall_x(o, y): return o.lowX(y) - wall_t(o, y)
# the kick panel (the left side's, made on the right): the fuel selector's plane; its inset in from the wall
def plane_x(o, y, z):
    c, n = o.fcp, o.fsn; return c.x - (n.y * (y - c.y) + n.z * (z - c.z)) / n.x
def kick_d(o, y, z): return wall_x(o, y) - plane_x(o, y, z)
def crease_z(o, y):
    # where the plane meets the wall at height y (kick_d = 0; it is linear in z)
    c, n = o.fcp, o.fsn; xw = wall_x(o, y)
    return c.z + (n.x * (c.x - xw) - n.y * (y - c.y)) / n.z
def low_x(o, y, z, kick):
    xw = wall_x(o, y)                                      # (tolerances: the 2D points are mathutils' 32-bit floats)
    if not kick or z < o.zF - 1e-5: return xw
    if y <= o.yh + 1e-5:
        d = kick_d(o, y, z); return xw - d if d > 0 else xw
    if y < o.yh + o.hr and z <= o.zc_h + 1e-5:
        return xw - max(0.0, kick_d(o, o.yh, z)) * (1 - (y - o.yh) / o.hr)
    return xw
# the band's A-pillar trims' aft toe (build_cockpit.py pillar_section: its last points at wsZ(bandX, y) + 0.041..0.043)
def pillar_toe(o, y): return o.wsZ(o.bandX(y), y) + 0.041

# ---------------------------------------------------------------- 2D helpers (z, y)
def inside(poly, p):
    c = False; n = len(poly)
    for i in range(n):
        a, b = poly[i], poly[i - 1]
        if (a.y > p.y) != (b.y > p.y) and p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x: c = not c
    return c
def seg_dist(p, a, b):
    ab = b - a; t = clamp((p - a).dot(ab) / max(ab.length_squared, 1e-18), 0, 1); return (a + ab * t - p).length
def line_dist(p, pts, closed=True):
    n = len(pts); m = n if closed else n - 1
    return min(seg_dist(p, pts[i], pts[(i + 1) % n]) for i in range(m))
def ellipse(c, a, b, t0, t1, n):
    return [V2(c[0] + a * math.cos(lerp(t0, t1, k / n)), c[1] + b * math.sin(lerp(t0, t1, k / n))) for k in range(n + 1)]

# ---------------------------------------------------------------- pieces
def tri_normal(p, f):
    a, b, c = p.v[f[0]], p.v[f[1]], p.v[f[2]]; return (b - a).cross(c - a)
def orient(p, i0, ref):
    # the faces from i0 on turned (all together) so that their summed normal points along ref
    s = Vector((0, 0, 0))
    for f in p.f[i0:]: s += tri_normal(p, f)
    if s.dot(Vector(ref)) < 0: p.f[i0:] = [tuple(reversed(f)) for f in p.f[i0:]]
def compact(p):
    used = sorted({i for f in p.f for i in f}); m = {o: k for k, o in enumerate(used)}
    p.v = [p.v[i] for i in used]; p.f = [tuple(m[i] for i in f) for f in p.f]
    return p
def cdt(o, outer, holes, edges, steiner, xyz, col):
    # a surface over (z, y): the outer polygon with holes, constraint polylines, extra vertices; xyz(z, y) → 3D. Faces
    # anticlockwise in (z, y) face −x (into the cabin, on the right side)
    vs, faces, E = [], [], []
    def poly(pts):
        i0 = len(vs); vs.extend(pts); faces.append(list(range(i0, i0 + len(pts))))
    poly(outer)
    for h in holes: poly(h)
    for line in edges:
        i0 = len(vs); vs.extend(line); E.extend((i0 + k, i0 + k + 1) for k in range(len(line) - 1))
    vs.extend(steiner)
    ov, _, of, orig, _, _ = geometry.delaunay_2d_cdt(vs, E, faces, 2, 1e-7, True)
    pos = [vs[g[0]] if g else v for v, g in zip(ov, orig)]           # (the input's exact positions where they came from it)
    p = o.ctx.Piece(); p.v = [xyz(q.x, q.y) for q in pos]
    for f in of:
        a, b, c = (pos[i] for i in f)
        p.f.append(tuple(f) if (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y) > 0 else tuple(reversed(f))); p.c.append(col)
    return compact(p)
def steiner_grid(zs, ys, keep):
    return [V2(z, y) for z in zs for y in ys if keep(V2(z, y))]
def tube(o, pts, r, sides, col, closed_ends=True, per=2):
    # a tube along a smooth path (Catmull–Rom through pts, per points a span), its ends capped
    P = [Vector(p) for p in pts]; path = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(0, i - 1)], P[i], P[i + 1], P[min(len(P) - 1, i + 2)]
        for k in range(per if i < len(P) - 2 else per + 1):
            t = k / per
            path.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    rings = []; prev = None
    for i, c in enumerate(path):
        tg = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        u = (prev - tg * prev.dot(tg)).normalized() if prev is not None else tg.cross(Vector((0, 1, 0)) if abs(tg.y) < 0.9 else Vector((1, 0, 0))).normalized()
        prev = u; w = tg.cross(u)
        rings.append([c + (u * math.cos(2 * math.pi * k / sides) + w * math.sin(2 * math.pi * k / sides)) * r for k in range(sides)])
    p = o.ctx.Piece(); p.grid(rings, col, closed=True)
    if closed_ends:
        p.fan(list(range(0, sides)), path[0], col)                                    # (outwards: −tangent at the start)
        p.fan(list(range(len(rings) * sides - sides, len(rings) * sides)), path[-1], col, flip=True)
    return p
def dome(o, c, nrm, r, h, col, sides=5):
    # a screw's head: a low cone on a surface
    n = Vector(nrm).normalized(); u = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized(); w = n.cross(u)
    p = o.ctx.Piece(); p.v = [c + n * 0.0002 + (u * math.cos(2 * math.pi * k / sides) + w * math.sin(2 * math.pi * k / sides)) * r for k in range(sides)]
    p.fan(list(range(sides)), c + n * h, col); orient(p, 0, n)
    return p
def quad(o, a, b, c, d, col, ref):
    p = o.ctx.Piece(); p.v = [Vector(a), Vector(b), Vector(c), Vector(d)]; p.f = [(0, 1, 2, 3)]; p.c = [col]; orient(p, 0, ref); return p

# ---------------------------------------------------------------- the windows' openings and surrounds
# each opening as cockpit.js's rounded() draws it (its corners quadratic curves from rr along the edges, rr = min(r, 0.45
# of either edge)); stations round it anticlockwise in (z, y): (point, tangent) — the outward normal is (t.y, −t.x).
# segs: per corner (from W[i]) and per edge (from corner i to i + 1) how many spans (the top ones under the roof trim few)
SEGS = [((3, 3, 2, 2), (3, 1, 1, 2)), ((3, 3, 2, 2), (3, 1, 1, 1)), ((2, 2, 2, 2), (1, 1, 1, 1))]
def opening(o, k):
    W, r = o.WINS[k]; n = len(W); cs, es = SEGS[k]; corners = []
    for i in range(n):
        p0, p1, p2 = W[i - 1], W[i], W[(i + 1) % n]; d0, d1 = (p1 - p0).length, (p2 - p1).length; rr = min(r, 0.45 * d0, 0.45 * d1)
        corners.append((p1 + (p0 - p1) / d0 * rr, p1, p1 + (p2 - p1) / d1 * rr))
    st = []
    for i in range(n):
        a, p1, b = corners[i]
        for j in range(cs[i]):
            t = j / cs[i]
            st.append((a * (1 - t) ** 2 + p1 * 2 * t * (1 - t) + b * t * t, ((p1 - a) * 2 * (1 - t) + (b - p1) * 2 * t).normalized()))
        a2 = corners[(i + 1) % n][0]
        for j in range(es[i]): st.append((b.lerp(a2, j / es[i]), (a2 - b).normalized()))
    return st
# the surround's profile: (out from the opening, in from the band's plane) — the reveal from behind the glass up, the
# rounded inner edge, the crown, the outer slope down to the band; the seal on the glass into the reveal's foot
PROF = [(0.004, -0.0175), (0.0045, 0.0005), (0.0060, 0.0058), (0.0092, 0.0090), (0.0145, 0.0102), (0.034, 0.0095), (0.046, 0.0050), (0.055, 0.0)]
SEAL = [(0.0, -0.0153), (0.0046, -0.0118)]
def fade(o, y): return 1 - smooth(0.700, 0.728, y)        # (flat under the roof trim: its lower lip at y 0.727)
def lip_ok(o, k, q):
    if q.y > o.WTOP - 0.002: return False                  # (under the roof trim, inside the band's top edge)
    if k == 0 and q.y >= 0.405 and q.x < pillar_toe(o, q.y) - 0.036: return False   # (in under the A-pillar trim, not past it)
    return True
def surround(o, k):
    # → the lip's rings (3D, per profile point), the seal's rings, the outer edge (2D, the band's hole)
    st = opening(o, k); d2, dL = PROF[2][0], PROF[-1][0]; rings = [[] for _ in PROF]; seal = [[] for _ in SEAL]; edge = []
    for P, T in st:
        N = V2(T.y, -T.x)
        dmax = dL
        if not lip_ok(o, k, P + N * dL):
            lo, hi = d2, dL
            for _ in range(30):
                m = (lo + hi) / 2
                if lip_ok(o, k, P + N * m): lo = m
                else: hi = m
            dmax = lo
        for j, (d, h) in enumerate(PROF):
            if j >= 3: d = d2 + (d - d2) * (dmax - d2) / (dL - d2)
            q = P + N * d
            rings[j].append(band_pt(o, q.x, q.y, h * fade(o, q.y) if h > 0 else h))
            if j == len(PROF) - 1: edge.append(q)
        for j, (d, h) in enumerate(SEAL):
            q = P + N * d; seal[j].append(band_pt(o, q.x, q.y, h))
    return rings, seal, edge

# ---------------------------------------------------------------- the armrests
def armrest(o, A, col, rear=False):
    y1, H, D = A['y1'], A['h'], A['d']
    if not rear:
        sec = [(-0.003, y1 - 0.004), (0.003, y1 + 0.0003), (D - 0.010, y1 + 0.0008), (D - 0.005, y1 - 0.0005), (D - 0.0013, y1 - 0.0042), (D, y1 - 0.010),
               (D, y1 - 0.033), (D - 0.0013, y1 - 0.0383), (D - 0.005, y1 - 0.042), (D - 0.010, y1 - 0.0433), (0.016, y1 - 0.038), (0.005, y1 - 0.055), (-0.003, y1 - H)]
        us = [(0.0, 0.14), (0.025, 0.62), (0.08, 0.93), (0.90, 0.96), (0.97, 0.7), (1.0, 0.18)]
    else:
        sec = [(-0.003, y1 - 0.004), (0.003, y1 + 0.0003), (D - 0.009, y1 + 0.0008), (D - 0.0026, y1 - 0.0025), (D, y1 - 0.010), (D, y1 - 0.022),
               (D - 0.0035, y1 - 0.029), (D - 0.010, y1 - 0.032), (0.012, y1 - 0.027), (-0.003, y1 - H)]
        us = [(0.0, 0.14), (0.04, 0.75), (0.93, 0.95), (1.0, 0.18)]
    slope = 0.75                                           # (the front end angled: the top furthest forward)
    rows = []
    for u, e in us:
        rows.append([Vector((wall_x(o, y) - (h * e if h > 0 else h), y, lerp(A['z0'] + slope * (y1 - y), A['z1'], u))) for h, y in sec])
    p = o.ctx.Piece(); p.grid(rows, col); orient(p, 0, (-1, 0.25, 0))
    for ring, ref in ((rows[0], (0, 0, -1)), (rows[-1], (0, 0, 1))):
        i0 = len(p.v); p.v += [Vector(v) for v in ring]; f0 = len(p.f)
        p.fan(list(range(i0, i0 + len(ring))), sum(ring, Vector((0, 0, 0))) / len(ring) + Vector((0.004, 0, 0)), col); orient(p, f0, ref)
    return p

# ---------------------------------------------------------------- one side, made on the right (x > 0)
def side(o, left):
    C = o.ctx.C; Piece = o.ctx.Piece
    WALL, LOW, RUB, BLK, CHR, WHT = (tuple(C[k]) for k in ('wall', 'wallLow', 'rubber', 'black', 'chrome', 'white'))
    out = {k: Piece() for k in ('wall', 'wallLow', 'rubber', 'black', 'chrome', 'postAlu', 'white')}
    log = _G.setdefault('count', {}); last = [0]
    def mark(label):                                      # (the triangles each part takes, for the build's printout)
        t = sum(sum(len(f) - 2 for f in p.f) for p in out.values()); log[label] = log.get(label, 0) + t - last[0]; last[0] = t
    o.mark = mark
    SB, FL, AFT, W = o.SB, o.FLOOR, o.AFT, o.W
    cup = None if left else o.cup
    kick = left
    # ---- the window surrounds and their seals
    holes = []
    for k in range(3):
        rings, seal, edge = surround(o, k)
        p = Piece(); p.grid(rings, WALL, closed=True); orient(p, 0, (-1, 0, 0)); out['wall'].add(p)
        s = Piece(); s.grid(seal, RUB, closed=True); orient(s, 0, (-1, 0, 0)); out['rubber'].add(s)
        holes.append(edge)
    mark('surrounds+seals')
    # ---- the cup's outline (the right side): the band's notch over the split, the lower panel's under it
    if cup:
        cz, cy, ca, cb = cup['z'], cup['y'], cup['a'], cup['b']; tR = math.asin((SB - cy) / cb)
        arcA = ellipse((cz, cy), ca, cb, math.pi - tR, tR, 10)                   # (over the top, left to right)
        arcB = ellipse((cz, cy), ca, cb, tR, -math.pi - tR, 16)                  # (under it, right to left)
    # ---- the band: from the split up to the window band's top, the panel (behind it: −1.20) to the aft bulkhead
    zf = lambda y: pillar_toe(o, y) - 0.040
    RA = [0.30, 0.345, 0.37, 0.39, 0.45, 0.55, 0.65]
    outer = [V2(-1.20, SB)] + (arcA if cup else []) + [V2(AFT, SB)] + [V2(AFT, y) for y in RA] + [V2(AFT, o.WTOP)]
    outer += [V2(zf(y), y) for y in (o.WTOP, 0.70, 0.65, 0.60, 0.55, 0.50, 0.45, 0.405)] + [V2(-1.20, 0.405), V2(-1.20, 0.39), V2(-1.20, 0.37), V2(-1.20, 0.345), V2(-1.20, 0.30)]
    zsA = [-1.12, -1.02, -0.92, -0.82, -0.72, -0.62, -0.52, -0.42, -0.32, -0.22, -0.13, 0.05, 0.30, 0.55, 0.72, 0.90, 1.10, 1.32, 1.50]
    keepA = lambda q: inside(outer, q) and line_dist(q, outer) > 0.012 and all(not inside(h, q) and line_dist(q, h) > 0.012 for h in holes)
    stA = steiner_grid(zsA, RA, keepA)
    out['wall'].add(cdt(o, outer, holes, [], stA, lambda z, y: band_pt(o, z, y, 0.0), WALL))
    mark('band')
    # ---- the lower panels: from the floor to the split, FIRE to the aft bulkhead (on the left: the kick panel's patch
    # and its creases, and the step back to the wall at zF ahead of it, a domain of its own)
    RB = [-0.36, -0.31, -0.25, -0.18, -0.10, -0.03, 0.06, 0.16]
    RBr = [-0.31, -0.18, -0.03, 0.06, 0.16]               # (aft of the joint: seen from further)
    zsB = [-1.28, -1.13, -1.03, -0.93, -0.83, -0.73, -0.63, -0.53, -0.43, -0.32, -0.235]
    zsBr = [-0.10, 0.10, 0.35, 0.60, 0.85, 1.10, 1.38]
    xyzB = lambda z, y: Vector((low_x(o, y, z, kick), y, z))
    if not left:
        outer = [V2(o.FIRE, FL), V2(AFT, FL)] + [V2(AFT, y) for y in RB] + [V2(AFT, SB)] + arcB + [V2(o.FIRE, SB)] + [V2(o.FIRE, y) for y in reversed(RB)]
        door = W['door']
        keepB = lambda q: inside(outer, q) and line_dist(q, outer) > 0.012 and abs(q.x - door['z1']) > 0.01
        stB = steiner_grid(zsB, RB, keepB) + steiner_grid(zsBr, RBr, keepB) + [V2(door['z1'], y) for y in RB if keepB(V2(door['z1'] + 0.02, y))]
        out['wallLow'].add(cdt(o, outer, [], [], stB, xyzB, LOW))
    else:
        zF, yh, hr, zch = o.zF, o.yh, o.hr, o.zc_h
        YF = sorted(set([FL] + [y for y in RB] + [yh, yh + hr, SB]))
        ycs = [FL, -0.37, -0.33, -0.28, -0.23, -0.18, -0.13, -0.08, -0.03, 0.0, yh]
        crease = [V2(crease_z(o, y), y) for y in ycs]
        outer = [V2(zF, FL), crease[0], V2(AFT, FL)] + [V2(AFT, y) for y in RB] + [V2(AFT, SB), V2(zF, SB)] + [V2(zF, y) for y in reversed(YF) if FL < y < SB]
        edges = [crease, [V2(zF, yh), V2(zch, yh)], [V2(zch, yh), V2(zch, yh + hr)], [V2(zF, yh + hr), V2(zch, yh + hr)]]
        hz = [lerp(zF, zch, t) for t in (0.2, 0.4, 0.6, 0.8)]
        keepB = lambda q: inside(outer, q) and line_dist(q, outer) > 0.012 and all(line_dist(q, e, False) > 0.01 for e in edges) and abs(q.x - W['joint']) > 0.01
        stB = steiner_grid([z for z in zsB if z > zF], RB, keepB) + steiner_grid(zsBr, RBr, keepB) + [V2(z, yh + hr * t) for z in hz for t in (0.33, 0.67)]
        stB += [V2(W['joint'], y) for y in RB if keepB(V2(W['joint'] + 0.02, y))]
        out['wallLow'].add(cdt(o, outer, [], edges, stB, xyzB, LOW))
        # ahead of the patch: the wall again, and the step face back to it at zF (facing forward)
        outer2 = [V2(o.FIRE, FL), V2(zF, FL)] + [V2(zF, y) for y in YF if FL < y < SB] + [V2(zF, SB), V2(o.FIRE, SB)] + [V2(o.FIRE, y) for y in reversed(RB)]
        st2 = steiner_grid([-1.40, -1.30, -1.20], RB, lambda q: inside(outer2, q) and line_dist(q, outer2) > 0.012)
        out['wallLow'].add(cdt(o, outer2, [], [], st2, lambda z, y: Vector((wall_x(o, y), y, z)), LOW))
        step = Piece()
        for y0, y1 in zip(YF, YF[1:]):
            a0, a1 = low_x(o, y0, zF, True), low_x(o, y1, zF, True)
            if wall_x(o, y0) - a0 < 1e-5 and wall_x(o, y1) - a1 < 1e-5: continue
            i0 = len(step.v); step.v += [Vector((a0, y0, zF)), Vector((a1, y1, zF)), Vector((wall_x(o, y1), y1, zF)), Vector((wall_x(o, y0), y0, zF))]
            step.f.append((i0, i0 + 1, i0 + 2, i0 + 3)); step.c.append(LOW)
        orient(step, 0, (0, 0, -1)); out['wallLow'].add(step)
    mark('lower panels')
    # ---- the lower panels' lip along the split (its top on the band, rounded over to the panels' face, tucked under it)
    LIPS = [(0.0018, 0.0), (0.0002, 0.0042), (-0.0028, 0.0064), (-0.0068, wall_t(o, SB) - 0.0002)]
    runs = [[-1.20, -0.95, -0.70, -0.45, -0.17, 0.15, 0.55, 1.0, AFT]] if not cup else \
        [[-1.20, cup['z'] - 0.056], [cup['z'] + 0.056, -0.80, -0.55, -0.30, -0.17, 0.15, 0.55, 1.0, AFT]]
    for zs in runs:
        p = Piece(); p.grid([[Vector((o.HW - h, SB + dy, z)) for z in zs] for dy, h in LIPS], LOW); orient(p, 0, (-1, 1, 0)); out['wallLow'].add(p)
    # ---- the joint between the lower panels aft of the front seats (on the left; on the right the door's seal)
    if left:
        ys = [FL + 0.01] + [y for y in RB if y > FL + 0.01] + [SB - 0.008]
        j = Piece(); j.grid([[Vector((wall_x(o, y) - 0.0004, y, W['joint'] + dz)) for y in ys] for dz in (-0.0016, 0.0016)], shade(LOW, 0.45)); orient(j, 0, (-1, 0, 0))
        out['wallLow'].add(j)
    mark('lip, joint')
    # ---- the armrests
    out['wallLow'].add(armrest(o, W['arm'], LOW))
    out['wallLow'].add(armrest(o, W['armRear'], LOW, rear=True))
    mark('armrests')
    # ---- the rear wall's USB bezel and its switch (black, on the panel over the rear armrest)
    for (z, y), (w, h, d), ports in ((W['usb'], (0.056, 0.044, 0.006), 2), (W['usbSw'], (0.026, 0.026, 0.005), 0)):
        xw = wall_x(o, y); b = o.ctx.box(Vector((xw - d / 2 + 0.001, y, z)), (d / 2, h / 2, w / 2), (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))), BLK)
        out['black'].add(b)
        for k in range(ports):
            zz = z + (k - 0.5) * 0.016; x = xw - d + 0.0006
            out['black'].add(quad(o, (x, y - 0.006, zz - 0.004), (x, y - 0.006, zz + 0.004), (x, y - 0.002, zz + 0.004), (x, y - 0.002, zz - 0.004), shade(BLK, 0.3), (-1, 0, 0)))
    # ---- the low air outlet on the kick panel (a round adjustable one: its rim, the ball, its mouth dark)
    vz, vy = W['vents'][0 if left else 1]; xw = wall_x(o, vy); nrm = Vector((-1, 0, 0)); c0 = Vector((xw, vy, vz))
    u, w = Vector((0, 1, 0)), Vector((0, 0, 1)); ring = lambda r, h: [c0 + nrm * h + (u * math.cos(2 * math.pi * k / 6) + w * math.sin(2 * math.pi * k / 6)) * r for k in range(6)]
    p = Piece(); p.grid([ring(0.031, 0.0005), ring(0.028, 0.0045), ring(0.0205, 0.002)], BLK, closed=True); orient(p, 0, nrm)
    i0 = len(p.v); p.v += ring(0.019, 0.0065); f0 = len(p.f); p.fan(list(range(i0, i0 + 6)), c0 + nrm * 0.012, shade(BLK, 1.4)); orient(p, f0, nrm)
    out['black'].add(p)
    mark('usb, vents')
    # ---- the band's screw heads (white: along its foot, on the front and rear surrounds' lower edges)
    for z in ((-0.80, -0.58, -0.36, 0.08, 0.55) if left else (-0.86, -0.64, -0.42, 0.08, 0.55)):
        out['wall'].add(dome(o, band_pt(o, z, SB + 0.013, 0.0), band_n(o, SB + 0.013), 0.0034, 0.0016, shade(WALL, 0.93)))
    hs = 0.0095 - 0.0045 * (0.040 - 0.034) / 0.012
    for z in (-0.95, -0.50, 0.02, 0.42):
        y = 0.405 - 0.040; nn = (band_n(o, y) + Vector((0, -0.375, 0))).normalized()
        out['wall'].add(dome(o, band_pt(o, z, y, hs), nn, 0.0032, 0.0015, shade(WALL, 0.93)))
    mark('screws')
    if left: left_side(o, out)
    else: door_side(o, out)
    return out

def left_side(o, out):
    C = o.ctx.C; Piece = o.ctx.Piece; W = o.W
    LOW, BLK, ALU = (tuple(C[k]) for k in ('wallLow', 'black', 'postAlu'))
    # ---- the map pocket: its frame round the black mesh, which bulges out at its foot
    P = W['pocket']; z0, z1, y0, y1, R = P['z0'], P['z1'], P['y0'], P['y1'], 0.012
    dep = lambda y: lerp(0.026, 0.011, clamp((y - y0) / (y1 - y0), 0, 1))
    cs = [V2(z1 - R, y0 + R), V2(z1 - R, y1 - R), V2(z0 + R, y1 - R), V2(z0 + R, y0 + R)]
    st = []
    for i, c in enumerate(cs):                            # (each corner: three points round its middle, then the edge)
        a0 = -math.pi / 2 + i * math.pi / 2
        for k in range(3): a = a0 + k * math.pi / 4; st.append((c + V2(math.cos(a), math.sin(a)) * R, V2(math.cos(a), math.sin(a))))
    FR = [(-0.0015, 'b'), (0.0005, 0.8), (0.004, 1.0), (0.010, 0.97), (0.0125, 'm')]
    def hof(f, y): return -0.002 if f == 'b' else dep(y) - 0.005 if f == 'm' else dep(y) * f
    wid = lambda w, nrm: w * (1 + 1.1 * max(0.0, nrm.y) ** 2) if w > 0.002 else w        # (its top lip ~2.6 cm, its sides and foot 1.25)
    rows = [[Vector((wall_x(o, q.y) - hof(f, q.y), q.y, q.x)) for q in (p - nrm * wid(w, nrm) for p, nrm in st)] for w, f in FR]
    frame = mix(LOW, tuple(C['wall']), 0.45)
    p = Piece(); p.grid(rows, frame, closed=True); orient(p, 0, (-1, 0, 0)); out['wallLow'].add(p)
    m = Piece(); i0 = len(m.v); m.v += [Vector(v) for v in rows[-1]]; yc = (y0 + y1) / 2
    m.fan(list(range(i0, i0 + len(rows[-1]))), Vector((wall_x(o, yc) - dep(yc) + 0.0065, yc, (z0 + z1) / 2)), tuple(v * 0.55 for v in BLK)); orient(m, 0, (-1, 0, 0))
    out['black'].add(m)
    o.mark('pocket')
    # ---- the hand mic in it (its top over the rim) and its coiled cord: down in front of the pocket in a loop, forward
    # to the panel's corner (over the kick panel's top, clear of the fuel selector and of the line of sight to it)
    xw = wall_x(o, 0.23)
    out['black'].add(o.ctx.box(Vector((xw - 0.011, y1 - 0.023, -0.905)), (0.0085, 0.033, 0.021), (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))), BLK))
    path = [(-0.912, y1 + 0.010, 0.011), (-0.925, y1 + 0.002, 0.028), (-0.944, y0 + 0.010, 0.033), (-0.949, 0.09, 0.021),
            (-0.948, 0.01, 0.018), (-0.990, 0.010, 0.019), (-1.045, 0.055, 0.020), (-1.095, 0.056, 0.016)]
    out['black'].add(tube(o, [(low_x(o, y, z, True) - off, y, z) for z, y, off in path], 0.0042, 4, BLK, per=2))
    o.mark('mic')
    # ---- the pilot's storm window (in the front window, on its lower edge: its clear pane's edges do not show — the
    # photos show its hinge strip and its wire bail only): the hinge strip along its foot, its knuckles' notches along its
    # lower edge, the trapezoid bail standing on the strip's ends, its top bar near the pane's top
    S_ = W['storm']; z0, z1, y0, y1 = S_['z0'], S_['z1'], S_['y0'], S_['y1']
    gpt = lambda z, y, h: band_pt(o, z, y, -o.GLASS / math.sqrt(1 + o.KX ** 2) + h)         # (h in from the glass)
    hy0, hy1 = y0 + 0.0005, y0 + 0.0195
    hinge = [gpt(z0, hy0, 0.0005), gpt(z1, hy0, 0.0005), gpt(z1, hy0, 0.0042), gpt(z0, hy0, 0.0042), gpt(z0, hy1, 0.0042), gpt(z1, hy1, 0.0042), gpt(z1, hy1, 0.0005), gpt(z0, hy1, 0.0005)]
    p = Piece(); p.v = hinge; p.f = [(0, 1, 2, 3), (3, 2, 5, 4), (4, 5, 6, 7)]; p.c = [ALU] * 3; orient(p, 0, (-1, 0, 0)); out['postAlu'].add(p)
    for k in range(7):
        zc = lerp(z0, z1, (k + 0.75) / 7.5); a, b = zc - 0.0065, zc + 0.0065
        out['black'].add(quad(o, gpt(a, hy0 + 0.0012, 0.0047), gpt(b, hy0 + 0.0012, 0.0047), gpt(b, hy0 + 0.0075, 0.0047), gpt(a, hy0 + 0.0075, 0.0047), shade(BLK, 1.2), (-1, 0, 0)))
    bz0, bz1, bt = z0 + 0.008, z1 - 0.008, y1 - 0.010
    bail = [(bz0, hy1 - 0.003, 0.006), (bz0 + 0.009, lerp(hy1, bt, 0.6), 0.011), (bz0 + 0.018, bt - 0.006, 0.0135), (bz0 + 0.034, bt, 0.014),
            (bz1 - 0.034, bt, 0.014), (bz1 - 0.018, bt - 0.006, 0.0135), (bz1 - 0.009, lerp(hy1, bt, 0.6), 0.011), (bz1, hy1 - 0.003, 0.006)]
    out['postAlu'].add(tube(o, [gpt(z, y, h) for z, y, h in bail], 0.0030, 5, ALU, per=2))
    o.mark('storm window')

def door_side(o, out):
    C = o.ctx.C; Piece = o.ctx.Piece; W = o.W; D = W['door']; cup = o.cup
    RUB, BLK, CHR, WHT, LOW = (tuple(C[k]) for k in ('rubber', 'black', 'chrome', 'white', 'wallLow'))
    SB = o.SB
    cz, cy, ca, cb, dep = cup['z'], cup['y'], cup['a'], cup['b'], cup['depth']
    xs = lambda y: o.HW if y > SB else wall_x(o, y)                # (the surface round the cup: the band over the split)
    xb = wall_x(o, cy) + dep                                       # (the cup's flat bottom)
    # ---- the cup: its bowl from the hole's edge (just behind the surface) down to its flat bottom; its rubber rim over
    # the edge, standing on the band over the split and on the lower panel under it
    N = 16; ang = [2 * math.pi * k / N for k in range(N)]
    E = lambda t, s, w=0.0: V2(cz + (ca * s) * math.cos(t), cy + (cb * s) * math.sin(t)) + V2(cb * math.cos(t), ca * math.sin(t)).normalized() * w
    rows = []
    for s_, f in ((1.0, None), (0.94, 0.55), (0.82, 0.95)):
        rows.append([Vector(((xs(E(t, s_).y) + 0.001) if f is None else xb - (1 - f) * dep, E(t, s_).y, E(t, s_).x)) for t in ang])
    rows.append([Vector((xb, q.y, q.z)) for q in rows[-1]])
    p = Piece(); p.grid(rows, BLK, closed=True); p.fan(list(range(3 * N, 4 * N)), Vector((xb, cy, cz)), BLK)
    orient(p, 0, (-1, 0, 0)); out['black'].add(p)
    tR = math.asin((SB - cy) / cb); tL = math.pi - tR; top = wall_x(o, cy)
    def rim_station(t, x3):
        q0, q1, q2, q3 = E(t, 1.0, -0.004), E(t, 1.0, -0.002), E(t, 1.0, 0.004), E(t, 1.0, 0.009)
        return [Vector((xs(q0.y) + 0.004, q0.y, q0.x)), Vector((top - 0.003, q1.y, q1.x)), Vector((top - 0.0045, q2.y, q2.x)), Vector((x3 - 0.0003, q3.y, q3.x))]
    rim = []
    for t in sorted(ang + [tR, tL]):                      # (at the split, two stations: the skirt steps from one surface to the other)
        if abs(t - tR) < 1e-9: rim += [rim_station(t, wall_x(o, SB)), rim_station(t, o.HW)]
        elif abs(t - tL) < 1e-9: rim += [rim_station(t, o.HW), rim_station(t, wall_x(o, SB))]
        else: rim.append(rim_station(t, o.HW if tR < t < tL else wall_x(o, E(t, 1.0, 0.009).y)))
    p = Piece(); p.grid([[r[j] for r in rim] for j in range(4)], RUB, closed=True); orient(p, 0, (-1, 0, 0)); out['rubber'].add(p)
    # the lever on the bottom (its pivot up, its grip down and turned out), its two screws, the arrows
    ax = Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1))
    out['black'].add(o.ctx.box(Vector((xb - 0.0035, cy - 0.006, cz)), (0.0035, 0.034, 0.011), ax, shade(BLK, 1.7)))
    out['black'].add(o.ctx.box(Vector((xb - 0.0135, cy - 0.046, cz)), (0.0075, 0.007, 0.0125), ax, shade(BLK, 1.7)))
    out['chrome'].add(dome(o, Vector((xb - 0.0072, cy + 0.020, cz)), (-1, 0, 0), 0.004, 0.002, CHR))
    for y, s in ((cy + 0.040, 1), (cy - 0.059, -1)):
        x = xb - 0.0008
        a = quad(o, (x, y - s * 0.004, cz - 0.0012), (x, y - s * 0.004, cz + 0.0012), (x, y + s * 0.002, cz + 0.0012), (x, y + s * 0.002, cz - 0.0012), WHT, (-1, 0, 0))
        t = Piece(); t.v = [Vector((x, y + s * 0.002, cz - 0.004)), Vector((x, y + s * 0.002, cz + 0.004)), Vector((x, y + s * 0.0075, cz))]; t.f = [(0, 1, 2)]; t.c = [WHT]; orient(t, 0, (-1, 0, 0))
        out['white'].add(a.add(t))
    o.mark('cup')
    # ---- the door's seal round its inner panel: up its low front edge, along the sill, up its aft edge, along under the
    # roof trim over its window, down along the A-pillar trim (a bead on the surfaces, found by casting at them)
    surf = Piece()
    for k in ('wall', 'wallLow'): surf.add(out[k])
    bvh = BVHTree.FromPolygons([tuple(v) for v in surf.v], [tuple(f) for f in surf.f], all_triangles=False)
    z0, z1, y0, top = D['z0'], D['z1'], D['y0'], D['top']
    path = [V2(z0, 0.034), V2(z0, -0.10), V2(z0, -0.20)] + [V2(z0 + 0.05 * (1 - math.cos(a)), y0 + 0.05 * (1 - math.sin(a))) for a in (0.0, math.pi / 6, math.pi / 3, math.pi / 2)]
    path += [V2(-0.70, y0), V2(z1 - 0.10, y0)] + [V2(z1 - 0.10 * (1 - math.sin(a)), y0 + 0.10 * (1 - math.cos(a))) for a in (math.pi / 6, math.pi / 3, math.pi / 2)]
    path += [V2(z1, y) for y in (-0.15, -0.10, -0.03, 0.06, 0.16, SB - 0.010, SB - 0.003, SB + 0.003, 0.30, 0.345, 0.37, 0.39, 0.45, 0.55, 0.62)]
    path += [V2(z1 - 0.05 * (1 - math.cos(a)), top - 0.05 * (1 - math.sin(a))) for a in (0.0, math.pi / 6, math.pi / 3, math.pi / 2)]
    zt = pillar_toe(o, top) + 0.001
    path += [V2(-0.45, top), V2(zt + 0.01, top)] + [V2(pillar_toe(o, y) + 0.001, y) for y in (top - 0.006, 0.69, 0.64, 0.58, 0.52, 0.46, 0.42)]
    bead = []
    for q in path:
        h = bvh.ray_cast(Vector((0.30, q.y, q.x)), Vector((1, 0, 0)), 0.5)
        if h[0] is not None: bead.append((h[0], h[1] if h[1].x < 0 else -h[1]))
        else: bead.append((band_pt(o, q.x, q.y, 0.0), band_n(o, q.y)))    # (under the roof trim: in front of the glass's top)
    rows = [[], [], []]
    for i, (pt, nrm) in enumerate(bead):
        tg = (bead[min(i + 1, len(bead) - 1)][0] - bead[max(i - 1, 0)][0]).normalized(); s = nrm.cross(tg).normalized()
        for j, (w, h) in enumerate(((-0.0025, 0.0004), (0.0, 0.0022), (0.0025, 0.0004))): rows[j].append(pt + s * w + nrm * h)
    p = Piece(); p.grid(rows, RUB); orient(p, 0, (-1, 0, 0)); out['rubber'].add(p)
    o.mark('door seal')
    # ---- the upper latch: the chrome plate with its slot under the roof trim (the fuselage's top frame), its screws; the
    # black lever on the door's top hooked into it
    zl = D['latch']; yP = 0.7262; ax3 = (Vector((1, 0, 0)), Vector((0, 1, 0)), Vector((0, 0, 1)))
    out['chrome'].add(o.ctx.box(Vector((0.479, yP, zl)), (0.011, 0.0015, 0.035), ax3, CHR))
    out['black'].add(quad(o, (0.4735, yP - 0.0016, zl - 0.014), (0.4735, yP - 0.0016, zl + 0.014), (0.4815, yP - 0.0016, zl + 0.014), (0.4815, yP - 0.0016, zl - 0.014), shade(BLK, 0.4), (0, -1, 0)))
    for dz in (-0.025, 0.025): out['chrome'].add(dome(o, Vector((0.479, yP - 0.0015, zl + dz)), (0, -1, 0), 0.0033, 0.0015, CHR))
    out['black'].add(o.ctx.box(Vector((0.4785, 0.7185, zl)), (0.005, 0.0045, 0.024), ax3, shade(BLK, 1.3)))
    out['black'].add(o.ctx.box(Vector((0.4775, 0.7225, zl + 0.006)), (0.0028, 0.004, 0.005), ax3, shade(BLK, 1.3)))
    o.mark('latch')
    # ---- the black scuff plate under the sill
    ys = [o.FLOOR + 0.008, -0.36, -0.33, y0 - 0.014]
    p = Piece(); p.grid([[Vector((wall_x(o, y) - 0.0008, y, z)) for y in ys] for z in (z0 + 0.03, -0.70, z1 - 0.03)], shade(BLK, 1.1)); orient(p, 0, (-1, 0, 0))
    out['black'].add(p)
    for z in (z0 + 0.06, -0.66, z1 - 0.06): out['chrome'].add(dome(o, Vector((wall_x(o, -0.345) - 0.0009, -0.345, z)), (-1, 0, 0), 0.003, 0.0012, shade(CHR, 0.8)))
    o.mark('scuff plate')

# ---------------------------------------------------------------- the protocol
def parts(ctx):
    o = layout(ctx); Piece = ctx.Piece
    R, Lf = side(o, False), side(o, True)
    nodes = {}
    for k in R:
        p = Piece().add(R[k]).add(ctx.mirror_x(Lf[k]))
        if p.f: nodes['walls.' + k] = (p, None)
    _G['nodes'] = {k: v[0] for k, v in nodes.items()}
    return nodes

def proxies(ctx):
    # what stays in code round the walls (cockpit.js): the floor, the firewall, the panel, the baggage floor, the fuel
    # selector's bezel (an octagon on its face)
    o = layout(ctx); F = o.FLOOR; V = Vector; out = []
    out.append(('quad', V((-0.56, F, o.FIRE)), V((0.56, F, o.FIRE)), V((0.56, F, o.AFT)), V((-0.56, F, o.AFT))))
    out.append(('quad', V((-0.53, F, o.FIRE)), V((0.53, F, o.FIRE)), V((0.53, 0.365, o.FIRE)), V((-0.53, 0.365, o.FIRE))))
    out.append(('box', (0.0, (o.PTOP + o.PBOT - 0.008) / 2, o.PZ - 0.018), (1.106, o.PTOP - o.PBOT - 0.008, 0.035)))   # (cockpit.js: the panel's rbox)
    out.append(('box', (0.0, F + 0.09, (o.AFT + 0.95) / 2), (1.04, 0.18, o.AFT - 0.95)))                                 # (the baggage floor's)
    c, n = Vector(o.S['fuelSel']['c']), Vector(o.S['fuelSel']['n'])
    ey = (Vector((0, 1, 0)) - n * n.y).normalized(); ex = ey.cross(n)
    P = [c + n * 0.003 + (ex * math.cos(math.pi * k / 4) + ey * math.sin(math.pi * k / 4)) * o.fsR for k in range(8)]
    for k in (0, 2, 4, 6): out.append(('quad', c + n * 0.003, P[k], P[k + 1], P[(k + 2) % 8]))
    return out

# ---------------------------------------------------------------- the checks
def check(ctx, objs):
    o = layout(ctx); V = Vector; bpy = ctx.bpy; S = o.S
    dg = bpy.context.evaluated_depsgraph_get()
    mine = {k: ob for k, ob in objs.items() if k.split('.')[0] in GROUPS}
    bvh = {k: BVHTree.FromObject(ob, dg) for k, ob in mine.items()}
    def cast(o3, d, far, keys=None):
        best = None
        for k in (keys or mine):
            loc, nrm, i, dist = bvh[k].ray_cast(V(o3), V(d).normalized(), far)
            if loc is not None and (best is None or dist < best[1]): best = (loc, dist, k)
        return best
    eye = o.EYE
    # the walls face into the cabin
    for k in ('walls.wall', 'walls.wallLow'):
        assert ctx.facing_share(mine[k]) > 0.8, (k, 'faces outwards', ctx.facing_share(mine[k]))
    # nothing within 0.2 m of the eye
    for k in mine:
        d = bvh[k].find_nearest(eye)[3]; assert d > 0.2, (k, 'near the eye', d)
    # the shoulder ray (cockpit.test: from 0.27 m under the eye, ±x): the band, at |x| 0.52–0.60
    for sx in (-1, 1):
        h = cast(eye + V((0, -0.27, 0)), (sx, 0, 0), 1.0); assert h and abs(abs(h[0].x) - 0.56) < 0.04, ('the shoulder ray', sx, h)
    # the eye-level glass (cockpit.test: along (±1, 0.1, 0)): nothing of the walls before the glass
    for sx in (-1, 1):
        d = V((sx, 0.1, 0)).normalized(); t = 0.0
        for _ in range(60):                               # (where the ray meets the glass's plane: bandX(y) + GLASS)
            q = eye + d * t; t += (o.bandX(q.y) + o.GLASS - abs(q.x)) / abs(d.x)
        h = cast(eye, d, t); assert h is None, ('the eye-level glass hidden', sx, h)
    # the openings not narrowed: from 0.1 m inside, along the band's normal, nothing over the glass 1 mm in from each
    # opening's edge (round its outline)
    for k in range(3):
        for P, T in opening(o, k):
            q = P - V2(T.y, -T.x) * 0.001
            for sx in (-1, 1):
                g = band_pt(o, q.x, q.y, -o.GLASS / math.sqrt(1 + o.KX ** 2)); n = band_n(o, q.y)
                g.x *= sx; n.x *= sx
                h = cast(g + n * 0.10, -n, 0.0995, ('walls.wall', 'walls.rubber'))
                if h and sx > 0 and k == 0 and h[2] == 'walls.rubber' and h[0].y > S['walls']['door']['top'] - 0.0026: continue   # (the door's top seal, tucked under the roof trim)
                assert h is None, ('an opening narrowed', k, tuple(q), sx, h)
    # the kick panel in the fuel selector's plane under it (cast along −n): exactly on it (4 mm behind the plate) under the
    # plate (r ≤ 0.066), and nowhere in front of the bezel's rim (out to its edge, r 0.077, at least 1.5 mm behind the
    # plate's plane: at its upper aft edge the wall comes ~2 mm in front of the kick panel's plane — cockpit.js puts the
    # bezel's outboard edge 2 mm inside the wall — and its skirt goes into it there)
    c, n = V(S['fuelSel']['c']), V(S['fuelSel']['n']); ey = (V((0, 1, 0)) - n * n.y).normalized(); ex = ey.cross(n)
    kick = {}
    for r in (0.0, 0.03, 0.066, 0.077):
        for a in range(12 if r else 1):
            p = c + (ex * math.cos(a * math.pi / 6) + ey * math.sin(a * math.pi / 6)) * r
            h = cast(p + n * 0.05, -n, 0.1); assert h and h[2] == 'walls.wallLow', ('the kick panel missing', r, a, h)
            kick[(r, a)] = round(h[1] - 0.05, 4)
            if r <= 0.066: assert abs(h[1] - 0.054) < 0.0006, ('the kick panel off the plate\'s plane', r, a, h[1] - 0.05)
            else: assert h[1] > 0.0515, ('the kick panel in front of the selector\'s bezel', r, a, h[1] - 0.05)
    _G['kick'] = min(kick.values())
    # the sight lines (cockpit.test controlsCheck: the aim's last 3 cm ignored): the fuel selector's (its aim on the
    # handle's fin near the hub, cockpit.js), the door handle's (in its cup)
    fa = c + ey * 0.012 + n * 0.022
    da = V(S['walls']['door']['cup']['aim'])
    for name, aim in (('fuelSel', fa), ('door', da)):
        d = aim - eye; h = cast(eye, d, d.length - 0.03); assert h is None, (name, 'sight line blocked by', h)
    # the door's hit box round the lever, inside the cup (the walls' extent): its corners behind the cup's opening
    hb = S['walls']['door']['cup']['hit']; cp = S['walls']['door']['cup']
    for sx in (-1, 1):
        for sy in (-1, 1):
            q = V2(hb['pos'][2] + sx * hb['size'][2] / 2, hb['pos'][1] + sy * hb['size'][1] / 2)
            assert ((q.x - cp['z']) / cp['a']) ** 2 + ((q.y - cp['y']) / cp['b']) ** 2 < 1, ('the door\'s hit box wider than its cup', tuple(q))
    # the LIMITATIONS placard flat on the band (cockpit.js puts it 1.5 mm in front of x = lowX)
    L_ = S['walls']['limits']
    for dz in (-0.5, 0, 0.5):
        for dy in (-0.5, 0, 0.5):
            p = V((-0.40, L_['y'] + dy * L_['h'], L_['z'] + dz * L_['w'])); h = cast(p, (-1, 0, 0), 0.3)
            assert h and h[2] == 'walls.wall' and abs(h[0].x + o.lowX(p.y)) < 0.0005, ('the LIMITATIONS placard not flat on the band', dz, dy, h)
    # the seats' pans: the lower panels at least 4 mm outboard of the seats (made with them) — and of lowX − 1 cm anyway
    seats = [ob for k, ob in objs.items() if k.startswith('seats.') or k.startswith('bench.')]
    near = 9.0
    for ob in seats:
        for v in ob.data.vertices:
            if abs(v.co.x) > 0.40: near = min(near, bvh['walls.wallLow'].find_nearest(v.co)[3])
    assert near > 0.002, ('the seats touch the lower panels', near)
    # the door armrest within the box actor.test.mjs copies (the instructor's arms are tested against it)
    A = S['walls']['arm']
    xs = [v.co for v in mine['walls.wallLow'].data.vertices if v.co.x > 0.45 and A['z0'] - 0.06 < v.co.z < A['z1'] + 0.01 and A['y1'] - A['h'] - 0.01 < v.co.y < A['y1'] + 0.01]
    ext = [(min(p[a] for p in xs), max(p[a] for p in xs)) for a in range(3)]
    assert ext[0][0] > o.HW - A['d'] - 0.007 and ext[1][1] < A['y1'] + 0.003, ('the door armrest outside its box', ext)
    # the yokes (made with them) clear the walls over their travel (fore and aft, rolled both ways): cockpit.js turns each
    # about its pivot (PIV: the hub's middle) by ±YOKE.roll about z and moves it ±YOKE.travel along z
    Y = S['yoke']; yk = []
    for k, ob in objs.items():
        if k.startswith('yokes.') and (k.endswith('.yokeL') or k.endswith('.yokeR')):
            sx = -1 if k.endswith('.yokeL') else 1; yk += [(sx, v.co.copy()) for v in ob.data.vertices]
    yclear = 9.0
    allw = [bvh[k] for k in mine]
    for pc in (-1, 0, 1):
        for rl in (-1, 0, 1):
            a = -rl * Y['roll']; ca, sa = math.cos(a), math.sin(a)
            for sx, v in yk[::2]:
                px, py = v.x - sx * Y['x'], v.y - Y['y']
                q = V((sx * Y['x'] + px * ca - py * sa, Y['y'] + px * sa + py * ca, v.z + pc * Y['travel']))
                if abs(q.x) > 0.40: yclear = min(yclear, min(b.find_nearest(q)[3] for b in allw))
    assert yclear > 0.006, ('a yoke comes within', yclear, 'of the walls')
    _G['checked'] = {'yokes': round(yclear, 4), 'seats_gap': round(near, 4), 'kick_min': _G['kick'], 'door_arm': [tuple(round(v, 3) for v in e) for e in ext]}
    print('walls:', _G['checked'], {k: ctx.tris(ob) for k, ob in mine.items()}, 'by part', _G['count'])
