class_name CadetAudioEngine
extends Node3D

## CADET Godot port — Phase 4, spatial audio (one stream of the wave).
##
## A procedural aircraft audio engine: no sound files. Every stream is
## synthesised at runtime into an AudioStreamWAV, following the Web Audio
## original in cadet/src/audio/sfx.js (game-quality wave version,
## ~/workspace/cadet-wt-gameq/cadet/src/audio/sfx.js, cross-checked against
## ~/workspace/cadet-wt-next/cadet/src/audio/sfx.js). The numbers in the
## static mapping functions below are the original's numbers; see
## PHASE4-AUDIO-NOTES.md for the full correspondence table.
##
## Bus layout (built in code, all sending to Master):
##   Master
##   +-- Engine   (the aircraft's engine loop; two low-pass stages whose
##   |             cut-offs follow inside/outside, sfx lp1/lp2)
##   +-- Wind     (airflow + tyre rumble)
##   +-- Weather  (rain on the airframe + rain on the ground)
##   +-- Mech     (one-shot pool: starter, backfire, gear burst, flap
##   |             clicks/burst, switch click, knob tick)
##   +-- Alert    (stall horn loop + one-shot pool: chime, AP warble)
##
## The engine / wind / rain players are AudioStreamPlayer3D children of
## this node; attach_aircraft() + update_state() keep this node glued to
## the aircraft's transform, so the 3D players follow it. (This class
## extends Node3D — a Node — precisely so that transform can be carried.)
##
## Contract with the integrator (scenes/main.gd wires this; not done here):
##   var eng = CadetAudioEngine.new()
##   add_child(eng)                       # anywhere in the flight scene
##   eng.attach_aircraft(aircraft_node3d)
##   eng.update_state({...})              # every frame, keys below
##   eng.one_shot("backfire")             # etc.
##
## update_state Dictionary keys (all optional, bad values are sanitised):
##   rpm float, thr 0..1, rough 0..1, running bool (default true),
##   starting bool, ias kt, on_ground bool, rain 0..1,
##   gear_moving bool, flap_moving bool,
##   aircraft_id "pa28"/"pa44"/"pa28r", stall bool, inside bool (default true)
##   _dt float (optional test hook: simulated seconds since the last call;
##   defaults to 1/60, the contract's every-frame call rate)
##
## One-shots: "backfire", "starter", "gear", "flap_step", "chime",
## "click", "knob", "ap_disc". Unknown names return false.

const MIX_RATE := 22050
const BUS_NAMES: Array[String] = ["Engine", "Wind", "Weather", "Mech", "Alert"]
## The engine loop holds a firing-pulse train at this frequency; the
## player's pitch_scale moves it to the real firing frequency.
const ENGINE_LOOP_HZ := 40.0
## The rain loops are built around the original's initial rain band.
const RAIN_BASE_HZ := 1100.0
## The wind loop is built around the original's initial airflow band.
const WIND_BASE_HZ := 500.0

## Starter compression times and first-firing times (sfx.js starter()).
const STARTER_C: Array[float] = [0.24, 0.5, 0.76, 1.0, 1.23]
const STARTER_F: Array[float] = [1.42, 1.57, 1.66, 1.81, 1.89, 1.97, 2.06, 2.13, 2.21]

# ------------------------------------------------------------------ helpers
static func _clamp01(x: float) -> float:
	return clampf(x, 0.0, 1.0)

static func _sstep(a: float, b: float, x: float) -> float:
	var t := clampf((x - a) / (b - a), 0.0, 1.0)
	return t * t * (3.0 - 2.0 * t)

static func _db(level: float) -> float:
	if level <= 0.0005:
		return -80.0
	return clampf(linear_to_db(level), -80.0, 6.0)

# ------------------------------------------------- roughness -> sound (pure)
## The speed wander's amplitude in cents, roughness part + base, exactly
## the original's detune gain before its 7 Hz low-pass:
##   jd.gain = 25 + 160 * idle + 300 * rough        (sfx.js voice())
## wobble_cents() is that expression at idle = 0 (cruise); the full form
## is wobble_cents_at(). At the original test's rough = 0.85 point this
## returns 280 cents — i.e. +255 over the healthy 25, satisfying the JS
## test's "grows by more than 150 cents" assertion. 0.85 / 0.9 are the
## JS test's verification points, not thresholds in the original code.
static func wobble_cents(rough: float) -> float:
	return 25.0 + 300.0 * _clamp01(rough)

static func wobble_cents_at(rough: float, idle: float) -> float:
	return 25.0 + 160.0 * _clamp01(idle) + 300.0 * _clamp01(rough)

