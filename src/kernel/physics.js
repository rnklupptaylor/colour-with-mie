/* Mie Explorer numerical core. Convention: exp(-i omega t), outgoing h_n^(1),
   passive relative refractive index m = n + i kappa. All coordinates are kr. */
(function (root) {
  'use strict';
  const add=(a,b)=>[a[0]+b[0],a[1]+b[1]];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1]];
  const mul=(a,b)=>[a[0]*b[0]-a[1]*b[1],a[0]*b[1]+a[1]*b[0]];
  const scale=(a,s)=>[a[0]*s,a[1]*s];
  const div=(a,b)=>{const d=b[0]*b[0]+b[1]*b[1];return [(a[0]*b[0]+a[1]*b[1])/d,(a[1]*b[0]-a[0]*b[1])/d];};
  const abs2=a=>a[0]*a[0]+a[1]*a[1];
  const phase=t=>[Math.cos(t),Math.sin(t)];
  const nstop=x=>Math.ceil(x+4*Math.cbrt(x)+2);

  function radial(rho,N,outgoing=false) {
    const r=Math.max(1e-12,Math.abs(rho));
    const j=new Float64Array(N+1),y=new Float64Array(N+1);
    if(r<0.2) {
      let p=1;
      for(let n=0;n<=N;n++) {
        if(n) p*=r/(2*n+1);
        let term=1,sum=1;
        for(let k=1;k<=5;k++){term*=-r*r/(2*k*(2*n+2*k+1));sum+=term;}
        j[n]=p*sum;
      }
    } else if(r>N+8) {
      j[0]=Math.sin(r)/r;
      if(N) j[1]=j[0]/r-Math.cos(r)/r;
      for(let n=1;n<N;n++) j[n+1]=(2*n+1)/r*j[n]-j[n-1];
    } else {
      const L=Math.max(N+35,Math.ceil(r)+35);
      const v=new Float64Array(L+2);v[L]=1;
      for(let n=L;n>0;n--) {
        v[n-1]=(2*n+1)/r*v[n]-v[n+1];
        if(Math.abs(v[n-1])>1e180) for(let k=n-1;k<=L+1;k++) v[k]*=1e-180;
      }
      const a=Math.sin(r)/r,b=a/r-Math.cos(r)/r;
      const norm=Math.abs(a)>Math.abs(b)?a/v[0]:b/v[1];
      for(let n=0;n<=N;n++) j[n]=v[n]*norm;
    }
    if(outgoing) {
      y[0]=-Math.cos(r)/r;
      if(N)y[1]=y[0]/r-Math.sin(r)/r;
      for(let n=1;n<N;n++)y[n+1]=(2*n+1)/r*y[n]-y[n-1];
    }
    return {j,y};
  }

  function coefficients(x,m,N=nstop(x)) {
    if(m[0]===1&&m[1]===0){
      return {a:Array.from({length:N+1},()=>[0,0]),b:Array.from({length:N+1},()=>[0,0]),N,x,m,Qsca:0,Qext:0,g:0};
    }
    const z=scale(m,x),L=Math.max(N+60,Math.ceil(Math.hypot(...z))+60);
    const D=new Array(N+1);let d=[0,0];
    // Starting well beyond |mx| makes a zero seed converge under downward recursion.
    for(let n=L;n>=1;n--) {
      const nz=div([n,0],z);
      d=sub(nz,div([1,0],add(d,nz)));
      if(n-1<=N)D[n-1]=d;
    }
    const {j,y}=radial(x,N,true),a=new Array(N+1),b=new Array(N+1);
    a[0]=b[0]=[0,0];
    for(let n=1;n<=N;n++) {
      const psi=x*j[n],prev=x*j[n-1];
      const xi=[psi,x*y[n]],xip=[prev,x*y[n-1]];
      const da=add(div(D[n],m),[n/x,0]),db=add(mul(m,D[n]),[n/x,0]);
      a[n]=div(sub(scale(da,psi),[prev,0]),sub(mul(da,xi),xip));
      b[n]=div(sub(scale(db,psi),[prev,0]),sub(mul(db,xi),xip));
    }
    let sca=0,ext=0,gg=0;
    for(let n=1;n<=N;n++) {
      sca+=(2*n+1)*(abs2(a[n])+abs2(b[n]));
      ext+=(2*n+1)*(a[n][0]+b[n][0]);
      gg+=(2*n+1)/(n*(n+1))*(a[n][0]*b[n][0]+a[n][1]*b[n][1]);
      if(n<N)gg+=n*(n+2)/(n+1)*(a[n][0]*a[n+1][0]+a[n][1]*a[n+1][1]+b[n][0]*b[n+1][0]+b[n][1]*b[n+1][1]);
    }
    return {a,b,N,x,m,Qsca:2*sca/x**2,Qext:2*ext/x**2,g:sca?2*gg/sca:0};
  }

  function angular(mu,N) {
    const pi=new Float64Array(N+1),tau=new Float64Array(N+1);pi[1]=1;
    for(let n=1;n<=N;n++){
      tau[n]=n*mu*pi[n]-(n+1)*pi[n-1];
      if(n<N)pi[n+1]=((2*n+1)*mu*pi[n]-(n+1)*pi[n-1])/n;
    }
    return {pi,tau};
  }

  function amplitudes(c,mu,opts={}) {
    const N=Math.min(opts.N??c.N,c.N),{pi,tau}=angular(mu,N);
    let s1=[0,0],s2=[0,0];const terms=[];
    for(let n=1;n<=N;n++) {
      const w=opts.weights?.[n]||[1,0],f=(2*n+1)/(n*(n+1));
      const active=(!opts.solo||opts.solo===n);
      const a=opts.electric===false||!active?[0,0]:mul(c.a[n],w);
      const b=opts.magnetic===false||!active?[0,0]:mul(c.b[n],w);
      const t1=scale(add(scale(a,pi[n]),scale(b,tau[n])),f);
      const t2=scale(add(scale(a,tau[n]),scale(b,pi[n])),f);
      s1=add(s1,t1);s2=add(s2,t2);terms.push({n,s1:t1,s2:t2});
    }
    return {s1,s2,terms};
  }

  function intensity(c,theta,phi=0,opts={}) {
    const s=amplitudes(c,Math.cos(theta),opts),i1=abs2(s.s1),i2=abs2(s.s2);
    const delta=phi-(opts.angle||0);
    return opts.unpolarized?(i1+i2)/2:i2*Math.cos(delta)**2+i1*Math.sin(delta)**2;
  }

  function rotateVector(e,alpha){
    const c=Math.cos(alpha),s=Math.sin(alpha);
    return [c*e[0]-s*e[2],c*e[1]-s*e[3],s*e[0]+c*e[2],s*e[1]+c*e[3],e[4],e[5]];
  }
  const productVector=(z,e)=>[z[0]*e[0]-z[1]*e[1],z[0]*e[1]+z[1]*e[0],z[0]*e[2]-z[1]*e[3],z[0]*e[3]+z[1]*e[2],z[0]*e[4]-z[1]*e[5],z[0]*e[5]+z[1]*e[4]];
  const norm2=e=>e.reduce((s,v)=>s+v*v,0);
  function incident(point,angle=0){const z=point[2],c=Math.cos(angle),s=Math.sin(angle);return [c*Math.cos(z),c*Math.sin(z),s*Math.cos(z),s*Math.sin(z),0,0];}

  // Sum the actual electric vector spherical wave functions M_o1n and N_e1n.
  // j_n is regular at the origin; h_n^(1) represents outgoing scattered waves.
  function field(point,c,opts={}) {
    if(opts.angle){
      const ca=Math.cos(opts.angle),sa=Math.sin(opts.angle),q=[ca*point[0]+sa*point[1],-sa*point[0]+ca*point[1],point[2]];
      const out=field(q,c,{...opts,angle:0});out.e=rotateVector(out.e,opts.angle);
      if(out.vectorTerms){out.vectorTerms=out.vectorTerms.map(v=>rotateVector(v,opts.angle));out.terms=out.vectorTerms.map(v=>v.slice(0,2));}
      if(out.details)out.details=out.details.map(d=>({...d,electricBasis:rotateVector(d.electricBasis,opts.angle),magneticBasis:rotateVector(d.magneticBasis,opts.angle),electric:rotateVector(d.electric,opts.angle),magnetic:rotateVector(d.magnetic,opts.angle)}));
      return out;
    }
    const N=opts.N??c?.N??20;
    const rho=Math.max(1e-12,Math.hypot(...point));
    const mu=Math.max(-1,Math.min(1,point[2]/rho));
    const st=Math.sqrt(Math.max(0,1-mu*mu)),ph=Math.atan2(point[1],point[0]);
    const cp=Math.cos(ph),sp=Math.sin(ph),{pi,tau}=angular(mu,N);
    const outgoing=opts.kind!=='incident',{j,y}=radial(rho,N,outgoing);
    let rr=0,ri=0,tr=0,ti=0,pr=0,pii=0;const wantTerms=opts.terms||opts.details,terms=wantTerms?[]:null,vectorTerms=wantTerms?[]:null,details=opts.details?[]:null;
    const cart=(r,t,p)=>[st*cp*r[0]+mu*cp*t[0]-sp*p[0],st*cp*r[1]+mu*cp*t[1]-sp*p[1],st*sp*r[0]+mu*sp*t[0]+cp*p[0],st*sp*r[1]+mu*sp*t[1]+cp*p[1],mu*r[0]-st*t[0],mu*r[1]-st*t[1]];
    for(let n=1;n<=N;n++) {
      const active=!opts.solo||opts.solo===n;
      if(!active&&!details) {if(terms){terms.push([0,0]);vectorTerms.push([0,0,0,0,0,0]);}continue;}
      const f=(2*n+1)/(n*(n+1)),en=scale(phase(n*Math.PI/2),f);
      const w=opts.weights?.[n]||[1,0];
      const cm=mul(mul(en,outgoing?scale(c.b[n],-1):[1,0]),w);
      const cn=mul(mul(en,outgoing?[-c.a[n][1],c.a[n][0]]:[0,-1]),w);
      if(opts.electric===false||!active){cn[0]=0;cn[1]=0;}
      if(opts.magnetic===false||!active){cm[0]=0;cm[1]=0;}
      const zr=j[n],zi=outgoing?y[n]:0;
      const dr=j[n-1]-n*zr/rho,di=outgoing?y[n-1]-n*zi/rho:0;
      const mzr=cm[0]*zr-cm[1]*zi,mzi=cm[0]*zi+cm[1]*zr;
      const nzr=cn[0]*zr-cn[1]*zi,nzi=cn[0]*zi+cn[1]*zr;
      const ndr=cn[0]*dr-cn[1]*di,ndi=cn[0]*di+cn[1]*dr;
      const rf=n*(n+1)*st*cp*pi[n]/rho;
      const nr=rf*nzr,ni=rf*nzi;
      const nt=cp*(pi[n]*mzr+tau[n]*ndr),nti=cp*(pi[n]*mzi+tau[n]*ndi);
      const np=-sp*(tau[n]*mzr+pi[n]*ndr),npi=-sp*(tau[n]*mzi+pi[n]*ndi);
      rr+=nr;ri+=ni;tr+=nt;ti+=nti;pr+=np;pii+=npi;
      if(terms){
        const v=cart([nr,ni],[nt,nti],[np,npi]);vectorTerms.push(v);terms.push(v.slice(0,2));
        if(details){
          let magneticBasis=cart([0,0],[cp*pi[n]*zr,cp*pi[n]*zi],[-sp*tau[n]*zr,-sp*tau[n]*zi]);
          let electricBasis=cart([rf*zr,rf*zi],[cp*tau[n]*dr,cp*tau[n]*di],[-sp*pi[n]*dr,-sp*pi[n]*di]);
          if(!outgoing&&Math.hypot(...point)<1e-9){magneticBasis=[0,0,0,0,0,0];electricBasis=n===1?[2/3,0,0,0,0,0]:[0,0,0,0,0,0];}
          const electric=productVector(cn,electricBasis),magnetic=productVector(cm,magneticBasis);
          details.push({n,active,en,weight:w,a:outgoing?c.a[n]:null,b:outgoing?c.b[n]:null,radial:[zr,zi],pi:pi[n],tau:tau[n],electricCoefficient:cn,magneticCoefficient:cm,electricBasis,magneticBasis,electric,magnetic});
          vectorTerms[n-1]=electric.map((v,i)=>v+magnetic[i]);terms[n-1]=vectorTerms[n-1].slice(0,2);
        }
      }
    }
    const e=[st*cp*rr+mu*cp*tr-sp*pr,st*cp*ri+mu*cp*ti-sp*pii,
      st*sp*rr+mu*sp*tr+cp*pr,st*sp*ri+mu*sp*ti+cp*pii,
      mu*rr-st*tr,mu*ri-st*ti];
    // The limiting value at the origin avoids choosing a fictitious polar axis.
    if(!outgoing&&Math.hypot(...point)<1e-9) {
      const w=opts.weights?.[1]||[1,0],on=opts.electric!==false&&(!opts.solo||opts.solo===1);
      e.fill(0);if(on){e[0]=w[0];e[1]=w[1];}
    }
    return {e,terms,vectorTerms,details};
  }

  // Unpolarized illumination is an incoherent average of two independently
  // scattered incident polarizations. Incident/scattered interference is kept
  // within each channel, never between the orthogonal incident states.
  function sample(point,c,opts={}){
    const angles=opts.unpolarized?[0,Math.PI/2]:[opts.angle||0];
    const channels=angles.map(angle=>{
      const series=field(point,c,{...opts,angle,unpolarized:false});
      const inc=opts.includeIncident&&opts.kind!=='incident'?incident(point,angle):[0,0,0,0,0,0];
      const e=series.e.map((v,i)=>v+inc[i]);
      return {...series,angle,series:series.e,incident:inc,e};
    });
    const avg=f=>channels.reduce((s,ch)=>s+f(ch),0)/channels.length;
    return {channels,e:channels[0].e,intensity:avg(ch=>norm2(ch.e)),scatteredIntensity:avg(ch=>norm2(ch.series)),incidentIntensity:avg(ch=>norm2(ch.incident)),interference:avg(ch=>2*ch.series.reduce((s,v,i)=>s+v*ch.incident[i],0))};
  }

  function angularSeries(c,theta,phi,opts={}){
    const N=Math.min(opts.N??c.N,c.N),{pi,tau}=angular(Math.cos(theta),N);
    const angles=opts.unpolarized?[0,Math.PI/2]:[opts.angle||0];
    const channels=angles.map(angle=>{
      const cp=Math.cos(phi-angle),sp=Math.sin(phi-angle),details=[],e=[0,0,0,0,0,0];
      for(let n=1;n<=N;n++){
        const f=(2*n+1)/(n*(n+1)),w=opts.weights?.[n]||[1,0],active=!opts.solo||opts.solo===n;
        const cn=active&&opts.electric!==false?scale(mul(c.a[n],w),f):[0,0],cm=active&&opts.magnetic!==false?scale(mul(c.b[n],w),f):[0,0];
        const electricBasis=[tau[n]*cp,0,-pi[n]*sp,0,0,0],magneticBasis=[pi[n]*cp,0,-tau[n]*sp,0,0,0];
        const electric=productVector(cn,electricBasis),magnetic=productVector(cm,magneticBasis);
        electric.forEach((v,i)=>e[i]+=v+magnetic[i]);
        details.push({n,en:[f,0],weight:w,a:c.a[n],b:c.b[n],pi:pi[n],tau:tau[n],active,electricCoefficient:cn,magneticCoefficient:cm,electricBasis,magneticBasis,electric,magnetic});
      }
      return {angle,e,details,incident:[0,0,0,0,0,0],vectorTerms:details.map(d=>d.electric.map((v,i)=>v+d.magnetic[i]))};
    });
    return {channels,intensity:channels.reduce((s,ch)=>s+norm2(ch.e),0)/channels.length};
  }

  function efficiency(c,opts={}) {
    let q=0;
    for(let n=1;n<=Math.min(opts.N??c.N,c.N);n++) {
      if(opts.solo&&opts.solo!==n)continue;
      q+=(2*n+1)*abs2(opts.weights?.[n]||[1,0])*((opts.electric===false?0:abs2(c.a[n]))+(opts.magnetic===false?0:abs2(c.b[n])));
    }
    return 2*q/c.x**2;
  }

  const api={add,sub,mul,div,scale,abs2,phase,nstop,radial,coefficients,angular,amplitudes,intensity,field,efficiency,rotateVector,productVector,norm2,incident,sample,angularSeries};
  root.Mie=api;
  if(typeof module!=='undefined')module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);
