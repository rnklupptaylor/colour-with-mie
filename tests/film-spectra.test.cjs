const assert=require('node:assert/strict'),fs=require('fs'),crypto=require('crypto');
for(const n of ['kernel/physics','kernel/interior','kernel/tmatrix','kernel/cie2006','kernel/illuminants-data','kernel/illuminants','materials','modern-optics','surface','population','solid-matrix','paint-science','optics','film-observers','film-science'])require('../src/'+n+'.js');
const F=MieFilmScience,P=MiePaint,W=Array.from({length:41},(_,i)=>380+10*i),near=(a,b,t=1e-9)=>assert(Math.abs(a-b)<t,`${a} != ${b}`);
for(const [name,md5] of [['CIE_xyz_1931_2deg.csv','17cca777db64b17170f06f67ce9d3ab7'],['CIE_xyz_1964_10deg.csv','6140e032f9326d88c5a0959b29b4d8f3']])assert.equal(crypto.createHash('md5').update(fs.readFileSync(require('path').join(__dirname,'../data/colorimetry',name))).digest('hex'),md5);
for(const observer of ['1931-2','1964-10','2006-10'])for(const source of ['D65','D50','A','bleyer']){
 const c=F.colour(W,W.map(()=>1),source,observer);near(c.XYZ[1],100);near(c.Lab[0],100);near(c.Lab[1],0);near(c.Lab[2],0);
 const black=F.colour(W,W.map(()=>0),source,observer);for(const x of [...black.XYZ,...black.Lab,...black.Luv])near(x,0);assert.equal(black.LCh[2],null);
 const neutral=F.colour(W,W.map(()=>.18),source,observer);near(neutral.Lab[0],49.496107610119594);near(neutral.LCh[1],0);
}
for(const S of [.01,1,100]){const a=F.kmLayer(0,S,50);near(a.R+a.T,1);near(a.R,50*S/(1+50*S));}near(F.kmLayer(.3,0,10).T,Math.exp(-3));
const sca=.3,abs=.1,g=.7,z=8/3*abs/(sca*(1-g)),r=1/(1+z+Math.sqrt(z*z+2*z));near(F.km(sca,abs,g,1e6,1,0),r,1e-12);
const p={struct:'homog',mat:'au',rad:35,med:'custom',cmed:1.49,popOn:false,surfaceOn:false,_paint:true},config={loading:.001,white:.02,thickness:50};
(async()=>{
 const d=await MieLightboxOptics.calculate(p);
 for(const band of [0,13,25,40]){
  const old=P.bandResponse(d,band,config,24),now=F.band(d,band,config,{detail:24});near(old.black,now.black,1e-11);near(old.white,now.white,1e-11);
  const sce=F.band(d,band,config,{geometry:'d8-sce'}),sci=F.band(d,band,config,{geometry:'d8-sci'});near(sci.white-sce.white,P.fresnel(Math.cos(8*Math.PI/180),1,1.49),1e-10);near(sci.black-sce.black,P.fresnel(Math.cos(8*Math.PI/180),1,1.49),1e-10);
  for(const geometry of Object.keys(F.geometries)){const r=F.band(d,band,config,{geometry});assert(r.white>=r.black);assert(r.black>=0&&r.white<=1.01);}
 }
 const visible=await F.spectrum(d,config),c=F.colour(W,visible.white),N=[...W,800,1000,1700],ext=F.colour(N,[...visible.white,.1,.2,.3]);assert.deepEqual(ext,c);
 assert.equal(F.domain(p).max,1700);assert(F.grid({...p,mat:'fe3o4Fontijn'},0,true).wavelengths.at(-1)<1600);assert(F.grid(p,0,true).wavelengths.includes(1700));
 const errors=[];for(const band of [5,15,25,35])for(const geometry of ['45-0','d8-sce']){const a=F.band(d,band,config,{geometry,detail:24}),b=F.band(d,band,config,{geometry,detail:32});errors.push(Math.max(Math.abs(a.white-b.white),Math.abs(a.black-b.black)));}
 assert(Math.max(...errors)<.006,'Angular convergence exceeded 0.6 reflectance percentage points');
 const report={passed:true,defaultMatchesRenderer:true,max24to32Difference:Math.max(...errors),visibleColour:c,sourceChecksumsVerified:true};fs.mkdirSync(require('path').join(__dirname,'../artifacts'),{recursive:true});fs.writeFileSync(require('path').join(__dirname,'../artifacts/film-science-validation.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
})();
