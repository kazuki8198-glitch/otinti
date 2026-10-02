# The context the page uses to choose each PLATEAU building's type and its street side (PLATEAU's 2024 Yokohama tiles
# have no use or storeys, only the height): OSM's building outlines with their tags, shop / amenity / office points,
# landuse areas, road centrelines. -> models/area/ctx.bin (CTX1: 'CTX1', header length, JSON header, buffers)
# Positions: east/north from the Kannai spot in units of 0.5 m (int16). Usage: python3 ctx.py osm_bldg.json osm_ways.json out
import sys, json, struct, numpy as np
sys.path.insert(0, '../area_a'); import geo
B = json.load(open(sys.argv[1]))['elements']; W = json.load(open(sys.argv[2]))['elements']; out = sys.argv[3]
BT = {'house': 1, 'detached': 1, 'semidetached_house': 1, 'bungalow': 1, 'apartments': 2, 'residential': 2, 'dormitory': 2, 'terrace': 2,
      'office': 3, 'commercial': 3, 'hotel': 3, 'retail': 4, 'supermarket': 4, 'kiosk': 4, 'industrial': 5, 'warehouse': 5, 'factory': 5,
      'manufacture': 5, 'storage_tank': 5, 'school': 6, 'university': 6, 'public': 6, 'hospital': 6, 'college': 6, 'government': 6, 'civic': 6,
      'train_station': 6, 'shrine': 7, 'temple': 7, 'church': 7, 'roof': 8, 'garage': 9, 'shed': 9, 'parking': 9}
FOOD = {'restaurant', 'cafe', 'fast_food', 'bar', 'pub', 'izakaya', 'food_court', 'ice_cream'}
def P(geom): a = np.array([[q['lat'], q['lon']] for q in geom]); return geo.enu(a[:, 0], a[:, 1], np.zeros(len(a)) + 40)[:, :2]
def q(p): return np.clip(np.round(p * 2), -32767, 32767).astype(np.int16)
bp, bn, bt, bl = [], [], [], []; pts = []; lp, ln, lt = [], [], []
LU = {'residential': 1, 'commercial': 2, 'retail': 2, 'industrial': 3}
for e in B:
    t = e.get('tags', {})
    if e['type'] == 'way' and 'building' in t and e.get('geometry'):
        p = P(e['geometry'])
        try: lv = int(float(str(t.get('building:levels', '0')).split(';')[0]))
        except Exception: lv = 0
        bp.append(q(p)); bn.append(len(p)); bt.append(BT.get(t['building'], 0)); bl.append(min(lv, 255))
    if e['type'] == 'node' and any(k in t for k in ('shop', 'amenity', 'office', 'craft')):
        a = t.get('amenity'); c = 1 if 'shop' in t else 2 if a in FOOD else 4 if 'office' in t else 5 if 'craft' in t else 3
        if a in ('parking', 'bicycle_parking', 'vending_machine', 'bench', 'waste_basket', 'toilets', 'post_box', 'telephone', 'parking_entrance', 'motorcycle_parking', 'drinking_water'): continue
        pts.append((*geo.enu(np.array([e['lat']]), np.array([e['lon']]), np.array([40.0]))[0, :2], c))
    if e['type'] == 'way' and t.get('landuse') in LU and e.get('geometry'):
        p = P(e['geometry']); lp.append(q(p)); ln.append(len(p)); lt.append(LU[t['landuse']])
RC = {'trunk': 1, 'primary': 1, 'secondary': 2, 'tertiary': 3, 'unclassified': 4, 'residential': 4, 'living_street': 5, 'service': 6, 'pedestrian': 5,
      'trunk_link': 1, 'primary_link': 1, 'secondary_link': 2, 'tertiary_link': 3}
rp, rn, rc, rw = [], [], [], []
for e in W:
    t = e.get('tags', {})
    if e['type'] != 'way' or t.get('highway') not in RC or not e.get('geometry') or t.get('bridge') or t.get('tunnel'): continue
    p = P(e['geometry']); c = RC[t['highway']]
    try: lanes = int(t.get('lanes', 0))
    except Exception: lanes = 0
    w = lanes * 3.25 + 2 if lanes else {1: 14, 2: 11, 3: 8, 4: 5, 5: 4, 6: 4}[c]
    rp.append(q(p)); rn.append(len(p)); rc.append(c); rw.append(min(int(w * 2), 255))
bufs = []; off = [0]
def add(a):
    b = np.ascontiguousarray(a).tobytes(); pad = (-len(b)) % 4; bufs.append(b + b'\0' * pad); o = off[0]; off[0] += len(b) + pad; return [o, len(b)]
pa = np.array(pts, np.float32) if pts else np.zeros((0, 3), np.float32)
H = {'v': 1, 'unit': 0.5, 'bldg': {'p': add(np.concatenate(bp)), 'n': add(np.array(bn, np.uint32)), 't': add(np.array(bt, np.uint8)), 'l': add(np.array(bl, np.uint8))},
     'poi': {'p': add(q(pa[:, :2])), 'c': add(pa[:, 2].astype(np.uint8))},
     'land': {'p': add(np.concatenate(lp) if lp else np.zeros((0, 2), np.int16)), 'n': add(np.array(ln, np.uint32)), 't': add(np.array(lt, np.uint8))},
     'road': {'p': add(np.concatenate(rp)), 'n': add(np.array(rn, np.uint32)), 'c': add(np.array(rc, np.uint8)), 'w': add(np.array(rw, np.uint8))},
     'codes': {'bldg': BT, 'poi': {'shop': 1, 'food': 2, 'amenity': 3, 'office': 4, 'craft': 5}, 'land': LU, 'road': RC}, 'source': 'OpenStreetMap contributors (ODbL)'}
hj = json.dumps(H).encode(); hj += b' ' * ((-len(hj)) % 4)
with open(out, 'wb') as f: f.write(b'CTX1'); f.write(struct.pack('<I', len(hj))); f.write(hj); [f.write(b) for b in bufs]
import os; print('buildings', len(bn), 'tagged', sum(1 for x in bt if x), 'pois', len(pts), 'landuse', len(ln), 'roads', len(rn), 'size KB', os.path.getsize(out) // 1024)
