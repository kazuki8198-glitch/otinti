class_name G1000Display
extends Control

## CADET Godot port — Phase 2: G1000 主要画面 (PFD / MFD)
## 原典の表示要素の同等化 (コードの移植ではない):
##   flight-lab/src/avionics.js の drawPFD (640×400 論理座標) / drawMFD と
##   cadet/src/aircraft/g1000.js のベゼル/ソフトキー配置 (898fe8a)。
## Control のサブクラスで、カスタム _draw により論理 640×400 を描く
## (コントロールの実サイズへ等比スケール)。配色は原典 COLORS と同じ:
##   sky #2f6fbd / gnd #7a5434 / cyan #33d6ff / magenta #ff4fd8 /
##   green #3be36b / yellow #ffd23a / red #ff3b30 / panel #0b0f14
##
## 使い方 (統合側):
##   var g = G1000Display.new()          # または .tscn に Control として配置し
##   g.set_mode("PFD")                   #   スクリプトを attach
##   g.set_state(av_state, phys_out, extra)  # 毎フレーム (or 変化時)
##   g.knob("HDG", 1)                    # ノブ入力: 状態へ反映 + 再描画
##
## set_state の引数:
##   av_state: Dictionary — アビオニクス状態。無くても描ける (既定値で補う)。
##     使うキー: hdgBug, altSel, baro (inHg), baroUnit ("IN"/"HPA"), crs,
##     cdi ("GPS"/"VOR1"/"LOC1"…), mfdPage ("MAP"/"FPL"/"ENGINE"/"SYSTEM"/"NRST"),
##     mfdRangeIdx (RANGES の index), mapNorthUp (bool), qnh (実際の気圧 inHg:
##     phys 側にある場合はそちら優先), wind (bool)
##   phys_out: Dictionary — physics.gd の s["out"]。使うキー:
##     ias, tas, gs, trk, hdgTrue, pitch, bank, vsi, altTrue, rpm (または rpms[]),
##     fuel [L, R] (gal), fuelFlow, oilP[], oilT[], stallWarn, onGround,
##     rwyAlong, rwyCross (MFD マップの自機位置の fallback)
##   extra: Dictionary (任意) — { "pos": {"n":…, "e":…} 自機位置 (m, 表示原点系),
##     "elec": {"volts":…, "amps":…}, "fuelCap": 24.0, "traffic": [{n, e, hdg}] }
##
## knob(name, dir) -> String (操作結果の短い説明。avionics.js control() の流儀):
##   "HDG" 方位バグ ±1° / "HDG_BIG" ±10° / "ALT" 選択高度 ±100 ft /
##   "ALT_BIG" ±1000 ft / "BARO" ±0.01 inHg / "CRS" ±1° / "RANGE" マップ範囲 ±1 段
##   変更は内部状態 (_sel) に保持し、set_state で渡された av_state の同名キーが
##   あればそちらで上書きされる (統合側が真の状態を持つ前提)。

const W := 640.0
const H := 400.0
const DEG := PI / 180.0
const MAGVAR_W := 6.0 # physics.gd と同じ (西偏 6°)
const RANGES: Array[float] = [0.5, 1, 2, 5, 10, 15, 20, 30, 50] # nm
const NM := 1852.0

const C_SKY := Color("2f6fbd")
const C_GND := Color("7a5434")
const C_WHITE := Color("f2f4f7")
const C_CYAN := Color("33d6ff")
const C_MAGENTA := Color("ff4fd8")
const C_GREEN := Color("3be36b")
const C_YELLOW := Color("ffd23a")
const C_RED := Color("ff3b30")
const C_GREY := Color("9aa3ad")
const C_LINE := Color("5d6670")
const C_PANEL := Color("0b0f14")
const C_BOX := Color(0, 0, 0, 0.55)

# 架空訓練点 (avionics.js WAYPOINTS と同じ n/e, 表示原点系 m)
const WAYPOINTS: Array = [
	{"id": "LABRW", "n": -1200.0, "e": -40000.0, "kind": "apt"},
	{"id": "LABEA", "n": 9000.0, "e": -34000.0, "kind": "wpt"},
	{"id": "LABEB", "n": 15000.0, "e": -21000.0, "kind": "wpt"},
	{"id": "LABEC", "n": -6000.0, "e": -24000.0, "kind": "wpt"},
	{"id": "LABED", "n": -16000.0, "e": -38000.0, "kind": "wpt"},
	{"id": "LABEF", "n": -2000.0, "e": -33000.0, "kind": "wpt"},
]
# LAB RWY 36 (physics.gd lab_rwy)
const RWY := {"n": 0.0, "e": -40000.0, "trueHdg": 354.0, "len": 1200.0, "wid": 30.0}

var mode: String = "PFD" # "PFD" | "MFD"

var _av: Dictionary = {}
var _out: Dictionary = {}
var _extra: Dictionary = {}
var _sel: Dictionary = {"hdgBug": 360.0, "altSel": 3000.0, "baro": 29.92, "baroUnit": "IN", "crs": 360.0, "mfdRangeIdx": 4, "mapNorthUp": true, "mfdPage": "MAP"}

func _init() -> void:
	custom_minimum_size = Vector2(W, H)
	mouse_filter = MOUSE_FILTER_IGNORE

## "PFD" / "MFD" の切替 (g1000.js の 2 画面に対応)
func set_mode(m: String) -> void:
	mode = "MFD" if m.to_upper() == "MFD" else "PFD"
	queue_redraw()

func get_mode() -> String:
	return mode

## 状態を受け取る。av_state / phys_out は physics.gd / アビオニクス移植の
## Dictionary をそのまま渡す想定 (キーはクラス冒頭のドキュメント参照)。
func set_state(av_state: Dictionary, phys_out: Dictionary, extra: Dictionary = {}) -> void:
	_av = av_state if av_state != null else {}
	_out = phys_out if phys_out != null else {}
	_extra = extra if extra != null else {}
	for k in _sel.keys():
		if _av.has(k):
			_sel[k] = _av[k]
	queue_redraw()

