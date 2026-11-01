class_name CadetSchool
extends RefCounted
# Port of flight-lab/src/school.js (HTML CADET @ 898fe8a) — the flight school
# engine: a lesson is a list of steps; each step gives the instructor's words, a
# guide computed from the flight model ("pitch + power = performance"), target
# values with tolerances scaled by the three levels （導入/基礎/精度）, hints, and
# grades (share of time inside tolerance, largest deviation, continuous hold).
# Also: checklists, the ATC read-back questions, and the practice record
# (sanitised). Pure logic; the steps live in src/syllabus.gd.
# Dependencies: physics = src/physics.gd (FlightPhysics statics); avionics =
# src/avionics.gd, preloaded and called with that file's function names —
# the snake_case equivalents of avionics.js's (create_avionics, nav_solve,
# true_to_mag, mag_to_true, indicated_alt, ne_dist_nm, ne_bearing, control,
# NAVAIDS; same signatures and Dictionary shapes as the JS); syllabus is loaded at
# runtime (it preloads this file for the step helpers, so a compile-time
# preload here would be cyclic). The store for records/progress is an injected
# Dictionary {key: JSON String} standing in for localStorage.

const FP = preload("res://src/physics.gd")
const AV = preload("res://src/avionics.gd")

const DEG := PI / 180.0

# ---------------------------------------------------------------- small helpers (JS semantics)
static func _clamp(v: float, a: float, b: float) -> float:
	return a if v < a else (b if v > b else v)

static func _fin(v, d: float = 0.0) -> float:
	return float(v) if (typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT) and is_finite(float(v)) else d

static func _w180(a: float) -> float:
	return FP.wrap180(a)

static func _w360(a: float) -> float:
	return FP.wrap360(a)

static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))

static func _r5(x: float) -> int:
	return _js_round(x / 5.0) * 5

static func _r50(x: float) -> int:
	return _js_round(x / 50.0) * 50

static func _truthy(v) -> bool:
	if v == null:
		return false
	if typeof(v) == TYPE_BOOL:
		return bool(v)
	if typeof(v) == TYPE_STRING:
		return not String(v).is_empty()
	if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
		return float(v) != 0.0 and not is_nan(float(v))
	return true

# JS Number.prototype.toFixed (round half up on the binary double, as JS computes it)
static func _to_fixed(x: float, d: int) -> String:
	if is_nan(x):
		return "NaN"
	var neg := x < 0.0
	var scaled := absf(x) * pow(10.0, d)
	var n := floorf(scaled + 0.5)
	var div := pow(10.0, d)
	var ip := int(floorf(n / div)) if d > 0 else int(n)
	var out := ("-" if neg else "") + str(ip)
	if d > 0:
		var fp := int(n - float(ip) * div)
		var fs := str(fp)
		while fs.length() < d:
			fs = "0" + fs
		out += "." + fs
	return out

# JS Number.toLocaleString('en-US') with default options (grouping, <=3 fraction digits)
static func _locale(x: float) -> String:
	if x == floorf(x) and absf(x) < 1e15:
		return _locale_int(int(x))
	var neg := x < 0.0
	var r := floorf(absf(x) * 1000.0 + 0.5) / 1000.0
	var ip := int(floorf(r))
	var frac := r - float(ip)
	var out := ("-" if neg else "") + _locale_int(ip)
	if frac > 0.0:
		var fs := _to_fixed(frac, 3).trim_prefix("0")
		while fs.ends_with("0"):
			fs = fs.left(fs.length() - 1)
		out += fs
	return out

static func _locale_int(n: int) -> String:
	var neg := n < 0
	var s := str(absi(n))
	var out := ""
	while s.length() > 3:
		out = "," + s.right(3) + out
		s = s.left(s.length() - 3)
	out = s + out
	return ("-" if neg else "") + out

# JS String(number) for the values templates meet (integers print without a decimal point)
static func _fmt_num(v) -> String:
	if v == null:
		return "undefined"
	if typeof(v) == TYPE_BOOL:
		return "true" if bool(v) else "false"
	if typeof(v) == TYPE_STRING:
		return String(v)
	var f := float(v)
	return str(int(f)) if f == floorf(f) and absf(f) < 1e15 else _to_fixed(f, 10).rstrip("0").rstrip(".")

static func _pad3(s: String) -> String:
	while s.length() < 3:
		s = "0" + s
	return s

static func _or360(x: float) -> float:
	return x if x != 0.0 else 360.0

static func _syllabus():
	var scr = load("res://src/syllabus.gd")
	return scr

static func stages() -> Array:
	return _syllabus().STAGES()

# ---------------------------------------------------------------- the three levels
const LEVELS := [
	{"id": "intro", "name": "導入", "en": "Introduction", "k": 1.5, "holdK": 0.5, "hints": true, "guide": true, "desc": "許容幅を基礎の 1.5 倍に広げ、連続保持の時間を半分に。目安（姿勢と出力）と教官のヒントをすべて表示。"},
	{"id": "basic", "name": "基礎", "en": "Basic", "k": 1.0, "holdK": 1.0, "hints": true, "guide": true, "desc": "許容幅は FAA 自家用操縦士 ACS（実地試験基準）を参考にした値。目安とヒントを表示。"},
	{"id": "precision", "name": "精度", "en": "Precision", "k": 0.6, "holdK": 1.5, "hints": false, "guide": false, "desc": "許容幅を基礎の 6 割に狭め、連続保持を 1.5 倍に。目安とヒントは出さない（事業用・計器飛行の水準を意識した教材用の上級目標）。"},
]

static func level(id) -> Dictionary:
	for l in LEVELS:
		if str(l["id"]) == str(id):
			return l
	return LEVELS[0]

# ---------------------------------------------------------------- the instructor's guide: attitude and power
static func _pitch_txt(p: float) -> String:
	var v := _js_round(p)
	return "ほぼ水平（0°）" if v == 0 else "機首%s 約 %d°" % ["上げ" if v > 0 else "下げ", absi(v)]

static func _ai_ref(p: float) -> String:
	var a := absf(p)
	if a < 1.5:
		return "PFD の姿勢表示で、黄色い機体記号を水平線（青と茶の境）に合わせる"
	return "PFD の姿勢表示で、黄色い機体記号を水平線の%sへ%s" % ["上" if p > 0 else "下", "少しだけ（目盛り 2.5° の 1 本分くらい）" if a < 4.0 else ("目盛り 2 本分（約 5°）" if a < 7.0 else ("目盛りの「10」の手前くらい" if a < 12.0 else "目盛りの「10」より先"))]

static func _pwr_txt(ss: Dictionary, o: Dictionary, A: Dictionary) -> String:
	var pwr = o.get("pwr")
	if pwr == "dead":
		return "片方のエンジンが停止（もう片方は全開）" if _truthy(A.get("twin")) else "エンジン停止（プロペラは風で回るだけ）"
	var rpm := float(ss.get("rpm", 0.0))
	if pwr == "full":
		return "スロットル全開%s" % (("（約 %s rpm）" % _locale(float(_r50(rpm)))) if rpm != 0.0 else "")
	if pwr == "idle":
		return "スロットル アイドル%s" % (("（約 %s rpm）" % _locale(float(_r50(rpm)))) if rpm != 0.0 else "")
	return "スロットル 約 %d%%%s" % [_r5(float(ss.get("thr", 0.0)) * 100.0), ("（約 %s rpm）" % _locale(float(_r50(rpm)))) if rpm != 0.0 and not _truthy(A.get("cs")) else ""]

const HOW := {
	"climbFull": "速度が速ければ機首を 1〜2° 上げ、遅ければ下げる。出力は全開のまま（上昇中の速度は機首で合わせる）",
	"level": "高度が 50 ft ずれたら機首を 1〜2° 動かして戻す。速度のずれはスロットル（R / F）で直し、落ち着いたらトリム（T）",
	"rate": "昇降率のずれは出力で、速度のずれは機首で直す。目標高度の 10% 手前からレベルオフ",
	"glide": "速度が速ければ機首を上げ、遅ければ下げる。出力で直せないので速度は機首だけで保つ",
	"turn": "高度が下がり始めたら機首を少し上げる。沈みが止まらなければバンクを少し浅くしてから引く",
	"approach": "進入角が深い（PAPI の白が多い）ならパワーを少し絞り、浅い（赤が多い）なら足す。速度のずれは機首で直す",
	"slow": "低速では速度は機首、高度はパワー。高度が下がればパワーを足し、速度が落ちれば機首を下げる",
	"pattern": "このままでは低くなりそうならパワーを足し、高くなりそうなら絞る。速度のずれは機首で直す",
	"ils": "GS の菱形が下（自分が高い）ならパワーを少し絞り、上（低い）なら足す。CDI の針の方へ 2〜5° ずつ針路を直す。速度のずれは機首で",
	"oei": "速度は機首で（青線 Vyse を割らない）。生きているエンジン側へ 2〜5° バンクし、ボールは生きている側へ半分。止まった側の足は踏まない（Dead foot, dead engine）",
}

# o: {kt, fpm, pwr: 'full' | 'idle' | 'dead', flaps, gear, bank, how, oei}; s: the physics state
static func guide_text(s: Dictionary, o: Dictionary, L) -> String:
	var A: Dictionary = s["A"]
	var opt := {"altFt": (float(L["alt0"]) if typeof(L) == TYPE_DICTIONARY and L.get("alt0") != null else 3000.0), "gear": (bool(o.get("gear", false)) if not bool((A["gear"] as Dictionary)["fixed"]) else true)}
	for k in o.keys():
		opt[k] = o[k]
	if o.get("pwr") == "dead" and _truthy(A.get("twin")):
		opt["pwr"] = "full"
		opt["oei"] = true
	var ss := FP.steadyState(s, float(o.get("kt", 0.0)), _fin(o.get("fpm"), 0.0), opt)
	if not bool(ss["ok"]):
		return "目安：この機体では全開でも %s kt・%s fpm は出せません。速度を優先してください。" % [_fmt_num(o.get("kt")), _fmt_num(o.get("fpm"))]
	var how := String(HOW.get(String(o.get("how", "level") if o.get("how") != null else "level"), "undefined"))
	var rate := ""
	if _truthy(o.get("pwr")):
		rate = "（昇降率 約 %s%s fpm）" % ["+" if float(ss["fpm"]) >= 0.0 else "", _locale(float(_r50(float(ss["fpm"]))))]
	var flap_txt := ""
	if _truthy(o.get("flaps")):
		flap_txt = "・フラップ %s" % String((A["flapLabels"] as Array)[int(o["flaps"])])
	var gear_txt := ""
	if not bool((A["gear"] as Dictionary)["fixed"]):
		gear_txt = "・脚 %s" % ("DOWN" if _truthy(o.get("gear")) else "UP")
	return "目安：%s・%s%s%s%s%s。%s。直し方：%s。" % [_pwr_txt(ss, o, A), _pitch_txt(float(ss["pitch"])), rate, ("・バンク %s°" % _fmt_num(o.get("bank"))) if _truthy(o.get("bank")) else "", flap_txt, gear_txt, _ai_ref(float(ss["pitch"])), how]

static func step_guide(S, L) -> String:
	if S == null or typeof(S) != TYPE_DICTIONARY or S.get("g") == null:
		return ""
	var g = S["g"]
	if typeof(g) == TYPE_CALLABLE:
		g = g.call(L)
	if typeof(g) == TYPE_STRING:
		return String(g)
	var t := guide_text(L["s"], g, L)
	if _truthy(g.get("pp")):
		var re := RegEx.new()
		re.compile("。PFD の姿勢表示で[^。]*。")
		t = re.sub(t, "。PFD の姿勢表示は故障中：右下の予備の姿勢指示器と、高度・昇降率・航跡の変化で判断。", false)
	return t

# ---------------------------------------------------------------- lesson helpers (used by syllabus.gd)
# target spec: [value or Callable of the lesson, tolerance at the BASIC level]
static func T_ALT(tol: float = 100.0) -> Array:
	return [func(L, _c = null): return L["alt0"], tol]

static func T_HDG(tol: float = 10.0) -> Array:
	return [func(L, _c = null): return L["hdg0"], tol]

