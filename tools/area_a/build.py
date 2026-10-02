# area A (Kannai - Minato Mirai - Yokohama Station): the roads outside PLATEAU's LOD3 block, made from its LOD1 road
# areas, the GSI 5 m DEM, and OpenStreetMap (lanes, one-way, crossings, signals, trees). Output: one binary file of
# chunks (carriageway, pavement, kerb faces, paint) in east/north/up metres from the Kannai spot, the ground grid, trees.
import pickle, json, math, struct, sys, numpy as np, time
import geo, mapbox_earcut as earcut
from shapely.geometry import box, Polygon, LineString, Point
from shapely.ops import unary_union
from shapely.prepared import prep
from shapely import STRtree
T0=time.time()
GEOID=36.28
carriage,side,wide,narrow=pickle.load(open('CS.pkl','rb'))
E0,E1,N0,N1=-2700.,1000.,-1000.,3050.
# ---- heights: DEM on a 5 m grid in east/north; water (no data) kept apart; filled copy for roads over water ----
G=5.0; ge=np.arange(E0,E1+G/2,G); gn=np.arange(N0,N1+G/2,G); EE,NN=np.meshgrid(ge,gn)
P=geo.O+EE[...,None]*geo.Ev+NN[...,None]*geo.Nv
lat,lon,_=geo.geodetic(P)
D=geo.dem(lat,lon); water=np.isnan(D)
def fill(a):
    a=a.copy(); m=~np.isnan(a); L=[(a.copy(),m.astype(float))]
    while L[-1][0].shape[0]>1 or L[-1][0].shape[1]>1:
        v,w=L[-1]; h,wd=v.shape; h2,w2=(h+1)//2,(wd+1)//2
        vp=np.zeros((h2*2,w2*2)); wp=np.zeros((h2*2,w2*2)); vp[:h,:wd]=np.nan_to_num(v)*w; wp[:h,:wd]=w
        vs=vp.reshape(h2,2,w2,2).sum((1,3)); ws=wp.reshape(h2,2,w2,2).sum((1,3))
        L.append((np.where(ws>0,vs/np.maximum(ws,1e-9),0),(ws>0).astype(float)))
    for l in range(len(L)-2,-1,-1):
        v,w=L[l]; c,_=L[l+1]; h,wd=v.shape
        up=np.repeat(np.repeat(c,2,0),2,1)[:h,:wd]
        L[l]=(np.where(w>0,v,up),np.ones_like(w))
    return L[0][0]
Df=fill(D)
def hgrid(e,n,arr):
    fi=np.clip((np.asarray(e)-E0)/G,0,len(ge)-1.001); fj=np.clip((np.asarray(n)-N0)/G,0,len(gn)-1.001)
    i=np.floor(fi).astype(int); j=np.floor(fj).astype(int); u=fi-i; v=fj-j
    return (arr[j,i]*(1-u)+arr[j,i+1]*u)*(1-v)+(arr[j+1,i]*(1-u)+arr[j+1,i+1]*u)*v
# orthometric -> 'up' in the Kannai frame (the earth's curve included): up = u0(e,n) + h_ell, u0 = up of h=0
U0=np.einsum('ijk,k->ij',P-geo.O,geo.Uv)            # (up of the ellipsoid surface point? no: P has u=0) -> recompute below
Pe=geo.ecef(lat,lon,np.zeros_like(lat)); U0=np.einsum('ijk,k->ij',Pe-geo.O,geo.Uv)   # up of the ellipsoid (h=0) under each grid point
def up(e,n,h_orth): return hgrid(e,n,U0)+h_orth+GEOID
def roadh(e,n): return up(e,n,hgrid(e,n,Df))
print('heights', time.time()-T0)
# ---- surfaces: cut into 16 m cells, rings sampled every 4 m, triangulated ----
def densify(c,step=4.0):
    c=np.asarray(c)[:,:2]; out=[]
    for a,b in zip(c[:-1],c[1:]):
        k=max(1,int(math.ceil(np.hypot(*(b-a))/step)))
        for t in range(k): out.append(a+(b-a)*t/k)
    return np.array(out)
