extends SceneTree

## CADET Godot port — Phase 4 (spatial audio) test runner.
## Usage: godot --headless --path ~/workspace/cadet-godot -s test/run_audio.gd
## Verifies src/audio_engine.gd (CadetAudioEngine):
##  - the AudioServer bus layout built in code (Master > Engine/Wind/
##    Weather/Mech/Alert) and the Engine bus's two low-pass stages;
##  - the procedurally generated streams: sample counts, mix rate,
##    format, loop points, non-silence;
##  - the roughness -> sound mapping at the original's verification
##    points (rough 0 / 0.85 / 0.9 / 1.0): wobble_cents follows
##    25 + 300 * rough and misfire_drop follows rough * 0.55 above 0.02;
##  - update_state() / one_shot() under the headless dummy audio driver:
##    no crash on full, empty or junk state; the continuous channels
##    start/stop and their levels behave (engine, wind, rain, horn,
##    gear, pa44 flap motor, pa28 flap clicks, misfire dropouts,
##    starter edge, aircraft following).
## Exit code: 0 = all pass, 1 = failures.
## NOTE: whether the sound is *good* cannot be judged headless — only
## structure, numbers and robustness are verified here. See
## PHASE4-AUDIO-NOTES.md.

const AudioEng = preload("res://src/audio_engine.gd")

var failures := 0
var checks := 0
var group_name := ""
var group_checks := 0
var group_failures := 0
var group_results: Array = []

func _begin_group(name: String) -> void:
	group_name = name
	group_checks = 0
	group_failures = 0

func _end_group() -> void:
	group_results.append({"name": group_name, "checks": group_checks, "failures": group_failures})
	print("GROUP " + group_name + " checks " + str(group_checks) + " failures " + str(group_failures))

func _fail(label: String, msg: String) -> void:
	failures += 1
	group_failures += 1
	if failures <= 60:
		print("FAIL %s: %s" % [label, msg])

func _chk(cond: bool, name: String) -> void:
	checks += 1
	group_checks += 1
	if not cond:
		_fail(name, "condition false")

func _num(label: String, got: float, want: float, tol: float = 1e-6) -> void:
	checks += 1
	group_checks += 1
	if absf(got - want) > tol:
		_fail(label, "got %f want %f (tol %f)" % [got, want, tol])

func _stream_stats(w: AudioStreamWAV) -> Dictionary:
	var peak := 0.0
	var sumsq := 0.0
	var n := 0
	var frames := w.data.size() / 2
	for i in range(0, frames, 53):
		var v := float(w.data.decode_s16(i * 2)) / 32767.0
		peak = maxf(peak, absf(v))
		sumsq += v * v
		n += 1
	return {"frames": frames, "peak": peak, "rms": sqrt(sumsq / maxf(float(n), 1.0))}

func _full(over: Dictionary = {}) -> Dictionary:
	var d := {
		"rpm": 2300.0, "thr": 0.7, "rough": 0.0, "running": true,
		"starting": false, "ias": 100.0, "on_ground": false, "rain": 0.0,
		"gear_moving": false, "flap_moving": false,
		"aircraft_id": "pa28", "stall": false, "inside": true, "_dt": 0.05,
	}
	for k in over.keys():
		d[k] = over[k]
	return d

var _ran := false

func _initialize() -> void:
	# Wait for the first frame: nodes added from _initialize are not yet
	# inside the tree, so play() and global transforms would not work.
	pass

func _process(_delta: float) -> bool:
	if _ran:
		return true
	_ran = true
	var eng = AudioEng.new()
	root.add_child(eng)
	_test_buses(eng)
	_test_streams(eng)
	_test_roughness()
	_test_state(eng)
	_test_one_shots(eng)
	print("== Phase 4 audio total: " + str(checks) + " checks, " + str(failures) + " failures")
	quit(1 if failures > 0 else 0)
	return true

