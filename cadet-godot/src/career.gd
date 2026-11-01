class_name CadetCareer
extends RefCounted
# Port of cadet/src/career/career.js (HTML CADET @ 898fe8a) — the cadet's career:
# calendar, weather, chapters, gates, schedule, growth system, save cleaning.
# Pure logic: state is a plain Dictionary (the JS object). The createCareer() closure
# lives in career_instance.gd (CadetCareerInstance). Dates use a civil-date algorithm
# (Howard Hinnant) in place of JS Date.UTC; regexes use Godot's RegEx (PCRE2).

const CAREER_KEY := "cadet.career"
const CAREER_VERSION := 2
const ABILITIES := ["hand", "know", "comm", "judge"]
const ABILITY_NAMES := { "hand": "操縦", "know": "知識", "comm": "交信", "judge": "判断" }
const ABILITY_START := { "hand": 10.0, "know": 5.0, "comm": 5.0, "judge": 10.0 }
const SOLO_JUDGE := 30
const MISS_LABELS := ["停止線の手前で止まること", "ランナップで制限を超えたときの判断", "タキシーの速さと周りを見ること", "外部点検の外し忘れ", "無線の復唱",
	"高度を基準に保つこと", "速度を基準に保つこと", "着陸のフレア", "場周経路の形", "外部点検で見落とした異常"]
const START_DATE := "2027-04-01"
const SLOTS := ["morning", "am", "pm", "evening"]
const SLOT_NAMES := { "morning": "朝", "am": "午前", "pm": "午後", "evening": "夜" }
const SLOT_HOURS := { "morning": 7.7, "am": 9.6, "pm": 14.0, "evening": 18.6 }
const CHAPTERS := {
	"prologue": { "n": 0, "title": "序章　入社", "short": "序章" },
	"ch1": { "n": 1, "title": "第 1 章　座学", "short": "第 1 章" },
	"ch2": { "n": 2, "title": "第 2 章　ソロまで", "short": "第 2 章" },
	"ch3": { "n": 3, "title": "第 3 章　航法", "short": "第 3 章", "sub": "横風・短い滑走路・VOR・推測航法、そして単独の野外飛行" },
	"ch4": { "n": 4, "title": "第 4 章　計器", "short": "第 4 章", "sub": "フードをかぶって、計器だけで飛ぶ。最後は雲の中の ILS 進入" },
	"ch5": { "n": 5, "title": "第 5 章　双発", "short": "第 5 章", "sub": "Piper Seminole。エンジンが 2 つ、止まるのも片方" },
	"ch6": { "n": 6, "title": "第 6 章　最終審査", "short": "第 6 章", "sub": "TEM、そして審査官の同乗する Check Flight" },
	"ch7": { "n": 7, "title": "第 7 章　複雑機エンドースメント（卒業後）", "short": "複雑機", "sub": "引込脚と定速プロペラの Arrow、そして教える側の試作" },
}
const LATER := ["ch3", "ch4", "ch5", "ch6"]
const STAGE := {
	"ch3": { "lessons": ["x3", "x1", "x2", "n1", "n2", "n3"], "exam": "nav", "check": "xc", "aircraft": "pa28" },
	"ch4": { "lessons": ["i1", "i2", "i3", "i8", "i4", "i5", "i6", "i7"], "exam": "instr", "check": "ir", "aircraft": "pa28" },
	"ch5": { "lessons": ["m1", "m2", "m3", "m4", "e6", "m5"], "exam": "multi", "check": "me", "aircraft": "pa44" },
	"ch6": { "lessons": ["r1"], "exam": "final", "check": "final", "aircraft": "pa28" },
	"ch7": { "lessons": ["cx1", "cx2", "cx3", "cf1"], "exam": "complex", "check": "cx", "aircraft": "pa28r" },
}
const CHECKS := {
	"xc": { "kind": "xc", "title": "単独の野外飛行", "short": "ソロ クロスカントリー", "lessons": ["t1", "n2", "t3"], "who": null, "ch": "ch3" },
	"ir": { "kind": "checkride", "title": "計器飛行の審査", "short": "計器の審査", "lessons": ["t1", "i3", "i5", "t3"], "who": "chief", "ch": "ch4" },
	"me": { "kind": "checkride", "title": "双発の審査", "short": "双発の審査", "lessons": ["m4", "m2", "m5"], "who": "chief", "ch": "ch5" },
	"final": { "kind": "checkride", "title": "最終審査（Check Flight）", "short": "最終審査", "lessons": ["m1", "m2", "m5"], "who": "examiner", "ch": "ch6" },
	"cx": { "kind": "checkride", "title": "複雑機エンドースメント審査", "short": "複雑機の審査", "lessons": ["cx1", "cx3", "cx2"], "who": "chief", "ch": "ch7" },
}
const GROUND := ["k1", "k2", "k3", "k4", "k5", "k6"]
const CH2 := ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "t2", "t4", "e1", "e2", "e3", "e4", "t1", "t3"]
const ALL_CH2 := ["a1", "a2", "a3", "a4", "a5", "a6", "a7", "a8", "t2", "t4", "e1", "e2", "e3", "e4", "t1", "t3", "c1"]
const CLASSES := [["aero"], ["sys", "perf"], ["radio1", "radio2"], ["radio3", "radio4"], ["wx", "radio5"], ["law", "hf"]]
const CLASSES_BEFORE := [["aero"], ["sys", "perf"], ["wx"], ["law", "hf"], ["radio1", "radio2"], ["radio3", "radio4", "radio5"]]
const CLASS_FTD := ["k1", "k2", "k3", "k4", "k5", "k6"]
const FTD_TITLES := { "k1": "G1000 型 PFD の読み方", "k2": "PFD の読み取り（10 問）", "k3": "数字とアルファベットの言い方（10 問）", "k4": "交信のチェアフライト", "k5": "復唱と応答（10 問）", "k6": "聞き取り（10 問）" }
const CHAPTER_SHORT := { "aero": "飛行の原理", "sys": "機体と装備", "perf": "性能と重量・重心", "radio1": "交信のしくみ", "radio2": "言葉の決まり", "radio3": "交信の型",
	"radio4": "1 回の飛行の交信", "wx": "航空気象", "radio5": "管制塔のない空港と緊急", "law": "規則と空域", "hf": "人間の能力と判断" }
