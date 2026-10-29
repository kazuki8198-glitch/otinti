// FLIGHT LAB — src3d/input3d.js : the mouse in the three.js view (pointer events on its canvas; no pointer lock, the
// keyboard is left to app.js).
// Cockpit view: dragging with the left button looks round (the head turns; the body stays strapped in), a
// double-click looks ahead again, the right button held looks closer at what the cursor is on (the head turns towards
// it as the field of view narrows; let go, it turns back), and dragging meanwhile looks round the closer view. A left
// click still works while the right button holds the zoom (the browser reports that press and release as moves of the
// pointer, not as presses of their own). Over a switch, a
// knob, a lever or a key the cursor becomes a hand and a small label says what it is; a click works it once, the
// wheel turns it. Chase view: dragging orbits the aircraft, the wheel moves the camera nearer or further, a
// double-click puts it back behind.
// The cockpit's controls are found by a ray from the camera through the cursor (cockpit.pick: invisible hit boxes on
// their own layer), with the camera of the frame last drawn.
import * as THREE from 'three';

const DEG = Math.PI / 180;
export const LOOK = { yaw: 150 * DEG, up: 60 * DEG, down: 70 * DEG, rest: -4 * DEG };
export const CHASE = { pitch0: 0.08, pitchMin: -0.15, pitchMax: 1.2, distMin: 0.6, distMax: 3 };
const DRAG_PX = 4;                      // a press that moves further than this is a drag, not a click
const RAY_FAR = 1.6;                    // the controls are within reach of the seat
const HINT = { knob: 'ホイール・クリック', lever: 'クリック・ホイール', switch: 'クリック', button: 'クリック' };

