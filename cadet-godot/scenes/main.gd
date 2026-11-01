extends Node3D

## CADET Godot port — Phase 2 垂直スライスのメインシーン。
## flight_bridge (physics + school + controls + avionics + AP) を駆動し、
## 訓練空港・色の戻った Archer・コックピット＋G1000 (PFD/MFD) を表示する。
##
## 操作:
##   飛行: W/S 機首, A/D ラダー, ←→ ロール, ↑↓ ピッチ(スプリング), R/F スロットル,
##         B/Space ブレーキ, V フラップ, Shift+V フラップ上げ, G ギア, T トリム,
##         [ ] ラダートリム, Enter チェックリスト, 1-3 無線の回答
##   AP: F2 = AP 接続/解除 (HDG バグ＋選択高度へ), F5/F6 方位バグ, F7/F8 選択高度,
##       F9/F10 G1000 レンジ
##   視点: C = コックピット / 外部
##   モード: 1 フリー(滑走路) 2 フリー(エプロン) 3 レッスン a1 4 t1 5 t2 6 t3, N レッスン後の継続フリー
##   ゲームパッド: 左スティック=ヨーク, 右X=ラダー, A=ブレーキ, Y=フラップ, X=フラップ上げ
## --shot-cockpit / --shot-external / --shot-apron: 自動操縦で撮影して終了する。

const FP = preload("res://src/physics.gd")
const Bridge = preload("res://src/flight_bridge.gd")
const AB = preload("res://src/airport_build.gd")
const IM = preload("res://src/input_map.gd")
const SaveStore = preload("res://src/save_store.gd")
const CareerDriver = preload("res://src/career_driver.gd")
const WorldBuild = preload("res://src/world_build.gd")
const Traffic = preload("res://src/traffic.gd")
const AircraftSelect = preload("res://src/aircraft_select.gd")
# Phase 4
const SkyClouds = preload("res://src/sky_clouds.gd")
const Recorder = preload("res://src/recorder.gd")

const VIS_OFF := Vector3(40000, 0, 0)

var bridge
var ap
var aircraft: Node3D
var cam_cockpit: Camera3D
var cam_external: Camera3D
var view_external := false
var pfd_disp: G1000Display
var mfd_disp: G1000Display
var hud_status: Label
var hud_panel: Label
var hud_toast: Label
var toast_t := 0.0
var store := {}
var save_store = null
var shot_mode := ""
var shot_t := 0.0
var shot_saved := false
var finish_done := false
# Phase 3: career mode + traffic + aircraft selection + walker
var driver = null
var career_item: Dictionary = {}
var exam_state: Dictionary = {}
var hud_career: Label = null
var hud_debrief: Label = null
var traffic = null
var traffic_markers: Array = []
var aircraft_id := "pa28"
var aircraft_node: Node = null
var walker: Node3D = null
var walk_on := false
var _keys: Dictionary = {}
var _ap_pilot: Callable
# Phase 4: integrated systems
var content: Dictionary = {}
var audio_eng = null # CadetAudioEngine
var device_map = null # CadetDeviceMap
var device_panel: PanelContainer = null
var dialog_ui = null # DialogUI
var dialog_state: Dictionary = {}
var drill_core = null # DialogUI.DrillCore
var drill_item: Dictionary = {}
var efb = null # EFB
var profile_graph = null # ProfileGraph
var replay_player = null # ReplayPlayer
var replay_on := false
var replay_cam_mode := "chase"
var rec_samples: Array = []
var rec_acc := 0.0
var rec_clock := 0.0
var _rain_cache := 0.0
var _rain_t := 0.0
var walk_pos := Vector3(655.0, 0.0, 262.0) # runway frame (a, up, c)
var walk_walls: Array = []
var walk_floor_fn := Callable()
var hud_layer: CanvasLayer = null
# Phase 5: unified settings + version display + live quality targets
var app_settings = null # CadetAppSettings
var world_env: Environment = null
var sun_light: DirectionalLight3D = null
var clouds_root: Node = null
var hud_version: Label = null

static func version_string() -> String:
	return "v" + String(ProjectSettings.get_setting("application/config/version", "0.0.0"))

