class_name CadetHold
extends RefCounted
# Port of cadet/src/flight/hold.js (HTML CADET @ 898fe8a) — holding entry sectors
# (AIM 5-3-8), the holding-side test, and the wind correction (inbound WCA tripled
# outbound, outbound time for a one-minute inbound leg). Angles are magnetic degrees.

const HOLD_LBV := { "fix": "LBV", "fixName": "LAB VOR（架空局）", "inboundCourse": 90, "turns": "right", "altitudeFt": 3000, "legSec": 60, "tasKt": 100 }
const ENTRY_NAMES := { "direct": "Direct entry（直接進入）", "parallel": "Parallel entry（平行進入）", "teardrop": "Teardrop entry（涙滴進入）" }

static func wrap360(a: float) -> float:
	return fmod(fmod(a, 360.0) + 360.0, 360.0)
static func wrap180(a: float) -> float:
	return fmod(a + 540.0, 360.0) - 180.0  # JS % semantics (signed remainder), as in the original

# entry_for_hold(hold, arrival { courseToFix, holdingSide }) -> 'direct' | 'parallel' | 'teardrop'
static func entry_for_hold(hold: Dictionary, arrival: Dictionary) -> String:
	var ctf = arrival.get("courseToFix")
	var d = absf(wrap180(float(ctf) - float(hold["inboundCourse"]))) if ctf != null else NAN
	if d <= 70.0:
		return "direct"
	return "teardrop" if arrival.get("holdingSide") else "parallel"

# is a position (offset from the fix, metres north/east) on the holding side of the inbound course?
static func on_holding_side(hold: Dictionary, dn: float, de: float) -> bool:
	var h = float(hold["inboundCourse"]) * PI / 180.0
	var dir_n = cos(h)
	var dir_e = sin(h)
	var cross = dir_n * de - dir_e * dn
	return cross > 0.0 if hold["turns"] == "right" else cross < 0.0

static func _r1(v: float) -> float:
	var r = floorf(v * 10.0 + 0.5) / 10.0
	return 0.0 if r == 0.0 else r

# wind_correction(hold, { windFrom, windKt, tasKt }) -> { wcaInDeg, inboundHdg, outboundHdg,
# outboundCourse, gsInKt, gsOutKt, outboundSec }
static func wind_correction(hold: Dictionary, opts: Dictionary = {}) -> Dictionary:
	var tas = 100.0
	if opts.get("tasKt") != null and float(opts["tasKt"]) != 0.0:
		tas = float(opts["tasKt"])
	elif hold.get("tasKt") != null and float(hold["tasKt"]) != 0.0:
		tas = float(hold["tasKt"])
	var kt = float(opts["windKt"]) if opts.get("windKt") != null else 0.0
	var wind_from = float(opts["windFrom"]) if opts.get("windFrom") != null else NAN
	var inbound = float(hold["inboundCourse"])
	var rel = wrap180(wind_from + 180.0 - inbound)
	var cross_kt = kt * sin(rel * PI / 180.0)
	var wca_in = -rad_to_deg(asin(clampf(cross_kt / tas, -1.0, 1.0)))
	var along_in = kt * cos(rel * PI / 180.0)
	var gs_in = sqrt(maxf(1.0, tas * tas - cross_kt * cross_kt)) + along_in
	var gs_out = sqrt(maxf(1.0, tas * tas - cross_kt * cross_kt)) - along_in
	var ih = wrap360(inbound + wca_in)
	if ih == 0.0:
		ih = 360.0
	var outbound_course = wrap360(inbound + 180.0)
	var oh = wrap360(outbound_course - 3.0 * wca_in)
	if oh == 0.0:
		oh = 360.0
	var outbound_sec = int(floorf(float(hold["legSec"]) * gs_in / maxf(1.0, gs_out) + 0.5))
	return { "wcaInDeg": _r1(wca_in), "inboundHdg": int(floorf(ih + 0.5)), "outboundHdg": int(floorf(oh + 0.5)), "outboundCourse": outbound_course, "gsInKt": _r1(gs_in), "gsOutKt": _r1(gs_out), "outboundSec": outbound_sec }
