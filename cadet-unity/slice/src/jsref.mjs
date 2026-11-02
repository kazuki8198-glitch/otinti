import fs from 'node:fs';
eval(fs.readFileSync('/home/hatch/workspace/cadet-wt-all/flight-lab/src/physics.js', 'utf8'));
const FL = globalThis.FL, P = FL.physics;
const { createControls } = await import('/tmp/eq/controls.mjs');
const s = P.newState({ aircraft: 'pa28', seed: 1 });
P.placeOnRunway(s, P.LAB_RWY, 30);
const L = { s, free: true };
const ctl = createControls(FL, { prefs: {} });
ctl.reset();
ctl.action(L, 'parkBrake', true);
const down = new Set();
const keys = { has: c => down.has(c), shift: false };
let released = false, rotated = false;
const rows = [];
const DT = 1 / 120, STEPS = 120 * 60;
for (let i = 0; i < STEPS; i++) {
  const t = s.t;
  if (!released && t >= 1.0) { ctl.action(L, 'parkBrake', false); released = true; }
  down.clear();
  if (t >= 2.0 && s.thr < 0.999) down.add('KeyR');
  if (!rotated && s.out.ias >= 55) down.add('KeyS');
  if (rotated && s.out.pitch < 11) down.add('KeyS');
  if (s.out.ias >= 55 && s.out.pitch >= 11) rotated = true;
  ctl.update(L, DT, keys, true);
  P.step(s, DT);
  const lt = Math.round(s.t * 2) / 2;
  if (Math.abs(s.t - lt) < 1e-9 && lt >= 0 && (rows.length === 0 || rows[rows.length - 1][0] !== lt)) {
    rows.push([lt, s.out.ias, s.out.altTrue, s.out.rwyAlong, s.out.pitch, s.thr, s.onGround ? 1 : 0]);
  }
}
console.log('t,ias,alt,along,pitch,thr,ground');
for (const r of rows) console.log(r.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(','));
console.error('EVENTS', JSON.stringify(s.events.map(e => e.type)));
console.error('CRASHED', s.crashed, s.crashReason || '');