## ノブ相当の入力。name はクラス冒頭の一覧、dir は +1 / -1。
func knob(name: String, dir: int) -> String:
	var d := 1 if dir >= 0 else -1
	var msg := ""
	match name.to_upper():
		"HDG":
			_sel["hdgBug"] = _wrap360(roundf(float(_sel["hdgBug"])) + d)
			if float(_sel["hdgBug"]) == 0.0:
				_sel["hdgBug"] = 360.0
			msg = "HDG %s" % _hdg_fmt(float(_sel["hdgBug"]))
		"HDG_BIG":
			_sel["hdgBug"] = _wrap360(roundf(float(_sel["hdgBug"])) + 10 * d)
			if float(_sel["hdgBug"]) == 0.0:
				_sel["hdgBug"] = 360.0
			msg = "HDG %s" % _hdg_fmt(float(_sel["hdgBug"]))
		"ALT":
			_sel["altSel"] = clampf(roundf(float(_sel["altSel"]) / 100.0) * 100.0 + 100.0 * d, 0.0, 18000.0)
			msg = "ALT SEL %d" % int(float(_sel["altSel"]))
		"ALT_BIG":
			_sel["altSel"] = clampf(roundf(float(_sel["altSel"]) / 100.0) * 100.0 + 1000.0 * d, 0.0, 18000.0)
			msg = "ALT SEL %d" % int(float(_sel["altSel"]))
		"BARO":
			_sel["baro"] = snappedf(clampf(float(_sel["baro"]) + 0.01 * d, 27.5, 31.5), 0.01)
			msg = "BARO %.2f" % float(_sel["baro"])
		"CRS":
			_sel["crs"] = _wrap360(roundf(float(_sel["crs"])) + d)
			if float(_sel["crs"]) == 0.0:
				_sel["crs"] = 360.0
			msg = "CRS %s" % _hdg_fmt(float(_sel["crs"]))
		"RANGE":
			_sel["mfdRangeIdx"] = clampi(int(_sel["mfdRangeIdx"]) + d, 0, RANGES.size() - 1)
			msg = "RANGE " + _fmt_num(RANGES[int(_sel["mfdRangeIdx"])]) + " NM"
		_:
			msg = "UNKNOWN KNOB " + name
	if msg.begins_with("HDG") or msg.begins_with("ALT") or msg.begins_with("BARO") or msg.begins_with("CRS") or msg.begins_with("RANGE"):
		_av["hdgBug"] = _sel["hdgBug"]
		_av["altSel"] = _sel["altSel"]
		_av["baro"] = _sel["baro"]
		_av["crs"] = _sel["crs"]
		_av["mfdRangeIdx"] = _sel["mfdRangeIdx"]
	queue_redraw()
	return msg

# ---------------------------------------------------------------- helpers
func _f(d: Dictionary, k: String, def: float = 0.0) -> float:
	var v = d.get(k, def)
	return float(v) if v != null else def

func _wrap360(a: float) -> float:
	var r := fmod(a, 360.0)
	return r + 360.0 if r < 0.0 else r

func _hdg_fmt(h: float) -> String:
	var v := int(round(_wrap360(h)))
	if v == 0:
		v = 360
	return "%03d" % v

## "%g" は GDScript の書式に無いので、整数なら整数表記にする小さな整形。
func _fmt_num(v: float) -> String:
	return str(int(v)) if v == floorf(v) else str(v)

func _to_mag(t: float) -> float:
	return _wrap360(t + MAGVAR_W)

func _alt_ind() -> float:
	var qnh := _f(_av, "qnh", _f(_out, "qnh", 29.92))
	return _f(_out, "altTrue") + (float(_sel["baro"]) - qnh) * 1000.0

var _s := 1.0 # 論理→実 px スケール
var _o := Vector2.ZERO # オフセット

func _pt(x: float, y: float) -> Vector2:
	return _o + Vector2(x, y) * _s

func _rect(x: float, y: float, w: float, h: float, col: Color, filled: bool = true, width: float = 1.0) -> void:
	draw_rect(Rect2(_pt(x, y), Vector2(w, h) * _s), col, filled, -1.0 if filled else width * _s)

func _line(x1: float, y1: float, x2: float, y2: float, col: Color, width: float = 1.5) -> void:
	draw_line(_pt(x1, y1), _pt(x2, y2), col, width * _s, true)

func _poly(pts: PackedVector2Array, col: Color, filled: bool = true, width: float = 1.5) -> void:
	var t := PackedVector2Array()
	t.resize(pts.size())
	for i in range(pts.size()):
		t[i] = _pt(pts[i].x, pts[i].y)
	if filled:
		draw_colored_polygon(t, col)
	else:
		t.append(t[0])
		draw_polyline(t, col, width * _s, true)

func _txt(s: String, x: float, y: float, size: float = 14.0, col: Color = C_WHITE, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_CENTER, weight: int = 600) -> void:
	var font := get_theme_default_font()
	var px := int(round(size * _s))
	# 位置合わせは自前で行う: draw_string の alignment + width=-1 は右寄せで
	# 1 文字しか描かれないことがあるため、実測幅で開始 x をずらす。
	var tw := font.get_string_size(s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, px).x
	var start := x * _s
	if align == HORIZONTAL_ALIGNMENT_CENTER:
		start -= tw * 0.5
	elif align == HORIZONTAL_ALIGNMENT_RIGHT:
		start -= tw
	# y は文字の縦中心として扱う (原典 txt() の textBaseline='middle' に対応)
	draw_string(font, _o + Vector2(start, y * _s + size * 0.36 * _s), s, HORIZONTAL_ALIGNMENT_LEFT, -1.0, px, col)

func _txt_left(s: String, x: float, y: float, size: float = 14.0, col: Color = C_WHITE) -> void:
	_txt(s, x, y, size, col, HORIZONTAL_ALIGNMENT_LEFT)

