class_name CadetDialogEngine
extends RefCounted
# Port of cadet/src/dialog/engine.js (HTML CADET @ 898fe8a, 262 lines) — the conversation
# runner: a graph of nodes per dialog, plain-Dictionary state (flags / trust / items / seen),
# conditions (all/any/not/flag/trust/seen/ctx), effects (set/trust/give/hook), {path}
# placeholders, and start/next/choose/press navigation with if-skipping (settle).
# JS has exceptions, GDScript does not: where the original throws, the port records the
# message in `last_error` (static) / `Runner.error` and closes the conversation, which is
# the original's own step() behaviour (a failed step ends the talk, then reports the error).

const SAVE_VERSION := 1
const TRUST_START := 50.0
const MAX_HOPS := 64
const END := "end"
const CHOICES_MAX := 12

# members of Object.prototype: a dotted path through them never resolves (engine.js getPath)
const _PROTO_KEYS := ["constructor", "__proto__", "toString", "valueOf", "hasOwnProperty",
	"isPrototypeOf", "propertyIsEnumerable", "toLocaleString", "__defineGetter__", "__defineSetter__",
	"__lookupGetter__", "__lookupSetter__"]
const _COND_KINDS := ["all", "any", "not", "flag", "trust", "seen", "ctx"]
const _EFFECT_KINDS := ["set", "trust", "give", "hook"]

static var last_error := ""

static func _fail(msg: String) -> void:
	last_error = msg
	push_error(msg)

static func _is_obj(o) -> bool:
	return typeof(o) == TYPE_DICTIONARY
static func _truthy(v) -> bool:
	if v == null:
		return false
	var t = typeof(v)
	if t == TYPE_BOOL:
		return bool(v)
	if t == TYPE_INT or t == TYPE_FLOAT:
		return float(v) != 0.0
	if t == TYPE_STRING:
		return not String(v).is_empty()
	return true
static func _is_finite_num(v) -> bool:
	return (typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT) and is_finite(float(v))
static func _is_flag_value(v) -> bool:
	return typeof(v) == TYPE_BOOL or typeof(v) == TYPE_STRING or _is_finite_num(v)
static func _clamp_trust(t: float) -> float:
	return minf(100.0, maxf(0.0, t))
# JS === for the JSON-shaped values conditions compare: bool is not a number, int/float unify
static func _strict_eq(a, b) -> bool:
	var ta = typeof(a)
	var tb = typeof(b)
	var na = ta == TYPE_INT or ta == TYPE_FLOAT
	var nb = tb == TYPE_INT or tb == TYPE_FLOAT
	if na and nb:
		return float(a) == float(b)
	if ta != tb:
		return false
	return a == b
static func _js_str(v) -> String:
	if typeof(v) == TYPE_BOOL:
		return "true" if bool(v) else "false"
	if typeof(v) == TYPE_INT:
		return str(int(v))
	if typeof(v) == TYPE_FLOAT:
		var f = float(v)
		return str(int(f)) if f == floorf(f) and absf(f) < 1e15 else str(f)
	return String(v)

# ---- paths and placeholders ----
static func resolve_path(obj, path: String):
	var v = obj
	for k in path.split("."):
		if v == null:
			return null
		if _is_obj(v):
			if _PROTO_KEYS.has(k) and not (v as Dictionary).has(k):
				return null
			if not (v as Dictionary).has(k):
				return null
			v = v[k]
		elif typeof(v) == TYPE_ARRAY:
			if not k.is_valid_int():
				return null
			var i = int(k)
			if i < 0 or i >= (v as Array).size():
				return null
			v = v[i]
		else:
			return null
	return v

static var _fill_re: RegEx = null
static func fill(text, ctx, on_missing := Callable()) -> String:
	if _fill_re == null:
		_fill_re = RegEx.new()
		_fill_re.compile("\\{([A-Za-z_$][\\w$]*(?:\\.[\\w$]+)*)\\}")
	var s = "" if text == null else String(text)
	var out = ""
	var last = 0
	for m in _fill_re.search_all(s):
		out += s.substr(last, m.get_start() - last)
		var p = m.get_string(1)
		var v = resolve_path(ctx, p)
		if typeof(v) == TYPE_STRING or _is_finite_num(v) or typeof(v) == TYPE_BOOL:
			out += _js_str(v)
		else:
			if on_missing.is_valid():
				on_missing.call(p)
		last = m.get_end()
	out += s.substr(last)
	return out

