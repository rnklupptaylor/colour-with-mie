(function(root){
  'use strict';
  const M=root.Mie,H=root.MuseumMath,cache=new Map(),palette=['#2979d8','#068e86','#628a20','#a78300','#df8b16','#e06031','#c63756','#a14087','#6749bd'];
  const source='G. Mie, Annalen der Physik 25, 377–445 (1908), pp. 417–418; tabulated historical gold permittivity and wavelength in water, with monotone interpolation';
  root.Materials.DB.au1908={name:'Gold (Mie 1908)',group:'Historical data',src:source,doi:'10.1002/andp.19083300302',range:[.420,.650],fn:um=>{const o=H.goldOptics(Math.max(420,Math.min(650,um*1000)));return o.m.map(v=>v*o.nmed);}};
  root.Materials.MEDIA.water1908={name:'Water (Mie 1908)',src:source,doi:'10.1002/andp.19083300302',range:[.420,.650],fn:um=>[H.goldOptics(Math.max(420,Math.min(650,um*1000))).nmed,0]};
  function samples(s){
    const key=[s.surfaceOn,s.surfaceA,s.mat,s.med,s.struct,s.rad,s.core,s.shell,s.cn,s.ck,s.cmed,s.wlMin,s.wlMax,s.auto,s.N,s.sE,s.sM,s.solo,s.swPhi].join('|');
    if(cache.has(key))return cache.get(key);
    const rows=[],step=Math.max(.5,(s.wlMax-s.wlMin)/460),radius=s.rad,phi=s.swPhi;
    for(let i=0;;i++){
      const wl=Math.min(s.wlMax,s.wlMin+i*step),medium=s.med==='custom'?{n:s.cmed,inRange:true}:root.Materials.medium(s.med,wl),p=s.mat==='custom'?{n:s.cn,k:s.ck,inRange:true}:s.mat==='auOldenburg'?root.MuseumStudies.oldenburgGold(wl,radius):root.MieSurface.nk(s.mat,wl,radius,0,s);
      const x=2*Math.PI*medium.n*radius/wl,m=[p.n/medium.n,p.k/medium.n],c=M.coefficients(x,m),options={N:s.auto?c.N:Math.min(s.N,c.N),electric:s.sE,magnetic:s.sM,solo:s.solo||0},q=M.efficiency(c,options);
      rows.push({wl,x,m,nmed:medium.n,q,scattering:750e6*phi*q/radius,ok:p.inRange&&medium.inRange});
      if(wl>=s.wlMax)break;
    }
    if(cache.size>30)cache.clear();cache.set(key,rows);return rows;
  }
  const stateFor=(diameter,wl=550)=>({lesson:'real',units:'spec',struct:'homog',mat:'au1908',med:'water1908',rad:diameter/2,wl,wlMin:420,wlMax:650,auto:false,N:1,sE:true,sM:false,solo:0,mpoles:false,view:'far',graph:'spectrum',pol:'x',radial:'lin',report:'historical',swPhi:1e-6,swatch:false});
  let curves=null;
  function gallery(){return curves??=Array.from({length:9},(_,i)=>{const diameter=20*(i+1);return {diameter,color:palette[i],points:samples(stateFor(diameter)).map(r=>[r.wl,r.scattering])};});}
  function graph(s){
    if(s.lesson!=='real'||s.units!=='spec'||s.report!=='historical'||s.struct!=='homog')return null;
    const rows=samples(s),valid=rows.filter(r=>r.ok&&r.scattering>0),max=Math.max(1e-10,...valid.map(r=>r.scattering)),log=s.scale.spectrum;
    return {spec:{type:'xy',x:{min:s.wlMin,max:s.wlMax,name:'λ₀',label:'vacuum wavelength λ₀ (nm)',fmt:v=>`${Math.round(v)} nm`},y:log?{min:Math.max(max*1e-6,Math.min(...valid.map(r=>r.scattering))),max:max*1.15,log:true,label:'scattering (‰ per mm)'}:{min:0,max:max*1.08,label:'scattering (‰ per mm)'},
      series:[{name:`Scattering · d = ${2*s.rad} nm`,color:'#2979d8',points:rows.map(r=>[r.wl,r.ok?r.scattering:NaN])}],legend:[{name:`Scattering · d = ${2*s.rad} nm`,color:'#2979d8'}],vlines:[{x:s.wl,color:'#777',label:`λ₀ = ${s.wl} nm`}]},
      caption:`Scattering per millimetre at volume fraction ${(s.swPhi*1e6).toPrecision(4)} ppm, diameter ${2*s.rad} nm. ${s.mat==='au1908'&&s.med==='water1908'?'Mie’s historical gold and water optical data vary with wavelength. ':''}${s.auto?'All orders':`Orders 1–${s.N}`}; electric terms ${s.sE?'on':'off'}, magnetic terms ${s.sM?'on':'off'}. The Museum curves use a₁ alone. Click to set λ₀.`,
      table:{title:'Scattering spectrum (historical ordinate)',cols:['λ0 (nm)','x','m real','m imag','n medium','Qsca selected terms','scattering (per mille per mm)','volume fraction','data in range'],rows:rows.map(r=>[r.wl,r.x,...r.m,r.nmed,r.q,r.scattering,s.swPhi,r.ok?'yes':'no'])}};
  }
  let reportButton=null;
  if(typeof document!=='undefined'){
    reportButton=document.createElement('button');reportButton.type='button';reportButton.dataset.v='historical';reportButton.textContent='Scattering / mm';reportButton.title='Scattering in per mille per millimetre, using the volume fraction in the colour controls';reportButton.hidden=true;document.getElementById('report').append(reportButton);
  }
  function sync(s){if(reportButton)reportButton.hidden=!(s.lesson==='real'&&s.units==='spec'&&s.struct==='homog'&&(s.mat==='au1908'||s.report==='historical'));}
  root.MuseumSpectra={samples,stateFor,gallery,graph,sync,palette};
  if(typeof module!=='undefined')module.exports=root.MuseumSpectra;
})(typeof globalThis!=='undefined'?globalThis:this);