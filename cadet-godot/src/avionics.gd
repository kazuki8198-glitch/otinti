class_name CadetAvionics
extends RefCounted
# Port of flight-lab/src/avionics.js (HTML FLIGHT LAB @ 898fe8a) — the arithmetic behind
# the G1000-type displays: headings / magnetic variation, the altimeter setting, radio
# frequencies in kHz steps, lat/lon <-> local-plane conversions, CDI / GPS / VOR / LOC
# solutions (nav_solve), the avionics state (create_avionics) and every panel control
# (control), plus the CAS collector, the NRST list and the transponder effective mode.
# Pure logic only: drawPFD / drawMFD and the canvas helpers (txt/box/line/poly, COLORS)
# are NOT ported here — the Phase 2 G1000 drawing is a separate workstream.
# Conventions follow the earlier ports: no := inference, no bare {} blocks,
# JS Math.round is floorf(x + 0.5), JS % on angles goes through fposmod helpers.

const DEG = PI / 180.0
const NM = 1852.0
const FT_PER_INHG = 1000.0
const COM_MIN = 118000
const COM_MAX = 136975
const COM_STEP = 25
const NAV_MIN = 108000
const NAV_MAX = 117950
const NAV_STEP = 50
const ORIGIN := { "lat": 28.777, "lon": -81.238 }
const R_E = 6371008.8
const RANGES := [0.5, 1, 2, 5, 10, 15, 20, 30, 50]
const PROCEDURES := [
	{ "id": "ILS36", "name": "ILS 36", "type": "ILS", "runway": "36", "finalCourse": 360, "fafDistNm": 5.0, "fafAltFt": 2000, "daFt": 255, "mdaFt": null, "visSm": 0.5, "missed": { "to": "LABED", "altFt": 3000, "text": "直行 LAB-D・3,000 ft へ上昇して待機" } },
	{ "id": "RNAV36", "name": "RNAV (GPS) RWY 36", "type": "RNAV", "runway": "36", "finalCourse": 360, "fafDistNm": 5.0, "fafAltFt": 2000, "daFt": 305, "mdaFt": 505, "visSm": 0.5, "missed": { "to": "LABED", "altFt": 3000, "text": "直行 LAB-D・3,000 ft へ上昇して待機" } },
]
const WAYPOINTS := [
	{ "id": "LABRW", "name": "LAB RWY 36（架空）", "n": -1200, "e": -40000, "kind": "apt" },
	{ "id": "LABEA", "name": "LAB-A（架空）", "n": 9000, "e": -34000, "kind": "wpt" },
	{ "id": "LABEB", "name": "LAB-B（架空）", "n": 15000, "e": -21000, "kind": "wpt" },
	{ "id": "LABEC", "name": "LAB-C（架空）", "n": -6000, "e": -24000, "kind": "wpt" },
	{ "id": "LABED", "name": "LAB-D（架空）", "n": -16000, "e": -38000, "kind": "wpt" },
	{ "id": "LABEF", "name": "LAB-F（架空・目的地変更先）", "n": -2000, "e": -33000, "kind": "wpt" },
	{ "id": "SFBVW", "name": "Sanford 概略表示原点（模式図）", "n": 0, "e": 0, "kind": "ref" },
]
const NAVAIDS := [
	{ "id": "LBV", "name": "LAB VOR（架空局）", "freq": 113500, "n": 4000, "e": -30000, "type": "VOR" },
	{ "id": "ILAB", "name": "I-LAB LOC 36（架空）", "freq": 109900, "type": "LOC" },
]

# ---------------------------------------------------------------- helpers
static func _clamp(v: float, a: float, b: float) -> float:
	return a if v < a else b if v > b else v
static func _clampi(v: int, a: int, b: int) -> int:
	return a if v < a else b if v > b else v
static func wrap360(a: float) -> float:
	return fposmod(a, 360.0)
static func wrap180(a: float) -> float:
	return fposmod(a + 540.0, 360.0) - 180.0
static func _is_num(x) -> bool:
	return typeof(x) == TYPE_INT or typeof(x) == TYPE_FLOAT
static func _fin(v, d: float = 0.0) -> float:
	return float(v) if _is_num(v) and is_finite(float(v)) else d
static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))
static func _truthy(v) -> bool:
	if v == null:
		return false
	if typeof(v) == TYPE_BOOL:
		return bool(v)
	if _is_num(v):
		return float(v) != 0.0
	if typeof(v) == TYPE_STRING:
		return not String(v).is_empty()
	return true
static func _pad2(n: int) -> String:
	var s = str(n)
	while s.length() < 2:
		s = "0" + s
	return s
static func _pad4(n: int) -> String:
	var s = str(n)
	while s.length() < 4:
		s = "0" + s
	return s
static func _num_str(v) -> String:
	# JS template interpolation of a number: integers print without a decimal point
	if _is_num(v) and float(v) == floorf(float(v)) and is_finite(float(v)):
		return str(int(float(v)))
	return str(v)
static func _int_of(v) -> int:
	return int(float(v)) if _is_num(v) else 0

# ---------------------------------------------------------------- headings and magnetic variation
static func true_to_mag(t: float, var_w: float) -> float:
	return wrap360(t + var_w)
