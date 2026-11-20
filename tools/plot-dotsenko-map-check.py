from pathlib import Path
import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image
from scipy.interpolate import RectBivariateSpline
im=Image.open('assets/museum/dotsenko-fig3.png')
variants=[('Current H-only','dotsenko-calculations',1,1.09165,False),('Fine, two axis factors','dotsenko-calculations',1.16918,1.07469,False),('Registered index, paper grid','dotsenko-registered-paper-grid',.81777,1.24964,False),('Paper grid, R steps 50 nm','dotsenko-registered-paper-grid',.81777,1.24964,True)]
fig,axs=plt.subplots(2,2,figsize=(12,10),dpi=150)
for ax,(title,name,sx,sy,coarse) in zip(axs.flat,variants):
 d=json.loads((Path('data')/(name+'.json')).read_text())['map'];x=np.array(d['x']);y=np.array(d['y']);z=np.array(d['z'])
 if coarse:
  z=z[:,::5];x=x[::5];spline=RectBivariateSpline(y,x,z,kx=3,ky=3);x=np.arange(0,1501,5);y=np.arange(1,141,.5);z=spline(y,x)
 R,H=np.meshgrid(x*sx,y*sy);X=59+.226*R-.06*H;Y=309-.002*R-2.08*H
 ax.imshow(im,extent=(0,448,343,0));ax.contour(X,Y,z,levels=[2,2.5,3,3.5,4,5,8],colors=['#c82b49','#d16520','#b98f00','#218b42','#008a99','#2369bb','#9b36a0'],linewidths=.8)
 ax.set_xlim(0,448);ax.set_ylim(343,0);ax.set_title(title);ax.axis('off')
fig.tight_layout();fig.savefig('artifacts/dotsenko-map-comparison.png')
