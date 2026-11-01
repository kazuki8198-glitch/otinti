class_name CadetDeviceMap
extends RefCounted

## CADET Godot port — Phase 4, item 4: flight devices assigned by IDENTITY,
## not by enumeration slot.
##
## Port of the HTML game-quality wave item 3 (cadet-wt-gameq commit dea08a5,
## "gamepads assigned by device, not by slot number"). In the HTML original a
## padMap entry may name its device (`id`, matched as a substring of the
## gamepad's own id string): the axis then follows the device wherever the
## browser enumerates it after a reconnect, and a named device that is not
## connected reads as NO axis at all instead of falling through to another
## device's same-numbered axis. The settings editor offers each connected
## device by name next to the pad numbers.
##
## Godot has no single browser-style id string, so a device identity here is
## built from Input.get_joy_name(device) + Input.get_joy_guid(device):
##     identity = "<joy name>|<joy guid>"
## The guid is what tells two identical models apart (same name, different
## unit); a bare name fragment still matches by partial (substring) match,
## exactly like the original's `p.id.toLowerCase().includes(want)`.
##
## Roles (extensible via register_role): "yoke" / "pedals" / "throttle".
## An assignment maps a role to a device identity string ("" = unassigned).
##
## Unassigned-role defaults follow the HTML original (PADMAP0 in
## controls.js): the functions on the standard map (pitch / roll / yaw /
## trim — here the yoke and pedals roles) have pad = -1, i.e. "any pad",
## which in practice reads the FIRST enumerated pad; the quadrant levers
## (thr / thrL / thrR) and toe brakes are null = unmapped, so the throttle
## role defaults to NO device (-1) until the player assigns one.
##
## Persistence: user://cadet_settings.cfg, section [devices] — the same
## file CadetAiInstructor uses for [ai] api_key. Saving preserves every
## other section; only [devices] is rewritten. The path is replaceable
## (constructor argument / `settings_path`) so tests never touch the real
## settings file.
##
## This class does NOT read live axes itself except through the injected
## reader Callable in merge_axes(), so all of the resolution / merging
## logic is unit-testable headless with fake device lists. Wiring it into
## src/input_map.gd's read_pad (and scenes/main.gd) is the integrator's
## step — see PHASE4-DEVICES-NOTES.md.

const DEFAULT_SETTINGS_PATH := "user://cadet_settings.cfg"
const SECTION := "devices"

const ROLE_YOKE := "yoke"
const ROLE_PEDALS := "pedals"
const ROLE_THROTTLE := "throttle"

## Default policy for an UNASSIGNED role: "any" = first connected device
## (HTML pad = -1), "none" = no device (HTML null entry).
const DEFAULT_POLICIES := {
	ROLE_YOKE: "any",
	ROLE_PEDALS: "any",
	ROLE_THROTTLE: "none",
}

## Default per-role axis maps: role -> { channel: axis index }.
## yoke / pedals keep the legacy single-pad layout of input_map.read_pad
## and controls PADMAP0 (left stick 0/1 = yoke, right-stick X 2 = rudder),
## so one standard pad behaves exactly as before when every role resolves
## to it. A separate pedal set whose rudder is on a different axis is one
## set_axis() call away. The quadrant's levers are axes 0/1/2 on typical
## hardware (throttle / prop / mixture, in lever order).
const DEFAULT_AXIS_MAPS := {
	ROLE_YOKE: {"yoke_x": 0, "yoke_y": 1},
	ROLE_PEDALS: {"rudder": 2},
	ROLE_THROTTLE: {"throttle": 0, "prop": 1, "mixture": 2},
}

## The channels merge_axes() can produce, and the role that normally
## supplies each. (merge_axes itself trusts axis_maps: any role may supply
## any of these channels if the player maps it so.)
const OUTPUT_CHANNELS: Array[String] = ["yoke_x", "yoke_y", "rudder", "throttle", "prop", "mixture"]
const CHANNEL_ROLE := {
	"yoke_x": ROLE_YOKE, "yoke_y": ROLE_YOKE,
	"rudder": ROLE_PEDALS,
	"throttle": ROLE_THROTTLE, "prop": ROLE_THROTTLE, "mixture": ROLE_THROTTLE,
}

