// spin-retry: rotary-balance scan — frozen spin states across alpha, measuring the angular accelerations
// (the moment balance the developed spin would need). usage: PHYS=... [EXP=...] node scan.mjs [Om] [gamma] [kt]
import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL = {};
if (process.env.EXP) globalThis.SPIN_EXP = JSON.parse(process.env.EXP);
vm.runInThisContext(fs.readFileSync(process.env.PHYS || new URL('../../src/physics.js', import.meta.url).pathname, 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics, DT = 1 / 120, DEG = P.DEG;
const Om = +(process.argv[2] || -100), gam = +(process.argv[3] || -80), kt = +(process.argv[4] || 45);
function measure(alpha, bank = 15) {
  const s = P.newState(); P.placeInAir(s, 0, -40000, 9000, 90, 70);
  s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.thr = 0; s.keyHold = false;
  const atm = P.atmos(9000 / P.FT); const Vt = kt / P.KT / Math.sqrt(atm.sigma);
  const pitch = alpha + gam, g = gam * DEG;
  const vel = [Vt * Math.cos(g), Vt * Math.sin(g), 0];
  const q = P.qFromHPB(90, pitch, bank);
  const wb = P.qrot(P.qconj(q), [0, Om * DEG, 0]);
  let acc = null;
  for (let i = 0; i < 180; i++) {
    s.q = q.slice(); s.vel = vel.slice(); s.pos = [0, 9000 / P.FT, 40000]; s.w = wb.slice(); s.ovr = { elev: 1, ail: 0, rud: 1 };
    const w0 = s.w.slice(); P.step(s, DT);
    acc = [(s.w[0] - w0[0]) / DT / DEG, (-(s.w[1] - w0[1])) / DT / DEG, (-(s.w[2] - w0[2])) / DT / DEG];
  }
  return { acc, alphaOut: s.out.alpha, betaOut: s.out.beta };
}
console.log(`Om=${Om} gamma=${gam} kt=${kt} EXP=${process.env.EXP || '-'}`);
for (let alpha = 20; alpha <= 90; alpha += 5) {
  const m = measure(alpha);
  console.log(`alpha ${alpha} (out ${m.alphaOut.toFixed(0)}, beta ${m.betaOut.toFixed(0)}): pitchAcc ${m.acc[0].toFixed(1)} yawAcc ${m.acc[1].toFixed(1)} rollAcc ${m.acc[2].toFixed(1)}`);
}