func _ready() -> void:
	for a in OS.get_cmdline_user_args():
		if String(a).begins_with("--shot-"):
			shot_mode = String(a).substr(7)
	# Phase 5: version banner in the log (user://logs) + unified settings
	# loaded before the environment exists, so the quality preset and the
	# master volume apply from the first frame.
	print("CADET %s — Godot %s / %s" % [version_string(), String(Engine.get_version_info().get("string", "")), OS.get_name()])
	app_settings = CadetAppSettings.new()
	app_settings.load_settings()
	app_settings.apply_volume()
	# environment — Phase 4: normalised to the HTML original (post.js AgX)
	# per PHASE4-WORLD-NOTES §4: the pale cyan wash was measured to come from
	# full-energy sky ambient + FILMIC; AgX + exposure 0.75 + ambient 0.45
	# brings the pavement back to the source textures' colours.
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
	env.ambient_light_energy = 0.45
	env.tonemap_mode = Environment.TONE_MAPPER_AGX
	env.tonemap_exposure = 0.75
	env.fog_enabled = true
	env.fog_light_color = Color(0.62, 0.70, 0.82)
	env.fog_density = 0.0002
	env.fog_sun_scatter = 0.25
	# the default fog_sky_affect (1.0) paints the whole sky with the fog
	# colour; keep only a horizon haze contribution (measured in shots)
	env.fog_sky_affect = 0.15
	we.environment = env
	world_env = env
	add_child(we)
	var sun := DirectionalLight3D.new()
	sun_light = sun
	sun.rotation_degrees = Vector3(-50, -30, 0)
	sun.light_energy = 1.1
	sun.shadow_enabled = true
	sun.shadow_bias = 0.06
	sun.shadow_normal_bias = 1.2
	sun.directional_shadow_max_distance = 800.0
	sun.directional_shadow_mode = DirectionalLight3D.SHADOW_PARALLEL_4_SPLITS
	add_child(sun)
	# Phase 4: clouds (Stage C equivalent: cumulus billboards + layer)
	clouds_root = SkyClouds.build_clouds(self)
	# Phase 5: the persisted quality preset overrides the Phase 4
	# defaults above (shadow / fog / clouds) — medium == Phase 4 values.
	_apply_quality()
	# Phase 3: textured world (ground / fields / town / academy / dorm /
	# tower / hangars) replaces the Phase 2 flat ground plane.
	var world = WorldBuild.build_world(self, {"fields": true, "town": true})
	# Phase 4: content + NPCs placed per the people.js table + interiors
	# (partition walls with door gaps, furniture, tower stairs) + walk data.
	var cj = JSON.parse_string(FileAccess.get_file_as_string("res://data/content.json"))
	if typeof(cj) == TYPE_DICTIONARY:
		content = cj
	if not content.is_empty():
		NpcBuild.build_npcs(world, content, {"slot": "am", "chapter": "ch1", "what": []})
		InteriorBuild.build_interiors(world, content)
		walk_walls = InteriorBuild.wall_boxes()
		walk_floor_fn = WalkPhysics.make_floor_fn(InteriorBuild.stair_steps(), 0.0)
		# Phase 4: interior lights for the main rooms (the roof blocks the
		# sun and sky ambient alone leaves the interiors gloomy). Shadowless
		# omni lights at (a, c, up): brief-1, lobby, sim room, dorm common,
		# tower cab, hangar 2.
		for sp in [[640.0, 254.7, 2.6], [655.0, 263.0, 2.6], [619.0, 270.0, 2.6], [634.0, 384.0, 2.4], [721.0, 262.0, 19.2], [563.0, 261.0, 5.5]]:
			var ol := OmniLight3D.new()
			ol.position = WorldBuild.rwy_to_world(sp[0], sp[1], sp[2])
			ol.light_color = Color(1.0, 0.95, 0.85)
			ol.light_energy = 0.9
			ol.omni_range = 11.0
			ol.omni_attenuation = 1.2
			add_child(ol)
	# airport
	add_child(AB.build_airport())
	# Phase 3: pattern traffic for the day (visual markers)
	traffic = Traffic.new()
	traffic.set_traffic(3, 7)
	for i in range(6):
		var mk := MeshInstance3D.new()
		var bm := BoxMesh.new()
		bm.size = Vector3(9, 2.5, 11)
		mk.mesh = bm
		var mm := StandardMaterial3D.new()
		mm.albedo_color = Color(0.9, 0.55, 0.15)
		mk.material_override = mm
		mk.visible = false
		add_child(mk)
		traffic_markers.append(mk)
	# Phase 3: save persistence — restore the store before the bridge reads it
	save_store = SaveStore.new()
	save_store.restore_into(store)
	# aircraft: glb + 再構成マテリアル + コックピット
	aircraft = Node3D.new()
	add_child(aircraft)
	if shot_mode == "seminole":
		aircraft_id = "pa44"
	var built: Dictionary = AircraftSelect.build_aircraft(aircraft_id, aircraft)
	aircraft_node = built.get("node")
	print("aircraft materials: ", built.get("stats"))
	var ckpt: Node3D = CockpitBuild.build_cockpit()
	aircraft.add_child(ckpt)
	# コックピット内装はレイヤー2に置き、外部カメラからは見せない（外形の箱が透けるため）
	_set_layer_recursive(ckpt, 2)
	# G1000 をパネルのスロットへ SubViewport で貼る
	pfd_disp = _make_screen(ckpt, "PFD_SLOT", "PFD")
	mfd_disp = _make_screen(ckpt, "MFD_SLOT", "MFD")
	# cameras
	cam_cockpit = Camera3D.new()
	cam_cockpit.position = Vector3(-0.3, 0.62, -0.4)
	cam_cockpit.rotation_degrees = Vector3(-10, 0, 0)
	cam_cockpit.fov = 75.0
	cam_cockpit.cull_mask = 1 | 2
	aircraft.add_child(cam_cockpit)
	cam_external = Camera3D.new()
	cam_external.cull_mask = 1
	add_child(cam_external)
	cam_cockpit.make_current()
	# HUD
	var layer := CanvasLayer.new()
	hud_layer = layer
	add_child(layer)
	hud_status = _mk_label(layer, Vector2(16, 10), 18)
	hud_panel = _mk_label(layer, Vector2(16, 640), 18)
	hud_toast = _mk_label(layer, Vector2(340, 60), 22)
	hud_career = _mk_label(layer, Vector2(16, 300), 16)
	hud_debrief = _mk_label(layer, Vector2(560, 300), 15)
	var help := _mk_label(layer, Vector2(760, 10), 14)
	help.text = "1 フリー滑走路 / 2 エプロン / 3-6 レッスン a1・t1・t2・t3\nC 視点切替 / F2 AP / F5-F10 G1000ノブ / F11 機体切替\nF3 キャリア開始・次の予定 / F4 徒歩モード / W/S 機首 R/F スロットル\nTab EFB / P リプレイ（Cでカメラ切替） / J 会話 / F12 設定"
	# Phase 5: version in the bottom-right corner of the screen
	hud_version = _mk_label(layer, Vector2(1150, 692), 12)
	hud_version.text = "CADET " + version_string()
	# Phase 4: dialog UI (bottom panel), EFB overlay, debrief profile graph,
	# device settings panel — all hidden until invoked.
	dialog_ui = DialogUI.new()
	dialog_ui.position = Vector2(16, 470)
	dialog_ui.size = Vector2(900, 220)
	dialog_ui.visible = false
	layer.add_child(dialog_ui)
	if typeof(store.get("cadet-dialog")) == TYPE_STRING:
		var dj = JSON.parse_string(String(store["cadet-dialog"]))
		if typeof(dj) == TYPE_DICTIONARY:
			dialog_state = dj
	efb = EFB.new()
	efb.position = Vector2(484, 80)
	efb.size = Vector2(780, 540)
	efb.visible = false
	layer.add_child(efb)
	efb.set_aircraft(aircraft_id)
	efb.set_checklist(aircraft_id, "before_start")
	profile_graph = ProfileGraph.new()
	profile_graph.position = Vector2(560, 60)
	profile_graph.size = Vector2(700, 210)
	profile_graph.visible = false
	layer.add_child(profile_graph)
	device_map = CadetDeviceMap.new()
	device_map.load_settings()
	device_panel = PanelContainer.new()
	device_panel.position = Vector2(300, 90)
	device_panel.size = Vector2(680, 540)
	device_panel.visible = false
	layer.add_child(device_panel)
	_rebuild_device_ui()
	Input.joy_connection_changed.connect(func(_i, _c): _rebuild_device_ui())
	replay_player = ReplayPlayer.new()
	add_child(replay_player)
	# bridge + autopilot (Phase 4: pad reading goes through the device map
	# so yoke/pedals/throttle can live on separate physical devices)
	bridge = Bridge.new({"store": store, "readPad": Callable(self, "_read_pad_merged")})
	# Phase 4: spatial audio engine, driven per-frame from the bridge state
	audio_eng = CadetAudioEngine.new()
	add_child(audio_eng)
	audio_eng.attach_aircraft(aircraft)
	ap = CadetAutopilot.new()
	_ap_pilot = func(L, dt):
		if ap.is_on():
			ap.pilot(L, dt)
	if shot_mode == "apron":
		var spot: Dictionary = AB.apron_spot()
		bridge.start_on_ground(float(spot["n"]), float(spot["e"]), 354.0, "pa28", {"wind": "calm"})
		view_external = true
		cam_external.make_current()
	elif shot_mode == "external":
		bridge.start_free("rwy", "pa28", {"wind": "calm"})
		view_external = true
		cam_external.make_current()
	elif shot_mode == "seminole":
		# parked on the apron: the scripted takeoff pilot is tuned for the
		# Archer, so the Seminole portrait is taken on the ground.
		var spot2: Dictionary = AB.apron_spot()
		bridge.start_on_ground(float(spot2["n"]), float(spot2["e"]), 354.0, "pa44", {"wind": "calm"})
		view_external = true
		cam_external.make_current()
	elif shot_mode == "walk" or shot_mode == "p4walk" or shot_mode == "p5walk":
		bridge.start_free("rwy", "pa28", {"wind": "calm"})
		walker = WorldBuild.create_walker(world, 655.0, 232.0, 0.0)
		view_external = true
		cam_external.make_current()
	elif shot_mode == "p4external" or shot_mode == "p5external":
		bridge.start_free("rwy", "pa28", {"wind": "calm"})
		view_external = true
		cam_external.make_current()
	elif shot_mode == "p4room" or shot_mode == "p5room":
		# Phase 4: interior portrait — briefing room 1, facing the instructor
		bridge.start_free("rwy", "pa28", {"wind": "calm"})
		view_external = true
		cam_external.make_current()
		cam_external.global_position = WorldBuild.rwy_to_world(644.8, 251.5, 1.55)
		cam_external.look_at(WorldBuild.rwy_to_world(634.9, 256.7, 1.10), Vector3.UP)
	else:
		bridge.start_free("rwy", "pa28", {"wind": "light"})
	_sync_visual(1.0)
	_update_screens()

