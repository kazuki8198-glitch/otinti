class_name CadetAnalysis
extends RefCounted
# Port of cadet/src/flight/analysis.js (HTML CADET @ 898fe8a) — standards analysis over
# 10 Hz recorder samples: maneuver scoring vs ACS-style tolerances, the 500 ft stabilised
# gate, landing analysis, logbook compaction/history/stats, sparklines.
# Pure logic. Samples are Dictionaries { t, n, e, alt, h, q [x,y,z,w], ias, vs, gs, flap,
# gear, onGround }. NOTE: scoreWindow targets take constant values here (the JS also
# allows v as a function of the sample index — used by no caller in analyzeRecording;
# flagged in PHASE1-REPORT).

const FT := 3.28084
const FIELD_ELEV_FT := 55.0
const RWY := { "n": 0.0, "e": -40000.0, "trueHdg": 354.0, "len": 1200.0, "wid": 30.0 }
const MAGVAR_W := 6.0
const AIM_ALONG := 300.0
const TD_ZONE := { "from": 200.0, "to": 700.0 }
const GATE_AGL_FT := 500.0
const TOL := { "spd": 10.0, "alt": 100.0, "hdg": 10.0, "bank": 5.0, "gp": 0.9, "cl": 30.0 }
const LABEL := { "spd": ["速度", "kt"], "alt": ["高度", "ft"], "hdg": ["針路", "°"], "abank": ["バンク", "°"], "gp": ["進入角", "°"], "cl": ["センターライン", "m"] }

static func _clamp(v: float, a: float, b: float) -> float:
	return a if v < a else b if v > b else v
static func _w360(a: float) -> float:
	return fmod(fmod(a, 360.0) + 360.0, 360.0)
static func _w180(a: float) -> float:
	return fmod(fmod(a, 360.0) + 540.0, 360.0) - 180.0
static func _r1(v: float) -> float:
	return floorf(v * 10.0 + 0.5) / 10.0
static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))
static func _numf(x, dflt: float = 0.0) -> float:
	return float(x) if typeof(x) == TYPE_INT or typeof(x) == TYPE_FLOAT else dflt
static func _finite(x) -> bool:
	return (typeof(x) == TYPE_INT or typeof(x) == TYPE_FLOAT) and not is_nan(float(x)) and not is_inf(float(x))

static func rwy_coords(n: float, e: float) -> Dictionary:
	var h = RWY["trueHdg"] * PI / 180.0
	var dn = n - RWY["n"]
	var de = e - RWY["e"]
	return { "along": dn * cos(h) + de * sin(h), "cross": -dn * sin(h) + de * cos(h) }

static func _qrot(q: Array, v: Array) -> Array:
	var x = float(q[0])
	var y = float(q[1])
	var z = float(q[2])
	var w = float(q[3])
	var vx = float(v[0])
	var vy = float(v[1])
	var vz = float(v[2])
	var tx = 2.0 * (y * vz - z * vy)
	var ty = 2.0 * (z * vx - x * vz)
	var tz = 2.0 * (x * vy - y * vx)
	return [vx + w * tx + (y * tz - z * ty), vy + w * ty + (z * tx - x * tz), vz + w * tz + (x * ty - y * tx)]

static func att_of(x: Dictionary) -> Dictionary:
	var q = x.get("q")
	if typeof(q) != TYPE_ARRAY or q.size() < 4:
		q = [0, 0, 0, 1]
	var f = _qrot(q, [0, 0, -1])
	var r = _qrot(q, [1, 0, 0])
	var up = _qrot(q, [0, 1, 0])
	var hdg_t = _w360(rad_to_deg(atan2(f[0], -f[2])))
	return { "hdgT": hdg_t, "hdg": _w360(hdg_t + MAGVAR_W), "pitch": rad_to_deg(asin(_clamp(f[1], -1.0, 1.0))), "bank": rad_to_deg(atan2(-r[1], up[1])) }

