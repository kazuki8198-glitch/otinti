# Area A, v2 part 2: decks (bridges, viaducts, the expressway, tunnels) with parapets, girders, piers, tunnel walls;
# paint for ground roads (widths smoothed: no wobble) and for decks; crossings and stop lines; trees; the ground; pack
import pickle, json, math, struct, numpy as np, time, os, collections, geo
from shapely.geometry import Point
from shapely.prepared import prep
from PIL import Image, ImageDraw
T0 = time.time(); tick = lambda m: print(f'{time.time() - T0:7.1f}s {m}', flush=True)
H = pickle.load(open('hgt.pkl', 'rb')); E0, E1, N0, N1, G = H['G']; Df, U0, water = H['Df'], H['U0'], H['water']
GEOID = 36.28; CH = 400.0
def box3(a): p = np.pad(a, 1, mode='edge'); return sum(p[1 + i:p.shape[0] - 1 + i, 1 + j:p.shape[1] - 1 + j] for i in (-1, 0, 1) for j in (-1, 0, 1)) / 9
HS = box3(box3(Df))
def hgrid(e, n, arr):
    fi = np.clip((np.asarray(e, float) - E0) / G, 0, arr.shape[1] - 1.001); fj = np.clip((np.asarray(n, float) - N0) / G, 0, arr.shape[0] - 1.001)
    i = np.floor(fi).astype(int); j = np.floor(fj).astype(int); u = fi - i; v = fj - j
    return (arr[j, i] * (1 - u) + arr[j, i + 1] * u) * (1 - v) + (arr[j + 1, i] * (1 - u) + arr[j + 1, i + 1] * u) * v
