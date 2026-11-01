class_name CadetAutopilot
extends RefCounted
# Port of cadet/src/flight/autopilot.js (HTML CADET @ 898fe8a) — the GFC700-class
# two-axis autopilot + flight director laws (drawApStrip is canvas UI: Phase 2+).
# Physics is FlightPhysics (statics). The one external dependency is the avionics'
# navSolve: injected as a Callable (av, {n, e}, out, magvarW, labRwy) -> Dictionary|null,
# matching FL.avionics.navSolve's signature. When no Callable is injected, the real
# CadetAvionics.nav_solve (src/avionics.gd, Phase 2) is used by default.
# flight = { L, s, av }; L = { s, av, last, done }.

const AP_MIN_ENGAGE_FT := 800.0
const AP_MIN_USE_FT := 200.0
const OVR_KEYS := ["KeyW", "KeyS", "KeyA", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]

var nav_solve: Callable
var st: Dictionary
var display: Dictionary

func _init(p_nav_solve: Callable = Callable()) -> void:
	if p_nav_solve.is_valid():
		nav_solve = p_nav_solve
	else:
		nav_solve = func(av, pos, o, var_w, rwy): return CadetAvionics.nav_solve(av, pos, o, var_w, rwy)
	st = { "on": false, "hdg": false, "alt": false, "nav": false, "apr": false, "vs": false, "lvl": false, "fd": false,
		"vsSel": 0.0, "gsCap": false, "fdBank": 0.0, "fdPitch": 0.0, "discTone": false,
		"flash": 0.0, "pBase": null, "lastVs": 0.0, "engagePitch": 0.0, "ovr": 0.0, "L": null }
	display = { "on": false, "hdg": false, "alt": false, "nav": false, "apr": false, "vs": false, "lvl": false, "flash": 0.0 }

func _lat_name() -> String:
	return "APR" if st["apr"] else "NAV" if st["nav"] else "HDG" if st["hdg"] else ""
func _vert_name() -> String:
	return "VS" if st["vs"] else "ALT" if st["alt"] else ""
func _modes() -> String:
	var parts: Array = []
	if not _lat_name().is_empty():
		parts.append(_lat_name())
	if not _vert_name().is_empty():
		parts.append(_vert_name())
	var j = "・".join(parts)
	return j if not j.is_empty() else "LVL（翼水平）" if st["lvl"] else "ピッチ・ロール保持"

func _nav_now(flight: Dictionary) -> Variant:
	var s = flight["s"]
	return nav_solve.call(flight["av"], { "n": -float(s["pos"][2]), "e": float(s["pos"][0]) }, s["out"], FlightPhysics.MAGVAR_W, FlightPhysics.lab_rwy())

func _vs_now(flight: Dictionary) -> float:
	var L = flight.get("L")
	if typeof(L) == TYPE_DICTIONARY and typeof(L.get("last")) == TYPE_DICTIONARY and (typeof(L["last"].get("vs")) == TYPE_INT or typeof(L["last"].get("vs")) == TYPE_FLOAT) and is_finite(float(L["last"]["vs"])):
		return float(L["last"]["vs"])
	return _num(flight["s"]["out"].get("vsi"))

# JS truthiness of a nav solution's flag: the Phase 1 stub used booleans, the real
# avionics (CadetAvionics.nav_solve) returns '' for no flag and a string like 'NO LOC'
# otherwise — bool('') is not a valid constructor in GDScript, so both shapes go here.
static func _flagged(n: Dictionary) -> bool:
	var f = n.get("flag", false)
	if typeof(f) == TYPE_BOOL:
		return bool(f)
	if typeof(f) == TYPE_STRING:
		return not String(f).is_empty()
	if typeof(f) == TYPE_INT or typeof(f) == TYPE_FLOAT:
		return float(f) != 0.0
	return f != null

static func _num(x) -> float:
	return float(x) if typeof(x) == TYPE_INT or typeof(x) == TYPE_FLOAT else 0.0
static func _clamp(x: float, a: float, b: float) -> float:
	return FlightPhysics.clampf_(x, a, b)