static func alt_ft_of(x) -> float:
	if typeof(x) == TYPE_DICTIONARY and _numf(x.get("alt")) > 0.0:
		return _numf(x.get("alt"))
	if typeof(x) == TYPE_DICTIONARY:
		return _numf(x.get("h")) * FT
	return 0.0

static func agl_ft_of(x) -> float:
	return alt_ft_of(x) - FIELD_ELEV_FT

static func vs_at(xs: Array, i: int) -> float:
	if i < 0 or i >= xs.size():
		return 0.0
	var x = xs[i]
	var a = i
	var b = i
	while a > 0 and float(x["t"]) - float(xs[a]["t"]) < 0.5:
		a -= 1
	while b < xs.size() - 1 and float(xs[b]["t"]) - float(x["t"]) < 0.5:
		b += 1
	var dt = float(xs[b]["t"]) - float(xs[a]["t"])
	if dt > 0.05 and b > a:
		return (alt_ft_of(xs[b]) - alt_ft_of(xs[a])) / dt * 60.0
	return _numf(x.get("vs"))

static func gp_of(x: Dictionary) -> float:
	var rc = rwy_coords(_numf(x.get("n")), _numf(x.get("e")))
	return rad_to_deg(atan2(maxf(agl_ft_of(x) / FT, 0.0), AIM_ALONG - rc["along"])) if rc["along"] < AIM_ALONG - 50.0 else 3.0

static func _score_target(xs: Array, idx: Array, kind: String, spec: Dictionary, tol: float) -> Variant:
	var n = 0
	var in_t = 0
	var mx = 0.0
	var tv = _numf(spec.get("v"))
	for i in idx:
		var x = xs[i]
		var d = 0.0
		match kind:
			"spd": d = _numf(x.get("ias")) - tv
			"alt": d = alt_ft_of(x) - tv
			"hdg": d = _w180(float(att_of(x)["hdg"]) - tv)
			"abank": d = absf(float(att_of(x)["bank"])) - tv
			"gp": d = gp_of(x) - tv
			"cl": d = float(rwy_coords(_numf(x.get("n")), _numf(x.get("e")))["cross"]) - tv
		if not is_finite(d):
			continue
		n += 1
		if absf(d) <= tol:
			in_t += 1
		mx = maxf(mx, absf(d))
	if n == 0:
		return null
	var pct = float(in_t) / float(n)
	return { "tv": tv, "tol": tol, "pct": _js_round(pct * 100.0), "max": _r1(mx), "pass": pct >= 0.85 and mx <= tol * 1.6, "score": pct }

static func score_window(xs: Array, opts: Dictionary = {}) -> Variant:
	var name = String(opts.get("name", ""))
	var t0 = _numf(opts.get("t0"), -INF)
	var t1 = _numf(opts.get("t1"), INF)
	var targets = opts.get("targets", {})
	var idx: Array = []
	for i in xs.size():
		if float(xs[i]["t"]) >= t0 and float(xs[i]["t"]) <= t1:
			idx.append(i)
	if idx.size() < 5:
		return null
	var rows: Array = []
	for k in targets.keys():
		var spec = targets[k]
		if not _is(spec):
			continue
		var tol = _numf(spec.get("tol")) if spec.get("tol") != null else _numf(TOL.get(k))
		var q = _score_target(xs, idx, String(k), spec, tol)
		if q == null:
			continue
		var lab = LABEL.get(k, [String(k), ""])
		rows.append({ "key": k, "name": lab[0], "val": "%d%% が基準内（最大のずれ %s %s）" % [int(q["pct"]), _fmt_num(float(q["max"])), lab[1]], "std": "±%s %s" % [_fmt_num(tol), lab[1]], "pass": q["pass"], "score": q["score"], "pct": q["pct"], "max": q["max"], "tol": tol })
	if rows.is_empty():
		return null
	var sc = 0.0
	for r in rows:
		sc += float(r["score"])
	sc /= rows.size()
	return { "name": name, "t0": xs[idx[0]]["t"], "t1": xs[idx[idx.size() - 1]]["t"], "rows": rows, "score": _js_round(sc * 100.0) / 100.0, "pass": rows.all(func(r): return bool(r["pass"])) }

