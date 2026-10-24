# CADET — tools/actor/build_actor.py : the academy's people's heads and uniforms, made in Blender (run in the
# background, no window):
#   node tools/actor/anchors.mjs > /tmp/anchors.json
#   blender -b --factory-startup -P tools/actor/build_actor.py -- /tmp/anchors.json assets/model/actor.glb [preview_dir]
# Everything is made by this script (no other files: see assets/CREDITS.md). The parts are modelled dense from
# shape functions, then Blender's decimation (collapse) brings each down to its share of the triangle budget, keeping
# the triangles where the shape bends (the eyes, the nose, the lips, the collar). Each vertex then gets an ambient
# occlusion factor (rays against the dense parts: the creases round the eyes, under the hair, the collar, the pockets),
# stored as its colour (COLOR_0, grey); the game multiplies it by the person's colours.
# Coordinates are the game's (metres, y up, the face towards +z, feet at y = 0): the glTF is written without the
# exporter's z-up conversion. Mesh names: part.variant.colour.class (npc/actor-model.js reads them):
#   part     the bone it goes on (head, lids, irisL, mouth, torso, …), the vertices in the bind pose (not the bone's frame)
#   variant  base (always), or what opts.look picks: hair-short / hair-crop / hair-long / hair-bun, glasses, tie, notie,
#            badge, lanyard, bars, bar1 … bar4 (shown when bars ≥ k), nametag
#   colour   a key of actor.js COLORS (the person's colour), or xRRGGBB
#   class    a material class of actor.js CLASSES (roughness / metalness)
import bpy, bmesh, json, math, sys, os
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
A = json.load(open(argv[0]))
OUT = argv[1]
PREVIEW = argv[2] if len(argv) > 2 else None
HD, EYE, MOUTH, P = A['HD'], A['EYE'], A['MOUTH'], A['P']
TAU, DEG = math.tau, math.pi / 180

def clamp(v, a, b): return a if v < a else b if v > b else v
def lerp(a, b, t): return a + (b - a) * t
def smooth(e0, e1, x):
    t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def gauss(x, y, cx, cy, sx, sy): return math.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2))

# ---------------------------------------------------------------- the scene
bpy.ops.wm.read_factory_settings(use_empty=True)
COL = bpy.data.collections.new('export'); bpy.context.scene.collection.children.link(COL)
AUX = bpy.data.collections.new('aux'); bpy.context.scene.collection.children.link(AUX)

def mesh_obj(name, verts, faces, coll=None):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], [tuple(f) for f in faces]); me.update()
    ob = bpy.data.objects.new(name, me); (coll or AUX).objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob

def bm_obj(name, bm, coll=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update()
    ob = bpy.data.objects.new(name, me); (coll or AUX).objects.link(ob)
    for p in me.polygons: p.use_smooth = True
    return ob

def tris(ob): return sum(len(p.vertices) - 2 for p in ob.data.polygons)

def apply_mod(ob, kind, **kw):
    m = ob.modifiers.new('m', kind)
    for k, v in kw.items(): setattr(m, k, v)
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=m.name)

def decimate(ob, target, **kw):
    n = tris(ob)
    if n > target: apply_mod(ob, 'DECIMATE', decimate_type='COLLAPSE', ratio=target / n, use_collapse_triangulate=True, **kw)
    triangulate(ob)
    return ob

def triangulate(ob):
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.triangulate(bm, faces=bm.faces[:]); bm.to_mesh(ob.data); bm.free(); ob.data.update()

def copy_obj(ob, name):
    c = ob.copy(); c.data = ob.data.copy(); c.name = name; c.data.name = name; AUX.objects.link(c); return c

def map_verts(ob, fn):
    for v in ob.data.vertices: v.co = Vector(fn(Vector(v.co)))
    ob.data.update()

def uv_sphere(name, segs, rings, r=1.0):
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=r)
    # (Blender's sphere has its poles on z: turn them onto y, the game's up)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2, 3, 'X'))
    return bm_obj(name, bm)

def ellipsoid(name, c, r, segs=16, rings=10):
    ob = uv_sphere(name, segs, rings); map_verts(ob, lambda v: (c[0] + v.x * r[0], c[1] + v.y * r[1], c[2] + v.z * r[2])); return ob

def delete_verts(ob, test):
    bm = bmesh.new(); bm.from_mesh(ob.data)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if test(v.co)], context='VERTS'); bm.to_mesh(ob.data); bm.free(); ob.data.update()

def join(obs, name):
    obs = [o for o in obs if o]
    with bpy.context.temp_override(active_object=obs[0], selected_editable_objects=obs, selected_objects=obs):
        bpy.ops.object.join()
    obs[0].name = name; obs[0].data.name = name; return obs[0]

# a tube through rings (each a list of points in the same turning order); caps: None or the bulge of a fan at the end
def loft(name, rings, cap0=None, cap1=None, closed=True):
    verts, faces, seg = [], [], len(rings[0])
    for r in rings: verts += r
    m = seg if closed else seg - 1
    for i in range(len(rings) - 1):
        for j in range(m):
            a, b = i * seg + j, i * seg + (j + 1) % seg
            faces.append((a, b, b + seg, a + seg))
    # (faces turned outwards: the first ring pair's quad against the ring's middle)
    if len(rings) > 1:
        c0 = sum((Vector(p) for p in rings[0]), Vector()) / seg; c1 = sum((Vector(p) for p in rings[1]), Vector()) / seg
        qa, qb, qc = Vector(verts[faces[0][0]]), Vector(verts[faces[0][1]]), Vector(verts[faces[0][2]])
        if (qb - qa).cross(qc - qa).dot((qa + qc) / 2 - (c0 + c1) / 2) < 0: faces = [tuple(reversed(f)) for f in faces]
    flipped = len(rings) > 1 and faces and faces[0][0] != 0
    for cap, ri, sgn in ((cap0, 0, -1), (cap1, len(rings) - 1, 1)):
        if cap is None: continue
        r = rings[ri]; c = Vector((0, 0, 0))
        for p in r: c += Vector(p)
        c /= seg; n = (Vector(rings[min(ri + 1, len(rings) - 1)]) if False else None)
        verts.append(tuple(c + cap)); ci = len(verts) - 1
        for j in range(seg):
            a, b = ri * seg + j, ri * seg + (j + 1) % seg
            f = (ci, b, a) if sgn < 0 else (ci, a, b)
            faces.append(tuple(reversed(f)) if flipped else f)
    return mesh_obj(name, verts, faces)

# ---------------------------------------------------------------- the head's shape (the same as actor.js headPt / faceZ)
def head_pt(ux, uy, uz):
    W = HD['w'] - HD['jaw'] * smooth(-0.15, -0.9, uy)
    y = HD['cy'] + uy * (HD['ryU'] if uy >= 0 else HD['ryL']) + 0.026 * smooth(-0.5, -1, uy) * smooth(0.5, -0.6, uz)
    back = HD['dB'] * (1 - 0.42 * smooth(-0.1, -0.75, uy))
    z = HD['cz'] + (math.pow(uz, 0.8) * HD['dF'] if uz >= 0 else -math.pow(-uz, 0.9) * back) + HD['chin'] * smooth(-0.25, -1, uy)
    return Vector((ux * W, y, z))

def face_z(x, y):
    uy = (y - HD['cy']) / (HD['ryU'] if y >= HD['cy'] else HD['ryL'])
    ux = x / (HD['w'] - HD['jaw'] * smooth(-0.15, -0.9, uy))
    return HD['cz'] + math.pow(max(1 - ux * ux - uy * uy, 0), 0.4) * HD['dF'] + HD['chin'] * smooth(-0.25, -1, uy)

ER, EX, EY, EZ = EYE['r'], EYE['x'], EYE['y'], EYE['z']
MOUTH_C = MOUTH['y']                                       # the line between the lips
# the eye's opening: an almond round each eye (half width, half height; the outer corner 1 mm higher)
ALM = dict(w=0.0118, h=0.0056, tilt=0.06)
def almond(x, y, s):
    dx = (x - s * EX) * s; yc = EY + 0.0004 + ALM['tilt'] * dx
    # (fuller over the iris, pointed at the corners)
    hh = ALM['h'] * (1 - 0.18 * (dx / ALM['w']) ** 2)
    return (dx / ALM['w']) ** 2 + ((y - yc) / hh) ** 2

def ball_z(x, y, s, extra=0.0):
    dx, dy = x - s * EX, y - EY; q = (ER + extra) ** 2 - dx * dx - dy * dy
    return EZ + math.sqrt(max(q, (0.3 * ER) ** 2))

