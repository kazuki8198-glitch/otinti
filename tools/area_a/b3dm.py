# read a PLATEAU tran b3dm: positions (ECEF, with RTC), triangles, batch ids, batch table
import struct, json, numpy as np, DracoPy
def read(path):
    b = open(path, 'rb').read()
    magic, ver, blen, ftj, ftb, btj, btb = struct.unpack('<4sIIIIII', b[:28])
    o = 28
    ft = json.loads(b[o:o+ftj].decode('utf8').rstrip(' \x00')) if ftj else {}
    o += ftj + ftb
    bt = json.loads(b[o:o+btj].decode('utf8').rstrip(' \x00')) if btj else {}
    o += btj + btb
    glb = b[o:]
    jl = struct.unpack('<I', glb[12:16])[0]
    gj = json.loads(glb[20:20+jl])
    bin_off = 20 + jl
    bl = struct.unpack('<I', glb[bin_off:bin_off+4])[0]
    binc = glb[bin_off+8:bin_off+8+bl]
    rtc = gj.get('extensions', {}).get('CESIUM_RTC', {}).get('center', [0, 0, 0])
    out = []
    for mi, m in enumerate(gj['meshes']):
        for p in m['primitives']:
            ext = p.get('extensions', {}).get('KHR_draco_mesh_compression')
            if ext:
                bv = gj['bufferViews'][ext['bufferView']]
                data = binc[bv.get('byteOffset', 0): bv.get('byteOffset', 0) + bv['byteLength']]
                dm = DracoPy.decode(data)
                pos = np.array(dm.points, dtype=np.float64).reshape(-1, 3)
                faces = np.array(dm.faces, dtype=np.int64).reshape(-1, 3)
                bid = None
                aid = ext['attributes'].get('_BATCHID')
                for a in dm.attributes if hasattr(dm, 'attributes') else []:
                    if a.get('unique_id') == aid:
                        bid = np.array(a['data']).reshape(-1).astype(np.int64)
                out.append(dict(pos=pos, faces=faces, bid=bid, mat=p.get('material')))
    # node transforms
    return dict(ft=ft, bt=bt, gltf=gj, rtc=np.array(rtc), prims=out)