func engage(flight: Dictionary, what: String) -> String:
	var s = flight.get("s")
	if typeof(flight.get("L")) != TYPE_DICTIONARY or bool(flight["L"].get("done", false)) or typeof(s) != TYPE_DICTIONARY:
		return "飛行が始まっていません"
	if bool(s.get("crashed", false)):
		return ""
	if bool(s["onGround"]):
		return "オートパイロットは空中で接続します"
	if float(s["out"]["agl"]) < AP_MIN_ENGAGE_FT:
		return "高度が足りません：オートパイロットの接続は対地 %d ft 以上で" % int(AP_MIN_ENGAGE_FT)
	if what == "AP_APR":
		var n = _nav_now(flight)
		if typeof(n) != TYPE_DICTIONARY or n.get("src") != "LOC1" or _flagged(n):
			return "APR：ローカライザーの信号がありません（CDI を NAV1 に）"
	st["on"] = true; st["L"] = flight["L"]; st["flash"] = 0.0; st["ovr"] = 0.0; st["lvl"] = false; st["gsCap"] = false
	st["nav"] = what == "AP_NAV" or what == "AP_APR"
	st["apr"] = what == "AP_APR"
	st["hdg"] = what == "AP" or what == "AP_HDG"
	st["alt"] = what == "AP" or what == "AP_ALT" or what == "AP_VS"
	st["vs"] = what == "AP_VS"
	if bool(st["vs"]):
		st["vsSel"] = _clamp(float(_js_round(_vs_now(flight) / 100.0) * 100), -1500.0, 1500.0)
	st["engagePitch"] = float(s["out"]["pitch"])
	st["pBase"] = null
	return "オートパイロット接続：%s（バグは PFD のノブで）" % _modes()

static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))

func _disconnect(flash: bool) -> void:
	st["on"] = false; st["hdg"] = false; st["alt"] = false; st["nav"] = false; st["apr"] = false; st["vs"] = false; st["lvl"] = false; st["gsCap"] = false; st["pBase"] = null; st["ovr"] = 0.0
	if flash:
		st["flash"] = 2.5
		st["discTone"] = true
	if typeof(st.get("L")) == TYPE_DICTIONARY and typeof(st["L"].get("s")) == TYPE_DICTIONARY and not bool(st["L"]["s"]["onGround"]):
		st["L"]["s"]["keyHold"] = true
		st["L"]["s"]["pTgt"] = float(st["L"]["s"]["out"]["pitch"])
		st["L"]["s"]["pRate"] = 0.0

func control(flight: Dictionary, what: String) -> String:
	if flight.is_empty() or flight.get("av") == null:
		return ""
	if what == "FD":
		st["fd"] = not bool(st["fd"])
		if typeof(flight.get("L")) == TYPE_DICTIONARY:
			st["L"] = flight["L"]
		if bool(st["fd"]) and typeof(flight.get("s")) == TYPE_DICTIONARY:
			st["engagePitch"] = float(flight["s"]["out"]["pitch"])
		return "FD オン：フライトディレクター表示" if st["fd"] else "FD オフ"
	if what == "AP":
		if bool(st["on"]):
			_disconnect(true)
			return "オートパイロット解除"
		return engage(flight, "AP")
	if what == "AP_LVL":
		if not bool(st["on"]):
			var r = engage(flight, "AP")
			if not bool(st["on"]):
				return r
		st["hdg"] = false; st["nav"] = false; st["apr"] = false; st["vs"] = false; st["alt"] = false; st["lvl"] = true; st["gsCap"] = false
		if typeof(flight.get("s")) == TYPE_DICTIONARY:
			st["engagePitch"] = float(flight["s"]["out"]["pitch"])
		return "LVL：翼を水平に、いまのピッチを保ちます"
	if not bool(st["on"]):
		return engage(flight, what)
	if what == "AP_HDG":
		st["hdg"] = not bool(st["hdg"])
		if bool(st["hdg"]):
			st["nav"] = false; st["apr"] = false; st["lvl"] = false
		return "HDG オン：方位バグへ" if st["hdg"] else "HDG オフ：翼は水平に保ちます"
	if what == "AP_NAV":
		st["nav"] = not bool(st["nav"])
		if bool(st["nav"]):
			st["hdg"] = false; st["lvl"] = false
		else:
			st["apr"] = false
		return "NAV オン：CDI ソースを追います" if st["nav"] else "NAV オフ"
	if what == "AP_APR":
		if not bool(st["apr"]):
			var n = _nav_now(flight)
			if typeof(n) != TYPE_DICTIONARY or n.get("src") != "LOC1" or _flagged(n):
				return "APR：ローカライザーの信号がありません（CDI を NAV1 に）"
		st["apr"] = not bool(st["apr"])
		if bool(st["apr"]):
			st["nav"] = true; st["hdg"] = false; st["lvl"] = false; st["gsCap"] = false
		return "APR オン：ローカライザーとグライドスロープへ" if st["apr"] else "APR オフ（NAV は継続）"
	if what == "AP_VS":
		st["vs"] = not bool(st["vs"])
		if bool(st["vs"]) and typeof(flight.get("s")) == TYPE_DICTIONARY:
			st["vsSel"] = _clamp(float(_js_round(_vs_now(flight) / 100.0) * 100), -1500.0, 1500.0)
		if bool(st["vs"]):
			st["pBase"] = null
		return "VS オン：%s%d fpm（ALT は選択高度で待機）" % ["+" if float(st["vsSel"]) > 0.0 else "", int(st["vsSel"])] if st["vs"] else "VS オフ"
	if what == "AP_ALT":
		st["alt"] = not bool(st["alt"])
		if bool(st["alt"]):
			st["pBase"] = null
			st["vs"] = false
		elif typeof(flight.get("s")) == TYPE_DICTIONARY:
			st["engagePitch"] = float(flight["s"]["out"]["pitch"])
		return "ALT オン：選択高度へ" if st["alt"] else "ALT オフ：いまのピッチを保ちます"
	return ""