# --------------------------------------------------------------------- buses
func _test_buses(eng) -> void:
	_begin_group("audio.buses")
	_chk(AudioServer.get_bus_index("Master") == 0, "Master is bus 0")
	for bus_name in ["Engine", "Wind", "Weather", "Mech", "Alert"]:
		var idx := AudioServer.get_bus_index(bus_name)
		_chk(idx > 0, "bus exists: " + bus_name)
		if idx > 0:
			_chk(String(AudioServer.get_bus_send(idx)) == "Master", "bus sends to Master: " + bus_name)
			_chk(eng.bus_index(bus_name) == idx, "engine.bus_index matches: " + bus_name)
	# the Engine bus carries the cabin's two low-pass stages
	var eidx := AudioServer.get_bus_index("Engine")
	var lp_count := 0
	for i in range(AudioServer.get_bus_effect_count(eidx)):
		if AudioServer.get_bus_effect(eidx, i) is AudioEffectLowPassFilter:
			lp_count += 1
	_chk(lp_count >= 2, "Engine bus has >= 2 low-pass stages (got %d)" % lp_count)
	# players exist and sit on their buses
	_chk(eng.engine_player != null and String(eng.engine_player.bus) == "Engine", "engine player on Engine bus")
	_chk(eng.wind_player != null and String(eng.wind_player.bus) == "Wind", "wind player on Wind bus")
	_chk(eng.rain_player != null and String(eng.rain_player.bus) == "Weather", "rain player on Weather bus")
	_chk(eng.horn_player != null and String(eng.horn_player.bus) == "Alert", "horn player on Alert bus")
	_chk(eng.mech_pool.size() == 6, "Mech one-shot pool is 6 (got %d)" % eng.mech_pool.size())
	_chk(eng.alert_pool.size() == 4, "Alert one-shot pool is 4 (got %d)" % eng.alert_pool.size())
	for p in eng.mech_pool:
		_chk(String((p as AudioStreamPlayer3D).bus) == "Mech", "mech pool player on Mech bus")
	for p in eng.alert_pool:
		_chk(String((p as AudioStreamPlayer3D).bus) == "Alert", "alert pool player on Alert bus")
	_end_group()

# ------------------------------------------------------------------- streams
func _test_streams(eng) -> void:
	_begin_group("audio.streams")
	var loops := {
		"engine_loop": 2.0, "wind_loop": 2.0, "rain_loop": 2.0,
		"horn_loop": 0.5, "gear_loop": 1.0, "flap_motor_loop": 1.0,
	}
	var shots := {
		"starter": 2.7, "backfire": 0.4, "gear_burst": 2.5,
		"flap_burst": 0.6, "flap_click": 0.12, "chime": 0.8,
		"click": 0.04, "knob": 0.02, "ap_disc": 0.79,
	}
	for name in loops.keys():
		var w: AudioStreamWAV = eng.get_stream(name)
		_chk(w != null, "stream exists: " + name)
		if w == null:
			continue
		var st := _stream_stats(w)
		_chk(w.mix_rate == AudioEng.MIX_RATE, "%s mix_rate %d" % [name, w.mix_rate])
		_chk(w.format == AudioStreamWAV.FORMAT_16_BITS, name + " is 16-bit")
		_chk(not w.stereo, name + " is mono")
		_num(name + " frames", float(st["frames"]), float(loops[name]) * AudioEng.MIX_RATE, 2.0)
		_chk(w.loop_mode == AudioStreamWAV.LOOP_FORWARD, name + " loops forward")
		_chk(w.loop_begin == 0 and w.loop_end == int(st["frames"]), "%s loop points 0..%d" % [name, int(st["frames"])])
		_chk(float(st["peak"]) > 0.05 and float(st["rms"]) > 0.005, "%s not silent (peak %.3f rms %.3f)" % [name, float(st["peak"]), float(st["rms"])])
	for name in shots.keys():
		var w: AudioStreamWAV = eng.get_stream(name)
		_chk(w != null, "stream exists: " + name)
		if w == null:
			continue
		var st := _stream_stats(w)
		_num(name + " frames", float(st["frames"]), float(shots[name]) * AudioEng.MIX_RATE, 2.0)
		_chk(w.loop_mode == AudioStreamWAV.LOOP_DISABLED, name + " does not loop")
		_chk(float(st["peak"]) > 0.05, "%s not silent (peak %.3f)" % [name, float(st["peak"])])
	_end_group()

