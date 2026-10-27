// FLIGHT LAB — src3d/scene3d.js : the three.js view's scene: createScene(FL, wrap, opt) → the object app.js draws with
// (the same duties as the legacy scene.js: render a lesson's state, project the landmarks' labels, give google3d.js
// the camera), drawn by CADET's pipeline with CADET's world, aircraft and cockpit.
//
// opt: { replace (the page's canvas#view3d: the new canvas takes its place, id and all), quality ('low' … 'ultra';
//   by default the guess for this GPU), onAction(result, control) (a cockpit control was worked: CADET's result
//   object; 'switch' / 'select' are already applied to the cockpit's own switches, which change only the picture),
//   canAct() (asked before a click or a wheel notch acts: the app says whether the pilot may act now) }
// scene: { kind: 'three', gl, ready(), render(st), resize(), project(p), labels, camera(), setQuality(id), quality(),
//   info(), glass(), resetLook(), pause() }; st = { s, L, view: 'cockpit' | 'chase', hood, screen, hole, extra, rTrim }.
//   pause(): the app stops drawing for a while (an opaque page over the view): the next frame is timed as a normal one,
//   so the gap neither counts as one slow frame for the dynamic resolution nor moves anything at once.
//
// The 3D G1000 shows FLIGHT LAB's own notes (教材表示, （教材）, 未実装, 教材用の架空訓練点) exactly as the 2D panel does,
// and the flown aircraft's outside lights follow the cockpit's switches (the master first), as in CADET's flights.
//
// Frames. FLIGHT LAB's GL world (the physics' s.pos; x = east, y = metres above sea level, z = −north) and CADET's
// drawn one (world/layout.js: around the threshold of LAB RWY 36, local = FL + T with T = (−E0, 0, N0), 40 km east)
// differ by T only. Everything that goes in or out of this file — the labels' positions, project(), camera() — is in
// FLIGHT LAB's frame; the scene itself is drawn in CADET's.
//
// Nothing here changes the page before everything synchronous has worked: the pipeline is made with a stand-in for
// its container (the canvas is kept aside) and put in the page last. The textures load afterwards (ready() says when
// the ground, the airfield, the buildings and the parked aircraft are there); until then the frame has the sky, the
// aircraft, the cockpit, the landmarks and the trees.
import * as THREE from 'three';
import { createPipeline } from '../../cadet/src/render/post.js';
import { createSky } from '../../cadet/src/render/sky.js';
import { PRESETS, guessPreset, gpuName, makeDynRes } from '../../cadet/src/core/quality.js';
import { setAnisotropy } from '../../cadet/src/render/textures.js';
import { makeLayout } from '../../cadet/src/world/layout.js';
import { liveAircraft } from '../../cadet/src/aircraft/exterior.js';
import { buildCockpit } from '../../cadet/src/aircraft/cockpit.js';
import { createWorld } from './world3d.js';
import { createInput, LOOK } from './input3d.js';
import { createGoogleHook } from './google-hook.js';

