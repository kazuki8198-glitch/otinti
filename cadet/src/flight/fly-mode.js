// CADET — flight/fly-mode.js : boarding today's Archer and flying it (M3).
// The player walks up to the aircraft and gets in (a short fade): the flown model takes the parked one's place, the
// cockpit is drawn round the pilot's eye, and 早瀬 教官 sits in the right seat. He asks what to do — today's lesson
// (the transit to the training area is skipped: FLIGHT LAB's lesson starts in the air) at one of three levels, a free
// flight from the apron, or getting out again. In flight FLIGHT LAB's lesson runs exactly as in FLIGHT LAB
// (flight/flight.js), the instructor says each step's instruction and the hints, and a debrief follows the end.
// The view: the pilot's eye with the mouse (right button held: look closer), or outside behind the aircraft (C); a
// click on a switch, lever or knob under the crosshair works it, the wheel turns it. While the one in the right seat
// talks, the flight waits (paused, the keys not the aircraft's) but the head stays the player's: it turns to them when
// the talk begins, for FACE_S (any look of the mouse's stops that), and looks wherever the mouse takes it; the switches
// under the crosshair, the closer look and the keys wait for the talk's end. Getting out puts the aircraft back on its
// stand.
// M4: the engine and the electrics are aircraft/systems.js behind the cockpit's switches (cold on the stand: the
// cadet, or the instructor, starts it); the whole first day is flight/day-mode.js (the checklists, the radio, the
// taxiing, t1 → a2 → t3, the debrief and the logbook).
// main.js owns the modes, the menu and the loop; it hands this module what it needs (ctx below) and calls update()
// every frame while flying.
import * as THREE from 'three';
import { createFlight } from './flight.js';
import { liveAircraft } from '../aircraft/exterior.js';
import { buildCockpit } from '../aircraft/cockpit.js';
import { seatFromBody } from '../npc/actor.js';
import { createRunner } from '../dialog/engine.js';
import { cockpitDialogs, flightLine, debriefLine } from '../content/dialog/cockpit.js';
import { debriefDialogs } from '../content/dialog/debrief.js';
import { withEnglish, airEnglish } from '../content/dialog/en.js';
import { EVENT_LINES } from '../content/dialog/day1.js';
import { createSystems, RUNNING } from '../aircraft/systems.js';
import { createDayMode } from './day-mode.js';
import { createRouteLine } from '../world/route-line.js';
import { ourCall } from '../content/dialog/atc.js';

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
//   (the solo's day is over in the seat: no one to debrief it there) }
export function createFlyMode(ctx) {
  const { FL, L, scene, camera, sky, input, settings, audio, toast, hud, world } = ctx;
  // who is in the right seat (chosen when boarding): the instructor's actor, or the chief instructor's, or no one
  let crew = ctx.instructor, crewName = ctx.instructorName || '早瀬 教官', crewColor = null, crewId = 'instructor';
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
  const engShow = { rpm: 0, run: false, twin: systems.twinLive };
  // the ring round the control to use next (the day's checklists): drawn over everything, pulsing
  const guide = new THREE.Mesh(new THREE.RingGeometry(0.02, 0.0275, 40), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 2.0, 0.7), transparent: true, opacity: 0.9, depthTest: false, depthWrite: false, side: THREE.DoubleSide }));
  guide.renderOrder = 10; guide.visible = false; guide.name = 'cockpit-guide';
  live.root.add(guide);
  let guideCtl = null;
  // the way to taxi, on the pavement
  const routeLine = createRouteLine(L); scene.add(routeLine.mesh);
  // the first day (what it borrows from here)
  const NOHUD = { setTask() {}, setChecklist() {}, setRadio() {}, hideAll() {} };
  const dayMode = createDayMode({ FL, flight, systems, audio, settings, routeLine, dayHud: ctx.dayHud || NOHUD,
    get stand() { return { a: ctx.stand.a, c: ctx.stand.c }; },
    say: (t, ms) => say(t, ms), note: (t, ms) => { if (fh) fh.say('メモ', t, ms); else toast(t, ms); },
    setGuide: (id) => setGuide(id), startLesson: startDayLesson, talk: (w) => startTalk(w), debrief: startDebrief,
    markDirty: () => { if (cockpit.markDirty) cockpit.markDirty(); } });

  // ---- state
  let active = false, phase = 'off';          // 'board' (talking in the seat) | 'ground' | 'lesson' | 'debrief' | 'leaving'
  let view = 'cockpit', yaw = 0, pitch = 0, chaseYaw = 0, chasePitch = 0.08, psiS = null, fov = null;
  let rpmVisual = null, talkOn = false, talkKind = 'board', lineT = 0, lastChime = -1, lastHint = '', hudT = 0, chosen = null, go = null, lastAtcMsg = '';
  const blend = { t: 0, pos: [0, 0, 0], q: new THREE.Quaternion() };
  let fading = false, warnedExit = 0, debriefShown = false, lastLevel = settings.get('lessonLevel') || 'basic', homeT = 0, faceT = 0;
  const pose = { pos: [0, 0, 0], q: [0, 0, 0, 1] };
  const qBlend = new THREE.Quaternion(), qBody = new THREE.Quaternion(), qHead = new THREE.Quaternion(), eHead = new THREE.Euler(0, 0, 0, 'YXZ');
  const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), camWorld = new THREE.Vector3(), head = new THREE.Vector3();
  const ray = new THREE.Raycaster(), center = new THREE.Vector2(0, 0);
  ray.far = 1.6;
  let hover = null, zoomHold = false, wasStop = true, hintCool = 0, shadowHalf = undefined, debRunner = null;

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
  const makeRunner = (data) => { runner = createRunner({ data: seatName(withEnglish(data)), state: ctx.talkState, hooks: { onHook } }); runner.onChange(onTalkView); return runner; };
  const onTalkView = (v) => {
    if (v) { ctx.dui.show(v); if (crew && v.speaker !== 'player' && !crew.gesturing && Math.random() < 0.25) crew.gesture('explain'); }
    else endTalk();
    ctx.saveTalk();
  };
  makeRunner(cockpitDialogs(FL, { lessonId: ctx.lessonId || 'a2' }));
  function onHook(name, arg) {
    if (name === 'fly') { chosen = arg; if (arg === 'free') startEngine(); }   // 「エンジンをかけますね」
    else if (name === 'go') go = arg;
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
  function pointAtPanel(what) {
    if (what === 'pedals') { if (!pedalsCtl) return; cockpit.aimPoint(pedalsCtl, v1); }        // (in the world)
    else { if (!cockpit.screens.pfd) return; cockpit.screens.pfd.localToWorld(v1.copy(pfdMid)); }
    if (crew) { crew.pointAt(v1); crew.gesture('point'); }
  }
  // which: 'board' (the menu on sitting down), 'transit' / 'return' / 'pattern' (the day's questions in the air), 'debrief'
  // (the mouse stays captured: the head looks round while he talks; main.js lets it go while the choices are up)
  function startTalk(which = 'board', data = null) {
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
  const dayWind = () => { const w = ctx.wind || { fromDeg: 330, kt: 8 }; return { rel: w.fromDeg - P.LAB_RWY.trueHdg, kt: w.kt, gust: 0.5 }; };
  function board({ instant = false } = {}) {
    if (active) return 'flying';
    active = true; phase = 'board';
    fade(() => {
      const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c);
      useAircraft(todayType());
      flight.startOnGround(n, e, ctx.stand.hdgTrue, liveId, { autoRud: settings.get('autoRud'), wind: dayWind() });
      parked().visible = false; ctx.todayColliders(false);
      live.root.visible = true; cockpit.setVisible(true); setView('cockpit');
      systems.setCold(flight.s); rpmVisual = 0;                     // the aircraft as left on the stand: everything off
      // the right seat: the instructor (or the chief instructor), or no one on the first solo
      const cw = ctx.crew ? ctx.crew() : { actor: ctx.instructor, name: ctx.instructorName };
      crew = cw ? cw.actor : null; crewName = cw ? cw.name : ''; crewColor = cw ? cw.color || null : null; crewId = cw ? cw.id || 'instructor' : null;
      if (crew) {
        live.root.add(crew.root);
        crew.root.position.set(seat.position[0], seat.position[1], seat.position[2]); crew.root.rotation.set(0, seat.yaw, 0);
        if (crew.setSeated) crew.setSeated(seat.seat);
      }
      if (ctx.boardDialogs) makeRunner(ctx.boardDialogs());
      yaw = 0; pitch = HOME_PITCH;
      ctx.onEnter();
      placeNow();
      if (fh) { fh.show(true); fh.setMode('free'); if (fh.setFreeTitle) fh.setFreeTitle(); if (settings.get('panel2D') !== fh.panel2D) fh.setPanel2D(!!settings.get('panel2D')); }
      // alone: no one to ask — the day begins at once
      if (crew) startTalk(); else { phase = 'day'; beginDay('basic'); }
    }, instant);
    return 'board';
  }
  function leave({ instant = false, then = 'walk' } = {}) {
    if (!active || phase === 'leaving') return;
    phase = 'leaving';
    if (runner.running) runner.stop();
    if (flight.L && !flight.free && !flight.L.done) { flight.abort('中止'); flight.finish(); }
    else if (flight.L && flight.free) flight.finish();
    fade(() => {
      active = false; phase = 'off';
      live.root.visible = false; cockpit.setVisible(false);
      parked().visible = true; ctx.todayColliders(true);
      if (crew) { if (crew.setSeated) crew.setSeated(null); ctx.instructorHome(crew.root, crew); }
      rpmVisual = null;
      if (dayMode.active) { if (ctx.onDayOver) ctx.onDayOver(dayMode.day); dayMode.end(); }
      if (audio.crank) audio.crank(false);
      if (audio.engine) audio.engine(null);
      if (fh) { fh.hideDebrief(); fh.setHelp(false); fh.show(false); }
      debriefShown = false;
      sky.setShadowHalf(null); shadowHalf = undefined;
      camera.fov = settings.get('fov'); camera.updateProjectionMatrix(); fov = null;
      hud.prompt(null);
      ctx.onLeave(then);
    }, instant);
  }
  function beginFree() {
    phase = 'ground';
    if (fh) fh.setMode('free');
    startEngine();
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
      flight.startLesson(lessonId, level, { autoRud: settings.get('autoRud') });
      systems.setRunning(flight.s);
      phase = 'lesson'; rpmVisual = null; lastChime = -1; lastHint = ''; hintCool = 0; debriefShown = false;
      yaw = 0; pitch = HOME_PITCH; homeT = 0; faceT = 0; psiS = null;
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
      flight.startFree('area', liveId, { autoRud: settings.get('autoRud'), wind: dayWind() });
      systems.setRunning(flight.s);
      phase = 'ground'; rpmVisual = null; psiS = null;
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
    phase = 'day';
    if (fh) { fh.setMode('free'); if (fh.setFreeTitle) fh.setFreeTitle('今日の 1 日', 'H でキーの一覧'); }
    systems.setFault(d.st.fault ? { dropL: 265 } : null);      // (M7) the run-up's fault, when the day has one
    dayMode.begin(d, level);
  }
  // a lesson of the day: from where the cadet is (handoff: FLIGHT LAB's own start, the picture blending the last
  // metres) or after a fade (the transit skipped, or flown and arrived)
  function startDayLesson(id, level, { handoff = false, fade: withFade = false, toast: note = '' } = {}) {
    const go = () => {
      const was = { pos: live.root.position.clone(), q: live.root.quaternion.clone() };
      flight.startLesson(id, level, { autoRud: settings.get('autoRud') });
      systems.adopt(flight.s);
      phase = 'lesson'; lastChime = -1; lastHint = ''; hintCool = 0; debriefShown = false; psiS = null;
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
    // the first solo: no one in the seat to debrief it — the day is signed off outside (ctx.onSolo)
    if (!crew) { if (dayMode.day) dayMode.day.debriefRead(); if (ctx.onSolo) ctx.onSolo(sum); return; }
    startTalk('debrief', seatName(debriefDialogs(sum, { voice: crewId || 'instructor' })));
  }
  let debSum = null;
  function signLogbook() {
    const d = dayMode.day, sum = debSum; if (!d || !sum) return;
    const remark = (sum.fault ? 'ランナップで左マグネトーの低下が制限超過。離陸を中止し整備へ（課目なし）。' : sum.lessons.every(l => l.passed) ? '今日の 3 課目は基準内。' : '再訓練の課目あり。') + (sum.walk.missed.length ? '外部点検の見落としあり。' : '') + (sum.incursion ? '停止線の越境あり（指導済み）。' : '');
    const done = () => { if (dayMode.day) dayMode.day.debriefRead(); say('今日はここまで。降りるときは、右のドアの取っ手をどうぞ。', 5200); };
    const p = ctx.onLogbook ? ctx.onLogbook(sum, remark) : null;
    if (p && p.then) p.then(done); else done();
  }

  // ---- the view
  function setView(v) {
    view = v;
    const inside = v === 'cockpit';
    live.setInside(inside); cockpit.setVisible(inside);
    if (crew) crew.root.visible = inside;
    applyShadow();
    hud.prompt(null); hover = null;
    if (!inside) psiS = null;
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
      if (d.name === 'parkBrake' && !flight.free) { toast('課目の中ではパーキングブレーキは使いません', 2200); return; }
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
      cockpit.switches[d.id] = d.value;              // (the key springs back from START by itself: aircraft/systems.js)
      if (audio.click) audio.click();
    } else if (d.type === 'prime') {
      const n = systems.prime();
      toast(`プライマー ${n} 回`, 1200);
      if (audio.knob) audio.knob();
    } else if (d.type === 'exit') {
      if (canExit()) leave();
      else if (performance.now() - warnedExit > 1500) {
        warnedExit = performance.now();
        toast(dayMode.active ? '今日の飛行の途中です。最後まで終わってから降りましょう（やめるときは Esc のメニューから）' : flight.free ? '止まってから降りましょう' : '課目の途中です。終わってから降りましょう（やめるときは Esc のメニューから）', 2600);
      }
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
    // the flight (FLIGHT LAB's tick: the keys once, then 1/120 s steps)
    frameOpt.paused = stop || phase === 'board' || phase === 'leaving';
    frameOpt.pilot = dayMode.pilot;                               // the instructor taxiing (I have control)
    const res = flight.frame(dt, keysFor(stop || !!frameOpt.pilot), frameOpt);
    // the engine and the electrics
    for (const ev of systems.update(frameOpt.paused ? 0 : dt, flight.s)) onSystems(ev);
    for (const ev of res.events) onEvent(ev);
    if (res.ended) onEnded();
    for (const r of res.pad || []) {
      if (r.type === 'view') setView(view === 'cockpit' ? 'chase' : 'cockpit');
      else if (r.type === 'toast' && r.text) toast(r.text, 2400);
      else if (r.type === 'help' && fh) fh.setHelp(!fh.help);
      else if (r.type === 'pause' && ctx.onPause) ctx.onPause();
    }
    // the head (or the orbit round the aircraft): the mouse's, after a moment turned to the one who talks (when a talk
    // begins) or back to the front (when it ends); a look of the mouse's stops either
    if (!stopHead) {
      const sens = 0.0022 * settings.get('sensitivity'), inv = settings.get('invertY') ? -1 : 1;
      if (look.x || look.y) faceT = 0;
      if (view === 'cockpit') {
        if (look.x || look.y) homeT = 0;
        else if (faceT > 0) faceInstructor(dt);
        else if (homeT > 0) { homeT -= dt; const k = 1 - Math.exp(-dt / 0.3); yaw += (0 - yaw) * k; pitch += (HOME_PITCH - pitch) * k; }
        yaw = THREE.MathUtils.clamp(yaw - look.x * sens, -LOOK.yaw, LOOK.yaw);
        pitch = THREE.MathUtils.clamp(pitch - look.y * sens * inv, -LOOK.down, LOOK.up);
      } else {
        chaseYaw -= look.x * sens; chasePitch = THREE.MathUtils.clamp(chasePitch - look.y * sens * inv, -0.15, 1.2);
      }
      if (faceT > 0) faceT -= dt;
    }
    // the propeller as the systems turn it (the starter, the run-up's magneto drop: the picture and the sound)
    rpmVisual = systems.rpm; engShow.rpm = systems.rpm; engShow.run = systems.running;
    if (blend.t > 0) blend.t = Math.max(0, blend.t - dt / 1.2);
    if (dayMode.active) dayMode.update(dt, { stop });
    placeNow();
    applyShadow();
    liveOpt.dt = dt; liveOpt.rpmVisual = rpmVisual; liveOpt.lights = lights(); liveOpt.inside = view === 'cockpit';
    live.update(flight.s, liveOpt);
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
      hud.prompt(hover ? hover.label : null, hover ? (hover.kind === 'knob' ? 'ホイール' : hover.kind === 'lever' ? 'クリック・ホイール' : 'クリック') : null);
      if (hover) {
        if (input.pressed('Mouse0') && !resumed) applyAct(hover.act(1, false));
        if (wheel && !resumed) for (let i = 0; i < Math.abs(wheel); i++) applyAct(hover.act(Math.sign(wheel), true));
      }
    } else if (hover) { hover = null; hud.prompt(null); }
    cockOpt.s = flight.s; cockOpt.L = flight.L; cockOpt.av = flight.av; cockOpt.parkBrake = flight.controls.parkBrake; cockOpt.night = night(); cockOpt.eng = engShow;
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
      // (the Seminole: each engine its own voice, as far along its start as it is; the gear's pump while it travels)
      if (todayType() === 'pa44') {
        const tw = systems.twinLive;
        if (!engOpt.engines) engOpt.engines = [{ rpm: 0, running: false }, { rpm: 0, running: false }];
        for (let k = 0; k < 2; k++) { engOpt.engines[k].rpm = tw[k].rpm; engOpt.engines[k].running = tw[k].eng === 'run' || tw[k].eng === 'stopping'; }
        engOpt.gearMoving = s.gearPos > 0.005 && s.gearPos < 0.995;
      } else { engOpt.engines = null; engOpt.gearMoving = false; }
      audio.engine(engOpt);
    }
    if (flight.free && (phase === 'ground' || phase === 'day')) taxiCheck();
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
  function onEvent(ev) {
    if (ev.type === 'touchdown') {
      if (audio.touchdown) audio.touchdown(ev.fpm);
      toast(`接地：${ev.fpm} fpm・${ev.kias} kt・中心線から ${Math.abs(ev.cross)} m ${ev.cross >= 0 ? '右' : '左'}${ev.onRunway ? '' : '（滑走路の外）'}`, 3200);
    } else if (ev.type === 'hard_landing') say('ハードランディングです。フレアが遅れたか、進入が速すぎました。', 4200);
    else if (ev.type === 'runway_excursion') say('滑走路から外れました。ラダーでセンターラインを保ちましょう。', 4200);
    else if (ev.type === 'tail_strike') say('尾部を擦りました。機首の上げすぎです。', 3800);
    else if (ev.type === 'engine_stop') toast(`エンジン停止：${ev.why}`, 3500);
    else if (ev.type === 'crash' && dayMode.active && flight.free) {
      // the day ends there: the debrief in the seat
      toast(`機体損傷：${ev.why}`, 5000); say('止まって！……ぶつけてしまいましたね。今日の飛行はここまでにします。', 5000);
      const d = dayMode.day; d.st.crash = ev.why;
      setTimeout(() => { if (dayMode.day === d && d.phase !== 'debrief' && d.phase !== 'done') d.abortTo('debrief'); }, 2500);
    }
    else if (ev.type === 'crash') { toast(`機体損傷：${ev.why}`, 5000); if (flight.free) { const L0 = flight.L; setTimeout(() => { if (flight.L === L0) showFreeEnd(); }, 1500); } }
  }
  function onEnded() {
    flight.finish();
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
      if (fh) { fh.showDebrief(st, { onRetry: retry, onFree: freeFromHere, onReturn: () => leave() }); debriefShown = true; input.exitLock(); }
    }, st.crashed ? 1500 : 600);
  }
  function showFreeEnd() {
    if (!active || !fh || debriefShown || phase === 'leaving') return;
    fh.showDebrief(flight.status(), { onRetry: () => { fh.hideDebrief(); debriefShown = false; fade(() => { const [n, e] = P.rwyToNE(P.LAB_RWY, ctx.stand.a, ctx.stand.c); flight.startOnGround(n, e, ctx.stand.hdgTrue, liveId, { autoRud: settings.get('autoRud'), wind: dayWind() }); phase = 'ground'; systems.setCold(flight.s); startEngine(); psiS = null; placeNow(); }); input.requestLock(); }, onFree: null, onReturn: () => leave() });
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
    if (talkOn || debriefShown || fading) return false;
    if (e.code === 'KeyC') { setView(view === 'cockpit' ? 'chase' : 'cockpit'); return true; }
    if (e.code === 'KeyH') { if (fh) fh.setHelp(!fh.help); return true; }
    if (e.code === 'Tab') { e.preventDefault(); if (fh) { const on = !fh.panel2D; fh.setPanel2D(on); settings.set('panel2D', on); } return true; }
    if (phase === 'board') return false;
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
    get debrief() { return debriefShown; }, get runner() { return talkKind === 'debrief' && debRunner ? debRunner : runner; }, get fading() { return fading; },
    systems, dayMode, routeLine, beginDay, get crewId() { return crewId; },
    board, leave, setView, update, key, draw2D, canExit,
    actOn(id, dir = 1, wheel = false) { const c = cockpit.controls.find(x => x.id === id); if (!c) return null; const d = c.act(dir, wheel); applyAct(d); return d; },
    beginLesson, retry, freeFromHere,
    // the head (degrees: yaw + to the left, pitch + up) and looking closer, as the mouse would (for the tests)
    look(yawDeg, pitchDeg) { yaw = yawDeg * DEG; pitch = pitchDeg * DEG; homeT = 0; faceT = 0; },
    setZoom(on) { zoomHold = !!on; },
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
      return { active, phase, view, talking: talkOn, talkKind, debrief: debriefShown, flight: flight.L ? flight.status() : null, rpmVisual, yaw, pitch, facing: faceT > 0, hover: hover ? hover.id : null, seatAt, eye: cockpit.eye.toArray(),
        engine: { running: systems.running, cranking: systems.cranking, rpm: systems.rpm, oil: systems.oil, sw: { ...cockpit.switches } }, guide: guideCtl ? guideCtl.id : null,
        day: d ? { phase: d.phase, label: d.label, items: d.items(), radio: d.atc.view(), assisting: dayMode.assisting, flying: dayMode.flying, st: { incursion: d.st.incursion, exit: d.st.exit, crash: d.st.crash || null, obstacle: lastObstacle, memo: { ...d.st.memo, hold: undefined } } } : null };
    },
  };
}
