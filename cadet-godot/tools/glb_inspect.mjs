// CADET Godot port — tools/glb_inspect.mjs
// GLB の JSON チャンクを読み、メッシュ名・マテリアル名・プリミティブ属性
// (COLOR_0 の有無とコンポーネント数)・頂点色の実値サンプルを棚卸しする。
// 使い方: node tools/glb_inspect.mjs [path-to.glb]   (既定: assets/archer.glb)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const path = process.argv[2] || join(here, '..', 'assets', 'archer.glb');
const buf = readFileSync(path);
if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB: ' + path);

let json = null, binOff = -1;
for (let o = 12; o < buf.length;) {
  const len = buf.readUInt32LE(o), type = buf.readUInt32LE(o + 4);
  if (type === 0x4e4f534a) json = JSON.parse(buf.subarray(o + 8, o + 8 + len).toString('utf8'));
  else if (type === 0x004e4942) binOff = o + 8;
  o += 8 + len;
}
if (!json) throw new Error('no JSON chunk');

const CT = { 5126: ['f32', 4, (v, o) => v.getFloat32(o, true)], 5125: ['u32', 4, (v, o) => v.getUint32(o, true)], 5123: ['u16', 2, (v, o) => v.getUint16(o, true)], 5121: ['u8', 1, (v, o) => v.getUint8(o)] };
const COMP = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };

function readAccessor(i) {
  const a = json.accessors[i], bv = json.bufferViews[a.bufferView];
  const [kind, size, get] = CT[a.componentType];
  const n = COMP[a.type], stride = bv.byteStride || n * size;
  const base = binOff + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const scale = a.normalized ? (a.componentType === 5123 ? 1 / 65535 : 1 / 255) : 1;
  const out = new Float32Array(a.count * n);
  for (let k = 0; k < a.count; k++) for (let c = 0; c < n; c++) out[k * n + c] = get(dv, base + k * stride + c * size) * scale;
  return { data: out, n, count: a.count, kind };
}

console.log(`file: ${path} (${buf.length} bytes)`);
console.log(`materials: ${(json.materials || []).length}`);
for (const [i, m] of (json.materials || []).entries())
  console.log(`  [${i}] name=${JSON.stringify(m.name ?? null)} pbr=${JSON.stringify(m.pbrMetallicRoughness ?? null)} alphaMode=${m.alphaMode ?? 'OPAQUE'}`);
console.log(`meshes: ${(json.meshes || []).length}, nodes: ${(json.nodes || []).length}`);

let totalTris = 0, colorMeshes = 0;
const palette = new Map(); // rounded rgb -> count of sampled vertices
for (const node of json.nodes || []) {
  if (node.mesh == null) continue;
  const mesh = json.meshes[node.mesh];
  const name = node.name || mesh.name || '(unnamed)';
  for (const [pi, p] of mesh.primitives.entries()) {
    const attrs = Object.keys(p.attributes);
    const pos = readAccessor(p.attributes.POSITION);
    const idx = p.indices != null ? readAccessor(p.indices) : null;
    const tris = (idx ? idx.count : pos.count) / 3;
    totalTris += tris;
    let colInfo = 'COLOR_0: none';
    if (p.attributes.COLOR_0 != null) {
      colorMeshes++;
      const C = readAccessor(p.attributes.COLOR_0);
      colInfo = `COLOR_0: ${C.n} comp (${C.kind}), ${C.count} verts`;
      // sample every 37th vertex into a coarse palette (rgb rounded to 2dp)
      for (let v = 0; v < C.count; v += 37) {
        const key = [0, 1, 2].map(c => C.data[v * C.n + c].toFixed(2)).join(',');
        palette.set(key, (palette.get(key) || 0) + 1);
      }
      if (C.n === 4) {
        let aMin = 1, aMax = 0;
        for (let v = 0; v < C.count; v++) { const a = C.data[v * 4 + 3]; aMin = Math.min(aMin, a); aMax = Math.max(aMax, a); }
        colInfo += `, alpha(AO) range ${aMin.toFixed(3)}..${aMax.toFixed(3)}`;
      }
    }
    const matName = p.material != null ? (json.materials[p.material]?.name ?? `#${p.material}`) : '(none)';
    console.log(`  node=${name} mesh=${mesh.name ?? ''} prim${pi}: tris=${tris} attrs=[${attrs.join(',')}] material=${matName} ${colInfo}` +
      (node.translation || node.rotation || node.scale ? ' [node has transform]' : ''));
  }
}
console.log(`total triangles: ${totalTris}, meshes with COLOR_0: ${colorMeshes}`);
console.log('sampled vertex-colour palette (rgb sRGB, top 20):');
for (const [rgb, n] of [...palette.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)) console.log(`  rgb(${rgb}) x${n}`);
