# area A, compact: surfaces (simplified, 24 m cells, triangulated), kerb and edge faces as polylines, paint as polylines and
# rectangles, trees, ground grid; positions in cm from each 400 m chunk's middle (Int16), indices Uint16
import pickle, json, math, struct, numpy as np, time, os, geo, mapbox_earcut as earcut
from shapely.geometry import box, Point, LineString
from shapely.prepared import prep
from shapely.ops import unary_union
T0=time.time()
H=pickle.load(open('hgt.pkl','rb')); E0,E1,N0,N1,G=H['G']; Df=H['Df']; U0=H['U0']; water=H['water']
PA=pickle.load(open('paint.pkl','rb'))
carriage,side,wide,narrow=pickle.load(open('CS.pkl','rb'))
GEOID=36.28; CH=400.0
carriage=carriage.simplify(0.12).buffer(0); side=side.simplify(0.12).buffer(0)
print('simplified', time.time()-T0)
def hgrid(e,n,arr):
    fi=np.clip((np.asarray(e,float)-E0)/G,0,arr.shape[1]-1.001); fj=np.clip((np.asarray(n,float)-N0)/G,0,arr.shape[0]-1.001)
    i=np.floor(fi).astype(int); j=np.floor(fj).astype(int); u=fi-i; v=fj-j
    return (arr[j,i]*(1-u)+arr[j,i+1]*u)*(1-v)+(arr[j+1,i]*(1-u)+arr[j+1,i+1]*u)*v
def roadh(e,n): return hgrid(e,n,U0)+hgrid(e,n,Df)+GEOID
def ck(e,n): return (int(math.floor((e-E0)/CH)),int(math.floor((n-N0)/CH)))
chunks={}
def C(k):
    if k not in chunks: chunks[k]={'carr':[],'side':[],'kerb':[],'paint':[],'rect':[]}
    return chunks[k]
def geoms(g):
    if g.is_empty: return []
    if g.geom_type=='Polygon': return [g]
    return [x for h in getattr(g,'geoms',[]) for x in geoms(h)]
def densify(c,step):
    c=np.asarray(c)[:,:2]; out=[]
    for a,b in zip(c[:-1],c[1:]):
        k=max(1,int(math.ceil(np.hypot(*(b-a))/step)))
        for t in range(k): out.append(a+(b-a)*t/k)
    return np.array(out)
def surfaces(geom,layer,lift,cell=24.0):
    for poly in geoms(geom):
        x0,y0,x1,y1=poly.bounds; pp=prep(poly)
        for i in range(int(math.floor(x0/cell)),int(math.floor(x1/cell))+1):
            for j in range(int(math.floor(y0/cell)),int(math.floor(y1/cell))+1):
                b=box(i*cell,j*cell,(i+1)*cell,(j+1)*cell)
                if not pp.intersects(b): continue
                for q in geoms(poly.intersection(b) if not pp.contains(b) else b):
                    if q.area<0.05: continue
                    rings=[densify(q.exterior.coords,6.0)]+[densify(h.coords,6.0) for h in q.interiors]
                    rings=[r for r in rings if len(r)>=3]
                    if not rings: continue
                    V=np.concatenate(rings); ends=np.cumsum([len(r) for r in rings]).astype(np.uint32)
                    try: tri=np.asarray(earcut.triangulate_float64(V,ends),np.uint32)
                    except Exception: continue
                    if len(tri)==0: continue
                    cx,cy=q.representative_point().coords[0]
                    C(ck(cx,cy))[layer].append((np.column_stack([V,roadh(V[:,0],V[:,1])+lift]),tri))
surfaces(carriage,'carr',0.0); print('carr',time.time()-T0)
surfaces(side,'side',0.15); print('side',time.time()-T0)
# faces: pavement rings (all), carriageway edges that aren't against a pavement; ordered with the surface on the left
pside=prep(side); pcarr=prep(carriage)
def lines_of(g):
    if g.is_empty: return []
    if g.geom_type in ('LineString','LinearRing'): return [g]
    return [x for h in getattr(g,'geoms',[]) for x in lines_of(h)]
