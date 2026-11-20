/* Number distributions. Members of a chain scatter coherently; different
   particles/chains are an incoherent mixture of absolute cross sections. */
(function(root){
  'use strict';
  const M=root.Mie,Mat=root.Materials,TAU=2*Math.PI;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const memo=new Map();
  // Golub-Welsch quadrature for a standard normal: Jacobi off-diagonals sqrt(n).
  function normalRule(n){
    if(memo.has(n))return memo.get(n);
    const A=Array.from({length:n},()=>new Float64Array(n)),V=Array.from({length:n},(_,i)=>Float64Array.from({length:n},(_,j)=>+(i===j)));
    for(let i=1;i<n;i++)A[i-1][i]=A[i][i-1]=Math.sqrt(i);
    for(let it=0;it<100*n*n;it++){
      let p=0,q=1,best=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++)if(Math.abs(A[i][j])>best){p=i;q=j;best=Math.abs(A[i][j]);}
      if(best<1e-14)break;
      const phi=.5*Math.atan2(2*A[p][q],A[q][q]-A[p][p]),c=Math.cos(phi),s=Math.sin(phi),ap=A[p][p],aq=A[q][q],b=A[p][q];
      A[p][p]=c*c*ap-2*s*c*b+s*s*aq;A[q][q]=s*s*ap+2*s*c*b+c*c*aq;A[p][q]=A[q][p]=0;
      for(let k=0;k<n;k++)if(k!==p&&k!==q){const x=A[k][p],y=A[k][q];A[k][p]=A[p][k]=c*x-s*y;A[k][q]=A[q][k]=s*x+c*y;}
      for(let k=0;k<n;k++){const x=V[k][p],y=V[k][q];V[k][p]=c*x-s*y;V[k][q]=s*x+c*y;}
    }
    const out=Array.from({length:n},(_,i)=>({z:A[i][i],w:V[0][i]**2})).sort((a,b)=>a.z-b.z);memo.set(n,out);return out;
  }
  // Acklam inverse normal, followed by the normal CDF's usual rational approximation.
  function invNormal(p){
    p=clamp(p,1e-14,1-1e-14);const a=[-39.6968302866538,220.946098424521,-275.928510446969,138.357751867269,-30.6647980661472,2.50662827745924],b=[-54.4760987982241,161.585836858041,-155.698979859887,66.8013118877197,-13.2806815528857],c=[-.00778489400243029,-.322396458041136,-2.40075827716184,-2.54973253934373,4.37466414146497,2.93816398269878],d=[.00778469570904146,.32246712907004,2.445134137143,3.75440866190742];
    const poly=(a,x)=>a.reduce((s,v)=>s*x+v,0);let q,r;if(p<.02425){q=Math.sqrt(-2*Math.log(p));return poly(c,q)/(poly(d,q)*q+1);}if(p>1-.02425)return -invNormal(1-p);q=p-.5;r=q*q;return poly(a,r)*q/(poly(b,r)*r+1);
  }
  function cdf(z){const t=1/(1+.2316419*Math.abs(z)),p=Math.exp(-z*z/2)/Math.sqrt(TAU)*t*(.319381530+t*(-.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return z>=0?1-p:p;}
  function gaussian(mean,cv){
    // Positive truncated normal parameterised by its arithmetic mean and SD.
    let lo=0,hi=Math.max(40,2/cv);for(let it=0;it<70;it++){const z=(lo+hi)/2,l=Math.exp(-z*z/2)/Math.sqrt(TAU)/cdf(z),v=Math.sqrt(1-z*l-l*l)/(z+l);if(v>cv)lo=z;else hi=z;}
    const z=(lo+hi)/2,l=Math.exp(-z*z/2)/Math.sqrt(TAU)/cdf(z),sd=mean/(z+l),mu=z*sd,low=cdf(-z);return u=>Math.max(0,mu+sd*invNormal(low+(1-low)*u));
  }
  function quantile(mean,cv,shape,u){
    if(!mean||!cv)return mean;if(shape==='gaussian')return gaussian(mean,cv)(u);
    const s2=Math.log1p(cv*cv);return mean*Math.exp(-s2/2+Math.sqrt(s2)*invNormal(u));
  }
  function rule(mean,cv,shape,n){
    if(!mean||!cv)return [{v:mean,w:1}];
    if(shape==='gaussian'){const g=M.Chain.gauss(n),f=gaussian(mean,cv);return Array.from(g.t,(x,i)=>({v:f((x+1)/2),w:g.w[i]/2}));}
    const s2=Math.log1p(cv*cv);const rows=normalRule(n).filter(o=>o.w>1e-16).map(o=>({v:mean*Math.exp(-s2/2+Math.sqrt(s2)*o.z),w:o.w})),total=rows.reduce((s,o)=>s+o.w,0);return rows.map(o=>({...o,w:o.w/total}));
  }
  const primes=[2,3,5,7,11,13,17,19,23,29,31,37,41,43,47,53];
  function halton(i,b){let f=1,v=0;while(i){f/=b;v+=f*(i%b);i=Math.floor(i/b);}return v;}
  function samples(s){
    const coreShell=s.struct==='cs',chain=s.lesson==='chain',cv=clamp(+s.popSize||0,0,50)/100,tv=coreShell?clamp(+s.popShell||0,0,50)/100:0,mean=coreShell?s.core:s.rad,th=coreShell?s.shell:0,Ns=chain?s.ns:1,quality=s.popQuality||'standard',n={quick:9,standard:17,fine:cv>.25||tv>.25?41:25}[quality],out=[];
    const bead=(a,t)=>({r:coreShell?a+t:a,core:coreShell?a:0,t});
    if(!chain||s.popBeads==='shared'||Ns===1||(!cv&&!tv)){
      for(const a of rule(mean,cv,s.popShape,n))for(const t of rule(th,tv,s.popShape,n))out.push({w:a.w*t.w,beads:Array.from({length:Ns},()=>bead(a.v,t.v))});
    }else{
      const count={quick:8,standard:32,fine:128}[quality];
      for(let i=0;i<count;i++){const beads=[];for(let j=0;j<Ns;j++){
        const u=d=>{const shift=(Math.sin((d+1)*127.1)*43758.5453)%1,base=((halton(Math.floor(i/2)+1,primes[d])+shift)%1+1)%1;return i%2?1-base:base;};
        beads.push(bead(quantile(mean,cv,s.popShape,u(2*j)),quantile(th,tv,s.popShape,u(2*j+1))));
      }out.push({w:1/count,beads});}
    }
    const sum=out.reduce((a,o)=>a+o.w,0);out.forEach(o=>o.w/=sum);return out;
  }
  function moments(pop){
    let area=0,volume=0,mean=0,second=0;for(const o of pop)for(const b of o.beads){area+=o.w*Math.PI*b.r*b.r;volume+=o.w*4*Math.PI/3*b.r**3;mean+=o.w*b.r/o.beads.length;second+=o.w*b.r*b.r/o.beads.length;}return {area,volume,mean,sd:Math.sqrt(Math.max(0,second-mean*mean))};
  }
  function material(id,wl,n,k,length){return id==='custom'?{n,k}:id==='auOldenburg'?root.MuseumStudies.oldenburgGold(wl,length):Mat.nk(id,wl);}
  function optical(s,b,wl,L){
    const nm=s.med==='custom'?s.cmed:Mat.medium(s.med,wl).n,k=TAU*nm/wl,x=k*b.r;
    if(x>200||!Number.isFinite(x)||x<=0)throw Error('A sampled particle exceeds the supported size range. Reduce the mean size or distribution width.');
    const sameMetal=s.struct==='cs'&&s.mat===s.matCore&&root.MieSurface.supported(s.mat),p=s.surfaceOn&&root.MieSurface.supported(s.mat)?root.MieSurface.nk(s.mat,wl,b.r,s.struct==='cs'&&!sameMetal?b.core:0,s):material(s.mat,wl,s.cn,s.ck,s.struct==='cs'?b.t:b.r);let c;
    if(s.struct==='cs'){const q=s.surfaceOn&&root.MieSurface.supported(s.matCore)?root.MieSurface.nk(s.matCore,wl,sameMetal?b.r:b.core,0,s):material(s.matCore,wl,s.ccn,s.cck,b.core);c=M.coreShell(k*b.core,x,[q.n/nm,q.k/nm],[p.n/nm,p.k/nm],L??M.nstop(x));}
    else c=M.coefficients(x,[p.n/nm,p.k/nm],L??M.nstop(x));
    return {c,x,k};
  }
  const norm=F=>F.reduce((a,v)=>a+v*v,0);
  function member(s,o,wl,needPattern){
    if(s.lesson!=='chain'||s.ns===1){
      const b=o.beads[0],{c,k}=optical(s,b,wl),g=Math.PI*b.r*b.r;
      return {ext:c.Qext*g,sca:c.Qsca*g,abs:(c.Qext-c.Qsca)*g,g:c.g,ff:(theta,phi)=>{const a=M.amplitudes(c,Math.cos(theta)),p=M.abs2(a.s1),q=M.abs2(a.s2),cp=Math.cos(phi),sp=Math.sin(phi);return (s.pol==='unpol'?(p+q)/2:s.pol==='y'?q*sp*sp+p*cp*cp:q*cp*cp+p*sp*sp)/(k*k);},i12:theta=>{const a=M.amplitudes(c,Math.cos(theta));return [M.abs2(a.s2)/(k*k),M.abs2(a.s1)/(k*k)];}};
    }
    const nm=s.med==='custom'?s.cmed:Mat.medium(s.med,wl).n,k=TAU*nm/wl,xs=o.beads.map(b=>k*b.r),gap=k*s.gapNm,z=[0];
    for(let j=1;j<xs.length;j++)z.push(z[j-1]+xs[j-1]+xs[j]+gap);
    const center=(z[0]+z.at(-1))/2;for(let j=0;j<z.length;j++)z[j]-=center;
    const max=Math.max(...xs),needed=M.nstop(max)+Math.ceil(3/Math.sqrt(Math.max(1e-6,gap/max))),L=needed;
    if(L>40)throw Error('Some sampled chain members need more than 40 multipole orders. Increase the gap or reduce the size or spread.');
    const cs=o.beads.map(b=>optical(s,b,wl,L).c),ch=M.PolyChain.chain({cs,xs,z,L,axis:s.axis}),pols=s.pol==='unpol'?[[1,0,0],[0,1,0]]:[s.pol==='y'?[0,1,0]:[1,0,0]],sols=pols.map(p=>M.PolyChain.solve(ch,[0,0,1],p));
    const C=s.avg?M.PolyChain.orientationAverage(ch):{Cext:sols.reduce((a,v)=>a+v.Cext,0)/sols.length,Cabs:sols.reduce((a,v)=>a+v.Cabs,0)/sols.length};C.Csca=C.Cext-C.Cabs;
    const intensity=(theta,phi)=>{const u=[Math.sin(theta)*Math.cos(phi),Math.sin(theta)*Math.sin(phi),Math.cos(theta)];return sols.reduce((a,v)=>a+norm(M.PolyChain.farField(v,u)),0)/(sols.length*k*k);};
    return {ext:C.Cext/(k*k),abs:C.Cabs/(k*k),sca:C.Csca/(k*k),ff:intensity};
  }
  function calculate(s,wl,kind='cross',pop=samples(s)){
    const mm=moments(pop),chain=s.lesson==='chain'&&s.ns>1,T=chain?48:180,P=chain?24:48,values=kind==='current'?new Float32Array((T+1)*(P+1)):null,angular=kind==='current'?[[],[]]:null,K=chain?120:360;
    let ext=0,sca=0,abs=0,g=0;const phaseK=401,phase=kind==='colour'?new Float64Array(phaseK):null;
    for(const o of pop){
      const a=member(s,o,wl,kind!=='cross');ext+=o.w*a.ext;sca+=o.w*a.sca;abs+=o.w*a.abs;g+=o.w*a.sca*(a.g||0);
      if(values)for(let i=0;i<=T;i++){
        const theta=Math.PI*i/T;if(a.i12){const [q,p]=a.i12(theta);for(let j=0;j<=P;j++){const ph=TAU*j/P,cp=Math.cos(ph),sp=Math.sin(ph);values[i*(P+1)+j]+=o.w*(s.pol==='unpol'?(q+p)/2:s.pol==='y'?q*sp*sp+p*cp*cp:q*cp*cp+p*sp*sp);}}
        else for(let j=0;j<=P;j++)values[i*(P+1)+j]+=o.w*a.ff(theta,TAU*j/P);
      }
      if(angular)for(let i=0;i<=K;i++){
        const th=Math.PI*i/K,d=a.i12?a.i12(th):[a.ff(th,0),a.ff(th,Math.PI/2)];for(let j=0;j<2;j++){angular[j][i]??=[180*i/K,0];angular[j][i][1]+=o.w*d[j];}
      }
      if(phase)for(let i=0;i<phaseK;i++){const th=Math.PI*(i/(phaseK-1))**2,[q,p]=a.i12(th);phase[i]+=o.w*(q+p)/2*Math.sin(th);}
    }
    for(const v of [ext,sca,abs])if(!Number.isFinite(v))throw Error('The population solver did not converge. Reduce the size or spread, or increase the gap.');
    if(abs< -1e-5*Math.max(ext,1))throw Error('The sampled chain is outside numerical convergence. Reduce the spread or increase the gap.');
    const out={wl,ext,sca,abs:Math.max(0,abs),area:mm.area,volume:mm.volume,g:sca?g/sca:0,count:pop.length,moments:mm};
    if(values)Object.assign(out,{T,P,values,angular,fixedPattern:chain&&s.avg});
    if(phase){const th=Float64Array.from({length:phaseK},(_,i)=>Math.PI*(i/(phaseK-1))**2),cdf=new Float64Array(phaseK);for(let i=1;i<phaseK;i++)cdf[i]=cdf[i-1]+.5*(phase[i]+phase[i-1])*(th[i]-th[i-1]);const tot=cdf.at(-1);for(let i=0;i<phaseK;i++)cdf[i]=tot?cdf[i]/tot:i/(phaseK-1);out.table={th,cdf};}
    return out;
  }
  root.MiePopulation={normalRule,invNormal,cdf,quantile,rule,samples,moments,optical,member,calculate};
})(globalThis);
