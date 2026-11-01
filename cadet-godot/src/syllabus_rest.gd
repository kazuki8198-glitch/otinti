class_name CadetSyllabusRest
extends RefCounted
# Port of the remaining lesson definitions of flight-lab/src/syllabus.js
# (HTML CADET @ 898fe8a) — Phase 3. Phase 2 ported a1/t1/t2/t3 into
# syllabus.gd; this file ports every other flight lesson (a2-a8, t4, e1-e4,
# c1, x1-x3, n1-n3, i1-i3, i8, i4-i7, m1-m5, e6, r1, cx1-cx3, cf1) plus the
# n2 diversion-estimate helpers. The k1-k6 ground-school lessons have no
# flight steps in the original either (they are dialog/radio content).
# Step fields the school engine does not consume (propTo, field) are kept as
# data, exactly as in the original (the CADET UI layer reads them there too).
# Loaded at runtime by syllabus.gd's STAGES() (no preload cycle).

const FP = preload("res://src/physics.gd")
const SC = preload("res://src/school.gd")
const SY = preload("res://src/syllabus.gd")

static func _ar() -> Dictionary:
	return FP.aircraftById("pa28")["v"]

static func _sm() -> Dictionary:
	return FP.aircraftById("pa44")["v"]

static func _aw() -> Dictionary:
	return FP.aircraftById("pa28r")["v"]

static func kk(parts: Array) -> String:
	return SY.kk(parts)

static func _w180(a: float) -> float:
	return FP.wrap180(a)

# ------------------------------------------------------------ stage s1 (rest)
static func lesson_a2() -> Dictionary:
	return {"id": "a2", "steps": [SC.stepSL("直線水平飛行", 100, 20.0, {"keys": kk(["pitch", "roll", "thr", "trim"])})]}

