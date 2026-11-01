class_name CadetTraffic
extends RefCounted

## CADET Godot port — Phase 3: 場周トラフィック (状態側)
## 原典: cadet/src/flight/traffic.js (214 行, 898fe8a) の忠実移植。
## Pure logic: 描画は持たない。poses は FLIGHT LAB world (n, e, y=m MSL, q) で返す。
## 同値検証: tools/gen_reference3c.mjs → test/reference3c.json を test/run_world.gd が照合。
##
## JS との対応:
##   trafficForDay(...)      -> static traffic_for_day({...})
##   trafficForTwinDay(...)  -> static traffic_for_twin_day({...})
##   circuitPose(t, ga, out) -> static circuit_pose(t, ga, out) (out を書き換えて返す)
##   CIRCUIT_S               -> static circuit_s()
##   createTraffic(P)        -> CadetTraffic.new() (P は FlightPhysics 固定: LAB_RWY / FT /
##                              rwyToNE / qFromHPB は原典でも FLIGHT LAB physics のもの)
##   sys.set(count,seed,opts)-> set_traffic(count, seed, opts)  opts: String '18' も可
##   sys.update(dt, player)  -> update(dt, player)  player は Dictionary か null
##   sys.poses / count / wake / t -> 同名メンバ

const VFR_KINDS := ["good", "crosswind", "pmWind", "southFlow"]
const R := 450.0
const PAT := 1055.0
const ELEV := 55.0
const RWY_TRUE := 354.0
const SEG_DOWNWIND := 4
const SEG_BASE := 5
const SEG_FINAL := 8
const ABEAM := 0.42
const KTMS := 0.514444

const TRAFFIC_CALLS := [
	{"short": "Archer 1SY", "spoken": "Archer One Sierra Yankee", "reg": "N731SY"},
	{"short": "Archer 5SY", "spoken": "Archer Five Sierra Yankee", "reg": "N735SY"},
	{"short": "Archer 9SY", "spoken": "Archer Niner Sierra Yankee", "reg": "N739SY"},
]
const TRAFFIC_TWIN := {"short": "Seminole 4SY", "spoken": "Seminole Four Sierra Yankee", "reg": "N454SY"}

static var _segs_cache: Array = []
static var _circuit_s_cache := -1.0

static func _segs() -> Array:
	if not _segs_cache.is_empty():
		return _segs_cache
	# [leg, line[4] or [], arc[3] or [], f, kt[2], alt[2], hold, pitch[2], bank]
	var raw := [
		["upwind", [250.0, 0.0, 1050.0, 0.0], [], 0.0, [62.0, 85.0], [ELEV, PAT], 0.15, [2.0, 8.0], 0.0],
		["crosswind", [], [1050.0, -450.0, 90.0], 0.0, [85.0, 90.0], [PAT, PAT], 0.0, [4.0, 1.0], -20.0],
		["crosswind", [1500.0, -450.0, 1500.0, -1150.0], [], 270.0, [90.0, 90.0], [PAT, PAT], 0.0, [1.0, 1.0], 0.0],
		["downwind", [], [1050.0, -1150.0, 0.0], 0.0, [90.0, 90.0], [PAT, PAT], 0.0, [1.0, 1.0], -20.0],
		["downwind", [1050.0, -1600.0, -1450.0, -1600.0], [], 180.0, [90.0, 82.0], [PAT, 880.0], 0.42, [1.0, -1.0], 0.0],
		["base", [], [-1450.0, -1150.0, -90.0], 0.0, [80.0, 78.0], [880.0, 840.0], 0.0, [-1.0, -1.0], -18.0],
		["base", [-1900.0, -1150.0, -1900.0, -450.0], [], 90.0, [75.0, 75.0], [840.0, 640.0], 0.0, [-2.0, -2.0], 0.0],
		["final", [], [-1450.0, -450.0, 180.0], 0.0, [70.0, 68.0], [640.0, 600.0], 0.0, [-2.0, -2.0], -15.0],
		["final", [-1450.0, 0.0, 250.0, 0.0], [], 0.0, [66.0, 60.0], [600.0, ELEV], 0.0, [-1.5, 4.0], 0.0],
	]
	var out: Array = []
	for s in raw:
		var line: Array = s[1]
		var len_: float
		if line.size() == 4:
			len_ = sqrt((float(line[2]) - float(line[0])) ** 2 + (float(line[3]) - float(line[1])) ** 2)
		else:
			len_ = R * PI / 2.0
		var kt: Array = s[4]
		out.append({
			"leg": s[0], "line": line, "arc": s[2], "f": float(s[3]), "kt": kt, "alt": s[5],
			"hold": float(s[6]), "pitch": s[7], "bank": float(s[8]),
			"len": len_, "dur": len_ / ((float(kt[0]) + float(kt[1])) / 2.0 * KTMS),
		})
	_segs_cache = out
	return out

