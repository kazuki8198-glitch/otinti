# CADET Godot port — Phase 3 equivalence tests (all lessons: structure + probes + flights).
# Drives the GDScript ports with the SAME rule-based scripted pilot as
# tools/gen_reference3.mjs and compares against test/reference3.json:
# step transitions, scores, pass/fail, guide/ATC/checklist strings, the controls
# drive + action + gamepad scenarios, and the record/progress transforms.
# Run: godot --headless --path . -s test/run_tests3.gd
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
		if failures_log.size() < 300:
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
# (identical rules to tools/gen_reference3.mjs)
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


# ---------------------------------------------------------------- Phase 3 probes
func _clean(v):
	if v == null:
		return null
	if typeof(v) == TYPE_CALLABLE:
		return "<fn>"
	if typeof(v) == TYPE_ARRAY:
		var o: Array = []
		for x in v:
			o.append(_clean(x))
		return o
	if typeof(v) == TYPE_DICTIONARY:
		var o := {}
		var ks := (v as Dictionary).keys()
		ks.sort()
		for k in ks:
			o[k] = _clean(v[k])
		return o
	if typeof(v) == TYPE_FLOAT and not is_finite(float(v)):
		return "NaN" if is_nan(float(v)) else ("Infinity" if float(v) > 0.0 else "-Infinity")
	return v

func _st_snapshot(st: Dictionary) -> Dictionary:
	var o := {}
	var ks := st.keys()
	ks.sort()
	for k in ks:
		if k != "stats":
			o[k] = _clean(st[k])
	return o

func _l_snapshot(L: Dictionary) -> Dictionary:
	var engs: Array = []
	for e in (L["s"] as Dictionary)["eng"]:
		engs.append({"failed": SC._truthy((e as Dictionary).get("failed")), "feather": SC._truthy((e as Dictionary).get("feather")), "thr": (e as Dictionary).get("thr")})
	return {"fail": _clean(L["fail"]), "avFail": _clean(((L["av"] as Dictionary).get("fail"))), "eng": engs,
		"gearDown": SC._truthy(((L["s"] as Dictionary).get("gearDown"))), "prop": (L["s"] as Dictionary).get("prop"),
		"alt0": L["alt0"], "hdg0": L["hdg0"], "vmcAt": L.get("vmcAt"), "cfiDev": L.get("cfiDev"), "cfiKind": L.get("cfiKind"),
		"ovr": (L["s"] as Dictionary).get("ovr") != null, "estimate": _clean(L.get("estimate"))}

func _ser_tgt(tgt, L: Dictionary):
	if tgt == null:
		return null
	var o := {}
	var ks := (tgt as Dictionary).keys()
	ks.sort()
	for k in ks:
		var sp = tgt[k]
		if typeof(sp) == TYPE_ARRAY:
			var arr: Array = []
			for i in (sp as Array).size():
				var x = sp[i]
				arr.append(_clean(x.call(L)) if i == 0 and typeof(x) == TYPE_CALLABLE else _clean(x))
			o[k] = arr
		else:
			o[k] = _clean(sp)
	return o

