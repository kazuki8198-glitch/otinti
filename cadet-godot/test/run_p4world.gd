extends SceneTree

## CADET Godot port — Phase 4 (world: 地面・光・雲) 検証ランナー
## 使い方: godot --headless --path <project> -s test/run_p4world.gd
##  1) タイリング: 代表的な面で材質の uv1_scale が 面サイズ / repeat と一致
##  2) 法線 / 粗さの配線 (packed _nr と分離 _n/_r)
##  3) assets/tex 全 .import の mipmaps/generate=true
##  4) sky_clouds のノード構成 (原典 clouds.js SPOTS と一致)
## 終了コード: 0 = 全合格, 1 = 不合格あり。

const WB = preload("res://src/world_build.gd")
const AB = preload("res://src/airport_build.gd")
const SC = preload("res://src/sky_clouds.gd")

var failures := 0
var checks := 0

func _check(label: String, ok: bool, detail: String = "") -> void:
	checks += 1
	if not ok:
		failures += 1
		print("FAIL ", label, " ", detail)

func _uv_of(mi: MeshInstance3D) -> Vector2:
	if mi == null:
		return Vector2(-1, -1)
	var m := mi.material_override as StandardMaterial3D
	if m == null:
		return Vector2(-1, -1)
	return Vector2(m.uv1_scale.x, m.uv1_scale.y)

func _mat_of(mi: MeshInstance3D) -> StandardMaterial3D:
	return mi.material_override as StandardMaterial3D if mi != null else null

func _mi(parent: Node, path: String) -> MeshInstance3D:
	return parent.get_node_or_null(path) as MeshInstance3D

func _count_prefix(parent: Node, prefix: String) -> int:
	var n := 0
	for c in parent.get_children():
		if String(c.name).begins_with(prefix):
			n += 1
	return n

