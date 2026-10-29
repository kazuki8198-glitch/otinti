// CADET — epilogue/departure.js : the epilogue's second half (M8): the departure from Haneda, seen from the right
// seat — pushback from the gate, the taxi out, the line-up, the take-off roll and the first climb over Tokyo Bay.
// Pure choreography (no three, no DOM): a pose for every second of it, in the Haneda set's own frame (epilogue/
// haneda.js: x right, y up, −z ahead; our gate at the origin, the nose to the terminal, the runway's centre at
// z = 400 running east). The ground part is keyframed (an ease at both ends of every leg, as a tug and a taxiing
// aircraft move); the roll is a plain acceleration to the rotate speed; the climb's gentle right turn out over the
// bay is integrated once, here, into a table. After the scripted part the climb simply goes on (the pose is defined
// for every t), so the scene can wait for the captain's last line, however long the cadet takes to read.
const SMOOTH = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * u * (u * (u * 6 - 15) + 10); };        // smootherstep
const SMOOTH_D = (u) => { u = Math.min(1, Math.max(0, u)); return 30 * u * u * (1 - u) * (1 - u); };          // its rate
const STEP = (u) => { u = Math.min(1, Math.max(0, u)); return u * u * (3 - 2 * u); };                          // smoothstep

// the ground, keyframed: [t, x, z, yaw] — yaw as the set's rotation.y (the nose −z at 0, +x at −π/2, +z at −π)
const KEYS = [
  [0, 0, 0, 0],                    // at the gate
  [20, 0, 64, 0],                  // pushed back onto the apron (the nose still to the terminal)
  [34, 64, 92, -Math.PI / 2],      // turned onto the lane, east
  [54, 330, 92, -Math.PI / 2],     // taxied east along the lane
  [66, 398, 158, -Math.PI],        // turned south, towards the runway
  [80, 398, 332, -Math.PI],        // to the holding point
  [90, 330, 400, -Math.PI / 2],    // lined up on the centreline, east again
];
export const ROLL_START = 90;
const ACC = 2.6, VMAX = 88, VROT = 70;                 // m/s², the climb's speed, the rotate speed (m/s)
const T_CAP = VMAX / ACC;                              // the roll's time at full speed
const T_ROT = VROT / ACC;                              // the roll's time at the rotate speed
const T_LIFT = T_ROT + 1;                              // the wheels leave a second after the nose goes up
export const LIFT_OFF = ROLL_START + T_LIFT;           // the second (in t) the aircraft is airborne
const PITCH = 0.20;                                    // the climb's nose-up (rad)
const CLIMB_VY = 13;                                   // the climb's rate once it is established (m/s)
const TURN_T0 = 140, TURN_DUR = 28, TURN = 0.62;       // the climb's right turn out over the bay (rad of yaw)
const VH = Math.sqrt(VMAX * VMAX - CLIMB_VY * CLIMB_VY);   // the climb's speed over the ground

// the integral of the climb rate's own ramp (smoothstep over the first 8 s): the height flown since the wheels left
const climbI = (u) => (u <= 0 ? 0 : u < 8 ? u * u * u / 64 - u * u * u * u / 1024 : u - 4);
const yawAt = (t) => (t <= TURN_T0 ? -Math.PI / 2 : -Math.PI / 2 - TURN * SMOOTH((t - TURN_T0) / TURN_DUR));
const yawRateAt = (t) => (t > TURN_T0 && t < TURN_T0 + TURN_DUR ? -TURN * SMOOTH_D((t - TURN_T0) / TURN_DUR) / TURN_DUR : 0);
// down the runway (the roll's own x for its τ)
const rollX = (tau) => 330 + (tau <= T_CAP ? 0.5 * ACC * tau * tau : 0.5 * ACC * T_CAP * T_CAP + VMAX * (tau - T_CAP));
// the climb's path over the ground, integrated once (0.25 s steps, the heading at each step's middle)
const TABLE = (() => {
  const H = 0.25, N = Math.round((200 - TURN_T0) / H), xs = [rollX(TURN_T0 - ROLL_START)], zs = [400];
  for (let i = 0; i < N; i++) {
    const yaw = yawAt(TURN_T0 + (i + 0.5) * H);
    xs.push(xs[i] - Math.sin(yaw) * VH * H); zs.push(zs[i] - Math.cos(yaw) * VH * H);
  }
  return { H, xs, zs };
})();

// the pose at second t: { x, y, z, yaw, pitch, roll (the bank), phase ('pushback' | 'taxi' | 'roll' | 'climb'), speed }
export function departurePose(t) {
  t = Math.max(0, t);
  let x = 0, y = 0, z = 0, yaw = 0, pitch = 0, speed = 0, yawRate = 0;
  if (t <= ROLL_START) {
    let i = 0;
    while (i < KEYS.length - 2 && t >= KEYS[i + 1][0]) i++;
    const [t0, x0, z0, w0] = KEYS[i], [t1, x1, z1, w1] = KEYS[i + 1], u = (t - t0) / (t1 - t0), s = SMOOTH(u), d = SMOOTH_D(u) / (t1 - t0);
    x = x0 + (x1 - x0) * s; z = z0 + (z1 - z0) * s; yaw = w0 + (w1 - w0) * s;
    speed = Math.hypot(x1 - x0, z1 - z0) * d; yawRate = (w1 - w0) * d;
  } else {
    const tau = t - ROLL_START;
    speed = Math.min(ACC * tau, VMAX);
    yaw = yawAt(t); yawRate = yawRateAt(t);
    pitch = tau <= T_ROT ? 0 : PITCH * STEP((tau - T_ROT) / 4);
    y = CLIMB_VY * climbI(tau - T_LIFT);
    if (t <= TURN_T0) { x = rollX(tau); z = 400; }
    else if (t <= 200) {
      const f = (t - TURN_T0) / TABLE.H, i = Math.min(TABLE.xs.length - 2, Math.floor(f)), u = f - i;
      x = TABLE.xs[i] + (TABLE.xs[i + 1] - TABLE.xs[i]) * u; z = TABLE.zs[i] + (TABLE.zs[i + 1] - TABLE.zs[i]) * u;
    } else {
      const n = TABLE.xs.length - 1, w = yawAt(200);
      x = TABLE.xs[n] - Math.sin(w) * VH * (t - 200); z = TABLE.zs[n] - Math.cos(w) * VH * (t - 200);
    }
  }
  // banked into its turns (a little on the ground, properly in the air); a right turn (yaw falling) banks right
  const roll = Math.max(-0.3, Math.min(0.3, Math.atan2(speed * yawRate, 9.81))) * (y > 2 ? 1 : 0.35);
  const phase = t < 20 ? 'pushback' : t < ROLL_START ? 'taxi' : t < LIFT_OFF ? 'roll' : 'climb';
  return { x, y, z, yaw, pitch, roll, phase, speed };
}

// the captain's lines on the way out (content/dialog/epilogue.js's 'depart', one node each): the second each is
// due. A line already heard — the cadet clicked through the talk — is not said again; a line whose moment comes
// while he is still speaking waits for the gap.
export const DEPARTURE_CUES = [
  { at: 1.2, node: 'd1' },       // the pushback begins
  { at: 21, node: 'd2' },        // the taxi
  { at: 80.5, node: 'd3' },      // the line-up
  { at: 121, node: 'd4' },       // just airborne
  { at: 150, node: 'd5' },       // the climb, over the bay
];