static func T_SPD(kt, tol: float = 10.0) -> Array:
	return [kt, tol]

static func stepSL(name: String, kt, hold: float = 20.0, extra: Dictionary = {}) -> Dictionary:
	var d := {"name": name, "g": {"kt": kt, "how": "level"}, "say": "直線水平飛行：高度 {alt0} ft・針路 {hdg0}°・%s kt を保つ" % _fmt_num(kt), "tgt": {"alt": T_ALT(), "hdg": T_HDG(), "spd": T_SPD(kt)}, "hold": hold, "max": 150.0, "grade": true, "gradeWhen": func(c, L, st): return float(st["t"]) > 4.0}
	for k in extra.keys():
		d[k] = extra[k]
	return d

static func stepTurn(dir: float, bank: float, name: String, extra: Dictionary = {}) -> Array:
	var side := "左" if dir < 0 else "右"
	var kt = extra.get("kt") if _truthy(extra.get("kt")) else 100.0
	var tgt := {"alt": T_ALT(), "abank": [bank, 5.0]}
	var et = extra.get("tgt")
	if typeof(et) == TYPE_DICTIONARY:
		for k in et.keys():
			tgt[k] = et[k]
	var first := {"name": name, "g": {"kt": kt, "bank": bank, "how": "turn"}, "keys": "A / D でバンク、S で少し引く、R でパワー少し", "say": "%sへバンク %s° で 360° 旋回。高度 {alt0} ft を保つ（少し引いてパワーを足し、沈みを防ぐ）" % [side, _fmt_num(bank)],
		"tgt": tgt, "gradeWhen": func(c, L, st): return absf(float(st["turned"])) > 25.0 and absf(float(st["turned"])) < 330.0,
		"until": func(c, L, st): return absf(float(st["turned"])) >= 345.0 - bank / 2.0, "max": 150.0, "grade": true,
		"check": func(c, L, st): if absf(float(st["turned"])) > 20.0 and (1.0 if float(st["turned"]) > 0.0 else (-1.0 if float(st["turned"]) < 0.0 else 0.0)) != dir: st["note"] = "旋回方向が逆です"}
	var second := {"name": "%s：ロールアウト" % name, "g": {"kt": kt, "how": "level"}, "say": "開始時の針路 {hdg0}° で翼を水平に戻す（バンク角の半分くらい手前から戻し始める）", "tgt": {"hdg": T_HDG(), "alt": T_ALT()}, "until": func(c, L, st): return absf(float(c["bank"])) < 5.0 and float(st["t"]) > 2.0, "max": 20.0, "grade": true, "gradeFinal": true}
	return [first, second]

# ---------------------------------------------------------------- checklists (teaching versions)
static func _mix_now(s: Dictionary, e: Dictionary) -> float:
	return float(s["mix"]) if (s.get("mix") != null and float(s.get("_mixCmd", 0.0)) != float(s["mix"])) else float(e.get("mix", 1.0))

static func _sel_now(s: Dictionary, e: Dictionary) -> String:
	return String(s["fuelSel"]) if (s.get("fuelSel") != null and String(s.get("_selCmd", "")) != String(s["fuelSel"])) else String(e.get("sel", "L"))

static func _fuller_side(s: Dictionary) -> bool:
	var sel := _sel_now(s, (s["eng"] as Array)[0])
	return sel != "OFF" and float((s["fuel"] as Array)[1 if sel == "R" else 0]) >= float((s["fuel"] as Array)[0 if sel == "R" else 1]) - 0.25

static func _wb_text(s: Dictionary) -> String:
	var w = s.get("wb")
	if w == null:
		return "標準の搭載"
	var head := "総重量 %s lb・重心 %s in" % [_locale(float(_js_round(float(w["lb"])))), _to_fixed(float(w["cgIn"]), 1)]
	if bool(w["ok"]):
		return "%s（範囲内）" % head
	var whys: Array = []
	for k in w["problems"]:
		if String(k) == "over":
			whys.append("最大離陸重量 %s lb を超過" % _locale(float(w["mtowLb"])))
		elif String(k) == "nose":
			whys.append("重心が前限界 %s in より前" % _fmt_num(w["fwdIn"]))
		else:
			whys.append("重心が後限界 %s in より後" % _fmt_num(w["aftIn"]))
	return "%s：%s。搭載を直してから出発（課目を終了し、ブリーフィングで搭載を選び直す）" % [head, "・".join(whys)]

static func _wb_ok(s: Dictionary) -> bool:
	return s.get("wb") == null or bool(s["wb"]["ok"])

static var _checklists_cache = null
static func checklists() -> Dictionary:
	if _checklists_cache != null:
		return _checklists_cache
	var C := {
		"before_takeoff": {"title": "離陸前点検（BEFORE TAKEOFF・教材の簡略版）", "items": [
			["ドア・シートベルト", "閉・着用"], ["操縦舵面", "自由・正しい向きに動く（W / S / A / D / Q / E で確認）"], ["計器（G1000 型）", "PFD・MFD 異常なし、高度計規正（BARO）"],
			["重量と重心", func(s): return _wb_text(s), func(s): return _wb_ok(s)],
			["燃料セレクター", "燃料の多い側", func(s): return _fuller_side(s)], ["フラップ", "UP（通常離陸）", func(s): return int(s["flapIdx"]) == 0], ["トリム", "離陸位置（Shift+T でリセット）", func(s): return absf(float(s["trim"])) < 0.05],
			["スロットル", "アイドル", func(s): return float(s["thr"]) < 0.1], ["離陸の計画", func(s): return "Vr %s・Vy %s。浮揚前の異常は止まる、浮揚後のエンジン故障は正面へ" % [_fmt_num(s["A"]["v"]["rotate"]), _fmt_num(s["A"]["v"]["y"])]]]},
		"before_landing": {"title": "着陸前点検（BEFORE LANDING・教材の簡略版）", "items": [
			["燃料セレクター", "燃料の多い側", func(s): return _fuller_side(s)], ["ミクスチャー", "RICH（降下前に戻す）", func(s): return (s["eng"] as Array).all(func(e): return _mix_now(s, e) >= 0.95)], ["フラップ", "進入に合わせて下げる（V キー）", func(s): return int(s["flapIdx"]) >= 1],
			["進入速度", func(s): return "%s kt（短距離 %s kt）" % [_fmt_num(s["A"]["v"]["appr"]), _fmt_num(s["A"]["v"].get("apprShort") if s["A"]["v"].get("apprShort") != null else float(s["A"]["v"]["appr"]) - 5.0)]], ["着陸許可", "受領・復唱"]]},
		"cruise": {"title": "巡航点検（CRUISE・教材の簡略版）", "items": [
			["ミクスチャー", func(s): return "リーン：密度高度 %d ft。操縦席のミクスチャーをホイールで少しずつ引き、MFD の EGT が上がってピークに近づいたら少し戻す（絞りすぎは粗さと出力低下）" % _js_round(float((s["out"] as Dictionary)["densAlt"])), func(s): return _mix_now(s, (s["eng"] as Array)[0]) <= 0.97]]},
		"ms_before_takeoff": {"title": "離陸前点検・双発（BEFORE TAKEOFF・教材の簡略版）", "items": [
			["ドア・シートベルト", "閉・着用"], ["操縦舵面", "自由・正しい向きに動く"], ["重量と重心", func(s): return _wb_text(s), func(s): return _wb_ok(s)], ["フラップ", "UP", func(s): return int(s["flapIdx"]) == 0], ["トリム", "離陸位置（Shift+T）", func(s): return absf(float(s["trim"])) < 0.05],
			["燃料・ミクスチャー・プロペラ", "タンクに・リッチ・前（プロペラは教材では自動）", func(s): return (s["eng"] as Array).all(func(e): return _sel_now(s, e) != "OFF" and _mix_now(s, e) >= 0.95)], ["スロットル", "アイドル", func(s): return float(s["thr"]) < 0.1],
			["離陸ブリーフィング", func(s): return "Vr %s・Vyse %s（青線）・Vmc %s（赤線）。浮揚前の故障は止まる。浮揚後は Vyse・脚 UP・Identify → Verify → Feather" % [_fmt_num(s["A"]["v"]["rotate"]), _fmt_num(((s["A"] as Dictionary)["v"] as Dictionary).get("yse")), _fmt_num(((s["A"] as Dictionary)["v"] as Dictionary).get("vmc"))]]]},
		"ms_before_landing": {"title": "着陸前点検・双発（GUMPS）", "items": [
			["G：Gas（燃料）", "両方 ON", func(s): return (s["eng"] as Array).all(func(e): return _sel_now(s, e) != "OFF")], ["U：Undercarriage（脚）", "DOWN・緑 3 つ（G キー）", func(s): return bool(s["gearDown"]) and float(s["gearPos"]) > 0.98], ["M：Mixture", "RICH", func(s): return (s["eng"] as Array).all(func(e): return _mix_now(s, e) >= 0.95)],
			["P：Props", "前（教材では自動）"], ["S：Switches / Seatbelts", "着陸灯 ON・ベルト着用"]]},
		"cx_before_takeoff": {"title": "離陸前点検・複雑機（BEFORE TAKEOFF・教材の簡略版）", "items": [
			["ドア・シートベルト", "閉・着用"], ["操縦舵面", "自由・正しい向きに動く（W / S / A / D / Q / E で確認）"], ["計器（G1000 型）", "PFD・MFD 異常なし、高度計規正（BARO）"],
			["重量と重心", func(s): return _wb_text(s), func(s): return _wb_ok(s)],
			["燃料セレクター", "燃料の多い側", func(s): return _fuller_side(s)], ["ミクスチャー", "RICH", func(s): return (s["eng"] as Array).all(func(e): return _mix_now(s, e) >= 0.95)],
			["プロペラ", "FULL FORWARD（一番前：離陸は最大回転で）", func(s): return (float(s["prop"]) if s.get("prop") != null else 1.0) >= 0.98], ["フラップ", "UP（通常離陸）", func(s): return int(s["flapIdx"]) == 0], ["トリム", "離陸位置（Shift+T でリセット）", func(s): return absf(float(s["trim"])) < 0.05],
			["脚", "DOWN・緑 3 つ", func(s): return bool(s["gearDown"]) and float(s["gearPos"]) > 0.98], ["スロットル", "アイドル", func(s): return float(s["thr"]) < 0.1],
			["離陸の計画", func(s): return "Vr %s・Vy %s・脚上げは正の上昇を確認してから。浮揚前の異常は止まる、浮揚後のエンジン故障は正面へ" % [_fmt_num(s["A"]["v"]["rotate"]), _fmt_num(s["A"]["v"]["y"])]]]},
		"cx_before_landing": {"title": "着陸前点検・複雑機（GUMPS＋プロペラ）", "items": [
			["G：Gas（燃料）", "燃料の多い側", func(s): return _fuller_side(s)], ["U：Undercarriage（脚）", "DOWN・緑 3 つ（G キー）", func(s): return bool(s["gearDown"]) and float(s["gearPos"]) > 0.98], ["M：Mixture", "RICH（降下前に戻す）", func(s): return (s["eng"] as Array).all(func(e): return _mix_now(s, e) >= 0.95)],
			["P：Propeller", "FULL FORWARD（, / . キー：一番前。ゴーアラウンドに備える）", func(s): return (float(s["prop"]) if s.get("prop") != null else 1.0) >= 0.98],
			["S：Switches / Seatbelts", "着陸灯 ON・ベルト着用"], ["進入速度", func(s): return "%s kt" % _fmt_num(s["A"]["v"]["appr"])]]},
		"ms_engine_failure": {"title": "片発停止の記憶操作（教材の簡略版・機体の POH が優先）", "items": [
			["ピッチ", func(s): return "機首を下げて Vyse %s kt（青線）を保つ" % _fmt_num(((s["A"] as Dictionary)["v"] as Dictionary).get("yse"))], ["出力", "ミクスチャー・プロペラ・スロットル 前（全開）"], ["外形", "フラップ UP・脚 UP（G）", func(s): return int(s["flapIdx"]) == 0 and not bool(s["gearDown"])],
			["Identify（特定）", "踏んでいない足の側＝止まったエンジン（Dead foot, dead engine）"], ["Verify（確認）", "止まったと思う側のスロットルを絞っても何も変わらないこと"],
			["Feather（フェザー）", "止まった側のプロペラをフェザー（[ ＝ 左・] ＝ 右）", func(s): return (s["eng"] as Array).any(func(e): return bool(e.get("failed", false)) and bool(e.get("feather", false)))]]},
	}
	_checklists_cache = C
	return C

