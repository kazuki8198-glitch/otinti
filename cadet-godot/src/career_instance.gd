class_name CadetCareerInstance
extends RefCounted
# Port of createCareer() from cadet/src/career/career.js (HTML CADET @ 898fe8a).
# The JS `store` (localStorage-shaped) is a plain Dictionary String->String here:
# store[CadetCareer.CAREER_KEY] holds the JSON save. All state lives in `st`
# (a Dictionary in CadetCareer's shape). Methods mirror the JS career object's API.

var st: Dictionary
var store: Dictionary

func _init(p_store: Dictionary = {}, seed = null) -> void:
	store = p_store
	st = _read()
	if st.is_empty():
		var sd = seed if seed != null else float(randi() % 2147483648)
		st = CadetCareer.new_career(float(sd))

func _read() -> Dictionary:
	if store == null:
		return {}
	var raw = store.get(CadetCareer.CAREER_KEY)
	if typeof(raw) != TYPE_STRING or String(raw).is_empty():
		return {}
	var parsed = JSON.parse_string(String(raw))
	if typeof(parsed) != TYPE_DICTIONARY:
		return {}
	var c = CadetCareer.clean_career(parsed)
	return c if typeof(c) == TYPE_DICTIONARY else {}

func save() -> bool:
	if store == null:
		return false
	store[CadetCareer.CAREER_KEY] = JSON.stringify(st)
	return true

func _apply_grow(axis: String, base: float, key: String) -> Variant:
	# JS: an unknown axis reads st.abilities[axis] === undefined (null here); base <= 0 returns the value
	if not CadetCareer.ABILITIES.has(axis):
		return null
	if not (base > 0.0):
		return float(st["abilities"][axis])
	var rep = 0
	if not key.is_empty() and CadetCareer._re_match(CadetCareer._ATTEMPT_ID, key):
		rep = int(st["growth"].get(key, 0))
	var f = 1.0 if rep == 0 else 0.5 if rep == 1 else 0.25
	st["abilities"][axis] = CadetCareer._clamp(float(st["abilities"][axis]) + base * (1.0 - float(st["abilities"][axis]) / 130.0) * f, 0.0, 100.0)
	if not key.is_empty() and CadetCareer._re_match(CadetCareer._ATTEMPT_ID, key):
		st["growth"][key] = rep + 1
	return float(st["abilities"][axis])

# ---- the API (mirrors the JS career object)
func abilities() -> Dictionary:
	return (st["abilities"] as Dictionary).duplicate()

func grow(axis: String, base: float, key: String = "") -> Variant:
	var v = _apply_grow(axis, base, key)
	save()
	return v

func first_try(pass_: bool) -> Dictionary:
	st["firstTry"]["total"] = int(st["firstTry"]["total"]) + 1
	if pass_:
		st["firstTry"]["pass"] = int(st["firstTry"]["pass"]) + 1
	save()
	return (st["firstTry"] as Dictionary).duplicate()

func day() -> int:
	return int(st["day"])
func slot() -> String:
	return String(st["slot"])
func chapter() -> String:
	return String(st["chapter"])
func hours() -> float:
	return float(CadetCareer.SLOT_HOURS[st["slot"]])
func date() -> String:
	return CadetCareer.date_text(int(st["day"]))
func weather(prog) -> Dictionary:
	return CadetCareer.weather_for2(CadetCareer.weather_for(int(st["seed"]), int(st["day"]), CadetCareer.day_opts(st, prog)), String(st["chapter"]), "flight")
func schedule(prog, o: Dictionary = {}) -> Array:
	var oo = o.duplicate()
	if not CadetCareer._is_obj(oo.get("weather")):
		oo["weather"] = weather(prog)
	return CadetCareer.schedule(st, prog, oo)
func gate(prog, trust: float = 50.0) -> Array:
	return CadetCareer.gate(st, prog, trust)
func done(kind: String, id: String) -> void:
	st["done"]["%s:%s" % [kind, id]] = int(st["day"])
	save()
func is_done(kind: String, id: String) -> bool:
	return st["done"].has("%s:%s" % [kind, id])
