extends RefCounted

## CADET Godot port — Phase 3: 世界・徒歩パート基礎
## 原典 (898fe8a): cadet/src/world/layout.js (ACADEMY / DORM / HANGARS / TOWER / SITE /
## region), cadet/src/world/ground.js (地表: grass テクスチャ反復・農地グリッド・道路),
## cadet/src/world/buildings.js (格納庫・管制塔シェル), content/academy-spec.js /
## dorm-spec.js / tower-spec.js / hangar-spec.js (部屋の矩形)。
##
## 目標は HTML 版同等まで (見た目の品質向上はしない)。ここでは「基礎」として:
##   - 地表: grass_c.webp を反復した外周地面 + 飛行場グラス領域 (layout.region)
##   - SITE 舗装 (walk / lot) を layout.js の矩形そのままで
##   - 農地ブロック: ground.js のフィールドグリッド (460 x 320 m, 世界軸) を
##     ハッシュで選んだ原典パレット色の平板で再現 (シェーダの代わりの基礎)
##   - 町並み基礎: HTML 版に町並みジオメトリは存在しない (遠景は ground シェーダの
##     農地+道路のみ)。基礎として滑走路北東 ~3 km に街区ブロック (街路グリッド+
##     低層ブロック) を置く。位置は本移植独自の基礎配置 (PHASE3-WORLD.md に明記)
##   - 学園棟 / 寮 / 管制塔 / 格納庫: spec・layout の座標・寸法で基礎シェル
##     (床・外壁・屋根) + 各部屋の床プレート (部屋 id 名付き)
## 座標系は airport_build.gd と同一: runway frame (along a, cross c) →
##   world Vector3(e, y, -n) + VIS_OFF, frame 回転 rotation.y = -354°
##
## 使い方 (統合側):
##   var world = WorldBuild.build_world(parent)          # parent に追加される
##   var walker = WorldBuild.create_walker(world, 642.2, 254.6)  # 学園 start (a, c)
##   WorldBuild.step_walker(walker, Vector2(right, forward), yaw_deg, delta)

const FP = preload("res://src/physics.gd")
const VIS_OFF := Vector3(40000, 0, 0)

# ---------------------------------------------------------------- layout.js の定数 (転記)
const ACADEMY := {"a0": 608.0, "a1": 702.0, "c0": 248.0, "c1": 278.0, "H": 8.2, "lob0": 646.0, "lob1": 664.0, "glassC": 249.0, "wall": 0.4, "slab": 3.8, "sill": 1.0, "head": 2.7, "doorH": 2.15}
const DORM := {"a0": 618.0, "a1": 666.0, "c0": 366.0, "c1": 390.0, "H": 7.4, "wall": 0.4, "slab": 3.6, "sill": 1.0, "head": 2.7, "doorH": 2.15}
const HANGARS := [
	{"a0": 470.0, "a1": 520.0, "c0": 241.0, "c1": 282.0, "h": 10.0, "open": true, "name": "格納庫 1"},
	{"a0": 536.0, "a1": 590.0, "c0": 241.0, "c1": 282.0, "h": 10.5, "open": true, "name": "格納庫 2（整備）"},
]
# TOWER (layout.js): base b0..b1 / c0..c1, shaft s0..s1 / sc0..sc1, cabFloor 17.2, cabCeil 20.4
const TOWER := {"a": 721.0, "c": 262.0, "b0": 712.0, "b1": 730.0, "c0": 253.0, "c1": 271.0, "baseTop": 3.6, "s0": 718.6, "s1": 723.4, "sc0": 259.6, "sc1": 264.4, "wall": 0.25, "cabFloor": 17.2, "cabCeil": 20.4, "doorH": 2.15}
# 飛行場グラス領域 (layout.js MARGIN: a -260..len+260, c -170..398)
const REGION := {"a0": -260.0, "a1": 1460.0, "c0": -170.0, "c1": 398.0}
# SITE 舗装 (layout.js SITE: [a0, a1, c0, c1, kind])
const SITE := [
	[460.0, 740.0, 230.0, 245.0, "walk"], [465.0, 735.0, 245.0, 284.0, "walk"],
	[560.0, 725.0, 284.0, 290.0, "walk"], [560.0, 725.0, 290.0, 342.0, "lot"],
	[636.0, 648.0, 342.0, 360.0, "lot"], [636.0, 648.0, 360.0, 366.0, "lot"],
	[612.0, 636.0, 360.0, 366.0, "walk"], [648.0, 672.0, 360.0, 366.0, "walk"],
	[612.0, 672.0, 366.0, 392.0, "walk"], [422.0, 447.0, 192.0, 226.0, "walk"],
]