# ---------------------------------------------------------------- ATC read-back questions (LAB Tower / LAB Approach are FICTIONAL)
static func atc_question(key: String, L: Dictionary) -> Dictionary:
	var call := String(L["call"])
	var cs := String(L["callShort"])
	var wind := String(L["windStr"])
	var alt0 := float(L["alt0"])
	match key:
		"takeoff":
			return {"msg": "LAB Tower: \"%s, wind %s, runway 36, cleared for takeoff.\"" % [call, wind],
				"opts": ["Runway 36, cleared for takeoff, %s." % cs, "Roger, %s." % cs, "Cleared for takeoff."], "ok": 0,
				"why": "離陸許可は「滑走路番号＋cleared for takeoff＋コールサイン」を復唱します（AIM 4-4-7 など）。Roger だけでは不十分です。"}
		"landing":
			return {"msg": "LAB Tower: \"%s, runway 36, wind %s, cleared to land.\"" % [call, wind],
				"opts": ["Wilco.", "Runway 36, cleared to land, %s." % cs, "Landing runway 18, %s." % cs], "ok": 1,
				"why": "着陸許可も滑走路番号を含めて復唱します。滑走路番号の取り違えは重大な誤り（滑走路誤進入の原因）です。"}
		"pattern":
			return {"msg": "LAB Tower: \"%s, enter left downwind runway 36, report midfield.\"" % call,
				"opts": ["Left downwind 36, report midfield, %s." % cs, "Right downwind 36, %s." % cs, "Roger, will report, %s." % cs], "ok": 0,
				"why": "場周経路の入り方（左・右、どの辺）と、報告の地点を復唱します。左右の取り違えは他機との接近の原因です。"}
		"climb":
			return {"msg": "LAB Approach: \"%s, climb and maintain %s.\"" % [call, _locale(alt0 + 1000.0)],
				"opts": ["Climb and maintain %s, %s." % [_locale(alt0 + 1000.0), cs], "Climbing, %s." % cs, "Maintain %s, %s." % [_locale(alt0), cs]], "ok": 0,
				"why": "高度の指示は必ず数字で復唱します（AIM 4-4-7：高度・針路・速度の指示は復唱）。「Climbing」だけでは管制官が聞き違いに気づけません。"}
		"ils":
			return {"msg": "LAB Approach: \"%s, turn left heading 330, maintain 2,000 until established on the localizer, cleared ILS runway 36 approach.\"" % call,
				"opts": ["Left 330, maintain 2,000 until established, cleared ILS runway 36, %s." % cs, "Cleared ILS, %s." % cs, "Right 330, cleared ILS runway 36, %s." % cs], "ok": 0,
				"why": "進入許可は「針路・ローカライザーに乗るまでの高度・進入の種類と滑走路」をすべて復唱します。旋回方向（left / right）も大切です。"}
		"rnav":
			return {"msg": "LAB Approach: \"%s, turn left heading 330, maintain 2,000 until established on the final approach course, cleared RNAV runway 36 approach.\"" % call,
				"opts": ["Left 330, maintain 2,000 until established, cleared RNAV runway 36, %s." % cs, "Cleared RNAV, %s." % cs, "Right 330, cleared ILS runway 36, %s." % cs], "ok": 0,
				"why": "進入許可は「針路・ファイナルコースに乗るまでの高度・進入の種類（RNAV）と滑走路」をすべて復唱します。ILS との取り違え、旋回方向の取り違えは重大です。"}
		"divert":
			return {"msg": "LAB Approach: \"%s, roger, proceed direct LAB-F, maintain %s.\"" % [call, _locale(alt0)],
				"opts": ["Direct LAB-F, maintain %s, %s." % [_locale(alt0), cs], "Roger, %s." % cs, "Direct LAB-A, %s." % cs], "ok": 0,
				"why": "目的地変更の指示は「どこへ（直行先）・高度」を復唱します。"}
		"mayday":
			return {"msg": "（エンジンが止まりました。最初に送る無線として正しいものは？）",
				"opts": ["Mayday, Mayday, Mayday, LAB Tower, %s, engine failure, %s, %s feet, landing LAB runway 36." % [cs, String(L["posStr"]) if _truthy(L.get("posStr")) else "5 miles north", _locale(alt0)], "LAB Tower, %s, request landing." % cs, "Pan-pan, %s, low fuel." % cs], "ok": 0,
				"why": "遭難（すぐに助けが必要）なら MAYDAY を 3 回、相手・コールサイン・状況・位置・高度・意図の順（AIM 6-3-1 の考え方）。ただし最優先は操縦（Aviate → Navigate → Communicate）。"}
		"lost":
			return {"msg": "（現在地がわからなくなりました。管制に助けを求める無線は？）",
				"opts": ["LAB Approach, %s, unsure of position, %s feet, request assistance." % [cs, _locale(alt0)], "LAB Approach, %s, request flight following." % cs, "Mayday, Mayday, Mayday, %s, lost." % cs], "ok": 0,
				"why": "迷ったら早めに正直に伝える（Confess）。燃料や天候に余裕がなければ緊急の宣言もためらわない。AIM 6-2 の考え方（5C：Climb, Communicate, Confess, Comply, Conserve）。"}
		"oei":
			return {"msg": "（片発停止。管制へ伝える内容は？）",
				"opts": ["LAB Tower, %s, engine failure, left engine feathered, returning for landing runway 36." % cs, "LAB Tower, %s, request touch and go." % cs, "%s, all normal." % cs], "ok": 0,
				"why": "状況（片発停止・どちらのエンジン）と意図（戻って着陸）を短く伝えます。双発の片発停止は多くの場合「緊急（Mayday / Pan-pan）」として扱われ、優先して着陸させてもらえます。"}
	return {}

# ---------------------------------------------------------------- the context the steps read
static func ctx(L: Dictionary, dt: float = 1.0 / 60.0) -> Dictionary:
	var s: Dictionary = L["s"]
	var o: Dictionary = s["out"]
	var av: Dictionary = L["av"]
	var R := FP.lab_rwy()
	var var_w := FP.MAGVAR_W
	var pos := FP.neOf(s)
	var nav = AV.nav_solve(av, pos, o, var_w, R)
	if typeof(nav) != TYPE_DICTIONARY:
		nav = {"flag": "", "dots": 0.0, "gsDots": null, "dis": null, "xtk": null}
	var rc := FP.rwyCoords(R, float(pos["n"]), float(pos["e"]))
	var hdg := float(AV.true_to_mag(float(o["hdgTrue"]), var_w))
	var prev := hdg if L.get("prevHdg") == null else float(L["prevHdg"])
	L["prevHdg"] = hdg
	var rate := _w180(hdg - prev) / maxf(dt, 1e-3)
	L["rateF"] = rate if L.get("rateF") == null else float(L["rateF"]) + (rate - float(L["rateF"])) * minf(1.0, dt * 3.0)
	var agl_r := float(o["agl"])
	var aim := 300.0
	var gp := atan2(maxf(agl_r / FP.FT, 0.0), aim - float(rc["along"])) / DEG if float(rc["along"]) < aim - 50.0 else 3.0
	var h := float(R["trueHdg"]) * DEG
	var lat_v: float = float((s["vel"] as Array)[0]) * cos(h) + float((s["vel"] as Array)[2]) * sin(h)
	var vor = null
	for x in AV.NAVAIDS:
		if String(x["type"]) == "VOR":
			vor = x
			break
	var dme_v := float(AV.ne_dist_nm(vor, pos))
	var brg_v := float(AV.true_to_mag(float(AV.ne_bearing(pos, vor)), var_w))
	var flag = nav.get("flag")
	var flag_t := _truthy(flag)
	var eng_run := 0
	for e in s["eng"]:
		if bool(e.get("run", false)):
			eng_run += 1
	return {
		"dt": dt, "t": float(L["t"]), "alt": float(AV.indicated_alt(float(o["altTrue"]), float(s["qnh"]), float(av["baro"]))), "altTrue": float(o["altTrue"]), "agl": float(o["agl"]), "aglR": agl_r, "kias": float(o["ias"]), "tas": float(o["tas"]), "gsK": float(o["gs"]),
		"hdg": hdg, "trk": float(AV.true_to_mag(float(o["trk"]), var_w)), "pitch": float(o["pitch"]), "bank": float(o["bank"]), "vs": float(o["vsi"]), "rate": float(L["rateF"]), "along": float(rc["along"]), "cross": float(rc["cross"]), "rwyHdg": 360.0,
		"thr": float(s["thr"]), "prop": float(s["prop"]) if s.get("prop") != null else 1.0, "rpm": _fin(o.get("rpm"), 0.0), "manIn": _fin(o.get("manIn"), 0.0), "propK": float(o["propK"]) if o.get("propK") != null else 1.0, "flaps": int(s["flapIdx"]), "gearDown": bool(s["gearDown"]), "gearPos": float(s["gearPos"]), "onGround": bool(s["onGround"]), "paved": bool(o["onRunway"]), "stall": bool(o["stallWarn"]), "g": float(o["g"]), "beta": float(o["beta"]),
		"latV": lat_v, "gp": gp, "cl": float(rc["cross"]), "cdi": 2.5 if flag_t else _fin(nav.get("dots"), 0.0), "loc": 2.5 if flag_t else _fin(nav.get("dots"), 0.0), "gsd": 2.5 if (flag_t or nav.get("gsDots") == null) else float(nav["gsDots"]), "navFlag": flag, "dmeV": dme_v, "brgV": brg_v, "dis": nav.get("dis"), "xtk": nav.get("xtk"),
		"engRun": eng_run, "crashed": bool(s["crashed"]), "td": s.get("td"),
	}

# the value of a target in the context (deviation = value - target)
static func tgt_dev(k: String, c: Dictionary, tv: float) -> float:
	match k:
		"hdg": return _w180(float(c["hdg"]) - tv)
		"rhdg": return _w180(float(c["hdg"]) - float(c["rwyHdg"]))
		"dwhdg": return _w180(float(c["hdg"]) - 180.0)
		"trk": return _w180(float(c["trk"]) - tv)
		"alt": return float(c["alt"]) - tv
		"spd": return float(c["kias"]) - tv
		"vs": return float(c["vs"]) - tv
		"aglR": return float(c["aglR"]) - tv
		"gp": return float(c["gp"]) - tv
		"cl": return float(c["cl"]) - tv
		"abank": return absf(float(c["bank"])) - tv
		"bank": return float(c["bank"]) - tv
		"arate": return absf(float(c["rate"])) - tv
		"cdi": return float(c["cdi"]) - tv
		"loc": return float(c["loc"]) - tv
		"gs": return float(c["gsd"]) - tv
		"xtk": return _fin(c.get("xtk"), 0.0) - tv
	return 0.0

const TGT_LABEL := {"alt": ["高度", "ft"], "hdg": ["針路", "°"], "rhdg": ["針路", "°"], "dwhdg": ["針路", "°"], "trk": ["航跡", "°"], "spd": ["速度", "kt"], "vs": ["昇降率", "fpm"], "aglR": ["対地高度", "ft"],
	"abank": ["バンク", "°"], "bank": ["バンク", "°"], "arate": ["旋回率", "°/秒"], "gp": ["進入角", "°"], "cl": ["センターライン", "m"], "cdi": ["CDI", "ドット"], "loc": ["LOC", "ドット"], "gs": ["GS", "ドット"], "xtk": ["航路外れ", "NM"]}
const DP := {"cdi": 1, "loc": 1, "gs": 1, "gp": 1, "arate": 1, "xtk": 2}

