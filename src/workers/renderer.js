@@INCLUDE:src/solid-matrix.js@@
@@INCLUDE:src/model.js@@

(function(root){
 'use strict';
 const N=257,G=9.80665,cache=new Map(),propertySource='https://opg.optica.org/ao/abstract.cfm?uri=ao-52-1-a177';
 function parameters(p,s={}){
  const ethanol=p.med==='ethanol',air=p.med==='air',custom=s.wettingMode==='custom',flat=s.wettingMode==='flat'||air;
  const gamma=air?0:custom?s.surfaceTension:ethanol?22.39:72.8,rho=air?null:custom?s.solventDensity:ethanol?.789:.9982,angle=flat?90:custom?s.contactAngle:0;
  return {solvent:p.med,mode:s.wettingMode||'auto',surfaceTensionMnPerM:gamma,solventDensityGPerMl:rho,contactAngleDeg:angle,capillaryLengthMm:air?0:Math.sqrt(gamma/(rho*G)),gravityMPerS2:G,temperatureC:20,flat,assumedCustomSolvent:p.med==='custom'&&!custom,wettingAssumption:air?'Gas medium; no liquid meniscus':custom?'User-specified contact angle through the liquid':flat?'Flat interface':'Ideal complete wetting on clean glass or quartz; contact angle 0 degrees',propertySource,modelSource:'https://doi.org/10.1016/j.jcis.2015.08.071'};
 }
 function mean(values,radial){let sum=0;for(let i=0;i<N-1;i++){if(radial){const a=i/(N-1),b=(i+1)/(N-1);sum+=((2*a+b)*values[i]+(a+2*b)*values[i+1])/(3*(N-1));}else sum+=(values[i]+values[i+1])/(2*(N-1));}return sum;}
 function resample(xs,hs,half,radial,sign){const out=new Float64Array(N);let j=1;const end=xs.at(-1);for(let i=0;i<N;i++){const x=i/(N-1)*end;while(j<xs.length-1&&xs[j]<x)j++;const f=(x-xs[j-1])/Math.max(1e-30,xs[j]-xs[j-1]);out[i]=hs[j-1]+f*(hs[j]-hs[j-1]);}const centre=mean(out,radial);for(let i=0;i<N;i++)out[i]=sign*(out[i]-centre);return out;}
 function slit(half,lc,angle){
  const sign=Math.sign(Math.cos(angle*Math.PI/180)),psi=Math.abs(Math.PI/2-angle*Math.PI/180);if(psi<1e-10)return new Float64Array(N);
  const integrand=(a,u)=>lc*lc*Math.cos(a)/Math.sqrt(u*u+2*lc*lc*(1-Math.cos(a)));
  function width(u){let sum=0;const K=512;for(let i=0;i<=K;i++)sum+=(i===0||i===K?1:i%2?4:2)*integrand(psi*i/K,u);return sum*psi/(3*K);}
  let lo=lc*1e-9,hi=lc+2*lc*lc/half;while(width(hi)>half)hi*=2;for(let i=0;i<64;i++){const mid=(lo+hi)/2;if(width(mid)>half)lo=mid;else hi=mid;}const u=(lo+hi)/2,K=2048,xs=[0],hs=[0];let x=0,prev=integrand(0,u);
  for(let i=1;i<=K;i++){const a=psi*i/K,v=integrand(a,u);x+=(prev+v)*psi/(2*K);prev=v;const c=2*lc*lc*(1-Math.cos(a));xs.push(x);hs.push(c/(Math.sqrt(u*u+c)+u));}return resample(xs,hs,half,false,sign);
 }
 function cylinder(radius,lc,angle){
  const sign=Math.sign(Math.cos(angle*Math.PI/180)),psi=Math.abs(Math.PI/2-angle*Math.PI/180);if(psi<1e-10)return new Float64Array(N);
  // For very wide vessels the opposite wall is exponentially remote. Use the
  // exact single-wall gravity/capillary profile instead of ill-conditioned
  // shooting from an almost perfectly flat centre.
  if(radius/lc>8){const xs=[],hs=[],K=4096,first=1e-7,F=a=>Math.log(Math.tan(a/4))+2*Math.cos(a/2),edge=F(psi);for(let i=0;i<=K;i++){const a=first*Math.exp(Math.log(psi/first)*i/K);xs.push(radius-lc*(edge-F(a)));hs.push(2*lc*Math.sin(a/2));}const out=new Float64Array(N);let j=1;for(let i=0;i<N;i++){const r=radius*i/(N-1);while(j<xs.length-1&&xs[j]<r)j++;const f=Math.max(0,Math.min(1,(r-xs[j-1])/Math.max(1e-30,xs[j]-xs[j-1])));out[i]=hs[j-1]+f*(hs[j]-hs[j-1]);}const avg=mean(out,true);for(let i=0;i<N;i++)out[i]=sign*(out[i]-avg);return out;}
  function integrate(u0,K,keep=false){let r=0,u=u0;const xs=[0],hs=[0],step=psi/K;
   const f=(a,r,u)=>{const den=r<1e-12?u/(2*lc*lc):u/(lc*lc)-Math.sin(a)/r,q=Math.max(1e-14,den);return [Math.cos(a)/q,Math.sin(a)/q];};
   for(let i=0;i<K;i++){const a=i*step,k1=f(a,r,u),k2=f(a+step/2,r+step*k1[0]/2,u+step*k1[1]/2),k3=f(a+step/2,r+step*k2[0]/2,u+step*k2[1]/2),k4=f(a+step,r+step*k3[0],u+step*k3[1]);r+=step*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6;u+=step*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6;if(keep){xs.push(r);hs.push(u-u0);}}return keep?{r,xs,hs}:r;
  }
  let lo=lc*1e-7,hi=lc+4*lc*lc/radius;while(integrate(hi,512)>radius)hi*=2;for(let i=0;i<56;i++){const mid=(lo+hi)/2;if(integrate(mid,512)>radius)lo=mid;else hi=mid;}const result=integrate((lo+hi)/2,2048,true);return resample(result.xs,result.hs,radius,true,sign);
 }
 function profile(p,s={}){
  const params=parameters(p,s),cu=s.container==='cuvette1'||s.container==='cuvette10',diameter=cu?10:s.diameter||10,path=s.container==='cuvette1'?1:10,key=JSON.stringify([params,cu,path,diameter]);if(cache.has(key))return cache.get(key);
  const a=cu?4.75:diameter/2,b=cu?path/2:0,base=cu?3.9542105:2.025,x=params.flat?new Float64Array(N):cu?slit(a,params.capillaryLengthMm,params.contactAngleDeg):cylinder(a,params.capillaryLengthMm,params.contactAngleDeg),z=cu&&!params.flat?slit(b,params.capillaryLengthMm,params.contactAngleDeg):new Float64Array(N);
  let low=(Math.min(...x)+Math.min(...z))/diameter,high=(Math.max(...x)+Math.max(...z))/diameter,scale=1;const ceiling=cu?4.57:2.395,floor=cu?.40:.40;
  if(high>0)scale=Math.min(scale,(ceiling-base)/high);if(low<0)scale=Math.min(scale,(base-floor)/(-low));const data=new Float32Array(N*2);for(let i=0;i<N;i++){data[i]=x[i]/diameter*scale;data[N+i]=z[i]/diameter*scale;}low*=scale;high*=scale;
  const result={data,width:N,base,range:[base+low,base+high],sign:params.flat||Math.abs(params.contactAngleDeg-90)<1e-8?0:Math.sign(90-params.contactAngleDeg),extent:[cu?.475:.5,cu?path/20:.5],metadata:{...params,geometry:cu?'rectangular cuvette':'cylindrical vial',model:cu?'Sum of two perpendicular Young–Laplace slit solutions with gravity; mean liquid volume retained; corner films not resolved':'Axisymmetric Young–Laplace solution with gravity and contact-angle boundary; wide-radius single-wall limit above 8 capillary lengths',profileNodes:N,amplitudeScale:scale,rimLimited:scale<.999999,meanLiquidHeightSceneUnits:base,sceneUnitMm:diameter,heightRangeMm:[(base+low)*diameter,(base+high)*diameter]}};
  if(cache.size>=64)cache.delete(cache.keys().next().value);cache.set(key,result);return result;
 }
 root.MieWetting={parameters,profile,slit,cylinder,mean,N};
})(globalThis);

