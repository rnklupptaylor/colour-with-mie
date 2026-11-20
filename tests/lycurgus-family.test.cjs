const fs = require('fs');
const path = require('path');
const assert = require('node:assert/strict');
const {pathToFileURL} = require('url');
const out=process.env.CWM_TEST_ARTIFACTS||path.resolve(__dirname,'../artifacts');
const {chromium} = require('playwright');

(async () => {
 const browser = await chromium.launch({headless:true,channel:'chrome'});
 try {
  const page = await browser.newPage({viewport:{width:1000,height:800},acceptDownloads:true});
  const errors = [];page.on('console',m=>console.log(m.text()));
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(pathToFileURL(process.env.CWM_TEST_HTML||require('../project-paths.cjs').html).href);
  await page.locator('#startCard-real').click();
  await page.evaluate(() => {
   const d = structuredClone(MieLightboxShowcases['lycurgus-seidel']);
   d.samples = d.samples.slice(0,1);
   d.settings.seidelLogo = true;
   MieLightbox.loadData(d);
   Object.assign(MieLightboxExport.levels.standard,{edge:480,grid:16,packets:4});
  });
  const preview = await page.evaluate(async () => {
   const updates = [], progress = [];
   const prepared = await MieLightboxExport.prepareFamily({
    samples:MieLightbox.samples,settings:MieLightbox.settings,
    edge:480,grid:16,progressive:true,quality:'fast'
   },{
    onImage:(i,lighting,entry) => {console.log('Image',i,lighting,!!entry.draft);updates.push({i,lighting,draft:!!entry.draft,width:entry.canvas.width,height:entry.canvas.height});},
    onProgress:(m,f) => {progress.push(f);if(!window.lastFamilyTime||performance.now()-window.lastFamilyTime>5000){console.log(m,f);window.lastFamilyTime=performance.now();}}
   });
   const canvas = document.createElement('canvas');
   const layout = await MieFamily.paint(canvas,prepared.snapshot.samples,prepared.snapshot.settings,prepared.frames,{scheme:'alpha',labels:true},480);
   return {updates,progress,layout,frames:prepared.frames.map(f=>({back:f.back.record,room:f.room.record})),image:canvas.toDataURL('image/png')};
  });
  assert.deepEqual(preview.updates.map(x=>x.lighting),['back','room','back','room']);
  assert.deepEqual(preview.updates.map(x=>x.draft),[true,true,false,false]);
  assert.ok(preview.progress.every((f,i,a)=>!i||f>=a[i-1]));
  assert.ok(preview.frames[0].back.fullReflections);
  assert.ok(preview.frames[0].room.fullReflections);
  assert.equal(preview.frames[0].back.meniscus,null);
  assert.equal(preview.frames[0].back.passes,48);assert.equal(preview.frames[0].room.passes,48);
  assert.equal(await page.evaluate(()=>{const sample=MieLightbox.samples[0],s=MieLightbox.settings;return MieFamily.imageKey(sample,{...s,_exportQuality:'fast'},'back')!==MieFamily.imageKey(sample,{...s,_exportQuality:'maximum'},'back');}),true);
  fs.writeFileSync(path.join(out,'lycurgus-family-preview.png'),Buffer.from(preview.image.split(',')[1],'base64'));
  delete preview.image;
  const download = page.waitForEvent('download',{timeout:180000}).then(download=>({download}),error=>({error:error.message}));
  const exported = await page.evaluate(() => MieLightboxExport.start({
   family:true,samples:MieLightbox.samples,settings:MieLightbox.settings,
   level:'standard',quality:'fast',familyVariants:[true,false],familyOptions:{scheme:'alpha'},metadata:true
  }));
  assert.equal(exported.files.length,4);assert.ok(exported.files.every(n=>n.includes('quality-fast')));
  assert.ok(exported.files.some(n=>n.includes('labels-alpha')));
  assert.ok(exported.files.some(n=>n.includes('no-labels')));
  const packet = await download;
  assert.ok(packet.download,packet.error);
  await packet.download.saveAs(path.join(out,'lycurgus-family-export.zip'));
  assert.deepEqual(errors,[]);
  fs.writeFileSync(path.join(out,'lycurgus-family-validation.json'),JSON.stringify({passed:true,preview,exported,browserErrors:errors},null,2));
  console.log('PASS Lycurgus mixed-solid photographic family preview, full back/front rows, label variants and reloadable PNG/JSON download.');
 } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
