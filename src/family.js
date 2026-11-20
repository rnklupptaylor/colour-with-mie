(function(root){
 'use strict';
 const $=id=>document.getElementById(id),dialog=$('lightboxFamilyDialog'),canvas=$('lightboxFamilyCanvas'),box=MieLightbox;let controller=null,snapshot=null,frames=[],generation=0,painting=false,paintAgain=false;
 function edge(){return Math.min(1800,Math.max(800,Math.round(dialog.clientWidth*(devicePixelRatio||1))));}
 function prefs(){return {gap:+$('familyGap').value/100,rowGap:+$('familyRowGap').value/100,scheme:$('familyScheme').value,labels:$('familyLabels').checked};}
 function sync(){const p=MieFamily.options(box.settings);$('familyGap').value=Math.round(p.gap*100);$('familyRowGap').value=Math.round(p.rowGap*100);$('familyLabels').checked=p.labels;$('familyScheme').value=p.scheme;outputs();}
 function outputs(){$('familyGapValue').textContent=$('familyGap').value+'%';$('familyRowGapValue').textContent=$('familyRowGap').value+'%';$('familyScheme').disabled=!$('familyLabels').checked;}
 async function paint(){if(!dialog.open||!snapshot)return;if(painting){paintAgain=true;return;}painting=true;try{do{paintAgain=false;const off=document.createElement('canvas');await MieFamily.paint(off,snapshot.samples,snapshot.settings,frames,prefs(),edge());if(!dialog.open)break;canvas.width=off.width;canvas.height=off.height;canvas.getContext('2d').drawImage(off,0,0);off.width=off.height=1;}while(paintAgain);}finally{painting=false;}}
 function stop(){controller?.abort();controller=null;generation++;}
 async function prepare(){stop();if(!box.samples.length)return;const token=generation;controller=new AbortController();snapshot=structuredClone({samples:box.samples,settings:box.settings});frames=box.samples.map(()=>({}));paint();
  try{const result=await MieLightboxExport.prepareFamily({samples:snapshot.samples,settings:snapshot.settings,jobs:box.jobs,edge:edge(),grid:72,quality:({low:'fast',medium:'balanced',high:'maximum'})[snapshot.settings.renderQuality||'medium'],familyOptions:prefs()},{signal:controller.signal,onProgress:message=>{if(token===generation)$('lightboxFamilyStatus').textContent=message;},onImage:(i,light,entry)=>{if(token===generation){frames[i][light]=entry;paint();}}});if(token===generation){frames=result.frames;$('lightboxFamilyStatus').textContent='Ready · adjust spacing or labels without rendering again';paint();}}
  catch(e){if(e.name!=='AbortError'&&token===generation)$('lightboxFamilyStatus').textContent=e.message;}
 }
 function open(){if(!box.samples.length)return;if(box.renderer){box.renderer.adaptive=false;box.renderer.pause();}sync();if(!dialog.open)dialog.showModal();prepare();}
 function close(){dialog.close();}
 for(const id of ['familyGap','familyRowGap','familyScheme','familyLabels'])$(id).addEventListener('input',()=>{outputs();const p=prefs();box.setFamilyPreferences({familyGap:p.gap,familyRowGap:p.rowGap,familyScheme:p.scheme,familyLabels:p.labels});paint();});
 $('lightboxFamilyBack').onclick=close;$('lightboxFamilyExport').onclick=()=>box.openExport(null,'family');
 dialog.addEventListener('close',()=>{stop();if($('lightboxDialog').open)box.resume();});
 root.MieLightboxFamily={open,close,paint,stop,onExportStart(){if(dialog.open){stop();$('lightboxFamilyStatus').textContent='Rendering publication export…';}},onExportProgress(message){if(dialog.open)$('lightboxFamilyStatus').textContent=message;},onExportEnd(){if(dialog.open)prepare();},get isOpen(){return dialog.open;},get frames(){return frames;}};
})(globalThis);