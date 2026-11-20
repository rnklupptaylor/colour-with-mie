/* Compact flat export names. Complete titles and numerical settings belong in metadata. */
(function(root){
 'use strict';
 const slug=(s,n=18)=>String(s||'').normalize('NFKD').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,n).replace(/-$/,'')||'sample';
 const num=x=>Number((+x||0).toPrecision(3)).toString().replace('+','');
 function material(id){const alloy=/^auag(\d+)$/.exec(id);if(alloy)return +alloy[1]===0?'Ag':+alloy[1]===100?'Au':'Au'+alloy[1]+'Ag'+(100-+alloy[1]);if(/^au/i.test(id))return 'Au';if(/^ag/i.test(id))return 'Ag';return ({sio2:'SiO2',fe3o4Fontijn:'Fe3O4',ps:'PS',pmma:'PMMA',tio2:'TiO2',custom:'custom',cu:'Cu',mg:'Mg',li:'Li',pt:'Pt',pd:'Pd',si:'Si'})[id]||slug(id,7);}
 function particle(sample){const p=sample?.particle;if(!p)return slug(sample?.name,18);return slug(p.struct==='cs'?material(p.matCore)+num(2*p.core)+'-'+material(p.mat)+'t'+num(p.shell):material(p.mat)+num(2*p.rad),22);}
 const form=s=>({vial:'vial',cuvette1:'cuv1',cuvette10:'cuv10',paint:'film',seidel:'mug',monolith:'slab'})[s?.container]||'vial';
 const stamp=(date=new Date())=>{const d=date instanceof Date?date:new Date(date);return d.toISOString().replace(/[-:]/g,'').slice(2,8)+'-'+d.toISOString().replace(/[-:]/g,'').slice(9,15)+'Z';};
 const make=(parts,ext,max=60)=>parts.filter(Boolean).map(x=>slug(x,36)).join('-').slice(0,max-ext.length-1).replace(/-$/,'')+'.'+ext;
 function image(scope,sample,index,settings,light){const view=settings.container==='paint'?'45-0':({back:'back',room:'front',side:'sideD','side-white':'sideL'})[light]||light,angle=light?.startsWith('side')?Math.round(settings.sideAzimuth||0):'',tag=scope==='sample'?[String(index+1).padStart(2,'0'),particle(sample)].join('-'):scope==='selection'?'selected':'set';return make(['cwm',tag,form(settings),view+(angle===''?'':angle),settings.illuminant&&settings.illuminant!=='D65'?(settings.illuminant==='bleyer'?'LED':settings.illuminant):''],'png');}
 function archive(kind,time){let d=new Date();if(typeof time==='string'){const m=/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(time);if(m)d=new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`);}return make(['cwm',kind,stamp(d)],'zip',42);}
 function family(labels,scheme,settings){return make(['cwm','family',form(settings),labels?({sample:'names',alpha:'abc',upper:'ABC',roman:'roman',numeric:'123'})[scheme]||'labels':'plain'],'png',44);}
 function spectra(sample,count,method,geometry,nir){return make(['cwm','R',count>1?'all'+count:particle(sample),method==='kubelka-munk'?'KM':'AD',({'45-0':'45-0','d8-sce':'d8SCE','d8-sci':'d8SCI',diffuse:'diff'})[geometry]||geometry,nir?'NIR':'vis'],'csv',60);}
 root.MieExportNames={slug,material,particle,form,stamp,make,image,archive,family,spectra,backup:kind=>make(['cwm',kind,new Date().toISOString().slice(2,10).replaceAll('-','')],'json',36)};
})(globalThis);
