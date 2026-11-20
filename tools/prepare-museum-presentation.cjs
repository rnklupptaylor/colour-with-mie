const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(dir,f),'utf8');
const copy=JSON.parse(read('data/museum-copy.json'));fs.writeFileSync(path.join(dir,'src/museum-presentation.js'),read('src/museum-presentation.template.js').replace('/*MUSEUM_COPY*/{}',()=>JSON.stringify(copy)));
function patch(file,changes){let s=read(file);for(const [a,b] of changes){if(s.includes(b))continue;if(s.split(a).length!==2)throw Error(file+' marker '+a.slice(0,90));s=s.replace(a,()=>b);}fs.writeFileSync(path.join(dir,file),s);}
patch('src/app.js',[["const museumMode=S.lesson==='museum';","const museumMode=S.lesson==='museum';$('tasks').hidden=museumMode;$('ideasBox').hidden=museumMode;"]]);
patch('src/guides.js',[
 ["orientation(id){const g=GUIDE[id];","orientation(id){if(id==='museum')return '';const g=GUIDE[id];"],
 ["explain(id,level){const g=GUIDE[id];","explain(id,level){if(id==='museum')return '';const g=GUIDE[id];"],
 ["E.museum.tasks.push(bh);", "E.museum.tasks.push(bh);\n      L.museum.title=E.museum.title='Museum: Explore more than 150 years of light scattering';\n      L.museum.concept=E.museum.concept='Touch, change and compare more than 150 years of light-scattering ideas. Explore original figures alongside live calculations. Selected exhibits can be opened in the lessons or transferred to the Lightbox.';\n      L.museum.tasks=[];E.museum.tasks=[];L.museum.ideas='';E.museum.ideas='';"]
]);
patch('src/museum.js',[
 ["$('museumMethod').textContent=next.method;","root.MuseumPresentation.show(next);"],
 ["simulation.usePopulation?'Compare mean particle in lesson 05 Real Particles'", "simulation.usePopulation?'Open this distribution in lesson 05 Real particles'"],
 ["state.museumPopulation=e.target.value==='population';refresh();", "state.museumPopulation=e.target.value==='population';if(e.target.value==='paper'&&state.museumCase===-1)state.museumCase=17;refresh();"],
 ["['caption_shell_nm','core_radius_nm'", "['comparison_case','core_radius_nm'"],
 ["[curve.value,curve.core,curve.thickness,!!curve.fit", "[curve.value===-1?'rising-trace':curve.value,curve.core,curve.thickness,!!curve.fit"]
]);
patch('src/museum-studies.js',[["const points=curve.points.map(([x,y])=>map(x,y,scale));","const points=curve.points.map(([x,y])=>map(x,y+(curve.fit?.offset||0)/scale,scale));"]]);
fs.writeFileSync(path.join(dir,'src/museum-studies.js'),read('src/museum-studies.js').replace('Illustrative sphere: a 10 nm','Illustrative sphere: a = 10 nm'));
fs.writeFileSync(path.join(dir,'src/book-museum.js'),read('src/book-museum.js').replaceAll('sphere a ${v} nm','sphere a = ${v} nm').replaceAll('sphere a 1000 nm','sphere a = 1000 nm'));
fs.writeFileSync(path.join(dir,'src/museum.js'),read('src/museum.js').split('\n').filter(line=>!line.includes("$('museumDiscrepancy').")).join('\n'));
const css='\n/* Museum interpretation and scientific notation. */\n.mie-math sub,.mie-math sup{font-size:.72em;line-height:0;position:relative;vertical-align:baseline}.mie-math sub{bottom:-.22em}.mie-math sup{top:-.4em}\n#museumMethod p{margin:.65em 0;line-height:1.55}.museum-introduction{font-size:1.04em}.museum-try h3{font-size:13px;margin:16px 0 6px}.museum-try ol{padding-left:20px}.museum-try p{margin:6px 0;line-height:1.5}#museumToLightbox{margin-top:8px;white-space:normal;text-align:left}\n';
if(!read('src/v27.css').includes('/* Museum interpretation and scientific notation. */'))fs.appendFileSync(path.join(dir,'src/v27.css'),css);
console.log('Prepared Museum introductions, exhibit activities, exact title and notation presentation.');
