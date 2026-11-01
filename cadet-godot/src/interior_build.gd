class_name InteriorBuild
extends RefCounted

## CADET Godot port — Phase 4 (項目0c): 内装 (内壁・家具・塔の階段・格納庫)。
## 原典: cadet/src/content/academy-spec.js / dorm-spec.js / tower-spec.js /
## hangar-spec.js (data/content.json に抽出済み) と world/buildings.js の壁の考え方。
## すべてデータ駆動: 部屋の隣接と doors の開口から内壁を割り、家具は spec の
## furniture 一覧 (type / a / c / rot / yOff) を基礎形状で置く。手置きはしない。
##
## API (確定):
##   build_interiors(parent, content) -> Node3D "Interiors"
##     子: "Walls" / "Furniture" / "TowerStairs" / "Hangar" の各グループ。
##   wall_boxes() -> Array of { a0, a1, c0, c1, floor_y, height }
##     build_interiors() の後に有効 (runway frame、walk_physics.gd の walls 形式)。
##     開口は doors のうち locked 以外 (swing / double_swing / opening /
##     sliding_auto)。locked は壁が続く (原典でも施錠されて通れない)。
##   stair_steps() -> Array of { a0, a1, c0, c1, top }
##     塔シャフト内階段の段と踊り場 (walk_physics.make_floor_fn に渡せる)。
##   furniture_count() -> int  置いた家具の数 (検証用)。

const WB = preload("res://src/world_build.gd")

const WALL_T := 0.12 # 内壁の厚さ (m)

# furniture type → [a 方向の大きさ, 高さ, c 方向の大きさ] (m)。無い type は既定値。
const FURN_SIZE := {
	"table_long": [3.2, 0.75, 1.1], "desk": [1.4, 0.75, 0.7], "office_chair": [0.55, 0.9, 0.55],
	"bed": [2.0, 0.55, 1.0], "sofa": [1.9, 0.85, 0.85], "coffee_table": [1.1, 0.4, 0.6],
	"bookshelf": [1.2, 1.8, 0.35], "whiteboard": [2.0, 1.2, 0.08], "wall_screen": [1.6, 1.0, 0.08],
	"map_wall": [1.8, 1.3, 0.08], "wall_clock": [0.4, 0.4, 0.08], "bulletin_board": [1.4, 1.0, 0.08],
	"sign_board": [1.0, 0.7, 0.08], "flight_status_board": [2.2, 1.1, 0.08], "exit_sign": [0.5, 0.25, 0.08],
	"sim_station": [1.6, 1.1, 0.9], "counter": [2.4, 1.05, 0.7], "reception_desk": [2.4, 1.05, 0.8],
	"bench": [1.6, 0.45, 0.45], "stool": [0.4, 0.5, 0.4], "locker_bank": [1.8, 1.9, 0.5],
	"wardrobe": [1.2, 1.9, 0.6], "fridge": [0.7, 1.7, 0.65], "vending_machine": [1.0, 1.85, 0.7],
	"coffee_machine": [0.6, 0.5, 0.5], "washing_machine": [0.65, 0.9, 0.65], "shower_booth": [0.9, 2.0, 0.9],
	"kitchen_counter": [2.0, 0.9, 0.65], "atc_console": [1.8, 1.1, 0.8], "plant": [0.4, 0.6, 0.4],
	"model_aircraft_stand": [0.9, 1.0, 0.5], "printer": [0.55, 0.35, 0.45], "headset_rack": [0.8, 1.2, 0.3],
	"kneeboard_shelf": [1.0, 1.2, 0.35], "water_cooler": [0.4, 1.1, 0.4], "flag_stand": [0.4, 1.6, 0.4],
	"umbrella_stand": [0.35, 0.6, 0.35], "trash_bin": [0.35, 0.5, 0.35], "paper_stack": [0.35, 0.12, 0.35],
	"cup": [0.12, 0.1, 0.12], "bag": [0.45, 0.4, 0.3],
}
const FURN_DEFAULT := [0.6, 0.8, 0.6]

