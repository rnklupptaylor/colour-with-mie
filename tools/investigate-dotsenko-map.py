from pathlib import Path
import json,numpy as np
from scipy.interpolate import RegularGridInterpolator
from scipy.optimize import differential_evolution,least_squares
points=json.loads(Path('data/dotsenko-fig3-digitized.json').read_text())['points']
r=np.array([p['coreNm'] for p in points]);h=np.array([p['shellNm'] for p in points]);v=np.array([p['Sp'] for p in points]);weight=np.array([1/np.sqrt(sum(v==p['Sp'])) for p in points]);results={}
for source in ['dotsenko-calculations','dotsenko-registered-calculations']:
 d=json.loads((Path('data')/(source+'.json')).read_text())['map'];interp=RegularGridInterpolator((d['y'],d['x']),d['z'],bounds_error=False,fill_value=None)
 def residual(p,mode):
  if mode=='strength':amp=p[0];xs=ys=1
  if mode=='shell':amp=1;xs=1;ys=p[0]
  if mode=='geometry':amp=1;xs=ys=p[0]
  if mode=='shell-strength':xs=1;ys,amp=p
  if mode=='geometry-strength':xs=ys=p[0];amp=p[1]
  z=amp*interp(np.array([h/ys,r/xs]).T);return weight*(z-v)/v
 rows={}
 for mode,bounds in [('strength',[(.7,1.3)]),('shell',[(.85,1.4)]),('geometry',[(.85,1.4)]),('shell-strength',[(.85,1.4),(.7,1.3)]),('geometry-strength',[(.85,1.4),(.7,1.3)])]:
  f=lambda p:np.sum(residual(p,mode)**2)
  result=differential_evolution(f,bounds,seed=12,tol=1e-9,popsize=10,maxiter=80)
  rows[mode]={'parameters':result.x.tolist(),'relativeRms':float(np.sqrt(result.fun/7))}
 rows['rawRelativeRms']=float(np.sqrt(np.sum(residual([1],'strength')**2)/7));results[source]=rows
Path('artifacts/dotsenko-map-registration.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
