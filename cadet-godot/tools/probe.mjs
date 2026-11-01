import fs from 'node:fs'; import vm from 'node:vm';
vm.runInThisContext(fs.readFileSync(process.env.HOME + '/workspace/cadet-wt-next/flight-lab/src/physics.js', 'utf8'));
const P = globalThis.FL.physics, DT = 1 / 120;
console.log('atmos0', JSON.stringify(P.atmos(0)));
console.log('atmos1000', JSON.stringify(P.atmos(1000)));
const s0 = P.newState({}); console.log('steady76/800', JSON.stringify(P.steadyState(s0, 76, 800, { altFt: 3000 })));
for (const ev of [0, -0.3, -0.5, 0.4]) {
  const s = P.newState({}); s.wind = { fromDeg: 0, kt: 0, gust: 0 };
  P.placeOnRunway(s); s.thr = 1; s.brake = false;
  let tAir = -1, maxPitch = 0;
  for (let i = 0; i < 120 * 40; i++) {
    if (s.ias > 30) s.ovr = { elev: ev, ail: 0, rud: 0 };
    P.step(s, DT);
    maxPitch = Math.max(maxPitch, s.out.pitch);
    if (!s.onGround && s.t > 1 && tAir < 0) { tAir = s.t; break; }
  }
  console.log('elev', ev, 'airAt', tAir.toFixed(2), 'maxPitch', maxPitch.toFixed(1), 'crashed', s.crashed, s.crashReason || '', 'iasKt', (s.out.ias || 0).toFixed(1), 'altFt', (s.out.altTrue || 0).toFixed(0));
}
