
(function(root){
 'use strict';
 const $=id=>document.getElementById(id),panel=$('lightboxExportProgress'),cancel=$('lightboxCancelExport'),dismiss=$('lightboxExportDismiss'),bar=$('lightboxExportOverall'),message=$('lightboxExportMessage'),percent=$('lightboxExportPercent');
 let hideTimer=0,stack=[...document.querySelectorAll('dialog[open]')];
 function host(){const target=stack.filter(d=>d.open).at(-1)||document.body;if(panel.parentNode!==target)target.append(panel);}
 // Native modal dialogs live above the document. Keep this one task panel in
 // the top dialog, including the enlarged sample and family-photo windows.
 const observer=new MutationObserver(records=>{for(const r of records){if(r.target.tagName!=='DIALOG')continue;const d=r.target;stack=stack.filter(x=>x!==d);if(d.open)stack.push(d);}if(!panel.hidden)host();});
 observer.observe(document.body,{subtree:true,attributes:true,attributeFilter:['open']});
 root.addEventListener('mie-export-state',e=>{
  const d=e.detail,active=d.state==='running',wasActive=panel.dataset.state==='running';clearTimeout(hideTimer);panel.hidden=false;host();panel.dataset.state=d.state;bar.value=100*d.fraction;percent.textContent=Math.floor(100*d.fraction)+'%';message.textContent=d.message;$('lightboxExportProgressTitle').textContent=active?'Exporting images':d.state==='complete'?'Export complete':d.state==='cancelled'?'Export cancelled':'Export stopped';
  if(active!==wasActive&&root.MieLightbox?.renderer){MieLightbox.renderer.previewOnly=active;MieLightbox.renderer.resume();}
  cancel.hidden=!active;cancel.disabled=false;cancel.textContent='Cancel export';dismiss.hidden=active;
  if(d.state==='complete')hideTimer=setTimeout(()=>{panel.hidden=true;},5000);
 });
 cancel.onclick=()=>{cancel.disabled=true;cancel.textContent='Cancelling…';message.textContent='Stopping export…';MieLightboxExport.cancel();};
 dismiss.onclick=()=>{panel.hidden=true;clearTimeout(hideTimer);};
 root.MieExportProgress={get visible(){return !panel.hidden;},get fraction(){return bar.value/100;}};
})(globalThis);

