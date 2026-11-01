class_name EFB
extends Control

## CADET Godot port — Phase 4 (item 5): EFB tablet.
## One Control with three tabs:
##   CHART:     LAB airport diagram drawn in _draw() (RWY 36/18, parallel
##              + connector taxiways, apron, academy / tower / hangar
##              markers, north up). Geometry comes from physics.gd
##              (PAVED / lab_rwy) and world_build.gd (building layout) via
##              the static chart_geometry(), which is unit-testable.
##   WB:        weight & balance. Aircraft / occupants / fuel / baggage
##              inputs feed the EXISTING physics.gd calculation
##              (FlightPhysics.computeWB — nothing is re-implemented);
##              the result text and the CG-envelope plot show the outcome.
##   CHECKLIST: the real checklists from data/content.json
##              (checklistsArcher / checklistsSeminole), phase-switchable
##              with checkable items.
##
## Usage (integration side):
##   var efb := EFB.new()
##   efb.show_tab("WB")
##   efb.set_aircraft("pa28")
##   efb.set_loading({"fuel": "full", "front": 2, "rear": 0, "bagKg": 5.0})
##   var r: Dictionary = efb.current_result()   # == FlightPhysics.computeWB(...)
##   efb.set_checklist("pa44", "runup")
##   efb.item_count()  /  efb.toggle(0)
##
## The loading Dictionary is exactly the physics.gd shape
## ({ fuel: "std"|"full"|"tabs"|"half", front: 0..2, rear: 0..2,
##    bagKg: float }); an optional "fuelGal": [L, R] entry is forwarded
## to computeWB's per-tank override parameter.

const FP = preload("res://src/physics.gd")
const WORLD = preload("res://src/world_build.gd")

const CONTENT_PATH := "res://data/content.json"
const TABS := ["CHART", "WB", "CHECKLIST"]
const FUEL_MODES := ["std", "full", "tabs", "half"]
const FUEL_LABELS := {"std": "標準 (80%)", "full": "満タン", "tabs": "タブス", "half": "半分"}
const TAB_BAR_H := 40.0

# ---------------------------------------------------------------- state
var _tab := "CHART"
# WB state
var _aircraft_id := "pa28"
var _loading_raw: Dictionary = {"fuel": "std", "front": 2, "rear": 0, "bagKg": 0.0}
# Checklist state
var _cl_aircraft := "pa28"
var _cl_phase := "before_start"
var _cl_items: Array = []  # [{ name, value }]
var _cl_checked: Array = []  # [bool]
# UI nodes
var _pages: Dictionary = {}
var _tab_buttons: Dictionary = {}
var _ac_option: OptionButton
var _front_spin: SpinBox
var _rear_spin: SpinBox
var _bag_spin: SpinBox
var _fuel_option: OptionButton
var _wb_result: Label
var _cl_ac_option: OptionButton
var _cl_phase_option: OptionButton
var _cl_title: Label
var _cl_box: VBoxContainer
var _syncing := false
# chart transform scratch (set by _draw_chart, used by _c2s)
var _ch_ox := 0.0
var _ch_oy := 0.0
var _ch_scale := 1.0

static var _content_cache = null

func _init() -> void:
	custom_minimum_size = Vector2(780, 540)
	_build_ui()
	set_checklist(_cl_aircraft, _cl_phase)
	_refresh_wb()
	show_tab("CHART")

# ================================================================ tabs
func show_tab(tab: String) -> void:
	var t := tab.to_upper()
	if not TABS.has(t):
		t = "CHART"
	_tab = t
	for k in _pages:
		(_pages[k] as Control).visible = String(k) == t
	for k in _tab_buttons:
		(_tab_buttons[k] as Button).set_pressed_no_signal(String(k) == t)
	queue_redraw()

func current_tab() -> String:
	return _tab

