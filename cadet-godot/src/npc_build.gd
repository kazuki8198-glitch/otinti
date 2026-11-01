class_name NpcBuild
extends RefCounted

## CADET Godot port — Phase 4 (項目0b): NPC 配置。
## 原典: cadet/src/content/people.js の PEOPLE / PLACES / placeOf() と
## cadet/src/npc/cast.js (配置と座り姿勢)。教官だけは people.js の対象外で、
## main.js の INS = { a: 634.9, c: 256.7 } (ブリーフィング室 1) が原典。
##
## API (確定):
##   placements(content, opts = {}) -> Array of
##     { who, place, a, c, up, seated, act, face: {a, c} or {}, pos: Vector3 }
##     opts: { slot = "am", chapter = "ch1", what = [] } — what はその日の予定
##     ({kind, slot} の Array。career の schedule() 形式)。placeOf の移植なので
##     時刻・章・予定で配置が変わる。既定 (am / ch1 / 予定なし) では 9 名:
##     教官・主任・講師・運航管理・整備士・管制官・同期 3 名。審査官は
##     ch6 の checkride のときだけ examRoom に現れる (原典どおり)。
##     pos は WorldBuild.rwy_to_world(a, c, up) と一致する (テストで照合)。
##   build_npcs(parent, content, opts = {}) -> Node3D "NPCs"
##     姿勢は基礎: 立ち = カプセル体 + 頭球、seat あり = 座り高さに体を置く。
##     色は PEOPLE[id].color (16 進文字列)、名前は Label3D。act の手持ち小物や
##     歩行アニメーションは未移植 (PHASE4-SCENE-NOTES.md)。

const WB = preload("res://src/world_build.gd")

const ORDER := ["instructor", "chief", "lecturer", "dispatcher", "mechanic",
	"controller", "kiryu", "asahi", "mori", "examiner"]
const PEERS := ["kiryu", "asahi", "mori"]
# main.js の教官の定位置 (ブリーフィング室 1)。face は部屋の入口 (廊下側) 向きの近似。
const INSTRUCTOR_PLACE := { "a": 634.9, "c": 256.7, "face": { "a": 646.0, "c": 256.7 } }

static var _mats: Dictionary = {}

static func _mat(color: Color) -> StandardMaterial3D:
	var key := str(color)
	if _mats.has(key):
		return _mats[key]
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.roughness = 0.75
	_mats[key] = m
	return m

static func _person_color(content: Dictionary, who: String) -> Color:
	var ppl: Dictionary = content.get("people", {}).get("PEOPLE", {})
	var p: Dictionary = ppl.get(who, {})
	var cs := String(p.get("color", ""))
	if cs.begins_with("#") and (cs.length() == 7 or cs.length() == 9):
		return Color.html(cs)
	return Color(0.6, 0.62, 0.65)