static func mag_to_true(m: float, var_w: float) -> float:
	return wrap360(m - var_w)
static func hdg_diff(a: float, b: float) -> float:
	return wrap180(b - a)
static func hdg_fmt(h: float) -> String:
	var r = _js_round(wrap360(h))
	if r == 0:
		r = 360
	var s = str(r)
	while s.length() < 3:
		s = "0" + s
	return s

# ---------------------------------------------------------------- the altimeter setting
static func indicated_alt(alt_true_ft: float, qnh_actual: float, setting: float) -> float:
	return alt_true_ft + (setting - qnh_actual) * FT_PER_INHG
static func inhg_to_hpa(v: float) -> float:
	return v * 33.8639
static func hpa_to_inhg(v: float) -> float:
	return v / 33.8639

# ---------------------------------------------------------------- radios (kHz integers)
static func tune(khz, part: String, dir, kind: String = "COM") -> int:
	var is_nav = kind == "NAV"
	var mn = NAV_MIN if is_nav else COM_MIN
	var mx = NAV_MAX if is_nav else COM_MAX
	var st = NAV_STEP if is_nav else COM_STEP
	var khz_i = int(floorf(float(khz))) if _is_num(khz) else 0
	var mhz = int(floorf(float(khz_i) / 1000.0))
	var k = khz_i - mhz * 1000
	var dir_i = int(dir) if _is_num(dir) else 0
	if part == "MHz":
		var lo = int(floorf(float(mn) / 1000.0))
		var hi = int(floorf(float(mx) / 1000.0))
		mhz += dir_i
		if mhz > hi:
			mhz = lo
		if mhz < lo:
			mhz = hi
	else:
		k += dir_i * st
		if k >= 1000:
			k = 0
		if k < 0:
			k = 1000 - st
	return _clampi(mhz * 1000 + k, mn, mx)
static func fmt_com(khz) -> String:
	return "%.3f" % (float(khz) / 1000.0)
static func fmt_nav(khz) -> String:
	return "%.2f" % (float(khz) / 1000.0)
static func valid_com(khz) -> bool:
	if not _is_num(khz) or not is_finite(float(khz)):
		return false
	if float(khz) != floorf(float(khz)):
		return false
	var v = int(float(khz))
	return v >= COM_MIN and v <= COM_MAX and v % COM_STEP == 0

# ---------------------------------------------------------------- positions: the local plane and lat/lon
static func ne_to_lat_lon(n: float, e: float, o = null) -> Dictionary:
	var org = o if typeof(o) == TYPE_DICTIONARY else ORIGIN
	return { "lat": float(org["lat"]) + n / R_E / DEG, "lon": float(org["lon"]) + e / (R_E * cos(float(org["lat"]) * DEG)) / DEG }
static func lat_lon_to_ne(lat: float, lon: float, o = null) -> Dictionary:
	var org = o if typeof(o) == TYPE_DICTIONARY else ORIGIN
	return { "n": (lat - float(org["lat"])) * DEG * R_E, "e": (lon - float(org["lon"])) * DEG * R_E * cos(float(org["lat"]) * DEG) }
static func gc_dist_nm(a: Dictionary, b: Dictionary) -> float:
	var f1 = float(a["lat"]) * DEG
	var f2 = float(b["lat"]) * DEG
	var df = (float(b["lat"]) - float(a["lat"])) * DEG
	var dl = (float(b["lon"]) - float(a["lon"])) * DEG
	var s1 = sin(df / 2.0)
	var s2 = sin(dl / 2.0)
	var h = s1 * s1 + cos(f1) * cos(f2) * s2 * s2
	return 2.0 * R_E * asin(minf(1.0, sqrt(h))) / NM
static func gc_bearing(a: Dictionary, b: Dictionary) -> float:
	var f1 = float(a["lat"]) * DEG
	var f2 = float(b["lat"]) * DEG
	var dl = (float(b["lon"]) - float(a["lon"])) * DEG
	return wrap360(atan2(sin(dl) * cos(f2), cos(f1) * sin(f2) - sin(f1) * cos(f2) * cos(dl)) / DEG)
static func ne_dist_nm(a: Dictionary, b: Dictionary) -> float:
	var dn = float(b["n"]) - float(a["n"])
	var de = float(b["e"]) - float(a["e"])
	return sqrt(dn * dn + de * de) / NM
static func ne_bearing(a: Dictionary, b: Dictionary) -> float:
	return wrap360(atan2(float(b["e"]) - float(a["e"]), float(b["n"]) - float(a["n"])) / DEG)
static func xtk_nm(a: Dictionary, b: Dictionary, p: Dictionary) -> float:
	var dx = float(b["e"]) - float(a["e"])
	var dy = float(b["n"]) - float(a["n"])
	var l = sqrt(dx * dx + dy * dy)
	if l == 0.0:
		l = 1.0
	return ((float(p["e"]) - float(a["e"])) * dy - (float(p["n"]) - float(a["n"])) * dx) / l / NM