# ---- state ----
static func is_dialog_state(o) -> bool:
	if not _is_obj(o):
		return false
	if not _strict_eq(o.get("v"), SAVE_VERSION):
		return false
	if o.has("flags") and not _is_obj(o["flags"]):
		return false
	if o.has("trust") and not _is_obj(o["trust"]):
		return false
	if o.has("items") and typeof(o["items"]) != TYPE_ARRAY:
		return false
	if o.has("seen") and not _is_obj(o["seen"]):
		return false
	return true

static func create_dialog_state(saved = null) -> Dictionary:
	var s = { "v": SAVE_VERSION, "flags": {}, "trust": {}, "items": [], "seen": {} }
	if not is_dialog_state(saved):
		return s
	var src = saved as Dictionary
	if _is_obj(src.get("flags")):
		for k in src["flags"].keys():
			if String(k) == "__proto__":
				continue
			var v = src["flags"][k]
			if _is_flag_value(v):
				s["flags"][k] = v
	if _is_obj(src.get("trust")):
		for k in src["trust"].keys():
			if String(k) == "__proto__":
				continue
			var t = src["trust"][k]
			if _is_finite_num(t):
				s["trust"][k] = _clamp_trust(float(t))
	for it in (src.get("items", []) as Array):
		if typeof(it) == TYPE_STRING and not (s["items"] as Array).has(it):
			(s["items"] as Array).append(it)
	if _is_obj(src.get("seen")):
		for k in src["seen"].keys():
			if String(k) == "__proto__":
				continue
			if _truthy(src["seen"][k]):
				s["seen"][k] = true
	return s

static func trust_of(state, who: String) -> float:
	if _is_obj(state) and _is_obj((state as Dictionary).get("trust")):
		var t = (state as Dictionary)["trust"].get(who)
		if _is_finite_num(t):
			return float(t)
	return TRUST_START

# ---- conditions and effects ----
static func cond_kind(c) -> Variant:
	if not _is_obj(c):
		return null
	var found: Array = []
	for k in _COND_KINDS:
		if (c as Dictionary).has(k):
			found.append(k)
	return found[0] if found.size() == 1 else null

static func effect_kind(e) -> Variant:
	if not _is_obj(e):
		return null
	var found: Array = []
	for k in _EFFECT_KINDS:
		if (e as Dictionary).has(k):
			found.append(k)
	return found[0] if found.size() == 1 else null

static func eval_cond(cond, state, ctx) -> bool:
	last_error = ""
	return _eval_cond(cond, state, ctx)

static func _eval_cond(cond, state, ctx) -> bool:
	if cond == null:
		return true
	var kind = cond_kind(cond)
	if kind == null:
		_fail("dialog: unknown condition %s" % JSON.stringify(cond))
		return false
	var c = cond as Dictionary
	match String(kind):
		"all":
			if typeof(c["all"]) == TYPE_ARRAY:
				for x in c["all"]:
					if not _eval_cond(x, state, ctx):
						return false
				return true
		"any":
			if typeof(c["any"]) == TYPE_ARRAY:
				for x in c["any"]:
					if _eval_cond(x, state, ctx):
						return true
				return false
		"not":
			if c.has("not"):
				return not _eval_cond(c["not"], state, ctx)
		"flag":
			var v = null
			if _is_obj(state) and _is_obj((state as Dictionary).get("flags")) and (state as Dictionary)["flags"].has(c["flag"]):
				v = (state as Dictionary)["flags"][c["flag"]]
			if c.has("is"):
				return _strict_eq(v if v != null else false, c["is"])
			return _truthy(v)
		"trust":
			if c.has("gte") or c.has("lt"):
				var t = trust_of(state, String(c["trust"]))
				return (not c.has("gte") or t >= float(c["gte"])) and (not c.has("lt") or t < float(c["lt"]))
		"seen":
			return _is_obj(state) and _is_obj((state as Dictionary).get("seen")) and (state as Dictionary)["seen"].has(c["seen"]) and _truthy((state as Dictionary)["seen"][c["seen"]])
		"ctx":
			var v2 = resolve_path(ctx, String(c["ctx"]))
			if c.has("exists"):
				return (v2 != null) == _truthy(c["exists"])
			if c.has("is"):
				return _strict_eq(v2, c["is"])
	_fail("dialog: unknown condition %s" % JSON.stringify(cond))
	return false