static func _is(o) -> bool:
	return typeof(o) == TYPE_DICTIONARY

# JS number->string for the values that reach display strings (integers without a decimal point)
static func _fmt_num(v: float) -> String:
	if v == floorf(v) and absf(v) < 1e15:
		return str(int(v))
	return str(v)

static func _median(v: Array) -> float:
	if v.is_empty():
		return 0.0
	var a = v.duplicate()
	a.sort()
	return float(a[a.size() / 2])

static func _circ_median_deg(v: Array) -> float:
	if v.is_empty():
		return 0.0
	var ref = float(v[0])
	var u: Array = []
	for x in v:
		u.append(ref + _w180(float(x) - ref))
	return _w360(_median(u))

static func find_maneuvers(xs: Array, opts: Dictionary = {}) -> Array:
	var out: Array = []
	if xs.size() < 50:
		return out
	var min_level = int(_numf(opts.get("minLevelSec"), 12.0)) * 10
	var min_turn = int(_numf(opts.get("minTurnSec"), 8.0)) * 10
	var run = null  # { kind, from, sign }
	for i in xs.size():
		var x = xs[i]
		var air = not bool(x.get("onGround", false)) and agl_ft_of(x) > 30.0
		var bank = float(att_of(x)["bank"])
		var vs = vs_at(xs, i)
		var kind = null
		if air:
			kind = "turn" if absf(bank) >= 15.0 else "level" if absf(bank) <= 12.0 and absf(vs) <= 250.0 else null
		var sign = 1 if bank >= 0.0 else -1
		if run == null or run["kind"] != kind or (kind == "turn" and int(run["sign"]) != sign):
			_flush_maneuver(xs, run, i - 1, min_level, min_turn, out)
			run = { "kind": kind, "from": i, "sign": sign } if kind != null else null
	_flush_maneuver(xs, run, xs.size() - 1, min_level, min_turn, out)
	return out.slice(0, 6)

static func _flush_maneuver(xs: Array, run, to: int, min_level: int, min_turn: int, out: Array) -> void:
	if run == null:
		return
	var idx: Array = []
	for i in range(int(run["from"]), to + 1):
		idx.append(i)
	if run["kind"] == "level" and idx.size() >= min_level:
		var alts: Array = []
		var hdgs: Array = []
		var spds: Array = []
		for i in idx:
			alts.append(alt_ft_of(xs[i]))
			hdgs.append(float(att_of(xs[i])["hdg"]))
			spds.append(_numf(xs[i].get("ias")))
		var alt_t = float(_js_round(_median(alts) / 50.0) * 50)
		var hdg_t = float(_js_round(_circ_median_deg(hdgs)))
		var spd_t = float(_js_round(_median(spds)))
		var w = score_window(xs, { "name": "直線水平（保持）", "t0": xs[run["from"]]["t"], "t1": xs[to]["t"], "targets": { "alt": { "v": alt_t, "tol": TOL["alt"] }, "hdg": { "v": hdg_t, "tol": TOL["hdg"] }, "spd": { "v": spd_t, "tol": TOL["spd"] } } })
		if w != null:
			out.append(w)
	elif run["kind"] == "turn" and idx.size() >= min_turn:
		var alts2: Array = []
		var banks: Array = []
		for i in idx:
			alts2.append(alt_ft_of(xs[i]))
			banks.append(absf(float(att_of(xs[i])["bank"])))
		var alt_t2 = float(_js_round(_median(alts2) / 50.0) * 50)
		var bank_t = float(_js_round(_median(banks)))
		var w2 = score_window(xs, { "name": "右旋回（保持）" if int(run["sign"]) > 0 else "左旋回（保持）", "t0": xs[run["from"]]["t"], "t1": xs[to]["t"], "targets": { "alt": { "v": alt_t2, "tol": TOL["alt"] }, "abank": { "v": bank_t, "tol": TOL["bank"] } } })
		if w2 != null:
			out.append(w2)

