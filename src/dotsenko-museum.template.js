/* Dotsenko's white pigments. Original scans with independent app calculations. */
(function(root){
 'use strict';
 const catalog=/*DOTSENKO_CATALOG*/[],data=/*DOTSENKO_DATA*/{},weights=/*DOTSENKO_WEIGHTS*/{},registeredData=/*DOTSENKO_REGISTERED*/{},registration=/*DOTSENKO_REGISTRATION*/{};
 const M=root.Mie,studies=root.MuseumStudies,fmt=(v,n=4)=>Number(v.toPrecision(n)).toString();
 function at(core,shell,wl,registered=false){
  const r=core+shell,n=(2.48+.08/(wl/1000)**2)*(registered?registration.indexFactor:1),k=2*Math.PI*1.5/wl;
  const c=M.coreShell(k*core,k*r,[1.48/1.5,0],[n/1.5,1e-4/1.5]);
  const eta=-Math.expm1(3*Math.log(core/r));
  return {q:c.Qsca,g:c.g,eta,sp:9*c.Qsca*(1-c.g)/(16*(r/1000)*eta)};
 }
 function integrated(core,shell,fine=true,registered=false){return weights[fine?'fine':'paper'].reduce((sum,[w,v])=>sum+v*at(core,shell,w,registered).sp,0);}
 function config(e,s){
  const map=e.dotsenkoMap,registered=!!s.museumDotsRegistered,paperH=map?Math.max(1,Math.min(140,s.museumCase||75)):e.cases.includes(s.museumCase)?s.museumCase:e.cases[0],h=map&&registered?paperH/registration.mapShellAxisFactor:paperH,core=map?s.museumBookX/(registered?registration.mapCoreAxisFactor:1):e.radius-h;
  return {lesson:'real',units:'spec',struct:core===0?'homog':'cs',mat:registered&&!map?'rutileDotsenkoRegistered':'rutileDotsenko',matCore:'custom',ccn:1.48,cck:0,med:'custom',cmed:1.5,rad:core+h,core,shell:h,wl:map?550:s.museumWavelength||550,wlMin:350,wlMax:700,graph:'spectrum',report:'q',auto:true,sE:true,sM:true,solo:0,mpoles:false,popOn:false,surfaceOn:false,pol:'unpol',view:'far',farParticle:false,swatch:true,swPhi:1e-6};
 }
 function xy(e,x,y){if(e.dotsenkoMap){const a=e.map;return [a.origin[0]+x*a.r[0]+y*a.h[0],a.origin[1]+x*a.r[1]+y*a.h[1]];}}
 function pointAt(e,layout,x,y){
  const a=e.map,u=(x-layout.left)/layout.fit-a.origin[0],v=(y-layout.top)/layout.fit-a.origin[1],det=a.r[0]*a.h[1]-a.h[0]*a.r[1];
  const core=(u*a.h[1]-v*a.h[0])/det,h=(a.r[0]*v-a.r[1]*u)/det;
  return core>=0&&core<=1500&&h>=1&&h<=140?{core:Math.round(core),shell:Math.round(h)}:null;
 }
 const oldModel=studies.model,oldState=studies.stateFor,oldDraw=studies.draw;
 studies.stateFor=(e,s)=>e.dotsenko?config(e,s):oldState(e,s);
 studies.model=function(e,s){
  if(!e.dotsenko)return oldModel(e,s);
  const p=config(e,s),map=e.dotsenkoMap,registered=!!s.museumDotsRegistered,selected=map?s.museumCase:p.shell,curves=map?(registered?data.map.registeredContours:data.map.contours):(registered?registeredData:data)[e.id].map(c=>({...c,points:s.museumResolved?c.points:c.paperPoints})),eta=1-(p.core/p.rad)**3;
  const v=at(p.core,p.shell,p.wl,registered&&!map),lines=[`Outer radius R = ${fmt(p.rad)} nm · core radius R_core = ${fmt(p.core)} nm`,`Shell thickness H = ${fmt(p.shell)} nm · rutile volume fraction η = ${fmt(eta*100)}%`,`Silica n_core = 1.48 · binder n_b = 1.50`,`Printed rutile n(λ) = 2.48 + 0.08/λ² · k = 10⁻⁴ · λ in µm`];
  if(registered)lines.push(map?`Registration: R_core,plot = ${fmt(registration.mapCoreAxisFactor,5)} R_core,app · H_plot = ${fmt(registration.mapShellAxisFactor,5)} H_app · ordinate × ${fmt(registration.mapOrdinateFactor,5)}`:`Empirical registration: app Re n_shell = ${fmt(registration.indexFactor,6)} × printed n_shell · n_shell(550 nm) = ${fmt(registration.indexFactor*(2.48+.08/.55**2),5)}`);
  if(map){const physical=integrated(p.core,p.shell);lines.push(`Physical D65-weighted S_p = ${fmt(physical)} µm⁻¹`);if(registered)lines.push(`Registered ordinate = ${fmt(physical*registration.mapOrdinateFactor)} µm⁻¹`,`Plot coordinates: R_core = ${s.museumBookX} nm · H = ${s.museumCase} nm`);lines.push(`Per rutile volume · 350–700 nm · Δλ = 1 nm`);}
  else lines.push(`At λ₀ = ${p.wl} nm: Q_sca = ${fmt(v.q)} · g = ${fmt(v.g)}`,`${s.museumResolved?'Resolved spectrum: Δλ = 2 nm':'Paper sampling: Δλ = 25 nm'} · same shell colours in both panels`);
  return {key:`${s.museumAgMaterial}/${e.id}/${s.museumCase}/${s.museumWavelength}/${s.museumPath}/${s.museumDamping}/${!!s.museumFit}/${!!s.museumPopulation}/${s.museumBookX}/${!!s.museumResolved}/${!!s.museumDotsRegistered}`,kind:'spectrum',curves,choices:map?curves.map(c=>({value:'contour'+c.value,label:`${c.value} µm⁻¹`,color:c.color,displayOnly:true})):curves.filter(c=>c.panel===0),selected,lines,match:registered?(map?'Three global registration factors · printed optical inputs · no individual contour fit':'One effective-index factor for all shells · no size or wavelength-axis fit'):(map?'Printed inputs · specific scattering per rutile volume':'Printed inputs · unshifted Mie calculation'),lesson:'05 Real particles',target:'real',canOpen:p.rad<=2000,coordinate:p.wl,settings:{source:e.author,doi:e.sources[0].url,figure:e.figure,empiricalRegistration:registered?(map?{coreAxisFactor:registration.mapCoreAxisFactor,shellAxisFactor:registration.mapShellAxisFactor,ordinateFactor:registration.mapOrdinateFactor}:{realShellIndexFactor:registration.indexFactor}):null,observable:map?'D65-weighted specific scattering per rutile volume':'Qsca and mean scattering cosine g',setup:p}};
 };
 studies.draw=function(c,e,s,m,layout,alpha){
  if(!e.dotsenko)return oldDraw(c,e,s,m,layout,alpha);
  const {left,top,fit}=layout,toCanvas=([x,y])=>[left+x*fit,top+y*fit],paths=[];
  c.save();c.globalAlpha=alpha;c.lineJoin='round';
  // The App layer needs its own calibrated axes after the scan is hidden.
  if(s.museumLayer==='app'){
   c.strokeStyle='#475561';c.fillStyle='#223744';c.lineWidth=1;c.font=`${Math.max(10,10*fit)}px sans-serif`;
   const line=(a,b)=>{c.beginPath();c.moveTo(...toCanvas(a));c.lineTo(...toCanvas(b));c.stroke();};
   const text=(label,point,align='center')=>{c.textAlign=align;c.fillText(label,...toCanvas(point));};
   if(e.dotsenkoMap){
    line(xy(e,0,1),xy(e,1500,1));line(xy(e,0,1),xy(e,0,140));
    for(const r of [0,500,1000,1500]){const p=xy(e,r,1);line(p,[p[0],p[1]+3]);text(String(r),[p[0],p[1]+14]);}
    for(const h of [25,50,75,100,125]){const p=xy(e,0,h);line([p[0]-3,p[1]],p);text(String(h),[p[0]-5,p[1]+3],'right');}
    text('Core radius (nm)',[240,338]);text('H (nm)',[6,13],'left');
   }else e.panels.forEach((p,i)=>{
    const min=i===0?0:e.radius===100?.2:.3,base=p.y0-min*p.sy;
    line([p.x0,p.top],[p.x0,base]);line([p.x0,base],[p.x1,base]);
    for(let w=350;w<=700;w+=50){const x=p.x0+(w-350)/350*(p.x1-p.x0);line([x,base],[x,base+3]);text(String(w),[x,base+14]);}
    for(const v of i===0?[0,1,2,3,4,5]:e.radius===100?[.2,.4,.6]:[.4,.6,.8,1]){const y=p.y0-v*p.sy;line([p.x0-3,y],[p.x0,y]);text(String(v),[p.x0-5,y+3],'right');}
    text(i===0?'(a) Scattering efficiency':'(b) Mean scattering cosine, g',[(p.x0+p.x1)/2,p.top-2]);text('Wavelength (nm)',[(p.x0+p.x1)/2,base+28]);
   });
  }
  if(e.dotsenkoMap){
   const mapFactor=s.museumDotsRegistered?registration.mapShellAxisFactor:1,coreFactor=s.museumDotsRegistered?registration.mapCoreAxisFactor:1,a=e.map,corners=[[0,1],[1500,1],[1500,140],[0,140]].map(([r,h])=>toCanvas(xy(e,r,h)));
   c.beginPath();corners.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.clip();
   for(const curve of m.curves){c.strokeStyle=curve.color;c.lineWidth=1.8;for(const segment of curve.segments){c.beginPath();segment.map(([r,h])=>toCanvas(xy(e,r*coreFactor,h*mapFactor))).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();}}
   c.strokeStyle='#195a88';c.setLineDash([5,4]);c.lineWidth=2;c.beginPath();data.map.ridge.map(([r,h])=>toCanvas(xy(e,r*coreFactor,h*mapFactor))).forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();c.setLineDash([]);
   const [x,y]=toCanvas(xy(e,s.museumBookX,s.museumCase));c.strokeStyle='#071e30';c.lineWidth=2.3;c.fillStyle='#fff';c.beginPath();c.arc(x,y,4.5,0,2*Math.PI);c.fill();c.stroke();c.beginPath();c.moveTo(x-9,y);c.lineTo(x+9,y);c.moveTo(x,y-9);c.lineTo(x,y+9);c.stroke();
  }else for(const curve of m.curves){
   const p=e.panels[curve.panel],clip={left:left+p.x0*fit,right:left+p.x1*fit,top:top+p.top*fit,bottom:top+p.bottom*fit};
   const points=curve.points.map(([w,v])=>[left+(p.x0+(w-350)/350*(p.x1-p.x0))*fit,top+(p.y0+(p.tilt||0)*(w-350)/350-v*p.sy)*fit,w]);
   paths.push({...curve,points,clip});c.save();c.beginPath();c.rect(clip.left,clip.top,clip.right-clip.left,clip.bottom-clip.top);c.clip();c.strokeStyle=curve.color;c.lineWidth=curve.value===m.selected?2.9:1.8;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
   if(curve.value===m.selected){const [x,y]=points.reduce((a,b)=>Math.abs(a[2]-m.coordinate)<Math.abs(b[2]-m.coordinate)?a:b);c.fillStyle='#fff';c.beginPath();c.arc(x,y,3.5,0,2*Math.PI);c.fill();c.stroke();}c.restore();
  }
  c.restore();return paths;
 };
 function csv(e,s){
  const corrected=!!s.museumDotsRegistered,rows=[['# empirical_registration',corrected?JSON.stringify(e.dotsenkoMap?{coreAxis:registration.mapCoreAxisFactor,Haxis:registration.mapShellAxisFactor,ordinate:registration.mapOrdinateFactor}:{ReShellIndex:registration.indexFactor}):'none'],['# source',e.sources[0].url],['# model','n_core=1.48,n_binder=1.50,n_rutile=2.48+0.08/lambda_um^2,k=0.0001']];
  if(e.dotsenkoMap){rows.push(['app_core_radius_nm','app_shell_thickness_nm','plotted_core_radius_nm','plotted_shell_thickness_nm','physical_D65_specific_scattering_um-1','registered_ordinate_um-1']);data.map.y.forEach((h,j)=>data.map.x.forEach((r,i)=>rows.push([r,h,r*(corrected?registration.mapCoreAxisFactor:1),h*(corrected?registration.mapShellAxisFactor:1),data.map.z[j][i],data.map.z[j][i]*(corrected?registration.mapOrdinateFactor:1)])));}
  else {rows.push(['# wavelength_step_nm',s.museumResolved?2:25]);rows.push(['outer_radius_nm','core_radius_nm','shell_thickness_nm','vacuum_wavelength_nm','Qsca','g']);for(const h of e.cases)for(let w=350;w<=700;w+=s.museumResolved?2:25){const v=at(e.radius-h,h,w,corrected);rows.push([e.radius,e.radius-h,h,w,v.q,v.g]);}}
  return rows.map(r=>r.map(v=>typeof v==='string'?'"'+v.replaceAll('"','""')+'"':v).join(',')).join('\n');
 }
 root.BHMuseumCatalog.push(...catalog);
 root.DotsenkoMuseum={catalog,data,weights,registration,registeredData,at,integrated,config,pointAt,xy,csv};
})(globalThis);
