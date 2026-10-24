// CADET — main.js : start-up, walking, talking, flying, and the free "visit" camera.
// Builds the world from FLIGHT LAB's data (the airfield, the ground, the lakes, the trees, parked aircraft), the
// academy (inside and out), the sky and the image pipeline. You start in briefing room 1 and walk: through the doors,
// the lobby and the airside doors out to today's aircraft on the apron; E (or a click) examines boards and models and
// opens doors; the instructor in briefing room 1 talks you through today's lesson; today's Archer can be boarded and
// flown (flight/fly-mode.js). Esc pauses (settings, keys, the visit camera). ?view=N starts in the visit camera at
// viewpoint N; ?bench measures the frame time at the fixed viewpoints.
import * as THREE from 'three';
import { makeLayout, NAMES, HANGARS } from './world/layout.js';
import { loadTextures, setAnisotropy } from './render/textures.js';
import { createPipeline } from './render/post.js';
import { createSky } from './render/sky.js';
import { installIndoorShading, indoorAt, createLightPool, roomClusters } from './render/indoor.js';
import { buildGround } from './world/ground.js';
import { buildAirfield, airfieldColliders, STANDS } from './world/airfield.js';
import { buildBuildings } from './world/buildings.js';
import { buildAcademy, ACADEMY } from './world/academy.js';
import { createPropKit } from './world/props.js';
import { academySpec } from './content/academy-spec.js';
import { buildVegetation } from './world/vegetation.js';
import { buildLandmarks } from './world/landmarks.js';
import { parkedAircraft, colliderBoxes } from './aircraft/exterior.js';
import { PRESETS, ORDER, gpuName, pickPreset, rememberPreset, makeDynRes } from './core/quality.js';
import { createInput } from './core/input.js';
import { createCollisionWorld } from './player/collide.js';
import { createWalker } from './player/walker.js';
import { createInteractor } from './player/interact.js';
import { createSpectator } from './ui/spectator.js';
import { createSettings } from './ui/settings.js';
import { createMenu } from './ui/menu.js';
import { createAudio } from './audio/sfx.js';
import { createRunner, createDialogState } from './dialog/engine.js';
import { createSave } from './core/save.js';
import { gameBook } from './content/book.js';
import { INSTRUCTOR, instructorDialogs, sampleCtx } from './content/dialog/instructor.js';
import { createActor } from './npc/actor.js';
import { createDialogUI } from './ui/dialog-ui.js';
import { createFlyMode } from './flight/fly-mode.js';
import { createFlightHUD } from './ui/flight-hud.js';
import { createDayHUD } from './ui/day-hud.js';
import { createDay, DAY1 } from './career/day.js';
import { createLogbook, entryFrom } from './career/logbook.js';
import { buildWalkaroundProps } from './aircraft/walkaround-props.js';
import { apronDialogs } from './content/dialog/day1.js';
import { POINTS } from './content/walkaround-archer.js';
import { createCareer, SLOT_HOURS, SLOT_NAMES, CHAPTERS, CH2, GROUND, EXAMS, CLASSES, SOLO_TRUST, dateText, dateOf, passedAt, groundPassed } from './career/career.js';
import { planFor } from './career/day.js';
import { exportArchive, importArchive } from './career/archive.js';
import { PEOPLE, PEERS } from './content/people.js';
import { createCast, FAR as CAST_FAR } from './npc/cast.js';
import { createCrowd } from './npc/crowd.js';
import { peopleDialogs } from './content/dialog/people.js';
import { careerInstructorDialogs } from './content/dialog/instructor-career.js';
import { careerBoardDialogs } from './content/dialog/cockpit.js';
import { classDialogs, ftdDialogs, examDialogs, scoreOf, FTD_TITLES, pfdPictures } from './content/school.js';
import { drawPfdPicture } from './world/pfd-picture.js';
import { createTablet } from './ui/tablet.js';
import { createCards } from './ui/cards.js';
import { trustOf } from './dialog/engine.js';
import { spoken } from './content/dialog/atc.js';

/* global __BUILD_INFO__ */
const $ = (s) => document.querySelector(s);
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const params = new URLSearchParams(location.search);
// the day's wind: the one FLIGHT LAB's lessons fly in (the runway's heading + 10° true, 5 kt), so the METAR on the
// dispatch board, the ATIS, the windsock and the flights from the apron all agree with the lessons
const DAY_WIND = { fromDeg: 4, kt: 5 };
// a day too windy to fly (M5's weather): the windsock shows it
const XWIND = { fromDeg: 90, kt: 16 };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function bootMsg(text, k) { $('#bootMsg').textContent = text; if (k != null) $('#bootBar').style.width = `${Math.round(k * 100)}%`; }
function fail(e) {
  console.error(e);
  bootMsg('起動できませんでした：' + (e && e.message ? e.message : e) + '（Chrome の最近の版で、WebGL2 が使える必要があります）');
  $('#bootBar').style.background = '#ff8a7a';
}

