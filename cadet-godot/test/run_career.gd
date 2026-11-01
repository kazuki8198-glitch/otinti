# CADET Godot port — Phase 3 career run: the progression bot.
# Drives CadetCareerDriver from the prologue through ch1-ch7 to graduation
# and the endorsement entry, one day at a time, exactly as the scene does.
# Flight items are noted with a synthetic passing lesson record (the real
# flight equivalence of every lesson is proven in run_tests3.gd; this bot
# proves the career state machine never deadlocks), exams are answered
# from the real question banks in data/content.json (correct options), and
# the run is saved + reloaded mid-way to prove persistence of the career.
# Run: godot --headless --path . -s test/run_career.gd
extends SceneTree

const SC = preload("res://src/school.gd")
const CC = preload("res://src/career.gd")
const DR = preload("res://src/career_driver.gd")
const AI = preload("res://src/ai_instructor.gd")

var checks := 0
var failures := 0
var failures_log: Array = []

func _note(ok: bool, label: String, got = null, want = null) -> void:
	checks += 1
	if not ok:
		failures += 1
		if failures_log.size() < 30:
			failures_log.append("%s: got=%s want=%s" % [label, str(got).left(160), str(want).left(160)])

func _synthetic_pass(lesson_id: String) -> Dictionary:
	return {"id": lesson_id, "done": true, "passed": true, "grade": "A", "score": 0.9,
		"level": SC.level("basic"), "free": false}

func _init() -> void:
	# ---------------------------------------------------------- AI instructor port (pure parts)
	var ai = AI.new()
	_note(not ai.has_key(), "ai.no_key_in_test_env")
	var payload := ai.build_payload([{"role": "user", "content": "hi"}, {"role": "assistant", "content": "hello"}], "質問")
	_note(payload["messages"].size() == 3 and payload["model"] == AI.MODEL, "ai.payload_shape", payload.size(), 3)
	_note(ai.parse_response({"content": [{"type": "text", "text": "答え"}, {"type": "tool_use", "text": "x"}]}) == "答え", "ai.parse_response")

	# ---------------------------------------------------------- exam banks
	var banks := {}
	var cj = JSON.parse_string(FileAccess.get_file_as_string("res://data/content.json"))
	_note(typeof(cj) == TYPE_DICTIONARY, "content.json parses")
	if typeof(cj) == TYPE_DICTIONARY:
		for b in cj.get("quiz", []):
			banks[String(b["id"])] = b["qs"]

	# ---------------------------------------------------------- the career run
	var store := {}
	var drv = DR.new(store, 11)
	var days := 0
	var chapters_seen: Array = []
	var exams_taken: Array = []
	var flights_noted := 0
	var reloaded := false
	while days < 500:
		days += 1
		var ch := drv.chapter()
		if not chapters_seen.has(ch):
			chapters_seen.append(ch)
		if drv.state().get("graduated") != null and ch == "ch7":
			# endorsement chapter: finish its gate too, then stop
			pass
		var sch := drv.schedule()
		for item in sch:
			var act := drv.perform(item)
			if act.begins_with("fly:"):
				var lid := act.substr(4)
				drv.note_flight(item, _synthetic_pass(lid))
				flights_noted += 1
			elif act.begins_with("check:"):
				var cid := act.substr(6)
				if CC.CHECKS.has(cid):
					drv.note_check(item, true)
				else:
					# c1: a syllabus lesson recorded as a check ride
					drv.note_flight({"kind": "flight", "id": cid}, _synthetic_pass(cid))
					flights_noted += 1
			elif act.begins_with("exam:"):
				var eid := act.substr(5)
				var qs: Array = []
				for bank_id in CC.EXAMS[eid]["banks"]:
					for q in banks.get(bank_id, []):
						qs.append({"q": q[0], "opts": q[1], "ok": int(q[2]), "why": q[3], "picked": int(q[2])})
				qs.shuffle()
				qs = qs.slice(0, mini(30, qs.size()))
				var res := drv.take_exam(eid, qs)
				exams_taken.append(eid)
				_note(res["pct"] >= float(CC.EXAMS[eid]["pass"]), "exam " + eid + " passes", res["pct"], CC.EXAMS[eid]["pass"])
		drv.daily_decision_and_drills()
		# mid-run persistence: save everything, rebuild the driver from the store
		if days == 12 and not reloaded:
			drv.save_all()
			var before := drv.chapter() + "/" + str(drv.career.day())
			drv = DR.new(store, 11)
			reloaded = true
			_note(drv.chapter() + "/" + str(drv.career.day()) == before, "career reload keeps chapter/day", drv.chapter() + "/" + str(drv.career.day()), before)
		var eod := drv.end_day()
		if drv.state().get("graduated") != null:
			# graduation recorded; enter the endorsement chapter and run it out
			if drv.chapter() == "ch6":
				_note(drv.career.begin_endorsement(), "begin_endorsement")
			elif drv.chapter() == "ch7" and drv.career.gate(drv.prog, 80.0).is_empty():
				break
	print("[career] days=%d chapters=%s exams=%s flights=%d graduated=%s chapter=%s" % [days, str(chapters_seen), str(exams_taken), flights_noted, str(drv.state().get("graduated") != null), drv.chapter()])
	_note(drv.state().get("graduated") != null, "graduated", drv.chapter(), "graduated")
	_note(chapters_seen.has("ch2") and chapters_seen.has("ch3") and chapters_seen.has("ch4") and chapters_seen.has("ch5") and chapters_seen.has("ch6"), "chapters through ch6", chapters_seen, "ch2..ch6")
	_note(drv.chapter() == "ch7" and drv.career.gate(drv.prog, 80.0).is_empty(), "ch7 gate clear (endorsement complete)", drv.chapter(), "ch7")
	_note(days < 500, "no deadlock", days, "<500")
	print("[career] TOTAL checks=%d failures=%d" % [checks, failures])
	for f in failures_log:
		print("  FAIL ", f)
	quit(1 if failures > 0 else 0)
