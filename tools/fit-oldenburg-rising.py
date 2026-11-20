"""Trace the additional solid spectrum and test a thin complete-shell model."""
from pathlib import Path
import sys,json,importlib.util
ROOT=Path(__file__).resolve().parents[1]
# Install the project requirements in a virtual environment.
import numpy as np
from PIL import Image,ImageDraw
from scipy.optimize import least_squares
spec=importlib.util.spec_from_file_location('oldenburg_fit',ROOT/'tools/refit-oldenburg.py');module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
im=Image.open(ROOT/'assets/oldenburg-source-b.png').convert('RGB');a=np.array(im.convert('L'));qa=im.copy();draw=ImageDraw.Draw(qa)
seed=[400.5,404,410,416,422.5,427.5,432,435,435,432,430.5,426.5,422.5,417,410.5,404,397.5,389,381,371.5,361.5,351.5,344.5,336,328,320,313,301,293,284.5,274.5]
pixels=[];points=[]
for x,guess in zip(range(40,641,20),seed):
 ys=np.flatnonzero(a[max(0,int(guess-7)):int(guess+8),x-1:x+2].min(axis=1)<100)+max(0,int(guess-7));groups=[]
 for yy in ys:
  if not groups or yy>groups[-1][-1]+1:groups.append([int(yy)])
  else:groups[-1].append(int(yy))
 if not groups:raise ValueError(f'No printed stroke at x={x}')
 group=min(groups,key=lambda g:abs(np.mean(g)-guess));y=float(np.mean(group));wl=400+(x/2-17)/313*650;signal=257-y/2
 pixels.append([x,y]);points.append([wl,signal]);draw.ellipse((x-3,y-3,x+3,y+3),fill=(5,150,80))
qa.save(ROOT/'artifacts/oldenburg-rising-targets.png')
target={'id':'b-rising','panel':'b','captionCore':170,'captionShell':-1,'TEM':None,'label':'Rising red-end spectrum','wl':[p[0] for p in points],'signal':[p[1] for p in points],'sourcePixels':pixels,'sourceImage':'oldenburg-source-b.png','sourceScale':'Image is 2× the Museum figure. Calibrated x0=17, x1=330, y0=257 at native Museum resolution.','interpretation':'Candidate complete thin shell. The spectrum has no observed maximum within the figure and the shell geometry is not uniquely identified.'}
(ROOT/'data/oldenburg-rising-observations.json').write_text(json.dumps(target,indent=2),encoding='utf8')
report=json.loads((ROOT/'data/oldenburg-modern-grid-fit.json').read_text(encoding='utf8'));grid=module.Grid('b');y=np.array(target['signal']);models={}
for mode in ['single','population']:report['families']['b'][mode]['rows']=[r for r in report['families']['b'][mode]['rows'] if r['id']!='b-rising']
for mode in ['single','population']:
 family=report['families']['b'][mode];rmean,rcv=family['parameters'][:2];values=grid.core_average(rmean,rcv);mask=np.ones(len(y),bool)
 def residual(p,record=False):
  t=p[0];cv=p[1] if mode=='population' else 0;z=grid.weights(grid.t,t,cv)@values;amp=module.amplitude(y,z,mask);e=(amp*z-y)/max(y)
  return (z,amp,e) if record else e
 trials=[]
 for t in [3,5,8,12,18]:
  start=[t,.25] if mode=='population' else [t]
  trials.append(least_squares(residual,start,bounds=([1,0],[25,.5]) if mode=='population' else ([1],[25]),max_nfev=500,ftol=1e-12,xtol=1e-10,gtol=1e-12))
 best=min(trials,key=lambda t:sum(t.fun**2));t=best.x[0];cv=best.x[1] if mode=='population' else 0;z,amp,error=residual(best.x,True)
 row={**target,'meanCoreRadiusNm':rmean,'coreNumberCV':rcv,'coreRadiusSDNm':rmean*rcv,'meanShellThicknessNm':float(t),'shellNumberCV':float(cv),'shellThicknessSDNm':float(t*cv),'amplitude':float(amp),'rms':float(np.sqrt(np.mean(error**2))),'trainRms':float(np.sqrt(np.mean(error**2))),'testRms':None,'prediction':(amp*z).tolist(),'crossSectionsNm2':z.tolist(),'hypothesis':True,'sharedCoreFixedFromOtherSamples':True}
 family['rows'].append(row);models[mode]={'meanShellNm':float(t),'sdShellNm':float(t*cv),'normalizedRms':row['rms'],'fixedCoreRadiusNm':rmean,'fixedCoreCV':rcv}
 print(mode,models[mode],flush=True)
 # Profile mean shell thickness while reoptimizing width and the ordinate scale.
 if mode=='population':
  profile=[]
  for thickness in np.linspace(2,20,73):
   o=least_squares(lambda v:residual([thickness,v[0]]),[cv],bounds=([0],[.5]),max_nfev=120)
   profile.append({'meanShellNm':float(thickness),'numberCV':float(o.x[0]),'normalizedRms':float(np.sqrt(np.mean(o.fun**2)))})
  row['shellProfile']=profile