# academy-spec.js の部屋矩形 (id, a0, a1, c0, c1, floorY)。floorY は spec の値
# (1 階は無指定 = 0, 2 階 4.22, 屋上 8.27)。
const ACADEMY_ROOMS := [
	["brief-3", 608.4, 621.0, 248.4, 261.0, 0.0], ["brief-2", 621.0, 633.6, 248.4, 261.0, 0.0],
	["brief-1", 633.6, 646.0, 248.4, 261.0, 0.0], ["corridor-s", 608.4, 646.0, 261.0, 263.6, 0.0],
	["sim", 608.4, 630.0, 263.6, 277.6, 0.0], ["wc", 630.0, 637.0, 263.6, 277.6, 0.0],
	["stairs", 637.0, 646.0, 263.6, 277.6, 0.0], ["lobby", 646.0, 664.0, 249.0, 277.6, 0.0],
	["dispatch", 664.0, 676.0, 248.4, 261.0, 0.0], ["pilot", 676.0, 688.0, 248.4, 261.0, 0.0],
	["lounge", 688.0, 701.6, 248.4, 261.0, 0.0], ["corridor-n", 664.0, 701.6, 261.0, 263.6, 0.0],
	["instructors", 664.0, 682.0, 263.6, 277.6, 0.0], ["planning", 682.0, 701.6, 263.6, 277.6, 0.0],
	["class2", 608.4, 646.0, 248.4, 261.0, 4.22], ["corridor2-s", 608.4, 646.0, 261.0, 263.6, 4.22],
	["library", 608.4, 630.0, 263.6, 277.6, 4.22], ["av", 630.0, 637.0, 263.6, 277.6, 4.22],
	["stairs2", 637.0, 646.0, 263.6, 277.6, 4.22], ["roof", 608.4, 646.0, 248.4, 277.6, 8.27],
]
# dorm-spec.js の部屋矩形 (同形式, 全て 1 階)
const DORM_ROOMS := [
	["dorm-room", 618.4, 628.4, 366.4, 376.8, 0.0], ["dorm-peer-1", 628.4, 638.4, 366.4, 376.8, 0.0],
	["dorm-entrance", 638.4, 648.4, 366.4, 376.8, 0.0], ["dorm-peer-2", 648.4, 658.4, 366.4, 376.8, 0.0],
	["dorm-wc", 658.4, 665.6, 366.4, 376.8, 0.0], ["dorm-corridor", 618.4, 665.6, 376.8, 379.2, 0.0],
	["dorm-peer-3", 618.4, 628.4, 379.2, 389.6, 0.0], ["dorm-common", 628.4, 640.4, 379.2, 389.6, 0.0],
	["dorm-kitchen", 640.4, 652.4, 379.2, 389.6, 0.0], ["dorm-laundry", 652.4, 659.6, 379.2, 389.6, 0.0],
	["dorm-bath", 659.6, 665.6, 379.2, 389.6, 0.0],
]

# ground.js の農地パレット (sRGB, 原典の分岐順: pasture / crops / sod / citrus / dry / ploughed / fallow)
const FIELD_PALETTE := [
	Color(0.40, 0.50, 0.25), Color(0.33, 0.47, 0.21), Color(0.39, 0.55, 0.26), Color(0.20, 0.29, 0.13),
	Color(0.55, 0.53, 0.36), Color(0.50, 0.42, 0.30), Color(0.47, 0.48, 0.33),
]
const FIELD_CELL := Vector2(460.0, 320.0) # ground.js cs = (460, 320)
const FIELD_ORIGIN := Vector2(2600.0, -37200.0) # (n, e) 飛行場北東の農地グリッド開始点
const FIELD_COLS := 6
const FIELD_ROWS := 5
# 町並み基礎 (本移植独自の基礎配置): runway frame で a 2500..3220 / c 940..1660,
# 街区 180 x 180 m + 街路 40 m のグリッドに低層ブロック (高さは決定的ハッシュで 6..18 m)
const TOWN := {"a0": 2500.0, "c0": 940.0, "block": 180.0, "street": 40.0, "cols": 4, "rows": 3}

static var _tex_mats: Dictionary = {}
static var _gen_tex: Dictionary = {}

