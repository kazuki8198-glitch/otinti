class_name CadetDayRadio
extends RefCounted
# Port of cadet/src/content/dialog/atc.js (HTML CADET @ 898fe8a) — the day's radio content:
# CALL / CALLS / setCall, FREQ, ourCall, spoken, dayRadio (the ATIS / Ground / Tower exchange
# set for a day's weather + intent) and ctafRadio (the LABEF uncontrolled set).
# The original's CALL is a mutable module-level object; here it is a static Dictionary
# changed by set_call() the same way. twr_exit / gnd_in stay Callables taking the exit
# connector ('A2' | 'A3'), exactly the shape src/atc.gd's runner resolves.

const CALLS := {
	"pa28": { "full": "Archer Seven Three Eight Sierra Yankee", "short": "Archer 8SY", "spokenShort": "Archer Eight Sierra Yankee", "reg": "N738SY" },
	"pa44": { "full": "Seminole Four Five Two Sierra Yankee", "short": "Seminole 2SY", "spokenShort": "Seminole Two Sierra Yankee", "reg": "N452SY" },
}
const FREQ := { "atis": "127.65", "ground": "121.7", "tower": "118.3" }
const CTAF_AREA := "LABEF"
const CTAF := { "freq": "122.9", "field": "LABEF", "rwy": "09" }
const _DIG := ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner"]
const _CX := { "A2": "Alpha Two", "A3": "Alpha Three" }

static var _call: Dictionary = { "full": "Archer Seven Three Eight Sierra Yankee", "short": "Archer 8SY", "spokenShort": "Archer Eight Sierra Yankee", "reg": "N738SY" }

static func get_call() -> Dictionary:
	return _call

static func set_call(type := "pa28") -> Dictionary:
	var src = CALLS.get(type, CALLS["pa28"])
	for k in src.keys():
		_call[k] = src[k]
	return _call

static func _re(pattern: String) -> RegEx:
	var re = RegEx.new()
	re.compile(pattern)
	return re

static func our_call(text):
	if typeof(text) != TYPE_STRING:
		return text
	var s = String(text)
	s = _re("(Archer|Seminole) Seven Lima Alpha").sub(s, String(_call["full"]), true)
	s = _re("(Archer|Seminole) 7LA").sub(s, String(_call["short"]), true)
	var words = String(_call["full"]).split(" ")
	var mid = "%s %s" % [words[2], words[3]] if words.size() >= 4 else ""
	s = _re("…Seven Lima…").sub(s, "…" + mid + "…", true)
	return s

static func spoken(s) -> String:
	return _re("Archer 8SY|Seminole 2SY").sub(String(s), String(_call["spokenShort"]), true)

static func _digits(s) -> String:
	var out: Array = []
	for ch in String(s).split(""):
		if ch >= "0" and ch <= "9":
			out.append(_DIG[int(ch)])
		elif ch == ".":
			out.append("point")
	return " ".join(out)

static func _cap(s: String) -> String:
	return s.substr(0, 1).to_upper() + s.substr(1) if not s.is_empty() else s

# JS String(number): an integral value prints without a fraction (JSON gives GDScript floats)
static func _js_num_str(v) -> String:
	if typeof(v) == TYPE_INT:
		return str(int(v))
	if typeof(v) == TYPE_FLOAT:
		var f = float(v)
		return str(int(f)) if f == floorf(f) and absf(f) < 1e15 else str(f)
	return str(v)

static func _pad(v, n: int) -> String:
	var s = _js_num_str(v)
	while s.length() < n:
		s = "0" + s
	return s

static func _js_round(v: float) -> int:
	return int(floorf(v + 0.5))

# JS Number.prototype.toFixed(2) for the values used here (qnh and friends)
static func _fmt2(v: float) -> String:
	var neg = v < 0.0
	var scaled = int(floorf(absf(v) * 100.0 + 0.5))
	return "%s%d.%s" % ["-" if neg else "", scaled / 100, _pad(scaled % 100, 2)]

static func _swapped(txt: String, v: float) -> String:
	var parts = txt.split(".")
	var r = "%s.%s%s" % [parts[0], parts[1].substr(1, 1), parts[1].substr(0, 1)]
	return _fmt2(v - 0.1) if r == txt else r

