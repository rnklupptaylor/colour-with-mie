const fs=require('node:fs'),path=require('node:path'),folder=path.resolve(__dirname,'..');
require('../src/kernel/physics.js');require('../src/kernel/tmatrix.js');require('../src/materials.js');require('../src/modern-optics.js');require('../src/alloys.js');require('../src/surface.js');require('../src/population.js');
const paper=JSON.parse(fs.readFileSync(path.join(folder,'data/evanoff-digitized.json'),'utf8')),M=globalThis.Mie,Mat=globalThis.Materials,P=globalThis.MiePopulation,A=1;
function points(d,sd,mat,wls,n=25){
 const rule=P.rule(d/2,sd/d,'lognormal',n);
 return wls.map(wl=>{const nm=Mat.medium('waterHale',wl).n,k=2*Math.PI*nm/wl;let total=0;
  for(const o of rule){const g=MieSurface.nk(mat,wl,o.v,0,{surfaceOn:true,surfaceA:1}),c=M.coefficients(k*o.v,[g.n/nm,g.k/nm]);total+=o.w*c.Qext*Math.PI*o.v*o.v;}
  return total*1e-4/Math.LN10;
 });
}
function score(r,d,sd,mat){
 const obs=r.points.filter((_,i)=>i%2===0),ys=points(d,sd,mat,obs.map(p=>p[0])),peak=r.peakCrossSectionNm2*1e-4/Math.LN10;
 return ys.reduce((s,y,i)=>s+((y-obs[i][1])/peak)**2,0)/ys.length;
}
// The bounded optical SD fit is a sensitivity test, not a confidence interval.
function fit(r,mat,mode){
 const width=r.diameterSpreadNm,table=r.tableDiameterNm,isSD=mode==='sd',lo=isSD?0:table-width,hi=isSD?.25*table:table+width,nominal=isSD?width:table;
 const objective=x=>score(r,isSD?table:x,isSD?x:width,mat);
 let best={value:nominal,score:objective(nominal)};
 for(let i=0;i<=16;i++){const value=lo+(hi-lo)*i/16,s=objective(value);if(s<best.score)best={value,score:s};}
 let a=Math.max(lo,best.value-(hi-lo)/8),b=Math.min(hi,best.value+(hi-lo)/8),g=(Math.sqrt(5)-1)/2,c=b-g*(b-a),d=a+g*(b-a),fc=objective(c),fd=objective(d);
 for(let i=0;i<38;i++){if(fc<fd){b=d;d=c;fd=fc;c=b-g*(b-a);fc=objective(c);}else{a=c;c=d;fc=fd;d=a+g*(b-a);fd=objective(d);}}
 best=[lo,hi,nominal,(a+b)/2].map(value=>({value,score:objective(value)})).sort((a,b)=>a.score-b.score)[0];
 if(best.value-lo<1e-5&&objective(lo)<=best.score+1e-12)best={value:lo,score:objective(lo)};
 const diameter=isSD?table:best.value,sd=isSD?best.value:width;
 return {diameter,sd,score:best.score,panel:r.panel,letter:r.letter,figureDiameter:r.figureDiameterNm,tableDiameter:table,publishedSpreadNm:width,cv:sd/diameter,A:1,mode,
  bounds:{meanDiameterNm:isSD?'fixed at Table 1 value':[lo,hi],sdNm:isSD?[lo,hi]:'fixed at Table 1 value'},
  atBound:Math.abs(best.value-lo)<1e-5||Math.abs(best.value-hi)<1e-5,tableScore:objective(nominal)};
}
const meanScore=rows=>rows.reduce((s,r)=>s+r.score,0)/rows.length;
const rowRms=rows=>Array.from({length:4},(_,i)=>Math.sqrt(meanScore(rows.slice(i*4,i*4+4))));
const choices=[];
for(const mat of ['ag','agJC1972','agRakicBB','agRakicLD']){
 const curves=paper.curves.map(r=>fit(r,mat,'mean')),sdCurves=paper.curves.map(r=>fit(r,mat,'sd'));
 choices.push({mat,A,reference:Mat.DB[mat].src,doi:Mat.DB[mat].doi,score:meanScore(curves),sdScore:meanScore(sdCurves),tableScore:curves.reduce((s,r)=>s+r.tableScore,0)/16,rowNormalizedRms:rowRms(curves),sdRowNormalizedRms:rowRms(sdCurves),curves,sdCurves});
 console.log('Evanoff',mat,'mean-fit RMS',Math.sqrt(choices.at(-1).score).toFixed(5),'SD-fit RMS',Math.sqrt(choices.at(-1).sdScore).toFixed(5));
}
const defaultChoice=choices.find(c=>c.mat==='ag'),best=[...choices].sort((a,b)=>a.score-b.score)[0],ranking=[...choices].sort((a,b)=>a.score-b.score).map(c=>({mat:c.mat,rms:Math.sqrt(c.score),rowRms:c.rowNormalizedRms,sdFitRms:Math.sqrt(c.sdScore)}));
const report={source:paper.source,method:'Three absolute extinction comparisons for all 16 panels under each of four Ag datasets. (1) Table 1 means and SDs. (2) Fitted mean within Table 1 mean ± reported spread, SD fixed. (3) Mean fixed exactly at Table 1; fitted SD from zero to 25% of the fixed mean. A fixed at 1 in all modes. Lognormal number distributions, absolute decadic normalization; no amplitude multiplier, baseline offset or wavelength shift. The Museum initial dataset minimizes the mean-fit equal-panel residual.',
 baseline:{mat:'ag',A:1,score:defaultChoice.tableScore},best,choices,ranking,lowestResidual:ranking[0].mat,defaultMaterial:best.mat,
 limits:'Table 1 gives mean ± widths, not full histograms; interpreting ± as number SD and choosing a lognormal shape are stated modelling assumptions. Mean and SD bounds are exploratory sensitivity ranges, not claimed confidence intervals. Fitted SDs are optical estimates rather than additional microscopy measurements. Reaching a bound is reported; residual differences remain visible. Figure/table diameter differences remain visible.',
 calibration:'Native PDF image; 360–760 nm printed wavelength scale and four ordinate ticks per panel. Panel P follows the extinction stroke through its 136 nm annotation, including corrected 644 and 656 nm markers. Dipole maxima from Table 1 validate the digitization independently, including P where the quadrupole is taller.'};