# 原典 render/textures.js / materials.js / world/ground.js / world/airfield.js の対応表。
# _c テクスチャの相方: packed な *_nr は R,G = 法線 XY, B = 粗さ (materials.js の packed)。
# 粗さ変換 (lo + span * texel) は原典の式そのもの:
#   packed _nr .. roughness * (0.6 + 0.8 * B)   (materials.js)
#   grass_nr .... mix(0.92, 1.0, B)             (ground.js の gRough)
#   舗装 *_r .... mix(0.55, 1.0, R)             (airfield.js の pRough)
# *_n / *_r は分離テクスチャ (法線は RGB そのまま、粗さは R チャンネル)。
const _COMPANION := {
	"grass_c.webp": {"nr": "grass_nr.webp", "lo": 0.92, "span": 0.08},
	"plaster_c.webp": {"nr": "plaster_nr.webp", "lo": 0.6, "span": 0.8},
	"concrete2_c.webp": {"nr": "concrete2_nr.webp", "lo": 0.6, "span": 0.8},
	"concrete_c.webp": {"n": "concrete_n.webp"},
	"asphalt_c.webp": {"n": "asphalt_n.webp", "r": "asphalt_r.webp", "lo": 0.55, "span": 0.45},
}

## 呼び出し側の色は原典の sRGB 値 (16 進カラーの成分そのまま)。Godot の
## albedo_color は線形として扱われるため、HTML と同じ見え方にするには変換が要る。
static func _lin(c: Color) -> Color:
	return c.srgb_to_linear()

## 粗さ専用テクスチャを画像から生成する (元テクスチャの channel 成分に
## 原典の線形変換 lo + span * v を掛けたグレースケール)。ミップ付き。
static func _rough_image_tex(tex_name: String, channel: int, lo: float, span: float) -> Texture2D:
	var key := "rough|" + tex_name + "|" + str(channel) + "|" + str(lo) + "|" + str(span)
	if _gen_tex.has(key):
		return _gen_tex[key]
	var src := load("res://assets/tex/" + tex_name) as Texture2D
	if src == null:
		return null
	var img := src.get_image()
	if img == null:
		return null
	if img.is_compressed():
		img.decompress()
	img.convert(Image.FORMAT_RGBA8)
	var data := img.get_data().slice(0, img.get_width() * img.get_height() * 4) # ミップ分を除いた第0レベル
	var out := PackedByteArray()
	out.resize(data.size())
	for i in range(0, data.size(), 4):
		var v := int(clampf(lo + span * float(data[i + channel]) / 255.0, 0.0, 1.0) * 255.0)
		out[i] = v
		out[i + 1] = v
		out[i + 2] = v
		out[i + 3] = 255
	var nimg := Image.create_from_data(img.get_width(), img.get_height(), false, Image.FORMAT_RGBA8, out)
	nimg.generate_mipmaps()
	var t := ImageTexture.create_from_image(nimg)
	_gen_tex[key] = t
	return t

## packed *_nr (RG=法線XY, B=粗さ) から通常の RGB 法線テクスチャを作る
## (Z は単位長に再構成)。Godot の normal_texture は RGB 法線を期待するため。
static func _normal_image_tex(tex_name: String) -> Texture2D:
	var key := "normal|" + tex_name
	if _gen_tex.has(key):
		return _gen_tex[key]
	var src := load("res://assets/tex/" + tex_name) as Texture2D
	if src == null:
		return null
	var img := src.get_image()
	if img == null:
		return null
	if img.is_compressed():
		img.decompress()
	img.convert(Image.FORMAT_RGBA8)
	var data := img.get_data().slice(0, img.get_width() * img.get_height() * 4) # ミップ分を除いた第0レベル
	var out := PackedByteArray()
	out.resize(data.size())
	for i in range(0, data.size(), 4):
		var x := float(data[i]) / 255.0 * 2.0 - 1.0
		var y := float(data[i + 1]) / 255.0 * 2.0 - 1.0
		var z := sqrt(maxf(0.0, 1.0 - x * x - y * y))
		out[i] = int(clampf(x * 0.5 + 0.5, 0.0, 1.0) * 255.0)
		out[i + 1] = int(clampf(y * 0.5 + 0.5, 0.0, 1.0) * 255.0)
		out[i + 2] = int(clampf(z * 0.5 + 0.5, 0.0, 1.0) * 255.0)
		out[i + 3] = 255
	var nimg := Image.create_from_data(img.get_width(), img.get_height(), false, Image.FORMAT_RGBA8, out)
	nimg.generate_mipmaps()
	var t := ImageTexture.create_from_image(nimg)
	_gen_tex[key] = t
	return t

