extends CharacterBody3D

signal died(points)

const SPEED = 2.5
const DAMAGE = 1
const POINTS = 10

var hp = 2
var player: Node3D = null
var attack_cooldown = false

func _ready():
	add_to_group("enemy")
	await get_tree().process_frame
	var players = get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		player = players[0]

func _physics_process(_delta):
	if player == null or not is_instance_valid(player):
		var players = get_tree().get_nodes_in_group("player")
		if players.size() > 0:
			player = players[0]
		else:
			return

	var dir = (player.global_position - global_position)
	dir.y = 0
	if dir.length() > 0.1:
		dir = dir.normalized()
		look_at(global_position + dir, Vector3.UP)
		velocity.x = dir.x * SPEED
		velocity.z = dir.z * SPEED
	else:
		velocity.x = 0
		velocity.z = 0

	velocity.y = -9.8
	move_and_slide()

	if dir.length() < 1.2 and not attack_cooldown:
		_attack_player()

func _attack_player():
	attack_cooldown = true
	if is_instance_valid(player) and player.has_method("take_damage"):
		player.take_damage(DAMAGE)
	await get_tree().create_timer(1.2).timeout
	attack_cooldown = false

func take_damage(amount):
	hp -= amount
	if hp <= 0:
		emit_signal("died", POINTS)
		queue_free()
