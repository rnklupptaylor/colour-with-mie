
@@INCLUDE:src/kernel/physics.js@@
/* Real m=1 vector harmonics used by the x-polarized Mie expansion.
   Angular N: grad_Omega Y_e / sqrt(n(n+1)).
   Angular M: -rhat cross grad_Omega Y_o / sqrt(n(n+1)).
   Each angular vector has integral |F|^2 dOmega = 1.
   The regular spatial view instead uses the conventional, unnormalized
   M_o1n^(1), N_e1n^(1) wave functions already used by the Mie core. */
(function(root){
  const M=root.Mie;
  function harmonicBasis(point,N=10,angular=true){
    if(!angular)return M.field(point,null,{kind:'incident',N,details:true}).details.map(d=>({...d,en:[1,0],normalization:1,weight:[1,0],a:null,b:null}));
    const r=Math.hypot(...point)||1,mu=Math.max(-1,Math.min(1,point[2]/r)),st=Math.sqrt(Math.max(0,1-mu*mu)),phi=Math.atan2(point[1],point[0]),cp=Math.cos(phi),sp=Math.sin(phi),{pi,tau}=M.angular(mu,N),result=[];
    const cart=(t,p)=>[mu*cp*t-sp*p,0,mu*sp*t+cp*p,0,-st*t,0];
    for(let n=1;n<=N;n++){
      const A=Math.sqrt((2*n+1)/(2*Math.PI))/(n*(n+1));
      result.push({n,en:[A,0],normalization:A,weight:[1,0],a:null,b:null,pi:pi[n],tau:tau[n],electricBasis:cart(A*cp*tau[n],-A*sp*pi[n]),magneticBasis:cart(A*cp*pi[n],-A*sp*tau[n])});
    }
    return result;
  }
  function mixHarmonics(point,coefficients,opts={}){
    const N=opts.N||10,basis=opts.basis||harmonicBasis(point,N,opts.angular!==false),e=[0,0,0,0,0,0],details=opts.details?[]:null,vectorTerms=opts.details||opts.terms?[]:null;
    for(const b of basis){
      const cn=coefficients.electric[b.n]||[0,0],cm=coefficients.magnetic[b.n]||[0,0],term=vectorTerms?[0,0,0,0,0,0]:null;
      for(let k=0;k<6;k+=2){
        const re=cn[0]*b.electricBasis[k]-cn[1]*b.electricBasis[k+1]+cm[0]*b.magneticBasis[k]-cm[1]*b.magneticBasis[k+1];
        const im=cn[0]*b.electricBasis[k+1]+cn[1]*b.electricBasis[k]+cm[0]*b.magneticBasis[k+1]+cm[1]*b.magneticBasis[k];
        e[k]+=re;e[k+1]+=im;if(term){term[k]=re;term[k+1]=im;}
      }
      if(term)vectorTerms.push(term);
      if(details)details.push({...b,weight:[opts.masterGain??1,0],electricCoefficient:cn,magneticCoefficient:cm,electric:M.productVector(cn,b.electricBasis),magnetic:M.productVector(cm,b.magneticBasis)});
    }
    return {e,intensity:M.norm2(e),channels:[{e,angle:0,details,vectorTerms,terms:vectorTerms?.map(v=>v.slice(0,2)),incident:[0,0,0,0,0,0]}]};
  }
  M.harmonicBasis=harmonicBasis;M.mixHarmonics=mixHarmonics;
  if(typeof module!=='undefined')module.exports={harmonicBasis,mixHarmonics};
})(typeof globalThis!=='undefined'?globalThis:this);

@@INCLUDE:src/kernel/optics.js@@
@@INCLUDE:src/kernel/interior.js@@
@@INCLUDE:src/kernel/tmatrix.js@@
@@INCLUDE:src/materials.js@@
@@INCLUDE:src/modern-optics.js@@
@@INCLUDE:src/alloys.js@@
@@INCLUDE:src/surface.js@@

@@INCLUDE:src/kernel/cie2006.js@@
@@INCLUDE:src/kernel/illuminants-data.js@@
@@INCLUDE:src/kernel/illuminants.js@@
/* Colour of a colloid in a cuvette: CIE colorimetry (CIE 2006 10-degree observer, D65) and Monte Carlo light transport.
   Radiative transfer for independently scattering particles: scattering and absorption
   coefficients and the full (unpolarized) Mie phase function per wavelength, photon packets
   followed through a square cell (path L along z, width W in x and y) until they leave through
   the front (transmitted), the back (reflected) or a side face (scattered sideways).
   Matched boundaries (no wall reflections). Variance reduction: the unscattered beam is tallied
   analytically and every packet is forced to collide once; weights carry absorption; Russian roulette. */
