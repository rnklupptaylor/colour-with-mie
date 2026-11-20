/* 3D view. Physical (x, y, z) maps to world (z, x, y): a cyclic permutation,
   i.e. a proper rotation, so the drawn frame is right-handed. The beam (+z)
   points right, x points up and y towards the default camera. */
class MieScene{
  static W(p,s=1){return new THREE.Vector3(p[2]*s,p[0]*s,p[1]*s);}
  // Colormaps are defined in sRGB; vertex colours must be linear (the renderer re-encodes to sRGB).
  static lin(c){return c.map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);}
  static P(v){return [v.y,v.z,v.x];}
  // Home camera directions (world frame) for each view kind.
  static HOME={far:[.62,.48,1],sphere:[.62,.48,1],xz:[.12,.16,1],yz:[.25,1,.32],xy:[-1,.14,.22]};
  constructor(host,{onPick,transparent=false}={}){
    this.host=host;this.onPick=onPick;this.transparent=transparent;this.phase=0;this.target=new THREE.Vector3();this.dirty=true;this.R0=3.3;
    this.renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:transparent});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    host.prepend(this.renderer.domElement);
    this.scene=new THREE.Scene();this.camera=new THREE.PerspectiveCamera(34,1,.05,200);this.scene.add(this.camera);
    this.scene.add(new THREE.AmbientLight(0xffffff,1.6));
    const head=new THREE.DirectionalLight(0xffffff,1.9);head.position.set(.4,.8,1);this.camera.add(head);
    this.chrome=new THREE.Group();this.content=new THREE.Group();this.probe=new THREE.Group();this.scene.add(this.chrome,this.content,this.probe);
    this.marker=new THREE.Mesh(new THREE.SphereGeometry(.08,20,14),new THREE.MeshBasicMaterial({depthTest:false}));this.marker.renderOrder=20;
    this.stem=new THREE.Line(new THREE.BufferGeometry(),new THREE.LineDashedMaterial({dashSize:.1,gapSize:.07,depthTest:false,transparent:true,opacity:.8}));this.stem.renderOrder=19;
    this.probe.add(this.marker,this.stem);
    this.controls();this.applyTheme();this.home('far');
    if(host.id==='scene'){
      this.zoomBar=document.createElement('div');this.zoomBar.className='scene-zoom';this.zoomBar.setAttribute('role','toolbar');this.zoomBar.setAttribute('aria-label','3D magnification');
      this.zoomBar.innerHTML='<button type="button" data-zoom="out" aria-label="Zoom out 3D view">−</button><output aria-label="3D magnification">1×</output><button type="button" data-zoom="in" aria-label="Zoom in 3D view">+</button>';
      this.zoomBar.addEventListener('click',e=>{const a=e.target.closest('[data-zoom]')?.dataset.zoom;if(a)this.zoom(a==='in'?1/1.4:1.4);});host.append(this.zoomBar);
    }
    new ResizeObserver(()=>this.resize()).observe(host);this.resize();
  }
  /* ---------- theme & chrome ---------- */
  applyTheme(){
    this.colors={bg:css('--scene-bg'),ink:css('--ink'),ink2:css('--ink-2'),muted:css('--muted'),axis:css('--scene-axis'),probe:css('--probe'),beam:css('--beam'),particle:css('--particle'),core:css('--particle-core')};
    this.renderer.setClearColor(this.colors.bg,this.transparent?0:1);this.marker.material.color.set(this.colors.probe);this.stem.material.color.set(this.colors.probe);
    Colormap.readDiv();
    const N=1024,div=new Float32Array(3*N+3),heat=new Float32Array(3*N+3);
    for(let i=0;i<=N;i++){div.set(MieScene.lin(Colormap.diverging(2*i/N-1)),3*i);heat.set(MieScene.lin(Colormap.heat(i/N)),3*i);}
    this.lut={N,div,heat};
    this.buildChrome();if(this.last)this.show(this.last);this.dirty=true;
  }
  label(text,color,size=1,italic=false){
    const font=`${italic?'italic ':''}600 60px "STIX Two Text", "Atkinson Hyperlegible", serif`,cv=document.createElement('canvas'),g=cv.getContext('2d');
    g.font=font;cv.width=Math.ceil(g.measureText(text).width)+24;cv.height=96;
    g.fillStyle=color;g.font=font;g.textAlign='center';g.textBaseline='middle';g.fillText(text,cv.width/2,50);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
    const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(.34*size*cv.width/96,.34*size,1);s.renderOrder=15;return s;
  }
  arrow(from,to,color,head=.16,opacity=1){
    const dir=to.clone().sub(from),len=dir.length(),a=new THREE.ArrowHelper(dir.normalize(),from,len,color,Math.min(head,len*.4),head*.45);
    for(const m of [a.line.material,a.cone.material]){m.transparent=opacity<1;m.opacity=opacity;}return a;
  }
  disposeGroup(g){g.traverse(o=>{o.geometry?.dispose();const ms=Array.isArray(o.material)?o.material:o.material?[o.material]:[];for(const m of ms){m.map?.dispose();m.dispose();}});g.clear();}
  buildChrome(){
    this.disposeGroup(this.chrome);const L=3.6,c=this.colors;
    for(const [p,name] of [[[1,0,0],'x'],[[0,1,0],'y'],[[0,0,1],'z']]){
      const v=MieScene.W(p,L);this.chrome.add(this.arrow(v.clone().multiplyScalar(-1),v,c.axis,.14,.9));
      const lab=this.label(name,c.ink2,1,true);lab.position.copy(MieScene.W(p,L+.28));this.chrome.add(lab);
    }
  }
  setIncident(inc){
    if(this.beam){this.disposeGroup(this.beam);this.chrome.remove(this.beam);}this.beam=null;if(!inc)return;
    const g=new THREE.Group(),c=this.colors.beam,z0=-5.2,z1=-4.05;
    g.add(this.arrow(MieScene.W([0,0,z0]),MieScene.W([0,0,z1]),c,.24));
    const k=this.label('k',c,1.05,true);k.position.copy(MieScene.W([-.38,0,(z0+z1)/2]));g.add(k);
    const pols=inc.pol==='unpol'?[[1,0,0],[0,1,0]]:[inc.pol==='y'?[0,1,0]:[1,0,0]];
    for(const p of pols){const a=MieScene.W(p,.62).add(MieScene.W([0,0,z0])),b=MieScene.W(p,-.62).add(MieScene.W([0,0,z0])),mid=MieScene.W([0,0,z0]);g.add(this.arrow(mid,a,c,.15,inc.pol==='unpol'?.65:1),this.arrow(mid,b,c,.15,inc.pol==='unpol'?.65:1));}
    const e=this.label(inc.pol==='unpol'?'E (unpol.)':'E',c,1.05,true);e.position.copy(MieScene.W(inc.pol==='y'?[.3,.95,z0]:[.95,.25,z0]));g.add(e);
    this.beam=g;this.chrome.add(g);this.dirty=true;
  }
  /* ---------- camera & interaction ---------- */
  home(kind=this.kind||'far'){
    this.kind=kind;this.target.set(0,0,0);
    this.camera.zoom=1;this.camera.updateProjectionMatrix();this.updateZoom();
    const dir=MieScene.HOME[kind]||MieScene.HOME.far;
    this.camera.position.set(...dir).normalize().multiplyScalar(kind==='far'||kind==='sphere'?14.6:13.4);this.camera.up.set(0,1,0);this.camera.lookAt(this.target);this.dirty=true;
  }
  resize(){const w=this.host.clientWidth,h=this.host.clientHeight;if(!w||!h)return;this.renderer.setSize(w,h);this.camera.aspect=w/h;
    // Keep the whole scene in view on tall, narrow screens.
    this.camera.fov=w/h<1?2*Math.atan(Math.tan(17*Math.PI/180)/(w/h))*180/Math.PI:34;this.camera.updateProjectionMatrix();this.dirty=true;}
  controls(){
    const host=this.host,ray=new THREE.Raycaster(),pointers=new Map();let drag=null,two=null;
    this.renderer.domElement.style.touchAction='none';
    const pair=()=>{const p=[...pointers.values()];return p.length>1?{x:(p[0].x+p[1].x)/2,y:(p[0].y+p[1].y)/2,d:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)}:null;};
    host.addEventListener('pointerdown',e=>{if(e.target!==this.renderer.domElement)return;e.preventDefault();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});drag={x:e.clientX,y:e.clientY,pan:e.shiftKey||e.button===2,moved:pointers.size>1?10:0};two=pair();host.setPointerCapture(e.pointerId);host.focus({preventScroll:true});});
    host.addEventListener('pointermove',e=>{if(!drag||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const q=pair();if(q&&two){this.zoom(two.d/Math.max(1,q.d));this.pan(q.x-two.x,q.y-two.y);drag.moved=10;two=q;return;}two=q;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;drag.x=e.clientX;drag.y=e.clientY;drag.moved+=Math.abs(dx)+Math.abs(dy);if(drag.moved>4)host.dataset.used='1';drag.pan?this.pan(dx,dy):this.orbit(-dx*.006,-dy*.006);});
    host.addEventListener('pointerup',e=>{
      if(drag&&drag.moved<5&&this.pickMesh&&this.onPick){const r=host.getBoundingClientRect();ray.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),this.camera);const hit=ray.intersectObject(this.pickMesh)[0];if(hit)this.onPick(MieScene.P(hit.point).map(v=>v/this.pickScale));}
      pointers.delete(e.pointerId);two=pair();const p=[...pointers.values()][0];drag=p?{...p,pan:false,moved:10}:null;});
    host.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);two=null;drag=null;});host.addEventListener('contextmenu',e=>e.preventDefault());
    host.addEventListener('wheel',e=>{e.preventDefault();this.zoom(Math.exp(e.deltaY*.0012));},{passive:false});
    host.addEventListener('keydown',e=>{const d={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      if(d){e.preventDefault();e.shiftKey?this.pan(d[0]*25,d[1]*25):this.orbit(d[0]*.09,d[1]*.09);}
      else if(e.key==='+'||e.key==='='){e.preventDefault();this.zoom(.9);}else if(e.key==='-'){e.preventDefault();this.zoom(1.1);}else if(e.key==='Home'){e.preventDefault();this.home();}});
  }
  orbit(da,dp){const q=new THREE.Spherical().setFromVector3(this.camera.position.clone().sub(this.target));q.theta+=da;q.phi=Math.max(.03,Math.min(Math.PI-.03,q.phi+dp));this.camera.position.copy(new THREE.Vector3().setFromSpherical(q).add(this.target));this.camera.lookAt(this.target);this.dirty=true;}
  pan(dx,dy){const d=this.camera.position.distanceTo(this.target),v=new THREE.Vector3(-dx,dy,0).multiplyScalar(d*.0014/this.camera.zoom).applyQuaternion(this.camera.quaternion);this.target.add(v);this.camera.position.add(v);this.dirty=true;}
  updateZoom(){const far=this.last?.kind==='pattern';this.marker.scale.setScalar(far?1/this.camera.zoom:1);this.stem.material.dashSize=.1/(far?this.camera.zoom:1);this.stem.material.gapSize=.07/(far?this.camera.zoom:1);if(!this.zoomBar)return;this.zoomBar.hidden=!far;this.zoomBar.querySelector('output').textContent=`${Fmt.num(this.camera.zoom,3)}×`;this.zoomBar.querySelector('[data-zoom="in"]').disabled=this.camera.zoom>=80;this.zoomBar.querySelector('[data-zoom="out"]').disabled=this.camera.zoom<=.35;}
  zoom(r){
    if(this.last?.kind==='pattern'){
      // Magnify the projection without entering the intensity surface or clipping its lobes.
      this.camera.zoom=Math.max(.35,Math.min(80,this.camera.zoom/r));this.camera.updateProjectionMatrix();
    }else{const o=this.camera.position.clone().sub(this.target);o.multiplyScalar(r).setLength(Math.max(3,Math.min(40,o.length())));this.camera.position.copy(o.add(this.target));}
    this.updateZoom();this.dirty=true;
  }
  focusDirection(th,ph,zoom=6){
    if(!this.patternRadius)return;
    const r=this.patternRadius(th,ph),d=MieScene.W([Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th)]),normal=MieScene.W([-Math.sin(ph),Math.cos(ph),0]);
    this.target.copy(d).multiplyScalar(r);this.camera.position.copy(this.target).add(d.clone().addScaledVector(normal,.35).normalize().multiplyScalar(14.6));this.camera.up.set(0,1,0);this.camera.lookAt(this.target);
    this.camera.zoom=Math.max(.35,Math.min(80,zoom));this.camera.updateProjectionMatrix();this.updateZoom();this.dirty=true;
  }
  /* ---------- content ---------- */
  clear(){this.disposeGroup(this.content);this.pickMesh=null;this.slice=null;this.sphereData=null;this.arrows=[];this.patternRadius=null;}
  show(d){
    this.last=d;this.clear();
    if(d.kind==='pattern')this.buildPattern(d);else if(d.kind==='slice')this.buildSlice(d);else if(d.kind==='sphere')this.buildSphere(d);
    // Near field: translucent particle (and core) over the slice, so the interior field stays visible.
    if(d.particle&&d.particle.show!==false){
      const p=d.particle,tr=!!p.translucent,sphere=(r,color,opacity,at=null)=>{const m=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.05,r),64,48),new THREE.MeshStandardMaterial({color,roughness:.45,metalness:.05,transparent:tr,opacity:tr?opacity:1,depthWrite:!tr}));m.renderOrder=tr?9:0;if(at)m.position.copy(MieScene.W(at));this.content.add(m);};
      // Several spheres (chains): centres in world-scaled physical coordinates, p.spheres = [{c:[x,y,z], r, core}].
      if(p.spheres)for(const q of p.spheres){sphere(q.r,this.colors.particle,.2,q.c);if(q.core)sphere(q.core,this.colors.core,.28,q.c);}
      else{sphere(p.r,this.colors.particle,.2);if(p.core)sphere(p.core,this.colors.core,.28);}
    }
    if(d.origin){const m=new THREE.Mesh(new THREE.SphereGeometry(.05,16,12),new THREE.MeshBasicMaterial({color:this.colors.ink2}));this.content.add(m);}
    this.setPhase(this.phase);this.updateZoom();this.dirty=true;
  }
  buildPattern(d){
    // d.values: Float32Array (T+1)*(P+1) of relative intensity on a theta-phi grid.
    const {T,P,values}=d,range=d.db||40,log=d.radial==='log',R0=this.R0;let max=1e-300;for(const v of values)if(v>max)max=v;
    const rad=v=>log?Math.max(0,1+10*Math.log10(Math.max(v/max,1e-300))/range):v/max;
    const pos=new Float32Array((T+1)*(P+1)*3),col=new Float32Array(pos.length),idx=new ((T+1)*(P+1)>65535?Uint32Array:Uint16Array)(T*P*6);
    for(let i=0;i<=T;i++)for(let j=0;j<=P;j++){
      const k=i*(P+1)+j,th=Math.PI*i/T,ph=2*Math.PI*j/P,v=values[k],r=R0*rad(v),w=MieScene.W([r*Math.sin(th)*Math.cos(ph),r*Math.sin(th)*Math.sin(ph),r*Math.cos(th)]);
      pos.set([w.x,w.y,w.z],3*k);col.set(MieScene.lin(Colormap.heat(.9*(log?1+10*Math.log10(Math.max(v/max,1e-300))/range:v/max))),3*k);
    }
    for(let i=0,k=0;i<T;i++)for(let j=0;j<P;j++){const a=i*(P+1)+j,b=a+P+1;idx.set([a,b,a+1,a+1,b,b+1],k);k+=6;}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(new THREE.BufferAttribute(idx,1));g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,new THREE.MeshPhongMaterial({vertexColors:true,side:THREE.DoubleSide,shininess:28,specular:0x333333}));
    this.content.add(mesh);this.pickMesh=mesh;this.pickScale=1;
    this.patternRadius=(th,ph)=>{const u=Math.max(0,Math.min(T,th/Math.PI*T)),v=((ph%(2*Math.PI))+2*Math.PI)%(2*Math.PI)/(2*Math.PI)*P,i=Math.min(T-1,Math.floor(u)),j=Math.min(P-1,Math.floor(v)),a=u-i,b=v-j,k=i*(P+1)+j;return R0*rad((1-a)*((1-b)*values[k]+b*values[k+1])+a*((1-b)*values[k+P+1]+b*values[k+P+2]));};
  }
  buildSlice(d){
    // d: {extent, inner, plane, K, field(p)->{e,I}, quantity, component, vectors, circles}
    // The field lives on the annulus inner <= r <= extent. Grid cells that cross a boundary are
    // kept and the fragment shader clips them exactly at both radii, so the edges stay round.
    // Grid points inside the sphere take the surface value (the outside expansion is invalid there).
    const K=d.K,ext=d.extent,inner=d.inner||0,s=this.R0/ext,plane=d.plane,toP=(u,v)=>plane==='xz'?[v,0,u]:plane==='yz'?[0,v,u]:[u,v,0];
    const n=(K+1)*(K+1),pos=new Float32Array(3*n),E=new Float32Array(6*n),I=new Float32Array(n),D=new Float32Array(n),ok=new Uint8Array(n),inside=new Uint8Array(n),rad=new Float32Array(n);
    for(let i=0;i<=K;i++)for(let j=0;j<=K;j++){const k=i*(K+1)+j,r=Math.hypot((-1+2*j/K)*ext,(-1+2*i/K)*ext);rad[k]=r;inside[k]=r<=ext&&r>=inner?1:0;}
    for(let i=0;i<=K;i++)for(let j=0;j<=K;j++){
      const k=i*(K+1)+j,p=toP((-1+2*j/K)*ext,(-1+2*i/K)*ext);let q=p;
      if(!inside[k]){
        let near=false;for(let a=-1;a<=1&&!near;a++)for(let b=-1;b<=1;b++){const ii=i+a,jj=j+b;if(ii>=0&&jj>=0&&ii<=K&&jj<=K&&inside[ii*(K+1)+jj]){near=true;break;}}
        const r=rad[k];if(!near||(r<inner&&r<1e-9))continue;if(r<inner)q=p.map(c=>c*inner/r);
      }
      const w=MieScene.W(p,s),f=d.field(q);pos.set([w.x,w.y,w.z],3*k);E.set(f.e,6*k);I[k]=f.I;D[k]=f.dI??0;ok[k]=1;
    }
    const idx=[];for(let i=0;i<K;i++)for(let j=0;j<K;j++){const a=i*(K+1)+j,b=a+1,c=a+K+1,e=c+1;if(ok[a]&&ok[b]&&ok[c])idx.push(a,b,c);if(ok[b]&&ok[e]&&ok[c])idx.push(b,e,c);}
    // Robust color scale: 99.5th percentile, so a single hot spot does not wash out the map.
    const comp=2*(d.component||0),amps=[],ints=[],dis=[];for(let k=0;k<n;k++)if(inside[k])dis.push(Math.abs(D[k]));for(let k=0;k<n;k++)if(inside[k]){amps.push(Math.hypot(E[6*k+comp],E[6*k+comp+1]));ints.push(I[k]);}
    const pct=(a,q)=>{if(!a.length)return 1;a.sort((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor(q*(a.length-1)))]||a.at(-1)||1;};
    this.scaleAmp=Math.max(1e-30,pct(amps,.995));this.scaleI=Math.max(1e-30,pct(ints,.98));this.maxI=Math.max(1e-30,ints.at(-1)||0);
    // Log colour spans the data's own dynamic range (1st percentile to max), 20-80 dB.
    this.dbRange=Math.round(Math.max(20,Math.min(80,10*Math.log10(this.maxI/Math.max(1e-300,ints[Math.floor(.01*(ints.length-1))]||this.maxI*1e-3))))/5)*5;
    this.scaleD=Math.max(1e-12,pct(dis,.98));this.saturated={amp:amps.at(-1)>this.scaleAmp*1.02,int:this.maxI>this.scaleI*1.02,d:dis.at(-1)>this.scaleD*1.02};
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(new Float32Array(3*n),3));g.setIndex(idx);
    const mat=new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide}),rOut=this.R0*1.0005,rIn=inner*s;
    mat.onBeforeCompile=sh=>{
      sh.uniforms.uROut={value:rOut};sh.uniforms.uRIn={value:rIn};
      sh.vertexShader=sh.vertexShader.replace('#include <common>','#include <common>\nvarying vec3 vSlice;').replace('#include <begin_vertex>','#include <begin_vertex>\nvSlice=position;');
      sh.fragmentShader=sh.fragmentShader.replace('#include <common>','#include <common>\nvarying vec3 vSlice;uniform float uROut;uniform float uRIn;').replace(/void main\(\)\s*\{/,'void main(){\nfloat rr=length(vSlice);if(rr>uROut||rr<uRIn)discard;');
    };
    const mesh=new THREE.Mesh(g,mat);this.content.add(mesh);this.pickMesh=mesh;this.pickScale=s;
    this.slice={E,I,D,ok,n,mesh,d};
    // Boundary and reference circles in the slice plane.
    const circle=(r,color,dashed,label,cu=0,cv=0)=>{const pts=[];for(let i=0;i<=160;i++){const t=2*Math.PI*i/160;pts.push(MieScene.W(toP(cu+r*Math.cos(t),cv+r*Math.sin(t)),s));}
      const geo=new THREE.BufferGeometry().setFromPoints(pts),line=new THREE.Line(geo,dashed?new THREE.LineDashedMaterial({color,dashSize:.14,gapSize:.1,depthTest:false}):new THREE.LineBasicMaterial({color,transparent:true,opacity:.6,depthTest:false}));
      if(dashed)line.computeLineDistances();line.renderOrder=6;this.content.add(line);
      if(label){const l=this.label(label,color,.9);l.position.copy(MieScene.W(toP(r*Math.cos(.62),r*Math.sin(.62)),s*(1+.25/(r*s))));this.content.add(l);}};
    circle(ext,this.colors.muted,false);
    for(const c of d.circles||[])if(c.r<ext)circle(c.r,this.colors.probe,true,c.label);
    // Rings: plain radii (centred) or {r, u, v} circles centred at (u, v) in the slice plane.
    if(d.particle?.show!==false)for(const r of d.particle?.rings||[])typeof r==='number'?circle(r,this.colors.ink2,false):circle(r.r,this.colors.ink2,false,null,r.u,r.v);
    // Scale bar (physical sizes), d.scale = {len (same units as extent), label}. It lies in the slice
    // plane, outside the disc at its lower left, and runs horizontally on screen in the default view:
    // its direction is the home camera's right vector, and "down" its down vector, both within the plane.
    if(d.scale){
      const cam=new THREE.Vector3(...MieScene.HOME[plane]).normalize(),right=new THREE.Vector3(0,1,0).cross(cam).normalize(),down=right.clone().cross(cam);
      const eu=MieScene.W(toP(1,0)),ev=MieScene.W(toP(0,1)),inPlane=w=>{const q=[w.dot(eu),w.dot(ev)],l=Math.hypot(...q)||1;return q.map(x=>x/l);};
      const al=inPlane(right),dw=inPlane(down),dd=dw[0]*al[0]+dw[1]*al[1],dn0=[dw[0]-dd*al[0],dw[1]-dd*al[1]],dl=Math.hypot(...dn0)||1,dn=dn0.map(x=>x/dl);
      const c=this.colors.ink,L=d.scale.len;
      const at=(a,b)=>MieScene.W(toP(al[0]*a+dn[0]*b,al[1]*a+dn[1]*b),s);
      const rect=(a0,b0,a1,b1)=>{const g=new THREE.BufferGeometry().setFromPoints([at(a0,b0),at(a1,b0),at(a1,b1),at(a0,b1)]);g.setIndex([0,1,2,0,2,3]);
        const m=new THREE.Mesh(g,new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide,depthTest:false,transparent:true,opacity:.9}));m.renderOrder=7;this.content.add(m);};
      const a0=-ext,b=.94*ext,t=.02*ext,h=.045*ext,w=.03*ext;
      rect(a0,b-t,a0+L,b+t);rect(a0,b-h,a0+w,b+h);rect(a0+L-w,b-h,a0+L,b+h);
      const lab=this.label(d.scale.label,c,1.5);lab.position.copy(at(a0+L/2,b+.17*ext));this.content.add(lab);
    }
    // Vector glyphs on a coarse grid.
    this.arrows=[];
    if(d.vectors){const A=12;for(let i=0;i<=A;i++)for(let j=0;j<=A;j++){
      const u=(-.92+1.84*j/A)*ext,v=(-.92+1.84*i/A)*ext,p=toP(u,v),r=Math.hypot(...p);if(r>ext*.97||r<inner*1.12)continue;
      const f=d.field(p),a=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),MieScene.W(p,s),.3,this.colors.ink,.1,.06);
      for(const m of [a.line.material,a.cone.material]){m.depthTest=false;m.transparent=true;m.opacity=.85;}a.renderOrder=8;a.userData.e=Float64Array.from(f.e);this.content.add(a);this.arrows.push(a);}}
  }
  buildSphere(d){
    // Angular field on the unit sphere: color |F|^2, tangential arrows Re{F e^{-i w t}}.
    const T=90,P=120,R=this.R0*.92,n=(T+1)*(P+1),pos=new Float32Array(3*n),col=new Float32Array(3*n),idx=[];let max=1e-30;const I=new Float32Array(n);
    for(let i=0;i<=T;i++)for(let j=0;j<=P;j++){const k=i*(P+1)+j,th=Math.PI*i/T,ph=2*Math.PI*j/P,e=d.field(th,ph);I[k]=e.reduce((s,v)=>s+v*v,0);max=Math.max(max,I[k]);const w=MieScene.W([Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th)],R);pos.set([w.x,w.y,w.z],3*k);}
    for(let k=0;k<n;k++)col.set(MieScene.lin(Colormap.heat(.08+.92*I[k]/max)),3*k);
    for(let i=0;i<T;i++)for(let j=0;j<P;j++){const a=i*(P+1)+j,b=a+P+1;idx.push(a,b,a+1,a+1,b,b+1);}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(pos,3));g.setAttribute('color',new THREE.BufferAttribute(col,3));g.setIndex(idx);g.computeVertexNormals();
    const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true}));this.content.add(mesh);this.pickMesh=mesh;this.pickScale=R;
    this.sphereMax=max;this.arrows=[];
    for(let i=1;i<14;i++){const th=Math.PI*i/14,count=Math.max(6,Math.round(26*Math.sin(th)));for(let j=0;j<count;j++){const ph=2*Math.PI*(j+(i%2)*.5)/count,p=[Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th)];
      const a=new THREE.ArrowHelper(new THREE.Vector3(1,0,0),MieScene.W(p,R*1.012),.3,this.colors.ink,.09,.055);a.userData.e=Float64Array.from(d.field(th,ph));a.userData.sphere=true;this.content.add(a);this.arrows.push(a);}}
  }
  setPhase(t){
    this.phase=t;const ct=Math.cos(t),st=Math.sin(t);
    if(this.slice){
      const {E,I,D,ok,n,mesh,d}=this.slice,col=mesh.geometry.getAttribute('color'),arr=col.array,comp=2*(d.component||0),q=d.quantity;
      const L=this.lut,div=q==='re'||q==='dI',tab=div?L.div:L.heat,Nl=L.N;
      for(let k=0;k<n;k++){if(!ok[k])continue;let t;
        if(q==='dI')t=.5+.5*D[k]/this.scaleD;
        else if(div)t=.5+.5*(E[6*k+comp]*ct+E[6*k+comp+1]*st)/this.scaleAmp;
        else if(q==='int')t=I[k]/this.scaleI;
        else t=1+10*Math.log10(Math.max(I[k]/this.maxI,1e-30))/this.dbRange;
        const j=3*Math.round(Math.max(0,Math.min(1,t))*Nl);arr[3*k]=tab[j];arr[3*k+1]=tab[j+1];arr[3*k+2]=tab[j+2];}
      col.needsUpdate=true;
    }
    const ref=this.slice?Math.sqrt(this.scaleI):1;
    for(const a of this.arrows){const e=a.userData.e,v=MieScene.W([e[0]*ct+e[1]*st,e[2]*ct+e[3]*st,e[4]*ct+e[5]*st]);
      const len=a.userData.sphere?.36*Math.min(1.2,v.length()/Math.sqrt(this.sphereMax)):.42*Math.min(1.25,v.length()/ref);
      a.visible=len>.012;if(a.visible){a.setDirection(v.normalize());a.setLength(len,Math.min(.11,len*.38),Math.min(.065,len*.22));}}
    this.dirty=true;
  }
  setProbe(p,kind){
    if(!p){this.probe.visible=false;this.dirty=true;return;}
    this.probe.visible=true;let w;const r=Math.hypot(...p)||1;
    if(kind==='pattern'&&this.patternRadius){const th=Math.acos(Math.max(-1,Math.min(1,p[2]/r))),ph=Math.atan2(p[1],p[0]);w=MieScene.W(p,(this.patternRadius(th,ph)+.06)/r);}
    else if(kind==='sphere')w=MieScene.W(p,this.R0*.92*1.02/r);
    else w=MieScene.W(p,this.slice?this.R0/this.slice.d.extent:1);
    this.marker.position.copy(w);this.stem.geometry.dispose();this.stem.geometry=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),w]);this.stem.computeLineDistances();this.dirty=true;
  }
  frame(){if(this.dirty){this.renderer.render(this.scene,this.camera);this.dirty=false;}}
  image(){this.renderer.render(this.scene,this.camera);return this.renderer.domElement.toDataURL('image/png');}
}

