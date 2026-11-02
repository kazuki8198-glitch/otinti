class_name CadetControls
extends RefCounted
# Port of cadet/src/flight/controls.js (HTML CADET @ 898fe8a) — the pilot's hands:
# W/S move the pitch hold's target attitude, A/D the roll stick, Q/E the rudder,
# R/F the throttle (fine at first, faster held), B/Space the brakes; the stick and
# rudder ramp with dt. An action returns the instructor's short explanation.
# Pure logic: the gamepad is read through an injected get_gamepads Callable
# (default: no pads) or an injected read_pad Callable, as in the original's
# opts { prefs, savePrefs, getGamepads, readPad }. Godot's real pad connection
# is the integrator's job (src/input_map.gd). Keys arrive as a Dictionary
# {code: true} (Dictionary.has reads it) or any Object with has(code)/shift.
# NOTE: the original reads FL.physics.SORAJIMA (a variant physics build); the
# ported physics.gd has no such flag, so SORAJIMA is false here, as it is in the
# standard CADET build.

const FP = preload("res://src/physics.gd")

const FLY_HELD := ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space", "PageUp", "PageDown", "KeyW", "KeyS", "KeyA", "KeyD", "KeyQ", "KeyE", "KeyR", "KeyF", "KeyB"]
# key -> action: [without Shift, with Shift]
const KEY_ACTS := {
	"KeyV": ["flaps", "flapsUp"], "KeyR": [null, "thrFull"], "KeyF": [null, "thrIdle"], "KeyG": ["gear", "gear"], "KeyT": ["trim", "trimReset"],
	"KeyL": ["level", "level"], "KeyU": ["autoRud", "autoRud"], "BracketLeft": ["feather0", "restart0"], "BracketRight": ["feather1", "restart1"],
	# Shift+B toggles the parking brake, exactly like the HTML original
	# (fly-mode.js: KeyB + shiftKey -> 'parkBrake'). Plain B stays the held
	# toe brake (FLY_HELD / HELD0.brake), so its no-shift action is null.
	# v1.0.0 shipped WITHOUT this entry: the parkBrake action existed but no
	# key could reach it, so a parked (apron) start could never move.
	"KeyB": [null, "parkBrake"],
	"KeyZ": ["rtrimL", "rtrimL"], "KeyX": ["rtrimR", "rtrimR"],
}
const HELD0 := {"up": "KeyW", "down": "KeyS", "left": "KeyA", "right": "KeyD", "rudL": "KeyQ", "rudR": "KeyE", "thrUp": "KeyR", "thrDn": "KeyF", "brake": "KeyB"}
const PADMAP0 := {
	"pitch": {"axis": 1, "inv": false, "pad": -1}, "roll": {"axis": 0, "inv": false, "pad": -1},
	"yaw": {"axis": 2, "inv": false, "pad": -1}, "trim": {"axis": 3, "inv": false, "pad": -1, "dz": 0.2},
	"thr": null, "thrL": null, "thrR": null, "brakeL": null, "brakeR": null,
}
const PREFS0 := {"hold": "spring", "rhold": "hold", "sens": "low", "autoRud": false, "assist": false, "gainCap": 1.7, "padDz": 0.12, "holdSens": 1, "padMap": null, "keyBinds": null, "heldBinds": null}

static func _clamp(v: float, a: float, b: float) -> float:
	return FP.clampf_(v, a, b)

static func _is_int_num(v) -> bool:
	return (typeof(v) == TYPE_INT) or (typeof(v) == TYPE_FLOAT and float(v) == floorf(float(v)))

static func action_for_key(code: String, shift: bool):
	var a = KEY_ACTS.get(code)
	return a[1 if shift else 0] if a != null else null

static func actionForKey(code: String, shift: bool):
	return action_for_key(code, shift)

static func action_for_key_bound(code: String, shift: bool, binds):
	if binds == null or typeof(binds) != TYPE_DICTIONARY:
		return action_for_key(code, shift)
	var map = null
	for act in binds.keys():
		var to = binds[act]
		if typeof(to) != TYPE_STRING or String(to).is_empty():
			continue
		var slot := -1
		var from = null
		for c in KEY_ACTS.keys():
			var i: int = (KEY_ACTS[c] as Array).find(act)
			if i >= 0:
				slot = i
				from = c
				break
		if slot < 0:
			continue
		if map == null:
			map = {}
			for c in KEY_ACTS.keys():
				map[c] = (KEY_ACTS[c] as Array).duplicate()
		if map.get(from) != null:
			map[from][slot] = null
		if map.get(to) == null:
			map[to] = [null, null]
		map[to][slot] = act
	if map == null:
		return action_for_key(code, shift)
	var a = map.get(code)
	return a[1 if shift else 0] if a != null else null

