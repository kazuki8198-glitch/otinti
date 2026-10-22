// CADET — flight/fly-mode.js : boarding today's Archer and flying it (M3).
// The player walks up to the aircraft and gets in (a short fade): the flown model takes the parked one's place, the
// cockpit is drawn round the pilot's eye, and 早瀬 教官 sits in the right seat. He asks what to do — today's lesson
// (the transit to the training area is skipped: FLIGHT LAB's lesson starts in the air) at one of three levels, a free
// flight from the apron, or getting out again. In flight FLIGHT LAB's lesson runs exactly as in FLIGHT LAB
// (flight/flight.js), the instructor says each step's instruction and the hints, and a debrief follows the end.
// The view: the pilot's eye with the mouse (right button held: look closer), or outside behind the aircraft (C); a
// click on a switch, lever or knob under the crosshair works it, the wheel turns it. Getting out puts the aircraft back
// on its stand.
// main.js owns the modes, the menu and the loop; it hands this module what it needs (ctx below) and calls update()
// every frame while flying.
import * as THREE from 'three';
import { createFlight } from './flight.js';
import { liveAircraft } from '../aircraft/exterior.js';
import { buildCockpit } from '../aircraft/cockpit.js';
import { seatFromBody } from '../npc/actor.js';
import { createRunner } from '../dialog/engine.js';
import { cockpitDialogs, flightLine, debriefLine } from '../content/dialog/cockpit.js';

const DEG = Math.PI / 180;
const FADE_MS = 420;
const LOOK = { yaw: 150 * DEG, up: 60 * DEG, down: 70 * DEG };
const ZOOM_FOV = 30;
const HOME_PITCH = -4 * DEG;            // the head at rest: a little down, the horizon above the glareshield

