class_name CadetSyllabus
extends RefCounted
# Port of flight-lab/src/syllabus.js (HTML CADET @ 898fe8a) — the lesson definitions.
# PHASE 2 SCOPE: the shared step helpers (landingSteps, takeoffRoll, stepSL /
# stepTurn via school.gd, established / establishedVs, the CFI trainee helper),
# the STAGES metadata for every stage, and the FULL lesson definitions of
# stage s1's a1, t1, t2, t3 (with steps). All other lessons are present as
# metadata only (id / title / goal / why / brief / std / setup / book, no
# steps) — their step definitions are Phase 3. JS lambdas in steps
# (until / check / result / gradeWhen / tgt values) are GDScript Callables
# with the same call signatures the school engine uses.

const FP = preload("res://src/physics.gd")
const SC = preload("res://src/school.gd")

static func _clamp(x: float, a: float, b: float) -> float:
	return a if x < a else (b if x > b else x)

static func _w180(a: float) -> float:
	return FP.wrap180(a)

static func _ar() -> Dictionary:
	return FP.aircraftById("pa28")["v"]

static func _sm() -> Dictionary:
	return FP.aircraftById("pa44")["v"]

static func _aw() -> Dictionary:
	return FP.aircraftById("pa28r")["v"]

const KEYS := {
	"pitch": "S＝機首上げ・W＝機首下げ（離すとその姿勢を保つ）", "roll": "A / D＝左右に傾ける", "rud": "Q / E＝ラダー（ボールを中央へ）", "thr": "R＝スロットル増・F＝スロットル減（Shift で一気に全開 / アイドル）",
	"trim": "T＝いまの速度でトリム（手放しで水平）", "flaps": "V＝フラップを 1 段下げる（最後まで行くと UP に戻る）", "brake": "B / Space＝ブレーキ", "gear": "G＝脚の上げ下げ",
	"feather": "[＝左のプロペラをフェザー・]＝右のプロペラをフェザー", "rtrim": "Z / X＝ラダートリム 左 / 右（片発で足を楽に）",
	"prop": ", ＝プロペラレバーを引く（ガバナー設定を下げる）・. ＝プロペラレバーを前へ（設定を上げる）", "manin": "MFD の MAN IN（マニホールド圧）と RPM の 2 つの計器で出力を確かめる",
}

static func kk(parts: Array) -> String:
	var out: Array = []
	for x in parts:
		out.append(String(KEYS.get(String(x), String(x))))
	return "　".join(out)

# distance (NM) from the aircraft to a waypoint id (avionics loaded at runtime:
# it does not depend on this file, but school.gd does, so no preload cycle)
static func dist_nm(L: Dictionary, id: String) -> float:
	var AV = load("res://src/avionics.gd")
	var w = AV.wpt(id)
	return float(AV.ne_dist_nm(FP.neOf(L["s"]), w)) if w != null else 99.0

static func rwy_nm(L: Dictionary) -> float:
	var s := FP.neOf(L["s"])
	var R := FP.lab_rwy()
	return sqrt(pow(float(s["n"]) - (float(R["n"]) + 600.0), 2.0) + pow(float(s["e"]) - float(R["e"]), 2.0)) / 1852.0

# the off-field landing site of lesson e4 (Phase 3 lesson; the geometry helper is ported with the helpers)
static func _setup_m5(L: Dictionary) -> void:
	(L["s"]["eng"] as Array)[0]["failed"] = true
	(L["s"]["eng"] as Array)[0]["feather"] = true
	L["fail"]["engL"] = 0
	L["s"]["opts"]["autoRud"] = false

static func _setup_cx3(L: Dictionary) -> void:
	L["s"]["prop"] = 0.625

static func field_site() -> Dictionary:
	var ne2 := FP.rwyToNE(FP.lab_rwy(), -2600.0, 2400.0)
	return {"n": float(ne2[0]), "e": float(ne2[1]), "hdg": 360}

static func dist_field(L: Dictionary) -> float:
	var p := FP.neOf(L["s"])
	var F := field_site()
	return sqrt(pow(float(p["n"]) - float(F["n"]), 2.0) + pow(float(p["e"]) - float(F["e"]), 2.0))

static func live_side(L: Dictionary) -> int:
	return 1 if bool(((L["s"] as Dictionary)["eng"] as Array)[0].get("failed", false)) else -1

static func dead_name(L: Dictionary) -> String:
	return "左" if bool(((L["s"] as Dictionary)["eng"] as Array)[0].get("failed", false)) else "右"

# grade "maintain" only after the speed has been "established" (see syllabus.js)
static func established(kt: float, tol: float, after: float = 0.0, give_up: float = 30.0) -> Callable:
	var f = func(c, L, st) -> bool:
		if float(st["t"]) <= after:
			return false
		if SC._truthy(st.get("cap")):
			return true
		if float(st["t"]) > give_up:
			return true
		if absf(float(c["kias"]) - kt) <= tol * float((L["level"] as Dictionary)["k"]):
			st["cap"] = true
			return true
		return false
	return f

static func established_vs(fpm: float, tol: float, after: float = 0.0, give_up: float = 25.0) -> Callable:
	var f = func(c, L, st) -> bool:
		if float(st["t"]) <= after:
			return false
		if SC._truthy(st.get("capV")):
			return true
		if float(st["t"]) > give_up:
			return true
		if absf(float(c["vs"]) - fpm) <= tol * float((L["level"] as Dictionary)["k"]):
			st["capV"] = true
			return true
		return false
	return f

# ---------------------------------------------------------------- shared step groups
# the landing: a stabilised final, then the flare and the touchdown
static func landing_steps(vref, o: Dictionary = {}) -> Array:
	var flaps := int(o["flaps"]) if o.get("flaps") != null else (2 if SC._truthy(o.get("twin")) else 3)
	var short := SC._truthy(o.get("short"))
	var xwind := SC._truthy(o.get("xwind"))
	var td_spd_tol := float(o["tdSpdTol"]) if o.get("tdSpdTol") != null else 15.0
	var final_step := {"name": "ファイナル（安定した進入）", "g": {"kt": vref, "fpm": -SC._js_round(float(vref) * 5.3), "flaps": flaps, "gear": true, "how": "approach"}, "keys": kk(["thr", "pitch", "roll", "rud"]),
		"say": "ファイナル：%s kt・3°（PAPI 赤 2 白 2）でセンターラインに乗る。地上 500 ft で安定していなければゴーアラウンド" % SC._fmt_num(vref),
		"tgt": {"spd": SC.T_SPD(vref, 5.0), "cl": [0, 30], "gp": [3, 0.9]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) < 500.0 and float(c["aglR"]) > 60.0 and float(c["along"]) < 250.0, "until": func(c, L, st): return float(c["aglR"]) < 40.0 or bool(c["onGround"]), "max": 360.0, "grade": true}
	var td_check = func(c, L, st) -> void:
		var td = (L["s"] as Dictionary).get("td")
		if td != null and not SC._truthy(st.get("td")) and float((L["s"] as Dictionary)["t"]) - float(td["t"]) < 2.0:
			st["td"] = td
			L["landings"] = int(L.get("landings", 0)) + 1
		if SC._truthy(st.get("td")) and bool(c["onGround"]):
			st["stopAlong"] = float(c["along"])
	var td_result = func(L, st) -> Array:
		var td = st.get("td")
		var k2 := float((L["level"] as Dictionary)["k"])
		if td == null:
			return [{"name": "接地", "val": "していない", "std": "—", "pass": false}]
		var sink := SC._js_round(300.0 * k2)
		var du := float(td["along"]) - 300.0
		var zone := [SC._js_round(-60.0 * k2), SC._js_round(60.0 * k2)] if short else [SC._js_round(-100.0 * k2), SC._js_round(400.0 * k2)]
		var cl := float(SC._to_fixed(6.0 * k2, 1))
		var rows: Array = [
			{"name": "接地の降下率", "val": "%s fpm" % SC._fmt_num(td["fpm"]), "std": "%d fpm 以下" % sink, "pass": float(td["fpm"]) <= float(sink)},
			{"name": "接地位置", "val": "目標点から %s%d m" % ["+" if du >= 0.0 else "", SC._js_round(du)], "std": "%d〜+%d m" % [int(zone[0]), int(zone[1])], "pass": du >= float(zone[0]) and du <= float(zone[1])},
			{"name": "センターライン", "val": "%s m" % SC._to_fixed(absf(float(td["cross"])), 1), "std": "%s m 以内" % SC._fmt_num(cl), "pass": absf(float(td["cross"])) <= cl and bool(td["onRunway"])},
			{"name": "接地の速度", "val": "%s kt" % SC._fmt_num(td["kias"]), "std": "%s〜%s kt" % [SC._fmt_num(float(vref) - td_spd_tol), SC._fmt_num(float(vref) + 3.0)], "pass": float(td["kias"]) >= float(vref) - td_spd_tol and float(td["kias"]) <= float(vref) + 3.0},
			{"name": "主輪から接地", "val": "前輪から" if SC._truthy(td.get("noseFirst")) else "主輪から", "std": "前輪から接地しない", "pass": not SC._truthy(td.get("noseFirst"))},
		]
		if xwind:
			rows.append({"name": "接地時の横流れ", "val": "%s m/s" % SC._to_fixed(absf(float(td["latV"])), 1), "std": "%s m/s 以下" % SC._to_fixed(1.5 * k2, 1), "pass": absf(float(td["latV"])) <= 1.5 * k2})
			rows.append({"name": "機首方向（滑走路と平行）", "val": "%s°" % SC._to_fixed(float(td["crab"]), 0), "std": "±%d°" % SC._js_round(5.0 * k2), "pass": float(td["crab"]) <= 5.0 * k2})
		if short:
			var stop_along := float(st["stopAlong"]) if st.get("stopAlong") != null else float(td["along"])
			rows.append({"name": "停止距離", "val": "%d m" % SC._js_round(stop_along - float(td["along"])), "std": "%d m 以内" % SC._js_round(400.0 * k2), "pass": stop_along - float(td["along"]) <= 400.0 * k2})
		if SC._truthy(td.get("bounces")):
			rows.append({"name": "バウンド", "val": "%s 回" % SC._fmt_num(td["bounces"]), "std": "なし", "pass": false})
		return rows
	var td_step := {"name": "短距離接地" if short else "接地", "keys": kk(["thr", "pitch", "brake"]),
		"g": "目安：滑走路の端を越えたらアイドル（F）。地上 10〜15 ft から滑走路の先を見ながら S で少しずつ機首を上げ、最後は機首上げ 約 5〜8°。直し方：浮き上がったら引くのを止めて待つ、沈みが速ければ少し強く引く",
		"say": "目標点（端から 300 m の太い標識）に接地。すぐにアイドル・ブレーキ（B）" if short else "滑走路の端を越えたらアイドル、地上 10〜15 ft でフレアして主輪から接地。止まるまでセンターラインを保つ",
		"until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 150.0,
		"check": td_check, "result": td_result}
	return [final_step, td_step]