func _txt_right(s: String, x: float, y: float, size: float = 14.0, col: Color = C_WHITE) -> void:
	_txt(s, x, y, size, col, HORIZONTAL_ALIGNMENT_RIGHT)

## 矩形で多角形をクリップ (Sutherland–Hodgman)。姿勢儀の空/地面用。
func _clip_rect(pts: PackedVector2Array, r: Rect2) -> PackedVector2Array:
	var out := pts
	for edge in range(4):
		if out.is_empty():
			break
		var inp := out
		out = PackedVector2Array()
		for i in range(inp.size()):
			var cur := inp[i]
			var prv := inp[(i + inp.size() - 1) % inp.size()]
			var cur_in := _inside(cur, r, edge)
			var prv_in := _inside(prv, r, edge)
			if cur_in:
				if not prv_in:
					out.append(_intersect(prv, cur, r, edge))
				out.append(cur)
			elif prv_in:
				out.append(_intersect(prv, cur, r, edge))
	return out

func _inside(p: Vector2, r: Rect2, edge: int) -> bool:
	match edge:
		0: return p.x >= r.position.x
		1: return p.x <= r.position.x + r.size.x
		2: return p.y >= r.position.y
		_: return p.y <= r.position.y + r.size.y

func _intersect(a: Vector2, b: Vector2, r: Rect2, edge: int) -> Vector2:
	# 辺との交点。分母の符号を保つこと (maxf で潰すと交点が端点に張り付く)
	var vertical := edge <= 1
	var val := 0.0
	match edge:
		0: val = r.position.x
		1: val = r.position.x + r.size.x
		2: val = r.position.y
		_: val = r.position.y + r.size.y
	var d := (b.x - a.x) if vertical else (b.y - a.y)
	if absf(d) < 1e-9:
		return a
	var t := ((val - a.x) if vertical else (val - a.y)) / d
	return a + (b - a) * clampf(t, 0.0, 1.0)

# ---------------------------------------------------------------- draw
func _draw() -> void:
	if size.x < 4.0 or size.y < 4.0:
		return
	_s = minf(size.x / W, size.y / H)
	_o = (size - Vector2(W, H) * _s) * 0.5
	_rect(0, 0, W, H, Color.BLACK)
	if mode == "MFD":
		_draw_mfd()
	else:
		_draw_pfd()
	_draw_softkeys()

func _draw_softkeys() -> void:
	var labels: Array = []
	if mode == "MFD":
		labels = ["ENGINE", "SYSTEM", "MAP", "FPL", "NRST", "NORTH UP" if bool(_sel["mapNorthUp"]) else "TRACK UP", "", "PREV LEG", "NEXT LEG", "", "DCLTR", "SHW CHRT"]
	else:
		labels = ["", "INSET", "PFD", "OBS", "CDI", "BRG1", "XPDR", "IDENT", "BRG2", "NRST", "", "ALERTS"]
	var y := H - 22.0
	var sw := W / 12.0
	for i in range(12):
		_rect(i * sw + 1, y, sw - 2, 18, Color("2a3038"))
		if String(labels[i]) != "":
			_txt(String(labels[i]), i * sw + sw * 0.5, y + 10, 10 if String(labels[i]).length() > 6 else 12, C_WHITE)

