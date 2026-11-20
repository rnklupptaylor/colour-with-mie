from pathlib import Path
import math,json,struct,base64
r=Path(__file__).resolve().parents[1]
thickness=1.47935;half=[8,22.5,thickness/2];corner=2.;bevel=.15;unit=45/3.34;radius=60
triangles=[];normals=[]
def bend(p,n):
 a=p[0]/radius;c=math.cos(a);s=math.sin(a);stretch=1+p[2]/radius
 v=[n[0]/stretch*c+n[2]*s,n[1],-n[0]/stretch*s+n[2]*c];length=math.sqrt(sum(x*x for x in v))
 return [(radius+p[2])*s/unit,(p[1]+22.5)/unit+.12,((radius+p[2])*c-radius)/unit],[x/length for x in v]
def outline(inset):
 out=[];centres=[(6,20.5),(-6,20.5),(-6,-20.5),(6,-20.5)]
 for k,(cx,cy) in enumerate(centres):
  start=k*math.pi/2
  for j in range(7):
   a=start+j*math.pi/12;n=[math.cos(a),math.sin(a)];out.append(([cx+(corner-inset)*n[0],cy+(corner-inset)*n[1]],n))
  a=start+math.pi/2;n=[math.cos(a),math.sin(a)];nx,ny=centres[(k+1)%4];divisions=6 if k%2==0 else 4
  for j in range(1,divisions):
   f=j/divisions;out.append(([(1-f)*cx+f*nx+(corner-inset)*n[0],(1-f)*cy+f*ny+(corner-inset)*n[1]],n))
 return out
def triangle(points):
 v=[p[0] for p in points];n=[p[1] for p in points];e=[v[1][k]-v[0][k] for k in range(3)];f=[v[2][k]-v[0][k] for k in range(3)];cross=[e[1]*f[2]-e[2]*f[1],e[2]*f[0]-e[0]*f[2],e[0]*f[1]-e[1]*f[0]]
 if sum(cross[k]*n[0][k] for k in range(3))<0:v[1],v[2]=v[2],v[1];n[1],n[2]=n[2],n[1]
 triangles.append(v);normals.append(n)
def connect(a,b):
 for i in range(len(a)):
  j=(i+1)%len(a);triangle([a[i],b[i],b[j]]);triangle([a[i],b[j],a[j]])
faces={}
for sign in [-1,1]:
 rings=[]
 for j in range(1,5):
  f=j/4;ring=[bend([xy[0]*f,xy[1]*f,sign*half[2]],[0,0,sign]) for xy,n in outline(bevel)];rings.append(ring)
 centre=bend([0,0,sign*half[2]],[0,0,sign])
 for i in range(len(rings[0])):triangle([centre,rings[0][i],rings[0][(i+1)%len(rings[0])]])
 for a,b in zip(rings,rings[1:]):connect(a,b)
 previous=rings[-1]
 for j in [1,2]:
  angle=j*math.pi/4;inset=bevel*(1-math.sin(angle));z=sign*(half[2]-bevel*(1-math.cos(angle)))
  ring=[bend([xy[0],xy[1],z],[n[0]*math.sin(angle),n[1]*math.sin(angle),sign*math.cos(angle)]) for xy,n in outline(inset)];connect(previous,ring);previous=ring
 faces[sign]=previous
connect(faces[-1],faces[1])
nodes=[];order=[]
def build(ids):
 at=len(nodes);nodes.append(None);low=[min(v[k] for id in ids for v in triangles[id])-1e-5 for k in range(3)];high=[max(v[k] for id in ids for v in triangles[id])+1e-5 for k in range(3)]
 if len(ids)<=6:
  first=len(order);order.extend(ids);nodes[at]=low+[first]+high+[-len(ids)]
 else:
  axis=max(range(3),key=lambda k:high[k]-low[k]);ids.sort(key=lambda id:sum(v[axis] for v in triangles[id]));mid=len(ids)//2;build(ids[:mid]);build(ids[mid:]);nodes[at]=low+[-1]+high+[len(nodes)]
build(list(range(len(triangles))))
data=[]
for id in order:
 for v in triangles[id]:data+=v+[0]
 for n in normals[id]:data+=n+[0]
meta={'source':'Procedural rounded, curved solid slab','outsideDimensionsMm':[16,45,thickness],'nominalThicknessMm':thickness,'thicknessReference':'Central Humpen.stl barrel wall at original height 44.5 mm, x = -75 mm. Ray intersection difference = 1.47935 mm. The mug wall varies elsewhere.','bendRadiusMm':radius,'cornerRadiusMm':corner,'edgeRadiusMm':bevel,'triangles':len(triangles),'bvhNodes':len(nodes),'millimetresPerWorldUnit':unit,'closed':True,'surfaceAssumption':'Smooth homogeneous solid, no liquid cavity'}
packed=lambda values:base64.b64encode(struct.pack('<'+str(len(values))+'f',*values)).decode('ascii')
js="(function(root){const f=s=>new Float32Array(Uint8Array.from(atob(s),c=>c.charCodeAt(0)).buffer);root.MieMonolithMesh={triangles:f("+json.dumps(packed(data))+"),nodes:f("+json.dumps(packed([x for node in nodes for x in node]))+"),metadata:"+json.dumps(meta,separators=(',',':'))+"};})(globalThis);\n"
(r/'src/monolith-data.js').write_text(js,encoding='utf8',newline='\n')
(r/'data/monolith-mesh.json').write_text(json.dumps(meta,indent=2),encoding='utf8')
print(json.dumps(meta))