# ----------------------------------------------------------------- roughness
func _test_roughness() -> void:
	_begin_group("audio.roughness")
	# wobble_cents: the original's jd.gain at idle = 0: 25 + 300 * rough
	_num("wobble_cents(0)", AudioEng.wobble_cents(0.0), 25.0)
	_num("wobble_cents(0.85)", AudioEng.wobble_cents(0.85), 280.0)
	_num("wobble_cents(0.9)", AudioEng.wobble_cents(0.9), 295.0)
	_num("wobble_cents(1.0)", AudioEng.wobble_cents(1.0), 325.0)
	_chk(AudioEng.wobble_cents(0.85) - AudioEng.wobble_cents(0.0) > 150.0,
		"rough 0.85 grows the wander by >150 cents (the JS test's assertion)")
	_chk(AudioEng.wobble_cents(0.9) > AudioEng.wobble_cents(0.85), "wobble is monotonic in rough")
	_num("wobble_cents clamps >1", AudioEng.wobble_cents(2.0), 325.0)
	_num("wobble_cents clamps <0", AudioEng.wobble_cents(-1.0), 25.0)
	# the full form with the idle term: 25 + 160 * idle + 300 * rough
	_num("wobble_cents_at(0, 1)", AudioEng.wobble_cents_at(0.0, 1.0), 185.0)
	_num("wobble_cents_at(0.85, 0)", AudioEng.wobble_cents_at(0.85, 0.0), 280.0)
	# misfire_probability: 0 at/below 0.02, else rough * 0.55
	_num("misfire_probability(0)", AudioEng.misfire_probability(0.0), 0.0)
	_num("misfire_probability(0.02)", AudioEng.misfire_probability(0.02), 0.0)
	_num("misfire_probability(0.85)", AudioEng.misfire_probability(0.85), 0.4675)
	_num("misfire_probability(0.9)", AudioEng.misfire_probability(0.9), 0.495)
	_num("misfire_probability(1.0)", AudioEng.misfire_probability(1.0), 0.55)
	# misfire_drop(rough, rng): rng < probability (rng in [0,1))
	_chk(not AudioEng.misfire_drop(0.0, 0.0), "no drop at rough 0")
	_chk(not AudioEng.misfire_drop(0.02, 0.0), "no drop at the 0.02 threshold")
	_chk(AudioEng.misfire_drop(0.03, 0.01), "drop just above threshold (0.01 < 0.0165)")
	_chk(AudioEng.misfire_drop(0.85, 0.46), "drop at 0.85 when rng 0.46 < 0.4675")
	_chk(not AudioEng.misfire_drop(0.85, 0.47), "keep at 0.85 when rng 0.47 >= 0.4675")
	_chk(AudioEng.misfire_drop(0.9, 0.49), "drop at 0.9 when rng 0.49 < 0.495")
	_chk(not AudioEng.misfire_drop(0.9, 0.50), "keep at 0.9 when rng 0.50 >= 0.495")
	_chk(AudioEng.misfire_drop(1.0, 0.54), "drop at 1.0 when rng 0.54 < 0.55")
	_chk(not AudioEng.misfire_drop(1.0, 0.56), "keep at 1.0 when rng 0.56 >= 0.55")
	_chk(not AudioEng.misfire_drop(0.9, -0.1), "negative rng never drops")
	# misfire_level: a drop scales to 0.08..0.33, a keep stays 1
	_num("misfire_level keep", AudioEng.misfire_level(0.9, 0.99, 0.5), 1.0)
	_num("misfire_level drop min", AudioEng.misfire_level(0.9, 0.0, 0.0), 0.08)
	_num("misfire_level drop max", AudioEng.misfire_level(0.9, 0.0, 1.0), 0.33)
	_chk(AudioEng.misfire_level(0.9, 0.1, 0.5) >= 0.08 and AudioEng.misfire_level(0.9, 0.1, 0.5) <= 0.33,
		"misfire_level drop lands in 0.08..0.33")
	# misfire_interval: 0.05..0.16 s
	_num("misfire_interval(0)", AudioEng.misfire_interval(0.0), 0.05)
	_num("misfire_interval(1)", AudioEng.misfire_interval(1.0), 0.16)
	# the cycle / firing frequencies follow rpm (two pulses per revolution)
	_num("cycle_hz(2400)", AudioEng.cycle_hz(2400.0), 20.0)
	_num("firing_hz(2400)", AudioEng.firing_hz(2400.0), 80.0)
	_num("firing_hz(1200)", AudioEng.firing_hz(1200.0), 40.0)
	_num("firing_hz floor", AudioEng.firing_hz(0.0), 2.0)
	_num("idle_factor(650)", AudioEng.idle_factor(650.0), 1.0)
	_num("idle_factor(2400)", AudioEng.idle_factor(2400.0), 0.0)
	_num("fire_factor(2400)", AudioEng.fire_factor(2400.0, true), 1.0)
	_num("fire_factor stopped", AudioEng.fire_factor(2400.0, false), 0.0)
	_end_group()