func _set_layer_recursive(n: Node, layer: int) -> void:
	if n is VisualInstance3D:
		(n as VisualInstance3D).layers = 1 << (layer - 1)
	for c in n.get_children():
		_set_layer_recursive(c, layer)

func _mk_label(layer: CanvasLayer, pos: Vector2, size: int) -> Label:
	var l := Label.new()
	l.position = pos
	l.add_theme_font_size_override("font_size", size)
	l.add_theme_color_override("font_shadow_color", Color(0, 0, 0, 0.8))
	l.add_theme_constant_override("shadow_offset_x", 1)
	l.add_theme_constant_override("shadow_offset_y", 1)
	layer.add_child(l)
	return l

func _make_screen(ckpt: Node3D, slot_name: String, mode: String) -> G1000Display:
	var vp := SubViewport.new()
	vp.size = Vector2i(640, 400)
	vp.render_target_update_mode = SubViewport.UPDATE_ALWAYS
	vp.transparent_bg = false
	add_child(vp)
	var disp := G1000Display.new()
	disp.set_anchors_preset(Control.PRESET_FULL_RECT)
	disp.set_mode(mode)
	vp.add_child(disp)
	var slot := ckpt.find_child(slot_name, true, false) as MeshInstance3D
	if slot:
		var m := StandardMaterial3D.new()
		m.shading_mode = BaseMaterial3D.SHADING_MODE_UNSHADED
		m.albedo_texture = vp.get_texture()
		slot.material_override = m
	else:
		push_warning("slot not found: " + slot_name)
	return disp

func _toast(text: String) -> void:
	hud_toast.text = text
	toast_t = 4.0

func _flight_dict() -> Dictionary:
	var L = bridge.get_L()
	return {"L": L, "s": L["s"], "av": L["av"]}

func _ap_input_down(code: String) -> bool:
	return bool(_keys.get(code, false))