const ROLE_LABELS := {
	ROLE_YOKE: "ヨーク (yoke)",
	ROLE_PEDALS: "ペダル (pedals)",
	ROLE_THROTTLE: "スロットル (throttle)",
}

var settings_path := DEFAULT_SETTINGS_PATH
## role -> identity String ("" / missing = unassigned)
var assignments: Dictionary = {}
## role -> { channel: axis index (int) }
var axis_maps: Dictionary = {}

var _roles: Array[String] = [ROLE_YOKE, ROLE_PEDALS, ROLE_THROTTLE]
var _policies: Dictionary = {}

func _init(p_settings_path: String = DEFAULT_SETTINGS_PATH) -> void:
	if not p_settings_path.is_empty():
		settings_path = p_settings_path
	_policies = DEFAULT_POLICIES.duplicate()
	axis_maps = DEFAULT_AXIS_MAPS.duplicate(true)

# ------------------------------------------------------------------ roles
## The known roles, in display / resolution order.
func roles() -> Array:
	return _roles.duplicate()

## Register an additional role (e.g. a future "mixture" quadrant split out
## of "throttle"). default_policy is "any" (first device) or "none" (no
## device until assigned) for the unassigned case; axes is an optional
## { channel: axis } default map.
func register_role(role: String, default_policy: String = "none", axes: Dictionary = {}) -> void:
	if role.is_empty():
		return
	if not _roles.has(role):
		_roles.append(role)
	_policies[role] = "any" if default_policy == "any" else "none"
	if not axes.is_empty():
		axis_maps[role] = axes.duplicate(true)
	elif not axis_maps.has(role):
		axis_maps[role] = {}

func default_policy(role: String) -> String:
	return String(_policies.get(role, "none"))

# -------------------------------------------------------------- assignments
func set_assignment(role: String, identity: String) -> void:
	if role.is_empty():
		return
	register_role(role, default_policy(role))
	if identity.strip_edges().is_empty():
		assignments.erase(role)
	else:
		assignments[role] = identity.strip_edges()

func get_assignment(role: String) -> String:
	return String(assignments.get(role, ""))

func is_assigned(role: String) -> bool:
	return not get_assignment(role).is_empty()

func clear_assignment(role: String) -> void:
	assignments.erase(role)

# ---------------------------------------------------------------- axis maps
func set_axis(role: String, channel: String, axis: int) -> bool:
	if role.is_empty() or channel.is_empty() or axis < 0 or axis > 15:
		return false
	register_role(role, default_policy(role))
	var m: Dictionary = axis_maps.get(role, {})
	m = (m as Dictionary).duplicate()
	m[channel] = axis
	axis_maps[role] = m
	return true

func get_axis_map(role: String) -> Dictionary:
	var m = axis_maps.get(role, {})
	return (m as Dictionary).duplicate() if typeof(m) == TYPE_DICTIONARY else {}

# ----------------------------------------------------------------- identity
## Build the identity string for one device from its joy name and guid.
static func make_identity(joy_name: String, guid: String) -> String:
	if guid.is_empty():
		return joy_name
	return joy_name + "|" + guid

## Split an identity back into { name, guid } (guid "" when absent).
static func parse_identity(identity: String) -> Dictionary:
	var i := identity.rfind("|")
	if i < 0:
		return {"name": identity, "guid": ""}
	return {"name": identity.substr(0, i), "guid": identity.substr(i + 1)}

## The identity of a connected-device entry ({index, name, guid, ...}),
## computing it when the entry does not carry one.
static func entry_identity(entry: Dictionary) -> String:
	var id := String(entry.get("identity", ""))
	if not id.is_empty():
		return id
	return make_identity(String(entry.get("name", "")), String(entry.get("guid", "")))

