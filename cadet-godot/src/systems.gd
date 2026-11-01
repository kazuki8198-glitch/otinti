class_name CadetSystems
extends RefCounted
# Port of cadet/src/aircraft/systems.js (HTML CADET @ 898fe8a) — engine start/run/stop,
# primer/flooding, starter heat, run-up drops, the two-stage electrical bus with load
# shedding, oil pressure/temperature mirrors, and the annunciator alert collection.
# The switches `sw` are a shared Dictionary (the cockpit's object): this class mutates it
# (the key's spring return to BOTH, the legacy master mirror). `s` is a FlightPhysics
# state Dictionary. update(dt, s) returns the frame's events [{type, why}].

const MAG := ["OFF", "R", "L", "BOTH", "START"]
const RUNUP := { "rpm": 2000, "maxDrop": 175, "maxDiff": 50, "dropL": 120, "dropR": 95, "carb": 70 }
const CRANK_RPM := 150.0
const CATCH_RPM := 520.0
const STARTER_MAX := 8.0
const LINE_FUEL_S := 6.0
const COLD := { "master": false, "avionics": false, "fuelPump": false, "beacon": false, "nav": false, "strobe": false, "landing": false, "taxi": false, "pitot": false,
	"mag": "OFF", "fuelSel": "L", "mixture": 0.0, "carbHeat": false, "propCycleT": 0.0, "propCycled": false }
const RUNNING_SW := { "master": true, "avionics": true, "fuelPump": true, "beacon": true, "nav": true, "strobe": true, "landing": false, "taxi": false, "pitot": false,
	"mag": "BOTH", "fuelSel": "L", "mixture": 1.0, "carbHeat": false, "propCycleT": 0.0 }
const NOCATCH := {
	"fuel": "燃料が来ていません。燃料セレクターをタンクに。",
	"mixture": "ミクスチャーをフル リッチにしてからかけます。",
	"prime": "エンジンが冷えているので、プライマーを 2〜3 回押してからかけます。",
	"flooded": "プライマーの押しすぎで、燃料が多すぎます。スロットルを半分ほど開けて、もう一度かけます（かかったらすぐに戻す）。",
	"starter": "スターターは長く回し続けないようにします。少し待ってから、もう一度。",
	"hot": "スターターを回しすぎて、熱で回らなくなりました。1分ほど冷ましてから、もう一度かけます。",
}

var sw: Dictionary
var fault = null  # null or { dropL }
var st: Dictionary
var elec: Dictionary
var twin: Array
var hobbs := 471.2
var last_sel = null
var alerts_arr: Array = []
var events: Array = []

static func _clamp(x: float, a: float, b: float) -> float:
	return minf(b, maxf(a, x))
static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))

func _init(p_sw: Dictionary) -> void:
	sw = p_sw
	st = { "eng": "off", "dead": false, "crankT": 0.0, "catchAt": INF, "primes": 0, "warm": false, "rpm": 0.0, "lineT": LINE_FUEL_S, "oil": 0.0, "oilT": null, "starterTried": false, "reason": "", "crankHeat": 0.0, "crankLock": false, "crankHeld": 0.0, "oilQ": 7.0 }
	elec = { "batt": 1.0, "standby": 1.0, "volts": 12.6, "amps": 0, "altFail": false, "flat": false, "gen": 0, "load": 0, "batOn": false, "altOn": false, "shed": 0, "pfdOn": false, "mfdOn": false, "standbyOn": true }
	twin = [
		{ "eng": "off", "crankT": 0.0, "catchAt": INF, "rpm": 0.0, "oil": 0.0, "oilT": null, "crankHeat": 0.0, "crankLock": false, "crankHeld": 0.0, "oilQ": 8.0 },
		{ "eng": "off", "crankT": 0.0, "catchAt": INF, "rpm": 0.0, "oil": 0.0, "oilT": null, "crankHeat": 0.0, "crankLock": false, "crankHeld": 0.0, "oilQ": 8.0 },
	]

func _bat_on() -> bool:
	return bool(sw["bat"]) if sw.get("bat") != null else bool(sw.get("master", false))
