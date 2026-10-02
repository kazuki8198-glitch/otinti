import pickle, time
from shapely.ops import unary_union
U=pickle.load(open('U.pkl','rb')); F3=pickle.load(open('F3.pkl','rb'))
t=time.time()
U=U.buffer(0)
wide=U.buffer(-6.0,quad_segs=6).buffer(6.0,quad_segs=6).intersection(U)
narrow=U.difference(wide).buffer(-0.05).buffer(0.05)
carr_w=wide.buffer(-3.25,quad_segs=6)
carriage=unary_union([carr_w,narrow]).difference(F3)
side=U.difference(carriage.buffer(0.01)).difference(F3).buffer(-0.02).buffer(0.02)
print('t',time.time()-t,'wide',wide.area/1e6,'narrow',narrow.area/1e6,'carriage',carriage.area/1e6,'sidewalk',side.area/1e6)
pickle.dump((carriage,side,wide,narrow),open('CS.pkl','wb'))
