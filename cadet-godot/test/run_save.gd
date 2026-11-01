extends SceneTree

## CADET Godot port — Phase 3 (save + recorder) 同値テストランナー
## 使い方: godot --headless --path <project> -s test/run_save.gd
## tools/gen_reference3b.mjs が生成した参照値 (JS 原典 recorder.js + physics を実際に
## 飛行させた採取列) と src/recorder.gd を照合し、src/save_store.gd の保存→再読込の
## 往復と、flight_bridge 経由の finish 保存の往復を検証する。
## 終了コード: 0 = 全合格, 1 = 不合格あり。
## 注意: セーブテストは user://cadet_save_test3b*.json (実セーブ cadet_save.json とは
## 別名) と一時ディレクトリ配下の差し替えパスだけを使い、終了時に消す。

const Recorder = preload("res://src/recorder.gd")
const SaveStore = preload("res://src/save_store.gd")
const Bridge = preload("res://src/flight_bridge.gd")
const FP = preload("res://src/physics.gd")

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
	group_results.append({"name": group_name, "checks": group_checks, "failures": group_failures, "maxErr": group_max_err, "maxLabel": group_max_label})
	print("GROUP " + group_name + " checks " + str(group_checks) + " failures " + str(group_failures) + " max_err " + str(group_max_err) + " (" + group_max_label + ")")

func _fail(label: String, msg: String) -> void:
	failures += 1
	group_failures += 1
	if failures <= 60:
		print("FAIL %s: %s" % [label, msg])

func _chk(cond: bool, name: String) -> void:
	checks += 1
	group_checks += 1
	if not cond:
		_fail(name, "condition false")

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

func _eq_str(label: String, got: String, want: String) -> void:
	checks += 1
	group_checks += 1
	if got == want:
		return
	var i := 0
	while i < mini(got.length(), want.length()) and got[i] == want[i]:
		i += 1
	_fail(label, "strings differ at %d (got len %d want len %d): got '...%s' want '...%s'" % [i, got.length(), want.length(), got.substr(maxi(0, i - 20), 60), want.substr(maxi(0, i - 20), 60)])

func _sha256_hex(text: String) -> String:
	var ctx := HashingContext.new()
	ctx.start(HashingContext.HASH_SHA256)
	ctx.update(text.to_utf8_buffer())
	return ctx.finish().hex_encode()

func _load_json(p: String):
	var f = FileAccess.open(p, FileAccess.READ)
	if f == null:
		return null
	var parsed = JSON.parse_string(f.get_as_text())
	f.close()
	return parsed

func _write_text(p: String, text: String) -> void:
	var f = FileAccess.open(p, FileAccess.WRITE)
	f.store_string(text)
	f.close()

func _init() -> void:
	var R = _load_json("res://test/reference3b.json")
	if R == null:
		print("reference3b JSON missing — run tools/gen_reference3b.mjs first")
		quit(1)
		return
	_test_snapshots(R)
	_test_sequence(R)
	_test_slerp(R)
	_test_flown(R)
	_test_save_store()
	_test_bridge_roundtrip()
	print("== Phase 3 save/recorder total: " + str(checks) + " checks, " + str(failures) + " failures, max_err " + str(max_err) + " (" + max_err_label + ")")
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- snapshots (defensive inputs)
func _test_snapshots(R) -> void:
	_begin_group("recorder.snapshot")
	_deep("recHz", Recorder.REC_HZ, R["recHz"], 0.0, 0.0)
	for i in R["snapshots"].size():
		var c = R["snapshots"][i]
		var t = c.get("t")
		_deep("snapshot[%d]" % i, Recorder.snapshot(c.get("in"), t), c["out"], 1e-6, 0.0)
	_end_group()

# ---------------------------------------------------------------- recorder sequence (synthetic)
func _synth_state(t: float, over_out = null) -> Dictionary:
	var out := {"ias": 60.0 + t, "gs": 58.0 + t, "vsi": -200.0 - t * 10.0, "alt": 1000.0 - t * 20.0}
	if over_out != null:
		out = over_out
	return {
		"pos": [t * 100.0, 16.8, -t * 50.0], "q": [0.0, 0.0, 0.0, 1.0],
		"out": out, "pIn": 0.1 * t, "rIn": 0.0, "rud": 0.0,
		"eng": [{"thr": 0.5, "rpm": 2000.0 + t * 100.0, "failed": false}],
		"gearPos": 1.0, "flapDeg": 10.0, "onGround": t >= 3.0,
	}