static func _call_hook(hooks, name: String, arg) -> void:
	if typeof(hooks) == TYPE_CALLABLE:
		if (hooks as Callable).is_valid():
			(hooks as Callable).call(name, arg)
	elif _is_obj(hooks) and typeof((hooks as Dictionary).get("onHook")) == TYPE_CALLABLE:
		((hooks as Dictionary)["onHook"] as Callable).call(name, arg)

static func apply_effects(effects, state: Dictionary, hooks = null) -> Dictionary:
	last_error = ""
	if effects == null:
		return state
	var list: Array = effects if typeof(effects) == TYPE_ARRAY else [effects]
	for e in list:
		var kind = effect_kind(e)
		if kind == null:
			_fail("dialog: unknown effect %s" % JSON.stringify(e))
			return state
		var ed = e as Dictionary
		match String(kind):
			"set":
				var to = ed["to"] if ed.has("to") else true
				if typeof(ed.get("set")) != TYPE_STRING or String(ed["set"]).is_empty() or String(ed["set"]) == "__proto__" or not _is_flag_value(to):
					_fail("dialog: bad set effect: %s" % JSON.stringify(e))
					return state
				state["flags"][ed["set"]] = to
			"trust":
				if not _is_finite_num(ed.get("add")):
					_fail("dialog: trust effect without a number: %s" % JSON.stringify(e))
					return state
				state["trust"][ed["trust"]] = _clamp_trust(trust_of(state, String(ed["trust"])) + float(ed["add"]))
			"give":
				if typeof(ed.get("give")) != TYPE_STRING or String(ed["give"]).is_empty():
					_fail("dialog: give without an item name: %s" % JSON.stringify(e))
					return state
				if not (state["items"] as Array).has(ed["give"]):
					(state["items"] as Array).append(ed["give"])
			"hook":
				_call_hook(hooks, String(ed["hook"]), ed.get("arg"))
	return state

# ---- targets ----
static func resolve_target(data, dialog_id: String, target) -> Variant:
	if typeof(target) == TYPE_STRING and String(target) == END:
		return END
	if typeof(target) != TYPE_STRING or String(target).is_empty() or not _is_obj(data) or not _is_obj((data as Dictionary).get("dialogs")):
		return null
	var dialogs = (data as Dictionary)["dialogs"] as Dictionary
	var d = dialogs.get(dialog_id)
	if _is_obj(d) and _is_obj((d as Dictionary).get("nodes")) and (d["nodes"] as Dictionary).has(target):
		return { "dialog": dialog_id, "node": target }
	var t = String(target)
	var i = t.find(":")
	if i > 0:
		var dd = t.substr(0, i)
		var n = t.substr(i + 1)
		var o = dialogs.get(dd)
		if _is_obj(o) and _is_obj((o as Dictionary).get("nodes")) and (o["nodes"] as Dictionary).has(n):
			return { "dialog": dd, "node": n }
	return null

static func create_runner(opts: Dictionary) -> Runner:
	last_error = ""
	var data = opts.get("data")
	if not _is_obj(data) or not _is_obj((data as Dictionary).get("dialogs")):
		_fail("dialog: createRunner needs data with dialogs")
		return null
	var st = opts.get("state")
	if not _is_obj(st):
		st = create_dialog_state()
	else:
		for k in ["flags", "trust", "seen"]:
			if not _is_obj(st.get(k)):
				st[k] = {}
		if typeof(st.get("items")) != TYPE_ARRAY:
			st["items"] = []
		if not st.has("v"):
			st["v"] = SAVE_VERSION
	var r = Runner.new()
	r.data = data
	r.st = st
	r.ctx_v = opts.get("ctx", {})
	r.hooks = opts.get("hooks")
	return r

