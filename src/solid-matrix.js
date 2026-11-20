(function(root){
 'use strict';
 function install(root){
  const defs={
   'soda-clear':{name:'Soda–lime glass · clear',kind:'Measured glass proxy',source:'Rubin (1985), clear soda–lime window glass',doi:'10.1016/0165-1633(85)90052-8'},
   'soda-green':{name:'Soda–lime glass · iron-tinted green',kind:'Measured glass proxy',source:'Rubin (1985), green soda–lime window glass',doi:'10.1016/0165-1633(85)90052-8'},
   bk7:{name:'Optical glass · N-BK7',kind:'Sellmeier dispersion',source:'SCHOTT N-BK7 data sheet',url:'https://www.schott.com/en-us/products/optical-glass-p1000267/downloads/'},
   pmma:{name:'PMMA · acrylic',kind:'Sellmeier dispersion',source:'Sultanova, Kasarova and Nikolov (2009)',doi:'10.12693/APhysPolA.116.585'},
   pc:{name:'Polycarbonate · PC',kind:'Sellmeier dispersion',source:'Sultanova, Kasarova and Nikolov (2009)',doi:'10.12693/APhysPolA.116.585'},
   ps:{name:'Polystyrene · PS',kind:'Sellmeier dispersion',source:'Sultanova, Kasarova and Nikolov (2009)',doi:'10.12693/APhysPolA.116.585'}
  };
  const glassK={"soda-clear":[5.936e-07,2.828e-07,2.047e-07,2.182e-07,2.279e-07,2.397e-07,2.342e-07,1.925e-07,1.669e-07,1.7e-07,1.683e-07,1.554e-07,1.492e-07,1.499e-07,1.582e-07,1.769e-07,1.988e-07,2.2e-07,2.529e-07,3.051e-07,3.563e-07,4.003e-07,4.548e-07,5.217e-07,5.972e-07,6.913e-07,7.754e-07,8.371e-07,9.108e-07,1.009e-06,1.097e-06,1.159e-06,1.234e-06,1.349e-06,1.466e-06,1.585e-06,1.706e-06,1.83e-06,1.956e-06,2.085e-06,2.214e-06],"soda-green":[2.944e-06,1.419e-06,1.025e-06,1.096e-06,1.147e-06,1.205e-06,1.181e-06,9.902e-07,8.684e-07,8.484e-07,8.408e-07,8.445e-07,8.659e-07,9.096e-07,9.657e-07,1.039e-06,1.118e-06,1.169e-06,1.297e-06,1.556e-06,1.805e-06,2.027e-06,2.264e-06,2.508e-06,2.781e-06,3.073e-06,3.426e-06,3.942e-06,4.334e-06,4.472e-06,4.686e-06,5.008e-06,5.363e-06,5.805e-06,6.26e-06,6.73e-06,7.213e-06,7.711e-06,8.245e-06,8.785e-06,9.327e-06]};
  function nk(id,nm){if(!defs[id])throw Error('Unknown solid matrix.');const l=nm/1000,L=l*l;let eps;
   if(glassK[id]){const x=Math.max(0,Math.min(40,(nm-380)/10)),i=Math.min(39,Math.floor(x)),f=x-i;return {n:1.5130-.003169*L+.003962/L,k:glassK[id][i]*(1-f)+glassK[id][i+1]*f};}
   if(id==='bk7')eps=1+1.03961212*L/(L-.00600069867)+.231792344*L/(L-.0200179144)+1.01046945*L/(L-103.560653);
   else{const [a,b]={pmma:[1.1819,.011313],pc:[1.4182,.021304],ps:[1.4435,.020216]}[id];eps=1+a*L/(L-b);}
   return {n:Math.sqrt(eps),k:0};
  }
  function metadata(id){const soda=!!glassK[id];return {...defs[id],id,referenceIndex550:nk(id,550).n,absorptionAssumption:soda?'Published wavelength-dependent k is included as bulk absorption. This modern window glass is a proxy, not a measurement of the Lycurgus Cup.':'Clear, non-absorbing matrix over 380–780 nm.',dispersionNote:soda?'Rubin dispersion formula and tabulated k over 380–780 nm.':id==='bk7'?'Manufacturer Sellmeier formula.':'Published polymer fit measured from 436.8 nm. The 380–436.8 nm portion is a smooth extrapolation, not measured blue/UV data.',geometryNote:'Ray refraction uses the index at 550 nm. The Mie calculation uses the dispersive real host index at each wavelength. Weak host absorption is added separately to transport.',hasAbsorption:soda};}
  root.MieSolidMatrix={defs,nk,metadata};
 }
 install(root);root.MieSolidMatrix.source='('+install.toString()+')(globalThis);';
})(globalThis);