func _process(dt: float) -> void:
	if toast_t > 0.0:
		toast_t -= dt
		if toast_t <= 0.0:
			hud_toast.text = ""
	# traffic advance + markers (all modes)
	if traffic != null:
		traffic.update(minf(dt, 0.1) if shot_mode == "" else 0.1, null)
		_sync_traffic()
	# input
	if shot_mode == "":
		_keys = IM.poll_keys()
		for e in IM.pad_edges():
			if String(e) == "flaps":
				_toast(bridge.action("flaps"))
			elif String(e) == "flapsUp":
				_toast(bridge.action("flapsUp"))
		if walk_on and walker != null:
			var iv := Vector2(
				(1.0 if _keys.get("KeyD", false) else 0.0) - (1.0 if _keys.get("KeyA", false) else 0.0),
				(1.0 if _keys.get("KeyS", false) else 0.0) - (1.0 if _keys.get("KeyW", false) else 0.0))
			_walk_step(iv, dt)
			_sync_walk_cam()
		elif replay_on:
			# Phase 4: replay drives the aircraft node; the bridge is paused
			replay_player.update_playback(dt, aircraft)
			ReplayPlayer.frame_camera(replay_cam_mode, cam_external, aircraft, ReplayPlayer.tower_cab_position())
		else:
			_step_bridge(dt, _keys)
		if dialog_ui != null:
			dialog_ui.visible = dialog_ui.is_running()
	elif shot_mode == "walk" or shot_mode == "p4walk" or shot_mode == "p5walk":
		shot_t += dt
		_sync_walk_cam()
	elif shot_mode == "apron" or shot_mode == "seminole" or shot_mode == "p4room" or shot_mode == "p5room":
		shot_t += dt
		_step_bridge(dt, {})
	else:
		# 撮影モード: ソフトウェアレンダリングでは実時間に追いつかないため、
		# 物理を描画から切り離し 1 フレームに 6 ステップ (1/60 s) 進める
		shot_t += dt
		for i in range(10):
			_step_bridge(1.0 / 60.0, _shot_keys())
	if not replay_on:
		_sync_visual(-1.0)
	_update_screens()
	_update_hud()
	_update_audio(dt)
	if not walk_on and shot_mode != "walk" and shot_mode != "p4walk" and shot_mode != "p5walk" and shot_mode != "p4room" and shot_mode != "p5room" and not replay_on:
		_update_external_cam(dt)
	if shot_mode != "":
		_maybe_shot()

func _step_bridge(dt: float, keys: Dictionary) -> void:
	_keys = keys
	var r: Dictionary = bridge.frame(dt, keys, {"pilot": _ap_pilot, "airPilot": true})
	for e in r["events"]:
		if String(e.get("type", "")) in ["touchdown", "hard_landing", "crash", "stall"]:
			_toast(String(e.get("type")) + (": " + String(e["why"]) if e.get("why") else ""))
	if bool(r["ended"]) and not finish_done:
		finish_done = true
		var rec = bridge.finish()
		var st = bridge.status()
		_toast("レッスン終了: %s グレード %s スコア %.2f %s" % [String(st["title"]), String(st["grade"]), float(st["score"]), String(st["reason"])])
		# Phase 3: persist + career bookkeeping + debrief
		if save_store != null:
			save_store.save(store)
		if typeof(rec) == TYPE_DICTIONARY:
			var db := "[デブリーフ] %s  グレード %s  スコア %.0f%%\n" % [String(rec.get("title", st["title"])), String(rec.get("grade", "")), float(rec.get("scorePct", 0.0))]
			for S in rec.get("steps", []):
				db += "・" + String(S.get("step", "")) + "\n"
				for x in S.get("rows", []):
					db += "   %s: %s（基準 %s）%s\n" % [String(x.get("name", "")), String(x.get("val", "")), String(x.get("std", "")), "" if x.get("pass") == null else (" ✓" if bool(x["pass"]) else " ✗")]
			hud_debrief.text = db
		# Phase 4: debrief profile graph + chime + post-flight conversation
		if rec_samples.size() > 5 and profile_graph != null:
			profile_graph.set_samples(rec_samples)
			profile_graph.visible = true
		if audio_eng != null:
			audio_eng.one_shot("chime")
		if driver != null and not career_item.is_empty():
			var L := {"id": String(st["id"]), "done": true, "passed": bool(st["passed"]), "grade": String(st["grade"]), "score": float(st["score"]), "level": {"id": "basic"}, "free": false}
			var kind := String(career_item.get("kind", ""))
			if kind == "checkride" or kind == "xc":
				if CadetCareer.CHECKS.has(String(career_item.get("id", ""))):
					driver.note_check(career_item, bool(st["passed"]))
				else:
					driver.note_flight({"kind": "flight", "id": String(career_item.get("id", ""))}, L)
			else:
				driver.note_flight(career_item, L)
			career_item = {}
			_show_career()
			# the day's return conversation (dialog data: day1 "return")
			var dd: Dictionary = (content.get("dialogs", {}) as Dictionary).get("day1", {})
			if typeof(dd.get("all")) == TYPE_DICTIONARY:
				_start_dialog(dd["all"], "return")
	# Phase 4: sample the flight for replay / profile (5 Hz, scene time)
	if shot_mode == "":
		rec_clock += dt
		rec_acc += dt
		if rec_acc >= 0.2:
			rec_acc = 0.0
			var s_now: Dictionary = bridge.get_s()
			if s_now != null:
				rec_samples.append(Recorder.snapshot(s_now, rec_clock))
	# autopilot housekeeping
	if ap.is_on():
		var msg: String = ap.update(dt, _flight_dict(), {"down": Callable(self, "_ap_input_down")})
		if msg != "":
			_toast(msg)

var _shot_calls := 0

func _shot_keys() -> Dictionary:
	if shot_mode == "apron":
		return {}
	_shot_calls += 1
	if _shot_calls < 30:
		return {} # 開始直後のキーは原典仕様でミュートされるため、まず離した状態を作る
	var s: Dictionary = bridge.get_s()
	if s == null:
		return {"KeyR": true}
	if float(s["out"]["ias"]) > 55.0:
		var pitch := float(s["out"]["pitch"])
		return {"KeyS": true} if pitch < 6.0 else ({"KeyW": true} if pitch > 11.0 else {})
	return {"KeyR": true}

func _sync_traffic() -> void:
	var poses: Array = traffic.poses
	for i in range(traffic_markers.size()):
		var mk: MeshInstance3D = traffic_markers[i]
		if i < poses.size():
			var p: Dictionary = poses[i]
			mk.visible = true
			mk.position = Vector3(float(p["e"]), float(p["y"]), -float(p["n"])) + VIS_OFF
			var q: Array = p["q"]
			mk.basis = Basis(Quaternion(float(q[0]), float(q[1]), float(q[2]), float(q[3])))
		else:
			mk.visible = false

func _sync_walk_cam() -> void:
	if walker == null:
		return
	cam_external.global_position = walker.global_position + Vector3(6.0, 3.2, 8.0)
	cam_external.look_at(walker.global_position + Vector3(0, 1.2, 0), Vector3.UP)

