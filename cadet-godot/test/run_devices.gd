extends SceneTree

## CADET Godot port — Phase 4, item 4 (device separation) test runner.
## Usage: godot --headless --path <project> -s test/run_devices.gd
## Exit code: 0 = all pass, 1 = failures.
##
## Verifies src/device_map.gd (CadetDeviceMap) against the HTML original's
## device-assignment semantics (cadet-wt-gameq dea08a5 / pads.test.mjs):
## assignments follow the DEVICE (identity, partial match; same-name units
## told apart by guid), an assigned-but-absent device resolves to -1 with
## NO fallback to another device, unassigned roles keep the HTML defaults
## (yoke / pedals = first device, throttle = none), settings round-trip
## through user://cadet_settings.cfg [devices] without disturbing [ai],
## merge_axes composes channels from the right devices, and the settings
## UI builds headless. There are NO physical pads in this environment:
## every device list below is a fake, and list/describe are only checked
## for consistency with Input.get_connected_joypads() (expected: empty).

const DeviceMap = preload("res://src/device_map.gd")

var checks := 0
var failures := 0

func _chk(cond: bool, name: String) -> void:
	checks += 1
	if not cond:
		failures += 1
		print("FAIL " + name)

func _eq(got, want, name: String) -> void:
	checks += 1
	if got != want:
		failures += 1
		print("FAIL %s: got %s want %s" % [name, str(got), str(want)])

func _eqf(got: float, want: float, name: String) -> void:
	checks += 1
	if absf(got - want) > 1e-9:
		failures += 1
		print("FAIL %s: got %s want %s" % [name, str(got), str(want)])

func _dev(index: int, name: String, guid: String) -> Dictionary:
	return {"index": index, "name": name, "guid": guid, "identity": DeviceMap.make_identity(name, guid)}

func _init() -> void:
	_test_identity()
	_test_resolve_exact_and_partial()
	_test_resolve_absent_no_fallback()
	_test_resolve_same_name_guid()
	_test_resolve_unassigned_defaults()
	_test_register_role()
	_test_persistence()
	_test_merge_axes()
	_test_live_list_zero_pads()
	_test_ui_smoke()
	print("== Phase 4 devices total: %d checks, %d failures" % [checks, failures])
	quit(1 if failures > 0 else 0)

# ------------------------------------------------------------ identity strings
func _test_identity() -> void:
	_eq(DeviceMap.make_identity("Yoke Pro", "guid-1"), "Yoke Pro|guid-1", "identity name|guid")
	_eq(DeviceMap.make_identity("Yoke Pro", ""), "Yoke Pro", "identity without guid is the name")
	var p := DeviceMap.parse_identity("Yoke Pro|guid-1")
	_eq(String(p["name"]), "Yoke Pro", "parse name")
	_eq(String(p["guid"]), "guid-1", "parse guid")
	var p2 := DeviceMap.parse_identity("Plain Name")
	_eq(String(p2["guid"]), "", "parse no-guid")
	_eq(DeviceMap.entry_identity({"name": "A", "guid": "g"}), "A|g", "entry identity computed")

