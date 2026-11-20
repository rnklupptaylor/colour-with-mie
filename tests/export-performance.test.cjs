const fs=require('fs'),path=require('path'),assert=require('node:assert/strict'),{pathToFileURL}=require('url');
const {chromium}=require('playwright');
const out=process.env.CWM_MAINTENANCE_ROOT||path.resolve(__dirname,'../artifacts');
const url=pathToFileURL(process.env.CWM_TEST_HTML||require('../project-paths.cjs').html).href;
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'}),errors=[],report={};try{
 const page=await browser.newPage({viewport:{width:1100,height:900},acceptDownloads:true});page.on('pageerror',e=>errors.push(e.message));await page.exposeFunction('reportExportStep',s=>console.log(JSON.stringify(s)));await page.goto(url);await page.locator('#startCard-real').click();
 await page.evaluate(()=>{const set=structuredClone(MieLightboxShowcases['lycurgus-seidel']);set.samples=set.samples.slice(0,1);MieLightbox.loadData(set);MieLightbox.open();MieLightbox.renderer?.pause();MieLightbox.openExport([MieLightbox.samples[0].id]);});
 assert.equal(await page.locator('#lightboxExportQuality').inputValue(),'balanced');assert.equal(await page.locator('#lightboxExportQualityRow').isVisible(),true);
 await page.locator('#lightboxExportQuality').selectOption('fast');for(const value of ['back','room','side','side-white'])await page.locator('[name=exportLight][value="'+value+'"]').check();
 report.profiles=await page.evaluate(()=>Object.fromEntries(['fast','balanced','maximum'].map(q=>[q,MieLightboxExport.qualityProfile(MieLightbox.settings,q,'standard',900,1200)])));
 assert.equal(report.profiles.fast.height,640);assert.equal(report.profiles.maximum.height,1200);assert.equal(report.profiles.balanced.grid,64);
 await page.evaluate(()=>{window.exportStates=[];window.exportStarted=performance.now();let bucket=-1;addEventListener('mie-export-state',e=>{const state={...e.detail,t:performance.now()-exportStarted};exportStates.push(state);if(Math.floor(state.fraction*10)!==bucket||state.state!=='running'){bucket=Math.floor(state.fraction*10);reportExportStep(state);}});document.getElementById('lightboxExportForm').requestSubmit();});
 await page.waitForFunction(()=>MieLightboxExport.running);assert.equal(await page.locator('#lightboxExportDialog').isVisible(),false);
 const download=page.waitForEvent('download',{timeout:900000});
 // Closing the lightbox and using a lesson must not abort or alter the export snapshot.
 await page.locator('#lightboxClose').click();await page.evaluate(()=>{MieExplorer.state.rad=37;MieExplorer.refresh(true);});assert.equal(await page.evaluate(()=>MieExplorer.state.rad),37);assert.equal(await page.evaluate(()=>MieLightboxExport.running),true);
 const packet=await download;await page.evaluate(()=>MieLightbox.lastExport);report.milliseconds=await page.evaluate(()=>performance.now()-exportStarted);report.result=await page.evaluate(()=>MieLightbox.lastExport);report.states=await page.evaluate(()=>exportStates);fs.writeFileSync(path.join(out,'export-performance-partial.json'),JSON.stringify(report,null,2));await packet.saveAs(path.join(out,'lycurgus-fast-four-views.zip'));assert.equal(report.result.files.length,8);assert.ok(report.result.files.every(f=>f.includes('quality-fast')));
 assert.ok(report.states.length>5);assert.ok(report.states.every((s,i,a)=>!i||s.fraction>=a[i-1].fraction));assert.equal(report.states.at(-1).state,'complete');
 // Abort a separate maximum job and verify that no partial download is emitted.
 let downloads=0;page.on('download',()=>downloads++);await page.evaluate(()=>{window.abortResult=MieLightboxExport.start({samples:[MieLightbox.samples[0]],settings:MieLightbox.settings,level:'standard',quality:'maximum',lights:['back'],metadata:true,jobs:MieLightbox.jobs}).then(()=>({completed:true}),e=>({name:e.name}));});
 await page.waitForFunction(()=>MieLightboxExport.running);await page.waitForTimeout(700);await page.evaluate(()=>MieLightboxExport.cancel());assert.equal((await page.evaluate(()=>abortResult)).name,'AbortError');assert.equal(await page.evaluate(()=>MieLightboxExport.running),false);assert.equal(downloads,0);
 assert.deepEqual(errors,[]);report.passed=true;report.cancelledWithoutDownload=true;report.lessonUsableWhileExporting=true;report.browserErrors=errors;fs.writeFileSync(path.join(out,'export-performance-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({passed:true,milliseconds:report.milliseconds,files:report.result.files.length,background:true,cancelled:true}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