func _sync_visual(_alpha: float) -> void:
	var ps: Dictionary = bridge.pose()
	var p: Array = ps["pos"]
	var q: Array = ps["q"]
	aircraft.position = Vector3(float(p[0]), float(p[1]), float(p[2])) + VIS_OFF
	aircraft.basis = Basis(Quaternion(float(q[0]), float(q[1]), float(q[2]), float(q[3])))

func _update_external_cam(_dt: float) -> void:
	if not view_external:
		return
	var back := aircraft.global_transform.basis * Vector3(6.5, 2.6, 9.0)
	cam_external.global_position = aircraft.global_position + back
	cam_external.look_at(aircraft.global_position + aircraft.global_transform.basis * Vector3(0, 0.5, -12.0), Vector3.UP)

func _update_screens() -> void:
	var L = bridge.get_L()
	if L == null:
		return
	var s: Dictionary = L["s"]
	var av: Dictionary = L["av"]
	var pos := {"n": -float(s["pos"][2]), "e": float(s["pos"][0])}
	var nav: Dictionary = CadetAvionics.nav_solve(av, pos, s["out"], FP.MAGVAR_W, FP.lab_rwy())
	var extra := {"pos": pos, "navDots": float(nav.get("dots", 0.0)), "fuelCap": float(s["A"].get("fuelCap", 24.0))}
	pfd_disp.set_state(av, s["out"], extra)
	mfd_disp.set_state(av, s["out"], extra)

func _update_hud() -> void:
	var st = bridge.status()
	if st == null:
		return
	var p: Dictionary = bridge.panel()
	var head := ""
	if String(st["mode"]) == "free":
		head = "フリー飛行"
	else:
		head = "%s（%s）ステップ %d/%d: %s" % [String(st["title"]), String(st["levelName"]), int(st["step"]) + 1, (st["steps"] as Array).size(), String(st["stepName"])]
	var say := String(st["sayText"])
	var guide := String(st["guideText"])
	hud_status.text = head + (("\n" + say) if say != "" else "") + (("\n" + guide) if guide != "" else "")
	if typeof(st["check"]) == TYPE_DICTIONARY:
		var items := ""
		for it in st["check"]["items"]:
			items += ("✓ " if bool(it["ok"]) else ("▶ " if bool(it["cur"]) else "・ ")) + String(it["name"]) + " — " + String(it["text"]) + "\n"
		hud_status.text += "\n[チェックリスト] " + String(st["check"]["title"]) + "\n" + items
	if typeof(st["atc"]) == TYPE_DICTIONARY:
		hud_status.text += "\n[無線] " + String(st["atc"].get("msg", "")) + "\n 1-3 で回答"
	hud_panel.text = "IAS %5.1f kt  ALT %6.0f ft  VS %+6.0f fpm  THR %3.0f%%  RPM %4.0f  FLAP %s%s  %s%s" % [
		float(p["ias"]), float(p["alt"]), float(p["vs"]), float(p["thr"]) * 100.0, float(p["rpm"]), String(p["flapLabel"]),
		"(移動中)" if bool(p["flapMoving"]) else "", "PARK" if bool(p["parkBrake"]) else "", "  AP ON" if ap.is_on() else ""]

func _maybe_shot() -> void:
	if shot_saved:
		return
	var s: Dictionary = bridge.get_s()
	var take := false
	if shot_mode == "apron":
		take = shot_t > 1.5
	elif shot_mode in ["cockpit", "external", "p4cockpit", "p4external", "p5cockpit", "p5external"]:
		if shot_mode in ["external", "p4external", "p5external"] and not view_external:
			view_external = true
			cam_external.make_current()
		take = s != null and float(s["out"]["altTrue"]) > 210.0
	if shot_mode in ["walk", "seminole", "p4walk", "p4room", "p5walk", "p5room"]:
		take = shot_t > 1.5
	if take:
		shot_saved = true
		await RenderingServer.frame_post_draw
		var img := get_viewport().get_texture().get_image()
		var prefix := "phase2-"
		var fname := shot_mode
		if shot_mode in ["walk", "seminole"]:
			prefix = "phase3-"
		elif shot_mode.begins_with("p4"):
			prefix = "phase4-"
			fname = shot_mode.substr(2)
		elif shot_mode.begins_with("p5"):
			prefix = "final-"
			fname = shot_mode.substr(2)
		var path := "res://build/" + prefix + fname + ".png"
		img.save_png(path)
		print("SHOT SAVED ", path, " ", img.get_size(), " alt=", s["out"]["altTrue"] if s else -1)
		get_tree().quit()

# ---------------------------------------------------------- Phase 3: career UI
func _show_career() -> void:
	if driver == null:
		hud_career.text = ""
		return
	var sch: Array = driver.schedule()
	var txt := "[キャリア] %d日目 %s  HAND %.0f KNOW %.0f COMM %.0f JUDGE %.0f 疲労 %.0f\n今日の予定:\n" % [
		driver.career.day(), driver.chapter(),
		driver.career.ability("hand"), driver.career.ability("know"), driver.career.ability("comm"), driver.career.ability("judge"), driver.career.tired()]
	for it in sch:
		txt += "・%s %s %s\n" % [String(it.get("kind", "")), String(it.get("title", "")), "✓" if bool(it.get("done", false)) else ""]
	txt += "F3: 次の予定を実行"
	hud_career.text = txt

