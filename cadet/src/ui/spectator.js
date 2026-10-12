// CADET — ui/spectator.js : the M0 "visit" camera: click to look around (pointer lock), WASD to move, Space / C up
// and down, Shift faster, G to stand on the ground at eye height. (Walking with collisions comes in M1.)
import * as THREE from 'three';

export function createSpectator(canvas, camera, { groundY, onLock = () => {} }) {
  const keys = new Set();
  let yaw = 0, pitch = 0, locked = false, drag = null;
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'SELECT' || a.tagName === 'TEXTAREA'); };
  canvas.addEventListener('click', () => { if (!locked && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* not allowed here */ } } });
  document.addEventListener('pointerlockchange', () => { locked = document.pointerLockElement === canvas; onLock(locked); });
  document.addEventListener('mousemove', (e) => {
    if (locked) { yaw -= e.movementX * 0.0021; pitch -= e.movementY * 0.0021; }
    else if (drag) { yaw -= (e.clientX - drag.x) * 0.004; pitch -= (e.clientY - drag.y) * 0.004; drag = { x: e.clientX, y: e.clientY }; }
    pitch = THREE.MathUtils.clamp(pitch, -1.52, 1.52);
  });
  // drag to look when the pointer cannot be locked (right button, or any button with Alt)
  canvas.addEventListener('mousedown', (e) => { if (e.button === 2 || e.altKey) drag = { x: e.clientX, y: e.clientY }; });
  document.addEventListener('mouseup', () => { drag = null; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('keydown', (e) => { if (!typing()) keys.add(e.code); });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => keys.clear());

  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  return {
    get locked() { return locked; },
    get yaw() { return yaw; }, get pitch() { return pitch; },
    setPose(pos, look) {
      camera.position.copy(pos);
      const d = look.clone().sub(pos).normalize();
      yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
      this.apply();
    },
    apply() { euler.set(pitch, yaw, 0); camera.quaternion.setFromEuler(euler); },
    update(dt) {
      if (!typing()) {
        const fast = keys.has('ShiftLeft') || keys.has('ShiftRight');
        const high = camera.position.y - groundY;
        const speed = (fast ? 6 : 1) * (high > 40 ? Math.min(60, 7 + high * 0.15) : 4.5);
        fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
        const v = new THREE.Vector3();
        if (keys.has('KeyW') || keys.has('ArrowUp')) v.add(fwd);
        if (keys.has('KeyS') || keys.has('ArrowDown')) v.sub(fwd);
        if (keys.has('KeyD') || keys.has('ArrowRight')) v.add(right);
        if (keys.has('KeyA') || keys.has('ArrowLeft')) v.sub(right);
        if (keys.has('Space')) v.y += 1;
        if (keys.has('KeyC')) v.y -= 1;
        if (v.lengthSq() > 0) camera.position.addScaledVector(v.normalize(), speed * dt);
        if (keys.has('KeyG')) { camera.position.y = groundY + 1.65; keys.delete('KeyG'); }
      }
      camera.position.y = Math.max(camera.position.y, groundY + 0.35);
      this.apply();
    },
  };
}