# the face: the profile down the middle (absolute z at heights from the eyes, the nose apart), spread sideways
# (half widths) — from measurements of adult faces: the brow ridge about 8 mm in front of the eye, the lips 6 mm, the
# chin flush with it; the nose 18 mm out at its tip
def interp(T, y):
    # a smooth curve through rows (y, values…) (Catmull-Rom in y)
    if y <= T[0][0]: return list(T[0][1:])
    if y >= T[-1][0]: return list(T[-1][1:])
    i = 0
    while T[i + 1][0] < y: i += 1
    p0, p1, p2, p3 = T[max(i - 1, 0)], T[i], T[i + 1], T[min(i + 2, len(T) - 1)]
    t = (y - p1[0]) / (p2[0] - p1[0]); out = []
    for k in range(1, len(p1)):
        m1 = (p2[k] - p0[k]) / max(p2[0] - p0[0], 1e-9) * (p2[0] - p1[0]); m2 = (p3[k] - p1[k]) / max(p3[0] - p1[0], 1e-9) * (p2[0] - p1[0])
        t2, t3 = t * t, t * t * t
        out.append((2 * t3 - 3 * t2 + 1) * p1[k] + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * p2[k] + (t3 - t2) * m2)
    return out
ZC = EZ + ER                                               # the front of the eye (the cornea)
# (height from the eyes, z of the profile − the cornea's, half width of the spread)
PROFILE = [(0.085, None, 0.07), (0.045, 0.0008, 0.065), (0.024, 0.0068, 0.05), (0.016, 0.0078, 0.04), (0.008, 0.0034, 0.03), (0.0, 0.0, 0.03),
    (-0.02, -0.0005, 0.035), (-0.045, 0.0, 0.03), (-0.054, 0.0008, 0.024), (-0.062, 0.0058, 0.0215), (-0.068, 0.0066, 0.021), (-0.0745, 0.0038, 0.02),
    (-0.081, 0.0018, 0.02), (-0.091, -0.0028, 0.022), (-0.103, 0.0012, 0.021), (-0.112, -0.0035, 0.024), (-0.12, -0.016, 0.03), (-0.13, None, 0.04)]
def base_mid(y): return face_z(0, y)
def profile_lift(y):
    # how far the profile stands in front of the deformed sphere at height y (0 above and below the rows)
    dy = y - EY
    if dy >= PROFILE[0][0] or dy <= PROFILE[-1][0]: return 0.0, 0.04
    rows = [(r[0], (r[1] if r[1] is not None else base_mid(EY + r[0]) - ZC), r[2]) for r in PROFILE]
    rows = [(r[0], r[1] + ZC - base_mid(EY + r[0]), r[2]) for r in rows]
    rows.reverse()
    lift, w = interp(rows, dy); return lift, w
# the nose: (height from the eyes, out of the profile, half width)
NOSE = [(0.008, 0.0, 0.009), (0.0, 0.0018, 0.0072), (-0.012, 0.0052, 0.0062), (-0.024, 0.0098, 0.0064), (-0.034, 0.0138, 0.0072), (-0.0425, 0.0172, 0.0088),
    (-0.047, 0.0168, 0.0094), (-0.0505, 0.0106, 0.0072), (-0.0535, 0.0022, 0.0062), (-0.057, 0.0, 0.006)]
def nose(x, y):
    dy = y - EY
    if dy > NOSE[0][0] or dy < NOSE[-1][0]: return 0.0
    h, w = interp(list(reversed(NOSE)), dy)
    u = abs(x) / max(w, 1e-4)
    return max(h, 0) * max(0.0, 1 - u * u) ** 1.5
def relief(x, y):
    lift, w = profile_lift(y)
    d = lift * math.exp(-(x / w) ** 2) + nose(x, y)
    for s in (-1, 1):
        d += 0.0052 * gauss(x, y, s * 0.0112, EY - 0.0488, 0.0048, 0.0042)          # the wings of the nose
        d -= 0.0014 * gauss(x, y, s * 0.0066, EY - 0.0525, 0.0024, 0.0016)          # the nostrils' shadow
        d += 0.0034 * gauss(x, y, s * 0.046, EY - 0.026, 0.017, 0.013)              # cheekbones
        d -= 0.0012 * gauss(x, y, s * 0.0232, EY - 0.0745, 0.003, 0.0035)           # the mouth's corners
        d += 0.0016 * gauss(x, y, s * 0.04, EY + 0.021, 0.014, 0.006)               # the brow ridge, outer
        d -= 0.0005 * gauss(x, y, s * 0.019, EY - 0.056, 0.006, 0.010)              # the cheek's crease beside the nose and mouth
    d -= 0.0007 * gauss(x, y, 0, EY - 0.0585, 0.0026, 0.003)                        # the philtrum
    return d

def ball_soft(x, y, s, extra):
    # the eyeball's front surface (radius + extra), carried on smoothly past its rim (the eye's corners sit deep)
    R = ER + extra; dx, dy = x - s * EX, y - EY; rr = math.hypot(dx, dy); k = 0.86 * R
    if rr < k: return EZ + math.sqrt(R * R - rr * rr)
    z0 = math.sqrt(R * R - k * k); slope = k / z0
    return EZ + z0 - slope * (rr - k) + 0.5 * slope * (rr - k) ** 2 / R

def eye_shape(x, y, z):
    # round each eye: the lids hug the ball at the opening and thicken a little, then run out into the face; the skin
    # is never behind the ball outside the opening (it would show through). Inside the opening the skin is cut away
    # (head_skin: a boolean), so the eye shows in a clean almond.
    for s in (-1, 1):
        a = almond(x, y, s)
        if a > 7: continue
        dx = (x - s * EX) * s
        lid = ball_soft(x, y, s, 0.0003 + 0.0017 * smooth(1.0, 1.7, a) - 0.0006 * smooth(1.8, 3.2, a))
        w = smooth(3.6, 1.15, a) if y >= EY else smooth(3.0, 1.15, a)
        z = lerp(z, lid, w)
        if y > EY: z -= 0.0011 * gauss(dx, y, 0.001, EY + 0.0092 + 0.03 * dx, 0.012, 0.0018) * smooth(1.6, 2.4, a)   # the upper lid's crease
        else: z -= 0.0006 * gauss(dx, y, 0.003, EY - 0.0098, 0.012, 0.0025) * smooth(1.8, 2.6, a)                    # the line under the lower lid
        if math.hypot(x - s * EX, y - EY) < ER * 1.02 and a >= 0.98: z = max(z, ball_soft(x, y, s, 0.0007))
    return z

def almond_cutter(s, name):
    # a prism through the face along the almond (a = 1), for the boolean that opens the eye
    pts = []
    for k in range(64):
        t = k / 64 * TAU; c, sn = math.cos(t), math.sin(t)
        lo, hi = 0.0, 0.03                                   # (a = 1 along the ray from the eye's centre: bisection)
        for _ in range(40):
            m = (lo + hi) / 2; (lo, hi) = (m, hi) if almond(s * EX + c * m, EY + 0.0004 + sn * m, s) < 1 else (lo, m)
        pts.append((s * EX + c * lo, EY + 0.0004 + sn * lo))
    z0, z1 = EZ + 0.002, EZ + 0.05
    verts = [(x, y, z0) for x, y in pts] + [(x, y, z1) for x, y in pts]
    n = len(pts); faces = [tuple(range(n))[::-1], tuple(range(n, 2 * n))] + [(k, (k + 1) % n, n + (k + 1) % n, n + k) for k in range(n)]
    return mesh_obj(name, verts, faces)

def boolean_cut(ob, cutter):
    # the difference, then the faces the cutter left (the tunnel's walls) removed: only the hole stays
    ob.data.materials.append(bpy.data.materials.new('keep')); cutter.data.materials.append(bpy.data.materials.new('cut'))
    apply_mod(ob, 'BOOLEAN', operation='DIFFERENCE', object=cutter, solver='EXACT')
    bm = bmesh.new(); bm.from_mesh(ob.data)
    ci = [i for i, m in enumerate(ob.data.materials) if m and m.name.startswith('cut')]
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.material_index in ci], context='FACES')
    bm.to_mesh(ob.data); bm.free(); ob.data.materials.clear(); ob.data.update()
    bpy.data.objects.remove(cutter)

# the hairline: [|azimuth| (0 = the forehead, 180 = the nape), its angle from the crown] (as actor.js)
HAIRLINE = [(0, 46), (24, 47.5), (44, 50), (54, 56), (62, 71), (70, 91), (77, 98), (83, 95), (89, 80), (98, 76), (107, 78), (114, 88),
            (122, 101), (140, 115), (160, 122), (180, 124)]
def hairline(a):
    a = abs(a); i = 0
    while i < len(HAIRLINE) - 2 and HAIRLINE[i + 1][0] < a: i += 1
    (a0, t0), (a1, t1) = HAIRLINE[i], HAIRLINE[i + 1]; return lerp(t0, t1, clamp((a - a0) / (a1 - a0), 0, 1))
# a unit-sphere direction's (azimuth, angle from the crown), degrees: azimuth 0 at the face (+z), + towards +x
def sph(v):
    v = v.normalized(); return math.degrees(math.atan2(v.x, v.z)), math.degrees(math.acos(clamp(v.y, -1, 1)))

