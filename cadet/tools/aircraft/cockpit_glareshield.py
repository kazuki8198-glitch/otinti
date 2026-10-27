# CADET — tools/aircraft/cockpit_glareshield.py : the glareshield of the flown aircraft's cabin (aircraft/cockpit.js), for
# tools/aircraft/build_cockpit.py (the group 'glareshield'; the run, the helpers and the protocol are that script's):
#   node tools/aircraft/cockpit-spec.mjs > /tmp/cockpit.json
#   blender -b --factory-startup -P tools/aircraft/build_cockpit.py -- /tmp/cockpit.json assets/model/cockpit.glb [preview_dir|-]
#   (a group alone, for its previews: … -- /tmp/cockpit.json /tmp/trial.glb /tmp/prev band,glareshield — never into assets/model,
#   which must hold every group; tools/aircraft/trial-glb.mjs runs the game's tests against such a trial model)
# - the roll (glareshield.glareLip): the padded bullnose along the hood's back edge, over the PFD, the audio panel and the
#   MFD — the only part of the glareshield the pilot sees (from the crest, 12.25° below the eye straight ahead, down its
#   face to its underside, ~15°). Its vinyl cover: a top piece curled over the crest and sewn to the face piece a little
#   below it (a seam groove, darker), the face pillowing out between that seam and the underside. At each end it turns
#   forward round a vertical axis (a tight quarter turn, its section a little lower towards the wall) and stops just
#   inside the side wall, buried in the foot of the A-pillar trim that comes down to it. A closed solid (its edges, tucked
#   into the hood, joined inside it; capped).
# - the hood (glareshield.glare): a closed solid under the roll: its top a shelf just under the roll's crest, falling
#   straight to the windshield's base (meeting the glass at ws.y0 − 0.0045, its front face upright from there, 1.5 mm off
#   the glass at its top), its underside from there back to the panel's face and on, level, to under the roll; its back
#   edge follows the roll's (round the ends too); its ends against the side walls (leaning with them). Never seen from
#   the eye (its top lies under the line of sight over the crest): it is there for the shadows and to close the shape.
# - the rubber joint (glareshield.rubber): a small bead along the hood's front, from its top 3 mm up the glass (no higher:
#   at x = 0, where the hood is longest, the line of sight over the crest meets the glass at y 0.4249).
# Made to the spec (cockpit-spec.mjs: the eye, the panel's face pz and top ptop, the windshield ws, the window band, and
# the old procedural lip's profile glare.lip and half-width glare.x that it replaces; every height and depth below is
# taken from these, see layout()): the hood's underside at the old lip's (glare.lip[0]), the roll's 2 mm under it;
# the roll's back 3 mm behind the old lip's; its crest scaled (about the roll's underside) so that the first thing seen
# below the cowling straight ahead is the crest at 12.25° under the eye (the old crest's 12.20° + 0.05°: the scan of
# cockpit.test.mjs wants it between 12° and 15°; FLIGHT LAB's EDGE table and the HUD's hood gradient were set to ~12.2°).
# The roll's underside keeps clear of the lines of sight to the screens' image (the test's points, below) and to the
# controls under it. Detail where it is seen: the roll's section (15 points, the seam), the hood's coarse. check() asserts
# these (and that neither solid has a face turned inwards) on the triangulated objects.
# It needs, with the glb that has it: in cockpit.js, the panel frame's top 8 mm lower (else its flat top shows as a grey
# line between the cowling and the crest), the firewall's top lower (else its carpet shows over the crest at 10–12° left)
# and the glareshield's box in AO_OCC reaching aft over the roll (z1 −1.02); in test/cockpit.test.mjs, its three nodes in
# the list of the model's parts.
# Coordinates and nodes: build_cockpit.py's (the cabin's frame, metres, x right, y up, z aft). Surfaces (cockpit.js's
# table S): glareLip (grained vinyl), glare (textured paint), rubber. COLOR_0: rgb = the table's colour, the seam groove
# darker; alpha = the local occlusion (build_cockpit.py bakes it).
import math

GROUPS = ('glareshield',)
MAX_TRIS = 1000                       # (it replaces the 768 triangles of cockpit.js's procedural hood and lip)
DEG = math.pi / 180