func _career_advance() -> void:
	if driver == null:
		driver = CareerDriver.new(store, 11)
		_toast("キャリア開始")
		_show_career()
		# Phase 4: the career opens with the intro conversation (dialog data)
		var ia: Dictionary = (content.get("dialogs", {}) as Dictionary).get("intro", {})
		if typeof(ia.get("air")) == TYPE_DICTIONARY:
			_start_dialog(ia["air"], "intro")
		return
	if not exam_state.is_empty():
		return
	if drill_core != null:
		return # a ground-device drill is in progress; answer with 1-4
	driver.daily_decision_and_drills()
	for item in driver.schedule():
		if bool(item.get("done", false)):
			continue
		# Phase 4: ground-device lessons run the interactive drill first;
		# the driver's bookkeeping happens when the drill completes.
		if String(item.get("kind", "")) == "ftd":
			_start_drill(item)
			_show_career()
			return
		var act: String = driver.perform(item)
		if act == "done" or act == "graduate" or act == "skip":
			continue
		if act.begins_with("fly:"):
			career_item = item
			finish_done = false
			_reset_recorder()
			bridge.start_lesson(act.substr(4), "basic")
			# Phase 4: the day's radio brief (ATIS + exchanges) before flight
			hud_debrief.text = DialogUI.radio_panel_text(driver.career.weather(driver.prog))
			profile_graph.visible = false
			_toast("訓練開始: " + String(item.get("title", act)))
			_show_career()
			return
		if act.begins_with("check:"):
			career_item = item
			finish_done = false
			_reset_recorder()
			var cid := act.substr(6)
			var first_lesson := cid
			if CadetCareer.CHECKS.has(cid):
				first_lesson = String(CadetCareer.CHECKS[cid]["lessons"][0])
			bridge.start_lesson(first_lesson, "basic")
			hud_debrief.text = DialogUI.radio_panel_text(driver.career.weather(driver.prog))
			profile_graph.visible = false
			_toast("審査開始: " + String(item.get("title", act)))
			_show_career()
			return
		if act.begins_with("exam:"):
			_start_exam(act.substr(5))
			_show_career()
			return
	# nothing left today: sleep and advance
	var eod: Dictionary = driver.end_day()
	driver.save_all()
	if save_store != null:
		save_store.save(store)
	_toast("1日終了 → %d日目 %s" % [int(eod["day"]), String(eod["chapter"])])
	_show_career()

func _start_exam(eid: String) -> void:
	var cj = JSON.parse_string(FileAccess.get_file_as_string("res://data/content.json"))
	var banks: Dictionary = {}
	if typeof(cj) == TYPE_DICTIONARY:
		for b in cj.get("quiz", []):
			banks[String(b["id"])] = b["qs"]
	var qs: Array = []
	for bank_id in CadetCareer.EXAMS[eid]["banks"]:
		for q in banks.get(bank_id, []):
			qs.append({"q": q[0], "opts": q[1], "ok": int(q[2]), "why": q[3], "picked": -1})
	qs.shuffle()
	exam_state = {"id": eid, "qs": qs.slice(0, mini(30, qs.size())), "i": 0}
	_show_exam()

func _show_exam() -> void:
	if exam_state.is_empty():
		return
	var qs: Array = exam_state["qs"]
	var i := int(exam_state["i"])
	if i >= qs.size():
		return
	var q: Dictionary = qs[i]
	var txt := "[試験 %s] %d/%d  %s\n" % [String(exam_state["id"]), i + 1, qs.size(), String(q["q"])]
	var oi := 0
	for o in q["opts"]:
		oi += 1
		txt += "  %d. %s\n" % [oi, String(o)]
	hud_career.text = txt

func _exam_answer(pick: int) -> void:
	var qs: Array = exam_state["qs"]
	var i := int(exam_state["i"])
	qs[i]["picked"] = pick
	exam_state["i"] = i + 1
	if i + 1 >= qs.size():
		var res: Dictionary = driver.take_exam(String(exam_state["id"]), qs)
		exam_state = {}
		if save_store != null:
			save_store.save(store)
		_toast("試験結果: %.0f%%（%d/%d）" % [float(res["pct"]), int(res["right"]), int(res["n"])])
		_show_career()
	else:
		_show_exam()

func _toggle_walk() -> void:
	walk_on = not walk_on
	if walk_on:
		if walker == null:
			walker = WorldBuild.create_walker(self, 655.0, 262.0, 0.0)
			walk_pos = Vector3(655.0, 0.0, 262.0)
		view_external = true
		cam_external.make_current()
		_toast("徒歩モード（学園前）W/A/S/D で移動、F4 で戻る")
	else:
		view_external = false
		cam_cockpit.make_current()
		_toast("コックピットへ")

func _cycle_aircraft() -> void:
	var ids := ["pa28", "pa44", "pa28r"]
	aircraft_id = ids[(ids.find(aircraft_id) + 1) % ids.size()]
	if aircraft_node != null:
		aircraft_node.queue_free()
	var built: Dictionary = AircraftSelect.build_aircraft(aircraft_id, aircraft)
	aircraft_node = built.get("node")
	finish_done = false
	_reset_recorder()
	bridge.start_free("rwy", aircraft_id, {"wind": "light"})
	if efb != null:
		efb.set_aircraft(aircraft_id)
		efb.set_checklist(aircraft_id, "before_start")
		if audio_eng != null:
			audio_eng.attach_aircraft(aircraft)
	_toast("機体: " + aircraft_id + ("（Arrow は Archer 外形を流用）" if aircraft_id == "pa28r" else ""))

