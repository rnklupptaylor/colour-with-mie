(function(root){
 'use strict';
 const fields=['surfaceOn','surfaceA','struct','mat','matCore','med','cn','ck','ccn','cck','cmed','rad','core','shell','popOn','popShape','popSize','popShell','popBeads','popQuality'];
 const num=(v,a,b,f)=>Number.isFinite(+v)&&+v>=a&&+v<=b?+v:f;
 function clean(snapshot){
  if(!snapshot?.particle)throw Error('Choose a physical particle or a colour-design result first.');
  const v=snapshot.particle,p={struct:v.struct==='cs'?'cs':'homog'};
  const material=id=>id==='custom'||id==='auOldenburg'||Object.hasOwn(root.Materials.DB,id);
  if(!material(v.mat)||!material(v.matCore||'sio2')||!(v.med==='custom'||Object.hasOwn(root.Materials.MEDIA,v.med)))throw Error('This sample has an unknown material or medium.');
  p.mat=v.mat;p.matCore=v.matCore||'sio2';p.med=v.med;
  for(const k of ['cn','ccn','cmed'])p[k]=num(v[k],k==='cmed'?.0001:0,1e6,k==='cmed'?1.33:1.5);
  for(const k of ['ck','cck'])p[k]=num(v[k],0,1e6,0);
  for(const k of ['rad','core','shell'])p[k]=num(v[k],0,1e6,k==='rad'?100:k==='core'?50:10);
  if(p.struct==='cs')p.rad=p.core+p.shell;
  if(!(p.rad>0))throw Error('The particle diameter must be greater than zero.');
  p.popOn=!!v.popOn;p.popShape=v.popShape==='gaussian'?'gaussian':'lognormal';p.popSize=num(v.popSize,0,50,10);p.popShell=num(v.popShell,0,50,10);p.popBeads='independent';p.popQuality=['quick','standard','fine'].includes(v.popQuality)?v.popQuality:'standard';
  p.surfaceOn=!!v.surfaceOn;p.surfaceA=num(v.surfaceA,0,3,1);
  const phi=+snapshot.phi;if(!Number.isFinite(phi)||phi<0||phi>.01)throw Error('The sample concentration is outside the supported volume-fraction range.');
  const paint={loading:.001,white:0};if(snapshot.paint!==undefined){if(!snapshot.paint||typeof snapshot.paint!=='object')throw Error('Invalid paint film settings.');for(const [k,max] of [['loading',.10],['white',.15]])if(snapshot.paint[k]!==undefined){const value=snapshot.paint[k];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>max)throw Error('Invalid dry-film '+k+' fraction.');paint[k]=value;}}
  const solid={loading:0,diameter:400};if(snapshot.solid!==undefined){if(!snapshot.solid||typeof snapshot.solid!=='object')throw Error('Invalid transparent-scatterer settings.');for(const [k,min,max] of [['loading',0,.05],['diameter',100,1000]])if(snapshot.solid[k]!==undefined){const value=snapshot.solid[k];if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)throw Error('Invalid transparent-scatterer '+k+'.');solid[k]=value;}}
  return {particle:p,phi,paint,solid,testCard:!!snapshot.testCard,sourceName:typeof snapshot.sourceName==='string'?snapshot.sourceName.slice(0,60):'',origin:snapshot.origin==='inverse'?'inverse':'forward',designIlluminant:['D65','D50','A','bleyer'].includes(snapshot.designIlluminant)?snapshot.designIlluminant:'D65',designWhiteBalance:['source','fixed'].includes(snapshot.designWhiteBalance)?snapshot.designWhiteBalance:'source',target:Array.isArray(snapshot.target)&&snapshot.target.length===3&&snapshot.target.every(Number.isFinite)?snapshot.target.slice():null};
 }
 const fmt=v=>Number(v).toLocaleString('en',{maximumSignificantDigits:4});
 const materialName=(id,n,k)=>id==='custom'?(Number.isFinite(n)&&Number.isFinite(k)?`Custom (${fmt(n)} + ${fmt(k)}i)`:'Custom material'):id==='custom-core'?'Custom core material':id==='custom-shell'?'Custom shell material':id==='auOldenburg'?'Gold (Oldenburg model)':root.Materials.DB[id]?.name||id;
 const shortName=id=>({au:'Au',auBabar2015:'Au',auOlmon2012:'Au',auMcPeak2015:'Au',fe3o4Fontijn:'Fe₃O₄',ag:'Ag',cu:'Cu',si:'Si',sio2:'SiO₂',ps:'PS',pmma:'PMMA',tio2:'TiO₂',water:'H₂O',soot:'Carbon',custom:'Custom',auOldenburg:'Au (Oldenburg)',mg:'Mg',li:'Li',pt:'Pt',pd:'Pd'})[id]||root.Materials.DB[id]?.name||id;
 function name(sample){const p=sample.particle;return p.struct==='cs'?`${shortName(p.matCore)} ${fmt(2*p.core)} / ${shortName(p.mat)} ${fmt(p.shell)} nm`:`${shortName(p.mat)} · ${fmt(2*p.rad)} nm`;}
 const columns=n=>n<=5?Math.max(1,n):Math.ceil(n/2);
 const concentration=phi=>phi>=1e-3?`${fmt(phi*100)} % by volume`:phi>=1e-6?`${fmt(phi*1e6)} ppm by volume`:`${fmt(phi*1e9)} ppb by volume`;
 const renderParticle=(sample,settings={})=>settings.container==='paint'?{...sample.particle,med:'custom',cmed:settings.paintBinderIndex??1.49,_paint:true}:['seidel','monolith'].includes(settings.container)?{...sample.particle,med:'custom',cmed:root.MieSolidMatrix.nk(settings.seidelMatrix||'bk7',550).n,_solidMatrix:settings.seidelMatrix||'bk7',...(sample.solid?.loading>0?{_solidScatterer:{mat:'sio2',diameter:sample.solid.diameter}}:{})}:sample.particle;
 const key=(sample,settings={})=>{const p=renderParticle(sample,settings);return JSON.stringify([...fields.map(k=>[k,p[k]]),...(p._paint?[['paint',true]]:[]),...(p._solidMatrix?[['solidMatrix',p._solidMatrix]]:[]),...(p._solidScatterer?[['solidScatterer',p._solidScatterer]]:[]),...(p._solidMix?[['solidMix',p._solidMix]]:[])]);};
 function checkedPhi(value){const phi=value;if(typeof phi!=='number'||!Number.isFinite(phi)||phi<0||phi>.01)throw Error('Concentration must be between zero and 1 % by volume.');return phi;}
 function readLightbox(input){
  const data=typeof input==='string'?JSON.parse(input):input;
  if(!data||data.version!==1||!Array.isArray(data.samples)||data.format&&data.format!=='scatter-with-mie-lightbox')throw Error('This is not a supported lightbox file.');
  if(data.samples.length>10)throw Error('A lightbox file can contain at most 10 samples.');
  const samples=[],ids=new Set();
  for(const raw of data.samples){
   const p=raw?.particle,id=raw?.id;if(raw.testCard!==undefined&&typeof raw.testCard!=='boolean')throw Error('Invalid transparency card setting.');if(!p||!['homog','cs'].includes(p.struct))throw Error('A sample has an invalid particle structure.');
   const number=(key,min,max=1e6)=>{if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error('A sample has an invalid '+key+' value.');};
   if(p.struct==='cs'){number('core',0);number('shell',0);if(!(p.core+p.shell>0))throw Error('A core–shell sample has zero outer diameter.');}else{number('rad',0);if(!p.rad)throw Error('A sample has zero diameter.');}
   if(p.mat==='custom'){number('cn',0);number('ck',0);}if(p.struct==='cs'&&p.matCore==='custom'){number('ccn',0);number('cck',0);}if(p.med==='custom'){number('cmed',.0001);}
   if(p.surfaceOn!==undefined&&typeof p.surfaceOn!=='boolean')throw Error('Invalid electron-scattering flag.');if(p.surfaceA!==undefined)number('surfaceA',0,3);
   if(p.popOn){if(!['lognormal','gaussian'].includes(p.popShape))throw Error('A sample has an invalid size distribution.');number('popSize',0,50);if(p.struct==='cs')number('popShell',0,50);if(!['quick','standard','fine'].includes(p.popQuality))throw Error('A sample has an invalid calculation detail setting.');}
   if(typeof id!=='string'||!/^[a-zA-Z0-9-]{1,80}$/.test(id)||ids.has(id))throw Error('Sample identifiers must be unique.');ids.add(id);
   if(typeof raw.name!=='string'||raw.name.length>60)throw Error('A sample has an invalid name.');
   samples.push({...clean({...raw,phi:checkedPhi(raw.phi)}),id,name:raw.name});
  }
  const given=data.settings||{},settings={lighting:'room',diameter:10,gain:1,pitch:typeof given.container==='string'&&given.container.startsWith('cuvette')?0:.13,yaw:0,container:'vial',walls:'clear',illuminant:'D65',whiteBalance:'source',sideAzimuth:0,familyGap:.12,familyRowGap:.08,familyScheme:'sample',familyLabels:true,densities:{},wettingMode:'auto',contactAngle:0,surfaceTension:72.8,solventDensity:.9982};
  if(given.lighting!==undefined){if(!['room','back','side','side-white'].includes(given.lighting))throw Error('The lighting setting is invalid.');settings.lighting=given.lighting;}
  for(const [key,min,max] of [['diameter',5,20],['gain',0,2],['pitch',-.05,.5],['yaw',-.7,.7],['sideAzimuth',0,85],['familyGap',0,1],['familyRowGap',0,.6]])if(given[key]!==undefined){if(!Number.isFinite(given[key])||given[key]<min||given[key]>max)throw Error('The '+key+' scene setting is invalid.');settings[key]=given[key];}
  settings.renderQuality='medium';settings.paintCard='checkerboard';settings.reflectanceMethod='adding-doubling';settings.reflectanceGeometry='45-0';settings.reflectanceObserver='1964-10';
  for(const [k,allowed] of [['reflectanceMethod',['adding-doubling','kubelka-munk']],['reflectanceGeometry',['45-0','d8-sce','d8-sci','diffuse']],['reflectanceObserver',['1931-2','1964-10','2006-10']],['renderQuality',['low','medium','high']],['paintCard',['checkerboard','white','black']]])if(given[k]!==undefined){if(!allowed.includes(given[k]))throw Error('Invalid '+k+' setting.');settings[k]=given[k];}
  settings.paintThickness=50;settings.paintBinderIndex=1.49;settings.paintLogo=false;settings.seidelLogo=false;settings.seidelFrontLight=false;settings.seidelMatrix='bk7';for(const k of ['paintLogo','seidelLogo','seidelFrontLight'])if(given[k]!==undefined){if(typeof given[k]!=='boolean')throw Error('Invalid logo option.');settings[k]=given[k];}if(given.seidelMatrix!==undefined){if(!Object.hasOwn(root.MieSolidMatrix.defs,given.seidelMatrix))throw Error('Invalid solid matrix.');settings.seidelMatrix=given.seidelMatrix;}
  for(const [key,min,max] of [['paintThickness',5,250],['paintBinderIndex',1.35,1.70]])if(given[key]!==undefined){if(!Number.isFinite(given[key])||given[key]<min||given[key]>max)throw Error('Invalid '+key+' setting.');settings[key]=given[key];}
  for(const [key,allowed] of [['container',['vial','cuvette1','cuvette10','paint','seidel','monolith']],['walls',['clear','matt']],['illuminant',['D65','D50','A','bleyer']],['whiteBalance',['source','fixed']],['familyScheme',['sample','alpha','roman','upper','numeric']]])if(given[key]!==undefined){if(!allowed.includes(given[key]))throw Error('The '+key+' setting is invalid.');settings[key]=given[key];}
  if(given.familyLabels!==undefined){if(typeof given.familyLabels!=='boolean')throw Error('Invalid family labels setting.');settings.familyLabels=given.familyLabels;}
  if(given.densities!==undefined){if(!given.densities||Array.isArray(given.densities)||typeof given.densities!=='object')throw Error('Invalid material densities.');for(const [id,rho] of Object.entries(given.densities)){if(!(['custom','custom-core','custom-shell'].includes(id)||Object.hasOwn(root.Materials.DB,id))||!Number.isFinite(rho)||rho<=0||rho>100)throw Error('Invalid material density.');settings.densities[id]=rho;}}
  if(given.wettingMode!==undefined){if(!['auto','custom','flat'].includes(given.wettingMode))throw Error('Invalid wetting setting.');settings.wettingMode=given.wettingMode;}
  for(const [key,min,max] of [['contactAngle',0,170],['surfaceTension',.1,1000],['solventDensity',.01,25]])if(given[key]!==undefined){if(!Number.isFinite(given[key])||given[key]<min||given[key]>max)throw Error('Invalid '+key+' setting.');settings[key]=given[key];}
  if(settings.container==='seidel'&&samples.length>3)throw Error('Seidlaglas mode supports at most three samples. Remove samples in another mode first.');
  const selection=Array.isArray(data.selectedIds)?[...new Set(data.selectedIds.filter(id=>ids.has(id)))]:ids.has(data.activeId)?[data.activeId]:[],activeId=selection.length===1?selection[0]:null;
  return {samples,settings,activeId,selectedIds:selection,multiple:!!data.multiple,title:samples.length&&typeof data.title==='string'?data.title.slice(0,120):''};
 }
 function fileData(collection,settings,activeId,title=''){
  const materialData=[...new Set(collection.samples.flatMap(s=>[s.particle.mat,...(s.particle.struct==='cs'?[s.particle.matCore]:[]),...(['seidel','monolith'].includes(settings.container)&&s.solid?.loading>0?['sio2']:[])]))].map(id=>root.Materials.provenance(id)||(id==='sio2'?{id,name:root.Materials.DB[id].name,title:root.Materials.DB[id].src,doi:root.Materials.DB[id].doi,rangeNm:root.Materials.DB[id].range.map(v=>1000*v),kind:'Published dispersion formula'}:null)).filter(Boolean);
  return {format:'scatter-with-mie-lightbox',version:1,appVersion:'29.0.0',savedAt:new Date().toISOString(),title:collection.samples.length?title:'',samples:structuredClone(collection.samples),...(settings.container==='paint'?{paintModel:{...root.MiePaint.metadata,fauLogo:{enabled:!!settings.paintLogo,middleRows:[2,3],belowCoating:true}}}:{}),...(['seidel','monolith'].includes(settings.container)?{solidModel:{mesh:(settings.container==='monolith'?root.MieMonolithMesh:root.MieSeidelMesh).metadata,matrix:root.MieSolidMatrix.metadata(settings.seidelMatrix||'bk7'),transparentScatterers:collection.samples.map(s=>({sampleId:s.id,material:'sio2',...s.solid})),phaseMixing:'Scattering-coefficient-weighted full Mie phase functions',fauLogo:!!settings.seidelLogo}}:{}),electronScattering:collection.samples.map(s=>({sampleId:s.id,...root.MieSurface.metadata(s.particle)})),settings:structuredClone(settings),materialData,activeId:collection.samples.some(s=>s.id===activeId)?activeId:null};
 }
 class Collection{
  constructor(saved){this.samples=[];if(saved?.version===1&&Array.isArray(saved.samples))for(const item of saved.samples.slice(0,10))try{const s=clean(item),id=String(item.id);if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||this.samples.some(x=>x.id===id))continue;this.samples.push({...s,id,name:typeof item.name==='string'?item.name.slice(0,60):name(s)});}catch{}}
  add(snapshot){if(this.samples.length>=10)throw Error('The lightbox is full (10 samples). Remove a sample before adding another.');const s=clean(snapshot);s.id='vial-'+(root.crypto?.randomUUID?.()||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2));s.name=name(s);this.samples.push(s);return s;}
  update(id,snapshot){const old=this.samples.find(s=>s.id===id);if(!old)throw Error('That sample is no longer in the lightbox.');const auto=old.name===name(old),s=clean(snapshot),modified=key(old)!==key(s)||old.phi!==s.phi,card=old.testCard,paint=old.paint,solid=old.solid,original=old.sourceName||old.name;Object.assign(old,s);old.testCard=card;old.paint=paint;old.solid=solid;if(modified){old.sourceName=original;old.name=(name(s)+' · edited').slice(0,60);}else if(auto)old.name=name(old);return old;}
  remove(id){const i=this.samples.findIndex(s=>s.id===id);return i<0?null:this.samples.splice(i,1)[0];}
  move(id,to){const from=this.samples.findIndex(s=>s.id===id);if(from<0)return false;to=Math.max(0,Math.min(this.samples.length-1,to));if(from===to)return false;const [s]=this.samples.splice(from,1);this.samples.splice(to,0,s);return true;}
  rename(id,value){const s=this.samples.find(s=>s.id===id);if(s)s.name=String(value).trim().slice(0,60)||name(s);}
  setConcentration(id,value){const phi=checkedPhi(value),s=this.samples.find(s=>s.id===id);if(!s)throw Error('Select a sample first.');s.phi=phi;return s;}
  equalize(id){const s=this.samples.find(s=>s.id===id);if(!s)throw Error('Select a sample first.');const phi=s.phi;for(const item of this.samples)item.phi=phi;return phi;}
  replace(input){const parsed=readLightbox(input);this.samples=parsed.samples;return parsed;}
  serialize(){return {version:1,samples:this.samples};}
 }
 root.MieLightboxModel={Collection,clean,key,renderParticle,name,fmt,materialName,concentration,columns,fields,readLightbox,fileData};
})(globalThis);

(function(root){
 const profiles={low:{cap:240,grid:24,base:24,side:32,paint:8},medium:{cap:480,grid:48,base:64,side:96,paint:12},high:{cap:900,grid:96,base:192,side:256,paint:16}};
 root.MieRenderQuality={profiles,preview:s=>profiles[s?.renderQuality]||profiles.medium};
})(globalThis);
