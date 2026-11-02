import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS||new URL('../../src/physics.js', import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
let phase='entry', tBreak=null, hdgP=P.attitude(s).hdg, hdgRate=0;
for(let i=0;i<16*120;i++){
  const a=P.attitude(s);
  if(phase==='entry'){
    s.ovr={elev:Math.min(0.35+s.t*0.12,0.9), ail:P.clamp(-0.03*a.bank,-0.6,0.6), rud:0};
    if((s.stallW>0.35&&s.t>1)||s.out.alpha>17){phase='spin'; tBreak=s.t;}
  } else s.ovr={elev:1,ail:0,rud:1};
  const w0=s.w.slice();
  P.step(s,DT);
  const a2=P.attitude(s); let dh=a2.hdg-hdgP; if(dh>180)dh-=360; if(dh<-180)dh+=360; hdgP=a2.hdg; hdgRate=dh/DT;
  if(i%30===29||(phase==='spin'&&s.t-tBreak<0.3&&i%6===5))
    console.log(s.t.toFixed(2),phase,'alpha',s.out.alpha.toFixed(0),'beta',s.out.beta.toFixed(0),'ias',s.out.ias.toFixed(0),'pitch',a2.pitch.toFixed(0),'bank',a2.bank.toFixed(0),'hdgRate',hdgRate.toFixed(0),'stallW',s.stallW.toFixed(2),'w',s.w.map(x=>(x/DEG).toFixed(0)).join(','),'g',s.gLoad.toFixed(1));
  if(s.crashed){console.log('CRASH',s.crashReason); break;}
}