## Misfire thinning (sfx.js voice()): while rough > 0.02 a fresh
## keep/drop decision is made every 0.05 + rng * 0.11 s, and a firing is
## dropped with probability rough * 0.55 (at rough 0.9: 0.495). A dropped
## decision scales the exhaust level to 0.08 + rng * 0.25 (see
## misfire_level()). rng_value is the caller's uniform in [0, 1).
static func misfire_probability(rough: float) -> float:
	var r := _clamp01(rough)
	if r <= 0.02:
		return 0.0
	return r * 0.55

static func misfire_drop(rough: float, rng_value: float) -> bool:
	var p := misfire_probability(rough)
	return p > 0.0 and rng_value >= 0.0 and rng_value < p

static func misfire_level(rough: float, rng_value: float, level_value: float) -> float:
	if misfire_drop(rough, rng_value):
		return 0.08 + 0.25 * _clamp01(level_value)
	return 1.0

## Seconds between misfire decisions (sfx.js: 0.05 + rng * 0.11).
static func misfire_interval(rng_value: float) -> float:
	return 0.05 + 0.11 * _clamp01(rng_value)

# ------------------------------------------------------- engine cycle (pure)
## One engine cycle = two crank revolutions (sfx.js: fc = max(rpm,60)/120).
static func cycle_hz(rpm: float) -> float:
	return maxf(rpm, 60.0) / 120.0

## Firing / blade-pass frequency: two pulses per revolution (rpm/60 * 2),
## the propeller oscillator in the original runs at fc * 4 — the same.
static func firing_hz(rpm: float) -> float:
	return maxf(rpm, 60.0) / 30.0

## idle factor (sfx.js: 1 - smoothstep(rpm, 750, 1600)).
static func idle_factor(rpm: float) -> float:
	return 1.0 - _sstep(750.0, 1600.0, rpm)

## fire factor while running (sfx.js: smoothstep(rpm, 250, 480)).
static func fire_factor(rpm: float, running: bool) -> float:
	if not running:
		return 0.0
	return _sstep(250.0, 480.0, rpm)

## Exhaust level before the misfire thinning (sfx.js:
## fire * (0.14 + 0.2 * thr + 0.06 * r), r = rpm / 2400).
static func exhaust_level(rpm: float, thr: float, running: bool) -> float:
	var r := clampf(rpm, 0.0, 3200.0) / 2400.0
	return fire_factor(rpm, running) * (0.14 + 0.2 * _clamp01(thr) + 0.06 * r)

# ------------------------------------------------------------ channels (pure)
## Airflow (sfx.js: u = min(ias/120, 1.4); gain u^2 * (inside 0.04 / out 0.09)).
static func wind_gain(ias: float, inside: bool) -> float:
	var u := minf(clampf(ias, 0.0, 300.0) / 120.0, 1.4)
	return u * u * (0.04 if inside else 0.09)

## Airflow band (sfx.js: inside 380 + 500u, outside 500 + 1500u).
static func wind_band_hz(ias: float, inside: bool) -> float:
	var u := minf(clampf(ias, 0.0, 300.0) / 120.0, 1.4)
	return (380.0 + 500.0 * u) if inside else (500.0 + 1500.0 * u)

## Tyre rumble on the ground (sfx.js: min(ias/30, 1) * (inside 0.1 / out 0.06)).
static func rumble_gain(ias: float, on_ground: bool, inside: bool) -> float:
	if not on_ground:
		return 0.0
	return minf(clampf(ias, 0.0, 300.0) / 30.0, 1.0) * (0.1 if inside else 0.06)

## Rain on the airframe (sfx.js game-quality version:
## rn * (0.012 + 0.05 * rsp^2) * (inside 1 / out 0.6), rsp = min(ias/110, 1.25)).
static func rain_air_gain(rain: float, ias: float, inside: bool) -> float:
	var rsp := minf(clampf(ias, 0.0, 300.0) / 110.0, 1.25)
	return _clamp01(rain) * (0.012 + 0.05 * rsp * rsp) * (1.0 if inside else 0.6)

## The airframe rain band climbs with speed (sfx.js: 1000 + 1900 * rsp).
static func rain_band_hz(ias: float) -> float:
	var rsp := minf(clampf(ias, 0.0, 300.0) / 110.0, 1.25)
	return 1000.0 + 1900.0 * rsp

## Rain on the ground (sfx.js ambience: rain * 0.05, through walls
## (1 - 0.8 * indoor); the cockpit's indoor is ~0.6, hence 0.52 inside).
static func rain_ground_gain(rain: float, inside: bool) -> float:
	return _clamp01(rain) * 0.05 * (0.52 if inside else 1.0)

## Stall horn (sfx.js: a 2800 Hz tone, gain inside 0.028 / outside 0.018).
static func horn_gain(inside: bool) -> float:
	return 0.028 if inside else 0.018

## Gear pump (sfx.js: sawtooth 410 Hz, gain inside 0.012 / outside 0.006).
static func gear_gain(inside: bool) -> float:
	return 0.012 if inside else 0.006