static func actionForKeyBound(code: String, shift: bool, binds):
	return action_for_key_bound(code, shift, binds)

static func pad_map_of(prefs) -> Dictionary:
	var m: Dictionary = PADMAP0.duplicate(true)
	var src = prefs.get("padMap") if typeof(prefs) == TYPE_DICTIONARY else null
	if typeof(src) == TYPE_DICTIONARY:
		for k in PADMAP0.keys():
			if not src.has(k):
				continue
			var e = src[k]
			if e == null:
				m[k] = null
				continue
			if typeof(e) == TYPE_DICTIONARY and _is_int_num(e.get("axis")) and int(e["axis"]) >= 0 and int(e["axis"]) <= 15:
				var ent := {"axis": int(e["axis"]), "inv": bool(e.get("inv", false)), "pad": int(e["pad"]) if _is_int_num(e.get("pad")) else -1}
				if typeof(e.get("dz")) == TYPE_INT or typeof(e.get("dz")) == TYPE_FLOAT:
					ent["dz"] = float(e["dz"])
				m[k] = ent
	return m

static func padMapOf(prefs) -> Dictionary:
	return pad_map_of(prefs)

static func _ramp(cur: float, tgt: float, dt: float, analog: bool) -> float:
	if analog:
		return cur + (tgt - cur) * minf(1.0, 12.0 * dt)
	var lim := (3.5 if tgt == 0.0 else 0.67) * dt
	return cur + _clamp(tgt - cur, -lim, lim)

static func _curve(v: float) -> float:
	return signf(v) * pow(absf(v), 1.3) if v != 0.0 else 0.0

static func _expo(v: float) -> float:
	return signf(v) * pow(absf(v), 1.2) if v != 0.0 else 0.0

static func _dz(v, z: float = 0.12) -> float:
	var x := float(v) if v != null else 0.0
	return 0.0 if absf(x) < z else (x - signf(x) * z) / (1.0 - z)

static func _btn(gp: Dictionary, i: int) -> float:
	var bs = gp.get("buttons")
	if typeof(bs) != TYPE_ARRAY or i >= (bs as Array).size():
		return 0.0
	var b = bs[i]
	if typeof(b) == TYPE_DICTIONARY:
		return float(b.get("value", 0.0))
	return float(b) if typeof(b) == TYPE_INT or typeof(b) == TYPE_FLOAT else 0.0

static func signf(v: float) -> float:
	return 1.0 if v > 0.0 else (-1.0 if v < 0.0 else 0.0)

# ---------------------------------------------------------------- instance
var prefs: Dictionary
var rTrim := 0.0
var thrHeld := 0.0
var parkBrake := false
var kind := ""
var padOut: Array = []
var _save_prefs: Callable
var _get_gamepads: Callable
var _read_pad: Callable
var _br_amt := 0.0
var _pad := {"known": null, "prev": [], "edge": [], "out": {"stick": false, "tr": 0.0, "tp": 0.0, "ty": 0.0, "brake": false, "brakeL": null, "brakeR": null}}
var _muted := {}
var _arm := false
var _keys = null

func _init(opts: Dictionary = {}) -> void:
	prefs = PREFS0.duplicate(true)
	var p = opts.get("prefs")
	if typeof(p) == TYPE_DICTIONARY:
		for k in p.keys():
			prefs[k] = p[k]
	_save_prefs = opts.get("savePrefs") if typeof(opts.get("savePrefs")) == TYPE_CALLABLE else Callable()
	_get_gamepads = opts.get("getGamepads") if typeof(opts.get("getGamepads")) == TYPE_CALLABLE else func(): return []
	_read_pad = opts.get("readPad") if typeof(opts.get("readPad")) == TYPE_CALLABLE else Callable()
	for i in range(18):
		_pad["prev"].append(false)
		_pad["edge"].append(false)

func _key_has(code: String) -> bool:
	if _keys == null:
		return false
	if typeof(_keys) == TYPE_DICTIONARY:
		return bool(_keys.get(code, false))
	if typeof(_keys) == TYPE_OBJECT and _keys.has_method("has"):
		return bool(_keys.call("has", code))
	return false