func _alt_on() -> bool:
	return bool(sw["alt"]) if sw.get("alt") != null else bool(sw.get("master", false))

func _elec_update(dt: float, rpm_now: float, cranking: bool) -> void:
	var bat_on = _bat_on()
	var alt_on = _alt_on()
	if sw.get("bat") != null and sw.get("alt") != null:
		sw["master"] = bat_on or alt_on
	var gen = _clamp((rpm_now - 500.0) / 500.0, 0.0, 1.0) * 55.0 if alt_on and not bool(elec["altFail"]) else 0.0
	var on_bat = gen <= 1.0 and bat_on
	var shed = 1 if on_bat and float(elec["batt"]) < 0.45 else 0
	var load = 0.0
	if bool(sw.get("avionics", false)):
		load += 4.0 if shed else 9.0
	if bool(sw.get("beacon", false)):
		load += 2.0
	if bool(sw.get("nav", false)):
		load += 2.5
	if bool(sw.get("strobe", false)):
		load += 1.5
	if not shed:
		if bool(sw.get("landing", false)):
			load += 9.0
		if bool(sw.get("taxi", false)):
			load += 6.0
		if bool(sw.get("pitot", false)):
			load += 4.0
	if bool(sw.get("fuelPump", false)):
		load += 2.5
	if cranking:
		load += 65.0
	if not bat_on and not alt_on:
		load = 0.0
	var net = gen - load
	if not bat_on:
		net = 0.0
	if net > 0.0 and float(elec["batt"]) >= 1.0:
		net *= 0.06
	elec["batt"] = _clamp(float(elec["batt"]) + net * dt / (17.0 * 3600.0), 0.0, 1.0)
	var dead = float(elec["batt"]) <= 0.001 and gen <= 1.0
	elec["volts"] = 0.0 if dead else 13.9 + 0.3 * (gen / 55.0) if gen > 1.0 else 11.3 + 1.5 * float(elec["batt"]) if bat_on else 0.0
	elec["amps"] = 0 if dead or not bat_on else _js_round(net)
	elec["flat"] = float(elec["batt"]) <= 0.02
	elec["gen"] = _js_round(gen)
	elec["load"] = _js_round(load)
	elec["batOn"] = bat_on
	elec["altOn"] = alt_on
	elec["shed"] = shed
	elec["pfdOn"] = gen > 1.0 or (bat_on and not dead)
	elec["mfdOn"] = bool(elec["pfdOn"]) and not shed
	if gen > 1.0:
		elec["standby"] = minf(1.0, float(elec["standby"]) + dt / 3600.0)
	elif not bool(elec["pfdOn"]):
		elec["standby"] = maxf(0.0, float(elec["standby"]) - dt / (2.5 * 3600.0))
	elec["standbyOn"] = float(elec["standby"]) > 0.02

func _oil_temp(holder: Dictionary, dt: float, s: Dictionary, running: bool, power: float) -> void:
	var oat_f = (_num(s["out"].get("oat"), 15.0)) * 9.0 / 5.0 + 32.0
	if holder.get("oilT") == null:
		holder["oilT"] = oat_f
	var tgt = 130.0 + 70.0 * _clamp(power, 0.0, 1.0) if running else oat_f
	holder["oilT"] = float(holder["oilT"]) + (tgt - float(holder["oilT"])) * dt / (240.0 if running else 600.0)

static func _num(x, dflt: float) -> float:
	return float(x) if typeof(x) == TYPE_INT or typeof(x) == TYPE_FLOAT else dflt

func _emit(type: String, why: String = "") -> void:
	events.append({ "type": type, "why": why })

func _cut(s: Dictionary, on: bool, k: int = -1) -> void:
	var es: Array = s["eng"] if k < 0 else [s["eng"][k]]
	for e in es:
		if typeof(e) != TYPE_DICTIONARY:
			continue
		e["cut"] = on
		if not on:
			e["on"] = true
	s["engStopNoted"] = on