## Electric flap motor, the twin's (sfx.js: sawtooth 165 Hz,
## gain inside 0.009 / outside 0.004).
static func flap_gain(inside: bool) -> float:
	return 0.009 if inside else 0.004

# ------------------------------------------------------------------ instance
var buses: Dictionary = {} ## bus name -> AudioServer bus index
var streams: Dictionary = {} ## stream name -> AudioStreamWAV
var current_levels: Dictionary = {
	"engine": 0.0, "wind": 0.0, "rumble": 0.0, "rain_air": 0.0,
	"rain_ground": 0.0, "gear": 0.0, "flap": 0.0, "horn": 0.0,
}
var last_state: Dictionary = {}

var engine_player: AudioStreamPlayer3D
var wind_player: AudioStreamPlayer3D
var rumble_player: AudioStreamPlayer3D
var rain_player: AudioStreamPlayer3D
var ground_rain_player: AudioStreamPlayer3D
var gear_player: AudioStreamPlayer3D
var flap_player: AudioStreamPlayer3D
var horn_player: AudioStreamPlayer3D
var mech_pool: Array = [] ## Array[AudioStreamPlayer3D] on the Mech bus
var alert_pool: Array = [] ## Array[AudioStreamPlayer3D] on the Alert bus

var _aircraft: Node3D = null
var _aircraft_id := "pa28"
var _rng := RandomNumberGenerator.new()
var _sim_time := 0.0
var _miss_level := 1.0
var _next_miss_t := 0.0
var _crank_start_t := -1.0
var _prev_starting := false
var _prev_flap_moving := false
var _jitter := 0.0
var _jitter_target := 0.0
var _next_jitter_t := 0.0
var _lp1: AudioEffectLowPassFilter = null
var _lp2: AudioEffectLowPassFilter = null

func _init() -> void:
	_rng.seed = 20261101 # deterministic synthesis + misfire/jitter draws
	setup_buses()
	_build_streams()
	_build_players()

# --------------------------------------------------------------------- buses
## Idempotent: reuses buses another instance (or the editor) already made.
func setup_buses() -> void:
	for bus_name in BUS_NAMES:
		var idx := AudioServer.get_bus_index(bus_name)
		if idx == -1:
			AudioServer.add_bus()
			idx = AudioServer.get_bus_count() - 1
			AudioServer.set_bus_name(idx, bus_name)
			AudioServer.set_bus_send(idx, &"Master")
		AudioServer.set_bus_volume_db(idx, 0.0)
		AudioServer.set_bus_mute(idx, false)
		AudioServer.set_bus_solo(idx, false)
		buses[bus_name] = idx
	# The cabin's two low-pass stages on the Engine bus (sfx lp1/lp2:
	# inside 1000/2000 Hz, outside 9000/16000 Hz). Reuse if present.
	var eidx: int = buses["Engine"]
	_lp1 = null
	_lp2 = null
	for i in range(AudioServer.get_bus_effect_count(eidx)):
		var fx := AudioServer.get_bus_effect(eidx, i)
		if fx is AudioEffectLowPassFilter:
			if _lp1 == null:
				_lp1 = fx
			elif _lp2 == null:
				_lp2 = fx
	if _lp1 == null:
		_lp1 = AudioEffectLowPassFilter.new()
		AudioServer.add_bus_effect(eidx, _lp1)
	if _lp2 == null:
		_lp2 = AudioEffectLowPassFilter.new()
		AudioServer.add_bus_effect(eidx, _lp2)
	_lp1.cutoff_hz = 1000.0
	_lp2.cutoff_hz = 2000.0

func bus_index(bus_name: String) -> int:
	return int(buses.get(bus_name, AudioServer.get_bus_index(bus_name)))

# ------------------------------------------------------------------- players
func _mk_player(bus_name: String, stream: AudioStreamWAV) -> AudioStreamPlayer3D:
	var p := AudioStreamPlayer3D.new()
	p.bus = StringName(bus_name)
	p.stream = stream
	p.volume_db = -80.0
	p.unit_size = 2.5
	p.max_distance = 400.0
	p.attenuation_model = AudioStreamPlayer3D.ATTENUATION_INVERSE_DISTANCE
	p.doppler_tracking = AudioStreamPlayer3D.DOPPLER_TRACKING_DISABLED
	add_child(p)
	return p