static func _twr_exit(exit: String, S: String) -> Dictionary:
	var cx = String(_CX.get(exit, exit))
	return { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"hear": [{ "who": "TWR", "en": "%s, turn right at %s, contact Ground point seven." % [S, cx], "ja": "誘導路 %s で右に出よ。地上管制 121.7 と交信せよ。" % exit }],
		"q": "指示を復唱します。",
		"choices": [
			{ "en": "Right at %s, Ground point seven, %s." % [cx, S], "ok": true },
			{ "en": "Left at %s, Ground point seven, %s." % [cx, S], "why": "右（right）です。曲がる向きの取り違えは、ほかの機や車とぶつかる原因になります。", "negative": "%s, negative, turn right at %s." % [S, cx] },
			{ "en": "Roger, %s." % S, "why": "出る誘導路と次の周波数を復唱します。", "negative": "%s, read back." % S },
		], "note": "%s で滑走路を出て、停止線を越えたら止まり、地上管制を呼びます。" % exit, "time": 25 }

static func _gnd_in(exit: String, F: String, S: String) -> Dictionary:
	var cx = String(_CX.get(exit, exit))
	return { "station": "GND", "freq": FREQ["ground"], "kind": "call",
		"q": "滑走路を出ました。地上管制を呼びます。",
		"choices": [
			{ "en": "LAB Ground, %s, clear of runway three six at %s, taxi to the east ramp." % [F, cx], "ok": true },
			{ "en": "LAB Ground, %s, request taxi." % S, "why": "どこにいて（滑走路を出た）、どこへ行きたいか（エプロン）を伝えます。", "negative": "%s, say position." % S },
			{ "en": "LAB Tower, %s, clear of the runway." % S, "why": "「Ground point seven」と言われました。地上管制 121.7 に変えて呼びます。", "negative": "%s, contact Ground point seven." % S },
		],
		"reply": [{ "who": "GND", "en": "%s, LAB Ground, taxi to the east ramp via Alpha." % S, "ja": "誘導路 A 経由で東のエプロンへ。" }],
		"time": 25 }