static func fill_text(str_in: String, L: Dictionary) -> String:
	var re := RegEx.new()
	re.compile("\\{(\\w+)\\}")
	var c = L.get("last")
	var vals := {
		"alt0": float(L["alt0"]), "alt1": float(L["alt0"]) + 1000.0, "hdg0": float(L["hdg0"]), "hdgL": _or360(_w360(float(L["hdg0"]) - 90.0)), "hdgR": _or360(_w360(float(L["hdg0"]) + 90.0)), "rwyHdg": 360.0, "dwHdg": 180.0,
		"brgV": float(c["brgV"]) if c != null else 0.0, "obs": float((L["av"] as Dictionary)["crs"]), "obsOut": _or360(_w360(float((L["av"] as Dictionary)["crs"]) + 180.0)),
		"vr": (L["V"] as Dictionary).get("rotate"), "vy": (L["V"] as Dictionary).get("y"), "vx": (L["V"] as Dictionary).get("x"), "glide": (L["V"] as Dictionary).get("glide"), "appr": (L["V"] as Dictionary).get("appr"), "yse": (L["V"] as Dictionary).get("yse"), "mc": (L["V"] as Dictionary).get("mc"),
		"intHdg": L.get("intHdg"), "call": String(L["callShort"]), "dest": String(L["dest"]) if _truthy(L.get("dest")) else "",
	}
	var out := ""
	var last_end := 0
	for m in re.search_all(str_in):
		out += str_in.substr(last_end, m.get_start(0) - last_end)
		var k := m.get_string(1)
		var v = vals.get(k)
		if v == null:
			out += m.get_string(0)
		elif typeof(v) != TYPE_INT and typeof(v) != TYPE_FLOAT:
			out += String(v)
		elif k.begins_with("alt"):
			out += _locale(float(_js_round(float(v))))
		elif RegEx.create_from_string("hdg|Hdg|brg|obs").search(k) != null:
			out += _pad3(str(_js_round(float(v))))
		else:
			out += str(_js_round(float(v)))
		last_end = m.get_end(0)
	out += str_in.substr(last_end)
	return out

# ---------------------------------------------------------------- where a lesson starts
static func place(L: Dictionary, su: Dictionary) -> void:
	var s: Dictionary = L["s"]
	var R := FP.lab_rwy()
	var var_w := FP.MAGVAR_W
	var V: Dictionary = L["V"]
	var at := String(su.get("at", ""))
	if at == "runway":
		FP.placeOnRunway(s, R, float(su["along"]) if _truthy(su.get("along")) else 30.0)
		L["hdg0"] = 360.0
		L["alt0"] = float(_js_round(float(R["elevFt"]) + 1000.0))
	elif at == "area":
		var hdg := float(su["hdg"]) if _truthy(su.get("hdg")) else 90.0
		var n := float(su["n"]) if su.get("n") != null else 7000.0
		var e := float(su["e"]) if su.get("e") != null else -37500.0
		L["alt0"] = float(su["altFt"]) if _truthy(su.get("altFt")) else 3000.0
		FP.placeInAir(s, n, e, float(L["alt0"]), float(AV.mag_to_true(hdg, var_w)), float(su["kt"]) if _truthy(su.get("kt")) else float(V["cruise"]), _fin(su.get("gamma"), 0.0), int(su["flaps"]) if _truthy(su.get("flaps")) else 0, float(su["thr"]) if su.get("thr") != null else null)
		L["hdg0"] = hdg
	elif at == "downwind":
		var ne2 := FP.rwyToNE(R, float(R["len"]) + 200.0, -1600.0)
		var alt_ft := float(R["elevFt"]) + 1000.0
		FP.placeInAir(s, float(ne2[0]), float(ne2[1]), alt_ft, float(AV.mag_to_true(180.0, var_w)), float(su["kt"]) if _truthy(su.get("kt")) else 90.0, 0.0, 0, null)
		L["hdg0"] = 180.0
		L["alt0"] = alt_ft
	elif at == "final":
		var D := (float(su["km"]) if _truthy(su.get("km")) else 5.0) * 1000.0
		var ne3 := FP.rwyToNE(R, 300.0 - D, _fin(su.get("cross"), 0.0))
		var alt_ft3 := float(R["elevFt"]) + tan(3.0 * DEG) * D * FP.FT
		var fl := int(su["flaps"]) if su.get("flaps") != null else (int(V["apprFlaps"]) if _truthy(V.get("apprFlaps")) else 2)
		var kt3 := float(su["kt"]) if _truthy(su.get("kt")) else float(V["appr"])
		FP.placeInAir(s, float(ne3[0]), float(ne3[1]), alt_ft3, float(R["trueHdg"]), kt3, -3.0, fl, null)
		L["hdg0"] = 360.0
		L["alt0"] = float(_js_round(alt_ft3))
	elif at == "ils":
		var D4 := (float(su["km"]) if _truthy(su.get("km")) else 14.0) * 1000.0
		var ne4 := FP.rwyToNE(R, 300.0 - D4, float(su["cross"]) if su.get("cross") != null else 3200.0)
		L["intHdg"] = float(su["intHdg"]) if _truthy(su.get("intHdg")) else 330.0
		L["alt0"] = float(su["altFt"]) if _truthy(su.get("altFt")) else 2000.0
		FP.placeInAir(s, float(ne4[0]), float(ne4[1]), float(L["alt0"]), float(AV.mag_to_true(float(L["intHdg"]), var_w)), float(su["kt"]) if _truthy(su.get("kt")) else 90.0, 0.0, 0, null)
		L["hdg0"] = float(L["intHdg"])
	elif at == "away":
		var ref := {"n": float(R["n"]), "e": float(R["e"])}
		if String(su.get("from", "")) != "rwy":
			for x in AV.NAVAIDS:
				if String(x["type"]) == "VOR":
					ref = x
					break
		var b := float(AV.mag_to_true(float(su["brg"]) if su.get("brg") != null else 90.0, var_w)) * DEG
		var D5 := (float(su["km"]) if _truthy(su.get("km")) else 10.0) * 1000.0
		var n5: float = float(ref["n"]) + cos(b) * D5
		var e5: float = float(ref["e"]) + sin(b) * D5
		L["alt0"] = float(su["altFt"]) if _truthy(su.get("altFt")) else 3000.0
		var hdg5: float
		if su.get("hdg") != null:
			hdg5 = float(su["hdg"])
		elif _truthy(su.get("toward")):
			hdg5 = _w360(float(AV.true_to_mag(float(AV.ne_bearing({"n": n5, "e": e5}, ref)), var_w)) + _fin(su.get("offset"), 0.0))
		else:
			hdg5 = float(su["brg"]) if _truthy(su.get("brg")) else 90.0
		FP.placeInAir(s, n5, e5, float(L["alt0"]), float(AV.mag_to_true(hdg5, var_w)), float(su["kt"]) if _truthy(su.get("kt")) else float(V["cruise"]), 0.0, 0, null)
		L["hdg0"] = float(_js_round(hdg5)) if _js_round(hdg5) != 0 else 360.0
	if su.get("thr") != null and at != "runway":
		s["thr"] = float(su["thr"])
	if su.get("gear") != null and not bool((s["A"] as Dictionary)["gear"]["fixed"]) and at != "runway":
		s["gearDown"] = bool(su["gear"])
		s["gearPos"] = 1.0 if bool(su["gear"]) else 0.0
	var av: Dictionary = L["av"]
	av["baro"] = float(s["qnh"])
	av["hdgBug"] = float(L["hdg0"]) if _truthy(L.get("hdg0")) else 360.0
	av["altSel"] = float(_js_round(float(L["alt0"]) / 100.0) * 100)
	if String(su.get("nav", "")) == "VOR":
		av["cdi"] = "NAV1"
		(av["nav1"] as Dictionary)["act"] = 113500
		var obs_v := float(su["obs"]) if su.get("obs") != null else float(_js_round(float(AV.true_to_mag(float(AV.ne_bearing(FP.neOf(s), (AV.NAVAIDS as Array)[0])), var_w)) / 5.0) * 5)
		av["crs"] = _or360(_w360(obs_v + _fin(su.get("obsOff"), 0.0)))
	elif String(su.get("nav", "")) == "ILS":
		av["cdi"] = "NAV1"
		(av["nav1"] as Dictionary)["act"] = 109900
		av["crs"] = 360.0
	elif String(su.get("nav", "")) == "RNAV":
		AV.control(av, "PROC_RNAV")
	if su.get("fpl") != null:
		av["fpl"] = {"wps": (su["fpl"] as Array).duplicate(), "active": 1}
		av["cdi"] = "GPS"
	FP.derive(s)

# ---------------------------------------------------------------- the lesson
static func lesson(id: String) -> Dictionary:
	for st in stages():
		for l in st["lessons"]:
			if String(l["id"]) == id:
				return l
	return {}

static func lesson_order() -> Array:
	var out: Array = []
	for st in stages():
		for l in st["lessons"]:
			out.append(l["id"])
	return out

static func stage_of(id: String) -> Dictionary:
	for st in stages():
		for l in st["lessons"]:
			if String(l["id"]) == id:
				return st
	return {}

static func _call_of(A: Dictionary) -> Dictionary:
	return {"spoken": "%s Seven Lima Alpha" % String(A["short"]), "short": "%s 7LA" % String(A["short"])}

static func start_lesson(id: String, level_id: String = "intro", opt: Dictionary = {}) -> Dictionary:
	var def := lesson(id)
	if def.is_empty() or def.get("steps") == null:
		push_error("unknown flight lesson " + id)
		return {}
	var su: Dictionary = def.get("setup", {})
	var s := FP.newState({"aircraft": String(def["aircraft"]) if _truthy(def.get("aircraft")) else (String(su["aircraft"]) if _truthy(su.get("aircraft")) else "pa28"), "seed": int(opt["seed"]) if _truthy(opt.get("seed")) else 7})
	s["oatDev"] = float(opt["oatDev"]) if opt.get("oatDev") != null else 0.0
	(s["opts"] as Dictionary)["gainCap"] = float(opt["gainCap"]) if opt.get("gainCap") != null else 1.7
	(s["opts"] as Dictionary)["sens"] = String(opt["sens"]) if _truthy(opt.get("sens")) else "low"
	(s["opts"] as Dictionary)["autoRud"] = bool(opt["autoRud"]) if opt.get("autoRud") != null else bool(def.get("autoRud", false))
	var R := FP.lab_rwy()
	if su.get("wind") != null:
		var wnd: Dictionary = su["wind"]
		s["wind"] = {"fromDeg": _w360(float(R["trueHdg"]) + float(wnd["rel"])), "kt": float(wnd["kt"]), "gust": float(wnd["gust"]) if wnd.get("gust") != null else 1.0}
	else:
		s["wind"] = {"fromDeg": float(R["trueHdg"]) + 10.0, "kt": 0.0 if _truthy(su.get("calm")) else 5.0, "gust": 0.5}
	if opt.get("wind") != null:
		var ow: Dictionary = opt["wind"]
		var prev_gust = (s["wind"] as Dictionary).get("gust")
		s["wind"] = {"fromDeg": _w360(float(ow["fromDeg"])), "kt": float(ow["kt"]), "gust": float(ow["gust"]) if ow.get("gust") != null else (float(prev_gust) if prev_gust != null else 0.5)}
		if ow.get("topKt") != null:
			s["wind"]["topFrom"] = _w360(float(ow["topFrom"]))
			s["wind"]["topKt"] = float(ow["topKt"])
			s["wind"]["topFt"] = float(ow["topFt"]) if _truthy(ow.get("topFt")) else 3000.0
	s["qnh"] = float(su["qnh"]) if _truthy(su.get("qnh")) else 29.92
	var av: Dictionary = AV.create_avionics()
	var lv := level(level_id)
	var call := _call_of(s["A"])
	var L := {"id": id, "def": def, "level": lv, "s": s, "av": av, "A": s["A"], "V": (s["A"] as Dictionary)["v"], "step": -1, "results": [], "t": 0.0, "call": String(call["spoken"]), "callShort": String(call["short"]), "fail": {}, "hood": bool(su.get("hood", false)), "prevHdg": null, "rateF": 0.0,
		"hist": {"alt": [], "ias": []}, "nextSample": 0.0, "done": false, "passed": false, "grade": "", "reason": "", "events": [], "evSeen": 0, "landings": 0}
	var wind_mag := _js_round(float(AV.true_to_mag(float((s["wind"] as Dictionary)["fromDeg"]), FP.MAGVAR_W)) / 10.0) * 10
	if wind_mag == 0:
		wind_mag = 360
	L["windStr"] = "calm" if float((s["wind"] as Dictionary)["kt"]) < 3.0 else "%s at %d" % [_pad3(str(wind_mag)), _js_round(float((s["wind"] as Dictionary)["kt"]))]
	FP.applyLoading(s, opt.get("loading"))
	place(L, su)
	if typeof(su.get("onStart")) == TYPE_CALLABLE:
		su["onStart"].call(L)
	L["last"] = ctx(L)
	next_step(L, L["last"])
	return L

