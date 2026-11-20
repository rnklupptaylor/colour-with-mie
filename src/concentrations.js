(function(root){
 'use strict';
 const M=root.MieLightboxModel,cache=new Map();
 // Reference bulk densities in g/cm³. These are editable assumptions, not a
 // density inferred from optical constants or a measured nanoparticle density.
 const densities={au:19.32,ag:10.5,cu:8.96,al:2.699,si:2.33,zno:5.61,tio2:3.9,rutile:4.23,sio2:2.2,al2o3:3.98,ps:1.05,pmma:1.18,water:.997,soot:1.8,mg:1.74,li:.534,pt:21.45,pd:12.02};
 const canonical=id=>id==='auOldenburg'?'au':id;
 function moments(sample){
  const key=M.key(sample);if(cache.has(key))return cache.get(key);
  const p=sample.particle,s={...p,lesson:'real',ns:1,popSize:p.popOn?p.popSize:0,popShell:p.popOn?p.popShell:0},pop=MiePopulation.samples(s),parts={};let volume=0;
  for(const o of pop){const b=o.beads[0],outer=4*Math.PI/3*b.r**3,core=p.struct==='cs'?4*Math.PI/3*b.core**3:0;volume+=o.w*outer;const shellId=p.struct==='cs'&&p.mat==='custom'?'custom-shell':canonical(p.mat);parts[shellId]=(parts[shellId]||0)+o.w*(outer-core);if(p.struct==='cs'){const id=p.matCore==='custom'?'custom-core':canonical(p.matCore);parts[id]=(parts[id]||0)+o.w*core;}}
  const result={volume,parts,nodes:pop.length};cache.set(key,result);return result;
 }
 const density=(id,overrides={})=>{id=canonical(id);return Object.hasOwn(overrides,id)?overrides[id]:Object.hasOwn(densities,id)?densities[id]:root.Materials.DB[id]?.densityGcm3??null;};
 const number=sample=>sample.phi/(moments(sample).volume*1e-21);
 function massFactor(sample,basis='total',overrides={}){
  const m=moments(sample);let sum=0;
  for(const [id,v] of Object.entries(m.parts)){if(basis!=='total'&&canonical(basis)!==id||v<=0)continue;const rho=density(id,overrides);if(rho===null)throw Error('Enter a density for '+M.materialName(id)+' before matching mass.');sum+=rho*v/m.volume;}
  return sum;
 }
 function mass(sample,basis='total',overrides={}){return sample.phi*massFactor(sample,basis,overrides)*1e6;}
 function engineering(value){
  if(!Number.isFinite(value))return 'Unavailable';if(!value)return '0';
  const exp=3*Math.floor(Math.log10(Math.abs(value))/3);if(exp===0)return M.fmt(value);
  let mantissa=Number((value/10**exp).toPrecision(4)),power=exp;if(Math.abs(mantissa)>=1000){mantissa/=1000;power+=3;}
  const chars={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};
  return M.fmt(mantissa)+' × 10'+String(power).split('').map(c=>chars[c]).join('');
 }
 function matching(samples,referenceId,mode,basis='total',overrides={}){
  const ref=samples.find(s=>s.id===referenceId);if(!ref)throw Error('Select a reference sample first.');
  if(!['number','mass','volume'].includes(mode))throw Error('Choose number or mass concentration.');
  if(mode==='mass'&&massFactor(ref,basis,overrides)<=0)throw Error('The reference sample contains no mass of the selected material.');
  const reference=mode==='number'?number(ref):mode==='mass'?mass(ref,basis,overrides):ref.phi,updates=[],skipped=[];
  for(const s of samples){let phi;
   if(mode==='number')phi=reference*moments(s).volume*1e-21;
   else if(mode==='mass'){const f=massFactor(s,basis,overrides);if(f<=0){skipped.push(s.id);continue;}phi=reference/(f*1e6);}
   else phi=reference;
   if(s.id===referenceId)phi=ref.phi;
   if(!Number.isFinite(phi)||phi<0||phi>.01)throw Error('Matching “'+s.name+'” would exceed the supported 1 % particle volume fraction. No samples have been changed.');
   updates.push({id:s.id,phi});
  }
  return {mode,basis,reference,referenceId,updates,skipped,densities:{...overrides}};
 }
 const cuvetteSource='https://www.hellma.com/fileadmin/fos/Website/Broschueren_Flyer_Handhabung/Hellma_Analytics/Englisch/Hellma_Kuevettenkatalog_EN_2025_gross.pdf';
 function container(settings){
  if(settings.container==='monolith')return {kind:'monolith',name:'Curved glass monolith',...root.MieMonolithMesh.metadata,matrix:root.MieSolidMatrix.metadata(settings.seidelMatrix||'bk7')};
  if(settings.container==='seidel')return {kind:'seidel',name:'Seidlaglas · particle-filled solid',outsideDimensionsMm:[65,50,89],meshSource:'Humpen.stl',matrix:root.MieSolidMatrix.metadata(settings.seidelMatrix||'bk7'),surfaceLogo:!!settings.seidelLogo};
  if(settings.container==='paint')return {kind:'paint',name:'Paint film on '+(settings.paintCard||'checkerboard')+' card',card:settings.paintCard||'checkerboard',dryThicknessUm:settings.paintThickness??50,binderIndex:settings.paintBinderIndex??1.49,cardWidthMm:100,cardHeightMm:150,substrateReflectance:{black:.03,white:.90},illuminationAngleDegrees:45,viewingAngleDegrees:0};
  if(settings.container==='cuvette1'||settings.container==='cuvette10'){const path=settings.container==='cuvette1'?1:10;return {kind:settings.container,name:path+' mm cuvette',opticalPathMm:path,outerWidthMm:12.5,outerDepthMm:path+2.5,outerHeightMm:45,innerWidthMm:9.5,baseThicknessMm:1.5,edgeRadiusMm:.25,innerEdgeRadiusMm:.08,edgeNote:'Illustrative softened edges; manufacturer does not specify an edge radius.',sideWalls:settings.walls||'clear',glassIndex:1.46,source:cuvetteSource};}
  return {kind:'vial',name:'Cylindrical vial',innerDiameterMm:settings.diameter,sideWalls:'clear',glassIndex:1.48};
 }
 Object.assign(M,{densities,canonical,moments,density,number,mass,massFactor,engineering,matching,container});
})(globalThis);