# ------------------------------------------------------------ resolve: matching
func _test_resolve_exact_and_partial() -> void:
	var yoke := _dev(0, "Virtual Yoke Pro (Vendor: 068e)", "g-yoke")
	var pedals := _dev(1, "Sim Pedals USB", "g-pedals")
	var quad := _dev(2, "Twin Quadrant TQ6", "g-quad")
	# exact full identity
	var dm = DeviceMap.new()
	dm.set_assignment("yoke", DeviceMap.make_identity("Virtual Yoke Pro (Vendor: 068e)", "g-yoke"))
	dm.set_assignment("pedals", DeviceMap.make_identity("Sim Pedals USB", "g-pedals"))
	dm.set_assignment("throttle", DeviceMap.make_identity("Twin Quadrant TQ6", "g-quad"))
	var r := dm.resolve([yoke, pedals, quad])
	_eq(int(r["yoke"]), 0, "exact: yoke -> 0")
	_eq(int(r["pedals"]), 1, "exact: pedals -> 1")
	_eq(int(r["throttle"]), 2, "exact: throttle -> 2")
	# order shuffle: the assignment follows the device, not the slot
	var r2 := dm.resolve([quad, yoke, pedals])
	_eq(int(r2["yoke"]), 0, "shuffled exact: yoke follows to its new slot (device id 0)")
	_eq(int(r2["pedals"]), 1, "shuffled exact: pedals (device id 1)")
	_eq(int(r2["throttle"]), 2, "shuffled exact: throttle (device id 2)")
	# (device ids above are stable per device; enumeration ORDER changed only)
	# partial match: a name fragment, like the HTML pads.test MAP3 ids
	var dm2 = DeviceMap.new()
	dm2.set_assignment("yoke", "Yoke")
	dm2.set_assignment("pedals", "Pedals")
	dm2.set_assignment("throttle", "Quadrant")
	var r3 := dm2.resolve([quad, pedals, yoke])
	_eq(int(r3["yoke"]), 0, "partial: 'Yoke' fragment finds the yoke")
	_eq(int(r3["pedals"]), 1, "partial: 'Pedals' fragment")
	_eq(int(r3["throttle"]), 2, "partial: 'Quadrant' fragment")
	# case-insensitive partial match
	var dm3 = DeviceMap.new()
	dm3.set_assignment("yoke", "yoke pro")
	_eq(int(dm3.resolve([pedals, yoke])["yoke"]), 0, "partial: case-insensitive")
	# name-only full identity (no guid recorded) still matches its device
	var dm4 = DeviceMap.new()
	dm4.set_assignment("yoke", "Virtual Yoke Pro (Vendor: 068e)")
	_eq(int(dm4.resolve([pedals, yoke])["yoke"]), 0, "name-only identity matches")

# ------------------------------------------------- resolve: absent, no fallback
func _test_resolve_absent_no_fallback() -> void:
	var yoke := _dev(0, "Virtual Yoke Pro", "g-yoke")
	var pedals := _dev(1, "Sim Pedals USB", "g-pedals")
	var dm = DeviceMap.new()
	dm.set_assignment("throttle", DeviceMap.make_identity("Twin Quadrant TQ6", "g-quad"))
	dm.set_assignment("yoke", DeviceMap.make_identity("Virtual Yoke Pro", "g-yoke"))
	var r := dm.resolve([yoke, pedals])  # quadrant unplugged
	_eq(int(r["throttle"]), -1, "absent assigned device -> -1 (no fallback to yoke/pedals)")
	_eq(int(r["yoke"]), 0, "present assigned device still resolves")
	# a fragment that matches nothing also resolves to -1, not to device 0
	var dm2 = DeviceMap.new()
	dm2.set_assignment("pedals", "No Such Device")
	_eq(int(dm2.resolve([yoke, pedals])["pedals"]), -1, "unmatched fragment -> -1, no fallback")
	# assigned role with zero connected devices
	_eq(int(dm2.resolve([])["pedals"]), -1, "zero devices: assigned role -> -1")

# ------------------------------------------- resolve: same name, told by guid
func _test_resolve_same_name_guid() -> void:
	var a := _dev(3, "Generic Pad", "guid-AAA")
	var b := _dev(5, "Generic Pad", "guid-BBB")
	var dm = DeviceMap.new()
	dm.set_assignment("yoke", DeviceMap.make_identity("Generic Pad", "guid-BBB"))
	_eq(int(dm.resolve([a, b])["yoke"]), 5, "same name: guid-BBB picks the second unit")
	_eq(int(dm.resolve([b, a])["yoke"]), 5, "same name: guid pick survives order shuffle")
	var dm2 = DeviceMap.new()
	dm2.set_assignment("yoke", DeviceMap.make_identity("Generic Pad", "guid-AAA"))
	_eq(int(dm2.resolve([a, b])["yoke"]), 3, "same name: guid-AAA picks the first unit")
	# a guid-carrying assignment must NOT match the other unit's name alone
	_chk(DeviceMap.match_score(DeviceMap.make_identity("Generic Pad", "guid-BBB"), a) == 0, "guid assignment scores 0 against the wrong unit")
	_chk(DeviceMap.match_score("Generic Pad", a) > 0, "name-only assignment matches either unit by name")

