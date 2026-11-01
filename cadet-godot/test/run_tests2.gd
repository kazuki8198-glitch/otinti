extends SceneTree

## CADET Godot port — Phase 2 avionics 同値テストランナー
## 使い方: godot --headless --path <project> -s test/run_tests2.gd
## tools/gen_reference2.mjs が生成した参照値 (JS 原典 flight-lab/src/avionics.js) と
## src/avionics.gd (CadetAvionics) を照合する。加えて、注入なしで作った
## CadetAutopilot が本物の navSolve を既定で使うことも確認する。
## 終了コード: 0 = 全合格, 1 = 不合格あり。

var failures := 0
var checks := 0
var max_err := 0.0
var max_err_label := ""
var group_name := ""
var group_checks := 0
var group_failures := 0
var group_max_err := 0.0
var group_max_label := ""
var group_results: Array = []

func _begin_group(name: String) -> void:
	group_name = name
	group_checks = 0
	group_failures = 0
	group_max_err = 0.0
	group_max_label = ""

func _end_group() -> void:
	group_results.append({ "name": group_name, "checks": group_checks, "failures": group_failures, "maxErr": group_max_err, "maxLabel": group_max_label })
	print("GROUP " + group_name + " checks " + str(group_checks) + " failures " + str(group_failures) + " max_err " + str(group_max_err) + " (" + group_max_label + ")")

func _fail(label: String, msg: String) -> void:
	failures += 1
	group_failures += 1
	if failures <= 60:
		print("FAIL %s: %s" % [label, msg])

# deep compare: numbers with tolerance (tracked), strings/bools exact, arrays elementwise,
# dictionaries by key union (a missing key reads as null, as JS undefined would serialise)
func _deep(label: String, got, want, tol_abs: float = 1.5e-3, tol_rel: float = 1e-4) -> void:
	checks += 1
	group_checks += 1
	if want == null:
		if got != null:
			_fail(label, "got %s want null" % str(got))
		return
	if got == null:
		_fail(label, "got null want %s" % str(want))
		return
	var tw = typeof(want)
	if tw == TYPE_BOOL:
		if typeof(got) != TYPE_BOOL or bool(got) != bool(want):
			_fail(label, "got %s want %s" % [str(got), str(want)])
		return
	if tw == TYPE_INT or tw == TYPE_FLOAT:
		if typeof(got) != TYPE_INT and typeof(got) != TYPE_FLOAT:
			_fail(label, "got %s (not a number) want %s" % [str(got), str(want)])
			return
		var err = absf(float(got) - float(want))
		var tol = tol_abs + tol_rel * absf(float(want))
		if err > group_max_err:
			group_max_err = err
			group_max_label = label
		if err > max_err:
			max_err = err
			max_err_label = label
		if err > tol:
			_fail(label, "got " + str(float(got)) + " want " + str(float(want)) + " (err " + str(err) + " > tol " + str(tol) + ")")
		return
	if tw == TYPE_STRING:
		if typeof(got) != TYPE_STRING or String(got) != String(want):
			_fail(label, "got '%s' want '%s'" % [str(got), str(want)])
		return
	if tw == TYPE_ARRAY:
		if typeof(got) != TYPE_ARRAY:
			_fail(label, "got %s (not an array) want array of %d" % [str(got), want.size()])
			return
		if got.size() != want.size():
			_fail(label, "array size got %d want %d" % [got.size(), want.size()])
			return
		for i in want.size():
			_deep("%s[%d]" % [label, i], got[i], want[i], tol_abs, tol_rel)
		return
	if tw == TYPE_DICTIONARY:
		if typeof(got) != TYPE_DICTIONARY:
			_fail(label, "got %s (not a dict) want dict" % str(got))
			return
		var keys = {}
		for k in want.keys():
			keys[k] = true
		for k in got.keys():
			keys[k] = true
		for k in keys.keys():
			_deep("%s.%s" % [label, str(k)], got.get(k), want.get(k), tol_abs, tol_rel)
		return
	_fail(label, "unhandled want type %d" % tw)

