class_name DialogUI
extends Control

## CADET Godot port — Phase 4 (項目0a / 0a'): 会話 UI 部品 + FTD ドリル核。
## DialogUI: src/dialog_engine.gd の Runner を包む Control。統合側 (main.gd) は
## 日次フローの予定項目の実行時にこれを開き、終わったら on_finish で次へ進む。
##
## API (確定):
##   setup(data, state, ctx_provider: Callable, on_finish: Callable)
##     data: { dialogs, speakers } (content.json の dialogs.day1.all 等)
##     state: 会話状態 Dictionary (CadetDialogEngine.create_dialog_state())。
##            null なら新規作成。ctx_provider: () -> Dictionary (無効なら {})。
##     on_finish: 引数なし Callable。会話が終わったときに 1 回だけ呼ばれる
##            (signal dialog_finished も同時に発火)。
##   start_dialog(id, node = null) -> bool
##   advance() -> bool   選択肢の無いノードを次へ (Enter 相当)
##   choose(i) -> bool   i は current_view().choices の表示順インデックス
##   press_key(k) -> bool  ノードの keys (例: 復唱のキー操作) へ
##   current_view() -> Dictionary  テスト用にも使う現在の表示:
##     実行中: Runner.view() に running=true を加えたもの
##             { name, color, text, choices: [{i, text}], keys, ends, running }
##     終了後: { running=false, ends=true, name="", text="", choices=[], keys=[] }
##   get_state() -> Dictionary / is_running() -> bool
##   static radio_panel_text(weather) -> String  DayRadio のブリーフ整形 (0a 後半)

signal dialog_finished

const DialogEng = preload("res://src/dialog_engine.gd")
const DayRadio = preload("res://src/day_radio.gd")
const Career = preload("res://src/career.gd")

var _runner = null
var _on_finish := Callable()
var _finish_fired := false
var _name_label: Label = null
var _text_label: Label = null
var _hint_label: Label = null
var _choices_box: VBoxContainer = null

func _ready() -> void:
	_build_ui()

func _build_ui() -> void:
	if _name_label != null:
		return
	var vb := VBoxContainer.new()
	vb.set_anchors_preset(Control.PRESET_FULL_RECT)
	vb.add_theme_constant_override("separation", 6)
	add_child(vb)
	_name_label = Label.new()
	_name_label.add_theme_font_size_override("font_size", 20)
	vb.add_child(_name_label)
	_text_label = Label.new()
	_text_label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	_text_label.add_theme_font_size_override("font_size", 18)
	vb.add_child(_text_label)
	_choices_box = VBoxContainer.new()
	_choices_box.add_theme_constant_override("separation", 4)
	vb.add_child(_choices_box)
	_hint_label = Label.new()
	_hint_label.add_theme_font_size_override("font_size", 13)
	_hint_label.add_theme_color_override("font_color", Color(0.75, 0.78, 0.82))
	vb.add_child(_hint_label)

func setup(data, state, ctx_provider: Callable, on_finish: Callable) -> void:
	_build_ui()
	var st = state
	if typeof(st) != TYPE_DICTIONARY:
		st = DialogEng.create_dialog_state()
	var ctx = ctx_provider if ctx_provider.is_valid() else {}
	_on_finish = on_finish
	_finish_fired = false
	_runner = DialogEng.create_runner({ "data": data, "state": st, "ctx": ctx, "hooks": {} })

func start_dialog(id: String, node = null) -> bool:
	if _runner == null:
		return false
	_finish_fired = false
	var ok: bool = _runner.start(id, node)
	_refresh()
	_check_finish()
	return ok

func advance() -> bool:
	if _runner == null or not _runner.running:
		return false
	var r: bool = _runner.next()
	_refresh()
	_check_finish()
	return r

func choose(i: int) -> bool:
	if _runner == null or not _runner.running:
		return false
	var r: bool = _runner.choose(i)
	_refresh()
	_check_finish()
	return r

func press_key(k: String) -> bool:
	if _runner == null or not _runner.running:
		return false
	var r: bool = _runner.press(k)
	_refresh()
	_check_finish()
	return r

func is_running() -> bool:
	return _runner != null and _runner.running

func get_state() -> Dictionary:
	return _runner.state if _runner != null else {}

func current_view() -> Dictionary:
	if _runner == null or not _runner.running:
		return { "running": false, "ends": true, "name": "", "color": null, "text": "", "choices": [], "keys": [] }
	var v: Dictionary = _runner.view()
	if v == null:
		return { "running": false, "ends": true, "name": "", "color": null, "text": "", "choices": [], "keys": [] }
	v["running"] = true
	if not v.has("keys"):
		v["keys"] = []
	return v

func _check_finish() -> void:
	if _runner != null and not _runner.running and not _finish_fired:
		_finish_fired = true
		dialog_finished.emit()
		if _on_finish.is_valid():
			_on_finish.call()

