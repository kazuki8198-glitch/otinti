// CADET — world/cb.js : the cumulonimbus, drawn (B3.3). A tower of dark billboards: five soft puffs
// stacked and widening to an anvil, lit grey from the side the sun is on. Sprites, so the whole cell is a
// handful of draw calls and no geometry; it stands where flight/cb.js says, and only on the days that
// have it. Purely visual — the air inside it is flight/cb.js's and fly-mode's business.
import * as THREE from 'three';

function puffTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(64, 58, 6, 64, 64, 62);
  grad.addColorStop(0, 'rgba(88,94,108,0.85)');
  grad.addColorStop(0.55, 'rgba(70,76,90,0.55)');
  grad.addColorStop(1, 'rgba(60,66,80,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createCb(scene) {
  const tex = puffTexture();
  const group = new THREE.Group(); group.visible = false;
  // the tower: (height, half-width, scale) — a column that mushrooms at the top
  const stack = [[300, 0, 2400], [1100, 120, 3000], [2000, -80, 3600], [2900, 200, 4400], [3600, -150, 5600]];
  for (const [y, off, sc] of stack) {
    const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.92 });
    const s = new THREE.Sprite(m); s.position.set(off, y, 0); s.scale.set(sc, sc * 0.62, 1);
    group.add(s);
  }
  scene.add(group);
  return {
    group,
    // place the cell: n/e are metres north/east of the field's centre, whose scene position is (cx, cz)
    show(cx, cz, dn, de, on) {
      group.position.set(cx + de, 16.8, cz - dn);
      group.visible = !!on;
    },
  };
}
