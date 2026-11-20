
(() => {
 'use strict';
 const app=window.MieExplorer,$=id=>document.getElementById(id),dialog=$('startMenu');
 const catalog=[{"id":"harmonics","number":"00","title":"Harmonics","slogan":"Build light from electric and magnetic modes.","accent":"#be568b","kind":"Lesson"},{"id":"plane","number":"01","title":"Plane waves","slogan":"Build a travelling wave, one multipole at a time.","accent":"#4884c4","kind":"Lesson"},{"id":"rayleigh","number":"02","title":"Rayleigh limit","slogan":"See why small particles scatter blue light.","accent":"#c17b32","kind":"Lesson"},{"id":"mie","number":"03","title":"Mie scattering","slogan":"Shape the lobes. Reveal the field around a sphere.","accent":"#bf628e","kind":"Lesson"},{"id":"large","number":"04","title":"Large spheres","slogan":"Find forward peaks, rainbows and sharp features.","accent":"#a066ae","kind":"Lesson"},{"id":"real","number":"05","title":"Real particles","slogan":"Tune materials, coatings and size distributions.","accent":"#bd802d","kind":"Lesson"},{"id":"design","number":"06","title":"Colour design","slogan":"Choose a colour. Discover the particle behind it.","accent":"#438c75","kind":"Lesson"},{"id":"tmat","number":"07","title":"T-matrix","slogan":"Watch spheres talk through multiple scattering.","accent":"#8b70b6","kind":"Lesson"},{"id":"chain","number":"08","title":"Sphere chains","slogan":"Couple particles. Shift resonances. Light up gaps.","accent":"#bd733e","kind":"Lesson"},{"id":"museum","number":"09","title":"Museum","slogan":"Bring historic scattering diagrams to life.","accent":"#96704f","kind":"Lesson"},{"id":"lightbox","number":"LB","title":"Lightbox","slogan":"Stage your colloids. Explore light and colour.","accent":"#378a91","kind":"Studio"},{"id":"theory","number":"Σ","title":"Theory","slogan":"Connect every visual to the equations behind it.","accent":"#617d9f","kind":"Reference"}],routes=new Set(catalog.map(c=>c.id));
 let wasPlaying=false,showing=false,visited=false,opener=null,restoreOpener=true,lastRoute=null;
 const modalRoutes=new Map(),brand=document.querySelector('.top .brand');
 function copyBrand(id,extra,label){const logo=brand.cloneNode(true);logo.id=id;logo.classList.add(extra);logo.setAttribute('aria-label',label);logo.title=label;return logo;}
 const titleLogo=copyBrand('startLogo','start-brand','Colour with Mie');titleLogo.onclick=e=>e.preventDefault();$('startLogoSlot').append(titleLogo);
 $('startLevelSlot').append($('level'));$('startThemeSlot').append($('themeBtn'));
 const dark=()=>document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches;
 function syncModes(){
  const level=app.level==='phys'?'Engineering':'Physics',theme=dark()?'Light':'Dark';
  document.querySelectorAll('[data-toggle-level]').forEach(b=>b.textContent='Switch to '+level);
  document.querySelectorAll('[data-toggle-theme]').forEach(b=>b.textContent='Switch to '+theme+' mode');
  $('startThemeName').textContent=dark()?'Dark mode':'Light mode';$('themeBtn').setAttribute('aria-label','Switch to '+theme+' mode');$('themeBtn').title='Switch to '+theme+' mode';
 }
 function modeAction(kind,details){const b=document.createElement('button');b.type='button';b.dataset[kind==='level'?'toggleLevel':'toggleTheme']='';b.addEventListener('click',e=>{e.stopPropagation();details.open=false;if(kind==='level')$('level').querySelector('[data-v="'+(app.level==='phys'?'eng':'phys')+'"]').click();else $('themeBtn').click();syncModes();});return b;}
 function utilityMenu(header){const details=document.createElement('details');details.className='menu utility-menu';const summary=document.createElement('summary');summary.className='btn-icon';summary.setAttribute('aria-label','More actions');summary.title='More actions';summary.innerHTML=$('menu').querySelector('summary').innerHTML;const list=document.createElement('div');list.className='menu-list';list.append(modeAction('level',details),modeAction('theme',details));details.append(summary,list);header.append(details);return details;}
 const lessonMenu=$('menu'),lessonList=lessonMenu.querySelector('.menu-list');lessonList.prepend(modeAction('level',lessonMenu),modeAction('theme',lessonMenu));
 const lbUtility=utilityMenu($('lightboxDialog').querySelector('.lb-head'));$('lightboxOptions').querySelector('.lb-options-menu').append(...lbUtility.querySelector('.menu-list').children);$('lightboxOptions').classList.add('utility-menu');lbUtility.remove();const theoryHeader=$('theory').querySelector('header'),theoryMenu=utilityMenu(theoryHeader);theoryHeader.insertBefore(theoryMenu,theoryHeader.querySelector('[data-close]'));
 $('level').addEventListener('click',()=>queueMicrotask(syncModes));$('themeBtn').addEventListener('click',()=>queueMicrotask(syncModes));matchMedia('(prefers-color-scheme: dark)').addEventListener('change',syncModes);
 document.addEventListener('click',e=>document.querySelectorAll('.utility-menu[open]').forEach(d=>{if(!d.contains(e.target))d.open=false;}));
 function restore(){if(!showing)return;showing=false;app.setPlaying(wasPlaying);document.body.classList.remove('start-menu-open');}
 function hide(){if(!dialog.open)return;restoreOpener=false;restore();dialog.close();}
 function show(preferredRoute=null){
  if(dialog.open)return;opener=document.activeElement;wasPlaying=app.playing;app.setPlaying(false);showing=true;restoreOpener=true;syncModes();
  dialog.showModal();document.body.classList.add('start-menu-open');
  const route=preferredRoute||lastRoute||app.state.lesson,focus=visited?$('startCard-'+route):$('startCard-harmonics');focus.focus({preventScroll:true});const box=focus.getBoundingClientRect();if(box.top<0||box.bottom>innerHeight)focus.scrollIntoView({block:'nearest'});
 }
 dialog.addEventListener('close',()=>{if(dialog.open)return;restore();if(restoreOpener&&opener?.isConnected&&!document.querySelector('dialog[open]'))opener.focus({preventScroll:true});});
 dialog.addEventListener('keydown',e=>{e.stopPropagation();if(e.key!=='Tab')return;const buttons=[...dialog.querySelectorAll('a[href],button')].filter(b=>!b.disabled&&b.offsetParent!==null),first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});
 function registerModal(route,node,button){
  const record={node,button,fromMenu:false,back:false};modalRoutes.set(route,record);
  button.addEventListener('click',()=>{if(record.fromMenu&&route!=='lightbox')record.back=true;});
  node.addEventListener('cancel',()=>{if(record.fromMenu)record.back=true;});
  node.addEventListener('click',e=>{if(e.target===node&&record.fromMenu)record.back=true;});
  node.addEventListener('close',()=>{const back=record.back;record.fromMenu=false;record.back=false;if(back)show(route);});
 }
 registerModal('lightbox',$('lightboxDialog'),$('lightboxClose'));registerModal('theory',$('theory'),$('theory').querySelector('[data-close]'));
 const lightboxLogo=copyBrand('lightboxLogo','lightbox-brand','Back to main menu');$('lightboxTitle').before(lightboxLogo);$('lightboxClose').hidden=false;$('lightboxClose').title='Close Lightbox and return to the lesson';
 lightboxLogo.onclick=e=>{e.preventDefault();modalRoutes.get('lightbox').back=true;window.MieLightbox.close();};
 function select(route){
  if(!routes.has(route))return false;visited=true;lastRoute=route;hide();
  if(route==='lightbox'||route==='theory'){const record=modalRoutes.get(route);record.fromMenu=true;record.back=false;if(route==='lightbox')window.MieLightbox.open();else $('theoryBtn').click();}
  else{app.setLesson(route);if(matchMedia('(max-width:900px)').matches&&['real','chain'].includes(route)){$('graphTabs').querySelector('[data-g="spectrum"]')?.click();requestAnimationFrame(()=>document.querySelector('[data-mobile-view="graph"]')?.click());}$('lessonTitle').setAttribute('tabindex','-1');$('lessonTitle').focus({preventScroll:true});}
  return true;
 }
 $('startGrid').addEventListener('click',e=>{const card=e.target.closest('[data-start-route]');if(card)select(card.dataset.startRoute);});
 brand.onclick=e=>{e.preventDefault();show(app.state.lesson);};brand.setAttribute('aria-label','Colour with Mie · start menu');brand.title='Open start menu';
 const menuButton=document.createElement('button');menuButton.type='button';menuButton.textContent='Start menu';menuButton.dataset.act='start';menuButton.addEventListener('click',e=>{e.stopPropagation();lessonMenu.open=false;show(app.state.lesson);});lessonList.prepend(menuButton);
 window.MieStartMenu={show,hide,select,get isOpen(){return dialog.open;},entries:catalog.map(({id,number,title,slogan,kind})=>({id,number,title,slogan,kind}))};
 show();document.documentElement.classList.remove('start-menu-pending');delete window.__mieStartHash;
})();

