# Checks on models/area/area_a.bin (ARA2) that catch the problems seen before. Run: python3 test_area.py [path]
#  1. paint sits on its road: on ground roads within 1-6 cm above the triangle under it; on decks within 1-5 cm
#  2. no road surface dips into a pit: on the flat core (east of x = -1300: Kannai, Sakuragicho, MM, the bay) under 2 % of the
#     ground-road area is steeper than 25 %; the hills to the west (Nishi-ku, Noge-yama, Tobe) are only reported, their streets are steep
#  3. stacked roads stay apart: a deck is never within 2.5 m over a ground road (the car would hit its underside), away
#     from the deck's ends (within 30 m of them it meets the ground: counted apart);
#     2.5-4.5 m (low riverside roads under bridges, or ramp ends) is reported
#  4. decks climb no more than 16 % anywhere (expressway mainline: see ways)
#  5. every chunk's data reads and is the size its header says
import sys, json, struct, numpy as np, collections
path = sys.argv[1] if len(sys.argv) > 1 else '../../models/area/area_a.bin'
b = open(path, 'rb').read(); assert b[:4] in (b'ARA1', b'ARA2'), 'not an area file'
hl = struct.unpack('<I', b[4:8])[0]; H = json.loads(b[8:8 + hl]); base = 8 + hl
def arr(t, r): return np.frombuffer(b[base + r[0]:base + r[0] + r[1]], t)
fails = collections.Counter(); notes = []
def check(ok, what, n=1):
    if not ok: fails[what] += n
tri_g = []; tri_d = []; paint = []
for c in H['chunks']:
    o = np.array(c['o'])
    for part in c.get('carr', []):
        P = arr(np.int16, part['v']).reshape(-1, 3) * 0.01 + o; I = arr(np.uint16, part['i']).reshape(-1, 3)
        check(len(I) == 0 or I.max() < len(P), 'index out of range'); tri_g.append(P[I])
    if 'deck' in c: tri_d.append((arr(np.int16, c['deck']).reshape(-1, 3, 3) * 0.01 + o))
    if 'paint' in c:
        P = arr(np.int16, c['paint']['p']).reshape(-1, 3) * 0.01 + o; paint.append(P)
TG = np.concatenate(tri_g); TD = np.concatenate(tri_d) if tri_d else np.zeros((0, 3, 3)); PP = np.concatenate(paint)
print('ground triangles', len(TG), 'deck triangles', len(TD), 'paint points', len(PP))
# a 2D grid index of triangles
def index(T, cell=8.0):
    idx = collections.defaultdict(list)
    mn = np.floor(T[:, :, :2].min(1) / cell).astype(int); mx = np.floor(T[:, :, :2].max(1) / cell).astype(int)
    for t in range(len(T)):
        for i in range(mn[t, 0], mx[t, 0] + 1):
            for j in range(mn[t, 1], mx[t, 1] + 1): idx[(i, j)].append(t)
    return idx
def heights_at(T, idx, p, cell=8.0):
    out = []
    for t in idx.get((int(np.floor(p[0] / cell)), int(np.floor(p[1] / cell))), ()):
        a, bb, cc = T[t]; v0 = bb[:2] - a[:2]; v1 = cc[:2] - a[:2]; v2 = p[:2] - a[:2]
        d = v0[0] * v1[1] - v0[1] * v1[0]
        if abs(d) < 1e-9: continue
        u = (v2[0] * v1[1] - v2[1] * v1[0]) / d; v = (v0[0] * v2[1] - v0[1] * v2[0]) / d
        if u >= -1e-6 and v >= -1e-6 and u + v <= 1 + 1e-6: out.append(a[2] + u * (bb[2] - a[2]) + v * (cc[2] - a[2]))
    return out
IG = index(TG); ID = index(TD) if len(TD) else {}
rng = np.random.default_rng(1); sample = PP[rng.choice(len(PP), min(6000, len(PP)), replace=False)]
off = []; unsupported = 0
for p in sample:
    hs = heights_at(TG, IG, p) + (heights_at(TD, ID, p) if len(TD) else [])
    if not hs: unsupported += 1; continue
    d = min(hs, key=lambda h: abs(p[2] - h)); off.append(p[2] - d)
