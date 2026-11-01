class_name CockpitBuild
extends RefCounted

## CADET Godot port — Phase 4: コックピット内装の本格化 (項目2)
## 原典: cadet/src/aircraft/cockpit.js (898fe8a, next/integrated) のレイアウト定数と
## キャビン形状、およびグレアシールドのアーチ仕様 (commit a79cba2
## "bow the glareshield and the panel's top edge like the real aircraft",
## cadet/tools/aircraft/cockpit_glareshield.py の BOW 仕様と check())。
## 機体ボディ座標系 (x = 右翼, y = 上, -z = 機首, 原点 = CG, 単位 m)。
##
## 寸法根拠 (cockpit.js @898fe8a):
##   EYE0 = (-0.3, 0.62, -0.4)   左席の目 (scenes/main.gd のカメラ位置と一致)
##   FLOOR = -0.40, FIRE(wall) = -1.45, AFT(bulkhead) = 1.65
##   パネル面 PZ = -1.10, 上端 PTOP = 0.465, 下端 PBOT = 0.03
##   側窓帯: SILL = 0.38, WTOP = 0.75, HW = 0.56 (窓帯下端の半幅),
##           HWT = 0.49 (窓帯上端の半幅), ROOF = 0.845 (ルーフ頂点)
##           bandX(y) = HW + KX*(y-SILL), KX = -(HW-HWT)/(WTOP-SILL) ≈ -0.18919
##           lowX(y): 床→シルの下壁プロファイル (床で 0.46 まで絞る)
##           roofY(x) = WTOP + (ROOF-WTOP)*sqrt(1-(x/HWT)^2)
##   フロントガラス WS: z0=-1.30, y0=0.425 (基部), z1=-0.84, y1=0.815 (上端),
##           bow=0.12: wsZ(x,y) = z0 + (z1-z0)*(y-y0)/(y1-y0) + bow*(x/0.5)^2
##   側窓ポリゴン W1/W2/W3 ((z,y) 頂点列) とその外周リング・柱位置は
##           WINDOWS / POSTS の定義どおり (本ファイルの WIN_POLYS に転記)。
##   PFD 中心 (-0.30, 0.34), MFD 中心 (0.051, 0.34), オーディオ (-0.1245, 0.34)
##   予備計器 x = 0.255, y = [0.410, 0.327, 0.244]
##   座席中心 |x| = 0.29, 操縦桿 YOKE = { y: 0.218, z: -0.855 }
##   G1000 ベゼル (g1000.js BEZEL): w 0.27 × h 0.21 × depth 0.02,
##   画面 0.21 × 0.1575, 画面中心はベゼル中心 +0.012 (y), ベゼル前面 BZ = PZ + 0.02
##
## グレアシールドのアーチ (a79cba2 / cockpit_glareshield.py の BOW = [0.25, 0.545, 0.028, 4]):
##   glareDrop(x) = 0 (|x| <= 0.25 の中央フラット), その外側は四次曲線で
##   |x| = 0.545 (ロールの端) で 28mm ドロップ。リップ profile ([z,y]) は
##   cockpit.js の GLARE.lip そのままに各点へ drop を引く。
##   パネル上端 panelTopY(x) = PTOP - 0.008 - glareDrop(x) (フレーム/フェイス共通)。
##   パネル面のラップ panelWrapZ(x) = 0 (|x| <= 0.535), 角 |x| = 0.553 で
##   最大 12mm 後方 (二次曲線)。計器が載る |x| <= 0.535 は平坦なので
##   ベゼル/スロット位置は Phase 2 から不変。
##   A ピラー足元のチーク (壁色) は同コミットの profile
##   [[-1.183,0.400],[-1.148,0.4245],[-1.085,0.4495],[-1.030,0.4435],[-1.030,0.400]]
##   ((z,y)、x は 0.500..0.556) を転記し、下端は panelTopY(x)-0.004 に合わせる。
##
## 使い方 (統合側・契約は Phase 2 から不変):
##   var ckpt = CockpitBuild.build_cockpit()   # -> Node3D (名前 "Cockpit")
##   aircraft_node.add_child(ckpt)             # 機体ルート直下 (ボディ座標)
##   var pfd_slot = ckpt.get_node("PFD_SLOT")  # G1000 画面を貼る矩形 (QuadMesh)
##   var mfd_slot = ckpt.get_node("MFD_SLOT")

