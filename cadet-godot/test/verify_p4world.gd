extends SceneTree

## CADET Godot port — Phase 4 (world) 見た目の検証 (任意)
## 使い方 (実描画のため Xvfb + llvmpipe で):
##   xvfb-run -a -s "-screen 0 1280x840x24" \
##     ~/workspace/tools/godot/Godot_v4.7.2-stable_linux.x86_64 \
##     --path ~/workspace/cadet-godot --resolution 1280x840 \
##     -s test/verify_p4world.gd
## main.gd と同じ環境 (ProceduralSky + Filmic + 太陽) で world + airport +
## clouds を組み、学園前 (徒歩視点) と上空から撮影して /tmp に残す。
## 地面サンプルの平均色も出し、Phase 3 の「白〜水色に洗われる」状態と比べる。

const WB = preload("res://src/world_build.gd")
const AB = preload("res://src/airport_build.gd")
const SC = preload("res://src/sky_clouds.gd")
const FP = preload("res://src/physics.gd")

func _init() -> void:
	_run()

func _run() -> void:
	# ---- main.gd と同じ環境 (統合側の現行値。推奨値は PHASE4-WORLD-NOTES)
	var we := WorldEnvironment.new()
	var env := Environment.new()
	env.background_mode = Environment.BG_SKY
	var sky := Sky.new()
	var sm := ProceduralSkyMaterial.new()
	sm.sky_top_color = Color(0.25, 0.5, 0.85)
	sm.sky_horizon_color = Color(0.75, 0.85, 0.95)
	sm.ground_bottom_color = Color(0.3, 0.35, 0.3)
	sm.ground_horizon_color = Color(0.7, 0.78, 0.8)
	sky.sky_material = sm
	env.sky = sky
	env.ambient_light_source = Environment.AMBIENT_SOURCE_SKY
	env.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	we.environment = env
	root.add_child(we)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-50, -30, 0)
	sun.shadow_enabled = true
	root.add_child(sun)

	var world: Node3D = WB.build_world(root)
	root.add_child(AB.build_airport())
	SC.build_clouds(root)

	var cam := Camera3D.new()
	cam.far = 45000.0
	root.add_child(cam)
	cam.make_current()

	# 徒歩視点: 学園 start (a 642, c 255) 付近、地上 1.7 m、北西を見る
	var eye: Vector3 = WB.rwy_to_world(660.0, 300.0, 1.7)
	cam.look_at_from_position(eye, WB.rwy_to_world(560.0, 180.0, 4.0), Vector3.UP)
	await _shot("/tmp/p4_walk.png")
	# 上空: 滑走路南端の上 900 m、空港全体と雲を見る
	var c2: Vector3 = WB.rwy_to_world(300.0, 60.0, 900.0)
	cam.look_at_from_position(c2, WB.rwy_to_world(700.0, 120.0, 0.0), Vector3.UP)
	await _shot("/tmp/p4_air.png")
	print("verify_p4world done")
	quit(0)

func _shot(path: String) -> void:
	# 数フレーム描いてから viewport を読む (verify_visual.gd と同じ流儀)
	for i in range(6):
		await process_frame
	var img := root.get_texture().get_image() if root.get_texture() != null else null
	if img == null:
		print("shot skipped (no texture): ", path)
		return
	img.save_png(path)
	# 中央付近 200x200 の平均色 (洗われチェックの粗い指標)
	var cx := img.get_width() / 2
	var cy := img.get_height() / 2
	var acc := Vector3.ZERO
	var n := 0
	for y in range(cy - 100, cy + 100, 4):
		for x in range(cx - 100, cx + 100, 4):
			var p := img.get_pixel(x, y)
			acc += Vector3(p.r, p.g, p.b)
			n += 1
	acc /= float(n)
	print("shot ", path, " centre mean rgb = ", acc)
