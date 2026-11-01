extends RefCounted

## CADET Godot port — Phase 2: 訓練空港 (LAB) の主要部を組み立てる。
## レイアウトは physics.gd の PAVED 定義そのもの（滑走路座標系 along/cross, m）:
##   滑走路 RWY 36: along -40..1240, cross -15..15 (1200 x 30 m, 真方位 354°)
##   平行誘導路:    along -10..1210, cross 95..110
##   接続誘導路:    along 10..25 / 600..615 / 1175..1190, cross 15..95
##   エプロン:      along 450..750, cross 110..230
## 物理座標 (x=東 e, z=-北 n) へは表示オフセット VIS_OFF を足す（Phase 0 と同一）。

const FP = preload("res://src/physics.gd")
const VIS_OFF := Vector3(40000, 0, 0)

static func _mat(color: Color, rough: float = 0.95) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = rough
	return m

static var _pave_mats: Dictionary = {}
static var _gen_tex: Dictionary = {}

## 舗装の粗さテクスチャ (原典 airfield.js: pRough = mix(0.55, 1.0, tR.r))。
## *_r の R チャンネルに 0.55 + 0.45 * v を掛けたグレースケールを生成する。
static func _rough_image_tex(tex_name: String) -> Texture2D:
	if _gen_tex.has(tex_name):
		return _gen_tex[tex_name]
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
		var v := int(clampf(0.55 + 0.45 * float(data[i]) / 255.0, 0.0, 1.0) * 255.0)
		out[i] = v
		out[i + 1] = v
		out[i + 2] = v
		out[i + 3] = 255
	var nimg := Image.create_from_data(img.get_width(), img.get_height(), false, Image.FORMAT_RGBA8, out)
	nimg.generate_mipmaps()
	var t := ImageTexture.create_from_image(nimg)
	_gen_tex[tex_name] = t
	return t

## 舗装材質 (原典 airfield.js pavementMaterial): albedo は無 tint でテクスチャ
## そのまま、UV はメートル単位 (asphalt は p/3.2, concrete は p/4.0)。
## BoxMesh の UV は面ごとに 0..1 なので、上面が正しくなるよう
## uv1_scale = (幅, 長さ) / repeat_m のバリアントをスラブごとに作る。
static func _pave_mat(tex_name: String, repeat_m: float, uv: Vector2) -> StandardMaterial3D:
	var key := tex_name + "|" + str(uv)
	if _pave_mats.has(key):
		return _pave_mats[key]
	var m := StandardMaterial3D.new()
	var base := tex_name.trim_suffix("_c.webp")
	var tex := load("res://assets/tex/" + tex_name) as Texture2D
	if tex != null:
		m.albedo_texture = tex
		m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS_ANISOTROPIC
		m.uv1_scale = Vector3(uv.x, uv.y, 1.0)
	var ntex := load("res://assets/tex/" + base + "_n.webp") as Texture2D
	if ntex != null:
		m.normal_enabled = true
		m.normal_texture = ntex
		m.normal_scale = 1.0
	var rtx := _rough_image_tex(base + "_r.webp")
	if rtx != null:
		m.roughness_texture = rtx
	m.roughness = 1.0
	_pave_mats[key] = m
	return m

# runway-frame (along, cross) の矩形を地面に敷く。y は地面高 + lift。
# texspec が [tex_name, repeat_m] のときは mat を無視して舗装材質を使う。
static func _slab(parent: Node3D, along0: float, along1: float, cross0: float, cross1: float, lift: float, mat: Material, texspec: Array = []) -> MeshInstance3D:
	var rwy: Dictionary = FP.lab_rwy()
	var ca := (along0 + along1) / 2.0
	var cc := (cross0 + cross1) / 2.0
	var ne: Array = FP.rwyToNE(rwy, ca, cc)
	var mi := MeshInstance3D.new()
	var bm := BoxMesh.new()
	bm.size = Vector3(absf(cross1 - cross0), 0.1, absf(along1 - along0))
	mi.mesh = bm
	if texspec.size() == 2:
		var rep := float(texspec[1])
		mi.material_override = _pave_mat(String(texspec[0]), rep, Vector2(absf(cross1 - cross0) / rep, absf(along1 - along0) / rep))
	else:
		mi.material_override = mat
	mi.position = Vector3(float(ne[1]), FP.GROUND_M + lift, -float(ne[0])) + VIS_OFF
	mi.rotation.y = -float(rwy["trueHdg"]) * FP.DEG
	parent.add_child(mi)
	return mi