static func atk_to_go_nm(a: Dictionary, b: Dictionary, p: Dictionary) -> float:
	var dx = float(b["e"]) - float(a["e"])
	var dy = float(b["n"]) - float(a["n"])
	var l = sqrt(dx * dx + dy * dy)
	if l == 0.0:
		l = 1.0
	return (l - ((float(p["e"]) - float(a["e"])) * dx + (float(p["n"]) - float(a["n"])) * dy) / l) / NM
static func ete_sec(dist_nm: float, gs_kt: float) -> Variant:
	return dist_nm / gs_kt * 3600.0 if gs_kt > 5.0 else null
static func ete_fmt(s) -> String:
	if s == null or not _is_num(s) or not is_finite(float(s)):
		return "--:--"
	var sf = float(s)
	if sf >= 3600.0:
		return "%d:%s" % [int(floorf(sf / 3600.0)), _pad2(int(floorf(fmod(sf, 3600.0) / 60.0)))]
	return "%s:%s" % [_pad2(int(floorf(sf / 60.0))), _pad2(int(floorf(fmod(sf, 60.0))))]

# ---------------------------------------------------------------- the CDI
static func cdi_gps(xtk: float, full_scale_nm: float = 1.0) -> float:
	return _clamp(-xtk / full_scale_nm * 2.0, -2.5, 2.5)
static func cdi_vor(radial: float, obs: float) -> Dictionary:
	var off = wrap180(radial - obs)
	var is_from = absf(off) < 90.0
	var dev_deg = wrap180(obs - radial) if is_from else wrap180(radial - obs - 180.0)
	return { "dots": _clamp(dev_deg / 5.0, -2.5, 2.5), "toFrom": "FROM" if is_from else "TO", "devDeg": dev_deg }
static func cdi_loc(angle_off_deg: float) -> float:
	return _clamp(-angle_off_deg / 1.25, -2.5, 2.5)
static func gs_dots(above_deg: float) -> float:
	return _clamp(-above_deg / 0.35, -2.5, 2.5)

# ---------------------------------------------------------------- procedures / waypoints / navaids
static func procedure_by_id(id: String) -> Variant:
	for p in PROCEDURES:
		if String(p["id"]) == id:
			return (p as Dictionary).duplicate(true)
	return null
static func wpt(id) -> Variant:
	if id == null:
		return null
	for w in WAYPOINTS:
		if String(w["id"]) == String(id):
			return (w as Dictionary).duplicate(true)
	return null
static func _navaid_by_freq(freq: int) -> Variant:
	for a in NAVAIDS:
		if int(a["freq"]) == freq:
			return a
	return null

# ---------------------------------------------------------------- the avionics state and its controls
static func create_avionics() -> Dictionary:
	return {
		"com1": { "act": 118300, "stby": 121700 }, "com2": { "act": 126950, "stby": 120100 },
		"nav1": { "act": 109900, "stby": 113500 }, "nav2": { "act": 113500, "stby": 110300 },
		"audio": { "mic": "COM1", "monitor": { "COM1": true, "COM2": false, "NAV1": false, "NAV2": false } },
		"comSel": "COM1", "navSel": "NAV1",
		"hdgBug": 360, "altSel": 3000, "baro": 29.92, "baroUnit": "IN", "crs": 360,
		"cdi": "GPS", "obs": false, "brg1": null, "brg2": null, "xpdrIdent": 0,
		"fplEdit": false, "fplCursor": 1, "fplPick": 0, "nrstSel": 0, "proc": null, "_ack": {},
		"xpdr": { "code": 1200, "mode": "ALT", "entry": "" }, "pfdMenu": "TOP",
		"wind": true, "mfdPage": "MAP", "mfdRangeIdx": 4, "mapNorthUp": true,
		"fpl": { "wps": ["LABRW", "LABEA", "LABEB"], "active": 1 },
		"direct": null, "directFrom": null, "timer": 0,
	}
# Alias matching the task brief's name for createAvionics.
static func create_av() -> Dictionary:
	return create_avionics()

static func _radio(av: Dictionary, sel_key: String) -> Dictionary:
	var sel = String(av[sel_key]).to_lower()
	var r = av.get(sel)
	return r if typeof(r) == TYPE_DICTIONARY else {}

