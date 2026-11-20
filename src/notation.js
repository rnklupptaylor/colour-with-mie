/* Presentation only. Raw physical state and numerical export fields stay plain. */
(function(root){
 'use strict';
 const token=/(?<![\p{L}\p{N}_])(?:[CQ]_?(?:ext|sca|abs|pr|back)|n_?(?:core|shell|water|medium|med|particle|host)|[A-Za-zεωγσλκμρΓ]_[\p{L}\p{N}]+|[εωγσλκμρΓ]_?(?:core|shell|med|bulk|surf|m|p|F|0)|σ_?[rt]|x_?Au|m_?rel|I_?max|L_?eff|v_?F|V_?particle|10\^[−-]?\d+|(?:nm|µm|mm|cm|m|s)\^[−-]?\d+|(?:nm|µm|mm|cm|m)[23]|SiO2|TiO2|H2O|Fe3O4)(?![\p{L}\p{N}_])/gu;
 const valuePattern=/(?<![\p{L}\p{N}_])([CQ]_?(?:ext|sca|abs|pr|back)|n_?(?:core|shell|water|medium|med|particle|host)|[A-Za-zεωγσλκμρΓ]_[\p{L}\p{N}]+|[εωγσλκμρΓ]_?(?:core|shell|med|bulk|surf|m|p|F|0)|σ_?[rt]|x_?Au|m_?rel|I_?max|I[₀0]|λ[₀0]|L_?eff|v_?F|V_?particle|SD|CV|OD|[nmkxrRdDLCQNPTφθσκτλωγ])\s+(?=[−-]?(?:\d|\.\d))/gu;
 function assignments(text){return String(text).replace(valuePattern,(all,symbol,offset,source)=>symbol==='x'&&/\d\s*$/.test(source.slice(Math.max(0,offset-6),offset))?all:symbol+' = ');}
 const prose=text=>assignments(text).replace(/;\s*(\S+)?/g,(_,word)=>'. '+(!word?'':/[=<>_]/.test(word)||/^[\u0370-\u03ff]/.test(word)||/^(?:[CQ]_?(?:ext|sca|abs)|n_?(?:core|water|medium|shell)|[A-Za-z](?:[₀-₉]|$))/.test(word)?word:word[0].toLocaleUpperCase('en')+word.slice(1)));
 const names={Cext:'extinction cross section',Csca:'scattering cross section',Cabs:'absorption cross section',Qext:'extinction efficiency',Qsca:'scattering efficiency',Qabs:'absorption efficiency',ncore:'core refractive index',nshell:'shell refractive index',nwater:'water refractive index',nmedium:'medium refractive index'};
 const plain=text=>prose(text).replace(/\b(?:[CQ]_?(?:ext|sca|abs)|n_?(?:core|shell|water|medium))\b/g,s=>names[s.replace('_','')]||s);
 function formula(t){
  if(t==='μm'||t==='µm')return [{text:'μm'}];
  let m=/^([CQ])_?(ext|sca|abs|pr|back)$/.exec(t);if(m)return [{text:m[1]},{text:m[2],script:'sub'}];
  m=/^(n|m|I|L|v|V)_?(core|shell|water|medium|med|particle|host|rel|max|eff|F)$/.exec(t);if(m)return [{text:m[1]},{text:m[2],script:'sub'}];
  m=/^([A-Za-zεωγσλκμρΓ])_([\p{L}\p{N}]+)$/u.exec(t)||/^([εωγσλκμρΓ])(core|shell|med|bulk|surf|m|p|F|0)$/.exec(t);if(m)return [{text:m[1]},{text:m[2],script:'sub'}];
  m=/^(x)(Au)$/.exec(t)||/^(σ)(r|t)$/.exec(t);if(m)return [{text:m[1]},{text:m[2],script:'sub'}];
  if(t.startsWith('10^'))return [{text:'10'},{text:t.slice(3),script:'sup'}];
  m=/^(.+)\^([−-]?\d+)$/.exec(t);if(m)return [{text:m[1]},{text:m[2],script:'sup'}];
  m=/^(nm|µm|mm|cm|m)([23])$/.exec(t);if(m)return [{text:m[1]},{text:m[2],script:'sup'}];
  return t.split(/(\d+)/).filter(Boolean).map(s=>({text:s,...(/^\d+$/.test(s)?{script:'sub'}:{})}));
 }
 function runs(text){const out=[];let at=0;token.lastIndex=0;for(const m of text.matchAll(token)){if(m.index>at)out.push({text:text.slice(at,m.index)});out.push(...formula(m[0]));at=m.index+m[0].length;}if(at<text.length)out.push({text:text.slice(at)});return out;}
 function decorate(container){
  if(!container)return;
  if(container.querySelectorAll)for(const e of [container,...container.querySelectorAll('option,[title],[aria-label]')]){
   if(e.tagName==='OPTION'){const text=plain(e.textContent);if(text!==e.textContent)e.textContent=text;}
   for(const attr of ['title','aria-label'])if(e.hasAttribute?.(attr)){const old=e.getAttribute(attr),text=plain(old);if(old!==text)e.setAttribute(attr,text);}
  }
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT),nodes=[];let n;
  while(n=walker.nextNode()){const p=n.parentElement;if(!p||p.closest('script,style,pre,code,textarea,input,select,option,[contenteditable],.mie-math'))continue;if(p.closest('svg')&&!p.closest('text'))continue;token.lastIndex=0;if(token.test(n.nodeValue)||prose(n.nodeValue)!==n.nodeValue)nodes.push(n);}
  for(const n of nodes){if(!n.isConnected)continue;const text=prose(n.nodeValue);token.lastIndex=0;if(!token.test(text)){n.nodeValue=text;continue;}
   const svg=!!n.parentElement.closest('svg'),span=svg?document.createElementNS('http://www.w3.org/2000/svg','tspan'):document.createElement('span');span.classList.add('mie-math');
   for(const r of runs(text)){if(!r.script){span.append(document.createTextNode(r.text));continue;}const s=svg?document.createElementNS('http://www.w3.org/2000/svg','tspan'):document.createElement(r.script);if(svg){s.setAttribute('baseline-shift',r.script);s.setAttribute('font-size','72%');}s.textContent=r.text;span.append(s);}
   n.replaceWith(span);
  }
 }
 // Canvas labels and exported images use the same typographic convention.
 for(const proto of [root.CanvasRenderingContext2D?.prototype,root.OffscreenCanvasRenderingContext2D?.prototype].filter(Boolean))for(const method of ['fillText','strokeText']){const original=proto[method];proto[method]=function(value,x,y,maxWidth){const text=prose(value);token.lastIndex=0;if(!token.test(text))return maxWidth===undefined?original.call(this,text,x,y):original.call(this,text,x,y,maxWidth);
   const pieces=runs(text),font=this.font,px=Number(/([\d.]+)px/.exec(font)?.[1]||12),small=font.replace(/([\d.]+)px/,(m,v)=>(Number(v)*.72)+'px');let width=0;
   this.save();for(const r of pieces){this.font=r.script?small:font;r.width=this.measureText(r.text).width;width+=r.width;}const align=this.textAlign;this.translate(x,y);if(maxWidth>0&&width>maxWidth)this.scale(maxWidth/width,1);this.textAlign='left';let cursor=align==='center'?-width/2:align==='right'||align==='end'?-width:0;
   for(const r of pieces){this.font=r.script?small:font;original.call(this,r.text,cursor,r.script==='sub'?px*.23:r.script==='sup'?-px*.38:0);cursor+=r.width;}this.restore();};}
 function start(){
  decorate(document.body);let queued=false;const pending=new Set();
  new MutationObserver(records=>{for(const r of records){if(r.type==='characterData')pending.add(r.target.parentElement);else for(const n of r.addedNodes){if(n.nodeType===1)pending.add(n);else if(n.nodeType===3)pending.add(n.parentElement);}}if(!queued&&pending.size){queued=true;requestAnimationFrame(()=>{queued=false;for(const node of pending)if(node?.isConnected&&!node.closest('script,style,.mie-math'))decorate(node);pending.clear();});}}).observe(document.body,{subtree:true,childList:true,characterData:true});
 }
 root.MieNotation={decorate,runs,prose,assignments};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})(globalThis);