## _COMPANION に従い法線 / 粗さテクスチャを材質へ配線する。
static func _wire_companions(m: StandardMaterial3D, tex_name: String) -> void:
	var comp: Dictionary = _COMPANION.get(tex_name, {})
	if comp.has("nr"):
		var nrm := _normal_image_tex(String(comp["nr"]))
		if nrm != null:
			m.normal_enabled = true
			m.normal_texture = nrm
			m.normal_scale = 1.0
		var rtx := _rough_image_tex(String(comp["nr"]), 2, float(comp["lo"]), float(comp["span"]))
		if rtx != null:
			m.roughness_texture = rtx
	elif comp.has("n"):
		var ntex := load("res://assets/tex/" + String(comp["n"])) as Texture2D
		if ntex != null:
			m.normal_enabled = true
			m.normal_texture = ntex
			m.normal_scale = 1.0
		if comp.has("r"):
			var rtx2 := _rough_image_tex(String(comp["r"]), 0, float(comp["lo"]), float(comp["span"]))
			if rtx2 != null:
				m.roughness_texture = rtx2

static func _tex_mat(tex_name: String, tint: Color, repeat_m: float, rough: float = 0.95) -> StandardMaterial3D:
	return _tex_mat_uv(tex_name, tint, repeat_m, rough, Vector2(1.0 / repeat_m, 1.0 / repeat_m))

## uv を明示するバリアント。BoxMesh の UV は面ごとに 0..1 なので、タイリングは
## 「面サイズ / repeat_m」を uv1_scale に入れた材質バリアントでしか作れない
## (旧実装は uv1_scale = 1/repeat_m で、巨大な面ほどテクスチャが引き伸ばされた)。
## 材質には tex_spec メタを付け、_box が面サイズからバリアントを差し替える。
static func _tex_mat_uv(tex_name: String, tint: Color, repeat_m: float, rough: float, uv: Vector2) -> StandardMaterial3D:
	var key := tex_name + "|" + str(tint) + "|" + str(repeat_m) + "|" + str(uv)
	if _tex_mats.has(key):
		return _tex_mats[key]
	var m := StandardMaterial3D.new()
	var tex := load("res://assets/tex/" + tex_name) as Texture2D
	if tex != null:
		m.albedo_texture = tex
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		m.uv1_scale = Vector3(uv.x, uv.y, 1.0)
		_wire_companions(m, tex_name)
	m.albedo_color = _lin(tint)
	m.roughness = rough
	m.set_meta("tex_spec", {"tex": tex_name, "tint": tint, "repeat": repeat_m, "rough": rough})
	_tex_mats[key] = m
	return m

## 箱の支配的な面に対する uv1_scale (= 面サイズ / repeat_m)。
## 扁平な箱は上面 (x × z)、薄壁は大きな側面 (長辺 × 高さ) を正とする。
## BoxMesh は面ごとに UV の向きが違うため、残りの面は近似になる
## (原典は triplanar の metricMaterial で全方向正確。PHASE4-WORLD-NOTES 参照)。
static func _box_uv(size: Vector3, repeat_m: float) -> Vector2:
	if size.y <= size.x and size.y <= size.z:
		return Vector2(size.x / repeat_m, size.z / repeat_m)
	if size.x <= size.z:
		return Vector2(size.z / repeat_m, size.y / repeat_m)
	return Vector2(size.x / repeat_m, size.y / repeat_m)

static func _flat_mat(color: Color, rough: float = 0.95) -> StandardMaterial3D:
	var key := "flat|" + str(color)
	if _tex_mats.has(key):
		return _tex_mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = _lin(color)
	m.roughness = rough
	_tex_mats[key] = m
	return m

## runway frame (a, c) + 地上高 up → Godot world 座標 (airport_build と同一規約)
static func rwy_to_world(a: float, c: float, up: float = 0.0) -> Vector3:
	var rwy: Dictionary = FP.lab_rwy()
	var ne: Array = FP.rwyToNE(rwy, a, c)
	return Vector3(float(ne[1]), FP.GROUND_M + up, -float(ne[0])) + VIS_OFF

static func frame_yaw() -> float:
	var rwy: Dictionary = FP.lab_rwy()
	return -float(rwy["trueHdg"]) * FP.DEG

