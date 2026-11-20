"""Joint core populations, independent lognormal shell populations; A stays at 1.

The native grid is a numerical accelerator. Final curves are recomputed with the
app's quadrature and coated-sphere solver, and checked against this interpolation.
"""
from pathlib import Path
import sys,os,json,time
os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
os.environ.setdefault('OMP_NUM_THREADS','1')
ROOT=Path(__file__).resolve().parents[1]
# Install the project requirements in a virtual environment.
import numpy as np
from scipy.special import ndtr
from scipy.optimize import least_squares
sys.stdout.reconfigure(encoding='utf8')
source=json.loads((ROOT/'data/oldenburg-observations.json').read_text(encoding='utf8'))
baselines=json.loads((ROOT/'data/oldenburg-baselines.json').read_text(encoding='utf8'))

def amplitude(y,z,mask):
 return max(0,float(y[mask]@z[mask]/(z[mask]@z[mask])))

class Grid:
 def __init__(self,panel):
  self.meta=json.loads((ROOT/f'tmp/oldenburg-grid-{panel}.json').read_text(encoding='utf8'))
  self.r=np.array(self.meta['radii']);self.t=np.array(self.meta['shells'])
  self.values=np.fromfile(ROOT/f'tmp/oldenburg-grid-{panel}.bin',dtype='<f8').reshape(self.meta['shape'])
 def weights(self,axis,mean,cv):
  weights=np.zeros(len(axis))
  if cv<1e-6:
   j=np.clip(np.searchsorted(axis,mean)-1,0,len(axis)-2);u=(mean-axis[j])/(axis[j+1]-axis[j]);weights[j]=1-u;weights[j+1]=u
   return weights
  variance=np.log1p(cv*cv);sd=np.sqrt(variance);mu=np.log(mean)-variance/2;a,b=axis[:-1],axis[1:];za=(np.log(a)-mu)/sd;zb=(np.log(b)-mu)/sd
  probability=np.where(za>0,ndtr(-za)-ndtr(-zb),ndtr(zb)-ndtr(za))
  ma=za-sd;mb=zb-sd;moment=mean*np.where(ma>0,ndtr(-ma)-ndtr(-mb),ndtr(mb)-ndtr(ma))
  weights[:-1]+=(b*probability-moment)/(b-a);weights[1:]+=(moment-a*probability)/(b-a)
  weights=np.maximum(weights,0);return weights/weights.sum()
 def core_average(self,mean,cv):
  return (self.weights(self.r,mean,cv)@self.values.reshape(len(self.r),-1)).reshape(len(self.t),-1)

