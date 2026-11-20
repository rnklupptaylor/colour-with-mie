const fs=require('node:fs'),path=require('node:path'),folder=path.resolve(__dirname,'..');
require('../src/kernel/physics.js');require('../src/kernel/tmatrix.js');require('../src/materials.js');require('../src/modern-optics.js');require('../src/alloys.js');require('../src/surface.js');require('../src/population.js');require('../src/museum-studies.js');
const M=globalThis.Mie,Mat=globalThis.Materials,P=globalThis.MiePopulation,C=['#1262ac','#d35a17','#00876b','#8654a8','#b22f62','#8c8813','#168b9e','#624f2b','#49794d','#6e689d','#d34d3e'];
const grid=(a,b,n,fn)=>Array.from({length:n+1},(_,i)=>{const x=a+(b-a)*i/n;return [x,fn(x)];}),curve=(value,label,points,i=0,extra={})=>({value,label,points,color:C[i%C.length],...extra});
const volume=r=>4*Math.PI*r*r*r/3;
function cross(d,wl,{cv=0,scale=1,A=0,mat='au',electric=false,medium='waterHale',nodes=17}={}){
 const nm=Mat.medium(medium,wl).n,rule=P.rule(d*scale/2,cv,'lognormal',cv?nodes:1);let ext=0,sca=0,V=0;
 for(const o of rule){const r=o.v,k=2*Math.PI*nm/wl,x=k*r,g=MieSurface.nk(mat,wl,r,0,{surfaceOn:A>0,surfaceA:A}),c=M.coefficients(x,[g.n/nm,g.k/nm]);ext+=o.w*c.Qext*Math.PI*r*r;sca+=o.w*(electric?6*M.abs2(c.a[1])/x**2:c.Qsca)*Math.PI*r*r;V+=o.w*volume(r);}
 return {ext,sca,V};
}
const data={};
const mullerPoints={20:[3,.75,0,0],40:[55,4,.7,.1],60:[134,14,3.2,.6],80:[80,40,9.1,3],100:[55.7,66.5,17.6,7.4],120:[37.5,56.2,30.4,14],140:[26.5,42,37.3,22.3],160:[18.5,29.3,34.3,27.5],180:[12.5,21,27.7,27.9],200:[8,16,22.5,25.7]},checks=[];
const water=[[420,420/313],[525,525/393],[650,650/488],[750,750/564]],nmWater=wl=>{let i=1;while(i<water.length-1&&water[i][0]<wl)i++;const a=water[i-1],b=water[i];return a[1]+(b[1]-a[1])*(wl-a[0])/(b[0]-a[0]);};
function muller(d,wl,full=false){const r=d/2,g=Mat.nk('agMuller1911',wl),nm=nmWater(wl),x=2*Math.PI*nm*r/wl,c=M.coefficients(x,[g.n/nm,g.k/nm]);return 1000*Math.PI*r*r*(full?c.Qsca:6*M.abs2(c.a[1])/x**2)/volume(r);}
for(const full of [false,true])data['muller-3'+(full?'-full':'')]=[20,40,60,80,100,120,140,160,180,200].map((d,i)=>curve(d,`d = ${d} nm`,grid(400,750,700,wl=>muller(d,wl,full)),i,{normalization:'1000 Csca/V: published 1 mm³ Ag per litre, incident area 1 mm² and sampled suspension 1 mm³.',electricOnly:!full}));
for(const [d,values] of Object.entries(mullerPoints))checks.push({diameter:+d,paper:values,app:[420,525,650,750].map(wl=>muller(+d,wl)),relativeDifference:values.map((v,i)=>v?muller(+d,water[i][0])/v-1:null)});
fs.writeFileSync(path.join(folder,'data/muller-checks.json'),JSON.stringify({model:'Published n,k and water wavelengths; electric a1 only; absolute published normalization',checks},null,2));
fs.writeFileSync(path.join(folder,'data/paper-curves.json'),JSON.stringify(data));
const {execFileSync}=require('node:child_process');for(const script of ['refit-turkevich.cjs','evanoff-fit.cjs'])execFileSync(process.execPath,[path.join(__dirname,script)],{stdio:'inherit'});