func _build_players() -> void:
	engine_player = _mk_player("Engine", streams["engine_loop"])
	wind_player = _mk_player("Wind", streams["wind_loop"])
	rumble_player = _mk_player("Wind", streams["wind_loop"])
	rumble_player.pitch_scale = 0.22 # the wind loop pitched down: a 120 Hz-ish rumble bed
	rain_player = _mk_player("Weather", streams["rain_loop"])
	ground_rain_player = _mk_player("Weather", streams["rain_loop"])
	ground_rain_player.pitch_scale = 1500.0 / RAIN_BASE_HZ # the ground band sits at 1500 Hz (sfx ambience)
	gear_player = _mk_player("Mech", streams["gear_loop"])
	flap_player = _mk_player("Mech", streams["flap_motor_loop"])
	horn_player = _mk_player("Alert", streams["horn_loop"])
	for i in range(6):
		mech_pool.append(_mk_player("Mech", streams["click"]))
	for i in range(4):
		alert_pool.append(_mk_player("Alert", streams["chime"]))
	# The continuous beds run constantly at -80 dB until update_state
	# raises them; horn / gear / flap are started and stopped on demand.
	# (Playback itself starts in _ready / update_state: play() before
	# this node enters the tree is an engine error.)
	pass

func _ready() -> void:
	for p in [engine_player, wind_player, rumble_player, rain_player, ground_rain_player]:
		if not p.playing:
			p.play()

func get_stream(stream_name: String) -> AudioStreamWAV:
	return streams.get(stream_name) as AudioStreamWAV

# ------------------------------------------------------------- aircraft link
## Remember the aircraft node; this node (and with it every 3D player)
## takes the aircraft's global transform on every update_state/_process.
func attach_aircraft(node3d: Node3D) -> void:
	_aircraft = node3d
	_sync_to_aircraft()

func _sync_to_aircraft() -> void:
	if _aircraft != null and is_instance_valid(_aircraft):
		if is_inside_tree() and _aircraft.is_inside_tree():
			global_transform = _aircraft.global_transform
		else:
			# not in the tree yet (e.g. attach before add_child): the
			# local transform is the best available and raises no errors
			position = _aircraft.position
			rotation = _aircraft.rotation

func _process(_delta: float) -> void:
	_sync_to_aircraft()

# -------------------------------------------------------------- state input
func _f(d: Dictionary, key: String, def: float) -> float:
	var v = d.get(key, def)
	if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
		var fv := float(v)
		return def if is_nan(fv) or is_inf(fv) else fv
	return def

func _b(d: Dictionary, key: String, def: bool) -> bool:
	var v = d.get(key, def)
	return bool(v) if typeof(v) == TYPE_BOOL else def

func _smooth(cur: float, target: float, tc: float, dt: float) -> float:
	# the original's glide(): a setTargetAtTime with time constant tc
	return cur + (target - cur) * (1.0 - exp(-dt / maxf(tc, 0.001)))

func _set_level(player: AudioStreamPlayer3D, channel: String, target: float, tc: float, dt: float) -> void:
	var v := _smooth(float(current_levels[channel]), target, tc, dt)
	current_levels[channel] = v
	player.volume_db = _db(v)

func _play_if(player: AudioStreamPlayer3D) -> void:
	if is_inside_tree() and not player.playing:
		player.play()

func _stop_if(player: AudioStreamPlayer3D) -> void:
	if player.playing:
		player.stop()