func _probe_lesson(id: String, want: Dictionary) -> void:
	var def = SC.lesson(id)
	var steps: Array = def.get("steps", []) if def != null else []
	_note(steps.size() == int(want["nSteps"]), id + ".nSteps", steps.size(), want["nSteps"])
	if def == null or not def.has("steps"):
		return
	var want_steps: Array = want["steps"]
	for si in steps.size():
		var S: Dictionary = steps[si]
		var ws: Dictionary = want_steps[si]
		var L := SC.start_lesson(id, "basic")
		var atc_v = null
		if typeof(S.get("atc")) == TYPE_STRING:
			atc_v = String(S["atc"])
		elif typeof(S.get("atc")) == TYPE_CALLABLE:
			atc_v = _clean(S["atc"].call(L))
		var got := {
			"name": S.get("name"), "keys": S.get("keys"), "g": _clean(S.get("g")), "dur": S.get("dur"), "hold": S.get("hold"), "max": S.get("max"),
			"grade": SC._truthy(S.get("grade")), "gradeFinal": SC._truthy(S.get("gradeFinal")), "checklist": S.get("checklist"), "estimate": S.get("estimate"),
			"fail": S.get("fail"), "upset": S.get("upset"), "hoodOff": SC._truthy(S.get("hoodOff")), "propTo": S.get("propTo"), "stopOnFail": S.get("stopOnFail"),
			"field": ({"n": (S["field"] as Dictionary)["n"], "e": (S["field"] as Dictionary)["e"], "hdg": (S["field"] as Dictionary)["hdg"]} if S.get("field") != null else null),
			"atc": atc_v, "tgt": _ser_tgt(S.get("tgt"), L),
			"guide": SC.step_guide(S, L), "say": SC.fill_text(String(S["say"]), L) if S.get("say") != null else null,
		}
		for k in ws.keys():
			if k == "probes":
				continue
			_deep(got.get(k), ws[k], "%s[%d].%s" % [id, si, k], 1e-6, 1e-6)
		# probes
		var variants: Array = _ref3["variants"]
		var presets: Array = _ref3["stPresets"]
		for pr_w in ws["probes"]:
			var vi := int(pr_w["v"])
			var pi := int(pr_w["p"])
			var Lp := SC.start_lesson(id, "basic")
			var c: Dictionary = (Lp["last"] as Dictionary).duplicate(true)
			for k in (variants[vi] as Dictionary).keys():
				c[k] = variants[vi][k]
			Lp["last"] = c
			var st: Dictionary = (presets[pi] as Dictionary).duplicate(true)
			st["stats"] = {}
			var pr := {}
			if typeof(S.get("onStart")) == TYPE_CALLABLE:
				S["onStart"].call(Lp, c, st)
				pr["onStart"] = {"st": _st_snapshot(st), "L": _l_snapshot(Lp)}
			pr["until"] = bool(S["until"].call(c, Lp, st)) if typeof(S.get("until")) == TYPE_CALLABLE else null
			pr["gradeWhen"] = bool(S["gradeWhen"].call(c, Lp, st)) if typeof(S.get("gradeWhen")) == TYPE_CALLABLE else null
			if typeof(S.get("check")) == TYPE_CALLABLE:
				S["check"].call(c, Lp, st)
				pr["afterCheck"] = _st_snapshot(st)
			pr["result"] = _clean(S["result"].call(Lp, st)) if typeof(S.get("result")) == TYPE_CALLABLE else null
			if typeof(S.get("onEnd")) == TYPE_CALLABLE:
				S["onEnd"].call(Lp, c, st)
				pr["onEnd"] = {"st": _st_snapshot(st), "L": _l_snapshot(Lp)}
			for k in pr_w.keys():
				if k == "v" or k == "p":
					continue
				_deep(pr.get(k), pr_w[k], "%s[%d].probe%d/%d.%s" % [id, si, vi, pi, k], 1e-6, 1e-6)

var _ref3: Dictionary = {}

func _init() -> void:
	var ref_text := FileAccess.get_file_as_string("res://test/reference3.json")
	var ref = JSON.parse_string(ref_text)
	if typeof(ref) != TYPE_DICTIONARY:
		printerr("reference3.json missing or invalid")
		quit(2)
		return
	_ref3 = ref

	_begin_group("probes")
	for id in (ref["probes"] as Dictionary).keys():
		_probe_lesson(String(id), ref["probes"][id])
	_end_group()

	_begin_group("estimate")
	var Le := SC.start_lesson("n2", "basic")
	var we: Dictionary = ref["estimate"]
	_deep(SY.estimate_truth(Le), we["truth0"], "estimate.truth0", 1e-6, 1e-6)
	_deep(SY.estimate_rows(Le), we["rowsNoEst"], "estimate.rowsNoEst", 1e-6, 1e-6)
	SY.submit_estimate(Le, {"hdg": "120", "dist": "8.5", "eteMin": "5"})
	_deep(_clean(Le.get("estimate")), we["est"], "estimate.est", 1e-6, 1e-6)
	_deep(SY.estimate_rows(Le), we["rows"], "estimate.rows", 1e-6, 1e-6)
	var Le2 := SC.start_lesson("n2", "basic")
	SY.submit_estimate(Le2, {"hdg": "", "dist": "x", "eteMin": null})
	_deep(_clean(Le2.get("estimate")), we["estBad"], "estimate.estBad", 1e-6, 1e-6)
	_deep(SY.estimate_rows(Le2), we["rowsBad"], "estimate.rowsBad", 1e-6, 1e-6)
	_end_group()

	_begin_group("flights")
	for key in (ref["lessons"] as Dictionary).keys():
		var w: Dictionary = ref["lessons"][key]
		var max_sec: float = {"a2": 300.0, "e1": 300.0, "x3": 400.0, "a7": 400.0}[key]
		var r := _run_lesson(String(key), "intro", max_sec)
		_deep(r["start"], w["start"], key + ".start", 1e-6, 1e-5)
		_deep(r["transitions"], w["transitions"], key + ".transitions", 1e-6, 1e-5)
		_deep(r["stepsEntered"], w["stepsEntered"], key + ".stepsEntered", 0.0, 0.0)
		_deep(r["updates"], w["updates"], key + ".updates", 0.0, 0.0)
		_deep(r["final"], w["final"], key + ".final", 1e-4, 1e-4)
	_end_group()

	print("[3] TOTAL checks=%d failures=%d max_err=%s (%s)" % [checks, failures, str(max_err), max_err_label])
	for f in failures_log:
		print("  FAIL ", f)
	quit(1 if failures > 0 else 0)
