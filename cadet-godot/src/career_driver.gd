class_name CadetCareerDriver
extends RefCounted
# Phase 3: the day-loop driver shared by the playable scene (scenes/main.gd)
# and the headless career bot (test/run_career.gd). Wraps a CadetCareer
# instance + the school progress record and performs schedule items the way
# the HTML game does (main.js / career-run.test.mjs): talks and ground items
# complete through the career API, exams are answered from the question
# banks, flight items are flown in the bridge and noted on completion.
# Flight completion itself is reported by the caller (the scene flies the
# lesson for real; the bot notes a synthetic pass — see run_career.gd).

const CC = preload("res://src/career.gd")
const CI = preload("res://src/career_instance.gd")
const SC = preload("res://src/school.gd")

var career  # CadetCareerInstance
var prog: Dictionary
var store: Dictionary
var log_lines: Array = []

func _init(p_store: Dictionary = {}, seed = null) -> void:
	store = p_store
	career = CI.new(p_store, seed)
	prog = SC.sanitize_progress({})
	# restore progress if the store carries it (saved by note_flight/save_all)
	if typeof(p_store.get("cadet-progress")) == TYPE_STRING:
		var p = JSON.parse_string(String(p_store["cadet-progress"]))
		if typeof(p) == TYPE_DICTIONARY:
			prog = SC.sanitize_progress(p)

func _log(s: String) -> void:
	log_lines.append(s)

func state() -> Dictionary:
	return career.st

func chapter() -> String:
	return career.chapter()

func schedule() -> Array:
	return career.schedule(prog, {"trust": _trust(), "weather": career.weather(prog)})

func _trust() -> float:
	# the instructor trust in the HTML game comes from dialog state; the
	# driver keeps the neutral-good value the career-run bot uses.
	return 80.0

func save_all() -> void:
	career.save()
	store["cadet-progress"] = JSON.stringify(prog)

# ---- ground / talk / admin items: returns "done", "fly:<lessonId>",
# "check:<checkId>", "exam:<examId>", "graduate", "endorsement" or "skip"
func perform(item: Dictionary) -> String:
	var kind := String(item.get("kind", ""))
	var id := String(item.get("id", ""))
	match kind:
		"ceremony", "tour", "event", "off", "study":
			career.done(kind, id)
			_log("%s:%s done" % [kind, id])
			return "done"
		"brief":
			career.done("brief", id)
			career.finish_prologue()
			_log("brief: prologue finished")
			return "done"
		"class":
			var idx := int(id)
			if idx >= 0 and idx < CC.CLASS_SECTIONS.size():
				for sec in CC.CLASS_SECTIONS[idx]:
					career.heard_section(String(sec), "f")
			career.done("class", id)
			_log("class %s done" % id)
			return "done"
		"ftd":
			# ground-device lessons are noted in the school progress (the
			# ch1 gate reads them via ground_passed)
			prog["lessons"][id] = CC.note_ground(prog["lessons"].get(id), true, 100.0)["rec"]
			career.done("ftd", id)
			_log("ftd %s passed" % id)
			return "done"
		"exam":
			return "exam:" + id
		"flight", "night":
			return "fly:" + id
		"checkride", "xc":
			return "check:" + id
		"solo":
			return "fly:t2"
		"graduation":
			career.graduate(prog)
			_log("GRADUATED %s" % str(career.st.get("graduated")))
			return "graduate"
		_:
			_log("unknown kind %s:%s (skipped)" % [kind, id])
			return "skip"

# answer an exam from its banks: picks the correct option of every drawn
# question (the "good cadet" of career-run) and records the result.
# questions: [{ q, opts, ok, why, bank }] already drawn by the caller.
func take_exam(id: String, questions: Array) -> Dictionary:
	var right := 0
	for q in questions:
		if int(q.get("ok", -1)) == int(q.get("picked", -2)):
			right += 1
	var pct := 100.0 * float(right) / maxf(1.0, float(questions.size()))
	var r = career.exam(id, pct)
	save_all()
	return {"pct": pct, "right": right, "n": questions.size(), "record": r}

# a flight lesson finished in the bridge (or noted by the bot): record it in
# the progress, apply the career growth, and handle solo / night bookkeeping.
func note_flight(item: Dictionary, L: Dictionary) -> void:
	var kind := String(item.get("kind", ""))
	var id := String(item.get("id", ""))
	prog = SC.note_lesson(prog, L)
	if bool(L.get("passed", false)):
		var lv = "basic"
		if typeof(L.get("level")) == TYPE_DICTIONARY:
			lv = String(L["level"].get("id", "basic"))
		for pair in CC.lesson_growth(String(L.get("grade", "")), lv, String(L.get("id", id)), career.tired()):
			career.grow(String(pair[0]), float(pair[1]), "lesson:" + String(L.get("id", id)))
	if kind == "solo":
		if bool(L.get("passed", false)):
			career.solo_done()
			_log("SOLO done")
	elif kind == "night":
		career.done("night", id)
	elif kind == "flight":
		career.done("flight", id)
	save_all()

# a check ride (c1 is a syllabus lesson; the STAGE checks are career-side)
func note_check(item: Dictionary, passed: bool) -> void:
	var id := String(item.get("id", ""))
	if CC.CHECKS.has(id):
		career.check(id, passed)
		_log("check %s -> %s" % [id, str(passed)])
	save_all()

# the daily go/no-go at the counter + the decision drills (judge growth)
func daily_decision_and_drills() -> void:
	var w: Dictionary = career.flying_weather(prog)
	if String(w.get("decision", "")) != "":
		career.decision(String(w["decision"]), w)
	while career.drills_left() > 0 and career.drill():
		pass

func end_day() -> Dictionary:
	career.sleep()
	var adv = career.advance_chapter(prog, _trust())
	return {"advanced": adv, "chapter": career.chapter(), "day": career.day()}