(function(root){
 'use strict';
 function pose(s){const a=(s.sideAzimuth||0)*Math.PI/180,r=s.lighting==='side-white'?3.5:1.25;return {normal:[-Math.cos(a),0,Math.sin(a)],tangent:[Math.sin(a),0,Math.cos(a)],centre:[-r*Math.cos(a),s.lighting==='side-white'?4.4:2.45,r*Math.sin(a)],width:s.lighting==='side-white'?.90:.70,height:s.lighting==='side-white'?.85:.80};}
 function table(coefficients,phi,weights){const data=new Float32Array(768*4),ppm=phi*1e6;for(let j=0;j<768;j++){const L=8*j/767,rgb=[0,0,0];for(let k=0;k<41;k++){const t=Math.exp(-ppm*(coefficients[k*4]+coefficients[k*4+1])*L);for(let c=0;c<3;c++)rgb[c]+=weights[k*4+c]*t;}data.set([...rgb,1],j*4);}return data;}
 function chord(o,d,bottom,top,radius,half,container,limit=100){let lo=0,hi=limit;if(Math.abs(d[1])<1e-8){if(o[1]<bottom||o[1]>top)return 0;}else{const a=(bottom-o[1])/d[1],b=(top-o[1])/d[1];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}
  if(container==='vial'){const a=d[0]**2+d[2]**2,b=o[0]*d[0]+o[2]*d[2],c=o[0]**2+o[2]**2-radius**2;if(a<1e-12){if(c>0)return 0;}else{const delta=b*b-a*c;if(delta<0)return 0;lo=Math.max(lo,(-b-Math.sqrt(delta))/a);hi=Math.min(hi,(-b+Math.sqrt(delta))/a);}}
  else for(let k=0;k<2;k++){const i=k?2:0,h=half[k];if(Math.abs(d[i])<1e-8){if(Math.abs(o[i])>h)return 0;}else{const a=(-h-o[i])/d[i],b=(h-o[i])/d[i];lo=Math.max(lo,Math.min(a,b));hi=Math.min(hi,Math.max(a,b));}}
  return Math.max(0,hi-lo);
 }
 function projected(s,point,k,light=pose(s)){const reverse=((k&1)<<5)|((k&2)<<3)|((k&4)<<1)|((k&8)>>1)|((k&16)>>3)|((k&32)>>5),u=((reverse+.5)/64*2-1)*light.width,v=((k+.5)/64*2-1)*light.height,lamp=light.centre.map((x,i)=>x+u*light.tangent[i]+(i===1?v:0)),delta=lamp.map((x,i)=>x-point[i]),length=Math.hypot(...delta),worldD=delta.map(x=>x/length),c=Math.cos(s.yaw||0),sn=Math.sin(s.yaw||0),local=p=>[c*p[0]+sn*p[2],p[1],-sn*p[0]+c*p[2]],o=local(point),d=local(worldD),vial=s.container==='vial',cap=vial?chord(o,d,2.95,3.46,.57,[0,0],s.container,length):0,path=chord(o,d,.315,vial?2.15:3.9542,.5,[.5,s.container==='cuvette1'?.05:.5],s.container,length),glass=chord(o,d,.12,vial?2.95:4.62,.545,[.625,s.container==='cuvette1'?.175:.625],s.container,length),irradiance=Math.max(0,worldD[1])*Math.abs(worldD[0]*light.normal[0]+worldD[2]*light.normal[2])/(length*length);return [path,cap>1e-6?0:glass>1e-6?.92:1,irradiance];}
 function factor(s,point,data,white){if(!data)return [1,1,1];const light=pose(s),sum=[0,0,0];let total=0;for(let k=0;k<64;k++){const p=projected(s,point,k,light),L=p[0]*(s.container==='vial'?s.diameter/10:1),f=Math.max(0,Math.min(1,L/8))*767,i=Math.floor(f),u=f-i;for(let c=0;c<3;c++)sum[c]+=p[2]*p[1]*(data[i*4+c]*(1-u)+data[Math.min(767,i+1)*4+c]*u);total+=p[2];}const direct=.82*s.gain,normal=.18+direct;return sum.map((x,c)=>(.18+direct*x/Math.max(1e-20,total)/Math.max(1e-6,white[c]))/normal);}
 function metadata(){return {model:'Finite rectangular side source with 64 Hammersley quadrature samples; straight projected paths through the liquid cross-section',liquid:'Beer–Lambert extinction integrated over all 41 optical wavelengths and the chosen illuminant',fillFraction:.18,glassTransmission:.92,receiverExtent:'No artificial radial cutoff; paths stop at the finite lamp',limitations:'Illustrative direct-transmission projection. Refraction focusing, floor caustics, scattered illumination of the floor and chromatic wall interreflection are not computed.'};}
 root.MieShadow={pose,table,chord,projected,factor,metadata};
})(globalThis);

