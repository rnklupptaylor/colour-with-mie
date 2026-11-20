// Complete local build. No previous release, external source tree or network is read.
const fs=require('node:fs'),path=require('node:path');
const folder=__dirname,config=JSON.parse(fs.readFileSync(path.join(folder,'package.json'),'utf8'));
const version=config.version,label=version.endsWith('.0.0')?version.slice(0,-4):version.replace(/\.0$/,''),inputs=new Set();
function read(name){const p=path.resolve(folder,name);if(!p.startsWith(folder+path.sep))throw Error('Build input outside project: '+name);inputs.add(name);return fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');}
function expand(name,stack=[]){if(stack.includes(name))throw Error('Include cycle: '+name);return read(name).replace(/@@(INCLUDE|WORKER):([^@]+)@@/g,(_,type,file)=>{const body=expand(file,[...stack,name]);return type==='WORKER'?JSON.stringify(body):body;});}
function current(s){return s.replaceAll('29.0.0',version).replaceAll('Colour with Mie v29 ','Colour with Mie v'+label+' ');}
const canonical=current(expand('app-shell.html'));
if(/@@(?:INCLUDE|WORKER):/.test(canonical))throw Error('Unexpanded build input.');
const materials=['materials','modern-optics','alloys','surface'].map(n=>read('src/'+n+'.js')).join('\n');
const renderer=['renderer','paint-renderer','fau-logo','seidel-data','monolith-data','seidel-kernel','solid-mixture','seidel-renderer'].map(n=>read('src/'+n+'.js')).join('\n');
const optimized=require('./tools/optimize-bundle.cjs').optimizeBundle(canonical,{materials:current(materials),renderer:current(renderer)});
function write(){
 const name='colour-with-mie-v'+label+'.html';fs.writeFileSync(path.join(folder,name),optimized.html);
 fs.mkdirSync(path.join(folder,'deploy'),{recursive:true});fs.writeFileSync(path.join(folder,'deploy/index.html'),optimized.html.replace("const DEFAULT_LEVEL='phys';","const DEFAULT_LEVEL='eng';"));
 fs.mkdirSync(path.join(folder,'artifacts'),{recursive:true});fs.writeFileSync(path.join(folder,'artifacts/bundle-audit.json'),JSON.stringify({...optimized.audit,version,inputs:[...inputs].sort()},null,2));
 console.log(JSON.stringify({version,filename:name,...optimized.audit}));
}
if(require.main===module)write();
module.exports={canonical,html:optimized.html,audit:optimized.audit,version,label,inputs:[...inputs].sort(),write};
