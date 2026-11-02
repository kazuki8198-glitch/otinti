extends SceneTree
# ACCEPTANCE TEST (v1.0.1, permanent suite): the real-input playability
# proof that v1.0.0 never had. Boots the REAL main scene in normal mode,
# and drives it ONLY through real input events (Input.parse_input_event:
# mouse clicks on the title buttons, key presses/releases) — never by
# calling bridge internals with scripted key dictionaries.
#
# Flow: cold boot -> title screen is up and the sim is frozen -> real
# mouse click "フリー飛行" -> guide visible -> R held (real key events)
# -> ground speed builds -> rotate -> liftoff -> Esc back to title ->
# real click "キャリアをはじめる" -> intro dialog driven with Enter/1
# keys -> career driven with F3 / drill answers / exam answers (correct
# option read from the scene's own exam state, like the career bot) ->
# first career flight starts -> real-input control (takeoff if it starts
# on the ground, control-authority checks if airborne) -> Esc -> title ->
# free flight -> key 2 apron start -> PARK trap regression: R cannot move
# the aircraft while parked, Shift+B releases the brake, then it rolls.
#
# Run (clean profile = true cold boot):
#   rm -rf ~/.local/share/godot/app_userdata/CADET
#   xvfb-run -a -s "-screen 0 1280x840x24" <godot> --path . \
#     --resolution 960x540 -s test/run_play.gd

var fails := 0
var checks := 0
var _held := {}

func chk(c: bool, msg: String) -> void:
	checks += 1
	if c:
		print("ok   ", msg)
	else:
		fails += 1
		print("FAIL ", msg)

func _key(kc: int, down: bool, shift: bool = false) -> void:
	var ev := InputEventKey.new()
	ev.keycode = kc
	ev.physical_keycode = kc
	ev.pressed = down
	ev.shift_pressed = shift
	Input.parse_input_event(ev)

func _tap(kc: int, shift: bool = false) -> void:
	# press+release queued back-to-back dispatch in order within one input
	# flush; only the discrete (_unhandled_input) paths use taps, and they
	# trigger on the press. (Held keys go through _hold/_release instead.)
	_key(kc, true, shift)
	_key(kc, false, shift)
	await process_frame

func _hold(kc: int) -> void:
	if not _held.has(kc):
		_held[kc] = true
		_key(kc, true)

func _release(kc: int) -> void:
	if _held.has(kc):
		_held.erase(kc)
		_key(kc, false)

func _release_all() -> void:
	for kc in _held.keys():
		_key(kc, false)
	_held.clear()

# a REAL mouse click at the button's centre, through the viewport GUI
func _click(btn: Button) -> bool:
	if btn == null or not btn.is_visible_in_tree():
		return false
	var c := btn.get_global_rect().get_center()
	var mo := InputEventMouseMotion.new()
	mo.position = c
	mo.global_position = c
	Input.parse_input_event(mo)
	await process_frame
	var pr := InputEventMouseButton.new()
	pr.button_index = MOUSE_BUTTON_LEFT
	pr.pressed = true
	pr.position = c
	pr.global_position = c
	Input.parse_input_event(pr)
	await process_frame
	await process_frame
	var rl := InputEventMouseButton.new()
	rl.button_index = MOUSE_BUTTON_LEFT
	rl.pressed = false
	rl.position = c
	rl.global_position = c
	Input.parse_input_event(rl)
	await process_frame
	await process_frame
	return true

# hold R and fly a takeoff roll with real key events; returns evidence
func _takeoff_roll(main, rotate: bool = true) -> Dictionary:
	var b = main.bridge
	var s0: Dictionary = b.get_s()
	var alt0 := float(s0["out"]["altTrue"])
	var r := {"gs_max": 0.0, "thr": 0.0, "lifted": false, "climbed": false, "crashed": false, "frames": 0}
	_hold(KEY_R)
	while r["frames"] < 6000:
		await process_frame
		r["frames"] += 1
		var s: Dictionary = b.get_s()
		if s == null:
			break
		var pnl: Dictionary = b.panel()
		r["thr"] = maxf(float(r["thr"]), float(pnl["thr"]))
		r["gs_max"] = maxf(float(r["gs_max"]), float(s["out"]["gs"]))
		if bool(s.get("crashed", false)):
			r["crashed"] = true
			break
		if bool(s["onGround"]):
			if rotate and float(pnl["ias"]) > 55.0:
				_hold(KEY_S)
			else:
				_release(KEY_S)
		else:
			r["lifted"] = true
			# bang-bang pitch to 7..11 deg, like a gentle climb-out
			var p := float(s["out"]["pitch"])
			if p < 7.0:
				_release(KEY_W)
				_hold(KEY_S)
			elif p > 11.0:
				_release(KEY_S)
				_hold(KEY_W)
			else:
				_release(KEY_S)
				_release(KEY_W)
			if float(s["out"]["altTrue"]) > alt0 + 30.0:
				r["climbed"] = true
				break
	_release_all()
	return r