const EYE := Vector3(-0.3, 0.62, -0.4)
const FLOOR := -0.40
const FIRE := -1.45
const AFT := 1.65
const PZ := -1.10
const PTOP := 0.465
const PBOT := 0.03
const BZ := PZ + 0.02 # ベゼル前面 z
const SCREEN_W := 0.21
const SCREEN_H := 0.1575
const SCREEN_DY := 0.012 # ベゼル中心から画面中心への y オフセット
const PFD_C := Vector2(-0.30, 0.34)
const MFD_C := Vector2(0.051, 0.34)
const AUD_C := Vector2(-0.1245, 0.34)
const STBY_X := 0.255
const STBY_Y: Array[float] = [0.410, 0.327, 0.244]
const SEAT_X := 0.29
# --- Phase 4: キャビンシェル (cockpit.js の SILL/WTOP/HW/HWT/ROOF/WS) ---
const SILL := 0.38
const WTOP := 0.75
const HW := 0.56
const HWT := 0.49
const ROOF := 0.845
const WS_Z0 := -1.30
const WS_Y0 := 0.425
const WS_Z1 := -0.84
const WS_Y1 := 0.815
const WS_BOW := 0.12
const KX := -(HW - HWT) / (WTOP - SILL)
const GLARE_X := 0.553 # グレアシールドの半幅 (GLARE.x)
# 側窓ポリゴン ((z,y) 頂点列、cockpit.js の W1/W2/W3)
const WIN_POLYS: Array = [
	[Vector2(-1.13, 0.405), Vector2(-0.26, 0.405), Vector2(-0.26, 0.732), Vector2(-0.755, 0.732)],
	[Vector2(-0.09, 0.405), Vector2(0.60, 0.405), Vector2(0.52, 0.715), Vector2(-0.09, 0.722)],
	[Vector2(0.80, 0.425), Vector2(1.20, 0.47), Vector2(1.17, 0.66), Vector2(0.80, 0.69)],
]

static var _mats: Dictionary = {}

# ---------------------------------------------------------------- 形状関数 (cockpit.js の同名関数と同一式)
static func band_x(y: float) -> float:
	return HW + KX * (y - SILL)

static func low_x(y: float) -> float:
	var v := clampf((y - FLOOR) / (SILL - FLOOR), 0.0, 1.0)
	return HW - 0.10 * pow(1.0 - minf(1.0, v / 0.45), 2.0)

static func roof_y(x: float) -> float:
	return WTOP + (ROOF - WTOP) * sqrt(maxf(0.0, 1.0 - (x / HWT) * (x / HWT)))

static func ws_z(x: float, y: float) -> float:
	return WS_Z0 + (WS_Z1 - WS_Z0) * (y - WS_Y0) / (WS_Y1 - WS_Y0) + WS_BOW * (x / 0.5) * (x / 0.5)

## グレアシールドのアーチ: 中央 |x|<=0.25 は 0、|x|=0.545 で 0.028 (四次)。
static func glare_drop(x: float) -> float:
	var ax := absf(x)
	if ax <= 0.25:
		return 0.0
	return 0.028 * pow(minf(1.0, (ax - 0.25) / (0.545 - 0.25)), 4.0)

## パネル上端の高さ (アーチに従う)。
static func panel_top_y(x: float) -> float:
	return PTOP - 0.008 - glare_drop(x)

## パネル面の角の後方スイープ: |x|<=0.535 は 0、|x|=0.553 で 0.012。
static func panel_wrap_z(x: float) -> float:
	var ax := absf(x)
	if ax <= 0.535:
		return 0.0
	var t := (ax - 0.535) / 0.018
	return 0.012 * t * t

# ---------------------------------------------------------------- マテリアル / 形状ヘルパ
static func _mat(hex: int, rough: float = 0.7, metal: float = 0.0, ds: bool = false) -> StandardMaterial3D:
	var key := "%d|%.3f|%.3f|%d" % [hex, rough, metal, 1 if ds else 0]
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = Color(float((hex >> 16) & 255) / 255.0, float((hex >> 8) & 255) / 255.0, float(hex & 255) / 255.0)
	m.roughness = rough
	m.metallic = metal
	if ds:
		m.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mats[key] = m
	return m

static func _glass_mat() -> StandardMaterial3D:
	var key := "glass_pane"
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA
	m.albedo_color = Color(0.62, 0.72, 0.78, 0.10)
	m.roughness = 0.06
	m.metallic = 0.0
	m.cull_mode = BaseMaterial3D.CULL_DISABLED
	_mats[key] = m
	return m