# ---------------------------------------------------------------- the step machine
static func next_step(L: Dictionary, c) -> void:
	L["step"] = int(L["step"]) + 1
	var steps: Array = (L["def"] as Dictionary)["steps"]
	var S = steps[int(L["step"])] if int(L["step"]) < steps.size() else null
	if S == null:
		end_lesson(L, true)
		return
	L["st"] = {"t": 0.0, "turned": 0.0, "stats": {}, "holdT": 0.0, "holdBest": 0.0, "lastHdg": null}
	var s: Dictionary = L["s"]
	var st: Dictionary = L["st"]
	if typeof(S.get("onStart")) == TYPE_CALLABLE:
		S["onStart"].call(L, c, st)
	if _truthy(S.get("fail")):
		fail_now(L, String(S["fail"]))
	if _truthy(S.get("hoodOff")):
		L["hood"] = false
	if _truthy(S.get("hoodOn")):
		L["hood"] = true
	if _truthy(S.get("upset")):
		set_upset(L, String(S["upset"]))
	if _truthy(S.get("checklist")):
		L["check"] = {"id": String(S["checklist"]), "i": 0}
	if _truthy(S.get("atc")):
		L["atc"] = S["atc"].call(L) if typeof(S["atc"]) == TYPE_CALLABLE else atc_question(String(S["atc"]), L)
	L["guideText"] = step_guide(S, L)
	if _truthy(S.get("say")):
		L["sayText"] = fill_text(String(S["say"]), L)
	elif _truthy(S.get("checklist")):
		L["sayText"] = String((checklists()[String(S["checklist"])] as Dictionary)["title"]) + "（Enter で 1 項目ずつ確認）"
	elif _truthy(S.get("atc")):
		L["sayText"] = "管制の指示に正しく応答する（1〜3 キー）"
	else:
		L["sayText"] = ""
	L["keysText"] = fill_text(String(S["keys"]), L) if _truthy(S.get("keys")) else ""
	L["hint"] = ""
	L["chime"] = int(L.get("chime", 0)) + 1
	s["ovr"] = null

static func fail_now(L: Dictionary, kind: String) -> void:
	var s: Dictionary = L["s"]
	(L["fail"] as Dictionary)[kind] = float(L["t"])
	match kind:
		"engine", "engL":
			(s["eng"] as Array)[0]["failed"] = true
		"engR":
			(s["eng"] as Array)[(s["eng"] as Array).size() - 1]["failed"] = true
		"ahrs":
			var f1: Dictionary = ((L["av"] as Dictionary).get("fail") as Dictionary).duplicate() if typeof((L["av"] as Dictionary).get("fail")) == TYPE_DICTIONARY else {}
			f1["ahrs"] = true
			(L["av"] as Dictionary)["fail"] = f1
		"gps":
			var f2: Dictionary = ((L["av"] as Dictionary).get("fail") as Dictionary).duplicate() if typeof((L["av"] as Dictionary).get("fail")) == TYPE_DICTIONARY else {}
			f2["gps"] = true
			(L["av"] as Dictionary)["fail"] = f2
			if String((L["av"] as Dictionary)["cdi"]) == "GPS":
				(L["av"] as Dictionary)["direct"] = null
		"pitot":
			s["pitotRisk"] = 3.0
		"static":
			s["staticBlocked"] = true
		"pump":
			(s["eng"] as Array)[0]["pumpFail"] = true
		"gear":
			s["gearFault"] = true

static func set_upset(L: Dictionary, kind: String) -> void:
	var s: Dictionary = L["s"]
	var a := FP.attitude(s)
	var h := float(a["hdg"]) * DEG
	if kind == "high":
		s["q"] = FP.qFromHPB(float(a["hdg"]), 25.0, -35.0)
		s["vel"] = FP.vscale([sin(h), 0.32, -cos(h)], 34.0)
		s["thr"] = 0.45
	else:
		s["q"] = FP.qFromHPB(float(a["hdg"]), -20.0, 50.0)
		s["vel"] = FP.vscale([sin(h), -0.34, -cos(h)], 62.0)
		s["thr"] = 0.85
	s["w"] = [0.0, 0.0, 0.0]
	s["pTgt"] = float(FP.attitude(s)["pitch"])

# one evaluation tick (after the physics step)
static func update(L, dt: float) -> void:
	if L == null or typeof(L) != TYPE_DICTIONARY or bool(L.get("done", false)):
		return
	var c := ctx(L, dt)
	L["last"] = c
	L["t"] = float(L["t"]) + dt
	if float(L["t"]) >= float(L["nextSample"]):
		L["nextSample"] = float(L["t"]) + 2.0
		var hist: Dictionary = L["hist"]
		if (hist["alt"] as Array).size() < 1800:
			hist["alt"].append(_js_round(float(c["alt"])))
			hist["ias"].append(_js_round(float(c["kias"])))
	var steps: Array = (L["def"] as Dictionary)["steps"]
	var S = steps[int(L["step"])] if int(L["step"]) >= 0 and int(L["step"]) < steps.size() else null
	if S == null:
		return
	if _truthy((L["A"] as Dictionary).get("twin")):
		for e in L["s"]["eng"]:
			if bool(e.get("failed", false)):
				(L["s"]["opts"] as Dictionary)["autoRud"] = false
				break
	var st: Dictionary = L["st"]
	st["t"] = float(st["t"]) + dt
	st["turned"] = float(st["turned"]) + (0.0 if st.get("lastHdg") == null else _w180(float(c["hdg"]) - float(st["lastHdg"])))
	st["lastHdg"] = float(c["hdg"])
	if bool((L["s"] as Dictionary)["crashed"]):
		crashed(L, String((L["s"] as Dictionary)["crashReason"]))
		return
	if _truthy(S.get("checklist")) or _truthy(S.get("atc")):
		if _truthy(st.get("done")):
			next_step(L, c)
		return
	if typeof(S.get("check")) == TYPE_CALLABLE:
		S["check"].call(c, L, st)
	var all_in := true
	var lv: Dictionary = L["level"]
	var k := float(lv["k"])
	if typeof(S.get("tgt")) == TYPE_DICTIONARY:
		for key in (S["tgt"] as Dictionary).keys():
			var spec: Array = S["tgt"][key]
			var tv := float(spec[0].call(L, c)) if typeof(spec[0]) == TYPE_CALLABLE else float(spec[0])
			var fixed := spec.size() > 2 and String(spec[2]) == "fixed"
			var tol := float(_to_fixed(float(spec[1]) * (1.0 if fixed else k), int(DP.get(key, 0))))
			if tol == 0.0:
				tol = float(spec[1]) * k
			var d := tgt_dev(String(key), c, tv)
			var inside := absf(d) <= tol
			if not inside:
				all_in = false
			var grade_now: bool = bool(S.get("grade", false)) and (S.get("gradeWhen") == null or bool(S["gradeWhen"].call(c, L, st)))
			var stats: Dictionary = st["stats"]
			if not stats.has(key):
				stats[key] = {"n": 0.0, "inT": 0.0, "max": 0.0, "tol": tol, "tv": tv}
			var q: Dictionary = stats[key]
			q["tv"] = tv
			q["d"] = d
			q["tol"] = tol
			q["inside"] = inside
			if grade_now:
				q["n"] = float(q["n"]) + dt
				if inside:
					q["inT"] = float(q["inT"]) + dt
				q["max"] = maxf(float(q["max"]), absf(d))
	var holding: bool = all_in and (S.get("gradeWhen") == null or bool(S["gradeWhen"].call(c, L, st)))
	st["holdT"] = float(st["holdT"]) + dt if holding else 0.0
	st["holdBest"] = maxf(float(st["holdBest"]), float(st["holdT"]))
	L["hintT"] = float(L.get("hintT", 0.0)) - dt
	if float(L["hintT"]) <= 0.0:
		L["hintT"] = 1.2
		L["hint"] = instructor_hint(L, S, st, c) if bool(lv["hints"]) else ""
	var done := false
	var timeout := false
	var need := _js_round(float(S["hold"]) * float(lv["holdK"])) if _truthy(S.get("hold")) else 0
	st["need"] = need
	if _truthy(S.get("dur")) and float(st["t"]) >= float(S["dur"]):
		done = true
	if need != 0 and float(st["holdT"]) >= float(need):
		done = true
	if typeof(S.get("until")) == TYPE_CALLABLE and bool(S["until"].call(c, L, st)):
		done = true
	if _truthy(S.get("max")) and float(st["t"]) >= float(S["max"]) and not done:
		done = true
		timeout = true
	if done:
		finish_step(L, S, st, c, timeout)

static func instructor_hint(L: Dictionary, S: Dictionary, st: Dictionary, c: Dictionary) -> String:
	if typeof(S.get("tgt")) != TYPE_DICTIONARY:
		return String(S["hint"].call(c, L, st)) if typeof(S.get("hint")) == TYPE_CALLABLE and _truthy(S["hint"].call(c, L, st)) else ("" if typeof(S.get("hint")) != TYPE_CALLABLE else "")
	var worst_k = null
	var worst_r := 0.0
	var worst_d := 0.0
	for key in (st["stats"] as Dictionary).keys():
		var q: Dictionary = st["stats"][key]
		if q.get("d") == null:
			continue
		var r := absf(float(q["d"])) / float(q["tol"])
		if r > 0.6 and (worst_k == null or r > worst_r):
			worst_k = key
			worst_r = r
			worst_d = float(q["d"])
	if worst_k == null:
		if typeof(S.get("hint")) == TYPE_CALLABLE:
			var hv = S["hint"].call(c, L, st)
			return String(hv) if _truthy(hv) else "良い調子です。そのまま"
		return "良い調子です。そのまま"
	var k := String(worst_k)
	var d := worst_d
	var hi := d > 0.0
	var g = S.get("g") if typeof(S.get("g")) == TYPE_DICTIONARY else null
	var pitch_for_speed: bool = g != null and (_truthy(g.get("pwr")) or ["rate", "approach", "ils", "pattern", "slow", "glide", "climbFull", "oei"].has(String(g.get("how", ""))))
	var slow: bool = g != null and String(g.get("how", "")) == "slow"
	if k == "gp":
		return "進入が高い（PAPI の白が多い）：パワーを少し絞る" if d > 0.0 else "進入が低い（PAPI の赤が多い）：パワーを足す"
	if k == "cdi" or k == "loc":
		return "CDI の針が右：右へ修正（針の方へ）" if d > 0.0 else "CDI の針が左：左へ修正（針の方へ）"
	if k == "gs":
		return "グライドスロープより低い（菱形が上）：降下を浅く（パワー＋）" if d > 0.0 else "グライドスロープより高い（菱形が下）：降下率を増やす（パワー−）"
	match k:
		"alt":
			if slow:
				return "高度が %d ft 高い：パワーを少し絞る" % _js_round(d) if hi else "高度が %d ft 低い：パワーを足す（低速では高度はパワー）" % _js_round(-d)
			return "高度が %d ft 高い：機首を 1〜2° 下げる（W を軽く）" % _js_round(d) if hi else "高度が %d ft 低い：機首を 1〜2° 上げ（S を軽く）、速度が落ちるならパワーも" % _js_round(-d)
		"aglR":
			return "高い：パワーを絞って降下率を増やす" if hi else "低い：パワーを足して降下を浅く"
		"spd":
			if pitch_for_speed:
				return "速度が %d kt 速い：機首を 1〜2° 上げる%s" % [_js_round(d), "（出力はそのまま）" if _truthy(g.get("pwr")) else ""] if hi else "速度が %d kt 遅い：機首を 1〜2° 下げる%s" % [_js_round(-d), "（出力はそのまま）" if _truthy(g.get("pwr")) else ""]
			return "速度が %d kt 速い：パワーを少し絞る（F）" % _js_round(d) if hi else "速度が %d kt 遅い：パワーを少し足す（R）" % _js_round(-d)
		"hdg":
			return "針路が右に %d° ずれ：左へ修正（A）" % _js_round(d) if hi else "針路が左に %d° ずれ：右へ修正（D）" % _js_round(-d)
		"trk":
			return "航跡が右へずれている：左へ修正（風上へ少し向ける）" if hi else "航跡が左へずれている：右へ修正（風上へ少し向ける）"
		"rhdg":
			return "滑走路の方位より右：左へ" if hi else "滑走路の方位より左：右へ"
		"dwhdg":
			return "滑走路と平行に：左へ" if hi else "滑走路と平行に：右へ"
		"abank":
			return "バンクが深い：少し浅く" if hi else "バンクが浅い：もう少し傾ける"
		"bank":
			return "バンクが右に深い：左へ戻す" if hi else "バンクが左に深い：右へ戻す"
		"arate":
			return "旋回が速い：バンクを浅く" if hi else "旋回が遅い：バンクを少し深く"
		"vs":
			if g != null and _fin(g.get("fpm"), 0.0) < 0.0:
				return "降下が浅い：パワーを少し絞る" if hi else "降下が速すぎる：パワーを少し足す"
			return "上昇が速すぎる：パワーを少し絞る" if hi else "上昇が遅い：パワーを少し足す"
		"cl":
			return "センターラインの右：左へ（Q ラダー・A）" if hi else "センターラインの左：右へ（E ラダー・D）"
		"xtk":
			return "航路の右にずれている：左へ修正" if hi else "航路の左にずれている：右へ修正"
	return ""