func done_today(kind: String, id: String) -> bool:
	return st["done"].get("%s:%s" % [kind, id]) != null and int(st["done"]["%s:%s" % [kind, id]]) == int(st["day"])
func exam(id: String, pct: float, passed = null) -> Variant:
	if not CadetCareer.EXAMS.has(id):
		return null
	var E = CadetCareer.EXAMS[id]
	var ok = bool(passed) if typeof(passed) == TYPE_BOOL else pct >= float(E["pass"])
	var r = st["exams"].get(id) if CadetCareer._is_obj(st["exams"].get(id)) else { "tries": 0, "best": 0, "pass": false }
	r["tries"] = int(r["tries"]) + 1
	r["best"] = maxi(int(r["best"]), CadetCareer._js_round(pct))
	if ok:
		r["pass"] = true
	st["exams"][id] = r
	st["done"]["exam:" + id] = int(st["day"])
	st["examDay"][id] = int(st["day"])
	st["fatigue"] = CadetCareer._clampi(int(st["fatigue"]) + 8, 0, 100)
	_apply_grow("know", 4.0 if ok else 1.2, "exam:" + id)
	save()
	return r
func exam_ready(id: String) -> bool:
	return CadetCareer.EXAMS.has(id) and int(st["examDay"].get(id, -1)) != int(st["day"])
func drill() -> bool:
	if int(st["drills"]["day"]) != int(st["day"]):
		st["drills"] = { "day": int(st["day"]), "n": 0 }
	if int(st["drills"]["n"]) >= 2:
		save()
		return false
	st["drills"]["n"] = int(st["drills"]["n"]) + 1
	_apply_grow("judge", 1.0, "drill:%d:%d" % [int(st["day"]), int(st["drills"]["n"])])
	save()
	return true
func drills_left() -> int:
	return maxi(0, 2 - int(st["drills"]["n"])) if int(st["drills"]["day"]) == int(st["day"]) else 2
func note_miss(key: String, label: String) -> void:
	if CadetCareer._re_match(CadetCareer._MISS_KEY, key) and label.length() >= 1 and label.length() <= 80:
		st["miss"] = { "day": int(st["day"]), "key": key, "label": label }
		save()
func clear_miss() -> void:
	if st.get("miss") != null:
		st["miss"] = null
		save()
func decision(choice: String, weather: Dictionary) -> bool:
	var right = choice == String(weather["decision"])
	st["decisions"].append({ "day": int(st["day"]), "choice": choice, "right": right })
	_apply_grow("judge", 1.8 if right else 0.5, "decision:%d" % int(st["day"]))
	save()
	return right
func decided_today() -> Variant:
	for d in st["decisions"]:
		if int(d["day"]) == int(st["day"]):
			return d
	return null
func advance_chapter(prog, trust: float = 50.0) -> bool:
	if not CadetCareer.gate(st, prog, trust).is_empty():
		return false
	if st["chapter"] == "prologue":
		st["chapter"] = "ch1"
	elif st["chapter"] == "ch1":
		st["chapter"] = "ch2"
	elif st["chapter"] == "ch2":
		if st.get("solo") == null:
			return false
		st["chapter"] = "ch3"
	elif CadetCareer.LATER.has(st["chapter"]) and st["chapter"] != "ch6":
		st["chapter"] = CadetCareer.LATER[CadetCareer.LATER.find(st["chapter"]) + 1]
	else:
		return false
	save()
	return true
func finish_prologue() -> void:
	st["done"]["prologue"] = int(st["day"])
	save()
func heard_section(id: String, how: String) -> void:
	if not CadetCareer._re_match(CadetCareer._SEC_ID, id) or (how != "f" and how != "q"):
		return
	if st["heard"].get(id) != "f":
		st["heard"][id] = how
	save()
func heard_set() -> Array:
	return CadetCareer.heard_set(st)
func set_pace(p: String) -> void:
	if CadetCareer.PACE_IDS.has(p):
		st["lastPace"] = p
		save()
func walked_into(room: String) -> void:
	if CadetCareer._re_match("^[a-z0-9-]{1,16}$", room) and not (st["walked"] as Array).has(room) and (st["walked"] as Array).size() < 40:
		st["walked"].append(room)
		save()
