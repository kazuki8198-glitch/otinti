// CADET — player/walker.js : walking in the first person.
// The player is a vertical cylinder (radius 0.28 m, 1.75 m tall, eyes at 1.65 m) on FLIGHT LAB's flat ground.
// Positions are kept in world coordinates for the camera; collisions are solved in the runway frame, where every
// building wall is axis-aligned (collide.js). Walking 1.45 m/s, running 3.6 m/s, with a short acceleration so it
// feels like a person, not a camera. Steps (for footsteps and the optional head bob) follow the distance walked.
// While a talk goes on (main.js) the walk is kept on a leash: within r of where the talk began. A step that would leave
// the circle ends on its rim instead (and the velocity loses its outward part), so the walker slides round the rim;
// the step still goes through the colliders, and nothing is ever moved without walking.
import * as THREE from 'three';

export const BODY = { radius: 0.28, height: 1.75, eye: 1.65, step: 0.35 };

export function createWalker({ camera, world, L, input, settings, surfaceAt = () => 'concrete', onStep = () => {} }) {
  const G = L.G, cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw);
  // world (x, z) <-> runway frame (x across, z = −along); the frame is rotated by frameYaw about the threshold
  const toFrame = (x, z) => [x * cy - z * sy, x * sy + z * cy];
  const toWorld = (fx, fz) => [fx * cy + fz * sy, -fx * sy + fz * cy];
  const st = { x: 0, z: 0, y: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, speed: 0, phase: 0, bob: 0, bobK: 0, lastStepPhase: 0, foot: 0 };
  // (st.y: the feet's height above the ground G — 0 on the ground floor and outdoors; the stairs and the upper
  // floors are boxes (collide.js groundAt), so walking up a flight raises it tread by tread, and setPose puts it
  // back to 0: every teleport in the game lands on the ground floor or outdoors)
  let auto = null;                                          // scripted input (tests, cut-scenes): { forward, strafe, run }
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  let fovNow = camera.fov;

  function setPose(x, z, yaw, pitch = 0) { st.x = x; st.z = z; st.y = 0; st.yaw = yaw; st.pitch = pitch; st.vx = st.vz = 0; apply(0); }
  function lookAt(x, y, z) {
    const dx = x - st.x, dz = z - st.z, dy = y - (G + st.y + BODY.eye);
    st.yaw = Math.atan2(-dx, -dz); st.pitch = Math.atan2(dy, Math.hypot(dx, dz)); apply(0);
  }
  function apply(dt) {
    const bobOn = settings.get('headBob');
    st.bobK += ((bobOn ? 1 : 0) * Math.min(1, st.speed / 1.4) - st.bobK) * Math.min(1, dt * 6);
    // the head dips at each foot strike (phase = k / 2) and sways once per pair of steps
    const bobY = (Math.abs(Math.sin(st.phase * Math.PI * 2)) - 0.6) * 0.035 * st.bobK, bobX = Math.sin(st.phase * Math.PI * 2) * 0.015 * st.bobK;
    camera.position.set(st.x + Math.cos(st.yaw) * bobX, G + st.y + BODY.eye + bobY, st.z - Math.sin(st.yaw) * bobX);
    euler.set(st.pitch, st.yaw, 0); camera.quaternion.setFromEuler(euler);
    const fov = settings.get('fov');
    if (Math.abs(fov - fovNow) > 0.01) { fovNow = fov; camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  // the step (world x, z) kept inside the leash: a step that would end outside the circle of radius lim round (cx, cz)
  // ends on its rim instead, straight in towards the centre from where it would have gone — so walking out stops at the
  // rim and walking round slides along it; the velocity loses its outward part
  function leashed(sx, sz, cx, cz, lim) {
    const ox = st.x - cx, oz = st.z - cz, nx = ox + sx, nz = oz + sz, d = Math.hypot(nx, nz);
    if (!(d > lim)) return [sx, sz];
    const ux = nx / d, uz = nz / d, vo = st.vx * ux + st.vz * uz;
    if (vo > 0) { st.vx -= ux * vo; st.vz -= uz * vo; }
    return [ux * lim - ox, uz * lim - oz];
  }
  // opts: look (the mouse's movement, when the caller took it already), leash ({ x, z, r }: a talk's), upDown (false:
  // ↑↓ do not walk — a talk's choices have them), still (true: no key walks — a panel such as the textbook covers the
  // talk; the look still turns and the walk dies away as when the keys are let go). Returns whether the keys (or the
  // script) ask to move.
  function update(dt, { look = null, leash = null, upDown = true, still = false } = {}) {
    // look
    const lk = look || input.takeLook(), sens = 0.0022 * settings.get('sensitivity');
    st.yaw -= lk.x * sens; st.pitch -= lk.y * sens * (settings.get('invertY') ? -1 : 1);
    st.pitch = THREE.MathUtils.clamp(st.pitch, -1.45, 1.45);
    // the wish direction from the keys (or the script)
    let f = 0, s = 0, run = false;
    if (auto) { f = auto.forward || 0; s = auto.strafe || 0; run = !!auto.run; }
    else if (!still) {
      if (input.down('KeyW') || (upDown && input.down('ArrowUp'))) f += 1;
      if (input.down('KeyS') || (upDown && input.down('ArrowDown'))) f -= 1;
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
    const [px, pz] = toFrame(st.x, st.z);
    const go = (sx, sz) => { const [dx, dz] = toFrame(sx, sz); return world.move({ x: px, y: st.y, z: pz }, dx, dz, BODY); };
    let r;
    if (!leash) r = go(st.vx * dt, st.vz * dt);
    else {
      // a talk's leash (r round where it began; no further out when outside it already): the step ends inside it. A
      // wall can still turn the step out of the circle, so what really happened goes through the leash again and is
      // walked again (at worst, there is no step this frame)
      const lim = Math.max(leash.r, Math.hypot(st.x - leash.x, st.z - leash.z));
      let sx = st.vx * dt, sz = st.vz * dt;
      for (let tries = 1; ; tries++) {
        [sx, sz] = leashed(sx, sz, leash.x, leash.z, lim);
        r = go(sx, sz);
        const [ex, ez] = toWorld(r.x, r.z);
        if (!(Math.hypot(ex - leash.x, ez - leash.z) > lim + 1e-9)) break;
        if (tries === 3) { r = { x: px, z: pz, blocked: true, hitNormal: null }; break; }
        sx = ex - st.x; sz = ez - st.z;
      }
    }
    const [nx, nz] = toWorld(r.x, r.z);
    const moved = Math.hypot(nx - st.x, nz - st.z);
    // the ground under the new place (a tread, an upper floor's slab, or 0): up is a step (taken at once, as the
    // collision already allowed it), down is a fall of a few metres a second (off a stair's side, or a floor's edge)
    if (dt > 0) {
      const g = world.groundAt(r.x, r.z, st.y, BODY);
      if (g > st.y) st.y = g;
      else if (g < st.y) st.y = Math.max(g, st.y - dt * 4.5);
    }
    if (dt > 0) {
      // against a wall only the part of the velocity pressed into it is lost; the part along it stays, so sliding
      // keeps the wish's speed along the wall at any frame rate
      if (r.blocked && r.hitNormal) {
        const [wnx, wnz] = toWorld(r.hitNormal[0], r.hitNormal[1]), vn = st.vx * wnx + st.vz * wnz;
        if (vn < 0) { st.vx -= wnx * vn; st.vz -= wnz * vn; }
      }
      // never faster than what really happened (a corner stops you crisply)
      const real = moved / dt, v = Math.hypot(st.vx, st.vz); if (real < v * 0.98) { const kk = real / (v || 1); st.vx *= kk; st.vz *= kk; }
    }
    st.x = nx; st.z = nz;
    st.speed = dt > 0 ? Math.min(moved / dt, 3.8) : 0;
    // steps: one per stride (longer when running)
    const stride = st.speed > 2.4 ? 1.05 : 0.72;
    st.phase += moved / stride / 2;                                         // one full bob cycle = two steps
    const steps = Math.floor(st.phase * 2);
    if (steps !== st.lastStepPhase) { st.lastStepPhase = steps; if (st.speed > 0.4) onStep(surfaceAt(st.x, st.z), st.speed > 2.4 ? 1 : 0.6, st.foot = 1 - st.foot); }
    apply(dt);
    return len > 0;
  }

  return {
    state: st, update, setPose, lookAt, toFrame, toWorld, apply,
    setAuto(a) { auto = a; },
    get position() { return { x: st.x, z: st.z }; },
    get framePos() { const [fx, fz] = toFrame(st.x, st.z); return { x: fx, z: fz, a: -fz, c: fx, y: st.y }; },
  };
}
