extends SceneTree

## CADET Godot port — Phase 2 見た目の検証 (マテリアル再構成 / コックピット / G1000)
## 使い方 (実描画でピクセルまで見るため Xvfb + llvmpipe で):
##   xvfb-run -a -s "-screen 0 1280x840x24" \
##     ~/workspace/tools/godot/Godot_v4.7.2-stable_linux.x86_64 \
##     --path ~/workspace/cadet-godot --resolution 1280x840 \
##     -s test/verify_visual.gd
## 終了コード: 0 = 全合格, 1 = 不合格あり。画像は /tmp/verify_visual.png に残る。
## (ヘッドレス --headless でも構造チェックは通るが、ピクセルチェックは skip される)

const AV = preload("res://src/aircraft_visual.gd")
const CK = preload("res://src/cockpit_build.gd")
const G1 = preload("res://src/g1000.gd")

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

func _run() -> void:
	# ---------- 1. archer.glb + apply_materials ----------
	var packed = load("res://assets/archer.glb")
	_check("glb loads", packed != null)
	var model = packed.instantiate()
	var aircraft := Node3D.new()
	aircraft.name = "Aircraft"
	root.add_child(aircraft)
	aircraft.add_child(model)
	var stats: Dictionary = AV.apply_materials(model)
	print("apply_materials stats: ", stats)
	_check("meshes >= 21", int(stats["meshes"]) >= 21, str(stats))
	_check("hidden_reg == 8 (N738SY 以外)", int(stats["hidden_reg"]) == 8, str(stats))
	_check("no_color == 0", int(stats["no_color"]) == 0, str(stats))
	# 登録記号: 既定だけ見える
	var reg_seen := _count_reg(model, true)
	var reg_hidden := _count_reg(model, false)
	_check("exactly one reg visible", reg_seen == 1 and reg_hidden == 8, "seen=%d hidden=%d" % [reg_seen, reg_hidden])
	# body: マテリアルが付き、頂点色に紺 (NAVY 0.075,0.16,0.36) が残っている
	var body := _find_mi(model, "body")
	_check("body found", body != null)
	if body != null:
		var mat := body.material_override as StandardMaterial3D
		_check("body material vertex_color_use_as_albedo", mat != null and mat.vertex_color_use_as_albedo)
		_check("body has navy vertex colour", _has_color_near(body, Color(0.075, 0.16, 0.36), 0.04))
		_check("body has white vertex colour", _has_color_near(body, Color(0.94, 0.94, 0.92), 0.04))
	# prop: 専用マテリアル + 黄色チップ
	var prop := _find_mi(model, "prop")
	_check("prop found", prop != null)
	if prop != null:
		_check("prop has tip-yellow vertex colour", _has_color_near(prop, Color(0.95, 0.78, 0.15), 0.05))
	# クラス分割で MeshInstance3D が増えている (glass/rubber/metal が別ノードに)
	var mi_count := _count_mi(model)
	_check("split created extra instances (>21)", mi_count > 21, "count=%d" % mi_count)

	# ---------- 2. cockpit_build ----------
	var ckpt: Node3D = CK.build_cockpit()
	aircraft.add_child(ckpt)
	_check("cockpit root name", ckpt.name == "Cockpit")
	var pfd_slot := ckpt.get_node_or_null("PFD_SLOT") as MeshInstance3D
	var mfd_slot := ckpt.get_node_or_null("MFD_SLOT") as MeshInstance3D
	_check("PFD_SLOT exists", pfd_slot != null)
	_check("MFD_SLOT exists", mfd_slot != null)
	if pfd_slot != null:
		var q := pfd_slot.mesh as QuadMesh
		_check("PFD_SLOT size 0.21x0.1575", q != null and q.size.is_equal_approx(Vector2(0.21, 0.1575)), str(q.size if q else null))
		_check("PFD_SLOT pos", pfd_slot.position.is_equal_approx(Vector3(-0.30, 0.352, -1.0825)), str(pfd_slot.position))
	if mfd_slot != null:
		_check("MFD_SLOT pos x", absf(mfd_slot.position.x - 0.051) < 0.001, str(mfd_slot.position))
	_check("cockpit children >= 30", ckpt.get_child_count() >= 30, "children=%d" % ckpt.get_child_count())
	for nm in ["Panel", "Glareshield", "Floor", "YokeGripL", "SeatCushionL", "Standby1"]:
		_check("cockpit has " + nm, ckpt.get_node_or_null(nm) != null)

	# ---------- 3. G1000 ----------
	var out: Dictionary = {
		"ias": 85.0, "tas": 90.0, "gs": 88.0, "trk": 355.0, "hdgTrue": 354.0,
		"pitch": 3.0, "bank": -12.0, "vsi": 450.0, "altTrue": 1255.0, "rpm": 2350.0,
		"fuel": [19.2, 19.0], "fuelFlow": 8.4, "oilP": [72], "oilT": [180],
		"rwyAlong": 600.0, "rwyCross": -50.0, "oat": 15.0, "stallWarn": false, "onGround": false,
	}
	var pfd = G1.new()
	pfd.position = Vector2(0, 0)
	pfd.size = Vector2(640, 400)
	root.add_child(pfd)
	pfd.set_mode("PFD")
	pfd.set_state({}, out, {})
	_check("knob HDG +1", pfd.knob("HDG", 1) == "HDG 001")
	_check("knob ALT -1 -> 2900", pfd.knob("ALT", -1) == "ALT SEL 2900")
	_check("knob RANGE +1 -> 15 NM", pfd.knob("RANGE", 1) == "RANGE 15 NM")
	var mfd = G1.new()
	mfd.position = Vector2(0, 420)
	mfd.size = Vector2(640, 400)
	root.add_child(mfd)
	mfd.set_mode("MFD")
	mfd.set_state({}, out, {"elec": {"volts": 14.1, "amps": 12.0}})

	# ---------- 4. 実描画 (Xvfb 前提): 環境 + カメラ ----------
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_COLOR
	env.background_color = Color(0.45, 0.65, 0.9)
	env.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	env.ambient_light_color = Color(0.7, 0.7, 0.72)
	we.environment = env
	root.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, -30, 0)
	root.add_child(sun)
	var cam := Camera3D.new()
	cam.transform = Transform3D(Basis(), Vector3(6.5, 2.2, -6.5)).looking_at(Vector3(0, 0.2, 0.6), Vector3.UP)
	root.add_child(cam)
	cam.make_current()

	for i in range(6):
		await process_frame
	# (headless では frame_post_draw が来ないことがあるため await しない:
	#  Xvfb 実行時は process_frame の合間に描画が進む)
	var img := root.get_texture().get_image() if root.get_texture() != null else null
	if img != null:
		img.save_png("/tmp/verify_visual.png")
		print("screenshot: ", img.get_size())
	if DisplayServer.get_name() == "headless" or img == null:
		print("skip pixel checks (headless / no viewport image)")
	else:
		# PFD 領域 (0..640, 0..400): 姿勢儀の空色 #2f6fbd が在る
		_check("PFD sky pixels present", _region_has(img, Rect2i(80, 40, 400, 200), Color("2f6fbd"), 0.06, 40))
		# MFD 領域 (0..640, 420..820): マップ背景 #0a1420 とシアンの訓練点
		_check("MFD map bg pixels present", _region_has(img, Rect2i(140, 460, 460, 300), Color("0a1420"), 0.04, 40))
		_check("MFD cyan pixels present", _region_has(img, Rect2i(140, 460, 460, 300), Color("33d6ff"), 0.10, 5))
		# 3D 領域 (右側): 機体の白と紺が在る (白一色でない)
		_check("aircraft white pixels present", _region_has(img, Rect2i(660, 100, 600, 500), Color(0.94, 0.94, 0.92), 0.10, 20))
		_check("aircraft navy pixels present", _region_has(img, Rect2i(660, 100, 600, 500), Color(0.075, 0.16, 0.36), 0.10, 10))
	print("VERIFY_VISUAL checks=%d failures=%d" % [checks, failures])
	quit(1 if failures > 0 else 0)