func _init() -> void:
	var holder := Node3D.new()
	root.add_child(holder)
	var world: Node3D = WB.build_world(holder)
	_check("world builds", world != null)

	# ---- 1) タイリング (uv1_scale == 面サイズ / repeat)
	# 外周地面: 120000 m / 2.6 (ground.js の guv = loc / 2.6)
	var ground := _mi(world, "GroundOuter")
	_check("GroundOuter uv = 120000/2.6", _uv_of(ground).is_equal_approx(Vector2(120000.0 / 2.6, 120000.0 / 2.6)), str(_uv_of(ground)))
	# 飛行場グラス領域: 568 x 1720 m, grass repeat 2.6
	var grass := _mi(world, "AirfieldGrass")
	_check("AirfieldGrass uv = (568,1720)/2.6", _uv_of(grass).is_equal_approx(Vector2(568.0 / 2.6, 1720.0 / 2.6)), str(_uv_of(grass)))
	# SITE 駐車場 (lot, asphalt repeat 4.0): a 560..725 (165 m) x c 290..342 (52 m), 扁平 → 上面 (52, 165)/4
	var lot := _mi(world, "Site/Site_3_lot")
	_check("Site_3_lot uv = (52,165)/4", _uv_of(lot).is_equal_approx(Vector2(52.0 / 4.0, 165.0 / 4.0)), str(_uv_of(lot)))
	# SITE 歩道 (walk, concrete repeat 4.0): a 460..740 (280) x c 230..245 (15) → (15, 280)/4
	var walk := _mi(world, "Site/Site_0_walk")
	_check("Site_0_walk uv = (15,280)/4", _uv_of(walk).is_equal_approx(Vector2(15.0 / 4.0, 280.0 / 4.0)), str(_uv_of(walk)))
	# 学園西壁 (plaster repeat 2.2): 薄壁 0.4 x 高さ 8.2 x 長さ 94 → 側面 (94, 8.2)/2.2
	var wallw := _mi(world, "Academy/AcademyWallW")
	_check("AcademyWallW uv = (94,8.2)/2.2", _uv_of(wallw).is_equal_approx(Vector2(94.0 / 2.2, 8.2 / 2.2)), str(_uv_of(wallw)))
	# 学園床 (concrete repeat 4.0): 30 x 94 → (30, 94)/4
	var acfloor := _mi(world, "Academy/AcademyFloor")
	_check("AcademyFloor uv = (30,94)/4", _uv_of(acfloor).is_equal_approx(Vector2(30.0 / 4.0, 94.0 / 4.0)), str(_uv_of(acfloor)))
	# 格納庫1床 (concrete repeat 4.0): 40.5 x 49.5 → /4
	var h1f := _mi(world, "Hangars/Hangar1Floor")
	_check("Hangar1Floor uv = (40.5,49.5)/4", _uv_of(h1f).is_equal_approx(Vector2(40.5 / 4.0, 49.5 / 4.0)), str(_uv_of(h1f)))
	# 旧バグの回帰防止: どの面も uv が 1/repeat (引き伸ばし) になっていない
	_check("no face keeps the old 1/repeat uv", _uv_of(lot).x > 2.0 and _uv_of(wallw).x > 2.0)

	# ---- 2) 法線 / 粗さの配線
	var lotm := _mat_of(lot)
	_check("asphalt (lot) normal wired", lotm != null and lotm.normal_enabled and lotm.normal_texture != null and lotm.normal_texture.resource_path.ends_with("asphalt_n.webp"), str(lotm.normal_texture.resource_path if lotm and lotm.normal_texture else null))
	_check("asphalt (lot) roughness wired", lotm != null and lotm.roughness_texture != null)
	var wallm := _mat_of(wallw)
	_check("plaster (packed nr) normal wired", wallm != null and wallm.normal_enabled and wallm.normal_texture != null)
	_check("plaster (packed nr) roughness wired", wallm != null and wallm.roughness_texture != null)
	var gm := _mat_of(ground)
	_check("grass (packed nr) normal wired", gm != null and gm.normal_enabled and gm.normal_texture != null)
	_check("grass (packed nr) roughness wired", gm != null and gm.roughness_texture != null)
	# tint は sRGB → 線形変換されている (plaster 0.953,0.933,0.894 の線形は各成分が元より小さい)
	_check("plaster tint converted to linear", wallm != null and wallm.albedo_color.r < 0.953 and wallm.albedo_color.g < 0.933, str(wallm.albedo_color if wallm else null))

	# ---- airport 舗装 (airport_build)
	var ap: Node3D = AB.build_airport()
	holder.add_child(ap)
	var rwy_mi: MeshInstance3D = null
	var apron_mi: MeshInstance3D = null
	for c in ap.get_children():
		var mi := c as MeshInstance3D
		if mi == null:
			continue
		var bm := mi.mesh as BoxMesh
		if bm == null:
			continue
		if bm.size.is_equal_approx(Vector3(30, 0.1, 1280)):
			rwy_mi = mi
		if bm.size.is_equal_approx(Vector3(120, 0.1, 300)):
			apron_mi = mi
	_check("runway slab found", rwy_mi != null)
	_check("runway uv = (30,1280)/3.2", _uv_of(rwy_mi).is_equal_approx(Vector2(30.0 / 3.2, 1280.0 / 3.2)), str(_uv_of(rwy_mi)))
	var rwym := _mat_of(rwy_mi)
	_check("runway asphalt texture", rwym != null and rwym.albedo_texture != null and rwym.albedo_texture.resource_path.ends_with("asphalt_c.webp"))
	_check("runway normal+roughness wired", rwym != null and rwym.normal_texture != null and rwym.roughness_texture != null)
	_check("apron uv = (120,300)/4", _uv_of(apron_mi).is_equal_approx(Vector2(120.0 / 4.0, 300.0 / 4.0)), str(_uv_of(apron_mi)))
	var apm := _mat_of(apron_mi)
	_check("apron concrete texture", apm != null and apm.albedo_texture != null and apm.albedo_texture.resource_path.ends_with("concrete_c.webp"))

	# ---- 3) ミップ設定 (全 .import)
	var tex_names := ["asphalt_c", "asphalt_n", "asphalt_r", "concrete2_c", "concrete2_nr", "concrete_c", "concrete_n", "concrete_r", "grass_c", "grass_nr", "plaster_c", "plaster_nr"]
	for tn in tex_names:
		var f := FileAccess.open("res://assets/tex/" + tn + ".webp.import", FileAccess.READ)
		_check("import readable " + tn, f != null)
		if f != null:
			var txt := f.get_as_text()
			f.close()
			_check("mipmaps/generate=true " + tn, txt.contains("mipmaps/generate=true"))

	# ---- 4) sky_clouds
	var clouds: Node3D = SC.build_clouds(holder)
	_check("clouds root name", clouds != null and clouds.name == "Clouds")
	_check("cumulus count 7", _count_prefix(clouds, "Cumulus_") == 7, str(_count_prefix(clouds, "Cumulus_")))
	_check("cumulus neighbour count 7", _count_prefix(clouds, "CumulusNb_") == 7)
	var spots: Array = SC.cloud_spots()
	_check("spots 7 (clouds.js SPOTS)", spots.size() == 7)
	for i in range(spots.size()):
		var s: Dictionary = spots[i]
		var cm := _mi(clouds, "Cumulus_%d" % i)
		_check("Cumulus_%d exists" % i, cm != null)
		if cm == null:
			continue
		var q := cm.mesh as QuadMesh
		var w := float(s["w"])
		_check("Cumulus_%d quad size" % i, q != null and q.size.is_equal_approx(Vector2(w, w * 288.0 / 512.0)), str(q.size if q else null))
		var want := Vector3(float(s["x"]) + 40000.0, FlightPhysics.GROUND_M + float(s["base"]) + w * (288.0 / 512.0) * 0.3, float(s["z"]))
		_check("Cumulus_%d position" % i, cm.position.is_equal_approx(want), str(cm.position) + " want " + str(want))
		var cmat := cm.material_override as StandardMaterial3D
		_check("Cumulus_%d billboard fixed-Y + texture" % i, cmat != null and cmat.billboard_mode == BaseMaterial3D.BILLBOARD_FIXED_Y and cmat.albedo_texture != null)
	var layer := _mi(clouds, "StratusLayer")
	_check("StratusLayer exists", layer != null)
	if layer != null:
		var lpm := layer.mesh as PlaneMesh
		_check("StratusLayer size 60000", lpm != null and lpm.size == Vector2(60000, 60000))
		_check("StratusLayer altitude 2600", absf(layer.position.y - (FlightPhysics.GROUND_M + 2600.0)) < 0.01, str(layer.position.y))
		_check("StratusLayer shader material", layer.material_override is ShaderMaterial)

	print("== Phase 4 (world) total: " + str(checks) + " checks, " + str(failures) + " failures")
	quit(1 if failures > 0 else 0)
