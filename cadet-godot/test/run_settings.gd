extends SceneTree

## CADET Godot port — Phase 5 (release packaging) settings test runner.
## Usage: godot --headless --path <project> -s test/run_settings.gd
## Exit code: 0 = all pass, 1 = failures.
##
## Verifies src/app_settings.gd (CadetAppSettings): the three quality
## presets differ in the named effects (shadow / fog / clouds) and
## medium reproduces the Phase 4 environment; persistence round-trips
## through user://cadet_settings.cfg in ONE file together with the
## [devices] and [ai] sections (no clobbering either way); the master
## volume maps and applies to the real Master bus; the settings UI
## builds headless and its controls drive the same object; and the
## project version is 1.0.0.

const AppSettings = preload("res://src/app_settings.gd")
const DeviceMap = preload("res://src/device_map.gd")
const AiInstructor = preload("res://src/ai_instructor.gd")

var checks := 0
var failures := 0

func _chk(cond: bool, name: String) -> void:
	checks += 1
	if not cond:
		failures += 1
		print("FAIL " + name)

func _eq(got, want, name: String) -> void:
	checks += 1
	if got != want:
		failures += 1
		print("FAIL %s: got %s want %s" % [name, str(got), str(want)])

func _eqf(got: float, want: float, name: String) -> void:
	checks += 1
	if absf(got - want) > 1e-9:
		failures += 1
		print("FAIL %s: got %s want %s" % [name, str(got), str(want)])

func _init() -> void:
	_test_quality_spec()
	_test_apply_spec()
	_test_persistence_unified()
	_test_volume()
	_test_ui()
	_test_version()
	print("run_settings: %d checks, %d failures" % [checks, failures])
	quit(1 if failures > 0 else 0)

func _test_quality_spec() -> void:
	var low: Dictionary = AppSettings.quality_spec("low")
	var med: Dictionary = AppSettings.quality_spec("medium")
	var high: Dictionary = AppSettings.quality_spec("high")
	# medium == the Phase 4 normalised environment
	_eq(bool(med["shadow"]), true, "medium shadow on")
	_eqf(float(med["shadow_distance"]), 800.0, "medium shadow distance 800")
	_eqf(float(med["fog_density"]), 0.0002, "medium fog = Phase 4 value")
	_eq(String(med["clouds"]), "full", "medium clouds full")
	# low differs in all three named effects
	_eq(bool(low["shadow"]), false, "low shadow off")
	_chk(float(low["fog_density"]) > float(med["fog_density"]), "low fog denser than medium")
	_eq(String(low["clouds"]), "layer", "low clouds layer only")
	# high extends shadows and thins fog relative to medium
	_eq(bool(high["shadow"]), true, "high shadow on")
	_chk(float(high["shadow_distance"]) > float(med["shadow_distance"]), "high shadow distance > medium")
	_chk(float(high["fog_density"]) < float(med["fog_density"]), "high fog thinner than medium")
	_eq(String(high["clouds"]), "full", "high clouds full")
	# invalid presets fall back to medium everywhere
	_eq(AppSettings.valid_quality("ultra"), "medium", "invalid preset -> medium")
	_eq(AppSettings.quality_spec("ultra"), med, "invalid spec == medium spec")
	_eq(AppSettings.valid_quality("low"), "low", "low stays low")

func _test_apply_spec() -> void:
	var sun := DirectionalLight3D.new()
	var env := Environment.new()
	var root := Node3D.new()
	var cum := Node3D.new()
	cum.name = "Cumulus_0"
	root.add_child(cum)
	var nb := Node3D.new()
	nb.name = "CumulusNb_0"
	root.add_child(nb)
	var layer := Node3D.new()
	layer.name = "StratusLayer"
	root.add_child(layer)
	AppSettings.apply_spec(AppSettings.quality_spec("low"), sun, env, root)
	_eq(sun.shadow_enabled, false, "apply low: shadow off")
	_eqf(env.fog_density, 0.00045, "apply low: fog set")
	_eq(cum.visible, false, "apply low: cumulus hidden")
	_eq(nb.visible, false, "apply low: cumulus tower hidden")
	_eq(layer.visible, true, "apply low: stratus layer stays")
	AppSettings.apply_spec(AppSettings.quality_spec("high"), sun, env, root)
	_eq(sun.shadow_enabled, true, "apply high: shadow on")
	_eqf(sun.directional_shadow_max_distance, 1500.0, "apply high: shadow distance set")
	_eq(cum.visible, true, "apply high: cumulus back")
	# null-safety (main.gd calls it before clouds exist in some orders)
	AppSettings.apply_spec(AppSettings.quality_spec("medium"), null, null, null)
	_chk(true, "apply_spec null-safe")
	sun.free()
	env = null
	root.free()

