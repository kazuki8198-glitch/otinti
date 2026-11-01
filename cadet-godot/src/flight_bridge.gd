class_name CadetFlightBridge
extends RefCounted

## CADET Godot port — Phase 2: flight ブリッジ。
## cadet/src/flight/flight.js (createFlight, 351行) の GDScript 移植。
## FLIGHT LAB の physics (120 Hz) と school (レッスン・採点・記録) を app.js と
## 同じ作法で駆動する：コントロールはフレームに1回、物理は固定 1/120 s を
## アキュムレータから最大30ステップ、各ステップ後に school.update / free_update。
## 相違点（Phase 2 の正直な範囲）:
##  - store は localStorage ではなく Dictionary（キー→JSON文字列）。呼び出し側が
##    永続化したい場合は同じ Dictionary をファイルに書けばよい（school 側の形式と同一）。
##  - inWorld（「教材」→訓練側の言い換え）は文字列置換の簡易版。ourCall（コールサイン
##    差し替え）は CADET コンテンツ層の未移植機能に依存するため Phase 3 送り。

const FP = preload("res://src/physics.gd")
const SC = preload("res://src/school.gd")
const AV = preload("res://src/avionics.gd")
const CT = preload("res://src/controls.gd")

const H := 1.0 / 120.0
const MAX_STEPS := 30
const WINDS := {
	"calm": {"rel": 0, "kt": 0, "gust": 0.3}, "light": {"rel": 10, "kt": 5, "gust": 0.5},
	"cross": {"rel": 60, "kt": 12, "gust": 1.2}, "gusty": {"rel": 70, "kt": 15, "gust": 2.5},
}
const DEG := PI / 180.0

static func in_world(text: String) -> String:
	if not text.contains("教材"):
		return text
	var t := text
	# （教材…）の括弧書きを落とす（JS 版は正規表現、本ポートは簡易走査）
	while true:
		var i := t.find("（教材")
		if i < 0:
			break
		var j := t.find("）", i)
		if j < 0:
			break
		t = t.substr(0, i) + t.substr(j + 1)
	t = t.replace("教材の簡略版", "簡略版").replace("教材基準", "基準").replace("教材", "訓練")
	return t

var ctl: CadetControls
var store: Dictionary
var L = null
var _acc := 0.0
var _last_right := ""
var _prev := {"pos": [0.0, 0.0, 0.0], "q": [0.0, 0.0, 0.0, 1.0]}
var res := {"steps": 0, "events": [], "pad": [], "ended": false}
var tally := {"time": 0.0, "landings": 0}
var _gr := {"step": -1, "n": 0, "on": false}
var _pin := {"on": false, "x": 0.0, "z": 0.0, "h": 0.0}
var _shown := {"L": null, "n": -1, "results": []}

# opts: { store: Dictionary, prefs: Dictionary, getGamepads: Callable, readPad: Callable }
func _init(opts: Dictionary = {}) -> void:
	store = opts.get("store") if typeof(opts.get("store")) == TYPE_DICTIONARY else {}
	var copts := {"prefs": opts.get("prefs") if typeof(opts.get("prefs")) == TYPE_DICTIONARY else CadetControls.PREFS0.duplicate(true)}
	if typeof(opts.get("getGamepads")) == TYPE_CALLABLE:
		copts["getGamepads"] = opts["getGamepads"]
	if typeof(opts.get("readPad")) == TYPE_CALLABLE:
		copts["readPad"] = opts["readPad"]
	ctl = CadetControls.new(copts)

func _snap() -> void:
	if L == null:
		return
	var s: Dictionary = L["s"]
	_prev["pos"] = [float(s["pos"][0]), float(s["pos"][1]), float(s["pos"][2])]
	_prev["q"] = [float(s["q"][0]), float(s["q"][1]), float(s["q"][2]), float(s["q"][3])]

func _begin(nl) -> Dictionary:
	L = nl
	_acc = 0.0
	_last_right = ""
	ctl.reset()
	res = {"steps": 0, "events": [], "pad": [], "ended": false}
	_gr = {"step": -1, "n": 0, "on": false}
	_pin = {"on": false, "x": 0.0, "z": 0.0, "h": 0.0}
	_snap()
	return L