# ---------------------------------------------------------------- the head's parts
def head_skin_full():
    # the dense skin, the eyes opened (also the surface the other parts are put on, and an occluder for the shading)
    ob = uv_sphere('skin-dense', 440, 300)
    def f(v):
        p = head_pt(v.x, v.y, v.z); front = smooth(0.15, 0.6, v.z)
        if front > 0:
            z = p.z + relief(p.x, p.y) * smooth(0.0, 0.45, v.z)
            p.z = lerp(p.z, eye_shape(p.x, p.y, z), front)
        return p
    # under the hair (3° inside the hairline and up) there is no skin to see: left out (the hair covers it)
    delete_verts(ob, lambda v: (lambda az, th: th < hairline(az) - 5)(*sph(v)))
    map_verts(ob, f)
    for s in (-1, 1): boolean_cut(ob, almond_cutter(s, f'cut{s}'))
    return ob

class Surface:
    # ray casts onto a dense mesh: the point on it in front of (x, y) (looking along −z), its normal
    def __init__(self, ob):
        bm = bmesh.new(); bm.from_mesh(ob.data); self.bvh = BVHTree.FromBMesh(bm); bm.free()
    def front(self, x, y, z0=0.3):
        hit, n, i, d = self.bvh.ray_cast(Vector((x, y, z0)), Vector((0, 0, -1)), 1.0)
        return (hit, n) if hit else (None, None)
    def along(self, origin, direction):
        hit, n, i, d = self.bvh.ray_cast(Vector(origin), Vector(direction).normalized(), 1.0)
        return (hit, n) if hit else (None, None)

# hair: a shell over the head from the crown to the hairline, thick on top and thin at the sides, its edge thinning to
# nothing on the skin. Strands: grooves that run from a side parting on the left (+x) down and back to the ears
# (the lines of longitude round a point low behind each ear); the parting itself a fine crease. style: short, crop
# (thin, no parting: a close cut), long and bun (fuller; tied back: their tail or bun separate)
PART_AZ = 38.0
def hair_shell(name, style):
    k = {'crop': 0.5, 'long': 1.2, 'bun': 1.2}.get(style, 1.0)
    NA, NT = 360, 70
    poleR, poleL = Vector((-0.75, -0.45, -0.5)).normalized(), Vector((0.8, -0.45, -0.45)).normalized()
    def lon(d, pole, ref):
        # the longitude of the direction d round the pole (radians)
        x = (ref - pole * ref.dot(pole)).normalized(); y = pole.cross(x)
        q = d - pole * d.dot(pole); return math.atan2(q.dot(y), q.dot(x))
    rows = []
    for j in range(NT + 1):
        f = j / NT; row = []
        for i in range(NA):
            az = -180 + 360 * i / NA
            # the edge: a little ragged at the front (the fringe's tips), even elsewhere
            jag = 0.9 * math.sin(math.radians(az) * 23) * math.exp(-(az / 45) ** 2) if style != 'crop' else 0
            th = max((hairline(az) + jag * f ** 6) * f, 0.05)
            d = Vector((math.sin(math.radians(th)) * math.sin(math.radians(az)), math.cos(math.radians(th)), math.sin(math.radians(th)) * math.cos(math.radians(az))))
            base = head_pt(d.x, d.y, d.z)
            t = lerp(0.0135 * k, 0.0003, f ** 1.7)
            if style != 'crop':
                # volume: lifted over the forehead on the right of the parting (swept across), fuller at the crown
                t += 0.0055 * math.exp(-(((az + 15) / 40) ** 2)) * math.exp(-(((th - 30) / 16) ** 2))
                t += 0.002 * math.exp(-((th / 25) ** 2))
                # the parting: a narrow crease from the front hairline back towards the crown
                pa = (az - PART_AZ) / 4.5; t -= 0.0032 * math.exp(-pa * pa) * smooth(8, 22, th) * smooth(1.0, 0.75, f) * (1 - smooth(0.85, 1.0, f))
                # strands
                side = poleL if az > PART_AZ else poleR
                l = lon(d, side, Vector((0, 1, 0)))
                g = 0.5 + 0.5 * math.cos(l * (34 if az <= PART_AZ else 22))
                t -= 0.0017 * k * g ** 2 * smooth(0.02, 0.2, f) * (1 - 0.6 * f ** 3)
            else:
                t -= 0.00035 * (0.5 + 0.5 * math.cos(math.radians(az) * 50))
            c = Vector((0, HD['cy'], HD['cz'])); n = (base - c).normalized()
            row.append(tuple(base + n * t))
        rows.append(row)
    verts = [v for r in rows for v in r]
    faces = []
    for j in range(NT):
        for i in range(NA):
            a, b = j * NA + i, j * NA + (i + 1) % NA
            faces.append((a, a + NA, b + NA, b))
    ob = mesh_obj(name, verts, faces)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6); bm.to_mesh(ob.data); bm.free()
    return ob

def hair_tail(name):
    # a tail tied at the back of the head, hanging down the nape: thick at the tie, thinning to its end, strands as grooves
    pts = [Vector(p) for p in [(0, 1.662, -0.1), (0, 1.63, -0.124), (0, 1.575, -0.131), (0, 1.515, -0.121), (0, 1.468, -0.106), (0, 1.44, -0.096)]]
    rings, N = [], 18
    for k in range(25):
        t = k / 24; seg = min(int(t * (len(pts) - 1)), len(pts) - 2); u = t * (len(pts) - 1) - seg
        c = pts[seg].lerp(pts[seg + 1], u); tan = (pts[seg + 1] - pts[seg]).normalized()
        side = Vector((1, 0, 0)); nrm = side.cross(tan).normalized()
        r = lerp(0.019, 0.006, t ** 1.3) * (1 + 0.25 * math.sin(math.pi * min(1, t * 2.2)))
        ring = []
        for j in range(N):
            a = j / N * TAU; rr = r * (1 - 0.12 * (0.5 + 0.5 * math.cos(a * 9 + t * 2.0)))
            ring.append(tuple(c + side * math.cos(a) * rr * 1.1 + nrm * math.sin(a) * rr))
        rings.append(ring)
    return loft(name, rings, cap0=Vector((0, 0.002, 0.004)), cap1=Vector((0, -0.004, 0)))

def hair_bun(name):
    ob = uv_sphere(name, 28, 18)
    def f(v):
        # a coil: grooves winding round it
        a = math.atan2(v.z, v.x); g = 0.5 + 0.5 * math.cos(a * 2 + v.y * 14)
        r = 1 - 0.07 * g
        return (v.x * 0.034 * r, 1.64 + v.y * 0.029 * r, -0.117 + v.z * 0.026 * r)
    map_verts(ob, f); return ob

def hair_tie(name, c, r, axis_tilt):
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=r, radius2=r, depth=0.01)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(-math.pi / 2 + axis_tilt, 3, 'X'))
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector(c)); return bm_obj(name, bm)

def ear(name, s):
    # a flattened shape with its rim (the helix) standing out and the bowl (the concha) pressed in, the lobe below;
    # tilted back a little, its back standing off the head (as actor.js put the old ones)
    ob = uv_sphere(name, 22, 16)
    def f(v):
        x, y, z = v.x, v.y, v.z
        rim = math.hypot(y, z); out = max(x, 0)
        # the bowl: the outer face pressed in towards its middle, the rim kept
        x -= 1.25 * out * math.exp(-((rim / 0.62) ** 4)) * (1 - 0.45 * smooth(-0.2, -0.75, y))
        # the lobe: narrower and fleshy at the bottom
        zs = 1 - 0.3 * smooth(-0.35, -0.9, y)
        return (x * 0.0088, y * 0.029, z * 0.0178 * zs)
    map_verts(ob, f)
    M = Matrix.Translation((s * 0.0765, 1.604, -0.012)) @ Matrix.Rotation(s * -0.06, 4, 'Z') @ Matrix.Rotation(s * -0.42, 4, 'Y') @ Matrix.Rotation(-0.16, 4, 'X')
    if s < 0: M = M @ Matrix.Scale(-1, 4, (1, 0, 0))
    ob.data.transform(M)
    if s < 0: ob.data.flip_normals()
    ob.data.update(); return ob

def brow(name, s, surf):
    # a strip on the brow ridge: thicker at the inner end, arched, thin and lower at the outer end; its edges sink into
    # the skin; a few tufts along its upper edge
    rows = [[], [], []]; N = 9
    for i in range(N + 1):
        u = i / N; x = lerp(0.0122, 0.0515, u)
        yc = 1.6455 + 0.0046 * math.sin(math.pi * min(1, u * 1.25)) - 0.004 * u * u
        hw = lerp(0.0036, 0.0012, u ** 0.8); lift = lerp(0.0028, 0.0018, u)
        for k, (dy, dz) in enumerate([(hw, 0.0006), (0, lift), (-hw * 0.9, 0.0006)]):
            p, n = surf.front(s * x, yc + dy)
            rows[k].append(tuple(p + n * dz) if p else (s * x, yc + dy, face_z(x, yc + dy) + dz))
    verts = rows[0] + rows[1] + rows[2]; faces = []
    for r in range(2):
        for i in range(N):
            a, b = r * (N + 1) + i, r * (N + 1) + i + 1
            faces.append((a, b, b + N + 1, a + N + 1))
    return orient_out(mesh_obj(name, verts, faces), Vector((s * 0.03, HD['cy'], HD['cz'])))   # (drawn one-sided: facing out)

