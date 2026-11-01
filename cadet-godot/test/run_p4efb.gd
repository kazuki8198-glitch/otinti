extends SceneTree

## CADET Godot port — Phase 4 (EFB / replay / profile graph) tests.
## Run: godot --headless --path . -s test/run_p4efb.gd
##   WB:        EFB.current_result() == FlightPhysics.computeWB() direct
##   CHECKLIST: EFB item counts == data/content.json
##   CHART:     EFB.chart_geometry() carries the PAVED runway etc.
##   REPLAY:    ReplayPlayer.sample_at interpolation (midpoint lerp,
##              normalized slerp), world conversion, frame_camera tower
##   PROFILE:   ProfileGraph.series_stats on synthetic samples
## Exit code: 0 = all pass, 1 = failures.

const FP = preload("res://src/physics.gd")
const EFB = preload("res://src/efb.gd")
const RP = preload("res://src/replay.gd")
const PG = preload("res://src/profile_graph.gd")

var checks := 0
var failures := 0
var group_name := ""
var group_checks := 0
var group_failures := 0

func _begin(g: String) -> void:
	group_name = g
	group_checks = 0
	group_failures = 0

func _end() -> void:
	print("GROUP %s checks=%d failures=%d %s" % [group_name, group_checks, group_failures, "ok" if group_failures == 0 else "FAILED"])

func _check(label: String, ok: bool, detail: String = "") -> void:
	checks += 1
	group_checks += 1
	if not ok:
		failures += 1
		group_failures += 1
		print("FAIL %s: %s" % [label, detail])

func _num(label: String, got: float, want: float, tol: float = 1e-6) -> void:
	_check(label, absf(got - want) <= tol, "got " + str(got) + " want " + str(want) + " tol " + str(tol))

func _init() -> void:
	_test_wb()
	_test_checklist()
	_test_chart()
	_test_replay_interp()
	_test_cameras()
	_test_profile()
	_test_player()
	print("TOTAL checks=%d failures=%d" % [checks, failures])
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- WB
func _test_wb() -> void:
	_begin("wb")
	var efb = EFB.new()
	var cases: Array = [
		{"fuel": "std", "front": 2, "rear": 0, "bagKg": 0.0},
		{"fuel": "full", "front": 2, "rear": 1, "bagKg": 10.0},
		{"fuel": "tabs", "front": 1, "rear": 0, "bagKg": 0.0},
		{"fuel": "half", "front": 2, "rear": 2, "bagKg": 90.0},
		{"fuel": "full", "front": 0, "rear": 2, "bagKg": 45.5},
	]
	for id in ["pa28", "pa44", "pa28r"]:
		var A := FP.aircraftById(id)
		efb.set_aircraft(id)
		_check(id + ".aircraft_id", efb.aircraft_id() == id)
		for ci in range(cases.size()):
			var ld: Dictionary = cases[ci]
			efb.set_loading(ld)
			var got: Dictionary = efb.current_result()
			var want = FP.computeWB(A, ld)
			_check("%s.case%d.exists" % [id, ci], typeof(want) == TYPE_DICTIONARY and not got.is_empty())
			if typeof(want) != TYPE_DICTIONARY or got.is_empty():
				continue
			_num("%s.case%d.kg" % [id, ci], float(got["kg"]), float(want["kg"]), 1e-9)
			_num("%s.case%d.lb" % [id, ci], float(got["lb"]), float(want["lb"]), 1e-9)
			_num("%s.case%d.cgIn" % [id, ci], float(got["cgIn"]), float(want["cgIn"]), 1e-9)
			_num("%s.case%d.spreadIn" % [id, ci], float(got["spreadIn"]), float(want["spreadIn"]), 1e-9)
			_check("%s.case%d.ok" % [id, ci], bool(got["ok"]) == bool(want["ok"]), "got %s want %s" % [str(got["ok"]), str(want["ok"])])
			_check("%s.case%d.problems" % [id, ci], (got["problems"] as Array) == (want["problems"] as Array))
			_num("%s.case%d.mtow" % [id, ci], float(got["mtowLb"]), float(want["mtowLb"]), 0.0)
			_num("%s.case%d.fwd" % [id, ci], float(got["fwdIn"]), float(want["fwdIn"]), 0.0)
			_num("%s.case%d.aft" % [id, ci], float(got["aftIn"]), float(want["aftIn"]), 0.0)
	# per-tank fuel override is forwarded to computeWB
	efb.set_aircraft("pa28")
	efb.set_loading({"fuel": "std", "front": 2, "rear": 0, "bagKg": 0.0, "fuelGal": [10.0, 12.0]})
	var got2: Dictionary = efb.current_result()
	var want2 = FP.computeWB(FP.aircraftById("pa28"), {"fuel": "std", "front": 2, "rear": 0, "bagKg": 0.0}, [10.0, 12.0])
	_num("wb.fuelGal.kg", float(got2["kg"]), float(want2["kg"]), 1e-9)
	_num("wb.fuelGal.cg", float(got2["cgIn"]), float(want2["cgIn"]), 1e-9)
	# default state equals the standard loading
	var efb2 = EFB.new()
	var want3 = FP.computeWB(FP.aircraftById("pa28"), FP.stdLoading())
	_num("wb.default.kg", float(efb2.current_result()["kg"]), float(want3["kg"]), 1e-9)
	_end()

