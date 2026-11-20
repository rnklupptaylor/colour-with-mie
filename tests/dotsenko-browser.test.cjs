const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'artifacts'),url=pathToFileURL(require('../project-paths.cjs').html).href;
(async()=>{
 const browser=await chromium.launch({headless:true,channel:'chrome'}),report={exhibits:[],errors:[]};
 try{
  const page=await browser.newPage({viewport:{width:1500,height:1000}});page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(url);await page.locator('#startCard-museum').click();
  const cat=await page.evaluate(()=>MuseumExplorer.catalog.map(e=>({id:e.id,year:e.year})));assert.ok(cat.every((e,i)=>!i||e.year>=cat[i-1].year));
  for(const id of ['dotsenko-1','dotsenko-2','dotsenko-3']){
   await page.locator('#museumSelect').selectOption(id);await page.waitForTimeout(120);
   const e=await page.evaluate(id=>{const e=MuseumExplorer.catalog.find(e=>e.id===id);return {image:e.image,cases:e.cases,source:e.sources[0].url};},id);
   const n=id.at(-1),bytes=Buffer.from(e.image.split(',')[1],'base64');assert.deepEqual(bytes,fs.readFileSync(path.join(root,`assets/museum/dotsenko-fig${n}.png`)));
   assert.equal(await page.locator('#museumSourceLinks a').first().getAttribute('target'),'_blank');assert.equal(e.source,'https://doi.org/10.1007/BF00660776');
   assert.equal(await page.locator('#museumTechnicalDetails').getAttribute('open'),null);assert.equal(await page.locator('#museumMethod sub').count()>0,true);
   if(id!=='dotsenko-3'){
    assert.equal(await page.locator('#museumCurveLinks button').count(),6);await page.locator('#museumDotsRegistration').selectOption('printed');const base=await page.evaluate(()=>MuseumExplorer.simulation.curves[0].points);await page.locator('#museumDotsRegistration').selectOption('registered');assert.notDeepEqual(await page.evaluate(()=>MuseumExplorer.simulation.curves[0].points),base);
    await page.locator('#museumDotsSampling').selectOption('resolved');assert.equal(await page.evaluate(()=>MuseumExplorer.simulation.curves[0].points.length),176);await page.locator('#museumDotsSampling').selectOption('paper');assert.equal(await page.evaluate(()=>MuseumExplorer.simulation.curves[0].points.length),15);
    for(const h of e.cases){await page.locator(`[data-museum-curve="${h}"]`).click();assert.equal(await page.evaluate(()=>MieExplorer.state.museumCase),h);assert.match(await page.locator('#museumSettings').innerText(),new RegExp(`H = ${h} nm`));}
   }
   await page.screenshot({path:path.join(out,id+'-desktop.png')});
   await page.locator('[data-museum-layer="paper"]').click();await page.screenshot({path:path.join(out,id+'-paper.png')});
   await page.locator('[data-museum-layer="app"]').click();await page.screenshot({path:path.join(out,id+'-app.png')});
   await page.locator('[data-museum-layer="overlay"]').click();report.exhibits.push(id);
  }
  // Pick a core/shell pair directly on the calibrated Figure 3 map.
  const position=await page.evaluate(()=>{const e=DotsenkoMuseum.catalog[2],r=document.getElementById('museumImageArea').getBoundingClientRect(),f=Math.min((r.width-12)/e.width,(r.height-12)/e.height),p=DotsenkoMuseum.xy(e,300,60);return {x:(r.width-e.width*f)/2+p[0]*f,y:(r.height-e.height*f)/2+p[1]*f};});
  await page.locator('#museumCanvas').click({position});assert.ok(Math.abs(await page.evaluate(()=>MieExplorer.state.museumBookX)-300)<=3);assert.equal(await page.evaluate(()=>MieExplorer.state.museumCase),60);
  await page.locator('#museumBookX').evaluate(el=>{el.value=0;el.dispatchEvent(new Event('input',{bubbles:true}));});
  await page.locator('#museumShell').evaluate(el=>{el.value=120;el.dispatchEvent(new Event('input',{bubbles:true}));});
  assert.equal(await page.evaluate(()=>MieExplorer.state.museumBookX),0);assert.match(await page.locator('#museumSettings').innerText(),/R = 105.3 nm/);
  assert.ok((await page.evaluate(()=>MuseumExplorer.csv())).includes('"app_core_radius_nm","app_shell_thickness_nm"'));
  // Transfer the actual dispersive material and geometry into the native lesson.
  await page.locator('#museumLessonLink').click();assert.deepEqual(await page.evaluate(()=>{const s=MieExplorer.state;return [s.lesson,s.mat,s.rad,s.struct,s.cmed];}),['real','rutileDotsenko',120/1.139667864057681,'homog',1.5]);
  assert.equal(await page.locator('#matSel option[value="rutileDotsenko"]').count(),1);
  const worker=await page.evaluate(async()=>{const config={...MieExplorer.state,popOn:false};const expected=MiePopulation.calculate(config,550,'current');const actual=await new Promise((resolve,reject)=>{const u=URL.createObjectURL(new Blob([MiePopulationWorkerSource],{type:'text/javascript'})),w=new Worker(u);URL.revokeObjectURL(u);w.onerror=e=>{w.terminate();reject(Error(e.message));};w.onmessage=e=>{if(e.data.error){w.terminate();reject(Error(e.data.error));}else if(e.data.done){w.terminate();resolve(e.data.data);}};w.postMessage({type:'current',config});});return [expected.sca,actual.sca];});assert.ok(Math.abs(worker[0]-worker[1])<1e-8);report.worker=worker;
  await page.evaluate(()=>MieExplorer.setLesson('museum',true));await page.locator('#museumSelect').selectOption('dotsenko-3');await page.locator('#museumLessonLink').click();assert.deepEqual(await page.evaluate(()=>[MieExplorer.state.core,MieExplorer.state.shell,MieExplorer.state.struct]),[50/0.8997800010924424,75/1.139667864057681,'cs']);
  // Preserve the pre-existing Museum exhibits.
  await page.evaluate(()=>MieExplorer.setLesson('museum',true));for(const id of ['mie-3','oldenburg-3a','bh-4-6','evanoff-2']){await page.locator('#museumSelect').selectOption(id);assert.ok(await page.locator('#museumSettings').innerText());}
  await page.setViewportSize({width:390,height:844});
  for(const id of ['dotsenko-1','dotsenko-2','dotsenko-3']){
   await page.locator('#museumSelect').selectOption(id);await page.waitForTimeout(150);await page.screenshot({path:path.join(out,id+'-mobile.png')});
   const rect=await page.locator('#museumCanvas').boundingBox();assert.ok(rect.width>200&&rect.height>150);assert.ok(await page.locator('#museumLessonLink').isVisible());
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  }
  assert.deepEqual(report.errors,[]);report.passed=true;fs.writeFileSync(path.join(out,'dotsenko-browser-validation.json'),JSON.stringify(report,null,2));console.log('PASS desktop/mobile Museum figures, original images, controls, map selection, CSV, lesson transfers and worker material.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
