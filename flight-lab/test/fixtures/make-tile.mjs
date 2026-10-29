// Makes the offline test fixture for the Google 3D layer: a fake tileset (root.json) and one Draco-compressed,
// textured glTF tile (tile.glb) shaped like Google's (ECEF node translation, glTF y-up, KHR_draco_mesh_compression,
// an embedded PNG, asset.copyright). It is NOT Google data: a flat checkered 30 km square around the display origin.
// Needs the draco3d encoder (npm i draco3d), only to regenerate the files:  DRACO3D=/path/to/node_modules/draco3d node make-tile.mjs
import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib'; import { createRequire } from 'node:module'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), require = createRequire(import.meta.url);
const draco3d = require(process.env.DRACO3D || 'draco3d');
const DEG = Math.PI / 180, A = 6378137, F = 1 / 298.257223563, E2 = F * (2 - F), R_E = 6371008.8;
const O = { lat: 28.777, lon: -81.238 }, H0 = -12;                       // flat ground at an ellipsoid height of −12 m
const ecef = (lat, lon, h) => { const s = Math.sin(lat * DEG), c = Math.cos(lat * DEG), N = A / Math.sqrt(1 - E2 * s * s); return [(N + h) * c * Math.cos(lon * DEG), (N + h) * c * Math.sin(lon * DEG), (N * (1 - E2) + h) * s]; };
const P0 = ecef(O.lat, O.lon, H0);
// a grid 31 × 31 (1 km apart), a few "buildings" bumps near the middle
const G = 31, pos = [], uv = [], idx = [];
for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
  const e = (i - 15) * 1000, n = (j - 15) * 1000, lat = O.lat + n / R_E / DEG, lon = O.lon + e / (R_E * Math.cos(O.lat * DEG)) / DEG;
  const h = H0 + (Math.abs(i - 15) < 2 && Math.abs(j - 15) < 2 && (i + j) % 2 ? 30 : 0);
  const p = ecef(lat, lon, h), d = [p[0] - P0[0], p[1] - P0[1], p[2] - P0[2]];
  pos.push(d[0], d[2], -d[1]);                                            // 3D Tiles z-up → glTF y-up
  uv.push(i / (G - 1), j / (G - 1));
}
for (let j = 0; j < G - 1; j++) for (let i = 0; i < G - 1; i++) { const a = j * G + i; idx.push(a, a + 1, a + G + 1, a, a + G + 1, a + G); }
const enc = await draco3d.createEncoderModule({});
const mb = new enc.MeshBuilder(), mesh = new enc.Mesh(), encoder = new enc.Encoder();
mb.AddFacesToMesh(mesh, idx.length / 3, new Uint32Array(idx));
const posId = mb.AddFloatAttributeToMesh(mesh, enc.POSITION, G * G, 3, new Float32Array(pos));
const uvId = mb.AddFloatAttributeToMesh(mesh, enc.TEX_COORD, G * G, 2, new Float32Array(uv));
encoder.SetAttributeQuantization(enc.POSITION, 16); encoder.SetAttributeQuantization(enc.TEX_COORD, 12); encoder.SetSpeedOptions(5, 5);
const db = new enc.DracoInt8Array(), len = encoder.EncodeMeshToDracoBuffer(mesh, db);
const draco = Buffer.alloc(len); for (let i = 0; i < len; i++) draco[i] = db.GetValue(i) & 255;
// a 64 × 64 PNG checker (green / tan), written by hand: no image library
function png(w, h, px) {
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const c = px(x, y); raw.set(c, y * (w * 3 + 1) + 1 + x * 3); } }
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
const img = png(64, 64, (x, y) => ((x >> 3) + (y >> 3)) % 2 ? [70, 120, 60] : [190, 170, 120]);
const pad4 = b => Buffer.concat([b, Buffer.alloc((4 - (b.length % 4)) % 4)]);
const bin = Buffer.concat([pad4(draco), pad4(img)]);
const gj = {
  asset: { version: '2.0', copyright: 'FLIGHT LAB test fixture (not Google data);Fixture Imagery' },
  extensionsUsed: ['KHR_draco_mesh_compression'], extensionsRequired: ['KHR_draco_mesh_compression'],
  scene: 0, scenes: [{ nodes: [0] }], nodes: [{ mesh: 0, translation: [P0[0], P0[2], -P0[1]] }],
  meshes: [{ primitives: [{ attributes: { POSITION: 0, TEXCOORD_0: 1 }, indices: 2, material: 0, mode: 4, extensions: { KHR_draco_mesh_compression: { bufferView: 0, attributes: { POSITION: posId, TEXCOORD_0: uvId } } } }] }],
  accessors: [{ componentType: 5126, count: G * G, type: 'VEC3', min: [-2e4, -2e4, -2e4], max: [2e4, 2e4, 2e4] }, { componentType: 5126, count: G * G, type: 'VEC2' }, { componentType: 5125, count: idx.length, type: 'SCALAR' }],
  materials: [{ pbrMetallicRoughness: { baseColorTexture: { index: 0 }, metallicFactor: 0 } }],
  textures: [{ source: 0 }], images: [{ bufferView: 1, mimeType: 'image/png' }],
  bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: draco.length }, { buffer: 0, byteOffset: pad4(draco).length, byteLength: img.length }],
  buffers: [{ byteLength: bin.length }],
};
let json = Buffer.from(JSON.stringify(gj)); json = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
const hdr = Buffer.alloc(12); hdr.write('glTF', 0); hdr.writeUInt32LE(2, 4); hdr.writeUInt32LE(12 + 8 + json.length + 8 + bin.length, 8);
const ch = (t, d) => { const h = Buffer.alloc(8); h.writeUInt32LE(d.length, 0); h.write(t, 4); return Buffer.concat([h, d]); };
fs.writeFileSync(path.join(here, 'tile.glb'), Buffer.concat([hdr, ch('JSON', json), ch('BIN\0', bin)]));
// the tileset: one root with this content (the box is in ECEF, z-up)
const root = { asset: { version: '1.0' }, geometricError: 1e5, root: { boundingVolume: { box: [...P0, 16000, 0, 0, 0, 16000, 0, 0, 0, 200] }, geometricError: 20, refine: 'REPLACE', content: { uri: '/v1/3dtiles/datasets/FIXTURE/files/tile.glb?session=FIXTURESESSION' }, children: [] } };
fs.writeFileSync(path.join(here, 'root.json'), JSON.stringify(root));
console.log('tile.glb', fs.statSync(path.join(here, 'tile.glb')).size, 'bytes; root.json written');
