extends RefCounted

## CADET Godot port — Phase 2: 入力の橋渡し。
## controls.gd / school.gd は JS 版と同じ「コード文字列の集合 { has(code), shift }」で
## キーを読む。ここでは Godot のキーコードを JS の KeyboardEvent.code 文字列へ写し、
## 毎フレーム押下集合を作る。ゲームパッドは Input の joy API から読み、
## controls.js の readPad 形式 { stick, tr, tp, ty, brake } を返す。

# Godot Key -> JS code 文字列（controls / flight が参照する分）
static func _key_table() -> Dictionary:
	var t := {}
	t[KEY_W] = "KeyW"; t[KEY_S] = "KeyS"; t[KEY_A] = "KeyA"; t[KEY_D] = "KeyD"
	t[KEY_Q] = "KeyQ"; t[KEY_E] = "KeyE"; t[KEY_R] = "KeyR"; t[KEY_F] = "KeyF"
	t[KEY_B] = "KeyB"; t[KEY_T] = "KeyT"; t[KEY_G] = "KeyG"; t[KEY_V] = "KeyV"
	t[KEY_L] = "KeyL"; t[KEY_U] = "KeyU"; t[KEY_C] = "KeyC"; t[KEY_H] = "KeyH"
	t[KEY_X] = "KeyX"; t[KEY_Z] = "KeyZ"; t[KEY_M] = "KeyM"
	t[KEY_UP] = "ArrowUp"; t[KEY_DOWN] = "ArrowDown"; t[KEY_LEFT] = "ArrowLeft"; t[KEY_RIGHT] = "ArrowRight"
	t[KEY_SPACE] = "Space"; t[KEY_PAGEUP] = "PageUp"; t[KEY_PAGEDOWN] = "PageDown"
	t[KEY_ENTER] = "Enter"; t[KEY_KP_ENTER] = "NumpadEnter"; t[KEY_ESCAPE] = "Escape"
	t[KEY_BRACKETLEFT] = "BracketLeft"; t[KEY_BRACKETRIGHT] = "BracketRight"
	t[KEY_1] = "Digit1"; t[KEY_2] = "Digit2"; t[KEY_3] = "Digit3"
	t[KEY_KP_1] = "Numpad1"; t[KEY_KP_2] = "Numpad2"; t[KEY_KP_3] = "Numpad3"
	return t

static var _table: Dictionary = {}

# 現在押されているキーの集合を { code文字列: true } で返す（has は辞書参照で代替）
static func poll_keys() -> Dictionary:
	if _table.is_empty():
		_table = _key_table()
	var out := {}
	for k in _table:
		if Input.is_key_pressed(k):
			out[_table[k]] = true
	return out

static func shift_down() -> bool:
	return Input.is_key_pressed(KEY_SHIFT)

# --- ゲームパッド（Godot InputMap の joypad デバイスを直接読む） ---
# 標準割り当て（controls.js PADMAP0 と同じ）: 左スティック = ヨーク (軸0/1)、
# 右スティック X = ラダー (軸2)、右スティック Y = トリム (軸3)、トリガ = スロットルは
# controls 側の padInput が担うため、ここは readPad 形式の読み取りを提供する。
static func joy_connected() -> bool:
	return Input.get_connected_joypads().size() > 0

static func read_pad(_L = null, _dt: float = 0.0) -> Variant:
	var pads := Input.get_connected_joypads()
	if pads.is_empty():
		return null
	var dev: int = pads[0]
	var dz := func(v: float, z: float) -> float:
		return 0.0 if absf(v) < z else (v - signf(v) * z) / (1.0 - z)
	var lx: float = dz.call(Input.get_joy_axis(dev, JOY_AXIS_LEFT_X), 0.12)
	var ly: float = dz.call(Input.get_joy_axis(dev, JOY_AXIS_LEFT_Y), 0.12)
	var rx: float = dz.call(Input.get_joy_axis(dev, JOY_AXIS_RIGHT_X), 0.12)
	var stick := absf(lx) > 0.001 or absf(ly) > 0.001
	return {
		"stick": stick,
		"tr": lx, "tp": ly, "ty": rx,
		"brake": Input.is_joy_button_pressed(dev, JOY_BUTTON_A),
	}

# ボタンの立ち上がりを名前で返す（シーン側の離散操作用：フラップ等）
static var _prev_buttons := {}
static func pad_edges() -> Array:
	var out := []
	var pads := Input.get_connected_joypads()
	if pads.is_empty():
		_prev_buttons = {}
		return out
	var dev: int = pads[0]
	var names := {JOY_BUTTON_Y: "flaps", JOY_BUTTON_X: "flapsUp", JOY_BUTTON_B: "gearOrView", JOY_BUTTON_START: "pause"}
	for b in names:
		var now := Input.is_joy_button_pressed(dev, b)
		if now and not bool(_prev_buttons.get(b, false)):
			out.append(names[b])
		_prev_buttons[b] = now
	return out
