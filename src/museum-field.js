(function(root){
  'use strict';
  const references={'mie-3':180,'mie-9':180,'mie-10':180};
  function phase(exhibit){return references[exhibit.id]||0;}
  function prepare(scene,model){
    for(const arrow of scene.arrows){scene.content.remove(arrow);scene.disposeGroup(arrow);}scene.arrows=[];
    const samples=[];
    for(let i=1;i<36;i++){
      const theta=Math.PI*i/36,count=Math.max(8,Math.round(72*Math.sin(theta)));
      for(let j=0;j<count;j++){const phi=2*Math.PI*(j+(i%2)*.5)/count,p=[Math.sin(theta)*Math.cos(phi),Math.sin(theta)*Math.sin(phi),Math.cos(theta)];samples.push({p,f:model.field(theta,phi)});}
    }
    model.arrows=samples;
  }
  function draw(canvas,scene,model,alpha){
    const w=canvas.clientWidth,h=canvas.clientHeight,d=canvas.width/w,c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);if(!alpha||!scene||!model.arrows)return;
    scene.camera.updateMatrixWorld();const occupied=new Set(),ct=Math.cos(model.phase),st=Math.sin(model.phase),R=scene.R0*.92;
    c.globalAlpha=Math.min(1,alpha*1.4);c.lineCap='round';c.lineJoin='round';
    for(const {p,f} of model.arrows){
      const normal=MieScene.W(p),origin=normal.clone().multiplyScalar(R*1.012),toward=scene.camera.position.clone().sub(origin);
      if(normal.dot(toward)<=.08*toward.length())continue;
      const vector=MieScene.W([f[0]*ct+f[1]*st,f[2]*ct+f[3]*st,f[4]*ct+f[5]*st]),strength=vector.length();if(strength<1e-5)continue;
      const end=origin.clone().add(vector.normalize().multiplyScalar(.3*Math.min(1.2,strength/Math.sqrt(scene.sphereMax))));
      const a=origin.project(scene.camera),b=end.project(scene.camera),x=(a.x+1)*w/2,y=(1-a.y)*h/2,dx=(b.x-a.x)*w/2,dy=-(b.y-a.y)*h/2,length=Math.hypot(dx,dy);
      if(x<3||x>w-3||y<3||y>h-3||length<.15)continue;
      const cell=`${Math.round(x/8)},${Math.round(y/8)}`;if(occupied.has(cell))continue;occupied.add(cell);
      const size=Math.max(6,Math.min(20,length)),ux=dx/length,uy=dy/length,ex=x+ux*size,ey=y+uy*size,head=Math.min(4,size*.4);
      c.beginPath();c.moveTo(x,y);c.lineTo(ex,ey);c.moveTo(ex-head*ux+head*.58*uy,ey-head*uy-head*.58*ux);c.lineTo(ex,ey);c.lineTo(ex-head*ux-head*.58*uy,ey-head*uy+head*.58*ux);
      c.strokeStyle='#fff';c.lineWidth=4;c.stroke();c.strokeStyle='#15202b';c.lineWidth=1.6;c.stroke();
    }
    c.globalAlpha=1;
  }
  root.MuseumField={phase,prepare,draw};
})(typeof globalThis!=='undefined'?globalThis:this);