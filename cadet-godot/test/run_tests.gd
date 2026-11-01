extends SceneTree

## CADET Godot port — 同値テストランナー
## 使い方: godot --headless --path <project> -s test/run_tests.gd
## tools/gen_reference.mjs が生成した test/reference.json (JS 原典の数値) と、
## src/physics.gd (GDScript 移植) の出力を照合する。
## 終了コード: 0 = 全合格, 1 = 不合格あり。

const FP = preload("res://src/physics.gd")
const DT := 1.0 / 120.0

var failures := 0
var checks := 0
var max_err := 0.0
var max_err_label := ""

func _num(label: String, got: float, want: float, tol_abs: float, tol_rel: float) -> void:
	checks += 1
	var err := absf(got - want)
	var tol := tol_abs + tol_rel * absf(want)
	if err > max_err:
		max_err = err
		max_err_label = label
	if err > tol:
		failures += 1
		print("FAIL %s: got %.12g want %.12g (err %.3g > tol %.3g)" % [label, got, want, err, tol])

func _bool(label: String, got: bool, want: bool) -> void:
	checks += 1
	if got != want:
		failures += 1
		print("FAIL %s: got %s want %s" % [label, str(got), str(want)])

func _str(label: String, got: String, want: String) -> void:
	checks += 1
	if got != want:
		failures += 1
		print("FAIL %s: got '%s' want '%s'" % [label, got, want])

func _snap_pair(label: String, got: Dictionary, want: Dictionary) -> void:
	_num(label + ".t", float(got["t"]), float(want["t"]), 1e-6, 1e-9)
	for i in range(3):
		_num(label + ".pos[%d]" % i, float(got["pos"][i]), float(want["pos"][i]), 0.02, 1e-4)
		_num(label + ".vel[%d]" % i, float(got["vel"][i]), float(want["vel"][i]), 0.005, 1e-4)
	for i in range(4):
		_num(label + ".q[%d]" % i, float(got["q"][i]), float(want["q"][i]), 2e-4, 1e-4)
	for i in range(3):
		_num(label + ".w[%d]" % i, float(got["w"][i]), float(want["w"][i]), 1e-3, 1e-3)
	_bool(label + ".onGround", bool(got["onGround"]), bool(want["onGround"]))
	_bool(label + ".crashed", bool(got["crashed"]), bool(want["crashed"]))
	_str(label + ".crashReason", str(got["crashReason"]), str(want["crashReason"]))
	_num(label + ".iasKt", float(got["iasKt"]), float(want["iasKt"]), 0.05, 1e-3)
	_num(label + ".tasKt", float(got["tasKt"]), float(want["tasKt"]), 0.05, 1e-3)
	_num(label + ".pitch", float(got["pitch"]), float(want["pitch"]), 0.02, 1e-3)
	_num(label + ".bank", float(got["bank"]), float(want["bank"]), 0.02, 1e-3)
	_num(label + ".hdg", float(got["hdg"]), float(want["hdg"]), 0.05, 1e-3)
	_num(label + ".vsi", float(got["vsi"]), float(want["vsi"]), 1.0, 1e-3)
	_num(label + ".altFt", float(got["altFt"]), float(want["altFt"]), 0.15, 1e-4)
	_num(label + ".alphaDeg", float(got["alphaDeg"]), float(want["alphaDeg"]), 0.02, 1e-3)
	_num(label + ".rpm", float(got["rpm"]), float(want["rpm"]), 0.5, 1e-3)
	_num(label + ".g", float(got["g"]), float(want["g"]), 2e-3, 1e-3)
	_num(label + ".thrust", float(got.get("thrust", 0.0)), float(want.get("thrust", 0.0)), 0.5, 1e-3)
	_num(label + ".stallW", float(got["stallW"]), float(want["stallW"]), 2e-3, 1e-3)
	_num(label + ".gearPos", float(got["gearPos"]), float(want["gearPos"]), 1e-4, 1e-4)
	_num(label + ".flapDeg", float(got["flapDeg"]), float(want["flapDeg"]), 1e-4, 1e-4)
	_num(label + ".powerPct", float(got["powerPct"]), float(want["powerPct"]), 0.6, 0.0)
	_num(label + ".fuelUsed", float(got["fuelUsed"]), float(want["fuelUsed"]), 1e-4, 1e-3)
	for i in range(2):
		_num(label + ".fuel[%d]" % i, float(got["fuel"][i]), float(want["fuel"][i]), 1e-4, 1e-4)

