"""Optional artwork regeneration: python tools/extract-dotsenko-originals.py paper.pdf.
Normal builds use the included PNGs and do not need the external paper.
"""
from pathlib import Path
from io import BytesIO
import sys,json,hashlib
from PIL import Image
from pypdf import PdfReader
root=Path(__file__).resolve().parents[1]
source=Path(sys.argv[1])
meta=json.loads((root/'data/dotsenko-provenance.json').read_text(encoding='utf8'))
assert hashlib.sha256(source.read_bytes()).hexdigest()==meta['sourceSha256'],'Different PDF. Recheck crops before using it.'
reader=PdfReader(source)
for row in meta['crops']:
 image=Image.open(BytesIO(reader.pages[row['pdfPage']-1].images[0].data))
 dest=root/row['asset'];image.crop(row['nativeCropBox']).save(dest,optimize=True)
 assert hashlib.sha256(dest.read_bytes()).hexdigest()==row['sha256']
print('Restored the exact original, uncolourized artwork.')
