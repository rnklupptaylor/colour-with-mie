const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),build=require('../build.cjs'),sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const file=path.join(root,'colour-with-mie-v'+build.label+'.html');assert.equal(fs.readFileSync(file,'utf8'),build.html);
assert.equal(fs.readFileSync(path.join(root,'deploy/index.html'),'utf8'),build.html.replace("const DEFAULT_LEVEL='phys';","const DEFAULT_LEVEL='eng';"));
assert.ok(build.inputs.every(p=>!path.isAbsolute(p)&&!p.startsWith('..')));assert.ok(!build.inputs.some(p=>/^v[0-9]+\//.test(p)));
assert.equal(build.audit.allCurveValuesBitExact,true);assert.equal(build.audit.workerSourcesIdentical,true);assert.equal(build.audit.decodedPoints,163837);
let scripts=0;for(const m of build.html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){if(/\btype=["'](?:application\/json|text\/plain)/i.test(m[1]))continue;new vm.Script(m[2],{filename:'script-'+(++scripts)});}
const embedded=s=>[...s.matchAll(/data:[a-z0-9.+-]+\/[a-z0-9.+-]+(?:;[a-z0-9=.+-]+)*;base64,[A-Za-z0-9+/=]+/gi)].map(m=>sha(m[0]));assert.deepEqual(embedded(build.html),embedded(build.canonical));
const before=fs.readFileSync(file);build.write();assert.equal(sha(fs.readFileSync(file)),sha(before));
const report={passed:true,version:build.version,standalone:true,allBuildInputsLocal:true,losslessCurves:true,workersIdentical:true,imageAndFontBytesPreserved:true,scriptsParsed:scripts,buildIdempotent:true,bytes:before.length,sha256:sha(before)};
fs.writeFileSync(path.join(root,'artifacts/integrity-validation.json'),JSON.stringify(report,null,2));console.log('PASS self-contained build, syntax, graph values, workers, images and reproducibility.');