# ---------------------------------------------------------------- checklist
func _test_checklist() -> void:
	_begin("checklist")
	var raw = JSON.parse_string(FileAccess.get_file_as_string("res://data/content.json"))
	_check("content.parses", typeof(raw) == TYPE_DICTIONARY)
	if typeof(raw) != TYPE_DICTIONARY:
		_end()
		return
	var efb = EFB.new()
	for pair in [["pa28", "checklistsArcher"], ["pa44", "checklistsSeminole"], ["pa28r", "checklistsArcher"]]:
		var book: Dictionary = raw[pair[1]]
		for phase in book.keys():
			efb.set_checklist(pair[0], String(phase))
			var want_n: int = (book[phase]["items"] as Array).size()
			_check("%s.%s.count" % [pair[0], phase], efb.item_count() == want_n, "got %d want %d" % [efb.item_count(), want_n])
			_check("%s.%s.title" % [pair[0], phase], efb.checklist_title() == String(book[phase]["title"]))
			_check("%s.%s.phase" % [pair[0], phase], efb.current_phase() == String(phase))
			# first item name/value match the JSON
			if want_n > 0:
				var items := efb.current_items()
				var w0: Array = book[phase]["items"][0]
				_check("%s.%s.item0" % [pair[0], phase], String(items[0]["name"]) == String(w0[0]) and String(items[0]["value"]) == String(w0[1]))
	# toggle behaviour
	efb.set_checklist("pa28", "before_start")
	_check("toggle.initial", efb.checked_count() == 0 and not efb.is_checked(0))
	efb.toggle(0)
	_check("toggle.on", efb.is_checked(0) and efb.checked_count() == 1)
	efb.toggle(0)
	_check("toggle.off", not efb.is_checked(0) and efb.checked_count() == 0)
	efb.toggle(-1)
	efb.toggle(9999)
	_check("toggle.oob", efb.checked_count() == 0)
	# switching phase resets checks
	efb.toggle(1)
	efb.set_checklist("pa28", "runup")
	_check("toggle.reset_on_phase", efb.checked_count() == 0)
	_end()

