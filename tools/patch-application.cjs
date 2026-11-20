const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'..');
function edit(name,fn){let s=fs.readFileSync(path.join(dir,'base',name),'utf8');const once=(a,b)=>{if(s.split(a).length!==2)throw Error(name+' marker '+a.slice(0,85));s=s.replace(a,()=>b);};const all=(a,b)=>{if(!s.includes(a))throw Error(name+' missing '+a);s=s.replaceAll(a,b);};fn(once,all,()=>s,v=>s=v);fs.writeFileSync(path.join(dir,'src',name),s);}
edit('population.js',(once)=>{
 once("n={quick:9,standard:17,fine:25}[quality]","n={quick:9,standard:17,fine:cv>.25||tv>.25?41:25}[quality]");
 once("return normalRule(n).map(o=>({v:mean*Math.exp(-s2/2+Math.sqrt(s2)*o.z),w:o.w}));","const rows=normalRule(n).filter(o=>o.w>1e-16).map(o=>({v:mean*Math.exp(-s2/2+Math.sqrt(s2)*o.z),w:o.w})),total=rows.reduce((s,o)=>s+o.w,0);return rows.map(o=>({...o,w:o.w/total}));");
 once("const p=material(s.mat,wl,s.cn,s.ck,s.struct==='cs'?b.t:b.r);let c;","const sameMetal=s.struct==='cs'&&s.mat===s.matCore&&root.MieSurface.supported(s.mat),p=s.surfaceOn&&root.MieSurface.supported(s.mat)?root.MieSurface.nk(s.mat,wl,b.r,s.struct==='cs'&&!sameMetal?b.core:0,s):material(s.mat,wl,s.cn,s.ck,s.struct==='cs'?b.t:b.r);let c;");
 once('const q=material(s.matCore,wl,s.ccn,s.cck,b.core);','const q=s.surfaceOn&&root.MieSurface.supported(s.matCore)?root.MieSurface.nk(s.matCore,wl,sameMetal?b.r:b.core,0,s):material(s.matCore,wl,s.ccn,s.cck,b.core);');
});
edit('design.js',(once,all)=>{
 once('  const nk=(id,l)=>{const r=Mat.nk(id,l);return [r.n,r.k];};','  let surface={surfaceOn:false,surfaceA:1};\n  const setSurface=options=>{surface={surfaceOn:!!options.surfaceOn,surfaceA:options.surfaceA??1};};\n  const nk=(id,l,r,core=0)=>{const g=root.MieSurface.nk(id,l,r,core,surface);return [g.n,g.k];};');
 all('nk(f.mat,l)','nk(f.mat,l,aNm)');all('nk(f.core,l),ms=nk(f.shell,l)','nk(f.core,l,f.core===f.shell?aNm:p[0]/2),ms=nk(f.shell,l,aNm,f.core===f.shell?0:p[0]/2)');
 once('get progress(){return this.pos/this.total;}','get progress(){return this.total?this.pos/this.total:1;}');
 once('root.MieDesign={FAMILIES,','root.MieDesign={setSurface,FAMILIES,');
});
edit('model.js',(once)=>{
 once("au:'Au',ag:'Ag'","au:'Au',auBabar2015:'Au',auOlmon2012:'Au',auMcPeak2015:'Au',fe3o4Fontijn:'Fe₃O₄',ag:'Ag'");
 once("const fields=['struct'","const fields=['surfaceOn','surfaceA','struct'");
 once('  const phi=+snapshot.phi;',"  p.surfaceOn=!!v.surfaceOn;p.surfaceA=num(v.surfaceA,0,3,1);\n  const phi=+snapshot.phi;");
 once("  const given=data.settings||{}","  const given=data.settings||{}");
 once('samples:structuredClone(collection.samples),settings:', 'samples:structuredClone(collection.samples),electronScattering:collection.samples.map(s=>({sampleId:s.id,...root.MieSurface.metadata(s.particle)})),settings:');
 once("The lightbox holds 10 samples. Remove one to add another.","The lightbox is full (10 samples). Remove a sample before adding another.");
 once("   if(p.popOn){if(!['lognormal'", "   if(p.surfaceOn!==undefined&&typeof p.surfaceOn!=='boolean')throw Error('Invalid electron-scattering flag.');if(p.surfaceA!==undefined)number('surfaceA',0,3);\n   if(p.popOn){if(!['lognormal'");
});
edit('museum-spectra.js',(once)=>{once('const key=[s.mat,s.med,','const key=[s.surfaceOn,s.surfaceA,s.mat,s.med,');once('root.Materials.nk(s.mat,wl);','root.MieSurface.nk(s.mat,wl,radius,0,s);');});
edit('concentrations.js',(once)=>{
 once('Object.hasOwn(densities,id)?densities[id]:null;', 'Object.hasOwn(densities,id)?densities[id]:root.Materials.DB[id]?.densityGcm3??null;');
});
edit('renderer.js',(once)=>{
 once("v.cameraScale=v.sample.testCard?(v.projectionScale||base):base;","v.cameraScale=v.projectionScale||base;");
 once("    if(s.testCard&&v?.film&&v.viewportKey===viewportKey){if(cardChanged)projectionScale=(v.cameraScale||projectionScale)*height/(v.displayH||v.h);else projectionScale=v.projectionScale||projectionScale;}\r\n",'');
 once("const fit=s.testCard?height/v.h:Math.min((right-left)/v.w,height/v.h);","const fit=height/v.h*(v.projectionScale||projectionScale)/projectionScale;");
 once('const allocate=!v.film||v.viewportKey!==viewportKey||','const allocate=!v.film||v.containerType!==this.settings.container||v.viewportKey!==viewportKey||');
 once('v.cardGeometry=cardGeometry;v.viewportKey=viewportKey;','v.containerType=this.settings.container;v.cardGeometry=cardGeometry;v.viewportKey=viewportKey;');
});
edit('app.js',(once,all)=>{
 once('Tables and formulas as distributed by the refractiveindex.info database (CC0); tables are original data rows, thinned where a source lists hundreds of points, interpolated linearly in n and logarithmically in k.','Each material identifies its source and wavelength limits. Most numerical tables are CC0 snapshots from refractiveindex.info. Default gold is the equal-weight Olmon/McPeak complex-permittivity mean, with each endpoint interpolated in wavelength before averaging. The separate endpoints and Babar–Weaver gold remain selectable. Fontijn magnetite is figure-digitized diagonal permittivity, interpolated in photon energy. Other n,k tables retain their stated interpolation.');
 once("popOn:false,popShape:'lognormal'","museumAgMaterial:'agRakicLD',surfaceOn:false,surfaceA:1,popOn:false,popShape:'lognormal'");
 once("populationFields=['lesson'","populationFields=['surfaceOn','surfaceA','lesson'");
 once("const HASH=['museumBookX'","const HASH=['museumAgMaterial','surfaceOn','surfaceA','museumBookX'");
 once("const matNK=(id,wl,cn,ck)=>id==='custom'?{n:cn,k:ck,inRange:true}:Materials.nk(id,wl);","const matNK=(id,wl,cn,ck,radius=S.rad,core=0)=>id==='custom'?{n:cn,k:ck,inRange:true}:MieSurface.nk(id,wl,radius,core,S);");
 once('const rad=cs()?core+shell:S.rad,nm=', 'const rad=cs()?core+shell:S.rad,sameMetal=cs()&&S.mat===S.matCore&&MieSurface.supported(S.mat),nm=');
 once('matNK(S.mat,wl,S.cn,S.ck),out=','matNK(S.mat,wl,S.cn,S.ck,rad,cs()&&!sameMetal?core:0),out=');
 once('matNK(S.matCore,wl,S.ccn,S.cck);','matNK(S.matCore,wl,S.ccn,S.cck,sameMetal?rad:core);');
 once('    return [lo,hi];',"    if(Materials.MEDIA[S.med]?.strictRange){const r=Materials.range(S.med,true);lo=Math.max(lo,Math.ceil(r[0]));hi=Math.min(hi,Math.floor(r[1]));}\n    return [lo,hi];");
 once("const key=famSel().join(',')+'|'+S.dMed;","const key=famSel().join(',')+'|'+S.dMed+'|'+S.surfaceOn+'|'+S.surfaceA;");
 once('dKey=key;\r\n    dSearch=', 'dKey=key;DCACHE.clear();MDes.setSurface(S);\r\n    dSearch=');
 once("if(!on.length){toast('Keep at least one family.');refresh();return;}",'');
 once("  function setTarget(L,a,b)","  function setTarget(L,a,b)");
 once("    $('dFamBox').onchange=", "    const familyButtons=document.createElement('div');familyButtons.className='candidate-actions';familyButtons.innerHTML='<button type=\"button\" class=\"btn-quiet small\" id=\"dSelectAll\">Select all</button><button type=\"button\" class=\"btn-quiet small\" id=\"dDeselectAll\">Deselect all</button>'; $('dFamBox').before(familyButtons);$('dSelectAll').onclick=()=>{S.dFam=FAM_IDS.join(',');refresh();};$('dDeselectAll').onclick=()=>{S.dFam='';refresh();};\n    $('dFamBox').onchange=");
 once("const statusTxt=()=>!dSearch?'':", "const statusTxt=()=>!famSel().length?'Select a candidate family to start the search.':!dSearch?'':");
 once("const lightboxFields=[", "const lightboxFields=['surfaceOn','surfaceA',");
 once("p={...fresh('real'),med:S.dMed,popOn:false};", "p={...fresh('real'),med:S.dMed,popOn:false,surfaceOn:S.surfaceOn,surfaceA:S.surfaceA};");
 once('  /* ---------- derived quantities ---------- */',`  const surfaceControls=document.createElement('section');surfaceControls.id='surfaceControls';surfaceControls.className='surface-controls';surfaceControls.innerHTML='<label class="check"><input id="surfaceOn" type="checkbox"> Size-dependent electron scattering</label><div id="surfaceOptions" hidden><label>Boundary factor A <output id="surfaceAValue"></output><input id="surfaceA" type="range" min="0" max="3" step="0.05" value="1"></label><p id="surfaceExplanation"></p><details><summary>Model and limits</summary><div id="surfaceParameters"></div><p>The measured dielectric function is retained, except for its free-electron Drude damping. The extra width is AℏvF/L, with L = 4V/S. A spherical core uses L = 4r/3; a shell includes its inner and outer surfaces. A = 1 is a diffuse-boundary model, not a measured value for every interface. Distributions use each member’s dimensions. Radiative damping is already present in Mie theory.</p><p>For Pt and Pd the velocity is an effective single-band estimate. For Mg and Li the Drude decomposition is fitted in the near infrared. Treat these as sensitivity calculations. This local model does not describe atomic structure, tunnelling, or quantum confinement.</p><a href="https://doi.org/10.1186/s11671-018-2670-7" target="_blank" rel="noopener">Shell model and experiment</a></details></div>';$('sources').after(surfaceControls);
  $('surfaceOn').onchange=e=>{S.surfaceOn=e.target.checked;refresh(true);};$('surfaceA').oninput=e=>{S.surfaceA=+e.target.value;refresh(true);};
  function syncSurface(){const parent=designOn()?$('dFamBox').parentElement:$('sources').parentElement;if(surfaceControls.parentElement!==parent)parent.append(surfaceControls);const ids=designOn()?famSel().flatMap(id=>{const f=MDes.fam(id);return f.kind==='sphere'?[f.mat]:[f.core,f.shell];}):[S.mat,...(cs()?[S.matCore]:[])];surfaceControls.hidden=!(designOn()||phys())||!ids.some(id=>MieSurface.supported(id));$('surfaceOn').checked=!!S.surfaceOn;$('surfaceOptions').hidden=!S.surfaceOn;$('surfaceA').value=S.surfaceA;$('surfaceAValue').textContent=Fmt.num(S.surfaceA,3);$('surfaceParameters').replaceChildren(...[...new Set(ids)].filter(id=>MieSurface.supported(id)).map(id=>{const d=MieSurface.parameters(id),p=document.createElement('p');p.textContent=Materials.DB[id].name+': Eₚ = '+Fmt.num(d.plasma,4)+' eV; Γ₀ = '+Fmt.num(d.gamma,4)+' eV; vF = '+Fmt.num(d.vf/1e6,4)+' × 10⁶ m/s'+(d.estimatedVelocity?' (effective single-band estimate)':'')+(d.effectiveFit?'; NIR decomposition relative RMS '+Fmt.num(100*d.relativeRms,3)+'%; treat as a sensitivity model.':'.');return p;}));$('surfaceExplanation').textContent=designOn()?'Applied consistently to the candidate spectra, search and Lightbox samples.':'Applied to each supported metallic layer. The tabulated optical constants remain the default.';}

  /* ---------- derived quantities ---------- */`);
 once('syncControls();populationSync();','syncControls();syncSurface();populationSync();');
 all('[S.struct,S.mat,','[S.surfaceOn,S.surfaceA,S.struct,S.mat,');
 once("['gaps',S.struct,S.mat,","['gaps',S.surfaceOn,S.surfaceA,S.struct,S.mat,");
});
console.log('Prepared electron-scattering plumbing, candidate controls and consistent cached render sizing.');
