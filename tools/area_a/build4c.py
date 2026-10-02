# Area A, v2 part 3: street furniture, added to area_a.bin (ARA2) as each chunk's 'furn' (instances) and 'wire' (polylines).
# Run after build4b.py. Everything here is placed by rule from OpenStreetMap's ways and nodes and the road areas: an estimate,
# not a survey (PLATEAU's frn data covers only the Kannai block). The rules:
#  - utility poles every ~30 m on one side of tertiary / unclassified / residential roads, with three wires between them;
#    none in the areas whose wires are underground (Minato Mirai 21, the Kannai core, round Yokohama Station: by area, estimated)
#  - street lights on both sides of the larger roads, staggered every ~35 m; small lamps every ~25 m on the small roads in
#    the underground-wire areas
#  - at OSM's signalled crossings: a vehicle signal for each direction (beyond the crossing, its arm over the lanes) and a
#    pedestrian signal at each end; each junction's signals share one cycle, by axis
#  - OSM's stop signs and bus stops; a crossing sign at unsignalled crossings; speed signs every ~300 m on larger roads
#  - guard pipes (or hedges) along the larger roads' pavements, open at crossings and junctions; bollards at crossing ends
#  - manholes on the carriageway, drain grates along its edges
#  - nothing inside a carriageway, on a crossing, or within 1.2 m of another piece
# Heights: on a pavement, the road height + 0.15 (as the pavement surface); elsewhere the road height (roadheight.py: the
# same function the surfaces were made with)
import pickle, json, math, struct, numpy as np, time, collections, geo, sys
from PIL import Image, ImageDraw
T0 = time.time(); tick = lambda m: print(f'{time.time() - T0:7.1f}s {m}', flush=True)
H = pickle.load(open('hgt.pkl', 'rb')); E0, E1, N0, N1, G = H['G']; Df, U0 = H['Df'], H['U0']
GEOID = 36.28; CH = 400.0
def box3(a): p = np.pad(a, 1, mode='edge'); return sum(p[1 + i:p.shape[0] - 1 + i, 1 + j:p.shape[1] - 1 + j] for i in (-1, 0, 1) for j in (-1, 0, 1)) / 9
HS = box3(box3(Df))
def hgrid(e, n, arr):
    fi = np.clip((np.asarray(e, float) - E0) / G, 0, arr.shape[1] - 1.001); fj = np.clip((np.asarray(n, float) - N0) / G, 0, arr.shape[0] - 1.001)
    i = np.floor(fi).astype(int); j = np.floor(fj).astype(int); u = fi - i; v = fj - j
    return (arr[j, i] * (1 - u) + arr[j, i + 1] * u) * (1 - v) + (arr[j + 1, i] * (1 - u) + arr[j + 1, i + 1] * u) * v