func attempt(key: String) -> int:
	if not CadetCareer._re_match(CadetCareer._ATTEMPT_ID, key):
		return 0
	var n = int(st["attempts"].get(key, 0))
	st["attempts"][key] = n + 1
	save()
	return n
func tries(key: String) -> int:
	return int(st["attempts"].get(key, 0))
func answered(id: String, right: bool) -> void:
	if not CadetCareer._re_match(CadetCareer._Q_ID, id):
		return
	var r = st["answers"].get(id) if typeof(st["answers"].get(id)) == TYPE_ARRAY else [0, 0, 0, 0]
	if right:
		r[0] = int(r[0]) + 1
	else:
		r[1] = int(r[1]) + 1
	r[2] = 1 if right else 0
	r[3] = int(st["day"])
	st["answers"][id] = r
	var ks = st["answers"].keys()
	if ks.size() > 400:
		st["answers"].erase(ks[0])
	save()
func solo_done() -> void:
	st["solo"] = { "day": int(st["day"]) }
	save()
func check(id: String, pass_: bool) -> Dictionary:
	var r = st["checks"].get(id) if CadetCareer._is_obj(st["checks"].get(id)) else { "tries": 0, "pass": false, "day": 0 }
	r["tries"] = int(r["tries"]) + 1
	if pass_:
		r["pass"] = true
		r["day"] = int(st["day"])
	st["checks"][id] = r
	st["done"]["%s:%s" % [String(CadetCareer.CHECKS[id]["kind"]), id]] = int(st["day"])
	save()
	return r
func graduate(prog) -> void:
	var g = { "day": int(st["day"]) }
	var rank = CadetCareer.graduation_rank(st, prog)
	for k in rank.keys():
		g[k] = rank[k]
	st["graduated"] = g
	st["done"]["graduation:grad"] = int(st["day"])
	save()
func begin_endorsement() -> bool:
	if st.get("graduated") == null or st["chapter"] != "ch6":
		return false
	st["chapter"] = "ch7"
	save()
	return true
func flying_weather(prog, kind: String = "flight") -> Dictionary:
	return CadetCareer.weather_for2(CadetCareer.weather_for(int(st["seed"]), int(st["day"]), CadetCareer.forced_weather(st, prog)), String(st["chapter"]), kind)
func aloft(prog) -> Dictionary:
	if st.get("aloft") == null or int(st["aloft"]["day"]) != int(st["day"]):
		var a = { "day": int(st["day"]) }
		var w = CadetCareer.winds_aloft_for(weather(prog))
		for k in w.keys():
			a[k] = w[k]
		st["aloft"] = a
		save()
	return (st["aloft"] as Dictionary).duplicate()
func advance(to = null) -> bool:
	var i = CadetCareer.SLOTS.find(st["slot"])
	var j = CadetCareer.SLOTS.find(to) if to != null else i + 1
	if j > i and j < CadetCareer.SLOTS.size():
		st["slot"] = CadetCareer.SLOTS[j]
		save()
		return true
	return false
func tire(n: int) -> void:
	st["fatigue"] = CadetCareer._clampi(int(st["fatigue"]) + n, 0, 100)
	save()
func sleep(opts: Dictionary = {}) -> Dictionary:
	var late = bool(opts.get("late", false))
	st["fatigue"] = CadetCareer._clampi(int(st["fatigue"]) - (15 if late else 50) + (10 if late else 0), 0, 100)
	st["day"] = int(st["day"]) + 1
	st["slot"] = "morning"
	save()
	return { "day": int(st["day"]), "date": CadetCareer.date_text(int(st["day"])), "off": CadetCareer.is_off(int(st["day"])) }
func tired() -> bool:
	return int(st["fatigue"]) >= 65
func reset(seed2 = null) -> Dictionary:
	st = CadetCareer.new_career(float(seed2) if seed2 != null else float(randi() % 2147483648))
	save()
	return st
func load(o) -> bool:
	var c = CadetCareer.clean_career(o)
	if typeof(c) != TYPE_DICTIONARY:
		return false
	st = c
	save()
	return true