static func gate_at(xs: Array, before: int, opts: Dictionary = {}) -> Variant:
	var vref = _numf(opts.get("vref"), 70.0)
	if opts.get("vref") == null:
		vref = 70.0
	var flap_min = _numf(opts.get("flapMinDeg"), 25.0)
	if opts.get("flapMinDeg") == null:
		flap_min = 25.0
	var g = -1
	var i = mini(before, xs.size() - 1)
	while i > 0:
		if agl_ft_of(xs[i]) <= GATE_AGL_FT and agl_ft_of(xs[i - 1]) > GATE_AGL_FT and not bool(xs[i].get("onGround", false)):
			g = i
			break
		if bool(xs[i].get("onGround", false)) and i < before:
			break
		if agl_ft_of(xs[i]) > 1500.0:
			break
		i -= 1
	if g < 0:
		return null
	var x = xs[g]
	var rc = rwy_coords(_numf(x.get("n")), _numf(x.get("e")))
	var vs = vs_at(xs, g)
	var gp = gp_of(x)
	var spd_dev = _numf(x.get("ias")) - vref
	var gear_req = bool(opts.get("gearRequired", false))
	var gear_v = _r1(_numf(x.get("gear"), 1.0)) if x.get("gear") != null else 1.0
	var el = {
		"spd": { "v": _r1(_numf(x.get("ias"))), "dev": _r1(spd_dev), "pass": absf(spd_dev) <= TOL["spd"] },
		"gp": { "v": _r1(gp), "dev": _r1(gp - 3.0), "pass": absf(gp - 3.0) <= TOL["gp"] },
		"vs": { "v": _js_round(vs), "pass": vs <= -200.0 and vs >= -1000.0 },
		"flap": { "v": _js_round(_numf(x.get("flap"))), "pass": _numf(x.get("flap")) >= flap_min },
		"gear": { "v": gear_v, "pass": (_numf(x.get("gear"), 1.0) if x.get("gear") != null else 1.0) >= 0.98 } if gear_req else { "v": null, "pass": true },
		"cross": { "v": _r1(float(rc["cross"])) },
	}
	var out = { "t": x["t"], "agl": _js_round(agl_ft_of(x)), "along": _js_round(float(rc["along"])) }
	for k in el.keys():
		out[k] = el[k]
	out["stable"] = bool(el["spd"]["pass"]) and bool(el["gp"]["pass"]) and bool(el["vs"]["pass"]) and bool(el["flap"]["pass"]) and bool(el["gear"]["pass"])
	return out