func _unhandled_input(event: InputEvent) -> void:
	if shot_mode != "":
		return
	if event is InputEventKey and event.pressed and not event.echo:
		# Phase 4: an open conversation takes Enter / number keys first
		if dialog_ui != null and dialog_ui.is_running():
			if event.keycode in [KEY_ENTER, KEY_KP_ENTER]:
				dialog_ui.advance()
				return
			if event.keycode in [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6]:
				dialog_ui.choose(event.keycode - KEY_1)
				return
		# Phase 4: a running ground drill takes the number keys
		if drill_core != null and event.keycode in [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6]:
			_drill_answer(event.keycode - KEY_1)
			return
		if event.keycode == KEY_TAB:
			if efb != null:
				efb.visible = not efb.visible
			return
		if event.keycode == KEY_F12:
			if device_panel != null:
				device_panel.visible = not device_panel.visible
				if device_panel.visible:
					_rebuild_device_ui()
			return
		if event.keycode == KEY_P:
			_toggle_replay()
			return
		if event.keycode == KEY_J:
			if dialog_ui != null and not dialog_ui.is_running():
				var dd2: Dictionary = (content.get("dialogs", {}) as Dictionary).get("day1", {})
				if typeof(dd2.get("all")) == TYPE_DICTIONARY:
					_start_dialog(dd2["all"], "transit")
			return
		if event.keycode == KEY_C and replay_on:
			var modes := ["tower", "chase", "wing"]
			replay_cam_mode = modes[(modes.find(replay_cam_mode) + 1) % modes.size()]
			_toast("リプレイカメラ: " + replay_cam_mode)
			return
		var code := ""
		match event.keycode:
			KEY_ENTER: code = "Enter"
			KEY_KP_ENTER: code = "NumpadEnter"
			KEY_V: code = "KeyV"
			KEY_G: code = "KeyG"
			KEY_T: code = "KeyT"
			KEY_L: code = "KeyL"
			KEY_U: code = "KeyU"
			KEY_X: code = "KeyX"
			KEY_Z: code = "KeyZ"
			KEY_BRACKETLEFT: code = "BracketLeft"
			KEY_BRACKETRIGHT: code = "BracketRight"
		if event.keycode == KEY_C:
			view_external = not view_external
			(cam_external if view_external else cam_cockpit).make_current()
			return
		if event.keycode == KEY_F2:
			var msg: String = ap.control(_flight_dict(), "AP")
			_toast(msg)
			return
		if event.keycode in [KEY_F5, KEY_F6, KEY_F7, KEY_F8, KEY_F9, KEY_F10]:
			var av: Dictionary = bridge.get_av()
			var knob := ""
			var dir := 1
			match event.keycode:
				KEY_F5: knob = "HDG"; dir = -1
				KEY_F6: knob = "HDG"; dir = 1
				KEY_F7: knob = "ALT"; dir = -1
				KEY_F8: knob = "ALT"; dir = 1
				KEY_F9: knob = "RANGE"; dir = -1
				KEY_F10: knob = "RANGE"; dir = 1
			pfd_disp.knob(knob, dir)
			mfd_disp.knob(knob, dir)
			# ノブ操作は av 本体へも反映する（AP の目標）
			CadetAvionics.control(av, "HDG" if knob == "HDG" else ("ALT" if knob == "ALT" else "RANGE"), dir)
			return
		# Phase 3: exam answering takes the number keys while active
		if not exam_state.is_empty() and event.keycode in [KEY_1, KEY_2, KEY_3, KEY_4]:
			_exam_answer(event.keycode - KEY_1)
			return
		if event.keycode == KEY_F3:
			_career_advance()
			return
		if event.keycode == KEY_F4:
			_toggle_walk()
			return
		if event.keycode == KEY_F11:
			_cycle_aircraft()
			return
		var st = bridge.status()
		var atc_open := st != null and typeof(st["atc"]) == TYPE_DICTIONARY
		if event.keycode in [KEY_1, KEY_2, KEY_3, KEY_4, KEY_5, KEY_6] and not atc_open:
			finish_done = false
			_reset_recorder()
			if profile_graph != null:
				profile_graph.visible = false
			match event.keycode:
				KEY_1: bridge.start_free("rwy", "pa28", {"wind": "light"})
				KEY_2:
					var spot: Dictionary = AB.apron_spot()
					bridge.start_on_ground(float(spot["n"]), float(spot["e"]), 354.0)
				KEY_3: bridge.start_lesson("a1", "intro")
				KEY_4: bridge.start_lesson("t1", "intro")
				KEY_5: bridge.start_lesson("t2", "intro")
				KEY_6: bridge.start_lesson("t3", "intro")
			_toast("開始: " + String(bridge.status()["title"]))
			return
		if event.keycode == KEY_N and st != null and bool(st["done"]):
			bridge.continue_free()
			_toast("フリー飛行に継続")
			return
		if event.keycode in [KEY_1, KEY_2, KEY_3] and atc_open:
			code = "Digit" + str(event.keycode - KEY_0)
		if code != "":
			var r = bridge.key(code, event.shift_pressed)
			if typeof(r) == TYPE_DICTIONARY and String(r.get("text", "")) != "":
				_toast(String(r["text"]))

# ---------------------------------------------------------- Phase 4 helpers
## Phase 5: one settings panel — app settings (quality / volume / AI
## key) stacked over the device assignment UI, all persisted to the
## same user://cadet_settings.cfg.
func _rebuild_device_ui() -> void:
	if device_panel == null or device_map == null:
		return
	for c in device_panel.get_children():
		device_panel.remove_child(c)
		c.free()
	var vbox := VBoxContainer.new()
	vbox.add_theme_constant_override("separation", 12)
	if app_settings != null:
		vbox.add_child(CadetAppSettings.build_settings_ui(app_settings, Callable(self, "_apply_quality")))
	vbox.add_child(CadetDeviceMap.build_settings_ui(device_map))
	device_panel.add_child(vbox)

## Phase 5: (re)apply the persisted quality preset to the live scene.
func _apply_quality() -> void:
	if app_settings != null:
		CadetAppSettings.apply_spec(app_settings.spec(), sun_light, world_env, clouds_root)

## Bridge pad reader: roles resolved through the device map (identity-based,
## no fall-through). With nothing connected/assigned it is exactly the
## Phase 2 behaviour (first pad via input_map).
func _read_pad_merged(_L = null, _dt: float = 0.0):
	if device_map == null:
		return IM.read_pad(_L, _dt)
	var res: Dictionary = device_map.resolve_connected()
	var any := false
	for k in res:
		if int(res[k]) >= 0:
			any = true
	if not any:
		return IM.read_pad(_L, _dt)
	var merged: Dictionary = device_map.read_merged(Callable(CadetDeviceMap, "live_axis_reader"))
	var dz := func(v: float) -> float:
		return 0.0 if absf(v) < 0.12 else (v - signf(v) * 0.12) / 0.88
	var yoke_idx := int(res.get("yoke", -1))
	var gx := float(merged.get("yoke_x", 0.0))
	var gy := float(merged.get("yoke_y", 0.0))
	return {
		"stick": absf(gx) > 0.001 or absf(gy) > 0.001,
		"tr": dz.call(gx), "tp": dz.call(gy), "ty": dz.call(float(merged.get("rudder", 0.0))),
		"brake": yoke_idx >= 0 and Input.is_joy_button_pressed(yoke_idx, JOY_BUTTON_A),
	}

