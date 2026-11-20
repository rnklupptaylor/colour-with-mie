const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({headless:true,channel:'chrome'});try{const page=await browser.newPage();page.on('pageerror',e=>console.log('PAGE',e.message));await page.goto(pathToFileURL(require('../project-paths.cjs').html).href);await page.locator('#startCard-real').click();
 const result=await page.evaluate(async()=>{
  const rows=[],base=structuredClone(MieLightboxShowcases['seidel-three'].samples[0]),settings={...MieLightbox.settings,container:'seidel',seidelMatrix:'soda-green',seidelLogo:false,lighting:'back',gain:1,pitch:.13,yaw:0};
  Object.assign(base.particle,{mat:'auag30',rad:30,popOn:true,popShape:'lognormal',popSize:15,popQuality:'standard',surfaceOn:true,surfaceA:1});base.phi=6e-6;
  for(const loading of [0,.001,.003,.01]){
   const sample={...structuredClone(base),solid:{loading,diameter:400}};sample.id='candidate';const p=MieLightboxModel.renderParticle(sample,settings),data=await MieLightboxOptics.calculate(p,()=>{},false),jobs=new Map([[MieLightboxModel.key(sample,settings),{data}]]);
   for(const lighting of ['back','room']){settings.lighting=lighting;const canvas=document.createElement('canvas');document.body.append(canvas);const r=new MieLightboxRenderer(canvas,{fixedSize:{width:240,height:320},gridCap:64,labelSpace:0,initialSettings:settings,sideMaximum:64});r.maximum=64;
    await new Promise((resolve,reject)=>{r.onError=reject;r.onProgress=p=>{if(p.finished)resolve();};r.setSamples([sample],jobs);r.resume();});r.pause();r.compose();r.gl.finish();rows.push({loading,lighting,settings:{...settings},particle:sample.particle,phi:sample.phi,image:canvas.toDataURL('image/png')});r.dispose();canvas.remove();
   }
  }return rows;
 });
 for(const r of result){const name=`lycurgus-candidate-${Math.round(r.loading*10000)}-${r.lighting}.png`;fs.writeFileSync(path.resolve(__dirname,'../artifacts/'+name),Buffer.from(r.image.split(',')[1],'base64'));delete r.image;r.imageFile=name;}
 fs.writeFileSync(path.resolve(__dirname,'../data/lycurgus-render-candidates.json'),JSON.stringify(result,null,2));console.log('Rendered',result.map(r=>[r.loading,r.lighting,r.imageFile]));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
