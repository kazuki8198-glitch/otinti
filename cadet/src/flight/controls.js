// CADET — flight/controls.js : the pilot's hands. An exact port of FLIGHT LAB's keyboard and gamepad controls
// (app.js updateControls / doAction / padInput), so the same keys fly the same way: W / S move the pitch hold's target
// attitude (released, the nose stays there), A / D the roll stick (released, the bank hold keeps the bank), Q / E the
// rudder, R / F the throttle (fine at first, faster when held), B / Space the brakes. The stick and rudder ramp with the
// frame dt, as in FLIGHT LAB. An action returns the instructor's short explanation instead of showing a toast.
// CADET adds what a hand does in the cockpit: a trim-wheel notch, a throttle notch, and a latched parking brake.
// Pure logic: no three.js, no DOM (the gamepad is read through navigator.getGamepads when the browser has it).

// the keys held for flying (the integrator stops the browser from scrolling with them)
export const FLY_HELD = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'PageUp', 'PageDown', 'KeyW', 'KeyS', 'KeyA', 'KeyD', 'KeyQ', 'KeyE', 'KeyR', 'KeyF', 'KeyB'];
// key → action as FLIGHT LAB's keydown has it: [without Shift, with Shift]
const KEY_ACTS = {
  KeyV: ['flaps', 'flapsUp'], KeyR: [null, 'thrFull'], KeyF: [null, 'thrIdle'], KeyG: ['gear', 'gear'], KeyT: ['trim', 'trimReset'],
  KeyL: ['level', 'level'], KeyU: ['autoRud', 'autoRud'], BracketLeft: ['feather0', 'restart0'], BracketRight: ['feather1', 'restart1'],
  KeyZ: ['rtrimL', 'rtrimL'], KeyX: ['rtrimR', 'rtrimR'],
};
export const actionForKey = (code, shift) => { const a = KEY_ACTS[code]; return a ? a[shift ? 1 : 0] : null; };
// CADET's defaults (they differ from FLIGHT LAB's app on purpose): low stick sensitivity, but the keyboard
// pitch hold OFF and the automatic rudder OFF — the nose is kept by trim and the ball by the feet, as the
// lessons teach; both stay one setting away (設定: ピッチ保持 / 自動ラダー, and U toggles the rudder in flight)
// the player's rebindings (prefs.keyBinds: { action: code }): the action leaves its default key and takes
// the given one, in the same shift slot it had. Anything unknown is ignored — a broken binding can never
// lose a key the lessons need, it just falls back to the standard layout for that action
export function actionForKeyBound(code, shift, binds) {
  if (!binds || typeof binds !== 'object') return actionForKey(code, shift);
  let map = null;
  for (const [act, to] of Object.entries(binds)) {
    if (typeof to !== 'string' || !to) continue;
    let slot = -1, from = null;
    for (const [c, pair] of Object.entries(KEY_ACTS)) { const i = pair.indexOf(act); if (i >= 0) { slot = i; from = c; break; } }
    if (slot < 0) continue;
    if (!map) map = Object.fromEntries(Object.entries(KEY_ACTS).map(([c, pair]) => [c, [...pair]]));
    if (map[from]) map[from][slot] = null;
    (map[to] = map[to] || [null, null])[slot] = act;
  }
  if (!map) return actionForKey(code, shift);
  const a = map[code]; return a ? a[shift ? 1 : 0] : null;
}
// the held keys that fly the aircraft (prefs.heldBinds overrides a role's code; the arrows and Space stay
// as permanent alternates for pitch / roll / brake, as they always were)
export const HELD0 = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', rudL: 'KeyQ', rudR: 'KeyE', thrUp: 'KeyR', thrDn: 'KeyF', brake: 'KeyB' };
// the gamepad axis map (prefs.padMap): which axis (and which pad, −1 = any) drives what, inverted or not,
// with its own dead zone where given. null = FLIGHT LAB's standard mapping, exactly: the left stick is the
// yoke (axes 1/0), the right stick's x the rudder (2), its y the trim (3, a wider dead zone), the triggers
// the throttle, a button the brake — and no toe brakes
export const PADMAP0 = {
  pitch: { axis: 1, inv: false, pad: -1 }, roll: { axis: 0, inv: false, pad: -1 },
  yaw: { axis: 2, inv: false, pad: -1 }, trim: { axis: 3, inv: false, pad: -1, dz: 0.2 },
  thr: null, thrL: null, thrR: null, brakeL: null, brakeR: null,
};
export function padMapOf(prefs) {
  const m = { ...PADMAP0 };
  const src = prefs && prefs.padMap;
  if (src && typeof src === 'object') for (const k of Object.keys(PADMAP0)) {
    const e = src[k];
    if (e === null) { m[k] = null; continue; }
    if (e && typeof e === 'object' && Number.isInteger(e.axis) && e.axis >= 0 && e.axis <= 15)
      m[k] = { axis: e.axis, inv: !!e.inv, pad: Number.isInteger(e.pad) ? e.pad : -1, ...(typeof e.dz === 'number' ? { dz: e.dz } : {}) };
  }
  return m;
}
// CADET's defaults (they differ from FLIGHT LAB's app on purpose): the keyboard pitch hold OFF and the
// automatic rudder OFF, with the platform's own fields at their standard values
export const PREFS0 = { hold: 'spring', rhold: 'hold', sens: 'low', autoRud: false, assist: false, gainCap: 1.7, padDz: 0.12, holdSens: 1, padMap: null, keyBinds: null, heldBinds: null };

