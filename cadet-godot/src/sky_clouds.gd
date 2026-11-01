extends RefCounted

## CADET Godot port — Phase 4: 雲 (HTML Stage C 相当)。
## 原典 (growth/gfx): cadet/src/world/clouds.js — 訓練エリア周辺の晴天積雲を
## キャンバスに描いたビルボードで置く。配置 SPOTS は原典そのまま転記:
## [x, z] は空港ローカル (x = 東, z = −北), base は雲底 (地表から m),
## w は幅 (m), v は絵柄バリアント。原典は detail=1 で各スポットに
## 小さい隣接塔 (w*0.45, +x w*0.52, +z w*0.20, 雲底 +50 m) も付ける。
## 絵柄は原典と同じ手順 (種付き乱数で puff を重ね、上を明るく雲底を
## 灰色の板にし、BASE より下を切り落とす) を実行時生成する。
## 層雲レイヤーは原典では Sky シェーダ内の平面雲 (render/sky.js,
## coverage 0.34 / density 0.55 / elevation 0.55) だが、Godot 側は
## ProceduralSkyMaterial に注入できないため、高高度の大きな面 +
## 専用シェーダ (warp + 自己影風の濃淡) で近似する。
##
## 使い方 (統合側):
##   var clouds = SkyClouds.build_clouds(parent)   # parent に "Clouds" が付く
## 静的配置のみ (原典の漂流・天候連動フェードは統合側の課題として NOTES に記載)。

const FP = preload("res://src/physics.gd")
const VIS_OFF := Vector3(40000, 0, 0)

# clouds.js の SPOTS: {x, z, base, w, v}
const SPOTS := [
	{"x": 5200.0, "z": -4200.0, "base": 1150.0, "w": 1500.0, "v": 0},
	{"x": -6800.0, "z": -2600.0, "base": 1260.0, "w": 1850.0, "v": 1},
	{"x": -4200.0, "z": 5800.0, "base": 1080.0, "w": 1300.0, "v": 2},
	{"x": 7600.0, "z": 2600.0, "base": 1330.0, "w": 1650.0, "v": 0},
	{"x": 1800.0, "z": -8800.0, "base": 1180.0, "w": 1450.0, "v": 1},
	{"x": -9400.0, "z": 900.0, "base": 1420.0, "w": 1950.0, "v": 2},
	{"x": 10200.0, "z": -7000.0, "base": 1230.0, "w": 1550.0, "v": 1},
]
const PAINT_W := 512 # 原典の絵柄サイズ (512 x 288), 雲底は 80% の高さ
const PAINT_H := 288
const BASE_FRAC := 0.80
const STRATUS_ALT := 2600.0 # 層雲レイヤーの高さ (地表から m)
const STRATUS_SIZE := 60000.0

const STRATUS_SHADER := """
shader_type spatial;
render_mode unshaded, cull_disabled, fog_disabled;
uniform float coverage : hint_range(0.0, 1.0) = 0.45;
uniform vec2 drift = vec2(0.83, 0.55);
varying vec3 wp;
void vertex() {
	wp = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}
float hash21(vec2 p) {
	p = fract(p * vec2(234.34, 435.345));
	p += dot(p, p + 34.23);
	return fract(p.x * p.y);
}
float vnoise(vec2 p) {
	vec2 i = floor(p);
	vec2 f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
		mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p) {
	float v = 0.0;
	float a = 0.5;
	for (int i = 0; i < 4; i++) {
		v += a * vnoise(p);
		p = p * 2.03 + vec2(17.3, 9.1);
		a *= 0.5;
	}
	return v;
}
void fragment() {
	vec2 p = wp.xz * 0.00006 + drift * TIME * 0.0015;
	float warp = fbm(p * 1.8 + 4.7);
	float n = fbm(p + warp * 1.6);
	float a = smoothstep(1.05 - coverage - 0.30, 1.35 - coverage, n);
	float shade = fbm(p * 2.6 + vec2(11.0, 3.0));
	float self_shadow = 0.78 + 0.30 * shade;
	vec3 col = mix(vec3(0.58, 0.62, 0.69), vec3(1.02, 1.03, 1.05), n) * self_shadow;
	ALBEDO = col;
	ALPHA = a * 0.88;
}
"""

