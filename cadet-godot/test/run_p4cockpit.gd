extends SceneTree

## CADET Godot port — Phase 4 コックピット内装 (項目2) の構造検証。
## 使い方: godot --headless --path ~/workspace/cadet-godot -s test/run_p4cockpit.gd
## 終了コード: 0 = 全合格, 1 = 不合格あり。
## 検証内容:
##   1. 契約: build_cockpit() -> "Cockpit"、PFD_SLOT / MFD_SLOT の位置と寸法。
##   2. グレアシールドのアーチ: 生成メッシュ頂点から中央クレストと両端の
##      高さ差を実測し ≒28mm、中央部 (|x|<=0.25) がフラットであること。
##      パネル面の角ラップ (panel_wrap_z) と panelTopY の関数値も確認。
##   3. 窓開口: 窓帯メッシュの三角形重心が窓ポリゴン内部 (縁から 25mm 内側)
##      に無いこと、柱・上下帯が残っていること、EYE から各窓中心への線分が
##      窓帯メッシュと交差しないこと、前方視界 (グレアシールド上方) が開くこと。
##   4. AO: archer.glb の COLOR_0.a が、適用後の頂点色に線形空間での乗算
##      (toLin -> x a -> sRGB) として反映され、alpha は 1 に戻ること。
##      マテリアルは StandardMaterial3D + vertex_color_use_as_albedo のまま。

const CK = preload("res://src/cockpit_build.gd")
const AV = preload("res://src/aircraft_visual.gd")

var failures := 0
var checks := 0

func _check(label: String, ok: bool, detail: String = "") -> void:
	checks += 1
	if not ok:
		failures += 1
		print("FAIL ", label, " ", detail)
	else:
		print("ok   ", label, " ", detail)

func _initialize() -> void:
	_run()
	print("P4COCKPIT checks=%d failures=%d" % [checks, failures])
	quit(1 if failures > 0 else 0)