# ================================================================ PFD
func _draw_pfd() -> void:
	var pitch := _f(_out, "pitch")
	var bank := _f(_out, "bank")
	var ias := maxf(0.0, _f(_out, "ias"))
	var vsi := _f(_out, "vsi")
	var alt_ind := _alt_ind()
	var hdg_mag := _to_mag(_f(_out, "hdgTrue"))
	var cx := W * 0.47
	var cy := H * 0.36
	var ppd := H * 0.0115

	# --- 姿勢儀 (背景全体) ---
	var att_rect := Rect2(0, 26, W, H - 48)
	var th := -bank * DEG
	var cs := cos(th)
	var sn := sin(th)
	var att := func(lx: float, ly: float) -> Vector2:
		var yy := ly + pitch * ppd
		return Vector2(cx + lx * cs - yy * sn, cy + lx * sn + yy * cs)
	var sky := PackedVector2Array([att.call(-900, -900), att.call(900, -900), att.call(900, 0), att.call(-900, 0)])
	var gnd := PackedVector2Array([att.call(-900, 0), att.call(900, 0), att.call(900, 900), att.call(-900, 900)])
	sky = _clip_rect(sky, att_rect)
	gnd = _clip_rect(gnd, att_rect)
	if sky.size() >= 3:
		_poly(sky, C_SKY)
	if gnd.size() >= 3:
		_poly(gnd, C_GND)
	var h1: Vector2 = att.call(-900, 0)
	var h2: Vector2 = att.call(900, 0)
	_line(h1.x, h1.y, h2.x, h2.y, C_WHITE, 2)
	# ピッチラダー (2.5° 毎、数字は 10° 毎)
	for ai in range(-12, 13):
		var a := float(ai) * 2.5
		if a == 0.0 or absf(a - pitch) > 22.0:
			continue
		var big := int(round(a)) % 10 == 0
		var wdt := 70.0 if big else (40.0 if int(round(a)) % 5 == 0 else 20.0)
		var p1: Vector2 = att.call(-wdt, -a)
		var p2: Vector2 = att.call(wdt, -a)
		if p1.y < att_rect.position.y or p1.y > att_rect.position.y + att_rect.size.y:
			continue
		_line(p1.x, p1.y, p2.x, p2.y, C_WHITE, 2 if big else 1.5)
		if big:
			var pl: Vector2 = att.call(-wdt - 18, -a)
			var pr: Vector2 = att.call(wdt + 18, -a)
			_txt(str(int(absf(a))), pl.x, pl.y, 13)
			_txt(str(int(absf(a))), pr.x, pr.y, 13)
	# バンクスケール + ロールポインタ
	var rr := H * 0.25
	draw_arc(_pt(cx, cy), rr * _s, -150.0 * DEG, -30.0 * DEG, 48, C_WHITE, 2.0 * _s, true)
	for a in [-60, -45, -30, -20, -10, 10, 20, 30, 45, 60]:
		var t := (-90.0 + float(a)) * DEG
		var ln := 14.0 if abs(a) % 30 == 0 else 8.0
		_line(cx + cos(t) * rr, cy + sin(t) * rr, cx + cos(t) * (rr + ln), cy + sin(t) * (rr + ln), C_WHITE, 2)
	_poly(PackedVector2Array([Vector2(cx, cy - rr), Vector2(cx - 8, cy - rr - 12), Vector2(cx + 8, cy - rr - 12)]), C_WHITE)
	var rp := -bank * DEG
	var rc := Vector2(cx, cy) + Vector2(sin(rp), -cos(rp)) * 0.0 # ロールポインタは回転して描く
	var rbase := Vector2(cx, cy)
	var rrot := func(lx: float, ly: float) -> Vector2:
		var c2 := cos(-bank * DEG)
		var s2 := sin(-bank * DEG)
		return rbase + Vector2(lx * c2 - ly * s2, lx * s2 + ly * c2)
	_poly(PackedVector2Array([rrot.call(0, -rr + 2), rrot.call(-9, -rr + 16), rrot.call(9, -rr + 16)]), C_WHITE)
	# 機体シンボル (黄)
	_poly(PackedVector2Array([Vector2(cx - 70, cy), Vector2(cx - 28, cy), Vector2(cx - 22, cy + 8), Vector2(cx - 70, cy + 8)]), C_YELLOW)
	_poly(PackedVector2Array([Vector2(cx + 70, cy), Vector2(cx + 28, cy), Vector2(cx + 22, cy + 8), Vector2(cx + 70, cy + 8)]), C_YELLOW)
	_poly(PackedVector2Array([Vector2(cx, cy), Vector2(cx - 26, cy + 18), Vector2(cx, cy + 10), Vector2(cx + 26, cy + 18)]), C_YELLOW)
	if bool(_out.get("stallWarn", false)):
		_rect(cx - 60, cy + 70, 120, 26, C_RED)
		_txt("STALL", cx, cy + 84, 18, C_WHITE)

	# --- 速度テープ (左) ---
	var V: Dictionary = _extra.get("V", _av.get("V", {}))
	var vs: Dictionary = {"s0": 45.0, "s1": 50.0, "fe": 102.0, "no": 125.0, "ne": 154.0}
	for k in vs.keys():
		if V.has(k):
			vs[k] = float(V[k])
	var tx := W * 0.07
	var tw := W * 0.12
	var ty0 := cy - H * 0.22
	var tht := H * 0.44
	var kpp := tht / 60.0
	_rect(tx, ty0, tw, tht, C_BOX)
	_rect(tx, ty0, tw, tht, C_LINE, false, 1.5)
	var band := func(k1: float, k2: float, col: Color, bx: float, bw: float) -> void:
		var y1 := clampf(cy - (k2 - ias) * kpp, ty0, ty0 + tht)
		var y2 := clampf(cy - (k1 - ias) * kpp, ty0, ty0 + tht)
		if y2 > y1:
			_rect(bx, y1, bw, y2 - y1, col)
	band.call(vs["s0"], vs["fe"], C_WHITE, tx + tw - 6, 6.0)
	band.call(vs["s1"], vs["no"], C_GREEN, tx + tw - 12, 6.0)
	band.call(vs["no"], vs["ne"], C_YELLOW, tx + tw - 12, 6.0)
	band.call(vs["ne"], vs["ne"] + 60.0, C_RED, tx + tw - 12, 6.0)
	var k0 := int(floor((ias - 35.0) / 10.0)) * 10
	for k in range(k0, int(ias) + 36, 5):
		if k < 20:
			continue
		var y := cy - (float(k) - ias) * kpp
		if y < ty0 or y > ty0 + tht:
			continue
		_line(tx + tw - 22, y, tx + tw - 12, y, C_WHITE, 2)
		if k % 10 == 0:
			_txt(str(k), tx + tw * 0.42, y, 15)
	_poly(PackedVector2Array([Vector2(tx + 4, cy - 15), Vector2(tx + tw - 6, cy - 15), Vector2(tx + tw + 4, cy), Vector2(tx + tw - 6, cy + 15), Vector2(tx + 4, cy + 15)]), Color.BLACK)
	_poly(PackedVector2Array([Vector2(tx + 4, cy - 15), Vector2(tx + tw - 6, cy - 15), Vector2(tx + tw + 4, cy), Vector2(tx + tw - 6, cy + 15), Vector2(tx + 4, cy + 15)]), C_WHITE, false, 2)
	_txt("---" if ias < 20.0 else str(int(round(ias))), tx + tw * 0.45, cy, 21, C_RED if bool(_out.get("stallWarn", false)) else C_WHITE)
	_rect(tx, ty0 + tht, tw, 22, Color.BLACK)
	_rect(tx, ty0 + tht, tw, 22, C_LINE, false, 1)
	_txt("TAS %dKT" % int(round(_f(_out, "tas"))), tx + tw * 0.5, ty0 + tht + 12, 12)

	# --- 高度テープ (右) + 選択高度 + 気圧 ---
	var ax := W * 0.75
	var aw := W * 0.12
	var fpp := tht / 600.0
	_rect(ax, ty0, aw, tht, C_BOX)
	_rect(ax, ty0, aw, tht, C_LINE, false, 1.5)
	var f0 := int(floor((alt_ind - 350.0) / 100.0)) * 100
	for f in range(f0, int(alt_ind) + 351, 20):
		var y := cy - (float(f) - alt_ind) * fpp
		if y < ty0 or y > ty0 + tht:
			continue
		if f % 100 == 0:
			_line(ax, y, ax + 12, y, C_WHITE, 2)
			_txt(str(f), ax + aw * 0.58, y, 14)
		else:
			_line(ax, y, ax + 6, y, C_WHITE, 1)
	var ysel := clampf(cy - (float(_sel["altSel"]) - alt_ind) * fpp, ty0, ty0 + tht)
	_poly(PackedVector2Array([Vector2(ax, ysel - 8), Vector2(ax + 10, ysel - 8), Vector2(ax + 10, ysel + 8), Vector2(ax, ysel + 8), Vector2(ax + 5, ysel)]), C_CYAN)
	_poly(PackedVector2Array([Vector2(ax + aw - 2, cy - 15), Vector2(ax + 12, cy - 15), Vector2(ax + 2, cy), Vector2(ax + 12, cy + 15), Vector2(ax + aw - 2, cy + 15)]), Color.BLACK)
	_poly(PackedVector2Array([Vector2(ax + aw - 2, cy - 15), Vector2(ax + 12, cy - 15), Vector2(ax + 2, cy), Vector2(ax + 12, cy + 15), Vector2(ax + aw - 2, cy + 15)]), C_WHITE, false, 2)
	_txt(str(int(round(alt_ind / 20.0)) * 20), ax + aw * 0.55, cy, 19)
	_rect(ax, ty0 - 24, aw, 22, Color.BLACK)
	_rect(ax, ty0 - 24, aw, 22, C_LINE, false, 1)
	_txt(str(int(float(_sel["altSel"]))), ax + aw * 0.5, ty0 - 12, 15, C_CYAN)
	_rect(ax, ty0 + tht, aw, 22, Color.BLACK)
	_rect(ax, ty0 + tht, aw, 22, C_LINE, false, 1)
	_txt("%.2fIN" % float(_sel["baro"]) if String(_sel["baroUnit"]) == "IN" else "%dHPA" % int(round(float(_sel["baro"]) * 33.8639)), ax + aw * 0.5, ty0 + tht + 12, 13, C_CYAN)

	# --- VSI ---
	var vx := ax + aw + 4
	var vw := W * 0.05
	_rect(vx, ty0 + tht * 0.15, vw, tht * 0.7, C_BOX)
	_rect(vx, ty0 + tht * 0.15, vw, tht * 0.7, C_LINE, false, 1)
	for f in [-2000, -1000, -500, 0, 500, 1000, 2000]:
		var y := cy - signf(float(f)) * sqrt(absf(float(f)) / 2000.0) * tht * 0.33
		_line(vx, y, vx + 8, y, C_WHITE, 1.5)
		if absf(float(f)) >= 1000.0:
			_txt(str(int(absf(float(f)) / 1000.0)), vx + vw * 0.65, y, 12)
	var yv := cy - signf(vsi) * sqrt(minf(absf(vsi), 2000.0) / 2000.0) * tht * 0.33
	_poly(PackedVector2Array([Vector2(vx + 2, yv), Vector2(vx + 14, yv - 9), Vector2(vx + vw + 18, yv - 9), Vector2(vx + vw + 18, yv + 9), Vector2(vx + 14, yv + 9)]), Color.BLACK)
	_poly(PackedVector2Array([Vector2(vx + 2, yv), Vector2(vx + 14, yv - 9), Vector2(vx + vw + 18, yv - 9), Vector2(vx + vw + 18, yv + 9), Vector2(vx + 14, yv + 9)]), C_WHITE, false, 1.5)
	_txt("0" if absf(vsi) < 50.0 else str(int(round(vsi / 50.0)) * 50), vx + vw * 0.75 + 8, yv, 12)

	_draw_hsi(cx, H * 0.80, H * 0.16, hdg_mag)
	_draw_top_bar()