# people.js placeOf() の移植: 戻り値は PLACES のキー名 (+ 教官の "instructorRoom"、
# 授業中の同期の座席 "classSeat" / "simSeat")、居なければ ""。
static func _place_key(who: String, slot: String, chapter: String, what: Array) -> String:
	var has := func(k: String) -> bool:
		for x in what:
			if typeof(x) == TYPE_DICTIONARY and String(x.get("kind", "")) == k \
					and (String(x.get("slot", "")) == slot or (slot == "morning" and String(x.get("slot", "")) == "am")):
				return true
		return false
	var event_who := func() -> bool:
		for x in what:
			if typeof(x) == TYPE_DICTIONARY and String(x.get("kind", "")) == "event" and String(x.get("who", "")) == who:
				return true
		return false
	if who == "instructor":
		return "instructorRoom"
	if slot == "evening" and not PEERS.has(who) and event_who.call():
		return "counter" if who == "dispatcher" else "apronEvent" if who == "mechanic" else "chiefRoom" if who == "chief" else ""
	if slot == "evening":
		if not PEERS.has(who):
			return ""
		if chapter == "ch1" and event_who.call():
			return "lounge%d" % (PEERS.find(who) + 1)
		return "dormCommon%d" % (PEERS.find(who) + 1)
	var graduating := false
	for x in what:
		if typeof(x) == TYPE_DICTIONARY and String(x.get("kind", "")) == "graduation":
			graduating = true
	if graduating:
		if who == "chief":
			return "lobbyFront"
		var gi := ["kiryu", "asahi", "mori", "lecturer", "dispatcher", "mechanic", "examiner"].find(who)
		return "grad%d" % (gi + 1) if gi >= 0 else ""
	if who == "examiner":
		return "examRoom" if chapter == "ch6" and has.call("checkride") else ""
	match who:
		"dispatcher":
			return "dispatchSeat"
		"controller":
			return "towerCab"
		"mechanic":
			return "hangarWork" if slot == "pm" else "apron"
		"chief":
			return "lobbyFront" if chapter == "prologue" and slot == "morning" else "chiefRoom"
		"lecturer":
			if chapter == "prologue":
				return "lobbyFront" if slot == "morning" else ""
			if has.call("class"):
				return "classroom"
			if has.call("ftd"):
				return "sim"
			if has.call("exam") and chapter == "ch1":
				return "planning"
			return "classroom" if chapter == "ch1" else ""
		_:
			if not PEERS.has(who):
				return ""
			if chapter == "prologue" and slot == "morning":
				return "lobby%d" % (PEERS.find(who) + 1)
			if chapter == "ch1" and has.call("class"):
				return "classSeat"
			if chapter == "ch1" and has.call("ftd"):
				return "simSeat"
			if chapter == "ch1" and event_who.call():
				return "lounge%d" % (PEERS.find(who) + 1)
			return "pilot1" if who == "kiryu" else "pilotMap" if who == "asahi" else "lounge3"
	return ""

# placeOf の動的な座席 (PLACES に無い) を PLACES 形式の Dictionary で返す。
static func _dynamic_place(key: String, who: String, content: Dictionary) -> Dictionary:
	var places: Dictionary = content.get("people", {}).get("PLACES", {})
	if key == "instructorRoom":
		return INSTRUCTOR_PLACE.duplicate()
	if key == "classSeat":
		var i := PEERS.find(who)
		return { "a": 625.2 + float(i) * 1.2, "c": 255.9, "face": { "a": 622.3, "c": 255.9 }, "seat": { "h": 0.51 } }
	if key == "simSeat":
		var j := PEERS.find(who)
		return { "a": 613.0 + float(j) * 5.0, "c": 266.6, "face": { "a": 613.0 + float(j) * 5.0, "c": 268.0 }, "seat": { "h": 0.51 } }
	if key == "lobbyFront" and who == "lecturer":
		# 原典: 序章の朝だけ講師は lobbyFront を少しずらして使う
		var lf: Dictionary = (places.get("lobbyFront", {}) as Dictionary).duplicate()
		lf["a"] = 657.4
		lf["c"] = 267.2
		return lf
	return (places.get(key, {}) as Dictionary).duplicate()

static func placements(content: Dictionary, opts: Dictionary = {}) -> Array:
	var slot := String(opts.get("slot", "am"))
	var chapter := String(opts.get("chapter", "ch1"))
	var what: Array = opts.get("what", [])
	var out: Array = []
	for who in ORDER:
		var key := _place_key(who, slot, chapter, what)
		if key.is_empty():
			continue
		var pl := _dynamic_place(key, who, content)
		if pl.is_empty():
			continue
		var a := float(pl.get("a", 0.0))
		var c := float(pl.get("c", 0.0))
		var up := float(pl.get("y", 0.0))
		out.append({ "who": who, "place": key, "a": a, "c": c, "up": up,
			"seated": pl.has("seat"), "act": String(pl.get("act", "")),
			"face": pl.get("face", {}), "pos": WB.rwy_to_world(a, c, up) })
	return out

