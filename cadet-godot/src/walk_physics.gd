class_name WalkPhysics
extends RefCounted

## CADET Godot port — Phase 4 (項目0c'): 徒歩の純粋物理。
## 原典の考え方 (cadet/src/player/collide.js): 軸分離で押し戻す AABB 衝突と、
## 「段差 step 以下なら登って床高に追随、それを超える段差は進入を止める」。
## ここでは Godot 側統合が扱いやすいよう、runway frame の純粋関数として切り出した。
##
## 座標規約 (確定): pos は runway frame の Vector3(a, up, c)。
##   pos.x = a (滑走路方向), pos.y = up (床からの高さ = 足元), pos.z = c (横方向)。
##   world 座標への変換は統合側が WorldBuild.rwy_to_world(a, c, up) で行う。
##
## walls の形式 (確定): Array of Dictionary
##   { a0, a1, c0, c1, floor_y, height } — (a, c) 平面の矩形、鉛直範囲は
##   [floor_y, floor_y + height]。interior_build.gd の wall_boxes() がこの形式を返す。
##
## floor_y_at の形式 (確定): Callable(a: float, c: float, cur_up: float) -> float
##   その地点で「いまの高さ cur_up から段差 STEP_MAX 以内で立てる床の高さ」を返す。
##   階段のように段が積み重なる場所では make_floor_fn(steps, base) が作る。
##   無効な Callable を渡すと床は pos.y のまま (平坦扱い)。
##
## move() の戻り値 (確定): { pos: Vector3, blocked: bool, blocked_a: bool,
##   blocked_c: bool, floor_y: float } — floor_y は移動後の足元の高さ (= pos.y)。

const RADIUS := 0.3    # 歩行者の半径 (m)。壁はこの分だけ膨らませて判定する
const HEIGHT := 1.75   # 歩行者の身長 (m)。これより下に天井側の障害物があれば通れない
const STEP_MAX := 0.45 # 登れる段差の上限 (m)。タスク指定の 0.45

# (a, c) 地点で、足元 up の歩行者が walls のいずれかに塞がれるか。
# 壁が塞ぐのは「壁の天井が足元 + STEP_MAX より高い」かつ「壁の床が頭より低い」ときだけ:
# 低い段 (天井が step 以下) は床として登れるし、上の階の壁は下の階の歩行者を塞がない。
static func blocked_at(a: float, c: float, up: float, walls: Array) -> bool:
	for w in walls:
		if typeof(w) != TYPE_DICTIONARY:
			continue
		if a < float(w.get("a0", 0.0)) - RADIUS or a > float(w.get("a1", 0.0)) + RADIUS:
			continue
		if c < float(w.get("c0", 0.0)) - RADIUS or c > float(w.get("c1", 0.0)) + RADIUS:
			continue
		var bottom := float(w.get("floor_y", 0.0))
		var top := bottom + float(w.get("height", 3.0))
		if top > up + STEP_MAX and bottom < up + HEIGHT:
			return true
	return false

static func _floor_at(floor_y_at: Callable, a: float, c: float, up: float) -> float:
	if floor_y_at.is_valid():
		var v = floor_y_at.call(a, c, up)
		if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
			return float(v)
	return up

## 1 ステップの移動。wish_ac は (a, c) 平面の希望方向 (長さ 1 超は正規化)。
## a 軸 → c 軸の順に試し、塞がれた軸だけ止める (壁沿いの滑りを許す)。
static func move(pos: Vector3, wish_ac: Vector2, dt: float, speed: float, walls: Array, floor_y_at: Callable) -> Dictionary:
	var dir := wish_ac
	if dir.length() > 1.0:
		dir = dir.normalized()
	var dist := speed * maxf(dt, 0.0)
	var a := pos.x
	var c := pos.z
	var up := pos.y
	var blocked_a := false
	var blocked_c := false
	var da := dir.x * dist
	var dc := dir.y * dist
	if da != 0.0:
		var na := a + da
		var f := _floor_at(floor_y_at, na, c, up)
		if f - up > STEP_MAX or blocked_at(na, c, up, walls):
			blocked_a = true
		else:
			a = na
	if dc != 0.0:
		var nc := c + dc
		var f2 := _floor_at(floor_y_at, a, nc, up)
		if f2 - up > STEP_MAX or blocked_at(a, nc, up, walls):
			blocked_c = true
		else:
			c = nc
	# 床への追随: 登りは STEP_MAX まで、下りはそのまま床まで落とす (階段を降りられる)
	var nf := _floor_at(floor_y_at, a, c, up)
	if nf - up <= STEP_MAX:
		up = nf
	return { "pos": Vector3(a, up, c), "blocked": blocked_a or blocked_c,
		"blocked_a": blocked_a, "blocked_c": blocked_c, "floor_y": up }

## steps (Array of {a0, a1, c0, c1, top}) の上で (a, c) に立つときの床高。
## cur_up から STEP_MAX 以内で届く段のうち最も高いもの。段が無ければ base_floor。
static func ground_at(a: float, c: float, cur_up: float, steps: Array, base_floor: float = 0.0) -> float:
	var best := base_floor
	for s in steps:
		if typeof(s) != TYPE_DICTIONARY:
			continue
		if a < float(s.get("a0", 0.0)) or a > float(s.get("a1", 0.0)):
			continue
		if c < float(s.get("c0", 0.0)) or c > float(s.get("c1", 0.0)):
			continue
		var top := float(s.get("top", 0.0))
		if top <= cur_up + STEP_MAX + 1e-9 and top > best:
			best = top
	return best

## ground_at を floor_y_at 形式の Callable にしたもの (統合側・テスト用)。
static func make_floor_fn(steps: Array, base_floor: float = 0.0) -> Callable:
	var st: Array = steps
	var bf := base_floor
	return func(a: float, c: float, cur_up: float) -> float:
		return WalkPhysics.ground_at(a, c, cur_up, st, bf)
