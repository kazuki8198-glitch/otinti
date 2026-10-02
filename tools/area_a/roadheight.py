# Ground roads' surface height: from the roads' own centreline profiles (the DEM along the middle of each OSM way,
# smoothed), spread across the road (inverse-distance mix of the nearest centrelines within 25 m; junctions blend);
# where no way is near (plazas, lanes OSM lacks), the smoothed DEM. Walls and embankments beside a road no longer
# pull its edges up or down.
import numpy as np, collections
class RoadHeight:
    def __init__(self, ground_ways, fallback, cell=12.0):
        self.cell = cell; self.fb = fallback; idx = collections.defaultdict(list); pts = []
        for w in ground_ways:
            if w.get('h') is None: continue
            for (x, y), h in zip(w['xy'], w['h']): pts.append((x, y, h))
        self.P = np.array(pts, float)
        for k, (x, y, h) in enumerate(self.P): idx[(int(x // cell), int(y // cell))].append(k)
        self.idx = {k: np.array(v) for k, v in idx.items()}
    def __call__(self, e, n):
        e = np.atleast_1d(np.asarray(e, float)); n = np.atleast_1d(np.asarray(n, float)); out = self.fb(e, n).astype(float)
        c = self.cell
        for t in range(len(e)):
            ci, cj = int(e[t] // c), int(n[t] // c); cand = [self.idx.get((ci + a, cj + b)) for a in (-2, -1, 0, 1, 2) for b in (-2, -1, 0, 1, 2)]
            cand = [x for x in cand if x is not None]
            if not cand: continue
            ks = np.concatenate(cand); P = self.P[ks]; d = np.hypot(P[:, 0] - e[t], P[:, 1] - n[t]); m = d < 25
            if not m.any(): continue
            d = d[m]; h = P[m, 2]; o = np.argsort(d)[:6]; w = 1.0 / (d[o] + 1.0) ** 2
            out[t] = np.sum(w * h[o]) / np.sum(w)
        return out