const DEG = Math.PI / 180;
// the sky at a fixed, pleasant time: 10:30 local on CADET's day (the 12th of October), the sun high in the south-east
const HOURS = 10.5, DAY = 285;
// the field of view (vertical): CADET's 75° in the cockpit (the panel and the windshield both in view), narrower
// outside; looking closer (the right button) 30°. A very wide view (the 2D panel below it) keeps its width to 115°.
const FOV = { cockpit: 75, chase: 60, zoom: 30, maxH: 115 };
const VISOR = new THREE.Color(0.018, 0.019, 0.021);       // the hood's visor: what the pilot sees instead of outside
// What the cockpit hides from the pilot's eye, for the landmarks' labels (they are drawn over the canvas, and one placed
// under the glareshield would sit on the 3D G1000 or the cowling). Per azimuth in the aircraft's own frame (from 120°
// left to 120° right, 5° apart), the elevation of the cockpit's lower edge seen from the eye: the sill of the pilot's
// own window, the panel and its glareshield, the Archer's cowling over it (the Seminole has none ahead), the right
// door's sill. Measured from CADET's cockpit with rays from the eye (the glass not counted, the window posts left out:
// a label is wider than a post); the left side re-measured with the walls made in Blender (the window's raised surround,
// the storm window's hinge strip at −50…−30°; its wire bail, thin, left out like a post).
const EDGE = {
  az0: -120, step: 5,
  pa28: [-27.5, -33.5, -36, -37, -37.5, -37.5, -38, -37.5, -37.5, -37, -36, -35, -34, -32.5, -26.5, -24.5, -22.5, -20.5, -21, -18, -15.5, -11.5, -11, -7.5, -5.5, -5, -5, -5.5, -6.5, -7.5, -8, -9, -9, -8.5, -6, -10.5, -11.5, -12, -12.5, -12.5, -13, -13, -13, -13, -13, -12.5, -12.5, -12, -11.5],
  pa44: [-27.5, -33.5, -36, -37, -37.5, -37.5, -38, -37.5, -37.5, -37, -36, -35, -34, -32.5, -26.5, -24.5, -22.5, -20.5, -21, -18, -15.5, -11.5, -11.5, -10, -12, -11.5, -11.5, -11.5, -11, -10.5, -10, -9.5, -9, -8.5, -6, -10.5, -11.5, -12, -12.5, -12.5, -13, -13, -13, -13, -13, -12.5, -12.5, -12, -11.5],
};
// FLIGHT LAB's own notes on the 3D G1000. CADET's screens (g1000.js createGlass) pass every fillText through panelText,
// which takes FLIGHT LAB's teaching notes out (in CADET the screens are the aircraft's), by assigning a wrapper to each
// screen's context. The canvases made here have a context whose fillText is an accessor of its own: reading it gives
// the browser's method (the prototype's), assigning to it does nothing — silently, since CADET's modules are strict
// code, where an assignment to a property without a setter would throw. getContext('2d') hands back the same context
// every time, so the accessor stays. (The cockpit's label atlas is made here too; it never had a wrapper.)
function makeCanvas(w, h) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  const g = cv.getContext('2d');
  if (g) Object.defineProperty(g, 'fillText', { configurable: true, get() { return Object.getPrototypeOf(this).fillText; }, set() { /* CADET's panelText wrapper: not taken */ } });
  return cv;
}

