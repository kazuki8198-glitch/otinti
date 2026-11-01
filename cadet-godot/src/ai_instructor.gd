class_name CadetAiInstructor
extends RefCounted
# Phase 3, item 7: the AI instructor's connection port (no live calls in the
# headless environment, and no key material is ever handled in code).
#
# The HTML game talks to the Anthropic API from the page. In the native
# build the key belongs to the user: it is read from a settings file at
# user://cadet_settings.cfg, section [ai], key "api_key" — the file is
# created by the user, never by the game, and the key is only placed in the
# request header at send time. Without a key the instructor refuses cleanly
# and the game falls back to the scripted dialogs.
#
# This class provides: settings/key loading, the request payload builder
# (pure, equivalence-tested), response parsing (pure), and an HTTPRequest
# wrapper for the scene. Speech recognition is NOT here: the settled design
# is local whisper.cpp via GDExtension — Phase 4/5 work (see PHASE3-REPORT).

const SETTINGS_PATH := "user://cadet_settings.cfg"
const API_URL := "https://api.anthropic.com/v1/messages"
const API_VERSION := "2023-06-01"
const MODEL := "claude-sonnet-5"
const MAX_TOKENS := 1024

var settings_path := SETTINGS_PATH

func has_key() -> bool:
	return _load_key() != ""

func _load_key() -> String:
	var cfg := ConfigFile.new()
	if cfg.load(settings_path) != OK:
		return ""
	return String(cfg.get_value("ai", "api_key", "")).strip_edges()

func system_prompt() -> String:
	return "あなたは翔洋航空訓練所の飛行教官です。訓練生の質問に、教材の範囲で簡潔に答えてください。"

# Pure: build the JSON payload for one instructor exchange.
func build_payload(history: Array, user_text: String) -> Dictionary:
	var msgs: Array = []
	for h in history:
		msgs.append({"role": String(h.get("role", "user")), "content": String(h.get("content", ""))})
	msgs.append({"role": "user", "content": user_text})
	return {"model": MODEL, "max_tokens": MAX_TOKENS, "system": system_prompt(), "messages": msgs}

# Pure: extract the assistant text from an API response dictionary.
func parse_response(resp: Dictionary) -> String:
	var out := ""
	for part in resp.get("content", []):
		if typeof(part) == TYPE_DICTIONARY and String(part.get("type", "")) == "text":
			out += String(part.get("text", ""))
	return out

# Scene-side send: returns an HTTPRequest configured and started, or null
# when no key is configured. The caller connects request_completed and
# feeds the JSON body through parse_response().
func send(parent: Node, history: Array, user_text: String) -> HTTPRequest:
	var key := _load_key()
	if key == "":
		return null
	var http := HTTPRequest.new()
	parent.add_child(http)
	var headers := PackedStringArray([
		"Content-Type: application/json",
		"x-api-key: " + key,
		"anthropic-version: " + API_VERSION,
	])
	http.request(API_URL, headers, HTTPClient.METHOD_POST, JSON.stringify(build_payload(history, user_text)))
	return http