# the takeoff roll and the lift-off
static func takeoff_roll(vr, o: Dictionary = {}) -> Dictionary:
	var to_result = func(L, st) -> Array:
		var tol := SC._js_round(5.0 * float((L["level"] as Dictionary)["k"])) + 2
		return [{"name": "浮揚速度", "val": "%d kt" % SC._js_round(SC._fin(st.get("lastKias"), 0.0)), "std": "%s ±%d kt" % [SC._fmt_num(vr), tol], "pass": absf(SC._fin(st.get("lastKias"), 0.0) - float(vr)) <= float(tol)}]
	var to_check = func(c, L, st) -> void:
		if bool(c["onGround"]):
			st["lastKias"] = float(c["kias"])
	return {"name": "離陸滑走とローテーション", "keys": kk(["thr", "rud", "pitch"]),
		"g": "目安：スロットル全開（R を押し続ける）。右へ振られにくい双発以外は、プロペラの左偏向で機首が左へ行くので E（右ラダー）で押さえる。%s kt で S を押して機首上げ 約 8〜10°（PFD の目盛り「10」の手前）にして浮揚" % SC._fmt_num(vr),
		"say": "フルパワー（R 長押し）。Q / E でセンターラインを保ち、%s kt（Vr）でローテーション" % SC._fmt_num(vr), "until": func(c, L, st): return not bool(c["onGround"]) and float(c["agl"]) > 3.0, "max": 90.0, "grade": true, "tgt": {"cl": [0, 8]}, "gradeWhen": func(c, L, st): return bool(c["onGround"]) and float(c["kias"]) > 15.0,
		"check": to_check, "result": to_result}

static func stall_recovery(v_min, extra: Dictionary = {}) -> Dictionary:
	var sr_on_start = func(L, c, st) -> void:
		st["min"] = float(c["alt"])
		st["start"] = float(c["alt"])
	var sr_check = func(c, L, st) -> void:
		st["min"] = minf(SC._fin(st.get("min"), float(c["alt"])), float(c["alt"]))
		if float(st["t"]) > 4.0 and bool(c["stall"]):
			st["second"] = true
	var sr_result = func(L, st) -> Array:
		var lim := SC._js_round(300.0 * float((L["level"] as Dictionary)["k"]))
		return [{"name": "回復で失った高度", "val": "%d ft" % SC._js_round(float(st["start"]) - float(st["min"])), "std": "%d ft 以内" % lim, "pass": float(st["start"]) - float(st["min"]) <= float(lim)}, {"name": "二次失速", "val": "あり" if SC._truthy(st.get("second")) else "なし", "std": "なし", "pass": not SC._truthy(st.get("second"))}]
	var d := {"name": "失速からの回復", "keys": kk(["pitch", "thr", "roll", "rud"]),
		"g": "目安：W で機首を水平線付近（0〜+5°）まで下げる → R で全開 → A / D で翼を水平。速度が付いたら上昇姿勢（約 +8°）へ。直し方：失速警報がまた鳴ったら引きすぎ。少し戻す",
		"say": "回復！ ①機首を下げて迎え角を減らす ②フルパワー ③翼を水平 ④速度が付いたら上昇へ", "until": func(c, L, st): return float(c["vs"]) > 100.0 and float(c["kias"]) > float(v_min) and float(st["t"]) > 2.0, "max": 45.0, "grade": true, "tgt": {"hdg": SC.T_HDG(20.0)},
		"onStart": sr_on_start, "check": sr_check, "result": sr_result}
	for k in extra.keys():
		d[k] = extra[k]
	return d

# JS-name aliases for the helpers above
static func landingSteps(vref, o: Dictionary = {}) -> Array:
	return landing_steps(vref, o)

static func takeoffRoll(vr, o: Dictionary = {}) -> Dictionary:
	return takeoff_roll(vr, o)

static func stallRecovery(v_min, extra: Dictionary = {}) -> Dictionary:
	return stall_recovery(v_min, extra)

static func establishedVs(fpm: float, tol: float, after: float = 0.0, give_up: float = 25.0) -> Callable:
	return established_vs(fpm, tol, after, give_up)

# ---------------------------------------------------------------- (next-wave item 6) the CFI prototype's trainee
const CFI_MISTAKES := ["計器の一点に目が留まり、機首が少しずつ下がっていた", "スロットルが少しずつ戻り、速度が落ちていた", "外を見ていて、針路が少しずつずれていた"]

static func trainee_fly(L: Dictionary, c: Dictionary, st: Dictionary) -> void:
	var s: Dictionary = L["s"]
	var kind := absi(int(s.get("seed", 7))) % 3
	st["kind"] = kind
	var in_window: bool = float(st["t"]) > 14.0 and float(st["t"]) < 34.0
	var pitch_t := 2.0 + (float(L["alt0"]) - float(c["alt"])) * 0.008
	var thr_t := 0.62
	var bank_off := 0.0
	if in_window and kind == 0:
		pitch_t -= 3.2
	if in_window and kind == 1:
		thr_t = 0.44
	if in_window and kind == 2:
		bank_off = 9.0
	var bank_t := _clamp(_w180(float(L["hdg0"]) + bank_off - float(c["hdg"])) * 0.8, -12.0, 12.0)
	s["ovr"] = {"elev": _clamp((pitch_t - float(c["pitch"])) * 0.14, -0.5, 0.5), "ail": _clamp((bank_t - float(c["bank"])) * 0.05, -0.5, 0.5), "rud": 0.0}
	s["thr"] = float(s["thr"]) + _clamp(thr_t - float(s["thr"]), -0.008, 0.008)
	st["maxDev"] = maxf(SC._fin(st.get("maxDev"), 0.0), absf(float(c["alt"]) - float(L["alt0"])))
	if in_window:
		st["sawMistake"] = true

static func traineeFly(L: Dictionary, c: Dictionary, st: Dictionary) -> void:
	trainee_fly(L, c, st)