static func control(av: Dictionary, what: String, dir = 1, big: bool = false) -> String:
	match what:
		"HDG":
			var nb = wrap360(float(_js_round(float(av["hdgBug"]) + float(dir) * (10.0 if big else 1.0))))
			if nb == 0.0:
				nb = 360.0
			av["hdgBug"] = nb
			return "HDG %s" % hdg_fmt(nb)
		"HDG_SYNC":
			var sv = _js_round(float(dir))
			if sv == 0:
				sv = 360
			av["hdgBug"] = sv
			return "HDG %s" % hdg_fmt(float(sv))
		"ALT":
			var na = _clampi(_js_round(float(av["altSel"]) / 100.0) * 100 + int(float(dir)) * (1000 if big else 100), 0, 18000)
			av["altSel"] = na
			return "ALT SEL %s" % _num_str(na)
		"BARO":
			var bv = _clamp(float(av["baro"]) + float(dir) * 0.01, 27.5, 31.5)
			bv = floorf(bv * 100.0 + 0.5) / 100.0
			av["baro"] = bv
			return "BARO %.2f" % bv
		"STD_BARO":
			av["baro"] = 29.92
			return "BARO STD 29.92"
		"ALT_UNIT":
			av["baroUnit"] = "HPA" if String(av["baroUnit"]) == "IN" else "IN"
			return "BARO 単位 %s" % String(av["baroUnit"])
		"CRS":
			var nc = wrap360(float(_js_round(float(av["crs"]) + float(dir) * (10.0 if big else 1.0))))
			if nc == 0.0:
				nc = 360.0
			av["crs"] = nc
			return "CRS %s" % hdg_fmt(nc)
		"COM_MHZ":
			var c1 = _radio(av, "comSel")
			c1["stby"] = tune(c1["stby"], "MHz", dir)
			return "%s STBY %s" % [String(av["comSel"]), fmt_com(c1["stby"])]
		"COM_KHZ":
			var c2 = _radio(av, "comSel")
			c2["stby"] = tune(c2["stby"], "kHz", dir)
			return "%s STBY %s" % [String(av["comSel"]), fmt_com(c2["stby"])]
		"COM_SWAP":
			var c3 = _radio(av, "comSel")
			var tmp1 = c3["act"]
			c3["act"] = c3["stby"]
			c3["stby"] = tmp1
			return "%s ACT %s" % [String(av["comSel"]), fmt_com(c3["act"])]
		"COM_SEL":
			av["comSel"] = "COM2" if String(av["comSel"]) == "COM1" else "COM1"
			return "周波数の操作：%s" % String(av["comSel"])
		"NAV_MHZ":
			var n1 = _radio(av, "navSel")
			n1["stby"] = tune(n1["stby"], "MHz", dir, "NAV")
			return "%s STBY %s" % [String(av["navSel"]), fmt_nav(n1["stby"])]
		"NAV_KHZ":
			var n2 = _radio(av, "navSel")
			n2["stby"] = tune(n2["stby"], "kHz", dir, "NAV")
			return "%s STBY %s" % [String(av["navSel"]), fmt_nav(n2["stby"])]
		"NAV_SWAP":
			var n3 = _radio(av, "navSel")
			var tmp2 = n3["act"]
			n3["act"] = n3["stby"]
			n3["stby"] = tmp2
			return "%s ACT %s" % [String(av["navSel"]), fmt_nav(n3["act"])]
		"NAV_SEL":
			av["navSel"] = "NAV2" if String(av["navSel"]) == "NAV1" else "NAV1"
			return "周波数の操作：%s" % String(av["navSel"])
		"CDI":
			av["cdi"] = "NAV1" if String(av["cdi"]) == "GPS" else "NAV2" if String(av["cdi"]) == "NAV1" else "GPS"
			return "CDI %s" % cdi_name(av)
		"MIC":
			var audio1: Dictionary = av["audio"]
			audio1["mic"] = "COM2" if String(audio1["mic"]) == "COM1" else "COM1"
			return "MIC %s（送信はできません）" % String(audio1["mic"])
		"MON":
			var audio2: Dictionary = av["audio"]
			var monitor: Dictionary = audio2["monitor"]
			monitor[dir] = not bool(monitor.get(dir, false))
			return "%s 受信 %s" % [str(dir), "ON" if bool(monitor[dir]) else "OFF"]
		"MFD_PAGE":
			var pages = ["MAP", "FPL", "ENGINE", "SYSTEM", "NRST"]
			var idx = pages.find(String(av["mfdPage"]))
			av["mfdPage"] = pages[(idx + 1) % pages.size()]
			return "MFD %s" % String(av["mfdPage"])
		"MFD_MAP":
			av["mfdPage"] = "MAP"
			return "MFD MAP"
		"MFD_FPL":
			av["mfdPage"] = "FPL"
			return "MFD FPL"
		"MFD_ENG":
			av["mfdPage"] = "ENGINE"
			return "MFD ENGINE"
		"MFD_SYS":
			av["mfdPage"] = "SYSTEM"
			return "MFD SYSTEM"
		"MFD_NRST":
			av["mfdPage"] = "NRST"
			return "MFD NRST — 最寄り"
		"NRST_SEL":
			var cat1 = fpl_catalog()
			var cur = _int_of(av.get("nrstSel")) if _truthy(av.get("nrstSel")) else 0
			av["nrstSel"] = _clampi(cur + int(float(dir)), 0, cat1.size() - 1)
			return "NRST %s" % String(wpt(cat1[int(av["nrstSel"])])["id"])
		"FPL_PICK":
			var cat2 = fpl_catalog()
			var np = int(fposmod(float(_int_of(av.get("fplPick")) + int(float(dir)) + cat2.size()), float(cat2.size())))
			av["fplPick"] = np
			return "挿入先 %s" % String(cat2[np])
		"FPL_INSERT":
			if not bool(av.get("fplEdit", false)):
				return ""
			var cat3 = fpl_catalog()
			var id3 = String(cat3[_clampi(_int_of(av.get("fplPick")), 0, cat3.size() - 1)])
			var fpl3: Dictionary = av["fpl"]
			var wps3: Array = fpl3["wps"]
			var at3 = _clampi(_int_of(av.get("fplCursor")), 0, wps3.size())
			wps3.insert(at3, id3)
			if at3 <= _int_of(fpl3["active"]):
				fpl3["active"] = _int_of(fpl3["active"]) + 1
			av["direct"] = null
			return "%s を挿入（%d 点）" % [id3, wps3.size()]
		"FPL_DEL":
			if not bool(av.get("fplEdit", false)) or (av["fpl"]["wps"] as Array).size() <= 2:
				return "計画は2点以上で" if bool(av.get("fplEdit", false)) else ""
			var fpl4: Dictionary = av["fpl"]
			var wps4: Array = fpl4["wps"]
			var at4 = _clampi(_int_of(av.get("fplCursor")), 0, wps4.size() - 1)
			var gone = String(wps4[at4])
			wps4.remove_at(at4)
			if at4 < _int_of(fpl4["active"]):
				fpl4["active"] = _int_of(fpl4["active"]) - 1
			fpl4["active"] = _clampi(_int_of(fpl4["active"]), 1, wps4.size() - 1)
			av["fplCursor"] = _clampi(_int_of(av.get("fplCursor")), 0, wps4.size() - 1)
			av["direct"] = null
			return "%s を削除" % gone
		"KEY_ENT":
			if String(av["mfdPage"]) == "NRST":
				var list5 = av.get("_nrts") if typeof(av.get("_nrts")) == TYPE_ARRAY and not (av.get("_nrts") as Array).is_empty() else fpl_catalog()
				var id5 = list5[_clampi(_int_of(av.get("nrstSel")) if _truthy(av.get("nrstSel")) else 0, 0, list5.size() - 1)]
				if _truthy(id5):
					av["direct"] = id5
					av["directFrom"] = null
					av["mfdPage"] = "MAP"
					return "D→ %s" % str(id5)
				return ""
			if String(av["mfdPage"]) == "FPL":
				if not bool(av.get("fplEdit", false)):
					av["fplEdit"] = true
					av["fplCursor"] = _int_of(av["fpl"]["active"])
					return "FPL 編集：FMS で点と挿入先、ENT で挿入、CLR で削除"
				return control(av, "FPL_INSERT")
			return ""
		"KEY_CLR":
			if bool(av.get("fplEdit", false)):
				return control(av, "FPL_DEL")
			if String(av["mfdPage"]) == "NRST":
				av["mfdPage"] = "MAP"
				return "MFD MAP"
			if _truthy(av.get("direct")):
				av["direct"] = null
				av["directFrom"] = null
				return "D→ 解除"
			return ""
		"PROC":
			var proc1 = av.get("proc")
			if typeof(proc1) != TYPE_DICTIONARY:
				av["proc"] = { "name": "ILS 36", "type": "ILS", "missed": false }
				var navp: Dictionary = av["nav1"]
				navp["act"] = 109900
				av["cdi"] = "NAV1"
				return "PROC：ILS 36 をロード（LOC 109.90）"
			if not bool(proc1.get("missed", false)):
				proc1["missed"] = true
				av["direct"] = "LABED"
				av["directFrom"] = null
				av["crs"] = 360
				if float(av["altSel"]) < 3000.0:
					av["altSel"] = 3000
				return "ミストアプローチ：LAB-D へ直行・3,000 ft へ上昇"
			av["proc"] = null
			return "PROC 解除"
		"PROC_RNAV":
			var proc2 = av.get("proc")
			if typeof(proc2) != TYPE_DICTIONARY or String(proc2.get("type", "")) != "RNAV":
				var p36 = procedure_by_id("RNAV36")
				av["proc"] = { "name": String(p36["name"]), "type": "RNAV", "missed": false, "daFt": p36["daFt"], "mdaFt": p36["mdaFt"] }
				av["cdi"] = "GPS"
				av["direct"] = "LABRW"
				av["directFrom"] = null
				av["crs"] = 360
				if float(av["altSel"]) < float(p36["fafAltFt"]):
					av["altSel"] = p36["fafAltFt"]
				return "PROC：%s をロード（LPV DA %s ft / LNAV MDA %s ft）" % [String(p36["name"]), _num_str(p36["daFt"]), _num_str(p36["mdaFt"])]
			if not bool(proc2.get("missed", false)):
				proc2["missed"] = true
				av["direct"] = "LABED"
				av["directFrom"] = null
				av["crs"] = 360
				if float(av["altSel"]) < 3000.0:
					av["altSel"] = 3000
				return "ミストアプローチ：LAB-D へ直行・3,000 ft へ上昇"
			av["proc"] = null
			return "PROC 解除"
		"RANGE":
			av["mfdRangeIdx"] = _clampi(_int_of(av.get("mfdRangeIdx")) + int(float(dir)), 0, RANGES.size() - 1)
			return "RANGE %s NM" % _num_str(RANGES[int(av["mfdRangeIdx"])])
		"NORTH_UP":
			av["mapNorthUp"] = not bool(av["mapNorthUp"])
			return "MAP NORTH UP" if bool(av["mapNorthUp"]) else "MAP TRACK UP"
		"PFD_MENU":
			av["pfdMenu"] = dir
			return "PFD %s" % str(dir)
		"XPDR":
			av["pfdMenu"] = "TOP" if String(av["pfdMenu"]) == "XPDR" else "XPDR"
			var xp0: Dictionary = av["xpdr"]
			xp0["entry"] = ""
			return "XPDR %s" % _pad4(_int_of(xp0["code"]))
		"XPDR_DIGIT":
			var xp1: Dictionary = av["xpdr"]
			var entry = String(xp1["entry"])
			if entry.length() >= 4:
				entry = ""
			entry = entry + str(_clampi(int(float(dir)) if _is_num(dir) else 0, 0, 7))
			if entry.length() == 4:
				xp1["code"] = int(entry)
				xp1["entry"] = ""
				return "XPDR %s セット" % _pad4(_int_of(xp1["code"]))
			xp1["entry"] = entry
			return "XPDR %s" % entry
		"XPDR_BKSP":
			var xp2: Dictionary = av["xpdr"]
			var e2 = String(xp2["entry"])
			e2 = e2.left(e2.length() - 1) if e2.length() > 0 else ""
			xp2["entry"] = e2
			return "XPDR %s" % (e2 if not e2.is_empty() else _pad4(_int_of(xp2["code"])))
		"XPDR_MODE":
			var modes = ["ALT", "ON", "STBY"]
			var xp3: Dictionary = av["xpdr"]
			xp3["mode"] = modes[(modes.find(String(xp3["mode"])) + 1) % modes.size()]
			return "XPDR %s" % String(xp3["mode"])
		"XPDR_IDENT":
			av["xpdrIdent"] = 18
			return "XPDR IDENT — 18秒"
		"OBS":
			av["obs"] = not bool(av["obs"])
			return "OBS ON（CRS でコース）" if bool(av["obs"]) else "OBS OFF"
		"BRG1":
			var srcs1 = [null, "NAV1", "GPS"]
			av["brg1"] = srcs1[(srcs1.find(av.get("brg1")) + 1) % srcs1.size()]
			return "BRG1 %s" % (str(av["brg1"]) if av["brg1"] != null else "OFF")
		"BRG2":
			var srcs2 = [null, "NAV2", "GPS"]
			av["brg2"] = srcs2[(srcs2.find(av.get("brg2")) + 1) % srcs2.size()]
			return "BRG2 %s" % (str(av["brg2"]) if av["brg2"] != null else "OFF")
		"ALERTS":
			av["pfdMenu"] = "TOP" if String(av["pfdMenu"]) == "ALERTS" else "ALERTS"
			return "ALERTS — 警告一覧" if String(av["pfdMenu"]) == "ALERTS" else "ALERTS 閉じる"
		"WIND":
			av["wind"] = not bool(av["wind"])
			return "WIND ON" if bool(av["wind"]) else "WIND OFF"
		"DIRECT":
			av["direct"] = dir if _truthy(dir) else null
			av["directFrom"] = null
			return "D→ %s" % str(dir) if _truthy(dir) else "D→ 解除"
		"FPL_NEXT":
			if String(av["mfdPage"]) == "NRST":
				return control(av, "NRST_SEL", dir)
			if String(av["mfdPage"]) == "FPL" and bool(av.get("fplEdit", false)):
				var fpl6: Dictionary = av["fpl"]
				var wps6: Array = fpl6["wps"]
				av["fplCursor"] = _clampi(_int_of(av.get("fplCursor")) + int(float(dir)), 0, wps6.size() - 1)
				return "カーソル %s" % str(wps6[int(av["fplCursor"])])
			var fpl7: Dictionary = av["fpl"]
			var wps7: Array = fpl7["wps"]
			fpl7["active"] = _clampi(_int_of(fpl7["active"]) + int(float(dir)), 1, wps7.size() - 1)
			av["direct"] = null
			return "ACTIVE LEG → %s" % str(wps7[_int_of(fpl7["active"])])
	return ""

