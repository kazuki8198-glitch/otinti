// CADET — flight/fly-mode.js : boarding today's Archer and flying it (M3).
// The player walks up to the aircraft and gets in (a short fade): the flown model takes the parked one's place, the
// cockpit is drawn round the pilot's eye, and 早瀬 教官 sits in the right seat. He asks what to do — today's lesson
// (the transit to the training area is skipped: FLIGHT LAB's lesson starts in the air) at one of three levels, a free
// flight from the apron, or getting out again. In flight FLIGHT LAB's lesson runs exactly as in FLIGHT LAB
// (flight/flight.js), the instructor says each step's instruction and the hints, and a debrief follows the end.
// The view: the pilot's eye with the mouse (right button held: look closer), or outside behind the aircraft (C); a
// click on a switch, lever or knob under the crosshair works it, the wheel turns it. The instruments up close
// (flight/panel-view.js): I — or a click on a display — moves the eye in front of the PFD, the MFD or the standby
// dials (a short move; the head turns a little way there, and that unit's knobs and keys stay under the crosshair);
// the wheel off a control zooms smoothly (+ / − too), and Tab shows the two screens large, drawn from the glass's
// own canvases. While the one in the right seat
// talks, the flight waits (paused, the keys not the aircraft's) but the head stays the player's: it turns to them when
// the talk begins, for FACE_S (any look of the mouse's stops that), and looks wherever the mouse takes it; the switches
// under the crosshair, the closer look and the keys wait for the talk's end. Getting out puts the aircraft back on its
// stand.
// M4: the engine and the electrics are aircraft/systems.js behind the cockpit's switches (cold on the stand: the
// cadet, or the instructor, starts it); the whole first day is flight/day-mode.js (the checklists, the radio, the
// taxiing, t1 → a2 → t3, the debrief and the logbook).
// The prologue's introductory flight (体験飛行: flight/intro-flight.js) is set over the practice area behind main.js's
// card (introFlight), then begun (introBegin): his talks, the cadet's tasks with the yoke only, his lines; the switches
// under the crosshair wait. Getting out of it drops its time (flight.discard: not FLIGHT LAB's to keep) and tells
// main.js how it went (onLeave's intro).
// main.js owns the modes, the menu and the loop; it hands this module what it needs (ctx below) and calls update()
// every frame while flying.
import * as THREE from 'three';
import { createFlight, H } from './flight.js';
import { actionForKey, FLY_HELD } from './controls.js';
import { createIntro, scriptedKeys } from './intro-flight.js';
import { introAirDialogs, INTRO_AIR } from '../content/dialog/intro.js';
import { liveAircraft } from '../aircraft/exterior.js';
import { buildCockpit } from '../aircraft/cockpit.js';
import { seatFromBody } from '../npc/actor.js';
import { createRunner } from '../dialog/engine.js';
import { cockpitDialogs, flightLine, debriefLine } from '../content/dialog/cockpit.js';
import { debriefDialogs } from '../content/dialog/debrief.js';
import { withEnglish, airEnglish } from '../content/dialog/en.js';
import { EVENT_LINES } from '../content/dialog/day1.js';
import { createSystems, RUNNING } from '../aircraft/systems.js';
import { FOCUS_FRAME, FOCUS_LOOK, FOCUS_T, STBY_OFF, nextFocus, zoomStep, smooth01, lerpAngle } from './panel-view.js';
import { createDayMode } from './day-mode.js';
import { createTraffic } from './traffic.js';
import { cbEffect } from './cb.js';
import { iceStep, iceApply } from './ice.js';
import { createRecorder, sampleAt as recSampleAt, duration as recDuration } from './recorder.js';
import { createTrafficView } from './traffic-view.js';
import { createAutopilot, drawApStrip } from './autopilot.js';
import { createRouteLine } from '../world/route-line.js';
import { ourCall, CALL } from '../content/dialog/atc.js';

const DEG = Math.PI / 180;
const FADE_MS = 420;
const LOOK = { yaw: 150 * DEG, up: 60 * DEG, down: 70 * DEG };
const ZOOM_FOV = 30;
const HOME_PITCH = -4 * DEG;            // the head at rest: a little down, the horizon above the glareshield
const FACE_S = 0.8;                     // a talk begins: the head turns to the one beside you for this long (main.js's too)