static func find_landings(xs: Array, opts: Dictionary = {}) -> Array:
	var out: Array = []
	if xs.is_empty():
		return out
	var air_max = 0.0
	var was_air = false
	for i in range(1, xs.size()):
		var x = xs[i]
		var air = not bool(x.get("onGround", false)) and agl_ft_of(x) > 20.0
		if air:
			air_max = maxf(air_max, agl_ft_of(x))
			was_air = true
			continue
		if bool(x.get("onGround", false)) and was_air:
			if air_max > 100.0:
				var rc = rwy_coords(_numf(x.get("n")), _numf(x.get("e")))
				var float_m = null
				var j = i - 1
				while j >= 0:
					if agl_ft_of(xs[j]) >= 50.0:
						float_m = maxf(0.0, float(rc["along"]) - float(rwy_coords(_numf(xs[j].get("n")), _numf(xs[j].get("e")))["along"]))
						break
					if bool(xs[j].get("onGround", false)):
						break
					j -= 1
				var jj = i - 1
				while jj > 0 and float(xs[i - 1]["t"]) - float(xs[jj]["t"]) < 1.0:
					jj -= 1
				var dt_s = float(xs[i - 1]["t"]) - float(xs[jj]["t"])
				var sink = (alt_ft_of(xs[jj]) - alt_ft_of(xs[i - 1])) / dt_s * 60.0 if dt_s > 0.2 else -vs_at(xs, i - 1)
				out.append({ "t": x["t"], "i": i, "along": _js_round(float(rc["along"])), "cross": _r1(float(rc["cross"])), "sinkFpm": _js_round(sink), "ias": _r1(_numf(x.get("ias"))), "gs": _r1(_numf(x.get("gs"))),
					"floatM": _js_round(float(float_m)) if float_m != null else null, "devAim": _js_round(float(rc["along"]) - AIM_ALONG), "inZone": float(rc["along"]) >= TD_ZONE["from"] and float(rc["along"]) <= TD_ZONE["to"],
					"onRunway": float(rc["along"]) >= 0.0 and float(rc["along"]) <= RWY["len"] and absf(float(rc["cross"])) <= RWY["wid"] / 2.0, "bounces": 0, "gate": gate_at(xs, i, opts) })
			was_air = false
			air_max = 0.0
		if bool(x.get("onGround", false)):
			air_max = 0.0
	for k in out.size():
		var hops = 0
		var up = 0.0
		var i2 = int(out[k]["i"]) + 1
		while i2 < xs.size() and float(xs[i2]["t"]) - float(out[k]["t"]) < 20.0:
			if not bool(xs[i2].get("onGround", false)):
				up = maxf(up, agl_ft_of(xs[i2]))
			elif up > 3.0:
				hops += 1
				up = 0.0
			i2 += 1
		out[k]["bounces"] = hops
	return out

static func analyze_recording(rec, opts: Dictionary = {}) -> Variant:
	if not _is(rec):
		return null
	var xs = rec.get("samples")
	if typeof(xs) != TYPE_ARRAY or xs.is_empty():
		return null
	var landings = find_landings(xs, opts)
	var maneuvers = find_maneuvers(xs, opts)
	if not landings.is_empty():
		var td = landings[landings.size() - 1]
		var vref = _numf(opts.get("vref"), 70.0)
		if opts.get("vref") == null:
			vref = 70.0
		var w = score_window(xs, { "name": "最終進入", "t0": maxf(0.0, float(td["t"]) - 90.0), "t1": td["t"], "targets": { "spd": { "v": vref, "tol": TOL["spd"] }, "gp": { "v": 3.0, "tol": TOL["gp"] }, "cl": { "v": 0.0, "tol": TOL["cl"] } } })
		if w != null:
			maneuvers.append(w)
	var gate = landings[landings.size() - 1]["gate"] if not landings.is_empty() else gate_at(xs, xs.size() - 1, opts)
	return { "v": 1, "samples": xs.size(), "dur": _r1(float(xs[xs.size() - 1]["t"]) - float(xs[0]["t"])), "maneuvers": maneuvers, "landings": landings, "gate": gate }

