class_name ProfileGraph
extends Control

## CADET Godot port — Phase 4 (item 6'): debrief profile graph.
## Draws the altitude (ft MSL) and IAS (kt) time series of a recorded
## flight (CadetRecorder samples: { t, alt, ias, onGround, ... }) with
## axes, min/max labels and a touchdown marker, for the debrief screen
## (the Godot counterpart of the HTML flight/profile.js graphs added in
## the game-quality wave).
##
## Usage (integration side):
##   var g := ProfileGraph.new()
##   g.custom_minimum_size = Vector2(560, 220)
##   g.set_samples(recorder.last_rec()["samples"])
##
## The testable core is the static series_stats().

const COL_BG := Color(0.05, 0.07, 0.10)
const COL_GRID := Color(1, 1, 1, 0.14)
const COL_AXIS := Color(0.75, 0.8, 0.85)
const COL_ALT := Color(0.30, 0.85, 1.00)
const COL_IAS := Color(0.55, 0.95, 0.45)
const COL_TD := Color(1.0, 0.45, 0.35)
const MARGIN_L := 52.0
const MARGIN_R := 52.0
const MARGIN_T := 18.0
const MARGIN_B := 22.0

var _samples: Array = []

func set_samples(samples: Array) -> void:
	_samples = samples.duplicate()
	queue_redraw()

func samples() -> Array:
	return _samples

func stats() -> Dictionary:
	return series_stats(_samples)

# ---------------------------------------------------------------- stats
static func _f(s: Dictionary, k: String, def: float = 0.0) -> float:
	var v = s.get(k)
	return float(v) if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT else def

## Summary of a sample series, for the graph scales and the debrief text.
##   t_max:       largest sample time (s)
##   alt_min/max: altitude range (ft)
##   ias_max:     peak indicated airspeed (kt)
##   touchdown_t: time of the first airborne -> on-ground transition
##                (the landing touchdown), or -1.0 when the series never
##                leaves the ground or never comes back.
## Empty input -> all zeros with touchdown_t = -1.0.
static func series_stats(samples: Array) -> Dictionary:
	var out := {"t_max": 0.0, "alt_min": 0.0, "alt_max": 0.0, "ias_max": 0.0, "touchdown_t": -1.0}
	if samples.is_empty():
		return out
	var t_max := -INF
	var alt_min := INF
	var alt_max := -INF
	var ias_max := -INF
	var seen_air := false
	var td := -1.0
	for sv in samples:
		var s: Dictionary = sv
		t_max = maxf(t_max, _f(s, "t"))
		alt_min = minf(alt_min, _f(s, "alt"))
		alt_max = maxf(alt_max, _f(s, "alt"))
		ias_max = maxf(ias_max, _f(s, "ias"))
		if not bool(s.get("onGround", false)):
			seen_air = true
		elif seen_air and td < 0.0:
			td = _f(s, "t")
	out["t_max"] = t_max
	out["alt_min"] = alt_min
	out["alt_max"] = alt_max
	out["ias_max"] = ias_max
	out["touchdown_t"] = td
	return out

# ---------------------------------------------------------------- drawing
func _draw() -> void:
	var rect := Rect2(Vector2.ZERO, size)
	draw_rect(rect, COL_BG)
	if _samples.size() < 2:
		_text("記録なし", Vector2(MARGIN_L, MARGIN_T + 14.0), COL_AXIS, 13)
		return
	var st := series_stats(_samples)
	var t0 := _f(_samples[0], "t")
	var t1 := maxf(float(st["t_max"]), t0 + 1e-6)
	var plot := Rect2(
		Vector2(MARGIN_L, MARGIN_T),
		Vector2(maxf(size.x - MARGIN_L - MARGIN_R, 10.0), maxf(size.y - MARGIN_T - MARGIN_B, 10.0)))
	# Ground line (field elevation 55 ft) as the altitude floor reference.
	var alt_lo := minf(float(st["alt_min"]), 55.0)
	var alt_hi := maxf(float(st["alt_max"]), alt_lo + 100.0)
	var ias_hi := maxf(float(st["ias_max"]), 10.0)
	var x_of = func(t: float) -> float: return plot.position.x + (t - t0) / (t1 - t0) * plot.size.x
	var y_alt = func(a: float) -> float: return plot.position.y + plot.size.y - (a - alt_lo) / (alt_hi - alt_lo) * plot.size.y
	var y_ias = func(v: float) -> float: return plot.position.y + plot.size.y - v / ias_hi * plot.size.y
	# grid + frame
	for i in range(5):
		var gy := plot.position.y + plot.size.y * float(i) / 4.0
		draw_line(Vector2(plot.position.x, gy), Vector2(plot.position.x + plot.size.x, gy), COL_GRID, 1.0)
	draw_rect(plot, COL_AXIS, false, 1.0)
	# series
	var alt_pts := PackedVector2Array()
	var ias_pts := PackedVector2Array()
	for sv in _samples:
		var s: Dictionary = sv
		var x := float(x_of.call(_f(s, "t")))
		alt_pts.append(Vector2(x, float(y_alt.call(_f(s, "alt")))))
		ias_pts.append(Vector2(x, float(y_ias.call(_f(s, "ias")))))
	if alt_pts.size() >= 2:
		draw_polyline(alt_pts, COL_ALT, 1.6)
	if ias_pts.size() >= 2:
		draw_polyline(ias_pts, COL_IAS, 1.6)
	# ground reference line on the altitude scale
	var gy55 := float(y_alt.call(55.0))
	draw_line(Vector2(plot.position.x, gy55), Vector2(plot.position.x + plot.size.x, gy55), Color(1, 1, 1, 0.35), 1.0)
	# touchdown marker
	var td := float(st["touchdown_t"])
	if td >= 0.0:
		var tx := float(x_of.call(td))
		draw_line(Vector2(tx, plot.position.y), Vector2(tx, plot.position.y + plot.size.y), COL_TD, 1.4)
		_text("TD %.0fs" % td, Vector2(tx + 4.0, plot.position.y + 12.0), COL_TD, 12)
	# labels: altitude axis on the left (cyan), IAS axis on the right (green)
	_text("ALT ft", Vector2(4.0, MARGIN_T + 2.0), COL_ALT, 12)
	_text("%.0f" % alt_hi, Vector2(4.0, MARGIN_T + 16.0), COL_ALT, 11)
	_text("%.0f" % alt_lo, Vector2(4.0, size.y - MARGIN_B + 2.0), COL_ALT, 11)
	_text("IAS kt", Vector2(size.x - MARGIN_R + 6.0, MARGIN_T + 2.0), COL_IAS, 12)
	_text("%.0f" % ias_hi, Vector2(size.x - MARGIN_R + 6.0, MARGIN_T + 16.0), COL_IAS, 11)
	_text("0", Vector2(size.x - MARGIN_R + 6.0, size.y - MARGIN_B + 2.0), COL_IAS, 11)
	_text("t %.0f–%.0f s" % [t0, t1], Vector2(MARGIN_L, size.y - 6.0), COL_AXIS, 11)

func _text(s: String, pos: Vector2, col: Color, px: int) -> void:
	var font := get_theme_default_font()
	if font == null:
		return
	draw_string(font, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, px, col)