static func lesson_a3() -> Dictionary:
	var AR := _ar()
	var steps: Array = [
		{"name": "上昇（Vy）", "g": {"kt": AR["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["thr", "pitch", "rud"]), "say": "フルパワー（R）で %s kt を保って {alt1} ft まで上昇。ボールがずれたら E（右ラダー）" % SC._fmt_num(AR["y"]), "tgt": {"spd": SC.T_SPD(AR["y"])}, "gradeWhen": func(c, L, st): return float(st["t"]) > 10.0 and float(c["alt"]) < float(L["alt0"]) + 900.0, "until": func(c, L, st): return float(c["alt"]) >= float(L["alt0"]) + 950.0, "max": 240.0, "grade": true},
		{"name": "レベルオフ", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr", "trim"]), "say": "{alt1} ft で水平に戻し、速度が付いたらパワーを巡航へ。トリムを取って保つ", "tgt": {"alt": [func(L): return float(L["alt0"]) + 1000.0, 100]}, "hold": 15, "max": 90.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0},
		{"name": "降下", "g": {"kt": 90, "fpm": -500, "how": "rate"}, "keys": kk(["thr", "pitch", "trim"]), "say": "パワーを絞って 90 kt・約 500 fpm で {alt0} ft まで降下", "tgt": {"spd": SC.T_SPD(90), "vs": [-500, 200]}, "gradeWhen": func(c, L, st): return float(c["alt"]) > float(L["alt0"]) + 150.0 and bool(SY.established_vs(-500.0, 200.0, 4.0).call(c, L, st)), "until": func(c, L, st): return float(c["alt"]) <= float(L["alt0"]) + 60.0, "max": 240.0, "grade": true},
		{"name": "レベルオフ（降下から）", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr", "trim"]), "say": "{alt0} ft で水平に戻し、パワーを巡航へ。保つ", "tgt": {"alt": SC.T_ALT(100.0)}, "hold": 15, "max": 90.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0},
	]
	return {"id": "a3", "steps": steps}

static func lesson_a4() -> Dictionary:
	var steps: Array = []
	steps.append_array(SC.stepTurn(-1, 30, "左 360° 旋回"))
	steps.append_array(SC.stepTurn(1, 30, "右 360° 旋回"))
	return {"id": "a4", "steps": steps}

static func lesson_a5() -> Dictionary:
	var steps: Array = []
	steps.append_array(SC.stepTurn(-1, 45, "左急旋回", {"kt": 95, "tgt": {"spd": SC.T_SPD(95)}}))
	steps.append_array(SC.stepTurn(1, 45, "右急旋回", {"kt": 95, "tgt": {"spd": SC.T_SPD(95)}}))
	return {"id": "a5", "steps": steps}

static func lesson_a6() -> Dictionary:
	var slow_check = func(c, L, st) -> void:
		if bool(c["stall"]):
			st["stallT"] = SC._fin(st.get("stallT"), 0.0) + float(c["dt"])
	var slow_result = func(L, st) -> Array:
		var has := SC._truthy(st.get("stallT"))
		return [{"name": "失速警報", "val": "%s 秒" % SC._to_fixed(float(st["stallT"]), 1) if has else "なし", "std": "なし", "pass": not has or float(st["stallT"]) < 1.0}]
	var steps: Array = [
		{"name": "減速と外形変更", "keys": kk(["thr", "pitch", "flaps"]), "g": "目安：スロットルを約 1,700 rpm まで絞り（F）、速度が落ちるにつれて S で機首を少しずつ上げて高度を保つ。白い帯の中でフラップ 25°（V を 2 回）。機首が上がろうとするので押さえる", "say": "パワーを絞って減速。白い帯に入ったらフラップ 25°。高度 {alt0} ft を保ちながら 58 kt まで", "tgt": {"alt": SC.T_ALT(150.0)}, "until": func(c, L, st): return float(c["kias"]) < 62.0 and int(c["flaps"]) >= 2, "max": 120.0, "grade": true},
		{"name": "低速飛行", "g": {"kt": 61, "flaps": 2, "how": "slow"}, "keys": kk(["pitch", "thr", "rud"]), "say": "58〜68 kt（58 kt より遅くしない）・高度 {alt0} ft・針路 {hdg0}° を保つ。失速警報を鳴らさない", "tgt": {"alt": SC.T_ALT(), "hdg": SC.T_HDG(), "spd": [63, 5]}, "hold": 20, "max": 120.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0,
			"check": slow_check, "result": slow_result},
	]
	return {"id": "a6", "steps": steps}

static func lesson_a7() -> Dictionary:
	var AR := _ar()
	var steps: Array = [
		{"name": "失速への進入", "keys": kk(["thr", "pitch"]), "g": "目安：スロットル アイドル（F）。高度を保つように、1 秒に 1° くらいのペースで S を短く押して機首を上げ続ける。失速警報 → 振動（バフェット）→ 機首や片翼が落ちる、の順に来る", "say": "アイドルにし、高度を保つように機首をゆっくり上げ続けて失速させる", "until": func(c, L, st): return bool(c["stall"]) and float(c["kias"]) < 52.0, "max": 100.0},
		SY.stall_recovery(float(AR["x"]) - 4.0),
	]
	return {"id": "a7", "steps": steps}

static func lesson_a8() -> Dictionary:
	var AR := _ar()
	var steps: Array = [
		{"name": "失速への進入", "keys": kk(["pitch", "rud"]), "g": "目安：全開のまま、機首上げ 約 15〜20°（PFD の目盛り「10」と「20」の間）で保つ。ボールが右に寄ったら E（右ラダー）", "say": "フルパワーのまま機首を 15〜20° に上げ、失速するまで保つ", "until": func(c, L, st): return bool(c["stall"]) and float(c["kias"]) < 55.0, "max": 100.0},
		SY.stall_recovery(float(AR["x"])),
	]
	return {"id": "a8", "steps": steps}

static func lesson_t4() -> Dictionary:
	var AR := _ar()
	var ga_on_start = func(L, c, st) -> void:
		st["a0"] = float(c["aglR"])
		st["min"] = float(c["aglR"])
		st["pwr"] = null
	var ga_check = func(c, L, st) -> void:
		st["min"] = minf(SC._fin(st.get("min"), float(c["aglR"])), float(c["aglR"]))
		if st.get("pwr") == null and float(c["thr"]) > 0.95:
			st["pwr"] = float(st["t"])
		if bool(c["onGround"]):
			st["touched"] = true
	var ga_result = func(L, st) -> Array:
		return [{"name": "フルパワーまで", "val": "—" if st.get("pwr") == null else "%s 秒" % SC._to_fixed(float(st["pwr"]), 1), "std": "3 秒以内", "pass": st.get("pwr") != null and float(st["pwr"]) <= 3.0},
			{"name": "高度損失", "val": "%d ft" % SC._js_round(SC._fin(st.get("a0"), 0.0) - SC._fin(st.get("min"), 0.0)), "std": "50 ft 以内", "pass": SC._fin(st.get("a0"), 0.0) - SC._fin(st.get("min"), 0.0) <= 50.0 * float((L["level"] as Dictionary)["k"]) and not SC._truthy(st.get("touched"))}]
	var steps: Array = [
		{"name": "進入", "g": {"kt": AR["appr"], "fpm": -370, "flaps": 3, "how": "approach"}, "keys": kk(["thr", "pitch"]), "say": "%s kt・3° で進入を続ける" % SC._fmt_num(AR["appr"]), "tgt": {"spd": SC.T_SPD(AR["appr"], 8.0), "cl": [0, 40]}, "until": func(c, L, st): return float(c["aglR"]) < 300.0, "max": 180.0, "grade": true, "gradeWhen": func(c, L, st): return float(c["aglR"]) < 900.0},
		{"name": "ゴーアラウンド", "g": {"kt": AR["x"], "pwr": "full", "flaps": 2, "how": "climbFull"}, "keys": kk(["thr", "pitch", "flaps"]), "say": "ゴーアラウンド！ フルパワー・機首上げ・フラップは段階的に", "until": func(c, L, st): return float(c["aglR"]) > 800.0, "max": 150.0, "grade": true, "tgt": {"spd": [float(AR["x"]) + 4.0, 12]}, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0,
			"onStart": ga_on_start, "check": ga_check, "result": ga_result},
	]
	return {"id": "t4", "steps": steps}

static func lesson_e1() -> Dictionary:
	var ab_on_start = func(L, c, st) -> void:
		st["idle"] = null
	var ab_check = func(c, L, st) -> void:
		if st.get("idle") == null and float(c["thr"]) < 0.05:
			st["idle"] = float(st["t"])
		if not bool(c["paved"]) and bool(c["onGround"]):
			st["off"] = true
	var ab_result = func(L, st) -> Array:
		return [{"name": "アイドルまで", "val": "—" if st.get("idle") == null else "%s 秒" % SC._to_fixed(float(st["idle"]), 1), "std": "2 秒以内", "pass": st.get("idle") != null and float(st["idle"]) <= 2.0},
			{"name": "停止位置", "val": "滑走路外" if SC._truthy(st.get("off")) else "滑走路内", "std": "滑走路内", "pass": not SC._truthy(st.get("off"))}]
	var steps: Array = [
		{"name": "離陸滑走", "keys": kk(["thr", "rud"]), "g": "目安：スロットル全開。異常の指示が来たら迷わず止める", "say": "フルパワーで離陸滑走を始める", "until": func(c, L, st): return float(c["kias"]) > 40.0, "max": 60.0},
		{"name": "離陸中止", "keys": kk(["thr", "brake", "rud"]), "g": "目安：スロットルを一気にアイドル（Shift+F）→ ブレーキ（B）。前輪を接地させたまま、ラダー（Q / E）でまっすぐ", "say": "離陸中止！ スロットル アイドル・ブレーキ・センターライン", "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 60.0, "grade": true, "tgt": {"cl": [0, 8]},
			"onStart": ab_on_start, "check": ab_check, "result": ab_result},
	]
	return {"id": "e1", "steps": steps}

static func lesson_e2() -> Dictionary:
	var AR := _ar()
	var gl_on_start = func(L, c, st) -> void:
		st["cap"] = null
	var gl_check = func(c, L, st) -> void:
		if st.get("cap") == null and float(c["pitch"]) < 2.0 and float(c["kias"]) < float(AR["glide"]) + 8.0:
			st["cap"] = float(st["t"])
	var gl_result = func(L, st) -> Array:
		return [{"name": "滑空姿勢まで", "val": "—" if st.get("cap") == null else "%s 秒" % SC._to_fixed(float(st["cap"]), 1), "std": "5 秒以内", "pass": st.get("cap") != null and float(st["cap"]) <= 5.0}]
	var steps: Array = [
		SY.takeoff_roll(AR["rotate"]),
		{"name": "上昇", "g": {"kt": AR["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "rud"]), "say": "%s kt で上昇" % SC._fmt_num(AR["y"]), "until": func(c, L, st): return float(c["aglR"]) > 400.0, "max": 150.0},
		{"name": "エンジン故障：滑空", "g": {"kt": AR["glide"], "pwr": "dead", "how": "glide"}, "keys": kk(["pitch", "roll", "flaps"]), "say": "エンジン停止！ 機首を下げて %s kt。ほぼ正面の安全な場所へ" % SC._fmt_num(AR["glide"]), "fail": "engine", "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 200.0, "grade": true, "tgt": {"spd": [AR["glide"], 10], "rhdg": [0, 30]}, "gradeWhen": func(c, L, st): return float(st["t"]) > 5.0 and float(c["aglR"]) > 30.0,
			"onStart": gl_on_start, "check": gl_check, "result": gl_result},
	]
	return {"id": "e2", "steps": steps}

static func lesson_e3() -> Dictionary:
	var AR := _ar()
	var ld_check = func(c, L, st) -> void:
		if bool(c["onGround"]) and not SC._truthy(st.get("td")):
			st["td"] = true
			st["paved"] = bool(c["paved"])
	var ld_result = func(L, st) -> Array:
		return [{"name": "着陸場所", "val": "滑走路" if SC._truthy(st.get("paved")) else "滑走路外", "std": "滑走路", "pass": SC._truthy(st.get("paved"))}]
	var steps: Array = [
		{"name": "巡航", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr"]), "say": "空港から離れる方向へ水平飛行。まもなくエンジンが止まります", "dur": 6},
		{"name": "エンジン故障：滑空開始", "g": {"kt": AR["glide"], "pwr": "dead", "how": "glide"}, "keys": kk(["pitch", "roll"]), "say": "エンジン停止！ 機首を下げて %s kt。LAB RWY 36 へ向けて旋回" % SC._fmt_num(AR["glide"]), "fail": "engine", "tgt": {"spd": [AR["glide"], 8]}, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0, "until": func(c, L, st): return float(st["t"]) > 25.0, "max": 30.0},
		{"name": "遭難通報", "atc": "mayday"},
		{"name": "滑走路へ", "g": {"kt": AR["glide"], "pwr": "dead", "how": "glide"}, "keys": kk(["pitch", "roll", "flaps"]), "say": "%s kt で LAB RWY 36 へ滑空し着陸。届くと確信できてからフラップ" % SC._fmt_num(AR["glide"]), "tgt": {"spd": [AR["glide"], 8]}, "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 420.0, "grade": true, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 300.0,
			"check": ld_check, "result": ld_result},
	]
	return {"id": "e3", "steps": steps}

static func lesson_e4() -> Dictionary:
	var AR := _ar()
	var FIELD := SY.field_site()
	var sel_atc = func(L) -> Dictionary:
		return {"msg": "（どこへ降りますか。現在 約 3,700 ft。滑走路は後方 9 km、前方 約 6 km に平らな草地、近くに湖と森があります）",
			"opts": ["湖のほとりの平地へ降りる", "前方の平らな草地へ。北向き（風上）に進入して降りる", "滑走路へ引き返す（後方 9 km）"], "ok": 1,
			"why": "滑走路は滑空距離の外です（この高度・距離では届かない）。湖は接地で転覆・水没の危険、森は障害物だらけ。平らで長く、風上に向かって降りられる草地が正解です。選ぶのが先、通報はそのあと（Aviate → Navigate → Communicate）。"}
	var may_atc = func(L) -> Dictionary:
		var alt := float((L["last"] as Dictionary)["alt"]) if L.get("last") != null else 3000.0
		var alt_s := SC._locale(float(SC._js_round(alt / 100.0) * 100))
		return {"msg": "（草地を決めました。通報します）",
			"opts": ["Mayday, Mayday, Mayday, LAB Tower, %s, engine failure, landing in a field southeast of LAB, %s feet." % [String(L["callShort"]), alt_s], "LAB Tower, %s, request landing runway 36." % String(L["callShort"]), "Pan-pan, %s, low fuel." % String(L["callShort"])], "ok": 0,
			"why": "遭難（すぐに助けが必要）なら MAYDAY を 3 回、相手・コールサイン・状況・位置・意図の順。着陸先は滑走路ではなく、選んだ場外地です。"}
	var td_check = func(c, L, st) -> void:
		var td = (L["s"] as Dictionary).get("td")
		if td != null and not SC._truthy(st.get("td")):
			st["td"] = td
			st["distF"] = SY.dist_field(L)
			st["hdgTd"] = float(c["hdg"])
	var td_result = func(L, st) -> Array:
		var td = st.get("td")
		if td == null:
			return [{"name": "接地", "val": "していない", "std": "草地に接地", "pass": false}]
		var k2 := float((L["level"] as Dictionary)["k"])
		var sink := SC._js_round(500.0 * k2)
		# JS: a missing distF/hdgTd (check never ran) propagates as NaN
		var distF_v: float = float(st["distF"]) if st.get("distF") != null else NAN
		var hdg_v: float = float(st["hdgTd"]) if st.get("hdgTd") != null else NAN
		var dh := absf(_w180(hdg_v - 360.0))
		return [
			{"name": "接地点（選定した草地）", "val": "草地の中心から %s m" % ("NaN" if is_nan(distF_v) else str(SC._js_round(distF_v))), "std": "700 m 以内", "pass": distF_v <= 700.0 and not SC._truthy((td as Dictionary).get("onRunway"))},
			{"name": "接地の降下率", "val": "%s fpm" % SC._fmt_num((td as Dictionary)["fpm"]), "std": "%d fpm 以下" % sink, "pass": float((td as Dictionary)["fpm"]) <= float(sink)},
			{"name": "接地の方向（風上）", "val": "%s°" % ("NaN" if is_nan(hdg_v) else str(SC._js_round(hdg_v))), "std": "北向き ±30°", "pass": dh <= 30.0},
		]
	var steps: Array = [
		{"name": "巡航", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr"]), "say": "LAB の南東へ巡航中。まもなくエンジンが止まります", "dur": 6},
		{"name": "エンジン故障：滑空開始", "g": {"kt": AR["glide"], "pwr": "dead", "how": "glide"}, "keys": kk(["pitch", "roll"]), "say": "エンジン停止！ 機首を下げて %s kt。滑走路は後方で届かない。南東の草地へ" % SC._fmt_num(AR["glide"]), "fail": "engine", "field": FIELD, "tgt": {"spd": [AR["glide"], 8]}, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0, "until": func(c, L, st): return float(st["t"]) > 25.0, "max": 30.0},
		{"name": "場外地の選定", "atc": sel_atc, "keys": "1〜3 キーで選ぶ", "say": "降りる場所を選ぶ"},
		{"name": "遭難通報", "atc": may_atc, "keys": "1〜3 キーで選ぶ", "say": "MAYDAY を通報する"},
		{"name": "草地への滑空と不時着", "g": {"kt": AR["glide"], "pwr": "dead", "how": "glide"}, "keys": kk(["pitch", "roll", "flaps"]), "say": "草地へ。%s kt を守り、高すぎれば S ターンで高度を捨てる。草地が確実になったらフラップ全開、%s kt まで落として北向きに接地" % [SC._fmt_num(AR["glide"]), SC._fmt_num(AR["glideLand"])], "field": FIELD, "tgt": {"spd": [AR["glide"], 8]}, "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 420.0, "grade": true, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 300.0,
			"check": td_check, "result": td_result},
	]
	return {"id": "e4", "steps": steps}

static func lesson_c1() -> Dictionary:
	var AR := _ar()
	var up_on_end = func(L, c) -> void:
		L["alt0"] = float(SC._js_round(float(c["alt"]) / 100.0) * 100)
	var lvl_on_end = func(L, c) -> void:
		L["alt0"] = float(SC._js_round(float(c["alt"]) / 50.0) * 50)
		var h := SC._js_round(float(c["hdg"]))
		L["hdg0"] = float(h if h != 0 else 360)
	var em_check = func(c, L, st) -> void:
		if bool(c["onGround"]) and not SC._truthy(st.get("td")):
			st["td"] = true
			st["paved"] = bool(c["paved"])
	var em_result = func(L, st) -> Array:
		return [{"name": "着陸", "val": "滑走路" if SC._truthy(st.get("paved")) else "滑走路外", "std": "滑走路（または安全な不時着）", "pass": SC._truthy(st.get("paved"))}]
	var steps: Array = [
		{"name": "離陸前点検", "checklist": "before_takeoff"},
		{"name": "離陸許可の復唱", "atc": "takeoff"},
		SY.takeoff_roll(AR["rotate"]),
		{"name": "上昇", "g": {"kt": AR["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "rud", "trim"]), "say": "%s kt で地上 2,500 ft まで上昇（右旋回して東の訓練空域へ）" % SC._fmt_num(AR["y"]), "tgt": {"spd": SC.T_SPD(AR["y"])}, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 200.0, "until": func(c, L, st): return float(c["aglR"]) >= 2500.0, "max": 330.0, "grade": true, "onEnd": up_on_end},
		{"name": "水平へ", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr", "trim"]), "say": "水平飛行に移り 100 kt へ。トリムを取る", "until": func(c, L, st): return float(st["t"]) > 25.0, "max": 30.0, "onEnd": lvl_on_end},
		SC.stepSL("直線水平飛行", 100, 20.0, {"keys": kk(["pitch", "roll", "thr", "trim"])}),
	]
	steps.append_array(SC.stepTurn(-1, 45, "左急旋回", {"kt": 95, "tgt": {"spd": SC.T_SPD(95)}}))
	steps.append({"name": "失速の準備", "keys": kk(["thr", "flaps", "pitch"]), "g": "目安：スロットル アイドル・フラップ 25°。高度を保つように機首を上げ続ける", "say": "フラップ 25°・パワーアイドル。高度を保ちながら失速させる", "until": func(c, L, st): return bool(c["stall"]) and float(c["kias"]) < 52.0, "max": 150.0})
	steps.append(SY.stall_recovery(float(AR["x"]) - 4.0))
	steps.append({"name": "模擬エンジン故障", "g": {"kt": AR["glide"], "pwr": "dead", "how": "glide"}, "keys": kk(["pitch", "roll", "flaps"]), "say": "エンジン故障！ %s kt で滑走路へ滑空し着陸" % SC._fmt_num(AR["glide"]), "fail": "engine", "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 700.0, "grade": true, "tgt": {"spd": [AR["glide"], 8]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 300.0,
		"check": em_check, "result": em_result})
	return {"id": "c1", "steps": steps}

# ------------------------------------------------------------ stage s2
static func lesson_x1() -> Dictionary:
	var AR := _ar()
	return {"id": "x1", "steps": SY.landing_steps(AR["appr"], {"xwind": true})}

static func lesson_x2() -> Dictionary:
	var AR := _ar()
	return {"id": "x2", "steps": SY.landing_steps(AR["apprShort"], {"short": true})}

static func lesson_x3() -> Dictionary:
	var AR := _ar()
	var steps: Array = [
		{"name": "ブレーキを踏んでフルパワー", "keys": kk(["brake", "thr"]), "say": "B を押したまま R でフルパワー。回転が上がりきったら B を離す", "g": "目安：B（ブレーキ）を押したまま R を長押し。エンジンの回転が安定したら B を離して滑走開始", "until": func(c, L, st): return float(c["thr"]) > 0.95 and float(c["gsK"]) > 5.0, "max": 40.0},
		SY.takeoff_roll(AR["rotate"]),
		{"name": "Vx で上昇", "g": {"kt": AR["x"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "rud"]), "say": "%s kt（Vx）で地上 300 ft まで上昇（障害物を越える）" % SC._fmt_num(AR["x"]), "tgt": {"spd": [AR["x"], 5], "rhdg": [0, 10]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 50.0 and float(c["aglR"]) < 300.0, "until": func(c, L, st): return float(c["aglR"]) > 300.0, "max": 90.0, "grade": true},
		{"name": "Vy へ", "g": {"kt": AR["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "trim"]), "say": "機首を少し下げて %s kt（Vy）、地上 1,000 ft まで" % SC._fmt_num(AR["y"]), "tgt": {"spd": SC.T_SPD(AR["y"])}, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0, "until": func(c, L, st): return float(c["aglR"]) > 1000.0, "max": 150.0, "grade": true},
	]
	return {"id": "x3", "steps": steps}

static func lesson_n1() -> Dictionary:
	var steps: Array = [
		{"name": "コースの設定と会合", "g": {"kt": 100, "how": "level"}, "keys": "PFD の CDI キー（NAV1）と CRS、A / D で針路", "say": "NAV1 は LAB VOR（113.50）。CRS を局への方位 {brgV}° 付近に合わせ（CRS）、針が中央へ来るように会合する", "until": func(c, L, st): return absf(float(c["cdi"])) < 1.0 and String((L["av"] as Dictionary)["cdi"]) == "NAV1" and absf(_w180(float((L["av"] as Dictionary)["crs"]) - float(c["brgV"]))) < 12.0, "max": 300.0},
		{"name": "VOR 追跡", "g": {"kt": 100, "how": "level"}, "keys": kk(["roll", "pitch", "trim"]), "say": "針を中央に保って VOR 局へ（局上空で TO→FROM）。針が止まる針路を探す", "tgt": {"cdi": [0, 1], "alt": [func(L): return float(L["alt0"]), 150]}, "hold": 60, "until": func(c, L, st): return float(c["dmeV"]) < 0.5, "max": 720.0, "grade": true, "gradeWhen": func(c, L, st): return float(c["dmeV"]) > 1.0},
	]
	return {"id": "n1", "steps": steps}

# the diversion estimate (lesson n2): the truth, then the rows
static func estimate_truth(L: Dictionary, id: String = "LABEF") -> Dictionary:
	var AV = load("res://src/avionics.gd")
	var w = AV.wpt(id)
	var pos := FP.neOf(L["s"])
	var dist := float(AV.ne_dist_nm(pos, w))
	var brg := float(AV.true_to_mag(float(AV.ne_bearing(pos, w)), FP.MAGVAR_W))
	var gs := maxf(60.0, SC._fin(((L["s"] as Dictionary)["out"] as Dictionary).get("gs"), 100.0))
	return {"brg": SC._js_round(brg), "dist": float(SC._to_fixed(dist, 1)), "eteMin": float(SC._to_fixed(dist / gs * 60.0, 1))}

static func submit_estimate(L: Dictionary, input: Dictionary) -> Dictionary:
	var truth := estimate_truth(L)
	# JS: v => (Number.isFinite(+v) && String(v).trim() !== '' ? +v : NaN)
	# — note +null is 0 and String(null) is "null", so null yields 0, not NaN.
	var num = func(v) -> float:
		if v == null:
			return 0.0
		if typeof(v) == TYPE_BOOL:
			return 1.0 if bool(v) else 0.0
		if typeof(v) == TYPE_STRING and String(v).strip_edges() == "":
			return NAN
		return float(v) if (typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT or typeof(v) == TYPE_STRING) and String(v).is_valid_float() else NAN
	L["estimate"] = {"hdg": num.call(input.get("hdg")), "dist": num.call(input.get("dist")), "eteMin": num.call(input.get("eteMin")), "truth": truth}
	return L["estimate"]

static func estimate_rows(L: Dictionary) -> Array:
	var e = L.get("estimate")
	var k2 := float((L["level"] as Dictionary)["k"])
	if e == null:
		return [{"name": "見積もり", "val": "未入力", "std": "針路・距離・時間を入力", "pass": false}]
	var truth: Dictionary = e["truth"]
	var dh := absf(_w180(float(e["hdg"]) - float(truth["brg"]))) if is_finite(float(e["hdg"])) else 999.0
	var dd := absf(float(e["dist"]) - float(truth["dist"])) / maxf(0.1, float(truth["dist"])) * 100.0 if is_finite(float(e["dist"])) else 999.0
	var de := absf(float(e["eteMin"]) - float(truth["eteMin"])) / maxf(0.1, float(truth["eteMin"])) * 100.0 if is_finite(float(e["eteMin"])) else 999.0
	return [
		{"name": "針路（磁方位）", "val": "%s°（正解 %s°）" % [SC._fmt_num(SC._js_round(float(e["hdg"]))) if is_finite(float(e["hdg"])) else "—", SC._fmt_num(truth["brg"])], "std": "±%d°" % SC._js_round(15.0 * k2), "pass": dh <= 15.0 * k2},
		{"name": "距離", "val": "%s NM（正解 %s）" % [SC._fmt_num(e["dist"]) if is_finite(float(e["dist"])) else "—", SC._fmt_num(truth["dist"])], "std": "±%d%%" % SC._js_round(20.0 * k2), "pass": dd <= 20.0 * k2},
		{"name": "所要時間", "val": "%s 分（正解 %s）" % [SC._fmt_num(e["eteMin"]) if is_finite(float(e["eteMin"])) else "—", SC._fmt_num(truth["eteMin"])], "std": "±%d%%" % SC._js_round(20.0 * k2), "pass": de <= 20.0 * k2},
	]

static func lesson_n2() -> Dictionary:
	var est_result = func(L, st) -> Array:
		return estimate_rows(L)
	var steps: Array = [
		{"name": "巡航点検", "checklist": "cruise"},
		{"name": "LAB-A へ", "g": {"kt": 105, "how": "level"}, "keys": kk(["roll", "pitch", "thr", "trim"]), "say": "LAB-A（架空の訓練点）へ向かう。MFD の地図と GPS の DTK を見て、風上へ修正", "tgt": {"alt": [func(L): return float(L["alt0"]), 200]}, "until": func(c, L, st): return SY.dist_nm(L, "LABEA") < 1.0 * float((L["level"] as Dictionary)["k"]), "max": 900.0, "grade": true},
		{"name": "目的地変更：見積もり", "estimate": "LABEF", "keys": "下の入力欄に針路・距離・時間 → 「見積もりを確定」", "say": "目的地変更！ LAB-F へ。針路（磁）・距離（NM）・所要時間（分）を見積もって入力し、すぐに旋回", "until": func(c, L, st): return SC._truthy(L.get("estimate")), "max": 150.0,
			"result": est_result},
		{"name": "管制へ連絡", "atc": "divert"},
		{"name": "LAB-F へ", "g": {"kt": 105, "how": "level"}, "keys": kk(["roll", "pitch", "thr"]), "say": "LAB-F へ向かう（MFD の D→ を使ってもよい）。到着を確認", "tgt": {"alt": [func(L): return float(L["alt0"]), 200]}, "until": func(c, L, st): return SY.dist_nm(L, "LABEF") < 1.0 * float((L["level"] as Dictionary)["k"]), "max": 900.0, "grade": true},
	]
	return {"id": "n2", "steps": steps}

static func lesson_n3() -> Dictionary:
	var steps: Array = [
		{"name": "GPS 故障", "say": "GPS 信号を失いました（MFD の地図が使えません）。落ち着いて、まず高度と姿勢を保つ", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr"]), "fail": "gps", "dur": 8},
		{"name": "管制へ", "atc": "lost"},
		{"name": "VOR で位置を確かめる", "g": {"kt": 100, "how": "level"}, "keys": "PFD の CDI キー → NAV1、CRS（局への方位を探す）", "say": "CDI を NAV1 に。CRS を回して針が中央・TO になる方位を探し、その方位へ旋回", "until": func(c, L, st): return String((L["av"] as Dictionary)["cdi"]) == "NAV1" and absf(float(c["cdi"])) < 1.5 and absf(_w180(float(c["hdg"]) - float(c["brgV"]))) < 25.0, "max": 300.0},
		{"name": "VOR 局へ", "g": {"kt": 100, "how": "level"}, "keys": kk(["roll", "pitch"]), "say": "針を中央に保って局へ。DME（距離）が減ることを確かめる", "tgt": {"alt": [func(L): return float(L["alt0"]), 300]}, "until": func(c, L, st): return float(c["dmeV"]) < 1.0, "max": 900.0, "grade": true},
		{"name": "LAB RWY へ", "g": {"kt": 100, "how": "level"}, "keys": kk(["roll", "pitch"]), "say": "LAB VOR から LAB RWY へ（局から方位 約 250°・5.6 NM）。滑走路が見えたら報告のつもりで", "tgt": {"alt": [func(L): return float(L["alt0"]), 300]}, "until": func(c, L, st): return SY.rwy_nm(L) < 2.0, "max": 600.0, "grade": true},
	]
	return {"id": "n3", "steps": steps}

# ------------------------------------------------------------ stage s3
static func lesson_i1() -> Dictionary:
	var turn_result = func(L, st) -> Array:
		var d := absf(_w180(float((L["last"] as Dictionary)["hdg"]) - (float(L["hdg0"]) - 90.0)))
		var tol := SC._js_round(10.0 * float((L["level"] as Dictionary)["k"]))
		return [{"name": "ロールアウト", "val": "%d° ずれ" % SC._js_round(d), "std": "±%d°" % tol, "pass": d <= float(tol)}]
	var steps: Array = [
		SC.stepSL("計器による水平飛行", 100, 30.0, {"keys": kk(["pitch", "roll", "thr", "trim"])}),
		{"name": "標準旋回（左 90°）", "g": {"kt": 100, "bank": 17, "how": "turn"}, "keys": kk(["roll", "pitch"]), "say": "標準旋回率で左へ 90° 旋回し {hdgL}° で止める", "tgt": {"alt": SC.T_ALT(), "arate": [3, 1]}, "gradeWhen": func(c, L, st): return absf(SC._fin(st.get("turned"), 0.0)) > 15.0 and absf(SC._fin(st.get("turned"), 0.0)) < 75.0, "until": func(c, L, st): return absf(SC._fin(st.get("turned"), 0.0)) > 80.0 and absf(float(c["bank"])) < 5.0, "max": 80.0, "grade": true,
			"result": turn_result},
		{"name": "上昇 500 fpm", "g": {"kt": 85, "fpm": 500, "how": "rate"}, "keys": kk(["thr", "pitch"]), "say": "500 fpm で {alt1} ft まで上昇（85 kt 前後）", "tgt": {"vs": [500, 150]}, "gradeWhen": func(c, L, st): return float(c["alt"]) < float(L["alt0"]) + 900.0 and bool(SY.established_vs(500.0, 150.0, 4.0).call(c, L, st)), "until": func(c, L, st): return float(c["alt"]) > float(L["alt0"]) + 950.0, "max": 200.0, "grade": true},
		{"name": "降下 500 fpm", "g": {"kt": 100, "fpm": -500, "how": "rate"}, "keys": kk(["thr", "pitch"]), "say": "100 kt・500 fpm で {alt0} ft まで降下して水平に", "tgt": {"vs": [-500, 150]}, "gradeWhen": func(c, L, st): return float(c["alt"]) > float(L["alt0"]) + 100.0 and bool(SY.established_vs(-500.0, 150.0, 4.0).call(c, L, st)), "until": func(c, L, st): return float(c["alt"]) < float(L["alt0"]) + 50.0, "max": 200.0, "grade": true},
	]
	return {"id": "i1", "steps": steps}

static func lesson_i2() -> Dictionary:
	var AR := _ar()
	var u1_check = func(c, L, st) -> void:
		if bool(c["stall"]):
			st["stall"] = true
	var u1_result = func(L, st) -> Array:
		return [{"name": "回復時間", "val": "%s 秒" % SC._to_fixed(float(st["t"]), 1), "std": "12 秒以内", "pass": float(st["t"]) <= 12.0}, {"name": "失速", "val": "あり" if SC._truthy(st.get("stall")) else "なし", "std": "なし", "pass": not SC._truthy(st.get("stall"))}]
	var u2_on_start = func(L, c, st) -> void:
		st["order"] = null
	var u2_check = func(c, L, st) -> void:
		st["maxK"] = maxf(SC._fin(st.get("maxK"), 0.0), float(c["kias"]))
		st["maxG"] = maxf(SC._fin(st.get("maxG"), 0.0), float(c["g"]))
		if st.get("order") == null and float(c["pitch"]) > -3.0:
			st["order"] = absf(float(c["bank"])) < 20.0
		if st.get("idle") == null and float(c["thr"]) < 0.25:
			st["idle"] = float(st["t"])
	var u2_result = func(L, st) -> Array:
		var idle = st.get("idle")
		return [{"name": "回復時間", "val": "%s 秒" % SC._to_fixed(float(st["t"]), 1), "std": "12 秒以内", "pass": float(st["t"]) <= 12.0},
			{"name": "最大速度", "val": "%d kt" % SC._js_round(SC._fin(st.get("maxK"), 0.0)), "std": "%s kt 未満" % SC._fmt_num(AR["ne"]), "pass": SC._fin(st.get("maxK"), 0.0) < float(AR["ne"])},
			{"name": "最大荷重", "val": "%s G" % SC._to_fixed(SC._fin(st.get("maxG"), 0.0), 1), "std": "3.8 G 以下", "pass": SC._fin(st.get("maxG"), 0.0) <= 3.8},
			{"name": "手順（翼を先に水平）", "val": "できた" if SC._truthy(st.get("order")) else "できていない", "std": "機首上げの前に翼水平", "pass": SC._truthy(st.get("order"))},
			{"name": "パワー アイドル", "val": "%s 秒" % SC._to_fixed(float(idle), 1) if idle != null else "なし", "std": "3 秒以内", "pass": idle != null and float(idle) <= 3.0}]
	var steps: Array = [
		{"name": "異常姿勢 1（機首上げ）", "keys": kk(["thr", "pitch", "roll"]), "g": "目安：①全開（R）②W で機首を水平線へ ③A / D で翼を水平。速度が 75 kt を超えたら水平飛行の姿勢（ほぼ 0°）へ", "say": "操縦を渡します。回復して水平に！", "upset": "high", "until": func(c, L, st): return absf(float(c["pitch"])) < 5.0 and absf(float(c["bank"])) < 10.0 and float(c["kias"]) > 75.0, "max": 30.0, "grade": true,
			"check": u1_check, "result": u1_result},
		{"name": "水平飛行", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "thr"]), "say": "いったん水平飛行（10 秒）", "dur": 10},
		{"name": "異常姿勢 2（機首下げ・スパイラル）", "keys": kk(["thr", "roll", "pitch"]), "g": "目安：①アイドル（F）②先に A / D で翼を水平（バンク 0）③それから S で機首をゆっくり水平線まで（荷重 3.8 G 以内、速度が赤線に近ければ特にゆっくり）", "say": "操縦を渡します。回復して水平に！", "upset": "low", "until": func(c, L, st): return absf(float(c["pitch"])) < 5.0 and absf(float(c["bank"])) < 10.0 and float(c["vs"]) > -300.0, "max": 30.0, "grade": true,
			"onStart": u2_on_start, "check": u2_check, "result": u2_result},
	]
	return {"id": "i2", "steps": steps}

static func lesson_i3() -> Dictionary:
	var ro_result = func(L, st) -> Array:
		var d := absf(_w180(float((L["last"] as Dictionary)["trk"]) - (float(L["hdg0"]) + 90.0)))
		var tol := SC._js_round(15.0 * float((L["level"] as Dictionary)["k"]))
		return [{"name": "ロールアウト（航跡）", "val": "%d° ずれ" % SC._js_round(d), "std": "±%d°" % tol, "pass": d <= float(tol)}]
	var steps: Array = [
		{"name": "故障の発生", "fail": "ahrs", "keys": kk(["pitch", "roll"]), "say": "AHRS 故障！ PFD の姿勢・方位が使えません。右下の予備計器に目を移す", "g": {"kt": 95, "how": "level", "pp": true}, "dur": 8},
		{"name": "予備計器で水平飛行", "g": {"kt": 95, "how": "level", "pp": true}, "keys": kk(["pitch", "roll", "thr"]), "say": "予備の姿勢指示器・高度・昇降率で {alt0} ft、航跡 {hdg0}° を保つ", "tgt": {"alt": SC.T_ALT(150.0), "trk": [func(L): return float(L["hdg0"]), 15]}, "hold": 40, "max": 180.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0},
		{"name": "浅い旋回で右 90°", "g": {"kt": 95, "bank": 12, "how": "turn", "pp": true}, "keys": kk(["roll", "pitch"]), "say": "予備の姿勢指示器でバンク 10〜15°。航跡が {hdgR}° に近づいたら戻す", "tgt": {"alt": SC.T_ALT(150.0)}, "until": func(c, L, st): return absf(_w180(float(c["trk"]) - (float(L["hdg0"]) + 90.0))) < 8.0 and absf(float(c["bank"])) < 6.0, "max": 120.0, "grade": true,
			"result": ro_result},
	]
	return {"id": "i3", "steps": steps}

static func lesson_i8() -> Dictionary:
	var mk_ro = func(target: float) -> Callable:
		var f = func(L, st) -> Array:
			var d := absf(_w180(float((L["last"] as Dictionary)["trk"]) - target))
			var tol := SC._js_round(15.0 * float((L["level"] as Dictionary)["k"]))
			return [{"name": "ロールアウト（航跡）", "val": "%d° ずれ" % SC._js_round(d), "std": "±%d°" % tol, "pass": d <= float(tol)}]
		return f
	var timed_result = func(L, st) -> Array:
		var d := absf(_w180(float((L["last"] as Dictionary)["trk"]) - (float(L["hdg0"]) + 90.0)))
		var tol := SC._js_round(15.0 * float((L["level"] as Dictionary)["k"]))
		var tt := SC._js_round(12.0 * float((L["level"] as Dictionary)["k"]))
		return [{"name": "旋回時間（計時）", "val": "%s 秒" % SC._to_fixed(float(st["t"]), 0), "std": "30 ±%d 秒" % tt, "pass": absf(float(st["t"]) - 30.0) <= float(tt)}, {"name": "ロールアウト（航跡）", "val": "%d° ずれ" % SC._js_round(d), "std": "±%d°" % tol, "pass": d <= float(tol)}]
	var fail_on_start = func(L, c, st) -> void:
		SC.fail_now(L, "gps")
	var steps: Array = [
		{"name": "故障の発生", "fail": "ahrs", "keys": kk(["pitch", "roll"]), "say": "AHRS 故障、GPS も失いました。予備計器と磁気コンパスと時計だけが残っています", "g": {"kt": 95, "how": "level", "pp": true}, "dur": 8,
			"onStart": fail_on_start},
		{"name": "予備計器で水平飛行", "g": {"kt": 95, "how": "level", "pp": true}, "keys": kk(["pitch", "roll", "thr"]), "say": "予備の姿勢指示器・高度・昇降率で {alt0} ft、航跡 {hdg0}° を保つ", "tgt": {"alt": SC.T_ALT(150.0), "trk": [func(L): return float(L["hdg0"]), 15]}, "hold": 40, "max": 180.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0},
		{"name": "計時旋回（右 90°・時計で 30 秒）", "g": {"kt": 95, "bank": 15, "how": "turn", "pp": true}, "keys": kk(["roll", "pitch"]), "say": "標準旋回率（バンク約 15°）で右へ。時計で 30 秒数えたら戻す——コンパスは見ない", "tgt": {"alt": SC.T_ALT(150.0)}, "until": func(c, L, st): return absf(SC._fin(st.get("turned"), 0.0)) > 80.0 and absf(float(c["bank"])) < 5.0, "max": 100.0, "grade": true,
			"result": timed_result},
		{"name": "コンパス旋回（右 90°・西 270° へ）", "g": {"kt": 95, "bank": 12, "how": "turn", "pp": true}, "keys": kk(["roll", "pitch"]), "say": "磁気コンパスで西（270°）へ。コンパスの進み・遅れを見越して、約 15° 手前で戻し始める", "tgt": {"alt": SC.T_ALT(150.0)}, "until": func(c, L, st): return absf(SC._fin(st.get("turned"), 0.0)) > 80.0 and absf(float(c["bank"])) < 5.0, "max": 120.0, "grade": true,
			"result": mk_ro.call(270.0)},
		{"name": "コンパス旋回（右 90°・北 360° へ）", "g": {"kt": 95, "bank": 12, "how": "turn", "pp": true}, "keys": kk(["roll", "pitch"]), "say": "北（360°）へ。北の近くではコンパスが遅れる——戻し始めは早めに", "tgt": {"alt": SC.T_ALT(150.0)}, "until": func(c, L, st): return absf(SC._fin(st.get("turned"), 0.0)) > 80.0 and absf(float(c["bank"])) < 5.0, "max": 120.0, "grade": true,
			"result": mk_ro.call(360.0)},
		{"name": "予備計器で水平飛行（仕上げ）", "g": {"kt": 95, "how": "level", "pp": true}, "keys": kk(["pitch", "roll", "thr"]), "say": "北向きで水平に戻し、{alt0} ft を保つ。部分パネルのまま飛び続けられる状態です", "tgt": {"alt": SC.T_ALT(150.0), "hdg": [func(L): return 360.0, 15], "trk": [func(L): return 360.0, 15]}, "hold": 20, "max": 120.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 4.0},
	]
	return {"id": "i8", "steps": steps}

static func lesson_i4() -> Dictionary:
	var e1_atc = func(L) -> Dictionary:
		return {"msg": "（ホールドへの進入）あなたは針路 090° で LAB VOR へ向かっています。インバウンドコース 090°・右旋回のホールドへの進入方式は？",
			"opts": ["Direct entry（そのままコースに乗ってホールドに入る）", "Parallel entry（フィックスを過ぎて平行に飛び、左旋回で戻る）", "Teardrop entry（保持側へ 30° 開いて飛び、右旋回で戻る）"], "ok": 0,
			"why": "針路（フィックスへ向かう方向）がインバウンドコースの ±70° 以内なら Direct entry です。保持側から大きく外れた進入は Teardrop、非保持側からは Parallel（AIM 5-3-8）。"}
	var e2_atc = func(L) -> Dictionary:
		return {"msg": "（風の修正）風 010°・5 kt、TAS 100 kt、インバウンドコース 090°。アウトバウンドの針路と時間の組み合わせは？",
			"opts": ["針路 約 278°（修正はインバウンドの 3 倍）・約 59 秒", "針路 270°（修正なし）・60 秒", "針路 約 262°（逆向きに 3 倍）・約 61 秒"], "ok": 0,
			"why": "インバウンドの風修正角は約 −3°（風に押される分だけ風上へ：針路 087°）。アウトバウンドではその 3 倍を反対向きに取り（270 + 8 ≒ 278°）、時間はインバウンドが 1 分になるよう対地速度の比で調整します（約 59 秒）。"}
	var ob_result = func(L, st) -> Array:
		return [{"name": "アウトバウンド時間", "val": "%d 秒" % SC._js_round(float(st["t"])), "std": "60 ±15 秒", "pass": absf(float(st["t"]) - 60.0) <= 15.0}]
	var steps: Array = [
		{"name": "進入方式の判定", "atc": e1_atc},
		{"name": "風修正とタイミング", "atc": e2_atc},
		{"name": "局へ向かう", "g": {"kt": 100, "how": "level"}, "keys": kk(["roll", "pitch"]), "say": "インバウンドコース 090° で LAB VOR へ", "tgt": {"cdi": [0, 1.5], "alt": [func(L): return float(L["alt0"]), 100]}, "until": func(c, L, st): return float(c["dmeV"]) < 0.3, "max": 420.0, "grade": true, "gradeWhen": func(c, L, st): return float(c["dmeV"]) > 1.0},
		{"name": "アウトバウンドへ旋回", "g": {"kt": 100, "bank": 17, "how": "turn"}, "keys": kk(["roll", "pitch"]), "say": "局通過。右へ標準旋回でアウトバウンド 270° へ", "tgt": {"arate": [3, 1], "alt": [func(L): return float(L["alt0"]), 100]}, "gradeWhen": func(c, L, st): return float(st["t"]) > 4.0 and absf(_w180(float(c["hdg"]) - 270.0)) > 20.0, "until": func(c, L, st): return absf(_w180(float(c["hdg"]) - 270.0)) < 8.0 and absf(float(c["bank"])) < 8.0, "max": 100.0, "grade": true},
		{"name": "アウトバウンド 1 分", "g": {"kt": 100, "how": "level"}, "keys": kk(["pitch", "roll"]), "say": "アウトバウンド。1 分数えて、右旋回を始める", "tgt": {"alt": [func(L): return float(L["alt0"]), 100]}, "until": func(c, L, st): return float(st["t"]) > 20.0 and absf(float(c["bank"])) > 12.0, "max": 120.0, "grade": true,
			"result": ob_result},
		{"name": "インバウンドへ", "g": {"kt": 100, "bank": 17, "how": "turn"}, "keys": kk(["roll", "pitch"]), "say": "右へ標準旋回してインバウンドコース 090° に乗り、局へ", "tgt": {"alt": [func(L): return float(L["alt0"]), 100]}, "until": func(c, L, st): return absf(float(c["cdi"])) < 1.0 and absf(_w180(float(c["hdg"]) - 90.0)) < 15.0, "max": 200.0, "grade": true},
	]
	return {"id": "i4", "steps": steps}

static func _approach_td() -> Array:
	# shared check/result of i5/i6/i7's final landing step
	var chk = func(c, L, st) -> void:
		var td = (L["s"] as Dictionary).get("td")
		if td != null and not SC._truthy(st.get("td")):
			st["td"] = td
	var res = func(L, st) -> Array:
		var td = st.get("td")
		var on := td != null and SC._truthy((td as Dictionary).get("onRunway"))
		return [{"name": "着陸", "val": "滑走路（%s fpm）" % SC._fmt_num((td as Dictionary)["fpm"]) if on else "滑走路外", "std": "滑走路に安全に（600 fpm 未満）", "pass": on and float((td as Dictionary)["fpm"]) < 600.0}]
	return [chk, res]

static func lesson_i5() -> Dictionary:
	var td := _approach_td()
	var steps: Array = [
		{"name": "進入許可の復唱", "atc": "ils"},
		{"name": "ローカライザー会合", "g": {"kt": 90, "how": "level"}, "keys": kk(["roll", "pitch", "thr"]), "say": "針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ", "until": func(c, L, st): return absf(float(c["loc"])) < 1.0 and absf(_w180(float(c["hdg"]) - 360.0)) < 15.0, "max": 420.0},
		{"name": "ILS 追跡", "g": {"kt": 80, "fpm": -430, "flaps": 1, "how": "ils"}, "keys": kk(["thr", "pitch", "roll", "flaps"]), "say": "グライドスロープに乗って降下。両方の針を中央に（決心高度 地上 200 ft）", "tgt": {"loc": [0, 1], "gs": [0, 1]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) < 1000.0 and float(c["aglR"]) > 200.0, "until": func(c, L, st): return float(c["aglR"]) < 200.0, "max": 600.0, "grade": true},
		{"name": "決心高度：滑走路視認・着陸", "keys": kk(["thr", "pitch", "brake"]), "g": "目安：滑走路の端を越えたらアイドル。地上 10〜15 ft から S で少しずつ機首を上げ、最後は機首上げ 約 5°", "say": "決心高度。滑走路が見えました。着陸", "hoodOff": true, "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 150.0,
			"check": td[0], "result": td[1]},
	]
	return {"id": "i5", "steps": steps}

static func lesson_i6() -> Dictionary:
	var td := _approach_td()
	var steps: Array = [
		{"name": "進入許可の復唱", "atc": "rnav"},
		{"name": "ファイナルコース会合", "g": {"kt": 90, "how": "level"}, "keys": kk(["roll", "pitch", "thr"]), "say": "針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ", "until": func(c, L, st): return absf(float(c["loc"])) < 1.0 and absf(_w180(float(c["hdg"]) - 360.0)) < 15.0, "max": 420.0},
		{"name": "RNAV 追跡", "g": {"kt": 80, "fpm": -430, "flaps": 1, "how": "ils"}, "keys": kk(["thr", "pitch", "roll", "flaps"]), "say": "LPV のパスに乗って降下。針と菱形を中央に（決心高度 305 ft MSL）", "tgt": {"loc": [0, 1], "gs": [0, 1]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) < 1000.0 and float(c["aglR"]) > 200.0, "until": func(c, L, st): return float(c["alt"]) <= 310.0, "max": 600.0, "grade": true},
		{"name": "決心高度：滑走路視認・着陸", "keys": kk(["thr", "pitch", "brake"]), "g": "目安：滑走路の端を越えたらアイドル。地上 10〜15 ft から S で少しずつ機首を上げ、最後は機首上げ 約 5°", "say": "決心高度（DA 305 ft）。滑走路が見えました。着陸", "hoodOff": true, "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 150.0,
			"check": td[0], "result": td[1]},
	]
	return {"id": "i6", "steps": steps}

static func lesson_i7() -> Dictionary:
	var da_atc = func(L) -> Dictionary:
		return {"msg": "（DA 305 ft MSL に達しました。霧で視程 1/2 SM、前方に滑走路環境は見えません）どうしますか？",
			"opts": ["ミストアプローチ：フルパワーで上昇し、LAB-D へ直行・3,000 ft へ", "滑走路が見えるまで、このまま降下を続ける", "DA のまま水平飛行して、滑走路を探す"], "ok": 0,
			"why": "DA で滑走路環境（進入灯・滑走路端・センターライン等）が見えなければ、着陸はできません。降下の継続も、DA での水平飛行（そのままでは障害物との余裕がありません）も不可。直ちに進入復行手順へ。"}
	var ma_on_start = func(L, c, st) -> void:
		st["min"] = float(c["alt"])
	var ma_check = func(c, L, st) -> void:
		st["min"] = minf(SC._fin(st.get("min"), float(c["alt"])), float(c["alt"]))
		if int(c["flaps"]) > 1:
			st["flapLate"] = true
	var ma_result = func(L, st) -> Array:
		var mn := SC._fin(st.get("min"), 305.0)
		return [{"name": "進入復行中の最低高度", "val": "%d ft MSL" % SC._js_round(mn), "std": "DA 305 ft から 100 ft 以内", "pass": mn >= 205.0}]
	var steps: Array = [
		{"name": "進入許可の復唱", "atc": "rnav"},
		{"name": "ファイナルコース会合", "g": {"kt": 90, "how": "level"}, "keys": kk(["roll", "pitch", "thr"]), "say": "針路 330° で会合。CDI の針が中央に近づいたら滑走路方位 360° へ", "until": func(c, L, st): return absf(float(c["loc"])) < 1.0 and absf(_w180(float(c["hdg"]) - 360.0)) < 15.0, "max": 420.0},
		{"name": "RNAV 追跡（IMC）", "g": {"kt": 80, "fpm": -430, "flaps": 1, "how": "ils"}, "keys": kk(["thr", "pitch", "roll", "flaps"]), "say": "雲の中。コースと LPV パスを中央に保って DA 305 ft まで降下", "tgt": {"loc": [0, 1], "gs": [0, 1]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) < 1000.0 and float(c["aglR"]) > 200.0, "until": func(c, L, st): return float(c["alt"]) <= 310.0, "max": 600.0, "grade": true},
		{"name": "決心高度での判断", "atc": da_atc},
		{"name": "ミストアプローチ", "g": {"kt": 90, "pwr": "full", "how": "climbFull"}, "keys": kk(["thr", "pitch", "flaps"]), "say": "ミストアプローチ！ フルパワー・上昇姿勢・フラップは段階的に。3,000 ft へ上昇", "until": func(c, L, st): return float(c["alt"]) >= 2900.0, "max": 420.0, "grade": true, "tgt": {"spd": SC.T_SPD(90)}, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0,
			"onStart": ma_on_start, "check": ma_check, "result": ma_result},
	]
	return {"id": "i7", "steps": steps}

# ------------------------------------------------------------ stage s4
static func lesson_m1() -> Dictionary:
	var SM := _sm()
	var gear_result = func(L, st) -> Array:
		var down := SC._truthy(((L["s"] as Dictionary)["gearDown"]))
		var agl := SC._fin(((L["last"] as Dictionary).get("aglR")), 0.0)
		return [{"name": "脚上げ", "val": "上げていない" if down else "地上 %d ft で UP" % SC._js_round(agl), "std": "地上 500 ft まで", "pass": not down and agl <= 600.0}]
	var steps: Array = [
		{"name": "離陸前点検", "checklist": "ms_before_takeoff"},
		{"name": "離陸許可の復唱", "atc": "takeoff"},
		SY.takeoff_roll(SM["rotate"], {"twin": true}),
		{"name": "正の上昇・脚上げ", "g": {"kt": SM["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["gear", "pitch"]), "say": "正の上昇を確認して脚 UP（G）", "until": func(c, L, st): return not bool(c["gearDown"]) or float(c["aglR"]) > 600.0, "max": 60.0,
			"result": gear_result},
		{"name": "上昇", "g": {"kt": SM["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "trim"]), "say": "%s kt で地上 1,500 ft まで上昇" % SC._fmt_num(SM["y"]), "tgt": {"spd": SC.T_SPD(SM["y"]), "rhdg": [0, 10]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 300.0, "until": func(c, L, st): return float(c["aglR"]) > 1500.0, "max": 200.0, "grade": true},
	]
	return {"id": "m1", "steps": steps}

static func lesson_m2() -> Dictionary:
	var SM := _sm()
	var cruise_on_end = func(L, c) -> void:
		((L["s"] as Dictionary)["opts"] as Dictionary)["autoRud"] = false
	var fail_on_start = func(L, c, st) -> void:
		var sd := int(SC._fin((L["s"] as Dictionary).get("seed"), 7.0))
		SC.fail_now(L, "engL" if sd % 2 != 0 else "engR")
		st["h0"] = float(c["hdg"])
	var fail_check = func(c, L, st) -> void:
		st["dev"] = maxf(SC._fin(st.get("dev"), 0.0), absf(_w180(float(c["hdg"]) - SC._fin(st.get("h0"), 0.0))))
	var fail_result = func(L, st) -> Array:
		var engs: Array = (L["s"] as Dictionary)["eng"]
		var any_feather := false
		var good := true
		for e in engs:
			if SC._truthy((e as Dictionary).get("feather")):
				any_feather = true
				if not SC._truthy((e as Dictionary).get("failed")):
					good = false
		var when := float(st["t"])
		return [{"name": "フェザーした側", "val": ("止まった%sエンジン" % SY.dead_name(L)) if good else "生きているエンジン（重大な誤り）" if any_feather else "フェザーしていない", "std": "止まったエンジン", "pass": good and any_feather},
			{"name": "フェザーまで", "val": "%d 秒" % SC._js_round(when), "std": "30 秒以内", "pass": when <= 30.0}]
	var steps: Array = [
		{"name": "巡航", "g": {"kt": 120, "how": "level"}, "keys": kk(["pitch", "thr"]), "say": "巡航中。まもなく片方のエンジンが止まります。フルパワー（R）で備える", "dur": 10, "onEnd": cruise_on_end},
		{"name": "片発停止：方向を保つ・特定・フェザー", "g": {"kt": SM["yse"], "pwr": "dead", "how": "oei"}, "keys": kk(["rud", "thr", "feather", "rtrim"]), "say": "エンジン故障！ 方向を保つ（ラダー）→ 全開 → Vyse → Dead foot, dead engine → 止まった側をフェザー",
			"onStart": fail_on_start, "tgt": {"hdg": [func(L): return float(L["hdg0"]), 20]}, "grade": true, "until": func(c, L, st): return ((L["s"] as Dictionary)["eng"] as Array).any(func(e): return SC._truthy((e as Dictionary).get("feather"))), "max": 60.0,
			"check": fail_check, "result": fail_result, "stopOnFail": "片発停止の処置が基準外でした"},
		{"name": "片発で飛ぶ（Vyse）", "g": {"kt": SM["yse"], "pwr": "dead", "how": "oei"}, "keys": kk(["pitch", "rud", "roll", "rtrim"]), "say": "Vyse %s kt、生きているエンジン側へ 2〜5° バンク、針路 {hdg0}° を保つ" % SC._fmt_num(SM["yse"]), "tgt": {"spd": [SM["yse"], 5], "hdg": SC.T_HDG(10.0), "bank": [func(L): return 3.0 * float(SY.live_side(L)), 3, "fixed"]}, "hold": 30, "max": 150.0, "grade": true, "gradeWhen": SY.established(float(SM["yse"]), 5.0, 4.0)},
		{"name": "管制へ連絡", "atc": "oei"},
	]
	return {"id": "m2", "steps": steps}

static func lesson_m3() -> Dictionary:
	var SM := _sm()
	var prep_on_start = func(L, c, st) -> void:
		((L["s"] as Dictionary)["opts"] as Dictionary)["autoRud"] = false
		(((L["s"] as Dictionary)["eng"] as Array)[0] as Dictionary)["thr"] = 0.0
	var dec_on_start = func(L, c, st) -> void:
		st["h0"] = float(c["hdg"])
	var dec_on_end = func(L, c, st) -> void:
		L["vmcAt"] = SC._js_round(float(c["kias"]))
	var rec_on_start = func(L, c, st) -> void:
		st["start"] = float(c["alt"])
		st["min"] = float(c["alt"])
		st["cut"] = null
	var rec_check = func(c, L, st) -> void:
		st["min"] = minf(SC._fin(st.get("min"), float(c["alt"])), float(c["alt"]))
		if st.get("cut") == null and float(c["thr"]) < 0.7:
			st["cut"] = float(st["t"])
		if float(st["t"]) > 3.0 and bool(c["stall"]):
			st["stall"] = true
	var rec_result = func(L, st) -> Array:
		var cut = st.get("cut")
		return [{"name": "方向を失った速度", "val": ((SC._fmt_num(L["vmcAt"]) if L.get("vmcAt") != null and float(L["vmcAt"]) != 0.0 else "—") + " kt"), "std": "参考：赤線 %s kt（条件で変わる）" % SC._fmt_num(SM["mc"]), "pass": true},
			{"name": "出力を減らすまで", "val": "—" if cut == null else "%s 秒" % SC._to_fixed(float(cut), 1), "std": "3 秒以内", "pass": cut != null and float(cut) <= 3.0},
			{"name": "回復で失った高度", "val": "%d ft" % SC._js_round(SC._fin(st.get("start"), 0.0) - SC._fin(st.get("min"), 0.0)), "std": "%d ft 以内" % SC._js_round(300.0 * float((L["level"] as Dictionary)["k"])), "pass": SC._fin(st.get("start"), 0.0) - SC._fin(st.get("min"), 0.0) <= 300.0 * float((L["level"] as Dictionary)["k"])},
			{"name": "失速", "val": "あり" if SC._truthy(st.get("stall")) else "なし", "std": "なし", "pass": not SC._truthy(st.get("stall"))}]
	var restore_on_start = func(L, c, st) -> void:
		(((L["s"] as Dictionary)["eng"] as Array)[0] as Dictionary)["thr"] = null
	var steps: Array = [
		{"name": "準備（左を模擬停止）", "g": {"kt": float(SM["sse"]) + 8.0, "how": "level"}, "keys": kk(["thr", "rud", "rtrim"]), "say": "左エンジンをアイドル（模擬停止）にします。右は全開（R）。ラダーで方向を保って Vsse 82 kt へ",
			"onStart": prep_on_start, "until": func(c, L, st): return float(st["t"]) > 8.0 and float(c["thr"]) > 0.95 and float(c["kias"]) < float(SM["sse"]) + 12.0, "max": 60.0},
		{"name": "減速（Vmc に近づく）", "g": "目安：S で機首を少しずつ上げ、1 秒に 1 kt くらいで減速。E（右ラダー）を増やして方向を保つ。ラダーがいっぱいになっても機首が左へ回り始めたら、それが Vmc", "keys": kk(["pitch", "rud"]), "say": "ゆっくり減速。方向が保てなくなる・失速警報、のどれかで回復へ",
			"onStart": dec_on_start, "until": func(c, L, st): return bool(c["stall"]) or absf(_w180(float(c["hdg"]) - SC._fin(st.get("h0"), 0.0))) > 15.0 or float(c["kias"]) < float(SM["mc"]) - 4.0, "max": 120.0,
			"onEnd": dec_on_end},
		{"name": "回復", "g": {"kt": SM["sse"], "how": "level"}, "keys": kk(["thr", "pitch", "rud"]), "say": "回復！ 右エンジンの出力を絞る（F）→ 機首を下げる → Vsse 以上へ加速 → 方向を戻す",
			"onStart": rec_on_start, "check": rec_check, "until": func(c, L, st): return float(c["kias"]) > float(SM["sse"]) and float(st["t"]) > 3.0, "max": 45.0, "grade": true,
			"result": rec_result},
		{"name": "両エンジンへ", "g": {"kt": float(SM["y"]) + 10.0, "how": "level"}, "keys": kk(["thr"]), "say": "左エンジンの出力を戻します。巡航へ", "onStart": restore_on_start, "dur": 8},
	]
	return {"id": "m3", "steps": steps}

static func _oei_result(with_touch: bool) -> Callable:
	var f = func(L, st) -> Array:
		var engs: Array = (L["s"] as Dictionary)["eng"]
		var any_feather := false
		var good := true
		for e in engs:
			if SC._truthy((e as Dictionary).get("feather")):
				any_feather = true
				if not SC._truthy((e as Dictionary).get("failed")):
					good = false
		good = good and any_feather
		var rows: Array = [{"name": "フェザー", "val": ("止まった%sエンジン（%d 秒）" % [SY.dead_name(L), SC._js_round(float(st["t"]))]) if good else ("生きているエンジン（重大な誤り）" if any_feather else "していない"), "std": "30 秒以内・止まった側", "pass": good and float(st["t"]) <= 30.0},
			{"name": "脚", "val": "DOWN のまま" if SC._truthy(((L["s"] as Dictionary).get("gearDown"))) else "UP", "std": "UP", "pass": not SC._truthy(((L["s"] as Dictionary).get("gearDown")))}]
		if with_touch:
			rows.append({"name": "継続の判断", "val": "接地してしまった" if SC._truthy(st.get("touched")) else "止まらずに飛び続けた", "std": "浮揚後は継続", "pass": not SC._truthy(st.get("touched"))})
		return rows
	return f

static func _oei_on_start(flip: bool) -> Callable:
	var f = func(L, c, st) -> void:
		var sd := int(SC._fin((L["s"] as Dictionary).get("seed"), 7.0))
		var odd := sd % 2 != 0
		SC.fail_now(L, ("engR" if odd else "engL") if flip else ("engL" if odd else "engR"))
		((L["s"] as Dictionary)["opts"] as Dictionary)["autoRud"] = false
		st["h0"] = float(c["hdg"])
	return f

static func lesson_m4() -> Dictionary:
	var SM := _sm()
	var steps: Array = [
		{"name": "離陸許可の復唱", "atc": "takeoff"},
		SY.takeoff_roll(SM["rotate"], {"twin": true}),
		{"name": "脚上げ", "g": {"kt": SM["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["gear", "pitch"]), "say": "正の上昇で脚 UP（G）", "until": func(c, L, st): return float(c["aglR"]) > 250.0, "max": 60.0},
		{"name": "片発停止！", "g": {"kt": SM["yse"], "pwr": "dead", "how": "oei"}, "keys": kk(["rud", "pitch", "gear", "feather", "rtrim"]), "say": "エンジン故障！ 方向 → Vyse → 脚 UP → 止まった側をフェザー",
			"onStart": _oei_on_start(true), "tgt": {"spd": [SM["yse"], 5], "rhdg": [0, 20]}, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0,
			"until": func(c, L, st): return ((L["s"] as Dictionary)["eng"] as Array).any(func(e): return SC._truthy((e as Dictionary).get("feather"))) and float(st["t"]) > 8.0, "max": 60.0,
			"result": _oei_result(false), "stopOnFail": "片発停止の処置が基準外でした"},
		{"name": "片発で上昇", "g": {"kt": SM["yse"], "pwr": "dead", "how": "oei"}, "keys": kk(["pitch", "rud", "roll"]), "say": "Vyse %s kt で地上 1,000 ft まで上昇" % SC._fmt_num(SM["yse"]), "tgt": {"spd": [SM["yse"], 5], "rhdg": [0, 15]}, "until": func(c, L, st): return float(c["aglR"]) > 1000.0, "max": 300.0, "grade": true, "gradeWhen": SY.established(float(SM["yse"]), 5.0, 3.0)},
	]
	return {"id": "m4", "steps": steps}

static func lesson_e6() -> Dictionary:
	var SM := _sm()
	var ab_on_start = func(L, c, st) -> void:
		st["idle"] = null
	var ab_check = func(c, L, st) -> void:
		if st.get("idle") == null and float(c["thr"]) < 0.05:
			st["idle"] = float(st["t"])
		if not bool(c["paved"]) and bool(c["onGround"]):
			st["off"] = true
		if bool(c["onGround"]) and float(c["gsK"]) >= 3.0:
			st["stopAlong"] = float(c["along"])
	var ab_result = func(L, st) -> Array:
		return [{"name": "アイドルまで", "val": "—" if st.get("idle") == null else "%s 秒" % SC._to_fixed(float(st["idle"]), 1), "std": "2 秒以内", "pass": st.get("idle") != null and float(st["idle"]) <= 2.0},
			{"name": "停止位置", "val": "滑走路外" if SC._truthy(st.get("off")) else "滑走路内", "std": "滑走路内", "pass": not SC._truthy(st.get("off"))},
			{"name": "滑走路の残量", "val": "約 %d m" % maxi(0, SC._js_round(1200.0 - SC._fin(st.get("stopAlong"), 0.0))), "std": "止まった位置から滑走路の終わりまで", "pass": true}]
	var rem_atc = func(L) -> Dictionary:
		var rem := maxi(0, SC._js_round((1200.0 - float((L["last"] as Dictionary)["along"])) / 50.0) * 50)
		return {"msg": "（止まりました。いま止まっている位置から、滑走路の終わりまであと何 m ありますか。LAB RWY は全長 1,200 m）",
			"opts": ["約 %d m" % (rem + 400), "約 %d m" % rem, "約 %d m" % maxi(0, rem - 400)], "ok": 1,
			"why": "止まった位置は滑走路の始端から約 %d m。残量は全長 1,200 m から引いた約 %d m です。残量が分かれば「もう一度離陸できるか／できないか」が判断できます。" % [SC._js_round(float((L["last"] as Dictionary)["along"])), rem]}
	var cont_check = func(c, L, st) -> void:
		if bool(c["onGround"]) and float(st["t"]) > 2.0:
			st["touched"] = true
	var steps: Array = [
		{"name": "離陸前点検", "checklist": "ms_before_takeoff"},
		{"name": "離陸許可の復唱", "atc": "takeoff"},
		{"name": "離陸滑走（1 回目）", "keys": kk(["thr", "rud"]), "g": "目安：スロットル全開。異常の合図が来たら、Vr の前か後かで判断が分かれます", "say": "フルパワーで離陸滑走。Vr は %s kt" % SC._fmt_num(SM["rotate"]), "until": func(c, L, st): return float(c["kias"]) > 45.0, "max": 60.0},
		{"name": "離陸中止（Vr 前の異常）", "keys": kk(["thr", "brake", "rud"]), "g": "目安：スロットルを一気にアイドル（Shift+F）→ ブレーキ（B）。ラダーでセンターラインを保つ", "say": "エンジンの振動と回転のばらつき！ まだ Vr の前です。離陸中止！", "until": func(c, L, st): return bool(c["onGround"]) and float(c["gsK"]) < 3.0, "max": 60.0, "grade": true, "tgt": {"cl": [0, 8]},
			"onStart": ab_on_start, "check": ab_check, "result": ab_result},
		{"name": "滑走路残量の見積もり", "atc": rem_atc, "keys": "1〜3 キーで選ぶ", "say": "滑走路の残量を見積もる"},
		SY.takeoff_roll(SM["rotate"], {"twin": true}),
		{"name": "脚上げ", "g": {"kt": SM["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["gear", "pitch"]), "say": "正の上昇で脚 UP（G）。速度と高度がついてからが、本当の「止まれない」場面です", "until": func(c, L, st): return float(c["aglR"]) > 250.0, "max": 60.0},
		{"name": "片発停止！（浮揚後）", "g": {"kt": SM["yse"], "pwr": "dead", "how": "oei"}, "keys": kk(["rud", "pitch", "gear", "feather", "rtrim"]), "say": "浮揚後にエンジン故障！ 今度は止まれない。方向 → Vyse → 脚 UP → 止まった側をフェザー",
			"onStart": _oei_on_start(true), "tgt": {"spd": [SM["yse"], 5], "rhdg": [0, 20]}, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 6.0,
			"until": func(c, L, st): return ((L["s"] as Dictionary)["eng"] as Array).any(func(e): return SC._truthy((e as Dictionary).get("feather"))) and float(st["t"]) > 8.0 and not SC._truthy(((L["s"] as Dictionary).get("gearDown"))), "max": 60.0,
			"check": cont_check, "result": _oei_result(true), "stopOnFail": "片発停止の処置が基準外でした"},
		{"name": "片発で上昇（継続）", "g": {"kt": SM["yse"], "pwr": "dead", "how": "oei"}, "keys": kk(["pitch", "rud", "roll"]), "say": "Vyse %s kt で地上 800 ft まで上昇。判断どおり、飛び続けます" % SC._fmt_num(SM["yse"]), "tgt": {"spd": [SM["yse"], 5], "rhdg": [0, 15]}, "until": func(c, L, st): return float(c["aglR"]) > 800.0, "max": 300.0, "grade": true, "gradeWhen": SY.established(float(SM["yse"]), 5.0, 3.0)},
	]
	return {"id": "e6", "steps": steps}

static func lesson_m5() -> Dictionary:
	var SM := _sm()
	var steps: Array = [{"name": "着陸前点検（GUMPS）", "checklist": "ms_before_landing"}]
	steps.append_array(SY.landing_steps(float(SM["yse"]) - 4.0, {"twin": true, "flaps": 1}))
	return {"id": "m5", "steps": steps}

# ------------------------------------------------------------ stage s5 + s6
static func lesson_r1() -> Dictionary:
	var AR := _ar()
	var brief_atc = func(L) -> Dictionary:
		return {"msg": "（今日の LAB：風 %s、突風あり。場周には訓練機がほかに 2 機。あなたは寝不足気味。）最も対策が必要な脅威と対策の組み合わせは？" % String(L["windStr"]),
			"opts": ["突風を伴う横風 → 進入速度に突風分の半分を足し、安定しなければ早めにゴーアラウンド", "他機 → 無線を切って集中する", "寝不足 → コーヒーを飲めば問題ない"], "ok": 0,
			"why": "突風を伴う横風は着陸の大きな脅威。突風成分の半分を進入速度に足すのは広く教えられている目安（POH・教官の指示が優先）。寝不足も脅威で、IMSAFE で自分を点検する（重ければ飛ばない判断も）。"}
	var clash_atc = func(L) -> Dictionary:
		return {"msg": "LAB Tower: \"%s, extend downwind, number two, follow the Cessna on a two-mile final, cleared to land runway 18.\"" % String(L["call"]),
			"opts": ["Say again the runway for %s?（使用中は 36 のはず：確認する）" % String(L["callShort"]), "Cleared to land runway 18, %s." % String(L["callShort"]), "（無線は返さず、そのまま 36 へ）"], "ok": 0,
			"why": "先ほどの許可は 36。食い違いは「Say again」で確認する。聞き間違い・言い間違いはどちらにも起きる（エラー）。確認すればエラーは管理できる。"}
	var steps: Array = [
		{"name": "ブリーフィング：最大の脅威", "atc": brief_atc},
		{"name": "着陸許可の復唱", "atc": "landing"},
		{"name": "ダウンウインド", "g": {"kt": 90, "how": "level"}, "keys": kk(["pitch", "roll", "thr"]), "say": "ダウンウインド：地上 1,000 ft・90 kt・方位 180°", "tgt": {"aglR": [1000, 100], "spd": SC.T_SPD(90), "dwhdg": [0, 10]}, "until": func(c, L, st): return float(c["along"]) < 300.0, "max": 150.0, "grade": true},
		{"name": "食い違いに気づく", "atc": clash_atc},
		{"name": "ベースへ", "g": {"kt": 75, "fpm": -500, "flaps": 2, "how": "pattern"}, "keys": kk(["thr", "flaps", "roll"]), "say": "「Runway 36, cleared to land」と再確認できた想定。アビームからパワー・フラップ、ベース・ファイナルへ", "until": func(c, L, st): return absf(float(c["cross"])) < 150.0 and absf(_w180(float(c["hdg"]) - 360.0)) < 40.0 and float(c["along"]) < -400.0, "max": 300.0},
	]
	steps.append_array(SY.landing_steps(float(AR["appr"]) + 4.0, {"xwind": true}))
	return {"id": "r1", "steps": steps}

static func lesson_cx1() -> Dictionary:
	var AW := _aw()
	var gear_result = func(L, st) -> Array:
		var down := SC._truthy(((L["s"] as Dictionary).get("gearDown")))
		var agl := SC._fin(((L["last"] as Dictionary).get("aglR")), 0.0)
		return [{"name": "脚上げ", "val": "上げていない" if down else "地上 %d ft で UP" % SC._js_round(agl), "std": "地上 500 ft まで", "pass": not down and agl <= 600.0}]
	var lvl_on_end = func(L, c) -> void:
		L["alt0"] = float(SC._js_round(float(c["alt"]) / 100.0) * 100)
	var prop_check = func(c, L, st) -> void:
		if float(c["prop"]) > 0.9:
			st["rpm0"] = float(c["rpm"])
			st["man0"] = float(c["manIn"])
		elif float(c["prop"]) <= 0.66:
			st["rpmSet"] = float(c["rpm"])
			st["manSet"] = float(c["manIn"])
			st["kSet"] = float(c["propK"])
	var prop_result = func(L, st) -> Array:
		var prop := SC._fin(((L["s"] as Dictionary).get("prop")), 1.0)
		var has_set := SC._truthy(st.get("rpmSet"))
		return [{"name": "プロペラ設定", "val": "%d rpm 設定" % SC._js_round(1900.0 + 800.0 * prop), "std": "2,400 ±150 rpm", "pass": absf(1900.0 + 800.0 * prop - 2400.0) <= 150.0},
			{"name": "回転数の低下", "val": "%d → %d rpm" % [SC._js_round(SC._fin(st.get("rpm0"), 0.0)), SC._js_round(float(st["rpmSet"]))] if has_set else "—", "std": "150 rpm 以上下がる", "pass": has_set and SC._fin(st.get("rpm0"), 0.0) - float(st["rpmSet"]) >= 150.0},
			{"name": "出力係数（回転数の分）", "val": SC._to_fixed(float(st["kSet"]), 2) if SC._truthy(st.get("kSet")) else "—", "std": "0.90〜0.97（下がる）", "pass": SC._truthy(st.get("kSet")) and float(st["kSet"]) <= 0.97 and float(st["kSet"]) >= 0.88},
			{"name": "MAN IN の上昇", "val": "%s → %s inHg" % [SC._to_fixed(SC._fin(st.get("man0"), 0.0), 1), SC._to_fixed(float(st["manSet"]), 1)] if SC._truthy(st.get("manSet")) else "—", "std": "同じスロットルで少し上がる", "pass": SC._truthy(st.get("manSet")) and float(st["manSet"]) >= SC._fin(st.get("man0"), 0.0) + 0.2}]
	var fwd_result = func(L, st) -> Array:
		var prop := SC._fin(((L["s"] as Dictionary).get("prop")), 0.0)
		return [{"name": "プロペラ", "val": "FULL FORWARD" if prop >= 0.98 else "戻っていない", "std": "FULL FORWARD", "pass": prop >= 0.98}]
	var steps: Array = [
		{"name": "離陸前点検（複雑機）", "checklist": "cx_before_takeoff"},
		{"name": "離陸許可の復唱", "atc": "takeoff"},
		SY.takeoff_roll(AW["rotate"]),
		{"name": "正の上昇・脚上げ", "g": {"kt": AW["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["gear", "pitch"]), "say": "正の上昇を確認して脚 UP（G）", "until": func(c, L, st): return not bool(c["gearDown"]) or float(c["aglR"]) > 600.0, "max": 60.0,
			"result": gear_result},
		{"name": "上昇", "g": {"kt": AW["y"], "pwr": "full", "how": "climbFull"}, "keys": kk(["pitch", "trim"]), "say": "%s kt で地上 1,500 ft まで上昇" % SC._fmt_num(AW["y"]), "tgt": {"spd": SC.T_SPD(AW["y"]), "rhdg": [0, 10]}, "gradeWhen": func(c, L, st): return float(c["aglR"]) > 300.0, "until": func(c, L, st): return float(c["aglR"]) > 1500.0, "max": 200.0, "grade": true},
		{"name": "レベルオフ", "g": {"kt": 110, "how": "level"}, "keys": kk(["pitch", "thr", "trim"]), "say": "水平に戻して 110 kt へ。トリムを取る", "tgt": {"spd": SC.T_SPD(110)}, "hold": 12, "max": 90.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 5.0, "onEnd": lvl_on_end},
		{"name": "巡航で安定", "g": {"kt": 110, "how": "level"}, "keys": kk(["thr", "trim"]), "say": "110 kt の巡航で安定させる（スロットルが落ち着くまで）", "dur": 10},
		{"name": "プロペラを巡航設定へ（2,400 rpm）", "propTo": 0.625, "g": {"kt": 110, "how": "level"}, "keys": kk(["prop", "manin"]), "say": "プロペラレバーを引いて 2,400 rpm 設定へ（, キー）。RPM が下がり、MAN IN が少し上がるのを確かめる",
			"check": prop_check, "until": func(c, L, st): return float(c["prop"]) <= 0.66 and float(st["t"]) > 12.0, "max": 90.0, "grade": true, "tgt": {"spd": SC.T_SPD(110), "alt": SC.T_ALT(150.0)},
			"result": prop_result},
		{"name": "プロペラを前へ戻す", "propTo": 1, "g": {"kt": 110, "how": "level"}, "keys": kk(["prop"]), "say": "プロペラを FULL FORWARD へ戻す（. キー）。着陸・ゴーアラウンドの形", "until": func(c, L, st): return float(c["prop"]) >= 0.98, "max": 60.0,
			"result": fwd_result},
	]
	return {"id": "cx1", "steps": steps}

static func lesson_cx2() -> Dictionary:
	var AW := _aw()
	var steps: Array = [{"name": "着陸前点検（GUMPS）", "checklist": "cx_before_landing"}]
	steps.append_array(SY.landing_steps(AW["appr"], {"tdSpdTol": 20.0}))
	return {"id": "cx2", "steps": steps}

static func lesson_cx3() -> Dictionary:
	var AW := _aw()
	var ga_on_start = func(L, c, st) -> void:
		st["a0"] = float(c["aglR"])
		st["min"] = float(c["aglR"])
		st["pwr"] = null
		st["propT"] = null
	var ga_check = func(c, L, st) -> void:
		st["min"] = minf(SC._fin(st.get("min"), float(c["aglR"])), float(c["aglR"]))
		if st.get("pwr") == null and float(c["thr"]) > 0.95:
			st["pwr"] = float(st["t"])
		if st.get("propT") == null and float(c["prop"]) >= 0.98:
			st["propT"] = float(st["t"])
		if bool(c["onGround"]):
			st["touched"] = true
	var ga_result = func(L, st) -> Array:
		var pwr = st.get("pwr")
		var prop_t = st.get("propT")
		return [{"name": "フルパワーまで", "val": "—" if pwr == null else "%s 秒" % SC._to_fixed(float(pwr), 1), "std": "3 秒以内", "pass": pwr != null and float(pwr) <= 3.0},
			{"name": "プロペラ前へ", "val": "—" if prop_t == null else "%s 秒" % SC._to_fixed(float(prop_t), 1), "std": "5 秒以内", "pass": prop_t != null and float(prop_t) <= 5.0},
			{"name": "脚", "val": "DOWN のまま" if SC._truthy(((L["s"] as Dictionary).get("gearDown"))) else "UP", "std": "地上 800 ft までに UP", "pass": not SC._truthy(((L["s"] as Dictionary).get("gearDown")))},
			{"name": "高度損失", "val": "%d ft" % SC._js_round(SC._fin(st.get("a0"), 0.0) - SC._fin(st.get("min"), 0.0)), "std": "50 ft 以内", "pass": SC._fin(st.get("a0"), 0.0) - SC._fin(st.get("min"), 0.0) <= 50.0 * float((L["level"] as Dictionary)["k"]) and not SC._truthy(st.get("touched"))}]
	var steps: Array = [
		{"name": "進入", "g": {"kt": AW["appr"], "fpm": -370, "flaps": 3, "how": "approach"}, "keys": kk(["thr", "pitch"]), "say": "%s kt・3° で進入を続ける（プロペラは巡航設定のまま）" % SC._fmt_num(AW["appr"]), "tgt": {"spd": SC.T_SPD(AW["appr"], 8.0), "cl": [0, 40]}, "until": func(c, L, st): return float(c["aglR"]) < 300.0, "max": 180.0, "grade": true, "gradeWhen": func(c, L, st): return float(c["aglR"]) < 900.0},
		{"name": "ゴーアラウンド（複雑機の手順）", "propTo": 1, "g": {"kt": AW["x"], "pwr": "full", "flaps": 2, "how": "climbFull"}, "keys": kk(["thr", "prop", "flaps", "gear"]), "say": "ゴーアラウンド！ フルパワー → プロペラ前へ → フラップ段階 → 正の上昇で脚 UP", "until": func(c, L, st): return float(c["aglR"]) > 800.0, "max": 150.0, "grade": true, "tgt": {"spd": [float(AW["x"]) + 4.0, 12]}, "gradeWhen": func(c, L, st): return float(st["t"]) > 8.0,
			"onStart": ga_on_start, "check": ga_check, "result": ga_result},
	]
	return {"id": "cx3", "steps": steps}

static func lesson_cf1() -> Dictionary:
	var brief_atc = func(L) -> Dictionary:
		return {"msg": "（訓練生の前回の記録：上昇・降下のあと、高度を戻すのが遅れがち。今日の水平飛行で、教官として最初に見るべきものは？）",
			"opts": ["高度と昇降率：レベルオフの遅れが出る場所だから", "無線の言い方だけ", "訓練生の手の動きだけ（計器は見ない）"], "ok": 0,
			"why": "教官の観察は「前回の弱点が出る場所」から始める。記録に基づくブリーフィングが、飛行中の気づきを速くする。"}
	var fly_on_start = func(L, c, st) -> void:
		((L["s"] as Dictionary)["opts"] as Dictionary)["autoRud"] = true
		st["maxDev"] = 0.0
	var fly_check = func(c, L, st) -> void:
		SY.trainee_fly(L, c, st)
	var fly_on_end = func(L, c, st) -> void:
		(L["s"] as Dictionary)["ovr"] = null
		L["cfiDev"] = SC._js_round(SC._fin(st.get("maxDev"), 0.0))
		L["cfiKind"] = int(st.get("kind", 0))
	var fly_result = func(L, st) -> Array:
		var kind := int(st.get("kind", 0))
		return [{"name": "訓練生のずれ（再現）", "val": "最大 %d ft（%s）" % [SC._js_round(SC._fin(st.get("maxDev"), 0.0)), String(SY.CFI_MISTAKES[kind])], "std": "シードのミスが再現される", "pass": SC._fin(st.get("maxDev"), 0.0) >= 40.0}]
	var point_atc = func(L) -> Dictionary:
		var kind := int(L.get("cfiKind", 0))
		var dev := SC._fin(L.get("cfiDev"), 0.0)
		return {"msg": "（訓練生の飛行：%s。高度は最大で約 %d ft ずれました。指摘として正しいものは？）" % [String(SY.CFI_MISTAKES[kind]), SC._js_round(dev)],
			"opts": ["「高度が %d ft ずれている。まず昇降率を見て、機首で戻そう」（ずれの種類と大きさと、直し方を言う）" % (SC._js_round(dev / 50.0) * 50), "「ちゃんとやって」（具体的に言わない）", "（何も言わず、黙って自分の操縦に替える）"], "ok": 0,
			"why": "指摘は「何が・どれだけ・どう直すか」を短く。いきなり替わるのは最後の手段で、まず言葉で直させるのが教官の基本（ただし安全の限界を超えそうなら即交代）。"}
	var debrief_atc = func(L) -> Dictionary:
		return {"msg": "（着陸後の講評。訓練生に最初に言うべきことは？）",
			"opts": ["「レベルオフのあと高度がずれたね。昇降率を先に見る癖をつけよう。次はそこだけ練習しよう」（具体的な事実＋次の練習）", "「全体的にダメだった」（総評だけ）", "「センスがないのかも」（人格に触れる）"], "ok": 0,
			"why": "講評は具体的な事実から、次の練習につなげる。人格ではなく行動を扱うのが、教官の講評の原則。"}
	var steps: Array = [
		{"name": "ブリーフィング：今日の注意点", "atc": brief_atc},
		{"name": "訓練生の飛行（同乗・観察）", "keys": "操作しない（観察：高度・速度・針路のずれの種類と大きさを見る）", "say": "訓練生が飛びます。手は出さず、ずれが育つか、どの種類かを見ていてください", "dur": 42,
			"onStart": fly_on_start, "check": fly_check, "onEnd": fly_on_end, "result": fly_result},
		{"name": "指摘：何が起きているか", "atc": point_atc},
		{"name": "介入：自分で立て直す", "g": {"kt": 95, "how": "level"}, "keys": kk(["pitch", "roll", "thr", "trim"]), "say": "「I have control」。高度 {alt0} ft・針路 {hdg0}°・95 kt に戻して保つ", "tgt": {"alt": SC.T_ALT(), "hdg": SC.T_HDG(), "spd": SC.T_SPD(95)}, "hold": 15, "max": 120.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 4.0},
		{"name": "講評：訓練生への言い方", "atc": debrief_atc},
	]
	return {"id": "cf1", "steps": steps}

# ------------------------------------------------------------ registry
static func build_all() -> Dictionary:
	return {
		"a2": lesson_a2(), "a3": lesson_a3(), "a4": lesson_a4(), "a5": lesson_a5(),
		"a6": lesson_a6(), "a7": lesson_a7(), "a8": lesson_a8(), "t4": lesson_t4(),
		"e1": lesson_e1(), "e2": lesson_e2(), "e3": lesson_e3(), "e4": lesson_e4(), "c1": lesson_c1(),
		"x1": lesson_x1(), "x2": lesson_x2(), "x3": lesson_x3(),
		"n1": lesson_n1(), "n2": lesson_n2(), "n3": lesson_n3(),
		"i1": lesson_i1(), "i2": lesson_i2(), "i3": lesson_i3(), "i8": lesson_i8(),
		"i4": lesson_i4(), "i5": lesson_i5(), "i6": lesson_i6(), "i7": lesson_i7(),
		"m1": lesson_m1(), "m2": lesson_m2(), "m3": lesson_m3(), "m4": lesson_m4(),
		"e6": lesson_e6(), "m5": lesson_m5(),
		"r1": lesson_r1(),
		"cx1": lesson_cx1(), "cx2": lesson_cx2(), "cx3": lesson_cx3(), "cf1": lesson_cf1(),
	}
