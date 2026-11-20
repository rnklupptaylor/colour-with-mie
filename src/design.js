/* Inverse design of colloid colour (lesson 08), following Bleyer et al., J. Colloid Interface Sci. 691, 137408 (2025).
   Forward model: Mie extinction spectrum per unit particle volume fraction, Beer-Lambert transmission through a
   1 cm cuvette, CIE 2006 10-degree observer and D65 (colour.js), colour difference CIEDE2000 or CIE 1976.
   For every candidate structure the concentration is optimized; the families are searched on grids and the best
   minima refined (Nelder-Mead). Depends on Mie (physics.js, interior.js), Materials and MieColour. */
(function(root){
  'use strict';
  const M=root.Mie,Mat=root.Materials,C=root.MieColour,WL=C.WL,L_CM=1;
  const PHI=[-8,-3];                                     // log10 of the volume-fraction range searched
  // Families: kind 'sphere' (diameter d) or 'cs' (core diameter c, shell thickness t). Sizes in nm.
  const FAMILIES=[
    {id:'au',label:'Au sphere',kind:'sphere',mat:'au',p:[[5,300]],note:'red → purple → blue'},
    {id:'ag',label:'Ag sphere',kind:'sphere',mat:'ag',p:[[5,200]],note:'yellow → orange'},
    {id:'cu',label:'Cu sphere',kind:'sphere',mat:'cu',p:[[5,200]],note:'oxidizes in air and water'},
    {id:'si',label:'Si sphere',kind:'sphere',mat:'si',p:[[60,250]],note:'dielectric Mie resonances'},
    {id:'mg',label:'Mg sphere',kind:'sphere',mat:'mg',p:[[5,300]],note:'Palm 2018 · ideal metallic Mg; oxide layers not included'},
    {id:'li',label:'Li sphere',kind:'sphere',mat:'li',p:[[5,300]],note:'Rasigni 1977 · ideal metallic Li; chemical stability not modelled'},
    {id:'pt',label:'Pt sphere',kind:'sphere',mat:'pt',p:[[5,300]],note:'Tselin 2024 · lossy platinum'},
    {id:'pd',label:'Pd sphere',kind:'sphere',mat:'pd',p:[[5,300]],note:'Palm 2018 · metallic Pd; hydrogen loading not modelled'},
    {id:'sio2au',label:'SiO₂@Au shell',kind:'cs',core:'sio2',shell:'au',p:[[40,500],[4,70]],note:'paper system'},
    {id:'sio2ag',label:'SiO₂@Ag shell',kind:'cs',core:'sio2',shell:'ag',p:[[40,500],[4,70]]},
    {id:'auag',label:'Au@Ag',kind:'cs',core:'au',shell:'ag',p:[[10,80],[1,40]]},
    {id:'agau',label:'Ag@Au',kind:'cs',core:'ag',shell:'au',p:[[10,80],[1,20]]}];
  const fam=id=>FAMILIES.find(f=>f.id===id);
  let surface={surfaceOn:false,surfaceA:1};
  const setSurface=options=>{surface={surfaceOn:!!options.surfaceOn,surfaceA:options.surfaceA??1};};
  const nk=(id,l,r,core=0)=>{const g=root.MieSurface.nk(id,l,r,core,surface);return [g.n,g.k];};
  const medN=(med,l)=>typeof med==='number'?med:Mat.medium(med,l).n;
  // Extinction and scattering coefficients per unit volume fraction (1/cm), and the outer diameter.
  // mu = N C = phi Q pi a^2 / (4/3 pi a^3) = 0.75 phi Q / a.
  function spectrum(f,p,med='water'){
    const out={ext:new Float64Array(WL.length),sca:new Float64Array(WL.length)},aNm=f.kind==='sphere'?p[0]/2:p[0]/2+p[1],a=aNm*1e-7;
    WL.forEach((l,i)=>{const n=medN(med,l),k=2*Math.PI*n/l;let c;
      if(f.kind==='sphere'){const m=nk(f.mat,l,aNm);c=M.coefficients(k*aNm,[m[0]/n,m[1]/n]);}
      else{const mc=nk(f.core,l,f.core===f.shell?aNm:p[0]/2),ms=nk(f.shell,l,aNm,f.core===f.shell?0:p[0]/2);c=M.coreShell(k*p[0]/2,k*aNm,[mc[0]/n,mc[1]/n],[ms[0]/n,ms[1]/n]);}
      out.ext[i]=0.75*c.Qext/a;out.sca[i]=0.75*c.Qsca/a;});
    out.d=2*aNm;return out;
  }
  // Mie coefficients per wavelength (for the multiple-scattering check of finalists)
  function coefs(f,p,med='water'){
    const aNm=f.kind==='sphere'?p[0]/2:p[0]/2+p[1];
    return WL.map(l=>{const n=medN(med,l),k=2*Math.PI*n/l;if(f.kind==='sphere'){const m=nk(f.mat,l,aNm);return M.coefficients(k*aNm,[m[0]/n,m[1]/n]);}
      const mc=nk(f.core,l,f.core===f.shell?aNm:p[0]/2),ms=nk(f.shell,l,aNm,f.core===f.shell?0:p[0]/2);return M.coreShell(k*p[0]/2,k*aNm,[mc[0]/n,mc[1]/n],[ms[0]/n,ms[1]/n]);});
  }
  const transmitted=(ext,phi)=>Array.from(ext,v=>Math.exp(-phi*v*L_CM));
  // Fast L*a*b* of the transmitted light (no intermediate arrays): this is the inner loop of the search.
  const [WX,WY,WZ]=C.W,fl=t=>t>216/24389?Math.cbrt(t):t*24389/3132+4/29;
  function labAt(ext,phi){let X=0,Y=0,Z=0;for(let i=0;i<ext.length;i++){const t=Math.exp(-phi*ext[i]*L_CM);X+=WX[i]*t;Y+=WY[i]*t;Z+=WZ[i]*t;}
    const fx=fl(X/C.WHITE[0]),fy=fl(Y),fz=fl(Z/C.WHITE[2]);return [116*fy-16,500*(fx-fy),200*(fy-fz)];}
  const dEf=metric=>metric==='76'?C.dE76:C.dE2000;
  // Best concentration for one spectrum: scan log phi, then golden-section refinement around the best point.
  function bestConc(ext,target,metric='2000'){
    const dE=dEf(metric),K=16,f=u=>dE(labAt(ext,10**u),target);
    let bi=0,bv=Infinity;const us=Array.from({length:K},(_,i)=>PHI[0]+(PHI[1]-PHI[0])*i/(K-1));
    us.forEach((u,i)=>{const v=f(u);if(v<bv){bv=v;bi=i;}});
    let lo=us[Math.max(0,bi-1)],hi=us[Math.min(K-1,bi+1)];const g=(Math.sqrt(5)-1)/2;
    let x1=hi-g*(hi-lo),x2=lo+g*(hi-lo),f1=f(x1),f2=f(x2);
    for(let it=0;it<14;it++){if(f1<f2){hi=x2;x2=x1;f2=f1;x1=hi-g*(hi-lo);f1=f(x1);}else{lo=x1;x1=x2;f1=f2;x2=lo+g*(hi-lo);f2=f(x2);}}
    const u=f1<f2?x1:x2,v=Math.min(f1,f2);
    return v<bv?{phi:10**u,dE:v}:{phi:10**us[bi],dE:bv};
  }
  // Grid of a family (spheres: 64 diameters; core-shell: 40 x 40), log-spaced for the first size parameter.
  function grid(f){
    const lg=([a,b],n)=>Array.from({length:n},(_,i)=>a*(b/a)**(i/(n-1))),li=([a,b],n)=>Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
    return f.kind==='sphere'?{a:lg(f.p[0],64)}:{a:lg(f.p[0],40),b:li(f.p[1],40)};
  }
  // Practicality penalty (in colour-difference units; small, only breaks near-ties). Shown in the result.
  function penalty(f,p,phi){
    const notes=[];let pen=0;
    if(f.kind==='cs'){pen+=1;notes.push('core–shell: extra synthesis step');}
    if(f.kind==='cs'&&p[1]<5){pen+=1;notes.push('shell thinner than 5 nm');}
    if(f.id==='cu'){pen+=0.8;notes.push('copper oxidizes');}
    const d=f.kind==='sphere'?p[0]:p[0]+2*p[1];if(d>250){pen+=0.5;notes.push('large particles settle');}
    const u=Math.log10(phi);if(u<PHI[0]+0.3||u>PHI[1]-0.3){pen+=0.5;notes.push('concentration at the edge of the range');}
    return {pen,notes};
  }
  // Size spread: spectrum averaged over a Gaussian of relative width sd in all size parameters (5 points).
  function spreadSpectrum(f,p,med,sd=0.1){
    const w=[-2,-1,0,1,2].map(z=>({z,w:Math.exp(-z*z/2)})),W=w.reduce((s,x)=>s+x.w,0),ext=new Float64Array(WL.length),sca=new Float64Array(WL.length);
    for(const {z,w:wt} of w){const q=p.map(v=>v*(1+sd*z/2)),s=spectrum(f,q,med),aRatio=1;for(let i=0;i<WL.length;i++){ext[i]+=wt*s.ext[i]*aRatio/W;sca[i]+=wt*s.sca[i]/W;}}
    return {ext,sca};
  }
  // Nelder-Mead in (normalized sizes, log phi) inside the family box.
  function refine(f,p0,phi0,target,{med='water',metric='2000',iters=80}={}){
    const dim=f.p.length,box=f.p.map(r=>[Math.log(r[0]),Math.log(r[1])]),toP=x=>x.slice(0,dim).map((v,i)=>Math.exp(Math.min(box[i][1],Math.max(box[i][0],v))));
    const dE=dEf(metric),cost=x=>{const p=toP(x),u=Math.min(PHI[1],Math.max(PHI[0],x[dim])),s=spectrum(f,p,med);return dE(labAt(s.ext,10**u),target)+penalty(f,p,10**u).pen;};
    const x0=[...p0.map(Math.log),Math.log10(phi0)],n=x0.length;let S=[x0];
    for(let i=0;i<n;i++){const x=x0.slice();x[i]+=i<dim?0.08:0.15;S.push(x);}
    let F=S.map(cost);
    for(let it=0;it<iters;it++){
      const o=F.map((v,i)=>[v,i]).sort((a,b)=>a[0]-b[0]).map(v=>v[1]);S=o.map(i=>S[i]);F=o.map(i=>F[i]);
      const c=Array.from({length:n},(_,k)=>S.slice(0,n).reduce((s,x)=>s+x[k],0)/n),pt=(t)=>c.map((v,k)=>v+t*(S[n][k]-v));
      const xr=pt(-1),fr=cost(xr);
      if(fr<F[0]){const xe=pt(-2),fe=cost(xe);if(fe<fr){S[n]=xe;F[n]=fe;}else{S[n]=xr;F[n]=fr;}}
      else if(fr<F[n-1]){S[n]=xr;F[n]=fr;}
      else{const xc=pt(0.5),fc=cost(xc);if(fc<F[n]){S[n]=xc;F[n]=fc;}else{for(let i=1;i<=n;i++){S[i]=S[i].map((v,k)=>S[0][k]+0.5*(v-S[0][k]));F[i]=cost(S[i]);}}}
      if(Math.abs(F[n]-F[0])<1e-4)break;
    }
    const b=F.indexOf(Math.min(...F)),p=toP(S[b]),phi=10**Math.min(PHI[1],Math.max(PHI[0],S[b][dim])),s=spectrum(f,p,med),lab=labAt(s.ext,phi);
    return {p,phi,lab,dE:dE(lab,target),score:F[b]};
  }
  // Incremental search. new Search(opts) then call step(budgetMs) until done; results in .families, .best.
  class Search{
    constructor({families=FAMILIES.map(f=>f.id),med='water',cache=new Map()}={}){
      this.med=med;this.cache=cache;this.fams=families.map(fam);this.queue=[];
      for(const f of this.fams){const g=grid(f);if(f.kind==='sphere')g.a.forEach((a,i)=>this.queue.push([f,[a],[i]]));else g.a.forEach((a,i)=>g.b.forEach((b,j)=>this.queue.push([f,[a,b],[i,j]])));}
      this.total=this.queue.length;this.pos=0;
    }
    get done(){return this.pos>=this.total;}
    get progress(){return this.total?this.pos/this.total:1;}
    // compute the spectra (cached across targets)
    step(budget=20){const t0=Date.now();while(this.pos<this.total&&Date.now()-t0<budget){const [f,p]=this.queue[this.pos++],k=`${f.id}|${this.med}|${p.join(',')}`;if(!this.cache.has(k))this.cache.set(k,spectrum(f,p,this.med));}return this.done;}
    // evaluate a target on everything computed so far: per family the colour map and minima
    evaluate(target,metric='2000'){
      const res={families:[],target,metric};
      for(const f of this.fams){
        const g=grid(f),n1=g.a.length,n2=g.b?g.b.length:1,map=new Float64Array(n1*n2).fill(NaN),phi=new Float64Array(n1*n2).fill(NaN);let best=null;
        for(let i=0;i<n1;i++)for(let j=0;j<n2;j++){const p=g.b?[g.a[i],g.b[j]]:[g.a[i]],s=this.cache.get(`${f.id}|${this.med}|${p.join(',')}`);if(!s)continue;
          const r=bestConc(s.ext,target,metric),pen=penalty(f,p,r.phi).pen,k=i*n2+j;map[k]=r.dE;phi[k]=r.phi;if(!best||r.dE+pen<best.score)best={p,phi:r.phi,dE:r.dE,score:r.dE+pen,idx:[i,j]};}
        res.families.push({f,grid:g,map,phi,best});
      }
      return res;
    }
  }
  // Finalists: refine the best design of each family, re-score, add robustness; sorted by score.
  function finalize(res,{med='water',metric='2000',top=4}={}){
    const fams=res.families.filter(r=>r.best).sort((a,b)=>a.best.score-b.best.score).slice(0,top);
    const out=fams.map(r=>{const x=refine(r.f,r.best.p,r.best.phi,res.target,{med,metric}),pn=penalty(r.f,x.p,x.phi),sp=spreadSpectrum(r.f,x.p,med,0.1),labS=labAt(sp.ext,x.phi);
      return {family:r.f,p:x.p,phi:x.phi,lab:x.lab,dE:x.dE,dE76:C.dE76(x.lab,res.target),dE00:C.dE2000(x.lab,res.target),score:x.dE+pn.pen,notes:pn.notes,robust:dEf(metric)(labS,res.target),spectrum:spectrum(r.f,x.p,med)};});
    return out.sort((a,b)=>a.score-b.score);
  }
  // Volume fraction -> number concentration (per mL) and metal mass concentration (µg/mL)
  const DENS={au:19.3,ag:10.49,cu:8.96,si:2.33,sio2:2.2,mg:1.74,li:.534,pt:21.45,pd:12.02};
  function concentration(f,p,phi){
    const d=f.kind==='sphere'?p[0]:p[0]+2*p[1],V=Math.PI*d**3/6*1e-21,N=phi/V;
    const metal=f.kind==='sphere'?{m:f.mat,v:V}:{m:f.shell,v:V-Math.PI*p[0]**3/6*1e-21};
    return {perML:N,ugPerML:N*metal.v*(DENS[metal.m]||1)*1e6,metal:metal.m};
  }
  root.MieDesign={setSurface,FAMILIES,fam,spectrum,coefs,transmitted,labAt,bestConc,grid,penalty,refine,Search,finalize,spreadSpectrum,concentration,PHI};
  if(typeof module!=='undefined')module.exports=root.MieDesign;
})(typeof globalThis!=='undefined'?globalThis:this);
