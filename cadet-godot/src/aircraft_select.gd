class_name AircraftSelect
extends RefCounted

## CADET Godot port — Phase 3: 機種選択ヘルパー
## 機種 id (physics.gd AIRCRAFT の id) → 外形 glb の対応:
##   pa28  Archer   -> assets/archer.glb   (移植元 cadet/assets/model/archer.glb)
##   pa44  Seminole -> assets/seminole.glb (移植元 cadet/assets/model/seminole.glb)
##   pa28r Arrow    -> 専用 glb が存在しないため archer.glb を流用する
##                     (原典 HTML 版も Arrow 用モデルは無く、CADET 側の機体表示は
##                     Archer 系モデルで代替される前提。本ヘルパーでは流用を
##                     is_reused() / 戻り値の "reused" で明示する)
## ロード後は aircraft_visual.gd (AircraftVisual.apply_materials) で頂点色
## マテリアル再構成を適用する。表示する登録記号は機種ごとの既定:
##   pa28 / pa28r: N738SY (archer.glb の 9 機中、原典 FIRST_REG)
##   pa44:         N452SY (seminole.glb の 3 機 N452SY / N455SY / N457SY の先頭、
##                         academy-spec の本日の双発機も N452SY)
##
## 使い方 (統合側):
##   var built = AircraftSelect.build_aircraft("pa44", aircraft_node)
##   # built = { node, id, path, reused, reg, stats: AircraftVisual の統計 }

const AV = preload("res://src/aircraft_visual.gd")

const MODELS := {
	"pa28": "res://assets/archer.glb",
	"pa44": "res://assets/seminole.glb",
	# pa28r: 専用 glb 無し — archer.glb 流用 (上記コメント参照)
	"pa28r": "res://assets/archer.glb",
}
const REUSED := {"pa28r": true}
const DEFAULT_REG := {"pa28": "N738SY", "pa44": "N452SY", "pa28r": "N738SY"}

static func known_ids() -> Array:
	return MODELS.keys()

static func model_path(id: String) -> String:
	return String(MODELS.get(id, MODELS["pa28"]))

static func is_reused(id: String) -> bool:
	return bool(REUSED.get(id, false))

static func default_reg(id: String) -> String:
	return String(DEFAULT_REG.get(id, "N738SY"))

## glb をロードしてインスタンス化する (マテリアル未適用の素のモデル)。
## 失敗時は null。
static func load_model(id: String) -> Node:
	var packed := load(model_path(id)) as PackedScene
	if packed == null:
		return null
	return packed.instantiate()

## ロード + マテリアル再構成まで済ませ、parent があればその子にする。
static func build_aircraft(id: String, parent: Node = null, reg: String = "") -> Dictionary:
	var node := load_model(id)
	var use_reg: String = reg if reg != "" else default_reg(id)
	var stats: Dictionary = {}
	if node != null:
		node.name = "Aircraft_" + id
		if parent != null:
			parent.add_child(node)
		stats = AV.apply_materials(node, use_reg)
	return {
		"node": node, "id": id, "path": model_path(id),
		"reused": is_reused(id), "reg": use_reg, "stats": stats,
	}

## モデルの構造サマリー (検証用): MeshInstance3D 数と総三角形数。
static func model_stats(node: Node) -> Dictionary:
	var out := {"meshes": 0, "triangles": 0}
	_collect_stats(node, out)
	return out

static func _collect_stats(n: Node, out: Dictionary) -> void:
	if n is MeshInstance3D:
		out["meshes"] = int(out["meshes"]) + 1
		var am := (n as MeshInstance3D).mesh as ArrayMesh
		if am != null:
			for si in range(am.get_surface_count()):
				var arrs := am.surface_get_arrays(si)
				var idx: PackedInt32Array = arrs[Mesh.ARRAY_INDEX]
				var pos: PackedVector3Array = arrs[Mesh.ARRAY_VERTEX]
				out["triangles"] = int(out["triangles"]) + (idx.size() / 3 if idx.size() > 0 else pos.size() / 3)
	for c in n.get_children():
		_collect_stats(c, out)