fs.writeFileSync(path.join(folder,'data/evanoff-fit.json'),JSON.stringify(report,null,2));
const data=JSON.parse(fs.readFileSync(path.join(folder,'data/paper-curves.json'),'utf8')),colors=['#1262ac','#d35a17','#00876b','#8654a8','#b22f62','#8c8813','#168b9e'];
for(const choice of choices)for(const mode of ['table','fit','sd']){
 const rows=mode==='sd'?choice.sdCurves:choice.curves;
 data['evanoff-2-'+choice.mat+'-'+mode]=rows.map((r,i)=>{
  const d=mode==='table'?r.tableDiameter:r.diameter,sd=mode==='table'?r.publishedSpreadNm:r.sd,wls=Array.from({length:401},(_,i)=>360+i),ys=points(d,sd,choice.mat,wls);
  return {value:r.figureDiameter,label:`${r.letter} · d ${r.figureDiameter} nm`,panel:i,color:colors[i%colors.length],points:wls.map((wl,i)=>[wl,ys[i]]),config:{...r,diameter:d,sd,cv:sd/d,A:1,mat:choice.mat,mode},
   normalization:'Cext(nm²) × 10⁻⁴ / ln 10; absolute per-particle scale; A = 1; '+(mode==='sd'?'Table 1 mean fixed; SD fitted in number CV 0–25%.':mode==='fit'?'Table 1 SD fixed; mean fitted within reported mean ± SD.':'Table 1 mean and SD fixed.')+' No amplitude fit.'};
 });
}
data['evanoff-2']=data['evanoff-2-'+best.mat+'-table'];data['evanoff-2-fit']=data['evanoff-2-'+best.mat+'-fit'];data['evanoff-2-sd']=data['evanoff-2-'+best.mat+'-sd'];delete data['turkevich-2'];delete data['evanoff-2-spread'];
fs.writeFileSync(path.join(folder,'data/paper-curves.json'),JSON.stringify(data));
console.log('All 16 samples fitted in both one-parameter modes for all four datasets. Initial dataset:',best.mat,'A=1 throughout.');