(function(root){
 'use strict';
 const floor=.1199,bend=-1.70,radius=3,blend=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);},srgb=x=>x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055;
 function source(s){return s.lighting==='back'?1:s.lighting==='side'?Math.exp((1/Math.sqrt(1+.65*.65)-1)/(.18*.18)):0;}
 function material(s,up,beam=source(s)){const f=blend(up);if(s.lighting==='side-white')return .84*(1-f)+(.136+.619*s.gain)*f;if(s.lighting==='room')return .014*(1-f)+(.027+.018*s.gain)*f;if(s.lighting==='back')return (.06+.80*beam+.02*s.gain)*(1-.20*f);return (.014+beam)*(1-f)+(.027+.024*s.gain)*f;}
 function surface(o,d){let nearest=Infinity,normal=[0,0,1];
  if(d[1]<-1e-7){const t=(floor-o[1])/d[1];if(t>0&&o[2]+t*d[2]>=bend){nearest=t;normal=[0,1,0];}}
  const cy=floor+radius,qy=o[1]-cy,qz=o[2]-bend,a=d[1]**2+d[2]**2,b=qy*d[1]+qz*d[2],c=qy*qy+qz*qz-radius*radius,delta=b*b-a*c;
  if(a>1e-8&&delta>=0)for(const t of [(-b-Math.sqrt(delta))/a,(-b+Math.sqrt(delta))/a]){const y=o[1]+t*d[1],z=o[2]+t*d[2];if(t>0&&t<nearest&&z<=bend+1e-6&&z>=bend-radius-1e-6&&y>=floor-1e-6&&y<=cy+1e-6){nearest=t;normal=[0,(cy-y)/radius,(bend-z)/radius];}}
  if(d[2]<-1e-7){const t=(bend-radius-o[2])/d[2];if(t>0&&t<nearest&&o[1]+t*d[1]>=cy){nearest=t;normal=[0,0,1];}}
  return Number.isFinite(nearest)?{point:o.map((v,i)=>v+nearest*d[i]),normal}:null;
 }
 function ray(s,x,y,viewScale){const angle=Math.max(s.pitch,.10),scale=viewScale??(s.container==='vial'?3.90:5.18),view=s.container==='vial'?1.76:2.39,centre=floor+(view-floor)*Math.cos(s.pitch)/Math.cos(angle);const origin=[scale*x,centre+12*Math.sin(angle)+scale*y*Math.cos(angle),12*Math.cos(angle)-scale*y*Math.sin(angle)],direction=[0,-Math.sin(angle),-Math.cos(angle)],shift=Math.max(0,(floor+.5-origin[1])/(-direction[1]));return {origin:origin.map((v,i)=>v-direction[i]*shift),direction};}
 function footprint(x,z,s){if(s.container==='vial')return Math.hypot(x,z)-.545;const qx=Math.abs(x)-.600,qz=Math.abs(z)-(s.container==='cuvette1'?.150:.600);return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-.025;}
 function shadow(x,z,s){const c=Math.cos(s.yaw||0),sn=Math.sin(s.yaw||0),qx=c*x+sn*z,qz=-sn*x+c*z;if(Math.hypot(qx,qz)>2.65)return 1;const contact=.38*Math.exp(-((Math.max(footprint(qx,qz,s),0)/.085)**2)),cast=s.lighting.startsWith('side')?[.98*Math.cos((s.sideAzimuth||0)*Math.PI/180),-.98*Math.sin((s.sideAzimuth||0)*Math.PI/180)-.08]:s.lighting==='back'?[0,.38]:[.38,-.64],t=Math.max(0,Math.min(1,(qx*cast[0]+qz*cast[1])/(cast[0]**2+cast[1]**2))),distance=Math.max(footprint(qx-t*cast[0],qz-t*cast[1],s),0),soft=(s.lighting==='back'?.12:.19)*(1-.45*t)*Math.exp(-((distance/(.12+.14*t))**2));return (1-contact)*(s.lighting==='side-white'?1:1-soft);}
 function scanline(s,y,viewScale){const r=ray(s,0,y,viewScale),hit=surface(r.origin,r.direction);return hit?{...hit,value:material(s,hit.normal[1])}:{point:[0,0,1e9],normal:[0,0,1],value:material(s,0)};}
 function linearPixel(s,line,x,centres,scale,fade=1){let sh=1;if(Math.abs(line.point[2])<2.65&&line.normal[1]>0)for(const centre of centres){const q=(x-centre)*scale;if(Math.abs(q)<2.65)sh*=shadow(q,line.point[2],s);}sh=1+(sh-1)*Math.max(0,line.normal[1])**6;return material(s,0)*(1-fade)+line.value*sh*fade;}
 function pixel(s,...args){return srgb(linearPixel(s,...args));}
 const white=s=>root.MieIlluminants?root.MieIlluminants.profile(s.illuminant||'D65',s.whiteBalance||'source').whiteRGB:[1,1,1];
 const colour=(light,tint)=>tint.map(v=>srgb(Math.max(0,Math.min(1,light*v))));
 async function paint(ctx,l,s,count,tables=[]){
  const tint=white(s),bg=colour(material(s,0),tint).map(v=>Math.round(255*v));ctx.fillStyle=`rgb(${bg.join(',')})`;ctx.fillRect(0,0,l.width,l.height);
  const viewScale=Math.max(s.container==='vial'?3.90:5.18,1.55*l.tileHeight/l.tileWidth),scale=viewScale/l.tileHeight;
  for(let row=0;row<l.rows;row++){
   const top=Math.round(((l.topPadding??.35)+row*(l.rowStep??2.10))*l.scale),bottom=Math.min(l.height,Math.round(((l.topPadding??.35)+(row+1)*(l.rowStep??2.10))*l.scale)),height=bottom-top;
   const strip=document.createElement('canvas');strip.width=1;strip.height=height;const stripCtx=strip.getContext('2d'),pixels=stripCtx.createImageData(1,height),lines=[],centres=[];
   for(let col=0;col<l.cols&&row*l.cols+col<count;col++)centres.push(Math.round(((l.marginX??.06)+col*(l.columnStep||1))*l.scale)+l.tileWidth/2);
   for(let y=0;y<height;y++){const py=top+y+.5,line=scanline(s,.5-(py-top)/l.tileHeight,viewScale),fade=py<=top+l.tileHeight?1:blend((bottom-py)/Math.max(1,bottom-top-l.tileHeight));lines.push({line,fade});const rgb=colour(linearPixel(s,line,0,[],scale,fade),tint).map(v=>Math.round(255*v));pixels.data.set([...rgb,255],y*4);}
   stripCtx.putImageData(pixels,0,0);ctx.drawImage(strip,0,top,l.width,height);
   const active=lines.map(({line,fade},y)=>(s.lighting==='side-white'||Math.abs(line.point[2])<=2.65)&&line.normal[1]>0&&fade>0?y:-1).filter(y=>y>=0),first=active[0]??0,last=active.at(-1)??0,shadeHeight=last-first+1;const shade=document.createElement('canvas');shade.width=l.width;shade.height=shadeHeight;const shadeCtx=shade.getContext('2d'),data=shadeCtx.createImageData(l.width,shadeHeight);
   for(let y=first;y<=last;y++){if(s.lighting==='side-white'&&y%16===0)await new Promise(requestAnimationFrame);const {line,fade}=lines[y];if((s.lighting!=='side-white'&&Math.abs(line.point[2])>2.65)||line.normal[1]<=0||fade<=0)continue;const clear=linearPixel(s,line,0,[],scale,fade);for(let x=0;x<l.width;x++){const light=linearPixel(s,line,x+.5,centres,scale,fade);if(s.lighting==='side-white'){let factor=[1,1,1];for(let j=0;j<centres.length;j++){const q=(x+.5-centres[j])*scale;{const f=MieShadow.factor(s,[q,line.point[1],line.point[2]],tables[row*l.cols+j],tint),a=Math.max(0,line.normal[1])**2;factor=factor.map((v,k)=>v*(1+(f[k]-1)*a));}}const rgb=tint.map((v,k)=>srgb(Math.max(0,Math.min(1,(material(s,0)*(1-fade)+line.value*(light-material(s,0)*(1-fade))/Math.max(1e-20,line.value)*factor[k])*v))));data.data.set([...rgb.map(v=>Math.round(255*v)),255],((y-first)*l.width+x)*4);}else if(light<clear-1e-10)data.data.set([...colour(light,tint).map(v=>Math.round(255*v)),255],((y-first)*l.width+x)*4);}}
   shadeCtx.putImageData(data,0,0);ctx.drawImage(shade,0,top+first);strip.width=strip.height=shade.width=shade.height=1;
   await new Promise(requestAnimationFrame);
  }
 }
 function metadata(){return {surface:'Matte seamless cyclorama: floor, tangent quarter-cylinder and vertical backdrop',floorHeightSceneUnits:floor,bendStartSceneUnits:bend,bendRadiusSceneUnits:radius,shadows:'Analytic footprint contact and soft cast shadows; adjacent columns included',backdropMinimumPitchRadians:.10,normalCuvetteViewPreserved:true,lighting:{back:{model:'Broad, approximately Lambertian rear diffuser with restrained room fill',onAxisRadianceAtDefaultGain:.88,floorToBackdropRatio:.80,angularPlateauCosine:.45,angularCutoffCosine:.10},room:'Frontal diffuse illumination and strip softboxes, dark camera opening, charcoal sweep',side:'Finite side softbox plus a rear transmission source, charcoal sweep', 'side-white':'Finite adjustable side softbox, pale illuminated sweep, and approximate spectrally transmitted floor shadow'},limitations:'Illustrative exposure and diffuse studio sweep, not a calibrated photograph; no floor caustics or full scene interreflection. Caption gaps fade back to the backdrop tone.'};}
 root.MieStudio={floor,bend,radius,source,material,surface,ray,shadow,scanline,linearPixel,pixel,paint,metadata,backgroundRGB:s=>colour(material(s,0),white(s)),background:s=>srgb(material(s,0)),blend,srgb};
})(globalThis);

