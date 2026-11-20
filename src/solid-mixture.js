/* Independent populations are combined in spectral transport, before rendering.
   The output uses a reference concentration of 1 ppm. Host absorption therefore
   persists when the coloured-particle fraction is zero. */
(function(root){
 'use strict';
 function mix(primary,phi,loading=0){
  const id=primary.solidMatrix.id,secondary=primary.secondary;
  if(!root.MieSolidMatrix.metadata(id).hasAbsorption&&!loading)return primary;
  if(loading&&!secondary)throw Error('The transparent-scatterer spectrum is not ready.');
  const width=Math.max(primary.densityWidth,secondary?.densityWidth||0),K=4*(width-1)+1;
  const coefficients=new Float32Array(164),density=new Float32Array(41*width),phase=new Float32Array(41*512),pPpm=phi*1e6,sPpm=loading*1e6;
  const pdf=(data,band,index)=>{if(!data)return 0;const x=index/(K-1)*(data.densityWidth-1),i=Math.min(data.densityWidth-2,Math.floor(x)),f=x-i,o=band*data.densityWidth;return Math.exp(data.density[o+i]*(1-f)+data.density[o+i+1]*f);};
  for(let band=0;band<41;band++){
   const at=4*band,a=primary.coefficients,b=secondary?.coefficients,sp=a[at]*pPpm,ss=(b?.[at]||0)*sPpm,sc=sp+ss;
   const nm=380+10*band,k=root.MieSolidMatrix.nk(id,nm).k,hostAbsorption=4*Math.PI*k/nm*1e6;
   coefficients.set([sc,a[at+1]*pPpm+(b?.[at+1]||0)*sPpm+10*hostAbsorption,sc?(sp*a[at+2]+ss*(b?.[at+2]||0))/sc:0,a[at+3]],at);
   const raw=new Float64Array(K),cdf=new Float64Array(K);let prev=0;
   for(let i=0;i<K;i++){
    const theta=Math.PI*(i/(K-1))**2;
    raw[i]=sc?(sp*pdf(primary,band,i)+ss*pdf(secondary,band,i))/sc:1/(4*Math.PI);
    const v=raw[i]*Math.sin(theta);
    if(i){const dt=theta-Math.PI*((i-1)/(K-1))**2;cdf[i]=cdf[i-1]+.5*(prev+v)*dt;}
    prev=v;
   }
   const total=cdf[K-1],normal=2*Math.PI*total;
   for(let i=0;i<width;i++)density[band*width+i]=Math.log(Math.max(1e-30,raw[4*i]/normal));
   for(let i=0;i<K;i++)cdf[i]/=total;
   let cursor=1;for(let i=0;i<512;i++){const u=(i+.5)/512;while(cursor<K-1&&cdf[cursor]<u)cursor++;const f=(u-cdf[cursor-1])/Math.max(1e-30,cdf[cursor]-cdf[cursor-1]),theta=Math.PI*((cursor-1)/(K-1))**2+f*Math.PI*((cursor/(K-1))**2-((cursor-1)/(K-1))**2);phase[band*512+i]=Math.cos(theta);}
  }
  return {...primary,coefficients,density,phase,densityWidth:width,mixed:true,referencePpm:1,mixture:{primaryVolumeFraction:phi,silicaVolumeFraction:loading,silicaDiameterNm:primary.scatterer?.diameter||null,hostAbsorption:root.MieSolidMatrix.metadata(id).hasAbsorption,phase:'Scattering-coefficient-weighted full Mie phase functions',spatialModel:'Independent spherical populations uniformly dispersed through the solid'}};
 }
 root.MieSolidMixture={mix};
})(globalThis);
