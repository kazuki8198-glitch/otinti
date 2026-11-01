class_name CadetRecorder
extends RefCounted

## CADET Godot port — Phase 3: flight recorder (採取側).
## Port of cadet/src/flight/recorder.js (HTML CADET @ 898fe8a, 121 lines).
## While a flight runs it keeps a state snapshot ten times a second; the
## samples are plain data (Dictionaries) so a recording can be stored,
## tested and exported (to_csv / to_gpx). Pure logic: the caller hands it
## the bridge's state (the physics `s` Dictionary) each frame.
##
## Static API mirrors the JS module functions: snapshot / sample_at /
## duration / pose_at / to_csv / to_gpx. The JS createRecorder() object is
## this class itself: start / push / mark / done / recording / current /
## last_rec (JS: last) / clear.
##
## Faithful quirks kept from the original (do NOT "fix" these):
##  - snapshot's h reads `s.pos.y` in JS. The physics state's pos is an
##    Array [east, up, south], which has no `.y`, so h comes out 0 for
##    every real flight state; the height the analysis uses travels in
##    `alt` (out.alt / out.altTrue) instead. A Dictionary pos {y: ...} or
##    a Godot Vector3 pos does carry a y and is honoured.
##  - snapshot's n / e prefer explicit s.n / s.e and otherwise derive
##    from pos ([east, up, south]: n = -pos[2], e = pos[0]).

const REC_HZ := 10
const DT := 1.0 / float(REC_HZ)

var _cur = null  # { meta: Dictionary, samples: Array } while recording
var _last = null  # most recent finished recording (with >= 1 sample)

# ---------------------------------------------------------------- JS scalar semantics
static func _is_num(v) -> bool:
	return typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT

static func _truthy(v) -> bool:
	if v == null:
		return false
	if typeof(v) == TYPE_BOOL:
		return bool(v)
	if typeof(v) == TYPE_STRING:
		return not String(v).is_empty()
	if _is_num(v):
		return float(v) != 0.0 and not is_nan(float(v))
	return true

# JS unary + : null -> 0, bool -> 1/0, numbers pass through, strings parse (invalid -> 0 here;
# JS would give NaN, and every caller except the q components masks NaN away with `|| 0` anyway)
static func _plus(v) -> float:
	if v == null:
		return 0.0
	if typeof(v) == TYPE_BOOL:
		return 1.0 if bool(v) else 0.0
	if _is_num(v):
		return float(v)
	if typeof(v) == TYPE_STRING:
		return String(v).to_float()
	return 0.0

# JS `v || 0`
static func _or0(v) -> float:
	if v == null:
		return 0.0
	if typeof(v) == TYPE_BOOL:
		return 1.0 if bool(v) else 0.0
	if _is_num(v):
		return float(v) if float(v) != 0.0 and not is_nan(float(v)) else 0.0
	if typeof(v) == TYPE_STRING:
		return _plus(v) if not String(v).is_empty() else 0.0
	return 0.0

# JS number formatting: Number.prototype.toFixed (same construction as school.gd's port)
static func _to_fixed(x: float, d: int) -> String:
	if is_nan(x):
		return "NaN"
	if is_inf(x):
		return "-Infinity" if x < 0.0 else "Infinity"
	var neg := x < 0.0
	var scaled := absf(x) * pow(10.0, d)
	var n := floorf(scaled + 0.5)
	var div := pow(10.0, d)
	var ip := int(floorf(n / div)) if d > 0 else int(n)
	var out := ("-" if neg else "") + str(ip)
	if d > 0:
		var fp := int(n - float(ip) * div)
		var fs := str(fp)
		while fs.length() < d:
			fs = "0" + fs
		out += "." + fs
	return out

# JS Math.round (half up, also for negatives)
static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))

static func _q4(q) -> Array:
	if typeof(q) == TYPE_ARRAY and q.size() >= 4:
		return [_plus(q[0]), _plus(q[1]), _plus(q[2]), _plus(q[3])]
	return [0.0, 0.0, 0.0, 1.0]

