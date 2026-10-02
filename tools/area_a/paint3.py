# area A, part 2: paint from OSM centrelines measured against the carriageway; zebra crossings and stop lines at OSM
# crossings; street trees from OSM; the ground grid; everything packed into area_a.bin
import pickle, json, math, struct, numpy as np, time, geo, collections
from PIL import Image, ImageDraw
T0=time.time()
B=pickle.load(open('hgt.pkl','rb')); E0,E1,N0,N1,G=B['G']; Df=B['Df']; U0=B['U0']; water=B['water']
LINES=[]; RECTS=[]
carriage,side,wide,narrow=pickle.load(open('CS.pkl','rb'))
GEOID=36.28; CH=400.0
def hgrid(e,n,arr):
    fi=np.clip((np.asarray(e,float)-E0)/G,0,arr.shape[1]-1.001); fj=np.clip((np.asarray(n,float)-N0)/G,0,arr.shape[0]-1.001)
    i=np.floor(fi).astype(int); j=np.floor(fj).astype(int); u=fi-i; v=fj-j
    return (arr[j,i]*(1-u)+arr[j,i+1]*u)*(1-v)+(arr[j+1,i]*(1-u)+arr[j+1,i+1]*u)*v
def roadh(e,n): return hgrid(e,n,U0)+hgrid(e,n,Df)+GEOID
def chunk(e,n): return (int(math.floor((e-E0)/CH)),int(math.floor((n-N0)/CH)))
def C(k):
    if k not in chunks: chunks[k]={'carr':([],[]),'side':([],[]),'kerb':([],[]),'paint':([],[],[])}
    if len(chunks[k]['paint'])<3: chunks[k]['paint']=([],[],[])
    return chunks[k]
# ---- the carriageway as a 0.5 m raster, for measuring across the road ----
R=0.5; W_=int((E1-E0)/R)+1; H_=int((N1-N0)/R)+1
im=Image.new('1',(W_,H_),0); dr=ImageDraw.Draw(im)
def geoms(g):
    if g.is_empty: return []
    if g.geom_type=='Polygon': return [g]
    return [x for h in getattr(g,'geoms',[]) for x in geoms(h)]
tp=lambda c:[((x-E0)/R,(N1-y)/R) for x,y in c]
for p in geoms(carriage):
    dr.polygon(tp(p.exterior.coords),fill=1)
    for h in p.interiors: dr.polygon(tp(h.coords),fill=0)
M=np.asarray(im,dtype=bool); print('raster', M.shape, time.time()-T0)
def inside(e,n):
    i=np.round((np.asarray(e)-E0)/R).astype(int); j=np.round((N1-np.asarray(n))/R).astype(int)
    ok=(i>=0)&(j>=0)&(i<W_)&(j<H_); out=np.zeros(np.shape(i),bool); out[ok]=M[j[ok],i[ok]]; return out
def reach(e,n,dx,dy,maxd=30.0,step=0.25):
    # distance from (e,n) along (dx,dy) to the carriageway's edge (vectorised over points)
    d=np.zeros(len(e)); alive=inside(e,n); dist=np.zeros(len(e))
    for k in range(1,int(maxd/step)+1):
        s=k*step; inn=inside(e+dx*s,n+dy*s); newly=alive&~inn; dist[newly]=s-step/2; alive&=inn
        if not alive.any(): break
    dist[alive]=maxd; return dist
# ---- OSM ----
W=json.load(open('osm_ways.json'))['elements']; Nd=json.load(open('osm_nodes.json'))['elements']
DRIVE={'trunk','primary','secondary','tertiary','unclassified','residential','trunk_link','primary_link','secondary_link','tertiary_link'}
MAJOR={'trunk','primary','secondary','tertiary','trunk_link','primary_link','secondary_link','tertiary_link'}
ways=[]; nodeuse=collections.Counter(); npos={}
for w in W:
    t=w['tags']; hw=t.get('highway')
    if hw not in DRIVE or t.get('tunnel') in ('yes','building_passage') or t.get('layer','0').startswith('-') or t.get('area')=='yes': continue
    g=w.get('geometry'); ids=w.get('nodes')
    if not g or not ids: continue
    a=np.array([[q['lat'],q['lon']] for q in g]); p=geo.enu(a[:,0],a[:,1],np.zeros(len(a))+40)[:,:2]
    for i,(nid,pt) in enumerate(zip(ids,p)): nodeuse[nid]+=1; npos[nid]=pt
    ways.append((w,p,ids))