# the views of the preview: yaw, pitch [, eye] (build_cockpit.py: yaw 0 looks forward, + to the left)
PREVIEW = {
    'ahead': (0, -12), 'ahead2': (0, -20), 'right': (-35, -15), 'left': (22, -14),
    'close': (0, -13.6, (-0.3, 0.526, -0.789)),          # along the pilot's line of sight to the roll, 2.4 times closer
    'cornerL': (19.5, -13.5, (-0.446, 0.515, -0.8125)),  # the left end against the A-pillar trim, along the pilot's line of sight
    'corner': (-50, -14, (0.24, 0.53, -0.86)),           # the right end's turn, from in board and behind
    'side': (-90, 0, (-0.60, 0.4625, -1.04)),            # from beyond the left wall along the roll's core line: the turn's
                                                         # outline is the section (its aft edge: the face, the seam, the underside)
}

# the roll's section: (d, h) — d aft of the roll's core line (in the turns: out from it, radially), h up from the roll's
# underside (YB, below) — round from its tuck into the hood under it, round the back, over the crest, to its tuck into
# the hood's top; closed inside the hood
BOL = [(-0.0080, 0.0055),             # 0  tucked into the hood (above the hood's underside)
       (0.0000, 0.0000),              # 1  under
       (0.0105, 0.0004),              # 2  the underside's back
       (0.0180, 0.0045),              # 3
       (0.0218, 0.0120),              # 4  the face, pillowing out
       (0.0218, 0.0182),              # 5
       (0.0192, 0.0229),              # 6  the seam's lower edge
       (0.0166, 0.0241),              # 7  the seam groove
       (0.0171, 0.0260),              # 8  its upper edge
       (0.0136, 0.0298),              # 9  the top piece curling over
       (0.0060, 0.0316),              # 10
       (-0.0035, 0.0318),             # 11 the crest
       (-0.0120, 0.0296),             # 12 (falling forward faster than the line of sight: the top stays out of view)
       (-0.0178, 0.0252),             # 13
       (-0.0205, 0.0210)]             # 14 tucked into the hood's top
SEAM = 7
KERN = (0.004, 0.016)                 # a point inside the section from which every edge of it is seen (the ends' fans)
HOOD_H = 0.0243                       # the hood's shelf under the roll's top (between BOL 13 and 14), scaled with the crest
RC = 0.025                            # the radius of the ends' turn (to the core line): tight, so that the underside's back
                                      # reaches nearly to the wall before turning, over the A-pillar trim's foot beside the
                                      # panel (a wider turn left a light wedge of it in view under the roll's end)
TAPER = 0.15                          # how much lower the roll's section is (above its underside) at the end of its turn
CREST_DEG = 12.25                     # the crest's depression from the eye straight ahead (see the header)
N_STRAIGHT, N_TURN = 10, 4            # the roll's columns: across between the turns, in each turn

# what must stay seen under the roll from the eye (cockpit.test.mjs 'the view from the left seat': the PFD's and MFD's
# image corners and top middle, 1 mm in, and the ends of the softkey strip; the screens are placed by cockpit.js's PFD,
# MFD and g1000.js's BEZEL), and the aim points of the controls nearest under the lip (cockpit.js: the volume knobs of
# the PFD and MFD, the audio panel's top row — copied, as the spec does not carry them — and the G5 standby's screen,
# its top corners 1 mm in, from the spec's panel.G5 in layout())
SEEN = [(-0.404, 0.42975, -1.0825), (-0.300, 0.42975, -1.0825), (-0.196, 0.42975, -1.0825), (-0.404, 0.27981, -1.0825), (-0.196, 0.27981, -1.0825),
        (-0.053, 0.42975, -1.0825), (0.051, 0.42975, -1.0825), (0.155, 0.42975, -1.0825), (-0.053, 0.27981, -1.0825), (0.155, 0.27981, -1.0825)]
AIMS = {'pfd.navVol': (-0.420, 0.426, -1.073), 'pfd.comVol': (-0.180, 0.426, -1.073), 'mfd.navVol': (-0.069, 0.426, -1.073),
        'mfd.comVol': (0.171, 0.426, -1.073), 'audio.COM1MIC': (-0.139, 0.428, -1.078), 'audio.COM1': (-0.110, 0.428, -1.078)}
# the panel round it, for the occlusion (the spec's panel: cockpit.js's PFD, MFD, AUD, G5 and g1000.js's BEZEL; the audio
# panel's size as cockpit.js makes it): in layout()
AUD_SIZE = (0.062, 0.018)


class _L:                             # the layout, worked out once from the spec
    pass