static func finish_step(L: Dictionary, S: Dictionary, st: Dictionary, c, timeout: bool) -> void:
	var rows: Array = []
	if bool(S.get("grade", false)) and typeof(S.get("tgt")) == TYPE_DICTIONARY and _truthy(S.get("gradeFinal")):
		for key in (st["stats"] as Dictionary).keys():
			var q: Dictionary = st["stats"][key]
			var lab: Array = TGT_LABEL.get(key, [String(key), ""])
			var pass_ := absf(float(q["d"])) <= float(q["tol"])
			rows.append({"name": String(lab[0]) + "（終了時）", "val": "%s%s %s" % ["+" if float(q["d"]) >= 0.0 else "", _to_fixed(float(q["d"]), int(DP.get(key, 0))), String(lab[1])], "std": "±%s %s" % [_fmt_num(q["tol"]), String(lab[1])], "pass": pass_, "score": (1.0 - absf(float(q["d"])) / float(q["tol"]) * 0.3) if pass_ else 0.0})
	elif bool(S.get("grade", false)) and typeof(S.get("tgt")) == TYPE_DICTIONARY:
		for key in (st["stats"] as Dictionary).keys():
			var q2: Dictionary = st["stats"][key]
			if float(q2["n"]) < 0.5:
				continue
			var pct := float(q2["inT"]) / float(q2["n"])
			var lab2: Array = TGT_LABEL.get(key, [String(key), ""])
			var pass2: bool = pct >= 0.85 and float(q2["max"]) <= float(q2["tol"]) * 1.6
			rows.append({"name": String(lab2[0]), "val": "%d%% が基準内（最大のずれ %s %s）" % [_js_round(pct * 100.0), _to_fixed(float(q2["max"]), int(DP.get(key, 0))), String(lab2[1])], "std": "±%s %s" % [_fmt_num(q2["tol"]), String(lab2[1])], "pass": pass2, "score": pct})
	if _truthy(st.get("need")):
		rows.append({"name": "連続保持", "val": "最長 %s 秒" % _to_fixed(float(st["holdBest"]), 0), "std": "%d 秒続けて基準内" % int(st["need"]), "pass": float(st["holdBest"]) >= float(st["need"]) - 0.05, "score": _clamp(float(st["holdBest"]) / float(st["need"]), 0.0, 1.0)})
	if typeof(S.get("result")) == TYPE_CALLABLE:
		var rr = S["result"].call(L, st)
		if typeof(rr) == TYPE_ARRAY:
			rows.append_array(rr)
	if timeout and bool(S.get("grade", false)) and not _truthy(st.get("need")):
		rows.append({"name": "制限時間", "val": "時間切れ", "std": "%s 秒以内" % _fmt_num(S.get("max")), "pass": false})
	if _truthy(st.get("note")):
		rows.append({"name": "注意", "val": String(st["note"]), "std": "", "pass": false})
	if not rows.is_empty():
		(L["results"] as Array).append({"step": String(S["name"]), "rows": rows})
	if typeof(S.get("onEnd")) == TYPE_CALLABLE:
		S["onEnd"].call(L, c, st)
	if _truthy(S.get("stopOnFail")):
		for r in rows:
			if not bool(r["pass"]):
				end_lesson(L, false, String(S["stopOnFail"]))
				return
	next_step(L, c)

# the checklist and ATC dialogs
static func checklist_item(L: Dictionary):
	var K = L.get("check")
	if K == null:
		return null
	var items: Array = (checklists()[String(K["id"])] as Dictionary)["items"]
	return items[int(K["i"])] if int(K["i"]) < items.size() else null

static func checklist_text(it: Array, s: Dictionary) -> String:
	return String(it[1].call(s)) if typeof(it[1]) == TYPE_CALLABLE else String(it[1])

static func checklist_next(L: Dictionary) -> Dictionary:
	var K = L.get("check")
	if K == null or bool(L["done"]):
		return {"ok": false}
	var C: Dictionary = checklists()[String(K["id"])]
	var items: Array = C["items"]
	var it = items[int(K["i"])] if int(K["i"]) < items.size() else null
	if it != null and (it as Array).size() > 2 and typeof(it[2]) == TYPE_CALLABLE and not bool(it[2].call(L["s"])):
		L["hint"] = "%s：%s にしてから確認" % [String(it[0]), checklist_text(it, L["s"])]
		return {"ok": false, "item": String(it[0])}
	K["i"] = int(K["i"]) + 1
	if int(K["i"]) >= items.size():
		L["check"] = null
		(L["st"] as Dictionary)["done"] = true
		(L["results"] as Array).append({"step": String(C["title"]), "rows": [{"name": "チェックリスト", "val": "完了", "std": "全項目", "pass": true}]})
	return {"ok": true}

static func answer_atc(L: Dictionary, i: int):
	var q = L.get("atc")
	if q == null or bool(L["done"]):
		return null
	var ok := i == int(q["ok"])
	(L["results"] as Array).append({"step": "無線（復唱）", "rows": [{"name": "応答", "val": "正しい" if ok else "誤り（正解：%s）" % String((q["opts"] as Array)[int(q["ok"])]), "std": "正しく復唱", "pass": ok}]})
	L["atc"] = null
	L["atcResult"] = {"ok": ok, "why": String(q["why"]), "t": float(L["t"])}
	(L["st"] as Dictionary)["done"] = true
	return {"ok": ok, "why": String(q["why"]), "right": String((q["opts"] as Array)[int(q["ok"])])}

static func crashed(L: Dictionary, reason: String) -> void:
	if bool(L["done"]):
		return
	var c = L.get("last")
	var fail: Dictionary = L["fail"]
	var engine_out: bool = fail.has("engine") or fail.has("engL") or fail.has("engR")
	var gentle: bool = c != null and engine_out and float(c["vs"]) > -800.0 and float(c["kias"]) < _fin((L["V"] as Dictionary).get("glide"), 76.0) + 12.0 and absf(float(c["bank"])) < 20.0 and not reason.contains("湖")
	if gentle:
		(L["results"] as Array).append({"step": "不時着", "rows": [{"name": "結果", "val": "滑走路外へ不時着（機体は損傷・乗員は無事という想定）", "std": "安全に接地", "pass": true}]})
		end_lesson(L, true)
		return
	(L["results"] as Array).append({"step": "事故", "rows": [{"name": "結果", "val": reason, "std": "安全に飛行を終える", "pass": false}]})
	end_lesson(L, false, reason)

static func end_lesson(L: Dictionary, complete: bool, reason: String = "") -> void:
	if bool(L["done"]):
		return
	L["done"] = true
	L["reason"] = reason
	var all: Array = []
	for r in L["results"]:
		all.append_array(r["rows"])
	L["passed"] = complete and not all.is_empty() and all.all(func(r): return bool(r["pass"]))
	var scores: Array = []
	for r in all:
		if bool(r["pass"]):
			scores.append(0.7 + 0.3 * float(r["score"]) if r.get("score") != null else 1.0)
		else:
			scores.append(0.4 * _fin(r.get("score"), 0.0))
	var avg := 0.0
	if not scores.is_empty():
		var sum := 0.0
		for x in scores:
			sum += float(x)
		avg = sum / scores.size()
	L["score"] = avg
	L["grade"] = "―" if not complete else ("S" if avg > 0.97 else ("A" if avg > 0.92 else "B")) if bool(L["passed"]) else "C"
	var npass := 0
	for r in all:
		if bool(r["pass"]):
			npass += 1
	L["passPct"] = _js_round(float(npass) / float(all.size()) * 100.0) if not all.is_empty() else 0

static func abort(L: Dictionary, reason: String = "途中で終了") -> void:
	if not bool(L["done"]):
		(L["results"] as Array).append({"step": "中断", "rows": [{"name": "結果", "val": reason, "std": "", "pass": false}]})
		end_lesson(L, false, reason)

# ---------------------------------------------------------------- free flight (no lesson)
const FREE_STARTS := [
	{"id": "rwy", "name": "LAB RWY 36（滑走路上・停止）", "su": {"at": "runway"}},
	{"id": "pattern", "name": "場周経路のダウンウインド（1,000 ft AGL）", "su": {"at": "downwind"}},
	{"id": "final", "name": "最終進入 5 km（3° のパス上）", "su": {"at": "final", "km": 5}},
	{"id": "area", "name": "訓練空域 上空 3,000 ft", "su": {"at": "area"}},
	{"id": "ils", "name": "ILS 進入の開始点（2,000 ft）", "su": {"at": "ils", "nav": "ILS"}},
	{"id": "sfb", "name": "Sanford 上空 1,500 ft（Google 3D の確認用）", "su": {"at": "away", "from": "sfb", "n": -9000, "e": -2000, "altFt": 1500, "hdg": 360, "kt": 100}},
]

