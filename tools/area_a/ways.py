# Road graph and heights (one place for every road surface, paint, deck and the car's ground).
# Each OSM way keeps its id, class, lanes, direction, bridge / tunnel / layer. Heights:
#  - ground ways: the GSI DEM (orthometric + geoid), smoothed along the way (underpasses keep the DEM's low road);
#  - bridges and viaducts: their ends where they meet ground roads; PLATEAU's own bridge decks (brid LOD2) where one
#    lies under the way; else clearance over what is below by layer; smoothed, grade-limited;
#  - tunnels: under the ground by layer, rising to the portals.
# A height not backed by DEM or PLATEAU is marked 'est' (estimated) per sample.
import json, math, pickle, sys, collections, numpy as np, geo
DRIVE = {'motorway', 'motorway_link', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential',
         'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link', 'service'}
GEOID = 36.28
def load(H, osm='osm_ways.json', brid=None):
    E0, E1, N0, N1, G = H['G']; Df, U0 = H['Df'], H['U0']
    def hg(e, n, arr):
        fi = np.clip((np.asarray(e, float) - E0) / G, 0, arr.shape[1] - 1.001); fj = np.clip((np.asarray(n, float) - N0) / G, 0, arr.shape[0] - 1.001)
        i = np.floor(fi).astype(int); j = np.floor(fj).astype(int); u = fi - i; v = fj - j
        return (arr[j, i] * (1 - u) + arr[j, i + 1] * u) * (1 - v) + (arr[j + 1, i] * (1 - u) + arr[j + 1, i + 1] * u) * v
    ground = lambda e, n: hg(e, n, U0) + hg(e, n, Df) + GEOID          # ('up' in the Kannai frame)
    curve = lambda e, n: hg(e, n, U0)                                   # (the ellipsoid's own drop, for heights given above sea level)
    W = json.load(open(osm))['elements']
    ways = []; node_ways = collections.defaultdict(list)
    for w in W:
        t = w['tags']; hw = t.get('highway')
        if hw not in DRIVE or not w.get('geometry') or t.get('area') == 'yes': continue
        if hw == 'service' and t.get('service') in ('parking_aisle', 'driveway', 'drive-through'): continue
        a = np.array([[q['lat'], q['lon']] for q in w['geometry']]); p = geo.enu(a[:, 0], a[:, 1], np.zeros(len(a)) + 40)[:, :2]
        try: layer = int(str(t.get('layer', '0')).split(';')[0])
        except ValueError: layer = 0
        kind = 'tunnel' if t.get('tunnel') in ('yes', 'building_passage', 'culvert') or (layer < 0 and t.get('tunnel')) else 'bridge' if t.get('bridge') in ('yes', 'viaduct', 'movable', 'cantilever') else 'ground'
        try: lanes = int(str(t.get('lanes', '')).split(';')[0])
        except ValueError: lanes = 0
        wd = dict(id=w['id'], hw=hw, ref=t.get('ref'), name=t.get('name'), layer=layer, kind=kind, lanes=lanes,
                  oneway=t.get('oneway') in ('yes', '1', 'true') or t.get('junction') == 'roundabout' or hw in ('motorway',), tags=t,
                  nodes=list(w['nodes']), p=p)
        ways.append(wd)
        for i, nid in enumerate(wd['nodes']): node_ways[nid].append((len(ways) - 1, i))
    # node heights: targets and how firmly they are held
    node_h = {}; fixed = {}
    for wi, w in enumerate(ways):
        g = ground(w['p'][:, 0], w['p'][:, 1])
        for i, nid in enumerate(w['nodes']):
            kinds = {ways[a]['kind'] for a, _ in node_ways[nid]}
            if w['kind'] == 'ground' or 'ground' in kinds and w['kind'] != 'ground' and all(ways[a]['kind'] == 'ground' or ways[a]['layer'] == w['layer'] or True for a, _ in node_ways[nid]):
                if 'ground' in kinds: fixed[nid] = g[i]; node_h[nid] = g[i]
    # the PLATEAU bridge decks, as height samples: (east, north, deck top 'up')
    BR = brid if brid is not None else np.zeros((0, 3))
    from shapely.geometry import Point
    for w in ways:
        p = w['p']; seg = np.hypot(*np.diff(p, axis=0).T); L = np.concatenate([[0], np.cumsum(seg)]); w['L'] = L[-1]
        if L[-1] < 0.5: w['s'] = np.array([0.0]); w['xy'] = p[:1]; w['h'] = ground(p[:1, 0], p[:1, 1]); w['est'] = np.zeros(1, bool); continue
        s = np.arange(0, L[-1], 2.0); s = np.append(s, L[-1])
        x = np.interp(s, L, p[:, 0]); y = np.interp(s, L, p[:, 1]); g = ground(x, y)
        w['s'] = s; w['xy'] = np.column_stack([x, y]); w['g'] = g
        # each sample's node index along the way (for the ends)
        if w['kind'] == 'ground':
            h = g.copy(); k = 7                                           # (the DEM, smoothed over ~15 m)
            if len(h) > k: h = np.convolve(np.pad(h, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k]
            w['h'] = h; w['est'] = np.zeros(len(s), bool)
        else:
            w['h'] = None
    # elevated and buried ways: chains between ground-held nodes, solved per chain
    def end_height(w, end):
        nid = w['nodes'][0 if end == 0 else -1]
        if nid in fixed: return fixed[nid], True
        return None, False
    for w in ways:
        if w['kind'] == 'ground' or w['L'] < 0.5: continue
        s, xy, g = w['s'], w['xy'], w['g']; n = len(s)
        lay = w['layer'] if w['layer'] != 0 else (1 if w['kind'] == 'bridge' else -1)
        mot = w['hw'] in ('motorway', 'motorway_link')
        if w['kind'] == 'bridge': target = g + (6.5 if not mot else {1: 8.0, 2: 13.0, 3: 18.0, 4: 23.0}.get(lay, 13.0))
        else: target = g - {-1: 8.0, -2: 13.0}.get(lay, 8.0)
        est = np.ones(n, bool)
        # PLATEAU decks under this way (within 8 m sideways), as firmer targets
        if len(BR):
            for i in range(0, n, 2):
                d = np.hypot(BR[:, 0] - xy[i, 0], BR[:, 1] - xy[i, 1]); near = np.where(d < 8)[0]
                if len(near):                                             # (several decks stacked: the one nearest this way's own level)
                    j = near[np.argmin(np.abs(BR[near, 2] - target[i]))]
                    if abs(BR[j, 2] - target[i]) < 9: target[max(0, i - 1):i + 2] = BR[j, 2]; est[max(0, i - 1):i + 2] = False
        # between PLATEAU's deck points, the way follows them (joined straight); only a way with none at all keeps the
        # estimate from its layer
        if (~est).sum() >= 2:
            sup = np.where(~est)[0]; target = np.interp(s, s[sup], target[sup])
        h0, f0 = end_height(w, 0); h1, f1 = end_height(w, 1)
        h = target.copy()
        # ends meet the ground roads; the way climbs/descends to its target at no more than 6 % (motorway) / 8 %
        gmax = 0.06 if mot else 0.08
        if f0: h = np.minimum(h, h0 + gmax * s) if w['kind'] == 'bridge' else np.maximum(h, h0 - gmax * s)
        if f1: h = np.minimum(h, h1 + gmax * (s[-1] - s)) if w['kind'] == 'bridge' else np.maximum(h, h1 - gmax * (s[-1] - s))
        if f0: h[0] = h0
        if f1: h[-1] = h1
        w['h'] = h; w['est'] = est; w['ends'] = (f0, f1)
    # shared nodes between elevated ways: one height (the mean), then each such way re-fitted to its ends
    for it in range(3):
        nh = collections.defaultdict(list)
        for w in ways:
            if w['h'] is None or w['L'] < 0.5: continue
            nh[w['nodes'][0]].append(w['h'][0]); nh[w['nodes'][-1]].append(w['h'][-1])
        for w in ways:
            if w['kind'] == 'ground' or w['L'] < 0.5: continue
            a = np.mean(nh[w['nodes'][0]]); b = np.mean(nh[w['nodes'][-1]]); s = w['s']
            if w['nodes'][0] in fixed: a = fixed[w['nodes'][0]]
            if w['nodes'][-1] in fixed: b = fixed[w['nodes'][-1]]
            d0 = a - w['h'][0]; d1 = b - w['h'][-1]; t = s / max(s[-1], 1e-6)
            w['h'] = w['h'] + d0 * (1 - t) + d1 * t
    # smooth the elevated profiles (vertical curves) keeping their ends: PLATEAU's deck points mix the deck, its
    # parapets and its girders, so a running median over 30 m first, then a mean over 50 m
    for w in ways:
        mot = w['hw'] in ('motorway', 'motorway_link')
        if (w['kind'] == 'ground' and not mot) or w['L'] < 0.5 or len(w['h']) < 9: continue
        h = w['h']; a, b = h[0], h[-1]
        km = min(7, (len(h) - 1) // 2); pm = np.pad(h, km, mode='edge'); h = np.array([np.median(pm[i:i + 2 * km + 1]) for i in range(len(h))])
        box = lambda x, k: np.convolve(np.pad(x, k, mode='edge'), np.ones(2 * k + 1) / (2 * k + 1), mode='same')[k:-k] if k > 0 else x
        k = min(30, (len(h) - 1) // 2); hs = box(box(h, k), k)            # (two 120 m means: a long vertical curve)
        if w['kind'] == 'bridge' and w['hw'] in ('motorway', 'motorway_link'):
            g = w['g']; t = np.linspace(0, 1, len(h)); inner = np.minimum(w['s'], w['s'][-1] - w['s']) > 60
            hs = np.where(inner, np.maximum(hs, g + 6.5), hs)                # (room under it for the roads below)
            k2 = min(8, (len(h) - 1) // 2); hs = box(hs, k2)
        t = np.linspace(0, 1, len(h)); hs = hs + (a - hs[0]) * (1 - t) + (b - hs[-1]) * t
        if mot:                                                           # (the expressway: no steeper than 6 %, its ramps 8 %)
            gm = 0.06 if w['hw'] == 'motorway' else 0.08; ds = np.diff(w['s'])
            for _ in range(2):
                for i in range(1, len(hs)): hs[i] = min(max(hs[i], hs[i - 1] - gm * ds[i - 1]), hs[i - 1] + gm * ds[i - 1])
                for i in range(len(hs) - 2, -1, -1): hs[i] = min(max(hs[i], hs[i + 1] - gm * ds[i]), hs[i + 1] + gm * ds[i])
        w['h'] = hs
    # the last word on heights. A ramp lying on the mainline it merges with or leaves (their decks overlapping sideways)
    # takes the mainline's height there. Then every way meets the ways it shares a node with at one height (the grade
    # limit and the smoothing above move ends apart), each end eased in over up to 60 m; a node on a ground road keeps
    # the ground road's height
    lw = lambda w: (w['lanes'] or 2) * 3.5 + 2.0 if w['hw'] == 'motorway' else (w['lanes'] or 1) * 3.5 + 2.5
    hm = collections.defaultdict(list); mains = [w for w in ways if w['hw'] == 'motorway' and w['h'] is not None and len(w['s']) > 1]
    for mi, w in enumerate(mains):
        w['tn'] = np.gradient(w['xy'], axis=0); w['tn'] /= np.linalg.norm(w['tn'], axis=1)[:, None] + 1e-9
        for j, (x, y) in enumerate(w['xy']): hm[(int(x // 16), int(y // 16))].append((mi, j))
    for w in ways:
        if w['hw'] != 'motorway_link' or w['h'] is None or len(w['s']) < 3: continue
        h = w['h'].copy(); hit = np.zeros(len(h), bool)
        for i, (x, y) in enumerate(w['xy']):
            best = None
            for di in (-1, 0, 1):
                for dj in (-1, 0, 1):
                    for mi, j in hm.get((int(x // 16) + di, int(y // 16) + dj), ()):
                        m = mains[mi]; d = np.array([x, y]) - m['xy'][j]; t = m['tn'][j]
                        if abs(d @ t) < 2.2 and abs(d[0] * -t[1] + d[1] * t[0]) < (lw(w) + lw(m)) / 2 - 0.5 and abs(m['h'][j] - h[i]) < 3.0:
                            if best is None or abs(m['h'][j] - h[i]) < abs(best - h[i]): best = m['h'][j]
            if best is not None: h[i] = best; hit[i] = True
        if hit.any():                                                     # (eased in and out over 60 m: no step)
            hi = np.where(hit)[0]; dlt = h[hi] - w['h'][hi]; s_ = w['s']
            near = np.abs(s_[:, None] - s_[hi][None, :]); k = near.argmin(1)
            w['h'] = w['h'] + dlt[k] * np.clip(1 - near[np.arange(len(s_)), k] / 60.0, 0, 1); w['merged'] = int(hit.sum())
    for it in range(4):
        nh = collections.defaultdict(list)
        for w in ways:
            if w['h'] is None or w['L'] < 0.5: continue
            nh[w['nodes'][0]].append(w['h'][0]); nh[w['nodes'][-1]].append(w['h'][-1])
        for w in ways:
            if w['h'] is None or w['L'] < 0.5 or (w['kind'] == 'ground' and w['hw'] not in ('motorway', 'motorway_link')): continue
            s = w['s']; D = min(60.0, s[-1] / 2)
            a = fixed.get(w['nodes'][0], np.mean(nh[w['nodes'][0]])); b = fixed.get(w['nodes'][-1], np.mean(nh[w['nodes'][-1]]))
            w['h'] = w['h'] + (a - w['h'][0]) * np.clip(1 - s / max(D, 1e-6), 0, 1) + (b - w['h'][-1]) * np.clip(1 - (s[-1] - s) / max(D, 1e-6), 0, 1)
    return ways, fixed, ground, curve