## How well a stored assignment matches one connected device.
## 0 = no match. Higher wins; resolve() keeps the earliest entry on a tie.
##   100 exact identity, 90 guid exact (the same physical unit, even if the
##       reported name drifted), 80 name exact, 60 the device identity
##       contains the assignment (a name fragment, the HTML rule),
##       50 the assignment contains the device name (a full identity whose
##       guid the OS stopped reporting, etc.).
## An assignment that carries a guid NEVER matches a different guid: that
## is what keeps two same-name devices apart.
static func match_score(assignment: String, entry: Dictionary) -> int:
	var want := assignment.strip_edges()
	if want.is_empty():
		return 0
	var name := String(entry.get("name", ""))
	var guid := String(entry.get("guid", ""))
	var ident := entry_identity(entry)
	if ident == want:
		return 100
	var wp := parse_identity(want)
	var wguid := String(wp["guid"])
	var wname := String(wp["name"])
	if not wguid.is_empty():
		if guid != wguid:
			return 0
		if wname.is_empty() or name == wname:
			return 90
		if name.to_lower().contains(wname.to_lower()) or wname.to_lower().contains(name.to_lower()):
			return 90
		return 0
	var wl := want.to_lower()
	if not name.is_empty() and name.to_lower() == wl:
		return 80
	if ident.to_lower().contains(wl) or name.to_lower().contains(wl):
		return 60
	if not name.is_empty() and name.length() >= 3 and wl.contains(name.to_lower()):
		return 50
	return 0

static func identity_matches(assignment: String, entry: Dictionary) -> bool:
	return match_score(assignment, entry) > 0

# ------------------------------------------------------------ live devices
## [{index, name, guid, identity}] for every connected joypad, in Godot's
## enumeration order. `index` is the joy device id Input.* expects.
static func list_connected() -> Array:
	var out: Array = []
	for dev in Input.get_connected_joypads():
		var nm := Input.get_joy_name(dev)
		var gd := Input.get_joy_guid(dev)
		out.append({"index": int(dev), "name": nm, "guid": gd, "identity": make_identity(nm, gd)})
	return out

## One human-readable line per connected device, for the settings UI:
## "#<index>  <name>  (guid: <guid>)". Empty when nothing is connected.
static func describe_connected() -> PackedStringArray:
	return describe_entries(list_connected())

static func describe_entries(connected: Array) -> PackedStringArray:
	var out := PackedStringArray()
	for e in connected:
		if typeof(e) == TYPE_DICTIONARY:
			out.append("#%d  %s  (guid: %s)" % [int(e.get("index", -1)), String(e.get("name", "")), String(e.get("guid", ""))])
	return out

# ----------------------------------------------------------------- resolve
## role -> connected device index, for the given connected list (entries
## as produced by list_connected(), in enumeration order).
## - Assigned role: the best-matching device (see match_score); when that
##   device is not connected the role resolves to -1 — it does NOT fall
##   back to any other device.
## - Unassigned role: the HTML default — policy "any" roles take the
##   first connected device, policy "none" roles stay -1.
func resolve(connected: Array) -> Dictionary:
	var entries: Array = []
	for e in connected:
		if typeof(e) == TYPE_DICTIONARY:
			entries.append(e)
	var first_index := -1
	if not entries.is_empty():
		first_index = int(entries[0].get("index", -1))
	var out := {}
	for role in _roles:
		var want := get_assignment(role)
		if want.is_empty():
			out[role] = first_index if default_policy(role) == "any" else -1
			continue
		var best := -1
		var best_score := 0
		for e in entries:
			var sc := match_score(want, e)
			if sc > best_score:
				best_score = sc
				best = int(e.get("index", -1))
		out[role] = best
	return out

## Convenience: resolve against the live joypad list.
func resolve_connected() -> Dictionary:
	return resolve(list_connected())