const CHAPTER_N := { "aero": 1, "sys": 2, "perf": 3, "wx": 4, "law": 5, "radio1": 6, "radio2": 7, "radio3": 8, "radio4": 9, "radio5": 10, "hf": 11 }
const CH1_EVENTS := [
	{ "id": "forces", "cls": 0, "who": "mechanic", "where": "outside", "title": "駐機場の大城さんと、実機で 4 つの力を見る" },
	{ "id": "pitot", "cls": 1, "who": "mechanic", "where": "outside", "title": "駐機場の大城さんと、Archer のピトー管と燃料のサンプを見る" },
	{ "id": "spell", "cls": 2, "who": "dispatcher", "where": "dispatch", "title": "運航管理の佐伯さんと、登録記号と周波数を声に出す" },
	{ "id": "readback", "cls": 3, "who": "kiryu", "where": "lounge", "title": "ラウンジで、桐生の管制官役に復唱する" },
	{ "id": "metar", "cls": 4, "who": "dispatcher", "where": "dispatch", "title": "運航管理の佐伯さんと、今朝の METAR を読んで、今日の判断を聞く" },
	{ "id": "imsafe", "cls": 5, "who": "chief", "where": "instructors", "title": "教官室の真壁 主任教官と、IMSAFE を確かめる" },
	{ "id": "week", "cls": -1, "who": "asahi", "where": "lounge", "title": "ラウンジの朝日と、今週の復習（しなくてもよい）", "optional": true },
]
const EXAMS := {
	"written1": { "title": "学科試験（第 1 章）", "banks": ["q_aero", "q_sys", "q_perf", "q_wx", "q_law", "q_comm", "q_hf"], "n": 30, "pass": 80, "room": "planning" },
	"presolo": { "title": "ソロ前の筆記試験", "banks": ["q_ops", "q_emg", "q_law"], "n": 30, "pass": 80, "room": "planning" },
	"nav": { "title": "航法の筆記試験", "banks": ["q_nav", "q_wx"], "n": 30, "pass": 80, "room": "planning", "ok": "合格です。航法ログを作って、ひとりで遠くまで飛ぶ準備ができました。" },
	"instr": { "title": "計器飛行の筆記試験", "banks": ["q_ifr", "q_hf"], "n": 30, "pass": 80, "room": "planning", "ok": "合格です。計器の審査に進めます。" },
	"multi": { "title": "双発の筆記試験", "banks": ["q_me", "q_emg"], "n": 30, "pass": 80, "room": "planning", "ok": "合格です。双発の審査に進めます。" },
	"final": { "title": "最終の筆記試験", "banks": ["q_crm", "q_law", "q_ops", "q_radio"], "n": 30, "pass": 80, "room": "planning", "ok": "合格です。残るは、最終審査の Check Flight だけです。" },
	"complex": { "title": "複雑機エンドースメントの筆記試験", "banks": ["q_ops", "q_me", "q_sys"], "n": 30, "pass": 80, "room": "planning", "ok": "合格です。複雑機の審査に進めます。" },
}
const SOLO_TRUST := 60
const COUNTS := ["basic", "precision"]
const PACE_IDS := ["need", "full", "quick"]
const NAV_ALT_FT := 3000
const PROLOGUE_FLAGS := { "welcome_done": "ceremony:welcome", "tour_done": "tour:tour", "met_instructor": "brief:meet" }
# the sections of each class (filled by content in the JS build; here a settable static, default empty)
static var CLASS_SECTIONS: Array = [[], [], [], [], [], []]

# ---- small helpers (JS semantics)
static func _is_obj(o) -> bool:
	return typeof(o) == TYPE_DICTIONARY
static func _clamp(x: float, a: float, b: float) -> float:
	return minf(b, maxf(a, x))
static func _clampi(x: int, a: int, b: int) -> int:
	return mini(b, maxi(a, x))
static func _pad2(n: int) -> String:
	var s = str(n)
	while s.length() < 2:
		s = "0" + s
	return s
static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))
static func _is_int_num(x) -> bool:
	if typeof(x) == TYPE_INT:
		return true
	if typeof(x) == TYPE_FLOAT:
		return x == floorf(x)
	return false
static func _num(x) -> float:
	if typeof(x) == TYPE_INT or typeof(x) == TYPE_FLOAT:
		return float(x)
	return 0.0

static var _re_cache := {}
static func _re_match(pattern: String, s: String) -> bool:
	if not _re_cache.has(pattern):
		var re = RegEx.new()
		re.compile(pattern)
		_re_cache[pattern] = re
	return _re_cache[pattern].search(s) != null
static func _re_search(pattern: String, s: String) -> RegExMatch:
	if not _re_cache.has(pattern):
		var re = RegEx.new()
		re.compile(pattern)
		_re_cache[pattern] = re
	return _re_cache[pattern].search(s)

const _MISS_KEY := "^[a-z][a-z0-9:_-]{0,31}$"
const _SEC_ID := "^[a-z0-9]{1,12}\\.[a-z0-9]{1,16}$"
const _Q_ID := "^[a-z0-9_]{1,12}[#:][a-z0-9_.]{1,24}$"
const _ATTEMPT_ID := "^[a-z0-9]{1,12}:[a-z0-9_]{1,16}$"

# Math.imul emulation (16-bit split), identical to physics.gd's
static func _imul(a: int, b: int) -> int:
	var a_lo = a & 0xFFFF
	var a_hi = (a >> 16) & 0xFFFF
	var b_lo = b & 0xFFFF
	var b_hi = (b >> 16) & 0xFFFF
	var mid = (a_hi * b_lo + a_lo * b_hi) & 0xFFFF
	return (a_lo * b_lo + (mid << 16)) & 0xFFFFFFFF