junction={nid for nid,c in nodeuse.items() if c>=2}
print('drivable ways',len(ways),'junction nodes',len(junction))
crossings=[]; signals=[]
for nd in Nd:
    if nd['type']!='node': continue
    t=nd.get('tags',{})
    if t.get('highway')=='traffic_signals': signals.append(nd)
    if t.get('highway')=='crossing' or 'crossing' in t:
        if t.get('crossing') in ('unmarked','no','informal'): continue
        crossings.append(nd)
sig_ids={nd['id'] for nd in signals}; cross_ids={nd['id']:nd for nd in crossings}
sig_pos=geo.enu(np.array([s['lat'] for s in signals]),np.array([s['lon'] for s in signals]),np.zeros(len(signals))+40)[:,:2] if signals else np.zeros((0,2))
# ---- paint pieces ----
LIFT=0.03
def put_strip(pts,dash,width=0.15):
    if len(pts)>=2: LINES.append((np.asarray(pts,float)[::2] if len(pts)>6 else np.asarray(pts,float), dash is not None))
def put_rect(c,u,v):
    RECTS.append(np.array([c,c+u,c+u+v,c+v],float))
# ---- lines along each road ----
nlines=0
for w,p,ids in ways:
    t=w['tags']; hw=t.get('highway'); major=hw in MAJOR
    # resample every 1 m
    seg=np.hypot(*np.diff(p,axis=0).T); L=np.concatenate([[0],np.cumsum(seg)])
    if L[-1]<8: continue
    s=np.arange(0,L[-1],1.0); x=np.interp(s,L,p[:,0]); y=np.interp(s,L,p[:,1])
    tx=np.gradient(x); ty=np.gradient(y); tl=np.hypot(tx,ty)+1e-9; tx/=tl; ty/=tl
    lx,ly=-ty,tx                          # (left of the way's direction)
    dl=reach(x,y,lx,ly); dr_=reach(x,y,-lx,-ly)
    ins=inside(x,y)
    wtot=dl+dr_
    med=np.median(wtot[ins]) if ins.any() else 0
    if med<5.5: continue
    # near a junction (the road widens there): no lines
    jd=np.full(len(s),1e9)
    for nid in ids:
        if nid in junction:
            q=npos[nid]; jd=np.minimum(jd,np.hypot(x-q[0],y-q[1]))
    ok=ins&(wtot<med*1.35+1.5)&(jd>0.5*med+4)&(dl>0.3)&(dr_>0.3)
    oneway=t.get('oneway') in ('yes','1','true','-1') or t.get('junction')=='roundabout'
    try: lanes=int(str(t.get('lanes','')).split(';')[0])
    except Exception: lanes=0
    if lanes<=0: lanes=max(1 if oneway else 2,int(round(med/3.3)))
    if not oneway and lanes%2==1 and lanes>1 and not ('lanes:forward' in t): lanes=lanes  # (odd: one side gets the extra lane)
    nf=lanes if oneway else int(t.get('lanes:forward',lanes//2 if lanes>1 else 1)); nb=0 if oneway else max(1,lanes-nf)
    lw=wtot/max(lanes,1)
    offs=[]   # (offset from the left edge in lanes, kind)
    if oneway:
        offs+=[(k,'dash') for k in range(1,lanes)]
    else:
        offs+=[(k,'dash') for k in range(1,nf)]; offs.append((nf,'centre')); offs+=[(nf+k,'dash') for k in range(1,nb)]
    def runs(mask):
        i=0; n=len(mask)
        while i<n:
            if not mask[i]: i+=1; continue
            j=i
            while j<n and mask[j]: j+=1
            if j-i>=3: yield i,j
            i=j
    for i,j in runs(ok):
        for k,kind in offs:
            o=dl[i:j]-k*lw[i:j]
            pts=np.column_stack([x[i:j]+lx[i:j]*o,y[i:j]+ly[i:j]*o])
            if kind=='centre':
                if wtot[i:j].mean()>=11: # a wide road: the double line either side of the middle
                    for d2 in (0.12,-0.12): put_strip(np.column_stack([pts[:,0]+lx[i:j]*d2,pts[:,1]+ly[i:j]*d2]),None)
                else: put_strip(pts,None)
            else: put_strip(pts,s[i:j])
            nlines+=1
        if major and med>=7:   # edge lines, 0.4 m in from each edge
            for side_ in (1,-1):
                o=(dl[i:j]-0.4) if side_==1 else -(dr_[i:j]-0.4)
                put_strip(np.column_stack([x[i:j]+lx[i:j]*o,y[i:j]+ly[i:j]*o]),None); nlines+=1
print('lines',nlines, time.time()-T0)
# ---- crossings ----
ncross=nstop=0
for w,p,ids in ways:
    t=w['tags']; oneway=t.get('oneway') in ('yes','1','true')
    for k,nid in enumerate(ids):
        if nid not in cross_ids: continue
        q=npos[nid]; a=p[max(0,k-1)]; b=p[min(len(p)-1,k+1)]; d=b-a; l=np.hypot(*d)
        if l<1e-3: continue
        tx,ty=d/l; lx,ly=-ty,tx
        dl=reach(np.array([q[0]]),np.array([q[1]]),lx,ly)[0]; dr_=reach(np.array([q[0]]),np.array([q[1]]),-lx,-ly)[0]
        wt=dl+dr_
        if wt<5.5 or wt>45 or not inside(np.array([q[0]]),np.array([q[1]]))[0]: continue
        cnt=int((wt-1.0)//0.9); o0=-dr_+(wt-(cnt*0.9-0.45))/2
        T=np.array([tx,ty]); Lv=np.array([lx,ly]); Q=np.array(q)
        for i in range(cnt):
            o=o0+i*0.9
            put_rect(Q+Lv*o-T*2.0,Lv*0.45,T*4.0)
        ncross+=1
        sig=cross_ids[nid].get('tags',{}).get('crossing')=='traffic_signals' or (len(sig_pos) and np.min(np.hypot(*(sig_pos-Q).T))<30)
        if not sig: continue
        if oneway:
            put_rect(Q-T*4.45+Lv*(-dr_+0.3),Lv*(wt-0.6),T*0.45); nstop+=1
        else:
            mid=dl-wt/2   # (the middle, as an offset from the way)
            put_rect(Q-T*4.45+Lv*mid,Lv*(dl-0.3-mid),T*0.45)       # (coming along the way: keep left)
            put_rect(Q+T*4.0+Lv*(-dr_+0.3),Lv*(mid+dr_-0.3),T*0.45)  # (coming the other way)
            nstop+=2
print('crossings',ncross,'stop lines',nstop, time.time()-T0)
# ---- trees ----
trees=[]
VEG3=(35.4424,35.4505,139.6329,139.6431)
for nd in Nd:
    t=nd.get('tags',{})
    if nd['type']=='node' and t.get('natural')=='tree':
        if VEG3[0]<=nd['lat']<=VEG3[1] and VEG3[2]<=nd['lon']<=VEG3[3]: continue
        try: h=float(str(t.get('height','')).replace('m','').strip())
        except Exception: h=0
        trees.append((nd['lat'],nd['lon'],h))
    if nd['type']=='way' and t.get('natural')=='tree_row' and nd.get('geometry'):
        a=np.array([[q['lat'],q['lon']] for q in nd['geometry']]); pp=geo.enu(a[:,0],a[:,1],np.zeros(len(a))+40)[:,:2]
        seg=np.hypot(*np.diff(pp,axis=0).T); L=np.concatenate([[0],np.cumsum(seg)])
        for s_ in np.arange(4,L[-1],9.0):
            e_=np.interp(s_,L,pp[:,0]); n_=np.interp(s_,L,pp[:,1]); lat0,lon0,_=geo.geodetic(geo.O+e_*geo.Ev+n_*geo.Nv)
            if VEG3[0]<=lat0<=VEG3[1] and VEG3[2]<=lon0<=VEG3[3]: continue
            trees.append((float(lat0),float(lon0),0))
ta=np.array(trees); tp_=geo.enu(ta[:,0],ta[:,1],np.zeros(len(ta))+40)[:,:2]
keep=~inside(tp_[:,0],tp_[:,1])&(tp_[:,0]>E0)&(tp_[:,0]<E1)&(tp_[:,1]>N0)&(tp_[:,1]<N1)
tp_=tp_[keep]; th=ta[keep,2]
rng=np.random.default_rng(7); th=np.where(th>2,th,rng.uniform(6.5,11.5,len(th)))
from shapely.geometry import Point
from shapely.prepared import prep
ps=prep(side.buffer(0.5))
onside=np.array([ps.contains(Point(x,y)) for x,y in tp_])
tu=roadh(tp_[:,0],tp_[:,1])+np.where(onside,0.15,-0.2)
TREES=np.column_stack([tp_,tu,th]).astype(np.float32)
print('trees',len(TREES),'on pavements',onside.sum(), time.time()-T0)
pickle.dump(dict(LINES=LINES,RECTS=RECTS,TREES=TREES),open('paint.pkl','wb'))
print('saved paint', len(LINES), len(RECTS))
