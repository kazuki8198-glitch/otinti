# Area A, v2: one height for every road surface, paint, deck and the car (ways.py); bridges, viaducts, tunnels and the
# expressway as their own decks; ground roads from PLATEAU's road areas minus the decks' footprints where no ground road
# runs below. Output: models/area/area_a.bin (format ARA2)
import pickle, json, math, struct, numpy as np, time, os, sys, collections, geo, mapbox_earcut as earcut
from shapely.geometry import box, Point, LineString, Polygon
from shapely.prepared import prep
from shapely.ops import unary_union
import ways as WAYS
T0 = time.time(); tick = lambda m: print(f'{time.time() - T0:7.1f}s {m}', flush=True)
H = pickle.load(open('hgt.pkl', 'rb')); E0, E1, N0, N1, G = H['G']; Df, U0, water = H['Df'], H['U0'], H['water']
GEOID = 36.28; CH = 400.0
# the ground roads' height field: the DEM, smoothed over ~10 m (two passes of a 3x3 box): one source for the surfaces,
# the paint, the ways' profiles and the car
def box3(a): p = np.pad(a, 1, mode='edge'); return sum(p[1 + i:p.shape[0] - 1 + i, 1 + j:p.shape[1] - 1 + j] for i in (-1, 0, 1) for j in (-1, 0, 1)) / 9
HS = box3(box3(Df))
def hgrid(e, n, arr):
    fi = np.clip((np.asarray(e, float) - E0) / G, 0, arr.shape[1] - 1.001); fj = np.clip((np.asarray(n, float) - N0) / G, 0, arr.shape[0] - 1.001)
    i = np.floor(fi).astype(int); j = np.floor(fj).astype(int); u = fi - i; v = fj - j
    return (arr[j, i] * (1 - u) + arr[j, i + 1] * u) * (1 - v) + (arr[j + 1, i] * (1 - u) + arr[j + 1, i + 1] * u) * v
def demh(e, n): return hgrid(e, n, U0) + hgrid(e, n, HS) + GEOID
BR = pickle.load(open('brid_pts.pkl', 'rb'))
WL, fixed, _, _ = WAYS.load(dict(H, Df=HS), 'osm_ways.json', BR)
from roadheight import RoadHeight
roadh = RoadHeight([w for w in WL if w['kind'] == 'ground' and w['hw'] not in ('motorway', 'motorway_link') and w['L'] > 4], demh)
tick(f'ways {len(WL)}')
MOT = {'motorway', 'motorway_link'}
def width_of(w):
    if w['hw'] == 'motorway': n = w['lanes'] or 2; return n * 3.5 + 2.0
    if w['hw'] == 'motorway_link': n = w['lanes'] or 1; return n * 3.5 + 2.5
    n = w['lanes'] or (1 if w['oneway'] else 2); return max(6.0, n * 3.25 + 2.0)
deck_ways = [w for w in WL if w['L'] > 4 and (w['kind'] != 'ground' or w['hw'] in MOT)]
for w in deck_ways:
    w['W'] = width_of(w); w['poly'] = LineString(w['xy']).buffer(w['W'] / 2, cap_style=2, join_style=2)
ground_ways = [w for w in WL if w['L'] > 4 and w['kind'] == 'ground' and w['hw'] not in MOT]
under = unary_union([LineString(w['xy']).buffer(width_of(w) / 2 + 1.0, cap_style=2) for w in ground_ways])
remove = unary_union([w['poly'] for w in deck_ways if w['kind'] != 'tunnel']).difference(under)
tick('footprints')
# ---- ground roads: PLATEAU's areas minus the decks' own footprints; carriageway and pavements as before ----
U = pickle.load(open('U.pkl', 'rb')).buffer(0); F3 = pickle.load(open('F3.pkl', 'rb'))
# where PLATEAU has no road area under an OSM road (the edges of its data, gaps), a strip along the centreline (an
# estimate: residential 5 m, tertiary 7 m, larger by their lanes); slivers along PLATEAU's own edges are dropped
FILLW = {'residential': 5.0, 'unclassified': 5.0, 'living_street': 4.0, 'tertiary': 7.0, 'tertiary_link': 6.0}
fill = unary_union([LineString(w['xy']).buffer(FILLW.get(w['hw'], width_of(w)) / 2) for w in ground_ways if w['hw'] in FILLW or w['hw'] in ('trunk', 'primary', 'secondary', 'trunk_link', 'primary_link', 'secondary_link')])
fill = fill.difference(U).buffer(-1.0).buffer(1.0); U = U.union(fill).buffer(0)
pickle.dump(fill, open('fill.pkl', 'wb')); tick(f'road areas filled from OSM (estimated): {fill.area:.0f} m2')
U = U.difference(remove).buffer(-0.05).buffer(0.05).intersection(box(E0 + 10, N0 + 10, E1 - 10, N1 - 10))   # (inside the DEM's grid only)
wide = U.buffer(-6.0, quad_segs=6).buffer(6.0, quad_segs=6).intersection(U)
narrow = U.difference(wide).buffer(-0.05).buffer(0.05)
carriage = unary_union([wide.buffer(-3.25, quad_segs=6), narrow]).difference(F3)
side = U.difference(carriage.buffer(0.01)).difference(F3).buffer(-0.02).buffer(0.02)
carriage = carriage.simplify(0.12).buffer(0); side = side.simplify(0.12).buffer(0)
pickle.dump((carriage, side), open('CS2.pkl', 'wb'))
tick('carriageway / pavements')
def ck(e, n): return (int(math.floor((e - E0) / CH)), int(math.floor((n - N0) / CH)))
chunks = {}
def C(k):
    if k not in chunks: chunks[k] = collections.defaultdict(list)
    return chunks[k]