# --------------------------------------------------------------------- state
func _test_state(eng) -> void:
	_begin_group("audio.state")
	# aircraft following
	var ac := Node3D.new()
	ac.position = Vector3(10.0, 20.0, 30.0)
	root.add_child(ac)
	eng.attach_aircraft(ac)
	eng.update_state(_full())
	_chk(eng.global_position.distance_to(ac.global_position) < 0.001,
		"engine node follows the aircraft (got %s)" % str(eng.global_position))
	ac.position = Vector3(-5.0, 100.0, 7.0)
	eng.update_state(_full())
	_chk(eng.global_position.distance_to(ac.global_position) < 0.001, "engine node follows a moved aircraft")

	# a healthy cruise frame, called repeatedly in _dt steps
	for i in range(40):
		eng.update_state(_full())
	_chk(eng.engine_player.playing, "engine player is playing")
	_chk(eng.engine_player.pitch_scale > 1.5 and eng.engine_player.pitch_scale < 2.6,
		"engine pitch follows rpm 2300 (pitch_scale %.3f, firing 76.7 Hz / base 40)" % eng.engine_player.pitch_scale)
	_chk(float(eng.current_levels["engine"]) > 0.15,
		"engine level up at cruise (got %.3f, target ~0.209 = ex 0.3375 x cabin 0.62)" % float(eng.current_levels["engine"]))
	_chk(float(eng.current_levels["wind"]) > 0.015,
		"wind level up at 100 kt inside (got %.4f, target 0.0278)" % float(eng.current_levels["wind"]))
	_chk(float(eng.current_levels["rain_air"]) == 0.0, "no rain in dry air")

	# outside is louder / brighter: the engine bus low-passes open up
	eng.update_state(_full({"inside": false}))
	var lp1 = null
	var eidx := AudioServer.get_bus_index("Engine")
	for i in range(AudioServer.get_bus_effect_count(eidx)):
		var fx = AudioServer.get_bus_effect(eidx, i)
		if fx is AudioEffectLowPassFilter and lp1 == null:
			lp1 = fx
	_chk(lp1 != null and absf(lp1.cutoff_hz - 9000.0) < 1.0, "outside: lp1 opens to 9000 Hz")
	eng.update_state(_full({"inside": true}))
	_chk(lp1 != null and absf(lp1.cutoff_hz - 1000.0) < 1.0, "inside: lp1 closes to 1000 Hz")

	# engine stopped: the level falls away
	for i in range(60):
		eng.update_state(_full({"running": false, "rpm": 0.0, "ias": 0.0}))
	_chk(float(eng.current_levels["engine"]) < 0.01, "engine level ~0 when stopped")

	# rain: airframe level grows with speed; ground rain only when parked
	for i in range(40):
		eng.update_state(_full({"rain": 1.0, "ias": 20.0}))
	var rain_slow := float(eng.current_levels["rain_air"])
	_chk(rain_slow > 0.005, "rain patter at taxi speed (%.4f)" % rain_slow)
	for i in range(40):
		eng.update_state(_full({"rain": 1.0, "ias": 110.0}))
	_chk(float(eng.current_levels["rain_air"]) > rain_slow * 1.5,
		"rain louder at speed (%.4f -> %.4f)" % [rain_slow, float(eng.current_levels["rain_air"])])
	_chk(float(eng.current_levels["rain_air"]) < 0.09, "rain never sits on the horn/radio (< 0.09)")
	for i in range(40):
		eng.update_state(_full({"rain": 1.0, "ias": 0.0, "on_ground": true, "running": false, "rpm": 0.0}))
	_chk(float(eng.current_levels["rain_ground"]) > 0.015,
		"ground rain while parked (%.4f, target 0.026 inside)" % float(eng.current_levels["rain_ground"]))

	# stall horn on/off
	eng.update_state(_full({"stall": true}))
	_chk(eng.horn_player.playing, "stall horn plays while stall")
	eng.update_state(_full({"stall": false}))
	_chk(not eng.horn_player.playing, "stall horn stops after")

	# gear pump while the wheels travel
	eng.update_state(_full({"gear_moving": true}))
	_chk(eng.gear_player.playing, "gear pump plays while gear_moving")
	eng.update_state(_full({"gear_moving": false}))
	_chk(not eng.gear_player.playing, "gear pump stops after travel")

	# flaps: pa44 motor loop; pa28 lever clicks on the rising edge
	eng.update_state(_full({"aircraft_id": "pa44", "flap_moving": true}))
	_chk(eng.flap_player.playing, "pa44 flap motor plays while flap_moving")
	eng.update_state(_full({"aircraft_id": "pa44", "flap_moving": false}))
	_chk(not eng.flap_player.playing, "pa44 flap motor stops")
	eng.update_state(_full({"aircraft_id": "pa28", "flap_moving": false}))
	eng.update_state(_full({"aircraft_id": "pa28", "flap_moving": true}))
	var clicked := false
	for p in eng.mech_pool:
		if (p as AudioStreamPlayer3D).playing and (p as AudioStreamPlayer3D).stream == eng.get_stream("flap_click"):
			clicked = true
	_chk(clicked, "pa28 flap step plays the notch clicks")

	# starting: the edge fires the starter one-shot; the engine's own
	# voice is still ~silent early in the crank
	for i in range(40):
		eng.update_state(_full({"running": false, "rpm": 0.0, "ias": 0.0}))
	eng.update_state(_full({"running": false, "starting": true, "rpm": 70.0, "ias": 0.0}))
	var starter_playing := false
	for p in eng.mech_pool:
		if (p as AudioStreamPlayer3D).playing and (p as AudioStreamPlayer3D).stream == eng.get_stream("starter"):
			starter_playing = true
	_chk(starter_playing, "starting edge plays the starter one-shot")
	_chk(float(eng.current_levels["engine"]) < 0.05, "engine voice ~silent while cranking")

	# roughness at 0.9: over ~9 simulated seconds the exhaust level must
	# drop out and come back (misfire thinning), unlike the smooth run
	var lo := 1e9
	var hi := -1e9
	for i in range(300):
		eng.update_state(_full({"rough": 0.9, "_dt": 0.03}))
		var lv := float(eng.current_levels["engine"])
		lo = minf(lo, lv)
		hi = maxf(hi, lv)
	_chk(hi > 0.1, "rough engine still sounds (hi %.3f)" % hi)
	_chk(lo < 0.65 * hi, "misfire dropouts at rough 0.9 (levels %.3f..%.3f)" % [lo, hi])
	for i in range(60):
		eng.update_state(_full({"rough": 0.0, "_dt": 0.03}))
	var seen := {}
	for i in range(30):
		eng.update_state(_full({"rough": 0.0, "_dt": 0.03}))
		seen["%.4f" % float(eng.current_levels["engine"])] = true
	_chk(seen.size() <= 2, "a healthy engine settles to one level (saw %d after settling)" % seen.size())

	# robustness: empty, junk and extreme state must not crash (reaching
	# the checks below is the assertion)
	eng.update_state({})
	eng.update_state({"rpm": "fast", "thr": null, "rain": [1, 2], "stall": 1})
	eng.update_state(_full({"rpm": -50.0, "thr": 3.0, "ias": -1.0, "rain": 2.0, "rough": 5.0}))
	eng.update_state(_full({"aircraft_id": "b737"}))
	eng.update_state(_full({"rpm": NAN, "ias": INF}))
	_chk(true, "update_state survived empty/junk/extreme dictionaries")
	_end_group()