def layout(ctx):
    if getattr(ctx, '_glare', None): return ctx._glare
    S, EYE, bandX, WS = ctx.S, ctx.EYE, ctx.bandX, ctx.WS
    L = _L(); G = S['glare']; lip = G['lip']
    L.PZ, L.PTOP, L.PBOT = S['pz'], S['ptop'], S['pbot']
    L.YU = lip[0][1]                                      # the hood's underside: the old lip's (0.451)
    L.YB = L.YU - 0.002                                   # the roll's underside, 2 mm under the hood's
    L.ZK = max(z for z, y in lip) - 0.019                 # the roll's core: its back (d 0.0218) 3 mm behind the old lip's
    L.YF = WS['y0'] - 0.0045                              # the hood's top at the glass: 2.5 mm under the old hood's (ws.y0 −
                                                          # 0.002), 3 mm under the line of sight over the crest where the
                                                          # hood is longest (x = 0), the bead 2 mm
    L.YFB = WS['y0'] - 0.021                              # its front face down to 1 mm under the A-pillar trims' ends
                                                          # (build_cockpit.py PIL_YS: from ws.y0 − 0.02)
    L.BX = G['x'] - 0.018                                 # the bead's ends (the old hood's half-width, less the corners)
    # the crest's scale: the section scaled about YB so that, straight ahead, nothing of the roll is seen higher than
    # CREST_DEG under the eye (the mesh's silhouette is at a vertex: the steepest sight line over the section's points)
    def highest(s): return min(math.atan2(EYE.y - (L.YB + h * s), EYE.z - (L.ZK + d)) for d, h in BOL)
    lo, hi = 0.7, 1.3
    for _ in range(60):
        mid = (lo + hi) / 2
        if highest(mid) > CREST_DEG * DEG: lo = mid
        else: hi = mid
    L.S = (lo + hi) / 2
    # where the turns begin (x = ±XA, their axes at z = ZC): at the end of the turn every point of the section 2 mm inside
    # the side wall (which leans in: bandX), at its height before the taper (which only lowers it, so the wall is further)
    L.XA = min(bandX(L.YB + h * L.S) - 0.002 - RC - d for d, h in BOL if d > 0)
    L.ZC = L.ZK - RC
    P = S['panel']; B = P['BEZEL']; G5 = P['G5']
    L.BEZELS = [(tuple(P['PFD']), (B['w'], B['h'], B['depth'])), (tuple(P['MFD']), (B['w'], B['h'], B['depth'])),
                (tuple(P['AUD']), (AUD_SIZE[0], B['h'], AUD_SIZE[1])), (tuple(G5['c']), (G5['w'], G5['h'], G5['depth']))]
    gx, gy = G5['c'][0], G5['c'][1] + G5['screenY'] + G5['screenH'] / 2 - 0.001       # (the G5's screen: its top corners)
    for k, sx in (('stby.g5.topL', -1), ('stby.g5.topR', 1)): AIMS[k] = (gx + sx * (G5['screenW'] / 2 - 0.001), gy, L.PZ + G5['depth'] - 0.0035)
    ctx._glare = L
    return L


def taper(alpha): return math.sin(alpha) ** 2


def section_y(L, h, alpha):
    # the section's height: scaled for the crest, lower towards the end of the turns (about the roll's underside)
    return L.YB + h * L.S * (1 - TAPER * taper(alpha))


def roll_columns(L):
    # the roll's core line: (side, alpha) from the left end round the left turn, across, round the right turn
    cols = [(-1, (90 - 90 * i / N_TURN) * DEG) for i in range(N_TURN)]
    xs = [-L.XA + 2 * L.XA * (0.5 - 0.5 * math.cos(math.pi * i / N_STRAIGHT)) for i in range(N_STRAIGHT + 1)]   # denser near the turns
    cols += [(0, x) for x in xs]
    cols += [(1, (90 * (i + 1) / N_TURN) * DEG) for i in range(N_TURN)]
    return cols


def roll_point(L, ctx, col, d, h):
    side, a = col
    if side == 0: return ctx.Vector((a, section_y(L, h, 0.0), L.ZK + d))
    r = RC + d
    return ctx.Vector((side * (L.XA + r * math.sin(a)), section_y(L, h, a), L.ZC + r * math.cos(a)))


def roll_local(L, co):
    # (d, h, alpha) of a point on the roll: h its height in the section before scaling and tapering
    ax = abs(co.x)
    if ax <= L.XA: d, a = co.z - L.ZK, 0.0
    else:
        dx, dz = ax - L.XA, co.z - L.ZC; d, a = math.hypot(dx, dz) - RC, math.atan2(dx, dz)
    k = L.S * (1 - TAPER * taper(a))
    return d, (co.y - L.YB) / k, a


