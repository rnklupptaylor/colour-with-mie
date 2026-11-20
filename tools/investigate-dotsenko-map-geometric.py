from pathlib import Path
import json,numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.spatial import cKDTree
from scipy.optimize import differential_evolution
points=json.loads(Path('data/dotsenko-fig3-digitized.json').read_text())['points'];levels=[2,2.5,3,3.5,4,5,8]
A=np.array([[.226,-.06],[-.002,-2.08]])
target={v:np.array([[p['coreNm'],p['shellNm']] for p in points if p['Sp']==v]) for v in levels}
output={}
for name in ['dotsenko-calculations','dotsenko-registered-calculations','dotsenko-paper-grid','dotsenko-registered-paper-grid']:
 d=json.loads((Path('data')/(name+'.json')).read_text())['map'];fig,ax=plt.subplots();cc=ax.contour(d['x'],d['y'],d['z'],levels=levels);segments={}
 for v,segs in zip(levels,cc.allsegs):
  segpoints=[]
  for seg in segs:
   if len(seg)<2:continue
   for a,b in zip(seg[:-1],seg[1:]):
    n=max(2,int(np.linalg.norm(A@(b-a))/.35)+1);segpoints.extend(a+(b-a)*t for t in np.linspace(0,1,n))
  segments[v]=np.array(segpoints)
 plt.close(fig)
 def loss(params,mode):
  sx,sy=(1,params[0]) if mode=='shell' else params
  values=[]
  for v in levels:
   if not len(target[v]):continue
   tree=cKDTree((segments[v]*[sx,sy])@A.T);dist=tree.query(target[v]@A.T)[0];values.append(np.mean(dist**2))
  return np.mean(values)
 result={}
 for mode,bounds in [('shell',[(.8,1.4)]),('axes',[(.6,1.5),(.8,1.4)])]:
  fit=differential_evolution(lambda p:loss(p,mode),bounds,seed=15,tol=1e-7,popsize=10,maxiter=70)
  result[mode]={'parameters':fit.x.tolist(),'rmsPixels':float(fit.fun**.5)}
 result['unregisteredRmsPixels']=float(loss([1],'shell')**.5);output[name]=result
 print(name,result,flush=True)
Path('artifacts/dotsenko-map-geometric-registration.json').write_text(json.dumps(output,indent=2))