func _refresh() -> void:
	_build_ui()
	var v := current_view()
	_name_label.text = String(v.get("name", ""))
	var col = v.get("color", null)
	if typeof(col) == TYPE_STRING and String(col).begins_with("#"):
		_name_label.add_theme_color_override("font_color", Color.html(String(col)))
	else:
		_name_label.remove_theme_color_override("font_color")
	_text_label.text = String(v.get("text", ""))
	for ch in _choices_box.get_children():
		_choices_box.remove_child(ch)
		ch.queue_free()
	var choices: Array = v.get("choices", [])
	for i in range(choices.size()):
		var b := Button.new()
		b.text = "%d. %s" % [i + 1, String(choices[i].get("text", ""))]
		b.pressed.connect(choose.bind(i))
		_choices_box.add_child(b)
	var hints: Array = []
	var keys: Array = v.get("keys", [])
	for k in keys:
		hints.append("%s: %s" % [String(k.get("key", "")), String(k.get("text", ""))])
	if choices.is_empty() and bool(v.get("running", false)):
		hints.append("Enter: 次へ")
	_hint_label.text = "　".join(hints)

## DayRadio (src/day_radio.gd) の 1 日分の交信を、ブリーフ表示用の読みやすい
## テキストにする。ATIS 本文 + 各交換 (聞こえた送信・質問・メモ) の順。
static func radio_panel_text(weather: Dictionary) -> String:
	DayRadio.set_call("pa28")
	var r: Dictionary = DayRadio.day_radio(weather)
	var lines: Array = []
	lines.append("=== ATIS (%s) ===" % String(DayRadio.FREQ["atis"]))
	lines.append(String(r.get("atisText", "")))
	var order := ["atis", "gnd_call", "gnd_rb", "twr_ready", "twr_luaw", "twr_takeoff",
		"twr_leave", "twr_closed", "twr_stopgo", "twr_back", "twr_straight", "twr_final", "twr_land"]
	var ex: Dictionary = r.get("exchanges", {})
	for id in order:
		if ex.has(id):
			_append_exchange(lines, id, ex[id])
	for id in ["twr_exit", "gnd_in"]:
		var fn = ex.get(id, null)
		if typeof(fn) == TYPE_CALLABLE:
			_append_exchange(lines, id + " (A2)", fn.call("A2"))
	if ex.has("gnd_in_rb"):
		_append_exchange(lines, "gnd_in_rb", ex["gnd_in_rb"])
	return "\n".join(lines)

static func _append_exchange(lines: Array, id: String, x) -> void:
	if typeof(x) != TYPE_DICTIONARY:
		return
	lines.append("")
	lines.append("--- %s [%s %s] ---" % [id, String(x.get("station", "")), String(x.get("freq", ""))])
	for h in x.get("hear", []):
		lines.append("  %s: %s" % [String(h.get("who", "")), String(h.get("en", ""))])
		if String(h.get("ja", "")) != "":
			lines.append("      (%s)" % String(h.get("ja", "")))
	if String(x.get("q", "")) != "":
		lines.append("  Q: %s" % String(x.get("q", "")))
	for rp in x.get("reply", []):
		lines.append("  %s: %s" % [String(rp.get("who", "")), String(rp.get("en", ""))])
	if String(x.get("note", "")) != "":
		lines.append("  ※ %s" % String(x.get("note", "")))

