extends Node

const EnemyScene = preload("res://enemy.tscn")

var score = 0
var wave = 1
var enemies_remaining = 0
var spawn_count_per_wave = 3
var game_active = false

@onready var score_label: Label = $UI/ScoreLabel
@onready var hp_label: Label = $UI/HPLabel
@onready var wave_label: Label = $UI/WaveLabel
@onready var game_over_label: Label = $UI/GameOverLabel
@onready var player: CharacterBody3D = $Player
@onready var spawn_points: Node3D = $SpawnPoints

func _ready():
	player.connect("died", _on_player_died)
	player.connect("hp_changed", _on_hp_changed)
	game_active = true
	_update_ui()
	_start_wave()

func _start_wave():
	wave_label.text = "Wave: %d" % wave
	var count = spawn_count_per_wave + (wave - 1) * 2
	enemies_remaining = count
	for i in range(count):
		await get_tree().create_timer(0.5).timeout
		_spawn_enemy()

func _spawn_enemy():
	var enemy = EnemyScene.instantiate()
	add_child(enemy)
	enemy.connect("died", _on_enemy_died)

	var points = spawn_points.get_children()
	if points.size() > 0:
		var pt = points[randi() % points.size()]
		enemy.global_position = pt.global_position
	else:
		enemy.global_position = Vector3(randf_range(-8, 8), 0, randf_range(-8, 8))

func _on_enemy_died(points):
	score += points
	enemies_remaining -= 1
	_update_ui()
	if enemies_remaining <= 0 and game_active:
		await get_tree().create_timer(2.0).timeout
		wave += 1
		_start_wave()

func _on_player_died():
	game_active = false
	game_over_label.visible = true
	game_over_label.text = "GAME OVER\nScore: %d\nWave: %d\n\n[R] Restart" % [score, wave]

func _on_hp_changed(hp):
	hp_label.text = "HP: %d" % hp

func _update_ui():
	score_label.text = "Score: %d" % score
	wave_label.text = "Wave: %d" % wave

func _input(event):
	if event is InputEventKey and event.keycode == KEY_R and not game_active:
		get_tree().reload_current_scene()