def eyeball(name, s):
    # the eyeball's front (the rest is inside the head)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=10, radius=ER)
    # (z is already forwards: Blender's sphere has its poles on z, the iris end at +z)
    bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((s * EX, EY, EZ)))
    # only what can show through the opening (the rest could only ever show through the skin where it should not)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < EZ - 0.25 * ER or almond(v.co.x, v.co.y, s) > 2.6], context='VERTS')
    return bm_obj(name, bm)

def iris_parts(L):
    # on the front of the eyeball: the iris (a dark ring at its edge, the limbus), the pupil; in the eye bone's frame
    # (the eye's centre at 0), as actor.js turns it
    out, seg = [], 14
    def at(th, ph, r): th = math.radians(th); return (math.sin(th) * math.cos(ph) * ER * r, math.sin(th) * math.sin(ph) * ER * r, math.cos(th) * ER * r)
    for key, a0, a1, r, rings in (('lash', 26, 33, 1.010, 1), ('iris', 13.5, 26.5, 1.013, 2), ('pupil', 0, 14, 1.018, 1)):
        verts, faces = [], []
        for j in range(rings + 1):
            for i in range(seg): verts.append(at(lerp(a0, a1, j / rings), i / seg * TAU, r))
        for j in range(rings):
            for i in range(seg):
                a, b = j * seg + i, j * seg + (i + 1) % seg; faces.append((a, b, b + seg, a + seg))
        if a0 == 0:                                          # (the pupil: a fan round its middle)
            verts = [(0, 0, ER * r)] + verts[seg:]; faces = [(0, 1 + i, 1 + (i + 1) % seg) for i in range(seg)]
        out.append(orient_out(mesh_obj(f'iris{L}.base.{key}.iris', verts, faces), Vector((0, 0, 0))))
    return out

def orient_out(ob, centre):
    # faces turned to face away from centre
    me = ob.data; flip = 0
    for p in me.polygons: flip += 1 if p.normal.dot(p.center - centre) < 0 else -1
    if flip > 0: me.flip_normals()
    me.update(); return ob

def lids(name):
    # the upper lids: one mesh for both eyes, in the frame of their pivot (the line through the eyes' centres), a cap
    # over each ball (1.1 × its radius: just in front of it) whose lower edge rolls back onto the ball (the lid's
    # thickness); actor.js turns it down to blink and up and down with the gaze
    obs = []
    for s in (-1, 1):
        rows = []
        for j in range(7):
            t = j / 6
            # polar angle from the top (0) to the edge at the equator (90°); the last rows roll in under the edge
            th = math.radians(lerp(0, 90, min(t / 0.84, 1)))
            rr = ER * (1.1 if t <= 0.84 else 1.025)
            row = []
            for i in range(11):
                ph = math.radians(lerp(-80, 80, i / 10))     # (only the front: the back is inside the head)
                row.append((s * EX + rr * math.sin(th) * math.sin(ph), rr * math.cos(th), rr * math.sin(th) * math.cos(ph)))
            rows.append(row)
        verts = [v for r in rows for v in r]; faces = []
        for j in range(6):
            for i in range(10):
                a = j * 11 + i; faces.append((a, a + 1, a + 12, a + 11))
        obs.append(mesh_obj(f'lid{s}', verts, faces))
    ob = join(obs, name)
    bm = bmesh.new(); bm.from_mesh(ob.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-7); bm.to_mesh(ob.data); bm.free()
    me = ob.data; flip = sum(1 if p.normal.dot(p.center - Vector((math.copysign(EX, p.center.x), 0, 0))) < 0 else -1 for p in me.polygons)
    if flip > 0: me.flip_normals()
    return ob

def mouth_parts(surf):
    # the mouth: a dark line between the lips that opens (a shape key: the morph target actor.js drives), the lower lip
    # that drops with it, and the upper teeth that show when it is open. On the face's surface (ray cast)
    bend = lambda x: 0.0022 * (x / 0.021) ** 2
    def on(x, y, dz):
        p, n = surf.front(x, y)
        return (p + n * dz) if p else Vector((x, y, face_z(x, y) + dz))
    parts = []
    def sheet(name, nx, ny, closed, opened):
        # a grid (u, v in −1…1) whose points closed(u, v) / opened(u, v) give (x, y, dz above the skin)
        base, key = [], []
        for j in range(ny + 1):
            for i in range(nx + 1):
                u, v = -1 + 2 * i / nx, -1 + 2 * j / ny
                base.append(on(*closed(u, v))); key.append(on(*opened(u, v)))
        faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
        ob = mesh_obj(name, base, faces)
        ob.shape_key_add(name='closed'); k = ob.shape_key_add(name='open'); k.value = 0.0   # (Blender makes a new key at 1)
        for idx, p in enumerate(key): k.data[idx].co = p
        return ob
    lens = lambda u, v: math.sqrt(max(0, 1 - u * u)) * v           # (an ellipse's outline: v from −1 to 1)
    # the opening: a sliver when closed, an oval when open (the inside a little behind the lips)
    parts.append(sheet('mouth.base.mouth.mouth', 12, 4,
        lambda u, v: (u * 0.0232, MOUTH_C + bend(u * 0.0232) + v * 0.0011 * (0.4 + 0.6 * math.sqrt(max(0, 1 - u * u))), 0.0007),
        lambda u, v: (u * 0.0185, MOUTH_C - 0.0062 + bend(u * 0.0185) * 0.6 + lens(u, v) * 0.0068 * (1 - 0.15 * u * u), -0.0015 + 0.0012 * (1 - u * u))))
    # the upper teeth: hidden in the line when closed, a band under the upper lip when open
    parts.append(sheet('mouth.base.xe9e4da.eye', 8, 1,
        lambda u, v: (u * 0.012, MOUTH_C + bend(u * 0.012) + 0.0002 * v, -0.0028),
        lambda u, v: (u * 0.0125, MOUTH_C - 0.0012 + bend(u * 0.0125) * 0.6 + 0.0011 * v - 0.0008 * u * u, -0.0006 + 0.0006 * (1 - u * u))))
    # the lower lip: a soft roll under the line, down with the jaw when open
    def lip(drop):
        def f(u, v):
            w = math.sqrt(max(0, 1 - u * u)); x = u * 0.0172
            return (x, MOUTH_C - 0.0004 - 0.0056 * (1 - v) / 2 * (0.55 + 0.45 * w) + bend(x) * 0.6 - drop, 0.0029 * w ** 0.7 * math.sin(math.pi * (v + 1) / 2) ** 0.6 - 0.0003)
        return f
    parts.append(sheet('mouth.base.lip.skin', 12, 4, lip(0), lip(0.0098)))
    return parts

# ---------------------------------------------------------------- shading: ambient occlusion and tints, as the vertex colour
def ao_rays(n=40):
    # cosine-weighted directions round +z (a fixed pattern: the same result every run)
    out, g = [], math.pi * (3 - math.sqrt(5))
    for i in range(n):
        r = math.sqrt((i + 0.5) / n); a = i * g
        out.append(Vector((r * math.cos(a), r * math.sin(a), math.sqrt(max(0, 1 - r * r)))))
    return out
RAYS = ao_rays()

def occluder(obs):
    bm = bmesh.new()
    for ob in obs:
        tmp = bmesh.new(); tmp.from_mesh(ob.data); tmp.transform(ob.matrix_world)
        me = bpy.data.meshes.new('tmp'); tmp.to_mesh(me); tmp.free(); bm.from_mesh(me); bpy.data.meshes.remove(me)
    t = BVHTree.FromBMesh(bm); bm.free(); return t

def shade(ob, bvh, reach=0.03, strength=0.85, tint=None, floor=0.35):
    # each vertex: the share of rays (over its normal's hemisphere) that leave without hitting anything within reach;
    # times tint(position) (an RGB factor: lips, lids) → the colour attribute COLOR_0
    me = ob.data; me.calc_loop_triangles() if hasattr(me, 'calc_loop_triangles') else None
    vals = []
    for v in me.vertices:
        n = v.normal.normalized(); t1 = n.orthogonal().normalized(); t2 = n.cross(t1)
        o = v.co + n * 0.0002; free = 0.0
        for r in (RAYS if bvh else ()):
            d = t1 * r.x + t2 * r.y + n * r.z
            hit = bvh.ray_cast(o, d, reach)[0]
            if hit is None: free += 1
            else: free += min(1.0, (hit - o).length / reach) ** 2 * 0.6
        ao = 1 - strength * (1 - free / len(RAYS)) if bvh else 1.0
        ao = max(floor, ao)
        c = tint(v.co) if tint else (1, 1, 1)
        vals.append((ao * c[0], ao * c[1], ao * c[2], 1.0))
    attr = me.color_attributes.new('COLOR_0', 'FLOAT_COLOR', 'POINT')
    for i, c in enumerate(vals): attr.data[i].color = c
    me.color_attributes.active_color = attr
    return ob

