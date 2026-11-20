// First-order screening only. Final selections must be checked in the STL renderer.
const fs=require('fs'),path=require('path');
require('../src/kernel/physics.js');require('../src/kernel/interior.js');require('../src/kernel/tmatrix.js');require('../src/kernel/cie2006.js');
require('../src/kernel/illuminants-data.js');require('../src/kernel/illuminants.js');
for(const n of ['materials','modern-optics','alloys','surface','population','solid-matrix'])require('../src/'+n+'.js');
const W=MieIlluminants.profile('D65','source').rgbWeights,rows=[];
const rgb=spec=>[0,1,2].map(c=>spec.reduce((s,v,i)=>s+v*W[4*i+c],0));
const srgb=c=>c.map(v=>Math.round(255*(v<=.0031308?12.92*v:1.055*Math.max(0,v)**(1/2.4)-.055)));
for(const x of [10,20,30,40,50])for(const d of [50,60,70,80,90,100,110,120,140])for(const cv of [0,15]){
 const p={lesson:'real',struct:'homog',mat:'auag'+x,med:'custom',cmed:1.52,rad:d/2,ns:1,pol:'unpol',surfaceOn:true,surfaceA:1,popOn:cv>0,popSize:cv,popShape:'lognormal',popQuality:'standard',popShell:0};
 const pop=MiePopulation.samples(p),V=MiePopulation.moments(pop).volume,ext=[],back=[],sca=[];
 for(let i=0;i<41;i++){
  const wl=380+10*i;p.cmed=MieSolidMatrix.nk('bk7',wl).n;let e=0,b=0,s=0;
  for(const o of pop){const bead=o.beads[0],{c,k}=MiePopulation.optical(p,bead,wl),a=Math.PI*bead.r**2,amp=Mie.amplitudes(c,-1);e+=o.w*c.Qext*a;s+=o.w*c.Qsca*a;b+=o.w*(Mie.abs2(amp.s1)+Mie.abs2(amp.s2))/(2*k*k);}
  ext.push(e/V*1e6);sca.push(s/V*1e6);back.push(b/V*1e6);
 }
 for(const ppm of [4,6,8,10,14,20,30,45,65]){
  const phi=ppm*1e-6,T=ext.map(e=>Math.exp(-e*phi*4)),R=ext.map((e,i)=>back[i]/e*(-Math.expm1(-2*e*phi*2))),t=rgb(T),r=rgb(R),rn=r.map(c=>c/Math.max(...r)),tn=t.map(c=>c/Math.max(...t));
  const green=rn[1]-Math.max(rn[0],rn[2]),red=tn[0]-Math.max(tn[1],tn[2]),score=2*green+red-.1*Math.abs(Math.log10(Math.max(1e-6,t[0])))-.5*Math.max(0,.02-Math.max(...r));
  rows.push({xAu:x/100,diameterNm:d,cvPercent:cv,ppm,score,green,red,transmitted:srgb(t),reflectedNormalized:srgb(rn),linearT:t,linearR:r});
 }
}
rows.sort((a,b)=>b.score-a.score);
fs.writeFileSync(path.resolve(__dirname,'../data/lycurgus-first-order-scan.json'),JSON.stringify({method:'Single-scattering back return through 2 mm and direct transmission through 4 mm. D65. BK7 host dispersion. This is not the final finite-vessel renderer or archaeological fit.',rows},null,2));
console.log(JSON.stringify(rows.slice(0,18),null,2));
console.log('Closest historical composition:',JSON.stringify(rows.filter(r=>r.xAu===.3).slice(0,6),null,2));