# ----------------------------------------------------------------- one-shots
func _test_one_shots(eng) -> void:
	_begin_group("audio.oneshots")
	for name in ["backfire", "starter", "gear", "flap_step", "click", "knob"]:
		_chk(eng.one_shot(name), "one_shot returns true: " + name)
		var found := false
		for p in eng.mech_pool:
			if (p as AudioStreamPlayer3D).playing:
				found = true
		_chk(found, "a Mech pool player is playing after: " + name)
	for name in ["chime", "ap_disc"]:
		_chk(eng.one_shot(name), "one_shot returns true: " + name)
		var found := false
		for p in eng.alert_pool:
			if (p as AudioStreamPlayer3D).playing:
				found = true
		_chk(found, "an Alert pool player is playing after: " + name)
	_chk(not eng.one_shot("warp_drive"), "one_shot returns false for an unknown name")
	# flap_step follows the aircraft family: motor burst on the twin
	eng.update_state(_full({"aircraft_id": "pa44"}))
	_chk(eng.one_shot("flap_step"), "flap_step on pa44")
	var burst := false
	for p in eng.mech_pool:
		if (p as AudioStreamPlayer3D).stream == eng.get_stream("flap_burst"):
			burst = true
	_chk(burst, "pa44 flap_step uses the motor burst stream")
	_end_group()
