extends CharacterBody3D

signal died
signal hp_changed(hp)

const SPEED = 5.0
const ATTACK_RANGE = 1.5
const ATTACK_DAMAGE = 1

var hp = 3
var max_hp = 3
var is_attacking = false
var attack_cooldown = false
var invincible = false

@onready var attack_area: Area3D = $AttackArea
@onready var anim_player: AnimationPlayer = $AnimationPlayer if has_node("AnimationPlayer") else null

func _ready():
	add_to_group("player")

func _physics_process(delta):
	var input_dir = Vector2.ZERO
	input_dir.x = Input.get_axis("ui_left", "ui_right")
	input_dir.y = Input.get_axis("ui_up", "ui_down")

	if input_dir == Vector2.ZERO:
		input_dir.x = (Input.get_action_strength("move_right") - Input.get_action_strength("move_left"))
		input_dir.y = (Input.get_action_strength("move_down") - Input.get_action_strength("move_up"))

	# WASD
	var move_dir = Vector3.ZERO
	if Input.is_key_pressed(KEY_W):
		move_dir.z -= 1
	if Input.is_key_pressed(KEY_S):
		move_dir.z += 1
	if Input.is_key_pressed(KEY_A):
		move_dir.x -= 1
	if Input.is_key_pressed(KEY_D):
		move_dir.x += 1

	if move_dir != Vector3.ZERO:
		move_dir = move_dir.normalized()
		look_at(global_position + move_dir, Vector3.UP)

	velocity.x = move_dir.x * SPEED
	velocity.z = move_dir.z * SPEED
	velocity.y = -9.8

	move_and_slide()

	if Input.is_key_pressed(KEY_SPACE) and not attack_cooldown:
		attack()

func attack():
	is_attacking = true
	attack_cooldown = true

	var bodies = attack_area.get_overlapping_bodies()
	for body in bodies:
		if body.is_in_group("enemy"):
			body.take_damage(ATTACK_DAMAGE)

	await get_tree().create_timer(0.3).timeout
	is_attacking = false
	await get_tree().create_timer(0.4).timeout
	attack_cooldown = false

func take_damage(amount):
	if invincible:
		return
	hp -= amount
	emit_signal("hp_changed", hp)
	invincible = true
	await get_tree().create_timer(1.0).timeout
	invincible = false
	if hp <= 0:
		emit_signal("died")
		queue_free()