# ---------------------------------------------------------------- starts
func start_lesson(id: String, level_id: String = "intro", o: Dictionary = {}) -> Variant:
	var def = SC.lesson(id)
	if typeof(def) != TYPE_DICTIONARY or def.get("steps") == null:
		return null
	var opt := {"sens": o.get("sens", ctl.prefs["sens"]), "autoRud": o.get("autoRud", ctl.prefs["autoRud"]), "gainCap": o.get("gainCap", ctl.prefs["gainCap"])}
	if o.get("wind") != null:
		opt["wind"] = o["wind"]
	if o.get("oatDev") != null:
		opt["oatDev"] = o["oatDev"]
	var nl: Dictionary = SC.start_lesson(id, level_id, opt)
	(nl["s"]["opts"] as Dictionary)["assist"] = false
	return _begin(nl)

func start_free(start_id: String = "rwy", aircraft: String = "pa28", o: Dictionary = {}) -> Dictionary:
	var wname = o.get("wind", "light")
	var W: Dictionary = wname if typeof(wname) == TYPE_DICTIONARY else (WINDS[wname] if WINDS.has(wname) else WINDS["light"])
	var opt := {"sens": o.get("sens", ctl.prefs["sens"]), "autoRud": o.get("autoRud", ctl.prefs["autoRud"]),
		"assist": o.get("assist", ctl.prefs["assist"]), "wind": W, "gainCap": o.get("gainCap", ctl.prefs["gainCap"])}
	if o.get("oatDev") != null:
		opt["oatDev"] = o["oatDev"]
	return _begin(SC.start_free(start_id, aircraft, opt))

# エプロン等の舗装点に静止して始めるフリー飛行（パーキングブレーキ保持つき）
func start_on_ground(n: float, e: float, hdg_true: float, aircraft: String = "pa28", o: Dictionary = {}) -> Dictionary:
	var wname = o.get("wind", "light")
	var W: Dictionary = wname if typeof(wname) == TYPE_DICTIONARY else (WINDS[wname] if WINDS.has(wname) else WINDS["light"])
	var nl: Dictionary = SC.start_free("rwy", aircraft, {"sens": o.get("sens", ctl.prefs["sens"]), "autoRud": o.get("autoRud", ctl.prefs["autoRud"]),
		"assist": o.get("assist", ctl.prefs["assist"]), "wind": W})
	var s: Dictionary = nl["s"]
	s["q"] = FP.qFromHPB(hdg_true, 0.0, 0.0)
	s["pos"] = [e, FP.GROUND_M - float(s["WHEEL_BOTTOM"]) + 0.02, -n]
	s["flapIdx"] = 0; s["flapDeg"] = 0.0; s["thr"] = 0.0; s["trim"] = 0.0; s["trimTgt"] = null; s["brake"] = false
	s["gearDown"] = true; s["gearPos"] = 1.0
	s["onGround"] = true; s["airTime"] = 0.0; s["wasOnRunway"] = false; s["lastRwyT"] = s["t"]
	var contacts := []
	for w in s["WHEELS"]:
		contacts.append(true)
	s["contacts"] = contacts
	s["rpm"] = FP.rpmFor(s["A"], 0.0, 0.0)
	for en in s["eng"]:
		en["rpm"] = s["rpm"]
	FP.derive(s)
	nl["hdg0"] = int(round(AV.true_to_mag(hdg_true, FP.MAGVAR_W))) % 360
	if int(nl["hdg0"]) == 0:
		nl["hdg0"] = 360
	(nl["av"] as Dictionary)["hdgBug"] = nl["hdg0"]
	nl["prevHdg"] = null; nl["rateF"] = null; nl["last"] = SC.ctx(nl)
	_begin(nl)
	ctl.action(nl, "parkBrake", true)
	_pin = {"on": true, "x": float(s["pos"][0]), "z": float(s["pos"][2]), "h": hdg_true}
	return nl

func continue_free() -> Variant:
	if L == null:
		return null
	var old: Dictionary = L
	var s: Dictionary = old["s"]
	var nl: Dictionary = SC.start_free("rwy", String(s["A"]["id"]), {"sens": s["opts"]["sens"], "autoRud": bool(s["opts"].get("autoRud", false)), "assist": false})
	nl["s"] = s; nl["av"] = old["av"]; nl["A"] = s["A"]; nl["V"] = s["A"]["v"]; nl["evSeen"] = old.get("evSeen", 0)
	nl["alt0"] = old.get("alt0"); nl["hdg0"] = old.get("hdg0"); nl["prevHdg"] = null; nl["rateF"] = null
	nl["last"] = SC.ctx(nl)
	var keep_park: bool = ctl.parkBrake
	_begin(nl)
	if keep_park:
		ctl.action(nl, "parkBrake", true)
	return nl

