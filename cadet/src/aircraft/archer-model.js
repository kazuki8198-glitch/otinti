// CADET — aircraft/archer-model.js : the Archer seen from outside, made in Blender (tools/aircraft/build_archer.py →
// assets/model/archer.glb and archer-far.glb, embedded in the page by build.mjs), as parts in acmesh's own form so that
// aircraft/exterior.js builds it as before: each part { name, mesh: { pos, nrm, col, ao, count }, pivot, axis, angle,
// prop } — the hinges (pivot, axis, angle) and the propeller's index are acmesh's (the surfaces turn on the physics'
// hinge lines), the shapes and the paint the model's. The model's body comes split in two (body: the wings, the tail,
// the tail cone; cabin: what the cockpit view takes away), and the registration (reg.N738SY …) goes into the body.
// The glTF: per mesh one primitive with positions, normals and COLOR_0 (rgb: the paint, sRGB as acmesh's colours;
// alpha: the ambient occlusion baked by Blender), indexed; read here into flat triangles (acmesh's form).
// Two details: 'near' (today's aircraft, the flown one) and 'far' (the parked ones further away).
const FILES = { near: 'archer', far: 'archer-far' };
const RAW = {};

function fileBytes(lod) {
  const A = globalThis.CADET_ASSETS, key = 'model/' + FILES[lod];
  if (A && A[key]) {
    const s = atob(A[key]), b = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i);
    return b;
  }
  const fs = typeof process !== 'undefined' && process.getBuiltinModule ? process.getBuiltinModule('node:fs') : null;
  if (!fs) return null;
  try { return new Uint8Array(fs.readFileSync(new URL(`../../assets/model/${FILES[lod]}.glb`, import.meta.url))); } catch { return null; }
}

const COMPONENTS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 };
function read(json, bin, i) {
  const a = json.accessors[i], v = json.bufferViews[a.bufferView], n = COMPONENTS[a.type], count = a.count;
  const size = { 5126: 4, 5125: 4, 5123: 2, 5121: 1 }[a.componentType];
  const stride = v.byteStride || n * size, base = bin.byteOffset + (v.byteOffset || 0) + (a.byteOffset || 0);
  const dv = new DataView(bin.buffer), out = new Float32Array(count * n);
  const get = { 5126: (o) => dv.getFloat32(o, true), 5125: (o) => dv.getUint32(o, true), 5123: (o) => dv.getUint16(o, true), 5121: (o) => dv.getUint8(o) }[a.componentType];
  const scale = a.normalized ? { 5123: 1 / 65535, 5121: 1 / 255 }[a.componentType] : 1;
  for (let k = 0; k < count; k++) for (let c = 0; c < n; c++) out[k * n + c] = get(base + k * stride + c * size) * scale;
  return { data: out, n };
}

// → Map name → { pos, nrm, col, ao, count } (flat triangles), or null when the model is not there
export function archerMeshes(lod = 'near') {
  if (!FILES[lod]) throw new Error('archer-model: no detail ' + lod);
  if (lod in RAW) return RAW[lod];
  const b = fileBytes(lod);
  if (!b) return (RAW[lod] = null);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error('archer-model: not a glb');
  let json = null, bin = null;
  for (let o = 12; o < b.byteLength;) {
    const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true), chunk = b.subarray(o + 8, o + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(chunk)); else if (type === 0x004e4942) bin = chunk;
    o += 8 + len;
  }
  const out = RAW[lod] = new Map();
  for (const node of json.nodes || []) {
    if (node.mesh == null) continue;
    if (node.translation || node.rotation || node.scale || node.matrix) throw new Error('archer-model: a mesh with a transform: ' + node.name);
    const m = json.meshes[node.mesh], p = m.primitives[0], at = p.attributes;
    const P = read(json, bin, at.POSITION).data, N = read(json, bin, at.NORMAL).data, C = read(json, bin, at.COLOR_0), I = read(json, bin, p.indices).data;
    const count = I.length, pos = new Float32Array(count * 3), nrm = new Float32Array(count * 3), col = new Float32Array(count * 3), ao = new Float32Array(count);
    for (let k = 0; k < count; k++) {
      const v = I[k];
      for (let c = 0; c < 3; c++) { pos[k * 3 + c] = P[v * 3 + c]; nrm[k * 3 + c] = N[v * 3 + c]; col[k * 3 + c] = C.data[v * C.n + c]; }
      ao[k] = C.n === 4 ? C.data[v * 4 + 3] : 1;
    }
    out.set(node.name || m.name, { pos, nrm, col, ao, count });
  }
  return out;
}

const join = (list) => {
  const count = list.reduce((s, m) => s + m.count, 0), o = { pos: new Float32Array(count * 3), nrm: new Float32Array(count * 3), col: new Float32Array(count * 3), ao: new Float32Array(count), count };
  let k = 0;
  for (const m of list) { o.pos.set(m.pos, k * 3); o.nrm.set(m.nrm, k * 3); o.col.set(m.col, k * 3); o.ao.set(m.ao, k); k += m.count; }
  return o;
};

// the parts of an aircraft in acmesh's form: the Archer (pa28) from the model when it is there, any other type (and the
// Archer without the model) acmesh's own. opts: { lod: 'near' | 'far', reg: the registration painted on it }
export function exteriorParts(FL, A, { lod = 'near', reg = 'N738SY' } = {}) {
  const lab = FL.acmesh.buildParts(A);
  const M = A.id === 'pa28' ? archerMeshes(lod) : null;
  if (!M) return lab;
  const out = [];
  for (const p of lab) {
    if (p.disc != null) { out.push(p); continue; }                       // the propeller's disc: acmesh's (a flat circle)
    if (p.name === 'body') {
      const r = M.get('reg.' + reg) || M.get('reg.N738SY');
      out.push({ ...p, mesh: join([M.get('body'), ...(r ? [r] : [])]), cabin: M.get('cabin') });
      continue;
    }
    const m = M.get(p.name);
    if (!m) throw new Error('archer-model: no part ' + p.name);
    out.push({ ...p, mesh: m });
  }
  return out;
}
