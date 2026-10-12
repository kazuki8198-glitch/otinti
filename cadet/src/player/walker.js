// CADET — player/walker.js : walking in the first person.
// The player is a vertical cylinder (radius 0.28 m, 1.75 m tall, eyes at 1.65 m) on FLIGHT LAB's flat ground.
// Positions are kept in world coordinates for the camera; collisions are solved in the runway frame, where every
// building wall is axis-aligned (collide.js). Walking 1.45 m/s, running 3.6 m/s, with a short acceleration so it
// feels like a person, not a camera. Steps (for footsteps and the optional head bob) follow the distance walked.
import * as THREE from 'three';

export const BODY = { radius: 0.28, height: 1.75, eye: 1.65, step: 0.35 };

export function createWalker({ camera, world, L, input, settings, surfaceAt = () => 'concrete', onStep = () => {} }) {
  const G = L.G, cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw);
  // world (x, z) <-> runway frame (x across, z = −along); the frame is rotated by frameYaw about the threshold
  const toFrame = (x, z) => [x * cy - z * sy, x * sy + z * cy];
  const toWorld = (fx, fz) => [fx * cy + fz * sy, -fx * sy + fz * cy];
  const st = { x: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, speed: 0, phase: 0, bob: 0, bobK: 0, lastStepPhase: 0, foot: 0 };
  let auto = null;                                          // scripted input (tests, cut-scenes): { forward, strafe, run }
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let fovNow = camera.fov;

  function setPose(x, z, yaw, pitch = 0) { st.x = x; st.z = z; st.yaw = yaw; st.pitch = pitch; st.vx = st.vz = 0; apply(0); }
  function lookAt(x, y, z) {
    const dx = x - st.x, dz = z - st.z, dy = y - (G + BODY.eye);
    st.yaw = Math.atan2(-dx, -dz); st.pitch = Math.atan2(dy, Math.hypot(dx, dz)); apply(0);
  }
  function apply(dt) {
    const bobOn = settings.get('headBob');
    st.bobK += ((bobOn ? 1 : 0) * Math.min(1, st.speed / 1.4) - st.bobK) * Math.min(1, dt * 6);
    // the head dips at each foot strike (phase = k / 2) and sways once per pair of steps
    const bobY = (Math.abs(Math.sin(st.phase * Math.PI * 2)) - 0.6) * 0.035 * st.bobK, bobX = Math.sin(st.phase * Math.PI * 2) * 0.015 * st.bobK;
    camera.position.set(st.x + Math.cos(st.yaw) * bobX, G + BODY.eye + bobY, st.z - Math.sin(st.yaw) * bobX);
    euler.set(st.pitch, st.yaw, 0); camera.quaternion.setFromEuler(euler);
    const fov = settings.get('fov');
    if (Math.abs(fov - fovNow) > 0.01) { fovNow = fov; camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function update(dt) {
    // look
    const look = input.takeLook(), sens = 0.0022 * settings.get('sensitivity');
    st.yaw -= look.x * sens; st.pitch -= look.y * sens * (settings.get('invertY') ? -1 : 1);
    st.pitch = THREE.MathUtils.clamp(st.pitch, -1.45, 1.45);
    // the wish direction from the keys (or the script)
    let f = 0, s = 0, run = false;
    if (auto) { f = auto.forward || 0; s = auto.strafe || 0; run = !!auto.run; }
    else {
      if (input.down('KeyW') || input.down('ArrowUp')) f += 1;
      if (input.down('KeyS') || input.down('ArrowDown')) f -= 1;
      if (input.down('KeyD') || input.down('ArrowRight')) s += 1;
      if (input.down('KeyA') || input.down('ArrowLeft')) s -= 1;
      run = input.down('ShiftLeft') || input.down('ShiftRight');
    }
    const len = Math.hypot(f, s); if (len > 1) { f /= len; s /= len; }
    const top = (run ? 3.6 : 1.45) * (f < 0 ? 0.8 : 1);
    const fx = -Math.sin(st.yaw), fz = -Math.cos(st.yaw), rx = Math.cos(st.yaw), rz = -Math.sin(st.yaw);
    const wx = (fx * f + rx * s) * top, wz = (fz * f + rz * s) * top;
    const k = 1 - Math.exp(-(len > 0 ? 9 : 12) * dt);
    st.vx += (wx - st.vx) * k; st.vz += (wz - st.vz) * k;
    // move with collisions, in the frame
    const [px, pz] = toFrame(st.x, st.z), [dx, dz] = toFrame(st.vx * dt, st.vz * dt);
    const r = world.move({ x: px, y: 0, z: pz }, dx, dz, BODY);
    const [nx, nz] = toWorld(r.x, r.z);
    const moved = Math.hypot(nx - st.x, nz - st.z);
    if (dt > 0) {
      // lose the velocity pressed into a wall, so sliding stays smooth and stopping is crisp
      const real = moved / dt; if (real < Math.hypot(st.vx, st.vz) * 0.98) { const kk = real / (Math.hypot(st.vx, st.vz) || 1); st.vx *= kk; st.vz *= kk; }
    }
    st.x = nx; st.z = nz;
    st.speed = dt > 0 ? moved / dt : 0;
    // steps: one per stride (longer when running)
    const stride = st.speed > 2.4 ? 1.05 : 0.72;
    st.phase += moved / stride / 2;                                         // one full bob cycle = two steps
    const steps = Math.floor(st.phase * 2);
    if (steps !== st.lastStepPhase) { st.lastStepPhase = steps; if (st.speed > 0.4) onStep(surfaceAt(st.x, st.z), st.speed > 2.4 ? 1 : 0.6, st.foot = 1 - st.foot); }
    apply(dt);
  }

  return {
    state: st, update, setPose, lookAt, toFrame, toWorld, apply,
    setAuto(a) { auto = a; },
    get position() { return { x: st.x, z: st.z }; },
    get framePos() { const [fx, fz] = toFrame(st.x, st.z); return { x: fx, z: fz, a: -fz, c: fx }; },
  };
}