/* Sobol direction numbers: first 64 dimensions from the SciPy distribution.
https://github.com/scipy/scipy/blob/main/scipy/stats/_sobol_direction_numbers.npz
Copyright (c) 2001-2002 Enthought, Inc. 2003, SciPy Developers.
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:

1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above
   copyright notice, this list of conditions and the following
   disclaimer in the documentation and/or other materials provided
   with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived
   from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

*/
(function(root){
 const directions=[[2147483648,1073741824,536870912,268435456,134217728,67108864,33554432,16777216,8388608,4194304],[2147483648,3221225472,2684354560,4026531840,2281701376,3422552064,2852126720,4278190080,2155872256,3233808384],[2147483648,3221225472,1610612736,2415919104,3892314112,1543503872,2382364672,3305111552,1753219072,2629828608],[2147483648,3221225472,536870912,1342177280,4160749568,1946157056,2717908992,2466250752,3632267264,624951296],[2147483648,1073741824,536870912,2952790016,4160749568,3690987520,2046820352,2634022912,1518338048,801112064],[2147483648,1073741824,1610612736,805306368,3355443200,603979776,1442840576,4211081216,3766484992,1883242496],[2147483648,3221225472,2684354560,3489660928,1476395008,2483027968,1040187392,3808428032,3196059648,599785472],[2147483648,1073741824,2684354560,1342177280,2281701376,603979776,301989888,754974720,1988100096,2654994432],[2147483648,1073741824,2684354560,1342177280,671088640,3556769792,1778384896,1895825408,947912704,1480589312],[2147483648,1073741824,3758096384,2952790016,2550136832,2483027968,2315255808,1526726656,864026624,3653238784],[2147483648,1073741824,2684354560,268435456,134217728,1811939328,2650800128,587202560,1468006400,2915041280],[2147483648,1073741824,536870912,805306368,1476395008,2885681152,2516582400,721420288,3565158400,155189248],[2147483648,3221225472,2684354560,1342177280,4160749568,2348810240,3791650816,855638016,260046848,557842432],[2147483648,3221225472,1610612736,2415919104,939524096,3288334336,1107296256,2734686208,4051697664,2856321024],[2147483648,1073741824,536870912,4026531840,2818572288,1409286144,2583691264,2634022912,511705088,1556086784],[2147483648,3221225472,536870912,3489660928,3623878656,3288334336,1174405120,2231369728,2776629248,1992294400],[2147483648,1073741824,536870912,4026531840,939524096,335544320,4127195136,1728053248,2407530496,1346371584],[2147483648,3221225472,536870912,4026531840,1744830464,1677721600,905969664,1828716544,1098907648,3762290688],[2147483648,1073741824,2684354560,1342177280,2550136832,4093640704,2919235584,3137339392,3883925504,2512388096],[2147483648,3221225472,3758096384,2952790016,3087007744,1006632960,3456106496,1090519040,562036736,1371537408],[2147483648,3221225472,3758096384,3489660928,1744830464,1006632960,2315255808,1358954496,2843738112,3720347648],[2147483648,1073741824,1610612736,3489660928,939524096,2348810240,2113929216,1895825408,3363831808,79691776],[2147483648,3221225472,2684354560,2415919104,134217728,1677721600,1778384896,2298478592,2776629248,3409969152],[2147483648,3221225472,536870912,3489660928,1207959552,2348810240,3590324224,956301312,3581935616,843055104],[2147483648,3221225472,536870912,1342177280,3623878656,4093640704,1040187392,2499805184,2407530496,1027604480],[2147483648,1073741824,2684354560,2952790016,2550136832,2751463424,2046820352,3573547008,41943040,1614807040],[2147483648,3221225472,2684354560,805306368,402653184,872415232,2315255808,2634022912,1736441856,2185232384],[2147483648,1073741824,3758096384,3489660928,134217728,1275068416,33554432,3036676096,914358272,3267362816],[2147483648,3221225472,3758096384,1342177280,1744830464,1275068416,1979711488,4143972352,914358272,3611295744],[2147483648,1073741824,1610612736,2415919104,3355443200,1946157056,1375731712,50331648,3951034368,1866465280],[2147483648,3221225472,2684354560,3489660928,3087007744,67108864,1845493760,2533359616,4068474880,3988783104],[2147483648,3221225472,3758096384,805306368,1744830464,3959422976,570425344,721420288,914358272,2638217216],[2147483648,3221225472,536870912,805306368,671088640,3556769792,2315255808,4278190080,2222981120,1941962752],[2147483648,1073741824,2684354560,1342177280,3087007744,2214592512,436207616,2936012800,3179282432,3753902080],[2147483648,1073741824,3758096384,1879048192,134217728,4093640704,4127195136,2332033024,3380609024,1430257664],[2147483648,1073741824,3758096384,2415919104,1744830464,4093640704,1644167168,3741319168,2038431744,3711959040],[2147483648,3221225472,1610612736,1342177280,402653184,3690987520,1107296256,922746880,545259520,4047503360],[2147483648,3221225472,536870912,4026531840,4160749568,872415232,1644167168,4110417920,2826960896,4240441344],[2147483648,3221225472,2684354560,4026531840,4160749568,3959422976,2113929216,1627389952,1551892480,3871342592],[2147483648,3221225472,536870912,2952790016,1476395008,738197504,2583691264,4177526784,1015021568,2998927360],[2147483648,3221225472,536870912,2952790016,3623878656,2885681152,2382364672,150994944,2659188736,2713714688],[2147483648,1073741824,3758096384,4026531840,2818572288,738197504,2717908992,754974720,3665821696,4181721088],[2147483648,3221225472,3758096384,805306368,3355443200,2080374784,2181038080,1325400064,3196059648,3988783104],[2147483648,3221225472,536870912,268435456,2550136832,738197504,100663296,3439329280,2323644416,465567744],[2147483648,1073741824,2684354560,2415919104,2550136832,1409286144,973078528,2634022912,2122317824,2134900736],[2147483648,3221225472,3758096384,2952790016,134217728,2214592512,2986344448,3103784960,3196059648,1337982976],[2147483648,3221225472,1610612736,805306368,2013265920,603979776,2650800128,1191182336,1736441856,4148166656],[2147483648,3221225472,3758096384,2952790016,2013265920,2617245696,3992977408,452984832,3414163456,3275751424],[2147483648,1073741824,1610612736,268435456,1476395008,2080374784,3254779904,3774873600,226492416,3619684352],[2147483648,1073741824,536870912,805306368,3087007744,2885681152,1912602624,2969567232,58720256,3535798272],[2147483648,3221225472,3758096384,1879048192,2281701376,1140850688,1241513984,1191182336,3716153344,1111490560],[2147483648,3221225472,536870912,1342177280,3623878656,4227858432,4127195136,3573547008,3212836864,742391808],[2147483648,1073741824,1610612736,1342177280,1476395008,2885681152,1778384896,2231369728,4219469824,2831155200],[2147483648,3221225472,2684354560,1342177280,3892314112,1140850688,1577058304,2902458368,4018143232,1749024768],[2147483648,3221225472,1610612736,2952790016,402653184,67108864,3657433088,150994944,578813952,3896508416],[2147483648,1073741824,536870912,1342177280,2281701376,2617245696,771751936,83886080,2877292544,473956352],[2147483648,3221225472,536870912,1342177280,3355443200,1006632960,1040187392,1728053248,4185915392,3426746368],[2147483648,1073741824,536870912,2952790016,1476395008,1140850688,2113929216,1761607680,1535115264,3695181824],[2147483648,1073741824,2684354560,2952790016,1207959552,1946157056,3254779904,3875536896,3045064704,3124756480],[2147483648,1073741824,2684354560,4026531840,2550136832,3019898880,1375731712,117440512,3212836864,1514143744],[2147483648,3221225472,3758096384,1879048192,4160749568,1275068416,2785017856,2298478592,1853882368,440401920],[2147483648,1073741824,536870912,805306368,3087007744,1006632960,3724541952,3741319168,696254464,843055104],[2147483648,1073741824,2684354560,3489660928,4160749568,1006632960,1845493760,419430400,1350565888,3393191936],[2147483648,1073741824,1610612736,3489660928,3355443200,3154116608,1308622848,1459617792,2155872256,171966464]],count=1024,dimensions=64;let cached;
 function data(){if(cached)return cached;cached=new Uint32Array(count*dimensions);for(let d=0;d<dimensions;d++)for(let n=0;n<count;n++){let gray=n^(n>>>1),v=0;for(let b=0;b<10;b++)if((gray>>>b)&1)v^=directions[d][b];cached[d*count+n]=v>>>0;}return cached;}
 root.MieSobol={directions,count,dimensions,data};
})(globalThis);

