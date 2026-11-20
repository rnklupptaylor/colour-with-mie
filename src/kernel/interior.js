/* Fields inside the particle and coated (core-shell) spheres after Aden & Kerker (1951).
   Everything is written with logarithmic derivatives D1 = psi'/psi, D3 = xi'/xi and with
   bounded ratios of Riccati-Bessel functions (cf. Yang, Appl. Opt. 42, 1710 (2003)), so
   absorbing, metallic or high-index particles cannot overflow. Conventions as physics.js:
   exp(-i w t), psi_n = z j_n, xi_n = z h_n^(1), relative indices m = n + i k.

   Boundary conditions per order, for a region field written with a Riccati function R:
     TE (M waves, b_n):  R/m and R' continuous;   TM (N waves, a_n):  R and R'/m continuous.
   Core: R = A psi(m1 kr)/psi(m1 x_c).  Shell: R = A psi(m2 kr)/psi(m2 x_s) + B xi(m2 kr)/xi(m2 x_c).
   Interior field: E = sum E_n [ M_o1n(z = R_TE/rho) - i N_e1n(z = R_TM/rho) ], rho = m k r. */
(function(root){
  'use strict';
  const M=root.Mie,{add,sub,mul,div,scale}=M;

  // D1_n(z), n = 0..N, by downward recurrence (stable for any complex z).
  function d1Into(zr,zi,N,R,I,extra=16){
    const L=Math.max(N,Math.ceil(Math.hypot(zr,zi)))+extra,z2=zr*zr+zi*zi;let dr=0,di=0;
    for(let n=L;n>=1;n--){const nr=n*zr/z2,ni=-n*zi/z2,tr=dr+nr,ti=di+ni,td=tr*tr+ti*ti;dr=nr-tr/td;di=ni+ti/td;if(n-1<=N){R[n-1]=dr;I[n-1]=di;}}
  }
  // sin z * exp(-|Im z|): bounded for every z and accurate for small z.
  function sinScaled(zr,zi){
    const s=Math.abs(zi);
    if(s<20){const e=Math.exp(-s);return [Math.sin(zr)*Math.cosh(zi)*e,Math.cos(zr)*Math.sinh(zi)*e];}
    const a=Math.exp(-zi-s),b=Math.exp(zi-s),dr=(a-b)*Math.cos(zr),di=(a+b)*Math.sin(zr);return [di/2,-dr/2];
  }
  // D3_n(z) = D1_n + i/(psi_n xi_n); psi_n xi_n by upward recurrence from psi_0 xi_0 = -i e^{iz} sin z.
  function d3Into(zr,zi,N,d1R,d1I,R,I){
    let pr,pi;
    if(Math.abs(zi)<20){const [sr,si]=sinScaled(zr,zi),g=Math.exp(Math.abs(zi)-zi),er=g*Math.cos(zr),ei=g*Math.sin(zr),qr=er*sr-ei*si,qi=er*si+ei*sr;pr=qi;pi=-qr;}
    else{const e=Math.exp(-2*zi);pr=(1-e*Math.cos(2*zr))/2;pi=-e*Math.sin(2*zr)/2;}
    R[0]=0;I[0]=1;const z2=zr*zr+zi*zi;
    for(let n=1;n<=N;n++){
      const nr=n*zr/z2,ni=-n*zi/z2,ar=nr-R[n-1],ai=ni-I[n-1],br=d1R[n]+nr,bi=d1I[n]+ni,bd=br*br+bi*bi,fr=(ar*br+ai*bi)/bd,fi=(ai*br-ar*bi)/bd;
      const t=pr*fr-pi*fi;pi=pr*fi+pi*fr;pr=t;const pd=pr*pr+pi*pi;R[n]=d1R[n]+pi/pd;I[n]=d1I[n]+pr/pd;
    }
  }
  // psi_n(z)/psi_n(w) for |Im z| <= |Im w| (z inside w): products of psi_n/psi_{n-1} = 1/(D1_n + n/z).
  function psiRatioInto(zr,zi,wr,wi,dzR,dzI,dwR,dwI,N,R,I){
    const [sr,si]=sinScaled(zr,zi),[tr,ti]=sinScaled(wr,wi),sc=Math.exp(Math.abs(zi)-Math.abs(wi)),td=tr*tr+ti*ti;
    let rr=(sr*tr+si*ti)/td*sc,ri=(si*tr-sr*ti)/td*sc;R[0]=rr;I[0]=ri;const z2=zr*zr+zi*zi,w2=wr*wr+wi*wi;
    for(let n=1;n<=N;n++){
      const ar=dwR[n]+n*wr/w2,ai=dwI[n]-n*wi/w2,br=dzR[n]+n*zr/z2,bi=dzI[n]-n*zi/z2,bd=br*br+bi*bi,fr=(ar*br+ai*bi)/bd,fi=(ai*br-ar*bi)/bd;
      const t=rr*fr-ri*fi;ri=rr*fi+ri*fr;rr=t;R[n]=rr;I[n]=ri;
    }
  }
  // xi_n(z)/xi_n(w) for z outside w: products of xi_n/xi_{n-1} = n/z - D3_{n-1}.
  function xiRatioInto(zr,zi,wr,wi,dzR,dzI,dwR,dwI,N,R,I){
    const e=Math.exp(wi-zi);let rr=e*Math.cos(zr-wr),ri=e*Math.sin(zr-wr);R[0]=rr;I[0]=ri;const z2=zr*zr+zi*zi,w2=wr*wr+wi*wi;
    for(let n=1;n<=N;n++){
      const ar=n*zr/z2-dzR[n-1],ai=-n*zi/z2-dzI[n-1],br=n*wr/w2-dwR[n-1],bi=-n*wi/w2-dwI[n-1],bd=br*br+bi*bi,fr=(ar*br+ai*bi)/bd,fi=(ai*br-ar*bi)/bd;
      const t=rr*fr-ri*fi;ri=rr*fi+ri*fr;rr=t;R[n]=rr;I[n]=ri;
    }
  }
  const bufs=N=>[new Float64Array(N+2),new Float64Array(N+2)];
  const at=(B,n)=>[B[0][n],B[1][n]];
  function D1(z,N){const B=bufs(N);d1Into(z[0],z[1],N,B[0],B[1],60);return B;}
  function D3(z,d1,N){const B=bufs(N);d3Into(z[0],z[1],N,d1[0],d1[1],B[0],B[1]);return B;}
  function sums(c){
    let sca=0,ext=0,gg=0;const {a,b,N,x}=c;
    for(let n=1;n<=N;n++){sca+=(2*n+1)*(M.abs2(a[n])+M.abs2(b[n]));ext+=(2*n+1)*(a[n][0]+b[n][0]);gg+=(2*n+1)/(n*(n+1))*(a[n][0]*b[n][0]+a[n][1]*b[n][1]);if(n<N)gg+=n*(n+2)/(n+1)*(a[n][0]*a[n+1][0]+a[n][1]*a[n+1][1]+b[n][0]*b[n+1][0]+b[n][1]*b[n+1][1]);}
    Object.assign(c,{Qsca:2*sca/x**2,Qext:2*ext/x**2,g:sca?2*gg/sca:0});return c;
  }
  const layer=(m,rOut,wp,d1,TE,TM,wx=null,d3=null)=>({m,rOut,wp,d1R:d1[0],d1I:d1[1],wx,d3R:d3?.[0],d3I:d3?.[1],TE,TM});
  const coefBuf=N=>({AR:new Float64Array(N+1),AI:new Float64Array(N+1),BR:new Float64Array(N+1),BI:new Float64Array(N+1)});

  // Internal coefficients of a homogeneous sphere: A_TE = m(psi_n - b_n xi_n), A_TM = psi_n - a_n xi_n at x.
  function withInterior(c){
    if(c.layers)return c;const {N,x}=c,m=c.m||[1,0],w=scale(m,x),{j,y}=M.radial(x,N,true),TE=coefBuf(N),TM=coefBuf(N);
    for(let n=1;n<=N;n++){const xi=[x*j[n],x*y[n]],psi=[x*j[n],0],te=mul(m,sub(psi,mul(c.b[n],xi))),tm=sub(psi,mul(c.a[n],xi));TE.AR[n]=te[0];TE.AI[n]=te[1];TM.AR[n]=tm[0];TM.AI[n]=tm[1];}
    c.layers=[layer(m,x,w,D1(w,N),TE,TM)];return c;
  }

  // Coated sphere: core radius x_c, outer radius x_s (both k r), core index m1, shell index m2.
  function coreShell(xc,xs,m1,m2,N=M.nstop(xs)){
    if(xc<=1e-6*xs)return Object.assign(withInterior(M.coefficients(xs,m2,N)),{core:null});
    if(xs-xc<=1e-9*xs)return Object.assign(withInterior(M.coefficients(xs,m1,N)),{core:null});
    const z1=scale(m1,xc),za=scale(m2,xc),zb=scale(m2,xs),d1z1=D1(z1,N),d1za=D1(za,N),d1zb=D1(zb,N),d3za=D3(za,d1za,N),d3zb=D3(zb,d1zb,N);
    const Pp=bufs(N),Px=bufs(N);psiRatioInto(za[0],za[1],zb[0],zb[1],d1za[0],d1za[1],d1zb[0],d1zb[1],N,Pp[0],Pp[1]);xiRatioInto(zb[0],zb[1],za[0],za[1],d3zb[0],d3zb[1],d3za[0],d3za[1],N,Px[0],Px[1]);
    const {j,y}=M.radial(xs,N,true),a=[[0,0]],b=[[0,0]],cTE=coefBuf(N),cTM=coefBuf(N),sTE=coefBuf(N),sTM=coefBuf(N),one=[1,0];
    for(let n=1;n<=N;n++){
      const psi=xs*j[n],psim=xs*j[n-1],xi=[psi,xs*y[n]],xim=[psim,xs*y[n-1]],ny=[n/xs,0],pp=at(Pp,n),px=at(Px,n),D1c=at(d1z1,n),D1a=at(d1za,n),D3a=at(d3za,n),D1b=at(d1zb,n),D3b=at(d3zb,n);
      // TE: shell B/A from the core interface, then b_n from the outer interface.
      const al=mul(pp,div(sub(mul(m1,D1c),mul(m2,D1a)),sub(mul(m2,D3a),mul(m1,D1c)))),ap=mul(al,px);
      const tb=add(mul(m2,div(add(D1b,mul(ap,D3b)),add(one,ap))),ny);b[n]=div(sub(scale(tb,psi),[psim,0]),sub(mul(tb,xi),xim));
      const F=div(mul(m2,sub([psi,0],mul(b[n],xi))),add(one,ap)),V=mul(al,F),Cc=div(mul(m1,add(mul(F,pp),V)),m2);
      // TM: the same with the roles of m swapped.
      const be=mul(pp,div(sub(mul(m2,D1c),mul(m1,D1a)),sub(mul(m1,D3a),mul(m2,D1c)))),bp=mul(be,px);
      const ta=add(div(div(add(D1b,mul(bp,D3b)),add(one,bp)),m2),ny);a[n]=div(sub(scale(ta,psi),[psim,0]),sub(mul(ta,xi),xim));
      const G=div(sub([psi,0],mul(a[n],xi)),add(one,bp)),W=mul(be,G),Dd=add(mul(G,pp),W);
      [cTE.AR[n],cTE.AI[n]]=Cc;[cTM.AR[n],cTM.AI[n]]=Dd;[sTE.AR[n],sTE.AI[n]]=F;[sTE.BR[n],sTE.BI[n]]=V;[sTM.AR[n],sTM.AI[n]]=G;[sTM.BR[n],sTM.BI[n]]=W;
    }
    const c=sums({a,b,N,x:xs,m:m2,core:{x:xc,m:m1}});
    c.layers=[layer(m1,xc,z1,d1z1,cTE,cTM),layer(m2,xs,zb,d1zb,sTE,sTM,za,d3za)];return c;
  }

  // Quasi-static polarizability factor of a coated sphere (B&H eq. 5.36), relative to the medium.
  function rayleighCoated(x,q,m1,m2){
    const e1=mul(m1,m1),e2=mul(m2,m2),f=q**3,one=[1,0],two=[2,0];
    const num=add(mul(sub(e2,one),add(e1,scale(e2,2))),scale(mul(add(scale(e2,2),one),sub(e1,e2)),f));
    const den=add(mul(add(e2,two),add(e1,scale(e2,2))),scale(mul(sub(e2,one),sub(e1,e2)),2*f));
    const L=div(num,den),Qsca=8/3*x**4*M.abs2(L),Qabs=4*x*L[1];return {L,Qsca,Qabs,Qext:Qsca+Qabs};
  }

  // Field inside the particle (points in k r units). Same options as Mie.fieldEvaluator.
  // With `terms` an array, per-order contributions are collected for the term-by-term view.
  function interiorEvaluator(c,o={}){
    const Ls=withInterior(c).layers,N=Math.max(1,Math.min(o.N??c.N,c.N)),ang=o.angle||0,ca=Math.cos(ang),sa=Math.sin(ang),outer=Ls.at(-1).rOut;
    const cmR=new Float64Array(N+1),cmI=new Float64Array(N+1),cnR=new Float64Array(N+1),cnI=new Float64Array(N+1);
    for(let n=1;n<=N;n++){
      const f=(2*n+1)/(n*(n+1)),k=n%4,er=f*[1,0,-1,0][k],ei=f*[0,1,0,-1][k],w=o.weights?.[n]||[1,0],active=!o.solo||o.solo===n;
      const mr=er*w[0]-ei*w[1],mi=er*w[1]+ei*w[0];
      if(o.magnetic!==false&&active){cmR[n]=mr;cmI[n]=mi;}
      if(o.electric!==false&&active){cnR[n]=mi;cnI[n]=-mr;}
    }
    const [d1R,d1I]=bufs(N),[d3R,d3I]=bufs(N),[uR,uI]=bufs(N),[vR,vI]=bufs(N),pi=new Float64Array(N+2),tau=new Float64Array(N+2);
    const cart=(st,cp,sp,mu,r,t,p)=>[st*cp*r[0]+mu*cp*t[0]-sp*p[0],st*cp*r[1]+mu*cp*t[1]-sp*p[1],st*sp*r[0]+mu*sp*t[0]+cp*p[0],st*sp*r[1]+mu*sp*t[1]+cp*p[1],mu*r[0]-st*t[0],mu*r[1]-st*t[1]];
    const back=v=>[ca*v[0]-sa*v[2],ca*v[1]-sa*v[3],sa*v[0]+ca*v[2],sa*v[1]+ca*v[3],v[4],v[5]];
    return function(point,out=new Float64Array(6),terms=null){
      let px=ca*point[0]+sa*point[1],py=-sa*point[0]+ca*point[1],pz=point[2],r=Math.hypot(px,py,pz);
      if(r<1e-9*outer){px=0;py=0;pz=1e-9*outer;r=pz;}
      const L=Ls.length>1&&r<Ls[0].rOut?Ls[0]:Ls.at(-1),mu=Math.max(-1,Math.min(1,pz/r)),st=Math.sqrt(Math.max(0,1-mu*mu)),ph=Math.atan2(py,px),cp=Math.cos(ph),sp=Math.sin(ph);
      pi[0]=0;pi[1]=1;for(let n=1;n<=N;n++){tau[n]=n*mu*pi[n]-(n+1)*pi[n-1];if(n<N)pi[n+1]=((2*n+1)*mu*pi[n]-(n+1)*pi[n-1])/n;}
      const zr=L.m[0]*r,zi=L.m[1]*r,z2=zr*zr+zi*zi,qr=zr/z2,qi=-zi/z2,xi=!!L.wx;
      d1Into(zr,zi,N,d1R,d1I);psiRatioInto(zr,zi,L.wp[0],L.wp[1],d1R,d1I,L.d1R,L.d1I,N,uR,uI);
      if(xi){d3Into(zr,zi,N,d1R,d1I,d3R,d3I);xiRatioInto(zr,zi,L.wx[0],L.wx[1],d3R,d3I,L.d3R,L.d3I,N,vR,vI);}
      let er=0,ei=0,tr=0,ti=0,fr=0,fi=0;const TE=L.TE,TM=L.TM;
      for(let n=1;n<=N;n++){
        // Riccati functions of this region: TE value, TM value and TM derivative.
        let Rr=TE.AR[n]*uR[n]-TE.AI[n]*uI[n],Ri=TE.AR[n]*uI[n]+TE.AI[n]*uR[n];
        let Qr=TM.AR[n]*uR[n]-TM.AI[n]*uI[n],Qi=TM.AR[n]*uI[n]+TM.AI[n]*uR[n];
        const duR=d1R[n]*uR[n]-d1I[n]*uI[n],duI=d1R[n]*uI[n]+d1I[n]*uR[n];
        let Pr=TM.AR[n]*duR-TM.AI[n]*duI,Pi=TM.AR[n]*duI+TM.AI[n]*duR;
        if(xi){
          Rr+=TE.BR[n]*vR[n]-TE.BI[n]*vI[n];Ri+=TE.BR[n]*vI[n]+TE.BI[n]*vR[n];Qr+=TM.BR[n]*vR[n]-TM.BI[n]*vI[n];Qi+=TM.BR[n]*vI[n]+TM.BI[n]*vR[n];
          const dvR=d3R[n]*vR[n]-d3I[n]*vI[n],dvI=d3R[n]*vI[n]+d3I[n]*vR[n];Pr+=TM.BR[n]*dvR-TM.BI[n]*dvI;Pi+=TM.BR[n]*dvI+TM.BI[n]*dvR;
        }
        // z = R/rho for M, z and (rho z)'/rho for N, and z/rho for the radial N component.
        const zmR=Rr*qr-Ri*qi,zmI=Rr*qi+Ri*qr,znR=Qr*qr-Qi*qi,znI=Qr*qi+Qi*qr,dnR=Pr*qr-Pi*qi,dnI=Pr*qi+Pi*qr,zrR=znR*qr-znI*qi,zrI=znR*qi+znI*qr;
        const mzR=cmR[n]*zmR-cmI[n]*zmI,mzI=cmR[n]*zmI+cmI[n]*zmR,nrR=cnR[n]*zrR-cnI[n]*zrI,nrI=cnR[n]*zrI+cnI[n]*zrR,ndR=cnR[n]*dnR-cnI[n]*dnI,ndI=cnR[n]*dnI+cnI[n]*dnR,rf=n*(n+1)*st*cp*pi[n];
        er+=rf*nrR;ei+=rf*nrI;tr+=cp*(pi[n]*mzR+tau[n]*ndR);ti+=cp*(pi[n]*mzI+tau[n]*ndI);fr-=sp*(tau[n]*mzR+pi[n]*ndR);fi-=sp*(tau[n]*mzI+pi[n]*ndI);
        if(terms){
          const mb=back(cart(st,cp,sp,mu,[0,0],[cp*pi[n]*zmR,cp*pi[n]*zmI],[-sp*tau[n]*zmR,-sp*tau[n]*zmI])),nb=back(cart(st,cp,sp,mu,[rf*zrR,rf*zrI],[cp*tau[n]*dnR,cp*tau[n]*dnI],[-sp*pi[n]*dnR,-sp*pi[n]*dnI]));
          const cm=[cmR[n],cmI[n]],cn=[cnR[n],cnI[n]],f=(2*n+1)/(n*(n+1)),k=n%4;
          terms.push({n,active:!o.solo||o.solo===n,en:[f*[1,0,-1,0][k],f*[0,1,0,-1][k]],weight:[1,0],a:null,b:null,pi:pi[n],tau:tau[n],radial:[Qr,Qi],
            electricCoefficient:cn,magneticCoefficient:cm,electricBasis:nb,magneticBasis:mb,electric:M.productVector(cn,nb),magnetic:M.productVector(cm,mb)});
        }
      }
      const ex=st*cp*er+mu*cp*tr-sp*fr,exi=st*cp*ei+mu*cp*ti-sp*fi,ey=st*sp*er+mu*sp*tr+cp*fr,eyi=st*sp*ei+mu*sp*ti+cp*fi,ez=mu*er-st*tr,ezi=mu*ei-st*ti;
      out[0]=ca*ex-sa*ey;out[1]=ca*exi-sa*eyi;out[2]=sa*ex+ca*ey;out[3]=sa*exi+ca*eyi;out[4]=ez;out[5]=ezi;return out;
    };
  }

  // Term-by-term interior field with the same structure as Mie.sample. Outside the particle
  // the shown field is scattered (or total); inside, `total` false shows E_inside - E_inc.
  function sampleInside(p,c,o={}){
    const angles=o.unpolarized?[0,Math.PI/2]:[o.angle||0];
    const channels=angles.map(angle=>{
      const terms=[],e=interiorEvaluator(c,{...o,angle})(p,new Float64Array(6),terms),inc=M.incident(p,angle),shift=o.includeIncident?[0,0,0,0,0,0]:inc.map(v=>-v),tot=Array.from(e).map((v,i)=>v+shift[i]);
      return {angle,e:tot,details:terms,vectorTerms:terms.map(t=>t.electric.map((v,i)=>v+t.magnetic[i])),incident:shift};
    });
    return {channels,e:channels[0].e,intensity:channels.reduce((s,ch)=>s+M.norm2(ch.e),0)/channels.length};
  }

  Object.assign(M,{coreShell,withInterior,interiorEvaluator,sampleInside,rayleighCoated,_ricatti:{d1Into,d3Into,psiRatioInto,xiRatioInto}});
})(typeof globalThis!=='undefined'?globalThis:this);