# ---------------------------------------------------------------- snapshot
# One snapshot of the bridge state (flight s / s.out), taken defensively: anything missing is 0.
# `s` is a Dictionary (or null); `t` is the flight time in seconds.
static func snapshot(s, t = null) -> Dictionary:
	var sd: Dictionary = s if typeof(s) == TYPE_DICTIONARY else {}
	var has_s := typeof(s) == TYPE_DICTIONARY
	var o: Dictionary = sd.get("out") if typeof(sd.get("out")) == TYPE_DICTIONARY else {}
	var e0: Dictionary = {}
	var eng = sd.get("eng")
	if typeof(eng) == TYPE_ARRAY and not eng.is_empty() and typeof(eng[0]) == TYPE_DICTIONARY:
		e0 = eng[0]
	var q := _q4(sd.get("q"))
	var pos = sd.get("pos")
	# n / e: explicit fields win; otherwise derive from pos [east, up, south]
	var nn := 0.0
	var ee := 0.0
	if has_s:
		if sd.get("n") != null:
			nn = _or0(sd.get("n"))
		elif pos != null:
			nn = _or0(-_pos_at(pos, 2))
		if sd.get("e") != null:
			ee = _or0(sd.get("e"))
		elif pos != null:
			ee = _or0(_pos_at(pos, 0))
	# h: JS reads s.pos.y — an Array pos has no .y, so this is 0 for physics states (see header)
	var hh := 0.0
	if has_s and pos != null:
		hh = _or0(_pos_y(pos))
	var thr_v = 0.0
	if e0.get("thr") != null:
		thr_v = _plus(e0.get("thr"))
	elif has_s:
		thr_v = _or0(sd.get("thr"))
	var flap_v := 0.0
	var fl = sd.get("flaps")
	if has_s and _truthy(fl):
		flap_v = _or0(fl.get("deg")) if typeof(fl) == TYPE_DICTIONARY else 0.0
	elif has_s:
		flap_v = _or0(sd.get("flapDeg"))
	return {
		"t": _or0(t),
		"n": nn, "e": ee, "h": hh,
		"q": q,
		"ias": _or0(o.get("ias")), "gs": _or0(o.get("gs")),
		"vs": _plus(o.get("vsi")) if o.get("vsi") != null else _or0(o.get("vs")),
		"alt": _plus(o.get("alt")) if o.get("alt") != null else _or0(o.get("altTrue")),
		"pIn": _or0(sd.get("pIn")) if has_s else 0.0,
		"rIn": _or0(sd.get("rIn")) if has_s else 0.0,
		"rud": _or0(sd.get("rud")) if has_s else 0.0,
		"thr": thr_v,
		"gear": sd.get("gearPos") if has_s and sd.get("gearPos") != null else 1,
		"flap": flap_v,
		"onGround": _truthy(sd.get("onGround")) if has_s else false,
		"rpm": _or0(e0.get("rpm")),
		"failed": _truthy(e0.get("failed")),
	}

static func _pos_at(pos, i: int) -> float:
	if typeof(pos) == TYPE_ARRAY:
		return _plus(pos[i]) if pos.size() > i else 0.0
	if typeof(pos) == TYPE_VECTOR3:
		var v: Vector3 = pos
		return v.x if i == 0 else v.y if i == 1 else v.z
	if typeof(pos) == TYPE_DICTIONARY:
		return _plus(pos.get(i))
	return 0.0

static func _pos_y(pos) -> Variant:
	if typeof(pos) == TYPE_DICTIONARY:
		return pos.get("y")
	if typeof(pos) == TYPE_VECTOR3:
		return (pos as Vector3).y
	return null  # an Array (the JS original's shape) has no .y: +undefined || 0 == 0

# ---------------------------------------------------------------- the recorder object
# start(meta) begins a flight and returns the live recording { meta, samples }.
func start(meta: Dictionary = {}) -> Dictionary:
	_cur = {"meta": meta.duplicate(), "samples": []}
	return _cur

# push(s, t): keeps a snapshot when its time has come (call it every frame; it thins to REC_HZ itself)
func push(s, t) -> void:
	if _cur == null or s == null:
		return
	var samples: Array = _cur["samples"]
	var last_snap = samples[samples.size() - 1] if not samples.is_empty() else null
	if last_snap != null and _plus(t) - float(last_snap["t"]) < DT - 1e-9:
		return
	samples.append(snapshot(s, t))

# a forced snapshot (the touchdown, the crash): kept even inside the thinning interval
func mark(s, t) -> void:
	if _cur != null and s != null:
		(_cur["samples"] as Array).append(snapshot(s, t))

func done() -> Variant:
	var r = _cur
	_cur = null
	if r != null and not (r["samples"] as Array).is_empty():
		_last = r
	return r

func recording() -> bool:
	return _cur != null

func current() -> Variant:
	return _cur

# JS: last()
func last_rec() -> Variant:
	return _last

func clear() -> void:
	_last = null