func _snap(s: Dictionary) -> Dictionary:
	var o: Dictionary = s["out"]
	return {
		"t": s["t"], "pos": (s["pos"] as Array).duplicate(), "vel": (s["vel"] as Array).duplicate(),
		"q": (s["q"] as Array).duplicate(), "w": (s["w"] as Array).duplicate(),
		"onGround": s["onGround"], "crashed": s["crashed"], "crashReason": s["crashReason"],
		"iasKt": o["ias"], "tasKt": o["tas"], "pitch": o["pitch"], "bank": o["bank"], "hdg": o["hdgTrue"],
		"vsi": o["vsi"], "altFt": o["altTrue"], "alphaDeg": o["alpha"], "rpm": o["rpm"], "g": o["g"],
		"fuel": (s["fuel"] as Array).duplicate(), "thrust": s["thrust"], "stallW": s["stallW"],
		"gearPos": s["gearPos"], "flapDeg": s["flapDeg"], "powerPct": o["powerPct"], "volts": o["volts"],
		"fuelUsed": s["fuelUsed"],
	}

func _run_scenario(name: String, want: Dictionary, setup: Callable, seconds: float, checkpoints: Array, per_step: Callable) -> void:
	var s: Dictionary = FP.newState({})
	s["wind"] = {"fromDeg": 0.0, "kt": 0.0, "gust": 0.0}
	setup.call(s)
	_snap_pair(name + ".start", _snap(s), want["start"])
	var total := int(round(seconds * 120.0))
	var want_points: Dictionary = want["points"]
	for i in range(1, total + 1):
		if per_step.is_valid():
			per_step.call(s, i)
		FP.step(s, DT)
		var key := str(i)
		if want_points.has(key):
			_snap_pair(name + "@" + key, _snap(s), want_points[key])
	_snap_pair(name + ".end", _snap(s), want["end"])
	print("scenario done: %s (checks so far %d, failures %d)" % [name, checks, failures])

func _initialize() -> void:
	var f := FileAccess.open("res://test/reference.json", FileAccess.READ)
	if f == null:
		print("reference.json not found — run tools/gen_reference.mjs first")
		quit(2)
		return
	var ref: Dictionary = JSON.parse_string(f.get_as_text())
	# ---- pure functions
	for i in range(ref["atmos"].size()):
		var got: Dictionary = FP.atmos([0.0, 1000.0, 3000.0, 11000.0, 12000.0][i])
		var want: Dictionary = ref["atmos"][i]
		for k in ["T", "p", "rho", "a", "sigma"]:
			_num("atmos[%d].%s" % [i, k], float(got[k]), float(want[k]), 1e-9, 1e-9)
	var got: Dictionary = FP.atmos(1500.0, 10.0)
	var want: Dictionary = ref["atmosDev"]
	for k in ["T", "p", "rho", "a", "sigma"]:
		_num("atmosDev.%s" % k, float(got[k]), float(want[k]), 1e-9, 1e-9)
	var A28: Dictionary = FP.aircraftById("pa28")
	var A44: Dictionary = FP.aircraftById("pa44")
	var A28R: Dictionary = FP.aircraftById("pa28r")
	var rpm_cases := [
		[FP.rpmFor(A28, 0.0, 0.0), 0], [FP.rpmFor(A28, 0.5, 20.0), 1], [FP.rpmFor(A28, 1.0, 40.0), 2],
		[FP.rpmFor(A44, 0.5, 30.0), 3], [FP.rpmFor(A44, 1.0, 50.0), 4],
		[FP.rpmFor(A28R, 0.8, 30.0, 1.0, false, 1.0), 5], [FP.rpmFor(A28R, 0.8, 30.0, 1.0, false, 0.5), 6],
		[FP.rpmFor(A28, 0.0, 25.0, 1.0, true), 7],
	]
	for c in rpm_cases:
		_num("rpmFor[%d]" % int(c[1]), float(c[0]), float(ref["rpmFor"][int(c[1])]), 1e-9, 1e-9)
	var s: Dictionary = FP.newState({})
	var tf: Dictionary = FP.trimFor(s, 40.0, 0.0)
	_num("trimFor.alpha", float(tf["alpha"]), float(ref["trimFor"]["alpha"]), 1e-9, 1e-9)
	_num("trimFor.elev", float(tf["elev"]), float(ref["trimFor"]["elev"]), 1e-9, 1e-9)
	var tf2: Dictionary = FP.trimFor(s, 30.0, 0.5)
	_num("trimForFlap.alpha", float(tf2["alpha"]), float(ref["trimForFlap"]["alpha"]), 1e-9, 1e-9)
	_num("trimForFlap.elev", float(tf2["elev"]), float(ref["trimForFlap"]["elev"]), 1e-9, 1e-9)
	var steady_args := [
		[76.0, 800.0, {"altFt": 3000.0}],
		[110.0, 0.0, {"altFt": 3000.0}],
		[70.0, -500.0, {"altFt": 1500.0, "flaps": 2, "gear": true}],
		[87.0, 99999.0, {"altFt": 2000.0, "pwr": "full"}],
	]
	for i in range(steady_args.size()):
		var got2: Dictionary = FP.steadyState(s, steady_args[i][0], steady_args[i][1], steady_args[i][2])
		var want2: Dictionary = ref["steady"][i]
		for k in ["thr", "pitch", "fpm", "aoa", "rpm"]:
			_num("steady[%d].%s" % [i, k], float(got2[k]), float(want2[k]), 1e-7, 1e-7)
		_bool("steady[%d].ok" % i, bool(got2["ok"]), bool(want2["ok"]))
	var wb_args := [
		[A28, FP.stdLoading()], [A28, {"fuel": "full", "front": 2, "rear": 2, "bagKg": 30.0}], [A44, {"fuel": "tabs", "front": 1, "rear": 0, "bagKg": 0.0}],
	]
	for i in range(wb_args.size()):
		var got3 = FP.computeWB(wb_args[i][0], wb_args[i][1])
		var want3: Dictionary = ref["wb"][i]
		for k in ["kg", "lb", "cgIn", "spreadIn", "emptyKg"]:
			_num("wb[%d].%s" % [i, k], float(got3[k]), float(want3[k]), 1e-7, 1e-9)
		_bool("wb[%d].ok" % i, bool(got3["ok"]), bool(want3["ok"]))
	# ---- scenarios
	var sc: Dictionary = ref["scenarios"]
	for name in ["takeoff", "cruise", "approach", "stall", "seminole_cruise", "seminole_oei", "arrow", "xwind_roll", "restart", "fuel_cut"]:
		_run_named(name, sc[name])
	print("=== RESULT: %d checks, %d failures, max_err %s (%s)" % [checks, failures, str(max_err), max_err_label])
	quit(1 if failures > 0 else 0)

