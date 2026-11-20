const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),dir=path.resolve(__dirname,'..');
require('../src/materials.js');require('../src/modern-optics.js');require('../src/surface.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<2e-11*Math.max(1,Math.abs(b)),`${a} ≈ ${b}`);
let checks=0;for(let nm=300;nm<=1700;nm+=7){const o=Materials.nk('auOlmon2012',nm),m=Materials.nk('auMcPeak2015',nm),c=Materials.nk('au',nm);near(c.n*c.n-c.k*c.k,(o.n*o.n-o.k*o.k+m.n*m.n-m.k*m.k)/2);near(2*c.n*c.k,o.n*o.k+m.n*m.k);assert.ok(c.inRange);checks++;}
const fixture=JSON.parse(fs.readFileSync(path.join(dir,'data/modern/reference-checks.json'),'utf8'));for(const row of fixture){const g=Materials.nk(row.id,row.nm);near(g.n,row.n);near(g.k,row.k);checks++;}
assert.equal(Materials.nk('au',299).inRange,false);assert.equal(Materials.nk('au',1701).inRange,false);assert.equal(Materials.nk('fe3o4Fontijn',1600).inRange,false);
assert.equal(Materials.provenance('fe3o4Fontijn').kind,'Figure-digitized measured diagonal dielectric function');
assert.equal(MieSurface.parameters('au').plasma,8.45);near(MieSurface.parameters('au').gamma,6.582119569e-16/(14e-15));assert.ok(MieSurface.supported('auOlmon2012'));assert.ok(MieSurface.supported('auBabar2015'));
const report={passed:true,checks,defaultGold:'au: Olmon/McPeak epsilon consensus',rangeNm:Materials.range('au'),independentReference:'NumPy interpolation in the published source coordinate conventions',fontijnRangeNm:Materials.range('fe3o4Fontijn')};fs.writeFileSync(path.join(dir,'artifacts/modern-optics-validation.json'),JSON.stringify(report,null,2));console.log('PASS native-table epsilon interpolation, consensus, independent reference, alternatives and supported ranges.');