# the mulberry-style rng of career.js (and the game's other seeded draws)
class Rng:
	extends RefCounted
	var s: int
	func _init(seed: int) -> void:
		s = seed & 0xFFFFFFFF
	func next() -> float:
		s = (s + 0x6D2B79F5) & 0xFFFFFFFF
		var t = s
		t = CadetCareer._imul(t ^ ((t >> 15) & 0xFFFFFFFF), t | 1)
		t = (t ^ ((t + CadetCareer._imul(t ^ ((t >> 7) & 0xFFFFFFFF), t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
		return float((t ^ ((t >> 14) & 0xFFFFFFFF)) & 0xFFFFFFFF) / 4294967296.0

static func trust_band(v: float) -> String:
	return "深い信頼" if v >= 80.0 else "信頼されている" if v >= 60.0 else "通常" if v >= 40.0 else "まだ距離がある"

static func graduation_rank(state, prog) -> Dictionary:
	var a = ABILITY_START
	if _is_obj(state) and _is_obj(state.get("abilities")):
		a = state["abilities"]
	var total = float(a.get("hand", 0)) * 0.35 + float(a.get("know", 0)) * 0.25 + float(a.get("comm", 0)) * 0.15 + float(a.get("judge", 0)) * 0.25
	var ft = { "pass": 0, "total": 0 }
	if _is_obj(state) and _is_obj(state.get("firstTry")):
		ft = state["firstTry"]
	var rate = float(ft.get("pass", 0)) / float(ft.get("total", 0)) if int(ft.get("total", 0)) != 0 else 0.0
	var exam_tries = 0
	if _is_obj(state) and _is_obj(state.get("exams")):
		for e in state["exams"].values():
			if _is_obj(e):
				exam_tries += int(e.get("tries", 0))
	var scores: Array = []
	if _is_obj(prog) and _is_obj(prog.get("lessons")):
		for r in prog["lessons"].values():
			var sc = 0.0
			if _is_obj(r):
				sc = _num(r.get("score"))
			if sc > 0.0:
				scores.append(sc)
	var avg_score = 0
	if not scores.is_empty():
		var sm = 0.0
		for x in scores:
			sm += x
		avg_score = _js_round(sm / scores.size())
	var rank = "優等" if total >= 68.0 and rate >= 0.88 and exam_tries <= 6 else "優秀" if total >= 62.0 and rate >= 0.6 else "通常"
	return { "rank": rank, "total": floorf(total * 10.0 + 0.5) / 10.0, "firstRate": _js_round(rate * 100.0), "examTries": exam_tries, "avgScore": avg_score }

static func lesson_growth(grade: String, level_id: String, lesson_id: String, tired: bool = false) -> Array:
	var base = { "S": 5.0, "A": 4.0, "B": 3.0, "C": 1.5 }.get(grade, 0.0)
	if base == 0.0:
		return []
	var w = base * (1.3 if level_id == "precision" else 0.5 if level_id == "intro" else 1.0)
	var kind = lesson_id.substr(0, 1) if not lesson_id.is_empty() else ""
	var sub = "know" if kind == "i" else "judge" if kind == "n" or kind == "x" or kind == "e" else "hand"
	var out: Array = [["hand", w], ["comm", 0.6]]
	if sub == "hand":
		out[0][1] = float(out[0][1]) + w * 0.35
	else:
		out.append([sub, w * 0.35])
	if tired:
		var f: Array = []
		for pair in out:
			if pair[0] != "judge":
				f.append([pair[0], float(pair[1]) * 0.5])
		return f
	return out

static func ftd_growth(id: String) -> Array:
	return [["comm", 2.4], ["hand", 0.6]] if id == "k3" or id == "k4" or id == "k5" or id == "k6" else [["know", 1.6], ["hand", 0.6]]

static func class_growth(pace: String) -> Array:
	return [["know", 6.0 * (0.7 if pace == "need" else 0.45 if pace == "quick" else 1.0)]]

static func judge_of(state) -> float:
	if _is_obj(state) and _is_obj(state.get("abilities")) and (typeof(state["abilities"].get("judge")) == TYPE_INT or typeof(state["abilities"].get("judge")) == TYPE_FLOAT):
		return float(state["abilities"]["judge"])
	return ABILITY_START["judge"]

static func miss_ask(state):
	var m = state.get("miss") if _is_obj(state) else null
	if not _is_obj(m) or typeof(m.get("label")) != TYPE_STRING or String(m["label"]).is_empty():
		return null
	var label = String(m["label"])
	var pool: Array = []
	for x in MISS_LABELS:
		if x != label:
			pool.append(x)
	var i = ((int(m["day"]) * 7 + label.length()) % pool.size() + pool.size()) % pool.size()
	var options: Array = [pool[i], pool[(i + 4) % pool.size()]]
	var right = ((int(m["day"]) + String(m.get("key", "")).length()) % 3 + 3) % 3
	options.insert(right, label)
	return { "label": label, "options": options, "right": right }

static func class_short(i: int) -> String:
	if i < 0 or i >= CLASSES.size():
		return ""
	var parts: Array = []
	for id in CLASSES[i]:
		parts.append("第 %d 章 %s" % [int(CHAPTER_N[id]), CHAPTER_SHORT[id]])
	return "・".join(parts)

# ---- the calendar (civil-date arithmetic standing in for JS Date.UTC)
static func _floor_div(a: int, b: int) -> int:
	var q = a / b if (a % b == 0 or (a >= 0) == (b >= 0)) else a / b - 1
	return q
static func _days_from_civil(y: int, m: int, d: int) -> int:
	var yy = y - (1 if m <= 2 else 0)
	var era = _floor_div(yy, 400)
	var yoe = yy - era * 400
	var doy = (153 * (m + (-3 if m > 2 else 9)) + 2) / 5 + d - 1
	var doe = yoe * 365 + yoe / 4 - yoe / 100 + doy
	return era * 146097 + doe - 719468
static func _civil_from_days(z0: int) -> Array:
	var z = z0 + 719468
	var era = _floor_div(z, 146097)
	var doe = z - era * 146097
	var yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365
	var y = yoe + era * 400
	var doy = doe - (365 * yoe + yoe / 4 - yoe / 100)
	var mp = (5 * doy + 2) / 153
	var d = doy - (153 * mp + 2) / 5 + 1
	var m = mp + (3 if mp < 10 else -9)
	y += 1 if m <= 2 else 0
	return [y, m, d]

static func date_of(day: int) -> Dictionary:
	var parts = START_DATE.split("-")
	var z = _days_from_civil(int(parts[0]), int(parts[1]), int(parts[2])) + day - 1
	var c = _civil_from_days(z)
	var wd = ((z % 7) + 7 + 4) % 7
	return { "iso": "%d-%s-%s" % [c[0], _pad2(c[1]), _pad2(c[2])], "y": c[0], "m": c[1], "d": c[2], "wd": wd }

const WD := ["日", "月", "火", "水", "木", "金", "土"]
static func date_text(day: int) -> String:
	var t = date_of(day)
	return "%d 年 %d 月 %d 日（%s）" % [int(t["y"]), int(t["m"]), int(t["d"]), WD[int(t["wd"])]]

static func day_of_year(day: int) -> int:
	var t = date_of(day)
	return _days_from_civil(int(t["y"]), int(t["m"]), int(t["d"])) - _days_from_civil(int(t["y"]), 1, 1) + 1

static func is_off(day: int) -> bool:
	return day > 1 and int(date_of(day)["wd"]) == 0

# ---- the weather
const WEATHER := {
	"good": { "ja": "晴れ", "fly": { "am": true, "pm": true }, "decision": "go", "why": "視程・雲・風とも基準内です。" },
	"amFog": { "ja": "朝霧（昼前に晴れる）", "fly": { "am": false, "pm": true }, "decision": "wait", "why": "朝は霧で視程 1/2 SM。予報（TAF）では 11 時ごろから視程が回復します。午後に回すのが正解です。" },
	"pmStorm": { "ja": "午後に雷雨", "fly": { "am": true, "pm": false }, "decision": "early", "why": "TAF に午後の雷雨（TEMPO TSRA）。午前のうちに飛んで、13 時までに戻ります。" },
	"crosswind": { "ja": "強い横風", "fly": { "am": false, "pm": false }, "decision": "cancel", "why": "横風が 16 kt、突風 24 kt。ソロ前の訓練生の基準（横風 10 kt 以下）を超えています。今日は飛びません。" },
	"storm": { "ja": "雷雨", "fly": { "am": false, "pm": false }, "decision": "cancel", "why": "一日中、雷雨の予報です。飛びません。" },
	"amLowCloud": { "ja": "朝の低い雲（昼前に上がる）", "fly": { "am": false, "pm": true }, "decision": "wait", "why": "朝は雲の底が 600 ft。予報（TAF）では 11 時ごろに 3,500 ft まで上がります。午後に回すのが正解です。" },
	"pmWind": { "ja": "午後に強い横風", "fly": { "am": true, "pm": false }, "decision": "early", "why": "TAF では 15 時から横風が 18 kt、突風 26 kt に強まります。午前のうちに飛んで、早めに戻ります。" },
	"lowCloud": { "ja": "低い雲（計器気象状態）", "fly": { "am": false, "pm": false }, "decision": "cancel", "why": "雲の底が 800 ft、視程 3 SM。有視界では飛べない天気です。",
		"ifr": { "fly": { "am": true, "pm": true }, "decision": "go", "why": "雲の底は 800 ft ですが、計器飛行方式の飛行計画で、教官と一緒なら飛べます。雲の中の ILS は、今日しか練習できない本物です。" } },
	"southFlow": { "ja": "南風（滑走路 18 を使用）", "fly": { "am": true, "pm": true }, "decision": "go", "why": "南風 190°・8 kt です。滑走路 36 のままだと追い風 8 kt で、訓練生の制限（追い風は不可）を超えます。今日の使用滑走路は 18。18 なら向かい風 8 kt で、基準内です。場周は 18 の左場周になります。" },
	"forecastBust": { "ja": "予報外れ（午後に前線が来る）", "fly": { "am": true, "pm": false }, "decision": "early", "why": "TAF は終日、有視界の予報です。ただ、西の空が暗くなってきています。前線が予報より早く近づいているかもしれません。午前のうちに飛んで、空が変わる前に戻りましょう。",
		"debrief": "予報外れでした。TAF は終日 VFR と言っていましたが、前線が半日早く来ました。天気は予報どおりにはならないことがある。その前提で、午前の早めの判断が正解でした。" },
}

static func weather_for2(W: Dictionary, chapter: String, kind: String) -> Dictionary:
	if W.has("ifr") and chapter == "ch4" and kind != "xc":
		var out = W.duplicate()
		out["fly"] = (W["ifr"] as Dictionary)["fly"].duplicate()
		out["decision"] = W["ifr"]["decision"]
		out["why"] = W["ifr"]["why"]
		return out
	return W

static func weather_for(seed: int, day: int, o: Dictionary = {}) -> Dictionary:
	var force = o.get("force", null)
	var r = Rng.new((seed * 7919 + day * 104729) & 0xFFFFFFFF)
	var r2 = Rng.new((seed * 131 + day * 7) & 0xFFFFFFFF)
	var x = r.next()
	var kind = "good" if x < 0.47 else "southFlow" if x < 0.54 else "amLowCloud" if x < 0.6 else "amFog" if x < 0.71 else "pmStorm" if x < 0.82 else "pmWind" if x < 0.87 else "crosswind" if x < 0.95 else "storm"
	if o.get("ifr", false) and kind == "good" and r2.next() < 0.22:
		kind = "lowCloud"
	if o.get("bustOk", false) and kind == "good" and Rng.new((seed * 31 + day * 17) & 0xFFFFFFFF).next() < 0.18:
		kind = "forecastBust"
	if force != null:
		kind = String(force)
	var W = WEATHER[kind]
	var temp_c = 17 + int(floorf(r.next() * 9.0))
	var qnh = floorf((29.55 + r.next() * 0.7) * 100.0 + 0.5) / 100.0
	var dew_c = temp_c - 4 - int(floorf(r.next() * 6.0))
	var icing = false
	if kind == "lowCloud" and day_of_year(day) >= 295 and Rng.new((seed * 57 + day * 91) & 0xFFFFFFFF).next() < 0.6:
		icing = true
		temp_c = -1 + int(floorf(Rng.new((seed * 57 + day * 91 + 5) & 0xFFFFFFFF).next() * 4.0))
		dew_c = temp_c - 1
	var td = func(t: int, d: int) -> String: return "%s/%s" % [_pad2(t), _pad2(mini(d, t))]
	var zz = func(h: int) -> String: return "%s53Z" % _pad2(h)
	var q = "A" + str(_js_round(qnh * 100.0))
	var wind = "09016G24KT" if kind == "crosswind" else "03006KT" if kind == "lowCloud" else "19008KT" if kind == "southFlow" else "36005KT"
	var dd = _pad2(int(date_of(day)["d"]))
	var metar: Dictionary
	match kind:
		"good": metar = { "am": "KLAB %s%s %s 10SM FEW035 %s %s" % [dd, zz.call(13), wind, td.call(temp_c - 3, dew_c), q], "pm": "KLAB %s%s %s 10SM SCT045 %s %s" % [dd, zz.call(18), wind, td.call(temp_c, dew_c), q] }
		"amFog": metar = { "am": "KLAB %s%s 00000KT 1/2SM FG VV002 %s %s" % [dd, zz.call(13), td.call(temp_c - 5, temp_c - 5), q], "pm": "KLAB %s%s %s 10SM FEW030 %s %s" % [dd, zz.call(18), wind, td.call(temp_c, dew_c), q] }
		"pmStorm": metar = { "am": "KLAB %s%s %s 10SM FEW040 %s %s" % [dd, zz.call(13), wind, td.call(temp_c - 2, dew_c + 3), q], "pm": "KLAB %s%s 22018G30KT 3SM +TSRA BKN025CB %s %s" % [dd, zz.call(18), td.call(temp_c - 4, dew_c + 2), q] }
		"crosswind": metar = { "am": "KLAB %s%s %s 10SM SCT035 %s %s" % [dd, zz.call(13), wind, td.call(temp_c, dew_c), q], "pm": "KLAB %s%s %s 10SM SCT040 %s %s" % [dd, zz.call(18), wind, td.call(temp_c + 1, dew_c), q] }
		"lowCloud": metar = { "am": "KLAB %s%s %s 3SM BR BKN008 OVC015 %s %s" % [dd, zz.call(13), wind, td.call(temp_c - 4, temp_c - 5), q], "pm": "KLAB %s%s %s 4SM BR OVC009 %s %s" % [dd, zz.call(18), wind, td.call(temp_c - 3, temp_c - 4), q] }
		"amLowCloud": metar = { "am": "KLAB %s%s 00000KT 5SM BR OVC006 %s %s" % [dd, zz.call(13), td.call(temp_c - 4, temp_c - 5), q], "pm": "KLAB %s%s %s 10SM SCT035 %s %s" % [dd, zz.call(18), wind, td.call(temp_c, dew_c), q] }
		"pmWind": metar = { "am": "KLAB %s%s %s 10SM FEW040 %s %s" % [dd, zz.call(13), wind, td.call(temp_c - 2, dew_c), q], "pm": "KLAB %s%s 09018G26KT 10SM SCT040 %s %s" % [dd, zz.call(18), td.call(temp_c + 1, dew_c), q] }
		"storm": metar = { "am": "KLAB %s%s 18012G22KT 2SM TSRA BKN015CB %s %s" % [dd, zz.call(13), td.call(temp_c - 4, temp_c - 5), q], "pm": "KLAB %s%s 20015G28KT 1 1/2SM +TSRA OVC012CB %s %s" % [dd, zz.call(18), td.call(temp_c - 5, temp_c - 6), q] }
		"southFlow": metar = { "am": "KLAB %s%s %s 10SM FEW035 %s %s" % [dd, zz.call(13), wind, td.call(temp_c - 3, dew_c), q], "pm": "KLAB %s%s %s 10SM SCT040 %s %s" % [dd, zz.call(18), wind, td.call(temp_c, dew_c), q] }
		"forecastBust": metar = { "am": "KLAB %s%s 36005KT 10SM FEW035 %s %s" % [dd, zz.call(13), td.call(temp_c - 3, dew_c), q], "pm": "KLAB %s%s 24018G30KT 3SM TSRA BKN020CB %s %s" % [dd, zz.call(18), td.call(temp_c - 4, dew_c + 2), q] }
		_: metar = { "am": "", "pm": "" }
	var taf = {
		"good": "TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045",
		"amFog": "TAF KLAB … 00000KT 1/2SM FG VV002 TEMPO 1215 1SM BR FM1500 01005KT P6SM FEW030",
		"pmStorm": "TAF KLAB … 01005KT P6SM FEW040 FM1700 22015G25KT 3SM TSRA BKN030CB",
		"crosswind": "TAF KLAB … 09015G24KT P6SM SCT035 FM2000 09012G20KT P6SM SCT040",
		"storm": "TAF KLAB … 18012G22KT 2SM TSRA BKN015CB TEMPO 1622 1SM +TSRA OVC010CB",
		"lowCloud": "TAF KLAB … 03006KT 3SM BR BKN008 OVC015 FM2000 03008KT 5SM BR OVC012",
		"amLowCloud": "TAF KLAB … 00000KT 5SM BR OVC006 FM1500 01005KT P6SM SCT035",
		"pmWind": "TAF KLAB … 01005KT P6SM FEW040 FM1900 09018G26KT P6SM SCT040",
		"southFlow": "TAF KLAB … 19008KT P6SM FEW035",
		"forecastBust": "TAF KLAB … 01005KT P6SM FEW035 FM1800 03008KT P6SM SCT045",
	}[kind]
	var why = String(W["why"])
	if icing:
		why += " 今日は雲の中が着氷する温度です（気温氷点近く）。計器飛行では、氷の付着に注意してください。"
	var out = { "kind": kind, "ja": W["ja"], "fly": (W["fly"] as Dictionary).duplicate(), "decision": W["decision"], "why": why, "metar": metar, "taf": taf, "tempC": temp_c, "dewC": dew_c, "qnh": qnh }
	if W.has("ifr"):
		out["ifr"] = W["ifr"]
	if W.has("debrief"):
		out["debrief"] = W["debrief"]
	if icing:
		out["icing"] = true
	return out

static func weather_at(W, hours: float) -> Dictionary:
	var h = hours
	var lerp = func(a: float, b: float, f: float) -> float: return a + (b - a) * clampf(f, 0.0, 1.0)
	var kind = W.get("kind") if _is_obj(W) else null
	match kind:
		"amFog":
			var f = clampf((11.5 - h) / 3.8, 0.0, 1.0)
			return { "fog": 0.85 * f, "ceilingFt": null, "visSM": lerp.call(10.0, 0.5, f) }
		"amLowCloud":
			var c = 600.0 if h <= 8.0 else 3500.0 if h >= 12.0 else 600.0 + (h - 8.0) / 4.0 * 2900.0
			return { "fog": 0.55 if c < 1000.0 else 0.25 if c < 2000.0 else 0.0, "ceilingFt": _js_round(c), "visSM": 5.0 if c < 1000.0 else 10.0 }
		"lowCloud":
			return { "fog": 0.55, "ceilingFt": 800, "visSM": 3.0 }
		"forecastBust":
			return { "fog": 0.0, "ceilingFt": null, "visSM": 10.0 } if h < 12.5 else { "fog": 0.3, "ceilingFt": 2000, "visSM": 3.0 }
		_:
			return { "fog": 0.0, "ceilingFt": null, "visSM": 10.0 }

static func surface_wind_of(metar) -> Dictionary:
	var m = _re_search("(\\d{3})(\\d{2,3})(?:G\\d{2,3})?KT", String(metar) if metar != null else "")
	if m == null:
		return { "from": 360, "kt": 0 }
	var f = int(m.get_string(1))
	return { "from": f if f != 0 else 360, "kt": int(m.get_string(2)) }

static func winds_aloft_for(W) -> Dictionary:
	var surf = surface_wind_of(W["metar"]["pm"] if _is_obj(W) and _is_obj(W.get("metar")) else null)
	var f = (int(surf["from"]) + 30) % 360
	if f == 0:
		f = 360
	return { "surfFrom": surf["from"], "surfKt": surf["kt"], "from": f, "kt": int(surf["kt"]) * 2 if int(surf["kt"]) >= 1 else 10, "altFt": NAV_ALT_FT }

static func active_runway(W) -> String:
	var s = surface_wind_of(W["metar"]["pm"] if _is_obj(W) and _is_obj(W.get("metar")) else null)
	return "18" if int(s["kt"]) >= 4 and int(s["from"]) >= 140 and int(s["from"]) <= 230 else "36"

# ---- the state
static func new_career(seed: float = 1.0) -> Dictionary:
	var sd = int(seed) & 0xFFFFFFFF
	if sd == 0:
		sd = 1
	return { "v": CAREER_VERSION, "seed": sd, "day": 1, "slot": "morning", "chapter": "prologue", "fatigue": 20, "exams": {}, "ground": {}, "decisions": [], "done": {}, "solo": null, "checks": {}, "graduated": null, "started": true,
		"abilities": ABILITY_START.duplicate(), "firstTry": { "pass": 0, "total": 0 }, "growth": {},
		"examDay": {}, "aloft": null, "drills": { "day": 0, "n": 0 }, "miss": null,
		"heard": {}, "lastPace": null, "attempts": {}, "answers": {}, "walked": [] }

static func clean_career(o) -> Variant:
	if not _is_obj(o) or (int(o.get("v", -1)) != CAREER_VERSION and int(o.get("v", -1)) != 1):
		return null
	var s = new_career(_num(o.get("seed")))
	if _is_obj(o.get("abilities")):
		for a in ABILITIES:
			if typeof(o["abilities"].get(a)) == TYPE_INT or typeof(o["abilities"].get(a)) == TYPE_FLOAT:
				s["abilities"][a] = _clamp(_num(o["abilities"][a]), 0.0, 100.0)
	if _is_obj(o.get("firstTry")):
		if _is_int_num(o["firstTry"].get("pass")) and int(o["firstTry"]["pass"]) >= 0:
			s["firstTry"]["pass"] = mini(int(o["firstTry"]["pass"]), 9999)
		if _is_int_num(o["firstTry"].get("total")) and int(o["firstTry"]["total"]) >= 0:
			s["firstTry"]["total"] = mini(int(o["firstTry"]["total"]), 9999)
		if int(s["firstTry"]["pass"]) > int(s["firstTry"]["total"]):
			s["firstTry"]["pass"] = s["firstTry"]["total"]
	if _is_obj(o.get("growth")):
		var n = 0
		for k in o["growth"].keys():
			if n >= 200:
				break
			n += 1
			var v = o["growth"][k]
			if _re_match(_ATTEMPT_ID, String(k)) and _is_int_num(v) and int(v) >= 0:
				s["growth"][k] = mini(int(v), 999)
	if _is_obj(o.get("examDay")):
		for k in o["examDay"].keys():
			var v = o["examDay"][k]
			if EXAMS.has(k) and _is_int_num(v) and int(v) >= 1 and int(v) < 10000:
				s["examDay"][k] = int(v)
	if _is_obj(o.get("drills")) and _is_int_num(o["drills"].get("day")) and _is_int_num(o["drills"].get("n")):
		s["drills"] = { "day": _clampi(int(o["drills"]["day"]), 0, 9999), "n": _clampi(int(o["drills"]["n"]), 0, 99) }
	if _is_obj(o.get("aloft")) and _is_int_num(o["aloft"].get("day")) and int(o["aloft"]["day"]) >= 1 and int(o["aloft"]["day"]) < 10000 and ["surfFrom", "surfKt", "from", "kt"].all(func(f): return typeof(o["aloft"].get(f)) == TYPE_INT or typeof(o["aloft"].get(f)) == TYPE_FLOAT):
		s["aloft"] = { "day": int(o["aloft"]["day"]), "surfFrom": _clamp(_num(o["aloft"]["surfFrom"]), 0.0, 360.0), "surfKt": _clamp(_num(o["aloft"]["surfKt"]), 0.0, 99.0), "from": _clamp(_num(o["aloft"]["from"]), 0.0, 360.0), "kt": _clamp(_num(o["aloft"]["kt"]), 0.0, 99.0), "altFt": NAV_ALT_FT }
	if _is_obj(o.get("miss")) and typeof(o["miss"].get("key")) == TYPE_STRING and _re_match(_MISS_KEY, String(o["miss"]["key"])) and typeof(o["miss"].get("label")) == TYPE_STRING and String(o["miss"]["label"]).length() >= 1 and String(o["miss"]["label"]).length() <= 80 and _is_int_num(o["miss"].get("day")) and int(o["miss"]["day"]) >= 1 and int(o["miss"]["day"]) < 10000:
		s["miss"] = { "day": int(o["miss"]["day"]), "key": o["miss"]["key"], "label": o["miss"]["label"] }
	if _is_int_num(o.get("day")) and int(o["day"]) >= 1 and int(o["day"]) < 10000:
		s["day"] = int(o["day"])
	if SLOTS.has(o.get("slot")):
		s["slot"] = o["slot"]
	if CHAPTERS.has(o.get("chapter")):
		s["chapter"] = o["chapter"]
	if typeof(o.get("fatigue")) == TYPE_INT or typeof(o.get("fatigue")) == TYPE_FLOAT:
		s["fatigue"] = _clampi(_js_round(_num(o["fatigue"])), 0, 100)
	for k in ["exams", "ground"]:
		if _is_obj(o.get(k)):
			for id in o[k].keys():
				var v = o[k][id]
				if _re_match("^[a-z0-9_]{1,16}$", String(id)) and _is_obj(v):
					s[k][id] = { "tries": _clampi(_js_round(_num(v.get("tries"))), 0, 9999), "best": _clampi(_js_round(_num(v.get("best"))), 0, 100), "pass": bool(v.get("pass", false)) }
	if typeof(o.get("decisions")) == TYPE_ARRAY:
		var dec: Array = []
		for d in o["decisions"]:
			if _is_obj(d) and _is_int_num(d.get("day")) and typeof(d.get("choice")) == TYPE_STRING and typeof(d.get("right")) == TYPE_BOOL:
				dec.append(d)
		s["decisions"] = dec.slice(maxi(0, dec.size() - 200)).map(func(d): return { "day": int(d["day"]), "choice": String(d["choice"]).substr(0, 12), "right": d["right"] })
	if _is_obj(o.get("done")):
		for k in o["done"].keys():
			var v = o["done"][k]
			if _re_match("^[a-z0-9_:]{1,24}$", String(k)) and _is_int_num(v):
				s["done"][k] = int(v)
	if _is_obj(o.get("solo")) and _is_int_num(o["solo"].get("day")):
		s["solo"] = { "day": int(o["solo"]["day"]) }
	if _is_obj(o.get("checks")):
		for id in o["checks"].keys():
			var v = o["checks"][id]
			if CHECKS.has(id) and _is_obj(v):
				s["checks"][id] = { "tries": _clampi(_js_round(_num(v.get("tries"))), 0, 999), "pass": bool(v.get("pass", false)), "day": int(v["day"]) if _is_int_num(v.get("day")) else 0 }
	if _is_obj(o.get("graduated")) and _is_int_num(o["graduated"].get("day")):
		s["graduated"] = { "day": int(o["graduated"]["day"]) }
		if ["優等", "優秀", "通常"].has(o["graduated"].get("rank")):
			s["graduated"]["rank"] = o["graduated"]["rank"]
			for k in ["total", "firstRate", "examTries", "avgScore"]:
				if typeof(o["graduated"].get(k)) == TYPE_INT or typeof(o["graduated"].get(k)) == TYPE_FLOAT:
					s["graduated"][k] = _clamp(_num(o["graduated"][k]), 0.0, 9999.0)
	if _is_obj(o.get("heard")):
		for k in o["heard"].keys():
			var v = o["heard"][k]
			if _re_match(_SEC_ID, String(k)) and (v == "f" or v == "q"):
				s["heard"][k] = v
	else:
		var before: Array = []
		for k in s["done"].keys():
			if _re_match("^(class|lecture):\\d+$", String(k)):
				before.append(k)
		var chapters := {}
		for i in CLASSES_BEFORE.size():
			var d = s["done"].get("class:%d" % i)
			if d != null:
				for id in CLASSES_BEFORE[i]:
					chapters[id] = d
		for k in before:
			s["done"].erase(k)
		for i in CLASSES.size():
			var ids = CLASSES[i]
			var all_have = true
			for id in ids:
				if not chapters.has(id):
					all_have = false
			if all_have:
				var mx = -1
				for id in ids:
					mx = maxi(mx, int(chapters[id]))
				s["done"]["class:%d" % i] = mx
		var any_today = false
		for v in chapters.values():
			if int(v) == int(s["day"]):
				any_today = true
		var any_class_today = false
		for i in CLASSES.size():
			if s["done"].get("class:%d" % i) == s["day"]:
				any_class_today = true
		if s["chapter"] == "ch1" and any_today and not any_class_today:
			s["slot"] = "morning"
	if PACE_IDS.has(o.get("lastPace")):
		s["lastPace"] = o["lastPace"]
	if _is_obj(o.get("attempts")):
		for k in o["attempts"].keys():
			var v = o["attempts"][k]
			if _re_match(_ATTEMPT_ID, String(k)) and _is_int_num(v) and int(v) >= 0:
				s["attempts"][k] = mini(int(v), 9999)
	if _is_obj(o.get("answers")):
		var n = 0
		for k in o["answers"].keys():
			if n >= 400:
				break
			n += 1
			var v = o["answers"][k]
			if _re_match(_Q_ID, String(k)) and typeof(v) == TYPE_ARRAY and v.size() == 4 and v.all(func(x): return _is_int_num(x)):
				s["answers"][k] = [_clampi(int(v[0]), 0, 9999), _clampi(int(v[1]), 0, 9999), 1 if v[2] else 0, _clampi(int(v[3]), 0, 9999)]
	if typeof(o.get("walked")) == TYPE_ARRAY:
		var w: Array = []
		for x in o["walked"]:
			if typeof(x) == TYPE_STRING and _re_match("^[a-z0-9-]{1,16}$", String(x)) and not w.has(x):
				w.append(x)
		s["walked"] = w.slice(0, 40)
	return s

# ---- what counts
static func _lesson_rec(prog, id: String):
	if _is_obj(prog) and _is_obj(prog.get("lessons")):
		return prog["lessons"].get(id)
	return null
static func passed_at(prog, id: String, levels: Array = COUNTS) -> bool:
	var r = _lesson_rec(prog, id)
	if not _is_obj(r) or not bool(r.get("pass", false)):
		return false
	for l in r.get("levels", []):
		if levels.has(l):
			return true
	return false
static func ground_passed(prog, id: String) -> bool:
	var r = _lesson_rec(prog, id)
	return _is_obj(r) and bool(r.get("pass", false))
static func note_ground(rec, pass_: bool, pct: float = 100.0) -> Dictionary:
	var r = rec if _is_obj(rec) else { "tries": 0, "best": "", "pass": false, "levels": [] }
	var first = int(r.get("tries", 0)) == 0
	r["tries"] = int(r.get("tries", 0)) + 1
	if pass_:
		r["pass"] = true
		var g = "S" if pct >= 100.0 else "A" if pct >= 90.0 else "B"
		if String(r.get("best", "")).is_empty() or "SAB".find(g) < "SAB".find(String(r["best"])):
			r["best"] = g
	return { "rec": r, "first": first }
static func next_lesson(prog) -> Variant:
	for id in CH2:
		if not passed_at(prog, id):
			return id
	return null
static func gate(state: Dictionary, prog, trust: float = 50.0) -> Array:
	if state["chapter"] == "prologue":
		return [] if state["done"].has("prologue") else ["入社の 1 日"]
	if state["chapter"] == "ch1":
		var miss1: Array = []
		for id in GROUND:
			if not ground_passed(prog, id):
				miss1.append("訓練装置 " + id)
		if not (_is_obj(state["exams"].get("written1")) and state["exams"]["written1"].get("pass", false)):
			miss1.append(EXAMS["written1"]["title"])
		return miss1
	if STAGE.has(state["chapter"]):
		var S = STAGE[state["chapter"]]
		var miss2: Array = []
		for id in S["lessons"]:
			if not passed_at(prog, id):
				miss2.append("課目 " + id)
		if not (_is_obj(state["exams"].get(S["exam"])) and state["exams"][S["exam"]].get("pass", false)):
			miss2.append(EXAMS[S["exam"]]["title"])
		if not (_is_obj(state["checks"].get(S["check"])) and state["checks"][S["check"]].get("pass", false)):
			miss2.append(CHECKS[S["check"]]["title"])
		return miss2
	if state.get("solo") != null:
		return []
	var miss: Array = []
	for id in CH2:
		if not passed_at(prog, id):
			miss.append("課目 " + id)
	if not (_is_obj(state["exams"].get("presolo")) and state["exams"]["presolo"].get("pass", false)):
		miss.append(EXAMS["presolo"]["title"])
	if not passed_at(prog, "c1"):
		miss.append("ソロ前の審査（c1）")
	if trust < float(SOLO_TRUST):
		miss.append("担当教官の信頼（%d 以上）" % SOLO_TRUST)
	if judge_of(state) < float(SOLO_JUDGE):
		miss.append("判断（%d 以上）" % SOLO_JUDGE)
	return miss

static func prologue_flags(state: Dictionary) -> Dictionary:
	var past = state["chapter"] != "prologue" or state["done"].has("prologue")
	var out := {}
	for f in PROLOGUE_FLAGS.keys():
		out[f] = past or state["done"].has(PROLOGUE_FLAGS[f])
	return out

static func _find_flown(done: Dictionary, day: int, prefixes: Array) -> String:
	for k in done.keys():
		if int(done[k]) == day:
			for p in prefixes:
				if String(k).begins_with(p + ":"):
					return String(k)
	return ""

static func _stable_sort_by_slot(arr: Array) -> Array:
	var deco: Array = []
	for i in arr.size():
		deco.append([SLOTS.find(arr[i].get("slot")), i, arr[i]])
	deco.sort_custom(func(a, b): return a[0] < b[0] if a[0] != b[0] else a[1] < b[1])
	var out: Array = []
	for d in deco:
		out.append(d[2])
	return out

static func schedule(state: Dictionary, prog, opts: Dictionary = {}) -> Array:
	var trust = float(opts.get("trust", 50.0))
	var day = int(state["day"])
	var out: Array = []
	var W = opts.get("weather")
	if not _is_obj(W):
		W = weather_for(int(state["seed"]), day, day_opts(state, prog))
	if is_off(day):
		var off: Array = [{ "slot": "am", "kind": "off", "title": "休日", "where": null, "who": null }]
		var w = null
		for e in CH1_EVENTS:
			if e["id"] == "week":
				w = e
		var any_class = false
		for k in state["done"].keys():
			if String(k).begins_with("class:"):
				any_class = true
		if state["chapter"] == "ch1" and any_class and (not state["done"].has("event:week") or int(state["done"]["event:week"]) == day):
			return off + [{ "slot": "am", "kind": "event", "id": w["id"], "title": w["title"], "where": w["where"], "who": w["who"], "optional": true }]
		return off
	if state["chapter"] == "prologue":
		out.append({ "slot": "morning", "kind": "ceremony", "id": "welcome", "title": "入社の式（ロビー）", "where": "lobby", "who": "chief" })
		out.append({ "slot": "am", "kind": "tour", "id": "tour", "title": "訓練所の案内", "where": "dispatch", "who": "dispatcher" })
		out.append({ "slot": "pm", "kind": "brief", "id": "meet", "title": "担当教官との顔合わせ（ブリーフィング室 1）", "where": "brief-1", "who": "instructor" })
		return out
	if state["chapter"] == "ch1":
		var today = func(key: String) -> bool: return state["done"].get(key) != null and int(state["done"][key]) == day
		var cls = -1
		for i in CLASSES.size():
			if not state["done"].has("class:%d" % i) or today.call("class:%d" % i):
				cls = i
				break
		var k0 = null
		for id in GROUND:
			if not ground_passed(prog, id) or today.call("ftd:" + id):
				k0 = id
				break
		var ci = CLASS_FTD.find(k0) if k0 != null else -1
		var k = k0 if k0 != null and (ci < 0 or state["done"].has("class:%d" % ci) or ci == cls) else null
		if cls >= 0:
			out.append({ "slot": "am", "kind": "class", "id": str(cls), "title": "座学 %d / %d（%s）" % [cls + 1, CLASSES.size(), class_short(cls)], "where": "brief-2", "who": "lecturer" })
		if k != null:
			out.append({ "slot": "pm" if cls >= 0 else "am", "kind": "ftd", "id": k, "title": "訓練装置 %s・%s" % [k, FTD_TITLES[k]], "where": "sim", "who": "lecturer" })
		var ev = null
		if cls >= 0 and (today.call("class:%d" % cls) or SLOTS.find(state["slot"]) <= SLOTS.find("am")):
			for e in CH1_EVENTS:
				if int(e["cls"]) == cls:
					ev = e
					break
		if ev != null and (not state["done"].has("event:" + ev["id"]) or today.call("event:" + ev["id"])):
			out.append({ "slot": "evening", "kind": "event", "id": ev["id"], "title": ev["title"], "where": ev["where"], "who": ev["who"] })
		var ex1 = state["exams"].get("written1")
		var ex1_pass = _is_obj(ex1) and bool(ex1.get("pass", false))
		if cls < 0 and k == null and ((not ex1_pass and int((state.get("examDay", {}) as Dictionary).get("written1", -1)) != day) or (ex1_pass and today.call("exam:written1"))):
			out.append({ "slot": "pm" if not out.is_empty() else "am", "kind": "exam", "id": "written1", "title": EXAMS["written1"]["title"], "where": "planning", "who": "lecturer" })
		return out
	if STAGE.has(state["chapter"]):
		return _stable_sort_by_slot(later_schedule(state, prog, W, out))
	# chapter 2
	var flown_key = _find_flown(state["done"], day, ["flight", "checkride", "solo"])
	var flown = flown_key if not flown_key.is_empty() else null
	var id = flown_key.substr(7) if flown != null and flown_key.begins_with("flight:") else next_lesson(prog)
	var ex = state["exams"].get("presolo")
	var ex_pass = _is_obj(ex) and bool(ex.get("pass", false))
	var fly_slot = "am" if W["fly"]["am"] else "pm" if W["fly"]["pm"] else null
	var ground = func(slot: String) -> void:
		if not ex_pass and int((state.get("examDay", {}) as Dictionary).get("presolo", -1)) != day and id != null and CH2.find(id) >= 9:
			out.append({ "slot": slot, "kind": "exam", "id": "presolo", "title": EXAMS["presolo"]["title"], "where": "planning", "who": "instructor" })
	if state.get("solo") != null and not (flown != null and flown_key == "solo:solo"):
		return [{ "slot": "am", "kind": "study", "id": "after", "title": "自習（次の段階の予習）", "where": "planning", "who": null }]
	if flown != null and flown_key == "checkride:c1":
		return [{ "slot": "am" if W["fly"]["am"] else "pm", "kind": "checkride", "id": "c1", "title": "ソロ前の審査（c1・主任教官）", "where": "apron", "who": "chief" }]
	if flown != null and flown_key == "solo:solo":
		return [{ "slot": "am" if W["fly"]["am"] else "pm", "kind": "solo", "id": "solo", "title": "ファーストソロ", "where": "apron", "who": "instructor" }]
	if fly_slot == null:
		out.append({ "slot": "am", "kind": "study", "id": "weather", "title": "天気で飛べない日：地上で復習", "where": "brief-1", "who": "instructor" })
		ground.call("pm")
		return out
	if id != null:
		out.append({ "slot": fly_slot, "kind": "flight", "id": id, "title": "飛行：%s" % id, "where": "apron", "who": "instructor" })
	elif (not ex_pass and int((state.get("examDay", {}) as Dictionary).get("presolo", -1)) != day) or (ex_pass and state["done"].get("exam:presolo") != null and int(state["done"]["exam:presolo"]) == day):
		out.append({ "slot": fly_slot, "kind": "exam", "id": "presolo", "title": EXAMS["presolo"]["title"], "where": "planning", "who": "instructor" })
	elif not ex_pass:
		out.append({ "slot": fly_slot, "kind": "flight", "id": "t2", "title": "飛行：場周経路の仕上げ（t2）", "where": "apron", "who": "instructor" })
	elif not passed_at(prog, "c1"):
		out.append({ "slot": fly_slot, "kind": "checkride", "id": "c1", "title": "ソロ前の審査（c1・主任教官）", "where": "apron", "who": "chief" })
	elif trust >= float(SOLO_TRUST) and judge_of(state) >= float(SOLO_JUDGE):
		out.append({ "slot": fly_slot, "kind": "solo", "id": "solo", "title": "ファーストソロ", "where": "apron", "who": "instructor" })
	else:
		out.append({ "slot": fly_slot, "kind": "flight", "id": "t2", "title": "飛行：場周経路の仕上げ（t2）", "where": "apron", "who": "instructor" })
	if id != null:
		ground.call("pm" if fly_slot == "am" else "am")
	return out

static func next_in(prog, list: Array) -> Variant:
	for id in list:
		if not passed_at(prog, id):
			return id
	return null

static func later_schedule(state: Dictionary, prog, W: Dictionary, out: Array) -> Array:
	var day = int(state["day"])
	var S = STAGE[state["chapter"]]
	var C = CHECKS[S["check"]]
	var ex = state["exams"].get(S["exam"])
	var ex_pass = _is_obj(ex) and bool(ex.get("pass", false))
	var today = func(key: String) -> bool: return state["done"].get(key) != null and int(state["done"][key]) == day
	if state.get("graduated") != null and state["chapter"] != "ch7":
		return [{ "slot": "am", "kind": "off", "id": "grad", "title": "修了（訓練はすべて終わりました）", "where": null, "who": null }]
	var check_passed = _is_obj(state["checks"].get(S["check"])) and bool(state["checks"][S["check"]].get("pass", false))
	if state["chapter"] == "ch6" and check_passed:
		return [{ "slot": "morning", "kind": "graduation", "id": "grad", "title": "修了式（ロビー）", "where": "lobby", "who": "chief" }]
	var flown_key = _find_flown(state["done"], day, ["flight", "checkride", "xc"])
	var flown = flown_key if not flown_key.is_empty() else null
	var W2 = weather_for2(W, state["chapter"], "xc" if flown != null and flown_key.begins_with("xc:") else "flight")
	var fly_slot = "am" if W2["fly"]["am"] else "pm" if W2["fly"]["pm"] else null
	var id = flown_key.substr(7) if flown != null and flown_key.begins_with("flight:") else next_in(prog, S["lessons"])
	if flown != null and not flown_key.begins_with("flight:"):
		id = null
	var written = func(slot: String) -> void:
		if not ex_pass and int((state.get("examDay", {}) as Dictionary).get(S["exam"], -1)) != day and id != null and S["lessons"].find(id) >= int(floor(S["lessons"].size() / 2.0)):
			out.append({ "slot": slot, "kind": "exam", "id": S["exam"], "title": EXAMS[S["exam"]]["title"], "where": "planning", "who": "instructor" })
	if flown != null and flown_key == "%s:%s" % [C["kind"], S["check"]]:
		return check_items(state, C, S["check"], W, out, true)
	if fly_slot == null:
		out.append({ "slot": "am", "kind": "study", "id": "weather", "title": "天気で飛べない日：地上で復習", "where": "brief-1", "who": "instructor" })
		if not ex_pass and int((state.get("examDay", {}) as Dictionary).get(S["exam"], -1)) != day and (id == null or S["lessons"].find(id) >= int(floor(S["lessons"].size() / 2.0))):
			out.append({ "slot": "pm", "kind": "exam", "id": S["exam"], "title": EXAMS[S["exam"]]["title"], "where": "planning", "who": "instructor" })
		return out
	if id != null:
		var item = { "slot": fly_slot, "kind": "flight", "id": id, "title": "飛行：%s" % id, "where": "apron", "who": "instructor" }
		if W["kind"] == "forecastBust":
			item["divert"] = { "to": "LABEF", "rwy": "09", "freq": "122.9", "ctaf": true }
		out.append(item)
		written.call("pm" if fly_slot == "am" else "am")
		return out
	if (not ex_pass and int((state.get("examDay", {}) as Dictionary).get(S["exam"], -1)) != day) or (ex_pass and today.call("exam:" + S["exam"])):
		out.append({ "slot": fly_slot, "kind": "exam", "id": S["exam"], "title": EXAMS[S["exam"]]["title"], "where": "planning", "who": "instructor" })
		return out
	if not ex_pass:
		return out
	if state["chapter"] == "ch6" and not state["done"].has("night:t2"):
		out.append({ "slot": "evening", "kind": "night", "id": "t2", "title": "夜間飛行：場周経路（t2）", "where": "apron", "who": "instructor" })
		return out
	return check_items(state, C, S["check"], W2, out, false)

static func check_items(state: Dictionary, C: Dictionary, id: String, W: Dictionary, out: Array, flown: bool) -> Array:
	if C["kind"] == "xc":
		out.append({ "slot": "am", "kind": "navlog", "id": "xc", "title": "航法ログを作る（ブリーフィング室 1）", "where": "brief-1", "who": "instructor" })
		out.append({ "slot": "pm", "kind": "xc", "id": id, "title": C["title"], "where": "apron", "who": null })
		return out
	out.append({ "slot": "am" if W["fly"]["am"] or flown else "pm", "kind": "checkride", "id": id, "title": C["title"], "where": "apron", "who": C["who"] })
	return out

static func day_opts(state: Dictionary, prog) -> Dictionary:
	var out = forced_weather(state, prog)
	out["bustOk"] = STAGE.has(state["chapter"]) and state["chapter"] != "ch3" and state["chapter"] != "ch4"
	return out

static func forced_weather(state: Dictionary, prog) -> Dictionary:
	if state["chapter"] == "prologue":
		return { "force": "good" }
	if STAGE.has(state["chapter"]):
		var S = STAGE[state["chapter"]]
		if not _is_obj(prog) or not _is_obj(prog.get("lessons")) or not passed_at(prog, S["lessons"][0]):
			return { "force": "good" }
		var lessons_done = next_in(prog, S["lessons"]) == null
		var ex_ok = _is_obj(state["exams"].get(S["exam"])) and bool(state["exams"][S["exam"]].get("pass", false))
		if lessons_done and ex_ok and S["check"] == "xc":
			return { "force": "good" }
		if lessons_done and ex_ok and S["check"] == "ir":
			return { "force": "lowCloud" }
		if lessons_done and ex_ok:
			return { "force": "good" }
		return { "ifr": true } if state["chapter"] == "ch4" else {}
	if state["chapter"] == "ch2" and (not _is_obj(prog) or not _is_obj(prog.get("lessons")) or not passed_at(prog, "a1")):
		return { "force": "good" }
	if state["chapter"] == "ch2" and passed_at(prog, "c1") and state.get("solo") == null:
		return { "force": "good" }
	return {}

static func heard_set(st: Dictionary, chapters: Array = []) -> Array:
	var chs = chapters if not chapters.is_empty() else CLASS_SECTIONS
	var out: Array = []
	for k in (st.get("heard", {}) as Dictionary).keys():
		if not out.has(k):
			out.append(k)
	for i in CLASSES.size():
		if st.get("done", {}).has("class:%d" % i):
			for id in (chs[i] if i < chs.size() else []):
				if not out.has(id):
					out.append(id)
	return out
