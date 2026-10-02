# roads ride over cuttings, pits and channels: the DEM closed (filled up to the rims of anything under 75 m across)
import pickle, numpy as np
from numpy.lib.stride_tricks import sliding_window_view as sw
def filt(a,k,f):
    p=k//2
    a=np.pad(a,((p,p),(0,0)),mode='edge'); a=f(sw(a,k,axis=0),axis=-1)
    a=np.pad(a,((0,0),(p,p)),mode='edge'); return f(sw(a,k,axis=1),axis=-1)
H=pickle.load(open('hgt.pkl','rb')); Df=H['Df']
Dc=filt(filt(Df,9,np.max),9,np.min); Dc=np.minimum(Dc,Df+10)   # (45 m: cuttings, channels, the rivers under the bridges; not the hills' valleys)
print('raised cells >1 m',(Dc-Df>1).sum(),'max raise',(Dc-Df).max(),Dc.shape==Df.shape)
H['Dc']=Dc; pickle.dump(H,open('hgt.pkl','wb'))
