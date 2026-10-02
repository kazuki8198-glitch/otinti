# a route over OSM's ways (directed, one-way respected), the expressway cheap: general road -> on-ramp -> K1 -> exit -> general road
import pickle, numpy as np, heapq, json, sys, collections
S1 = pickle.load(open('b4_stage1.pkl', 'rb')); WL = S1['WL']
DRIVE = {'motorway', 'motorway_link', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'trunk_link', 'primary_link', 'secondary_link', 'tertiary_link'}
adj = collections.defaultdict(list); pos = {}
for wi, w in enumerate(WL):
    if w['hw'] not in DRIVE or len(w['nodes']) < 2: continue
    mot = w['hw'] in ('motorway', 'motorway_link'); ow = w['oneway'] or mot
    idx = [int(np.argmin(np.hypot(*(w['xy'] - q).T))) for q in w['p']]
    for k in range(len(w['nodes']) - 1):
        a, b = w['nodes'][k], w['nodes'][k + 1]; L = float(np.hypot(*(w['p'][k + 1] - w['p'][k]))); c = L * (1.0 if mot else float(sys.argv[4]) if len(sys.argv) > 4 else 3.0)
        pos[a] = w['p'][k]; pos[b] = w['p'][k + 1]
        adj[a].append((b, c, wi, idx[k], idx[k + 1]))
        if not ow: adj[b].append((a, c, wi, idx[k + 1], idx[k]))
def nearest(q, ground=True):
    best = None
    for nid, p in pos.items():
        d = np.hypot(*(p - q))
        if best is None or d < best[0]: best = (d, nid)
    return best[1]
src = nearest(np.array([float(x) for x in sys.argv[1].split(',')])); dst = nearest(np.array([float(x) for x in sys.argv[2].split(',')]))
dist = {src: 0}; prev = {}; pq = [(0, src)]
while pq:
    d, u = heapq.heappop(pq)
    if u == dst: break
    if d > dist.get(u, 1e18): continue
    for v, c, wi, i0, i1 in adj[u]:
        if d + c < dist.get(v, 1e18): dist[v] = d + c; prev[v] = (u, wi, i0, i1); heapq.heappush(pq, (d + c, v))
assert dst in prev, 'no route'
legs = []; u = dst
while u != src: p_, wi, i0, i1 = prev[u]; legs.append((wi, i0, i1)); u = p_
legs.reverse(); pts = []
for wi, i0, i1 in legs:
    w = WL[wi]; r = range(i0, i1 + 1) if i1 >= i0 else range(i0, i1 - 1, -1)
    for i in r: pts.append([float(w['xy'][i, 0]), float(w['xy'][i, 1]), float(w['h'][i]), w['id'], w['hw'], w['kind']])
kinds = []
for p in pts:
    k = p[4] + '/' + p[5]
    if not kinds or kinds[-1][0] != k: kinds.append([k, 1])
    else: kinds[-1][1] += 1
print('points', len(pts), 'length ~', round(sum(np.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))), 'm')
print(' -> '.join(f'{k}({n})' for k, n in kinds))
json.dump(pts, open(sys.argv[3], 'w'))
