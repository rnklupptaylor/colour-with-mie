(function(root){
 'use strict';
 const schemes={sample:'Sample labels',alpha:'(a), (b), (c)',roman:'(i), (ii), (iii)',upper:'A, B, C',numeric:'1, 2, 3'};
 const roman=['i','ii','iii','iv','v','vi','vii','viii','ix','x'];
 const backdrops=new Map();
 function label(sample,index,scheme){return scheme==='alpha'?'('+String.fromCharCode(97+index)+')':scheme==='roman'?'('+roman[index]+')':scheme==='upper'?String.fromCharCode(65+index):scheme==='numeric'?String(index+1):sample.name;}
 function options(settings={},given={}){return {gap:Math.max(0,Math.min(1,given.gap??settings.familyGap??.12)),rowGap:Math.max(0,Math.min(.6,given.rowGap??settings.familyRowGap??.08)),scheme:schemes[given.scheme||settings.familyScheme]?given.scheme||settings.familyScheme:'sample',labels:given.labels??settings.familyLabels??true};}
 function layout(n,settings={},given={},edge=1800){
  const p=options(settings,given),cu=settings.container&&settings.container!=='vial',yaw=settings.yaw||0,depth=settings.container==='cuvette1'?.35:1.25,physicalWidth=['seidel','monolith'].includes(settings.container)?2.85:cu?1.25*Math.abs(Math.cos(yaw))+depth*Math.abs(Math.sin(yaw)):1.14,nativeScale=['seidel','monolith'].includes(settings.container)?3.9:cu?5.18:3.9;
  const cropAspect=physicalWidth/nativeScale+.02,renderAspect=Math.max(.42,cropAspect+.05),margin=.025,gap=p.gap*cropAspect,labelHeight=p.scheme==='sample'?.14:.09,widthUnits=2*margin+n*cropAspect+Math.max(0,n-1)*gap,heightUnits=2+2*margin+p.rowGap+labelHeight,scale=edge/Math.max(widthUnits,heightUnits);
  const width=Math.max(1,Math.round(widthUnits*scale)),height=Math.max(1,Math.round(heightUnits*scale)),tileHeight=Math.max(8,Math.round(scale)),renderWidth=Math.max(8,Math.round(renderAspect*scale)),cropWidth=cropAspect*scale,step=(cropAspect+gap)*scale,left=margin*scale,top=margin*scale,bottom=top+tileHeight+(p.rowGap+labelHeight)*scale;
  return {width,height,tileHeight,renderWidth,cropWidth,cropAspect,renderAspect,step,left,top,bottom,labelY:top+tileHeight+(p.rowGap/2+labelHeight/2)*scale,labelHeight:labelHeight*scale,scale,prefs:p,count:n};
 }
 async function rowBackdrop(l,settings,lighting,signal){const key=JSON.stringify([l.width,l.tileHeight,l.renderWidth,l.cropWidth,l.count,l.scale,l.step,l.left,sceneKey(settings),lighting]);if(backdrops.has(key))return backdrops.get(key);const c=document.createElement('canvas');c.width=l.width;c.height=l.tileHeight;const ctx=c.getContext('2d');await (root.MieStudioPaint||MieStudio).paint(ctx,{width:c.width,height:c.height,cols:l.count,rows:1,scale:l.scale,tileWidth:l.renderWidth,tileHeight:l.tileHeight,columnStep:l.step/l.scale,marginX:(l.left-(l.renderWidth-l.cropWidth)/2)/l.scale,topPadding:0,rowStep:l.tileHeight/l.scale},{...settings,lighting},['seidel','monolith'].includes(settings.container)?0:l.count,[],signal);backdrops.set(key,c);while(backdrops.size>6)backdrops.delete(backdrops.keys().next().value);return c;}
 function wrap(ctx,text,width){const words=String(text).split(/\s+/),lines=[];let line='';for(const word of words){if(line&&ctx.measureText(line+' '+word).width>width){lines.push(line);line=word;}else line+=(line?' ':'')+word;}if(line)lines.push(line);if(lines.length>2){let last=lines.slice(1).join(' ');while(last.length&&ctx.measureText(last+'…').width>width)last=last.slice(0,-1);return [lines[0],last+'…'];}return lines;}
 async function paint(canvas,samples,settings,frames,given={},edge=1800,{signal}={}){
  const l=layout(samples.length,settings,given,edge);canvas.width=l.width;canvas.height=l.height;const ctx=canvas.getContext('2d');ctx.fillStyle='#eeeeee';ctx.fillRect(0,0,l.width,l.height);
  for(const [light,y] of [['back',l.top],['room',l.bottom]]){const bg=await rowBackdrop(l,settings,light,signal);ctx.drawImage(bg,0,y,l.width,l.tileHeight);for(let i=0;i<samples.length;i++){const image=frames[i]?.[light]?.canvas;if(!image)continue;const crop=Math.min(image.width,l.cropAspect*image.height);ctx.drawImage(image,(image.width-crop)/2,0,crop,image.height,l.left+i*l.step,y,l.cropWidth,l.tileHeight);}}
  if(l.prefs.labels){ctx.fillStyle='#171717';ctx.textAlign='center';ctx.textBaseline='middle';const font=Math.max(9,.048*l.scale);ctx.font=`500 ${font}px Arial, sans-serif`;samples.forEach((s,i)=>{const text=label(s,i,l.prefs.scheme),lines=wrap(ctx,text,l.step*.98);lines.forEach((line,k)=>ctx.fillText(line,l.left+i*l.step+l.cropWidth/2,l.labelY+(k-(lines.length-1)/2)*font*1.18));});}
  return l;
 }
 function sceneKey(settings){return ['container','walls','diameter','gain','pitch','yaw','illuminant','whiteBalance','wettingMode','contactAngle','surfaceTension','solventDensity','seidelMatrix','seidelLogo','seidelFrontLight','_exportQuality','renderQuality','paintCard'].map(k=>[k,settings[k]]);}
 function imageKey(sample,settings,lighting){return JSON.stringify([MieLightboxModel.key(sample,settings),sample.phi,sample.solid,sceneKey(settings),lighting]);}
 root.MieFamily={schemes,label,options,layout,paint,imageKey};
})(globalThis);
