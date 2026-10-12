// FLIGHT LAB — google3d.js
// Google Photorealistic 3D Tiles (the official Map Tiles API) as OPTIONAL outside scenery around Sanford.
//  - The API key is held in MEMORY ONLY (this closure). It is never written to localStorage, the record, JSON
//    or the URL of this page, and it is sent only to tile.googleapis.com, as the API requires.
//  - Only the official Map Tiles API is used: no Street View, no scraping, no unofficial endpoints. Tiles are not
//    stored or prefetched beyond what is on screen; they are dropped from memory when not used.
//  - Google's data is DISPLAY ONLY: no collision with buildings or terrain, no runway extraction, no real-airport
//    touchdown. The aircraft flies over the app's own flat teaching ground (55 ft).
//  - "Google Maps" and the data providers from each tile's glTF asset.copyright are shown while tiles are drawn.
// The glTF meshes are Draco-compressed: the Draco decoder (Apache-2.0) is embedded in the page (FL.DRACO_SRC /
// FL.DRACO_WASM_B64, written by build.mjs) and runs in a worker made from a Blob (no network for the decoder).
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180, R_E = 6371008.8;
  const ROOT_URL = 'https://tile.googleapis.com/v1/3dtiles/root.json';
  const COVER_R = 12000;            // metres around the display origin where Google's scenery replaces the teaching ground
  const GA = 6378137, GE2 = (1 / 298.257223563) * (2 - 1 / 298.257223563);
  function ecefGeo(x, y, z) {
    const p = Math.hypot(x, y); let lat = Math.atan2(z, p * (1 - GE2)), h = 0;
    for (let i = 0; i < 4; i++) { const s = Math.sin(lat), N = GA / Math.sqrt(1 - GE2 * s * s); h = p / Math.cos(lat) - N; lat = Math.atan2(z, p * (1 - GE2 * N / (N + h))); }
    return [lat / DEG, Math.atan2(y, x) / DEG, h];
  }
  // double-precision 4×4 (column-major): ECEF numbers are too large for Float32
  function gMul(a, b) { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3]; return o; }
  function gXf(m, p) { return [m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12], m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13], m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14]]; }

  // ---------------------------------------------------------------- the decoder (runs in the worker; or on the page as a fallback)
  // env: { Draco: the DracoDecoderModule factory, post(msg, transfer) }. Returns the message handler.
  function DECODER(env) {
    const td = new TextDecoder(), R_E = 6371008.8, DEG = Math.PI / 180;
    const A = 6378137, F = 1 / 298.257223563, E2 = F * (2 - F);
    let wasm = null, dracoP = null, origin = null;
    const getDraco = () => dracoP || (dracoP = new Promise((res, rej) => { try { env.Draco({ wasmBinary: wasm, onModuleLoaded: m => res(m) }); } catch (e) { rej(e); } }));
    const TYPES = { 5120: Int8Array, 5121: Uint8Array, 5122: Int16Array, 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array };
    const COMPS = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };
    const mat4 = (a, b) => { const o = new Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
    const trs = n => {
      if (n.matrix) return n.matrix;
      const t = n.translation || [0, 0, 0], q = n.rotation || [0, 0, 0, 1], s = n.scale || [1, 1, 1], [x, y, z, w] = q;
      return [(1 - 2 * (y * y + z * z)) * s[0], 2 * (x * y + z * w) * s[0], 2 * (x * z - y * w) * s[0], 0, 2 * (x * y - z * w) * s[1], (1 - 2 * (x * x + z * z)) * s[1], 2 * (y * z + x * w) * s[1], 0,
        2 * (x * z + y * w) * s[2], 2 * (y * z - x * w) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0, t[0], t[1], t[2], 1];
    };
    async function decode(m) {
      const r0 = await fetch(m.url, { mode: 'cors', credentials: 'omit' });
      if (!r0.ok) throw new Error('HTTP ' + r0.status);
      const buf = await r0.arrayBuffer(), dv = new DataView(buf), u8 = new Uint8Array(buf);
      if (td.decode(u8.subarray(0, 4)) !== 'glTF') throw new Error('not glb');
      const jl = dv.getUint32(12, true), gj = JSON.parse(td.decode(u8.subarray(20, 20 + jl))), bin = 20 + jl + 8;
      const view = i => { const v = gj.bufferViews[i]; return u8.subarray(bin + (v.byteOffset || 0), bin + (v.byteOffset || 0) + v.byteLength); };
      const accessor = i => {
        const a = gj.accessors[i], C = TYPES[a.componentType], nc = COMPS[a.type], v = gj.bufferViews[a.bufferView];
        const off = bin + (v.byteOffset || 0) + (a.byteOffset || 0), es = C.BYTES_PER_ELEMENT, stride = v.byteStride || nc * es, out = new Float32Array(a.count * nc);
        const sc = a.normalized ? (C === Uint8Array ? 1 / 255 : C === Uint16Array ? 1 / 65535 : C === Int8Array ? 1 / 127 : C === Int16Array ? 1 / 32767 : 1) : 1;
        for (let k = 0; k < a.count; k++) for (let c = 0; c < nc; c++) {
          const o = off + k * stride + c * es;
          out[k * nc + c] = (C === Float32Array ? dv.getFloat32(o, true) : C === Uint16Array ? dv.getUint16(o, true) : C === Uint32Array ? dv.getUint32(o, true) : C === Uint8Array ? dv.getUint8(o) : C === Int16Array ? dv.getInt16(o, true) : dv.getInt8(o)) * sc;
        }
        return { data: out, nc };
      };
      const world = new Map(), I = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
      const walk = (ni, Pm) => { const n = gj.nodes[ni], M = mat4(Pm, trs(n)); world.set(ni, M); for (const c of n.children || []) walk(c, M); };
      const scene = gj.scenes ? gj.scenes[gj.scene || 0] : null;
      for (const ni of scene ? scene.nodes : (gj.nodes || []).map((_, i) => i)) walk(ni, I);
      const TF = m.tf || I, parts = [];
      for (const [ni, M] of world) {
        const nd = gj.nodes[ni]; if (nd.mesh == null) continue;
        for (const p of gj.meshes[nd.mesh].primitives) {
          if (p.mode != null && p.mode !== 4) continue;
          let Pp, UV = null, IDX;
          const dext = p.extensions && p.extensions.KHR_draco_mesh_compression;
          if (dext) {
            const draco = await getDraco(), bytes = view(dext.bufferView);
            const dbuf = new draco.DecoderBuffer(); dbuf.Init(new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength), bytes.byteLength);
            const dec = new draco.Decoder(), mesh = new draco.Mesh(), st = dec.DecodeBufferToMesh(dbuf, mesh);
            if (!st.ok() || mesh.ptr === 0) { draco.destroy(mesh); draco.destroy(dec); draco.destroy(dbuf); continue; }
            const np = mesh.num_points();
            const get = id => { const at = dec.GetAttributeByUniqueId(mesh, id), nc = at.num_components(), nv = np * nc, bl = nv * 4, ptr = draco._malloc(bl); dec.GetAttributeDataArrayForAllPoints(mesh, at, draco.DT_FLOAT32, bl, ptr); const arr = new Float32Array(draco.HEAPF32.buffer, ptr, nv).slice(); draco._free(ptr); return { data: arr, nc }; };
            Pp = get(dext.attributes.POSITION);
            if (dext.attributes.TEXCOORD_0 != null) UV = get(dext.attributes.TEXCOORD_0);
            const nf = mesh.num_faces(), nI = nf * 3, bl = nI * 4, ptr = draco._malloc(bl);
            dec.GetTrianglesUInt32Array(mesh, bl, ptr); IDX = new Uint32Array(draco.HEAPF32.buffer, ptr, nI).slice(); draco._free(ptr);
            draco.destroy(mesh); draco.destroy(dec); draco.destroy(dbuf);
          } else {
            Pp = accessor(p.attributes.POSITION);
            if (p.attributes.TEXCOORD_0 != null) UV = accessor(p.attributes.TEXCOORD_0);
            IDX = p.indices != null ? Uint32Array.from(accessor(p.indices).data) : Uint32Array.from({ length: Pp.data.length / 3 }, (_, k) => k);
          }
          const mat = gj.materials && p.material != null ? gj.materials[p.material] : null, pbr = (mat && mat.pbrMetallicRoughness) || {};
          const bt = pbr.baseColorTexture; let src = -1;
          if (bt) { const t = gj.textures[bt.index]; src = t.source != null ? t.source : -1; }
          parts.push({ P: Pp, UV, IDX, M, src });
        }
      }
      parts.sort((a, b) => a.src - b.src);
      let nv = 0, nI = 0; for (const q of parts) { nv += q.P.data.length / 3; nI += q.IDX.length; }
      const pos = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(nI), groups = [], samples = [];
      const cosLat0 = Math.cos(origin.lat * DEG), step = Math.max(1, Math.floor(nv / 400));
      let v0 = 0, i0 = 0, hmin = 1e9, hmax = -1e9;
      for (const q of parts) {
        const n = q.P.data.length / 3, M = q.M;
        for (let k = 0; k < n; k++) {
          const x0 = q.P.data[k * 3], y0 = q.P.data[k * 3 + 1], z0 = q.P.data[k * 3 + 2];
          const x = M[0] * x0 + M[4] * y0 + M[8] * z0 + M[12], y = M[1] * x0 + M[5] * y0 + M[9] * z0 + M[13], z = M[2] * x0 + M[6] * y0 + M[10] * z0 + M[14];
          const X = x, Y = -z, Z = y;                                                // glTF y-up → 3D Tiles z-up
          const ex = TF[0] * X + TF[4] * Y + TF[8] * Z + TF[12], ey = TF[1] * X + TF[5] * Y + TF[9] * Z + TF[13], ez = TF[2] * X + TF[6] * Y + TF[10] * Z + TF[14];
          // ECEF → latitude, longitude, ellipsoid height
          const pp = Math.hypot(ex, ey); let lat = Math.atan2(ez, pp * (1 - E2)), hh = 0;
          for (let it = 0; it < 3; it++) { const s = Math.sin(lat), N = A / Math.sqrt(1 - E2 * s * s); hh = pp / Math.cos(lat) - N; lat = Math.atan2(ez, pp * (1 - E2 * N / (N + hh))); }
          const lon = Math.atan2(ey, ex);
          // the app's flat local plane (the same mapping as avionics.latLonToNe): GL x = east, y = height, z = -north
          const north = (lat / DEG - origin.lat) * DEG * R_E, east = (lon / DEG - origin.lon) * DEG * R_E * cosLat0, o = v0 + k;
          pos[o * 3] = east; pos[o * 3 + 1] = hh; pos[o * 3 + 2] = -north;
          if (hh < hmin) hmin = hh; if (hh > hmax) hmax = hh;
          if (o % step === 0) samples.push(east, north, hh);
          if (q.UV) { uv[o * 2] = q.UV.data[k * 2]; uv[o * 2 + 1] = q.UV.data[k * 2 + 1]; } else { uv[o * 2] = -1; uv[o * 2 + 1] = -1; }
        }
        for (let k = 0; k < q.IDX.length; k++) idx[i0 + k] = q.IDX[k] + v0;
        const last = groups[groups.length - 1];
        if (last && last.src === q.src) last.count += q.IDX.length; else groups.push({ src: q.src, start: i0, count: q.IDX.length });
        v0 += n; i0 += q.IDX.length;
      }
      const bitmaps = [], imgOf = new Map();
      for (const gr of groups) {
        gr.img = -1; if (gr.src < 0) continue;
        if (imgOf.has(gr.src)) { gr.img = imgOf.get(gr.src); continue; }
        const im = gj.images[gr.src]; if (im.bufferView == null) continue;
        try {
          let bmp = await createImageBitmap(new Blob([view(im.bufferView).slice()], { type: im.mimeType || 'image/jpeg' }));
          const mx = m.maxTex || 1024;
          if (bmp.width > mx || bmp.height > mx) { const k = mx / Math.max(bmp.width, bmp.height); const sm = await createImageBitmap(bmp, { resizeWidth: Math.max(1, Math.round(bmp.width * k)), resizeHeight: Math.max(1, Math.round(bmp.height * k)), resizeQuality: 'high' }); bmp.close(); bmp = sm; }
          gr.img = bitmaps.length; imgOf.set(gr.src, gr.img); bitmaps.push(bmp);
        } catch (e) { /* undecodable image: drawn untextured */ }
      }
      return { id: m.id, nv, ni: nI, pos: pos.buffer, uv: uv.buffer, idx: idx.buffer, samples: new Float32Array(samples).buffer, groups, bitmaps, copyright: (gj.asset && gj.asset.copyright) || '', hmin, hmax };
    }
    return async m => {
      if (m.init) { wasm = m.wasm; origin = m.origin; return; }
      try { const r = await decode(m); env.post(r, [r.pos, r.uv, r.idx, r.samples, ...r.bitmaps]); }
      catch (err) { env.post({ id: m.id, error: String((err && err.message) || err) }); }
    };
  }

  // ---------------------------------------------------------------- the layer
  function create(gl) {
    const ORIGIN = FL.avionics.ORIGIN, GROUND_M = FL.physics.GROUND_M;
    let KEY = '';                                                   // memory only
    const G = { state: 'off', msg: '', root: null, session: '', nodes: 0, active: [], upq: [], bytes: 0, loaded: 0, frame: 0, credits: '', creditT: 0,
      off: null, manual: null, samp: [], jobs: new Map(), nextId: 1, workers: [], fallback: null, drawn: 0 };
    // the textured, unlit tile shader (photogrammetry is already lit), with fog and the round clip
    const vs = `#version 300 es
      layout(location=0) in vec3 aP; layout(location=1) in vec2 aT; uniform mat4 uVP; uniform float uOff; out vec2 vT; out vec3 vW;
      void main() { vW = aP + vec3(0.0, uOff, 0.0); vT = aT; gl_Position = uVP * vec4(vW, 1.0); }`;
    const fs = `#version 300 es
      precision highp float; in vec2 vT; in vec3 vW; out vec4 o; uniform sampler2D uTex; uniform int uHasTex; uniform vec3 uCam, uFog; uniform float uFogD, uClip;
      void main() {
        if (length(vW.xz) > uClip) discard;
        vec3 c = uHasTex == 1 && vT.x >= 0.0 ? texture(uTex, vT).rgb : vec3(0.55, 0.56, 0.52);
        o = vec4(mix(uFog, c, exp(-length(vW - uCam) * uFogD)), 1.0);
      }`;
    const mk = (t, s) => { const h = gl.createShader(t); gl.shaderSource(h, s); gl.compileShader(h); if (!gl.getShaderParameter(h, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(h)); return h; };
    const prog = gl.createProgram(); gl.attachShader(prog, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(prog, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(prog);
    const U = n => gl.getUniformLocation(prog, n), u = { uVP: U('uVP'), uOff: U('uOff'), uTex: U('uTex'), uHasTex: U('uHasTex'), uCam: U('uCam'), uFog: U('uFog'), uFogD: U('uFogD'), uClip: U('uClip') };
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');

    function url(uri) {
      const x = new URL(uri, ROOT_URL);
      if (x.origin !== 'https://tile.googleapis.com') throw new Error('unexpected host');      // the key goes to Google's tile host only
      const ses = x.searchParams.get('session'); if (ses) G.session = ses; else if (G.session) x.searchParams.set('session', G.session);
      x.searchParams.set('key', KEY);
      return x.href;
    }
    function decoderReady() {
      if (G.workers.length || G.fallback) return true;
      if (!FL.DRACO_SRC || !FL.DRACO_WASM_B64) { G.state = 'error'; G.msg = 'Draco デコーダーが同梱されていません（開発版：build.mjs を実行してください）'; return false; }
      const wasm = Uint8Array.from(atob(FL.DRACO_WASM_B64), c => c.charCodeAt(0)).buffer;
      const onMsg = r => receive(r);
      try {
        const src = FL.DRACO_SRC + '\n;const __h=(' + DECODER.toString() + ')({Draco:DracoDecoderModule,post:(m,t)=>postMessage(m,t)});onmessage=e=>__h(e.data);';
        const burl = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
        const n = Math.min(3, Math.max(1, (navigator.hardwareConcurrency || 4) - 2));
        for (let i = 0; i < n; i++) { const w = new Worker(burl); w.busy = 0; w.onmessage = e => { w.busy = Math.max(0, w.busy - 1); onMsg(e.data); }; w.onerror = () => { G.workerErr = true; }; w.postMessage({ init: true, wasm: wasm.slice(0), origin: ORIGIN }); G.workers.push(w); }
      } catch (e) {
        // workers not allowed here: decode on the page (slower)
        const factory = new Function(FL.DRACO_SRC + '\n;return DracoDecoderModule;')();
        const hnd = DECODER({ Draco: factory, post: m => setTimeout(() => onMsg(m), 0) });
        hnd({ init: true, wasm, origin: ORIGIN });
        G.fallback = { busy: 0, post: m => { G.fallback.busy++; hnd(m).then(() => { G.fallback.busy--; }); } };
      }
      return true;
    }
    function conv(n, parent, tf) {
      const T = n.transform ? (tf ? gMul(tf, n.transform) : [...n.transform]) : tf;
      const node = { parent, ge: n.geometricError ?? (parent ? parent.ge / 2 : 1e5), children: [], mesh: null, state: 0, used: 0, tf: T || null };
      const bv = n.boundingVolume || {};
      if (bv.box) {
        const b = bv.box, c = T ? gXf(T, [b[0], b[1], b[2]]) : [b[0], b[1], b[2]];
        node.r = Math.sqrt(b[3] ** 2 + b[4] ** 2 + b[5] ** 2 + b[6] ** 2 + b[7] ** 2 + b[8] ** 2 + b[9] ** 2 + b[10] ** 2 + b[11] ** 2);
        if (Math.hypot(c[0], c[1], c[2]) > 1e6) { const g = ecefGeo(c[0], c[1], c[2]); node.lat = g[0]; node.lon = g[1]; node.h = g[2]; } else node.planet = true;
      } else if (bv.region) {
        const rg = bv.region; node.lat = (rg[1] + rg[3]) / 2 / DEG; node.lon = (rg[0] + rg[2]) / 2 / DEG; node.h = (rg[4] + rg[5]) / 2;
        node.r = Math.hypot((rg[3] - rg[1]) * GA, (rg[2] - rg[0]) * GA * Math.cos(node.lat * DEG), rg[5] - rg[4]) / 2;
      } else node.planet = true;
      if (node.r > 2e6) node.planet = true;
      if (!node.planet) { node.n = (node.lat - ORIGIN.lat) * DEG * R_E; node.e = (node.lon - ORIGIN.lon) * DEG * R_E * Math.cos(ORIGIN.lat * DEG); }
      const c = n.content && (n.content.uri || n.content.url);
      if (c) { if (/\.json(\?|$)/.test(c)) node.ext = c; else node.uri = c; }
      G.nodes++;
      for (const ch of n.children || []) node.children.push(conv(ch, node, T));
      return node;
    }
    async function fetchJson(uri) {
      const r = await fetch(url(uri), { mode: 'cors', credentials: 'omit' });
      if (!r.ok) { let detail = ''; try { const j = await r.json(); detail = (j.error && j.error.message) || ''; } catch (e) { /* no body */ } const err = new Error(detail || 'HTTP ' + r.status); err.status = r.status; throw err; }
      return r.json();
    }
    function errorText(e) {
      const st = e.status, m = e.message || '';
      return st === 403 ? `拒否されました（403）：キーが無効、Map Tiles API が有効でない、請求先が未設定、またはキーの制限（ウェブサイト・API）に合っていない可能性があります。Google の応答：${m}`
        : st === 429 ? '利用上限に達しました（429）。しばらく待つか、Google Cloud で割り当て（クォータ）を確認してください。'
        : /API key not valid/i.test(m) ? 'キーが無効です（打ち間違い、削除・未作成のキー）。Google Cloud の「認証情報」で確認してください。'
        : st === 400 ? `リクエストが不正です（400）：${m}`
        : /Failed to fetch|NetworkError|Load failed/i.test(m) ? 'Google に接続できません（オフライン、ネットワークの制限、またはブラウザの設定）。教材と飛行訓練はこのまま使えます。'
        : `接続できませんでした：${m}`;
    }
    function start() {
      if (!KEY) { G.state = 'error'; G.msg = 'キーが入力されていません'; return; }
      if (G.state === 'starting' || G.state === 'on') return;
      if (!decoderReady()) return;
      G.state = 'starting'; G.msg = 'ルートのタイルセットを要求中…（このリクエストは課金対象です）';
      fetchJson(ROOT_URL).then(j => { G.root = conv(j.root, null, null); G.state = 'on'; G.msg = '接続しました。Sanford 周辺（半径約 12 km）を Google の 3D で表示します。'; G.t0 = Date.now(); })
        .catch(e => { G.state = 'error'; G.msg = errorText(e); });
    }
    function freeNode(n) {
      if (n.mesh && !n.mesh.empty) { gl.deleteVertexArray(n.mesh.vao); for (const b of n.mesh.bufs) gl.deleteBuffer(b); for (const t of n.mesh.texs) gl.deleteTexture(t); G.bytes -= n.mesh.bytes; G.loaded--; }
      n.mesh = null; n.state = 0; n.job = 0;
    }
    function stop(clearKey) {
      const free = n => { if (n.mesh) freeNode(n); for (const c of n.children) free(c); };
      if (G.root) free(G.root);
      for (const [, r] of G.upq) (r.bitmaps || []).forEach(b => b.close());
      G.upq.length = 0; G.root = null; G.state = 'off'; G.msg = ''; G.active = []; G.session = ''; G.samp = []; G.off = null; G.credits = '';
      if (clearKey) KEY = '';
    }
    // which tiles to draw / load: screen-space error around the camera, inside the round area only
    function frustum(VP) {
      const m = VP, pl = [];
      const add = (a, b, c, d) => { const l = Math.hypot(a, b, c); pl.push([a / l, b / l, c / l, d / l]); };
      add(m[3] + m[0], m[7] + m[4], m[11] + m[8], m[15] + m[12]); add(m[3] - m[0], m[7] - m[4], m[11] - m[8], m[15] - m[12]);
      add(m[3] + m[1], m[7] + m[5], m[11] + m[9], m[15] + m[13]); add(m[3] - m[1], m[7] - m[5], m[11] - m[9], m[15] - m[13]);
      add(m[3] + m[2], m[7] + m[6], m[11] + m[10], m[15] + m[14]);
      return pl;
    }
    function update(cam, s) {
      if (G.state !== 'on' || !G.root || !cam) { G.active = []; return; }
      const f = ++G.frame, eye = cam.eye, planes = frustum(cam.VP), off = offset();
      const K = cam.H / (2 * Math.tan(cam.fovY / 2)), SSE = 16, MAXD = 70000;
      const center = n => [n.e, n.h + off, -n.n];
      const inArea = n => n.planet || Math.hypot(n.e, n.n) - n.r < COVER_R;
      const dist = n => { if (n.planet) return 0; const c = center(n); return Math.max(0, Math.hypot(c[0] - eye[0], c[1] - eye[1], c[2] - eye[2]) - n.r); };
      const vis = n => { if (n.planet) return true; const c = center(n); for (const p of planes) if (p[0] * c[0] + p[1] * c[1] + p[2] * c[2] + p[3] < -n.r) return false; return true; };
      const ok = n => inArea(n) && dist(n) < MAXD && vis(n);
      const ready = (n, depth = 0) => (n.uri ? !!n.mesh : n.ext ? n.extState === 3 : depth > 6 ? false : n.children.length > 0 && n.children.every(c => !ok(c) || ready(c, depth + 1)));
      const out = [], req = [];
      const visit = n => {
        if (!ok(n)) return;
        n.used = f;
        if (n.ext) { if (!n.extState) loadExt(n); return; }
        const d = dist(n), sse = n.ge * K / Math.max(d, 1);
        const refine = n.children.length && (n.planet || !n.uri || sse > SSE);
        if (!refine) { if (n.uri) { if (n.mesh) out.push(n); else req.push([n, d]); } return; }
        const kidsReady = n.children.every(c => !ok(c) || ready(c));
        if (kidsReady || !n.uri) { for (const c of n.children) visit(c); if (!kidsReady && n.uri && !n.mesh) req.push([n, d]); }
        else {
          if (n.mesh) out.push(n); else req.push([n, d]);
          const want = (c, depth) => { if (!ok(c)) return; c.used = f; if (c.ext) { if (!c.extState) loadExt(c); } else if (c.uri) { if (!c.mesh && c.state === 0) req.push([c, dist(c) + 50]); } else if (depth < 6) for (const k of c.children) want(k, depth + 1); };
          for (const c of n.children) want(c, 0);
        }
      };
      visit(G.root);
      G.active = out;
      req.sort((a, b) => a[1] - b[1]);
      let busy = G.fallback ? G.fallback.busy : G.workers.reduce((a, w) => a + w.busy, 0);
      const cap = G.fallback ? 2 : G.workers.length * 3;
      for (const [n] of req) { if (busy >= cap || G.upq.length > 10) break; if (n.state !== 0) continue; dispatch(n); busy++; }
      uploadStep(); datumStep();
      if (f % 30 === 0) evict(f);
      const now = performance.now(); if (now > G.creditT || out.length !== G.lastN) { G.creditT = now + 1000; G.lastN = out.length; credits(); }
    }
    function loadExt(n) {
      n.extState = 1;
      fetchJson(n.ext).then(j => { n.children.push(conv(j.root, n, n.tf)); n.ext = null; n.extState = 2; })
        .catch(e => { n.extState = e.status === 404 ? 3 : 0; if (e.status === 403 || e.status === 429) { G.state = 'error'; G.msg = errorText(e); } });
    }
    function dispatch(n) {
      const id = G.nextId++; n.state = 1; n.job = id;
      G.jobs.set(id, n);
      const msg = { id, url: url(n.uri), tf: n.tf, maxTex: 1024 };
      if (G.fallback) { G.fallback.post(msg); return; }
      const w = G.workers.reduce((a, b) => (b.busy < a.busy ? b : a)); w.busy++; w.postMessage(msg);
    }
    function receive(r) {
      const n = G.jobs.get(r.id); G.jobs.delete(r.id);
      if (!n || n.job !== r.id) { if (r.bitmaps) r.bitmaps.forEach(b => b.close()); return; }
      if (r.error) {
        n.state = 3; G.nErr = (G.nErr || 0) + 1;
        if (/HTTP 40[13]|HTTP 429/.test(r.error)) { G.state = 'error'; G.msg = 'タイルの取得が拒否されました（' + r.error + '）'; }
        else setTimeout(() => { if (n.state === 3) n.state = 0; }, 15000);
        return;
      }
      n.copyright = r.copyright;
      if (!r.nv) { n.state = 2; n.mesh = { empty: true }; return; }
      n.state = 4;
      // height samples near the origin for the datum (only fine tiles: their ground is reliable)
      if (!n.planet && n.ge < 40) { const sm = new Float32Array(r.samples); for (let k = 0; k < sm.length; k += 3) if (Math.hypot(sm[k], sm[k + 1]) < 6000) G.samp.push(sm[k + 2]); if (G.samp.length > 4000) G.samp.splice(0, G.samp.length - 4000); }
      G.upq.push([n, r]);
    }
    // GPU uploads spread over frames (a few milliseconds per frame)
    function uploadStep() {
      const t0 = performance.now();
      while (G.upq.length && performance.now() - t0 < 4) {
        const job = G.upq[0], [n, r] = job;
        if (n.state !== 4) { r.bitmaps.forEach(b => b.close()); G.upq.shift(); continue; }
        if (!job.vao) {
          const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
          const mkb = (data, loc, size) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0); return b; };
          job.bufs = [mkb(r.pos, 0, 3), mkb(r.uv, 1, 2)];
          const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, r.idx, gl.STATIC_DRAW); job.bufs.push(ib);
          gl.bindVertexArray(null);
          job.vao = vao; job.texs = []; job.bytes = r.nv * 20 + r.ni * 4;
          continue;
        }
        if (job.texs.length < r.bitmaps.length) {
          const bmp = r.bitmaps[job.texs.length], t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bmp); gl.generateMipmap(gl.TEXTURE_2D);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
          gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
          if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
          job.bytes += bmp.width * bmp.height * 4 * 1.33; bmp.close(); job.texs.push(t);
          continue;
        }
        G.upq.shift(); n.state = 2;
        n.mesh = { vao: job.vao, bufs: job.bufs, texs: job.texs, groups: r.groups, bytes: job.bytes };
        G.bytes += job.bytes; G.loaded++;
      }
    }
    // the height datum: Google's heights are ellipsoid heights; the teaching ground is 55 ft. The ground near the
    // origin is the most common height among the samples (roofs and trees spread above it): the peak of a histogram.
    function datumStep() {
      if (G.manualOnly || G.frame % 20) return;
      if (G.samp.length < 30) return;
      const B = 0.5, lo = -120, nb = 440, hist = new Float32Array(nb);
      for (const v of G.samp) { const i = Math.floor((v - lo) / B); if (i >= 0 && i < nb) hist[i]++; }
      let best = -1, bv = 0; for (let i = 1; i < nb - 1; i++) { const v = hist[i - 1] + hist[i] * 2 + hist[i + 1]; if (v > bv) { bv = v; best = i; } }
      if (best < 0) return;
      const pk = lo + (best + 0.5) * B, target = GROUND_M - pk + 0.2;
      G.off = G.off == null ? target : G.off + Math.max(-0.2, Math.min(0.2, target - G.off));
    }
    const offset = () => (G.manual != null ? G.manual : G.off != null ? G.off : GROUND_M + 28);   // (before any sample: a rough Florida geoid guess)
    function evict(f) {
      const all = []; (function walk(n) { if (n.mesh) all.push(n); for (const c of n.children) walk(c); })(G.root);
      for (const n of all) if (n.used < f - 300) freeNode(n);
      if (G.bytes > 500e6) all.filter(n => n.mesh).sort((a, b) => a.used - b.used).slice(0, 30).forEach(freeNode);
    }
    function credits() {
      const cnt = new Map();
      for (const n of G.active) for (const c of (n.copyright || '').split(';')) { const t = c.trim(); if (t) cnt.set(t, (cnt.get(t) || 0) + 1); }
      G.credits = [...cnt.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]).join('; ');
    }
    function draw(glx, c) {
      if (!G.active.length) { G.drawn = 0; return; }
      gl.useProgram(prog);
      gl.uniformMatrix4fv(u.uVP, false, c.VP); gl.uniform1f(u.uOff, offset()); gl.uniform3fv(u.uCam, c.eye); gl.uniform3fv(u.uFog, c.fog); gl.uniform1f(u.uFogD, c.fogD); gl.uniform1f(u.uClip, COVER_R);
      gl.activeTexture(gl.TEXTURE0); gl.uniform1i(u.uTex, 0);
      let k = 0;
      for (const n of G.active) {
        const m = n.mesh; if (!m || m.empty) continue; k++;
        gl.bindVertexArray(m.vao);
        for (const g of m.groups) {
          if (g.img >= 0 && m.texs[g.img]) { gl.bindTexture(gl.TEXTURE_2D, m.texs[g.img]); gl.uniform1i(u.uHasTex, 1); } else gl.uniform1i(u.uHasTex, 0);
          gl.drawElements(gl.TRIANGLES, g.count, gl.UNSIGNED_INT, g.start * 4);
        }
      }
      gl.bindVertexArray(null); G.drawn = k;
    }
    return {
      setKey(k) { if (typeof k === 'string' && k !== KEY) { stop(false); KEY = k; } },
      hasKey: () => !!KEY,
      start, stop,
      active: () => G.state === 'on',
      hole: () => (G.state === 'on' && G.active.length ? { n: 0, e: 0, r: COVER_R } : null),
      update, draw,
      credits: () => G.credits,
      nudge(d) { if (d == null) { G.manual = null; return; } G.manual = (G.manual != null ? G.manual : offset()) + d; },
      status: () => ({ state: G.state, msg: G.msg, tiles: G.loaded, loading: G.upq.length + [...G.jobs.keys()].length, drawn: G.drawn, offset: G.manual != null ? G.manual : G.off, manual: G.manual != null, credits: G.credits, hasKey: !!KEY, worker: G.fallback ? 'page' : G.workers.length ? 'worker' : 'none' }),
    };
  }

  FL.google3d = { create, DECODER, COVER_R, ROOT_URL };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
