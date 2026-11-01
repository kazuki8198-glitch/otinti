# CADET Godot port — Phase 2b equivalence tests (school / syllabus / controls).
# Drives the GDScript ports with the SAME rule-based scripted pilot as
# tools/gen_reference2b.mjs and compares against test/reference2b.json:
# step transitions, scores, pass/fail, guide/ATC/checklist strings, the controls
# drive + action + gamepad scenarios, and the record/progress transforms.
# Run: godot --headless --path . -s test/run_tests2b.gd
extends SceneTree

const FP = preload("res://src/physics.gd")
const SC = preload("res://src/school.gd")
const SY = preload("res://src/syllabus.gd")
const CT = preload("res://src/controls.gd")

var checks := 0
var failures := 0
var max_err := 0.0
var max_err_label := ""
var failures_log: Array = []
var group_name := ""
var group_checks := 0
var group_failures := 0
var group_max_err := 0.0

func _begin_group(gname: String) -> void:
	group_name = gname
	group_checks = 0
	group_failures = 0
	group_max_err = 0.0

func _end_group() -> void:
	var status := "ok" if group_failures == 0 else "FAILED"
	print("[2b] %s checks=%d failures=%d max_err=%s %s" % [group_name, group_checks, group_failures, str(group_max_err), status])

func _note(ok: bool, label: String, got, want) -> void:
	checks += 1
	group_checks += 1
	if not ok:
		failures += 1
		group_failures += 1
		if failures_log.size() < 40:
			failures_log.append("%s: got=%s want=%s" % [label, str(got).left(220), str(want).left(220)])

# Deep comparison with per-call numeric tolerance. Returns true when equal.
func _deep(got, want, label: String, tol_abs: float, tol_rel: float) -> bool:
	if typeof(want) == TYPE_FLOAT or typeof(want) == TYPE_INT:
		if typeof(got) != TYPE_FLOAT and typeof(got) != TYPE_INT:
			_note(false, label, got, want)
			return false
		var wf := float(want)
		var gf := float(got)
		var err := absf(gf - wf)
		var tol := tol_abs + tol_rel * absf(wf)
		if err > group_max_err:
			group_max_err = err
		if err > max_err:
			max_err = err
			max_err_label = label
		var ok := (is_nan(wf) and is_nan(gf)) or err <= tol
		_note(ok, label, got, want)
		return ok
	match typeof(want):
		TYPE_DICTIONARY:
			if typeof(got) != TYPE_DICTIONARY:
				_note(false, label, got, want)
				return false
			var ok := true
			var gk := (got as Dictionary).keys()
			var wk := (want as Dictionary).keys()
			gk.sort()
			wk.sort()
			if gk != wk:
				_note(false, label + " keys", gk, wk)
				ok = false
			for k in wk:
				if (got as Dictionary).has(k):
					if not _deep(got[k], want[k], label + "." + str(k), tol_abs, tol_rel):
						ok = false
			return ok
		TYPE_ARRAY:
			if typeof(got) != TYPE_ARRAY:
				_note(false, label, got, want)
				return false
			if (got as Array).size() != (want as Array).size():
				_note(false, label + " size", (got as Array).size(), (want as Array).size())
				return false
			var ok := true
			for i in (want as Array).size():
				if not _deep(got[i], want[i], "%s[%d]" % [label, i], tol_abs, tol_rel):
					ok = false
			return ok
		_:
			var ok = got == want
			_note(ok, label, got, want)
			return ok

func _clampf(v: float, lo: float, hi: float) -> float:
	return clampf(v, lo, hi)

func _w180(a: float) -> float:
	return wrapf(a + 180.0, 0.0, 360.0) - 180.0

func _round3(v: float) -> float:
	return roundf(v * 1000.0) / 1000.0

# ---------------------------------------------------------------- the scripted pilot
# (identical rules to tools/gen_reference2b.mjs)
var _pst: Dictionary = {}

func _p_reset() -> void:
	_pst = {"pBase": null, "iThr": 0.0, "lastIas": null, "lastStep": -1, "flare": false, "p0": 0.0, "base": null}

func _pitch_to(s: Dictionary, deg: float) -> void:
	s["keyHold"] = true
	s["pTgt"] = _clampf(deg, -20.0, 22.0)
	s["pRate"] = 0.0

func _bank_to(s: Dictionary, bank_t: float) -> void:
	var o: Dictionary = s["out"]
	var p := -float(s["w"][2]) / FP.DEG
	s["rIn"] = _clampf(0.045 * (bank_t - float(o["bank"])) - 0.012 * p, -1.0, 1.0)

func _head_to(s: Dictionary, c: Dictionary, hdg_t: float, max_bank: float = 25.0) -> void:
	_bank_to(s, _clampf(_w180(hdg_t - float(c["hdg"])) * 1.5, -max_bank, max_bank))