func _test_sequence(R) -> void:
	_begin_group("recorder.sequence")
	var rec = Recorder.new()
	var log: Array = []
	log.append(["recording0", rec.recording(), "last0", rec.last_rec()])
	var r0 = rec.start({"title": "テスト飛行 <A&B>", "aircraft": "pa28", "startISO": "2026-11-01T01:02:03.250Z"})
	log.append(["started", r0["meta"], "recording1", rec.recording()])
	for i in range(101):
		rec.push(_synth_state(i * 0.03), i * 0.03)
	rec.push(null, 3.01)
	rec.mark(_synth_state(3.02, {"ias": 0.0, "gs": 0.0, "vsi": -900.0, "alt": 55.0}), 3.02)
	var cur: Dictionary = rec.current()
	log.append(["nAfterThin", (cur["samples"] as Array).size(), "first", cur["samples"][0], "lastT", cur["samples"][(cur["samples"] as Array).size() - 1]["t"]])
	var done_rec = rec.done()
	log.append(["doneN", (done_rec["samples"] as Array).size(), "recordingAfter", rec.recording(), "lastIsDone", rec.last_rec() == done_rec])
	log.append(["duration", Recorder.duration(done_rec)])
	rec.start({"title": "空"})
	var empty_done = rec.done()
	log.append(["emptyDone", empty_done, "lastStillDone", rec.last_rec() == done_rec])
	rec.clear()
	log.append(["lastAfterClear", rec.last_rec()])
	_deep("seqLog", log, R["seq"]["log"], 1e-6, 0.0)
	_deep("syntheticRec", done_rec, R["synthetic"], 1e-6, 0.0)
	var queries: Array = R["sampleQueries"]
	for i in queries.size():
		_deep("sampleAt[%d]" % i, Recorder.sample_at(done_rec, float(queries[i])), R["sampleAts"][i], 1e-6, 0.0)
		_deep("poseAt[%d]" % i, Recorder.pose_at(done_rec, float(queries[i])), R["poseAts"][i], 1e-6, 0.0)
	_eq_str("csvSynthetic", Recorder.to_csv(done_rec), String(R["csvSynthetic"]))
	_eq_str("gpxSynthetic", Recorder.to_gpx(done_rec, Callable(self, "_ne_to_lat_lon")), String(R["gpxSynthetic"]))
	_eq_str("gpxNoStart", Recorder.to_gpx({"meta": {}, "samples": (done_rec["samples"] as Array).slice(0, 2)}, Callable(self, "_ne_to_lat_lon")), String(R["gpxNoStart"]))
	_eq_str("gpxOffsetStart", Recorder.to_gpx({"meta": {"title": "x", "startISO": "2026-11-01T10:02:03+09:00"}, "samples": (done_rec["samples"] as Array).slice(0, 1)}, Callable(self, "_ne_to_lat_lon")), String(R["gpxOffsetStart"]))
	_eq_str("gpxBadStart", Recorder.to_gpx({"meta": {"title": "x", "startISO": "garbage"}, "samples": (done_rec["samples"] as Array).slice(0, 1)}, Callable(self, "_ne_to_lat_lon")), String(R["gpxBadStart"]))
	_eq_str("csvEmpty", Recorder.to_csv({"samples": []}), String(R["csvEmpty"]))
	_eq_str("gpxEmpty", Recorder.to_gpx({"meta": {}, "samples": []}, Callable(self, "_ne_to_lat_lon")), String(R["gpxEmpty"]))
	_deep("sampleAtEmpty", Recorder.sample_at({"samples": []}, 1.0), R["sampleAtEmpty"], 0.0, 0.0)
	_deep("durationEmpty", Recorder.duration({"samples": []}), R["durationEmpty"], 0.0, 0.0)
	_deep("durationNull", Recorder.duration(null), R["durationNull"], 0.0, 0.0)
	_end_group()