func _build_ui() -> void:
	var bar := HBoxContainer.new()
	bar.set_anchors_preset(Control.PRESET_TOP_WIDE)
	bar.offset_bottom = TAB_BAR_H
	bar.add_theme_constant_override("separation", 6)
	add_child(bar)
	for t in TABS:
		var b := Button.new()
		b.text = {"CHART": "CHART 空港図", "WB": "W&B 重量重心", "CHECKLIST": "CHECKLIST"}[t]
		b.toggle_mode = true
		b.pressed.connect(show_tab.bind(t))
		bar.add_child(b)
		_tab_buttons[t] = b
	for t in TABS:
		var page := Control.new()
		page.set_anchors_preset(Control.PRESET_FULL_RECT)
		page.offset_top = TAB_BAR_H + 4.0
		page.mouse_filter = Control.MOUSE_FILTER_IGNORE
		add_child(page)
		_pages[t] = page
	_build_wb_page(_pages["WB"])
	_build_checklist_page(_pages["CHECKLIST"])
	# the CHART page stays empty: the diagram is drawn by _draw() itself.

func _page_label(page: Control, text: String, pos: Vector2) -> Label:
	var l := Label.new()
	l.text = text
	l.position = pos
	l.add_theme_font_size_override("font_size", 13)
	page.add_child(l)
	return l

# ================================================================ WB tab
func _build_wb_page(page: Control) -> void:
	_page_label(page, "機種", Vector2(16, 8))
	_ac_option = OptionButton.new()
	_ac_option.position = Vector2(110, 4)
	_ac_option.custom_minimum_size = Vector2(230, 28)
	for i in range(FP.AIRCRAFT().size()):
		var A: Dictionary = FP.AIRCRAFT()[i]
		_ac_option.add_item(String(A["name"]), i)
		_ac_option.set_item_metadata(i, String(A["id"]))
	_ac_option.item_selected.connect(_on_wb_ui_changed.unbind(1))
	page.add_child(_ac_option)
	_page_label(page, "前席 (人)", Vector2(16, 48))
	_front_spin = _mk_spin(page, Vector2(110, 44), 0.0, 2.0, 1.0, 2.0)
	_page_label(page, "後席 (人)", Vector2(16, 84))
	_rear_spin = _mk_spin(page, Vector2(110, 80), 0.0, 2.0, 1.0, 0.0)
	_page_label(page, "荷物 (kg)", Vector2(16, 120))
	_bag_spin = _mk_spin(page, Vector2(110, 116), 0.0, 90.0, 0.5, 0.0)
	_page_label(page, "燃料", Vector2(16, 156))
	_fuel_option = OptionButton.new()
	_fuel_option.position = Vector2(110, 152)
	_fuel_option.custom_minimum_size = Vector2(160, 28)
	for i in range(FUEL_MODES.size()):
		_fuel_option.add_item(FUEL_LABELS[FUEL_MODES[i]], i)
		_fuel_option.set_item_metadata(i, FUEL_MODES[i])
	_fuel_option.item_selected.connect(_on_wb_ui_changed.unbind(1))
	page.add_child(_fuel_option)
	_wb_result = Label.new()
	_wb_result.position = Vector2(16, 196)
	_wb_result.add_theme_font_size_override("font_size", 14)
	page.add_child(_wb_result)
	_page_label(page, "エンベロープ (横: CG in / 縦: 重量 lb)", Vector2(400, 8))

func _mk_spin(page: Control, pos: Vector2, lo: float, hi: float, step: float, val: float) -> SpinBox:
	var s := SpinBox.new()
	s.position = pos
	s.custom_minimum_size = Vector2(90, 28)
	s.min_value = lo
	s.max_value = hi
	s.step = step
	s.value = val
	s.value_changed.connect(_on_wb_ui_changed.unbind(1))
	page.add_child(s)
	return s

func _on_wb_ui_changed() -> void:
	if _syncing:
		return
	_aircraft_id = String(_ac_option.get_item_metadata(_ac_option.selected))
	_loading_raw = {
		"fuel": String(_fuel_option.get_item_metadata(_fuel_option.selected)),
		"front": int(_front_spin.value),
		"rear": int(_rear_spin.value),
		"bagKg": float(_bag_spin.value),
	}
	_refresh_wb()

