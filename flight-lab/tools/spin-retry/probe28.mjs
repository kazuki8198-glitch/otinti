import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS||new URL('../../src/physics.js', import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
function capture(tTgt){
  const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
  s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
  let phase='entry';
  for(let i=0;i<tTgt*120;i++){
    const a=P.attitude(s);
    if(phase==='entry'){ s.ovr={elev:Math.min(0.35+s.t*0.12,0.9), ail:P.clamp(-0.03*a.bank,-0.6,0.6), rud:0};
      if((s.stallW>0.35&&s.t>1)||s.out.alpha>17) phase='spin'; }
    else s.ovr={elev:1,ail:0,rud:1};
    P.step(s,DT);
  }
  return s;
}
function frozen(s, mutate, ovr){
  const q=s.q.slice(), vel=s.vel.slice(), w=s.w.slice(), pos=s.pos.slice(), stH=s._stH&&s._stH.slice();
  if(mutate) mutate({q,vel,w});
  let acc=null;
  for(let i=0;i<60;i++){ s.q=q.slice(); s.vel=vel.slice(); s.pos=pos.slice(); s.w=w.slice(); if(stH&&i===0)s._stH=stH.slice();
    s.ovr=ovr||{elev:1,ail:0,rud:1};
    const w0=s.w.slice(); P.step(s,DT);
    acc=[(s.w[0]-w0[0])/DT/DEG, (-(s.w[1]-w0[1]))/DT/DEG, (-(s.w[2]-w0[2]))/DT/DEG]; }
  return acc;
}
for(const tT of [5.25, 5.6, 6.0]){
  const s=capture(tT), a=P.attitude(s);
  console.log('t',tT,'alpha',s.out.alpha.toFixed(0),'beta',s.out.beta.toFixed(0),'pitch',a.pitch.toFixed(0),'bank',a.bank.toFixed(0),'w',s.w.map(x=>(x/DEG).toFixed(0)).join(','),'ias',s.out.ias.toFixed(0));
  console.log('  frozen acc(p,y,r):', frozen(s).map(x=>x.toFixed(0)).join(' '));
  console.log('  w2=0:', frozen(s, m=>{m.w[2]=0;}).map(x=>x.toFixed(0)).join(' '));
  console.log('  w1=0:', frozen(s, m=>{m.w[1]=0;}).map(x=>x.toFixed(0)).join(' '));
  console.log('  w0=0:', frozen(s, m=>{m.w[0]=0;}).map(x=>x.toFixed(0)).join(' '));
  console.log('  rud=0:', frozen(s, null, {elev:1,ail:0,rud:0}).map(x=>x.toFixed(0)).join(' '));
  console.log('  elev=0:', frozen(s, null, {elev:0,ail:0,rud:1}).map(x=>x.toFixed(0)).join(' '));
}