func _held(code: String) -> bool:
	return _key_has(code) and not (not _muted.is_empty() and _muted.has(code))

func _pressed(a: String, b = null) -> bool:
	return _held(a) or (b != null and _held(String(b)))

# every frame: the keys / pad -> the pilot's inputs on s (FLIGHT LAB updateControls, line for line)
# keys: a Dictionary {code: true} or an Object with has(code); L: the lesson Dictionary (or null)
func update(L, dt: float, keys = null, flying: bool = false) -> void:
	_keys = keys
	if _arm:
		_arm = false
		for c in FLY_HELD:
			if _key_has(c):
				_muted[c] = true
	if not _muted.is_empty():
		for c in _muted.keys():
			if not _key_has(c):
				_muted.erase(c)
	if L == null:
		return
	var s: Dictionary = L["s"]
	if not flying:
		s["pIn"] = 0.0
		s["rIn"] = 0.0
		s["rud"] = rTrim
		s["brake"] = parkBrake
		return
	var HB: Dictionary = HELD0.duplicate()
	var hb = prefs.get("heldBinds")
	if typeof(hb) == TYPE_DICTIONARY:
		for k in hb.keys():
			HB[k] = hb[k]
	var tp := (1.0 if _pressed(String(HB["down"]), "ArrowDown") else 0.0) - (1.0 if _pressed(String(HB["up"]), "ArrowUp") else 0.0)
	var tr := (1.0 if _pressed(String(HB["right"]), "ArrowRight") else 0.0) - (1.0 if _pressed(String(HB["left"]), "ArrowLeft") else 0.0)
	var ty := (1.0 if _pressed(String(HB["rudR"])) else 0.0) - (1.0 if _pressed(String(HB["rudL"])) else 0.0)
	var analog := false
	var brake := _pressed(String(HB["brake"]), "Space")
	var gp = _read_pad.call(L, dt) if _read_pad.is_valid() else pad_input(L, dt)
	if gp != null and typeof(gp) == TYPE_DICTIONARY:
		if bool(gp.get("stick", false)):
			tr = float(gp.get("tr", 0.0))
			tp = float(gp.get("tp", 0.0))
			analog = true
		if float(gp.get("ty", 0.0)) != 0.0:
			ty = float(gp["ty"])
		if bool(gp.get("brake", false)):
			brake = true
	else:
		gp = null
	if analog:
		tr = _expo(tr)
		tp = _expo(tp)
	if analog:
		s["pKey"] = tp
		s["rKey"] = tr
		s["pIn"] = _ramp(float(s.get("pIn", 0.0)), tp, dt, true)
		s["rIn"] = _ramp(float(s.get("rIn", 0.0)), tr, dt, true)
	else:
		s["pKey"] = _ramp(float(s.get("pKey", 0.0)), tp, dt, false)
		s["rKey"] = _ramp(float(s.get("rKey", 0.0)), tr, dt, false)
		s["pIn"] = _curve(float(s["pKey"]))
		s["rIn"] = _curve(float(s["rKey"]))
	# the keyboard pitch hold: in the air W/S move the nose attitude to hold; released, it stays there
	s["keyHold"] = not analog and String(prefs.get("hold", "spring")) == "hold"
	s["rollHold"] = not analog and String(prefs.get("rhold", "hold")) != "spring"  # (!P.SORAJIMA: false in this port)
	var th_now := float(FP.attitude(s)["pitch"])
	if not bool(s["keyHold"]) or float((s["opts"] as Dictionary).get("levelT", 0.0)) > 0.0 or s.get("pTgt") == null or bool(s["onGround"]):
		s["pTgt"] = th_now
		s["pHeld"] = 0.0
	if bool(s["keyHold"]) and tp != 0.0 and not bool(s["onGround"]):
		s["pHeld"] = float(s.get("pHeld", 0.0)) + dt
		var p0 := float(s["pTgt"])
		var hs = prefs.get("holdSens")
		s["pTgt"] = _clamp(p0 + tp * (1.5 if float(s["pHeld"]) < 0.5 else 3.0) * (float(hs) if typeof(hs) == TYPE_INT or typeof(hs) == TYPE_FLOAT else 1.0) * dt, -20.0, 22.0)
		s["pRate"] = (float(s["pTgt"]) - p0) / dt if dt > 0.0 else 0.0
	else:
		s["pHeld"] = 0.0
		s["pRate"] = 0.0
	if bool(s["keyHold"]) and not bool(s["onGround"]):
		s["pIn"] = 0.0
	s["rudKey"] = float(s.get("rudKey", 0.0)) + _clamp(ty - float(s.get("rudKey", 0.0)), -3.0 * dt, 3.0 * dt)
	s["rud"] = _clamp(float(s["rudKey"]) + rTrim, -1.0, 1.0)
	# the throttle: fine at first, faster the longer the key is held
	var th_u := _pressed(String(HB["thrUp"]), "PageUp")
	var th_d := _pressed(String(HB["thrDn"]), "PageDown")
	thrHeld = thrHeld + dt if (th_u or th_d) else 0.0
	var th_rate := 0.45 if thrHeld < 0.4 else 1.6  # (P.SORAJIMA false)
	if th_u:
		s["thr"] = _clamp(float(s["thr"]) + th_rate * dt, 0.0, 1.0)
	if th_d:
		s["thr"] = _clamp(float(s["thr"]) - th_rate * dt, 0.0, 1.0)
	# the brakes travel, they do not switch (the parking brake, a latch, is full at once)
	_br_amt = 1.0 if parkBrake else _clamp(_br_amt + (2.5 if brake else -5.0) * dt, 0.0, 1.0)
	s["brake"] = _br_amt
	# the toe brakes (pedal axes, when mapped)
	if gp != null and (gp.get("brakeL") != null or gp.get("brakeR") != null):
		var bl := float(gp["brakeL"]) if gp.get("brakeL") != null else 0.0
		var br := float(gp["brakeR"]) if gp.get("brakeR") != null else 0.0
		if s.has("brakeL") or s.has("brakeR"):
			s["brakeL"] = bl
			s["brakeR"] = br
		if maxf(bl, br) > 0.04:
			s["brake"] = maxf(float(s["brake"]), maxf(bl, br))
		s["toeBrake"] = maxf(bl, br)