func pilot(L: Dictionary, dt: float) -> void:
	if (not bool(st["on"]) and not bool(st["fd"])) or L != st["L"]:
		return
	var s = L["s"]
	var av = L["av"]
	var c = L.get("last")
	var o = s["out"]
	if typeof(c) != TYPE_DICTIONARY or bool(s["onGround"]) or bool(s.get("crashed", false)):
		return
	var bank_t = 0.0
	if bool(st["nav"]) or bool(st["apr"]):
		var nav = nav_solve.call(av, { "n": -float(s["pos"][2]), "e": float(s["pos"][0]) }, o, FlightPhysics.MAGVAR_W, FlightPhysics.lab_rwy())
		if typeof(nav) == TYPE_DICTIONARY and not _flagged(nav) and nav.get("dots") != null:
			var hdg_cmd = null
			if nav["src"] == "GPS":
				hdg_cmd = float(nav["dtk"]) + _clamp(float(nav["dots"]) * (16.0 if absf(float(nav["dots"])) >= 2.0 else 10.0), -40.0, 40.0)
			else:
				hdg_cmd = float(nav["crs"]) + _clamp(float(nav["dots"]) * (13.0 if nav["src"] == "LOC1" else 9.0), -30.0, 30.0)
			if hdg_cmd != null and is_finite(float(hdg_cmd)):
				bank_t = _clamp(FlightPhysics.wrap180(float(hdg_cmd) - float(c["hdg"])) * 1.5, -25.0, 25.0)
	elif bool(st["hdg"]):
		bank_t = _clamp(FlightPhysics.wrap180(float(av["hdgBug"]) - float(c["hdg"])) * 1.5, -25.0, 25.0)
	var vs_law = null  # { vsT } or null
	if bool(st["apr"]):
		var nav2 = nav_solve.call(av, { "n": -float(s["pos"][2]), "e": float(s["pos"][0]) }, o, FlightPhysics.MAGVAR_W, FlightPhysics.lab_rwy())
		if typeof(nav2) == TYPE_DICTIONARY and nav2.get("gsDots") != null and absf(float(nav2["gsDots"])) <= 1.0:
			st["gsCap"] = true
		if bool(st["gsCap"]) and typeof(nav2) == TYPE_DICTIONARY and nav2.get("gsDots") != null:
			vs_law = { "vsT": _clamp(-_num(o.get("gs")) * 5.31 + float(nav2["gsDots"]) * 120.0, -1200.0, 300.0) }
	if vs_law == null and bool(st["vs"]):
		if absf(float(av["altSel"]) - float(c["alt"])) <= 100.0:
			st["vs"] = false; st["alt"] = true; st["pBase"] = null
		else:
			vs_law = { "vsT": float(st["vsSel"]) }
	if vs_law == null and bool(st["alt"]):
		vs_law = { "vsT": _clamp((float(av["altSel"]) - float(c["alt"])) * 3.0, -700.0, 700.0) }
	var pitch_t: float
	if vs_law != null:
		if st["pBase"] == null:
			st["pBase"] = float(c["pitch"])
			st["lastVs"] = float(c["vs"])
		st["pBase"] = _clamp(float(st["pBase"]) + (float(vs_law["vsT"]) - float(c["vs"])) * 0.0012 * dt, -10.0, 15.0)
		var dvs = _clamp((float(c["vs"]) - float(st["lastVs"])) / maxf(dt, 1e-4), -600.0, 600.0)
		st["lastVs"] = float(c["vs"])
		pitch_t = _clamp(float(st["pBase"]) + (float(vs_law["vsT"]) - float(c["vs"])) * 0.004 - 0.004 * dvs, -20.0, 22.0)
	else:
		pitch_t = _clamp(float(st["engagePitch"]), -20.0, 22.0)
	st["fdBank"] = bank_t
	st["fdPitch"] = pitch_t
	if not bool(st["on"]):
		return
	var p = -float(s["w"][2]) / FlightPhysics.DEG
	s["rIn"] = _clamp(0.045 * (bank_t - float(o["bank"])) - 0.012 * p, -1.0, 1.0)
	s["keyHold"] = true
	s["pTgt"] = pitch_t
	s["pRate"] = 0.0
	var d = _clamp(FlightPhysics.trimLevel(s) - float(s["trim"]), -0.06 * dt, 0.06 * dt)
	if d != 0.0:
		s["trim"] = float(s["trim"]) + d
		s["trimTgt"] = null