static var _walls: Array = []
static var _stairs: Array = []
static var _furn_count := 0
static var _mats: Dictionary = {}

static func _mat(color: Color, rough: float = 0.9) -> StandardMaterial3D:
	var key := str(color) + "|" + str(rough)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	_mats[key] = m
	return m

# runway frame の箱 (world_build._box と同じ規約: BoxMesh の x = c 幅, z = a 幅)
static func _box(parent: Node3D, name_: String, a0: float, a1: float, c0: float, c1: float, y0: float, y1: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = name_
	var bm := BoxMesh.new()
	bm.size = Vector3(maxf(absf(c1 - c0), 0.02), maxf(absf(y1 - y0), 0.02), maxf(absf(a1 - a0), 0.02))
	mi.mesh = bm
	mi.material_override = mat
	mi.position = WB.rwy_to_world((a0 + a1) / 2.0, (c0 + c1) / 2.0, (y0 + y1) / 2.0)
	mi.rotation.y = WB.frame_yaw()
	parent.add_child(mi)
	return mi

static func _room_floor(r: Dictionary) -> float:
	return float(r.get("floorY", 0.0))

static func _room_height(r: Dictionary) -> float:
	var fy := _room_floor(r)
	var ceil_v = r.get("ceiling", null)
	if (typeof(ceil_v) == TYPE_INT or typeof(ceil_v) == TYPE_FLOAT) and float(ceil_v) > fy + 0.5:
		return float(ceil_v) - fy
	return 3.0

# doors の開口を引いた残りの区間 ([lo, hi] から spans を引く)
static func _subtract(lo: float, hi: float, spans: Array) -> Array:
	var segs: Array = [[lo, hi]]
	for sp in spans:
		var nxt: Array = []
		for sg in segs:
			var s0 := float(sg[0])
			var s1 := float(sg[1])
			if float(sp[1]) <= s0 or float(sp[0]) >= s1:
				nxt.append([s0, s1])
				continue
			if float(sp[0]) > s0:
				nxt.append([s0, float(sp[0])])
			if float(sp[1]) < s1:
				nxt.append([float(sp[1]), s1])
		segs = nxt
	return segs

## 部屋の隣接 + doors から内壁 (AABB) を割り出す純粋計算。build と検証の両方から使う。
static func compute_wall_boxes(content: Dictionary) -> Array:
	var walls: Array = []
	for sect_key in ["academy", "dorm"]:
		var spec: Dictionary = content.get(sect_key, {})
		var rooms: Array = spec.get("rooms", [])
		var doors: Array = spec.get("doors", [])
		for i in range(rooms.size()):
			for j in range(i + 1, rooms.size()):
				var r1: Dictionary = rooms[i]
				var r2: Dictionary = rooms[j]
				var fy1 := _room_floor(r1)
				var fy2 := _room_floor(r2)
				if absf(fy1 - fy2) > 0.1:
					continue # 階が違う部屋同士は内壁を作らない (上下の重なり)
				var wall_kind := ""
				var at := 0.0
				var lo := 0.0
				var hi := 0.0
				if absf(float(r1["c1"]) - float(r2["c0"])) < 0.06 or absf(float(r2["c1"]) - float(r1["c0"])) < 0.06:
					wall_kind = "c"
					at = float(r1["c1"]) if absf(float(r1["c1"]) - float(r2["c0"])) < 0.06 else float(r2["c1"])
					lo = maxf(float(r1["a0"]), float(r2["a0"]))
					hi = minf(float(r1["a1"]), float(r2["a1"]))
				elif absf(float(r1["a1"]) - float(r2["a0"])) < 0.06 or absf(float(r2["a1"]) - float(r1["a0"])) < 0.06:
					wall_kind = "a"
					at = float(r1["a1"]) if absf(float(r1["a1"]) - float(r2["a0"])) < 0.06 else float(r2["a1"])
					lo = maxf(float(r1["c0"]), float(r2["c0"]))
					hi = minf(float(r1["c1"]), float(r2["c1"]))
				if wall_kind.is_empty() or hi - lo < 0.3:
					continue
				var spans: Array = []
				for d in doors:
					if String(d.get("kind", "")) == "locked":
						continue
					if String(d.get("wall", "")) != wall_kind:
						continue
					if absf(float(d.get("at", -9999.0)) - at) > 0.06:
						continue
					var drooms: Array = d.get("rooms", [])
					if not drooms.has(String(r1["id"])) or not drooms.has(String(r2["id"])):
						continue
					if absf(float(d.get("y", fy1)) - fy1) > 0.6:
						continue
					spans.append([minf(float(d["from"]), float(d["to"])), maxf(float(d["from"]), float(d["to"]))])
				var height := minf(_room_height(r1), _room_height(r2))
				for sg in _subtract(lo, hi, spans):
					if float(sg[1]) - float(sg[0]) < 0.05:
						continue
					if wall_kind == "c":
						walls.append({ "a0": float(sg[0]), "a1": float(sg[1]), "c0": at - WALL_T / 2.0, "c1": at + WALL_T / 2.0, "floor_y": fy1, "height": height })
					else:
						walls.append({ "a0": at - WALL_T / 2.0, "a1": at + WALL_T / 2.0, "c0": float(sg[0]), "c1": float(sg[1]), "floor_y": fy1, "height": height })
	return walls

## 塔シャフト (tower spec: a 718.85..723.15, c 259.85..264.15) の折り返し階段。
## 6 往復・各 10 段で 0 → 17.2 m (cabFloor)。1 段の高さ 17.2/60 ≈ 0.287 m で
## walk_physics の STEP_MAX (0.45) 以内。偶数便は +c 方向、奇数便は -c 方向へ上がる。
static func compute_tower_steps(content: Dictionary) -> Array:
	var rooms: Array = content.get("tower", {}).get("rooms", [])
	var shaft := { "a0": 718.85, "a1": 723.15, "c0": 259.85, "c1": 264.15 }
	for r in rooms:
		if String(r.get("id", "")) == "tower-stairs":
			shaft = { "a0": float(r["a0"]), "a1": float(r["a1"]), "c0": float(r["c0"]), "c1": float(r["c1"]) }
	var top := 17.2
	for r in rooms:
		if String(r.get("id", "")) == "tower-cab":
			top = float(r.get("floorY", 17.2))
	var flights := 6
	var per := 10
	var rise := top / float(flights * per)
	var a_lo := float(shaft["a0"]) + 0.10
	var a_hi := float(shaft["a1"]) - 0.10
	var run0 := [a_lo, a_lo + 1.9]          # 偶数便の a 範囲
	var run1 := [a_hi - 1.9, a_hi]          # 奇数便の a 範囲
	var land_lo := [float(shaft["c0"]) + 0.05, float(shaft["c0"]) + 0.80]
	var land_hi := [float(shaft["c1"]) - 0.80, float(shaft["c1"]) - 0.05]
	var run_c0: float = float(land_lo[1])
	var run_c1: float = float(land_hi[0])
	var tread: float = (run_c1 - run_c0) / float(per)
	var steps: Array = []
	for f in range(flights):
		var base := float(f) * float(per) * rise
		var run: Array = run0 if f % 2 == 0 else run1
		for i in range(per):
			var t := base + float(i + 1) * rise
			var cc0: float
			var cc1: float
			if f % 2 == 0:
				cc0 = run_c0 + float(i) * tread
				cc1 = cc0 + tread
			else:
				cc1 = run_c1 - float(i) * tread
				cc0 = cc1 - tread
			steps.append({ "a0": float(run[0]), "a1": float(run[1]), "c0": cc0, "c1": cc1, "top": t })
	# 踊り場: 各レベルの端 (偶数レベル = 低い側, 奇数レベル = 高い側)
	for lv in range(flights + 1):
		var lt := float(lv) * float(per) * rise
		var lc: Array = land_lo if lv % 2 == 0 else land_hi
		steps.append({ "a0": a_lo, "a1": a_hi, "c0": float(lc[0]), "c1": float(lc[1]), "top": lt })
	return steps

static func build_interiors(parent: Node, content: Dictionary) -> Node3D:
	var root := Node3D.new()
	root.name = "Interiors"
	if parent != null:
		parent.add_child(root)
	_walls = compute_wall_boxes(content)
	_stairs = compute_tower_steps(content)
	_furn_count = 0
	# ---- 内壁
	var wall_grp := Node3D.new()
	wall_grp.name = "Walls"
	root.add_child(wall_grp)
	var wall_mat := _mat(Color(0.93, 0.91, 0.87))
	for i in range(_walls.size()):
		var w: Dictionary = _walls[i]
		_box(wall_grp, "Wall_%d" % i, float(w["a0"]), float(w["a1"]), float(w["c0"]), float(w["c1"]),
			float(w["floor_y"]), float(w["floor_y"]) + float(w["height"]), wall_mat)
	# ---- 家具 (academy / dorm / tower の spec の furniture 一覧をそのまま置く)
	var furn_grp := Node3D.new()
	furn_grp.name = "Furniture"
	root.add_child(furn_grp)
	var furn_mat := _mat(Color(0.55, 0.48, 0.40))
	var furn_mat2 := _mat(Color(0.42, 0.46, 0.52))
	for sect_key in ["academy", "dorm", "tower"]:
		var spec: Dictionary = content.get(sect_key, {})
		for room in spec.get("rooms", []):
			var fy := _room_floor(room)
			for f in room.get("furniture", []):
				var typ := String(f.get("type", ""))
				var size: Array = FURN_SIZE.get(typ, FURN_DEFAULT)
				var wa := float(size[0])
				var hh := float(size[1])
				var wc := float(size[2])
				var rot := int(f.get("rot", 0)) % 180
				if rot == 90:
					var tmp := wa
					wa = wc
					wc = tmp
				var yoff := float(f.get("yOff", 0.0))
				var fa := float(f.get("a", 0.0))
				var fc := float(f.get("c", 0.0))
				_box(furn_grp, "Furn_%s_%d" % [typ, _furn_count], fa - wa / 2.0, fa + wa / 2.0,
					fc - wc / 2.0, fc + wc / 2.0, fy + yoff, fy + yoff + hh,
					furn_mat if _furn_count % 2 == 0 else furn_mat2)
				_furn_count += 1
	# ---- 塔の階段
	var stair_grp := Node3D.new()
	stair_grp.name = "TowerStairs"
	root.add_child(stair_grp)
	var stair_mat := _mat(Color(0.62, 0.63, 0.65), 0.85)
	for i in range(_stairs.size()):
		var s: Dictionary = _stairs[i]
		_box(stair_grp, "Step_%d" % i, float(s["a0"]), float(s["a1"]), float(s["c0"]), float(s["c1"]),
			float(s["top"]) - 0.28, float(s["top"]), stair_mat)
	# ---- 格納庫: 作業台・棚 (hangar spec の interactables の位置に)
	var hg_grp := Node3D.new()
	hg_grp.name = "Hangar"
	root.add_child(hg_grp)
	var bench_mat := _mat(Color(0.45, 0.38, 0.30))
	var shelf_mat := _mat(Color(0.50, 0.52, 0.55), 0.6)
	for area in content.get("hangar", {}).get("areas", []):
		for it in area.get("interactables", []):
			var iid := String(it.get("id", ""))
			var ia := float(it.get("a", 0.0))
			var ic := float(it.get("c", 0.0))
			if iid.contains("bench"):
				_box(hg_grp, "Workbench_" + iid, ia - 1.1, ia + 1.1, ic - 0.4, ic + 0.4, 0.0, 0.9, bench_mat)
				_furn_count += 1
			elif iid.contains("shelf") or iid.contains("tools"):
				_box(hg_grp, "Shelf_" + iid, ia - 1.2, ia + 1.2, ic - 0.3, ic + 0.3, 0.0, 2.0, shelf_mat)
				_furn_count += 1
	return root

static func wall_boxes() -> Array:
	return _walls.duplicate()

static func stair_steps() -> Array:
	return _stairs.duplicate()

static func furniture_count() -> int:
	return _furn_count