func _run_named(name: String, want: Dictionary) -> void:
	var spec = {
		"takeoff": [26.0, [240, 600, 1200, 1800, 2400, 3120]],
		"cruise": [10.0, [300, 600, 1200]],
		"approach": [10.0, [300, 600, 1200]],
		"stall": [8.0, [240, 480, 960]],
		"seminole_cruise": [10.0, [300, 600, 1200]],
		"seminole_oei": [6.0, [240, 480, 720]],
		"arrow": [8.0, [480, 960]],
		"xwind_roll": [8.0, [240, 480, 960]],
		"restart": [6.0, [240, 480, 720]],
		"fuel_cut": [10.0, [240, 600, 1200]],
	}[name]
	_run_scenario(name, want, func(s2: Dictionary) -> void: _setup(name, s2), spec[0], spec[1],
		func(s2: Dictionary, i: int) -> void: _per_step(name, s2, i))

func _setup(name: String, s: Dictionary) -> void:
	match name:
		"takeoff":
			FP.placeOnRunway(s); s["thr"] = 1.0; s["brake"] = false
		"cruise":
			FP.placeInAir(s, 2000.0, -38000.0, 3000.0, 354.0, 110.0)
		"approach":
			FP.placeInAir(s, -6000.0, -40000.0, 1500.0, 354.0, 70.0, -3.0, 2)
		"stall":
			FP.placeInAir(s, 2000.0, -38000.0, 4000.0, 354.0, 55.0); s["thr"] = 0.0
		"seminole_cruise":
			FP.setAircraft(s, "pa44"); FP.placeInAir(s, 2000.0, -38000.0, 5000.0, 354.0, 140.0)
		"seminole_oei":
			FP.setAircraft(s, "pa44"); FP.placeInAir(s, 2000.0, -38000.0, 5000.0, 354.0, 110.0); s["eng"][0]["failed"] = true
		"arrow":
			FP.setAircraft(s, "pa28r"); FP.placeInAir(s, 2000.0, -38000.0, 4000.0, 354.0, 125.0); s["prop"] = 0.8
		"xwind_roll":
			FP.placeOnRunway(s); s["wind"] = {"fromDeg": 270.0, "kt": 12.0, "gust": 1.2}; s["thr"] = 0.6
		"restart":
			FP.placeInAir(s, 2000.0, -38000.0, 3000.0, 354.0, 90.0); s["eng"][0]["mag"] = "OFF"
		"fuel_cut":
			FP.placeInAir(s, 2000.0, -38000.0, 3000.0, 354.0, 90.0); s["fuelSel"] = "OFF"

func _per_step(name: String, s: Dictionary, i: int) -> void:
	match name:
		"takeoff":
			if float(s["ias"]) > 30.0:
				s["ovr"] = {"elev": 0.4, "ail": 0.0, "rud": 0.0}
		"restart":
			if i == 300:
				s["eng"][0]["mag"] = "START"
			if i == 500:
				s["eng"][0]["mag"] = "BOTH"