func _say(text: String, k: String = "") -> String:
	kind = k
	return text

func _pct(v: float) -> int:
	return int(floorf(absf(v) * 100.0 + 0.5))

func _trim_txt(s: Dictionary) -> String:
	var t := int(floorf(float(s["trim"]) / FP.TRIM_MAX * 100.0 + 0.5))
	return "中立" if t == 0 else ("%s %d%%" % ["機首上げ" if t > 0 else "機首下げ", absi(t)])

# the actions (FLIGHT LAB doAction, same state changes); each returns a short explanation
func action(L, a: String, arg = null) -> String:
	kind = ""
	if L == null:
		return ""
	var s: Dictionary = L["s"]
	var A: Dictionary = s["A"]
	if a == "flaps" or a == "flapsUp":
		if not (A["wing"] as Dictionary).has("flap") or (A["wing"] as Dictionary)["flap"] == null:
			return ""
		var n := (A["flapLabels"] as Array).size()
		s["flapIdx"] = (int(s["flapIdx"]) + 1) % n if a == "flaps" else maxi(0, int(s["flapIdx"]) - 1)
		var lab := String((A["flapLabels"] as Array)[int(s["flapIdx"])])
		var fe := float(A["v"]["fe"])
		var over := int(s["flapIdx"]) > 0 and float((s["out"] as Dictionary)["ias"]) > fe
		return _say("フラップ %s%s%s" % [lab, "：揚力と抗力が減り、速く飛べる（巡航・上昇）" if int(s["flapIdx"]) == 0 else "：揚力と抗力が増え、遅く・深い角度で降りられる", ("　⚠ 白い帯の上限 Vfe %s kt を超えています" % _fmt_num(fe)) if over else ""], "bad" if over else "")
	elif a == "gear":
		if bool((A["gear"] as Dictionary)["fixed"]):
			return _say("この機体（Archer）の脚は固定式で、上げ下げできません")
		if bool(s["onGround"]) and bool(s["gearDown"]):
			return _say("地上では脚を上げられません")
		s["gearDown"] = not bool(s["gearDown"])
		return _say("脚 DOWN：着陸に備える（緑のランプ 3 つで確認）。抗力が増える" if bool(s["gearDown"]) else "脚 UP：抗力が減って上昇・加速しやすくなる（正の上昇を確認してから）")
	elif a == "trim":
		if bool(s["onGround"]):
			s["trim"] = 0.0
			s["trimHold"] = 0.0
			s["trimTgt"] = null
			return _say("地上ではトリムを離陸位置（中立）にしました")
		if bool((s["opts"] as Dictionary).get("assist", false)):
			return _say("操縦アシスト中はトリムは自動です")
		s["trimHold"] = float(s["elev"])
		s["trimTgt"] = FP.trimLevel(s)
		return _say("トリム %s %d%%：いまの速度で、手を離してもこの姿勢が続くように合わせました（ホイールが回り込んでいきます）" % ["機首上げ" if float(s["trimTgt"]) >= 0.0 else "機首下げ", absi(int(floorf(float(s["trimTgt"]) / FP.TRIM_MAX * 100.0 + 0.5)))])
	elif a == "thrFull" or a == "thrIdle":
		s["thr"] = 1.0 if a == "thrFull" else 0.0
		return _say("スロットル全開（Shift+R）：離陸・ゴーアラウンド・失速の回復で一気に出力を出す" if a == "thrFull" else "スロットル アイドル（Shift+F）：離陸中止・エンジン故障の模擬・着陸の接地前に一気に絞る")
	elif a == "trimReset":
		s["trim"] = 0.0
		s["trimHold"] = 0.0
		s["trimTgt"] = null
		return _say("トリムを中立（離陸位置）に戻しました")
	elif a == "level":
		if not bool(L.get("free", false)):
			return _say("L（水平に戻すアシスト）は自由飛行だけで使えます。訓練では自分で回復します")
		(s["opts"] as Dictionary)["levelT"] = 4.0
		return _say("数秒間、自動で翼を水平・水平飛行に戻します（自由飛行の補助）")
	elif a == "autoRud":
		if not bool(L.get("free", false)) and bool(A.get("twin", false)):
			for e in s["eng"]:
				if bool(e.get("failed", false)):
					return _say("片発の課目では自動ラダーは使えません。生きているエンジン側のラダー（Q / E）とラダートリム（Z / X）で、自分の足で方向を保つ練習です")
		(s["opts"] as Dictionary)["autoRud"] = not bool((s["opts"] as Dictionary).get("autoRud", false))
		prefs["autoRud"] = (s["opts"] as Dictionary)["autoRud"]
		if _save_prefs.is_valid():
			_save_prefs.call(prefs)
		return _say("自動ラダー ON：ボールを自動で中央に保ちます" if bool((s["opts"] as Dictionary)["autoRud"]) else "自動ラダー OFF：Q / E でボールを中央に（離陸・上昇は右ラダー E。片発では生きている側の足）")
	elif a == "feather0" or a == "feather1":
		if not bool(A.get("twin", false)):
			return _say("フェザーは双発機（Seminole）のプロペラ操作です")
		var i := 0 if a == "feather0" else 1
		var e: Dictionary = s["eng"][i]
		var side := "左" if i == 0 else "右"
		if bool(e.get("feather", false)):
			return _say("%sのプロペラはすでにフェザーです" % side)
		e["feather"] = true
		e["cut"] = true
		if not bool(e.get("failed", false)):
			return _say("⚠ %sエンジンは動いていました。生きているエンジンを止めました（重大な誤り）。Identify → Verify → Feather の順で" % side, "bad")
		return _say("%sのプロペラをフェザー：羽根を風に平行にして回転を止め、抗力を大きく減らしました" % side, "good")
	elif a == "restart0" or a == "restart1":
		if not bool(A.get("twin", false)):
			return ""
		if not bool(L.get("free", false)):
			return _say("訓練中はエンジンの再始動はできません")
		var e2: Dictionary = s["eng"][0 if a == "restart0" else 1]
		e2["feather"] = false
		e2["cut"] = false
		e2["failed"] = false
		e2["on"] = true
		return _say("エンジンを再始動（自由飛行の補助）")
	elif a == "rtrimL" or a == "rtrimR":
		rTrim = _clamp(rTrim + (0.05 if a == "rtrimR" else -0.05), -0.6, 0.6)
		return _say("ラダートリム %s：ラダーを踏み続けなくてよいように" % ("中立" if rTrim == 0.0 else "%s %d%%" % ["右" if rTrim > 0.0 else "左", int(floorf(absf(rTrim) * 100.0 + 0.5))]))
	elif a == "trimStep":
		if bool((s["opts"] as Dictionary).get("assist", false)):
			return _say("操縦アシスト中はトリムは自動です")
		s["trim"] = _clamp(float(s["trim"]) + (-1.0 if float(arg) < 0.0 else 1.0) * FP.TRIM_MAX * 0.04, -FP.TRIM_MAX, FP.TRIM_MAX)
		s["trimHold"] = float(s["elev"])
		s["trimTgt"] = null
		return _say("トリム %s" % _trim_txt(s))
	elif a == "thrStep":
		s["thr"] = _clamp(float(s["thr"]) + (-0.05 if float(arg) < 0.0 else 0.05), 0.0, 1.0)
		return _say("スロットル %d%%" % _pct(float(s["thr"])))
	elif a == "parkBrake":
		parkBrake = not parkBrake if arg == null else bool(arg)
		if parkBrake:
			s["brake"] = true
		return _say("パーキングブレーキ セット：止まっている間は機体をここに保つ（動き出す前に解除）" if parkBrake else "パーキングブレーキ 解除：B / Space で必要なときだけブレーキ")
	return ""

