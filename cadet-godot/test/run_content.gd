extends SceneTree

## CADET Godot port — Phase 3 (content) 同値テストランナー
## 使い方: godot --headless --path <project> -s test/run_content.gd
## tools/gen_content.mjs が生成した data/content.json（抽出データ）と
## test/reference_content.json（JS 原典の期待値）を、src/dialog_engine.gd（dialog/engine.js 移植）と
## src/day_radio.gd（content/dialog/atc.js の dayRadio 等の移植）に照合する。
## 終了コード: 0 = 全合格, 1 = 不合格あり。文字列は完全一致、数値は参照が丸めた範囲で一致を見る。

const DialogEngine = preload("res://src/dialog_engine.gd")
const DayRadio = preload("res://src/day_radio.gd")

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

func _chk(cond: bool, label: String) -> void:
	checks += 1
	group_checks += 1
	if not cond:
		_fail(label, "check failed")

# deep compare: numbers with tolerance (tracked), strings/bools exact, arrays elementwise,
# dictionaries by key union (a missing key reads as null). A want of { __fn: ... } only
# requires the same marker on the got side (JS function sources are data, not behaviour);
# likewise { __callable: true, A2, A3 } is resolved by the caller before comparing.
func _deep(label: String, got, want, tol_abs: float = 1e-6, tol_rel: float = 1e-6) -> void:
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
		if err > group_max_err:
			group_max_err = err
			group_max_label = label
		if err > max_err:
			max_err = err
			max_err_label = label
		var tol = tol_abs + tol_rel * absf(float(want))
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
		if want.has("__fn"):
			if typeof(got) != TYPE_DICTIONARY or not got.has("__fn"):
				_fail(label, "got %s want a {__fn} marker" % str(got))
			return
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
	var C = _load_json("res://data/content.json")
	var R = _load_json("res://test/reference_content.json")
	if C == null or R == null:
		print("content.json / reference_content.json missing — run tools/gen_content.mjs first")
		quit(1)
		return
	_test_content(C, R)
	_test_dialog_unit(R)
	_test_transcripts(C, R)
	_test_radio(R)
	print("== Phase 3 content total: " + str(checks) + " checks, " + str(failures) + " failures, max_err " + str(max_err) + " (" + max_err_label + ")")
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- content.json extraction
func _test_content(C, R) -> void:
	_begin_group("content")
	var E = R["expect"]
	_deep("people.count", C["people"]["PEOPLE"].size(), E["peopleCount"], 0.0, 0.0)
	_deep("people.instructor.name", C["people"]["PEOPLE"]["instructor"]["name"], "早瀬 航", 0.0, 0.0)
	_deep("people.peers", C["people"]["PEERS"], ["kiryu", "asahi", "mori"], 0.0, 0.0)
	_deep("exams.vsCareerGd", C["exams"], CadetCareer.EXAMS, 0.0, 0.0)
	_deep("summaries.count", C["lectureSummaries"].size(), E["summaryKeys"], 0.0, 0.0)
	_deep("quiz.banks", C["quiz"].size(), E["quizBanks"].size(), 0.0, 0.0)
	for i in E["quizBanks"].size():
		var b = E["quizBanks"][i]
		var got = C["quiz"][i]
		_deep("quiz[%s].id" % b["id"], got["id"], b["id"], 0.0, 0.0)
		_deep("quiz[%s].title" % b["id"], got["title"], b["title"], 0.0, 0.0)
		_deep("quiz[%s].n" % b["id"], got["qs"].size(), b["n"], 0.0, 0.0)
		_deep("quiz[%s].first" % b["id"], got["qs"][0], b["first"], 0.0, 0.0)
	_deep("walkArcher.ids", C["walkaroundArcher"]["POINTS"].map(func(p): return p["id"]), E["walkArcherIds"], 0.0, 0.0)
	_deep("walkSeminole.ids", C["walkaroundSeminole"]["POINTS"].map(func(p): return p["id"]), E["walkSeminoleIds"], 0.0, 0.0)
	_deep("academy.rooms", C["academy"]["rooms"].map(func(r): return r["id"]), E["academyRooms"], 0.0, 0.0)
	_deep("academy.counts", { "rooms": C["academy"]["rooms"].size(), "doors": C["academy"]["doors"].size(), "interactables": C["academy"]["interactables"].size() }, E["academyCounts"], 0.0, 0.0)
	_deep("dorm.rooms", C["dorm"]["rooms"].map(func(r): return r["id"]), E["dormRooms"], 0.0, 0.0)
	_deep("tower.rooms", C["tower"]["rooms"].map(func(r): return r["id"]), E["towerRooms"], 0.0, 0.0)
	_deep("hangar.areas", C["hangar"]["areas"].map(func(a): return a["id"]), E["hangarAreas"], 0.0, 0.0)
	for k in E["chkArcher"].keys():
		_deep("chkA.%s.title" % k, C["checklistsArcher"][k]["title"], E["chkArcher"][k]["title"], 0.0, 0.0)
		_deep("chkA.%s.items" % k, C["checklistsArcher"][k]["items"].map(func(it): return it[0]), E["chkArcher"][k]["items"], 0.0, 0.0)
		# every item keeps all six slots, with functions preserved as {__fn} markers or null
		for it in C["checklistsArcher"][k]["items"]:
			_chk(typeof(it) == TYPE_ARRAY and it.size() == 6, "chkA.%s item shape" % k)
			_chk(it[2] == null or (typeof(it[2]) == TYPE_DICTIONARY and it[2].has("__fn")), "chkA.%s test slot" % k)
			_chk(it[5] == null or (typeof(it[5]) == TYPE_DICTIONARY and it[5].has("__fn")), "chkA.%s set slot" % k)
	for k in E["chkSeminole"].keys():
		_deep("chkS.%s.title" % k, C["checklistsSeminole"][k]["title"], E["chkSeminole"][k]["title"], 0.0, 0.0)
		_deep("chkS.%s.items" % k, C["checklistsSeminole"][k]["items"].map(func(it): return it[0]), E["chkSeminole"][k]["items"], 0.0, 0.0)
	# usable's pure functions (shelfSection / dailyNotices / usableKind) are not ported to
	# GDScript in this stream (no src file was assigned for them); gen pins their JS outputs
	# in expect.usableFns as data only — see PHASE3-CONTENT.md.
	_deep("usable.notices.len", C["usable"]["NOTICES"].size(), 10, 0.0, 0.0)
	_deep("usable.coffeeTire", C["usable"]["COFFEE_TIRE"], -4, 0.0, 0.0)
	_deep("book.realNames", C["book"]["REAL_NAMES"], { "__re": C["book"]["REAL_NAMES"]["__re"], "__flags": "i" }, 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- dialog engine unit cases
func _test_dialog_unit(R) -> void:
	_begin_group("dialogUnit")
	var U = R["dialogUnit"]
	for c in U["getPath"]:
		var got = DialogEngine.resolve_path(c["ctx"], String(c["path"]))
		_deep("resolvePath(%s)" % c["path"], got, c["out"], 0.0, 0.0)
	for c in U["fill"]:
		var missing: Array = []
		var got = DialogEngine.fill(c["text"], c["ctx"], func(p): missing.append(p))
		_deep("fill(%s)" % c["text"], got, c["out"], 0.0, 0.0)
		_deep("fill.missing(%s)" % c["text"], missing, c["missing"], 0.0, 0.0)
	for c in U["fillNoCb"]:
		_deep("fillNoCb", DialogEngine.fill(c["text"], c["ctx"]), c["out"], 0.0, 0.0)
	for c in U["cond"]:
		DialogEngine.last_error = ""
		var got = DialogEngine.eval_cond(c["cond"], c["state"], c["ctx"])
		if c.get("throws", false):
			_chk(DialogEngine.last_error != "", "evalCond throws for %s" % str(c["cond"]))
		else:
			_deep("evalCond(%s)" % str(c["cond"]), got, c["out"], 0.0, 0.0)
	for c in U["condKind"]:
		_deep("condKind(%s)" % str(c["c"]), DialogEngine.cond_kind(c["c"]), c["kind"], 0.0, 0.0)
	for c in U["effectKind"]:
		_deep("effectKind(%s)" % str(c["e"]), DialogEngine.effect_kind(c["e"]), c["kind"], 0.0, 0.0)
	for c in U["states"]:
		_deep("isDialogState", DialogEngine.is_dialog_state(c["in"]), c["isState"], 0.0, 0.0)
		_deep("createDialogState(%s)" % str(c["in"]).substr(0, 40), DialogEngine.create_dialog_state(c["in"]), c["out"], 0.0, 0.0)
	for c in U["trustOf"]:
		_deep("trustOf", DialogEngine.trust_of(c["state"], String(c["who"])), c["out"], 0.0, 0.0)
	for c in U["effects"]:
		var hooks: Array = []
		var st = c["stateIn"].duplicate(true)
		DialogEngine.last_error = ""
		DialogEngine.apply_effects(c["effects"], st, { "onHook": func(n, a): hooks.append([n, a]) })
		if c.get("throws", false):
			_chk(DialogEngine.last_error != "", "applyEffects throws for %s" % str(c["effects"]))
		_deep("applyEffects.state(%s)" % str(c["effects"]).substr(0, 40), st, c["stateOut"], 0.0, 0.0)
		_deep("applyEffects.hooks", hooks, c["hooks"], 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- dialog transcripts
func _test_transcripts(C, R) -> void:
	_begin_group("dialogTranscript")
	var datas = { "day": C["dialogs"]["day1"]["all"], "intro": C["dialogs"]["intro"]["air"] }
	for sc in R["transcripts"]:
		var hooks: Array = []
		var state = DialogEngine.create_dialog_state(sc["saved"])
		var ctx = sc["ctx"]
		var runner = DialogEngine.create_runner({ "data": datas[sc["dataKey"]], "state": state,
			"ctx": (func(): return ctx) if sc["ctxFn"] else ctx,
			"hooks": { "onHook": func(n, a): hooks.append([n, a]) } })
		_chk(runner != null, "%s runner created" % sc["name"])
		if runner == null:
			continue
		for si in sc["actions"].size():
			var a = sc["actions"][si]
			var want = sc["steps"][si]
			var ret = null
			match String(a["op"]):
				"start":
					ret = runner.start(String(a["dialog"]), a.get("node"))
				"next":
					ret = runner.next()
				"choose":
					ret = runner.choose(int(a["i"]))
				"press":
					ret = runner.press(String(a["key"]))
				"stop":
					runner.stop()
					ret = null
			var lbl = "%s step %d (%s)" % [sc["name"], si, a["op"]]
			_deep(lbl + ".ret", ret, want["ret"], 0.0, 0.0)
			_deep(lbl + ".view", runner.view(), want["view"], 0.0, 0.0)
			_deep(lbl + ".state", runner.state, want["state"], 0.0, 0.0)
			_deep(lbl + ".hooks", hooks, want["hooks"], 0.0, 0.0)
			_deep(lbl + ".running", runner.running, want["running"], 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- dayRadio
func _test_radio(R) -> void:
	_begin_group("radio")
	var RD = R["radio"]
	for c in RD["cases"]:
		DayRadio.set_call(String(c["call"]))
		var got = DayRadio.day_radio(c["weather"])
		var want = c["out"]
		_deep("%s.weather" % c["name"], got["weather"], want["weather"], 0.0, 0.0)
		_deep("%s.atisText" % c["name"], got["atisText"], want["atisText"], 0.0, 0.0)
		_deep("%s.sequences" % c["name"], got["sequences"], want["sequences"], 0.0, 0.0)
		_deep("%s.call" % c["name"], got["call"], want["call"], 0.0, 0.0)
		_deep("%s.freq" % c["name"], got["freq"], want["freq"], 0.0, 0.0)
		for id in want["exchanges"].keys():
			var w = want["exchanges"][id]
			var g = got["exchanges"][id]
			if typeof(w) == TYPE_DICTIONARY and w.get("__callable", false):
				_chk(typeof(g) == TYPE_CALLABLE, "%s.%s is callable" % [c["name"], id])
				if typeof(g) == TYPE_CALLABLE:
					_deep("%s.%s(A2)" % [c["name"], id], g.call("A2"), w["A2"], 0.0, 0.0)
					_deep("%s.%s(A3)" % [c["name"], id], g.call("A3"), w["A3"], 0.0, 0.0)
			else:
				_deep("%s.%s" % [c["name"], id], g, w, 0.0, 0.0)
	DayRadio.set_call("pa28")
	_deep("ctaf", DayRadio.ctaf_radio(), RD["ctaf"], 0.0, 0.0)
	_deep("ctafConst.area", DayRadio.CTAF_AREA, RD["ctafConst"]["area"], 0.0, 0.0)
	_deep("ctafConst.ctaf", DayRadio.CTAF, RD["ctafConst"]["ctaf"], 0.0, 0.0)
	_deep("ctafConst.freq", DayRadio.FREQ, RD["ctafConst"]["freq"], 0.0, 0.0)
	_deep("ctafConst.calls", DayRadio.CALLS, RD["ctafConst"]["calls"], 0.0, 0.0)
	for c in RD["ourCall"]:
		DayRadio.set_call(String(c["call"]))
		_deep("ourCall(%s)" % str(c["input"]), DayRadio.our_call(c["input"]), c["out"], 0.0, 0.0)
	for c in RD["spoken"]:
		DayRadio.set_call(String(c["call"]))
		_deep("spoken(%s)" % c["input"], DayRadio.spoken(String(c["input"])), c["out"], 0.0, 0.0)
	DayRadio.set_call("pa28")
	_end_group()