static func analysis_rows(a) -> Array:
	if not _is(a):
		return []
	var groups: Array = []
	if typeof(a.get("maneuvers")) == TYPE_ARRAY and not a["maneuvers"].is_empty():
		var rows: Array = []
		for m in a["maneuvers"]:
			for r in m["rows"]:
				var rr = (r as Dictionary).duplicate()
				rr["name"] = "%s：%s" % [m["name"], r["name"]]
				rows.append(rr)
		groups.append({ "step": "操縦標準（実技試験の公差）", "rows": rows })
	if a.get("gate") != null:
		var g = a["gate"]
		var grows: Array = [
			{ "name": "速度", "val": "%s kt（基準速度との差 %s%s kt）" % [_fmt_num(float(g["spd"]["v"])), "+" if float(g["spd"]["dev"]) >= 0.0 else "", _fmt_num(float(g["spd"]["dev"]))], "std": "基準速度 ±10 kt", "pass": g["spd"]["pass"] },
			{ "name": "グライドパス", "val": "%s°" % _fmt_num(float(g["gp"]["v"])), "std": "3 ±0.9°", "pass": g["gp"]["pass"] },
			{ "name": "降下率", "val": "%d fpm" % int(g["vs"]["v"]), "std": "−200 〜 −1,000 fpm", "pass": g["vs"]["pass"] },
			{ "name": "構成（フラップ）", "val": "%d°" % int(g["flap"]["v"]), "std": "着陸フラップ", "pass": g["flap"]["pass"] },
		]
		if g["gear"]["v"] != null:
			grows.append({ "name": "構成（ギア）", "val": "DOWN" if float(g["gear"]["v"]) >= 0.98 else "未降下", "std": "DOWN", "pass": g["gear"]["pass"] })
		grows.append({ "name": "ゲート判定", "val": "STABLE（安定）" if g["stable"] else "UNSTABLE（不安定：ゴーアラウンド相当）", "std": "全要素が基準内", "pass": g["stable"] })
		groups.append({ "step": "安定進入ゲート（500 ft AGL）", "rows": grows })
	if typeof(a.get("landings")) == TYPE_ARRAY and not a["landings"].is_empty():
		var lrows: Array = []
		for li in a["landings"].size():
			var L = a["landings"][li]
			var v = "滑走路端から %d m（目標点 %d m との差 %s%d m）・沈下 %d fpm・センターライン %s%s m・フロート %s" % [int(L["along"]), int(AIM_ALONG), "+" if int(L["devAim"]) >= 0 else "", int(L["devAim"]), int(L["sinkFpm"]), "+" if float(L["cross"]) >= 0.0 else "", _fmt_num(float(L["cross"])), "—" if L["floatM"] == null else "%d m" % int(L["floatM"])]
			if int(L["bounces"]) > 0:
				v += "・バウンド %d" % int(L["bounces"])
			lrows.append({ "name": "接地 %d" % (li + 1), "val": v, "std": "接地帯 %d〜%d m・沈下 300 fpm 以下" % [int(TD_ZONE["from"]), int(TD_ZONE["to"])], "pass": bool(L["inZone"]) and int(L["sinkFpm"]) <= 300 })
		groups.append({ "step": "着陸分析", "rows": lrows })
	return groups

static func _num(v, lo: float, hi: float) -> Variant:
	return _clamp(floorf(_numf(v) * 10.0 + 0.5) / 10.0, lo, hi) if _finite(v) else null

static func compact_analysis(a) -> Variant:
	if not _is(a):
		return null
	var L = a["landings"][a["landings"].size() - 1] if typeof(a.get("landings")) == TYPE_ARRAY and not a["landings"].is_empty() else null
	var g = a.get("gate")
	var man: Array = []
	if typeof(a.get("maneuvers")) == TYPE_ARRAY:
		for m in a["maneuvers"].slice(0, 6):
			man.append({ "name": String(m.get("name", "")).substr(0, 20), "score": _num(m.get("score"), 0.0, 1.0) })
	return {
		"td": { "along": _num(L["along"], -2000.0, 4000.0), "cross": _num(L["cross"], -500.0, 500.0), "sink": _num(L["sinkFpm"], -2000.0, 3000.0), "float": _num(L["floatM"], 0.0, 4000.0) if L["floatM"] != null else null, "zone": bool(L["inZone"]) } if L != null else null,
		"gate": { "stable": bool(g["stable"]), "ias": _num(g["spd"]["v"], 0.0, 300.0), "gp": _num(g["gp"]["v"], 0.0, 15.0), "vs": _num(g["vs"]["v"], -3000.0, 1000.0) } if _is(g) else null,
		"man": man,
	}

