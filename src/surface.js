/* Semiclassical electron-boundary scattering. Energies are in eV, lengths in nm.
   Only the free-electron Drude term is replaced; the measured background is retained. */
(function(root){
 'use strict';
 const HBAR=6.582119569e-16,HC=1239.841984332,Mat=root.Materials;
 const rakic='10.1364/AO.37.005271';
 const presets={
  au:{plasma:9.03*Math.sqrt(.760),gamma:.053,vf:1.40e6,source:rakic},
  ag:{plasma:9.01*Math.sqrt(.845),gamma:.048,vf:1.39e6,source:rakic},
  cu:{plasma:10.83*Math.sqrt(.575),gamma:.030,vf:1.57e6,source:rakic},
  pt:{plasma:9.59*Math.sqrt(.333),gamma:.080,source:rakic,estimatedVelocity:true},
  pd:{plasma:9.72*Math.sqrt(.330),gamma:.008,source:rakic,estimatedVelocity:true}
 };
 // A single parabolic-band estimate is stated explicitly for transition metals.
 const velocity=plasma=>{const w=plasma/HBAR,me=9.1093837139e-31,e=1.602176634e-19,hbar=1.054571817e-34,n=8.8541878128e-12*me*w*w/(e*e);return hbar*Math.cbrt(3*Math.PI*Math.PI*n)/me;};
 for(const p of Object.values(presets))p.vf??=velocity(p.plasma);
 function fitDrude(id){
  // Effective NIR decomposition of the selected measured table. This does not
  // replace its n,k or assert a unique microscopic fit.
  const points=Array.from({length:16},(_,i)=>{const wl=850+i*50,g=Mat.nk(id,wl);return {E:HC/wl,re:g.n*g.n-g.k*g.k,im:2*g.n*g.k};});let best=null;
  for(let j=0;j<=800;j++){const gamma=.002*Math.exp(j*Math.log(500)/800),rows=[];let sx=0,sy=0,sxx=0,sxy=0;
   for(const p of points){const x=-1/(p.E*p.E+gamma*gamma),z=gamma/(p.E*(p.E*p.E+gamma*gamma));rows.push({x,z,...p});sx+=x;sy+=p.re;sxx+=x*x+z*z;sxy+=x*p.re+z*p.im;}
   const plasma2=(sxy-sx*sy/points.length)/(sxx-sx*sx/points.length),background=(sy-plasma2*sx)/points.length;if(plasma2<=0)continue;
   const error=rows.reduce((sum,p)=>sum+(background+plasma2*p.x-p.re)**2+(plasma2*p.z-p.im)**2,0);
   if(!best||error<best.error)best={plasma:Math.sqrt(plasma2),gamma,error,background};
  }
  return {...best,relativeRms:Math.sqrt(best.error/points.reduce((s,p)=>s+p.re*p.re+p.im*p.im,0)),vf:velocity(best.plasma),source:Mat.DB[id].doi,estimatedVelocity:true,effectiveFit:true,fitRangeNm:[850,1600]};
 }
 function parameters(id){
  if(Mat.DB[id]?.surfaceDrude)return {...Mat.DB[id].surfaceDrude};
  if(['auJC1972','auBabar2015','auOlmon2012','auMcPeak2015'].includes(id))return {...presets.au};
  if(id==='agMuller1911')return {...presets.ag};
  if(['mg','li'].includes(id)&&!presets[id])presets[id]=fitDrude(id);
  return presets[id]?{...presets[id]}:null;
 }
 const supported=id=>!!parameters(id);
 // Mean-chord / billiard convention: both shell interfaces contribute to S.
 function length(radius,core=0){return radius>0&&core>=0&&core<radius?4/3*(radius**3-core**3)/(radius**2+core**2):0;}
 function nk(id,wl,radius,core=0,options={}){
  const bulk=Mat.nk(id,wl),p=options.surfaceOn?parameters(id):null,A=Number.isFinite(+options.surfaceA)?Math.max(0,+options.surfaceA):1,L=length(radius,core);
  if(!p||!A||!L)return bulk;
  const E=HC/wl,g=p.gamma,dg=A*HBAR*p.vf/(L*1e-9),g2=g+dg,P=p.plasma*p.plasma;
  const re=bulk.n**2-bulk.k**2+P*(-1/(E*E+g2*g2)+1/(E*E+g*g));
  const im=2*bulk.n*bulk.k+P/E*(g2/(E*E+g2*g2)-g/(E*E+g*g));
  if(im<-1e-10)throw Error('The chosen surface correction is incompatible with a passive optical response at this size. Reduce A.');
  const abs=Math.hypot(re,im);return {...bulk,n:Math.sqrt(Math.max(0,(abs+re)/2)),k:Math.sqrt(Math.max(0,(abs-re)/2)),surface:{A,lengthNm:L,addedWidthEv:dg,...p}};
 }
 function metadata(p){
  if(!p.surfaceOn)return {enabled:false};
  const outer=p.struct==='cs'?p.core+p.shell:p.rad,continuous=p.struct==='cs'&&p.mat===p.matCore&&supported(p.mat);
  const geometry=continuous?[{id:p.mat,radius:outer,core:0}]:[{id:p.mat,radius:outer,core:p.struct==='cs'?p.core:0},...(p.struct==='cs'?[{id:p.matCore,radius:p.core,core:0}]:[])];
  return {enabled:true,A:p.surfaceA??1,convention:'L = 4 V / S; both interfaces for a metal shell; identical metal in both layers is continuous',distributionAppliedPerMember:!!p.popOn,geometryNote:p.popOn?'Listed geometry is the arithmetic-mean geometry; each quadrature member is evaluated at its own dimensions.':'Single particle geometry',layers:geometry.filter(l=>supported(l.id)).map(l=>({...l,effectiveLengthNm:length(l.radius,l.core),parameters:parameters(l.id),opticalSource:{name:Mat.DB[l.id]?.name,reference:Mat.DB[l.id]?.src,doi:Mat.DB[l.id]?.doi}})),limitations:'Semiclassical local Drude correction; interband response retained. Fully scattering interfaces are an assumption; different metal–metal interfaces may transmit electrons. Below a few nanometres, nonlocal and quantum effects are not described.'};
 }
 root.MieSurface={parameters,supported,length,nk,metadata};
})(globalThis);