# ---------------------------------------------------------------- realtime path
# keys: { code文字列: true } の Dictionary（input_map.poll_keys の出力）
# opts: { paused: bool, pilot: Callable(L, dt), airPilot: bool }
func frame(dt: float, keys: Dictionary, opts: Dictionary = {}) -> Dictionary:
	res["steps"] = 0
	(res["events"] as Array).clear()
	(res["pad"] as Array).clear()
	res["ended"] = false
	if L == null:
		return res
	var paused := bool(opts.get("paused", false))
	var pilot: Callable = opts.get("pilot") if typeof(opts.get("pilot")) == TYPE_CALLABLE else Callable()
	var air_pilot := bool(opts.get("airPilot", false))
	var dtr := clampf(dt, 0.0, 0.1)
	var was_done := bool(L["done"])
	var flying := not paused and not bool(L["done"])
	ctl.update(L, dtr, keys, flying)
	var po: Array = ctl.padOut
	for e in po:
		if String(e.get("type")) == "checklist":
			e["r"] = checklist_next()
		elif String(e.get("type")) == "atc":
			e["r"] = answer_atc(int(e.get("i", 0)))
		(res["pad"] as Array).append(e)
	po.clear()
	if not flying:
		_acc = 0.0
		_snap()
		_collect()
		return res
	_acc += dtr
	var n := 0
	var s: Dictionary = L["s"]
	while _acc >= H and n < MAX_STEPS:
		_prev["pos"] = [float(s["pos"][0]), float(s["pos"][1]), float(s["pos"][2])]
		_prev["q"] = [float(s["q"][0]), float(s["q"][1]), float(s["q"][2]), float(s["q"][3])]
		if pilot.is_valid() and (bool(L.get("free", false)) or air_pilot):
			pilot.call(L, H)
		FP.step(s, H)
		_park_hold(s)
		if bool(L.get("free", false)):
			SC.free_update(L, H)
		else:
			SC.update(L, H)
		_acc -= H
		n += 1
	if n == MAX_STEPS:
		_acc = 0.0
	res["steps"] = n
	tally["time"] = float(tally["time"]) + n * H
	if n > 0:
		_graded_now()
	_collect()
	if bool(L["done"]):
		_snap()
	res["ended"] = not was_done and bool(L["done"])
	return res

func _park_hold(s: Dictionary) -> void:
	if not ctl.parkBrake or bool(s["crashed"]) or (not bool(s["onGround"]) and float(s["airTime"]) > 0.5):
		_pin["on"] = false
		return
	if not bool(_pin["on"]):
		if not bool(s["onGround"]) or Vector2(float(s["vel"][0]), float(s["vel"][2])).length() > 0.3:
			return
		_pin = {"on": true, "x": float(s["pos"][0]), "z": float(s["pos"][2]), "h": float(FP.attitude(s)["hdg"])}
	s["pos"][0] = _pin["x"]; s["pos"][2] = _pin["z"]
	s["vel"][0] = 0.0; s["vel"][2] = 0.0; s["w"][1] = 0.0
	var d := _wrap180(float(_pin["h"]) - float(FP.attitude(s)["hdg"])) * DEG
	if d != 0.0:
		s["q"] = FP.qmul([0.0, sin(-d / 2.0), 0.0, cos(-d / 2.0)], s["q"])

static func _wrap180(a: float) -> float:
	return fmod(a + 540.0, 360.0) - 180.0

func _collect() -> void:
	var ev: Array = L["s"]["events"]
	var seen := int(L.get("evSeen", 0))
	while seen < ev.size():
		var e: Dictionary = ev[seen]
		seen += 1
		if e.get("why") != null and in_world(String(e["why"])) != String(e["why"]):
			var c := e.duplicate()
			c["why"] = in_world(String(e["why"]))
			(res["events"] as Array).append(c)
		else:
			(res["events"] as Array).append(e)
		if String(e.get("type")) == "touchdown":
			tally["landings"] = int(tally["landings"]) + 1
	L["evSeen"] = seen

func _graded_now() -> void:
	var sum := 0
	var st = L.get("st")
	if typeof(st) == TYPE_DICTIONARY and typeof(st.get("stats")) == TYPE_DICTIONARY:
		for k in st["stats"]:
			sum += int(st["stats"][k].get("n", 0))
	_gr["on"] = int(_gr["step"]) == int(L["step"]) and sum > int(_gr["n"])
	_gr["step"] = int(L["step"])
	_gr["n"] = sum