func _refresh_wb() -> void:
	var r := current_result()
	if _wb_result == null:
		return
	if r.is_empty():
		_wb_result.text = "計算できません"
		return
	var problems := ""
	if not bool(r["ok"]):
		var whys: Array = []
		for p in r["problems"]:
			whys.append({"over": "最大離陸重量超過", "nose": "重心が前限界より前", "tail": "重心が後限界より後"}.get(String(p), String(p)))
		problems = "\n⚠ " + "・".join(whys)
	_wb_result.text = "総重量 %.0f lb (%.0f kg) / MTOW %.0f lb\n重心 %.1f in (限界 %.0f–%.0f in)%s\n燃料 L %.1f / R %.1f gal" % [
		float(r["lb"]), float(r["kg"]), float(r["mtowLb"]),
		float(r["cgIn"]), float(r["fwdIn"]), float(r["aftIn"]), problems,
		float(r["fuelGal"][0]), float(r["fuelGal"][1])]
	queue_redraw()

## Select the aircraft ("pa28" / "pa44" / "pa28r"; unknown ids fall back
## to the Archer, exactly like FlightPhysics.aircraftById).
func set_aircraft(id: String) -> void:
	_aircraft_id = String(FP.aircraftById(id)["id"])
	_sync_wb_ui()
	_refresh_wb()

func aircraft_id() -> String:
	return _aircraft_id

## Set the loading (physics.gd shape; see the header). Values are
## clamped by FlightPhysics.cleanLoading at calculation time.
func set_loading(d: Dictionary) -> void:
	_loading_raw = d.duplicate()
	_sync_wb_ui()
	_refresh_wb()

func loading() -> Dictionary:
	return FP.cleanLoading(FP.aircraftById(_aircraft_id), _loading_raw)

func _sync_wb_ui() -> void:
	if _ac_option == null:
		return
	_syncing = true
	for i in range(_ac_option.item_count):
		if String(_ac_option.get_item_metadata(i)) == _aircraft_id:
			_ac_option.select(i)
	var L := loading()
	_front_spin.set_value_no_signal(float(L["front"]))
	_rear_spin.set_value_no_signal(float(L["rear"]))
	_bag_spin.set_value_no_signal(float(L["bagKg"]))
	for i in range(_fuel_option.item_count):
		if String(_fuel_option.get_item_metadata(i)) == String(L["fuel"]):
			_fuel_option.select(i)
	_syncing = false

## The W&B result for the current inputs, computed by
## FlightPhysics.computeWB (plus "aircraft" / "name" annotations).
## {} when the aircraft has no W&B data.
func current_result() -> Dictionary:
	var A := FP.aircraftById(_aircraft_id)
	var fuel_gal = _loading_raw.get("fuelGal")
	var res = FP.computeWB(A, _loading_raw, fuel_gal if typeof(fuel_gal) == TYPE_ARRAY else null)
	if typeof(res) != TYPE_DICTIONARY:
		return {}
	var out: Dictionary = (res as Dictionary).duplicate()
	out["aircraft"] = _aircraft_id
	out["name"] = String(A["name"])
	return out

# ================================================================ CHECKLIST tab
static func content() -> Dictionary:
	if _content_cache != null:
		return _content_cache
	var parsed = {}
	if FileAccess.file_exists(CONTENT_PATH):
		var v = JSON.parse_string(FileAccess.get_file_as_string(CONTENT_PATH))
		if typeof(v) == TYPE_DICTIONARY:
			parsed = v
	_content_cache = parsed
	return parsed

static func checklist_book_key(aircraft_id: String) -> String:
	return "checklistsSeminole" if aircraft_id == "pa44" else "checklistsArcher"

static func checklist_phases(aircraft_id: String) -> Array:
	var book = content().get(checklist_book_key(aircraft_id))
	if typeof(book) != TYPE_DICTIONARY:
		return []
	return (book as Dictionary).keys()

static func checklist_title_of(aircraft_id: String, phase: String) -> String:
	var book = content().get(checklist_book_key(aircraft_id))
	if typeof(book) == TYPE_DICTIONARY and typeof((book as Dictionary).get(phase)) == TYPE_DICTIONARY:
		return String(((book as Dictionary)[phase] as Dictionary).get("title", phase))
	return phase

