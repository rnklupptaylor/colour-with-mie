/* Finite particulate films. Full Mie scalar transport or a Mie-derived two-flux comparison.
   Reflectance factors retain absolute scale. A black and white substrate are always solved.
   DOI 10.1364/AO.32.000559, DOI 10.1364/AO.33.007275, CIE 015:2018. */
(function(root){
 'use strict';
 function install(root){
  const methods={'adding-doubling':'Full angular transport (adding–doubling)','kubelka-munk':'Kubelka–Munk (two-flux approximation)'},geometries={'45-0':'45° / 0° · specular excluded','d8-sce':'d / 8° · specular excluded','d8-sci':'d / 8° · specular included',diffuse:'Diffuse / hemispherical · surface excluded'};
  const standard={black:.03,white:.90},PI=Math.PI;
  function domain(p,white=0){let lo=380,hi=1700;const limits=[];for(const id of [...new Set([p.mat,...(p.struct==='cs'?[p.matCore]:[]),...(white>0?['tio2']:[])])]){
   if(id==='custom')continue;const range=id==='auOldenburg'?[380,780]:root.Materials.range(id);lo=Math.max(lo,range[0]);hi=Math.min(hi,range[1]);limits.push({material:id,rangeNm:range});
  }return {min:lo,max:hi,limits,colourSupported:lo<=380+1e-6&&hi>=780-1e-6};}
  function grid(p,white,nir=false){const range=domain(p,white),wavelengths=[];for(let w=380;w<=780;w+=10)if(w>=range.min-1e-7&&w<=range.max+1e-7)wavelengths.push(w);if(nir)for(let w=800;w<=1700;w+=20)if(w>=range.min-1e-7&&w<=range.max+1e-7)wavelengths.push(w);return {wavelengths,range};}
  function substrateLayer(layer,q,substrate){const P=root.MiePaint,{R,T}=layer,n=q.mu.length,L=Float64Array.from(q.mu,(m,i)=>2*m*q.w[i]),rf=P.mv(R,L,n),tf=P.mv(T,L,n),den=1-substrate*rf.reduce((a,b)=>a+b,0),ct=new Float64Array(n),H=R.slice();for(let j=0;j<n;j++)for(let i=0;i<n;i++)ct[j]+=T[i*n+j];for(let i=0;i<n;i++)for(let j=0;j<n;j++)H[i*n+j]+=tf[i]*substrate*ct[j]/Math.max(1e-15,den);return H;}
  function boundary(H,q,index,geometry){const P=root.MiePaint,n=q.mu.length,A=new Float64Array(n*n),beam=new Float64Array(n),F=Array.from(q.mu,mu=>P.fresnel(mu,index,1));for(let i=0;i<n;i++)for(let j=0;j<n;j++)A[i*n+j]=+(i===j)-H[i*n+j]*F[j];
   if(geometry==='45-0'){const m0=Math.sqrt(1-.5/(index*index)),entry=1-P.fresnel(Math.SQRT1_2,1,index);let j=0;while(j<n-2&&q.mu[j+1]<m0)j++;const f=Math.max(0,Math.min(1,(m0-q.mu[j])/(q.mu[j+1]-q.mu[j])));beam[j]=entry*(1-f);beam[j+1]=entry*f;}
   else for(let j=0;j<n;j++)beam[j]=2*index*index*q.mu[j]*q.w[j]*(1-F[j]);
   const U=P.mv(P.inverse(A,n),P.mv(H,beam,n),n);
   if(geometry==='diffuse')return Math.max(0,U.reduce((sum,u,j)=>sum+u*(1-F[j]),0));
   const muAir=geometry==='45-0'?1:Math.cos(8*PI/180),target=Math.sqrt(1-(1-muAir*muAir)/(index*index));let j=0;while(j<n-2&&q.mu[j+1]<target)j++;const f=(target-q.mu[j])/(q.mu[j+1]-q.mu[j]),radiance=k=>U[k]/(2*q.mu[k]*q.w[k]);
   const body=Math.max(0,(radiance(j)*(1-f)+radiance(j+1)*f)*(1-P.fresnel(target,index,1))/(index*index));return body+(geometry==='d8-sci'?P.fresnel(muAir,1,index):0);
  }
  function kmLayer(K,S,L){if(S<1e-20)return {R:0,T:Math.exp(-K*L)};if(K<1e-20){const t=S*L;return {R:t/(1+t),T:1/(1+t)};}const a=1+K/S,b=Math.sqrt((a-1)*(a+1)),d=b*S*L,e=Math.exp(-d),v=-Math.expm1(-2*d),den=a*v+b*(1+e*e);return {R:v/den,T:2*b*e/den};}
  function km(sca,abs,g,L,index,substrate){const {R,T}=kmLayer(2*abs,.75*sca*(1-g),L),body=R+T*T*substrate/Math.max(1e-15,1-R*substrate),P=root.MiePaint,q=P.rule(48,Math.sqrt(Math.max(0,1-1/index**2))),air=P.rule(48);let re=0,ri=0;for(let i=0;i<q.mu.length;i++){ri+=2*q.mu[i]*q.w[i]*P.fresnel(q.mu[i],index,1);re+=2*air.mu[i]*air.w[i]*P.fresnel(air.mu[i],1,index);}return (1-re)*(1-ri)*body/Math.max(1e-15,1-ri*body);}
  function band(data,i,config,{method='adding-doubling',geometry='45-0',detail=24}={}){
   const P=root.MiePaint,k=i*4,c=data.coefficients,w=data.white.coefficients,sp=c[k]*100*config.loading,sw=w[k]*100*config.white,sca=sp+sw,abs=100*(c[k+1]*config.loading+w[k+1]*config.white),index=data.mediumIndex,g=sca?(sp*c[k+2]+sw*w[k+2])/sca:0;
   if(method==='kubelka-munk')return {black:km(sca,abs,g,config.thickness,index,standard.black),white:km(sca,abs,g,config.thickness,index,standard.white)};
   const q=P.rule(detail,Math.sqrt(Math.max(0,1-1/index**2))),p=P.phaseMatrix(data,i,q,detail*4),t=sw?P.phaseMatrix(data.white,i,q,detail*4):null,n=q.mu.length,down=new Float64Array(n*n),up=new Float64Array(n*n);
   for(let j=0;j<n*n;j++){down[j]=sca?(sp*p.down[j]+(sw?sw*t.down[j]:0))/sca:p.down[j];up[j]=sca?(sp*p.up[j]+(sw?sw*t.up[j]:0))/sca:p.up[j];}
   const layer=P.slab(sca,abs,config.thickness,down,up,q);return {black:boundary(substrateLayer(layer,q,standard.black),q,index,geometry),white:boundary(substrateLayer(layer,q,standard.white),q,index,geometry)};
  }
  async function spectrum(data,config,options={}){const count=data.coefficients.length/4,black=new Float64Array(count),white=new Float64Array(count);for(let i=0;i<count;i++){if(options.cancel?.())return null;const r=band(data,i,config,options);black[i]=r.black;white[i]=r.white;options.onProgress?.((i+1)/count);await new Promise(r=>setTimeout(r,0));}return {black,white,method:options.method||'adding-doubling',geometry:options.method==='kubelka-munk'?'diffuse':options.geometry||'45-0',detail:options.detail||24};}
  function colour(wavelengths,R,illuminant='D65',observer='1964-10'){
   if(wavelengths[0]>380||wavelengths.at(-1)<780)return null;
   const cmf=observer==='2006-10'?root.CIE2006_10:root.MieFilmObservers[observer],source=root.MieIlluminants.list().find(s=>s.id===illuminant);let XYZ=[0,0,0],white=[0,0,0],cursor=0;
   for(let nm=380;nm<=780;nm++){const j=nm-cmf.start;if(j<0||j>=cmf.x.length)continue;while(cursor<wavelengths.length-2&&wavelengths[cursor+1]<nm)cursor++;const t=(nm-wavelengths[cursor])/(wavelengths[cursor+1]-wavelengths[cursor]),r=R[cursor]*(1-t)+R[cursor+1]*t;for(let c=0;c<3;c++){const w=source.spd[nm-380]*cmf[['x','y','z'][c]][j];XYZ[c]+=r*w;white[c]+=w;}}
   const scale=100/white[1];XYZ=XYZ.map(x=>x*scale);white=white.map(x=>x*scale);const sum=XYZ.reduce((a,b)=>a+b,0),f=t=>t>(6/29)**3?Math.cbrt(t):t/(3*(6/29)**2)+4/29,v=XYZ.map((x,i)=>f(x/white[i])),Lab=[116*v[1]-16,500*(v[0]-v[1]),200*(v[1]-v[2])],C=Math.hypot(Lab[1],Lab[2]),h=C<1e-6?null:(Math.atan2(Lab[2],Lab[1])*180/PI+360)%360;
   const den=XYZ[0]+15*XYZ[1]+3*XYZ[2],dn=white[0]+15*white[1]+3*white[2],up=den?4*XYZ[0]/den:0,vp=den?9*XYZ[1]/den:0,Luv=[Lab[0],13*Lab[0]*(up-4*white[0]/dn),13*Lab[0]*(vp-9*white[1]/dn)];
   const mul=(M,x)=>M.map(row=>row.reduce((a,v,i)=>a+v*x[i],0)),B=[[.8951,.2664,-.1614],[-.7502,1.7135,.0367],[.0389,-.0685,1.0296]],BI=[[.9869929,-.1470543,.1599627],[.4323053,.5183603,.0492912],[-.0085287,.0400428,.9684867]],d65=[.95047,1,1.08883],sL=mul(B,white.map(x=>x/100)),tL=mul(B,d65),adapted=mul(BI,mul(B,XYZ.map(x=>x/100)).map((x,i)=>x*tL[i]/sL[i])),linear=mul([[3.2404542,-1.5371385,-.4985314],[-.969266,1.8760108,.041556],[.0556434,-.2040259,1.0572252]],adapted),encode=x=>x<=.0031308?12.92*x:1.055*Math.max(0,x)**(1/2.4)-.055,rgb=linear.map(x=>Math.round(255*Math.max(0,Math.min(1,encode(x)))));
   return {XYZ,xyY:[sum?XYZ[0]/sum:0,sum?XYZ[1]/sum:0,XYZ[1]],Lab,LCh:[Lab[0],C,h],Luv,uvPrime:[up,vp],whiteXYZ:white,hex:'#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join(''),rgb,outOfGamut:linear.some(x=>x<-.0001||x>1.0001),illuminant,observer,rangeNm:[380,780]};
  }
  root.MieFilmScience={methods,geometries,standard,domain,grid,kmLayer,km,band,boundary,substrateLayer,spectrum,colour,metadata:{references:['https://doi.org/10.1364/AO.32.000559','https://doi.org/10.1364/AO.33.007275','https://doi.org/10.25039/TR.015.2018'],km:'K = 2 μa. S = 3 μs (1 − g) / 4. Finite-layer two-flux equations, Lambertian substrate and diffuse Saunderson boundary correction.',geometry:'Ideal smooth planar interface. d/8 SCE removes the direct Fresnel reflection only. Instrument ports, surface roughness and polarization transport are not modelled.',colour:'CIE observer, native illuminant white for XYZ/CIELAB/CIELUV. 380–780 nm integration with 1 nm interpolation. Bradford adaptation to D65 for the approximate sRGB display only.',nearInfrared:'Optional 800–1700 nm at 20 nm intervals, restricted to the intersection of constituent optical-data ranges. Binder is idealized as clear with constant real index. Colour coordinates always use 380–780 nm.'}};
 }
 install(root);root.MieFilmScience.source='('+install.toString()+')(globalThis);';
})(globalThis);