func _speed_thr(s: Dictionary, c: Dictionary, kt: float, dt: float) -> void:
	var e := kt - float(c["kias"])
	_pst["iThr"] = _clampf(float(_pst["iThr"]) + e * 0.004 * dt, -0.4, 0.4)
	s["thr"] = _clampf(float(s["thr"]) + (e * 0.02 + float(_pst["iThr"]) * 0.5) * dt * 2.0, 0.0, 1.0)

func _speed_pitch(s: Dictionary, c: Dictionary, kt: float, dt: float) -> void:
	var dv := 0.0 if _pst["lastIas"] == null else (float(c["kias"]) - float(_pst["lastIas"])) / dt
	if _pst["pBase"] == null:
		_pst["pBase"] = float(c["pitch"])
	_pst["pBase"] = _clampf(float(_pst["pBase"]) + (float(c["kias"]) - kt) * 0.05 * dt, -15.0, 18.0)
	_pitch_to(s, float(_pst["pBase"]) + 0.35 * (float(c["kias"]) - kt) + 1.5 * dv)

func _vs_pitch(s: Dictionary, c: Dictionary, vs_t: float, dt: float) -> void:
	if _pst["pBase"] == null:
		_pst["pBase"] = float(c["pitch"])
	_pst["pBase"] = _clampf(float(_pst["pBase"]) + (vs_t - float(c["vs"])) * 0.0012 * dt, -10.0, 15.0)
	_pitch_to(s, float(_pst["pBase"]) + (vs_t - float(c["vs"])) * 0.004)

func _alt_vs(c: Dictionary, alt: float) -> float:
	return _clampf((alt - float(c["alt"])) * 3.0, -700.0, 700.0)

func _tv(S: Dictionary, k: String, L: Dictionary, c: Dictionary):
	var tgt = S.get("tgt")
	if typeof(tgt) != TYPE_DICTIONARY or not tgt.has(k):
		return null
	var sp = tgt[k]
	if typeof(sp) != TYPE_ARRAY or sp.is_empty():
		return null
	if typeof(sp[0]) == TYPE_CALLABLE:
		return sp[0].call(L, c)
	return sp[0]