func _sync(s: Dictionary) -> void:
	if s.is_empty() or typeof(s.get("eng")) != TYPE_ARRAY:
		return
	for e in s["eng"]:
		e["mag"] = sw["mag"]
		e["mix"] = float(sw["mixture"])
	if (s["eng"] as Array).size() > 1 and sw.get("fuelSelL") != null and sw.get("fuelSelR") != null:
		s["eng"][0]["sel"] = sw["fuelSelL"]
		s["eng"][1]["sel"] = sw["fuelSelR"]
	if sw.get("xfeed") != null:
		s["xfeed"] = bool(sw["xfeed"])

func _twin_state() -> String:
	var any_run = false
	var any_crank = false
	var all_run = true
	var any_stop = false
	for t in twin:
		if t["eng"] == "run":
			any_run = true
		else:
			all_run = false
		if t["eng"] == "crank":
			any_crank = true
		if t["eng"] == "stopping":
			any_stop = true
	return "run" if all_run else "crank" if any_crank else "half" if any_run else "stopping" if any_stop else "off"

func set_cold(s: Dictionary) -> void:
	for k in COLD.keys():
		sw[k] = COLD[k]
	if sw.get("bat") != null or sw.get("alt") != null:
		sw["bat"] = false
		sw["alt"] = false
	st["eng"] = "off"; st["dead"] = false; st["crankT"] = 0.0; st["primes"] = 0; st["warm"] = false; st["rpm"] = 0.0; st["lineT"] = LINE_FUEL_S; st["oil"] = 0.0; st["oilT"] = null; st["reason"] = ""
	elec["batt"] = 1.0; elec["volts"] = 12.6; elec["amps"] = 0; elec["flat"] = false; elec["standby"] = 1.0; st["oilQ"] = 7.0; st["crankHeat"] = 0.0; st["crankLock"] = false
	for t in twin:
		t["oilQ"] = 8.0; t["crankHeat"] = 0.0; t["crankLock"] = false
	if not s.is_empty():
		_cut(s, true)
		_sync(s)
		for e in s["eng"]:
			e["rpm"] = 0.0
		s["rpm"] = 0.0
	for t in twin:
		t["eng"] = "off"; t["crankT"] = 0.0; t["catchAt"] = INF; t["rpm"] = 0.0; t["oil"] = 0.0; t["oilT"] = null

func set_running(s: Dictionary) -> void:
	for k in RUNNING_SW.keys():
		sw[k] = RUNNING_SW[k]
	st["eng"] = "run"; st["dead"] = false; st["crankT"] = 0.0; st["warm"] = true; st["lineT"] = LINE_FUEL_S; st["reason"] = ""
	if not s.is_empty():
		var any_cut = false
		for e in s["eng"]:
			if bool(e.get("cut", false)):
				any_cut = true
		if any_cut:
			_cut(s, false)
		_sync(s)
		st["rpm"] = _num(s["eng"][0].get("rpm"), 0.0) if not (s["eng"] as Array).is_empty() else 0.0
	for t in twin:
		t["eng"] = "run"; t["crankT"] = 0.0; t["catchAt"] = INF; t["oil"] = 65.0; t["oilT"] = 190.0; t["oilQ"] = 8.0
	st["oil"] = 70.0; st["oilT"] = 190.0; st["oilQ"] = 7.0; elec["altFail"] = false

func adopt(s: Dictionary) -> void:
	if st["eng"] != "run" or s.is_empty():
		set_running(s)
		return
	var any_cut = false
	for e in s["eng"]:
		if bool(e.get("cut", false)):
			any_cut = true
	if any_cut:
		_cut(s, false)
	_sync(s)
	st["rpm"] = _num(s["eng"][0].get("rpm"), 0.0) if not (s["eng"] as Array).is_empty() else 0.0
	st["dead"] = false

func prime() -> int:
	if sw["fuelSel"] != "OFF":
		st["primes"] = mini(int(st["primes"]) + 1, 9)
	return int(st["primes"])

func _tank_fuel(s: Dictionary) -> float:
	return _num(s["fuel"][0], 0.0) if sw["fuelSel"] == "L" else _num(s["fuel"][1], 0.0) if sw["fuelSel"] == "R" else 0.0

