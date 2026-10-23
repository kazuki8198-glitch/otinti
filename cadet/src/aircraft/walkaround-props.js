// CADET — aircraft/walkaround-props.js : what the walk-around finds on today's aircraft, drawn (M4): the pitot mast
// under the left wing and its red cover with the "REMOVE BEFORE FLIGHT" streamer (it moves in the wind), the tie-down
// ropes from the rings under the wings and the tail to the anchors in the apron, the chocks at the nose wheel, and a
// fuel cap left open (an anomaly). Children of the parked aircraft's root (its body frame: x right, y up, z aft), so
// they go when it is hidden (boarded). set(props) shows what is still there (aircraft/walkaround.js props()).
import * as THREE from 'three';

const GROUND_Y = -1.40;                 // the apron under the Archer's wheels (gear y −1.15, wheel radius 0.25)
const wingY = (x) => -0.45 + (Math.abs(x) - 0.55) * Math.tan(7 * Math.PI / 180);   // the wing's chord line (dihedral 7°)

function streamerTexture() {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas'); c.width = 256; c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#d4211b'; g.fillRect(0, 0, 256, 32);
  g.fillStyle = '#fff'; g.font = '700 17px "Arial Narrow", Arial, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('REMOVE BEFORE FLIGHT', 128, 17, 248);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

export function buildWalkaroundProps() {
  const root = new THREE.Group(); root.name = 'walkaround-props';
  const mat = (c, r = 0.6, m = 0) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: m });
  const red = mat(0xc8231d, 0.55), rope = mat(0xe8c14a, 0.85), steel = mat(0x8c9196, 0.35, 0.8), dark = mat(0x2c2f33, 0.5, 0.4), chockM = mat(0xf2c21b, 0.7), concrete = mat(0x8e8b84, 0.9);
  const mesh = (g, m, p, r) => { const o = new THREE.Mesh(g, m); o.position.set(p[0], p[1], p[2]); if (r) o.rotation.set(r[0], r[1], r[2]); o.castShadow = true; o.receiveShadow = true; return o; };
  // the pitot-static mast under the left wing (always there) and its cover
  const PX = -3.6, PZ = -0.72, wy = wingY(PX) - 0.06;
  root.add(mesh(new THREE.BoxGeometry(0.02, 0.17, 0.11), dark, [PX, wy - 0.085, PZ + 0.02]));
  root.add(mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.24, 10).rotateX(Math.PI / 2), steel, [PX, wy - 0.17, PZ - 0.08]));
  const cover = new THREE.Group();
  cover.add(mesh(new THREE.CylinderGeometry(0.017, 0.017, 0.15, 12).rotateX(Math.PI / 2), red, [PX, wy - 0.17, PZ - 0.14]));
  const tex = streamerTexture();
  // the streamer hangs from the cover's front end (its top at the origin, the text reading down), face fore and aft
  const flagG = new THREE.PlaneGeometry(0.46, 0.075, 10, 1);
  flagG.translate(0.23, 0, 0).rotateZ(-Math.PI / 2).rotateY(Math.PI);     // running down from its top, the text facing forward
  const flag = new THREE.Mesh(flagG, new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : 0xd4211b, map: tex, roughness: 0.8, side: THREE.DoubleSide }));
  flag.position.set(PX, wy - 0.18, PZ - 0.22); flag.castShadow = true;
  cover.add(flag);
  root.add(cover);
  const flagBase = Float32Array.from(flagG.attributes.position.array);
  // the tie-downs: a rope from the ring to an anchor in the apron
  const tie = (top, bottom) => {
    const g = new THREE.Group();
    const a = new THREE.Vector3(...top), b = new THREE.Vector3(...bottom), mid = a.clone().lerp(b, 0.5).add(new THREE.Vector3(0, -0.03, 0));
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    g.add(mesh(new THREE.TubeGeometry(curve, 10, 0.007, 6), rope, [0, 0, 0]));
    g.add(mesh(new THREE.TorusGeometry(0.028, 0.006, 6, 14).rotateX(Math.PI / 2), steel, [top[0], top[1], top[2]]));
    return g;
  };
  const anchor = (x, z) => mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.03, 12), concrete, [x, GROUND_Y + 0.012, z]);
  const tieR = tie([4.2, wingY(4.2) - 0.07, -0.42], [4.35, GROUND_Y + 0.03, -0.4]);
  const tieL = tie([-4.2, wingY(4.2) - 0.07, -0.42], [-4.35, GROUND_Y + 0.03, -0.4]);
  const tieT = tie([0, -0.42, 3.45], [0, GROUND_Y + 0.03, 3.6]);
  root.add(tieR, tieL, tieT, anchor(4.35, -0.4), anchor(-4.35, -0.4), anchor(0, 3.6));
  // the chocks either side of the nose wheel (the gear at z −2.3)
  const chocks = new THREE.Group();
  const wedge = () => { const sh = new THREE.Shape([new THREE.Vector2(-0.07, 0), new THREE.Vector2(0.07, 0), new THREE.Vector2(0.025, 0.1), new THREE.Vector2(-0.025, 0.1)]); return new THREE.ExtrudeGeometry(sh, { depth: 0.24, bevelEnabled: false }).translate(0, 0, -0.12).rotateY(Math.PI / 2); };
  chocks.add(mesh(wedge(), chockM, [0, GROUND_Y, -2.3 - 0.32]), mesh(wedge(), chockM, [0, GROUND_Y, -2.3 + 0.32]));
  chocks.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.6), rope, [0.13, GROUND_Y + 0.05, -2.3]));
  root.add(chocks);
  // the right tank's cap, lifted off its seat (the anomaly 'cap')
  const cap = new THREE.Group();
  cap.add(mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.02, 16), steel, [3.2, wingY(3.2) + 0.1, -0.52], [0.9, 0, 0.3]));
  cap.add(mesh(new THREE.BoxGeometry(0.012, 0.012, 0.07), dark, [3.2, wingY(3.2) + 0.14, -0.55], [0.4, 0, 0]));
  cap.visible = false;
  root.add(cap);

  function set(p) {
    cover.visible = !!p.pitot; tieR.visible = !!p.tieR; tieL.visible = !!p.tieL; tieT.visible = !!p.tieT; chocks.visible = !!p.chocks; cap.visible = !!p.capOpen;
  }
  // the streamer moves in the wind (t: seconds; windKt)
  function update(t, windKt = 5) {
    if (!cover.visible) return;
    const pa = flagG.attributes.position, k = Math.min(1, 0.2 + windKt / 12);
    for (let i = 0; i < pa.count; i++) {
      const u = -flagBase[i * 3 + 1] / 0.46;                          // 0 at the top, 1 at the free end
      pa.setZ(i, flagBase[i * 3 + 2] + Math.sin(t * 6 + u * 7) * 0.025 * u * k);
    }
    pa.needsUpdate = true;
  }
  return { root, set, update, parts: { cover, tieR, tieL, tieT, chocks, cap } };
}
