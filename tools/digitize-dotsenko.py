"""Optional re-digitization from the author's colourized 2011 Figure 8.
python tools/digitize-dotsenko.py path/to/Figure8.png
This writes numerical targets only, never Museum artwork.
"""
from pathlib import Path
import sys,json
from PIL import Image
import numpy as np
from matplotlib.colors import rgb_to_hsv
root=Path(__file__).resolve().parents[1]
image=Image.open(sys.argv[1]).convert('RGB')
assert image.size==(2364,1338),'Check the calibration for this image resolution.'
im=np.asarray(image.crop((800,0,1570,750)))
colors={500:[255,0,0],300:[204,51,0],100:[204,102,0],50:[204,153,0],20:[204,204,0],10:[204,255,0]}
rows=[]
for h,rgb in colors.items():
 points=[]
 for w in range(350,701,25):
  x=round(57+(w-350)/350*672)
  mask=np.max(abs(im[:,x-2:x+3].astype(float)-rgb),axis=2)<10
  ys=np.where(mask.any(axis=1))[0];ys=ys[(ys>=200)&(ys<=665)]
  if len(ys):points.append([w,(668-8*(w-350)/350-float(np.median(ys)))/97.4])
 rows.append(dict(shellNm=h,points=points))
source='Dotsenko Fig. 2a, colourized tracing in Klupp Taylor et al. Advanced Materials 2011 Fig. 8a. Original monochrome artwork is used in Museum.'
data=dict(source=source,calibration=dict(x350=57,x700=729,y0at350=668,y0at700=660,pixelsPerQ=97.4),rows=rows)
(root/'data/dotsenko-fig2-digitized.json').write_text(json.dumps(data,indent=2))
hsv=rgb_to_hsv(np.asarray(image.crop((0,0,800,750)))/255)
colors={2:(0,4),2.5:(11,4),3:(26,6),3.5:(42,6),4:(60,4),5:(74,7),8:(120,8)}
points=[]
for level,(hue,tol) in colors.items():
 for r in range(100,1201,100):
  x=round(119+r*.397);a=hsv[:,x-1:x+2];dist=abs(a[:,:,0]*360-hue);dist=np.minimum(dist,360-dist)
  ys=np.where(((dist<tol)&(a[:,:,1]>.8)&(a[:,:,2]>.5)).any(axis=1))[0];ys=ys[(ys>=275)&(ys<=653)]
  groups=[]
  for y in ys:
   if not groups or y-groups[-1][-1]>5:groups.append([int(y)])
   else:groups[-1].append(int(y))
  for group in groups:
   if len(group)<(2 if level==8 else 3):continue
   h=(658-.003*r-float(np.median(group)))/3.64
   if h>=2:points.append(dict(coreNm=r,shellNm=h,Sp=level))
data=dict(source='Dotsenko Fig. 3, colourized tracing in Klupp Taylor et al. 2011 Fig. 8a. Contour positions only.',points=points)
(root/'data/dotsenko-fig3-digitized.json').write_text(json.dumps(data,indent=2))
print('Extracted the six Q curves and seven contour families as numerical targets.')
