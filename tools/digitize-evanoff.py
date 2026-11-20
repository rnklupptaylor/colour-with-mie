"""Trace Figure 2 from the native PDF image, using its printed axis ticks."""
from pathlib import Path
from PIL import Image,ImageDraw
import json,numpy as np
folder=Path(__file__).resolve().parents[1]
native=folder/'tmp/papers/evanoff-native-0.png'
if not native.exists():
    published=folder/'assets/evanoff-2.png'
    if published.exists() and Image.open(published).size==(4148,4486):
        native=published
    else:
        from pypdf import PdfReader
        native.parent.mkdir(parents=True,exist_ok=True)
        PdfReader(folder/'research/Evanoff_2004.pdf').pages[2].images[0].image.save(native)
im=Image.open(native).convert('L');a=np.array(im);qa=im.convert('RGB');draw=ImageDraw.Draw(qa)
table_d=[29,34,36,44,48,52,59,61,76,78,92,96,105,113,120,136]
figure_d=[29,34,37,44,48,52,58,61,75,78,92,97,105,113,120,136]
widths=[3,3,3,3,3,3,3,3,3,4,5,3,4,3,4,5]
peak_c=[3.13,3.77,5.53,8.47,17.23,17.43,22.54,30.94,34.91,37.71,49.36,53.66,59.62,66.38,77.24,95.43]
peak_error=[.46,.24,.60,.48,.37,.47,2.55,1.44,4.27,2.50,1.71,.57,5.80,.53,1.47,10.08]
xs=[145.5,1188.5,2220.5,3262.5];rights=[1023.5,2065.5,3098.5,4140.5]
tops=[[1,1,1,1],[1124,1126,1126,1124],[2247,2247,2247,2247],[3371,3369,3369,3369]]
zeros=[[1034,1033.5,1031,1033.5],[2151.5,2153.5,2158.5,2154.5],[3271.5,3273.5,3273.5,3274.5],[4402.5,4396.5,4400.5,4397.5]]
steps=[.03,.04,.06,.09,.17,.17,.23,.30,.35,.4,.5,.5,.6,.7,.8,1]
ticks=[[149.5,370.5,591.5,813.5],[61.5,305,548,790.5],[42,289.5,536.5,784.5],[55.5,300.5,544.5,788.5],[1255.5,1479.5,1703.5,1927.5],[1280,1498.5,1717.5,1935.5],[1218.5,1453.5,1688.5,1923.5],[1271.5,1491.5,1712.5,1933.5],[2374.5,2598.5,2823.5,3047.5],[2306.5,2548.5,2790.5,3032.5],[2353,2583,2813.5,3043.5],[2435.5,2645,2855,3064.5],[3485.5,3714.5,3943.5,4172.5],[3437.5,3677.5,3917.5,4157],[3457.5,3693,3929,4164],[3522.5,3740.5,3959.5,4178.5]]
out=[]
for i in range(16):
    row,col=divmod(i,4);x0,x1=xs[col],rights[col];top,y0=tops[row][col],zeros[row][col]
    values=np.array([4,3,2,1])*steps[i];tick=np.array(ticks[i]);sy=float(np.dot(values,y0-tick)/np.dot(values,values))
    pts=[];trace=[]
    for wl in range(380,722,2):
        x=round(x0+(wl-360)/400*(x1-x0));v=a[int(top+10):int(y0-12),x-1:x+2].min(axis=1);ys=np.flatnonzero(v<100)+int(top+10)
        # Letters and diameter annotations occupy the upper-right corner.
        # In P the 136 nm label touches the extinction stroke. A horizontal
        # label mask would remove extinction at 642–664 nm and select scattering.
        follow_p=i==15 and wl>=638
        if not follow_p and x>x0+.70*(x1-x0):ys=ys[ys>top+.28*(y0-top)]
        groups=[]
        for y in ys:
            if not groups or y>groups[-1][-1]+1:groups.append([int(y)])
            else:groups[-1].append(int(y))
        thick=[g for g in groups if len(g)>=4]
        if not thick:continue
        g=thick[0]
        if follow_p:
            predicted=trace[-1][0]+float(np.median(np.diff([p[0] for p in trace[-5:]])))
            distance=lambda band:max(band[0]-predicted,predicted-band[-1],0)
            g=min(thick,key=distance)
            if distance(g)>30:raise ValueError(f'P trace lost at {wl} nm')
            width=float(np.median([p[1] for p in trace[-5:]]))
            # The touching "1" extends upwards; the lower edge of the printed
            # extinction stroke remains visible. Recover its centre with the
            # local stroke width, rather than a simulated or interpolated curve.
            y=g[-1]-(width-1)/2 if len(g)>1.7*width else float(np.mean(g))
            measured_width=width if len(g)>1.7*width else len(g)
        else:y=float(np.mean(g));measured_width=len(g)
        trace.append((y,measured_width));pts.append([wl,(y0-y)/sy]);draw.ellipse((x-4,y-4,x+4,y+4),fill=(15,100,220))
    dipole=[p for p in pts if p[0]>=(480 if i>=12 else 380)];observed_peak=max(dipole,key=lambda p:p[1])
    out.append(dict(panel=i,letter=chr(65+i),figureDiameterNm=figure_d[i],tableDiameterNm=table_d[i],diameterSpreadNm=widths[i],peakCrossSectionNm2=peak_c[i]*1000,peakCrossSectionErrorNm2=peak_error[i]*1000,points=pts,calibration=dict(x0=x0,x1=x1,min=360,max=760,y0=y0,top=top,sy=sy,yTickValues=values.tolist(),yTickPixels=tick.tolist()),dipolePeakCheck=dict(wavelengthNm=observed_peak[0],digitizedOrdinate=observed_peak[1],tableOrdinate=peak_c[i]*.1/np.log(10))))
result=dict(source='Evanoff & Chumanov 2004, Figure 2 native PDF image (4148 × 4486) and Table 1',doi='10.1021/jp0475640',method='Thick extinction line centres. Wavelength axis is 360–760 nm, calibrated from the printed ticks. Ordinates use four printed major ticks per panel, with no model or peak registration. Annotation areas are masked. In P, stroke continuity follows extinction past the 136 nm label; where its 1 touches the curve, the visible lower stroke edge and neighbouring stroke width locate the centre. Table 1 dipole maxima provide an independent scale check, not a fitted vertical calibration. Quoted Table 1 diameter ± values are interpreted as number-distribution SDs; the full distribution shapes are not supplied in Table 1.',curves=out)
(folder/'data/evanoff-digitized.json').write_text(json.dumps(result,indent=2),encoding='utf8')
im.save(folder/'assets/evanoff-2.png',optimize=True)
qa.resize((1660,1794)).save(folder/'artifacts/evanoff-digitization.png')
qa.crop((3220,3330,4148,4486)).save(folder/'artifacts/evanoff-P-target-review.png')
print('Traced 16 native-image curves using printed 360–760 nm and ordinate axes; distribution widths copied from Table 1.')