# ------------------------------------------------ resolve: unassigned defaults
func _test_resolve_unassigned_defaults() -> void:
	var yoke := _dev(0, "Any Pad", "g0")
	var other := _dev(1, "Other Pad", "g1")
	var dm = DeviceMap.new()
	var r := dm.resolve([yoke, other])
	_eq(int(r["yoke"]), 0, "unassigned yoke: HTML pad=-1 -> first device")
	_eq(int(r["pedals"]), 0, "unassigned pedals: HTML pad=-1 -> first device")
	_eq(int(r["throttle"]), -1, "unassigned throttle: HTML thr entries are null -> no device")
	var r0 := dm.resolve([])
	_eq(int(r0["yoke"]), -1, "zero devices: unassigned yoke -> -1")
	_eq(int(r0["pedals"]), -1, "zero devices: unassigned pedals -> -1")
	_eq(int(r0["throttle"]), -1, "zero devices: unassigned throttle -> -1")
	# clearing an assignment restores the default behaviour
	dm.set_assignment("throttle", DeviceMap.make_identity("Other Pad", "g1"))
	_eq(int(dm.resolve([yoke, other])["throttle"]), 1, "assigned throttle resolves")
	dm.clear_assignment("throttle")
	_eq(int(dm.resolve([yoke, other])["throttle"]), -1, "cleared throttle back to default none")

# ------------------------------------------------------------- extensibility
func _test_register_role() -> void:
	var dm = DeviceMap.new()
	dm.register_role("mixture", "none", {"mixture": 4})
	_chk(dm.roles().has("mixture"), "register_role adds the role")
	var pad := _dev(0, "Mixture Box", "gm")
	dm.set_assignment("mixture", DeviceMap.make_identity("Mixture Box", "gm"))
	_eq(int(dm.resolve([pad])["mixture"]), 0, "registered role resolves")
	_eq(int(dm.get_axis_map("mixture")["mixture"]), 4, "registered role keeps its axis defaults")

# --------------------------------------------------------------- persistence
func _test_persistence() -> void:
	var path := "user://cadet_settings_test_devices.cfg"
	var abs_path := ProjectSettings.globalize_path(path)
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(abs_path)
	# a pre-existing [ai] section must survive a [devices] save
	var pre := ConfigFile.new()
	pre.set_value("ai", "api_key", "dummy-for-test")
	_eq(pre.save(path), OK, "seed settings file with [ai]")
	var dm = DeviceMap.new(path)
	dm.set_assignment("yoke", "Virtual Yoke Pro|g-yoke")
	dm.set_assignment("throttle", "Twin Quadrant TQ6|g-quad")
	_chk(dm.set_axis("pedals", "rudder", 0), "set_axis pedals rudder 0")
	_chk(dm.set_axis("throttle", "mixture", 5), "set_axis throttle mixture 5")
	_chk(not dm.set_axis("throttle", "mixture", 99), "set_axis rejects out-of-range axis")
	_chk(dm.save_settings(), "save_settings returns true")
	# sibling section preserved?
	var chk := ConfigFile.new()
	_eq(chk.load(path), OK, "settings file reloads")
	_eq(String(chk.get_value("ai", "api_key", "")), "dummy-for-test", "[ai] section preserved by [devices] save")
	# fresh instance = a "restart": assignments + axis maps round-trip
	var dm2 = DeviceMap.new(path)
	_chk(dm2.load_settings(), "load_settings returns true")
	_eq(dm2.get_assignment("yoke"), "Virtual Yoke Pro|g-yoke", "roundtrip yoke assignment")
	_eq(dm2.get_assignment("throttle"), "Twin Quadrant TQ6|g-quad", "roundtrip throttle assignment")
	_eq(dm2.get_assignment("pedals"), "", "roundtrip pedals stays unassigned")
	_eq(int(dm2.get_axis_map("pedals")["rudder"]), 0, "roundtrip pedals rudder axis")
	_eq(int(dm2.get_axis_map("throttle")["mixture"]), 5, "roundtrip throttle mixture axis")
	_eq(int(dm2.get_axis_map("yoke")["yoke_x"]), 0, "roundtrip yoke default axis kept")
	# missing file: load fails cleanly, defaults intact
	var dm3 = DeviceMap.new("user://cadet_settings_test_devices_missing.cfg")
	_chk(not dm3.load_settings(), "load_settings on missing file -> false")
	_eq(dm3.get_assignment("yoke"), "", "missing file: no assignments")
	_eq(int(dm3.get_axis_map("throttle")["throttle"]), 0, "missing file: default axis maps intact")
	DirAccess.remove_absolute(abs_path)
	_chk(not FileAccess.file_exists(path), "test settings file cleaned up")

