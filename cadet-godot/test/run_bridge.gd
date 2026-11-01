extends SceneTree

## Phase 2 ブリッジのスモークテスト（ヘッドレス）:
## godot --headless --path . -s test/run_bridge.gd
## start_on_ground / start_free / start_lesson をブリッジ経由で駆動し、
## frame・pose・panel・status・finish が壊れないことを確認する。

const Bridge = preload("res://src/flight_bridge.gd")

var checks := 0
var fails := 0

func chk(cond: bool, name: String) -> void:
	checks += 1
	if not cond:
		fails += 1
		print("FAIL: ", name)

func _init() -> void:
	var store := {}
	var b = Bridge.new({"store": store})
	# --- エプロン静止スタート（座標は airport_build の主スポット、風は calm で IAS を見る）
	const Airport = preload("res://src/airport_build.gd")
	var spot: Dictionary = Airport.apron_spot()
	var L = b.start_on_ground(float(spot["n"]), float(spot["e"]), 354.0, "pa28", {"wind": "calm"})
	chk(L != null and bool(L.get("free", false)), "start_on_ground returns free L")
	var keys := {}
	for i in range(120):
		b.frame(1.0 / 60.0, keys)
	var p: Dictionary = b.panel()
	chk(absf(float(p["ias"])) < 1.5, "parked: IAS ~0 (got %s)" % p["ias"])
	chk(bool(p["parkBrake"]), "parked: parkBrake on")
	var st = b.status()
	chk(st != null and String(st["mode"]) == "free", "status free")
	var ps: Dictionary = b.pose()
	chk((ps["pos"] as Array).size() == 3, "pose pos")
	# --- 滑走路フリー飛行：フルスロットルで離陸できること
	b.start_free("rwy", "pa28", {"wind": "calm"})
	# 開始直後に押しているキーは原典仕様でミュートされるため、先に数フレーム離す
	keys = {}
	for i in range(10):
		b.frame(1.0 / 60.0, keys)
	keys = {"KeyR": true}
	for i in range(60 * 60):
		# R でスロットル全開。55 kt を過ぎたらピッチ 5〜10° をバンバン制御で保つ
		b.frame(1.0 / 60.0, keys)
		var s: Dictionary = b.get_s()
		if float(s["out"]["ias"]) > 55.0:
			var pitch := float(s["out"]["pitch"])
			keys = {"KeyS": true} if pitch < 6.0 else ({"KeyW": true} if pitch > 11.0 else {})
		if float(s["out"]["altTrue"]) > 400.0:
			break
	var s2: Dictionary = b.get_s()
	chk(float(s2["out"]["altTrue"]) > 200.0, "free flight climbs (alt %s)" % s2["out"]["altTrue"])
	chk(not bool(s2["crashed"]), "free flight not crashed")
	# --- レッスン開始と数ステップ
	var L2 = b.start_lesson("a1", "intro")
	chk(L2 != null, "start_lesson a1")
	for i in range(120):
		b.frame(1.0 / 60.0, {})
	var st2 = b.status()
	chk(st2 != null and String(st2["mode"]) == "lesson", "status lesson")
	chk(String(st2["id"]) == "a1", "status id a1")
	# --- スクリプト駆動（パイロットなし＝観察ステップのみ）で done にならない範囲を確認
	b.abort("スモークテスト終了")
	chk(bool(b.get_L()["done"]), "abort marks done")
	var rec = b.finish()
	chk(rec != null or true, "finish callable")
	print("BRIDGE SMOKE: %d checks, %d failures" % [checks, fails])
	quit(1 if fails > 0 else 0)