static func build_npcs(parent: Node, content: Dictionary, opts: Dictionary = {}) -> Node3D:
	var root := Node3D.new()
	root.name = "NPCs"
	if parent != null:
		parent.add_child(root)
	var ppl: Dictionary = content.get("people", {}).get("PEOPLE", {})
	for pl in placements(content, opts):
		var who := String(pl["who"])
		var person: Dictionary = ppl.get(who, {})
		var h := float(person.get("height", 1.7))
		var col := _person_color(content, who)
		var node := Node3D.new()
		node.name = "NPC_" + who
		node.position = pl["pos"]
		node.set_meta("who", who)
		node.set_meta("place", String(pl["place"]))
		var face = pl.get("face", {})
		if typeof(face) == TYPE_DICTIONARY and not (face as Dictionary).is_empty():
			var fw: Vector3 = WB.rwy_to_world(float(face.get("a", pl["a"])), float(face.get("c", pl["c"])), float(pl["up"]))
			var dir := fw - node.position
			dir.y = 0.0
			if dir.length() > 0.01:
				node.basis = Basis.looking_at(dir.normalized(), Vector3.UP)
		root.add_child(node)
		var seat_h := -1.0
		if bool(pl["seated"]):
			var places: Dictionary = content.get("people", {}).get("PLACES", {})
			var src: Dictionary = places.get(String(pl["place"]), {})
			if src.has("seat"):
				seat_h = float((src["seat"] as Dictionary).get("h", 0.5))
			else:
				seat_h = 0.51
		_build_body(node, h, col, seat_h)
		var label := Label3D.new()
		label.name = "Name"
		label.text = String(person.get("name", who))
		label.font_size = 64
		label.pixel_size = 0.004
		label.modulate = col
		label.outline_size = 8
		label.outline_modulate = Color(0, 0, 0, 0.85)
		label.billboard = BaseMaterial3D.BILLBOARD_ENABLED
		label.position = Vector3(0, (seat_h + 1.35) if seat_h >= 0.0 else (h + 0.24), 0)
		node.add_child(label)
	return root

# 立ち (seat_h < 0): カプセル + 頭球。座り: 座面高さに胴体を置き、脚箱を前に出す基礎姿勢。
static func _build_body(node: Node3D, h: float, col: Color, seat_h: float) -> void:
	var mat := _mat(col)
	var dark := _mat(col.darkened(0.35))
	if seat_h >= 0.0:
		var torso := MeshInstance3D.new()
		torso.name = "Body"
		var cap := CapsuleMesh.new()
		cap.radius = 0.27
		cap.height = 0.95
		torso.mesh = cap
		torso.material_override = mat
		torso.position = Vector3(0, seat_h + 0.48, 0)
		node.add_child(torso)
		var legs := MeshInstance3D.new()
		legs.name = "Legs"
		var lb := BoxMesh.new()
		lb.size = Vector3(0.36, 0.14, 0.52)
		legs.mesh = lb
		legs.material_override = dark
		legs.position = Vector3(0, seat_h - 0.16, -0.3)
		node.add_child(legs)
		var head := _head(mat)
		head.position = Vector3(0, seat_h + 1.04, 0)
		node.add_child(head)
	else:
		var body := MeshInstance3D.new()
		body.name = "Body"
		var cap2 := CapsuleMesh.new()
		cap2.radius = 0.28
		cap2.height = maxf(h - 0.22, 0.6)
		body.mesh = cap2
		body.material_override = mat
		body.position = Vector3(0, cap2.height / 2.0, 0)
		node.add_child(body)
		var head2 := _head(mat)
		head2.position = Vector3(0, h - 0.11, 0)
		node.add_child(head2)

static func _head(mat: Material) -> MeshInstance3D:
	var head := MeshInstance3D.new()
	head.name = "Head"
	var sm := SphereMesh.new()
	sm.radius = 0.11
	sm.height = 0.22
	head.mesh = sm
	head.material_override = mat
	return head