## Advance every continuous channel from one frame of aircraft state.
## Safe with an empty or junk dictionary, and under the headless dummy
## audio driver. See the class header for the key contract.
func update_state(d: Dictionary) -> void:
	last_state = d.duplicate()
	var dt := clampf(_f(d, "_dt", 1.0 / 60.0), 0.0, 0.25)
	if dt <= 0.0:
		dt = 1.0 / 60.0
	_sim_time += dt
	_sync_to_aircraft()

	var rpm := clampf(_f(d, "rpm", 0.0), -100.0, 3200.0)
	var thr := _clamp01(_f(d, "thr", 0.0))
	var rough := _clamp01(_f(d, "rough", 0.0))
	var running := _b(d, "running", true)
	var starting := _b(d, "starting", false)
	var ias := clampf(_f(d, "ias", 0.0), 0.0, 300.0)
	var on_ground := _b(d, "on_ground", false)
	var rain := _clamp01(_f(d, "rain", 0.0))
	var gear_moving := _b(d, "gear_moving", false)
	var flap_moving := _b(d, "flap_moving", false)
	var stall := _b(d, "stall", false)
	var inside := _b(d, "inside", true)
	var aid := String(d.get("aircraft_id", _aircraft_id))
	if aid in ["pa28", "pa44", "pa28r"]:
		_aircraft_id = aid

	# --- the start: an edge of `starting` fires the starter one-shot and
	# stamps the crank time; while the start is under way the engine's own
	# voice only catches inside the original's window (sm(since,1.75,2.45)
	# of sfx.js voice(), and nothing after 3.5 s).
	if starting and not _prev_starting:
		_crank_start_t = _sim_time
		one_shot("starter")
	_prev_starting = starting
	var fire := 0.0
	if running:
		fire = fire_factor(rpm, true)
	elif _crank_start_t >= 0.0:
		var since := _sim_time - _crank_start_t
		if since < 3.5:
			fire = _sstep(1.75, 2.45, since)

	# --- misfire thinning + the speed wander's jitter (both from the
	# deterministic rng; decisions on the original's schedule)
	if rough > 0.02 and fire > 0.0:
		if _sim_time >= _next_miss_t:
			_miss_level = misfire_level(rough, _rng.randf(), _rng.randf())
			_next_miss_t = _sim_time + misfire_interval(_rng.randf())
	else:
		_miss_level = 1.0
	if _sim_time >= _next_jitter_t:
		_jitter_target = _rng.randf_range(-1.0, 1.0)
		_next_jitter_t = _sim_time + 0.015 # the jitter buffer's 15 ms steps
	_jitter = lerpf(_jitter, _jitter_target, clampf(dt * 18.0, 0.0, 1.0))

	# --- engine: pitch follows the firing frequency, bent by the wander;
	# level is the original's exhaust term, thinned by the misfires, and
	# passed through the cabin mix (inside 0.62 / outside 0.72, sfx mixG).
	var idle := idle_factor(rpm)
	var cents := wobble_cents_at(rough, idle) * _jitter
	engine_player.pitch_scale = firing_hz(rpm) / ENGINE_LOOP_HZ * pow(2.0, cents / 1200.0)
	var eng_target := exhaust_level(rpm, thr, running)
	if not running:
		eng_target = fire * (0.14 + 0.2 * thr + 0.06 * clampf(rpm, 0.0, 3200.0) / 2400.0)
	eng_target *= _miss_level * (0.62 if inside else 0.72)
	_set_level(engine_player, "engine", eng_target, 0.05, dt)
	_play_if(engine_player)
	if _lp1 != null:
		_lp1.cutoff_hz = 1000.0 if inside else 9000.0
	if _lp2 != null:
		_lp2.cutoff_hz = 2000.0 if inside else 16000.0

	# --- airflow + tyres (tc 0.2 / 0.08 in the original)
	wind_player.pitch_scale = wind_band_hz(ias, inside) / WIND_BASE_HZ
	_set_level(wind_player, "wind", wind_gain(ias, inside), 0.2, dt)
	_play_if(wind_player)
	_set_level(rumble_player, "rumble", rumble_gain(ias, on_ground, inside), 0.08, dt)
	_play_if(rumble_player)

	# --- rain: on the airframe whenever it precipitates; on the ground
	# only with the engine stopped (in the original the airframe's rain
	# replaces the ambience's while the engine graph lives).
	rain_player.pitch_scale = rain_band_hz(ias) / RAIN_BASE_HZ
	_set_level(rain_player, "rain_air", rain_air_gain(rain, ias, inside), 0.35, dt)
	_play_if(rain_player)
	var ground_target := 0.0
	if on_ground and not running and not starting:
		ground_target = rain_ground_gain(rain, inside)
	_set_level(ground_rain_player, "rain_ground", ground_target, 0.35, dt)
	_play_if(ground_rain_player)

	# --- gear pump (410 Hz saw loop) while the wheels travel
	if gear_moving:
		current_levels["gear"] = gear_gain(inside)
		gear_player.volume_db = _db(gear_gain(inside))
		_play_if(gear_player)
	else:
		current_levels["gear"] = 0.0
		_stop_if(gear_player)

	# --- flaps: the twin's electric motor (165 Hz saw loop) while the
	# surfaces travel; the Archer family's hand lever answers a rising
	# edge of flap_moving with the notch clicks (the original: "the
	# Archer's are a hand lever — a click, not this").
	if flap_moving and _aircraft_id == "pa44":
		current_levels["flap"] = flap_gain(inside)
		flap_player.volume_db = _db(flap_gain(inside))
		_play_if(flap_player)
	else:
		current_levels["flap"] = 0.0
		_stop_if(flap_player)
		if flap_moving and not _prev_flap_moving:
			one_shot("flap_step")
	_prev_flap_moving = flap_moving

	# --- stall warning horn (2800 Hz, Alert bus)
	if stall:
		current_levels["horn"] = horn_gain(inside)
		horn_player.volume_db = _db(horn_gain(inside))
		_play_if(horn_player)
	else:
		current_levels["horn"] = 0.0
		_stop_if(horn_player)