async function boot() {
  const buildInfo = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : 'dev';
  $('#buildInfo').textContent = buildInfo;
  const FL = globalThis.FL;
  const need = ['physics', 'avionics', 'school', 'syllabus', 'acmesh'].filter(k => !FL || !FL[k]);
  if (need.length) throw new Error('FLIGHT LAB のモジュールがありません: ' + need.join(', '));
  const L = makeLayout(FL.physics), G = L.G;
  // less sky light inside the buildings: patched into three's shader chunks before any material compiles
  installIndoorShading(L, ACADEMY);
  const settings = createSettings();
  // the cadet's career (M5): the calendar, the time of day, the chapter (kept in localStorage 'cadet.career')
  const store = (() => { try { return globalThis.localStorage || null; } catch (e) { return null; } })();
  const career = createCareer({ store, seed: params.get('seed') ? +params.get('seed') : undefined });

  bootMsg('画像を読み込んでいます…', 0.05);
  await loadTextures((k) => bootMsg('画像を読み込んでいます…', 0.05 + 0.25 * k));

  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) throw new Error('WebGL2 が使えません');
  // the pipeline (renderer, scene, camera, post-processing) with the preset for this GPU (or the player's choice)
  const view = $('#view');
  let preset = PRESETS.high;
  const pipe = createPipeline(view, preset);
  const gpu = gpuName(pipe.renderer);
  const chosen = params.get('q') && PRESETS[params.get('q')] ? params.get('q') : settings.get('quality') || pickPreset(gpu);
  preset = PRESETS[chosen] || PRESETS.high;
  pipe.setQuality(preset);
  const { scene, camera, renderer } = pipe;
  setAnisotropy(Math.min(preset.aniso, renderer.capabilities.getMaxAnisotropy()));
  const world = createCollisionWorld();
  const audio = createAudio();
  audio.setVolume(settings.get('volume'));

  bootMsg('飛行場を作っています…', 0.35); await frame();
  const ground = buildGround(L, FL, { quality: preset }); scene.add(ground.group);
  const airfield = buildAirfield(L, FL, { quality: preset }); scene.add(airfield.group); airfieldColliders(airfield, world);
  bootMsg('訓練所を作っています…', 0.45); await frame();
  const buildings = buildBuildings(L, { world }); scene.add(buildings.group);
  const spec = academySpec(FL);
  const academy = buildAcademy({ L, FL, spec, kit: createPropKit(), world, audio }); scene.add(academy.group);
  bootMsg('木と景色を作っています…', 0.6); await frame();
  const veg = buildVegetation(L, FL, { quality: preset }); scene.add(veg.group);
  scene.add(buildLandmarks(L, FL).group);
  bootMsg('機体を並べています…', 0.7); await frame();

  // the runway frame (where the colliders live): x = across, z = −along
  const cy = Math.cos(L.frameYaw), sy = Math.sin(L.frameYaw);
  const toFrame = (x, z) => [x * cy - z * sy, x * sy + z * cy];
  // parked aircraft on the tie-down spots (noses towards the taxilane), one in the open hangar; each part a collider
  const hdgOut = (L.R.trueHdg + 270) % 360;
  const parked = [];
  const spots = [[0, 'pa28'], [2, 'pa28'], [3, 'pa28'], [5, 'pa28'], [8, 'pa28'], [10, 'pa44'], [13, 'pa28'], [16, 'pa44'], [19, 'pa28'], [22, 'pa28']];
  const aircraftColliders = (ac, tag) => colliderBoxes(ac.root, toFrame, G).map(b => world.add({ ...b, tag }));
  let todayIds = [], todayAc = null;
  for (const [i, id] of spots) {
    const s = STANDS[i]; if (!s) continue;
    const ac = parkedAircraft(FL, L, id, s.a, s.c - 0.4, hdgOut, { prop: 0.3 + i * 0.7 });
    scene.add(ac.root); parked.push(ac);
    const ids = aircraftColliders(ac, i === 19 ? 'aircraft:today' : 'aircraft');
    if (i === 19) { todayIds = ids; todayAc = ac; }
  }
  { const ac = parkedAircraft(FL, L, 'pa28', 563, 258, hdgOut, { prop: 1.1 }); scene.add(ac.root); parked.push(ac); aircraftColliders(ac, 'aircraft'); }
  // tree trunks and shrubs around the academy's grounds; an invisible fence at the edge of the airfield's grass
  {
    const [cx, , cz] = L.rwyToLocal(640, 260);
    for (const [x, z, s, kind] of veg.near(cx, cz, 900)) {
      const r = (kind === 'shrub' ? 0.45 : kind === 'palm' ? 0.2 : 0.28) * s, [fx, fz] = toFrame(x, z);
      world.add({ x0: fx - r, x1: fx + r, y0: 0, y1: kind === 'shrub' ? 1.0 : 8, z0: fz - r, z1: fz + r, tag: 'tree' });
    }
    const R = L.region, t = 2;
    world.add({ x0: R.c0 - t, x1: R.c1 + t, y0: 0, y1: 50, z0: -R.a0, z1: -R.a0 + t, tag: 'fence' });
    world.add({ x0: R.c0 - t, x1: R.c1 + t, y0: 0, y1: 50, z0: -R.a1 - t, z1: -R.a1, tag: 'fence' });
    world.add({ x0: R.c0 - t, x1: R.c0, y0: 0, y1: 50, z0: -R.a1, z1: -R.a0, tag: 'fence' });
    world.add({ x0: R.c1, x1: R.c1 + t, y0: 0, y1: 50, z0: -R.a1, z1: -R.a0, tag: 'fence' });
  }

  bootMsg('空と光を準備しています…', 0.8); await frame();
  const sky = createSky(renderer, scene, preset);
  const pool = createLightPool(scene, 5);
  // the light the lit rooms bounce around (ceilings, the sides of things facing away from the lamps); the indoor shading
  // applies it inside the buildings only
  const fill = new THREE.AmbientLight(0xfff1e0, 0); scene.add(fill);
  academy.group.updateMatrixWorld(true);
  // each room's ceiling fixtures as a few light clusters (a fixture hanging high in the lobby counts for more)
  const clusters = new Map();
  for (const r of academy.rooms) {
    const fx = academy.lights.filter(l => l.room === r.id).map(l => ({ a: -l.z, c: l.x, p: academy.group.localToWorld(new THREE.Vector3(l.x, l.y, l.z)), w: l.y > 4 ? 3 : 1 }));
    clusters.set(r.id, roomClusters(fx, 5, G));
  }
  let hours = parseFloat(params.get('t')) || career.hours;
  const applyTime = () => {
    const st = sky.setTime(hours);
    pipe.setHaze({ sunDir: st.dir, el: st.el });
    buildings.setNight(st.lightsOn); academy.setNight(st.lightsOn);
    $('#time').value = String(hours);
    const hh = Math.floor(hours), mm = Math.round((hours - hh) * 60);
    $('#timeTxt').textContent = `${hh}:${String(mm).padStart(2, '0')}（現地時刻） 太陽高度 ${st.el.toFixed(0)}°`;
  };
  applyTime();

  // ---------------------------------------------------------------- the player
  const input = createInput(renderer.domElement);
  const surfaceAt = (x, z) => {
    const [fx, fz] = toFrame(x, z), a = -fz, c = fx;
    const f = academy.inside(a, c) && academy.floorAt(a, c); if (f) return f;
    if (indoorAt(ACADEMY, a, c) > 0) return 'concrete';
    const k = L.cellAt(a, c)?.kind;
    return k === 'apron' || k === 'walk' ? 'concrete' : k ? 'asphalt' : 'grass';
  };
  const walker = createWalker({ camera, world, L, input, settings, surfaceAt, onStep: (s, k) => audio.footstep(s, k) });
  const spectator = createSpectator(camera, input, { groundY: G, settings });
  // the HUD for the interactor: the prompt under the crosshair and the examine card
  let lastPrompt = null, interactor = null;
  const hud = {
    prompt(text, key = 'E') {
      if (interactor && interactor.cardOpen) text = null;
      const k = text ? `${key}|${text}` : null;
      if (k === lastPrompt) return; lastPrompt = k;
      const el = $('#prompt'); if (text) el.innerHTML = `<kbd>${esc(key || 'E')}</kbd>${esc(text)}`; el.classList.toggle('show', !!text);
    },
    // choices: [{ k, text }] (the walk-around's decisions, keys 1–4), or none
    card(title, text, choices = null) {
      const c = $('#card'); if (!title) { c.hidden = true; walkOpen = null; homeOpen = false; return; }
      c.querySelector('.card-title').textContent = title; c.querySelector('.card-body').textContent = text;
      const ch = c.querySelector('.card-choices'); ch.textContent = '';
      for (const x of choices || []) { const b = document.createElement('button'); b.type = 'button'; b.tabIndex = -1; b.innerHTML = `<kbd>${x.k}</kbd>${esc(x.text)}`; b.dataset.k = String(x.k - 1); ch.appendChild(b); }
      ch.hidden = !(choices && choices.length);
      c.querySelector('.card-foot').textContent = choices && choices.length ? '1〜4 で選ぶ・E で閉じる' : 'E で閉じる';
      c.hidden = false;
    },
  };
  interactor = createInteractor({ walker, world, L, hud });
  // (the boards that tell the day — the dispatch's schedule and weather, the lobby's flights, briefing room 1's
  // whiteboard — say the career's own day: boardCard below)
  for (const t of academy.targets) interactor.add({ ...t, use: () => { const c = boardCard(t) || t; interactor.showCard(c.title, c.text); audio.ui('examine'); return 'examined'; } });
  for (const t of academy.doors.targets()) {
    interactor.add({
      ...t, use: () => {
        const r = academy.doors.toggle(t.door, walker.framePos);
        if (r === 'locked') toast(`${t.door.label_ja || 'この扉'} — 鍵がかかっています`);
        return r;
      },
    });
  }
  // today's aircraft (stand 19): get in over the right wing; look it over (its card) from the left side; the walk-around
  // inspection's 15 places on it (aircraft/walkaround.js: E opens the place's card, 1–4 decide), with what it finds
  // drawn (the pitot cover, the ropes, the chocks, a cap left open)
  const logbook = createLogbook();
  const tg = spec.target;
  let today = null, dayN = 0;
  // ?anomalies=r_sump,r_cap plants those on the first day (tests, screenshots)
  const planted = params.get('anomalies') ? params.get('anomalies').split(',') : undefined;
  // a new flying day's walk-around and radio (career/day.js): today's lessons (the career's plan), the ATIS from the
  // day's weather (the information letter moves on each day)
  const PHON = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel', 'India', 'Juliett', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa', 'Quebec', 'Romeo', 'Sierra', 'Tango', 'Uniform', 'Victor', 'Whiskey', 'Xray', 'Yankee', 'Zulu'];
  const newDay = () => {
    dayN++;
    const w = career.weather(prog()), pm = career.slot === 'pm';
    today = createDay(FL, { seed: career.state.seed * 31 + career.day * 7 + dayN, stand: { a: tg.a, c: tg.c }, anomalies: dayN === 1 ? planted : undefined, plan: planOf(flightItem()),
      weather: { info: PHON[(career.day * 2 + (pm ? 1 : 0)) % 26], zulu: pm ? '1853' : '1353', tempC: w.tempC + (pm ? 3 : 0), dewC: w.dewC } });
    walkProps.set(today.walk.props()); renderWalk(); return today;
  };
  const walkProps = buildWalkaroundProps();
  todayAc.root.add(walkProps.root);
  todayAc.root.updateMatrixWorld(true);
  // a point on today's parked aircraft (its body frame) → the runway frame [x = across, y up, z = −along]
  const bodyToFrame = (b) => { const w = todayAc.root.localToWorld(new THREE.Vector3(b[0], b[1], b[2])), [fx, fz] = toFrame(w.x, w.z); return [fx, w.y - G, fz]; };
  {
    const AR = FL.physics.AIRCRAFT.find(a => a.id === 'pa28'), v = AR.v;
    interactor.add({ id: 'aircraft:board', owner: 'aircraft:today', frame: [tg.c, 1.25, -(tg.a + 1.0)], radius: 0.5, onOwner: true, prompt: '乗り込む', use: () => (fly ? fly.board() : null) });
    interactor.add({
      id: 'aircraft:today', owner: 'aircraft:today', frame: bodyToFrame([-0.66, 0.15, 1.0]), radius: 0.5, prompt: '今日の機体を見る',
      use: () => {
        // FLIGHT LAB's description, without its notes on real operators (the game's airline and school are fictional)
        const desc = AR.desc.split('。').filter(x => x && !/ANA|Acron|公開|教材/.test(x)).join('。') + '。';
        interactor.showCard(`今日の機体：${AR.short}（N738SY・架空の登録記号）`, `${AR.name.replace(/（教材モデル）/, '')}\n${desc}\n\n`
          + `覚える速度（KIAS）：ローテーション ${v.rotate}・Vx ${v.x}・Vy ${v.y}・進入 ${v.appr}・Va ${v.va}・Vno ${v.no}・Vne ${v.ne}\n\n`
          + '飛ぶ前には必ず外部点検（プリフライト）をします。機体の周りを決まった順番で回り、燃料・オイル・舵の動き・タイヤを確かめます。');
        audio.ui('examine'); return 'examined';
      },
    });
  }
  // the walk-around's card: what to check, what is seen, and the choices (1–4 / a click)
  const walkTargets = [];
  let walkOpen = null;                                       // the place whose card is open
  let homeOpen = false;                                      // the front door's card (home to sleep) is open
  function walkCard(id) {
    const c = today.walk.inspect(id); if (!c) return null;
    walkOpen = id;
    interactor.showCard(c.title, `【確かめること】${c.check}\n\n【見えること】${c.seen}`, c.choices.map((x, i) => ({ k: i + 1, text: x.text, act: x.act })));
    audio.ui('examine');
    renderWalk();
    return 'examined';
  }
  function walkChoose(k) {
    if (!walkOpen) return false;
    const c = today.walk.inspect(walkOpen), ch = c && c.choices[k];
    if (!ch) return false;
    if (ch.act === 'close') { interactor.closeCard(); return true; }
    const r = today.walk.act(walkOpen, ch.act);
    if (audio.click) audio.click();
    walkProps.set(today.walk.props());
    if (r && r.mx) {
      // the maintenance is called: the mechanic puts it right (and remembers who looked carefully)
      talkState.trust.mechanic = Math.min(100, trustOf(talkState, 'mechanic') + 2); saved.save(talkState);
      interactor.closeCard();
      toast(`整備の大城さんに連絡しました。${r.mx}`, 5200);
      walkOpen = null; renderWalk();
      return true;
    }
    if (r && r.say) toast(`早瀬 教官：${r.say}`, 4800);
    walkCard(walkOpen);
    return true;
  }
  for (const p of POINTS) {
    const t = interactor.add({ id: 'walk:' + p.id, owner: 'aircraft:today', frame: bodyToFrame(p.at), radius: 0.32, low: p.at[1] < -0.2,
      prompt: () => `点検：${p.name}${today && today.walk.isDone(p.id) ? '（済）' : ''}`, use: () => walkCard(p.id) });
    walkTargets.push(t);
  }
  // the walk-around's progress (left, under the place's name) while near today's aircraft
  const walkEl = document.createElement('div'); walkEl.id = 'walk'; walkEl.hidden = true; document.getElementById('hud').appendChild(walkEl);
  function renderWalk() {
    if (!today) return;
    const sm = today.walk.summary();
    const groups = { cabin: '操縦席', 'right wing': '右翼', nose: '機首', 'left wing': '左翼', tail: '尾部' };
    walkEl.innerHTML = `<b>外部点検 ${sm.done} / ${sm.total}</b>` + Object.entries(groups).map(([g, name]) => {
      const ps = today.walk.points.filter(p => p.group === g);
      return `<div><span>${name}</span>${ps.map(p => `<i class="${today.walk.isDone(p.id) ? 'ok' : ''}" title="${esc(p.name)}"></i>`).join('')}</div>`;
    }).join('') + '<small>E：点検する　1〜4：決める</small>';
  }

  // ---------------------------------------------------------------- the people, and talking
  // 早瀬 教官 (fictional) waits in briefing room 1 between the whiteboard and the screen, facing the room; the academy's
  // other people (M5: npc/cast.js) are where the time of day puts them. E starts a conversation: the mouse is freed for
  // the choices, the view turns to whoever is talking, the walk stops. Flags and trust are kept in localStorage
  // ('cadet.save'). The hooks point at the board, nod, show a figure or a PFD on a screen, speak English, open the
  // textbook, and move the career on (a class, a test, the go / no-go, …).
  const book = gameBook(FL);
  const saved = createSave();
  const talkState = createDialogState(saved.load());
  const instructor = createActor();
  const INS = { a: 634.9, c: 256.7 };
  instructor.root.position.set(INS.c, 0, -INS.a); instructor.root.rotation.y = Math.PI;      // facing +a, into the room
  academy.group.add(instructor.root);
  const insCollider = world.add({ x0: INS.c - instructor.radius, x1: INS.c + instructor.radius, y0: 0, y1: 1.8, z0: -INS.a - instructor.radius, z1: -INS.a + instructor.radius, tag: 'npc:instructor' });
  // once the briefing is over (M4) he waits by today's aircraft, just behind its tail, facing its door (clear of the
  // way to the door)
  const APRON = (() => { const f = bodyToFrame([-1.8, -1.4, 5.3]), d = bodyToFrame([0.6, -1.4, -0.3]); return { c: f[0], a: -f[2], yaw: Math.atan2(d[0] - f[0], d[2] - f[2]) }; })();
  const insApron = world.add({ x0: APRON.c - instructor.radius, x1: APRON.c + instructor.radius, y0: 0, y1: 1.8, z0: -APRON.a - instructor.radius, z1: -APRON.a + instructor.radius, tag: 'npc:instructor' });
  world.setEnabled(insApron, false);
  let insAt = 'room';
  let celebrate = false;                                   // the first solo flown: they are waiting by the aircraft
  // where he is: by the aircraft once the cadet is briefed for today's flight (or for the solo, or after it, to
  // celebrate), else in his room
  const insWhere = () => (celebrate || (talkState.flags.briefed_today && !flownToday()) ? 'apron' : career.slot === 'evening' ? 'away' : 'room');
  function placeInstructor(where = insWhere()) {
    insAt = where;
    // the evening: gone home (nothing to bump into or talk to)
    if (where === 'away') {
      instructor.root.visible = false; world.setEnabled(insCollider, false); world.setEnabled(insApron, false);
      for (const t of interactor.list()) if (t.id === 'npc:instructor') t.enabled = false;
      return;
    }
    const root = instructor.root, P0 = where === 'apron' ? APRON : { c: INS.c, a: INS.a, yaw: Math.PI };
    academy.group.add(root); root.position.set(P0.c, 0, -P0.a); root.rotation.set(0, P0.yaw, 0); root.visible = true;
    world.setEnabled(insCollider, where === 'room'); world.setEnabled(insApron, where === 'apron');
    for (const t of interactor.list()) if (t.id === 'npc:instructor') { t.enabled = true; t.frame = [P0.c, 1.5, -P0.a]; }
  }
  const frameToWorld = (p, out = new THREE.Vector3()) => academy.group.localToWorld(out.set(p.x, p.y, p.z));

  // ---- the career's state for the talks (content/dialog/people.js, instructor-career.js read it through ctx)
  let fly = null;
  const prog = () => (fly && fly.flight ? FL.school.loadProgress(fly.flight.store) : FL.school.sanitizeProgress({}));
  const trustI = () => trustOf(talkState, 'instructor');
  const weatherNow = () => career.weather(prog());
  const planToday = () => career.schedule(prog(), { trust: trustI(), weather: weatherNow() });
  const FLY_KINDS = ['flight', 'checkride', 'solo'];
  const flightItem = () => planToday().find(x => FLY_KINDS.includes(x.kind)) || null;
  const grounded = () => career.doneToday('grounded', 'imsafe');
  const flownToday = () => { const it = flightItem(); return !it || career.doneToday(it.kind, it.id); };
  const planOf = (it) => (!it ? planFor(FL, 'a1') : it.kind === 'solo' ? planFor(FL, 't2', { solo: true }) : planFor(FL, it.kind === 'checkride' ? 'c1' : it.id));
  const lessonTitle = (id) => { const l = FL.school.lesson(id); return l ? `「${l.title}」` : id; };
  const cx = { career: {}, today: {}, weather: {}, imsafe: { honest: true }, quiz: { right: 0, n: 0, pct: 0, pass: false } };
  function refreshCtx() {
    const st = career.state, w = weatherNow(), it = flightItem(), sch = planToday();
    Object.assign(cx.career, { chapter: st.chapter, slot: st.slot, day: st.day, dayMod3: st.day % 3, tired: career.tired(), solo: !!st.solo });
    const study = it && it.kind === 'flight' ? it.id : sch.find(x => x.kind === 'study') ? (CH2.find(id => !passedAt(prog(), id)) || 't2') : 't2';
    const sec = book.lessonSections(study).map(x => book.section(x.id)).find(x => x && x.figure);
    Object.assign(cx.today, {
      flight: it ? it.id : '', flightTitle: it ? (it.kind === 'solo' ? 'ファーストソロ' : it.kind === 'checkride' ? 'ソロ前の審査' : `${lessonTitle(it.id)}の飛行`) : '今日の飛行',
      checkride: !!(it && it.kind === 'checkride' && !flownToday()), solo: !!(it && it.kind === 'solo'), exam: sch.some(x => x.kind === 'exam'),
      needsDecision: st.chapter === 'ch2' && !st.solo, decided: !!career.decidedToday(), decisionRight: career.decidedToday() ? career.decidedToday().right : true,
      lessonTitle: it ? lessonTitle(planOf(it).main) : '', studyTitle: lessonTitle(study), studySection: sec ? sec.id : null,
    });
    Object.assign(cx.weather, { ja: w.ja, metarAm: w.metar.am, metarPm: w.metar.pm, taf: w.taf, why: w.why });
    return cx;
  }

  // ---- the conversations: the instructor's (the day's briefing and his career talks), the others', the lessons
  const instructorData = () => {
    const it = flightItem(), plan = planOf(it), main = plan.main === 'c1' ? 'c1' : plan.main;
    const d = instructorDialogs(FL, { lessonId: main, day: plan.lessons }), c = careerInstructorDialogs();
    return { speakers: { ...d.speakers, ...c.speakers }, flags: [...new Set([...d.flags, ...c.flags])], hooks: [...new Set([...d.hooks, ...c.hooks])], dialogs: { ...d.dialogs, ...c.dialogs } };
  };
  let runner = null;
  function buildInstructorTalk() { runner = createRunner({ data: instructorData(), state: talkState, ctx: () => cx, hooks: { onHook } }); runner.onChange(onRoomView); }
  // by the aircraft (M4): his word on the walk-around
  const apronRunner = createRunner({ data: apronDialogs(), state: talkState, hooks: { onHook } });
  const peopleRunner = createRunner({ data: peopleDialogs(), state: talkState, ctx: () => cx, hooks: { onHook } });
  // a lesson or a test (its own state: what is scored is not kept)
  let lessonRun = null, lessonState = null, lessonKind = null, lessonQuestions = null;
  function startLesson(kind, id, data) {
    lessonState = createDialogState(); lessonKind = { kind, id, n: (data.questions || []).length }; lessonQuestions = data.questions || [];
    lessonRun = createRunner({ data, state: lessonState, ctx: () => cx, hooks: { onHook } });
    lessonRun.onChange(onRoomView);
    return lessonRun;
  }
  // the dialogue UI serves the room's talk and the talk in the aircraft (fly-mode's own runner)
  let talk = null;                                            // { yaw, pitch } (the view to come back to) while talking
  let talkEndedAt = -Infinity;                                // the E or click that ended a talk does not start it again
  let talkWho = null, talkRun = null, talkActor = null;
  const talkRunner = () => (fly && fly.talking ? fly.runner : talkRun || runner);
  const dui = createDialogUI({
    root: document.body, settings,
    onNext: () => { talkRunner().next(); afterStep(); },
    onChoose: (i) => { talkRunner().choose(i); afterStep(); },
  });
  function onRoomView(view) {
    // dui.show also speaks the line (settings: voice, volume); a line whose hook started a gesture (point, nod) keeps it
    if (view) { dui.show(view); if (talkActor && view.speaker !== 'player' && !talkActor.gesturing && Math.random() < 0.25) talkActor.gesture('explain'); }
    else endTalk();
    saved.save(talkState);
  }
  apronRunner.onChange(onRoomView); peopleRunner.onChange(onRoomView);
  // the click (or key) that ended the conversation also takes the mouse back for walking
  function afterStep() { if (!talk && started && mode === 'walk' && !menu.isOpen && !tablet.isOpen) input.requestLock(); }
  // who: 'instructor' or one of the cast; the talk chosen by the career (today's work comes first)
  function startTalk(who = 'instructor') {
    if (talk) return 'talking';
    interactor.closeCard(); hud.prompt(null);
    refreshCtx();
    const pick = chooseTalk(who);
    if (!pick) return null;
    talk = { yaw: walker.state.yaw, pitch: walker.state.pitch };
    talkWho = who; talkRun = pick.run; talkActor = who === 'instructor' ? instructor : cast.actor(who);
    document.body.classList.add('talking');
    input.exitLock();
    audio.ui('open');
    // the morning is over once the day's work starts
    if (career.slot === 'morning' && career.chapter !== 'prologue') { career.advance('am'); applySlot(); }
    if (!pick.run.start(pick.dialog, pick.node)) { endTalk(); return null; }
    return 'talk';
  }
  function chooseTalk(who) {
    const st = career.state, slot = st.slot, sch = planToday(), due = (k) => sch.find(x => x.kind === k && (x.slot === slot || (slot === 'morning' && x.slot === 'am')));
    if (who === 'lecturer') {
      const cls = due('class'), ftd = due('ftd'), ex = due('exam');
      if (cls && !career.doneToday('class', cls.id)) return { run: startLesson('class', +cls.id, classDialogs(FL, +cls.id, { seed: st.seed })), dialog: 'class' };
      if (ftd && !career.doneToday('ftd', ftd.id)) return { run: startLesson('ftd', ftd.id, ftdDialogs(FL, ftd.id, { seed: st.seed + st.day })), dialog: 'ftd' };
      if (ex && ex.id === 'written1' && !career.doneToday('exam', ex.id)) return { run: startLesson('exam', ex.id, examDialogs(FL, ex.id, { seed: st.seed + st.day })), dialog: 'exam' };
      return { run: peopleRunner, dialog: 'lecturer' };
    }
    if (who !== 'instructor') return { run: peopleRunner, dialog: who };
    if (insAt === 'apron' && !celebrate) return { run: apronRunner, dialog: 'apron' };
    if (celebrate) return { run: runner, dialog: 'celebrate' };
    if (st.chapter === 'prologue') return { run: runner, dialog: talkState.flags.met_instructor ? 'ground' : 'meet' };
    if (st.chapter === 'ch1') return { run: runner, dialog: 'ground' };
    if (st.solo) return { run: runner, dialog: 'after' };
    const ex = sch.find(x => x.kind === 'exam' && x.id === 'presolo');
    if (ex && !career.doneToday('exam', 'presolo') && (ex.slot === slot || slot === 'morning')) return { run: startLesson('exam', 'presolo', examDialogs(FL, 'presolo', { seed: st.seed + st.day })), dialog: 'exam' };
    const it = flightItem();
    if (sch.some(x => x.kind === 'study') && !career.doneToday('study', 'weather')) return { run: runner, dialog: 'study' };
    if (it && grounded() && !career.doneToday('study', 'imsafe')) return { run: runner, dialog: 'study' };
    if (it && it.kind === 'solo' && !flownToday()) return { run: runner, dialog: 'solo' };
    if (it && it.kind === 'checkride' && !flownToday()) return { run: runner, dialog: 'checkday' };
    if (it && it.kind === 'flight' && !flownToday()) return { run: runner, dialog: talkState.flags.briefed_today ? 'brief' : 'day' };
    return { run: runner, dialog: 'brief', node: 'menu:done' };
  }
  function endTalk() {
    if (!talk) return;
    talk = null; dui.hide(); document.body.classList.remove('talking');
    talkEndedAt = performance.now();
    const who = talkWho; talkWho = null; talkRun = null; talkActor = null; lessonRun = null;
    // briefed: he goes out to the aircraft (out of sight: while the cadet is still in the room he stays to see them off)
    if (who === 'instructor' && insAt === 'room' && insWhere() === 'apron') insGoOut = true;
    afterTalk.splice(0).forEach(f => f());
    lessonKind = null;
  }
  const afterTalk = [];                                       // what happens once the talk is over (a fade to the afternoon…)
  let insGoOut = false;
  // the pause menu's "erase the record": a new career, the instructor meets you again for the first time
  function resetProgress() {
    if (talk && talkRun) talkRun.stop();
    const fresh = createDialogState();
    for (const k of Object.keys(talkState)) delete talkState[k];
    Object.assign(talkState, fresh);
    saved.clear();
    if (fly) for (const k of ['flightlab-records-v2', 'flightlab-progress-v2']) { try { fly.flight.store.removeItem(k); } catch (e) { /* storage unavailable */ } }
    logbook.clear();
    career.reset();
    celebrate = false;
    if (!(fly && fly.active)) startDay({ card: true, place: true });
  }
  // the hooks of every talk
  function onHook(name, arg) {
    const actor = talkActor || instructor;
    if (name === 'nod') actor.gesture('nod');
    else if (name === 'look') actor.gesture('explain');          // 'player': they already look at you while talking
    else if (name === 'point') {
      // the whiteboard (or the screen) behind them, or out of the window towards the apron
      const room = talkWho === 'lecturer' ? (lessonKind && lessonKind.kind === 'ftd' ? 'sim' : 'brief-2') : 'brief-1';
      const s = arg === 'apron' ? { x: 240, y: 1.4, z: -INS.a - 2 } : academy.surfaceAt(room, arg === 'screen' ? 'wall_screen' : 'whiteboard');
      if (s) { actor.pointAt(frameToWorld(s)); actor.gesture('point'); }
    } else if (name === 'book') {
      const sec = book.section(arg);
      if (sec) dui.showBook({ title: sec.title, chapter: `第 ${sec.chapter.n} 章　${sec.chapter.title}`, html: sec.html });
    } else if (name === 'board') showFigure(arg === 'study' ? cx.today.studySection : arg, talkWho === 'lecturer' ? 'brief-2' : 'brief-1');
    else if (name === 'pfd') showPfd(arg);
    else if (name === 'say') speakEnglish(arg);
    else if (name === 'quizEnd') { cx.quiz = scoreOf(lessonState, +arg); }
    else if (name === 'done') workDone(arg);
    else if (name === 'decide') { const right = career.decision(arg, weatherNow()); refreshCtx(); cx.today.decisionRight = right; afterTalk.push(() => afterDecision()); }
    else if (name === 'tablet') toast('タブレットを受け取りました。Tab キーで開けます', 4200);
    else if (name === 'help') { career.tire(15); }
    else if (name === 'checkride') { cast.put('chief', CHIEF_APRON); talkState.flags.c1_briefed = true; toast('真壁 主任教官が、機体のところで待っています', 3600); }
    else if (name === 'imsafe') {
      const tired = career.tired(), honest = (arg === 'tired') === tired;
      cx.imsafe.honest = honest;
      if (arg === 'tired' || tired) { career.done('grounded', 'imsafe'); afterTalk.push(() => { buildInstructorTalk(); toast('今日は飛ばずに、地上で予習します。もう一度、早瀬 教官と話してください', 4200); }); }
    } else if (name === 'logbook') showLogbookNow(logbook.entries.length - 1);
    else if (name === 'solo') { celebrate = false; career.soloDone(); talkState.flags.soloed = true; afterTalk.push(() => { career.advance('evening'); applySlot(); placeInstructor('room'); layoutPeople(); }); }
  }
  // a textbook figure on a room's screen (the figures are FLIGHT LAB's SVG, drawn for a dark background)
  function showFigure(secId, room = 'brief-1') {
    const sec = secId && book.section(secId); if (!sec || !sec.figure) return;
    const svg = sec.figure.replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"').replace(/^<svg /, '<svg width="1200" height="760" ');
    const img = new Image();
    img.onload = () => {
      academy.redraw(room, 'wall_screen', (g, w, h) => {
        g.fillStyle = '#0b1422'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e8f0fa'; g.font = `600 ${Math.round(h * 0.06)}px "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif`;
        g.textBaseline = 'top'; g.fillText(sec.title, w * 0.04, h * 0.04, w * 0.92);
        const top = h * 0.14, bw = w * 0.92, bh = h * 0.82, k = Math.min(bw / img.width, bh / img.height);
        g.drawImage(img, (w - img.width * k) / 2, top + (bh - img.height * k) / 2, img.width * k, img.height * k);
      });
      const s = academy.surfaceAt(room, 'wall_screen'), actor = talkActor || instructor;
      if (s) { actor.pointAt(frameToWorld(s)); actor.gesture('point'); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  // the training device room's screen: a PFD picture (k2: the question's; k1: the tutorial's, a part framed)
  const TUTOR_PIC = { ias: 105, alt: 3500, hdg: 30, vs: 500, bank: 15 };
  function showPfd(arg) {
    const tut = /^tutor:(\w+)$/.exec(arg || '');
    const pic = tut ? TUTOR_PIC : pfdPictures(career.state.seed + career.day)[+arg];
    if (!pic) return;
    academy.redraw('sim', 'wall_screen', (g, w, h) => drawPfdPicture(FL, g, w, h, pic, { highlight: tut && tut[1] !== 'all' ? tut[1] : null, title: tut ? 'G1000 型 PFD（主な飛行表示）' : `PFD の読み取り：第 ${+arg + 1} 問` }));
    const s = academy.surfaceAt('sim', 'wall_screen'), actor = talkActor;
    if (s && actor && Math.random() < 0.5) { actor.pointAt(frameToWorld(s)); actor.gesture('point'); }
  }
  // English said aloud (the training device's radio lessons), when the voice is on
  function speakEnglish(en) {
    if (audio.squelch) audio.squelch();
    const synth = globalThis.speechSynthesis;
    if (!synth || settings.get('atcVoice') === false || typeof SpeechSynthesisUtterance === 'undefined') return;
    try {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(spoken(en));
      const v = synth.getVoices().find(x => /^en(-|_)US/i.test(x.lang)) || synth.getVoices().find(x => /^en/i.test(x.lang));
      if (v) u.voice = v;
      u.lang = 'en-US'; u.rate = 1.0; u.volume = Math.max(0, Math.min(1, settings.get('volume') ?? 0.8));
      synth.speak(u);
    } catch (e) { /* no speech here */ }
  }
  interactor.add({ id: 'npc:instructor', frame: [INS.c, 1.5, -INS.a], radius: 0.45, prompt: `${INSTRUCTOR.title_ja}と話す`, use: () => startTalk('instructor') });
  // the academy's other people
  const cast = createCast({ parent: academy.group, world, interactor, ids: ['chief', 'lecturer', 'dispatcher', 'mechanic', ...PEERS], onTalk: (id) => startTalk(id) });
  // everyone standing drawn as one mesh (npc/crowd.js)
  const crowdAt = new THREE.Vector3();
  const crowd = createCrowd(scene, { outdoors: (root) => { root.getWorldPosition(crowdAt); const [fx, fz] = toFrame(crowdAt.x, crowdAt.z); return !academy.inside(-fz, fx); } });
  crowd.add(instructor); for (const id of Object.keys(cast.people)) crowd.add(cast.actor(id));
  const CHIEF_APRON = { a: APRON.a + 1.4, c: APRON.c + 0.9, face: { a: tg.a, c: tg.c } };
  function layoutPeople() {
    refreshCtx();
    cast.layout(career.slot, career.chapter, planToday());
    if (talkState.flags.c1_briefed && cx.today.checkride) cast.put('chief', CHIEF_APRON);
    // after the first solo: the cadets by the aircraft with the instructor
    if (celebrate) PEERS.forEach((id, i) => cast.put(id, { a: APRON.a + 1.3 + i * 0.9, c: APRON.c + 1.6 - i * 0.5, face: { a: tg.a + 0.8, c: tg.c + 1.5 } }));
  }
  // turn the view smoothly towards the face of whoever is talking
  const insHead = new THREE.Vector3();
  function faceTalker(dt) {
    (talkActor || instructor).headWorld(insHead);
    const y0 = walker.state.yaw, p0 = walker.state.pitch;
    walker.lookAt(insHead.x, insHead.y - 0.05, insHead.z);
    const y1 = walker.state.yaw, p1 = walker.state.pitch, k = 1 - Math.exp(-dt / 0.18);
    let dy = y1 - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    walker.state.yaw = y0 + dy * k; walker.state.pitch = p0 + (p1 - p0) * k;
    walker.apply(dt);
  }

  // ---------------------------------------------------------------- flying (today's Archer, with the instructor)
  const flightHud = createFlightHUD({ root: document.body, settings });
  const dayHud = createDayHUD({ settings });
  fly = createFlyMode({
    FL, L, scene, camera, renderer, sky, input, settings, audio, toast, hud, dui, talkState, world, flightHud,
    saveTalk: () => saved.save(talkState), instructor, instructorName: INSTRUCTOR.title_ja, lessonId: 'a2', dayHud,
    today: () => today,
    // the right seat today: the instructor, the chief instructor on the check ride, no one on the first solo
    crew: () => {
      const it = flightItem(), open = it && !flownToday();
      if (open && it.kind === 'solo' && talkState.flags.briefed_today) return null;
      if (open && it.kind === 'checkride' && talkState.flags.c1_briefed) return { actor: cast.actor('chief'), name: PEOPLE.chief.title, id: 'chief' };
      return { actor: instructor, name: INSTRUCTOR.title_ja, id: 'instructor' };
    },
    boardDialogs: () => boardTalk(),
    // the debrief signed the logbook: the line written, the page shown; resolves when it is closed
    onLogbook: (sum, remarks) => new Promise((done) => {
      logbook.add(entryFrom(sum, { remarks, date: dateOf(career.day).iso, dayN: career.day, skippedSec: sum.transit === 'skip' ? 600 : 0 }));
      input.exitLock();
      dayHud.showLogbook(logbook.entries, logbook.totals(), { fresh: logbook.entries.length - 1, onClose: () => { done(); if (mode === 'fly' && !menu.isOpen) input.requestLock(); } });
    }),
    // out of the aircraft after a day (done or given up): the next one is a new day (a new walk-around)
    onDayOver: (d) => { pendingNewDay = true; dayOver(d); },
    // the first solo's day is over in the seat: its line in the logbook (signed outside, with the endorsement)
    onSolo: (sum) => soloLanded(sum),
    stand: { a: spec.target.a, c: spec.target.c, hdgTrue: (L.R.trueHdg + 270) % 360 }, wind: DAY_WIND,
    parkedToday: todayAc.root, toFrame,
    todayColliders: (on) => { for (const id of todayIds) world.setEnabled(id, on); },
    // they were in the aircraft: back where the day puts them (the instructor by the aircraft if the cadet was briefed)
    instructorHome: (root, actor) => { if (!actor || actor === instructor) placeInstructor(); else { for (const id of ['chief']) cast.home(id); layoutPeople(); } },
    onEnter: () => {
      world.setEnabled(insCollider, false); world.setEnabled(insApron, false); for (const t of interactor.list()) if (t.id === 'npc:instructor') t.enabled = false;
      if (cast.where('chief') && fly.crewId === 'chief') cast.detach('chief');
      walkEl.hidden = true;
      setMode('fly');
    },
    onLeave: (then) => {
      if (pendingNewDay) { pendingNewDay = false; newDay(); }
      setMode(then === 'spectator' ? 'spectator' : 'walk');
      // beside the right wing, behind its trailing edge, facing the cabin
      const tg = spec.target; placeWalker(tg.a + 1.4, tg.c + 2.6, { a: tg.a, c: tg.c });
      if (then !== 'spectator' && !menu.isOpen) input.requestLock();
      if (celebrate) toast('みんなが機体の後ろで待っています', 4200);
    },
    onTalk: (on) => { document.body.classList.toggle('talking', on); },
    onPause: () => openMenu(),
  });

  let pendingNewDay = false;
  // ---------------------------------------------------------------- the career (M5): the day, the time, the work
  // Each morning the cadet comes in through the academy's front door (the dorm is out of the grounds); the day's plan
  // is the career's (career/career.js schedule()). Work done moves the time on (morning → 午前 → 午後 → 夜); in the
  // evening the front door takes them home to sleep, and the next morning begins with its card.
  const cards = createCards();
  const ENTRANCE = { a: 655.0, c: 274.6, face: { a: 655.0, c: 266.0 } };            // inside the front doors, facing the lobby
  const windNow = () => (career.weather(prog()).kind === 'crosswind' ? XWIND : DAY_WIND);
  // the light and the sky for the time of day and the weather
  function applySlot() {
    if (!(parseFloat(params.get('t')) > 0)) { hours = career.hours; }        // (?t=H keeps the sky at H: the tests, the bench)
    const w = career.weather(prog()), slot = career.slot;
    const fog = w.kind === 'amFog' && (slot === 'morning' || slot === 'am') ? 0.85 : 0;
    const overcast = w.kind === 'storm' ? 1 : w.kind === 'pmStorm' && (slot === 'pm' || slot === 'evening') ? 0.95 : fog ? 0.7 : w.kind === 'crosswind' ? 0.35 : 0;
    const grey = w.kind === 'storm' ? 0.7 : w.kind === 'pmStorm' && (slot === 'pm' || slot === 'evening') ? 0.6 : 0;
    sky.setWeather({ overcast });
    const st = sky.setTime(hours);
    pipe.setHaze({ sunDir: st.dir, el: st.el, fog, grey });
    buildings.setNight(st.lightsOn); academy.setNight(st.lightsOn);
    $('#time').value = String(hours);
    layoutPeople();
    if (!(fly && fly.active) && !talk) placeInstructor();
  }
  // the work of the day done (a talk's hook 'done'): recorded, the time moved on
  function workDone(arg) {
    const k = lessonKind, slot = career.slot;
    const next = () => { if (slot === 'morning') career.advance('am'); else if (slot === 'am') career.advance('pm'); else if (slot === 'pm') career.advance('evening'); };
    if (arg === 'ceremony') { career.done('ceremony', 'welcome'); afterTalk.push(() => { career.advance('am'); applySlot(); toast('運航管理の佐伯さんが、訓練所を案内してくれます（ロビーの北、運航管理）', 5200); }); }
    else if (arg === 'tour') { career.done('tour', 'tour'); afterTalk.push(() => { career.advance('pm'); applySlot(); toast('午後：ブリーフィング室 1 で、担当の早瀬 教官と顔合わせです', 5200); }); }
    else if (arg === 'meet') { career.done('brief', 'meet'); career.finishPrologue(); afterTalk.push(() => { career.advance('evening'); applySlot(); toast('夕方です。ラウンジで同期と話してみましょう。今日を終えるときは、正面入口から寮へ', 6000); }); }
    else if (arg === 'class' && k) { career.done('class', String(k.id)); career.tire(6); afterTalk.push(() => { next(); applySlot(); toast('午後：訓練装置室（FTD）で訓練装置の課目です', 4200); }); }
    else if ((arg === 'pass' || arg === 'fail') && k && k.kind === 'ftd') {
      career.done('ftd', k.id); career.tire(6);
      if (arg === 'pass') groundPass(k.id, k.n ? cx.quiz.pct : 100);
      afterTalk.push(() => { next(); applySlot(); toast(arg === 'pass' ? `${k.id} 合格。${career.slot === 'evening' ? '今日の予定は終わりです' : ''}` : 'もう一度、別の日に受けられます', 4200); });
    } else if ((arg === 'pass' || arg === 'fail') && k && k.kind === 'exam') {
      career.exam(k.id, cx.quiz.pct);
      afterTalk.push(() => { next(); applySlot(); });
    } else if (arg === 'study') { career.done('study', grounded() ? 'imsafe' : 'weather'); career.tire(4); afterTalk.push(() => { next(); applySlot(); }); }
  }
  // a training device lesson passed: into FLIGHT LAB's record (school.js's shape, as FLIGHT LAB's own ground pages write it)
  function groundPass(id, pct) {
    const p = prog(), r = p.lessons[id] || { tries: 0, best: '', pass: false, levels: [] };
    r.tries++; r.pass = true; const g = pct >= 100 ? 'S' : pct >= 90 ? 'A' : 'B';
    if (!r.best || 'SAB'.indexOf(g) < 'SAB'.indexOf(r.best)) r.best = g;
    p.lessons[id] = r; FL.school.saveProgress(fly.flight.store, p);
  }
  // the go / no-go given: a morning of fog waits for the afternoon
  function afterDecision() {
    const w = weatherNow();
    if (!w.fly.am && w.fly.pm && (career.slot === 'morning' || career.slot === 'am')) {
      cards.show({ kicker: SLOT_NAMES.pm, title: '霧が晴れてきました', sub: dateText(career.day), ms: 1600, onDark: () => { career.advance('pm'); applySlot(); newDay(); } });
    } else if (!w.fly.am && !w.fly.pm) toast('今日は飛びません。早瀬 教官と、地上で復習しましょう', 4600);
    buildInstructorTalk();
  }
  // the talk on sitting down: today's flight when it can be flown now, else why not
  function boardTalk() {
    refreshCtx();
    const it = flightItem(), plan = planOf(it);
    if (career.chapter !== 'ch2') return careerBoardDialogs(FL, { reason: 'none' });
    let reason = null;
    if (!it || flownToday()) reason = it ? 'done' : 'none';
    else if (!career.decidedToday()) reason = 'weather';
    else if (grounded()) reason = 'tired';
    else if (it.kind === 'checkride') reason = talkState.flags.c1_briefed ? null : 'brief';
    else if (!talkState.flags.briefed_today) reason = 'brief';
    if (it && it.kind === 'checkride' && !reason) return careerBoardDialogs(FL, { lessons: plan.lessons, checkride: true, who: PEOPLE.chief.title, color: PEOPLE.chief.color });
    return careerBoardDialogs(FL, { lessons: plan.lessons, ready: !reason, reason: reason || 'none' });
  }
  // out of the aircraft after a flying day: what was flown counts (FLIGHT LAB's record already has the lessons)
  function dayOver(d) {
    const it = flightItem();
    if (!d || d.phase !== 'done' || !it || career.chapter !== 'ch2') return;
    career.done(it.kind, it.id); career.tire(15);
    talkState.flags.briefed_today = false;
    if (it.kind === 'checkride') { talkState.flags.c1_briefed = false; toast(passedAt(prog(), 'c1') ? 'ソロ前の審査、合格です。ソロの許可は早瀬 教官から' : '審査は今回は不合格。もう一度、別の日に受けられます', 6000); }
    if (it.kind === 'solo') return;                          // (the celebration moves the time on)
    if (career.slot === 'morning' || career.slot === 'am') career.advance('pm'); else career.advance('evening');
    afterTalkOrNow(() => { applySlot(); buildInstructorTalk(); });
  }
  const afterTalkOrNow = (f) => { if (talk) afterTalk.push(f); else setTimeout(f, 0); };
  // the first solo landed: its line in the logbook (solo time, the instructor's endorsement); they wait by the aircraft
  function soloLanded(sum) {
    logbook.add(entryFrom(sum, { remarks: 'ファーストソロ。場周経路 3 回、いずれも停止まで着陸。', date: dateOf(career.day).iso, dayN: career.day }));
    career.done('solo', 'solo'); career.tire(15);
    celebrate = true; talkState.flags.briefed_today = false;
    placeInstructor('apron'); layoutPeople();
  }
  function showLogbookNow(fresh = -1) {
    input.exitLock();
    dayHud.showLogbook(logbook.entries, logbook.totals(), { fresh, onClose: () => { if ((mode === 'walk' || mode === 'fly') && !talk && !(fly && (fly.talking || fly.debrief)) && !tablet.isOpen) input.requestLock(); } });
  }
  // a new day (or the game's start): the card, the cadet at the front door, everyone in place
  function startDay({ card = true, place = true } = {}) {
    const st = career.state, ch = CHAPTERS[st.chapter];
    const setUp = () => {
      celebrate = false;
      applySlot();
      newDay(); buildInstructorTalk(); placeInstructor(); layoutPeople();
      if (place) placeWalker(ENTRANCE.a, ENTRANCE.c, ENTRANCE.face);
    };
    if (!card) { setUp(); return Promise.resolve(); }
    return cards.show({ kicker: ch.title, title: dateText(st.day), sub: `${SLOT_NAMES[st.slot]}　${career.weather(prog()).ja}`, ms: 1700, onDark: setUp }).then(() => greet());
  }
  // a word for the start of a day
  function greet() {
    const st = career.state, sch = planToday();
    if (st.chapter === 'prologue') toast('入社の日です。ロビーで、主任教官の話が始まります', 5200);
    else if (sch.some(x => x.kind === 'off')) toast('今日は休日です。ラウンジで休むのも、自習するのもいい。正面入口から寮に帰れば、明日になります', 6000);
    else toast(`今日の予定：${sch.map(x => `${SLOT_NAMES[x.slot]} ${x.title}`).join('／')}（Tab でタブレット）`, 6000);
  }
  // the front door: home to the dorm (the evening, or a day off) — early, or after some study (it tires)
  function goHome() {
    const st = career.state, off = planToday().some(x => x.kind === 'off');
    if (st.slot !== 'evening' && !off) { toast('まだ今日の予定が残っています（Tab でタブレット）', 3000); return 'closed'; }
    homeOpen = true;
    interactor.showCard('寮へ帰る', '今日の訓練はここまで。寮に帰って休みます。', [{ k: 1, text: 'すぐに寝る', act: 'early' }, { k: 2, text: '少し自習してから寝る（疲れが残る）', act: 'late' }, { k: 3, text: 'やっぱり残る', act: 'stay' }]);
    return 'examined';
  }
  function homeChoose(k) {
    if (!homeOpen) return false;
    homeOpen = false; interactor.closeCard();
    if (k === 2) return true;
    sleepNow({ late: k === 1 });
    return true;
  }
  function sleepNow({ late = false } = {}) {
    const was = career.chapter;
    career.sleep({ late });
    // the day's own flags go with the day
    for (const f of ['briefed_today', 'brief_checked', 'c1_briefed']) delete talkState.flags[f];
    saved.save(talkState);
    career.advanceChapter(prog(), trustI());
    if (career.chapter !== was) toast(`${CHAPTERS[career.chapter].title}`, 4000);
    return startDay({ card: true, place: true });
  }
  interactor.add({ id: 'home', frame: [ENTRANCE.c + 1.6, 1.3, -ENTRANCE.a], radius: 0.9, prompt: () => (career.slot === 'evening' || planToday().some(x => x.kind === 'off') ? '寮へ帰る（今日を終える）' : '正面入口'), use: goHome });
  $('#card .card-choices').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && homeOpen) homeChoose(+b.dataset.k); });

  // the day's boards: what the career has today
  function boardCard(t) {
    const id = t.id.replace(/^ex:/, ''); if (!['schedule', 'metar', 'status-board', 'wb-brief-1'].includes(id)) return null;
    const st = career.state, p = prog(), w = career.weather(p), sch = planToday(), it = flightItem();
    const date = dateText(st.day), plan = it ? planOf(it) : null;
    const flights = sch.filter(x => FLY_KINDS.includes(x.kind)).map(x => `${x.slot === 'pm' ? '14:00' : '09:30'}  N738SY  PA-28-181  ${x.kind === 'solo' ? 'ファーストソロ（訓練生のみ）' : x.kind === 'checkride' ? '審査 c1（主任教官）' : `${x.id}（早瀬 教官）`}`);
    if (id === 'metar') return { title: `気象（${date}・KLAB は架空の飛行場）`, text: `METAR ${w.metar.am}\n午後の見込み ${w.metar.pm}\n${w.taf}\n\n今日の天気：${w.ja}。ソロ前の訓練生の基準：雷雨なし・視程 5 SM 以上・雲高 3,000 ft 以上・横風 10 kt 以下。` };
    if (id === 'schedule' || id === 'status-board') {
      const rows = [...flights, '10:00  N512SY  PA-28-181  訓練（同期）', '13:30  N806SY  PA-44-180  双発（上級）'];
      return { title: id === 'schedule' ? `本日の割り当て（運航管理・${date}）` : `本日のフライト（LAB 飛行場・${date}）`, text: (sch.some(x => x.kind === 'off') ? '本日は訓練休み\n' : '') + rows.join('\n') + (w.fly.am && w.fly.pm ? '' : `\n※ ${w.ja}：${w.why}`) };
    }
    if (!plan || st.chapter !== 'ch2') return { title: 'ホワイトボード', text: st.chapter === 'ch1' ? '座学の期間：午前はブリーフィング室 2 で授業、午後は訓練装置室。\nわからないことは、早瀬 教官に。' : '入社おめでとう。\n翔洋航空 フライトアカデミー' };
    const main = FL.school.lesson(plan.main), titles = plan.lessons.map(x => `${x} ${FL.school.lesson(x).title}`).join(' → ');
    return { title: `本日：${plan.main} ${main.title}`, text: `目的：${main.goal}\n今日の流れ：外部点検 → エンジン始動 → 交信 → タキシー → ランナップ → ${titles} → 駐機・講評\n基準：${main.std}` };
  }
  // the tablet (Tab): what it shows, what it does
  const BANKS = FL.quiz.BANKS.filter(b => !['q_me', 'q_ifr', 'q_nav', 'q_crm'].includes(b.id));
  const tablet = createTablet({
    model: () => {
      refreshCtx();
      const st = career.state, p = prog(), sch = planToday(), w = career.weather(p), order = ['morning', 'am', 'pm', 'evening'];
      const state = (x) => (career.doneToday(x.kind, x.id) || (x.kind === 'class' && career.doneToday('class', x.id)) ? 'done' : order.indexOf(x.slot) < order.indexOf(st.slot) ? 'missed' : x.slot === st.slot ? 'now' : 'later');
      return {
        date: dateText(st.day), chapterTitle: CHAPTERS[st.chapter].title, slotName: SLOT_NAMES[st.slot],
        plan: sch.filter(x => x.kind !== 'off').map(x => ({ ...x, slotName: SLOT_NAMES[x.slot], state: state(x) })),
        weather: { ja: w.ja, metarAm: w.metar.am, metarPm: w.metar.pm, taf: w.taf, flyAm: w.fly.am, flyPm: w.fly.pm },
        fatigue: st.fatigue, tired: career.tired(), gate: career.gate(p, trustI()), solo: !!st.solo,
        ground: GROUND.map(id => ({ id, title: FTD_TITLES[id], pass: groundPassed(p, id) })),
        classes: { done: CLASSES.filter((_, i) => career.isDone('class', String(i))).length, total: CLASSES.length },
        exams: Object.entries(EXAMS).map(([id, e]) => ({ title: e.title, ...(st.exams[id] || { best: 0, pass: false, tries: 0 }) })),
        lessons: [...CH2, 'c1'].map(id => ({ id, title: FL.school.lesson(id).title, best: p.lessons[id] ? p.lessons[id].best : '', pass: passedAt(p, id) })),
        trust: [['instructor', INSTRUCTOR.title_ja], ['chief', PEOPLE.chief.title], ['dispatcher', PEOPLE.dispatcher.title], ['mechanic', PEOPLE.mechanic.title]].map(([k, n]) => ({ name: n, v: Math.round(trustOf(talkState, k)) })),
        book: book.chapters.map(c => ({ id: c.id, n: c.n, title: c.title, sections: c.sections.map(x => ({ id: x.id, title: x.title })) })),
        banks: BANKS.map(b => ({ id: b.id, title: b.title, n: b.qs.length })),
        evening: st.slot === 'evening', canWait: st.slot !== 'evening' && !sch.some(x => x.slot === st.slot && state(x) === 'now'),
      };
    },
    act: {
      logbook: () => showLogbookNow(-1),
      read: (id) => { const sec = book.section(id); if (sec) dui.showBook({ title: sec.title, chapter: `第 ${sec.chapter.n} 章　${sec.chapter.title}`, html: sec.html }); },
      practice: (bankId) => practice(bankId),
      exportSave: () => exportArchive({ career: career.state, talk: talkState, logbook: logbook.entries, progress: prog(), records: FL.school.loadRecords(fly.flight.store) }),
      importSave: (text) => {
        try {
          const a = importArchive(text, FL);
          career.load(a.career);
          for (const k of Object.keys(talkState)) delete talkState[k];
          Object.assign(talkState, a.talk); saved.save(talkState);
          logbook.replace(a.logbook);
          FL.school.saveProgress(fly.flight.store, a.progress); FL.school.saveRecords(fly.flight.store, a.records);
          tablet.close(); startDay({ card: true, place: true });
          return '読み込みました。';
        } catch (e) { return `読み込めませんでした：${e.message}`; }
      },
      reset: () => resetProgress(),
      wait: () => { if (career.advance()) { cards.show({ kicker: SLOT_NAMES[career.slot], title: dateText(career.day), sub: '', ms: 900, onDark: () => applySlot() }); } },
    },
    onClose: () => { if (mode === 'walk' && !talk && !menu.isOpen) input.requestLock(); },
  });
  // a practice test (the tablet): ten questions from one bank, said by the tablet itself (not scored)
  function practice(bankId) {
    const b = FL.quiz.BANKS.find(x => x.id === bankId); if (!b) return;
    const E = { title: `練習：${b.title}`, banks: [bankId], n: 10, pass: 80 };
    const data = examDialogs(FL, 'written1', { seed: Date.now() % 100000, speaker: 'lecturer', exam: E });
    data.speakers = { ...data.speakers, lecturer: { name_ja: 'タブレット（練習問題）', color: '#8fd3ff' } };
    talk = { yaw: walker.state.yaw, pitch: walker.state.pitch }; talkWho = 'tablet'; talkActor = null;
    talkRun = startLesson('practice', bankId, data);
    document.body.classList.add('talking'); input.exitLock();
    talkRun.start('exam');
  }

  // the walk-around card's choices with the mouse (when it is free)
  $('#card .card-choices').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) walkChoose(+b.dataset.k); });

  // ---------------------------------------------------------------- viewpoints (the visit camera)
  const V = (a, c, up) => new THREE.Vector3(...L.rwyToLocal(a, c, up));
  const labA = FL.avionics.wpt('LABEA');
  const labAL = labA ? new THREE.Vector3(...L.toLocal(labA.n, labA.e)) : V(600, 0, 0);
  const VIEWS = [
    { id: 'apron', label: '駐機場（人の目線）', pos: V(598, 146, 1.65), look: V(634, 205, 1.2) },
    { id: 'rwy', label: '滑走路 36 の端', pos: V(-28, -3, 1.65), look: V(700, 0, 0) },
    { id: 'academy', label: 'アカデミーの前', pos: V(655, 222, 1.65), look: V(655, 250, 4.5) },
    { id: 'tower', label: '管制塔から', pos: V(716, 258, 19.2), look: V(520, 40, 0) },
    { id: 'final', label: 'ファイナル 2 km', pos: V(-2000, 0, 2000 * Math.tan(3 * Math.PI / 180) + 2), look: V(320, 0, 0) },
    { id: 'air', label: '上空から', pos: V(380, -520, 360), look: V(620, 170, 0) },
    { id: 'area', label: '訓練空域 LAB-A 上空', pos: labAL.clone().add(new THREE.Vector3(-1400, 900, 1600)), look: labAL.clone().add(new THREE.Vector3(0, 60, 0)) },
    { id: 'brief', label: 'ブリーフィング室 1', pos: V(645.0, 260.0, 1.65), look: V(634.0, 252.0, 1.2) },
    { id: 'lobby', label: 'ロビー', pos: V(662.5, 275.5, 1.65), look: V(650.0, 252.0, 2.4) },
    { id: 'dispatch', label: '運航管理', pos: V(665.5, 249.8, 1.65), look: V(675.0, 257.0, 1.3) },
  ];
  let viewIdx = 0;
  const outOfAircraft = () => { if (fly && fly.active) fly.leave({ instant: true, then: 'spectator' }); };
  const setView = (i) => { viewIdx = i; outOfAircraft(); setMode('spectator'); const v = VIEWS[i]; spectator.setPose(v.pos, v.look); renderChips(); };

  // ---------------------------------------------------------------- modes, the menu, the HUD
  let mode = 'walk', started = false, lostAt = -1e9;
  function setMode(m) {
    if (m === mode) return;
    // leaving the aircraft goes through fly-mode (the fade, the instructor back to his room, the aircraft to its stand)
    if (mode === 'fly' && fly && fly.active) { fly.leave({ then: m }); return; }
    mode = m;
    if (talk && talkRun) talkRun.stop();
    if (m === 'spectator') spectator.fromCamera();
    else if (m === 'walk') { walker.apply(0); interactor.closeCard(); }
    else interactor.closeCard();
    hud.prompt(null);
    for (const k of ['walk', 'spectator', 'fly']) document.body.classList.toggle('mode-' + k, m === k);
    $('#where').classList.remove('show');
    lastPlace = '';
  }
  document.body.classList.add('mode-walk');
  const menu = createMenu({
    root: document.body, settings, presets: ORDER.map(id => ({ id, label: PRESETS[id].label })), version: buildInfo,
    onResume: () => { input.enabled = true; if (!talk && !(fly && (fly.talking || fly.debrief))) input.requestLock(); audio.ui('close'); },
    onQuality: (id) => setQuality(id), onMode: (m) => { if (!(fly && fly.fading)) setMode(m); }, getMode: () => mode, getPreset: () => preset.id,
    onResetProgress: () => resetProgress(),
    onLogbook: () => { input.enabled = true; input.exitLock(); dayHud.showLogbook(logbook.entries, logbook.totals(), { onClose: () => { if ((mode === 'walk' || mode === 'fly') && !talk && !(fly && (fly.talking || fly.debrief))) input.requestLock(); } }); },
  });
  function openMenu(tab) { if (menu.isOpen || (fly && fly.fading)) return; interactor.closeCard(); input.enabled = false; input.exitLock(); menu.open(tab); audio.ui('open'); }
  input.onLock((on, bySelf) => {
    document.body.classList.toggle('locked', on);
    if (!on) lostAt = performance.now();
    if (!on && !bySelf) {
      // Esc while reading a card (the browser takes that Esc to free the mouse): just close the card
      if (interactor.cardOpen) { interactor.closeCard(); audio.ui('close'); }
      else if (talk || (fly && (fly.talking || fly.debrief)) || dayHud.logbookOpen || tablet.isOpen || cards.showing) { /* talking, the debrief, the logbook, the tablet: the mouse is free */ }
      else if (started && (mode === 'walk' || mode === 'fly') && !menu.isOpen) openMenu();
    }
  });
  renderer.domElement.addEventListener('click', () => {
    audio.unlock();
    if (talk || (fly && (fly.talking || fly.debrief)) || dayHud.logbookOpen || tablet.isOpen) return;   // the dialogue UI (or the debrief, the logbook, the tablet) takes the clicks
    if (started && !menu.isOpen) input.requestLock();
  });
  addEventListener('keydown', (e) => {
    if (!started || input.typing()) return;
    if (e.code === 'Escape') {
      if (menu.isOpen) menu.close(true);
      else if (interactor.cardOpen) interactor.closeCard();
      else if (performance.now() - lostAt > 400) openMenu();
      return;
    }
    if (menu.isOpen) return;
    if (dayHud.logbookOpen || tablet.isOpen || cards.showing) return;
    if (mode === 'fly') { if (fly) fly.key(e); return; }       // F is the throttle there (perf: the menu's setting)
    if (mode === 'walk' && walkOpen && /^(Digit|Numpad)[1-4]$/.test(e.code)) { walkChoose(+e.code.slice(-1) - 1); return; }
    if (mode === 'walk' && homeOpen && /^(Digit|Numpad)[1-3]$/.test(e.code)) { homeChoose(+e.code.slice(-1) - 1); return; }
    if (e.code === 'Tab' && mode === 'walk' && !talk) {
      e.preventDefault();
      if (tablet.isOpen) tablet.close();
      else if (talkState.flags.has_tablet || career.chapter !== 'prologue') { interactor.closeCard(); input.exitLock(); tablet.open(); audio.ui('open'); }
      else toast('タブレットは、運航管理で受け取ります', 2600);
      return;
    }
    if (e.code === 'KeyF') settings.set('showPerf', !settings.get('showPerf'));
    if (mode !== 'spectator') return;
    if (/^Digit[0-9]$/.test(e.code)) { const k = +e.code.slice(5), i = k === 0 ? 9 : k - 1; if (VIEWS[i]) setView(i); }
    // the printed key ('[' / ']'), so it also works on a JIS keyboard; the US position as a fallback
    const back = e.key === '[' || (e.key !== ']' && e.code === 'BracketLeft'), fwd = e.key === ']' || (e.key !== '[' && e.code === 'BracketRight');
    if (back) { hours = Math.max(5.5, hours - 0.25); applyTime(); }
    if (fwd) { hours = Math.min(20, hours + 0.25); applyTime(); }
    if (e.code === 'KeyP') $('#panel').classList.toggle('hidden');
  });
  settings.onChange((k, v) => {
    if (k === 'volume') audio.setVolume(v);
    if (k === 'fov') { camera.fov = v; camera.updateProjectionMatrix(); }          // at once, in either mode
    if (k === 'showPerf') $('#perf').style.display = v ? '' : 'none';
    // the auto rudder, changed in the menu while flying: as U would (FLIGHT LAB's action, which also keeps the setting)
    if (k === 'autoRud' && fly && fly.active && fly.flight.s && !!fly.flight.s.opts.autoRud !== !!v) fly.flight.action('autoRud');
  });
  $('#perf').style.display = settings.get('showPerf') ? '' : 'none';

  const chips = $('#views');
  function renderChips() {
    chips.innerHTML = VIEWS.map((v, i) => `<button data-i="${i}" class="${i === viewIdx && mode === 'spectator' ? 'on' : ''}">${(i + 1) % 10} ${v.label}</button>`).join('');
    $('#quality').innerHTML = ORDER.map(k => `<button data-q="${k}" class="${k === preset.id ? 'on' : ''}">${PRESETS[k].label}</button>`).join('');
  }
  chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(+b.dataset.i); });
  $('#quality').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setQuality(b.dataset.q); });
  $('#time').addEventListener('input', (e) => { hours = parseFloat(e.target.value); applyTime(); });
  $('#panelHide').addEventListener('click', () => $('#panel').classList.toggle('hidden'));
  $('#benchBtn').addEventListener('click', () => runBench());
  // a panel control clicked with the mouse gives the keyboard back to the game (Space would click it again, a focused
  // slider would take the arrow keys); keyboard users keep the focus where they put it
  $('#panel').addEventListener('click', (e) => { if (e.detail > 0 && e.target.closest('button')) e.target.closest('button').blur(); });
  $('#time').addEventListener('pointerup', (e) => e.target.blur());
  function setQuality(id) {
    if (!PRESETS[id]) return;
    preset = PRESETS[id]; rememberPreset(id); settings.set('quality', id);
    pipe.setQuality(preset); sky.applyQuality(preset); veg.setNearRadius(preset.treeNear);
    setAnisotropy(Math.min(preset.aniso, renderer.capabilities.getMaxAnisotropy()));
    renderChips(); toast(`画質：${preset.label}`);
  }
  let toastT = 0;
  function toast(text, ms = 2200) { const t = $('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
  addEventListener('resize', () => pipe.resize());

  // where the player is (the label top left, shown for a few seconds when it changes)
  const OUTSIDE = { apron: '駐機場（エプロン）', walk: 'アカデミー前の歩道', lot: '駐車場', twy: '誘導路 — 立ち入りには許可が要ります', rwy: '滑走路 — 立ち入り禁止' };
  function placeAt(a, c) {
    if (academy.inside(a, c)) { const r = academy.roomOf(a, c); return { name: r ? r.name_ja : NAMES.academy.ja, sub: NAMES.academy.ja }; }
    for (const h of HANGARS) if (a > h.a0 && a < h.a1 && c > h.c0 && c < h.c1) return { name: h.name, sub: NAMES.field.ja };
    const k = L.cellAt(a, c)?.kind;
    return { name: OUTSIDE[k] || '飛行場の草地', sub: NAMES.field.ja };
  }
  let lastPlace = '', placeT = 0;
  function showPlace(dt, a, c) {
    const p = placeAt(a, c), key = p.name;
    if (key !== lastPlace) { lastPlace = key; $('#where').innerHTML = `${esc(p.name)}<small>${esc(p.sub)}</small>`; $('#where').classList.add('show'); placeT = 4.5; }
    if (placeT > 0 && (placeT -= dt) <= 0) $('#where').classList.remove('show');
  }

  // ---------------------------------------------------------------- the loop
  const dyn = makeDynRes(pipe, () => preset);
  const stats = { fps: 0, ms: 0, frames: 0, acc: 0 };
  let last = performance.now(), t0 = last, running = true, perfT = 0, adapt = 0, litK = 1, ambT = 0;
  const camWorld = new THREE.Vector3(), focus = new THREE.Vector3();
  // the game's state for one step (also used by the scripted walk, without drawing)
  let scripted = 0;              // > 0 while a script drives the walker (tests): it may run before the start
  function simulate(dt) {
    const live = started || scripted > 0;   // behind the start screen nothing moves, and no key does anything
    if (!live) input.takeLook();
    if (mode === 'walk') {
      if (talk) { input.takeLook(); if (talkWho !== 'tablet') faceTalker(dt); }
      else if (!menu.isOpen && live) {
        walker.update(dt);
        if ((input.pressed('KeyE') || input.pressed('Mouse0')) && performance.now() - talkEndedAt > 500) { const r = interactor.use(); if (r === 'closed') audio.ui('close'); }
      }
    } else if (mode === 'fly') fly.update(dt, { live, paused: menu.isOpen });
    else if (!menu.isOpen && live) spectator.update(dt);
    input.endFrame();
    camera.updateMatrixWorld();
    camera.getWorldPosition(camWorld);
    const [fx, fz] = toFrame(camWorld.x, camWorld.z), pa = -fz, pc = fx;
    academy.update(dt, mode === 'walk' ? walker.framePos : { x: fx, z: fz });
    if (mode === 'fly') { if (fly) fly.draw2D(dt); }
    if (mode === 'walk' && live && !talk) { interactor.update(camera); showPlace(dt, pa, pc); }
    // near today's aircraft: the walk-around's progress; the instructor leaves the room for it once the cadet has gone
    walkEl.hidden = !(mode === 'walk' && Math.hypot(pa - tg.a, pc - tg.c) < 14);
    if (insGoOut && mode === 'walk' && !(fly && fly.active) && academy.roomOf(pa, pc)?.id !== 'brief-1') { insGoOut = false; placeInstructor('apron'); }
    walkProps.update(performance.now() / 1000, windNow().kt);
    // the instructor looks at the player when they are near (or talking), and moves their mouth while their line shows
    if (!(fly && fly.active)) {                                // (in the aircraft fly-mode moves him)
      const near = insAt === 'room' ? Math.hypot(pa - INS.a, pc - INS.c) < 7 && academy.roomOf(pa, pc)?.id === 'brief-1' : Math.hypot(pa - APRON.a, pc - APRON.c) < 9;
      // (far from the eye he is not drawn, as the cast: npc/cast.js)
      if (insAt !== 'away') { const P0 = insAt === 'apron' ? APRON : INS; instructor.root.visible = Math.hypot(pa - P0.a, pc - P0.c) < CAST_FAR || talkWho === 'instructor'; }
      const v = talk ? talkRunner().view() : null;
      instructor.update(dt, { lookAt: (talk && talkWho === 'instructor') || near ? camWorld : null, talking: !!(v && v.speaker === 'instructor' && dui.typing) });
      cast.update(dt, camWorld, { a: pa, c: pc }, talk ? talkWho : null, !!(v && v.speaker === talkWho && dui.typing));
    }
    // inside: the eye adapts (exposure), the ceiling lights near the player light the room, the ambience changes
    const k = indoorAt(ACADEMY, pa, pc, camWorld.y - G);
    adapt += (Math.min(1, k / 0.85) - adapt) * (1 - Math.exp(-dt / 0.7));
    const room = academy.inside(pa, pc) && camWorld.y - G < ACADEMY.slab ? academy.roomOf(pa, pc) : null;
    litK += ((room ? 1 : 0) - litK) * (1 - Math.exp(-dt / 0.7));          // the lights' share of the eye's adaptation
    pipe.setIndoor(adapt, litK);
    fill.intensity = litK * (0.3 + 0.5 * (sky.state.lightsOn || 0));       // by day the windows already do much of it
    pool.update(dt, room ? clusters.get(room.id) : null, 7 + 4 * (sky.state.lightsOn || 0));
    if ((ambT -= dt) <= 0) { ambT = 0.25; const up = mode === 'fly' && fly ? fly.altitude() : 0; audio.setAmbience({ indoor: mode === 'fly' && fly && fly.view === 'cockpit' ? 0.6 : k > 0 ? Math.min(1, k * 1.15) : 0, wind: 0.5, airborne: up > 30 }); }
    audio.update(dt);
    return { a: pa, c: pc };
  }
  function step(now) {
    const dtMs = Math.min(now - last, 250); last = now;
    const dt = dtMs / 1000, t = (now - t0) / 1000;
    // resolution changes happen before drawing: resizing the canvas after drawing would show a black frame
    dyn.tick(dtMs);
    simulate(Math.min(dt, 0.1));
    // the shadow follows a point a little ahead of the camera, on the ground
    if (mode === 'fly' && fly && fly.active) fly.shadowFocus(focus);               // round the aircraft (its cockpit)
    else focus.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize().multiplyScalar(Math.min(preset.shadowHalf * 0.5, 40)).add(camWorld).setY(G);
    sky.update(camera, t, focus);
    ground.update(t);
    const w = mode === 'fly' && fly ? fly.wind() : null;
    airfield.update(t, { cameraWorld: camWorld, windFromDeg: w ? w.fromDeg : windNow().fromDeg, windKt: w ? w.kt : windNow().kt, lightsOn: sky.state.lightsOn });
    veg.update(t, camWorld);
    crowd.update();
    pipe.render();
    stats.frames++; stats.acc += dtMs;
    if ((perfT += dtMs) > 400) {
      stats.fps = stats.frames * 1000 / stats.acc; stats.ms = stats.acc / stats.frames; stats.frames = 0; stats.acc = 0; perfT = 0;
      if (settings.get('showPerf') || mode === 'spectator') drawPerf();
    }
  }
  function drawPerf() {
    const i = renderer.info, s = pipe.sceneInfo, bad = stats.fps < 50;
    $('#perf').innerHTML = [
      `<span class="${bad ? 'bad' : 'ok'}">${stats.fps.toFixed(0).padStart(3)} fps</span>  ${stats.ms.toFixed(1)} ms`,
      `画質   ${preset.label}  ×${pipe.dpr.toFixed(2)}`,
      `描画   ${s.calls} 回（全体 ${i.render.calls}）`,
      `三角形 ${(s.triangles / 1000).toFixed(0)}k（全体 ${(i.render.triangles / 1000).toFixed(0)}k）`,
      `GPU    ${gpu.replace(/ANGLE \(|\)$/g, '').slice(0, 28)}`,
    ].join('\n');
  }
  function loop(now) { if (running) step(now); requestAnimationFrame(loop); }

  // ---------------------------------------------------------------- bench: fixed viewpoints, fixed render scale
  let benching = null;           // one bench at a time: a second request gets the running one
  function runBench(frames = 90, warm = 20) {
    if (!benching) { $('#benchBtn').disabled = true; benching = bench(frames, warm).finally(() => { benching = null; $('#benchBtn').disabled = false; }); }
    return benching;
  }
  async function bench(frames, warm) {
    toast('計測しています…（そのまま）', 60000);
    const keepDyn = dyn.enabled, keepMode = mode; dyn.enabled = false; running = false;
    const out = [];
    const gl = renderer.getContext();
    for (let i = 0; i < VIEWS.length; i++) {
      setView(i);
      for (let k = 0; k < warm; k++) { step(performance.now()); await frame(); }
      const times = [];
      for (let k = 0; k < frames; k++) {
        const a = performance.now(); step(a); gl.finish(); times.push(performance.now() - a); await frame();
      }
      times.sort((x, y) => x - y);
      const avg = times.reduce((s, x) => s + x, 0) / times.length;
      out.push({ view: VIEWS[i].id, label: VIEWS[i].label, avgMs: +avg.toFixed(2), p95Ms: +times[Math.floor(times.length * 0.95)].toFixed(2), calls: pipe.sceneInfo.calls, callsAll: renderer.info.render.calls, triangles: pipe.sceneInfo.triangles });
    }
    dyn.enabled = keepDyn; running = true; last = performance.now();
    if (keepMode === 'walk' || keepMode === 'fly') setMode('walk');
    window.__cadet.benchResult = { preset: preset.id, dpr: pipe.dpr, gpu, views: out };
    console.table(out);
    toast(out.map(o => `${o.label}：${o.avgMs} ms（95% ${o.p95Ms}）描画 ${o.calls}・三角形 ${(o.triangles / 1000).toFixed(0)}k`).join('\n'), 12000);
    return window.__cadet.benchResult;
  }

  // ---------------------------------------------------------------- a scripted walk (tests, and a demo)
  // Walks through points in the runway frame ({ a, c }) with the real walker, collisions and doors, at a fixed step and
  // without drawing. A closed door in the way is opened the way a player would: look at it, press E.
  const doorTargets = interactor.list().filter(t => t.door);
  function lookAtFrame(a, c, y) { const [x, , z] = L.rwyToLocal(a, c); walker.lookAt(x, G + y, z); }
  function useDoorNear() {
    const p = walker.framePos;
    const cand = doorTargets.filter(t => Math.abs(t.door.target) < 0.01 && Math.hypot(t.frame[0] - p.x, t.frame[2] - p.z) < 2.4)
      .sort((u, w) => Math.hypot(u.frame[0] - p.x, u.frame[2] - p.z) - Math.hypot(w.frame[0] - p.x, w.frame[2] - p.z))[0];
    if (!cand) return null;
    lookAtFrame(-cand.frame[2], cand.frame[0], cand.frame[1]);
    camera.updateMatrixWorld(); interactor.update(camera);
    if (interactor.current !== cand) return null;
    return { door: cand.door.id, result: interactor.use() };
  }
  function walkRoute(points, opts = {}) { scripted++; try { return walkRouteNow(points, opts); } finally { scripted--; } }
  function walkRouteNow(points, { dt = 1 / 60, maxT = 300, run = false, openDoors = true } = {}) {
    const keepMode = mode; setMode('walk');
    const log = [], doors = [];
    let t = 0, i = 0, stuck = 0, tries = 0;
    while (i < points.length && t < maxT) {
      const p = points[i], fp = walker.framePos, d = Math.hypot(p.a - fp.a, p.c - fp.c);
      if (d < 0.3) { log.push({ i, t: +t.toFixed(2), note: p.note || '' }); i++; stuck = 0; continue; }
      const [wx, , wz] = L.rwyToLocal(p.a, p.c);
      walker.state.yaw = Math.atan2(-(wx - walker.state.x), -(wz - walker.state.z)); walker.state.pitch = -0.1;
      walker.setAuto({ forward: Math.min(1, 0.25 + d / 0.8), run });
      simulate(dt); t += dt;
      const np = walker.framePos, moved = Math.hypot(np.a - fp.a, np.c - fp.c);
      stuck = moved < 0.15 * 1.45 * dt ? stuck + dt : 0;
      if (stuck > 0.4) {
        stuck = 0; if (++tries > 12) break;
        walker.setAuto({ forward: 0 });
        const u = openDoors ? useDoorNear() : null; if (u) doors.push({ ...u, t: +t.toFixed(2) });
        for (let k = 0; k < 50; k++) { simulate(dt); t += dt; }        // let it swing open
      }
    }
    walker.setAuto(null);
    if (keepMode !== 'walk') setMode(keepMode);
    const fp = walker.framePos;
    return { reached: i >= points.length, t: +t.toFixed(2), log, doors, at: { a: +fp.a.toFixed(2), c: +fp.c.toFixed(2) }, place: placeAt(fp.a, fp.c).name };
  }
  function placeWalker(a, c, toward) {
    const [x, , z] = L.rwyToLocal(a, c); walker.setPose(x, z, 0, 0);
    if (toward) lookAtFrame(toward.a, toward.c, 1.5);
  }

  // ---------------------------------------------------------------- start
  // the career's day: everyone in place, the cadet inside the front doors (?brief: in briefing room 1, as M1–M4 began)
  startDay({ card: false, place: true });
  if (params.has('brief')) placeWalker(spec.start.a, spec.start.c, spec.start.yawToward);
  const startView = parseInt(params.get('view'), 10);
  if (startView >= 1 && startView <= VIEWS.length) setView(startView - 1);
  renderChips();
  bootMsg('シェーダーを準備しています…', 0.9); await frame();
  // the textures drawn while building the world (floors, wood, boards) get the preset's anisotropy too
  setAnisotropy(Math.min(preset.aniso, renderer.capabilities.getMaxAnisotropy()));
  // compile every material twice: with the room lights on (inside) and off (outdoors), so walking in or out never
  // waits for a shader
  fly.prepareCompile(true);                                   // the flown aircraft and its cockpit too
  for (const on of [false, true]) {
    pool.setVisible(on);
    try { await pipe.compile(); } catch (e) { /* older drivers: compile on first draw */ }
  }
  pool.setVisible(false);
  fly.prepareCompile(false);
  step(performance.now());
  requestAnimationFrame(loop);
  window.__cadet = {
    ready: true, L, FL, VIEWS, spec, world, scene, camera, renderer, setView, setQuality, runBench, walkRoute, placeWalker,
    setPose: (p, look) => { outOfAircraft(); setMode('spectator'); spectator.setPose(new THREE.Vector3(...p), new THREE.Vector3(...look)); },
    setTime: (h) => { hours = h; applyTime(); }, stats: () => ({ fps: stats.fps, ...pipe.sceneInfo, all: renderer.info.render.calls, dpr: pipe.dpr, preset: preset.id, gpu, trees: veg.counts, colliders: world.count() }),
    pause: (v) => { running = !v; },
    mode: () => mode, setMode,
    player: () => { const p = walker.framePos; return { a: p.a, c: p.c, yaw: walker.state.yaw, place: placeAt(p.a, p.c).name }; },
    lookAt: (a, c, y = 1.2) => { setMode('walk'); lookAtFrame(a, c, y); camera.updateMatrixWorld(); interactor.update(camera); return interactor.current ? interactor.current.id : null; },
    use: () => interactor.use(), current: () => (interactor.current ? interactor.current.id : null),
    // talking: start, read the current line, go on, choose (by index or by a regular expression on the text)
    talk: () => startTalk(),
    dialog: () => { const v = talkRunner().view(); return v ? { ...v, typing: dui.typing, bookOpen: dui.bookOpen } : null; },
    dialogNext: () => { const r = talkRunner(); if (dui.typing) dui.reveal(); r.next(); afterStep(); return r.view(); },
    dialogChoose: (which) => {
      const r = talkRunner(), v = r.view(); if (!v) return null;
      const c = typeof which === 'number' ? v.choices[which] : v.choices.find(x => new RegExp(which).test(x.text));
      if (!c) return null;
      if (dui.typing) dui.reveal();
      r.choose(c.i); afterStep(); return r.view();
    },
    closeBook: () => dui.hideBook(), dialogReveal: () => dui.reveal(),
    talkState: () => JSON.parse(JSON.stringify(talkState)),
    savedState: () => saved.load(), resetProgress: () => resetProgress(),
    instructor: () => { const w = instructor.root.getWorldPosition(new THREE.Vector3()), [fx, fz] = toFrame(w.x, w.z); return { a: INS.a, c: INS.c, at: { a: -fz, c: fx }, gesture: instructor.gesturing, triangles: instructor.triangles }; },
    card: () => (interactor.cardOpen ? { title: $('#card .card-title').textContent, text: $('#card .card-body').textContent } : null),
    targets: () => interactor.list().map(t => ({ id: t.id, a: -t.frame[2], c: t.frame[0], y: t.frame[1] })),
    doors: () => academy.doors.doors.map(d => ({ id: d.id, kind: d.kind, angle: +d.angle.toFixed(3), open: +d.open.toFixed(3) })),
    simulate: (seconds, dt = 1 / 60) => { scripted++; try { for (let s = 0; s < seconds; s += dt) simulate(dt); } finally { scripted--; } },
    menu: { open: (tab) => openMenu(tab), close: () => menu.close(true), isOpen: () => menu.isOpen },
    // flying: board (instant: no fade), the state, a lesson run by a scripted pilot exactly as FLIGHT LAB's bot.mjs runs
    // it (pilot: makeBot(FL).fly, injected by the test), the view, a cockpit control by id, getting out
    fly: {
      board: (instant = true) => fly.board({ instant }), status: () => fly.status(), get flight() { return fly.flight; },
      runScripted: (pilot, maxSec = 900, hook) => { const L0 = fly.runScripted(pilot, maxSec, hook); return { ...fly.flight.status(), steps: Math.round(L0.t * 120) }; },
      lesson: (level = 'basic', lessonId) => fly.beginLesson(level, { instant: true, ...(lessonId ? { lessonId } : {}) }),
      view: (v) => fly.setView(v), act: (id, dir = 1, wheel = false) => fly.actOn(id, dir, wheel),
      look: (yawDeg, pitchDeg) => fly.look(yawDeg, pitchDeg), zoom: (on) => fly.setZoom(on),
      leave: () => fly.leave({ instant: true }), controls: () => fly.cockpit.controls.map(c => ({ id: c.id, label: c.label, kind: c.kind })),
      pose: () => { const r = fly.live.root; return { pos: r.position.toArray(), q: r.quaternion.toArray(), cam: camera.position.toArray(), fov: camera.fov }; },
      // the day (M4): its state, a key as the cadet presses it, the instructor's hands, a radio answer (the right one or not)
      day: () => (fly.status().day),
      key: (code, shift = false) => fly.key({ code, shiftKey: !!shift, repeat: false, preventDefault() {} }),
      assist: () => fly.dayMode.assist(), taxi: () => fly.dayMode.autoTaxi(), solo: () => fly.dayMode.solo, asking: () => fly.dayMode.asking, crew: () => fly.crewId,
      answer: (right = true) => { const d = fly.dayMode.day; if (!d) return null; const k = d.atc.rightIndex(); if (k < 0) return null; return d.atc.answer(right ? k : (k + 1) % 3); },
      lessonLevel: () => settings.get('lessonLevel'),
      // the radio's clock (a lesson run by a scripted pilot has no frames: its hook moves the radio on)
      radioTick: (dt) => { const d = fly.dayMode.day; if (d) d.atc.update(dt); },
    },
    // the walk-around (M4): where its places are (runway frame), a decision on the open card, the result so far
    walk: {
      targets: () => walkTargets.map(t => ({ id: t.id.slice(5), a: -t.frame[2], c: t.frame[0], y: t.frame[1] })),
      open: () => walkOpen, choose: (k) => walkChoose(k), choices: () => (walkOpen ? today.walk.inspect(walkOpen).choices.map(c => c.act) : null),
      summary: () => today.walk.summary(), planted: () => today.walk.planted.slice(), props: () => today.walk.props(),
      instructor: () => ({ at: insAt, a: APRON.a, c: APRON.c }),
      // where a cadet stands to look at a place (body frame: in front of the wing, behind it at a wheel, beside the nose,
      // behind the tail, on the wing walk at the door)
      stand: (id) => {
        const p = POINTS.find(x => x.id === id), [x, , z] = p.at, sd = Math.sign(x) || 1;
        const b = p.group === 'cabin' ? [1.6, 0, -0.1] : p.group === 'tail' ? [1.4, 0, 4.4] : p.group === 'nose' ? [1.25, 0, -3.3]
          : Math.abs(x) < 2 ? [x + sd * 0.3, 0, 1.7] : z > 0.3 ? [x, 0, z + 1.4] : [x, 0, z - 1.6];
        const f = bodyToFrame([b[0], -1.4, b[2]]);
        return { a: -f[2], c: f[0] };
      },
    },
    logbook: () => ({ entries: logbook.entries, totals: logbook.totals(), open: dayHud.logbookOpen, close: () => dayHud.hideLogbook() }),
    // the career (M5): its state, today's plan and weather, the talks' context; a jump to any point (tests); the time
    // moved on, the night; talking to anyone; the lesson or test running (its questions, to answer them); the tablet
    career: {
      state: () => JSON.parse(JSON.stringify(career.state)), schedule: () => planToday(), weather: () => career.weather(prog()), ctx: () => JSON.parse(JSON.stringify(refreshCtx())),
      progress: () => prog(), trust: (who = 'instructor') => trustOf(talkState, who), flags: () => ({ ...talkState.flags }),
      set: (o = {}) => {
        const st = { ...career.state, ...o.state };
        career.load(st);
        if (o.progress) FL.school.saveProgress(fly.flight.store, o.progress);
        if (o.flags) Object.assign(talkState.flags, o.flags);
        if (o.trust) Object.assign(talkState.trust, o.trust);
        saved.save(talkState);
        return startDay({ card: false, place: o.place !== false });
      },
      advance: (slot) => { const r = career.advance(slot); applySlot(); return r; },
      sleep: (late = false) => sleepNow({ late }),
      talkTo: (id) => startTalk(id), where: (id) => (id === 'instructor' ? { at: insAt } : cast.where(id)),
      activity: () => (lessonKind ? { kind: lessonKind.kind, id: lessonKind.id, n: lessonKind.n, questions: (lessonRun && lessonQuestions) || [] } : null),
      home: () => goHome(), homeChoose: (k) => homeChoose(k),
      tablet: { open: (p) => tablet.open(p), close: () => tablet.close(), isOpen: () => tablet.isOpen, page: () => tablet.page },
      cards: () => cards.showing, celebrate: () => celebrate, reset: () => resetProgress(), gate: () => career.gate(prog(), trustI()),
      // (the screenshots: everyone by the aircraft as after the first solo)
      stageCelebrate: () => { celebrate = true; placeInstructor('apron'); layoutPeople(); },
      readiness: () => { const d = boardTalk(); return d.dialogs.board.nodes.today ? 'ready' : d.dialogs.board.nodes.c2 ? 'checkride' : d.dialogs.board.nodes.not.text; },
    },
    settings,
    // render n frames now and return the last as a PNG data URL (for tests: the drawing buffer is read in the same task)
    snapshot: (n = 1) => { for (let k = 0; k < n; k++) step(performance.now()); return renderer.domElement.toDataURL('image/png'); },
  };
  bootMsg(`準備ができました（${NAMES.field.ja}）`, 1);
  const go = $('#bootGo'); go.disabled = false;
  const start = () => {
    if (started) return; started = true; lastPlace = '';
    $('#boot').classList.add('fade'); $('#hud').hidden = false; renderer.domElement.focus(); setTimeout(() => $('#boot').remove(), 700);
    audio.unlock();
    if (mode === 'walk') {
      input.requestLock();
      const st = career.state;
      cards.show({ kicker: CHAPTERS[st.chapter].title, title: dateText(st.day), sub: `${SLOT_NAMES[st.slot]}　${career.weather(prog()).ja}`, ms: 1500 }).then(() => greet());
    }
  };
  go.addEventListener('click', start);
  if (params.has('auto') || params.has('bench')) start();
  if (params.has('bench')) setTimeout(() => runBench(), 800);
}

boot().catch(fail);
