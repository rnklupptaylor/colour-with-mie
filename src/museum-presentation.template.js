(function(root){
 'use strict';
 const copy=/*MUSEUM_COPY*/{},catalog=root.MuseumExplorer.catalog;
 const orders={1:['dipole','two'],2:['quadrupole','four'],3:['third-order multipole','six'],4:['fourth-order multipole','eight']};
 for(const e of catalog){
  if(e.kind==='field'){
   const electric=e.family==='N',name=orders[e.n][0];copy[e.id]={
    intro:`Mie's ${electric?'electric':'magnetic'} ${name} is one building block of the field scattered by a sphere. The arrows show the field at one moment in its oscillation. Regions pointing in different directions can reinforce or cancel when several building blocks are combined.`,
    details:[`This is an individual multipole of order ${e.n}, rather than the field of a particular gold or silver particle. The app overlays the corresponding spherical-wave mode. Rotating the view reveals its three-dimensional symmetry, while changing phase advances the oscillation.`,electric?'Electric and magnetic mode families provide the basis of the full Mie solution. Particle size and optical constants determine how strongly each mode is excited.':'Magnetic describes the symmetry of this mode. A magnetic multipole can contribute to light scattering by an ordinary nonmagnetic dielectric sphere.'],
    technical:[`The colour scale is proportional to |F|² using normalized angular vector harmonics. A common phase change advances the instantaneous arrows while leaving this intensity scale unchanged.`,e.id==='mie-3'?'Paper alignment places z into the screen, x upwards and y to the right. The reference arrow phase is 180°.':'Paper alignment places y normal to the screen and x upwards. Reset restores the reference arrow phase.'],
    try:[`Move the phase through 0°, 90° and 180°. Separate a change in arrow direction from a change in the mode's spatial shape.`,`Open this mode in lesson 00. Add another multipole and look for a direction in which their fields cancel.`]};
  }
  const c=copy[e.id];if(!c)throw Error('Missing Museum interpretation for '+e.id);e.method=[c.intro,...c.details].join('\n\n');
  if(e.id==='oldenburg-3b'&&!e.cases.includes(-1))e.cases.push(-1);
  if(e.id==='oldenburg-3a'||e.id==='oldenburg-3b')for(const [label,url] of [['Gold optical data · Olmon 2012','https://doi.org/10.1103/PhysRevB.86.235147'],['Gold optical data · McPeak 2015','https://doi.org/10.1021/ph5004237']])if(!e.sources.some(s=>s.url===url))e.sources.push({label,url});
 }
 function rich(text){const p=document.createElement('p');const parts=text.split(/`([^`]+)`/);for(let i=0;i<parts.length;i++){if(i%2){const label=document.createElement('span');label.className='ui-label';label.textContent=parts[i];p.append(label);}else p.append(document.createTextNode(parts[i]));}root.MieGuides?.decorate(p);return p;}
 function show(e){
  let method=document.getElementById('museumMethod');if(method.tagName==='P'){const div=document.createElement('div');div.id=method.id;method.replaceWith(div);method=div;}
  const c=copy[e.id];method.replaceChildren(...[c.intro,c.overview||c.details[0]].map(rich));method.firstElementChild.classList.add('museum-introduction');
  let technical=document.getElementById('museumTechnicalDetails');if(!technical){technical=[...document.querySelectorAll('#museumControls > details')].find(d=>/sources.*convention/i.test(d.querySelector('summary')?.textContent||''))||document.createElement('details');technical.id='museumTechnicalDetails';if(!technical.isConnected)document.getElementById('museumControls').append(technical);}
  const summary=document.createElement('summary');summary.textContent='Technical details';const paragraphs=c.technical?c.technical.slice():c.overview?[...c.details]:c.details.slice(1);
  if(!c.technical){
  if(e.kind==='field')paragraphs.push(`This is the ${e.family} mode of order ${e.n}. The calculation uses normalized angular vector harmonics on the unit sphere. Colour represents |F|², while arrows show the instantaneous field. The original drawing does not set an absolute time origin.`);
  if(e.kind==='polar')paragraphs.push(`The reference parameters are x = ${e.x} and relative refractive index m = ${e.m}. Paper scale uses i₁ = |S₁|² and i₂ = |S₂|² on an absolute linear radial scale. Blumer's γ = 180° corresponds to the app's forward direction θ = 0°.`+(e.id==='blumer-3'||e.id==='blumer-6'?' The strongest forward lobes extend beyond the printed frame and are clipped at its edge.':''));
  if(e.id==='mie-14')paragraphs.push('The nine diameters are 20–180 nm at a common volume fraction of 1 ppm. The reconstruction uses electric coefficient a₁ alone and historical gold and water optical inputs over 420–650 nm. The curves use the same ordinate convention when opened in lesson 05.');
  if(e.id==='oldenburg-3a'||e.id==='oldenburg-3b')paragraphs.push('The fits use n_core = 1.45 and n_water = 1.33. Absolute cross sections are averaged over particle numbers. One positive ordinate multiplier is fitted per experimental spectrum.'+(e.id==='oldenburg-3b'?' The rising trace also has a constant vertical plotting offset.':'')+' No wavelength shift or optical-constant adjustment is fitted.',e.id==='oldenburg-3a'?'The shared core-radius bounds are 45–85 nm, with core number CV between 0 and 25%. Shell-mean bounds are 6–65 nm, with shell CV between 0 and 50%. All four samples use the same core population.':'The shared core-radius bounds are 130–220 nm, with core number CV between 0 and 25%. Shell-mean bounds are 8–90 nm for the labelled samples, with shell CV between 0 and 50%. The rising-trace shell mean lies between 1 and 25 nm and uses the core population fixed by the other three samples.');
  }
  technical.replaceChildren(summary,...paragraphs.map(rich));technical.open=false;technical.hidden=!paragraphs.length;
  let box=document.getElementById('museumTryThis');if(!box){box=document.createElement('section');box.id='museumTryThis';box.className='museum-try';method.after(box);}const heading=document.createElement('h3');heading.textContent='Try this';const list=document.createElement('ol');for(const text of c.try){const li=document.createElement('li');li.append(rich(text));list.append(li);}box.replaceChildren(heading,list);
  let transfer=document.getElementById('museumToLightbox');if(!transfer){transfer=document.createElement('button');transfer.type='button';transfer.id='museumToLightbox';transfer.className='btn museum-lesson-link';transfer.textContent='Transfer best fits of Fig. 3a and 3b to the Lightbox';document.getElementById('museumLessonLink').after(transfer);transfer.onclick=()=>{root.MieLightbox.loadData(root.MieLightboxShowcases['oldenburg-best']);root.MieLightbox.open();};}transfer.hidden=!['oldenburg-3a','oldenburg-3b'].includes(e.id);
  const discrepancy=document.getElementById('museumDiscrepancy');if(discrepancy)discrepancy.hidden=true;
  root.MieNotation?.decorate(method);root.MieNotation?.decorate(box);root.MieNotation?.decorate(technical);
 }
 root.MuseumPresentation={copy,show};
})(globalThis);
