class_name CadetAppSettings
extends RefCounted

## Phase 5: unified application settings — one file, one panel.
##
## Everything user-facing lives in user://cadet_settings.cfg:
##   [display] quality          — this class ("low" / "medium" / "high")
##   [audio]   master_volume    — this class (0.0 .. 1.0, linear)
##   [ai]      api_key          — CadetAiInstructor (this class only
##                                mirrors it so the panel can edit it)
##   [devices] assignments/axes — CadetDeviceMap (untouched here)
## Saving always loads the file first and rewrites only the caller's own
## keys, so the sections above never clobber each other (same pattern as
## CadetDeviceMap.save_settings).
##
## Quality presets change the effects the task names — sun shadow, fog
## and clouds — through quality_spec(), a pure function the headless
## tests assert on; scenes/main.gd applies the spec to the live
## Environment / DirectionalLight3D / cloud root at boot and whenever
## the panel changes the preset.

const SETTINGS_PATH := "user://cadet_settings.cfg"
const SECTION_DISPLAY := "display"
const SECTION_AUDIO := "audio"
const SECTION_AI := "ai"
const KEY_QUALITY := "quality"
const KEY_VOLUME := "master_volume"
const KEY_API := "api_key"

const PRESETS: Array[String] = ["low", "medium", "high"]
const PRESET_LABELS := {"low": "低", "medium": "中", "high": "高"}
const DEFAULT_QUALITY := "medium"
const DEFAULT_VOLUME := 1.0

var settings_path := SETTINGS_PATH
var quality := DEFAULT_QUALITY
var master_volume := DEFAULT_VOLUME

func _init(p_settings_path: String = SETTINGS_PATH) -> void:
	settings_path = p_settings_path

# ------------------------------------------------------------ quality spec
## Pure: the rendering knobs per preset. Medium reproduces the Phase 4
## normalised environment exactly (800 m / 4-split shadows, fog 0.0002,
## full clouds). Low trades shadows off and thickens fog (hides far
## detail); high extends shadows and thins fog.
static func quality_spec(preset: String) -> Dictionary:
	match preset:
		"low":
			return {"shadow": false, "shadow_distance": 0.0, "fog_density": 0.00045, "clouds": "layer"}
		"high":
			return {"shadow": true, "shadow_distance": 1500.0, "fog_density": 0.00012, "clouds": "full"}
		_:
			return {"shadow": true, "shadow_distance": 800.0, "fog_density": 0.0002, "clouds": "full"}

static func valid_quality(q: String) -> String:
	return q if PRESETS.has(q) else DEFAULT_QUALITY

func spec() -> Dictionary:
	return quality_spec(quality)

## Apply a spec to the live scene pieces (null-safe; used by main.gd).
## clouds_root: the node returned by SkyClouds.build_clouds — billboard
## nodes are named Cumulus_* / CumulusNb_*; the stratus layer stays.
static func apply_spec(spec_: Dictionary, sun: DirectionalLight3D, env: Environment, clouds_root: Node) -> void:
	if sun != null:
		sun.shadow_enabled = bool(spec_.get("shadow", true))
		var d := float(spec_.get("shadow_distance", 800.0))
		if d > 0.0:
			sun.directional_shadow_max_distance = d
	if env != null:
		env.fog_density = float(spec_.get("fog_density", 0.0002))
	if clouds_root != null:
		var full := String(spec_.get("clouds", "full")) == "full"
		for c in clouds_root.get_children():
			if String(c.name).begins_with("Cumulus"):
				(c as Node3D).visible = full

# ------------------------------------------------------------------ volume
## Pure: linear 0..1 → Master bus dB (0 dB at 1.0, silence floor -60 dB).
static func volume_to_db(v: float) -> float:
	var c := clampf(v, 0.0, 1.0)
	if c <= 0.001:
		return -60.0
	return maxf(-60.0, linear_to_db(c))

func apply_volume() -> void:
	var idx := AudioServer.get_bus_index("Master")
	if idx >= 0:
		AudioServer.set_bus_volume_db(idx, volume_to_db(master_volume))
		AudioServer.set_bus_mute(idx, master_volume <= 0.001)

