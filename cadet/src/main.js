// CADET — main.js : start-up and the M0 "visit" of LAB field.
// Builds the world from FLIGHT LAB's data (the airfield, the ground, the lakes, the trees, parked aircraft), the
// academy's buildings, the sky and the image pipeline; then lets you look around from a free camera, change the time
// of day and the graphics preset, and measure the frame time at fixed viewpoints (?bench).
import * as THREE from 'three';
import { makeLayout, NAMES } from './world/layout.js';
import { loadTextures, setAnisotropy } from './render/textures.js';
import { createPipeline } from './render/post.js';
import { createSky } from './render/sky.js';
import { buildGround } from './world/ground.js';
import { buildAirfield, STANDS } from './world/airfield.js';
import { buildBuildings } from './world/buildings.js';
import { buildVegetation } from './world/vegetation.js';
import { buildLandmarks } from './world/landmarks.js';
import { parkedAircraft } from './aircraft/exterior.js';
import { PRESETS, ORDER, gpuName, pickPreset, rememberPreset, makeDynRes } from './core/quality.js';
import { createSpectator } from './ui/spectator.js';

/* global __BUILD_INFO__ */
const $ = (s) => document.querySelector(s);
const frame = () => new Promise(r => requestAnimationFrame(() => r()));
const params = new URLSearchParams(location.search);

function bootMsg(text, k) { $('#bootMsg').textContent = text; if (k != null) $('#bootBar').style.width = `${Math.round(k * 100)}%`; }
function fail(e) {
  console.error(e);
  bootMsg('起動できませんでした：' + (e && e.message ? e.message : e) + '（Chrome の最近の版で、WebGL2 が使える必要があります）');
  $('#bootBar').style.background = '#ff8a7a';
}