# ---------------------------------------------------------------- chart
func _test_chart() -> void:
	_begin("chart")
	var geo := EFB.chart_geometry()
	_check("has_runway", geo.has("runway"))
	_check("has_apron", geo.has("apron"))
	_check("has_taxiway", geo.has("taxiway_parallel"))
	var rwy_paved = null
	for p in FP.PAVED:
		if String(p[4]) == "rwy":
			rwy_paved = p
	var rp: PackedVector2Array = geo["runway"]
	_check("runway.corners", rp.size() == 4)
	var cmin := INF; var cmax := -INF; var amin := INF; var amax := -INF
	for v in rp:
		cmin = minf(cmin, v.x); cmax = maxf(cmax, v.x)
		amin = minf(amin, v.y); amax = maxf(amax, v.y)
	_num("runway.cross_min", cmin, float(rwy_paved[2]), 1e-9)
	_num("runway.cross_max", cmax, float(rwy_paved[3]), 1e-9)
	_num("runway.along_min", amin, float(rwy_paved[0]), 1e-9)
	_num("runway.along_max", amax, float(rwy_paved[1]), 1e-9)
	# runway centre (0, 600) is inside the polygon bounds
	_check("runway.contains_center", cmin < 0.0 and cmax > 0.0 and amin < 600.0 and amax > 600.0)
	_check("connectors.3", (geo["connectors"] as Array).size() == 3, "got %d" % (geo["connectors"] as Array).size())
	_check("hangars.2", (geo["hangars"] as Array).size() == 2)
	_num("hdg", float(geo["hdg"]), 354.0, 0.0)
	_num("len", float(geo["len"]), 1200.0, 0.0)
	var tpos: Vector2 = geo["tower"]["pos"]
	_num("tower.cross", tpos.x, 262.0, 0.0)
	_num("tower.along", tpos.y, 721.0, 0.0)
	var ctr: Vector2 = geo["academy"]["center"]
	_num("academy.cross", ctr.x, 263.0, 0.0)
	_num("academy.along", ctr.y, 655.0, 0.0)
	var th36: Vector2 = geo["threshold36"]
	var th18: Vector2 = geo["threshold18"]
	_num("thr36.along", th36.y, 0.0, 0.0)
	_num("thr18.along", th18.y, 1200.0, 0.0)
	_end()

# ---------------------------------------------------------------- replay interpolation
func _mk_samples() -> Array:
	var q90 := Quaternion(Vector3.UP, deg_to_rad(90.0))
	return [
		{"t": 0.0, "n": 0.0, "e": 0.0, "h": 0.0, "q": [0.0, 0.0, 0.0, 1.0], "ias": 0.0, "gs": 0.0, "vs": 0.0, "alt": 55.0, "thr": 0.0, "gear": 1.0, "flap": 0.0, "onGround": true, "rpm": 600.0},
		{"t": 2.0, "n": 100.0, "e": 50.0, "h": 0.0, "q": [q90.x, q90.y, q90.z, q90.w], "ias": 80.0, "gs": 82.0, "vs": 500.0, "alt": 155.0, "thr": 1.0, "gear": 1.0, "flap": 0.0, "onGround": false, "rpm": 2400.0},
	]

