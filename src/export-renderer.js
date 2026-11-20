(function(root){
 'use strict';
 const abortError=()=>Object.assign(Error('Export cancelled. No partial files were saved.'),{name:'AbortError'});
 const profile=settings=>{const p=MieIlluminants.profile(settings.illuminant,settings.whiteBalance);return {rgbWeights:p.rgbWeights,whiteRGB:p.whiteRGB};};
 class ExportRenderer{
  static get supported(){return typeof Worker==='function'&&typeof OffscreenCanvas==='function'&&typeof createImageBitmap==='function';}
  constructor(canvas,options){
   this.background=true;this.canvas=canvas;this.options=options;this.sideMaximum=options.sideMaximum||512;this.views=new Map();this.disposed=false;canvas.width=options.fixedSize.width;canvas.height=options.fixedSize.height;
   const url=URL.createObjectURL(new Blob([MieLightboxRenderWorkerSource],{type:'text/javascript'}));this.worker=new Worker(url);URL.revokeObjectURL(url);this.ready=new Promise((resolve,reject)=>{this.readyResolve=resolve;this.readyReject=reject;});
   this.worker.onmessage=e=>{
    const d=e.data;if(this.disposed){d.image?.close();return;}
    if(d.type==='ready')this.readyResolve();else if(d.type==='unsupported')this.fail(Object.assign(Error('Background WebGL is unavailable.'),{code:'WORKER_UNSUPPORTED'}));else if(d.type==='error')this.fail(Error(d.message));else if(d.type==='progress')this.current?.progress(d.fraction,d.preparing);
    else if(d.type==='image'){try{const context=canvas.getContext('2d');context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(d.image,0,0);this.views.set(d.id,d.record);this.current?.resolve();}catch(error){this.current?.reject(error);}finally{d.image.close();this.current=null;}}
   };
   this.worker.onerror=e=>this.fail(Error(e.message||'The background renderer could not start.'));
   MieCard.ready.then(image=>createImageBitmap(image,{imageOrientation:'flipY',premultiplyAlpha:'none'})).then(logo=>{if(this.disposed){logo.close();return;}this.worker.postMessage({type:'init',options,logo,profile:profile(options.initialSettings)},[logo]);}).catch(error=>this.fail(error));
   this.gl={finish(){}};
  }
  fail(error){this.error=error;this.readyReject(error);this.current?.reject(error);this.current=null;}
  async render(sample,jobs,settings,job,onProgress){
   await this.ready;if(job.abort.signal.aborted||this.disposed)throw abortError();
   return new Promise((resolve,reject)=>{
    const stop=()=>job.abort.signal.removeEventListener('abort',abort),abort=()=>{stop();this.dispose();reject(abortError());};
    job.abort.signal.addEventListener('abort',abort,{once:true});this.current={progress:onProgress,resolve:()=>{stop();resolve();},reject:error=>{stop();reject(error);}};
    try{this.worker.postMessage({type:'render',sample,settings,optics:jobs.get(MieLightboxModel.key(sample,settings)).data,profile:profile(settings),draft:!!this.options.draftOnly,passes:settings.lighting.startsWith('side')?this.sideMaximum:(this.options.baseMaximum??328)});}catch(error){stop();this.current=null;reject(error);}
   });
  }
  compose(){}pause(){}
  dispose(){if(this.disposed)return;this.disposed=true;this.worker.terminate();this.readyReject(abortError());this.current?.reject(abortError());this.current=null;}
 }
 root.MieExportRenderer=ExportRenderer;
})(globalThis);