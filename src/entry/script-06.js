
@@INCLUDE:src/charts.js@@
@@INCLUDE:src/scene.js@@
(function(root){
  'use strict';
  const M=root.Mie,cache=new Map();
  const norm=p=>{const r=Math.hypot(...p);return p.map(v=>v/r);};
  function fieldAt(p,n,family){
    const basis=M.harmonicBasis(p,n,true)[n-1][family==='N'?'electricBasis':'magneticBasis'];
    return [basis[0],basis[2],basis[4]];
  }
  function trace(seed,n,sign){
    const points=[seed];let p=seed,previous=null;
    const velocity=q=>{const v=fieldAt(norm(q),n,'N'),a=Math.hypot(...v);return a<1e-7?null:v.map(x=>sign*x/a);};
    const step=.012;
    for(let i=0;i<850;i++){
      const a=velocity(p);if(!a)break;
      if(previous&&a.reduce((s,v,j)=>s+v*previous[j],0)<-.4)break;
      const b=velocity(p.map((v,j)=>v+step*a[j]/2));if(!b)break;
      const c=velocity(p.map((v,j)=>v+step*b[j]/2));if(!c)break;
      const d=velocity(p.map((v,j)=>v+step*c[j]));if(!d)break;
      const q=norm(p.map((v,j)=>v+step*(a[j]+2*b[j]+2*c[j]+d[j])/6));
      if(q[1]<-1e-6)break;
      points.push(q);p=q;previous=a;
      if(i>20&&Math.hypot(...p.map((v,j)=>v-points[points.length-12][j]))<.025)break;
    }
    return points;
  }
  function electricLines(n){
    const lines=[],occupied=new Set(),cell=(u,v)=>`${Math.round(u/.055)},${Math.round(v/.055)}`;
    for(const x of [0,.3,-.3,.6,-.6,.82,-.82])for(const z of [-.97,-.88,-.7,-.45,-.2,0,.2,.45,.7,.88,.97]){
      const q=1-x*x-z*z;if(q<.006||occupied.has(cell(z,x)))continue;
      const seed=[x,Math.sqrt(q),z],a=trace(seed,n,-1),b=trace(seed,n,1);
      const points=[...a.reverse().slice(0,-1),...b].map(p=>[p[2],-p[0]]);
      if(points.length<12)continue;
      lines.push(points);points.forEach(([u,v])=>occupied.add(cell(u,-v)));
      if(lines.length>=28)return lines;
    }
    return lines;
  }
  function magneticLines(n){
    // Stream function of M_o1n: y P'_n(z). Its level curves have exactly
    // the tangents returned by harmonicBasis. Keep the visible y >= 0 half.
    const pi=z=>M.angular(z,n).pi[n],roots=[-1];
    let previous=pi(-.999999),last=-.999999;
    for(let i=1;i<=2000;i++){
      const z=-.999999+1.999998*i/2000,value=pi(z);
      if(previous*value<0){let a=last,b=z;for(let j=0;j<35;j++){const mid=(a+b)/2;if(pi(a)*pi(mid)<=0)b=mid;else a=mid;}roots.push((a+b)/2);}
      if(value===0&&Math.abs(z)>1e-8)roots.push(z);
      previous=value;last=z;
    }
    if(n%2===0&&!roots.some(z=>Math.abs(z)<1e-5))roots.push(0);
    roots.push(1);roots.sort((a,b)=>a-b);
    const lines=[];
    for(let k=0;k<roots.length-1;k++){
      const lo=roots[k],hi=roots[k+1];let peak=0;
      for(let i=1;i<500;i++){const z=lo+(hi-lo)*i/500,g=Math.sqrt(1-z*z)*pi(z);if(Math.abs(g)>Math.abs(peak))peak=g;}
      for(const f of [.2,.4,.6,.8]){
        const level=peak*f,positive=[];
        for(let i=1;i<1600;i++){
          const z=lo+(hi-lo)*i/1600,y=level/pi(z),r=1-z*z-y*y;
          if(y>=0&&r>=0)positive.push([z,-Math.sqrt(r)]);
        }
        if(positive.length>2)lines.push([...positive,...positive.slice().reverse().map(([z,x])=>[z,-x]),positive[0]]);
      }
    }
    return lines;
  }
  function fieldLines(n,family){const key=family+n;if(!cache.has(key))cache.set(key,family==='M'?magneticLines(n):electricLines(n));return cache.get(key);}
  // Mie, section 23: m'^2 relative to water (conjugated to the app's exp(-i wt)
  // convention), followed by the wavelength in water, all wavelength values in nm.
  const GOLD=[[420,0,3.20,313],[450,-.017,3.32,336],[500,-1.60,2.49,374],[525,-2.45,1.98,393],[550,-3.20,1.57,412],[600,-4.84,1.26,450],[650,-6.97,1.63,487]];
  function interpolate(column,x){
    const n=GOLD.length,ys=GOLD.map(r=>r[column]),h=[],s=[],d=[];
    for(let i=0;i<n-1;i++){h[i]=GOLD[i+1][0]-GOLD[i][0];s[i]=(ys[i+1]-ys[i])/h[i];}
    d[0]=s[0];d[n-1]=s[n-2];
    for(let i=1;i<n-1;i++){const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];d[i]=s[i-1]*s[i]<=0?0:(w1+w2)/(w1/s[i-1]+w2/s[i]);}
    let j=0;while(j<n-2&&x>GOLD[j+1][0])j++;
    const t=(x-GOLD[j][0])/h[j],t2=t*t,t3=t2*t;
    return (2*t3-3*t2+1)*ys[j]+(t3-2*t2+t)*h[j]*d[j]+(-2*t3+3*t2)*ys[j+1]+(t3-t2)*h[j]*d[j+1];
  }
  function goldOptics(wl){
    if(wl<420||wl>650)return null;
    const re=interpolate(1,wl),im=interpolate(2,wl),a=Math.hypot(re,im),m=[Math.sqrt((a+re)/2),Math.sqrt((a-re)/2)];
    const waterWavelength=interpolate(3,wl);
    return {wl,waterWavelength,m,nmed:wl/waterWavelength,permittivity:[re,im]};
  }
  function goldParameters(diameter,wl){
    const o=goldOptics(wl);if(!o)return null;
    const x=Math.PI*diameter/o.waterWavelength,c=M.coefficients(x,o.m),q=6*M.abs2(c.a[1])/(x*x);
    return {...o,diameter,x,c,q,scattering:750*q/(diameter/2)};
  }
  function goldDipole(diameter,wl){return goldParameters(diameter,wl)?.scattering??NaN;}
  function goldCurves(){
    if(!cache.has('gold'))cache.set('gold',Array.from({length:9},(_,i)=>{const diameter=20*(i+1);return {diameter,points:Array.from({length:231},(_,j)=>[420+j,goldDipole(diameter,420+j)])};}));
    return cache.get('gold');
  }
  function polarCurves(x,m){
    const key=`polar-${x}-${m}`;
    if(!cache.has(key)){
      if(cache.size>24)cache.clear();
      const c=M.coefficients(x,[m,0]);
      cache.set(key,[1,2].map(channel=>Array.from({length:1441},(_,i)=>{const angle=2*Math.PI*i/1440,a=M.amplitudes(c,Math.cos(angle));return [angle,M.abs2(channel===1?a.s1:a.s2)];})));
    }
    return cache.get(key);
  }
  const api={fieldAt,fieldLines,goldOptics,goldParameters,goldDipole,goldCurves,polarCurves,GOLD};root.MuseumMath=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

/* One spectral calculation shared by the Museum overlay and lesson 05.
   The historical optical data remain dispersive after following a curve. */
@@INCLUDE:src/museum-spectra.js@@

/* Dense, white-edged vector glyphs projected from the same 3D harmonic field.
   Kept local to Museum so the laboratory renderer and desktop lessons are exact. */
@@INCLUDE:src/museum-field.js@@

/* Historical spectra use the unmodified laboratory solvers. Absolute power is
   per sphere. Oldenburg's arbitrary-unit curves have explicit amplitude registration. */
@@INCLUDE:src/museum-studies.js@@

/* Scene data use the same functions, grid and MieScene renderer as the laboratory.
   The historic illustration is only a background, never a simulation texture. */
(function(root){
  'use strict';
  const M=root.Mie;
  function pattern(c,options){
    const T=Math.max(180,Math.min(720,Math.ceil(6*c.x))),P=96,values=new Float32Array((T+1)*(P+1));let peak=0;
    for(let i=0;i<=T;i++){
      const theta=Math.PI*i/T,a=M.amplitudes(c,Math.cos(theta),options),i1=M.abs2(a.s1),i2=M.abs2(a.s2);
      for(let j=0;j<=P;j++){
        const phi=2*Math.PI*j/P,c2=Math.cos(phi)**2,s2=1-c2,value=options.component===1?i1:options.component===2?i2:options.unpolarized?(i1+i2)/2:i2*c2+i1*s2;
        values[i*(P+1)+j]=value;peak=Math.max(peak,value);
      }
    }
    return {data:{kind:'pattern',T,P,values,radial:'lin',db:40,particle:{r:.16,show:false}},peak};
  }
  function model(exhibit,s){
    if(root.MuseumStudies.extra(exhibit))return root.MuseumStudies.model(exhibit,s);
    if(exhibit.kind==='field'){
      const cn=Array.from({length:11},()=>[0,0]),cm=Array.from({length:11},()=>[0,0]);
      (exhibit.family==='N'?cn:cm)[exhibit.n][0]=1;
      const field=M.angularEvaluator(cn,cm,10);
      return {key:exhibit.id,kind:'sphere',data:{kind:'sphere',field,origin:false},field,
        settings:{lesson:'harmonics',view:'sphere',family:exhibit.family,order:exhibit.n,amplitude:1,secondTerm:false,angular:true,radius:1,phase:s.museumPhase},phase:s.museumPhase*Math.PI/180};
    }
    if(exhibit.kind==='polar'){
      const x=s.museumX,c=M.coefficients(x,[exhibit.m,0]),p=pattern(c,{unpolarized:false}),components=[1,2].map(component=>pattern(c,{component}));
      const reference=M.coefficients(exhibit.x,[exhibit.m,0]),forward=M.amplitudes(reference,1),referencePeak=M.abs2(forward.s1);
      return {key:`${exhibit.id}/${x}`,kind:'pattern',...p,c,components,referencePeak,curves:root.MuseumMath.polarCurves(x,exhibit.m),phase:0,
        settings:{lesson:'mie',view:'far',x,m:[exhibit.m,0],orders:c.N,polarization:'x',radial:'lin',peak:p.peak,paperX:exhibit.x}};
    }
    const gold=root.MuseumMath.goldParameters(s.museumDiameter,s.museumWavelength);
    return {key:`gold/${gold.diameter}/${gold.wl}`,kind:'spectrum',curves:root.MuseumSpectra.gallery(),c:gold.c,gold,phase:0,
      settings:{lesson:'real',view:'spectrum',diameter:gold.diameter,radius:gold.diameter/2,wavelength:gold.wl,waterWavelength:gold.waterWavelength,nmed:gold.nmed,x:gold.x,m:gold.m,orders:1,electric:true,magnetic:false,polarization:'x',radial:'lin',volumeFraction:1e-6,scattering:gold.scattering,range:[420,650],material:'au1908',medium:'water1908'}};
  }
  root.MuseumSimulation={model,pattern};
  if(typeof module!=='undefined')module.exports={model,pattern};
})(typeof globalThis!=='undefined'?globalThis:this);

/* B&H teaching comparisons: the paper is a background; all colour curves use the lab solver. */
@@INCLUDE:src/book-museum.js@@
@@INCLUDE:src/paper-museum.js@@
@@INCLUDE:src/oldenburg-modern.js@@

@@INCLUDE:src/dotsenko-museum.js@@
@@INCLUDE:src/museum.js@@
@@INCLUDE:src/museum-presentation.js@@




(function(root){'use strict';const Mie=root.Mie,{ROT,translation,coefs,planeWave,idx,LL,luFactor,luSolve,gauss,farField}=Mie.Chain;const rot=(R,v)=>R.map(r=>r.reduce((s,a,i)=>s+a*v[i],0));
  function chain(o){
    const {cs,xs,z,L}=o,Ns=cs.length,c=cs[0],x=Math.max(...xs),d=Ns>1?z[1]-z[0]:2*x,R=ROT[o.axis||'z'];
    const tM=cs.map(c=>Array.from({length:L+1},(_,n)=>{const b=c.b[n]||[0,0];return [-b[0],-b[1]];})),tN=cs.map(c=>Array.from({length:L+1},(_,n)=>{const a=c.a[n]||[0,0];return [-a[0],-a[1]];}));
    // translations by s spacings (source at z_l = z_j + s d)
    // Opposite direction by parity: A(-d) = (-1)^{n+nu} A(d), B(-d) = -(-1)^{n+nu} B(d).
    const tr={},cache=new Map();for(let j=0;j<Ns;j++)for(let l=0;l<Ns;l++)if(l!==j){const distance=z[l]-z[j];if(!cache.has(distance))cache.set(distance,translation(L,L,distance,3));tr[j+'|'+l]=cache.get(distance);}
    // Unknowns are scaled by |h_n(x)| (the size of each outgoing wave at the sphere surface), so the coupled
    // matrix has entries of order one even where T_n is tiny and the translation coefficients are huge.
    const sc=xs.map(x=>{const {j,y}=Mie.radial(x,L,true),a=new Float64Array(L+1);for(let n=1;n<=L;n++)a[n]=Math.hypot(j[n],y[n]);return a;});
    const blocks=[];
    for(let m=0;m<=L;m++){
      const n0=Math.max(1,m),nn=L-n0+1,S=Ns*2*nn,TR=new Float64Array(S*S),TI=new Float64Array(S*S);
      const row=(j,t,n)=>j*2*nn+t*nn+(n-n0);
      for(let j=0;j<Ns;j++)for(let l=0;l<Ns;l++){
        if(l===j)continue;const T=tr[j+'|'+l].m[m];
        for(let n=n0;n<=L;n++)for(let nu=n0;nu<=L;nu++){
          const q=n*T.W+nu,A=[T.AR[q],T.AI[q]],B=[T.BR[q],T.BI[q]];
          for(let t=0;t<2;t++){
            const tt=t?tN[j][n]:tM[j][n],f=sc[j][n]/sc[l][nu];
            for(let u=0;u<2;u++){
              const h=t===u?A:B,i=row(j,t,n)*S+row(l,u,nu);
              TR[i]=f*(tt[0]*h[0]-tt[1]*h[1]);TI[i]=f*(tt[0]*h[1]+tt[1]*h[0]);
            }
          }
        }
      }
      const GR=new Float64Array(S*S),GI=new Float64Array(S*S);for(let i=0;i<S*S;i++){GR[i]=-TR[i];GI[i]=-TI[i];}for(let i=0;i<S;i++)GR[i*S+i]+=1;
      blocks.push({m,n0,nn,S,TR,TI,F:luFactor(S,GR,GI),row});
    }
    return {c,cs,x,xs,L,Ns,d,z,R,axis:o.axis||'z',tM,tN,tr,blocks,sc};
  }
  // Solve for incident plane waves (lab k-hat and polarization e) -> per sphere scattered (b) and exciting (e) coefficients.
  // orders: null for the exact solution, or K >= 0 for the multiple-scattering series truncated after K re-scatterings.
  function solve(ch,kLab,eLab,orders=null){
    const {L,Ns,z,R,blocks,tM,tN}=ch,k=rot(R,kLab),e=eLab.map(v=>Array.isArray(v)?v:[v,0]),ec=[0,1,2].map(i=>[R[i][0]*e[0][0]+R[i][1]*e[1][0]+R[i][2]*e[2][0],R[i][0]*e[0][1]+R[i][1]*e[1][1]+R[i][2]*e[2][1]]);
    const a0=planeWave(L,k,ec),inc=[],b=[];
    for(let j=0;j<Ns;j++){const ph=k[2]*z[j],cr=Math.cos(ph),ci=Math.sin(ph),q=coefs(L);for(let i=0;i<LL(L);i++){q.MR[i]=a0.MR[i]*cr-a0.MI[i]*ci;q.MI[i]=a0.MR[i]*ci+a0.MI[i]*cr;q.NR[i]=a0.NR[i]*cr-a0.NI[i]*ci;q.NI[i]=a0.NR[i]*ci+a0.NI[i]*cr;}inc.push(q);b.push(coefs(L));}
    for(const B of blocks)for(const sg of B.m?[1,-1]:[1]){
      const m=sg*B.m,{n0,nn,S,row}=B,xR=new Float64Array(S),xI=new Float64Array(S),flip=t=>sg<0&&t===1?-1:1;
      // right-hand side T a (with the -m symmetry S: N rows flip sign)
      for(let j=0;j<Ns;j++)for(let n=n0;n<=L;n++){const kk=idx(n,m),q=inc[j];
        for(let t=0;t<2;t++){const tt=t?tN[j][n]:tM[j][n],ar=t?q.NR[kk]:q.MR[kk],ai=t?q.NI[kk]:q.MI[kk],f=flip(t)*ch.sc[j][n],i=row(j,t,n);xR[i]=f*(tt[0]*ar-tt[1]*ai);xI[i]=f*(tt[0]*ai+tt[1]*ar);}}
      if(orders==null)luSolve(B.F,xR,xI);
      else{ // Neumann series b_K = T a + (T H) b_{K-1}
        const r0R=xR.slice(),r0I=xI.slice();
        for(let K=0;K<orders;K++){const yR=r0R.slice(),yI=r0I.slice();for(let i=0;i<S;i++){let r=0,im=0;for(let c=0;c<S;c++){const a=i*S+c;r+=B.TR[a]*xR[c]-B.TI[a]*xI[c];im+=B.TR[a]*xI[c]+B.TI[a]*xR[c];}yR[i]+=r;yI[i]+=im;}xR.set(yR);xI.set(yI);}
      }
      for(let j=0;j<Ns;j++)for(let n=n0;n<=L;n++){const kk=idx(n,m);for(let t=0;t<2;t++){const i=row(j,t,n),f=flip(t)/ch.sc[j][n];if(t){b[j].NR[kk]=f*xR[i];b[j].NI[kk]=f*xI[i];}else{b[j].MR[kk]=f*xR[i];b[j].MI[kk]=f*xI[i];}}}
    }
    // Cross sections (k^2 C): ext = -Re sum conj(a)·b. The exciting field of each sphere is e = b/t
    // (diagonal sphere T-matrix), so its absorption -Re conj(e)·b - |b|^2 = -|b|^2 (Re t/|t|^2 + 1).
    let ext=0,ab=0;const fM=tM.map(()=>new Float64Array(L+1)),fN=tN.map(()=>new Float64Array(L+1));
    for(let j=0;j<Ns;j++)for(let n=1;n<=L;n++){const g=(t)=>{const q=t[0]*t[0]+t[1]*t[1];return q>1e-300?t[0]/q+1:0;};fM[j][n]=g(tM[j][n]);fN[j][n]=g(tN[j][n]);}
    for(let j=0;j<Ns;j++)for(let n=1;n<=L;n++)for(let m=-n;m<=n;m++){const i=idx(n,m),q=inc[j],B=b[j];
      ext-=q.MR[i]*B.MR[i]+q.MI[i]*B.MI[i]+q.NR[i]*B.NR[i]+q.NI[i]*B.NI[i];
      ab-=(B.MR[i]**2+B.MI[i]**2)*fM[j][n]+(B.NR[i]**2+B.NI[i]**2)*fN[j][n];}
    const geo=Math.PI*ch.xs.reduce((a,x)=>a+x*x,0);
    // Exciting coefficients (for the interior field) on demand: e = b/t.
    let exC=null;const ex=()=>exC||(exC=b.map((B,j)=>{const q=coefs(L);for(let n=1;n<=L;n++){const dv=(t,r,i)=>{const d=t[0]*t[0]+t[1]*t[1];return d>1e-300?[(r*t[0]+i*t[1])/d,(i*t[0]-r*t[1])/d]:[0,0];};
      for(let m=-n;m<=n;m++){const k=idx(n,m);[q.MR[k],q.MI[k]]=dv(tM[j][n],B.MR[k],B.MI[k]);[q.NR[k],q.NI[k]]=dv(tN[j][n],B.NR[k],B.NI[k]);}}return q;}));
    return {ch,k,inc,b,get ex(){return ex();},Cext:ext,Cabs:ab,Csca:ext-ab,Qext:ext/geo,Qabs:ab/geo,Qsca:(ext-ab)/geo};
  }

function orientationAverage(ch,ng){ng=ng||Math.max(6,Math.min(40,Math.ceil((ch.z.at(-1)-ch.z[0]+2*ch.x)/2)+6));const {t,w}=gauss(ng),save=ch.R;let ext=0,ab=0;ch.R=ROT.z;try{for(let i=0;i<ng;i++){const cb=t[i],sb=Math.sqrt(1-cb*cb);for(const e of [[cb,0,-sb],[0,1,0]]){const s=solve(ch,[sb,0,cb],e);ext+=w[i]*s.Cext/4;ab+=w[i]*s.Cabs/4;}}}finally{ch.R=save;}return {Cext:ext,Cabs:ab,Csca:ext-ab};}root.Mie.PolyChain={chain,solve,farField,orientationAverage};})(globalThis);
@@INCLUDE:src/population.js@@
globalThis.MiePopulationWorkerSource=@@WORKER:src/workers/population.js@@;
@@INCLUDE:src/guides.js@@
@@INCLUDE:src/app.js@@