func _test_persistence_unified() -> void:
	var path := "user://_test_settings_p5.cfg"
	# seed [ai] + [devices] through the other two owners first
	var ai := AiInstructor.new()
	ai.settings_path = path
	var seed := ConfigFile.new()
	seed.set_value("ai", "api_key", "sk-test-000")
	seed.save(path)
	var dm := DeviceMap.new(path)
	dm.register_role("yoke", "any")
	dm.set_assignment("yoke", "Pad A|guid-a")
	dm.save_settings()
	# now the app settings write their own sections into the same file
	var st := AppSettings.new(path)
	st.set_quality("high", false)
	st.set_volume(0.4, false)
	_chk(st.save_settings(), "app settings save ok")
	# reload everything fresh
	var st2 := AppSettings.new(path)
	_chk(st2.load_settings(), "app settings load ok")
	_eq(st2.quality, "high", "quality persisted")
	_eqf(st2.master_volume, 0.4, "volume persisted")
	_eq(st2.get_api_key(), "sk-test-000", "ai key survived app save")
	var dm2 := DeviceMap.new(path)
	_chk(dm2.load_settings(), "device load after app save ok")
	_eq(dm2.get_assignment("yoke"), "Pad A|guid-a", "device assignment survived app save")
	var ai2 := AiInstructor.new()
	ai2.settings_path = path
	_chk(ai2.has_key(), "ai instructor still sees key")
	# and the panel's api-key editor writes through the same file
	_chk(st2.set_api_key("sk-test-111"), "set_api_key ok")
	_eq(st2.get_api_key(), "sk-test-111", "api key editable via settings")
	var st3 := AppSettings.new(path)
	st3.load_settings()
	_eq(st3.quality, "high", "quality survived api write")
	# defaults on a missing file
	var st4 := AppSettings.new("user://_test_settings_p5_missing.cfg")
	_chk(not st4.load_settings(), "missing file load reports false")
	_eq(st4.quality, "medium", "default quality medium")
	_eqf(st4.master_volume, 1.0, "default volume 1.0")
	DirAccess.remove_absolute(path)

func _test_volume() -> void:
	_eqf(AppSettings.volume_to_db(1.0), 0.0, "volume 1.0 -> 0 dB")
	_eqf(AppSettings.volume_to_db(0.0), -60.0, "volume 0 -> floor")
	_eqf(AppSettings.volume_to_db(0.5), linear_to_db(0.5), "volume 0.5 -> linear_to_db")
	_chk(AppSettings.volume_to_db(0.25) < AppSettings.volume_to_db(0.5), "volume map monotonic")
	_eqf(AppSettings.volume_to_db(2.0), 0.0, "volume clamps above 1")
	var st := AppSettings.new("user://_test_settings_p5_vol.cfg")
	st.set_volume(0.5, false)
	var idx := AudioServer.get_bus_index("Master")
	_chk(idx >= 0, "Master bus exists")
	_chk(absf(AudioServer.get_bus_volume_db(idx) - linear_to_db(0.5)) < 1e-4, "apply_volume reaches Master bus")
	_eq(AudioServer.is_bus_mute(idx), false, "0.5 not muted")
	st.set_volume(0.0, false)
	_eq(AudioServer.is_bus_mute(idx), true, "0.0 mutes Master")
	st.set_volume(1.0, false) # leave the bus as we found it
	DirAccess.remove_absolute("user://_test_settings_p5_vol.cfg")

func _test_ui() -> void:
	var st := AppSettings.new("user://_test_settings_p5_ui.cfg")
	st.load_settings()
	var calls := [0]
	var ui := AppSettings.build_settings_ui(st, func() -> void: calls[0] += 1)
	_chk(ui != null, "settings ui builds")
	_eq(ui.name, "CadetAppSettings", "ui root name")
	var ob := ui.find_child("QualityOption", true, false) as OptionButton
	_chk(ob != null, "quality option present")
	_eq(ob.item_count, 3, "three presets offered")
	var slider := ui.find_child("VolumeSlider", true, false) as HSlider
	_chk(slider != null, "volume slider present")
	var edit := ui.find_child("AiKeyEdit", true, false) as LineEdit
	_chk(edit != null, "ai key edit present")
	# driving the controls drives the same settings object (and persists)
	ob.select(0) # 低
	ob.item_selected.emit(0)
	_eq(st.quality, "low", "ui quality selection applies")
	_chk(int(calls[0]) >= 1, "ui change notifies scene")
	slider.value = 0.3
	slider.value_changed.emit(0.3) # outside the tree Range does not auto-emit
	_eqf(st.master_volume, 0.3, "ui slider applies volume")
	edit.text = "sk-ui-1"
	edit.text_submitted.emit("sk-ui-1")
	_eq(st.get_api_key(), "sk-ui-1", "ui ai key applies")
	var st2 := AppSettings.new("user://_test_settings_p5_ui.cfg")
	st2.load_settings()
	_eq(st2.quality, "low", "ui-made quality persists across restart")
	_eqf(st2.master_volume, 0.3, "ui-made volume persists across restart")
	ui.free()
	DirAccess.remove_absolute("user://_test_settings_p5_ui.cfg")

func _test_version() -> void:
	_eq(String(ProjectSettings.get_setting("application/config/version", "")), "1.0.0", "project version is 1.0.0")
