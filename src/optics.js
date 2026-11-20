(function(root){
 'use strict';
 // Runs unchanged in the offline worker and the numerical checks.
 async function calculate(p,onProgress=()=>{},preview=false,options={}){
  const P=globalThis.MiePopulation,M=globalThis.Mie,Mat=globalThis.Materials,PI=Math.PI;
  const s={...p,lesson:'real',ns:1,pol:'unpol',popSize:p.popOn?p.popSize:0,popShell:p.popOn?p.popShell:0};
  const pop=P.samples(s),moments=P.moments(pop),medium=wl=>s._solidMatrix?globalThis.MieSolidMatrix.nk(s._solidMatrix,wl).n:s.med==='custom'?s.cmed:Mat.medium(s.med,wl).n;
  const maxX=2*PI*medium(380)/380*Math.max(...pop.map(o=>o.beads[0].r));
  if(maxX>200)throw Error('Some sizes exceed the visible-light calculation range. Reduce the particle size or distribution width in lesson 05.');
  // The first gallery sweep retains the full spectrum and size distribution,
  // but uses a coarse angular quadrature. Final tables use the original grid.
  const densityWidth=preview?17:maxX>15?1025:257,K=4*(densityWidth-1)+1;
  const wavelengths=options.wavelengths||Array.from({length:41},(_,i)=>380+10*i),bands=wavelengths.length;
  const coefficients=new Float32Array(bands*4),phase=new Float32Array(bands*512),density=new Float32Array(bands*densityWidth);
  const angles=Float64Array.from({length:K},(_,i)=>PI*(i/(K-1))**2),mus=Float64Array.from(angles,Math.cos),sin=Float64Array.from(angles,Math.sin);
  let basis=[],basisOrder=0;
  function ensureBasis(N){if(N<=basisOrder)return;basis=Array.from(mus,mu=>M.angular(mu,N));basisOrder=N;}
  for(let wlIndex=0;wlIndex<bands;wlIndex++){
   const wl=wavelengths[wlIndex];if(s._solidMatrix)s.cmed=medium(wl);const raw=new Float64Array(K);let sca=0,ext=0;
   for(const o of pop){
    const b=o.beads[0],{c,k}=P.optical(s,b,wl),area=PI*b.r*b.r;sca+=o.w*c.Qsca*area;ext+=o.w*c.Qext*area;
    if(c.Qsca>1e-25){ensureBasis(c.N);for(let i=0;i<K;i++){const {pi,tau}=basis[i];let ar=0,ai=0,br=0,bi=0;for(let n=1;n<=c.N;n++){const f=(2*n+1)/(n*(n+1)),a=c.a[n],b=c.b[n];ar+=(a[0]*pi[n]+b[0]*tau[n])*f;ai+=(a[1]*pi[n]+b[1]*tau[n])*f;br+=(a[0]*tau[n]+b[0]*pi[n])*f;bi+=(a[1]*tau[n]+b[1]*pi[n])*f;}raw[i]+=o.w*((ar*ar+ai*ai)+(br*br+bi*bi))/(2*k*k);}}
   }
   const cdf=new Float64Array(K);let g=0;
   if(sca<1e-25)raw.fill(1/(4*PI));
   for(let i=1;i<K;i++){const dx=angles[i]-angles[i-1],a=raw[i-1]*sin[i-1],b=raw[i]*sin[i];cdf[i]=cdf[i-1]+.5*(a+b)*dx;g+=.5*(a*mus[i-1]+b*mus[i])*dx;}
   const total=cdf[K-1],normal=2*PI*total;g=total?g/total:0;
   for(let i=0;i<K;i++)cdf[i]/=total;
   for(let i=0;i<densityWidth;i++)density[wlIndex*densityWidth+i]=Math.log(Math.max(1e-30,raw[i*4]/normal));
   let cursor=1;for(let i=0;i<512;i++){const u=(i+.5)/512;while(cursor<K-1&&cdf[cursor]<u)cursor++;const f=(u-cdf[cursor-1])/Math.max(1e-30,cdf[cursor]-cdf[cursor-1]);phase[wlIndex*512+i]=Math.cos(angles[cursor-1]+f*(angles[cursor]-angles[cursor-1]));}
   coefficients.set([sca/moments.volume*10,Math.max(0,ext-sca)/moments.volume*10,g,medium(wl)],wlIndex*4);
   onProgress((wlIndex+1)/bands);await new Promise(r=>setTimeout(r,0));
  }
  return {coefficients,phase,density,densityWidth,mediumIndex:medium(550),...(s._solidMatrix?{solidMatrix:globalThis.MieSolidMatrix.metadata(s._solidMatrix)}:{}),volume:moments.volume,count:pop.length,preview};
 }
 async function solid(p,onProgress=()=>{},preview=false){const c={...p};delete c._solidScatterer;const primary=await calculate(c,f=>onProgress(p._solidScatterer ? .6*f : f),preview);if(!p._solidScatterer)return primary;const secondary=await calculate({...c,struct:'homog',mat:p._solidScatterer.mat,rad:p._solidScatterer.diameter/2,popOn:false,surfaceOn:false},f=>onProgress(.6+.4*f),preview);return {...primary,secondary,scatterer:p._solidScatterer};}
 const workerSource=root.MieSolidMatrix.source+'\n'+root.MiePaint.source+`\nconst calculate=${calculate.toString()},solid=${solid.toString()},base=(p,f,v)=>p._solidScatterer?solid(p,f,v):calculate(p,f,v);self.onmessage=async e=>{const {key,particle,preview=false}=e.data;try{const progress=progress=>postMessage({key,progress}),result=particle._paint?await MiePaint.intrinsic(particle,base,progress,preview):await base(particle,progress,preview),buffers=[result.coefficients.buffer,result.phase.buffer,result.density.buffer];if(result.secondary)buffers.push(result.secondary.coefficients.buffer,result.secondary.phase.buffer,result.secondary.density.buffer);if(result.white)buffers.push(result.white.coefficients.buffer,result.white.phase.buffer,result.white.density.buffer);postMessage({key,result},buffers);}catch(error){postMessage({key,error:error.message||String(error)});}};`;
 root.MieLightboxOptics={calculate:(p,progress=()=>{},preview=false)=>p._paint?root.MiePaint.intrinsic(p,calculate,progress,preview):p._solidScatterer?solid(p,progress,preview):calculate(p,progress,preview),workerSource};
})(globalThis);
