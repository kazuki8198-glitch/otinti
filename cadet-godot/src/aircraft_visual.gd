class_name AircraftVisual
extends RefCounted

## CADET Godot port — Phase 2: 機体の見た目（マテリアル再構成）
## 原典: cadet/src/aircraft/exterior.js の materials() / paintClass() と
## cadet/tools/aircraft/build_archer.py の色定数 (898fe8a)。
##
## archer.glb の棚卸し (tools/glb_inspect.mjs):
##   - マテリアルは 0 個。色は全 21 メッシュの COLOR_0 (VEC4, u16 正規化) のみ。
##   - COLOR_0.rgb = ビルド時の塗装色 (sRGB, build_archer.py の定数そのまま)、
##     COLOR_0.a   = Blender で焼いた AO (0.35..1.0)。
##   - HTML 版は Three.js 側で vertexColors + paintClass() による粗さ/金属の
##     切替 (カスタムシェーダ) で描く。Godot 素インポートでは COLOR_0 が
##     albedo に乗らず白く見える (PHASE0-REPORT.md §4)。
##
## ここでの再構成 (目標は HTML 版と同等まで):
##   - 塗装 (paint): vertex_color_use_as_albedo = true の StandardMaterial3D。
##   - クラス別の粗さ/金属は Godot の per-vertex には無いので、頂点色を
##     paintClass() と同じ閾値で分類し、サーフェスをクラス毎に分割して
##     4 マテリアル (paint / glass / rubber / metal) + prop 専用に割り当てる。
##     分割した ArrayMesh を新しい MeshInstance3D として同じ名前・変換で
##     差し替える (単一クラスでも AO 焼き込みのためメッシュは作り直す)。
##
## 色空間 (Phase 4 で exterior.js と突き合わせて整理):
##   - glb の COLOR_0.rgb は build_archer.py の sRGB 定数そのまま。HTML 版は
##     geometryOf() が toLin() で線形化してからシェーダに渡し、paintClass()
##     も線形値で判定する。Godot 側の保存値も sRGB のままにする (理由:
##     verify_visual.gd が保存値を sRGB 定数で固定検証している契約、および
##     Godot の頂点色パスには HTML の geometryOf 相当の線形化段が無いため、
##     保存値を線形化すると Phase 2 の受入済みスクリーンショットから全体が
##     暗転する)。その代わり「演算は線形空間で」という原典の順序は守る:
##     paint_class() は判定前に _to_lin() し、AO の乗算も線形空間で行う。
##   - COLOR_0.a の AO (Phase 4 で再現): StandardMaterial3D には頂点単位の
##     AO チャンネルが無く (ao_texture は UV 前提)、albedo の alpha は透明
##     扱いになる。そこで分割時に rgb へ焼く: lin = toLin(rgb) を a 倍し、
##     sRGB に戻して alpha = 1.0 で保存する。トレードオフ (PHASE4-COCKPIT-
##     NOTES.md に詳述): HTML 版は AO を間接光 (天空光) にだけ掛け直射光は
##     影マップ任せだが、焼き込みは直射光まで一律に暗くする近似になる。
##   - reg.* (登録記号) は 9 機分すべて glb に入っている。HTML 版は
##     exteriorParts() が選択した 1 機分だけ body に結合するので、既定の
##     N738SY (archer-model.js の FIRST_REG) 以外は非表示にする。
##
## 使い方 (統合側):
##   var model = load("res://assets/archer.glb").instantiate()
##   aircraft_node.add_child(model)
##   AircraftVisual.apply_materials(model)        # static 呼び出し
##   # または preload して AV.apply_materials(model, "N738SY")

const DEFAULT_REG := "N738SY"

# exterior.js PAINT_CLASSES と同じ閾値 (線形値ではなく glb の sRGB 値に適用:
# build_archer.py の定数は sRGB で書かれ、glb にもそのまま入っているため)
const GLASS_MAX := 0.05
const GLASS_BLUE := 1.8
const RUBBER_MAX := 0.02
const METAL_MIN := 0.35
const METAL_MAX := 0.6
const METAL_TINT := 0.06

static var _mats: Dictionary = {}