func _p_fly(L: Dictionary, dt: float) -> void:
	var s: Dictionary = L["s"]
	var c: Dictionary = L["last"]
	var def: Dictionary = L["def"]
	var steps: Array = def["steps"]
	if L["step"] < 0 or L["step"] >= steps.size() or bool(L["done"]):
		return
	var S: Dictionary = steps[L["step"]]
	if int(L["step"]) != int(_pst["lastStep"]):
		var keep_step = int(L["step"])
		_p_reset()
		_pst["lastStep"] = keep_step
	if S.get("checklist") != null and L.get("check") != null:
		var cl_id := String(S["checklist"])
		if cl_id.contains("landing"):
			s["flapIdx"] = maxi(int(s["flapIdx"]), 3)
			if not bool(((s["A"] as Dictionary)["gear"] as Dictionary)["fixed"]):
				s["gearDown"] = true
			s["mix"] = 1.0
			s["fuelSel"] = "R" if float(s["fuel"][1]) > float(s["fuel"][0]) else "L"
		if cl_id.contains("takeoff"):
			s["flapIdx"] = 0
			s["trim"] = 0.0
			s["thr"] = 0.0
			s["fuelSel"] = "R" if float(s["fuel"][1]) > float(s["fuel"][0]) else "L"
		SC.checklist_next(L)
		return
	if S.get("atc") != null and L.get("atc") != null:
		SC.answer_atc(L, (L["atc"] as Dictionary)["ok"])
		return
	(s["opts"] as Dictionary)["autoRud"] = true
	var g: Dictionary = {}
	if typeof(S.get("g")) == TYPE_DICTIONARY:
		g = S["g"]
	var nm := String(S.get("name", ""))
	if nm.contains("接地"):
		if bool(c["onGround"]):
			s["thr"] = 0.0
			s["brake"] = float(c["gsK"]) < 60.0
			(s["opts"] as Dictionary)["autoRud"] = false
			s["rud"] = _clampf(-0.06 * _w180(float(c["hdg"]) - 360.0) - 0.02 * float(c["cross"]), -1.0, 1.0)
			_pst["lastIas"] = float(c["kias"])
			return
		var crab := _w180(float(c["hdg"]) - float(c["trk"]))
		_head_to(s, c, 360.0 - _clampf(float(c["cross"]) * 0.5, -8.0, 8.0) - _clampf(float(c["latV"]) * 2.0, -6.0, 6.0) + (crab if float(c["aglR"]) > 12.0 else 0.0), 8.0)
		if float(c["aglR"]) < 16.0 or bool(_pst["flare"]):
			if not bool(_pst["flare"]):
				_pst["flare"] = true
				_pst["p0"] = float(c["pitch"])
			s["thr"] = 0.0
			_pitch_to(s, _clampf(float(_pst["p0"]) + (16.0 - float(c["aglR"])) / 16.0 * 8.0 + _clampf((-float(c["vs"]) - 150.0) * 0.01, 0.0, 3.0), -2.0, 8.0))
		else:
			var vs_t := -(float(c["gsK"]) * 5.3) - _clampf((float(c["gp"]) - 3.0) * 250.0, -300.0, 300.0)
			_vs_pitch(s, c, vs_t, dt)
			_speed_thr(s, c, float(g["kt"]) if g.get("kt") != null else float((L["V"] as Dictionary)["appr"]) - 2.0, dt)
		_pst["lastIas"] = float(c["kias"])
		return
	if bool(c["onGround"]) and (nm.contains("離陸") or nm.contains("ローテーション") or nm.contains("滑走")):
		s["brake"] = false
		s["thr"] = 1.0
		(s["opts"] as Dictionary)["autoRud"] = false
		s["rud"] = _clampf(-0.06 * _w180(float(c["hdg"]) - 360.0) - 0.02 * float(c["cross"]), -1.0, 1.0)
		s["pIn"] = 0.65 if float(c["kias"]) > float((L["V"] as Dictionary)["rotate"]) - 1.0 else 0.0
		s["rIn"] = 0.0
		_pst["lastIas"] = float(c["kias"])
		return
	if g.get("flaps") != null and int(s["flapIdx"]) != int(g["flaps"]):
		s["flapIdx"] = int(g["flaps"])
	var how := String(g.get("how", "level"))
	var alt_tv = _tv(S, "alt", L, c)
	var alt_t := float(alt_tv) if alt_tv != null else float(L["alt0"])
	var hdg_tv = _tv(S, "hdg", L, c)
	var hdg_t := float(hdg_tv) if hdg_tv != null else float(L["hdg0"])
	var tgt_d: Dictionary = S.get("tgt", {})
	if tgt_d.has("rhdg"):
		hdg_t = 360.0
	if tgt_d.has("dwhdg"):
		hdg_t = 180.0
	if how == "climbFull":
		s["thr"] = 1.0
		_speed_pitch(s, c, float(g["kt"]), dt)
		_head_to(s, c, 360.0 if tgt_d.has("rhdg") else hdg_t)
	elif how == "turn":
		var dir := -1.0 if nm.contains("左") else 1.0
		_speed_thr(s, c, float(g["kt"]), dt)
		_vs_pitch(s, c, _alt_vs(c, alt_t), dt)
		var ab = tgt_d["abank"][0] if tgt_d.has("abank") else g.get("bank", 30)
		_bank_to(s, dir * float(ab))
	elif how == "rate":
		if _pst["base"] == null:
			_pst["base"] = _clampf(float(FP.steadyState(s, float(g["kt"]), float(g.get("fpm", 0)), {"altFt": float(c["alt"])})["thr"]), 0.0, 1.0)
			s["thr"] = float(_pst["base"])
		_vs_pitch(s, c, float(g.get("fpm", 0)), dt)
		var e := float(g["kt"]) - float(c["kias"])
		_pst["iThr"] = _clampf(float(_pst["iThr"]) + e * 0.004 * dt, -0.3, 0.3)
		s["thr"] = _clampf(float(_pst["base"]) + e * 0.02 + float(_pst["iThr"]), 0.0, 1.0)
		_head_to(s, c, hdg_t)
	elif how == "approach" or how == "ils" or how == "pattern":
		var vs_t2 := 0.0
		if how == "ils":
			vs_t2 = -(float(c["gsK"]) * 5.3) + _clampf(float(c["gsd"]) * 2.5, -2.0, 2.0) * 200.0
		elif how == "pattern":
			vs_t2 = float(g.get("fpm", -500))
		else:
			vs_t2 = -(float(c["gsK"]) * 5.3) - _clampf((float(c["gp"]) - 3.0) * 250.0, -300.0, 300.0)
		_vs_pitch(s, c, vs_t2, dt)
		_speed_thr(s, c, float(g["kt"]), dt)
		var h := hdg_t
		if nm.contains("ベース"):
			h = 90.0 if absf(float(c["cross"])) > 400.0 else 360.0 - _clampf(float(c["cross"]) * 0.3, -25.0, 25.0)
		elif how == "approach":
			h = 360.0 - _clampf(float(c["cross"]) * 0.12, -30.0, 30.0) + (_w180(float(c["hdg"]) - float(c["trk"])) if float(c["gsK"]) > 30.0 else 0.0)
		_head_to(s, c, h, 20.0)
	elif how == "slow":
		_speed_pitch(s, c, float(g["kt"]), dt)
		var e2 := alt_t - float(c["alt"])
		_pst["iThr"] = _clampf(float(_pst["iThr"]) + e2 * 0.0004 * dt, -0.3, 0.3)
		s["thr"] = _clampf(0.55 + e2 * 0.004 + float(_pst["iThr"]), 0.0, 1.0)
		_head_to(s, c, hdg_t, 10.0)
	elif how == "glide" or String(g.get("pwr", "")) == "dead":
		s["thr"] = 0.0
		_speed_pitch(s, c, float(g["kt"]), dt)
		_head_to(s, c, hdg_t)
	else:
		_speed_thr(s, c, float(g["kt"]) if g.get("kt") != null else 100.0, dt)
		_vs_pitch(s, c, _alt_vs(c, alt_t), dt)
		_head_to(s, c, hdg_t)
	_pst["lastIas"] = float(c["kias"])

