const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),dir=path.resolve(__dirname,'..'),read=f=>JSON.parse(fs.readFileSync(path.join(dir,'data',f),'utf8'));
require('../src/kernel/physics.js');require('../src/kernel/tmatrix.js');require('../src/materials.js');require('../src/modern-optics.js');require('../src/alloys.js');require('../src/surface.js');require('../src/population.js');
const data=read('paper-curves.json'),turk=read('turkevich-fit.json'),ev=read('evanoff-fit.json'),errors=[],quadratureErrors=[],quadraturePeakErrors=[],digitized=read('evanoff-digitized.json');
assert.equal(turk.best.A,1);assert.equal(ev.best.A,1);assert.equal(turk.best.mat,'au');assert.deepEqual(turk.bounds.numberCV,[.08,.15]);assert.ok(turk.opticalData.reference.includes('Olmon'));
for(const p of turk.best.samples){assert.ok(p.cv>=.08-1e-9&&p.cv<=.15+1e-9);assert.equal(p.A,1);const config={lesson:'real',struct:'homog',mat:'au',med:'water',rad:p.diameter/2,ns:1,popOn:true,popSize:100*p.cv,popShell:0,popQuality:'fine',popShape:'lognormal',surfaceOn:true,surfaceA:1,pol:'unpol'},volume=MiePopulation.moments(MiePopulation.samples(config)).volume;
 for(const wl of [400,470,520,550,650,700]){const expected=MiePopulation.calculate(config,wl,'cross').ext/volume*p.phi*1e7/Math.LN10,curve=data['turkevich-3-fit'].find(c=>c.value===p.publishedDiameter),actual=curve.points.find(p=>p[0]===wl)[1],error=Math.abs(actual-expected)/Math.max(1e-10,expected);assert.ok(error<1e-7);errors.push(error);}}
for(const choice of ev.choices){
 assert.equal(choice.A,1);assert.equal(choice.curves.length,16);assert.equal(choice.sdCurves.length,16);
 for(const mode of ['table','fit','sd'])for(const c of data['evanoff-2-'+choice.mat+'-'+mode]){
  const p=c.config;assert.equal(p.A,1);
  if(mode==='sd'){assert.equal(p.diameter,p.tableDiameter);assert.ok(p.sd>=0&&p.sd<=.25*p.tableDiameter);assert.equal(p.bounds.meanDiameterNm,'fixed at Table 1 value');assert.ok(p.score<=p.tableScore+1e-12,'SD fit cannot be worse than reported SD');}
  else {assert.equal(p.sd,p.publishedSpreadNm);if(mode==='table')assert.equal(p.diameter,p.tableDiameter);else assert.ok(p.score<=p.tableScore+1e-12);}
  assert.ok(p.cv<=.25);const config={lesson:'real',struct:'homog',mat:choice.mat,med:'waterHale',rad:p.diameter/2,ns:1,popOn:true,popSize:100*p.cv,popShell:0,popQuality:'fine',popShape:'lognormal',surfaceOn:true,surfaceA:1,pol:'unpol'};
  for(const wl of (mode==='sd'?Array.from({length:81},(_,i)=>360+5*i):[400,470,550,650,700])){const expected=MiePopulation.calculate(config,wl,'cross').ext*1e-4/Math.LN10,actual=c.points.find(p=>p[0]===wl)[1],error=Math.abs(actual-expected)/Math.max(1e-10,expected);assert.ok(error<1e-7,`${choice.mat}/${p.letter}/${mode}/${wl}: ${error}`);errors.push(error);
   // Broader fitted distributions require a convergence check beyond agreement
   // with the lesson's 25-node quadrature. Independently increase it to 41.
   // Use the same measured-dipole-peak normalization as the fit objective;
   // a 2% peak-scale tolerance remains below the errors of the broadest fits.
   if(mode==='sd'){const nm=Materials.medium('waterHale',wl).n,k=2*Math.PI*nm/wl;let sum=0;for(const member of MiePopulation.rule(p.diameter/2,p.cv,'lognormal',41)){const nk=MieSurface.nk(choice.mat,wl,member.v,0,{surfaceOn:true,surfaceA:1});sum+=member.w*Mie.coefficients(k*member.v,[nk.n/nm,nk.k/nm]).Qext*Math.PI*member.v**2;}const reference=sum*1e-4/Math.LN10,difference=Math.abs(actual-reference)/Math.max(1e-10,reference);const peakError=Math.abs(actual-reference)/(digitized.curves[p.panel].peakCrossSectionNm2*1e-4/Math.LN10);assert.ok(peakError<.02,`SD quadrature convergence ${choice.mat}/${p.letter}/${wl}: ${peakError} of measured peak`);quadratureErrors.push(difference);quadraturePeakErrors.push(peakError);}
  }
 }
}
// The native extinction stroke lies above dashed scattering in this region.
// These regressions cover the whole affected segment, not just displayed markers.
const pTrace=read('evanoff-digitized.json').curves[15].points;
for(const [wl,y] of pTrace.filter(([wl])=>wl>=642&&wl<=664)){assert.ok(y>3.4&&y<3.68,`P ${wl} must trace extinction`);const previous=pTrace.find(p=>p[0]===wl-2)[1];assert.ok(previous>=y&&previous-y<.04,'P trace remains continuous');}
assert.ok(Math.abs(pTrace.find(p=>p[0]===644)[1]-3.63463)<1e-4);assert.ok(Math.abs(pTrace.find(p=>p[0]===656)[1]-3.49299)<1e-4);
const report={passed:true,checkedSpectralValues:errors.length,maximumRelativeDifference:Math.max(...errors),sdQuadratureChecks:quadratureErrors.length,sdMaximumRelativeQuadratureDifference:Math.max(...quadratureErrors),sdMaximumPeakNormalizedQuadratureDifference:Math.max(...quadraturePeakErrors),sdPeakNormalizedQuadratureTolerance:.02,allFitsA1:true,evanoffFixedMeanSdFits:64,evanoffComparisonModes:3,evanoffPTraceCorrected:true,evanoffSdBound:'number CV 0–25%; mean exactly Table 1',turkevichDefaultDistributionRange:[.08,.15],defaultGold:'Olmon/McPeak epsilon consensus',turkevichRmsOd:turk.best.rmse,evanoffNormalizedRms:Math.sqrt(ev.best.score)};fs.writeFileSync(path.join(dir,'artifacts/paper-fits-validation.json'),JSON.stringify(report,null,2));console.log('PASS all three Evanoff modes reproduce lesson calculations; all 64 SD fits keep the Table 1 mean and A=1; P target regression and quadrature convergence pass.');
