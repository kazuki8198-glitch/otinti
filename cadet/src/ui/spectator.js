// CADET — ui/spectator.js : the "visit" camera (見学モード): a free camera that flies through walls. Mouse to look
// (through the shared input: pointer lock or right-drag), WASD to move, Space / C up and down, Shift faster, G to
// stand on the ground at eye height. Walking with collisions is player/walker.js.
import * as THREE from 'three';

export function createSpectator(camera, input, { groundY }) {
  let yaw = 0, pitch = 0;
  const fwd = new THREE.Vector3(), right = new THREE.Vector3(), v = new THREE.Vector3(), euler = new THREE.Euler(0, 0, 0, 'YXZ');
  return {
    get yaw() { return yaw; }, get pitch() { return pitch; },
    setPose(pos, look) {
      camera.position.copy(pos);
      const d = look.clone().sub(pos).normalize();
      yaw = Math.atan2(-d.x, -d.z); pitch = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1));
      this.apply();
    },
    // take over from wherever the camera is now (switching from walking)
    fromCamera() { euler.setFromQuaternion(camera.quaternion, 'YXZ'); yaw = euler.y; pitch = euler.x; },
    apply() { euler.set(pitch, yaw, 0); camera.quaternion.setFromEuler(euler); },
    update(dt) {
      const look = input.takeLook();
      yaw -= look.x * 0.0021; pitch = THREE.MathUtils.clamp(pitch - look.y * 0.0021, -1.52, 1.52);
      const fast = input.down('ShiftLeft') || input.down('ShiftRight');
      const high = camera.position.y - groundY;
      const speed = (fast ? 6 : 1) * (high > 40 ? Math.min(60, 7 + high * 0.15) : 4.5);
      fwd.set(-Math.sin(yaw), 0, -Math.cos(yaw)); right.set(Math.cos(yaw), 0, -Math.sin(yaw));
      v.set(0, 0, 0);
      if (input.down('KeyW') || input.down('ArrowUp')) v.add(fwd);
      if (input.down('KeyS') || input.down('ArrowDown')) v.sub(fwd);
      if (input.down('KeyD') || input.down('ArrowRight')) v.add(right);
      if (input.down('KeyA') || input.down('ArrowLeft')) v.sub(right);
      if (input.down('Space')) v.y += 1;
      if (input.down('KeyC')) v.y -= 1;
      if (v.lengthSq() > 0) camera.position.addScaledVector(v.normalize(), speed * dt);
      if (input.pressed('KeyG')) camera.position.y = groundY + 1.65;
      camera.position.y = Math.max(camera.position.y, groundY + 0.35);
      this.apply();
    },
  };
}