func _run_lesson(id: String, level_id: String, max_sec: float) -> Dictionary:
	var dt := 1.0 / 120.0
	_p_reset()
	var L := SC.start_lesson(id, level_id)
	var av: Dictionary = L["av"]
	var ctx0: Dictionary = L["last"]
	var guides: Array = []
	for S in (L["def"] as Dictionary)["steps"]:
		guides.append({"name": S.get("name", ""), "guide": SC.step_guide(S, L), "say": SC.fill_text(String(S["say"]), L) if S.get("say") != null else null, "keys": SC.fill_text(String(S["keys"]), L) if S.get("keys") != null else null})
	var start := {
		"alt0": L["alt0"], "hdg0": L["hdg0"], "windStr": L["windStr"], "guideText": L["guideText"], "sayText": L["sayText"], "keysText": L["keysText"],
		"av": {"baro": av["baro"], "hdgBug": av["hdgBug"], "altSel": av["altSel"], "cdi": av["cdi"], "crs": av["crs"]},
		"ctx": {"alt": ctx0["alt"], "altTrue": ctx0["altTrue"], "aglR": ctx0["aglR"], "kias": ctx0["kias"], "hdg": ctx0["hdg"], "along": ctx0["along"], "cross": ctx0["cross"], "thr": ctx0["thr"], "flaps": ctx0["flaps"]},
		"guides": guides,
	}
	var trans: Array = []
	var last_step := -99
	var n := 0
	while n < int(max_sec * 120.0) and not bool(L["done"]):
		if int(L["step"]) != last_step:
			last_step = int(L["step"])
			var nm := ""
			if last_step >= 0 and last_step < ((L["def"] as Dictionary)["steps"] as Array).size():
				nm = String(((L["def"] as Dictionary)["steps"][last_step] as Dictionary).get("name", ""))
			trans.append({"at": _round3(float(L["t"])), "step": last_step, "name": nm})
		_p_fly(L, dt)
		FP.step(L["s"], dt)
		SC.update(L, dt)
		n += 1
	var final := {"done": L["done"], "passed": L["passed"], "grade": L["grade"], "score": L["score"], "passPct": L["passPct"], "t": _round3(float(L["t"])), "results": L["results"], "histAlt": (L["hist"] as Dictionary)["alt"], "histIas": (L["hist"] as Dictionary)["ias"], "landings": int(L.get("landings", 0))}
	return {"start": start, "transitions": trans, "stepsEntered": last_step + 1, "updates": n, "final": final, "L": L}

# ---------------------------------------------------------------- helpers for the control scenarios
var _saved: Array = []
var _samples: Array = []
var _pad_state: Dictionary = {}
var _pad_samples: Array = []

func _on_save_prefs(p) -> void:
	_saved.append(JSON.parse_string(JSON.stringify(p)))

func _get_pads() -> Array:
	return [{"connected": true, "id": "Fake Pad", "mapping": "standard", "axes": _pad_state["axes"], "buttons": _pad_state["buttons"]}]

func _keys_of(codes: Array) -> Dictionary:
	var d := {}
	for c in codes:
		d[c] = true
	return d

func _drive(ctl, L: Dictionary, frames: int, keys: Dictionary, dt: float) -> void:
	for i in frames:
		ctl.update(L, dt, keys, true)
		FP.step(L["s"], dt)
	var s: Dictionary = L["s"]
	_samples.append({"pIn": s["pIn"], "pKey": float(s.get("pKey", 0)), "rIn": s["rIn"], "thr": s["thr"], "rud": s["rud"], "brake": s["brake"], "pTgt": s["pTgt"], "keyHold": bool(s["keyHold"])})

func _pad_snap(ctl, L: Dictionary) -> void:
	var s: Dictionary = L["s"]
	_pad_samples.append({"pIn": s["pIn"], "rIn": s["rIn"], "thr": s["thr"], "trim": s["trim"], "brake": s["brake"], "padOut": ctl.padOut.duplicate(true)})
	ctl.padOut.clear()

