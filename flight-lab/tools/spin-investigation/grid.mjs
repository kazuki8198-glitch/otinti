import fs from 'node:fs'; import vm from 'node:vm';
import { execSync } from 'node:child_process';
// build variant file from params via python patcher (cached by key)
const key = process.argv[2];
const P_ = JSON.parse(fs.readFileSync(new URL('./grid_params.json', import.meta.url).pathname,'utf8'))[key];
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(new URL(P_.file, import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120;
function spinRun({secs=42, recAt=13, dir=1}={}){
  const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
  s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
  let hdgPrev=P.attitude(s).hdg, hdgTot=0, phase='entry', tBreak=null, rec=null, level=null;
  const samples=[];
  for(let i=0;i<secs*120;i++){
    const a=P.attitude(s);
    if(phase==='entry'){
      s.ovr={elev:Math.min(0.35+s.t*0.12,0.9), ail:P.clamp(-0.03*a.bank,-0.6,0.6), rud:0};
      if((s.stallW>0.35&&s.t>1)||s.out.alpha>17){phase='spin'; tBreak=s.t;}
    } else if(phase==='spin'){
      s.ovr={elev:1,ail:0,rud:dir};
      if(s.t-tBreak>=recAt){phase='recover'; rec={t:s.t,alt:s.out.altTrue,hdg:hdgTot};}
    } else if(phase==='recover'){
      const yawRate=-s.w[1]/P.DEG;
      if(Math.abs(yawRate)>12||s.out.alpha>15) s.ovr={elev:-0.55,ail:0,rud:-dir};
      else { s.ovr={elev:P.clamp(0.10*(2-s.gLoad)+(8-a.pitch)*0.01,-0.2,0.55), ail:P.clamp(-0.03*a.bank,-0.6,0.6), rud:0};
        if(a.pitch>-3&&Math.abs(a.bank)<25&&s.out.alpha<12){phase='level'; level={t:s.t,alt:s.out.altTrue,hdgExtra:hdgTot-rec.hdg};} }
    }
    P.step(s,DT);
    const a2=P.attitude(s); let dh=a2.hdg-hdgPrev; if(dh>180)dh-=360; if(dh<-180)dh+=360; hdgTot+=dh; hdgPrev=a2.hdg;
    if(phase==='spin'&&s.t-tBreak>2) samples.push({t:s.t,alpha:s.out.alpha,beta:s.out.beta,ias:s.out.ias,yawHdg:dh/DT, sink:-s.vel[1]*196.85, stallW:s.stallW});
    if(s.crashed) return {crash:s.crashReason, t:s.t, samples, tBreak, rec, level};
    if(s.out.altTrue<500) return {lowAlt:true, samples, tBreak, rec, level};
    if(phase==='level') break;
  }
  return {samples, tBreak, rec, level, hdgTot};
}
const r=spinRun({});
const sm=r.samples||[];
const inA=sm.filter(x=>x.alpha>=22&&x.alpha<=48).length;
const ok=sm.filter(x=>x.alpha>=-10&&x.alpha<=70&&Math.abs(x.beta)<=35).length;
const meanYaw=sm.reduce((a,x)=>a+Math.abs(x.yawHdg),0)/(sm.length||1);
const meanA=sm.reduce((a,x)=>a+x.alpha,0)/(sm.length||1);
const meanIas=sm.reduce((a,x)=>a+x.ias,0)/(sm.length||1);
const meanSink=sm.reduce((a,x)=>a+x.sink,0)/(sm.length||1);
console.log(JSON.stringify({key, n:sm.length, fracAlphaInRange:+(inA/(sm.length||1)).toFixed(2), fracSane:+(ok/(sm.length||1)).toFixed(2),
  meanAlpha:+meanA.toFixed(1), meanYawRate:+meanYaw.toFixed(0), meanIas:+meanIas.toFixed(0), meanSink:Math.round(meanSink),
  crash:r.crash||null, lowAlt:!!r.lowAlt, recAltLoss: r.rec&&r.level? Math.round(r.rec.alt-r.level.alt): null,
  recTurnsExtra: r.level? +(Math.abs(r.level.hdgExtra)/360).toFixed(2): null, recTime: r.rec&&r.level? +(r.level.t-r.rec.t).toFixed(1): null}));
