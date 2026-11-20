/* Native modern-Au coated-sphere spectra, before any size averaging or fit. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),dir=path.resolve(__dirname,'..');
require('../src/kernel/physics.js');require('../src/kernel/interior.js');require('../src/materials.js');require('../src/modern-optics.js');require('../src/surface.js');require('../src/museum-studies.js');
const observations=JSON.parse(fs.readFileSync(path.join(dir,'data/oldenburg-observations.json'),'utf8')),M=globalThis.Mie,Mat=globalThis.Materials;
const unique=a=>[...new Set(a)].sort((a,b)=>a-b),seq=(a,b,h)=>Array.from({length:Math.round((b-a)/h)+1},(_,i)=>a+i*h),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const bulk=new Map(),originalNk=Mat.nk;Mat.nk=(id,wl)=>{if(id!=='au')return originalNk(id,wl);if(!bulk.has(wl))bulk.set(wl,originalNk(id,wl));return bulk.get(wl);};
function cross(r,t,wl){const R=r+t,x=2*Math.PI*1.33*R/wl,g=MieSurface.nk('au',wl,R,r,{surfaceOn:true,surfaceA:1}),c=M.coreShell(x*r/R,x,[1.45/1.33,0],[g.n/1.33,g.k/1.33]);return c.Qext*Math.PI*R*R;}
const baseline=[];
for(const row of observations.rows){
 const e={id:'oldenburg-3'+row.panel},p=MuseumStudies.populationFor(e,row.captionShell),targets=MuseumStudies.fitFor(e,row.captionShell).targets;
 if(JSON.stringify(targets)!==JSON.stringify(row.wl.map((wl,i)=>[wl,row.signal[i]])))throw Error('Experimental targets changed');
 const legacy=row.wl.map(wl=>MuseumStudies.populationAt(p,wl).Cext),modern=row.wl.map(wl=>{let ext=0;for(const [r,wr] of p.nodes.core)for(const [t,wt] of p.nodes.shell)ext+=wr*wt*cross(r,t,wl);return ext;});
 baseline.push({id:row.id,legacyGeometry:{core:p.core,shell:p.shell,distribution:'positive-truncated Gaussian',sharedCore:true},legacyCext:legacy,modernAtLegacyGeometryCext:modern,legacyPublishedRms:p.rms});
}
fs.writeFileSync(path.join(dir,'data/oldenburg-baselines.json'),JSON.stringify(baseline,null,2));
for(const panel of (process.argv[2]?[process.argv[2]]:['a','b'])){
 const radii=panel==='a'?unique([.5,1,2,5,10,15,18,...seq(20,130,1),...seq(132,250,2),...seq(260,400,10)]):unique([.5,1,2,5,10,20,30,40,50,...seq(60,350,2),...seq(355,650,5),...seq(675,800,25)]),
 shells=panel==='a'?unique([.02,.05,.1,.25,.5,.75,...seq(1,100,.5),...seq(102,200,2),...seq(210,500,10),...seq(525,800,25)]):unique([.02,.05,.1,.25,.5,.75,...seq(1,150,1),...seq(152,300,2),...seq(310,600,10),...seq(625,900,25)]),
 wavelengths=observations.rows.find(r=>r.panel===panel).wl,
 meta={panel,radii,shells,wavelengths,shape:[radii.length,shells.length,wavelengths.length],units:'Cext in nm²',material:'au',opticalData:'Olmon/McPeak complex-permittivity average',A:1,length:'4V/S; inner and outer shell interfaces',ncore:1.45,nmedium:1.33,sourceHashes:['src/modern-optics.js','src/surface.js'].map(f=>({file:f,sha256:hash(path.join(dir,f))})),dataType:'float64 little endian'};
 const stem=path.join(dir,'tmp/oldenburg-grid-'+panel),json=JSON.stringify(meta);
 if(fs.existsSync(stem+'.json')&&fs.existsSync(stem+'.bin')&&fs.readFileSync(stem+'.json','utf8')===json){console.log('Reused modern grid '+panel);continue;}
 const values=new Float64Array(meta.shape.reduce((a,b)=>a*b)),start=performance.now();let at=0;
 for(let i=0;i<radii.length;i++){
  for(const t of shells)for(const wl of wavelengths){const ext=cross(radii[i],t,wl);if(!Number.isFinite(ext)||ext<0)throw Error(JSON.stringify({panel,r:radii[i],t,wl,ext}));values[at++]=ext;}
  if(i%25===0)console.log(panel,'radii',i+1+'/'+radii.length,Math.round((performance.now()-start)/1000)+'s');
 }
 fs.writeFileSync(stem+'.bin',Buffer.from(values.buffer));fs.writeFileSync(stem+'.json',json);console.log('Saved '+panel+': '+values.length+' native calculations, '+Math.round((performance.now()-start)/1000)+' s');
}