# the GPX coordinate mapping the app uses (main.js: Sorajima at a nominal 35N 140E)
func _ne_to_lat_lon(ne: Array) -> Array:
	var n := float(ne[0])
	var e := float(ne[1])
	return [35.0 + n / 111320.0, 140.0 + e / (111320.0 * cos(35.0 * PI / 180.0))]

# ---------------------------------------------------------------- slerp corner cases
func _test_slerp(R) -> void:
	_begin_group("recorder.slerp")
	for i in R["slerp"].size():
		var c = R["slerp"][i]
		var rec = {"samples": [c["a"], c["b"]]}
		_deep("slerp[%d].mid" % i, Recorder.sample_at(rec, 1.0), c["mid"], 1e-6, 0.0)
		_deep("slerp[%d].q1" % i, Recorder.sample_at(rec, 0.5), c["q1"], 1e-6, 0.0)
		_deep("slerp[%d].q3" % i, Recorder.sample_at(rec, 1.75), c["q3"], 1e-6, 0.0)
	_end_group()

# ---------------------------------------------------------------- a flown recording (Phase 1 bot laws)
var _bot := {"pBase": null, "iThr": 0.0}

func _bot_ctx(s: Dictionary) -> Dictionary:
	var o: Dictionary = s["out"]
	return {"hdg": FP.wrap360(float(o["hdgTrue"]) + 6.0), "pitch": float(o["pitch"]), "vs": float(o["vsi"]), "alt": float(o["altTrue"]), "kias": float(o["ias"]), "agl": float(o["agl"]), "onGround": bool(s["onGround"]), "gsK": float(o["gs"])}

func _bot_pitch_to(s: Dictionary, deg: float) -> void:
	s["keyHold"] = true
	s["pTgt"] = FP.clampf_(deg, -20.0, 22.0)
	s["pRate"] = 0.0

func _bot_bank_to(s: Dictionary, bank_t: float) -> void:
	var p := -float(s["w"][2]) / (PI / 180.0)
	s["rIn"] = FP.clampf_(0.045 * (bank_t - float(s["out"]["bank"])) - 0.012 * p, -1.0, 1.0)

func _bot_head_to(s: Dictionary, c: Dictionary, hdg_t: float, max_bank: float = 25.0) -> void:
	_bot_bank_to(s, FP.clampf_(FP.wrap180(hdg_t - float(c["hdg"])) * 1.5, -max_bank, max_bank))

func _bot_vs_pitch(s: Dictionary, c: Dictionary, vs_t: float, dt: float) -> void:
	if _bot["pBase"] == null:
		_bot["pBase"] = float(c["pitch"])
	_bot["pBase"] = FP.clampf_(float(_bot["pBase"]) + (vs_t - float(c["vs"])) * 0.0012 * dt, -10.0, 15.0)
	_bot_pitch_to(s, float(_bot["pBase"]) + (vs_t - float(c["vs"])) * 0.004)

func _bot_alt_vs(c: Dictionary, alt: float) -> float:
	return FP.clampf_((alt - float(c["alt"])) * 3.0, -700.0, 700.0)

func _bot_speed_thr(s: Dictionary, c: Dictionary, kt: float, dt: float) -> void:
	var e := kt - float(c["kias"])
	_bot["iThr"] = FP.clampf_(float(_bot["iThr"]) + e * 0.004 * dt, -0.4, 0.4)
	s["thr"] = FP.clampf_(float(s["thr"]) + (e * 0.02 + float(_bot["iThr"]) * 0.5) * dt * 2.0, 0.0, 1.0)