func _test_replay_interp() -> void:
	_begin("replay_interp")
	var xs := _mk_samples()
	var mid := RP.sample_at(xs, 1.0)
	_num("mid.n", float(mid["n"]), 50.0, 1e-6)
	_num("mid.e", float(mid["e"]), 25.0, 1e-6)
	_num("mid.alt", float(mid["alt"]), 105.0, 1e-6)
	_num("mid.ias", float(mid["ias"]), 40.0, 1e-6)
	_num("mid.t", float(mid["t"]), 1.0, 0.0)
	var q: Array = mid["q"]
	var qlen := sqrt(float(q[0]) * float(q[0]) + float(q[1]) * float(q[1]) + float(q[2]) * float(q[2]) + float(q[3]) * float(q[3]))
	_num("mid.q_normalized", qlen, 1.0, 1e-6)
	# halfway between identity and a 90° yaw is a 45° yaw
	_num("mid.q_y", float(q[1]), sin(deg_to_rad(22.5)), 1e-4)
	_num("mid.q_w", float(q[3]), cos(deg_to_rad(22.5)), 1e-4)
	_num("mid.q_x", float(q[0]), 0.0, 1e-6)
	_num("mid.q_z", float(q[2]), 0.0, 1e-6)
	# clamping at both ends
	_num("clamp.lo.n", float(RP.sample_at(xs, -5.0)["n"]), 0.0, 0.0)
	_num("clamp.hi.n", float(RP.sample_at(xs, 99.0)["n"]), 100.0, 0.0)
	_num("clamp.hi.alt", float(RP.sample_at(xs, 99.0)["alt"]), 155.0, 0.0)
	# empty input
	_check("empty", RP.sample_at([], 1.0).is_empty())
	# world conversion: Vector3(e, alt/FT, -n) + VIS_OFF; ground alt 55 ft -> GROUND_M
	var w0 := RP.world_from_sample(xs[0])
	_num("world.ground_y", w0.y, FP.GROUND_M, 1e-6)
	_num("world.x_off", w0.x, 40000.0, 1e-6)
	var wm := RP.world_from_sample(mid)
	_num("world.mid_x", wm.x, 40025.0, 1e-4)
	_num("world.mid_y", wm.y, 105.0 / FP.FT, 1e-4)
	_num("world.mid_z", wm.z, -50.0, 1e-4)
	# tower cab position sits at the tower (a=721, c=262) above GROUND_M
	var tp := RP.tower_cab_position()
	var ne: Array = FP.rwyToNE(FP.lab_rwy(), 721.0, 262.0)
	# (tolerances absorb Vector3's float32 storage)
	_num("tower.x", tp.x, float(ne[1]) + 40000.0, 1e-2)
	_num("tower.z", tp.z, -float(ne[0]), 1e-2)
	_num("tower.y", tp.y, FP.GROUND_M + 18.7, 1e-4)
	_end()

# ---------------------------------------------------------------- cameras
func _test_cameras() -> void:
	_begin("camera")
	var ac := Node3D.new()
	var cam := Camera3D.new()
	if root != null:
		root.add_child(ac)
		root.add_child(cam)
	# NOTE: during a SceneTree script's _init the nodes are not inside the
	# tree yet, so global_* accessors are unavailable; frame_camera works
	# on local transforms in that case and the root sits at the origin, so
	# transform == global transform here.
	var apos := Vector3(41000.0, 120.0, -300.0)
	ac.transform = Transform3D(Basis.IDENTITY, apos)
	var tower := Vector3(40500.0, FP.GROUND_M + 18.7, 200.0)
	# tower: camera sits at the tower and its -Z faces the aircraft
	RP.frame_camera("tower", cam, ac, tower)
	_num("tower.cam_x", cam.transform.origin.x, tower.x, 1e-4)
	_num("tower.cam_y", cam.transform.origin.y, tower.y, 1e-4)
	_num("tower.cam_z", cam.transform.origin.z, tower.z, 1e-4)
	var fwd := -cam.transform.basis.z.normalized()
	var dir := (apos - tower).normalized()
	_check("tower.look_dot", fwd.dot(dir) > 0.99, "dot=" + str(fwd.dot(dir)))
	# chase: behind the aircraft (nose = -Z, so behind is +Z), looking forward
	RP.frame_camera("chase", cam, ac, tower)
	_num("chase.offset_z", cam.transform.origin.z - apos.z, 10.5, 1e-4)
	_num("chase.offset_y", cam.transform.origin.y - apos.y, 2.6, 1e-4)
	var cfwd := -cam.transform.basis.z.normalized()
	_check("chase.look_fwd", cfwd.dot(Vector3(0, 0, -1)) > 0.99, "dot=" + str(cfwd.dot(Vector3(0, 0, -1))))
	# wing: at the right wingtip, looking forward
	RP.frame_camera("wing", cam, ac, tower)
	_num("wing.offset_x", cam.transform.origin.x - apos.x, 5.5, 1e-4)
	var wfwd := -cam.transform.basis.z.normalized()
	_check("wing.look_fwd", wfwd.dot(Vector3(0, 0, -1)) > 0.99, "dot=" + str(wfwd.dot(Vector3(0, 0, -1))))
	ac.free()
	cam.free()
	_end()