def geoms(g):
    if g.is_empty: return []
    if g.geom_type=='Polygon': return [g]
    if hasattr(g,'geoms'): return [x for h in g.geoms for x in geoms(h)]
    return []
CH=400.0
chunks={}
def chunk(e,n): return (int(math.floor((e-E0)/CH)),int(math.floor((n-N0)/CH)))
def C(k):
    if k not in chunks: chunks[k]={'carr':([],[]),'side':([],[]),'kerb':([],[]),'paint':([],[],[])}
    return chunks[k]
def add_surface(geom,layer,lift):
    cell=16.0; tree=None
    for poly in geoms(geom):
        x0,y0,x1,y1=poly.bounds
        pp=prep(poly)
        for i in range(int(math.floor(x0/cell)),int(math.floor(x1/cell))+1):
            for j in range(int(math.floor(y0/cell)),int(math.floor(y1/cell))+1):
                b=box(i*cell,j*cell,(i+1)*cell,(j+1)*cell)
                if not pp.intersects(b): continue
                for q in geoms(poly.intersection(b)):
                    if q.area<0.05: continue
                    rings=[densify(q.exterior.coords)]+[densify(h.coords) for h in q.interiors]
                    rings=[r for r in rings if len(r)>=3]
                    if not rings: continue
                    V=np.concatenate(rings); ends=np.cumsum([len(r) for r in rings]).astype(np.uint32)
                    try: tri=earcut.triangulate_float64(V,ends)
                    except Exception: continue
                    if len(tri)==0: continue
                    cx,cy=q.representative_point().coords[0]; ch=C(chunk(cx,cy))[layer]
                    base=sum(len(v) for v in ch[0])
                    h=roadh(V[:,0],V[:,1])+lift
                    ch[0].append(np.stack([V[:,0],V[:,1],h],1).astype(np.float32)); ch[1].append((np.asarray(tri,np.uint32)+base))
add_surface(carriage,'carr',0.0); print('carriage', time.time()-T0)
add_surface(side,'side',0.15); print('pavements', time.time()-T0)
# ---- kerb faces: every ring edge of the pavements (0.15 up, down to 0.45 under the road) and of the carriageway
# (down 0.45), facing away from their surface ----
def add_faces(geom,top,drop):
    for poly in geoms(geom):
        poly=poly.buffer(0)
        for q in geoms(poly):
            from shapely.geometry.polygon import orient
            q=orient(q,1.0)    # exterior CCW, holes CW: the surface on the left of every edge
            for ring in [q.exterior]+list(q.interiors):
                c=densify(ring.coords); c=np.vstack([c,c[:1]])
                for a,b in zip(c[:-1],c[1:]):
                    d=b-a; l=np.hypot(*d)
                    if l<1e-3: continue
                    nx,ny=d[1]/l,-d[0]/l       # (right of the edge: away from the surface)
                    ha,hb=roadh(np.array([a[0],b[0]]),np.array([a[1],b[1]]))
                    ch=C(chunk((a[0]+b[0])/2,(a[1]+b[1])/2))['kerb']; base=sum(len(v) for v in ch[0])
                    V=np.array([[a[0],a[1],ha+top],[b[0],b[1],hb+top],[b[0],b[1],hb-drop],[a[0],a[1],ha-drop]],np.float32)
                    ch[0].append(V); ch[1].append(np.array([0,2,1,0,3,2],np.uint32)+base)
add_faces(side,0.15,0.45); add_faces(carriage,0.0,0.45); print('kerbs', time.time()-T0)
pickle.dump(dict(chunks=chunks,G=(E0,E1,N0,N1,G),D=D,Df=Df,U0=U0,water=water),open('built1.pkl','wb'))
print('done', time.time()-T0, 'chunks', len(chunks))