def roll(ctx):
    L = layout(ctx); p = ctx.Piece(); cols = roll_columns(L)
    rows = [[roll_point(L, ctx, c, d, h) for d, h in BOL] for c in cols]
    base = p.grid(rows, ctx.C['glareLip'], closed=True, flip=True)
    n = len(BOL); last = base + (len(rows) - 1) * n
    # the ends (inside the wall's line): fans from a point that sees every edge of the section
    p.fan([base + j for j in range(n)], roll_point(L, ctx, cols[0], *KERN), ctx.C['glareLip'], flip=True)
    p.fan([last + j for j in range(n)], roll_point(L, ctx, cols[-1], *KERN), ctx.C['glareLip'], flip=False)
    return p


def roll_col(ctx):
    # the vinyl's colour, the seam groove darker (by the distance in the section from the groove's bottom)
    L = layout(ctx); base = ctx.C['glareLip']; sd, sh = BOL[SEAM]
    def f(co):
        d, h, a = roll_local(L, co)
        w = ctx.clamp(1 - math.hypot(d - sd, h - sh) / 0.0034, 0, 1)
        return tuple(c * ctx.lerp(1.0, 0.5, w) for c in base)
    return f


def hood_core_z(L, ax):
    # the roll's core line's z at |x| = ax (along the back, round the turns, then the turns' end)
    if ax <= L.XA: return L.ZK
    if ax >= L.XA + RC: return L.ZC
    return L.ZC + math.sqrt(RC * RC - (ax - L.XA) ** 2)


def hood_section(L, ctx, x, end=False):
    # the hood's closed section at x (z, y): back top, the shelf, the top at the glass, down the front, the underside to the
    # panel's face, back under the roll. An end column (x: its side) puts each point against the side wall, 2 mm inside
    # it (leaning with it), past the end of the roll's turn.
    sd = 1 if x > 0 else -1
    at = (lambda y: sd * (ctx.bandX(y) - 0.002)) if end else (lambda y: x)
    ax = abs(at(L.YB + HOOD_H * L.S)); zk = hood_core_z(L, ax)
    a = math.asin(ctx.clamp((ax - L.XA) / RC, 0, 1))
    yh = section_y(L, HOOD_H, a)
    zb = zk - 0.006
    zf = ctx.wsZ(at(L.YF), L.YF) + 0.0015                  # (the front face upright, 1.5 mm off the glass at its top)
    zs = max(zk - 0.030, ctx.wsZ(at(yh), yh) + 0.0025)    # (near the walls the glass sweeps back over the shelf)
    pts = [(zb, yh), (zs, yh), (zf, L.YF), (zf, L.YFB), (L.PZ, L.YU), (zb, L.YU)]
    return [ctx.Vector((at(y), y, z)) for z, y in pts]


def hood_columns(L, ctx):
    xs = sorted({round(abs(c[1]), 9) if c[0] == 0 else round(L.XA + RC * math.sin(c[1]), 9) for c in roll_columns(L)})
    xs = [x for x in xs if x > 1e-9]
    right = [(x, False) for x in xs] + [(1.0, True)]
    return [(-x, e) for x, e in reversed(right)] + [(0.0, False)] + right


def hood(ctx):
    L = layout(ctx); p = ctx.Piece()
    rows = [hood_section(L, ctx, x, end) for x, end in hood_columns(L, ctx)]
    base = p.grid(rows, ctx.C['glare'], closed=True, flip=True)
    n = len(rows[0]); last = base + (len(rows) - 1) * n
    # the ends: fans from the middle of the back-top, shelf-front, underside-front and back-under points (the section is
    # not seen whole from the mean of its points: the front face and the underside fold under the shelf)
    kern = lambda r: (r[0] + r[1] + r[4] + r[5]) / 4
    p.fan([base + j for j in range(n)], kern(rows[0]), ctx.C['glare'], flip=True)
    p.fan([last + j for j in range(n)], kern(rows[-1]), ctx.C['glare'], flip=False)
    return p


