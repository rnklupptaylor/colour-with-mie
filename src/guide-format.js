  const labels=['Size-dependent electron scattering','On the unit sphere','Along the beam axis','Error vs distance','Focus detector direction','Update sample in lightbox','Add sample to lightbox','Radiation pattern','Angular intensity','Paper settings','Colour space','Colour map','Size spread','Far field','Near field','Build up','Enough for view','Concentration','Families','Display','Select all','Deselect all','Set up','Reset camera','Reset'];
  const labelPattern=new RegExp('\\b('+labels.join('|')+')\\b','g');
  function ui(text){return String(text||'').split(/(<[^>]+>)/g).map(part=>part.startsWith('<')?part:part.replace(labelPattern,label=>'<span class="ui-label">'+label+'</span>')).join('');}
  const para=s=>'<p>'+ui(s)+'</p>';
  function decorate(element){
    if(!element)return;const walker=document.createTreeWalker(element,NodeFilter.SHOW_TEXT),nodes=[];let node;
    while(node=walker.nextNode()){const p=node.parentElement;if(!p||p.closest('.ui-label,a,svg,code,pre,h1,h2,h3,h4,h5'))continue;if(!p.closest('p,li,td,th,summary,figcaption'))continue;labelPattern.lastIndex=0;if(labelPattern.test(node.nodeValue))nodes.push(node);}
    for(const node of nodes){const fragment=document.createDocumentFragment(),parts=node.nodeValue.split(labelPattern);parts.forEach((text,i)=>{if(i%2){const span=document.createElement('span');span.className='ui-label';span.textContent=text;fragment.append(span);}else fragment.append(document.createTextNode(text));});node.replaceWith(fragment);}
  }
