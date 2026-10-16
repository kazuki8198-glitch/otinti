// CADET — main.js : start-up, walking (M1) and the free "visit" camera.
// Builds the world from FLIGHT LAB's data (the airfield, the ground, the lakes, the trees, parked aircraft), the
// academy (inside and out), the sky and the image pipeline. You start in briefing room 1 and walk: through the doors,
// the lobby and the airside doors out to today's aircraft on the apron; E (or a click) examines boards and models and
// opens doors; Esc pauses (settings, keys, the visit camera). ?view=N starts in the visit camera at viewpoint N;
// ?bench measures the frame time at the fixed viewpoints.
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

/* global __BUILD_INFO__ */
const $ = (s) => document.querySelector(s);
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const params = new URLSearchParams(location.search);
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
  const aircraftColliders = (ac, tag) => { for (const b of colliderBoxes(ac.root, toFrame, G)) world.add({ ...b, tag }); };
  for (const [i, id] of spots) {
    const s = STANDS[i]; if (!s) continue;
    const ac = parkedAircraft(FL, L, id, s.a, s.c - 0.4, hdgOut, { prop: 0.3 + i * 0.7 });
    scene.add(ac.root); parked.push(ac); aircraftColliders(ac, i === 19 ? 'aircraft:today' : 'aircraft');
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
  let hours = parseFloat(params.get('t')) || 9.6;
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
    prompt(text) {
      if (interactor && interactor.cardOpen) text = null;
      if (text === lastPrompt) return; lastPrompt = text;
      const el = $('#prompt'); if (text) el.innerHTML = `<kbd>E</kbd>${esc(text)}`; el.classList.toggle('show', !!text);
    },
    card(title, text) {
      const c = $('#card'); if (!title) { c.hidden = true; return; }
      c.querySelector('.card-title').textContent = title; c.querySelector('.card-body').textContent = text; c.hidden = false;
    },
  };
  interactor = createInteractor({ walker, world, L, hud });
  for (const t of academy.targets) interactor.add({ ...t, use: () => { interactor.showCard(t.title, t.text); audio.ui('examine'); return 'examined'; } });
  for (const t of academy.doors.targets()) {
    interactor.add({
      ...t, use: () => {
        const r = academy.doors.toggle(t.door, walker.framePos);
        if (r === 'locked') toast(`${t.door.label_ja || 'この扉'} — 鍵がかかっています`);
        return r;
      },
    });
  }
  // today's aircraft (stand 19): look it over (the walk-around inspection itself comes later)
  {
    const AR = FL.physics.AIRCRAFT.find(a => a.id === 'pa28'), v = AR.v, tg = spec.target;
    interactor.add({
      id: 'aircraft:today', frame: [tg.c, 1.0, -(tg.a + 0.9)], radius: 1.1, prompt: '今日の機体を見る',
      use: () => {
        // FLIGHT LAB's description, without its notes on real operators (the game's airline and school are fictional)
        const desc = AR.desc.split('。').filter(x => x && !/ANA|Acron|公開/.test(x)).join('。') + '。';
        interactor.showCard(`今日の機体：${AR.short}（N738SY・架空の登録記号）`, `${AR.name}\n${desc}\n\n`
          + `覚える速度（KIAS）：ローテーション ${v.rotate}・Vx ${v.x}・Vy ${v.y}・進入 ${v.appr}・Va ${v.va}・Vno ${v.no}・Vne ${v.ne}\n\n`
          + '飛ぶ前には必ず外部点検（プリフライト）をします。機体の周りを決まった順番で回り、燃料・オイル・舵の動き・タイヤを確かめます。');
        audio.ui('examine'); return 'examined';
      },
    });
  }

  // ---------------------------------------------------------------- the instructor, and talking
  // 早瀬 教官 (fictional) waits in briefing room 1 between the whiteboard and the screen, facing the room. E starts the
  // conversation: the mouse is freed for the choices, the view turns to the instructor, the walk stops. Flags and trust
  // are kept in localStorage ('cadet.save'). The instructor's hooks point at the board, nod, show a figure on the
  // screen and open the textbook.
  const book = gameBook(FL);
  const saved = createSave();
  const talkState = createDialogState(saved.load());
  const talkData = instructorDialogs(FL, { lessonId: 'a1' });
  const instructor = createActor();
  const INS = { a: 634.9, c: 256.7 };
  instructor.root.position.set(INS.c, 0, -INS.a); instructor.root.rotation.y = Math.PI;      // facing +a, into the room
  academy.group.add(instructor.root);
  world.add({ x0: INS.c - instructor.radius, x1: INS.c + instructor.radius, y0: 0, y1: 1.8, z0: -INS.a - instructor.radius, z1: -INS.a + instructor.radius, tag: 'npc:instructor' });
  const frameToWorld = (p, out = new THREE.Vector3()) => academy.group.localToWorld(out.set(p.x, p.y, p.z));
  let talk = null;                                            // { yaw, pitch } (the view to come back to) while talking
  let talkEndedAt = -Infinity;                                // the E or click that ended a talk does not start it again
  const runner = createRunner({ data: talkData, state: talkState, ctx: sampleCtx(FL), hooks: { onHook } });
  const dui = createDialogUI({
    root: document.body, settings,
    onNext: () => { runner.next(); afterStep(); },
    onChoose: (i) => { runner.choose(i); afterStep(); },
  });
  runner.onChange((view) => {
    // dui.show also speaks the line (settings: voice, volume); a line whose hook started a gesture (point, nod) keeps it
    if (view) { dui.show(view); if (view.speaker === 'instructor' && !instructor.gesturing && Math.random() < 0.25) instructor.gesture('explain'); }
    else endTalk();
    saved.save(talkState);
  });
  // the click (or key) that ended the conversation also takes the mouse back for walking
  function afterStep() { if (!runner.running && started && mode === 'walk' && !menu.isOpen) input.requestLock(); }
  function startTalk() {
    if (runner.running) return 'talking';
    interactor.closeCard(); hud.prompt(null);
    talk = { yaw: walker.state.yaw, pitch: walker.state.pitch };
    document.body.classList.add('talking');
    input.exitLock();
    audio.ui('open');
    runner.start('brief');
    return 'talk';
  }
  function endTalk() {
    if (!talk) return;
    talk = null; dui.hide(); document.body.classList.remove('talking');
    talkEndedAt = performance.now();
  }
  // the pause menu's "erase the record": the instructor meets you again for the first time
  function resetProgress() {
    if (runner.running) runner.stop();
    const fresh = createDialogState();
    for (const k of Object.keys(talkState)) delete talkState[k];
    Object.assign(talkState, fresh);
    saved.clear();
  }
  // the instructor's hooks
  function onHook(name, arg) {
    if (name === 'nod') instructor.gesture('nod');
    else if (name === 'look') instructor.gesture('explain');          // 'player': they already look at you while talking
    else if (name === 'point') {
      // the whiteboard (or the screen) behind them, or out of the window towards the apron
      const s = arg === 'apron' ? { x: 240, y: 1.4, z: -INS.a - 2 } : academy.surfaceAt('brief-1', arg === 'screen' ? 'wall_screen' : 'whiteboard');
      if (s) { instructor.pointAt(frameToWorld(s)); instructor.gesture('point'); }
    } else if (name === 'book') {
      const sec = book.section(arg);
      if (sec) dui.showBook({ title: sec.title, chapter: `第 ${sec.chapter.n} 章　${sec.chapter.title}`, html: sec.html });
    } else if (name === 'board') showFigure(arg);
  }
  // a textbook figure on the briefing room's screen (the figures are FLIGHT LAB's SVG, drawn for a dark background)
  function showFigure(secId) {
    const sec = book.section(secId); if (!sec || !sec.figure) return;
    const svg = sec.figure.replace(/^<svg(?![^>]*xmlns=)/, '<svg xmlns="http://www.w3.org/2000/svg"').replace(/^<svg /, '<svg width="1200" height="760" ');
    const img = new Image();
    img.onload = () => {
      academy.redraw('brief-1', 'wall_screen', (g, w, h) => {
        g.fillStyle = '#0b1422'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#e8f0fa'; g.font = `600 ${Math.round(h * 0.06)}px "Hiragino Sans", "Yu Gothic UI", "Meiryo", "Noto Sans CJK JP", sans-serif`;
        g.textBaseline = 'top'; g.fillText(sec.title, w * 0.04, h * 0.04, w * 0.92);
        const top = h * 0.14, bw = w * 0.92, bh = h * 0.82, k = Math.min(bw / img.width, bh / img.height);
        g.drawImage(img, (w - img.width * k) / 2, top + (bh - img.height * k) / 2, img.width * k, img.height * k);
      });
      const s = academy.surfaceAt('brief-1', 'wall_screen');
      if (s) { instructor.pointAt(frameToWorld(s)); instructor.gesture('point'); }
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  interactor.add({ id: 'npc:instructor', frame: [INS.c, 1.5, -INS.a], radius: 0.45, prompt: `${INSTRUCTOR.title_ja}と話す`, use: startTalk });
  // turn the view smoothly towards the instructor's face while talking
  const insHead = new THREE.Vector3();
  function faceInstructor(dt) {
    instructor.headWorld(insHead);
    const y0 = walker.state.yaw, p0 = walker.state.pitch;
    walker.lookAt(insHead.x, insHead.y - 0.05, insHead.z);
    const y1 = walker.state.yaw, p1 = walker.state.pitch, k = 1 - Math.exp(-dt / 0.18);
    let dy = y1 - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    walker.state.yaw = y0 + dy * k; walker.state.pitch = p0 + (p1 - p0) * k;
    walker.apply(dt);
  }

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
  const setView = (i) => { viewIdx = i; setMode('spectator'); const v = VIEWS[i]; spectator.setPose(v.pos, v.look); renderChips(); };

  // ---------------------------------------------------------------- modes, the menu, the HUD
  let mode = 'walk', started = false, lostAt = -1e9;
  function setMode(m) {
    if (m === mode) return;
    mode = m;
    if (runner.running) runner.stop();
    if (m === 'spectator') spectator.fromCamera();
    else { walker.apply(0); interactor.closeCard(); }
    hud.prompt(null);
    document.body.classList.toggle('mode-walk', m === 'walk'); document.body.classList.toggle('mode-spectator', m === 'spectator');
    $('#where').classList.remove('show');
    lastPlace = '';
  }
  document.body.classList.add('mode-walk');
  const menu = createMenu({
    root: document.body, settings, presets: ORDER.map(id => ({ id, label: PRESETS[id].label })), version: buildInfo,
    onResume: () => { input.enabled = true; if (!talk) input.requestLock(); audio.ui('close'); },
    onQuality: (id) => setQuality(id), onMode: (m) => setMode(m), getMode: () => mode, getPreset: () => preset.id,
    onResetProgress: () => resetProgress(),
  });
  function openMenu(tab) { if (menu.isOpen) return; interactor.closeCard(); input.enabled = false; input.exitLock(); menu.open(tab); audio.ui('open'); }
  input.onLock((on) => {
    document.body.classList.toggle('locked', on);
    if (!on) {
      lostAt = performance.now();
      // Esc while reading a card (the browser takes that Esc to free the mouse): just close the card
      if (interactor.cardOpen) { interactor.closeCard(); audio.ui('close'); }
      else if (talk) { /* talking: the mouse is free for the choices */ }
      else if (started && mode === 'walk' && !menu.isOpen) openMenu();
    }
  });
  renderer.domElement.addEventListener('click', () => {
    audio.unlock();
    if (talk) return;                                         // the dialogue UI takes clicks on the view while talking
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
      if (talk) { input.takeLook(); faceInstructor(dt); }
      else if (!menu.isOpen && live) {
        walker.update(dt);
        if ((input.pressed('KeyE') || input.pressed('Mouse0')) && performance.now() - talkEndedAt > 500) { const r = interactor.use(); if (r === 'closed') audio.ui('close'); }
      }
    } else if (!menu.isOpen && live) spectator.update(dt);
    input.endFrame();
    camera.updateMatrixWorld();
    camera.getWorldPosition(camWorld);
    const [fx, fz] = toFrame(camWorld.x, camWorld.z), pa = -fz, pc = fx;
    academy.update(dt, mode === 'walk' ? walker.framePos : { x: fx, z: fz });
    if (mode === 'walk' && live && !talk) { interactor.update(camera); showPlace(dt, pa, pc); }
    // the instructor looks at the player when they are near (or talking), and moves their mouth while their line shows
    {
      const near = Math.hypot(pa - INS.a, pc - INS.c) < 7 && academy.roomOf(pa, pc)?.id === 'brief-1';
      const v = talk ? runner.view() : null;
      instructor.update(dt, { lookAt: talk || near ? camWorld : null, talking: !!(v && v.speaker === 'instructor' && dui.typing) });
    }
    // inside: the eye adapts (exposure), the ceiling lights near the player light the room, the ambience changes
    const k = indoorAt(ACADEMY, pa, pc, camWorld.y - G);
    adapt += (Math.min(1, k / 0.85) - adapt) * (1 - Math.exp(-dt / 0.7));
    const room = academy.inside(pa, pc) && camWorld.y - G < ACADEMY.slab ? academy.roomOf(pa, pc) : null;
    litK += ((room ? 1 : 0) - litK) * (1 - Math.exp(-dt / 0.7));          // the lights' share of the eye's adaptation
    pipe.setIndoor(adapt, litK);
    fill.intensity = litK * (0.3 + 0.5 * (sky.state.lightsOn || 0));       // by day the windows already do much of it
    pool.update(dt, room ? clusters.get(room.id) : null, 7 + 4 * (sky.state.lightsOn || 0));
    if ((ambT -= dt) <= 0) { ambT = 0.25; audio.setAmbience({ indoor: k > 0 ? Math.min(1, k * 1.15) : 0, wind: 0.5 }); }
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
    focus.set(0, 0, -1).applyQuaternion(camera.quaternion).setY(0).normalize().multiplyScalar(Math.min(preset.shadowHalf * 0.5, 40)).add(camWorld).setY(G);
    sky.update(camera, t, focus);
    ground.update(t);
    airfield.update(t, { cameraWorld: camWorld, windFromDeg: 330, windKt: 8, lightsOn: sky.state.lightsOn });
    veg.update(t, camWorld);
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
    if (keepMode === 'walk') setMode('walk');
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
  placeWalker(spec.start.a, spec.start.c, spec.start.yawToward);
  const startView = parseInt(params.get('view'), 10);
  if (startView >= 1 && startView <= VIEWS.length) setView(startView - 1);
  renderChips();
  bootMsg('シェーダーを準備しています…', 0.9); await frame();
  // the textures drawn while building the world (floors, wood, boards) get the preset's anisotropy too
  setAnisotropy(Math.min(preset.aniso, renderer.capabilities.getMaxAnisotropy()));
  // compile every material twice: with the room lights on (inside) and off (outdoors), so walking in or out never
  // waits for a shader
  for (const on of [false, true]) {
    pool.setVisible(on);
    try { await pipe.compile(); } catch (e) { /* older drivers: compile on first draw */ }
  }
  pool.setVisible(false);
  step(performance.now());
  requestAnimationFrame(loop);
  window.__cadet = {
    ready: true, L, FL, VIEWS, spec, world, scene, camera, renderer, setView, setQuality, runBench, walkRoute, placeWalker,
    setPose: (p, look) => { setMode('spectator'); spectator.setPose(new THREE.Vector3(...p), new THREE.Vector3(...look)); },
    setTime: (h) => { hours = h; applyTime(); }, stats: () => ({ fps: stats.fps, ...pipe.sceneInfo, all: renderer.info.render.calls, dpr: pipe.dpr, preset: preset.id, gpu, trees: veg.counts, colliders: world.count() }),
    pause: (v) => { running = !v; },
    mode: () => mode, setMode,
    player: () => { const p = walker.framePos; return { a: p.a, c: p.c, yaw: walker.state.yaw, place: placeAt(p.a, p.c).name }; },
    lookAt: (a, c, y = 1.2) => { setMode('walk'); lookAtFrame(a, c, y); camera.updateMatrixWorld(); interactor.update(camera); return interactor.current ? interactor.current.id : null; },
    use: () => interactor.use(), current: () => (interactor.current ? interactor.current.id : null),
    // talking: start, read the current line, go on, choose (by index or by a regular expression on the text)
    talk: () => startTalk(),
    dialog: () => { const v = runner.view(); return v ? { ...v, typing: dui.typing, bookOpen: dui.bookOpen } : null; },
    dialogNext: () => { if (dui.typing) dui.reveal(); runner.next(); afterStep(); return runner.view(); },
    dialogChoose: (which) => {
      const v = runner.view(); if (!v) return null;
      const c = typeof which === 'number' ? v.choices[which] : v.choices.find(x => new RegExp(which).test(x.text));
      if (!c) return null;
      if (dui.typing) dui.reveal();
      runner.choose(c.i); afterStep(); return runner.view();
    },
    closeBook: () => dui.hideBook(),
    talkState: () => JSON.parse(JSON.stringify(talkState)),
    savedState: () => saved.load(), resetProgress: () => resetProgress(),
    instructor: () => ({ a: INS.a, c: INS.c, gesture: instructor.gesturing, triangles: instructor.triangles }),
    card: () => (interactor.cardOpen ? { title: $('#card .card-title').textContent, text: $('#card .card-body').textContent } : null),
    targets: () => interactor.list().map(t => ({ id: t.id, a: -t.frame[2], c: t.frame[0], y: t.frame[1] })),
    doors: () => academy.doors.doors.map(d => ({ id: d.id, kind: d.kind, angle: +d.angle.toFixed(3), open: +d.open.toFixed(3) })),
    simulate: (seconds, dt = 1 / 60) => { scripted++; try { for (let s = 0; s < seconds; s += dt) simulate(dt); } finally { scripted--; } },
    menu: { open: (tab) => openMenu(tab), close: () => menu.close(true), isOpen: () => menu.isOpen },
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
    if (mode === 'walk') { input.requestLock(); toast('ブリーフィング室 1 にいます。\n今日の機体（Archer）は駐機場で待っています', 5000); }
  };
  go.addEventListener('click', start);
  if (params.has('auto') || params.has('bench')) start();
  if (params.has('bench')) setTimeout(() => runBench(), 800);
}

boot().catch(fail);