# ---------------------------------------------------------------- scripted (test) path
func run_scripted(pilot: Callable, max_sec: float = 900.0, hook := Callable()) -> Variant:
	if L == null:
		return null
	var steps := int(max_sec * 120.0)
	for i in range(steps):
		if bool(L["done"]):
			break
		pilot.call(L, H)
		if hook.is_valid():
			hook.call(L, i * H)
		FP.step(L["s"], H)
		if bool(L.get("free", false)):
			SC.free_update(L, H)
		else:
			SC.update(L, H)
	_acc = 0.0
	_snap()
	return L

# ---------------------------------------------------------------- pilot inputs
func action(name: String, arg = null) -> String:
	if L == null or bool(L["done"]):
		return ""
	return ctl.action(L, name, arg)

func checklist_next() -> Dictionary:
	if L == null:
		return {"ok": false, "text": ""}
	var r: Dictionary = SC.checklist_next(L)
	r["text"] = in_world(String(L.get("hint", ""))) if not bool(r.get("ok", false)) and r.get("item") != null else ""
	return r

func answer_atc(i: int) -> Variant:
	if L == null:
		return null
	var r = SC.answer_atc(L, i)
	if typeof(r) == TYPE_DICTIONARY:
		_last_right = String(r.get("right", ""))
		r["why"] = in_world(String(r.get("why", "")))
	return r

func key(code: String, shift: bool = false) -> Variant:
	if L == null or bool(L["done"]):
		return null
	if (code == "Enter" or code == "NumpadEnter") and L.get("check") != null:
		var rc := checklist_next()
		return {"kind": "checklist", "ok": bool(rc["ok"]), "text": String(rc["text"])}
	if (code.begins_with("Digit") or code.begins_with("Numpad")) and L.get("atc") != null:
		var tail := code.substr(code.length() - 1)
		if tail in ["1", "2", "3"]:
			var ra = answer_atc(int(tail) - 1)
			if typeof(ra) == TYPE_DICTIONARY:
				return {"kind": "atc", "ok": bool(ra["ok"]), "text": ("正解。" if bool(ra["ok"]) else "不正解。正しくは「" + _last_right + "」。") + String(ra["why"])}
			return null
	var a = CadetControls.action_for_key(code, shift)
	if a == null:
		return null
	return {"kind": "action", "name": a, "text": ctl.action(L, a), "tone": ctl.kind}

func abort(reason: String = "中止") -> void:
	if L != null and not bool(L.get("free", false)):
		SC.abort(L, reason)

func crash(reason: String) -> void:
	if L == null:
		return
	var s: Dictionary = L["s"]
	if bool(s["crashed"]):
		return
	s["crashed"] = true; s["crashReason"] = reason
	s["vel"] = [0.0, 0.0, 0.0]; s["w"] = [0.0, 0.0, 0.0]
	(s["events"] as Array).append({"t": s["t"], "type": "crash", "why": reason})
	FP.derive(s)

# ---------------------------------------------------------------- record / progress
func _flush(prog: Dictionary) -> Dictionary:
	prog["time"] = float(prog.get("time", 0.0)) + float(tally["time"])
	prog["landings"] = int(prog.get("landings", 0)) + int(tally["landings"])
	tally = {"time": 0.0, "landings": 0}
	return prog

func finish() -> Variant:
	if L == null:
		return null
	if bool(L.get("free", false)):
		SC.save_progress(store, _flush(SC.load_progress(store)))
		return null
	if not bool(L["done"]) or bool(L.get("endHandled", false)):
		return null
	L["endHandled"] = true
	var prog := _flush(SC.load_progress(store))
	SC.note_lesson(prog, L)
	SC.save_progress(store, prog)
	var rec = SC.record_from_lesson(L, "")
	if typeof(rec) == TYPE_DICTIONARY:
		rec["reason"] = in_world(String(rec.get("reason", "")))
		for S in rec.get("steps", []):
			S["step"] = in_world(String(S.get("step", "")))
			for x in S.get("rows", []):
				x["name"] = in_world(String(x.get("name", "")))
				x["val"] = in_world(String(x.get("val", "")))
				x["std"] = in_world(String(x.get("std", "")))
		for e in rec.get("events", []):
			if e.get("why") != null:
				e["why"] = in_world(String(e["why"]))
	return SC.add_record(store, rec)

func discard() -> void:
	tally = {"time": 0.0, "landings": 0}

func progress() -> Dictionary:
	return SC.load_progress(store)