static func clean_analysis(a) -> Variant:
	if not _is(a):
		return null
	var td_raw = null
	if _is(a.get("td")):
		td_raw = { "along": _num(a["td"].get("along"), -2000.0, 4000.0), "cross": _num(a["td"].get("cross"), -500.0, 500.0), "sink": _num(a["td"].get("sink"), -2000.0, 3000.0), "float": _num(a["td"].get("float"), 0.0, 4000.0) if a["td"].get("float") != null else null, "zone": bool(a["td"].get("zone", false)) }
	var td = td_raw if td_raw != null and (td_raw["along"] != null or td_raw["sink"] != null) else null
	var gate = null
	if _is(a.get("gate")):
		gate = { "stable": bool(a["gate"].get("stable", false)), "ias": _num(a["gate"].get("ias"), 0.0, 300.0), "gp": _num(a["gate"].get("gp"), 0.0, 15.0), "vs": _num(a["gate"].get("vs"), -3000.0, 1000.0) }
	var man: Array = []
	if typeof(a.get("man")) == TYPE_ARRAY:
		for m in a["man"].slice(0, 6):
			var nm = String(m.get("name", "")).substr(0, 20) if _is(m) else ""
			var en = { "name": nm, "score": _num(m.get("score"), 0.0, 1.0) if _is(m) else null }
			if not nm.is_empty():
				man.append(en)
	if td == null and gate == null and man.is_empty():
		return null
	return { "td": td, "gate": gate, "man": man }

static func landing_history(entries: Array) -> Array:
	var out: Array = []
	for e in entries:
		if not _is(e):
			continue
		for l in e.get("lessons", []):
			if _is(l) and _is(l.get("ana")) and l["ana"].get("td") != null:
				var en = { "date": String(e.get("date", "")), "lesson": String(l.get("id", "")) }
				for k in l["ana"]["td"].keys():
					en[k] = l["ana"]["td"][k]
				en["gate"] = l["ana"].get("gate")
				out.append(en)
	return out

static func landing_stats(list: Array) -> Variant:
	var xs: Array = []
	for x in list:
		if _is(x) and _finite(x.get("along")):
			xs.append(x)
	if xs.is_empty():
		return null
	var mean = func(f: Callable) -> float:
		var s = 0.0
		for x in xs:
			s += float(f.call(x))
		return s / xs.size()
	var along_mean = mean.call(func(x): return _numf(x.get("along")))
	var var_sum = 0.0
	for x in xs:
		var_sum += pow(_numf(x.get("along")) - along_mean, 2.0)
	var sd = sqrt(var_sum / xs.size())
	var gates: Array = []
	for x in xs:
		if x.get("gate") != null:
			gates.append(x)
	var sink_max = -INF
	for x in xs:
		sink_max = maxf(sink_max, _numf(x.get("sink")))
	var in_zone = 0
	for x in xs:
		if bool(x.get("zone", false)):
			in_zone += 1
	var gate_stable = 0
	for x in gates:
		if bool(x["gate"].get("stable", false)):
			gate_stable += 1
	return { "n": xs.size(), "alongMean": _js_round(along_mean), "alongSd": _js_round(sd), "sinkMean": _js_round(mean.call(func(x): return _numf(x.get("sink")))), "sinkMax": _js_round(sink_max),
		"crossAbsMean": _r1(mean.call(func(x): return absf(_numf(x.get("cross"))))), "floatMean": _js_round(mean.call(func(x): return _numf(x.get("float")))), "inZonePct": _js_round(float(in_zone) / xs.size() * 100.0),
		"gateStablePct": _js_round(float(gate_stable) / gates.size() * 100.0) if not gates.is_empty() else null }

static func sparkline(values: Array, opts: Dictionary = {}) -> String:
	var invert = bool(opts.get("invert", false))
	var vs: Array = []
	for v in values:
		if _finite(v):
			vs.append(float(v))
	if vs.is_empty():
		return ""
	var B = "▁▂▃▄▅▆▇█"
	var lo = INF
	var hi = -INF
	for v in vs:
		lo = minf(lo, v)
		hi = maxf(hi, v)
	if hi - lo < 1e-9:
		lo -= 0.5
		hi += 0.5
	var out = ""
	for v in vs:
		var idx = _clampi(_js_round(((hi - v) if invert else (v - lo)) / (hi - lo) * 7.0), 0, 7)
		out += B.substr(idx, 1)
	return out

static func _clampi(v: int, a: int, b: int) -> int:
	return a if v < a else b if v > b else v

static func is_finite(v: float) -> bool:
	return not is_nan(v) and not is_inf(v)