func _run() -> void:
	# ---------- 1. 契約 ----------
	var ckpt: Node3D = CK.build_cockpit()
	root.add_child(ckpt)
	_check("cockpit root name", ckpt.name == "Cockpit")
	var pfd_slot := ckpt.get_node_or_null("PFD_SLOT") as MeshInstance3D
	var mfd_slot := ckpt.get_node_or_null("MFD_SLOT") as MeshInstance3D
	_check("PFD_SLOT exists", pfd_slot != null)
	_check("MFD_SLOT exists", mfd_slot != null)
	if pfd_slot != null:
		var q := pfd_slot.mesh as QuadMesh
		_check("PFD_SLOT size 0.21x0.1575", q != null and q.size.is_equal_approx(Vector2(0.21, 0.1575)))
		_check("PFD_SLOT pos", pfd_slot.position.is_equal_approx(Vector3(-0.30, 0.352, -1.0825)), str(pfd_slot.position))
	if mfd_slot != null:
		_check("MFD_SLOT pos", mfd_slot.position.is_equal_approx(Vector3(0.051, 0.352, -1.0825)), str(mfd_slot.position))
	for nm in ["Panel", "PanelTop", "PanelBack", "Glareshield", "Floor", "Roof", "AftBulkhead",
			"WindowBandL", "WindowBandR", "WinFrameL1", "WinGlassL1", "WinGlassR3", "WindshieldGlass",
			"CheekL", "CheekR", "APillarL0", "APillarR0", "BPillarL", "SillTrimL", "SillTrimR",
			"WSBow0", "WSCenter0", "DoorHandle", "DoorSeamF", "SidePanelL", "SidePanelR",
			"YokeGripL", "SeatCushionL", "Standby1"]:
		_check("cockpit has " + nm, ckpt.get_node_or_null(nm) != null)
	var roof := ckpt.get_node_or_null("Roof") as MeshInstance3D
	_check("Roof is an arch sheet (ArrayMesh)", roof != null and roof.mesh is ArrayMesh)
	_check("cockpit children >= 60", ckpt.get_child_count() >= 60, "children=%d" % ckpt.get_child_count())

	# ---------- 2. グレアシールドのアーチ実測 ----------
	_check("glare_drop(0) == 0", absf(CK.glare_drop(0.0)) < 1e-9)
	_check("glare_drop(0.25) == 0 (flat edge)", absf(CK.glare_drop(0.25)) < 1e-9)
	_check("glare_drop(0.545) == 0.028", absf(CK.glare_drop(0.545) - 0.028) < 1e-6, str(CK.glare_drop(0.545)))
	_check("panel_top_y(0) == 0.457", absf(CK.panel_top_y(0.0) - 0.457) < 1e-6)
	_check("panel_wrap_z(0.5) == 0", absf(CK.panel_wrap_z(0.5)) < 1e-9)
	_check("panel_wrap_z(0.553) == 0.012", absf(CK.panel_wrap_z(0.553) - 0.012) < 1e-6, str(CK.panel_wrap_z(0.553)))
	var glare := ckpt.get_node_or_null("Glareshield") as MeshInstance3D
	_check("Glareshield is ArrayMesh", glare != null and glare.mesh is ArrayMesh)
	if glare != null:
		var vs := _verts(glare)
		# クレスト = リップ profile の頂点 (z = -1.05) の高さ。フード斜面の点
		# (原典フォールバックでも slope は弓なり前の高さから引かれる) と混ざら
		# ないよう z で絞る。
		var crest_c := -1e9
		var crest_m := -1e9
		var crest_e := -1e9
		for p in vs:
			if absf(p.z + 1.05) > 0.003:
				continue
			if absf(p.x) < 0.03:
				crest_c = maxf(crest_c, p.y)
			if absf(p.x) > 0.20 and absf(p.x) < 0.24:
				crest_m = maxf(crest_m, p.y)
			if absf(p.x) > 0.538 and absf(p.x) < 0.5535:
				crest_e = maxf(crest_e, p.y)
		_check("crest centre height ~0.4795", absf(crest_c - 0.4795) < 0.002, "y=%.4f" % crest_c)
		_check("centre flat: |centre - mid| < 2mm", absf(crest_c - crest_m) < 0.002, "mid=%.4f" % crest_m)
		var drop_meas := crest_c - crest_e
		_check("arch drop at ends ~= 28mm (24..32)", drop_meas > 0.024 and drop_meas < 0.032, "drop=%.4f" % drop_meas)
	# パネル面のラップ実測: 角の z - 中央の z
	var panel := ckpt.get_node_or_null("Panel") as MeshInstance3D
	if panel != null:
		var z_c := -1e9
		var z_e := -1e9
		for p in _verts(panel):
			if absf(p.x) < 0.01:
				z_c = maxf(z_c, p.z)
			if absf(p.x) > 0.543:
				z_e = maxf(z_e, p.z)
		var wrap_meas := z_e - z_c
		_check("panel face wrap at |x|=0.545 (2.5..5mm aft)", wrap_meas > 0.0025 and wrap_meas < 0.005, "wrap=%.4f" % wrap_meas)

	# ---------- 3. 窓開口 ----------
	for tag in ["L", "R"]:
		var band := ckpt.get_node_or_null("WindowBand" + tag) as MeshInstance3D
		_check("WindowBand" + tag + " is ArrayMesh", band != null and band.mesh is ArrayMesh)
		if band == null:
			continue
		var tris := _tris(band)
		_check("band" + tag + " has triangles", tris.size() > 500, "tris=%d" % tris.size())
		var bad := 0
		var has_post := false
		var has_below := false
		var has_above := false
		for t in tris:
			var cen: Vector3 = (t[0] + t[1] + t[2]) / 3.0
			for poly in CK.WIN_POLYS:
				if CK._in_poly(cen.z, cen.y, poly) and _edge_dist(cen.z, cen.y, poly) > 0.025:
					bad += 1
			if cen.z > -0.21 and cen.z < -0.14 and cen.y > 0.50 and cen.y < 0.62:
				has_post = true
			if cen.y > 0.38 and cen.y < 0.40:
				has_below = true
			if cen.y > 0.735 and cen.y < 0.75:
				has_above = true
		_check("band" + tag + ": no wall inside window openings", bad == 0, "bad=%d" % bad)
		_check("band" + tag + ": post between W1/W2 present", has_post)
		_check("band" + tag + ": strip below windows present", has_below)
		_check("band" + tag + ": strip above windows present", has_above)
	# EYE から窓中心への視線が窓帯に遮られないこと
	var eye: Vector3 = CK.EYE
	var targets := {
		"L": [Vector3(-CK.band_x(0.568), 0.568, -0.62), Vector3(-CK.band_x(0.557), 0.557, 1.00)],
		"R": [Vector3(CK.band_x(0.560), 0.560, 0.25)],
	}
	for tag in targets.keys():
		var band := ckpt.get_node_or_null("WindowBand" + tag) as MeshInstance3D
		var tris := _tris(band)
		for tgt in targets[tag]:
			var hit := false
			for t in tris:
				if _seg_tri(eye, tgt, t[0], t[1], t[2]):
					hit = true
					break
			_check("eye ray through window " + tag + " " + str(tgt), not hit)
	# 前方: グレアシールド上方を抜ける視線
	var fwd_a := eye
	var fwd_b := eye + Vector3(0, -0.21, -3.0)
	var gtris := _tris(glare)
	var fwd_hit := false
	for t in gtris:
		if _seg_tri(fwd_a, fwd_b, t[0], t[1], t[2]):
			fwd_hit = true
			break
	_check("forward ray clears the glareshield crest", not fwd_hit)

	# ---------- 4. AO (aircraft_visual) ----------
	var packed = load("res://assets/archer.glb")
	_check("archer.glb loads", packed != null)
	var raw = packed.instantiate()
	var raw_body := _find_mi(raw, "body")
	_check("raw body found", raw_body != null)
	var samples: Array = []
	if raw_body != null:
		var am := raw_body.mesh as ArrayMesh
		var arrs := am.surface_get_arrays(0)
		var pos: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
		var col: PackedColorArray = arrs[Mesh.ARRAY_COLOR]
		for i in range(pos.size()):
			if col[i].a < 0.75:
				samples.append({"p": pos[i], "c": col[i]})
	_check("AO samples (a<0.75) >= 20", samples.size() >= 20, "n=%d" % samples.size())
	var model = packed.instantiate()
	root.add_child(model)
	var stats: Dictionary = AV.apply_materials(model)
	_check("apply_materials no_color == 0", int(stats["no_color"]) == 0, str(stats))
	var body2 := _find_mi(model, "body")
	_check("processed body found", body2 != null)
	if body2 != null:
		var mat := body2.material_override as StandardMaterial3D
		_check("body material is StandardMaterial3D + vertex albedo",
			mat != null and mat.vertex_color_use_as_albedo)
		var got := {} # pos key -> Array[Color]
		_collect_colors(body2, got)
		var matched := 0
		var darkened := 0
		for s in samples:
			var key := _pkey(s["p"])
			if not got.has(key):
				continue
			var want: Color = _ao_expected(s["c"])
			for c in got[key]:
				if absf(c.r - want.r) <= 0.02 and absf(c.g - want.g) <= 0.02 and absf(c.b - want.b) <= 0.02 and absf(c.a - 1.0) < 1e-6:
					matched += 1
					break
			var raw_c: Color = s["c"]
			for c in got[key]:
				if absf(c.r - raw_c.r) > 0.05 or absf(c.g - raw_c.g) > 0.05 or absf(c.b - raw_c.b) > 0.05:
					darkened += 1
					break
		_check("AO baked colours match (toLin * a -> sRGB) >= 90%",
			samples.size() > 0 and float(matched) / float(samples.size()) >= 0.9,
			"matched=%d/%d" % [matched, samples.size()])
		_check("AO actually darkens some vertices", darkened >= 10, "darkened=%d" % darkened)
		var alpha_ok := true
		for key in got.keys():
			for c in got[key]:
				if absf(c.a - 1.0) > 1e-6:
					alpha_ok = false
		_check("all processed vertex alphas == 1", alpha_ok)

