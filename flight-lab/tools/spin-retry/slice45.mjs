import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL = {};
if (process.env.EXP) globalThis.SPIN_EXP = JSON.parse(process.env.EXP);
vm.runInThisContext(fs.readFileSync(process.env.PHYS || new URL('../../src/physics.js', import.meta.url).pathname, 'utf8'), { filename: 'physics.js' });
const P = globalThis.FL.physics, DT = 1 / 120, DEG = P.DEG;
function measure({ alpha = 45, bank = 15, Om = -100, gam = -80, kt = 45, zero = [], ovr = { elev: 1, ail: 0, rud: 1 }, betaShift = 0 }) {
  const s = P.newState(); P.placeInAir(s, 0, -40000, 9000, 90, 70);
  s.wind = { fromDeg: 0, kt: 0, gust: 0 }; s.thr = 0; s.keyHold = false;
  const atm = P.atmos(9000 / P.FT); const Vt = kt / P.KT / Math.sqrt(atm.sigma);
  const pitch = alpha + gam, g = gam * DEG, gb = betaShift * DEG;
  const vel = [Vt * Math.cos(g) * Math.sin(gb), Vt * Math.sin(g), Vt * Math.cos(g) * Math.cos(gb)];
  const q = P.qFromHPB(90, pitch, bank);
  let wb = P.qrot(P.qconj(q), [0, Om * DEG, 0]);
  for (const z of zero) wb[z] = 0;
  let acc = null;
  for (let i = 0; i < 180; i++) {
    s.q = q.slice(); s.vel = vel.slice(); s.pos = [0, 9000 / P.FT, 40000]; s.w = wb.slice(); s.ovr = ovr;
    const w0 = s.w.slice(); P.step(s, DT);
    acc = [(s.w[0] - w0[0]) / DT / DEG, (-(s.w[1] - w0[1])) / DT / DEG, (-(s.w[2] - w0[2])) / DT / DEG];
  }
  return { acc, alphaOut: s.out.alpha, betaOut: s.out.beta };
}
const show = (name, m) => console.log(`${name}: pitch ${m.acc[0].toFixed(1)} yaw ${m.acc[1].toFixed(1)} roll ${m.acc[2].toFixed(1)} (alphaOut ${m.alphaOut.toFixed(0)} beta ${m.betaOut.toFixed(0)})`);
show('as-is a45', measure({}));
show('w all 0', measure({ zero: [0, 1, 2] }));
show('w0=0', measure({ zero: [0] }));
show('w1=0', measure({ zero: [1] }));
show('w2=0', measure({ zero: [2] }));
show('beta=0 (vel straight)', measure({ betaShift: -10 }));
show('rud=0', measure({ ovr: { elev: 1, ail: 0, rud: 0 } }));
show('ail +1 (into spin?)', measure({ ovr: { elev: 1, ail: 1, rud: 1 } }));
show('ail -1', measure({ ovr: { elev: 1, ail: -1, rud: 1 } }));
show('bank 40', measure({ bank: 40 }));
show('bank -15', measure({ bank: -15 }));