static func day_radio(weather: Dictionary = {}) -> Dictionary:
	var W = { "windMag": 10, "windKt": 5, "qnh": 29.92, "tempC": 15, "dewC": 8, "zulu": "1253", "info": "Alpha", "intent": "area", "solo": false, "xc": false, "ifr": false, "runway": "36" }
	for k in weather.keys():
		W[k] = weather[k]
	var rwy_say = "one eight" if String(W["runway"]) == "18" else "three six"
	var pattern = String(W["intent"]) == "pattern"
	var go_en = "for closed traffic" if pattern else "VFR to the practice area"
	var go_ja = "場周経路" if pattern else "訓練空域"
	var wind_say = "wind calm" if float(W["windKt"]) < 3.0 else "wind %s at %s" % [_digits(_pad(_js_round(float(W["windMag"])) if _js_round(float(W["windMag"])) != 0 else 360, 3)), _digits(str(_js_round(float(W["windKt"]))))]
	var wind_ja = "風は静穏" if float(W["windKt"]) < 3.0 else "風 %s° %s kt" % [_pad(W["windMag"], 3), _js_num_str(W["windKt"])]
	var qnh_txt = _fmt2(float(W["qnh"]))
	var qnh_say = _digits(qnh_txt.replace(".", ""))
	var info = String(W["info"])
	var F = String(_call["full"])
	var S = String(_call["short"])
	var sq_en = ", squawk four two one five" if bool(W["xc"]) else ""
	var sq_ja = "スコーク 4215。" if bool(W["xc"]) else ""
	var sky_en = "Visibility three, mist. Ceiling eight hundred broken, one thousand five hundred overcast" if bool(W["ifr"]) else "Visibility one zero. Few clouds at three thousand five hundred"
	var sky_ja = "視程 3 SM、もや。雲底 800 ft（BKN）、1,500 ft に OVC" if bool(W["ifr"]) else "視程 10 SM。3,500 ft に少しの雲"
	var zulu = String(W["zulu"])
	var atis = "LAB information %s. %s Zulu. %s. %s. " % [info, _cap(_digits(zulu)), _cap(wind_say), sky_en] \
		+ "Temperature %s, dew point %s. Altimeter %s. %sLanding and departing runway %s. " % [_digits(_js_num_str(W["tempC"])), _digits(_pad(W["dewC"], 2)), qnh_say, "I L S runway three six approach in use. " if bool(W["ifr"]) else "", rwy_say] \
		+ "Advise on initial contact you have information %s." % info
	var X := {}
	X["atis"] = { "station": "ATIS", "freq": FREQ["atis"], "kind": "listen",
		"hear": [{ "who": "ATIS", "en": atis, "ja": "LAB の情報 %s。%s:%s UTC。%s。%s。気温 %s℃・露点 %s℃。高度計 %s。離着陸の滑走路 %s。最初の交信で %s を聞いたと伝えよ。" % [info.substr(0, 1), zulu.substr(0, 2), zulu.substr(2), wind_ja, sky_ja, _js_num_str(W["tempC"]), _js_num_str(W["dewC"]), qnh_txt, String(W["runway"]), info.substr(0, 1)] }],
		"q": "ATIS の高度計規正値は？（高度計の BARO に合わせる値）",
		"choices": [{ "en": qnh_txt, "ok": true }, { "en": _fmt2(float(W["qnh"]) + 0.1), "why": "数字は 1 桁ずつ読まれます。もう一度聞いてみましょう。" }, { "en": _swapped(qnh_txt, float(W["qnh"])), "why": "数字の順番に気を付けて。「%s」は %s です。" % [qnh_say, qnh_txt] }],
		"note": "高度計を %s に合わせ、表示が飛行場の標高（55 ft）に近いことを確かめます。" % qnh_txt, "time": 30 }
	X["gnd_call"] = { "station": "GND", "freq": FREQ["ground"], "kind": "call",
		"q": "地上管制を最初に呼びます。正しい呼び方は？",
		"choices": [
			{ "en": "LAB Ground, %s, student pilot, at the east ramp with information %s, %s, request taxi." % [F, info, go_en], "ok": true },
			{ "en": "LAB Ground, %s, request taxi." % S, "why": "最初の交信ではコールサインを省略しません（省略は管制官が先にしてから）。位置と ATIS も伝えます（AIM 4-2-3・4-2-4）。",
				"negative": "Aircraft calling LAB Ground, say again your full call sign, position and request." },
			{ "en": "Ground, Archer, ready to go, over.", "why": "相手 → 自分 → 位置 → ATIS → 要求、の順です。“over” は使いません。",
				"negative": "Station calling Ground, say again." },
		],
		"reply": [{ "who": "GND", "en": "%s, LAB Ground, runway three six, taxi via Alpha, hold short of runway three six at Alpha One%s." % [F, sq_en], "ja": "滑走路 36 へ。誘導路 A 経由、A1 で滑走路 36 の手前に止まれ。%s" % sq_ja }],
		"time": 25 }
	X["gnd_rb"] = { "station": "GND", "freq": FREQ["ground"], "kind": "readback",
		"q": "タキシーの指示を復唱します。",
		"choices": [
			{ "en": "Runway three six, taxi via Alpha, hold short of runway three six at Alpha One%s, %s." % [sq_en, S], "ok": true },
			{ "en": "Taxi via Alpha, %s." % S, "why": "滑走路の手前で止まる指示（hold short）は必ず復唱します（AIM 4-3-18）。",
				"negative": "%s, negative. Read back the hold short instruction: hold short of runway three six at Alpha One." % S },
			{ "en": "Runway three six, cleared for takeoff, %s." % S, "why": "「滑走路 36 へ」は離陸の許可ではありません。滑走路に入る許可でもありません。",
				"negative": "%s, negative, you are not cleared for takeoff. Taxi via Alpha, hold short of runway three six at Alpha One." % S },
		],
		"note": "誘導路 A を南へ走り、A1 の停止線の手前で止まります。ランナップはそこで。今日は%sです。%s" % [go_ja, "トランスポンダーは 4215 に。" if bool(W["xc"]) else ""], "time": 25 }
	X["twr_ready"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "call",
		"q": "ランナップが終わりました。管制塔に出発の準備ができたことを伝えます。",
		"choices": [
			{ "en": "LAB Tower, %s, holding short runway three six at Alpha One, ready for departure, %s%s." % [F, go_en, ", first solo" if bool(W["solo"]) else ", student pilot solo" if bool(W["xc"]) else ""], "ok": true },
			{ "en": "LAB Ground, %s, ready for departure." % S, "why": "滑走路の手前まで来たら、周波数を管制塔（118.3）に変えて管制塔を呼びます（AIM 4-3-14）。",
				"negative": "%s, LAB Ground, contact Tower one one eight point three." % S },
			{ "en": "LAB Tower, %s, taking off runway three six." % S, "why": "管制塔のある空港では、許可を受けてから滑走路に入ります。自分で離陸を宣言しません。",
				"negative": "%s, LAB Tower, hold short of runway three six." % S },
		],
		"reply": [{ "who": "TWR", "en": "%s, LAB Tower, runway three six, line up and wait." % S, "ja": "滑走路 36 に入って待て。" }],
		"time": 25 }
	X["twr_luaw"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"q": "指示を復唱します。",
		"choices": [
			{ "en": "Runway three six, line up and wait, %s." % S, "ok": true },
			{ "en": "Runway three six, cleared for takeoff, %s." % S, "why": "“line up and wait” は離陸許可ではありません（AIM 5-2-5）。滑走路に入って止まり、許可を待ちます。",
				"negative": "%s, negative, line up and wait runway three six." % S },
			{ "en": "Roger, %s." % S, "why": "滑走路に入る指示は、滑走路番号を付けて復唱します（AIM 4-4-7）。",
				"negative": "%s, read back line up and wait." % S },
		],
		"note": "停止線を越えて滑走路に入り、センターラインに合わせて止まります。", "time": 25 }
	X["twr_leave"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"hear": [{ "who": "TWR", "en": "%s, frequency change approved. Report returning." % S, "ja": "周波数の変更を承認。戻るときに報告せよ。" }],
		"q": "応答します。",
		"choices": [
			{ "en": "Frequency change approved, will report returning, %s." % S, "ok": true },
			{ "en": "Bye.", "why": "応答の最後にはコールサインを付けます（AIM 4-2-3）。", "negative": "%s, say again." % S },
			{ "en": "Contact departure, %s." % S, "why": "言われたことをそのまま返します。今日は出発管制を呼ばずに、訓練空域へ向かいます。", "negative": "%s, negative, frequency change approved." % S },
		], "time": 25 }
	X["twr_back"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "call",
		"q": "訓練空域から戻ります。管制塔を呼びます。",
		"choices": [
			{ "en": "LAB Tower, %s, over the practice area, three thousand, with information %s, inbound for landing." % [F, info], "ok": true },
			{ "en": "LAB Tower, %s, landing." % S, "why": "最初の呼び出しでは、位置・高度・ATIS・意図を伝えます（AIM 4-3-2）。",
				"negative": "Aircraft calling LAB Tower, say again your position and altitude." },
			{ "en": "LAB Ground, %s, inbound." % F, "why": "飛んでいる間の相手は管制塔（118.3）です。地上管制は地上を動く機を見ています。",
				"negative": "Aircraft calling Ground, contact Tower one one eight point three." },
		],
		"reply": [{ "who": "TWR", "en": "%s, LAB Tower, make straight-in runway three six, report final." % S, "ja": "滑走路 36 へ直線進入せよ。最終進入で報告せよ。" }],
		"time": 25 }
	X["twr_straight"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"q": "指示を復唱します。",
		"choices": [
			{ "en": "Straight-in runway three six, report final, %s." % S, "ok": true },
			{ "en": "Left downwind runway three six, %s." % S, "why": "直線進入（straight-in）の指示です。言われた入り方を、滑走路番号と一緒に復唱します。",
				"negative": "%s, negative, make straight-in runway three six." % S },
			{ "en": "Roger, %s." % S, "why": "進入の方法と報告の地点を復唱します。Roger だけでは足りません。", "negative": "%s, read back." % S },
		], "time": 25 }
	X["twr_final"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "call",
		"q": "最終進入に入りました。報告します。",
		"choices": [
			{ "en": "LAB Tower, %s, final runway three six." % S, "ok": true },
			{ "en": "LAB Tower, %s, cleared to land." % S, "why": "許可はパイロットが言うものではありません。位置を報告して、許可を待ちます。", "negative": "%s, report your position." % S },
			{ "en": "LAB Tower, %s, downwind." % S, "why": "いまは最終進入（final）です。位置を正しく伝えます。", "negative": "%s, verify position." % S },
		],
		"reply": [{ "who": "TWR", "en": "%s, runway three six, %s, cleared to land." % [S, wind_say], "ja": "滑走路 36、%s、着陸を許可。" % wind_ja }],
		"time": 20 }
	X["twr_land"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"q": "着陸許可を復唱します。",
		"choices": [
			{ "en": "Runway three six, cleared to land, %s." % S, "ok": true },
			{ "en": "Cleared to land, %s." % S, "why": "着陸許可は滑走路番号を付けて復唱します（取り違えは滑走路誤進入の原因）。", "negative": "%s, read back runway number." % S },
			{ "en": "Landing runway one eight, %s." % S, "why": "滑走路番号の取り違えは重大な誤りです。36 です。", "negative": "%s, negative, runway three six, cleared to land." % S },
		], "time": 20 }
	X["twr_exit"] = func(exit): return _twr_exit(String(exit), S)
	X["gnd_in"] = func(exit): return _gnd_in(String(exit), F, S)
	X["gnd_in_rb"] = { "station": "GND", "freq": FREQ["ground"], "kind": "readback",
		"q": "指示を復唱します。",
		"choices": [
			{ "en": "Taxi to the east ramp via Alpha, %s." % S, "ok": true },
			{ "en": "Roger, %s." % S, "why": "地上の経路の指示も復唱します（AIM 4-3-18）。", "negative": "%s, read back." % S },
			{ "en": "Taxi via Alpha, hold short of runway three six, %s." % S, "why": "今度は滑走路の手前で止まる指示はありません。言われたことだけを、そのまま返します。", "negative": "%s, negative, taxi to the east ramp via Alpha." % S },
		], "note": "駐機場で止まり、チェックリストでエンジンを止めます。交信はここまでです。", "time": 25 }
	X["twr_takeoff"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"hear": [{ "who": "TWR", "en": "%s, runway three six, %s, cleared for takeoff." % [S, wind_say], "ja": "滑走路 36、%s、離陸を許可。" % wind_ja }],
		"q": "離陸許可を復唱します。",
		"choices": [
			{ "en": "Runway three six, cleared for takeoff, %s." % S, "ok": true },
			{ "en": "Cleared for takeoff, %s." % S, "why": "離陸許可は滑走路番号を付けて復唱します（AIM 4-4-7）。", "negative": "%s, read back runway number." % S },
			{ "en": "Runway three six, line up and wait, %s." % S, "why": "いま出たのは離陸の許可です。聞こえたとおりに返します。", "negative": "%s, negative, runway three six, cleared for takeoff." % S },
		], "note": "センターラインを保って、出力を全開にします。", "time": 20 }
	X["twr_closed"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"hear": [{ "who": "TWR", "en": "%s, make left closed traffic runway three six, report midfield downwind." % S, "ja": "滑走路 36 の左場周経路を回れ。ダウンウインドの中間で報告せよ。" }],
		"q": "指示を復唱します。",
		"choices": [
			{ "en": "Left closed traffic runway three six, report midfield downwind, %s." % S, "ok": true },
			{ "en": "Right closed traffic runway three six, %s." % S, "why": "左（left）の場周経路です。滑走路 36 の左場周は、滑走路の西側を回ります。", "negative": "%s, negative, make left closed traffic." % S },
			{ "en": "Roger, %s." % S, "why": "回る向きと報告の地点を復唱します。", "negative": "%s, read back." % S },
		], "note": "場周経路の高度（1,000 ft AGL）でダウンウインドに入ります。", "time": 25 }
	X["twr_stopgo"] = { "station": "TWR", "freq": FREQ["tower"], "kind": "readback",
		"hear": [{ "who": "TWR", "en": "%s, runway three six, %s, cleared for takeoff, make left closed traffic." % [S, wind_say], "ja": "滑走路 36、%s、離陸を許可。左場周経路を回れ。" % wind_ja }],
		"q": "復唱します。",
		"choices": [
			{ "en": "Runway three six, cleared for takeoff, left closed traffic, %s." % S, "ok": true },
			{ "en": "Cleared for takeoff, %s." % S, "why": "滑走路番号と、離陸後の指示（左場周）も復唱します。", "negative": "%s, read back runway and traffic pattern." % S },
			{ "en": "Runway three six, taxi to the ramp, %s." % S, "why": "もう一度離陸する許可です。駐機場へ戻る指示ではありません。", "negative": "%s, negative, runway three six, cleared for takeoff." % S },
		], "note": "フラップを上げ、出力を全開にして、もう一度離陸します。", "time": 20 }
	var sequences = {
		"atis": ["atis"], "ground": ["gnd_call", "gnd_rb"], "tower": ["twr_ready", "twr_luaw"], "leave": ["twr_leave"],
		"takeoff": ["twr_takeoff"], "closed": ["twr_closed"], "stopgo": ["twr_stopgo"],
		"back": ["twr_back", "twr_straight"], "final": ["twr_final", "twr_land"], "exit": ["twr_exit"], "groundIn": ["gnd_in", "gnd_in_rb"],
	}
	return { "exchanges": X, "sequences": sequences, "weather": W, "atisText": atis, "call": _call, "freq": FREQ }

