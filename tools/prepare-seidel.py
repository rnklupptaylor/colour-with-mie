"""Embed the supplied STL, with a threaded BVH and crease-aware normals."""
from pathlib import Path
import struct,hashlib,json,base64
import numpy as np
folder=Path(__file__).resolve().parents[1]
raw=(folder/'assets/Humpen.stl').read_bytes();count=struct.unpack_from('<I',raw,80)[0]
assert len(raw)==84+50*count
records=np.frombuffer(raw,dtype=np.dtype([('normal','<f4',(3,)),('v','<f4',(3,3)),('attr','<u2')]),offset=84,count=count)
mm=records['v'].astype(float)
# Opposite, coincident sliver pairs are zero-volume Boolean-export residue.
_,face_inverse,face_counts=np.unique(np.sort(mm,axis=1).reshape(count,9),axis=0,return_inverse=True,return_counts=True)
# Canonicalize by vertex IDs, rather than sorting coordinate columns.
_,vertex_inverse=np.unique(mm.reshape(-1,3),axis=0,return_inverse=True)
_,face_inverse,face_counts=np.unique(np.sort(vertex_inverse.reshape(-1,3),axis=1),axis=0,return_inverse=True,return_counts=True)
keep=face_counts[face_inverse]==1;removed=int(np.count_nonzero(~keep));mm=mm[keep];input_count=count;count=len(mm)
# Proper rotation, not a reflection. Preserve outward triangle winding.
world=np.stack((-(mm[:,:,0]+75),mm[:,:,2],mm[:,:,1]+75),axis=-1)
unit=89/3.34;world/=unit;world[:,:,1]+=.12
vertices,inverse=np.unique(world.reshape(-1,3),axis=0,return_inverse=True);faces=inverse.reshape(-1,3)
edges=np.sort(np.concatenate((faces[:,[0,1]],faces[:,[1,2]],faces[:,[2,0]])),axis=1)
unique_edges,edge_counts=np.unique(edges,axis=0,return_counts=True)
assert np.all(edge_counts%2==0),'Mesh has an open boundary'
nonmanifold=int(np.count_nonzero(edge_counts!=2))
signed_volume=np.einsum('ij,ij->i',world[:,0],np.cross(world[:,1],world[:,2])).sum()/6
assert signed_volume>0
face_vectors=np.cross(world[:,1]-world[:,0],world[:,2]-world[:,0]);areas=np.linalg.norm(face_vectors,axis=1);assert np.all(areas>1e-12)
face_normals=face_vectors/areas[:,None]
adj=[[] for _ in vertices]
for i,f in enumerate(faces):
 for v in f:adj[v].append(i)
normals=np.empty((count,3,3))
for i,f in enumerate(faces):
 for j,v in enumerate(f):
  near=np.array(adj[v]);near=near[face_normals[near]@face_normals[i]>=np.cos(np.deg2rad(35))]
  n=face_vectors[near].sum(axis=0);normals[i,j]=n/np.linalg.norm(n)
centres=world.mean(axis=1);lo=world.min(axis=1);hi=world.max(axis=1);nodes=[];order=[]
def build(ids):
 index=len(nodes);nodes.append(None);low=lo[ids].min(axis=0)-1e-5;high=hi[ids].max(axis=0)+1e-5
 if len(ids)<=6:
  first=len(order);order.extend(ids.tolist());nodes[index]=[low.tolist()+[first],high.tolist()+[-len(ids)]]
 else:
  axis=np.argmax(np.ptp(centres[ids],axis=0));ids=ids[np.argsort(centres[ids,axis],kind='stable')];mid=len(ids)//2
  build(ids[:mid]);build(ids[mid:]);nodes[index]=[low.tolist()+[-1],high.tolist()+[len(nodes)]]
 return index
build(np.arange(count));order=np.asarray(order)
low=vertices.min(axis=0);extent=np.ptp(vertices,axis=0);quant=vertices.astype('<f4')
decoded=quant.astype(float)
error_mm=float(np.abs(decoded-vertices).max()*unit)
# Bounding boxes were padded by more than the quantization error in world units.
assert error_mm<.002
b64=lambda a:base64.b64encode(np.ascontiguousarray(a).tobytes()).decode('ascii')
info={'source':'Humpen.stl','sourceSha256':hashlib.sha256(raw).hexdigest(),'inputTriangles':input_count,'oppositeDuplicateFacetsRemoved':removed,'nonManifoldEdgesAfterCancellation':nonmanifold,'triangles':count,'vertices':len(vertices),'bvhNodes':len(nodes),'closed':True,'boundaryEdges':0,'eulerCharacteristic':int(len(vertices)-len(unique_edges)+count),'inputUnitAssumption':'millimetres','outsideDimensionsMm':[65,50,89],'solidVolumeCm3':float(signed_volume*unit**3/1000),'millimetresPerWorldUnit':unit,'float32MaximumCoordinateErrorMm':error_mm,'normalCreaseAngleDegrees':35,'surfaceAssumption':'Optically smoothed triangle normals, ideal homogeneous matrix. Printed layer grooves, voids and yellowing are not inferred from the STL.'}
payload={'low':low.tolist(),'extent':extent.tolist(),'positions':b64(quant),'indices':b64(faces[order].astype('<u2')),'normals':b64(np.rint(normals[order]*32767).astype('<i2')),'bvh':b64(np.array(nodes,dtype='<f4')),'metadata':info}
(folder/'data/seidel-mesh.json').write_text(json.dumps(info,indent=2))
js="""(function(root){
 'use strict';const p=PAYLOAD;
 const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const q=new Float32Array(bytes(p.positions).buffer),indices=new Uint16Array(bytes(p.indices).buffer),normal=new Int16Array(bytes(p.normals).buffer),vertices=new Float32Array(q.length);
 for(let i=0;i<q.length;i++)vertices[i]=q[i];
 const triangles=new Float32Array(p.metadata.triangles*24);
 for(let f=0;f<p.metadata.triangles;f++)for(let j=0;j<3;j++)for(let k=0;k<3;k++){triangles[f*24+j*4+k]=vertices[indices[f*3+j]*3+k];triangles[f*24+12+j*4+k]=normal[f*9+j*3+k]/32767;}
 root.MieSeidelMesh={triangles,nodes:new Float32Array(bytes(p.bvh).buffer),metadata:p.metadata,bounds:{low:p.low,high:p.low.map((v,i)=>v+p.extent[i])}};
})(globalThis);
""".replace('PAYLOAD',json.dumps(payload,separators=(',',':')))
(folder/'src/seidel-data.js').write_text(js,encoding='utf8')
print(json.dumps(info))
