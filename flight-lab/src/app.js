// FLIGHT LAB — app.js
// The page: tabs (flight training, curriculum, textbook, Sanford & radio, records, Google 3D settings, about),
// the simulator loop (physics at 120 Hz, the evaluation, the out-the-window view, the PFD / MFD at 30 Hz),
// keyboard and gamepad input, the G1000-TYPE panel controls, the task panel, sound, the learning record.
// Privacy: the Google API key lives only in memory (google3d.js); the record never contains it.
(function (FL) {
  'use strict';
  const P = FL.physics, AV = FL.avionics, TR = FL.training, CU = FL.curriculum, SF = FL.sanford;
  const DEG = Math.PI / 180, clamp = P.clamp;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // a small DOM builder: text is always set as text (never parsed as HTML) unless 'html' is given for static content
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k === 'text') e.textContent = v;
      else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style') e.style.cssText = v; else e.setAttribute(k, v === true ? '' : v);
    }
    for (const c of kids.flat()) { if (c == null || c === false) continue; e.append(c.nodeType ? c : document.createTextNode(String(c))); }
    return e;
  }
  const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  const store = (() => { try { const k = '__fl_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
  const errors = [];
  window.addEventListener('error', e => errors.push(String(e.message || e)));

  // ---------------------------------------------------------------- state
  const S = {
    k: null, ctx: null, taskId: 't1', levelId: 'intro', mode: 'staged', freeStart: 'task',
    view: 'cockpit', paused: false, hoodUser: false, layout: 1,
    assist: { attitude: true, yaw: true }, sound: false, labels: true,
    in: { keys: new Set(), pitchT: null, bankT: null, pI: 0, elev: 0, ail: 0, rud: 0, gpActive: 0, gpPrev: [] },
    evSeen: 0, recId: null, lastDone: false, progress: TR.loadProgress(store), flashT: 0,
  };
  let scene = null, G = null;

  // ---------------------------------------------------------------- tabs
  function showTab(id) {
    $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === id));
    $$('main > .tab').forEach(t => t.classList.toggle('on', t.id === 'tab-' + id));
    if (id === 'rec') renderRecords();
    if (id === 'curr') renderCurriculum();
    if (id === 'g3d') renderG3d();
    if (id !== 'fly') S.in.keys.clear();
  }
  $$('#tabs button').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));

  // ---------------------------------------------------------------- starting tasks
  const FREE_STARTS = [
    ['task', '課題の開始状況'], ['rwy', 'LAB RWY 36（滑走路上・停止）'], ['air', 'LAB 空域 上空 3,000 ft'], ['final', 'LAB RWY 36 最終進入 3 NM'],
    ['sfb', 'Sanford 上空 1,500 ft（Google 3D 外部景観の確認用）'],
  ];
  function start(taskId = S.taskId, levelId = S.levelId, mode = S.mode) {
    S.taskId = taskId; S.levelId = levelId; S.mode = mode;
    const k = TR.startTask(taskId, levelId, mode);
    if (mode === 'free' && S.freeStart !== 'task') {
      const spec = {
        rwy: { where: 'runway', along: 30 },
        air: { where: 'air', n: 4000, e: -44000, altFt: 3000, hdgMag: 360, kias: 100, hdgBug: 360, altSel: 3000 },
        final: { where: 'final', along: -5500, cross: 0, kias: 70, flap: 2, glideDeg: 3, cdi: 'NAV1', nav1: 109900 },
        sfb: { where: 'air', n: -9000, e: -2000, altFt: 1500, hdgMag: 360, kias: 100, hdgBug: 360, altSel: 1500 },
      }[S.freeStart];
      spec.wind = k.spec ? k.spec.wind : k.run.spec.wind;
      const x = TR.applySetup(spec); k.s = x.s; k.av = x.av; k.run.spec = spec;
    }
    S.k = k; S.evSeen = 0; S.recId = null; S.lastDone = false;
    S.in.pitchT = null; S.in.bankT = null; S.in.pI = 0; S.in.elev = 0; S.in.ail = 0; S.in.rud = 0;
    S.ctx = TR.makeCtx(k.s, k.av);
    renderTaskPanel(); renderAudio(); renderSoftkeys();
    flash(`${k.task.no}. ${k.task.title}（${k.level.name}・${mode === 'free' ? '自由練習' : '段階課題'}）を開始`, '');
  }
  function resetTask() { start(S.taskId, S.levelId, S.mode); }

  // ---------------------------------------------------------------- input: keyboard
  const FLY_KEYS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'KeyW', 'KeyS', 'KeyQ', 'KeyE', 'BracketLeft', 'BracketRight'];
  function typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  window.addEventListener('keydown', e => {
    if (typing(e) || !$('#tab-fly').classList.contains('on')) return;
    if (FLY_KEYS.includes(e.code)) { S.in.keys.add(e.code); e.preventDefault(); }
    if (e.repeat) return;
    switch (e.code) {
      case 'KeyF': flaps(e.shiftKey ? -1 : 1); break;
      case 'KeyC': toggleView(); break;
      case 'KeyP': togglePause(); break;
      case 'KeyR': resetTask(); break;
      case 'KeyH': if (S.mode === 'free') { S.hoodUser = !S.hoodUser; flash(S.hoodUser ? 'フード ON（自由練習）' : 'フード OFF'); } break;
      default: return;
    }
    e.preventDefault();
  });
  window.addEventListener('keyup', e => { S.in.keys.delete(e.code); });
  window.addEventListener('blur', () => S.in.keys.clear());
  function flaps(d) {
    const s = S.k.s, n = P.TRAINER.flaps.length;
    s.ctl.flap = clamp(s.ctl.flap + d, 0, n - 1);
    flash(`フラップ ${P.TRAINER.flaps[s.ctl.flap].deg}°`);
  }
  function toggleView() { S.view = S.view === 'cockpit' ? 'chase' : 'cockpit'; $('#bView').textContent = '視点：' + (S.view === 'cockpit' ? '操縦席' : '機外（後方）'); }
  function togglePause() { S.paused = !S.paused; $('#pauseBadge').hidden = !S.paused; $('#bPause').textContent = S.paused ? '再開' : '一時停止'; }

  // ---------------------------------------------------------------- input: gamepad (standard mapping)
  // left stick: aileron / elevator (pull back = nose up), triggers: rudder, right stick up/down: throttle,
  // A: flaps down, B: flaps up, X: brake (hold), Y: view, LB / RB: trim nose down / up, START: pause, BACK: reset
  function readPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    let g = null; for (const p of pads) if (p && p.connected) { g = p; break; }
    if (!g) return null;
    const dz = v => (Math.abs(v) < 0.08 ? 0 : (v - Math.sign(v) * 0.08) / 0.92), expo = v => v * (0.35 + 0.65 * v * v);
    const ax = g.axes, b = i => (g.buttons[i] ? g.buttons[i].value || (g.buttons[i].pressed ? 1 : 0) : 0);
    const std = g.mapping === 'standard';
    const r = { id: g.id, ail: expo(dz(ax[0] || 0)), elev: expo(dz(ax[1] || 0)), rud: std ? b(7) - b(6) : dz(ax[2] || 0), thrRate: std ? -dz(ax[3] || 0) : 0, brake: b(2) > 0.5 };
    // edges
    const pressed = g.buttons.map(x => !!(x && x.pressed)), was = S.in.gpPrev; S.in.gpPrev = pressed;
    const edge = i => pressed[i] && !was[i];
    if (S.k && $('#tab-fly').classList.contains('on')) {
      if (edge(0)) flaps(1); if (edge(1)) flaps(-1); if (edge(3)) toggleView(); if (edge(9)) togglePause(); if (edge(8)) resetTask();
      r.trim = (pressed[5] ? 1 : 0) - (pressed[4] ? 1 : 0);
    }
    if (Math.abs(r.ail) + Math.abs(r.elev) > 0.02) S.in.gpActive = 3;    // seconds the stick stays in charge after it moves
    return r;
  }

  // ---------------------------------------------------------------- applying the inputs (every physics step)
  const approach = (v, t, r) => (v < t ? Math.min(t, v + r) : Math.max(t, v - r));
  function applyControls(s, dt, pad) {
    const K = S.in.keys, c = s.ctl, o = s.out, I = S.in;
    if (K.has('KeyW')) c.thr = clamp(c.thr + 0.45 * dt, 0, 1);
    if (K.has('KeyS')) c.thr = clamp(c.thr - 0.45 * dt, 0, 1);
    if (pad && pad.thrRate) c.thr = clamp(c.thr + pad.thrRate * 0.5 * dt, 0, 1);
    c.brake = K.has('Space') || (pad && pad.brake) ? 1 : 0;
    const trimIn = (K.has('BracketRight') ? 1 : 0) - (K.has('BracketLeft') ? 1 : 0) + (pad && pad.trim ? pad.trim : 0);
    if (trimIn) c.trim = clamp(c.trim + trimIn * 0.25 * dt, -1, 1);
    // rudder: Q left, E right (ramped), plus the yaw assist (a teaching aid: centres the ball in the air, damps the swing on the ground)
    const rIn = (K.has('KeyE') ? 1 : 0) - (K.has('KeyQ') ? 1 : 0);
    I.rud = approach(I.rud, rIn, (rIn ? 2.2 : 4) * dt);
    let rud = I.rud + (pad ? pad.rud : 0);
    if (S.assist.yaw) rud += s.onGround ? clamp(-0.05 * s.w[2] / DEG, -0.35, 0.35) : clamp(0.08 * o.beta, -0.5, 0.5);
    c.rud = clamp(rud, -1, 1);
    // stick
    const pIn = (K.has('ArrowUp') ? 1 : 0) - (K.has('ArrowDown') ? 1 : 0), aIn = (K.has('ArrowRight') ? 1 : 0) - (K.has('ArrowLeft') ? 1 : 0);
    if (pad && I.gpActive > 0) { c.elev = pad.elev; c.ail = pad.ail; I.pitchT = null; I.pI = 0; return; }
    if (S.assist.attitude && !s.onGround && s.airTime > 0.5) {
      // keyboard attitude hold (teaching aid, NOT an autopilot: it holds the attitude you set, it does not follow HDG / ALT)
      if (I.pitchT == null) { I.pitchT = o.pitch; I.bankT = Math.abs(o.bank) < 3 ? 0 : o.bank; I.pI = c.elev; }
      I.pitchT = clamp(I.pitchT + pIn * 4.5 * dt, -20, 25);
      I.bankT = clamp(I.bankT + aIn * 22 * dt, -60, 60);
      if (!aIn && Math.abs(I.bankT) < 3 && I.lastAIn) I.bankT = 0;
      I.lastAIn = aIn;
      const e = I.pitchT - o.pitch;
      I.pI = clamp(I.pI + e * 0.03 * dt * 10, -0.8, 0.8);
      c.elev = clamp(0.06 * e - 0.025 * s.w[1] / DEG + I.pI, -1, 1);
      c.ail = clamp(0.05 * (I.bankT - o.bank) - 0.012 * s.w[0] / DEG, -1, 1);
    } else {
      // spring-centred stick: the keys move it, released it returns
      I.pitchT = null;
      I.elev = approach(I.elev, pIn, (pIn ? 1.4 : 3) * dt); I.ail = approach(I.ail, aIn, (aIn ? 2 : 4) * dt);
      c.elev = I.elev; c.ail = I.ail;
    }
  }

  // ---------------------------------------------------------------- the loop
  let last = performance.now(), acc = 0, panelT = 0, liveT = 0;
  const H = 1 / 120;
  function frame(now) {
    const dtr = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    let pad = null; try { pad = readPad(); } catch (e) { pad = null; }
    if (S.in.gpActive > 0) S.in.gpActive -= dtr;
    if (S.k && !S.paused) {
      acc += dtr; let n = 0;
      while (acc >= H && n < 30) { applyControls(S.k.s, H, pad); P.step(S.k.s, H); acc -= H; n++; }
      if (n === 30) acc = 0;
      if (n) { S.ctx = TR.makeCtx(S.k.s, S.k.av); TR.update(S.k.run, S.ctx, n * H); events(); }
    }
    try { draw3d(); } catch (e) { errors.push('3D: ' + e.message); }
    panelT += dtr; liveT += dtr;
    if (panelT >= 1 / 30) { panelT = 0; drawPanels(); hud(); }
    if (liveT >= 0.12) { liveT = 0; liveTask(); }
    soundStep();
    requestAnimationFrame(frame);
  }
  // physics events → messages; the end of a task → debrief and the record
  function events() {
    const s = S.k.s, run = S.k.run;
    while (S.evSeen < s.events.length) {
      const e = s.events[S.evSeen++];
      if (e.type === 'touchdown') flash(`接地：${e.fpm} fpm・${e.kias} kt・中心線から ${Math.abs(e.cross)} m ${e.cross >= 0 ? '右' : '左'}${e.onRunway ? '' : '（滑走路外）'}`, e.fpm > 600 ? 'bad' : 'good');
      if (e.type === 'hard_landing') flash(`ハードランディング（${e.fpm} fpm）`, 'bad');
      if (e.type === 'runway_excursion') flash('滑走路逸脱', 'bad');
      if (e.type === 'tail_strike') flash('テールストライク（機首の上げすぎ）', 'bad');
      if (e.type === 'engine_stop') flash(`エンジン停止：${e.why}`, 'bad');
      if (e.type === 'crash') flash(`機体損傷：${e.why}（R でやり直し）`, 'bad');
    }
    if (run.done && !S.lastDone) {
      S.lastDone = true;
      flash(run.result === 'success' ? `達成：${S.k.task.title}` : `未達成：${run.reason}`, run.result === 'success' ? 'good' : 'bad');
      if (run.mode === 'staged') { const r = TR.addRecord(store, TR.recordFromRun(run, s, '')); S.recId = r && r.id; }
      renderTaskPanel();
    }
  }
  let flashTimer = 0;
  function flash(t, kind = '') {
    const f = $('#flash'); f.textContent = t; f.className = 'show ' + kind;
    clearTimeout(flashTimer); flashTimer = setTimeout(() => { f.className = kind; }, kind === 'bad' ? 4500 : 2600);
  }

  // ---------------------------------------------------------------- drawing: the 3D view, labels, hood, HUD
  function hoodOn() { return !!(S.k && ((S.k.run.spec && S.k.run.spec.hood) || S.hoodUser)); }
  function draw3d() {
    if (!scene || !S.k) return;
    const hood = hoodOn();
    $('#hood').hidden = !hood;
    if (hood) { $('#labels').textContent = ''; return; }
    const gHole = G && G.hole ? G.hole() : null;
    scene.render({ s: S.k.s, view: S.view, hole: gHole, extra: G && G.active() ? (gl, c) => G.draw(gl, c) : null });
    if (G && G.active()) { const cam = scene.camera(); G.update(cam, S.k.s); }
    // labels on the training-point towers
    const box = $('#labels'); let html = '';
    if (S.labels) for (const L of scene.labels) {
      const p = scene.project(L.pos); if (!p || p.dist > 25000) continue;
      const x = Math.round(p.x), y = Math.round(p.y); if (x < -50 || y < -20 || x > box.clientWidth + 50 || y > box.clientHeight + 20) continue;
      html += `<div style="left:${x}px;top:${y}px">${L.label} ${(p.dist / 1852).toFixed(1)} NM</div>`;
    }
    box.innerHTML = html;
    const ga = $('#gattr');
    if (G && G.active()) { ga.hidden = false; $('#gcredits').textContent = G.credits(); $('#viewNote').textContent = 'Google のデータは外部景観の表示のみ（衝突・地形判定なし）'; }
    else { ga.hidden = true; $('#viewNote').textContent = '景色は教材用の架空の地形です（LAB 空域・LAB RWY 36 は架空）'; }
  }
  function hud() {
    if (!S.k) return;
    const s = S.k.s, c = s.ctl, o = s.out, F = P.TRAINER.flaps[c.flap].deg, fp = Math.round(s.flapPos);
    const arrow = v => (v > 0.02 ? '▲' : v < -0.02 ? '▼' : '・');
    const lines = [
      `THR ${String(Math.round(c.thr * 100)).padStart(3)}%  RPM ${Math.round(o.rpm)}  ${s.engine.running ? '' : '<span class="bad">ENGINE STOP</span>'}`,
      `FLAP ${F}°${fp !== F ? `（作動中 ${fp}°）` : ''}  TRIM ${arrow(c.trim)}${Math.abs(c.trim).toFixed(2)}  ${c.brake ? '<span class="warn">BRAKE</span>' : ''}`,
      `操縦力（昇降舵）${arrow(c.elev)}${Math.abs(c.elev).toFixed(2)}  ${Math.abs(c.elev) > 0.25 && !s.onGround ? '<span class="warn">トリムで減らす</span>' : ''}`,
      `補助：姿勢保持 ${S.assist.attitude ? 'ON' : 'OFF'}・ヨー ${S.assist.yaw ? 'ON' : 'OFF'}${S.in.gpActive > 0 ? '・ゲームパッド' : ''}`,
      `${s.onGround ? (o.onRunway ? '地上（滑走路）' : '地上（滑走路外）') : `AGL ${Math.round(o.agl)} ft`}  ${S.k.run.mode === 'free' ? '自由練習' : `課題 ${fmt(S.k.run.t)} 秒`}`,
    ];
    if (s.crashed) lines.push(`<span class="bad">機体損傷：${esc(s.crashReason)}（R でやり直し）</span>`);
    $('#hud').innerHTML = lines.join('\n');
  }
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  // ---------------------------------------------------------------- the PFD / MFD canvases
  const LW = 640;   // logical width of a display; the height follows the canvas' shape
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
    const LH = Math.round(LW * clamp(r.height / Math.max(1, r.width), 0.5, 0.85));
    const g = cv.getContext('2d'); g.setTransform(w / LW, 0, 0, hh / LH, 0, 0);
    return { g, W: LW, H: LH };
  }
  function drawPanels() {
    if (!S.k || !$('#tab-fly').classList.contains('on')) return;
    const s = S.k.s, d = { o: s.out, av: S.k.av, nav: S.ctx.nav, varW: P.MAGVAR_W, qnh: s.qnh, engine: s.engine, pos: { n: s.pos[0], e: s.pos[1] } };
    const a = fitCanvas($('#pfd')); AV.drawPFD(a.g, a.W, a.H, d);
    const b = fitCanvas($('#mfd')); AV.drawMFD(b.g, b.W, b.H, d);
    audioLive();
  }

  // ---------------------------------------------------------------- the panel controls (softkeys, knobs, audio)
  function ctl(what, dir, big) { if (!S.k) return; const t = AV.control(S.k.av, what, dir, big); renderSoftkeys(); renderAudio(); if (t) flash(t); }
  function btn(label, fn, title, cls) { return h('button', { class: cls || '', title: title || null, onclick: fn }, label); }
  function grp(label, ...b) { return h('span', { class: 'grp' }, label ? h('span', { class: 'lab' }, label) : null, ...b); }
  function renderSoftkeys() {
    if (!S.k) return;
    const av = S.k.av, pk = $('#pfdKeys'), pn = $('#pfdKnobs'), mk = $('#mfdKeys'), mn = $('#mfdKnobs');
    pk.textContent = ''; pn.textContent = ''; mk.textContent = ''; mn.textContent = '';
    if (av.pfdMenu === 'PFD') pk.append(btn('WIND', () => ctl('WIND'), '風の表示', 'soft' + (av.wind ? ' on' : '')), btn('ALT UNIT', () => ctl('ALT_UNIT'), 'BARO の単位（IN / HPA）', 'soft'), btn('STD BARO', () => ctl('STD_BARO'), '29.92 inHg', 'soft'), btn('BACK', () => ctl('PFD_MENU', 'TOP'), '', 'soft'));
    else pk.append(btn('PFD', () => ctl('PFD_MENU', 'PFD'), 'PFD の設定', 'soft'), btn('CDI', () => ctl('CDI'), 'GPS → NAV1 → NAV2', 'soft'), h('span', { class: 'lab', style: 'align-self:center' }, `CDI: ${AV.cdiName(av)}`));
    pn.append(
      grp('HDG', btn('−', e => ctl('HDG', -1, e.shiftKey), 'Shift で 10°'), btn('SYNC', () => ctl('HDG_SYNC', Math.round(S.ctx.hdgMag)), '現在の針路に合わせる'), btn('+', e => ctl('HDG', 1, e.shiftKey), 'Shift で 10°')),
      grp('ALT', btn('−1000', () => ctl('ALT', -1, true)), btn('−100', () => ctl('ALT', -1)), btn('+100', () => ctl('ALT', 1)), btn('+1000', () => ctl('ALT', 1, true))),
      grp('BARO', btn('−', () => ctl('BARO', -1)), btn('+', () => ctl('BARO', 1))),
      grp('CRS', btn('−', e => ctl('CRS', -1, e.shiftKey)), btn('+', e => ctl('CRS', 1, e.shiftKey))),
    );
    mk.append(btn('MAP', () => ctl('MFD_MAP'), '', 'soft' + (av.mfdPage === 'MAP' ? ' on' : '')), btn('FPL', () => ctl('MFD_FPL'), '', 'soft' + (av.mfdPage === 'FPL' ? ' on' : '')),
      btn(av.mapNorthUp ? 'NORTH UP' : 'TRACK UP', () => ctl('NORTH_UP'), '地図の向き', 'soft'), btn('PREV LEG', () => ctl('FPL_NEXT', -1), '前の区間', 'soft'), btn('NEXT LEG', () => ctl('FPL_NEXT', 1), '次の区間', 'soft'));
    const sel = h('select', { title: 'D→（直行）', onchange: e => { ctl('DIRECT', e.target.value || null); } }, h('option', { value: '' }, av.direct ? 'D→ 解除' : 'D→ 選択'), ...AV.WAYPOINTS.filter(w => w.kind !== 'ref').map(w => h('option', { value: w.id, selected: av.direct === w.id }, w.id)));
    sel.style.fontSize = '11px';
    mn.append(grp('RANGE', btn('−', () => ctl('RANGE', -1)), btn('+', () => ctl('RANGE', 1))), grp('D→', sel), h('span', { class: 'lab', style: 'align-self:center' }, '架空訓練点 · NOT FOR NAVIGATION'));
  }
  function renderAudio() {
    const a = $('#audio'); a.textContent = '';
    if (!S.k) return;
    const av = S.k.av;
    const mon = n => btn(h('span', {}, h('span', { class: 'lamp' }), n), () => ctl('MON', n), `${n} の受信音（教材表示）`, av.audio.monitor[n] ? 'on' : '');
    a.append(
      h('h4', { text: 'AUDIO（GMA 型・教材）' }),
      h('div', { class: 'row' }, btn('COM1 MIC', () => { if (av.audio.mic !== 'COM1') ctl('MIC'); }, '送信機の選択（送信はできません）', av.audio.mic === 'COM1' ? 'on' : ''), btn('COM2 MIC', () => { if (av.audio.mic !== 'COM2') ctl('MIC'); }, '', av.audio.mic === 'COM2' ? 'on' : '')),
      h('div', { class: 'row' }, mon('COM1'), mon('COM2')), h('div', { class: 'row' }, mon('NAV1'), mon('NAV2')),
      h('div', { class: 'notx', text: '送信不可：実際の管制には接続しません' }),
      h('h4', { text: 'COM（25 kHz 間隔）' }), h('div', { class: 'freq', id: 'comFreq' }),
      h('div', { class: 'row' }, btn(av.comSel, () => ctl('COM_SEL'), '操作する COM を切り替え'), btn('⇄', () => ctl('COM_SWAP'), '使用中と予備の入れ替え')),
      h('div', { class: 'row' }, btn('MHz−', () => ctl('COM_MHZ', -1)), btn('MHz+', () => ctl('COM_MHZ', 1)), btn('kHz−', () => ctl('COM_KHZ', -1)), btn('kHz+', () => ctl('COM_KHZ', 1))),
      h('h4', { text: 'NAV' }), h('div', { class: 'freq', id: 'navFreq' }),
      h('div', { class: 'row' }, btn(av.navSel, () => ctl('NAV_SEL'), '操作する NAV を切り替え'), btn('⇄', () => ctl('NAV_SWAP'))),
      h('div', { class: 'row' }, btn('MHz−', () => ctl('NAV_MHZ', -1)), btn('MHz+', () => ctl('NAV_MHZ', 1)), btn('kHz−', () => ctl('NAV_KHZ', -1)), btn('kHz+', () => ctl('NAV_KHZ', 1))),
      h('div', { class: 'small mute', text: '周波数は教材用（実際の割り当てではありません）。架空局：LAB VOR 113.50、I-LAB LOC 109.90' }),
    );
    audioLive();
  }
  function audioLive() {
    if (!S.k) return; const av = S.k.av, cf = $('#comFreq'), nf = $('#navFreq'); if (!cf) return;
    const line = (n, r, f) => `<div class="${av.comSel === n || av.navSel === n ? 'sel' : ''}">${n} ${f(r.act)} ⇄ ${f(r.stby)}</div>`;
    const c = line('COM1', av.com1, AV.fmtCom) + line('COM2', av.com2, AV.fmtCom), n = line('NAV1', av.nav1, AV.fmtNav) + line('NAV2', av.nav2, AV.fmtNav);
    if (cf.innerHTML !== c) cf.innerHTML = c; if (nf.innerHTML !== n) nf.innerHTML = n;
  }

  // ---------------------------------------------------------------- the task panel
  function renderTaskPanel() {
    const tp = $('#taskPanel'); tp.textContent = '';
    if (!S.k) return;
    const T = S.k.task, L = S.k.level, run = S.k.run;
    const tsel = h('select', { 'aria-label': '課題', onchange: e => start(e.target.value, S.levelId, S.mode) }, ...TR.TASKS.map(t => h('option', { value: t.id, selected: t.id === T.id }, `${t.no}. ${t.title}`)));
    const seg = (items, cur, fn) => h('span', { class: 'seg' }, ...items.map(([v, lab, tt]) => h('button', { class: v === cur ? 'on' : '', title: tt || null, onclick: () => fn(v) }, lab)));
    tp.append(
      h('h2', { text: '訓練課題' }),
      h('div', { class: 'row' }, tsel),
      h('div', { class: 'row' }, seg(TR.LEVELS.map(l => [l.id, l.name, l.desc]), L.id, v => start(S.taskId, v, S.mode)), seg([['staged', '段階課題', '条件を連続して満たすと次の段階へ'], ['free', '自由練習', '評価なし']], run.mode, v => start(S.taskId, S.levelId, v))),
    );
    if (run.mode === 'free') {
      tp.append(h('div', { class: 'row' }, h('span', { class: 'small mute', text: '開始位置' }), h('select', { onchange: e => { S.freeStart = e.target.value; resetTask(); } }, ...FREE_STARTS.map(([v, l]) => h('option', { value: v, selected: v === S.freeStart }, l)))));
    }
    tp.append(
      h('div', { class: 'row' }, btn('やり直し（R）', resetTask, '', 'primary'), btn(`教科書 第 ${T.chapter} 章`, () => { showTab('book'); openChapter(T.chapter); })),
      h('p', { class: 'small', text: T.brief }),
      h('div', { class: 'small mute', text: `${T.en} ／ レベル「${L.name}」：高度 ±${L.alt} ft・速度 ±${L.spd} kt・針路 ±${L.hdg}°・保持 ${L.hold} 秒（仮想教材値）` }),
      h('div', { id: 'objective' }),
      h('div', { id: 'estSlot' }),
      h('h4', { text: '条件（すべて満たし続ける）' }), h('ul', { id: 'items' }),
      h('h4', { text: 'ヒント' }), h('ol', { id: 'hints' }),
      h('div', { id: 'debrief' }),
    );
    const hints = TR.visibleHints(T, L), ho = $('#hints');
    if (hints.length) hints.forEach(t => ho.append(h('li', { text: t }))); else ho.append(h('li', { class: 'mute', text: '精度レベルではヒントを表示しません（必要なら教科書を参照）。' }));
    if (run.done || run.mode === 'free') renderDebrief();
    tp.append(
      h('details', {}, h('summary', { text: '操作方法（キーボード・ゲームパッド）' }), keyHelp()),
      h('details', {}, h('summary', { text: '操作補助の設定（教材補助）' }),
        h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: S.assist.attitude, onchange: e => { S.assist.attitude = e.target.checked; } }), ' キー操作の姿勢保持（↑↓←→で目標姿勢を動かし、離すとその姿勢を保つ）'),
        h('br'), h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: S.assist.yaw, onchange: e => { S.assist.yaw = e.target.checked; } }), ' ヨー補助（空中でボールを中央へ、地上で振れを抑える）'),
        h('br'), h('label', { class: 'small' }, h('input', { type: 'checkbox', checked: S.labels, onchange: e => { S.labels = e.target.checked; } }), ' 訓練点の名前を景色に表示'),
        h('p', { class: 'note', text: 'どちらも自動操縦ではありません：HDG バグ・ALT SEL には追従しません。実機にはない教材上の操作補助です。OFF にするとトリムの効果がそのまま操縦力に出ます。' })),
    );
    liveTask();
  }
  function keyHelp() {
    const rows = [['↑ / ↓', '機首上げ / 機首下げ'], ['← / →', '左 / 右へ傾ける（バンク）'], ['W / S', 'スロットル 増 / 減'], ['Q / E', 'ラダー 左 / 右'], ['[ / ]', 'トリム 機首下げ / 機首上げ'], ['F（Shift+F）', 'フラップを下げる（上げる）'], ['Space', 'ブレーキ（押している間）'], ['C', '視点：操縦席 / 機外'], ['P', '一時停止'], ['R', '課題をやり直す'], ['H', 'フード（自由練習のみ）']];
    return h('div', { class: 'keyhelp' }, h('table', {}, ...rows.map(([k, v]) => h('tr', {}, h('td', {}, h('kbd', { text: k })), h('td', { text: v })))),
      h('p', { text: 'ゲームパッド（標準配置）：左スティック＝操縦桿（手前で機首上げ）、LT / RT＝ラダー、右スティック上下＝スロットル、A / B＝フラップ下げ / 上げ、X＝ブレーキ、Y＝視点、LB / RB＝トリム、START＝一時停止、BACK＝やり直し。フライトスティック等は機種ごとに軸の割り当てが異なります（要確認）。' }));
  }
  function liveTask() {
    if (!S.k || !$('#objective')) return;
    const T = S.k.task, run = S.k.run, ob = $('#objective');
    if (run.mode === 'free') { ob.innerHTML = '<span class="stage">自由練習（評価なし）</span><div class="small mute">課題の状況から自由に飛べます。記録は手動で保存できます。</div>'; $('#items').textContent = ''; return; }
    const st = T.stages[Math.min(run.stage, T.stages.length - 1)], prog = TR.progress(run, S.ctx);
    const holdF = run.need > 0 ? clamp(run.held / run.need, 0, 1) : 0;
    const head = run.done ? `<span class="stage">${run.result === 'success' ? '達成' : '未達成'}</span>` : `<span class="stage">段階 ${run.stage + 1}/${T.stages.length}：${esc(st.label)}</span>`;
    ob.innerHTML = `${head}${run.msg && !run.done ? `<div class="small" style="color:#ffd27a;margin-top:4px">${esc(run.msg)}</div>` : ''}
      <div class="small mute" style="margin-top:6px">全体の進み</div><div class="bar"><i style="width:${Math.round(prog * 100)}%"></i></div>
      ${run.done ? '' : `<div class="small mute" style="margin-top:4px">条件の連続保持 ${fmt(run.held, 1)} / ${fmt(run.need, 0)} 秒（外れると 0 に戻る）</div><div class="bar hold"><i style="width:${Math.round(holdF * 100)}%"></i></div>`}`;
    const ul = $('#items'); let html = '';
    for (const it of run.items || []) html += `<li class="${it.ok ? 'ok' : 'ng'}"><span class="k">${it.ok ? '✓' : '✗'}</span><span>${esc(it.label)}</span><span class="v">${esc(it.val)}</span><span class="t">基準 ${esc(it.target)}</span></li>`;
    if (ul.innerHTML !== html) ul.innerHTML = html;
    // the diversion estimate (task 9)
    const slot = $('#estSlot'), need = !run.done && run.taskId === 't9' && run.stage === 1;
    if (need && !slot.firstChild) {
      const f = (id, lab, w) => h('label', {}, lab, ' ', h('input', { id, type: 'number', step: 'any', style: `width:${w}px` }));
      slot.append(h('div', { id: 'estBox' }, h('b', { text: 'LAB-F への見積もり' }), h('div', { class: 'row' }, f('estH', '針路(磁)', 60), f('estD', '距離 NM', 60), f('estT', '時間 分', 60)),
        btn('見積もりを確定', () => { const r = TR.submitEstimate(S.k.run, S.k.s, S.k.av, { hdg: $('#estH').value, dist: $('#estD').value, eteMin: $('#estT').value }); flash(`見積もりを記録（正解：${r.truth.brg}°・${r.truth.dist} NM・${r.truth.eteMin} 分）`); }, '', 'primary'),
        h('div', { class: 'note', text: 'MFD の地図（レンジ環）と現在の対地速度 GS から見積もる。確定すると正解を表示します。' })));
    } else if (!need && slot.firstChild) slot.textContent = '';
  }
  function renderDebrief() {
    const box = $('#debrief'); if (!box || !S.k) return; box.textContent = '';
    const run = S.k.run, s = S.k.s;
    if (run.done || run.mode === 'free') {
      if (run.done) for (const d of TR.debrief(run, s)) box.append(h('p', { class: d.kind, text: d.text }));
      const memo = h('textarea', { rows: 3, placeholder: '振り返りメモ（例：ロールアウトが遅れた → 10° 手前から戻す）', 'aria-label': '振り返りメモ' });
      if (S.recId) { const r = TR.loadRecords(store).find(x => x.id === S.recId); if (r) memo.value = r.memo; }
      box.append(h('h4', { text: '振り返り' }), memo,
        h('div', { class: 'row' }, btn(S.recId ? 'メモを保存' : '記録を保存', () => {
          if (S.recId) { const all = TR.loadRecords(store), r = all.find(x => x.id === S.recId); if (r) { r.memo = memo.value; TR.saveRecords(store, all); } }
          else { const r = TR.addRecord(store, TR.recordFromRun(run, s, memo.value)); S.recId = r && r.id; }
          flash('学習記録に保存しました（正式な飛行日誌ではありません）', 'good');
        }, '', 'primary'), btn('もう一度', resetTask)),
        h('p', { class: 'note', text: TR.RECORD_NOTE }));
    }
  }

  // ---------------------------------------------------------------- sound (engine drone, stall horn): WebAudio, off by default
  let AC = null, eng = null, horn = null;
  function soundInit() {
    if (AC) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AC = new C();
    const mk = (type, f) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = 0; o.connect(g); return { o, g }; };
    eng = mk('sawtooth', 60); const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; eng.g.connect(lp); lp.connect(AC.destination); eng.o.start();
    horn = mk('square', 420); horn.g.connect(AC.destination); horn.o.start();
  }
  function soundStep() {
    if (!AC || !S.k) return;
    const s = S.k.s, on = S.sound && !S.paused && $('#tab-fly').classList.contains('on'), t = AC.currentTime;
    eng.o.frequency.setTargetAtTime(20 + s.engine.rpm / 60 * 2, t, 0.05);
    eng.g.gain.setTargetAtTime(on && s.engine.rpm > 300 ? 0.035 + 0.04 * s.ctl.thr : 0, t, 0.08);
    horn.g.gain.setTargetAtTime(on && s.out.stallWarn ? 0.05 : 0, t, 0.02);
  }

  // ---------------------------------------------------------------- curriculum
  function renderCurriculum() {
    const pg = $('#currPage'); pg.textContent = '';
    const prog = S.progress, quizScore = no => { const q = prog.quiz[no] || []; return q.filter(x => x === true).length; };
    pg.append(h('h2', { text: 'カリキュラム（公開情報の流れに沿った自主学習の順序）' }),
      h('p', { class: 'small mute', text: '各段階の「事実」は ANA などの公開情報から、章と課題は本教材の学習計画（推測・教材設計）です。ANA の実際のシラバスや SOP の再現ではありません。' }));
    const wrap = h('div', { class: 'cards' });
    for (const ph of CU.PHASES) {
      const chs = ph.chapters.map(n => CU.CHAPTERS.find(c => c.no === n)).filter(Boolean);
      const tasks = [...new Set(chs.flatMap(c => c.tasks))].map(id => TR.task(id)).filter(Boolean);
      wrap.append(h('div', { class: 'card phase' },
        h('h3', {}, `${ph.no}. ${ph.title}`), h('div', { class: 'en small', text: ph.en }),
        h('p', { class: 'small' }, h('span', { class: 'tag fact', text: '公開情報' }), ph.fact),
        h('div', { class: 'small mute', text: '章（読む・確認問題）' }),
        h('div', { class: 'chips' }, ...chs.map(c => btn(`${c.no}. ${c.title}${prog.read.includes(c.no) ? ' ✓' : ''}${quizScore(c.no) ? `（問 ${quizScore(c.no)}/2）` : ''}`, () => { showTab('book'); openChapter(c.no); }))),
        tasks.length ? h('div', { class: 'small mute', style: 'margin-top:6px', text: '飛行課題（導入から）' }) : null,
        tasks.length ? h('div', { class: 'chips' }, ...tasks.map(t => btn(`${t.no}. ${t.title}`, () => { showTab('fly'); start(t.id, 'intro', 'staged'); }))) : null));
    }
    pg.append(wrap);
    const total = CU.CHAPTERS.length, read = prog.read.length, qs = CU.CHAPTERS.reduce((a, c) => a + quizScore(c.no), 0);
    pg.append(h('p', { class: 'small' }, `進み具合：読んだ章 ${read}/${total}・確認問題の正解 ${qs}/${total * 2}（この端末のブラウザに保存）`));
  }

  // ---------------------------------------------------------------- textbook
  let curCh = 1;
  function renderToc() {
    const toc = $('#bookToc'); toc.textContent = '';
    for (const ph of CU.PHASES) {
      toc.append(h('div', { class: 'small mute', style: 'margin-top:8px', text: `${ph.no}. ${ph.title}` }));
      for (const n of ph.chapters) { const c = CU.CHAPTERS.find(x => x.no === n); if (c) toc.append(btn(`第 ${c.no} 章 ${c.title}`, () => openChapter(c.no), '', (c.no === curCh ? 'on ' : '') + (S.progress.read.includes(c.no) ? 'done' : ''))); }
    }
  }
  function openChapter(no) {
    const c = CU.CHAPTERS.find(x => x.no === no); if (!c) return; curCh = no;
    if (!S.progress.read.includes(no)) { S.progress.read.push(no); TR.saveProgress(store, S.progress); }
    renderToc();
    const b = $('#bookBody'); b.textContent = '';
    const ph = CU.PHASES.find(p => p.id === c.phase);
    b.append(h('div', { class: 'small mute', text: ph ? `段階 ${ph.no}：${ph.title}` : '' }),
      h('h2', {}, `第 ${c.no} 章 ${c.title}`), h('div', { class: 'en', text: c.en }),
      h('p', { text: c.summary }));
    for (const para of c.body) b.append(h('p', { html: para }));   // static textbook content (trusted)
    b.append(h('h3', { text: '英語の用語（English terms）' }), h('table', { class: 'terms' }, h('tr', {}, h('th', { text: 'English' }), h('th', { text: '日本語' }), h('th', { text: '補足' })), ...c.terms.map(([en, jp, note]) => h('tr', {}, h('td', { class: 'en', text: en }), h('td', { text: jp }), h('td', { class: 'mute', text: note || '' })))));
    b.append(h('h3', { text: '例' }), h('ul', {}, ...c.examples.map(t => h('li', { text: t }))));
    b.append(h('h3', { text: '注意' }), h('ul', {}, ...c.cautions.map(t => h('li', { text: t }))));
    b.append(h('h3', { text: '確認問題' }));
    c.quiz.forEach((q, qi) => {
      const name = `q${c.no}_${qi}`, res = h('div', { class: 'res' });
      const box = h('div', { class: 'quiz' }, h('div', {}, h('b', { text: `問 ${qi + 1}. ` }), q.q),
        ...q.choices.map((ch, i) => h('label', { class: 'ch' }, h('input', { type: 'radio', name, value: i }), ' ', ch)),
        btn('答え合わせ', () => {
          const sel = box.querySelector(`input[name="${name}"]:checked`); if (!sel) { res.className = 'res'; res.textContent = '選択肢を選んでください。'; return; }
          const ok = +sel.value === q.answer;
          res.className = 'res ' + (ok ? 'ok' : 'ng'); res.textContent = `${ok ? '正解' : '不正解'}（正答：${q.choices[q.answer]}）— ${q.why}`;
          const arr = S.progress.quiz[c.no] || [null, null]; arr[qi] = ok; S.progress.quiz[c.no] = arr; TR.saveProgress(store, S.progress);
        }), res);
      b.append(box);
    });
    if (c.tasks.length) b.append(h('h3', { text: '対応する飛行課題' }), h('div', { class: 'chips' }, ...c.tasks.map(id => TR.task(id)).filter(Boolean).map(t => btn(`${t.no}. ${t.title}`, () => { showTab('fly'); start(t.id, 'intro', 'staged'); }))));
    b.append(h('h3', { text: '参考資料（外部リンク・オンライン時）' }), h('ul', {}, ...c.refs.map(r => h('li', {}, h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer' }, r.label)))));
    b.append(h('p', { class: 'note', text: '本文は公開情報に基づく要約と教材の説明です。数値は仮想教材値。実機訓練・教官・POH/AFM・SOP・航空法規を優先してください。' }));
    $('#tab-book').scrollTop = 0;
  }

  // ---------------------------------------------------------------- Sanford & radio
  function speak(text, btnEl) {
    if (!('speechSynthesis' in window)) { flash('このブラウザでは音声合成が使えません'); return; }
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.92;
    const v = speechSynthesis.getVoices().find(x => /en[-_]US/i.test(x.lang)); if (v) u.voice = v;
    if (btnEl) { btnEl.disabled = true; u.onend = u.onerror = () => { btnEl.disabled = false; }; }
    speechSynthesis.speak(u);
  }
  function renderSanford() {
    const pg = $('#sfbPage'); pg.textContent = '';
    const tagOf = k => (k === '事実' ? 'fact' : k === '教材の要約' ? 'sum' : 'unk');
    pg.append(h('h2', { text: 'Sanford（KSFB）と英語の交信' }),
      h('p', { class: 'small mute', text: '公開情報の要約と、架空のコールサインを使った練習用の台本です。実際の管制・周波数・手順の代わりにはなりません。実際の運航は最新のチャート・Chart Supplement・NOTAM・管制の指示に従ってください。' }));
    pg.append(h('h3', { text: '空港と運用（出典付き）' }), h('ul', {}, ...SF.FACTS.map(f => h('li', {}, h('span', { class: 'tag ' + tagOf(f.k), text: f.k }), f.t, ' ', SF.SRC[f.src] ? h('a', { class: 'small', href: SF.SRC[f.src].url, target: '_blank', rel: 'noopener noreferrer' }, `［${SF.SRC[f.src].label}］`) : null))));
    pg.append(h('h3', { text: '滑走路（長さは公開データ・配置は模式）' }), h('table', { class: 'terms' }, h('tr', {}, h('th', { text: '滑走路' }), h('th', { text: '長さ' }), h('th', { text: '注記' })), ...SF.RUNWAYS.map(r => h('tr', {}, h('td', { class: 'en', text: r.id }), h('td', { text: `${r.lenFt.toLocaleString()} ft` }), h('td', { text: r.note })))));
    pg.append(h('div', { class: 'diagram' }, h('h3', { text: '空港の模式図（模式図・NOT FOR NAVIGATION）' }), h('div', { html: SF.diagramSvg() }),
      h('p', { class: 'note', text: '位置関係を学ぶための模式図です。縮尺・形状・誘導路は正確ではありません。実際の Airport Diagram（FAA）を使ってください。' })));
    pg.append(h('h3', { text: '空域' }), h('div', { class: 'cards' }, ...SF.AIRSPACE.map(a => h('div', { class: 'card' }, h('h4', { text: a.name }), h('p', { class: 'small', text: a.jp }), h('p', { class: 'small en', text: a.en })))));
    pg.append(h('h3', { text: '英語 ATC：復唱の練習（音声合成・送信なし）' }),
      h('p', { class: 'small mute', text: `コールサイン「${SF.CALLSIGN.spoken}（${SF.CALLSIGN.short}）」は架空です。▶ で英語の音声（ブラウザ / OS の音声合成）を聞き、正しい復唱を選びます。音声認識・録音・送信はしません。` }));
    for (const sc of SF.SCENES) {
      const name = 'atc_' + sc.id, res = h('div', { class: 'res small' }), atc = h('div', { class: 'atc hidden', text: sc.atc });
      const playBtn = h('button', { class: 'primary' }, '▶ 音声');
      playBtn.addEventListener('click', () => speak(sc.atc, playBtn));
      const card = h('div', { class: 'scene' },
        h('h4', {}, sc.title, S.progress.atc[sc.id] ? h('span', { class: 'tag fact', style: 'margin-left:6px', text: '正解済み' }) : null),
        h('p', { class: 'small', text: '状況：' + sc.situation }),
        h('div', { class: 'row' }, playBtn, btn('文字を表示 / 隠す', () => atc.classList.toggle('hidden'))), atc,
        h('div', { class: 'small mute', text: '正しい復唱（readback）は？' }),
        ...sc.options.map((o, i) => h('label', { class: 'ch', style: 'display:block' }, h('input', { type: 'radio', name, value: i }), ' ', h('span', { class: 'en', text: o }))),
        btn('答え合わせ', () => {
          const sel = card.querySelector(`input[name="${name}"]:checked`); if (!sel) { res.textContent = '選択肢を選んでください。'; return; }
          const ok = +sel.value === sc.answer; atc.classList.remove('hidden');
          res.className = 'res small ' + (ok ? 'ok' : 'ng');
          res.textContent = '';
          res.append(h('div', { text: `${ok ? '正解' : '不正解'}：正しい復唱は「${sc.options[sc.answer]}」` }), h('div', { text: '理由：' + sc.why }), h('div', { text: '聞き取れない・確信がないとき：' + sc.clarify }));
          S.progress.atc[sc.id] = S.progress.atc[sc.id] || ok; TR.saveProgress(store, S.progress);
        }), res,
        h('div', { class: 'small' }, '参考：', ...sc.refs.map(k => SF.SRC[k]).filter(Boolean).map(r => h('a', { href: r.url, target: '_blank', rel: 'noopener noreferrer', style: 'margin-right:8px' }, r.label))));
      pg.append(card);
    }
  }

  // ---------------------------------------------------------------- records
  let recSel = null;
  function download(name, text) {
    const a = h('a', { href: URL.createObjectURL(new Blob([text], { type: 'application/json' })), download: name });
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function renderRecords() {
    const pg = $('#recPage'); pg.textContent = '';
    const recs = TR.loadRecords(store).slice().reverse();
    const file = h('input', { type: 'file', accept: 'application/json,.json', style: 'display:none', onchange: async e => {
      const f = e.target.files[0]; if (!f) return;
      try { const j = TR.importJSON(await f.text()); TR.saveRecords(store, TR.mergeRecords(TR.loadRecords(store), j.records)); S.progress = TR.mergeProgress(S.progress, j.progress); TR.saveProgress(store, S.progress); flash(`読み込みました（記録 ${j.records.length} 件）`, 'good'); }
      catch (err) { flash('読み込めません：' + err.message, 'bad'); }
      renderRecords();
    } });
    pg.append(h('h2', { text: '訓練記録（この端末のブラウザに保存）' }),
      h('p', { class: 'small', style: 'color:#f3d9a4', text: TR.RECORD_NOTE }),
      h('p', { class: 'small mute', text: '保存するもの：課題・日時・レベル・モード・達成度・条件内時間・高度と速度の履歴・イベント・メモ。保存しないもの：API キー、Google のトークンや地形データ、個人情報。' }),
      h('div', { class: 'row' }, btn('JSON に書き出す', () => download(`flight-lab-record-${new Date().toISOString().slice(0, 10)}.json`, TR.exportJSON(TR.loadRecords(store), S.progress)), '', 'primary'),
        btn('JSON から読み込む（統合）', () => file.click()), file,
        btn('すべて削除', () => { if (confirm('この端末の学習記録（訓練記録・進み具合）をすべて削除しますか？')) { TR.saveRecords(store, []); S.progress = TR.sanitizeProgress({}); TR.saveProgress(store, S.progress); renderRecords(); } }, '', 'danger')));
    if (!store) pg.append(h('p', { class: 'small', style: 'color:#ffb3b3', text: 'このブラウザでは localStorage が使えないため、記録は保存されません（JSON の書き出しは使えます）。' }));
    if (!recs.length) { pg.append(h('p', { class: 'mute', text: 'まだ記録はありません。段階課題を終えると自動で保存されます。' })); return; }
    const tbl = h('table', { class: 'recs' }, h('tr', {}, ...['日時', '課題', 'レベル', 'モード', '結果', '達成度', '条件内', '練習時間'].map(t => h('th', { text: t }))));
    for (const r of recs) tbl.append(h('tr', { onclick: () => { recSel = r.id; renderRecDetail(); } },
      h('td', { text: new Date(r.datetime).toLocaleString('ja-JP') }), h('td', { text: r.taskTitle }), h('td', { text: r.levelName }), h('td', { text: r.mode === 'free' ? '自由練習' : '段階課題' }),
      h('td', { class: 'res-' + r.result, text: { success: '達成', fail: '未達成', abort: '中断', free: '—' }[r.result] }), h('td', { text: r.mode === 'free' ? '—' : `${r.achievementPct}%` }), h('td', { text: `${r.inCondSec} 秒` }), h('td', { text: `${r.practiceSec} 秒` })));
    pg.append(tbl, h('div', { id: 'recDetail' }));
    if (recSel) renderRecDetail();
  }
  function renderRecDetail() {
    const box = $('#recDetail'); if (!box) return; box.textContent = '';
    const all = TR.loadRecords(store), r = all.find(x => x.id === recSel); if (!r) return;
    const cv = h('canvas', { width: 900, height: 200 });
    const memo = h('textarea', { rows: 3 }); memo.value = r.memo;
    box.append(h('h3', {}, `${r.taskTitle}（${r.levelName}）— ${new Date(r.datetime).toLocaleString('ja-JP')}`),
      h('p', { class: 'small', text: `${r.reason || ''}` }),
      h('div', { class: 'small mute', text: `高度（ft・青）と速度（kt・緑）の履歴　${r.sampleSec} 秒ごと` }), cv,
      h('h4', { text: '段階' }), h('ul', { class: 'small' }, ...r.stages.map((s2, i) => h('li', { text: `${i + 1}. ${s2.label}：${s2.done ? `完了 ${s2.t} 秒` : '未完了'}${s2.resets ? `・リセット ${s2.resets} 回` : ''}` }))),
      h('h4', { text: 'イベント' }), h('ul', { class: 'small' }, ...(r.events.length ? r.events.map(e => h('li', { text: `${e.t} 秒：${e.type}${e.fpm != null ? ` ${e.fpm} fpm` : ''}${e.why ? ` ${e.why}` : ''}${e.result ? ` ${e.result}` : ''}` })) : [h('li', { class: 'mute', text: 'なし' })])),
      h('h4', { text: 'メモ' }), memo,
      h('div', { class: 'row' }, btn('メモを保存', () => { r.memo = memo.value; TR.saveRecords(store, all); flash('保存しました', 'good'); }, '', 'primary'), btn('この記録を削除', () => { TR.deleteRecord(store, r.id); recSel = null; renderRecords(); }, '', 'danger')));
    const g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
    g.fillStyle = '#0b1015'; g.fillRect(0, 0, W, Hh);
    const plot = (a, col) => { if (a.length < 2) return; const mn = Math.min(...a), mx = Math.max(...a), rg = Math.max(1, mx - mn); g.strokeStyle = col; g.lineWidth = 2; g.beginPath(); a.forEach((v, i) => { const x = 10 + i / (a.length - 1) * (W - 20), y = Hh - 14 - (v - mn) / rg * (Hh - 28); i ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke(); g.fillStyle = col; g.font = '12px sans-serif'; g.fillText(`${mn}〜${mx}`, col === '#5fb3ff' ? 12 : W - 110, 14); };
    plot(r.altHist, '#5fb3ff'); plot(r.spdHist, '#4fd18b');
  }

  // ---------------------------------------------------------------- Google 3D settings
  function renderG3d() {
    const pg = $('#g3dPage'); pg.textContent = '';
    const st = G ? G.status() : { state: 'unavailable', msg: 'WebGL2 が使えないため利用できません' };
    const key = h('input', { type: 'password', id: 'gkey', autocomplete: 'off', spellcheck: 'false', placeholder: 'Google Maps Platform の API キー', 'aria-label': 'API キー' });
    pg.append(h('h2', { text: 'Google Photorealistic 3D Tiles（外部景観・任意）' }),
      h('p', { text: 'Sanford 周辺（KSFB 付近、表示原点 約 28.777, −81.238）の外部景観に、Google の公式 Map Tiles API（Photorealistic 3D Tiles）を使えます。オンライン時のみ・任意です。使わなくても教材・飛行訓練はすべて動きます。' }),
      h('ul', { class: 'small' },
        h('li', { text: 'API キーはこのページのメモリだけに保持します。localStorage・学習記録・JSON・URL には保存しません。ページを閉じる・再読み込みすると消えます。' }),
        h('li', { text: 'キーは Google のタイル配信先（tile.googleapis.com）へのリクエストにだけ付けます。他のサーバーへは送りません。' }),
        h('li', { text: 'Google の公式 Map Tiles API だけを使います。Street View 画像の取得・スクレイピング・保存、非公式 API は使いません。タイルを保存・事前取得（キャッシュ）しません。' }),
        h('li', { text: 'Google のデータは外部景観の表示だけに使います。建物・地形との衝突判定、実在空港への正確な接地、滑走路の抽出、空域・NOTAM・飛行計画・管制は実装しません。離着陸の練習は架空の LAB RWY 36 で行います。' }),
        h('li', { text: '表示中は画面に Google のロゴ表記（Google Maps）とデータ提供元（著作権表示）を表示します。' }),
        h('li', { text: '利用は Google Maps Platform の課金対象です（ルートのタイル要求でセッションが始まり、約 3 時間有効）。無料枠・料金・利用上限は Google の最新の案内を確認し、キーには API の制限（Map Tiles API のみ）とアプリケーション制限を設定してください。' })),
      h('div', { class: 'keyfield' }, key, btn('接続', () => { if (!G) return; G.setKey(key.value.trim()); key.value = ''; G.start(); renderG3d(); }, '', 'primary'), btn('切断（キーも消去）', () => { if (G) { G.stop(true); } renderG3d(); })),
      h('div', { class: 'row' }, btn('Sanford 上空へ（自由練習）', () => { S.freeStart = 'sfb'; showTab('fly'); start(S.taskId, S.levelId, 'free'); })),
      h('h3', { text: '状態' }), h('div', { class: 'status', id: 'gstatus', text: statusText(st) }),
      h('h3', { text: '高さ合わせ（教材の平らな地面 55 ft と Google の地形の差）' }),
      h('p', { class: 'small mute', text: 'Google のタイルの高さは楕円体高のため、表示原点付近のタイルの高さから自動で合わせます（推定）。ずれて見えるときは手動で調整できます。' }),
      h('div', { class: 'row' }, btn('−5 m', () => G && G.nudge(-5)), btn('+5 m', () => G && G.nudge(5)), btn('自動に戻す', () => G && G.nudge(null))),
      h('h3', { text: '規約・帰属表示・参考' }),
      h('ul', { class: 'small' }, ...[
        ['Photorealistic 3D Tiles（Map Tiles API）概要', 'https://developers.google.com/maps/documentation/tile/3d-tiles'],
        ['Map Tiles API のポリシー（帰属表示など）', 'https://developers.google.com/maps/documentation/tile/policies'],
        ['Google Maps Platform 利用規約', 'https://cloud.google.com/maps-platform/terms'],
        ['Map Tiles API の利用量と課金', 'https://developers.google.com/maps/documentation/tile/usage-and-billing'],
        ['API キーの制限（ベストプラクティス）', 'https://developers.google.com/maps/api-security-best-practices'],
      ].map(([l, u]) => h('li', {}, h('a', { href: u, target: '_blank', rel: 'noopener noreferrer' }, l)))));
  }
  function statusText(st) {
    const L = [`状態：${({ off: '未接続', starting: '接続中…', on: '表示中', error: 'エラー', unavailable: '利用不可' })[st.state] || st.state}`];
    if (st.msg) L.push(st.msg);
    if (st.state === 'on' || st.tiles) L.push(`タイル：表示 ${st.drawn || 0}／読み込み済み ${st.tiles || 0}／読み込み中 ${st.loading || 0}`, `高さ合わせ：${st.offset == null ? '推定中' : `${st.offset.toFixed(1)} m`}${st.manual ? '（手動）' : '（自動）'}`, `データ提供元：${st.credits || '—'}`);
    L.push(`キー：${st.hasKey ? 'メモリ内にあり（保存はしていません）' : 'なし'}`);
    return L.join('\n');
  }
  setInterval(() => { const el = $('#gstatus'); if (el && G && $('#tab-g3d').classList.contains('on')) el.textContent = statusText(G.status()); }, 1000);

  // ---------------------------------------------------------------- about
  function renderAbout() {
    const pg = $('#aboutPage'); pg.textContent = '';
    pg.append(h('h2', { text: 'このアプリについて' }),
      h('p', {}, h('b', { text: '本アプリは公開情報を基にした非公式の自主学習用教材です。実機訓練、教官の指示、POH/AFM、SOP、航空法規を優先してください。' })),
      h('h3', { text: 'これは何ではないか' }),
      h('ul', {}, ...['ANA の公式ソフトウェア・公式教材ではありません。ANA の SOP（標準運航手順）の再現でもありません。', '認定された訓練装置（FTD / FFS など）ではなく、飛行時間・技能・資格（ソロ、ライセンス等）の証明になりません。', '実機の性能を再現していません。速度・高度・許容差・接地基準はすべて仮想教材値です。', '実際の空港・空域・管制では使えません（NOT FOR NAVIGATION）。実際の管制にもつながりません。', '実機訓練の代わりにはならず、技能の向上を保証するものでもありません。'].map(t => h('li', { text: t }))),
      h('h3', { text: '実装したもの' }),
      h('ul', { class: 'small' }, ...[
        '簡略化した単発プロペラ機の飛行モデル（揚力・抗力・推力・重力・迎角・失速警報・ピッチ/バンク/ラダー・トリム・フラップ・風・IAS/TAS/GS/TRK/VSI/高度、エンジン停止と滑空、離陸・着陸・滑走路逸脱・ハードランディングの判定）',
        'G1000 型の配置と基本概念を学ぶ教材表示：PFD（姿勢・バンク目盛・速度/高度テープ・VSI・HSI・HDG バグ・ALT SEL・BARO・CDI・GS・TRK・AOA・エンジン状態・予備計器）、オーディオパネル（送信不可）、MFD（MAP/FPL・架空訓練点・距離・ETE・XTK・エンジン表示）',
        '12 の飛行課題 × 3 レベル（導入・基礎・精度）、連続保持による評価、ヒント、振り返り、学習記録（JSON 書き出し・読み込み）',
        '16 章の教科書（日本語の説明・英語の用語・例・注意・確認問題 2 問・参考資料）、6 段階のカリキュラム',
        'Sanford の資料（滑走路・Hot Spot・空域・模式図）と英語 ATC の復唱練習 6 場面（音声合成）',
        'Google Photorealistic 3D Tiles による Sanford 周辺の外部景観（任意・オンライン時のみ・キーはメモリのみ）'].map(t => h('li', { text: t }))),
      h('h3', { text: '実装していないもの（未実装）' }),
      h('ul', { class: 'small' }, ...[
        '自動操縦（HDG / ALT への追従）— 意図的に未実装', '油圧・油温・EGT・電圧・電流（MFD では「—」表示）', '双発機（Seminole）の飛行モデル・片発停止の操縦（第 15 章は座学のみ）',
        'エンジンの再始動手順、混合比・キャブヒート・燃料タンク切替', '実在空港の滑走路・誘導路での離着陸、Google の建物・地形との衝突', '実空域・NOTAM・飛行計画・実際の管制、音声認識・録音・送信', '雲・視程の変化・夜間・乱気流モデル（突風は簡易）',
        'G1000 の全機能（地図データ・地形警報・トラフィック・タイマー・インセット地図など）'].map(t => h('li', { text: t }))),
      h('h3', { text: 'データとプライバシー' }),
      h('p', { class: 'small', text: '学習記録と進み具合はこのブラウザの localStorage にだけ保存します（サーバーへ送りません）。Google 3D を接続したときだけ、Google のタイル配信先へ API キー付きでタイルを要求します。キーは保存しません。外部リンク（参考資料）はクリックしたときだけ開きます。' }),
      h('h3', { text: 'ライセンス' }),
      h('p', { class: 'small', text: 'Draco 3D データ圧縮デコーダー（Google、Apache License 2.0）を同梱しています（Google 3D タイルの展開用）。' }),
      FL.DRACO_LICENSE ? h('details', {}, h('summary', { text: 'Apache License 2.0（全文）' }), h('pre', { class: 'small', style: 'white-space:pre-wrap', text: FL.DRACO_LICENSE })) : h('p', { class: 'small' }, h('a', { href: 'https://www.apache.org/licenses/LICENSE-2.0', target: '_blank', rel: 'noopener noreferrer' }, 'Apache License 2.0')),
      h('p', { class: 'note', text: `FLIGHT LAB ${FL.BUILD_INFO || '(開発版)'}` }));
  }

  // ---------------------------------------------------------------- layout, buttons, first-run notice
  const LAYOUTS = ['38vh', '52vh', '64vh'];
  $('#bView').addEventListener('click', toggleView);
  $('#bPause').addEventListener('click', togglePause);
  $('#bLayout').addEventListener('click', () => { S.layout = (S.layout + 1) % LAYOUTS.length; document.documentElement.style.setProperty('--panelH', LAYOUTS[S.layout]); });
  $('#bSound').addEventListener('click', () => { soundInit(); S.sound = !S.sound; if (AC && AC.state === 'suspended') AC.resume(); $('#bSound').textContent = S.sound ? '音 ON' : '音 OFF'; $('#bSound').setAttribute('aria-pressed', String(S.sound)); });
  $('#bFull').addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(() => {}); });
  try { if (!store || store.getItem('flightlab-ack-v1') !== '1') $('#ack').hidden = false; } catch (e) { $('#ack').hidden = false; }
  $('#ackOk').addEventListener('click', () => { $('#ack').hidden = true; try { store && store.setItem('flightlab-ack-v1', '1'); } catch (e) { /* ignore */ } });

  // ---------------------------------------------------------------- start up
  try { scene = FL.scene.createScene($('#view3d')); } catch (e) { errors.push('scene: ' + e.message); scene = null; }
  if (!scene) $('#viewNote').textContent = 'WebGL2 が使えないため外部視界を表示できません（計器・課題は使えます）';
  try { G = scene && FL.google3d ? FL.google3d.create(scene.gl) : null; } catch (e) { errors.push('google3d: ' + e.message); G = null; }
  renderToc(); openChapter(1); renderSanford(); renderAbout(); renderCurriculum();
  start('t1', 'intro', 'staged');
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- test hooks (used by the automated browser test)
  window.__lab = {
    errors, start: (t, l, m) => start(t, l, m), state: () => ({ o: { ...S.k.s.out }, run: { stage: S.k.run.stage, done: S.k.run.done, result: S.k.run.result, t: S.k.run.t, items: S.k.run.items }, av: S.k.av, view: S.view, paused: S.paused, hood: hoodOn() }),
    step(sec, ctl) { const s = S.k.s; for (let i = 0; i < sec * 120; i++) { if (ctl) Object.assign(s.ctl, ctl); P.step(s, H); } S.ctx = TR.makeCtx(s, S.k.av); TR.update(S.k.run, S.ctx, sec); events(); drawPanels(); return { ...s.out }; },
    pause: v => { if (S.paused !== v) togglePause(); }, control: (w, d, b) => ctl(w, d, b), records: () => TR.loadRecords(store), progress: () => S.progress,
    storageDump: () => { const o = {}; if (store) for (let i = 0; i < store.length; i++) { const k = store.key(i); o[k] = store.getItem(k); } return o; },
    google: () => (G ? G.status() : null), googleSetKey: k => G && G.setKey(k), sceneOk: () => !!scene, showTab,
  };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
