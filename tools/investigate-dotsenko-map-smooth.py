from pathlib import Path
import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.spatial import cKDTree
from scipy.optimize import differential_evolution
rows=json.loads(Path('data/dotsenko-fig3-digitized.json').read_text())['points'];levels=[2,2.5,3,3.5,4,5,8];A=np.array([[.226,-.06],[-.002,-2.08]])
d=json.loads(Path('data/dotsenko-calculations.json').read_text())['map'];fig,ax=plt.subplots();cc=ax.contour(d['x'],d['y'],d['z'],levels=levels);segments={}
for v,segs in zip(levels,cc.allsegs):
 points=[]
 for seg in segs:
  if len(seg)<2:continue
  for a,b in zip(seg[:-1],seg[1:]):
   n=max(2,int(np.linalg.norm(A@(b-a))/.35)+1);points.extend(a+(b-a)*t for t in np.linspace(0,1,n))
 segments[v]=np.array(points)
plt.close(fig)
target={v:np.array([[p['coreNm'],p['shellNm']] for p in rows if p['Sp']==v]) for v in levels}
def loss(p,selected=levels):
 a,b,c,w=p;values=[]
 for v in selected:
  points=segments[v].copy();points[:,1]*=a+b*np.exp(-((points[:,0]-c)/w)**2)
  dist=cKDTree(points@A.T).query(target[v]@A.T)[0];values.append(np.mean(dist**2))
 return np.mean(values)
bounds=[(.85,1.3),(0,.45),(650,1250),(150,600)]
fit=differential_evolution(lambda p:loss(p,[2,3,4,5]),bounds,seed=27,tol=1e-7,popsize=12,maxiter=100)
trained={'parameters':fit.x.tolist(),'trainingRmsPixels':float(fit.fun**.5),'withheldRmsPixels':float(loss(fit.x,[2.5,3.5,8])**.5),'allRmsPixels':float(loss(fit.x)**.5)}
fitall=differential_evolution(loss,bounds,seed=29,tol=1e-7,popsize=12,maxiter=100)
result={'model':'H_plot = H_app * (a + b exp(-((R_core-c)/w)^2))','trainingLevels':[2,3,4,5],'withheldLevels':[2.5,3.5,8],'withheldCheck':trained,'allLevels':{'parameters':fitall.x.tolist(),'rmsPixels':float(fitall.fun**.5)}}
Path('artifacts/dotsenko-map-smooth-registration.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
