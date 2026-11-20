/* Plane-parallel, scalar spectral transport for a dry paint film.
   Mie phase functions are averaged in azimuth. Positive Gauss ordinates carry
   flux, so column sums directly test energy conservation. Adding/doubling
   retains substrate returns and Fresnel internal reflection. See README. */
(function(root){
 'use strict';
 function install(root){
  const PI=Math.PI,cache=new Map(),angles=new Map(),clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  function rule(n,critical=0){
   // Put the critical angle on a quadrature boundary. This resolves the
   // change to total internal reflection without an arbitrary sampled jump.
   if(critical>0&&critical<1&&n%2===0){const h=rule(n/2),mu=new Float64Array(n),w=new Float64Array(n);for(let i=0;i<n/2;i++){mu[i]=critical*h.mu[i];w[i]=critical*h.w[i];mu[i+n/2]=critical+(1-critical)*h.mu[i];w[i+n/2]=(1-critical)*h.w[i];}return {mu,w};}
   const mu=new Float64Array(n),w=new Float64Array(n);
   for(let i=0;i<n;i++){let x=Math.cos(PI*(i+.75)/(n+.5)),dp=0;
    for(let k=0;k<30;k++){let a=1,b=x;for(let j=2;j<=n;j++){const c=((2*j-1)*x*b-(j-1)*a)/j;a=b;b=c;}dp=n*(x*b-a)/(x*x-1);const dx=b/dp;x-=dx;if(Math.abs(dx)<1e-15)break;}
    mu[n-1-i]=(1+x)/2;w[n-1-i]=1/((1-x*x)*dp*dp);
   }return {mu,w};
  }
  const identity=n=>Float64Array.from({length:n*n},(_,i)=>+(i%n===Math.floor(i/n)));
  function mul(a,b,n){const c=new Float64Array(n*n);for(let i=0;i<n;i++)for(let k=0;k<n;k++){const x=a[i*n+k];if(!x)continue;for(let j=0;j<n;j++)c[i*n+j]+=x*b[k*n+j];}return c;}
  function mv(a,b,n){const c=new Float64Array(n);for(let i=0;i<n;i++)for(let j=0;j<n;j++)c[i]+=a[i*n+j]*b[j];return c;}
  function inverse(a,n){const b=identity(n),c=a.slice();for(let k=0;k<n;k++){let p=k;for(let i=k+1;i<n;i++)if(Math.abs(c[i*n+k])>Math.abs(c[p*n+k]))p=i;if(Math.abs(c[p*n+k])<1e-18)throw Error('The paint transport system could not be resolved. Reduce the film loading.');
    if(p!==k)for(let j=0;j<n;j++){let x=c[k*n+j];c[k*n+j]=c[p*n+j];c[p*n+j]=x;x=b[k*n+j];b[k*n+j]=b[p*n+j];b[p*n+j]=x;}
    const d=c[k*n+k];for(let j=0;j<n;j++){c[k*n+j]/=d;b[k*n+j]/=d;}for(let i=0;i<n;i++)if(i!==k){const f=c[i*n+k];for(let j=0;j<n;j++){c[i*n+j]-=f*c[k*n+j];b[i*n+j]-=f*b[k*n+j];}}
   }return b;}
  function fresnel(mu,n1,n2){const sin2=(n1/n2)**2*(1-mu*mu);if(sin2>=1)return 1;const c=Math.sqrt(Math.max(0,1-sin2)),rs=(n1*mu-n2*c)/(n1*mu+n2*c),rp=(n2*mu-n1*c)/(n2*mu+n1*c);return (rs*rs+rp*rp)/2;}
  function phaseAt(data,band,cost){const x=Math.sqrt(Math.acos(clamp(cost,-1,1))/PI)*(data.densityWidth-1),i=Math.min(data.densityWidth-2,Math.floor(x)),f=x-i,k=band*data.densityWidth;return Math.exp(data.density[k+i]*(1-f)+data.density[k+i+1]*f);}
  function phaseMatrix(data,band,q,azimuths){
   const {mu,w}=q,n=mu.length,key=JSON.stringify([Array.from(mu),data.densityWidth,azimuths]);let geometry=angles.get(key);
   if(!geometry){geometry=[];for(let j=0;j<n;j++)for(let i=0;i<n;i++)for(let k=0;k<azimuths;k++){
    const a=mu[i]*mu[j],b=Math.sqrt((1-mu[i]**2)*(1-mu[j]**2)),c=Math.cos(2*PI*(k+.5)/azimuths);
    for(const cost of [a+b*c,-a+b*c]){const x=Math.sqrt(Math.acos(clamp(cost,-1,1))/PI)*(data.densityWidth-1),index=Math.min(data.densityWidth-2,Math.floor(x));geometry.push(index,x-index);}
   }angles.set(key,geometry);if(angles.size>8)angles.delete(angles.keys().next().value);}
   const down=new Float64Array(n*n),up=new Float64Array(n*n),offset=band*data.densityWidth;let at=0;
   for(let j=0;j<n;j++){let total=0;for(let i=0;i<n;i++){let d=0,u=0;
    for(let k=0;k<azimuths;k++){const di=geometry[at++],df=geometry[at++],ui=geometry[at++],uf=geometry[at++];d+=Math.exp(data.density[offset+di]*(1-df)+data.density[offset+di+1]*df);u+=Math.exp(data.density[offset+ui]*(1-uf)+data.density[offset+ui+1]*uf);}
    down[i*n+j]=d*w[i];up[i*n+j]=u*w[i];total+=(d+u)*w[i];
   }for(let i=0;i<n;i++){down[i*n+j]/=total;up[i*n+j]/=total;}}
   return {down,up};
  }
  function slab(sca,abs,thickness,down,up,q,baseTolerance=1e-5){
   const n=q.mu.length,ext=sca+abs,tau=ext*thickness;let R=new Float64Array(n*n),T=identity(n);
   if(!tau)return {R,T};
   const doubles=Math.max(0,Math.ceil(Math.log2(tau/(baseTolerance*q.mu[0])))),dt=tau/2**doubles,albedo=sca/ext;
   for(let j=0;j<n;j++){const loss=-Math.expm1(-dt/q.mu[j]);for(let i=0;i<n;i++){R[i*n+j]=loss*albedo*up[i*n+j];T[i*n+j]=loss*albedo*down[i*n+j]+(i===j?1-loss:0);}}
   for(let k=0;k<doubles;k++){const rr=mul(R,R,n),a=identity(n);for(let j=0;j<a.length;j++)a[j]-=rr[j];const td=mul(T,inverse(a,n),n),newR=mul(mul(td,R,n),T,n),newT=mul(td,T,n);for(let j=0;j<R.length;j++)newR[j]+=R[j];R=newR;T=newT;}
   return {R,T};
  }
  function reflected(layer,q,nBinder,substrate){
   const {R,T}=layer,{mu,w}=q,n=mu.length,lambert=Float64Array.from(mu,(m,i)=>2*m*w[i]),rf=mv(R,lambert,n),tf=mv(T,lambert,n),den=1-substrate*rf.reduce((a,b)=>a+b,0),columnT=new Float64Array(n);
   for(let j=0;j<n;j++)for(let i=0;i<n;i++)columnT[j]+=T[i*n+j];
   const H=R.slice();for(let i=0;i<n;i++)for(let j=0;j<n;j++)H[i*n+j]+=tf[i]*substrate*columnT[j]/Math.max(1e-15,den);
   const A=identity(n);for(let i=0;i<n;i++)for(let j=0;j<n;j++)A[i*n+j]-=H[i*n+j]*fresnel(mu[j],nBinder,1);
   const beam=new Float64Array(n),m0=Math.sqrt(1-.5/(nBinder*nBinder)),entry=1-fresnel(Math.SQRT1_2,1,nBinder);let j=0;while(j<n-2&&mu[j+1]<m0)j++;const f=clamp((m0-mu[j])/(mu[j+1]-mu[j]),0,1);beam[j]=entry*(1-f);beam[j+1]=entry*f;
   const outgoing=mv(inverse(A,n),mv(H,beam,n),n),radiance=i=>outgoing[i]/(2*mu[i]*w[i]);
   const a=radiance(n-2),b=radiance(n-1),normal=b+(b-a)*(1-mu[n-1])/(mu[n-1]-mu[n-2]);
   return Math.max(0,normal*(1-fresnel(1,nBinder,1))/(nBinder*nBinder));
  }
  function bandResponse(data,band,config,detail=16){
   const n=detail,q=rule(n,Math.sqrt(Math.max(0,1-1/data.mediumIndex**2))),k=band*4,cp=data.coefficients,cw=data.white.coefficients,sp=cp[k]*100*config.loading,sw=cw[k]*100*config.white,sca=sp+sw,abs=(cp[k+1]*config.loading+cw[k+1]*config.white)*100;
   const phaseKey=(data.cacheId||'')+':'+band+':'+n;let phase=cache.get(phaseKey);
   if(!phase||phase.data!==data){phase={data};cache.set(phaseKey,phase);if(cache.size>330)cache.delete(cache.keys().next().value);}
   if(!phase.p)phase.p=phaseMatrix(data,band,q,detail*4);if(sw&&!phase.t)phase.t=phaseMatrix(data.white,band,q,detail*4);
   const down=new Float64Array(n*n),up=new Float64Array(n*n);for(let i=0;i<n*n;i++){down[i]=sca?(sp*phase.p.down[i]+(sw?sw*phase.t.down[i]:0))/sca:phase.p.down[i];up[i]=sca?(sp*phase.p.up[i]+(sw?sw*phase.t.up[i]:0))/sca:phase.p.up[i];}
   const layer=slab(sca,abs,config.thickness,down,up,q);
   return {black:reflected(layer,q,data.mediumIndex,.03),white:reflected(layer,q,data.mediumIndex,.90),sca,abs,layer,q};
  }
  async function spectrum(data,config,{detail=16,onProgress=()=>{},cancel=()=>false}={}){
   const black=new Float64Array(41),white=new Float64Array(41);
   for(let i=0;i<41;i++){if(cancel())return null;const a=bandResponse(data,i,config,detail);black[i]=a.black;white[i]=a.white;onProgress((i+1)/41);await new Promise(r=>setTimeout(r,0));}
   return {black,white,detail};
  }
  async function intrinsic(p,base,progress,preview){
   const c={...p};delete c._paint;const colour=await base(c,f=>progress(.72*f),preview),white=await base({...c,struct:'homog',mat:'tio2',rad:125,popOn:false,surfaceOn:false},f=>progress(.72+.28*f),preview);
   return {...colour,white,paint:true};
  }
  const metadata={model:'Scalar plane-parallel discrete-ordinate adding/doubling',geometry:'Unpolarized illumination at 45 degrees in air, normal viewing, specular excluded',phase:'Azimuth-averaged full Mie phase functions, flux-normalized angular quadrature',ordinatesPerHemisphere:16,previewOrdinatesPerHemisphere:8,baseLayerOpticalThicknessTolerance:1e-5,substrate:{blackReflectance:.03,whiteReflectance:.90,spectralModel:'Neutral Lambertian black and white, idealized non-fluorescent sealed card'},binder:'Clear, non-absorbing acrylic model, n = 1.49 unless specified',whitePigment:{material:'TiO2',diameterNm:250,dataset:'Siefke et al. 2016, film-derived optical constants',doi:'10.1002/adom.201600250',note:'Optically isotropic spherical model white, not a calibrated commercial rutile grade'},boundary:'Snell refraction, unpolarized Fresnel entry and internal return, radiance n-squared correction',concentration:'Independent dry-film volume fractions, binder occupies the remaining volume',limitations:'Independent spherical particles. No aggregation, dependent scattering, porosity, fluorescence, coherent thin-film interference or lateral transfer between checker squares. Dense paint predictions are qualitative.'};
  root.MiePaint={rule,mul,mv,inverse,fresnel,phaseAt,phaseMatrix,slab,reflected,bandResponse,spectrum,intrinsic,metadata};
 }
 install(root);root.MiePaint.source='('+install.toString()+')(globalThis);';
})(globalThis);
