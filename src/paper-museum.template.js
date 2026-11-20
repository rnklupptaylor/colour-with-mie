/* New paper comparisons. Coloured curves are calculated, rather than traced targets. */
(function(root){
 'use strict';
 const catalog=/*PAPER_CATALOG*/[],data=/*PAPER_CURVES*/{},turk=/*TURK_FIT*/{},evanoff=/*EVANOFF_FIT*/{},observations=/*PAPER_OBSERVATIONS*/{};
 root.BHMuseumCatalog.push(...catalog);
 const studies=root.MuseumStudies,oldModel=studies.model,oldState=studies.stateFor,oldDraw=studies.draw,oldFit=studies.fitFor;
 const fmt=(x,n=4)=>Number(x.toPrecision(n)).toString();
 const agChoice=s=>evanoff.choices.find(c=>c.mat===s.museumAgMaterial)||evanoff.choices.find(c=>c.mat===evanoff.defaultMaterial);
 function config(e,s){
  const value=e.cases.includes(s.museumCase)?s.museumCase:e.cases[0],fit=!!s.museumFit,wl=Math.max(e.calibration.w0,Math.min(e.calibration.w1,s.museumWavelength||550));
  const common={lesson:'real',units:'spec',struct:'homog',mat:'au',med:e.id.startsWith('turkevich')?'water':'waterHale',rad:value/2,wl,wlMin:e.calibration.w0,wlMax:e.calibration.w1,graph:'spectrum',report:'c',auto:true,sE:true,sM:true,solo:0,mpoles:false,popOn:false,surfaceOn:false,surfaceA:1,pol:'unpol',view:'far',farParticle:false,swatch:true};
  if(e.id==='muller-3')return {...common,mat:'agMuller1911',med:'waterMuller',auto:fit,N:fit?14:1,sE:true,sM:fit,solo:fit?0:1,mpoles:!fit,swPhi:1e-6};
  if(e.id==='evanoff-2'){const choice=agChoice(s),r=(fit&&s.museumPopulation?choice.sdCurves:choice.curves).find(c=>c.figureDiameter===value),d=fit?r.diameter:r.tableDiameter,sd=fit?r.sd:r.publishedSpreadNm;return {...common,mat:choice.mat,rad:d/2,popOn:true,popShape:'lognormal',popSize:100*sd/d,popShell:0,popQuality:'fine',surfaceOn:true,surfaceA:1};}
  if(e.id==='turkevich-3'){const p=(fit?turk.best:turk.baseline).samples.find(p=>p.publishedDiameter===value);return {...common,mat:p.mat,rad:p.diameter/2,popOn:true,popShape:'lognormal',popSize:100*p.cv,popShell:0,popQuality:'fine',surfaceOn:p.A>0,surfaceA:p.A||1,swPhi:p.phi};}
  return {...common,swPhi:1e-6};
 }
 const water=[[420,420/313],[525,525/393],[650,650/488],[750,750/564]];
 function waterIndex(wl){let i=1;while(i<water.length-1&&water[i][0]<wl)i++;const a=water[i-1],b=water[i];return a[1]+(b[1]-a[1])*(wl-a[0])/(b[0]-a[0]);}
 studies.stateFor=(e,s)=>e.paperArtifact?config(e,s):oldState(e,s);
 studies.fitFor=(e,v)=>e.paperArtifact?e.hasComparison?{}:null:oldFit(e,v);
 studies.model=function(e,s){
  if(!e.paperArtifact)return oldModel(e,s);
  const p=config(e,s),fit=!!s.museumFit,value=e.cases.includes(s.museumCase)?s.museumCase:e.cases[0],suffix=fit?(e.id==='muller-3'?'-full':'-fit'):'',curves=e.id==='evanoff-2'?data[e.id+'-'+p.mat+(fit?(s.museumPopulation?'-sd':'-fit'):'-table')]:data[e.id+suffix]||data[e.id];
  let lines=[`Selected curve: published d ${value} nm · λ₀ ${fmt(p.wl)} nm`,`Calculation d ${fmt(2*p.rad)} nm · ${root.Materials.DB[p.mat].name}`,`Water optical model: ${p.med==='waterMuller'?'Müller’s rounded tabulation':p.med==='water'?'app water':'Hale–Querry 1973'} · all sizes are diameters`];
  if(e.id==='turkevich-3'){const r=(fit?turk.best:turk.baseline).samples.find(p=>p.publishedDiameter===value),ratio=r.peakToMinimum;lines.push(`Lognormal number CV ${fmt(p.popSize)}% · ${p.surfaceOn?'electron scattering A = 1 fixed':'bulk response'}`,`Fitted φ ${fmt(p.swPhi*1e6)} ppm · path L = 1 cm`,`Peak / blue minimum: paper ${fmt(ratio.paper,3)} · app ${fmt(ratio.app,3)} (${ratio.peakWavelengthNm}/${ratio.minimumWavelengthNm} nm)`,`Fit envelope: mean 85–115% of label · CV 8–15%`,fit&&(p.popSize>=14.99||p.popSize<=8.01||r.scale<=.851||r.scale>=1.149)?'A size/spread bound is reached; interpretation is in About this exhibit.':'The spread is an optical fit, constrained by the 1951 citrate results.');}

  if(e.id==='muller-3')lines.push(fit?'Full electric and magnetic Mie series':'Only electric a₁, as in Müller’s calculation',`Ag n,k from his Table 1 · exp(−iωt) convention`,`Published ordinate = 1000 Csca/Vparticle · φ = 1 ppm`,`Water n(λ) reconstructed from the paper’s four λ/λ′ values.`, 'Rounded tables and hand-drawn interpolation leave residual differences; see the numerical checks.');
  if(e.id==='evanoff-2'){
   const choice=agChoice(s),sdFit=fit&&s.museumPopulation,r=(sdFit?choice.sdCurves:choice.curves).find(c=>c.figureDiameter===value),score=sdFit?choice.sdScore:fit?choice.score:choice.tableScore;
   lines.push('Ordinate = Cext(nm²) × 10⁻⁴ / ln(10)',`Table 1: mean d ${r.tableDiameter} nm · SD ${r.publishedSpreadNm} nm; figure label ${value} nm`,
    sdFit?`Mean fixed at ${r.tableDiameter} nm · fitted SD ${fmt(r.sd)} nm`:fit?`Fitted mean ${fmt(r.diameter)} nm · SD fixed at ${r.publishedSpreadNm} nm`:'Published mean and SD; no size fit.',
    `Lognormal number CV ${fmt(p.popSize)}% · A = 1 fixed`,
    fit?(sdFit?`SD fit range ${r.bounds.sdNm.join('–')} nm (number CV 0–25%)`:`Mean fit range ${r.bounds.meanDiameterNm.join('–')} nm`)+(r.atBound?' · bound reached':''):'The lognormal shape is a modelling assumption.',
    `Normalized RMS: this panel ${fmt(Math.sqrt(fit?r.score:r.tableScore))} · all 16 ${fmt(Math.sqrt(score))}`,
    'No amplitude, offset or wavelength fit.'+(sdFit?' Fitted SD is an optical estimate, not a microscopy measurement.':''));
  }
  const match=e.id==='muller-3'?'Published optical inputs · absolute scattering normalization':e.id==='evanoff-2'?'Extinction only · absolute decadic normalization · bounded model comparison':e.id==='turkevich-3'?`A = 1 fixed · RMS OD ${fmt(turk.baselineFixedA1.rmse)} → ${fmt(turk.best.rmse)}; concentrations fitted.`:'Modern Au optical constants · one common amplitude registration';
  return {key:`${p.mat}/${e.id}/${s.museumCase}/${s.museumWavelength}/${s.museumPath}/${s.museumDamping}/${!!s.museumFit}/${!!s.museumPopulation}/${s.museumBookX}`,kind:'spectrum',curves,selected:value,lines,match,lesson:'05 Real particles',target:'real',canOpen:p.wl>=300&&p.wl<=2000,coordinate:p.wl,settings:{source:e.author,doi:e.sources[0].url,figure:e.figure,observable:e.observable,comparison:e.comparison,setup:p,normalization:curves.find(c=>c.value===value)?.normalization},details:{}};
 };
 studies.draw=function(c,e,s,m,layout,alpha){
  const paths=oldDraw(c,e,s,m,layout,alpha);
  if(e.paperArtifact&&s.museumTargets&&observations[e.id]){const {left,top,fit}=layout;c.save();c.strokeStyle='#111';c.fillStyle='#fff';c.lineWidth=1.1;c.globalAlpha=alpha;
   for(const row of observations[e.id]){if(row.value!==m.selected)continue;const p=e.panels[row.panel||0];for(const [x,y] of row.points.filter((_,i)=>e.id!=='evanoff-2'||i%6===0)){const px=left+(p.x0+(x-p.min)/(p.max-p.min)*(p.x1-p.x0))*fit,py=top+(p.y0-y*p.sy)*fit;c.beginPath();c.arc(px,py,3,0,2*Math.PI);c.fill();c.stroke();}}
   c.restore();
  }
  return paths;
 };
 root.PaperMuseum={catalog,data,config,waterIndex,turkevichFit:turk,evanoffFit:evanoff,observations};
})(globalThis);