func _draw_hsi(hx: float, hy: float, hr: float, hdg_mag: float) -> void:
	draw_circle(_pt(hx, hy), (hr + 6) * _s, Color(0, 0, 0, 0.75))
	var rot := func(lx: float, ly: float) -> Vector2:
		var t := -hdg_mag * DEG
		return Vector2(hx + lx * cos(t) - ly * sin(t), hy + lx * sin(t) + ly * cos(t))
	for a in range(0, 360, 5):
		var ln := 12.0 if a % 10 == 0 else 6.0
		var t := (float(a) - 90.0) * DEG
		_line(hx + cos(t) * (hr - ln), hy + sin(t) * (hr - ln), hx + cos(t) * hr, hy + sin(t) * hr, C_WHITE, 1.5)
		if a % 30 == 0:
			var lp: Vector2 = rot.call(0, -hr + 24)
			_txt("N" if a == 0 else ("E" if a == 90 else ("S" if a == 180 else ("W" if a == 270 else str(a / 10)))), lp.x, lp.y, 13)
	# 方位バグ (シアン) / トラック (マゼンタ菱形)
	var bug: Vector2 = rot.call(0, -hr)
	var bl: Vector2 = rot.call(-9, -hr + 6)
	var br: Vector2 = rot.call(9, -hr + 6)
	_poly(PackedVector2Array([rot.call(-9, -hr - 1), rot.call(-9, -hr + 6), rot.call(-3, -hr + 6), rot.call(0, -hr + 2), rot.call(3, -hr + 6), rot.call(9, -hr + 6), rot.call(9, -hr - 1)]), C_CYAN)
	var trk_mag := _to_mag(_f(_out, "trk", _f(_out, "hdgTrue")))
	var trot := func(lx: float, ly: float) -> Vector2:
		var t := -trk_mag * DEG
		return Vector2(hx + lx * cos(t) - ly * sin(t), hy + lx * sin(t) + ly * cos(t))
	_poly(PackedVector2Array([trot.call(0, -hr + 2), trot.call(-5, -hr + 9), trot.call(0, -hr + 16), trot.call(5, -hr + 9)]), C_MAGENTA)
	# コースポインタ + CDI バー (GPS=マゼンタ / それ以外=緑)。navSolve 未移植のため
	# 偏差は av の "navDots" (extra/av にあれば) を使い、無ければコース線のみ描く。
	var ccol := C_MAGENTA if String(_av.get("cdi", "GPS")) == "GPS" else C_GREEN
	var crs := float(_sel["crs"])
	var crot := func(lx: float, ly: float) -> Vector2:
		var t := -crs * DEG
		return Vector2(hx + lx * cos(t) - ly * sin(t), hy + lx * sin(t) + ly * cos(t))
	var c1: Vector2 = crot.call(0, -hr + 30)
	var c2: Vector2 = crot.call(0, -hr * 0.42)
	_line(c1.x, c1.y, c2.x, c2.y, ccol, 4)
	var c3: Vector2 = crot.call(0, hr * 0.42)
	var c4: Vector2 = crot.call(0, hr - 30)
	_line(c3.x, c3.y, c4.x, c4.y, ccol, 4)
	if _av.has("navDots") or _extra.has("navDots"):
		var dots := clampf(_f(_av, "navDots", _f(_extra, "navDots")), -2.5, 2.5)
		var d1: Vector2 = crot.call(dots * hr * 0.17, -hr * 0.38)
		var d2: Vector2 = crot.call(dots * hr * 0.17, hr * 0.38)
		_line(d1.x, d1.y, d2.x, d2.y, ccol, 4)
	_poly(PackedVector2Array([Vector2(hx, hy - hr + 4), Vector2(hx - 7, hy - hr - 8), Vector2(hx + 7, hy - hr - 8)]), C_WHITE)
	_line(hx, hy - 16, hx, hy + 14, C_WHITE, 2.5)
	_line(hx - 14, hy - 4, hx + 14, hy - 4, C_WHITE, 2.5)
	_rect(hx - 26, hy - hr - 34, 52, 22, Color.BLACK)
	_rect(hx - 26, hy - hr - 34, 52, 22, C_WHITE, false, 1)
	_txt(_hdg_fmt(hdg_mag) + "°", hx, hy - hr - 22, 15)
	_rect(hx - hr - 92, hy - hr - 10, 86, 22, Color.BLACK)
	_rect(hx - hr - 92, hy - hr - 10, 86, 22, C_LINE, false, 1)
	_txt("HDG " + _hdg_fmt(float(_sel["hdgBug"])) + "°", hx - hr - 49, hy - hr + 2, 13, C_CYAN)
	_rect(hx + hr + 6, hy - hr - 10, 86, 22, Color.BLACK)
	_rect(hx + hr + 6, hy - hr - 10, 86, 22, C_LINE, false, 1)
	_txt("CRS " + _hdg_fmt(crs) + "°", hx + hr + 49, hy - hr + 2, 13, ccol)