# -------------------------------------------------------------- merge (pure)
## Compose the pilot's axes from per-role devices.
##   connected:  entries as from list_connected() (used to validate that a
##               resolved index really is a connected device)
##   resolution: role -> device index, as from resolve()
##   axis_maps:  role -> { channel: axis index } or
##               role -> { channel: {axis: int, inv: bool} }
##   reader:     Callable(device_index: int, axis_index: int) -> float
## Returns {yoke_x, yoke_y, rudder, throttle, prop, mixture}, every channel
## 0.0 unless its role resolved to a connected device AND that role's axis
## map names the channel AND the reader yields a number. Values are
## clamped to [-1, 1]; no dead zone is applied here (the consumer's
## read_pad path owns dead zones, as controls.gd's _dz does). A role that
## resolved to -1 contributes nothing — never another device's axis.
static func merge_axes(connected: Array, resolution: Dictionary, axis_maps_: Dictionary, reader: Callable) -> Dictionary:
	var out := {}
	for ch in OUTPUT_CHANNELS:
		out[ch] = 0.0
	if not reader.is_valid():
		return out
	var valid := {}
	for e in connected:
		if typeof(e) == TYPE_DICTIONARY:
			valid[int(e.get("index", -1))] = true
		elif typeof(e) == TYPE_INT:
			valid[int(e)] = true
	if valid.is_empty():
		return out
	for role in axis_maps_.keys():
		var dev := int(resolution.get(role, -1))
		if dev < 0 or not valid.has(dev):
			continue
		var m = axis_maps_[role]
		if typeof(m) != TYPE_DICTIONARY:
			continue
		for ch in (m as Dictionary).keys():
			var channel := String(ch)
			if not out.has(channel):
				continue
			var spec = m[ch]
			var axis := -1
			var inv := false
			if typeof(spec) == TYPE_INT or typeof(spec) == TYPE_FLOAT:
				axis = int(spec)
			elif typeof(spec) == TYPE_DICTIONARY:
				axis = int(spec.get("axis", -1))
				inv = bool(spec.get("inv", false))
			if axis < 0:
				continue
			var v = reader.call(dev, axis)
			if typeof(v) != TYPE_INT and typeof(v) != TYPE_FLOAT:
				continue
			var f := float(v)
			if inv:
				f = -f
			out[channel] = clampf(f, -1.0, 1.0)
	return out

## Convenience: merge from THIS map's assignments / axis maps against the
## live device list, reading through the given reader.
func read_merged(reader: Callable) -> Dictionary:
	var connected := list_connected()
	return merge_axes(connected, resolve(connected), axis_maps, reader)

## Convenience reader over Godot's real joy API (for the integrator).
static func live_axis_reader(device_index: int, axis_index: int) -> float:
	return Input.get_joy_axis(device_index, axis_index)

# -------------------------------------------------------------- persistence
## Save assignments + axis maps to [devices] of the settings file. Other
## sections (notably [ai]) are preserved; only [devices] is rewritten.
func save_settings() -> bool:
	var cfg := ConfigFile.new()
	# Load first so sibling sections survive; a missing/corrupt file just
	# means we start from an empty ConfigFile.
	cfg.load(settings_path)
	if cfg.has_section(SECTION):
		cfg.erase_section(SECTION)
	for role in assignments.keys():
		cfg.set_value(SECTION, "assign_" + String(role), String(assignments[role]))
	for role in axis_maps.keys():
		cfg.set_value(SECTION, "axes_" + String(role), JSON.stringify(axis_maps[role]))
	return cfg.save(settings_path) == OK

## Load [devices] from the settings file, replacing assignments and axis
## maps. Returns false when there is no readable file / section (the
## current — usually default — state is then kept untouched).
func load_settings() -> bool:
	var cfg := ConfigFile.new()
	if cfg.load(settings_path) != OK:
		return false
	if not cfg.has_section(SECTION):
		return false
	var new_assign: Dictionary = {}
	var new_axes: Dictionary = DEFAULT_AXIS_MAPS.duplicate(true)
	for key in cfg.get_section_keys(SECTION):
		var ks := String(key)
		if ks.begins_with("assign_"):
			var role := ks.substr("assign_".length())
			var id := String(cfg.get_value(SECTION, ks, "")).strip_edges()
			if not role.is_empty() and not id.is_empty():
				new_assign[role] = id
				if not _roles.has(role):
					register_role(role)
		elif ks.begins_with("axes_"):
			var role2 := ks.substr("axes_".length())
			var parsed = JSON.parse_string(String(cfg.get_value(SECTION, ks, "")))
			if not role2.is_empty() and typeof(parsed) == TYPE_DICTIONARY:
				var m := {}
				for ch in parsed.keys():
					var v = parsed[ch]
					if (typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT) and int(v) >= 0 and int(v) <= 15:
						m[String(ch)] = int(v)
				new_axes[role2] = m
				if not _roles.has(role2):
					register_role(role2)
	assignments = new_assign
	axis_maps = new_axes
	return true