(function(root){
  'use strict';
  const M=root.Mie;
  // CIE 2006 10-degree colour-matching functions (cie2006.js, 1 nm) and illuminant D65 combined into weighting
  // functions for spectra sampled every 10 nm from 380 to 780 nm (linear interpolation between samples).
  const WL=Array.from({length:41},(_,i)=>380+10*i);
  // CIE standard illuminant D65, 380-780 nm in 10 nm steps
  const D65=[49.98,54.65,82.75,91.49,93.43,86.68,104.86,117.01,117.81,114.86,115.92,108.81,109.35,107.80,104.79,107.69,104.41,104.05,100.00,96.33,95.79,88.69,90.01,89.60,87.70,83.29,83.70,80.03,80.21,82.28,78.28,69.72,71.61,74.35,61.60,69.89,75.09,63.59,46.42,66.81,63.38];
  const T6=root.CIE2006_10,cmf6=(k,l)=>{const i=l-T6.start;return i<0||i>=T6[k].length?0:T6[k][i];};
  const Wt=['x','y','z'].map(()=>new Float64Array(WL.length));
  for(let l=380;l<=780;l++){const f=(l-380)/10,i=Math.min(39,Math.floor(f)),u=f-i,d65=D65[i]*(1-u)+D65[i+1]*u;
    ['x','y','z'].forEach((k,c)=>{const v=cmf6(k,l)*d65;Wt[c][i]+=v*(1-u);if(u>0)Wt[c][i+1]+=v*u;});}
  const NY=Wt[1].reduce((a,b)=>a+b,0);Wt.forEach(w=>{for(let i=0;i<w.length;i++)w[i]/=NY;});
  const WHITE=Wt.map(w=>w.reduce((a,b)=>a+b,0));          // [Xn, 1, Zn] for D65 and the 10-degree observer
  const SRGB_W=[0.95047,1,1.08883];                       // sRGB (D65) white; XYZ is scaled to it for display
  const xyz=spec=>Wt.map(w=>w.reduce((s,v,i)=>s+v*spec[i],0));
  const fl=t=>t>216/24389?Math.cbrt(t):t*24389/3132+4/29,fi=t=>t>6/29?t*t*t:3*(6/29)**2*(t-4/29);
  const xyz2lab=([X,Y,Z])=>{const fx=fl(X/WHITE[0]),fy=fl(Y),fz=fl(Z/WHITE[2]);return [116*fy-16,500*(fx-fy),200*(fy-fz)];};
  const lab2xyz=([L,a,b])=>{const fy=(L+16)/116;return [WHITE[0]*fi(fy+a/500),fi(fy),WHITE[2]*fi(fy-b/200)];};
  // XYZ (relative to the D65/10-degree white) -> linear sRGB, white mapped to white
  let illuminant='D65',whiteBalance='source',activeProfile=root.MieIlluminants.profile('D65','source');
  function setIllumination(id='D65',balance='source'){const p=root.MieIlluminants.profile(id,balance),changed=id!==illuminant||balance!==whiteBalance;illuminant=id;whiteBalance=balance;activeProfile=p;Wt.forEach((w,i)=>w.set(p.W[i]));WHITE.forEach((_,i)=>WHITE[i]=p.white[i]);return changed;}
  try{const saved=JSON.parse(root.localStorage?.getItem('mie-illumination-v1')||'null'),hash=new URLSearchParams(root.location?.hash?.slice(1)||''),id=hash.get('illum')||saved?.illuminant||'D65',balance=hash.get('wb')||saved?.whiteBalance||'source';if(root.MieIlluminants.has(id))setIllumination(id,['source','fixed'].includes(balance)?balance:'source');}catch{}
  const lin=XYZ=>activeProfile.linear(XYZ);
  const gam=v=>v<=0.0031308?12.92*v:1.055*v**(1/2.4)-0.055;
  const css=rgb=>`rgb(${rgb.map(v=>Math.round(255*gam(Math.min(1,Math.max(0,v))))).join(',')})`;
  // L*a*b* -> sRGB for the target picker; inGamut is false when the colour cannot be shown on a standard screen
  function labToRGB(lab){const r=lin(lab2xyz(lab)),inGamut=r.every(v=>v>=-1e-4&&v<=1+1e-4);return {css:css(r),inGamut,rgb:r.map(v=>Math.min(1,Math.max(0,v)))};}
  // Spectrum (fraction of the illuminant, on WL) -> sRGB css colour and CIE 1976 L*a*b*
  function colour(spec){
    const XYZ=xyz(spec);let rgb=lin(XYZ).map(v=>Math.max(0,v));const m=Math.max(...rgb);if(m>1&&whiteBalance==='source')rgb=rgb.map(v=>v/m);
    return {css:css(rgb),lab:xyz2lab(XYZ),XYZ};
  }
  const lab=spec=>xyz2lab(xyz(spec));
  const dE76=(p,q)=>Math.hypot(p[0]-q[0],p[1]-q[1],p[2]-q[2]);
  // CIEDE2000 colour difference (Sharma, Wu and Dalal, Color Res. Appl. 30, 21 (2005)), kL = kC = kH = 1
  function dE2000(p,q){
    const [L1,a1,b1]=p,[L2,a2,b2]=q,R=Math.PI/180,C1=Math.hypot(a1,b1),C2=Math.hypot(a2,b2),Cm=(C1+C2)/2,G=0.5*(1-Math.sqrt(Cm**7/(Cm**7+25**7)));
    const a1p=(1+G)*a1,a2p=(1+G)*a2,C1p=Math.hypot(a1p,b1),C2p=Math.hypot(a2p,b2);
    const h=(a,b)=>{if(a===0&&b===0)return 0;const t=Math.atan2(b,a)/R;return t<0?t+360:t;},h1=h(a1p,b1),h2=h(a2p,b2);
    const dL=L2-L1,dC=C2p-C1p;let dh=0;if(C1p*C2p!==0){dh=h2-h1;if(dh>180)dh-=360;else if(dh<-180)dh+=360;}
    const dH=2*Math.sqrt(C1p*C2p)*Math.sin(dh*R/2),Lm=(L1+L2)/2,Cmp=(C1p+C2p)/2;
    let hm=h1+h2;if(C1p*C2p!==0){hm=Math.abs(h1-h2)<=180?(h1+h2)/2:(h1+h2<360?(h1+h2+360)/2:(h1+h2-360)/2);}
    const T=1-0.17*Math.cos((hm-30)*R)+0.24*Math.cos(2*hm*R)+0.32*Math.cos((3*hm+6)*R)-0.20*Math.cos((4*hm-63)*R);
    const dTh=30*Math.exp(-(((hm-275)/25)**2)),RC=2*Math.sqrt(Cmp**7/(Cmp**7+25**7)),SL=1+0.015*(Lm-50)**2/Math.sqrt(20+(Lm-50)**2),SC=1+0.045*Cmp,SH=1+0.015*Cmp*T,RT=-Math.sin(2*dTh*R)*RC;
    return Math.sqrt((dL/SL)**2+(dC/SC)**2+(dH/SH)**2+RT*(dC/SC)*(dH/SH));
  }
  // Inverse-CDF table of the scattering angle for the unpolarized phase function (|S1|^2+|S2|^2)/2.
  // The angle grid is quadratic, so the forward peak of large spheres is resolved.
  function phaseTable(c,K=401){
    const th=Float64Array.from({length:K},(_,i)=>Math.PI*(i/(K-1))**2),p=new Float64Array(K),cdf=new Float64Array(K);
    for(let i=0;i<K;i++){const s=M.amplitudes(c,Math.cos(th[i]));p[i]=0.5*(M.abs2(s.s1)+M.abs2(s.s2))*Math.sin(th[i]);}
    for(let i=1;i<K;i++)cdf[i]=cdf[i-1]+0.5*(p[i]+p[i-1])*(th[i]-th[i-1]);
    const tot=cdf[K-1];for(let i=0;i<K;i++)cdf[i]/=tot;
    let g=0;for(let i=1;i<K;i++)g+=0.5*(Math.cos(th[i])+Math.cos(th[i-1]))*(cdf[i]-cdf[i-1]);
    return {th,cdf,g};
  }
  function sampleCos(t,u){
    const c=t.cdf;let lo=0,hi=c.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(c[m]<u)lo=m;else hi=m;}
    const f=c[hi]>c[lo]?(u-c[lo])/(c[hi]-c[lo]):0;return Math.cos(t.th[lo]+f*(t.th[hi]-t.th[lo]));
  }
  // Small fast PRNG (xorshift128+ style, double in [0,1))
  function rng(seed=12345){let a=seed>>>0||1,b=0x9e3779b9,c=0x85ebca6b,d=0xc2b2ae35;return ()=>{const t=a^(a<<11);a=b;b=c;c=d;d=(d^(d>>>19))^(t^(t>>>8));return (d>>>0)/4294967296;};}
  // Follow n packets. mus, mua in 1/cm; L, W in cm. Returns weight sums (divide by n for fractions).
  function transport({mus,mua,L=1,W=1,table,n,rand=rng(),slab=false}){
    const mut=mus+mua,alb=mut>0?mus/mut:0,h=W/2,out={n,T:0,Tdirect:0,R:0,S:0,A:0};
    const w0=Math.exp(-mut*L);out.Tdirect=n*w0;out.T=n*w0;
    if(mut<=0||1-w0<1e-14)return out;
    for(let p=0;p<n;p++){
      let x=(rand()-0.5)*W,y=(rand()-0.5)*W,z=-Math.log(1-rand()*(1-w0))/mut,ux=0,uy=0,uz=1,w=1-w0;
      for(let guard=0;guard<1e6;guard++){
        // collision: absorb part of the weight, then scatter
        out.A+=w*(1-alb);w*=alb;
        if(w<1e-4){if(rand()<0.1)w*=10;else break;}
        const ct=sampleCos(table,rand()),st=Math.sqrt(Math.max(0,1-ct*ct)),ph=2*Math.PI*rand(),cp=Math.cos(ph),sp=Math.sin(ph);
        if(Math.abs(uz)>0.99999){ux=st*cp;uy=st*sp;uz=uz>0?ct:-ct;}
        else{const q=Math.sqrt(1-uz*uz),nx=st*(ux*uz*cp-uy*sp)/q+ux*ct,ny=st*(uy*uz*cp+ux*sp)/q+uy*ct,nz=-st*cp*q+uz*ct;ux=nx;uy=ny;uz=nz;}
        // free path to the next collision, or exit through the nearest face on the way
        const s=-Math.log(1-rand())/mut;
        const dz=uz>0?(L-z)/uz:uz<0?-z/uz:Infinity,dx=slab?Infinity:ux>0?(h-x)/ux:ux<0?(-h-x)/ux:Infinity,dy=slab?Infinity:uy>0?(h-y)/uy:uy<0?(-h-y)/uy:Infinity,d=Math.min(dx,dy,dz);
        if(s>=d){if(d===dz){if(uz>0)out.T+=w;else out.R+=w;}else out.S+=w;break;}
        x+=s*ux;y+=s*uy;z+=s*uz;
      }
    }
    return out;
  }
  // Source of a Web Worker that runs transport() off the main thread. Messages in:
  // {i, mus, mua, th, cdf, n, seed}; out: {i, n, T, R, S, A}. The functions above are self-contained.
  const workerSource=()=>`'use strict';${sampleCos.toString()}
${rng.toString()}
${transport.toString()}
`+
    `onmessage=e=>{const d=e.data,t0=performance.now(),o=transport({mus:d.mus,mua:d.mua,table:{th:d.th,cdf:d.cdf},n:d.n,rand:rng(d.seed)});postMessage({i:d.i,n:o.n,T:o.T,R:o.R,S:o.S,A:o.A,ms:performance.now()-t0});};`;
  root.MieColour={WL,D65,WHITE,W:Wt,setIllumination,get illuminant(){return illuminant;},get whiteBalance(){return whiteBalance;},get illuminationKey(){return illuminant+'|'+whiteBalance;},colour,lab,xyz,xyz2lab,lab2xyz,labToRGB,dE76,dE2000,phaseTable,sampleCos,rng,transport,workerSource};
  if(typeof module!=='undefined')module.exports=root.MieColour;
})(typeof globalThis!=='undefined'?globalThis:this);



@@INCLUDE:src/design.js@@




@@INCLUDE:src/export-names.js@@
