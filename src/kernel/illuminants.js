(function(root){
 'use strict';
 const data=root.MieIlluminantData,observer=root.CIE2006_10,byId=new Map(data.sources.map(s=>[s.id,s])),cache=new Map(),profiles=new Map(),displayWhite=[.95047,1,1.08883];
 const matrix=([x,y,z])=>[3.2406*x-1.5372*y-.4986*z,-.9689*x+1.8758*y+.0415*z,.0557*x-.204*y+1.057*z];
 function weights(id){
  if(cache.has(id))return cache.get(id);const source=byId.get(id);if(!source)throw Error('Unknown illuminant.');
  const W=Array.from({length:3},()=>new Float64Array(41));
  for(let l=380;l<=780;l++){const f=(l-380)/10,i=Math.min(39,Math.floor(f)),u=f-i,j=l-observer.start;if(j<0||j>=observer.x.length)continue;for(const [c,k] of ['x','y','z'].entries()){const v=observer[k][j]*source.spd[l-380];W[c][i]+=v*(1-u);if(u>0)W[c][i+1]+=v*u;}}
  const ny=W[1].reduce((a,b)=>a+b,0);W.forEach(w=>{for(let i=0;i<41;i++)w[i]/=ny;});const white=W.map(w=>w.reduce((a,b)=>a+b,0)),out={source,W,white};cache.set(id,out);return out;
 }
 function profile(id='D65',whiteBalance='source'){
  if(!['source','fixed'].includes(whiteBalance))throw Error('Unknown white-balance setting.');const key=id+'|'+whiteBalance;if(profiles.has(key))return profiles.get(key);
  const p=weights(id),reference=whiteBalance==='source'?p.white:weights('D65').white,linear=XYZ=>matrix(XYZ.map((v,i)=>v/reference[i]*displayWhite[i])),rgbWeights=new Float32Array(41*4);
  for(let j=0;j<41;j++)rgbWeights.set([...linear(p.W.map(w=>w[j])),1],j*4);
  const whiteRGB=linear(p.white),out={id,whiteBalance,...p,key,linear,rgbWeights,whiteRGB};profiles.set(key,out);return out;
 }
 function metadata(id='D65',whiteBalance='source'){
  const p=profile(id,whiteBalance),s=p.source;return {id,name:s.name,nominalCctK:s.nominalCctK,measuredCctK:s.measuredCctK??null,reference:s.reference,paper:s.paper??null,license:s.license||'Earlier app D65 tabulation; source CIE',note:s.note,spectrumSha256:s.spectrumSha256,wavelengthStartNm:380,wavelengthStepNm:1,relativeSpectralPower:Array.from(s.spd),observer:'CIE 2006 10 degree',sourceWhiteXYZ:Array.from(p.white),whiteBalance,displayMethod:whiteBalance==='source'?'Source-white XYZ scaling to the sRGB display white':'Fixed D65/10-degree XYZ scaling to the sRGB display white',normalization:'Equal incident photopic Y = 1; optical spectra linearly interpolated from the 10 nm grid'};
 }
 root.MieIlluminants={ids:[...byId.keys()],has:id=>byId.has(id),list:()=>[...byId.values()],profile,metadata};
})(globalThis);