# runway frame の箱 (a0..a1, c0..c1, y0..y1: y は地表からの高さ)
static func _box(parent: Node3D, name_: String, a0: float, a1: float, c0: float, c1: float, y0: float, y1: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = name_
	var bm := BoxMesh.new()
	var sz := Vector3(absf(c1 - c0), absf(y1 - y0), absf(a1 - a0))
	bm.size = sz
	mi.mesh = bm
	if mat != null and mat.has_meta("tex_spec"):
		var spec: Dictionary = mat.get_meta("tex_spec")
		var tint_c: Color = spec["tint"]
		mi.material_override = _tex_mat_uv(String(spec["tex"]), tint_c, float(spec["repeat"]), float(spec["rough"]), _box_uv(sz, float(spec["repeat"])))
	else:
		mi.material_override = mat
	mi.position = rwy_to_world((a0 + a1) / 2.0, (c0 + c1) / 2.0, (y0 + y1) / 2.0)
	mi.rotation.y = frame_yaw()
	parent.add_child(mi)
	return mi

# 世界軸 (n, e) の平板 (農地用): top_y は地表からの相対高 (負で地面より下に埋める)
static func _slab_ne(parent: Node3D, name_: String, n0: float, n1: float, e0: float, e1: float, top_up: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = name_
	var bm := BoxMesh.new()
	bm.size = Vector3(absf(e1 - e0), 0.1, absf(n1 - n0))
	mi.mesh = bm
	mi.material_override = mat
	mi.position = Vector3((e0 + e1) / 2.0, FP.GROUND_M + top_up - 0.05, -(n0 + n1) / 2.0) + VIS_OFF
	parent.add_child(mi)
	return mi

static func _hash01(i: int, j: int, salt: int) -> float:
	var h: int = (i * 374761393 + j * 668265263 + salt * 974634211) & 0x7FFFFFFF
	h = (h ^ (h >> 13)) & 0x7FFFFFFF
	h = (h * 1274126177) & 0x7FFFFFFF
	return float((h ^ (h >> 16)) & 0x7FFFFFFF) / 2147483647.0

# ---------------------------------------------------------------- build
static func build_world(parent: Node = null, opts: Dictionary = {}) -> Node3D:
	var root := Node3D.new()
	root.name = "World"
	if parent != null:
		parent.add_child(root)
	var plaster := _tex_mat("plaster_c.webp", Color(0.953, 0.933, 0.894), 2.2, 0.9)
	var concrete := _tex_mat("concrete_c.webp", Color(0.84, 0.85, 0.85), 4.0, 0.6)
	var concrete2 := _tex_mat("concrete2_c.webp", Color(0.60, 0.62, 0.65), 3.0, 0.85)
	var asphalt := _tex_mat("asphalt_c.webp", Color(0.45, 0.45, 0.46), 4.0, 0.95)
	var roof_mat := _tex_mat("concrete2_c.webp", Color(0.545, 0.56, 0.575), 4.0, 0.95)
	var glass_mat := _flat_mat(Color(0.35, 0.48, 0.58), 0.2)
	var dark_mat := _flat_mat(Color(0.11, 0.125, 0.14), 0.8)
	var room_mat := _tex_mat("concrete2_c.webp", Color(0.78, 0.79, 0.80), 3.0, 0.9)

	# ---- 地表: 外周 (ground.js の outer: 半径ではなく一辺 120,000 m の面, grass 反復)
	var ground := MeshInstance3D.new()
	ground.name = "GroundOuter"
	var pm := PlaneMesh.new()
	pm.size = Vector2(120000.0, 120000.0)
	ground.mesh = pm
	# guv = loc / 2.6 (ground.js) 相当: uv1_scale は PlaneMesh の UV (0..1) に対して
	# サイズ / 2.6 回の反復になるよう材質側でなく per-mesh では設定できないため、
	# 反復はマテリアルの uv1_scale = 120000/2.6 で与える専用マテリアルを使う
	var gm := StandardMaterial3D.new()
	var gtex := load("res://assets/tex/grass_c.webp") as Texture2D
	if gtex != null:
		gm.albedo_texture = gtex
		gm.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		gm.uv1_scale = Vector3(120000.0 / 2.6, 120000.0 / 2.6, 1.0)
		_wire_companions(gm, "grass_c.webp")
	gm.roughness = 1.0 # 粗さは grass_nr の B から作ったテクスチャ側で決まる (ground.js の gRough)
	ground.material_override = gm
	ground.position = Vector3(0, FP.GROUND_M - 0.10, 0) + VIS_OFF
	root.add_child(ground)
	# ---- 飛行場グラス領域 (layout.region)
	_box(root, "AirfieldGrass", REGION["a0"], REGION["a1"], REGION["c0"], REGION["c1"], -0.06, -0.02, _tex_mat("grass_c.webp", Color(0.92, 0.95, 0.82), 2.6))
	# ---- SITE 舗装
	var site_grp := Node3D.new()
	site_grp.name = "Site"
	root.add_child(site_grp)
	for i in range(SITE.size()):
		var s: Array = SITE[i]
		var mat: Material = asphalt if String(s[4]) == "lot" else concrete
		_box(site_grp, "Site_%d_%s" % [i, String(s[4])], float(s[0]), float(s[1]), float(s[2]), float(s[3]), 0.0, 0.03, mat)
	# ---- 農地ブロック (ground.js フィールドグリッドの基礎再現)
	if bool(opts.get("fields", true)):
		var fields := Node3D.new()
		fields.name = "Fields"
		root.add_child(fields)
		for r in range(FIELD_ROWS):
			for c in range(FIELD_COLS):
				var n0: float = FIELD_ORIGIN.x + float(r) * FIELD_CELL.y
				var e0: float = FIELD_ORIGIN.y + float(c) * FIELD_CELL.x
				var cat: int = int(_hash01(c, r, 17) * float(FIELD_PALETTE.size())) % FIELD_PALETTE.size()
				_slab_ne(fields, "Field_%d_%d" % [r, c], n0, n0 + FIELD_CELL.y, e0, e0 + FIELD_CELL.x, -0.04, _flat_mat(FIELD_PALETTE[cat]))
	# ---- 町並み基礎ブロック
	if bool(opts.get("town", true)):
		var town := Node3D.new()
		town.name = "Town"
		root.add_child(town)
		var step: float = float(TOWN["block"]) + float(TOWN["street"])
		for r in range(int(TOWN["rows"])):
			for c in range(int(TOWN["cols"])):
				var a0: float = float(TOWN["a0"]) + float(r) * step
				var c0: float = float(TOWN["c0"]) + float(c) * step
				var h: float = 6.0 + _hash01(c, r, 5) * 12.0
				_box(town, "TownBlock_%d_%d" % [r, c], a0, a0 + float(TOWN["block"]), c0, c0 + float(TOWN["block"]), 0.0, h, _flat_mat(Color(0.72, 0.70, 0.66) if (r + c) % 2 == 0 else Color(0.62, 0.63, 0.65)))
	# ---- 学園棟 (layout ACADEMY + academy-spec 部屋床)
	var ac := Node3D.new()
	ac.name = "Academy"
	root.add_child(ac)
	_box(ac, "AcademyFloor", ACADEMY["a0"], ACADEMY["a1"], ACADEMY["c0"], ACADEMY["c1"], 0.0, 0.2, concrete)
	_box(ac, "AcademyWallW", ACADEMY["a0"], ACADEMY["a1"], ACADEMY["c0"], ACADEMY["c0"] + ACADEMY["wall"], 0.0, ACADEMY["H"], plaster)
	_box(ac, "AcademyWallE", ACADEMY["a0"], ACADEMY["a1"], ACADEMY["c1"] - ACADEMY["wall"], ACADEMY["c1"], 0.0, ACADEMY["H"], plaster)
	_box(ac, "AcademyWallS", ACADEMY["a0"], ACADEMY["a0"] + ACADEMY["wall"], ACADEMY["c0"], ACADEMY["c1"], 0.0, ACADEMY["H"], plaster)
	_box(ac, "AcademyWallN", ACADEMY["a1"] - ACADEMY["wall"], ACADEMY["a1"], ACADEMY["c0"], ACADEMY["c1"], 0.0, ACADEMY["H"], plaster)
	_box(ac, "AcademyRoof", ACADEMY["a0"], ACADEMY["a1"], ACADEMY["c0"], ACADEMY["c1"], ACADEMY["H"] - 0.2, ACADEMY["H"], roof_mat)
	# ロビーのガラス前面 (a lob0..lob1, c = glassC, 2 階吹き抜け 7.8 m)
	_box(ac, "AcademyLobbyGlass", ACADEMY["lob0"], ACADEMY["lob1"], ACADEMY["glassC"] - 0.1, ACADEMY["glassC"] + 0.1, 0.0, 7.8, glass_mat)
	for rm in ACADEMY_ROOMS:
		_box(ac, "AcademyRoom_" + String(rm[0]), float(rm[1]), float(rm[2]), float(rm[3]), float(rm[4]), float(rm[5]) + 0.2, float(rm[5]) + 0.24, room_mat)
	# ---- 寮 (layout DORM + dorm-spec 部屋床)
	var dm := Node3D.new()
	dm.name = "Dorm"
	root.add_child(dm)
	_box(dm, "DormFloor", DORM["a0"], DORM["a1"], DORM["c0"], DORM["c1"], 0.0, 0.2, concrete)
	_box(dm, "DormWallW", DORM["a0"], DORM["a1"], DORM["c0"], DORM["c0"] + DORM["wall"], 0.0, DORM["H"], plaster)
	_box(dm, "DormWallE", DORM["a0"], DORM["a1"], DORM["c1"] - DORM["wall"], DORM["c1"], 0.0, DORM["H"], plaster)
	_box(dm, "DormWallS", DORM["a0"], DORM["a0"] + DORM["wall"], DORM["c0"], DORM["c1"], 0.0, DORM["H"], plaster)
	_box(dm, "DormWallN", DORM["a1"] - DORM["wall"], DORM["a1"], DORM["c0"], DORM["c1"], 0.0, DORM["H"], plaster)
	_box(dm, "DormRoof", DORM["a0"], DORM["a1"], DORM["c0"], DORM["c1"], DORM["H"] - 0.2, DORM["H"], roof_mat)
	for rm in DORM_ROOMS:
		_box(dm, "DormRoom_" + String(rm[0]), float(rm[1]), float(rm[2]), float(rm[3]), float(rm[4]), 0.2, 0.24, room_mat)
	# ---- 管制塔 (layout TOWER: 基部 + シャフト + キャブ)
	var tw := Node3D.new()
	tw.name = "Tower"
	root.add_child(tw)
	_box(tw, "TowerBaseFloor", TOWER["b0"], TOWER["b1"], TOWER["c0"], TOWER["c1"], 0.0, 0.2, concrete)
	_box(tw, "TowerBaseWallW", TOWER["b0"], TOWER["b1"], TOWER["c0"], TOWER["c0"] + 0.4, 0.0, TOWER["baseTop"], plaster)
	_box(tw, "TowerBaseWallE", TOWER["b0"], TOWER["b1"], TOWER["c1"] - 0.4, TOWER["c1"], 0.0, TOWER["baseTop"], plaster)
	_box(tw, "TowerBaseWallS", TOWER["b0"], TOWER["b0"] + 0.4, TOWER["c0"], TOWER["c1"], 0.0, TOWER["baseTop"], plaster)
	_box(tw, "TowerBaseWallN", TOWER["b1"] - 0.4, TOWER["b1"], TOWER["c0"], TOWER["c1"], 0.0, TOWER["baseTop"], plaster)
	_box(tw, "TowerBaseSlab", TOWER["b0"], TOWER["b1"], TOWER["c0"], TOWER["c1"], TOWER["baseTop"], TOWER["baseTop"] + 0.4, concrete2)
	var w: float = TOWER["wall"]
	_box(tw, "TowerShaftWallW", TOWER["s0"], TOWER["s1"], TOWER["sc0"], TOWER["sc0"] + w, 0.0, TOWER["cabFloor"], plaster)
	_box(tw, "TowerShaftWallE", TOWER["s0"], TOWER["s1"], TOWER["sc1"] - w, TOWER["sc1"], 0.0, TOWER["cabFloor"], plaster)
	_box(tw, "TowerShaftWallS", TOWER["s0"], TOWER["s0"] + w, TOWER["sc0"], TOWER["sc1"], 0.0, TOWER["cabFloor"], plaster)
	_box(tw, "TowerShaftWallN", TOWER["s1"] - w, TOWER["s1"], TOWER["sc0"], TOWER["sc1"], 0.0, TOWER["cabFloor"], plaster)
	# キャブ: 床ディスク (17.0 ± 0.2) / ガラス (中心 18.7, 高さ 3.4) / 屋根 (20.6 ± 0.225)
	# buildings.js と同じ円柱近似。中心は (a, c) = (TOWER.a, TOWER.c)。
	for spec in [["TowerCabFloor", 3.6, 0.4, TOWER["cabFloor"] - 0.2, concrete2], ["TowerCabGlass", 4.0, 3.4, 17.0, glass_mat], ["TowerCabRoof", 4.4, 0.45, 20.375, dark_mat]]:
		var mi := MeshInstance3D.new()
		mi.name = String(spec[0])
		var cm := CylinderMesh.new()
		cm.top_radius = float(spec[1])
		cm.bottom_radius = float(spec[1])
		cm.height = float(spec[2])
		cm.radial_segments = 8
		mi.mesh = cm
		mi.material_override = spec[4]
		mi.position = rwy_to_world(TOWER["a"], TOWER["c"], float(spec[3]) + float(spec[2]) / 2.0)
		tw.add_child(mi)
	# ---- 格納庫 (layout HANGARS + buildings.js のシェル基礎: 床・妻壁・背面壁・扉ヘッダ・屋根)
	var hg := Node3D.new()
	hg.name = "Hangars"
	root.add_child(hg)
	for hi in range(HANGARS.size()):
		var H: Dictionary = HANGARS[hi]
		var pre := "Hangar%d" % (hi + 1)
		var wall_mat: Material = _flat_mat(Color(0.78, 0.80, 0.82), 0.5) if hi == 0 else _flat_mat(Color(0.25, 0.435, 0.62), 0.5)
		_box(hg, pre + "Floor", float(H["a0"]) + 0.25, float(H["a1"]) - 0.25, float(H["c0"]) + 0.25, float(H["c1"]) - 0.25, 0.0, 0.02, concrete)
		_box(hg, pre + "WallS", float(H["a0"]), float(H["a0"]) + 0.25, float(H["c0"]), float(H["c1"]), 0.0, float(H["h"]), wall_mat)
		_box(hg, pre + "WallN", float(H["a1"]) - 0.25, float(H["a1"]), float(H["c0"]), float(H["c1"]), 0.0, float(H["h"]), wall_mat)
		_box(hg, pre + "WallBack", float(H["a0"]), float(H["a1"]), float(H["c1"]) - 0.25, float(H["c1"]), 0.0, float(H["h"]), wall_mat)
		# 扉側 (c0) は開口: 上部ヘッダのみ (dh = h - 1.6 から h)
		_box(hg, pre + "DoorHeader", float(H["a0"]), float(H["a1"]), float(H["c0"]), float(H["c0"]) + 0.25, float(H["h"]) - 1.6, float(H["h"]), wall_mat)
		_box(hg, pre + "Roof", float(H["a0"]) - 0.6, float(H["a1"]) + 0.6, float(H["c0"]) - 0.6, float(H["c1"]) + 0.6, float(H["h"]), float(H["h"]) + 0.12, roof_mat)
	return root

## 建物の基礎寸法サマリー (検証・統合側の参照用)
static func spec_summary() -> Dictionary:
	return {
		"academy": ACADEMY, "dorm": DORM, "tower": TOWER, "hangars": HANGARS,
		"region": REGION, "siteCount": SITE.size(),
		"academyRooms": ACADEMY_ROOMS.size(), "dormRooms": DORM_ROOMS.size(),
		"townBlocks": int(TOWN["cols"]) * int(TOWN["rows"]),
		"fieldBlocks": FIELD_COLS * FIELD_ROWS,
	}

# ---------------------------------------------------------------- 徒歩パート基礎
## 歩行者ノードを作る (start は runway frame の (a, c))。地表 y = GROUND_M 固定。
## 戻り値の Node3D には子として CapsuleMesh の体 (高さ 1.7 m) が付き、
## meta: "ground_y" (固定する y), "yaw_deg" (向き, 北=0 の方位角)。
static func create_walker(parent: Node, start_a: float, start_c: float, yaw_deg: float = 0.0) -> Node3D:
	var walker := Node3D.new()
	walker.name = "Walker"
	walker.position = rwy_to_world(start_a, start_c, 0.0)
	walker.set_meta("ground_y", FP.GROUND_M)
	walker.set_meta("yaw_deg", yaw_deg)
	var body := MeshInstance3D.new()
	body.name = "Body"
	var cap := CapsuleMesh.new()
	cap.radius = 0.3
	cap.height = 1.7
	body.mesh = cap
	body.material_override = _flat_mat(Color(0.25, 0.35, 0.55), 0.7)
	body.position = Vector3(0, 0.85, 0)
	walker.add_child(body)
	if parent != null:
		parent.add_child(walker)
	return walker

## 世界軸の希望方向 wish_dir (y 成分は無視) へ speed m/s で dt 秒進める。
## y は meta "ground_y" に固定される (地表 y=0 相当 = GROUND_M)。
static func move_walker(walker: Node3D, wish_dir: Vector3, dt: float, speed: float = 3.0) -> Vector3:
	var d := Vector3(wish_dir.x, 0.0, wish_dir.z)
	if d.length() > 1.0:
		d = d.normalized()
	var p: Vector3 = walker.position + d * speed * maxf(dt, 0.0)
	p.y = float(walker.get_meta("ground_y", FP.GROUND_M))
	walker.position = p
	return p

## 入力ベクトル版: input_vec.x = 右への移動量, input_vec.y = 前への移動量
## (どちらも -1..1)。yaw_deg は方位角 (0 = 北 = -z, 90 = 東 = +x)。
## walker の meta "yaw_deg" とノードの回転も更新する。
static func step_walker(walker: Node3D, input_vec: Vector2, yaw_deg: float, dt: float, speed: float = 3.0) -> Vector3:
	walker.set_meta("yaw_deg", yaw_deg)
	walker.rotation.y = -yaw_deg * FP.DEG
	var yr := yaw_deg * FP.DEG
	var fwd := Vector3(sin(yr), 0.0, -cos(yr))
	var right := Vector3(cos(yr), 0.0, sin(yr))
	return move_walker(walker, right * input_vec.x + fwd * input_vec.y, dt, speed)