static func build_airport() -> Node3D:
	var root := Node3D.new()
	root.name = "LABAirport"
	var asphalt := _mat(Color(0.16, 0.16, 0.17))
	var concrete := _mat(Color(0.42, 0.42, 0.43))
	var taxiway_mat := _mat(Color(0.23, 0.23, 0.24))
	var white := _mat(Color(0.92, 0.92, 0.92))
	var yellow := _mat(Color(0.85, 0.7, 0.15))
	# 滑走路（Phase 0 と同じ敷き方、PAVED 定義に合わせて拡張）
	# 舗装は原典のテクスチャ材質 (asphalt は 3.2 m / tile, concrete は 4.0 m / tile)
	_slab(root, -40, 1240, -15, 15, 0.05, asphalt, ["asphalt_c.webp", 3.2])
	# 平行誘導路＋接続誘導路＋エプロン
	_slab(root, -10, 1210, 95, 110, 0.04, taxiway_mat, ["asphalt_c.webp", 3.2])
	for c in [[10, 25], [600, 615], [1175, 1190]]:
		_slab(root, float(c[0]), float(c[1]), 15, 95, 0.04, taxiway_mat, ["asphalt_c.webp", 3.2])
	_slab(root, 450, 750, 110, 230, 0.04, concrete, ["concrete_c.webp", 4.0])
	# 滑走路センターライン（ダッシュ）
	for i in range(12):
		_slab(root, 60.0 + i * 100.0, 90.0 + i * 100.0, -0.4, 0.4, 0.11, white)
	# スレッショルド・ピアノキー（36 側 = along 0 付近）
	for k in range(-3, 4):
		_slab(root, 12, 42, float(k) * 3.6 - 1.0, float(k) * 3.6 + 1.0, 0.11, white)
	# 誘導路センターライン（黄）
	_slab(root, -10, 1210, 102.0, 103.0, 0.09, yellow)
	_slab(root, 450, 750, 102.0, 103.0, 0.09, yellow)
	# エプロンの駐機スポット目印（along 600, cross 170 を主スポットとする）：細い十字のみ
	_slab(root, 592, 608, 169.7, 170.3, 0.09, yellow)
	_slab(root, 599.7, 600.3, 164, 176, 0.09, yellow)
	# 風向灯（簡易：ポール＋円錐）エプロン脇
	var sock := Node3D.new()
	var rwy: Dictionary = FP.lab_rwy()
	var ne: Array = FP.rwyToNE(rwy, 420.0, 250.0)
	sock.position = Vector3(float(ne[1]), FP.GROUND_M, -float(ne[0])) + VIS_OFF
	var pole := MeshInstance3D.new()
	var pm := CylinderMesh.new()
	pm.top_radius = 0.05; pm.bottom_radius = 0.05; pm.height = 6.0
	pole.mesh = pm
	pole.material_override = _mat(Color(0.8, 0.8, 0.8), 0.6)
	pole.position = Vector3(0, 3, 0)
	sock.add_child(pole)
	var cone := MeshInstance3D.new()
	var cm := CylinderMesh.new()
	cm.top_radius = 0.18; cm.bottom_radius = 0.45; cm.height = 1.8
	cone.mesh = cm
	cone.material_override = _mat(Color(0.9, 0.45, 0.1))
	cone.rotation.z = deg_to_rad(80.0)
	cone.position = Vector3(0.8, 5.8, 0)
	sock.add_child(cone)
	root.add_child(sock)
	return root

# エプロン主スポットの物理座標 (n, e) と方位（駐機用）
static func apron_spot() -> Dictionary:
	var rwy: Dictionary = FP.lab_rwy()
	var ne: Array = FP.rwyToNE(rwy, 600.0, 170.0)
	return {"n": float(ne[0]), "e": float(ne[1]), "hdg": 354.0}