static var _cumulus_tex: Dictionary = {}

# 決定的乱数 (原典 render/textures.js の rng と同じ「毎回同じ景色」のための種付き)
static func _rng_next(state: Array) -> float:
	state[0] = int((int(state[0]) * 1664525 + 1013904223) & 0xFFFFFFFF)
	return float(state[0]) / 4294967296.0

## 積雲の絵柄を 1 枚生成する (低解像で計算しバイリニア拡大で柔らかくする)。
## 原典 cumulusTexture(seed): 2 本の塔 + ドーム + 肩 + 雲底の列の puff 群、
## 上明るく雲底は灰の板、BASE より下はフェードアウト。
static func cumulus_texture(seed_value: int) -> Texture2D:
	if _cumulus_tex.has(seed_value):
		return _cumulus_tex[seed_value]
	var state: Array = [seed_value * 2654435761 & 0x7FFFFFFF]
	var cw := 160
	var ch := 90
	var aspect := float(PAINT_W) / float(PAINT_H)
	# puff: [x (0..1), y (0..1, 下が大きい), r (高さ比), 明るさ]
	var puffs: Array = []
	var top := 0.21 + _rng_next(state) * 0.08
	for fx in [0.40, 0.60]:
		var steps := 3 + int(_rng_next(state) * 2.0)
		for s in range(steps + 1):
			var k := float(s) / float(steps)
			puffs.append([fx + (_rng_next(state) - 0.5) * 0.05, BASE_FRAC - 0.03 - k * (BASE_FRAC - top) + (_rng_next(state) - 0.5) * 0.02, (0.35 - 0.11 * k) * (0.9 + _rng_next(state) * 0.2), 0.90 + _rng_next(state) * 0.10])
	puffs.append([0.50 + (_rng_next(state) - 0.5) * 0.04, top + 0.10, 0.31, 0.95])
	puffs.append([0.25 + (_rng_next(state) - 0.5) * 0.03, BASE_FRAC - 0.17, 0.26, 0.88])
	puffs.append([0.75 + (_rng_next(state) - 0.5) * 0.03, BASE_FRAC - 0.17, 0.26, 0.88])
	puffs.append([0.33 + (_rng_next(state) - 0.5) * 0.03, BASE_FRAC - 0.09, 0.29, 0.90])
	puffs.append([0.67 + (_rng_next(state) - 0.5) * 0.03, BASE_FRAC - 0.09, 0.29, 0.90])
	var bx := 0.20
	while bx <= 0.84:
		puffs.append([bx + (_rng_next(state) - 0.5) * 0.02, BASE_FRAC - 0.05, 0.17 + _rng_next(state) * 0.05, 0.85])
		bx += 0.058 + _rng_next(state) * 0.02
	var img := Image.create(cw, ch, false, Image.FORMAT_RGBA8)
	for py in range(ch):
		var v := (float(py) + 0.5) / float(ch) # 画像は上が v=0 (絵柄座標も上が 0)
		for px in range(cw):
			var u := (float(px) + 0.5) / float(cw)
			var sum := 0.0
			var light := 0.0
			for pf in puffs:
				var dx := (u - float(pf[0])) * aspect
				var dy := v - float(pf[1])
				var d := sqrt(dx * dx + dy * dy) / float(pf[2])
				if d < 1.0:
					var f := pow(1.0 - d, 1.6)
					sum += f
					light += f * float(pf[3])
			var alpha := clampf(sum * 1.15, 0.0, 1.0)
			if alpha <= 0.003:
				continue
			var bright := light / maxf(sum, 0.001)
			bright *= 0.90 + 0.14 * clampf(1.0 - v / BASE_FRAC, 0.0, 1.0) # 上ほど明るい
			# 雲底の板: BASE 直上から下へ灰青に沈める (原典の plate グラデ)
			var plate := smoothstep(BASE_FRAC - 0.07, BASE_FRAC + 0.01, v)
			var r := bright * (1.0 - 0.42 * plate)
			var g := bright * (1.0 - 0.38 * plate)
			var b := bright * (1.0 - 0.30 * plate)
			# 平らな雲底: BASE より下は短い fringe で消す (原典の destination-out)
			alpha *= 1.0 - smoothstep(BASE_FRAC - 0.02, BASE_FRAC + 0.07, v)
			img.set_pixel(px, py, Color(r, g, b, alpha))
	img.resize(PAINT_W, PAINT_H, Image.INTERPOLATE_BILINEAR)
	img.generate_mipmaps()
	var tex := ImageTexture.create_from_image(img)
	_cumulus_tex[seed_value] = tex
	return tex