func records() -> Array:
	return SC.load_records(store)

# ---------------------------------------------------------------- HUD reads
func status() -> Variant:
	if L == null:
		return null
	var s: Dictionary = L["s"]
	var lv: Dictionary = L["level"]
	var steps: Array = L["def"]["steps"]
	var S = steps[int(L["step"])] if int(L["step"]) >= 0 and int(L["step"]) < steps.size() else null
	var st = L.get("st")
	var stats := []
	if typeof(S) == TYPE_DICTIONARY and S.get("tgt") != null and typeof(st) == TYPE_DICTIONARY:
		for k in st.get("stats", {}):
			var q: Dictionary = st["stats"][k]
			var lab: Array = SC.TGT_LABEL.get(k, [k, ""])
			stats.append({"key": k, "label": lab[0], "unit": lab[1], "dp": int(SC.DP.get(k, 0)), "tv": q.get("tv"), "d": q.get("d"), "tol": q.get("tol"), "inside": q.get("inside")})
	var check = null
	if L.get("check") != null:
		var C: Dictionary = SC.checklists()[String(L["check"]["id"])]
		var at := int(L["check"]["i"])
		var items := []
		for i in range((C["items"] as Array).size()):
			var it: Array = C["items"][i]
			items.append({"name": in_world(String(it[0])), "text": in_world(SC.checklist_text(it, s)), "ok": i < at, "cur": i == at})
		check = {"id": L["check"]["id"], "title": in_world(String(C["title"])), "i": at, "items": items}
	if _shown["L"] != L or int(_shown["n"]) != (L["results"] as Array).size():
		_shown["L"] = L
		_shown["n"] = (L["results"] as Array).size()
		var rows := []
		for r in L["results"]:
			var rr := {"step": in_world(String(r.get("step", ""))), "rows": []}
			for x in r.get("rows", []):
				rr["rows"].append({"name": in_world(String(x.get("name", ""))), "val": in_world(String(x.get("val", ""))), "std": in_world(String(x.get("std", ""))), "pass": x.get("pass")})
			rows.append(rr)
		_shown["results"] = rows
	var ar = L.get("atcResult")
	var kind := ""
	if typeof(S) == TYPE_DICTIONARY:
		kind = "checklist" if S.get("checklist") != null else ("atc" if S.get("atc") != null else ("estimate" if S.get("estimate") != null else "fly"))
	return {
		"mode": "free" if bool(L.get("free", false)) else "lesson", "id": L["id"], "title": String(L["def"].get("title", "")), "level": lv["id"], "levelName": lv["name"], "aircraft": String(L["A"]["id"]),
		"done": bool(L["done"]), "passed": bool(L.get("passed", false)), "grade": String(L.get("grade", "")), "score": float(L.get("score", 0.0)), "passPct": float(L.get("passPct", 0.0)), "reason": in_world(String(L.get("reason", ""))),
		"t": float(L["t"]), "step": int(L["step"]), "steps": steps.map(func(x): return String(x.get("name", ""))), "stepName": String(S.get("name", "")) if typeof(S) == TYPE_DICTIONARY else "",
		"kind": kind, "sayText": in_world(String(L.get("sayText", ""))), "keysText": in_world(String(L.get("keysText", ""))), "guideText": in_world(String(L.get("guideText", ""))) if bool(lv.get("guide", false)) else "", "hint": in_world(String(L.get("hint", ""))), "chime": int(L.get("chime", 0)),
		"check": check, "atc": L.get("atc"), "atcResult": ({"ok": ar.get("ok"), "why": in_world(String(ar.get("why", ""))), "t": ar.get("t"), "right": _last_right} if typeof(ar) == TYPE_DICTIONARY else null),
		"stats": stats, "holdT": float(st.get("holdT", 0.0)) if typeof(st) == TYPE_DICTIONARY else 0.0, "need": float(st.get("need", 0.0)) if typeof(st) == TYPE_DICTIONARY else 0.0,
		"stepT": float(st.get("t", 0.0)) if typeof(st) == TYPE_DICTIONARY else 0.0, "turned": float(st.get("turned", 0.0)) if typeof(st) == TYPE_DICTIONARY else 0.0,
		"dur": float(S.get("dur", 0.0)) if typeof(S) == TYPE_DICTIONARY else 0.0, "max": float(S.get("max", 0.0)) if typeof(S) == TYPE_DICTIONARY else 0.0, "graded": bool(_gr["on"]),
		"results": _shown["results"], "hood": bool(L.get("hood", false)), "crashed": bool(s["crashed"]), "crashReason": in_world(String(s.get("crashReason", ""))),
		"alt0": L.get("alt0"), "hdg0": L.get("hdg0"), "ctx": L.get("last"),
	}