def rubber(ctx):
    # the bead: from just under the hood's top 9 mm behind the glass, up over a soft top, onto the glass 3 mm above the hood
    L = layout(ctx); p = ctx.Piece(); rows = []
    for i in range(13):
        x = -L.BX + 2 * L.BX * i / 12
        zg = lambda y: ctx.wsZ(x, y)
        a = math.asin(ctx.clamp((abs(x) - L.XA) / RC, 0, 1))
        yh = section_y(L, HOOD_H, a); zk = hood_core_z(L, abs(x))
        zs = max(zk - 0.030, zg(yh) + 0.0025)
        top = lambda z: L.YF + (yh - L.YF) * (z - (zg(L.YF) + 0.0015)) / (zs - (zg(L.YF) + 0.0015))   # the hood's top at z
        z0 = zg(L.YF) + 0.009; z1 = zg(L.YF) + 0.004
        rows.append([ctx.Vector((x, top(z0) - 0.0008, z0)), ctx.Vector((x, top(z1) + 0.0012, z1)),
                     ctx.Vector((x, L.YF + 0.003, zg(L.YF + 0.003) + 0.0006))])
    p.grid(rows, ctx.C['rubber'], flip=True)
    return p


def parts(ctx):
    return {
        'glareshield.glareLip': (roll(ctx), roll_col(ctx)),
        'glareshield.glare': (hood(ctx), None),
        'glareshield.rubber': (rubber(ctx), None),
    }


def proxies(ctx):
    # what stays in code round it (cockpit.js): the panel's face, the displays' bezels, the audio panel and the G5's
    # bezel (the panel's frame: inside the hood, more than 5 cm from the roll's face)
    L = layout(ctx); V = ctx.Vector; z = L.PZ + 0.0002
    out = [('quad', V((-0.545, L.PBOT + 0.008, z)), V((0.545, L.PBOT + 0.008, z)), V((0.545, L.PTOP - 0.008, z)), V((-0.545, L.PTOP - 0.008, z)))]
    for (cx, cy), (w, h, dd) in L.BEZELS: out.append(('box', (cx, cy, L.PZ + dd / 2), (w, h, dd)))
    return out


def inward_faces(ctx, ob):
    # the faces of a closed solid that face into it: a ray from the face's middle along its normal (tilted a little two
    # ways, so that a ray through an edge or a vertex does not miscount) leaves the solid through an odd number of faces
    V = ctx.Vector; me = ob.data
    t = ctx.BVHTree.FromPolygons([v.co for v in me.vertices], [tuple(p.vertices) for p in me.polygons])
    bad = []
    for pl in me.polygons:
        odd = 0
        for tilt in (V((0.0123, 0.0071, -0.0093)), V((-0.0087, 0.0109, 0.0061))):
            d = (pl.normal + tilt).normalized(); o = pl.center + d * 1e-6; k = 0
            while k < 64:
                loc, nrm, i, dist = t.ray_cast(o, d, 3.0)
                if loc is None: break
                k += 1; o = loc + d * 1e-6
            odd += k % 2
        if odd == 2: bad.append(tuple(round(c, 4) for c in pl.center))
    return bad


