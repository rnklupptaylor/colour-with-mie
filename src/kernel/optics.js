/* Teaching extensions built on the validated Mie core (physics.js).
   Same conventions: exp(-i omega t), m = n + i kappa, lengths as k r. */
(function(root){
  'use strict';
  const M=root.Mie;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));

  // Bessel J1 by rational/asymptotic approximation (absolute error below 1e-8).
  function besselJ1(x){
    const ax=Math.abs(x);
    if(ax<8){
      const y=x*x;
      const p=x*(72362614232.0+y*(-7895059235.0+y*(242396853.1+y*(-2972611.439+y*(15704.48260+y*(-30.16036606))))));
      const q=144725228442.0+y*(2300535178.0+y*(18583304.74+y*(99447.43394+y*(376.9991397+y))));
      return p/q;
    }
    const z=8/ax,y=z*z,xx=ax-2.356194491;
    const p=1+y*(0.183105e-2+y*(-0.3516396496e-4+y*(0.2457520174e-5+y*(-0.240337019e-6))));
    const q=0.04687499995+y*(-0.2002690873e-3+y*(0.8449199096e-5+y*(-0.88228987e-6+y*0.105787412e-6)));
    const v=Math.sqrt(0.636619772/ax)*(Math.cos(xx)*p-z*Math.sin(xx)*q);
    return x<0?-v:v;
  }

  // Rayleigh (quasi-static dipole) limit: L = (m^2-1)/(m^2+2).
  function rayleigh(x,m){
    const m2=M.mul(m,m),L=M.div(M.sub(m2,[1,0]),M.add(m2,[2,0]));
    const Qsca=8/3*x**4*M.abs2(L),Qabs=4*x*L[1];
    return {L,Qsca,Qabs,Qext:Qsca+Qabs};
  }

  // Kirchhoff-Fraunhofer diffraction by an opaque disc of the same radius:
  // S(theta) = x^2 (1+cos theta)/2 * J1(u)/u, u = x sin theta. Returns |S|^2.
  function fraunhofer(x,theta){
    const u=x*Math.sin(theta),f=Math.abs(u)<1e-8?0.5:besselJ1(u)/u;
    const s=x*x*(1+Math.cos(theta))/2*f;return s*s;
  }

  // First-order (one internal reflection) Descartes rainbow angle, 1 < m < 2.
  function rainbowAngle(n){
    if(!(n>1&&n<2))return null;
    const i=Math.acos(Math.sqrt((n*n-1)/3)),r=Math.asin(Math.sin(i)/n);
    return Math.PI+2*i-4*r;
  }

  // First zero of the Airy pattern, sin(theta) = 3.8317/x.
  const airyZero=x=>3.8317/x<1?Math.asin(3.8317/x):null;

  function efficiencyCurve(m,xmin,xmax,K=600,log=true){
    const out=[];
    for(let i=0;i<=K;i++){
      const x=log?xmin*(xmax/xmin)**(i/K):xmin+(xmax-xmin)*i/K,c=M.coefficients(x,m);
      out.push({x,Qext:c.Qext,Qsca:c.Qsca,Qabs:Math.max(0,c.Qext-c.Qsca),g:c.g});
    }
    return out;
  }

  // Fast complex electric field for slices. Mirrors Mie.field() term by term
  // but precomputes coefficients and reuses buffers.
  //  kind 'scattered': sum E_n (i a_n N3 - b_n M3); 'incident': E_n (M1 - i N1);
  //  kind 'regular': explicit coefficients {cn, cm} on N1, M1 (mode 00).
  function fieldEvaluator(c,o={}){
    const kind=o.kind||'scattered',outgoing=kind==='scattered';
    const N=Math.max(1,outgoing?Math.min(o.N??c.N,c.N):(o.N??20));
    const cmR=new Float64Array(N+1),cmI=new Float64Array(N+1),cnR=new Float64Array(N+1),cnI=new Float64Array(N+1);
    for(let n=1;n<=N;n++){
      let mR,mI,nR,nI;
      if(kind==='regular'){const cn=o.cn?.[n]||[0,0],cm=o.cm?.[n]||[0,0];[nR,nI]=cn;[mR,mI]=cm;}
      else{
        const f=(2*n+1)/(n*(n+1)),k=n%4,enR=f*[1,0,-1,0][k],enI=f*[0,1,0,-1][k];
        if(kind==='incident'){mR=enR;mI=enI;nR=enI;nI=-enR;}
        else{
          const a=c.a[n],b=c.b[n];
          mR=-(enR*b[0]-enI*b[1]);mI=-(enR*b[1]+enI*b[0]);
          const iaR=-a[1],iaI=a[0];nR=enR*iaR-enI*iaI;nI=enR*iaI+enI*iaR;
        }
        const w=o.weights?.[n]||[1,0];
        [mR,mI]=[mR*w[0]-mI*w[1],mR*w[1]+mI*w[0]];[nR,nI]=[nR*w[0]-nI*w[1],nR*w[1]+nI*w[0]];
      }
      const active=!o.solo||o.solo===n;
      if(o.magnetic===false||!active){mR=0;mI=0;}
      if(o.electric===false||!active){nR=0;nI=0;}
      cmR[n]=mR;cmI[n]=mI;cnR[n]=nR;cnI[n]=nI;
    }
    const pi=new Float64Array(N+2),tau=new Float64Array(N+2),angle=o.angle||0,ca=Math.cos(angle),sa=Math.sin(angle);
    // Regular waves at the origin: only the n = 1 N wave survives, N_e11(0) = (2/3) x-hat.
    const origin=[2/3*cnR[1],2/3*cnI[1]];
    return function(point,out=new Float64Array(6)){
      const px=ca*point[0]+sa*point[1],py=-sa*point[0]+ca*point[1],pz=point[2],rho=Math.hypot(px,py,pz);
      let exr,exi,eyr,eyi,ezr,ezi;
      if(!outgoing&&rho<1e-9){exr=origin[0];exi=origin[1];eyr=eyi=ezr=ezi=0;}
      else{
        const r=Math.max(1e-12,rho),mu=clamp(pz/r,-1,1),st=Math.sqrt(Math.max(0,1-mu*mu)),ph=Math.atan2(py,px),cp=Math.cos(ph),sp=Math.sin(ph);
        pi[0]=0;pi[1]=1;
        for(let n=1;n<=N;n++){tau[n]=n*mu*pi[n]-(n+1)*pi[n-1];if(n<N)pi[n+1]=((2*n+1)*mu*pi[n]-(n+1)*pi[n-1])/n;}
        const {j,y}=M.radial(r,N,outgoing);
        let rr=0,ri=0,tr=0,ti=0,qr=0,qi=0;
        for(let n=1;n<=N;n++){
          const zr=j[n],zi=outgoing?y[n]:0,dr=j[n-1]-n*zr/r,di=outgoing?y[n-1]-n*zi/r:0;
          const mzr=cmR[n]*zr-cmI[n]*zi,mzi=cmR[n]*zi+cmI[n]*zr;
          const nzr=cnR[n]*zr-cnI[n]*zi,nzi=cnR[n]*zi+cnI[n]*zr;
          const ndr=cnR[n]*dr-cnI[n]*di,ndi=cnR[n]*di+cnI[n]*dr;
          const rf=n*(n+1)*st*cp*pi[n]/r;
          rr+=rf*nzr;ri+=rf*nzi;
          tr+=cp*(pi[n]*mzr+tau[n]*ndr);ti+=cp*(pi[n]*mzi+tau[n]*ndi);
          qr-=sp*(tau[n]*mzr+pi[n]*ndr);qi-=sp*(tau[n]*mzi+pi[n]*ndi);
        }
        exr=st*cp*rr+mu*cp*tr-sp*qr;exi=st*cp*ri+mu*cp*ti-sp*qi;
        eyr=st*sp*rr+mu*sp*tr+cp*qr;eyi=st*sp*ri+mu*sp*ti+cp*qi;
        ezr=mu*rr-st*tr;ezi=mu*ri-st*ti;
      }
      out[0]=ca*exr-sa*eyr;out[1]=ca*exi-sa*eyi;out[2]=sa*exr+ca*eyr;out[3]=sa*exi+ca*eyi;out[4]=ezr;out[5]=ezi;
      return out;
    };
  }

  // Normalized tangential angular harmonics (mode 00), same basis as harmonics.js:
  // F = sum A_n [cN (tau cos phi th - pi sin phi ph) + cM (pi cos phi th - tau sin phi ph)].
  function angularEvaluator(cn,cm,N=10){
    const A=Array.from({length:N+1},(_,n)=>n?Math.sqrt((2*n+1)/(2*Math.PI))/(n*(n+1)):0);
    return function(theta,phi){
      const mu=Math.cos(theta),st=Math.sin(theta),cp=Math.cos(phi),sp=Math.sin(phi),{pi,tau}=M.angular(mu,N);
      let tr=0,ti=0,qr=0,qi=0;
      for(let n=1;n<=N;n++){
        const e=cn[n]||[0,0],m=cm[n]||[0,0],a=A[n];
        tr+=a*cp*(tau[n]*e[0]+pi[n]*m[0]);ti+=a*cp*(tau[n]*e[1]+pi[n]*m[1]);
        qr-=a*sp*(pi[n]*e[0]+tau[n]*m[0]);qi-=a*sp*(pi[n]*e[1]+tau[n]*m[1]);
      }
      return [mu*cp*tr-sp*qr,mu*cp*ti-sp*qi,mu*sp*tr+cp*qr,mu*sp*ti+cp*qi,-st*tr,-st*ti];
    };
  }

  Object.assign(M,{besselJ1,rayleigh,fraunhofer,rainbowAngle,airyZero,efficiencyCurve,fieldEvaluator,angularEvaluator});
})(typeof globalThis!=='undefined'?globalThis:this);
