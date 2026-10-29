// CADET — npc/actor-model.js : the people's heads and uniforms made in Blender (tools/actor/build_actor.py →
// assets/model/*.glb, embedded in the page by build.mjs). Read once, synchronously (a person is built at once):
// the glTF's binary is parsed here for what that file holds — per mesh one primitive with positions, normals, a
// colour (the shading baked by Blender: occlusion and tints) and indices, and on the mouth one morph target. Mesh
// names: part.variant.colour.class[.n] (see the script).
// Two of them: 'far' (assets/model/actor.glb: everyone, within a person's share of a crowd's budget) and 'near'
// (actor-near.glb: the same parts with more of their triangles, for the few people close to the eye).
// In the page the files come from CADET_ASSETS (base64); in Node (the tests) from the files themselves.
const MODELS = {};
const FILES = { far: 'actor', near: 'actor-near' };

function fileBytes(lod) {
  const A = globalThis.CADET_ASSETS, key = 'model/' + FILES[lod];
  if (A && A[key]) {
    const s = atob(A[key]), b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  const fs = typeof process !== 'undefined' && process.getBuiltinModule ? process.getBuiltinModule('node:fs') : null;
  if (!fs) throw new Error('actor-model: the model is not in the page');
  return new Uint8Array(fs.readFileSync(new URL(`../../assets/model/${FILES[lod]}.glb`, import.meta.url)));
}

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
// one accessor as a Float32Array (normalized integers scaled to 0…1), or the indices as a Uint32Array
function read(json, bin, i, asIndex = false) {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = COMPONENTS[a.type], count = a.count;
  const T = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array, 5121: Uint8Array }[a.componentType];
  const size = T.BYTES_PER_ELEMENT, stride = v.byteStride || n * size, base = bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
  const dv = new DataView(bin.buffer), out = asIndex ? new Uint32Array(count * n) : new Float32Array(count * n);
  const get = { 5126: (o) => dv.getFloat32(o, true), 5125: (o) => dv.getUint32(o, true), 5123: (o) => dv.getUint16(o, true), 5121: (o) => dv.getUint8(o) }[a.componentType];
  const scale = a.normalized ? { 5123: 1 / 65535, 5121: 1 / 255 }[a.componentType] : 1;
  for (let k = 0; k < count; k++) for (let c = 0; c < n; c++) out[k * n + c] = get(base + k * stride + c * size) * scale;
  return { data: out, n };
}

// → Map name → { part, variant, key, cls, position, normal, shade (rgb per vertex), index, morph (relative) }
export function actorModel(lod = 'far') {
  if (!FILES[lod]) throw new Error('actor-model: no detail ' + lod);
  if (MODELS[lod]) return MODELS[lod];
  const b = fileBytes(lod), dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('actor-model: not a glb');
  let json = null, bin = null;
  for (let o = 12; o < b.byteLength;) {
    const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true), chunk = b.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004e4942) bin = chunk;
    o += 8 + len;
  }
  const model = MODELS[lod] = new Map();
  for (const node of json.nodes || []) {
    if (node.mesh == null) continue;
    if (node.translation || node.rotation || node.scale || node.matrix) throw new Error('actor-model: a mesh with a transform: ' + node.name);
    const m = json.meshes[node.mesh], p = m.primitives[0], at = p.attributes;
    const [part, variant, key, cls] = m.name.split('.');
    const col = at.COLOR_0 != null ? read(json, bin, at.COLOR_0) : null, nv = json.accessors[at.POSITION].count;
    const shade = new Float32Array(nv * 3);
    for (let i = 0; i < nv; i++) for (let c = 0; c < 3; c++) shade[i * 3 + c] = col ? col.data[i * col.n + c] : 1;
    model.set(m.name, {
      part, variant, key, cls, shade,
      position: read(json, bin, at.POSITION).data, normal: at.NORMAL != null ? read(json, bin, at.NORMAL).data : null,
      index: read(json, bin, p.indices, true).data,
      morph: p.targets && p.targets[0] ? read(json, bin, p.targets[0].POSITION).data : null,
    });
  }
  return model;
}
