from pathlib import Path
import json,numpy as np,matplotlib
matplotlib.use('Agg')
import contourpy
from scipy.spatial import cKDTree
from scipy.optimize import differential_evolution
rows=json.loads(Path('data/dotsenko-fig3-digitized.json').read_text())['points'];levels=[2,2.5,3,3.5,4,5,8];A=np.array([[.226,-.06],[-.002,-2.08]])
target={v:np.array([[p['coreNm'],p['shellNm']] for p in rows if p['Sp']==v]) for v in levels}
result={}
for name in ['dotsenko-calculations','dotsenko-registered-calculations']:
 d=json.loads((Path('data')/(name+'.json')).read_text())['map'];generator=contourpy.contour_generator(x=d['x'],y=d['y'],z=d['z'])
 def loss(params):
  sx,sy,amp=params;values=[]
  for v in levels:
   segpoints=[]
   for seg in generator.lines(v/amp):
    if len(seg)<2:continue
    for a,b in zip(seg[:-1],seg[1:]):
     n=max(2,int(np.linalg.norm(A@((b-a)*[sx,sy]))/.65)+1);segpoints.extend(a+(b-a)*t for t in np.linspace(0,1,n))
   if not segpoints:return 1e10
   tree=cKDTree((np.array(segpoints)*[sx,sy])@A.T);dist=tree.query(target[v]@A.T)[0];values.append(np.mean(dist**2))
  return np.mean(values)
 fit=differential_evolution(loss,[(.7,1.5),(.8,1.4),(.75,1.4)],seed=31,tol=1e-5,popsize=8,maxiter=60,polish=True)
 result[name]={'parameters':fit.x.tolist(),'rmsPixels':float(fit.fun**.5)};print(name,result[name],flush=True)
Path('artifacts/dotsenko-map-three-factor-registration.json').write_text(json.dumps(result,indent=2))