# ----------------------------------------------------------------- one-shots
## Play a named one-shot through the Mech or Alert pool. Returns false
## for an unknown name (and warns), true when a pool player took it.
func one_shot(shot_name: String) -> bool:
	var stream_name := ""
	var pool: Array = mech_pool
	match shot_name:
		"backfire":
			stream_name = "backfire"
		"starter":
			stream_name = "starter"
		"gear":
			stream_name = "gear_burst"
		"flap_step":
			# pa44: a short motor burst; pa28/pa28r: the lever's notches
			stream_name = "flap_burst" if _aircraft_id == "pa44" else "flap_click"
		"click":
			stream_name = "click"
		"knob":
			stream_name = "knob"
		"chime":
			stream_name = "chime"
			pool = alert_pool
		"ap_disc":
			stream_name = "ap_disc"
			pool = alert_pool
		_:
			push_warning("CadetAudioEngine.one_shot: unknown name '" + shot_name + "'")
			return false
	if pool.is_empty():
		return false
	var p: AudioStreamPlayer3D = pool[0]
	for cand in pool:
		if not (cand as AudioStreamPlayer3D).playing:
			p = cand
			break
	p.stream = streams[stream_name]
	p.pitch_scale = 1.0
	p.volume_db = 0.0
	if is_inside_tree():
		p.play()
	return true

# ------------------------------------------------------- stream synthesis
## All streams are built once, deterministically (fixed seeds), as
## 16-bit mono AudioStreamWAV at MIX_RATE. Loop streams contain an exact
## whole number of periods, so they loop seamlessly.
func _build_streams() -> void:
	streams["engine_loop"] = _make_wav(_gen_engine_loop(), true)
	streams["wind_loop"] = _make_wav(_gen_wind_loop(), true)
	streams["rain_loop"] = _make_wav(_gen_rain_loop(), true)
	streams["horn_loop"] = _make_wav(_gen_tone_loop(2800.0, 0.5, 0.5), true)
	streams["gear_loop"] = _make_wav(_gen_saw_loop(410.0, 1.0, 0.45), true)
	streams["flap_motor_loop"] = _make_wav(_gen_saw_loop(165.0, 1.0, 0.5), true)
	streams["starter"] = _make_wav(_gen_starter(), false)
	streams["backfire"] = _make_wav(_gen_backfire(), false)
	streams["gear_burst"] = _make_wav(_gen_motor_burst(410.0, 2.5), false)
	streams["flap_burst"] = _make_wav(_gen_motor_burst(165.0, 0.6), false)
	streams["flap_click"] = _make_wav(_gen_flap_click(), false)
	streams["chime"] = _make_wav(_gen_chime(), false)
	streams["click"] = _make_wav(_gen_click(3600.0, 0.04, 0.5), false)
	streams["knob"] = _make_wav(_gen_click(4800.0, 0.02, 0.4), false)
	streams["ap_disc"] = _make_wav(_gen_ap_disc(), false)

static func _make_wav(samples: PackedFloat32Array, loop: bool) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(samples.size() * 2)
	for i in range(samples.size()):
		var v := clampf(samples[i], -1.0, 1.0)
		bytes.encode_s16(i * 2, int(round(v * 32767.0)))
	var w := AudioStreamWAV.new()
	w.format = AudioStreamWAV.FORMAT_16_BITS
	w.mix_rate = MIX_RATE
	w.stereo = false
	w.data = bytes
	if loop:
		w.loop_mode = AudioStreamWAV.LOOP_FORWARD
		w.loop_begin = 0
		w.loop_end = samples.size()
	else:
		w.loop_mode = AudioStreamWAV.LOOP_DISABLED
	return w

static func _frames(seconds: float) -> int:
	return int(round(seconds * float(MIX_RATE)))

static func _blank(seconds: float) -> PackedFloat32Array:
	var s := PackedFloat32Array()
	s.resize(_frames(seconds))
	return s

static func _normalize(s: PackedFloat32Array, peak: float) -> PackedFloat32Array:
	var m := 0.0
	for v in s:
		m = maxf(m, absf(v))
	if m > 0.0001:
		var k := peak / m
		for i in range(s.size()):
			s[i] = s[i] * k
	return s

## One-pole low-pass run over the (periodic) input repeatedly, keeping
## the last pass: the output is the filter's periodic steady state, so
## a loop built from it has no seam.
static func _periodic_lp(src: PackedFloat32Array, a: float, reps: int = 3) -> PackedFloat32Array:
	var n := src.size()
	var out := PackedFloat32Array()
	out.resize(n)
	var y := 0.0
	var total := n * reps
	for k in range(total):
		var i := k % n
		y += a * (src[i] - y)
		if k >= total - n:
			out[i] = y
	return out

static func _noise(rng: RandomNumberGenerator, n: int) -> PackedFloat32Array:
	var s := PackedFloat32Array()
	s.resize(n)
	for i in range(n):
		s[i] = rng.randf_range(-1.0, 1.0)
	return s

