const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'..');
let s=fs.readFileSync(path.join(dir,'base/guides.js'),'utf8');const notes=JSON.parse(fs.readFileSync(path.join(dir,'src/teaching-guide-notes.json'),'utf8'));
const marker="  const para=s=>'<p>'+s+'</p>';";
const insert=`  const revision=${JSON.stringify(notes)};for(const [id,note] of Object.entries(revision))Object.assign(GUIDE[id],note);
`+fs.readFileSync(path.join(dir,'src/guide-format.js'),'utf8');
if(!s.includes(marker))throw Error('Guide paragraph marker');s=s.replace(marker,()=>insert);
s=s.replace("<b>Your goal.</b> '+g.aim", "<b>Focus.</b> '+ui(g.aim)");
s=s.replace("<summary>How to read this lesson</summary>","<summary>Reading the display</summary>");
const boiler="+para('Use a Set up button to load the stated experiment. Predict a change, vary one control, then compare the result with your prediction. Keep an observation in terms of a curve, a direction or a measured quantity; colour or apparent lobe size alone can depend on the display scale.')";s=s.replace(boiler,'');
s=s.replace("'<p class=\"task-coaching\">'+t+", "'<p class=\"task-coaching\">'+ui(t)+");
s=s.replace("'<h3>What connects the observations?</h3>'+para(g.why)+(level===", "'<h3>Interpretation</h3>'+para(g.why)+(level==='eng'?para(g.engineering):'')+(level===");
s=s.replace("<b>Explain it yourself.</b> '+g.check", "<b>Question.</b> '+ui(g.check)");
s=s.replace('root.MieGuides={','root.MieGuides={ui,decorate,');
s=s.replace("  const theory=document.getElementById('theory');", "  const theory=document.getElementById('theory');decorate(theory);");
s=s.replace('    prepare(L,E){',`    prepare(L,E){
      for(const [id,l] of Object.entries(L)){if(typeof l.ideas==='string')l.ideas=ui(l.ideas);for(const t of l.tasks||[])t.t=ui(t.t);if(E[id]){if(typeof E[id].ideas==='string')E[id].ideas=ui(E[id].ideas);E[id].tasks=E[id].tasks.map(ui);}}
`);
fs.writeFileSync(path.join(dir,'src/guides.js'),s);console.log('Prepared less formulaic guides, fuller Engineering interpretations and marked control names.');