func update(dt: float, flight: Dictionary, input = null) -> String:
	if float(st["flash"]) > 0.0:
		st["flash"] = maxf(0.0, float(st["flash"]) - dt)
	if not bool(st["on"]):
		return ""
	var L = flight.get("L") if typeof(flight) == TYPE_DICTIONARY else null
	var s = flight.get("s") if typeof(flight) == TYPE_DICTIONARY else null
	if typeof(L) != TYPE_DICTIONARY or L != st["L"] or bool(L.get("done", false)) or typeof(s) != TYPE_DICTIONARY or bool(s.get("crashed", false)):
		_disconnect(false)
		return ""
	if bool(s["onGround"]):
		_disconnect(false)
		return ""
	if float(s["out"]["agl"]) < AP_MIN_USE_FT:
		_disconnect(true)
		return "オートパイロット解除：対地 %d ft 以下では使えません" % int(AP_MIN_USE_FT)
	if bool(s["out"].get("stallWarn", false)):
		_disconnect(true)
		return "オートパイロット解除：失速警報"
	var manual = false
	if typeof(input) == TYPE_DICTIONARY and typeof(input.get("down")) == TYPE_CALLABLE:
		for k in OVR_KEYS:
			if bool(input["down"].call(k)):
				manual = true
				break
	if absf(_num(s.get("pKey"))) > 0.35 or absf(_num(s.get("rKey"))) > 0.35:
		manual = true
	st["ovr"] = float(st["ovr"]) + dt if manual else 0.0
	if float(st["ovr"]) >= 0.3:
		_disconnect(true)
		return "オートパイロット解除：操縦入力"
	return ""

func sync(av: Dictionary) -> void:
	if av.is_empty() and false:
		return
	var d = av.get("ap")
	if typeof(d) != TYPE_DICTIONARY:
		d = { "on": false, "hdg": false, "alt": false, "flash": 0.0 }
		av["ap"] = d
	d["on"] = st["on"]; d["hdg"] = st["hdg"]; d["alt"] = st["alt"]; d["nav"] = st["nav"]; d["apr"] = st["apr"]; d["vs"] = st["vs"]; d["lvl"] = st["lvl"]; d["flash"] = st["flash"]
	display["on"] = st["on"]; display["hdg"] = st["hdg"]; display["alt"] = st["alt"]; display["nav"] = st["nav"]; display["apr"] = st["apr"]; display["vs"] = st["vs"]; display["lvl"] = st["lvl"]; display["flash"] = st["flash"]
	var f = av.get("fd")
	if typeof(f) != TYPE_DICTIONARY:
		f = { "on": false, "bank": 0.0, "pitch": 0.0 }
		av["fd"] = f
	f["on"] = bool(st["fd"]) or bool(st["on"])
	f["bank"] = st["fdBank"]
	f["pitch"] = st["fdPitch"]

func reset() -> void:
	st["on"] = false; st["hdg"] = false; st["alt"] = false; st["nav"] = false; st["apr"] = false; st["vs"] = false; st["lvl"] = false; st["fd"] = false; st["gsCap"] = false; st["flash"] = 0.0; st["pBase"] = null; st["ovr"] = 0.0; st["L"] = null

func take_disc_tone() -> bool:
	var t = bool(st["discTone"])
	st["discTone"] = false
	return t
func is_on() -> bool:
	return bool(st["on"])
func is_fd_on() -> bool:
	return bool(st["fd"])
func flash() -> float:
	return float(st["flash"])
