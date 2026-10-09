// FLIGHT LAB — app.js
// The page: the flight loop (physics 120 Hz, the school's evaluation, the out-the-window view, the G1000-type panel
// at 30 Hz), the controls of 空島フライト (keyboard pitch hold, stick curves, rudder, throttle, trim, flaps, gear,
// brakes; a gamepad with the same mapping), the instructor panel (what to do, which keys, the guide, the targets,
// the continuous hold, the hints), the control-status strip (what each control is doing now and its key), the
// checklist / ATC / estimate dialogs, sound, and the screens (pages.js draws the menu's pages).
// Privacy: the Google API key lives only in memory (google3d.js); records and preferences never contain it.
(function (FL) {
  'use strict';
  const P = FL.physics, AV = FL.avionics, SC = FL.school, SY = FL.syllabus;
  const DEG = Math.PI / 180, clamp = P.clamp;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  // a small DOM builder: text is set as text unless 'html' is given (static, trusted content only)
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
  const esc = t => String(t).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const fmt = (v, d = 0) => (Number.isFinite(v) ? v.toFixed(d) : '—');
  const w180 = a => ((a % 360) + 540) % 360 - 180;
  const store = (() => { try { const k = '__fl_t'; localStorage.setItem(k, '1'); localStorage.removeItem(k); return localStorage; } catch (e) { return null; } })();
  const errors = [];
  window.addEventListener('error', e => errors.push(String(e.message || e)));

  // ---------------------------------------------------------------- preferences (no secrets: only these fields)
  const PREF_KEY = 'flightlab-prefs-v2';
  const PREFS0 = { sens: 'low', hold: 'hold', autoRud: true, assist: false, sound: false, level: 'intro', ack: false, layout: 0 };
  function loadPrefs() { try { const p = JSON.parse((store && store.getItem(PREF_KEY)) || '{}'); const o = { ...PREFS0 }; for (const k of Object.keys(PREFS0)) if (typeof p[k] === typeof PREFS0[k]) o[k] = p[k]; return o; } catch (e) { return { ...PREFS0 }; } }
  function savePrefs() { try { store && store.setItem(PREF_KEY, JSON.stringify(S.prefs)); } catch (e) { /* storage unavailable */ } }

  // ---------------------------------------------------------------- state
  const S = {
    L: null, screen: 'menu', view: 'cockpit', paused: false, help: false, prefs: loadPrefs(), progress: SC.loadProgress(store),
    keys: new Set(), pad: { known: null, prev: [], navT: 0, navDir: '' }, rTrim: 0, recId: null, lastLessonId: null, look: 0,
  };
  let scene = null, G = null;
  const app = { S, h, $, $$, esc, fmt, store, toast, savePrefs, startLesson, startFree, openScreen, closeScreens, resume, pause, speak, errors, ctl, renderAudio, renderSoftkeys };

  // ---------------------------------------------------------------- toast
  function toast(text, ms = 2200, kind = '') {
    const box = $('#toast'), d = h('div', { class: kind, text });
    box.append(d); while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => { d.style.opacity = '0'; setTimeout(() => d.remove(), 450); }, ms);
  }

  // ---------------------------------------------------------------- starting a lesson / free flight
  function lessonOpts() { return { sens: S.prefs.sens, autoRud: S.prefs.autoRud }; }
  function startLesson(id, levelId = S.prefs.level) {
    const def = SC.lesson(id); if (!def || !def.steps) return;
    S.L = SC.startLesson(id, levelId, lessonOpts());
    S.L.s.opts.assist = false;
    S.lastLessonId = id; S.recId = null; S.rTrim = 0; S.keys.clear();
    S.view = 'cockpit'; updateViewBtn();
    closeScreens(); S.screen = 'fly'; S.paused = false;
    renderAudio(); renderSoftkeys();
    toast(`${def.title}（${S.L.level.name}）を開始。教官の指示は左上、使うキーは H で確認できます`, 3600);
  }
  function startFree(startId = 'rwy', aircraft = 'pa28', wind) {
    const W = { calm: { rel: 0, kt: 0, gust: 0.3 }, light: { rel: 10, kt: 5, gust: 0.5 }, cross: { rel: 60, kt: 12, gust: 1.2 }, gusty: { rel: 70, kt: 15, gust: 2.5 } }[wind || 'light'];
    S.L = SC.startFree(startId, aircraft, { ...lessonOpts(), assist: S.prefs.assist, wind: W });
    S.recId = null; S.rTrim = 0; S.keys.clear();
    renderAudio(); renderSoftkeys();
  }

  // ---------------------------------------------------------------- the controls (空島フライト's keyboard and gamepad)
  const FLY_HELD = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyB'];
  const pressed = (...c) => c.some(k => S.keys.has(k));
  function typing(e) { const t = e.target; return t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable); }
  const flying = () => S.screen === 'fly' && !S.paused && S.L && !S.L.done;
  window.addEventListener('keydown', e => {
    if (typing(e)) return;
    if (S.screen === 'fly' && FLY_HELD.includes(e.code)) e.preventDefault();
    if (S.screen === 'fly') S.keys.add(e.code);
    if (e.repeat) return;
    // the screens: Esc goes back
    if (S.screen !== 'fly') {
      if (e.code === 'Escape') { e.preventDefault(); backFromScreen(); }
      if (S.screen === 'pause' && e.code === 'KeyP') { e.preventDefault(); resume(); }
      return;
    }
    if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); if (S.help) { toggleHelp(false); return; } pause(); return; }
    if (!S.L) return;
    if (e.code === 'KeyH') { toggleHelp(); return; }
    if (e.code === 'KeyC') { cycleView(); return; }
    if (S.paused || S.L.done) return;
    if ((e.code === 'Enter' || e.code === 'NumpadEnter') && S.L.check) { e.preventDefault(); checklistNext(); return; }
    if (/^(Digit|Numpad)[123]$/.test(e.code) && S.L.atc) { e.preventDefault(); answerAtc(+e.code.slice(-1) - 1); return; }
    const act = { KeyV: e.shiftKey ? 'flapsUp' : 'flaps', KeyG: 'gear', KeyT: e.shiftKey ? 'trimReset' : 'trim', KeyL: 'level', KeyU: 'autoRud', BracketLeft: e.shiftKey ? 'restart0' : 'feather0', BracketRight: e.shiftKey ? 'restart1' : 'feather1', KeyZ: 'rtrimL', KeyX: 'rtrimR' }[e.code];
    if (act) { e.preventDefault(); doAction(act); }
  });
  window.addEventListener('keyup', e => { S.keys.delete(e.code); });
  window.addEventListener('blur', () => S.keys.clear());
  // the actions, each with a short explanation of what it did and why
  function doAction(a) {
    const L = S.L; if (!L) return; const s = L.s, A = s.A;
    if (a === 'flaps' || a === 'flapsUp') {
      if (!A.wing.flap) return;
      const n = A.flapLabels.length;
      s.flapIdx = a === 'flaps' ? (s.flapIdx + 1) % n : Math.max(0, s.flapIdx - 1);
      const lab = A.flapLabels[s.flapIdx], fe = A.v.fe, over = s.flapIdx > 0 && s.out.ias > fe;
      toast(`フラップ ${lab}${s.flapIdx === 0 ? '：揚力と抗力が減り、速く飛べる（巡航・上昇）' : '：揚力と抗力が増え、遅く・深い角度で降りられる'}${over ? `　⚠ 白い帯の上限 Vfe ${fe} kt を超えています` : ''}`, 2600, over ? 'bad' : '');
    } else if (a === 'gear') {
      if (A.gear.fixed) { toast('この機体（Archer）の脚は固定式で、上げ下げできません', 1800); return; }
      if (s.onGround && s.gearDown) { toast('地上では脚を上げられません', 1600); return; }
      s.gearDown = !s.gearDown;
      toast(s.gearDown ? '脚 DOWN：着陸に備える（緑のランプ 3 つで確認）。抗力が増える' : '脚 UP：抗力が減って上昇・加速しやすくなる（正の上昇を確認してから）', 2400);
    } else if (a === 'trim') {
      if (s.onGround) { s.trim = 0; s.trimHold = 0; toast('地上ではトリムを離陸位置（中立）にしました', 1500); return; }
      if (s.opts.assist) { toast('操縦アシスト中はトリムは自動です', 1500); return; }
      s.trimHold = s.elev; s.trim = P.trimLevel(s);
      toast(`トリム ${s.trim >= 0 ? '機首上げ' : '機首下げ'} ${Math.abs(Math.round(s.trim / P.TRIM_MAX * 100))}%：いまの速度で、手を離してもこの姿勢が続くように合わせました`, 2600);
    } else if (a === 'trimReset') { s.trim = 0; s.trimHold = 0; toast('トリムを中立（離陸位置）に戻しました', 1400); }
    else if (a === 'level') {
      if (!L.free) { toast('L（水平に戻すアシスト）は自由飛行だけで使えます。訓練では自分で回復します', 2200); return; }
      s.opts.levelT = 4; toast('数秒間、自動で翼を水平・水平飛行に戻します（教材の補助）', 1800);
    } else if (a === 'autoRud') {
      s.opts.autoRud = !s.opts.autoRud; S.prefs.autoRud = s.opts.autoRud; savePrefs();
      toast(s.opts.autoRud ? '自動ラダー ON：ボールを自動で中央に保ちます' : '自動ラダー OFF：Q / E でボールを中央に（離陸・上昇は右ラダー E。片発では生きている側の足）', 2600);
    } else if (a === 'feather0' || a === 'feather1') {
      if (!A.twin) { toast('フェザーは双発機（Seminole）のプロペラ操作です', 1600); return; }
      const i = a === 'feather0' ? 0 : 1, e = s.eng[i], side = i ? '右' : '左';
      if (e.feather) { toast(`${side}のプロペラはすでにフェザーです`, 1400); return; }
      e.feather = true; e.cut = true;
      if (!e.failed) toast(`⚠ ${side}エンジンは動いていました。生きているエンジンを止めました（重大な誤り）。Identify → Verify → Feather の順で`, 5000, 'bad');
      else toast(`${side}のプロペラをフェザー：羽根を風に平行にして回転を止め、抗力を大きく減らしました`, 2600, 'good');
    } else if (a === 'restart0' || a === 'restart1') {
      if (!A.twin) return; if (!L.free) { toast('訓練中はエンジンの再始動はできません', 1600); return; }
      const e = s.eng[a === 'restart0' ? 0 : 1]; Object.assign(e, { feather: false, cut: false, failed: false }); toast('エンジンを再始動（自由飛行の補助）', 1400);
    } else if (a === 'rtrimL' || a === 'rtrimR') {
      S.rTrim = clamp(S.rTrim + (a === 'rtrimR' ? 0.05 : -0.05), -0.6, 0.6);
      toast(`ラダートリム ${S.rTrim === 0 ? '中立' : `${S.rTrim > 0 ? '右' : '左'} ${Math.round(Math.abs(S.rTrim) * 100)}%`}：ラダーを踏み続けなくてよいように`, 1400);
    }
  }
  // the gamepad (standard mapping; a PS5 DualSense or an Xbox pad)
  function padInput(dt) {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = Array.from(pads || []).find(p => p && p.connected);
    if (!gp) { S.pad.known = null; return null; }
    if (S.pad.known !== gp.id) { S.pad.known = gp.id; toast(`コントローラーを認識しました（配置はガイドの「ゲームパッド」）${gp.mapping === 'standard' ? '' : '：このブラウザでは配置が標準ではないため、一部のボタンが違う場合があります'}`, 3600); }
    const dz = (v, z = 0.12) => Math.abs(v || 0) < z ? 0 : (v - Math.sign(v) * z) / (1 - z);
    const ax = gp.axes, b = i => (gp.buttons[i] ? gp.buttons[i].value : 0);
    const E = []; for (let i = 0; i < 18; i++) { const now = b(i) > 0.5, was = !!S.pad.prev[i]; S.pad.prev[i] = now; E[i] = now && !was; }
    const out = { stick: false, tr: 0, tp: 0, ty: 0, brake: false };
    if (S.screen !== 'fly') {
      // menus: the D-pad / left stick moves the focus, A (×) presses, B (○) goes back
      const ly = dz(ax[1], 0.5); let dir = E[12] ? -1 : E[13] ? 1 : 0;
      const held = ly < 0 ? 'u' : ly > 0 ? 'd' : ''; S.pad.navT -= dt;
      if (held && (held !== S.pad.navDir || S.pad.navT <= 0)) { dir = held === 'u' ? -1 : 1; S.pad.navT = held !== S.pad.navDir ? 0.4 : 0.14; }
      S.pad.navDir = held;
      if (dir) padNav(dir);
      if (E[0]) { const a = document.activeElement; if (a && a !== document.body && a.click) a.click(); }
      if (E[1]) backFromScreen();
      if (E[9] && S.screen === 'pause') resume();
      return out;
    }
    if (!S.L) return out;
    if (S.L.check && E[0]) checklistNext();
    if (S.L.atc) { if (E[2]) answerAtc(0); else if (E[1]) answerAtc(1); else if (E[3]) answerAtc(2); }
    const lx = dz(ax[0]), ly = dz(ax[1]), rx = dz(ax[2]), ry = dz(ax[3], 0.2);
    if (lx || ly) { out.stick = true; out.tr = lx; out.tp = ly; }
    out.ty = clamp(rx + (b(5) - b(4)), -1, 1);
    if (ry && !S.L.s.opts.assist) S.L.s.trim = clamp(S.L.s.trim + ry * 0.12 * dt, -P.TRIM_MAX, P.TRIM_MAX);
    S.L.s.thr = clamp(S.L.s.thr + (b(7) - b(6)) * 0.5 * dt, 0, 1);
    if (b(0) > 0.5 && !S.L.check) out.brake = true;
    if (!S.L.atc) { if (E[1]) doAction('flaps'); if (E[2]) doAction('flapsUp'); if (E[3]) cycleView(); }
    if (E[8]) doAction('gear');
    if (E[9]) { pause(); return out; }
    if (E[12] || E[13]) { const s = S.L.s; s.trim = clamp(s.trim + (E[13] ? 0.02 : -0.02), -P.TRIM_MAX, P.TRIM_MAX); }
    if (E[10]) doAction('level');
    if (E[11]) doAction('autoRud');
    if (E[14]) doAction('feather0');
    if (E[15]) doAction('feather1');
    if (E[16]) toggleHelp();
    return out;
  }
  function padNav(dir) {
    const root = [...$$('.screen')].find(e => !e.hidden); if (!root) return;
    const els = [...root.querySelectorAll('button, select, input, textarea, summary')].filter(e => !e.disabled && e.getClientRects().length);
    if (!els.length) return;
    let i = els.indexOf(document.activeElement); if (i < 0) i = dir > 0 ? -1 : els.length;
    const n = els[clamp(i + dir, 0, els.length - 1)]; n.focus(); n.scrollIntoView({ block: 'nearest' });
  }
  // every frame: the keys / pad → the pilot's inputs (as in 空島フライト)
  function updateControls(dt) {
    const L = S.L; if (!L) return; const s = L.s;
    if (!flying()) { s.pIn = 0; s.rIn = 0; s.rud = S.rTrim; s.brake = false; return; }
    let tp = (pressed('KeyS', 'ArrowDown') ? 1 : 0) - (pressed('KeyW', 'ArrowUp') ? 1 : 0);
    let tr = (pressed('KeyD', 'ArrowRight') ? 1 : 0) - (pressed('KeyA', 'ArrowLeft') ? 1 : 0);
    let ty = (pressed('KeyE') ? 1 : 0) - (pressed('KeyQ') ? 1 : 0);
    let analog = false, brake = pressed('KeyB', 'Space');
    let gp = null; try { gp = padInput(dt); } catch (e) { gp = null; }
    if (gp) { if (gp.stick) { tr = gp.tr; tp = gp.tp; analog = true; } if (gp.ty) ty = gp.ty; if (gp.brake) brake = true; }
    if (analog) { const ex = v => Math.sign(v) * Math.pow(Math.abs(v), 1.2); tr = ex(tr); tp = ex(tp); }
    // keys move the stick gradually (about 0.7 s to full) and it springs back to the centre when released
    const k = (cur, tgt) => (analog ? cur + (tgt - cur) * Math.min(1, 12 * dt) : cur + clamp(tgt - cur, -(tgt === 0 ? 3.5 : 0.67) * dt, (tgt === 0 ? 3.5 : 0.67) * dt));
    const cv = v => Math.sign(v) * Math.pow(Math.abs(v), 1.3);
    if (analog) { s.pKey = tp; s.rKey = tr; s.pIn = k(s.pIn, tp); s.rIn = k(s.rIn, tr); }
    else { s.pKey = k(s.pKey || 0, tp); s.rKey = k(s.rKey || 0, tr); s.pIn = cv(s.pKey); s.rIn = cv(s.rKey); }
    // the keyboard pitch hold: in the air W / S move the nose attitude to hold; released, it stays there
    s.keyHold = !analog && S.prefs.hold === 'hold';
    const thNow = P.attitude(s).pitch;
    if (!s.keyHold || (s.opts.levelT || 0) > 0 || s.pTgt == null || s.onGround) { s.pTgt = thNow; s.pHeld = 0; }
    if (s.keyHold && tp && !s.onGround) {
      s.pHeld = (s.pHeld || 0) + dt; const p0 = s.pTgt;
      s.pTgt = clamp(s.pTgt + tp * (s.pHeld < 0.5 ? 1.5 : 3) * dt, -20, 22);
      s.pRate = dt > 0 ? (s.pTgt - p0) / dt : 0;
    } else { s.pHeld = 0; s.pRate = 0; }
    if (s.keyHold && !s.onGround) s.pIn = 0;
    s.rudKey = (s.rudKey || 0) + clamp(ty - (s.rudKey || 0), -3 * dt, 3 * dt);
    s.rud = clamp(s.rudKey + S.rTrim, -1, 1);
    if (pressed('KeyR', 'PageUp')) s.thr = clamp(s.thr + 0.45 * dt, 0, 1);
    if (pressed('KeyF', 'PageDown')) s.thr = clamp(s.thr - 0.45 * dt, 0, 1);
    s.brake = brake;
  }

  // ---------------------------------------------------------------- the loop
  let last = performance.now(), acc = 0, panelT = 0, uiT = 0;
  const H = 1 / 120;
  function frame(now) {
    const dtr = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
    try { tick(dtr); } catch (e) { errors.push('tick: ' + e.message); }
    try { draw3d(); } catch (e) { errors.push('3D: ' + e.message); }
    panelT += dtr; uiT += dtr;
    if (panelT >= 1 / 30) { panelT = 0; try { drawPanels(); } catch (e) { errors.push('panel: ' + e.message); } }
    if (uiT >= 0.12) { uiT = 0; try { updateUi(); } catch (e) { errors.push('ui: ' + e.message); } }
    soundStep();
    requestAnimationFrame(frame);
  }
  function tick(dtr) {
    const L = S.L; if (!L) return;
    updateControls(dtr);
    // the menu shows the aircraft flying behind it (the assist holds it level); a paused or finished lesson stops
    const running = (S.screen === 'fly' && !S.paused && !L.done) || (S.screen === 'menu' && L.free);
    if (!running) { acc = 0; return; }
    if (S.screen === 'menu') { L.s.opts.assist = true; L.s.pIn = 0; L.s.rIn = 0; }
    acc += dtr; let n = 0;
    while (acc >= H && n < 30) { P.step(L.s, H); if (L.free) SC.freeUpdate(L, H); else SC.update(L, H); acc -= H; n++; }
    if (n === 30) acc = 0;
    if (S.screen === 'fly') { S.progress.time += n * H; }
    events();
    if (!L.free && L.done && S.screen === 'fly') lessonEnded();
    if (L.free && L.s.crashed && !L.crashNoted) { L.crashNoted = true; toast(`機体損傷：${L.s.crashReason}（メニュー → 自由飛行でやり直し）`, 5000, 'bad'); }
  }
  // physics events → messages (the touchdown is measured with the velocity before contact)
  function events() {
    const L = S.L, s = L.s;
    while (L.evSeen < s.events.length) {
      const e = s.events[L.evSeen++];
      if (S.screen !== 'fly') continue;
      if (e.type === 'touchdown') { S.progress.landings++; toast(`接地：${e.fpm} fpm・${e.kias} kt・中心線から ${Math.abs(e.cross)} m ${e.cross >= 0 ? '右' : '左'}${e.onRunway ? '' : '（滑走路外）'}${e.noseFirst ? '・前輪から' : ''}`, 3200, e.fpm > 600 || !e.onRunway ? 'bad' : 'good'); }
      if (e.type === 'hard_landing') toast(`ハードランディング（${e.fpm} fpm）：フレアが遅い・進入が速い／低いのが典型的な原因`, 4000, 'bad');
      if (e.type === 'runway_excursion') toast('滑走路逸脱：ラダーでセンターラインを保ち、横風ではエルロンを風上へ', 4000, 'bad');
      if (e.type === 'tail_strike') toast('テールストライク：機首の上げすぎ（フレアやローテーションで）', 3500, 'bad');
      if (e.type === 'engine_stop') toast(`エンジン停止：${e.why}`, 3500, 'bad');
      if (e.type === 'crash') toast(`機体損傷：${e.why}`, 5000, 'bad');
    }
  }
  // the end of a lesson: the record, the progress, the debrief
  function lessonEnded() {
    const L = S.L;
    if (L.endHandled) return; L.endHandled = true;
    SC.noteLesson(S.progress, L); SC.saveProgress(store, S.progress);
    const r = SC.addRecord(store, SC.recordFromLesson(L, '')); S.recId = r && r.id;
    setTimeout(() => { if (S.L === L) FL.pages(app).showDebrief(L); }, L.s.crashed ? 1500 : 600);
  }

  // ---------------------------------------------------------------- in-flight dialogs: checklist, ATC, the estimate
  function checklistNext() {
    const L = S.L, r = SC.checklistNext(L);
    if (!r.ok && r.item) { const li = $('#sch-check li.cur'); if (li) { li.classList.add('ng'); setTimeout(() => li.classList.remove('ng'), 600); } toast(L.hint, 2200, 'bad'); }
    renderDialogs(true);
  }
  function answerAtc(i) {
    const L = S.L, r = SC.answerAtc(L, i); if (!r) return;
    S.atcShow = { ok: r.ok, why: r.why, right: r.right, until: performance.now() + (r.ok ? 2600 : 5200) };
    renderDialogs(true);
  }
  let dlgKey = '';
  function renderDialogs(force) {
    const L = S.L, inFly = S.screen === 'fly' && L && !L.done;
    const ck = $('#sch-check'), at = $('#sch-atc'), es = $('#sch-est');
    // checklist
    if (inFly && L.check) {
      const C = SC.CHECKLISTS[L.check.id], key = 'c' + L.check.id + L.check.i;
      if (force || dlgKey !== key) {
        ck.textContent = '';
        ck.append(h('div', { class: 'sc-title', text: C.title }));
        const ol = h('ol'); C.items.forEach((it, i) => ol.append(h('li', { class: i < L.check.i ? 'ok' : i === L.check.i ? 'cur' : '' }, h('b', { text: it[0] }), h('span', { text: SC.checklistText(it, L.s) }))));
        ck.append(ol, h('div', { class: 'sc-foot', text: 'Enter（ゲームパッドは A / ×）で 1 項目ずつ確認。条件のある項目（フラップ・トリム・スロットル・脚など）は、その状態にしてから確認します。' }));
        ck.onclick = () => checklistNext(); dlgKey = key;
      }
      ck.hidden = false;
    } else ck.hidden = true;
    // ATC
    const show = S.atcShow && performance.now() < S.atcShow.until;
    if (inFly && (L.atc || show)) {
      const key = L.atc ? 'a' + L.atc.msg : 'r' + S.atcShow.why;
      if (force || dlgKey !== key) {
        at.textContent = '';
        if (L.atc) {
          at.append(h('div', { class: 'atc-msg', text: L.atc.msg }), h('div', { class: 'atc-q', text: '正しい応答（復唱）は？ 1〜3 キー（ゲームパッド：X / □＝1、B / ○＝2、Y / △＝3）' }));
          L.atc.opts.forEach((o, i) => at.append(h('button', { type: 'button', onclick: () => answerAtc(i) }, `${i + 1}. ${o}`)));
          if (/^LAB/.test(L.atc.msg)) speak(L.atc.msg.replace(/^[^"]*"|"$/g, ''));
        } else at.append(h('div', { class: 'atc-msg ' + (S.atcShow.ok ? 'ok' : 'ng'), text: (S.atcShow.ok ? '正解。' : `不正解。正しくは「${S.atcShow.right}」。`) + S.atcShow.why }));
        dlgKey = key;
      }
      at.hidden = false;
    } else at.hidden = true;
    // the diversion estimate
    const St = L && L.def.steps[L.step];
    if (inFly && St && St.estimate && !L.estimate) {
      if (!es.firstChild) {
        const f = (id, lab, ph) => h('label', {}, lab, ' ', h('input', { id, type: 'number', step: 'any', placeholder: ph, inputmode: 'decimal' }));
        es.append(h('div', { class: 'sc-title', text: '目的地変更：LAB-F への見積もり' }),
          h('p', { class: 'small', text: 'MFD の地図（レンジ環）と対地速度 GS から見積もります。所要時間 ≒ 距離 ÷ GS × 60（分）。入力中も飛行は続いています。' }),
          h('div', { class: 'row' }, f('estH', '針路（磁）', '例 150'), f('estD', '距離 NM', '例 6.0'), f('estT', '時間 分', '例 3.5')),
          h('button', { type: 'button', class: 'primary', onclick: () => { const r = SY.submitEstimate(S.L, { hdg: $('#estH').value, dist: $('#estD').value, eteMin: $('#estT').value }); toast(`見積もりを記録（正解：${r.truth.brg}°・${r.truth.dist} NM・${r.truth.eteMin} 分）`, 4200); es.textContent = ''; es.hidden = true; } }, '見積もりを確定'));
      }
      es.hidden = false;
    } else { if (es.firstChild) es.textContent = ''; es.hidden = true; }
  }

  // ---------------------------------------------------------------- the instructor panel, the control strip, the key help
  function updateUi() {
    const L = S.L; if (!L) return;
    $('#hood').hidden = !(S.screen === 'fly' && L.hood && !L.done);
    renderDialogs(false);
    const sp = $('#sch-panel'), fp = $('#free-panel');
    sp.hidden = !(S.screen === 'fly' && !L.free);
    fp.hidden = !(S.screen === 'fly' && L.free);
    $('#ctl-strip').hidden = S.screen !== 'fly';
    if (!L.free && !sp.hidden) {
      const St = L.def.steps[L.step];
      if (St) {
        const st = L.st, lv = L.level;
        $('#sp-step').textContent = `${L.def.title}（${lv.name}）　項目 ${L.step + 1} / ${L.def.steps.length}：${St.name}`;
        $('#sp-say').textContent = L.sayText;
        $('#sp-keys').textContent = L.keysText ? '使うキー：' + L.keysText : '';
        $('#sp-guide').textContent = lv.guide ? L.guideText || '' : '';
        const chips = $('#sp-tgt'); chips.textContent = '';
        if (St.tgt) for (const [k, q] of Object.entries(st.stats)) {
          const lab = SC.TGT_LABEL[k] || [k, ''], r = Math.abs(q.d) / q.tol, dp = SC.DP[k] || 0;
          const tvS = ['hdg', 'rhdg', 'dwhdg', 'trk'].includes(k) ? '' : ` ${Math.round(q.tv * 10 ** dp) / 10 ** dp}${lab[1]}`;
          chips.append(h('span', { class: r <= 0.6 ? 'ok' : r <= 1 ? 'warn' : 'ng', title: `許容 ±${q.tol} ${lab[1]}` }, `${lab[0]}${tvS}　${q.d >= 0 ? '+' : ''}${q.d.toFixed(dp)}`));
        }
        let prog = '', frac = null;
        if (St.dur) prog = `残り ${Math.max(0, Math.ceil(St.dur - st.t))} 秒`;
        else if (st.need) { prog = `基準内を連続 ${st.holdT.toFixed(0)} / ${st.need} 秒（外れると 0 に戻る）`; frac = st.holdT / st.need; }
        else if (St.max && !St.checklist && !St.atc) prog = `経過 ${Math.floor(st.t)} 秒`;
        if (st.turned && Math.abs(st.turned) > 5 && /旋回/.test(St.name)) prog += `　旋回 ${Math.round(Math.abs(st.turned))}°`;
        $('#sp-progtxt').textContent = prog;
        $('#sp-holdbar').hidden = frac == null; if (frac != null) $('#sp-holdbar i').style.width = Math.round(clamp(frac, 0, 1) * 100) + '%';
        $('#sp-hint').textContent = L.hint ? '教官：' + L.hint : '';
      }
    }
    if (L.free && !fp.hidden) {
      const c = L.last;
      fp.innerHTML = `<h3>自由飛行：${esc(L.A.short)}</h3><p>評価はありません。H で操作の説明、Esc / P で一時停止（記録の保存・メニュー）。</p><p>LAB RWY 36 まで ${fmt(Math.hypot(c.along - 600, c.cross) / 1852, 1)} NM・高度 ${Math.round(c.alt)} ft・速度 ${Math.round(c.kias)} kt</p>`;
    }
    if (S.screen === 'fly') renderStrip();
    if (S.help) renderHelp();
  }
  // the control strip: every control, its key, what it is doing now
  function renderStrip() {
    const L = S.L, s = L.s, o = s.out, A = s.A, V = A.v;
    const pct = v => `${Math.round(v * 100)}%`, meter = (f, col) => `<div class="meter"><i style="width:${Math.round(clamp(f, 0, 1) * 100)}%;${col ? 'background:' + col : ''}"></i></div>`;
    const engTxt = A.twin ? s.eng.map((e, i) => `${i ? 'R' : 'L'} ${e.feather ? 'FTHR' : e.run ? Math.round(e.rpm) : 'STOP'}`).join(' / ') : `${Math.round(s.rpm)} rpm`;
    const deadAny = s.eng.some(e => !e.run);
    const pitchTxt = s.keyHold && !s.onGround ? `保持 ${fmt(s.pTgt, 1)}°` : `操縦桿 ${s.pIn >= 0 ? '引き' : '押し'} ${pct(Math.abs(s.pIn))}`;
    const rudTxt = `${s.opts.autoRud ? '自動 ' : ''}${s.rudEff == null ? '0' : (s.rudEff >= 0 ? 'R ' : 'L ') + pct(Math.abs(s.rudEff))}${S.rTrim ? `（トリム ${S.rTrim > 0 ? 'R' : 'L'}）` : ''}`;
    const trimPct = Math.round(s.trim / P.TRIM_MAX * 100), flapMoving = Math.abs(P.FLAP_DEG[s.flapIdx] - s.flapDeg) > 0.5;
    const rows = [
      ['R / F', 'スロットル', `${pct(s.thr)}　${engTxt}`, meter(s.thr), deadAny ? 'bad' : ''],
      ['W / S', '機首（ピッチ）', `${pitchTxt}（いま ${fmt(o.pitch, 1)}°）`, '', ''],
      ['A / D', '傾き（バンク）', `${fmt(o.bank, 0)}°`, '', Math.abs(o.bank) > 45 ? 'warn' : ''],
      ['Q / E', 'ラダー', rudTxt, '', ''],
      ['T', 'トリム', `${trimPct === 0 ? '中立' : (trimPct > 0 ? '機首上げ ' : '機首下げ ') + Math.abs(trimPct) + '%'}`, '', ''],
      ['V', 'フラップ', `${A.flapLabels[s.flapIdx]}${flapMoving ? '（作動中）' : ''}`, '', s.flapIdx > 0 && o.ias > V.fe ? 'bad' : ''],
    ];
    if (!A.gear.fixed) rows.push(['G', '脚', s.gearPos > 0.98 ? 'DOWN ●●●' : s.gearPos < 0.02 ? 'UP' : '作動中', '', !s.gearDown && o.agl < 400 && s.thr < 0.3 && !s.onGround ? 'bad' : '']);
    rows.push(['B', 'ブレーキ', s.brake ? 'ON' : '—', '', s.brake ? 'warn' : '']);
    let html = '<table>' + rows.map(([k, n, v, m, c]) => `<tr><td class="k"><kbd>${k}</kbd></td><td class="n">${n}</td><td class="v ${c}">${esc(v)}${m}</td></tr>`).join('') + '</table>';
    // the stick and the rudder (the pilot's inputs), the ball, the warnings
    const sx = 18 + clamp(s.rIn || 0, -1, 1) * 14, sy = 18 + clamp(-(s.keyHold && !s.onGround ? (s.elev || 0) : s.pIn || 0), -1, 1) * 14, rx = 18 + clamp(s.rudEff || 0, -1, 1) * 14;
    const ball = 30 + clamp(o.slip, -1.5, 1.5) * 9;
    html += `<div class="stick"><svg width="36" height="36" viewBox="0 0 36 36"><rect x="2" y="2" width="32" height="32" rx="4" fill="none" stroke="#45607e"/><line x1="18" y1="4" x2="18" y2="32" stroke="#2c4058"/><line x1="4" y1="18" x2="32" y2="18" stroke="#2c4058"/><circle cx="${sx}" cy="${sy}" r="4.5" fill="#5fd4ff"/></svg>`
      + `<svg width="36" height="14" viewBox="0 0 36 14"><rect x="2" y="2" width="32" height="10" rx="3" fill="none" stroke="#45607e"/><circle cx="${rx}" cy="7" r="3.5" fill="#ffb547"/></svg>`
      + `<svg width="60" height="14" viewBox="0 0 60 14"><path d="M4 3 Q30 16 56 3" fill="none" stroke="#45607e"/><circle cx="${ball}" cy="9" r="4" fill="#e8f0fa"/></svg>`
      + `<span>${o.stallWarn ? '<b class="bad">STALL</b>' : s.crashed ? '<b class="bad">損傷</b>' : deadAny && !s.crashed ? '<b class="bad">ENG</b>' : 'ボール'}</span></div>`;
    $('#ctl-strip').innerHTML = html;
  }
  // the key help (H): every key, what it moves, why; the rows used in this step are highlighted
  const KEYMAP = [
    ['S / ↓', '機首を上げる（ピッチ）', '操縦桿を引く操作。押している間だけ機首の角度が上がり、離すとその角度を保つ（設定で「離すと中立」も可）。上昇・速度を落とす・フレア（着陸の引き起こし）に', /S＝機首上げ/, ['S']],
    ['W / ↑', '機首を下げる', '操縦桿を押す操作。降下・速度を増やす・失速からの回復（迎え角を減らす）に', /W＝機首下げ/, ['W']],
    ['A / D（← / →）', '左右に傾ける（エルロン）', '傾けるとその方向へ曲がる（旋回）。地上では前輪の向きにも少し効く', /A \/ D/, ['A', 'D']],
    ['Q / E', 'ラダー（方向舵）', '機首を左右に振る。ボール（横滑り計）を中央に保つ。離陸・上昇ではプロペラの影響で右ラダー（E）が必要。地上では前輪を操向。片発では生きている側の足を踏む', /Q \/ E/, ['Q', 'E']],
    ['R / F（PageUp / PageDown）', 'スロットル（出力）', '押している間だけ出力が増える / 減る。水平飛行では速度、上昇・降下では昇降率を決める', /R＝スロットル/, ['R', 'F']],
    ['T（Shift+T）', 'トリム（Shift+T でリセット）', 'いまの速度で手を離しても姿勢が続くように合わせる。操縦の力を消して、正確に・疲れずに飛ぶため', /T＝/, ['T']],
    ['V（Shift+V）', 'フラップを下げる（Shift+V で上げる）', '揚力と抗力が増える。遅く・深い角度で降りられる。白い帯（Vfe 以下）でだけ使う', /V＝/, ['V']],
    ['G', '脚の上げ下げ（Seminole）', '上げると抗力が減って上昇・加速しやすい。着陸前に必ず下げる（GUMPS）', /G＝/, ['G']],
    ['B / Space', 'ブレーキ（押している間）', '地上で減速・停止。短距離着陸・離陸中止で強く', /B \/ Space/, ['B']],
    ['[ / ]', '左 / 右のプロペラをフェザー（双発）', '止まったエンジンのプロペラの抗力を減らす。必ず Identify → Verify の後で（生きている側を止めない）', /\[＝/, ['[', ']']],
    ['Z / X', 'ラダートリム 左 / 右', '片発などでラダーを踏み続ける力を消す', /Z \/ X/, ['Z', 'X']],
    ['Enter', 'チェックリストの次の項目', '点検項目を 1 つずつ確認する（声に出して読むつもりで）', /Enter/, ['Enter']],
    ['1 / 2 / 3', '管制への応答を選ぶ', '管制の指示を正しく復唱する（滑走路・高度・針路を含めて）', /1〜3/, []],
    ['U', '自動ラダー ON / OFF', 'ON：ボールを自動で中央に。OFF：本物と同じく自分で（離陸は右ラダー）', /U/, ['U']],
    ['C', '視点の切替（操縦席 / 後方）', '操縦席：本物の見え方。後方：機体の姿勢や舵面の動きを外から見る', /C/, ['C']],
    ['H', 'この説明を表示 / 閉じる', '', /^$/, []],
    ['P / Esc', '一時停止（メニュー）', '再開・やり直し・課程表・ガイド・教科書へ', /^$/, []],
    ['L', '水平に戻す（自由飛行のみ）', '数秒間、自動で翼を水平・水平飛行に戻す教材補助', /^$/, []],
  ];
  function renderHelp() {
    const L = S.L, kt = L && L.keysText ? L.keysText : '';
    const box = $('#keyhelp');
    const uses = l => new RegExp(`(^|[^A-Za-z])${l.replace(/[\[\]]/g, '\\$&')}(?=[＝ （/・、]|で|を|$)`).test(kt);
    const now = KEYMAP.map(r => r[3].source !== '^$' && (r[3].test(kt) || r[4].some(uses)));
    const html = `<h3>操作の説明（H で閉じる）${kt ? '：いまの項目で使うキーを強調' : ''}</h3><table>${KEYMAP.map((r, i) => `<tr class="${now[i] ? 'now' : ''}"><td><kbd>${esc(r[0])}</kbd></td><td><b>${esc(r[1])}</b></td><td>${esc(r[2])}</td></tr>`).join('')}</table>
      <p class="note">G1000 型パネル（下）のボタンはマウスで押せます：COM / NAV の周波数、CDI（GPS ⇄ NAV1 ⇄ NAV2）、HDG・ALT・BARO・CRS、MFD の地図。ゲームパッドの配置はガイドを参照。</p>`;
    if (box.innerHTML !== html) box.innerHTML = html;
  }
  function toggleHelp(v) { S.help = v == null ? !S.help : v; $('#keyhelp').hidden = !S.help; if (S.help) renderHelp(); }

  // ---------------------------------------------------------------- views, pause, screens
  function cycleView() { S.view = S.view === 'cockpit' ? 'chase' : 'cockpit'; updateViewBtn(); toast(S.view === 'cockpit' ? '視点：操縦席（本物の見え方）' : '視点：後方（機体の姿勢・舵面の動きが見える）', 1400); }
  function updateViewBtn() { $('#bView').textContent = '視点：' + (S.view === 'cockpit' ? '操縦席' : '後方'); }
  function pause() {
    if (S.screen !== 'fly' || !S.L) return;
    S.paused = true; S.screen = 'pause'; S.keys.clear();
    const L = S.L;
    $('#pz-sub').textContent = L.free ? `自由飛行（${L.A.short}）` : `${L.def.title}（${L.level.name}）項目 ${L.step + 1} / ${L.def.steps.length}`;
    $('#pz-retry').hidden = L.free; $('#pz-school').hidden = L.free; $('#pz-save').hidden = !L.free;
    $('#pause').hidden = false; $('#pz-resume').focus();
  }
  function resume() { $('#pause').hidden = true; S.screen = 'fly'; S.paused = false; last = performance.now(); }
  function closeScreens() { for (const id of ['menu', 'school', 'debrief', 'pause', 'page']) $('#' + id).hidden = true; }
  function openScreen(id) { closeScreens(); S.screen = id; $('#' + id).hidden = false; S.keys.clear(); }
  function backFromScreen() {
    const pg = FL.pages(app);
    if (S.screen === 'page') pg.closePage();
    else if (S.screen === 'pause') resume();
    else if (S.screen === 'school') pg.openMenu();
    else if (S.screen === 'debrief') pg.openSchool(S.lastLessonId);
  }
  $('#bMenu').addEventListener('click', pause);
  $('#bHelp').addEventListener('click', () => toggleHelp());
  $('#bView').addEventListener('click', cycleView);
  $('#bPause').addEventListener('click', pause);
  const LAYOUTS = ['44vh', '54vh', '34vh'];
  function applyLayout() { document.documentElement.style.setProperty('--panelH', LAYOUTS[S.prefs.layout % LAYOUTS.length]); }
  $('#bLayout').addEventListener('click', () => { S.prefs.layout = (S.prefs.layout + 1) % LAYOUTS.length; applyLayout(); savePrefs(); });
  $('#bSound').addEventListener('click', () => { setSound(!S.prefs.sound); });
  $('#pz-resume').addEventListener('click', resume);
  $('#pz-retry').addEventListener('click', () => { if (S.L && !S.L.free) { if (!S.L.done) { SC.abort(S.L, 'やり直し'); } startLesson(S.L.id, S.L.level.id); } });
  $('#pz-guide').addEventListener('click', () => FL.pages(app).openPage('guide'));
  $('#pz-book').addEventListener('click', () => FL.pages(app).openPage('book'));
  $('#pz-school').addEventListener('click', () => { if (S.L && !S.L.free && !S.L.done) { SC.abort(S.L, '中止'); SC.noteLesson(S.progress, S.L); SC.saveProgress(store, S.progress); SC.addRecord(store, SC.recordFromLesson(S.L, '')); } FL.pages(app).openSchool(S.lastLessonId); });
  $('#pz-save').addEventListener('click', () => { if (S.L && S.L.free) { SC.addRecord(store, SC.recordFromLesson(S.L, '')); toast('自由飛行の記録を保存しました（正式な飛行日誌ではありません）', 2600, 'good'); } });
  $('#pz-menu').addEventListener('click', () => { if (S.L && !S.L.free && !S.L.done) SC.abort(S.L, '中止'); FL.pages(app).openMenu(); });

  // ---------------------------------------------------------------- the 3D view and the panel
  function draw3d() {
    if (!scene || !S.L) return;
    const L = S.L, hood = S.screen === 'fly' && L.hood && !L.done;
    if (hood) { $('#labels').textContent = ''; return; }
    const gHole = G && G.hole ? G.hole() : null;
    scene.render({ s: L.s, view: S.screen === 'menu' ? 'chase' : S.view, hole: gHole, extra: G && G.active() ? (gl, c) => G.draw(gl, c) : null });
    if (G && G.active()) G.update(scene.camera(), L.s);
    const box = $('#labels'); let html = '';
    for (const lab of scene.labels) {
      const p = scene.project(lab.pos); if (!p || p.dist > 25000) continue;
      const x = Math.round(p.x), y = Math.round(p.y); if (x < -50 || y < -20 || x > box.clientWidth + 50 || y > box.clientHeight + 20) continue;
      html += `<div style="left:${x}px;top:${y}px">${esc(lab.label)} ${(p.dist / 1852).toFixed(1)} NM</div>`;
    }
    if (box.innerHTML !== html) box.innerHTML = html;
    const ga = $('#gattr');
    if (G && G.active()) { ga.hidden = false; $('#gcredits').textContent = G.credits(); } else ga.hidden = true;
  }
  const LW = 640;
  function fitCanvas(cv) {
    const r = cv.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(r.width * dpr)), hh = Math.max(1, Math.round(r.height * dpr));
    if (cv.width !== w || cv.height !== hh) { cv.width = w; cv.height = hh; }
    const LH = Math.round(LW * clamp(r.height / Math.max(1, r.width), 0.5, 0.85));
    const g = cv.getContext('2d'); g.setTransform(w / LW, 0, 0, hh / LH, 0, 0);
    return { g, W: LW, H: LH };
  }
  function panelData(L) {
    const s = L.s, nav = AV.navSolve(L.av, P.ne(s), s.out, P.MAGVAR_W, P.LAB_RWY);
    return { o: s.out, av: L.av, nav, varW: P.MAGVAR_W, qnh: s.qnh, eng: s.eng.map(e => ({ run: e.run, rpm: e.rpm, feather: e.feather })), V: s.A.v, fuelCap: s.A.fuelCap, pos: P.ne(s) };
  }
  function drawPanels() {
    if (!S.L) return;
    const d = panelData(S.L);
    const a = fitCanvas($('#pfd')); AV.drawPFD(a.g, a.W, a.H, d);
    const b = fitCanvas($('#mfd')); AV.drawMFD(b.g, b.W, b.H, d);
    audioLive();
  }
  // the panel's controls (softkeys, knobs, the audio panel)
  function ctl(what, dir, big) { if (!S.L) return; const t = AV.control(S.L.av, what, dir, big); renderSoftkeys(); renderAudio(); if (t) toast(t, 1200); }
  function btn(label, fn, title, cls) { return h('button', { type: 'button', class: cls || '', title: title || null, onclick: fn }, label); }
  function grp(label, ...b) { return h('span', { class: 'grp' }, label ? h('span', { class: 'lab' }, label) : null, ...b); }
  function renderSoftkeys() {
    if (!S.L) return;
    const av = S.L.av, pk = $('#pfdKeys'), pn = $('#pfdKnobs'), mk = $('#mfdKeys'), mn = $('#mfdKnobs');
    pk.textContent = ''; pn.textContent = ''; mk.textContent = ''; mn.textContent = '';
    if (av.pfdMenu === 'PFD') pk.append(btn('WIND', () => ctl('WIND'), '風の表示', 'soft' + (av.wind ? ' on' : '')), btn('ALT UNIT', () => ctl('ALT_UNIT'), 'BARO の単位（IN / HPA）', 'soft'), btn('STD BARO', () => ctl('STD_BARO'), '29.92 inHg', 'soft'), btn('BACK', () => ctl('PFD_MENU', 'TOP'), '', 'soft'));
    else pk.append(btn('PFD', () => ctl('PFD_MENU', 'PFD'), 'PFD の設定', 'soft'), btn('CDI', () => ctl('CDI'), 'コースの針の情報源：GPS → NAV1 → NAV2', 'soft'), h('span', { class: 'lab', style: 'align-self:center' }, `CDI: ${AV.cdiName(av)}`));
    const hdgMag = () => Math.round(AV.trueToMag(S.L.s.out.hdgTrue, P.MAGVAR_W));
    pn.append(
      grp('HDG', btn('−', e => ctl('HDG', -1, e.shiftKey), 'Shift で 10°'), btn('SYNC', () => ctl('HDG_SYNC', hdgMag()), '現在の針路に合わせる'), btn('+', e => ctl('HDG', 1, e.shiftKey), 'Shift で 10°')),
      grp('ALT', btn('−1000', () => ctl('ALT', -1, true)), btn('−100', () => ctl('ALT', -1)), btn('+100', () => ctl('ALT', 1)), btn('+1000', () => ctl('ALT', 1, true))),
      grp('BARO', btn('−', () => ctl('BARO', -1)), btn('+', () => ctl('BARO', 1))),
      grp('CRS', btn('−', e => ctl('CRS', -1, e.shiftKey), 'コースを 1°（Shift で 10°）'), btn('+', e => ctl('CRS', 1, e.shiftKey), 'コースを 1°（Shift で 10°）')),
    );
    mk.append(btn('MAP', () => ctl('MFD_MAP'), '', 'soft' + (av.mfdPage === 'MAP' ? ' on' : '')), btn('FPL', () => ctl('MFD_FPL'), '', 'soft' + (av.mfdPage === 'FPL' ? ' on' : '')),
      btn(av.mapNorthUp ? 'NORTH UP' : 'TRACK UP', () => ctl('NORTH_UP'), '地図の向き', 'soft'), btn('PREV LEG', () => ctl('FPL_NEXT', -1), '前の区間', 'soft'), btn('NEXT LEG', () => ctl('FPL_NEXT', 1), '次の区間', 'soft'));
    const sel = h('select', { title: 'D→（直行）', onchange: e => { ctl('DIRECT', e.target.value || null); } }, h('option', { value: '' }, av.direct ? 'D→ 解除' : 'D→ 選択'), ...AV.WAYPOINTS.filter(w => w.kind !== 'ref').map(w => h('option', { value: w.id, selected: av.direct === w.id }, w.id)));
    sel.style.fontSize = '11px';
    mn.append(grp('RANGE', btn('−', () => ctl('RANGE', -1)), btn('+', () => ctl('RANGE', 1))), grp('D→', sel), h('span', { class: 'lab', style: 'align-self:center' }, '架空訓練点 · NOT FOR NAVIGATION'));
  }
  function renderAudio() {
    const a = $('#audio'); a.textContent = '';
    if (!S.L) return;
    const av = S.L.av;
    const mon = n => btn(h('span', {}, h('span', { class: 'lamp' }), n), () => ctl('MON', n), `${n} の受信音（教材表示）`, av.audio.monitor[n] ? 'on' : '');
    a.append(
      h('div', { class: 'small', style: 'color:#f3d9a4', text: 'G1000型配置と基本概念を学ぶ教材（Garmin 製品の再現ではありません）' }),
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
    if (!S.L) return; const av = S.L.av, cf = $('#comFreq'), nf = $('#navFreq'); if (!cf) return;
    const line = (n, r, f) => `<div class="${av.comSel === n || av.navSel === n ? 'sel' : ''}">${n} ${f(r.act)} ⇄ ${f(r.stby)}</div>`;
    const c = line('COM1', av.com1, AV.fmtCom) + line('COM2', av.com2, AV.fmtCom), n = line('NAV1', av.nav1, AV.fmtNav) + line('NAV2', av.nav2, AV.fmtNav);
    if (cf.innerHTML !== c) cf.innerHTML = c; if (nf.innerHTML !== n) nf.innerHTML = n;
  }

  // ---------------------------------------------------------------- sound: engines, the stall horn, the gear horn, a chime, ATC voice (WebAudio / speech; off by default)
  let AC = null, engs = [], horn = null, ghorn = null, lastChime = 0;
  function soundInit() {
    if (AC) return; const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    AC = new C();
    const mk = (type, f) => { const o = AC.createOscillator(), g = AC.createGain(); o.type = type; o.frequency.value = f; g.gain.value = 0; o.connect(g); return { o, g }; };
    for (let i = 0; i < 2; i++) { const e = mk('sawtooth', 60); const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380; e.g.connect(lp); lp.connect(AC.destination); e.o.start(); engs.push(e); }
    horn = mk('square', 420); horn.g.connect(AC.destination); horn.o.start();
    ghorn = mk('square', 300); ghorn.g.connect(AC.destination); ghorn.o.start();
  }
  function setSound(on) {
    S.prefs.sound = !!on; savePrefs();
    if (on) { soundInit(); if (AC && AC.state === 'suspended') AC.resume(); }
    $('#bSound').textContent = on ? '音 ON' : '音 OFF'; $('#bSound').setAttribute('aria-pressed', String(!!on));
    const cb = $('#optSound'); if (cb) cb.checked = !!on;
  }
  function soundStep() {
    if (!AC || !S.L) return;
    const s = S.L.s, on = S.prefs.sound && S.screen === 'fly' && !S.paused, t = AC.currentTime;
    engs.forEach((e, i) => { const en = s.eng[Math.min(i, s.eng.length - 1)], rpm = en ? en.rpm || 0 : 0, use = i < s.eng.length; e.o.frequency.setTargetAtTime(18 + rpm / 60 * 2 + i * 1.3, t, 0.05); e.g.gain.setTargetAtTime(on && use && rpm > 300 ? (0.03 + 0.035 * s.thr) / Math.sqrt(s.eng.length) : 0, t, 0.08); });
    horn.g.setTargetAtTime(on && s.out.stallWarn ? 0.05 : 0, t, 0.02);
    const gearWarn = !s.A.gear.fixed && !s.gearDown && !s.onGround && s.thr < 0.25 && s.out.agl < 800;
    ghorn.g.setTargetAtTime(on && gearWarn && Math.floor(t * 2) % 2 === 0 ? 0.035 : 0, t, 0.02);
    if (on && !S.L.free && S.L.chime && S.L.chime !== lastChime) { lastChime = S.L.chime; const o = AC.createOscillator(), g = AC.createGain(); o.frequency.value = 880; o.connect(g); g.connect(AC.destination); g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o.start(t); o.stop(t + 0.4); }
  }
  function speak(text, btnEl) {
    if (!('speechSynthesis' in window)) { if (btnEl) toast('このブラウザでは音声合成が使えません'); return; }
    if (!btnEl && !S.prefs.sound) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.95;
    const v = speechSynthesis.getVoices().find(x => /en[-_]US/i.test(x.lang)); if (v) u.voice = v;
    if (btnEl) { btnEl.disabled = true; u.onend = u.onerror = () => { btnEl.disabled = false; }; }
    speechSynthesis.speak(u);
  }

  // ---------------------------------------------------------------- start up
  applyLayout();
  try { scene = FL.scene.createScene($('#view3d')); } catch (e) { errors.push('scene: ' + e.message); scene = null; }
  if (!scene) $('#viewNote').textContent = 'WebGL2 が使えないため外部視界を表示できません（計器・課程・教科書は使えます）';
  try { G = scene && FL.google3d ? FL.google3d.create(scene.gl) : null; } catch (e) { errors.push('google3d: ' + e.message); G = null; }
  app.google = () => G;
  startFree('area', 'pa28');
  setSound(false);
  FL.pages(app).openMenu();
  if (!S.prefs.ack) $('#ack').hidden = false;
  $('#ackOk').addEventListener('click', () => { $('#ack').hidden = true; S.prefs.ack = true; savePrefs(); });
  requestAnimationFrame(frame);

  // ---------------------------------------------------------------- test hooks (used by the automated browser test)
  window.__lab = {
    errors, sceneOk: () => !!scene,
    start: (id, lv) => startLesson(id, lv), free: (st, ac) => { startFree(st, ac); closeScreens(); S.screen = 'fly'; S.paused = false; },
    state: () => { const L = S.L; return L && { o: { ...L.s.out }, step: L.step, stepName: (L.def.steps[L.step] || {}).name, done: L.done, passed: L.passed, view: S.view, paused: S.paused, screen: S.screen, hood: !$('#hood').hidden, av: L.av, flapIdx: L.s.flapIdx, thr: L.s.thr, pTgt: L.s.pTgt, check: L.check, atc: !!L.atc, help: S.help }; },
    lesson: () => S.L, showPage: id => FL.pages(app).openPage(id), openSchool: id => FL.pages(app).openSchool(id), openMenu: () => FL.pages(app).openMenu(),
    records: () => SC.loadRecords(store), progress: () => S.progress, prefs: () => S.prefs, control: (w, d, b) => ctl(w, d, b),
    storageDump: () => { const o = {}; if (store) for (let i = 0; i < store.length; i++) { const k = store.key(i); o[k] = store.getItem(k); } return o; },
    google: () => (G ? G.status() : null), endNow: () => { if (S.L && !S.L.free) { SC.endLesson(S.L, true); } },
  };
})(typeof globalThis !== 'undefined' ? (globalThis.FL = globalThis.FL || {}) : {});
