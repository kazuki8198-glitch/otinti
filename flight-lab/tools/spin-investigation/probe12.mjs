import fs from 'node:fs'; import vm from 'node:vm';
globalThis.FL={};
vm.runInThisContext(fs.readFileSync(process.env.PHYS||new URL('../../src/physics.js', import.meta.url).pathname,'utf8'),{filename:'physics.js'});
const P=globalThis.FL.physics, DT=1/120, DEG=P.DEG;
function initSpin({Om=100, pitch=-40, bank=25, alpha=35, kt=45}={}){
  const s=P.newState(); P.placeInAir(s,0,-40000,9000,90,70);
  s.wind={fromDeg:0,kt:0,gust:0}; s.thr=0; s.keyHold=false;
  const atm=P.atmos(9000/P.FT); const Vt=kt/P.KT/Math.sqrt(atm.sigma);
  const gamma=pitch-alpha, g=gamma*DEG;
  s.vel=[Vt*Math.cos(g), Vt*Math.sin(g), 0];
  s.q=P.qFromHPB(90, pitch, bank);
  s.w=P.qrot(P.qconj(s.q),[0,Om*DEG,0]);
  s.pos=[0,9000/P.FT,40000];
  // settle hysteresis to stalled state: run 1s frozen-ish? just run live, hysteresis builds in 0.1s
  return s;
}
function run(opts, secs=16, recAt=null){
  const s=initSpin(opts);
  { const q0=s.q.slice(), v0=s.vel.slice(), w0=s.w.slice(), p0=s.pos.slice();
    for(let i=0;i<120;i++){ s.q=q0.slice(); s.vel=v0.slice(); s.w=w0.slice(); s.pos=p0.slice(); s.ovr={elev:1,ail:0,rud:1}; P.step(s,DT); }
    s.t=0; }
  let hdgP=P.attitude(s).hdg, hdgT=0, rec=null, lvl=null, phase='spin';
  const rows=[];
  for(let i=0;i<secs*120;i++){
    const a=P.attitude(s);
    if(phase==='spin'){ s.ovr={elev:1,ail:0,rud:1}; if(recAt!=null&&s.t>=recAt){phase='rec'; rec={t:s.t,alt:s.out.altTrue,hdg:hdgT};} }
    else if(phase==='rec'){
      const yawRate=-s.w[1]/P.DEG;
      if(Math.abs(yawRate)>12||s.out.alpha>15) s.ovr={elev:-0.55,ail:0,rud:-1};
      else { s.ovr={elev:P.clamp(0.10*(2-s.gLoad)+(8-a.pitch)*0.01,-0.2,0.55), ail:P.clamp(-0.03*a.bank,-0.6,0.6), rud:0};
        if(a.pitch>-3&&Math.abs(a.bank)<25&&s.out.alpha<12){phase='lvl'; lvl={t:s.t,alt:s.out.altTrue,extra:hdgT-rec.hdg};} }
    }
    P.step(s,DT);
    const a2=P.attitude(s); let dh=a2.hdg-hdgP; if(dh>180)dh-=360; if(dh<-180)dh+=360; hdgT+=dh; hdgP=a2.hdg;
    if(i%60===0) rows.push([s.t.toFixed(1),phase,Math.round(s.out.altTrue),s.out.alpha.toFixed(0),s.out.beta.toFixed(0),s.out.ias.toFixed(0),a2.pitch.toFixed(0),a2.bank.toFixed(0),(-s.w[1]/P.DEG).toFixed(0),hdgT.toFixed(0),Math.round(-s.vel[1]*196.85),s.stallW.toFixed(2),s.gLoad.toFixed(1)].join('\t'));
    if(s.crashed){rows.push('CRASH '+s.crashReason);break;}
    if(s.out.altTrue<500){rows.push('LOWALT');break;}
    if(phase==='lvl')break;
  }
  console.log('init',JSON.stringify(opts),'rec',JSON.stringify(rec),'lvl',JSON.stringify(lvl));
  console.log(rows.join('\n'));
}
run({Om:-100});