(function(root){
 'use strict';
 const image=null,ready=Promise.resolve(null);
 function dimensions(settings,particle=null){const cu=settings.container!=='vial',unit=cu?1:10/settings.diameter,oldHeight=.9*(cu?4.5:3.34),anchorY=(1004-605)/801-.5,bottom=(cu?2.39:1.76)-anchorY*.9*oldHeight-oldHeight/2,wet=cu&&particle?MieWetting.profile(particle,settings):null,ceiling=cu?(wet?wet.range[0]:3.9542105)-.06:2.91,height=.85*Math.max(.5,ceiling-bottom),top=bottom+height,width=height*2098/801,centreX=-((1179-203)/2098-.5)*.9*width;return {width,height,bottom,top,centreX,centreY:(bottom+top)/2,thickness:.04*unit,unit};}
 function scale(settings,aspect){return Math.max(settings.container==='vial'?3.9:5.18,1.55/aspect);}
 function metadata(settings={container:'vial',diameter:10},particle=null){const d=dimensions(settings,particle),mm=settings.container==='vial'?settings.diameter:10;return {widthMm:d.width*mm,heightMm:d.height*mm,thicknessMm:.4,lowerEdgeMm:d.bottom*mm,upperEdgeMm:d.top*mm,upperEdgeReference:'Reduced by 15% from the below-meniscus/cap card, with its lower edge fixed',scaleRelativeToPrevious:.85,logoMarginFraction:.05,cornerRadiusFractionOfHeight:.08,material:'Matte white card with stylistically rounded corners',logo:'User-supplied FAU dark-blue JPEG',logoSha256:'e4ce14180ddd2cda4c5d94e95d47be9bbae409902385a2f3caf59e5c8d5102c9',logoInkBoundsPixels:[203,203,2301,1004],logoAnchorPixels:[1179,605],alignment:'A horizontally centred behind the sample; original sample position and camera scale retained',optics:'Refracted, spectrally attenuated ballistic paths plus multiply scattered radiance. The opaque card occludes rear sources.',colourLimitation:'Printed reflectance is a smooth nonnegative RGB-derived spectral approximation; no measured paper or ink reflectance was supplied.'};}
 root.MieCard={image,ready,dimensions,scale,metadata};
})(globalThis);

