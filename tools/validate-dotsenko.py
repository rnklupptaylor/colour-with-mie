"""Independent direct Bessel / boundary-matrix check of the app's Mie recurrence."""
from pathlib import Path
import subprocess,json
import numpy as np
from scipy.special import spherical_jn as j,spherical_yn as y
from numpy.polynomial.legendre import leggauss

root=Path(__file__).resolve().parents[1]
script="""
require('./src/kernel/physics.js');require('./src/kernel/interior.js');
const rows=[[0,100,450],[20,80,550],[50,50,400],[400,100,550],[490,10,350],[50,75,550]];
console.log(JSON.stringify(rows.map(([r,h,w])=>{const k=2*Math.PI*1.5/w,c=Mie.coreShell(k*r,k*(r+h),[1.48/1.5,0],[(2.48+.08/(w/1000)**2)/1.5,1e-4/1.5]);return {r,h,w,N:c.N,a:c.a,b:c.b,q:c.Qsca,g:c.g,ext:c.Qext};})));
"""
rows=json.loads(subprocess.check_output(['node','-e',script],cwd=root,text=True))
def psi(n,z):return z*j(n,z)
def dp(n,z):return j(n,z)+z*j(n,z,True)
def chi(n,z):return z*y(n,z)
def dc(n,z):return y(n,z)+z*y(n,z,True)
results=[]
for row in rows:
 r,h,w,N=[row[k] for k in ['r','h','w','N']]
 k=2*np.pi*1.5/w;x=k*(r+h);xc=k*r;m1=1.48/1.5;m2=(2.48+.08/(w/1000)**2+1e-4j)/1.5
 a=[];b=[]
 for n in range(1,N+1):
  p=psi(n,x);pd=dp(n,x);xi=p+1j*chi(n,x);xd=pd+1j*dc(n,x)
  if r==0:
   a.append((m2*psi(n,m2*x)*pd-p*dp(n,m2*x))/(m2*psi(n,m2*x)*xd-xi*dp(n,m2*x)))
   b.append((psi(n,m2*x)*pd-m2*p*dp(n,m2*x))/(psi(n,m2*x)*xd-m2*xi*dp(n,m2*x)))
  else:
   u=m1*xc;v=m2*xc;z=m2*x
   # TM electric: R and R'/m continuous. TE magnetic: R/m and R' continuous.
   tm=np.array([[psi(n,u),-psi(n,v),-chi(n,v),0],[dp(n,u)/m1,-dp(n,v)/m2,-dc(n,v)/m2,0],[0,psi(n,z),chi(n,z),xi],[0,dp(n,z)/m2,dc(n,z)/m2,xd]],complex)
   te=np.array([[psi(n,u)/m1,-psi(n,v)/m2,-chi(n,v)/m2,0],[dp(n,u),-dp(n,v),-dc(n,v),0],[0,psi(n,z)/m2,chi(n,z)/m2,xi],[0,dp(n,z),dc(n,z),xd]],complex)
   a.append(np.linalg.solve(tm,[0,0,p,pd])[-1]);b.append(np.linalg.solve(te,[0,0,p,pd])[-1])
 a=np.array(a);b=np.array(b);n=np.arange(1,N+1)
 q=2/x**2*np.sum((2*n+1)*(abs(a)**2+abs(b)**2))
 # Integrate the angular distribution independently to check its first moment.
 mu,weight=leggauss(max(128,4*N));p0=np.zeros_like(mu);p1=np.ones_like(mu);s1=0j*mu;s2=0j*mu
 for order,an,bn in zip(n,a,b):
  tau=order*mu*p1-(order+1)*p0;f=(2*order+1)/(order*(order+1))
  s1+=f*(an*p1+bn*tau);s2+=f*(an*tau+bn*p1)
  p0,p1=p1,((2*order+1)*mu*p1-(order+1)*p0)/order
 intensity=abs(s1)**2+abs(s2)**2;g=np.sum(weight*mu*intensity)/np.sum(weight*intensity)
 an=np.array(row['a'][1:]);bn=np.array(row['b'][1:]);native_a=an[:,0]+1j*an[:,1];native_b=bn[:,0]+1j*bn[:,1]
 error=max(np.max(abs(a-native_a)),np.max(abs(b-native_b)))
 assert error<2e-9,(r,h,w,error)
 assert abs(q-row['q'])<2e-8 and abs(g-row['g'])<2e-9
 assert row['ext']>=row['q']-1e-10
 results.append(dict(coreNm=r,shellNm=h,wavelengthNm=w,Qsca=float(q),g=float(g),maximumCoefficientError=float(error)))
out=root/'artifacts/dotsenko-independent-validation.json';out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(dict(passed=True,method='SciPy direct spherical Bessel functions, four-interface boundary matrix, independent angular quadrature',cases=results),indent=2))
print('PASS independent Mie coefficients, scattering efficiencies and angular first moments for six pigment geometries.')