func _fly_flown() -> Dictionary:
	_bot = {"pBase": null, "iThr": 0.0}
	var s := FP.newState({})
	s["wind"] = {"fromDeg": 0.0, "kt": 0.0, "gust": 0.0}
	FP.placeOnRunway(s)
	var rec = Recorder.new()
	rec.start({"title": "t3相当", "aircraft": "pa28", "startISO": "2026-11-01T00:00:00.000Z"})
	var dt := 1.0 / 120.0
	var phase := "roll"
	var phase_t := 0.0
	var marked := false
	for i in range(120 * 300):
		var c := _bot_ctx(s)
		var t := i * dt
		match phase:
			"roll":
				s["brake"] = false
				s["thr"] = 1.0
				s["rud"] = FP.clampf_(-0.06 * FP.wrap180(float(c["hdg"]) - 360.0), -1.0, 1.0)
				if float(c["kias"]) > 54.0:
					s["pIn"] = 0.65
					phase = "climb"
					_bot["pBase"] = null
			"climb":
				s["pIn"] = 0.0
				_bot_vs_pitch(s, c, _bot_alt_vs(c, 800.0), dt)
				_bot_head_to(s, c, 354.0 + 6.0)
				if float(c["alt"]) > 760.0:
					phase = "level"
					phase_t = t
					_bot["pBase"] = null
			"level":
				_bot_vs_pitch(s, c, _bot_alt_vs(c, 800.0), dt)
				_bot_head_to(s, c, 354.0 + 6.0)
				_bot_speed_thr(s, c, 90.0, dt)
				if t - phase_t > 25.0:
					phase = "turn"
					phase_t = t
					_bot["pBase"] = null
			"turn":
				_bot_vs_pitch(s, c, _bot_alt_vs(c, 800.0), dt)
				_bot_head_to(s, c, 264.0 + 6.0)
				_bot_speed_thr(s, c, 90.0, dt)
				if absf(FP.wrap180(float(c["hdg"]) - 270.0)) < 4.0 or t - phase_t > 40.0:
					phase = "level2"
					phase_t = t
					_bot["pBase"] = null
			"level2":
				_bot_vs_pitch(s, c, _bot_alt_vs(c, 800.0), dt)
				_bot_head_to(s, c, 264.0 + 6.0)
				_bot_speed_thr(s, c, 90.0, dt)
				if t - phase_t > 10.0:
					phase = "descend"
					phase_t = t
					_bot["pBase"] = null
					s["flapIdx"] = 2
			"descend":
				var agl := float(c["alt"]) - 55.0
				var vs_t := -160.0 if agl < 45.0 else FP.clampf_((0.0 - float(c["alt"])) * 3.0, -800.0, -250.0)
				_bot_vs_pitch(s, c, maxf(vs_t, -650.0), dt)
				_bot_head_to(s, c, 264.0 + 6.0, 12.0)
				s["thr"] = FP.clampf_(float(s["thr"]) + ((0.2 if float(c["kias"]) < 62.0 else -0.2) if float(c["kias"]) > 75.0 or float(c["kias"]) < 62.0 else 0.0) * dt, 0.05, 0.6)
				if bool(s["onGround"]):
					phase = "rollout"
					phase_t = t
			"rollout":
				s["thr"] = 0.0
				s["brake"] = float(c["gsK"]) > 5.0
				s["pIn"] = 0.0
				s["rIn"] = 0.0
				if t - phase_t > 6.0:
					break
		FP.step(s, dt)
		rec.push(s, float(s["t"]))
		if phase == "rollout" and not marked:
			rec.mark(s, float(s["t"]))
			marked = true
	var flown = rec.done()
	return {"rec": flown, "endPhase": phase, "crashed": bool(s["crashed"]), "marked": marked}

func _test_flown(R) -> void:
	_begin_group("recorder.flown")
	var F = _fly_flown()
	var W = R["flown"]
	_chk(String(F["endPhase"]) == String(W["endPhase"]), "flown endPhase (%s)" % F["endPhase"])
	_chk(bool(F["crashed"]) == bool(W["crashed"]), "flown crashed")
	_chk(bool(F["marked"]) == bool(W["marked"]), "flown marked (touchdown mark)")
	var flown: Dictionary = F["rec"]
	_deep("flown.meta", flown["meta"], W["meta"], 0.0, 0.0)
	_deep("flown.samples", flown["samples"], W["samples"], 1.5e-3, 1e-4)
	_deep("flown.duration", Recorder.duration(flown), W["duration"], 1e-6, 0.0)
	# the landing records the (already ported) analysis derives from the captured samples
	var ana = CadetAnalysis.analyze_recording({"samples": flown["samples"]}, {"vref": 65})
	_deep("flown.analysis", ana, W["analysis"], 2e-3, 1e-4)
	if typeof(ana) == TYPE_DICTIONARY and typeof(W["analysis"]) == TYPE_DICTIONARY:
		_chk((ana["landings"] as Array).size() == (W["analysis"]["landings"] as Array).size(), "flown landing count (%d)" % (ana["landings"] as Array).size())
	var queries: Array = R["flownQueries"]
	for i in queries.size():
		_deep("flown.sampleAt[%d]" % i, Recorder.sample_at(flown, float(queries[i])), R["flownSampleAts"][i], 1.5e-3, 1e-4)
		_deep("flown.poseAt[%d]" % i, Recorder.pose_at(flown, float(queries[i])), R["flownPoseAts"][i], 1.5e-3, 1e-4)
	var csv := Recorder.to_csv(flown)
	_chk(csv.length() == int(W["csvLen"]), "flown csv length (got %d want %d)" % [csv.length(), int(W["csvLen"])])
	_eq_str("flown.csvSha256", _sha256_hex(csv), String(W["csvSha256"]))
	var gpx := Recorder.to_gpx(flown, Callable(self, "_ne_to_lat_lon"))
	_chk(gpx.length() == int(W["gpxLen"]), "flown gpx length (got %d want %d)" % [gpx.length(), int(W["gpxLen"])])
	_eq_str("flown.gpxSha256", _sha256_hex(gpx), String(W["gpxSha256"]))
	_end_group()