/* Term-by-term evaluation of the series at the detector, using the same
   numerical terms as the 3D view. */
class SeriesInspector{
  constructor(dialog){
    this.d=dialog;this.q=s=>dialog.querySelector(s);this.open_=0;
    this.q('[data-close]').onclick=()=>dialog.close();
    dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
    this.q('#insComponent').onchange=e=>{this.comp=+e.target.value;this.render();};
    this.q('#insChannel').onchange=e=>{this.ch=+e.target.value;this.render();};
    this.q('#insOrder').oninput=e=>{this.K=+e.target.value;this.render();};
    this.q('#insNext').onclick=()=>{this.K=Math.min(this.N,this.K+1);this.render();};
    this.q('#insAll').onclick=()=>{this.K=this.N;this.render();};
    this.q('#insTerms').addEventListener('click',e=>{const b=e.target.closest('[data-n]');if(!b)return;const n=+b.dataset.n;this.open_=this.open_===n?0:n;this.render();this.q(`[data-n="${n}"]`)?.focus();});
  }
  show(data){
    this.data=data;this.ch=0;this.comp=data.component||0;this.N=data.channels[0].details.length;this.K=this.N;this.open_=0;
    this.q('#insComponent').innerHTML=data.components.map((l,i)=>`<option value="${i}">${l}</option>`).join('');this.q('#insComponent').value=this.comp;
    this.q('#insChannelWrap').hidden=data.channels.length<2;this.q('#insChannel').value=0;
    this.q('#insPosition').textContent=data.position;this.q('#insContext').innerHTML=data.context;this.q('#insFormula').innerHTML=data.formula;
    const o=this.q('#insOrder');o.max=this.N;if(!this.d.open)this.d.showModal();this.render();
  }
  partial(ch,K){return ch.details.slice(0,K).reduce((e,t)=>e.map((v,i)=>v+t.electric[i]+t.magnetic[i]),[...(ch.incident||[0,0,0,0,0,0])]);}
  render(){
    const d=this.data,ch=d.channels[this.ch],i0=2*this.comp,K=this.K,q=this.q;
    const sum=this.partial(ch,K),z=[sum[i0],sum[i0+1]],full=this.partial(ch,this.N);
    const inten=k=>d.channels.reduce((s,c)=>s+Mie.norm2(this.partial(c,k)),0)/d.channels.length;
    q('#insOrder').value=K;q('#insOrder').style.setProperty('--pct',100*K/this.N+'%');q('#insOrderValue').textContent=`${K} of ${this.N}`;q('#insNext').disabled=K>=this.N;
    q('#insSum').textContent=Fmt.cx(z);q('#insSumFull').textContent=Fmt.cx([full[i0],full[i0+1]]);
    q('#insI').textContent=Fmt.num(inten(K),5);q('#insIFull').textContent=Fmt.num(inten(this.N),5);q('#insILabel').textContent=d.valueLabel;
    q('#insChannelNote').hidden=d.channels.length<2;
    let run=[(ch.incident||[])[i0]||0,(ch.incident||[])[i0+1]||0],html='';
    if(d.includeIncident)html+=`<tr class="inc"><th>${d.incidentLabel||'Incident'}</th><td colspan="3">${d.incidentLabel?.startsWith('−')?'Incident plane wave subtracted at this point':'Exact plane wave at this point'}</td><td>${Fmt.cx(run)}</td></tr>`;
    for(const t of ch.details){
      const e=[t.electric[i0],t.electric[i0+1]],m=[t.magnetic[i0],t.magnetic[i0+1]],s=[e[0]+m[0],e[1]+m[1]];run=[run[0]+s[0],run[1]+s[1]];
      html+=`<tr class="${t.n>K?'later':''}"><th><button data-n="${t.n}" aria-expanded="${t.n===this.open_}">${t.n===this.open_?'▾':'▸'} n = ${t.n}</button></th><td>${Fmt.cx(e)}</td><td>${Fmt.cx(m)}</td><td>${Fmt.cx(s)}</td><td>${Fmt.cx(run)}</td></tr>`;
      if(t.n===this.open_){
        const eb=[t.electricBasis[i0],t.electricBasis[i0+1]],mb=[t.magneticBasis[i0],t.magneticBasis[i0+1]];
        const facts=[`${d.factorLabel} = ${Fmt.cx(t.en)}`];if(t.a)facts.push(`a<sub>${t.n}</sub> = ${Fmt.cx(t.a)}`,`b<sub>${t.n}</sub> = ${Fmt.cx(t.b)}`);facts.push(`π<sub>${t.n}</sub> = ${Fmt.num(t.pi,5)}`,`τ<sub>${t.n}</sub> = ${Fmt.num(t.tau,5)}`);if(t.radial)facts.push(`${d.radialLabel}(kr) = ${Fmt.cx(t.radial)}`);
        html+=`<tr class="detail"><td colspan="5"><p>${facts.join(' · ')}</p><div class="prod"><div><b>Electric (N) term</b> = coefficient ${Fmt.cx(t.electricCoefficient)} × basis ${Fmt.cx(eb)} = ${Fmt.cx(e)}</div><div><b>Magnetic (M) term</b> = coefficient ${Fmt.cx(t.magneticCoefficient)} × basis ${Fmt.cx(mb)} = ${Fmt.cx(m)}</div></div></td></tr>`;
      }
    }
    q('#insTerms').innerHTML=html;
    const inc=q('#insInterference');inc.hidden=!d.includeIncident;
    if(d.includeIncident){const mean=f=>d.channels.reduce((s,c)=>s+f(c),0)/d.channels.length,I=inten(K),Ii=mean(c=>Mie.norm2(c.incident)),Is=mean(c=>Mie.norm2(this.partial(c,K).map((v,i)=>v-c.incident[i])));
      inc.innerHTML=d.incidentLabel?.startsWith('−')?`Inside the particle: |E − E<sub>inc</sub>|² = |E|² + |E<sub>inc</sub>|² − 2 Re(E·E<sub>inc</sub>*): <b>${Fmt.num(I,4)}</b>, with |E|² = ${Fmt.num(Is,4)} for the internal field alone.`
        :`|E|² = |E<sub>inc</sub>|² + |E<sub>sca</sub>|² + interference: <b>${Fmt.num(I,4)}</b> = ${Fmt.num(Ii,4)} + ${Fmt.num(Is,4)} ${I-Ii-Is<0?'−':'+'} ${Fmt.num(Math.abs(I-Ii-Is),4)}`;}
    requestAnimationFrame(()=>drawPhasor(q('#insPhasor'),{terms:ch.details.map(t=>[t.electric[i0]+t.magnetic[i0],t.electric[i0+1]+t.magnetic[i0+1]]),start:d.includeIncident?[ch.incident[i0],ch.incident[i0+1]]:null,K,highlight:this.open_}));
  }
}

/* Historical comparisons evaluated with the same Mie / harmonic core as the lab.
   No curves are traced or fitted to the source images. */