def check(ctx, objs):
    L = layout(ctx); V, EYE, BVHTree = ctx.Vector, ctx.EYE, ctx.BVHTree
    mine = {k: ob for k, ob in objs.items() if k.split('.')[0] == 'glareshield'}
    lip, hd, rb = mine['glareshield.glareLip'], mine['glareshield.glare'], mine['glareshield.rubber']
    # the roll and the hood: closed solids, outwards, with no face turned in (the ends' fans: see roll and hood)
    for k in ('glareshield.glareLip', 'glareshield.glare'):
        v = ctx.volume(mine[k]); assert v > 0, (k, 'inside out', v)
        bad = inward_faces(ctx, mine[k]); assert not bad, (k, 'faces turned in', bad)
    trees = {k: BVHTree.FromPolygons([v.co for v in ob.data.vertices], [tuple(p.vertices) for p in ob.data.polygons]) for k, ob in mine.items()}
    def first(o, d, far=3.0):
        best = None
        for k, t in trees.items():
            loc, n, i, dist = t.ray_cast(o, d.normalized(), far)
            if loc is not None and (best is None or dist < best[1]): best = (k, dist)
        return best
    def ahead(dn, az=0.0):
        return V((math.sin(az * DEG) * math.cos(dn * DEG), -math.sin(dn * DEG), -math.cos(az * DEG) * math.cos(dn * DEG)))
    # straight ahead (cockpit.test.mjs's scan): the first thing of it seen going down is the roll's crest, 12.1–12.6° under
    # the eye, and then the roll's face all the way down past 14.6°
    edge = None; dn = 11.0
    while dn < 16 and edge is None:
        h = first(EYE, ahead(dn))
        if h: edge = (dn, h[0])
        dn += 0.01
    assert edge and 12.1 <= edge[0] <= 12.6 and edge[1] == 'glareshield.glareLip', ('the edge straight ahead', edge)
    for k in range(int((14.6 - edge[0]) / 0.1)):
        h = first(EYE, ahead(edge[0] + 0.05 + 0.1 * k)); assert h and h[0] == 'glareshield.glareLip', ('the roll seen straight ahead', edge[0] + 0.05 + 0.1 * k, h)
    # across (FLIGHT LAB's EDGE table: the lip's edge from 15° left to 45° right): only ever the roll at the edge
    edges = {}
    for az in range(-15, 50, 5):
        dn = 6.0; h = None
        while dn < 25 and h is None:
            h = first(EYE, ahead(dn, az)); dn += 0.02
        assert h and h[0] == 'glareshield.glareLip', ('the edge at', az, h)
        edges[az] = round(dn - 0.02, 2)
    # under it: the screens' image and the controls' aim points seen from the eye (with 2 mm to spare)
    for name, p in [('screen', q) for q in SEEN] + list(AIMS.items()):
        for up in (0.0, 0.002):
            t = V(p) + V((0, up, 0)); d = t - EYE; h = first(EYE, d, d.length)
            assert h is None, ('hidden under the glareshield', name, p, up, h)
    # the roll's underside over the panel's bezels (their tops at y 0.447) and inside the side walls (the side glass ~16 mm
    # beyond); the hood against the walls
    vs = [v.co for v in lip.data.vertices]
    assert min(v.y for v in vs if v.z > L.ZK - 0.004) > L.YB - 0.0005, ('the roll comes down onto the panel', min(v.y for v in vs))
    for ob, slack in ((lip, -0.0015), (hd, 0.0005), (rb, 0.0)):
        for v in ob.data.vertices:
            assert abs(v.co.x) <= ctx.bandX(v.co.y) + slack, (ob.name, 'through the side wall', tuple(v.co))
    # the hood meets the glass no higher than the old hood did (ws.y0 − 0.002), 1–3 mm on the cabin's side of it (z >
    # wsZ), never through it; nor the bead
    front = [v.co for v in hd.data.vertices if abs(v.co.y - L.YF) < 1e-5]
    assert L.YF <= ctx.WS['y0'] - 0.002 and front and all(0.001 <= v.z - ctx.wsZ(v.x, v.y) <= 0.003 for v in front), ('the hood at the glass', [tuple(v) for v in front])
    for ob in (hd, rb):
        for v in ob.data.vertices:
            if v.co.y >= L.YF - 1e-6: assert v.co.z >= ctx.wsZ(v.co.x, v.co.y) + 1e-4, (ob.name, 'through the glass', tuple(v.co))
    # the windshield's centre strip (cockpit.js: a tube r 0.011 up the glass's middle, 8 mm off it, from y ws.y0 + 0.01):
    # its lower end goes out of sight behind the crest (the lowest point of its open end's ring); the hood under it
    # cannot reach higher (it stays under the line of sight over the crest), so the top of the open end still shows
    ys = ctx.WS['y0'] + 0.01; zt = ctx.wsZ(0, ys) + 0.008
    ax = V((0, 1, (ctx.WS['z1'] - ctx.WS['z0']) / (ctx.WS['y1'] - ctx.WS['y0']))).normalized()
    low = V((0, ys, zt)) - V((0, ax.z, -ax.y)) * 0.011
    d = low - EYE; h = first(EYE, d, d.length)
    assert h and h[0] == 'glareshield.glareLip', ('the centre strip\'s end shows under the crest', tuple(low), h)
    y_top = 0.6 - first(V((0, 0.6, zt)), V((0, -1, 0)))[1]
    # the margins (for the report): the roll's underside over the lines of sight to the screens' top, in the section
    def line_y(p, z): return EYE.y + (p[1] - EYE.y) * (EYE.z - z) / (EYE.z - p[2])
    under = min(v.y - line_y(SEEN[1], v.z) for v in vs if v.z > L.ZK - 0.004)
    bb0 = V((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs))); bb1 = V((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
    print('glareshield: crest scale %.4f, edge straight ahead %.2f°, edges by azimuth %s; the roll\'s underside %.1f mm over the sight '
          'line to the screens\' top; the roll from %s to %s; the hood under the centre strip at y %.4f'
          % (L.S, edge[0], edges, under * 1000, tuple(round(c, 4) for c in bb0), tuple(round(c, 4) for c in bb1), y_top))