static func start_free(start_id: String = "rwy", aircraft: String = "pa28", opt: Dictionary = {}) -> Dictionary:
	var st_def: Dictionary = FREE_STARTS[0]
	for x in FREE_STARTS:
		if String(x["id"]) == start_id:
			st_def = x
			break
	var s := FP.newState({"aircraft": aircraft, "seed": int(opt["seed"]) if _truthy(opt.get("seed")) else 7})
	s["oatDev"] = float(opt["oatDev"]) if opt.get("oatDev") != null else 0.0
	(s["opts"] as Dictionary)["gainCap"] = float(opt["gainCap"]) if opt.get("gainCap") != null else 1.7
	(s["opts"] as Dictionary)["sens"] = String(opt["sens"]) if _truthy(opt.get("sens")) else "low"
	(s["opts"] as Dictionary)["autoRud"] = bool(opt.get("autoRud", false))
	(s["opts"] as Dictionary)["assist"] = bool(opt.get("assist", false))
	var W: Dictionary = opt["wind"] if typeof(opt.get("wind")) == TYPE_DICTIONARY else {"rel": 10, "kt": 5, "gust": 0.5}
	s["wind"] = {"fromDeg": _w360(float(FP.lab_rwy()["trueHdg"]) + float(W.get("rel", 0.0))), "kt": float(W.get("kt", 0.0)), "gust": float(W["gust"]) if W.get("gust") != null else 0.5}
	if W.get("topRel") != null and W.get("topKt") != null:
		s["wind"]["topFrom"] = _w360(float(FP.lab_rwy()["trueHdg"]) + float(W["topRel"]))
		s["wind"]["topKt"] = float(W["topKt"])
		s["wind"]["topFt"] = float(W["topFt"]) if _truthy(W.get("topFt")) else 3000.0
	var call := _call_of(s["A"])
	var L := {"id": "free", "free": true, "def": {"title": "自由飛行", "steps": []}, "level": LEVELS[0], "s": s, "av": AV.create_avionics(), "A": s["A"], "V": (s["A"] as Dictionary)["v"], "step": 0, "results": [], "t": 0.0, "fail": {}, "hood": false,
		"call": String(call["spoken"]), "callShort": String(call["short"]), "hist": {"alt": [], "ias": []}, "nextSample": 0.0, "done": false, "events": [], "evSeen": 0}
	FP.applyLoading(s, opt.get("loading"))
	if String(st_def["id"]) == "sfb":
		FP.placeInAir(s, -9000.0, -2000.0, 1500.0, float(AV.mag_to_true(360.0, FP.MAGVAR_W)), 100.0, 0.0, 0, null)
		L["alt0"] = 1500.0
		L["hdg0"] = 360.0
		(L["av"] as Dictionary)["baro"] = float(s["qnh"])
	else:
		place(L, st_def["su"])
	L["last"] = ctx(L)
	return L

static func free_update(L: Dictionary, dt: float) -> void:
	var c := ctx(L, dt)
	L["last"] = c
	L["t"] = float(L["t"]) + dt
	if float(L["t"]) >= float(L["nextSample"]):
		L["nextSample"] = float(L["t"]) + 2.0
		var hist: Dictionary = L["hist"]
		if (hist["alt"] as Array).size() < 1800:
			hist["alt"].append(_js_round(float(c["alt"])))
			hist["ias"].append(_js_round(float(c["kias"])))

# ---------------------------------------------------------------- the learning record (Dictionary store + JSON)
const STORE_KEY := "flightlab-records-v2"
const PROG_KEY := "flightlab-progress-v2"
const MAX_RECORDS := 300
const RECORD_NOTE := "本記録は教材シミュレータの練習記録です。正式な飛行日誌（logbook）ではなく、飛行時間として扱えません。"
const SECRET_PATS := ["AIza[0-9A-Za-z_\\-]{20,}", "sk-[A-Za-z0-9_\\-]{16,}", "ya29\\.[0-9A-Za-z_\\-]+", "(?i)(key|token|session)\\s*[=:]\\s*[^\\s&\"']{8,}"]

static func scrub(str_in, max_len: int = 2000) -> String:
	var t := str(str_in) if str_in != null else ""
	t = t.substr(0, max_len)
	for pat in SECRET_PATS:
		var re := RegEx.new()
		if re.compile(pat) == OK:
			t = re.sub(t, "[削除：キー・トークンらしき文字列]", true)
	return t

static func _is_num(v) -> bool:
	return (typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT) and is_finite(float(v))

static func _num_arr(a, max_len: int = 600) -> Array:
	var out: Array = []
	if typeof(a) == TYPE_ARRAY:
		for v in a:
			if _is_num(v):
				out.append(_js_round(float(v)))
			if out.size() >= max_len:
				break
	return out

static func downsample(a: Array, max_len: int = 300) -> Array:
	if a.size() <= max_len:
		return a.duplicate()
	var out: Array = []
	var k := float(a.size()) / float(max_len)
	for i in range(max_len):
		out.append(a[int(floorf(float(i) * k))])
	return out

const KEEP_EVENTS := ["touchdown", "hard_landing", "crash", "off_runway_touchdown", "tail_strike", "runway_excursion", "engine_stop"]

static func clean_event(e) -> Variant:
	if typeof(e) != TYPE_DICTIONARY or not KEEP_EVENTS.has(String(e.get("type", ""))):
		return null
	var o := {"t": _js_round(_fin(e.get("t"), 0.0)) if _is_num(e.get("t")) else 0, "type": String(e["type"])}
	for k in ["fpm", "kias", "along", "cross", "crab", "latV", "pitch", "bank"]:
		if _is_num(e.get(k)):
			o[k] = float(_js_round(float(e[k]) * 10.0)) / 10.0
	if typeof(e.get("onRunway")) == TYPE_BOOL:
		o["onRunway"] = bool(e["onRunway"])
	if _truthy(e.get("why")):
		o["why"] = scrub(e["why"], 120)
	return o

static func _iso_from_unix(sec: float) -> String:
	var d := Time.get_datetime_dict_from_unix_time(int(floor(sec)))
	var ms := int(floorf((sec - floorf(sec)) * 1000.0))
	return "%04d-%02d-%02dT%02d:%02d:%02d.%03dZ" % [int(d["year"]), int(d["month"]), int(d["day"]), int(d["hour"]), int(d["minute"]), int(d["second"]), ms]

static func _iso_now() -> String:
	return _iso_from_unix(Time.get_unix_time_from_system())

static func _parse_iso(s: String) -> String:
	# JS: isNaN(Date.parse(x)) -> epoch; else new Date(Date.parse(x)).toISOString()
	# Godot's parser returns 0 both for the epoch and for garbage; a garbage
	# string also lands on the epoch in JS, so the result is the same either way.
	# (The parser drops fractional seconds, so the milliseconds are re-read
	# from the string's fraction after the 'T'.)
	var unix := float(Time.get_unix_time_from_datetime_string(s))
	var tpos := s.find("T")
	if tpos >= 0:
		var dot := s.find(".", tpos)
		if dot >= 0:
			var digits := ""
			var i := dot + 1
			while i < s.length() and s[i] >= "0" and s[i] <= "9" and digits.length() < 3:
				digits += s[i]
				i += 1
			while digits.length() < 3:
				digits += "0"
			if not digits.is_empty():
				unix += float(digits) / 1000.0
	return _iso_from_unix(unix)

static func record_from_lesson(L: Dictionary, memo: String = "") -> Dictionary:
	var lesson_id := "free" if _truthy(L.get("free")) else String(L["id"])
	var steps_arr: Array = []
	for r in (L.get("results", []) as Array).slice(0, 40):
		var rows_arr: Array = []
		for x in (r["rows"] as Array).slice(0, 8):
			rows_arr.append({"name": x["name"], "val": x["val"], "std": x["std"], "pass": bool(x["pass"])})
		var allpass := true
		for x in r["rows"]:
			if not bool(x["pass"]):
				allpass = false
		steps_arr.append({"step": r["step"], "pass": allpass, "rows": rows_arr})
	var hist: Dictionary = L["hist"]
	var raw := {
		"v": 2, "id": "r" + str(Time.get_ticks_msec()) + str(randi() % 1000000), "lessonId": lesson_id, "level": String((L["level"] as Dictionary)["id"]), "aircraft": String((L["A"] as Dictionary)["id"]), "datetime": _iso_now(),
		"result": "free" if _truthy(L.get("free")) else ("abort" if not bool(L["done"]) else ("pass" if bool(L.get("passed", false)) else ("abort" if _truthy(L.get("reason")) else "fail"))), "grade": String(L.get("grade", "")), "reason": String(L.get("reason", "")),
		"passPct": int(L.get("passPct", 0)), "practiceSec": _js_round(float(L["t"])),
		"steps": steps_arr,
		"sampleSec": 2 * maxi(1, int(ceil(float((hist["alt"] as Array).size()) / 300.0))), "altHist": downsample(hist["alt"]), "spdHist": downsample(hist["ias"]),
		"events": ((L["s"] as Dictionary).get("events", []) as Array).slice(0, 60), "td": (L["s"] as Dictionary).get("td"), "memo": memo, "note": RECORD_NOTE,
	}
	return sanitize_record(raw)

static func lesson_title(id: String) -> String:
	if id == "free":
		return "自由飛行"
	var l := lesson(id)
	return String(l["title"]) if not l.is_empty() and l.get("title") != null else ""

static func _txt(v, n: int) -> String:
	return scrub(v, n)

static func sanitize_record(r) -> Variant:
	if typeof(r) != TYPE_DICTIONARY:
		return null
	var lid := String(r.get("lessonId", ""))
	if lid != "free" and lesson(lid).is_empty():
		return null
	var steps_arr: Array = []
	if typeof(r.get("steps")) == TYPE_ARRAY:
		for S in (r["steps"] as Array).slice(0, 40):
			if typeof(S) != TYPE_DICTIONARY:
				continue
			var rows_arr: Array = []
			if typeof(S.get("rows")) == TYPE_ARRAY:
				for x in (S["rows"] as Array).slice(0, 8):
					var xd: Dictionary = x if typeof(x) == TYPE_DICTIONARY else {}
					rows_arr.append({"name": _txt(xd.get("name"), 60), "val": _txt(xd.get("val"), 120), "std": _txt(xd.get("std"), 60), "pass": bool(xd.get("pass", false))})
			steps_arr.append({"step": _txt(S.get("step"), 80), "pass": bool(S.get("pass", false)), "rows": rows_arr})
	var id_clean := _txt(r.get("id"), 40)
	var re_bad := RegEx.new()
	re_bad.compile("[^A-Za-z0-9_\\-]")
	id_clean = re_bad.sub(id_clean, "", true)
	if id_clean.is_empty():
		id_clean = "r" + str(randi() % 100000000)
	var lv := level(r.get("level"))
	var events_arr: Array = []
	if typeof(r.get("events")) == TYPE_ARRAY:
		for e in (r["events"] as Array).slice(0, 60):
			var ce = clean_event(e)
			if ce != null:
				events_arr.append(ce)
	var td_out = null
	if typeof(r.get("td")) == TYPE_DICTIONARY:
		var td2: Dictionary = (r["td"] as Dictionary).duplicate()
		td2["type"] = "touchdown"
		td_out = clean_event(td2)
	return {
		"v": 2, "id": id_clean,
		"lessonId": lid, "lessonTitle": lesson_title(lid), "level": String(lv["id"]), "levelName": String(lv["name"]), "aircraft": str(r.get("aircraft")) if ["pa28", "pa44", "pa28r"].has(String(r.get("aircraft", ""))) else "pa28",
		"datetime": _parse_iso(String(r.get("datetime", ""))),
		"result": str(r.get("result")) if ["pass", "fail", "abort", "free"].has(String(r.get("result", ""))) else "abort", "grade": str(r.get("grade")) if ["S", "A", "B", "C", "―", ""].has(str(r.get("grade"))) else "", "reason": _txt(r.get("reason"), 300),
		"passPct": int(_clamp(float(_js_round(_fin(r.get("passPct"), 0.0))), 0.0, 100.0)) if _is_num(r.get("passPct")) else 0, "practiceSec": maxi(0, _js_round(_fin(r.get("practiceSec"), 0.0))) if _is_num(r.get("practiceSec")) else 0,
		"steps": steps_arr, "sampleSec": _clamp(float(r.get("sampleSec")), 1.0, 60.0) if _is_num(r.get("sampleSec")) else 2, "altHist": _num_arr(r.get("altHist"), 300), "spdHist": _num_arr(r.get("spdHist"), 300),
		"events": events_arr, "td": td_out,
		"memo": _txt(r.get("memo"), 2000), "note": RECORD_NOTE,
	}

static func _re_match(pat: String, s: String) -> bool:
	var re := RegEx.new()
	return re.compile(pat) == OK and re.search(s) != null

