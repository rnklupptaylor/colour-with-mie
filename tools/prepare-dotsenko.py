"""Extract calculated contours and embed the original, uncolourized scan crops.
Run calculate-dotsenko.cjs first if changing the optical inputs or grid.
"""
from pathlib import Path
import json,base64
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

root=Path(__file__).resolve().parents[1]
data=json.loads((root/'data/dotsenko-calculations.json').read_text())
grid=data['map']
registration=json.loads((root/'data/dotsenko-registration.json').read_text())
fig,ax=plt.subplots()
levels=[2,2.5,3,3.5,4,5,8]
colors=['#b72d44','#cb6017','#b08c00','#248e40','#008d94','#246cba','#9539a2']
contours=ax.contour(grid['x'],grid['y'],grid['z'],levels=levels)
grid['contours']=[dict(value=l,label=f'S_p = {l} um^-1',color=color,segments=[np.round(seg,5).tolist() for seg in segments if len(seg)>1]) for l,color,segments in zip(levels,colors,contours.allsegs)]
registered=ax.contour(grid['x'],grid['y'],np.array(grid['z'])*registration['mapOrdinateFactor'],levels=levels)
grid['registeredContours']=[dict(value=l,label=f'S_p = {l} um^-1',color=color,segments=[np.round(seg,5).tolist() for seg in segments if len(seg)>1]) for l,color,segments in zip(levels,colors,registered.allsegs)]
plt.close(fig)
z=np.array(grid['z']);grid['ridge']=[[r,grid['y'][np.argmax(z[:,i])]] for i,r in enumerate(grid['x'])]
catalog=[]
for n in [1,2,3]:
 e=dict(id=f'dotsenko-{n}',author='Dotsenko, Efremov & Sofronov',year=1986,title=['A white pigment with a silica heart','Large coated pigments: strength and direction','How much rutile is enough?'][n-1],figure=str(n),kind='book',dotsenko=True,page=916 if n<3 else 917,pageLabel='printed p.',calibration=dict(w0=350,w1=700),sources=[dict(label='Original paper (1985/86)',url='https://doi.org/10.1007/BF00660776')],method='Original figures with core-shell Mie calculations.')
 e['width'],e['height']=[(744,310),(736,278),(448,343)][n-1]
 e['image']='data:image/png;base64,'+base64.b64encode((root/f'assets/museum/dotsenko-fig{n}.png').read_bytes()).decode()
 if n<3:
  e['radius']=100 if n==1 else 500
  e['defaultResolved']=n==1
  e['cases']=[100,80,50,20,10,5] if n==1 else [500,300,100,50,20,10]
  e['panels']=[dict(x0=44.393,x1=348.886,y0=280.58,sy=43.8,tilt=-1.56,top=10,bottom=282),dict(x0=387,x1=691,y0=324.7,sy=218.5,tilt=-2.55,top=150,bottom=282)] if n==1 else [dict(x0=24,x1=330,y0=252,sy=44,tilt=-2.2,top=5,bottom=253),dict(x0=400,x1=705,y0=312,sy=222,tilt=-1.8,top=62,bottom=253)]
 else:
  e.update(dotsenkoMap=True,bookRange=[0,1500],bookStep=1,bookDefaultX=50,bookAxisLabel='Core radius R_core (nm)',cases=[75,50,25,100,125],continuousCase=[1,140],map=dict(origin=[59.1,308.5],r=[.223,-.003],h=[-.06,-2.077]))
 if n<3:e['sources'].append(dict(label='Rutile principal indices · DeVore 1951',url='https://doi.org/10.1364/JOSA.41.000416'))
 catalog.append(e)
weights=json.loads((root/'data/dotsenko-weights.json').read_text())
s=(root/'src/dotsenko-museum.template.js').read_text(encoding='utf8')
for token,obj in [('CATALOG',catalog),('DATA',data),('WEIGHTS',weights),('REGISTERED',{k:v for k,v in json.loads((root/'data/dotsenko-registered-calculations.json').read_text()).items() if k!='map'}),('REGISTRATION',json.loads((root/'data/dotsenko-registration.json').read_text()))]:s=s.replace('/*DOTSENKO_'+token+'*/[]' if token=='CATALOG' else '/*DOTSENKO_'+token+'*/{}',json.dumps(obj,ensure_ascii=False,separators=(',',':')))
(root/'src/dotsenko-museum.js').write_text(s,encoding='utf8')
print('Prepared three original figures, absolute Mie curves, and calculated contours.')