## Items of one phase as [{ name, value }] (content.json items are
## [name, value, checkFn|null, ...]; only the display pair is kept).
static func checklist_items_of(aircraft_id: String, phase: String) -> Array:
	var out: Array = []
	var book = content().get(checklist_book_key(aircraft_id))
	if typeof(book) != TYPE_DICTIONARY:
		return out
	var ph = (book as Dictionary).get(phase)
	if typeof(ph) != TYPE_DICTIONARY:
		return out
	for it in (ph as Dictionary).get("items", []):
		if typeof(it) == TYPE_ARRAY and not (it as Array).is_empty():
			out.append({"name": String(it[0]), "value": String(it[1]) if (it as Array).size() > 1 else ""})
	return out

func _build_checklist_page(page: Control) -> void:
	_page_label(page, "機種", Vector2(16, 8))
	_cl_ac_option = OptionButton.new()
	_cl_ac_option.position = Vector2(70, 4)
	_cl_ac_option.custom_minimum_size = Vector2(150, 28)
	_cl_ac_option.add_item("Archer 系", 0)
	_cl_ac_option.set_item_metadata(0, "pa28")
	_cl_ac_option.add_item("Seminole", 1)
	_cl_ac_option.set_item_metadata(1, "pa44")
	_cl_ac_option.item_selected.connect(func(_i): set_checklist(String(_cl_ac_option.get_item_metadata(_cl_ac_option.selected)), _cl_phase))
	page.add_child(_cl_ac_option)
	_page_label(page, "フェーズ", Vector2(240, 8))
	_cl_phase_option = OptionButton.new()
	_cl_phase_option.position = Vector2(310, 4)
	_cl_phase_option.custom_minimum_size = Vector2(170, 28)
	_cl_phase_option.item_selected.connect(func(_i): set_checklist(_cl_aircraft, String(_cl_phase_option.get_item_metadata(_cl_phase_option.selected))))
	page.add_child(_cl_phase_option)
	_cl_title = Label.new()
	_cl_title.position = Vector2(16, 42)
	_cl_title.add_theme_font_size_override("font_size", 15)
	page.add_child(_cl_title)
	var scroll := ScrollContainer.new()
	scroll.position = Vector2(16, 70)
	scroll.custom_minimum_size = Vector2(720, 380)
	page.add_child(scroll)
	_cl_box = VBoxContainer.new()
	_cl_box.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	scroll.add_child(_cl_box)

## Load one checklist (aircraft + phase). Unknown phases fall back to
## the book's first phase. Resets all item checks.
func set_checklist(aircraft_id: String, phase: String) -> void:
	_cl_aircraft = "pa44" if aircraft_id == "pa44" else "pa28"
	var phases := checklist_phases(_cl_aircraft)
	_cl_phase = phase if phases.has(phase) else (String(phases[0]) if not phases.is_empty() else phase)
	_cl_items = checklist_items_of(_cl_aircraft, _cl_phase)
	_cl_checked.clear()
	for i in range(_cl_items.size()):
		_cl_checked.append(false)
	_sync_checklist_ui()

func _sync_checklist_ui() -> void:
	if _cl_phase_option == null:
		return
	_syncing = true
	for i in range(_cl_ac_option.item_count):
		if String(_cl_ac_option.get_item_metadata(i)) == _cl_aircraft:
			_cl_ac_option.select(i)
	_cl_phase_option.clear()
	var phases := checklist_phases(_cl_aircraft)
	for i in range(phases.size()):
		_cl_phase_option.add_item(String(phases[i]), i)
		_cl_phase_option.set_item_metadata(i, String(phases[i]))
		if String(phases[i]) == _cl_phase:
			_cl_phase_option.select(i)
	_cl_title.text = checklist_title_of(_cl_aircraft, _cl_phase)
	for c in _cl_box.get_children():
		_cl_box.remove_child(c)
		if is_inside_tree():
			c.queue_free()
		else:
			c.free()
	for i in range(_cl_items.size()):
		var it: Dictionary = _cl_items[i]
		var cb := CheckBox.new()
		cb.text = "%s — %s" % [String(it["name"]), String(it["value"])]
		cb.set_pressed_no_signal(bool(_cl_checked[i]))
		cb.toggled.connect(_on_item_toggled.bind(i))
		_cl_box.add_child(cb)
	_syncing = false

func _on_item_toggled(on: bool, i: int) -> void:
	if i >= 0 and i < _cl_checked.size():
		_cl_checked[i] = on

func item_count() -> int:
	return _cl_items.size()