# the transponder's effective mode: ALT on the ground answers as GND
static func xpdr_eff_mode(av: Dictionary, on_ground: bool) -> String:
	var xp = av.get("xpdr")
	if typeof(xp) == TYPE_DICTIONARY:
		if String(xp.get("mode", "ALT")) == "ALT" and on_ground:
			return "GND"
		return String(xp.get("mode", "ALT"))
	return "ALT"

# ---------------------------------------------------------------- the CAS (crew alerting) collector
static func collect_alerts(av: Dictionary, o = null, d = null) -> Array:
	var od = o if typeof(o) == TYPE_DICTIONARY else {}
	if typeof(od.get("alerts")) == TYPE_ARRAY:
		var mapped: Array = []
		for a in od["alerts"]:
			if typeof(a) == TYPE_STRING:
				mapped.append({ "id": a, "tier": "CAUT", "text": a })
			elif typeof(a) == TYPE_DICTIONARY:
				var idv = a.get("id")
				if not _truthy(idv):
					idv = a.get("text")
				if not _truthy(idv):
					idv = "ALERT"
				var tier = "WARN" if String(a.get("tier", "")) == "WARN" or String(a.get("level", "")) == "warn" else "CAUT"
				var textv = a.get("text")
				if not _truthy(textv):
					var idf = a.get("id")
					textv = str(idf) if _truthy(idf) else "ALERT"
				mapped.append({ "id": idv, "tier": tier, "text": textv })
			else:
				mapped.append({ "id": "ALERT", "tier": "CAUT", "text": "ALERT" })
		return mapped
	var out: Array = []
	var engs: Array = []
	if typeof(d) == TYPE_DICTIONARY and typeof(d.get("eng")) == TYPE_ARRAY and not (d.get("eng") as Array).is_empty():
		engs = d["eng"]
	else:
		engs = [{ "run": true, "rpm": _fin(od.get("rpm")) }]
	var any_run = false
	for e in engs:
		if typeof(e) == TYPE_DICTIONARY and _truthy(e.get("run")):
			any_run = true
	if _fin(od.get("volts"), 99.0) < 12.2 and _fin(od.get("amps"), 0.0) < -0.5:
		out.append({ "id": "LOW VOLTS", "tier": "CAUT", "text": "LOW VOLTS — 電圧低下" })
	var oil_p = od.get("oilP") if typeof(od.get("oilP")) == TYPE_ARRAY else []
	if any_run and not oil_p.is_empty():
		var low_oil = false
		for v in oil_p:
			if _fin(v, 99.0) < 25.0:
				low_oil = true
		if low_oil:
			out.append({ "id": "LOW OIL PRESSURE", "tier": "WARN", "text": "LOW OIL PRESSURE — 油圧低下" })
	var fuel = od.get("fuel") if typeof(od.get("fuel")) == TYPE_ARRAY else []
	if fuel.size() > 1:
		if _fin(fuel[0], 99.0) < 3.0:
			out.append({ "id": "LOW FUEL L", "tier": "CAUT", "text": "LOW FUEL L — 左タンク残りわずか" })
		if _fin(fuel[1], 99.0) < 3.0:
			out.append({ "id": "LOW FUEL R", "tier": "CAUT", "text": "LOW FUEL R — 右タンク残りわずか" })
	if od.get("fuelPress") != null and any_run and _fin(od.get("fuelPress"), 99.0) < 0.5:
		out.append({ "id": "LOW FUEL PRESSURE", "tier": "CAUT", "text": "LOW FUEL PRESS — 燃料圧低下" })
	return out

