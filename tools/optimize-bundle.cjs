/* Build-time lossless packing. Readable source files remain unchanged.
   Graph coordinates retain their IEEE-754 Float64 bits. Workers recover the
   same source text from marked copies that already run in the main document. */
const crypto=require('node:crypto'),vm=require('node:vm');
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
function runtime(root,refs,axes,packets){
 'use strict';const xCache=new Map(),yCache=new Map();
 function floats(text){const raw=atob(text),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);const view=new DataView(bytes.buffer),out=new Float64Array(bytes.length/8);for(let i=0;i<out.length;i++)out[i]=view.getFloat64(8*i,true);return out;}
 function axis(id){if(xCache.has(id))return xCache.get(id);const spec=axes[id],out=typeof spec==='string'?floats(spec):Float64Array.from({length:spec[2]},(_,i)=>spec[0]+i*spec[1]);xCache.set(id,out);return out;}
 function points(id){const p=packets[id],x=axis(p[0]);let y=yCache.get(id);if(!y){y=floats(p[1]);yCache.set(id,y);}if(x.length!==y.length)throw Error('A stored graph is incomplete.');return Array.from(y,(v,i)=>[x[i],v]);}
 function source(id){const r=refs[id],node=document.getElementById(r[0]);if(!node)throw Error('A shared app module is missing.');const text=node.textContent,a=text.indexOf(r[1]),b=text.indexOf(r[2],a+r[1].length);if(a<0||b<0)throw Error('A shared app module is incomplete.');return text.slice(a+r[1].length,b).replace(/\r+\n/g,'\n');}
 root.MieBundle={points,source};
}
function literalAt(h,prefix){const i=h.indexOf(prefix);if(i<0)throw Error('Missing worker '+prefix);const start=i+prefix.length;if(h[start]!=='"')throw Error('Expected worker JSON string.');let end=start+1;while(end<h.length){if(h[end]==='\\'){end+=2;continue;}if(h[end]==='"'){end++;break;}end++;}const literal=h.slice(start,end);return {start,end,literal,value:JSON.parse(literal)};}
function jsonAt(h,marker){const i=h.indexOf(marker);if(i<0)throw Error('Missing data marker '+marker);const start=i+marker.length;let end=start,inString=false,escaped=false,depth=0;for(;end<h.length;end++){const c=h[end];if(inString){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')inString=false;}else if(c==='"')inString=true;else if(c==='{'||c==='[')depth++;else if(c==='}'||c===']'){depth--;if(!depth){end++;break;}}}return {start,end,value:JSON.parse(h.slice(start,end))};}
function optimizeBundle(input,groups){
 let h=input;const axes=[],packets=[],axisIds=new Map(),packetIds=new Map(),originals=[],packedExpressions=[];let pointCount=0,pointArrays=0;
 const doubles=a=>{const b=Buffer.alloc(a.length*8);a.forEach((v,i)=>b.writeDoubleLE(v,8*i));return b;};
 function packedPoints(a){
  const x=a.map(p=>p[0]),y=a.map(p=>p[1]),xb=doubles(x),yb=doubles(y),xkey=xb.toString('base64');let xid=axisIds.get(xkey);
  if(xid===undefined){xid=axes.length;axisIds.set(xkey,xid);const step=x.length>1?x[1]-x[0]:0,arithmetic=x.every((v,i)=>Object.is(v,x[0]+i*step));axes.push(arithmetic?[x[0],step,x.length]:xkey);}
  const key=xid+':'+yb.toString('base64');let pid=packetIds.get(key);if(pid===undefined){pid=packets.length;packetIds.set(key,pid);packets.push([xid,yb.toString('base64')]);}
  pointCount+=a.length;pointArrays++;return 'MieBundle.points('+pid+')';
 }
 function expression(v){
  if(Array.isArray(v)){if(v.length>=32&&v.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))return packedPoints(v);return '['+v.map(expression).join(',')+']';}
  if(v&&typeof v==='object')return '{'+Object.entries(v).map(([k,x])=>JSON.stringify(k)+':'+expression(x)).join(',')+'}';
  return JSON.stringify(v);
 }
 // These two caches contain the historical curves. Optical-constant tables,
 // simulation code, images, fonts and mesh bytes are left unchanged.
 for(const marker of ['const catalog=[{"figure":"4.6"','const catalog=[{"kind":"book","paperArtifact":true']){
  const from=h.indexOf(marker);if(from<0)throw Error('Missing historical curve catalog.');const i=h.indexOf(',data=',from),prefix=h.slice(0,i),tail=h.slice(i),data=jsonAt(tail,',data='),encoded=expression(data.value);originals.push(data.value);packedExpressions.push(encoded);h=prefix+tail.slice(0,data.start)+encoded+tail.slice(data.end);
 }
 const refs={},shared=[];
 for(const [name,body] of Object.entries(groups)){
  if(h.split(body).length!==2)throw Error('Non-unique main module '+name);const begin='/*CWM_SHARED_BEGIN:'+name+'*/',end='/*CWM_SHARED_END:'+name+'*/';h=h.replace(body,()=>begin+body+end);shared.push({name,body:body.replace(/\r+\n/g,'\n'),begin,end});
 }
 // Assign an id only to a script which contains a shared module.
 let scriptIndex=0;h=h.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi,(all,attrs,body)=>{const index=scriptIndex++,inHere=shared.filter(g=>body.includes(g.begin));if(!inHere.length)return all;let id=/\bid=["']([^"']+)["']/.exec(attrs)?.[1];if(!id){id='cwm-shared-script-'+index;attrs+=' id="'+id+'"';}for(const g of inHere)refs[g.name]=[id,g.begin,g.end];return '<script'+attrs+'>'+body+'</script>';});
 const workerChecks=[];
 for(const name of ['MiePopulationWorkerSource','MieLightboxRenderWorkerSource']){
  const found=literalAt(h,'globalThis.'+name+'='),w=found.value,matches=[];
  for(const g of shared){const i=w.indexOf(g.body);if(i>=0){if(w.indexOf(g.body,i+g.body.length)>=0)throw Error('Repeated worker group '+g.name);matches.push({at:i,group:g});}}
  matches.sort((a,b)=>a.at-b.at);let pos=0;const pieces=[];
  for(const m of matches){if(m.at>pos)pieces.push(JSON.stringify(w.slice(pos,m.at)));pieces.push('MieBundle.source('+JSON.stringify(m.group.name)+')');pos=m.at+m.group.body.length;}
  if(pos<w.length)pieces.push(JSON.stringify(w.slice(pos)));if(!matches.length)throw Error('No shared module in '+name);const expr='['+pieces.join(',')+'].join("")';h=h.slice(0,found.start)+expr+h.slice(found.end);workerChecks.push({name,expression:expr,sha256:sha(w),unescapedBytes:Buffer.byteLength(w),shared:matches.map(m=>m.group.name)});
 }
 const bootstrap='('+runtime.toString()+')(globalThis,'+JSON.stringify(refs)+','+JSON.stringify(axes)+','+JSON.stringify(packets)+');';
 h=h.replace('</head>','<script id="cwm-lossless-bundle">'+bootstrap+'</script>\n</head>');
 // Verify the actual emitted decoder, including every repeated point array.
 const scripts=new Map();for(const m of h.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){const id=/\bid=["']([^"']+)["']/.exec(m[1])?.[1];if(id)scripts.set(id,m[2]);}
 const context=vm.createContext({atob,Uint8Array,Float64Array,DataView,Array,Map,document:{getElementById:id=>({textContent:scripts.get(id)})}});vm.runInContext(bootstrap,context);
 let decodedPoints=0;function equal(a,b){if(Array.isArray(a)){if(!Array.isArray(b)||a.length!==b.length)throw Error('Stored graph length changed.');if(a.length>=32&&a.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite)))decodedPoints+=a.length;for(let i=0;i<a.length;i++)equal(a[i],b[i]);}else if(a&&typeof a==='object'){if(Object.keys(a).join('|')!==Object.keys(b).join('|'))throw Error('Stored graph fields changed.');for(const k in a)equal(a[k],b[k]);}else if(!Object.is(a,b))throw Error('A stored graph value changed.');}
 for(let i=0;i<originals.length;i++)equal(originals[i],vm.runInContext('('+packedExpressions[i]+')',context));
 for(const w of workerChecks)if(sha(vm.runInContext(w.expression,context))!==w.sha256)throw Error('Worker source changed: '+w.name);
 const audit={inputBytes:Buffer.byteLength(input),outputBytes:Buffer.byteLength(h),savedBytes:Buffer.byteLength(input)-Buffer.byteLength(h),pointArrays,pointCount,decodedPoints,uniqueCurvePackets:packets.length,sharedAxes:axes.length,allCurveValuesBitExact:true,workerSourcesIdentical:true,workers:workerChecks.map(({expression,...r})=>r),imagesAndFontsUnchanged:true};
 return {html:h,audit};
}
module.exports={optimizeBundle,runtime,literalAt};