func _load_json(p: String):
	var f = FileAccess.open(p, FileAccess.READ)
	if f == null:
		return null
	var parsed = JSON.parse_string(f.get_as_text())
	f.close()
	return parsed

func _init() -> void:
	var R = _load_json("res://test/reference2.json")
	if R == null:
		print("reference2 JSON missing — run tools/gen_reference2.mjs first")
		quit(1)
		return
	_test_pure(R)
	_test_control(R)
	_test_nav(R)
	_test_ap_default()
	print("== Phase 2 (avionics) total: " + str(checks) + " checks, " + str(failures) + " failures, max_err " + str(max_err) + " (" + max_err_label + ")")
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- pure functions
func _test_pure(R) -> void:
	_begin_group("avionics-pure")
	var A = R["pure"]
	_deep("tables", { "waypoints": CadetAvionics.WAYPOINTS, "navaids": CadetAvionics.NAVAIDS, "procedures": CadetAvionics.PROCEDURES, "ranges": CadetAvionics.RANGES, "origin": CadetAvionics.ORIGIN }, A["tables"], 0.0, 0.0)
	for c in A["headings"]:
		_deep("trueToMag(%s,%s)" % [c["t"], c["v"]], CadetAvionics.true_to_mag(float(c["t"]), float(c["v"])), c["tm"], 2e-6, 1e-6)
		_deep("magToTrue(%s,%s)" % [c["t"], c["v"]], CadetAvionics.mag_to_true(float(c["t"]), float(c["v"])), c["mt"], 2e-6, 1e-6)
	for c in A["hdgDiff"]:
		_deep("hdgDiff", CadetAvionics.hdg_diff(float(c["a"]), float(c["b"])), c["d"], 2e-6, 1e-6)
	for c in A["hdgFmt"]:
		_deep("hdgFmt(%s)" % c["h"], CadetAvionics.hdg_fmt(float(c["h"])), c["s"], 0.0, 0.0)
	for c in A["alt"]:
		_deep("indicatedAlt", CadetAvionics.indicated_alt(float(c["alt"]), float(c["q"]), float(c["s"])), c["out"], 2e-6, 1e-6)
	for c in A["press"]:
		_deep("inhgToHpa", CadetAvionics.inhg_to_hpa(float(c["v"])), c["hpa"], 2e-6, 1e-6)
		_deep("hpaToInhg", CadetAvionics.hpa_to_inhg(float(c["v"])), c["inhg"], 2e-6, 1e-6)
	for c in A["tune"]:
		var v = int(float(c["f"]))
		for i in int(float(c["steps"])):
			v = CadetAvionics.tune(v, String(c["part"]), int(float(c["dir"])), String(c["kind"]))
		_deep("tune(%s,%s,%s,%s,x%s)" % [c["f"], c["part"], c["dir"], c["kind"], c["steps"]], v, c["out"], 0.0, 0.0)
	for c in A["fmt"]:
		_deep("fmtCom(%s)" % c["f"], CadetAvionics.fmt_com(c["f"]), c["com"], 0.0, 0.0)
		_deep("fmtNav(%s)" % c["f"], CadetAvionics.fmt_nav(c["f"]), c["nav"], 0.0, 0.0)
	for c in A["validCom"]:
		_deep("validCom(%s)" % c["f"], CadetAvionics.valid_com(c["f"]), c["ok"], 0.0, 0.0)
	for c in A["neLatLon"]:
		_deep("neToLatLon", CadetAvionics.ne_to_lat_lon(float(c["n"]), float(c["e"])), c["ll"], 2e-6, 1e-6)
		_deep("neRoundTrip", CadetAvionics.lat_lon_to_ne(float(c["ll"]["lat"]), float(c["ll"]["lon"])), c["back"], 2e-3, 1e-6)
	for c in A["latLonNe"]:
		_deep("latLonToNe", CadetAvionics.lat_lon_to_ne(float(c["lat"]), float(c["lon"])), c["ne"], 2e-3, 1e-6)
		_deep("llRoundTrip", CadetAvionics.ne_to_lat_lon(float(c["ne"]["n"]), float(c["ne"]["e"])), c["back"], 2e-6, 1e-6)
	_deep("customOrigin.ll", CadetAvionics.ne_to_lat_lon(3000.0, -7000.0, A["customOrigin"]["org"]), A["customOrigin"]["ll"], 2e-6, 1e-6)
	_deep("customOrigin.ne", CadetAvionics.lat_lon_to_ne(35.02, 138.97, A["customOrigin"]["org"]), A["customOrigin"]["ne"], 2e-3, 1e-6)
	for c in A["gc"]:
		_deep("gcDist", CadetAvionics.gc_dist_nm(c["a"], c["b"]), c["d"], 2e-6, 1e-6)
		_deep("gcBearing", CadetAvionics.gc_bearing(c["a"], c["b"]), c["brg"], 2e-6, 1e-6)
	for c in A["plane"]:
		_deep("neDist", CadetAvionics.ne_dist_nm(c["a"], c["b"]), c["dis"], 2e-6, 1e-6)
		_deep("neBearing", CadetAvionics.ne_bearing(c["a"], c["b"]), c["brg"], 2e-6, 1e-6)
		_deep("xtk", CadetAvionics.xtk_nm(c["a"], c["b"], c["p"]), c["xtk"], 2e-6, 1e-6)
		_deep("atk", CadetAvionics.atk_to_go_nm(c["a"], c["b"], c["p"]), c["atk"], 2e-6, 1e-6)
	for c in A["ete"]:
		_deep("eteSec", CadetAvionics.ete_sec(float(c["d"]), float(c["g"])), c["sec"], 2e-6, 1e-6)
		_deep("eteFmtOfSec", CadetAvionics.ete_fmt(CadetAvionics.ete_sec(float(c["d"]), float(c["g"]))), c["fmt"], 0.0, 0.0)
	for c in A["eteFmt"]:
		_deep("eteFmt(%s)" % c["s"], CadetAvionics.ete_fmt(c["s"]), c["f"], 0.0, 0.0)
	for c in A["cdiGps"]:
		_deep("cdiGps", CadetAvionics.cdi_gps(float(c["x"]), float(c["fs"])), c["dots"], 2e-6, 1e-6)
	for c in A["cdiVor"]:
		_deep("cdiVor(%s,%s)" % [c["r"], c["obs"]], CadetAvionics.cdi_vor(float(c["r"]), float(c["obs"])), c["out"], 2e-6, 1e-6)
	for c in A["cdiLocGs"]:
		_deep("cdiLoc", CadetAvionics.cdi_loc(float(c["a"])), c["loc"], 2e-6, 1e-6)
		_deep("gsDots", CadetAvionics.gs_dots(float(c["a"])), c["gs"], 2e-6, 1e-6)
	for c in A["wpt"]:
		_deep("wpt(%s)" % c["id"], CadetAvionics.wpt(c["id"]), c["w"], 0.0, 0.0)
	for c in A["procById"]:
		_deep("procedureById(%s)" % c["id"], CadetAvionics.procedure_by_id(String(c["id"])), c["p"], 0.0, 0.0)
	_deep("fplCatalog", CadetAvionics.fpl_catalog(), A["catalog"], 0.0, 0.0)
	for c in A["xpdrMode"]:
		var avx = CadetAvionics.create_avionics()
		(avx["xpdr"] as Dictionary)["mode"] = c["mode"]
		_deep("xpdrEffMode", CadetAvionics.xpdr_eff_mode(avx, bool(c["gnd"])), c["out"], 0.0, 0.0)
	for c in A["cdiName"]:
		_deep("cdiName", CadetAvionics.cdi_name((c["av"] as Dictionary).duplicate(true)), c["name"], 0.0, 0.0)
	for c in A["nrst"]:
		_deep("nrstList", CadetAvionics.nrst_list({}, c["pos"], 6.0), c["list"], 2e-6, 1e-6)
	for c in A["alerts"]:
		_deep("collectAlerts", CadetAvionics.collect_alerts({}, c["in"]["o"], c["in"]["d"]), c["out"], 0.0, 0.0)
	_deep("createAvionics", CadetAvionics.create_avionics(), A["createAv"], 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- control() transcript
func _test_control(R) -> void:
	_begin_group("avionics-control")
	var av = CadetAvionics.create_avionics()
	var calls = R["control"]["calls"]
	var transcript = R["control"]["transcript"]
	for i in calls.size():
		var call = calls[i]
		var msg = CadetAvionics.control(av, String(call[0]), call[1], bool(call[2]))
		_deep("control[%d] %s.msg" % [i, call[0]], msg, transcript[i]["msg"], 0.0, 0.0)
		_deep("control[%d] %s.av" % [i, call[0]], av, transcript[i]["av"], 2e-6, 1e-6)
	_end_group()

# ---------------------------------------------------------------- navSolve scenarios
func _test_nav(R) -> void:
	_begin_group("avionics-navSolve")
	for scn in R["nav"]:
		var av = (scn["av"] as Dictionary).duplicate(true)
		var pos = (scn["pos"] as Dictionary).duplicate(true)
		var o = (scn["o"] as Dictionary).duplicate(true)
		var rwy = FlightPhysics.lab_rwy() if bool(scn["useRwy"]) else null
		var out = CadetAvionics.nav_solve(av, pos, o, float(scn["varW"]), rwy)
		_deep("nav.%s.out" % scn["name"], out, scn["out"], 2e-6, 1e-6)
		_deep("nav.%s.avAfter" % scn["name"], av, scn["avAfter"], 2e-6, 1e-6)
	_end_group()

# ---------------------------------------------------------------- autopilot default navSolve
func _test_ap_default() -> void:
	_begin_group("autopilot-default-navSolve")
	# no injection: the AP must fall back to the real CadetAvionics.nav_solve
	var ap = CadetAutopilot.new()
	_deep("apDefault.valid", ap.nav_solve.is_valid(), true, 0.0, 0.0)
	var ne = FlightPhysics.rwyToNE(FlightPhysics.lab_rwy(), -9260.0, 0.0)
	var s = FlightPhysics.newState({})
	s["wind"] = { "fromDeg": 0, "kt": 0, "gust": 0 }
	FlightPhysics.placeInAir(s, float(ne[0]), float(ne[1]), 1700.0, 354.0, 80.0)
	var av = CadetAvionics.create_avionics()
	av["cdi"] = "NAV1"  # nav1 active is 109.90 = the LAB localizer, and the aircraft is on its final
	var L = { "s": s, "av": av, "last": { "hdg": 0.0, "pitch": 0.0, "vs": 0.0, "alt": 1700.0 }, "done": false }
	var flight = { "L": L, "s": s, "av": av }
	var msg_apr = ap.control(flight, "AP_APR")
	_deep("apDefault.aprMsg", msg_apr, "オートパイロット接続：APR（バグは PFD のノブで）", 0.0, 0.0)
	_deep("apDefault.aprOn", ap.is_on(), true, 0.0, 0.0)
	# the FD/AP laws run against the real solution for a few frames without error
	for i in 120:
		L["last"] = { "hdg": FlightPhysics.wrap360(float(s["out"]["hdgTrue"]) + 6.0), "pitch": float(s["out"]["pitch"]), "vs": float(s["out"]["vsi"]), "alt": float(s["out"]["altTrue"]) }
		ap.pilot(L, 1.0 / 60.0)
		FlightPhysics.step(s, 1.0 / 120.0)
		FlightPhysics.step(s, 1.0 / 120.0)
	_deep("apDefault.pilotFinite", is_finite(float(s["rIn"])) and is_finite(float(s["out"]["altTrue"])), true, 0.0, 0.0)
	# GPS source: APR must be refused by the real solution (src is GPS, not LOC1)
	var ap2 = CadetAutopilot.new()
	var av2 = CadetAvionics.create_avionics()
	var L2 = { "s": s, "av": av2, "last": { "hdg": 0.0, "pitch": 0.0, "vs": 0.0, "alt": 1700.0 }, "done": false }
	var flight2 = { "L": L2, "s": s, "av": av2 }
	_deep("apDefault.gpsRefusal", ap2.control(flight2, "AP_APR"), "APR：ローカライザーの信号がありません（CDI を NAV1 に）", 0.0, 0.0)
	_end_group()