def transfer_normals(ob, dense):
    # the decimated mesh shaded like the dense one: its normals taken from the dense surface (custom normals)
    m = ob.modifiers.new('dt', 'DATA_TRANSFER'); m.object = dense; m.use_loop_data = True
    m.data_types_loops = {'CUSTOM_NORMAL'}; m.loop_mapping = 'POLYINTERP_NEAREST'
    with bpy.context.temp_override(object=ob, active_object=ob, selected_objects=[ob]):
        bpy.ops.object.modifier_apply(modifier=m.name)

def to_export(ob, name):
    ob.name = name; ob.data.name = name
    for c in ob.users_collection: c.objects.unlink(ob)
    COL.objects.link(ob); return ob

def srgb(h): return [((h >> s) & 255) / 255 for s in (16, 8, 0)]
def lin(c): return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
def ratio(a, b): A, B = lin(srgb(a)), lin(srgb(b)); return [x / max(y, 1e-4) for x, y in zip(A, B)]
LIP_T, LID_T = ratio(0xb7766a, 0xd8a688), ratio(0xcf9a7c, 0xd8a688)
def skin_tint(p):
    # the upper lip's red (the lower lip is its own part: its colour is the person's), the lids a shade darker, a little
    # colour in the cheeks and on the ears
    x, y, z = p; t = [1.0, 1.0, 1.0]
    def mix(f, c):
        for i in range(3): t[i] *= lerp(1, c[i], f)
    lipf = gauss(x, y, 0, MOUTH_C + 0.0045, 0.02, 0.0028) * smooth(0.0235, 0.017, abs(x)) * smooth(MOUTH_C - 0.0006, MOUTH_C + 0.0008, y)
    mix(min(1, lipf * 1.6), LIP_T)
    for s in (-1, 1):
        a = almond(x, y, s)
        if a < 5: mix(0.5 * smooth(4.2, 1.4, a) * (1 if y > EY - 0.002 else 0.5), LID_T)
        mix(0.35 * gauss(x, y, s * 0.042, 1.585, 0.016, 0.013), (1.02, 0.9, 0.88))
        if abs(x) > 0.07 and z < 0.02: mix(0.4, (1.0, 0.86, 0.84))
    return t

def glasses(surf):
    # thin dark frames: two rounded rims a little in front of the eyes, the bridge, the arms back over the ears
    obs = []
    for s in (-1, 1):
        cx, cy = s * EX, EY - 0.0015
        p, n = surf.front(cx, cy); z0 = (p.z if p else face_z(EX, EY)) + 0.0085
        rows = []
        for k in range(12):
            a = k / 12 * TAU; c, sn = math.cos(a), math.sin(a)
            # a soft rectangle, wider at the top, the outer side a little higher
            x = cx + 0.0182 * math.copysign(abs(c) ** 0.7, c); y = cy + 0.0128 * math.copysign(abs(sn) ** 0.8, sn) * (1.05 if sn > 0 else 0.95) + 0.0012 * c * s
            z = z0 - 0.0045 * ((x - s * 0.003) / 0.03) ** 2 * (1 if s * (x - cx) > 0 else 0.3)
            rows.append(Vector((x, y, z)))
        ring = []
        for k in range(12):
            q = rows[k]; t = (rows[(k + 1) % 12] - rows[k - 1]).normalized(); nz = Vector((0, 0, 1)); b = t.cross(nz).normalized()
            ring.append([tuple(q + b * 0.0011 * math.cos(j / 3 * TAU) + nz * 0.0011 * math.sin(j / 3 * TAU)) for j in range(3)])
        verts = [v for r in ring for v in r]; faces = []
        for k in range(12):
            for j in range(3):
                a, b2 = k * 3 + j, k * 3 + (j + 1) % 3; c2, d = ((k + 1) % 12) * 3 + (j + 1) % 3, ((k + 1) % 12) * 3 + j
                faces.append((a, d, c2, b2))
        obs.append(mesh_obj(f'rim{s}', verts, faces))
        # the arm: from the rim's outer edge back along the side of the head to the ear
        x0 = s * (EX + 0.0185); pa = Vector((x0, cy + 0.004, z0 - 0.003)); pb = Vector((s * 0.0775, EY + 0.002, -0.004)); pc = Vector((s * 0.0745, EY - 0.012, -0.03))
        arm = [pa, pa.lerp(pb, 0.5) + Vector((s * 0.0025, 0, 0)), pb, pc]
        rings = []
        for q in arm: rings.append([tuple(q + Vector((math.cos(j / 4 * TAU) * 0.0009, math.sin(j / 4 * TAU) * 0.0013, 0))) for j in range(4)])
        obs.append(loft(f'arm{s}', rings))
    p, n = surf.front(0, EY + 0.002); zb = (p.z if p else face_z(0, EY)) + 0.004
    br = [[tuple(Vector((x, EY + 0.0035 + 0.002 * (1 - (x / 0.012) ** 2), zb)) + Vector((0, math.cos(j / 4 * TAU) * 0.0009, math.sin(j / 4 * TAU) * 0.0009))) for j in range(4)] for x in (-0.0125, -0.006, 0, 0.006, 0.0125)]
    br2 = []
    for r in br: br2.append([(r[j][0], r[j][1], r[j][2]) for j in range(4)])
    obs.append(loft('bridge', [[(q[0], q[1], q[2]) for q in r] for r in br2]))
    return join(obs, 'glasses')

LASH_T = ratio(0x3a2a24, 0xcf9a7c)
def lash_tint(p):
    # the lid's edge (the lash line) dark
    y = p[1]; return lerp(1, LASH_T[0], smooth(0.0028, 0.0006, y)), lerp(1, LASH_T[1], smooth(0.0028, 0.0006, y)), lerp(1, LASH_T[2], smooth(0.0028, 0.0006, y))

def build_head():
    dense = head_skin_full(); surf = Surface(dense)
    earsD = [ear(f'earD{s}', s) for s in (-1, 1)]
    browsD = [brow(f'brow{s}', s, surf) for s in (-1, 1)]
    hairs = {st: hair_shell(f'hairD-{st}', st) for st in ('short', 'crop', 'long', 'bun')}
    tail, bun = hair_tail('tailD'), hair_bun('bunD')
    balls = [eyeball(f'ball{s}', s) for s in (-1, 1)]
    occ_face = occluder([dense] + earsD + browsD + [hairs['short']] + balls)
    # the skin: decimated to its share, shaded like the dense one, ears joined
    skin = decimate(copy_obj(dense, 'skin'), 790, use_symmetry=True, symmetry_axis='X'); transfer_normals(skin, dense)
    ears = []
    for e in earsD:
        lo = decimate(copy_obj(e, e.name + 'L'), 76); transfer_normals(lo, e); ears.append(lo)
    # (gently: the game's own ambient occlusion (GTAO) adds to it)
    for o in [skin] + ears: shade(o, occ_face, reach=0.018, strength=0.32, floor=0.72, tint=skin_tint)
    out = [to_export(join([skin] + ears, 'h'), 'head.base.skin.skin')]
    for b in balls: shade(b, occ_face, reach=0.008, strength=0.35, floor=0.7)
    out.append(to_export(join(balls, 'b'), 'head.base.eye.eye'))
    for b in browsD: shade(b, occ_face, reach=0.01, strength=0.4)
    out.append(to_export(join(browsD, 'w'), 'head.base.hair.brow'))
    for st, d in hairs.items():
        occ = occluder([d, dense] + earsD + ([tail] if st == 'long' else [bun] if st == 'bun' else []))
        lo = decimate(copy_obj(d, 'hair-' + st), {'short': 670, 'crop': 500, 'long': 530, 'bun': 600}[st], use_symmetry=(st == 'crop'), symmetry_axis='X')
        transfer_normals(lo, d); shade(lo, occ, reach=0.02, strength=0.55)
        parts = [lo]
        if st == 'long':
            t = decimate(copy_obj(tail, 'tail'), 140); transfer_normals(t, tail); shade(t, occ, reach=0.02, strength=0.7); parts.append(t)
        if st == 'bun':
            b = decimate(copy_obj(bun, 'bun'), 150); transfer_normals(b, bun); shade(b, occ, reach=0.02, strength=0.7); parts.append(b)
        out.append(to_export(join(parts, 'hj'), f'head.hair-{st}.hair.hair'))
        tie = hair_tie('tie', (0, 1.655, -0.112), 0.0128, -0.5) if st == 'long' else hair_tie('tie', (0, 1.627, -0.106), 0.017, 0.35) if st == 'bun' else None
        if tie: out.append(to_export(tie, f'head.hair-{st}.x22252c.plastic'))
    g = glasses(surf); out.append(to_export(g, 'head.glasses.x2b2f36.plastic'))
    # the parts that move: no occlusion baked (it would move with them), the lash line and lips tinted
    L = lids('lidsJ'); shade(L, None, tint=lash_tint); L.data.transform(Matrix.Translation((0, EY, EZ)))
    out.append(to_export(L, 'lids.base.lid.skin'))
    for nm, side in (('irisL', 1), ('irisR', -1)):
        for o in iris_parts(nm[-1]): o.data.transform(Matrix.Translation((side * EX, EY, EZ))); out.append(to_export(o, o.name))
    for o in mouth_parts(surf): out.append(to_export(o, o.name))
    return out, dense

