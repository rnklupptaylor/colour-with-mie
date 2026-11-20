/* Two compact, reproducible bulk-colour previews, without container geometry or surface glare. */
(function(root){
 'use strict';
 function install(root){
  function normalRule(detail){const q=root.MiePaint.rule(detail),mu=new Float64Array(detail+1),w=new Float64Array(detail+1),epsilon=1e-10;mu.set(q.mu);w.set(q.w.map(x=>x*(1-epsilon)));mu[detail]=1;w[detail]=epsilon;return {mu,w};}
  function path(sample,s){return s.container==='paint'?s.paintThickness*1e-4:s.container==='cuvette1'?.1:['seidel','monolith'].includes(s.container)?1.47935/10:s.container==='vial'?(s.diameter||10)/10:1;}
  function components(data,sample,s){const paint=s.container==='paint',solid=['seidel','monolith'].includes(s.container);return [{data,phi:paint?sample.paint.loading:sample.phi},...(paint&&sample.paint.white>0?[{data:data.white,phi:sample.paint.white}]:[]),...(solid&&sample.solid.loading>0?[{data:data.secondary,phi:sample.solid.loading}]:[])];}
  async function spectrum(data,sample,s,{detail=16,onProgress=()=>{}}={}){
   const P=root.MiePaint,q=normalRule(detail),n=q.mu.length,beam=new Float64Array(n);beam[n-1]=1;const parts=components(data,sample,s),L=path(sample,s),T=new Float64Array(41),R=new Float64Array(41),backward=new Float64Array(41);
   for(let band=0;band<41;band++){
    const k=band*4,nm=380+10*band;let sca=0,abs=0;const down=new Float64Array(n*n),up=new Float64Array(n*n);
    for(const a of parts){if(!a.phi)continue;if(!a.data)throw Error('The secondary particle optics are not ready.');const c=a.data.coefficients,sp=c[k]*a.phi*1e6;sca+=sp;abs+=c[k+1]*a.phi*1e6;if(sp>0){const phase=P.phaseMatrix(a.data,band,q,detail*4);for(let i=0;i<n*n;i++){down[i]+=sp*phase.down[i];up[i]+=sp*phase.up[i];}}}
    if(['seidel','monolith'].includes(s.container))abs+=4*Math.PI*root.MieSolidMatrix.nk(s.seidelMatrix||'bk7',nm).k/nm*1e7;
    if(sca){for(let i=0;i<n*n;i++){down[i]/=sca;up[i]/=sca;}}else for(let j=0;j<n;j++)for(let i=0;i<n;i++){down[i*n+j]=up[i*n+j]=q.w[i]/2;}
    const layer=P.slab(sca,abs,L,down,up,q),out=P.mv(layer.T,beam,n),ret=P.mv(layer.R,beam,n),radiance=i=>ret[i]/(2*q.mu[i]*q.w[i]);T[band]=out.reduce((a,b)=>a+b,0);backward[band]=ret.reduce((a,b)=>a+b,0);R[band]=Math.max(0,radiance(n-1));onProgress((band+1)/41);await new Promise(r=>setTimeout(r,0));
   }return {transmission:Array.from(T),reflection:Array.from(R),backward:Array.from(backward),pathCm:L,detail};
  }
  function colour(values,s){const p=root.MieIlluminants.profile(s.illuminant||'D65',s.whiteBalance||'source'),XYZ=p.W.map(w=>w.reduce((sum,v,i)=>sum+v*values[i],0)),f=t=>t>216/24389?Math.cbrt(t):t*24389/3132+4/29,v=XYZ.map((x,i)=>f(x/p.white[i])),Lab=[116*v[1]-16,500*(v[0]-v[1]),200*(v[1]-v[2])],chroma=Math.hypot(Lab[1],Lab[2]);let rgb=p.linear(XYZ).map(x=>Math.max(0,x)),m=Math.max(...rgb);if(m>1&&(s.whiteBalance||'source')==='source')rgb=rgb.map(x=>x/m);rgb=rgb.map(x=>Math.min(1,Math.max(0,x))).map(x=>Math.round(255*(x<=.0031308?12.92*x:1.055*x**(1/2.4)-.055)));const hi=Math.max(...rgb),lo=Math.min(...rgb),delta=hi-lo,hue=delta<6||hi<6?null:((hi===rgb[0]?(rgb[1]-rgb[2])/delta:hi===rgb[1]?2+(rgb[2]-rgb[0])/delta:4+(rgb[0]-rgb[1])/delta)*60+360)%360;return {css:'#'+rgb.map(x=>x.toString(16).padStart(2,'0')).join(''),Lab,hue,chroma};}
  function key(entry){const s=entry.lightbox.settings,a=entry.lightbox.samples[0];return JSON.stringify(['29.0.0','normal-bulk-v1',a.particle,a.phi,a.paint,a.solid,s.container,s.diameter,s.paintThickness,s.paintBinderIndex,s.seidelMatrix,s.illuminant,s.whiteBalance]);}
  const diameter=entry=>{const p=entry.lightbox.samples[0].particle;return 2*(p.struct==='cs'?p.core+p.shell:p.rad);};
  function material(entry){const p=entry.lightbox.samples[0].particle,db=root.Materials.DB,label=id=>{if(/^au(?:$|Oldenburg|Babar|McPeak|Olmon)/i.test(id))return 'Gold';if(/^ag(?:$|Muller|Rakic)/i.test(id))return 'Silver';if(id==='custom')return 'Custom material';const name=db[id]?.name||id;return name.split(' · ')[0].replace(/\s*\([^)]*$/,'').trim();};if(p.struct==='cs')return {rank:2,key:p.matCore+'-'+p.mat,label:'Core–shell particles',detail:label(p.matCore)+' / '+label(p.mat)};if(['auag0','auag100'].includes(p.mat)){const name=p.mat==='auag0'?'Silver':'Gold';return {rank:0,key:name,label:name,detail:name};}if(/alloy/i.test(db[p.mat]?.group||''))return {rank:1,key:p.mat,label:'Alloys',detail:db[p.mat].name};return {rank:0,key:label(p.mat),label:label(p.mat),detail:label(p.mat)};}
  function sort(entries,by='date',descending=true){const cmp=(a,b)=>{
   if(by==='material'){const x=material(a),y=material(b);return x.rank-y.rank||x.key.localeCompare(y.key,undefined,{numeric:true})||diameter(a)-diameter(b);}
   if(by==='size')return diameter(a)-diameter(b);
   if(by.startsWith('hue')){const type=by==='hue-reflection'?'reflection':'transmission',x=a.swatches?.[type]?.hue,y=b.swatches?.[type]?.hue;if(x==null||y==null)return x==null&&y==null?0:x==null?1:-1;return x-y;}
   return (Date.parse(a.savedAt)||0)-(Date.parse(b.savedAt)||0);
  };return [...entries].sort((a,b)=>{const c=cmp(a,b);if(by.startsWith('hue')){const t=by==='hue-reflection'?'reflection':'transmission';if(a.swatches?.[t]?.hue==null||b.swatches?.[t]?.hue==null)return c||a.id.localeCompare(b.id);}return (descending?-c:c)||a.id.localeCompare(b.id);});}
  root.MiePaletteScience={normalRule,path,spectrum,colour,key,diameter,material,sort};
 }
 install(root);root.MiePaletteScience.source='('+install.toString()+')(globalThis);';
})(globalThis);