## The engine loop: a firing-pulse train at ENGINE_LOOP_HZ. One pulse is
## the original's shape in spirit — a quick rise and an exponential decay
## (pulses() in sfx.js builds exactly that from the four cylinders) —
## over a low cycle fundamental (cycle = firing / 4 = 10 Hz at base).
static func _gen_engine_loop() -> PackedFloat32Array:
	var table := PackedFloat32Array()
	table.resize(1024)
	for i in range(1024):
		var x := float(i) / 1024.0
		table[i] = (exp(-6.0 * x) - exp(-30.0 * x)) * 1.35 \
			+ 0.38 * sin(TAU * x) + 0.14 * sin(2.0 * TAU * x) + 0.06 * sin(3.0 * TAU * x)
	var n := _frames(2.0)
	var s := _blank(2.0)
	for i in range(n):
		var ph := fposmod(float(i) * ENGINE_LOOP_HZ / float(MIX_RATE), 1.0)
		var idx := int(ph * 1024.0) & 1023
		s[i] = table[idx] * 0.62 + 0.16 * sin(TAU * float(i) * 10.0 / float(MIX_RATE))
	return _normalize(s, 0.85)

## Wind: white noise through a low-pass (the original's airflow is
## noise through a band around 380-2000 Hz; the band is then moved with
## pitch_scale, the level with wind_gain()).
static func _gen_wind_loop() -> PackedFloat32Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = 777001
	var lp := _periodic_lp(_noise(rng, _frames(2.0)), 0.10)
	return _normalize(lp, 0.7)

## Rain: a hiss — noise with the low end removed and the top rolled
## off (the original: noise through a band that starts at 1100 Hz).
static func _gen_rain_loop() -> PackedFloat32Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = 777002
	var raw := _noise(rng, _frames(2.0))
	var slow := _periodic_lp(raw, 0.02)
	var hp := PackedFloat32Array()
	hp.resize(raw.size())
	for i in range(raw.size()):
		hp[i] = raw[i] - slow[i]
	return _normalize(_periodic_lp(hp, 0.5), 0.6)

## A pure tone loop (the stall horn: triangle, as in the original).
static func _gen_tone_loop(freq: float, seconds: float, amp: float) -> PackedFloat32Array:
	var n := _frames(seconds)
	var s := _blank(seconds)
	for i in range(n):
		var ph := fposmod(float(i) * freq / float(MIX_RATE), 1.0)
		s[i] = amp * (2.0 * absf(2.0 * (ph - floor(ph + 0.5))) - 1.0)
	return s

## A sawtooth loop smoothed by a periodic low-pass (the gear pump at
## 410 Hz and the flap motor at 165 Hz are both saws through low-passes
## in the original: 900 Hz and 650 Hz respectively).
static func _gen_saw_loop(freq: float, seconds: float, amp: float) -> PackedFloat32Array:
	var n := _frames(seconds)
	var raw := PackedFloat32Array()
	raw.resize(n)
	for i in range(n):
		raw[i] = 2.0 * fposmod(float(i) * freq / float(MIX_RATE), 1.0) - 1.0
	return _normalize(_periodic_lp(raw, 0.35), amp)

## The starter motor's pitch over time (sfx.js starter()): a quick rise
## 140 -> 430 Hz, dragged down toward 330 Hz at each compression (the
## STARTER_C times), then falling away to 90 Hz from t = 1.46 s.
static func _starter_freq(t: float) -> float:
	var f := 435.0
	if t < 0.15:
		f = 140.0 * pow(430.0 / 140.0, t / 0.15)
	for c in STARTER_C:
		if t >= c - 0.03 and t < c + 0.07:
			var dip := sin(PI * clampf((t - c + 0.03) / 0.10, 0.0, 1.0))
			f = lerpf(f, 330.0, dip)
	if t > 1.46:
		f = lerpf(f, 90.0, 1.0 - exp(-(t - 1.46) / 0.2))
	return clampf(f, 60.0, 500.0)

## The engine start, about 2.6 s (sfx.js starter()): the motor's whine
## as above, a noise chuff and a 48 Hz thump at each compression, then
## the first uneven firings at STARTER_F (noise + a 78 -> 45 Hz thump,
## the earlier ones stronger), all preceded by the starter gear's click.
static func _gen_starter() -> PackedFloat32Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = 777003
	var dur := 2.7
	var s := _blank(dur)
	var phase := 0.0
	var lp := 0.0
	for i in range(s.size()):
		var t := float(i) / float(MIX_RATE)
		phase += _starter_freq(t) / float(MIX_RATE)
		var saw := 2.0 * fposmod(phase, 1.0) - 1.0
		lp += 0.4 * (saw - lp) # the motor's low-pass (1400 Hz in-cabin in the original, approximated)
		var menv := 0.45 * minf(t / 0.08, 1.0)
		if t > 1.44:
			menv *= exp(-(t - 1.44) / 0.07)
		var v := lp * menv
		if t < 0.03:
			v += rng.randf_range(-1.0, 1.0) * exp(-t / 0.006) * 0.3 # the gear engaging
		for c in STARTER_C:
			var dc := t - c
			if dc >= 0.0 and dc < 0.14:
				v += rng.randf_range(-1.0, 1.0) * exp(-dc / 0.05) * 0.35
				v += sin(TAU * 48.0 * dc) * exp(-dc / 0.04) * 0.35
		for c0 in STARTER_F:
			var df := t - c0
			if df >= 0.0 and df < 0.06:
				var a := (0.5 if c0 < 1.7 else 0.36) * 0.85
				v += rng.randf_range(-1.0, 1.0) * exp(-df / 0.008) * a
				v += sin(TAU * 65.0 * df) * exp(-df / 0.03) * a * 1.2
		s[i] = v
	return _normalize(s, 0.85)

