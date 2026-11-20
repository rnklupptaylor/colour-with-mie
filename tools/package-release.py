"""Create a deployment ZIP. No historical sources or machine paths are used."""
from pathlib import Path
import json,zipfile,hashlib
root=Path(__file__).resolve().parents[1]
version=json.loads((root/'package.json').read_text())['version']
label=version[:-4] if version.endswith('.0.0') else version.removesuffix('.0')
dest=root/'releases';dest.mkdir(exist_ok=True)
target=dest/f'cwm-v{label}.zip'
with zipfile.ZipFile(target,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=8) as z:z.write(root/'deploy/index.html','index.html')
with zipfile.ZipFile(target) as z:assert z.testzip() is None and z.namelist()==['index.html']
print(json.dumps({'file':str(target),'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest()}))
