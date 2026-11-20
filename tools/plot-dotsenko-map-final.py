from pathlib import Path
import json,numpy as np,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from PIL import Image
im=Image.open('assets/museum/dotsenko-fig3.png');d=json.loads(Path('data/dotsenko-calculations.json').read_text())['map'];x=np.array(d['x']);y=np.array(d['y']);z=np.array(d['z']);f=json.loads(Path('artifacts/dotsenko-map-three-factor-registration.json').read_text())['dotsenko-calculations'];sx,sy,amp=f['parameters']
fig,axs=plt.subplots(1,2,figsize=(12,5),dpi=150)
for ax,(title,scalex,scaley,a) in zip(axs,[('Previous one-factor registration',1,1.09165,1),('Shared three-factor registration',sx,sy,amp)]):
 R,H=np.meshgrid(x*scalex,y*scaley);X=59+.223*R-.06*H;Y=308-.003*R-2.077*H
 ax.imshow(im,extent=(0,448,343,0));ax.contour(X,Y,z*a,levels=[2,2.5,3,3.5,4,5,8],colors=['#c82b49','#d16520','#b98f00','#218b42','#008a99','#2369bb','#9b36a0'],linewidths=.9);ax.set_xlim(0,448);ax.set_ylim(343,0);ax.set_title(title);ax.axis('off')
fig.tight_layout();fig.savefig('artifacts/dotsenko-map-final-comparison.png')