static func _fmt_num(v: float) -> String:
	return str(int(v)) if v == floorf(v) else str(v)

func _pad_act(L, a: String) -> void:
	var text := action(L, a)
	if not text.is_empty():
		padOut.append({"type": "toast", "text": text, "kind": kind})

# the gamepad (standard mapping), in flight. Pads are Dictionaries
# { connected, id, mapping, axes: [...], buttons: [{value} | number] }.
func pad_input(L, dt: float):
	var all = _get_gamepads.call() if _get_gamepads.is_valid() else []
	var pads: Array = []
	if typeof(all) == TYPE_ARRAY:
		for i in range(all.size()):
			var p = all[i]
			if typeof(p) == TYPE_DICTIONARY and bool(p.get("connected", false)):
				pads.append(p)
	var pad: Dictionary = _pad
	if pads.is_empty():
		pad["known"] = null
		return null
	var ids_arr: Array = []
	for p in pads:
		ids_arr.append(String(p.get("id", "")))
	var ids := " + ".join(ids_arr)
	if pad["known"] != ids:
		pad["known"] = ids
		var all_std := true
		for p in pads:
			if String(p.get("mapping", "")) != "standard":
				all_std = false
		padOut.append({"type": "toast", "text": "コントローラーを認識しました%s" % ("" if all_std else "：このブラウザでは配置が標準ではないため、一部のボタンが違う場合があります"), "kind": ""})
	var btn_m = func(i: int) -> float:
		var v := 0.0
		for p in pads:
			v = maxf(v, _btn(p, i))
		return v
	var E: Array = pad["edge"]
	for i in range(18):
		var now: bool = float(btn_m.call(i)) > 0.5
		var was := bool((pad["prev"] as Array)[i])
		pad["prev"][i] = now
		E[i] = now and not was
	var out: Dictionary = pad["out"]
	out["stick"] = false
	out["tr"] = 0.0
	out["tp"] = 0.0
	out["ty"] = 0.0
	out["brake"] = false
	out["brakeL"] = null
	out["brakeR"] = null
	if L == null:
		return out
	var s: Dictionary = L["s"]
	if L.get("check") != null and bool(E[0]):
		padOut.append({"type": "checklist"})
	if L.get("atc") != null:
		if bool(E[2]):
			padOut.append({"type": "atc", "i": 0})
		elif bool(E[1]):
			padOut.append({"type": "atc", "i": 1})
		elif bool(E[3]):
			padOut.append({"type": "atc", "i": 2})
	var MAP := pad_map_of(prefs)
	var base_dz := float(prefs["padDz"]) if typeof(prefs.get("padDz")) == TYPE_INT or typeof(prefs.get("padDz")) == TYPE_FLOAT else 0.12
	var raw = func(e) -> Variant:
		if e == null:
			return null
		var cand: Array = []
		if int(e.get("pad", -1)) >= 0:
			if int(e["pad"]) < pads.size():
				cand = [pads[int(e["pad"])]]
		else:
			cand = pads
		for p in cand:
			var axes = p.get("axes")
			if typeof(axes) == TYPE_ARRAY and int(e["axis"]) < (axes as Array).size():
				var v := float(axes[int(e["axis"])])
				return (-v if bool(e.get("inv", false)) else v)
		return null
	var axv = func(e) -> float:
		var v = raw.call(e)
		if v == null:
			return 0.0
		var z := float(e["dz"]) if e != null and (typeof(e.get("dz")) == TYPE_INT or typeof(e.get("dz")) == TYPE_FLOAT) else base_dz
		return _dz(v, z)
	var lx: float = axv.call(MAP["roll"])
	var ly: float = axv.call(MAP["pitch"])
	var rx: float = axv.call(MAP["yaw"])
	var ry: float = axv.call(MAP["trim"])
	if lx != 0.0 or ly != 0.0:
		out["stick"] = true
		out["tr"] = lx
		out["tp"] = ly
	out["ty"] = _clamp(rx + (btn_m.call(5) - btn_m.call(4)), -1.0, 1.0)
	if ry != 0.0 and not bool((s["opts"] as Dictionary).get("assist", false)):
		s["trim"] = _clamp(float(s["trim"]) + ry * 0.12 * dt, -FP.TRIM_MAX, FP.TRIM_MAX)
		s["trimTgt"] = null
	var thr_ax = func(e) -> Variant:
		var v = raw.call(e)
		return null if v == null else _clamp((float(v) + 1.0) / 2.0, 0.0, 1.0)
	var t_l = thr_ax.call(MAP["thrL"])
	var t_r = thr_ax.call(MAP["thrR"])
	var t_s = thr_ax.call(MAP["thr"])
	if t_l != null or t_r != null:
		if t_l != null and (s["eng"] as Array).size() > 0:
			s["eng"][0]["thr"] = float(t_l)
		if t_r != null and (s["eng"] as Array).size() > 1:
			s["eng"][1]["thr"] = float(t_r)
		if t_s != null:
			s["thr"] = float(t_s)
	elif t_s != null:
		s["thr"] = float(t_s)
	else:
		s["thr"] = _clamp(float(s["thr"]) + (btn_m.call(7) - btn_m.call(6)) * 0.5 * dt, 0.0, 1.0)
	var toe = func(e) -> Variant:
		var v = raw.call(e)
		return null if v == null else _clamp((float(v) + 1.0) / 2.0, 0.0, 1.0)
	out["brakeL"] = toe.call(MAP["brakeL"])
	out["brakeR"] = toe.call(MAP["brakeR"])
	if btn_m.call(0) > 0.5 and L.get("check") == null:
		out["brake"] = true
	if L.get("atc") == null:
		if bool(E[1]):
			_pad_act(L, "flaps")
		if bool(E[2]):
			_pad_act(L, "flapsUp")
		if bool(E[3]):
			padOut.append({"type": "view"})
	if bool(E[8]):
		_pad_act(L, "gear")
	if bool(E[9]):
		padOut.append({"type": "pause"})
		return out
	if bool(E[12]) or bool(E[13]):
		s["trim"] = _clamp(float(s["trim"]) + (0.02 if bool(E[13]) else -0.02), -FP.TRIM_MAX, FP.TRIM_MAX)
		s["trimTgt"] = null
	if bool(E[10]):
		_pad_act(L, "level")
	if bool(E[11]):
		_pad_act(L, "autoRud")
	if bool(E[14]):
		_pad_act(L, "feather0")
	if bool(E[15]):
		_pad_act(L, "feather1")
	if bool(E[16]):
		padOut.append({"type": "help"})
	return out

func padInput(L, dt: float):
	return pad_input(L, dt)

# the discrete action keys, with the player's rebindings (prefs.keyBinds) applied
func action_for(code: String, shift: bool):
	return action_for_key_bound(code, shift, prefs.get("keyBinds"))

func actionFor(code: String, shift: bool):
	return action_for(code, shift)

# live preference changes from the settings screen
func set_prefs(patch) -> void:
	if typeof(patch) == TYPE_DICTIONARY:
		for k in patch.keys():
			prefs[k] = patch[k]

func setPrefs(patch) -> void:
	set_prefs(patch)

# a new flight: no rudder trim, no held throttle, the parking brake off, keys held now ignored until released
func reset() -> void:
	rTrim = 0.0
	thrHeld = 0.0
	parkBrake = false
	padOut.clear()
	clear_keys()

func clear_keys() -> void:
	_muted.clear()
	_arm = true

func clearKeys() -> void:
	clear_keys()

func pad_id():
	return _pad["known"]