func _count_reg(n: Node, want_visible: bool) -> int:
	var total := 0
	if n is MeshInstance3D and (String(n.name).begins_with("reg.") or String(n.name).begins_with("reg_")):
		if (n as MeshInstance3D).visible == want_visible:
			total += 1
	for c in n.get_children():
		total += _count_reg(c, want_visible)
	return total

func _find_mi(n: Node, nm: String) -> MeshInstance3D:
	if n is MeshInstance3D and String(n.name) == nm:
		return n
	for c in n.get_children():
		var r := _find_mi(c, nm)
		if r != null:
			return r
	return null

func _count_mi(n: Node) -> int:
	var total := 1 if n is MeshInstance3D else 0
	for c in n.get_children():
		total += _count_mi(c)
	return total

func _has_color_near(mi: MeshInstance3D, want: Color, tol: float) -> bool:
	var am := mi.mesh as ArrayMesh
	if am == null:
		return false
	for si in range(am.get_surface_count()):
		var arrs := am.surface_get_arrays(si)
		var col: PackedColorArray = arrs[Mesh.ARRAY_COLOR]
		for c in col:
			if absf(c.r - want.r) <= tol and absf(c.g - want.g) <= tol and absf(c.b - want.b) <= tol:
				return true
	# 分割された子インスタンスも見る
	for ch in mi.get_children():
		if ch is MeshInstance3D and _has_color_near(ch, want, tol):
			return true
	return false

func _region_has(img: Image, r: Rect2i, want: Color, tol: float, min_count: int) -> bool:
	var n := 0
	var x1 := mini(r.position.x + r.size.x, img.get_width())
	var y1 := mini(r.position.y + r.size.y, img.get_height())
	for y in range(r.position.y, y1, 3):
		for x in range(r.position.x, x1, 3):
			var c := img.get_pixel(x, y)
			if absf(c.r - want.r) <= tol and absf(c.g - want.g) <= tol and absf(c.b - want.b) <= tol:
				n += 1
				if n >= min_count:
					return true
	return false