class Runner:
	extends RefCounted
	var data: Dictionary
	var st: Dictionary
	var ctx_v = null  # Dictionary, or a Callable returning one (read each time it is needed)
	var hooks = null  # Callable(name, arg), or { onHook: Callable }
	var fns: Array = []
	var cur = null  # { dialog, node } or null
	var quiet := true
	var error := ""

	var running: bool:
		get:
			return cur != null
	var state: Dictionary:
		get:
			return st

	func get_ctx():
		return (ctx_v as Callable).call() if typeof(ctx_v) == TYPE_CALLABLE else ctx_v

	func _node_of(p: Dictionary) -> Dictionary:
		return data["dialogs"][p["dialog"]]["nodes"][p["node"]]

	func _visible(n: Dictionary) -> Array:
		var out: Array = []
		if typeof(n.get("choices")) == TYPE_ARRAY:
			for ch in n["choices"]:
				if CadetDialogEngine._eval_cond(ch.get("if") if CadetDialogEngine._is_obj(ch) else null, st, get_ctx()):
					out.append(ch)
		return out

	func _keys_of(n: Dictionary) -> Array:
		var out: Array = []
		if typeof(n.get("keys")) == TYPE_ARRAY:
			for k in n["keys"]:
				if CadetDialogEngine._eval_cond(k.get("if") if CadetDialogEngine._is_obj(k) else null, st, get_ctx()):
					out.append(k)
		return out

	# from `target` (seen from dialog `from`), skip the nodes whose `if` is false → the node to show, or END.
	# On bad data: error is set and null returned (the original throws).
	func _settle(from: String, target, why: String):
		var p = CadetDialogEngine.resolve_target(data, from, target)
		var hops = 0
		var tgt = target
		var w = why
		while true:
			if typeof(p) == TYPE_STRING and String(p) == CadetDialogEngine.END:
				return CadetDialogEngine.END
			if p == null:
				error = "dialog: %s leads to \"%s\", which does not exist" % [w, str(tgt)]
				return null
			var n = _node_of(p)
			CadetDialogEngine.last_error = ""
			if CadetDialogEngine._eval_cond(n.get("if"), st, get_ctx()):
				if CadetDialogEngine.last_error != "":
					error = CadetDialogEngine.last_error
					return null
				return p
			if CadetDialogEngine.last_error != "":
				error = CadetDialogEngine.last_error
				return null
			hops += 1
			if hops > CadetDialogEngine.MAX_HOPS:
				error = "dialog: more than %d skipped nodes in a row near %s:%s (a loop of if → next?)" % [CadetDialogEngine.MAX_HOPS, p["dialog"], p["node"]]
				return null
			var t = n["else"] if n.has("else") else n.get("next")
			if t == null and not n.has("else") and not n.has("next"):
				error = "dialog: %s:%s is skipped but has neither else nor next" % [p["dialog"], p["node"]]
				return null
			w = "%s:%s" % [p["dialog"], p["node"]]
			tgt = t
			p = CadetDialogEngine.resolve_target(data, String(p["dialog"]), t)
		return null

	func _emit() -> void:
		var v = view()
		if v == null and quiet:
			return
		quiet = v == null
		for f in fns.duplicate():
			(f as Callable).call(v)

	func _show(p: Dictionary) -> void:
		cur = p
		var n = _node_of(p)
		st["seen"]["%s:%s" % [p["dialog"], p["node"]]] = true
		CadetDialogEngine.apply_effects(n.get("effects"), st, hooks)
		if CadetDialogEngine.last_error != "":
			error = CadetDialogEngine.last_error
		if CadetDialogEngine._is_obj(n.get("hook")):
			CadetDialogEngine._call_hook(hooks, String(n["hook"].get("name", "")), n["hook"].get("arg"))

	func _finish() -> void:
		cur = null
		_emit()

	# a step that fails ends the conversation (original step()), then the error is readable in `error`
	func _step_ok() -> bool:
		if error != "":
			cur = null
			_emit()
			return false
		_emit()
		return true

	func _go(from: String, target, why: String) -> void:
		var p = _settle(from, target, why)
		if error != "":
			return
		if typeof(p) == TYPE_STRING and String(p) == CadetDialogEngine.END:
			cur = null
		else:
			_show(p)

	func view():
		if cur == null:
			return null
		var n = _node_of(cur)
		var c = get_ctx()
		var sp = null
		if CadetDialogEngine._is_obj(data.get("speakers")) and (data["speakers"] as Dictionary).has(n.get("speaker")):
			sp = data["speakers"][n["speaker"]]
		var vis = _visible(n)
		var choices: Array = []
		for i in vis.size():
			choices.append({ "i": i, "text": CadetDialogEngine.fill(vis[i].get("text"), c) })
		var ends = true
		if typeof(n.get("choices")) == TYPE_ARRAY:
			ends = choices.is_empty()
		elif n.get("end") != true and n.has("next"):
			var save_err = error
			var p = _settle(String(cur["dialog"]), n["next"], "")
			if error != "":
				ends = false
				error = save_err
			else:
				ends = typeof(p) == TYPE_STRING and String(p) == CadetDialogEngine.END
		var out = { "dialog": cur["dialog"], "node": cur["node"], "speaker": n.get("speaker"),
			"name": String(sp["name_ja"]) if CadetDialogEngine._is_obj(sp) and sp.get("name_ja") != null else "",
			"color": sp.get("color") if CadetDialogEngine._is_obj(sp) else null,
			"text": CadetDialogEngine.fill(n.get("text"), c), "choices": choices, "ends": ends }
		if typeof(n.get("keys")) == TYPE_ARRAY:
			var ks: Array = []
			for k in _keys_of(n):
				ks.append({ "key": k.get("key"), "text": CadetDialogEngine.fill(k.get("text"), c) })
			out["keys"] = ks
		if n.has("en"):
			out["en"] = CadetDialogEngine.fill(n["en"], c)
		if n.has("tag"):
			out["tag"] = n["tag"]
		return out

	func start(dialog_id: String, node_id = null) -> bool:
		error = ""
		if not (data["dialogs"] as Dictionary).has(dialog_id):
			error = "dialog: unknown dialog \"%s\"" % dialog_id
			_finish()
			return false
		var start_node = node_id if node_id != null else data["dialogs"][dialog_id].get("start")
		var p = _settle(dialog_id, start_node, "the start of %s" % dialog_id)
		if error != "":
			_finish()
			return false
		if typeof(p) == TYPE_STRING and String(p) == CadetDialogEngine.END:
			_finish()
			return false
		_show(p)
		_step_ok()
		return cur != null

	func next() -> bool:
		if cur == null:
			return false
		error = ""
		var n = _node_of(cur)
		var at = "%s:%s" % [cur["dialog"], cur["node"]]
		if not _visible(n).is_empty():
			return false
		if n.get("end") == true or not n.has("next"):
			_finish()
			return true
		_go(String(cur["dialog"]), n["next"], at)
		_step_ok()
		return true

	func choose(i: int) -> bool:
		if cur == null:
			return false
		error = ""
		var vis = _visible(_node_of(cur))
		if i < 0 or i >= vis.size():
			return false
		var ch = vis[i]
		var from = String(cur["dialog"])
		var at = "%s:%s (choice %d)" % [cur["dialog"], cur["node"], i + 1]
		CadetDialogEngine.apply_effects(ch.get("effects"), st, hooks)
		if CadetDialogEngine.last_error != "":
			error = CadetDialogEngine.last_error
		if error == "":
			_go(from, ch.get("next"), at)
		_step_ok()
		return true

	func press(key: String) -> bool:
		if cur == null:
			return false
		error = ""
		var n = _node_of(cur)
		var found = null
		for k in _keys_of(n):
			if String(k.get("key", "")) == key:
				found = k
				break
		if found == null or not _visible(n).is_empty():
			return false
		var from = String(cur["dialog"])
		var at = "%s:%s (key %s)" % [cur["dialog"], cur["node"], key]
		CadetDialogEngine.apply_effects(found.get("effects"), st, hooks)
		if CadetDialogEngine.last_error != "":
			error = CadetDialogEngine.last_error
		if error == "":
			_go(from, found.get("next"), at)
		_step_ok()
		return true

	func stop() -> void:
		_finish()

	func on_change(fn: Callable) -> Callable:
		fns.append(fn)
		return func() -> void: fns.erase(fn)