func _dialog_ctx() -> Dictionary:
	var d := {"day": 1, "chapter": "ch1"}
	if driver != null:
		d["day"] = driver.career.day()
		d["chapter"] = driver.chapter()
	return d

func _start_dialog(data: Dictionary, id: String) -> void:
	if dialog_ui == null or data.is_empty():
		return
	dialog_ui.setup(data, dialog_state, Callable(self, "_dialog_ctx"), Callable(self, "_on_dialog_finished"))
	if dialog_ui.start_dialog(id):
		dialog_ui.visible = true

func _on_dialog_finished() -> void:
	if dialog_ui == null:
		return
	dialog_state = dialog_ui.get_state()
	store["cadet-dialog"] = JSON.stringify(dialog_state)
	if save_store != null:
		save_store.save(store)

func _start_drill(item: Dictionary) -> void:
	drill_item = item
	drill_core = DialogUI.DrillCore.new()
	var q: Dictionary = drill_core.start(String(item.get("id", "k1")), 1)
	_show_drill(q)

func _show_drill(q: Dictionary) -> void:
	if q.has("error"):
		_toast("ドリルを開けません: " + String(q["error"]))
		drill_core = null
		drill_item = {}
		return
	var txt := "[訓練装置 %s] %d/%d  %s\n" % [String(drill_item.get("id", "")), int(q.get("idx", 0)) + 1, int(q.get("total", 10)), String(q.get("prompt", ""))]
	var i := 0
	for ch in q.get("choices", []):
		i += 1
		txt += "  %d. %s\n" % [i, String(ch)]
	txt += "数字キーで回答"
	hud_career.text = txt

func _drill_answer(pick: int) -> void:
	if drill_core == null:
		return
	var r: Dictionary = drill_core.answer(pick)
	if String(r.get("explain", "")) != "":
		_toast(("正解。" if bool(r.get("correct", false)) else "不正解。") + String(r["explain"]))
	if not bool(r.get("done", false)):
		_show_drill(r["next"])
		return
	var it := drill_item
	var passed := bool(r.get("passed", false))
	if passed and driver != null:
		for pair in r.get("growth", []):
			driver.career.grow(String(pair[0]), float(pair[1]), "ftd:" + String(it.get("id", "")))
	drill_core = null
	drill_item = {}
	if driver != null:
		driver.perform(it)
		if save_store != null:
			save_store.save(store)
	_toast("ドリル完了: スコア %d/10 %s" % [int(r.get("score", 0)), "合格" if passed else "不合格（記帳のみ）"])
	_show_career()

func _reset_recorder() -> void:
	rec_samples.clear()
	rec_acc = 0.0
	rec_clock = 0.0

func _toggle_replay() -> void:
	if replay_on:
		replay_on = false
		replay_player.set_playing(false)
		(cam_external if view_external else cam_cockpit).make_current()
		_toast("リプレイ終了")
		return
	if rec_samples.size() < 10:
		_toast("リプレイ用の記録がまだありません（飛行すると記録されます）")
		return
	replay_on = true
	replay_player.load_samples(rec_samples)
	replay_player.set_playing(true)
	replay_cam_mode = "chase"
	view_external = true
	cam_external.make_current()
	profile_graph.set_samples(rec_samples)
	profile_graph.visible = true
	if audio_eng != null:
		audio_eng.update_state({"running": false, "rpm": 0.0})
	_toast("リプレイ再生中（C: カメラ tower/chase/wing、P: 終了）")

## Walk with interior collision: wish semantics identical to the old
## step_walker(yaw=0) (W = -z world), converted into the runway frame where
## WalkPhysics resolves walls (door gaps open) and stair step-ups.
func _walk_step(iv: Vector2, dt: float) -> void:
	if walker == null:
		return
	var wish_world := Vector3(iv.x, 0.0, -iv.y)
	var p0 := WorldBuild.rwy_to_world(walk_pos.x, walk_pos.z, walk_pos.y)
	var p1 := p0 + wish_world
	var rwy: Dictionary = FP.lab_rwy()
	var ac1: Dictionary = FP.rwyCoords(rwy, -p1.z, p1.x - 40000.0)
	var wish_ac := Vector2(float(ac1["along"]) - walk_pos.x, float(ac1["cross"]) - walk_pos.z)
	var fn := walk_floor_fn
	if not fn.is_valid():
		fn = WalkPhysics.make_floor_fn([], 0.0)
	var r: Dictionary = WalkPhysics.move(walk_pos, wish_ac, dt, 3.0, walk_walls, fn)
	walk_pos = r["pos"]
	walker.position = WorldBuild.rwy_to_world(walk_pos.x, walk_pos.z, walk_pos.y)

func _update_audio(dt: float) -> void:
	if audio_eng == null or bridge == null:
		return
	_rain_t += dt
	if _rain_t >= 1.0:
		_rain_t = 0.0
		_rain_cache = 0.0
		if driver != null:
			var w: Dictionary = driver.career.weather(driver.prog)
			if w.has("rain"):
				_rain_cache = clampf(float(w["rain"]), 0.0, 1.0)
			elif String(w.get("kind", "")).contains("rain"):
				_rain_cache = 0.7
	var p: Dictionary = bridge.panel()
	var s = bridge.get_s()
	var rough := 0.0
	var starting := false
	if typeof(s) == TYPE_DICTIONARY:
		if typeof(s.get("out")) == TYPE_DICTIONARY:
			rough = float(s["out"].get("rough", 0.0))
		var eng = s.get("eng")
		if typeof(eng) == TYPE_ARRAY and not eng.is_empty() and typeof(eng[0]) == TYPE_DICTIONARY:
			starting = float(eng[0].get("crankT", 0.0)) > 0.0
	audio_eng.update_state({
		"rpm": float(p["rpm"]), "thr": float(p["thr"]), "rough": rough,
		"running": bool(p["engRun"]), "starting": starting, "ias": float(p["ias"]),
		"on_ground": bool(p["onGround"]), "rain": _rain_cache,
		"gear_moving": str(p.get("gear", "")) == "moving", "flap_moving": bool(p["flapMoving"]),
		"aircraft_id": aircraft_id, "stall": bool(p["stall"]), "inside": not view_external})