var _pnl := {"thr": 0.0, "rpm": 0.0, "pitch": 0.0, "pTgt": 0.0, "keyHold": false, "pIn": 0.0, "trimPct": 0, "flapLabel": "", "flapMoving": false, "brake": false, "parkBrake": false,
	"autoRud": false, "rud": 0.0, "rTrim": 0.0, "stall": false, "engRun": true, "onGround": false, "ias": 0.0, "alt": 0.0, "hdg": 0.0, "vs": 0.0, "gear": null}

func panel() -> Dictionary:
	if L == null:
		return _pnl
	var s: Dictionary = L["s"]
	var o: Dictionary = s["out"]
	var c: Dictionary = L.get("last") if typeof(L.get("last")) == TYPE_DICTIONARY else {}
	_pnl["thr"] = s["thr"]; _pnl["rpm"] = s["rpm"]; _pnl["pitch"] = o["pitch"]
	_pnl["pTgt"] = float(s["pTgt"]) if s.get("pTgt") != null else float(o["pitch"])
	_pnl["keyHold"] = bool(s.get("keyHold", false)) and not bool(s["onGround"])
	_pnl["pIn"] = float(s.get("pIn", 0.0))
	_pnl["trimPct"] = int(round(float(s["trim"]) / FP.TRIM_MAX * 100.0))
	_pnl["flapLabel"] = String(s["A"]["flapLabels"][int(s["flapIdx"])])
	_pnl["flapMoving"] = absf(float(FP.FLAP_DEG[int(s["flapIdx"])]) - float(s["flapDeg"])) > 0.5
	_pnl["brake"] = bool(s["brake"]); _pnl["parkBrake"] = ctl.parkBrake; _pnl["autoRud"] = bool(s["opts"].get("autoRud", false))
	_pnl["rud"] = float(s.get("rudEff", s["rud"])); _pnl["rTrim"] = ctl.rTrim
	_pnl["stall"] = bool(o.get("stallWarn", false)); _pnl["onGround"] = bool(s["onGround"])
	var gear = null
	if typeof(s["A"].get("gear")) == TYPE_DICTIONARY and not bool(s["A"]["gear"].get("fixed", true)):
		gear = "down" if float(s["gearPos"]) >= 0.995 else ("up" if float(s["gearPos"]) <= 0.005 else "moving")
	_pnl["gear"] = gear
	var run := true
	for en in s["eng"]:
		if not bool(en["run"]):
			run = false
	_pnl["engRun"] = run
	_pnl["ias"] = float(c.get("kias", o["ias"])); _pnl["alt"] = float(c.get("alt", o["altTrue"]))
	_pnl["hdg"] = float(c.get("hdg", 0.0)); _pnl["vs"] = float(c.get("vs", o["vsi"]))
	return _pnl

func pose(alpha: float = -1.0) -> Dictionary:
	var out := {"pos": [0.0, 0.0, 0.0], "q": [0.0, 0.0, 0.0, 1.0]}
	if L == null:
		return out
	var s: Dictionary = L["s"]
	var a := clampf(_acc / H, 0.0, 1.0) if alpha < 0.0 else clampf(alpha, 0.0, 1.0)
	var p0: Array = _prev["pos"]
	var p1: Array = s["pos"]
	var q0: Array = _prev["q"]
	var q1: Array = s["q"]
	for i in range(3):
		out["pos"][i] = float(p0[i]) + (float(p1[i]) - float(p0[i])) * a
	var sg := -1.0 if (float(q0[0]) * float(q1[0]) + float(q0[1]) * float(q1[1]) + float(q0[2]) * float(q1[2]) + float(q0[3]) * float(q1[3])) < 0.0 else 1.0
	var v := [0.0, 0.0, 0.0, 0.0]
	for i in range(4):
		v[i] = float(q0[i]) + (sg * float(q1[i]) - float(q0[i])) * a
	var n := sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2] + v[3] * v[3])
	if n == 0.0:
		n = 1.0
	for i in range(4):
		out["q"][i] = v[i] / n
	return out

func get_L() -> Variant:
	return L

func get_s() -> Variant:
	return L["s"] if L != null else null

func get_av() -> Variant:
	return L["av"] if L != null else null

func is_free() -> bool:
	return L != null and bool(L.get("free", false))
