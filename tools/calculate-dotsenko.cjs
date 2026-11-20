// Recompute historical spectra and the Figure 3 grid using the app's Mie solver.
const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'..');
require('../src/kernel/physics.js');require('../src/kernel/interior.js');
const registered=process.argv.includes('--registered'),factor=registered?JSON.parse(fs.readFileSync(path.join(dir,'data/dotsenko-registration.json'),'utf8')).indexFactor:1,output=process.argv.includes('--paper-grid')?(registered?'data/dotsenko-registered-paper-grid.json':'data/dotsenko-paper-grid.json'):registered?'data/dotsenko-registered-calculations.json':'data/dotsenko-calculations.json';
const weights=JSON.parse(fs.readFileSync(path.join(dir,'data/dotsenko-weights.json'),'utf8'));
function at(core,h,w){const r=core+h,k=2*Math.PI*1.5/w,c=Mie.coreShell(k*core,k*r,[1.48/1.5,0],[factor*(2.48+.08/(w/1000)**2)/1.5,1e-4/1.5]);return {q:c.Qsca,g:c.g,sp:9*c.Qsca*(1-c.g)/(16*r/1000*(-Math.expm1(3*Math.log(core/r))))};}
const round=v=>+v.toPrecision(8),colors=['#246cba','#dd5826','#9430a0','#008e85','#b58b00','#cf3054'],data={};
for(const [id,r,hs] of [['dotsenko-1',100,[100,80,50,20,10,5]],['dotsenko-2',500,[500,300,100,50,20,10]]]){
 data[id]=[];hs.forEach((h,i)=>{const points=[];for(let w=350;w<=700;w+=2)points.push([w,at(r-h,h,w)]);for(const [panel,name] of [[0,'q'],[1,'g']])data[id].push({value:h,panel,color:colors[i],label:`${i+1}: H = ${h} nm`,points:points.map(([w,v])=>[w,round(v[name])]),paperPoints:Array.from({length:15},(_,j)=>{const w=350+25*j;return [w,round(at(r-h,h,w)[name])];})});});
}
if(process.argv.includes('--spectra-only')){const old=JSON.parse(fs.readFileSync(path.join(dir,output),'utf8'));data.map=old.map;fs.writeFileSync(path.join(dir,output),JSON.stringify(data));console.log('Updated dense and paper-grid spectra.');process.exit(0);}
if(process.argv.includes('--extend-map')){const old=JSON.parse(fs.readFileSync(path.join(dir,output),'utf8')),extra=Array.from({length:20},(_,i)=>1510+i*10);for(let j=0;j<old.map.y.length;j++){const h=old.map.y[j];old.map.z[j].push(...extra.map(r=>round(weights.fine.reduce((v,[w,p])=>v+p*at(r,h,w).sp,0))));}old.map.x.push(...extra);fs.writeFileSync(path.join(dir,output),JSON.stringify(old));console.log('Extended map through 1700 nm for registered viewport.');process.exit(0);}
const x=Array.from({length:171},(_,i)=>i*10),y=[...Array.from({length:70},(_,i)=>1+2*i),140],z=[];
for(const h of y){z.push(x.map(r=>round(weights[process.argv.includes('--paper-grid')?'paper':'fine'].reduce((v,[w,p])=>v+p*at(r,h,w).sp,0))));}
data.map={x,y,z};
fs.writeFileSync(path.join(dir,output),JSON.stringify(data));
console.log('Computed 24 panel curves and '+x.length*y.length+' D65-weighted grid points.');
