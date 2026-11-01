extends SceneTree

## CADET Godot port — Phase 4 (項目0) テストランナー
## 使い方: godot --headless --path <project> -s test/run_p4scene.gd
## src/dialog_ui.gd (DialogUI + DrillCore) / src/npc_build.gd /
## src/interior_build.gd / src/walk_physics.gd を実 content.json で検証する。
## 終了コード: 0 = 全合格, 1 = 不合格あり。

const DUI = preload("res://src/dialog_ui.gd")
const NpcB = preload("res://src/npc_build.gd")
const IntB = preload("res://src/interior_build.gd")
const WalkP = preload("res://src/walk_physics.gd")
const WB = preload("res://src/world_build.gd")
const DialogEng = preload("res://src/dialog_engine.gd")
const Career = preload("res://src/career.gd")

var failures := 0
var checks := 0
var _dlg_finished := false

func _fail(label: String, msg: String) -> void:
	failures += 1
	if failures <= 40:
		print("FAIL %s: %s" % [label, msg])

func _chk(cond: bool, label: String) -> void:
	checks += 1
	if not cond:
		_fail(label, "check failed")

func _load_json(p: String):
	var f = FileAccess.open(p, FileAccess.READ)
	if f == null:
		return null
	var parsed = JSON.parse_string(f.get_as_text())
	f.close()
	return parsed

func _init() -> void:
	var C = _load_json("res://data/content.json")
	if C == null:
		print("content.json missing")
		quit(1)
		return
	_test_dialog(C)
	_test_drills()
	_test_npcs(C)
	_test_interiors_and_walk(C)
	print("== Phase 4 scene total: " + str(checks) + " checks, " + str(failures) + " failures")
	quit(1 if failures > 0 else 0)

# ---------------------------------------------------------------- (1) DialogUI
func _test_dialog(C) -> void:
	_dlg_finished = false
	var ui = DUI.new()
	root.add_child(ui)
	var state: Dictionary = DialogEng.create_dialog_state()
	ui.setup(C["dialogs"]["day1"]["all"], state, func() -> Dictionary: return {}, func() -> void: _dlg_finished = true)
	_chk(ui.start_dialog("transit"), "dialog start transit")
	var v: Dictionary = ui.current_view()
	_chk(bool(v.get("running", false)), "dialog running")
	_chk(String(v.get("text", "")) != "", "dialog first text non-empty")
	_chk(String(v.get("name", "")) == "早瀬 教官", "dialog speaker name (got %s)" % String(v.get("name", "")))
	_chk((v.get("choices", []) as Array).size() == 2, "dialog first choices = 2")
	var guard := 0
	while ui.is_running() and guard < 30:
		guard += 1
		var vv: Dictionary = ui.current_view()
		if (vv.get("choices", []) as Array).size() > 0:
			ui.choose(0)
		else:
			ui.advance()
	_chk(not ui.is_running(), "dialog reached end")
	_chk(_dlg_finished, "dialog on_finish called")
	_chk(not bool(ui.current_view().get("running", true)), "dialog final view not running")
	# DayRadio パネル整形
	var panel: String = DUI.radio_panel_text({})
	_chk(panel.contains("LAB information"), "radio panel has ATIS text")
	_chk(panel.contains("127.65"), "radio panel has ATIS freq")
	_chk(panel.contains("29.92"), "radio panel has default QNH")
	_chk(panel.contains("gnd_call"), "radio panel lists exchanges")
	ui.queue_free()