## Flip item i's check state (and its checkbox). Out-of-range is a no-op.
func toggle(i: int) -> void:
	if i < 0 or i >= _cl_checked.size():
		return
	_cl_checked[i] = not bool(_cl_checked[i])
	var cb = _cl_box.get_child(i) if _cl_box != null and i < _cl_box.get_child_count() else null
	if cb is CheckBox:
		(cb as CheckBox).set_pressed_no_signal(bool(_cl_checked[i]))

func is_checked(i: int) -> bool:
	return bool(_cl_checked[i]) if i >= 0 and i < _cl_checked.size() else false

func checked_count() -> int:
	var n := 0
	for v in _cl_checked:
		n += 1 if bool(v) else 0
	return n

func current_phase() -> String:
	return _cl_phase

func checklist_aircraft() -> String:
	return _cl_aircraft

func checklist_title() -> String:
	return checklist_title_of(_cl_aircraft, _cl_phase)

func current_items() -> Array:
	var out: Array = []
	for i in range(_cl_items.size()):
		out.append({"name": _cl_items[i]["name"], "value": _cl_items[i]["value"], "checked": bool(_cl_checked[i])})
	return out

# ================================================================ CHART geometry
static func _rect_ac(a0: float, a1: float, c0: float, c1: float) -> PackedVector2Array:
	# Chart axes: Vector2(cross, along) — x = cross (m), y = along (m, north).
	return PackedVector2Array([Vector2(c0, a0), Vector2(c1, a0), Vector2(c1, a1), Vector2(c0, a1)])

## Airport diagram geometry in the runway frame, built from
## FlightPhysics.PAVED / lab_rwy() and the world_build.gd building
## layout. All polygons are PackedVector2Array of Vector2(cross, along);
## drawing maps y = along upwards (north up; RWY true heading 354°).
static func chart_geometry() -> Dictionary:
	var rwy: Dictionary = FP.lab_rwy()
	var geo := {
		"frame": "runway frame: x=cross_m, y=along_m, north up",
		"hdg": float(rwy["trueHdg"]), "len": float(rwy["len"]), "wid": float(rwy["wid"]),
		"elevFt": float(rwy["elevFt"]),
		"connectors": [],
		"hangars": [],
	}
	var paved_copy: Array = []
	for p in FP.PAVED:
		var a0 := float(p[0]); var a1 := float(p[1]); var c0 := float(p[2]); var c1 := float(p[3])
		var kind := String(p[4])
		paved_copy.append([a0, a1, c0, c1, kind])
		if kind == "rwy":
			geo["runway"] = _rect_ac(a0, a1, c0, c1)
		elif kind == "apron":
			geo["apron"] = _rect_ac(a0, a1, c0, c1)
		elif kind == "twy" and c0 >= 90.0:
			geo["taxiway_parallel"] = _rect_ac(a0, a1, c0, c1)
		elif kind == "twy":
			(geo["connectors"] as Array).append(_rect_ac(a0, a1, c0, c1))
	geo["paved"] = paved_copy
	# Marked runway surface inside the paved strip (0..len).
	geo["runway_surface"] = _rect_ac(0.0, float(rwy["len"]), -float(rwy["wid"]) / 2.0, float(rwy["wid"]) / 2.0)
	geo["centerline"] = PackedVector2Array([Vector2(0, -40), Vector2(0, 1240)])
	geo["threshold36"] = Vector2(0, 0)
	geo["threshold18"] = Vector2(0, float(rwy["len"]))
	geo["apron_spot"] = Vector2(170, 600)
	# Buildings (world_build.gd layout, runway frame a/c).
	var ac: Dictionary = WORLD.ACADEMY
	geo["academy"] = {
		"rect": _rect_ac(float(ac["a0"]), float(ac["a1"]), float(ac["c0"]), float(ac["c1"])),
		"center": Vector2((float(ac["c0"]) + float(ac["c1"])) / 2.0, (float(ac["a0"]) + float(ac["a1"])) / 2.0),
	}
	var tw: Dictionary = WORLD.TOWER
	geo["tower"] = {"pos": Vector2(float(tw["c"]), float(tw["a"]))}
	for H in WORLD.HANGARS:
		(geo["hangars"] as Array).append(_rect_ac(float(H["a0"]), float(H["a1"]), float(H["c0"]), float(H["c1"])))
	geo["bounds"] = {"along_min": -80.0, "along_max": 1300.0, "cross_min": -60.0, "cross_max": 330.0}
	return geo

