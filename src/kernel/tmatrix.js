/* T-matrix of a straight chain of identical spheres (superposition T-matrix / multiple
   scattering). Conventions as physics.js: exp(-i w t), outgoing h_n^(1), relative index,
   all lengths in units of 1/k (kr).

   Basis (normalized, all azimuthal orders m):
     psi_nm = z_n(kr) Y_nm(theta, phi), Y_nm orthonormal with the Condon-Shortley phase,
     M_nm = curl(r psi_nm)/sqrt(n(n+1)),   N_nm = curl(M_nm)/k.
   A sphere at the origin has the diagonal T-matrix  b^M = -b_n e^M,  b^N = -a_n e^N.

   Chain frame: the spheres sit on the z' axis, so translations between them are axial and
   conserve m. The lab frame is reached with a rotation R (rows: chain axes in lab coords).
   Translation coefficients (psi centred at d z', expanded about the origin):
     scalar alpha^m_{n,nu} from h_0/j_0 by the recurrences that follow from the translation
     invariance of d/dz and d/dx + i d/dy (cf. Chew, J. Electromagn. Waves Appl. 6, 133 (1992));
     vector  A = [s_nu alpha_{n,nu} + kd/s_nu ((nu+1) c-_nu alpha_{n,nu-1} + nu c+_nu alpha_{n,nu+1})]/s_n,
             B = -i m kd alpha_{n,nu}/(s_n s_nu),  s_n = sqrt(n(n+1))
   (cf. Mackowski, Proc. R. Soc. Lond. A 433, 599 (1991)). Every identity is checked
   numerically in tests/tmatrix.test.cjs and the coupled results against treams. */