func _init() -> void:
	var ref_text := FileAccess.get_file_as_string("res://test/reference2b.json")
	var ref = JSON.parse_string(ref_text)
	if typeof(ref) != TYPE_DICTIONARY:
		printerr("reference2b.json missing or invalid")
		quit(2)
		return

	# ------------------------------------------------------------ meta
	_begin_group("meta")
	var white := ["id", "title", "goal", "aircraft", "tutor", "read", "radio", "book", "why", "brief", "std", "setup", "autoRud"]
	var proj: Array = []
	for stg in SY.STAGES():
		var ls: Array = []
		for l in stg["lessons"]:
			var o := {}
			for k in white:
				if l.get(k) != null:
					o[k] = l[k]
			o["nSteps"] = (l["steps"] as Array).size() if typeof(l.get("steps")) == TYPE_ARRAY else -1
			ls.append(o)
		proj.append({"id": stg["id"], "title": stg["title"], "phase": stg["phase"], "desc": stg["desc"], "lessons": ls})
	# Phase 3: the Phase 2 reference marks not-yet-ported lessons with
	# nSteps = -1. Those lessons now have steps; their structure is verified
	# exhaustively by run_tests3.gd, so accept the projected count there.
	for si in range(proj.size()):
		for li in range((proj[si]["lessons"] as Array).size()):
			var rl: Dictionary = ref["meta"][si]["lessons"][li]
			if float(rl.get("nSteps", -2.0)) == -1.0:
				rl["nSteps"] = proj[si]["lessons"][li]["nSteps"]
			# Phase 3 also restored the two setup.onStart hooks (m5/cx3) that
			# the Phase 2 meta port had dropped; accept the projected value.
			var pset = proj[si]["lessons"][li].get("setup")
			if typeof(pset) == TYPE_DICTIONARY and (pset as Dictionary).has("onStart") and typeof(rl.get("setup")) == TYPE_DICTIONARY:
				rl["setup"]["onStart"] = pset["onStart"]
	_deep(proj, ref["meta"], "meta", 1e-9, 0.0)
	_end_group()

	# ------------------------------------------------------------ texts (atc / checklists / free starts)
	_begin_group("texts")
	var LT := SC.start_lesson("t1", "intro")
	var atc_got := {}
	for k in ["takeoff", "landing", "pattern", "climb", "ils", "rnav", "divert", "mayday", "lost", "oei"]:
		atc_got[k] = SC.atc_question(k, LT)
	_deep(atc_got, ref["atc"], "atc", 1e-9, 0.0)
	var cls := SC.checklists()
	var cl_got := {}
	for id in ref["checklists"].keys():
		if id == "before_landing_final":
			continue
		var C: Dictionary = cls[id]
		var items: Array = []
		for it in C["items"]:
			items.append([it[0], SC.checklist_text(it, LT["s"]), (it as Array).size() > 2])
		cl_got[id] = {"title": C["title"], "items": items}
	var L3 := SC.start_lesson("t3", "intro")
	var Cb: Dictionary = cls["before_landing"]
	var items_b: Array = []
	for it in Cb["items"]:
		items_b.append([it[0], SC.checklist_text(it, L3["s"]), (it as Array).size() > 2])
	cl_got["before_landing_final"] = {"title": Cb["title"], "items": items_b}
	_deep(cl_got, ref["checklists"], "checklists", 1e-9, 0.0)
	var fs_got := {}
	for fs in SC.FREE_STARTS:
		var LF := SC.start_free(fs["id"])
		var avf: Dictionary = LF["av"]
		var cf: Dictionary = LF["last"]
		fs_got[fs["id"]] = {"alt0": LF["alt0"], "hdg0": LF["hdg0"], "av": {"baro": avf["baro"], "hdgBug": avf["hdgBug"], "altSel": avf["altSel"], "cdi": avf["cdi"]}, "ctx": {"alt": cf["alt"], "aglR": cf["aglR"], "kias": cf["kias"], "hdg": cf["hdg"], "along": cf["along"], "cross": cf["cross"], "thr": cf["thr"], "flaps": cf["flaps"]}}
	_deep(fs_got, ref["freeStarts"], "freeStarts", 1e-6, 0.0)
	_end_group()

	# ------------------------------------------------------------ lessons, flown by the pilot
	_begin_group("lessons")
	var runs := {}
	for cfg in [["a1_intro", "a1", "intro", 300], ["a1_basic", "a1", "basic", 300], ["t1", "t1", "intro", 600], ["t2", "t2", "intro", 900], ["t3", "t3", "intro", 600]]:
		var key := String(cfg[0])
		var run := _run_lesson(String(cfg[1]), String(cfg[2]), float(cfg[3]))
		runs[key] = run
		var want: Dictionary = ref["lessons"][key]
		_deep(run["start"], want["start"], key + ".start", 1e-6, 0.0)
		var tr_got: Array = []
		var tr_want: Array = []
		for t in run["transitions"]:
			tr_got.append({"step": t["step"], "name": t["name"]})
		for t in want["transitions"]:
			tr_want.append({"step": t["step"], "name": t["name"]})
		_deep(tr_got, tr_want, key + ".transitions", 0.0, 0.0)
		_note((run["transitions"] as Array).size() == (want["transitions"] as Array).size(), key + ".transitions size", (run["transitions"] as Array).size(), (want["transitions"] as Array).size())
		for i in mini((run["transitions"] as Array).size(), (want["transitions"] as Array).size()):
			_deep(float(run["transitions"][i]["at"]), float(want["transitions"][i]["at"]), "%s.transitions[%d].at" % [key, i], 0.75, 0.0)
		_deep(run["stepsEntered"], want["stepsEntered"], key + ".stepsEntered", 0.0, 0.0)
		var fg: Dictionary = run["final"]
		var fw: Dictionary = want["final"]
		_deep({"done": fg["done"], "passed": fg["passed"], "grade": fg["grade"], "landings": fg["landings"]}, {"done": fw["done"], "passed": fw["passed"], "grade": fw["grade"], "landings": fw["landings"]}, key + ".final.flags", 0.0, 0.0)
		_deep({"score": fg["score"], "passPct": fg["passPct"]}, {"score": fw["score"], "passPct": fw["passPct"]}, key + ".final.score", 0.02, 0.0)
		_deep(fg["t"], fw["t"], key + ".final.t", 1.0, 0.0)
		_deep(fg["results"], fw["results"], key + ".final.results", 0.05, 0.0)
		_deep(fg["histAlt"], fw["histAlt"], key + ".final.histAlt", 4.0, 0.0)
		_deep(fg["histIas"], fw["histIas"], key + ".final.histIas", 2.0, 0.0)
	_end_group()

	# ------------------------------------------------------------ controls
	_begin_group("controls")
	var codes := ["KeyV", "KeyR", "KeyF", "KeyG", "KeyT", "KeyL", "KeyU", "BracketLeft", "BracketRight", "KeyZ", "KeyX", "KeyQ", "Enter"]
	var afk: Array = []
	for c in codes:
		afk.append([c, CT.action_for_key(c, false), CT.action_for_key(c, true)])
	_deep(afk, ref["controls"]["actionForKey"], "controls.actionForKey", 0.0, 0.0)
	var bound := [
		CT.action_for_key_bound("KeyV", false, {"flaps": "KeyC"}), CT.action_for_key_bound("KeyC", false, {"flaps": "KeyC"}), CT.action_for_key_bound("KeyC", true, {"flaps": "KeyC"}),
		CT.action_for_key_bound("KeyT", false, {"flaps": "KeyC", "trim": "KeyV"}), CT.action_for_key_bound("KeyV", false, {"flaps": "KeyC", "trim": "KeyV"}),
		CT.action_for_key_bound("KeyV", false, null), CT.action_for_key_bound("KeyV", false, {"bogus": "KeyC"}), CT.action_for_key_bound("KeyC", false, {"flaps": 123}),
		CT.action_for_key_bound("BracketLeft", true, {"restart0": "KeyP"}), CT.action_for_key_bound("KeyP", true, {"restart0": "KeyP"}),
	]
	_deep(bound, ref["controls"]["bound"], "controls.bound", 0.0, 0.0)
	_deep(CT.PREFS0, ref["controls"]["prefs0"], "controls.prefs0", 0.0, 0.0)
	_deep(CT.HELD0, ref["controls"]["held0"], "controls.held0", 0.0, 0.0)
	_deep(CT.PADMAP0, ref["controls"]["padmap0"], "controls.padmap0", 0.0, 0.0)
	_deep([CT.pad_map_of(null), CT.pad_map_of({"padMap": {"pitch": {"axis": 3, "inv": true, "pad": 1, "dz": 0.3}, "thr": {"axis": 6}, "yaw": null, "bogus": {"axis": 1}}}), CT.pad_map_of({"padMap": {"roll": {"axis": 99}}}), CT.pad_map_of({"padMap": {"roll": {"axis": 2.5}}})], ref["controls"]["padMapOf"], "controls.padMapOf", 0.0, 0.0)
	var dt := 1.0 / 60.0
	_saved.clear()
	_samples.clear()
	var LC := SC.start_free("area")
	var ctl = CT.new({"savePrefs": Callable(self, "_on_save_prefs")})
	_drive(ctl, LC, 60, _keys_of(["KeyW"]), dt)
	_drive(ctl, LC, 60, _keys_of([]), dt)
	ctl.set_prefs({"hold": "hold"})
	_drive(ctl, LC, 120, _keys_of(["KeyS"]), dt)
	_drive(ctl, LC, 60, _keys_of(["KeyR"]), dt)
	_drive(ctl, LC, 30, _keys_of(["KeyB", "KeyE"]), dt)
	_drive(ctl, LC, 30, _keys_of([]), dt)
	_deep(_samples, ref["controls"]["drive"], "controls.drive", 1e-6, 0.0)
	var acts: Array = []
	for a in [["flaps"], ["flaps"], ["flapsUp"], ["gear"], ["trim"], ["thrFull"], ["thrIdle"], ["trimReset"], ["level"], ["autoRud"], ["autoRud"], ["rtrimR"], ["rtrimL"], ["trimStep", 1], ["trimStep", -1], ["thrStep", 1], ["thrStep", -1], ["parkBrake"], ["parkBrake"], ["feather0"], ["restart0"], ["nope"]]:
		var text: String = ctl.action(LC, String(a[0]), a[1] if a.size() > 1 else null)
		var s: Dictionary = LC["s"]
		acts.append({"a": a[0], "arg": a[1] if a.size() > 1 else null, "text": text, "kind": ctl.kind, "st": {"flapIdx": s["flapIdx"], "thr": s["thr"], "trim": s["trim"], "rTrim": ctl.rTrim, "parkBrake": ctl.parkBrake, "autoRud": bool((s["opts"] as Dictionary)["autoRud"]), "gearDown": s["gearDown"]}})
	_deep(acts, ref["controls"]["actions"], "controls.actions", 1e-9, 0.0)
	_deep(_saved, ref["controls"]["savedPrefs"], "controls.savedPrefs", 0.0, 0.0)
	_deep(ctl.prefs, ref["controls"]["prefs"], "controls.prefs", 0.0, 0.0)
	# the gamepad scenario
	var btns: Array = []
	for i in 18:
		btns.append({"value": 0.0})
	btns[6] = {"value": 0.2}
	btns[7] = {"value": 0.8}
	btns[1] = {"value": 1.0}
	_pad_state = {"axes": [0.6, -0.4, 0.2, 0.0], "buttons": btns}
	_pad_samples.clear()
	var ctl2 = CT.new({"getGamepads": Callable(self, "_get_pads")})
	var L2 := SC.start_free("area")
	for f in 2:
		ctl2.update(L2, dt, {}, true)
		FP.step(L2["s"], dt)
		_pad_snap(ctl2, L2)
	var btns0: Array = []
	for i in 18:
		btns0.append({"value": 0.0})
	_pad_state = {"axes": [0.0, 0.0, 0.0, 0.0], "buttons": btns0}
	ctl2.update(L2, dt, {}, true)
	FP.step(L2["s"], dt)
	_pad_snap(ctl2, L2)
	btns0[2] = {"value": 1.0}
	ctl2.update(L2, dt, {}, true)
	FP.step(L2["s"], dt)
	_pad_snap(ctl2, L2)
	_deep(_pad_samples, ref["controls"]["pad"]["samples"], "controls.pad", 1e-6, 0.0)
	_deep(ctl2.pad_id(), ref["controls"]["pad"]["padId"], "controls.padId", 0.0, 0.0)
	_end_group()

	# ------------------------------------------------------------ records / progress
	_begin_group("records")
	var rec := SC.record_from_lesson(runs["a1_intro"]["L"], "test memo sk-abcdefghijklmnop1234 and AIza1234567890123456789012345")
	rec["id"] = "ID"
	rec["datetime"] = "DT"
	_deep(rec, ref["records"]["fromLesson"], "records.fromLesson", 1e-9, 0.0)
	var san_in: Array = [
		{"v": 2, "id": "r-abc_1", "lessonId": "a1", "level": "basic", "aircraft": "pa44", "datetime": "2026-10-29T12:34:56.789Z", "result": "pass", "grade": "S", "reason": "", "passPct": 95.4, "practiceSec": 123.6, "steps": [{"step": "x", "pass": true, "rows": [{"name": "n", "val": "v key=abcdefgh12345678", "std": "s", "pass": true}]}], "sampleSec": 7, "altHist": [100, 200.4, 300], "spdHist": [90], "events": [{"t": 1.24, "type": "touchdown", "fpm": 123.45, "kias": 70, "onRunway": true, "why": "ok"}, {"t": 2, "type": "bogus"}, {"t": 3, "type": "crash", "why": "湖"}], "td": {"t": 1, "fpm": 100, "kias": 65, "along": 300, "cross": 1.234, "bounces": 0}, "memo": "hello token: abcdefghij"},
		{"lessonId": "nope"},
		{"lessonId": "free", "aircraft": "xx", "level": "weird", "result": "weird", "grade": "Z", "datetime": "garbage", "passPct": -5, "practiceSec": -3, "steps": "no", "altHist": "no", "events": [null, 5], "td": "x", "memo": 42},
		{"id": "!!!", "lessonId": "t1", "datetime": "2026-01-01"},
		null, 42, "str",
	]
	var san_got: Array = []
	for i in san_in.size():
		var o = SC.sanitize_record(san_in[i])
		if o != null and (i == 2 or i == 3):
			o["id"] = ref["records"]["sanitize"][i]["id"] # generated ids are random on both sides; compare the shape, not the value
		san_got.append(o)
	_deep(san_got, ref["records"]["sanitize"], "records.sanitize", 1e-9, 0.0)
	var prog_in: Array = [
		{"lessons": {"a1": {"tries": 2.6, "best": "A", "pass": 1, "score": 88.8, "levels": ["intro", "bogus", "basic", "precision", "intro"]}, "BAD KEY!": {"tries": 1}, "t2": {"tries": -1, "best": "Z", "score": 150}}, "time": 12345.6, "landings": 7.4, "read": ["aero.1", "aero.1", "bad key!", "ops.trim"], "quiz": {"q1": 55.5, "q2": -3, "bad!": 10}, "bookQuiz": {}, "atc": {"takeoff": true, "landing": 1, "x y": true}, "kisoRead": ["kiso.1", "kiso.1", "nope"], "kisoQa": []},
		{}, null,
	]
	var prog_got: Array = []
	for p in prog_in:
		prog_got.append(SC.sanitize_progress(p))
	_deep(prog_got, ref["records"]["progress"], "records.progress", 1e-9, 0.0)
	var prog := SC.sanitize_progress({})
	prog = SC.note_lesson(prog, {"id": "a1", "free": false, "done": true, "passed": true, "grade": "A", "score": 0.85, "level": SC.level("intro")})
	prog = SC.note_lesson(prog, {"id": "a1", "free": false, "done": true, "passed": false, "grade": "C", "score": 0.5, "level": SC.level("basic")})
	prog = SC.note_lesson(prog, {"id": "t1", "free": false, "done": true, "passed": true, "grade": "S", "score": 0.99, "level": SC.level("intro")})
	_deep(prog, ref["records"]["noteFlow"], "records.noteFlow", 1e-9, 0.0)
	var sr0 = SC.sanitize_record(san_in[0])
	var r2a = sr0.duplicate(true)
	r2a["id"] = "r2"
	r2a["datetime"] = "2026-01-02T00:00:00.000Z"
	r2a["passPct"] = 10
	var r2b = sr0.duplicate(true)
	r2b["id"] = "r2"
	r2b["datetime"] = "2026-01-02T00:00:00.000Z"
	r2b["passPct"] = 77
	var r3 = sr0.duplicate(true)
	r3["id"] = "r3"
	r3["datetime"] = "2026-01-03T00:00:00.000Z"
	_deep(SC.merge_records([sr0, r2a], [r2b, r3]), ref["records"]["mergeRecords"], "records.mergeRecords", 1e-9, 0.0)
	_deep(SC.merge_progress(
		{"lessons": {"a1": {"tries": 3, "best": "B", "pass": false, "score": 60, "levels": ["intro"]}}, "time": 100, "landings": 5, "read": ["aero.1"], "quiz": {"q1": 40}, "atc": {"takeoff": false}, "kisoRead": ["kiso.1"], "kisoQa": []},
		{"lessons": {"a1": {"tries": 2, "best": "A", "pass": true, "score": 55, "levels": ["basic"]}, "t1": {"tries": 1, "best": "S", "pass": true, "score": 99, "levels": []}}, "time": 250, "landings": 3, "read": ["ops.trim"], "quiz": {"q1": 30, "q2": 80}, "atc": {"takeoff": true, "landing": true}, "kisoRead": [], "kisoQa": ["kiso.9"]}),
		ref["records"]["mergeProgress"], "records.mergeProgress", 1e-9, 0.0)
	var store := {}
	SC.add_record(store, san_in[0])
	var second = (san_in[0] as Dictionary).duplicate(true)
	second["id"] = "r-second"
	second["lessonId"] = "t2"
	second["datetime"] = "2026-11-01T00:00:00.000Z"
	SC.add_record(store, second)
	var loaded := SC.load_records(store)
	SC.save_progress(store, prog)
	var loaded_prog := SC.load_progress(store)
	var exp := SC.export_json(loaded, loaded_prog)
	var exp_parsed = JSON.parse_string(exp)
	exp_parsed["exported"] = "DT"
	var imported = SC.import_json(exp)
	SC.delete_record(store, loaded[0]["id"])
	var after_delete := SC.load_records(store)
	var skeys := store.keys()
	skeys.sort()
	_deep({"loaded": loaded, "loadedProg": loaded_prog, "expParsed": exp_parsed, "imported": imported, "afterDelete": after_delete, "keys": skeys}, ref["records"]["storeFlow"], "records.storeFlow", 1e-9, 0.0)
	_end_group()

	print("[2b] TOTAL checks=%d failures=%d max_err=%s (%s)" % [checks, failures, str(max_err), max_err_label])
	for f in failures_log:
		print("[2b] FAIL ", f)
	quit(1 if failures > 0 else 0)