off = np.array(off)
print(f'1. paint above its road: median {np.median(off) * 100:.1f} cm, 1-99% {np.percentile(off, 1) * 100:.1f}..{np.percentile(off, 99) * 100:.1f} cm; {unsupported} of {len(sample)} paint points off any road surface')
check(np.mean((off > -0.01) & (off < 0.08)) > 0.97, 'paint off its road (>3 % of samples outside -1..8 cm)')
n = np.cross(TG[:, 1] - TG[:, 0], TG[:, 2] - TG[:, 0]); slope = np.hypot(n[:, 0], n[:, 1]) / np.maximum(np.abs(n[:, 2]), 1e-9)
area = 0.5 * np.abs(n[:, 2]); core = TG.mean(1)[:, 0] > -1300; steep = (slope > 0.25) & (np.abs(n[:, 2]) > 1e-3)
fc = area[core & steep].sum() / area[core].sum(); fh = area[~core & steep].sum() / max(area[~core].sum(), 1)
print(f'2. ground-road area steeper than 25 %: core {fc * 100:.2f} %, western hills {fh * 100:.2f} % ({np.sum(steep)} of {len(TG)} triangles)')
check(fc < 0.02, 'steep ground roads on the flat core (pits or humps)')
if len(TD):
    cen = TD.mean(1); close = 0; low = 0; stacked = 0; atend = 0
    ends = np.array(H.get('deckEnds', [[1e9, 1e9]]))
    for p in cen[::7]:
        if np.min(np.hypot(ends[:, 0] - p[0], ends[:, 1] - p[1])) < 30:      # (a ramp's or bridge's end, where it meets the ground)
            atend += sum(1 for h in heights_at(TG, IG, p) if 0.5 < p[2] - h < 2.5); continue
        hs = heights_at(TG, IG, p)
        for h in hs:
            if p[2] - h > 0.5: stacked += 1
            if 0.5 < p[2] - h < 2.5: close += 1
            elif 2.5 <= p[2] - h < 4.5: low += 1
    print(f'3. deck triangles over a ground road: {stacked}; within 2.5 m: {close} (and {atend} within 30 m of a deck\'s end, where it meets the ground); 2.5-4.5 m: {low}')
    check(close <= max(3, stacked * 0.05), 'decks too close over ground roads')
    dn = np.cross(TD[:, 1] - TD[:, 0], TD[:, 2] - TD[:, 0]); ds = np.hypot(dn[:, 0], dn[:, 1]) / np.maximum(np.abs(dn[:, 2]), 1e-9)
    print(f'4. deck triangles steeper than 16 %: {np.sum(ds > 0.16)} of {len(TD)}'); check(np.sum(ds > 0.16) < len(TD) * 0.01, 'decks too steep')
# 6. furniture: nothing standing on a carriageway at its level, nor on a crossing (a road's own marks - manholes, drains,
#    arrows, patches - and the expressway's own pieces, on its decks, apart)
if 'furnKinds' in H:
    KN = {v: k for k, v in H['furnKinds'].items()}; ONROAD = {'manhole', 'drain', 'arrow', 'patch'}; DECK = {'hwlight', 'hwsign', 'etc', 'tlamp', 'booth'}
    RQ = []
    for c in H['chunks']:
        if 'rect' in c: RQ.append(arr(np.int16, c['rect']).reshape(-1, 4, 3) * 0.01 + np.array(c['o']))
    RQ = np.concatenate(RQ) if RQ else np.zeros((0, 4, 3)); RC = RQ.mean(1)
    rh = collections.defaultdict(list)
    for k_, p_ in enumerate(RC): rh[(int(p_[0] // 8), int(p_[1] // 8))].append(k_)
    def on_rect(p):
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for k_ in rh.get((int(p[0] // 8) + di, int(p[1] // 8) + dj), ()):
                    q = RQ[k_][:, :2]; inside = True
                    for i in range(4):
                        a_, b_ = q[i], q[(i + 1) % 4]; cr = (b_[0] - a_[0]) * (p[1] - a_[1]) - (b_[1] - a_[1]) * (p[0] - a_[0])
                        if i == 0: sgn = np.sign(cr)
                        elif np.sign(cr) != sgn and cr != 0: inside = False; break
                    if inside and abs(RQ[k_][:, 2].mean() - p[2]) < 1.0: return True
        return False
    bad_road = []; bad_x = []; n_st = 0
    for c in H['chunks']:
        if 'furn' not in c: continue
        o = np.array(c['o']); P = arr(np.int16, c['furn']['p']).reshape(-1, 3) * 0.01 + o; K = arr(np.uint8, c['furn']['k'])
        for p, k in zip(P, K):
            name = KN[int(k)]
            if name in ONROAD or name in DECK: continue
            n_st += 1
            if any(abs(h - p[2]) < 0.6 for h in heights_at(TG, IG, p)): bad_road.append((name, np.round(p, 1).tolist()))
            if on_rect(p): bad_x.append((name, np.round(p, 1).tolist()))
    print(f'6. standing furniture {n_st}: on a carriageway {len(bad_road)}, on a crossing {len(bad_x)}', bad_road[:5], bad_x[:5])
    check(len(bad_road) <= n_st * 0.002, 'furniture standing on a carriageway')
    check(len(bad_x) == 0, 'furniture on a crossing')
print('stats', H.get('stats'))
print('FAILED: ' + '; '.join(f'{k} ({v})' for k, v in fails.items()) if fails else 'all checks passed')
sys.exit(1 if fails else 0)
