class_name CadetSaveStore
extends RefCounted

## CADET Godot port — Phase 3: save persistence layer.
## The flight bridge (src/flight_bridge.gd) and the career layer keep all
## save data in one Dictionary "store" (key -> JSON String, exactly the
## shape school.gd / career_instance.gd already use, standing in for the
## original's localStorage). This class is the missing wire from that
## Dictionary to a file: the whole store is written as one JSON object
## (key -> JSON String, so each value stays byte-identical) to
## user://cadet_save.json by default.
##
## API (small, on purpose):
##   var sv = CadetSaveStore.new()                  # or .new(path) in tests
##   sv.save(store) -> bool                         # Dictionary -> file
##   sv.load_store() -> Dictionary                  # file -> new Dictionary ({} on any problem)
##   sv.load() -> Dictionary                        # alias of load_store()
##   sv.exists() -> bool                            # is there a file at all?
##   sv.restore_into(store) -> bool                 # startup restore: replace the given
##                                                  #   store's contents in place; false when
##                                                  #   there was no valid file to restore
##   sv.restore() -> Dictionary                     # startup one-liner: a fresh store
##                                                  #   Dictionary loaded from the file
##   sv.erase_file() -> bool                        # delete the file (tests / reset)
##
## Fallback behaviour follows the original: career.js's read() is a
## try/catch that yields null (=> a fresh career) on any parse problem,
## and school's load_records / load_progress yield empty / sanitised
## values for a missing or unparsable entry. So here: a missing file, an
## unreadable file, invalid JSON, or a JSON value that is not an object
## all load as an empty store — never an error, never a partial import.
## Inside a valid object, entries whose value is not a String are
## dropped (the store contract is key -> JSON String; localStorage could
## only ever hold strings), the rest survive.
##
## The path is replaceable (constructor argument / `path` member) so
## tests can point at a scratch file and never touch the real save.

const DEFAULT_PATH := "user://cadet_save.json"

var path: String

func _init(p_path: String = DEFAULT_PATH) -> void:
	path = p_path if not p_path.is_empty() else DEFAULT_PATH

func set_path(p_path: String) -> void:
	if not p_path.is_empty():
		path = p_path

# ---------------------------------------------------------------- write
# Serialises the store (String values verbatim; any other value is
# JSON-encoded once, so the file still maps key -> String) and writes it.
# Returns false — and leaves the store alone — when the file cannot be opened.
func save(store: Dictionary) -> bool:
	if store == null:
		return false
	var out := {}
	for k in store.keys():
		var v = store[k]
		out[String(k)] = v if typeof(v) == TYPE_STRING else JSON.stringify(v)
	_ensure_parent_dir()
	var f := FileAccess.open(path, FileAccess.WRITE)
	if f == null:
		return false
	f.store_string(JSON.stringify(out))
	f.close()
	return true

# ---------------------------------------------------------------- read
func exists() -> bool:
	return FileAccess.file_exists(path)

# File -> new Dictionary. {} on missing / unreadable / corrupt / non-object content.
func load_store() -> Dictionary:
	var out := {}
	if not exists():
		return out
	var f := FileAccess.open(path, FileAccess.READ)
	if f == null:
		return out
	var text := f.get_as_text()
	f.close()
	if text.strip_edges().is_empty():
		return out
	var parsed = JSON.parse_string(text)
	if typeof(parsed) != TYPE_DICTIONARY:
		return out
	for k in parsed.keys():
		var v = parsed[k]
		if typeof(v) == TYPE_STRING:
			out[String(k)] = v
	return out

# Alias matching the load() half of the requested save/load/exists trio.
func load_data() -> Dictionary:
	return load_store()

# ---------------------------------------------------------------- startup restore
# Replaces target's contents with the file's contents (in place, so a
# bridge built on `target` sees the restored data). Returns true only
# when a valid store file was actually restored; on a missing or corrupt
# file the target ends up empty — the original's "start fresh" fallback.
func restore_into(target: Dictionary) -> bool:
	var ok := exists()
	var data := load_store()
	if ok:
		# exists() alone is not enough: a corrupt file must not count as restored
		var f := FileAccess.open(path, FileAccess.READ)
		if f == null:
			ok = false
		else:
			var parsed = JSON.parse_string(f.get_as_text())
			f.close()
			ok = typeof(parsed) == TYPE_DICTIONARY
	target.clear()
	for k in data.keys():
		target[k] = data[k]
	return ok

# A fresh store Dictionary loaded from the file ({} when there is nothing valid).
func restore() -> Dictionary:
	return load_store()

# ---------------------------------------------------------------- misc
func erase_file() -> bool:
	if not exists():
		return false
	return DirAccess.remove_absolute(ProjectSettings.globalize_path(path)) == OK

func _ensure_parent_dir() -> void:
	var abs_path := ProjectSettings.globalize_path(path)
	var dir := abs_path.get_base_dir()
	if not dir.is_empty() and not DirAccess.dir_exists_absolute(dir):
		DirAccess.make_dir_recursive_absolute(dir)