## 頂点色 (r, g, b: glb の sRGB 値) → exterior.js paintClass() と同じ分類。
## 注意: 原典は toLin() 後の線形値で判定する。sRGB 値で判定すると境界付近
## (ガラス 0.10,0.14,0.19 / ゴム 0.09,0.09,0.10) がずれるため、ここでは
## build_archer.py の既知の定数色に近い順で判定する等価な近似を使う:
## まず原典どおり線形化してから閾値を適用する。
static func paint_class(c: Color) -> String:
	var r := _to_lin(c.r)
	var g := _to_lin(c.g)
	var b := _to_lin(c.b)
	var mx: float = maxf(r, maxf(g, b))
	if mx <= GLASS_MAX and b >= r * GLASS_BLUE:
		return "glass"
	if mx <= RUBBER_MAX:
		return "rubber"
	if mx >= METAL_MIN and mx <= METAL_MAX and absf(r - b) <= METAL_TINT:
		return "metal"
	return "paint"

static func _to_lin(v: float) -> float:
	return v / 12.92 if v <= 0.04045 else pow((v + 0.055) / 1.055, 2.4)

static func _to_srgb(v: float) -> float:
	var c := clampf(v, 0.0, 1.0)
	return c * 12.92 if c <= 0.0031308 else 1.055 * pow(c, 1.0 / 2.4) - 0.055

## COLOR_0 (sRGB rgb + AO a) → AO を線形空間で乗じて sRGB に戻した色 (a = 1)。
## exterior.js の順序 (geometryOf の toLin → withAO が線形の間接光を a 倍) に
## 対応する保存側の等価変換。a = 1 の頂点は元の sRGB 値と一致する。
static func bake_ao(c: Color) -> Color:
	var a := clampf(c.a, 0.0, 1.0)
	if a >= 0.9999:
		return Color(c.r, c.g, c.b, 1.0)
	return Color(_to_srgb(_to_lin(c.r) * a), _to_srgb(_to_lin(c.g) * a), _to_srgb(_to_lin(c.b) * a), 1.0)

## クラス別マテリアル (exterior.js の roughness/metalness に対応)
static func material_for(cls: String, is_prop: bool = false) -> StandardMaterial3D:
	var key := ("prop" if is_prop else cls)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.vertex_color_use_as_albedo = true
	match key:
		"paint": # MeshPhysicalMaterial: roughness .32, clearcoat 1 (近似: 低粗さ+specular)
			m.roughness = 0.32
			m.metallic = 0.0
			m.specular_mode = BaseMaterial3D.SPECULAR_SCHLICK_GGX
		"glass": # 粗さ 0.03 に落とした暗色ガラス (不透明のまま: HTML 版も不透明)
			m.roughness = 0.08
			m.metallic = 0.0
		"rubber": # 粗さ 0.85
			m.roughness = 0.85
			m.metallic = 0.0
		"metal": # 粗さ 0.3, metalness 0.8
			m.roughness = 0.3
			m.metallic = 0.8
		"prop": # MeshStandardMaterial: roughness .5, metalness .15
			m.roughness = 0.5
			m.metallic = 0.15
	m.shading_mode = BaseMaterial3D.SHADING_MODE_PER_PIXEL
	_mats[key] = m
	return m

## インポートした archer.glb のルートにマテリアルを再構成して割り当てる。
## model_root: glb を instantiate した Node (子孫の MeshInstance3D を走査)。
## keep_reg: 表示する登録記号メッシュ ("reg." + keep_reg 以外の reg.* は隠す)。
## 戻り値: { "meshes": 処理した MeshInstance3D 数, "split": 分割で増えた数,
##          "hidden_reg": 隠した reg メッシュ数, "no_color": 頂点色なし数 }
static func apply_materials(model_root: Node, keep_reg: String = DEFAULT_REG) -> Dictionary:
	var stats := {"meshes": 0, "split": 0, "hidden_reg": 0, "no_color": 0}
	if model_root == null:
		return stats
	var targets: Array[MeshInstance3D] = []
	_collect(model_root, targets)
	for mi in targets:
		stats["meshes"] += 1
		var nm := String(mi.name)
		# Godot の glTF インポートはノード名の "." を "_" に置換する
		# ("reg.N738SY" → "reg_N738SY") ので両形式を見る
		if nm.begins_with("reg.") or nm.begins_with("reg_"):
			if nm != "reg." + keep_reg and nm != "reg_" + keep_reg:
				mi.visible = false
				stats["hidden_reg"] += 1
				continue
		if mi.mesh == null:
			stats["no_color"] += 1
			continue
		var replaced := _apply_to_instance(mi, nm == "prop")
		stats["split"] += replaced
		if replaced < 0:
			stats["no_color"] += 1
	return stats

