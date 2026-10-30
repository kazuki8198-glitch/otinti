import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
const atm=P.atmos(9000/P.FT); const Vt=45/P.KT/Math.sqrt(atm.sigma);
const gamma=-75*DEG;
s.vel=[Vt*Math.cos(gamma), Vt*Math.sin(gamma), 0];
s.q=P.qFromHPB(90,-40,25);
s.w=P.qrot(P.qconj(s.q),[0,-100*DEG,0]);
s.pos=[0,9000/P.FT,40000];
{ const q0=s.q.slice(), v0=s.vel.slice(), w0=s.w.slice(), p0=s.pos.slice();
  for(let i=0;i<120;i++){ s.q=q0.slice(); s.vel=v0.slice(); s.w=w0.slice(); s.pos=p0.slice(); s.ovr={elev:1,ail:0,rud:1}; P.step(s,DT); }
  s.t=0; }
let hdgP=P.attitude(s).hdg, hdgT=0, dur=0, recT=null, recAlt=null, lvl=null, t=0, alt0=9000;
let phase='spin';
for(let i=0;i<30*120;i++){
  const a=P.attitude(s);
  if(phase==='spin'){ s.ovr={elev:1,ail:0,rud:1}; if(s.t>8){phase='rec'; recT=s.t; recAlt=s.out.altTrue;} }
  else { const yawRate=-s.w[1]/P.DEG;
    if(Math.abs(yawRate)>12||s.out.alpha>15) s.ovr={elev:-0.55,ail:0,rud:-1};
    else { s.ovr={elev:P.clamp(0.10*(2-s.gLoad)+(8-a.pitch)*0.01,-0.2,0.55), ail:P.clamp(-0.03*a.bank,-0.6,0.6), rud:0};
      if(a.pitch>-3&&Math.abs(a.bank)<25&&s.out.alpha<12){lvl={t:s.t,alt:s.out.altTrue}; break;} } }
  P.step(s,DT);
  const a2=P.attitude(s); let dh=a2.hdg-hdgP; if(dh>180)dh-=360; if(dh<-180)dh+=360; hdgT+=dh; hdgP=a2.hdg;
  if(phase==='spin'&&s.out.alpha>=24&&s.out.alpha<=58&&Math.abs(s.out.beta)<=30) dur+=DT;
  if(s.crashed){console.log(JSON.stringify({crash:s.crashReason})); process.exit(0);}
  if(s.out.altTrue<600) break;
}
console.log(JSON.stringify({spinDur:+dur.toFixed(1), hdgAt8s:Math.round(hdgT), recLoss: lvl&&recAlt? Math.round(recAlt-lvl.alt):null, lvlT: lvl?+lvl.t.toFixed(1):null, endAlt:Math.round(s.out.altTrue)}));