# ---------------------------------------------------------------- the uniform (on the chest bone)
TORSO = A['TORSO']
def row_at(T, y):
    i = 0
    while i < len(T) - 2 and T[i + 1][0] < y: i += 1
    a, b = T[i], T[i + 1]; t = clamp((y - a[0]) / (b[0] - a[0]), 0, 1); return [lerp(a[k], b[k], t) for k in range(5)]
def se(c, p): return math.copysign(abs(c) ** (2 / p), c)
def shirt_dense():
    # the shirt round the body (TORSO's sections, a superellipse each), its top closed under the collar; folds: the
    # cloth gathered above the belt, pulled from the armpits, the placket down the front, the seams at the sides and
    # across the back (the yoke). Only in the dense shape: the game's mesh gets them as its normals
    N, ys = 72, [0.958 + (1.469 - 0.958) * (k / 70) ** 0.95 for k in range(71)]
    rings = []
    for y in ys:
        _, a, b, cz, pw = row_at(TORSO, y); ring = []
        for j in range(N):
            t = j / N * TAU; c, sn = math.cos(t), math.sin(t)
            x, z = se(c, pw) * a, cz + se(sn, pw) * b
            front = max(0, sn); side = abs(c)
            d = 0.0
            d += 0.0016 * smooth(1.07, 0.985, y) * (0.5 + 0.5 * math.cos(t * 11 + 1.3 * math.sin(t * 3))) * smooth(0.958, 0.975, y)          # gathered above the belt
            d += 0.0011 * math.exp(-((side - 0.93) / 0.06) ** 2) * front * math.exp(-((y - 1.28) / 0.05) ** 2) * (0.5 + 0.5 * math.cos((y - x * 0.8 * math.copysign(1, x)) * 260))  # from the armpits
            d -= 0.0006 * math.exp(-((side - 1.0) / 0.03) ** 2) * smooth(1.0, 1.05, y) * smooth(1.39, 1.33, y)                            # the side seams
            d -= 0.0007 * max(0, -sn) * math.exp(-((y - 1.37) / 0.0025) ** 2)                                                              # the yoke's seam
            if front > 0.3 and y < 1.445:
                u = abs(x)
                d += 0.0011 * smooth(0.019, 0.015, u) * smooth(0.99, 1.01, y) - 0.0004 * math.exp(-((u - 0.0165) / 0.0012) ** 2)        # the placket and its stitching
            n = Vector((c * b, 0, sn * a)).normalized() if abs(c) + abs(sn) > 0 else Vector((0, 0, 1))
            ring.append(tuple(Vector((x, y, z)) + n * d))
        rings.append(ring)
    return loft('shirtD', rings, cap1=Vector((0, 0.004, 0)))

def surf_point(surf, x, y, off):
    p, n = surf.front(x, y)
    return (p + n * off, n) if p else (Vector((x, y, row_at(TORSO, y)[3] + row_at(TORSO, y)[2] + off)), Vector((0, 0, 1)))

def front_slab(name, surf, x0, x1, y0, y1, t, nx=4, ny=3, edge=0.0018, shape=None):
    # a patch of cloth on the front following the shirt (a pocket, a flap), its edges turned down to the surface
    top, idx = [], {}
    for j in range(ny + 1):
        for i in range(nx + 1):
            x, y = lerp(x0, x1, i / nx), lerp(y0, y1, j / ny)
            if shape: x, y = shape(x, y, i / nx, j / ny)
            p, n = surf_point(surf, x, y, t); top.append((p, n))
    verts = [tuple(p) for p, n in top]; faces = [(j * (nx + 1) + i, j * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i + 1, (j + 1) * (nx + 1) + i) for j in range(ny) for i in range(nx)]
    loop = [i for i in range(nx)] + [j * (nx + 1) + nx for j in range(ny)] + [ny * (nx + 1) + i for i in range(nx, 0, -1)] + [j * (nx + 1) for j in range(ny, 0, -1)]
    base = len(verts)
    for k in loop: p, n = top[k]; verts.append(tuple(p - n * (t + 0.0004)))
    for k in range(len(loop)):
        a, b = loop[k], loop[(k + 1) % len(loop)]; faces.append((a, base + k, base + (k + 1) % len(loop), b))
    return mesh_obj(name, verts, faces)

def disc(name, surf, x, y, r, h, seg=8, off=0.0):
    # a little button or dome on the surface
    p, n = surf_point(surf, x, y, off)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r, radius2=r * 0.75, depth=h)
    q = Vector((0, 0, 1)).rotation_difference(n); bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=q.to_matrix())
    bmesh.ops.translate(bm, verts=bm.verts, vec=p + n * h / 2); return bm_obj(name, bm)

def collar(surf):
    # the band round the neck (lower at the front, tilted forwards 13° as actor.js had it) with its thickness, and the
    # two points lying on the chest
    nz = P['neck'][2]; obs = []
    def band_pt(t, y, r):
        a, b = 0.0605 * r, 0.0638 * r
        c, sn = math.cos(t), math.sin(t)
        v = Vector((c * a, y + 0.012 * max(0, -sn) - 0.004 * max(0, sn) ** 2, nz + sn * b))
        # (tilted forwards about the neck's front)
        v.y -= 1.47; v.z -= nz; v = Matrix.Rotation(13 * DEG, 3, 'X') @ v; v.y += 1.47; v.z += nz
        return tuple(v)
    N = 18; ts = [math.pi / 2 + 0.2 + (TAU - 0.4) * k / (N - 1) for k in range(N)]     # (open a little at the front)
    rows = [[band_pt(t, 1.452, 1.0) for t in ts], [band_pt(t, 1.452, 1.06) for t in ts], [band_pt(t, 1.494, 1.05) for t in ts], [band_pt(t, 1.496, 0.995) for t in ts], [band_pt(t, 1.455, 0.985) for t in ts]]
    verts = [v for r in rows for v in r]; faces = []
    for r in range(len(rows) - 1):
        for k in range(N - 1):
            a = r * N + k; faces.append((a, a + 1, a + N + 1, a + N))
    obs.append(orient_out(mesh_obj('band', verts, faces), Vector((0, 1.47, nz))))
    for s in (-1, 1):
        # a point: from the band's front down and out over the collarbone (a thin slab on the shirt)
        def shp(x, y, u, v, s=s):
            # a triangle-ish shape: wide at the top along the band, coming to a point low and out
            x0 = s * lerp(0.006, 0.05, u * (1 - v) + 0.0) ; y0 = lerp(1.452, 1.402 - 0.012 * u, v)
            return lerp(s * 0.006, s * (0.03 + 0.012 * u), v) * (1 - u * (1 - v)) + x0 * u * (1 - v), y0
        obs.append(front_slab(f'pt{s}', surf, 0, 1, 0, 1, 0.0042, nx=3, ny=3, shape=lambda x, y, u, v, s=s: (s * lerp(lerp(0.004, 0.044, u), lerp(0.024, 0.036, u), v), lerp(1.458 - 0.004 * u, lerp(1.41, 1.398, u), v))))
    return join(obs, 'collar')

def tie(surf):
    # the knot (wider at the top, under the collar's points) and the blade down the front to the belt, a crease along it
    k = []
    for j, (y, w, d) in enumerate([(1.452, 0.0175, 0.011), (1.44, 0.016, 0.012), (1.428, 0.012, 0.0105), (1.42, 0.0085, 0.008)]):
        p, n = surf_point(surf, 0, y, 0.0035)
        k.append([tuple(Vector((se(math.cos(t), 3) * w, y, p.z - d * 0.4 + se(math.sin(t), 3) * d * 0.6))) for t in [i / 8 * TAU for i in range(8)]])
    knot = loft('knot', k, cap0=Vector((0, 0.002, 0)), cap1=Vector((0, -0.002, 0)))
    rows, ys, ws = [], [1.428, 1.40, 1.34, 1.26, 1.18, 1.1, 1.06, 1.046, 1.036], [0.0105, 0.0175, 0.022, 0.027, 0.032, 0.036, 0.037, 0.026, 0.005]
    for y, w in zip(ys, ws):
        row = []
        for u in (-1, -0.5, 0, 0.5, 1):
            yy = y - (0.012 * (1 - abs(u)) if y < 1.05 else 0)
            p, n = surf_point(surf, u * w, yy, 0.0032 + 0.0012 * (1 - u * u)); row.append(tuple(p))
        rows.append(row)
    verts, faces = [v for r in rows for v in r], []
    for j in range(len(rows) - 1):
        for i in range(4): a = j * 5 + i; faces.append((a, a + 5, a + 6, a + 1))
    blade = mesh_obj('blade', verts, faces)
    apply_mod(blade, 'SOLIDIFY', thickness=0.0016, offset=-1)
    return join([knot, blade], 'tie')