# ---------------------------------------------------------------- profile graph
func _test_profile() -> void:
	_begin("profile")
	var xs: Array = [
		{"t": 0.0, "alt": 55.0, "ias": 0.0, "onGround": true},
		{"t": 1.0, "alt": 55.0, "ias": 20.0, "onGround": true},
		{"t": 2.0, "alt": 200.0, "ias": 60.0, "onGround": false},
		{"t": 3.0, "alt": 800.0, "ias": 110.0, "onGround": false},
		{"t": 4.0, "alt": 300.0, "ias": 70.0, "onGround": false},
		{"t": 5.0, "alt": 55.0, "ias": 0.0, "onGround": true},
	]
	var st := PG.series_stats(xs)
	_num("t_max", float(st["t_max"]), 5.0, 0.0)
	_num("alt_min", float(st["alt_min"]), 55.0, 0.0)
	_num("alt_max", float(st["alt_max"]), 800.0, 0.0)
	_num("ias_max", float(st["ias_max"]), 110.0, 0.0)
	_num("touchdown_t", float(st["touchdown_t"]), 5.0, 0.0)
	# never airborne -> no touchdown
	var gnd: Array = [
		{"t": 0.0, "alt": 55.0, "ias": 0.0, "onGround": true},
		{"t": 1.0, "alt": 55.0, "ias": 5.0, "onGround": true},
	]
	_num("td.none_ground", float(PG.series_stats(gnd)["touchdown_t"]), -1.0, 0.0)
	# airborne and never lands -> no touchdown
	var air: Array = [
		{"t": 0.0, "alt": 55.0, "ias": 0.0, "onGround": true},
		{"t": 1.0, "alt": 500.0, "ias": 90.0, "onGround": false},
	]
	_num("td.none_air", float(PG.series_stats(air)["touchdown_t"]), -1.0, 0.0)
	# empty
	var e0 := PG.series_stats([])
	_num("empty.td", float(e0["touchdown_t"]), -1.0, 0.0)
	_num("empty.t_max", float(e0["t_max"]), 0.0, 0.0)
	# instance API does not crash and keeps the samples
	var g := PG.new()
	g.set_samples(xs)
	_check("instance.count", g.samples().size() == 6)
	_num("instance.ias_max", float(g.stats()["ias_max"]), 110.0, 0.0)
	_end()

# ---------------------------------------------------------------- replay player
func _test_player() -> void:
	_begin("player")
	var rp = RP.new()
	var node := Node3D.new()
	if root != null:
		root.add_child(node)
	rp.load_samples(_mk_samples())
	_num("duration", rp.duration, 2.0, 0.0)
	_check("count", rp.sample_count() == 2)
	rp.seek(1.0)
	_num("seek.t", rp.current_time(), 1.0, 0.0)
	var s := rp.update_playback(0.0, node)
	_num("pose.n_via_world_z", node.position.z, -50.0, 1e-4)
	_num("pose.world_x", node.position.x, 40025.0, 1e-4)
	_num("pose.world_y", node.position.y, 105.0 / FP.FT, 1e-4)
	_num("pose.sample_n", float(s["n"]), 50.0, 1e-6)
	# attitude applied: 45° yaw about Y
	var bf := -node.basis.z
	_num("pose.fwd_x", bf.x, -sin(deg_to_rad(45.0)), 1e-4)
	_num("pose.fwd_z", bf.z, -cos(deg_to_rad(45.0)), 1e-4)
	# playback advances and auto-pauses at the end
	rp.set_playing(true)
	_check("playing", rp.is_playing())
	rp.update_playback(0.5, node)
	_num("adv.t", rp.current_time(), 1.5, 1e-9)
	rp.update_playback(10.0, node)
	_num("adv.end_t", rp.current_time(), 2.0, 0.0)
	_check("adv.end_paused", not rp.is_playing())
	# seek clamps
	rp.seek(-3.0)
	_num("seek.clamp_lo", rp.current_time(), 0.0, 0.0)
	rp.seek(99.0)
	_num("seek.clamp_hi", rp.current_time(), 2.0, 0.0)
	node.free()
	_end()