func catch_time(s: Dictionary) -> float:
	if sw["fuelSel"] == "OFF" or _tank_fuel(s) < 0.2:
		st["reason"] = "fuel"
		return INF
	if float(sw["mixture"]) < 0.7:
		st["reason"] = "mixture"
		return INF
	if int(st["primes"]) >= 6:
		if float(s["thr"]) >= 0.45:
			st["reason"] = ""
			return 3.2
		st["reason"] = "flooded"
		return INF
	if bool(st["warm"]):
		st["reason"] = ""
		return 0.9
	if int(st["primes"]) == 0:
		st["reason"] = "prime"
		return INF
	st["reason"] = ""
	return (2.6 if int(st["primes"]) == 1 else 1.2) + (0.0 if bool(sw.get("fuelPump", false)) else 0.4)

func update(dt: float, s: Dictionary) -> Array:
	events.clear()
	if s.is_empty():
		return events
	dt = _clamp(dt, 0.0, 0.25)
	_sync(s)
	if last_sel != null and s.get("fuelSel") != last_sel and ["L", "R", "OFF", "BOTH"].has(s.get("fuelSel")):
		sw["fuelSel"] = s["fuelSel"]
	s["mix"] = float(sw["mixture"])
	s["carbHeat"] = bool(sw["carbHeat"])
	if (s["eng"] as Array).size() > 1 and sw.get("fuelSelL") != null and sw.get("fuelSelR") != null:
		last_sel = s.get("fuelSel")
	else:
		s["fuelSel"] = sw["fuelSel"]
		last_sel = s["fuelSel"]
	var bus_live = float(elec["gen"]) > 1.0 or (bool(elec["batOn"]) and not bool(elec["flat"]))
	s["boostPump"] = bool(sw.get("fuelPump", false)) and bus_live
	s["pitotHeat"] = bool(sw.get("pitot", false)) and bus_live and not bool(elec["shed"])
	if (s["eng"] as Array).size() > 1:
		return _twin_update(dt, s)
	var e = s["eng"][0]
	var master = _bat_on()
	if st["eng"] == "off" or st["eng"] == "stopping":
		if sw["mag"] == "START":
			if not master:
				if not bool(st["starterTried"]):
					st["starterTried"] = true
					_emit("nostarter", "マスター スイッチが OFF なので、スターターが回りません。")
			elif float(elec["batt"]) <= 0.02:
				if not bool(st["starterTried"]):
					st["starterTried"] = true
					_emit("nostarter", "バッテリーが上がっています。外部電源か整備を呼んでください。")
			elif bool(st["crankLock"]):
				if not bool(st["starterTried"]):
					st["starterTried"] = true
					_emit("nostarter", "スターターが熱を持っています。1分ほど冷ましてから、もう一度。")
			else:
				st["eng"] = "crank"; st["crankT"] = 0.0; st["catchAt"] = catch_time(s); _emit("crank")
		else:
			st["starterTried"] = false
		var wind = 0.0 if bool(s["onGround"]) else _num(e.get("rpm"), 0.0)
		st["rpm"] = maxf(wind, float(st["rpm"]) - (float(st["rpm"]) * 1.6 + 140.0) * dt)
		if float(st["rpm"]) <= 0.5 and st["eng"] == "stopping":
			st["eng"] = "off"
		st["oil"] = maxf(0.0, float(st["oil"]) - 60.0 * dt)
	if float(st["crankHeat"]) < 0.4:
		st["crankLock"] = false
	if st["eng"] != "crank":
		st["crankHeld"] = 0.0
		st["crankHeat"] = maxf(0.0, float(st["crankHeat"]) - dt / 45.0)
	if st["eng"] == "crank":
		st["crankT"] = float(st["crankT"]) + dt
		st["crankHeld"] = float(st["crankHeld"]) + dt
		st["crankHeat"] = minf(1.2, float(st["crankHeat"]) + dt / 30.0)
		st["rpm"] = CRANK_RPM * (0.8 + 0.2 * sin(float(st["crankT"]) * 2.0 * PI * 4.0))
		if float(st["crankHeat"]) >= 1.0 and not bool(st["crankLock"]):
			st["crankLock"] = true; sw["mag"] = "BOTH"; st["eng"] = "off"; _emit("nocatch", NOCATCH["hot"])
		elif sw["mag"] != "START" or not master:
			st["eng"] = "off"
		elif float(st["crankT"]) >= float(st["catchAt"]):
			st["eng"] = "run"; st["warm"] = true; st["primes"] = 0; st["lineT"] = LINE_FUEL_S
			_cut(s, false)
			e["rpm"] = CATCH_RPM
			st["rpm"] = CATCH_RPM
			sw["mag"] = "BOTH"
			_emit("catch")
			if float(s["thr"]) > 0.35:
				_emit("surge", "スロットルが開きすぎています。かかった瞬間に回転が上がりすぎました。")
		elif float(st["crankT"]) >= STARTER_MAX:
			sw["mag"] = "BOTH"; st["eng"] = "off"
			_emit("nocatch", NOCATCH.get(st["reason"], NOCATCH["starter"]))
	if st["eng"] == "run":
		st["lineT"] = float(st["lineT"]) - dt if sw["fuelSel"] == "OFF" else LINE_FUEL_S
		var why = ""
		if float(sw["mixture"]) < 0.15:
			why = "ミクスチャー アイドル カットオフ"
		elif sw["mag"] == "OFF":
			why = "マグネトー OFF"
		elif float(st["lineT"]) <= 0.0:
			why = "燃料セレクター OFF"
		if not why.is_empty():
			st["eng"] = "stopping"; _cut(s, true); _emit("stop", why)
		elif bool(e.get("failed", false)) or float(s["fuel"][0]) + float(s["fuel"][1]) <= 0.0:
			if not bool(st["dead"]):
				st["dead"] = true
				_emit("stop", "故障" if bool(e.get("failed", false)) else "燃料切れ")
			st["rpm"] = _num(e.get("rpm"), 0.0)
			st["oil"] = maxf(0.0, float(st["oil"]) - 30.0 * dt)
		else:
			st["dead"] = false
			if sw["mag"] == "START":
				sw["mag"] = "BOTH"
			var r = _num(e.get("rpm"), 0.0)
			var k = _clamp((r - 700.0) / 1300.0, 0.0, 1.25)
			var drop_mag = 0.0
			if sw["mag"] == "L":
				drop_mag = _num(fault.get("dropL"), RUNUP["dropL"]) if fault != null else float(RUNUP["dropL"])
			elif sw["mag"] == "R":
				drop_mag = float(RUNUP["dropR"])
			var drop = drop_mag * k + (float(RUNUP["carb"]) * k if bool(sw["carbHeat"]) else 0.0)
			st["rpm"] = maxf(0.0, r - drop)
			st["oilQ"] = maxf(0.0, float(st["oilQ"]) - 0.08 * dt / 3600.0 * (0.5 + _clamp((float(st["rpm"]) - 650.0) / 2000.0, 0.0, 1.0)))
			var o_tgt = _clamp(55.0 + r * 0.012, 0.0, 85.0)
			if float(st["oilQ"]) < 2.5:
				o_tgt *= _clamp(0.3 + 0.7 * (float(st["oilQ"]) / 2.5), 0.3, 1.0) * (0.8 if r > 2000.0 else 1.0)
			st["oil"] = float(st["oil"]) + (o_tgt - float(st["oil"])) * minf(1.0, dt * 1.5)
	_oil_temp(st, dt, s, st["eng"] == "run", (float(st["rpm"]) - 650.0) / 2000.0)
	_elec_update(dt, float(st["rpm"]), st["eng"] == "crank")
	if st["eng"] == "run":
		hobbs += dt / 3600.0
	_collect_alerts(s)
	return events