# the catalog the FPL editor and the NRST page work from
static func fpl_catalog() -> Array:
	var out: Array = []
	for p in WAYPOINTS:
		if String(p["kind"]) != "ref":
			out.append(String(p["id"]))
	return out
# the NRST list: the catalog sorted by distance from pos, with bearing (mag) and distance
static func nrst_list(av: Dictionary, pos, var_w: float) -> Array:
	if typeof(pos) != TYPE_DICTIONARY:
		var bare: Array = []
		for id in fpl_catalog():
			bare.append({ "id": id, "brg": null, "dis": null })
		return bare
	var posd: Dictionary = pos
	var out: Array = []
	for p in WAYPOINTS:
		if String(p["kind"]) == "ref":
			continue
		var pd: Dictionary = p
		out.append({ "id": String(pd["id"]), "name": String(pd["name"]), "brg": true_to_mag(ne_bearing(posd, pd), var_w), "dis": ne_dist_nm(posd, pd) })
	out.sort_custom(func(a, b): return float(a["dis"]) < float(b["dis"]))
	return out
static func cdi_name(av: Dictionary) -> String:
	if String(av.get("cdi", "")) == "GPS":
		return "GPS"
	var r = av.get(String(av["cdi"]).to_lower())
	var aid = null
	if typeof(r) == TYPE_DICTIONARY:
		aid = _navaid_by_freq(int(float(r["act"])) if _is_num(r.get("act")) else 0)
	return ("LOC" if aid != null and String(aid["type"]) == "LOC" else "VOR") + String(av["cdi"]).substr(3)