def faces(lines,surf,kind):
    n=0
    for ln in lines:
        c=densify(np.asarray(ln.coords),8.0); c=np.vstack([c,np.asarray(ln.coords)[-1:,:2]])
        if len(c)<2: continue
        # which side is the surface: a point 0.3 m to the left of the middle of the longest segment
        k=int(np.argmax(np.hypot(*np.diff(c,axis=0).T))); a,b=c[k],c[k+1]; d=(b-a)/max(np.hypot(*(b-a)),1e-9)
        if not surf.contains(Point(*(0.5*(a+b)+np.array([-d[1],d[0]])*0.3))): c=c[::-1]
        h=roadh(c[:,0],c[:,1])
        P=np.column_stack([c,h])
        # cut into chunks
        ks=[ck(*((P[i,:2]+P[i+1,:2])/2)) for i in range(len(P)-1)]
        s=0
        for i in range(1,len(ks)+1):
            if i==len(ks) or ks[i]!=ks[s]:
                C(ks[s])['kerb'].append((P[s:i+1],kind)); s=i; n+=1
    return n
side_lines=[l for p in geoms(side) for l in [p.exterior]+list(p.interiors)]
print('pavement faces',faces(side_lines,pside,0), time.time()-T0)
cb=unary_union([LineString(r.coords) for p in geoms(carriage) for r in [p.exterior]+list(p.interiors)])
cb=cb.difference(side.buffer(0.25))
print('carriage faces',faces(lines_of(cb),pcarr,1), time.time()-T0)
for pts,dash in PA['LINES']:
    P=np.column_stack([pts,roadh(pts[:,0],pts[:,1])+0.03])
    m=pts.mean(0); C(ck(*m))['paint'].append((P,dash))
for R in PA['RECTS']:
    C(ck(*R.mean(0)))['rect'].append(np.column_stack([R,roadh(R[:,0],R[:,1])+0.03]))
print('paint', time.time()-T0)
# ---- pack ----
bufs=[]; off=[0]
def addbuf(a):
    b=np.ascontiguousarray(a).tobytes(); pad=(-len(b))%4; bufs.append(b+b'\0'*pad); o=off[0]; off[0]+=len(b)+pad; return [o,len(b)]
GU=np.where(water,U0+GEOID-3.0,U0+Df+GEOID-0.35)
head={'v':1,'geoid':GEOID,'chunk':CH,'e0':E0,'n0':N0,'grid':{'e0':E0,'n0':N0,'step':G,'nx':int(GU.shape[1]),'ny':int(GU.shape[0]),'b':addbuf(np.round(GU*100).astype(np.int16))},
      'water':float(np.median(U0)+GEOID),'trees':addbuf(PA['TREES'].astype(np.float32)),'chunks':[]}
def q(P,o): return np.round((np.asarray(P)-o)*100).astype(np.int16)
tot=collections=None
stats={'carr':0,'side':0,'kerbPts':0,'paintPts':0,'rects':0}
for (ci,cj),c in sorted(chunks.items()):
    o=np.array([E0+(ci+0.5)*CH,N0+(cj+0.5)*CH,0.0]); us=[p[0][:,2].mean() for L in ('carr','side') for p in c[L]]; o[2]=round(float(np.mean(us)) if us else 0.0,2)
    rec={'i':ci,'j':cj,'o':o.tolist()}
    for L in ('carr','side'):
        parts=[]; V=[]; I=[]; nv=0
        for P,tri in c[L]:
            if nv+len(P)>65535:
                parts.append({'v':addbuf(q(np.concatenate(V),o)),'i':addbuf(np.concatenate(I).astype(np.uint16))}); V=[]; I=[]; nv=0
            V.append(P); I.append(tri+nv); nv+=len(P); stats[L]+=len(tri)//3
        if V: parts.append({'v':addbuf(q(np.concatenate(V),o)),'i':addbuf(np.concatenate(I).astype(np.uint16))})
        if parts: rec[L]=parts
    for L,key in (('kerb','kerb'),('paint','paint')):
        if not c[L]: continue
        P=np.concatenate([p for p,_ in c[L]]); n=np.array([len(p) for p,_ in c[L]],np.uint32); k=np.array([int(f) for _,f in c[L]],np.uint8)
        rec[key]={'p':addbuf(q(P,o)),'n':addbuf(n),'k':addbuf(k)}; stats['kerbPts' if L=='kerb' else 'paintPts']+=len(P)
    if c['rect']:
        rec['rect']=addbuf(q(np.concatenate(c['rect']),o)); stats['rects']+=len(c['rect'])
    head['chunks'].append(rec)
hj=json.dumps(head).encode(); hj+=b' '*((-len(hj))%4)
with open('area_a.bin','wb') as f:
    f.write(b'ARA1'); f.write(struct.pack('<I',len(hj))); f.write(hj)
    for b in bufs: f.write(b)
print(stats,'size MB',os.path.getsize('area_a.bin')/1e6,'chunks',len(chunks), time.time()-T0)
