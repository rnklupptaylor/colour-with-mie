from pathlib import Path
import subprocess,json,numpy as np
from scipy.optimize import minimize_scalar
p=subprocess.Popen(['node','tools/dotsenko-index-rpc.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
def f(mode,v):
 p.stdin.write(json.dumps({'mode':mode,'factor':v})+'\n');p.stdin.flush();r=np.array(json.loads(p.stdout.readline()));return np.mean(r*r)
try:
 result={}
 for mode,bounds in [('wavelength',(.95,1.12)),('size',(.95,1.12)),('index',(.97,1.10)),('medium',(1.2,1.7))]:
  xs=np.linspace(*bounds,81);vals=[f(mode,x) for x in xs];best=np.argmin(vals);lo=xs[max(0,best-1)];hi=xs[min(len(xs)-1,best+1)]
  r=minimize_scalar(lambda v:f(mode,v),bounds=(lo,hi),method='bounded',options={'xatol':1e-10})
  result[mode]={'factor':float(r.x),'rmse':float(r.fun**.5)}
 print(json.dumps(result,indent=2));Path('artifacts/dotsenko-systematic-factors.json').write_text(json.dumps(result,indent=2))
finally:p.terminate()