// ctx: { FL, L, scene, camera, renderer, sky, input, settings, audio, toast(text, ms), hud (prompt), dui (the dialogue
//   UI), talkState, saveTalk(), instructor, instructorHome(root) (puts him back in the briefing room), stand { a, c,
//   hdgTrue }, parkedToday (its root), todayColliders(on), toFrame(x, z), world (colliders, for the taxi check),
//   flightHud (optional), lessonId, onEnter(), onLeave(), onTalk(on) }
export function createFlyMode(ctx) {
  const { FL, L, scene, camera, sky, input, settings, audio, toast, hud, instructor, world } = ctx;
  const P = FL.physics, AV = FL.avionics;
  const A = P.AIRCRAFT.find(a => a.id === 'pa28');
  const flight = createFlight(FL, {
    prefs: { autoRud: settings.get('autoRud') },
    savePrefs: (p) => { if (typeof p.autoRud === 'boolean') settings.set('autoRud', p.autoRud); },
  });
  const fh = ctx.flightHud || null;
  // the HUD's checklist and read-back answers take clicks too (as Enter and 1–3 do)
  if (fh) {
    fh.onChecklistClick(() => { if (!active || stopped()) return null; const r = flight.checklistNext(); if (audio.click) audio.click(); return r; });
    fh.onAtcClick((i) => {
      if (!active || stopped()) return;
      const r = flight.answerAtc(i);
      if (r) toast((r.ok ? '正解。' : `不正解。正しくは「${r.right}」。`) + r.why, 4200);
    });
  }

  // ---- the objects (built once, at boot, so their shaders compile with everything else)
  const live = liveAircraft(FL, A);
  const cockpit = buildCockpit(FL, A, { anisotropy: Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy()) });
  live.root.add(cockpit.root);
  live.root.visible = false;
  scene.add(live.root);
  const seat = seatFromBody(cockpit.instructorSeat, cockpit.instructorSeat.yaw ?? Math.PI);

  // ---- state
  let active = false, phase = 'off';          // 'board' (talking in the seat) | 'ground' | 'lesson' | 'debrief' | 'leaving'
  let view = 'cockpit', yaw = 0, pitch = 0, chaseYaw = 0, chasePitch = 0.08, psiS = null, fov = null;
  let rpmVisual = null, startT = -1, talkOn = false, lineT = 0, lastChime = -1, lastHint = '', hudT = 0, chosen = null;
  let fading = false, warnedExit = 0, debriefShown = false, lastLevel = settings.get('lessonLevel') || 'basic', homeT = 0;
  const pose = { pos: [0, 0, 0], q: [0, 0, 0, 1] };
  const qBody = new THREE.Quaternion(), qHead = new THREE.Quaternion(), eHead = new THREE.Euler(0, 0, 0, 'YXZ');
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), camWorld = new THREE.Vector3(), head = new THREE.Vector3();
  const ray = new THREE.Raycaster(), center = new THREE.Vector2(0, 0);
  ray.far = 1.6;
  let hover = null, zoomHold = false;

  // ---- the fade (a black sheet over everything; the work happens while it is opaque)
  const sheet = document.createElement('div');
  sheet.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:28;transition:opacity .4s ease';
  document.body.appendChild(sheet);
  function fade(fn, instant) {
    if (instant) { fn(); return; }
    fading = true; sheet.style.opacity = '1';
    setTimeout(() => {
      try { fn(); } catch (e) { console.error(e); }
      setTimeout(() => { sheet.style.opacity = '0'; fading = false; }, 120);
    }, FADE_MS);
  }

  // ---- the instructor's talk in the seat (the dialogue UI, with its own runner)
  const talkData = cockpitDialogs(FL, { lessonId: ctx.lessonId || 'a1' });
  const runner = createRunner({ data: talkData, state: ctx.talkState, hooks: { onHook } });
  runner.onChange((v) => {
    if (v) { ctx.dui.show(v); if (v.speaker === 'instructor' && !instructor.gesturing && Math.random() < 0.25) instructor.gesture('explain'); }
    else endTalk();
    ctx.saveTalk();
  });
  function onHook(name, arg) {
    if (name === 'fly') chosen = arg;
    else if (name === 'nod') instructor.gesture('nod');
    else if (name === 'look') instructor.gesture('explain');
    else if (name === 'point') { pointAtPanel(arg); }
  }
  function pointAtPanel(what) {
    const t = what === 'pedals' ? cockpit.parts.pedalsL : cockpit.screens.pfd;
    if (!t) return;
    t.getWorldPosition(v1); instructor.pointAt(v1); instructor.gesture('point');
  }
  function startTalk() {
    talkOn = true; chosen = null; ctx.onTalk(true);
    input.exitLock();
    runner.start('board');
  }
  function endTalk() {
    if (!talkOn) return;
    talkOn = false; ctx.dui.hide(); ctx.onTalk(false);
    const c = chosen; chosen = null;
    if (c === 'leave') leave();
    else if (c === 'free') beginFree();
    else if (c === 'intro' || c === 'basic' || c === 'precision') beginLesson(c);
    else beginFree();                       // a talk stopped some other way (the mode changed): stay on the ground
    homeT = 1.2;                            // the head turns back to the front (unless the mouse moves it)
    if (active && phase !== 'leaving') input.requestLock();
  }

  // ---- boarding and getting out
  function board({ instant = false } = {}) {
    if (active) return 'flying';
    active = true; phase = 'board';
    fade(() => {
      const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c);
      flight.startOnGround(n, e, ctx.stand.hdgTrue, 'pa28', { autoRud: settings.get('autoRud') });
      ctx.parkedToday.visible = false; ctx.todayColliders(false);
      live.root.visible = true; cockpit.setVisible(true); setView('cockpit');
      rpmVisual = 0; startT = -1;                               // the engine is off until he starts it
      // the instructor: in the right seat
      live.root.add(instructor.root);
      instructor.root.position.set(seat.position[0], seat.position[1], seat.position[2]); instructor.root.rotation.set(0, seat.yaw, 0);
      if (instructor.setSeated) instructor.setSeated(seat.seat);
      yaw = 0; pitch = HOME_PITCH;
      ctx.onEnter();
      placeNow();
      if (fh) { fh.show(true); fh.setMode('free'); if (settings.get('panel2D') !== fh.panel2D) fh.setPanel2D(!!settings.get('panel2D')); }
      startTalk();
    }, instant);
    return 'board';
  }
  function leave({ instant = false, then = 'walk' } = {}) {
    if (!active || phase === 'leaving') return;
    phase = 'leaving';
    if (runner.running) runner.stop();
    if (flight.L && !flight.free && !flight.L.done) flight.abort('中止');
    fade(() => {
      active = false; phase = 'off';
      live.root.visible = false; cockpit.setVisible(false);
      ctx.parkedToday.visible = true; ctx.todayColliders(true);
      if (instructor.setSeated) instructor.setSeated(null);
      ctx.instructorHome(instructor.root);
      rpmVisual = null;
      if (audio.engine) audio.engine(null);
      if (fh) { fh.hideDebrief(); fh.show(false); }
      debriefShown = false;
      sky.setShadowHalf(null);
      camera.fov = settings.get('fov'); camera.updateProjectionMatrix(); fov = null;
      hud.prompt(null);
      ctx.onLeave(then);
    }, instant);
  }
  function beginFree() {
    phase = 'ground';
    if (fh) fh.setMode('free');
    // the engine start: the starter turns the propeller, the engine catches and settles at idle (the physics' engine
    // was running all along, at idle with the park brake on: nothing moves)
    startT = 0; rpmVisual = 0;
    if (audio.starter) audio.starter();
  }
  function beginLesson(level, { instant = false } = {}) {
    lastLevel = level; settings.set('lessonLevel', level);
    fade(() => {
      flight.startLesson(ctx.lessonId || 'a1', level, { autoRud: settings.get('autoRud') });
      phase = 'lesson'; rpmVisual = null; startT = -1; lastChime = -1; lastHint = ''; debriefShown = false;
      yaw = 0; pitch = HOME_PITCH; homeT = 0;
      if (fh) { fh.hideDebrief(); fh.setMode('lesson'); }
      placeNow();
      toast('訓練空域に着きました', 2600);
    }, instant);
  }
  function retry() { if (fh) fh.hideDebrief(); debriefShown = false; beginLesson(lastLevel); input.requestLock(); }
  function freeFromHere() {
    if (fh) fh.hideDebrief(); debriefShown = false;
    fade(() => {
      flight.startFree('area', 'pa28', { autoRud: settings.get('autoRud') });
      phase = 'ground'; rpmVisual = null; startT = -1;
      if (fh) fh.setMode('free');
      placeNow();
    });
    input.requestLock();
  }

  // ---- the view
  function setView(v) {
    view = v;
    const inside = v === 'cockpit';
    live.setInside(inside); cockpit.setVisible(inside);
    instructor.root.visible = inside;
    sky.setShadowHalf(inside ? 5 : null);
    hud.prompt(null); hover = null;
  }
  // the aircraft where the physics has it (between the last two steps), the camera at the eye or behind
  function placeNow() {
    flight.pose(pose);
    live.root.position.set(pose.pos[0] - L.E0, pose.pos[1], pose.pos[2] + L.N0);
    live.root.quaternion.set(pose.q[0], pose.q[1], pose.q[2], pose.q[3]);
    live.root.updateMatrixWorld(true);
  }
  function placeCamera(dt) {
    if (view === 'cockpit') {
      v1.copy(cockpit.eye); live.root.localToWorld(v1); camera.position.copy(v1);
      eHead.set(pitch, yaw, 0); qHead.setFromEuler(eHead);
      camera.quaternion.copy(live.root.quaternion).multiply(qHead);
    } else {
      // FLIGHT LAB's chase view: behind the aircraft along its smoothed heading, level, 2.6 m up; the mouse orbits it
      const s = flight.s, f = P.qrot(s.q, [0, 0, -1]), psi = Math.atan2(f[0], -f[2]);
      if (psiS == null) psiS = psi;
      let d = psi - psiS; d = Math.atan2(Math.sin(d), Math.cos(d)); psiS += d * (1 - Math.exp(-dt / 0.2));
      const dist = 8 + A.phys.L, ang = psiS + chaseYaw, cp = Math.cos(chasePitch);
      const p = live.root.position;
      camera.position.set(p.x - Math.sin(ang) * dist * cp, p.y + 0.9 + Math.sin(chasePitch) * dist + 1.7, p.z + Math.cos(ang) * dist * cp);
      camera.position.y = Math.max(camera.position.y, L.G + 1.5);
      v2.set(p.x, p.y + 0.9, p.z); camera.lookAt(v2);
    }
  }

  // ---- the controls under the crosshair (cockpit view)
  function applyAct(d) {
    if (!d) return;
    if (d.type === 'flight') {
      const t = flight.action(d.name, d.arg);
      if (t) toast(t, 2200);
      if (audio.click) audio.click();
    } else if (d.type === 'av') {
      const t = AV.control(flight.av, d.what, d.dir, d.big);
      if (cockpit.markDirty) cockpit.markDirty();
      if (t) toast(t, 1200);
      if (audio.knob) audio.knob();
    } else if (d.type === 'switch') {
      cockpit.switches[d.id] = d.on;
      if (audio.click) audio.click();
    } else if (d.type === 'select') {
      cockpit.switches[d.id] = d.value;
      if (d.id === 'mag' && d.value === 'START') setTimeout(() => { if (cockpit.switches.mag === 'START') cockpit.switches.mag = 'BOTH'; }, 900);
      if (audio.click) audio.click();
    } else if (d.type === 'exit') {
      if (canExit()) leave();
      else if (performance.now() - warnedExit > 1500) { warnedExit = performance.now(); toast('止まって、エンジンをアイドルにしてから降りましょう', 2400); }
    } else if (d.type === 'info' && d.text) toast(d.text, 2600);
  }
  function canExit() {
    if (!flight.L) return true;
    const s = flight.s;
    if (!flight.free) return !!flight.L.done;
    return s.crashed || (s.onGround && Math.hypot(s.vel[0], s.vel[2]) < 0.6);
  }
  function lights() {
    const sw = cockpit.switches, on = sw.master !== false;
    return { nav: on && sw.nav, beacon: on && sw.beacon, strobe: on && sw.strobe, landing: on && sw.landing, taxi: on && sw.taxi };
  }
  const lightsOut = { nav: false, beacon: false, strobe: false, landing: false, taxi: false };

  // ---- every frame while flying
  function update(dt, { live: isLive = true, paused = false } = {}) {
    if (!active) return;
    const look = input.takeLook(), wheel = input.takeWheel ? input.takeWheel() : 0;
    const stop = paused || fading || talkOn || debriefShown || !isLive;
    // the flight (FLIGHT LAB's tick: the keys once, then 1/120 s steps)
    const res = flight.frame(dt, keysFor(stop), { paused: stop || phase === 'board' || phase === 'leaving' });
    for (const ev of res.events) onEvent(ev);
    if (res.ended) onEnded();
    for (const r of res.pad || []) {
      if (r.type === 'view') setView(view === 'cockpit' ? 'chase' : 'cockpit');
      else if (r.type === 'toast' && r.text) toast(r.text, 2400);
      else if (r.type === 'help' && fh) fh.setHelp(!fh.help);
    }
    // the head (or the orbit round the aircraft)
    if (!stop) {
      const sens = 0.0022 * settings.get('sensitivity'), inv = settings.get('invertY') ? -1 : 1;
      if (view === 'cockpit') {
        if (look.x || look.y) homeT = 0;
        else if (homeT > 0) { homeT -= dt; const k = 1 - Math.exp(-dt / 0.3); yaw += (0 - yaw) * k; pitch += (HOME_PITCH - pitch) * k; }
        yaw = THREE.MathUtils.clamp(yaw - look.x * sens, -LOOK.yaw, LOOK.yaw);
        pitch = THREE.MathUtils.clamp(pitch - look.y * sens * inv, -LOOK.down, LOOK.up);
      } else {
        chaseYaw -= look.x * sens; chasePitch = THREE.MathUtils.clamp(chasePitch - look.y * sens * inv, -0.15, 1.2);
      }
    } else if (talkOn) faceInstructor(dt);
    // the engine start (the propeller only: the physics' engine idles throughout)
    if (startT >= 0) {
      startT += dt;
      const idle = flight.s.rpm || 650;
      rpmVisual = startT < 1.3 ? 180 * (startT / 1.3) : startT < 2.6 ? 180 + (idle - 180) * THREE.MathUtils.smoothstep(startT, 1.3, 2.6) : null;
      if (rpmVisual == null) startT = -1;
    }
    placeNow();
    live.update(flight.s, { dt, rpmVisual, lights: cockpit.switches.master === false ? lightsOut : lights(), inside: view === 'cockpit' });
    placeCamera(dt);
    // looking closer (the right button held), back to the setting's field of view
    const want = view === 'cockpit' && !stop && (input.down('Mouse2') || zoomHold) ? ZOOM_FOV : settings.get('fov');
    fov = fov == null ? camera.fov : fov;
    fov += (want - fov) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    camera.getWorldPosition(camWorld);
    // the cockpit's switches and knobs under the crosshair
    if (view === 'cockpit' && !stop) {
      ray.setFromCamera(center, camera);
      hover = cockpit.pick(ray);
      hud.prompt(hover ? hover.label : null, hover ? (hover.kind === 'knob' ? 'ホイール' : 'クリック') : null);
      if (hover) {
        if (input.pressed('Mouse0')) applyAct(hover.act(1, false));
        if (wheel) for (let i = 0; i < Math.abs(wheel); i++) applyAct(hover.act(Math.sign(wheel), true));
      }
    } else if (hover) { hover = null; hud.prompt(null); }
    cockpit.update(dt, { s: flight.s, L: flight.L, av: flight.av, parkBrake: flight.controls.parkBrake, night: night() });
    // the instructor: looks at you while he speaks, otherwise round the panel and outside
    const speaking = talkOn || lineT > 0;
    if (lineT > 0) lineT -= dt;
    instructor.update(dt, { lookAt: speaking ? camWorld : null, talking: speaking && (talkOn ? !!(ctx.dui.typing) : lineT > 0.4) });
    if (phase === 'lesson' && !stop) lessonVoice();
    if (fh && (hudT -= dt) <= 0) { hudT = 0.12; fh.update(flight.status(), flight.panel()); fh.setHood(!!(flight.L && flight.L.hood && !flight.L.done)); }
    if (audio.engine) {
      const s = flight.s, o = s.out;
      audio.engine({ rpm: rpmVisual != null ? rpmVisual : o.rpm, thr: s.thr, ias: o.ias, onGround: s.onGround, stall: !!o.stallWarn, inside: view === 'cockpit', running: startT < 0 && phase !== 'board' && !!(s.eng[0] && s.eng[0].run) });
    }
    if (flight.free && phase === 'ground') taxiCheck();
  }
  const stopped = () => fading || talkOn || debriefShown || phase === 'board' || phase === 'leaving';
  // the keys go to the aircraft only when the player is flying it (not while a talk, the debrief or the menu is up)
  const NO_KEYS = { has: () => false };
  const KEYS = { has: (c) => input.down(c) };
  const keysFor = (stop) => (stop ? NO_KEYS : KEYS);
  function faceInstructor(dt) {
    instructor.headWorld(head);
    v1.copy(head); live.root.worldToLocal(v1); v1.sub(cockpit.eye);
    const ty = Math.atan2(-v1.x, -v1.z), tp = Math.atan2(v1.y, Math.hypot(v1.x, v1.z)), k = 1 - Math.exp(-dt / 0.25);
    yaw += (ty - yaw) * k; pitch += (tp - pitch) * k;
  }
  function night() { const el = sky.state.el; return 1 - THREE.MathUtils.smoothstep(el, -4, 6); }

  // ---- what the instructor says in a lesson: each step's instruction, the hints (not too often)
  function say(text, ms = 5200) {
    if (!text) return;
    lineT = Math.min(6, 1 + text.length * 0.09);
    if (fh) fh.say(instructorName(), text, ms); else toast(text, ms);
  }
  const instructorName = () => (ctx.instructorName || '早瀬 教官');
  function lessonVoice() {
    const st = flight.L; if (!st || st.done) return;
    if (st.chime !== lastChime) {
      lastChime = st.chime;
      const line = flightLine(st.sayText);
      if (line) { say(line); if (/PFD|計器|姿勢表示/.test(line)) pointAtPanel('pfd'); }
      if (audio.chime) audio.chime();
      lastHint = st.hint; lineT = Math.max(lineT, 4);
      return;
    }
    if (st.hint && st.hint !== lastHint && lineT <= 0) {
      lastHint = st.hint;
      if (!/^良い調子/.test(st.hint) || Math.random() < 0.3) say(flightLine(st.hint), 4200);
      lineT = Math.max(lineT, 6);
    }
  }
  function onEvent(ev) {
    if (ev.type === 'touchdown') {
      if (audio.touchdown) audio.touchdown(ev.fpm);
      toast(`接地：${ev.fpm} fpm・${ev.kias} kt・中心線から ${Math.abs(ev.cross)} m ${ev.cross >= 0 ? '右' : '左'}${ev.onRunway ? '' : '（滑走路の外）'}`, 3200);
    } else if (ev.type === 'hard_landing') say('ハードランディングです。フレアが遅れたか、進入が速すぎました。', 4200);
    else if (ev.type === 'runway_excursion') say('滑走路から外れました。ラダーでセンターラインを保ちましょう。', 4200);
    else if (ev.type === 'tail_strike') say('尾部を擦りました。機首の上げすぎです。', 3800);
    else if (ev.type === 'engine_stop') toast(`エンジン停止：${ev.why}`, 3500);
    else if (ev.type === 'crash') { toast(`機体損傷：${ev.why}`, 5000); if (flight.free) setTimeout(() => showFreeEnd(), 1500); }
  }
  function onEnded() {
    flight.finish();
    const st = flight.status();
    setTimeout(() => {
      if (!active || flight.status().done !== true) return;
      say(debriefLine(st), 6000);
      if (fh) { fh.showDebrief(st, { onRetry: retry, onFree: freeFromHere, onReturn: () => leave() }); debriefShown = true; input.exitLock(); }
    }, st.crashed ? 1500 : 600);
  }
  function showFreeEnd() {
    if (!active || !fh) return;
    fh.showDebrief(flight.status(), { onRetry: () => { fh.hideDebrief(); debriefShown = false; fade(() => { const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c); flight.startOnGround(n, e, ctx.stand.hdgTrue, 'pa28', { autoRud: settings.get('autoRud') }); placeNow(); }); input.requestLock(); }, onFree: null, onReturn: () => leave() });
    debriefShown = true; input.exitLock();
  }
  // taxiing into a hangar, a building or another aircraft: the colliders the walker uses (the aircraft's nose, wing
  // tips and tail, at their heights)
  const PROBES = [[0, -0.1, -3.3], [5.3, -0.2, -0.6], [-5.3, -0.2, -0.6], [0, 0.6, 4.0], [0, 1.4, 3.6]];
  function taxiCheck() {
    const s = flight.s;
    if (!s.onGround || s.crashed || Math.hypot(s.vel[0], s.vel[2]) < 0.3) return;
    for (const p of PROBES) {
      v1.set(p[0], p[1], p[2]); live.root.localToWorld(v1);
      const [fx, fz] = ctx.toFrame(v1.x, v1.z), h = v1.y - L.G;
      for (const b of world.query(fx - 0.05, fz - 0.05, fx + 0.05, fz + 0.05)) {
        if (b.tag === 'fence' || b.tag === 'tree' && h > 8) continue;
        if (fx > b.x0 && fx < b.x1 && fz > b.z0 && fz < b.z1 && h > b.y0 && h < b.y1) { flight.crash('地上の障害物に接触しました'); return; }
      }
    }
  }

  // ---- keys (keydown, once per press): FLIGHT LAB's actions, the view, the help, the panel
  function key(e) {
    if (!active || e.repeat) return false;
    if (talkOn || debriefShown || fading) return false;
    if (e.code === 'KeyC') { setView(view === 'cockpit' ? 'chase' : 'cockpit'); return true; }
    if (e.code === 'KeyH') { if (fh) fh.setHelp(!fh.help); return true; }
    if (e.code === 'Tab') { e.preventDefault(); if (fh) { const on = !fh.panel2D; fh.setPanel2D(on); settings.set('panel2D', on); } return true; }
    if (phase === 'board') return false;
    // CADET's own: Shift+B sets or releases the parking brake (FLIGHT LAB has none; B alone is the brakes, held)
    if (e.code === 'KeyB' && e.shiftKey) { applyAct({ type: 'flight', name: 'parkBrake' }); e.preventDefault(); return true; }
    const r = flight.key(e.code, e.shiftKey);
    if (!r) return false;
    if (r.kind === 'checklist' && r.ok === false && fh) fh.flashChecklist(r.text);
    else if (r.text) toast(r.text, r.kind === 'atc' ? 4200 : 2400);
    if (r.kind === 'action' && audio.click) audio.click();
    e.preventDefault();
    return true;
  }

  // the 2D panel (Tab): FLIGHT LAB's own PFD and MFD, from the same data as the cockpit's screens (app.js panelData), 30 Hz
  let p2dT = 0;
  function draw2D(dt = 1 / 60) {
    if (!fh || !fh.panel2D || !flight.L || !active) return;
    if ((p2dT -= dt) > 0) return; p2dT = 1 / 30;
    const s = flight.s, d = { o: { ...s.out, onGround: s.onGround }, av: flight.av, nav: AV.navSolve(flight.av, P.ne(s), s.out, P.MAGVAR_W, P.LAB_RWY), varW: P.MAGVAR_W, qnh: s.qnh, eng: s.eng.map(e => ({ run: e.run, rpm: e.rpm, feather: e.feather })), V: s.A.v, fuelCap: s.A.fuelCap, pos: P.ne(s) };
    fh.drawPanel2D(AV, d);
  }

  return {
    flight, live, cockpit,
    get active() { return active; }, get phase() { return phase; }, get view() { return view; }, get talking() { return talkOn; },
    get debrief() { return debriefShown; }, get runner() { return runner; },
    board, leave, setView, update, key, draw2D, canExit,
    actOn(id, dir = 1, wheel = false) { const c = cockpit.controls.find(x => x.id === id); if (!c) return null; const d = c.act(dir, wheel); applyAct(d); return d; },
    beginLesson, retry, freeFromHere,
    // the head (degrees: yaw + to the left, pitch + up) and looking closer, as the mouse would (for the tests)
    look(yawDeg, pitchDeg) { yaw = yawDeg * DEG; pitch = pitchDeg * DEG; homeT = 0; },
    setZoom(on) { zoomHold = !!on; },
    // a lesson flown by a scripted pilot (FLIGHT LAB's bot, for the tests), then the same end as a flown one
    runScripted(pilot, maxSec, hook) { const L0 = flight.runScripted(pilot, maxSec, hook); if (L0 && L0.done) onEnded(); return L0; },
    // the shadow box follows the aircraft (a small one round the cockpit), the windsock the lesson's wind
    shadowFocus(out) { return out.copy(live.root.position); },
    wind() { const w = flight.s ? flight.s.wind : null; return w ? { fromDeg: ((w.fromDeg % 360) + 360) % 360, kt: w.kt } : null; },
    altitude() { return flight.s ? flight.s.out.agl / 3.28084 : 0; },
    // shown during the boot compile, hidden afterwards
    prepareCompile(on) { live.root.visible = on; cockpit.setVisible(on); },
    status() {
      // the instructor's head in the aircraft's frame (x right, y up, −z forward): in the right seat while flying
      let seatAt = null;
      if (active && instructor.headWorld) { instructor.headWorld(v2); live.root.worldToLocal(v2); seatAt = v2.toArray(); }
      return { active, phase, view, talking: talkOn, debrief: debriefShown, flight: flight.L ? flight.status() : null, rpmVisual, yaw, pitch, hover: hover ? hover.id : null, seatAt, eye: cockpit.eye.toArray() };
    },
  };
}
