extends SceneTree

## CADET Godot port — Phase 3 (world / traffic / aircraft-select) 検証ランナー
## 使い方: godot --headless --path <project> -s test/run_world.gd
##  1) traffic 同値: tools/gen_reference3c.mjs が生成した参照値 (JS 原典
##     cadet/src/flight/traffic.js) と src/traffic.gd (CadetTraffic) を照合。
##  2) world 構造検証: src/world_build.gd の生成物が layout.js / 各 spec の
##     座標・寸法・部屋数と一致することを確認 (描画ではなく構造)。
##  3) aircraft_select: Seminole / Archer のロードと三角形数等の構造検証。
## 終了コード: 0 = 全合格, 1 = 不合格あり。

const WB = preload("res://src/world_build.gd")
const AS = preload("res://src/aircraft_select.gd")

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

func _check(label: String, ok: bool, detail: String = "") -> void:
	checks += 1
	group_checks += 1
	if not ok:
		_fail(label, detail)

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
	var R = _load_json("res://test/reference3c.json")
	if R == null:
		print("reference3c JSON missing — run tools/gen_reference3c.mjs first")
		quit(1)
		return
	_test_traffic_gates(R)
	_test_circuit(R)
	_test_runs(R)
	_test_world()
	_test_aircraft()
	print("== Phase 3 (world) total: " + str(checks) + " checks, " + str(failures) + " failures, max_err " + str(max_err) + " (" + max_err_label + ")")
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- traffic: day gates
func _test_traffic_gates(R) -> void:
	_begin_group("traffic-day-gates")
	_deep("TRAFFIC_CALLS", CadetTraffic.TRAFFIC_CALLS, R["calls"], 0.0, 0.0)
	_deep("TRAFFIC_TWIN", CadetTraffic.TRAFFIC_TWIN, R["twinCall"], 0.0, 0.0)
	for c in R["day"]:
		var got: int = CadetTraffic.traffic_for_day({"seed": int(float(c["seed"])), "kind": c["kind"], "chapter": c["chapter"], "weather": c["weather"], "slot": c["slot"]})
		_deep("trafficForDay(%s,%s,%s,%s,%s)" % [c["seed"], c["kind"], c["chapter"], c["weather"], c["slot"]], got, c["out"], 0.0, 0.0)
	for c in R["twin"]:
		var got: int = CadetTraffic.traffic_for_twin_day({"seed": int(float(c["seed"])), "kind": c["kind"], "chapter": c["chapter"], "weather": c["weather"], "slot": c["slot"]})
		_deep("trafficForTwinDay(%s,%s,%s,%s,%s)" % [c["seed"], c["kind"], c["chapter"], c["weather"], c["slot"]], got, c["out"], 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- traffic: circuit poses
func _test_circuit(R) -> void:
	_begin_group("traffic-circuit")
	_deep("CIRCUIT_S", CadetTraffic.circuit_s(), R["circuit"]["s"], 2e-6, 1e-6)
	for c in R["circuit"]["poses"]:
		var got: Dictionary = CadetTraffic.circuit_pose(float(c["t"]), bool(c["ga"]), {})
		_deep("circuitPose(%s,%s)" % [c["t"], c["ga"]], got, c["out"], 2e-6, 1e-6)
	_end_group()

# ---------------------------------------------------------------- traffic: full runs
func _test_runs(R) -> void:
	_begin_group("traffic-runs")
	var players: Dictionary = R["players"]
	for ri in range((R["runs"] as Array).size()):
		var run: Dictionary = R["runs"][ri]
		var sys = CadetTraffic.new()
		var events: Array = []
		var snaps: Array = []
		var step := 0
		for ph in run["phases"]:
			var opts = ph.get("opts", {})
			sys.set_traffic(int(float(ph["count"])), int(float(ph["seed"])), opts)
			var pname: String = String(ph.get("player", "none"))
			var player = null if pname == "none" else players[pname]
			var steps: int = int(float(ph["steps"]))
			for k in range(steps):
				var evs: Array = sys.update(0.5, player)
				for ev in evs:
					events.append({"step": step, "ev": ev})
				step += 1
				if k % 30 == 29 or k == steps - 1:
					snaps.append({"step": step - 1, "t": sys.t, "wake": sys.wake, "poses": sys.poses.duplicate(true)})
		_deep("run[%d].events" % ri, events, run["events"], 2e-6, 1e-6)
		_deep("run[%d].snapshots" % ri, snaps, run["snapshots"], 2e-6, 1e-6)
		_deep("run[%d].count" % ri, sys.count, run["count"], 0.0, 0.0)
	_end_group()

# ---------------------------------------------------------------- world structure
func _mi(parent: Node, path: String) -> MeshInstance3D:
	return parent.get_node_or_null(path) as MeshInstance3D

func _box_size(mi: MeshInstance3D) -> Vector3:
	if mi == null:
		return Vector3.ZERO
	var bm := mi.mesh as BoxMesh
	return bm.size if bm != null else Vector3.ZERO

func _count_prefix(parent: Node, prefix: String) -> int:
	var n := 0
	for c in parent.get_children():
		if String(c.name).begins_with(prefix):
			n += 1
	return n

func _expected_pos(a: float, c: float, up: float) -> Vector3:
	var ne: Array = FlightPhysics.rwyToNE(FlightPhysics.lab_rwy(), a, c)
	return Vector3(float(ne[1]), FlightPhysics.GROUND_M + up, -float(ne[0])) + Vector3(40000, 0, 0)

func _test_world() -> void:
	_begin_group("world-structure")
	var holder := Node3D.new()
	root.add_child(holder)
	var world: Node3D = WB.build_world(holder)
	_check("world root name", world != null and world.name == "World")
	# 地表
	var ground := _mi(world, "GroundOuter")
	_check("GroundOuter exists", ground != null)
	if ground != null:
		var gmat := ground.material_override as StandardMaterial3D
		_check("GroundOuter has grass texture", gmat != null and gmat.albedo_texture != null and gmat.albedo_texture.resource_path.ends_with("grass_c.webp"), str(gmat.albedo_texture.resource_path if gmat and gmat.albedo_texture else null))
		var gpm := ground.mesh as PlaneMesh
		_check("GroundOuter size 120000", gpm != null and gpm.size == Vector2(120000, 120000), str(gpm.size if gpm else null))
	var grass := _mi(world, "AirfieldGrass")
	_check("AirfieldGrass size = region (568 x 1720)", grass != null and _box_size(grass).is_equal_approx(Vector3(568, 0.04, 1720)), str(_box_size(grass)))
	# SITE
	var site := world.get_node_or_null("Site")
	_check("Site count 10", site != null and _count_prefix(site, "Site_") == 10, str(_count_prefix(site, "Site_") if site else -1))
	var s3 := _mi(world, "Site/Site_3_lot") # car park a 560..725, c 290..342
	_check("Site_3 (car park) size", s3 != null and _box_size(s3).is_equal_approx(Vector3(52, 0.03, 165)), str(_box_size(s3)))
	_check("Site_3 pos", s3 != null and s3.position.is_equal_approx(_expected_pos(642.5, 316.0, 0.015)), str(s3.position if s3 else null))
	# 農地 / 町
	var fields := world.get_node_or_null("Fields")
	_check("Fields count 30", fields != null and _count_prefix(fields, "Field_") == 30)
	var f00 := _mi(world, "Fields/Field_0_0")
	_check("Field_0_0 size = ground.js cell (460 x 320)", f00 != null and _box_size(f00).is_equal_approx(Vector3(460, 0.1, 320)), str(_box_size(f00)))
	var town := world.get_node_or_null("Town")
	_check("Town blocks 12", town != null and _count_prefix(town, "TownBlock_") == 12)
	var tb := _mi(world, "Town/TownBlock_0_0")
	_check("TownBlock_0_0 footprint 180x180", tb != null and absf(_box_size(tb).x - 180.0) < 0.001 and absf(_box_size(tb).z - 180.0) < 0.001, str(_box_size(tb)))
	_check("TownBlock_0_0 height in 6..18", tb != null and _box_size(tb).y >= 6.0 and _box_size(tb).y <= 18.0, str(_box_size(tb)))
	# 学園
	var ac := world.get_node_or_null("Academy")
	_check("AcademyRoom count 20 (academy-spec)", ac != null and _count_prefix(ac, "AcademyRoom_") == 20, str(_count_prefix(ac, "AcademyRoom_") if ac else -1))
	var wallw := _mi(world, "Academy/AcademyWallW")
	_check("AcademyWallW size (0.4 x 8.2 x 94)", wallw != null and _box_size(wallw).is_equal_approx(Vector3(0.4, 8.2, 94)), str(_box_size(wallw)))
	var b1 := _mi(world, "Academy/AcademyRoom_brief-1")
	_check("brief-1 floor size (12.6 x 12.4)", b1 != null and absf(_box_size(b1).x - 12.6) < 0.001 and absf(_box_size(b1).z - 12.4) < 0.001, str(_box_size(b1)))
	_check("brief-1 floor pos", b1 != null and b1.position.is_equal_approx(_expected_pos(639.8, 254.7, 0.22)), str(b1.position if b1 else null))
	var cls2 := _mi(world, "Academy/AcademyRoom_class2")
	_check("class2 floorY 4.22", cls2 != null and absf(cls2.position.y - (FlightPhysics.GROUND_M + 4.44)) < 0.001, str(cls2.position if cls2 else null))
	var roof := _mi(world, "Academy/AcademyRoom_roof")
	_check("roof floorY 8.27", roof != null and absf(roof.position.y - (FlightPhysics.GROUND_M + 8.49)) < 0.001, str(roof.position if roof else null))
	var glass := _mi(world, "Academy/AcademyLobbyGlass")
	_check("lobby glass at c=249, a 646..664, h 7.8", glass != null and _box_size(glass).is_equal_approx(Vector3(0.2, 7.8, 18)), str(_box_size(glass)))
	# 寮
	var dm := world.get_node_or_null("Dorm")
	_check("DormRoom count 11 (dorm-spec)", dm != null and _count_prefix(dm, "DormRoom_") == 11, str(_count_prefix(dm, "DormRoom_") if dm else -1))
	var dwall := _mi(world, "Dorm/DormWallW")
	_check("DormWallW size (0.4 x 7.4 x 48)", dwall != null and _box_size(dwall).is_equal_approx(Vector3(0.4, 7.4, 48)), str(_box_size(dwall)))
	var dcor := _mi(world, "Dorm/DormRoom_dorm-corridor")
	_check("dorm corridor size (2.4 x 47.2)", dcor != null and absf(_box_size(dcor).x - 2.4) < 0.001 and absf(_box_size(dcor).z - 47.2) < 0.001, str(_box_size(dcor)))
	# 管制塔
	var shaft := _mi(world, "Tower/TowerShaftWallW")
	_check("TowerShaftWallW (0.25 x 17.2 x 4.8)", shaft != null and _box_size(shaft).is_equal_approx(Vector3(0.25, 17.2, 4.8)), str(_box_size(shaft)))
	var cabf := _mi(world, "Tower/TowerCabFloor")
	_check("TowerCabFloor y = cabFloor 17.2 top", cabf != null and absf(cabf.position.y - (FlightPhysics.GROUND_M + 17.2)) < 0.001, str(cabf.position if cabf else null))
	if cabf != null:
		var cyl := cabf.mesh as CylinderMesh
		_check("TowerCabFloor radius 3.6 / h 0.4", cyl != null and absf(cyl.top_radius - 3.6) < 0.001 and absf(cyl.height - 0.4) < 0.001)
	var base := _mi(world, "Tower/TowerBaseWallW")
	_check("TowerBaseWallW (0.4 x 3.6 x 18)", base != null and _box_size(base).is_equal_approx(Vector3(0.4, 3.6, 18)), str(_box_size(base)))
	# 格納庫
	var h1f := _mi(world, "Hangars/Hangar1Floor")
	_check("Hangar1 floor (40.5 x 49.5)", h1f != null and _box_size(h1f).is_equal_approx(Vector3(40.5, 0.02, 49.5)), str(_box_size(h1f)))
	var h2w := _mi(world, "Hangars/Hangar2WallS")
	_check("Hangar2 wall h 10.5", h2w != null and absf(_box_size(h2w).y - 10.5) < 0.001, str(_box_size(h2w)))
	var h1hdr := _mi(world, "Hangars/Hangar1DoorHeader")
	_check("Hangar1 door header y0 = h-1.6", h1hdr != null and absf(h1hdr.position.y - (FlightPhysics.GROUND_M + 9.2)) < 0.001, str(h1hdr.position if h1hdr else null))
	# spec summary
	var sum: Dictionary = WB.spec_summary()
	_check("summary academyRooms 20", int(sum["academyRooms"]) == 20)
	_check("summary dormRooms 11", int(sum["dormRooms"]) == 11)
	_check("summary townBlocks 12", int(sum["townBlocks"]) == 12)
	_check("summary fieldBlocks 30", int(sum["fieldBlocks"]) == 30)
	# テクスチャ資産
	for tn in ["grass_c.webp", "grass_nr.webp", "asphalt_c.webp", "concrete_c.webp", "concrete2_c.webp", "plaster_c.webp"]:
		_check("tex exists " + tn, ResourceLoader.exists("res://assets/tex/" + tn))
	# 歩行者
	var walker: Node3D = WB.create_walker(world, 642.2, 254.6)
	_check("walker at academy start", walker.position.is_equal_approx(_expected_pos(642.2, 254.6, 0.0)), str(walker.position))
	var y0: float = walker.position.y
	WB.step_walker(walker, Vector2(0, 1), 0.0, 2.0, 3.0) # 北へ 2 s x 3 m/s = 6 m
	_check("walker moved north 6 m", absf(walker.position.z - (_expected_pos(642.2, 254.6, 0.0).z - 6.0)) < 0.001, str(walker.position))
	_check("walker y fixed at ground", absf(walker.position.y - y0) < 0.0001 and absf(y0 - FlightPhysics.GROUND_M) < 0.001, str(walker.position.y))
	var before: Vector3 = walker.position
	WB.step_walker(walker, Vector2(1, 0), 90.0, 1.0, 3.0) # 東向きの右 = 南へ 3 m
	_check("walker strafed south 3 m at yaw 90 (right = south)", absf(walker.position.z - (before.z + 3.0)) < 0.001 and absf(walker.position.x - before.x) < 0.001, str(walker.position))
	var before2: Vector3 = walker.position
	WB.step_walker(walker, Vector2(0, 1), 90.0, 1.0, 3.0) # 東向きの前 = 東へ 3 m
	_check("walker forward east 3 m at yaw 90", absf(walker.position.x - (before2.x + 3.0)) < 0.001 and absf(walker.position.z - before2.z) < 0.001, str(walker.position))
	WB.move_walker(walker, Vector3(0, 5, 0), 1.0, 3.0) # y 成分は無視される
	_check("walker move_walker ignores y", absf(walker.position.y - y0) < 0.0001, str(walker.position))
	_end_group()

# ---------------------------------------------------------------- aircraft select
func _test_aircraft() -> void:
	_begin_group("aircraft-select")
	_check("path pa28", AS.model_path("pa28") == "res://assets/archer.glb")
	_check("path pa44", AS.model_path("pa44") == "res://assets/seminole.glb")
	_check("path pa28r reuses archer", AS.model_path("pa28r") == "res://assets/archer.glb" and AS.is_reused("pa28r"))
	_check("pa28/pa44 not reused", not AS.is_reused("pa28") and not AS.is_reused("pa44"))
	# Seminole 素モデル: glb_inspect の棚卸し (16 meshes / 28,659 tris) と一致
	var semi: Node = AS.load_model("pa44")
	_check("seminole loads", semi != null)
	if semi != null:
		var st: Dictionary = AS.model_stats(semi)
		_check("seminole meshes 16", int(st["meshes"]) == 16, str(st))
		_check("seminole triangles 28659", int(st["triangles"]) == 28659, str(st))
		semi.free()
	# ビルド (マテリアル再構成込み)
	var holder := Node3D.new()
	root.add_child(holder)
	var built44: Dictionary = AS.build_aircraft("pa44", holder)
	_check("build pa44 node", built44["node"] != null)
	_check("build pa44 reg N452SY", String(built44["reg"]) == "N452SY")
	_check("build pa44 stats meshes >= 16", int(built44["stats"].get("meshes", 0)) >= 16, str(built44["stats"]))
	_check("build pa44 hidden_reg == 2", int(built44["stats"].get("hidden_reg", -1)) == 2, str(built44["stats"]))
	_check("build pa44 no_color == 0", int(built44["stats"].get("no_color", -1)) == 0, str(built44["stats"]))
	var built28: Dictionary = AS.build_aircraft("pa28", holder)
	_check("build pa28 hidden_reg == 8", int(built28["stats"].get("hidden_reg", -1)) == 8, str(built28["stats"]))
	var built28r: Dictionary = AS.build_aircraft("pa28r", holder)
	_check("build pa28r reused flag", bool(built28r["reused"]) and built28r["node"] != null)
	_check("unknown id falls back to archer", AS.model_path("zz99") == "res://assets/archer.glb")
	_end_group()