# ------------------------------------------------------------- persistence
func load_settings() -> bool:
	var cfg := ConfigFile.new()
	if cfg.load(settings_path) != OK:
		return false
	quality = valid_quality(String(cfg.get_value(SECTION_DISPLAY, KEY_QUALITY, DEFAULT_QUALITY)).strip_edges())
	master_volume = clampf(float(cfg.get_value(SECTION_AUDIO, KEY_VOLUME, DEFAULT_VOLUME)), 0.0, 1.0)
	return true

func save_settings() -> bool:
	var cfg := ConfigFile.new()
	cfg.load(settings_path) # sibling sections ([devices], [ai]) survive
	cfg.set_value(SECTION_DISPLAY, KEY_QUALITY, quality)
	cfg.set_value(SECTION_AUDIO, KEY_VOLUME, master_volume)
	return cfg.save(settings_path) == OK

func set_quality(q: String, save := true) -> void:
	quality = valid_quality(q)
	if save:
		save_settings()

func set_volume(v: float, save := true) -> void:
	master_volume = clampf(v, 0.0, 1.0)
	apply_volume()
	if save:
		save_settings()

## AI key mirror: same file/section/key CadetAiInstructor reads. The
## key is written only when the user edits it in the panel; the game
## never creates it on its own beyond the settings file itself.
func get_api_key() -> String:
	var cfg := ConfigFile.new()
	if cfg.load(settings_path) != OK:
		return ""
	return String(cfg.get_value(SECTION_AI, KEY_API, "")).strip_edges()

func set_api_key(key: String) -> bool:
	var cfg := ConfigFile.new()
	cfg.load(settings_path)
	cfg.set_value(SECTION_AI, KEY_API, key.strip_edges())
	return cfg.save(settings_path) == OK

# ---------------------------------------------------------------------- UI
## Settings block for the unified F12 panel (quality / volume / AI key).
## Plain Controls only — safe to build headless. on_changed is called
## after any persisted change so the scene can re-apply the quality
## spec live.
static func build_settings_ui(st: CadetAppSettings, on_changed := Callable()) -> Control:
	var vbox := VBoxContainer.new()
	vbox.name = "CadetAppSettings"
	var title := Label.new()
	title.name = "AppSettingsTitle"
	title.text = "設定（画質・音量・AI教官）"
	vbox.add_child(title)

	var qrow := HBoxContainer.new()
	qrow.name = "QualityRow"
	var qlab := Label.new()
	qlab.text = "画質プリセット"
	qlab.custom_minimum_size = Vector2(180, 0)
	qrow.add_child(qlab)
	var ob := OptionButton.new()
	ob.name = "QualityOption"
	ob.custom_minimum_size = Vector2(360, 0)
	for p in PRESETS:
		ob.add_item(String(PRESET_LABELS[p]))
		ob.set_item_metadata(ob.item_count - 1, p)
	ob.select(PRESETS.find(st.quality))
	ob.item_selected.connect(func(idx: int) -> void:
		st.set_quality(String(ob.get_item_metadata(idx)))
		if on_changed.is_valid():
			on_changed.call()
	)
	qrow.add_child(ob)
	vbox.add_child(qrow)

	var vrow := HBoxContainer.new()
	vrow.name = "VolumeRow"
	var vlab := Label.new()
	vlab.text = "音量（マスター）"
	vlab.custom_minimum_size = Vector2(180, 0)
	vrow.add_child(vlab)
	var slider := HSlider.new()
	slider.name = "VolumeSlider"
	slider.min_value = 0.0
	slider.max_value = 1.0
	slider.step = 0.01
	slider.value = st.master_volume
	slider.custom_minimum_size = Vector2(360, 0)
	slider.value_changed.connect(func(v: float) -> void:
		st.set_volume(v)
		if on_changed.is_valid():
			on_changed.call()
	)
	vrow.add_child(slider)
	vbox.add_child(vrow)

	var arow := HBoxContainer.new()
	arow.name = "AiKeyRow"
	var alab := Label.new()
	alab.text = "AI教官 APIキー"
	alab.custom_minimum_size = Vector2(180, 0)
	arow.add_child(alab)
	var edit := LineEdit.new()
	edit.name = "AiKeyEdit"
	edit.secret = true
	edit.placeholder_text = "（未設定なら空）"
	edit.text = st.get_api_key()
	edit.custom_minimum_size = Vector2(360, 0)
	edit.text_submitted.connect(func(t: String) -> void:
		st.set_api_key(t)
		if on_changed.is_valid():
			on_changed.call()
	)
	arow.add_child(edit)
	vbox.add_child(arow)
	return vbox
