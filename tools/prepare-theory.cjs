const fs=require('node:fs'),path=require('node:path'),dir=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(dir,p),'utf8');
let s=read('base/theory.html');const start=s.indexOf('<div class="dlg-body theory">')+29,end=s.lastIndexOf('</div>'),body=s.slice(start,end),credit=body.match(/<p class="credits">[\s\S]*?<\/p>/)?.[0]||'';if(start<29||end<start)throw Error('Theory boundaries');
s=s.slice(0,start)+read('src/theory-route.html')+'\n<details id="theory-detailed-reference" class="theory-detailed-reference"><summary>Detailed equations, conventions and source tables</summary>\n'+body.replace(credit,'')+'\n</details>\n'+credit+'\n'+s.slice(end);
s=s.replace('data-eng="How light scattering works">Mathematics, conventions and limits','data-eng="From particles to colloid appearance">From fields to colloid appearance');
fs.writeFileSync(path.join(dir,'src/theory.html'),s);console.log('Prepared a numbered Theory route with diagrams and an optional detailed reference.');
