const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'..');
require('../src/kernel/physics.js');require('../src/kernel/interior.js');require('../src/materials.js');require('../src/modern-optics.js');require('../src/surface.js');require('../src/population.js');
const P=MiePopulation,Mat=Materials,file=path.join(dir,'data/oldenburg-modern-fit.json'),report=JSON.parse(fs.readFileSync(path.join(dir,'data/oldenburg-modern-grid-fit.json'),'utf8'));
const cached=new Map(),nk=Mat.nk;Mat.nk=(id,wl)=>{if(id!=='au')return nk(id,wl);if(!cached.has(wl))cached.set(wl,nk(id,wl));return cached.get(wl);};
const config=(r,distributed)=>({lesson:'real',units:'spec',struct:'cs',mat:'au',matCore:'custom',ccn:1.45,cck:0,med:'custom',cmed:1.33,core:r.meanCoreRadiusNm,shell:r.meanShellThicknessNm,rad:r.meanCoreRadiusNm+r.meanShellThicknessNm,auto:true,sE:true,sM:true,solo:0,mpoles:false,popOn:distributed,popShape:'lognormal',popSize:distributed?r.coreNumberCV*100:0,popShell:distributed?r.shellNumberCV*100:0,popBeads:'independent',popQuality:'fine',surfaceOn:true,surfaceA:1,ns:1,pol:'unpol',view:'far',graph:'spectrum',swatch:false,report:'c',wl:800,wlMin:400,wlMax:1050});
function cross(s,pop,wl){let ext=0,sca=0;for(const o of pop){const b=o.beads[0],{c}=P.optical(s,b,wl),area=Math.PI*b.r*b.r;ext+=o.w*c.Qext*area;sca+=o.w*c.Qsca*area;}return [ext,sca];}
report.native={quadrature:'Exactly the lesson fine setting: 25 nodes, or 41 if a number CV exceeds 25%; nodes below weight 1e-16 omitted',maximumPeakNormalizedGridDifference:0,maximumPeakNormalized65NodeDifference:0,checks:[]};
for(const [panel,family] of Object.entries(report.families))for(const mode of ['single','population','background']){
 if(!family[mode])continue;
 for(const r of family[mode].rows){
  const s=config(r,mode!=='single'),pop=P.samples(s),raw=r.wl.map(wl=>cross(s,pop,wl)[0]),peak=Math.max(...r.signal);let amplitude=Math.max(0,raw.reduce((a,v,i)=>a+v*r.signal[i],0)/raw.reduce((a,v)=>a+v*v,0)),offset=0;
  if(r.allowBackground){const n=raw.length,sx=raw.reduce((a,v)=>a+v,0),sy=r.signal.reduce((a,v)=>a+v,0),sxx=raw.reduce((a,v)=>a+v*v,0),sxy=raw.reduce((a,v,i)=>a+v*r.signal[i],0);amplitude=(sxy-sx*sy/n)/(sxx-sx*sx/n);offset=(sy-amplitude*sx)/n;if(amplitude<0||offset<0)throw Error('Background fit lost positivity');}
  const prediction=raw.map(v=>v*amplitude+offset);r.offset=offset;
  const gridRaw=r.crossSectionsNm2.slice();r.gridRms=r.rms;r.amplitude=amplitude;r.prediction=prediction;r.crossSectionsNm2=raw;r.rms=Math.sqrt(prediction.reduce((a,v,i)=>a+((v-r.signal[i])/peak)**2,0)/raw.length);r.setup=s;r.samples=pop.length;
  r.gridDifference=Math.max(...raw.map((v,i)=>Math.abs(v-gridRaw[i])));
  r.peakNormalizedGridDifference=r.gridDifference*amplitude/peak;
  report.native.maximumPeakNormalizedGridDifference=Math.max(report.native.maximumPeakNormalizedGridDifference,r.peakNormalizedGridDifference);
  r.points=Array.from({length:326},(_,i)=>{const wl=400+2*i,[ext,sca]=cross(s,pop,wl);return [wl,ext,sca];});r.fitPeak=r.points.reduce((a,p)=>p[1]>a[1]?p:a,r.points[0])[0];
  r.atBounds=[];if(mode!=='single'&&r.shellNumberCV>=.4999)r.atBounds.push('shell number CV = 50% upper bound');if(mode!=='single'&&r.coreNumberCV>=.2499)r.atBounds.push('core number CV = 25% upper bound');
  if(mode!=='single'){
   const high=[];for(const a of P.rule(s.core,r.coreNumberCV,'lognormal',65))for(const t of P.rule(s.shell,r.shellNumberCV,'lognormal',65))high.push({w:a.w*t.w,beads:[{core:a.v,t:t.v,r:a.v+t.v}]});
   for(const wl of [450,600,750,900,1050]){const low=cross(s,pop,wl)[0],fine=cross(s,high,wl)[0],error=Math.abs(low-fine)*amplitude/peak;report.native.maximumPeakNormalized65NodeDifference=Math.max(report.native.maximumPeakNormalized65NodeDifference,error);report.native.checks.push({id:r.id,wavelengthNm:wl,peakNormalizedDifference:error});}
  }
  console.log(panel,mode,r.id,'native RMS',r.rms.toFixed(6),'mean r/t',s.core.toFixed(3),s.shell.toFixed(3),'nodes',pop.length);
 }
 family[mode].gridRms=family[mode].rms;family[mode].rms=Math.sqrt(family[mode].rows.reduce((a,r)=>a+r.rms*r.rms,0)/family[mode].rows.length);
 const labelled=family[mode].rows.filter(r=>r.TEM!==null);if(labelled.length)family[mode].labelledRms=Math.sqrt(labelled.reduce((a,r)=>a+r.rms*r.rms,0)/labelled.length);
}
report.defaultMode='population';report.defaultReason='Both families retain good whole-spectrum and held-out agreement with modern Au, A=1 and one shared core distribution per family. These optical fits do not uniquely establish the particle distributions.';
fs.writeFileSync(file,JSON.stringify(report,null,2));console.log('Native calculation checks',JSON.stringify(report.native).slice(0,300));
