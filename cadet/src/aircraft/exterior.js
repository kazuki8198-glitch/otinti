// CADET — aircraft/exterior.js : the aircraft as seen from outside, built from FLIGHT LAB's own description
// (FL.acmesh.buildParts: the fuselage, wings, tail, moving surfaces, propellers and gear, in the physics' body frame:
// x = right wing, y = up, −z = the nose). Each hinged part turns with the state, as in FLIGHT LAB.
// Materials: glossy paint with a clear coat, dark glass, rubber, metal — told apart by the vertex colours acmesh uses.
import * as THREE from 'three';

const toLin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));

let paintMat = null, propMat = null;
function materials() {
  if (paintMat) return { paintMat, propMat };
  paintMat = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.0, clearcoat: 1.0, clearcoatRoughness: 0.06, envMapIntensity: 1.1 });
  paintMat.onBeforeCompile = (sh) => {
    sh.fragmentShader = sh.fragmentShader.replace('#include <roughnessmap_fragment>', /* glsl */`
      float roughnessFactor = roughness;
      #if defined( USE_COLOR )
        float mx = max(vColor.r, max(vColor.g, vColor.b));
        float glass = step(mx, 0.05) * step(vColor.r * 1.8, vColor.b);          // the dark blue-grey windows
        float rubber = step(mx, 0.02) * (1.0 - glass);                           // tyres
        float metal = step(0.35, mx) * step(abs(vColor.r - vColor.b), 0.04) * step(mx, 0.6);   // struts, hub caps
        roughnessFactor = mix(roughnessFactor, 0.03, glass);
        roughnessFactor = mix(roughnessFactor, 0.85, rubber);
        roughnessFactor = mix(roughnessFactor, 0.3, metal);
      #endif`)
      .replace('#include <lights_physical_fragment>', `#include <lights_physical_fragment>
      #if defined( USE_COLOR ) && defined( USE_CLEARCOAT )
        material.clearcoat *= 1.0 - rubber;
      #endif`)
      .replace('#include <metalnessmap_fragment>', `float metalnessFactor = metalness;
      #if defined( USE_COLOR )
        float mx3 = max(vColor.r, max(vColor.g, vColor.b));
        metalnessFactor = step(0.35, mx3) * step(abs(vColor.r - vColor.b), 0.04) * step(mx3, 0.6) * 0.8;
      #endif`);
  };
  paintMat.customProgramCacheKey = () => 'cadet-ac-paint';
  propMat = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: 0.35, metalness: 0.6 });
  return { paintMat, propMat };
}

// one aircraft model; update(s) turns the hinged parts from a physics state (or a parked state)
export function buildAircraftModel(FL, A) {
  const { paintMat, propMat } = materials();
  const root = new THREE.Group(); root.name = 'aircraft-' + A.id;
  const hinges = [];
  for (const p of FL.acmesh.buildParts(A)) {
    if (p.disc != null) continue;                                     // the spinning disc only when an engine runs (M3)
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p.mesh.pos, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(p.mesh.nrm, 3));
    const col = new Float32Array(p.mesh.col.length); for (let i = 0; i < col.length; i++) col[i] = toLin(p.mesh.col[i]);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const mesh = new THREE.Mesh(g, p.name === 'prop' ? propMat : paintMat);
    mesh.castShadow = true; mesh.receiveShadow = true; mesh.name = p.name;
    if (p.pivot && p.angle) {
      const pivot = new THREE.Group(); pivot.position.set(...p.pivot);
      mesh.position.set(-p.pivot[0], -p.pivot[1], -p.pivot[2]);
      pivot.add(mesh); root.add(pivot);
      hinges.push({ pivot, axis: new THREE.Vector3(...p.axis), angle: p.angle });
    } else root.add(mesh);
  }
  return {
    root,
    update(s) { for (const h of hinges) h.pivot.quaternion.setFromAxisAngle(h.axis, h.angle(s) || 0); },
  };
}

// a parked aircraft: a physics state at rest on its wheels (so the hinges and the height come from FLIGHT LAB)
export function parkedAircraft(FL, L, id, along, cross, hdgTrue, opt = {}) {
  const P = FL.physics, s = P.newState({ aircraft: id });
  const [n, e] = P.rwyToNE(L.R, along, cross);
  s.q = P.qFromHPB(hdgTrue, 0, 0);
  s.pos = [e, P.GROUND_M - s.WHEEL_BOTTOM + 0.01, -n];
  s.thr = 0; s.flapIdx = 0; s.flapDeg = 0; s.gearDown = true; s.gearPos = 1; s.propAng = opt.prop ?? 0.6;
  for (const en of s.eng) en.ang = opt.prop ?? 0.6;
  s.elev = opt.elev ?? -0.15; s.ail = 0; s.rud = 0;
  const m = buildAircraftModel(FL, s.A);
  m.update(s);
  const lp = L.physToLocal(s.pos);
  m.root.position.set(lp[0], lp[1], lp[2]);
  m.root.quaternion.set(s.q[0], s.q[1], s.q[2], s.q[3]);
  return { ...m, state: s };
}