# ---------------------------------------------------------------- the four fully-ported s1 lessons (Phase 2)
static func _lesson_a1() -> Dictionary:
	return {"id": "a1", "title": "姿勢・出力・トリム", "goal": "トリムを使い、操縦から手を離しても水平飛行が続く状態を作る", "aircraft": "pa28",
		"why": "飛行機は「姿勢（機首の高さ）＋出力＝性能（速度と昇降率）」で飛ぶ。トリムは操縦の力を消す装置で、トリムが取れていれば手を離しても同じ姿勢・速度で飛び続ける。すべての操作の土台。",
		"brief": ["<b>姿勢＋出力＝性能</b>。機首の高さ（ピッチ）とスロットルを決めれば、速度と昇降率が決まります。", "キーボードの W / S は「機首の角度」を動かし、離すとその角度を保ちます（空島フライトと同じピッチ保持）。<b>T キー（トリム）</b>は「いま押さえている力」を飛行機に覚えさせる装置。T のあとは何もしなくても同じ姿勢が続きます。", "手順：①PFD の姿勢表示で機首を水平線に合わせる ②昇降率（VSI）が 0 付近、速度が落ち着いたら T ③手を離して高度が保たれるか見る。"],
		"std": "高度 ±100 ft を連続 20 秒（基礎レベル）", "setup": {"at": "area", "kt": 100, "hdg": 90}, "book": ["aero.forces", "ops.trim"],
		"steps": [
			{"name": "姿勢と計器の確認", "say": "何も操作せず、PFD の姿勢表示・速度・高度・昇降率がどう動くか 10 秒観察", "keys": "操作しない（観察）", "dur": 10},
			{"name": "トリムで手放し水平飛行", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr", "trim"]), "say": "W / S で高度 {alt0} ft を保ち、昇降率が 0 付近になったら T。手を離して保つ", "tgt": {"alt": SC.T_ALT(100.0)}, "hold": 20, "max": 120, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0},
		]}

static func _lesson_t1() -> Dictionary:
	var AR := _ar()
	return {"id": "t1", "title": "通常離陸と上昇", "goal": "センターラインを保って加速し、Vr で浮揚、Vy で上昇", "aircraft": "pa28",
		"why": "離陸は準備（チェックリスト・ブリーフィング・管制の許可）から始まる。プロペラ機は加速中に機首が左へ振れるため、右ラダーでセンターラインを保つ。",
		"brief": ["離陸前点検（チェックリスト：Enter で 1 項目ずつ）→ 管制の離陸許可を正しく復唱（1〜3 キー）。", "フルパワー（R 長押し）。<b>E（右ラダー）で機首をセンターラインに</b>（プロペラの左偏向）。", "<b>%s kt（Vr）</b>で S を押して機首を約 8° 上げて浮揚。<b>%s kt（Vy）</b>で上昇し、地上 1,000 ft まで（滑走路の方位を保つ）。" % [SC._fmt_num(AR["rotate"]), SC._fmt_num(AR["y"])]],
		"std": "センターライン ±8 m・浮揚 %s ±7 kt・上昇 %s ±10 kt・針路 ±10°" % [SC._fmt_num(AR["rotate"]), SC._fmt_num(AR["y"])], "setup": {"at": "runway"}, "book": ["ops.takeoff", "aero.left"],
		"steps": [
			{"name": "離陸前点検", "checklist": "before_takeoff"},
			{"name": "離陸許可の復唱", "atc": "takeoff"},
			takeoff_roll(AR["rotate"]),
			{"name": "初期上昇", "g": {"kt": AR["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "rud", "trim"]), "say": "%s kt で上昇、滑走路の方位 360° を保つ。地上 1,000 ft まで" % SC._fmt_num(AR["y"]), "tgt": {"spd": SC.T_SPD(AR["y"]), "rhdg": [0, 10]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 150.0, "until": func(c, L, st): return float(c["aglR"]) >= 1000.0, "max": 200, "grade": true},
		]}

static func _lesson_t2() -> Dictionary:
	var AR := _ar()
	var abeam_check = func(c, L, st) -> void:
		if int(c["flaps"]) >= 1:
			st["flap"] = true
	var abeam_result = func(L, st) -> Array:
		return [{"name": "フラップ 10°", "val": "操作した" if SC._truthy(st.get("flap")) else "していない", "std": "アビームで", "pass": SC._truthy(st.get("flap"))}]
	var steps: Array = [
		{"name": "着陸許可の復唱", "atc": "landing"},
		{"name": "ダウンウインド", "g": {"kt": 90, "how": "level"}, "keys": kk(["pitch", "roll", "thr", "trim"]), "say": "ダウンウインド：地上 1,000 ft・90 kt・滑走路と平行（方位 180°）。着陸前点検を思い出す", "tgt": {"aglR": [1000, 100], "spd": SC.T_SPD(90), "dwhdg": [0, 10]}, "until": func(c, L, st): return float(c["along"]) < 0.0, "max": 150, "grade": true},
		{"name": "降下開始（アビーム）", "g": {"kt": 80, "fpm": -500, "flaps": 1, "how": "pattern"}, "keys": kk(["thr", "flaps", "pitch"]), "say": "進入端の真横。パワーを絞り（F）、フラップ 10°（V）。80 kt で降下開始", "until": func(c, L, st): return float(c["along"]) < -800.0, "max": 100,
			"check": abeam_check, "result": abeam_result},
		{"name": "ベース", "g": {"kt": 75, "fpm": -500, "flaps": 2, "how": "pattern"}, "keys": kk(["roll", "flaps", "thr"]), "say": "左旋回してベース（方位 090°）。フラップ 25°、75 kt で降下。センターラインの延長に近づいたら左旋回してファイナルへ", "until": func(c, L, st): return absf(float(c["cross"])) < 150.0 and absf(_w180(float(c["hdg"]) - 360.0)) < 40.0 and float(c["along"]) < -400.0, "max": 180, "tgt": {"spd": SC.T_SPD(75, 12.0)}, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 10.0},
	]
	steps.append_array(landing_steps(AR["appr"]))
	return {"id": "t2", "title": "場周経路（トラフィックパターン）", "goal": "ダウンウインドから左場周を飛んで着陸する", "aircraft": "pa28",
		"why": "空港の周りの決まった経路（場周経路）を全員が同じ高さ・同じ形で飛ぶことで、互いを見つけやすくし衝突を防ぐ（AIM 4-3-3）。高度・位置・速度・外形変更の段取りが着陸の質を決める。",
		"brief": ["左場周（LAB RWY 36）。<b>ダウンウインド</b>：地上 1,000 ft、90 kt、滑走路から約 1.6 km 離れて平行に（磁方位 180°）。", "滑走路の進入端の真横（アビーム）で<b>パワーを絞り（約 1,500 rpm）、フラップ 10°</b>、降下開始。", "進入端が斜め後ろ 45° に見えたら左旋回して<b>ベース</b>（方位 090°）、フラップ 25°、75 kt。", "最終進入（<b>ファイナル</b>）はセンターラインに合わせて %s kt、フラップ 40°。PAPI が赤 2 白 2 なら正しい角度（3°）。" % SC._fmt_num(AR["appr"])],
		"std": "ダウンウインド 高度 ±100 ft・速度 ±10 kt、ファイナル %s ±5 kt、接地は下の着陸基準" % SC._fmt_num(AR["appr"]), "setup": {"at": "downwind"}, "book": ["ops.pattern"],
		"steps": steps}

static func _lesson_t3() -> Dictionary:
	var AR := _ar()
	var steps: Array = [{"name": "着陸前点検", "checklist": "before_landing"}]
	steps.append_array(landing_steps(AR["appr"]))
	return {"id": "t3", "title": "通常着陸", "goal": "安定した進入から、接地帯にやさしく接地する", "aircraft": "pa28",
		"why": "着陸の質は進入の安定で決まる。「500 ft で安定していなければゴーアラウンド」は世界中の運航で使われる考え方（安定進入）。",
		"brief": ["ファイナル（約 5 km）から。<b>%s kt・3° の進入角</b>（PAPI 赤 2 白 2、昇降率 約 −370 fpm）、フラップ 40°。" % SC._fmt_num(AR["appr"]), "<b>地上 500 ft で安定</b>（速度・進入角・センターライン）していなければゴーアラウンド。", "滑走路の端を越えたらアイドル、地上 10〜15 ft で S を少しずつ押して機首を上げる（フレア）。主輪から接地し、B でブレーキ。"],
		"std": "ファイナル %s ±5 kt・センターライン ±30 m・進入角 3 ±0.9°、接地 300 fpm 以下・目標点の −100〜+400 m・センターライン ±6 m" % SC._fmt_num(AR["appr"]), "setup": {"at": "final", "km": 5}, "book": ["ops.landing"],
		"steps": steps}

static var _stages_cache = null
static func STAGES() -> Array:
	if _stages_cache != null:
		return _stages_cache
	var full := {"a1": _lesson_a1(), "t1": _lesson_t1(), "t2": _lesson_t2(), "t3": _lesson_t3()}
	# Phase 3: every remaining flight lesson's steps live in syllabus_rest.gd
	# (loaded at runtime; that file preloads this one for the shared helpers).
	var rest: Dictionary = (load("res://src/syllabus_rest.gd") as GDScript).build_all()
	var out: Array = []
	for st in _META:
		var lessons: Array = []
		for l in st["lessons"]:
			if full.has(l["id"]):
				lessons.append(full[l["id"]])
			else:
				var d: Dictionary = (l as Dictionary).duplicate(true)
				# setup.onStart cannot live in the const _META (not a constant
				# expression); attach the two ported ones here.
				if l["id"] == "m5":
					d["setup"]["onStart"] = func(L): _setup_m5(L)
				elif l["id"] == "cx3":
					d["setup"]["onStart"] = func(L): _setup_cx3(L)
				if rest.has(l["id"]):
					d["steps"] = (rest[l["id"]] as Dictionary)["steps"]
				lessons.append(d)
		out.append({"id": st["id"], "title": st["title"], "phase": st["phase"], "desc": st["desc"], "lessons": lessons})
	_stages_cache = out
	return out

# the n2 diversion estimate (ported in syllabus_rest.gd)
static func estimate_truth(L: Dictionary, id: String = "LABEF") -> Dictionary:
	return (load("res://src/syllabus_rest.gd") as GDScript).estimate_truth(L, id)

static func submit_estimate(L: Dictionary, input: Dictionary) -> Dictionary:
	return (load("res://src/syllabus_rest.gd") as GDScript).submit_estimate(L, input)

static func estimate_rows(L: Dictionary) -> Array:
	return (load("res://src/syllabus_rest.gd") as GDScript).estimate_rows(L)
# --- generated stage/lesson metadata (from syllabus.js STAGES, steps excluded) ---
const _META := [
	{"id": "s0", "title": "第 0 段階　地上学科（ロンドン相当・英語の座学）", "phase": "p1", "desc": "公開情報では、座学はロンドンで英語で行う。ここでは G1000 型の計器の読み方、英語の交信（言い方・1 回の飛行の全交信・復唱・聞き取り）、学科の確認テストで準備する。", "lessons": [
		{"id": "k1", "title": "G1000 型 PFD の読み方（チュートリアル）", "goal": "速度・姿勢・高度・昇降率・方位・CDI の位置と読み方を、実際の表示で 1 つずつ", "tutor": "g1000"},
		{"id": "k2", "title": "PFD の読み取り練習", "goal": "ランダムな PFD の表示を読み取る 10 問・80% で合格", "read": true},
		{"id": "k3", "title": "英語交信①：アルファベットと数字の言い方", "goal": "高度・針路・周波数・コードなどの言い方 10 問・80% で合格", "radio": "drill", "book": ["comm.basic", "comm.numbers"]},
		{"id": "k4", "title": "英語交信②：1 回の飛行の交信を通して聞く", "goal": "ATIS から駐機場まで全部の交信を、意味と理由つきで最後まで", "radio": "flight", "book": ["comm.atis", "comm.dep", "comm.tower", "comm.radar", "comm.arrive"]},
		{"id": "k5", "title": "英語交信③：復唱と応答", "goal": "ランダムな 10 場面・80% で合格", "radio": "scenes", "book": ["comm.readback", "comm.clarify"]},
		{"id": "k6", "title": "英語交信④：聞き取り（音声）", "goal": "英語の指示を音声で聞いて内容を選ぶ 10 問・80% で合格", "radio": "listen", "book": ["radio.listen"]},
	]},
	{"id": "s1", "title": "第 1 段階　Piper Archer の基礎操縦（ソロまで）", "phase": "p2", "desc": "公開情報では、Sanford で単発機 Piper Archer を使い、レッスン 12 回と審査を経てソロ（単独飛行）へ。ここでは基本操作・離着陸・緊急操作を練習する。", "lessons": [
		{"id": "a1", "title": "姿勢・出力・トリム", "goal": "トリムを使い、操縦から手を離しても水平飛行が続く状態を作る", "aircraft": "pa28", "book": ["aero.forces", "ops.trim"], "why": "飛行機は「姿勢（機首の高さ）＋出力＝性能（速度と昇降率）」で飛ぶ。トリムは操縦の力を消す装置で、トリムが取れていれば手を離しても同じ姿勢・速度で飛び続ける。すべての操作の土台。", "brief": ["<b>姿勢＋出力＝性能</b>。機首の高さ（ピッチ）とスロットルを決めれば、速度と昇降率が決まります。", "キーボードの W / S は「機首の角度」を動かし、離すとその角度を保ちます（空島フライトと同じピッチ保持）。<b>T キー（トリム）</b>は「いま押さえている力」を飛行機に覚えさせる装置。T のあとは何もしなくても同じ姿勢が続きます。", "手順：①PFD の姿勢表示で機首を水平線に合わせる ②昇降率（VSI）が 0 付近、速度が落ち着いたら T ③手を離して高度が保たれるか見る。"], "std": "高度 ±100 ft を連続 20 秒（基礎レベル）", "setup": {"at": "area", "kt": 100, "hdg": 90}},
		{"id": "a2", "title": "直線水平飛行", "goal": "高度・針路・速度を同時に保つ", "aircraft": "pa28", "book": ["ops.sl"], "why": "巡航・航法・計器飛行のすべての基本。「外 8 割・計器 2 割」で姿勢を作り、計器で確認して小さく直す習慣をつける。", "brief": ["視線は「外の水平線 8 割、計器 2 割」。姿勢の基準は窓の外の水平線、確認は PFD。", "高度が 50 ft ずれたら機首を 1〜2° 動かして戻す。速度はスロットル（R / F）で。速度を変えたらトリム（T）を取り直す。", "計器の見方（クロスチェック）：姿勢 → 高度 → 姿勢 → 方位 → 姿勢 → 速度…と、姿勢表示を中心に目を動かす。"], "std": "高度 ±100 ft・針路 ±10°・速度 ±10 kt を連続 20 秒（自家用 ACS の水平直線飛行の許容幅を参考）", "setup": {"at": "area", "kt": 100, "hdg": 90}},
		{"id": "a3", "title": "上昇・降下・レベルオフ", "goal": "一定の速度で上昇・降下し、目標高度で水平に戻す", "aircraft": "pa28", "book": ["ops.climb"], "why": "上昇は速度を機首で、降下率は出力で決める——「何で何を直すか」を体で覚える。レベルオフの遅れは高度逸脱（管制の指示違反）の原因になる。", "brief": ["上昇：スロットル全開 → 機首を上げて <b>76 kt（Vy：最良上昇率速度）</b> を保つ。上昇中の速度は<b>機首</b>で合わせる（出力は全開のまま）。", "レベルオフは目標高度の<b>昇降率の 10%</b> 手前から始める（700 fpm なら 70 ft 手前）。機首を下げ、速度が付いたらパワーを巡航へ、最後にトリム。", "降下：パワーを絞って 90 kt・約 500 fpm。降下率のずれは<b>出力</b>で直す。"], "std": "上昇 76 ±10 kt、レベルオフ後 高度 ±100 ft を連続保持、降下 500 ±200 fpm", "setup": {"at": "area", "kt": 100, "hdg": 90}},
		{"id": "a4", "title": "中程度の旋回（30°）", "goal": "バンク 30° で高度を保って 360° 旋回し、元の針路で止める", "aircraft": "pa28", "book": ["aero.turn"], "why": "旋回では揚力の一部が横向きになるので、少し引いてパワーを足さないと沈む。ボール（横滑り計）を中央に保つ釣り合い旋回は、失速・スピン事故の予防の基本。", "brief": ["バンクを取ると揚力の一部が横向きになり沈みます。<b>S で少し引いて機首をわずかに上げ</b>、パワーを少し足す。", "ロールアウトはバンク角の半分（30° なら約 15°）手前から始める。", "ボール（PFD の姿勢表示上部の三角の下の台形）を中央に。ずれたらずれた側のラダー（Q / E）：「ボールを踏む」。"], "std": "バンク 30 ±5°・高度 ±100 ft・ロールアウト ±10°", "setup": {"at": "area", "kt": 100, "hdg": 90}},
		{"id": "a5", "title": "急旋回（45°）", "goal": "実地試験の定番。バンク 45° で高度と速度を保つ", "aircraft": "pa28", "book": ["aero.turn", "aero.vn"], "why": "荷重倍数（G）と失速速度の関係を体で知る。45° では 1.41 G で失速速度が約 19% 上がる。自家用 ACS の課目（Steep Turns）。", "brief": ["45° では荷重 1.4 G。<b>しっかり引いて機首を上げ、パワーを足す</b>。", "高度が下がり始めたら、<b>バンクを少し浅くしてから引く</b>（深いバンクのまま引いても旋回が締まるだけ）。", "速度は Va（113 kt：設計運動速度）以下で。ロールアウトは 20° 手前から。"], "std": "バンク 45 ±5°・高度 ±100 ft・速度 ±10 kt・ロールアウト ±10°（自家用 ACS の Steep Turns を参考）", "setup": {"at": "area", "kt": 95, "hdg": 90}},
		{"id": "a6", "title": "低速飛行", "goal": "失速警報を鳴らさずに、失速に近い速度で操縦する", "aircraft": "pa28", "book": ["aero.stall", "ops.slow"], "why": "離着陸は失速に近い低速で行う。低速では舵の効きが鈍く、「速度は機首・高度はパワー」になる（バックサイド）。失速の兆候を知り、近づかずに操縦する力をつける。", "brief": ["パワーを絞り、速度が Vfe（白い帯の上端）以下になったらフラップを下げる（V キー）。", "<b>失速警報が鳴らない程度の低い速度</b>を保つ。低速では<b>速度は機首、高度はパワー</b>。", "舵の効きが鈍いので大きめに・ゆっくり。プロペラの影響でボールが右に寄りやすい（E）。"], "std": "速度 58 kt の +10/−0（58〜68 kt）・高度 ±100 ft・針路 ±10°・失速警報なし（自家用 ACS の Slow Flight を参考）", "setup": {"at": "area", "kt": 90, "hdg": 90}},
		{"id": "a7", "title": "パワーオフ失速と回復", "goal": "着陸形態での失速を体験し、高度の損失を少なく回復する", "aircraft": "pa28", "book": ["aero.stall"], "why": "着陸進入中の失速（ベースからファイナルの旋回など）は重大事故の典型。兆候（警報・振動・舵の軽さ）を知り、迷わず「機首を下げる」を体に覚えさせる。", "brief": ["フラップ 25°、パワーアイドル。高度を保つように機首をゆっくり上げ続けると失速します（警報と振動）。", "<b>回復：①機首を下げて迎え角を減らす ②フルパワー ③翼を水平 ④速度が付いたら上昇へ</b>。フラップは上昇を確認してから段階的に上げる。", "回復中に引きすぎると 2 回目の失速（二次失速）。"], "std": "回復で失う高度 300 ft 以内・二次失速なし・針路 ±20°", "setup": {"at": "area", "kt": 75, "hdg": 90, "flaps": 2, "thr": 0.2}},
		{"id": "a8", "title": "パワーオン失速と回復", "goal": "離陸・上昇中の失速を体験し回復する", "aircraft": "pa28", "book": ["aero.stall", "aero.left"], "why": "離陸直後に機首を上げすぎた失速は低高度で起きるため致命的。高出力ではプロペラの影響で機首が左へ振られ、片翼から落ちやすい（ラダーの大切さ）。", "brief": ["クリーン形態、フルパワーで機首を 15〜20° 上げ続けると失速します。高出力なので機首が左へ振られやすい → <b>E（右ラダー）でボールを中央</b>に。", "回復は同じ：<b>迎え角を減らす → 出力（すでに全開）→ 翼水平 → 上昇</b>。"], "std": "回復で失う高度 300 ft 以内・針路 ±20°", "setup": {"at": "area", "kt": 75, "hdg": 90, "thr": 1}},
		{"id": "t1", "title": "通常離陸と上昇", "goal": "センターラインを保って加速し、Vr で浮揚、Vy で上昇", "aircraft": "pa28", "book": ["ops.takeoff", "aero.left"], "why": "離陸は準備（チェックリスト・ブリーフィング・管制の許可）から始まる。プロペラ機は加速中に機首が左へ振れるため、右ラダーでセンターラインを保つ。", "brief": ["離陸前点検（チェックリスト：Enter で 1 項目ずつ）→ 管制の離陸許可を正しく復唱（1〜3 キー）。", "フルパワー（R 長押し）。<b>E（右ラダー）で機首をセンターラインに</b>（プロペラの左偏向）。", "<b>60 kt（Vr）</b>で S を押して機首を約 8° 上げて浮揚。<b>76 kt（Vy）</b>で上昇し、地上 1,000 ft まで（滑走路の方位を保つ）。"], "std": "センターライン ±8 m・浮揚 60 ±7 kt・上昇 76 ±10 kt・針路 ±10°", "setup": {"at": "runway"}},
		{"id": "t2", "title": "場周経路（トラフィックパターン）", "goal": "ダウンウインドから左場周を飛んで着陸する", "aircraft": "pa28", "book": ["ops.pattern"], "why": "空港の周りの決まった経路（場周経路）を全員が同じ高さ・同じ形で飛ぶことで、互いを見つけやすくし衝突を防ぐ（AIM 4-3-3）。高度・位置・速度・外形変更の段取りが着陸の質を決める。", "brief": ["左場周（LAB RWY 36）。<b>ダウンウインド</b>：地上 1,000 ft、90 kt、滑走路から約 1.6 km 離れて平行に（磁方位 180°）。", "滑走路の進入端の真横（アビーム）で<b>パワーを絞り（約 1,500 rpm）、フラップ 10°</b>、降下開始。", "進入端が斜め後ろ 45° に見えたら左旋回して<b>ベース</b>（方位 090°）、フラップ 25°、75 kt。", "最終進入（<b>ファイナル</b>）はセンターラインに合わせて 70 kt、フラップ 40°。PAPI が赤 2 白 2 なら正しい角度（3°）。"], "std": "ダウンウインド 高度 ±100 ft・速度 ±10 kt、ファイナル 70 ±5 kt、接地は下の着陸基準", "setup": {"at": "downwind"}},
		{"id": "t3", "title": "通常着陸", "goal": "安定した進入から、接地帯にやさしく接地する", "aircraft": "pa28", "book": ["ops.landing"], "why": "着陸の質は進入の安定で決まる。「500 ft で安定していなければゴーアラウンド」は世界中の運航で使われる考え方（安定進入）。", "brief": ["ファイナル（約 5 km）から。<b>70 kt・3° の進入角</b>（PAPI 赤 2 白 2、昇降率 約 −370 fpm）、フラップ 40°。", "<b>地上 500 ft で安定</b>（速度・進入角・センターライン）していなければゴーアラウンド。", "滑走路の端を越えたらアイドル、地上 10〜15 ft で S を少しずつ押して機首を上げる（フレア）。主輪から接地し、B でブレーキ。"], "std": "ファイナル 70 ±5 kt・センターライン ±30 m・進入角 3 ±0.9°、接地 300 fpm 以下・目標点の −100〜+400 m・センターライン ±6 m", "setup": {"at": "final", "km": 5}},
		{"id": "t4", "title": "着陸復行（ゴーアラウンド）", "goal": "進入を中止して安全に上昇へ移る", "aircraft": "pa28", "book": ["ops.goaround"], "why": "ゴーアラウンドは失敗ではなく、安全のための正しい判断。迷わず実行できるよう手順を体に覚えさせる。最大の危険はフラップを一度に上げて沈むこと、と機首の上げすぎ。", "brief": ["「ゴーアラウンド」：<b>①フルパワー（R）②機首を上昇姿勢へ ③フラップを 25° に（V を押して 1 段ずつ…この教材では一周して UP に戻るので注意）④正の上昇を確認 ⑤64〜76 kt で上昇、フラップを段階的に上げる</b>。", "沈み込まないことが最重要です。"], "std": "指示から 3 秒以内にフルパワー・高度損失 50 ft 以内・地上 800 ft まで上昇", "setup": {"at": "final", "km": 4}},
		{"id": "e1", "title": "離陸中止", "goal": "離陸滑走中の異常で、安全に止まる", "aircraft": "pa28", "book": ["emg.abort"], "why": "浮揚前の異常（計器の異常・エンジンの不調・何か変だ）は「止まる」が原則。判断が遅れるほど止まる距離が足りなくなる。", "brief": ["「離陸中止（アボート）」の指示：<b>①スロットル アイドル（Shift+F で一気に、または F を押し続ける）②ブレーキ（B）③ラダーでセンターライン</b>。", "判断は早く。迷ったら止める。"], "std": "指示から 2 秒以内にアイドル・センターライン ±8 m・滑走路内で停止", "setup": {"at": "runway"}},
		{"id": "e2", "title": "離陸直後のエンジン故障", "goal": "低高度のエンジン故障で、滑空速度を保ってほぼ正面に降りる", "aircraft": "pa28", "book": ["emg.engine"], "why": "低高度で引き返そうとする旋回（いわゆる「インポッシブル・ターン」）は失速・スピンの典型事故。正面の安全な場所へ、速度を保って降りる。", "brief": ["<b>すぐに機首を下げて 76 kt（最良滑空速度）</b>。これが最優先（Aviate）。", "<b>引き返さない</b>。左右 30° 以内の、できるだけ平らな場所へ。", "フラップは降りる場所が確実になってから。接地直前にフレア。"], "std": "5 秒以内に滑空姿勢・滑空速度 76 ±10 kt・針路 ±30°・安全に接地", "setup": {"at": "runway"}},
		{"id": "e3", "title": "上空でのエンジン故障（滑走路へ滑空）", "goal": "最良滑空速度で LAB RWY 36 まで戻り着陸する", "aircraft": "pa28", "book": ["emg.engine"], "why": "エンジン故障時の優先順位は Aviate（速度を保つ）→ Navigate（降りる場所へ）→ Communicate（無線）。最良滑空速度を保つことが滑空距離を最大にする。", "brief": ["<b>76 kt を保つ</b>（速すぎても遅すぎても届かない）。", "MFD の地図で LAB RWY を確認し、まっすぐ向かう。高すぎれば S 字や大きめの旋回で高度を捨てる。届かないと判断したら近くの平らな場所へ（湖は避ける）。", "無線：余裕ができたら MAYDAY（1〜3 キーで正しい通報を選ぶ）。フラップは滑走路が確実になってから。"], "std": "滑空速度 76 ±8 kt・滑走路（または安全な場所）に接地", "setup": {"at": "away", "from": "rwy", "brg": 70, "km": 4, "altFt": 3000, "toward": false, "hdg": 70, "kt": 100}},
		{"id": "e4", "title": "強制着陸（場外地への不時着）", "goal": "高度のあるエンジン故障で、届く場外地を選び、滑空を管理して実際に降ろす", "aircraft": "pa28", "book": ["emg.engine"], "why": "滑走路まで届かない高度と距離では、「どこへ降りるか」と「滑空の管理」がすべて。速すぎれば届きすぎ、遅すぎれば届かない。最良滑空速度を守り、余った高度は S ターンやフラップで計画的に捨てる。エンジンが止まった以上、ゴーアラウンドはできない——だからこそ選定と判断が着陸そのものより先に来る。", "brief": ["<b>76 kt（最良滑空速度）を守る</b>。今日の滑走路は後方 9 km、届きません。降りるのは南東の平らな草地（滑走路の南東）です。", "高度は余ります。まっすぐ向かえば高く着きすぎるので、<b>S ターンで高度を捨て</b>、低くなりすぎないよう管理します。フラップは草地が確実になってから。", "選定の基準：風上に向かって降りられる、平らで長い、湖や森や町を避ける。まず選ぶ（Navigate）、余裕があれば通報（Communicate）。"], "std": "滑空速度 76 ±8 kt・選定した草地の 700 m 以内に接地・接地の降下率 500 fpm 以下（場外の不時着：脚が壊れる 1,000 fpm には遠く）・風上（北向き ±30°）に接地", "setup": {"at": "away", "from": "rwy", "brg": 165, "km": 9.31, "altFt": 3900, "toward": false, "hdg": 360, "kt": 100}},
		{"id": "c1", "title": "ソロ前の審査（模擬 Check Flight）", "goal": "離陸・空中操作・失速・緊急・着陸を通しで審査", "aircraft": "pa28", "book": ["intro.course"], "why": "公開情報では、レッスン 12 回の後の審査に合格するとソロへ進む。ここではその「通し」の練習を、これまでの課目の基準で行う（実際の審査基準ではない）。", "brief": ["審査官の指示に従って飛びます。<b>1 項目でも基準外なら不合格</b>。", "内容：離陸 → 直線水平 → 急旋回（左）→ パワーオフ失速 → 模擬エンジン故障（滑走路へ滑空・着陸）。", "各項目の前に目標値を声に出して確認しましょう（教官に伝えるつもりで）。"], "std": "各課目の基準と同じ", "setup": {"at": "runway"}},
	]},
	{"id": "s2", "title": "第 2 段階　航法・横風・目的地変更", "phase": "p3", "desc": "公開情報では、地図と上空の風から針路を計算して目的地へ飛ぶ Navigation 訓練、目的地変更、エンジン停止の想定、現在地を見失った場合の対処を訓練する。", "lessons": [
		{"id": "x1", "title": "横風着陸", "goal": "横風の中で、機体をまっすぐ滑走路に接地させる", "aircraft": "pa28", "book": ["ops.xwind"], "why": "横風で流されたまま接地すると、脚に横向きの力がかかって滑走路を外れる（ランウェイエクスカーション）。Archer の実証横風成分は 17 kt（それ以上が禁止という意味ではないが、技量と相談）。", "brief": ["進入中は<b>機首を風上に向けたクラブ</b>でセンターラインを保つ（航跡を合わせる）。", "接地直前に<b>風下側のラダーで機首を滑走路と平行</b>にし、<b>風上側の翼を少し下げて（エルロン）</b>流されないようにする（ウイングロー）。", "接地後もエルロンは風上側へ。速度が落ちるほど大きく。"], "std": "通常着陸の基準＋接地時の横流れ 1.5 m/s 以下・機首方向 ±5°", "setup": {"at": "final", "km": 5, "wind": {"rel": 60, "kt": 12, "gust": 1.3}}},
		{"id": "x2", "title": "短距離着陸", "goal": "目標点に正確に接地し、短い距離で止まる", "aircraft": "pa28", "book": ["ops.short"], "why": "短い滑走路・障害物のある空港で使う技術。速度と進入角の正確さがそのまま接地点の正確さになる。自家用 ACS の Short-Field Landing。", "brief": ["フラップ 40°、<b>65 kt</b> で正確に 3° の進入。", "目標点（滑走路端から 300 m）の手前 0〜先 60 m 以内に接地（基礎レベル）。", "接地したらすぐにアイドル、ブレーキ（B を押し続ける）。"], "std": "接地：目標点 ±60 m・接地後 400 m 以内に停止", "setup": {"at": "final", "km": 4.5, "flaps": 3, "kt": 65}},
		{"id": "x3", "title": "短距離離陸", "goal": "最短の距離で浮揚し、Vx で障害物を越える", "aircraft": "pa28", "book": ["ops.short"], "why": "短い滑走路や前方の障害物を越える離陸。Vx（最良上昇角速度）は「水平距離あたり最も高く」上がれる速度。自家用 ACS の Short-Field Takeoff。", "brief": ["ブレーキ（B）を踏んだままフルパワー（R）→ 回転が上がったらブレーキを離す。", "Vr 60 kt で浮揚し、<b>64 kt（Vx）</b>で障害物（地上 50 ft）を越えるまで上昇。その後 76 kt（Vy）へ。"], "std": "Vx 64 +5/−5 kt で地上 50〜300 ft を上昇", "setup": {"at": "runway"}},
		{"id": "n1", "title": "VOR の追跡", "goal": "VOR 局に向かうコースに乗り、局通過まで追跡する", "aircraft": "pa28", "book": ["nav.vor"], "why": "VOR は GPS が使えないときの基本の電波航法（FAA の Minimum Operational Network として維持されている）。CDI の針の動きを読んで風の修正角を見つける力は、計器飛行の土台になる。", "brief": ["PFD の <b>CDI</b>（HSI の中のコースの針）を使います。PFD の下の <b>CDI</b> キーで NAV1 に切り替え、CRS（3D の操縦席ではつまみ、2D の計器盤では −/+）でコースを合わせる。", "<b>TO 表示で針が右なら右へ修正（針の方へ飛ぶ）</b>。針が中央に戻り始めたら修正を半分戻す（ブラケッティング）。風があると、針が止まる針路＝風の修正角。", "目盛りは片側 2 ドット：VOR は 1 ドット＝5°、2 ドット（いっぱい）＝10°。局に近づくほど針は敏感に。局上空で TO が FROM に変わります。"], "std": "追跡中 CDI ±1 ドット・高度 ±150 ft（局から 1 NM 以上の区間）", "setup": {"at": "away", "brg": 220, "km": 22, "altFt": 3000, "toward": true, "offset": 25, "kt": 100, "nav": "VOR", "obsOff": -40, "wind": {"rel": 80, "kt": 12, "gust": 0.6}}},
		{"id": "n2", "title": "推測航法と目的地変更", "goal": "針路と時間で目標へ飛び、途中の目的地変更で新しい針路・距離・時間を見積もる", "aircraft": "pa28", "book": ["nav.dr", "nav.divert"], "why": "公開情報では「地図に線を引き上空の風から針路を計算して目的地へ飛ぶ」「目的地変更に伴う再計算」を訓練する。計算（見積もり）→ 実行 → 確認、を素早く回す力。", "brief": ["最初は LAB-A（架空の訓練点・赤い塔）へ。MFD の地図で方位と距離を確認し、風で流される分だけ風上へ針路を修正する。", "途中で「目的地変更」：LAB-F へ。<b>針路（磁方位）・距離（NM）・所要時間（分）</b>を見積もって入力し、すぐに新しい針路へ。", "見積もりのコツ：MFD の地図のレンジ環で距離、対地速度 GS で時間（距離 ÷ GS × 60）。"], "std": "高度 ±200 ft・各目標の 1 NM 以内に到達・見積もり：針路 ±15°、距離と時間 ±20%", "setup": {"at": "away", "from": "rwy", "brg": 10, "km": 2, "altFt": 3000, "hdg": 50, "kt": 105, "fpl": ["LABRW", "LABEA"], "wind": {"rel": 270, "kt": 12, "gust": 0.6}}},
		{"id": "n3", "title": "現在地を見失ったとき（GPS 故障）", "goal": "GPS が使えない中、VOR と DME で位置を確かめて飛行場へ戻る", "aircraft": "pa28", "book": ["nav.lost", "nav.vor"], "why": "公開情報では「現在地を見失った場合の対処」も訓練する。慌てずに 5C（Climb・Communicate・Confess・Comply・Conserve）、使える航法装置で位置を確かめる。", "brief": ["GPS が故障し、MFD の地図と GPS のコースが使えなくなります。", "①管制に正直に伝える（1〜3 キー）②CDI を NAV1（LAB VOR 113.50）に ③CRS を回して針が中央・TO になる方位＝局への方位 ④局へ向かい、DME の距離が減ることを確かめる ⑤局から LAB RWY へ（局の西南西 約 5.6 NM）。", "高度を上げると電波が届きやすく、地上の目標も見つけやすい（Climb）。燃料を節約（Conserve）。"], "std": "VOR 局の 1 NM 以内を通過・LAB RWY の 2 NM 以内に戻る・高度 ±300 ft", "setup": {"at": "away", "brg": 30, "km": 20, "altFt": 3000, "hdg": 120, "kt": 100}},
	]},
	{"id": "s3", "title": "第 3 段階　計器飛行の導入", "phase": "p4", "desc": "公開情報では、計器のみを頼りに飛ぶ計器飛行の訓練を行う。フード（外が見えない状態）で、PFD だけで飛ぶ。", "lessons": [
		{"id": "i1", "title": "基本計器飛行", "goal": "計器だけで水平・標準旋回・上昇降下", "aircraft": "pa28", "book": ["ifr.scan"], "why": "雲の中では体の感覚（前庭感覚）が当てにならず、錯覚で姿勢を誤る（空間識失調）。計器を正しい順で見て、姿勢を作る（Attitude Instrument Flying）。", "brief": ["外は見えません。<b>姿勢表示を中心に、放射状に目を動かす</b>（姿勢→高度→姿勢→方位→姿勢→速度）。", "標準旋回率（1 秒に 3°）：PFD の方位表示の上のマゼンタの線（旋回率の目安）を 3°/秒の印に合わせる。100 kt でバンク約 17°（速度 ÷ 10 ＋ 7）。", "上昇・降下は 500 fpm（VSI）。"], "std": "水平 ±100 ft ±10°、旋回率 3 ±1 °/秒、昇降率 500 ±150 fpm（計器飛行 ACS を参考にした教材値）", "setup": {"at": "area", "kt": 100, "hdg": 90, "hood": true}},
		{"id": "i2", "title": "異常姿勢からの回復", "goal": "計器だけで、機首上げ・機首下げの異常姿勢から回復する", "aircraft": "pa28", "book": ["ifr.upset"], "why": "空間識失調や計器の見落としで、気づいたら異常な姿勢になっていることがある。どちらの状態かを速く判断し、正しい順序で回復する（順序を間違えると、構造の破壊や失速に至る）。", "brief": ["<b>機首上げ・低速</b>：①フルパワー ②機首を下げる ③翼を水平。", "<b>機首下げ・高速（スパイラル）</b>：①パワー アイドル ②<b>先に翼を水平</b> ③それから機首を上げる（傾いたまま引くと旋回が締まるだけ）。", "速度表示・姿勢表示・高度を素早く見て、どちらの状態か判断します。"], "std": "失速なし・Vne 超過なし・荷重 3.8 G 以下・12 秒以内に水平", "setup": {"at": "area", "kt": 100, "hdg": 90, "hood": true}},
		{"id": "i3", "title": "部分パネル（AHRS 故障）", "goal": "主の姿勢・方位表示が故障した中で、予備計器で飛ぶ", "aircraft": "pa28", "book": ["ifr.partial"], "why": "G1000 の姿勢・方位は AHRS という装置から来る。故障すると PFD の姿勢と方位に赤い × が出る。予備の姿勢指示器・速度計・高度計（スタンバイ計器）と磁気コンパスで飛び続ける力が必要。", "brief": ["飛行中に <b>AHRS が故障</b>し、PFD の姿勢表示と方位表示が使えなくなります（赤い ×）。", "使えるのは <b>右下の予備の姿勢・速度・高度</b>と、速度テープ・高度テープ・昇降率、GPS の航跡（TRK）。", "旋回は浅いバンク（10〜15°）で、航跡（MFD 上の TRK）を見て止める。"], "std": "高度 ±150 ft・針路（航跡）±15°（60 秒）", "setup": {"at": "area", "kt": 95, "hdg": 90, "hood": true}},
		{"id": "i8", "title": "部分パネル実践（コンパス旋回・計時旋回）", "goal": "AHRS と GPS が落ちた中で、磁気コンパスと時計で旋回して針路を変える", "aircraft": "pa28", "book": ["ifr.partial"], "why": "姿勢も方位も GPS も失ったら、残るのは予備計器と磁気コンパスと時計。磁気コンパスは旋回中に大きくずれる（北では遅れ、南では進む）ので、そのままでは止められない。標準旋回率なら「秒数＝角度」が読める——計時旋回は、コンパスを当てにできない場面の実技。", "brief": ["<b>AHRS と GPS が同時に故障</b>します。使えるのは右下の予備の姿勢・速度・高度と、磁気コンパス、時計だけ。", "<b>計時旋回</b>：標準旋回率（3°/秒）なら 90° は 30 秒。バンク約 15°（95 kt）で旋回し、時計で数えて戻す。", "<b>コンパス旋回</b>：コンパスのずれを見越して、目標より約 15° 手前で戻し始める（ rollout の進み・遅れの補正）。旋回は浅く（バンク 10〜15°）、高度は予備の高度計で守る。"], "std": "高度 ±150 ft・計時旋回 90° を 30 秒 ±12 秒で・ロールアウト（航跡）±15°", "setup": {"at": "area", "kt": 95, "hdg": 90, "hood": true}},
		{"id": "i4", "title": "待機経路（ホールディング）", "goal": "VOR を基準に、1 分の直線と標準旋回でレーストラックを飛ぶ", "aircraft": "pa28", "book": ["ifr.hold"], "why": "管制が順番待ちや天候待ちで使う待機経路。決まった形を正確に飛ぶことで、他機との間隔が保たれる（AIM 5-3-8）。", "brief": ["インバウンドコース 090°（局へ東向き）で VOR 局へ。局通過（TO→FROM）で<b>右へ標準旋回</b>してアウトバウンド 270° へ。", "アウトバウンドは<b>1 分</b>（タイマーのつもりで数える）。", "右へ標準旋回してインバウンド 090° のコースに乗り直し、局へ戻る。", "<b>進入方式</b>は、フィックスへ向かう針路とインバウンドコースのなす角で決まります：コースの ±70° 以内なら <b>Direct</b>、保持側（右旋回ならコースの右側）から大きく外れて来れば <b>Teardrop</b>、非保持側からなら <b>Parallel</b>（AIM 5-3-8）。", "<b>風の修正</b>：今日の風 010°・5 kt、TAS 100 kt では、インバウンドの風修正角は約 −3°（針路 087°）。アウトバウンドでは修正を<b>3 倍</b>にして針路 約 278°、アウトバウンド時間は対地速度の比で約 <b>59 秒</b>（インバウンドが 1 分になる長さ）。"], "std": "旋回率 3 ±1 °/秒・アウトバウンド 60 ±15 秒・高度 ±100 ft・進入方式の判定", "setup": {"at": "away", "brg": 270, "km": 9, "altFt": 3000, "hdg": 90, "kt": 100, "nav": "VOR", "obs": 90}},
		{"id": "i5", "title": "ILS 進入", "goal": "ローカライザーとグライドスロープに乗って、決心高度まで計器で進入する", "aircraft": "pa28", "book": ["ifr.ils"], "why": "ILS は雲の下限が低いときに滑走路へ降りるための精密進入。決心高度（DA）で滑走路が見えなければ必ず進入復行（ミスト・アプローチ）する。", "brief": ["NAV1 が I-LAB（109.90）、CDI が NAV1（LOC）。<b>CDI の針＝ローカライザー（左右）、右端の菱形＝グライドスロープ（上下）</b>。", "針が動き始めたら滑走路の方位 360° へ旋回して乗る。菱形が中央に下りてきたら、パワーを絞り 80 kt・約 −430 fpm で降下（フラップ 10°）。", "<b>決心高度（地上 200 ft）</b>でフードが外れ、滑走路が見えたら着陸。"], "std": "LOC・GS ±1 ドット（地上 1,000〜200 ft の 85% 以上）＋着陸", "setup": {"at": "ils", "km": 14, "altFt": 2000, "hood": true, "nav": "ILS"}},
		{"id": "i6", "title": "RNAV（GPS）進入", "goal": "GPS のファイナルコースと LPV の垂直ガイダンスで、決心高度まで進入して着陸する", "aircraft": "pa28", "book": ["ifr.ils"], "why": "RNAV（GPS）進入は、地上の電波施設がなくても精密に近い進入ができる方式。LPV は衛星の補正で垂直ガイダンスを持ち、ILS と同じように決心高度（DA）で判断する。LAB の RNAV RWY 36（架空）：FAF は滑走路端から 5.0 NM・2,000 ft、LPV DA 305 ft MSL、LNAV MDA 505 ft MSL。", "brief": ["PROC で <b>RNAV (GPS) RWY 36</b> をロード（この課目では開始時にロード済み）。CDI は <b>GPS</b>、目盛りは進入の 0.3 NM。針＝ファイナルコースからのずれ、右端の菱形＝LPV の垂直パス（3°）。", "針が動き始めたら滑走路の方位 360° へ旋回して乗る。菱形が中央に下りてきたら、パワーを絞り 80 kt・約 −430 fpm で降下（フラップ 10°）。", "<b>決心高度（DA 305 ft MSL＝地上 約 250 ft）</b>でフードが外れ、滑走路が見えたら着陸。見えなければ即ミストアプローチ（i7 で練習）。"], "std": "コース・垂直パス ±1 ドット（地上 1,000〜250 ft の 85% 以上）＋着陸", "setup": {"at": "ils", "km": 14, "altFt": 2000, "hood": true, "nav": "RNAV"}},
		{"id": "i7", "title": "実 IMC：ミニマでの判断とミストアプローチ", "goal": "低い視程の中で RNAV 進入をミニマまで飛び、滑走路が見えなければ進入復行する", "aircraft": "pa28", "book": ["ifr.ils"], "why": "実際の計器気象状態（IMC）では、ミニマで滑走路環境が見えるかどうかが着陸の可否のすべて。見えないのに降り続ける（ダックアンダー）は事故の典型で、決心高度での進入復行は「失敗」ではなく手順そのもの。この課目では視程 1/2 SM の霧で、DA で滑走路は見えません。", "brief": ["RNAV (GPS) RWY 36、LPV DA <b>305 ft MSL</b>。視程 1/2 SM の霧の中という設定で、計器だけが頼りです（CADET では低い雲の日に飛ぶと、本物の雲の中になります）。", "進入は i6 と同じ：コースと垂直パスを ±1 ドットに保って DA まで。", "<b>DA で滑走路環境が見えなければ、ためらわずミストアプローチ</b>：フルパワー → 上昇姿勢 → フラップ段階的に → 正の上昇を確認して LAB-D へ直行・3,000 ft へ。"], "std": "コース・垂直パス ±1 ドット（地上 1,000〜250 ft）・DA での判断（ミストアプローチ）・3,000 ft まで上昇", "setup": {"at": "ils", "km": 14, "altFt": 2000, "hood": true, "nav": "RNAV"}},
	]},
	{"id": "s4", "title": "第 4 段階　Piper Seminole（双発）", "phase": "p5", "desc": "公開情報では、双発機 Piper Seminole で片発停止や機材故障の対応を訓練し、最後の Check Flight を経てライセンスを取得する。", "lessons": [
		{"id": "m1", "title": "双発の離陸と上昇", "goal": "引き込み脚の双発機で離陸し、脚を上げて Vy で上昇", "aircraft": "pa44", "book": ["me.basics"], "why": "双発機は速く重く、脚を格納する。離陸前に「片発停止ならどうするか」を必ずブリーフィングする（速度の赤線 Vmc と青線 Vyse を言えること）。", "brief": ["離陸前点検とブリーフィング：<b>Vr 75・Vyse 88（青線）・Vmc 56（赤線）</b>。", "フルパワー。左右逆回転のプロペラなので、単発機ほど左に振られない。75 kt でローテーション。", "<b>正の上昇率</b>（VSI がプラス・高度が増えている）を確認したら<b>脚を上げる（G）</b>。使える滑走路が残っていない高さで。", "88 kt（Vy）で上昇。"], "std": "センターライン ±8 m・浮揚 75 ±7 kt・地上 500 ft までに脚 UP・上昇 88 ±10 kt", "setup": {"at": "runway"}},
		{"id": "m2", "title": "上空での片発停止（Identify・Verify・Feather）", "goal": "片方のエンジンが止まったとき、方向を保ち、止まった側を特定してフェザーする", "aircraft": "pa44", "book": ["me.oei", "me.vmc"], "why": "片発になると、生きているエンジンの推力で機首が止まった側へ振られ（非対称推力）、止まったプロペラの抗力が加わる。ラダーで方向を保ち、正しいエンジンをフェザーしないと上昇できない。生きているエンジンを止めるのが最悪の誤り。", "brief": ["まず<b>方向を保つ</b>：機首が振られる側と反対のラダー（機首が左へ振られたら E）。<b>速度 88 kt（青線 Vyse）</b>。", "<b>Identify（特定）</b>：踏んでいない足の側のエンジンが止まっている（Dead foot, dead engine）。<b>Verify（確認）</b>：そのスロットルを絞っても何も変わらないこと（教材では説明のみ）。<b>Feather</b>：[＝左・]＝右 のキーでプロペラを止めて抗力を減らす。", "生きているエンジン側へ<b>2〜5° バンク</b>するとラダーが少なくて済み、横滑りが減る。キーボードでは Z / X のラダートリムで足を楽に。"], "std": "針路 ±20°（故障直後）・30 秒以内に正しいエンジンをフェザー・その後 Vyse ±5 kt・針路 ±10° を連続保持", "setup": {"at": "area", "kt": 120, "hdg": 90, "altFt": 4000, "gear": false}},
		{"id": "m3", "title": "Vmc デモンストレーション", "goal": "片発で速度を下げると方向が保てなくなる速度（Vmc）を知り、正しく回復する", "aircraft": "pa44", "book": ["me.vmc"], "why": "Vmc（赤線）より遅いと、ラダーをいっぱいに使っても方向を保てず、機体は止まった側へ横転する（Vmc ロール）。低高度では致命的。兆候が出たら「生きている側の出力を絞り、機首を下げる」で必ず回復できることを体験する（ACS の Vmc Demonstration）。", "brief": ["左エンジンをアイドル（模擬停止）、右エンジン全開。機首を上げて<b>1 秒に約 1 kt</b> ずつ減速。ラダーで方向を保つ。", "<b>方向が保てなくなる（ラダーいっぱいでも機首が止まった側へ回る）・失速警報・振動</b>のどれかが出たら即回復。", "<b>回復：①生きているエンジンの出力を絞る（F）②機首を下げる ③82 kt（Vsse）以上に加速 ④方向を戻したら徐々に出力</b>。"], "std": "兆候から 3 秒以内に出力を減らす・回復で失う高度 300 ft 以内・失速しない", "setup": {"at": "area", "kt": 100, "hdg": 90, "altFt": 5000, "gear": false, "thr": 0.8}},
		{"id": "m4", "title": "離陸直後の片発停止", "goal": "浮揚直後に片方のエンジンが止まっても、Vyse で上昇を続ける", "aircraft": "pa44", "book": ["me.oei"], "why": "双発機の最も危険な場面。脚と止まったプロペラの抗力で、何もしなければ上昇できない。速度（Vyse）・脚 UP・フェザーを数秒で。", "brief": ["浮揚後、片方のエンジンが止まります：<b>①方向（ラダー）②Vyse 88 kt ③脚 UP（G）④Identify・Verify・Feather（[ / ]）</b>。", "生きている側へ 2〜5° バンク。上昇率は小さい（数百 fpm）ので、まっすぐ・速度を守る。", "地上 1,000 ft まで上昇したら、場周経路で戻る準備（この課目はそこまで）。"], "std": "Vyse 88 ±5 kt・30 秒以内にフェザー・針路 ±20°・地上 1,000 ft まで上昇", "setup": {"at": "runway"}},
		{"id": "e6", "title": "離陸判断ドリル（中断／継続）", "goal": "Vr 前の異常は止まり、浮揚後の片発停止は止まらずに飛び続ける", "aircraft": "pa44", "book": ["emg.abort", "me.oei"], "why": "双発の離陸は「速度で判断が分かれる」：Vr より前なら、異常は止まって直す。浮揚して脚が上がれば、残りの滑走路では止まれない——Vyse で飛び続けるのが安全。判断を離陸前のブリーフィングで決めておくから、起きたときに迷わない。もう 1 つ大事なのが、止まったあと「滑走路があと何 m あるか」を読む力（再離陸できるかの判断）。", "brief": ["<b>Vr 75 kt より前の異常 → 離陸中止</b>（アイドル・ブレーキ・センターライン）。<b>浮揚後の片発停止 → 継続</b>（方向 → Vyse 88 kt → 脚 UP → Identify・Verify・Feather）。", "1 回目は Vr 前にエンジンの異常（振動・回転のばらつき）が出ます。迷わず止まり、止まった位置から<b>滑走路の残量</b>を見積もります。", "2 回目は浮揚直後に片方が止まります。今度は止まれません。片発で地上 800 ft まで上昇します。"], "std": "Vr 前：指示から 2 秒以内にアイドル・滑走路内で停止・残量の見積もり ±150 m。浮揚後：Vyse 88 ±5 kt・30 秒以内に正しい側をフェザー・地上 800 ft まで上昇", "setup": {"at": "runway"}},
		{"id": "m5", "title": "片発の進入と着陸", "goal": "片発のまま安定した進入をして着陸する", "aircraft": "pa44", "book": ["me.oei"], "why": "片発ではゴーアラウンドの性能がほとんどない。着陸が確実になるまで脚とフラップを出しすぎず、Vyse を保つ。", "brief": ["左エンジンはフェザー済み。<b>88 kt（Vyse）</b>で進入し、着陸が確実（滑走路に届く）になってから脚 DOWN・フラップ。", "生きているエンジンの出力を変えると機首が振れるので、ラダーも一緒に。", "GUMPS（着陸前点検）を忘れずに。"], "std": "ファイナル 88 ±5 kt・接地は着陸の基準", "setup": {"at": "final", "km": 5, "kt": 88, "flaps": 0, "gear": false}},
	]},
	{"id": "s5", "title": "第 5 段階　CRM・TEM（考え方の練習）", "phase": "p6", "desc": "基礎訓練の先（副操縦士の訓練）につながる考え方。ここでは一人で飛びながら、脅威（Threat）を予測し、エラー（Error）に気づいて管理する練習をする（教材の一般的な内容で、ANA の訓練内容の再現ではない）。", "lessons": [
		{"id": "r1", "title": "TEM：脅威を予測して管理する", "goal": "出発前に脅威を挙げ、飛行中の変化に早めに気づいて対処する", "aircraft": "pa28", "book": ["crm.tem"], "why": "TEM（Threat and Error Management）は、事故の多くが「予想できた脅威」や「気づけたエラー」の積み重ねで起きる、という考え方。出発前のブリーフィングで脅威を言葉にしておくと、起きたときに速く対処できる。", "brief": ["出発前ブリーフィング：今日の脅威（突風を伴う横風、場周の他機、自分の疲れ…）を挙げ、対策を決める（1〜3 キーで答える）。", "飛行中、管制の指示と自分の理解が食い違う場面が来ます。聞き返す・確認するのが正しい対処。", "最後は横風の中で着陸。"], "std": "各判断の正解・横風着陸の基準", "setup": {"at": "downwind", "wind": {"rel": 70, "kt": 10, "gust": 1.6}}},
	]},
	{"id": "s6", "title": "第 6 段階　複雑機エンドースメント＋教官飛行（試作）", "phase": "p6", "desc": "（次期拡張・項目 6）引込脚＋定速プロペラの複雑機 Piper Arrow への移行訓練（エンドースメントの想定）と、教官として訓練生に同乗する CFI モードの試作 1 本。どちらも教材の設計で、実際の資格・承認とは関係ない。", "lessons": [
		{"id": "cx1", "title": "複雑機への移行：離陸・脚上げ・プロペラ設定", "goal": "Arrow で離陸し、脚を上げ、巡航ではプロペラレバーで回転数を設定する", "aircraft": "pa28r", "book": ["me.basics"], "why": "複雑機（complex）では出力の設定が 2 本のレバーに分かれる：スロットルがマニホールド圧（MAN IN）、プロペラレバーがガバナーの保つ回転数。離陸は両方いちばん前、巡航は回転数を下げて（例：2,400 rpm）騒音と負担を減らす。脚は抗力の大きな部品で、正の上昇を確認したらすぐ上げる。", "brief": ["離陸前点検（複雑機版）：<b>プロペラ FULL FORWARD・脚 DOWN 緑 3 つ</b>を声に出す。", "<b>65 kt（Vr）</b>で浮揚、正の上昇を確認して<b>脚 UP（G）</b>、<b>90 kt（Vy）</b>で上昇。", "巡航ではプロペラレバーを引いて <b>2,400 rpm 設定</b>へ（, キー）。回転数が下がると、同じスロットルでも MAN IN は少し上がり、出力は少し下がる——2 つの計器をセットで読む。", "着陸とゴーアラウンドに備え、最後はプロペラを前へ戻す（. キー）。"], "std": "センターライン ±8 m・浮揚 65 ±7 kt・地上 500 ft までに脚 UP・巡航で 2,400 rpm 設定（±150）", "setup": {"at": "runway"}},
		{"id": "cx2", "title": "複雑機の進入と着陸（GUMPS）", "goal": "脚とプロペラの確認（GUMPS）をして、Arrow で安定した進入から着陸する", "aircraft": "pa28r", "book": ["ops.landing"], "why": "引込脚機の着陸事故でいちばん多いのが脚の出し忘れ（ギアアップ着陸）。GUMPS（Gas・Undercarriage・Mixture・Propeller・Switches/Seatbelts）をファイナルで声に出すのが防ぎ方。プロペラは FULL FORWARD：ゴーアラウンドで全出力をすぐ使えるように。", "brief": ["ファイナル（約 5 km）から。<b>75 kt・3°</b>、フラップ 40°。", "<b>GUMPS</b>：燃料・<b>脚 DOWN 緑 3 つ</b>・ミクスチャー RICH・<b>プロペラ FULL FORWARD</b>・スイッチとベルト。", "地上 500 ft で安定していなければゴーアラウンド。"], "std": "ファイナル 75 ±5 kt・接地は通常着陸の基準・脚 DOWN で接地", "setup": {"at": "final", "km": 5}},
		{"id": "cx3", "title": "複雑機のゴーアラウンド（手順の順序）", "goal": "フルパワー・プロペラ前へ・フラップ段階・脚上げを、正しい順序で素早く", "aircraft": "pa28r", "book": ["ops.goaround"], "why": "ゴーアラウンドの順序は複雑機でこそ大切：①フルパワー ②プロペラ FULL FORWARD（回転数が巡航設定のままでは全出力が出ない）③フラップは段階的に ④正の上昇を確認して脚 UP。脚を早く上げすぎるのも、フラップを一度に上げるのも沈下のもと。", "brief": ["巡航設定（プロペラ 2,400 rpm）のまま進入してきます。ゴーアラウンドの合図で手順を開始。", "<b>①フルパワー（R）②プロペラ FULL FORWARD（. キー）③フラップ 25° ④正の上昇で脚 UP（G）</b>。", "78 kt 前後で上昇し、地上 800 ft まで。"], "std": "3 秒以内にフルパワー・5 秒以内にプロペラ前へ・高度損失 50 ft 以内・地上 800 ft までに脚 UP", "setup": {"at": "final", "km": 4}},
		{"id": "cf1", "title": "CFI 試作：訓練生に同乗する（指摘と介入）", "goal": "右席の教官として、訓練生の飛行を見て、ずれに気づいて指摘し、最後は自分で立て直す", "aircraft": "pa28", "book": ["crm.tem"], "why": "教官の仕事は「自分が上手く飛ぶ」ことではなく「相手のずれを早く見つけ、言葉で直させ、危なければ替わる」こと。この試作では、訓練生（教材の自動操縦）がシードで決まる 1 つのミスをします。あなたは同乗して観察し、指摘の選択をし、最後に自分で操縦して立て直します。（設計メモ：cadet/docs/complex-cfi-design.md）", "brief": ["最初に、訓練生の前回の記録から「今日の注意点」を選ぶ（ブリーフィング）。", "訓練生が水平飛行をします。手は出さず、計器を広く見て、ずれの<b>種類と大きさ</b>を掴む。", "ずれが育ったら指摘する。直らなければ「I have control」で替わる——その判断と、最後の講評の言い方が採点されます。"], "std": "ブリーフィング・指摘・講評の選択が正しいこと＋介入後の水平飛行（高度 ±100 ft・針路 ±10° を 15 秒）", "setup": {"at": "area", "kt": 95, "hdg": 90}},
	]},
]
