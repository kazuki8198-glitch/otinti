# step 1: PLATEAU road polygons (tran LOD1, MVT z16) -> one road area in local metres (east, north from the Kannai spot);
# minus the LOD3 block's own roads; split into carriageway and pavements
import glob, math, pickle, numpy as np, mapbox_vector_tile, sys
from shapely.geometry import shape, Polygon, MultiPolygon, box
from shapely.ops import unary_union
from shapely import affinity
import geo
polys=[]
for f in glob.glob('mvt/16_*.mvt'):
    import os
    if os.path.getsize(f)<50: continue
    z,x,y=map(int,f[4:-4].split('_'))
    try: t=mapbox_vector_tile.decode(open(f,'rb').read(), default_options={'y_coord_down': True})
    except Exception: continue
    L=t.get('Road'); 
    if not L: continue
    ext=L['extent']; n=2**z
    def tr(px,py):
        lon=(x+px/ext)/n*360-180; yy=(y+py/ext)/n; lat=np.degrees(np.arctan(np.sinh(np.pi*(1-2*yy))))
        return lat,lon
    for fe in L['features']:
        g=fe['geometry']
        rings=[g['coordinates']] if g['type']=='Polygon' else g['coordinates']
        for poly in rings:
            out=[]
            for ring in poly:
                a=np.array(ring,float); lat,lon=tr(a[:,0],a[:,1]); p=geo.enu(lat,lon,np.zeros_like(lat)+40)
                out.append(list(zip(p[:,0],p[:,1])))
            try:
                P=Polygon(out[0],out[1:]).buffer(0)
                if not P.is_empty: polys.append(P)
            except Exception as e: pass
print('polygons',len(polys))
U=unary_union([p.buffer(0.05) for p in polys]).buffer(-0.05)
print('road area km2', U.area/1e6)
pickle.dump(U,open('U.pkl','wb'))
