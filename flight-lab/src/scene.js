// FLIGHT LAB — scene.js
// The out-the-window view (WebGL2, no libraries): sky, the flat teaching ground with fields / roads / lakes,
// the fictional LAB RWY 36 airfield (markings, taxiway, apron, hangars, windsock, PAPI), fictional landmark towers
// at the training points, scattered trees and farm buildings, the aircraft for the chase view and the cockpit
// cowling for the cockpit view. Google Photorealistic 3D Tiles, when connected, are drawn by google3d.js through
// the hook in render(). Nothing here is a real place except where Google's own imagery is shown.
// GL world axes: x = east, y = up, z = south (= -north). NED (n, e, d) → GL (e, -d, -n).
(function (FL) {
  'use strict';
  const DEG = Math.PI / 180;
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const gl3 = (n, e, d) => [e, -d, -n];

  // ---------------------------------------------------------------- vectors and matrices (column-major)
  const V3 = {
    sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    scale: (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    norm: a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  };
  const M4 = {
    mul(a, b) { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; },
    persp(fy, asp, n, f) { const t = 1 / Math.tan(fy / 2); return new Float32Array([t / asp, 0, 0, 0, 0, t, 0, 0, 0, 0, (f + n) / (n - f), -1, 0, 0, 2 * f * n / (n - f), 0]); },
    // camera at eye looking along fwd with up (world vectors)
    view(eye, fwd, up) {
      const z = V3.norm(V3.scale(fwd, -1)), x = V3.norm(V3.cross(up, z)), y = V3.cross(z, x);
      return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -V3.dot(x, eye), -V3.dot(y, eye), -V3.dot(z, eye), 1]);
    },
    // model matrix from three axis vectors and a translation
    axes(x, y, z, t) { return new Float32Array([x[0], x[1], x[2], 0, y[0], y[1], y[2], 0, z[0], z[1], z[2], 0, t[0], t[1], t[2], 1]); },
    ident() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); },
    xform(m, v) { const x = v[0], y = v[1], z = v[2]; return [m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14], m[3] * x + m[7] * y + m[11] * z + m[15]]; },
  };

  // ---------------------------------------------------------------- shaders
  const FOG = `uniform vec3 uFog; uniform float uFogD; vec3 fog(vec3 c, float d) { return mix(uFog, c, exp(-d * uFogD)); }`;
  const SH = {
    sky: [`#version 300 es
      layout(location=0) in vec2 aP; out vec2 vP; void main() { vP = aP; gl_Position = vec4(aP, 0.9999, 1.0); }`,
      `#version 300 es
      precision highp float; in vec2 vP; out vec4 o; uniform mat4 uInvVP; uniform vec3 uSun, uFog, uZen;
      void main() {
        vec4 a = uInvVP * vec4(vP, 1.0, 1.0); vec4 b = uInvVP * vec4(vP, -1.0, 1.0);
        vec3 d = normalize(a.xyz / a.w - b.xyz / b.w);
        float h = clamp(d.y, -0.2, 1.0);
        vec3 c = mix(uFog, uZen, pow(clamp(h, 0.0, 1.0), 0.55));
        if (h < 0.0) c = uFog * 0.96;
        float s = max(dot(d, uSun), 0.0); c += vec3(1.0, 0.92, 0.75) * (pow(s, 900.0) * 2.0 + pow(s, 12.0) * 0.12);
        o = vec4(c, 1.0);
      }`],
    ground: [`#version 300 es
      layout(location=0) in vec3 aP; uniform mat4 uVP; uniform vec3 uOff; out vec3 vW;
      void main() { vW = aP + uOff; gl_Position = uVP * vec4(vW, 1.0); }`,
      `#version 300 es
      precision highp float; in vec3 vW; out vec4 o; uniform vec3 uCam; ${FOG}
      uniform vec4 uLakes[8]; uniform vec4 uRings[8]; uniform vec3 uRingCol[8]; uniform vec3 uHole;
      float h2(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }
      void main() {
        vec2 w = vec2(vW.x, -vW.z);
        if (uHole.z > 0.0 && distance(w, uHole.xy) < uHole.z) discard;
        float d = length(vW - uCam), nearK = 1.0 - smoothstep(900.0, 5000.0, d);
        vec2 cs = vec2(460.0, 320.0), cell = floor(w / cs); float r = h2(cell + 17.0);
        vec3 c = r < 0.30 ? vec3(0.34, 0.45, 0.22) : r < 0.55 ? vec3(0.42, 0.51, 0.26) : r < 0.68 ? vec3(0.52, 0.47, 0.32) : r < 0.82 ? vec3(0.58, 0.56, 0.37) : vec3(0.21, 0.33, 0.18);
        vec2 f = fract(w / cs), e = min(f, 1.0 - f) * cs; float edge = min(e.x, e.y), fw = max(fwidth(edge), 0.001);
        c *= 1.0 - 0.07 * (0.5 + 0.5 * sin((r > 0.5 ? w.x : w.y) * 0.9)) * nearK * (1.0 - smoothstep(0.0, 1.5, fw));
        c = mix(c * 0.72, c, mix(1.0, smoothstep(2.0 - fw, 6.0 + fw, edge), nearK));
        c *= 0.94 + 0.10 * h2(floor(w / 41.0)) * nearK;
        // roads on a 1.9 km grid (some cells only)
        vec2 rg = abs(fract(w / 1900.0 + 0.5) - 0.5) * 1900.0; vec2 rc = floor(w / 1900.0 + 0.5);
        float roadX = rg.x + (h2(rc + vec2(5.0, 1.0)) < 0.55 ? 0.0 : 1e5), roadY = rg.y + (h2(rc + vec2(2.0, 9.0)) < 0.55 ? 0.0 : 1e5);
        float road = min(roadX, roadY), rw = max(fwidth(road), 0.01);
        c = mix(vec3(0.40, 0.40, 0.39), c, smoothstep(3.5 - rw, 3.5 + rw, road));
        // lakes (irregular), a sandy shore
        for (int i = 0; i < 8; i++) {
          vec4 L = uLakes[i]; if (L.z <= 0.0) continue;
          vec2 q = w - L.xy; float a = atan(q.y, q.x), rr = L.z * (1.0 + 0.16 * sin(a * 3.0 + L.w) + 0.08 * sin(a * 7.0 + L.w * 2.0)), dl = length(q);
          float fl = max(fwidth(dl), 0.01);
          c = mix(vec3(0.60, 0.57, 0.45), c, smoothstep(rr + 6.0 - fl, rr + 12.0 + fl, dl));
          c = mix(vec3(0.17, 0.29, 0.37) + 0.04 * vec3(0.0, 0.1, 0.12) * nearK * sin(w.x * 0.05 + w.y * 0.03), c, smoothstep(rr - fl, rr + fl, dl));
        }
        // landmark rings around the training-point towers
        for (int i = 0; i < 8; i++) {
          vec4 R = uRings[i]; if (R.z <= 0.0) continue;
          float dr = abs(distance(w, R.xy) - R.z), fr = max(fwidth(dr), 0.01);
          c = mix(uRingCol[i], c, smoothstep(5.0 - fr, 9.0 + fr, dr));
        }
        o = vec4(fog(c, d), 1.0);
      }`],
    lit: [`#version 300 es
      layout(location=0) in vec3 aP; layout(location=1) in vec3 aN; layout(location=2) in vec3 aC;
      uniform mat4 uVP, uM; out vec3 vN, vC, vW;
      void main() { vec4 w = uM * vec4(aP, 1.0); vW = w.xyz; vN = mat3(uM) * aN; vC = aC; gl_Position = uVP * w; }`,
      `#version 300 es
      precision highp float; in vec3 vN, vC, vW; out vec4 o; uniform vec3 uSun, uCam; uniform float uAlpha; ${FOG}
      void main() { vec3 n = normalize(vN); if (dot(n, uCam - vW) < 0.0) n = -n; float l = max(dot(n, uSun), 0.0) * 0.72 + 0.30 + 0.08 * n.y; o = vec4(fog(vC * l, length(vW - uCam)), uAlpha); }`],
    tex: [`#version 300 es
      layout(location=0) in vec3 aP; layout(location=3) in vec2 aT; uniform mat4 uVP, uM; out vec2 vT; out vec3 vW;
      void main() { vec4 w = uM * vec4(aP, 1.0); vW = w.xyz; vT = aT; gl_Position = uVP * w; }`,
      `#version 300 es
      precision highp float; in vec2 vT; in vec3 vW; out vec4 o; uniform sampler2D uTex; uniform vec3 uCam; uniform float uBright; ${FOG}
      void main() { vec4 t = texture(uTex, vT); o = vec4(fog(t.rgb * uBright, length(vW - uCam)), t.a); }`],
    pts: [`#version 300 es
      layout(location=0) in vec3 aP; layout(location=2) in vec3 aC; uniform mat4 uVP; uniform vec3 uCam; out vec3 vC;
      void main() { gl_Position = uVP * vec4(aP, 1.0); vC = aC; gl_PointSize = clamp(2600.0 / max(length(aP - uCam), 1.0), 3.0, 14.0); }`,
      `#version 300 es
      precision highp float; in vec3 vC; out vec4 o; void main() { vec2 q = gl_PointCoord * 2.0 - 1.0; if (dot(q, q) > 1.0) discard; o = vec4(vC, 1.0); }`],
  };
  function compile(gl, vs, fs) {
    const mk = (t, s) => { const h = gl.createShader(t); gl.shaderSource(h, s); gl.compileShader(h); if (!gl.getShaderParameter(h, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(h)); return h; };
    const p = gl.createProgram(); gl.attachShader(p, mk(gl.VERTEX_SHADER, vs)); gl.attachShader(p, mk(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    const u = {}, n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i), nm = a.name.replace(/\[0\]$/, ''); u[nm] = gl.getUniformLocation(p, a.name); }
    return { p, u };
  }

  // ---------------------------------------------------------------- geometry builder (position, normal, colour, uv)
  function Geo() {
    const g = { pos: [], nrm: [], col: [], uv: [], idx: [] };
    const add = (p, n, c, t) => { g.pos.push(p[0], p[1], p[2]); g.nrm.push(n[0], n[1], n[2]); g.col.push(c[0], c[1], c[2]); g.uv.push(t ? t[0] : 0, t ? t[1] : 0); return g.pos.length / 3 - 1; };
    // a flat quad a b c d (counter-clockwise seen from the front)
    g.quad = (a, b, c, d, col, uvs) => {
      const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(d, a)));
      const i = add(a, n, col, uvs && uvs[0]); add(b, n, col, uvs && uvs[1]); add(c, n, col, uvs && uvs[2]); add(d, n, col, uvs && uvs[3]);
      g.idx.push(i, i + 1, i + 2, i, i + 2, i + 3);
    };
    g.tri = (a, b, c, col) => { const n = V3.norm(V3.cross(V3.sub(b, a), V3.sub(c, a))); const i = add(a, n, col); add(b, n, col); add(c, n, col); g.idx.push(i, i + 1, i + 2); };
    // a six-faced solid from 8 corners: bottom 0-3, top 4-7 (same order, counter-clockwise from above in a y-up frame)
    g.hexa = (C, col, skipBottom) => {
      const [a, b, c, d, e, f, h, k] = C;
      g.quad(e, f, h, k, col); if (!skipBottom) g.quad(d, c, b, a, col);
      g.quad(a, b, f, e, col); g.quad(b, c, h, f, col); g.quad(c, d, k, h, col); g.quad(d, a, e, k, col);
    };
    // an axis-aligned box in GL coordinates (x east, y up, z south)
    g.box = (x0, y0, z0, x1, y1, z1, col, skipBottom = true) => g.hexa([[x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], [x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]], col, skipBottom);
    g.build = (gl, withUV) => {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      const buf = (loc, data, n) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, n, gl.FLOAT, false, 0, 0); };
      buf(0, g.pos, 3); buf(1, g.nrm, 3); buf(2, g.col, 3); if (withUV) buf(3, g.uv, 2);
      const ib = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(g.idx), gl.STATIC_DRAW);
      gl.bindVertexArray(null);
      return { vao, n: g.idx.length };
    };
    return g;
  }
  // deterministic random numbers (the same scenery every time)
  function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

  // ---------------------------------------------------------------- the runway's markings (canvas texture)
  function runwayTexture(gl, aniso) {
    const W = 128, H = 4096, cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(W, H) : Object.assign(document.createElement('canvas'), { width: W, height: H });
    const g = cv.getContext('2d'), mpp = 1200 / H, xm = W / 30;              // metres per pixel along / across
    g.fillStyle = '#3d3f42'; g.fillRect(0, 0, W, H);
    // a little texture in the asphalt
    const r = rng(9); for (let i = 0; i < 9000; i++) { const v = 50 + r() * 22; g.fillStyle = `rgb(${v},${v},${v + 2})`; g.fillRect(r() * W, r() * H, 1 + r() * 2, 1 + r() * 3); }
    for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(20,20,20,0.18)'; g.fillRect(W / 2 - 10 + r() * 20, r() * H, 6 + r() * 6, 60 + r() * 120); }   // tyre marks
    const yOf = along => H - along / mpp;                                       // along 0 = the threshold of 36 (bottom of the texture)
    g.fillStyle = '#e9ecef';
    // edge lines
    g.fillRect(xm * 0.6, 0, xm * 0.9, H); g.fillRect(W - xm * 1.5, 0, xm * 0.9, H);
    const ends = (flip) => {
      const Y = a => (flip ? H - yOf(a) : yOf(a)), rect = (x, a, w, len) => { const y1 = Y(a), y2 = Y(a + len); g.fillRect(x, Math.min(y1, y2), w, Math.abs(y2 - y1)); };
      for (let k = 0; k < 8; k++) { const x = xm * (2.2 + k * 3.35) + (k >= 4 ? xm * 1.4 : 0); rect(x, 6, xm * 1.8, 30); }       // threshold stripes
      // the runway number
      g.save(); const yy = Y(48); g.translate(W / 2, yy); if (flip) g.rotate(Math.PI);
      g.font = `bold ${Math.round(18 / mpp)}px Arial, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'top'; g.scale(1, 1);
      g.fillText(flip ? '18' : '36', 0, -Math.round(18 / mpp) - 2); g.restore();
      // touchdown zone and aiming point markings
      for (const [a, n] of [[150, 3], [300, 0], [450, 2]]) { for (const side of [-1, 1]) { if (n === 0) { rect(W / 2 + side * xm * 4.5 - (side < 0 ? xm * 4 : 0), a, xm * 4, 45); continue; } for (let j = 0; j < n; j++) rect(W / 2 + side * (xm * 3.5 + j * xm * 1.6) - (side < 0 ? xm * 1 : 0), a, xm * 1, 22); } }
    };
    ends(false); ends(true);
    // centre line dashes (36 m line, 24 m gap: teaching proportions)
    for (let a = 80; a < 1120; a += 60) { const y1 = yOf(a), y2 = yOf(a + 36); g.fillRect(W / 2 - xm * 0.45, y2, xm * 0.9, y1 - y2); }
    const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, cv);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    if (aniso) gl.texParameterf(gl.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    return t;
  }

  // ---------------------------------------------------------------- the static world (built once)
  const LANDMARKS = [   // the coloured towers at the fictional training points (teaching scenery)
    { id: 'LABEA', col: [0.95, 0.55, 0.12], label: 'LAB-A（橙の塔）' },
    { id: 'LABEB', col: [0.20, 0.75, 0.30], label: 'LAB-B（緑の塔）' },
    { id: 'LABEC', col: [0.20, 0.50, 0.95], label: 'LAB-C（青の塔）' },
    { id: 'LABED', col: [0.95, 0.85, 0.15], label: 'LAB-D（黄の塔）' },
    { id: 'LABEF', col: [0.90, 0.25, 0.80], label: 'LAB-F（紫の塔）' },
  ];
  const LAKES = () => FL.physics.LAKES;   // n, e, radius m, shape seed (the same water the wheels find)

  function buildWorld(gl, P, A) {
    const R = P.LAB_RWY, G = P.GROUND_M, out = {};
    const at = (along, cross, up = 0) => { const [n, e] = P.rwyToNE(R, along, cross); return gl3(n, e, -(G + up)); };
    // runway (textured decal)
    const rw = Geo();
    rw.quad(at(0, -R.wid / 2, 0.02), at(0, R.wid / 2, 0.02), at(R.len, R.wid / 2, 0.02), at(R.len, -R.wid / 2, 0.02), [1, 1, 1], [[0, 1], [1, 1], [1, 0], [0, 0]]);
    out.runway = rw.build(gl, true);
    // taxiway, connectors, apron (flat decals), blast pads
    const dc = Geo(), tw = [0.30, 0.31, 0.32], ap = [0.36, 0.37, 0.38], yel = [0.85, 0.72, 0.15];
    const flat = (a0, a1, c0, c1, col, up = 0.015) => dc.quad(at(a0, c0, up), at(a0, c1, up), at(a1, c1, up), at(a1, c0, up), col);
    flat(-40, 0, -R.wid / 2, R.wid / 2, [0.33, 0.33, 0.33]); flat(R.len, R.len + 40, -R.wid / 2, R.wid / 2, [0.33, 0.33, 0.33]);
    flat(-10, R.len + 10, 95, 110, tw);                                                // parallel taxiway (east side)
    for (const a of [10, 600, R.len - 25]) flat(a, a + 15, R.wid / 2, 95, tw);        // connectors
    flat(450, 750, 110, 230, ap);                                                      // apron
    flat(-10, R.len + 10, 102.2, 102.8, yel, 0.02);                                    // taxiway centre line
    for (const a of [10, 600, R.len - 25]) flat(a + 7.2, a + 7.8, R.wid / 2 + 2, 95, yel, 0.02);
    for (const a of [10, 600, R.len - 25]) for (let k = 0; k < 4; k++) flat(a + 1 + k * 3.5, a + 2.5 + k * 3.5, R.wid / 2 + 22, R.wid / 2 + 23.2, yel, 0.022);   // hold-short marks
    out.decals = dc.build(gl);
    // buildings: hangars, a small terminal, the windsock pole and cone, a fuel tank
    const ob = Geo(), white = [0.86, 0.86, 0.84], grey = [0.62, 0.64, 0.66], red = [0.75, 0.18, 0.15], blue = [0.25, 0.38, 0.62];
    // (faces are lit from both sides, so the winding does not matter)
    const boxRw2 = (a0, a1, c0, c1, h, col) => { const p = [at(a0, c0), at(a0, c1), at(a1, c1), at(a1, c0)]; ob.hexa([...p, ...p.map(q => [q[0], q[1] + h, q[2]])], col, true); };
    boxRw2(470, 520, 240, 280, 9, grey); boxRw2(540, 590, 240, 280, 9, grey); boxRw2(610, 660, 240, 280, 9, white); boxRw2(690, 730, 235, 265, 6, blue);
    boxRw2(680, 690, 300, 310, 4, white);
    // the control-tower-like building (fictional, decorative) and the "LAB" sign board
    boxRw2(740, 750, 236, 246, 14, white); boxRw2(739, 751, 235, 247, 2.4, [0.15, 0.2, 0.25]);
    out.objs = ob.build(gl);
    out.objsN = ob.idx.length;
    // windsock: the pole (box), the cone is rebuilt each frame from the wind (small)
    out.sockAt = at(250, -45);
    // PAPI (left side, 300 m in): four lights
    out.papi = [0, 1, 2, 3].map(k => at(300, -R.wid / 2 - 15 - k * 9, 0.5));
    // landmark towers at the training points
    const tw2 = Geo(), labels = [];
    for (const L of LANDMARKS) {
      const w = A.wpt(L.id); if (!w) continue;
      const b = gl3(w.n, w.e, -G);
      for (let k = 0; k < 8; k++) { const c = k % 2 ? [0.92, 0.92, 0.92] : L.col; tw2.box(b[0] - 3, b[1] + k * 10, b[2] - 3, b[0] + 3, b[1] + (k + 1) * 10, b[2] + 3, c); }
      // a ball-like top (octahedron)
      const t = [b[0], b[1] + 92, b[2]], s = 8, P6 = [[t[0] + s, t[1], t[2]], [t[0], t[1], t[2] - s], [t[0] - s, t[1], t[2]], [t[0], t[1], t[2] + s]];
      for (let i = 0; i < 4; i++) { const p = P6[i], q = P6[(i + 1) % 4]; tw2.tri([t[0], t[1] + s, t[2]], q, p, L.col); tw2.tri([t[0], t[1] - s, t[2]], p, q, L.col); }
      labels.push({ id: L.id, label: L.label, pos: [t[0], t[1] + 14, t[2]] });
    }
    // the fictional VOR (white disc building and a cone)
    for (const n of A.NAVAIDS) if (n.type === 'VOR') {
      const b = gl3(n.n, n.e, -G);
      tw2.box(b[0] - 9, b[1], b[2] - 9, b[0] + 9, b[1] + 4, b[2] + 9, [0.9, 0.9, 0.9]);
      for (let i = 0; i < 8; i++) { const a1 = i / 8 * 2 * Math.PI, a2 = (i + 1) / 8 * 2 * Math.PI; tw2.tri([b[0], b[1] + 14, b[2]], [b[0] + Math.cos(a2) * 6, b[1] + 4, b[2] + Math.sin(a2) * 6], [b[0] + Math.cos(a1) * 6, b[1] + 4, b[2] + Math.sin(a1) * 6], [0.95, 0.95, 0.95]); }
      labels.push({ id: n.id, label: 'LBV（架空 VOR）', pos: [b[0], b[1] + 30, b[2]] });
    }
    out.towers = tw2.build(gl); out.labels = labels;
    // scattered trees and farm buildings around the practice area (deterministic), kept away from the runway
    const sc = Geo(), r = rng(42), cLAB = [R.n, R.e];
    for (let i = 0; i < 2600; i++) {
      const n = cLAB[0] + (r() - 0.5) * 50000, e = cLAB[1] + (r() - 0.5) * 50000;
      if (e > -16000) continue;                                            // stay out of the Sanford display area
      const rc = P.rwyCoords(R, n, e); if (rc.along > -900 && rc.along < R.len + 900 && Math.abs(rc.cross) < 450) continue;
      if (LAKES().some(L => Math.hypot(n - L[0], e - L[1]) < L[2] * 1.3)) continue;
      const b = gl3(n, e, -G);
      if (r() < 0.82) {   // a clump of trees: a few cones
        const k = 2 + Math.floor(r() * 5);
        for (let j = 0; j < k; j++) {
          const x = b[0] + (r() - 0.5) * 60, z = b[2] + (r() - 0.5) * 60, h = 9 + r() * 12, rad = 3 + r() * 3, col = [0.13 + r() * 0.06, 0.26 + r() * 0.08, 0.11];
          for (let q = 0; q < 5; q++) { const a1 = q / 5 * 2 * Math.PI, a2 = (q + 1) / 5 * 2 * Math.PI; sc.tri([x, b[1] + h, z], [x + Math.cos(a2) * rad, b[1] + h * 0.18, z + Math.sin(a2) * rad], [x + Math.cos(a1) * rad, b[1] + h * 0.18, z + Math.sin(a1) * rad], col); }
        }
      } else {            // a farm building with a pitched roof
        const w = 8 + r() * 14, d = 6 + r() * 10, h = 4 + r() * 4, wc = r() < 0.5 ? [0.80, 0.78, 0.72] : [0.62, 0.30, 0.22], rc2 = r() < 0.5 ? [0.35, 0.36, 0.38] : [0.55, 0.20, 0.15];
        sc.box(b[0] - w / 2, b[1], b[2] - d / 2, b[0] + w / 2, b[1] + h, b[2] + d / 2, wc);
        sc.quad([b[0] - w / 2, b[1] + h, b[2] + d / 2], [b[0] + w / 2, b[1] + h, b[2] + d / 2], [b[0] + w / 2, b[1] + h + 3, b[2]], [b[0] - w / 2, b[1] + h + 3, b[2]], rc2);
        sc.quad([b[0] + w / 2, b[1] + h, b[2] - d / 2], [b[0] - w / 2, b[1] + h, b[2] - d / 2], [b[0] - w / 2, b[1] + h + 3, b[2]], [b[0] + w / 2, b[1] + h + 3, b[2]], rc2);
      }
    }
    out.scenery = sc.build(gl);
    return out;
  }

  // the inside view: glareshield, instrument panel face, cowling, window posts (body frame)
  function buildCockpit(gl, spinner = true) {
    const g = Geo(), dark = [0.08, 0.09, 0.10], panel = [0.20, 0.21, 0.23], cowl = [0.90, 0.90, 0.87], post = [0.12, 0.12, 0.13];
    // the cowling: a rounded hump from the windscreen forward and down (a ridge in the middle, the sides lower),
    // with a dark anti-glare band along the top
    const ridge = x => -0.47 + (x - 0.95) / 1.8 * 0.20, side = x => ridge(x) + 0.16, hw = x => 0.58 - (x - 0.95) / 1.8 * 0.22;
    const X = [0.95, 1.4, 1.85, 2.3, 2.75];
    for (let i = 0; i < X.length - 1; i++) {
      const a = X[i], b = X[i + 1];
      for (const sg of [-1, 1]) {
        g.quad([a, sg * 0.10, ridge(a)], [b, sg * 0.10, ridge(b)], [b, sg * 0.22, ridge(b) + 0.015], [a, sg * 0.22, ridge(a) + 0.015], [0.16, 0.18, 0.22]);
        g.quad([a, sg * 0.22, ridge(a) + 0.015], [b, sg * 0.22, ridge(b) + 0.015], [b, sg * hw(b), side(b)], [a, sg * hw(a), side(a)], cowl);
      }
      g.quad([a, -0.10, ridge(a)], [b, -0.10, ridge(b)], [b, 0.10, ridge(b)], [a, 0.10, ridge(a)], [0.16, 0.18, 0.22]);
    }
    g.quad([2.75, -hw(2.75), side(2.75)], [2.75, hw(2.75), side(2.75)], [2.95, 0.15, 0.0], [2.95, -0.15, 0.0], cowl);
    // the spinner tip just visible over the nose
    if (spinner) g.tri([2.75, -0.12, ridge(2.75) + 0.05], [2.75, 0.12, ridge(2.75) + 0.05], [3.05, 0, ridge(2.75) + 0.12], [0.85, 0.85, 0.85]);
    // the glareshield (dark top of the panel) and the panel face
    g.quad([0.95, -0.66, -0.50], [0.95, 0.66, -0.50], [0.55, 0.66, -0.53], [0.55, -0.66, -0.53], dark);
    g.quad([0.55, -0.66, -0.53], [0.55, 0.66, -0.53], [0.55, 0.66, 0.30], [0.55, -0.66, 0.30], panel);
    // slim windscreen posts at the sides (outside the middle of the view)
    for (const y of [-0.70, 0.70]) { const d = Math.sign(y) * 0.025; g.quad([0.95, y - d, -0.5], [0.95, y + d, -0.5], [0.70, y + d, -1.2], [0.70, y - d, -1.2], post); }
    return g.build(gl);
  }

  // ---------------------------------------------------------------- the scene object
  function createScene(canvas, opt = {}) {
    const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!opt.preserve });
    if (!gl) return null;
    const P = FL.physics, A = FL.avionics;
    const prog = {}; for (const k of Object.keys(SH)) prog[k] = compile(gl, SH[k][0], SH[k][1]);
    const aniso = gl.getExtension('EXT_texture_filter_anisotropic');
    const world = buildWorld(gl, P, A), cockpits = { 1: buildCockpit(gl, true), 2: buildCockpit(gl, false) }, rwyTex = runwayTexture(gl, aniso);
    // the aircraft models (built from the flight model's description by acmesh.js), uploaded once per type
    const acCache = {};
    function upload(m) {
      const vao = gl.createVertexArray(); gl.bindVertexArray(vao);
      [m.pos, m.nrm, m.col].forEach((d, i) => { const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, d, gl.STATIC_DRAW); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 0, 0); });
      gl.bindVertexArray(null);
      return { vao, n: m.count };
    }
    const aircraftParts = A0 => acCache[A0.id] || (acCache[A0.id] = FL.acmesh.buildParts(A0).map(p => ({ ...p, gpu: upload(p.mesh) })));
    // full-screen triangle for the sky, the ground quad
    const quadVao = (() => { const v = gl.createVertexArray(); gl.bindVertexArray(v); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return v; })();
    const RG = 120000;
    const groundVao = (() => { const v = gl.createVertexArray(); gl.bindVertexArray(v); const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b); const y = P.GROUND_M; gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-RG, y, -RG, RG, y, -RG, RG, y, RG, -RG, y, -RG, RG, y, RG, -RG, y, RG]), gl.STATIC_DRAW); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0); gl.bindVertexArray(null); return v; })();
    // dynamic little meshes: the windsock cone, the PAPI points, the shadow
    const dyn = { vao: gl.createVertexArray(), bufs: [gl.createBuffer(), gl.createBuffer(), gl.createBuffer()], n: 0 };
    gl.bindVertexArray(dyn.vao);
    for (let i = 0; i < 3; i++) { gl.bindBuffer(gl.ARRAY_BUFFER, dyn.bufs[i]); gl.enableVertexAttribArray(i); gl.vertexAttribPointer(i, 3, gl.FLOAT, false, 0, 0); }
    gl.bindVertexArray(null);
    const drawDyn = (g, mode) => {
      gl.bindVertexArray(dyn.vao);
      const pos = new Float32Array(g.pos), nrm = new Float32Array(g.nrm), col = new Float32Array(g.col);
      [pos, nrm, col].forEach((d, i) => { gl.bindBuffer(gl.ARRAY_BUFFER, dyn.bufs[i]); gl.bufferData(gl.ARRAY_BUFFER, d, gl.DYNAMIC_DRAW); });
      if (mode === gl.POINTS) gl.drawArrays(gl.POINTS, 0, pos.length / 3);
      else { const idx = new Uint32Array(g.idx), ib = dyn.ib || (dyn.ib = gl.createBuffer()); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ib); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, idx, gl.DYNAMIC_DRAW); gl.drawElements(gl.TRIANGLES, idx.length, gl.UNSIGNED_INT, 0); }
      gl.bindVertexArray(null);
    };
    const lakesU = new Float32Array(32), ringsU = new Float32Array(32), ringCol = new Float32Array(24);
    LAKES().forEach((L, i) => { const g = gl3(L[0], L[1], 0); lakesU.set([g[0], -g[2], L[2], L[3]], i * 4); });
    LANDMARKS.forEach((L, i) => { const w = A.wpt(L.id); if (!w) return; ringsU.set([w.e, w.n, 140, 0], i * 4); ringCol.set(L.col, i * 3); });
    const SUN = V3.norm([0.45, 0.78, 0.43]), FOGC = [0.73, 0.80, 0.88], ZEN = [0.30, 0.50, 0.80];
    let cam = null, smoothPsi = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, opt.maxDpr || 1.5), w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    }
    // the camera from the aircraft state
    function camera(s, view, look) {
      const q = s.q, rot = v => P.qrot(q, v);
      const pos = s.pos.slice(), bx = rot([1, 0, 0]), by = rot([0, 1, 0]), bz = rot([0, 0, 1]);
      const model = M4.axes(bx, by, bz, pos), fwdB = rot([0, 0, -1]);
      const psi = Math.atan2(fwdB[0], -fwdB[2]);
      let eye, fwd, up;
      if (view === 'chase') {
        if (smoothPsi == null) smoothPsi = psi;
        smoothPsi += Math.atan2(Math.sin(psi - smoothPsi), Math.cos(psi - smoothPsi)) * 0.08;
        const yaw = smoothPsi + (look || 0) * DEG, back = [-Math.sin(yaw), 0, Math.cos(yaw)];   // GL: forward = (sin ψ, 0, -cos ψ)
        const dist = 8 + 1.0 * (s.A.phys.L || 7);
        eye = V3.add(pos, V3.add(V3.scale(back, dist), [0, 2.6, 0]));
        eye[1] = Math.max(eye[1], P.GROUND_M + 1.5);
        fwd = V3.norm(V3.sub(V3.add(pos, [0, 0.9, 0]), eye)); up = [0, 1, 0];
      } else {
        smoothPsi = null;
        eye = V3.add(pos, rot(s.A.eye));
        const lk = (look || 0) * DEG;
        fwd = V3.norm(V3.add(V3.scale(fwdB, Math.cos(lk)), V3.scale(bx, Math.sin(lk)))); up = by;
      }
      // the v1 cockpit mesh is in an (x forward, y right, z down) frame around its own eye point (0.05, −0.30, −0.72)
      const off = V3.sub(s.A.eye, [-0.30, 0.72, -0.05]);
      const cockpitM = M4.axes(fwdB, bx, V3.scale(by, -1), V3.add(pos, rot(off)));
      return { eye, fwd, up, model, cockpitM, bx, by, bz, pos, psi };
    }
    function render(st) {
      resize();
      const s = st.s, W = canvas.width, H = canvas.height, asp = W / H, view = st.view || 'cockpit';
      const c = camera(s, view, st.look);
      const fovY = (view === 'chase' ? 50 : 52) * DEG;
      const V = M4.view(c.eye, c.fwd, c.up), Pm = M4.persp(fovY, asp, 2.0, 140000), VP = M4.mul(Pm, V);
      cam = { VP, V, P: Pm, eye: c.eye, fwd: c.fwd, up: c.up, fovY, asp, W, H };
      gl.viewport(0, 0, W, H);
      gl.clearColor(FOGC[0], FOGC[1], FOGC[2], 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      const fogD = 1 / (st.visibility || 22000);
      // sky
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      gl.useProgram(prog.sky.p);
      gl.uniformMatrix4fv(prog.sky.u.uInvVP, false, invert(VP)); gl.uniform3fv(prog.sky.u.uSun, SUN); gl.uniform3fv(prog.sky.u.uFog, FOGC); gl.uniform3fv(prog.sky.u.uZen, ZEN);
      gl.bindVertexArray(quadVao); gl.drawArrays(gl.TRIANGLES, 0, 3);
      // ground (re-centred under the camera every frame; the pattern is computed from world coordinates)
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true); gl.depthFunc(gl.LEQUAL);
      gl.useProgram(prog.ground.p); const gu = prog.ground.u;
      gl.uniformMatrix4fv(gu.uVP, false, VP); gl.uniform3fv(gu.uOff, [Math.round(c.eye[0] / 1000) * 1000, 0, Math.round(c.eye[2] / 1000) * 1000]);
      gl.uniform3fv(gu.uCam, c.eye); gl.uniform3fv(gu.uFog, FOGC); gl.uniform1f(gu.uFogD, fogD);
      gl.uniform4fv(gu.uLakes, lakesU); gl.uniform4fv(gu.uRings, ringsU); gl.uniform3fv(gu.uRingCol, ringCol);
      gl.uniform3fv(gu.uHole, st.hole ? [st.hole.e, st.hole.n, st.hole.r] : [0, 0, 0]);
      gl.bindVertexArray(groundVao); gl.drawArrays(gl.TRIANGLES, 0, 6);
      // flat decals on the ground (no depth test: the ground is flat; later solids still hide them correctly)
      gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
      useLit(VP, c.eye, fogD, M4.ident(), 1);
      gl.bindVertexArray(world.decals.vao); gl.drawElements(gl.TRIANGLES, world.decals.n, gl.UNSIGNED_INT, 0);
      gl.useProgram(prog.tex.p); const tu = prog.tex.u;
      gl.uniformMatrix4fv(tu.uVP, false, VP); gl.uniformMatrix4fv(tu.uM, false, M4.ident()); gl.uniform3fv(tu.uCam, c.eye); gl.uniform3fv(tu.uFog, FOGC); gl.uniform1f(tu.uFogD, fogD); gl.uniform1f(tu.uBright, 1.0);
      gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, rwyTex); gl.uniform1i(tu.uTex, 0);
      gl.bindVertexArray(world.runway.vao); gl.drawElements(gl.TRIANGLES, world.runway.n, gl.UNSIGNED_INT, 0);
      // the aircraft's shadow (sun nearly overhead: a soft dark shape under the aircraft), outside Google's area
      const agl = s.pos[1] + s.WHEEL_BOTTOM - P.GROUND_M;
      if (agl < 200 && !(st.hole && Math.hypot(-s.pos[2] - st.hole.n, s.pos[0] - st.hole.e) < st.hole.r)) shadow(s, agl, VP, c, fogD);
      gl.enable(gl.DEPTH_TEST); gl.depthMask(true);
      // Google Photorealistic 3D Tiles (google3d.js), when connected
      if (st.extra) st.extra(gl, { VP, eye: c.eye, fog: FOGC, fogD });
      // solids: buildings, towers, scenery
      useLit(VP, c.eye, fogD, M4.ident(), 1);
      for (const m of [world.objs, world.towers, world.scenery]) { gl.bindVertexArray(m.vao); gl.drawElements(gl.TRIANGLES, m.n, gl.UNSIGNED_INT, 0); }
      windsock(s, st.wind || s.wind);
      // PAPI: white above the light's angle, red below
      papi(c.eye, VP);
      // the aircraft (chase view) or the cockpit (cockpit view, its own depth range)
      if (view === 'chase') drawAircraft(s, VP, c, fogD);
      else {
        gl.clear(gl.DEPTH_BUFFER_BIT);
        const Pn = M4.persp(fovY, asp, 0.1, 20), VPn = M4.mul(Pn, V), ck = cockpits[s.A.engines[0].type === 'nose' ? 1 : 2];
        useLit(VPn, c.eye, 0, c.cockpitM, 1);
        gl.bindVertexArray(ck.vao); gl.drawElements(gl.TRIANGLES, ck.n, gl.UNSIGNED_INT, 0);
      }
      gl.bindVertexArray(null);
      return cam;
    }
    // the aircraft: each part with its own hinge rotation (control surfaces, propellers, gear)
    function partMatrix(base, p, s) {
      if (!p.pivot || !p.angle) return base;
      const r = FL.acmesh.axisAngle(p.axis, p.angle(s) || 0), c = p.pivot;
      const t = [c[0] - (r[0] * c[0] + r[1] * c[1] + r[2] * c[2]), c[1] - (r[3] * c[0] + r[4] * c[1] + r[5] * c[2]), c[2] - (r[6] * c[0] + r[7] * c[1] + r[8] * c[2])];
      const L = new Float32Array([r[0], r[3], r[6], 0, r[1], r[4], r[7], 0, r[2], r[5], r[8], 0, t[0], t[1], t[2], 1]);
      return M4.mul(base, L);
    }
    function drawAircraft(s, VP, c, fogD) {
      const parts = aircraftParts(s.A);
      for (const p of parts) {
        if (p.disc != null) continue;
        if (p.gear && s.gearPos <= 0.01) continue;
        if (p.prop != null) { const e = s.eng[p.prop]; if (e && (e.rpm || 0) > 900) continue; }
        useLit(VP, c.eye, fogD, partMatrix(c.model, p, s), 1);
        gl.bindVertexArray(p.gpu.vao); gl.drawArrays(gl.TRIANGLES, 0, p.gpu.n);
      }
      // spinning propellers: a faint disc
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      for (const p of parts) {
        if (p.disc == null) continue;
        const e = s.eng[p.disc], rpm = e ? e.rpm || 0 : 0; if (rpm < 500) continue;
        useLit(VP, c.eye, fogD, c.model, clamp((rpm - 500) / 1500, 0, 1) * 0.3);
        gl.bindVertexArray(p.gpu.vao); gl.drawArrays(gl.TRIANGLES, 0, p.gpu.n);
      }
      gl.disable(gl.BLEND); gl.depthMask(true);
    }
    function useLit(VP, eye, fogD, M, alpha) {
      gl.useProgram(prog.lit.p); const u = prog.lit.u;
      gl.uniformMatrix4fv(u.uVP, false, VP); gl.uniformMatrix4fv(u.uM, false, M); gl.uniform3fv(u.uSun, SUN); gl.uniform3fv(u.uCam, eye);
      gl.uniform3fv(u.uFog, FOGC); gl.uniform1f(u.uFogD, fogD); gl.uniform1f(u.uAlpha, alpha);
    }
    function shadow(s, agl, VP, c, fogD) {
      const g = Geo(), k = clamp(1 - agl / 200, 0, 1), col = [0.10, 0.12, 0.08].map(v => v + (1 - k) * 0.25);
      const fb = P.qrot(s.q, [0, 0, -1]), ps = Math.atan2(fb[0], -fb[2]), fx = Math.sin(ps), fz = -Math.cos(ps), rx = Math.cos(ps), rz = Math.sin(ps), y = P.GROUND_M + 0.03;
      const p = [s.pos[0], 0, s.pos[2]], at = (f, r) => [p[0] + fx * f + rx * r, y, p[2] + fz * f + rz * r];
      const A0 = s.A, sp = A0.wing.tipX, nose = -A0.fuse[0][0], tail = -A0.fuse[A0.fuse.length - 1][0], hs = A0.hstab.span;
      g.quad(at(0.6, -sp), at(0.6, sp), at(-1.0, sp), at(-1.0, -sp), col);
      g.quad(at(nose, -0.6), at(nose, 0.6), at(tail, 0.6), at(tail, -0.6), col);
      g.quad(at(tail + 0.8, -hs), at(tail + 0.8, hs), at(tail, hs), at(tail, -hs), col);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      useLit(VP, c.eye, fogD, M4.ident(), 0.25 + 0.4 * k);
      drawDyn(g, gl.TRIANGLES);
      gl.disable(gl.BLEND);
    }
    function windsock(s, wnd) {
      const g = Geo(), b = world.sockAt, wk = clamp((wnd.kt || 0) / 15, 0, 1);
      g.box(b[0] - 0.12, b[1], b[2] - 0.12, b[0] + 0.12, b[1] + 6.5, b[2] + 0.12, [0.7, 0.7, 0.7]);
      // the cone points downwind (where the wind goes), drooping in light wind
      const to = ((wnd.fromDeg || 0) + 180) * DEG, dx = Math.sin(to), dz = -Math.cos(to), droop = 1 - wk;
      const top = [b[0], b[1] + 6.3, b[2]];
      for (let i = 0; i < 5; i++) {
        const a0 = i / 5, a1 = (i + 1) / 5, r0 = 0.45 - a0 * 0.25, r1 = 0.45 - a1 * 0.25, col = i % 2 ? [0.95, 0.95, 0.95] : [0.95, 0.40, 0.10];
        const c0 = [top[0] + dx * a0 * 3.2 * (0.3 + 0.7 * wk), top[1] - a0 * 2.6 * droop, top[2] + dz * a0 * 3.2 * (0.3 + 0.7 * wk)], c1 = [top[0] + dx * a1 * 3.2 * (0.3 + 0.7 * wk), top[1] - a1 * 2.6 * droop, top[2] + dz * a1 * 3.2 * (0.3 + 0.7 * wk)];
        const sx = -dz, sz = dx;
        g.quad([c0[0] - sx * r0, c0[1], c0[2] - sz * r0], [c1[0] - sx * r1, c1[1], c1[2] - sz * r1], [c1[0], c1[1] + r1, c1[2]], [c0[0], c0[1] + r0, c0[2]], col);
        g.quad([c0[0], c0[1] + r0, c0[2]], [c1[0], c1[1] + r1, c1[2]], [c1[0] + sx * r1, c1[1], c1[2] + sz * r1], [c0[0] + sx * r0, c0[1], c0[2] + sz * r0], col);
        g.quad([c0[0] + sx * r0, c0[1], c0[2] + sz * r0], [c1[0] + sx * r1, c1[1], c1[2] + sz * r1], [c1[0], c1[1] - r1, c1[2]], [c0[0], c0[1] - r0, c0[2]], col);
        g.quad([c0[0], c0[1] - r0, c0[2]], [c1[0], c1[1] - r1, c1[2]], [c1[0] - sx * r1, c1[1], c1[2] - sz * r1], [c0[0] - sx * r0, c0[1], c0[2] - sz * r0], col);
      }
      gl.disable(gl.CULL_FACE);
      drawDyn(g, gl.TRIANGLES);
    }
    function papi(eye, VP) {
      const g = { pos: [], nrm: [], col: [], idx: [] }, R = P.LAB_RWY;
      // angles of the four units (outer = lowest): 2.5°, 2.83°, 3.17°, 3.5° (teaching values for a 3° path)
      const th = [3.5, 3.17, 2.83, 2.5];
      world.papi.forEach((p, i) => {
        const dh = eye[1] - p[1], dist = Math.hypot(eye[0] - p[0], eye[2] - p[2]), ang = Math.atan2(dh, dist) / DEG;
        const rc = P.rwyCoords(R, -eye[2], eye[0]);
        const vis = rc.along < 300 && dist < 9000;
        if (!vis) return;
        g.pos.push(p[0], p[1], p[2]); g.nrm.push(0, 1, 0); g.col.push(...(ang > th[i] ? [1, 1, 1] : [1, 0.12, 0.08]));
      });
      if (!g.pos.length) return;
      gl.useProgram(prog.pts.p); gl.uniformMatrix4fv(prog.pts.u.uVP, false, VP); gl.uniform3fv(prog.pts.u.uCam, eye);
      drawDyn(g, gl.POINTS);
    }
    // project a world point to CSS pixels (labels); null when behind the camera
    function project(p) {
      if (!cam) return null;
      const v = M4.xform(cam.VP, p); if (v[3] <= 0.5) return null;
      const x = (v[0] / v[3] * 0.5 + 0.5) * canvas.clientWidth, y = (1 - (v[1] / v[3] * 0.5 + 0.5)) * canvas.clientHeight;
      return { x, y, dist: v[3] };
    }
    return { gl, render, resize, project, labels: world.labels, camera: () => cam };
  }
  // 4×4 inverse (for the sky's view rays)
  function invert(m) {
    const a = m, o = new Float32Array(16);
    const b00 = a[0] * a[5] - a[1] * a[4], b01 = a[0] * a[6] - a[2] * a[4], b02 = a[0] * a[7] - a[3] * a[4], b03 = a[1] * a[6] - a[2] * a[5], b04 = a[1] * a[7] - a[3] * a[5], b05 = a[2] * a[7] - a[3] * a[6];
    const b06 = a[8] * a[13] - a[9] * a[12], b07 = a[8] * a[14] - a[10] * a[12], b08 = a[8] * a[15] - a[11] * a[12], b09 = a[9] * a[14] - a[10] * a[13], b10 = a[9] * a[15] - a[11] * a[13], b11 = a[10] * a[15] - a[11] * a[14];
    let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06; if (!det) return o; det = 1 / det;
    o[0] = (a[5] * b11 - a[6] * b10 + a[7] * b09) * det; o[1] = (a[2] * b10 - a[1] * b11 - a[3] * b09) * det; o[2] = (a[13] * b05 - a[14] * b04 + a[15] * b03) * det; o[3] = (a[10] * b04 - a[9] * b05 - a[11] * b03) * det;
    o[4] = (a[6] * b08 - a[4] * b11 - a[7] * b07) * det; o[5] = (a[0] * b11 - a[2] * b08 + a[3] * b07) * det; o[6] = (a[14] * b02 - a[12] * b05 - a[15] * b01) * det; o[7] = (a[8] * b05 - a[10] * b02 + a[11] * b01) * det;
    o[8] = (a[4] * b10 - a[5] * b08 + a[7] * b06) * det; o[9] = (a[1] * b08 - a[0] * b10 - a[3] * b06) * det; o[10] = (a[12] * b04 - a[13] * b02 + a[15] * b00) * det; o[11] = (a[9] * b02 - a[8] * b04 - a[11] * b00) * det;
    o[12] = (a[5] * b07 - a[4] * b09 - a[6] * b06) * det; o[13] = (a[0] * b09 - a[1] * b07 + a[2] * b06) * det; o[14] = (a[13] * b01 - a[12] * b03 - a[14] * b00) * det; o[15] = (a[8] * b03 - a[9] * b01 + a[10] * b00) * det;
    return o;
  }

  FL.scene = { createScene, M4, V3, gl3, invert, LANDMARKS };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