const NOKEYS = { has: () => false, shift: false };
const NOPADS = [];
const navPads = () => (typeof navigator !== 'undefined' && navigator && navigator.getGamepads ? navigator.getGamepads() : NOPADS);
// keys move the stick gradually and it springs back to the centre when released (an analog stick follows quickly)
const ramp = (clamp, cur, tgt, dt, analog) => (analog ? cur + (tgt - cur) * Math.min(1, 12 * dt) : cur + clamp(tgt - cur, -(tgt === 0 ? 3.5 : 0.67) * dt, (tgt === 0 ? 3.5 : 0.67) * dt));
const curve = v => Math.sign(v) * Math.pow(Math.abs(v), 1.3);
const expo = v => Math.sign(v) * Math.pow(Math.abs(v), 1.2);
// the gamepad's dead zone (rescaled so the travel outside it still reaches 1) and a button's value
const dz = (v, z = 0.12) => Math.abs(v || 0) < z ? 0 : (v - Math.sign(v) * z) / (1 - z);
const btn = (gp, i) => (gp.buttons[i] ? gp.buttons[i].value : 0);

// opts: prefs (merged over PREFS0), savePrefs(prefs) when the player changes one, getGamepads() (default: the browser's),
// readPad(L, dt) → a pad reading { stick, tr, tp, ty, brake } | null in place of the gamepad (tests)
export function createControls(FL, { prefs, savePrefs = () => {}, getGamepads = navPads, readPad = null } = {}) {
  const P = FL.physics, clamp = P.clamp;
  const st = {
    prefs: { ...PREFS0, ...(prefs || {}) },
    rTrim: 0, thrHeld: 0, parkBrake: false, kind: '',
    // the gamepad: its id, the buttons held last frame, this frame's new presses, the reading handed to update()
    pad: { known: null, prev: [], edge: [], out: { stick: false, tr: 0, tp: 0, ty: 0, brake: false, brakeL: null, brakeR: null } },
    // what the gamepad asks of the cockpit this frame: { type: 'checklist' | 'atc' (i) | 'view' | 'pause' | 'help' | 'toast' (text, kind) }
    padOut: [],
  };
  // keys still held from before a start are ignored until they are released (FLIGHT LAB clears its key set)
  const muted = new Set();
  let arm = false;
  let keys = NOKEYS;
  const held = (code) => keys.has(code) && !(muted.size && muted.has(code));
  const pressed = (a, b) => held(a) || (b !== undefined && held(b));

  // every frame: the keys / pad → the pilot's inputs on s (FLIGHT LAB updateControls, line for line)
  function update(L, dt, k, flying) {
    keys = k || NOKEYS;
    if (arm) { arm = false; for (const c of FLY_HELD) if (keys.has(c)) muted.add(c); }
    if (muted.size) for (const c of muted) if (!keys.has(c)) muted.delete(c);
    if (!L) return; const s = L.s;
    if (!flying) { s.pIn = 0; s.rIn = 0; s.rud = st.rTrim; s.brake = st.parkBrake; return; }
    const HB = { ...HELD0, ...(st.prefs.heldBinds || {}) };
    let tp = (pressed(HB.down, 'ArrowDown') ? 1 : 0) - (pressed(HB.up, 'ArrowUp') ? 1 : 0);
    let tr = (pressed(HB.right, 'ArrowRight') ? 1 : 0) - (pressed(HB.left, 'ArrowLeft') ? 1 : 0);
    let ty = (pressed(HB.rudR) ? 1 : 0) - (pressed(HB.rudL) ? 1 : 0);
    let analog = false, brake = pressed(HB.brake, 'Space');
    let gp = null; try { gp = readPad ? readPad(L, dt) : padInput(L, dt); } catch (e) { gp = null; }
    if (gp) { if (gp.stick) { tr = gp.tr; tp = gp.tp; analog = true; } if (gp.ty) ty = gp.ty; if (gp.brake) brake = true; }
    if (analog) { tr = expo(tr); tp = expo(tp); }
    if (analog) { s.pKey = tp; s.rKey = tr; s.pIn = ramp(clamp, s.pIn, tp, dt, true); s.rIn = ramp(clamp, s.rIn, tr, dt, true); }
    else { s.pKey = ramp(clamp, s.pKey || 0, tp, dt, false); s.rKey = ramp(clamp, s.rKey || 0, tr, dt, false); s.pIn = curve(s.pKey); s.rIn = curve(s.rKey); }
    // the keyboard pitch hold: in the air W / S move the nose attitude to hold; released, it stays there
    s.keyHold = !analog && st.prefs.hold === 'hold';
    s.rollHold = !P.SORAJIMA && !analog && st.prefs.rhold !== 'spring';    // the keyboard bank hold (FLIGHT LAB's; Sorajima's stick springs back)
    const thNow = P.attitude(s).pitch;
    if (!s.keyHold || (s.opts.levelT || 0) > 0 || s.pTgt == null || s.onGround) { s.pTgt = thNow; s.pHeld = 0; }
    if (s.keyHold && tp && !s.onGround) {
      s.pHeld = (s.pHeld || 0) + dt; const p0 = s.pTgt;
      s.pTgt = clamp(s.pTgt + tp * (s.pHeld < 0.5 ? 1.5 : 3) * (st.prefs.holdSens || 1) * dt, -20, 22);
      s.pRate = dt > 0 ? (s.pTgt - p0) / dt : 0;
    } else { s.pHeld = 0; s.pRate = 0; }
    if (s.keyHold && !s.onGround) s.pIn = 0;
    s.rudKey = (s.rudKey || 0) + clamp(ty - (s.rudKey || 0), -3 * dt, 3 * dt);
    s.rud = clamp(s.rudKey + st.rTrim, -1, 1);
    // the throttle: fine at first, faster the longer the key is held (a real hand moves the lever in under a second)
    const thU = pressed(HB.thrUp, 'PageUp'), thD = pressed(HB.thrDn, 'PageDown');
    st.thrHeld = thU || thD ? (st.thrHeld || 0) + dt : 0;
    const thRate = P.SORAJIMA || st.thrHeld < 0.4 ? 0.45 : 1.6;             // (Sorajima's: one steady speed)
    if (thU) s.thr = clamp(s.thr + thRate * dt, 0, 1);
    if (thD) s.thr = clamp(s.thr - thRate * dt, 0, 1);
    // the brakes travel, they do not switch: a stomp takes a fraction of a second to bite (the parking
    // brake, a latch, is full at once — and holds both mains until the player releases it)
    st.brAmt = st.parkBrake ? 1 : clamp((st.brAmt || 0) + (brake ? 2.5 : -5) * dt, 0, 1);
    s.brake = st.brAmt;
    // the toe brakes (pedal axes, when mapped): each pedal its own amount. A physics that splits the
    // brakes takes brakeL / brakeR; until then the stronger pedal adds to the brake amount, as the
    // button did
    if (gp && (gp.brakeL != null || gp.brakeR != null)) {
      const bl = gp.brakeL || 0, br = gp.brakeR || 0;
      if ('brakeL' in s || 'brakeR' in s) { s.brakeL = bl; s.brakeR = br; }
      if (Math.max(bl, br) > 0.04) s.brake = Math.max(s.brake, Math.max(bl, br));
      s.toeBrake = Math.max(bl, br);
    }
  }

  const say = (text, kind = '') => { st.kind = kind; return text; };
  const pct = v => Math.round(Math.abs(v) * 100);
  const trimTxt = s => { const t = Math.round(s.trim / P.TRIM_MAX * 100); return t === 0 ? '中立' : `${t > 0 ? '機首上げ' : '機首下げ'} ${Math.abs(t)}%`; };
  // the actions (FLIGHT LAB doAction, same state changes), each with a short explanation of what it did and why
  function action(L, a, arg) {
    st.kind = '';
    if (!L) return ''; const s = L.s, A = s.A;
    if (a === 'flaps' || a === 'flapsUp') {
      if (!A.wing.flap) return '';
      const n = A.flapLabels.length;
      s.flapIdx = a === 'flaps' ? (s.flapIdx + 1) % n : Math.max(0, s.flapIdx - 1);
      const lab = A.flapLabels[s.flapIdx], fe = A.v.fe, over = s.flapIdx > 0 && s.out.ias > fe;
      return say(`フラップ ${lab}${s.flapIdx === 0 ? '：揚力と抗力が減り、速く飛べる（巡航・上昇）' : '：揚力と抗力が増え、遅く・深い角度で降りられる'}${over ? `　⚠ 白い帯の上限 Vfe ${fe} kt を超えています` : ''}`, over ? 'bad' : '');
    } else if (a === 'gear') {
      if (A.gear.fixed) return say('この機体（Archer）の脚は固定式で、上げ下げできません');
      if (s.onGround && s.gearDown) return say('地上では脚を上げられません');
      s.gearDown = !s.gearDown;
      return say(s.gearDown ? '脚 DOWN：着陸に備える（緑のランプ 3 つで確認）。抗力が増える' : '脚 UP：抗力が減って上昇・加速しやすくなる（正の上昇を確認してから）');
    } else if (a === 'trim') {
      if (s.onGround) { s.trim = 0; s.trimHold = 0; s.trimTgt = null; return say('地上ではトリムを離陸位置（中立）にしました'); }
      if (s.opts.assist) return say('操縦アシスト中はトリムは自動です');
      s.trimHold = s.elev; s.trimTgt = P.trimLevel(s);   // (the wheel winds to it over the next second or so — B3: trim runs in at a finite rate, it does not jump)
      return say(`トリム ${s.trimTgt >= 0 ? '機首上げ' : '機首下げ'} ${Math.abs(Math.round(s.trimTgt / P.TRIM_MAX * 100))}%：いまの速度で、手を離してもこの姿勢が続くように合わせました（ホイールが回り込んでいきます）`);
    } else if (a === 'thrFull' || a === 'thrIdle') {
      s.thr = a === 'thrFull' ? 1 : 0;
      return say(a === 'thrFull' ? 'スロットル全開（Shift+R）：離陸・ゴーアラウンド・失速の回復で一気に出力を出す' : 'スロットル アイドル（Shift+F）：離陸中止・エンジン故障の模擬・着陸の接地前に一気に絞る');
    } else if (a === 'trimReset') { s.trim = 0; s.trimHold = 0; s.trimTgt = null; return say('トリムを中立（離陸位置）に戻しました'); }
    else if (a === 'level') {
      if (!L.free) return say('L（水平に戻すアシスト）は自由飛行だけで使えます。訓練では自分で回復します');
      s.opts.levelT = 4; return say('数秒間、自動で翼を水平・水平飛行に戻します（自由飛行の補助）');
    } else if (a === 'autoRud') {
      if (!L.free && A.twin && s.eng.some(e => e.failed)) return say('片発の課目では自動ラダーは使えません。生きているエンジン側のラダー（Q / E）とラダートリム（Z / X）で、自分の足で方向を保つ練習です');
      s.opts.autoRud = !s.opts.autoRud; st.prefs.autoRud = s.opts.autoRud; try { savePrefs(st.prefs); } catch (e) { /* storage unavailable */ }
      return say(s.opts.autoRud ? '自動ラダー ON：ボールを自動で中央に保ちます' : '自動ラダー OFF：Q / E でボールを中央に（離陸・上昇は右ラダー E。片発では生きている側の足）');
    } else if (a === 'feather0' || a === 'feather1') {
      if (!A.twin) return say('フェザーは双発機（Seminole）のプロペラ操作です');
      const i = a === 'feather0' ? 0 : 1, e = s.eng[i], side = i ? '右' : '左';
      if (e.feather) return say(`${side}のプロペラはすでにフェザーです`);
      e.feather = true; e.cut = true;
      if (!e.failed) return say(`⚠ ${side}エンジンは動いていました。生きているエンジンを止めました（重大な誤り）。Identify → Verify → Feather の順で`, 'bad');
      return say(`${side}のプロペラをフェザー：羽根を風に平行にして回転を止め、抗力を大きく減らしました`, 'good');
    } else if (a === 'restart0' || a === 'restart1') {
      if (!A.twin) return ''; if (!L.free) return say('訓練中はエンジンの再始動はできません');
      const e = s.eng[a === 'restart0' ? 0 : 1]; Object.assign(e, { feather: false, cut: false, failed: false, on: true }); return say('エンジンを再始動（自由飛行の補助）');
    } else if (a === 'rtrimL' || a === 'rtrimR') {
      st.rTrim = clamp(st.rTrim + (a === 'rtrimR' ? 0.05 : -0.05), -0.6, 0.6);
      return say(`ラダートリム ${st.rTrim === 0 ? '中立' : `${st.rTrim > 0 ? '右' : '左'} ${Math.round(Math.abs(st.rTrim) * 100)}%`}：ラダーを踏み続けなくてよいように`);
    }
    // CADET's cockpit: one notch of the trim wheel (as the gamepad's D-pad), of the throttle, and the parking brake
    else if (a === 'trimStep') {
      if (s.opts.assist) return say('操縦アシスト中はトリムは自動です');
      // (Sorajima's trim wheel: 4 % of the range a notch; the stick held now is not counted twice)
      s.trim = clamp(s.trim + (arg < 0 ? -1 : 1) * P.TRIM_MAX * 0.04, -P.TRIM_MAX, P.TRIM_MAX); s.trimHold = s.elev; s.trimTgt = null;
      return say(`トリム ${trimTxt(s)}`);
    } else if (a === 'thrStep') {
      s.thr = clamp(s.thr + (arg < 0 ? -0.05 : 0.05), 0, 1);
      return say(`スロットル ${pct(s.thr)}%`);
    } else if (a === 'parkBrake') {
      st.parkBrake = arg == null ? !st.parkBrake : !!arg;
      if (st.parkBrake) s.brake = true;
      return say(st.parkBrake ? 'パーキングブレーキ セット：止まっている間は機体をここに保つ（動き出す前に解除）' : 'パーキングブレーキ 解除：B / Space で必要なときだけブレーキ');
    }
    return '';
  }

  // the gamepad (standard mapping; a PS5 DualSense or an Xbox pad), in flight. FLIGHT LAB padInput: the left stick is
  // the yoke (it turns the keyboard holds off), the right stick x + the bumpers the rudder, the right stick y the trim,
  // the triggers the throttle; the buttons as in FLIGHT LAB's guide. What the cockpit has to do goes to padOut.
  // One difference: FLIGHT LAB answers a checklist item (A) or the tower (X / B / Y) at once, so the same press also
  // brakes (A, last item) or works the flaps / the view (B / X / Y) once the dialog has closed; here the dialogs are
  // answered by the bridge after this frame's controls, and a press does one thing.
  const padAct = (L, a) => { const text = action(L, a); if (text) st.padOut.push({ type: 'toast', text, kind: st.kind }); };
  // every connected pad is read, every frame (a yoke, a quadrant and a set of pedals at once): the buttons
  // are the strongest press on any pad, the axes come from the player's map (prefs.padMap — which pad,
  // which axis, inverted, its dead zone; a pad named in the map is read even when another pad's same axis
  // is centred). With no map this is FLIGHT LAB's reading of the first pad, unchanged.
  function padInput(L, dt) {
    const all = getGamepads() || NOPADS;
    const pads = []; for (let i = 0; i < all.length; i++) { const p = all[i]; if (p && p.connected) pads.push(p); }
    const pad = st.pad;
    if (!pads.length) { pad.known = null; return null; }
    const gp = pads[0];
    const ids = pads.map(p => p.id).join(' + ');
    if (pad.known !== ids) { pad.known = ids; st.padOut.push({ type: 'toast', text: `コントローラーを認識しました${pads.every(p => p.mapping === 'standard') ? '' : '：このブラウザでは配置が標準ではないため、一部のボタンが違う場合があります'}`, kind: '' }); }
    const btnM = (i) => { let v = 0; for (const p of pads) v = Math.max(v, btn(p, i)); return v; };
    const E = pad.edge; for (let i = 0; i < 18; i++) { const now = btnM(i) > 0.5, was = !!pad.prev[i]; pad.prev[i] = now; E[i] = now && !was; }
    const out = pad.out; out.stick = false; out.tr = 0; out.tp = 0; out.ty = 0; out.brake = false; out.brakeL = null; out.brakeR = null;
    if (!L) return out;
    const s = L.s;
    if (L.check && E[0]) st.padOut.push({ type: 'checklist' });
    if (L.atc) { if (E[2]) st.padOut.push({ type: 'atc', i: 0 }); else if (E[1]) st.padOut.push({ type: 'atc', i: 1 }); else if (E[3]) st.padOut.push({ type: 'atc', i: 2 }); }
    const MAP = padMapOf(st.prefs), baseDz = typeof st.prefs.padDz === 'number' ? st.prefs.padDz : 0.12;
    // one mapped axis: its raw value (before the dead zone) from its pad, or null when that pad is not there
    const raw = (e) => {
      if (!e) return null;
      const tryP = e.pad >= 0 ? [pads[e.pad]] : pads;
      for (const p of tryP) { if (p && p.axes && e.axis < p.axes.length) { const v = p.axes[e.axis]; return (e.inv ? -v : v) || 0; } }
      return null;
    };
    const axv = (e) => { const v = raw(e); return v == null ? 0 : dz(v, e && typeof e.dz === 'number' ? e.dz : baseDz); };
    const lx = axv(MAP.roll), ly = axv(MAP.pitch), rx = axv(MAP.yaw), ry = axv(MAP.trim);
    if (lx || ly) { out.stick = true; out.tr = lx; out.tp = ly; }
    out.ty = clamp(rx + (btnM(5) - btnM(4)), -1, 1);
    if (ry && !s.opts.assist) { s.trim = clamp(s.trim + ry * 0.12 * dt, -P.TRIM_MAX, P.TRIM_MAX); s.trimTgt = null; }
    // the throttle: a mapped axis is a lever — where it stands is the setting (a twin's two levers write
    // each engine's own throttle where the physics keeps one; the shared lever otherwise). Unmapped, the
    // triggers walk it as FLIGHT LAB's do
    const thrAx = (e) => { const v = raw(e); return v == null ? null : clamp((v + 1) / 2, 0, 1); };
    const tL = thrAx(MAP.thrL), tR = thrAx(MAP.thrR), tS = thrAx(MAP.thr);
    if (tL != null || tR != null) { if (tL != null && s.eng[0]) s.eng[0].thr = tL; if (tR != null && s.eng[1]) s.eng[1].thr = tR; if (tS != null) s.thr = tS; }
    else if (tS != null) s.thr = tS;
    else s.thr = clamp(s.thr + (btnM(7) - btnM(6)) * 0.5 * dt, 0, 1);
    // the toe brakes: pedal axes rest at −1 and travel to +1 on most quadrants, so the amount is (v+1)/2
    const toe = (e) => { const v = raw(e); return v == null ? null : clamp((v + 1) / 2, 0, 1); };
    out.brakeL = toe(MAP.brakeL); out.brakeR = toe(MAP.brakeR);
    if (btnM(0) > 0.5 && !L.check) out.brake = true;
    if (!L.atc) { if (E[1]) padAct(L, 'flaps'); if (E[2]) padAct(L, 'flapsUp'); if (E[3]) st.padOut.push({ type: 'view' }); }
    if (E[8]) padAct(L, 'gear');
    if (E[9]) { st.padOut.push({ type: 'pause' }); return out; }
    if (E[12] || E[13]) { s.trim = clamp(s.trim + (E[13] ? 0.02 : -0.02), -P.TRIM_MAX, P.TRIM_MAX); s.trimTgt = null; }
    if (E[10]) padAct(L, 'level');
    if (E[11]) padAct(L, 'autoRud');
    if (E[14]) padAct(L, 'feather0');
    if (E[15]) padAct(L, 'feather1');
    if (E[16]) st.padOut.push({ type: 'help' });
    return out;
  }

  return {
    update, action, padInput,
    // the discrete action keys, with the player's rebindings (prefs.keyBinds) applied
    actionFor: (code, shift) => actionForKeyBound(code, shift, st.prefs.keyBinds),
    // live preference changes from the settings screen (the axis map, the bindings, the feels)
    setPrefs(patch) { if (patch && typeof patch === 'object') Object.assign(st.prefs, patch); },
    // a new flight: no rudder trim, no held throttle, the parking brake off, keys held now ignored until released
    reset() { st.rTrim = 0; st.thrHeld = 0; st.parkBrake = false; st.padOut.length = 0; this.clearKeys(); },
    clearKeys() { muted.clear(); arm = true; },
    get prefs() { return st.prefs; },
    get rTrim() { return st.rTrim; }, set rTrim(v) { st.rTrim = v; },
    get thrHeld() { return st.thrHeld; },
    get parkBrake() { return st.parkBrake; },
    // 'bad' | 'good' | '' for the last action's text
    get kind() { return st.kind; },
    get padOut() { return st.padOut; },
    get padId() { return st.pad.known; },
  };
}