static func ctaf_radio() -> Dictionary:
	var F = String(_call["full"])
	var S = String(_call["short"])
	var T = "%s traffic" % String(CTAF["field"])
	var X := {}
	X["ctaf_10"] = { "station": "CTAF", "freq": CTAF["freq"], "kind": "call",
		"q": "無管制の飛行場（LABEF）へ 10 マイル。最初の自家通報は？",
		"choices": [
			{ "en": "%s, %s, one zero miles west of %s, two thousand five hundred, inbound for landing runway zero niner, %s." % [T, F, String(CTAF["field"]), String(CTAF["field"])], "ok": true },
			{ "en": "%s, %s, landing runway zero niner." % [T, S], "why": "最初の通報はコールサインを省略せず、位置・高度・意図・滑走路を全部言います（AIM 4-1-9）。誰も答えはしません。" },
			{ "en": "%s Tower, %s, inbound for landing." % [String(CTAF["field"]), F], "why": "無管制の飛行場に管制塔はありません。相手は「その空域の交通（traffic）」です。" },
		], "note": "答える者はいません。聞いている他機のために言うのです。LABEF は LAB の東にある草地、滑走路は 09（方位 090°）です。", "time": 30 }
	X["ctaf_dw"] = { "station": "CTAF", "freq": CTAF["freq"], "kind": "call",
		"q": "ダウンウインドに入ります。自家通報は？",
		"choices": [
			{ "en": "%s, %s, entering left downwind runway zero niner, %s." % [T, S, String(CTAF["field"])], "ok": true },
			{ "en": "%s, %s, downwind." % [T, S], "why": "入るレグと滑走路番号を言います。" },
			{ "en": "LAB Tower, %s, entering downwind." % S, "why": "ここは無管制です。LAB の管制塔ではなく、その場の交通へ。" },
		], "note": "場周の他機は、この通報であなたの位置を知ります。09 の左場周は、滑走路の南側を西向きに飛びます。", "time": 30 }
	X["ctaf_base"] = { "station": "CTAF", "freq": CTAF["freq"], "kind": "call",
		"q": "ベースへ曲がります。",
		"choices": [
			{ "en": "%s, %s, turning left base runway zero niner, %s." % [T, S, String(CTAF["field"])], "ok": true },
			{ "en": "%s, %s, base." % [T, S], "why": "曲がるレグと滑走路を言います。" },
		], "note": "", "time": 30 }
	X["ctaf_fin"] = { "station": "CTAF", "freq": CTAF["freq"], "kind": "call",
		"q": "ファイナルに入ります。",
		"choices": [
			{ "en": "%s, %s, final runway zero niner, full stop, %s." % [T, S, String(CTAF["field"])], "ok": true },
			{ "en": "%s, %s, cleared to land runway zero niner." % [T, S], "why": "無管制では「許可」は存在しません。自分の位置と意図（full stop）を言います。" },
			{ "en": "%s, %s, final." % [T, S], "why": "滑走路番号と着陸の意図（full stop か touch and go か）を付けます。" },
		], "note": "先行機がいれば、その後ろに着く間隔も自分で取ります。草地は 900 m。接地は早めに、確実に。", "time": 30 }
	X["ctaf_clear"] = { "station": "CTAF", "freq": CTAF["freq"], "kind": "call",
		"q": "滑走路を出ました。最後の通報は？",
		"choices": [
			{ "en": "%s, %s, clear of runway zero niner, %s." % [T, S, String(CTAF["field"])], "ok": true },
			{ "en": "%s, %s, clear." % [T, S], "why": "出た滑走路の番号を言います。" },
		], "note": "これで場周の他機は、滑走路が空いたことを知ります。", "time": 30 }
	return { "exchanges": X, "sequences": { "ctaf": ["ctaf_10", "ctaf_dw", "ctaf_base", "ctaf_fin", "ctaf_clear"] }, "call": _call, "freq": { "ctaf": CTAF["freq"] }, "area": CTAF_AREA }
