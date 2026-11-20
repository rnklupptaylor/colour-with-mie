from pathlib import Path
import subprocess,json,numpy as np
from scipy.optimize import differential_evolution,least_squares
p=subprocess.Popen(['node','tools/dotsenko-index-rpc.cjs'],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True,bufsize=1)
def residual(v):
 p.stdin.write(json.dumps(list(v))+'\n');p.stdin.flush();return np.array(json.loads(p.stdout.readline()))
def f(v):return np.mean(residual(v)**2)
try:
 base=f([2.48,.08]);print('Paper formula RMS',base**.5,flush=True)
 for v in [[2.5,.08],[2.55,.08],[2.58,.08],[2.6,.08],[2.48,.09],[2.48,.10]]:print(v,f(v)**.5,flush=True)
 r=differential_evolution(f,[(2.3,2.85),(.03,.13)],seed=391,maxiter=80,popsize=12,tol=1e-7,polish=True)
 fit=least_squares(residual,r.x,bounds=([2.3,.03],[2.85,.13]),xtol=1e-12,ftol=1e-12,gtol=1e-12)
 out={'fitTo':'All six Figure 2a Q curves, 25 nm grid. No size, amplitude, offset or wavelength fit.','paper':{'n0':2.48,'B':.08,'rmse':base**.5},'diagnostic':{'n0':float(fit.x[0]),'B':float(fit.x[1]),'rmse':float(np.mean(fit.fun**2)**.5)},'notAMeasuredDataset':True}
 Path('artifacts/dotsenko-index-investigation.json').write_text(json.dumps(out,indent=2));print(out)
finally:p.terminate()