@@INCLUDE:src/renderer.js@@
@@INCLUDE:src/paint-renderer.js@@
@@INCLUDE:src/fau-logo.js@@
@@INCLUDE:src/seidel-data.js@@
@@INCLUDE:src/monolith-data.js@@
@@INCLUDE:src/seidel-kernel.js@@
@@INCLUDE:src/solid-mixture.js@@
@@INCLUDE:src/seidel-renderer.js@@

// This module is assembled with the same final renderer and GLSL as the app.
// Only the canvas, message boundary and frame scheduling differ.
let activeProfile=null,renderer=null,canvas=null;
globalThis.MieIlluminants={profile:()=>activeProfile};
globalThis.requestAnimationFrame=callback=>setTimeout(()=>callback(performance.now()),8);
self.onmessage=e=>{
 const d=e.data;
 try{
  if(d.type==='init'){
   activeProfile=d.profile;MieCard.ready=Promise.resolve(d.logo);canvas=new OffscreenCanvas(d.options.fixedSize.width,d.options.fixedSize.height);
   if(!canvas.getContext('webgl2',{alpha:d.options.transparentBackground,antialias:false,preserveDrawingBuffer:true}))return postMessage({type:'unsupported'});
   renderer=new MieLightboxRenderer(canvas,d.options);postMessage({type:'ready'});
  }else if(d.type==='render'){
   activeProfile=d.profile;const sample=d.sample,jobs=new Map([[MieLightboxModel.key(sample,d.settings),{data:d.optics}]]);
   renderer.onError=message=>postMessage({type:'error',message});renderer.onProgress=p=>{postMessage({type:'progress',fraction:p.fraction,preparing:p.preparing});if(d.draft?p.ready>0&&!renderer.fence&&!renderer.reconcileNeeded:p.finished){renderer.pause();renderer.compose();renderer.gl.finish();const v=renderer.views.get(sample.id),record={w:v.w,h:v.h,sw:v.sw,sh:v.sh,passes:v.passes,beautyReady:v.beautyReady,draft:!!d.draft,wetting:{metadata:v.wetting.metadata}},image=canvas.transferToImageBitmap();postMessage({type:'image',id:sample.id,image,record},[image]);}};
   renderer.previewOnly=!!d.draft;renderer.maximum=d.passes;renderer.setSettings(d.settings);renderer.setSamples([sample],jobs);renderer.resume();
  }
 }catch(error){postMessage({type:'error',message:error.message||String(error)});}
};
