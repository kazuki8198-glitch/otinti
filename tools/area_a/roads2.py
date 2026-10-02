import json, subprocess, os, pickle, numpy as np, sys
sys.path.insert(0,'../tran')
import b3dm, geo
from shapely.geometry import Polygon
from shapely.ops import unary_union
base='https://assets.cms.plateau.reearth.io/assets/51/8e3f96-c5d3-4d89-9397-0aa810b096f7/14100_yokohama-shi_city_2024_citygml_2_op_tran_3dtiles_lod3/'
ts=json.loads(subprocess.run(['curl','-sS',base+'tileset.json'],capture_output=True).stdout)
uris=[]
def w(n):
    if 'content' in n and not n.get('children'): uris.append(n['content']['uri'])
    for c in n.get('children',[]): w(c)
w(ts['root'])
tris=[]
for u in uris:
    p='lod3/'+u.replace('/','_')
    if not os.path.exists(p): subprocess.run(['curl','-sS','-o',p,base+u])
    r=b3dm.read(p)
    for pr in r['prims']:
        P=pr['pos'][:,[0,2,1]]*np.array([1,-1,1])+r['rtc']; lat,lon,h=geo.geodetic(P); L=geo.enu(lat,lon,h)
        for f in pr['faces']:
            q=Polygon(L[f][:,:2])
            if q.area>1e-4: tris.append(q)
print('lod3 leaves',len(uris),'triangles',len(tris))
F=unary_union([t.buffer(0.02) for t in tris]).buffer(0.5)
print('lod3 footprint km2',F.area/1e6)
pickle.dump(F,open('F3.pkl','wb'))