# ----------------------------------------------------------------- merge_axes
var _fake_axes := {}

func _reader(dev: int, axis: int) -> float:
	return float(_fake_axes.get("%d:%d" % [dev, axis], 0.0))

func _test_merge_axes() -> void:
	var yoke := _dev(0, "Yoke", "gy")
	var pedals := _dev(1, "Pedals", "gp")
	var quad := _dev(2, "Quadrant", "gq")
	var connected := [yoke, pedals, quad]
	_fake_axes = {
		"0:0": 0.5, "0:1": -0.25, # yoke x / y
		"1:2": 0.75, # pedals rudder (default axis 2)
		"2:0": 0.9, "2:1": 0.4, "2:2": -0.6, # quadrant throttle / prop / mixture
	}
	var dm = DeviceMap.new()
	var resolution := {"yoke": 0, "pedals": 1, "throttle": 2}
	var merged := DeviceMap.merge_axes(connected, resolution, dm.axis_maps, Callable(self, "_reader"))
	_eqf(float(merged["yoke_x"]), 0.5, "merge yoke_x from the yoke device axis 0")
	_eqf(float(merged["yoke_y"]), -0.25, "merge yoke_y from the yoke device axis 1")
	_eqf(float(merged["rudder"]), 0.75, "merge rudder from the pedals device axis 2")
	_eqf(float(merged["throttle"]), 0.9, "merge throttle from the quadrant axis 0")
	_eqf(float(merged["prop"]), 0.4, "merge prop from the quadrant axis 1")
	_eqf(float(merged["mixture"]), -0.6, "merge mixture from the quadrant axis 2")
	# role resolved to -1 (device absent): its channels stay 0 even though
	# other devices HAVE values on the same axis numbers — no fall-through
	var merged2 := DeviceMap.merge_axes(connected, {"yoke": 0, "pedals": 1, "throttle": -1}, dm.axis_maps, Callable(self, "_reader"))
	_eqf(float(merged2["throttle"]), 0.0, "merge: unresolved throttle contributes nothing")
	_eqf(float(merged2["yoke_x"]), 0.5, "merge: other roles unaffected")
	# resolution pointing at a device that is not in the connected list
	var merged3 := DeviceMap.merge_axes(connected, {"yoke": 9, "pedals": 1, "throttle": 2}, dm.axis_maps, Callable(self, "_reader"))
	_eqf(float(merged3["yoke_x"]), 0.0, "merge: index outside the connected list reads 0")
	# custom axis map + inversion spec
	var custom := {"pedals": {"rudder": {"axis": 0, "inv": true}}}
	_fake_axes["1:0"] = 0.3
	var merged4 := DeviceMap.merge_axes(connected, {"pedals": 1}, custom, Callable(self, "_reader"))
	_eqf(float(merged4["rudder"]), -0.3, "merge: dict spec axis + inv honoured")
	_eqf(float(merged4["yoke_x"]), 0.0, "merge: unmapped channels are 0")
	# no devices / invalid reader
	var merged5 := DeviceMap.merge_axes([], {"yoke": 0}, dm.axis_maps, Callable(self, "_reader"))
	_eqf(float(merged5["yoke_x"]), 0.0, "merge: empty connected list -> zeros")
	var merged6 := DeviceMap.merge_axes(connected, resolution, dm.axis_maps, Callable())
	_eqf(float(merged6["rudder"]), 0.0, "merge: invalid reader -> zeros")
	# values are clamped to [-1, 1]
	_fake_axes["0:0"] = 2.5
	var merged7 := DeviceMap.merge_axes(connected, {"yoke": 0}, dm.axis_maps, Callable(self, "_reader"))
	_eqf(float(merged7["yoke_x"]), 1.0, "merge: output clamped to 1.0")

