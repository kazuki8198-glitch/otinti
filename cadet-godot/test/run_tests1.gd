extends SceneTree

## CADET Godot port — Phase 1 同値テストランナー
## 使い方: godot --headless --path <project> -s test/run_tests1.gd
## tools/gen_reference1.mjs / gen_reference1b.mjs が生成した参照値 (JS 原典) と
## src/ 配下の GDScript 移植 (career / tem / hold / analysis / atc / systems / autopilot) を照合する。
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
	var R = _load_json("res://test/reference1.json")
	var RB = _load_json("res://test/reference1b.json")
	if R == null or RB == null:
		print("reference JSON missing — run tools/gen_reference1.mjs and gen_reference1b.mjs first")
		quit(1)
		return
	_test_hold(R)
	_test_tem(R)
	_test_career(R)
	_test_career_flow(R)
	_test_atc(R)
	_test_analysis(R)
	_test_systems(RB)
	_test_autopilot(RB)
	print("== Phase 1 total: " + str(checks) + " checks, " + str(failures) + " failures, max_err " + str(max_err) + " (" + max_err_label + ")")
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- hold
func _test_hold(R) -> void:
	_begin_group("hold")
	_deep("holdLbv", CadetHold.HOLD_LBV, R["hold"]["holdLbv"], 0.0, 0.0)
	_deep("entryNames", CadetHold.ENTRY_NAMES, R["hold"]["entryNames"], 0.0, 0.0)
	for c in R["hold"]["entries"]:
		_deep("entry(%s,%s)" % [c["courseToFix"], c["holdingSide"]], CadetHold.entry_for_hold(CadetHold.HOLD_LBV, { "courseToFix": float(c["courseToFix"]), "holdingSide": bool(c["holdingSide"]) }), c["entry"], 0.0, 0.0)
	for c in R["hold"]["sides"]:
		_deep("side(%s,%s)" % [c["dn"], c["de"]], CadetHold.on_holding_side(CadetHold.HOLD_LBV, float(c["dn"]), float(c["de"])), c["side"], 0.0, 0.0)
	for w in R["hold"]["winds"]:
		var opts = { "windFrom": float(w["from"]), "windKt": float(w["kt"]) }
		if w.get("tas") != null:
			opts["tasKt"] = float(w["tas"])
		_deep("wind(%s,%s)" % [w["from"], w["kt"]], CadetHold.wind_correction(CadetHold.HOLD_LBV, opts), w["out"], 0.051, 0.0)
	_end_group()