async function boot() {
  $('#buildInfo').textContent = typeof __BUILD_INFO__ !== 'undefined' ? __BUILD_INFO__ : 'dev';
  const FL = globalThis.FL;
  const need = ['physics', 'avionics', 'school', 'syllabus', 'acmesh'].filter(k => !FL || !FL[k]);
  if (need.length) throw new Error('FLIGHT LAB のモジュールがありません: ' + need.join(', '));
  const L = makeLayout(FL.physics);

  bootMsg('画像を読み込んでいます…', 0.05);
  await loadTextures((k) => bootMsg('画像を読み込んでいます…', 0.05 + 0.25 * k));

  const probe = document.createElement('canvas').getContext('webgl2');
  if (!probe) throw new Error('WebGL2 が使えません');
  // the pipeline (renderer, scene, camera, post-processing) with the preset for this GPU
  const view = $('#view');
  let preset = PRESETS.high;
  const pipe = createPipeline(view, preset);
  const gpu = gpuName(pipe.renderer);
  preset = PRESETS[pickPreset(gpu)];
  pipe.setQuality(preset);
  const { scene, camera, renderer } = pipe;
  setAnisotropy(Math.min(preset.aniso, renderer.capabilities.getMaxAnisotropy()));

  bootMsg('飛行場を作っています…', 0.35); await frame();
  const ground = buildGround(L, FL, { quality: preset }); scene.add(ground.group);
  const airfield = buildAirfield(L, FL, { quality: preset }); scene.add(airfield.group);
  bootMsg('訓練所を作っています…', 0.5); await frame();
  const buildings = buildBuildings(L); scene.add(buildings.group);
  bootMsg('木と景色を作っています…', 0.6); await frame();
  const veg = buildVegetation(L, FL, { quality: preset }); scene.add(veg.group);
  scene.add(buildLandmarks(L, FL).group);
  bootMsg('機体を並べています…', 0.7); await frame();
  // parked aircraft on the tie-down spots (noses towards the taxilane), one in the open hangar
  const hdgOut = (L.R.trueHdg + 270) % 360;
  const parked = [];
  const spots = [[0, 'pa28'], [2, 'pa28'], [3, 'pa28'], [5, 'pa28'], [8, 'pa28'], [10, 'pa44'], [13, 'pa28'], [16, 'pa44'], [19, 'pa28'], [22, 'pa28']];
  for (const [i, id] of spots) { const s = STANDS[i]; if (!s) continue; const ac = parkedAircraft(FL, L, id, s.a, s.c - 0.4, hdgOut, { prop: 0.3 + i * 0.7 }); scene.add(ac.root); parked.push(ac); }
  { const ac = parkedAircraft(FL, L, 'pa28', 563, 258, hdgOut, { prop: 1.1 }); scene.add(ac.root); parked.push(ac); }

  bootMsg('空と光を準備しています…', 0.8); await frame();
  const sky = createSky(renderer, scene, preset);
  let hours = parseFloat(params.get('t')) || 9.6;
  const applyTime = () => {
    const st = sky.setTime(hours);
    pipe.setHaze({ sunDir: st.dir, el: st.el });
    buildings.setNight(st.lightsOn);
    $('#time').value = String(hours);
    const hh = Math.floor(hours), mm = Math.round((hours - hh) * 60);
    $('#timeTxt').textContent = `${hh}:${String(mm).padStart(2, '0')}（現地時刻） 太陽高度 ${st.el.toFixed(0)}°`;
  };
  applyTime();

  // ---------------------------------------------------------------- viewpoints
  const G = L.G, V = (a, c, up) => new THREE.Vector3(...L.rwyToLocal(a, c, up));
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
  ];
  const spec = createSpectator(renderer.domElement, camera, { groundY: G, onLock: (on) => document.body.classList.toggle('locked', on) });
  let viewIdx = Math.max(0, Math.min(VIEWS.length - 1, (parseInt(params.get('view'), 10) || 1) - 1));
  const setView = (i) => { viewIdx = i; const v = VIEWS[i]; spec.setPose(v.pos, v.look); renderChips(); };

  // ---------------------------------------------------------------- HUD
  const chips = $('#views');
  function renderChips() {
    chips.innerHTML = VIEWS.map((v, i) => `<button data-i="${i}" class="${i === viewIdx ? 'on' : ''}">${i + 1} ${v.label}</button>`).join('');
    $('#quality').innerHTML = ORDER.map(k => `<button data-q="${k}" class="${k === preset.id ? 'on' : ''}">${PRESETS[k].label}</button>`).join('');
  }
  chips.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setView(+b.dataset.i); });
  $('#quality').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setQuality(b.dataset.q); });
  $('#time').addEventListener('input', (e) => { hours = parseFloat(e.target.value); applyTime(); });
  $('#panelHide').addEventListener('click', () => $('#panel').classList.toggle('hidden'));
  $('#benchBtn').addEventListener('click', () => runBench());
  let perfOn = true;
  function setQuality(id) {
    preset = PRESETS[id]; rememberPreset(id);
    pipe.setQuality(preset); sky.applyQuality(preset); veg.setNearRadius(preset.treeNear);
    setAnisotropy(Math.min(preset.aniso, renderer.capabilities.getMaxAnisotropy()));
    renderChips(); toast(`画質：${preset.label}`);
  }
  let toastT = 0;
  function toast(text, ms = 1800) { const t = $('#toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); }
  addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (/^Digit[1-9]$/.test(e.code)) { const i = +e.code.slice(5) - 1; if (VIEWS[i]) setView(i); }
    if (e.code === 'BracketLeft') { hours = Math.max(5.5, hours - 0.25); applyTime(); }
    if (e.code === 'BracketRight') { hours = Math.min(20, hours + 0.25); applyTime(); }
    if (e.code === 'KeyP') $('#panel').classList.toggle('hidden');
    if (e.code === 'KeyF') { perfOn = !perfOn; $('#perf').style.display = perfOn ? '' : 'none'; }
  });
  addEventListener('resize', () => pipe.resize());

  // ---------------------------------------------------------------- the loop
  const dyn = makeDynRes(pipe, () => preset);
  const stats = { fps: 0, ms: 0, frames: 0, acc: 0 };
  let last = performance.now(), t0 = last, running = true, perfT = 0;
  const camWorld = new THREE.Vector3(), focus = new THREE.Vector3();
  function step(now) {
    const dtMs = Math.min(now - last, 250); last = now;
    const dt = dtMs / 1000, t = (now - t0) / 1000;
    // resolution changes happen before drawing: resizing the canvas after drawing would show a black frame
    dyn.tick(dtMs);
    spec.update(dt);
    camera.updateMatrixWorld();
    camera.getWorldPosition(camWorld);
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
      if (perfOn) drawPerf();
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
  async function runBench(frames = 90, warm = 20) {
    toast('計測しています…（そのまま）', 60000);
    const keepDyn = dyn.enabled; dyn.enabled = false; running = false;
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
    window.__cadet.benchResult = { preset: preset.id, dpr: pipe.dpr, gpu, views: out };
    console.table(out);
    toast(out.map(o => `${o.label}：${o.avgMs} ms（95% ${o.p95Ms}）描画 ${o.calls}・三角形 ${(o.triangles / 1000).toFixed(0)}k`).join('\n'), 12000);
    return window.__cadet.benchResult;
  }

  // ---------------------------------------------------------------- start
  setView(viewIdx); renderChips();
  bootMsg('シェーダーを準備しています…', 0.9); await frame();
  try { await renderer.compileAsync(scene, camera); } catch (e) { /* older drivers: compile on first draw */ }
  step(performance.now());
  requestAnimationFrame(loop);
  window.__cadet = {
    ready: true, L, FL, VIEWS, setView, setQuality, runBench,
    setPose: (p, look) => spec.setPose(new THREE.Vector3(...p), new THREE.Vector3(...look)),
    setTime: (h) => { hours = h; applyTime(); }, stats: () => ({ fps: stats.fps, ...pipe.sceneInfo, all: renderer.info.render.calls, dpr: pipe.dpr, preset: preset.id, gpu, trees: veg.counts }),
    pause: (v) => { running = !v; },
    // render one frame now and return it as a PNG data URL (for tests: the drawing buffer is read in the same task)
    snapshot: (n = 1) => { for (let k = 0; k < n; k++) step(performance.now()); return renderer.domElement.toDataURL('image/png'); },
  };
  bootMsg(`準備ができました（${NAMES.field.ja}）`, 1);
  const go = $('#bootGo'); go.disabled = false;
  const start = () => { $('#boot').classList.add('fade'); $('#hud').hidden = false; renderer.domElement.focus(); setTimeout(() => $('#boot').remove(), 700); };
  go.addEventListener('click', start);
  if (params.has('auto') || params.has('bench')) start();
  if (params.has('bench')) setTimeout(() => runBench(), 800);
}

boot().catch(fail);