# ================================================================ drawing
func _eff_size() -> Vector2:
	return size if size.x > 60.0 and size.y > 60.0 else custom_minimum_size

func _draw() -> void:
	var sz := _eff_size()
	var content := Rect2(Vector2(0, TAB_BAR_H + 4.0), Vector2(sz.x, sz.y - TAB_BAR_H - 4.0))
	if _tab == "CHART":
		_draw_chart(content)
	elif _tab == "WB":
		_draw_envelope(content)

func _c2s(v: Vector2) -> Vector2:
	return Vector2(_ch_ox + v.x * _ch_scale, _ch_oy - v.y * _ch_scale)

func _poly_screen(p: PackedVector2Array) -> PackedVector2Array:
	var out := PackedVector2Array()
	for v in p:
		out.append(_c2s(v))
	return out

func _draw_chart(rect: Rect2) -> void:
	draw_rect(rect, Color(0.07, 0.10, 0.13))
	var geo := chart_geometry()
	var b: Dictionary = geo["bounds"]
	var amin := float(b["along_min"]); var amax := float(b["along_max"])
	var cmin := float(b["cross_min"]); var cmax := float(b["cross_max"])
	_ch_scale = minf(rect.size.x / (cmax - cmin), rect.size.y / (amax - amin))
	_ch_ox = rect.position.x + (rect.size.x - (cmax - cmin) * _ch_scale) / 2.0 - cmin * _ch_scale
	_ch_oy = rect.position.y + (rect.size.y - (amax - amin) * _ch_scale) / 2.0 + amax * _ch_scale
	# paved areas
	if geo.has("apron"):
		draw_colored_polygon(_poly_screen(geo["apron"]), Color(0.42, 0.42, 0.43))
	if geo.has("taxiway_parallel"):
		draw_colored_polygon(_poly_screen(geo["taxiway_parallel"]), Color(0.23, 0.23, 0.24))
	for c in geo["connectors"]:
		draw_colored_polygon(_poly_screen(c), Color(0.23, 0.23, 0.24))
	# taxiway centreline (yellow, cross = 102.5 on the parallel taxiway)
	draw_line(_c2s(Vector2(102.5, -10)), _c2s(Vector2(102.5, 1210)), Color(0.85, 0.7, 0.15), 1.5)
	if geo.has("runway"):
		draw_colored_polygon(_poly_screen(geo["runway"]), Color(0.16, 0.16, 0.17))
	# threshold piano keys (36 end) + centreline dashes
	for k in range(-3, 4):
		var cx := float(k) * 3.6
		var bar := PackedVector2Array([Vector2(cx - 1.0, 12), Vector2(cx + 1.0, 12), Vector2(cx + 1.0, 42), Vector2(cx - 1.0, 42)])
		draw_colored_polygon(_poly_screen(bar), Color(0.92, 0.92, 0.92))
	for i in range(12):
		draw_line(_c2s(Vector2(0, 60.0 + i * 100.0)), _c2s(Vector2(0, 90.0 + i * 100.0)), Color(0.92, 0.92, 0.92), 2.0)
	_text_at("36", _c2s(Vector2(0, 78)) + Vector2(-9, 22), Color(0.95, 0.95, 0.95), 17)
	_text_at("18", _c2s(Vector2(0, 1122)) + Vector2(-9, 4), Color(0.95, 0.95, 0.95), 17)
	_text_at("RWY 36/18  1200 × 30 m", _c2s(Vector2(24, 640)), Color(0.75, 0.8, 0.85), 12)
	# buildings
	var acd: Dictionary = geo["academy"]
	draw_colored_polygon(_poly_screen(acd["rect"]), Color(0.55, 0.52, 0.47))
	_text_at("学園", _c2s(acd["center"]) + Vector2(-12, 4), Color(0.1, 0.1, 0.1), 12)
	for hgr in geo["hangars"]:
		draw_colored_polygon(_poly_screen(hgr), Color(0.35, 0.45, 0.58))
	_text_at("格納庫", _c2s(Vector2(261, 500)) + Vector2(-16, 4), Color(0.9, 0.92, 0.95), 11)
	var tpos: Vector2 = geo["tower"]["pos"]
	draw_circle(_c2s(tpos), 5.0, Color(0.95, 0.75, 0.3))
	_text_at("塔", _c2s(tpos) + Vector2(8, 4), Color(0.95, 0.85, 0.5), 12)
	# apron spot marker
	var spot: Vector2 = geo["apron_spot"]
	draw_circle(_c2s(spot), 3.0, Color(0.85, 0.7, 0.15))
	# north arrow
	var na := rect.position + Vector2(rect.size.x - 34.0, 40.0)
	draw_line(na, na + Vector2(0, -24), Color(0.9, 0.9, 0.9), 2.0)
	draw_line(na + Vector2(0, -24), na + Vector2(-5, -14), Color(0.9, 0.9, 0.9), 2.0)
	draw_line(na + Vector2(0, -24), na + Vector2(5, -14), Color(0.9, 0.9, 0.9), 2.0)
	_text_at("N", na + Vector2(-5, -28), Color(0.9, 0.9, 0.9), 14)
	_text_at("LAB 空港図 (真上が北 / RWY 真方位 354°)", rect.position + Vector2(10, 18), Color(0.8, 0.85, 0.9), 13)