static func circuit_s() -> float:
	if _circuit_s_cache > 0.0:
		return _circuit_s_cache
	var a := 0.0
	for s in _segs():
		a += float(s["dur"])
	_circuit_s_cache = a
	return a

# ---------------------------------------------------------------- JS bit helpers (uint32 / imul)
static func _mix(a: int) -> int:
	a &= 0xFFFFFFFF
	a = FlightPhysics._imul(a ^ (a >> 16), 0x45d9f3b)
	a = FlightPhysics._imul(a ^ (a >> 16), 0x45d9f3b)
	return (a ^ (a >> 16)) & 0xFFFFFFFF

static func _lerp(a: float, b: float, f: float) -> float:
	return a + (b - a) * f

static func _wrap360(d: float) -> float:
	return fposmod(d, 360.0)

static func _alt_at(s: Dictionary, f: float) -> float:
	var hold: float = float(s["hold"])
	var alt: Array = s["alt"]
	if hold != 0.0 and f < hold:
		return float(alt[0])
	return _lerp(float(alt[0]), float(alt[1]), (f - hold) / (1.0 - hold) if hold != 0.0 else f)

# ---------------------------------------------------------------- the day's traffic
static func traffic_for_day(d: Dictionary = {}) -> int:
	var seed_: int = int(d.get("seed", 0))
	var kind: String = String(d.get("kind", ""))
	var chapter: String = String(d.get("chapter", ""))
	var weather: String = String(d.get("weather", ""))
	var slot: String = String(d.get("slot", ""))
	if kind != "flight":
		return 0
	if chapter != "ch2" and chapter != "ch3" and chapter != "ch4":
		return 0
	var vfr: bool = VFR_KINDS.has(weather) or ((weather == "amFog" or weather == "amLowCloud") and slot == "pm")
	if not vfr:
		return 0
	var h := _mix(seed_ & 0xFFFFFFFF)
	if h % 10 < 3:
		return 0
	return 1 + ((h >> 4) % 3)

static func traffic_for_twin_day(d: Dictionary = {}) -> int:
	var seed_: int = int(d.get("seed", 0))
	var kind: String = String(d.get("kind", ""))
	var chapter: String = String(d.get("chapter", ""))
	var weather: String = String(d.get("weather", ""))
	var slot: String = String(d.get("slot", ""))
	if kind != "flight" or chapter != "ch5":
		return 0
	var vfr: bool = VFR_KINDS.has(weather) or ((weather == "amFog" or weather == "amLowCloud") and slot == "pm")
	if not vfr:
		return 0
	return 1 if _mix(seed_ & 0xFFFFFFFF) % 2 == 0 else 0