static func _box(parent: Node, nm: String, size: Vector3, pos: Vector3, mat: Material, rot := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = nm
	var bm := BoxMesh.new()
	bm.size = size
	mi.mesh = bm
	mi.position = pos
	mi.rotation = rot
	mi.material_override = mat
	parent.add_child(mi)
	return mi

static func _cyl(parent: Node, nm: String, radius: float, height: float, pos: Vector3, mat: Material, rot := Vector3.ZERO) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = nm
	var cm := CylinderMesh.new()
	cm.top_radius = radius
	cm.bottom_radius = radius
	cm.height = height
	cm.radial_segments = 20
	mi.mesh = cm
	mi.position = pos
	mi.rotation = rot
	mi.material_override = mat
	parent.add_child(mi)
	return mi

## 2 点間を結ぶ円柱 (ピラー/ボウ等のストラット)。
static func _strut(parent: Node, nm: String, p1: Vector3, p2: Vector3, r: float, mat: Material) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	mi.name = nm
	var d := p2 - p1
	var cm := CylinderMesh.new()
	cm.top_radius = r
	cm.bottom_radius = r
	cm.height = maxf(d.length(), 0.001)
	cm.radial_segments = 10
	mi.mesh = cm
	mi.material_override = mat
	mi.position = (p1 + p2) * 0.5
	if d.length() > 1e-6:
		mi.basis = Basis(Quaternion(Vector3.UP, d.normalized()))
	parent.add_child(mi)
	return mi

## 格子面 (sheet): fn(u, v) -> Vector3 を (nu+1)x(nv+1) 格子で結ぶ ArrayMesh。
## マテリアルは両面 (ds) 前提: 裏表の巻き方向に依存せず内装側から見える。
static func _sheet(parent: Node, nm: String, nu: int, nv: int, fn: Callable, mat: Material, flip := false) -> MeshInstance3D:
	var pts: Array = []
	for j in range(nv + 1):
		var row: Array = []
		for i in range(nu + 1):
			row.append(fn.call(float(i) / float(nu), float(j) / float(nv)))
		pts.append(row)
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for j in range(nv):
		for i in range(nu):
			var a: Vector3 = pts[j][i]
			var b: Vector3 = pts[j][i + 1]
			var c: Vector3 = pts[j + 1][i]
			var d: Vector3 = pts[j + 1][i + 1]
			if flip:
				st.add_vertex(a); st.add_vertex(c); st.add_vertex(b)
				st.add_vertex(b); st.add_vertex(c); st.add_vertex(d)
			else:
				st.add_vertex(a); st.add_vertex(b); st.add_vertex(c)
				st.add_vertex(b); st.add_vertex(d); st.add_vertex(c)
	st.generate_normals()
	var mi := MeshInstance3D.new()
	mi.name = nm
	mi.mesh = st.commit()
	mi.material_override = mat
	parent.add_child(mi)
	return mi

## 窓帯の平面上の点 ((z,y) → 3D)。off は帯の外向き法線方向のオフセット (m)。
static func _band_point(sd: float, zy: Vector2, off: float = 0.0) -> Vector3:
	var n := Vector3(sd * 0.9826, 0.1857, 0.0) # (1, -KX, 0) を正規化した外向き法線
	return Vector3(sd * band_x(zy.y), zy.y, zy.x) + n * off

static func _in_poly(z: float, y: float, poly: Array) -> bool:
	var inside := false
	var p := Vector2(z, y)
	var n := poly.size()
	for i in range(n):
		var a: Vector2 = poly[i]
		var b: Vector2 = poly[(i + 1) % n]
		if (a.y > p.y) != (b.y > p.y):
			var xi := a.x + (p.y - a.y) / (b.y - a.y) * (b.x - a.x)
			if p.x < xi:
				inside = not inside
	return inside

static func _in_windows(z: float, y: float) -> bool:
	for poly in WIN_POLYS:
		if _in_poly(z, y, poly):
			return true
	return false

# ---------------------------------------------------------------- キャビンシェル (Phase 4)
## 側壁: 下壁 (床→シル、lowX プロファイル) + 窓帯 (窓開口を持つ格子) + 柱・縁取り。
static func _build_side(parent: Node, sd: float, wall_ds: Material, trim: Material, side_panel: Material) -> void:
	var tag := "L" if sd < 0.0 else "R"
	var flip := sd < 0.0
	# 下壁: 床からシルまで、lowX(y) の膨らみを持つ面
	_sheet(parent, "Wall" + tag, 22, 8, func(u: float, v: float) -> Vector3:
		var y := FLOOR + (SILL - FLOOR) * v
		return Vector3(sd * low_x(y), y, FIRE + (AFT - FIRE) * u), wall_ds, flip)
	# 張り出し内装パネル (右側はドア内張り)
	_sheet(parent, "SidePanel" + tag, 6, 6, func(u: float, v: float) -> Vector3:
		var y := -0.27 + (SILL - 0.02 + 0.27) * v
		return Vector3(sd * (low_x(y) - 0.0025), y, -1.17 + 1.01 * u), side_panel, flip)
	# 窓帯: 格子セル中心が窓ポリゴン内なら欠く (開口)。柱・前後端は格子が残る。
	var st := SurfaceTool.new()
	st.begin(Mesh.PRIMITIVE_TRIANGLES)
	var nu := 100
	var nv := 20
	for j in range(nv):
		var y0 := SILL + (WTOP - SILL) * float(j) / float(nv)
		var y1 := SILL + (WTOP - SILL) * float(j + 1) / float(nv)
		var yc := (y0 + y1) * 0.5
		var zf0 := ws_z(band_x(y0) + 0.004, y0) - 0.03
		var zf1 := ws_z(band_x(y1) + 0.004, y1) - 0.03
		for i in range(nu):
			var f0 := float(i) / float(nu)
			var f1 := float(i + 1) / float(nu)
			var zc := lerpf((zf0 + zf1) * 0.5, AFT, (f0 + f1) * 0.5)
			if _in_windows(zc, yc):
				continue
			var a := Vector3(sd * band_x(y0), y0, lerpf(zf0, AFT, f0))
			var b := Vector3(sd * band_x(y0), y0, lerpf(zf0, AFT, f1))
			var c := Vector3(sd * band_x(y1), y1, lerpf(zf1, AFT, f0))
			var d := Vector3(sd * band_x(y1), y1, lerpf(zf1, AFT, f1))
			st.add_vertex(a); st.add_vertex(b); st.add_vertex(c)
			st.add_vertex(b); st.add_vertex(d); st.add_vertex(c)
	st.generate_normals()
	var band := MeshInstance3D.new()
	band.name = "WindowBand" + tag
	band.mesh = st.commit()
	band.material_override = wall_ds
	parent.add_child(band)
	# 窓の縁取り (リビール): 各窓ポリゴンの辺に沿う帯 (内側へ 2mm 張り出し)
	var glass := _glass_mat()
	for wi in range(WIN_POLYS.size()):
		var poly: Array = WIN_POLYS[wi]
		var fst := SurfaceTool.new()
		fst.begin(Mesh.PRIMITIVE_TRIANGLES)
		for ei in range(poly.size()):
			var p: Vector2 = poly[ei]
			var q: Vector2 = poly[(ei + 1) % poly.size()]
			var dir := q - p
			var ln := maxf(dir.length(), 1e-6)
			var n2 := Vector2(-dir.y, dir.x) / ln * 0.015
			var c0 := _band_point(sd, p + n2, -0.002)
			var c1 := _band_point(sd, p - n2, -0.002)
			var c2 := _band_point(sd, q + n2, -0.002)
			var c3 := _band_point(sd, q - n2, -0.002)
			fst.add_vertex(c0); fst.add_vertex(c1); fst.add_vertex(c2)
			fst.add_vertex(c1); fst.add_vertex(c3); fst.add_vertex(c2)
		fst.generate_normals()
		var fr := MeshInstance3D.new()
		fr.name = "WinFrame%s%d" % [tag, wi + 1]
		fr.mesh = fst.commit()
		fr.material_override = wall_ds
		parent.add_child(fr)
		# 窓ガラス (開口面そのもの、影を落とさない)
		var gst := SurfaceTool.new()
		gst.begin(Mesh.PRIMITIVE_TRIANGLES)
		var g0 := _band_point(sd, poly[0], 0.0)
		var g1 := _band_point(sd, poly[1], 0.0)
		var g2 := _band_point(sd, poly[2], 0.0)
		var g3 := _band_point(sd, poly[3], 0.0)
		gst.add_vertex(g0); gst.add_vertex(g1); gst.add_vertex(g2)
		gst.add_vertex(g0); gst.add_vertex(g2); gst.add_vertex(g3)
		gst.generate_normals()
		var gl := MeshInstance3D.new()
		gl.name = "WinGlass%s%d" % [tag, wi + 1]
		gl.mesh = gst.commit()
		gl.material_override = glass
		gl.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
		parent.add_child(gl)
	# シルトリムとアームレスト
	var zp_sill := ws_z(band_x(SILL) + 0.004, SILL) - 0.03
	_box(parent, "SillTrim" + tag, Vector3(0.035, 0.022, AFT - zp_sill - 0.02), Vector3(sd * (HW - 0.012), SILL + 0.004, (AFT + zp_sill) * 0.5), trim)
	_box(parent, "ArmrestF" + tag, Vector3(0.06, 0.05, 0.42), Vector3(sd * (HW - 0.035), 0.205, -0.62), _mat(0x4a4542, 0.55))
	_box(parent, "ArmrestR" + tag, Vector3(0.05, 0.045, 0.36), Vector3(sd * (HW - 0.03), 0.20, 0.42), _mat(0x4a4542, 0.55))
	# ルーフ際の上部トリム
	var zp_top := ws_z(band_x(WTOP) + 0.004, WTOP) - 0.03
	_box(parent, "RoofTrim" + tag, Vector3(0.04, 0.03, AFT - zp_top + 0.02), Vector3(sd * (HWT - 0.005), WTOP + 0.002, (AFT + zp_top) * 0.5), trim)
	# B ピラー トリム (前窓と後窓の間)
	_box(parent, "BPillar" + tag, Vector3(0.024, WTOP - SILL + 0.02, 0.15), Vector3(sd * (HW - 0.034), (WTOP + SILL) * 0.5, -0.175), trim, Vector3(0, 0, -sd * atan(-KX)))
	# A ピラー トリム (フロントガラス側縁に沿うチューブをセグメントで)
	var prev := Vector3.ZERO
	for i in range(9):
		var y := WS_Y0 - 0.02 + (WTOP + 0.02 - WS_Y0) * float(i) / 8.0
		var p := Vector3(sd * (band_x(y) - 0.012), y, ws_z(band_x(y), y) + 0.02)
		if i > 0:
			_strut(parent, "APillar%s%d" % [tag, i - 1], prev, p, 0.028, trim)
		prev = p

## フロントガラス (ガラス面 + 上弓 + 中央柱) とルーフ帯。
static func _build_front_and_roof(parent: Node, trim: Material, roof_m: Material, steel: Material) -> void:
	var glass_mi := _sheet(parent, "WindshieldGlass", 12, 6, func(u: float, v: float) -> Vector3:
		var x := -HWT + 2.0 * HWT * u
		var y := WS_Y0 + (WS_Y1 - WS_Y0) * v
		return Vector3(x, y, ws_z(x, y)), _glass_mat())
	glass_mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	# 上弓 (トップボウ)
	var prev := Vector3.ZERO
	for i in range(13):
		var x := -HWT + 2.0 * HWT * float(i) / 12.0
		var y := minf(roof_y(x), WS_Y1 + 0.01) - 0.01
		var p := Vector3(x, y, ws_z(x, minf(y, WS_Y1)) + 0.025)
		if i > 0:
			_strut(parent, "WSBow%d" % (i - 1), prev, p, 0.026, trim)
		prev = p
	# 中央柱
	prev = Vector3.ZERO
	for i in range(7):
		var y := WS_Y0 + 0.01 + (WS_Y1 - WS_Y0 - 0.02) * float(i) / 6.0
		var p := Vector3(0, y, ws_z(0, y) + 0.008)
		if i > 0:
			_strut(parent, "WSCenter%d" % (i - 1), prev, p, 0.011, steel)
		prev = p
	# ヘッドライナー: 窓帯上端から反対側までアーチ、フロントガラス上端から後部隔壁まで
	_sheet(parent, "Roof", 16, 10, func(u: float, v: float) -> Vector3:
		var ph := PI * u
		var x := -HWT * cos(ph)
		var y := WTOP + (ROOF - WTOP) * sin(ph)
		var z0 := ws_z(x, minf(y, WS_Y1)) + 0.004
		return Vector3(x, y, z0 + (AFT - z0) * v), roof_m)

## グレアシールド: リップ profile を x 方向に掃引し、各 x でアーチ drop を引く。
static func _glare_profile(x: float) -> Array:
	var drop := glare_drop(x)
	var prof: Array = []
	for pt in [Vector2(PZ + 0.004, 0.451), Vector2(-1.045, 0.451), Vector2(-1.031, 0.457), Vector2(-1.027, 0.4665), Vector2(-1.032, 0.4765), Vector2(-1.05, 0.4795)]:
		prof.append(Vector2(pt.x, pt.y - drop))
	var z1 := ws_z(x, WS_Y0) - 0.002
	var y1 := WS_Y0 - 0.002
	for f in [0.33, 0.67]:
		prof.append(Vector2(-1.05 + (z1 + 1.05) * f, 0.4795 + (y1 - 0.4795) * f))
	prof.append(Vector2(z1, y1))
	return prof

static func _build_glare_and_panel(parent: Node, panel_m: Material, glare_m: Material, wall_ds: Material) -> void:
	# グレアシールド本体 (アーチ付きフード)
	_sheet(parent, "Glareshield", 36, 16, func(u: float, v: float) -> Vector3:
		var x := -GLARE_X + 2.0 * GLARE_X * u
		var prof := _glare_profile(x)
		var f := v * float(prof.size() - 1)
		var i := mini(prof.size() - 2, int(floor(f)))
		var t := f - float(i)
		var a: Vector2 = prof[i]
		var b: Vector2 = prof[i + 1]
		return Vector3(x, lerpf(a.y, b.y, t), lerpf(a.x, b.x, t)), glare_m)
	# パネル面 (フェイス): 上端はアーチ、z は角ラップ付き
	_sheet(parent, "Panel", 36, 9, func(u: float, v: float) -> Vector3:
		var x := -0.545 + 1.09 * u
		var top := panel_top_y(x)
		return Vector3(x, PBOT + 0.008 + (top - PBOT - 0.008) * v, PZ + 0.0002 + panel_wrap_z(x)), panel_m)
	# パネル背面と上端リボン (フレームの厚み)
	_sheet(parent, "PanelBack", 36, 2, func(u: float, v: float) -> Vector3:
		var x := -0.545 + 1.09 * u
		var top := panel_top_y(x)
		return Vector3(x, PBOT + 0.008 + (top - PBOT - 0.008) * v, PZ - 0.035 + panel_wrap_z(x)), panel_m)
	_sheet(parent, "PanelTop", 36, 1, func(u: float, v: float) -> Vector3:
		var x := -0.545 + 1.09 * u
		var top := panel_top_y(x)
		var w := panel_wrap_z(x)
		return Vector3(x, top, lerpf(PZ + 0.0002 + w, PZ - 0.035 + w, v)), panel_m)
	# A ピラー足元のチーク (左右): 弓なりに下がったグレア端とフロントガラス基部の隙間を埋める
	for sd in [-1.0, 1.0]:
		var tag := "L" if sd < 0.0 else "R"
		var prof: Array = [Vector2(-1.183, 0.400), Vector2(-1.148, 0.4245), Vector2(-1.085, 0.4495), Vector2(-1.030, 0.4435), Vector2(-1.030, 0.400)]
		var faces: Array = []
		for xx in [sd * 0.500, sd * 0.556]:
			var by := panel_top_y(xx) - 0.004
			var fp: Array = []
			for pt in prof:
				fp.append(Vector3(xx, by if absf(pt.y - 0.400) < 1e-6 else pt.y, pt.x))
			faces.append(fp)
		var st := SurfaceTool.new()
		st.begin(Mesh.PRIMITIVE_TRIANGLES)
		for fp in faces:
			var cen := Vector3.ZERO
			for p in fp:
				cen += p
			cen /= float(fp.size())
			for i in range(fp.size()):
				st.add_vertex(cen)
				st.add_vertex(fp[i])
				st.add_vertex(fp[(i + 1) % fp.size()])
		for i in range(prof.size()):
			var a0: Vector3 = faces[0][i]
			var a1: Vector3 = faces[0][(i + 1) % prof.size()]
			var b0: Vector3 = faces[1][i]
			var b1: Vector3 = faces[1][(i + 1) % prof.size()]
			st.add_vertex(a0); st.add_vertex(a1); st.add_vertex(b0)
			st.add_vertex(a1); st.add_vertex(b1); st.add_vertex(b0)
		st.generate_normals()
		var mi := MeshInstance3D.new()
		mi.name = "Cheek" + tag
		mi.mesh = st.commit()
		mi.material_override = wall_ds
		parent.add_child(mi)

## 右ドア: シーム (暗線) とハンドル (右壁のみ)。
static func _build_door(parent: Node, seam_m: Material, chrome: Material, black: Material) -> void:
	_sheet(parent, "DoorSeamF", 1, 6, func(u: float, v: float) -> Vector3:
		var y := -0.30 + (SILL + 0.30) * v
		return Vector3(low_x(y) - 0.0035, y, -1.20 + (u - 0.5) * 0.006), seam_m, true)
	_sheet(parent, "DoorSeamR", 1, 6, func(u: float, v: float) -> Vector3:
		var y := -0.30 + (SILL + 0.30) * v
		return Vector3(low_x(y) - 0.0035, y, -0.13 + (u - 0.5) * 0.006), seam_m, true)
	_sheet(parent, "DoorSeamB", 6, 1, func(u: float, v: float) -> Vector3:
		return Vector3(low_x(-0.30) - 0.0035, -0.30 + (v - 0.5) * 0.006, -1.20 + 1.07 * u), seam_m, true)
	_box(parent, "DoorHandle", Vector3(0.03, 0.022, 0.12), Vector3(low_x(0.27) - 0.02, 0.27, -0.76), chrome)
	_box(parent, "DoorLatch", Vector3(0.012, 0.016, 0.03), Vector3(low_x(0.27) - 0.012, 0.27, -0.685), black)
	_box(parent, "DoorPocket", Vector3(0.02, 0.10, 0.34), Vector3(low_x(-0.15) - 0.011, -0.15, -0.86), _mat(0x55504b, 0.55))

## コックピット全体を構築して返す。原点は機体 CG、-Z が機首。
static func build_cockpit() -> Node3D:
	var root := Node3D.new()
	root.name = "Cockpit"
	# cockpit.js の surfaces (S) に対応する色
	var panel := _mat(0x313439, 0.72, 0.0, true)
	var glare := _mat(0x1c1d20, 0.9, 0.0, true)
	var bezel := _mat(0x17181b, 0.36)
	var wall_ds := _mat(0xb4afa6, 0.62, 0.0, true)
	var side_panel_m := _mat(0x9d988f, 0.66, 0.0, true)
	var trim := _mat(0x8f8b84, 0.55)
	var carpet := _mat(0x302f2e, 1.0)
	var seat := _mat(0x9a7b5c, 0.55)
	var seat_side := _mat(0x3a302b, 0.5)
	var black := _mat(0x121315, 0.5)
	var yoke_m := _mat(0x1b1c1f, 0.4)
	var screen := _mat(0x05070a, 0.25)
	screen.emission_enabled = true
	screen.emission = Color(0.02, 0.03, 0.04)

	# --- 床・後部隔壁・防火壁 ---
	_box(root, "Floor", Vector3(0.98, 0.02, 3.10), Vector3(0, FLOOR - 0.01, 0.10), carpet)
	_sheet(root, "AftBulkhead", 8, 8, func(u: float, v: float) -> Vector3:
		var x := -HW + 2.0 * HW * u
		var top := roof_y(x) + 0.01
		return Vector3(x, FLOOR + (top - FLOOR) * v, AFT), _mat(0x6f6b66, 0.6, 0.0, true), true)
	_box(root, "Firewall", Vector3(1.06, WS_Y0 - 0.03 - FLOOR, 0.02), Vector3(0, (FLOOR + WS_Y0 - 0.03) * 0.5, FIRE), carpet)

	# --- キャビンシェル (側壁・窓帯・フロントガラス・ルーフ) ---
	for sd in [-1.0, 1.0]:
		_build_side(root, sd, wall_ds, trim, side_panel_m)
	_build_front_and_roof(root, trim, _mat(0xd2cdc3, 0.95, 0.0, true), _mat(0x5d6268, 0.4, 0.8))
	_build_door(root, _mat(0x2c2a28, 0.6, 0.0, true), _mat(0xc8ccd1, 0.16, 1.0), black)

	# --- 計器パネル + グレアシールド (アーチ) ---
	_build_glare_and_panel(root, panel, glare, wall_ds)
	# パネル下の空間 (ペダル前の暗部)
	_box(root, "PanelLower", Vector3(1.106, 0.43, 0.02), Vector3(0, -0.185, PZ - 0.02), black)

	# --- G1000 ベゼル枠 + 画面スロット (PFD / MFD) ---
	_bezel_with_slot(root, "PFD", PFD_C, bezel, screen)
	_bezel_with_slot(root, "MFD", MFD_C, bezel, screen)
	# オーディオパネル (両画面の間の細い帯)
	_box(root, "AudioPanel", Vector3(0.078, 0.19, 0.015), Vector3(AUD_C.x, AUD_C.y, BZ - 0.012), bezel)
	# 予備計器 (ASI / ATT / ALT の円形フェイス プレースホルダ)
	for i in range(3):
		_cyl(root, "Standby%d" % (i + 1), 0.031, 0.012, Vector3(STBY_X, STBY_Y[i], BZ - 0.006), screen, Vector3(PI * 0.5, 0, 0))

	# --- 操縦桿 (左右席): コラム + グリップ ---
	for sd in [-1.0, 1.0]:
		var x: float = sd * 0.30
		var tag := "L" if sd < 0.0 else "R"
		_cyl(root, "YokeCol" + tag, 0.018, 0.26, Vector3(x, 0.218, -0.975), yoke_m, Vector3(PI * 0.5, 0, 0))
		_box(root, "YokeGrip" + tag, Vector3(0.27, 0.045, 0.055), Vector3(x, 0.218, -0.855), yoke_m)
		_box(root, "YokeHub" + tag, Vector3(0.07, 0.09, 0.05), Vector3(x, 0.205, -0.855), yoke_m)

	# --- 中央コンソール + スロットルクアドラント (最低限) ---
	_box(root, "Console", Vector3(0.17, 0.24, 0.55), Vector3(0, -0.28, -0.80), panel)
	_box(root, "ThrottleQuad", Vector3(0.16, 0.10, 0.22), Vector3(0, -0.13, -1.02), bezel)
	_box(root, "LeverThr", Vector3(0.025, 0.09, 0.03), Vector3(-0.045, -0.05, -1.06), black, Vector3(-0.5, 0, 0))
	_box(root, "LeverProp", Vector3(0.025, 0.09, 0.03), Vector3(0.0, -0.05, -1.06), _mat(0x1f4f9a, 0.42), Vector3(-0.5, 0, 0))
	_box(root, "LeverMix", Vector3(0.025, 0.09, 0.03), Vector3(0.045, -0.05, -1.06), _mat(0xb3231c, 0.42), Vector3(-0.5, 0, 0))

	# --- 座席 (左右席 + 後部ベンチの座面だけ) ---
	for sd in [-1.0, 1.0]:
		var x: float = sd * SEAT_X
		var tag := "L" if sd < 0.0 else "R"
		_box(root, "SeatCushion" + tag, Vector3(0.44, 0.12, 0.46), Vector3(x, -0.24, -0.02), seat)
		_box(root, "SeatBack" + tag, Vector3(0.44, 0.58, 0.12), Vector3(x, 0.06, 0.24), seat, Vector3(-0.14, 0, 0))
		_box(root, "SeatBase" + tag, Vector3(0.40, 0.14, 0.40), Vector3(x, -0.36, -0.02), seat_side)
	_box(root, "RearBench", Vector3(1.0, 0.12, 0.42), Vector3(0, -0.24, 0.75), seat)
	_box(root, "RearBenchBack", Vector3(1.0, 0.5, 0.12), Vector3(0, 0.02, 0.99), seat, Vector3(-0.14, 0, 0))

	# --- ラダーペダル (左右席 × 2) ---
	for px in [-0.39, -0.21, 0.21, 0.39]:
		_box(root, "Pedal", Vector3(0.07, 0.11, 0.02), Vector3(px, -0.27, -1.21), black, Vector3(0.5, 0, 0))
	return root

## ベゼル枠 (4 本の帯) と、その内側に画面スロット QuadMesh を置く。
## スロットのノード名は "PFD_SLOT" / "MFD_SLOT" (統合側との契約)。
static func _bezel_with_slot(root: Node, which: String, c: Vector2, bezel: Material, screen: Material) -> void:
	var hw := 0.27 * 0.5
	var hh := 0.21 * 0.5
	var ow := SCREEN_W * 0.5 + 0.002 # 開口の半幅
	var oh := SCREEN_H * 0.5 + 0.002
	var z := BZ - 0.010 # 枠の中心 (前面が BZ)
	_box(root, which + "BezelT", Vector3(0.27, hh - oh, 0.02), Vector3(c.x, c.y + (hh + oh) * 0.5, z), bezel)
	_box(root, which + "BezelB", Vector3(0.27, hh - oh, 0.02), Vector3(c.x, c.y - (hh + oh) * 0.5, z), bezel)
	_box(root, which + "BezelL", Vector3(hw - ow, SCREEN_H + 0.004, 0.02), Vector3(c.x - (hw + ow) * 0.5, c.y, z), bezel)
	_box(root, which + "BezelR", Vector3(hw - ow, SCREEN_H + 0.004, 0.02), Vector3(c.x + (hw + ow) * 0.5, c.y, z), bezel)
	# 画面スロット: +Z (後方 = 操縦席側) を向く QuadMesh。中心はベゼル中心 +SCREEN_DY。
	var slot := MeshInstance3D.new()
	slot.name = which + "_SLOT"
	var q := QuadMesh.new()
	q.size = Vector2(SCREEN_W, SCREEN_H)
	slot.mesh = q
	slot.position = Vector3(c.x, c.y + SCREEN_DY, BZ - 0.0025)
	slot.material_override = screen
	root.add_child(slot)
	# ソフトキー帯 (画面下の 12 キー分: 帯 1 本で表現)
	_box(root, which + "Softkeys", Vector3(SCREEN_W, 0.014, 0.008), Vector3(c.x, c.y - hh + 0.012, BZ - 0.002), bezel)