def demh(e, n): return hgrid(e, n, U0) + hgrid(e, n, HS) + GEOID
S1 = pickle.load(open('b4_stage1.pkl', 'rb')); ground_ways = S1['ground_ways']
carriage, side = pickle.load(open('CS2.pkl', 'rb'))
from roadheight import RoadHeight
roadh = RoadHeight([w for w in ground_ways if w['L'] > 4], demh)
def geoms(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [x for h in getattr(g, 'geoms', []) for x in geoms(h)]
R = 0.5; W_ = int((E1 - E0) / R) + 1; H_ = int((N1 - N0) / R) + 1
def raster(g):
    im = Image.new('1', (W_, H_), 0); dr = ImageDraw.Draw(im); tp = lambda c: [((x - E0) / R, (N1 - y) / R) for x, y in c]
    for p in geoms(g):
        dr.polygon(tp(p.exterior.coords), fill=1)
        for h in p.interiors: dr.polygon(tp(h.coords), fill=0)
    return np.asarray(im, dtype=bool)
MC = raster(carriage); MS = raster(side); tick('rasters')
def at(M, e, n):
    i = np.round((np.asarray(e, float) - E0) / R).astype(int); j = np.round((N1 - np.asarray(n, float)) / R).astype(int)
    ok = (i >= 0) & (j >= 0) & (i < W_) & (j < H_); out = np.zeros(np.shape(i), bool); out[ok] = M[j[ok], i[ok]]; return out
def reach(M, e, n, dx, dy, maxd=30.0, step=0.25):
    alive = at(M, e, n); dist = np.zeros(len(e))
    for k in range(1, int(maxd / step) + 1):
        s = k * step; inn = at(M, e + dx * s, n + dy * s); newly = alive & ~inn; dist[newly] = s - step / 2; alive &= inn
        if not alive.any(): break
    dist[alive] = maxd; return dist
def smooth(a, k):
    if len(a) < 3: return a
    k = min(k, (len(a) - 1) // 2); return np.convolve(np.pad(a, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k] if k > 0 else a
def hsh(*a): return (math.sin(sum(x * m for x, m in zip(a, (12.9898, 78.233, 37.719, 4.581)))) * 43758.5453) % 1.0
# ---- areas with the wires underground (estimated, by area: ENU metres from the Kannai spot) ----
from shapely.geometry import Polygon, Point
from shapely.prepared import prep
NOWIRE = prep(Polygon([(-900, 450), (-300, 600), (60, 1100), (-200, 1750), (-1300, 2080), (-1460, 1850)]).union(          # Minato Mirai 21
    Polygon([(-720, 200), (-520, -520), (300, -640), (950, -220), (520, 560), (-320, 720)])).union(                       # the Kannai core
    Point(-1551, 1740).buffer(420)))                                                                                       # round Yokohama Station
# ---- the pieces ----
KIND = dict(pole=0, light=1, lamp=2, vsig=3, psig=4, stop=5, xsign=6, speed=7, bus=8, bollard=9, pipe=10, hedge=11, manhole=12, drain=13)
items = []   # (kind, e, n, z, yaw (facing / along, radians from east, counter-clockwise), param, group)
wires = []   # polylines (n x 3)
occ = collections.defaultdict(list)
def free(e, n, r=1.2):
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            for (x, y) in occ[(int(e // 4) + di, int(n // 4) + dj)]:
                if (x - e) ** 2 + (y - n) ** 2 < r * r: return False
    return True
def clear_of_road(e, n, r=0.45):
    a = np.linspace(0, 2 * np.pi, 9)[:-1]
    return not at(MC, np.r_[e, e + np.cos(a) * r], np.r_[n, n + np.sin(a) * r]).any()
crossings = []; Nd = json.load(open('osm_nodes.json'))['elements']
for nd in Nd:
    t = nd.get('tags', {})
    if nd['type'] == 'node' and (t.get('highway') == 'crossing' or 'crossing' in t): crossings.append(geo.enu(np.array([nd['lat']]), np.array([nd['lon']]), np.array([40.0]))[0, :2])
crossings = np.array(crossings); chash = collections.defaultdict(list)
for k, q in enumerate(crossings): chash[(int(q[0] // 20), int(q[1] // 20))].append(q)
def near_crossing(e, n, d):
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            for q in chash.get((int(e // 20) + di, int(n // 20) + dj), ()):
                if (q[0] - e) ** 2 + (q[1] - n) ** 2 < d * d: return True
    return False
def put(kind, e, n, yaw, param=0, group=0, r=1.2, onroad=False, z=None, clear=0.45):
    if not onroad and (not clear_of_road(e, n, clear) or not free(e, n, r)): return False
    if onroad and not free(e, n, 0.8): return False
    pav = bool(at(MS, e, n))
    if z is None: z = float(roadh(np.array([e]), np.array([n]))[0]) + (0.15 if pav and not onroad else 0.0)
    items.append((KIND[kind], e, n, z, yaw, param, group)); occ[(int(e // 4), int(n // 4))].append((e, n)); return True
cnt = collections.Counter()
# ---- signals: each junction's crossings share a cycle; axis 0 / 1 by the crossing road's direction ----
SIG = pickle.load(open('signals_seed.pkl', 'rb'))
groups = []                                                     # (centre, ref direction)
def group_of(q, T):
    for gi, (c, ref) in enumerate(groups):
        if np.hypot(*(c - q)) < 40: return gi, ref
    groups.append((q.copy(), T.copy())); return len(groups) - 1, T
def axis(v, ref): return 0 if abs(v @ ref) > math.cos(math.radians(45)) else 1
for q, T, dl, dr, oneway, wid_ in SIG:
    gi, ref = group_of(q, T); Lv = np.array([-T[1], T[0]]); ax = axis(T, ref)
    # vehicle signals: for traffic along +T (on the left half: left-hand driving) beyond the crossing, the arm over its lanes
    for d, half, sgn in ((T, dl, 1), (-T, dr, -1)):
        if oneway and sgn < 0: continue
        arm = min(max(half * 0.6, 2.0), 7.0)
        for along, off in ((3.2, 0.6), (3.2, 1.2), (5.5, 0.6), (0.0, 0.8), (-3.4, 0.6), (8.0, 0.8)):   # (beyond the crossing if it can stand there)
            c = q + d * along + Lv * sgn * (half + off)
            if put('vsig', c[0], c[1], math.atan2(-d[1], -d[0]), param=int(arm * 10), group=gi * 2 + ax, r=1.0): cnt['vsig'] += 1; break
    # pedestrian signals at both ends, facing across; green when traffic along the crossing (the other axis) has green
    for sgn, half in ((1, dl), (-1, dr)):
        for along, off in ((-1.6, 0.7), (1.6, 0.7), (-1.6, 1.3), (1.6, 1.3)):
            c = q + Lv * sgn * (half + off) + T * along
            if put('psig', c[0], c[1], math.atan2(-Lv[1] * sgn, -Lv[0] * sgn), group=gi * 2 + (1 - ax), r=0.8): cnt['psig'] += 1; break
        for b in (-1, 1):
            c2 = q + Lv * sgn * (half + 0.4) + T * b * 2.3
            if put('bollard', c2[0], c2[1], 0.0, r=0.6): cnt['bollard'] += 1
tick(f'signals: {len(groups)} junctions {dict(cnt)}')
# ---- along each ground road ----
DRIVE = {'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link', 'living_street'}
MAJOR = {'trunk', 'primary', 'secondary', 'trunk_link', 'primary_link', 'secondary_link'}
POLES = {'tertiary', 'unclassified', 'residential', 'living_street', 'tertiary_link'}
nodeuse = collections.Counter(); npos = {}
for w in ground_ways:
    if w['hw'] in DRIVE:
        for nid, pt in zip(w['nodes'], w['p']): nodeuse[nid] += 1; npos[nid] = pt
junction = {nid for nid, c in nodeuse.items() if c >= 2}
for w in ground_ways:
    if w['hw'] not in DRIVE: continue
    p = w['p']; seg = np.hypot(*np.diff(p, axis=0).T); L = np.concatenate([[0], np.cumsum(seg)])
    if L[-1] < 10: continue
    s = np.arange(0, L[-1], 1.0); x = np.interp(s, L, p[:, 0]); y = np.interp(s, L, p[:, 1])
    tx = np.gradient(x); ty = np.gradient(y); tl = np.hypot(tx, ty) + 1e-9; tx /= tl; ty /= tl; lx, ly = -ty, tx
    ins = at(MC, x, y)
    if ins.mean() < 0.5: continue
    dl = smooth(reach(MC, x, y, lx, ly), 4); dr = smooth(reach(MC, x, y, -lx, -ly), 4)
    jd = np.full(len(s), 1e9)
    for nid in w['nodes']:
        if nid in junction: q = npos[nid]; jd = np.minimum(jd, np.hypot(x - q[0], y - q[1]))
    major = w['hw'] in MAJOR; wid = np.median((dl + dr)[ins]); seed = hsh(w['id'] % 100003, 7)
    def edge_pt(i, sg, off):
        d = dl[i] if sg > 0 else dr[i]; ox, oy = lx[i] * sg, ly[i] * sg
        return x[i] + ox * (d + off), y[i] + oy * (d + off), math.atan2(-oy, -ox)     # (facing the road)
    def pav_width(e, n, sg, i):
        ox, oy = lx[i] * sg, ly[i] * sg; return reach(MS, np.array([e]), np.array([n]), ox, oy, 12.0, 0.25)[0] if at(MS, e, n) else 0.0
    ok_at = lambda i: ins[i] and dl[i] + dr[i] < wid * 1.4 + 1.5
    # utility poles and their wires (one side of the road; the side by the way's id)
    if w['hw'] in POLES:
        sg = 1 if seed < 0.5 else -1; chain = []; last = -1e9
        for i in range(int(8 + seed * 20), len(s), 2):
            if s[i] - last < 28 + 8 * hsh(w['id'] % 9973, i) or not ok_at(i): continue
            e, n, yaw = edge_pt(i, sg, 0.45)
            if NOWIRE.contains(Point(e, n)) or near_crossing(e, n, 3.0):
                if chain: wires.append(chain); chain = []
                continue
            if put('pole', e, n, yaw, param=1 if hsh(e, n) < 0.18 else 0, r=8.0):
                z = items[-1][3]
                if chain and math.hypot(e - chain[-1][0], n - chain[-1][1]) > 48: wires.append(chain); chain = []
                chain.append((e, n, z, yaw)); last = s[i]; cnt['pole'] += 1
        if len(chain) > 1: wires.append(chain)
    # street lights: the larger roads, both sides, staggered; small lamps on small roads without poles
    if major or (w['hw'] == 'tertiary' and wid > 8):
        for sg, ph in ((1, 0.0), (-1, 17.5)):
            for s0 in np.arange(10 + ph + seed * 10, L[-1] - 5, 35.0):
                i = int(s0)
                if not ok_at(i) or jd[i] < 6: continue
                e, n, yaw = edge_pt(i, sg, 0.6)
                if near_crossing(e, n, 4): continue
                if put('light', e, n, yaw, param=int(min(30, max(12, (dl[i] if sg > 0 else dr[i]) * 0.45 * 10))), r=6): cnt['light'] += 1
    elif w['hw'] in POLES and wid > 4:
        for s0 in np.arange(8 + seed * 12, L[-1] - 5, 25.0):
            i = int(s0); e, n, yaw = edge_pt(i, 1 if seed < 0.5 else -1, 0.45)
            if ok_at(i) and NOWIRE.contains(Point(e, n)) and not near_crossing(e, n, 3) and put('lamp', e, n, yaw, r=6): cnt['lamp'] += 1
    # guard pipes or hedges along the larger roads' pavements (2 m pieces), open at crossings and junctions
    if major or (w['hw'] == 'tertiary' and wid > 9):
        for sg in (1, -1):
            run = None
            for i in range(0, len(s) - 2, 2):
                e, n, _ = edge_pt(i, sg, 0.5)
                good = ok_at(i) and jd[i] > max(10, wid * 0.6 + 4) and not near_crossing(e, n, 5) and at(MS, e, n)
                if good and pav_width(e, n, sg, i) < 2.0: good = False
                if not good: continue
                blk = int(s[i] // 60); hedge = hsh(w['id'] % 7919, blk, sg) < 0.3
                if hsh(w['id'] % 7907, blk, sg + 3) < 0.25: continue                    # (some blocks have neither)
                yaw = math.atan2(ty[i], tx[i])
                if put('hedge' if hedge else 'pipe', e if not hedge else e + lx[i] * sg * 0.3, n if not hedge else n + ly[i] * sg * 0.3, yaw, r=0.9, clear=0.3): cnt['hedge' if hedge else 'pipe'] += 1
    # speed signs on larger roads, every ~300 m, each direction (on the left of the traffic: left-hand driving)
    if major:
        for s0 in np.arange(80 + seed * 150, L[-1] - 20, 300.0):
            i = int(s0)
            if ok_at(i) and jd[i] > 20:
                e, n, yaw = edge_pt(i, 1, 0.7)
                if put('speed', e, n, math.atan2(-ty[i], -tx[i]), param=50 if w['hw'] in ('trunk', 'primary') else 40): cnt['speed'] += 1
                if not w['oneway']:
                    e, n, _ = edge_pt(min(i + 6, len(s) - 1), -1, 0.7)
                    if put('speed', e, n, math.atan2(ty[i], tx[i]), param=50 if w['hw'] in ('trunk', 'primary') else 40): cnt['speed'] += 1
    # manholes along the middle, drains along the edges
    for s0 in np.arange(15 + seed * 20, L[-1] - 5, 45.0 + 20 * seed):
        i = int(s0)
        if not ok_at(i) or jd[i] < 8: continue
        o = (hsh(w['id'] % 997, i) - 0.5) * min(dl[i] + dr[i] - 2, 4); e = x[i] + lx[i] * ((dl[i] - dr[i]) / 2 + o); n = y[i] + ly[i] * ((dl[i] - dr[i]) / 2 + o)
        if at(MC, e, n) and not near_crossing(e, n, 4) and put('manhole', e, n, hsh(e, n) * 6.28, onroad=True): cnt['manhole'] += 1
    if wid > 5:
        for sg in (1, -1):
            for s0 in np.arange(6 + seed * 10, L[-1] - 3, 15.0):
                i = int(s0)
                if not ok_at(i) or jd[i] < 6: continue
                e, n, _ = edge_pt(i, sg, -0.3)
                if at(MC, e, n) and not near_crossing(e, n, 3) and put('drain', e, n, math.atan2(ty[i], tx[i]), onroad=True): cnt['drain'] += 1
tick(f'along the roads {dict(cnt)}')
# ---- OSM's stop signs and bus stops; crossing signs at unsignalled crossings ----
def nearest_edge(e, n, maxd=14.0):
    """the nearest carriageway edge to (e, n), the point just off it, and the road's outward direction there"""
    best = None
    for a in np.linspace(0, 2 * np.pi, 24, endpoint=False):
        d = reach(MC, np.array([e]), np.array([n]), math.cos(a), math.sin(a), maxd, 0.25)[0]
        if d < maxd and (best is None or d < best[0]): best = (d, a)
    return best
sigpos = [q for q, *_ in SIG]
for nd in Nd:
    t = nd.get('tags', {}); hw = t.get('highway')
    if nd['type'] != 'node' or hw not in ('stop', 'bus_stop', 'crossing'): continue
    q = geo.enu(np.array([nd['lat']]), np.array([nd['lon']]), np.array([40.0]))[0, :2]
    if not (E0 < q[0] < E1 and N0 < q[1] < N1): continue
    if hw == 'crossing':
        if t.get('crossing') in ('traffic_signals', 'unmarked', 'no') or any(np.hypot(*(p - q)) < 30 for p in sigpos): continue
    if at(MC, *q):
        b = nearest_edge(*q)
        if b is None: continue
        d, a = b; e = q[0] + math.cos(a) * (d + 0.5); n = q[1] + math.sin(a) * (d + 0.5); yaw = a + math.pi
    else:
        b = nearest_edge(*q)
        if b is None or b[0] > 10: continue
        e, n = q; yaw = b[1]
    if hw == 'stop': ok = put('stop', e, n, yaw)
    elif hw == 'crossing': ok = put('xsign', e, n, yaw, r=3)
    else:
        pw = reach(MS, np.array([e]), np.array([n]), -math.cos(yaw), -math.sin(yaw), 10, 0.25)[0] if at(MS, e, n) else 0
        ok = put('bus', e, n, yaw, param=1 if pw > 3.2 else 0, r=2.5)
    cnt[hw] += ok
tick(f'nodes {dict(cnt)}')
# ---- wires: three, sagging between poles (the top two at the crossarm's ends, the lowest a telephone cable) ----
WIRE = []
for chain in wires:
    for (e0, n0, z0, y0), (e1, n1, z1, y1) in zip(chain[:-1], chain[1:]):
        span = math.hypot(e1 - e0, n1 - n0); dx, dy = (e1 - e0) / span, (n1 - n0) / span; lx, ly = -dy, dx
        for off, hgt, sag in ((0.55, 10.6, 0.012), (-0.55, 10.6, 0.012), (0.25, 7.2, 0.02)):
            t = np.linspace(0, 1, 9); ex = e0 + (e1 - e0) * t + lx * off; ny = n0 + (n1 - n0) * t + ly * off
            z = z0 + (z1 - z0) * t + hgt - 4 * sag * span * t * (1 - t)
            WIRE.append(np.column_stack([ex, ny, z]))
tick(f'items {len(items)}, wire spans {len(WIRE) // 3}')
# ---- add to the file ----
path = sys.argv[1] if len(sys.argv) > 1 else 'area_a.bin'
b = open(path, 'rb').read(); assert b[:4] == b'ARA2'
hl = struct.unpack('<I', b[4:8])[0]; head = json.loads(b[8:8 + hl]); body = bytearray(b[8 + hl:])
assert 'furnKinds' not in head, 'furniture already added: run build4b.py first'
def addbuf(a):
    d = np.ascontiguousarray(a).tobytes(); o = len(body); body.extend(d + b'\0' * ((-len(d)) % 4)); return [o, len(d)]
byk = {(c['i'], c['j']): c for c in head['chunks']}
def ck(e, n): return (int(math.floor((e - E0) / CH)), int(math.floor((n - N0) / CH)))
per = collections.defaultdict(list); perw = collections.defaultdict(list)
for it in items: per[ck(it[1], it[2])].append(it)
for wl in WIRE: perw[ck(*wl[4, :2])].append(wl)
lost = 0
for k in set(per) | set(perw):
    if k not in byk: lost += len(per.get(k, ())); continue
    c = byk[k]; o = np.array(c['o'])
    for key in ('furn', 'wire'): c.pop(key, None)
    if per.get(k):
        A = np.array(per[k], float)
        c['furn'] = {'p': addbuf(np.round((A[:, 1:4] - o) * 100).astype(np.int16)), 'k': addbuf(A[:, 0].astype(np.uint8)),
                     'a': addbuf(np.round(np.mod(A[:, 4] + np.pi, 2 * np.pi) * 10000 - 31416).astype(np.int16)),
                     'm': addbuf(A[:, 5].astype(np.uint8)), 'g': addbuf(A[:, 6].astype(np.uint16))}
    if perw.get(k):
        P = np.concatenate(perw[k]); c['wire'] = {'p': addbuf(np.round((P - o) * 100).astype(np.int16)), 'n': addbuf(np.array([len(w) for w in perw[k]], np.uint32))}
head['stats']['furniture'] = {kk: int(v) for kk, v in collections.Counter(next(n for n, i in KIND.items() if i == it[0]) for it in items).items()}
head['stats']['furniture']['wireSpans'] = len(WIRE) // 3; head['stats']['furniture']['junctions'] = len(groups); head['furnKinds'] = KIND
hj = json.dumps(head).encode(); hj += b' ' * ((-len(hj)) % 4)
with open(path, 'wb') as f: f.write(b'ARA2'); f.write(struct.pack('<I', len(hj))); f.write(hj); f.write(body)
tick(f'written {path}: {head["stats"]["furniture"]} (outside the chunks: {lost})')