# ---------------------------------------------------------------- playback
# The pose at time t: linear in position / speeds / surfaces, slerp in attitude.
# Returns a fresh Dictionary shaped like a snapshot (null when the recording has nothing).
static func sample_at(rec, t: float) -> Variant:
	var xs_v = rec.get("samples") if typeof(rec) == TYPE_DICTIONARY else null
	if typeof(xs_v) != TYPE_ARRAY or xs_v.is_empty():
		return null
	var xs: Array = xs_v
	if t <= float(xs[0]["t"]):
		return _copy_sample(xs[0])
	var last_x: Dictionary = xs[xs.size() - 1]
	if t >= float(last_x["t"]):
		return _copy_sample(last_x)
	var lo := 0
	var hi := xs.size() - 1
	while hi - lo > 1:
		var mid := (lo + hi) >> 1
		if float(xs[mid]["t"]) <= t:
			lo = mid
		else:
			hi = mid
	var a: Dictionary = xs[lo]
	var b: Dictionary = xs[hi]
	var span := maxf(1e-9, float(b["t"]) - float(a["t"]))
	var f := (t - float(a["t"])) / span
	# quaternion slerp (shortest path)
	var aq := _q4(a.get("q"))
	var bq := _q4(b.get("q"))
	var dot: float = float(aq[0]) * float(bq[0]) + float(aq[1]) * float(bq[1]) + float(aq[2]) * float(bq[2]) + float(aq[3]) * float(bq[3])
	var s0 := 0.0
	var s1 := 1.0
	if dot < 0.0:
		dot = -dot
		s1 = -1.0
	if dot > 0.9995:
		s0 = 1.0 - f
		s1 = s1 * f
	else:
		var th := acos(minf(1.0, dot))
		var sn := sin(th)
		s0 = sin((1.0 - f) * th) / sn
		s1 = s1 * sin(f * th) / sn
	return {
		"t": t,
		"n": _mix(a, b, "n", f), "e": _mix(a, b, "e", f), "h": _mix(a, b, "h", f),
		"q": [aq[0] * s0 + bq[0] * s1, aq[1] * s0 + bq[1] * s1, aq[2] * s0 + bq[2] * s1, aq[3] * s0 + bq[3] * s1],
		"ias": _mix(a, b, "ias", f), "gs": _mix(a, b, "gs", f), "vs": _mix(a, b, "vs", f), "alt": _mix(a, b, "alt", f),
		"pIn": _mix(a, b, "pIn", f), "rIn": _mix(a, b, "rIn", f), "rud": _mix(a, b, "rud", f), "thr": _mix(a, b, "thr", f),
		"gear": _mix(a, b, "gear", f), "flap": _mix(a, b, "flap", f),
		"onGround": bool(a.get("onGround", false)) if f < 0.5 else bool(b.get("onGround", false)),
		"rpm": _mix(a, b, "rpm", f), "failed": _truthy(a.get("failed")) or _truthy(b.get("failed")),
	}

static func _copy_sample(x: Dictionary) -> Dictionary:
	var c := x.duplicate()
	c["q"] = _q4(x.get("q"))
	return c

static func _mix(a: Dictionary, b: Dictionary, k: String, f: float) -> float:
	var av := _plus(a.get(k))
	return av + (_plus(b.get(k)) - av) * f

static func duration(rec) -> float:
	var xs = rec.get("samples") if typeof(rec) == TYPE_DICTIONARY else null
	if typeof(xs) == TYPE_ARRAY and not xs.is_empty():
		return float(xs[xs.size() - 1]["t"]) - float(xs[0]["t"])
	return 0.0

# position at t as a { n, e, y } in the Sorajima frame (the same the map and the poses use)
static func pose_at(rec, t: float) -> Variant:
	var x = sample_at(rec, t)
	if x == null:
		return null
	return {"n": x["n"], "e": x["e"], "y": x["h"], "q": x["q"], "x": x}

# ---------------------------------------------------------------- exports (item 4-6)
# The flight as a spreadsheet: one row per snapshot.
static func to_csv(rec) -> String:
	var head := "t_s,north_m,east_m,height_m,ias_kt,gs_kt,vs_fpm,alt_ft,pitch_in,roll_in,rudder,thr,gear,flap_deg,on_ground,rpm"
	var xs = rec.get("samples") if typeof(rec) == TYPE_DICTIONARY else null
	var rows: Array = [head]
	if typeof(xs) == TYPE_ARRAY:
		for xv in xs:
			var x: Dictionary = xv
			rows.append(",".join(PackedStringArray([
				_to_fixed(_plus(x.get("t")), 1), _to_fixed(_plus(x.get("n")), 1), _to_fixed(_plus(x.get("e")), 1), _to_fixed(_plus(x.get("h")), 1),
				_to_fixed(_plus(x.get("ias")), 1), _to_fixed(_plus(x.get("gs")), 1), str(_js_round(_plus(x.get("vs")))), str(_js_round(_plus(x.get("alt")))),
				_to_fixed(_plus(x.get("pIn")), 3), _to_fixed(_plus(x.get("rIn")), 3), _to_fixed(_plus(x.get("rud")), 3), _to_fixed(_plus(x.get("thr")), 3),
				_to_fixed(_plus(x.get("gear")), 2), str(_js_round(_plus(x.get("flap")))), "1" if _truthy(x.get("onGround")) else "0", str(_js_round(_plus(x.get("rpm")))),
			])))
	return "\n".join(PackedStringArray(rows)) + "\n"

