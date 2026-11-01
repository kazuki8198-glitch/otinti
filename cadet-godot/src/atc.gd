class_name CadetAtc
extends RefCounted
# Port of cadet/src/dialog/atc.js (HTML CADET @ 898fe8a) — a radio exchange runner:
# hear -> choose (against the clock) -> reply / negative; late answers re-called.
# radio is a Dictionary { exchanges: {id: Dictionary | Callable(arg)->Dictionary},
# sequences: {id: [exchange ids]}, call: { short } } — the content data itself is
# Phase 3; the seeded shuffle uses the same mulberry RNG as career.js.

var radio: Dictionary
var _r: CadetCareer.Rng
var results: Array = []
var events: Array = []
var log: Array = []
var seq = null  # { id, list: [{id, ex}], i }
var cur = null  # { id, ex, phase, queue, lines, t, timeLeft, order, tries, late, last, wrongWhy }

static func _line_s(en: String) -> float:
	return 1.2 + float(en.split(" ", false).size()) * 0.32

func _init(p_radio: Dictionary, seed: int = 11) -> void:
	radio = p_radio
	_r = CadetCareer.Rng.new(seed)

func _resolve(id: String, arg) -> Dictionary:
	var x = radio["exchanges"][id]
	return x.call(arg) if typeof(x) == TYPE_CALLABLE else x

func start(seq_id: String, arg = null) -> Variant:
	var ids = radio["sequences"].get(seq_id)
	if ids == null:
		push_error("atc: no sequence \"%s\"" % seq_id)
		return null
	var list: Array = []
	for id in ids:
		list.append({ "id": id, "ex": _resolve(id, arg) })
	seq = { "id": seq_id, "list": list, "i": -1 }
	_next_exchange()
	return view()

func _next_exchange() -> void:
	seq["i"] = int(seq["i"]) + 1
	var list = seq["list"]
	if int(seq["i"]) >= list.size():
		var id = seq["id"]
		seq = null
		cur = null
		events.append({ "type": "done", "seq": id })
		return
	var it = list[int(seq["i"])]
	var ex = it["ex"]
	var order: Array = []
	for i in (ex["choices"] as Array).size():
		order.append(i)
	for i in range(order.size() - 1, 0, -1):
		var j = int(floor(_r.next() * float(i + 1)))
		var tmp = order[i]
		order[i] = order[j]
		order[j] = tmp
	cur = { "id": it["id"], "ex": ex, "phase": "hear", "queue": (ex.get("hear", []) as Array).duplicate(), "lines": [], "t": 0.0, "timeLeft": float(ex.get("time", 25)), "order": order, "tries": 0, "late": false, "last": null, "wrongWhy": "" }
	_pump()

func _pump() -> void:
	if not (cur["queue"] as Array).is_empty():
		var l = cur["queue"].pop_front()
		cur["lines"].append(l)
		log.append(l)
		cur["t"] = _line_s(String(l["en"]))
		events.append({ "type": "say", "who": l["who"], "en": l["en"] })
		return
	if cur["phase"] == "hear" or cur["phase"] == "negative":
		cur["phase"] = "choose"
		cur["t"] = 0.0
		return
	if cur["phase"] == "reply":
		results.append({ "id": cur["id"], "station": cur["ex"]["station"], "tries": cur["tries"], "ok": int(cur["tries"]) == 1 and not bool(cur["late"]), "late": cur["late"] })
		_next_exchange()

func update(dt: float) -> Array:
	events.clear()
	if cur == null:
		return events
	if cur["phase"] == "choose":
		cur["timeLeft"] = float(cur["timeLeft"]) - dt
		if float(cur["timeLeft"]) <= 0.0 and not bool(cur["late"]):
			cur["late"] = true
			cur["timeLeft"] = float(cur["ex"].get("time", 25))
			var st_name = "Ground" if cur["ex"]["station"] == "GND" else "Tower" if cur["ex"]["station"] == "TWR" else "ATIS"
			var again = { "who": cur["ex"]["station"], "en": "%s, LAB %s, how do you hear?" % [String(radio["call"]["short"]), st_name], "ja": "聞こえていますか？（応答がない）" }
			if cur["ex"]["station"] != "ATIS":
				cur["lines"].append(again)
				log.append(again)
				events.append({ "type": "say", "who": again["who"], "en": again["en"] })
	elif float(cur["t"]) - dt <= 0.0:
		cur["t"] = float(cur["t"]) - dt
		_pump()
	else:
		cur["t"] = float(cur["t"]) - dt
	return events

func answer(k: int) -> Variant:
	if cur == null or cur["phase"] != "choose":
		return null
	var order = cur["order"]
	if k < 0 or k >= order.size():
		return null
	var c = cur["ex"]["choices"][int(order[k])]
	if typeof(c) != TYPE_DICTIONARY:
		return null
	cur["tries"] = int(cur["tries"]) + 1
	var said = { "who": "P", "en": c["en"], "ja": "" }
	if cur["ex"].get("kind") != "listen":
		cur["lines"].append(said)
		log.append(said)
	cur["last"] = { "ok": bool(c.get("ok", false)), "why": String(cur["ex"].get("note", "")) if bool(c.get("ok", false)) else String(c.get("why", "")), "en": c["en"] }
	if bool(c.get("ok", false)):
		cur["phase"] = "reply"
		cur["queue"] = (cur["ex"].get("reply", []) as Array).duplicate()
		cur["t"] = 0.6
		cur["wrongWhy"] = ""
	else:
		cur["phase"] = "negative"
		cur["wrongWhy"] = String(c.get("why", ""))
		cur["queue"] = [{ "who": cur["ex"]["station"], "en": c["negative"], "ja": "（訂正）" }] if c.get("negative") != null else []
		cur["t"] = 0.5
		cur["timeLeft"] = float(cur["ex"].get("time", 25))
	return (cur["last"] as Dictionary).duplicate()

func view() -> Variant:
	if cur == null:
		return null
	var ex = cur["ex"]
	var choices: Array = []
	if cur["phase"] == "choose":
		for k in (cur["order"] as Array).size():
			choices.append({ "k": k, "en": ex["choices"][int(cur["order"][k])]["en"] })
	return {
		"seq": String(seq["id"]) if seq != null else "", "id": cur["id"], "station": ex["station"], "freq": ex.get("freq"), "kind": ex.get("kind"), "phase": cur["phase"],
		"lines": (cur["lines"] as Array).slice(-4), "q": ex.get("q"),
		"choices": choices,
		"timeLeft": maxf(0.0, float(cur["timeLeft"])), "time": float(ex.get("time", 25)), "last": cur["last"], "wrongWhy": cur["wrongWhy"],
	}

func right_index() -> int:
	if cur != null and cur["phase"] == "choose":
		for k in (cur["order"] as Array).size():
			if bool(cur["ex"]["choices"][int(cur["order"][k])].get("ok", false)):
				return k
	return -1

func summary() -> Dictionary:
	var first = 0
	var late = 0
	var wrong = 0
	for r in results:
		if bool(r["ok"]):
			first += 1
		if bool(r["late"]):
			late += 1
		wrong += maxi(0, int(r["tries"]) - 1)
	return { "n": results.size(), "first": first, "late": late, "wrong": wrong, "results": results.duplicate() }

func busy() -> bool:
	return cur != null

func seq_id() -> String:
	return String(seq["id"]) if seq != null else ""
