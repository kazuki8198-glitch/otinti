import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS||new URL('../../src/physics.js', import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
function accAt(dw0){
  const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
  s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
  const atm=P.atmos(9000/P.FT); const Vt=45/P.KT/Math.sqrt(atm.sigma);
  const gamma=-75*DEG;
  s.vel=[Vt*Math.cos(gamma), Vt*Math.sin(gamma), 0];
  s.q=P.qFromHPB(90,-40,25);
  const wb=P.qrot(P.qconj(s.q),[0,-100*DEG,0]); wb[0]+=dw0;
  s.w=wb; s.pos=[0,9000/P.FT,40000];
  let acc=null;
  for(let i=0;i<120;i++){ s.q=P.qFromHPB(90,-40,25); s.vel=[Vt*Math.cos(gamma), Vt*Math.sin(gamma), 0]; s.pos=[0,9000/P.FT,40000]; s.w=wb.slice(); s.ovr={elev:1,ail:0,rud:1};
    const w0=s.w.slice(); P.step(s,DT); acc=(s.w[0]-w0[0])/DT/DEG; }
  return acc;
}
for(const dw of [-0.3,-0.15,0,0.15,0.3]) console.log('dw0',dw,'pitchAcc',accAt(dw).toFixed(1));
