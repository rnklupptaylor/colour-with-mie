const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{const page=await browser.newPage();await page.exposeFunction('saveCandidate',(meta,image)=>{const name=meta.file;fs.writeFileSync(path.resolve(__dirname,'../artifacts/'+name),Buffer.from(image.split(',')[1],'base64'));console.log('Finished',name);});page.on('pageerror',e=>console.log('PAGE',e.message));await page.goto(pathToFileURL(require('../project-paths.cjs').html).href);await page.locator('#startCard-real').click();
 const result=await page.evaluate(async()=>{
  const rows=[],base=structuredClone(MieLightboxShowcases['seidel-three'].samples[0]),settings={...MieLightbox.settings,container:'seidel',seidelMatrix:'soda-clear',illuminant:'D65',whiteBalance:'source',seidelLogo:false,lighting:'back',gain:1,pitch:.13,yaw:0};
  Object.assign(base.particle,{mat:'auag30',rad:30,popOn:true,popShape:'lognormal',popSize:15,popQuality:'standard',surfaceOn:true,surfaceA:1});base.phi=6e-6;
  for(const config of [{ppm:10,d:60,cv:15,x:30,loading:.01,sd:200},{ppm:10,d:60,cv:15,x:30,loading:.03,sd:200},{ppm:10,d:60,cv:15,x:30,loading:.05,sd:200},{ppm:10,d:60,cv:15,x:30,loading:.03,sd:300}]){const {loading}=config;
   const sample={...structuredClone(base),phi:config.ppm*1e-6,solid:{loading,diameter:config.sd}};Object.assign(sample.particle,{rad:config.d/2,popSize:config.cv,mat:'auag'+config.x});sample.id='candidate';const p=MieLightboxModel.renderParticle(sample,settings),data=await MieLightboxOptics.calculate(p,()=>{},false),jobs=new Map([[MieLightboxModel.key(sample,settings),{data}]]);
   for(const lighting of ['back','room']){settings.lighting=lighting;const canvas=document.createElement('canvas');document.body.append(canvas);const r=new MieLightboxRenderer(canvas,{fixedSize:{width:240,height:320},gridCap:24,labelSpace:0,initialSettings:settings,sideMaximum:64});r.maximum=16;
    await new Promise((resolve,reject)=>{r.onError=reject;r.onProgress=p=>{if(p.finished)resolve();};r.setSamples([sample],jobs);r.resume();});r.pause();r.compose();r.gl.finish();const file=`lycurgus-round3-${Math.round(100*loading)}-${config.sd}-${lighting}.png`;await window.saveCandidate({file},canvas.toDataURL('image/png'));rows.push({file,config,loading,lighting,settings:{...settings},particle:sample.particle,phi:sample.phi,image:canvas.toDataURL('image/png')});r.dispose();canvas.remove();
   }
  }return rows;
 });
 for(const r of result){const name=r.file;fs.writeFileSync(path.resolve(__dirname,'../artifacts/'+name),Buffer.from(r.image.split(',')[1],'base64'));delete r.image;r.imageFile=name;}
 fs.writeFileSync(path.resolve(__dirname,'../data/lycurgus-render-candidates-round3.json'),JSON.stringify(result,null,2));console.log('Rendered',result.map(r=>[r.loading,r.lighting,r.imageFile]));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
