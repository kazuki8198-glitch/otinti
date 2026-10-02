import math, numpy as np, glob, os
from PIL import Image
A=6378137.0; F=1/298.257223563; E2=F*(2-F)
SPOT=(35.446899,139.641167,39.3)
def ecef(lat,lon,h):
    la,lo=np.radians(lat),np.radians(lon); n=A/np.sqrt(1-E2*np.sin(la)**2)
    return np.stack([(n+h)*np.cos(la)*np.cos(lo),(n+h)*np.cos(la)*np.sin(lo),(n*(1-E2)+h)*np.sin(la)],-1)
la0,lo0=math.radians(SPOT[0]),math.radians(SPOT[1])
O=ecef(SPOT[0],SPOT[1],SPOT[2])
Ev=np.array([-math.sin(lo0),math.cos(lo0),0]); Nv=np.array([-math.sin(la0)*math.cos(lo0),-math.sin(la0)*math.sin(lo0),math.cos(la0)]); Uv=np.array([math.cos(la0)*math.cos(lo0),math.cos(la0)*math.sin(lo0),math.sin(la0)])
def enu(lat,lon,h):
    p=ecef(np.asarray(lat,float),np.asarray(lon,float),np.asarray(h,float))-O
    return np.stack([p@Ev,p@Nv,p@Uv],-1)
def geodetic(p):  # ecef -> lat lon h
    x,y,z=p[...,0],p[...,1],p[...,2]; lon=np.arctan2(y,x); r=np.hypot(x,y); lat=np.arctan2(z,r*(1-E2))
    for _ in range(5):
        n=A/np.sqrt(1-E2*np.sin(lat)**2); h=r/np.cos(lat)-n; lat=np.arctan2(z,r*(1-E2*n/(n+h)))
    return np.degrees(lat),np.degrees(lon),h
# DEM 5 m z15 mosaic
Z=15
def _load():
    fs=glob.glob(os.path.join(os.path.dirname(__file__),'dem/15_*.png')); xs=sorted({int(f.split('_')[-2]) for f in fs}); ys=sorted({int(f.split('_')[-1][:-4]) for f in fs})
    M=np.full((len(ys)*256,len(xs)*256),np.nan)
    for f in fs:
        if os.path.getsize(f)==0: continue   # (no tile: the sea)
        x=int(f.split('_')[-2]); y=int(f.split('_')[-1][:-4]); a=np.asarray(Image.open(f).convert('RGB')).astype(np.int64)
        v=a[...,0]*65536+a[...,1]*256+a[...,2]; h=np.where(v<2**23,v*0.01,(v-2**24)*0.01); h=np.where(v==2**23,np.nan,h)
        M[(y-ys[0])*256:(y-ys[0]+1)*256,(x-xs[0])*256:(x-xs[0]+1)*256]=h
    return M,xs[0],ys[0]
DEM=DX0=DY0=None
def _ensure():
    global DEM,DX0,DY0
    if DEM is None: DEM,DX0,DY0=_load()
def dem(lat,lon):
    _ensure(); lat=np.asarray(lat,float); lon=np.asarray(lon,float); n=2**Z
    px=((lon+180)/360*n-DX0)*256-0.5; py=((1-np.arcsinh(np.tan(np.radians(lat)))/np.pi)/2*n-DY0)*256-0.5
    i=np.clip(np.floor(px).astype(int),0,DEM.shape[1]-2); j=np.clip(np.floor(py).astype(int),0,DEM.shape[0]-2); u=px-i; v=py-j
    a,b,c,d=DEM[j,i],DEM[j,i+1],DEM[j+1,i],DEM[j+1,i+1]
    return (a*(1-u)+b*u)*(1-v)+(c*(1-u)+d*u)*v