func _draw_top_bar() -> void:
	_rect(0, 0, W, 26, Color("05070a"))
	_txt_left("NAV1 109.90 <-> 113.50", 8, 14, 12, C_GREEN)
	_txt_right("COM1 118.300 <-> 121.700", W - 8, 14, 12, C_GREEN)
	_txt("NO FLIGHT PLAN" if not _av.has("fpl") else "FPL ACTIVE", W * 0.5, 14, 12, C_MAGENTA)
	# GS / TRK / OAT (左下)
	_rect(8, H - 112, 128, 82, Color(0, 0, 0, 0.75))
	_rect(8, H - 112, 128, 82, C_LINE, false, 1)
	_txt_left("GS  %dKT" % int(round(_f(_out, "gs"))), 14, H - 100, 13)
	_txt_left("TRK %s°" % _hdg_fmt(_to_mag(_f(_out, "trk", _f(_out, "hdgTrue")))), 14, H - 82, 13, C_MAGENTA)
	_txt_left("OAT %d°C" % int(round(_f(_out, "oat"))), 14, H - 64, 13)
	var rpm := _rpm()
	_rect(8, H - 158, 128, 40, Color("05070a"))
	_rect(8, H - 158, 128, 40, C_LINE, false, 1)
	_txt_left("ENG %s" % ("RUN" if rpm > 400.0 else "STOP"), 14, H - 146, 13, C_GREEN if rpm > 400.0 else C_RED)
	_txt_left("%d RPM" % int(round(rpm)), 14, H - 128, 13)

func _rpm() -> float:
	if _out.has("rpms") and (_out["rpms"] as Array).size() > 0:
		return float((_out["rpms"] as Array)[0])
	return _f(_out, "rpm")

# ================================================================ MFD
func _draw_mfd() -> void:
	var ew := W * 0.2
	_draw_engine_strip(ew)
	var page := String(_sel["mfdPage"])
	match page:
		"ENGINE", "SYSTEM":
			_draw_engine_page(ew, page)
		"FPL":
			_draw_fpl_page(ew)
		_:
			_draw_map(ew)
	# データバー
	_rect(ew, 0, W - ew, 26, Color("05070a"))
	_txt_left("GS", ew + 8, 14, 11, C_GREY)
	_txt_left("%dKT" % int(round(_f(_out, "gs"))), ew + 40, 14, 13)
	_txt_left("TRK", ew + (W - ew) * 0.4, 14, 11, C_GREY)
	_txt_left("%s°" % _hdg_fmt(_to_mag(_f(_out, "trk", _f(_out, "hdgTrue")))), ew + (W - ew) * 0.4 + 34, 14, 13)
	_txt_left("RNG", ew + (W - ew) * 0.75, 14, 11, C_GREY)
	_txt_left(_fmt_num(RANGES[int(_sel["mfdRangeIdx"])]) + " NM", ew + (W - ew) * 0.75 + 38, 14, 13, C_MAGENTA)