func _twin_update(dt: float, s: Dictionary) -> Array:
	var master = _bat_on()
	var cyc = 0.0
	if float(sw.get("propCycleT", 0.0)) > 0.0:
		sw["propCycleT"] = maxf(0.0, float(sw["propCycleT"]) - dt)
		cyc = sin(PI * _clamp(1.0 - float(sw["propCycleT"]) / 2.6, 0.0, 1.0))
		if float(sw["propCycleT"]) == 0.0 and bool(s["onGround"]):
			sw["propCycled"] = true
	if sw["mag"] == "START":
		var k = -1
		for i in twin.size():
			if twin[i]["eng"] != "run":
				k = i
				break
		if k < 0:
			sw["mag"] = "BOTH"
		elif not master:
			if not bool(st["starterTried"]):
				st["starterTried"] = true
				_emit("nostarter", "マスター スイッチが OFF なので、スターターが回りません。")
		elif float(elec["batt"]) <= 0.02:
			if not bool(st["starterTried"]):
				st["starterTried"] = true
				_emit("nostarter", "バッテリーが上がっています。外部電源か整備を呼んでください。")
		elif bool(twin[k]["crankLock"]):
			if not bool(st["starterTried"]):
				st["starterTried"] = true
				_emit("nostarter", "スターターが熱を持っています。1分ほど冷ましてから、もう一度。")
		elif twin[k]["eng"] != "crank":
			twin[k]["eng"] = "crank"; twin[k]["crankT"] = 0.0; twin[k]["catchAt"] = catch_time(s); _emit("crank", "右エンジン" if k else "左エンジン")
	else:
		st["starterTried"] = false
	for k in twin.size():
		var t = twin[k]
		var e = s["eng"][k]
		if float(t["crankHeat"]) < 0.4:
			t["crankLock"] = false
		if t["eng"] != "crank":
			t["crankHeld"] = 0.0
			t["crankHeat"] = maxf(0.0, float(t["crankHeat"]) - dt / 45.0)
		if t["eng"] == "crank":
			t["crankT"] = float(t["crankT"]) + dt
			t["crankHeld"] = float(t["crankHeld"]) + dt
			t["crankHeat"] = minf(1.2, float(t["crankHeat"]) + dt / 30.0)
			t["rpm"] = CRANK_RPM * (0.8 + 0.2 * sin(float(t["crankT"]) * 2.0 * PI * 4.0))
			if float(t["crankHeat"]) >= 1.0 and not bool(t["crankLock"]):
				t["crankLock"] = true; sw["mag"] = "BOTH"; t["eng"] = "off"; _emit("nocatch", NOCATCH["hot"])
			elif sw["mag"] != "START" or not master:
				t["eng"] = "off"
			elif float(t["crankT"]) >= float(t["catchAt"]):
				t["eng"] = "run"; st["warm"] = true; st["primes"] = 0; st["lineT"] = LINE_FUEL_S
				_cut(s, false, k)
				e["rpm"] = CATCH_RPM
				t["rpm"] = CATCH_RPM
				sw["mag"] = "BOTH"
				_emit("catch", "右エンジン" if k else "左エンジン")
			elif float(t["crankT"]) >= STARTER_MAX:
				sw["mag"] = "BOTH"; t["eng"] = "off"; _emit("nocatch", NOCATCH.get(st["reason"], NOCATCH["starter"]))
		elif t["eng"] == "off" or t["eng"] == "stopping":
			if not bool(e.get("cut", false)) and t["eng"] == "off":
				_cut(s, true, k)
			var wind = 0.0 if bool(s["onGround"]) else _num(e.get("rpm"), 0.0)
			t["rpm"] = maxf(wind, float(t["rpm"]) - (float(t["rpm"]) * 1.6 + 140.0) * dt)
			if float(t["rpm"]) <= 0.5 and t["eng"] == "stopping":
				t["eng"] = "off"
		elif t["eng"] == "run":
			if bool(e.get("failed", false)) or bool(e.get("feather", false)):
				t["rpm"] = _num(e.get("rpm"), 0.0)
				continue
			var thr = float(s["thr"])
			var lever = 650.0 + thr / 0.045 * 350.0 if thr < 0.045 else 1000.0 + (thr - 0.045) / 0.625 * 1000.0
			var r = minf(_num(e.get("rpm"), 0.0), lever)
			var kk = _clamp((r - 700.0) / 1300.0, 0.0, 1.25)
			var drop = (float(RUNUP["dropL"]) if sw["mag"] == "L" else float(RUNUP["dropR"]) if sw["mag"] == "R" else 0.0) * kk + (float(RUNUP["carb"]) * kk if bool(sw["carbHeat"]) else 0.0) + 400.0 * cyc * kk
			t["rpm"] = maxf(0.0, r - drop)
	var any_run = false
	for t in twin:
		if t["eng"] == "run":
			any_run = true
	if any_run:
		st["lineT"] = float(st["lineT"]) - dt if sw["fuelSel"] == "OFF" else LINE_FUEL_S
		var why = ""
		if float(sw["mixture"]) < 0.15:
			why = "ミクスチャー アイドル カットオフ"
		elif sw["mag"] == "OFF":
			why = "マグネトー OFF"
		elif float(st["lineT"]) <= 0.0:
			why = "燃料セレクター OFF"
		if not why.is_empty():
			for k2 in twin.size():
				if twin[k2]["eng"] == "run":
					twin[k2]["eng"] = "stopping"
					_cut(s, true, k2)
			_emit("stop", why)
	var was = st["eng"]
	st["eng"] = _twin_state()
	var has_stop = false
	for ev in events:
		if ev["type"] == "stop":
			has_stop = true
	var any_failed = false
	for e2 in s["eng"]:
		if bool(e2.get("failed", false)):
			any_failed = true
	if was == "run" and st["eng"] != "run" and not has_stop and any_failed:
		_emit("stop", "故障")
	var live = func(k: int) -> bool:
		return (twin[k]["eng"] == "run" or twin[k]["eng"] == "crank") and not (bool(s["eng"][k].get("failed", false)) or bool(s["eng"][k].get("feather", false)))
	st["rpm"] = float(twin[0]["rpm"]) if live.call(0) else float(twin[1]["rpm"]) if live.call(1) else maxf(float(twin[0]["rpm"]), float(twin[1]["rpm"]))
	var on = 0
	for t in twin:
		if t["eng"] == "run":
			on += 1
	st["oil"] = float(st["oil"]) + ((_clamp(55.0 + float(st["rpm"]) * 0.012, 0.0, 85.0) if on > 0 else 0.0) - float(st["oil"])) * minf(1.0, dt * 1.5)
	for t in twin:
		if t["eng"] == "run":
			t["oilQ"] = maxf(0.0, float(t["oilQ"]) - 0.08 * dt / 3600.0 * (0.5 + _clamp((float(t["rpm"]) - 650.0) / 2000.0, 0.0, 1.0)))
			var o_tgt = _clamp(55.0 + float(t["rpm"]) * 0.012, 0.0, 85.0)
			if float(t["oilQ"]) < 2.5:
				o_tgt *= _clamp(0.3 + 0.7 * (float(t["oilQ"]) / 2.5), 0.3, 1.0) * (0.8 if float(t["rpm"]) > 2000.0 else 1.0)
			t["oil"] = float(t["oil"]) + (o_tgt - float(t["oil"])) * minf(1.0, dt * 1.5)
		else:
			t["oil"] = maxf(0.0, float(t["oil"]) - 60.0 * dt)
		_oil_temp(t, dt, s, t["eng"] == "run", (float(t["rpm"]) - 650.0) / 2000.0)
	_elec_update(dt, maxf(float(twin[0]["rpm"]), float(twin[1]["rpm"])), twin.any(func(t): return t["eng"] == "crank"))
	if on > 0:
		hobbs += dt / 3600.0
	_collect_alerts(s)
	return events

