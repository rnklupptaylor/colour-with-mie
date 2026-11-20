"""Regenerate the embedded visible observer tables from the unchanged local CIE data."""
from pathlib import Path
import csv, hashlib, json, math
root=Path(__file__).resolve().parents[1]
tables={}
for key,name,checksum in [
 ('1931-2','CIE_xyz_1931_2deg.csv','17cca777db64b17170f06f67ce9d3ab7'),
 ('1964-10','CIE_xyz_1964_10deg.csv','6140e032f9326d88c5a0959b29b4d8f3')]:
 source=root/'data/colorimetry'/name
 assert hashlib.md5(source.read_bytes()).hexdigest()==checksum, 'CIE source checksum changed'
 rows=[]
 for row in csv.reader(source.open()):
  if len(row)<4 or not 380<=float(row[0])<=780:
   continue
  # The official 1964 z-bar support ends at 559 nm. Extrapolation is zero.
  rows.append([float(x) if math.isfinite(float(x)) else 0 for x in row])
 assert len(rows)==401
 tables[key]={'start':380,**{k:[row[i+1] for row in rows] for i,k in enumerate(['x','y','z'])},'source':'https://files.cie.co.at/Publications-datasets/'+name,'md5':checksum}
text='/* CIE official standard observer tables. CC BY-SA 4.0. See data/colorimetry. */\nglobalThis.MieFilmObservers='+json.dumps(tables,separators=(',',':'))+';\n'
(root/'src/film-observers.js').write_text(text,encoding='utf8',newline='\n')
print('Embedded CIE 1931 2-degree and 1964 10-degree observers, 380-780 nm.')
