// CADET — world/route-line.js : the way to taxi, drawn on the pavement while the day asks for it (M4): a soft band
// along the route (flight/taxi.js points, runway frame), its corners rounded, with chevrons running along it in the
// direction to go. Unlit and a little transparent, above the markings; one draw call. Only the next stretch is
// bright: it fades out some 120 m ahead of the aircraft and behind it.
import * as THREE from 'three';

const VERT = /* glsl */`
attribute float along;
varying float vAlong; varying float vAcross;
void main() { vAlong = along; vAcross = uv.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */`
uniform float uTime; uniform float uAt; uniform vec3 uCol; uniform float uOn;
varying float vAlong; varying float vAcross;
void main() {
  float d = vAlong - uAt;
  float ahead = smoothstep(-6.0, 2.0, d) * (1.0 - smoothstep(60.0, 120.0, d));
  float edge = 1.0 - smoothstep(0.35, 0.5, abs(vAcross - 0.5));
  // chevrons: "^" shapes every 4 m, running forward
  float ph = fract((vAlong - uTime * 3.0) / 4.0), x = abs(vAcross - 0.5) * 2.0;
  float chev = smoothstep(0.08, 0.0, abs(ph - 0.5 + x * 0.25) - 0.06);
  float a = (0.28 * edge + 0.55 * chev * edge) * ahead * uOn;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uCol * (1.0 + chev), a);
}`;

// createRouteLine(L) → { mesh, set(points | null), update(t, at { a, c }) }
export function createRouteLine(L, { width = 1.1, color = 0xffd25a } = {}) {
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    uniforms: { uTime: { value: 0 }, uAt: { value: 0 }, uCol: { value: new THREE.Color(color) }, uOn: { value: 0 } },
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4,
  });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.name = 'route-line'; mesh.renderOrder = 3; mesh.frustumCulled = false; mesh.visible = false;
  let pts2 = null, cum = null;
  function set(points) {
    if (!points || points.length < 2) { mesh.visible = false; pts2 = null; return; }
    // a smooth path through the points (in the frame), sampled every metre
    const P = points.map(p => new THREE.Vector3(p.c, 0, -p.a));
    const curve = new THREE.CatmullRomCurve3(P, false, 'centripetal', 0.3);
    const len = curve.getLength(), n = Math.max(2, Math.ceil(len / 1.0));
    const sp = curve.getSpacedPoints(n);
    const pos = [], uv = [], along = [], idx = [];
    pts2 = []; cum = [];
    let acc = 0;
    for (let i = 0; i <= n; i++) {
      const p = sp[i], q = sp[Math.min(n, i + 1)], o = sp[Math.max(0, i - 1)];
      const dx = q.x - o.x, dz = q.z - o.z, l = Math.hypot(dx, dz) || 1, nx = -dz / l * width / 2, nz = dx / l * width / 2;
      if (i) acc += p.distanceTo(sp[i - 1]);
      for (const sd of [-1, 1]) {
        pos.push(...L.rwyToLocal(-(p.z + sd * nz), p.x + sd * nx, 0.035));
        uv.push(acc / width, sd < 0 ? 0 : 1); along.push(acc);
      }
      pts2.push({ a: -p.z, c: p.x }); cum.push(acc);
      if (i < n) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('along', new THREE.Float32BufferAttribute(along, 1));
    g.setIndex(idx); g.computeBoundingSphere();
    mesh.geometry.dispose(); mesh.geometry = g; mesh.visible = true;
  }
  // t: seconds; at: where the aircraft is (runway frame): the bright stretch starts there
  function update(t, at, dt = 1 / 60) {
    if (!pts2) { mat.uniforms.uOn.value = 0; return; }
    mat.uniforms.uTime.value = t;
    if (at) {
      let best = Infinity, k = 0;
      for (let i = 0; i < pts2.length; i++) { const d = (pts2[i].a - at.a) ** 2 + (pts2[i].c - at.c) ** 2; if (d < best) { best = d; k = i; } }
      mat.uniforms.uAt.value = cum[k];
    }
    mat.uniforms.uOn.value = Math.min(1, mat.uniforms.uOn.value + dt * 2);
  }
  return { mesh, set, update, get on() { return mesh.visible; } };
}