# ---------------------------------------------------------------- helpers
func _verts(mi: MeshInstance3D) -> PackedVector3Array:
	var am := mi.mesh as ArrayMesh
	if am == null:
		return PackedVector3Array()
	return am.surface_get_arrays(0)[Mesh.ARRAY_VERTEX]

func _tris(mi: MeshInstance3D) -> Array:
	var out: Array = []
	var am := mi.mesh as ArrayMesh
	if am == null:
		return out
	for si in range(am.get_surface_count()):
		var arrs := am.surface_get_arrays(si)
		var pos: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
		var idx = arrs[Mesh.ARRAY_INDEX] # 非インデックス面では null
		if idx == null or idx.is_empty():
			for i in range(0, pos.size() - 2, 3):
				out.append([pos[i], pos[i + 1], pos[i + 2]])
		else:
			for i in range(0, idx.size() - 2, 3):
				out.append([pos[idx[i]], pos[idx[i + 1]], pos[idx[i + 2]]])
	return out

func _edge_dist(z: float, y: float, poly: Array) -> float:
	var p := Vector2(z, y)
	var best := 1e9
	for i in range(poly.size()):
		var a: Vector2 = poly[i]
		var b: Vector2 = poly[(i + 1) % poly.size()]
		var ab := b - a
		var t := clampf((p - a).dot(ab) / maxf(ab.length_squared(), 1e-12), 0.0, 1.0)
		best = minf(best, (a + ab * t).distance_to(p))
	return best