## A backfire: the exhaust pop of an unburnt charge — a low-passed noise
## burst over a deep thump. (No standalone function in sfx.js; this is
## the audible consequence of its misfire thinning, synthesised here as
## a one-shot. See PHASE4-AUDIO-NOTES.md.)
static func _gen_backfire() -> PackedFloat32Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = 777004
	var s := _blank(0.4)
	var lp := 0.0
	for i in range(s.size()):
		var t := float(i) / float(MIX_RATE)
		lp += 0.5 * (rng.randf_range(-1.0, 1.0) - lp)
		s[i] = lp * exp(-t / 0.09) * 1.1 + sin(TAU * lerpf(100.0, 55.0, minf(t / 0.3, 1.0)) * t) * exp(-t / 0.12) * 0.7
	return _normalize(s, 0.9)

## A motor whir of fixed length (one-shot form of the gear/flap loops).
static func _gen_motor_burst(freq: float, dur: float) -> PackedFloat32Array:
	var n := _frames(dur)
	var s := _blank(dur)
	var lp := 0.0
	for i in range(n):
		var t := float(i) / float(MIX_RATE)
		var saw := 2.0 * fposmod(float(i) * freq / float(MIX_RATE), 1.0) - 1.0
		lp += 0.35 * (saw - lp)
		var env := minf(t / 0.05, 1.0) * minf(maxf((dur - t) / 0.3, 0.0), 1.0)
		s[i] = lp * env
	return _normalize(s, 0.5)

## The Archer family's flap lever: three notch clicks (the original's
## click() is a 3600 Hz burst, 0.014 s; a lever step detents in ticks).
static func _gen_flap_click() -> PackedFloat32Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = 777005
	var s := _blank(0.12)
	for start in [0.0, 0.04, 0.08]:
		var i0 := _frames(start)
		var len := _frames(0.02)
		for k in range(len):
			if i0 + k < s.size():
				var dt := float(k) / float(MIX_RATE)
				s[i0 + k] += (sin(TAU * 3600.0 * dt) * 0.6 + rng.randf_range(-1.0, 1.0) * 0.4) * exp(-dt / 0.004)
	return _normalize(s, 0.7)

## A single short filtered click/tick (switch click 3600 Hz / knob 4800 Hz).
static func _gen_click(freq: float, dur: float, amp: float) -> PackedFloat32Array:
	var rng := RandomNumberGenerator.new()
	rng.seed = 777006 + int(freq)
	var s := _blank(dur)
	for i in range(s.size()):
		var t := float(i) / float(MIX_RATE)
		s[i] = (sin(TAU * freq * t) * 0.7 + rng.randf_range(-1.0, 1.0) * 0.3) * exp(-t / 0.004) * amp / 0.5
	return _normalize(s, amp)

## The cockpit chime (sfx.js chime(): 1175 Hz for 0.3 s, then 880 Hz
## for 0.42 s starting at +0.17 s), with tone()'s envelope shape
## (0.006 s attack, exponential decay).
static func _add_tone(s: PackedFloat32Array, start: float, freq: float, dur: float, peak: float) -> void:
	var i0 := _frames(start)
	var len := _frames(dur)
	for k in range(len):
		if i0 + k >= s.size():
			break
		var t := float(k) / float(MIX_RATE)
		var env := minf(t / 0.006, 1.0) * exp(-t * 6.0 / dur)
		s[i0 + k] += sin(TAU * freq * t) * peak * env

static func _gen_chime() -> PackedFloat32Array:
	var s := _blank(0.8)
	_add_tone(s, 0.0, 1175.0, 0.3, 0.5)
	_add_tone(s, 0.17, 880.0, 0.42, 0.45)
	return s

## The autopilot disconnect warble (sfx.js apDisc(): six tones
## alternating 1240/940 Hz, 0.1 s each, 0.115 s apart).
static func _gen_ap_disc() -> PackedFloat32Array:
	var s := _blank(0.79)
	for i in range(6):
		_add_tone(s, float(i) * 0.115, 940.0 if i % 2 == 1 else 1240.0, 0.1, 0.4)
	return s