# ---------------------------------------------------------------- save_store round trips
func _test_save_store() -> void:
	_begin_group("saveStore")
	# the production default is untouched by this whole suite
	_chk(SaveStore.DEFAULT_PATH == "user://cadet_save.json", "default path is user://cadet_save.json")
	_chk(SaveStore.new().path == "user://cadet_save.json", "default ctor path")
	var path := "user://cadet_save_test3b.json"
	var abs_path := "/tmp/cadet-godot-save-test/save.json"  # 差し替えパスの検証用 (user:// の外)
	for p in [path, abs_path]:
		var pre = SaveStore.new(p)
		if pre.exists():
			pre.erase_file()
	# --- basic round trip through a fresh instance (a "restart")
	var store_a := {
		"flightlab-records-v2": "[{\"v\":2,\"id\":\"r1\"}]",
		"flightlab-progress-v2": "{\"lessons\":{\"a1\":{\"tries\":1}},\"time\":12.5}",
		"cadet.career": "{\"v\":2,\"seed\":1234,\"day\":40}",
		"note": "日本語テキスト \"quoted\" \\ escaped",
		"empty": "",
	}
	var saver = SaveStore.new(path)
	_chk(not saver.exists(), "no file before first save")
	_chk(saver.save(store_a), "save returns true")
	_chk(saver.exists(), "file exists after save")
	var loader = SaveStore.new(path)
	_deep("roundtrip.load", loader.load_store(), store_a, 0.0, 0.0)
	_deep("roundtrip.loadData", loader.load_data(), store_a, 0.0, 0.0)
	_deep("roundtrip.restore", loader.restore(), store_a, 0.0, 0.0)
	var target := {"junk": "x"}
	_chk(loader.restore_into(target), "restore_into true on valid file")
	_deep("roundtrip.restoreInto", target, store_a, 0.0, 0.0)
	# --- empty store
	_chk(saver.save({}), "save empty store")
	_chk(saver.exists(), "empty store still writes a file")
	_deep("roundtrip.empty", loader.load_store(), {}, 0.0, 0.0)
	# --- non-string values are JSON-encoded once on save (file stays key -> String)
	_chk(saver.save({"n": 42, "b": true, "o": {"x": 1}}), "save non-string values")
	_deep("roundtrip.nonString", loader.load_store(), {"n": "42", "b": "true", "o": "{\"x\":1}"}, 0.0, 0.0)
	# --- corrupt / odd files: the original's fallback is "start fresh", never a crash
	_write_text(path, "{broken json")
	_chk(loader.exists(), "corrupt file exists")
	_deep("fallback.brokenJson", loader.load_store(), {}, 0.0, 0.0)
	var target2 := {"junk": "x"}
	_chk(not loader.restore_into(target2), "restore_into false on corrupt file")
	_deep("fallback.brokenTarget", target2, {}, 0.0, 0.0)
	_write_text(path, "[1,2,3]")
	_deep("fallback.arrayJson", loader.load_store(), {}, 0.0, 0.0)
	_write_text(path, "")
	_deep("fallback.emptyFile", loader.load_store(), {}, 0.0, 0.0)
	_write_text(path, "{\"a\":\"ok\",\"b\":42,\"c\":null,\"d\":{\"x\":1},\"e\":\"keep\"}")
	_deep("fallback.mixedTypes", loader.load_store(), {"a": "ok", "e": "keep"}, 0.0, 0.0)
	# --- replaceable path outside user:// (incl. creating the parent directory)
	var saver2 = SaveStore.new(abs_path)
	_chk(saver2.save(store_a), "save to replaced absolute path")
	_deep("roundtrip.absPath", SaveStore.new(abs_path).load_store(), store_a, 0.0, 0.0)
	# --- missing file
	var missing = SaveStore.new("user://cadet_save_test3b_missing.json")
	if missing.exists():
		missing.erase_file()
	_chk(not missing.exists(), "missing file: exists false")
	_deep("fallback.missing", missing.load_store(), {}, 0.0, 0.0)
	var target3 := {"junk": "x"}
	_chk(not missing.restore_into(target3), "restore_into false on missing file")
	_deep("fallback.missingTarget", target3, {}, 0.0, 0.0)
	# cleanup: leave no test files behind
	_chk(saver.erase_file(), "erase user:// test file")
	_chk(not saver.exists(), "user:// test file gone")
	_chk(saver2.erase_file(), "erase absolute test file")
	_end_group()