def geoms(g):
    if g.is_empty: return []
    if g.geom_type == 'Polygon': return [g]
    return [x for h in getattr(g, 'geoms', []) for x in geoms(h)]
def densify(c, step):
    c = np.asarray(c)[:, :2]; out = []
    for a, b in zip(c[:-1], c[1:]):
        k = max(1, int(math.ceil(np.hypot(*(b - a)) / step)))
        for t in range(k): out.append(a + (b - a) * t / k)
    return np.array(out)
def surfaces(geom, layer, lift, cell=24.0):
    for poly in geoms(geom):
        x0, y0, x1, y1 = poly.bounds; pp = prep(poly)
        for i in range(int(math.floor(x0 / cell)), int(math.floor(x1 / cell)) + 1):
            for j in range(int(math.floor(y0 / cell)), int(math.floor(y1 / cell)) + 1):
                b = box(i * cell, j * cell, (i + 1) * cell, (j + 1) * cell)
                if not pp.intersects(b): continue
                for q in geoms(poly.intersection(b) if not pp.contains(b) else b):
                    if q.area < 0.05: continue
                    rings = [densify(q.exterior.coords, 6.0)] + [densify(h.coords, 6.0) for h in q.interiors]
                    rings = [r for r in rings if len(r) >= 3]
                    if not rings: continue
                    V = np.concatenate(rings); ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
                    try: tri = np.asarray(earcut.triangulate_float64(V, ends), np.uint32)
                    except Exception: continue
                    if len(tri) == 0: continue
                    cx, cy = q.representative_point().coords[0]
                    C(ck(cx, cy))[layer].append((np.column_stack([V, roadh(V[:, 0], V[:, 1]) + lift]), tri))
surfaces(carriage, 'carr', 0.0); surfaces(side, 'side', 0.15); tick('surfaces')
pside = prep(side); pcarr = prep(carriage)
def lines_of(g):
    if g.is_empty: return []
    if g.geom_type in ('LineString', 'LinearRing'): return [g]
    return [x for h in getattr(g, 'geoms', []) for x in lines_of(h)]
def faces(lines, surf, kind):
    for ln in lines:
        c = densify(np.asarray(ln.coords), 8.0); c = np.vstack([c, np.asarray(ln.coords)[-1:, :2]])
        if len(c) < 2: continue
        k = int(np.argmax(np.hypot(*np.diff(c, axis=0).T))); a, b = c[k], c[k + 1]; d = (b - a) / max(np.hypot(*(b - a)), 1e-9)
        if not surf.contains(Point(*(0.5 * (a + b) + np.array([-d[1], d[0]]) * 0.3))): c = c[::-1]
        P = np.column_stack([c, roadh(c[:, 0], c[:, 1])])
        ks = [ck(*((P[i, :2] + P[i + 1, :2]) / 2)) for i in range(len(P) - 1)]; s = 0
        for i in range(1, len(ks) + 1):
            if i == len(ks) or ks[i] != ks[s]: C(ks[s])['kerb'].append((P[s:i + 1], kind)); s = i
faces([l for p in geoms(side) for l in [p.exterior] + list(p.interiors)], pside, 0)
cb = unary_union([LineString(r.coords) for p in geoms(carriage) for r in [p.exterior] + list(p.interiors)]).difference(side.buffer(0.25))
faces(lines_of(cb), pcarr, 1); tick('kerbs')
pickle.dump(dict(chunks=dict(chunks), WL=WL, deck_ways=deck_ways, ground_ways=ground_ways), open('b4_stage1.pkl', 'wb'))
tick('saved stage 1')