(function(root){
  'use strict';
  const Mie=root.Mie,FOURPI=4*Math.PI;
  const LL=L=>L*(L+2),idx=(n,m)=>n*(n+1)+m-1;

  /* ---------- normalized associated Legendre functions ---------- */
  // Flat arrays, index m*(L+2)+n for 0 <= m <= n <= L+1:
  //   P = Pbar_n^m(cos theta), Q = Pbar_n^m / sin(theta) (m >= 1), T = d Pbar_n^m / d theta.
  function legendreInto(mu,L,P,Q,T){
    const W=L+2,s=Math.sqrt(Math.max(0,1-mu*mu));let pmm=Math.sqrt(1/FOURPI);
    for(let m=0;m<=L+1;m++){
      const o=m*W;
      if(m===0){P[o]=pmm;Q[o]=0;}
      else{const q=-Math.sqrt((2*m+1)/(2*m))*pmm;Q[o+m]=q;P[o+m]=s*q;pmm=P[o+m];}
      if(m+1<=L+1){P[o+m+1]=mu*Math.sqrt(2*m+3)*P[o+m];Q[o+m+1]=mu*Math.sqrt(2*m+3)*Q[o+m];}
      for(let n=m+2;n<=L+1;n++){
        const a=Math.sqrt((4*n*n-1)/(n*n-m*m)),b=Math.sqrt(((n-1)*(n-1)-m*m)/(4*(n-1)*(n-1)-1));
        P[o+n]=a*(mu*P[o+n-1]-b*P[o+n-2]);Q[o+n]=a*(mu*Q[o+n-1]-b*Q[o+n-2]);
      }
    }
    for(let n=0;n<=L;n++)T[n]=Math.sqrt(n*(n+1))*P[W+n];
    for(let m=1;m<=L;m++){const o=m*W;for(let n=m;n<=L;n++)T[o+n]=n*mu*Q[o+n]-(n>m?Math.sqrt((2*n+1)/(2*n-1)*(n*n-m*m))*Q[o+n-1]:0);}
  }
  function legendre(mu,L){const W=L+2,P=new Float64Array(W*W),Q=new Float64Array(W*W),T=new Float64Array(W*W);legendreInto(mu,L,P,Q,T);return {P,Q,T,W};}

  /* ---------- spherical Bessel functions into buffers ---------- */
  // z_n(rho) for n = 0..N+1 (real argument): j always, y for outgoing waves.
  function besselInto(rho,N,J,Y,outgoing){const {j,y}=Mie.radial(rho,N+1,outgoing);for(let n=0;n<=N+1;n++){J[n]=j[n];Y[n]=outgoing?y[n]:0;}}

  /* ---------- fields of coefficient vectors ---------- */
  // Adds the field of sum_nm (cM M_nm + cN N_nm) at local spherical position (r, mu, phi) to out
  // (Cartesian, re/im interleaved). Radial functions per n: zm (M), zr (N radial, times s_n Y),
  // zd (N tangential): regular/outgoing z_n, z_n/rho, (rho z_n)'/rho; interior: R/rho, R/rho^2, R'/rho.
  function addField(out,L,cMR,cMI,cNR,cNI,zmR,zmI,zrR,zrI,zdR,zdI,mu,phi,LG){
    const st=Math.sqrt(Math.max(0,1-mu*mu)),W=L+2,{P,Q,T}=LG;let er=0,ei=0,tr=0,ti=0,fr=0,fi=0;
    for(let m=-L;m<=L;m++){
      const am=Math.abs(m),sg=m<0&&am%2?-1:1,cm=Math.cos(m*phi),sm=Math.sin(m*phi),o=am*W;
      for(let n=Math.max(1,am);n<=L;n++){
        const k=idx(n,m),sn=Math.sqrt(n*(n+1)),p=sg*P[o+n],pi=m*sg*Q[o+n]*(m<0?1:1),ta=sg*T[o+n];
        // pi_nm = m Pbar_n^m/sin with Pbar_n^{-|m|} = (-1)^m Pbar_n^|m|: sg already applied, m carries the sign.
        const aMr=cMR[k]*cm-cMI[k]*sm,aMi=cMR[k]*sm+cMI[k]*cm,aNr=cNR[k]*cm-cNI[k]*sm,aNi=cNR[k]*sm+cNI[k]*cm;
        // radial
        const nr=aNr*zrR[n]-aNi*zrI[n],ni=aNr*zrI[n]+aNi*zrR[n];er+=sn*p*nr;ei+=sn*p*ni;
        const mr=(aMr*zmR[n]-aMi*zmI[n])/sn,mi=(aMr*zmI[n]+aMi*zmR[n])/sn,dr=(aNr*zdR[n]-aNi*zdI[n])/sn,di=(aNr*zdI[n]+aNi*zdR[n])/sn;
        // theta: i pi cM zm + tau cN zd;  phi: -tau cM zm + i pi cN zd
        tr+=-pi*mi+ta*dr;ti+=pi*mr+ta*di;
        fr+=-ta*mr-pi*di;fi+=-ta*mi+pi*dr;
      }
    }
    const cp=Math.cos(phi),sp=Math.sin(phi);
    out[0]+=st*cp*er+mu*cp*tr-sp*fr;out[1]+=st*cp*ei+mu*cp*ti-sp*fi;
    out[2]+=st*sp*er+mu*sp*tr+cp*fr;out[3]+=st*sp*ei+mu*sp*ti+cp*fi;
    out[4]+=mu*er-st*tr;out[5]+=mu*ei-st*ti;
  }
  function radialArrays(L){const f=()=>new Float64Array(L+2);return {zmR:f(),zmI:f(),zrR:f(),zrI:f(),zdR:f(),zdI:f(),J:f(),Y:f()};}
  // Regular (kind 1) or outgoing (kind 3) radial functions at rho = kr.
  function fillRadial(R,rho,L,outgoing){
    besselInto(rho,L,R.J,R.Y,outgoing);
    for(let n=1;n<=L;n++){
      const zr=R.J[n],zi=R.Y[n],pr=R.J[n-1],pi=R.Y[n-1];
      R.zmR[n]=zr;R.zmI[n]=zi;R.zrR[n]=zr/rho;R.zrI[n]=zi/rho;R.zdR[n]=pr-n*zr/rho;R.zdI[n]=pi-n*zi/rho;
    }
  }
  // Field of a coefficient set (arrays of length LL(L)) about the origin, at Cartesian point p (kr units).
  function vswfField(p,L,c,kind,out=new Float64Array(6)){
    const r=Math.hypot(p[0],p[1],p[2])||1e-12,mu=p[2]/r,phi=Math.atan2(p[1],p[0]),R=radialArrays(L);fillRadial(R,r,L,kind===3);
    addField(out,L,c.MR,c.MI,c.NR,c.NI,R.zmR,R.zmI,R.zrR,R.zrI,R.zdR,R.zdI,mu,phi,legendre(mu,L));return out;
  }
  const coefs=L=>({MR:new Float64Array(LL(L)),MI:new Float64Array(LL(L)),NR:new Float64Array(LL(L)),NI:new Float64Array(LL(L))});

  /* ---------- plane wave ---------- */
  // e e^{i k.r} = sum p_nm M_nm + q_nm N_nm (regular), k-hat and complex e (re/im pairs) in the frame of the expansion.
  //   p = 4 pi i^{n+1} X*_nm(k)·e,  q = 4 pi i^n (k x X*_nm(k))·e,  X_nm = e^{im phi}/s_n (-pi theta - i tau phi).
  function planeWave(L,k,e){
    const c=coefs(L),mu=Math.max(-1,Math.min(1,k[2])),st=Math.sqrt(Math.max(0,1-mu*mu)),phi=st>1e-14?Math.atan2(k[1],k[0]):0,cp=Math.cos(phi),sp=Math.sin(phi);
    const th=[mu*cp,mu*sp,-st],ph=[-sp,cp,0],dot=(u,v)=>[u[0]*v[0][0]+u[1]*v[1][0]+u[2]*v[2][0],u[0]*v[0][1]+u[1]*v[1][1]+u[2]*v[2][1]];
    const [etR,etI]=dot(th,e),[epR,epI]=dot(ph,e),LG=legendre(mu,L),W=L+2;
    for(let n=1;n<=L;n++){
      const sn=Math.sqrt(n*(n+1)),ir=[1,0,-1,0][n%4],ii=[0,1,0,-1][n%4];
      for(let m=-n;m<=n;m++){
        const am=Math.abs(m),sg=m<0&&am%2?-1:1,pi=m*sg*LG.Q[am*W+n],ta=sg*LG.T[am*W+n],cm=Math.cos(m*phi),sm=-Math.sin(m*phi),k2=idx(n,m);
        // X*·e = e^{-im phi}/s (-pi e_th + i tau e_ph);  (k x X*)·e = e^{-im phi}/s (-i tau e_th - pi e_ph)
        const xr=(-pi*etR-ta*epI)/sn,xi=(-pi*etI+ta*epR)/sn,yr=(ta*etI-pi*epR)/sn,yi=(-ta*etR-pi*epI)/sn;
        const Xr=xr*cm-xi*sm,Xi=xr*sm+xi*cm,Yr=yr*cm-yi*sm,Yi=yr*sm+yi*cm;
        // times 4 pi i^{n+1} and 4 pi i^n
        const fr=-FOURPI*ii,fi=FOURPI*ir; // 4 pi i^n (+i)
        c.MR[k2]=fr*Xr-fi*Xi;c.MI[k2]=fr*Xi+fi*Xr;
        c.NR[k2]=FOURPI*(ir*Yr-ii*Yi);c.NI[k2]=FOURPI*(ir*Yi+ii*Yr);
      }
    }
    return c;
  }

  /* ---------- axial translation coefficients ---------- */
  // For a wave centred at d z' (d signed, kr units): psi_nu(r - d z') = sum_n alpha_{n nu} psi_n(r).
  // kind 3: outgoing source, |r| < |d| (or outgoing-to-outgoing uses kind 1 with |r| > |d|).
  // Returns per m >= 0 the vector coefficients A, B (re/im) on rows n <= Nr, columns nu <= Nc.
  // Outgoing-to-regular coefficients by Gauss-Legendre projection on a sphere of radius rho about the
  // receiver (rho < |d|): beta_{n nu} = 2 pi int Pbar_n^m(cos t) h_nu(kR) Pbar_nu^m(cos t') dcos t = alpha_{n nu} j_n(k rho).
  // The integrand is smooth and bounded by h_nu(k(|d|-rho)), so no precision is lost at high orders
  // (the h-seeded recurrence is not stable there). For each n the radius with the largest |j_n| is used.
  const gcache={};const gaussC=n=>gcache[n]||(gcache[n]=gauss(n));
  function alphaOutgoing(Nr,Nv,d,Mmax){
    const ad=Math.abs(d),NQ=2*(Nr+Nv)+40,{t,w}=gaussC(NQ),Lg=Math.max(Nr,Nv),Wl=Lg+2,res=[];
    // j_n(k rho) has no zeros below k rho = 4.49 (n >= 1), so one radius suffices for close spheres.
    const radii=(ad/2<4.4?[.5]:[.5,.42,.34]).map(f=>f*ad);
    for(let m=0;m<=Mmax;m++)res.push({R:new Float64Array((Nr+1)*(Nv+1)),I:new Float64Array((Nr+1)*(Nv+1)),best:new Float64Array(Nr+1).fill(-1)});
    const Pr=new Float64Array(Wl*Wl),Qr=new Float64Array(Wl*Wl),Tr=new Float64Array(Wl*Wl),Ps=new Float64Array(Wl*Wl),Qs=new Float64Array(Wl*Wl),Ts=new Float64Array(Wl*Wl);
    for(const rho of radii){
      const {j:jr}=Mie.radial(rho,Nr+1,false),bR=[],bI=[];
      for(let m=0;m<=Mmax;m++){bR.push(new Float64Array((Nr+1)*(Nv+1)));bI.push(new Float64Array((Nr+1)*(Nv+1)));}
      for(let i=0;i<NQ;i++){
        const ct=t[i],st=Math.sqrt(Math.max(0,1-ct*ct)),zx=rho*st,zz=rho*ct-d,R=Math.hypot(zx,zz),cs=zz/R,{j:hj,y:hy}=Mie.radial(R,Nv+1,true);
        legendreInto(ct,Lg,Pr,Qr,Tr);legendreInto(cs,Lg,Ps,Qs,Ts);
        for(let m=0;m<=Mmax;m++){const o=m*Wl,BR=bR[m],BI=bI[m];
          for(let n=Math.max(m,0);n<=Nr;n++){const pn=2*Math.PI*w[i]*Pr[o+n];if(!pn)continue;
            for(let nu=m;nu<=Nv;nu++){const f=pn*Ps[o+nu],q=n*(Nv+1)+nu;BR[q]+=f*hj[nu];BI[q]+=f*hy[nu];}}}
      }
      for(let m=0;m<=Mmax;m++)for(let n=m;n<=Nr;n++){const a=Math.abs(jr[n]),r=res[m];if(a<=r.best[n])continue;r.best[n]=a;
        for(let nu=m;nu<=Nv;nu++){const q=n*(Nv+1)+nu;r.R[q]=bR[m][q]/jr[n];r.I[q]=bI[m][q]/jr[n];}}
    }
    return res;
  }
  function translation(Nr,Nc,d,kind){
    const K=Nr+Nc+6,ad=Math.abs(d),sgn=d<0?-1:1,M=Math.min(Nr,Nc);
    const {j,y}=Mie.radial(Math.max(ad,1e-12),K+1,kind===3),W=K+2;
    const cp=(l,m)=>Math.sqrt(((l+1)*(l+1)-m*m)/((2*l+1)*(2*l+3))),cmn=(l,m)=>l<=Math.abs(m)-1||l===0?0:Math.sqrt((l*l-m*m)/((2*l-1)*(2*l+1)));
    // scalar alpha^m[n][nu] for n,nu <= K (validity shrinks towards the top; only n <= Nr, nu <= Nc+1 are used)
    let prevR=null,prevI=null;const out=[],quad=kind===3?alphaOutgoing(Nr,Nc+1,d,M):null;
    for(let m=0;m<=M;m++){
      const aR=new Float64Array(W*W),aI=new Float64Array(W*W),at=(n,nu)=>n*W+nu;
      if(quad){const q=quad[m];for(let n=m;n<=Nr;n++)for(let nu=m;nu<=Nc+1;nu++){aR[at(n,nu)]=q.R[n*(Nc+2)+nu];aI[at(n,nu)]=q.I[n*(Nc+2)+nu];}}
      else if(m===0){for(let n=0;n<=K;n++){const f=Math.sqrt(2*n+1)*(sgn<0&&n%2?-1:1);aR[at(n,0)]=f*j[n];aI[at(n,0)]=kind===3?f*y[n]:0;}}
      else{
        const g=Math.sqrt((2*m+1)/(2*m)),mp=m-1,ep=l=>Math.sqrt((l+m)*(l+m+1)/((2*l+1)*(2*l+3))),em=l=>Math.sqrt((l-m+1)*(l-m)/((2*l-1)*(2*l+1)));
        for(let n=m;n<K;n++){
          let r=0,i=0;
          if(n-1>=mp){r+=ep(n-1)*prevR[at(n-1,mp)];i+=ep(n-1)*prevI[at(n-1,mp)];}
          if(n+1<=K){r+=em(n+1)*prevR[at(n+1,mp)];i+=em(n+1)*prevI[at(n+1,mp)];}
          aR[at(n,m)]=g*r;aI[at(n,m)]=g*i;
        }
      }
      // upward in nu: c+_nu a_{n,nu+1} = c-_nu a_{n,nu-1} - c-_{n+1} a_{n+1,nu} + c+_{n-1} a_{n-1,nu}
      if(!quad)for(let nu=m;nu<Nc+1;nu++){
        const lim=K-1-(nu-m);
        for(let n=m;n<=lim;n++){
          let r=0,i=0;
          if(nu-1>=m){const c=cmn(nu,m);r+=c*aR[at(n,nu-1)];i+=c*aI[at(n,nu-1)];}
          {const c=cmn(n+1,m);r-=c*aR[at(n+1,nu)];i-=c*aI[at(n+1,nu)];}
          if(n-1>=m){const c=cp(n-1,m);r+=c*aR[at(n-1,nu)];i+=c*aI[at(n-1,nu)];}
          const c=cp(nu,m);aR[at(n,nu+1)]=r/c;aI[at(n,nu+1)]=i/c;
        }
      }
      // vector coefficients
      const Wv=Nc+1,AR=new Float64Array((Nr+1)*Wv),AI=new Float64Array((Nr+1)*Wv),BR=new Float64Array((Nr+1)*Wv),BI=new Float64Array((Nr+1)*Wv);
      for(let n=Math.max(1,m);n<=Nr;n++){
        const sn=Math.sqrt(n*(n+1));
        for(let nu=Math.max(1,m);nu<=Nc;nu++){
          const sv=Math.sqrt(nu*(nu+1)),o=n*Wv+nu,lo=nu-1>=m?cmn(nu,m)*(nu+1):0,hi=cp(nu,m)*nu;
          const r=sv*aR[at(n,nu)]+d/sv*(lo*(nu-1>=m?aR[at(n,nu-1)]:0)+hi*aR[at(n,nu+1)]);
          const i=sv*aI[at(n,nu)]+d/sv*(lo*(nu-1>=m?aI[at(n,nu-1)]:0)+hi*aI[at(n,nu+1)]);
          AR[o]=r/sn;AI[o]=i/sn;
          const f=m*d/(sn*sv);BR[o]=f*aI[at(n,nu)];BI[o]=-f*aR[at(n,nu)];
        }
      }
      out.push({AR,AI,BR,BI,W:Wv,alphaR:aR,alphaI:aI,aW:W});prevR=aR;prevI=aI;
    }
    return {m:out,Nr,Nc,d,kind};
  }
  function flipTranslation(T,L){return {...T,d:-T.d,m:T.m.map((b,m)=>{const o={...b,AR:b.AR.slice(),AI:b.AI.slice(),BR:b.BR.slice(),BI:b.BI.slice()};
    for(let n=0;n<=T.Nr;n++)for(let nu=0;nu<=T.Nc;nu++){const q=n*b.W+nu,p=(n+nu)%2?-1:1;o.AR[q]*=p;o.AI[q]*=p;o.BR[q]*=-p;o.BI[q]*=-p;}return o;})};}
  // Apply a translation to coefficient set c (source, up to Nc) -> new set (up to Nr); negative m by symmetry.
  function translate(tr,c,Nr,Nc){
    const o=coefs(Nr);
    for(let m=-Math.min(Nr,Nc);m<=Math.min(Nr,Nc);m++){
      const am=Math.abs(m),T=tr.m[am],sb=m<0?-1:1;
      for(let n=Math.max(1,am);n<=Nr;n++){
        const kn=idx(n,m);let mr=0,mi=0,nr=0,ni=0;
        for(let nu=Math.max(1,am);nu<=Nc;nu++){
          const q=n*T.W+nu,ar=T.AR[q],ai=T.AI[q],br=sb*T.BR[q],bi=sb*T.BI[q],kv=idx(nu,m);
          const MR=c.MR[kv],MI=c.MI[kv],NR=c.NR[kv],NI=c.NI[kv];
          mr+=ar*MR-ai*MI+br*NR-bi*NI;mi+=ar*MI+ai*MR+br*NI+bi*NR;
          nr+=br*MR-bi*MI+ar*NR-ai*NI;ni+=br*MI+bi*MR+ar*NI+ai*NR;
        }
        o.MR[kn]=mr;o.MI[kn]=mi;o.NR[kn]=nr;o.NI[kn]=ni;
      }
    }
    return o;
  }

  /* ---------- dense complex LU ---------- */
  function luFactor(S,R,I){
    const piv=new Int32Array(S);
    for(let k=0;k<S;k++){
      let p=k,best=-1;for(let i=k;i<S;i++){const v=R[i*S+k]**2+I[i*S+k]**2;if(v>best){best=v;p=i;}}
      piv[k]=p;if(p!==k)for(let c=0;c<S;c++){const a=k*S+c,b=p*S+c;let t=R[a];R[a]=R[b];R[b]=t;t=I[a];I[a]=I[b];I[b]=t;}
      const dr=R[k*S+k],di=I[k*S+k],dd=dr*dr+di*di||1e-300;
      for(let i=k+1;i<S;i++){
        const a=i*S+k,lr=(R[a]*dr+I[a]*di)/dd,li=(I[a]*dr-R[a]*di)/dd;R[a]=lr;I[a]=li;if(!lr&&!li)continue;
        for(let c=k+1;c<S;c++){const u=k*S+c,v=i*S+c;R[v]-=lr*R[u]-li*I[u];I[v]-=lr*I[u]+li*R[u];}
      }
    }
    return {S,R,I,piv};
  }
  function luSolve(F,xR,xI){
    const {S,R,I,piv}=F;
    for(let k=0;k<S;k++){const p=piv[k];if(p!==k){let t=xR[k];xR[k]=xR[p];xR[p]=t;t=xI[k];xI[k]=xI[p];xI[p]=t;}}
    for(let i=0;i<S;i++){let r=xR[i],m=xI[i];for(let c=0;c<i;c++){const a=i*S+c;r-=R[a]*xR[c]-I[a]*xI[c];m-=R[a]*xI[c]+I[a]*xR[c];}xR[i]=r;xI[i]=m;}
    for(let i=S-1;i>=0;i--){let r=xR[i],m=xI[i];for(let c=i+1;c<S;c++){const a=i*S+c;r-=R[a]*xR[c]-I[a]*xI[c];m-=R[a]*xI[c]+I[a]*xR[c];}const dr=R[i*S+i],di=I[i*S+i],dd=dr*dr+di*di;xR[i]=(r*dr+m*di)/dd;xI[i]=(m*dr-r*di)/dd;}
  }

  /* ---------- chain of identical spheres ---------- */
  // Rotation lab -> chain frame for a chain along 'x', 'y' or 'z' (right-handed, z' along the chain).
  const ROT={z:[[1,0,0],[0,1,0],[0,0,1]],x:[[0,1,0],[0,0,1],[1,0,0]],y:[[0,0,1],[1,0,0],[0,1,0]]};
  const rot=(R,v)=>[R[0][0]*v[0]+R[0][1]*v[1]+R[0][2]*v[2],R[1][0]*v[0]+R[1][1]*v[1]+R[1][2]*v[2],R[2][0]*v[0]+R[2][1]*v[1]+R[2][2]*v[2]];
  const rotT=(R,v)=>[R[0][0]*v[0]+R[1][0]*v[1]+R[2][0]*v[2],R[0][1]*v[0]+R[1][1]*v[1]+R[2][1]*v[2],R[0][2]*v[0]+R[1][2]*v[1]+R[2][2]*v[2]];

  // o: {c: sphere coefficients (Mie or coreShell object with N >= L), x: radius (kr), L, Ns, d: centre spacing (kr), axis}
  function chain(o){
    const {c,L,Ns,d}=o,x=o.x??c.x,R=ROT[o.axis||'z'],z=Array.from({length:Ns},(_,j)=>(j-(Ns-1)/2)*d);
    const tM=[],tN=[];for(let n=0;n<=L;n++){const a=c.a[n]||[0,0],b=c.b[n]||[0,0];tM.push([-b[0],-b[1]]);tN.push([-a[0],-a[1]]);}
    // translations by s spacings (source at z_l = z_j + s d)
    // Opposite direction by parity: A(-d) = (-1)^{n+nu} A(d), B(-d) = -(-1)^{n+nu} B(d).
    const tr={};for(let s=1;s<Ns;s++){tr[s]=translation(L,L,s*d,3);tr[-s]=flipTranslation(tr[s],L);}
    // Unknowns are scaled by |h_n(x)| (the size of each outgoing wave at the sphere surface), so the coupled
    // matrix has entries of order one even where T_n is tiny and the translation coefficients are huge.
    const {j:jx,y:yx}=Mie.radial(x,L,true),sc=new Float64Array(L+1);for(let n=1;n<=L;n++)sc[n]=Math.hypot(jx[n],yx[n]);
    const blocks=[];
    for(let m=0;m<=L;m++){
      const n0=Math.max(1,m),nn=L-n0+1,S=Ns*2*nn,TR=new Float64Array(S*S),TI=new Float64Array(S*S);
      const row=(j,t,n)=>j*2*nn+t*nn+(n-n0);
      for(let j=0;j<Ns;j++)for(let l=0;l<Ns;l++){
        if(l===j)continue;const T=tr[l-j].m[m];
        for(let n=n0;n<=L;n++)for(let nu=n0;nu<=L;nu++){
          const q=n*T.W+nu,A=[T.AR[q],T.AI[q]],B=[T.BR[q],T.BI[q]];
          for(let t=0;t<2;t++){
            const tt=t?tN[n]:tM[n],f=sc[n]/sc[nu];
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
    return {c,x,L,Ns,d,z,R,axis:o.axis||'z',tM,tN,tr,blocks,sc};
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
        for(let t=0;t<2;t++){const tt=t?tN[n]:tM[n],ar=t?q.NR[kk]:q.MR[kk],ai=t?q.NI[kk]:q.MI[kk],f=flip(t)*ch.sc[n],i=row(j,t,n);xR[i]=f*(tt[0]*ar-tt[1]*ai);xI[i]=f*(tt[0]*ai+tt[1]*ar);}}
      if(orders==null)luSolve(B.F,xR,xI);
      else{ // Neumann series b_K = T a + (T H) b_{K-1}
        const r0R=xR.slice(),r0I=xI.slice();
        for(let K=0;K<orders;K++){const yR=r0R.slice(),yI=r0I.slice();for(let i=0;i<S;i++){let r=0,im=0;for(let c=0;c<S;c++){const a=i*S+c;r+=B.TR[a]*xR[c]-B.TI[a]*xI[c];im+=B.TR[a]*xI[c]+B.TI[a]*xR[c];}yR[i]+=r;yI[i]+=im;}xR.set(yR);xI.set(yI);}
      }
      for(let j=0;j<Ns;j++)for(let n=n0;n<=L;n++){const kk=idx(n,m);for(let t=0;t<2;t++){const i=row(j,t,n),f=flip(t)/ch.sc[n];if(t){b[j].NR[kk]=f*xR[i];b[j].NI[kk]=f*xI[i];}else{b[j].MR[kk]=f*xR[i];b[j].MI[kk]=f*xI[i];}}}
    }
    // Cross sections (k^2 C): ext = -Re sum conj(a)·b. The exciting field of each sphere is e = b/t
    // (diagonal sphere T-matrix), so its absorption -Re conj(e)·b - |b|^2 = -|b|^2 (Re t/|t|^2 + 1).
    let ext=0,ab=0;const fM=new Float64Array(L+1),fN=new Float64Array(L+1);
    for(let n=1;n<=L;n++){const g=(t)=>{const q=t[0]*t[0]+t[1]*t[1];return q>1e-300?t[0]/q+1:0;};fM[n]=g(tM[n]);fN[n]=g(tN[n]);}
    for(let j=0;j<Ns;j++)for(let n=1;n<=L;n++)for(let m=-n;m<=n;m++){const i=idx(n,m),q=inc[j],B=b[j];
      ext-=q.MR[i]*B.MR[i]+q.MI[i]*B.MI[i]+q.NR[i]*B.NR[i]+q.NI[i]*B.NI[i];
      ab-=(B.MR[i]**2+B.MI[i]**2)*fM[n]+(B.NR[i]**2+B.NI[i]**2)*fN[n];}
    const geo=Ns*Math.PI*ch.x*ch.x;
    // Exciting coefficients (for the interior field) on demand: e = b/t.
    let exC=null;const ex=()=>exC||(exC=b.map(B=>{const q=coefs(L);for(let n=1;n<=L;n++){const dv=(t,r,i)=>{const d=t[0]*t[0]+t[1]*t[1];return d>1e-300?[(r*t[0]+i*t[1])/d,(i*t[0]-r*t[1])/d]:[0,0];};
      for(let m=-n;m<=n;m++){const k=idx(n,m);[q.MR[k],q.MI[k]]=dv(tM[n],B.MR[k],B.MI[k]);[q.NR[k],q.NI[k]]=dv(tN[n],B.NR[k],B.NI[k]);}}return q;}));
    return {ch,k,inc,b,get ex(){return ex();},Cext:ext,Cabs:ab,Csca:ext-ab,Qext:ext/geo,Qabs:ab/geo,Qsca:(ext-ab)/geo};
  }
  // Far-field amplitude F (E_sca ~ F e^{ikr}/(kr)) in lab direction u (unit vector) -> lab Cartesian re/im pairs.
  function farField(sol,u,LG=null){
    const {ch,b}=sol,{L,Ns,z,R}=ch,v=rot(R,u),mu=Math.max(-1,Math.min(1,v[2])),st=Math.sqrt(Math.max(0,1-mu*mu)),phi=st>1e-14?Math.atan2(v[1],v[0]):0,W=L+2;
    LG=LG||legendre(mu,L);let tr=0,ti=0,fr=0,fi=0;
    const phR=z.map(zz=>Math.cos(-mu*zz)),phI=z.map(zz=>Math.sin(-mu*zz));
    for(let n=1;n<=L;n++){
      const sn=Math.sqrt(n*(n+1)),k3=(n+1)%4,ar=[1,0,-1,0][k3],ai=[0,-1,0,1][k3],ar0=[1,0,-1,0][n%4],ai0=[0,-1,0,1][n%4]; // (-i)^{n+1}, (-i)^n
      for(let m=-n;m<=n;m++){
        const am=Math.abs(m),sg=m<0&&am%2?-1:1,pi=m*sg*ch_Q(LG,am,n,W),ta=sg*LG.T[am*W+n],cm=Math.cos(m*phi),sm=Math.sin(m*phi),kk=idx(n,m);
        let MR=0,MI=0,NR=0,NI=0;for(let j=0;j<Ns;j++){const B=b[j];MR+=B.MR[kk]*phR[j]-B.MI[kk]*phI[j];MI+=B.MR[kk]*phI[j]+B.MI[kk]*phR[j];NR+=B.NR[kk]*phR[j]-B.NI[kk]*phI[j];NI+=B.NR[kk]*phI[j]+B.NI[kk]*phR[j];}
        // times (-i)^{n+1} e^{im phi}/s and (-i)^n e^{im phi}/s
        const gMr=(ar*cm-ai*sm)/sn,gMi=(ar*sm+ai*cm)/sn,gNr=(ar0*cm-ai0*sm)/sn,gNi=(ar0*sm+ai0*cm)/sn;
        const cMr=MR*gMr-MI*gMi,cMi=MR*gMi+MI*gMr,cNr=NR*gNr-NI*gNi,cNi=NR*gNi+NI*gNr;
        tr+=-pi*cMi+ta*cNr;ti+=pi*cMr+ta*cNi;fr+=-ta*cMr-pi*cNi;fi+=-ta*cMi+pi*cNr;
      }
    }
    const cp=Math.cos(phi),sp=Math.sin(phi),th=[mu*cp,mu*sp,-st],ph=[-sp,cp,0];
    const re=rotT(R,[th[0]*tr+ph[0]*fr,th[1]*tr+ph[1]*fr,th[2]*tr+ph[2]*fr]),im=rotT(R,[th[0]*ti+ph[0]*fi,th[1]*ti+ph[1]*fi,th[2]*ti+ph[2]*fi]);
    return [re[0],im[0],re[1],im[1],re[2],im[2]];
  }
  const ch_Q=(LG,am,n,W)=>LG.Q[am*W+n];

  // Spectral radius of the coupling operator T H (largest over the m blocks), by power iteration:
  // the orders-of-scattering series converges if and only if it is below 1.
  function spectralRadius(ch,iters=120){
    let best=0;
    for(const B of ch.blocks){const S=B.S;if(!S)continue;let vR=new Float64Array(S),vI=new Float64Array(S);for(let i=0;i<S;i++){vR[i]=1+.37*Math.sin(i);vI[i]=.21*Math.cos(3*i);}let lam=0;
      for(let it=0;it<iters;it++){const wR=new Float64Array(S),wI=new Float64Array(S);for(let i=0;i<S;i++){let r=0,m=0;for(let c=0;c<S;c++){const a=i*S+c;r+=B.TR[a]*vR[c]-B.TI[a]*vI[c];m+=B.TR[a]*vI[c]+B.TI[a]*vR[c];}wR[i]=r;wI[i]=m;}
        let n=0,o=0;for(let i=0;i<S;i++){n+=wR[i]**2+wI[i]**2;o+=vR[i]**2+vI[i]**2;}n=Math.sqrt(n);if(!n)break;lam=n/Math.sqrt(o);for(let i=0;i<S;i++){vR[i]=wR[i]/n;vI[i]=wI[i]/n;}}
      best=Math.max(best,lam);}
    return best;
  }
  // Orientation average of the extinction, absorption and scattering efficiencies (random orientation):
  // average over the angle beta between k and the chain axis (Gauss-Legendre in cos beta) and two polarizations.
  function orientationAverage(ch,ng=null){
    const span=ch.d*(ch.Ns-1)+2*ch.x;ng=ng||Math.max(6,Math.min(40,Math.ceil(span/2)+6));
    const {t,w}=gauss(ng);let ext=0,ab=0;const save=ch.R;ch.R=ROT.z;
    for(let i=0;i<ng;i++){const cb=t[i],sb=Math.sqrt(1-cb*cb),k=[sb,0,cb];
      for(const e of [[cb,0,-sb],[0,1,0]]){const s=solve(ch,k,e);ext+=w[i]*s.Cext/4;ab+=w[i]*s.Cabs/4;}}
    ch.R=save;const geo=ch.Ns*Math.PI*ch.x*ch.x;return {Cext:ext,Cabs:ab,Csca:ext-ab,Qext:ext/geo,Qabs:ab/geo,Qsca:(ext-ab)/geo,ng};
  }
  function gauss(n){
    const t=new Float64Array(n),w=new Float64Array(n);
    for(let i=0;i<n;i++){let x=Math.cos(Math.PI*(i+.75)/(n+.5));for(let it=0;it<100;it++){let p0=1,p1=x;for(let k=2;k<=n;k++){const p2=((2*k-1)*x*p1-(k-1)*p0)/k;p0=p1;p1=p2;}const dp=n*(x*p1-p0)/(x*x-1),dx=p1/dp;x-=dx;if(Math.abs(dx)<1e-15)break;}
      let p0=1,p1=x;for(let k=2;k<=n;k++){const p2=((2*k-1)*x*p1-(k-1)*p0)/k;p0=p1;p1=p2;}const dp=n*(x*p1-p0)/(x*x-1);t[i]=x;w[i]=2/((1-x*x)*dp*dp);}
    return {t,w};
  }

  // Interior radial functions of the sphere at local radius r (kr units), from the layer data of
  // interior.js: zm = R_TE/rho, zr = R_TM/rho^2, zd = R'_TM/rho with rho = m k r of the region.
  function interiorRadial(c,r,L,R){
    const {d1Into,d3Into,psiRatioInto,xiRatioInto}=Mie._ricatti,Ls=Mie.withInterior(c).layers,Lr=Ls.length>1&&r<Ls[0].rOut?Ls[0]:Ls.at(-1);
    const N=L,f=()=>new Float64Array(N+2),d1R=f(),d1I=f(),uR=f(),uI=f(),d3R=f(),d3I=f(),vR=f(),vI=f();
    const zr=Lr.m[0]*r,zi=Lr.m[1]*r,z2=zr*zr+zi*zi,qr=zr/z2,qi=-zi/z2,xi=!!Lr.wx;
    d1Into(zr,zi,N,d1R,d1I);psiRatioInto(zr,zi,Lr.wp[0],Lr.wp[1],d1R,d1I,Lr.d1R,Lr.d1I,N,uR,uI);
    if(xi){d3Into(zr,zi,N,d1R,d1I,d3R,d3I);xiRatioInto(zr,zi,Lr.wx[0],Lr.wx[1],d3R,d3I,Lr.d3R,Lr.d3I,N,vR,vI);}
    const TE=Lr.TE,TM=Lr.TM;
    for(let n=1;n<=L;n++){
      let Rr=TE.AR[n]*uR[n]-TE.AI[n]*uI[n],Ri=TE.AR[n]*uI[n]+TE.AI[n]*uR[n],Qr=TM.AR[n]*uR[n]-TM.AI[n]*uI[n],Qi=TM.AR[n]*uI[n]+TM.AI[n]*uR[n];
      const duR=d1R[n]*uR[n]-d1I[n]*uI[n],duI=d1R[n]*uI[n]+d1I[n]*uR[n];let Pr=TM.AR[n]*duR-TM.AI[n]*duI,Pi=TM.AR[n]*duI+TM.AI[n]*duR;
      if(xi){Rr+=TE.BR[n]*vR[n]-TE.BI[n]*vI[n];Ri+=TE.BR[n]*vI[n]+TE.BI[n]*vR[n];Qr+=TM.BR[n]*vR[n]-TM.BI[n]*vI[n];Qi+=TM.BR[n]*vI[n]+TM.BI[n]*vR[n];const dvR=d3R[n]*vR[n]-d3I[n]*vI[n],dvI=d3R[n]*vI[n]+d3I[n]*vR[n];Pr+=TM.BR[n]*dvR-TM.BI[n]*dvI;Pi+=TM.BR[n]*dvI+TM.BI[n]*dvR;}
      R.zmR[n]=Rr*qr-Ri*qi;R.zmI[n]=Rr*qi+Ri*qr;const a=Qr*qr-Qi*qi,b=Qr*qi+Qi*qr;R.zrR[n]=a*qr-b*qi;R.zrI[n]=a*qi+b*qr;R.zdR[n]=Pr*qr-Pi*qi;R.zdI[n]=Pr*qi+Pi*qr;
    }
  }
  // Field evaluator in the lab frame (points in kr units). Returns fn(p,out) -> {inside: sphere index or -1};
  // out holds the scattered field outside the spheres and the internal (total) field inside.
  function fieldEvaluator(sol){
    const {ch,b,ex}=sol,{L,Ns,z,R,x,c}=ch,RA=radialArrays(L),W=L+2,LG={P:new Float64Array(W*W),Q:new Float64Array(W*W),T:new Float64Array(W*W)},loc=new Float64Array(6);
    return function(p,out){
      out.fill(0);loc.fill(0);const q=rot(R,p);let inside=-1;
      for(let j=0;j<Ns;j++){const dz=q[2]-z[j];if(q[0]*q[0]+q[1]*q[1]+dz*dz<x*x){inside=j;break;}}
      const add=(j,kind)=>{const dz=q[2]-z[j],r=Math.hypot(q[0],q[1],dz)||1e-12,mu=dz/r,phi=Math.atan2(q[1],q[0]);
        if(kind===0)interiorRadial(c,r,L,RA);else fillRadial(RA,r,L,true);legendreInto(mu,L,LG.P,LG.Q,LG.T);
        const C=kind===0?ex[j]:b[j];addField(loc,L,C.MR,C.MI,C.NR,C.NI,RA.zmR,RA.zmI,RA.zrR,RA.zrI,RA.zdR,RA.zdI,mu,phi,LG);};
      if(inside>=0)add(inside,0);else for(let j=0;j<Ns;j++)add(j,3);
      const re=rotT(R,[loc[0],loc[2],loc[4]]),im=rotT(R,[loc[1],loc[3],loc[5]]);out[0]=re[0];out[1]=im[0];out[2]=re[1];out[3]=im[1];out[4]=re[2];out[5]=im[2];
      return inside;
    };
  }
  // T-matrix of the whole chain about the point z0 on its axis (chain frame), truncated at Lo:
  // T_O = sum_jl J(O<-j) X_jl J(l<-O), from the solution of the coupled system for each regular wave about O.
  function clusterT(ch,z0,Lo){
    const {L,Ns,z}=ch,D=2*LL(Lo),TR=new Float64Array(D*D),TI=new Float64Array(D*D),toS=[],fromS=[];
    for(let j=0;j<Ns;j++){toS.push(translation(L,Lo,z0-z[j],1));fromS.push(translation(Lo,L,z[j]-z0,1));}
    for(const B of ch.blocks)for(const sg of B.m?[1,-1]:[1]){
      const m=sg*B.m,{n0,S,row}=B,flip=t=>sg<0&&t===1?-1:1;
      for(let nc=Math.max(1,Math.abs(m));nc<=Lo;nc++)for(let tc=0;tc<2;tc++){
        const unit=coefs(Lo);(tc?unit.NR:unit.MR)[idx(nc,m)]=1;
        const xR=new Float64Array(S),xI=new Float64Array(S);
        for(let j=0;j<Ns;j++){const a=translate(toS[j],unit,L,Lo);for(let n=n0;n<=L;n++){const kk=idx(n,m);for(let t=0;t<2;t++){const tt=t?ch.tN[n]:ch.tM[n],ar=t?a.NR[kk]:a.MR[kk],ai=t?a.NI[kk]:a.MI[kk],i=row(j,t,n),f=flip(t)*ch.sc[n];xR[i]=f*(tt[0]*ar-tt[1]*ai);xI[i]=f*(tt[0]*ai+tt[1]*ar);}}}
        luSolve(B.F,xR,xI);
        const col=tc*LL(Lo)+idx(nc,m);
        for(let j=0;j<Ns;j++){const bj=coefs(L);for(let n=n0;n<=L;n++){const kk=idx(n,m);for(let t=0;t<2;t++){const i=row(j,t,n),f=flip(t)/ch.sc[n];if(t){bj.NR[kk]=f*xR[i];bj.NI[kk]=f*xI[i];}else{bj.MR[kk]=f*xR[i];bj.MI[kk]=f*xI[i];}}}
          const o=translate(fromS[j],bj,Lo,L);
          for(let n=Math.max(1,Math.abs(m));n<=Lo;n++){const kk=idx(n,m);for(let t=0;t<2;t++){const r=t*LL(Lo)+kk;TR[r*D+col]+=t?o.NR[kk]:o.MR[kk];TI[r*D+col]+=t?o.NI[kk]:o.MI[kk];}}}
      }
    }
    return {D,Lo,TR,TI};
  }
  // Sphere expansion order for a chain: Wiscombe's N plus extra orders for close neighbours (gap g = d - 2x).
  function orderFor(x,d,Ns){const n=Mie.nstop(x);if(Ns<2)return n;const g=Math.max(1e-3,(d-2*x)/x);return Math.min(40,n+Math.ceil(3/Math.sqrt(g)));}

  Object.assign(Mie,{Chain:{legendre,legendreInto,vswfField,planeWave,translation,translate,coefs,chain,solve,farField,orientationAverage,spectralRadius,fieldEvaluator,clusterT,orderFor,gauss,ROT,idx,LL,luFactor,luSolve}});
})(typeof globalThis!=='undefined'?globalThis:this);