# ---------------------------------------------------------------- (2) DrillCore
func _test_drills() -> void:
	for id in ["k1", "k2", "k3", "k4", "k5", "k6"]:
		var d = DUI.DrillCore.new()
		var q: Dictionary = d.start(id, 7)
		_chk(not q.is_empty() and not q.has("error"), "drill %s starts" % id)
		_chk(int(q.get("total", 0)) == 10, "drill %s total = 10 (got %s)" % [id, str(q.get("total"))])
		var last := {}
		var guard := 0
		while not q.is_empty() and guard < 15:
			guard += 1
			_chk((q.get("choices", []) as Array).size() >= 1, "drill %s q%d has choices" % [id, guard])
			_chk(int(q.get("correct", -1)) >= 0 and int(q.get("correct", -1)) < (q.get("choices", []) as Array).size(),
				"drill %s q%d correct index in range" % [id, guard])
			last = d.answer(int(q.get("correct", 0)))
			_chk(bool(last.get("correct", false)), "drill %s q%d correct answer accepted" % [id, guard])
			if bool(last.get("done", false)):
				break
			q = last.get("next", {})
		_chk(bool(last.get("done", false)), "drill %s done" % id)
		_chk(int(last.get("score", 0)) == 10, "drill %s score 10 (got %s)" % [id, str(last.get("score"))])
		_chk(bool(last.get("passed", false)), "drill %s passed" % id)
		_chk(str(last.get("growth", [])) == str(Career.ftd_growth(id)), "drill %s growth pair = ftd_growth" % id)
		var res: Dictionary = d.result()
		_chk(bool(res.get("passed", false)) and int(res.get("total", 0)) == 10, "drill %s result()" % id)
	# 不正解なら合格しないことも確認 (k3)
	var d2 = DUI.DrillCore.new()
	var q2: Dictionary = d2.start("k3", 3)
	var last2 := {}
	var g2 := 0
	while not q2.is_empty() and g2 < 15:
		g2 += 1
		var wrong := (int(q2.get("correct", 0)) + 1) % (q2.get("choices", []) as Array).size()
		last2 = d2.answer(wrong)
		if bool(last2.get("done", false)):
			break
		q2 = last2.get("next", {})
	_chk(bool(last2.get("done", false)) and not bool(last2.get("passed", true)), "drill k3 all-wrong fails")

# ---------------------------------------------------------------- (3) NPC 配置
func _test_npcs(C) -> void:
	var pls: Array = NpcB.placements(C)
	_chk(pls.size() == 9, "npc default placements = 9 (got %d)" % pls.size())
	var places: Dictionary = C["people"]["PLACES"]
	var seen := {}
	for pl in pls:
		seen[String(pl["who"])] = true
		var key := String(pl["place"])
		if places.has(key):
			var src: Dictionary = places[key]
			var want: Vector3 = WB.rwy_to_world(float(src["a"]), float(src["c"]), float(src.get("y", 0.0)))
			_chk((pl["pos"] as Vector3).distance_to(want) < 0.001, "npc %s pos == rwy_to_world(%s)" % [String(pl["who"]), key])
			_chk(is_equal_approx(float(pl["a"]), float(src["a"])) and is_equal_approx(float(pl["c"]), float(src["c"])), "npc %s a/c match PLACES" % String(pl["who"]))
	for who in ["instructor", "chief", "lecturer", "dispatcher", "mechanic", "controller", "kiryu", "asahi", "mori"]:
		_chk(seen.has(who), "npc placed: " + who)
	_chk(not seen.has("examiner"), "npc examiner absent by default (placeOf = null)")
	# 夕方は同期が寮の談話室、審査官は ch6 の審査のときだけ
	var eve: Array = NpcB.placements(C, { "slot": "evening", "chapter": "ch2", "what": [] })
	_chk(eve.size() == 4, "npc evening placements = instructor + 3 peers (got %d)" % eve.size())
	var ex: Array = NpcB.placements(C, { "slot": "am", "chapter": "ch6", "what": [{ "kind": "checkride", "slot": "am" }] })
	# ch6 では講師は placeOf が null (原典どおり不在) で、代わりに審査官が加わり合計 9
	_chk(ex.size() == 9 and ex.any(func(p): return String(p["who"]) == "examiner"), "npc ch6 checkride placements = 9 incl examiner (got %d)" % ex.size())
	# 構築: ノード数と座り判定
	var holder := Node3D.new()
	root.add_child(holder)
	var npcs: Node3D = NpcB.build_npcs(holder, C)
	_chk(npcs.name == "NPCs", "npc root name")
	_chk(npcs.get_child_count() == pls.size(), "npc node count == placements")
	var disp = npcs.get_node_or_null("NPC_dispatcher")
	_chk(disp != null and disp.get_node_or_null("Legs") != null, "npc dispatcher seated (dispatchSeat)")
	var mech = npcs.get_node_or_null("NPC_mechanic")
	_chk(mech != null and mech.get_node_or_null("Legs") == null, "npc mechanic standing (apron)")
	var tw = npcs.get_node_or_null("NPC_controller")
	_chk(tw != null and is_equal_approx((tw as Node3D).position.y, (pls.filter(func(p): return String(p["who"]) == "controller")[0]["pos"] as Vector3).y), "npc controller at cab height")
	holder.queue_free()