# ---------------------------------------------------------------- the circuit pose
static func circuit_pose(t: float, ga: bool = false, out: Dictionary = {}) -> Dictionary:
	var segs := _segs()
	var cs := circuit_s()
	var x := fposmod(fposmod(t, cs) + cs, cs)
	var i := 0
	while i < segs.size() - 1 and x >= float(segs[i]["dur"]):
		x -= float(segs[i]["dur"])
		i += 1
	var s: Dictionary = segs[i]
	var f: float = minf(1.0, x / float(s["dur"]))
	out["seg"] = i
	out["frac"] = f
	out["leg"] = s["leg"]
	out["bank"] = float(s["bank"])
	var kt: Array = s["kt"]
	out["kt"] = _lerp(float(kt[0]), float(kt[1]), f)
	var line: Array = s["line"]
	if line.size() == 4:
		out["along"] = _lerp(float(line[0]), float(line[2]), f)
		out["cross"] = _lerp(float(line[1]), float(line[3]), f)
		out["hdgTrue"] = _wrap360(float(s["f"]) + RWY_TRUE)
	else:
		var arc: Array = s["arc"]
		var phi := (float(arc[2]) - 90.0 * f) * PI / 180.0
		out["along"] = float(arc[0]) + R * cos(phi)
		out["cross"] = float(arc[1]) + R * sin(phi)
		out["hdgTrue"] = _wrap360(float(arc[2]) - 90.0 * f - 90.0 + RWY_TRUE)
	out["altFt"] = _alt_at(s, f)
	var pitch: Array = s["pitch"]
	out["pitch"] = _lerp(float(pitch[0]), float(pitch[1]), f)
	if ga and i == SEG_FINAL:
		out["altFt"] = _lerp(600.0, 215.0, f / 0.82) if f < 0.82 else _lerp(215.0, 430.0, (f - 0.82) / 0.18)
		if f >= 0.7:
			out["pitch"] = 7.0
	elif ga and i == 0:
		out["altFt"] = _lerp(430.0, PAT, f)
	return out

# ---------------------------------------------------------------- the traffic itself
var count := 0
var t := 0.0
var poses: Array = []
var wake := 0.0

var _seed := -1
var _twin := false
var _rand = null # FlightPhysics.Rng (untyped: inner class)
var _ac: Array = []
var _pending: Array = []
var _rwy := "36"

func set_traffic(cnt: int, sd: int, opts: Variant = {}) -> void:
	var tw: bool = bool(opts.get("twin", false)) if opts is Dictionary else false
	var runway: String = opts if opts is String else (String(opts.get("runway", "36")) if opts is Dictionary else "36")
	if cnt == count and sd == _seed and tw == _twin and runway == _rwy:
		return
	count = cnt
	_seed = sd
	_twin = tw
	_rwy = runway
	var su: int = sd & 0xFFFFFFFF
	_rand = FlightPhysics.Rng.new(su if su != 0 else 1)
	_ac = []
	_pending = []
	poses.clear()
	for i in range(cnt):
		var cs: Dictionary = TRAFFIC_TWIN if (tw and i == 0) else TRAFFIC_CALLS[i % TRAFFIC_CALLS.size()]
		_ac.append({
			"cs": cs, "off": circuit_s() * float(i) / maxf(1.0, float(cnt)) + (_rand.next() - 0.5) * 24.0,
			"cycle": -1, "ga": false, "gaSaid": false, "prevSeg": -1, "prevFrac": 0.0,
			"delay": 0.0, "extSaid": false, "seqSaid": false, "gaIns": false, "lastNear": -1e9,
		})
		poses.append({"n": 0.0, "e": 0.0, "y": 0.0, "q": [0.0, 0.0, 0.0, 1.0]})

func _call(evs: Array, name_: String, en: String, say: String, kind: String = "") -> void:
	if kind != "":
		evs.append({"name": name_, "en": en, "say": say, "kind": kind})
	else:
		evs.append({"name": name_, "en": en, "say": say})

