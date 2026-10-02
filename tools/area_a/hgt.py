import pickle, numpy as np, geo
GEOID=36.28; E0,E1,N0,N1,G=-2700.,1000.,-1000.,3050.,5.0
ge=np.arange(E0,E1+G/2,G); gn=np.arange(N0,N1+G/2,G); EE,NN=np.meshgrid(ge,gn)
P=geo.O+EE[...,None]*geo.Ev+NN[...,None]*geo.Nv; lat,lon,_=geo.geodetic(P)
D=geo.dem(lat,lon); water=np.isnan(D)
exec(open('build.py').read().split('def fill(a):')[1].join(['def fill(a):','']).split('Df=fill(D)')[0]) if False else None
src=open('build.py').read(); i=src.index('def fill(a):'); j=src.index('Df=fill(D)'); exec(src[i:j])
Df=fill(D); Pe=geo.ecef(lat,lon,np.zeros_like(lat)); U0=np.einsum('ijk,k->ij',Pe-geo.O,geo.Uv)
pickle.dump(dict(G=(E0,E1,N0,N1,G),D=D,Df=Df,U0=U0,water=water),open('hgt.pkl','wb')); print('ok',D.shape)