# ---------------------------------------------------------------- (4) 内装 + 歩行
func _test_interiors_and_walk(C) -> void:
	var holder := Node3D.new()
	root.add_child(holder)
	var interiors: Node3D = IntB.build_interiors(holder, C)
	_chk(interiors.name == "Interiors", "interiors root name")
	var walls: Array = IntB.wall_boxes()
	_chk(walls.size() >= 20, "interior walls >= 20 (got %d)" % walls.size())
	_chk(IntB.furniture_count() >= 200, "interior furniture >= 200 (got %d)" % IntB.furniture_count())
	_chk(interiors.get_node_or_null("Walls") != null and interiors.get_node_or_null("TowerStairs") != null, "interiors groups exist")
	var steps: Array = IntB.stair_steps()
	_chk(steps.size() == 67, "tower steps = 60 + 7 landings (got %d)" % steps.size())
	var flat = WalkP.make_floor_fn([], 0.0)
	# ドア開口 (d-brief-1: c=261, a 642.6..643.6) は通れる
	var r1: Dictionary = WalkP.move(Vector3(643.1, 0.0, 259.5), Vector2(0, 1), 0.5, 3.0, walls, flat)
	_chk(not bool(r1.get("blocked", true)), "walk through door opening not blocked")
	_chk((r1["pos"] as Vector3).z > 260.9, "walk through door advanced (c=%s)" % str((r1["pos"] as Vector3).z))
	# その横の壁では妨げられる
	var r2: Dictionary = WalkP.move(Vector3(640.0, 0.0, 259.5), Vector2(0, 1), 0.5, 3.0, walls, flat)
	_chk(bool(r2.get("blocked_c", false)), "walk beside door blocked by wall")
	_chk((r2["pos"] as Vector3).z < 260.0, "walk beside door stayed (c=%s)" % str((r2["pos"] as Vector3).z))
	# a 方向の壁 (合成) でも妨げられる
	var wall_a := [{ "a0": 4.94, "a1": 5.06, "c0": -5.0, "c1": 5.0, "floor_y": 0.0, "height": 3.0 }]
	var r3: Dictionary = WalkP.move(Vector3(4.0, 0.0, 0.0), Vector2(1, 0), 0.5, 2.0, wall_a, flat)
	_chk(bool(r3.get("blocked_a", false)) and is_equal_approx((r3["pos"] as Vector3).x, 4.0), "walk blocked on a axis")
	# 段差: 0.45 以下は登る、超えると止まる
	var step40 = func(a: float, _c: float, _up: float) -> float: return 0.4 if a > 10.0 else 0.0
	var r4: Dictionary = WalkP.move(Vector3(9.5, 0.0, 0.0), Vector2(1, 0), 1.0, 1.0, [], step40)
	_chk(not bool(r4.get("blocked", true)) and is_equal_approx((r4["pos"] as Vector3).y, 0.4), "walk steps up 0.4 m")
	var step100 = func(a: float, _c: float, _up: float) -> float: return 1.0 if a > 10.0 else 0.0
	var r5: Dictionary = WalkP.move(Vector3(9.5, 0.0, 0.0), Vector2(1, 0), 1.0, 1.0, [], step100)
	_chk(bool(r5.get("blocked_a", false)) and is_equal_approx((r5["pos"] as Vector3).x, 9.5), "walk stopped by 1.0 m step")
	# 塔の階段を実際に登る (1 便目: +c 方向)
	var stair_floor = WalkP.make_floor_fn(steps, 0.0)
	var pos := Vector3(719.9, 0.0, 260.3)
	_chk(is_equal_approx(WalkP.ground_at(pos.x, pos.z, 0.0, steps, 0.0), 0.0), "stair bottom floor 0")
	for i in range(22):
		var rr: Dictionary = WalkP.move(pos, Vector2(0, 1), 0.1, 1.5, [], stair_floor)
		pos = rr["pos"]
	_chk(pos.y > 2.5, "stair climbed first flight (up=%s)" % str(pos.y))
	_chk(pos.z > 263.2, "stair reached high landing (c=%s)" % str(pos.z))
	holder.queue_free()