func update(dt: float, player: Variant = null) -> Array:
	var evs: Array = []
	if _ac.is_empty():
		wake = 0.0
		return evs
	dt = maxf(0.0, dt)
	t += dt
	var pi := 0
	while pi < _pending.size():
		if float(_pending[pi]["at"]) <= t:
			evs.append(_pending[pi]["ev"])
			_pending.remove_at(pi)
		else:
			pi += 1
	var has_player: bool = player is Dictionary
	var p_along := 0.0
	var p_cross := 0.0
	var p_alt := 0.0
	if has_player:
		p_along = float(player.get("along", 0.0))
		p_cross = float(player.get("cross", 0.0))
		p_alt = float(player.get("altFt", 0.0))
	var p_on_rwy: bool = has_player and p_alt < ELEV + 25.0 and p_along > -200.0 and p_along < 1400.0 and absf(p_cross) < 30.0
	var p_on_final: bool = has_player and absf(p_cross) < 150.0 and p_along < -250.0 and p_alt < 750.0
	var p_call: String = String(player.get("call", "Archer 8SY")) if has_player else "Archer 8SY"
	var p_spoken: String = String(player.get("spoken", "Archer Eight Sierra Yankee")) if has_player else "Archer Eight Sierra Yankee"
	var wake_want := 0.0
	var pose: Dictionary = {}
	var cs_total := circuit_s()
	for i in range(_ac.size()):
		var a: Dictionary = _ac[i]
		var csc: Dictionary = a["cs"]
		var cs_short: String = csc["short"]
		var cs_spoken: String = csc["spoken"]
		if has_player and dt > 0.0:
			circuit_pose(fposmod(fposmod(t + float(a["off"]) - float(a["delay"]), cs_total) + cs_total, cs_total), bool(a["ga"]), pose)
			var mine: bool = int(pose["seg"]) == SEG_DOWNWIND or int(pose["seg"]) == SEG_BASE
			if mine and p_on_final and float(a["delay"]) < 45.0:
				a["delay"] = float(a["delay"]) + dt
				if not bool(a["extSaid"]):
					a["extSaid"] = true
					_call(evs, cs_short, "LAB Tower, %s, extending downwind for spacing." % cs_short, "LAB Tower, %s, extending downwind for spacing." % cs_spoken)
		var lt: float = t + float(a["off"]) - float(a["delay"])
		var cyc: int = int(floor(lt / cs_total))
		if cyc != int(a["cycle"]):
			a["cycle"] = cyc
			a["ga"] = _rand.next() < 0.18
			a["gaSaid"] = false
			a["delay"] = 0.0
			a["extSaid"] = false
			a["seqSaid"] = false
			a["gaIns"] = false
		circuit_pose(lt - float(cyc) * cs_total, bool(a["ga"]), pose)
		if has_player and int(pose["seg"]) == SEG_FINAL and p_on_rwy and not bool(a["ga"]):
			a["ga"] = true
			circuit_pose(lt - float(cyc) * cs_total, true, pose)
			if not bool(a["gaSaid"]):
				a["gaSaid"] = true
				_call(evs, cs_short, "LAB Tower, %s, going around, traffic on the runway." % cs_short, "LAB Tower, %s, going around, traffic on the runway." % cs_spoken, "trafficGoAround")
		if has_player:
			if int(pose["seg"]) == SEG_FINAL and p_on_final:
				var gap: float = float(pose["along"]) - p_along
				if gap > 0.0 and not bool(a["seqSaid"]):
					a["seqSaid"] = true
					_call(evs, "管制塔", "%s, LAB Tower, number two, follow %s on final, runway %s, cleared to land." % [p_call, cs_short, _rwy], "%s, LAB Tower, number two, follow %s on final, runway %s, cleared to land." % [p_spoken, cs_spoken, _rwy], "sequence")
				elif gap < 0.0 and gap > -1100.0 and not bool(a["seqSaid"]):
					a["seqSaid"] = true
					# 原典の say 側も cs.short のまま (spoken でない) — 忠実移植のためそのまま
					_call(evs, "管制塔", "%s, LAB Tower, number two, follow the traffic on final ahead." % cs_short, "%s, LAB Tower, number two, follow the traffic on final ahead." % cs_short, "sequence")
				if gap > 0.0 and gap < 450.0 and p_alt > ELEV + 60.0 and not bool(a["gaIns"]):
					a["gaIns"] = true
					_call(evs, "管制塔", "%s, LAB Tower, go around, traffic ahead on final." % p_call, "%s, LAB Tower, go around, traffic ahead on final." % p_spoken, "playerGoAround")
				if gap > 0.0 and gap < 200.0 and p_alt <= float(pose["altFt"]) + 100.0 and p_alt >= float(pose["altFt"]) - 220.0:
					wake_want = 1.0
			var d_along: float = float(pose["along"]) - p_along
			var d_cross: float = float(pose["cross"]) - p_cross
			var d_alt: float = (float(pose["altFt"]) - p_alt) * 0.3048
			var d3: float = sqrt(d_along * d_along + d_cross * d_cross + d_alt * d_alt)
			if d3 < 150.0 and t - float(a["lastNear"]) > 60.0:
				a["lastNear"] = t
				evs.append({"kind": "nearMiss", "with": cs_short, "dist": int(round(d3))})
		if _rwy == "18":
			pose["along"] = 1200.0 - float(pose["along"])
			pose["cross"] = -float(pose["cross"])
			pose["hdgTrue"] = _wrap360(float(pose["hdgTrue"]) + 180.0)
		if int(pose["seg"]) == SEG_DOWNWIND and int(a["prevSeg"]) == SEG_DOWNWIND and float(a["prevFrac"]) < ABEAM and float(pose["frac"]) >= ABEAM:
			_call(evs, cs_short, "LAB Tower, %s, abeam, left downwind runway %s, touch and go." % [cs_short, _rwy], "LAB Tower, %s, abeam, left downwind runway %s, touch and go." % [cs_spoken, _rwy])
		if int(pose["seg"]) == SEG_BASE and int(a["prevSeg"]) != SEG_BASE and int(a["prevSeg"]) != -1:
			var extra: String = ", traffic on final in sight" if (has_player and p_on_final) else ""
			_call(evs, cs_short, "LAB Tower, %s, turning base, runway %s%s." % [cs_short, _rwy, extra], "LAB Tower, %s, turning base, runway %s%s." % [cs_spoken, _rwy, extra])
		if int(pose["seg"]) == SEG_FINAL and int(a["prevSeg"]) != SEG_FINAL:
			_call(evs, cs_short, "LAB Tower, %s, final runway %s, touch and go." % [cs_short, _rwy], "LAB Tower, %s, final runway %s, touch and go." % [cs_spoken, _rwy])
			_pending.append({"at": t + 2.4, "ev": {"name": "管制塔", "en": "%s, LAB Tower, runway %s, cleared touch and go." % [cs_short, _rwy], "say": "%s, LAB Tower, runway %s, cleared touch and go." % [cs_spoken, _rwy]}})
		if bool(a["ga"]) and int(pose["seg"]) == SEG_FINAL and float(pose["frac"]) >= 0.8 and not bool(a["gaSaid"]):
			a["gaSaid"] = true
			_call(evs, cs_short, "LAB Tower, %s, going around." % cs_short, "LAB Tower, %s, going around." % cs_spoken)
		a["prevSeg"] = int(pose["seg"])
		a["prevFrac"] = float(pose["frac"])
		var p: Dictionary = poses[i]
		var ne: Array = FlightPhysics.rwyToNE(FlightPhysics.lab_rwy(), float(pose["along"]), float(pose["cross"]))
		var q: Array = FlightPhysics.qFromHPB(float(pose["hdgTrue"]), float(pose["pitch"]), float(pose["bank"]))
		p["n"] = float(ne[0])
		p["e"] = float(ne[1])
		p["y"] = float(pose["altFt"]) / FlightPhysics.FT
		var pq: Array = p["q"]
		pq[0] = float(q[0]); pq[1] = float(q[1]); pq[2] = float(q[2]); pq[3] = float(q[3])
		p["q"] = pq
	wake += (wake_want - wake) * minf(1.0, dt * 1.5)
	if wake < 0.01 and wake_want == 0.0:
		wake = 0.0
	return evs
