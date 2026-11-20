(function(root){
 'use strict';
 const vertex=`#version 300 es
layout(location=0) in vec2 position;out vec2 uv;
void main(){uv=position*.5+.5;gl_Position=vec4(position,0.,1.);}
`,geometry=`precision highp float;
precision highp int;
const float PI=3.141592653589793;
const float EPS=.00001;
const float INF=1e8;
uniform vec2 size;
uniform vec4 scatterWindow;
uniform float yaw,pitch,diameter,lightGain,liquidIndex;
uniform float viewZoom,viewHeight;
uniform int lighting;
uniform int containerType,mattWalls,hasLiquidSurface;
uniform int audit;
uniform int profileSteps,profileRefinements,profileCount,interfaceBudget,scatterBudget,spectralLanes,edgeSamples,vialCount;
uniform sampler2D transmission,coefficients,phaseTexture,phaseDensity,colourWeights;
uniform sampler2D meniscusProfile;
uniform vec2 meniscusExtent,meniscusRange;
uniform float meniscusBase,meniscusSign;
const float STUDIO_FLOOR=.1199;
const float STUDIO_BEND=-1.70;
const float STUDIO_RADIUS=3.0;
uniform float sideAzimuth;
vec3 sideLampNormal(){return vec3(-cos(sideAzimuth),0,sin(sideAzimuth));}
vec3 sideLampTangent(){return vec3(sin(sideAzimuth),0,cos(sideAzimuth));}
vec3 sideLampCentre(){return sideLampNormal()*(lighting==3?3.5:1.25)+vec3(0,lighting==3?4.4:2.45,0);}
float sideLampWidth(){return lighting==3?.90:.70;}
float sideLampHeight(){return lighting==3?.85:.80;}
float sideLampGeometricPdf(vec3 o,vec3 d){vec3 n=sideLampNormal(),c=sideLampCentre();float dotN=dot(d,n);if(abs(dotN)<1e-7)return 0.;float t=dot(c-o,n)/dotN;vec3 p=o+t*d-c;if(t<=0.||abs(p.y)>sideLampHeight()||abs(dot(p,sideLampTangent()))>sideLampWidth())return 0.;return t*t/(4.*sideLampHeight()*sideLampWidth()*abs(dotN));}
float studioBlend(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
// The cyclorama is invariant across the camera's horizontal axis. Its floor,
// quarter-cylinder bend and upright wall meet with continuous tangents.
bool studioSurface(vec3 o,vec3 d,out vec3 point,out vec3 normal){
 float nearest=1e20;point=vec3(0);normal=vec3(0,0,1);
 if(d.y<-.0000001){float t=(STUDIO_FLOOR-o.y)/d.y;if(t>0.&&o.z+t*d.z>=STUDIO_BEND){nearest=t;normal=vec3(0,1,0);}}
 vec2 centre=vec2(STUDIO_FLOOR+STUDIO_RADIUS,STUDIO_BEND),q=o.yz-centre;
 float a=dot(d.yz,d.yz),b=dot(q,d.yz),c=dot(q,q)-STUDIO_RADIUS*STUDIO_RADIUS,delta=b*b-a*c;
 if(a>.00000001&&delta>=0.){
  vec2 roots=vec2(-b-sqrt(delta),-b+sqrt(delta))/a;
  for(int k=0;k<2;k++){float t=roots[k];vec3 p=o+t*d;if(t>0.&&t<nearest&&p.z<=STUDIO_BEND+.000001&&p.z>=STUDIO_BEND-STUDIO_RADIUS-.000001&&p.y>=STUDIO_FLOOR-.000001&&p.y<=centre.x+.000001){nearest=t;normal=vec3(0,(centre.x-p.y)/STUDIO_RADIUS,(centre.y-p.z)/STUDIO_RADIUS);}}
 }
 if(d.z<-.0000001){float t=(STUDIO_BEND-STUDIO_RADIUS-o.z)/d.z;if(t>0.&&t<nearest&&o.y+t*d.y>=centre.x){nearest=t;normal=vec3(0,0,1);}}
 if(nearest==1e20)return false;point=o+nearest*d;return true;
}
vec3 studioLocal(vec3 p){float c=cos(yaw),s=sin(yaw);return vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z);}
vec3 studioWorld(vec3 p){float c=cos(yaw),s=sin(yaw);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
// Direct-transmission shadow model: finite source, actual cross-section and
// liquid path. Refraction/caustic focusing is not included in this projection.
float studioChord(vec3 o,vec3 d,float bottom,float top,float radius,vec2 halfSize,float limit){
 float lo=0.,hi=limit;
 if(abs(d.y)<1e-8){if(o.y<bottom||o.y>top)return 0.;}else{vec2 v=(vec2(bottom,top)-o.y)/d.y;lo=max(lo,min(v.x,v.y));hi=min(hi,max(v.x,v.y));}
 if(containerType==0){float a=dot(d.xz,d.xz),b=dot(o.xz,d.xz),c=dot(o.xz,o.xz)-radius*radius;if(a<1e-12){if(c>0.)return 0.;}else{float delta=b*b-a*c;if(delta<0.)return 0.;vec2 v=vec2(-b-sqrt(delta),-b+sqrt(delta))/a;lo=max(lo,v.x);hi=min(hi,v.y);}}
 else for(int k=0;k<2;k++){int i=k==0?0:2;float h=halfSize[k];if(abs(d[i])<1e-8){if(abs(o[i])>h)return 0.;}else{vec2 v=(vec2(-h,h)-o[i])/d[i];lo=max(lo,min(v.x,v.y));hi=min(hi,max(v.x,v.y));}}
 return max(0.,hi-lo);
}
vec3 studioProjectedPath(vec3 point,int k){
 int reverse=((k&1)<<5)|((k&2)<<3)|((k&4)<<1)|((k&8)>>1)|((k&16)>>3)|((k&32)>>5);
 vec3 lamp=sideLampCentre()+sideLampTangent()*((float(reverse)+.5)/64.*2.-1.)*sideLampWidth()+vec3(0,((float(k)+.5)/64.*2.-1.)*sideLampHeight(),0);
 vec3 delta=lamp-point,worldD=normalize(delta),o=studioWorld(point),d=studioWorld(worldD);float lampDistance=length(delta);float cap=containerType==0?studioChord(o,d,2.95,3.46,.57,vec2(0),lampDistance):0.;
 float path=studioChord(o,d,.315,containerType==0?2.15:3.9542,.50,vec2(.50,containerType==1?.05:.50),lampDistance);
 float glass=studioChord(o,d,.12,containerType==0?2.95:4.62,.545,vec2(.625,containerType==1?.175:.625),lampDistance);
 float irradiance=max(0.,worldD.y)*abs(dot(worldD,sideLampNormal()))/dot(delta,delta);
 return vec3(path,cap>1e-6?0.:glass>1e-6?.92:1.,irradiance);
}
float studioFootprint(vec2 p){
 if(containerType==0)return length(p)-.545;
 vec2 halfSize=vec2(.625,containerType==1?.175:.625),q=abs(p)-(halfSize-vec2(.025));
 return length(max(q,0.))+min(max(q.x,q.y),0.)-.025;
}
float studioShadow(vec3 p){
 // Shadow coordinates follow the actual rectangular/circular footprint.
 float c=cos(yaw),s=sin(yaw);vec2 q=vec2(c*p.x+s*p.z,-s*p.x+c*p.z);
 if(length(q)>2.65)return 1.;
 float contact=.38*exp(-pow(max(studioFootprint(q),0.)/.085,2.));
 vec2 displacement=lighting>=2?vec2(.98*cos(sideAzimuth),-.98*sin(sideAzimuth)-.08):lighting==1?vec2(0,.38):vec2(.38,-.64);
 float t=clamp(dot(q,displacement)/dot(displacement,displacement),0.,1.);float distance=max(studioFootprint(q-t*displacement),0.);
 float soft=(lighting==1?.12:.19)*(1.-.45*t)*exp(-pow(distance/(.12+.14*t),2.));
 return (1.-contact)*(lighting==3?1.:1.-soft);
}
float studioMaterial(float up,float source){
 float f=studioBlend(up);
 if(lighting==3)return mix(.84,.136+.619*lightGain,f);
 if(lighting==0)return mix(.014,.027+.018*lightGain,f);
 if(lighting==1)return (.06+.80*source+.02*lightGain)*(1.-.20*f);
 return mix(.014+source,.027+.024*lightGain,f);
}
float studioCameraSource(){return lighting==1?1.:lighting==2?exp((inversesqrt(1.+.65*.65)-1.)/(.18*.18)):0.;}
void studioCamera(vec2 point,float scale,out vec3 origin,out vec3 direction){
 // A shallow studio view keeps the support visible even for a strictly
 // normal cuvette view; its contact line stays at the container's foot.
 float angle=max(pitch,.10);
 float centre=STUDIO_FLOOR+(viewHeight-STUDIO_FLOOR)*cos(pitch)/cos(angle);
 direction=vec3(0,-sin(angle),-cos(angle));
 origin=vec3(scale*point.x,centre+12.*sin(angle)+scale*point.y*cos(angle),12.*cos(angle)-scale*point.y*sin(angle));
 // Reparameterise the same ray above the support, also for very wide fields.
 origin-=direction*max(0.,(STUDIO_FLOOR+.5-origin.y)/(-direction.y));
}
float studioSrgb(float x){return x<=.0031308?12.92*x:1.055*pow(x,1./2.4)-.055;}

float environment(vec3 o,vec3 d);
struct Hit{float t;vec3 n;int type;int part;};
float spacing(){return max(4.00,4.00*size.x/size.y)/3.;}
vec2 meniscusAxis(float q,int row,float extent){float last=float(textureSize(meniscusProfile,0).x-1),f=clamp(abs(q)/extent,0.,1.)*last;int i=min(int(last)-1,int(f));float a=texelFetch(meniscusProfile,ivec2(i,row),0).r,b=texelFetch(meniscusProfile,ivec2(i+1,row),0).r;return vec2(mix(a,b,clamp(f-float(i),0.,1.)),(b-a)*last/extent*sign(q));}
float meniscusY(vec2 xz){
#ifdef CELL_GEOMETRY
 return meniscusBase+meniscusAxis(xz.x,0,meniscusExtent.x).x+meniscusAxis(xz.y,1,meniscusExtent.y).x;
#else
 return meniscusBase+meniscusAxis(length(xz),0,meniscusExtent.x).x;
#endif
}
vec2 meniscusGradient(vec2 xz){
#ifdef CELL_GEOMETRY
 return vec2(meniscusAxis(xz.x,0,meniscusExtent.x).y,meniscusAxis(xz.y,1,meniscusExtent.y).y);
#else
 float r=length(xz);return r>1e-10?meniscusAxis(r,0,meniscusExtent.x).y*xz/r:vec2(0);
#endif
}
float mediumIndex(int m){return m==1?(containerType>0?1.46:1.48):m==2?liquidIndex:1.;}
void candidate(inout Hit h,float t,vec3 n,int type){if(t>EPS&&t<h.t){h.t=t;h.n=n;h.type=type;h.part=-1;}}
vec3 offsetSurface(vec3 p,vec3 outgoing,vec3 normal){return p+normal*(dot(outgoing,normal)>=0.?EPS*4.:-EPS*4.);}
#ifdef CELL_GEOMETRY
float meniscusEquation(vec3 o,vec3 d,float t){vec3 p=o+t*d;return p.y-meniscusY(p.xz);}
void meniscusHit(inout Hit h,vec3 o,vec3 d,float t){vec3 p=o+t*d;
#ifdef CELL_GEOMETRY
 vec2 b=meniscusExtent-vec2(.008),q=max(abs(p.xz)-b,0.);if(length(q)>.008001)return;
#else
 if(dot(p.xz,p.xz)>.250001)return;
#endif
 vec2 slope=meniscusGradient(p.xz);float before=h.t;candidate(h,t,normalize(vec3(-slope.x,1.,-slope.y)),2);if(h.t<before)h.part=7;
}
// Use the runtime refinement budget, as for the other bounded geometry loops.
void meniscusRoot(inout Hit h,vec3 o,vec3 d,float low,float high){float fa=meniscusEquation(o,d,low);for(int i=0;i<profileRefinements;i++){float mid=(low+high)*.5,fm=meniscusEquation(o,d,mid);if(fa*fm<=0.)high=mid;else{low=mid;fa=fm;}}meniscusHit(h,o,d,(low+high)*.5);}
void capillaryBoundary(inout Hit h,vec3 o,vec3 d){
 if(hasLiquidSurface==0)return;
 float low=EPS,high=h.t;
#ifdef CELL_GEOMETRY
 for(int axis=0;axis<2;axis++){int k=axis==0?0:2;float extent=meniscusExtent[axis];if(abs(d[k])<1e-10){if(abs(o[k])>extent)return;}else{vec2 tt=(vec2(-extent,extent)-o[k])/d[k];low=max(low,min(tt.x,tt.y));high=min(high,max(tt.x,tt.y));}}
#else
 float aa=dot(d.xz,d.xz),bb=dot(o.xz,d.xz),cc=dot(o.xz,o.xz)-.25;if(aa<1e-12){if(cc>0.)return;}else{float delta=bb*bb-aa*cc;if(delta<0.)return;vec2 tt=vec2(-bb-sqrt(delta),-bb+sqrt(delta))/aa;low=max(low,tt.x);high=min(high,tt.y);}
#endif
 if(abs(meniscusSign)<.001){if(abs(d.y)>1e-10){float t=(meniscusBase-o.y)/d.y;if(t>=low&&t<=high)meniscusHit(h,o,d,t);}return;}
 if(abs(d.y)<1e-10){if(o.y<meniscusRange.x-EPS||o.y>meniscusRange.y+EPS)return;}else{vec2 tt=(meniscusRange-o.y)/d.y;low=max(low,min(tt.x,tt.y));high=min(high,max(tt.x,tt.y));}
 if(high<low)return;float a=meniscusSign*meniscusEquation(o,d,low),b=meniscusSign*meniscusEquation(o,d,high);
 if(a*b>0.){
  if(a>0.&&b>0.)return;
  float da=meniscusSign*(d.y-dot(meniscusGradient((o+low*d).xz),d.xz)),db=meniscusSign*(d.y-dot(meniscusGradient((o+high*d).xz),d.xz));if(da<=0.||db>=0.)return;
  float left=low,right=high;for(int i=0;i<profileRefinements;i++){float mid=(left+right)*.5,v=meniscusSign*(d.y-dot(meniscusGradient((o+mid*d).xz),d.xz));if(v>0.)left=mid;else right=mid;}float peak=(left+right)*.5;if(meniscusSign*meniscusEquation(o,d,peak)<0.)return;
  high=peak;
 }
 // Only the nearest root is relevant: the nearest glass boundary already
 // clips this interval, so a ray cannot enter the liquid domain again here.
 meniscusRoot(h,o,d,low,high);
}
#endif
#ifndef CELL_GEOMETRY
void cone(inout Hit hit,vec3 o,vec3 d,float y0,float y1,float r0,float r1,int type){
 float height=y1-y0,dr=r1-r0,scale=inversesqrt(height*height+dr*dr),cy=height*scale,cr=dr*scale;
 // Translate the ray close to a shallow frustum before forming its quadratic.
 // Otherwise two large terms cancel while resolving micrometre-high slices.
 float shift=0.,radial=dot(d.xz,d.xz);
 if(abs(cr)>.25&&abs(d.y)>1e-10){
  vec2 band=vec2((y0-o.y)/d.y,(y1-o.y)/d.y);if(max(band.x,band.y)<EPS)return;shift=(band.x+band.y)*.5;
  if(radial>1e-12){float closest=-dot(o.xz,d.xz)/radial,reach=max(r0,r1)/sqrt(radial);shift=clamp(shift,closest-reach,closest+reach);}shift=max(0.,shift);
 }
 vec3 origin=o+shift*d;
 float rr=r0*cy+cr*(origin.y-y0),a=cy*cy*radial-cr*cr*d.y*d.y,b=cy*cy*dot(origin.xz,d.xz)-rr*cr*d.y,c=cy*cy*dot(origin.xz,origin.xz)-rr*rr;
 float delta=b*b-a*c;if(delta<0.)return;float root=sqrt(delta);vec2 roots;
 if(abs(a)<1e-12){if(abs(b)<1e-14)return;roots=vec2(-c/(2.*b));}
 else{float q=-b-(b>=0.?root:-root);roots=abs(q)>1e-20?vec2(q/a,c/q):vec2(-b/a);}
 for(int j=0;j<2;j++){float local=roots[j],t=local+shift,y=origin.y+local*d.y;if(y>=y0-.0000002&&y<=y1+.0000002){vec3 p=origin+local*d;float rho=max(1e-12,length(p.xz));candidate(hit,t,vec3(cy*p.x/rho,-cr,cy*p.z/rho),type);}}
}
void disc(inout Hit h,vec3 o,vec3 d,float y,float r,vec3 n,int type){if(abs(d.y)<1e-9)return;float t=(y-o.y)/d.y;vec3 p=o+t*d;if(dot(p.xz,p.xz)<=r*r)candidate(h,t,n,type);}
// Clip first: almost all rays in the liquid miss these short shoulder/base bands.
bool profileInterval(vec3 o,vec3 d,float y0,float y1,float radius,float nearest,out vec2 interval){
 float lo=EPS,hi=nearest,a=dot(d.xz,d.xz),b=dot(o.xz,d.xz),c=dot(o.xz,o.xz)-radius*radius;
 if(a<1e-12){if(c>0.)return false;}else{float delta=b*b-a*c;if(delta<0.)return false;float q=sqrt(delta);lo=max(lo,(-b-q)/a);hi=min(hi,(-b+q)/a);}
 if(abs(d.y)<1e-10){if(o.y<y0||o.y>y1)return false;}else{vec2 yy=vec2((y0-o.y)/d.y,(y1-o.y)/d.y);lo=max(lo,min(yy.x,yy.y));hi=min(hi,max(yy.x,yy.y));}
 interval=vec2(lo,hi);return hi>lo;
}
vec2 profilePoint(float u,int shape,vec4 s){
 // The capillary profile is itself a piecewise-linear lathe. Intersect it
 // with the existing bounded profile tree instead of nesting three more
 // height-field solvers in every light path. All 257 profile nodes are used.
 if(shape==3)return vec2(.5*u,meniscusY(vec2(.5*u,0)));
 if(shape==0)return vec2(mix(s.z,s.w,u*u*(3.-2.*u)),mix(s.x,s.y,u));
 if(shape==1){float blend=s.y-s.x,theta=mix(-.5*PI,0.,u);return vec2(s.z-blend+blend*cos(theta),s.y+blend*sin(theta));}
 float r=s.z*u,q=1.-u*u,centre=max(0.,1.-r*r/(.18*.18));return vec2(r,s.x+s.w*q*q+.035*centre*centre);
}
bool profileNode(vec3 o,vec3 d,vec2 a,vec2 b,vec2 span){
 float low=span.x,high=span.y,y0=min(a.y,b.y)-.0000002,y1=max(a.y,b.y)+.0000002;
 if(abs(d.y)<1e-10){if(o.y<y0||o.y>y1)return false;}else{vec2 yy=vec2((y0-o.y)/d.y,(y1-o.y)/d.y);low=max(low,min(yy.x,yy.y));high=min(high,max(yy.x,yy.y));}
 if(high<low)return false;
 float aa=dot(d.xz,d.xz),t=aa>1e-12?clamp(-dot(o.xz,d.xz)/aa,low,high):low;
 vec2 p=o.xz+t*d.xz,p0=o.xz+low*d.xz,p1=o.xz+high*d.xz;
 float r0=max(0.,min(a.x,b.x)-.000001),r1=max(a.x,b.x)+.000001;
 return dot(p,p)<=r1*r1&&max(dot(p0,p0),dot(p1,p1))>=r0*r0;
}
void curvedProfile(inout Hit h,vec3 o,vec3 d,int shape,vec4 s,int type){
 vec2 span;float radius=shape==0?max(s.z,s.w):s.z;if(!profileInterval(o,d,s.x,s.y,radius,h.t,span))return;
 // Stack-free binary bounds accelerate a watertight, finely divided lathe.
 // profileSteps is a power of two; height order also gives ray-distance order.
 bool reverse=(shape==2||(shape==3&&meniscusSign<0.))!=(d.y<0.);int node=1,start=0,width=profileSteps;
 for(int visit=0;visit<profileSteps*2;visit++){
  float u0=float(start)/float(profileSteps),u1=float(start+width)/float(profileSteps);
  vec2 a=profilePoint(reverse?1.-u0:u0,shape,s),b=profilePoint(reverse?1.-u1:u1,shape,s);
  if(profileNode(o,d,a,b,span)){
   if(width>1){width/=2;node*=2;continue;}
   float before=h.t;if(a.y<b.y)cone(h,o,d,a.y,b.y,a.x,b.x,type);else cone(h,o,d,b.y,a.y,b.x,a.x,type);
   if(h.t<before){if(shape==2||(shape==3&&meniscusSign>0.))h.n=-h.n;h.part=shape==3?7:shape;return;}
  }
  while(node>1&&(node&1)==1){node/=2;width*=2;start-=width/2;}
  if(node==1)break;node++;start+=width;
 }
}
#endif
#ifdef CELL_GEOMETRY
float cuvetteDepth(){return containerType==1?.10:1.0;}
void cellCandidate(inout Hit h,vec3 o,vec3 d,float t,vec3 n,int type,int part){
 vec3 p=o+t*d;
 if(part==4&&n.y>.99&&p.y>4.60&&abs(p.x)<.475&&abs(p.z)<.5*cuvetteDepth())return;
 if(part==5&&p.y>4.62)return;
 float before=h.t;candidate(h,t,n,type);if(h.t<before)h.part=part;
}
float cellDistance(vec3 p,vec3 b,float radius){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-radius;}
// Bound the convex rounded box first, then approach its entry and exit with
// its exact signed distance. Flat windows converge immediately. Using this
// compact distance formulation also avoids very large driver shader builds.
void roundedCell(inout Hit h,vec3 o,vec3 d,vec3 centre,vec3 halfSize,float radius,int type,int part){
 vec3 q=o-centre,b=halfSize-vec3(radius);float lo=EPS,hi=INF;
 for(int axis=0;axis<3;axis++){
  if(abs(d[axis])<1e-10){if(abs(q[axis])>halfSize[axis])return;}
  else{vec2 t=vec2(-halfSize[axis]-q[axis],halfSize[axis]-q[axis])/d[axis];lo=max(lo,min(t.x,t.y));hi=min(hi,max(t.x,t.y));}
 }
 if(hi<lo)return;
 for(int end=0;end<min(2,profileCount);end++){
  float t=end==0?lo:hi,signStep=end==0?1.:-1.;
  for(int step=0;step<profileSteps/4;step++){
   vec3 p=q+t*d;float distance=cellDistance(p,b,radius);
   if(abs(distance)<.000001){vec3 n=normalize(p-clamp(p,-b,b));cellCandidate(h,o,d,t,n,type,part);break;}
   t+=signStep*max(abs(distance),.000001);if(t<lo-EPS||t>hi+EPS)break;
  }
 }
}
Hit cuvetteBoundary(vec3 o,vec3 d){
 Hit h;h.t=INF;h.n=vec3(0,1,0);h.type=-1;h.part=-1;float depth=cuvetteDepth();
 roundedCell(h,o,d,vec3(0,2.37,0),vec3(.625,2.25,(depth+.25)*.5),.025,0,4);
 roundedCell(h,o,d,vec3(0,3.50,0),vec3(.475,3.23,depth*.5),.008,1,5);
 // Separate transparent cover plate above the open, hollow body.
 roundedCell(h,o,d,vec3(0,4.675,0),vec3(.650,.035,(depth+.30)*.5),.010,0,6);
 capillaryBoundary(h,o,d);
 return h;
}
vec3 opticalNormal(Hit h,vec3 p){
 if(containerType==0||mattWalls==0||h.type>1||h.part==6||abs(h.n.x)<.75)return h.n;
 // A deterministic etched-surface micro-slope approximation on the two side
 // walls only. The front and rear optical windows remain polished.
 vec3 n=h.n;float a=sin(dot(p,vec3(197.,1103.,853.))),b=sin(dot(p,vec3(751.,653.,1249.)));
 return normalize(n+vec3(0,.16*a,.16*b));
}
#else
vec3 opticalNormal(Hit h,vec3 p){return h.n;}
#endif
Hit boundary(vec3 o,vec3 d){
#ifdef CELL_GEOMETRY
 return cuvetteBoundary(o,d);
#else
 Hit h;h.t=INF;h.n=vec3(0,1,0);h.type=-1;h.part=-1;
 cone(h,o,d,.21,2.42,.557,.557,0);cone(h,o,d,2.65,2.79,.435,.435,0);
 cone(h,o,d,.315,2.40,.500,.500,1);cone(h,o,d,2.63,2.79,.378,.378,1);
 // Paired outer/inner shoulders, rounded heels, and shallow raised bottom centres.
 for(int p=0;p<profileCount;p++){
  if(p==6&&(hasLiquidSurface==0||abs(meniscusSign)<.001)){if(hasLiquidSurface!=0)disc(h,o,d,meniscusBase,.5,vec3(0,1,0),2);continue;}
  vec4 s=p==0?vec4(2.42,2.65,.557,.435):p==1?vec4(2.40,2.63,.500,.378):p==2?vec4(.12,.21,.557,0):p==3?vec4(.235,.315,.500,0):p==4?vec4(.12,.170,.467,.015):p==5?vec4(.235,.285,.420,.015):vec4(meniscusRange,.5,0);
  curvedProfile(h,o,d,p<2?0:p<4?1:p<6?2:3,s,p==6?2:p%2);
 }
 cone(h,o,d,2.74,2.77,.585,.612,3);cone(h,o,d,2.77,3.40,.612,.612,3);cone(h,o,d,3.40,3.44,.612,.585,3);
 disc(h,o,d,2.74,.585,vec3(0,-1,0),3);disc(h,o,d,3.44,.585,vec3(0,1,0),3);
 return h;
#endif
}
int targetMedium(Hit h,vec3 p,vec3 d){
 bool entering=dot(d,h.n)<0.;
 if(h.type==0)return entering?1:0;
 if(h.type==1)return entering?((hasLiquidSurface==0||p.y<meniscusY(p.xz))?2:0):1;
 if(h.type==2)return entering?2:0;
 return 0;
}
float fresnel(vec3 d,vec3 n,float n1,float n2){
 float ci=clamp(-dot(d,n),0.,1.),st2=(n1/n2)*(n1/n2)*(1.-ci*ci);if(st2>=1.)return 1.;float ct=sqrt(1.-st2);
 float rs=(n1*ci-n2*ct)/(n1*ci+n2*ct),rp=(n2*ci-n1*ct)/(n2*ci+n1*ct);return .5*(rs*rs+rp*rp);
}
void camera(vec2 st,out vec3 o,out vec3 d){
 float aspect=size.x/size.y,scale=max(containerType>0?5.18:3.90,1.55/aspect)/viewZoom;vec2 q=(st-.5)*vec2(aspect,1.);
 d=normalize(vec3(-sin(yaw)*cos(pitch),-sin(pitch),-cos(yaw)*cos(pitch)));
 vec3 right=normalize(cross(d,vec3(0,1,0))),up=cross(right,d);o=vec3(0,viewHeight,0)-d*12.+scale*(q.x*right+q.y*up);
}
vec2 boundBox(vec3 o,vec3 d){vec3 low=containerType>0?vec3(-.66,.10,-.66):vec3(-.64,.10,-.64),high=containerType>0?vec3(.66,4.72,.66):vec3(.64,3.46,.64);vec3 a=(low-o)/d,b=(high-o)/d,p=min(a,b),q=max(a,b);return vec2(max(max(p.x,p.y),p.z),min(min(q.x,q.y),q.z));}
float areaSource(vec3 o,vec3 d){
 if(audit==1||lighting<2)return 0.;return sideLampGeometricPdf(studioLocal(o),studioLocal(d))>0.?(lighting==3?60.:20.)*lightGain:0.;
}
float ambientEnvironment(vec3 o,vec3 d){
 if(audit==1||audit==3)return 1.;
 if(audit==2)return 0.;
 // Scalar studio radiance is integrated against the selected source spectrum.
 // Direction points from the scene toward the source.
 float front=smoothstep(-.22,.32,d.z);
 // A dark camera opening in the frontal illumination wall prevents a
 // flat head-on reflection from covering both clear glass and the liquid.
 // The small port removes little diffuse illumination from scattering paths.
 float port=smoothstep(.12,.20,length(d.xy)/max(.01,d.z));
 float wall=lighting==0?.014+2.50*lightGain*front*port:.014;
 float stripA=exp(-pow((d.x+.40)/.090,2.))*smoothstep(-.25,.0,d.z)*(1.-smoothstep(.75,.95,abs(d.y)));
 float stripB=exp(-pow((d.x-.66)/.16,2.))*smoothstep(-.18,.2,d.z)*(1.-smoothstep(.85,1.,abs(d.y)));
 vec3 stagePoint,stageNormal;bool onStage=studioSurface(studioLocal(o),studioLocal(d),stagePoint,stageNormal);
 float shadow=onStage?mix(1.,studioShadow(stagePoint),pow(max(stageNormal.y,0.),6.)):1.;
 // Tall studio lamps stand in front of the ground-plane intersection.
 if(lighting==0){if(onStage)wall=studioMaterial(stageNormal.y,0.)*shadow;wall+=lightGain*(10.*stripA+3.5*stripB);}
 else if(lighting==1){vec3 forward=normalize(vec3(-sin(yaw)*cos(pitch),-sin(pitch),-cos(yaw)*cos(pitch)));float source=smoothstep(.10,.45,dot(d,forward));wall=onStage?studioMaterial(stageNormal.y,source)*shadow:.06+.80*source+.02*lightGain;wall+=lightGain*(.25*stripA+.12*stripB);}
 else{
   vec3 forward=normalize(vec3(-sin(yaw)*cos(pitch),-sin(pitch),-cos(yaw)*cos(pitch)));
   vec3 right=normalize(cross(forward,vec3(0,1,0))),rearLamp=normalize(forward+.65*right);
   float source=exp((dot(d,rearLamp)-1.)/(.18*.18));wall=(onStage?studioMaterial(stageNormal.y,source)*shadow:.014+source)+lightGain*.5*stripA;
   // A finite softbox beside the upper liquid creates spatially varying edge/meniscus illumination.
 }
 return wall;
}
float environmentUnoccluded(vec3 o,vec3 d){return ambientEnvironment(o,d)+areaSource(o,d);}
float capShade(vec3 p,vec3 n,vec3 d){
 if(audit==1||audit==3)return 1.;
 float phi=atan(p.z,p.x),side=1.-abs(n.y),r=max(.4,length(p.xz));
 float pixelAngle=max(4.,4.*size.y/size.x)/size.y/max(.10,r*abs(dot(n,-d)));
 float visible=exp(-.16*pow(144.*pixelAngle,2.));
 float groove=sin(144.*phi)*visible;
 vec3 tangent=vec3(-sin(phi),0,cos(phi));
 n=normalize(n+side*.0025*144./r*groove*tangent);
 float diffuse=max(dot(n,normalize(vec3(-.4,.7,.6))),0.);
 float occlusion=1.-.16*side*(.5+.5*cos(144.*phi)*visible);
 vec3 reflected=reflect(d,n),t=normalize(cross(abs(reflected.y)<.9?vec3(0,1,0):vec3(1,0,0),reflected)),b=cross(reflected,t);
 float roughReflection=(environment(p,reflected)+environment(p,normalize(reflected+.45*t))+environment(p,normalize(reflected-.45*t))+environment(p,normalize(reflected+.45*b))+environment(p,normalize(reflected-.45*b)))/5.;
 float broadSpec=pow(max(dot(reflected,normalize(vec3(-.5,.25,1.))),0.),12.);
 return (.010+.024*diffuse)*occlusion+.010*broadSpec+.007*roughReflection;
}
float concentration(int vial,float ppm){return ppm;}
vec3 T(float L,int vial){float f=clamp(L/8.,0.,1.)*767.;int i=int(f);return mix(texelFetch(transmission,ivec2(i,vial),0).rgb,texelFetch(transmission,ivec2(min(i+1,767),vial),0).rgb,fract(f));}

#ifdef ENABLE_CARD
uniform sampler2D cardLogo;
uniform int testCard,cardBands;
uniform float samplePpm;
float cardUnit(){return containerType==0?10./diameter:1.;}
bool cardSurface(vec3 objectOrigin,vec3 objectDirection,out vec3 ink,out float shade){
 if(testCard==0||audit!=0)return false;
 float unit=cardUnit(),oldHeight=.9*(containerType==0?3.34:4.5);vec2 anchor=vec2((1179.-203.)/2098.-.5,(1004.-605.)/801.-.5);
 float bottom=viewHeight-anchor.y*.9*oldHeight-oldHeight*.5,ceiling=containerType==0?2.91:meniscusRange.x-.06,height=.85*max(.5,ceiling-bottom),top=bottom+height,width=height*2098./801.;
 vec2 logoSize=.9*vec2(width,height);
 vec3 o=studioLocal(objectOrigin),d=studioLocal(objectDirection),centre=vec3(-anchor.x*logoSize.x,(bottom+top)*.5,-.94),halfSize=vec3(width*.5,height*.5,.02*unit),q=o-centre;
 float low=EPS,high=INF;int axis=2;
 for(int k=0;k<3;k++){if(abs(d[k])<1e-9){if(abs(q[k])>halfSize[k])return false;}else{vec2 roots=(vec2(-halfSize[k],halfSize[k])-q[k])/d[k];float a=min(roots.x,roots.y),b=max(roots.x,roots.y);if(a>low){low=a;axis=k;}high=min(high,b);}}
 if(high<low||high<0.)return false;
 // A finite source in front of the paper remains visible to this ray.
 if(lighting>=2&&sideLampGeometricPdf(o,d)>0.){float t=dot(sideLampCentre()-o,sideLampNormal())/dot(d,sideLampNormal());if(t>0.&&t<low)return false;}
 vec3 point=o+low*d;float radius=.08*height;vec2 edge=abs(point.xy-centre.xy)-(halfSize.xy-vec2(radius));if(length(max(edge,0.))+min(max(edge.x,edge.y),0.)>radius+.00001)return false;
 ink=vec3(.88);shade=(.18+lightGain*(lighting==0?.70:lighting==1?.50:.55))*(axis==2?1.:.68);
 if(axis==2&&d.z<0.){
  vec2 uv=(point.xy-centre.xy)/logoSize+.5;
  if(all(greaterThanEqual(uv,vec2(0)))&&all(lessThanEqual(uv,vec2(1)))){vec3 rgb=texture(cardLogo,mix(vec2(203./2504.,173./1177.),vec2(2301./2504.,974./1177.),uv)).rgb;ink=.88*mix(rgb/12.92,pow((rgb+.055)/1.055,vec3(2.4)),step(vec3(.04045),rgb));}
 }
 return true;
}
// Smooth, positive RGB-derived reflectance basis. White stays spectrally flat;
// the supplied JPEG is not a measured ink-reflectance spectrum.
float cardReflectance(vec3 ink,int band){float wl=380.+10.*float(band);vec3 q=(vec3(wl)-vec3(615,540,450))/vec3(48,42,34),w=exp(-.5*q*q);return dot(ink,w)/max(1e-12,w.x+w.y+w.z);}
float environment(vec3 o,vec3 d){vec3 ink;float shade;if(cardSurface(o,d,ink,shade))return shade*dot(ink,vec3(.2126,.7152,.0722));return environmentUnoccluded(o,d);}
float environmentBand(vec3 o,vec3 d,int band){vec3 ink;float shade;if(cardSurface(o,d,ink,shade))return shade*cardReflectance(ink,band);return environmentUnoccluded(o,d);}
float ambientEnvironmentBand(vec3 o,vec3 d,int band){vec3 ink;float shade;if(cardSurface(o,d,ink,shade))return shade*cardReflectance(ink,band);return ambientEnvironment(o,d);}
vec3 transmittedEnvironment(float path,vec3 o,vec3 d,int index){
 vec3 ink;float shade;if(!cardSurface(o,d,ink,shade))return T(path,index)*environmentUnoccluded(o,d);
 vec3 colour=vec3(0);for(int k=0;k<cardBands;k++){vec2 coefficientsAtBand=texelFetch(coefficients,ivec2(k,0),0).rg;float transmittance=exp(-samplePpm*(coefficientsAtBand.x+coefficientsAtBand.y)*path);colour+=texelFetch(colourWeights,ivec2(k,0),0).rgb*(transmittance*shade*cardReflectance(ink,k));}return colour;
}
bool cameraSeesCard(vec3 o,vec3 d){vec3 ink;float shade;return cardSurface(o,d,ink,shade);}

#else
bool cardSurface(vec3 o,vec3 d,out vec3 ink,out float shade){ink=vec3(0);shade=0.;return false;}
float cardReflectance(vec3 ink,int band){return 1.;}
float environment(vec3 o,vec3 d){return environmentUnoccluded(o,d);}
float environmentBand(vec3 o,vec3 d,int band){return environmentUnoccluded(o,d);}
float ambientEnvironmentBand(vec3 o,vec3 d,int band){return ambientEnvironment(o,d);}
vec3 transmittedEnvironment(float path,vec3 o,vec3 d,int index){return T(path,index)*environmentUnoccluded(o,d);}
bool cameraSeesCard(vec3 o,vec3 d){return false;}
#endif


bool directWaterSegment(inout vec3 o,inout vec3 d,out float L){
 int med=0;L=0.;vec2 box=boundBox(o,d);if(box.x>box.y||box.y<0.)return false;o+=d*max(0.,box.x-EPS*8.);
 for(int j=0;j<interfaceBudget;j++){Hit h=boundary(o,d);if(h.type<0||h.type==3)return false;if(med==2){L=h.t;return true;}vec3 p=o+h.t*d;int next=targetMedium(h,p,d);vec3 normal=opticalNormal(h,p),n=dot(d,normal)<0.?normal:-normal,bend=refract(d,n,mediumIndex(med)/mediumIndex(next));if(dot(bend,bend)<1e-12)d=normalize(reflect(d,n));else{d=normalize(bend);med=next;}o=offsetSurface(p,d,h.n);}
 return false;
}
`;
 const previewSource=`in vec2 uv;out vec4 frag;
// A fast primary-path preview uses the same container and capillary surface,
// Fresnel interfaces and spectral Beer-Lambert table as the full renderer.
// Reflected environment is unoccluded until the full branch trace replaces it.
void main(){
 vec3 o,d;camera(uv,o,d);vec3 result=vec3(0);float weight=1.,path=0.,guide=0.;int med=0;
 vec2 box=boundBox(o,d);if(box.x>box.y||box.y<0.){frag=vec4(transmittedEnvironment(0.,o,d,0),cameraSeesCard(o,d)?0.:-1.);return;}
 o+=d*max(0.,box.x-EPS*8.);
 for(int step=0;step<interfaceBudget;step++){
  Hit h=boundary(o,d);
  if(h.type<0){if(step==0)guide=cameraSeesCard(o,d)?0.:-1.;result+=weight*transmittedEnvironment(path,o,d,0);break;}
  if(med==2){path+=h.t*diameter/10.;if(guide==0.)guide=h.t*diameter/10.;}
  vec3 p=o+h.t*d;
  if(h.type==3){result+=weight*T(path,0)*capShade(p,h.n,d);break;}
  int next=targetMedium(h,p,d);vec3 normal=opticalNormal(h,p),n=dot(d,normal)<0.?normal:-normal;
  float n1=mediumIndex(med),n2=mediumIndex(next),F=fresnel(d,n,n1,n2);
  vec3 reflected=normalize(reflect(d,n)),transmitted=refract(d,n,n1/n2);
  if(dot(transmitted,transmitted)<1e-12)d=reflected;
  else{result+=weight*F*transmittedEnvironment(path,p,reflected,0);weight*=1.-F;d=normalize(transmitted);med=next;}
  o=offsetSurface(p,d,h.n);
  if(weight<.00003)break;
 }
 frag=vec4(result,guide);
}
`,glassSource=`in vec2 uv;out vec4 frag;
uniform int glassBudget;
uniform sampler2D guideImage;
vec4 vial(vec3 o,vec3 d,int index){
 vec2 box=boundBox(o,d);if(box.x>box.y||box.y<0.)return vec4(-1.);
 o+=d*max(0.,box.x-EPS*8.);
 // Resolve the strongest pending Fresnel branch first. Weak descendants cannot
 // consume the work budget while a bright first reflection is still waiting.
 vec4 origins[8],directions[8];int media[8],count=0,med=0;
 float weight=1.,path=0.;vec3 result=vec3(0);
 for(int event=0;event<glassBudget;event++){
  bool ended=false;Hit h=boundary(o,d);
  if(h.type<0){if(event==0)return vec4(-1.);result+=weight*transmittedEnvironment(path,o,d,index);ended=true;}
  else{
   if(med==2)path+=h.t*diameter/10.;
   vec3 p=o+h.t*d;
   if(h.type==3){result+=weight*T(path,index)*capShade(p,h.n,d);ended=true;}
   else{
    int next=targetMedium(h,p,d);if(audit==3&&next==med)return vec4(100.+float(h.type)*10.+float(med)+.1*float(h.part+1),p.y,length(p.xz),weight);vec3 normal=opticalNormal(h,p),n=dot(d,normal)<0.?normal:-normal;float n1=mediumIndex(med),n2=mediumIndex(next),F=fresnel(d,n,n1,n2);
    vec3 reflected=normalize(reflect(d,n)),transmitted=refract(d,n,n1/n2);if(dot(transmitted,transmitted)>1e-12)transmitted=normalize(transmitted);
    if(dot(transmitted,transmitted)<1e-12||F>=1.){d=reflected;o=offsetSurface(p,d,h.n);}
    else{
     bool followReflection=F>.5;float small=weight*(followReflection?1.-F:F),large=weight-small;
     vec3 other=followReflection?transmitted:reflected;int otherMedium=followReflection?next:med;
     if(small>.00003){
      bool room=count<8;int slot=count;if(room)count++;else{slot=0;for(int j=1;j<8;j++)if(directions[j].w<directions[slot].w)slot=j;}
      if(room||small>directions[slot].w){origins[slot]=vec4(offsetSurface(p,other,h.n),path);directions[slot]=vec4(other,small);media[slot]=otherMedium;}
     }
     d=followReflection?reflected:transmitted;if(!followReflection)med=next;weight=large;o=offsetSurface(p,d,h.n);
    }
    vec3 attenuation=T(path,index);if(weight*max(max(attenuation.r,attenuation.g),attenuation.b)<.00003)ended=true;
   }
  }
  if(count==0){if(ended)break;}
  else{
   int best=0;for(int j=1;j<count;j++)if(directions[j].w>directions[best].w)best=j;
   if(ended||directions[best].w>weight){
    vec4 oldOrigin=vec4(o,path),oldDirection=vec4(d,weight);int oldMedium=med;
    o=origins[best].xyz;path=origins[best].w;d=directions[best].xyz;weight=directions[best].w;med=media[best];
    if(ended){count--;origins[best]=origins[count];directions[best]=directions[count];media[best]=media[count];}
    else{origins[best]=oldOrigin;directions[best]=oldDirection;media[best]=oldMedium;}
   }
  }
 }
 return vec4(result,0.);
}
vec4 view(vec2 st){
 vec3 o,d;camera(st,o,d);vec3 colour=transmittedEnvironment(0.,o,d,0);float guide=cameraSeesCard(o,d)?0.:-1.;
 for(int j=0;j<vialCount;j++){vec3 local=o-vec3((float(j)-.5*float(vialCount-1))*spacing(),0,0);vec4 v=vial(local,d,j);if(v.a>=0.){colour=v.rgb;guide=v.a;}}
 return vec4(colour,guide);
}
void main(){
 vec3 o,d;camera(uv,o,d);float projectedY=o.y-o.z*d.y/d.z;
 int count=containerType>0?(mattWalls==1||projectedY<.5||projectedY>3.5?edgeSamples:1):((projectedY>-.35&&projectedY<.5)||(projectedY>2.30&&projectedY<2.90)||(projectedY>=meniscusRange.x-.05&&projectedY<=meniscusRange.y+.05))?edgeSamples:1;
 vec4 sum=vec4(0);for(int j=0;j<count;j++){vec2 offset=count==1?vec2(0):vec2(float(j%2)-.5,float(j/2)-.5)*.5;sum+=view(uv+offset/size);}frag=sum/float(count);frag.a=frag.a<-.999?-1.:max(texture(guideImage,uv).a,0.);
}
`,scatterSource=`in vec2 uv;out vec4 frag;
uniform sampler2D accumulated;
uniform sampler2D guideImage;
uniform int pass,directLighting;
uniform float ppm;
uint rngState;
uint hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}
float random01(){rngState=hash(rngState+0x9e3779b9u);return clamp((float(rngState)+.5)/4294967296.,1e-8,1.-1e-7);}
vec3 directionAround(vec3 d,float mu,float phi){vec3 t=normalize(cross(abs(d.z)<.9?vec3(0,0,1):vec3(0,1,0),d)),b=cross(d,t);return normalize(mu*d+sqrt(max(0.,1.-mu*mu))*(t*cos(phi)+b*sin(phi)));}
vec3 scatteredDirection(vec3 d,int wl){float f=clamp(random01()*512.-.5,0.,511.);int a=int(f);float mu=mix(texelFetch(phaseTexture,ivec2(a,wl),0).r,texelFetch(phaseTexture,ivec2(min(a+1,511),wl),0).r,fract(f));return directionAround(d,mu,2.*PI*random01());}
float phasePdf(float mu,int wl){float last=float(textureSize(phaseDensity,0).x-1),f=sqrt(acos(clamp(mu,-1.,1.))/PI)*last;int a=min(int(last)-1,int(f));float logp=mix(texelFetch(phaseDensity,ivec2(a,wl),0).r,texelFetch(phaseDensity,ivec2(a+1,wl),0).r,clamp(f-float(a),0.,1.));return exp(logp);}
void interfaceStep(Hit h,vec3 p,inout vec3 d,inout int med,inout float w){
 int next=targetMedium(h,p,d);vec3 normal=opticalNormal(h,p),n=dot(d,normal)<0.?normal:-normal;float n1=mediumIndex(med),n2=mediumIndex(next),F=fresnel(d,n,n1,n2);vec3 bend=refract(d,n,n1/n2);
 if(dot(bend,bend)<1e-12||random01()<F)d=normalize(reflect(d,n));
 else{w*=(n1/n2)*(n1/n2);d=normalize(bend);med=next;}
}
#ifdef AREA_LIGHTING
float sourceVisibility(vec3 o,vec3 d,float extinction){
 int med=2;float w=1.;
 for(int step=0;step<interfaceBudget;step++){
   Hit h=boundary(o,d);if(h.type<0)return w*areaSource(o,d);if(h.type==3)return 0.;
   if(med==2)w*=exp(-extinction*h.t);if(w<1e-12)return 0.;vec3 p=o+h.t*d;interfaceStep(h,p,d,med,w);o=offsetSurface(p,d,h.n);
 }
 return 0.;
}
float sampleAreaLight(vec3 p,vec3 incoming,int wl,float extinction){
 if(directLighting==0||lighting!=2||audit==1||lightGain<=0.)return 0.;
 vec3 toLamp=vec3(-1.25,2.45,0.)-p,axis=normalize(toLamp);float halfAngle=min(1.35,atan(1.20/max(.3,length(toLamp)))+.30),coneCos=cos(halfAngle);
 bool cone=random01()<.90;float mu=cone?mix(coneCos,1.,random01()):2.*random01()-1.;vec3 d=directionAround(axis,mu,2.*PI*random01());
 float q=.10/(4.*PI)+(dot(d,axis)>=coneCos?.90/(2.*PI*(1.-coneCos)):0.);
 return phasePdf(dot(incoming,d),wl)*sourceVisibility(p,d,extinction)/q;
}
#else
float sampleAreaLight(vec3 p,vec3 incoming,int wl,float extinction){return 0.;}
#endif
float afterCollision(vec3 o,vec3 incoming,int wl,float weight,float ms,float ma){
 float light=0.;vec3 d=incoming;int med=2;bool collision=true;
 // One connection-to-light call site avoids duplicating the complete nested
 // visibility trace in driver-generated code. The phase sample and roulette
 // remain in the same order as in the former initial/next-collision branches.
 for(int step=0;step<=scatterBudget;step++){
   if(collision){light+=weight*sampleAreaLight(o,d,wl,ms+ma);d=scatteredDirection(d,wl);collision=false;}
   if(step==scatterBudget||weight<1e-10)return light;
   if(step>13){float survive=clamp(weight,.08,.985);if(random01()>survive)return light;weight/=survive;}
   Hit h=boundary(o,d);if(h.type<0)return light+weight*(directLighting==1?ambientEnvironmentBand(o,d,wl):environmentBand(o,d,wl));
   float nextScatter=med==2?-log(random01())/max(ms,1e-20):INF;
   if(nextScatter<h.t){o+=nextScatter*d;weight*=exp(-ma*nextScatter);collision=true;}
   else{if(med==2)weight*=exp(-ma*h.t);vec3 p=o+h.t*d;if(h.type==3)return light+(audit==1?weight*mediumIndex(med)*mediumIndex(med):0.);interfaceStep(h,p,d,med,weight);o=offsetSurface(p,d,h.n);}
 }
 return light;
}
float cameraScattering(vec3 o,vec3 d,int wl,float ms,float ma){
 // Split off the probability of a first collision; dilute samples no longer depend on rare lucky paths.
 vec2 box=boundBox(o,d);o+=d*max(0.,box.x-EPS*8.);int med=0;float weight=1.,result=0.;
 for(int step=0;step<interfaceBudget+2;step++){
   Hit h=boundary(o,d);if(h.type<0)return result;
   if(med==2){float probability=1.-exp(-ms*h.t);if(probability>1e-10){float s=-log(max(1e-9,1.-random01()*probability))/ms;result+=afterCollision(o+s*d,d,wl,weight*probability*exp(-ma*s),ms,ma);}weight*=exp(-(ms+ma)*h.t);}
   if(h.type==3||weight<1e-10)return result;vec3 p=o+h.t*d;interfaceStep(h,p,d,med,weight);o=offsetSurface(p,d,h.n);
 }
 return result;
}

void main(){
 vec3 o,d;vec2 imageUV=scatterWindow.xy+uv*scatterWindow.zw;camera(imageUV,o,d);int vial=0;float L=texture(guideImage,imageUV).a;
 if(L<=0.){frag=vec4(0);return;}
 uint pixel=uint(gl_FragCoord.x)+uint(gl_FragCoord.y)*8191u,offset=hash(pixel)%41u;vec3 sampleColour=vec3(0.);
 for(int lane=0;lane<spectralLanes;lane++){
   int wl=int((uint(pass+lane*14)+offset)%41u);rngState=hash(pixel*9781u+uint(pass+1)*6271u);
   vec4 c=texelFetch(coefficients,ivec2(wl,0),0);float f=concentration(vial,ppm)*diameter/10.,ms=c.r*f,ma=c.g*f,light=0.;
   if(ms>1e-12)light=cameraScattering(o-vec3((float(vial)-.5*float(vialCount-1))*spacing(),0,0),d,wl,ms,ma);
   sampleColour+=texelFetch(colourWeights,ivec2(wl,0),0).rgb*(41./float(spectralLanes))*light;
 }
 if(any(isnan(sampleColour))||any(isinf(sampleColour)))sampleColour=vec3(0.);
 vec4 previous=texelFetch(accumulated,ivec2(gl_FragCoord.xy),0);frag=vec4((previous.rgb*float(pass)+sampleColour)/float(pass+1),L);
}
`;
 const packetSource=`// All 41 wavelengths follow one geometric path. Mixture PDFs account for
// wavelength-dependent free flights and Mie phase functions; sharing RNG alone
// would not do that. This keeps each path's colour spectrally coherent.
in vec2 uv;out vec4 frag;
uniform sampler2D accumulated,guideImage;
uniform highp usampler2D sequenceSamples;
uniform int pass,directLighting,spectrumCount;
uniform float ppm;
uint rngState,pixelSeed;int randomDimension;
float sigmaS[41],sigmaT[41],primary[41],packet[41],importance[41],phaseValues[41];
vec3 rgbWeight[41];
float importanceSum;vec3 connectionInk;float connectionEmission;bool connectionCard;
uint hash(uint x){x^=x>>16;x*=0x7feb352du;x^=x>>15;x*=0x846ca68bu;x^=x>>16;return x;}
float random01(){int dim=randomDimension++;uint bits;if(dim<64){uint sampleBits=texelFetch(sequenceSamples,ivec2(pass%1024,dim),0).r,shift=hash(pixelSeed+uint(dim)*0x9e3779b9u+uint(pass/1024)*0x632be59bu);bits=sampleBits^shift;}else{rngState=hash(rngState+0x9e3779b9u);bits=rngState;}return clamp((float(bits)+.5)/4294967296.,1e-8,1.-1e-7);}
vec3 directionAround(vec3 d,float mu,float phi){vec3 t=normalize(cross(abs(d.z)<.9?vec3(0,0,1):vec3(0,1,0),d)),b=cross(d,t);return normalize(mu*d+sqrt(max(0.,1.-mu*mu))*(t*cos(phi)+b*sin(phi)));}
float phasePdf(float mu,int wl){float last=float(textureSize(phaseDensity,0).x-1),f=sqrt(acos(clamp(mu,-1.,1.))/PI)*last;int a=min(int(last)-1,int(f));return exp(mix(texelFetch(phaseDensity,ivec2(a,wl),0).r,texelFetch(phaseDensity,ivec2(a+1,wl),0).r,clamp(f-float(a),0.,1.)));}
vec3 phaseDirection(vec3 d,int wl){float f=clamp(random01()*512.-.5,0.,511.);int a=int(f);float mu=mix(texelFetch(phaseTexture,ivec2(a,wl),0).r,texelFetch(phaseTexture,ivec2(min(a+1,511),wl),0).r,fract(f));return directionAround(d,mu,2.*PI*random01());}
void interfaceStep(Hit h,vec3 p,inout vec3 d,inout int med,inout float w){int next=targetMedium(h,p,d);vec3 normal=opticalNormal(h,p),n=dot(d,normal)<0.?normal:-normal;float n1=mediumIndex(med),n2=mediumIndex(next),F=fresnel(d,n,n1,n2);vec3 bend=refract(d,n,n1/n2);if(dot(bend,bend)<1e-12||random01()<F)d=normalize(reflect(d,n));else{w*=(n1/n2)*(n1/n2);d=normalize(bend);med=next;}}
int chooseBand(bool first,float distance,out float total){
 total=0.;for(int j=0;j<spectrumCount;j++)total+=importance[j]*(first?primary[j]*(1.-exp(-sigmaS[j]*distance)):packet[j]);
 float u=random01()*total,c=0.;int chosen=0;
 for(int j=0;j<spectrumCount;j++){c+=importance[j]*(first?primary[j]*(1.-exp(-sigmaS[j]*distance)):packet[j]);if(c>=u){chosen=j;break;}}
 return chosen;
}
vec3 integratePacket(){vec3 c=vec3(0);for(int j=0;j<spectrumCount;j++)c+=rgbWeight[j]*packet[j];return c;}
vec3 integrateEnvironment(vec3 o,vec3 d){vec3 ink;float shade;if(!cardSurface(o,d,ink,shade))return integratePacket()*environmentUnoccluded(o,d);vec3 c=vec3(0);for(int j=0;j<spectrumCount;j++)c+=rgbWeight[j]*packet[j]*shade*cardReflectance(ink,j);return c;}
vec3 rearSourceAxis(){vec3 forward=normalize(vec3(-sin(yaw)*cos(pitch),-sin(pitch),-cos(yaw)*cos(pitch))),right=normalize(cross(forward,vec3(0,1,0)));return normalize(forward+.65*right);}
vec3 lightMixture(){return lighting==3?vec3(.40,.25,.35):vec3(.45,.45,.10);}
float rearSourcePdf(vec3 direction){float spread=.18*.18;return exp((dot(direction,rearSourceAxis())-1.)/spread)/(2.*PI*spread*(1.-exp(-2./spread)));}
float lightDirectionPdf(vec3 point,vec3 direction){vec3 proposalMix=lightMixture();return proposalMix.x*sideLampGeometricPdf(studioLocal(point),studioLocal(direction))+proposalMix.y*rearSourcePdf(direction)+proposalMix.z/(4.*PI);}
float powerWeight(float a,float b){return a*a/max(1e-30,a*a+b*b);}
// A visibility ray carries the common interface factor and liquid path length.
// Its full extinction spectrum is applied after tracing, without 41 geometry traces.
vec2 sourceVisibility(vec3 o,vec3 d){
 int med=2;float w=1.,lengthInLiquid=0.;
 for(int step=0;step<interfaceBudget;step++){
  Hit h=boundary(o,d);if(h.type<0){connectionCard=cardSurface(o,d,connectionInk,connectionEmission);if(!connectionCard)connectionEmission=environmentUnoccluded(o,d);return vec2(lengthInLiquid,w);}if(h.type==3)return vec2(0);
  if(med==2)lengthInLiquid+=h.t;vec3 p=o+h.t*d;interfaceStep(h,p,d,med,w);o=offsetSurface(p,d,h.n);
 }
 return vec2(0);
}
vec3 connectLight(vec3 p,vec3 incoming){
 if(directLighting==0||lighting<2||audit==1)return vec3(0);
 vec3 centre=sideLampCentre(),tangent=sideLampTangent(),worldPoint=studioLocal(p),proposalMix=lightMixture();float choose=random01(),u=random01(),v=random01();vec3 d;
 if(choose<proposalMix.x){vec3 sampled=centre+tangent*((2.*u-1.)*sideLampWidth())+vec3(0,(2.*v-1.)*sideLampHeight(),0);d=studioWorld(normalize(sampled-worldPoint));}
 else if(choose<proposalMix.x+proposalMix.y){float spread=.18*.18,mu=1.+spread*log(max(1e-12,1.-u*(1.-exp(-2./spread))));d=directionAround(rearSourceAxis(),mu,2.*PI*v);}
 else d=directionAround(vec3(0,1,0),2.*u-1.,2.*PI*v);
 float q=lightDirectionPdf(p,d);
 vec2 visibility=sourceVisibility(p,d);if(visibility.y<=0.)return vec3(0);float mu=dot(incoming,d),phaseProposal=0.,norm=0.;vec3 light=vec3(0);
 for(int j=0;j<spectrumCount;j++){float phase=phasePdf(mu,j);light+=rgbWeight[j]*packet[j]*phase*exp(-sigmaT[j]*visibility.x)*(connectionEmission*(connectionCard?cardReflectance(connectionInk,j):1.));phaseProposal+=importance[j]*packet[j]*phase;norm+=importance[j]*packet[j];}
 phaseProposal/=max(1e-30,norm);
 return light*(visibility.y/q)*powerWeight(q,phaseProposal);
}
vec3 afterCollision(vec3 o,vec3 incoming,float weight){
 vec3 result=vec3(0),d=incoming;int med=2;bool collision=true;float sourceMIS=1.;
 for(int step=0;step<=scatterBudget;step++){
  if(collision){
   result+=weight*connectLight(o,d);float total;int hero=chooseBand(false,0.,total);if(total<1e-25)return result;
   vec3 next=phaseDirection(d,hero);float mu=dot(d,next),q=0.;
   for(int j=0;j<spectrumCount;j++){phaseValues[j]=phasePdf(mu,j);q+=importance[j]*packet[j]*phaseValues[j];}q/=total;
   if(q<1e-30)return result;sourceMIS=directLighting==1&&audit!=1?powerWeight(q,lightDirectionPdf(o,next)):1.;for(int j=0;j<spectrumCount;j++)packet[j]*=phaseValues[j]/q;d=next;collision=false;
  }
  if(step==scatterBudget)return result;
  float norm=0.;for(int j=0;j<spectrumCount;j++)norm+=importance[j]*packet[j];if(norm*weight<1e-20)return result;
  if(step>13){float survive=clamp(weight*norm/importanceSum,.08,.985);if(random01()>survive)return result;weight/=survive;}
  Hit h=boundary(o,d);if(h.type<0)return result+weight*sourceMIS*integrateEnvironment(o,d);
  float distance=INF,total=norm;
  if(med==2){int hero=chooseBand(false,0.,total);distance=-log(random01())/max(sigmaS[hero],1e-20);}
  if(distance<h.t){
   float q=0.;for(int j=0;j<spectrumCount;j++)q+=importance[j]*packet[j]*sigmaS[j]*exp(-sigmaS[j]*distance);q/=total;
   if(q<1e-30)return result;for(int j=0;j<spectrumCount;j++)packet[j]*=sigmaS[j]*exp(-sigmaT[j]*distance)/q;
   o+=distance*d;collision=true;
  }else{
   if(med==2){float q=0.;for(int j=0;j<spectrumCount;j++)q+=importance[j]*packet[j]*exp(-sigmaS[j]*h.t);q/=total;if(q<1e-30)return result;for(int j=0;j<spectrumCount;j++)packet[j]*=exp(-sigmaT[j]*h.t)/q;}
   if(h.type==3)return result+(audit==1?weight*integratePacket()*mediumIndex(med)*mediumIndex(med):vec3(0));
   vec3 p=o+h.t*d;interfaceStep(h,p,d,med,weight);o=offsetSurface(p,d,h.n);
  }
 }
 return result;
}
vec3 cameraScattering(vec3 o,vec3 d){
 vec2 box=boundBox(o,d);o+=d*max(0.,box.x-EPS*8.);int med=0;float weight=1.;vec3 result=vec3(0);
 for(int step=0;step<interfaceBudget+2;step++){
  Hit h=boundary(o,d);if(h.type<0)return result;
  if(med==2){
   float total;int hero=chooseBand(true,h.t,total);
   if(total>1e-25){float probability=1.-exp(-sigmaS[hero]*h.t),s=-log(max(1e-9,1.-random01()*probability))/max(sigmaS[hero],1e-20),q=0.;
    for(int j=0;j<spectrumCount;j++)q+=importance[j]*primary[j]*sigmaS[j]*exp(-sigmaS[j]*s);q/=total;
    if(q>1e-30){for(int j=0;j<spectrumCount;j++)packet[j]=primary[j]*sigmaS[j]*exp(-sigmaT[j]*s)/q;result+=afterCollision(o+s*d,d,weight);}
   }
   for(int j=0;j<spectrumCount;j++)primary[j]*=exp(-sigmaT[j]*h.t);
  }
  if(h.type==3||weight<1e-10)return result;vec3 p=o+h.t*d;interfaceStep(h,p,d,med,weight);o=offsetSurface(p,d,h.n);
 }
 return result;
}
void main(){
 vec2 imageUV=scatterWindow.xy+uv*scatterWindow.zw;float L=texture(guideImage,imageUV).a;if(L<=0.){frag=vec4(0);return;}
 uint pixel=uint(gl_FragCoord.x)+uint(gl_FragCoord.y)*8191u;pixelSeed=hash(pixel*9781u);randomDimension=0;rngState=hash(pixel*9781u+uint(pass+1)*6271u);importanceSum=0.;
 for(int j=0;j<spectrumCount;j++){vec4 c=texelFetch(coefficients,ivec2(j,0),0);float f=ppm*diameter/10.;sigmaS[j]=c.r*f;sigmaT[j]=(c.r+c.g)*f;primary[j]=1.;rgbWeight[j]=texelFetch(colourWeights,ivec2(j,0),0).rgb;importance[j]=max(1e-9,dot(abs(rgbWeight[j]),vec3(1)));importanceSum+=importance[j];}
 // Integrate the pixel footprint as well as scattering paths, especially at
 // the curved heel and meniscus where a single primary ray aliases caustics.
 vec2 jitter=(vec2(random01(),random01())-.5)/vec2(textureSize(accumulated,0));
 vec3 o,d;camera(imageUV+jitter*scatterWindow.zw,o,d);vec3 colour=cameraScattering(o,d);if(any(isnan(colour))||any(isinf(colour)))colour=vec3(0);
 vec4 previous=texelFetch(accumulated,ivec2(gl_FragCoord.xy),0);frag=vec4((previous.rgb*float(pass)+colour)/float(pass+1),L);
}
`;
 const sources={previewVial:`#version 300 es\n${geometry}\n${previewSource}`,glassVial:`#version 300 es\n${geometry}\n${glassSource}`,scatterVial:`#version 300 es\n${geometry}\n${scatterSource}`,scatterVialSide:`#version 300 es\n#define AREA_LIGHTING\n${geometry}\n${packetSource}`,previewCell:`#version 300 es\n#define CELL_GEOMETRY\n${geometry}\n${previewSource}`,glassCell:`#version 300 es\n#define CELL_GEOMETRY\n${geometry}\n${glassSource}`,scatterCell:`#version 300 es\n#define CELL_GEOMETRY\n${geometry}\n${scatterSource}`,scatterCellSide:`#version 300 es\n#define CELL_GEOMETRY\n#define AREA_LIGHTING\n${geometry}\n${packetSource}`,display:`#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform sampler2D base,scatter;
uniform vec2 scatterSize;
uniform vec2 size,screenOrigin;
uniform vec4 scatterWindow;
uniform float yaw,pitch,viewZoom,viewHeight;
uniform int pass;
uniform int containerType;
vec3 linearToSrgb(vec3 c){c=max(c,vec3(0));return mix(12.92*c,1.055*pow(c,vec3(1./2.4))-.055,step(vec3(.0031308),c));}
vec3 resolveGlass(vec3 centre){
 float aspect=size.x/size.y,scale=max(containerType>0?5.18:3.90,1.55/aspect)/viewZoom;
 float y=viewHeight+scale*((uv.y-.5)/cos(pitch)+aspect*(uv.x-.5)*tan(yaw)*tan(pitch));
 if(y<-.35||y>(containerType>0?4.72:2.90))return centre;
 // Reconstruct the pixel footprint in the highly curved glass. The moulded
 // base needs a wider footprint than the nearly cylindrical side wall.
 int radius=y<.50?2:1;ivec2 at=ivec2(uv*vec2(textureSize(base,0))),limits=textureSize(base,0)-1;vec3 sum=vec3(0);float total=0.;
 for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){
  if(abs(i)>radius||abs(j)>radius)continue;
  float wx=radius==1?(i==0?2.:1.):(i==0?6.:abs(i)==1?4.:1.);
  float wy=radius==1?(j==0?2.:1.):(j==0?6.:abs(j)==1?4.:1.);
  sum+=wx*wy*texelFetch(base,clamp(at+ivec2(i,j),ivec2(0),limits),0).rgb;total+=wx*wy;
 }
 return sum/total;
}
void main(){
 vec4 b=texture(base,uv);if(b.a<0.)discard;vec3 value=resolveGlass(b.rgb);
 if(pass>0&&b.a>0.){
   vec3 sum=vec3(0);float total=0.;
   // A geometry-guided spatial reconstruction reduces spectral/path noise.
   vec2 point=((uv-scatterWindow.xy)/scatterWindow.zw)*scatterSize-.5,f=fract(point);ivec2 origin=ivec2(floor(point));
   for(int y=0;y<=1;y++)for(int x=0;x<=1;x++){
     ivec2 p=clamp(origin+ivec2(x,y),ivec2(0),ivec2(scatterSize)-1);vec4 s=texelFetch(scatter,p,0);float w=(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y)*exp(-abs(s.a-b.a)*12.);
     if(s.a>0.){sum+=s.rgb*w;total+=w;}
   }
   if(total>0.)value+=sum/total;
 }
 frag=vec4(clamp(linearToSrgb(value),0.,1.),1.);
}
`,filter:`#version 300 es
precision highp float;
in vec2 uv;out vec4 frag;
uniform sampler2D image;
uniform vec2 imageSize,direction;
uniform int radius,stride,relativeGuide;
void main(){
 ivec2 at=ivec2(gl_FragCoord.xy),limits=ivec2(imageSize)-1;vec4 center=texelFetch(image,at,0);
 if(center.a<=0.){frag=vec4(0);return;}
 vec3 sum=vec3(0);float total=0.;
 for(int k=-9;k<=9;k++){
   if(abs(k)>radius)continue;ivec2 p=clamp(at+ivec2(direction)*k*max(1,stride),ivec2(0),limits);vec4 s=texelFetch(image,p,0);
   if(s.a>0.){float w=exp(-float(k*k)/max(1.,float(radius*radius)*.5))*exp(-abs(s.a-center.a)*(relativeGuide==1?6./(.05+min(s.a,center.a)):18.));sum+=w*s.rgb;total+=w;}
 }
 frag=vec4(total>0.?sum/total:center.rgb,center.a);
}
`,studio:`#version 300 es
precision highp float;
precision highp int;
uniform vec2 size;
uniform vec3 sourceWhiteRGB;
uniform sampler2D shadowTransmission;
uniform float liquidDiameter;
uniform vec4 viewLayout[10];
uniform float pitch,yaw,viewHeight,lightGain,labelSpace;
uniform int lighting,containerType,columns,rows,sampleCount,visibleMask;
out vec4 frag;
const float STUDIO_FLOOR=.1199;
const float STUDIO_BEND=-1.70;
const float STUDIO_RADIUS=3.0;
uniform float sideAzimuth;
vec3 sideLampNormal(){return vec3(-cos(sideAzimuth),0,sin(sideAzimuth));}
vec3 sideLampTangent(){return vec3(sin(sideAzimuth),0,cos(sideAzimuth));}
vec3 sideLampCentre(){return sideLampNormal()*(lighting==3?3.5:1.25)+vec3(0,lighting==3?4.4:2.45,0);}
float sideLampWidth(){return lighting==3?.90:.70;}
float sideLampHeight(){return lighting==3?.85:.80;}
float sideLampGeometricPdf(vec3 o,vec3 d){vec3 n=sideLampNormal(),c=sideLampCentre();float dotN=dot(d,n);if(abs(dotN)<1e-7)return 0.;float t=dot(c-o,n)/dotN;vec3 p=o+t*d-c;if(t<=0.||abs(p.y)>sideLampHeight()||abs(dot(p,sideLampTangent()))>sideLampWidth())return 0.;return t*t/(4.*sideLampHeight()*sideLampWidth()*abs(dotN));}
float studioBlend(float x){x=clamp(x,0.,1.);return x*x*(3.-2.*x);}
// The cyclorama is invariant across the camera's horizontal axis. Its floor,
// quarter-cylinder bend and upright wall meet with continuous tangents.
bool studioSurface(vec3 o,vec3 d,out vec3 point,out vec3 normal){
 float nearest=1e20;point=vec3(0);normal=vec3(0,0,1);
 if(d.y<-.0000001){float t=(STUDIO_FLOOR-o.y)/d.y;if(t>0.&&o.z+t*d.z>=STUDIO_BEND){nearest=t;normal=vec3(0,1,0);}}
 vec2 centre=vec2(STUDIO_FLOOR+STUDIO_RADIUS,STUDIO_BEND),q=o.yz-centre;
 float a=dot(d.yz,d.yz),b=dot(q,d.yz),c=dot(q,q)-STUDIO_RADIUS*STUDIO_RADIUS,delta=b*b-a*c;
 if(a>.00000001&&delta>=0.){
  vec2 roots=vec2(-b-sqrt(delta),-b+sqrt(delta))/a;
  for(int k=0;k<2;k++){float t=roots[k];vec3 p=o+t*d;if(t>0.&&t<nearest&&p.z<=STUDIO_BEND+.000001&&p.z>=STUDIO_BEND-STUDIO_RADIUS-.000001&&p.y>=STUDIO_FLOOR-.000001&&p.y<=centre.x+.000001){nearest=t;normal=vec3(0,(centre.x-p.y)/STUDIO_RADIUS,(centre.y-p.z)/STUDIO_RADIUS);}}
 }
 if(d.z<-.0000001){float t=(STUDIO_BEND-STUDIO_RADIUS-o.z)/d.z;if(t>0.&&t<nearest&&o.y+t*d.y>=centre.x){nearest=t;normal=vec3(0,0,1);}}
 if(nearest==1e20)return false;point=o+nearest*d;return true;
}
vec3 studioLocal(vec3 p){float c=cos(yaw),s=sin(yaw);return vec3(c*p.x-s*p.z,p.y,s*p.x+c*p.z);}
vec3 studioWorld(vec3 p){float c=cos(yaw),s=sin(yaw);return vec3(c*p.x+s*p.z,p.y,-s*p.x+c*p.z);}
// Direct-transmission shadow model: finite source, actual cross-section and
// liquid path. Refraction/caustic focusing is not included in this projection.
float studioChord(vec3 o,vec3 d,float bottom,float top,float radius,vec2 halfSize,float limit){
 float lo=0.,hi=limit;
 if(abs(d.y)<1e-8){if(o.y<bottom||o.y>top)return 0.;}else{vec2 v=(vec2(bottom,top)-o.y)/d.y;lo=max(lo,min(v.x,v.y));hi=min(hi,max(v.x,v.y));}
 if(containerType==0){float a=dot(d.xz,d.xz),b=dot(o.xz,d.xz),c=dot(o.xz,o.xz)-radius*radius;if(a<1e-12){if(c>0.)return 0.;}else{float delta=b*b-a*c;if(delta<0.)return 0.;vec2 v=vec2(-b-sqrt(delta),-b+sqrt(delta))/a;lo=max(lo,v.x);hi=min(hi,v.y);}}
 else for(int k=0;k<2;k++){int i=k==0?0:2;float h=halfSize[k];if(abs(d[i])<1e-8){if(abs(o[i])>h)return 0.;}else{vec2 v=(vec2(-h,h)-o[i])/d[i];lo=max(lo,min(v.x,v.y));hi=min(hi,max(v.x,v.y));}}
 return max(0.,hi-lo);
}
vec3 studioProjectedPath(vec3 point,int k){
 int reverse=((k&1)<<5)|((k&2)<<3)|((k&4)<<1)|((k&8)>>1)|((k&16)>>3)|((k&32)>>5);
 vec3 lamp=sideLampCentre()+sideLampTangent()*((float(reverse)+.5)/64.*2.-1.)*sideLampWidth()+vec3(0,((float(k)+.5)/64.*2.-1.)*sideLampHeight(),0);
 vec3 delta=lamp-point,worldD=normalize(delta),o=studioWorld(point),d=studioWorld(worldD);float lampDistance=length(delta);float cap=containerType==0?studioChord(o,d,2.95,3.46,.57,vec2(0),lampDistance):0.;
 float path=studioChord(o,d,.315,containerType==0?2.15:3.9542,.50,vec2(.50,containerType==1?.05:.50),lampDistance);
 float glass=studioChord(o,d,.12,containerType==0?2.95:4.62,.545,vec2(.625,containerType==1?.175:.625),lampDistance);
 float irradiance=max(0.,worldD.y)*abs(dot(worldD,sideLampNormal()))/dot(delta,delta);
 return vec3(path,cap>1e-6?0.:glass>1e-6?.92:1.,irradiance);
}
float studioFootprint(vec2 p){
 if(containerType==0)return length(p)-.545;
 vec2 halfSize=vec2(.625,containerType==1?.175:.625),q=abs(p)-(halfSize-vec2(.025));
 return length(max(q,0.))+min(max(q.x,q.y),0.)-.025;
}
float studioShadow(vec3 p){
 // Shadow coordinates follow the actual rectangular/circular footprint.
 float c=cos(yaw),s=sin(yaw);vec2 q=vec2(c*p.x+s*p.z,-s*p.x+c*p.z);
 if(length(q)>2.65)return 1.;
 float contact=.38*exp(-pow(max(studioFootprint(q),0.)/.085,2.));
 vec2 displacement=lighting>=2?vec2(.98*cos(sideAzimuth),-.98*sin(sideAzimuth)-.08):lighting==1?vec2(0,.38):vec2(.38,-.64);
 float t=clamp(dot(q,displacement)/dot(displacement,displacement),0.,1.);float distance=max(studioFootprint(q-t*displacement),0.);
 float soft=(lighting==1?.12:.19)*(1.-.45*t)*exp(-pow(distance/(.12+.14*t),2.));
 return (1.-contact)*(lighting==3?1.:1.-soft);
}
float studioMaterial(float up,float source){
 float f=studioBlend(up);
 if(lighting==3)return mix(.84,.136+.619*lightGain,f);
 if(lighting==0)return mix(.014,.027+.018*lightGain,f);
 if(lighting==1)return (.06+.80*source+.02*lightGain)*(1.-.20*f);
 return mix(.014+source,.027+.024*lightGain,f);
}
float studioCameraSource(){return lighting==1?1.:lighting==2?exp((inversesqrt(1.+.65*.65)-1.)/(.18*.18)):0.;}
void studioCamera(vec2 point,float scale,out vec3 origin,out vec3 direction){
 // A shallow studio view keeps the support visible even for a strictly
 // normal cuvette view; its contact line stays at the container's foot.
 float angle=max(pitch,.10);
 float centre=STUDIO_FLOOR+(viewHeight-STUDIO_FLOOR)*cos(pitch)/cos(angle);
 direction=vec3(0,-sin(angle),-cos(angle));
 origin=vec3(scale*point.x,centre+12.*sin(angle)+scale*point.y*cos(angle),12.*cos(angle)-scale*point.y*sin(angle));
 // Reparameterise the same ray above the support, also for very wide fields.
 origin-=direction*max(0.,(STUDIO_FLOOR+.5-origin.y)/(-direction.y));
}
float studioSrgb(float x){return x<=.0031308?12.92*x:1.055*pow(x,1./2.4)-.055;}

vec3 projectedShadow(vec3 p,int index){
 vec3 sum=vec3(0);float total=0.;
 for(int k=0;k<64;k++){vec3 path=studioProjectedPath(p,k);float L=path.x*(containerType==0?liquidDiameter/10.:1.),f=clamp(L/8.,0.,1.)*767.;int i=int(f);vec3 t=mix(texelFetch(shadowTransmission,ivec2(i,index),0).rgb,texelFetch(shadowTransmission,ivec2(min(i+1,767),index),0).rgb,fract(f));sum+=path.z*path.y*t;total+=path.z;}
 float direct=.82*lightGain;return (.18*vec3(1)+direct*sum/max(1e-20,total)/max(sourceWhiteRGB,vec3(1e-6)))/(.18+direct);
}
void main(){
 float rowHeight=size.y/float(rows),columnWidth=size.x/float(columns),height=max(8.,rowHeight-labelSpace);
 int row=min(rows-1,int((size.y-gl_FragCoord.y)/rowHeight)),column=min(columns-1,int(gl_FragCoord.x/columnWidth));
 float rowBottom=size.y-float(row+1)*rowHeight,base=studioMaterial(0.,studioCameraSource());
 int index=row*columns+column;vec4 viewRect=index<sampleCount?viewLayout[index]:vec4(0);
 if(viewRect.z<=0.)viewRect=vec4((float(column)+.5)*columnWidth,rowBottom+labelSpace+.5*height,height,max(containerType==0?3.90:5.18,1.55*height/columnWidth));
 vec2 point=(gl_FragCoord.xy-viewRect.xy)/viewRect.z;
 float scale=viewRect.w;vec3 o,d,p,n;studioCamera(point,scale,o,d);float value=base;vec3 chromatic=vec3(1);
 if(studioSurface(o,d,p,n)){
  float shadow=1.,spacing=scale*columnWidth/viewRect.z;
  for(int c=0;c<10;c++){int k=c-column;if(c>=0&&c<columns&&row*columns+c<sampleCount&&(visibleMask&(1<<(row*columns+c)))!=0){vec3 local=p-vec3(float(k)*spacing,0,0);shadow*=studioShadow(local);if(lighting==3)chromatic*=mix(vec3(1),projectedShadow(local,row*columns+c),pow(max(n.y,0.),2.));}}
  shadow=mix(1.,shadow,pow(max(n.y,0.),6.));
  value=studioMaterial(n.y,studioCameraSource())*shadow;
 }
 // Caption space fades the floor back into the same backdrop between rows.
 float fade=labelSpace>0.?studioBlend((gl_FragCoord.y-rowBottom)/labelSpace):1.;
 vec3 colour=mix(vec3(base),value*chromatic,fade)*sourceWhiteRGB;frag=vec4(studioSrgb(max(0.,colour.r)),studioSrgb(max(0.,colour.g)),studioSrgb(max(0.,colour.b)),1.);
}
`};
 for(const name of ['previewVial','glassVial','scatterVial','scatterVialSide','previewCell','glassCell','scatterCell','scatterCellSide'])sources[name+'Card']=sources[name].replace('#version 300 es','#version 300 es\n#define ENABLE_CARD');
 sources.draft=`#version 300 es
precision highp float;
precision highp int;
in vec2 uv;out vec4 frag;
uniform vec2 size,meniscusRange;
uniform float yaw,pitch,viewZoom,viewHeight,diameter,lightGain,samplePpm,meniscusBase;
uniform int containerType,testCard,hasLiquidSurface,draftScattering;
uniform int lighting;
uniform sampler2D transmission,coefficients,colourWeights,cardLogo;
// Deliberately small startup program. Geometry and illumination are an
// approximation until the exact interface trace and Monte Carlo image replace
// it. Spectral extinction and scattering still use the chosen Mie population.
float shape(vec3 p){
 if(containerType>0){vec3 q=abs(p-vec3(0,2.37,0))-vec3(.60,2.225,containerType==1?.15:.60);return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.)-.025;}
 float radius=mix(.557,.435,smoothstep(2.42,2.65,p.y));vec2 q=vec2(length(p.xz)-radius,abs(p.y-1.47)-1.29);return length(max(q,0.))+min(max(q.x,q.y),0.)-.06;
}
float capShape(vec3 p){vec2 q=vec2(length(p.xz)-.592,abs(p.y-3.09)-.33);return length(max(q,0.))+min(max(q.x,q.y),0.)-.02;}
float objectDistance(vec3 p){return containerType>0?shape(p):min(shape(p),capShape(p));}
float liquidPath(vec3 o,vec3 d){
 float low=0.,high=40.;
 for(int axis=0;axis<3;axis++){
  if(containerType==0&&axis!=1)continue;float a=axis==1?.315:axis==0?-.475:containerType==1?-.05:-.5,b=axis==1?meniscusBase:axis==0?.475:containerType==1?.05:.5;
  if(abs(d[axis])<1e-7){if(o[axis]<a||o[axis]>b)return 0.;}else{vec2 t=(vec2(a,b)-o[axis])/d[axis];low=max(low,min(t.x,t.y));high=min(high,max(t.x,t.y));}
 }
 if(containerType==0){float a=dot(d.xz,d.xz),b=dot(o.xz,d.xz),c=dot(o.xz,o.xz)-.25,delta=b*b-a*c;if(delta<0.)return 0.;if(a>1e-8){vec2 t=vec2(-b-sqrt(delta),-b+sqrt(delta))/a;low=max(low,t.x);high=min(high,t.y);}}
 return max(0.,high-low)*diameter/10.;
}
vec3 beer(float L){float x=clamp(L/8.,0.,1.)*767.;int i=int(x);return mix(texelFetch(transmission,ivec2(i,0),0).rgb,texelFetch(transmission,ivec2(min(767,i+1),0),0).rgb,fract(x));}
vec3 paper(vec3 o,vec3 d,out bool visible){
 visible=false;if(testCard==0)return vec3(0);float c=cos(yaw),s=sin(yaw);o=vec3(c*o.x-s*o.z,o.y,s*o.x+c*o.z);d=vec3(c*d.x-s*d.z,d.y,s*d.x+c*d.z);if(d.z>=0.)return vec3(0);
 float oldHeight=.9*(containerType==0?3.34:4.5),anchorX=(1179.-203.)/2098.-.5,anchorY=(1004.-605.)/801.-.5,bottom=viewHeight-anchorY*.9*oldHeight-oldHeight*.5,ceiling=containerType==0?2.91:meniscusRange.x-.06,h=.85*max(.5,ceiling-bottom),w=h*2098./801.;
 vec3 point=o+((- .94-o.z)/d.z)*d;vec2 centre=vec2(-anchorX*.9*w,bottom+h*.5),q=point.xy-centre,edge=abs(q)-vec2(w,h)*.5+.08*h;if(length(max(edge,0.))+min(max(edge.x,edge.y),0.)>.08*h)return vec3(0);
 visible=true;vec2 st=q/(.9*vec2(w,h))+.5;vec3 rgb=vec3(1);if(all(greaterThanEqual(st,vec2(0)))&&all(lessThanEqual(st,vec2(1))))rgb=texture(cardLogo,mix(vec2(203./2504.,173./1177.),vec2(2301./2504.,974./1177.),st)).rgb;
 return .88*mix(rgb/12.92,pow((rgb+.055)/1.055,vec3(2.4)),step(vec3(.04045),rgb))*(.18+lightGain*(lighting==0?.70:lighting==1?.50:.55));
}
void main(){
 float aspect=size.x/size.y,scale=max(containerType>0?5.18:3.90,1.55/aspect)/viewZoom;vec2 q=(uv-.5)*vec2(aspect,1.);
 vec3 d=normalize(vec3(-sin(yaw)*cos(pitch),-sin(pitch),-cos(yaw)*cos(pitch))),right=normalize(cross(d,vec3(0,1,0))),up=cross(right,d),o=vec3(0,viewHeight,0)-d*12.+scale*(q.x*right+q.y*up);
 bool card;vec3 behind=paper(o,d,card);if(!card)behind=vec3(lighting==1?.84:lighting==3?.64:.018);
 float t=9.;bool hit=false;vec3 p;
 for(int step=0;step<80;step++){p=o+t*d;float distance=objectDistance(p);if(distance<.001){hit=true;break;}t+=max(.001,distance);if(t>16.)break;}
 if(!hit){frag=vec4(behind,card?0.:-1.);return;}
 vec2 e=vec2(.001,0);vec3 n=normalize(vec3(objectDistance(p+e.xyy)-objectDistance(p-e.xyy),objectDistance(p+e.yxy)-objectDistance(p-e.yxy),objectDistance(p+e.yyx)-objectDistance(p-e.yyx)));
 if(containerType==0&&capShape(p)<shape(p)){float a=atan(p.z,p.x),grooves=.9+.1*cos(144.*a);frag=vec4(vec3(.013+.025*max(dot(n,normalize(vec3(-.4,.7,.6))),0.))*grooves,0);return;}
 float L=liquidPath(o,d),cosine=max(0.,dot(n,-d)),F=.04+.96*pow(1.-cosine,5.);vec3 reflection=vec3((.03+.55*pow(max(0.,dot(reflect(d,n),normalize(vec3(-.5,.2,1.)))),16.))*lightGain),colour=behind*beer(L)*(1.-F)+F*reflection;
 if(L>0.&&draftScattering==1){
  vec3 scattering=vec3(0);float illumination=lighting==0?.75*lightGain:lighting==1?.38*lightGain:.75*lightGain;
  for(int band=0;band<41;band++){vec4 c=texelFetch(coefficients,ivec2(band,0),0);float extinction=max(1e-12,(c.r+c.g)*samplePpm),albedo=c.r/max(1e-12,c.r+c.g),phase=lighting==0?max(.08,.7*(1.-c.b)):lighting==1?1.:max(.08,1.-c.b*c.b);scattering+=texelFetch(colourWeights,ivec2(band,0),0).rgb*(albedo*(1.-exp(-extinction*L))*illumination*phase);}
  colour+=scattering;
 }
 frag=vec4(colour,L);
}
`;
 class LightboxRenderer{
  constructor(canvas,{onProgress=()=>{},onError=()=>{},fixedSize=null,gridCap=160,labelSpace=29,adaptive=true,initialSettings={},transparentBackground=false,sideMaximum=512,deferComposition=false,workBatch=1,baseMaximum=328}={}){
   this.deferComposition=deferComposition;this.workBatch=Math.max(1,Math.min(8,workBatch));this.baseMaximum=baseMaximum;this.canvas=canvas;this.transparentBackground=transparentBackground;this.onProgress=onProgress;this.onError=onError;this.fixedSize=fixedSize;this.gridCap=gridCap;this.labelSpace=labelSpace;this.adaptive=adaptive;this.samples=[];this.jobs=new Map();this.views=new Map();this.optical=new Map();this.settings={lighting:'room',diameter:10,gain:1,pitch:.13,yaw:0,container:'vial',walls:'clear',illuminant:'D65',whiteBalance:'source',sideAzimuth:0,...initialSettings};this.maximum=null;this.sideMaximum=sideMaximum;this.running=false;this.scheduled=false;this.disposed=false;this.error=null;this.reconcileNeeded=true;this.paintAll=true;this.fence=null;this.lastNotice=0;
   this.quality=root.MieRenderQuality.preview(initialSettings);if(!fixedSize){this.gridCap=this.quality.grid;this.baseMaximum=this.quality.base;this.sideMaximum=this.quality.side;this.workBatch=2;}this.lastCompose=0;
   this.progressive=!fixedSize;this.draftPasses=8;this.glassTileSize=64;this.scatterTileSize=128;
   const gl=this.gl=canvas.getContext('webgl2',{alpha:transparentBackground,antialias:false,preserveDrawingBuffer:true});
   if(!gl||!gl.getExtension('EXT_color_buffer_float'))throw Error('The vial renderer needs WebGL 2 with floating-point colour buffers.');
   this.parallel=gl.getExtension('KHR_parallel_shader_compile');this.compiling=true;
   this.programs={};
   const shader=(type,source)=>{const s=gl.createShader(type);gl.shaderSource(s,source);gl.compileShader(s);if(!this.parallel&&!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(s));return s;};
   this.shader=shader;this.vs=shader(gl.VERTEX_SHADER,vertex);for(const name of ['draft','display','filter'])this.compile(name);
   this.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,this.buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
   const profile=MieIlluminants.profile(this.settings.illuminant,this.settings.whiteBalance);this.shadowTransmission=this.texture(768,1,new Float32Array(768*4).fill(1));this.sequence=this.uintTexture(MieSobol.count,MieSobol.dimensions,MieSobol.data());this.weights=profile.rgbWeights.slice();this.whiteRGB=profile.whiteRGB;this.colourWeights=this.texture(41,1,this.weights);
   this.cardLogo=this.texture(1,1,new Float32Array([1,1,1,1]));MieCard.ready.then(image=>{if(this.disposed)return;const g=this.gl;g.activeTexture(g.TEXTURE9);g.bindTexture(g.TEXTURE_2D,this.cardLogo);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,true);g.texImage2D(g.TEXTURE_2D,0,g.RGBA,g.RGBA,g.UNSIGNED_BYTE,image);g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,false);g.generateMipmap(g.TEXTURE_2D);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.LINEAR_MIPMAP_LINEAR);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.LINEAR);for(const v of this.views.values())if(v.sample.testCard)v.dirty=true;this.paintAll=true;this.schedule();}).catch(e=>this.fail(e.message));
   this.lost=e=>{e.preventDefault();this.fail('The graphics context was lost. Reopen or retry the lightbox.');};canvas.addEventListener('webglcontextlost',this.lost);
   this.observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{this.reconcileNeeded=true;this.schedule();}):{observe(){},disconnect(){}};this.observer.observe(canvas);
  }
  static background(s){return MieStudio.background(s);}
  texture(w,h,data=null,one=false){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);for(const p of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,p,g.NEAREST);for(const p of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,p,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,one?g.R32F:g.RGBA32F,w,h,0,one?g.RED:g.RGBA,g.FLOAT,data);return t;}
  uintTexture(w,h,data){const g=this.gl,t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);for(const p of [g.TEXTURE_MIN_FILTER,g.TEXTURE_MAG_FILTER])g.texParameteri(g.TEXTURE_2D,p,g.NEAREST);for(const p of [g.TEXTURE_WRAP_S,g.TEXTURE_WRAP_T])g.texParameteri(g.TEXTURE_2D,p,g.CLAMP_TO_EDGE);g.texImage2D(g.TEXTURE_2D,0,g.R32UI,w,h,0,g.RED_INTEGER,g.UNSIGNED_INT,data);return t;}
  target(w,h){const g=this.gl,t=this.texture(w,h),f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);if(g.checkFramebufferStatus(g.FRAMEBUFFER)!==g.FRAMEBUFFER_COMPLETE)throw Error('The graphics buffer could not be created.');return {t,f,w,h};}
  dropTarget(t){if(t){this.gl.deleteTexture(t.t);this.gl.deleteFramebuffer(t.f);}}
  dropView(v){for(const t of [v.quick,v.guide,v.film,v.fallback,v.fullPreview,...(v.accum||[]),...(v.filtered||[])])this.dropTarget(t);if(v.T)this.gl.deleteTexture(v.T);if(v.meniscus)this.gl.deleteTexture(v.meniscus);}
  compile(name){const g=this.gl,fs=this.shader(g.FRAGMENT_SHADER,sources[name]),p=g.createProgram();g.attachShader(p,this.vs);g.attachShader(p,fs);g.linkProgram(p);if(!this.parallel&&!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));this.programs[name]={p,uniform:new Map(),ready:!this.parallel};g.deleteShader(fs);g.flush();this.compiling=true;}
  preparePrograms(){
   const mode=this.settings.container==='vial'?'Vial':'Cell',g=this.gl;this.hasCards=this.samples.some(s=>s.testCard);const card=this.hasCards?'Card':'',basic=['draft','display','filter'],names=[...basic],all=[...this.views.values()],previewsReady=all.length===this.samples.length&&all.every(v=>!v.dirty);
   // Compile the expensive transport programs only after the gallery is visible.
   if(previewsReady&&!this.previewOnly)names.push('studio',this.scatterName());
   if(previewsReady&&!this.previewOnly&&(!this.progressive||all.every(v=>!v.draft||v.passes>=this.draftPasses)))names.push('preview'+mode+card,'glass'+mode+card);
   for(const name of names){if(!this.programs[name])this.compile(name);const entry=this.programs[name];if(!entry.ready){if(this.parallel&&!g.getProgramParameter(entry.p,this.parallel.COMPLETION_STATUS_KHR))continue;if(!g.getProgramParameter(entry.p,g.LINK_STATUS))throw Error([g.getProgramInfoLog(entry.p),...(g.getAttachedShaders(entry.p)||[]).map(shader=>g.getShaderInfoLog(shader))].filter(Boolean).join('\n')||'The container image program could not be prepared.');entry.ready=true;if(name==='studio')this.paintAll=true;}}
   this.glassReady=!!this.programs['glass'+mode+card]?.ready&&!!this.programs['preview'+mode+card]?.ready;this.scatterReady=!!this.programs[this.scatterName()]?.ready;this.compiling=names.some(name=>!this.programs[name]?.ready);return basic.every(name=>this.programs[name].ready);
  }
  scatterName(){return 'scatter'+(this.settings.container==='vial'?'Vial':'Cell')+(this.settings.lighting.startsWith('side')?'Side':'')+(this.hasCards?'Card':'');}
  use(name){if(name==='scatter')name=this.scatterName();else if(name==='preview'||name==='glass')name+=(this.settings.container==='vial'?'Vial':'Cell')+(this.hasCards?'Card':'');if(!this.programs[name])this.compile(name);this.active=this.programs[name];this.gl.useProgram(this.active.p);}
  uniform(name){if(!this.active.uniform.has(name))this.active.uniform.set(name,this.gl.getUniformLocation(this.active.p,name));return this.active.uniform.get(name);}
  f(n,v){this.gl.uniform1f(this.uniform(n),v);}i(n,v){this.gl.uniform1i(this.uniform(n),v);}vec(n,x,y){this.gl.uniform2f(this.uniform(n),x,y);}
  bind(n,t,unit){const g=this.gl;g.activeTexture(g.TEXTURE0+unit);g.bindTexture(g.TEXTURE_2D,t);this.i(n,unit);}
  surface(v){const key=JSON.stringify([v.sample.particle.med,this.settings.container,this.settings.diameter,this.settings.wettingMode,this.settings.contactAngle,this.settings.surfaceTension,this.settings.solventDensity]);if(v.wettingKey===key)return;v.wetting=MieWetting.profile(v.sample.particle,this.settings);if(v.meniscus)this.gl.deleteTexture(v.meniscus);v.meniscus=this.texture(v.wetting.width,2,v.wetting.data,true);v.wettingKey=key;}
  zoom(v){const a=v.w/v.h,base=Math.max(this.settings.container==='vial'?3.9:5.18,1.55/a);v.cameraScale=v.projectionScale||base;return base/v.cameraScale;}
  scatteringWindow(sample,width,height,projectionScale=null){
   if(!sample.testCard)return [0,0,1,1];const s=this.settings,a=width/height,scale=projectionScale||MieCard.scale(s,a),view=s.container==='vial'?1.76:2.39,cy=Math.cos(s.yaw),sy=Math.sin(s.yaw),cp=Math.cos(s.pitch),sp=Math.sin(s.pitch),lo=[1,1],hi=[0,0];
   for(const x of [-.67,.67])for(const z of [-.67,.67])for(const y of [.08,s.container==='vial'?3.48:4.74]){const u=.5+(cy*x-sy*z)/(scale*a),v=.5+(-sy*sp*x+cp*(y-view)-cy*sp*z)/scale;lo[0]=Math.min(lo[0],u);lo[1]=Math.min(lo[1],v);hi[0]=Math.max(hi[0],u);hi[1]=Math.max(hi[1],v);}
   for(let k=0;k<2;k++){const pad=3/(k?height:width);lo[k]=Math.max(0,lo[k]-pad);hi[k]=Math.min(1,hi[k]+pad);}return [lo[0],lo[1],Math.max(.001,hi[0]-lo[0]),Math.max(.001,hi[1]-lo[1])];
  }
  common(v){this.surface(v);const s=this.settings,cu=s.container!=='vial';this.vec('size',v.w,v.h);this.gl.uniform4fv(this.uniform('scatterWindow'),v.scatterWindow||[0,0,1,1]);this.f('sideAzimuth',(s.sideAzimuth||0)*Math.PI/180);this.f('yaw',s.yaw);this.f('pitch',s.pitch);this.f('viewZoom',this.zoom(v));this.f('viewHeight',cu?2.39:1.76);this.f('diameter',cu?10:s.diameter);this.f('lightGain',s.gain);this.f('liquidIndex',v.optics.data.mediumIndex);this.i('containerType',s.container==='cuvette1'?1:s.container==='cuvette10'?2:0);this.i('mattWalls',s.walls==='matt'?1:0);this.i('lighting',{room:0,back:1,side:2,'side-white':3}[s.lighting]);this.i('audit',this.audit||0);this.i('profileSteps',cu?128:256);this.i('profileRefinements',18);this.i('profileCount',cu?6:7);this.i('interfaceBudget',14);this.i('glassBudget',192);this.i('scatterBudget',256);this.bind('sequenceSamples',this.sequence,8);this.bind('cardLogo',this.cardLogo,9);this.i('testCard',v.sample.testCard?1:0);this.i('cardBands',41);this.f('samplePpm',v.sample.phi*1e6);this.i('spectrumCount',41);this.i('spectralLanes',s.lighting.startsWith('side')?1:3);this.i('edgeSamples',4);this.i('vialCount',1);this.i('directLighting',this.directLighting??1);this.bind('transmission',v.T,0);this.bind('coefficients',v.optics.coefficients,1);this.bind('phaseTexture',v.optics.phase,2);this.bind('colourWeights',this.colourWeights,3);this.bind('phaseDensity',v.optics.density,4);this.bind('meniscusProfile',v.meniscus,6);this.vec('meniscusExtent',...v.wetting.extent);this.vec('meniscusRange',...v.wetting.range);this.f('meniscusBase',v.wetting.base);this.f('meniscusSign',v.wetting.sign);this.i('hasLiquidSurface',v.sample.particle.med==='air'?0:1);}
  opticalData(key,data){const old=this.optical.get(key);if(old?.data===data)return old;if(old)for(const k of ['coefficients','phase','density'])this.gl.deleteTexture(old[k]);const o={data,coefficients:this.texture(41,1,data.coefficients),phase:this.texture(512,41,data.phase,true),density:this.texture(data.densityWidth,41,data.density,true)};this.optical.set(key,o);return o;}
  transmission(v){v.transmissionData=MieShadow.table(v.optics.data.coefficients,v.sample.phi,this.weights);return this.texture(768,1,v.transmissionData);}
  updateShadowAtlas(){const n=Math.max(1,this.samples.length),data=new Float32Array(768*n*4);for(let i=0;i<n;i++){const v=this.views.get(this.samples[i]?.id);if(v?.transmissionData)data.set(v.transmissionData,i*768*4);else for(let j=0;j<768;j++)data.set([...this.whiteRGB,1],(i*768+j)*4);}this.gl.deleteTexture(this.shadowTransmission);this.shadowTransmission=this.texture(768,n,data);}

  setSamples(samples,jobs){this.samples=samples;this.jobs=jobs;this.reconcileNeeded=true;this.paintAll=true;this.schedule();}
  setSettings(settings){if(!this.fixedSize&&settings.renderQuality&&settings.renderQuality!==this.settings.renderQuality){this.settings.renderQuality=settings.renderQuality;this.quality=root.MieRenderQuality.preview(settings);this.gridCap=this.quality.grid;this.baseMaximum=this.quality.base;this.sideMaximum=this.quality.side;this.reconcileNeeded=true;this.schedule();}const keys=['lighting','diameter','gain','pitch','yaw','container','walls','wettingMode','contactAngle','surfaceTension','solventDensity','illuminant','whiteBalance','sideAzimuth'];const colourChanged=['illuminant','whiteBalance'].some(k=>settings[k]!==undefined&&this.settings[k]!==settings[k]);if(keys.some(k=>settings[k]!==undefined&&this.settings[k]!==settings[k])){if(settings.container&&settings.container!==this.settings.container)this.compiling=true;for(const k of keys)if(settings[k]!==undefined)this.settings[k]=settings[k];if(colourChanged){const p=MieIlluminants.profile(this.settings.illuminant,this.settings.whiteBalance);this.weights.set(p.rgbWeights);this.whiteRGB=p.whiteRGB;this.gl.deleteTexture(this.colourWeights);this.colourWeights=this.texture(41,1,this.weights);for(const v of this.views.values()){this.gl.deleteTexture(v.T);v.T=this.transmission(v);}}for(const v of this.views.values())v.dirty=true;this.reconcileNeeded=true;this.paintAll=true;this.schedule();}}
  reconcile(){
   const g=this.gl,c=this.canvas,dpr=this.fixedSize?1:Math.min(root.devicePixelRatio||1,1.25),w=this.fixedSize?.width||Math.max(1,Math.round(c.clientWidth*dpr)),h=this.fixedSize?.height||Math.max(1,Math.round(c.clientHeight*dpr)),n=this.samples.length,cols=MieLightboxModel.columns(n),rows=Math.ceil(n/cols)||1;
   if(w!==c.width||h!==c.height){c.width=w;c.height=h;this.paintAll=true;}
   const viewportKey=this.fixedSize?'fixed':[innerWidth,innerHeight,root.devicePixelRatio||1,this.settings.renderQuality].join(':');const ids=new Set(this.samples.map(s=>s.id));for(const [id,v] of this.views)if(!ids.has(id)){this.dropView(v);this.views.delete(id);}
   this.samples.forEach((s,index)=>{
    const key=MieLightboxModel.key(s),job=this.jobs.get(key),data=job?.data||job?.preview;if(!data){const old=this.views.get(s.id);if(old){this.dropView(old);this.views.delete(s.id);}return;}
    const row=Math.floor(index/cols),col=index%cols,left=Math.floor(col*w/cols),right=Math.floor((col+1)*w/cols),top=Math.floor(row*h/rows),bottom=Math.floor((row+1)*h/rows),label=Math.round(this.labelSpace*dpr),height=Math.max(8,bottom-top-label),normalWidth=Math.max(8,Math.min(right-left,Math.round(height*(this.isSeidel?.90:.55))));
    let v=this.views.get(s.id);if(v&&v.key!==key){this.dropView(v);this.views.delete(s.id);v=null;}
    const cardChanged=v&&!!v.sample.testCard!==!!s.testCard,cardGeometry=s.testCard?JSON.stringify([this.settings.container,this.settings.diameter,this.settings.pitch,this.settings.yaw,MieCard.dimensions(this.settings,s.particle)]):'';
    let projectionScale=this.isSeidel?Math.max(3.9,2.85*height/normalWidth):Math.max(this.settings.container==='vial'?3.9:5.18,1.55*height/normalWidth);
    const card=s.testCard?MieCard.dimensions(this.settings,s.particle):null,width=card?Math.max(normalWidth,Math.ceil(height*(card.width+2*Math.abs(card.centreX)+.12*card.height)/projectionScale)):normalWidth;
    if(v&&v.sample.phi!==s.phi){v.sample={...s};g.deleteTexture(v.T);v.T=this.transmission(v);v.dirty=true;}
    if(!v){v={id:s.id,key,sample:{...s},optics:this.opticalData(key,data),passes:0,dirty:true,gridCap:this.gridCap,draft:this.progressive};v.T=this.transmission(v);this.views.set(s.id,v);}
    if(v.optics.data!==data){v.optics=this.opticalData(key,data);if(v.accum)this.resetScattering(v,true);}
    v.gridCap=this.gridCap;const allocate=!v.film||v.containerType!==this.settings.container||v.viewportKey!==viewportKey||v.gridCap!==v.allocatedGridCap||cardChanged||v.cardGeometry!==cardGeometry;
    v.sample={...s};
    if(allocate){const scale=this.fixedSize?1:Math.min(1,this.quality.cap/Math.max(width,height)),rw=Math.max(8,Math.round(width*scale)),rh=Math.max(8,Math.round(height*scale));const window=this.scatteringWindow(s,rw,rh,projectionScale),sw=Math.min(Math.max(8,Math.round(rw*window[2])),this.progressive?48:this.gridCap,v.gridCap),sh=Math.max(1,Math.round(rh*window[3]*sw/(rw*window[2]))),qw=Math.min(rw,64),qh=Math.max(1,Math.round(rh*qw/rw));
     for(const t of [v.quick,v.guide,v.film,v.fallback,v.fullPreview,...(v.accum||[]),...(v.filtered||[])])this.dropTarget(t);Object.assign(v,{w:rw,h:rh,sw,sh,scatterWindow:window,projectionScale,quick:this.target(qw,qh),guide:null,film:this.target(rw,rh),fallback:null,fullPreview:null,accum:[this.target(sw,sh),this.target(sw,sh)],filtered:[this.target(sw,sh),this.target(sw,sh)],passes:0,dirty:true,beautyReady:false,draft:this.progressive,guideReady:false,guideCursor:0,glassCursor:0,scatterCursor:0,detailWork:0});
    }
    v.containerType=this.settings.container;v.cardGeometry=cardGeometry;v.viewportKey=viewportKey;v.allocatedGridCap=v.gridCap;const fit=height/v.h*(v.projectionScale||projectionScale)/projectionScale;v.displayW=Math.max(1,Math.floor(v.w*fit));v.displayH=Math.max(1,Math.floor(v.h*fit));v.x=left+Math.floor((right-left-v.displayW)/2);v.y=h-bottom+label+Math.floor((height-v.displayH)/2);v.clip=[left,h-bottom+label,right-left,height];
   });
   const keys=new Set(this.samples.map(MieLightboxModel.key));for(const [key,o] of this.optical)if(!keys.has(key)){for(const k of ['coefficients','phase','density'])g.deleteTexture(o[k]);this.optical.delete(key);}
   this.updateShadowAtlas();this.reconcileNeeded=false;
  }
  resetScattering(v,keep=false,cap=null){
   const g=this.gl;if(keep&&v.passes&&!this.deferComposition){this.dropTarget(v.fallback);v.fallback=v.filtered[1];v.filtered[1]=null;}
   let sw=v.sw,sh=v.sh;if(cap){sw=Math.min(Math.max(8,Math.round(v.w*v.scatterWindow[2])),cap,v.gridCap);sh=Math.max(1,Math.round(v.h*v.scatterWindow[3]*sw/(v.w*v.scatterWindow[2])));}
   for(const t of [...v.accum,...v.filtered])this.dropTarget(t);Object.assign(v,{sw,sh,passes:0,scatterCursor:0,accum:[this.target(sw,sh),this.target(sw,sh)],filtered:[this.target(sw,sh),this.target(sw,sh)]});
   for(const t of v.accum){g.bindFramebuffer(g.FRAMEBUFFER,t.f);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);}
  }
  preview(v){
   const g=this.gl;if(v.quick.w>64){this.dropTarget(v.quick);const w=Math.min(64,v.w);v.quick=this.target(w,Math.max(1,Math.round(v.h*w/v.w)));}
   this.use('draft');this.common(v);this.i('draftScattering',1);g.bindFramebuffer(g.FRAMEBUFFER,v.quick.f);g.viewport(0,0,v.quick.w,v.quick.h);g.drawArrays(g.TRIANGLES,0,6);v.approximateLighting=true;
   this.dropTarget(v.fallback);v.fallback=null;v.draft=this.progressive;this.resetScattering(v,false,this.progressive?48:this.gridCap);v.dirty=false;v.beautyReady=false;v.guideReady=false;v.guideCursor=0;v.glassCursor=0;v.detailWork=0;this.paintAll=true;
  }
  tile(target,cursor,side){
   const g=this.gl,cols=Math.ceil(target.w/side),x=(cursor%cols)*side,y=Math.floor(cursor/cols)*side;g.bindFramebuffer(g.FRAMEBUFFER,target.f);g.viewport(0,0,target.w,target.h);g.enable(g.SCISSOR_TEST);g.scissor(x,y,Math.min(side,target.w-x),Math.min(side,target.h-y));g.drawArrays(g.TRIANGLES,0,6);g.disable(g.SCISSOR_TEST);return cursor+1>=cols*Math.ceil(target.h/side);
  }
  base(v){
   const g=this.gl;v.detailWork++;
   if(!v.guideReady){if(!v.guide)v.guide=this.target(v.w,v.h);this.use('preview');this.common(v);if(this.tile(v.guide,v.guideCursor++,this.glassTileSize))v.guideReady=true;return;}
   this.use('glass');this.common(v);this.bind('guideImage',v.guide.t,7);
   if(this.tile(v.film,v.glassCursor++,this.glassTileSize)){v.beautyReady=true;v.draft=false;this.resetScattering(v,true,this.fixedSize?this.gridCap:this.settings.lighting.startsWith('side')?128:160);this.dropTarget(v.quick);v.quick=v.guide;v.guide=null;this.paintAll=true;}
  }
  scatter(v){const g=this.gl;this.use('scatter');this.common(v);this.bind('guideImage',v.quick.t,7);this.f('ppm',v.sample.phi*1e6);this.i('pass',v.passes);this.bind('accumulated',v.accum[v.passes%2].t,5);if(this.tile(v.accum[(v.passes+1)%2],v.scatterCursor++,this.scatterTileSize)){v.passes++;v.scatterCursor=0;if(v.passes>=this.draftPasses){this.dropTarget(v.fallback);v.fallback=null;if(!v.beautyReady&&v.approximateLighting){this.use('draft');this.common(v);this.i('draftScattering',0);g.bindFramebuffer(g.FRAMEBUFFER,v.quick.f);g.viewport(0,0,v.quick.w,v.quick.h);g.drawArrays(g.TRIANGLES,0,6);v.approximateLighting=false;}}}}
  displayState(v){return !v.beautyReady&&v.approximateLighting?{texture:v.filtered[1].t,width:v.sw,height:v.sh,passes:0}:v.fallback&&v.passes<this.draftPasses?{texture:v.fallback.t,width:v.fallback.w,height:v.fallback.h,passes:1}:{texture:v.filtered[1].t,width:v.sw,height:v.sh,passes:v.passes};}
  display(v){this.frameVersion=(this.frameVersion||0)+1;v.displayVersion=(v.displayVersion||0)+1;
   const g=this.gl,packet=this.settings.lighting.startsWith('side')||this.isSeidel;this.use('filter');this.vec('imageSize',v.sw,v.sh);g.viewport(0,0,v.sw,v.sh);this.i('relativeGuide',packet?1:0);let input=v.accum[v.passes%2].t;
   for(let level=0;level<(packet?3:1);level++){this.i('stride',1<<level);this.i('radius',packet?(level===0?7:level===1?5:3):3);this.bind('image',input,0);this.vec('direction',1,0);g.bindFramebuffer(g.FRAMEBUFFER,v.filtered[0].f);g.drawArrays(g.TRIANGLES,0,6);this.bind('image',v.filtered[0].t,0);this.vec('direction',0,1);this.i('radius',packet?(level===0?7:level===1?5:3):9);g.bindFramebuffer(g.FRAMEBUFFER,v.filtered[1].f);g.drawArrays(g.TRIANGLES,0,6);input=v.filtered[1].t;}

   const image=this.displayState(v);this.use('display');this.vec('size',v.w,v.h);this.vec('screenOrigin',v.x,v.y);this.f('yaw',this.settings.yaw);this.f('pitch',this.settings.pitch);this.f('viewZoom',this.zoom(v));this.f('viewHeight',this.settings.container==='vial'?1.76:2.39);this.i('containerType',this.settings.container==='vial'?0:1);this.bind('base',v.beautyReady?v.film.t:v.quick.t,0);this.bind('scatter',image.texture,1);this.vec('scatterSize',image.width,image.height);this.gl.uniform4fv(this.uniform('scatterWindow'),v.scatterWindow||[0,0,1,1]);this.i('pass',image.passes);g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(v.x,v.y,v.displayW||v.w,v.displayH||v.h);if(v.clip){g.enable(g.SCISSOR_TEST);g.scissor(...v.clip);}g.drawArrays(g.TRIANGLES,0,6);g.disable(g.SCISSOR_TEST);
  }
  fullView(id){
   const v=this.views.get(id);if(!v||v.dirty)return null;const g=this.gl;
   if(!v.fullPreview){const t=g.createTexture();g.bindTexture(g.TEXTURE_2D,t);g.texImage2D(g.TEXTURE_2D,0,g.RGBA8,v.w,v.h,0,g.RGBA,g.UNSIGNED_BYTE,null);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MIN_FILTER,g.NEAREST);g.texParameteri(g.TEXTURE_2D,g.TEXTURE_MAG_FILTER,g.NEAREST);const f=g.createFramebuffer();g.bindFramebuffer(g.FRAMEBUFFER,f);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,t,0);v.fullPreview={t,f,w:v.w,h:v.h};}
   const image=this.displayState(v);this.use('display');this.vec('size',v.w,v.h);this.vec('screenOrigin',0,0);this.f('yaw',this.settings.yaw);this.f('pitch',this.settings.pitch);this.f('viewZoom',this.zoom(v));this.f('viewHeight',this.settings.container==='vial'?1.76:2.39);this.i('containerType',this.settings.container==='vial'?0:1);this.bind('base',v.beautyReady?v.film.t:v.quick.t,0);this.bind('scatter',image.texture,1);this.vec('scatterSize',image.width,image.height);g.uniform4fv(this.uniform('scatterWindow'),v.scatterWindow||[0,0,1,1]);this.i('pass',image.passes);g.bindFramebuffer(g.FRAMEBUFFER,v.fullPreview.f);g.viewport(0,0,v.w,v.h);g.clearColor(0,0,0,0);g.clear(g.COLOR_BUFFER_BIT);g.drawArrays(g.TRIANGLES,0,6);const bytes=new Uint8Array(v.w*v.h*4);g.readPixels(0,0,v.w,v.h,g.RGBA,g.UNSIGNED_BYTE,bytes);g.bindFramebuffer(g.FRAMEBUFFER,null);return {width:v.w,height:v.h,bytes,version:v.displayVersion};
  }
  clear(){const g=this.gl;g.bindFramebuffer(g.FRAMEBUFFER,null);g.viewport(0,0,this.canvas.width,this.canvas.height);const b=MieStudio.backgroundRGB(this.settings);g.clearColor(this.transparentBackground?0:b[0],this.transparentBackground?0:b[1],this.transparentBackground?0:b[2],this.transparentBackground?0:1);g.clear(g.COLOR_BUFFER_BIT);if(this.transparentBackground||!this.programs.studio?.ready)return;this.use('studio');this.bind('shadowTransmission',this.shadowTransmission,0);this.f('liquidDiameter',this.settings.diameter);this.f('sideAzimuth',(this.settings.sideAzimuth||0)*Math.PI/180);this.vec('size',this.canvas.width,this.canvas.height);this.f('pitch',this.settings.pitch);this.f('yaw',this.settings.yaw);this.f('viewHeight',this.settings.container==='vial'?1.76:2.39);this.f('lightGain',this.settings.gain);g.uniform3f(this.uniform('sourceWhiteRGB'),...this.whiteRGB);this.i('lighting',{room:0,back:1,side:2,'side-white':3}[this.settings.lighting]);this.i('containerType',this.settings.container==='vial'?0:this.settings.container==='cuvette1'?1:2);const cols=MieLightboxModel.columns(this.samples.length),rows=Math.max(1,Math.ceil(this.samples.length/cols));const layout=new Float32Array(40);this.samples.forEach((s,i)=>{const v=this.views.get(s.id);if(v)layout.set([v.x+(v.displayW||v.w)/2,v.y+(v.displayH||v.h)/2,v.displayH||v.h,v.sample.testCard?(v.projectionScale||MieCard.scale(this.settings,v.w/v.h)):Math.max(this.settings.container==='vial'?3.90:5.18,1.55*v.h/v.w)],i*4);});g.uniform4fv(this.uniform('viewLayout'),layout);this.i('columns',cols);this.i('rows',rows);this.i('sampleCount',this.samples.length);this.i('visibleMask',this.samples.reduce((mask,s,i)=>mask|(!this.views.get(s.id)?.dirty&&this.views.has(s.id)?1<<i:0),0));this.f('labelSpace',Math.round(this.labelSpace*(this.fixedSize?1:Math.min(root.devicePixelRatio||1,1.25))));g.drawArrays(g.TRIANGLES,0,6);}
  compose(){this.frameVersion=(this.frameVersion||0)+1;this.clear();for(const s of this.samples){const v=this.views.get(s.id);if(v&&!v.dirty)this.display(v);}this.paintAll=false;}
  get targetPasses(){return this.maximum??(this.settings.lighting.startsWith('side')?this.sideMaximum:this.baseMaximum);}
  get progress(){const v=[...this.views.values()],complete=x=>!x.dirty&&!x.optics.data.preview&&x.beautyReady&&x.passes>=this.targetPasses;return {preparing:this.compiling||v.some(x=>x.optics.data.preview),ready:v.filter(x=>!x.dirty).length,complete:v.filter(complete).length,total:this.samples.length,fraction:this.samples.length?v.reduce((a,x)=>a+(x.dirty?0:.03)+(x.guideReady ? .04 : 0)+(x.beautyReady ? .08 : 0)+(x.draft?0:.85*Math.min(this.targetPasses,x.passes)/this.targetPasses),0)/this.samples.length:0,finished:!this.compiling&&!this.reconcileNeeded&&v.length===this.samples.length&&v.every(complete)&&!this.fence};}
  tick(){
   this.scheduled=false;if(!this.running||this.disposed||this.error||!this.fixedSize&&this.samples.length>0&&(!this.canvas.clientWidth||!this.canvas.clientHeight))return;
   const g=this.gl;try{
    if(g.isContextLost())throw Error('The graphics context was lost.');if(!this.samples.length){if(this.fence){g.deleteSync(this.fence);this.fence=null;}if(this.reconcileNeeded)this.reconcile();this.clear();this.compiling=false;this.onProgress(this.progress);return;}
    if(this.fence){const done=g.clientWaitSync(this.fence,0,0);if(done===g.WAIT_FAILED)throw Error('The graphics task could not complete.');if(done===g.TIMEOUT_EXPIRED){if(performance.now()-this.fenceStarted>12000)throw Error('The graphics task took too long.');this.schedule();return;}g.deleteSync(this.fence);this.fence=null;}
    if(this.reconcileNeeded)this.reconcile();
    if(!this.preparePrograms()){if(this.paintAll){this.clear();this.paintAll=false;}if(performance.now()-this.lastNotice>500){this.lastNotice=performance.now();this.onProgress(this.progress);}this.schedule();return;}
    let next=null,worked=false;
    for(let chunk=0;chunk<this.workBatch;chunk++){
     const all=this.samples.map(s=>this.views.get(s.id)).filter(Boolean),dirty=all.find(v=>v.dirty),draft=!this.previewOnly&&this.scatterReady&&all.filter(v=>v.draft&&v.passes<this.draftPasses).sort((a,b)=>a.passes-b.passes)[0],beauty=!this.previewOnly&&this.glassReady&&all.filter(v=>!v.beautyReady&&!v.optics.data.preview).sort((a,b)=>a.detailWork-b.detailWork)[0],fine=!this.previewOnly&&this.scatterReady&&all.filter(v=>v.beautyReady&&!v.optics.data.preview&&v.passes<this.targetPasses).sort((a,b)=>a.passes-b.passes)[0];
     const candidate=dirty||draft||beauty||fine;if(!candidate)break;next=candidate;
     if(next.dirty)this.preview(next);else if(next===beauty)this.base(next);else this.scatter(next);worked=true;
     if(!this.deferComposition&&performance.now()-this.lastCompose>80){if(this.paintAll)this.compose();else this.display(next);this.lastCompose=performance.now();}
    }
    if(!this.deferComposition&&(!next||performance.now()-this.lastCompose>80)){this.compose();this.lastCompose=performance.now();}
    const error=g.getError();if(error!==g.NO_ERROR)throw Error('A graphics error interrupted the vial images.');
    if(worked){this.fence=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);this.fenceStarted=performance.now();this.lastView=next;g.flush();}
    if(performance.now()-this.lastNotice>500||!next){this.lastNotice=performance.now();this.onProgress(this.progress);}
    if(next||this.fence||this.compiling)this.schedule();
   }catch(e){this.fail(e.message);}
  }
  schedule(){if(this.running&&!this.scheduled&&!this.disposed&&!this.error){this.scheduled=true;requestAnimationFrame(()=>this.tick());}}
  resume(){if(this.disposed)return;this.running=true;if(this.fence)this.fenceStarted=performance.now();this.reconcileNeeded=true;this.paintAll=true;this.schedule();}
  pause(){this.running=false;}
  fail(message){if(this.error)return;this.error=message;this.running=false;this.onError(message);}
  dispose(){if(this.disposed)return;this.running=false;this.disposed=true;this.observer.disconnect();this.canvas.removeEventListener('webglcontextlost',this.lost);const g=this.gl;for(const v of this.views.values())this.dropView(v);for(const o of this.optical.values())for(const k of ['coefficients','phase','density'])g.deleteTexture(o[k]);g.deleteTexture(this.colourWeights);g.deleteTexture(this.shadowTransmission);g.deleteTexture(this.sequence);g.deleteTexture(this.cardLogo);g.deleteBuffer(this.buffer);for(const p of Object.values(this.programs))g.deleteProgram(p.p);g.deleteShader(this.vs);if(this.fence)g.deleteSync(this.fence);g.getExtension('WEBGL_lose_context')?.loseContext();}
 }
 root.MieLightboxKernel={vertex,geometry,previewSource,glassSource,packetSource,scatterSource,sources,Renderer:LightboxRenderer};
 root.MieLightboxRenderer=LightboxRenderer;
})(globalThis);