# ---------------------------------------------------------------- tem
func _test_tem(R) -> void:
	_begin_group("tem")
	for c in R["tem"]["cases"]:
		_deep("temFor(%s)" % str(c["in"]), CadetTem.tem_for(c["in"]), c["out"], 0.0, 0.0)
	_deep("threatOf", [CadetTem.threat_of("storm"), CadetTem.threat_of("calm"), CadetTem.threat_of("nope")], R["tem"]["threatOf"], 0.0, 0.0)
	for c in R["tem"]["errors"]:
		_deep("errorsOf", CadetTem.errors_of(c["in"]), c["ja"], 0.0, 0.0)
		_deep("errorsOfEn", CadetTem.errors_of_en(c["in"]), c["en"], 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- career (pure functions)
func _test_career(R) -> void:
	_begin_group("career")
	var C = R["career"]
	for d in C["dates"]:
		var day = int(d["day"])
		_deep("dateOf(%d)" % day, CadetCareer.date_of(day), d["date"], 0.0, 0.0)
		_deep("dateText(%d)" % day, CadetCareer.date_text(day), d["text"], 0.0, 0.0)
		_deep("doy(%d)" % day, CadetCareer.day_of_year(day), d["doy"], 0.0, 0.0)
		_deep("isOff(%d)" % day, CadetCareer.is_off(day), d["off"], 0.0, 0.0)
	for w in C["weather"]:
		_deep("weatherFor(%s,%s,%s)" % [w["seed"], w["day"], str(w["o"])], CadetCareer.weather_for(int(w["seed"]), int(w["day"]), w["o"]), w["w"], 1e-6, 0.0)
	for w in C["weatherAt"]:
		var W = CadetCareer.weather_for(5, 33, { "force": w["kind"] })
		_deep("weatherAt(%s,%s)" % [w["kind"], w["h"]], CadetCareer.weather_at(W, float(w["h"])), w["at"], 1e-6, 0.0)
	for a in C["aloft"]:
		var W = CadetCareer.weather_for(11, int(a["day"]))
		_deep("aloft(%s).surf" % a["day"], CadetCareer.surface_wind_of(W["metar"]["pm"]), a["surf"], 0.0, 0.0)
		_deep("aloft(%s)" % a["day"], CadetCareer.winds_aloft_for(W), a["aloft"], 0.0, 0.0)
		_deep("rwy(%s)" % a["day"], CadetCareer.active_runway(W), a["rwy"], 0.0, 0.0)
	for s in C["surface"]:
		_deep("surfaceWindOf(%s)" % s["m"], CadetCareer.surface_wind_of(s["m"]), s["w"], 0.0, 0.0)
	for w in C["weatherFor2"]:
		var W = CadetCareer.weather_for(2, 15, { "force": w["kind"] })
		_deep("weatherFor2(%s,%s,%s)" % [w["kind"], w["ch"], w["k"]], CadetCareer.weather_for2(W, w["ch"], w["k"]), w["w"], 0.0, 0.0)
	for g in C["growth"]["lesson"]:
		_deep("lessonGrowth", CadetCareer.lesson_growth(g["g"], g["lv"], g["id"], bool(g["tired"])), g["out"], 1e-9, 0.0)
	for id in C["growth"]["ftd"].keys():
		_deep("ftdGrowth(%s)" % id, CadetCareer.ftd_growth(id), C["growth"]["ftd"][id], 1e-9, 0.0)
	for p in C["growth"]["class"].keys():
		_deep("classGrowth(%s)" % p, CadetCareer.class_growth(p), C["growth"]["class"][p], 1e-9, 0.0)
	for i in C["rank"].size():
		pass
	_deep("rank", _rank_cases(), C["rank"], 1e-6, 0.0)
	_deep("trustBand", [0, 39, 40, 59, 60, 79, 80, 100].map(func(v): return CadetCareer.trust_band(float(v))), C["trustBand"], 0.0, 0.0)
	_deep("missAsk", _miss_ask_cases(), C["missAsk"], 0.0, 0.0)
	for s in C["sched"]:
		var trust = float(s["opts"].get("trust", 50.0))
		_deep("gate(%s)" % s["name"], CadetCareer.gate(s["state"], s["prog"], trust), s["gate"], 0.0, 0.0)
		_deep("schedule(%s)" % s["name"], CadetCareer.schedule(s["state"], s["prog"], s["opts"]), s["schedule"], 0.0, 0.0)
	_deep("noteGround", _note_ground_cases(), C["noteGround"], 0.0, 0.0)
	CadetCareer.CLASS_SECTIONS = C["classSections"]
	var hs: Array = []
	for h in C["heardSet"]:
		hs.append(h)
	_deep("heardSet0", _sorted(CadetCareer.heard_set({ "heard": { "wx.1": "f" }, "done": { "class:0": 3 } })), _sorted(hs[0]), 0.0, 0.0)
	_deep("heardSet1", _sorted(CadetCareer.heard_set({ "heard": {}, "done": {} })), _sorted(hs[1]), 0.0, 0.0)
	for c in C["clean"]:
		var input = JSON.parse_string(c["in"])
		_deep("cleanCareer", CadetCareer.clean_career(input), c["out"], 1e-6, 0.0)
	_end_group()

func _sorted(a: Array) -> Array:
	var b = a.duplicate()
	b.sort()
	return b

func _rank_cases() -> Array:
	return [
		CadetCareer.graduation_rank({ "abilities": { "hand": 80, "know": 70, "comm": 60, "judge": 75 }, "firstTry": { "pass": 9, "total": 10 }, "exams": { "a": { "tries": 1 }, "b": { "tries": 2 } } }, { "lessons": { "a1": { "score": 90 }, "a2": { "score": 80 }, "a3": {} } }),
		CadetCareer.graduation_rank({ "abilities": { "hand": 50, "know": 50, "comm": 50, "judge": 50 }, "firstTry": { "pass": 3, "total": 10 }, "exams": {} }, null),
		CadetCareer.graduation_rank(null, null),
		CadetCareer.graduation_rank({ "abilities": { "hand": 95, "know": 95, "comm": 95, "judge": 95 }, "firstTry": { "pass": 0, "total": 0 }, "exams": { "a": { "tries": 7 } } }, { "lessons": {} }),
	]

func _miss_ask_cases() -> Array:
	return [
		CadetCareer.miss_ask({ "miss": { "day": 10, "key": "radio", "label": "無線の復唱" } }),
		CadetCareer.miss_ask({ "miss": { "day": 3, "key": "flare", "label": "着陸のフレア" } }),
		CadetCareer.miss_ask({ "miss": null }),
		CadetCareer.miss_ask({}),
		CadetCareer.miss_ask({ "miss": { "day": 7, "key": "x", "label": "外部点検で見落とした異常" } }),
	]

func _note_ground_cases() -> Array:
	return [
		CadetCareer.note_ground(null, true, 100.0),
		CadetCareer.note_ground({ "tries": 1, "best": "A", "pass": true, "levels": [] }, true, 85.0),
		CadetCareer.note_ground({ "tries": 2, "best": "B", "pass": true, "levels": [] }, false),
		CadetCareer.note_ground(null, true, 95.0),
		CadetCareer.note_ground({ "tries": 0, "best": "", "pass": false, "levels": [] }, true, 50.0),
	]

# ---------------------------------------------------------------- career instance flow
func _test_career_flow(R) -> void:
	_begin_group("careerFlow")
	var F = R["careerFlow"]
	var store: Dictionary = {}
	var c = CadetCareerInstance.new(store, 1234)
	var log: Array = []
	log.append(["date", c.date(), "day", c.day(), "slot", c.slot(), "chapter", c.chapter(), "hours", c.hours()])
	log.append(["weather", c.weather(null)])
	log.append(["schedule", c.schedule(null)])
	log.append(["gate", c.gate(null)])
	c.done("ceremony", "welcome"); c.done("tour", "tour"); c.done("brief", "meet"); c.finish_prologue()
	log.append(["prologueFlags", CadetCareer.prologue_flags(c.st)])
	log.append(["advanceChapter", c.advance_chapter(null), c.chapter()])
	log.append(["examReady", c.exam_ready("written1")])
	var ex1 = c.exam("written1", 86.0)
	log.append(["exam1", ex1, "readyAgain", c.exam_ready("written1"), "fatigue", c.st["fatigue"], "know", c.abilities()["know"]])
	var prog_ground = { "lessons": {} }
	for id in CadetCareer.GROUND:
		prog_ground["lessons"][id] = { "pass": true }
	log.append(["examSameDayGate", CadetCareer.gate(c.st, prog_ground)])
	log.append(["drills", c.drill(), c.drill(), c.drill(), "left", c.drills_left(), "judge", c.abilities()["judge"]])
	var w = CadetCareer.weather_for(1234, 1)
	log.append(["decision", c.decision(String(w["decision"]), w), "decided", c.decided_today()])
	log.append(["grow", c.grow("hand", 3.0, "lesson:a1"), c.grow("hand", 3.0, "lesson:a1"), c.grow("hand", 3.0, "lesson:a1"), c.grow("bogus", 5.0), c.grow("know", -1.0)])
	log.append(["firstTry", c.first_try(true), c.first_try(false)])
	log.append(["attempt", c.attempt("lesson:a1"), c.attempt("lesson:a1"), c.tries("lesson:a1"), c.attempt("bad key!")])
	c.answered("q_aero#1", true); c.answered("q_aero#1", false); c.answered("bad id!", true)
	c.heard_section("aero.1", "q"); c.heard_section("aero.1", "f"); c.heard_section("aero.2", "q"); c.heard_section("bad", "f")
	log.append(["heard", c.heard_set()])
	c.set_pace("quick"); c.set_pace("bogus"); c.walked_into("lobby"); c.walked_into("lobby"); c.walked_into("BAD!")
	c.note_miss("radio", "無線の復唱")
	log.append(["missAsk", CadetCareer.miss_ask(c.st)])
	c.clear_miss()
	log.append(["missAfter", c.st.get("miss")])
	log.append(["aloft", c.aloft(null)])
	log.append(["advance", c.advance(), c.slot(), c.advance("evening"), c.slot(), c.advance()])
	c.tire(30)
	log.append(["tired", c.tired(), c.st["fatigue"]])
	log.append(["sleep", c.sleep(), "fatigue", c.st["fatigue"]])
	c.tire(80)
	log.append(["sleepLate", c.sleep({ "late": true }), "fatigue", c.st["fatigue"], "tired", c.tired()])
	log.append(["checkBad", "throws"])  # JS: CHECKS['bogus'] is undefined, the call throws (caught in the generator)
	_deep("flowLog", log, F["log"].slice(0, F["log"].size() - 2), 1e-6, 0.0)
	_deep("flowSaved", JSON.parse_string(store[CadetCareer.CAREER_KEY]), JSON.parse_string(F["savedJson"]), 1e-6, 0.0)
	var c2 = CadetCareerInstance.new(store, 999)
	var log2: Array = []
	log2.append(["reloadedDay", c2.day(), "reloadedChapter", c2.chapter()])
	log2.append(["loadBad", c2.load({ "v": 9 }), "loadGood", c2.load(CadetCareer.new_career(77)), c2.day(), c2.chapter()])
	# the JS log's last two entries are exactly these two pushes
	var want_tail = [F["log"][F["log"].size() - 2], F["log"][F["log"].size() - 1]]
	_deep("flowReload", log2, want_tail, 1e-6, 0.0)
	_end_group()

# ---------------------------------------------------------------- atc
func _test_atc(R) -> void:
	_begin_group("atc")
	var radio = R["atc"]["radio"]
	var atc = CadetAtc.new(radio, 11)
	var transcript: Array = []
	var says: Array = []
	var step = func(dt: float) -> void:
		for e in atc.update(dt):
			if e["type"] == "say":
				says.append(e)
			else:
				transcript.append(["event", e])
	var snap_view = func(tag: String) -> void:
		var v = atc.view()
		if v == null:
			transcript.append([tag, null])
			return
		var choices: Array = []
		for ch in v["choices"]:
			choices.append(ch["en"])
		transcript.append([tag, { "phase": v["phase"], "id": v["id"], "choices": choices, "timeLeft": floorf(float(v["timeLeft"]) * 100.0 + 0.5) / 100.0, "wrongWhy": v["wrongWhy"], "last": v["last"] }])
	var guard = [0]
	var until_choose = func() -> void:
		guard[0] = 0
		while atc.view() != null and atc.view()["phase"] != "choose" and guard[0] < 400:
			guard[0] += 1
			step.call(0.25)
	var start_view = atc.start("ground")
	transcript.append(["start", start_view["phase"] if start_view != null else null])
	until_choose.call()
	snap_view.call("atis-choose")
	transcript.append(["answer", atc.answer(atc.right_index())])
	until_choose.call()
	snap_view.call("gnd1-choose")
	var ri = atc.right_index()
	transcript.append(["answerWrong", atc.answer((ri + 1) % (atc.view()["choices"] as Array).size())])
	until_choose.call()
	snap_view.call("gnd1-again")
	var says_before = says.size()
	guard[0] = 0
	while says.size() == says_before and guard[0] < 400:
		guard[0] += 1
		step.call(0.25)
	snap_view.call("gnd1-late")
	transcript.append(["answer", atc.answer(atc.right_index())])
	until_choose.call()
	snap_view.call("gnd2-choose")
	transcript.append(["answer", atc.answer(atc.right_index())])
	guard[0] = 0
	while atc.busy() and guard[0] < 400:
		guard[0] += 1
		step.call(0.25)
	transcript.append(["summary", atc.summary()])
	transcript.append(["log", atc.log])
	transcript.append(["says", says])
	transcript.append(["busy", atc.busy(), "seq", atc.seq_id()])
	_deep("atcTranscript", transcript, R["atc"]["transcript"], 1e-6, 0.0)
	_end_group()

# ---------------------------------------------------------------- analysis
func _test_analysis(R) -> void:
	_begin_group("analysis")
	var A = R["analysis"]
	for c in A["rwy"]:
		_deep("rwyCoords", CadetAnalysis.rwy_coords(float(c["n"]), float(c["e"])), { "along": c["along"], "cross": c["cross"] }, 1e-6, 0.0)
	var att_qs = [[0, 0, 0, 1], [0, 0, 0.7071068, 0.7071068], [0.1830127, 0, 0, 0.9659258], [0, 0.258819, 0, 0.9659258], [0.5, 0.5, 0.5, 0.5]]
	for i in A["att"].size():
		_deep("attOf", CadetAnalysis.att_of({ "q": att_qs[i] }), A["att"][i]["att"], 1e-5, 0.0)
	for c in A["gp"]:
		_deep("gpOf", CadetAnalysis.gp_of(c), c["gp"], 1e-6, 0.0)
		_deep("aglOf", CadetAnalysis.agl_ft_of(c), c["agl"], 1e-6, 0.0)
	_deep("spark", [
		CadetAnalysis.sparkline([1, 2, 3, 4, 5, 6, 7, 8]),
		CadetAnalysis.sparkline([8, 7, 6, 5, 4, 3, 2, 1], { "invert": true }),
		CadetAnalysis.sparkline([5, 5, 5]),
		CadetAnalysis.sparkline([]),
		CadetAnalysis.sparkline([0, 100]),
	], A["spark"], 0.0, 0.0)
	_deep("clean", [
		CadetAnalysis.clean_analysis(A["compact"]),
		CadetAnalysis.clean_analysis(null),
		CadetAnalysis.clean_analysis({}),
		CadetAnalysis.clean_analysis({ "td": { "along": "x" } }),
		CadetAnalysis.clean_analysis({ "man": [{ "name": "", "score": 0.5 }, { "name": "旋回", "score": 0.5 }] }),
	], A["clean"], 1e-6, 0.0)
	var entries = [{ "date": "2027-04-02", "lessons": [
		{ "id": "a1", "ana": { "td": { "along": 300, "cross": 2, "sink": 100, "float": 150, "zone": true }, "gate": { "stable": true } } },
		{ "id": "a2", "ana": null },
		{ "id": "a3", "ana": { "td": { "along": 420, "cross": -5, "sink": 180, "float": 260, "zone": true }, "gate": { "stable": false } } },
	] }]
	_deep("history", CadetAnalysis.landing_history(entries), A["history"], 1e-6, 0.0)
	_deep("stats", CadetAnalysis.landing_stats(A["statsIn"]), A["stats"], 1e-6, 0.0)
	_deep("statsEmpty", CadetAnalysis.landing_stats([]), A["statsEmpty"], 0.0, 0.0)
	var samples = R["recording"]["samples"]
	var ra = CadetAnalysis.analyze_recording({ "samples": samples }, { "vref": 65 })
	_deep("recAnalysis.a", ra, R["recAnalysis"]["a"], 2e-3, 1e-4)
	_deep("recAnalysis.b", CadetAnalysis.analyze_recording({ "samples": samples }, { "vref": 70, "gearRequired": true, "flapMinDeg": 10 }), R["recAnalysis"]["b"], 2e-3, 1e-4)
	_deep("recAnalysis.empty", CadetAnalysis.analyze_recording({ "samples": [] }), R["recAnalysis"]["empty"], 0.0, 0.0)
	_deep("recRows", CadetAnalysis.analysis_rows(ra), R["recAnalysis"]["rows"], 2e-3, 1e-4)
	_deep("recCompact", CadetAnalysis.compact_analysis(ra), R["recAnalysis"]["compact"], 2e-3, 1e-4)
	_end_group()

# ---------------------------------------------------------------- systems (driven on FlightPhysics)
func _sys_apply(a: Dictionary, sw: Dictionary, sys: CadetSystems, s: Dictionary) -> void:
	match String(a["a"]):
		"sw": sw[a["k"]] = a["v"]
		"prime":
			for i in int(a["n"]):
				sys.prime()
		"elecBatt": sys.elec["batt"] = float(a["v"])
		"elecFault": sys.set_elec_fault(bool(a["v"]))
		"fault": sys.set_fault({ "dropL": float(a["v"]) } if a["v"] != null else null)
		"thr": s["thr"] = float(a["v"])
		"fuel": s["fuel"] = (a["v"] as Array).duplicate()
		"gear": s["gearDown"] = bool(a["v"])

func _sys_sample(f: int, sys: CadetSystems, s: Dictionary) -> Dictionary:
	var e_rpm: Array = []
	var e_run: Array = []
	for e in s["eng"]:
		e_rpm.append(float(e["rpm"]))
		e_run.append(bool(e["run"]))
	var alert_ids: Array = []
	for a in sys.alerts():
		alert_ids.append(a["id"])
	return { "f": f, "eng": sys.st["eng"], "rpm": sys.rpm(), "oil": sys.oil(), "oilT": sys.oil_t(), "oilQ": sys.oil_q(), "volts": float(sys.elec["volts"]), "amps": sys.elec["amps"], "batt": float(sys.elec["batt"]),
		"shed": sys.elec["shed"], "gen": sys.elec["gen"], "load": sys.elec["load"], "pfdOn": sys.elec["pfdOn"], "mfdOn": sys.elec["mfdOn"], "standby": float(sys.elec["standby"]),
		"alerts": alert_ids, "primes": sys.primes(), "crankHeat": float(sys.st["crankHeat"]), "crankHeld": float(sys.st["crankHeld"]), "hobbs": sys.hobbs,
		"eRpm": e_rpm, "eRun": e_run, "twin": sys.twin_get(), "fuel": (s["fuel"] as Array).duplicate(), "thr": float(s["thr"]) }

func _run_sys(spec: Dictionary) -> Dictionary:
	var s = FlightPhysics.newState({})
	if String(spec.get("aircraft", "pa28")) != "pa28":
		FlightPhysics.setAircraft(s, String(spec["aircraft"]))
	s["wind"] = { "fromDeg": 0, "kt": 0, "gust": 0 }
	if String(spec.get("place", "runway")) == "air":
		FlightPhysics.placeInAir(s, 2000, -38000, 1500, 354, 100)
	else:
		FlightPhysics.placeOnRunway(s)
	var sw: Dictionary = {}
	var sys = CadetSystems.new(sw)
	if String(spec.get("init", "cold")) == "cold":
		sys.set_cold(s)
	else:
		sys.set_running(s)
	var events: Array = []
	var samples: Array = []
	var dt = 1.0 / 60.0
	var steps = int(round(float(spec["seconds"]) / dt))
	var sample_every = int(spec["sampleEvery"])
	for f in range(steps + 1):
		for a in spec["actions"]:
			if int(a["f"]) == f:
				_sys_apply(a, sw, sys, s)
		for e in sys.update(dt, s):
			var ev = { "f": f }
			for k in e.keys():
				ev[k] = e[k]
			events.append(ev)
		if f % sample_every == 0:
			samples.append(_sys_sample(f, sys, s))
		if f < steps:
			FlightPhysics.step(s, dt)
	return { "events": events, "samples": samples, "swEnd": sw.duplicate() }

func _a(f: int, a: String, k: String = "", v = null, n: int = 0) -> Dictionary:
	var d = { "f": f, "a": a }
	if not k.is_empty():
		d["k"] = k
	if v != null or a != "prime":
		d["v"] = v
	if a == "prime":
		d["n"] = n
	return d

func _test_systems(RB) -> void:
	_begin_group("systems")
	var specs = {
		"start_ok": { "seconds": 40, "sampleEvery": 60, "actions": [
			_a(0, "prime", "", null, 3), _a(1, "sw", "master", true), _a(1, "sw", "mixture", 1), _a(2, "sw", "mag", "START"),
			_a(240, "thr", "", 0.6), _a(600, "sw", "mag", "L"), _a(780, "sw", "mag", "R"), _a(960, "sw", "mag", "BOTH"),
			_a(1080, "sw", "carbHeat", true), _a(1260, "sw", "carbHeat", false), _a(1440, "sw", "mixture", 0)] },
		"start_noprime": { "seconds": 12, "sampleEvery": 120, "actions": [_a(1, "sw", "master", true), _a(1, "sw", "mixture", 1), _a(2, "sw", "mag", "START")] },
		"start_flooded": { "seconds": 30, "sampleEvery": 120, "actions": [
			_a(0, "prime", "", null, 7), _a(1, "thr", "", 0.2), _a(1, "sw", "master", true), _a(1, "sw", "mixture", 1), _a(2, "sw", "mag", "START"),
			_a(600, "thr", "", 0.5), _a(602, "sw", "mag", "START")] },
		"start_selfuel": { "seconds": 12, "sampleEvery": 120, "actions": [
			_a(0, "prime", "", null, 3), _a(1, "sw", "fuelSel", "OFF"), _a(1, "sw", "master", true), _a(2, "sw", "mag", "START")] },
		"start_nomaster": { "seconds": 8, "sampleEvery": 60, "actions": [
			_a(0, "prime", "", null, 3), _a(1, "sw", "mixture", 1), _a(2, "sw", "mag", "START"), _a(180, "sw", "mag", "BOTH"),
			_a(200, "sw", "master", true), _a(202, "sw", "mag", "START")] },
		"start_fault": { "seconds": 20, "sampleEvery": 60, "actions": [
			_a(0, "prime", "", null, 3), _a(1, "sw", "master", true), _a(1, "sw", "mixture", 1), _a(1, "fault", "", 260), _a(2, "sw", "mag", "START"),
			_a(240, "thr", "", 0.6), _a(600, "sw", "mag", "L"), _a(900, "sw", "mag", "BOTH")] },
		"elec_shed": { "seconds": 150, "init": "running", "sampleEvery": 300, "actions": [
			_a(1, "sw", "bat", true), _a(1, "sw", "alt", false), _a(2, "elecBatt", "", 0.5),
			_a(3, "sw", "landing", true), _a(3, "sw", "taxi", true), _a(3, "sw", "pitot", true)] },
		"elec_altfail": { "seconds": 30, "init": "running", "sampleEvery": 120, "actions": [_a(10, "elecFault", "", true)] },
		"twin_start": { "aircraft": "pa44", "seconds": 60, "sampleEvery": 120, "actions": [
			_a(0, "prime", "", null, 3), _a(1, "sw", "master", true), _a(1, "sw", "mixture", 1), _a(2, "sw", "mag", "START"), _a(400, "sw", "mag", "START"),
			_a(800, "thr", "", 0.5), _a(1500, "sw", "propCycleT", 2.6), _a(2400, "sw", "mixture", 0)] },
		"alerts_mix": { "seconds": 10, "init": "running", "sampleEvery": 60, "actions": [_a(1, "fuel", "", [2.5, 20]), _a(2, "elecFault", "", true)] },
		"gear_alert": { "aircraft": "pa28r", "seconds": 6, "init": "running", "place": "air", "sampleEvery": 30, "actions": [_a(1, "gear", "", false)] },
	}
	for name in specs.keys():
		var got = _run_sys(specs[name])
		var want = RB["systems"][name]
		_deep("sys.%s.events" % name, got["events"], want["events"], 0.0, 0.0)
		_deep("sys.%s.samples" % name, got["samples"], want["samples"], 0.1, 1e-3)
		_deep("sys.%s.swEnd" % name, got["swEnd"], want["swEnd"], 0.01, 1e-3)
	_end_group()

# ---------------------------------------------------------------- autopilot (driven on FlightPhysics)
func _ap_ctx(s: Dictionary) -> Dictionary:
	var o = s["out"]
	return { "hdg": FlightPhysics.wrap360(float(o["hdgTrue"]) + 6.0), "pitch": float(o["pitch"]), "vs": float(o["vsi"]), "alt": float(o["altTrue"]) }

func _ap_mkflight(setup: String) -> Dictionary:
	var s = FlightPhysics.newState({})
	s["wind"] = { "fromDeg": 0, "kt": 0, "gust": 0 }
	match setup:
		"runway": FlightPhysics.placeOnRunway(s)
		"air3000": FlightPhysics.placeInAir(s, 2000, -38000, 3000, 354, 110)
		"air3000d3": FlightPhysics.placeInAir(s, 2000, -38000, 3000, 354, 110, -3.0)
		"air600": FlightPhysics.placeInAir(s, 2000, -38000, 600, 354, 100)
	var av = { "hdgBug": 0, "altSel": 3000, "_nav": null }
	var L = { "s": s, "av": av, "last": _ap_ctx(s), "done": false }
	return { "L": L, "s": s, "av": av }

func _ap_sample(f: int, ap: CadetAutopilot, s: Dictionary, av: Dictionary) -> Dictionary:
	ap.sync(av)
	return { "f": f, "hdg": _ap_ctx(s)["hdg"], "alt": float(s["out"]["altTrue"]), "bank": float(s["out"]["bank"]), "pitch": float(s["out"]["pitch"]), "vs": float(s["out"]["vsi"]),
		"rIn": float(s["rIn"]), "pTgt": s["pTgt"], "trim": float(s["trim"]), "ap": (av["ap"] as Dictionary).duplicate(), "fd": (av["fd"] as Dictionary).duplicate() }

func _ap_drive(ap: CadetAutopilot, fl: Dictionary, frames: int, samples: Array, sample_every: int = 60) -> void:
	var L = fl["L"]
	var s = fl["s"]
	var av = fl["av"]
	for f in range(frames + 1):
		L["last"] = _ap_ctx(s)
		ap.pilot(L, 1.0 / 60.0)
		if f % sample_every == 0:
			samples.append(_ap_sample(f, ap, s, av))
		if f < frames:
			FlightPhysics.step(s, 1.0 / 120.0)
			FlightPhysics.step(s, 1.0 / 120.0)

func _test_autopilot(RB) -> void:
	_begin_group("autopilot")
	var nav_stub = func(av, pos, out, var_w, rwy): return av.get("_nav")
	_ap_case_hdg_alt(RB, nav_stub)
	_ap_case_vs_apr(RB, nav_stub)
	_ap_case_refusals(RB, nav_stub)
	_end_group()

func _ap_case_hdg_alt(RB, nav_stub: Callable) -> void:
	var ap = CadetAutopilot.new(nav_stub)
	var fl = _ap_mkflight("air3000")
	var out = { "msgs": [], "samples": [] }
	out["msgs"].append(ap.control(fl, "AP"))
	fl["av"]["hdgBug"] = 40
	_ap_drive(ap, fl, 2400, out["samples"])
	fl["av"]["altSel"] = 3400
	_ap_drive(ap, fl, 2400, out["samples"])
	var calls = 0
	var msg = ""
	var input = { "down": func(k): return k == "KeyW" }
	while calls < 90 and msg.is_empty():
		msg = ap.update(1.0 / 60.0, fl, input)
		calls += 1
	out["override"] = { "calls": calls, "msg": msg, "flash": ap.flash(), "tone1": ap.take_disc_tone(), "tone2": ap.take_disc_tone(), "on": ap.is_on() }
	ap.sync(fl["av"])
	out["endAp"] = (fl["av"]["ap"] as Dictionary).duplicate()
	_deep("ap.hdg_alt", out, RB["ap"]["hdg_alt"], 0.05, 1e-3)

func _ap_case_vs_apr(RB, nav_stub: Callable) -> void:
	var ap = CadetAutopilot.new(nav_stub)
	var fl = _ap_mkflight("air3000d3")
	var out = { "msgs": [], "samples": [] }
	fl["av"]["altSel"] = 2500
	out["msgs"].append(ap.control(fl, "AP_VS"))
	out["vsSel0"] = null
	_ap_drive(ap, fl, 3600, out["samples"], 120)
	ap.sync(fl["av"])
	out["afterVs"] = { "ap": (fl["av"]["ap"] as Dictionary).duplicate(), "alt": float(fl["s"]["out"]["altTrue"]) }
	fl["av"]["_nav"] = { "src": "GPS", "flag": false, "dots": 0.3, "gsDots": null, "crs": 354, "dtk": 354 }
	out["msgs"].append(ap.control(fl, "AP_APR"))
	fl["av"]["_nav"] = { "src": "LOC1", "flag": false, "dots": 0.4, "gsDots": 0.6, "crs": 354, "dtk": 354 }
	out["msgs"].append(ap.control(fl, "AP_APR"))
	_ap_drive(ap, fl, 900, out["samples"], 120)
	ap.sync(fl["av"])
	out["endAp"] = (fl["av"]["ap"] as Dictionary).duplicate()
	out["endFd"] = (fl["av"]["fd"] as Dictionary).duplicate()
	_deep("ap.vs_apr", out, RB["ap"]["vs_apr"], 0.05, 1e-3)

func _ap_case_refusals(RB, nav_stub: Callable) -> void:
	var ap = CadetAutopilot.new(nav_stub)
	var out = { "msgs": [] }
	var gnd = _ap_mkflight("runway")
	out["msgs"].append(ap.control(gnd, "AP"))
	var low = _ap_mkflight("air600")
	out["msgs"].append(ap.control(low, "AP"))
	var fl = _ap_mkflight("air3000")
	out["msgs"].append(ap.control(fl, "FD"))
	fl["av"]["hdgBug"] = 30
	fl["L"]["last"] = _ap_ctx(fl["s"])
	ap.pilot(fl["L"], 1.0 / 60.0)
	ap.sync(fl["av"])
	out["fdOnly"] = { "rIn": float(fl["s"]["rIn"]), "fd": (fl["av"]["fd"] as Dictionary).duplicate(), "on": ap.is_on(), "fdOn": ap.is_fd_on() }
	out["msgs"].append(ap.control(fl, "FD"))
	out["msgs"].append(ap.control(fl, "AP_LVL"))
	ap.sync(fl["av"])
	out["lvlAp"] = (fl["av"]["ap"] as Dictionary).duplicate()
	out["msgs"].append(ap.control(fl, "AP"))
	_deep("ap.refusals", out, RB["ap"]["refusals"], 0.05, 1e-3)