func _draw_engine_strip(ew: float) -> void:
	_rect(0, 0, ew, H, Color("05070a"))
	_rect(0, 0, ew, H, C_LINE, false, 1)
	_txt("ENGINE", ew * 0.5, 15, 13)
	# RPM アーク (0..2800, 緑 500..2700 / 赤 2700..)
	var rpm := clampf(_rpm(), 0.0, 2800.0)
	var rc := Vector2(ew * 0.5, 70)
	var rad := ew * 0.34
	draw_arc(_pt(rc.x, rc.y), rad * _s, (-210.0 + 240.0 * 500.0 / 2800.0) * DEG, (-210.0 + 240.0 * 2700.0 / 2800.0) * DEG, 32, C_GREEN, 7 * _s, true)
	draw_arc(_pt(rc.x, rc.y), rad * _s, (-210.0 + 240.0 * 2700.0 / 2800.0) * DEG, (-210.0 + 240.0) * DEG, 8, C_RED, 7 * _s, true)
	var ta := (210.0 - 240.0 * rpm / 2800.0) * -DEG
	_line(rc.x, rc.y, rc.x + cos(ta) * (rad - 4), rc.y + sin(ta) * (rad - 4), C_WHITE, 3)
	_txt(str(int(round(rpm))), rc.x, rc.y + 24, 16)
	_txt("RPM", rc.x, rc.y + 40, 11, C_GREY)
	# 数値行 (原典 drawMFD の rows と同じ項目)
	var fuel: Array = _out.get("fuel", [0.0, 0.0])
	var cap := _f(_extra, "fuelCap", _f(_av, "fuelCap", 24.0))
	var oil_p: Array = _out.get("oilP", [])
	var oil_t: Array = _out.get("oilT", [])
	var elec: Dictionary = _extra.get("elec", {})
	var volts = elec.get("volts", _out.get("volts", null))
	var amps = elec.get("amps", _out.get("amps", null))
	var rows: Array = [
		["PWR", "%d %%" % int(round(_f(_out, "powerPct")))],
		["FFLOW GPH", "%.1f" % _f(_out, "fuelFlow")],
		["OIL PSI", str(int(round(float(oil_p[0])))) if oil_p.size() > 0 else "—"],
		["OIL F", str(int(round(float(oil_t[0])))) if oil_t.size() > 0 else "—"],
		["FUEL L GAL", "%.1f" % (float(fuel[0]) if fuel.size() > 0 else 0.0)],
		["FUEL R GAL", "%.1f" % (float(fuel[1]) if fuel.size() > 1 else 0.0)],
		["VOLTS", "%.1f" % float(volts) if volts != null else "—"],
		["AMPS", ("+" if float(amps) > 0.0 else "") + str(int(round(float(amps)))) if amps != null else "—"],
	]
	var y := 128.0
	for r in rows:
		_txt_left(String(r[0]), 8, y, 11, C_GREY)
		_txt_right(String(r[1]), ew - 8, y, 13, C_GREY if String(r[1]) == "—" else C_WHITE)
		y += 30.0
	# 燃料バー
	for i in range(2):
		var fv := float(fuel[i]) if fuel.size() > i else 0.0
		_rect(8, y + 9, ew - 16, 6, Color("1b222b"))
		_rect(8, y + 9, (ew - 16) * clampf(fv / maxf(cap, 1.0), 0, 1), 6, C_YELLOW if fv < 3.0 else C_GREEN)
		y += 22.0

func _draw_engine_page(ew: float, page: String) -> void:
	var px := ew
	var pw := W - ew
	_rect(px, 26, pw, H - 48, Color("05070a"))
	_txt("ENGINE PAGE" if page == "ENGINE" else "SYSTEM PAGE", px + pw * 0.5, 52, 14)
	var fuel: Array = _out.get("fuel", [0.0, 0.0])
	var oil_p: Array = _out.get("oilP", [])
	var oil_t: Array = _out.get("oilT", [])
	var rows: Array = [
		["RPM", str(int(round(_rpm())))],
		["OIL PSI", str(int(round(float(oil_p[0])))) if oil_p.size() > 0 else "—"],
		["OIL F", str(int(round(float(oil_t[0])))) if oil_t.size() > 0 else "—"],
		["FFLOW GPH", "%.1f" % _f(_out, "fuelFlow")],
		["FUEL L GAL", "%.1f" % (float(fuel[0]) if fuel.size() > 0 else 0.0)],
		["FUEL R GAL", "%.1f" % (float(fuel[1]) if fuel.size() > 1 else 0.0)],
		["FUEL TOTAL", "%.1f GAL" % ((float(fuel[0]) if fuel.size() > 0 else 0.0) + (float(fuel[1]) if fuel.size() > 1 else 0.0))],
	]
	var y := 92.0
	for r in rows:
		_txt_left(String(r[0]), px + 30, y, 13, C_GREY)
		_txt_right(String(r[1]), px + pw - 30, y, 15, C_GREY if String(r[1]) == "—" else C_WHITE)
		y += 34.0

func _draw_fpl_page(ew: float) -> void:
	var px := ew
	var pw := W - ew
	_rect(px, 26, pw, H - 48, Color("05070a"))
	_txt("ACTIVE FLIGHT PLAN", px + pw * 0.5, 52, 14)
	var wps: Array = ["LABRW", "LABEA", "LABEB"]
	if _av.has("fpl") and (_av["fpl"] as Dictionary).has("wps"):
		wps = (_av["fpl"] as Dictionary)["wps"]
	var active := 1
	if _av.has("fpl") and (_av["fpl"] as Dictionary).has("active"):
		active = int((_av["fpl"] as Dictionary)["active"])
	var y := 96.0
	for i in range(wps.size()):
		if i == active:
			_rect(px + 10, y - 13, pw - 20, 26, Color("2a0f28"))
			_rect(px + 10, y - 13, pw - 20, 26, C_MAGENTA, false, 1)
		_txt_left(("-> " if i == active else "   ") + String(wps[i]), px + 30, y, 14, C_MAGENTA if i == active else C_WHITE)
		y += 30.0