func _collect_alerts(s: Dictionary) -> void:
	var A: Array = []
	var running: Array = []
	for e in s["eng"]:
		running.append(bool(e.get("run", false)))
	var oils: Array = []
	if (s["eng"] as Array).size() > 1:
		for t in twin:
			oils.append(float(t["oil"]))
	else:
		oils = [float(st["oil"])]
	for i in running.size():
		if running[i] and oils[i] < 30.0:
			A.append({ "id": "OIL PRESS", "level": "warn", "text": "OIL PRESS LOW" })
			break
	if typeof(s.get("fuel")) == TYPE_ARRAY:
		if float(s["fuel"][0]) < 3.0:
			A.append({ "id": "FUEL L", "level": "caution", "text": "FUEL L LOW" })
		if float(s["fuel"][1]) < 3.0:
			A.append({ "id": "FUEL R", "level": "caution", "text": "FUEL R LOW" })
	var any_held = float(st["crankHeld"]) > 10.0
	for t in twin:
		if float(t["crankHeld"]) > 10.0:
			any_held = true
	if any_held:
		A.append({ "id": "STARTER", "level": "caution", "text": "STARTER ENGAGED" })
	var any_lock = bool(st["crankLock"])
	for t in twin:
		if bool(t["crankLock"]):
			any_lock = true
	if any_lock:
		A.append({ "id": "STARTER HOT", "level": "caution", "text": "STARTER HOT" })
	var any_running = false
	for r in running:
		if r:
			any_running = true
	if bool(elec["altFail"]) and any_running:
		A.append({ "id": "ALTERNATOR", "level": "caution", "text": "ALTERNATOR FAIL" })
	if float(elec["volts"]) > 0.0 and float(elec["volts"]) < 12.0 and bool(elec["batOn"]) and (any_running or not bool(s["onGround"])):
		A.append({ "id": "LOW VOLTS", "level": "caution", "text": "LOW VOLTS" })
	for e in s["eng"]:
		if bool(e.get("run", false)) and _num(e.get("fuelPress"), 0.0) < 0.25:
			A.append({ "id": "FUEL PRESS", "level": "caution", "text": "FUEL PRESS LOW" })
			break
	if not bool(s["onGround"]) and s["out"].get("agl") != null and float(s["out"]["agl"]) < 2000.0 and typeof(s.get("A")) == TYPE_DICTIONARY and typeof(s["A"].get("gear")) == TYPE_DICTIONARY and not bool(s["A"]["gear"].get("fixed", true)) and _num(s.get("gearPos"), 0.0) < 0.999:
		A.append({ "id": "GEAR", "level": "warn", "text": "GEAR UNSAFE" })
	A.sort_custom(func(a, b):
		if a["level"] != b["level"]:
			return a["level"] == "warn"
		return String(a["id"]) < String(b["id"]))
	alerts_arr = A
	if typeof(s.get("out")) == TYPE_DICTIONARY:
		s["out"]["alerts"] = A