def joint(panel,distributed=True,training=None,starts=4):
 rows=[r for r in source['rows'] if r['panel']==panel];grid=Grid(panel);mask=np.ones(len(rows[0]['wl']),bool) if training is None else training;n=len(rows)
 # Parameter order: shared arithmetic mean core radius, shared number CV,
 # then arithmetic mean shell thickness and its independent number CV per sol.
 lower=[45 if panel=='a' else 130,0]+sum(([6 if panel=='a' else 8,0] for _ in rows),[])
 upper=[85 if panel=='a' else 220,.25]+sum(([65 if panel=='a' else 90,.5] for _ in rows),[])
 active=list(range(2+2*n)) if distributed else [0]+list(range(2,2+2*n,2))
 legacy=[next(b for b in baselines if b['id']==r['id']) for r in rows]
 fixed=np.array([legacy[0]['legacyGeometry']['core']['mean'],0]+sum(([b['legacyGeometry']['shell']['mean'],0] for b in legacy),[]))
 def unpack(x):
  p=fixed.copy();p[active]=x;return p
 def residual(x,record=False):
  p=unpack(x);v=grid.core_average(p[0],p[1]);errors=[];records=[]
  for i,row in enumerate(rows):
   t,cv=p[2+2*i:4+2*i];z=grid.weights(grid.t,t,cv)@v;y=np.array(row['signal']);amp=amplitude(y,z,mask);e=(amp*z-y)/y.max();errors.extend(e[mask])
   if record:records.append({**row,'meanCoreRadiusNm':float(p[0]),'coreNumberCV':float(p[1]),'coreRadiusSDNm':float(p[0]*p[1]),'meanShellThicknessNm':float(t),'shellNumberCV':float(cv),'shellThicknessSDNm':float(t*cv),'amplitude':amp,'rms':float(np.sqrt(np.mean(e**2))),'trainRms':float(np.sqrt(np.mean(e[mask]**2))),'testRms':float(np.sqrt(np.mean(e[~mask]**2))) if np.any(~mask) else None,'prediction':(amp*z).tolist(),'crossSectionsNm2':z.tolist()})
  return records if record else np.array(errors)
 trials=[];start_time=time.time()
 for j,(scale,rcv,tcv) in enumerate([(1,.1,.25),(.92,.04,.4),(1.07,.2,.1),(.98,.15,.45)][:starts]):
  p=fixed.copy();p[0]*=scale
  if distributed:
   p[1]=rcv
   for i in range(n):p[3+2*i]=tcv
  x=np.clip(p[active],np.array(lower)[active]+1e-10,np.array(upper)[active]-1e-10)
  trial=least_squares(residual,x,bounds=(np.array(lower)[active],np.array(upper)[active]),max_nfev=450,ftol=1e-10,xtol=1e-9,gtol=1e-10,x_scale='jac')
  trials.append(trial);print(panel,'population' if distributed else 'single','start',j+1,'RMS',round(float(np.sqrt(np.mean(trial.fun**2))),6),flush=True)
 best=min(trials,key=lambda x:float(x.fun@x.fun));records=residual(best.x,True)
 return {'panel':panel,'distributed':distributed,'sharedCore':True,'parameters':unpack(best.x).tolist(),'bounds':{'parameters':['meanCoreRadiusNm','coreNumberCV']+sum(([r['id']+' meanShellThicknessNm',r['id']+' shellNumberCV'] for r in rows),[]),'lower':lower,'upper':upper},'rms':float(np.sqrt(np.mean([r['rms']**2 for r in records]))),'testRms':float(np.sqrt(np.mean([r['testRms']**2 for r in records]))) if training is not None else None,'rows':records,'evaluations':sum(t.nfev for t in trials),'seconds':time.time()-start_time}

def main():
 report={'source':source['source'],'doi':source['doi'],'material':'au','opticalData':'Equal-weight Olmon single-crystal / McPeak complex-permittivity average','electronScattering':{'A':1,'length':'4V/S, both inner and outer metal-shell interfaces','appliedPerDistributionMember':True},'distribution':'Independent lognormal number distributions of core radius and shell thickness; one identical core population for every sample in each family','ncore':1.45,'nmedium':1.33,'normalization':'One positive amplitude per spectrum in the paper’s arbitrary image-height units. No baseline, wavelength shift, refractive-index fit or adjustable A. Residuals normalized by each experimental spectrum maximum.','families':{},'baselines':[]}
 for row in source['rows']:
  b=next(b for b in baselines if b['id']==row['id']);y=np.array(row['signal']);mask=np.ones(len(y),bool);rec={'id':row['id']}
  for key in ['legacyCext','modernAtLegacyGeometryCext']:
   z=np.array(b[key]);amp=amplitude(y,z,mask);rec[key]={'rms':float(np.sqrt(np.mean(((amp*z-y)/y.max())**2))),'amplitude':amp,'prediction':(amp*z).tolist()}
  report['baselines'].append(rec)
 for panel in ['a','b']:
  mono=joint(panel,False,starts=3);pop=joint(panel,True);held=joint(panel,True,np.arange(31)%2==0,starts=2)
  report['families'][panel]={'single':mono,'population':pop,'heldOut':held,'gridMetadata':json.loads((ROOT/f'tmp/oldenburg-grid-{panel}.json').read_text(encoding='utf8'))}
  (ROOT/'data/oldenburg-modern-grid-fit.json').write_text(json.dumps(report,indent=2),encoding='utf8')
  print('FAMILY',panel,'single',mono['rms'],'population',pop['rms'],'held-out',held['testRms'],'parameters',np.round(pop['parameters'],5).tolist(),flush=True)
 print('Saved shared-core modern gold fits; A=1 throughout.',flush=True)

if __name__=='__main__':main()