export function createScene(FL, wrap, opt = {}) {
  const P = FL.physics, AV = FL.avionics;
  if (!P || !AV || !FL.acmesh) throw new Error('FLIGHT LAB の物理・計器・機体のモジュールがありません');
  if (!wrap) throw new Error('3D 表示の入れ物がありません');
  const L = makeLayout(P), T = new THREE.Vector3(-L.E0, 0, L.N0);

  // the pipeline draws into a canvas of its own: held here until everything has worked, sized from the container
  let canvas = null;
  const host = { appendChild(el) { canvas = el; }, get clientWidth() { return wrap.clientWidth; }, get clientHeight() { return wrap.clientHeight; } };
  let preset = PRESETS[opt.quality] || PRESETS.low, pipe = null, gpu = 'unknown', disposed = false;
  const parts = { lives: null, cockpit: null, world: null };
  try {
    pipe = createPipeline(host, preset);
    gpu = gpuName(pipe.renderer);
    if (!PRESETS[opt.quality]) { const g = PRESETS[guessPreset(gpu)]; if (g !== preset) { preset = g; pipe.setQuality(preset); } }
  } catch (e) {
    if (pipe) { pipe.renderer.dispose(); pipe.renderer.forceContextLoss(); }
    throw e;
  }
  const { renderer, scene, camera } = pipe;
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  let sky, lives, cockpit, world, hook, input, dyn, onVis = null;
  try {
    // ---- the sky and its light (the image-based light is made once: setTime rebuilds it)
    sky = createSky(renderer, scene, preset);
    const st0 = sky.setTime(HOURS, DAY);
    pipe.setHaze({ sunDir: st0.dir, el: st0.el, horizon: sky.horizon });
    // ---- the flown aircraft (both types, the lesson's shown) and the cockpit, which goes into whichever is flown
    const A28 = P.AIRCRAFT.find(a => a.id === 'pa28'), A44 = P.AIRCRAFT.find(a => a.id === 'pa44');
    lives = parts.lives = { pa28: liveAircraft(FL, A28) };
    if (A44) lives.pa44 = liveAircraft(FL, A44, { reg: 'N452SY' });
    for (const l of Object.values(lives)) { l.root.visible = false; scene.add(l.root); }
    cockpit = parts.cockpit = buildCockpit(FL, A28, { anisotropy: Math.min(8, maxAniso), twin: A44 || null, makeCanvas });
    lives.pa28.root.add(cockpit.root);
    // ---- the scenery that needs no pictures (the rest comes with the textures)
    world = parts.world = createWorld(FL, L, scene, preset);
    // ---- Google's tiles: the hook in the main pass
    hook = createGoogleHook(pipe, T);
    scene.add(hook.mesh);
  } catch (e) {
    dispose();
    throw e;
  }

  // ---- in the page: the canvas where the old one was (same id: the page's CSS and tools find it), the mouse
  canvas.id = 'view3d'; canvas.tabIndex = -1;
  canvas.setAttribute('aria-label', (opt.replace && opt.replace.getAttribute('aria-label')) || '外部視界（教材用の景色）');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;outline:none;touch-action:none';
  if (opt.replace && opt.replace.parentNode) opt.replace.replaceWith(canvas); else wrap.insertBefore(canvas, wrap.firstChild);
  let view = 'cockpit', liveId = 'pa28', live = lives.pa28, cockpitShown = true, ready = false, failed = null;
  // (the head as drawn: the right button aims the zoom from it)
  const head = { yaw: 0, pitch: LOOK.rest, zoom: 0 };
  input = createInput(canvas, wrap, {
    camera, view: () => view, head: () => head,
    pick: ray => cockpit.pick(ray),
    act: (c, dir, wheel) => act(c, dir, wheel),
  });
  wrap.appendChild(input.tip);

  // the canvas's backing store follows the container (and the dynamic resolution); its CSS size is the container's
  let sizeW = -1, sizeH = -1;
  const resizeTo = (d) => { pipe.resize(d); canvas.style.width = '100%'; canvas.style.height = '100%'; sizeW = wrap.clientWidth; sizeH = wrap.clientHeight; };
  dyn = makeDynRes({ get dpr() { return pipe.dpr; }, resize: resizeTo }, () => preset);
  resizeTo(pipe.dpr);

  // ---- the rest of the world, once the textures are decoded
  const lightsOn = sky.state.lightsOn;
  world.load({ anisotropy: Math.min(preset.aniso, maxAniso), lightsOn, onGround: g => hook.patchGround(g.material), gone: () => disposed })
    .then(async (ok) => {
      if (!ok || disposed) return;
      // the shaders compiled before the first frame that needs them (both aircraft and both cockpits shown meanwhile)
      const was = { pa28: lives.pa28.root.visible, pa44: lives.pa44 ? lives.pa44.root.visible : false, cock: cockpit.root.visible, type: cockpit.type };
      for (const l of Object.values(lives)) l.root.visible = true;
      cockpit.root.visible = true;
      let compiling = null;
      try {
        cockpit.setType('pa44'); compiling = pipe.compile();
        cockpit.setType('pa28'); const again = pipe.compile();
        compiling = Promise.all([compiling, again]);
      } finally {
        lives.pa28.root.visible = was.pa28; if (lives.pa44) lives.pa44.root.visible = was.pa44;
        cockpit.root.visible = was.cock; cockpit.setType(was.type);
      }
      await compiling;
      if (!disposed) ready = true;
    })
    .catch((e) => {
      failed = e; console.warn('FLIGHT LAB 3D: the scenery could not be built', e);
      // no ground (a picture that would not decode, a builder that threw): a plain one, grass-coloured and level with
      // the field, so that the view keeps a horizon and a surface under the aircraft (the hood hides it as the rest of
      // the outside; Google's tiles cut their hole in it). The app tells the pilot once (info().error).
      if (disposed || world.ground) return;
      try {
        const m = new THREE.MeshStandardMaterial({ color: 0x4d6233, roughness: 1, metalness: 0 });
        const g = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000).rotateX(-Math.PI / 2).translate(0, L.G, 0), m);
        g.name = 'ground-plain'; g.receiveShadow = true;
        hook.patchGround(m);
        world.ground = { group: g, update() {} };
        scene.add(g);
      } catch (e2) { console.warn('FLIGHT LAB 3D: no plain ground either', e2); }
    });

  // ---- a cockpit control worked (a click, a wheel notch): only when the app lets the pilot act
  function act(c, dir, wheel) {
    if (opt.canAct && !opt.canAct()) return null;
    const d = c.act(dir, wheel);
    if (!d) return null;
    if (d.type === 'switch') cockpit.switches[d.id] = d.on;
    else if (d.type === 'select') cockpit.switches[d.id] = d.value;
    if (opt.onAction) opt.onAction(d, c);
    if (d.type === 'av' && cockpit.markDirty) cockpit.markDirty();
    return d;
  }

  // ---- per frame
  const clock = { t0: performance.now(), last: null, fps: 0, keyT: 0 };
  // (the lights: set from the cockpit's switches every frame)
  const liveOpt = { dt: 0, rpmVisual: null, lights: { nav: false, beacon: false, strobe: false, landing: false, taxi: false }, inside: true };
  const cockOpt = { s: null, L: null, av: null, parkBrake: false, night: 0 };
  const v1 = new THREE.Vector3(), qHead = new THREE.Quaternion(), eHead = new THREE.Euler(0, 0, 0, 'YXZ'), camWorld = new THREE.Vector3();
  const VPl = new THREE.Matrix4(), Tm = new THREE.Matrix4().makeTranslation(T.x, T.y, T.z), VPfl = new THREE.Matrix4(), p4 = new THREE.Vector4();
  const invRoot = new THREE.Matrix4(), qB = new THREE.Vector3();
  let psiS = null, fov = FOV.cockpit, shadowHalf, cam = null, drawn = false, hoodWas = false, lastView = null, occl = false;
  const hidden = [];
  // a tab in the background draws nothing: its gap is not one slow frame either (see pause())
  onVis = () => { if (document.hidden) clock.last = null; };
  document.addEventListener('visibilitychange', onVis);

  function useAircraft(id) {
    if (!lives[id]) id = 'pa28';
    if (id === liveId) return;
    lives[liveId].root.visible = false;
    live = lives[id]; liveId = id;
    live.root.add(cockpit.root);
    cockpit.setType(id);
  }
  // where the physics has the aircraft. FLIGHT LAB's spring gear sinks a little under the aircraft's weight: the
  // picture (only) is lifted until the lowest wheel touches, by 30 cm at most
  function pose(s) {
    const r = live.root;
    r.quaternion.set(s.q[0], s.q[1], s.q[2], s.q[3]);
    let lift = 0;
    if (s.WHEELS) for (const w of s.WHEELS) {
      const y = s.pos[1] + v1.set(w.off[0], w.off[1], w.off[2]).applyQuaternion(r.quaternion).y;
      if (P.GROUND_M - y > lift) lift = P.GROUND_M - y;
    }
    r.position.set(s.pos[0] + T.x, s.pos[1] + Math.min(lift, 0.3), s.pos[2] + T.z);
    r.visible = true;
    r.updateMatrixWorld(true);
  }
  // the field of view for a view of this shape: the vertical angle, unless the horizontal one would pass maxH
  function fovFor(deg, aspect) {
    const hMax = 2 * Math.atan(Math.tan(FOV.maxH * DEG / 2) / Math.max(aspect, 1e-3)) / DEG;
    return Math.min(deg, hMax);
  }
  function placeCamera(s, dt) {
    const st = input.state, ease = 1 - Math.exp(-dt / 0.12);
    if (view === 'cockpit') {
      v1.copy(cockpit.eye); live.root.localToWorld(v1); camera.position.copy(v1);
      // the head: where the pilot looks (dragged), or — the right button held — turned towards what the cursor was on
      // as the view narrows, and back again as it widens (the same easing as the field of view). Each of the two
      // follows the mouse directly; only the change between them eases.
      const zw = st.zoom ? 1 : 0;
      if (st.snap) { head.zoom = zw; st.snap = false; } else head.zoom += (zw - head.zoom) * ease;
      head.yaw = st.yaw + (st.zYaw - st.yaw) * head.zoom; head.pitch = st.pitch + (st.zPitch - st.pitch) * head.zoom;
      eHead.set(head.pitch, head.yaw, 0); qHead.setFromEuler(eHead);
      camera.quaternion.copy(live.root.quaternion).multiply(qHead);
    } else {
      // behind the aircraft along its smoothed heading, level, a little above; the mouse orbits it
      const f = P.qrot(s.q, [0, 0, -1]), psi = Math.atan2(f[0], -f[2]);
      if (psiS == null) psiS = psi;
      let d = psi - psiS; d = Math.atan2(Math.sin(d), Math.cos(d)); psiS += d * (1 - Math.exp(-dt / 0.2));
      const dist = (8 + ((s.A && s.A.phys && s.A.phys.L) || 7.25)) * st.chaseDist, ang = psiS + st.chaseYaw, cp = Math.cos(st.chasePitch);
      const p = live.root.position;
      camera.position.set(p.x - Math.sin(ang) * dist * cp, p.y + 0.9 + Math.sin(st.chasePitch) * dist + 1.7, p.z + Math.cos(ang) * dist * cp);
      camera.position.y = Math.max(camera.position.y, L.G + 1.5);
      v1.set(p.x, p.y + 0.9, p.z); camera.lookAt(v1);
    }
    const want = fovFor(view === 'cockpit' ? (st.zoom ? FOV.zoom : FOV.cockpit) : FOV.chase, camera.aspect);
    fov += (want - fov) * ease;
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
  }
  // the sun's shadow box: small and sharp round the cockpit in the air, wide on the ground; the chase view the preset's
  function applyShadow(s) {
    const half = view !== 'cockpit' ? null : !s.onGround && s.out && s.out.agl > 100 ? 5 : 24;
    if (half !== shadowHalf) { shadowHalf = half; sky.setShadowHalf(half); }
  }
  // the hood: everything outside the aircraft hidden (and the aircraft's own wings and tail), a dark visor instead of
  // the sky; only for the frame being drawn. The windshield's glass goes too: it mirrors the sky's light (the image-
  // based light stays, for the cockpit's own surfaces) and over the dark visor would read as a pale grey haze
  const glassMesh = cockpit.root.getObjectByName('cockpit-glass');
  function hood(on) {
    if (on) {
      for (const o of [...world.outside(), sky.sky, hook.mesh, glassMesh]) if (o && o.visible) { o.visible = false; hidden.push(o); }
      for (const o of live.root.children) if (o !== cockpit.root && o.visible) { o.visible = false; hidden.push(o); }
      scene.background = VISOR;
    } else {
      for (const o of hidden) o.visible = true;
      hidden.length = 0; scene.background = null;
    }
  }
  // the picture-only parts of the switches: START (the Archer's momentary rocker, the Seminole's L / R rocker) springs back after
  // a second (no engine start here: CADET's aircraft/systems.js lets it go when the engine catches), the propeller
  // levers come back forward
  function switchesStep(dt) {
    const sw = cockpit.switches;
    if (sw.start) { clock.keyT += dt; if (clock.keyT > 1) { sw.start = false; clock.keyT = 0; } } else clock.keyT = 0;
    if (sw.propCycleT > 0) sw.propCycleT = Math.max(0, sw.propCycleT - dt);
  }

  function render(st) {
    if (disposed) return;
    // google3d.js's uploads (after the last frame) left GL state three.js does not know about
    renderer.resetState();
    const now = performance.now(), dtMs = clock.last == null ? 1000 / 60 : now - clock.last;
    clock.last = now;
    const dt = Math.min(0.25, Math.max(0, dtMs / 1000)), t = (now - clock.t0) / 1000;
    if (dtMs > 0 && dtMs < 2000) clock.fps += (1000 / dtMs - clock.fps) * (clock.fps ? 0.1 : 1);
    dyn.tick(Math.min(dtMs, 1000));
    if (wrap.clientWidth !== sizeW || wrap.clientHeight !== sizeH) resizeTo(pipe.dpr);
    const s = st && st.s;
    if (!s || !s.q || !s.pos) return;
    const hooded = !!st.hood;
    view = hooded || st.view !== 'chase' ? 'cockpit' : 'chase';
    if (view !== lastView) { if (view === 'chase') psiS = null; lastView = view; input.viewChanged(); }
    useAircraft(s.A && s.A.id);
    const inside = view === 'cockpit';
    if (inside !== cockpitShown) { cockpit.setVisible(inside); cockpitShown = inside; }
    pose(s);
    applyShadow(s);
    // the outside lights from the cockpit's switches, the master first (CADET's fly-mode lights()): clicking NAV,
    // STROBE (3 positions on both types: strobes and beacon, off, the fin's beacon alone) or LANDING (both types' works
    // the taxi lamp too) turns the aircraft's own light on or off in the picture
    const lt = liveOpt.lights, sw = cockpit.switches, on = sw.master !== false;
    lt.nav = !!(on && sw.nav); lt.beacon = !!(on && sw.beacon); lt.strobe = !!(on && sw.strobe);
    lt.landing = !!(on && sw.landing); lt.taxi = !!(on && sw.taxi);
    liveOpt.dt = dt; liveOpt.inside = inside;
    live.update(s, liveOpt);
    placeCamera(s, dt);
    camera.getWorldPosition(camWorld);
    sky.update(camera, t, live.root.position);
    world.update(t, camWorld, s.wind || { fromDeg: 0, kt: 0 }, sky.state.lightsOn);
    switchesStep(dt);
    cockOpt.s = s; cockOpt.L = st.L || null; cockOpt.av = st.L ? st.L.av : null; cockOpt.rTrim = st.rTrim || 0;
    cockOpt.night = 1 - THREE.MathUtils.smoothstep(sky.state.el, -4, 6);
    cockpit.update(dt, cockOpt);
    input.refresh();
    hook.set(hooded ? null : st.extra, hooded ? null : st.hole);
    if (hooded) hood(true);
    try { pipe.render(); } finally { if (hooded) hood(false); }
    hoodWas = hooded;
    // the camera as drawn: for the labels, google3d.js's tile choice and the pick ray; the aircraft's frame, for what
    // the cockpit hides (the cockpit view only: the eye is the seat's, whichever way the head turns)
    occl = inside && !hooded;
    if (occl) invRoot.copy(live.root.matrixWorld).invert();
    VPl.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    VPfl.multiplyMatrices(VPl, Tm);
    const H = Math.max(1, Math.round(wrap.clientHeight * Math.min(window.devicePixelRatio || 1, 1.5))), W = Math.max(1, Math.round(wrap.clientWidth * Math.min(window.devicePixelRatio || 1, 1.5)));
    cam = { VP: new Float32Array(VPfl.elements), eye: [camWorld.x - T.x, camWorld.y - T.y, camWorld.z - T.z], H, W, fovY: camera.fov * DEG, far: camera.far };
    drawn = true;
    const err = hook.takeError();
    if (err) throw err;
  }
  // a point in FLIGHT LAB's frame → CSS pixels of the canvas, and its distance ahead (m); null behind the camera, and in
  // the cockpit view null where the cockpit hides it from the eye (under the glareshield, the cowling, a sill: EDGE)
  function project(p) {
    if (!drawn) return null;
    p4.set(p[0] + T.x, p[1] + T.y, p[2] + T.z, 1).applyMatrix4(VPl);
    if (p4.w <= 0.5) return null;
    if (occl && underCockpit(p)) return null;
    return { x: (p4.x / p4.w * 0.5 + 0.5) * canvas.clientWidth, y: (1 - (p4.y / p4.w * 0.5 + 0.5)) * canvas.clientHeight, dist: p4.w };
  }
  function underCockpit(p) {
    qB.set(p[0] + T.x, p[1] + T.y, p[2] + T.z).applyMatrix4(invRoot).sub(cockpit.eye);    // (x right, y up, −z the nose)
    const tbl = EDGE[liveId] || EDGE.pa28, i = (Math.atan2(qB.x, -qB.z) / DEG - EDGE.az0) / EDGE.step;
    if (!(i >= 0 && i <= tbl.length - 1)) return false;
    const k = Math.min(Math.floor(i), tbl.length - 2), edge = tbl[k] + (tbl[k + 1] - tbl[k]) * (i - k);
    return Math.atan2(qB.y, Math.hypot(qB.x, qB.z)) / DEG < edge;
  }
  // the labels: the legacy view's (ids, texts, places): CADET's towers are as tall as its (the ball's top at 100 m),
  // the label a little above; the VOR's over it
  const labels = [];
  for (const lm of (FL.scene && FL.scene.LANDMARKS) || []) {
    const w = AV.wpt(lm.id); if (!w) continue;
    labels.push({ id: lm.id, label: lm.label, pos: [w.e, L.G + 106, -w.n] });
  }
  for (const n of AV.NAVAIDS || []) if (n.type === 'VOR') labels.push({ id: n.id, label: 'LBV（架空 VOR）', pos: [n.e, L.G + 30, -n.n] });

  function setQuality(id) {
    const q = PRESETS[id];
    if (!q || q === preset) return;
    preset = q;
    pipe.setQuality(q); resizeTo(pipe.dpr);
    sky.applyQuality(q); shadowHalf = undefined;
    world.veg.setNearRadius(q.treeNear);
    if (world.ground) setAnisotropy(Math.min(q.aniso, maxAniso));
  }
  function dispose() {
    disposed = true;
    if (onVis) document.removeEventListener('visibilitychange', onVis);
    if (input) input.dispose();
    if (parts.cockpit) parts.cockpit.dispose();
    if (parts.lives) for (const l of Object.values(parts.lives)) l.dispose();
    if (pipe) { pipe.renderer.dispose(); pipe.renderer.forceContextLoss(); }
  }

  const screen = which => { const m = cockpit.screens[which]; return m && m.material && m.material.map ? m.material.map.image : null; };
  return {
    kind: 'three', gl: renderer.getContext(),
    ready: () => ready,
    render, project, labels,
    resize: () => resizeTo(pipe.dpr),
    camera: () => cam,
    setQuality, quality: () => preset.id,
    info: () => ({ renderer: 'three', preset: preset.id, gpu, ready, fps: Math.round(clock.fps * 10) / 10, calls: pipe.sceneInfo.calls, triangles: pipe.sceneInfo.triangles, view, dpr: Math.round(pipe.dpr * 100) / 100, hood: hoodWas, error: failed ? String(failed.message || failed) : null }),
    glass: () => ({ pfd: screen('pfd'), mfd: screen('mfd') }),
    resetLook: () => input.resetLook(),
    pause: () => { clock.last = null; },
    // for tools/view3d-check.mjs: where a cockpit control is on the canvas (CSS px), the world's build times, the
    // Google hook's draws so far
    __test: {
      aimAt(id) {
        const c = cockpit.controls.find(x => x.id === id); if (!c || !drawn) return null;
        cockpit.aimPoint(c, v1);
        p4.set(v1.x, v1.y, v1.z, 1).applyMatrix4(VPl);
        if (p4.w <= 0) return null;
        return { x: (p4.x / p4.w * 0.5 + 0.5) * canvas.clientWidth, y: (1 - (p4.y / p4.w * 0.5 + 0.5)) * canvas.clientHeight, label: c.label };
      },
      controls: () => cockpit.controls.map(c => c.id),
      switches: () => ({ ...cockpit.switches }),
      lights: () => ({ ...liveOpt.lights }),
      head: () => ({ yaw: head.yaw / DEG, pitch: head.pitch / DEG, zoom: head.zoom, fov: camera.fov }),
      hover: () => (input.hover ? input.hover.id : null),
      look: (yawDeg, pitchDeg) => { input.state.yaw = yawDeg * DEG; input.state.pitch = pitchDeg * DEG; input.state.snap = true; },
      orbit: (yawDeg, pitchRad, dist = 1) => { input.state.chaseYaw = yawDeg * DEG; input.state.chasePitch = pitchRad; input.state.chaseDist = dist; },
      buildMs: () => ({ ...world.ms }),
      world: () => world,
      parts: () => ({ cockpit, lives, pipe, sky }),
      hookCalls: () => hook.calls,
      rest: LOOK.rest,
    },
  };
}