func _seg_tri(a: Vector3, b: Vector3, p0: Vector3, p1: Vector3, p2: Vector3) -> bool:
	var dir := b - a
	var e1 := p1 - p0
	var e2 := p2 - p0
	var pv := dir.cross(e2)
	var det := e1.dot(pv)
	if absf(det) < 1e-9:
		return false
	var inv := 1.0 / det
	var tv := a - p0
	var u := tv.dot(pv) * inv
	if u < -1e-6 or u > 1.0 + 1e-6:
		return false
	var qv := tv.cross(e1)
	var v := dir.dot(qv) * inv
	if v < -1e-6 or u + v > 1.0 + 1e-6:
		return false
	var t := e2.dot(qv) * inv
	return t > 1e-6 and t < 1.0 - 1e-6

func _find_mi(n: Node, nm: String) -> MeshInstance3D:
	if n is MeshInstance3D and String(n.name) == nm:
		return n
	for c in n.get_children():
		var r := _find_mi(c, nm)
		if r != null:
			return r
	return null

func _pkey(p: Vector3) -> String:
	return "%.3f,%.3f,%.3f" % [p.x, p.y, p.z]

func _collect_colors(n: Node, out: Dictionary) -> void:
	if n is MeshInstance3D:
		var am := (n as MeshInstance3D).mesh as ArrayMesh
		if am != null:
			for si in range(am.get_surface_count()):
				var arrs := am.surface_get_arrays(si)
				var pos: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
				var col: PackedColorArray = arrs[Mesh.ARRAY_COLOR]
				for i in range(pos.size()):
					var key := _pkey(pos[i])
					if not out.has(key):
						out[key] = []
					out[key].append(col[i])
	for c in n.get_children():
		_collect_colors(c, out)

func _tl(v: float) -> float:
	return v / 12.92 if v <= 0.04045 else pow((v + 0.055) / 1.055, 2.4)

func _ts(v: float) -> float:
	var c := clampf(v, 0.0, 1.0)
	return c * 12.92 if c <= 0.0031308 else 1.055 * pow(c, 1.0 / 2.4) - 0.055

func _ao_expected(c: Color) -> Color:
	var a := clampf(c.a, 0.0, 1.0)
	return Color(_ts(_tl(c.r) * a), _ts(_tl(c.g) * a), _ts(_tl(c.b) * a), 1.0)