// ctx: { FL, L, scene, camera, renderer, sky, input, settings, audio, toast(text, ms), hud (prompt), dui (the dialogue
//   UI), talkState, saveTalk(), instructor, instructorHome(root) (puts him back in the briefing room), stand { a, c,
//   hdgTrue }, parkedToday (its root), todayColliders(on), toFrame(x, z), world (colliders, for the taxi check),
//   flightHud (optional), dayHud (optional), lessonId (the lesson flown alone), today() (the day: career/day.js, made by
//   main with the walk-around), onLogbook(summary, remark) (the debrief signed the logbook; returns a promise that
//   resolves when the cadet has closed it), onDayOver(day) (got out after a day, finished or not), wind { fromDeg, kt } (the day's), onEnter(), onLeave(), onTalk(on), onPause()
//   M5: crew() → who sits in the right seat today ({ actor, name, id }: the instructor, the chief instructor on the
//   check ride) or null (the first solo); boardDialogs() → the talk on sitting down (the day's own); onSolo(summary)
//   (the solo's day is over in the seat: no one to debrief it there); onIntroDone(summary) (the introductory flight is
//   over in the air: main.js's card, then leave) }
export function createFlyMode(ctx) {
  const { FL, L, scene, camera, sky, input, settings, audio, toast, hud, world } = ctx;
  // who is in the right seat (chosen when boarding): the instructor's actor, or the chief instructor's, or no one
  let crew = ctx.instructor, crewName = ctx.instructorName || '早瀬 教官', crewColor = null, crewId = 'instructor';
  const P = FL.physics, AV = FL.avionics;
  // (the day's air: the ATIS temperature against ISA at the field (55 ft ≈ 15 °C) — the day's lessons fly in
  // it, and the instructor's steady-state numbers breathe it too; outside a day, standard air)
  const dayOatDev = () => { const d = ctx.today && ctx.today(); const t = d && d.radio && d.radio.weather && d.radio.weather.tempC; return t != null ? Math.round(t - 15) : undefined; };
  const CB_CENTRE = P.rwyToNE(P.LAB_RWY, 600, 0);   // (B3.3) the field's centre in NE, the CB's offsets' origin
  const A = P.AIRCRAFT.find(a => a.id === 'pa28');
  const flight = createFlight(FL, {
    prefs: { autoRud: settings.get('autoRud'), hold: settings.get('pitchHold') ? 'hold' : 'spring', gainCap: settings.get('stickBoost') ? 2.6 : 1.7, padDz: settings.get('padDz'), holdSens: settings.get('holdSens'), padMap: settings.get('padMap'), keyBinds: settings.get('keyBinds'), heldBinds: settings.get('heldBinds') },
    savePrefs: (p) => { if (typeof p.autoRud === 'boolean') settings.set('autoRud', p.autoRud); },
  });
  // the controls' live preferences follow the settings screen (the axis map, the bindings, the feels)
  if (typeof settings.onChange === 'function') settings.onChange((k) => {
    if (k === 'padMap' || k === 'keyBinds' || k === 'heldBinds' || k === 'padDz' || k === 'holdSens') flight.controls.setPrefs({ [k]: settings.get(k) });
  });
  const fh = ctx.flightHud || null;
  // the HUD's checklist and read-back answers take clicks too (as Enter and 1–3 do)
  if (fh) {
    fh.onChecklistClick(() => { if (!active || stopped()) return null; const r = flight.checklistNext(); if (audio.click) audio.click(); return r; });
    fh.onAtcClick((i) => { if (active && !stopped()) flight.answerAtc(i); });      // (the HUD shows the answer)
  }

  // ---- the objects (built once, at boot, so their shaders compile with everything else)
  // (M6) the twin's days fly the Seminole: its own flown model; the cockpit moves into whichever is today's
  // (ctx.aircraft()) and shows that type's own parts (the Seminole's quadrant, gear selector and nose: cockpit.setType)
  const A44 = P.AIRCRAFT.find(a => a.id === 'pa44');
  const lives = { pa28: liveAircraft(FL, A), pa44: liveAircraft(FL, A44, { reg: 'N452SY' }) };
  let live = lives.pa28, liveId = 'pa28';
  const cockpit = buildCockpit(FL, A, { anisotropy: Math.min(8, ctx.renderer.capabilities.getMaxAnisotropy()), twin: A44 });
  live.root.add(cockpit.root);
  for (const l of Object.values(lives)) { l.root.visible = false; scene.add(l.root); }
  const todayType = () => (ctx.aircraft ? ctx.aircraft() : 'pa28') || 'pa28';
  function useAircraft(id) {
    if (!lives[id] || id === liveId) return;
    const was = live, vis = was.root.visible;
    live = lives[id]; liveId = id;
    for (const c of [...was.root.children]) if (c === cockpit.root || c.name === 'cockpit-guide' || (crew && c === crew.root)) live.root.add(c);
    was.root.visible = false; live.root.visible = vis;
    cockpit.setType(id);
  }
  const seat = seatFromBody(cockpit.instructorSeat, cockpit.instructorSeat.yaw ?? Math.PI);
  // the engine and the electrics behind the switches
  const systems = createSystems(cockpit.switches);
  const engShow = { rpm: 0, run: false, twin: systems.twinLive, oil: 0, oilT: null, elec: null, hobbs: 471.2 };
  let elecWarned = false, elecLowSeen = false;             // (the alternator-failure day: warned once, noted for the logbook)
  let wakeAdd = 0;                                          // (traffic wake currently added to the wind's gust)
  // the ring round the control to use next (the day's checklists): drawn over everything, pulsing
  const guide = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.0275, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 0.7), transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  guide.renderOrder = 10; guide.visible = false; guide.name = 'cockpit-guide';
  live.root.add(guide);
  let guideCtl = null;
  // the way to taxi, on the pavement
  const routeLine = createRouteLine(L); scene.add(routeLine.mesh);
  // the other trainers in the pattern (flight/traffic.js): the day says how many (today.traffic); they fly
  // while the cadet is in the aircraft, and their calls are heard on the tower frequency
  const traffic = createTraffic(P);
  const trafficView = createTrafficView({ FL, L, scene });
  // the autopilot (flight/autopilot.js): its pilot flies through the bridge's hook when it is engaged; the
  // keys stay the cadet's (the throttle, the flaps — and a held pitch / roll key takes the controls back)
  const ap = createAutopilot(FL);
  const apPilot = (Lh, dt) => ap.pilot(Lh, dt);
  // the navaid ident's clock, and which aid (if any) is audible now: a NAV radio's tuned aid, monitored
  // on the audio panel, close enough to hear (a VOR's ident carries ~40 NM, a localizer's ~25)
  let identT = 0;
  const monitoredAid = () => {
    const av = flight.av, s = flight.s;
    if (!av || !s || !av.audio || !av.audio.monitor) return null;
    for (const [radio, mon] of [['nav1', 'NAV1'], ['nav2', 'NAV2']]) {
      if (!av.audio.monitor[mon]) continue;
      const aid = AV.NAVAIDS.find(a => a.freq === av[radio].act);
      if (!aid || aid.n == null) continue;
      const dn = aid.n + s.pos[2], de = aid.e - s.pos[0];
      if (Math.hypot(dn, de) / 1852 <= (aid.kind === 'LOC' ? 25 : 40)) return aid;
    }
    return null;
  };
  const AP_WHATS = new Set(['AP', 'AP_HDG', 'AP_ALT', 'AP_NAV', 'AP_APR', 'AP_VS', 'AP_LVL', 'FD']);
  // the first day (what it borrows from here)
  const NOHUD = { setTask() {}, setChecklist() {}, setRadio() {}, hideAll() {} };
  const dayMode = createDayMode({ FL, flight, systems, audio, settings, routeLine, dayHud: ctx.dayHud || NOHUD,
    get stand() { return { a: ctx.stand.a, c: ctx.stand.c }; },
    say: (t, ms) => say(t, ms), note: (t, ms) => { if (fh) fh.say('メモ', t, ms); else toast(t, ms); },
    setGuide: (id) => setGuide(id), startLesson: startDayLesson, talk: (w) => startTalk(w), debrief: startDebrief,
    markDirty: () => { if (cockpit.markDirty) cockpit.markDirty(); } });

  // ---- state
  let active = false, phase = 'off';          // 'board' (talking in the seat) | 'ground' | 'lesson' | 'debrief' | 'leaving'
  let carbDay = 0;                            // a humid day's carburettor-ice risk (set by beginDay; 0 = it cannot form)
  let faultKind = null;                       // the day's fault kind (mag / carb / pitot / gear / pump), applied to the physics each frame
  let view = 'cockpit', yaw = 0, pitch = 0, chaseYaw = 0, chasePitch = 0.08, psiS = null, fov = null;
  // the flight recorder (recorder.js): every flight is kept at 10 Hz for the debrief's replay and the
  // logbook's export. The fixed viewpoint cameras (the spectator's presets, in the runway frame): usable
  // while someone else flies (the autopilot, the instructor's hands, the introductory flight) and in replay
  const recorder = createRecorder();
  let simRate = 1, activePause = false, rateWasHigh = false;   // (the cruise's time compression + the frozen frame)
  let replay = null;                            // { rec, t, playing, wasDebrief }
  let pilotFlying = false;                      // (last frame's pilot hook: the instructor / a demo at the controls)
  let fixedIdx = 0;
  const FIXED_CAMS = [
    { label: '滑走路端（36 側）', pos: () => L.rwyToLocal(-28, -3, 1.65), look: () => L.rwyToLocal(700, 0, 0) },
    { label: '管制塔', pos: () => L.rwyToLocal(716, 258, 19.2), look: () => L.rwyToLocal(520, 40, 0) },
    { label: '最終進入 2 km', pos: () => L.rwyToLocal(-2000, 0, 2 + 2000 * Math.tan(3 * Math.PI / 180)), look: () => L.rwyToLocal(320, 0, 0) },
    { label: 'エプロン', pos: () => L.rwyToLocal(598, 146, 1.65), look: () => L.rwyToLocal(430, 205, 1) },
  ];
  const canFixed = () => !!(replay || (ap && ap.on) || intro || pilotFlying);
  // the instruments up close (panel-view.js): the unit in focus, the head's small turn inside it, the wheel's zoom
  // (a target field of view; null = the setting's, or the focus view's own framing), and the camera's move between
  // poses (a snapshot of the pose it leaves, blended over FOCUS_T)
  let focusId = null, fYaw = 0, fPitch = 0, zoomFov = null;
  const camPose = { eye: new THREE.Vector3(), yaw: 0, pitch: HOME_PITCH };
  const camBlend = { t: 1, eye: new THREE.Vector3(), yaw: 0, pitch: HOME_PITCH };
  let rpmVisual = null, talkOn = false, talkKind = 'board', lineT = 0, lastChime = -1, lastHint = '', hudT = 0, chosen = null, go = null, lastAtcMsg = '';
  const blend = { t: 0, pos: [0, 0, 0], q: new THREE.Quaternion() };
  let fading = false, warnedExit = 0, debriefShown = false, lastLevel = settings.get('lessonLevel') || 'basic', homeT = 0, faceT = 0;
  const pose = { pos: [0, 0, 0], q: [0, 0, 0, 1] };
  const qBlend = new THREE.Quaternion(), qBody = new THREE.Quaternion(), qHead = new THREE.Quaternion(), eHead = new THREE.Euler(0, 0, 0, 'YXZ');
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), camWorld = new THREE.Vector3(), head = new THREE.Vector3();
  const ray = new THREE.Raycaster(), center = new THREE.Vector2(0, 0);
  ray.far = 1.6;
  let hover = null, zoomHold = false, wasStop = true, hintCool = 0, shadowHalf = undefined, debRunner = null;
  // the introductory flight (flight/intro-flight.js) while it goes on, the last talk's 'intro' hook, the last refused
  // key's time, the scripted cadet's keys (introAuto: the tests)
  let intro = null, introGo = null, refusedAt = -1e9, auto = null;
  const INTRO_FREE_KEYS = [[['W', 'S'], 'ピッチ'], [['A', 'D'], 'バンク'], [['H'], 'キー一覧']];

  // ---- the fade (a black sheet over everything; the work happens while it is opaque)
  const sheet = document.createElement('div');
  sheet.style.cssText = 'position:fixed;inset:0;background:#000;opacity:0;pointer-events:none;z-index:28;transition:opacity .4s ease';
  document.body.appendChild(sheet);
  // A newer fade cancels one still pending (getting out while a lesson is being set up): only the last one's work runs.
  let fadeGen = 0;
  function fade(fn, instant) {
    const g = ++fadeGen;
    if (instant) { sheet.style.opacity = '0'; fading = false; fn(); return; }
    fading = true; sheet.style.opacity = '1';
    setTimeout(() => {
      if (g !== fadeGen) return;
      try { fn(); } catch (e) { console.error(e); }
      setTimeout(() => { if (g === fadeGen) { sheet.style.opacity = '0'; fading = false; } }, 120);
    }, FADE_MS);
  }

  // ---- the instructor's talk in the seat (the dialogue UI, with its own runner)
  // (the talk is the day's own: made again each time the cadet sits down)
  let runner = null;
  // (the one in the right seat speaks: the chief instructor on the check ride has his own name on the lines)
  const seatName = (data) => {
    const sp = data.speakers && data.speakers.instructor; if (!sp || !crewName) return data;
    return { ...data, speakers: { ...data.speakers, instructor: { ...sp, name_ja: crewName, ...(crewColor ? { color: crewColor } : {}) } } };
  };
  const makeRunner = (data, getCtx) => { runner = createRunner({ data: seatName(withEnglish(data)), state: ctx.talkState, ctx: getCtx, hooks: { onHook } }); runner.onChange(onTalkView); return runner; };
  const onTalkView = (v) => {
    if (v) { ctx.dui.show(v); if (crew && v.speaker !== 'player' && !crew.gesturing && Math.random() < 0.25) crew.gesture('explain'); }
    else endTalk();
    ctx.saveTalk();
  };
  makeRunner(cockpitDialogs(FL, { lessonId: ctx.lessonId || 'a2' }));
  function onHook(name, arg) {
    if (name === 'fly') { chosen = arg; if (arg === 'free') startEngine(); }   // 「エンジンをかけますね」
    else if (name === 'go') go = arg;
    else if (name === 'intro') introGo = arg;                    // (the introductory flight: what comes after this talk)
    else if (name === 'logbook') signLogbook();
    else if (name === 'nod') { if (crew) crew.gesture('nod'); }
    else if (name === 'look') { if (crew) crew.gesture('explain'); }
    else if (name === 'point') { pointAtPanel(arg); }
    // (M8) a free question to the AI instructor at the debrief: the game opens it (main.js), with the day's results
    else if (name === 'ai' && ctx.onAi) ctx.onAi(arg, talkKind === 'debrief' && debRunner ? debRunner : runner, { summary: debSum });
  }
  // what he points at: the PFD's middle, or the student's pedals (the parts are built in place, so their origins are
  // the cabin's: the points come from their geometry and the controls' aim points)
  const pfdMid = new THREE.Vector3(), pedalsCtl = cockpit.controls.find(c => c.id === 'pedals') || null;
  { const g = cockpit.screens.pfd && cockpit.screens.pfd.geometry; if (g) { g.computeBoundingBox(); g.boundingBox.getCenter(pfdMid); } }
  // the two screens' centres, in the cabin's frame (their geometry carries it, as the PFD's middle above): where a
  // focus view aims, and where its eye sits in front of
  const scrCenter = { pfd: null, mfd: null };
  for (const w of ['pfd', 'mfd']) { const g = cockpit.screens[w] && cockpit.screens[w].geometry; if (g) { g.computeBoundingBox(); scrCenter[w] = g.boundingBox.getCenter(new THREE.Vector3()); } }
  const fpPose = { eye: new THREE.Vector3(), yaw: 0, pitch: 0 };
  const fpV = new THREE.Vector3(), fpN = new THREE.Vector3(), fpQ = new THREE.Quaternion(), fpQi = new THREE.Quaternion();
  // the pose of a focus view, in the aircraft root's frame: the eye in front of the unit (the standby view aims from
  // the MFD's centre by STBY_OFF), looking straight at it — the head's own small turn is added by the camera
  function focusPose(id) {
    const mesh = cockpit.screens[id === 'pfd' ? 'pfd' : 'mfd'];
    fpV.copy(scrCenter[id === 'pfd' ? 'pfd' : 'mfd']);
    if (id === 'stby') { fpV.x += STBY_OFF[0]; fpV.y += STBY_OFF[1]; }
    mesh.localToWorld(fpV); live.root.worldToLocal(fpV);                       // the unit's centre, in the root's frame
    mesh.getWorldQuaternion(fpQ); live.root.getWorldQuaternion(fpQi).invert();
    fpN.set(0, 0, 1).applyQuaternion(fpQ).applyQuaternion(fpQi);               // the way the panel faces, in that frame
    fpPose.eye.copy(fpV).addScaledVector(fpN, FOCUS_FRAME[id].dist);
    const dx = fpV.x - fpPose.eye.x, dy = fpV.y - fpPose.eye.y, dz = fpV.z - fpPose.eye.z;
    fpPose.yaw = Math.atan2(-dx, -dz); fpPose.pitch = Math.atan2(dy, Math.hypot(dx, dz));
    return fpPose;
  }
  // move the eye to a unit (id), back to the pilot's view (null), or nowhere if that is where it already is; the
  // camera blends from the pose it is in. A switch of unit while in focus blends the same way. instant: no blend
  // (a talk begins, a lesson starts, the view leaves the cockpit — the game's own cuts, not the player's look)
  function setFocus(id, instant = false) {
    if (id && view !== 'cockpit') id = null;
    if (id === focusId && (instant || camBlend.t >= 1)) { if (instant) camBlend.t = 1; return; }
    camBlend.eye.copy(camPose.eye); camBlend.yaw = camPose.yaw; camBlend.pitch = camPose.pitch;
    camBlend.t = instant ? 1 : 0;
    focusId = id; fYaw = 0; fPitch = 0;
    zoomFov = id ? FOCUS_FRAME[id].fov : null;
    if (instant) { camPose.eye.copy(cockpit.eye); camPose.yaw = yaw; camPose.pitch = pitch; }
  }
  function cycleFocus() { setFocus(nextFocus(focusId)); }
  // the wheel (or + / −) off a control: zoom from where the view is framed (the setting's field of view, or the
  // focus view's own), and back to that framing — the setting's, as no zoom at all — when stepped all the way out
  function stepWheelZoom(notches) {
    const base = focusId ? FOCUS_FRAME[focusId].fov : settings.get('fov');
    const v = zoomStep(zoomFov, notches, base, focusId ? 70 : base);
    zoomFov = !focusId && v >= base - 0.5 ? null : v;
  }
  function pointAtPanel(what) {
    if (what === 'pedals') { if (!pedalsCtl) return; cockpit.aimPoint(pedalsCtl, v1); }        // (in the world)
    else { if (!cockpit.screens.pfd) return; cockpit.screens.pfd.localToWorld(v1.copy(pfdMid)); }
    if (crew) { crew.pointAt(v1); crew.gesture('point'); }
  }
  // which: 'board' (the menu on sitting down), 'transit' / 'return' / 'pattern' (the day's questions in the air), 'debrief'
  // (the mouse stays captured: the head looks round while he talks; main.js lets it go while the choices are up)
  function startTalk(which = 'board', data = null) {
    if (focusId) setFocus(null, true);     // a talk takes the eye back to the pilot's view (he turns to the speaker)
    talkOn = true; talkKind = which; chosen = null; go = null; ctx.onTalk(true);
    if (fh) fh.show(false);                 // his talk alone on the screen (the flight's panels come back after it)
    faceT = crew ? FACE_S : 0; homeT = 0;
    if (which === 'debrief') {
      debRunner = createRunner({ data: withEnglish(data), state: ctx.talkState, ctx: () => ({ ai: { on: !!settings.get('aiTutor') } }), hooks: { onHook } });
      debRunner.onChange(onTalkView);
      debRunner.start('debrief');
    } else runner.start(which);
  }
  function endTalk() {
    if (!talkOn) return;
    talkOn = false; ctx.dui.hide(); ctx.onTalk(false); faceT = 0;
    const c = chosen, kind = talkKind, g = go; chosen = null; go = null;
    if (!active || phase === 'leaving') return;          // stopped by getting out (the menu): nothing to start
    if (fh) fh.show(true);
    homeT = 1.2;                            // the head turns back to the front (unless the mouse moves it)
    if (intro && kind.startsWith('intro')) { handle(intro.onTalkEnd(introGo)); introGo = null; input.requestLock(); return; }
    if (kind === 'transit' || kind === 'return' || kind === 'pattern') { dayMode.onChoice(g || 'skip'); input.requestLock(); return; }
    if (kind === 'fault' || kind === 'fault2') { dayMode.onFault(g || 'return'); input.requestLock(); return; }
    if (kind === 'debrief') { return; }     // (the logbook is open, or closed: signLogbook carries on)
    if (c === 'leave') leave();
    else if (c === 'free') beginFree();
    else if (c && c.startsWith('day:')) beginDay(c.slice(4));
    else if (c === 'intro' || c === 'basic' || c === 'precision') beginLesson(c);
    else beginFree();                       // a talk stopped some other way (the mode changed): stay on the ground
    if (active && phase !== 'leaving') input.requestLock();
  }

  // ---- boarding and getting out
  // the day's wind (the METAR's and the windsock's), relative to the runway as FLIGHT LAB's free flights take it
  // (today's parked aircraft: the one on the stand changes with the day's type — main.js's own)
  const parked = () => (typeof ctx.parkedToday === 'function' ? ctx.parkedToday() : ctx.parkedToday);
  // the day's wind field on the solo cross-country's day (the career keeps it: ctx.aloftWind): the surface wind
  // the METAR says (magnetic) and, at the nav altitude, the day's winds aloft — the morning's nav log is planned
  // from these same numbers, so the headings it gives are the ones that work. Two forms: the free flights'
  // (relative to the runway) and the lesson's (true, as FLIGHT LAB takes a given wind)
  const dayField = () => {
    const d = ctx.today && ctx.today();
    if (!d || !d.plan || !d.plan.xc || !ctx.aloftWind) return null;
    const A = ctx.aloftWind(); if (!A) return null;
    const surfT = A.surfFrom - P.MAGVAR_W, topT = A.from - P.MAGVAR_W;
    return { free: { rel: surfT - P.LAB_RWY.trueHdg, kt: A.surfKt, gust: 0.5, topRel: topT - P.LAB_RWY.trueHdg, topKt: A.kt, topFt: A.altFt },
      lesson: { fromDeg: surfT, kt: A.surfKt, gust: 0.6, topFrom: topT, topKt: A.kt, topFt: A.altFt } };
  };
  const dayWind = () => { const f = dayField(); if (f) return f.free; const w = ctx.wind || { fromDeg: 330, kt: 8 }; return { rel: w.fromDeg - P.LAB_RWY.trueHdg, kt: w.kt, gust: 0.5 }; };
  // the day's air carries the day's QNH (career weather's, no longer a constant): the altimeter's air is the
  // day's, so the setting the cadet makes from the ATIS is the day's own — left at the standard 29.92 it is
  // wrong by the day's difference, as it should be
  const applyDayQnh = () => { const d = ctx.today ? ctx.today() : null; if (d && d.qnh && flight.s) flight.s.qnh = d.qnh; };
  function board({ instant = false } = {}) {
    if (active) return 'flying';
    active = true; phase = 'board';
    fade(() => {
      const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c);
      useAircraft(todayType());
      flight.startOnGround(n, e, ctx.stand.hdgTrue, liveId, { autoRud: settings.get('autoRud'), wind: dayWind() });
      applyDayQnh();
      parked().visible = false; ctx.todayColliders(false);
      live.root.visible = true; cockpit.setVisible(true); setView('cockpit');
      systems.setCold(flight.s); rpmVisual = 0;                     // the aircraft as left on the stand: everything off
      // the right seat: the instructor (or the chief instructor), or no one on the first solo
      seatCrew(ctx.crew ? ctx.crew() : { actor: ctx.instructor, name: ctx.instructorName });
      // the day's load (weight and balance): with the instructor in the right seat the aeroplane carries
      // two in front; alone — the first solo, the solo cross-country — it carries one, and climbs the
      // better for it (the standard training load otherwise: physics' applyLoading)
      if (P.applyLoading) P.applyLoading(flight.s, { front: crew ? 2 : 1 });
      if (ctx.boardDialogs) makeRunner(ctx.boardDialogs());
      yaw = 0; pitch = HOME_PITCH; setFocus(null, true); zoomFov = null;
      ctx.onEnter();
      placeNow();
      if (fh) { fh.show(true); fh.setMode('free'); if (fh.setFreeTitle) fh.setFreeTitle(); if (fh.setFreeKeys) { fh.setFreeKeys(); fh.setStrip(true); } if (settings.get('panel2D') !== fh.panel2D) fh.setPanel2D(!!settings.get('panel2D')); }
      // alone: no one to ask — the day begins at once
      if (crew) startTalk(); else { phase = 'day'; beginDay('basic'); }
    }, instant);
    return 'board';
  }
  // who sits in the right seat (cw: { actor, name, color?, id? } | null)
  function seatCrew(cw) {
    crew = cw ? cw.actor : null; crewName = cw ? cw.name : ''; crewColor = cw ? cw.color || null : null; crewId = cw ? cw.id || 'instructor' : null;
    if (crew) {
      live.root.add(crew.root);
      crew.root.position.set(seat.position[0], seat.position[1], seat.position[2]); crew.root.rotation.set(0, seat.yaw, 0);
      if (crew.setSeated) crew.setSeated(seat.seat);
    }
  }
  function leave({ instant = false, then = 'walk' } = {}) {
    if (!active || phase === 'leaving') return;
    if (replay) { replay = null; }              // (leaving ends a replay without handing the debrief back)
    simRate = 1; activePause = false;
    hideCrashPanel();
    recorder.done();
    phase = 'leaving';
    if (runner.running) runner.stop();
    // (the introductory flight: how it went, for main.js; its time and landings not FLIGHT LAB's — dropped, no record)
    let sum = null;
    if (intro) { sum = intro.summary({ cut: !intro.done }); intro = null; introGo = null; flight.discard(); flight.prefs.hold = settings.get('pitchHold') ? 'hold' : 'spring'; if (fh && fh.setFreeKeys) { fh.setFreeKeys(); fh.setStrip(true); } }
    else if (flight.L && !flight.free && !flight.L.done) { flight.abort('中止'); flight.finish(); }
    else if (flight.L && flight.free) flight.finish();
    fade(() => {
      active = false; phase = 'off';
      ap.reset();
      trafficView.show(traffic, false);
      live.root.visible = false; cockpit.setVisible(false);
      parked().visible = true; ctx.todayColliders(true);
      if (crew) { if (crew.setSeated) crew.setSeated(null); ctx.instructorHome(crew.root, crew); }
      rpmVisual = null;
      if (dayMode.active) { if (ctx.onDayOver) ctx.onDayOver(dayMode.day); dayMode.end(); }
      if (audio.crank) audio.crank(false);
      if (audio.engine) audio.engine(null);
      if (audio.traffic) audio.traffic(null);
      if (fh) { fh.hideDebrief(); fh.setHelp(false); fh.show(false); }
      (ctx.dayHud || NOHUD).setTask(null);
      debriefShown = false;
      sky.setShadowHalf(null); shadowHalf = undefined;
      setFocus(null, true); zoomFov = null;
      camera.fov = settings.get('fov'); camera.updateProjectionMatrix(); fov = null;
      hud.prompt(null);
      ctx.onLeave(then, sum ? { intro: sum } : undefined);
    }, instant);
  }

  // ---- the first day's introductory flight (体験飛行, flight/intro-flight.js): he flew it up here; over the practice
  // area the cadet has the yoke for a while. Set without a fade (main.js's card is up), begun once the card has gone.
  function introFlight() {
    if (active) return false;
    active = true; phase = 'board';
    useAircraft('pa28');
    flight.startFree('area', 'pa28', { sens: 'low', autoRud: true, assist: false, wind: dayWind() });
    // (this flight is flown on the instructor's terms, as it was designed: the pitch hold is on for it —
    // the cadet steers, the trim and the hold keep the height — whatever the player's own default is now;
    // leave() gives the preference back)
    flight.prefs.hold = 'hold';
    applyDayQnh();
    systems.setRunning(flight.s); rpmVisual = null; psiS = null; debriefShown = false;
    parked().visible = false; ctx.todayColliders(false);
    live.root.visible = true; cockpit.setVisible(true);
    seatCrew({ actor: ctx.instructor, name: ctx.instructorName || '早瀬 教官', id: 'instructor' });
    setView('cockpit');
    intro = createIntro({ FL, thr0: flight.s.thr, alt0: flight.L.alt0, hdg0: flight.L.hdg0 }); introGo = null;
    makeRunner(introAirDialogs(), () => ({ intro: intro ? intro.ctx() : {} }));
    yaw = 0; pitch = HOME_PITCH;
    ctx.onEnter();
    placeNow();
    // (the yoke's keys only, and no control strip: the throttle, the flaps and the trim are his today)
    if (fh) { fh.show(true); fh.setMode('free'); if (fh.setFreeTitle) fh.setFreeTitle('体験飛行', '採点なし・H でキーの一覧'); if (fh.setFreeKeys) { fh.setFreeKeys(INTRO_FREE_KEYS); fh.setStrip(false); } if (settings.get('panel2D') !== fh.panel2D) fh.setPanel2D(!!settings.get('panel2D')); }
    flight.av.hdgBug = flight.L.hdg0;
    return true;
  }
  function introBegin() {
    if (!intro || phase !== 'board') return false;
    phase = 'intro';
    handle(intro.begin());
    return true;
  }
  // what the flight asks for: his line (the HUD's subtitle), a talk, a task's panel and heading mark, the end
  function handle(evs) {
    const dh = ctx.dayHud || NOHUD;
    for (const e of evs) {
      if (e.type === 'say') say(e.text, 5200);
      else if (e.type === 'talk') { dh.setTask(null); startTalk(e.id); }
      else if (e.type === 'task') { dh.setTask(e.hud); if (flight.av) flight.av.hdgBug = e.bug; if (cockpit.markDirty) cockpit.markDirty(); }
      else if (e.type === 'hud') dh.setTask(e.hud);
      else if (e.type === 'end' && ctx.onIntroDone) {
        const I0 = intro, sum = e.summary;
        if (e.delay) setTimeout(() => { if (intro === I0 && active && phase !== 'leaving') ctx.onIntroDone(sum); }, e.delay * 1000);
        else ctx.onIntroDone(sum);
      }
    }
  }
  // a key that is his today (the throttle, the flaps, the trim, the rudder, the brakes): a word, not too often
  function refuse() { if (performance.now() - refusedAt > 4000) { refusedAt = performance.now(); say(INTRO_AIR.R_keys, 4200); } }
  function beginFree() {
    phase = 'ground'; carbDay = 0; faultKind = null;
    if (fh) fh.setMode('free');
    recorder.start({ title: '自由飛行', aircraft: todayType(), startISO: new Date().toISOString() });
    startEngine();
  }
  // a free flight set up from the menu (the setup screen): the start, the aircraft, the wind, the load and
  // one failure, if any — the day's plumbing reused (the day faults through the systems, FLIGHT LAB's
  // failNow for the engine / AHRS / GPS). No crew, no day: the cadet starts a ramp start cold, by hand
  function startFreeSession(cfg = {}) {
    if (active) return false;
    active = true; phase = 'board';
    fade(() => {
      useAircraft(cfg.aircraft === 'pa44' ? 'pa44' : 'pa28');
      const wind = cfg.wind || { rel: 10, kt: 5, gust: 0.5 };
      const ramp = cfg.start === 'ramp';
      if (ramp) {
        const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c);
        flight.startOnGround(n, e, ctx.stand.hdgTrue, liveId, { autoRud: settings.get('autoRud'), wind });
        systems.setCold(flight.s); rpmVisual = 0;
        if (cfg.loading && P.applyLoading) P.applyLoading(flight.s, cfg.loading);
      } else {
        flight.startFree(cfg.start || 'rwy', liveId, { autoRud: settings.get('autoRud'), wind, loading: cfg.loading || undefined });
        systems.setRunning(flight.s);
      }
      parked().visible = false; ctx.todayColliders(false);
      live.root.visible = true; cockpit.setVisible(true); setView('cockpit');
      seatCrew(null);
      carbDay = cfg.fail === 'carb' ? 1 : 0;
      systems.setFault(cfg.fail === 'mag' ? { dropL: 200 } : null);
      systems.setElecFault(cfg.fail === 'elec');
      if (['engine', 'engL', 'engR', 'ahrs', 'gps'].includes(cfg.fail) && FL.school && FL.school.failNow) FL.school.failNow(flight.L, cfg.fail);
      yaw = 0; pitch = HOME_PITCH; setFocus(null, true); zoomFov = null;
      ctx.onEnter();
      placeNow();
      if (fh) { fh.show(true); fh.setMode('free'); if (fh.setFreeTitle) fh.setFreeTitle('自由飛行', '設定した条件で飛ぶ・H でキーの一覧'); if (fh.setFreeKeys) { fh.setFreeKeys(); fh.setStrip(true); } if (settings.get('panel2D') !== fh.panel2D) fh.setPanel2D(!!settings.get('panel2D')); }
      phase = 'ground';
      recorder.start({ title: '自由飛行', aircraft: liveId, startISO: new Date().toISOString() });
      input.requestLock();
    }, cfg.instant);
    return true;
  }
  // the instructor starts the engine (a free flight): everything on as for the flight, primed, the throttle cracked,
  // the key to START; the systems turn it over until it catches
  function startEngine() {
    if (systems.running || systems.cranking) return;
    Object.assign(cockpit.switches, RUNNING, { mag: 'START' });
    for (let i = 0; i < 3; i++) systems.prime();
    if (flight.s && flight.s.thr < 0.03) flight.s.thr = 0.05;
  }
  function beginLesson(level, { instant = false, lessonId = ctx.lessonId || 'a2' } = {}) {
    lastLevel = level; settings.set('lessonLevel', level); lastLesson = lessonId;
    fade(() => {
      flight.startLesson(lessonId, level, { autoRud: settings.get('autoRud'), oatDev: dayOatDev() });
      applyDayQnh();
      recorder.start({ title: lessonId, aircraft: todayType(), startISO: new Date().toISOString() });
      systems.setRunning(flight.s);
      phase = 'lesson'; rpmVisual = null; lastChime = -1; lastHint = ''; hintCool = 0; debriefShown = false;
      yaw = 0; pitch = HOME_PITCH; homeT = 0; faceT = 0; psiS = null; setFocus(null, true); zoomFov = null;
      if (fh) { fh.hideDebrief(); fh.setMode('lesson'); }
      placeNow();
      toast('訓練空域に着きました', 2600);
    }, instant);
  }
  let lastLesson = ctx.lessonId || 'a2';
  function retry() { if (fh) fh.hideDebrief(); debriefShown = false; beginLesson(lastLevel, { lessonId: lastLesson }); input.requestLock(); }
  function freeFromHere() {
    if (fh) fh.hideDebrief(); debriefShown = false;
    fade(() => {
      flight.startFree('area', liveId, { autoRud: settings.get('autoRud'), wind: dayWind(), oatDev: dayOatDev() });
      applyDayQnh();
      systems.setRunning(flight.s);
      recorder.start({ title: '自由飛行', aircraft: todayType(), startISO: new Date().toISOString() });
      phase = 'ground'; rpmVisual = null; psiS = null; setFocus(null, true); zoomFov = null;
      if (fh) fh.setMode('free');
      placeNow();
    });
    input.requestLock();
  }

  // ---- the whole day (flight/day-mode.js drives it; these are the parts it borrows)
  function beginDay(level) {
    lastLevel = level; settings.set('lessonLevel', level);
    const d = ctx.today ? ctx.today(level) : null;
    if (!d) { beginFree(); return; }
    if (d.setLevel) d.setLevel(level);          // (the day learns the level it is flown at: its summary — and the lessons' growth — go by it)
    phase = 'day';
    if (fh) { fh.setMode('free'); if (fh.setFreeTitle) fh.setFreeTitle('今日の 1 日', 'H でキーの一覧'); }
    systems.setFault(d.st.fault && d.st.fault.kind === 'mag' ? { dropL: 265 } : null);      // (M7) the run-up's fault, when the day has one
    systems.setElecFault(!!(d.st && d.st.elecFault));         // the alternator-failure day, when the day has one
    elecWarned = false; elecLowSeen = false;
    carbDay = d.st.fault && d.st.fault.kind === 'carb' ? 1 : 0;                            // a humid day: carburettor ice can build in flight (the physics reads it each frame)
    faultKind = d.st.fault ? d.st.fault.kind : null;
    dayMode.begin(d, level);
  }
  // a lesson of the day: from where the cadet is (handoff: FLIGHT LAB's own start, the picture blending the last
  // metres) or after a fade (the transit skipped, or flown and arrived)
  function startDayLesson(id, level, { handoff = false, fade: withFade = false, toast: note = '' } = {}) {
    const go = () => {
      const was = { pos: live.root.position.clone(), q: live.root.quaternion.clone() };
      // (the cross-country's own lesson flies in the day's wind field — the nav log's wind, not the lesson's
      // own; the day's other lessons (the take-off, the landing) keep theirs, as every scored lesson does)
      const f = id === 'n2' ? dayField() : null;
      flight.startLesson(id, level, { autoRud: settings.get('autoRud'), oatDev: dayOatDev(), ...(f ? { wind: f.lesson } : {}) });
      applyDayQnh();
      systems.adopt(flight.s);
      // (the day's load again on the lesson's own state: two in front with the instructor, one alone)
      if (P.applyLoading) P.applyLoading(flight.s, { front: crew ? 2 : 1 });
      phase = 'lesson'; lastChime = -1; lastHint = ''; hintCool = 0; debriefShown = false; psiS = null; setFocus(null, true); zoomFov = null;
      if (fh) fh.setMode('lesson');
      placeNow();
      if (handoff) { blend.t = 1; blend.pos[0] = was.pos.x - live.root.position.x; blend.pos[1] = was.pos.y - live.root.position.y; blend.pos[2] = was.pos.z - live.root.position.z; blend.q.copy(live.root.quaternion).invert().premultiply(was.q); placeNow(); }
      if (note) toast(note, 2600);
    };
    if (withFade) fade(go); else go();
  }
  // the debrief (in the seat, on the stand), then the logbook signed
  function startDebrief(sum) {
    phase = 'day'; debSum = sum;
    if (ctx.tem && !sum.tem) sum.tem = ctx.tem();                 // (M6) the threat the cadet named this morning
    if (ctx.tired && sum.tired === undefined) sum.tired = !!ctx.tired();   // (growth §4.5) flown tired: the debrief says so
    if (elecLowSeen) sum.elecLow = true;                      // the alternator-failure day: the logbook notes it
    // the first solo: no one in the seat to debrief it — the day is signed off outside (ctx.onSolo)
    if (!crew) { if (dayMode.day) dayMode.day.debriefRead(); if (ctx.onSolo) ctx.onSolo(sum); return; }
    startTalk('debrief', seatName(debriefDialogs(sum, { voice: crewId || 'instructor' })));
  }
  let debSum = null;
  function signLogbook() {
    const d = dayMode.day, sum = debSum; if (!d || !sum) return;
    const remark = (sum.fault ? 'ランナップで左マグネトーの低下が制限超過。離陸を中止し整備へ（課目なし）。' : sum.lessons.every(l => l.passed) ? '今日の 3 課目は基準内。' : '再訓練の課目あり。') + (sum.walk.missed.length ? '外部点検の見落としあり。' : '') + (sum.incursion ? '停止線の越境あり（指導済み）。' : '') + (sum.elecLow ? '飛行中に電圧低下（オルタネーター不作動の疑い）。負荷を落として着陸、整備へ報告。' : '')
      + (sum.atcState && sum.atcState.noClearTakeoff ? '許可のない離陸あり（指導済み）。' : '') + (sum.atcState && sum.atcState.noClearLanding ? '着陸許可のない進入あり（指導済み）。' : '') + (sum.atcState && sum.atcState.nearMiss.length ? `他機との接近あり（${sum.atcState.nearMiss.join('・')}）。` : '');
    const done = () => { if (dayMode.day) dayMode.day.debriefRead(); say('今日はここまで。降りるときは、右のドアの取っ手をどうぞ。', 5200); };
    const p = ctx.onLogbook ? ctx.onLogbook(sum, remark) : null;
    if (p && p.then) p.then(done); else done();
  }

  // ---- the view
  function setView(v) {
    if (v !== 'cockpit' && focusId) setFocus(null, true);     // a focus view lives in the cockpit only
    view = v;
    const inside = v === 'cockpit';
    live.setInside(inside); cockpit.setVisible(inside);
    if (crew) crew.root.visible = inside;
    applyShadow();
    hud.prompt(null); hover = null;
    if (!inside) psiS = null;
  }
  // ---- the replay: watch the flight (or its landing) again. The live flight is NOT touched — the physics
  // waits (frame() is not called), the drawn aircraft follows the recording, and ending the replay puts
  // everything back. Space pauses, ←/→ step 5 s, C changes the camera (the fixed ones included), P or
  // Esc ends it. From the debrief, the card comes back when it ends
  let debCbs = null;                            // (the debrief's buttons, so the replay can hand the card back)
  function startReplay(atEnd = false) {
    const rec = recorder.last();
    if (!rec || !active || recorder.recording()) return false;
    const dur = recDuration(rec);
    replay = { rec, t: atEnd ? Math.max(0, dur - 45) : 0, playing: true, sample: null, wasDebrief: debriefShown };
    if (fh && debriefShown) { fh.hideDebrief(); debriefShown = false; }
    toast(`再生：${rec.meta.title || '飛行'}（${Math.round(dur)} 秒）— Space 一時停止・←→ 5 秒・C カメラ・P 終了`, 3600);
    return true;
  }
  function endReplay() {
    if (!replay) return;
    const was = replay.wasDebrief; replay = null;
    if (view === 'fixed') setView('cockpit');
    placeNow();
    if (was && fh && debCbs) { fh.showDebrief(flight.status(), debCbs); debriefShown = true; }
  }
  // the sun's shadow box: small and sharp round the cockpit in the air; on the ground wide enough for the hangars, the
  // parked aircraft and the whole wing (the chase view keeps the preset's box)
  function applyShadow() {
    const s = flight.s;
    const half = view !== 'cockpit' ? null : s && !s.onGround && s.out.agl > 100 ? 5 : 24;
    if (half !== shadowHalf) { shadowHalf = half; sky.setShadowHalf(half); }
  }
  // the aircraft where the physics has it (between the last two steps), the camera at the eye or behind
  // On the ground FLIGHT LAB's spring gear sinks about 11 cm under the aircraft's weight; drawn as it is, the tyres
  // would be half in the concrete: the drawing (only) is lifted until the lowest wheel touches.
  function placeNow() {
    if (replay && replay.sample) {
      // the replay's pose: the recorded sample, drawn where it was (the live flight is untouched underneath)
      const x = replay.sample, loc = L.toLocal(x.n, x.e, x.h);
      live.root.quaternion.set(x.q[0], x.q[1], x.q[2], x.q[3]);
      live.root.position.set(loc[0], loc[1], loc[2]);
      live.root.updateMatrixWorld(true);
      return;
    }
    flight.pose(pose);
    live.root.quaternion.set(pose.q[0], pose.q[1], pose.q[2], pose.q[3]);
    let lift = 0;
    const s = flight.s;
    if (s && s.WHEELS) for (const w of s.WHEELS) {
      const y = pose.pos[1] + v2.set(w.off[0], w.off[1], w.off[2]).applyQuaternion(live.root.quaternion).y;
      if (P.GROUND_M - y > lift) lift = P.GROUND_M - y;
    }
    live.root.position.set(pose.pos[0] - L.E0, pose.pos[1] + Math.min(lift, 0.3), pose.pos[2] + L.N0);
    // a lesson started where the cadet was: the few metres between drawn away over a second (the picture only)
    if (blend.t > 0) {
      const k = blend.t * blend.t * (3 - 2 * blend.t);
      live.root.position.x += blend.pos[0] * k; live.root.position.y += blend.pos[1] * k; live.root.position.z += blend.pos[2] * k;
      qBlend.identity().slerp(blend.q, k); live.root.quaternion.premultiply(qBlend);
    }
    live.root.updateMatrixWorld(true);
  }
  function placeCamera(dt) {
    if (view === 'cockpit') {
      // the pose wanted: the pilot's own (the eye, the head's yaw and pitch), or a focus view's (in front of its
      // unit, the head's small turn inside it added); the camera blends between poses when the focus changes
      let dEye = cockpit.eye, dYaw = yaw, dPitch = pitch;
      if (focusId && scrCenter.pfd) { const fp = focusPose(focusId); dEye = fp.eye; dYaw = fp.yaw + fYaw; dPitch = fp.pitch + fPitch; }
      if (camBlend.t < 1) {
        camBlend.t = Math.min(1, camBlend.t + dt / FOCUS_T);
        const k = smooth01(camBlend.t);
        v1.copy(camBlend.eye).lerp(dEye, k);
        camPose.yaw = lerpAngle(camBlend.yaw, dYaw, k); camPose.pitch = camBlend.pitch + (dPitch - camBlend.pitch) * k;
      } else { v1.copy(dEye); camPose.yaw = dYaw; camPose.pitch = dPitch; }
      camPose.eye.copy(v1);
      live.root.localToWorld(v1); camera.position.copy(v1);
      eHead.set(camPose.pitch, camPose.yaw, 0); qHead.setFromEuler(eHead);
      camera.quaternion.copy(live.root.quaternion).multiply(qHead);
    } else if (view === 'fixed') {
      // a fixed viewpoint (the tower, the threshold, the final): the aircraft flies through the frame
      const c = FIXED_CAMS[fixedIdx % FIXED_CAMS.length], p = c.pos(), t = c.look();
      camera.position.set(p[0], p[1], p[2]); v2.set(t[0], t[1], t[2]); camera.lookAt(v2);
    } else {
      // FLIGHT LAB's chase view: behind the aircraft along its smoothed heading, level, 2.6 m up; the mouse orbits it
      const s = flight.s, fq = replay && replay.sample ? replay.sample.q : s.q, f = P.qrot(fq, [0, 0, -1]), psi = Math.atan2(f[0], -f[2]);
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
      if (d.name === 'parkBrake' && !flight.free) { toast('課目の中ではパーキングブレーキは使いません', 2200); return; }
      const t = flight.action(d.name, d.arg);
      if (t) toast(t, 2200);
      if (audio.click) audio.click();
    } else if (d.type === 'av') {
      const t = AP_WHATS.has(d.what) ? ap.control(flight, d.what) : AV.control(flight.av, d.what, d.dir, d.big);
      if (cockpit.markDirty) cockpit.markDirty();
      if (t) toast(t, 1200);
      if (audio.knob) audio.knob();
    } else if (d.type === 'switch') {
      cockpit.switches[d.id] = d.on;
      if (audio.click) audio.click();
    } else if (d.type === 'select') {
      cockpit.switches[d.id] = d.value;              // (the key springs back from START by itself: aircraft/systems.js)
      if (audio.click) audio.click();
    } else if (d.type === 'gearEmerg') {
      if (flight.s && !flight.s.gearEmerg) { flight.s.gearEmerg = true; toast('非常用の脚下げハンドルを引いた。脚が落ちてきます', 2800); }
      if (audio.click) audio.click();
    } else if (d.type === 'prime') {
      const n = systems.prime();
      toast(`プライマー ${n} 回`, 1200);
      if (audio.knob) audio.knob();
    } else if (d.type === 'exit') {
      if (canExit()) leave();
      else if (performance.now() - warnedExit > 1500) {
        warnedExit = performance.now();
        toast(intro ? '体験飛行の途中です。終えるときは Esc から' : dayMode.active ? '今日の飛行の途中です。最後まで終わってから降りましょう（やめるときは Esc のメニューから）' : flight.free ? '止まってから降りましょう' : '課目の途中です。終わってから降りましょう（やめるときは Esc のメニューから）', 2600);
      }
    } else if (d.type === 'view') {
      setFocus(focusId === d.focus ? null : d.focus);     // a display's face: the eye in front of it; the same face again, back to the pilot's view
      if (audio.click) audio.click();
    } else if (d.type === 'info' && d.text) toast(d.text, 2600);
  }
  function canExit() {
    if (!flight.L) return true;
    const s = flight.s;
    if (dayMode.active) return dayMode.day.phase === 'done' || s.crashed;
    if (!flight.free) return !!flight.L.done;
    return s.crashed || (s.onGround && Math.hypot(s.vel[0], s.vel[2]) < 0.6);
  }
  function lights() {
    const sw = cockpit.switches, on = sw.master !== false;
    lightsNow.nav = !!(on && sw.nav); lightsNow.beacon = !!(on && sw.beacon); lightsNow.strobe = !!(on && sw.strobe);
    lightsNow.landing = !!(on && sw.landing); lightsNow.taxi = !!(on && sw.taxi);
    return lightsNow;
  }
  const lightsOut = { nav: false, beacon: false, strobe: false, landing: false, taxi: false };
  // the options handed on every frame (reused: nothing new per frame)
  const frameOpt = { paused: false }, liveOpt = { dt: 0, rpmVisual: null, lights: lightsOut, inside: true };
  const cockOpt = { s: null, L: null, av: null, parkBrake: false, night: 0 }, insOpt = { lookAt: null, talking: false };
  const engOpt = { rpm: 0, thr: 0, ias: 0, onGround: true, stall: false, inside: true, running: false }, lightsNow = { ...lightsOut };

  // ---- every frame while flying
  function update(dt, { live: isLive = true, paused = false } = {}) {
    if (!active) return;
    const look = input.takeLook(), wheel = input.takeWheel ? input.takeWheel() : 0;
    // the flight's pause (and the hands' on the panel): a talk, the debrief, the menu, the fade; the head's: the same
    // but the talk, during which it looks round as the mouse takes it
    const stop = paused || fading || talkOn || debriefShown || !isLive;
    const stopHead = paused || fading || debriefShown || !isLive;
    // (the first frame after a talk, a fade or the menu: the click or the wheel that ended it is not the panel's — a
    // talk's last line is closed by a click on the view, with the pointer still captured)
    const resumed = wasStop && !stop;
    if (resumed) flight.controls.clearKeys();
    wasStop = stop;
    // the replay: the physics waits; the drawn aircraft follows the recording, the camera is free (the
    // cockpit, the chase, the fixed viewpoints), the engine sounds as it did. Nothing else runs
    if (replay) {
      if (replay.playing) replay.t += dt;
      const dur = recDuration(replay.rec);
      if (replay.t >= dur) { replay.t = dur; replay.playing = false; }
      replay.sample = recSampleAt(replay.rec, replay.rec.samples[0].t + replay.t);
      const sens = 0.0022 * settings.get('sensitivity'), inv = settings.get('invertY') ? -1 : 1;
      if (view === 'chase') { chaseYaw -= look.x * sens; chasePitch = THREE.MathUtils.clamp(chasePitch - look.y * sens * inv, -0.15, 1.2); }
      placeNow(); placeCamera(dt);
      if (audio.engine) { const x = replay.sample; audio.engine({ rpm: x.rpm, thr: x.thr, ias: x.ias, onGround: x.onGround, stall: false, inside: view === 'cockpit', running: x.rpm > 300, rough: 0 }); }
      if (audio.traffic) audio.traffic(null);
      return;
    }
    // the active pause: the physics frozen, the camera and the panel alive (look around, work the panel)
    if (activePause && !stop) {
      if (view === 'cockpit' && !focusId) {
        const sens = 0.0022 * settings.get('sensitivity'), inv = settings.get('invertY') ? -1 : 1;
        yaw = THREE.MathUtils.clamp(yaw - look.x * sens, -LOOK.yaw, LOOK.yaw);
        pitch = THREE.MathUtils.clamp(pitch - look.y * sens * inv, -LOOK.down, LOOK.up);
      } else if (view === 'chase') {
        const sens = 0.0022 * settings.get('sensitivity'), inv = settings.get('invertY') ? -1 : 1;
        chaseYaw -= look.x * sens; chasePitch = THREE.MathUtils.clamp(chasePitch - look.y * sens * inv, -0.15, 1.2);
      }
      placeNow(); placeCamera(dt);
      return;
    }
    // the flight (FLIGHT LAB's tick: the keys once, then 1/120 s steps). The sim rate compresses the cruise
    // only: below 1,000 ft AGL it is 1× again by itself, and says so once
    const rateNow = simRate > 1 && flight.s && !flight.s.onGround && flight.s.out && flight.s.out.agl >= 1000 ? simRate : 1;
    if (simRate > 1 && rateNow === 1 && flight.s && !flight.s.onGround && !rateWasHigh) { rateWasHigh = true; toast('1,000 ft AGL 以下：シムレートは 1× に戻りました', 2400); }
    if (rateNow > 1) rateWasHigh = false;
    frameOpt.paused = stop || phase === 'board' || phase === 'leaving' || crashFrozen;
    // the instructor taxiing (I have control); on the introductory flight, his hands on what is his —
    // or, on an ordinary day, the autopilot's hands (its own hook, and only when no one else is flying)
    const taxiPilot = intro ? intro.pilot : dayMode.pilot;
    frameOpt.pilot = taxiPilot || (ap.on || ap.fdOn ? apPilot : null);
    frameOpt.airPilot = !taxiPilot && (ap.on || ap.fdOn);         // (the AP's hook runs in a lesson too; the taxi pilot's does not need it)
    pilotFlying = !!frameOpt.pilot;
    const res = flight.frame(dt * rateNow, intro ? (stop || !intro.cadetHands ? NO_KEYS : INTRO_KEYS) : keysFor(stop || !!taxiPilot), frameOpt);
    if (flight.s) recorder.push(flight.s, flight.s.t || 0);
    if (flight.s) { flight.s.carbRisk = carbDay;                // the day's humidity, for the physics' carburettor ice
      // the day's other faults, on the physics state (re-applied each frame: a lesson's fresh state starts clean)
      if (faultKind === 'pitot') flight.s.pitotRisk = 2;
      else if (faultKind === 'mag') for (const e of flight.s.eng) e.magBad = 'L';
      else if (faultKind === 'gear') flight.s.gearFault = true;
      else if (faultKind === 'pump') flight.s.eng[0].pumpFail = true;
      // the day's rain on the surface: at storm strength the runway is wet (the physics reads the flag for its
      // friction; the world branch only sets it, from the day's precipitation)
      flight.s.surfaceWet = (ctx.precip ? ctx.precip() : 0) >= 0.3;
    }
    // (B3.3) the day's cumulonimbus: inside its volume the air moves — the gust scale rises and the core
    // sinks. The lesson's own wind is restored on the way out (its base kept on the state).
    if (flight.s && !frameOpt.paused) {
      const s = flight.s, cb = ctx.cb ? ctx.cb() : null;
      let k = 0;
      if (cb) { const [cn, ce] = CB_CENTRE, [n, e] = P.ne(s); k = cbEffect(cb, n - cn, e - ce, s.agl || 0); }
      if (s.wind) {
        if (k > 0) { if (s._cbBase == null) s._cbBase = s.wind.gust; s.wind.gust = s._cbBase + k * 4; if ((s.agl || 0) > 3) s.vel[1] -= 5.5 * k * dt * rateNow; }
        else if (s._cbBase != null) { s.wind.gust = s._cbBase; s._cbBase = null; }
      }
    }
    // (B3.4) airframe icing, on the day's seeded cold low-cloud days only: in the cloud band at icing
    // temperature, ice accretes on the state (s.ice 0..1); the aero feels it through the state's own
    // derived aircraft — less lift, more drag, an earlier stall, the weight of the ice — and warm air
    // (or leaving the band) melts it off again. The pitot/static side is the systems branch's, not this.
    if (flight.s && !frameOpt.paused) {
      const s = flight.s;
      if (s._iceAC !== s.AC) { s._iceAC = s.AC; s._iceBase = { CL0: s.AC.CL0, CD0: s.AC.CD0, aStall: s.AC.aStall, mass: s.AC.mass }; if (s.ice == null) s.ice = 0; }
      const aglFt = (s.agl || 0) * 3.28084, oat = s.oat != null ? s.oat : 99;
      s.ice = iceStep(s.ice, !!(ctx.icing && ctx.icing()), aglFt, oat, dt * rateNow);
      iceApply(s.AC, s._iceBase, s.ice);
    }
    // the autopilot's own frame: its disconnects (low, a stall warning, the hands taking over), its strip
    const apMsg = ap.update(frameOpt.paused ? 0 : dt, flight, input);
    if (apMsg) toast(apMsg, 2600);
    if (ap.takeDiscTone() && audio.apDisc) audio.apDisc();        // (the disconnect warble)
    ap.sync(flight.av);
    // the monitored navaid's ident, keyed again and again while it stays in range and selected on the
    // audio panel (the receiver's own behaviour; the radio bus carries it, so its volume is the radio's)
    identT -= frameOpt.paused ? 0 : dt;
    if (identT <= 0) {
      const aid = monitoredAid();
      if (aid && audio.ident) identT = audio.ident(aid.id) + 4; else identT = 0.6;
    }
    // the engine and the electrics (on the flight's clock: the sim rate takes them with it)
    for (const ev of systems.update(frameOpt.paused ? 0 : dt * rateNow, flight.s)) onSystems(ev);
    for (const ev of res.events) onEvent(ev);
    if (res.ended) onEnded();
    for (const r of res.pad || []) {
      if (r.type === 'view') setView(view === 'cockpit' ? 'chase' : 'cockpit');
      else if (r.type === 'toast' && r.text) { if (intro) refuse(); else toast(r.text, 2400); }     // (a gamepad's button: his today)
      else if (r.type === 'help' && fh) fh.setHelp(!fh.help);
      else if (r.type === 'pause' && ctx.onPause) ctx.onPause();
    }
    // the head (or the orbit round the aircraft): the mouse's, after a moment turned to the one who talks (when a talk
    // begins) or back to the front (when it ends); a look of the mouse's stops either
    if (!stopHead) {
      const sens = 0.0022 * settings.get('sensitivity'), inv = settings.get('invertY') ? -1 : 1;
      if (look.x || look.y) faceT = 0;
      if (view === 'cockpit') {
        if (focusId) {
          // in front of a unit: the head turns only a little way (its own knobs stay in reach of the crosshair)
          fYaw = THREE.MathUtils.clamp(fYaw - look.x * sens, -FOCUS_LOOK.yaw, FOCUS_LOOK.yaw);
          fPitch = THREE.MathUtils.clamp(fPitch - look.y * sens * inv, -FOCUS_LOOK.down, FOCUS_LOOK.up);
        } else {
          if (look.x || look.y) homeT = 0;
          else if (faceT > 0) faceInstructor(dt);
          else if (homeT > 0) homeHead(dt);
          yaw = THREE.MathUtils.clamp(yaw - look.x * sens, -LOOK.yaw, LOOK.yaw);
          pitch = THREE.MathUtils.clamp(pitch - look.y * sens * inv, -LOOK.down, LOOK.up);
        }
      } else {
        chaseYaw -= look.x * sens; chasePitch = THREE.MathUtils.clamp(chasePitch - look.y * sens * inv, -0.15, 1.2);
      }
      if (faceT > 0) faceT -= dt;
    }
    // the introductory flight: its tasks with what was flown and where the head looks; his talks' time (in the air too)
    if (intro && phase === 'intro' && !stop) handle(intro.update(res.steps * H, flight.L.last, P.ne(flight.s), yaw / DEG));
    else if (intro && talkOn && !stopHead) intro.talked(dt);
    // the propeller as the systems turn it (the starter, the run-up's magneto drop: the picture and the sound)
    rpmVisual = systems.rpm; engShow.rpm = systems.rpm; engShow.run = systems.running;
    engShow.oil = systems.oil; engShow.oilT = systems.oilT; engShow.elec = systems.elec; engShow.hobbs = systems.hobbs; engShow.starterHot = systems.starterHot; engShow.alerts = systems.alerts;
    // the alternator-failure day making itself known: the volts sag with nothing charging — warn once in the
    // air, and remember it for the logbook either way
    if (systems.elecFault && systems.elec.volts > 0 && systems.elec.volts < 11.8) {
      elecLowSeen = true;
      if (!elecWarned && flight.s && !flight.s.onGround) { elecWarned = true; toast('電圧が下がっています（LOW VOLTS）。不要な電気負荷を切り、早めの着陸を考えてください', 5200); }
    }
    if (blend.t > 0) blend.t = Math.max(0, blend.t - dt / 1.2);
    if (dayMode.active) dayMode.update(dt, { stop });
    // the pattern traffic: posed every frame (analytic — no drift), its calls heard when the radio is on
    // the tower and the aircraft is awake (the engine running, or a lesson under way)
    const tp = (ctx.today ? ctx.today() : null)?.traffic;
    trafficView.set(tp ? tp.count : 0);
    if (tp && tp.count) {
      traffic.set(tp.count, tp.seed, { twin: !!tp.twin, runway: tp.runway || '36' });
      // (gap audit v2, B4.2) the pattern reacts to the cadet: his pose in the circuit's frame goes in;
      // the wake comes back as a gust on the flight state; near misses go to the day's debrief record
      const pn = P.ne(flight.s), prc = P.rwyCoords(P.LAB_RWY, pn.n, pn.e);
      const evs = traffic.update(frameOpt.paused ? 0 : dt, { along: prc.along, cross: prc.cross, altFt: flight.s.out.altTrue, call: CALL.short, spoken: CALL.spokenShort });
      trafficView.show(traffic, true);
      if (flight.av) flight.av.trafficPos = traffic.poses;      // (the same traffic on the MFD map)
      if (flight.s.wind) { flight.s.wind.gust -= wakeAdd; wakeAdd = traffic.wake > 0.02 ? traffic.wake * 1.6 : 0; flight.s.wind.gust += wakeAdd; }
      for (const ev of evs) {
        if (ev.kind === 'nearMiss') { if (dayMode.active && dayMode.day) dayMode.day.noteTraffic('nearMiss', ev.with); toast(`他機との接近（${ev.with}・約 ${ev.dist} m）：見張りを続けましょう`, 4200); }
        else if (ev.kind === 'trafficGoAround') { if (dayMode.active && dayMode.day) dayMode.day.noteTraffic('trafficGoAround'); hearTraffic(ev); }
        else hearTraffic(ev);
      }
    } else { trafficView.show(traffic, false); if (flight.av) flight.av.trafficPos = null; if (flight.s.wind && wakeAdd) { flight.s.wind.gust -= wakeAdd; wakeAdd = 0; } }
    placeNow();
    applyShadow();
    liveOpt.dt = dt; liveOpt.rpmVisual = rpmVisual; liveOpt.lights = lights(); liveOpt.inside = view === 'cockpit';
    live.update(flight.s, liveOpt);
    placeCamera(dt);
    // the field of view: the focus view's own framing or the setting's, narrowed by the wheel's zoom (+ / − too);
    // looking closer (the right button held) steps to ZOOM_FOV, or further if the wheel already went past it
    const baseFov = focusId ? FOCUS_FRAME[focusId].fov : settings.get('fov');
    let want = view === 'cockpit' ? (zoomFov != null ? zoomFov : baseFov) : settings.get('fov');
    if (view === 'cockpit' && !stop && (input.down('Mouse2') || zoomHold)) want = Math.min(want, ZOOM_FOV);
    fov = fov == null ? camera.fov : fov;
    fov += (want - fov) * (1 - Math.exp(-dt / 0.12));
    if (Math.abs(camera.fov - fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    camera.updateMatrixWorld();
    camera.getWorldPosition(camWorld);
    // the cockpit's switches and knobs under the crosshair (not on the introductory flight: the mixture is his too)
    if (view === 'cockpit' && !stop && !intro) {
      ray.setFromCamera(center, camera);
      hover = cockpit.pick(ray);
      hud.prompt(hover ? hover.label : null, hover ? (hover.kind === 'knob' ? 'ホイール' : hover.kind === 'lever' ? 'クリック・ホイール' : 'クリック') : null);
      if (hover) {
        if (input.pressed('Mouse0') && !resumed) applyAct(hover.act(1, false));
        if (wheel && !resumed) for (let i = 0; i < Math.abs(wheel); i++) applyAct(hover.act(Math.sign(wheel), true));
      } else if (wheel && !resumed) stepWheelZoom(wheel);     // off a control, the wheel zooms the view instead
    } else if (hover) { hover = null; hud.prompt(null); }
    cockOpt.s = flight.s; cockOpt.L = flight.L; cockOpt.av = flight.av; cockOpt.parkBrake = flight.controls.parkBrake; cockOpt.night = night(); cockOpt.eng = engShow;
    cockOpt.elecDead = !systems.elec.pfdOn;                  // (a dead essential bus: the PFD goes dark, as it would)
    cockOpt.elecPfd = systems.elec.pfdOn; cockOpt.elecMfd = systems.elec.mfdOn; cockOpt.elecStandby = systems.elec.standbyOn;   // (the bus stages, per screen; the standby on its own battery)
    cockpit.update(dt, cockOpt);
    placeGuide(dt, stop);
    // the instructor: looks at you while he speaks, otherwise round the panel and outside (unseen from outside: left be)
    const speaking = talkOn || lineT > 0;
    if (lineT > 0) lineT -= dt;
    if (hintCool > 0) hintCool -= dt;
    if (view === 'cockpit' && crew) {
      insOpt.lookAt = speaking ? camWorld : null; insOpt.talking = speaking && (talkOn ? !!(ctx.dui.typing) : lineT > 0.4);
      crew.update(dt, insOpt);
    }
    // the HUD and what he says in a lesson (the lesson's texts as the aircraft words them), 8 times a second
    if ((hudT -= dt) <= 0) {
      hudT = 0.12;
      const st = flight.status();
      if (fh) { fh.update(st, flight.panel()); fh.setHood(!!(flight.L && flight.L.hood && !flight.L.done)); }
      if (phase === 'lesson' && !stop) lessonVoice(st);
      // the tower in a lesson (FLIGHT LAB's read-back): heard once, when the voice is on
      if (st && st.atc && st.atc.msg !== lastAtcMsg) { lastAtcMsg = st.atc.msg; if (dayMode.active) dayMode.speak(st.atc.msg.replace(/^[^:]*:\s*"?|"$/g, '')); }
    }
    if (audio.engine) {
      const s = flight.s, o = s.out;
      engOpt.rpm = systems.rpm; engOpt.thr = s.thr; engOpt.ias = o.ias; engOpt.onGround = s.onGround;
      engOpt.stall = !stop && !!o.stallWarn; engOpt.inside = view === 'cockpit';
      engOpt.running = systems.running;
      // the roughness is heard (audio/sfx.js): the physics' own (over-lean, carburettor ice), and a single
      // magneto's, when the systems layer exposes it (read defensively — it may not be there)
      engOpt.rough = Math.max(o.rough || 0, o.magRough || 0);
      // (the Seminole: each engine its own voice, as far along its start as it is; the gear's pump while it travels)
      if (todayType() === 'pa44') {
        const tw = systems.twinLive;
        if (!engOpt.engines) engOpt.engines = [{ rpm: 0, running: false, rough: 0 }, { rpm: 0, running: false, rough: 0 }];
        for (let k = 0; k < 2; k++) { engOpt.engines[k].rpm = tw[k].rpm; engOpt.engines[k].running = tw[k].eng === 'run' || tw[k].eng === 'stopping'; engOpt.engines[k].rough = Math.max((s.eng[k] && s.eng[k].rough) || 0, o['magRough' + k] || 0); }
        engOpt.gearMoving = s.gearPos > 0.005 && s.gearPos < 0.995;
      } else { engOpt.engines = null; engOpt.gearMoving = false; }
      audio.engine(engOpt);
    }
    // the nearest other trainer is heard too: its buzz placed by the bearing from the nose, thinned by the
    // distance (audio/sfx.js traffic(); nothing when the pattern is empty or the day has none)
    if (audio.traffic) {
      let near = null;
      if (traffic.poses && flight.s) {
        const [pn, pe] = P.ne(flight.s), hdg = P.attitude(flight.s).hdg * Math.PI / 180;
        for (const p of traffic.poses) {
          const dn = p.n - pn, de = p.e - pe, d = Math.hypot(dn, de);
          if (!near || d < near.d) near = { d, rel: Math.atan2(de, dn) - hdg };
        }
      }
      audio.traffic(near ? { gain: Math.max(0, 1 - near.d / 2600), pan: Math.sin(near.rel), f: 80 } : null);
    }
    if (flight.free && (phase === 'ground' || phase === 'day')) taxiCheck();
  }
  // a traffic call heard: on the screen as radio, and spoken when the radio voice is on. It is heard traffic
  // only — the cadet never answers for it, and it never waits for a talk or the debrief to finish.
  function hearTraffic(ev) {
    if (!fh || talkOn || debriefShown) return;
    const av = flight.av;
    // the tower frequency: on the selected COM1, or on COM2 while the audio panel monitors it (the
    // transmission is the same programme either way — monitoring is how a second radio is listened to)
    if (!av || !(av.com1.act === 118300 || (av.audio && av.audio.monitor && av.audio.monitor.COM2 && av.com2.act === 118300))) return;
    if (!systems.running && !(flight.L && !flight.free)) return;      // the radio is on: engine running, or a lesson
    fh.say(ev.name, ev.en, 5600);
    if (settings.get('radioVoice')) dayMode.speak(ev.say);
  }
  // what the systems tell: the starter's sound, the catch, a start that did not work, an engine that stopped
  function onSystems(ev) {
    const side = ev.why === '左エンジン' ? -1 : ev.why === '右エンジン' ? 1 : 0;
    if (ev.type === 'crank') { if (audio.crank) audio.crank(true, side); }
    else if (ev.type === 'catch') { if (audio.crank) audio.crank(false); if (audio.fire) audio.fire(side); }
    else if (ev.type === 'nocatch') { if (audio.crank) audio.crank(false); say(ev.why, 5200); }
    else if (ev.type === 'nostarter') say(EVENT_LINES.nostarter, 4200);
    else if (ev.type === 'surge') say(EVENT_LINES.surge, 5200);
    else if (ev.type === 'stop') {
      const planned = dayMode.active && dayMode.day.phase === 'shutdown';
      if (!planned) { toast(`エンジン停止：${ev.why}`, 3500); if (!flight.free || flight.s.onGround === false) say(EVENT_LINES.stopped(ev.why), 4200); }
    }
  }
  // the ring round the control the day's checklist asks for (only in the cockpit view, only when free to act)
  function placeGuide(dt, stop) {
    const c = guideCtl;
    guide.visible = !!c && view === 'cockpit' && !stop;
    if (!guide.visible) return;
    cockpit.aimPoint(c, v1); live.root.worldToLocal(v1);
    guide.position.copy(v1);
    guide.quaternion.copy(live.root.quaternion).invert().multiply(camera.quaternion);
    const t = performance.now() / 1000;
    guide.scale.setScalar(1 + 0.18 * Math.sin(t * 5)); guide.material.opacity = 0.65 + 0.3 * Math.sin(t * 5);
  }
  function setGuide(id) { guideCtl = id ? cockpit.controls.find(c => c.id === id) || null : null; }
  const stopped = () => fading || talkOn || debriefShown || phase === 'board' || phase === 'leaving';
  // the keys go to the aircraft only when the player is flying it (not while a talk, the debrief or the menu is up)
  const NO_KEYS = { has: () => false };
  const KEYS = { has: (c) => input.down(c) };
  const keysFor = (stop) => (stop ? NO_KEYS : KEYS);
  // the introductory flight: the yoke's keys only (W / S, A / D and the arrows); the scripted cadet's (introAuto)
  const INTRO_HELD = ['KeyW', 'KeyS', 'KeyA', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const INTRO_KEYS = { has: (c) => INTRO_HELD.includes(c) && input.down(c) };
  const AUTO_KEYS = { has: (c) => !!auto && auto.keys.has(c) };
  const autoOpt = { paused: false, pilot: null };
  function autoKeys() {
    const v = intro.view();
    if (auto.task !== v.task) { auto.task = v.task; auto.mem = { bug: flight.av.hdgBug }; }
    auto.keys = scriptedKeys('cadet', v.task, flight.L.last, v.handsS, auto.mem, flight.L.alt0);
    return AUTO_KEYS;
  }
  // the head eased back to the front (while homeT runs)
  function homeHead(dt) { homeT -= dt; const k = 1 - Math.exp(-dt / 0.3); yaw += (0 - yaw) * k; pitch += (HOME_PITCH - pitch) * k; }
  // the head eased towards the face of the one in the right seat (while faceT runs)
  function faceInstructor(dt) {
    if (!crew) return;
    crew.headWorld(head);
    v1.copy(head); live.root.worldToLocal(v1); v1.sub(cockpit.eye);
    const ty = Math.atan2(-v1.x, -v1.z), tp = Math.atan2(v1.y, Math.hypot(v1.x, v1.z)), k = 1 - Math.exp(-dt / 0.16);
    yaw += (ty - yaw) * k; pitch += (tp - pitch) * k;
  }
  function night() { const el = sky.state.el; return 1 - THREE.MathUtils.smoothstep(el, -4, 6); }

  // ---- what the instructor says in a lesson: each step's instruction, the hints (not too often)
  function say(text, ms = 5200) {
    if (!text) return;
    // (M8) the crew in English: his own words in the air in English (the lessons' own hints stay as written)
    if (crewName && settings.get('crewEnglish')) { const en = airEnglish(text); if (en) text = settings.get('crewEnglishJa') !== false ? `${en}\n${text}` : en; }
    lineT = Math.min(6, 1 + text.length * 0.09);
    if (fh) fh.say(crewName || 'メモ', text, ms); else toast(text, ms);
  }
  function lessonVoice(st) {
    if (!st || st.done) return;
    if (st.chime !== lastChime) {
      lastChime = st.chime;
      const line = flightLine(st.sayText);
      if (line) { say(line); if (/PFD|計器|姿勢表示/.test(line)) pointAtPanel('pfd'); }
      if (audio.chime) audio.chime();
      lastHint = st.hint; hintCool = 4;
      return;
    }
    // a hint when it changes, not more often than every 6 s (most of the "good" ones go unsaid)
    if (st.hint && st.hint !== lastHint && lineT <= 0 && hintCool <= 0) {
      lastHint = st.hint; hintCool = 6;
      if (!/^良い調子/.test(st.hint) || Math.random() < 0.3) say(flightLine(st.hint), 4200);
    }
  }
  // the crash, presented (4-5 lite): the frame freezes where it stopped and a small panel says what the
  // instruments measured at the impact (sink, bank, speed) before the day / the flight ends as it always did
  let crashFrozen = false, crashPanel = null;
  function showCrashPanel(why) {
    crashFrozen = true;
    if (audio.engine) audio.engine(null);
    if (audio.traffic) audio.traffic(null);
    if (typeof document === 'undefined' || !document.body) return;
    const s = flight.s, o = s && s.out ? s.out : {}, at = s ? P.attitude(s) : { roll: 0 };
    hideCrashPanel(true);
    crashPanel = document.createElement('div');
    crashPanel.id = 'crash-panel';
    crashPanel.setAttribute('role', 'alert');
    crashPanel.style.cssText = 'position:fixed;left:50%;top:16%;transform:translateX(-50%);z-index:40;background:rgba(24,8,8,.92);border:1px solid rgba(255,120,90,.55);color:#ffe9e2;border-radius:14px;padding:16px 22px;font:14px/1.7 system-ui,sans-serif;text-align:center;box-shadow:0 18px 50px rgba(0,0,0,.5)';
    const rows = [`速度 ${Math.round(o.ias || 0)} kt`, `バンク ${Math.abs(Math.round(at.roll || 0))}°`, `降下率 ${Math.round(o.vs || 0)} fpm`].join('　・　');
    crashPanel.innerHTML = '';
    const h = document.createElement('div'); h.style.cssText = 'font-size:17px;font-weight:800;letter-spacing:.05em'; h.textContent = `機体損傷：${why}`;
    const r = document.createElement('div'); r.textContent = `衝突の瞬間　${rows}`;
    const n = document.createElement('div'); n.style.opacity = '0.75'; n.textContent = 'この飛行はここまでです。デブリーフで振り返ります。';
    crashPanel.append(h, r, n); document.body.appendChild(crashPanel);
  }
  function hideCrashPanel(keepFrozen = false) {
    if (crashPanel) { crashPanel.remove(); crashPanel = null; }
    if (!keepFrozen) crashFrozen = false;
  }
  function onEvent(ev) {
    if (ev.type === 'crash') recorder.mark(flight.s, flight.s ? flight.s.t || 0 : 0);
    // (the introductory flight: the limits take it back long before; were it ever damaged, his word and the end)
    if (ev.type === 'crash' && intro) { handle(intro.crashed(ev.why)); return; }
    if (ev.type === 'touchdown') {
      recorder.mark(flight.s, flight.s ? flight.s.t || 0 : 0);
      if (audio.touchdown) audio.touchdown(ev.fpm);
      toast(`接地：${ev.fpm} fpm・${ev.kias} kt・中心線から ${Math.abs(ev.cross)} m ${ev.cross >= 0 ? '右' : '左'}${ev.onRunway ? '' : '（滑走路の外）'}`, 3200);
    } else if (ev.type === 'hard_landing') say('ハードランディングです。フレアが遅れたか、進入が速すぎました。', 4200);
    else if (ev.type === 'runway_excursion') say('滑走路から外れました。ラダーでセンターラインを保ちましょう。', 4200);
    else if (ev.type === 'tail_strike') say('尾部を擦りました。機首の上げすぎです。', 3800);
    else if (ev.type === 'engine_stop') toast(`エンジン停止：${ev.why}`, 3500);
    else if (ev.type === 'crash' && dayMode.active && flight.free) {
      // the day ends there: the debrief in the seat (the frame frozen on the panel above meanwhile)
      showCrashPanel(ev.why);
      say('止まって！……ぶつけてしまいましたね。今日の飛行はここまでにします。', 5000);
      const d = dayMode.day; d.st.crash = ev.why;
      setTimeout(() => { hideCrashPanel(); if (dayMode.day === d && d.phase !== 'debrief' && d.phase !== 'done') d.abortTo('debrief'); }, 2500);
    }
    else if (ev.type === 'crash') { if (flight.free) { showCrashPanel(ev.why); const L0 = flight.L; setTimeout(() => { hideCrashPanel(); if (flight.L === L0) showFreeEnd(); }, 1500); } else toast(`機体損傷：${ev.why}`, 5000); }
  }
  function onEnded() {
    flight.finish();
    hideCrashPanel();
    recorder.done();
    const st = flight.status(), L0 = flight.L;
    if (dayMode.active) {
      // the day goes on: a word from the instructor, the grade on the screen, the flight carries on as CADET's own
      say(debriefLine(st), 5200);
      if (!st.crashed) toast(`${st.id} ${st.title}：評価 ${st.grade}`, 3600);
      phase = 'day'; if (fh) fh.setMode('free');
      dayMode.lessonEnded(st);
      return;
    }
    setTimeout(() => {
      if (!active || flight.L !== L0 || debriefShown || flight.status().done !== true) return;
      say(debriefLine(st), 6000);
      if (fh) { debCbs = { onRetry: retry, onFree: freeFromHere, onReturn: () => leave(), onReplay: recorder.last() ? () => startReplay(true) : null }; fh.showDebrief(st, debCbs); debriefShown = true; input.exitLock(); }
    }, st.crashed ? 1500 : 600);
  }
  function showFreeEnd() {
    if (!active || !fh || debriefShown || phase === 'leaving' || intro) return;
    recorder.done();
    debCbs = { onRetry: () => { fh.hideDebrief(); debriefShown = false; fade(() => { const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c); flight.startOnGround(n, e, ctx.stand.hdgTrue, liveId, { autoRud: settings.get('autoRud'), wind: dayWind() }); phase = 'ground'; systems.setCold(flight.s); startEngine(); psiS = null; placeNow(); }); input.requestLock(); }, onFree: null, onReturn: () => leave(), onReplay: recorder.last() ? () => startReplay(true) : null };
    fh.showDebrief(flight.status(), debCbs);
    debriefShown = true; input.exitLock();
  }
  // taxiing into a hangar, a building or another aircraft: the colliders the walker uses (the aircraft's nose, wing
  // tips and tail, at their heights)
  const PROBES = [[0, -0.1, -3.3], [0.9, -0.1, -3.2], [-0.9, -0.1, -3.2], [5.3, -0.2, -0.6], [-5.3, -0.2, -0.6], [2.7, -0.25, -1.0],
    [-2.7, -0.25, -1.0], [1.7, 0.3, 4.0], [-1.7, 0.3, 4.0], [0, 0.6, 4.0], [0, 1.4, 3.6]];
  let lastObstacle = null;                   // (what the last taxi contact was: for the tests)
  function taxiCheck() {
    const s = flight.s;
    if (!s.onGround || s.crashed || Math.hypot(s.vel[0], s.vel[2]) < 0.02) return;
    for (const p of PROBES) {
      v1.set(p[0], p[1], p[2]); live.root.localToWorld(v1);
      const [fx, fz] = ctx.toFrame(v1.x, v1.z), h = v1.y - L.G;
      for (const b of world.query(fx - 0.05, fz - 0.05, fx + 0.05, fz + 0.05)) {
        if (b.tag === 'fence' || b.tag === 'tree' && h > 8) continue;
        if (fx > b.x0 && fx < b.x1 && fz > b.z0 && fz < b.z1 && h > b.y0 && h < b.y1) { lastObstacle = { tag: b.tag || '', probe: p.join(','), at: [fx, h, fz].map(v => +v.toFixed(2)), box: [b.x0, b.x1, b.y0, b.y1, b.z0, b.z1].map(v => +v.toFixed(2)) }; flight.crash('地上の障害物に接触しました'); return; }
      }
    }
  }

  // ---- keys (keydown, once per press): FLIGHT LAB's actions, the view, the help, the panel
  function key(e) {
    if (!active || e.repeat) return false;
    if (replay) {
      // the replay's own keys (the debrief is hidden, no talk runs): transport, cameras, out
      if (e.code === 'Space') { e.preventDefault(); replay.playing = !replay.playing; return true; }
      if (e.code === 'ArrowLeft' || e.code === 'ArrowRight') { e.preventDefault(); replay.t = Math.max(0, Math.min(recDuration(replay.rec), replay.t + (e.code === 'ArrowRight' ? 5 : -5))); return true; }
      if (e.code === 'KeyC') { setView(view === 'cockpit' ? 'chase' : view === 'chase' ? 'fixed' : 'cockpit'); return true; }
      if (/^Digit[6-9]$/.test(e.code)) { fixedIdx = Number(e.code.slice(5)) - 6; if (view !== 'fixed') setView('fixed'); return true; }
      if (e.code === 'KeyP') { endReplay(); return true; }
      return false;
    }
    if (talkOn || debriefShown || fading) return false;
    if (e.code === 'F7') { e.preventDefault(); simRate = simRate === 1 ? 2 : simRate === 2 ? 4 : 1; toast(`シムレート ${simRate}×${simRate > 1 ? '（1,000 ft AGL 未満では 1×）' : ''}`, 1800); return true; }
    if (e.code === 'F8') { e.preventDefault(); activePause = !activePause; toast(activePause ? 'アクティブポーズ：物理は止まっています（F8 で再開）' : '再開', 1800); return true; }
    if (e.code === 'KeyP') { if (recorder.last() && !recorder.recording()) { startReplay(true); return true; } return false; }
    if (e.code === 'KeyC') {
      // the fixed viewpoints join the cycle only while someone else flies (the AP, the instructor, a demo)
      if (view === 'cockpit') setView('chase');
      else if (view === 'chase' && canFixed()) { setView('fixed'); toast(`固定視点：${FIXED_CAMS[fixedIdx % FIXED_CAMS.length].label}（6〜9 で切替、C で戻る）`, 2400); }
      else setView('cockpit');
      return true;
    }
    if (/^Digit[6-9]$/.test(e.code) && canFixed()) { fixedIdx = Number(e.code.slice(5)) - 6; setView('fixed'); toast(`固定視点：${FIXED_CAMS[fixedIdx].label}`, 1600); return true; }
    if (e.code === 'KeyH') { if (fh) fh.setHelp(!fh.help); return true; }
    if (e.code === 'Tab') { e.preventDefault(); if (fh) { const on = !fh.panel2D; fh.setPanel2D(on); settings.set('panel2D', on); } return true; }
    // the instruments up close: I visits the PFD, the MFD, the standby dials, then the pilot's view again (a click
    // on a display does the same); + / − zoom, as the wheel does off a control
    if (e.code === 'KeyI' && view === 'cockpit') { cycleFocus(); return true; }
    if ((e.code === 'Equal' || e.code === 'NumpadAdd') && view === 'cockpit') { stepWheelZoom(1); return true; }
    if ((e.code === 'Minus' || e.code === 'NumpadSubtract') && view === 'cockpit') { stepWheelZoom(-1); return true; }
    if (phase === 'board') return false;
    // (the introductory flight: the yoke only — the throttle, the flaps, the trim, the rudder and the brakes are his)
    if (intro) {
      if (!flight.controls.actionFor(e.code, e.shiftKey) && !(FLY_HELD.includes(e.code) && !INTRO_HELD.includes(e.code))) return false;
      refuse(); e.preventDefault(); return true;
    }
    // the day's own keys (Enter: the checklist item looked at; Y: leave it to the instructor; 1–3: the radio)
    if (dayMode.active && dayMode.key(e.code)) { e.preventDefault(); return true; }
    // CADET's own: Shift+B sets or releases the parking brake (FLIGHT LAB has none; B alone is the brakes, held)
    if (e.code === 'KeyB' && e.shiftKey) { applyAct({ type: 'flight', name: 'parkBrake' }); e.preventDefault(); return true; }
    const r = flight.key(e.code, e.shiftKey);
    if (!r) return false;
    if (r.kind === 'checklist' && r.ok === false && fh) fh.flashChecklist(r.text);
    else if (r.text && !(r.kind === 'atc' && fh)) toast(r.text, r.kind === 'atc' ? 4200 : 2400);
    if (r.kind === 'action' && audio.click) audio.click();
    e.preventDefault();
    return true;
  }

  // the 2D panel (Tab), 30 Hz: in the cockpit view it shows the glass's own canvases — the very screens of the 3D
  // panel, systems' tachometer and all — copied across, so nothing is drawn twice. From behind the aircraft the
  // glass is not drawn (the cockpit is hidden), so there it falls back to FLIGHT LAB's own drawing of the same data.
  let p2dT = 0;
  function draw2D(dt = 1 / 60) {
    if (!fh || !fh.panel2D || !flight.L || !active) return;
    if ((p2dT -= dt) > 0) return; p2dT = 1 / 30;
    if (view === 'cockpit' && fh.blitPanel2D && cockpit.glass.pfd && cockpit.glass.mfd && fh.blitPanel2D(cockpit.glass.pfd, cockpit.glass.mfd)) return;
    const s = flight.s, d = { o: { ...s.out, onGround: s.onGround }, av: flight.av, nav: AV.navSolve(flight.av, P.ne(s), s.out, P.MAGVAR_W, P.LAB_RWY), varW: P.MAGVAR_W, qnh: s.qnh, eng: s.eng.map(e => ({ run: e.run, rpm: e.rpm, feather: e.feather })), V: s.A.v, fuelCap: s.A.fuelCap, pos: P.ne(s) };
    fh.drawPanel2D(AV, d, (g, W) => drawApStrip(g, W, flight.av));
  }

  return {
    flight, live, cockpit,
    get active() { return active; }, get phase() { return phase; }, get view() { return view; }, get talking() { return talkOn; },
    get debrief() { return debriefShown; }, get runner() { return talkKind === 'debrief' && debRunner ? debRunner : runner; }, get fading() { return fading; },
    systems, dayMode, routeLine, beginDay, get crewId() { return crewId; },
    get ice() { return flight.s ? flight.s.ice || 0 : 0; },   // (B3.4) the airframe's ice, for the frost on the glass
    board, leave, setView, update, key, draw2D, canExit,
    // the introductory flight: set (behind the card), begun, the one going on; flown by the scripted cadet for `sec`
    // seconds — until a talk begins (the tests: the flight and its tasks stepped as frames do, the head as a talk left it
    // eased to the front, then turned to the right two seconds into the look; the cockpit and the HUD drawn once at the
    // end, as runScripted leaves a lesson)
    introFlight, introBegin, get intro() { return intro; },
    introAuto(sec = 1) {
      if (!intro) return null;
      auto = { task: null, mem: {}, keys: new Set() }; autoOpt.pilot = intro.pilot;
      try {
        for (let i = 0; i < sec * 60 && intro && !intro.done && active && !talkOn && phase === 'intro'; i++) {
          const res = flight.frame(1 / 60, intro.cadetHands ? autoKeys() : NO_KEYS, autoOpt);
          for (const ev of res.events) onEvent(ev);
          const v = intro && intro.view();
          if (v && v.task === 'look' && v.t >= 2) { yaw = -60 * DEG; homeT = 0; faceT = 0; } else if (homeT > 0) homeHead(1 / 60);
          if (intro) handle(intro.update(res.steps * H, flight.L.last, P.ne(flight.s), yaw / DEG));
        }
      } finally { auto = null; }
      if (active) placeNow();
      return intro ? intro.view() : null;
    },
    actOn(id, dir = 1, wheel = false) { const c = cockpit.controls.find(x => x.id === id); if (!c) return null; const d = c.act(dir, wheel); applyAct(d); return d; },
    beginLesson, retry, freeFromHere,
    // the recorder and the replay (the logbook's export reads the recordings; the debrief offers the replay)
    recorder, startReplay, endReplay, startFreeSession,
    get replaying() { return !!replay; },
    get simRate() { return simRate; }, get activePause() { return activePause; },
    // the head (degrees: yaw + to the left, pitch + up) and looking closer, as the mouse would (for the tests)
    look(yawDeg, pitchDeg) { yaw = yawDeg * DEG; pitch = pitchDeg * DEG; homeT = 0; faceT = 0; },
    setZoom(on) { zoomHold = !!on; },
    // the instruments up close, as the I key and a display's click do (for the tests)
    setFocus, cycleFocus,
    get focus() { return focusId; }, get zoom() { return zoomFov; },
    // a lesson flown by a scripted pilot (FLIGHT LAB's bot, for the tests), then the same end as a flown one
    runScripted(pilot, maxSec, hook) { const L0 = flight.runScripted(pilot, maxSec, hook); if (L0 && L0.done) onEnded(); return L0; },
    // the shadow box follows the aircraft (a small one round the cockpit), the windsock the lesson's wind
    shadowFocus(out) { return out.copy(live.root.position); },
    wind() { const w = flight.s ? flight.s.wind : null; return w ? { fromDeg: ((w.fromDeg % 360) + 360) % 360, kt: w.kt } : null; },
    altitude() { return flight.s ? flight.s.out.agl / 3.28084 : 0; },
    // shown during the boot compile, hidden afterwards
    prepareCompile(on) { live.root.visible = on; lives.pa44.root.visible = on; cockpit.setVisible(on); },
    status() {
      // the instructor's head in the aircraft's frame (x right, y up, −z forward): in the right seat while flying
      let seatAt = null;
      if (active && crew && crew.headWorld) { crew.headWorld(v2); live.root.worldToLocal(v2); seatAt = v2.toArray(); }
      const d = dayMode.day;
      return { active, phase, view, talking: talkOn, talkKind, debrief: debriefShown, ap: { ...ap.display }, flight: flight.L ? flight.status() : null, rpmVisual, yaw, pitch, focus: focusId, zoom: zoomFov, facing: faceT > 0, hover: hover ? hover.id : null, seatAt, eye: cockpit.eye.toArray(),
        intro: intro ? intro.view() : null, parked: !!parked().visible,
        engine: { running: systems.running, cranking: systems.cranking, rpm: systems.rpm, oil: systems.oil, sw: { ...cockpit.switches } }, guide: guideCtl ? guideCtl.id : null,
        day: d ? { phase: d.phase, label: d.label, items: d.items(), radio: d.atc.view(), assisting: dayMode.assisting, flying: dayMode.flying, st: { incursion: d.st.incursion, exit: d.st.exit, crash: d.st.crash || null, obstacle: lastObstacle, memo: { ...d.st.memo, hold: undefined } } } : null };
    },
  };
}