// h: { camera (THREE.PerspectiveCamera), view() → 'cockpit' | 'chase', head() → { yaw, pitch } (radians: the head as
//      last drawn), pick(raycaster) → control | null, act(control, dir, wheel) (the scene applies it; it asks the app
//      first) }
// state: yaw / pitch (where the pilot looks), zYaw / zPitch (where the zoom looks, while the right button is held),
//   zoom, snap (the scene takes the look at once instead of easing from the zoom's aim: a new flight, a double-click),
//   the chase camera's orbit
export function createInput(canvas, wrap, h) {
  const st = { yaw: 0, pitch: LOOK.rest, zYaw: 0, zPitch: LOOK.rest, chaseYaw: 0, chasePitch: CHASE.pitch0, chaseDist: 1, zoom: false, snap: true };
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), dir = new THREE.Vector3(), eul = new THREE.Euler(0, 0, 0, 'YXZ');
  ray.far = RAY_FAR;
  let press = null, mouse = null, hover = null, wheelAcc = 0;

  // the label by the cursor (inside the view's container, never in the way of the mouse)
  const tip = document.createElement('div');
  tip.className = 'view3d-tip';
  tip.style.cssText = 'position:absolute;left:0;top:0;z-index:6;pointer-events:none;display:none;max-width:280px;padding:3px 8px;border-radius:5px;'
    + 'background:rgba(8,12,18,.86);color:#e9eef4;font:600 12px/1.35 system-ui,-apple-system,"Hiragino Sans","Yu Gothic UI","Meiryo",sans-serif;'
    + 'box-shadow:0 1px 4px rgba(0,0,0,.4);white-space:normal';
  const tipText = document.createElement('span'), tipHint = document.createElement('span');
  tipHint.style.cssText = 'margin-left:6px;font-weight:400;opacity:.72';
  tip.append(tipText, tipHint);

  const clampLook = () => {
    st.yaw = THREE.MathUtils.clamp(st.yaw, -LOOK.yaw, LOOK.yaw);
    st.pitch = THREE.MathUtils.clamp(st.pitch, -LOOK.down, LOOK.up);
    st.zYaw = THREE.MathUtils.clamp(st.zYaw, -LOOK.yaw, LOOK.yaw);
    st.zPitch = THREE.MathUtils.clamp(st.zPitch, -LOOK.down, LOOK.up);
    st.chasePitch = THREE.MathUtils.clamp(st.chasePitch, CHASE.pitchMin, CHASE.pitchMax);
  };
  // (snap: the scene takes the head as it is now, without easing from the zoom's aim)
  function resetLook() { st.yaw = st.zYaw = 0; st.pitch = st.zPitch = LOOK.rest; st.chaseYaw = 0; st.chasePitch = CHASE.pitch0; st.chaseDist = 1; st.snap = true; }

  // the control under the cursor (cockpit view only), from the camera of the frame last drawn
  function pickAt(x, y) {
    if (h.view() !== 'cockpit') return null;
    const r = canvas.getBoundingClientRect();
    if (!(r.width > 0 && r.height > 0)) return null;
    ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, h.camera);
    return h.pick(ray);
  }
  function showTip(c) {
    hover = c;
    canvas.style.cursor = c ? 'pointer' : press && press.drag ? 'grabbing' : '';
    if (!c || !mouse) { tip.style.display = 'none'; return; }
    const label = c.label || '';
    if (tipText.textContent !== label) tipText.textContent = label;
    const hint = HINT[c.kind] || 'クリック';
    if (tipHint.textContent !== hint) tipHint.textContent = hint;
    const wr = wrap.getBoundingClientRect();
    let x = mouse.x - wr.left + 14, y = mouse.y - wr.top + 16;
    tip.style.display = 'block';
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    if (x + tw > wr.width - 4) x = Math.max(4, mouse.x - wr.left - tw - 10);
    if (y + th > wr.height - 4) y = Math.max(4, mouse.y - wr.top - th - 10);
    tip.style.transform = `translate(${Math.round(x)}px,${Math.round(y)}px)`;
  }
  // the hover again (the aircraft and the head move under a still cursor; a softkey's label changes)
  function refresh() {
    if (!mouse || (press && press.drag)) { if (hover && !mouse) showTip(null); return; }
    showTip(pickAt(mouse.x, mouse.y));
  }

  // the zoom's aim: the direction under the cursor, from the head as last drawn (in the aircraft's frame)
  function aimZoom(x, y) {
    const r = canvas.getBoundingClientRect(), hd = h.head(), cam = h.camera;
    if (!(r.width > 0 && r.height > 0)) { st.zYaw = hd.yaw; st.zPitch = hd.pitch; return; }
    const t = Math.tan(cam.fov * DEG / 2), nx = (x - r.left) / r.width * 2 - 1, ny = -((y - r.top) / r.height) * 2 + 1;
    dir.set(nx * t * cam.aspect, ny * t, -1).applyEuler(eul.set(hd.pitch, hd.yaw, 0));
    st.zYaw = Math.atan2(-dir.x, -dir.z); st.zPitch = Math.atan2(dir.y, Math.hypot(dir.x, dir.z));
    clampLook();
  }
  const zoomFrom = (e) => {
    const z = (e.buttons & 2) !== 0 && h.view() === 'cockpit';
    if (z && !st.zoom) aimZoom(e.clientX, e.clientY);
    st.zoom = z;
  };
  const onDown = (e) => {
    zoomFrom(e);
    if (e.button === 2) { e.preventDefault(); try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already released */ } return; }
    if (e.button !== 0) return;
    press = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, drag: false };
    try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* already released */ }
  };
  const onMove = (e) => {
    mouse = { x: e.clientX, y: e.clientY };
    zoomFrom(e);
    // a left press or release while another button is held (the right one, for the zoom) comes as a pointermove
    // (a plain move has button −1)
    if (e.button === 0) { if (e.buttons & 1) onDown(e); else onUp(e); return; }
    if (press && e.pointerId === press.id && (e.buttons & 1)) {
      if (!press.drag && Math.hypot(e.clientX - press.x, e.clientY - press.y) > DRAG_PX) { press.drag = true; showTip(null); canvas.style.cursor = 'grabbing'; }
      if (press.drag) {
        // the angle a pixel spans on the screen (the head turns about as far as the cursor moves); as CADET's mouse
        // look: the view (or the camera round the aircraft) goes the way the mouse goes
        const k = h.camera.fov * DEG / Math.max(100, canvas.clientHeight), dx = e.clientX - press.lx, dy = e.clientY - press.ly;
        if (h.view() !== 'cockpit') { st.chaseYaw -= dx * k * 1.6; st.chasePitch -= dy * k * 1.6; } else if (st.zoom) { st.zYaw -= dx * k; st.zPitch -= dy * k; } else { st.yaw -= dx * k; st.pitch -= dy * k; }
        clampLook();
      }
      press.lx = e.clientX; press.ly = e.clientY;
      return;
    }
    refresh();
  };
  const onUp = (e) => {
    zoomFrom(e);
    if (e.button !== 0 || !press || e.pointerId !== press.id) return;
    const wasDrag = press.drag;
    press = null; canvas.style.cursor = '';
    if (wasDrag) { refresh(); return; }
    const c = pickAt(e.clientX, e.clientY);
    if (c) h.act(c, 1, false);
    refresh();
  };
  const onCancel = () => { press = null; st.zoom = false; canvas.style.cursor = ''; };
  const onLeave = () => { if (press && press.drag) return; mouse = null; showTip(null); };
  const onWheel = (e) => {
    e.preventDefault();
    // in notches (+1 = away from you); a trackpad's small steps add up to whole ones
    wheelAcc += -e.deltaY / (e.deltaMode === 1 ? 3 : e.deltaMode === 2 ? 0.1 : 100);
    const n = Math.trunc(wheelAcc); wheelAcc -= n;
    if (h.view() === 'chase') { st.chaseDist = THREE.MathUtils.clamp(st.chaseDist * Math.exp(e.deltaY * (e.deltaMode ? 0.05 : 0.0012)), CHASE.distMin, CHASE.distMax); return; }
    if (!n) return;
    const c = pickAt(e.clientX, e.clientY);
    if (c) for (let i = 0; i < Math.abs(n); i++) h.act(c, Math.sign(n), true);
    refresh();
  };
  // (not on a control: there the two clicks have already worked it)
  const onDbl = (e) => { e.preventDefault(); if (!pickAt(e.clientX, e.clientY)) resetLook(); };
  const onMenu = (e) => e.preventDefault();
  const onBlur = () => { st.zoom = false; press = null; };

  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onCancel);
  canvas.addEventListener('lostpointercapture', (e) => { if (press && e.pointerId === press.id) press = null; });
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('dblclick', onDbl);
  canvas.addEventListener('contextmenu', onMenu);
  window.addEventListener('blur', onBlur);

  return {
    state: st, tip, resetLook, refresh,
    get hover() { return hover; },
    // the view changed (cockpit ↔ chase): nothing to hover in the chase view, nothing to zoom
    viewChanged() { st.zoom = false; showTip(null); refresh(); },
    dispose() { window.removeEventListener('blur', onBlur); tip.remove(); },
  };
}