family=report['families']['b']['population'];rmean,rcv=family['parameters'][:2];values=grid.core_average(rmean,rcv)
def with_background(p,mask=None,record=False):
 mask=np.ones(len(y),bool) if mask is None else mask;z=grid.weights(grid.t,p[0],p[1])@values;A=np.column_stack([z,np.ones(len(z))]);amp,offset=np.linalg.lstsq(A[mask],y[mask],rcond=None)[0]
 if amp<0:amp,offset=0,float(np.mean(y[mask]))
 if offset<0:offset=0;amp=module.amplitude(y,z,mask)
 e=(amp*z+offset-y)/max(y)
 return (z,float(amp),float(offset),e) if record else e[mask]
best=min([least_squares(with_background,[t,.25],bounds=([1,0],[25,.5]),max_nfev=500,ftol=1e-12,xtol=1e-10,gtol=1e-12) for t in [3,5,8,12,18]],key=lambda o:sum(o.fun**2))
z,amp,offset,e=with_background(best.x,record=True);t,cv=best.x
row={**target,'meanCoreRadiusNm':rmean,'coreNumberCV':rcv,'coreRadiusSDNm':rmean*rcv,'meanShellThicknessNm':float(t),'shellNumberCV':float(cv),'shellThicknessSDNm':float(t*cv),'amplitude':amp,'offset':offset,'allowBackground':True,'rms':float(np.sqrt(np.mean(e**2))),'prediction':(amp*z+offset).tolist(),'crossSectionsNm2':z.tolist(),'hypothesis':True,'sharedCoreFixedFromOtherSamples':True}
mask=np.arange(len(y))%2==0;held=least_squares(lambda x:with_background(x,mask),best.x,bounds=([1,0],[25,.5]),ftol=1e-12,xtol=1e-10,gtol=1e-12);error=with_background(held.x,mask,True)[3];row['heldOutRms']=float(np.sqrt(np.mean(error[~mask]**2)))
report['families']['b']['background']={'panel':'b','distributed':True,'sharedCore':True,'rms':row['rms'],'rows':[row],'bounds':{'meanShellThicknessNm':[1,25],'shellNumberCV':[0,.5],'constantOffset':'nonnegative and fitted in source-image ordinate units','sharedCore':'fixed to the labelled population fits'}}
models['background']={'meanShellNm':float(t),'sdShellNm':float(t*cv),'normalizedRms':row['rms'],'constantOffsetSourcePixels':offset,'heldOutRms':row['heldOutRms']};print('shell + constant background',models['background'],flush=True)
# The single-size comparison uses the same freedom in vertical registration.
single=report['families']['b']['single'];rmean,rcv=single['parameters'][:2];values=grid.core_average(rmean,0)
best_single=min([least_squares(lambda x:with_background([x[0],0]),[t],bounds=([1],[25]),ftol=1e-12,xtol=1e-10,gtol=1e-12) for t in [3,8,15]],key=lambda o:sum(o.fun**2))
z,amp,offset,e=with_background([best_single.x[0],0],record=True);r=single['rows'][-1];r.update(meanShellThicknessNm=float(best_single.x[0]),shellNumberCV=0.,shellThicknessSDNm=0.,amplitude=amp,offset=offset,allowBackground=True,rms=float(np.sqrt(np.mean(e**2))),prediction=(amp*z+offset).tolist(),crossSectionsNm2=z.tolist())
models['singleWithOffset']={'meanShellNm':r['meanShellThicknessNm'],'normalizedRms':r['rms'],'constantOffsetSourcePixels':offset}
report['rising']={'models':models,'interpretation':target['interpretation'],'sharedCore':'The core distributions remain fixed to the three labelled completed-shell spectra. The rising spectrum supplies no extra freedom in the core sizes.','backgroundAssumption':'A nonnegative constant vertical plotting offset is fitted for the rising trace. It registers the spectrum in the figure and is not a physical background in lesson 05 or the Lightbox. The missing maximum still prevents a unique structural inference.'}
(ROOT/'data/oldenburg-modern-grid-fit.json').write_text(json.dumps(report,indent=2),encoding='utf8')
print('Added thin-shell candidate using the unchanged family core distributions.',flush=True)