func _initialize() -> void:
	Engine.time_scale = 8.0
	var ps: PackedScene = load("res://scenes/main.tscn")
	chk(ps != null, "main.tscn loads")
	if ps == null:
		print("PLAY TEST: checks=%d fails=%d" % [checks, fails])
		quit(1)
		return
	var main = ps.instantiate()
	root.add_child(main)
	for i in range(40):
		await process_frame

	# ---- phase 0: cold boot stops at the title, sim frozen
	chk(main.title_on, "cold boot shows the title screen")
	chk(main.title_btn_career != null and main.title_btn_free != null and main.title_btn_lessons != null, "title has career / free / lessons buttons")
	var s_boot: Dictionary = main.bridge.get_s()
	var t_boot := float(s_boot["t"])
	for i in range(20):
		await process_frame
	chk(absf(float(main.bridge.get_s()["t"]) - t_boot) < 0.001, "sim does not advance behind the title (t frozen)")

	# ---- phase 1: click フリー飛行 -> guide -> real-input takeoff
	chk(await _click(main.title_btn_free), "clicked フリー飛行 with a real mouse event")
	chk(not main.title_on, "title dismissed after free-flight click")
	for i in range(5):
		await process_frame
	chk(main.hud_guide.visible, "first-time guide is visible at flight start")
	var s_sp: Dictionary = main.bridge.get_s()
	var pnl_sp: Dictionary = main.bridge.panel()
	print("FREE SPAWN: engRun=", pnl_sp["engRun"], " park=", pnl_sp["parkBrake"], " thr=", pnl_sp["thr"], " onGround=", s_sp["onGround"])
	chk(bool(pnl_sp["engRun"]), "free spawn: engine already running")
	chk(not bool(pnl_sp["parkBrake"]), "free spawn: parking brake off")
	chk(absf(float(main.bridge.get_s()["t"]) - t_boot) > 0.5, "sim advances after leaving the title")
	var r1: Dictionary = await _takeoff_roll(main)
	print("FREE TAKEOFF: ", r1)
	chk(float(r1["thr"]) > 0.95, "free: throttle reaches full with R held (real input)")
	chk(float(r1["gs_max"]) > 20.0, "free: ground speed builds (max %.1f kt)" % float(r1["gs_max"]))
	chk(bool(r1["lifted"]) and bool(r1["climbed"]), "free: aircraft lifts off and climbs 30 ft")
	chk(not bool(r1["crashed"]), "free: no crash during takeoff")

	# ---- phase 2: Esc returns to the title
	await _tap(KEY_ESCAPE)
	await process_frame
	chk(main.title_on, "Esc returns to the title screen")

	# ---- phase 3: click キャリアをはじめる -> intro dialog -> drive it
	chk(await _click(main.title_btn_career), "clicked キャリアをはじめる with a real mouse event")
	for i in range(6):
		await process_frame
	chk(main.driver != null, "career driver created from the title")
	chk(main.dialog_ui != null and main.dialog_ui.is_running(), "intro dialog is running")
	var dlg_steps := 0
	while main.dialog_ui.is_running() and dlg_steps < 400:
		dlg_steps += 1
		await _tap(KEY_1) # choose(0) if a choice is up; harmless otherwise
		if main.dialog_ui.is_running():
			await _tap(KEY_ENTER)
	chk(not main.dialog_ui.is_running(), "intro dialog driven to completion with real keys (%d steps)" % dlg_steps)

	# ---- phase 4: drive the career (F3 / drills / exams) to its first flight
	var iters := 0
	while main.career_item.is_empty() and iters < 1200:
		iters += 1
		if main.dialog_ui != null and main.dialog_ui.is_running():
			await _tap(KEY_1)
			if main.dialog_ui.is_running():
				await _tap(KEY_ENTER)
		elif main.drill_core != null:
			await _tap(KEY_1)
		elif not main.exam_state.is_empty():
			var q: Dictionary = main.exam_state["qs"][int(main.exam_state["i"])]
			await _tap(KEY_1 + int(q["ok"]))
		else:
			await _tap(KEY_F3)
		if iters % 100 == 0 and main.driver != null:
			var blocking := "F3"
			if main.dialog_ui != null and main.dialog_ui.is_running():
				blocking = "dialog"
			elif main.drill_core != null:
				blocking = "drill:" + String(main.drill_item.get("id", ""))
			elif not main.exam_state.is_empty():
				blocking = "exam:" + String(main.exam_state.get("id", ""))
			print("career drive: iter ", iters, " day ", main.driver.career.day(), " ", main.driver.chapter(), " blocked-by ", blocking)
	chk(not main.career_item.is_empty(), "career reached its first flight item (%d drive steps, day %s)" % [iters, str(main.driver.career.day()) if main.driver != null else "?"])
	if not main.career_item.is_empty():
		print("FIRST CAREER FLIGHT: ", main.career_item.get("kind"), ":", main.career_item.get("id"), " mode=", main.bridge.status()["mode"])

	# ---- phase 5: real-input control of the career flight
	if not main.career_item.is_empty():
		for i in range(10):
			await process_frame
		var sc: Dictionary = main.bridge.get_s()
		if bool(sc["onGround"]):
			var r2: Dictionary = await _takeoff_roll(main)
			print("CAREER TAKEOFF: ", r2)
			chk(float(r2["gs_max"]) > 20.0 and bool(r2["lifted"]), "career flight: real-input takeoff (gs max %.1f kt)" % float(r2["gs_max"]))
			chk(not bool(r2["crashed"]), "career flight: no crash")
		else:
			# airborne start (e.g. a1): prove control authority instead
			_hold(KEY_R)
			var thr_ok := false
			var f := 0
			while f < 600:
				await process_frame
				f += 1
				if float(main.bridge.panel()["thr"]) > 0.95:
					thr_ok = true
					break
			_release_all()
			var p0 := float(main.bridge.get_s()["out"]["pitch"])
			_hold(KEY_S)
			var p_moved := false
			f = 0
			while f < 600:
				await process_frame
				f += 1
				var s2: Dictionary = main.bridge.get_s()
				if bool(s2.get("crashed", false)):
					break
				if absf(float(s2["out"]["pitch"]) - p0) > 2.0:
					p_moved = true
					break
			_release_all()
			chk(thr_ok, "career flight (airborne start): throttle responds to R")
			chk(p_moved, "career flight (airborne start): pitch responds to S")
			chk(not bool(main.bridge.get_s().get("crashed", false)), "career flight: no crash")

	# ---- phase 6: PARK trap regression (apron start, Shift+B)
	await _tap(KEY_ESCAPE)
	await process_frame
	chk(main.title_on, "title again before the apron check")
	chk(await _click(main.title_btn_free), "clicked フリー飛行 again")
	await _tap(KEY_2) # apron start (parked)
	for i in range(5):
		await process_frame
	var pnl_pk: Dictionary = main.bridge.panel()
	chk(bool(pnl_pk["parkBrake"]), "apron start: parking brake is ON")
	_hold(KEY_R)
	var gs_park := 0.0
	var f2 := 0
	var t_pk := float(main.bridge.get_s()["t"])
	while float(main.bridge.get_s()["t"]) - t_pk < 4.0 and f2 < 2000:
		await process_frame
		f2 += 1
		gs_park = maxf(gs_park, float(main.bridge.get_s()["out"]["gs"]))
	_release_all()
	chk(gs_park < 2.0, "parked: full throttle cannot move the aircraft (gs max %.2f kt)" % gs_park)
	await _tap(KEY_B, true) # Shift+B — the v1.0.1 fix (HTML original's key)
	for i in range(3):
		await process_frame
	chk(not bool(main.bridge.panel()["parkBrake"]), "Shift+B releases the parking brake")
	_hold(KEY_R)
	var gs_free := 0.0
	f2 = 0
	while gs_free < 20.0 and f2 < 3000:
		await process_frame
		f2 += 1
		gs_free = maxf(gs_free, float(main.bridge.get_s()["out"]["gs"]))
		if bool(main.bridge.get_s().get("crashed", false)):
			break
	_release_all()
	chk(gs_free > 20.0, "after Shift+B the aircraft rolls (gs max %.1f kt)" % gs_free)
	chk(CadetControls.action_for_key("KeyB", true) == "parkBrake", "action_for_key: Shift+B -> parkBrake")

	print("PLAY TEST: checks=%d fails=%d" % [checks, fails])
	quit(1 if fails > 0 else 0)