func _pos_ne() -> Vector2:
	if _extra.has("pos"):
		var p: Dictionary = _extra["pos"]
		return Vector2(_f(p, "n"), _f(p, "e"))
	if _av.has("pos"):
		var p2: Dictionary = _av["pos"]
		return Vector2(_f(p2, "n"), _f(p2, "e"))
	if _out.has("rwyAlong"):
		# physics の滑走路座標 → (n, e) (physics.gd rwyToNE と同じ式)
		var h := float(RWY["trueHdg"]) * DEG
		var along := _f(_out, "rwyAlong")
		var cross := _f(_out, "rwyCross")
		return Vector2(float(RWY["n"]) + along * cos(h) - cross * sin(h), float(RWY["e"]) + along * sin(h) + cross * cos(h))
	return Vector2(float(RWY["n"]), float(RWY["e"]))

func _draw_map(ew: float) -> void:
	var px := ew
	var pw := W - ew
	var pos := _pos_ne()
	var rng := RANGES[int(_sel["mfdRangeIdx"])]
	_rect(px, 26, pw, H - 48, Color("0a1420"))
	var cx := px + pw * 0.5
	var cy := 26.0 + (H - 48.0) * 0.58
	var ppn := ((H - 48.0) * 0.42) / rng
	var up := 0.0 if bool(_sel["mapNorthUp"]) else _to_mag(_f(_out, "trk", _f(_out, "hdgTrue"))) - MAGVAR_W
	var to_scr := func(n: float, e: float) -> Vector2:
		var dn := (n - pos.x) / NM
		var de := (e - pos.y) / NM
		var a := -up * DEG
		return Vector2(cx + (de * cos(a) - dn * sin(a)) * ppn, cy - (de * sin(a) + dn * cos(a)) * ppn)
	# レンジリング
	for k in [0.5, 1.0]:
		draw_arc(_pt(cx, cy), rng * k * ppn * _s, 0, TAU, 64, Color("26384a"), 1.0 * _s, true)
	_txt(_fmt_num(rng * 0.5), cx + rng * 0.5 * ppn * 0.7, cy - rng * 0.5 * ppn * 0.7, 11, C_GREY)
	# LAB RWY 36
	var ra: Vector2 = to_scr.call(float(RWY["n"]), float(RWY["e"]))
	var rb_ne := Vector2(float(RWY["n"]) + float(RWY["len"]) * cos(float(RWY["trueHdg"]) * DEG), float(RWY["e"]) + float(RWY["len"]) * sin(float(RWY["trueHdg"]) * DEG))
	var rb: Vector2 = to_scr.call(rb_ne.x, rb_ne.y)
	_line(ra.x, ra.y, rb.x, rb.y, Color("d6dde5"), 3)
	_txt_left("LAB 36", rb.x + 8, rb.y, 11, Color("d6dde5"))
	# 場周パターン (滑走路座標 along/cross の矩形: 左旋回・ダウンウィンド側 cross<0)
	var pat: Array = [[-200.0, -900.0], [1400.0, -900.0], [1400.0, 0.0], [-200.0, 0.0]]
	var pat_pts := PackedVector2Array()
	for q in pat:
		var h := float(RWY["trueHdg"]) * DEG
		var nn := float(RWY["n"]) + float(q[0]) * cos(h) - float(q[1]) * sin(h)
		var ee := float(RWY["e"]) + float(q[0]) * sin(h) + float(q[1]) * cos(h)
		pat_pts.append(to_scr.call(nn, ee))
	_poly(pat_pts, Color(0.6, 0.7, 0.8, 0.6), false, 1.5)
	_txt_left("PATTERN", pat_pts[0].x + 6, pat_pts[0].y - 8, 10, C_GREY)
	# 訓練点
	for wp in WAYPOINTS:
		var sp: Vector2 = to_scr.call(_f(wp, "n"), _f(wp, "e"))
		if sp.x < px - 20 or sp.x > px + pw + 20 or sp.y < 6 or sp.y > H - 28:
			continue
		if String(wp["kind"]) == "apt":
			continue
		_poly(PackedVector2Array([sp + Vector2(0, -6), sp + Vector2(6, 0), sp + Vector2(0, 6), sp + Vector2(-6, 0)]), C_CYAN, false, 2)
		_txt_left(String(wp["id"]), sp.x + 9, sp.y - 6, 11, C_CYAN)
	# トラフィック (extra.traffic があれば)
	if _extra.has("traffic"):
		for t in _extra["traffic"]:
			var td: Dictionary = t
			var sp2: Vector2 = to_scr.call(_f(td, "n"), _f(td, "e"))
			if sp2.x < px or sp2.x > px + pw or sp2.y < 26 or sp2.y > H - 22:
				continue
			_poly(PackedVector2Array([sp2 + Vector2(0, -7), sp2 + Vector2(5, 5), sp2 + Vector2(-5, 5)]), Color("dfe7ee"))
	# 自機シンボル
	var trk_rel := (0.0 if bool(_sel["mapNorthUp"]) else _f(_out, "hdgTrue") - up) * DEG
	var ac := PackedVector2Array()
	for q in [Vector2(0, -14), Vector2(3, -4), Vector2(12, 2), Vector2(12, 5), Vector2(3, 3), Vector2(2, 10), Vector2(6, 13), Vector2(-6, 13), Vector2(-2, 10), Vector2(-3, 3), Vector2(-12, 5), Vector2(-12, 2), Vector2(-3, -4)]:
		ac.append(Vector2(cx, cy) + Vector2(q.x * cos(trk_rel) - q.y * sin(trk_rel), q.x * sin(trk_rel) + q.y * cos(trk_rel)))
	_poly(ac, C_WHITE)
	_txt_left("NORTH UP" if bool(_sel["mapNorthUp"]) else "TRACK UP", px + 8, 42, 11, C_GREY)
	_txt_left("RNG " + _fmt_num(rng) + " NM", px + 8, 58, 11)
