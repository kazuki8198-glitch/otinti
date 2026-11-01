class_name ReplayPlayer
extends Node3D

## CADET Godot port — Phase 4 (item 6): flight replay player.
## Plays back CadetRecorder samples (src/recorder.gd snapshot() shape:
## { t, n, e, h, q:[x,y,z,w], ias, gs, vs, alt, thr, gear, flap, onGround,
##   rpm, ... }) onto an aircraft Node3D, interpolating between samples
## (position lerp, attitude Quaternion slerp), with tower / chase / wing
## external cameras.
##
## World conversion (same convention as scenes/main.gd _sync_visual and
## src/airport_build.gd / src/world_build.gd):
##   physics state pos = [east_m, up_m, south_m], and physics.gd derive()
##   sets out.altTrue = pos[1] * FT, so up_m = altTrue_ft / FT.
##   A recorder sample carries n (= -south), e (= east) and alt in feet MSL
##   (snapshot prefers out.alt, the indicated altitude, falling back to
##   out.altTrue; with BARO set to QNH the two agree). The snapshot field
##   `h` is NOT used: for real physics states it is always 0 (recorder.gd
##   header documents the JS `s.pos.y` quirk).
##   => world = Vector3(e, alt_ft / FT, -n) + VIS_OFF(40000, 0, 0)
##   Ground check: alt = 55 ft (GROUND_FT) -> y = 16.764 m = GROUND_M. ✓
##   Attitude: main.gd applies the physics q Array verbatim as
##   Basis(Quaternion(q[0], q[1], q[2], q[3])), and so does this player.
##
## Usage (integration side):
##   var rp := ReplayPlayer.new()
##   add_child(rp)
##   rp.load_samples(recorder.last_rec()["samples"])  # or any sample Array
##   rp.seek(0.0)
##   rp.set_playing(true)
##   # every frame: rp.update_playback(dt, aircraft_node)
##   ReplayPlayer.frame_camera("tower", cam, aircraft_node,
##       ReplayPlayer.tower_cab_position())

const FP = preload("res://src/physics.gd")

const VIS_OFF := Vector3(40000, 0, 0)
## Tower cab glass centre in the runway frame (world_build.gd TOWER:
## a = 721, c = 262, glass centred 18.7 m above the ground).
const TOWER_A := 721.0
const TOWER_C := 262.0
const TOWER_CAB_UP := 18.7
## Chase / wing camera offsets in aircraft body axes (Godot: -Z = nose,
## matching the physics body frame; main.gd's external camera uses the
## same convention: back = basis * Vector3(6.5, 2.6, 9.0)).
const CHASE_OFFSET := Vector3(0.0, 2.6, 10.5)
const CHASE_LOOK := Vector3(0.0, 0.5, -12.0)
## Right wingtip of the Archer (half span 5.4 m), looking straight ahead.
const WING_OFFSET := Vector3(5.5, 0.35, 0.6)
const WING_LOOK := Vector3(5.5, 0.1, -20.0)

var _samples: Array = []
var _time := 0.0
var _playing := false
var _target: Node3D = null
## Total playback span in seconds (last.t - first.t), set by load_samples.
var duration: float = 0.0

# ---------------------------------------------------------------- samples
func load_samples(samples: Array) -> void:
	_samples = samples.duplicate()
	_samples.sort_custom(func(a, b): return float(a.get("t", 0.0)) < float(b.get("t", 0.0)))
	if _samples.is_empty():
		duration = 0.0
		_time = 0.0
	else:
		duration = float(_samples[_samples.size() - 1].get("t", 0.0)) - float(_samples[0].get("t", 0.0))
		_time = float(_samples[0].get("t", 0.0))
	_playing = false

func sample_count() -> int:
	return _samples.size()

func samples() -> Array:
	return _samples

func start_time() -> float:
	return float(_samples[0].get("t", 0.0)) if not _samples.is_empty() else 0.0

func end_time() -> float:
	return float(_samples[_samples.size() - 1].get("t", 0.0)) if not _samples.is_empty() else 0.0

func current_time() -> float:
	return _time

func is_playing() -> bool:
	return _playing

func set_playing(on: bool) -> void:
	_playing = on and not _samples.is_empty()

## Move the playhead (clamped to the recorded span). If a target node is
## already known (from a previous update_playback) the pose is re-applied
## immediately, so scrubbing works while paused.
func seek(t: float) -> void:
	if _samples.is_empty():
		_time = 0.0
		return
	_time = clampf(t, start_time(), end_time())
	if _target != null:
		apply_pose(_target, sample_at(_samples, _time))

func current_sample() -> Dictionary:
	return sample_at(_samples, _time)

## Advance the playhead by dt seconds (only while playing; the playhead
## clamps at the end and playback auto-pauses there) and apply the
## interpolated pose to aircraft_node. Returns the current sample
## ({} when nothing is loaded).
func update_playback(dt: float, aircraft_node: Node3D) -> Dictionary:
	if aircraft_node != null:
		_target = aircraft_node
	if _samples.is_empty():
		return {}
	if _playing:
		_time += maxf(dt, 0.0)
		if _time >= end_time():
			_time = end_time()
			_playing = false
	var s := sample_at(_samples, _time)
	if aircraft_node != null and not s.is_empty():
		apply_pose(aircraft_node, s)
	return s

## Apply one sample's pose to a node: world position + attitude basis,
## exactly as main.gd _sync_visual applies the live physics pose.
static func apply_pose(aircraft_node: Node3D, sample: Dictionary) -> void:
	aircraft_node.position = world_from_sample(sample)
	var q := quat_from_sample(sample)
	aircraft_node.basis = Basis(q)

