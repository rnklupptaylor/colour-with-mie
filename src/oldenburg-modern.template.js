/* Modern shared-core reconstructions of the solid experimental nanoshell spectra. */
(function(root){
 'use strict';
 const report=/*OLDENBURG_MODERN*/{},studies=root.MuseumStudies,old={model:studies.model,stateFor:studies.stateFor,fitFor:studies.fitFor,populationFor:studies.populationFor,populationAt:studies.populationAt,gallery:studies.gallery};
 const relevant=e=>e?.id==='oldenburg-3a'||e?.id==='oldenburg-3b',family=e=>report.families[e.id.at(-1)],fmt=(v,n=4)=>Number(v.toPrecision(n)).toString(),cache=new Map();
 const row=(e,value,population)=>family(e)[population&&value===-1?'background':population?'population':'single'].rows.find(r=>r.captionShell===value);
 function setup(r,population,wl=800){return {...r.setup,popOn:population,wl,farParticle:false};}
 function populationFor(e,value){
  const r=row(e,value,true);if(!r)return null;
  return {modern:true,id:r.id,core:{mean:r.meanCoreRadiusNm,sd:r.coreRadiusSDNm},shell:{mean:r.meanShellThicknessNm,sd:r.shellThicknessSDNm},amplitude:r.amplitude,rms:r.rms,peak:r.fitPeak,points:r.points,setup:setup(r,true),distribution:'independent lognormal number distributions',sharedCore:true,A:1};
 }
 function populationAt(p,wl,exact=false){
  if(!p.modern)return old.populationAt(p,wl,exact);
  let ext,sca;
  if(exact){const v=root.MiePopulation.calculate({...p.setup,wl},wl,'cross');ext=v.ext;sca=v.sca;}
  else{const points=p.points,i=Math.min(points.length-2,Math.max(0,Math.floor((wl-points[0][0])/2))),a=points[i],b=points[i+1],u=(wl-a[0])/(b[0]-a[0]);ext=a[1]+u*(b[1]-a[1]);sca=a[2]+u*(b[2]-a[2]);}
  return {wl,core:p.core.mean,thickness:p.shell.mean,radius:p.core.mean+p.shell.mean,x:2*Math.PI*1.33*(p.core.mean+p.shell.mean)/wl,ncore:1.45,nmed:1.33,Cext:ext,Csca:sca,Cabs:ext-sca,population:true,coreSD:p.core.sd,shellSD:p.shell.sd,distribution:p.distribution,A:1,lengthConvention:'4V/S',sharedCore:true};
 }
 function fitFor(e,value,population=false){
  const r=row(e,value,population),prior=old.fitFor(e,value);if(!r)return null;
  return {core:r.meanCoreRadiusNm,shell:r.meanShellThicknessNm,amp:r.amplitude,offset:r.offset||0,rms:r.rms,TEM:r.TEM,targets:r.wl.map((wl,i)=>[wl,r.signal[i]]),targetSource:'digitized solid experimental curve',experimentalPeak:prior?.experimentalPeak,fitPeak:r.fitPeak,population:population?populationFor(e,value):null};
 }
 function gallery(e,population){
  const key=e.id+'/'+population;if(cache.has(key))return cache.get(key);
  const colors=['#176ecb','#c45a1a','#008b76','#8a4db1'];
  const curves=e.cases.map((value,i)=>{const r=row(e,value,population),fit=fitFor(e,value,population);return {value,core:fit.core,thickness:fit.shell,fit,color:colors[i],label:value===-1?`Rising trace · ${fit.shell.toFixed(1)} nm shell`:`TEM ${r.TEM} → ${population?'mean':'fit'} ${fit.shell.toFixed(1)} nm`,points:r.points.map(([wl,ext])=>[wl,ext])};});
  cache.set(key,curves);return curves;
 }
 studies.fitFor=(e,value)=>relevant(e)?fitFor(e,value):old.fitFor(e,value);
 studies.populationFor=(e,value)=>relevant(e)?populationFor(e,value):old.populationFor(e,value);
 studies.populationAt=populationAt;
 studies.gallery=(e,thesis,useFits,usePopulation)=>relevant(e)&&useFits?gallery(e,!!usePopulation):old.gallery(relevant(e)?{...e,cases:e.cases.filter(v=>v>0)}:e,thesis,useFits,usePopulation);
 studies.stateFor=(e,s)=>{if(!relevant(e))return old.stateFor(e,s);const value=e.cases.includes(s.museumCase)?s.museumCase:e.cases[0];return s.museumFit?setup(row(e,value,!!s.museumPopulation),!!s.museumPopulation,s.museumWavelength):{...old.stateFor({...e,cases:e.cases.filter(v=>v>0)},{...s,museumCase:value>0?value:e.cases[0]}),popOn:false,surfaceOn:false};};
 studies.model=function(e,s){
  if(!relevant(e))return old.model(e,s);
  if(!s.museumFit)return old.model({...e,cases:e.cases.filter(v=>v>0)},{...s,museumCase:s.museumCase>0?s.museumCase:e.cases[0]});
  const selected=e.cases.includes(s.museumCase)?s.museumCase:e.cases[0],population=!!s.museumPopulation,r=row(e,selected,population),fit=fitFor(e,selected,population),p=setup(r,population,s.museumWavelength),curves=gallery(e,population),current=populationAt({...populationFor(e,selected),setup:p,points:r.points,core:{mean:r.meanCoreRadiusNm,sd:population?r.coreRadiusSDNm:0},shell:{mean:r.meanShellThicknessNm,sd:population?r.shellThicknessSDNm:0}},p.wl);
  const lines=[`Core d ${fmt(2*r.meanCoreRadiusNm)}${population?' ± '+fmt(2*r.coreRadiusSDNm):''} nm${population?' SD':''} · shared across this family`,
   `Au shell ${fmt(r.meanShellThicknessNm)}${population?' ± '+fmt(r.shellThicknessSDNm):''} nm${population?' SD':''}`+(r.TEM===null?' · thin-shell interpretation':` · TEM ${r.TEM} nm`),
   `Olmon/McPeak Au · electron scattering A = 1 · L = 4V/S`,
   `${population?'Lognormal number distributions · ':''}ncore 1.45 · nwater 1.33`,
   `λ₀ ${fmt(p.wl)} nm · ${population?'mean ':''}Cext ${fmt(current.Cext,5)} nm²`];
  if(r.atBounds.length)lines.push('Fit bound: '+r.atBounds.join('; '));
  if(r.allowBackground)lines.push(`Constant vertical plotting offset ${fmt(r.offset)} source units. It is not part of the particle model.`);
  const details={...current,damping:true,fitted:true,captionCore:e.core,captionShell:selected,TEM:r.TEM,rms:r.rms,targetCount:r.wl.length,experimentalPeak:fit.experimentalPeak,fitPeak:r.fitPeak,material:'au',A:1};
  const match=`RMS ${(100*r.rms).toFixed(2)}%`+(fit.experimentalPeak?` · measured NIR peak ≈${Math.round(fit.experimentalPeak)} nm · app ${r.fitPeak} nm`:' · optical dimensions depend on the stated model.');
  return {key:`modern/${e.id}/${selected}/${p.wl}/${population}`,kind:'spectrum',curves,selected,useFit:true,usePopulation:population,lines,match,lesson:'05 Real particles',target:'real',details,
   settings:{lesson:'real',...details,setup:p,distribution:population?report.distribution:'Single-size particles with one shared core radius within each family.',normalization:r.allowBackground?'One positive multiplier and one constant vertical plotting offset register this spectrum. The offset is not included in the lesson or Lightbox particle model.':report.normalization,verticalPlotOffset:r.offset||0,sourceDoi:report.doi,opticalData:report.opticalData,electronScattering:report.electronScattering,bounds:family(e)[population&&selected===-1?'background':population?'population':'single'].bounds}};
 };
 root.OldenburgModern={report,setup,row,relevant,gallery,populationFor,populationAt};
})(globalThis);
