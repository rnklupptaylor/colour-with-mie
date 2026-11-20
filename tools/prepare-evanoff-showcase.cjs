/* Reuse the recorded fits without changing their targets or optical parameters. */
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),dir=path.resolve(__dirname,'..');
const file=path.join(dir,'data/evanoff-fit.json'),fit=JSON.parse(fs.readFileSync(file,'utf8')),sets=JSON.parse(fs.readFileSync(path.join(dir,'src/showcases.json'),'utf8'));
const winners=fit.choices[0].curves.map((_,i)=>fit.choices.flatMap(choice=>[choice.curves[i],choice.sdCurves[i]].map(row=>({...row,mat:choice.mat}))).sort((a,b)=>a.score-b.score)[0]);
const selected=[...winners].sort((a,b)=>a.score-b.score).slice(0,10).sort((a,b)=>a.diameter-b.diameter||a.panel-b.panel);
const massMgL=20,rho=10.5,phi=massMgL/(rho*1e6),fmt=x=>Number(x.toFixed(1)).toString();
const samples=selected.map(row=>({
 id:'evanoff-'+row.letter.toLowerCase(),name:`${row.letter} · Ag d ${fmt(row.diameter)} nm · SD ${fmt(row.sd)} nm`,
 particle:{struct:'homog',mat:row.mat,matCore:'sio2',med:'waterHale',rad:row.diameter/2,core:20,shell:5,cn:1.5,ck:0,ccn:1.45,cck:0,cmed:1.33,
  surfaceOn:true,surfaceA:1,popOn:row.sd>0,popShape:'lognormal',popSize:100*row.sd/row.diameter,popShell:0,popBeads:'independent',popQuality:'fine'},
 phi,origin:'forward',target:null,testCard:false,designIlluminant:'D65',designWhiteBalance:'source',
 sourceName:`Evanoff 2004 · Fig. 2 ${row.letter} · ${row.mode==='sd'?'SD':'mean'} fit`,
 provenance:{doi:'10.1021/jp0475640',figure:2,panel:row.letter,figureDiameterNm:row.figureDiameter,tableMeanDiameterNm:row.tableDiameter,tableSDNm:row.publishedSpreadNm,
  opticalDataset:row.mat,fitMode:row.mode,meanDiameterNm:row.diameter,diameterSDNm:row.sd,numberCV:row.cv,normalizedRms:Math.sqrt(row.score),bounds:row.bounds,boundReached:row.atBound,
  distributionAssumption:'Lognormal number distribution. Fitted widths are optical estimates; Table 1 widths are retained separately.',
  concentrationBasis:'Showcase choice: common 20 mg Ag/L at density 10.5 g/cm³; not inferred from the absolute per-particle spectra or reported as an experimental concentration.'}
}));
const showcase={format:'scatter-with-mie-lightbox',version:1,appVersion:'29.0.0',savedAt:new Date().toISOString(),
 title:'Evanoff & Chumanov 2004 · Ten best Ag fits',
 description:'The ten lowest-residual panel fits (E–N) from Figure 2, ordered by fitted mean diameter. Each panel uses its best match across the four available silver datasets and both constrained one-parameter fit modes. The chosen dataset and fit mode are retained for each sample. All use A = 1, the original lognormal number distribution and Hale–Querry water. Labels give calculation mean diameter and SD, not necessarily the reported TEM values. At the SD bound, the fit remains a bounded optical estimate. All samples have the same illustrative loading, 20 mg Ag/L, in 10 mm cuvettes under D65; the absolute per-particle figure does not determine the experimental loading.',
 source:{doi:'10.1021/jp0475640',url:'https://doi.org/10.1021/jp0475640',figure:2,fitReportSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),
  selection:'Best of four optical datasets × two one-parameter modes per panel, then ten lowest panel residuals; ascending calculation mean diameter.',
  panels:samples.map(s=>s.provenance.panel),massConcentrationMgL:massMgL,densityGcm3:rho,volumeFraction:phi,pathLengthMm:10,concentrationIsIllustrative:true},
 samples,activeId:null,selectedIds:[],settings:{...sets['tiny-wonders'].settings,lighting:'back',container:'cuvette10',diameter:10,gain:1,pitch:0,yaw:0,walls:'clear',illuminant:'D65',whiteBalance:'source',densities:{},familyLabels:true,familyScheme:'sample'}
};
sets['evanoff-best']=showcase;
fs.writeFileSync(path.join(dir,'src/showcases.json'),JSON.stringify(sets));
fs.writeFileSync(path.join(dir,'data/evanoff-showcase.json'),JSON.stringify(showcase,null,2)+'\n');
fs.writeFileSync(path.join(dir,'Evanoff-2004-10-best-fits.lightbox.json'),JSON.stringify(showcase,null,2)+'\n');
const html=path.join(dir,'src/lightbox-dialog.html'),option='<option value="evanoff-best">Evanoff 2004 · Ten best Ag fits</option>';
let h=fs.readFileSync(html,'utf8');
if(!h.includes('value="evanoff-best"')){
 const anchor='<option value="traore-alloys">Traoré 2023 · Ag–Au alloys</option>';
 if(h.split(anchor).length!==2)throw Error('Showcase selector marker changed');
 h=h.replace(anchor,anchor+option);fs.writeFileSync(html,h);
}
console.log('Prepared Evanoff panels '+selected.map(r=>r.letter).join(', ')+'; common Ag loading '+massMgL+' mg/L; all original fit parameters retained.');
