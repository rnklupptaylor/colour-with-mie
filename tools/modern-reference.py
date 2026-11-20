"""Independent numerical check of the published optical-data interpolation conventions."""
from pathlib import Path
import json,re
import numpy as np
folder=Path(__file__).resolve().parents[1]
rows={}
for key,name in [('olmon','Au_Olmon_sc_2012.yml'),('mcpeak','Au_McPeak_2015.yml')]:
    data=[]
    for line in (folder/'data/modern'/name).read_text().splitlines():
        try: values=list(map(float,line.split()))
        except ValueError: continue
        if len(values)==3:data.append(values)
    a=np.array(data);rows[key]=(a[:,0],(a[:,1]+1j*a[:,2])**2)
f=np.genfromtxt(folder/'data/modern/Fe3O4_Fontijn_1997_digitized.csv',delimiter=',',names=True)
out=[]
for nm in [300,333,400,477,550,632.8,780,1000,1500,1700]:
    values={key:np.interp(nm/1000,x,e.real)+1j*np.interp(nm/1000,x,e.imag) for key,(x,e) in rows.items()}
    for key,id in [('olmon','auOlmon2012'),('mcpeak','auMcPeak2015'),('consensus','au')]:
        e=values[key] if key!='consensus' else (values['olmon']+values['mcpeak'])/2
        g=np.sqrt(e);out.append(dict(id=id,nm=nm,n=float(g.real),k=float(g.imag)))
    if nm<=1500:
        energy=1239.8419843320026/nm
        e=np.interp(energy,f['photon_energy_ev'],f['epsilon_real'])+1j*np.interp(energy,f['photon_energy_ev'],f['epsilon_imag'])
        g=np.sqrt(e);out.append(dict(id='fe3o4Fontijn',nm=nm,n=float(g.real),k=float(g.imag)))
(folder/'data/modern/reference-checks.json').write_text(json.dumps(out,indent=2))
print('Wrote independent complex-permittivity reference checks.')
