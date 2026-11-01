import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS||new URL('../../src/physics.js', import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
function measure({Om=0, pitch=-40, bank=25, alpha=35, kt=45, elev=1, rud=1, gammaOverride=null}){
  const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
  s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
  const atm=P.atmos(9000/P.FT); const Vt=kt/P.KT/Math.sqrt(atm.sigma);
  const gamma=gammaOverride!=null?gammaOverride:pitch-alpha, g=gamma*DEG;
  const vel=[Vt*Math.cos(g), Vt*Math.sin(g), 0];
  const q=P.qFromHPB(90, pitch, bank);
  const wb=P.qrot(P.qconj(q),[0,Om*DEG,0]);
  let acc=null;
  for(let i=0;i<180;i++){
    s.q=q.slice(); s.vel=vel.slice(); s.pos=[0,9000/P.FT,40000]; s.w=wb.slice(); s.ovr={elev,ail:0,rud};
    const w0=s.w.slice(); P.step(s,DT);
    acc=[(s.w[0]-w0[0])/DT/DEG, (-(s.w[1]-w0[1]))/DT/DEG, (-(s.w[2]-w0[2]))/DT/DEG];
  }
  return {acc, alphaOut:s.out.alpha, betaOut:s.out.beta};
}
for(const c of [
  {Om:0,bank:0},{Om:0,bank:25},{Om:-100,bank:25},{Om:-100,bank:0},{Om:-60,bank:25},{Om:-140,bank:25},
  {Om:-100,bank:25,elev:0},{Om:-100,bank:25,rud:0},{Om:-100,bank:25,kt:35},{Om:-100,bank:25,kt:55},
  {Om:-100,bank:25,alpha:28},{Om:-100,bank:25,alpha:42},
]){ const m=measure(c); console.log(JSON.stringify(c),'pitchAcc',m.acc[0].toFixed(1),'yawAcc',m.acc[1].toFixed(1),'rollAcc',m.acc[2].toFixed(1),'alphaOut',m.alphaOut.toFixed(1),'beta',m.betaOut.toFixed(1)); }
