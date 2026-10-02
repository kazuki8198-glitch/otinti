# PLATEAU road bridges (brid LOD2) as deck-top height samples: per 4 m cell, the highest point of each road bridge
import sys, glob, json, subprocess, numpy as np, pickle
sys.path.insert(0, '../tran'); import b3dm, geo
pts = []
for f in sorted(glob.glob('../brid/l2_*.b3dm')):
    r = b3dm.read(f); fn = r['bt'].get('brid:function', [])
    for p in r['prims']:
        P = p['pos'][:, [0, 2, 1]] * np.array([1, -1, 1]) + r['rtc']; lat, lon, h = geo.geodetic(P); L = geo.enu(lat, lon, h)
        for b in np.unique(p['bid']):
            if b >= len(fn) or fn[b] != '道路橋': continue
            q = L[p['bid'] == b]; key = np.floor(q[:, :2] / 4).astype(int); d = {}
            for k, row in zip(map(tuple, key), q):
                if k not in d or row[2] > d[k][2]: d[k] = row
            pts += list(d.values())
BR = np.array(pts); print('deck samples', len(BR)); pickle.dump(BR, open('brid_pts.pkl', 'wb'))