# ---------------------------------------------------------------- navigation solution for the displays
# pos: { n, e } (metres), o: the physics outputs (gs, altTrue), var_w: magnetic variation W, rwy: LAB_RWY dict
static func nav_solve(av: Dictionary, pos: Dictionary, o: Dictionary, var_w: float, rwy = null) -> Dictionary:
	var out = { "src": cdi_name(av), "dots": 0, "toFrom": "", "dtk": null, "dis": null, "ete": null, "xtk": null, "gsDots": null, "brg": null, "from": "", "to": "", "flag": "", "crs": av.get("crs"), "cdiScale": null }
	var leg_a = null
	var leg_b = null
	if _truthy(av.get("direct")):
		leg_b = wpt(av.get("direct"))
		if av.get("directFrom") == null:
			av["directFrom"] = { "n": float(pos["n"]), "e": float(pos["e"]), "id": "P.POS" }
		leg_a = av["directFrom"]
	else:
		var fpl: Dictionary = av["fpl"]
		var wps: Array = fpl["wps"]
		var active = _int_of(fpl["active"])
		leg_b = wpt(wps[active]) if active >= 0 and active < wps.size() else null
		leg_a = wpt(wps[active - 1]) if active - 1 >= 0 and active - 1 < wps.size() else null
	var fail = av.get("fail")
	var gps_fail = typeof(fail) == TYPE_DICTIONARY and _truthy(fail.get("gps"))
	if leg_a != null and leg_b != null and not gps_fail:
		var ad: Dictionary = leg_a
		var bd: Dictionary = leg_b
		out["from"] = String(ad["id"]) if _truthy(ad.get("id")) else ""
		out["to"] = bd.get("id")
		out["dtk"] = true_to_mag(ne_bearing(ad, bd), var_w)
		out["dis"] = ne_dist_nm(pos, bd)
		out["ete"] = ete_sec(float(out["dis"]), _fin(o.get("gs")))
		out["xtk"] = xtk_nm(ad, bd, pos)
		out["brg"] = true_to_mag(ne_bearing(pos, bd), var_w)
	if String(av.get("cdi", "")) == "GPS":
		if out["dtk"] != null:
			out["crs"] = out["dtk"]
		var fpl2: Dictionary = av["fpl"]
		var final_leg = true if _truthy(av.get("direct")) else _int_of(fpl2["active"]) >= (fpl2["wps"] as Array).size() - 1
		var bd2 = leg_b if typeof(leg_b) == TYPE_DICTIONARY else null
		if bd2 != null and String(bd2.get("kind", "")) == "apt" and final_leg and out["dis"] != null and float(out["dis"]) <= 5.0:
			out["cdiScale"] = 0.3
		elif out["dis"] != null and float(out["dis"]) > 30.0:
			out["cdiScale"] = 2.0
		else:
			out["cdiScale"] = 1.0
		out["dots"] = cdi_gps(float(out["xtk"]), float(out["cdiScale"])) if out["xtk"] != null else 0
		out["toFrom"] = "TO"
		out["flag"] = "NO GPS" if gps_fail else "" if leg_b != null else "NO LEG"
		if bool(av.get("obs", false)) and leg_b != null and not gps_fail:
			var bd3: Dictionary = leg_b
			var radial = true_to_mag(ne_bearing(bd3, pos), var_w)
			var v = cdi_vor(radial, float(av["crs"]))
			out["dots"] = v["dots"]
			out["toFrom"] = v["toFrom"]
			out["crs"] = av["crs"]
			out["obs"] = true
		var proc = av.get("proc")
		if typeof(proc) == TYPE_DICTIONARY and String(proc.get("type", "")) == "RNAV" and not bool(proc.get("missed", false)) and typeof(rwy) == TYPE_DICTIONARY and not gps_fail:
			var rwyd: Dictionary = rwy
			var c = FlightPhysics.rwyCoords(rwyd, float(pos["n"]), float(pos["e"]))
			var h = (_fin(o.get("altTrue")) - float(rwyd["elevFt"])) / 3.28084
			var d_gp = 300.0 - float(c["along"])
			if d_gp > 200.0 and d_gp < 35000.0 and absf(float(c["cross"])) < 3000.0:
				out["gsDots"] = gs_dots(atan2(h, d_gp) / DEG - 3.0)
	else:
		var r = av.get(String(av["cdi"]).to_lower())
		var aid = null
		if typeof(r) == TYPE_DICTIONARY:
			aid = _navaid_by_freq(int(float(r["act"])) if _is_num(r.get("act")) else 0)
		if aid == null:
			out["flag"] = "NO SIGNAL"
			out["dots"] = 0
			out["toFrom"] = ""
		elif String(aid["type"]) == "VOR":
			var aidd: Dictionary = aid
			var radial2 = true_to_mag(ne_bearing(aidd, pos), var_w)
			var d = ne_dist_nm(aidd, pos)
			if d > 40.0:
				out["flag"] = "NO SIGNAL"
			else:
				var v2 = cdi_vor(radial2, float(av["crs"]))
				out["dots"] = v2["dots"]
				out["toFrom"] = v2["toFrom"]
				out["radial"] = radial2
				out["dme"] = d
			out["crs"] = av["crs"]
		else:
			if typeof(rwy) != TYPE_DICTIONARY:
				out["flag"] = "NO LOC"
			else:
				var rwyl: Dictionary = rwy
				var cl = FlightPhysics.rwyCoords(rwyl, float(pos["n"]), float(pos["e"]))
				var ant = float(rwyl["len"]) + 300.0
				var dist = ant - float(cl["along"])
				out["crs"] = true_to_mag(float(rwyl["trueHdg"]), var_w)
				if dist < 300.0 or dist > 35000.0 or absf(atan2(float(cl["cross"]), dist)) > 35.0 * DEG:
					out["flag"] = "NO LOC"
				else:
					out["dots"] = cdi_loc(atan2(float(cl["cross"]), dist) / DEG)
					out["toFrom"] = "TO"
					var hl = (_fin(o.get("altTrue")) - float(rwyl["elevFt"])) / 3.28084
					var d_gp2 = 300.0 - float(cl["along"])
					out["gsDots"] = gs_dots(atan2(hl, d_gp2) / DEG - 3.0) if d_gp2 > 200.0 else null
	var nrts: Array = []
	for x in nrst_list(av, pos, var_w):
		nrts.append(x["id"])
	av["_nrts"] = nrts
	return out