static func _esc(s) -> String:
	return str(s if s != null else "").replace("&", "&amp;").replace("<", "&lt;")

# The flight as a GPX track: to_lat_lon is a Callable Array [n, e] -> Array [lat, lon];
# the wall-clock start comes from meta.startISO when the caller kept one.
static func to_gpx(rec, to_lat_lon: Callable) -> String:
	var meta: Dictionary = rec.get("meta") if typeof(rec) == TYPE_DICTIONARY and typeof(rec.get("meta")) == TYPE_DICTIONARY else {}
	var title := _esc(meta.get("title") if _truthy(meta.get("title")) else "CADET flight")
	var t0 = _parse_iso_ms(String(meta.get("startISO"))) if _truthy(meta.get("startISO")) else null
	var xs = rec.get("samples") if typeof(rec) == TYPE_DICTIONARY else null
	var pts: Array = []
	if typeof(xs) == TYPE_ARRAY:
		for xv in xs:
			var x: Dictionary = xv
			var ll: Array = to_lat_lon.call([_plus(x.get("n")), _plus(x.get("e"))])
			var when := ""
			if t0 != null:
				var total_ms := int(float(t0) + _plus(x.get("t")) * 1000.0)
				when = "<time>%s</time>" % _iso_from_ms(total_ms)
			pts.append("      <trkpt lat=\"%s\" lon=\"%s\"><ele>%s</ele>%s</trkpt>" % [_to_fixed(_plus(ll[0]), 6), _to_fixed(_plus(ll[1]), 6), _to_fixed(_plus(x.get("h")), 1), when])
	var pts_s := "\n".join(PackedStringArray(pts))
	return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<gpx version=\"1.1\" creator=\"CADET\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n  <metadata><name>%s</name></metadata>\n  <trk><name>%s</name><trkseg>\n%s\n  </trkseg></trk>\n</gpx>\n" % [title, title, pts_s]

# JS Date.parse for the ISO shapes the game writes (…Z or ±hh:mm offsets; a bare
# date-time is read as UTC, matching JS under a UTC local zone). Returns int ms or null (= NaN).
static func _parse_iso_ms(s: String) -> Variant:
	var re := RegEx.new()
	if re.compile("^(\\d{4})-(\\d{2})-(\\d{2})(?:[T ](\\d{2}):(\\d{2})(?::(\\d{2})(?:\\.(\\d{1,9}))?)?\\s*(Z|[+-]\\d{2}:?\\d{2})?)?$") != OK:
		return null
	var m := re.search(s.strip_edges())
	if m == null:
		return null
	var frac := m.get_string(7)
	var ms := 0
	if not frac.is_empty():
		var f3 := frac + "000"
		ms = int(f3.substr(0, 3))
	var dict := {
		"year": int(m.get_string(1)), "month": int(m.get_string(2)), "day": int(m.get_string(3)),
		"hour": int(m.get_string(4)), "minute": int(m.get_string(5)), "second": int(m.get_string(6)),
	}
	var unix := Time.get_unix_time_from_datetime_dict(dict)
	var tz := m.get_string(8)
	if tz.length() > 1:
		var sign := 1 if tz.begins_with("-") else -1  # +hh:mm is ahead of UTC: subtract to get UTC
		var digits := tz.substr(1).replace(":", "")
		var off := int(digits.substr(0, 2)) * 3600 + int(digits.substr(2, 2)) * 60
		unix += sign * off
	return unix * 1000 + ms

# JS new Date(ms).toISOString() — UTC, millisecond precision, fractional ms truncated
static func _iso_from_ms(total_ms: int) -> String:
	var sec := int(floorf(float(total_ms) / 1000.0))
	var ms := total_ms - sec * 1000
	var d := Time.get_datetime_dict_from_unix_time(sec)
	return "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ" % [int(d["year"]), int(d["month"]), int(d["day"]), int(d["hour"]), int(d["minute"]), int(d["second"]), ms]
