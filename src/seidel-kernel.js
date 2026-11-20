(function(root){
 'use strict';const K=root.MieLightboxKernel;
 function replaceFunction(text,name,replacement){const pattern=new RegExp('(^|\\n)[ \\t]*(?:float|bool|int|vec[234]|void|Hit)[ \\t]+'+name+'\\([^;{}]*\\)[ \\t\\r\\n]*\\{'),match=pattern.exec(text);if(!match)throw Error('Missing shader function '+name);const start=match.index+(match[1]?1:0),brace=text.indexOf('{',start);let end=brace+1,depth=1;while(depth&&end<text.length){const c=text[end++];if(c==='{')depth++;else if(c==='}')depth--;}return text.slice(0,start)+replacement+text.slice(end);}
 const mesh=`
uniform sampler2D meshNodes,meshTriangles,meshLogo;
uniform int meshNodeCount,meshHasLogo,meshFrontPhoto,meshIsMonolith;
vec3 meshFrontAxis(){return normalize(vec3(-.15,.13,1.));}
float meshFrontPdf(vec3 d){float a=.12*.12;return exp((dot(d,meshFrontAxis())-1.)/a)/(2.*PI*a*(1.-exp(-2./a)));}
uniform vec3 meshSourceWhite; uniform float samplePpm;
vec4 meshFetch(sampler2D image,int index){int width=textureSize(image,0).x;return texelFetch(image,ivec2(index%width,index/width),0);}
float meshInk(vec3 p,vec3 normal){
 if(meshHasLogo==0||(meshIsMonolith==0&&p.z<.15)||normal.z<.15)return 0.;vec2 st=meshIsMonolith==1?vec2(p.x/1.0+.5,(p.y-1.79)/.382+.5):vec2(p.x/1.50+.5,(p.y-1.84)/.573+.5);
 if(any(lessThan(st,vec2(0)))||any(greaterThan(st,vec2(1))))return 0.;
 vec2 uv=mix(vec2(203./2504.,203./1177.),vec2(2301./2504.,1004./1177.),st);vec3 ink=texture(meshLogo,uv).rgb;return 1.-smoothstep(.3,.9,max(max(ink.r,ink.g),ink.b));
}
bool meshBox(vec3 o,vec3 d,vec3 low,vec3 high,float nearest){vec3 v=vec3(abs(d.x)<1e-18?1e-18:d.x,abs(d.y)<1e-18?1e-18:d.y,abs(d.z)<1e-18?1e-18:d.z),a=(low-o)/v,b=(high-o)/v,lo=min(a,b),hi=max(a,b);return min(min(hi.x,hi.y),min(hi.z,nearest))>=max(EPS,max(max(lo.x,lo.y),lo.z));}
float mediumIndex(int m);int targetMedium(Hit h,vec3 p,vec3 d);
vec3 meshSafeNormal(Hit h,vec3 p,vec3 d,int med){vec3 ng=dot(d,h.n)<0.?h.n:-h.n,ns=dot(d,h.shadingNormal)<0.?h.shadingNormal:-h.shadingNormal;vec3 reflection=reflect(d,ns),transmission=refract(d,ns,mediumIndex(med)/mediumIndex(targetMedium(h,p,d)));if(dot(reflection,ng)<=0.||(dot(transmission,transmission)>1e-12&&dot(transmission,ng)>=0.))return ng;return ns;}
Hit meshBoundary(vec3 o,vec3 d){
 Hit h;h.t=INF;h.n=vec3(0,1,0);h.shadingNormal=vec3(0,1,0);h.type=-1;h.part=-1;int node=0;
 for(int visit=0;visit<16384;visit++){
  if(node>=meshNodeCount)break;vec4 a=meshFetch(meshNodes,node*2),b=meshFetch(meshNodes,node*2+1);bool hit=meshBox(o,d,a.xyz,b.xyz,h.t);
  if(a.w<0.){node=hit?node+1:int(b.w+.5);continue;}int count=int(-b.w+.5),first=int(a.w+.5);node++;
  if(!hit)continue;
  for(int j=0;j<6;j++){if(j>=count)break;int id=first+j,base=id*6;vec3 A=meshFetch(meshTriangles,base).xyz,B=meshFetch(meshTriangles,base+1).xyz,C=meshFetch(meshTriangles,base+2).xyz,e1=B-A,e2=C-A,p=cross(d,e2);float det=dot(e1,p);if(abs(det)<1e-12)continue;vec3 q=o-A;float inv=1./det,u=dot(q,p)*inv;if(u<-.0000001||u>1.0000001)continue;vec3 t=cross(q,e1);float v=dot(d,t)*inv;if(v<-.0000001||u+v>1.0000001)continue;float distance=dot(e2,t)*inv;
   if(distance>EPS&&distance<h.t){h.t=distance;h.n=normalize(cross(e1,e2));vec3 nA=meshFetch(meshTriangles,base+3).xyz,nB=meshFetch(meshTriangles,base+4).xyz,nC=meshFetch(meshTriangles,base+5).xyz;h.shadingNormal=normalize(nA*(1.-u-v)+nB*u+nC*v);if(dot(h.shadingNormal,h.n)<0.)h.shadingNormal=-h.shadingNormal;h.type=2;h.part=id;}
  }
 }
 if(h.type>=0&&meshInk(o+h.t*d,h.n)>.5)h.type=3;return h;
}
`;
 let geometry=K.geometry.replace('struct Hit{float t;vec3 n;int type;int part;};','struct Hit{float t;vec3 n;vec3 shadingNormal;int type;int part;};\n'+mesh);
 geometry=replaceFunction(geometry,'boundary','Hit boundary(vec3 o,vec3 d){return meshBoundary(o,d); }');
 geometry=replaceFunction(geometry,'opticalNormal','vec3 opticalNormal(Hit h,vec3 p){return h.shadingNormal;}');
 // There are two preprocessor alternatives for opticalNormal.
 geometry=geometry.replace('vec3 opticalNormal(Hit h,vec3 p){return h.n;}','vec3 opticalNormal(Hit h,vec3 p){return h.shadingNormal;}');
 geometry=replaceFunction(geometry,'targetMedium','int targetMedium(Hit h,vec3 p,vec3 d){return dot(d,h.n)<0.?2:0;}');
 geometry=replaceFunction(geometry,'camera',`void camera(vec2 st,out vec3 o,out vec3 d){float aspect=size.x/size.y,scale=max(3.90,2.85/aspect)/viewZoom;vec2 q=(st-.5)*vec2(aspect,1.);d=normalize(vec3(-sin(yaw)*cos(pitch),-sin(pitch),-cos(yaw)*cos(pitch)));vec3 right=normalize(cross(d,vec3(0,1,0))),up=cross(right,d);o=vec3(meshIsMonolith==1?0.:.28,1.79,0)-d*12.+scale*(q.x*right+q.y*up);}`);
 geometry=replaceFunction(geometry,'boundBox',`vec2 boundBox(vec3 o,vec3 d){vec3 low=vec3(-.939,.119,-.939),high=vec3(1.502,3.461,.939),v=vec3(abs(d.x)<1e-18?1e-18:d.x,abs(d.y)<1e-18?1e-18:d.y,abs(d.z)<1e-18?1e-18:d.z),a=(low-o)/v,b=(high-o)/v,p=min(a,b),q=max(a,b);return vec2(max(max(p.x,p.y),p.z),min(min(q.x,q.y),q.z));}`);
 geometry=replaceFunction(geometry,'capShade',`float meshDummyUnused(){return 0.;}\nvec3 capShade(vec3 p,vec3 n,vec3 d){vec3 ink=vec3(.003,.014,.10);float diffuse=.06+lightGain*(lighting==0?.90*max(n.z,0.):lighting==1?.10:max(dot(n,normalize(vec3(-cos(sideAzimuth),.8,sin(sideAzimuth)))),0.));return ink*meshSourceWhite*diffuse;}`);
 geometry=geometry.replace('float front=smoothstep(-.22,.32,d.z);','if(lighting==0&&meshFrontPhoto==1){vec3 p,n;bool floor=studioSurface(studioLocal(o),studioLocal(d),p,n);return floor?studioMaterial(n.y,0.):.014+8.1*lightGain*meshFrontPdf(d); }\n float front=smoothstep(-.22,.32,d.z);');
 geometry=replaceFunction(geometry,'studioFootprint','float studioFootprint(vec2 p){return length(p)-.94;}');
 const safe=source=>source.replaceAll('vec3 normal=opticalNormal(h,p),n=dot(d,normal)<0.?normal:-normal','vec3 n=meshSafeNormal(h,p,d,med)');
 const preview=safe(K.previewSource);
 const draft=preview.replace('in vec2 uv;out vec4 frag;','in vec2 uv;out vec4 frag;uniform int draftScattering;').replace(' frag=vec4(result,guide);',` if(guide>0.&&draftScattering==1){vec3 approximate=vec3(0);for(int band=0;band<41;band++){vec4 c=texelFetch(coefficients,ivec2(band,0),0);float extinction=max(1e-12,(c.r+c.g)*samplePpm),albedo=c.r/max(1e-12,c.r+c.g),phase=lighting==0?max(.08,.7*(1.-c.b)):lighting==1?1.:max(.08,1.-c.b*c.b);approximate+=texelFetch(colourWeights,ivec2(band,0),0).rgb*(albedo*(1.-exp(-extinction*path))*(lighting==1?.38:.75)*lightGain*phase);}result+=approximate;}\n frag=vec4(result,guide);`);
 let packet=safe(K.packetSource).replace('directLighting==1&&audit!=1?powerWeight','directLighting==1&&(lighting>=2||(lighting==0&&meshFrontPhoto==1))&&audit!=1?powerWeight');
 packet=packet.replace('return proposalMix.x*sideLampGeometricPdf', 'if(lighting==0&&meshFrontPhoto==1)return .9*meshFrontPdf(direction)+.1/(4.*PI);return proposalMix.x*sideLampGeometricPdf');
 packet=packet.replace('if(directLighting==0||lighting<2||audit==1)', 'if(directLighting==0||(lighting<2&&!(lighting==0&&meshFrontPhoto==1))||audit==1)');
 packet=packet.replace('if(choose<proposalMix.x){vec3 sampled=', 'if(lighting==0&&meshFrontPhoto==1){if(choose<.9){float a=.12*.12,mu=1.+a*log(max(1e-12,1.-u*(1.-exp(-2./a))));d=directionAround(meshFrontAxis(),mu,2.*PI*v);}else d=directionAround(vec3(0,1,0),2.*u-1.,2.*PI*v); }else if(choose<proposalMix.x){vec3 sampled=');
 const display=replaceFunction(K.sources.display,'resolveGlass',`vec3 resolveGlass(vec3 centre){ivec2 at=ivec2(uv*vec2(textureSize(base,0))),bounds=textureSize(base,0)-1;float guide=texelFetch(base,clamp(at,ivec2(0),bounds),0).a;if(guide<=0.)return centre;vec3 sum=vec3(0);float total=0.;for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec4 v=texelFetch(base,clamp(at+ivec2(x,y),ivec2(0),bounds),0);if(v.a<=0.)continue;float w=(x==0?2.:1.)*(y==0?2.:1.)*exp(-abs(v.a-guide)*80.);sum+=v.rgb*w;total+=w;}return total>0.?sum/total:centre;}`);
 const ground=`#version 300 es\n${geometry}\nin vec2 uv;out vec4 frag;
void main(){vec3 point=vec3(mix(-6.,12.,uv.x),.1202,mix(-12.,6.,uv.y));vec3 sum=vec3(0);float total=0.;
 for(int k=0;k<8;k++){int reverse=((k&1)<<2)|(k&2)|((k&4)>>2);vec3 lamp=sideLampCentre()+sideLampTangent()*((float(reverse)+.5)/8.*2.-1.)*sideLampWidth()+vec3(0,((float(k)+.5)/8.*2.-1.)*sideLampHeight(),0),delta=lamp-point,wd=normalize(delta),o=studioWorld(point),d=studioWorld(wd);float remaining=length(delta),path=0.,weight=1.;int med=0;
  for(int step=0;step<24;step++){Hit h=meshBoundary(o,d);if(h.type<0||h.t>=remaining)break;if(med==2)path+=h.t;vec3 p=o+h.t*d;if(h.type==3){weight=0.;break;}int next=targetMedium(h,p,d);vec3 n=dot(d,h.n)<0.?h.n:-h.n;weight*=1.-fresnel(d,n,mediumIndex(med),mediumIndex(next));med=next;remaining-=h.t;o=offsetSurface(p,d,h.n);}
  float irradiance=max(0.,wd.y)*abs(dot(wd,sideLampNormal()))/dot(delta,delta);sum+=irradiance*weight*T(path*diameter/10.,0);total+=irradiance;
 }frag=vec4(sum/max(1e-20,total)/max(meshSourceWhite,vec3(1e-6)),1.);}
`;
 let studio=K.sources.studio;
 studio=studio.replace('out vec4 frag;','out vec4 frag;\nuniform sampler2D meshGroundAtlas;uniform int transparentScene,meshIsMonolith;');
 studio=replaceFunction(studio,'studioFootprint','float studioFootprint(vec2 p){return length(p)-.94;}');
 studio=replaceFunction(studio,'projectedShadow',`vec3 projectedShadow(vec3 p,int index){vec2 uv=(p.xz-vec2(-6.,-12.))/18.;if(any(lessThan(uv,vec2(0)))||any(greaterThan(uv,vec2(1))))return vec3(1);ivec2 sz=textureSize(meshGroundAtlas,0);if(sz.y<max(1,sampleCount))return vec3(1);int height=sz.y/max(1,sampleCount);vec2 point=uv*vec2(sz.x,height)-.5,f=fract(point);ivec2 at=ivec2(floor(point));vec3 t=vec3(0);for(int y=0;y<=1;y++)for(int x=0;x<=1;x++){ivec2 pixel=clamp(at+ivec2(x,y),ivec2(0),ivec2(sz.x-1,height-1));pixel.y+=index*height;t+=texelFetch(meshGroundAtlas,pixel,0).rgb*(x==0?1.-f.x:f.x)*(y==0?1.-f.y:f.y);}float edge=smoothstep(0.,.04,min(min(uv.x,uv.y),min(1.-uv.x,1.-uv.y))),direct=.82*lightGain;return mix(vec3(1),(.18*vec3(1)+direct*t)/(.18+direct),edge);}`);
 // Return a shadow-only layer for composition into exported scenes.
 studio=studio.replace('float value=base;vec3 chromatic=vec3(1);','float value=base,meshUnshadowed=base;vec3 chromatic=vec3(1);').replace('value=studioMaterial(n.y,studioCameraSource())*shadow;','meshUnshadowed=studioMaterial(n.y,studioCameraSource());value=meshUnshadowed*shadow;').replace('origin-=direction*max(0.,(STUDIO_FLOOR+.5-origin.y)/(-direction.y));','origin.x+=(meshIsMonolith==1?0.:.28)*cos(yaw);origin.z+=(meshIsMonolith==1?0.:.28)*sin(yaw);origin-=direction*max(0.,(STUDIO_FLOOR+.5-origin.y)/(-direction.y));'); // The final assignment is patched below, independently of white-balance code.
 const finalAt=studio.lastIndexOf('frag=vec4(');const end=studio.indexOf(';',finalAt);const assignment=studio.slice(finalAt,end+1);
 studio=studio.slice(0,finalAt)+assignment+`if(transparentScene==1){vec3 nominalLinear=mix(vec3(base),vec3(meshUnshadowed),fade)*sourceWhiteRGB,nominal=vec3(studioSrgb(max(0.,nominalLinear.r)),studioSrgb(max(0.,nominalLinear.g)),studioSrgb(max(0.,nominalLinear.b)));vec3 ratio=clamp(frag.rgb/max(nominal,vec3(.001)),0.,1.);float alpha=1.-min(min(ratio.r,ratio.g),ratio.b);frag=alpha>1e-5?vec4(max(vec3(0),(frag.rgb-vec3(1.-alpha)*nominal)/alpha),alpha):vec4(0);}`+studio.slice(end+1);
 const shaders={draft:`#version 300 es\n${geometry}\n${draft}`,previewCell:`#version 300 es\n${geometry}\n${preview}`,glassCell:`#version 300 es\n${geometry}\n${safe(K.glassSource)}`,scatterCell:`#version 300 es\n${geometry}\n${packet}`,scatterCellSide:`#version 300 es\n${geometry}\n${packet}`,display,studio,meshGround:ground,filter:K.sources.filter};
 root.MieSeidelKernel={sources:shaders,geometry,replaceFunction};
})(globalThis);