def demh(e, n): return hgrid(e, n, U0) + hgrid(e, n, HS) + GEOID
S1 = pickle.load(open('b4_stage1.pkl', 'rb')); chunks = collections.defaultdict(lambda: collections.defaultdict(list)); chunks.update({k: collections.defaultdict(list, v) for k, v in S1['chunks'].items()})
WL, deck_ways, ground_ways = S1['WL'], S1['deck_ways'], S1['ground_ways']
carriage, side = pickle.load(open('CS2.pkl', 'rb'))
from roadheight import RoadHeight
roadh = RoadHeight([w for w in ground_ways if w['L'] > 4], demh)
def ck(e, n): return (int(math.floor((e - E0) / CH)), int(math.floor((n - N0) / CH)))
def C(k): return chunks[k]
def geoms(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [x for h in getattr(g, 'geoms', []) for x in geoms(h)]
# ---- the carriageway raster (0.5 m), for measuring across ground roads ----
R = 0.5; W_ = int((E1 - E0) / R) + 1; H_ = int((N1 - N0) / R) + 1
im = Image.new('1', (W_, H_), 0); dr = ImageDraw.Draw(im); tp = lambda c: [((x - E0) / R, (N1 - y) / R) for x, y in c]
for p in geoms(carriage):
    dr.polygon(tp(p.exterior.coords), fill=1)
    for h in p.interiors: dr.polygon(tp(h.coords), fill=0)
M = np.asarray(im, dtype=bool); tick('raster')
def inside(e, n):
    i = np.round((np.asarray(e) - E0) / R).astype(int); j = np.round((N1 - np.asarray(n)) / R).astype(int)
    ok = (i >= 0) & (j >= 0) & (i < W_) & (j < H_); out = np.zeros(np.shape(i), bool); out[ok] = M[j[ok], i[ok]]; return out
def reach(e, n, dx, dy, maxd=30.0, step=0.25):
    alive = inside(e, n); dist = np.zeros(len(e))
    for k in range(1, int(maxd / step) + 1):
        s = k * step; inn = inside(e + dx * s, n + dy * s); newly = alive & ~inn; dist[newly] = s - step / 2; alive &= inn
        if not alive.any(): break
    dist[alive] = maxd; return dist
def smooth(a, k):
    if len(a) < 3: return a
    k = min(k, (len(a) - 1) // 2); return np.convolve(np.pad(a, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k] if k > 0 else a
def runmed(a, k):
    if len(a) < 3: return a
    p = np.pad(a, k, mode='edge'); return np.array([np.median(p[i:i + 2 * k + 1]) for i in range(len(a))])
# ---- geometry helpers: triangles wound to face a given way ----
def tri_out(L, a, b, c, want):
    a, b, c = np.asarray(a, float), np.asarray(b, float), np.asarray(c, float)
    nrm = np.cross(b - a, c - a)
    L.append((a, c, b) if np.dot(nrm, want) < 0 else (a, b, c))
def quad_out(L, a, b, c, d, want): tri_out(L, a, b, c, want); tri_out(L, a, c, d, want)
# all deck samples, hashed: is there another deck alongside (a merge, a diverge, the other carriageway)?
for w in deck_ways:
    t = np.gradient(w['xy'], axis=0); t /= np.linalg.norm(t, axis=1)[:, None] + 1e-9; w['t'] = t; w['l'] = np.column_stack([-t[:, 1], t[:, 0]])
hashd = collections.defaultdict(list)
for wi, w in enumerate(deck_ways):
    for j, (x, y) in enumerate(w['xy']): hashd[(int(x // 16), int(y // 16))].append((wi, j))
def alongside(wi, P, h):
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            for wj, j in hashd.get((int(P[0] // 16) + di, int(P[1] // 16) + dj), ()):
                if wj == wi: continue
                w2 = deck_ways[wj]; d = P - w2['xy'][j]
                if abs(d @ w2['t'][j]) <= 1.3 and abs(d @ w2['l'][j]) < w2['W'] / 2 + 0.3 and abs(h - w2['h'][j]) < 1.8: return True
    return False
pcarr = prep(carriage)
est_samples = 0; deck_samples = 0
for wi, w in enumerate(deck_ways):
    xy, h, t, l = w['xy'], w['h'], w['t'], w['l']; n = len(xy); half = w['W'] / 2
    if n < 2: continue
    mot = w['hw'] in ('motorway', 'motorway_link'); tun = w['kind'] == 'tunnel'; brg = w['kind'] == 'bridge'
    g = roadh(xy[:, 0], xy[:, 1]); deck_samples += n; est_samples += int(np.sum(w['est']))
    side_w = 0.0 if mot else 2.0                                         # (ordinary bridges keep their pavements)
    P3 = lambda i, off, dh, a=0.0: np.array([xy[i, 0] + l[i, 0] * off + t[i, 0] * a, xy[i, 1] + l[i, 1] * off + t[i, 1] * a, h[i] + dh])
    U_ = np.array([0, 0, 1.0])
    for i in range(n - 1):
        k = ck(*((xy[i] + xy[i + 1]) / 2)); ch = C(k)
        surf = []; conc = []; sidep = []
        a0 = -0.6 if i == 0 else 0.0; a1 = 0.6 if i + 1 == n - 1 else 0.0       # (the ends overlap the next way's: no seam to fall through)
        quad_out(surf, P3(i, half, 0, a0), P3(i, -half, 0, a0), P3(i + 1, -half, 0, a1), P3(i + 1, half, 0, a1), U_)
        for sgn in (1, -1):
            o0 = sgn * half; o1 = sgn * (half + side_w); o2 = sgn * (half + side_w + 0.25)
            if side_w:
                quad_out(sidep, P3(i, o0, 0.15, a0), P3(i, o1, 0.15, a0), P3(i + 1, o1, 0.15, a1), P3(i + 1, o0, 0.15, a1), U_)
                quad_out(conc, P3(i, o0, 0), P3(i, o0, 0.15), P3(i + 1, o0, 0.15), P3(i + 1, o0, 0), np.array([*(-sgn * l[i]), 0]))
            mid = (xy[i] + xy[i + 1]) / 2 + l[i] * sgn * (half + side_w + 0.8)
            wall = not alongside(wi, mid, (h[i] + h[i + 1]) / 2)
            ht = 5.5 if tun else 1.1 if mot else 1.0
            if tun:                                                       # (in a tunnel: up to the roof, or to the ground in an open cut)
                gi = g[i]; ht = min(5.5, max(1.1, gi - h[i] + 0.3))
            if wall:
                base = 0.15 if side_w else 0.0
                quad_out(conc, P3(i, o1, base), P3(i, o1, ht), P3(i + 1, o1, ht), P3(i + 1, o1, base), np.array([*(-sgn * l[i]), 0]))
                quad_out(conc, P3(i, o1, ht), P3(i, o2, ht), P3(i + 1, o2, ht), P3(i + 1, o1, ht), U_)
                quad_out(conc, P3(i, o2, ht), P3(i, o2, -1.8 if mot and brg else -1.0 if brg else 0), P3(i + 1, o2, -1.8 if mot and brg else -1.0 if brg else 0), P3(i + 1, o2, ht), np.array([*(sgn * l[i]), 0]))
        if brg:                                                           # (the deck's underside)
            D = 1.8 if mot else 1.0; o = half + side_w + 0.25
            if h[i] - D - g[i] > 0.4: quad_out(conc, P3(i, o, -D), P3(i, -o, -D), P3(i + 1, -o, -D), P3(i + 1, o, -D), -U_)
        if tun and g[i] - h[i] > 5.8:                                     # (the roof, where it is under the ground)
            o = half + 0.25; quad_out(conc, P3(i, o, 5.5), P3(i, -o, 5.5), P3(i + 1, -o, 5.5), P3(i + 1, o, 5.5), -U_)
        ch['deck'].append(np.array(surf)); 
        if sidep: ch['dside'].append(np.array(sidep))
        if conc: ch['conc'].append(np.array(conc))
    # piers under the expressway's viaducts, every 30 m, where there is room and no road below
    if mot and brg:
        for s0 in np.arange(15, w['s'][-1], 30.0):
            i = int(np.searchsorted(w['s'], s0)); i = min(i, n - 1)
            top = h[i] - 1.8; bot = g[i] - 0.5
            if top - g[i] < 2.5 or pcarr.contains(Point(*xy[i])): continue
            c = np.array([xy[i, 0], xy[i, 1]]); a = 1.1; conc = []
            for dx, dy in ((t[i], l[i]), (l[i], -t[i]), (-t[i], -l[i]), (-l[i], t[i])):
                p0 = c + dx * a + dy * a; p1 = c + dx * a - dy * a
                quad_out(conc, [*p0, bot], [*p1, bot], [*p1, top], [*p0, top], np.array([*dx, 0]))
            C(ck(*c))['conc'].append(np.array(conc))
    # paint on the deck: lane lines dashed, edge lines solid, a two-way bridge's middle line solid
    lanes = w['lanes'] or (2 if w['hw'] == 'motorway' else 1 if (mot or w['oneway']) else 2)
    sl = 1.25 if mot else 0.5; sr = 0.75 if mot else 0.5
    left = half - sl; right = -(half - sr); lw = (left - right) / lanes
    offs = [(left, False), (right, False)] + [(left - k * lw, True) for k in range(1, lanes)]
    if not w['oneway'] and not mot: offs = [(left, False), (right, False), ((left + right) / 2, False)] + [(left - k * lw, True) for k in range(1, lanes) if k != lanes // 2]
    for off, dash in offs:
        pts = np.column_stack([xy[:, 0] + l[:, 0] * off, xy[:, 1] + l[:, 1] * off, h + 0.02])
        C(ck(*xy[n // 2]))['paint'].append((pts, dash))
tick(f'decks {len(deck_ways)} (samples {deck_samples}, estimated heights {est_samples})')
# ---- the ground roads' own surface, as a 1 m height raster made from their triangles (the paint is laid on it, so it
# neither floats nor sinks where the triangles cut across the DEM) ----
RS = 1.0; HX = int((E1 - E0) / RS) + 2; HY = int((N1 - N0) / RS) + 2; HR = np.full((HY, HX), np.nan, np.float32)
for k, c in S1['chunks'].items():
    for P, tri in c.get('carr', []):
        T = P[tri.reshape(-1, 3)]
        for a_, b_, c_ in T:
            x0 = int(np.floor((min(a_[0], b_[0], c_[0]) - E0) / RS)); x1 = int(np.ceil((max(a_[0], b_[0], c_[0]) - E0) / RS))
            y0 = int(np.floor((min(a_[1], b_[1], c_[1]) - N0) / RS)); y1 = int(np.ceil((max(a_[1], b_[1], c_[1]) - N0) / RS))
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1)); px = E0 + gx * RS; py = N0 + gy * RS
            v0 = b_[:2] - a_[:2]; v1 = c_[:2] - a_[:2]; d = v0[0] * v1[1] - v0[1] * v1[0]
            if abs(d) < 1e-9: continue
            u = ((px - a_[0]) * v1[1] - (py - a_[1]) * v1[0]) / d; v = (v0[0] * (py - a_[1]) - v0[1] * (px - a_[0])) / d
            m = (u >= -0.02) & (v >= -0.02) & (u + v <= 1.02) & (gx >= 0) & (gy >= 0) & (gx < HX) & (gy < HY)
            if m.any(): HR[gy[m], gx[m]] = (a_[2] + u * (b_[2] - a_[2]) + v * (c_[2] - a_[2]))[m]
tick('road height raster')
def surfh(e, n):
    """the ground roads' surface under (e, n): bilinear in the raster; the DEM's road height where it has no road"""
    e = np.asarray(e, float); n = np.asarray(n, float); fx = (e - E0) / RS; fy = (n - N0) / RS
    i = np.clip(np.floor(fx).astype(int), 0, HX - 2); j = np.clip(np.floor(fy).astype(int), 0, HY - 2); u = fx - i; v = fy - j
    q = np.stack([HR[j, i], HR[j, i + 1], HR[j + 1, i], HR[j + 1, i + 1]]); w = np.stack([(1 - u) * (1 - v), u * (1 - v), (1 - u) * v, u * v])
    ok = ~np.isnan(q); ws = (w * ok).sum(0); val = (np.nan_to_num(q) * w).sum(0) / np.maximum(ws, 1e-9)
    return np.where(ws > 0.05, val, roadh(e, n))
# ---- paint on ground roads: centrelines measured against the carriageway, widths smoothed (a running median, then a
# mean, over ~20 m): straight where the road is straight ----
DRIVE = {'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
MAJOR = {'trunk', 'primary', 'secondary', 'tertiary', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
nodeuse = collections.Counter(); npos = {}
for w in ground_ways:
    if w['hw'] not in DRIVE: continue
    p = w['p']
    for nid, pt in zip(w['nodes'], p): nodeuse[nid] += 1; npos[nid] = pt
junction = {nid for nid, c in nodeuse.items() if c >= 2}
def runs(mask):
    i = 0; n = len(mask)
    while i < n:
        if not mask[i]: i += 1; continue
        j = i
        while j < n and mask[j]: j += 1
        if j - i >= 3: yield i, j
        i = j
nl = 0
for w in ground_ways:
    if w['hw'] not in DRIVE: continue
    p = w['p']; seg = np.hypot(*np.diff(p, axis=0).T); L = np.concatenate([[0], np.cumsum(seg)])
    if L[-1] < 8: continue
    s = np.arange(0, L[-1], 1.0); x = np.interp(s, L, p[:, 0]); y = np.interp(s, L, p[:, 1])
    tx = np.gradient(x); ty = np.gradient(y); tl = np.hypot(tx, ty) + 1e-9; tx /= tl; ty /= tl; lx, ly = -ty, tx
    dl = reach(x, y, lx, ly); dr_ = reach(x, y, -lx, -ly); ins = inside(x, y); wt = dl + dr_
    med = np.median(wt[ins]) if ins.any() else 0
    if med < 5.5: continue
    jd = np.full(len(s), 1e9)
    for nid in w['nodes']:
        if nid in junction: q = npos[nid]; jd = np.minimum(jd, np.hypot(x - q[0], y - q[1]))
    ok = ins & (wt < med * 1.35 + 1.5) & (jd > 0.5 * med + 4) & (dl > 0.3) & (dr_ > 0.3)
    # the road's edges, smoothed where they are measured; the middle and the width from them
    dls = dl.copy(); drs = dr_.copy()
    if ok.sum() > 5:
        dls[ok] = smooth(runmed(dl[ok], 10), 6); drs[ok] = smooth(runmed(dr_[ok], 10), 6)
    wts = dls + drs
    lanes = w['lanes'] if w['lanes'] > 0 else max(1 if w['oneway'] else 2, int(round(med / 3.3)))
    nf = lanes if w['oneway'] else int(w['tags'].get('lanes:forward', lanes // 2 if lanes > 1 else 1)); nb = 0 if w['oneway'] else max(1, lanes - nf)
    lw = wts / max(lanes, 1)
    offs = [(k, 'dash') for k in range(1, lanes)] if w['oneway'] else [(k, 'dash') for k in range(1, nf)] + [(nf, 'centre')] + [(nf + k, 'dash') for k in range(1, nb)]
    for i, j in runs(ok):
        for k, kind in offs:
            o = dls[i:j] - k * lw[i:j]; xs = x[i:j] + lx[i:j] * o; ys = y[i:j] + ly[i:j] * o
            pts = np.column_stack([xs, ys, surfh(xs, ys) + 0.025])[::2]
            if kind == 'centre' and wts[i:j].mean() >= 11:
                for d2 in (0.12, -0.12):
                    q = pts.copy(); q[:, 0] += lx[i:j][::2] * d2; q[:, 1] += ly[i:j][::2] * d2; q[:, 2] = surfh(q[:, 0], q[:, 1]) + 0.025
                    C(ck(*q[len(q) // 2, :2]))['paint'].append((q, False))
            else: C(ck(*pts[len(pts) // 2, :2]))['paint'].append((pts, kind == 'dash'))
            nl += 1
        if w['hw'] in MAJOR and med >= 7:
            for sg in (1, -1):
                o = (dls[i:j] - 0.4) if sg == 1 else -(drs[i:j] - 0.4); xs = x[i:j] + lx[i:j] * o; ys = y[i:j] + ly[i:j] * o
                pts = np.column_stack([xs, ys, surfh(xs, ys) + 0.025])[::2]; C(ck(*pts[len(pts) // 2, :2]))['paint'].append((pts, False)); nl += 1
tick(f'ground paint lines {nl}')
# ---- crossings and stop lines (OSM crossings on ground roads) ----
Nd = json.load(open('osm_nodes.json'))['elements']
cross = {nd['id']: nd for nd in Nd if nd['type'] == 'node' and (nd.get('tags', {}).get('highway') == 'crossing' or 'crossing' in nd.get('tags', {})) and nd.get('tags', {}).get('crossing') not in ('unmarked', 'no', 'informal')}
sig = np.array([geo.enu(np.array([nd['lat']]), np.array([nd['lon']]), np.array([40.0]))[0, :2] for nd in Nd if nd['type'] == 'node' and nd.get('tags', {}).get('highway') == 'traffic_signals'])
def rect(c, u, v):
    Q = np.array([c, c + u, c + u + v, c + v]); C(ck(*Q.mean(0)))['rect'].append(np.column_stack([Q, surfh(Q[:, 0], Q[:, 1]) + 0.025]))
nc = ns = 0; signals = []
for w in ground_ways:
    if w['hw'] not in DRIVE: continue
    p = w['p']
    for k, nid in enumerate(w['nodes']):
        if nid not in cross: continue
        q = p[k]; a = p[max(0, k - 1)]; b = p[min(len(p) - 1, k + 1)]; d = b - a; L = np.hypot(*d)
        if L < 1e-3: continue
        T = d / L; Lv = np.array([-T[1], T[0]])
        dl = reach(np.array([q[0]]), np.array([q[1]]), Lv[0], Lv[1])[0]; dr_ = reach(np.array([q[0]]), np.array([q[1]]), -Lv[0], -Lv[1])[0]; wt = dl + dr_
        if wt < 5.5 or wt > 45 or not inside(np.array([q[0]]), np.array([q[1]]))[0]: continue
        cnt = int((wt - 1.0) // 0.9); o0 = -dr_ + (wt - (cnt * 0.9 - 0.45)) / 2
        for i in range(cnt): rect(q + Lv * (o0 + i * 0.9) - T * 2.0, Lv * 0.45, T * 4.0)
        nc += 1
        sg = cross[nid].get('tags', {}).get('crossing') == 'traffic_signals' or (len(sig) and np.min(np.hypot(*(sig - q).T)) < 30)
        if not sg: continue
        mid = dl - wt / 2
        if w['oneway']: rect(q - T * 4.45 + Lv * (-dr_ + 0.3), Lv * (wt - 0.6), T * 0.45); ns += 1
        else: rect(q - T * 4.45 + Lv * mid, Lv * (dl - 0.3 - mid), T * 0.45); rect(q + T * 4.0 + Lv * (-dr_ + 0.3), Lv * (mid + dr_ - 0.3), T * 0.45); ns += 2
        signals.append((q, T, dl, dr_, w['oneway'], w['id']))
pickle.dump(signals, open('signals_seed.pkl', 'wb'))
tick(f'crossings {nc} stop lines {ns}')
# ---- trees (as before: OpenStreetMap's, outside PLATEAU's own block), on the new heights ----
# OSM's trees and tree rows (in PLATEAU's own vegetation block, VEG3, PLATEAU's are used instead); heights from the tags or 6.5-11.5 m
VEG3 = (35.4424, 35.4505, 139.6329, 139.6431); tl = []
Wy = json.load(open('osm_ways.json'))['elements']
for nd in Nd:
    t = nd.get('tags', {})
    if nd['type'] == 'node' and t.get('natural') == 'tree' and not (VEG3[0] <= nd['lat'] <= VEG3[1] and VEG3[2] <= nd['lon'] <= VEG3[3]):
        try: hh = float(str(t.get('height', '')).replace('m', '').strip())
        except Exception: hh = 0
        tl.append((*geo.enu(np.array([nd['lat']]), np.array([nd['lon']]), np.array([40.0]))[0, :2], hh))
for wy in Wy:
    if wy.get('tags', {}).get('natural') != 'tree_row' or not wy.get('geometry'): continue
    a = np.array([[q['lat'], q['lon']] for q in wy['geometry']]); pp = geo.enu(a[:, 0], a[:, 1], np.zeros(len(a)) + 40)[:, :2]
    L = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(pp, axis=0).T))])
    for s_ in np.arange(4, L[-1], 9.0):
        lat0, lon0, _ = geo.geodetic(geo.O + np.interp(s_, L, pp[:, 0]) * geo.Ev + np.interp(s_, L, pp[:, 1]) * geo.Nv)
        if not (VEG3[0] <= lat0 <= VEG3[1] and VEG3[2] <= lon0 <= VEG3[3]): tl.append((np.interp(s_, L, pp[:, 0]), np.interp(s_, L, pp[:, 1]), 0))
TR = np.array(tl, float); TR = TR[(TR[:, 0] > E0) & (TR[:, 0] < E1) & (TR[:, 1] > N0) & (TR[:, 1] < N1) & ~inside(TR[:, 0], TR[:, 1])]
TR[:, 2] = np.where(TR[:, 2] > 2, TR[:, 2], np.random.default_rng(7).uniform(6.5, 11.5, len(TR))); TR = np.column_stack([TR[:, :2], np.zeros(len(TR)), TR[:, 2]])
ps = prep(side.buffer(0.5))
on = np.array([ps.contains(Point(a, b)) for a, b in TR[:, :2]]); TR[:, 2] = roadh(TR[:, 0], TR[:, 1]) + np.where(on, 0.15, -0.2)
# ---- pack (ARA2) ----
bufs = []; off = [0]
def addbuf(a):
    b = np.ascontiguousarray(a).tobytes(); pad = (-len(b)) % 4; bufs.append(b + b'\0' * pad); o = off[0]; off[0] += len(b) + pad; return [o, len(b)]
GU = np.where(water, U0 + GEOID - 3.0, U0 + HS + GEOID - 0.35)
# the ground (lots, plazas) never above a road beside it: within 6 m of a road, at most the road's height less 0.35 m
gy, gx = np.mgrid[0:GU.shape[0], 0:GU.shape[1]]; ge = E0 + gx * G; gn = N0 + gy * G
fx = np.clip(((ge - E0) / RS).astype(int), 0, HX - 1); fy = np.clip(((gn - N0) / RS).astype(int), 0, HY - 1)
lo = np.full(GU.shape, np.inf)
for dy in range(-6, 7, 2):
    for dx in range(-6, 7, 2):
        v = HR[np.clip(fy + dy, 0, HY - 1), np.clip(fx + dx, 0, HX - 1)]; lo = np.fmin(lo, np.where(np.isnan(v), np.inf, v))
GU = np.where(np.isfinite(lo), np.minimum(GU, lo - 0.35), GU)
head = {'v': 2, 'geoid': GEOID, 'chunk': CH, 'e0': E0, 'n0': N0, 'grid': {'e0': E0, 'n0': N0, 'step': G, 'nx': int(GU.shape[1]), 'ny': int(GU.shape[0]), 'b': addbuf(np.round(GU * 100).astype(np.int16))},
        'water': float(np.median(U0) + GEOID), 'trees': addbuf(TR.astype(np.float32)), 'chunks': [],
        'stats': {'deckWays': len(deck_ways), 'deckSamples': deck_samples, 'estimatedSamples': est_samples},
        'deckEnds': [[round(float(v), 1) for v in w['xy'][k]] for w in deck_ways for k in (0, -1)]}   # (where decks meet the ground: for the tests)
def q(P, o): return np.round((np.asarray(P) - o) * 100).astype(np.int16)
stats = collections.Counter()
for (ci, cj), c in sorted(chunks.items()):
    o = np.array([E0 + (ci + 0.5) * CH, N0 + (cj + 0.5) * CH, 0.0]); us = [p[0][:, 2].mean() for L in ('carr', 'side') for p in c.get(L, [])]; o[2] = round(float(np.mean(us)) if us else 0.0, 2)
    rec = {'i': ci, 'j': cj, 'o': o.tolist()}
    for L in ('carr', 'side'):
        parts = []; V = []; I = []; nv = 0
        for P, tri in c.get(L, []):
            if nv + len(P) > 65535: parts.append({'v': addbuf(q(np.concatenate(V), o)), 'i': addbuf(np.concatenate(I).astype(np.uint16))}); V = []; I = []; nv = 0
            V.append(P); I.append(tri + nv); nv += len(P); stats[L] += len(tri) // 3
        if V: parts.append({'v': addbuf(q(np.concatenate(V), o)), 'i': addbuf(np.concatenate(I).astype(np.uint16))})
        if parts: rec[L] = parts
    for L in ('deck', 'dside', 'conc'):                                   # (triangle soups: 3 corners each)
        if c.get(L):
            T = np.concatenate([a.reshape(-1, 3) for a in c[L]]); rec[L] = addbuf(q(T, o)); stats[L] += len(T) // 3
    for L in ('kerb', 'paint'):
        if not c.get(L): continue
        P = np.concatenate([p for p, _ in c[L]]); n = np.array([len(p) for p, _ in c[L]], np.uint32); k = np.array([int(f) for _, f in c[L]], np.uint8)
        rec[L] = {'p': addbuf(q(P, o)), 'n': addbuf(n), 'k': addbuf(k)}; stats[L + 'Pts'] += len(P)
    if c.get('rect'): rec['rect'] = addbuf(q(np.concatenate(c['rect']), o)); stats['rects'] += len(c['rect'])
    head['chunks'].append(rec)
hj = json.dumps(head).encode(); hj += b' ' * ((-len(hj)) % 4)
with open('area_a.bin', 'wb') as f:
    f.write(b'ARA2'); f.write(struct.pack('<I', len(hj))); f.write(hj)
    for b in bufs: f.write(b)
tick(f'{dict(stats)} size MB {os.path.getsize("area_a.bin") / 1e6:.1f} chunks {len(chunks)}')