# ---------------------------------------------------------------- bridge finish() through the file
func _test_bridge_roundtrip() -> void:
	_begin_group("saveStore.bridge")
	var path := "user://cadet_save_test3b_bridge.json"
	var pre = SaveStore.new(path)
	if pre.exists():
		pre.erase_file()
	var store1 := {}
	var b1 = Bridge.new({"store": store1})
	var L = b1.start_lesson("a1", "intro")
	_chk(L != null, "bridge start_lesson a1")
	for i in range(120):
		b1.frame(1.0 / 60.0, {})
	b1.abort("テスト終了")
	var rec = b1.finish()
	_chk(rec != null, "bridge finish returns a record")
	var records1: Array = b1.records()
	var progress1: Dictionary = b1.progress()
	_chk(records1.size() == 1, "one record after finish (got %d)" % records1.size())
	_chk(not store1.is_empty(), "store populated by finish")
	# persist, then rebuild everything from the file alone (a "restart")
	_chk(SaveStore.new(path).save(store1), "bridge store saved")
	var store2: Dictionary = SaveStore.new(path).load_store()
	_deep("bridge.storeStrings", store2, store1, 0.0, 0.0)
	var b2 = Bridge.new({"store": store2})
	_deep("bridge.records", b2.records(), records1, 0.0, 0.0)
	_deep("bridge.progress", b2.progress(), progress1, 0.0, 0.0)
	# keep flying on the restored store: free-flight finish flushes progress into it
	b2.start_free("rwy", "pa28", {"wind": "calm"})
	for i in range(300):
		b2.frame(1.0 / 60.0, {})
	b2.finish()
	var progress2: Dictionary = b2.progress()
	_chk(float(progress2["time"]) >= float(progress1["time"]), "progress time survives + grows (%s >= %s)" % [progress2["time"], progress1["time"]])
	_chk(SaveStore.new(path).save(store2), "restored store saved again")
	var store3: Dictionary = SaveStore.new(path).load_store()
	var b3 = Bridge.new({"store": store3})
	_deep("bridge.records2", b3.records(), records1, 0.0, 0.0)
	_deep("bridge.progress2", b3.progress(), progress2, 0.0, 0.0)
	# the career layer reads the same store Dictionary shape
	var cstore := {}
	var c1 = CadetCareerInstance.new(cstore, 1234)
	c1.done("ceremony", "welcome")
	c1.finish_prologue()
	_chk(SaveStore.new(path).save(cstore), "career store saved")
	var cstore2: Dictionary = SaveStore.new(path).load_store()
	var c2 = CadetCareerInstance.new(cstore2, 999)
	_chk(c2.day() == c1.day() and c2.chapter() == c1.chapter() and c2.is_done("ceremony", "welcome"), "career restored from file (day %d chapter %s)" % [c2.day(), c2.chapter()])
	_chk(pre.erase_file(), "erase bridge test file")
	_end_group()