static func _cumulus_quad(tex: Texture2D, w: float) -> MeshInstance3D:
	var mi := MeshInstance3D.new()
	var q := QuadMesh.new()
	q.size = Vector2(w, w * float(PAINT_H) / float(PAINT_W))
	mi.mesh = q
	var m := StandardMaterial3D.new()
	m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
	m.billboard_mode = BaseMaterial3D.BILLBOARD_FIXED_Y
	m.transparency = BaseMaterial3D.TRANSPARENCY_ALPHA_SCISSOR
	m.alpha_scissor_threshold = 0.35 # 原典 clouds.js の alphaTest 0.35 (深度は固い芯だけ)
	m.albedo_texture = tex
	m.albedo_color = Color(1.85, 1.90, 2.0) # 原典の tint ≈ 太陽色寄り ×2.0 の HDR 水準
	m.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	mi.material_override = m
	mi.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	return mi

## 雲一式を組み立てる。戻り値の "Clouds" ノードが parent に追加される。
static func build_clouds(parent: Node = null) -> Node3D:
	var root := Node3D.new()
	root.name = "Clouds"
	if parent != null:
		parent.add_child(root)
	var texs: Array = [cumulus_texture(101), cumulus_texture(202), cumulus_texture(303)]
	for i in range(SPOTS.size()):
		var s: Dictionary = SPOTS[i]
		var w := float(s["w"])
		var h := w * float(PAINT_H) / float(PAINT_W)
		var main := _cumulus_quad(texs[int(s["v"])], w)
		main.name = "Cumulus_%d" % i
		# 絵柄の雲底線 (高さ 80%) が雲底 base に来るよう中心を置く (原典の式)
		main.position = Vector3(float(s["x"]), FP.GROUND_M + float(s["base"]) + h * (BASE_FRAC - 0.5), float(s["z"])) + VIS_OFF
		root.add_child(main)
		# 隣接塔 (原典 detail=1)
		var nw := w * 0.45
		var nh := nw * float(PAINT_H) / float(PAINT_W)
		var nb := _cumulus_quad(texs[int(s["v"])], nw)
		nb.name = "CumulusNb_%d" % i
		nb.position = Vector3(float(s["x"]) + w * 0.52, FP.GROUND_M + float(s["base"]) + 50.0 + nh * (BASE_FRAC - 0.5), float(s["z"]) + w * 0.20) + VIS_OFF
		root.add_child(nb)
	# ---- 層雲レイヤー (高高度の面 + シェーダ)
	var layer := MeshInstance3D.new()
	layer.name = "StratusLayer"
	var pm := PlaneMesh.new()
	pm.size = Vector2(STRATUS_SIZE, STRATUS_SIZE)
	layer.mesh = pm
	var sm := ShaderMaterial.new()
	var sh := Shader.new()
	sh.code = STRATUS_SHADER
	sm.shader = sh
	layer.material_override = sm
	layer.position = Vector3(0, FP.GROUND_M + STRATUS_ALT, 0) + VIS_OFF
	layer.cast_shadow = GeometryInstance3D.SHADOW_CASTING_SETTING_OFF
	root.add_child(layer)
	return root

## 統合・検証用: 配置表 (原典 clouds.js SPOTS) のコピーを返す。
static func cloud_spots() -> Array:
	return SPOTS.duplicate(true)
