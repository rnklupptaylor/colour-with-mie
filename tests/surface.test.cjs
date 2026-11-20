const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm'),folder=path.resolve(__dirname,'..');
require('../src/kernel/physics.js');require('../src/kernel/optics.js');require('../src/kernel/interior.js');require('../src/kernel/tmatrix.js');require('../src/materials.js');require('../src/modern-optics.js');require('../src/alloys.js');require('../src/surface.js');require('../src/population.js');
const near=(a,b,t=1e-11)=>assert.ok(Math.abs(a-b)<=t*Math.max(1,Math.abs(b)),`${a} ≈ ${b}`);
const old={};vm.createContext(old);vm.runInContext(fs.readFileSync(path.join(folder,'tests/fixtures/materials.js'),'utf8'),old);
let unchanged=0;for(const id of Object.keys(old.Materials.DB))for(let wl=300;wl<=2000;wl+=17){const a=old.Materials.nk(id,wl),b=Materials.nk(id==='au'?'auBabar2015':id,wl);assert.deepEqual({...b},{...a});unchanged++;}
near(MieSurface.length(30),40);near(MieSurface.length(30,20),4/3*(27000-8000)/(900+400));near(MieSurface.length(100,.999*100)/(.1),2,0.002);
const metals=['au','ag','cu','mg','li','pt','pd','auag50'],checks=[];
for(const id of metals){const max=Math.min(780,Materials.range(id)[1]);for(const wl of [380,550,max])for(const r of [2,5,50]){
 const bulk=Materials.nk(id,wl);assert.deepEqual(MieSurface.nk(id,wl,r,0,{surfaceOn:false,surfaceA:1}),bulk);assert.deepEqual(MieSurface.nk(id,wl,r,0,{surfaceOn:true,surfaceA:0}),bulk);
 const a=MieSurface.nk(id,wl,r,0,{surfaceOn:true,surfaceA:1}),b=MieSurface.nk(id,wl,2*r,0,{surfaceOn:true,surfaceA:1});assert.ok(Number.isFinite(a.n)&&Number.isFinite(a.k)&&a.k>=0);near(a.surface.addedWidthEv,2*b.surface.addedWidthEv);checks.push({id,wl,r,n:a.n,k:a.k,widthEv:a.surface.addedWidthEv});
}}
const s={lesson:'real',ns:1,struct:'cs',mat:'au',matCore:'ag',med:'water',core:20,shell:3,rad:23,wl:550,surfaceOn:true,surfaceA:1,popOn:true,popSize:10,popShell:15,popShape:'lognormal',popQuality:'quick',pol:'unpol'};
for(const o of MiePopulation.samples(s)){const {c}=MiePopulation.optical(s,o.beads[0],550);assert.ok(c.Qext>=c.Qsca-1e-8&&c.Qsca>=0);}
const md=MieSurface.metadata(s);assert.equal(md.layers.length,2);assert.equal(md.distributionAppliedPerMember,true);assert.ok(md.layers.every(l=>l.opticalSource.doi));
const same={...s,popOn:false,matCore:'au'},bead={r:23,core:20,t:3},c=MiePopulation.optical(same,bead,550).c,nm=Materials.medium('water',550).n,g=MieSurface.nk('au',550,23,0,same),uniform=Mie.coefficients(2*Math.PI*nm*23/550,[g.n/nm,g.k/nm]);near(c.Qext,uniform.Qext);near(c.Qsca,uniform.Qsca);
fs.writeFileSync(path.join(folder,'artifacts/surface-validation.json'),JSON.stringify({passed:true,existingLookupsUnchanged:unchanged,geometry:'4V/S, two shell interfaces',cases:checks.length,drudeParameters:Object.fromEntries(metals.map(id=>[id,MieSurface.parameters(id)])),checks},null,2));console.log('PASS unchanged bulk data, off/zero equivalence, inverse-length scaling, shell geometry and passive sampled layers.');