def epaulette(s, surf_top):
    # the strap along the shoulder's top from the collar to the sleeve (navy), its inner end pointed with a gold button
    obs = []
    def top(x, z, off):
        hit, n = surf_top.along((x, 1.7, z), (0, -1, 0))
        return (hit + n * off) if hit else Vector((x, 1.42, z))
    xs = [0.068, 0.078, 0.1, 0.125, 0.15, 0.168]; rows = []
    for x in xs:
        w = 0.025 * (0.35 if x == xs[0] else 1.0)
        rows.append([tuple(top(s * x, -0.01 + u * w, off)) for u, off in ((-1, 0.0005), (-1, 0.0055), (1, 0.0055), (1, 0.0005))])
    st = loft('strap', [[r[i] for i in range(4)] for r in rows], cap0=Vector((0, 0, 0)), cap1=Vector((0, 0, 0)))
    bm = bmesh.new(); bm.from_mesh(st.data); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(st.data); bm.free(); obs.append(st)
    btn = top(s * 0.081, -0.01, 0.0058)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=3, radius=0.005)
    bmesh.ops.scale(bm, vec=(1, 0.45, 1), verts=bm.verts); bmesh.ops.translate(bm, verts=bm.verts, vec=btn); b = bm_obj('btn', bm)
    bars = []
    for k in range(4):
        x = 0.152 - k * 0.0095
        c = top(s * x, -0.01, 0.0062)
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(0.0046, 0.0016, 0.042), verts=bm.verts); bmesh.ops.translate(bm, verts=bm.verts, vec=c)
        bars.append(bm_obj(f'bar{k}', bm))
    return join(obs, f'strap{s}'), b, bars

def wing_badge(surf):
    # the SHOYO wings (fictional): a pair of swept feathered wings round a disc, gold, the disc's middle navy
    cx, cy = 0.077, 1.333
    p0, n0 = surf_point(surf, cx, cy, 0.0016)
    xa = Vector((0, 1, 0)).cross(n0).normalized(); ya = n0.cross(xa)
    def at(u, v, h=0.0): return tuple(p0 + xa * u + ya * v + n0 * h)
    obs = []
    for s in (-1, 1):
        # outline: from the disc out to the tip along the top, back along a feathered lower edge
        topl = [(0.006, 0.002), (0.016, 0.0042), (0.026, 0.0052), (0.036, 0.0046)]
        bot = [(0.033, 0.0012), (0.029, -0.0006), (0.024, 0.0004), (0.02, -0.0018), (0.015, -0.0006), (0.011, -0.0028), (0.006, -0.0022)]
        outline = topl + bot
        verts = [at(s * u, v, 0.0012) for u, v in outline] + [at(s * u, v, 0) for u, v in outline]
        n = len(outline); faces = [tuple(range(n)) if s > 0 else tuple(reversed(range(n)))]
        for k in range(n): a, b = k, (k + 1) % n; faces.append((a, n + a, n + b, b) if s < 0 else (b, n + b, n + a, a))
        ob = mesh_obj(f'wing{s}', verts, faces); triangulate(ob); obs.append(ob)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=12, radius1=0.0068, radius2=0.0062, depth=0.002)
    q = Vector((0, 0, 1)).rotation_difference(n0); bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=q.to_matrix()); bmesh.ops.translate(bm, verts=bm.verts, vec=p0 + n0 * 0.001)
    obs.append(bm_obj('ring', bm))
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=10, radius1=0.0042, radius2=0.0042, depth=0.0008)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=q.to_matrix()); bmesh.ops.translate(bm, verts=bm.verts, vec=p0 + n0 * 0.0024)
    centre = bm_obj('centre', bm)
    return join(obs, 'badge'), centre

def nametag(surf):
    # the name plate above the right pocket (the name itself: the game writes it, npc/actor.js); and its frame as an
    # anchor triangle (the plate's middle, +x along it, +y up it: 1 cm each)
    cx, cy = -0.077, 1.322
    p0, n0 = surf_point(surf, cx, cy, 0.0004)
    xa = Vector((0, 1, 0)).cross(n0).normalized(); ya = n0.cross(xa)
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(0.058, 0.0135, 0.0018), verts=bm.verts)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if abs(e.verts[0].co.z - e.verts[1].co.z) > 1e-6], offset=0.002, segments=1, affect='EDGES')
    M = Matrix((xa, ya, n0)).transposed()
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=M); bmesh.ops.translate(bm, verts=bm.verts, vec=p0 + n0 * 0.0009)
    plate = bm_obj('plate', bm)
    face = p0 + n0 * 0.0019
    anchor = mesh_obj('anchor', [tuple(face), tuple(face + xa * 0.01), tuple(face + ya * 0.01)], [(0, 1, 2)])
    return plate, anchor

def lanyard(surf):
    # the cord round the neck and down the front to the ID card (a photo, lines of text, the navy band with the wings)
    pts = []
    for x, y in [(0.0, 1.262), (0.011, 1.29), (0.022, 1.33), (0.033, 1.38), (0.043, 1.42), (0.05, 1.445)]:
        p, n = surf_point(surf, -x, y, 0.0045 + 0.0075 * math.exp(-((x / 0.03) ** 2))); pts.append(p)
    pts += [Vector(v) for v in [(-0.062, 1.47, 0.01), (-0.066, 1.482, -0.03), (-0.04, 1.492, -0.075), (0, 1.495, -0.084), (0.04, 1.492, -0.075), (0.066, 1.482, -0.03), (0.062, 1.47, 0.01)]]
    for x, y in reversed([(0.011, 1.29), (0.022, 1.33), (0.033, 1.38), (0.043, 1.42), (0.05, 1.445)]):
        p, n = surf_point(surf, x, y, 0.0045 + 0.0075 * math.exp(-((x / 0.03) ** 2))); pts.append(p)
    # a smooth closed curve through them (Catmull-Rom), a flat three-sided cord along it
    M = len(pts); curve = []
    for k in range(M):
        p0, p1, p2, p3 = pts[k - 1], pts[k], pts[(k + 1) % M], pts[(k + 2) % M]
        for t in (0,):
            t2, t3 = t * t, t * t * t
            curve.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3))
    rings, b1 = [], None
    for k, c in enumerate(curve):
        # (the cord's frame carried along it, so it does not twist: flat against the chest at the front)
        tg = (curve[(k + 1) % len(curve)] - curve[k - 1]).normalized()
        b1 = tg.cross(Vector((0, 0, 1))).normalized() if b1 is None else (b1 - tg * tg.dot(b1)).normalized()
        b2 = tg.cross(b1)
        rings.append([tuple(c + b1 * 0.0034 * math.cos(a) + b2 * 0.0012 * math.sin(a)) for a in (0, TAU / 3, 2 * TAU / 3)])
    rings.append(rings[0])
    cord = loft('cord', rings)
    pc, nc = surf_point(surf, 0, 1.2, 0.014)
    card = {}
    def slab(nm, w, h, d, x, y, z):
        bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(w, h, d), verts=bm.verts)
        bmesh.ops.translate(bm, verts=bm.verts, vec=Vector((x, 1.2 + y, pc.z + z))); return bm_obj(nm, bm)
    body = slab('card', 0.054, 0.085, 0.0024, 0, 0, 0)
    apply_mod(body, 'BEVEL', width=0.003, segments=2, limit_method='ANGLE', angle_limit=math.radians(60))
    card['card'] = [body]
    card['navy'] = [slab('band', 0.054, 0.016, 0.0006, 0, 0.0345, 0.0013)]
    card['photo'] = [slab('photo', 0.018, 0.022, 0.0006, -0.0135, 0.008, 0.0013)]
    card['ink'] = [slab(f'ink{k}', 0.023 if k == 0 else 0.019, 0.0026, 0.0006, 0.0105 - (0.002 if k else 0), 0.014 - k * 0.0065, 0.0013) for k in range(3)] + [slab('inkb', 0.04, 0.0024, 0.0006, 0, -0.024, 0.0013)]
    card['silver'] = [slab('clip', 0.012, 0.014, 0.004, 0, 0.047, -0.0008)]
    return cord, card

