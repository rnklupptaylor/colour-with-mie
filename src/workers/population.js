@@INCLUDE:src/kernel/physics.js@@
@@INCLUDE:src/kernel/interior.js@@
@@INCLUDE:src/materials.js@@
@@INCLUDE:src/modern-optics.js@@
@@INCLUDE:src/alloys.js@@
@@INCLUDE:src/surface.js@@

@@INCLUDE:src/kernel/tmatrix.js@@
/* Historical spectra use the unmodified laboratory solvers. Absolute power is
   per sphere. Oldenburg's arbitrary-unit curves have explicit amplitude registration. */
(function(root){
  'use strict';
  const M=root.Mie,Mat=root.Materials,table=[[0.1879,1.28,1.188],[0.1916,1.32,1.203],[0.1953,1.34,1.226],[0.1993,1.33,1.251],[0.2033,1.33,1.277],[0.2073,1.3,1.304],[0.2119,1.3,1.35],[0.2164,1.3,1.387],[0.2214,1.3,1.427],[0.2262,1.31,1.46],[0.2313,1.3,1.497],[0.2371,1.32,1.536],[0.2426,1.32,1.577],[0.249,1.33,1.631],[0.2551,1.33,1.688],[0.2616,1.35,1.749],[0.2689,1.38,1.803],[0.2761,1.43,1.847],[0.2844,1.47,1.869],[0.2924,1.49,1.878],[0.3009,1.53,1.889],[0.3107,1.53,1.893],[0.3204,1.54,1.898],[0.3315,1.48,1.883],[0.3425,1.48,1.871],[0.3542,1.5,1.866],[0.3679,1.48,1.895],[0.3815,1.46,1.933],[0.3974,1.47,1.952],[0.4133,1.46,1.958],[0.4305,1.45,1.948],[0.4509,1.38,1.914],[0.4714,1.31,1.849],[0.4959,1.04,1.833],[0.5209,0.62,2.081],[0.5486,0.43,2.455],[0.5821,0.29,2.863],[0.6168,0.21,3.272],[0.6595,0.14,3.697],[0.7045,0.13,4.103],[0.756,0.14,4.542],[0.8211,0.16,5.083],[0.892,0.17,5.663],[0.984,0.22,6.35],[1.088,0.27,7.15],[1.216,0.35,8.145],[1.393,0.43,9.519],[1.61,0.56,11.21],[1.937,0.92,13.78]],stored=/* STUDY_SPECTRA */ {},fits=/* OLDENBURG_FITS */ {},populations=/* POPULATION_FITS */ {};
  function spline(x,y){
    const n=x.length,a=new Float64Array(n),b=new Float64Array(n),z=new Float64Array(n);
    for(let i=1;i<n-1;i++){const h=x[i]-x[i-1],k=x[i+1]-x[i],p=h/(h+k),q=p*z[i-1]+2;z[i]=(p-1)/q;b[i]=(6*((y[i+1]-y[i])/k-(y[i]-y[i-1])/h)/(h+k)-p*b[i-1])/q;}
    for(let i=n-2;i>=0;i--)a[i]=z[i]*a[i+1]+b[i];
    return v=>{v=Math.max(x[0],Math.min(x[n-1],v));let i=1;while(x[i]<v)i++;const h=x[i]-x[i-1],u=(x[i]-v)/h,w=1-u;return u*y[i-1]+w*y[i]+((u*u*u-u)*a[i-1]+(w*w*w-w)*a[i])*h*h/6;};
  }
  const er=spline(table.map(r=>r[0]),table.map(r=>r[1]*r[1]-r[2]*r[2])),ei=spline(table.map(r=>r[0]),table.map(r=>2*r[1]*r[2]));
  Mat.DB.auJC1972={name:'Gold (Johnson & Christy 1972)',group:'Historical data',doi:'10.1103/PhysRevB.6.4370',src:'P. B. Johnson & R. W. Christy, Phys. Rev. B 6, 4370 (1972); original n,k rows; natural cubic spline of complex permittivity vs wavelength',range:[table[0][0],table.at(-1)[0]],fn:um=>{const re=er(um),im=Math.max(0,ei(um)),a=Math.hypot(re,im);return [Math.sqrt((a+re)/2),Math.sqrt((a-re)/2)];}};
  function oldenburgGold(wl,length){
    const bulk=Mat.nk('auJC1972',wl),w=2*Math.PI*299792458/(wl*1e-9),wp=1.298e16,gammaBulk=3.83e13,gamma=gammaBulk+1.4e6/(Math.max(.01,length)*1e-9),epsilon=M.sub(M.add(M.mul([bulk.n,bulk.k],[bulk.n,bulk.k]),M.div([wp*wp,0],[w*w,w*gammaBulk])),M.div([wp*wp,0],[w*w,w*gamma])),a=Math.hypot(...epsilon);
    return {n:Math.sqrt((a+epsilon[0])/2),k:Math.sqrt((a-epsilon[0])/2),inRange:bulk.inRange,epsilon,gamma,gammaBulk,wp,A:1,length};
  }
  // Geometry-dependent material: physAt passes the current shell thickness
  // (sphere radius for a homogeneous sphere). Generic range lookups use bulk.
  Mat.DB.auOldenburg={name:'Gold (Oldenburg thin-shell model)',group:'Historical data',doi:'',src:'S. J. Oldenburg, Light Scattering from Gold Nanoshells (1999), pp. 15–19, Eqs. 2.21–2.22: Johnson–Christy gold plus surface-scattering correction, A=1, vF=1.4e6 m/s, plasma frequency 1.298e16 rad/s, bulk collision frequency 3.83e13 s−1. Current shell thickness supplies the scattering length.',range:Mat.DB.auJC1972.range,fn:Mat.DB.auJC1972.fn};
  const extra=e=>['rayleigh','transmission','shell','dimer'].includes(e.kind),cache=new Map();
  function shell(core,thickness,wl,thesis=false){
    const radius=core+thickness,x=2*Math.PI*1.33*radius/wl,g=thesis?oldenburgGold(wl,thickness):Mat.nk('auJC1972',wl),c=M.coreShell(x*core/radius,x,[1.45/1.33,0],[g.n/1.33,g.k/1.33]);
    return {wl,x,c,radius,core,thickness,ncore:1.45,nmed:1.33,nGold:g.n,kGold:g.k,surfaceGamma:thesis?g.gamma:null,Cext:c.Qext*Math.PI*radius*radius,Qext:c.Qext};
  }
  function dimer(gap,polarization,wl){
    const radius=25,x=2*Math.PI*1.33*radius/wl,g=Mat.nk('auJC1972',wl),d=x*(2+gap/radius),L=M.Chain.orderFor(x,d,2),c=M.withInterior(M.coefficients(x,[g.n/1.33,g.k/1.33],L)),ch=M.Chain.chain({c,x,L,Ns:2,d,axis:'x'}),sol=M.Chain.solve(ch,[0,0,1],polarization==='x'?[1,0,0]:[0,1,0]);
    return {wl,x,L,gap,polarization,Qabs:sol.Qabs,power:Math.PI*radius*radius*.001*sol.Qabs}; // 1 mW/µm²; result µW per sphere
  }
  const ray=wl=>M.rayleigh(2*Math.PI*10/wl,[1.5,0]).Qsca;
  const seq=(lo,hi,step,fn)=>Array.from({length:Math.round((hi-lo)/step)+1},(_,i)=>{const wl=lo+i*step;return [wl,fn(wl)];});
  const colors=['#176ecb','#c45a1a','#008b76','#8a4db1','#899021','#c13469'];
  const fitFor=(e,value)=>fits[e.id]?.[value];
  const populationFor=(e,value)=>populations[e.id]?.[value];
  function populationAt(p,wl,exact=false){
    let ext=0,sca=0;
    if(exact){for(const [r,wr] of p.nodes.core)for(const [t,wt] of p.nodes.shell){const sample=shell(r,t,wl,true);ext+=wr*wt*sample.Cext;sca+=wr*wt*sample.c.Qsca*Math.PI*sample.radius**2;}}
    else{const points=p.points,i=Math.min(points.length-2,Math.max(0,Math.floor((wl-points[0][0])/2))),a=points[i],b=points[i+1],u=(wl-a[0])/(b[0]-a[0]);ext=a[1]+u*(b[1]-a[1]);sca=a[2]+u*(b[2]-a[2]);}
    const core=p.core.mean,thickness=p.shell.mean,radius=core+thickness;
    return {wl,core,thickness,radius,x:2*Math.PI*1.33*radius/wl,ncore:1.45,nmed:1.33,Cext:ext,Csca:sca,Cabs:ext-sca,population:true,coreSD:p.core.sd,shellSD:p.shell.sd,gaussianParametersNm:{coreRadiusLocation:p.parameters[0],coreRadiusSD:p.parameters[2],shellThicknessLocation:p.parameters[1],shellThicknessSD:p.parameters[3],minimumShell:.05},distribution:'independent positive-truncated Gaussian number distributions',quadratureOrder:p.quadratureOrder};
  }
  function gallery(e,thesis=true,useFits=false,usePopulation=false){
    const key=e.id+'/'+thesis+'/'+useFits+'/'+usePopulation;if(cache.has(key))return cache.get(key);
    let curves;
    if(e.kind==='rayleigh')curves=[{value:1,color:colors[0],label:'App · Rayleigh scattering',points:seq(355,760,1,wl=>ray(wl)/ray(656.3))}];
    if(e.kind==='transmission')curves=[1,2,4,8,16,32].map((value,i)=>({value,color:colors[i],label:`L = ${value}`,points:seq(340,760,1,wl=>Math.exp(-value/16*ray(wl)/ray(760)))}));
    if(e.kind==='shell')curves=e.cases.map((value,i)=>{const original=useFits&&fitFor(e,value),population=original&&usePopulation&&populationFor(e,value),fit=population?{...original,core:population.core.mean,shell:population.shell.mean,amp:population.amplitude,rms:population.rms,fitPeak:population.peak,population}:original,core=fit?fit.core:e.core,thickness=fit?fit.shell:value;return {value,core,thickness,fit:fit||null,color:colors[i],label:fit?`TEM ${fit.TEM} → ${population?'mean':'fit'} ${thickness.toFixed(1)} nm`:`${value} nm shell`,points:population?population.points.map(([wl,ext])=>[wl,ext]):seq(e.calibration.w0,e.calibration.w1,2,wl=>shell(core,thickness,wl,fit||thesis).Cext)};});
    if(e.kind==='dimer')curves=e.cases.map((value,i)=>({value,color:colors[i],label:`${value} nm gap`,points:stored[e.id][String(value)]}));
    cache.set(key,curves);return curves;
  }
  function model(e,s){
    const useFit=!!(s.museumFit&&fits[e.id]),usePopulation=!!(useFit&&s.museumPopulation&&populations[e.id]),curves=gallery(e,s.museumDamping,useFit,usePopulation),selected=e.cases?.includes(s.museumCase)?s.museumCase:e.cases?.[0]||1,wl=s.museumWavelength;
    let lines,match,lesson,target,details={};
    if(e.kind==='rayleigh'||e.kind==='transmission'){
      const path=s.museumPath,x=2*Math.PI*10/wl;
      details={radius:10,n:1.5,nmed:1,x,wl,path,tau760:path/16,Qsca:ray(wl)};
      lines=['Illustrative sphere: a 10 nm · n 1.5 + 0i · medium n 1',`λ₀ ${wl} nm · x ${x.toPrecision(5)} · Rayleigh limit`,e.kind==='rayleigh'?'Csca / Csca(656.3 nm) · size-independent λ⁻⁴':`L ${path.toFixed(2)} · τ(760 nm) = L / 16 · T = exp(−τ)`];
      match=e.kind==='rayleigh'?'Relative ordinate; the paper specifies no microscopic particle size.':'Relative thicknesses 1, 2, 4, 8, 16, 32; bold curve follows L.';
      lesson='02 Rayleigh';target='rayleigh';
    }else if(e.kind==='shell'){
      const fit=useFit&&curves.find(c=>c.value===selected).fit,core=fit?fit.core:e.core,t=fit?fit.shell:selected,thesis=useFit||s.museumDamping,population=fit?.population;
      details=population?populationAt(population,wl):shell(core,t,wl,thesis);Object.assign(details,{damping:thesis,fitted:useFit,captionCore:e.core,captionShell:selected,TEM:fit?.TEM,rms:fit?.rms,targetSource:fit?.targetSource,targetCount:fit?.targets?.length,experimentalPeak:fit?.experimentalPeak,fitPeak:fit?.fitPeak});
      lines=population?[`Core d ${(2*core).toFixed(1)} ± ${(2*population.core.sd).toFixed(1)} nm SD`,`Shell ${t.toFixed(1)} ± ${population.shell.sd<.1?'<0.1':population.shell.sd.toFixed(1)} nm SD · TEM ${fit.TEM} nm`,`Gaussian · ncore 1.45 · nwater 1.33`,`JC1972+A1 · mean Cext ${details.Cext.toPrecision(5)} nm²`]:fit?[`Fit: core r ${core.toFixed(2)} · shell ${t.toFixed(2)} nm`,`Paper r ${e.core} / t ${selected} · TEM shell ${fit.TEM} ± ${e.core===60?4:12} nm`,`ncore 1.45 · nwater 1.33 · JC1972 + A=1`,`x ${details.x.toPrecision(5)} · Cext ${details.Cext.toPrecision(5)} nm²`]:[`SiO₂ core d ${e.core*2} nm · Au shell ${selected} nm`,`ncore 1.45 · nwater 1.33 · JC1972${thesis?' + thin-shell A = 1':' bulk (A = 0)'}`,`λ₀ ${wl} nm · x ${details.x.toPrecision(5)} · Cext ${details.Cext.toPrecision(5)} nm²`];
      match=fit?(fit.experimentalPeak?`RMS ${(100*fit.rms).toFixed(1)}% · experimental peak ≈${Math.round(fit.experimentalPeak)} nm · app ${fit.fitPeak} nm`:`Optical fit · ${(100*fit.rms).toFixed(1)}% RMS · model-dependent sizes.`):e.id==='oldenburg-1a'?'Stated sizes, no fit · one shared ordinate scale for all four spectra. Thesis Au reproduces the scanned curves to about 1.6% RMS.':'Caption sizes · each curve amplitude-registered. Fit experiment tests different core and shell dimensions.';
      lesson='05 Real Particles';target='real';
    }else{
      // Cached spectra were calculated with this same dimer() function at build
      // time, avoiding long coupled-sphere sweeps when a phone opens the exhibit.
      const points=curves.find(c=>c.value===selected).points,i=Math.min(points.length-2,Math.max(0,Math.floor((wl-400)/2))),a=points[i],b=points[i+1],power=a[1]+(b[1]-a[1])*(wl-a[0])/(b[0]-a[0]);
      details={radius:25,nmed:1.33,gap:selected,wl,polarization:e.polarization,power};
      lines=[`2 Au spheres · d 50 nm · gap ${selected} nm · axis x`,`E ∥ ${e.polarization} (${e.polarization==='x'?'parallel':'perpendicular'}) · k ∥ z · nwater 1.33`,`Johnson–Christy 1972 · I₀ 1 mW/µm²`,`λ₀ ${wl} nm · P ${power.toPrecision(5)} µW per sphere`];
      match='Absolute absorption power · same coupled-sphere solver as lesson 08.';lesson='08 Sphere chains';target='chain';
    }
    const {c,...settingsDetails}=details;
    return {key:`${e.id}/${selected}/${wl}/${s.museumPath}/${s.museumDamping}/${!!s.museumFit}/${!!s.museumPopulation}`,kind:'spectrum',curves,selected,useFit,usePopulation,lines,match,lesson,target,details,settings:{lesson:target,...settingsDetails,material:e.kind==='shell'&&(s.museumDamping||useFit)?'auOldenburg':e.kind==='shell'||e.kind==='dimer'?'auJC1972':'custom',normalization:e.kind==='shell'?(useFit?'one fitted positive multiplier per spectrum; no offset or wavelength shift':e.id==='oldenburg-1a'?'one shared ordinate multiplier for all four spectra':'each curve scaled to the paper maximum in the plotted window'):e.kind==='rayleigh'?'relative to 656.3 nm':'absolute transmission or power'}};
  }
  function stateFor(e,s){
    const common={units:'spec',wl:s.museumWavelength,wlMin:e.calibration.w0,wlMax:e.calibration.w1,auto:true,sE:true,sM:true,solo:0,mpoles:false,view:'far',graph:'spectrum',pol:'x',radial:'lin',swatch:false,report:'q'};
    if(e.kind==='shell'){const fit=s.museumFit&&fitFor(e,s.museumCase),population=fit&&s.museumPopulation&&populationFor(e,s.museumCase);return {...common,struct:'cs',core:population?population.core.mean:fit?fit.core:e.core,shell:population?population.shell.mean:fit?fit.shell:s.museumCase,mat:fit||s.museumDamping?'auOldenburg':'auJC1972',matCore:'custom',ccn:1.45,cck:0,med:'custom',cmed:1.33,report:'c'};}
    if(e.kind==='dimer')return {...common,struct:'homog',mat:'auJC1972',rad:25,med:'custom',cmed:1.33,ns:2,axis:'x',pol:e.polarization,gapNm:s.museumCase,avg:false,msAll:true};
    return {...common,struct:'homog',mat:'custom',cn:1.5,ck:0,med:'custom',cmed:1,rad:10,pol:'unpol',report:'c'};
  }
  function draw(c,e,s,m,layout,alpha){
    const {left,top,fit}=layout,cal=e.calibration;
    const map=(wl,y,scale=cal.sy)=>{const u=(wl-cal.w0)/(cal.w1-cal.w0);return [left+(cal.x0+(cal.x1-cal.x0)*u)*fit,top+(cal.y0+(cal.tilt||0)*u-y*scale)*fit,wl];};
    const curves=e.kind==='transmission'?[...m.curves,{value:s.museumPath,color:'#143f73',label:'Selected path',live:true,points:seq(340,760,1,wl=>Math.exp(-s.museumPath/16*ray(wl)/ray(760)))}]:m.curves;
    const clip={left:left+cal.x0*fit,right:left+cal.x1*fit,top:top+(cal.ymin||0)*fit,bottom:top+(cal.y0+3)*fit},paths=[];
    c.save();c.beginPath();c.rect(clip.left,clip.top,clip.right-clip.left,clip.bottom-clip.top);c.clip();c.globalAlpha=alpha;
    for(const curve of curves){
      const scale=e.kind==='shell'?(curve.fit?curve.fit.amp:cal.heights?cal.heights[curve.value]/Math.max(...curve.points.map(p=>p[1])):cal.sy):cal.sy;
      const points=curve.points.map(([x,y])=>map(x,y,scale));paths.push({...curve,points,clip});c.strokeStyle=curve.color;c.lineWidth=curve.live||curve.value===m.selected?3.5:2.5;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.stroke();
    }
    if(m.useFit&&s.museumTargets!==false){
      const curve=curves.find(curve=>curve.value===m.selected),targets=curve?.fit?.targets||[],radius=Math.max(2.2,Math.min(4,2.3*fit));
      c.strokeStyle=curve?.color||'#176ecb';c.fillStyle='#fff';c.lineWidth=1.8;
      // Targets are measured in source-image ordinate pixels. They use scale 1,
      // never the fitted Cext multiplier or values from the calculated curve.
      for(const [wl,height] of targets){const [x,y]=map(wl,height,1);c.beginPath();c.arc(x,y,radius,0,2*Math.PI);c.fill();c.stroke();}
    }
    if(e.kind!=='transmission'){const x=map(s.museumWavelength,0)[0];c.lineWidth=1;c.setLineDash([4,4]);c.strokeStyle='#50657b';c.beginPath();c.moveTo(x,clip.top);c.lineTo(x,clip.bottom);c.stroke();}
    c.restore();return paths;
  }
  root.MuseumStudies={extra,gallery,model,stateFor,draw,shell,dimer,ray,spline,oldenburgGold,fitFor,populationFor,populationAt};
  if(typeof module!=='undefined')module.exports=root.MuseumStudies;
})(typeof globalThis!=='undefined'?globalThis:this);

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
// This source is embedded with the offline numerical modules in a Blob worker.
self.onmessage=async function(event){
  const {type,config:s,wavelengths}=event.data,P=MiePopulation;
  try{
    if(type==='current'){
      if(s.popQuality!=='quick'&&(s.popSize>0||s.struct==='cs'&&s.popShell>0))postMessage({preview:true,data:P.calculate({...s,popQuality:'quick'},s.wl,'current')});
      postMessage({done:true,data:P.calculate(s,s.wl,'current')});
    }else{
      const pop=P.samples(s),rows=[],order=[];let stride=1;while(stride<wavelengths.length)stride*=2;
      // Fill the whole wavelength range early, then refine between those points.
      const seen=new Set();for(;stride>=1;stride/=2)for(let i=0;i<wavelengths.length;i+=stride)if(!seen.has(i)){seen.add(i);order.push(i);}if(!seen.has(wavelengths.length-1))order.splice(1,0,wavelengths.length-1);
      let last=0;for(const i of order){rows.push(P.calculate(s,wavelengths[i],type==='colour'?'colour':'cross',pop));if(performance.now()-last>180){postMessage({rows:rows.slice().sort((a,b)=>a.wl-b.wl),progress:rows.length/wavelengths.length});last=performance.now();}}
      postMessage({done:true,rows:rows.sort((a,b)=>a.wl-b.wl)});
    }
  }catch(error){postMessage({error:error.message||String(error)});}
};