func _draw_envelope(rect: Rect2) -> void:
	var plot := Rect2(Vector2(maxf(rect.position.x + 396.0, rect.position.x), rect.position.y + 34.0), Vector2(330, 290))
	var r := current_result()
	if r.is_empty():
		_text_at("W&B データなし", plot.position + Vector2(8, 20), Color(0.8, 0.8, 0.8), 13)
		return
	var fwd := float(r["fwdIn"]); var aft := float(r["aftIn"]); var mtow := float(r["mtowLb"])
	var x0 := fwd - 6.0; var x1 := aft + 6.0
	var y1 := mtow * 1.15
	var px = func(v: float) -> float: return plot.position.x + (v - x0) / (x1 - x0) * plot.size.x
	var py = func(v: float) -> float: return plot.position.y + plot.size.y - v / y1 * plot.size.y
	var env := Rect2(Vector2(float(px.call(fwd)), float(py.call(mtow))), Vector2(float(px.call(aft)) - float(px.call(fwd)), float(py.call(0.0)) - float(py.call(mtow))))
	draw_rect(env, Color(0.3, 0.9, 0.45, 0.16))
	draw_rect(env, Color(0.3, 0.9, 0.45), false, 1.5)
	draw_rect(plot, Color(0.6, 0.65, 0.7), false, 1.0)
	# MTOW line
	draw_line(Vector2(plot.position.x, float(py.call(mtow))), Vector2(plot.position.x + plot.size.x, float(py.call(mtow))), Color(1, 0.4, 0.35, 0.7), 1.0)
	_text_at("MTOW %.0f lb" % mtow, Vector2(plot.position.x + 4, float(py.call(mtow)) - 4), Color(1, 0.55, 0.5), 11)
	_text_at("%.0f in" % fwd, Vector2(float(px.call(fwd)) - 12, plot.position.y + plot.size.y + 14), Color(0.75, 0.8, 0.85), 11)
	_text_at("%.0f in" % aft, Vector2(float(px.call(aft)) - 12, plot.position.y + plot.size.y + 14), Color(0.75, 0.8, 0.85), 11)
	# current point
	var pt := Vector2(float(px.call(float(r["cgIn"]))), float(py.call(float(r["lb"]))))
	var col := Color(0.35, 0.95, 0.5) if bool(r["ok"]) else Color(1, 0.35, 0.3)
	draw_circle(pt, 6.0, col)
	draw_arc(pt, 6.0, 0.0, TAU, 24, Color(0, 0, 0, 0.6), 1.5)
	_text_at("%.0f lb / %.1f in" % [float(r["lb"]), float(r["cgIn"])], pt + Vector2(10, -8), col, 12)

func _text_at(s: String, pos: Vector2, col: Color, px: int) -> void:
	var font := get_theme_default_font()
	if font == null:
		return
	draw_string(font, pos, s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, px, col)
