const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
require('../src/kernel/physics.js');require('../src/kernel/interior.js');require('../src/materials.js');
global.BHMuseumCatalog=[];global.MuseumStudies={};require('../src/dotsenko-museum.js');
const D=DotsenkoMuseum,near=(a,b,t=1e-8)=>assert.ok(Math.abs(a-b)<t,`${a} versus ${b}`);
assert.equal(D.catalog.length,3);
for(let i=0;i<3;i++){
 const e=D.catalog[i];assert.equal(e.figure,String(i+1));assert.equal(e.year,1986);
 const image=Buffer.from(e.image.split(',')[1],'base64');assert.deepEqual(image,fs.readFileSync(path.join(__dirname,`../assets/museum/dotsenko-fig${i+1}.png`)));
 assert.equal(e.sources[0].url,'https://doi.org/10.1007/BF00660776');
}
near(D.at(0,100,450).q,4.77294976160763);
near(D.at(400,100,550).q,3.7829910692278865);
near(D.at(0,100,450).g,.5530979927021668);
for(const [w,n] of [[350,2.48+.08/.35**2],[550,2.48+.08/.55**2],[700,2.48+.08/.7**2]]){
 const v=Materials.nk('rutileDotsenko',w);near(v.n,n);near(v.k,1e-4);assert.ok(v.inRange);
}
for(const e of D.catalog.slice(0,2)){
 const curves=D.data[e.id];assert.equal(curves.length,12);
 for(const h of e.cases){const pair=curves.filter(c=>c.value===h);assert.equal(pair.length,2);assert.equal(pair[0].color,pair[1].color);for(const c of pair)for(const [w,v] of c.points.filter((_,i)=>i%25===0))near(v,D.at(e.radius-h,h,w)[c.panel?'g':'q'],5e-8);}
 const s=D.config(e,{museumCase:e.cases.at(-1),museumWavelength:650});assert.equal(s.core+s.shell,e.radius);assert.equal(s.mat,'rutileDotsenko');assert.equal(s.med,'custom');assert.equal(s.cmed,1.5);assert.equal(s.surfaceOn,false);
 const csv=D.csv(e,{});assert.ok(csv.includes('"Qsca","g"'));assert.equal(csv.split('\n').length,5+6*15);
}
const map=D.catalog[2],s={museumCase:75,museumBookX:50},m=MuseumStudies.model(map,s);
assert.equal(m.settings.setup.core,50);assert.equal(m.settings.setup.shell,75);assert.ok(m.choices.every(c=>c.displayOnly));
const p=D.xy(map,50,75),hit=D.pointAt(map,{left:20,top:10,fit:2},20+p[0]*2,10+p[1]*2);assert.deepEqual(hit,{core:50,shell:75});
assert.equal(D.config(map,{museumCase:120,museumBookX:0}).struct,'homog');
near(D.integrated(50,75),8.277698577249822,1e-10);
near(D.integrated(50,75),D.integrated(50,75,false),.001);
for(const list of Object.values(D.weights))near(list.reduce((sum,[w,v])=>sum+v,0),1,1e-12);
const grid=D.data.map;for(const [i,j] of [[5,37],[0,60],[100,24],[150,50]])near(grid.z[j][i],D.integrated(grid.x[i],grid.y[j]),5e-8);
assert.ok(grid.contours.every(c=>c.segments.length));assert.match(D.csv(map,s),/physical_D65_specific_scattering_um-1/);
console.log('PASS original artwork bytes, shell families, absolute Mie values, D65 weighting, contour grid, map picking, CSV and lesson settings.');

const targets=JSON.parse(fs.readFileSync(path.join(__dirname,"../data/dotsenko-fig2-digitized.json"),"utf8")).rows;let raw=0,reg=0,count=0;for(const row of targets)for(const [w,q] of row.points){raw+=(D.at(500-row.shellNm,row.shellNm,w).q-q)**2;reg+=(D.at(500-row.shellNm,row.shellNm,w,true).q-q)**2;count++;}near(Math.sqrt(raw/count),.32482467411871063,1e-10);near(Math.sqrt(reg/count),.08470615296760531,1e-10);assert.equal(count,87);const matched=D.config(map,{museumCase:75,museumBookX:50,museumDotsRegistered:true});near(matched.shell,65.80864685696191,1e-7);near(matched.core,55.56913905542901,1e-7);near(Materials.nk("rutileDotsenkoRegistered",550).n,D.registration.indexFactor*Materials.nk("rutileDotsenko",550).n,1e-12);console.log("PASS registered curves, common-index RMS, exact lesson geometry and unchanged printed-input option.");