# ---------------------------------------------------------------- interpolation
static func _f(s: Dictionary, k: String, def: float = 0.0) -> float:
	var v = s.get(k)
	return float(v) if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT else def

static func _num(v) -> float:
	return float(v) if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT else 0.0

static func _quat_of(s: Dictionary) -> Quaternion:
	var q = s.get("q")
	if typeof(q) == TYPE_ARRAY and q.size() >= 4:
		var qq := Quaternion(_num(q[0]), _num(q[1]), _num(q[2]), _num(q[3]))
		return qq.normalized() if qq.length() > 1e-9 else Quaternion.IDENTITY
	return Quaternion.IDENTITY

static func quat_from_sample(s: Dictionary) -> Quaternion:
	return _quat_of(s)

## The interpolated sample at time t (pure function, testable).
## Scalars lerp, attitude slerps (shortest path), `onGround` / `failed`
## step at the segment midpoint. Outside the recorded span the end
## samples are returned (as copies). Empty input -> {}.
static func sample_at(samples: Array, t: float) -> Dictionary:
	if samples.is_empty():
		return {}
	var first: Dictionary = samples[0]
	var last: Dictionary = samples[samples.size() - 1]
	if t <= _f(first, "t"):
		return _copy(first)
	if t >= _f(last, "t"):
		return _copy(last)
	var lo := 0
	var hi := samples.size() - 1
	while hi - lo > 1:
		var mid := (lo + hi) >> 1
		if _f(samples[mid], "t") <= t:
			lo = mid
		else:
			hi = mid
	var a: Dictionary = samples[lo]
	var b: Dictionary = samples[hi]
	var span := maxf(1e-9, _f(b, "t") - _f(a, "t"))
	var f := (t - _f(a, "t")) / span
	var qa := _quat_of(a)
	var qb := _quat_of(b)
	var q := qa.slerp(qb, f).normalized()
	var out := {
		"t": t,
		"q": [q.x, q.y, q.z, q.w],
		"onGround": bool(a.get("onGround", false)) if f < 0.5 else bool(b.get("onGround", false)),
		"failed": bool(a.get("failed", false)) or bool(b.get("failed", false)),
	}
	for k in ["n", "e", "h", "ias", "gs", "vs", "alt", "pIn", "rIn", "rud", "thr", "gear", "flap", "rpm"]:
		var av := _f(a, k)
		out[k] = av + (_f(b, k) - av) * f
	return out

static func _copy(x: Dictionary) -> Dictionary:
	var c := x.duplicate()
	var q := _quat_of(x)
	c["q"] = [q.x, q.y, q.z, q.w]
	return c

# ---------------------------------------------------------------- world conversion
## Godot world position of a sample (see the header for the derivation).
static func world_from_sample(sample: Dictionary) -> Vector3:
	var alt_ft := _f(sample, "alt")
	var y := alt_ft / FP.FT
	if alt_ft == 0.0 and bool(sample.get("onGround", false)):
		y = FP.GROUND_M
	return Vector3(_f(sample, "e"), y, -_f(sample, "n")) + VIS_OFF

## The tower cab viewpoint in Godot world coordinates (for frame_camera's
## tower_pos argument).
static func tower_cab_position() -> Vector3:
	var rwy: Dictionary = FP.lab_rwy()
	var ne: Array = FP.rwyToNE(rwy, TOWER_A, TOWER_C)
	return Vector3(float(ne[1]), FP.GROUND_M + TOWER_CAB_UP, -float(ne[0])) + VIS_OFF

# ---------------------------------------------------------------- cameras
## Frame an external camera on the aircraft.
##   mode "tower": camera sits at tower_pos (the tower cab) and watches
##     the aircraft.
##   mode "chase": camera sits behind/above the aircraft (body +Z) and
##     looks ahead of it.
##   mode "wing": camera sits at the right wingtip and looks forward
##     along the fuselage.
## Unknown modes fall back to "chase". The camera's -Z ends up pointing
## at the look target (Godot camera convention).
static func frame_camera(mode: String, cam: Camera3D, aircraft_node: Node3D, tower_pos: Vector3) -> void:
	if cam == null or aircraft_node == null:
		return
	# global transform when in the tree, local otherwise (identical for
	# parentless / root-parented nodes, and it keeps the function usable
	# from headless tests).
	var a_xf := aircraft_node.global_transform if aircraft_node.is_inside_tree() else aircraft_node.transform
	var ap := a_xf.origin
	var basis := a_xf.basis
	var pos := Vector3.ZERO
	var target := ap
	match mode:
		"tower":
			pos = tower_pos
			target = ap
		"wing":
			pos = ap + basis * WING_OFFSET
			target = ap + basis * WING_LOOK
		_:  # "chase" and fallback
			pos = ap + basis * CHASE_OFFSET
			target = ap + basis * CHASE_LOOK
	if pos.distance_squared_to(target) < 1e-6:
		# Degenerate (tower position == aircraft position): keep the
		# camera where it is and just face the aircraft's heading.
		target = pos + basis * Vector3(0, 0, -1)
	var up := Vector3.UP
	var dir := (target - pos).normalized()
	if absf(dir.dot(up)) > 0.999:
		up = Vector3(0, 0, -1)
	var xf := Transform3D(Basis.IDENTITY, pos).looking_at(target, up)
	if cam.is_inside_tree():
		cam.global_transform = xf
	else:
		cam.transform = xf