# -------------------------------------------------------------- settings UI
## Settings panel: the connected-device list (name / guid / index) and,
## per role, an OptionButton whose choices are the connected devices plus
## "なし/既定" (item 0). Picking an entry updates dm's assignment and
## saves it. The assignment of a device that is currently unplugged is
## still offered (marked 未接続) so it is not silently lost.
## Safe to build headless / outside the tree: plain Controls only.
static func build_settings_ui(dm: CadetDeviceMap) -> Control:
	var panel := PanelContainer.new()
	panel.name = "CadetDeviceSettings"
	var vbox := VBoxContainer.new()
	vbox.name = "DeviceSettingsVBox"
	panel.add_child(vbox)

	var title := Label.new()
	title.name = "DeviceSettingsTitle"
	title.text = "フライトデバイスの割り当て（機器ごとに指定）"
	vbox.add_child(title)

	var connected := list_connected()
	var lines := describe_entries(connected)
	var list_label := Label.new()
	list_label.name = "ConnectedDevicesList"
	if lines.is_empty():
		list_label.text = "接続中のデバイスはありません"
	else:
		list_label.text = "接続中のデバイス:\n" + "\n".join(lines)
	vbox.add_child(list_label)

	for role in dm.roles():
		var row := HBoxContainer.new()
		row.name = "RoleRow_" + String(role)
		var lab := Label.new()
		lab.text = String(ROLE_LABELS.get(role, role))
		lab.custom_minimum_size = Vector2(180, 0)
		row.add_child(lab)

		var ob := OptionButton.new()
		ob.name = "RoleOption_" + String(role)
		ob.custom_minimum_size = Vector2(360, 0)
		ob.set_meta("role", String(role))
		var none_text := "既定（どのデバイスでも）" if dm.default_policy(role) == "any" else "なし（未割り当て）"
		ob.add_item(none_text)
		ob.set_item_metadata(0, "")
		var selected := 0
		var current := dm.get_assignment(role)
		for i in connected.size():
			var e: Dictionary = connected[i]
			ob.add_item(describe_entries([e])[0])
			ob.set_item_metadata(ob.item_count - 1, entry_identity(e))
			if not current.is_empty() and current == entry_identity(e):
				selected = ob.item_count - 1
		if not current.is_empty() and selected == 0:
			# Assigned but not connected right now: keep it selectable.
			var hit := false
			for j in ob.item_count:
				if String(ob.get_item_metadata(j)) == current:
					selected = j
					hit = true
			if not hit:
				ob.add_item("割り当て中（未接続）: " + current)
				ob.set_item_metadata(ob.item_count - 1, current)
				selected = ob.item_count - 1
		ob.select(selected)
		ob.item_selected.connect(dm.on_ui_role_option_selected.bind(ob, String(role)))
		row.add_child(ob)
		vbox.add_child(row)

	var note := Label.new()
	note.name = "DeviceSettingsNote"
	note.text = "機器名で割り当てると、つなぎ直して並び順が変わっても役割はその機器についていきます。割り当てた機器が未接続の間、その役割は無効になります（他の機器に切り替わりません）。"
	note.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	vbox.add_child(note)
	return panel

## OptionButton handler wired by build_settings_ui: item metadata carries
## the device identity ("" for なし/既定). Updates + persists the map.
func on_ui_role_option_selected(index: int, ob: OptionButton, role: String) -> void:
	var identity := ""
	if ob != null and index >= 0 and index < ob.item_count:
		var md = ob.get_item_metadata(index)
		if typeof(md) == TYPE_STRING:
			identity = String(md)
	set_assignment(role, identity)
	save_settings()