static func _collect(n: Node, out: Array[MeshInstance3D]) -> void:
	if n is MeshInstance3D:
		out.append(n)
	for c in n.get_children():
		_collect(c, out)

## 1 つの MeshInstance3D の全サーフェスをクラス別に分割し直す。
## 戻り値: 追加で生成した MeshInstance3D の数 (0 = 単一クラスのため material_override
## のみ、-1 = 頂点色が無く何もしなかった)。
static func _apply_to_instance(mi: MeshInstance3D, is_prop: bool) -> int:
	var src := mi.mesh as ArrayMesh
	if src == null:
		return -1
	# クラス → (positions, normals, indices の元頂点番号) を集める
	var buckets := {} # String -> Dictionary of Packed arrays per surface merged
	var any_color := false
	for si in range(src.get_surface_count()):
		var arrs := src.surface_get_arrays(si)
		var pos: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
		var nrm: PackedVector3Array = arrs[Mesh.ARRAY_NORMAL]
		var col: PackedColorArray = arrs[Mesh.ARRAY_COLOR]
		var idx: PackedInt32Array = arrs[Mesh.ARRAY_INDEX]
		if col.is_empty() or pos.is_empty():
			continue
		any_color = true
		if idx.is_empty():
			idx = PackedInt32Array()
			idx.resize(pos.size())
			for i in range(pos.size()):
				idx[i] = i
		for t in range(0, idx.size() - 2, 3):
			var i0 := idx[t]
			var cls := paint_class(col[i0])
			if not buckets.has(cls):
				buckets[cls] = {"pos": PackedVector3Array(), "nrm": PackedVector3Array(), "col": PackedColorArray(), "idx": PackedInt32Array(), "seen": {}}
			var b: Dictionary = buckets[cls]
			# Packed 配列は辞書から取り出すたびにコピー扱いになるため、ローカルで
			# 編集して書き戻す (append を一時オブジェクトに対して行うと消える)
			var bp: PackedVector3Array = b["pos"]
			var bn: PackedVector3Array = b["nrm"]
			var bc: PackedColorArray = b["col"]
			var bi: PackedInt32Array = b["idx"]
			var seen: Dictionary = b["seen"]
			for k in range(3):
				var vi := idx[t + k]
				if not seen.has(vi):
					seen[vi] = bp.size()
					bp.append(pos[vi])
					if nrm.size() == pos.size():
						bn.append(nrm[vi])
					# alpha (= AO) は線形空間で rgb に焼き、alpha は 1.0 にする
					# (StandardMaterial3D は albedo alpha を透明扱いするため)
					bc.append(bake_ao(col[vi]))
				bi.append(int(seen[vi]))
			b["pos"] = bp
			b["nrm"] = bn
			b["col"] = bc
			b["idx"] = bi
			b["seen"] = seen
	if not any_color:
		return -1
	# 単一クラスでも AO 焼き込み後の色でメッシュを作り直す (戻り値は従来どおり 0)。
	# 複数クラス: 元のインスタンスは最初のクラスにし、残りは子として同名+接尾辞で足す
	# (親子にすると変換は identity の子で問題ない: 頂点は機体ローカル座標のまま)
	var first := true
	var added := 0
	for cls in buckets.keys():
		var b: Dictionary = buckets[cls]
		var am := ArrayMesh.new()
		var arrs: Array = []
		arrs.resize(Mesh.ARRAY_MAX)
		arrs[Mesh.ARRAY_VERTEX] = b["pos"]
		if (b["nrm"] as PackedVector3Array).size() == (b["pos"] as PackedVector3Array).size():
			arrs[Mesh.ARRAY_NORMAL] = b["nrm"]
		arrs[Mesh.ARRAY_INDEX] = b["idx"]
		# 色はマテリアルではなく元頂点色が要る (白/紺/金などを 1 クラス=1 マテリアルで描くため)
		arrs[Mesh.ARRAY_COLOR] = b["col"]
		am.add_surface_from_arrays(Mesh.PRIMITIVE_TRIANGLES, arrs)
		var mat := material_for(cls, is_prop)
		if first:
			mi.mesh = am
			mi.material_override = mat
			first = false
		else:
			var extra := MeshInstance3D.new()
			extra.name = String(mi.name) + "_" + cls
			extra.mesh = am
			extra.material_override = mat
			extra.cast_shadow = mi.cast_shadow
			mi.add_child(extra)
			added += 1
	return added