# ------------------------------------------------------- live list (no pads here)
func _test_live_list_zero_pads() -> void:
	var live := DeviceMap.list_connected()
	_eq(live.size(), Input.get_connected_joypads().size(), "list_connected matches Input's joypad count")
	var desc := DeviceMap.describe_connected()
	_eq(desc.size(), live.size(), "describe_connected has one line per device")
	if live.is_empty():
		_chk(desc.is_empty(), "no pads in this environment: describe is empty")
		var dm = DeviceMap.new()
		var r := dm.resolve(live)
		_eq(int(r["yoke"]), -1, "no pads: resolve yoke -1")
		_eq(int(r["throttle"]), -1, "no pads: resolve throttle -1")
	else:
		for e in live:
			_chk(String(e.get("identity", "")) == DeviceMap.make_identity(String(e["name"]), String(e["guid"])), "live entry identity well-formed")

# ------------------------------------------------------------------- UI smoke
func _collect_option_buttons(n: Node, out: Array) -> void:
	if n is OptionButton:
		out.append(n)
	for c in n.get_children():
		_collect_option_buttons(c, out)

func _test_ui_smoke() -> void:
	var path := "user://cadet_settings_test_devices_ui.cfg"
	var abs_path := ProjectSettings.globalize_path(path)
	if FileAccess.file_exists(path):
		DirAccess.remove_absolute(abs_path)
	var dm = DeviceMap.new(path)
	# an assignment to a device that is NOT connected must still be offered
	dm.set_assignment("yoke", "Ghost Yoke|g-ghost")
	var ui = DeviceMap.build_settings_ui(dm)
	_chk(ui != null and ui is Control, "build_settings_ui returns a Control")
	_eq(ui.name, "CadetDeviceSettings", "UI root name")
	var obs: Array = []
	_collect_option_buttons(ui, obs)
	_eq(obs.size(), dm.roles().size(), "one OptionButton per role")
	for ob in obs:
		_chk((ob as OptionButton).item_count >= 1, "OptionButton for %s has the none/default entry" % ob.name)
	# the yoke button carries the unconnected assignment as a selectable item
	var yoke_ob: OptionButton = null
	for ob in obs:
		if String(ob.get_meta("role")) == "yoke":
			yoke_ob = ob
	_chk(yoke_ob != null, "yoke OptionButton found")
	if yoke_ob != null:
		var ghost_idx := -1
		for i in yoke_ob.item_count:
			if String(yoke_ob.get_item_metadata(i)) == "Ghost Yoke|g-ghost":
				ghost_idx = i
		_chk(ghost_idx >= 0, "unconnected assignment offered in the yoke OptionButton")
		_eq(yoke_ob.selected, ghost_idx, "unconnected assignment is the selected item")
		# picking "なし/既定" (item 0) clears the assignment and saves
		yoke_ob.item_selected.emit(0)
		_eq(dm.get_assignment("yoke"), "", "UI selection clears the assignment")
		_chk(FileAccess.file_exists(path), "UI selection saved the settings file")
		var dm2 = DeviceMap.new(path)
		_chk(dm2.load_settings(), "UI-saved file loads")
		_eq(dm2.get_assignment("yoke"), "", "cleared assignment persisted")
	ui.free()
	DirAccess.remove_absolute(abs_path)
