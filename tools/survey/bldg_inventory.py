# For sample points, fetch the leaf building tile of each PLATEAU dataset and record per building: textured or not,
# the texture image's real size, UV presence; then match the same building (gml_id) across datasets.
import json, math, struct, subprocess, sys, os, collections, io
import numpy as np, DracoPy
from PIL import Image
CACHE = os.environ.get('CACHE', '/tmp/bldg_cache'); os.makedirs(CACHE, exist_ok=True)
def get(u):
    p = os.path.join(CACHE, u.replace('https://', '').replace('/', '_'))
    if not os.path.exists(p):
        subprocess.run(['curl', '-sS', '--max-time', '120', '-o', p, u], check=False)
    return open(p, 'rb').read()
def leaf(url, lat, lon):
    t = json.loads(get(url)); base = url.rsplit('/', 1)[0] + '/'; la, lo = math.radians(lat), math.radians(lon); out = []
    def w(n):
        r = n['boundingVolume'].get('region')
        if r and not (r[0] <= lo <= r[2] and r[1] <= la <= r[3]): return
        if not n.get('children') and 'content' in n: out.append(base + n['content']['uri'])
        for c in n.get('children', []): w(c)
    w(t['root']); return out
def col(bt, key, k):
    v = bt.get(key)
    return v[k] if isinstance(v, list) and k < len(v) else None
def analyse(u):
    b = get(u)
    if b[:4] != b'b3dm': return None
    _, _, _, ftj, ftb, btj, btb = struct.unpack('<4sIIIIII', b[:28])
    o = 28 + ftj + ftb; bt = json.loads(b[o:o + btj].decode('utf8').rstrip(' \x00')) if btj else {}; o += btj + btb
    glb = b[o:]; jl = struct.unpack('<I', glb[12:16])[0]; gj = json.loads(glb[20:20 + jl]); bo = 20 + jl
    bl = struct.unpack('<I', glb[bo:bo + 4])[0]; binc = glb[bo + 8:bo + 8 + bl]
    imgsize = {}
    for i, im in enumerate(gj.get('images', [])):
        bv = gj['bufferViews'][im['bufferView']]; data = binc[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']]
        try: imgsize[i] = Image.open(io.BytesIO(data)).size
        except Exception as e: imgsize[i] = ('undecodable', str(e)[:40])
    tex_of_mat = {}
    for mi, m in enumerate(gj.get('materials', [])):
        t = m.get('pbrMetallicRoughness', {}).get('baseColorTexture')
        if t is not None:
            src = gj['textures'][t['index']].get('source')
            if src is None: src = gj['textures'][t['index']].get('extensions', {}).get('EXT_texture_webp', {}).get('source')
            tex_of_mat[mi] = src
    per = collections.defaultdict(lambda: {'tris': 0, 'tex': 0, 'uv': 0, 'img': set()})
    for m in gj['meshes']:
        for p in m['primitives']:
            ext = p.get('extensions', {}).get('KHR_draco_mesh_compression'); 
            if not ext: continue
            bv = gj['bufferViews'][ext['bufferView']]; dm = DracoPy.decode(binc[bv.get('byteOffset', 0):bv.get('byteOffset', 0) + bv['byteLength']])
            faces = np.array(dm.faces).reshape(-1, 3); bid = None
            for a in dm.attributes:
                if a.get('unique_id') == ext['attributes'].get('_BATCHID'): bid = np.array(a['data']).reshape(-1).astype(int)
            has_uv = 'TEXCOORD_0' in ext['attributes']; src = tex_of_mat.get(p.get('material'))
            if bid is None: continue
            fb = bid[faces[:, 0]]
            for k, c in zip(*np.unique(fb, return_counts=True)):
                d = per[int(k)]; d['tris'] += int(c)
                if src is not None and has_uv: d['tex'] += int(c); d['img'].add(src)
                if has_uv: d['uv'] += int(c)
    ids = bt.get('gml_id') or []
    res = {}
    for k, d in per.items():
        gid = ids[k] if k < len(ids) else str(k)
        res[gid] = {'tris': d['tris'], 'tex_frac': round(d['tex'] / max(d['tris'], 1), 2), 'uv_frac': round(d['uv'] / max(d['tris'], 1), 2),
                    'imgs': [imgsize.get(i) for i in sorted(d['img'])], 'usage': col(bt, 'bldg:usage', k)}
    return {'n_buildings': len(res), 'images': {str(k): v for k, v in imgsize.items()}, 'buildings': res, 'bytes': len(b)}
if __name__ == '__main__':
    cfg = json.load(open(sys.argv[1])); out = {}
    for name, (lat, lon) in cfg['points'].items():
        out[name] = {}
        for ds, url in cfg['datasets'].items():
            L = leaf(url, lat, lon)
            out[name][ds] = [{'url': u, **(analyse(u) or {'error': 'not b3dm'})} for u in L[:1]]
        print(name, {ds: (v[0]['n_buildings'] if v and 'n_buildings' in v[0] else None) for ds, v in out[name].items()}, flush=True)
    json.dump(out, open(sys.argv[2], 'w'), ensure_ascii=False, default=list)