# =====================================================================
# DrillCore — FTD ドリル k1–k6 (項目0a')
# 原典: cadet/src/content/school.js の ftdDialogs (k1 の TUTOR、k2 の
# pfdPictures/readQuestion)、flight-lab/src/radio.js の DRILLS (k3) /
# SCENES (k5) / LISTEN (k6)、cadet/src/content/chair-flight.js + dayRadio
# の交換列 (k4)。各 10 問・80% で合格は原典どおり。
#
# API (確定):
#   start(id, seed = 1) -> 質問 Dictionary:
#     { id, idx, total: 10, prompt, choices: [String], kind, correct: int,
#       pic: Dictionary (k1/k2 の PFD 状態。無ければ {}), say: String (k6 の英語。無ければ "") }
#     ※ correct はテスト・デバッグ用に含める。実 UI では表示しないこと。
#   answer(i) -> { correct: bool, explain: String, done: bool, score: int,
#                  passed: bool, growth: Array, next: Dictionary }
#     done のときだけ passed (score >= 8) と growth (CadetCareer.ftd_growth(id)
#     の成長ペア) が意味を持つ。next は次の質問 (done なら {})。
#   current_question() / is_done() / result() -> { id, score, total, passed, growth }
# =====================================================================
class DrillCore:
	extends RefCounted

	const Career = preload("res://src/career.gd")
	const DayRadio = preload("res://src/day_radio.gd")
	const IDS := ["k1", "k2", "k3", "k4", "k5", "k6"]
	const PASS_N := 8 # 10 問中 8 問 = 80% (原典)

	var _id := ""
	var _qs: Array = []
	var _i := 0
	var _score := 0
	var _done := false
	var _rng = null

	func _rand() -> float:
		return _rng.next()

	func _pick(arr: Array):
		return arr[mini(int(_rand() * float(arr.size())), arr.size() - 1)]

	func _ri(a: int, b: int) -> int:
		return a + mini(int(_rand() * float(b - a + 1)), b - a)

	func _shuffled(arr: Array) -> Array:
		var out := arr.duplicate()
		for i in range(out.size() - 1, 0, -1):
			var j := mini(int(_rand() * float(i + 1)), i)
			var tmp = out[i]
			out[i] = out[j]
			out[j] = tmp
		return out

	# 選択肢をシャッフルして correct の位置を付け直した質問を作る
	func _mkq(prompt: String, opts: Array, ok_text: String, why: String, kind: String, pic: Dictionary = {}, say: String = "") -> Dictionary:
		var sh := _shuffled(opts)
		return { "prompt": prompt, "choices": sh, "kind": kind,
			"correct": sh.find(ok_text), "explain": why, "pic": pic, "say": say }

	func start(id: String, seed: int = 1) -> Dictionary:
		_id = id
		_i = 0
		_score = 0
		_done = false
		_qs = []
		_rng = Career.Rng.new((seed * 104729 + (IDS.find(id) + 1) * 7919) & 0x7FFFFFFF)
		if not IDS.has(id):
			_done = true
			return { "error": "unknown drill " + id }
		match id:
			"k1": _gen_k1()
			"k2": _gen_k2()
			"k3": _gen_k3()
			"k4": _gen_k4()
			"k5": _gen_k5()
			"k6": _gen_k6()
		return current_question()

	func current_question() -> Dictionary:
		if _done or _i >= _qs.size():
			return {}
		var q: Dictionary = (_qs[_i] as Dictionary).duplicate()
		q["id"] = _id
		q["idx"] = _i
		q["total"] = _qs.size()
		q.erase("explain")
		return q

	func is_done() -> bool:
		return _done

	func answer(i: int) -> Dictionary:
		if _done or _i >= _qs.size():
			return { "correct": false, "explain": "", "done": true, "score": _score,
				"passed": _is_passed(), "growth": _growth(), "next": {} }
		var q: Dictionary = _qs[_i]
		var ok := i == int(q["correct"])
		if ok:
			_score += 1
		_i += 1
		_done = _i >= _qs.size()
		return { "correct": ok, "explain": String(q.get("explain", "")), "done": _done,
			"score": _score, "passed": _is_passed() if _done else false,
			"growth": _growth() if _done else [], "next": current_question() }

	func result() -> Dictionary:
		return { "id": _id, "score": _score, "total": _qs.size(),
			"passed": _is_passed(), "growth": _growth() if _done else [] }

	func _is_passed() -> bool:
		return _done and _qs.size() > 0 and _score >= PASS_N

	# 完了時に成長ペアを返す (適用は passed を見て統合側が行う)
	func _growth() -> Array:
		return Career.ftd_growth(_id) if _done else []

	# ---- PFD の絵 (school.js pfdPictures の移植) ----
	func _pfd_pic() -> Dictionary:
		return { "ias": 70 + _ri(0, 12) * 5, "alt": 1500 + _ri(0, 25) * 100,
			"hdg": _ri(0, 35) * 10 + 10, "vs": (_ri(0, 8) - 4) * 250, "bank": (_ri(0, 4) - 2) * 10 }

	const PFD_KINDS := ["ias", "alt", "hdg", "vs", "bank"]
	const PFD_Q := { "ias": "速度（左のテープ）は？", "alt": "高度（右のテープ）は？",
		"hdg": "機首の方位（下の HSI の上端）は？", "vs": "昇降率（右端の目盛り）は？",
		"bank": "傾き（上の弧の三角）は？" }
	const PFD_WHY := { "ias": "左の速度テープ、中央の黒い窓の数字を読みます。",
		"alt": "右の高度テープ、中央の窓の数字です。",
		"hdg": "HSI の上端の窓の数字です。", "vs": "高度テープの右の目盛りの針と数字。上は上昇、下は降下です。",
		"bank": "姿勢表示の上の弧の目盛りと、白い三角のずれで読みます。" }
	const PFD_STEP := { "ias": 5, "alt": 100, "hdg": 10, "vs": 250, "bank": 10 }

	func _fmt_pfd(kind: String, v: int) -> String:
		match kind:
			"ias": return "%d kt" % v
			"alt": return "%s ft" % _comma(v)
			"hdg": return "%03d°" % v
			"vs": return "0 fpm（水平）" if v == 0 else "%+d fpm" % v
			"bank": return "水平（0°）" if v == 0 else "%sに %d°" % ["左" if v < 0 else "右", absi(v)]
		return str(v)

	func _comma(v: int) -> String:
		var s := str(absi(v))
		var out := ""
		while s.length() > 3:
			out = "," + s.substr(s.length() - 3) + out
			s = s.substr(0, s.length() - 3)
		return ("-" if v < 0 else "") + s + out

	func _pfd_question(pic: Dictionary, idx: int) -> Dictionary:
		var kind: String = PFD_KINDS[idx % PFD_KINDS.size()]
		var v := int(pic[kind])
		var step := int(PFD_STEP[kind])
		var opts: Array = [_fmt_pfd(kind, v)]
		var seen := [v]
		for d in [1, -1, 2, -2, 10]:
			var x: int = v + int(d) * step
			if kind == "hdg":
				x = ((x % 360) + 360) % 360
				if x == 0:
					x = 360
			if kind == "bank" and d == -2 and v != 0:
				x = -v
			if seen.has(x) or (kind == "ias" and x <= 40):
				continue
			seen.append(x)
			opts.append(_fmt_pfd(kind, x))
			if opts.size() >= 4:
				break
		return _mkq(String(PFD_Q[kind]), opts, _fmt_pfd(kind, v), String(PFD_WHY[kind]), "pfd", pic)

	# ---- k1: PFD の説明 (TUTOR 7 件) + 確認問題 3 問 (原典の形) ----
	const TUTOR := [
		["all", "これが G1000 型の PFD、主な飛行表示です。真ん中が姿勢、左が速度、右が高度。この 3 つを順に見る「スキャン」が基本です。"],
		["att", "真ん中の姿勢表示。青が空、茶色が地面。黄色い記号が機体です。上の弧の目盛りが傾き、横線が機首の上下（ピッチ）です。"],
		["ias", "左のテープが速度、ノットです。窓の数字を読みます。テープの色の帯は、フラップを使える範囲や、超えてはいけない速度を表します。"],
		["alt", "右のテープが高度、フィートです。上の水色の数字は、自分で決めた目標の高度です。"],
		["vs", "高度テープのさらに右が昇降率。1 分間に何フィート上がっているか、下がっているかです。"],
		["hsi", "下の円が HSI。上端の窓が機首の方位です。真ん中の針（CDI）は、選んだコースからどれだけずれているかを示します。"],
		["baro", "高度テープの下の数字が高度計の設定値（BARO）。ATIS で聞いた値に合わせないと、高度が正しく出ません。"],
	]

	func _gen_k1() -> void:
		for t in TUTOR:
			_qs.append({ "prompt": String(t[1]), "choices": ["次へ（わかった）"], "kind": "explain",
				"correct": 0, "explain": "", "pic": {}, "say": "", "part": String(t[0]) })
		for i in range(3):
			var pic := _pfd_pic()
			var q := _pfd_question(pic, i)
			q["kind"] = "confirm"
			_qs.append(q)

	func _gen_k2() -> void:
		for i in range(10):
			_qs.append(_pfd_question(_pfd_pic(), i))

	# ---- 英語の言い方 (flight-lab radio.js の SAY 系の最小移植) ----
	const DIGW := ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "niner"]
	const SMALL := ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
		"ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"]
	const TENS := ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"]
	const ALPHA := [["A", "Alfa"], ["B", "Bravo"], ["C", "Charlie"], ["D", "Delta"], ["E", "Echo"],
		["F", "Foxtrot"], ["G", "Golf"], ["H", "Hotel"], ["I", "India"], ["J", "Juliett"],
		["K", "Kilo"], ["L", "Lima"], ["M", "Mike"], ["N", "November"], ["O", "Oscar"],
		["P", "Papa"], ["Q", "Quebec"], ["R", "Romeo"], ["S", "Sierra"], ["T", "Tango"],
		["U", "Uniform"], ["V", "Victor"], ["W", "Whiskey"], ["X", "X-ray"], ["Y", "Yankee"], ["Z", "Zulu"]]

	func _words(n: int) -> String:
		if n < 20:
			return SMALL[n]
		if n < 100:
			return TENS[n / 10] + (" " + SMALL[n % 10] if n % 10 != 0 else "")
		return str(n)

	func _digits(s: String) -> String:
		var out: Array = []
		for ch in s.split(""):
			if ch >= "0" and ch <= "9":
				out.append(DIGW[int(ch)])
			elif ch == ".":
				out.append("point")
		return " ".join(out)

	func _pad(v: int, n: int) -> String:
		var s := str(v)
		while s.length() < n:
			s = "0" + s
		return s

	func _say_altitude(ft: int) -> String:
		if ft >= 18000:
			return "flight level " + _digits(_pad(ft / 100, 3))
		var th := ft / 1000
		var hu := (ft % 1000) / 100
		if th >= 10:
			return _digits(str(th)) + " thousand" + (" " + _words(hu) + " hundred" if hu != 0 else "")
		if th == 0:
			return _words(hu) + " hundred"
		return _words(th) + " thousand" + (" " + _words(hu) + " hundred" if hu != 0 else "")

	func _four(opts: Array, ok_text: String) -> Array:
		var out: Array = []
		for o in opts:
			if not out.has(o):
				out.append(o)
		return out

	# ---- k3: 数字とアルファベットの言い方 (radio.js DRILLS の 10 種) ----
	func _gen_k3() -> void:
		var kinds := ["alt", "fl", "hdg", "spd", "frq", "alts", "sqk", "rwy", "wnd", "letter"]
		for kind in _shuffled(kinds):
			_qs.append(_k3_one(kind))

	func _k3_one(kind: String) -> Dictionary:
		match kind:
			"alt":
				var ft: int = _pick([500, 1200, 2500, 3500, 4500, 5500, 6500, 8500, 9500, 10500, 12000, 13500])
				var ok := _say_altitude(ft)
				return _mkq("高度 %s ft の言い方は？" % _comma(ft),
					_four([ok, _digits(str(ft)), "flight level " + _digits(_pad(ft / 100, 3)), _words(ft / 100) + " hundred"], ok),
					ok, "18,000 ft 未満は、千の位までをまとめて＋thousand、百の位＋hundred（AIM 4-2-8・4-2-9）。", "drill")
			"fl":
				var fl: int = _pick([180, 190, 230, 250, 270, 310, 350])
				var ok2 := _say_altitude(fl * 100)
				return _mkq("FL%d の言い方は？" % fl,
					_four([ok2, _words(fl / 10) + " thousand", "flight level " + _words(fl), _digits(str(fl)) + " hundred"], ok2),
					ok2, "米国では 18,000 ft（FL180）以上は “flight level” ＋ 3 桁を 1 桁ずつ（AIM 4-2-9）。", "drill")
			"hdg":
				var d: int = _pick([5, 20, 45, 90, 120, 155, 180, 210, 240, 270, 305, 330, 360])
				var ok3 := "heading " + _digits(_pad(d, 3))
				var rev := _pad(d, 3).split("")
				rev.reverse()
				return _mkq("針路 %s° の言い方は？" % _pad(d, 3),
					_four([ok3, "heading " + _words(d), "heading " + _digits(str(d)), "heading " + _digits("".join(rev))], ok3),
					ok3, "針路・方位・風向は必ず 3 桁を 1 桁ずつ（AIM 4-2-10）。北は 360。", "drill")
			"spd":
				var kt: int = _pick([65, 76, 90, 100, 110, 120, 135, 150, 190, 250])
				var ok4 := _digits(str(kt)) + " knots"
				return _mkq("速度 %d kt の言い方は？" % kt,
					_four([ok4, _words(kt) + " knots", _digits(str(kt)) + " miles per hour", _words(kt / 10) + " " + DIGW[kt % 10] + " knots"], ok4),
					ok4, "速度は 1 桁ずつ＋knots（AIM 4-2-11）。", "drill")
			"frq":
				var f: String = _pick(["118.3", "119.75", "121.7", "122.9", "124.35", "126.7", "127.25", "133.45"])
				var ok5 := _digits(f)
				var parts := f.split(".")
				return _mkq("周波数 %s の言い方は？" % f,
					_four([ok5, _digits(parts[0]) + " " + _digits(parts[1]), _words(int(parts[0])) + " point " + _digits(parts[1]), _digits(parts[0]) + " point " + _words(int(parts[1]))], ok5),
					ok5, "1 桁ずつ。小数点は “point”（AIM 4-2-8）。", "drill")
			"alts":
				var v: String = _pick(["29.92", "30.01", "29.87", "30.12", "29.78", "30.00"])
				var ok6 := "altimeter " + _digits(v.replace(".", ""))
				var pp := v.split(".")
				return _mkq("高度計 %s inHg の言い方は？" % v,
					_four([ok6, "altimeter " + _words(int(pp[0])) + " point " + _words(int(pp[1])), "altimeter " + _digits(v), "altimeter " + _digits(v.replace(".", "").substr(0, 3))], ok6),
					ok6, "“altimeter” ＋ 4 桁を 1 桁ずつ。小数点は言わない（JO 7110.65）。", "drill")
			"sqk":
				var code := _pad(_ri(0, 7) * 1000 + _ri(0, 7) * 100 + _ri(0, 7) * 10 + _ri(0, 7), 4)
				var ok7 := "squawk " + _digits(code)
				var revc := code.split("")
				revc.reverse()
				return _mkq("コード %s の言い方は？" % code,
					_four([ok7, "squawk " + _words(int(code.substr(0, 2))) + " " + _words(int(code.substr(2))), "squawk " + _digits("".join(revc)), "squawk " + _digits(code.substr(1))], ok7),
					ok7, "コードは 4 桁を 1 桁ずつ。トランスポンダーのコードは 0〜7 の数字だけ。", "drill")
			"rwy":
				var r: String = _pick(["36", "9R", "27C", "18", "9L", "27L", "22R", "13", "31"])
				var num := ""
				var suf := ""
				for ch in r.split(""):
					if ch >= "0" and ch <= "9":
						num += ch
					else:
						suf = { "L": "left", "R": "right", "C": "center" }.get(ch, "")
				var ok8 := "runway " + _digits(num) + (" " + suf if suf != "" else "")
				var wrong_suf := "right" if suf == "left" else "left" if suf != "" else "center"
				return _mkq("滑走路 %s の言い方は？" % r,
					_four([ok8, "runway " + _words(int(num)) + (" " + suf if suf != "" else ""), "runway " + _digits(num) + " " + wrong_suf, "runway " + _digits(num)], ok8),
					ok8, "滑走路番号は 1 桁ずつ＋left / right / center（AIM 4-2-8）。", "drill")
			"wnd":
				var dir2: int = _pick([20, 90, 140, 180, 220, 270, 300, 340, 360])
				var kt2: int = _pick([2, 5, 8, 10, 12, 15, 18])
				var ok9 := "wind calm" if kt2 < 3 else "wind " + _digits(_pad(dir2, 3)) + " at " + _digits(str(kt2))
				return _mkq("風 %s° %d kt（管制塔の言い方）は？" % [_pad(dir2, 3), kt2],
					_four([ok9, "wind " + _words(dir2) + " at " + _words(kt2), "wind " + _digits(str(kt2)) + " at " + _digits(_pad(dir2, 3)), "wind " + _digits(_pad(dir2, 3))], ok9),
					ok9, "“wind (風向 3 桁) at (風速)”、3 kt 未満は “wind calm”（JO 7110.65）。", "drill")
			_: # letter
				var a: Array = _pick(ALPHA)
				var others: Array = []
				for x in ALPHA:
					if x[0] != a[0]:
						others.append(x)
				others = _shuffled(others).slice(0, 3)
				if _rand() < 0.5:
					var opts2: Array = [String(a[1])]
					for o in others:
						opts2.append(String(o[1]))
					return _mkq("文字「%s」のフォネティックは？" % String(a[0]), opts2, String(a[1]),
						"%s ＝ %s（AIM 4-2-7）。" % [String(a[0]), String(a[1])], "drill")
				var opts3: Array = [String(a[0])]
				for o2 in others:
					opts3.append(String(o2[0]))
				return _mkq("“%s” はどの文字？" % String(a[1]), opts3, String(a[0]),
					"%s ＝ %s（AIM 4-2-7）。" % [String(a[0]), String(a[1])], "drill")

	# ---- k4: 交信のチェアフライト (dayRadio の交換列を 10 問に) ----
	# 原典 chairScript の op (周波数合わせ等) とイベント (他機・雑音) は未移植。
	# ここでは dayRadio の交換そのものを順に出す (PHASE4-SCENE-NOTES.md)。
	func _gen_k4() -> void:
		DayRadio.set_call("pa28")
		var r: Dictionary = DayRadio.day_radio({})
		var ex: Dictionary = r.get("exchanges", {})
		var ids := ["atis", "gnd_call", "gnd_rb", "twr_ready", "twr_luaw", "twr_takeoff",
			"twr_leave", "twr_back", "twr_final", "twr_land"]
		for id in ids:
			var x: Dictionary = ex.get(id, {})
			var hear_txt: Array = []
			for h in x.get("hear", []):
				hear_txt.append("%s: %s" % [String(h.get("who", "")), String(h.get("en", ""))])
			var prompt := String(x.get("q", ""))
			if not hear_txt.is_empty():
				prompt = "\n".join(hear_txt) + "\n" + prompt
			var opts: Array = []
			var ok_text := ""
			for ch in x.get("choices", []):
				opts.append(String(ch.get("en", "")))
				if bool(ch.get("ok", false)):
					ok_text = String(ch.get("en", ""))
			var why := String(x.get("note", ""))
			if why.is_empty():
				why = "呼ぶときは、相手 → 自分のコールサイン → 位置 → 要求の順です（AIM 4-2-3）。" if String(x.get("kind", "")) == "call" \
					else "滑走路・高度・針路・hold short は、言われたとおりに復唱します（AIM 4-4-7）。"
			_qs.append(_mkq(prompt, opts, ok_text, why, String(x.get("kind", "radio"))))

	# ---- k5: 復唱と応答 (radio.js SCENES から 10 場面、呼称は Godot 側の 8SY に統一) ----
	const CS_FULL := "Archer Seven Three Eight Sierra Yankee"
	const CS_SHORT := "Archer 8SY"
	const SCENES10 := [
		["地上管制への最初の呼び出し", "ATIS の B を聞き、東のエプロンでエンジンを始動した。北東の訓練空域へ行く。", "",
			["LAB Ground, Archer Seven Three Eight Sierra Yankee, student pilot, at the east ramp with information Bravo, VFR northeast, request taxi.",
				"LAB Ground, Archer 8SY, request taxi.", "Ground, this is Archer, ready to go, over."], 0,
			"型は「相手 → 自分 → 位置 → ATIS → 要求」（AIM 4-2-3）。最初の交信ではコールサインを省略しない。"],
		["ATIS の高度計を書き取る", "ATIS を聞いている。", "Altimeter three zero zero one.",
			["30.01 inHg", "30.10 inHg", "29.92 inHg"], 0,
			"高度計規正値は 1 桁ずつ読まれる。3-0-0-1 → 30.01。"],
		["タキシーの許可", "地上管制にタキシーを要求した。", "Archer Seven Three Eight Sierra Yankee, runway three six, taxi via Alpha, hold short of runway three six at Alpha One.",
			["Runway three six, taxi via Alpha, hold short of runway three six at Alpha One, Archer 8SY.", "Taxi via Alpha, Archer 8SY.", "Roger, Archer 8SY."], 0,
			"滑走路の指定・hold short は必ず復唱する（AIM 4-3-18）。"],
		["滑走路の手前で：入ってよい？", "「Runway three six, taxi via Alpha」と言われ、滑走路 36 の手前の停止線に着いた。管制塔からまだ何も言われていない。", "",
			["停止線の手前で止まり、管制塔に呼ぶ", "そのまま滑走路に入って待つ", "離陸する"], 0,
			"タキシーの指示は滑走路に入る・離陸する許可ではない（AIM 4-3-18）。"],
		["離陸許可", "滑走路 36 で入って待っている。", "Archer Seven Three Eight Sierra Yankee, runway three six, wind three four zero at eight, cleared for takeoff.",
			["Runway three six, cleared for takeoff, Archer 8SY.", "Cleared for takeoff, Archer 8SY.", "Rolling, Archer 8SY."], 0,
			"離陸許可の復唱には滑走路番号を入れる（AIM 4-4-7）。"],
		["交通情報：見えない", "言われた方を探したが、見えない。", "Archer 8SY, traffic, two o'clock, three miles, eastbound, a Cherokee, three thousand.",
			["Negative contact, Archer 8SY.", "Traffic in sight, Archer 8SY.", "Negative, Archer 8SY."], 0,
			"Negative contact は「伝えられた交通が見えない」。見えていないのに traffic in sight と言うのは危険。"],
		["着陸の順番と許可", "左ダウンウインドの中央を報告した。前の Cessna が見えている。", "Archer 8SY, number two, follow the Cessna on left base. Runway three six, cleared to land.",
			["Number two, traffic in sight, runway three six, cleared to land, Archer 8SY.", "Cleared to land, Archer 8SY.", "Roger, Archer 8SY."], 0,
			"着陸許可は滑走路番号を付けて復唱（AIM 4-4-7）。順番と前の機が見えたことも伝える。"],
		["自分の言い間違いを直す", "「squawk four two seven one」と言われたのに、「Squawk four two seven seven」と復唱してしまったのに気づいた。", "",
			["Correction, squawk four two seven one, Archer 8SY.", "（黙って正しいコードを入れる）", "Say again, Archer 8SY."], 0,
			"Correction は「送信に誤りがあった。正しいものを言う」。黙って直すと管制官は間違った復唱を聞いたままになる。"],
		["管制塔のない空港：ダウンウインドに入る", "管制塔のない LABEF 空港（架空）。CTAF で、滑走路 09 の左ダウンウインドに入る。", "",
			["LABEF traffic, Archer Seven Three Eight Sierra Yankee, entering left downwind runway zero niner, full stop, LABEF.",
				"LABEF traffic, Archer 8SY, landing on the active runway.", "（何も言わずに着陸する）"], 0,
			"自己通報の型：最初と最後に空港名、自分、位置、滑走路番号、意図（AIM 4-1-9）。"],
		["エンジン故障：遭難の通報", "LAB の北東 10 マイル・2,500 ft でエンジンが止まった。最良滑空速度にし、着陸できる場所を決めた。2 人が乗っている。", "",
			["Mayday, Mayday, Mayday, LAB Approach, Archer Seven Three Eight Sierra Yankee, engine failure, forced landing in a field, one zero miles northeast of LAB, two thousand five hundred, two people on board.",
				"LAB Approach, Archer 8SY, we have a little problem.", "Pan-pan, Pan-pan, Pan-pan, Archer 8SY, request vectors."], 0,
			"MAYDAY ×3、相手、自分、状況、意図、位置、高度、人数（AIM 6-3-2）。まず操縦、それから通報。"],
	]

	func _gen_k5() -> void:
		for sc in _shuffled(SCENES10.duplicate()):
			var prompt := "%s：%s" % [String(sc[0]), String(sc[1])]
			if String(sc[2]) != "":
				prompt += "　聞こえた：“%s”" % String(sc[2])
			prompt += "　正しいのは？"
			var opts: Array = (sc[3] as Array).duplicate()
			_qs.append(_mkq(prompt, opts, String(opts[int(sc[4])]), String(sc[5]), "scene", {}, String(sc[2])))

	# ---- k6: 聞き取り (radio.js LISTEN の 6 種を 10 問に) ----
	func _gen_k6() -> void:
		var kinds := _shuffled(["vector", "contact", "takeoff", "traffic", "notme", "altim"])
		for i in range(10):
			_qs.append(_k6_one(kinds[i % kinds.size()]))

	func _k6_one(kind: String) -> Dictionary:
		match kind:
			"vector":
				var d: int = _pick([30, 60, 120, 150, 210, 240, 300, 330])
				var lr: String = "left" if _rand() < 0.5 else "right"
				var jl := "左" if lr == "left" else "右"
				var ft: int = _pick([3000, 3500, 4000, 4500, 5500])
				var say := "%s, turn %s heading %s, climb and maintain %s." % [CS_FULL, lr, _digits(_pad(d, 3)), _say_altitude(ft)]
				var ok := "%s・%s°・%s ft" % [jl, _pad(d, 3), _comma(ft)]
				return _mkq("（英語を聞いて）指示された旋回の方向・針路・高度は？",
					_four([ok, "%s・%s°・%s ft" % ["右" if jl == "左" else "左", _pad(d, 3), _comma(ft)],
						"%s・%s°・%s ft" % [jl, _pad((d + 180) % 360, 3), _comma(ft)],
						"%s・%s°・%s ft" % [jl, _pad(d, 3), _comma(ft + 1000)]], ok),
					ok, "左右 → 針路（3 桁）→ 高度の順に書き取る。", "listen", {}, say)
			"contact":
				var f: String = _pick(["119.75", "124.35", "125.8", "126.45", "132.65"])
				var code := _pad(_ri(1, 7) * 1000 + _ri(0, 7) * 100 + _ri(0, 7) * 10 + _ri(0, 7), 4)
				var say2 := "%s, contact LAB Departure %s, squawk %s." % [CS_FULL, _digits(f), _digits(code)]
				var ok2 := "%s・%s" % [f, code]
				var swap_c := code.substr(0, 2) + code.substr(3, 1) + code.substr(2, 1)
				return _mkq("（英語を聞いて）周波数とコードは？",
					_four([ok2, "%s・%s" % [f, swap_c], "%s・%s" % [str(int(f.split(".")[0]) + 1) + "." + f.split(".")[1], code]], ok2),
					ok2, "周波数は “point” の前後で区切る。コードは 4 桁。書き取ってから復唱する。", "listen", {}, say2)
			"takeoff":
				var r: String = _pick(["27L", "9R", "36", "18", "27R"])
				var luaw := _rand() < 0.4
				var say3 := "%s, runway %s%s." % [CS_FULL, _digits(r.replace("L", "").replace("R", "")) + (" left" if r.ends_with("L") else " right" if r.ends_with("R") else ""),
					", line up and wait" if luaw else ", wind three four zero at eight, cleared for takeoff"]
				var what := "入って待て（LUAW）" if luaw else "離陸許可"
				var ok3 := "滑走路 %s・%s" % [r, what]
				var alt_r := "18" if r == "36" else "36" if r == "18" else r.replace("L", "R") if r.ends_with("L") else r.replace("R", "L")
				return _mkq("（英語を聞いて）滑走路と指示は？",
					_four([ok3, "滑走路 %s・%s" % [alt_r, what], "滑走路 %s・%s" % [r, "離陸許可" if luaw else "入って待て（LUAW）"], "滑走路 %s・手前で待て（hold short）" % r], ok3),
					ok3, "LUAW は離陸許可ではない。平行滑走路の L / R を聞き分ける。", "listen", {}, say3)
			"traffic":
				var o := _ri(1, 12)
				var mi := _ri(2, 8)
				var dirs: Array = _pick([["northbound", "北向き"], ["southbound", "南向き"], ["eastbound", "東向き"], ["westbound", "西向き"]])
				var ft2: int = _pick([1500, 2000, 2500, 3500, 4500])
				var say4 := "%s, traffic, %s o'clock, %s miles, %s, a Cessna, %s." % [CS_FULL, _words(o), _words(mi), String(dirs[0]), _say_altitude(ft2)]
				var ok4 := "%d 時・%d マイル・%s・%s ft" % [o, mi, String(dirs[1]), _comma(ft2)]
				return _mkq("（英語を聞いて）交通情報の内容は？",
					_four([ok4, "%d 時・%d マイル・%s・%s ft" % [(o + 5) % 12 + 1, mi, String(dirs[1]), _comma(ft2)],
						"%d 時・%d マイル・%s・%s ft" % [o, mi + 2, String(dirs[1]), _comma(ft2)],
						"%d 時・%d マイル・%s・%s ft" % [o, mi, String(dirs[1]), _comma(ft2 + 1000)]], ok4),
					ok4, "型は「時計の方位・距離・進む方向・機種・高度」（AIM 4-1-15・JO 7110.65）。", "listen", {}, say4)
			"notme":
				var other: Array = _pick([["Cessna Four Kilo Papa", "Cessna 4KP"], ["Archer Seven Lima Echo", "Archer 7LE"], ["Cherokee Two Lima Alpha", "Cherokee 2LA"]])
				var r2: String = _pick(["36", "9R", "27L"])
				var say5 := "%s, runway %s, cleared to land." % [String(other[0]), _digits(r2.replace("L", "")) + (" left" if r2.ends_with("L") else "")]
				var ok5 := "%s 宛て（自分ではない）" % String(other[1])
				return _mkq("（英語を聞いて）この送信は誰宛て？（あなたは %s）" % CS_SHORT,
					_four([ok5, "%s（自分）宛て" % CS_SHORT, "全機宛て", "管制塔の独り言"], ok5),
					ok5, "似たコールサインに注意。自分宛てと確信できなければ確かめる（Verify）。", "listen", {}, say5)
			_: # altim
				var v: String = _pick(["29.87", "30.02", "29.95", "30.14", "29.79"])
				var say6 := "%s, LAB altimeter %s." % [CS_FULL, _digits(v.replace(".", ""))]
				var ok6 := "%s inHg" % v
				var sw := v.substr(0, 3) + v.substr(4, 1) + v.substr(3, 1)
				return _mkq("（英語を聞いて）高度計規正値は？",
					_four([ok6, "%s inHg" % sw, "29.92 inHg"], ok6),
					ok6, "高度計規正値は 1 桁ずつ。書き取って BARO に合わせる。", "listen", {}, say6)