# ---- accessors (the JS object's getters)
func set_fault(f) -> void:
	fault = { "dropL": float(f["dropL"]) } if typeof(f) == TYPE_DICTIONARY and _num(f.get("dropL"), 0.0) > 0.0 else null
func set_elec_fault(on: bool) -> void:
	elec["altFail"] = on
func elec_fault() -> bool:
	return bool(elec["altFail"])
func oil_t() -> Variant:
	return st["oilT"]
func twin_get() -> Array:
	var out: Array = []
	for t in twin:
		out.append({ "eng": t["eng"], "rpm": t["rpm"], "oil": t["oil"], "oilT": t["oilT"], "oilQ": t["oilQ"], "crankHeat": t["crankHeat"] })
	return out
func running_l() -> bool:
	return twin[0]["eng"] == "run"
func alerts() -> Array:
	return alerts_arr
func starter_hot() -> bool:
	if bool(st["crankLock"]):
		return true
	for t in twin:
		if bool(t["crankLock"]):
			return true
	return false
func oil_q() -> float:
	return float(st["oilQ"])
func running() -> bool:
	return st["eng"] == "run"
func cranking() -> bool:
	return st["eng"] == "crank"
func rpm() -> float:
	return float(st["rpm"])
func oil() -> float:
	return float(st["oil"])
func primes() -> int:
	return int(st["primes"])
func powered() -> bool:
	return _bat_on() or _alt_on()
func avionics_on() -> bool:
	return (_bat_on() or _alt_on()) and bool(sw.get("avionics", false))