static func sanitize_progress(p) -> Dictionary:
	var out := {"lessons": {}, "time": 0.0, "landings": 0, "read": [], "quiz": {}, "bookQuiz": {}, "atc": {}, "kisoRead": [], "kisoQa": []}
	if typeof(p) != TYPE_DICTIONARY:
		return out
	if typeof(p.get("lessons")) == TYPE_DICTIONARY:
		for k in (p["lessons"] as Dictionary).keys():
			var v = p["lessons"][k]
			if not _re_match("^[a-z0-9_]{1,12}$", String(k)) or typeof(v) != TYPE_DICTIONARY:
				continue
			var levels_arr: Array = []
			if typeof(v.get("levels")) == TYPE_ARRAY:
				for x in v["levels"]:
					for l in LEVELS:
						if String(l["id"]) == String(x):
							levels_arr.append(String(x))
							break
				levels_arr = levels_arr.slice(0, 3)
			out["lessons"][k] = {"tries": int(_clamp(float(_js_round(_fin(v.get("tries"), 0.0))), 0.0, 99999.0)) if _is_num(v.get("tries")) else 0, "best": String(v["best"]) if ["S", "A", "B", "C", "―"].has(String(v.get("best", ""))) else "", "pass": bool(v.get("pass", false)), "score": int(_clamp(float(_js_round(_fin(v.get("score"), 0.0))), 0.0, 100.0)) if _is_num(v.get("score")) else 0, "levels": levels_arr}
	if _is_num(p.get("time")):
		out["time"] = _clamp(float(p["time"]), 0.0, 1e8)
	if _is_num(p.get("landings")):
		out["landings"] = int(_clamp(float(_js_round(float(p["landings"]))), 0.0, 1e6))
	if typeof(p.get("read")) == TYPE_ARRAY:
		var seen := {}
		var rd: Array = []
		for x in p["read"]:
			if typeof(x) == TYPE_STRING and _re_match("^[a-z0-9_.\\-]{1,40}$", String(x)) and not seen.has(x):
				seen[x] = true
				rd.append(x)
		out["read"] = rd.slice(0, 500)
	for key in ["quiz", "bookQuiz"]:
		if typeof(p.get(key)) == TYPE_DICTIONARY:
			for k in (p[key] as Dictionary).keys():
				var v2 = p[key][k]
				if _re_match("^[a-z0-9_.\\-]{1,40}$", String(k)) and _is_num(v2):
					out[key][k] = int(_clamp(float(_js_round(float(v2))), 0.0, 100.0))
	if typeof(p.get("atc")) == TYPE_DICTIONARY:
		for k in (p["atc"] as Dictionary).keys():
			if _re_match("^[a-z0-9_]{1,20}$", String(k)):
				out["atc"][k] = bool(p["atc"][k]) if typeof(p["atc"][k]) == TYPE_BOOL and bool(p["atc"][k]) else false
	for key in ["kisoRead", "kisoQa"]:
		if typeof(p.get(key)) == TYPE_ARRAY:
			var seen2 := {}
			var arr2: Array = []
			for x in p[key]:
				if typeof(x) == TYPE_STRING and _re_match("^kiso[a-z0-9_.\\-]{1,36}$", String(x)) and not seen2.has(x):
					seen2[x] = true
					arr2.append(x)
			out[key] = arr2.slice(0, 1000)
	return out

static func note_lesson(prog: Dictionary, L: Dictionary) -> Dictionary:
	if L == null or _truthy(L.get("free")) or not bool(L.get("done", false)):
		return prog
	var lessons_d: Dictionary = prog["lessons"]
	var rec: Dictionary = lessons_d[L["id"]] if typeof(lessons_d.get(L["id"])) == TYPE_DICTIONARY else {"tries": 0, "best": "", "pass": false, "score": 0, "levels": []}
	rec["tries"] = int(rec["tries"]) + 1
	if bool(L.get("passed", false)):
		rec["pass"] = true
		if not (rec["levels"] as Array).has(String((L["level"] as Dictionary)["id"])):
			rec["levels"].append(String((L["level"] as Dictionary)["id"]))
	var rank := {"S": 4, "A": 3, "B": 2, "C": 1, "―": 0, "": -1}
	var lg := String(L.get("grade", ""))
	var rb := String(rec.get("best", ""))
	if int(rank.get(lg, -1)) > int(rank.get(rb, -1)):
		rec["best"] = lg
	if _is_num(L.get("score")):
		rec["score"] = maxi(int(rec.get("score", 0)), int(_clamp(float(_js_round(float(L["score"]) * 100.0)), 0.0, 100.0)))
	lessons_d[L["id"]] = rec
	return prog

static func load_records(store: Dictionary) -> Array:
	var raw = store.get(STORE_KEY)
	if typeof(raw) != TYPE_STRING:
		return []
	var parsed = JSON.parse_string(raw)
	if typeof(parsed) != TYPE_ARRAY:
		return []
	var out: Array = []
	for r in parsed:
		var sr = sanitize_record(r)
		if sr != null:
			out.append(sr)
	return out

static func save_records(store: Dictionary, recs: Array) -> bool:
	var clean: Array = []
	for r in recs:
		var sr = sanitize_record(r)
		if sr != null:
			clean.append(sr)
	store[STORE_KEY] = JSON.stringify(clean.slice(maxi(0, clean.size() - MAX_RECORDS)))
	return true

static func add_record(store: Dictionary, rec) -> Variant:
	var a := load_records(store)
	var r = sanitize_record(rec)
	if r != null:
		a.append(r)
	save_records(store, a)
	return r

static func delete_record(store: Dictionary, id: String) -> void:
	var kept: Array = []
	for r in load_records(store):
		if String(r["id"]) != id:
			kept.append(r)
	save_records(store, kept)

static func load_progress(store: Dictionary) -> Dictionary:
	var raw = store.get(PROG_KEY)
	if typeof(raw) != TYPE_STRING:
		return sanitize_progress({})
	return sanitize_progress(JSON.parse_string(raw))

static func save_progress(store: Dictionary, p) -> bool:
	store[PROG_KEY] = JSON.stringify(sanitize_progress(p))
	return true

static func export_json(records, prog) -> String:
	var clean: Array = []
	if typeof(records) == TYPE_ARRAY:
		for r in records:
			var sr = sanitize_record(r)
			if sr != null:
				clean.append(sr)
	return JSON.stringify({"app": "FLIGHT LAB", "kind": "learning-record", "version": 2, "exported": _iso_now(), "note": RECORD_NOTE, "records": clean, "progress": sanitize_progress(prog)}, " ")

static func import_json(text: String) -> Variant:
	var j = JSON.parse_string(text)
	if typeof(j) != TYPE_DICTIONARY:
		push_error("JSON として読めません")
		return null
	if String(j.get("app", "")) != "FLIGHT LAB" or String(j.get("kind", "")) != "learning-record":
		push_error("FLIGHT LAB の学習記録ファイルではありません")
		return null
	var recs: Array = []
	if typeof(j.get("records")) == TYPE_ARRAY:
		for r in j["records"]:
			var sr = sanitize_record(r)
			if sr != null:
				recs.append(sr)
	return {"records": recs, "progress": sanitize_progress(j.get("progress"))}

static func merge_records(a: Array, b: Array) -> Array:
	var m := {}
	var order: Array = []
	for r in a + b:
		if r == null:
			continue
		if not m.has(r["id"]):
			order.append(r["id"])
		m[r["id"]] = r
	var vals: Array = []
	for id in order:
		vals.append(m[id])
	vals.sort_custom(func(x, y): return String(x["datetime"]) < String(y["datetime"]))
	return vals.slice(maxi(0, vals.size() - MAX_RECORDS))

static func merge_progress(a, b) -> Dictionary:
	var A := sanitize_progress(a)
	var B := sanitize_progress(b)
	var rank := {"S": 4, "A": 3, "B": 2, "C": 1, "―": 0, "": -1}
	var lessons_d: Dictionary = (A["lessons"] as Dictionary).duplicate()
	for k in (B["lessons"] as Dictionary).keys():
		var v: Dictionary = B["lessons"][k]
		if lessons_d.has(k):
			var x: Dictionary = lessons_d[k]
			var lv: Array = []
			for e in (x["levels"] as Array) + (v["levels"] as Array):
				if not lv.has(e):
					lv.append(e)
			lessons_d[k] = {"tries": maxi(int(x["tries"]), int(v["tries"])), "best": String(v["best"]) if int(rank.get(String(v["best"]), -1)) > int(rank.get(String(x["best"]), -1)) else String(x["best"]), "pass": bool(x["pass"]) or bool(v["pass"]), "score": maxi(int(x.get("score", 0)), int(v.get("score", 0))), "levels": lv}
		else:
			lessons_d[k] = v
	var max_map = func(p: Dictionary, q: Dictionary) -> Dictionary:
		var o: Dictionary = p.duplicate()
		for k in q.keys():
			o[k] = maxf(float(o.get(k, 0)), float(q[k]))
			if typeof(o[k]) == TYPE_FLOAT and float(o[k]) == floorf(float(o[k])):
				o[k] = int(o[k])
		return o
	var atc_m: Dictionary = (A["atc"] as Dictionary).duplicate()
	for k in (B["atc"] as Dictionary).keys():
		atc_m[k] = B["atc"][k]
	return sanitize_progress({"lessons": lessons_d, "time": maxf(float(A["time"]), float(B["time"])), "landings": maxi(int(A["landings"]), int(B["landings"])), "read": (A["read"] as Array) + (B["read"] as Array), "quiz": max_map.call(A["quiz"], B["quiz"]), "bookQuiz": max_map.call(A["bookQuiz"], B["bookQuiz"]), "atc": atc_m, "kisoRead": (A["kisoRead"] as Array) + (B["kisoRead"] as Array), "kisoQa": (A["kisoQa"] as Array) + (B["kisoQa"] as Array)})

# JS-name aliases (the original FL.school surface)
static func startLesson(id: String, level_id: String = "intro", opt: Dictionary = {}) -> Dictionary:
	return start_lesson(id, level_id, opt)

static func startFree(start_id: String = "rwy", aircraft: String = "pa28", opt: Dictionary = {}) -> Dictionary:
	return start_free(start_id, aircraft, opt)

static func freeUpdate(L: Dictionary, dt: float) -> void:
	free_update(L, dt)

static func nextStep(L: Dictionary, c) -> void:
	next_step(L, c)

static func checklistNext(L: Dictionary) -> Dictionary:
	return checklist_next(L)

static func checklistItem(L: Dictionary):
	return checklist_item(L)

static func checklistText(it: Array, s: Dictionary) -> String:
	return checklist_text(it, s)

static func answerAtc(L: Dictionary, i: int):
	return answer_atc(L, i)

static func endLesson(L: Dictionary, complete: bool, reason: String = "") -> void:
	end_lesson(L, complete, reason)

static func failNow(L: Dictionary, kind: String) -> void:
	fail_now(L, kind)

static func stepGuide(S, L) -> String:
	return step_guide(S, L)

static func guideText(s: Dictionary, o: Dictionary, L) -> String:
	return guide_text(s, o, L)

static func fillText(str_in: String, L: Dictionary) -> String:
	return fill_text(str_in, L)

static func lessonOrder() -> Array:
	return lesson_order()

static func stageOf(id: String) -> Dictionary:
	return stage_of(id)

static func recordFromLesson(L: Dictionary, memo: String = "") -> Dictionary:
	return record_from_lesson(L, memo)

static func sanitizeRecord(r) -> Variant:
	return sanitize_record(r)

static func sanitizeProgress(p) -> Dictionary:
	return sanitize_progress(p)

static func noteLesson(prog: Dictionary, L: Dictionary) -> Dictionary:
	return note_lesson(prog, L)

static func loadRecords(store: Dictionary) -> Array:
	return load_records(store)

static func saveRecords(store: Dictionary, recs: Array) -> bool:
	return save_records(store, recs)

static func addRecord(store: Dictionary, rec) -> Variant:
	return add_record(store, rec)

static func deleteRecord(store: Dictionary, id: String) -> void:
	delete_record(store, id)

static func loadProgress(store: Dictionary) -> Dictionary:
	return load_progress(store)

static func saveProgress(store: Dictionary, p) -> bool:
	return save_progress(store, p)

static func exportJSON(records, prog) -> String:
	return export_json(records, prog)

static func importJSON(text: String) -> Variant:
	return import_json(text)

static func mergeRecords(a: Array, b: Array) -> Array:
	return merge_records(a, b)

static func mergeProgress(a, b) -> Dictionary:
	return merge_progress(a, b)