def build_torso():
    dense = shirt_dense(); surf = Surface(dense)
    out = []
    shirt = decimate(copy_obj(dense, 'shirt'), 580, use_symmetry=True, symmetry_axis='X'); transfer_normals(shirt, dense)
    col = collar(surf)
    pockets, flaps, btns = [], [], []
    for s in (-1, 1):
        x0, x1 = (0.032, 0.122) if s > 0 else (-0.122, -0.032)
        pockets.append(front_slab(f'pk{s}', surf, x0, x1, 1.17, 1.292, 0.0018, nx=4, ny=3))
        flaps.append(front_slab(f'fl{s}', surf, x0 - 0.002, x1 + 0.002, 1.266, 1.302, 0.0042, nx=4, ny=1,
            shape=lambda x, y, u, v, x0=x0, x1=x1: (x, y - 0.006 * (1 - v) * (1 - abs(2 * u - 1)) ** 0.6)))
        btns.append(disc(f'bt{s}', surf, s * 0.077, 1.272, 0.0042, 0.0028, seg=8, off=0.004))
    pen = []
    p, n = surf_point(surf, 0.108, 1.3, 0.0042)
    bm = bmesh.new(); bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.0042, radius2=0.0042, depth=0.04)
    bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 2, 3, 'X')); bmesh.ops.translate(bm, verts=bm.verts, vec=p); pen.append(bm_obj('pen', bm))
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1); bmesh.ops.scale(bm, vec=(0.0022, 0.022, 0.0016), verts=bm.verts); bmesh.ops.translate(bm, verts=bm.verts, vec=p + Vector((0, 0.005, 0.0045))); clip = bm_obj('penclip', bm)
    # the placket's buttons (shown without a tie)
    pbtn = [disc(f'pb{k}', surf, 0, y, 0.0042, 0.0022, seg=8, off=0.0012) for k, y in enumerate([1.425, 1.34, 1.255, 1.17, 1.085])]
    # the epaulettes sit on the shoulders: rays down onto the shirt
    straps, sbtn, bars = [], [], [[] for _ in range(4)]
    for s in (-1, 1):
        st, b, bs = epaulette(s, surf); straps.append(st); sbtn.append(b)
        for k in range(4): bars[k].append(bs[k])
    tie_ob = tie(surf)
    badge, centre = wing_badge(surf)
    plate, anchor = nametag(surf)
    cord, card = lanyard(surf)
    # shading: occlusion from everything on the shirt (and the neck's place, the arms' sleeves: a rough stand-in)
    neck = ellipsoid('neckOcc', (0, 1.5, P['neck'][2]), (0.055, 0.06, 0.057), 12, 8)
    arms = [ellipsoid(f'armOcc{s}', (s * 0.2, 1.3, -0.016), (0.052, 0.13, 0.05), 10, 8) for s in (-1, 1)]
    occ_all = occluder([dense, col, tie_ob, cord, card['card'][0], neck] + pockets + flaps + straps + arms)
    occ_notie = occluder([dense, col, neck] + pockets + flaps + straps + arms)
    shade(shirt, occ_all, reach=0.03, strength=0.45, floor=0.6)
    out.append(to_export(shirt, 'torso.base.shirt.shirt'))
    for o in [col] + flaps: shade(o, occ_all, reach=0.02, strength=0.45, floor=0.6)
    out.append(to_export(join([col] + flaps, 'cf'), 'torso.base.shirt.shirt.2'))
    for o in pockets: shade(o, occ_all, reach=0.02, strength=0.4, floor=0.65)
    out.append(to_export(join(pockets, 'pk'), 'torso.base.pocket.shirt'))
    out.append(to_export(join(btns, 'bt'), 'torso.base.button.plastic'))
    out.append(to_export(pen[0], 'torso.base.x1a1c22.plastic'))
    out.append(to_export(clip, 'torso.base.silver.silver'))
    out.append(to_export(join(pbtn, 'pb'), 'torso.notie.button.plastic'))
    shade(tie_ob, occ_all, reach=0.02, strength=0.7); out.append(to_export(tie_ob, 'torso.tie.tie.tie'))
    for o in straps: shade(o, occ_notie, reach=0.02, strength=0.5)
    out.append(to_export(join(straps, 'st'), 'torso.bars.navy.cloth'))
    out.append(to_export(join(sbtn, 'sb'), 'torso.bars.gold.gold'))
    for k in range(4): out.append(to_export(join(bars[k], f'b{k}'), f'torso.bar{k + 1}.gold.gold'))
    out.append(to_export(badge, 'torso.badge.gold.gold')); out.append(to_export(centre, 'torso.badge.navy.cloth'))
    out.append(to_export(plate, 'torso.nametag.navy.plastic')); out.append(to_export(anchor, 'anchor.nametag.x000000.plastic'))
    shade(cord, occ_all, reach=0.015, strength=0.5); out.append(to_export(cord, 'torso.lanyard.lanyard.cloth'))
    for key, obs in card.items():
        cls = 'silver' if key == 'silver' else 'plastic'
        out.append(to_export(join(obs, 'c' + key) if len(obs) > 1 else obs[0], f'torso.lanyard.{key}.{cls}'))
    return out

# ---------------------------------------------------------------- main
def export(path):
    for ob in bpy.context.scene.objects: ob.select_set(False)
    for ob in COL.objects: ob.select_set(True)
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', use_selection=True, export_yup=False, export_apply=True,
        export_materials='NONE', export_vertex_color='ACTIVE', export_active_vertex_color_when_no_material=True, export_texcoords=False, export_normals=True,
        export_morph=True, export_morph_normal=False, export_animations=False, export_skins=False, export_extras=False, export_tangents=False)

PREVIEW_COLORS = {'skin': 0xd8a688, 'lid': 0xcf9a7c, 'lash': 0x3a2a24, 'lip': 0xb7766a, 'mouth': 0x5e2a2a, 'hair': 0x2a221e, 'eye': 0xf0ece5, 'iris': 0x4b3326,
    'pupil': 0x0e0b0a, 'shirt': 0xf4f4f0, 'pocket': 0xe9eae5, 'button': 0xe6e3dc, 'navy': 0x16324f, 'tie': 0x1b3050, 'gold': 0xf2b632, 'silver': 0xc9cdd2,
    'card': 0xf7f7f3, 'photo': 0x9db1c6, 'ink': 0x56606b, 'lanyard': 0x1d4a82}
PREVIEW_CLASSES = {'skin': (0.56, 0), 'hair': (0.62, 0), 'brow': (0.8, 0), 'eye': (0.18, 0), 'iris': (0.1, 0), 'mouth': (0.75, 0), 'shirt': (0.8, 0), 'cloth': (0.7, 0),
    'tie': (0.5, 0), 'gold': (0.32, 0.85), 'silver': (0.26, 0.9), 'plastic': (0.32, 0)}

head, dense = build_head()
torso = build_torso()
for ob in COL.objects: print(f'{ob.name:40s} {tris(ob):6d}')
export(OUT)
if PREVIEW:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import preview
    # (the lids as they are open: turned up about their pivot, as actor.js does)
    lo = COL.objects['lids.base.lid.skin']; lo.matrix_world = Matrix.Translation((0, EY, EZ)) @ Matrix.Rotation(-21 * DEG, 4, 'X') @ Matrix.Translation((0, -EY, -EZ))
    def view(variant, fname, cam, tgt, lens=100):
        objs = [o for o in COL.objects if o.name.split('.')[1] in ('base', variant) or (variant == 'hair-bun' and o.name.split('.')[1] == 'glasses')]
        preview.render(objs, os.path.join(PREVIEW, fname), PREVIEW_COLORS, PREVIEW_CLASSES, cam, tgt, lens=lens)
    view('hair-short', 'h-front.png', (0.0, 1.62, 0.62), (0, 1.615, 0.03))
    view('hair-short', 'h-34.png', (0.38, 1.66, 0.44), (0, 1.615, 0.0))
    view('hair-short', 'h-side.png', (0.62, 1.62, 0.0), (0, 1.615, 0.0))
    view('hair-long', 'h-back.png', (-0.3, 1.66, -0.55), (0, 1.6, -0.02))
    view('hair-bun', 'h-bun.png', (-0.38, 1.64, 0.42), (0, 1.615, 0.0))
    view('hair-crop', 'h-crop.png', (0.25, 1.66, 0.55), (0, 1.615, 0.0))
    def tview(fname, cam, tgt, lens=50, variants=('hair-short', 'tie', 'bars', 'bar1', 'bar2', 'bar3', 'badge', 'nametag', 'lanyard')):
        objs = [o for o in COL.objects if o.name.split('.')[1] in ('base',) + tuple(variants) and not o.name.startswith('anchor')]
        preview.render(objs, os.path.join(PREVIEW, fname), PREVIEW_COLORS, PREVIEW_CLASSES, cam, tgt, lens=lens)
    tview('t-front.png', (0.0, 1.4, 0.95), (0, 1.33, 0.0))
    tview('t-34.png', (0.55, 1.5, 0.7), (0, 1.36, 0.0))
    tview('t-notie.png', (-0.4, 1.45, 0.8), (0, 1.33, 0.0), variants=('hair-bun', 'notie', 'glasses'))
