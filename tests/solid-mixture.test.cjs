const assert=require('node:assert/strict'),fs=require('fs'),path=require('path');
require('../src/kernel/physics.js');require('../src/kernel/interior.js');require('../src/kernel/tmatrix.js');
for(const n of ['materials','modern-optics','alloys','surface','population','paint-science','solid-matrix','solid-mixture','optics','model'])require('../src/'+n+'.js');
const near=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} versus ${b}`);
(async()=>{
 const sample=MieLightboxModel.clean({particle:{struct:'homog',mat:'auag30',rad:30,med:'water',surfaceOn:true,surfaceA:1,popOn:true,popSize:15},phi:6e-6,solid:{loading:.003,diameter:400}});
 const settings={container:'seidel',seidelMatrix:'soda-green'},p=MieLightboxModel.renderParticle(sample,settings),data=await MieLightboxOptics.calculate(p,()=>{},false),mixed=MieSolidMixture.mix(data,sample.phi,sample.solid.loading),zero=MieSolidMixture.mix(data,0,0),scatterOnly=MieSolidMixture.mix(data,0,.003);
 assert.ok(data.secondary);assert.equal(mixed.referencePpm,1);
 for(let i=0;i<41;i++){
  const wl=380+10*i,k=4*i,host=4*Math.PI*MieSolidMatrix.nk('soda-green',wl).k/wl*1e6;
  near(mixed.coefficients[k],data.coefficients[k]*6+data.secondary.coefficients[k]*3000);
  near(mixed.coefficients[k+1],data.coefficients[k+1]*6+data.secondary.coefficients[k+1]*3000+10*host);
  near(zero.coefficients[k],0);near(zero.coefficients[k+1],10*host);
  near(scatterOnly.coefficients[k],data.secondary.coefficients[k]*3000);
  const off=i*512,mu=mixed.phase.slice(off,off+512);assert.ok(mu.every(Number.isFinite));assert.ok(mu.every((v,j)=>v>=-1&&v<=1&&(!j||v<=mu[j-1])));
 }
 for(const a of [mixed.coefficients,mixed.density,mixed.phase])assert.ok(a.every(Number.isFinite));
 const bk={...p,_solidMatrix:'bk7',cmed:MieSolidMatrix.nk('bk7',550).n};delete bk._solidScatterer;const clear=await MieLightboxOptics.calculate(bk,()=>{},false);assert.equal(MieSolidMixture.mix(clear,sample.phi,0),clear);
 sample.id='sample';sample.name='Mixture';const file={version:1,samples:[sample],settings},restored=MieLightboxModel.readLightbox(file);assert.deepEqual(restored.samples[0].solid,sample.solid);assert.throws(()=>MieLightboxModel.clean({...sample,solid:{loading:.051,diameter:400}}));assert.throws(()=>MieLightboxModel.clean({...sample,solid:{loading:.01,diameter:0}}));
 const oldKey=MieLightboxModel.key(sample,settings),changed={...sample,solid:{...sample.solid,loading:.01}};assert.equal(oldKey,MieLightboxModel.key(changed,settings),'Loading uses cached intrinsic spectra');assert.notEqual(oldKey,MieLightboxModel.key({...sample,solid:{...sample.solid,diameter:500}},settings));
 fs.writeFileSync(path.resolve(__dirname,'../artifacts/solid-mixture-validation.json'),JSON.stringify({passed:true,additiveCoefficients:true,hostAbsorptionAtZeroPrimary:true,finiteMixturePhase:true,noChangeToClearMatricesWithoutScatterers:true,independentLoadingCache:true,settingsRoundTrip:true},null,2));console.log('PASS solid matrix absorption, independent population coefficients, phase CDF, cache keys and file validation.');
})().catch(e=>{console.error(e);process.exitCode=1;});
