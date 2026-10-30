import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS||new URL('../../src/physics.js', import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
function measure(alphaDeg, elev=1){
  const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
  s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
  const atm=P.atmos(9000/P.FT); const Vt=45/P.KT/Math.sqrt(atm.sigma);
  const gamma=-alphaDeg*DEG; // pitch 0
  s.vel=[Vt*Math.cos(gamma), Vt*Math.sin(gamma), 0];
  s.q=P.qFromHPB(90,0,0); s.w=[0,0,0]; s.pos=[0,9000/P.FT,40000];
  let dbg=null;
  for(let i=0;i<120;i++){ s.q=P.qFromHPB(90,0,0); s.vel=[Vt*Math.cos(gamma), Vt*Math.sin(gamma), 0]; s.pos=[0,9000/P.FT,40000]; s.w=[0,0,0]; s.ovr={elev,ail:0,rud:0}; P.step(s,DT); dbg=s._dbg; }
  return dbg;
}
for(const a of [16,18,19,20,21,22,24,26,30]){ const d=measure(a); console.log('alpha',a,'aeM0',Math.round(d.aeM[0]),'MpTot',Math.round(d.Mp),'stallW',d.stallW.toFixed(2),'CLw',d.CLw.toFixed(2)); }
