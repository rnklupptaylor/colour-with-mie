(function(){
  'use strict';
  const $=id=>document.getElementById(id),M=Mie,TAU=2*Math.PI,DEG=Math.PI/180;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const sub=n=>String(n).split('').map(c=>'₀₁₂₃₄₅₆₇₈₉'[c]).join('');
  const pole=n=>['','dipole','quadrupole','octupole','hexadecapole'][n]||`order-${n} multipole`;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const color=k=>css(`--${k}`);

  const MATERIALS=[
    ['Glass in air',1.5,0],['Water droplet in air',1.333,0],['Polystyrene latex in water',1.19,0],['Silica in water',1.09,0],
    ['TiO₂ (rutile) in water',2.0,0],['Air bubble in water',0.75,0],['Absorbing, soot-like, in air',1.75,0.44],['Gold in water, ≈ 520 nm',0.4,1.7]];

  const FAR=['far','Far field'],NEAR=['near','Near field'];
  const LESSONS={
    harmonics:{no:'00',nav:'Harmonics',title:'Vector spherical harmonics',
      concept:'The building blocks of every Mie field. The order <i>n</i> sets how finely the field varies with direction; <i>N</i> waves are electric and <i>M</i> waves magnetic multipoles.',
      groups:['harmonic','display'],views:[['pattern','Radiation pattern'],['sphere','On the unit sphere'],['wave','Regular wave in space']],graphs:[['hprofile','Profile'],['detector','Detector']],
      defaults:{view:'pattern',graph:'hprofile',R:10,theta:90,phi:0,r:4},
      tasks:[
        {t:'Compare <b>N₁</b> and <b>M₁</b>. N₁ radiates like an electric dipole along <i>x</i>, M₁ like a magnetic dipole along <i>y</i>. Find each null.',s:{hA:{n:1,t:'N'},hBOn:false,view:'pattern'}},
        {t:'Raise the order from 1 to 6. How does the number of lobes grow with <i>n</i>?',s:{hA:{n:4,t:'N'},hBOn:false,view:'pattern'}},
        {t:'Add M₁ to N₁ with equal amplitude and zero phase: the backward radiation (θ = 180°) vanishes (first Kerker condition). Then set the phase to 180°.',s:{hA:{n:1,t:'N'},hBOn:true,hB:{n:1,t:'M',amp:1,phase:0},view:'pattern'}},
        {t:'Open <b>Regular wave in space</b> and raise <i>n</i>: j<sub>n</sub>(kr) stays near zero until kr ≈ n (dashed circle). This is why lesson 01 needs N ≳ kR.',s:{hA:{n:6,t:'N'},hBOn:false,view:'wave',graph:'hprofile'}}],
      ideas:`<p>The tangential angular functions N<sub>n</sub> and M<sub>n</sub> are orthonormal: ∫|F|²dΩ = Σ|c|². Directional amplitudes still interfere.</p><p>An outgoing multipole of order <i>n</i> has exactly this angular shape in the far field, so every Mie radiation pattern is an interference of these patterns.</p><p>Only azimuthal index 1 is shown: it is the only one excited by a plane wave travelling along z.</p>`},
    plane:{no:'01',nav:'Plane wave',title:'A plane wave from spherical waves',
      concept:'Regular spherical waves centred on one point add up to a plane wave. A sum truncated at order <i>N</i> is accurate only inside the radius kr ≈ <i>N</i>.',
      groups:['plane','display'],views:[['near','Field in space']],graphs:[['axis','Along the beam axis'],['modes','Multipoles'],['error','Error vs distance'],['detector','Detector']],
      defaults:{view:'near',graph:'axis',pN:3,R:8,pE:true,pM:true,quantity:'re',slice:'xz',vectors:true,theta:60,phi:0,r:4},
      tasks:[
        {t:'Start with <i>N</i> = 1 and press <b>Build up</b>. Where does the reconstruction become correct first?',s:{pN:1,R:8},build:true},
        {t:'Set <i>N</i> = 8: the field is right inside the dashed circle kr = N and wrong outside it.',s:{pN:8,R:14,graph:'axis'}},
        {t:'Double the view radius. How many extra orders are needed? Use <b>Enough for view</b> to check.',s:{pN:8,R:16,graph:'error'}},
        {t:'Switch off the magnetic <i>M</i> waves. Can electric waves alone make a plane wave?',s:{pN:20,R:10,pM:false,pE:true}},
        {t:'Open <b>Multipoles</b> with kR = 4: which orders carry the field in the view, and in what amounts? Now set kR = 16. Every coefficient E<sub>n</sub> stays the same, yet higher orders gain weight: why? Click a bar to sum up to that order.',s:{pN:3,R:4,pE:true,pM:true,graph:'modes'}}],
      ideas:`<p>E<sub>inc</sub> = Σ E<sub>n</sub>(M<sub>o1n</sub><sup>(1)</sup> − iN<sub>e1n</sub><sup>(1)</sup>), with E<sub>n</sub> = i<sup>n</sup>(2n+1)/[n(n+1)]. No single term is a plane wave; their phases make the straight wavefronts.</p><p>j<sub>n</sub>(kr) ≈ (kr)<sup>n</sup>/(2n+1)!! is tiny for kr ≪ n, so order n only contributes beyond kr ≈ n. The same rule sets the Mie cutoff N ≈ x for a sphere of radius a.</p>`},
    rayleigh:{no:'02',nav:'Rayleigh limit',title:'Small particles: the Rayleigh limit',
      concept:'A particle much smaller than the wavelength scatters like an induced electric dipole: Q<sub>sca</sub> ∝ x⁴ (so C<sub>sca</sub> ∝ a⁶/λ⁴), with a null along the dipole axis.',
      groups:['particle','light','display'],views:[FAR,NEAR],graphs:[['polar','Polar diagram'],['spectrum','Spectrum'],['qx','Efficiency vs size'],['orders','Multipoles'],['detector','Detector']],
      xRange:[0.01,2],xPresets:[0.05,0.1,0.3,1],phys:{range:[1,200],presets:[5,10,20,50,100]},
      defaults:{view:'far',graph:'polar',x:0.1,n:1.5,k:0,pol:'x',radial:'lin',theta:90,phi:0,r:3,rad:20,wl:550,mat:'sio2',med:'air',scale:{angular:true,polar:false,qxR:true,qx:true,spectrum:true}},
      tasks:[
        {t:'With E ∥ x no light leaves along <i>x</i> (θ = 90°, φ = 0°): the dipole cannot radiate along its axis. Switch to <b>Unpolarized</b>: the null fills in to (1 + cos²θ)/2.',s:{pol:'x',view:'far',graph:'polar',theta:90,phi:0}},
        {t:'At θ = 90° unpolarized light becomes fully polarized (P = 100 %). This is why the blue sky is polarized at 90° from the Sun.',s:{pol:'unpol',view:'far',graph:'polar'}},
        {t:'Follow the x⁴ law on <b>Efficiency vs size</b>. Above which <i>x</i> does the exact result deviate from Rayleigh by more than 10 %?',s:{units:'dim',graph:'qx',x:0.3}},
        {t:'<b>Spectral</b>: a 20 nm silica sphere in air scatters as λ⁻⁴ (dashed: Rayleigh). Blue light is scattered about 9× more than red light at 700 nm.',s:{units:'spec',struct:'homog',mat:'sio2',med:'air',rad:20,wl:450,graph:'spectrum',view:'far'}},
        {t:'Gold, 10 nm radius in water: absorption (∝ a³/λ) dominates scattering (∝ a⁶/λ⁴), with a plasmon resonance near 520 nm where Re ε ≈ −2ε<sub>water</sub>.',s:{units:'spec',struct:'homog',mat:'au',med:'water',rad:10,wl:520,graph:'spectrum',view:'far'}},
        {t:'Open <b>Near field</b>: around a small sphere it looks like the static dipole field, and becomes a radiating wave about a wavelength away. Inside, the field is almost uniform.',s:{units:'dim',view:'near',quantity:'intlog',region:null,x:0.3,n:1.5,k:0}}],
      ideas:`<p>a<sub>1</sub> ≈ −(2i/3) L x³ with L = (m²−1)/(m²+2); all other coefficients are higher order in x.</p><p>Q<sub>sca</sub> ≈ (8/3)x⁴|L|², Q<sub>abs</sub> ≈ 4x Im L. Pattern: I<sub>∥</sub> ∝ cos²θ, I<sub>⊥</sub> ∝ 1.</p><p>The approximation also needs |m|x ≪ 1: the field inside the particle must be nearly uniform.</p>`},
    mie:{no:'03',nav:'Mie scattering',title:'Scattering by a sphere',
      concept:'The boundary conditions fix one electric (<i>a<sub>n</sub></i>) and one magnetic (<i>b<sub>n</sub></i>) coefficient per order. Their interference shapes the forward peak and the side lobes.',
      groups:['particle','series','light','display'],views:[FAR,NEAR],graphs:[['angular','Angular intensity'],['spectrum','Spectrum'],['orders','Multipoles'],['qx','Efficiency vs size'],['detector','Detector']],
      xRange:[0.05,200],xPresets:[0.1,1,5,20,100],phys:{range:[5,5000],presets:[50,100,250,500,1000]},
      defaults:{view:'far',graph:'angular',x:5,n:1.5,k:0,pol:'x',radial:'log',theta:60,phi:0,r:1.6,rad:250,wl:633,mat:'ps',med:'water'},
      tasks:[
        {t:'Increase <i>x</i> from 0.1 to 20. Watch the pattern turn from a dipole into a narrow forward lobe with side lobes.',s:{x:0.1,view:'far',graph:'angular',auto:true,solo:0}},
        {t:'At x = 5 open <b>Multipoles</b> and click n = 3 to show it alone. Click again to restore: the full pattern is an interference of all orders.',s:{x:5,view:'far',graph:'orders',auto:true,solo:3}},
        {t:'Untick <b>All orders needed</b> and press <b>Build up</b>. Which converges first, Q<sub>sca</sub> or the side lobes?',s:{x:5,view:'far',auto:false,N:1,solo:0,graph:'angular'},build:true},
        {t:'On <b>Efficiency vs size</b>, Q<sub>ext</sub> overshoots to about 4 and settles towards 2. Add absorption κ = 0.1: the ripple structure disappears.',s:{graph:'qx',k:0}},
        {t:'Near field with the incident wave added: see the shadow, the focus behind the sphere and the standing waves inside it. Untick <b>Show particle</b> for a clear view.',s:{units:'dim',x:10,n:1.5,k:0,view:'near',total:true,quantity:'int',slice:'xz',region:null,auto:true,solo:0}},
        {t:'<b>Fixed λ</b>: polystyrene latex in water at 633 nm. Report <b>Cross section C</b> and vary the radius: Q oscillates, while C grows towards 2πa² for large spheres.',s:{units:'wl',struct:'homog',mat:'ps',med:'water',wl:633,rad:250,report:'c',graph:'qx',view:'far'}}],
      ideas:`<p>E<sub>sca</sub> = Σ E<sub>n</sub>(i a<sub>n</sub>N<sub>e1n</sub><sup>(3)</sup> − b<sub>n</sub>M<sub>o1n</sub><sup>(3)</sup>).</p><p>Powers add by order: Q<sub>sca</sub> = (2/x²)Σ(2n+1)(|a<sub>n</sub>|²+|b<sub>n</sub>|²). Amplitudes interfere: |Σ terms|² ≠ Σ|terms|² in any one direction.</p><p>Q<sub>ext</sub> = (4/x²) Re S(0) (optical theorem); g = ⟨cosθ⟩ measures forward bias.</p>`},
    large:{no:'04',nav:'Large spheres',title:'Large spheres: many orders, sharp features',
      concept:'For x ≫ 1 about x + 4x<sup>1/3</sup> orders are needed and the forward lobe narrows to an angle ≈ 1/x. Geometric optics and diffraction reappear as limits of the exact series.',
      groups:['particle','series','light','display'],views:[FAR,NEAR],graphs:[['angular','Angular intensity'],['converge','Orders needed'],['spectrum','Spectrum'],['qx','Efficiency vs size'],['detector','Detector']],
      xRange:[5,200],xPresets:[20,50,100,200],phys:{range:[200,20000],presets:[1000,2000,5000,10000]},
      defaults:{view:'far',graph:'angular',x:100,n:1.333,k:0,pol:'unpol',radial:'log',theta:2,phi:0,r:1.3,fwd:true,rad:10000,wl:633,mat:'water',med:'air'},
      tasks:[
        {t:'Compare the forward peak with Fraunhofer diffraction by a disc of the same radius (dotted). The first minimum sits at sinθ ≈ 3.83/x: the basis of laser-diffraction particle sizing.',s:{x:100,view:'far',graph:'angular',fwd:true,auto:true,solo:0}},
        {t:'Water droplet, x = 200, full angular range: find the rainbow peak near 138° predicted by geometric optics.',s:{x:200,n:1.333,k:0,view:'far',graph:'angular',fwd:false,pol:'unpol',auto:true,solo:0}},
        {t:'On <b>Orders needed</b>, |a<sub>n</sub>| and |b<sub>n</sub>| collapse just beyond n ≈ x. Truncate to N = 0.6x and watch the forward lobe distort.',s:{x:100,view:'far',graph:'converge',auto:false,N:60,solo:0}},
        {t:'<b>Efficiency vs size</b>: Q<sub>ext</sub> tends to 2, twice the geometric cross-section (extinction paradox).',s:{graph:'qx'}}],
      ideas:`<p>Localization principle: order n corresponds to a ray with impact parameter ≈ (n + ½)/k. Rays with n &gt; x miss the sphere, so their coefficients vanish.</p><p>Half of Q<sub>ext</sub> = 2 is diffraction around the edge, concentrated in a forward cone of width ≈ 3.83/x.</p><p>Angular features of width 1/x need many sample directions: an angular profile costs O(N·P) operations with P ∝ x.</p>`},
    real:{no:'05',nav:'Real particles',title:'Real particles: materials, spectra, core–shell',
      concept:'Measured optical constants make Mie theory predictive: plasmon resonances of metal nanoparticles, magnetic dipole resonances of silicon, tunable nanoshells. Spectra run from 300 to 2000 nm.',
      groups:['particle','series','light','display'],views:[FAR,NEAR],graphs:[['spectrum','Spectrum'],['angular','Angular intensity'],['orders','Multipoles'],['qx','Size dependence'],['detector','Detector']],
      xRange:[0.05,200],xPresets:[0.5,1,2,5],phys:{range:[2,2000],presets:[10,20,40,75,150]},
      defaults:{units:'spec',struct:'homog',mat:'au',med:'water',rad:20,wl:530,core:60,shell:10,matCore:'sio2',view:'far',radial:'lin',graph:'spectrum',pol:'x',theta:90,phi:0,r:0.6},
      tasks:[
        {t:'Gold nanoparticle, 40 nm diameter in water: the extinction peak at about 530 nm is the localized surface plasmon, mostly absorption. Raise the diameter to 150 nm: the peak red-shifts to about 640 nm and scattering takes over.',s:{units:'spec',struct:'homog',mat:'au',med:'water',rad:20,wl:530,graph:'spectrum',mpoles:false,view:'far'}},
        {t:'Silver of the same size resonates near 400 nm, stronger and sharper than gold: its interband absorption lies further in the UV.',s:{units:'spec',struct:'homog',mat:'ag',med:'water',rad:20,wl:398,graph:'spectrum',mpoles:false,view:'far'}},
        {t:'Silica core (60 nm radius) with a 10 nm gold shell in water: the plasmon moves to about 830 nm, in the biological window. A 5 nm shell pushes it beyond 1000 nm: a tunable nanoshell.',s:{units:'spec',struct:'cs',mat:'au',matCore:'sio2',med:'water',core:60,shell:10,wl:830,graph:'spectrum',mpoles:false,view:'far'}},
        {t:'Silicon sphere, 150 nm diameter in air, with <b>multipoles</b> on: the magnetic dipole b₁ peaks at 610 nm, the electric dipole a₁ near 500 nm. In the near field at 610 nm the electric field circulates inside the particle.',s:{units:'spec',struct:'homog',mat:'si',med:'air',rad:75,wl:610,graph:'spectrum',mpoles:true,view:'near',quantity:'re',slice:'xz',total:false,showParticle:true,region:2.2,vectors:true}},
        {t:'Polystyrene latex, 500 nm diameter in water: no absorption, so Q<sub>ext</sub> = Q<sub>sca</sub>. Report <b>Cross section C</b> to read C<sub>ext</sub> in µm², the quantity behind turbidity: τ = N<sub>p</sub> C<sub>ext</sub>.',s:{units:'spec',struct:'homog',mat:'ps',med:'water',rad:250,wl:633,report:'c',graph:'spectrum',mpoles:false,view:'far'}},
        {t:'Water droplet, 2 µm radius in air: absorption shows up only near 1450 and 1940 nm, at water\'s own vibrational overtone bands.',s:{units:'spec',struct:'homog',mat:'water',med:'air',rad:2000,wl:1932,graph:'spectrum',mpoles:false,view:'far'}}],
      ideas:`<p>Small metal spheres resonate where Re ε ≈ −2ε<sub>medium</sub> (Fröhlich condition); retardation red-shifts the peak as they grow.</p><p>High-index dielectrics such as silicon support a magnetic dipole resonance at roughly λ/n ≈ 2a: the field inside circulates.</p><p>Absolute cross sections C = Q πa² are what extinction measurements see: transmission T = exp(−N<sub>p</sub> C<sub>ext</sub> L) for N<sub>p</sub> particles per volume.</p>`},
    design:{no:'06',nav:'Colour design',title:'Colour by design: from a target colour to a particle',
      concept:'Inverse design: choose a colour and the app searches gold, silver, copper and silicon spheres and core–shell particles, each at its best concentration, for the colloid whose transmission colour (1 cm, selected source, CIE 2006 10°) comes closest, measured by CIEDE2000.',
      groups:['design'],views:[['result','Result']],graphs:[['families','Families'],['map','Colour map'],['gamut','Colour space'],['tspec','Spectrum'],['conc','Concentration']],
      defaults:{view:'result',graph:'families',tL:40,ta:60,tb:30,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dMetric:'2000',dMed:'water',dSel:'auto'},
      tasks:[
        {t:'Ruby red (L* 40, a* 60, b* 30): small gold spheres win. Open <b>Concentration</b>: diluting changes lightness and saturation, not the hue. Why does Ag@Au come within ΔE<sub>00</sub> ≈ 0.1 but still lose?',s:{tL:40,ta:60,tb:30,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dSel:'auto',graph:'conc'}},
        {t:'Pantone 2022 "Very Peri" (L* 46, a* 13, b* −37), the case study of Bleyer et al. (2025). They found gold spheres, d ≈ 104 nm, ΔE<sub>76</sub> ≈ 9 with a 5500 K LED. Open the gold bar in <b>Families</b> and compare; then see which family the app prefers and why.',s:{tL:46,ta:13,tb:-37,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dSel:'au',graph:'families'}},
        {t:'Pick a green on the map (L* 60, a* −40, b* 20). Gold spheres cannot make it: a resonance in the red removes red light, and the eye sees the complement. Which family wins? Look at its <b>Colour map</b>.',s:{tL:60,ta:-40,tb:20,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dSel:'auto',graph:'map'}},
        {t:'Restrict the candidates to gold spheres only and ask for teal (L* 55, a* −30, b* −10). In <b>Colour space</b>, where does the target lie relative to the reachable dots? What is the price of the restriction?',s:{tL:55,ta:-30,tb:-10,dFam:'au',dSel:'auto',graph:'gamut'}},
        {t:'Silicon spheres colour by scattering, not by absorption. Target a pale blue-grey (L* 70, a* −8, b* −12) with all families: does the Monte Carlo check (result card) change the ranking? What happens to the colour when light is scattered more than once?',s:{tL:70,ta:-8,tb:-12,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dSel:'auto',graph:'tspec'}},
        {t:'Green again (L* 60, a* −40, b* 20): the winning nanoshell is very thin. Compare its <b>±10 % size spread</b> value with the best Si sphere. Click other valleys of the colour map: which design would you synthesize, and why?',s:{tL:60,ta:-40,tb:20,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dSel:'sio2au',graph:'map'}}],
      ideas:`<p>Forward model: Mie extinction per volume fraction, Beer–Lambert through 1 cm, CIE 2006 10° observer with the selected source, L*a*b*. For each structure the concentration is optimized (scan + golden section in log φ); grids of 64 diameters or 40 × 40 core × shell give the colour maps; the best of each family is refined by Nelder–Mead, re-checked with Monte Carlo multiple scattering and for a ±10 % size spread.</p><p>Matching three colour coordinates with three parameters (two sizes and φ) makes core–shell solutions degenerate: valleys rather than points. A small practicality penalty (core–shell step, very thin shells, large particles, oxidizing copper) breaks near-ties in favour of simpler designs.</p><p>Limits: ideal monodisperse spheres, bulk optical constants, independent scattering, and a standard illuminant (photographs depend on the real light source and camera).</p>`},
    tmat:{no:'07',nav:'T-matrix',title:'The T-matrix: one sphere, then two',
      concept:'The transition matrix T maps the coefficients of any incident field onto those of the scattered field, <b>b</b> = T <b>a</b>. For a sphere at the origin it is diagonal and holds the Mie coefficients; for several particles it follows from their own T-matrices and the translation of spherical waves between them.',
      groups:['particle','cluster','msorders','light','display'],views:[FAR,NEAR],graphs:[['tmatrix','T-matrix'],['msorders','Orders of scattering'],['angular','Angular intensity'],['spectrum','Spectrum']],
      xRange:[0.05,4],xPresets:[0.5,1,1.5,3],phys:{range:[2,150],presets:[10,20,40,75]},cluster:{max:2},
      defaults:{ns:1,gap:0.5,gapNm:4,axis:'x',origin:0,wlMin:400,wlMax:900,msAll:true,msK:0,view:'far',graph:'tmatrix',x:1.5,n:1.5,k:0,pol:'x',radial:'lin',units:'dim',rad:20,wl:650,mat:'au',med:'water',theta:90,phi:0,r:2},
      tasks:[
        {t:'One sphere at the origin: on <b>T-matrix</b> only the diagonal is filled, with −b<sub>n</sub> for M waves and −a<sub>n</sub> for N waves, the same for every azimuthal order m (here m counts the repeats around the axis; it is not the refractive index).',s:{ns:1,origin:0,graph:'tmatrix',units:'dim',x:1.5,n:1.5,k:0,view:'far'}},
        {t:'Shift the expansion origin by 1.5 a (the axes mark the origin, so the sphere moves away from it): off-diagonal elements appear and higher orders are needed, yet Q<sub>ext</sub> and the far field do not change. The T-matrix depends on the origin, the physics does not.',s:{ns:1,origin:1.5,graph:'tmatrix',units:'dim',x:1.5,n:1.5,k:0}},
        {t:'Two glass spheres along x, gap 0.5 a: the T-matrix of the pair about its centre fills further. In the chain frame the azimuthal order m is conserved, so the matrix stays block-diagonal.',s:{ns:2,gap:0.5,origin:0,axis:'x',graph:'tmatrix',units:'dim',x:1.5,n:1.5,k:0}},
        {t:'Untick <b>Exact solution</b> and press <b>Build up</b>. K = 0 treats the spheres as independent; each order adds one exchange of scattered waves. For glass spheres the series converges quickly.',s:{ns:2,gap:0.5,axis:'x',msAll:false,msK:0,graph:'msorders',units:'dim',x:1.5,n:1.5,k:0,view:'far'},build:true},
        {t:'Gold spheres, 20 nm radius and 2 nm apart in water, at 550 nm with E along the axis: the series diverges (the caption gives the spectral radius of T H). At 650 nm it converges, but slowly. Strongly coupled particles need the matrix inverse (I − T H)<sup>−1</sup>.',s:{units:'wl',struct:'homog',mat:'au',med:'water',rad:20,gapNm:2,wl:550,ns:2,axis:'x',pol:'x',msAll:false,msK:3,graph:'msorders',view:'far'}},
        {t:'<b>Near field</b> of the gold dimer (|E|², dB, total field): light is concentrated in the gap when E points along the axis. Switch to E ∥ y and the hot spot disappears.',s:{units:'wl',struct:'homog',mat:'au',med:'water',rad:20,gapNm:2,wl:650,ns:2,axis:'x',pol:'x',msAll:true,view:'near',quantity:'intlog',slice:'xz',region:null,showParticle:true,total:true,graph:'msorders'}}],
      ideas:`<p>Each sphere j scatters b<sub>j</sub> = T<sub>j</sub>[a<sub>j</sub> + Σ<sub>l≠j</sub> H(r<sub>j</sub> − r<sub>l</sub>) b<sub>l</sub>]: its exciting field is the incident wave plus the waves scattered by all others, re-expanded about r<sub>j</sub> by the translation matrix H.</p><p>So b = (I − T H)<sup>−1</sup> T a. Expanding the inverse as a geometric series gives the orders of scattering; it converges only if the spectral radius of T H is below 1.</p><p>For particles on a common axis the translations conserve m, so the problem splits into small independent blocks.</p>`},
    chain:{no:'08',nav:'Sphere chains',title:'Chains of spheres: coupled resonances',
      concept:'Coupling between neighbouring spheres shifts and splits their resonances. Light polarized along a chain of metal spheres excites a red-shifted collective plasmon, light polarized across it a weakly blue-shifted one. Chains can lie along x, y or z.',
      groups:['particle','cluster','light','display'],views:[FAR,NEAR],graphs:[['spectrum','Spectrum'],['angular','Angular intensity'],['gap','Gap dependence'],['length','Chain length']],
      xRange:[0.05,4],xPresets:[0.3,0.5,1,2],phys:{range:[2,250],presets:[10,20,40,75,150]},cluster:{max:8},
      defaults:{units:'spec',wlMin:400,wlMax:900,struct:'homog',mat:'au',med:'water',rad:20,wl:600,ns:2,gapNm:4,gap:0.2,axis:'x',pol:'x',avg:false,view:'far',graph:'spectrum',radial:'lin',x:0.5,n:1.5,k:0,theta:90,phi:0,r:2},
      tasks:[
        {t:'Gold dimer in water, 40 nm diameter, 4 nm gap, along x with E ∥ x: the extinction peak moves from about 530 nm (dashed: separate spheres) to the red. This is the longitudinal coupled plasmon.',s:{units:'spec',struct:'homog',mat:'au',med:'water',rad:20,gapNm:4,ns:2,axis:'x',pol:'x',avg:false,wl:560,graph:'spectrum',view:'far'}},
        {t:'Now E ∥ y, across the axis: the peak shifts slightly to the blue. In a coupled-dipole picture the neighbour\'s near field adds to the local field for head-to-tail dipoles and opposes it for side-by-side dipoles.',s:{units:'spec',struct:'homog',mat:'au',med:'water',rad:20,gapNm:4,ns:2,axis:'x',pol:'y',avg:false,wl:530,graph:'spectrum',view:'far'}},
        {t:'<b>Gap dependence</b> (Spectral): the longitudinal resonance moves to the red, roughly exponentially, as the gap closes, and returns to the single-sphere value beyond about one diameter. This is the "plasmon ruler".',s:{units:'spec',wlMin:400,wlMax:900,struct:'homog',mat:'au',med:'water',rad:20,gapNm:4,ns:2,axis:'x',pol:'x',wl:600,graph:'gap',view:'far'}},
        {t:'<b>Chain length</b>: from 1 to 8 spheres along x the longitudinal response keeps changing over the first few neighbours, then saturates; across the chain little happens.',s:{units:'wl',struct:'homog',mat:'au',med:'water',rad:20,gapNm:4,ns:4,axis:'x',pol:'x',wl:620,graph:'length',view:'far'}},
        {t:'Tick <b>Random orientation</b>: dimers tumbling in a suspension show both modes at once. The extra red band is the spectral signature of aggregation in gold colloids.',s:{units:'spec',struct:'homog',mat:'au',med:'water',rad:20,gapNm:2,ns:2,axis:'x',pol:'x',avg:true,wl:600,graph:'spectrum',view:'far'}},
        {t:'Silicon dimer, 75 nm radius, 20 nm gap in air, along y with E ∥ x: the magnetic dipole resonances of the two spheres couple. Compare with separate spheres (dashed) and look at the near field at the resonance.',s:{units:'spec',struct:'homog',mat:'si',med:'air',rad:75,gapNm:20,ns:2,axis:'y',pol:'x',avg:false,wl:640,graph:'spectrum',view:'far',mpoles:false}},
        {t:'Four polystyrene spheres in water (500 nm diameter, 50 nm gaps) at 633 nm: compare the angular pattern for a chain along z (end-on) and along x. Interference fringes appear when the chain lies in the scattering plane.',s:{units:'wl',struct:'homog',mat:'ps',med:'water',rad:250,gapNm:50,ns:4,axis:'z',pol:'x',wl:633,graph:'angular',view:'far',radial:'log'}}],
      ideas:`<p>Per-sphere efficiencies Q = C/(N πa²) compare the chain directly with one sphere; the dashed curves show N independent spheres.</p><p>Close gaps need many multipoles: the app adds orders as the gap shrinks (n ≈ x + 4x<sup>1/3</sup> + 2 + 3/√(g/a)).</p><p>Random orientation is an average over the angle between the light and the chain axis (Gauss–Legendre in cos β) and over two polarizations.</p>`},
  };
  // Engineering level: the same lessons, setups and task order, explained with less mathematics.
  const ENG={
    harmonics:{nav:'Building blocks',title:'The building blocks of scattered light',
      concept:`Mie theory writes every field around a sphere as a sum of standard wave patterns, much as a Fourier series builds a signal from sines and cosines. The order <i>n</i> sets how many lobes a pattern has. <i>N</i> patterns are electric, <i>M</i> patterns magnetic.`,
      tasks:[
        `Compare <b>N₁</b> and <b>M₁</b>. N₁ is the pattern of a tiny antenna (an oscillating electric dipole) along <i>x</i>. M₁ is that of a tiny current loop (a magnetic dipole) along <i>y</i>. In which direction does each send no light?`,
        `Raise the order from 1 to 6. How does the number of lobes grow with <i>n</i>?`,
        `Add M₁ to N₁ with equal strength and zero phase: no light goes backwards (θ = 180°). This is the Kerker effect, used for particles designed to scatter only forwards. Then set the phase to 180°.`,
        `Open <b>Regular wave in space</b> and raise <i>n</i>. The pattern stays close to zero near the centre, up to a distance kr ≈ n (dashed circle). Higher orders only matter further out, which lesson 01 uses.`],
      ideas:`<p>Any pattern of light leaving a particle is a weighted sum of these building blocks. Each one carries its own share of the power, and the shares simply add up.</p><p>In a given direction, however, the waves of different building blocks add with their phases. They can reinforce or cancel each other: this is the interference in task 3.</p><p>The app shows only the patterns that a light beam travelling along z can excite.</p>`},
    plane:{nav:'Plane wave',title:'Building a light wave from spherical waves',
      concept:`A plane light wave can be written as a sum of spherical waves centred on one point. With a finite number of terms <i>N</i> the sum is correct only near the centre, up to about kr ≈ <i>N</i> (k = 2π/λ, r: distance from the centre).`,
      tasks:[
        `Start with <i>N</i> = 1 and press <b>Build up</b>. Where does the sum match the plane wave first?`,
        `Set <i>N</i> = 8: the field is right inside the dashed circle kr = N and wrong outside it.`,
        `Double the size of the region shown. How many more terms are needed? Use <b>Enough for view</b> to check.`,
        `Switch off the magnetic <i>M</i> terms. Can the electric terms alone make a plane wave?`,
        `Open <b>Multipoles</b> with a small region (kR = 4): which terms are needed, and how much of each? Then make the region four times larger. Why do the higher terms matter more now? Click a bar to add the terms up to it.`],
      ideas:`<p>A particle of radius a interacts with the incoming wave only within kr ≤ ka = x. So about N ≈ x terms are needed to describe it, and large particles need many terms.</p><p>No single term looks like a plane wave. The straight wavefronts appear only when many terms are added with the right phases.</p>`},
    rayleigh:{nav:'Small particles',title:'Very small particles: Rayleigh scattering',
      concept:`A particle much smaller than the wavelength acts like a tiny antenna. The light field makes its charges oscillate, and it radiates in all directions except along the direction of oscillation. Scattering grows steeply with size and falls steeply with wavelength: C<sub>sca</sub> ∝ a⁶/λ⁴.`,
      tasks:[
        `With E ∥ x no light leaves along <i>x</i> (θ = 90°, φ = 0°): an antenna does not radiate along its own axis. Switch to <b>Unpolarized</b>, like sunlight: the gap fills in.`,
        `Light scattered at 90° is fully polarized (P = 100 %), even when the incoming light is unpolarized. This is why polarizing sunglasses darken the sky at 90° from the Sun.`,
        `Open <b>Efficiency vs size</b>: on log–log axes the Rayleigh law is a straight line. Above which <i>x</i> does the exact result differ from it by more than 10 %?`,
        `<b>Spectral</b>: a 20 nm silica sphere in air scatters as λ⁻⁴ (dashed: Rayleigh formula). Light at 400 nm is scattered about 9× more than at 700 nm, so fine suspensions look bluish from the side and orange in transmission.`,
        `Gold, 10 nm radius in water: the particle absorbs far more light than it scatters. The absorption peak near 520 nm (a plasmon, see Theory) is why gold colloids look ruby red.`,
        `Open <b>Near field</b>. Close to a small sphere the field looks like that of a pair of static charges (+ and −). About a wavelength away it turns into a travelling wave. Inside the particle the field is almost uniform.`],
      ideas:`<p>The Rayleigh formulas need only x and m: Q<sub>sca</sub> ≈ (8/3)x⁴|(m²−1)/(m²+2)|². They hold while the particle is small compared with the wavelength both outside and inside it (x ≪ 1 and |m|x ≪ 1).</p><p>Because C<sub>sca</sub> ∝ a⁶, a few large particles or agglomerates can dominate the scattering of a fine suspension. This matters for turbidity measurements and for transparent nanocomposites.</p><p>Absorption grows only as a³, so small absorbing particles such as soot or metal nanoparticles mainly absorb.</p>`},
    mie:{nav:'Mie scattering',title:'Scattering by a sphere: Mie theory',
      concept:`For particles about as large as the wavelength, the exact Mie solution is needed. The particle’s response is a sum of electric (<i>a<sub>n</sub></i>) and magnetic (<i>b<sub>n</sub></i>) terms. Their interference produces a strong forward beam and side lobes.`,
      tasks:[
        `Increase <i>x</i> from 0.1 to 20. The pattern changes from the antenna shape into a narrow forward beam with side lobes.`,
        `At x = 5 open <b>Multipoles</b> and click n = 3 to show that term alone. Click again to restore all: the full pattern comes from the interference of all terms.`,
        `Untick <b>All terms needed</b> and press <b>Build up</b>. Which becomes correct first, the total Q<sub>sca</sub> or the side lobes?`,
        `On <b>Efficiency vs size</b>, Q<sub>ext</sub> rises to about 4 and then settles towards 2: a particle can remove more light than falls on its cross-sectional area. Add absorption κ = 0.1: the ripples disappear.`,
        `Near field with the incident wave added: see the shadow, the bright focus behind the sphere (a “photonic nanojet”) and the standing waves inside it. Untick <b>Show particle</b> for a clear view.`,
        `<b>Fixed λ</b>: polystyrene latex in water at 633 nm, a common calibration standard. Report <b>Cross section C</b> and vary the radius: Q oscillates, while C grows towards 2πa² for large spheres.`],
      ideas:`<p>Q<sub>ext</sub>, Q<sub>sca</sub> and g are the inputs of most light-transport models, for example for coatings, foams and photoreactors. This lesson shows where they come from.</p><p>The total scattered power is a plain sum over the terms. The angular pattern is not, because the terms interfere in each direction.</p><p>g = ⟨cos θ⟩ measures how strongly light is scattered forwards: g ≈ 0 for very small particles, typically 0.7–0.9 for particles larger than the wavelength.</p>`},
    large:{nav:'Large particles',title:'Large particles: diffraction and ray optics',
      concept:`For particles much larger than the wavelength, about x + 4x<sup>1/3</sup> terms are needed. The forward beam becomes very narrow (angle ≈ 1/x), and the familiar laws of diffraction and ray optics reappear.`,
      tasks:[
        `Compare the forward peak with diffraction by a disc of the same radius (dotted). The first minimum lies at sin θ ≈ 3.83/x. Laser-diffraction instruments (ISO 13320) measure such ring patterns to determine particle sizes.`,
        `Water droplet, x = 200, full angular range: find the rainbow peak near 138° predicted by ray optics.`,
        `On <b>Orders needed</b>, the term sizes |a<sub>n</sub>| and |b<sub>n</sub>| drop sharply just beyond n ≈ x. Cut the sum at N = 0.6x and watch the forward beam distort.`,
        `<b>Efficiency vs size</b>: Q<sub>ext</sub> tends to 2, twice the geometric cross section. A large particle removes the light that hits it and, by diffraction, the same amount again. This diffracted light goes into a very narrow forward cone, so a detector with a wide acceptance angle partly counts it as transmitted.`],
      ideas:`<p>A term of order n corresponds roughly to a ray passing the centre at a distance (n + ½)λ/2π. Rays with n &gt; x miss the particle, so their terms vanish: hence the cutoff N ≈ x.</p><p>The width of the diffraction peak scales as 1/x, so the size of large particles can be read from the forward-scattering angles.</p><p>For non-spherical or rough particles the forward diffraction peak hardly changes, but the rainbow and other ray-optics features disappear.</p>`},
    real:{nav:'Real particles',title:'Real particles: materials, colours and spectra',
      concept:`With measured refractive indices, Mie theory predicts real spectra: the colours of gold and silver colloids, resonances of silicon nanoparticles, tunable core–shell particles and the turbidity of latex suspensions. Spectra run from 300 to 2000 nm.`,
      tasks:[
        `Gold nanoparticle, 40 nm diameter in water: the extinction peak at about 530 nm comes from the collective oscillation of the free electrons (a plasmon) and is mostly absorption. Raise the diameter to 150 nm: the peak shifts to about 640 nm and scattering takes over.`,
        `Silver of the same size has its peak near 400 nm, stronger and sharper than gold. This is why silver colloids look yellow.`,
        `Silica core (60 nm radius) with a 10 nm gold shell in water: the peak moves to about 830 nm, in the near infrared where tissue is fairly transparent. Such nanoshells are studied for photothermal therapy. A 5 nm shell pushes the peak beyond 1000 nm.`,
        `Silicon sphere, 150 nm diameter in air, with <b>multipoles</b> on: besides the electric term a₁ (near 500 nm) there is a strong magnetic term b₁ at 610 nm. In the near field at 610 nm the electric field circulates inside the particle, like the current in a loop.`,
        `Polystyrene latex, 500 nm diameter in water: no absorption, so Q<sub>ext</sub> = Q<sub>sca</sub>. Report <b>Cross section C</b> to read C<sub>ext</sub> in µm². With N<sub>p</sub> particles per volume the extinction coefficient is μ<sub>ext</sub> = N<sub>p</sub>C<sub>ext</sub>.`,
        `Water droplet, 2 µm radius in air: it absorbs only near 1450 and 1940 nm, in the absorption bands of the water molecule. Infrared drying and moisture sensors use these bands.`],
      ideas:`<p>Small metal particles have their plasmon peak where Re ε ≈ −2ε<sub>medium</sub>. A higher refractive index of the surroundings shifts it to longer wavelengths: the principle of plasmonic sensors.</p><p>The opacity of white paints relies on TiO₂ particles about 200–250 nm in diameter, close to the size at which they scatter visible light most efficiently.</p><p>Transmission through a dilute suspension follows the Beer–Lambert law, T = exp(−N<sub>p</sub>C<sub>ext</sub>L). Measuring T at several wavelengths and comparing with Mie spectra gives particle size and concentration.</p>`},
    design:{nav:'Colour design',title:'Colour by design: from a colour to a particle',
      concept:'Pick a colour, and the app finds which particles, of which size and at what concentration, make a colloid of that colour. It tries gold, silver, copper and silicon particles and particles with a core and a shell, and checks the result with the international colour standards.',
      tasks:[
        `Ruby red: small gold spheres win. Open <b>Concentration</b>: adding more particles makes the colour darker and stronger but does not change the hue. A silver-gold particle comes even closer; why does the app still prefer gold?`,
        `Pantone's colour of the year 2022 (a blue-violet). Researchers at FAU (Bleyer et al., 2025) made it with gold spheres of about 104 nm. Compare with the gold bar in <b>Families</b>, then see what the app prefers.`,
        `Pick a green. Gold spheres cannot make it: they remove red light, so the colour you see is a blue-violet, not green. Which particle type wins? Look at its <b>Colour map</b>.`,
        `Allow only gold spheres and ask for teal. In <b>Colour space</b>, is the target near any of the dots? What does limiting yourself to one material cost?`,
        `Silicon particles colour light by scattering it. Ask for a pale blue-grey: does the extra check with light bouncing between particles change the answer?`,
        `Green again: the winning particle has a very thin shell. If the sizes vary by ±10 %, how much does the colour change? Would you rather make another design from a different dark region of the map?`],
      ideas:`<p>The app tries every particle size and shell thickness on a fine grid, finds the best concentration for each, then fine-tunes the best few. Simpler, more robust particles are preferred when the colours are almost equal.</p><p>Often several quite different particles give the same colour; the colour map shows these as separate dark regions. That freedom is useful: you can choose the one that is easiest to make.</p><p>The result assumes ideal, identical spheres and standard daylight; real samples and photographs differ somewhat.</p>`},
    tmat:{nav:'T-matrix',title:'The T-matrix: from one particle to two',
      concept:'The T-matrix is a table that tells how a particle turns any incoming light wave into scattered light. For a single sphere at the centre it only contains the Mie coefficients. For several particles it also describes how the light scattered by one particle excites the others.',
      tasks:[
        `One sphere at the centre: on <b>T-matrix</b> only the diagonal is filled. Each incoming wave pattern simply produces the same pattern, scaled by its Mie coefficient.`,
        `Move the reference point 1.5 radii away from the sphere (the axes mark the reference point): the table fills with many more entries, yet Q<sub>ext</sub> and the far field stay the same. The description changes, the physics does not.`,
        `Two glass spheres along x with a gap of half a radius: the table of the pair fills further. Because both spheres sit on one axis, it still splits into separate blocks, one per rotation number m (how often a pattern repeats around the axis; not the refractive index).`,
        `Untick <b>Exact solution</b> and press <b>Build up</b>. K = 0 means the spheres ignore each other; each step lets the light scattered by one sphere excite the other once more. For glass spheres a few steps are enough.`,
        `Gold spheres, 20 nm radius and 2 nm apart in water, at 550 nm with E along the axis: the steps never settle. Here the spheres interact so strongly that the system of equations must be solved directly. At 650 nm the steps do settle, but slowly.`,
        `<b>Near field</b> of the gold pair: light is concentrated in the narrow gap when E points along the axis (a "hot spot", used in surface-enhanced Raman spectroscopy). With E ∥ y the hot spot disappears.`],
      ideas:`<p>Each sphere responds to the incoming light plus the light scattered by all other spheres. Writing this for every sphere gives a set of linear equations, one per sphere and wave pattern.</p><p>Solving them step by step (exchange after exchange) works when the coupling is weak. Near a strong resonance the steps run away, and the equations must be solved directly, as the app does when <i>Exact solution</i> is ticked.</p><p>The same approach handles particles of any shape once their own T-matrix is known; it is used for aggregates, clusters and particle layers.</p>`},
    chain:{nav:'Sphere chains',title:'Chains of spheres: coupled resonances',
      concept:'When spheres are close together, each one feels the near field of its neighbours. For metal spheres this shifts and splits the colour resonance: light polarized along the chain gives a red-shifted band, light polarized across it a slightly blue-shifted one.',
      tasks:[
        `Gold pair in water, 40 nm diameter, 4 nm gap, along x with E ∥ x: the extinction peak moves from about 530 nm (dashed: separate spheres) to longer wavelengths.`,
        `Now E ∥ y, across the pair: the peak moves slightly to shorter wavelengths. The two spheres either help each other (charges head to tail) or work against each other (side by side).`,
        `<b>Gap dependence</b> (Spectral): the closer the spheres, the further the band moves to the red; beyond about one diameter the effect fades. Biosensors use this distance sensitivity (the "plasmon ruler").`,
        `<b>Chain length</b>: adding spheres along x keeps changing the response for the first few neighbours, then it levels off.`,
        `Tick <b>Random orientation</b>: in a suspension the pairs tumble, so both bands appear together. A new red band in a gold colloid spectrum is a sign that particles are clustering.`,
        `Silicon pair, 75 nm radius, 20 nm gap in air, along y with E ∥ x: the magnetic resonances of the two spheres interact. Compare with separate spheres (dashed).`,
        `Four polystyrene spheres in water (500 nm diameter, 50 nm gaps) at 633 nm: compare the angular pattern for a chain along z and along x. Extra lobes appear when the chain lies in the plane of the graph.`],
      ideas:`<p>Efficiencies are given per sphere, Q = C/(N πa²), so the chain can be compared directly with one sphere.</p><p>Coupling matters for aggregated colloids, for printed or self-assembled nanoparticle chains and for the strong local fields used in sensing and surface-enhanced spectroscopy.</p><p>Random orientation averages over all directions of the light relative to the chain, as for particles in a stirred suspension.</p>`},
  };
  // The Museum is a native tenth lesson; the first nine keep their existing data.
  LESSONS.museum={no:'09',nav:'Museum',title:'Museum: scattering across a century',
    concept:'Compare original figures with the laboratory’s simulations, from Rayleigh’s sky to heated gold dimers. Change the phase, size or path length; Paper settings and a lesson link stay beside the picture.',
    groups:['museum'],views:[['museum','Historical overlay']],graphs:[['museum','Historical overlay']],
    defaults:{view:'museum',graph:'museum',museumFigure:'mie-3',museumOpacity:.65,museumLayer:'overlay',museumPhase:180,museumX:0,museumDiameter:100,museumWavelength:550,museumCamera:'paper',museumCase:1,museumPath:1,museumDamping:true,museumFit:false,museumTargets:true,museumPopulation:false},
    tasks:[
      {t:'Oldenburg’s Figure 1a: Thesis Au reproduces all four stated geometries with one shared vertical scale. In Figure 3, compare Paper sizes, Single size and Size spread. Targets shows the experimental data; the Size spread lesson button compares the mean particle.',s:{museumFigure:'oldenburg-1a',museumCase:20,museumWavelength:735,museumDamping:true,museumFit:false}},
      {t:'Compare Mie’s electric and magnetic dipoles. Reset restores the printed orientation and arrow phase. Move the phase slider, then open the same mode in lesson 00.',s:{museumFigure:'mie-3',museumPhase:180,museumOpacity:.65,museumCamera:'paper'}},
      {t:'In Mie’s Figure 14, select a curve to inspect Paper settings. The separate button opens that spectrum in lesson 05.',s:{museumFigure:'mie-14',museumDiameter:100,museumWavelength:550,museumOpacity:.65}},
      {t:'Blumer’s Paper scale compares i₁ and i₂ separately on the absolute linear scale. Change x, then compare with the polarized 3D view.',s:{museumFigure:'blumer-2',museumX:1.6,museumOpacity:.65,museumCamera:'paper'}},
      {t:'Rayleigh’s Figure 2: move the relative path slider. Blue light is removed first, leaving red transmission.',s:{museumFigure:'rayleigh-2',museumPath:8,museumOpacity:.7}},
      {t:'Compare the two Zhang panels: parallel polarization red-shifts the absorption peak as the gap closes; perpendicular polarization weakly blue-shifts and suppresses it.',s:{museumFigure:'zhang-1b',museumCase:4,museumWavelength:585,museumOpacity:.65}}],
    ideas:'<p>Original paper figures sit behind colour curves or 3D views generated by the app’s own solvers. Paper settings records the selected simulation; a separate button opens the corresponding lesson. Original-paper links and the conventions for each exhibit are in ⓘ / About this exhibit.</p><p>Mie’s multipoles start with y normal to the screen and x upwards. Blumer’s Paper scale uses separate polarization components and absolute linear radii; 3D view uses linearly polarized light. Rayleigh uses relative normalization, Oldenburg’s arbitrary ordinate uses explicit per-curve amplitude registration, and Zhang retains absolute power per sphere.</p>'};
  ENG.museum={nav:'Museum',title:'Museum: a century of light scattering',
    concept:'See the app’s simulations over the original figures. Explore the phase, particle size or light path while the picture and current settings stay in view.',
    tasks:LESSONS.museum.tasks.map(t=>t.t),
    ideas:LESSONS.museum.ideas};

  const farParticleControl=document.createElement('div');farParticleControl.className='checks';farParticleControl.id='farParticleWrap';farParticleControl.innerHTML='<label class="check"><input type="checkbox" id="farParticle"> Show particle</label>';$('radial').parentElement.append(farParticleControl);
  // Explanation level ('phys' or 'eng'): a viewing preference, kept across visits; a link may set it.
  // DEFAULT_LEVEL is the level for first-time visitors; build.cjs sets it to 'eng' for the Netlify build.
  const materialNote=document.createElement('div');materialNote.id='materialDatasetNote';materialNote.className='material-dataset-note';materialNote.hidden=true;$('sources').after(materialNote);let materialNoteKey='';
  MieGuides.prepare(LESSONS,ENG);
  const DEFAULT_LEVEL='phys';
  let level=DEFAULT_LEVEL;try{const v=localStorage.getItem('mie-level');if(v==='phys'||v==='eng')level=v;}catch{}
  const eng=()=>level==='eng',lv=(p,e)=>eng()?e:p;
  const navName=k=>eng()?ENG[k].nav:LESSONS[k].nav;
  // Clickable detector: off by default (Detector tab switch); remembered, and links may carry it.
  let detOn=false;try{detOn=localStorage.getItem('mie-detector')==='1';}catch{}
  const detClick=()=>detOn?' Click to move the detector.':'';
  const ORDER=Object.keys(LESSONS);
  const BASE={x:5,n:1.5,k:0,auto:true,N:14,sE:true,sM:true,solo:0,pol:'x',view:'far',radial:'log',farDb:40,museumBookX:0,quantity:'re',slice:'xz',total:false,vectors:true,region:null,R:8,pN:3,pE:true,pM:true,
    hA:{n:1,t:'N'},hBOn:false,hB:{n:1,t:'M',amp:1,phase:0},theta:90,phi:0,r:2,dComp:0,graph:null,fwd:true,scale:{angular:true,polar:false,qxR:true,qx:false,spectrum:false},
    units:'dim',struct:'homog',q:0.7,nc:1.45,kc:0,wl:550,wlMin:300,wlMax:2000,rad:100,core:50,shell:10,sizeBy:'r',mat:'au',matCore:'sio2',med:'water',cn:1.5,ck:0,ccn:1.45,cck:0,cmed:1.33,museumAgMaterial:'agRakicLD',surfaceOn:false,surfaceA:1,popOn:false,popShape:'lognormal',popSize:10,popShell:10,popBeads:'independent',popQuality:'standard',showParticle:true,farParticle:false,report:'q',mpoles:false,angPolar:false,scaleBar:false,swatch:true,swPhi:3e-6,tSet:false,tL:40,ta:60,tb:30,dFam:'au,ag,cu,si,sio2au,sio2ag,auag,agau',dMetric:'2000',dMed:'water',dSel:'auto',ns:2,gap:0.5,gapNm:10,axis:'x',origin:0,msAll:true,msK:0,avg:false};
  // Spectral range: within the 300-2000 nm covered by the material data.
  const WL=[300,2000],WLPRESETS=[['Full',300,2000],['UV–vis',300,800],['Visible',380,750],['Near IR',700,2000]];
  const fresh=lesson=>({...structuredClone(BASE),...structuredClone(LESSONS[lesson].defaults),lesson});
  // Animation speed is a viewing preference, kept across lessons (and visits when storage allows).
  let speed=1;try{speed=+localStorage.getItem('mie-speed')||1;}catch{}
  let S=fresh('mie'),C=null,Ckey='',scene=null,plot=null,inspector=null,phase=0,play=!reducedMotion,buildTimer=null;
  const memory={};
  // The optional population layer leaves the original single-size path intact.
  const populationJobs={},populationFields=['surfaceOn','surfaceA','lesson','struct','mat','matCore','med','cn','ck','ccn','cck','cmed','rad','core','shell','ns','gapNm','axis','pol','avg','popShape','popSize','popShell','popBeads','popQuality'];
  const populationActive=()=>['real','chain'].includes(S.lesson)&&S.units!=='dim'&&S.popOn;
  const populationConfig=()=>Object.fromEntries(populationFields.map(k=>[k,S[k]]));
  const populationNote=document.createElement('div');populationNote.id='populationSceneNote';populationNote.hidden=true;$('scene').append(populationNote);
  const populationCancel=type=>{const j=populationJobs[type];if(j){clearTimeout(j.timer);j.worker?.terminate();delete populationJobs[type];}};
  const populationDraw=()=>{if(!populationActive())return;renderScene();metrics();renderGraph();renderSwatch();populationStatus();};
  function populationJob(type){
    const config=populationConfig();if(type==='current')config.wl=S.wl;
    const n=S.lesson==='chain'?{quick:31,standard:81,fine:161}[S.popQuality]:{quick:81,standard:201,fine:401}[S.popQuality];
    const wavelengths=type==='colour'?Array.from(SW_WL):type==='spectrum'?Array.from({length:n},(_,i)=>S.wlMin+(S.wlMax-S.wlMin)*i/(n-1)):null;
    const key=JSON.stringify([config,wavelengths]);if(populationJobs[type]?.key===key)return populationJobs[type];
    populationCancel(type);const job=populationJobs[type]={key,progress:0,data:null,rows:[],done:false,error:null};
    job.timer=setTimeout(()=>{
      try{
        const url=URL.createObjectURL(new Blob([MiePopulationWorkerSource],{type:'text/javascript'}));job.worker=new Worker(url);URL.revokeObjectURL(url);
        job.worker.onmessage=event=>{if(populationJobs[type]!==job)return;const d=event.data;if(d.error){job.error=d.error;job.done=true;}if(d.data)job.data=d.data;if(d.rows)job.rows=d.rows;job.preview=!!d.preview;job.done=!!d.done||!!d.error;job.progress=d.progress??(job.done?1:job.progress);if(job.done)job.worker.terminate();populationDraw();};
        job.worker.onerror=()=>{job.error='The background population calculation could not run. Reload the page and try again.';job.done=true;job.worker.terminate();populationDraw();};
        job.worker.postMessage({type,config,wavelengths});
      }catch(e){job.error=e.message;job.done=true;populationDraw();}
    },type==='current'?50:180);return job;
  }
  function populationSync(){
    if(!['quick','standard','fine'].includes(S.popQuality))S.popQuality='standard';if(!['lognormal','gaussian'].includes(S.popShape))S.popShape='lognormal';if(!['independent','shared'].includes(S.popBeads))S.popBeads='independent';
    for(const k of ['popSize','popShell'])S[k]=Number.isFinite(+S[k])?clamp(+S[k],0,50):10;
    const available=['real','chain'].includes(S.lesson),active=populationActive(),controls=$('populationControls');controls.hidden=!available;
    $('populationOn').checked=active;$('populationOn').disabled=S.units==='dim';$('populationUnits').hidden=S.units!=='dim';$('populationBody').hidden=!active;
    $('populationSummary').textContent=active?`${S.popShape==='gaussian'?'Gaussian':'Lognormal'} · ${S.popSize} %${cs()?` / ${S.popShell} %`:''}`:'off';
    for(const [id,key] of [['populationShape','popShape'],['populationSize','popSize'],['populationShell','popShell'],['populationBeads','popBeads'],['populationQuality','popQuality']])$(id).value=S[key];
    $('populationSizeValue').textContent=`${S.popSize} %`;$('populationShellValue').textContent=`${S.popShell} %`;$('populationSizeLabel').textContent=cs()?'Core size spread':'Particle size spread';$('populationShellWrap').hidden=!cs();$('populationBeadsWrap').hidden=S.lesson!=='chain';$('populationChainNote').hidden=S.lesson!=='chain';
    $('populationExplanation').textContent=`The size sliders above set arithmetic number means. Spread = standard deviation / mean.${cs()?' Core size and shell thickness vary independently.':''}${S.lesson==='chain'&&S.popBeads==='shared'?' Within each chain all beads share one core/size and one thickness; these vary between chains.':''}`;
    document.body.dataset.population=String(active);populationNote.hidden=!active;
    if(active)$('radLabel').insertAdjacentText('afterbegin','Mean ');
    $('shellNum').closest('label').querySelector('span').innerHTML=(active?'Mean shell thickness':'Shell thickness')+' <i>t</i>';
    const series=document.querySelector('[data-group="series"]');series.hidden=active||!lesson().groups.includes('series');
    if(active){populationJob('current');populationJob('spectrum');if(S.lesson==='real'&&S.swatch)populationJob('colour');else populationCancel('colour');}
    else for(const type of Object.keys(populationJobs))populationCancel(type);
    populationStatus();
  }
  function populationStatus(){
    if(!populationActive())return;
    const c=populationJobs.current,p=populationJobs.spectrum,e=Object.values(populationJobs).find(j=>j.error);
    $('populationStatus').dataset.error=String(!!e);
    $('populationStatus').textContent=e?e.error:c?.data?`${c.data.count} ${S.lesson==='chain'?'chain realizations':'quadrature combinations'}${c.preview?' · quick preview':''}. ${p?.done?'Spectrum complete.':`Refining spectrum${p?.progress?` (${Math.round(100*p.progress)} %)`:'…'}`}${S.lesson==='real'&&S.swatch&&!populationJobs.colour?.done?' Colours are calculating.':''}`:'Calculating the size distribution…';
  }
  function populationScene(){
    if(!populationActive())return null;
    const j=populationJobs.current;
    if(S.view==='near'){populationNote.textContent='Near field: example at the mean sizes · graphs show the population';return null;}
    if(!j?.data){populationNote.textContent=j?.error?'Population unavailable · mean-size preview':'Mean-size preview · calculating distribution…';return null;}
    const d=j.data;populationNote.textContent=`Number-averaged far field${j.preview?' · quick preview':''}${d.fixedPattern?' · fixed chain orientation':''}`;
    info(`Size distribution · ${d.count} samples · ${S.popShape} · ${S.popSize} %${cs()?` core / ${S.popShell} % shell`:''}${d.fixedPattern?' · tumbling average applies to cross sections':''}`);
    let particle={r:.16,show:S.farParticle};if(S.lesson==='chain'){const u=Math.min(.16,.5/(halfLen()+shiftA()));particle={show:S.farParticle,spheres:centres().map(c=>({c:c.map(w=>w*u),r:u}))};}if(S.farParticle)populationNote.textContent+=' · particle shown at mean size';
    return {kind:'pattern',T:d.T,P:d.P,values:d.values,radial:S.radial,db:S.farDb||40,particle};
  }
  function populationMetrics(){
    if(!populationActive())return false;
    const d=populationJobs.current?.data,err=populationJobs.current?.error;
    $('partialBadge').hidden=true;
    if(!d){$('metrics').innerHTML=`<div class="metric"><span>Size distribution</span><b>${err?'Unavailable':'Calculating…'}</b><small>${err||'Number average of absolute cross sections'}</small></div>`;return true;}
    const q=S.report==='q',f=q?1/d.area:1,val=v=>q?Fmt.num(v*f,4):area(v),note=q?'⟨C⟩ / ⟨projected area⟩':`per ${S.lesson==='chain'?'chain':'particle'} · number average`;
    $('metrics').innerHTML=[['ext',d.ext],['sca',d.sca],['abs',d.abs]].map(([n,v])=>`<div class="metric"><span>${q?`Q<sup>pop</sup><sub>${n}</sub>`:`⟨C<sub>${n}</sub>⟩`}</span><b>${val(v)}</b><small>${note}</small></div>`).join('')+`<div class="metric"><span>Population</span><b>${S.popShape==='gaussian'?'Gaussian':'Lognormal'}</b><small>${S.popSize} % size SD${cs()?` · ${S.popShell} % thickness SD`:''}${S.lesson==='chain'&&S.avg?' · random orientation':''}</small></div>`;
    return true;
  }
  function populationGraph(){
    if(!populationActive())return false;
    $('plotWrap').hidden=false;$('detector').hidden=true;$('mpWrap').hidden=true;$('polarWrap').hidden=true;$('dataBtn').hidden=false;
    const angular=S.graph==='angular',j=populationJobs[angular?'current':'spectrum'],rows=angular?j?.data?.angular:j?.rows,q=S.report==='q'&&!angular;
    const names=angular?(S.lesson==='chain'?['xz plane','yz plane']:['I∥','I⊥']):['Extinction','Scattering','Absorption'],cols=[color('s1'),color('s2'),color('s3')];
    let series=[],max=1,min=1e-12;
    if(rows?.length){series=names.map((name,i)=>({name,color:cols[i],width:2,points:angular?rows[i]:rows.map(r=>[r.wl,r[['ext','sca','abs'][i]]*(q?1/r.area:1e-6)])}));max=Math.max(1e-30,...series.flatMap(v=>v.points.map(p=>p[1])));min=Math.max(max*1e-9,Math.min(...series.flatMap(v=>v.points.map(p=>p[1])).filter(x=>x>0)));}
    const log=!!S.scale[angular?'angular':'spectrum'];$('logYWrap').hidden=false;$('logY').checked=log;
    plot?.set({type:'xy',x:{min:angular?0:S.wlMin,max:angular?180:S.wlMax,label:angular?'scattering angle θ (degrees)':'vacuum wavelength λ₀ (nm)'},y:{min:log?min*.5:0,max:log?max*2:max*1.08,log,label:angular?'⟨dσ/dΩ⟩ (nm²/sr)':q?'⟨C⟩ / ⟨projected area⟩':'⟨cross section⟩ (µm²)'},series,legend:series.map(v=>({name:v.name,color:v.color})),vlines:angular?[]:[{x:S.wl,color:color('probe'),label:`${S.wl} nm`}]});
    const convergence=j?.done?'':angular?' · calculating…':` · refining${j?.progress?` ${Math.round(100*j.progress)} %`:'…'}`;
    $('graphCaption').textContent=j?.error?j.error:`Number-averaged ${angular?'absolute intensity':'cross sections'} of the ${S.popShape==='gaussian'?'positive Gaussian':'lognormal'} population. ${S.lesson==='chain'?(S.avg&&!angular?'Random chain orientations. ':'Fixed chain orientation. ')+'The gap is fixed between neighbouring surfaces. ':''}Mean dimensions are set by the size sliders.${convergence}`;
    table=angular?{title:'Population angular intensity',cols:['theta_deg',...names.map(n=>n+'_nm2_per_sr')],rows:rows?.[0]?.map((p,i)=>[p[0],p[1],rows[1][i][1]])||[]}: {title:'Population spectrum',cols:['wavelength_nm','Cext_nm2','Csca_nm2','Cabs_nm2','mean_projected_area_nm2','Qext'],rows:j?.rows.map(r=>[r.wl,r.ext,r.sca,r.abs,r.area,r.ext/r.area])||[]};
    return true;
  }
  function populationSwatch(){
    if(!populationActive()||S.lesson!=='real')return null;
    const j=populationJobs.colour;if(!j?.done||j.error||!j.rows.length)return false;
    const key=j.key+'|'+S.swPhi;if(swKey===key&&swJob)return swJob;
    clearTimeout(swTimer);swWorker?.terminate();swWorker=null;swKey=key;
    const lam=j.rows.map(r=>({mus:S.swPhi/r.volume*r.sca*1e7,mua:S.swPhi/r.volume*r.abs*1e7,table:r.table,n:0,T:0,R:0,S:0}));
    const tau=Math.max(...lam.map(l=>l.mus));swJob={key,lam,tau,rand:MC.rng(1),done:false,target:3000,ms:0,count:0,next:0};if(tau<1e-7){lam.forEach(l=>{l.n=1;l.T=Math.exp(-l.mua);});swJob.done=true;}return swJob;
  }
  $('populationOn').onchange=e=>{S.popOn=e.target.checked;if(S.popOn){S.auto=true;S.sE=S.sM=true;S.solo=0;S.mpoles=false;S.msAll=true;if(!['angular','spectrum'].includes(S.graph))S.graph='spectrum';}refresh(true);};
  for(const [id,key] of [['populationShape','popShape'],['populationBeads','popBeads'],['populationQuality','popQuality']])$(id).onchange=e=>{S[key]=e.target.value;refresh();};
  for(const [id,key] of [['populationSize','popSize'],['populationShell','popShell']])$(id).oninput=e=>{S[key]=+e.target.value;refresh();};


  const surfaceControls=document.createElement('section');surfaceControls.id='surfaceControls';surfaceControls.className='surface-controls';surfaceControls.innerHTML='<label class="check"><input id="surfaceOn" type="checkbox"> Size-dependent electron scattering</label><div id="surfaceOptions" hidden><label>Boundary factor A <output id="surfaceAValue"></output><input id="surfaceA" type="range" min="0" max="3" step="0.05" value="1"></label><p id="surfaceExplanation"></p><details><summary>Model and limits</summary><div id="surfaceParameters"></div><p>The measured dielectric function is retained, except for its free-electron Drude damping. The extra width is AℏvF/L, with L = 4V/S. A spherical core uses L = 4r/3; a shell includes its inner and outer surfaces. A = 1 is a diffuse-boundary model, not a measured value for every interface. Distributions use each member’s dimensions. Radiative damping is already present in Mie theory.</p><p>For Pt and Pd the velocity is an effective single-band estimate. For Mg and Li the Drude decomposition is fitted in the near infrared. Treat these as sensitivity calculations. This local model does not describe atomic structure, tunnelling, or quantum confinement.</p><a href="https://doi.org/10.1186/s11671-018-2670-7" target="_blank" rel="noopener">Shell model and experiment</a></details></div>';$('sources').after(surfaceControls);
  $('surfaceOn').onchange=e=>{S.surfaceOn=e.target.checked;refresh(true);};$('surfaceA').oninput=e=>{S.surfaceA=+e.target.value;refresh(true);};
  function syncSurface(){const parent=designOn()?$('dFamBox').parentElement:$('sources').parentElement;if(surfaceControls.parentElement!==parent)parent.append(surfaceControls);const ids=designOn()?famSel().flatMap(id=>{const f=MDes.fam(id);return f.kind==='sphere'?[f.mat]:[f.core,f.shell];}):[S.mat,...(cs()?[S.matCore]:[])];surfaceControls.hidden=!(designOn()||phys())||!ids.some(id=>MieSurface.supported(id));$('surfaceOn').checked=!!S.surfaceOn;$('surfaceOptions').hidden=!S.surfaceOn;$('surfaceA').value=S.surfaceA;$('surfaceAValue').textContent=Fmt.num(S.surfaceA,3);$('surfaceParameters').replaceChildren(...[...new Set(ids)].filter(id=>MieSurface.supported(id)).map(id=>{const d=MieSurface.parameters(id),p=document.createElement('p');p.textContent=Materials.DB[id].name+': Eₚ = '+Fmt.num(d.plasma,4)+' eV; Γ₀ = '+Fmt.num(d.gamma,4)+' eV; vF = '+Fmt.num(d.vf/1e6,4)+' × 10⁶ m/s'+(d.estimatedVelocity?' (effective single-band estimate)':'')+(d.effectiveFit?'; NIR decomposition relative RMS '+Fmt.num(100*d.relativeRms,3)+'%; treat as a sensitivity model.':'.');return p;}));$('surfaceExplanation').textContent=designOn()?'Applied consistently to the candidate spectra, search and Lightbox samples.':'Applied to each supported metallic layer. The tabulated optical constants remain the default.';}

  /* ---------- derived quantities ---------- */
  const lesson=()=>LESSONS[S.lesson];
  const mieLesson=()=>['rayleigh','mie','large','real','tmat','chain'].includes(S.lesson);
  const clusterLesson=()=>S.lesson==='tmat'||S.lesson==='chain';
  const cs=()=>S.struct==='cs';
  // Physical units: vacuum wavelength, radius in nm and measured materials define x and m.
  const phys=()=>mieLesson()&&S.units!=='dim';
  const mediumN=wl=>S.med==='custom'?S.cmed:Materials.medium(S.med,wl).n;
  const matNK=(id,wl,cn,ck,radius=S.rad,core=0)=>id==='custom'?{n:cn,k:ck,inRange:true}:MieSurface.nk(id,wl,radius,core,S);
  function materialDomain(){
    let lo=WL[0],hi=WL[1];
    for(const id of [S.mat,...(cs()?[S.matCore]:[])])if(Materials.DB[id]?.strictRange){const r=Materials.range(id);lo=Math.max(lo,Math.ceil(r[0]));hi=Math.min(hi,Math.floor(r[1]));}
    if(Materials.MEDIA[S.med]?.strictRange){const r=Materials.range(S.med,true);lo=Math.max(lo,Math.ceil(r[0]));hi=Math.min(hi,Math.floor(r[1]));}
    return [lo,hi];
  }
  function describeMaterialData(){
    const ids=[...new Set([S.mat,...(cs()?[S.matCore]:[])])].filter(id=>Materials.DB[id]?.sourceInfo),on=phys()&&ids.length>0;
    materialNote.hidden=!on;if(!on)return;
    const [lo,hi]=materialDomain(),key=ids.join('|')+'|'+lo+'|'+hi;if(key===materialNoteKey)return;materialNoteKey=key;materialNote.replaceChildren();
    const limits=document.createElement('p');limits.textContent=`Available wavelength range for this selection: ${lo}–${hi} nm. Spectra and wavelength controls stay within the supported data.`;materialNote.append(limits);
    for(const id of ids){const m=Materials.DB[id],p=document.createElement('p'),b=document.createElement('b');b.textContent=m.name+' · '+m.sourceInfo.year+'. ';p.append(b,document.createTextNode(m.sourceInfo.conditions+' '+m.sourceInfo.notes));const a=document.createElement('a');a.href='https://doi.org/'+m.doi;a.target='_blank';a.rel='noopener noreferrer';a.textContent=' Paper ↗';p.append(a);materialNote.append(p);}
  }
  // Core-shell sizes: core radius and shell thickness are the inputs; the outer radius follows.
  function physAt(wl,core=S.core,shell=S.shell){
    const rad=cs()?core+shell:S.rad,sameMetal=cs()&&S.mat===S.matCore&&MieSurface.supported(S.mat),nm=mediumN(wl),p=S.mat==='auOldenburg'?MuseumStudies.oldenburgGold(wl,cs()?shell:S.rad):matNK(S.mat,wl,S.cn,S.ck,rad,cs()&&!sameMetal?core:0),out={x:TAU*nm*rad/wl,n:p.n/nm,k:p.k/nm,nmed:nm,ok:p.inRange};
    if(cs()){const c=matNK(S.matCore,wl,S.ccn,S.cck,sameMetal?rad:core);Object.assign(out,{q:core/rad,nc:c.n/nm,kc:c.k/nm,ok:out.ok&&c.inRange});}
    return out;
  }
  // Outer-radius range of the lesson, capped so that x <= 200 at the shortest wavelength in use.
  function radRange(){const [lo,hi]=lesson().phys?.range||[5,5000],wl=S.units==='spec'?S.wlMin:S.wl;return [lo,Math.max(lo,Math.min(hi,(clusterLesson()?xRange()[1]:200)*wl/(TAU*mediumN(wl))))];}
  // Range of the size the user sets: the radius, or for core-shell the core radius.
  function primaryRange(){const [lo,hi]=radRange();return cs()?[Math.min(lo,1),Math.max(Math.min(lo,1),hi-S.shell)]:[lo,hi];}
  // Unpolarized light has no instantaneous field: Re E falls back to the signed intensity change
  // (and returns when a linear polarization is chosen again).
  const shownQuantity=()=>!mieLesson()&&S.quantity==='dI'?'re':S.pol==='unpol'&&mieLesson()&&S.quantity==='re'?'dI':S.quantity;
  const dia=()=>S.sizeBy==='d',sz=r=>dia()?2*r:r,sizeWord=(core)=>`${core?'core ':''}${dia()?'diameter':'radius'}`;
  // Shell slider range: up to 1.5 core radii (at least 50 nm), keeping the outer radius in range.
  const shellMax=()=>{const hi=radRange()[1];return Math.max(1,Math.min(hi-Math.min(S.core,hi*.9),Math.max(50,1.5*S.core)));};
  function derive(){
    if(!phys())return;
    const [dataLo,dataHi]=materialDomain();if(S.wlMin>dataHi-20||S.wlMax<dataLo+20){S.wlMin=dataLo;S.wlMax=dataHi;}
    S.wlMin=clamp(Math.round(S.wlMin),dataLo,dataHi-20);S.wlMax=clamp(Math.round(S.wlMax),S.wlMin+20,dataHi);S.wl=clamp(Math.round(S.wl),S.wlMin,S.wlMax);
    const [lo,hi]=radRange();
    if(cs()){S.shell=clamp(S.shell,0,hi*0.95);S.core=clamp(S.core,0,Math.max(0,hi-S.shell));S.rad=S.core+S.shell;if(S.rad<lo){S.core=lo-S.shell;S.rad=lo;}}
    else S.rad=clamp(S.rad,lo,hi);
    if(clusterLesson())S.gapNm=+clamp(S.gapNm,.05*S.rad,6*S.rad).toPrecision(3);
    const p=physAt(S.wl);S.x=p.x;S.n=p.n;S.k=p.k;if(cs()){S.q=p.q;S.nc=p.nc;S.kc=p.kc;}
  }
  const particleAt=(x,m=[S.n,S.k])=>cs()?M.coreShell(S.q*x,x,[S.nc,S.kc],m):M.withInterior(M.coefficients(x,m));
  function coef(){const key=`${S.x}|${S.n}|${S.k}|${S.struct}|${S.q}|${S.nc}|${S.kc}`;if(key!==Ckey){C=particleAt(S.x);Ckey=key;}return C;}
  const rayleighNow=(x=S.x)=>cs()?M.rayleighCoated(x,S.q,[S.nc,S.kc],[S.n,S.k]):M.rayleigh(x,[S.n,S.k]);
  // Absolute cross sections: C = Q pi a^2 with a the outer radius in nm.
  const useC=()=>phys()&&S.report==='c';
  function area(v){if(!Number.isFinite(v))return '—';return Math.abs(v)>=1e5?`${Fmt.num(v/1e6,3)} µm²`:`${Fmt.num(v,3)} nm²`;}
  const areaUnit=max=>max>=1e5?['µm²',1e-6]:['nm²',1];
  const seriesOn=()=>lesson().groups.includes('series');
  const Neff=()=>!seriesOn()||S.auto?C.N:clamp(S.N,1,C.N);
  function opts(full=false){
    const base={angle:S.pol==='y'?Math.PI/2:0,unpolarized:S.pol==='unpol'};
    if(full||!seriesOn())return {...base,N:C.N};
    return {...base,N:Neff(),electric:S.sE,magnetic:S.sM,solo:S.solo};
  }
  const isPartial=()=>seriesOn()&&(Neff()<C.N||!S.sE||!S.sM||!!S.solo);
  const hCoef=()=>{const cn=Array.from({length:11},()=>[0,0]),cm=Array.from({length:11},()=>[0,0]);(S.hA.t==='N'?cn:cm)[S.hA.n][0]+=1;
    if(S.hBOn){const z=M.scale(M.phase(S.hB.phase*DEG),S.hB.amp),t=(S.hB.t==='N'?cn:cm)[S.hB.n];t[0]+=z[0];t[1]+=z[1];}return {cn,cm};};
  const regionRange=()=>clusterLesson()?[halfLen()+shiftA()+.15,Math.max(8,3*(halfLen()+shiftA()))]:[1.5,Math.min(400,Math.max(6,40/S.x))];
  // Default view: about a wavelength in the Rayleigh lesson (near zone to radiation), else 3a around the particle.
  const region=()=>{const [a,b]=regionRange();return clamp(S.region??(clusterLesson()?halfLen()+shiftA()+1.6:S.lesson==='rayleigh'?Math.max(3,6/S.x):3),a,b);};
  const nearAllowed=()=>clusterLesson()?S.x*halfLen()<=30:S.x<=60;
  const timeView=()=>S.view==='near'||S.view==='sphere'||S.view==='wave';
  const xRange=()=>lesson().xRange||[0.05,200];

  /* ---------- lesson switching ---------- */
  function setLesson(name,reset=false){
    stopBuild();if(S.lesson)memory[S.lesson]=structuredClone(S);
    S=!reset&&memory[name]?structuredClone(memory[name]):fresh(name);
    if(!S.graph)S.graph=lesson().graphs[0][0];
    $('tasks').open=true;buildStatic();refresh(true);scene?.home(homeKind());
  }
  function applyTask(task){
    stopBuild();Object.assign(S,structuredClone(task.s));if(task.s.region===null)S.region=null;
    if('x' in task.s&&!('N' in task.s))S.N=M.nstop(S.x);if('tL' in task.s)S.tSet=true;
    if('wl' in task.s&&(S.wl<S.wlMin||S.wl>S.wlMax)){S.wlMin=WL[0];S.wlMax=WL[1];}
    refresh(true);scene?.home(homeKind());if(task.focus)scene?.focusDirection(S.theta*DEG,S.phi*DEG,task.focus);if(task.build)startBuild();
  }
  function homeKind(){return S.view==='near'||S.view==='wave'?S.slice:S.view==='sphere'?'sphere':'far';}

  /* ---------- static per-lesson UI ---------- */
  function buildStatic(){
    document.body.dataset.museum=String(S.lesson==='museum');
    const museumMode=S.lesson==='museum';$('tasks').hidden=museumMode;$('ideasBox').hidden=museumMode;
    $('menu').querySelector('[data-act="image3d"]').textContent=museumMode?'Save Museum image (PNG)':'Save 3D image (PNG)';
    $('menu').querySelector('[data-act="imageGraph"]').hidden=museumMode;
    const L=lesson();
    $('lessonNav').querySelectorAll('button').forEach(b=>{const on=b.dataset.lesson===S.lesson;b.classList.toggle('on',on);b.setAttribute('aria-current',on?'page':'false');});
    const on=$('lessonNav').querySelector('.on'),nav=$('lessonNav');if(on)nav.scrollLeft=Math.max(0,on.offsetLeft-(nav.clientWidth-on.offsetWidth)/2);
    const E=eng()?ENG[S.lesson]:L;
    $('lessonNo').textContent=L.no;$('lessonTitle').textContent=E.title;$('lessonConcept').innerHTML=E.concept;
    $('guideOrientation').innerHTML=MieGuides.orientation(S.lesson,level);
    document.querySelectorAll('.group').forEach(g=>g.hidden=!L.groups.includes(g.dataset.group));
    $('viewSeg').innerHTML=L.views.map(([v,l])=>`<button data-v="${v}" role="radio">${l}</button>`).join('');
    tabsKey='';
    $('xSlider').min=Math.log10(xRange()[0]);$('xSlider').max=Math.log10(xRange()[1]);$('xNum').min=xRange()[0];$('xNum').max=xRange()[1];
    $('xPresets').innerHTML=(L.xPresets||[]).map(v=>`<button data-x="${v}">${v}</button>`).join('');
    presetKey='';
    $('taskList').innerHTML=L.tasks.map((t,i)=>`<li><p>${eng()?E.tasks[i]:t.t}</p>${MieGuides.task(S.lesson,i,level)}<button class="btn-quiet small" data-task="${i}">Set up ↗</button></li>`).join('');
    $('ideas').innerHTML=MieGuides.explain(S.lesson,level)+E.ideas;document.title=`Colour with Mie · ${navName(S.lesson)}`;
  }
  // Switches every explanation between the Physics and Engineering texts (sidebar hints, lessons, theory).
  function renderNav(){$('lessonNav').innerHTML=ORDER.map(k=>`<button data-lesson="${k}"><span>${LESSONS[k].no}</span>${navName(k)}</button>`).join('');}
  function applyLevel(){
    setSeg('level',level);
    document.querySelectorAll('[data-eng]').forEach(el=>{el.dataset.phys??=el.innerHTML;el.innerHTML=eng()?el.dataset.eng:el.dataset.phys;});
    document.querySelectorAll('#theory [data-level]').forEach(el=>el.hidden=el.dataset.level!==level);
    renderNav();
  }

  // The spectrum needs physical units; its tab is offered only then.
  let tabsKey='',presetKey='';
  const graphList=()=>lesson().graphs.filter(([g])=>(g!=='spectrum'||phys())&&(!populationActive()||['angular','spectrum'].includes(g))); 
  function renderTabs(){
    const list=graphList(),key=S.lesson+list.map(g=>g[0]).join();if(!list.some(([g])=>g===S.graph))S.graph=list[0][0];
    if(key!==tabsKey){tabsKey=key;$('graphTabs').innerHTML=list.map(([g,l])=>`<button data-g="${g}" role="tab">${g==='qx'&&phys()?'Q vs radius':l}</button>`).join('');}
  }

  /* ---------- control sync ---------- */
  const setSeg=(id,v)=>$(id).querySelectorAll('button').forEach(b=>{const on=b.dataset.v===v;b.classList.toggle('on',on);b.setAttribute('aria-checked',String(on));});
  const fill=el=>el.style.setProperty('--pct',`${100*(el.value-el.min)/(el.max-el.min)}%`);
  function syncControls(){
    MuseumSpectra.sync(S);
    const c=coef(),unpol=S.pol==='unpol';
    // harmonics
    setSeg('hAType',S.hA.t);$('hAn').value=S.hA.n;$('hAnV').textContent=S.hA.n;$('hAName').innerHTML=`${S.hA.t}${sub(S.hA.n)}: ${S.hA.t==='N'?'electric':'magnetic'} ${pole(S.hA.n)}`;
    $('hBOn').checked=S.hBOn;$('hB').hidden=!S.hBOn;setSeg('hBType',S.hB.t);$('hBn').value=S.hB.n;$('hBnV').textContent=S.hB.n;$('hBamp').value=S.hB.amp;$('hBampV').textContent=S.hB.amp.toFixed(2);$('hBphase').value=S.hB.phase;$('hBphaseV').textContent=`${S.hB.phase}°`;
    // plane
    $('pN').value=S.pN;$('pNV').textContent=S.pN;$('pR').value=S.R;$('pRV').textContent=S.R;$('pE').checked=S.pE;$('pM').checked=S.pM;
    // particle
    $('xSlider').value=Math.log10(S.x);if(document.activeElement!==$('xNum'))$('xNum').value=+S.x.toPrecision(4);
    if(document.activeElement!==$('nNum'))$('nNum').value=S.n;if(document.activeElement!==$('kNum'))$('kNum').value=S.k;
    $('xPresets').querySelectorAll('button').forEach(b=>b.classList.toggle('on',Math.abs(+b.dataset.x-S.x)<1e-9));
    const mat=MATERIALS.findIndex(([,n,k])=>Math.abs(n-S.n)<1e-9&&Math.abs(k-S.k)<1e-9);$('material').value=mat<0?'':String(mat);
    setSeg('units',S.units);setSeg('struct',S.struct);setSeg('report',S.report);
    document.querySelectorAll('[data-units]').forEach(el=>el.hidden=(el.dataset.units==='dim')===phys());
    document.querySelectorAll('[data-cs]').forEach(el=>el.hidden=!cs());
    document.querySelectorAll('[data-cs-text]').forEach(el=>{el.dataset.plain??=el.textContent;el.textContent=cs()?el.dataset.csText:el.dataset.plain;});
    $('qSlider').value=S.q;$('qV').textContent=S.q.toFixed(2);
    for(const [id,key] of [['ncNum','nc'],['kcNum','kc'],['cmedNum','cmed'],['cnNum','cn'],['ckNum','ck'],['ccnNum','ccn'],['cckNum','cck']])if(document.activeElement!==$(id))$(id).value=+(+S[key]).toPrecision(5);
    $('wlSlider').min=S.wlMin;$('wlSlider').max=S.wlMax;$('wlSlider').value=S.wl;$('wlNum').min=S.wlMin;$('wlNum').max=S.wlMax;if(document.activeElement!==$('wlNum'))$('wlNum').value=S.wl;
    const [dataLo,dataHi]=phys()?materialDomain():WL;$('wlMinNum').min=dataLo;$('wlMinNum').max=dataHi-20;$('wlMaxNum').min=dataLo+20;$('wlMaxNum').max=dataHi;describeMaterialData();
    for(const [id,key] of [['wlMinNum','wlMin'],['wlMaxNum','wlMax']])if(document.activeElement!==$(id))$(id).value=S[key];
    $('wlPresets').querySelectorAll('button').forEach(b=>{const lo=Math.max(dataLo,+b.dataset.lo),hi=Math.min(dataHi,+b.dataset.hi);b.disabled=hi-lo<20;b.title=`${lo}–${hi} nm within the selected material data`;b.classList.toggle('on',lo===S.wlMin&&hi===S.wlMax);});
    setSeg('sizeBy',S.sizeBy);
    $('medSel').value=S.med;$('matSel').value=S.mat;$('coreSel').value=S.matCore;
    document.querySelector('[data-custom="med"]').hidden=S.med!=='custom';document.querySelector('[data-custom="mat"]').hidden=S.mat!=='custom';document.querySelector('[data-custom="core"]').hidden=S.matCore!=='custom';
    // Size controls show the radius or the diameter; for core-shell the core is set and the shell added.
    const [plo,phi]=primaryRange(),prim=cs()?S.core:S.rad,lp=Math.log10(Math.max(plo,.5));
    $('radLabel').innerHTML=cs()?`Core ${dia()?'diameter <i>d</i><sub>c</sub>':'radius <i>a</i><sub>c</sub>'}`:dia()?'Diameter <i>d</i>':'Radius <i>a</i>';
    $('radSlider').min=lp;$('radSlider').max=Math.log10(Math.max(phi,plo*1.01));$('radSlider').value=Math.log10(Math.max(prim,.5));if(document.activeElement!==$('radNum'))$('radNum').value=+sz(prim).toPrecision(4);
    const pk=`${S.lesson}|${S.sizeBy}`;if(pk!==presetKey){presetKey=pk;$('radPresets').innerHTML=(lesson().phys?.presets||[]).map(v=>{const d=sz(v);return `<button data-rad="${v}">${d>=1000?`${d/1000} µm`:`${d} nm`}</button>`;}).join('');}
    $('radPresets').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',Math.abs(+b.dataset.rad-prim)<1e-6);b.disabled=+b.dataset.rad>phi*1.0001;});
    $('shellSlider').max=shellMax();$('shellSlider').step=shellMax()/500;$('shellSlider').value=S.shell;if(document.activeElement!==$('shellNum'))$('shellNum').value=+S.shell.toPrecision(4);
    document.querySelector('[data-show="spec"]').hidden=S.units!=='spec';$('sweepBtn').textContent=sweepTimer?'■ Stop':'▷ Sweep λ';
    if(phys()){
      const p=physAt(S.wl),cx=v=>`${Fmt.num(v[0],4)}${v[1]>0?` + ${Fmt.num(v[1],3)}i`:''}`;
      const L=v=>`${Fmt.num(v,4)} nm`,sizes=cs()?`outer ${sizeWord()} ${L(sz(S.rad))} (core ${L(sz(S.core))} + shell ${L(S.shell)})`:`${dia()?`radius ${L(S.rad)}`:`diameter ${L(2*S.rad)}`}`;
      $('derived').innerHTML=`At λ₀ = ${S.wl} nm: n<sub>med</sub> = ${Fmt.num(p.nmed,5)}, λ = ${Fmt.num(S.wl/p.nmed,4)} nm in the medium; ${sizes}; <b>x = ${Fmt.num(S.x,4)}</b>, <b>m = ${cx([S.n,S.k])}</b>${cs()?`, core m₁ = ${cx([S.nc,S.kc])}`:''}`;
      const used=[['medium',S.med,true],[cs()?'shell':'particle',S.mat,false],...(cs()?[['core',S.matCore,false]]:[])];
      $('sources').innerHTML=used.map(([role,id,med])=>id==='custom'?`${role}: custom constant index`:`${role}: ${(med?Materials.MEDIA:Materials.DB)[id].src}`).join('<br>');
      const out=used.filter(([,id,med])=>id!=='custom'&&!(med?Materials.medium(id,S.wl):Materials.nk(id,S.wl)).inRange).map(([role,id,med])=>{const r=Materials.range(id,med).map(Math.round);return `${(med?Materials.MEDIA:Materials.DB)[id].name} (${role}) has data only for ${r[0]}–${r[1]} nm`;});
      $('rangeWarn').hidden=!out.length;$('rangeWarn').textContent=out.length?`⚠ ${out.join('; ')}. The nearest data value is used at ${S.wl} nm.`:'';
    }
    // series
    $('auto').checked=S.auto;$('autoN').textContent=`N = ${c.N}`;$('nSlider').max=c.N;$('nSlider').value=Neff();$('nSlider').disabled=S.auto;$('nSliderV').textContent=S.auto?`${c.N} (all)`:`${Neff()} of ${c.N}`;
    $('sE').checked=S.sE;$('sM').checked=S.sM;
    $('solo').innerHTML=`<option value="0">${lv('All orders','All terms')}</option>`+Array.from({length:Math.min(c.N,40)},(_,i)=>`<option value="${i+1}">n = ${i+1}${i<4?` (${pole(i+1)})`:''}</option>`).join('');$('solo').value=S.solo;
    // chain of spheres
    if(clusterLesson()){
      const mx=lesson().cluster?.max||8;$('nsSlider').max=mx;$('nsSlider').value=S.ns;$('nsV').textContent=S.ns;$('nsSlider').disabled=mx<2;
      const g=gapRel();$('gapSlider').value=Math.log(g/.05)/Math.log(6/.05);$('gapUnit').textContent=phys()?'nm':'× a';if(document.activeElement!==$('gapNum'))$('gapNum').value=phys()?S.gapNm:+S.gap.toPrecision(3);$('gapWrap').hidden=S.ns<2&&S.lesson==='tmat';
      setSeg('axisSeg',S.axis);$('axisNote').innerHTML=lv(`Light travels along z with E ∥ ${S.pol==='unpol'?'x and y (unpolarized)':S.pol}: the chain is ${S.axis==='z'?'end-on (along k)':S.axis===S.pol?'parallel to E':'perpendicular to E and k'}.`,`Light comes along z; E points ${S.pol==='unpol'?'in all directions (unpolarized)':`along ${S.pol}`}. The chain lies ${S.axis==='z'?'along the light beam':S.axis===S.pol?'along the electric field':'across the electric field'}.`);
      document.querySelectorAll('[data-only]').forEach(el=>el.hidden=el.dataset.only!==S.lesson);$('originSlider').value=S.origin;$('originV').textContent=`${Fmt.num(S.origin,3)} a`;$('avgBox').checked=S.avg;
      $('msAll').checked=S.msAll;$('msK').value=S.msK;$('msK').disabled=S.msAll&&false;$('msKV').textContent=S.msAll?lv('all','all'):String(S.msK);
      const d=2+g,len=(S.ns-1)*d+2;$('clusterInfo').innerHTML=`${lv('Centre spacing','Distance between centres')} ${phys()?`${Fmt.num(d*S.rad,4)} nm`:`${Fmt.num(d,3)} a`}; ${lv('chain length','total length')} ${phys()?`${Fmt.num(len*S.rad,4)} nm`:`${Fmt.num(len,3)} a`}`;
    }
    // light & display
    setSeg('pol',S.pol);setSeg('radial',S.radial);setSeg('viewSeg',S.view);
    $('farDb').value=String(S.farDb||40);$('farDbRow').hidden=S.view!=='far'||S.radial!=='log';$('radial').querySelector('[data-v="log"]').textContent='dB (log)';
    $('viewSeg').querySelectorAll('button[data-v="near"]').forEach(b=>{b.disabled=mieLesson()&&!nearAllowed();b.title=b.disabled?'Near-field maps are limited to x ≤ 60: finer fringes cannot be sampled on screen.':'';});
    document.querySelectorAll('[data-show]').forEach(el=>{const k=el.dataset.show;el.hidden=k==='far'?S.view!=='far':k==='near'?!(S.view==='near'||S.view==='wave'):k==='mienear'?!(mieLesson()&&S.view==='near'):false;});
    document.querySelector('[data-group="display"]').hidden=!lesson().groups.includes('display')||!['far','near','wave'].includes(S.view);
    const q=$('quantity'),F=S.lesson==='harmonics'?'F':'E';q.options[0].textContent=`Re ${F}${S.pol==='y'&&mieLesson()?'ᵧ':'ₓ'} (snapshot)`;q.options[1].textContent=`|${F}|² linear`;q.options[2].textContent=`|${F}|² log (dB)`;q.options[0].disabled=unpol&&mieLesson();q.options[3].hidden=!mieLesson();q.value=shownQuantity();
    $('unpolNote').hidden=!(unpol&&mieLesson()&&S.view==='near');
    $('slice').value=S.slice;$('total').checked=S.total;$('vectors').checked=S.vectors;$('vectors').disabled=unpol&&mieLesson();$('showParticle').checked=S.showParticle;$('farParticle').checked=S.farParticle;$('scaleBox').checked=S.scaleBar;$('scaleWrap').hidden=!phys();$('swatchBox').checked=S.swatch;$('swatchWrap').hidden=!swatchAvail();$('swPhi').value=Math.log10(S.swPhi);$('swPhiV').textContent=ppm(S.swPhi);$('swPhiRow').hidden=!S.swatch||!swatchAvail();
    const [ra,rb]=regionRange(),R=region();$('region').value=Math.log(R/ra)/Math.log(rb/ra);$('regionV').textContent=`${Fmt.num(R,3)} a (kr ≤ ${Fmt.num(R*S.x,3)})`;
    $('playBtn').hidden=!timeView();$('speedSel').hidden=!timeView();$('speedSel').value=String(speed);$('playBtn').setAttribute('aria-label',play?'Pause animation':'Play animation');$('playBtn').innerHTML=play?'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="5" width="3.5" height="14" rx="1"/><rect x="13.5" y="5" width="3.5" height="14" rx="1"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    $('sceneHint').textContent=`Drag: rotate · Shift-drag / two fingers: pan · Wheel / pinch: zoom${detOn?' · Click: place detector':''}`;
    renderTabs();$('graphTabs').querySelectorAll('button').forEach(b=>{const on=b.dataset.g===S.graph;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
    document.querySelectorAll('input[type=range]').forEach(fill);
  }

  /* ---------- 3D scene ---------- */
  let sliceTimer=0,lastHome='';
  function renderScene(){
    const dz=designOn();$('scene').hidden=dz;$('designView').hidden=!dz;document.querySelector('.view-actions').hidden=dz;if(dz){designScene();return;}
    if(!scene)return;clearTimeout(sliceTimer);
    const inc=mieLesson()?{pol:S.pol}:S.lesson==='plane'?{pol:'x'}:null;scene.setIncident(inc);
    const d=sceneData(true),kind=homeKind();if(kind!==lastHome){lastHome=kind;scene.home(kind);}
    scene.show(d);updateLegend(d);probeToScene();
    if(d.kind==='slice'&&d.finalK>d.K)sliceTimer=setTimeout(()=>{const f=sceneData(false);scene.show(f);updateLegend(f);probeToScene();},180);
    if(d.kind==='pattern'&&d.finalT>d.T)sliceTimer=setTimeout(()=>{const f=sceneData(false);scene.show(f);updateLegend(f);probeToScene();},180);
  }
  function sceneData(draft){
    const population=populationScene();if(population)return population;
    const c=coef();
    if(S.lesson==='harmonics'){
      const {cn,cm}=hCoef();
      if(S.view==='pattern'){const f=M.angularEvaluator(cn,cm,10),T=120,P=96,v=new Float32Array((T+1)*(P+1));for(let i=0;i<=T;i++)for(let j=0;j<=P;j++)v[i*(P+1)+j]=M.norm2(f(Math.PI*i/T,TAU*j/P));info(`Radiation pattern · radius ∝ |F|²`);return {kind:'pattern',T,P,values:v,radial:'lin',db:40,origin:true};}
      if(S.view==='sphere'){const f=M.angularEvaluator(cn,cm,10);info('Unit sphere · colour |F|² · arrows Re F');return {kind:'sphere',field:f,origin:false};}
      const ev=M.fieldEvaluator(null,{kind:'regular',N:10,cn,cm}),R=S.R,need=clamp(Math.ceil(2*R/TAU*9),90,241),K=draft?Math.min(90,need):need;
      info(`Slice ${S.slice} · kr ≤ ${R} · ${K}×${K} samples`);
      return {kind:'slice',extent:R,plane:S.slice,K,finalK:need,field:p=>{const e=ev(p);return {e,I:M.norm2(e)};},quantity:S.quantity,component:0,vectors:S.vectors,circles:[{r:Math.max(S.hA.n,S.hBOn?S.hB.n:0),label:`kr = ${Math.max(S.hA.n,S.hBOn?S.hB.n:0)}`}],origin:true};
    }
    if(S.lesson==='plane'){
      const ev=M.fieldEvaluator(null,{kind:'incident',N:S.pN,electric:S.pE,magnetic:S.pM}),R=S.R,need=clamp(Math.ceil(2*R/TAU*9),90,241),K=draft?Math.min(90,need):need;
      info(`Slice ${S.slice} · kr ≤ ${R} · ${K}×${K} samples`);
      return {kind:'slice',extent:R,plane:S.slice,K,finalK:need,field:p=>{const e=ev(p);return {e,I:M.norm2(e)};},quantity:S.quantity,component:0,vectors:S.vectors,circles:[{r:S.pN,label:`kr = N = ${S.pN}`}],origin:true};
    }
    if(clusterLesson())return clusterScene(draft);
    if(S.view==='near'&&nearAllowed()){
      const o=opts(),R=region(),unpol=S.pol==='unpol',angles=unpol?[0,Math.PI/2]:[o.angle];
      const evs=angles.map(a=>M.fieldEvaluator(c,{...o,angle:a,kind:'scattered'})),evi=angles.map(a=>M.interiorEvaluator(c,{...o,angle:a}));
      // Grid: >= 7 samples per wavelength outside and >= 5 per internal wavelength lambda/Re m.
      const nIn=Math.max(S.n,cs()?S.nc:0),need=Math.ceil(2*R*S.x/TAU*Math.max(7,5*nIn)),finalK=clamp(need,90,321),K=draft?Math.min(90,finalK):finalK,buf=new Float64Array(6);
      // Shown field: outside scattered (+ incident); inside the internal field (− incident unless the total is shown).
      // dI = <|E_total|²>/|E₀|² − 1, the time-averaged intensity change, is defined for every polarization.
      const field=p=>{const q=[p[0]*S.x,p[1]*S.x,p[2]*S.x],inside=Math.hypot(...p)<1,sign=inside?(S.total?0:-1):(S.total?1:0),o=inside?0:1;let I=0,T=0,e0=null;
        for(let i=0;i<angles.length;i++){const e=(inside?evi[i]:evs[i])(q,i?buf:new Float64Array(6)),z=q[2],ca=Math.cos(angles[i]),sa=Math.sin(angles[i]),inc=[ca*Math.cos(z),ca*Math.sin(z),sa*Math.cos(z),sa*Math.sin(z)];
          let t=e[4]**2+e[5]**2;for(let k=0;k<4;k++)t+=(e[k]+o*inc[k])**2;T+=t;
          if(sign)for(let k=0;k<4;k++)e[k]+=sign*inc[k];
          I+=M.norm2(e);if(!i)e0=e;}
        return {e:e0,I:I/angles.length,dI:T/angles.length-1};};
      info(`Slice ${S.slice} · r ≤ ${Fmt.num(R,3)}a${phys()?` = ${nmText(R*S.rad)}`:''} · ${K}×${K} samples${!draft&&need>321?' · ⚠ fringes finer than the grid: reduce the region':''}`);
      return {kind:'slice',extent:R,inner:0,plane:S.slice,K,finalK,field,quantity:shownQuantity(),component:S.pol==='y'?1:0,vectors:S.vectors&&!unpol,scale:phys()&&S.scaleBar?scaleBar(R):null,
        particle:{r:scene.R0/R,core:cs()?S.q*scene.R0/R:null,show:S.showParticle,translucent:true,rings:cs()?[1,S.q]:[1]}};
    }
    if(S.view==='near')S.view='far';
    const o=opts(),finalT=clamp(Math.ceil(24*S.x),360,4800),T=draft?Math.min(finalT,720):finalT,P=96,v=new Float32Array((T+1)*(P+1));
    for(let i=0;i<=T;i++){const a=M.amplitudes(c,Math.cos(Math.PI*i/T),o),i1=M.abs2(a.s1),i2=M.abs2(a.s2);
      for(let j=0;j<=P;j++){const ph=TAU*j/P,c2=Math.cos(ph)**2,s2=1-c2;v[i*(P+1)+j]=S.pol==='unpol'?(i1+i2)/2:S.pol==='y'?i2*s2+i1*c2:i2*c2+i1*s2;}}
    info(`Far field · radius ${S.radial==='log'?`in dB (0 to −${S.farDb||40})`:'∝ intensity'}${T<finalT?' · refining angular detail…':''}`);
    return {kind:'pattern',T,P,finalT,values:v,radial:S.radial,db:S.farDb||40,particle:{r:.16,show:S.farParticle}};
  }
  const info=t=>{$('sceneInfo').textContent=t;};

  /* ---------- colour of the colloid (transmitted and scattered), from the visible spectrum ---------- */
  // Single particles with real sizes only: the colour needs the spectrum from 380 to 780 nm.
  const swatchAvail=()=>phys()&&!clusterLesson();
  // Colorimetry (D65, CIE 1931, sRGB, L*a*b*) and the Monte Carlo transport live in colour.js (MieColour).
  const MC=MieColour,SW_WL=MC.WL;
  const ppm=v=>v>=1e-3?`${Fmt.num(v*100,2)} %`:v>=1e-6?`${Fmt.num(v*1e6,2)} ppm`:`${Fmt.num(v*1e9,2)} ppb`;
  let swKey='',swJob=null,swTimer=0,swWarned=false,swWorker=null,swUseWorker=typeof Worker!=='undefined';
  // Set up the calculation for the current particle and concentration. Radiative transfer in a 1 cm x 1 cm cuvette:
  // mu_s = N C_sca, mu_a = N C_abs with N = phi/V, i.e. mu = 0.75 phi Q / a (a in cm). Light from behind, along the path.
  function swatchJob(){
    const population=populationSwatch();if(population)return population;
    const key=[S.surfaceOn,S.surfaceA,S.struct,S.mat,S.matCore,S.med,S.cmed,S.cn,S.ck,S.ccn,S.cck,S.rad,S.core,S.shell,S.swPhi].join('|');if(key===swKey&&swJob)return swJob;swKey=key;
    clearTimeout(swTimer);if(swWorker){swWorker.terminate();swWorker=null;}
    const aCm=(cs()?S.core+S.shell:S.rad)*1e-7,f=0.75*S.swPhi/aCm;
    const lam=SW_WL.map(wl=>{const p=physAt(wl),c=cs()?M.coreShell(p.q*p.x,p.x,[p.nc,p.kc],[p.n,p.k]):M.coefficients(p.x,[p.n,p.k]);
      return {c,mus:f*c.Qsca,mua:Math.max(0,f*(c.Qext-c.Qsca)),table:null,n:0,T:0,R:0,S:0};});
    const tau=Math.max(...lam.map(l=>l.mus));
    swJob={key,lam,tau,rand:MC.rng(1),done:false,target:3000,ms:0,count:0,next:0};
    // Essentially no scattering: Beer-Lambert is exact, no packets needed.
    if(tau<1e-7){lam.forEach(l=>{l.n=1;l.T=Math.exp(-l.mua);});swJob.done=true;return swJob;}
    if(!swUseWorker)swStep(swJob,5,40);  // main-thread fallback: quick first estimate, refined in the background
    return swJob;
  }
  // Round-robin over the wavelengths in small batches until the time budget is used (main-thread fallback).
  function swStep(job,per,budget){
    const t0=performance.now(),K=job.lam.length;
    while(!job.done&&performance.now()-t0<budget){
      const l=job.lam[job.next];job.next=(job.next+1)%K;if(l.n>=job.target)continue;l.table??=MC.phaseTable(l.c);
      const k=job.count>=10?Math.max(1,Math.min(per,Math.floor(6/(job.ms/job.count)))):Math.min(per,2);
      const t1=performance.now(),o=MC.transport({mus:l.mus,mua:l.mua,table:l.table,n:k,rand:job.rand});job.ms+=performance.now()-t1;job.count+=k;
      l.n+=k;l.T+=o.T;l.R+=o.R;l.S+=o.S;adaptTarget(job);
    }
  }
  // Very turbid samples (thousands of scattering events per packet) get a lower packet target so they finish.
  function adaptTarget(job){if(job.count>=200)job.target=job.ms/job.count>0.2?800:job.ms/job.count>0.05?1500:3000;job.done=job.lam.every(x=>x.n>=job.target);}
  // Preferred path: a Web Worker runs the packets, so the page never stalls. A new job replaces the worker.
    function swBackground(){
    clearTimeout(swTimer);const job=swJob;if(!job||job.done)return;
    if(swUseWorker&&!job.worker){
      try{
        if(swWorker)swWorker.terminate();
        swWorker=new Worker(URL.createObjectURL(new Blob([MC.workerSource()],{type:'text/javascript'})));
        job.worker=swWorker;let seed=1,paintT=0;const K=job.lam.length,inflight=new Set();
        const send=i=>{const l=job.lam[i];if(l.n+l.pending>=job.target)return;l.table??=MC.phaseTable(l.c);const k=Math.max(1,Math.min(50,Math.round(job.count>=10?20/Math.max(0.01,job.ms/job.count):10)));
          l.pending+=k;inflight.add(i);job.sent0??=performance.now();l.t0=performance.now();swWorker.postMessage({i,mus:l.mus,mua:l.mua,th:l.table.th,cdf:l.table.cdf,n:k,seed:seed++});};
        swWorker.onmessage=e=>{if(job!==swJob)return;const d=e.data,l=job.lam[d.i];l.pending-=d.n;l.n+=d.n;l.T+=d.T;l.R+=d.R;l.S+=d.S;job.ms+=d.ms;job.count+=d.n;adaptTarget(job);inflight.delete(d.i);
          const now=performance.now();if(job.done||now-paintT>120){paintT=now;if(S.swatch&&swatchAvail())paintSwatch(job);}
          if(!job.done){send(d.i);}else{swWorker.terminate();swWorker=null;}};
        swWorker.onerror=()=>{swUseWorker=false;job.worker=null;swBackground();};
        job.lam.forEach(l=>l.pending=0);for(let i=0;i<K;i++)send(i);
        return;
      }catch(err){swUseWorker=false;}
    }
    if(job.worker)return;
    swTimer=setTimeout(()=>{if(job!==swJob)return;
      swStep(job,20,25);
      if(job===swJob&&S.swatch&&swatchAvail())paintSwatch(job);swBackground();},30);
  }
  function paintSwatch(job){
    if(job.lam.some(l=>!l.n)){$('swConc').textContent=`${ppm(S.swPhi)} by volume · MC …`;return;}
    const T=job.lam.map(l=>l.T/l.n),side=job.lam.map(l=>l.S/l.n),ct=MC.colour(T),csd=MC.colour(side),L=ct.lab;
    $('swT').style.background=ct.css;$('swS').style.background=csd.css;
    $('swT').title=`Transmitted colour: L* ${L[0].toFixed(0)}, a* ${L[1].toFixed(0)}, b* ${L[2].toFixed(0)}`;
    const prog=job.done?'':` · MC ${Math.round(100*Math.min(...job.lam.map(l=>l.n))/job.target)} %`;
    $('swConc').textContent=`${ppm(S.swPhi)} by volume${prog}`;
  }
  function renderSwatch(){
    const on=S.swatch&&swatchAvail();$('swatch').hidden=!on;if(!on){clearTimeout(swTimer);return;}
    if(populationActive()&&!populationJobs.colour?.done||populationActive()&&populationJobs.colour?.error){$('swatch').hidden=true;clearTimeout(swTimer);return;}
    const job=swatchJob();paintSwatch(job);swBackground();
    // Multiple scattering is included; above ~0.1 vol% the particles also interact (dependent scattering).
    const multi=job.tau>0.3,crowd=S.swPhi>1e-3;
    $('swWarn').hidden=!(multi||crowd);$('swWarn').classList.toggle('info',multi&&!crowd);
    $('swWarn').textContent=crowd?'Very concentrated: the particles interact. Independent-particle Mie theory and radiative transfer no longer apply.':`Multiple scattering included (Monte Carlo, scattering optical depth ${Fmt.num(job.tau,2)}).`;
    if(crowd&&!swWarned)toast('Concentration too high: the particles interact, so the colour shown is no longer reliable.');
    swWarned=crowd;
  }

  /* ---------- lesson 06: colour by design (inverse design of colloid colour) ---------- */
  const MDes=MieDesign,MCol=MieColour,designOn=()=>S.lesson==='design';
  const FAM_IDS=MDes.FAMILIES.map(f=>f.id),famSel=()=>S.dFam.split(',').filter(id=>FAM_IDS.includes(id));
  const DPRESETS=[['Pantone 2022',46,13,-37],['Ruby',40,60,30],['Wine',30,40,5],['Violet',40,35,-40],['Royal blue',35,15,-50],['Teal',55,-30,-10],['Green',60,-40,20],['Olive',55,-5,40],['Amber',70,20,70]];
  const METAL={au:'#d4a017',ag:'#c4c6cf',cu:'#b8733b',si:'#5d6178',sio2:'#eef3f8'};
  const DCACHE=new Map();let dSearch=null,dKey='',dRes=null,dFin=null,dEvalKey='',dTimer=0,dEvalTimer=0,dPick=null,dGamut=null,dGamutKey='',dMapImg=null,dMapKey='',dMCjob=null;
  const tgt=()=>[S.tL,S.ta,S.tb],dEf=()=>S.dMetric==='76'?MCol.dE76:MCol.dE2000,dSym=()=>S.dMetric==='76'?'ΔE₇₆':'ΔE₀₀';
  const ppmTxt=v=>v>=1e-3?`${Fmt.num(v*100,2)} %`:v>=1e-6?`${Fmt.num(v*1e6,3)} ppm`:`${Fmt.num(v*1e9,3)} ppb`;
  const sizeTxt=(f,p)=>f.kind==='sphere'?`d = ${Fmt.num(p[0],3)} nm`:`core ${Fmt.num(p[0],3)} nm + shell ${Fmt.num(p[1],2)} nm (d = ${Fmt.num(p[0]+2*p[1],3)} nm)`;
  // Start (or keep) the spectrum calculation for the chosen families and medium; it runs in time slices.
  function designStart(){
    const key=famSel().join(',')+'|'+S.dMed+'|'+S.surfaceOn+'|'+S.surfaceA;if(key===dKey&&dSearch)return;dKey=key;DCACHE.clear();MDes.setSurface(S);
    dSearch=new MDes.Search({families:famSel(),med:S.dMed,cache:DCACHE});dRes=dFin=null;dPick=null;dEvalKey='';dGamutKey='';dMCjob=null;designPump();
  }
  function designPump(){
    clearTimeout(dTimer);if(!designOn()||!dSearch||dSearch.done)return;
    dTimer=setTimeout(()=>{const s=dSearch,b=s.progress;s.step(25);if(s!==dSearch)return;
      if(Math.floor(s.progress*4)>Math.floor(b*4)||s.done){dEvalKey='';designSchedule(true);}else $('dStatus').textContent=statusTxt();
      designPump();},10);
  }
  const statusTxt=()=>!famSel().length?'Select a candidate family to start the search.':!dSearch?'':dSearch.done?lv(`Searched ${dSearch.total.toLocaleString('en')} structures in ${famSel().length} families, each at its best concentration.`,`Tried ${dSearch.total.toLocaleString('en')} particle designs in ${famSel().length} families.`):`${lv('Computing Mie spectra','Computing')} … ${Math.round(100*dSearch.progress)} %`;
  // Evaluate the target on the spectra computed so far (debounced while dragging on the colour map).
  function designSchedule(now=false){
    clearTimeout(dEvalTimer);if(!dSearch)return;
    const key=[S.tSet,S.tL,S.ta,S.tb,S.dMetric,dKey,dSearch.pos].join('|');if(key===dEvalKey)return;
    dEvalTimer=setTimeout(()=>{designEval(key);refresh();},now?0:160);
  }
  function designEval(key){
    if(!dSearch)return;dEvalKey=key;dPick=null;
    dRes=dSearch.evaluate(tgt(),S.dMetric);
    if(dSearch.done&&S.tSet)dFin=MDes.finalize(dRes,{med:S.dMed,metric:S.dMetric,top:4});
    else dFin=dRes.families.filter(r=>r.best).sort((a,b)=>a.best.score-b.best.score).slice(0,4).map(r=>{const s=DCACHE.get(`${r.f.id}|${S.dMed}|${r.best.p.join(',')}`),lab=MDes.labAt(s.ext,r.best.phi),pn=MDes.penalty(r.f,r.best.p,r.best.phi);
      return {family:r.f,p:r.best.p,phi:r.best.phi,lab,dE:r.best.dE,dE76:MCol.dE76(lab,tgt()),dE00:MCol.dE2000(lab,tgt()),score:r.best.score,notes:pn.notes,robust:null,spectrum:s,prelim:true};});
    dGamutKey='';if(dSearch.done&&S.tSet)designMC();
  }
  // Multiple-scattering check of the finalists (Monte Carlo, small packet numbers, in time slices).
  function designMC(){
    const fin=dFin,job={fin,i:0};dMCjob=job;
    const next=()=>{if(dMCjob!==job||!designOn())return;if(job.i>=fin.length){
        const dE=dEf(),moved=fin.some(c=>c.mcLab&&Math.abs(dE(c.mcLab,tgt())-c.dE)>2);
        if(moved){fin.forEach(c=>{c.mcRank=true;});fin.sort((a,b)=>(dE(a.mcLab,tgt())+a.score-a.dE)-(dE(b.mcLab,tgt())+b.score-b.dE));}
        refresh();return;}
      const c=fin[job.i++],cf=MDes.coefs(c.family,c.p,S.dMed),aNm=c.spectrum.d/2,f=0.75*c.phi/(aNm*1e-7),rand=MCol.rng(3),T=[],Sd=[];
      cf.forEach(q=>{const mus=f*q.Qsca,mua=Math.max(0,f*(q.Qext-q.Qsca));if(mus<1e-6){T.push(Math.exp(-mua));Sd.push(0);return;}
        const o=MCol.transport({mus,mua,table:MCol.phaseTable(q),n:1500,rand});T.push(o.T/o.n);Sd.push(o.S/o.n);});
      c.mcLab=MCol.lab(T);c.mcT=T;c.mcS=Sd;c.mcCss=MCol.colour(T).css;c.mcSide=MCol.colour(Sd).css;c.tau=Math.max(...cf.map(q=>f*q.Qsca));
      setTimeout(next,5);};
    setTimeout(next,30);
  }
  // Design shown in the result view and graphs: a clicked map point, otherwise the winner.
  function designShown(){
    if(!S.tSet)return null;
    if(dPick){const r=dRes?.families.find(x=>x.f.id===dPick.fid);if(r){const p=r.grid.b?[r.grid.a[dPick.i],r.grid.b[dPick.j]]:[r.grid.a[dPick.i]],k=dPick.i*(r.grid.b?r.grid.b.length:1)+dPick.j,phi=r.phi[k];
      const s=DCACHE.get(`${r.f.id}|${S.dMed}|${p.join(',')}`);if(s&&Number.isFinite(phi)){const lab=MDes.labAt(s.ext,phi),pn=MDes.penalty(r.f,p,phi);return {family:r.f,p,phi,lab,dE:dEf()(lab,tgt()),dE76:MCol.dE76(lab,tgt()),dE00:MCol.dE2000(lab,tgt()),score:dEf()(lab,tgt())+pn.pen,notes:pn.notes,spectrum:s,picked:true};}}}
    return dFin?.[0]||null;
  }
  const mapFam=()=>S.dSel!=='auto'&&famSel().includes(S.dSel)?S.dSel:(designShown()?.family.id||famSel()[0]);
  // Reachable colours at the target lightness: for every computed structure, the concentration giving L* = target.
  function designGamut(){
    const key=[S.tL,dKey,dSearch?.pos].join('|');if(key===dGamutKey)return dGamut;dGamutKey=key;
    const pts=[],cols=[],fams=[],L=S.tL;
    for(const r of dRes?.families||[]){const g=r.grid,n2=g.b?g.b.length:1;
      for(let i=0;i<g.a.length;i++)for(let j=0;j<n2;j++){const p=g.b?[g.a[i],g.b[j]]:[g.a[i]],s=DCACHE.get(`${r.f.id}|${S.dMed}|${p.join(',')}`);if(!s)continue;
        let lo=MDes.PHI[0],hi=MDes.PHI[1];if(MDes.labAt(s.ext,10**lo)[0]<L||MDes.labAt(s.ext,10**hi)[0]>L)continue;
        for(let it=0;it<18;it++){const m=(lo+hi)/2;if(MDes.labAt(s.ext,10**m)[0]>L)lo=m;else hi=m;}
        const lab=MDes.labAt(s.ext,10**((lo+hi)/2));pts.push([lab[1],lab[2]]);cols.push(MCol.labToRGB(lab).css);fams.push(r.f.id);}}
    return dGamut={pts,cols,fams};
  }
  // Target picker: a*-b* plane at the target L* (a*, b* from -100 to 100), hatched outside the sRGB gamut.
  function drawTargetMap(){
    const cv=$('tMap'),g=cv.getContext('2d'),W=cv.width,H=cv.height,key=S.tL;
    if(dMapKey!==key){dMapKey=key;const im=g.createImageData(W,H);
      for(let y=0;y<H;y++)for(let x=0;x<W;x++){const a=-100+200*x/(W-1),b=100-200*y/(H-1),c=MCol.labToRGB([S.tL,a,b]),k=4*(y*W+x),hatch=!c.inGamut&&((x+y)%10<3);
        const v=c.rgb.map(u=>255*(u<=0.0031308?12.92*u:1.055*u**(1/2.4)-0.055)),gy=(v[0]+v[1]+v[2])/3,o=c.inGamut?v:v.map(u=>0.3*u+0.7*(hatch?gy*0.75:gy*0.9+20));im.data.set([o[0],o[1],o[2],255],k);}
      dMapImg=im;}
    g.putImageData(dMapImg,0,0);
    const X=a=>(a+100)/200*(W-1),Y=b=>(100-b)/200*(H-1);
    g.strokeStyle='rgba(0,0,0,.25)';g.lineWidth=1;g.beginPath();g.moveTo(X(0),0);g.lineTo(X(0),H);g.moveTo(0,Y(0));g.lineTo(W,Y(0));g.stroke();
    const gm=designGamut();if(gm){g.fillStyle='rgba(0,0,0,.22)';for(const [a,b] of gm.pts){if(Math.abs(a)>100||Math.abs(b)>100)continue;g.fillRect(X(a)-1.5,Y(b)-1.5,3,3);}}
    if(S.tSet){g.lineWidth=3;g.strokeStyle='#fff';g.beginPath();g.arc(X(S.ta),Y(S.tb),9,0,2*Math.PI);g.stroke();g.lineWidth=1.5;g.strokeStyle='#000';g.beginPath();g.arc(X(S.ta),Y(S.tb),11,0,2*Math.PI);g.stroke();}
  }
  function designSync(){
    designStart();
    $('tLSlider').value=S.tL;$('tLV').textContent=Fmt.num(S.tL,3);
    for(const [id,v] of [['tLNum',S.tL],['taNum',S.ta],['tbNum',S.tb]])if(document.activeElement!==$(id))$(id).value=S.tSet||id==='tLNum'?+v.toFixed(1):'';
    const t=MCol.labToRGB(tgt());$('tSwatch').style.background=S.tSet?t.css:'';$('tSwatch').classList.toggle('unset',!S.tSet);$('tGamut').hidden=!S.tSet||t.inGamut;
    $('dFamBox').querySelectorAll('input').forEach(i=>{i.checked=famSel().includes(i.value);});
    setSeg('dMetricSeg',S.dMetric);$('dMedSel').value=S.dMed;$('dStatus').textContent=statusTxt();
    designSchedule();drawTargetMap();
  }
  function setTarget(L,a,b){S.tSet=true;S.tL=+clamp(L,0,100).toFixed(1);S.ta=+clamp(a,-128,127).toFixed(1);S.tb=+clamp(b,-128,127).toFixed(1);dPick=null;refresh();}
  function designInit(){
    $('tPresets').innerHTML=DPRESETS.map(([n,L,a,b])=>`<button data-lab="${L},${a},${b}">${n}</button>`).join('');
    $('tPresets').onclick=e=>{const b=e.target.closest('button[data-lab]');if(b){const [L,a,c]=b.dataset.lab.split(',').map(Number);setTarget(L,a,c);}};
    $('dFamBox').innerHTML=MDes.FAMILIES.map(f=>`<label class="check"><input type="checkbox" value="${f.id}"> ${f.label}</label>`).join('');
    const familyButtons=document.createElement('div');familyButtons.className='candidate-actions';familyButtons.innerHTML='<button type="button" class="btn-quiet small" id="dSelectAll">Select all</button><button type="button" class="btn-quiet small" id="dDeselectAll">Deselect all</button>'; $('dFamBox').before(familyButtons);$('dSelectAll').onclick=()=>{S.dFam=FAM_IDS.join(',');refresh();};$('dDeselectAll').onclick=()=>{S.dFam='';refresh();};
    $('dFamBox').onchange=()=>{const on=[...$('dFamBox').querySelectorAll('input:checked')].map(i=>i.value);S.dFam=on.join(',');refresh();};
    segHandler('dMetricSeg',v=>{S.dMetric=v;refresh();});$('dMedSel').onchange=e=>{S.dMed=e.target.value;refresh();};
    $('tLSlider').oninput=e=>setTarget(+e.target.value,S.ta,S.tb);
    for(const [id,k] of [['tLNum',0],['taNum',1],['tbNum',2]])$(id).onchange=e=>{const v=tgt(),x=e.target.value.trim();if(x==='')return;v[k]=+x;if(Number.isFinite(v[k]))setTarget(...v);};
    const pick=e=>{const r=$('tMap').getBoundingClientRect(),a=-100+200*(e.clientX-r.left)/r.width,b=100-200*(e.clientY-r.top)/r.height;setTarget(S.tL,clamp(a,-100,100),clamp(b,-100,100));};
    $('tMap').onpointerdown=e=>{$('tMap').setPointerCapture(e.pointerId);pick(e);};$('tMap').onpointermove=e=>{if(e.buttons&1)pick(e);};
    $('designView').onclick=e=>{const b=e.target.closest('button[data-act]');if(!b)return;if(b.dataset.act==='best'){dPick=null;refresh();}if(b.dataset.act==='open')openInReal();};
  }
  // Hand the shown design to lesson 05 (Real particles), with its concentration for the colour swatch.
  function openInReal(){
    const d=designShown();if(!d)return;const f=d.family,set={units:'spec',wlMin:380,wlMax:900,med:S.dMed,swatch:true,swPhi:+d.phi.toPrecision(3),graph:'spectrum',view:'far'};
    if(f.kind==='sphere')Object.assign(set,{struct:'homog',mat:f.mat,sizeBy:'d',rad:+(d.p[0]/2).toPrecision(4)});
    else Object.assign(set,{struct:'cs',mat:f.shell,matCore:f.core,sizeBy:'d',core:+(d.p[0]/2).toPrecision(4),shell:+d.p[1].toPrecision(3)});
    setLesson('real',true);Object.assign(S,set);S.wl=Math.round((S.wlMin+S.wlMax)/2);refresh(true);toast(lv('Design opened in lesson 05 (Real particles).','Opened in lesson 05 with the same particle and concentration.'));
  }
  // Particle drawn to scale (cross-section), with a 100 nm scale bar
  function particleSVG(f,p){
    const d=f.kind==='sphere'?p[0]:p[0]+2*p[1],R=Math.min(62,18+44*Math.sqrt(d/300)),k=R/(d/2),cx=80,cy=74;
    const core=f.kind==='cs'?`<circle cx="${cx}" cy="${cy}" r="${(p[0]/2*k).toFixed(1)}" fill="${METAL[f.core]}" stroke="#7a7f88" stroke-width=".8"/>`:'';
    const L0=[10,20,50,100,200,500].filter(v=>v*k<=110).pop()||10,bar=L0*k;
    return `<svg viewBox="0 0 160 160" class="dv-svg" role="img" aria-label="Particle cross-section to scale"><circle cx="${cx}" cy="${cy}" r="${R.toFixed(1)}" fill="${METAL[f.kind==='sphere'?f.mat:f.shell]}" stroke="#6b6f78" stroke-width="1"/>${core}
      <line x1="${cx-bar/2}" y1="150" x2="${cx+bar/2}" y2="150" stroke="currentColor" stroke-width="2"/><text x="${cx}" y="145" text-anchor="middle" font-size="10" fill="currentColor">${L0} nm</text></svg>`;
  }
  function designScene(){
    const el=$('designView'),d=designShown();
    if(!S.tSet){el.innerHTML=`<div class="dv-wait dv-prompt"><b>${lv('Choose a target colour','Choose the colour you want')}</b><span>${lv('Click or drag on the colour map, type L*, a*, b* values, or pick a preset in the sidebar. The app then searches for the particle and concentration that give this colour.','Click on the colour map, type the values, or pick one of the named colours in the sidebar. The app then finds a particle that makes this colour.')}</span><small>${statusTxt()}</small></div>`;return;}
    if(!d){el.innerHTML=`<div class="dv-wait">${statusTxt()||lv('Starting …','Starting …')}</div>`;return;}
    const t=MCol.labToRGB(tgt()),res=MCol.labToRGB(d.lab),dEv=dEf()(d.lab,tgt()),conc=MDes.concentration(d.family,d.p,d.phi);
    const pal=Array.from({length:30},(_,i)=>{const u=MDes.PHI[0]+(MDes.PHI[1]-MDes.PHI[0])*i/29;return MCol.labToRGB(MDes.labAt(d.spectrum.ext,10**u)).css;}),
      mark=(Math.log10(d.phi)-MDes.PHI[0])/(MDes.PHI[1]-MDes.PHI[0])*100;
    const mc=d.mcLab?`<p class="dv-mc">${lv('With multiple scattering (Monte Carlo)','Checked with light bouncing between particles')}: ${dSym()} = ${Fmt.num(dEf()(d.mcLab,tgt()),2)}${d.tau>0.3?` · ${lv('scattering optical depth','turbidity')} ${Fmt.num(d.tau,2)}`:''}${d.mcRank?` · ${lv('ranking by the Monte Carlo colour','ranked by this check')}`:''}</p>`:'';
    const notes=d.notes?.length?`<p class="dv-notes">${d.notes.join(' · ')}</p>`:'';
    el.innerHTML=`<div class="dv-top"><div class="dv-pair"><div><div class="dv-chip" style="background:${t.css}"></div><span>${lv('target','target')}</span></div><div><div class="dv-chip" style="background:${res.css}"></div><span>${d.picked?lv('map point','selected design'):lv('best design','best design')}</span></div>
      <div class="dv-de"><b>${dSym()} = ${Fmt.num(dEv,2)}</b><small>${dEv<1?lv('indistinguishable','looks the same'):dEv<3?lv('just noticeable','very close'):dEv<6?lv('noticeable','close'):lv('clearly different','clearly different')}</small></div></div>
      ${particleSVG(d.family,d.p)}</div>
      <div class="dv-card"><h3>${d.family.label}${d.prelim?' <small>(preliminary)</small>':''}</h3><p>${sizeTxt(d.family,d.p)}</p>
      <p>${ppmTxt(d.phi)} ${lv('by volume','by volume')} · ${Fmt.num(conc.perML,2)} ${lv('particles/mL','particles per mL')} · ${Fmt.num(conc.ugPerML,3)} µg/mL ${conc.metal==='si'?'Si':conc.metal==='sio2'?'SiO₂':conc.metal.charAt(0).toUpperCase()+conc.metal.slice(1)}</p>
      <p>L* ${Fmt.num(d.lab[0],3)}, a* ${Fmt.num(d.lab[1],3)}, b* ${Fmt.num(d.lab[2],3)}${d.robust!=null?` · ${lv('±10 % size spread','with ±10 % size spread')}: ${dSym()} ${Fmt.num(d.robust,2)}`:''}</p>${notes}${mc}
      <div class="dv-btns"><button class="btn small" data-act="lightbox">Send to lightbox</button><button class="btn small" data-act="open">${lv('Open in lesson 05','Open in lesson 05')}</button>${d.picked?`<button class="btn-quiet small" data-act="best">${lv('Back to the best design','Back to the best design')}</button>`:''}</div></div>
      <div class="dv-pal"><span>${lv('Colour vs concentration (1 cm)','Colour as the colloid gets more concentrated (1 cm)')}</span><div class="dv-strip">${pal.map(c=>`<i style="background:${c}"></i>`).join('')}<b style="left:${mark.toFixed(1)}%"></b></div><div class="dv-ends"><span>10 ppb</span><span>1000 ppm</span></div></div>`;
  }
  function designMetrics(m){
    const d=designShown();if(!S.tSet){m('Target',lv('not chosen','not chosen'),lv('pick a colour on the map','pick a colour on the map'));m(lv('Search','Search'),statusTxt(),'');return;}
    m('Target',`${Fmt.num(S.tL,3)} / ${Fmt.num(S.ta,3)} / ${Fmt.num(S.tb,3)}`,'L* / a* / b*');
    if(!d){m(lv('Search','Search'),statusTxt(),'');return;}
    const v=dEf()(d.lab,tgt());m(lv(`Best ${dSym()}`,`Closest ${dSym()}`),Fmt.num(v,2),S.dMetric==='76'?`ΔE₀₀ = ${Fmt.num(MCol.dE2000(d.lab,tgt()),2)}`:`ΔE₇₆ = ${Fmt.num(MCol.dE76(d.lab,tgt()),2)}`,v>6);
    m(lv('Design','Particle'),d.family.label,sizeTxt(d.family,d.p));m(lv('Concentration','Concentration'),ppmTxt(d.phi),lv('volume fraction, 1 cm path','by volume, 1 cm cuvette'));
    if(d.robust!=null)m(lv('Robustness','Tolerance'),Fmt.num(d.robust,2),lv(`${dSym()} with ±10 % size spread`,`${dSym()} if sizes vary by ±10 %`),d.robust>d.dE+3);
    m(lv('Search','Search'),dSearch?.done?`${dSearch.total.toLocaleString('en')}`:`${Math.round(100*(dSearch?.progress||0))} %`,dSearch?.done?lv('structures searched','designs tried'):lv('computing spectra','computing'));
  }
  function designGraph(g,{s1,s2,s3,ink2,probe}){
    const d=designShown(),ink=color('ink');let spec,cap;
    if(!dRes||!S.tSet){table={title:'',cols:[],rows:[]};return {spec:{type:'xy',x:{min:0,max:1},y:{min:0,max:1},series:[]},cap:S.tSet?statusTxt():lv('Choose a target colour on the map in the sidebar (or type L*a*b* values, or pick a preset) to start the design.','Pick a colour on the map in the sidebar to start.')};}
    if(g==='families'){
      const rows=dRes.families.map(r=>{const fin=dFin?.find(c=>c.family.id===r.f.id),b=fin||r.best;return {f:r.f,dE:b?(fin?dEf()(fin.lab,tgt()):b.dE):NaN,pen:b?MDes.penalty(r.f,b.p,b.phi).pen:0,p:b?.p,phi:b?.phi,notes:b?MDes.penalty(r.f,b.p,b.phi).notes:[]};});
      const win=rows.findIndex(r=>r.f.id===d?.family.id);
      spec={type:'bars',count:rows.length,labels:rows.map(r=>r.f.label.replace(' sphere','').replace(' shell','')),groups:[{color:s1,values:rows.map(r=>r.dE)},{color:s3,values:rows.map(r=>r.pen)}],selected:win+1,
        x:{label:lv('family (click a bar to see its colour map)','particle type (click a bar for its map)')},y:{label:`${dSym()} to the target`},legend:[{name:`best ${dSym()}`,color:s1,bar:true},{name:lv('practicality penalty','penalty for practicality'),color:s3,bar:true}],
        tip:n=>{const r=rows[n-1];return r.p?`<b>${r.f.label}</b><div>${sizeTxt(r.f,r.p)}</div><div>${ppmTxt(r.phi)}</div><div>${dSym()} <span>${Fmt.num(r.dE,3)}</span></div>${r.notes.length?`<div>${r.notes.join('; ')}</div>`:''}`:r.f.label;}};
      cap=lv(`Closest colour difference each family reaches (best size and concentration), with the small practicality penalty that breaks near-ties. The highlighted bar is the chosen design. Click a bar to open that family's colour map.`,`How close each type of particle can get to your colour. The highlighted bar is the app's choice; the grey part is a small penalty for designs that are harder to make. Click a bar to see that family's map.`);
      table={title:`Best ${dSym()} per family`,cols:['family','size parameters (nm)','volume fraction',dSym(),'penalty'],rows:rows.map(r=>[r.f.label,r.p?r.p.map(v=>+v.toPrecision(4)).join(' / '):'',r.phi||'',r.dE,r.pen])};
    }else if(g==='map'){
      const fid=mapFam(),r=dRes.families.find(x=>x.f.id===fid);
      if(!r){spec={type:'xy',x:{min:0,max:1},y:{min:0,max:1},series:[]};cap='';table={title:'',cols:[],rows:[]};return {spec,cap};}
      const gr=r.grid;
      if(!gr.b){const pts=gr.a.map((a,i)=>[a,r.map[i]]),ok=pts.filter(q=>Number.isFinite(q[1]));
        spec={type:'xy',x:{min:gr.a[0],max:gr.a.at(-1),log:true,grid:true,name:'d',fmt:v=>`${Fmt.num(v,3)} nm`,label:`${r.f.label}: diameter (nm)`},y:{min:0,max:Math.min(60,Math.max(5,...ok.map(q=>q[1]))*1.05),label:`minimum ${dSym()} over concentration`},
          series:[{name:`${dSym()} (best concentration)`,color:s1,points:pts}],vlines:d&&d.family.id===fid?[{x:d.p[0],color:probe,label:'shown design'}]:[],legend:[]};
        cap=lv(`Colour map of ${r.f.label}: smallest ${dSym()} to the target for each diameter, each at its own best concentration. Click to inspect a diameter.`,`For each ${r.f.label.toLowerCase()} size, how close the colour can get (at the best concentration). Click to look at a size.`);
        table={title:`${r.f.label}: ${dSym()} vs diameter`,cols:['diameter (nm)',dSym(),'volume fraction'],rows:gr.a.map((a,i)=>[a,r.map[i],r.phi[i]])};
      }else{
        const n=gr.a.length,vmax=30,vals=Array.from(r.map,v=>Number.isFinite(v)?Math.min(1,v/vmax):NaN);
        spec={type:'matrix',n,values:vals,key:`${fid}|${dEvalKey}`,xlabel:`shell thickness ${Fmt.num(gr.b[0],2)}–${Fmt.num(gr.b.at(-1),2)} nm →`,ylabel:`core diameter ${Fmt.num(gr.a[0],3)}–${Fmt.num(gr.a.at(-1),3)} nm (log) ↓`,scale:{lo:'0',hi:`≥ ${vmax}`,title:dSym()},
          tip:(i,j)=>`<b>${r.f.label}</b><div>core ${Fmt.num(gr.a[i],3)} nm, shell ${Fmt.num(gr.b[j],2)} nm</div><div>${dSym()} <span>${Fmt.num(r.map[i*n+j],3)}</span></div><div>at ${ppmTxt(r.phi[i*n+j])}</div>`};
        cap=lv(`Colour map of ${r.f.label} (as in Bleyer et al. 2025): smallest ${dSym()} to the target for every core diameter × shell thickness, each at its best concentration. Dark = close. Valleys of equal colour show that core–shell designs are not unique. Click a cell to inspect it.`,`Map for ${r.f.label}: each cell is one core size and shell thickness; dark cells come close to your colour. Several dark regions mean several different particles give the same colour. Click a cell to look at it.`);
        table={title:`${r.f.label}: ${dSym()} map`,cols:['core diameter (nm)','shell (nm)',dSym(),'volume fraction'],rows:gr.a.flatMap((a,i)=>gr.b.map((b,j)=>[a,b,r.map[i*n+j],r.phi[i*n+j]]))};
      }
    }else if(g==='gamut'){
      const gm=designGamut(),series=[{name:'reachable',dots:true,radius:2.2,points:gm.pts,colors:gm.cols,color:ink2}];
      if(d){const path=Array.from({length:60},(_,i)=>{const u=MDes.PHI[0]+(MDes.PHI[1]-MDes.PHI[0])*i/59,l=MDes.labAt(d.spectrum.ext,10**u);return [l[1],l[2]];});
        series.push({name:lv('shown design vs concentration','shown design, rising concentration'),color:ink,points:path,width:1.6,dash:[5,3]},{name:'design',dots:true,radius:6,points:[[d.lab[1],d.lab[2]]],colors:[MCol.labToRGB(d.lab).css],outline:ink,outlineWidth:1.5});}
      series.push({name:'target',dots:true,radius:9,points:[[S.ta,S.tb]],colors:[MCol.labToRGB(tgt()).css],outline:ink,outlineWidth:2.5});
      spec={type:'xy',x:{min:-100,max:100,name:'a*',label:'a*  (green − / red +)',grid:true},y:{min:-100,max:100,label:'b*  (blue − / yellow +)'},series,hlines:[{y:0,color:color('axis')}],vlines:[{x:0,color:color('axis')}],legend:[{name:lv(`reachable at L* = ${Fmt.num(S.tL,3)}`,`reachable at this lightness`),color:ink2},{name:'concentration path',color:ink,dash:[5,3]}]};
      cap=lv(`CIE a*–b* plane at the target lightness L* = ${Fmt.num(S.tL,3)}: every dot is a candidate structure at the concentration that gives this L*, drawn in its own colour; large disc: target; dashed: colour of the shown design as its concentration rises (lighter → darker). Colours far from all dots cannot be made with these particles.`,`Each dot is a colour that one of the candidate colloids can produce at the target lightness. The large disc is your target. If it lies far from all dots, no candidate particle can make it.`);
      table={title:`Reachable colours at L* = ${S.tL}`,cols:['a*','b*','family'],rows:gm.pts.map((q,i)=>[q[0],q[1],gm.fams[i]])};
    }else if(g==='tspec'){
      const T=MDes.transmitted(d.spectrum.ext,d.phi),series=[{name:lv('transmitted (Beer–Lambert)','light let through'),color:s1,points:MCol.WL.map((l,i)=>[l,100*T[i]])}];
      if(d.mcT)series.push({name:lv('transmitted (Monte Carlo, multiple scattering)','with multiple scattering'),color:s2,points:MCol.WL.map((l,i)=>[l,100*d.mcT[i]]),dash:[6,4]});
      spec={type:'xy',x:{min:380,max:780,name:'λ₀',fmt:v=>`${Fmt.num(v,4)} nm`,label:'vacuum wavelength λ₀ (nm)'},y:{min:0,max:105,label:lv('transmitted light (%), 1 cm','light let through (%)')},series,legend:series.map(q=>({name:q.name,color:q.color,dash:q.dash})),strip:{x0:380,x1:750,color:wlColor}};
      cap=lv(`Transmission of the shown design at its optimal concentration through 1 cm. The colour is what remains of daylight after these losses.`,`How much of each colour of light gets through 1 cm of the sample. The colour you see is what is left of white light.`);
      table={title:'Transmission (1 cm)',cols:['wavelength (nm)','T Beer-Lambert',...(d.mcT?['T Monte Carlo']:[])],rows:MCol.WL.map((l,i)=>[l,T[i],...(d.mcT?[d.mcT[i]]:[])])};
    }else{
      const pts=Array.from({length:120},(_,i)=>{const u=MDes.PHI[0]+(MDes.PHI[1]-MDes.PHI[0])*i/119;return [10**u,dEf()(MDes.labAt(d.spectrum.ext,10**u),tgt())];});
      spec={type:'xy',x:{min:10**MDes.PHI[0],max:10**MDes.PHI[1],log:true,grid:true,name:'φ',fmt:v=>ppmTxt(v),label:lv('particle volume fraction φ','concentration (volume fraction)')},y:{min:0,max:Math.min(100,Math.max(...pts.map(q=>q[1])))*1.05,label:`${dSym()} to the target`},
        series:[{name:dSym(),color:s1,points:pts}],vlines:[{x:d.phi,color:probe,label:'optimum'}],legend:[]};
      cap=lv(`Colour difference of the shown design versus concentration: too dilute looks pale, too concentrated looks dark; the optimum is where the colour path in L*a*b* passes closest to the target.`,`Too little particle gives a pale colour, too much a dark one; the best concentration is in between.`);
      table={title:`${dSym()} vs concentration`,cols:['volume fraction',dSym()],rows:pts};
    }
    return {spec,cap};
  }
  function designClick(hit){
    if(S.graph==='families'&&hit.n!=null){const r=dRes?.families[hit.n-1];if(r){S.dSel=r.f.id;S.graph='map';refresh();}return;}
    if(S.graph==='map'){const fid=mapFam(),r=dRes?.families.find(x=>x.f.id===fid);if(!r)return;
      if(hit.cell){dPick={fid,i:hit.cell.i,j:hit.cell.j};refresh();}
      else if(hit.x!=null&&!r.grid.b){const i=r.grid.a.reduce((b,v,k)=>Math.abs(Math.log(v/hit.x))<Math.abs(Math.log(r.grid.a[b]/hit.x))?k:b,0);dPick={fid,i,j:0};refresh();}}
  }

  const nmText=v=>v>=1000?`${+(v/1000).toPrecision(3)} µm`:`${+v.toPrecision(3)} nm`;
  // Near-field scale bar in physical units: a 1-2-5 length of at most 40 % of the slice radius R (in units of a).
  function scaleBar(R){const t=.4*R*S.rad,p=10**Math.floor(Math.log10(t)),len=[5,2,1].map(f=>f*p).find(v=>v<=t*(1+1e-9))||p;return {len:len/S.rad,label:nmText(len)};}
  function updateLegend(d){
    let title,lo,mid,hi,grad='heat',top=1;
    if(d.kind==='pattern'){top=.9;const what=S.lesson==='harmonics'?'|F|²':'Scattered intensity';if(d.radial==='log'){title=`${what}, dB rel. max`;lo=`−${d.db||40}`;mid=`−${(d.db||40)/2}`;hi='0';}else{title=`${what} / max`;lo='0';mid='0.5';hi='1';}}
    else if(d.kind==='sphere'){title='|F|² (relative)';lo='0';mid='';hi='max';}
    else if(d.quantity==='re'){grad='div';const v=Fmt.num(scene.scaleAmp,2),comp=d.component?'ᵧ':'ₓ',sat=scene.saturated?.amp?'≥ ':'';title=S.lesson==='harmonics'?`Re F${comp} (snapshot)`:`Re ${mieLesson()?(S.total?'E':'(E − E_inc)'):'E'}${comp}/E₀ (snapshot)`;lo=`${sat}−${v}`;mid='0';hi=`${sat}+${v}`;}
    else if(d.quantity==='int'){title=`${mieLesson()&&!S.total?'|E − E_inc|²':'|E|²'}/|E₀|²${S.pol==='unpol'&&mieLesson()?' (mean)':''}`;lo='0';mid='';hi=`${scene.saturated?.int?'≥ ':''}${Fmt.num(scene.scaleI,3)}${scene.saturated?.int?` (max ${Fmt.num(scene.maxI,3)})`:''}`;}
    else if(d.quantity==='dI'){grad='div';const v=Fmt.num(scene.scaleD,2),sat=scene.saturated?.d?'≥ ':'';title=`Intensity change |E|²/|E₀|² − 1${S.pol==='unpol'?' (mean of both polarizations)':''}`;lo=`${sat}−${v}`;mid='0';hi=`${sat}+${v}`;}
    else {const r=scene.dbRange;title=`|E|², dB rel. max ${Fmt.num(scene.maxI,3)}`;lo=`−${r}`;mid=`−${r/2}`;hi='0';}
    $('lgTitle').textContent=title;$('lgMin').textContent=lo;$('lgMid').textContent=mid;$('lgMax').textContent=hi;$('lgBar').style.background=Colormap.gradient(grad,top);
  }

  /* ---------- detector ---------- */
  function detectorPoint(){
    const th=S.theta*DEG,ph=S.phi*DEG,dir=[Math.sin(th)*Math.cos(ph),Math.sin(th)*Math.sin(ph),Math.cos(th)];
    if(S.view==='far'||S.view==='pattern'||S.view==='sphere')return {dir,p:dir,kind:S.view==='sphere'?'sphere':'pattern',far:true};
    return {dir,p:dir.map(v=>v*S.r),kind:'slice',far:false};
  }
  const rRange=()=>S.lesson==='plane'||S.lesson==='harmonics'?[0,S.R]:[0,region()];
  const kNm=()=>TAU*mediumN(S.wl)/S.wl;  // medium wavenumber in 1/nm, for absolute dσ/dΩ = |S|²/k²
  function probeToScene(){if(!scene)return;if(!detOn||populationActive()){scene.setProbe(null);return;}const d=detectorPoint();scene.setProbe(d.p,d.kind);}
  function detectorSeries(details=false){
    const c=coef(),d=detectorPoint(),flag=details?{details:true}:{terms:true};
    if(S.lesson==='harmonics'){const {cn,cm}=hCoef(),angular=S.view!=='wave',out=M.mixHarmonics(angular?d.dir:d.p,{electric:cn,magnetic:cm},{N:10,angular,...flag});
      return {out,comps:['Fₓ','Fᵧ','F_z'],value:out.intensity,valueLabel:'|F|²',incident:false,pos:angular?`θ = ${Fmt.num(S.theta,4)}°, φ = ${Fmt.num(S.phi,4)}° on the unit sphere`:`k·(x, y, z) = (${d.p.map(v=>Fmt.num(v,3)).join(', ')})`};}
    if(S.lesson==='plane'){const out=M.sample(d.p,null,{kind:'incident',N:S.pN,electric:S.pE,magnetic:S.pM,...flag});return {out,comps:['Eₓ/E₀','Eᵧ/E₀','E_z/E₀'],value:out.intensity,valueLabel:'|E|²/|E₀|²',incident:false,pos:`k·(x, y, z) = (${d.p.map(v=>Fmt.num(v,3)).join(', ')}), kr = ${Fmt.num(S.r,3)}`};}
    if(d.far){const out=M.angularSeries(c,S.theta*DEG,S.phi*DEG,opts()),abs=useC(),k2=abs?kNm()**2:1,v=out.intensity/k2,[u,f]=areaUnit(v);
      return {out,comps:['A_θ','A_φ'],value:abs?v*f:out.intensity,valueLabel:abs?`dσ/dΩ in ${u}/sr${S.pol==='unpol'?' (mean)':''}`:S.pol==='unpol'?'|S|², mean of both states':'|S|² = k² dσ/dΩ',incident:false,far:true,pos:`Direction θ = ${Fmt.num(S.theta,4)}°, φ = ${Fmt.num(S.phi,4)}° (far field)`};}
    const q=d.p.map(v=>v*S.x),pos=`(x, y, z)/a = (${d.p.map(v=>Fmt.num(v,3)).join(', ')}), kr = ${Fmt.num(S.r*S.x,4)}`;
    if(S.r<1){const out=M.sampleInside(q,c,{...opts(),includeIncident:S.total});
      return {out,comps:['Eₓ/E₀','Eᵧ/E₀','E_z/E₀'],value:out.intensity,valueLabel:`${S.total?'|E|²':'|E − E_inc|²'}/|E₀|² inside${S.pol==='unpol'?' (mean)':''}`,incident:!S.total,inside:true,pos:`${pos} · inside the ${cs()?(S.r<S.q?'core':'shell'):'particle'}`};}
    const out=M.sample(q,c,{...opts(),kind:'scattered',includeIncident:S.total,...flag});
    return {out,comps:['Eₓ/E₀','Eᵧ/E₀','E_z/E₀'],value:out.intensity,valueLabel:`|E|²/|E₀|²${S.total?' total':' scattered'}${S.pol==='unpol'?' (mean)':''}`,incident:S.total,pos};
  }
  function renderDetector(){
    if(populationActive()){probeToScene();return;}
    probeToScene();if(S.graph!=='detector')return;
    $('detOn').checked=detOn;$('detBody').hidden=!detOn;$('detOff').hidden=detOn;$('detHint').hidden=!detOn;if(!detOn)return;
    const ds=detectorSeries(),ch=ds.out.channels[0],nc=ds.comps.length;S.dComp=Math.min(S.dComp,nc-1);
    const sel=$('dComp');if(sel.options.length!==nc||sel.options[0].text!==ds.comps[0])sel.innerHTML=ds.comps.map((l,i)=>`<option value="${i}">${l}</option>`).join('');sel.value=S.dComp;
    const i0=2*S.dComp,terms=ch.vectorTerms.map(v=>[v[i0],v[i0+1]]),start=ds.incident?[ch.incident[i0],ch.incident[i0+1]]:null;
    drawPhasor($('detPhasor'),{terms,start});
    const e=ch.e;$('dValLabel').textContent=ds.valueLabel;$('dVal').textContent=Fmt.num(ds.value,4);
    $('dAmp').innerHTML=`${ds.comps[S.dComp]} = ${Fmt.cx([e[i0],e[i0+1]])}${S.pol==='unpol'&&mieLesson()?'<br>phasors: E ∥ x state':''}`;
    const far=detectorPoint().far;$('dRWrap').hidden=far;$('dTheta').value=S.theta;$('dThetaV').textContent=`${Fmt.num(S.theta,4)}°`;$('dPhi').value=S.phi;$('dPhiV').textContent=`${Fmt.num(S.phi,4)}°`;
    if(!far){const [a,b]=rRange();$('dR').min=a;$('dR').max=b;$('dR').step=(b-a)/400;$('dR').value=S.r;$('dRLabel').textContent=S.lesson==='plane'||S.lesson==='harmonics'?'Distance kr':'Distance r/a';$('dRV').textContent=Fmt.num(S.r,3);}
    ['dTheta','dPhi','dR'].forEach(id=>fill($(id)));
  }
  function openInspector(){
    stopBuild();const ds=detectorSeries(true),plane=S.lesson==='plane',harm=S.lesson==='harmonics',angular=harm&&S.view!=='wave';
    const formula=harm?`F = Σ<sub>n≤10</sub> [c<sup>N</sup><sub>n</sub> N<sub>n</sub>${angular?'<sup>ang</sup>':'<sup>(1)</sup>'} + c<sup>M</sup><sub>n</sub> M<sub>n</sub>${angular?'<sup>ang</sup>':'<sup>(1)</sup>'}]`:plane?`E/E₀ = Σ<sub>n≤${S.pN}</sub> [E<sub>n</sub> M<sub>o1n</sub><sup>(1)</sup> − iE<sub>n</sub> N<sub>e1n</sub><sup>(1)</sup>]`:ds.far?'A = Σ (2n+1)/[n(n+1)] [a<sub>n</sub> × electric angular term + b<sub>n</sub> × magnetic angular term]':ds.inside?`E/E₀ = ${ds.incident?'− E<sub>inc</sub> + ':''}Σ [E<sub>n</sub> M<sub>o1n</sub>(R<sub>n</sub><sup>TE</sup>) − iE<sub>n</sub> N<sub>e1n</sub>(R<sub>n</sub><sup>TM</sup>)], argument m k r`:`E/E₀ = ${ds.incident?'E<sub>inc</sub> + ':''}Σ [iE<sub>n</sub>a<sub>n</sub> N<sub>e1n</sub><sup>(3)</sup> − E<sub>n</sub>b<sub>n</sub> M<sub>o1n</sub><sup>(3)</sup>]`;
    const context=eng()?(harm?'You set the weights yourself; no particle or light beam fixes them.':plane?'Spherical waves centred on the origin; no particle is present.':ds.far?'Contributions of the terms to the scattered wave far from the particle (direction only; the decay with distance is removed).':ds.inside?`Waves inside the particle. Their weights follow from matching the fields at the particle surface.${ds.incident?' The incoming wave is subtracted, as in the map.':''}`:`Spherical waves travelling outwards from the particle, at this point${ds.incident?', plus the incoming wave':''}.`)
      :harm?'Coefficients are set freely; no particle or incident wave fixes them.':plane?'Regular waves j<sub>n</sub>(kr) centred on the origin; no particle is present.':ds.far?'Far-field amplitudes; the common factor e<sup>ikr</sup>/(−ikr) is removed. In the xz plane A<sub>θ</sub> = S₂ cos(φ−α), A<sub>φ</sub> = −S₁ sin(φ−α).':ds.inside?`Internal waves of argument m k r. The radial Riccati functions R<sub>n</sub> carry the internal coefficients (c<sub>n</sub>, d<sub>n</sub>${cs()?' in the core; ψ and ξ combinations in the shell':''}).${ds.incident?' The incident wave is subtracted to match the map.':''}`:`Outgoing waves h<sub>n</sub><sup>(1)</sup>(kr) at this point${ds.incident?', plus the exact incident wave':''}.`;
    inspector.show({channels:ds.out.channels,components:ds.comps,component:S.dComp,position:ds.pos,context,formula,includeIncident:ds.incident,incidentLabel:ds.inside?'− Incident':'Incident',valueLabel:ds.valueLabel,
      factorLabel:harm?(angular?'Normalization A<sub>n</sub>':'Basis scale'):ds.far?'(2n+1)/[n(n+1)]':'E<sub>n</sub> = iⁿ(2n+1)/[n(n+1)]',radialLabel:plane||harm?'j<sub>n</sub>':ds.inside?'R<sub>n</sub><sup>TM</sup>':'h<sub>n</sub><sup>(1)</sup>'});
  }

  /* ---------- metrics ---------- */
  function metrics(){
    if(populationMetrics())return;
    const c=coef(),out=[],m=(label,value,note,warn)=>out.push(`<div class="metric${warn?' warn':''}"><span>${label}</span><b>${value}</b><small>${note}</small></div>`);
    if(S.lesson==='harmonics'){
      const {cn,cm}=hCoef();let norm=0;for(let n=1;n<=10;n++)norm+=M.abs2(cn[n])+M.abs2(cm[n]);
      m('Term A',`${S.hA.t}${sub(S.hA.n)}`,`${S.hA.t==='N'?'electric':'magnetic'} ${pole(S.hA.n)}`);
      m('Term B',S.hBOn?`${S.hB.t}${sub(S.hB.n)}`:'off',S.hBOn?`× ${S.hB.amp.toFixed(2)} at ${S.hB.phase}°`:'add one to see interference');
      m(lv('∫ |F|² dΩ','Total power'),Fmt.num(norm,4),lv('= Σ |c|² (orthonormal basis)','sum of the squared weights'));
    }else if(S.lesson==='plane'){
      const e=errorCurve(),R=S.R,acc=e.find(p=>p[1]>.01),rms=Math.sqrt(e.reduce((s,[r,v])=>s+v*v*r*r,0)/e.reduce((s,[r])=>s+r*r,0));
      m(lv('Orders','Terms'),String(S.pN),`${S.pN*((S.pE?1:0)+(S.pM?1:0))} ${lv('vector wave functions','wave patterns')}`);
      m('RMS error in view',`${Fmt.num(100*rms,3)} %`,`whole ball kr ≤ ${R}`,rms>.05);
      m('Accurate (error < 1 %)',acc?`kr < ${Fmt.num(acc[0],3)}`:`whole view`,`compare with N = ${S.pN}`);
      m('Needed for kR = '+R,`N = ${enoughN()}`,'error < 1 % at kr = kR');
    }else if(S.lesson==='rayleigh'){
      // In cross-section mode values are C = Q pi a^2; the ratios do not change.
      const r=rayleighNow(),a=M.amplitudes(c,0),P=(M.abs2(a.s1)-M.abs2(a.s2))/(M.abs2(a.s1)+M.abs2(a.s2)),G=Math.PI*S.rad**2,q=(sym,Q)=>[`${useC()?'C':'Q'}<sub>${sym}</sub>`,useC()?area(Q*G):Fmt.num(Q,4)];
      m(...q('sca',c.Qsca),lv('exact, full Mie series','exact Mie result'));m(q('sca',r.Qsca)[0]+' Rayleigh',q('sca',r.Qsca)[1],cs()?lv('coated-sphere dipole limit','Rayleigh formula, coated sphere'):lv('(8/3) x⁴ |L|²','Rayleigh formula'));
      m('Exact / Rayleigh',Fmt.num(c.Qsca/r.Qsca,4),Math.abs(c.Qsca/r.Qsca-1)>.1?'beyond the Rayleigh regime':'Rayleigh law holds',Math.abs(c.Qsca/r.Qsca-1)>.1);
      m(...q('abs',Math.max(0,c.Qext-c.Qsca)),S.k>0||(cs()&&S.kc>0)?`Rayleigh: ${q('abs',r.Qabs)[1]}`:'no absorption (κ = 0)');
      m('Polarization at 90°',`${Fmt.num(100*P,3)} %`,'unpolarized incident light');
      if(S.units==='spec'){const s=spectrumData(),pk=s.peak;m('Extinction peak',pk?`${pk.wl} nm`:'—',pk?`Q<sub>ext</sub> = ${Fmt.num(pk.Qext,3)}`:'no data in range');}
    }else if(designOn()){designMetrics(m);
    }else if(clusterLesson()){clusterMetrics(m);
    }else{
      const N=Neff(),part=isPartial(),G=Math.PI*S.rad**2,q=(sym,Q)=>[`${useC()?'C':'Q'}<sub>${sym}</sub>`,useC()?area(Q*G):Fmt.num(Q,4)];
      m(...q('ext',c.Qext),useC()?`Q<sub>ext</sub> = ${Fmt.num(c.Qext,4)}`:'extinction efficiency');m(...q('sca',c.Qsca),part?`shown terms: ${q('sca',M.efficiency(c,opts()))[1]}`:useC()?`Q<sub>sca</sub> = ${Fmt.num(c.Qsca,4)}`:'scattering',part);
      m(...q('abs',Math.max(0,c.Qext-c.Qsca)),useC()?`Q<sub>abs</sub> = ${Fmt.num(Math.max(0,c.Qext-c.Qsca),4)}`:'absorption');m('g = ⟨cos θ⟩',Fmt.num(c.g,3),lv('asymmetry parameter','0: symmetric · 1: all forward'));
      if(S.units==='spec'){const s=spectrumData(),pk=s.peak;m('Extinction peak',pk?`${pk.wl} nm`:'—',pk?`${useC()?'C':'Q'}<sub>ext</sub> = ${useC()?area(pk.Qext*G):Fmt.num(pk.Qext,3)}`:'no data in range');}
      if(S.lesson==='large'){const t=M.airyZero(S.x),rb=M.rainbowAngle(S.n);m('Diffraction minimum',t?`${Fmt.num(t/DEG,3)}°`:'—','sin θ = 3.83/x');m('Rainbow (geometric)',rb?`${Fmt.num(rb/DEG,4)}°`:'—',rb?lv('first order, Descartes','from ray optics'):'needs 1 < n < 2');}
      m(lv('Orders','Terms'),part?`${N} of ${c.N}`:String(c.N),lv('N ≈ x + 4x<sup>1/3</sup> + 2','about x + 4x<sup>1/3</sup> + 2 needed'),part&&N<c.N);
    }
    $('metrics').innerHTML=out.join('');
    const b=$('partialBadge');
    if(mieLesson()&&isPartial()){const bits=[];if(Neff()<C.N)bits.push(`N = ${Neff()} of ${C.N} ${lv('orders','terms')}`);if(!S.sE)bits.push(lv('no electric aₙ','electric terms aₙ off'));if(!S.sM)bits.push(lv('no magnetic bₙ','magnetic terms bₙ off'));if(S.solo)bits.push(lv(`only n = ${S.solo}`,`only term n = ${S.solo}`));b.innerHTML=lv(`<b>⚠ Partial sum</b> ${bits.join(' · ')}. Not the physical solution.`,`<b>⚠ Incomplete sum</b> ${bits.join(' · ')}. Not the real result.`);b.hidden=false;}
    else if(S.lesson==='plane'&&S.pN<enoughN()){b.innerHTML=lv(`<b>Truncated</b> N = ${S.pN}: accurate only for kr ≲ ${S.pN}`,`<b>Too few terms</b> N = ${S.pN}: correct only for kr ≲ ${S.pN}`);b.hidden=false;}
    else if(S.lesson==='tmat'&&!S.msAll){b.innerHTML=lv(`<b>⚠ Partial sum</b> ${S.msK} order${S.msK===1?'':'s'} of scattering. Not the exact solution.`,`<b>⚠ Incomplete</b> ${S.msK} exchange${S.msK===1?'':'s'} between the spheres. Not the real result.`);b.hidden=false;}
    else b.hidden=true;
  }
  let errKey='',errData=[];
  function errorCurve(){
    const key=`${S.pN}|${S.pE}|${S.pM}|${S.R}`;if(key===errKey)return errData;errKey=key;
    const ev=M.fieldEvaluator(null,{kind:'incident',N:S.pN,electric:S.pE,magnetic:S.pM}),D=[],G=Math.PI*(3-Math.sqrt(5));
    for(let i=0;i<40;i++){const z=1-2*(i+.5)/40,r=Math.sqrt(1-z*z);D.push([r*Math.cos(G*i),r*Math.sin(G*i),z]);}
    errData=[];for(let i=1;i<=120;i++){const kr=S.R*i/120;let s=0;for(const u of D){const p=u.map(v=>v*kr),e=ev(p),z=p[2];s+=(e[0]-Math.cos(z))**2+(e[1]-Math.sin(z))**2+e[2]**2+e[3]**2+e[4]**2+e[5]**2;}errData.push([kr,Math.sqrt(s/D.length)]);}
    return errData;
  }
  // Plane wave E = Σ E_n (M_o1n − i N_e1n): surface-averaged |E|² of order n at kr = r is (2n+1)/2 j_n² (M) and
  // (2n+1)/2 {[(ρ j_n)'/ρ]² + n(n+1)(j_n/ρ)²} (N); summed over n this is 1. Shares are volume averages over kr ≤ R (in %).
  let shKey='',shData=null;
  function planeShares(){
    const R=S.R,key=R+'|'+S.pN;if(key===shKey)return shData;shKey=key;
    const nMax=Math.min(80,Math.ceil(R+4*Math.cbrt(R)+12)),E=new Float64Array(nMax),Mm=new Float64Array(nMax),K=400,h=R/K;
    for(let i=0;i<=K;i++){const r=Math.max(1e-6,i*h),j=M.radial(r,nMax+1).j,w=(i===0||i===K?1:i%2?4:2)*h/3*r*r;
      for(let n=1;n<=nMax;n++){const a=(2*n+1)/2,jd=((n+1)*j[n-1]-n*j[n+1])/(2*n+1),jr=(j[n-1]+j[n+1])/(2*n+1);Mm[n-1]+=w*a*j[n]**2;E[n-1]+=w*a*(jd*jd+n*(n+1)*jr*jr);}}
    const v=R**3/3,cum=[];let c=0,need=nMax;
    for(let n=0;n<nMax;n++){E[n]*=100/v;Mm[n]*=100/v;c+=E[n]+Mm[n];cum.push(c);if(c>=99&&need===nMax)need=n+1;}
    const nShow=Math.min(nMax,Math.max(S.pN,need+3));
    return shData={E:[...E],M:[...Mm],cum,need,nShow};
  }
  function enoughN(){for(let N=1;N<=60;N++){const ev=M.fieldEvaluator(null,{kind:'incident',N});let worst=0;for(const z of [S.R,-S.R]){const e=ev([0,0,z]);worst=Math.max(worst,Math.hypot(e[0]-Math.cos(z),e[1]-Math.sin(z)));}if(worst<.01)return N;}return 60;}

  /* ---------- spectra ---------- */
  let specKey='',specData=null;
  function spectrumData(){
    const key=[S.surfaceOn,S.surfaceA,S.struct,S.mat,S.matCore,S.med,S.cmed,S.cn,S.ck,S.ccn,S.cck,S.rad,S.core,S.shell,S.wlMin,S.wlMax].join('|');if(key===specKey)return specData;specKey=key;
    // About 400 samples over the chosen range: a narrower range gives a finer spectrum.
    const rows=[];let peak=null;const step=Math.max(.5,(S.wlMax-S.wlMin)/400);
    for(let i=0;;i++){const wl=Math.min(S.wlMax,S.wlMin+i*step);
      const p=physAt(wl),m=[p.n,p.k],c=cs()?M.coreShell(p.q*p.x,p.x,[p.nc,p.kc],m):M.coefficients(p.x,m),f=n=>n<=c.N?2*(2*n+1)/p.x**2:0;
      const r=cs()?M.rayleighCoated(p.x,p.q,[p.nc,p.kc],m):M.rayleigh(p.x,m);
      const row={wl,ok:p.ok,x:p.x,Qext:c.Qext,Qsca:c.Qsca,Qabs:Math.max(0,c.Qext-c.Qsca),ED:f(1)*M.abs2(c.a[1]),MD:f(1)*M.abs2(c.b[1]),EQ:f(2)*M.abs2(c.a[2]||[0,0]),MQ:f(2)*M.abs2(c.b[2]||[0,0]),RQsca:r.Qsca,RQabs:Math.max(0,r.Qabs)};
      rows.push(row);if(p.ok&&(!peak||row.Qext>peak.Qext))peak=row;
      if(wl>=S.wlMax)break;
    }
    if(peak)peak={...peak,wl:Math.round(peak.wl)};
    specData={rows,peak};return specData;
  }
  // Approximate colour of a visible wavelength, for the orientation strip under the spectrum.
  function wlColor(l){let r=0,g=0,b=0;if(l<440){r=-(l-440)/60;b=1;}else if(l<490){g=(l-440)/50;b=1;}else if(l<510){g=1;b=-(l-510)/20;}else if(l<580){r=(l-510)/70;g=1;}else if(l<645){r=1;g=-(l-645)/65;}else r=1;
    const f=l<420?.3+.7*(l-380)/40:l>700?.3+.7*(780-l)/80:1;return `rgb(${[r,g,b].map(v=>Math.round(255*Math.max(0,v*f))).join(',')})`;}

  /* ---------- chains of spheres (lessons 07 and 08, T-matrix) ---------- */
  const Chain=M.Chain,AXV={x:[1,0,0],y:[0,1,0],z:[0,0,1]};
  // Gap relative to the (outer) radius a: from nm in physical units, else the dimensionless setting.
  const gapRel=()=>clamp(phys()?S.gapNm/S.rad:S.gap,.05,6);
  const halfLen=()=>(S.ns-1)/2*(2+gapRel())+1;          // half length of the chain in units of a
  const sphereCoef=(x,m,L)=>cs()?M.coreShell(S.q*x,x,[S.nc,S.kc],m,L):M.coefficients(x,m,L);
  let CL=null,CLkey='';
  function clusterNow(){
    const g=gapRel(),x=S.x,d=x*(2+g),L=Chain.orderFor(x,d,S.ns),key=[x,S.n,S.k,S.struct,S.q,S.nc,S.kc,S.ns,g,S.axis].join('|');
    if(key!==CLkey){CLkey=key;CL={ch:Chain.chain({c:sphereCoef(x,[S.n,S.k],L),x,L,Ns:S.ns,d,axis:S.axis}),sols:{},avg:null,T:{}};}
    return CL;
  }
  const ordersNow=()=>S.lesson==='tmat'&&!S.msAll?S.msK:null;
  const polsNow=()=>S.pol==='unpol'?['x','y']:[S.pol];
  function clusterSol(p,orders=ordersNow()){const C=clusterNow(),k=`${p}|${orders}`;return C.sols[k]||(C.sols[k]=Chain.solve(C.ch,[0,0,1],AXV[p==='y'?'y':'x'],orders));}
  const meanQ=r=>{const f=k=>r.reduce((s,v)=>s+v[k],0)/r.length;return {Qext:f('Qext'),Qsca:f('Qsca'),Qabs:f('Qabs')};};
  const clusterQ=(orders=ordersNow())=>meanQ(polsNow().map(p=>clusterSol(p,orders)));
  function clusterAvg(){const C=clusterNow();return C.avg||(C.avg=Chain.orientationAverage(C.ch));}
  // Centres of the spheres in the lab frame, in units of a.
  // Lesson 07 places the axes' origin at the expansion origin: the particles sit at -shift along the chain axis.
  const shiftA=()=>S.lesson==='tmat'?S.origin:0;
  const centres=()=>{const a=AXV[S.axis],g=gapRel(),o=shiftA();return Array.from({length:S.ns},(_,j)=>a.map(v=>v*((j-(S.ns-1)/2)*(2+g)-o)));};

  // Progressive background jobs (spectra, sweeps): coarse-to-fine order, ~35 ms slices, redraw as results arrive.
  const jobs={};
  function refineOrder(n){const o=[],seen=new Uint8Array(n);for(let st=1<<Math.ceil(Math.log2(Math.max(2,n)));st>=1;st>>=1)for(let i=0;i<n;i+=st)if(!seen[i]){seen[i]=1;o.push(i);}if(n&&!seen[n-1])o.push(n-1);return o;}
  function progressive(id,key,xs,fn){
    let j=jobs[id];if(j&&j.key===key)return j;if(j)clearTimeout(j.timer);
    j=jobs[id]={key,xs,res:new Array(xs.length),n:0,order:refineOrder(xs.length),done:false,timer:0};
    const step=()=>{if(jobs[id]!==j)return;const t0=performance.now();
      while(j.n<j.order.length&&performance.now()-t0<35){const i=j.order[j.n++];try{j.res[i]=fn(xs[i]);}catch(e){j.res[i]=null;console.error(e);}}
      j.done=j.n>=j.order.length;if(S.graph===id&&clusterLesson())renderGraph();if(j.done)metrics();else j.timer=setTimeout(step,0);};
    j.timer=setTimeout(step,0);return j;
  }
  const jobRows=j=>j.xs.map((x,i)=>j.res[i]?{x,...j.res[i]}:null).filter(Boolean);
  const jobNote=j=>j.done?'':` Computing… ${Math.round(100*j.n/j.order.length)} %`;
  const solvePols=(ch,pols)=>meanQ(pols.map(p=>Chain.solve(ch,[0,0,1],AXV[p==='y'?'y':'x'])));
  function spectrumJob(){
    const nS=clamp(Math.round((S.wlMax-S.wlMin)/4),60,140),xs=Array.from({length:nS},(_,i)=>S.wlMin+(S.wlMax-S.wlMin)*i/(nS-1)),avg=S.lesson==='chain'&&S.avg,pols=polsNow(),orders=ordersNow(),g=gapRel();
    const key=[S.surfaceOn,S.surfaceA,S.struct,S.mat,S.matCore,S.med,S.cmed,S.cn,S.ck,S.ccn,S.cck,S.rad,S.core,S.shell,S.wlMin,S.wlMax,S.ns,g,S.axis,avg,pols,orders].join('|');
    return progressive('spectrum',key,xs,wl=>{
      const p=physAt(wl),m=[p.n,p.k],d=p.x*(2+g),L=Chain.orderFor(p.x,d,S.ns),c=cs()?M.coreShell(p.q*p.x,p.x,[p.nc,p.kc],m,L):M.coefficients(p.x,m,L),one=cs()?M.coreShell(p.q*p.x,p.x,[p.nc,p.kc],m):M.coefficients(p.x,m);
      const ch=Chain.chain({c,x:p.x,L,Ns:S.ns,d,axis:S.axis});
      const q=avg?Chain.orientationAverage(ch):orders==null?solvePols(ch,pols):meanQ(pols.map(pp=>Chain.solve(ch,[0,0,1],AXV[pp==='y'?'y':'x'],orders)));
      return {Qext:q.Qext,Qsca:q.Qsca,Qabs:q.Qabs,single:one.Qext,ok:p.ok};});
  }
  // Peak of Q_ext over the spectral range (coarse scan, then a parabola through the best three points).
  function peakOf(wls,qs){let i=0;for(let k=1;k<qs.length;k++)if(qs[k]>qs[i])i=k;if(i===0||i===qs.length-1)return wls[i];const a=qs[i-1],b=qs[i],c=qs[i+1],den=a-2*b+c;return wls[i]+(den<0?.5*(a-c)/den:0)*(wls[1]-wls[0]);}
  function gapJob(){
    const xs=Array.from({length:24},(_,i)=>.05*(4/.05)**(i/23));
    if(S.units==='spec'){
      const key=['gaps',S.surfaceOn,S.surfaceA,S.struct,S.mat,S.matCore,S.med,S.cmed,S.cn,S.ck,S.ccn,S.cck,S.rad,S.core,S.shell,S.wlMin,S.wlMax,S.ns,S.axis].join('|'),wls=Array.from({length:33},(_,i)=>S.wlMin+(S.wlMax-S.wlMin)*i/32);
      return progressive('gap',key,xs,g=>{const qx=[],qy=[];
        for(const wl of wls){const p=physAt(wl),m=[p.n,p.k],d=p.x*(2+g),L=Chain.orderFor(p.x,d,S.ns),ch=Chain.chain({c:cs()?M.coreShell(p.q*p.x,p.x,[p.nc,p.kc],m,L):M.coefficients(p.x,m,L),x:p.x,L,Ns:S.ns,d,axis:S.axis});qx.push(solvePols(ch,['x']).Qext);qy.push(solvePols(ch,['y']).Qext);}
        return {px:peakOf(wls,qx),py:peakOf(wls,qy)};});
    }
    const key=['gap',S.x,S.n,S.k,S.struct,S.q,S.nc,S.kc,S.ns,S.axis].join('|');
    return progressive('gap',key,xs,g=>{const d=S.x*(2+g),L=Chain.orderFor(S.x,d,S.ns),ch=Chain.chain({c:sphereCoef(S.x,[S.n,S.k],L),x:S.x,L,Ns:S.ns,d,axis:S.axis});return {qx:solvePols(ch,['x']).Qext,qy:solvePols(ch,['y']).Qext};});
  }
  function lengthJob(){
    const g=gapRel(),xs=[1,2,3,4,5,6,7,8],key=['len',S.x,S.n,S.k,S.struct,S.q,S.nc,S.kc,g,S.axis].join('|');
    return progressive('length',key,xs,ns=>{const d=S.x*(2+g),L=Chain.orderFor(S.x,d,ns),ch=Chain.chain({c:sphereCoef(S.x,[S.n,S.k],L),x:S.x,L,Ns:ns,d,axis:S.axis});return {qx:solvePols(ch,['x']).Qext,qy:solvePols(ch,['y']).Qext};});
  }

  // 3D view of a chain: far-field pattern or a near-field slice through all spheres.
  function clusterScene(draft){
    const pols=polsNow(),cen=centres(),q=S.q;
    if(S.view==='near'&&nearAllowed()){
      const R=region(),s=scene.R0/R,angles=pols.map(p=>p==='y'?Math.PI/2:0),evs=pols.map(p=>Chain.fieldEvaluator(clusterSol(p)));
      const nIn=Math.max(S.n,cs()?S.nc:0),need=Math.ceil(2*R*S.x/TAU*Math.max(7,5*nIn)),cap=S.ns>4?141:181,finalK=clamp(need,90,cap),K=draft?Math.min(80,finalK):finalK,buf=new Float64Array(6);
      const sh=AXV[S.axis].map(v=>v*shiftA()),field=p=>{const qq=[(p[0]+sh[0])*S.x,(p[1]+sh[1])*S.x,(p[2]+sh[2])*S.x];let I=0,T=0,e0=null;
        for(let i=0;i<evs.length;i++){const e=i?buf:new Float64Array(6),inside=evs[i](qq,e)>=0,z=qq[2],ca=Math.cos(angles[i]),sa=Math.sin(angles[i]),inc=[ca*Math.cos(z),ca*Math.sin(z),sa*Math.cos(z),sa*Math.sin(z)],o=inside?0:1,sign=inside?(S.total?0:-1):(S.total?1:0);
          let t=e[4]**2+e[5]**2;for(let k=0;k<4;k++)t+=(e[k]+o*inc[k])**2;T+=t;if(sign)for(let k=0;k<4;k++)e[k]+=sign*inc[k];I+=M.norm2(e);if(!i)e0=e;}
        return {e:e0,I:I/evs.length,dI:T/evs.length-1};};
      const plane=S.slice,uv=c=>plane==='xz'?[c[2],c[0],c[1]]:plane==='yz'?[c[2],c[1],c[0]]:[c[0],c[1],c[2]],rings=[];
      for(const c of cen){const [u,v,dd]=uv(c);for(const r of cs()?[1,q]:[1])if(Math.abs(dd)<r)rings.push({r:Math.sqrt(r*r-dd*dd),u,v});}
      info(`Slice ${S.slice} · r ≤ ${Fmt.num(R,3)}a${phys()?` = ${nmText(R*S.rad)}`:''} · ${K}×${K} samples · ${S.ns} sphere${S.ns>1?'s':''}`);
      return {kind:'slice',extent:R,inner:0,plane,K,finalK,field,quantity:shownQuantity(),component:S.pol==='y'?1:0,vectors:S.vectors&&S.pol!=='unpol',scale:phys()&&S.scaleBar?scaleBar(R):null,
        particle:{spheres:cen.map(c=>({c:c.map(v=>v*s),r:s,core:cs()?q*s:null})),rings,show:S.showParticle,translucent:true}};
    }
    if(S.view==='near')S.view='far';
    const sols=pols.map(p=>clusterSol(p)),T=clamp(Math.ceil(3*S.x*halfLen())+100,120,300),P=72,v=new Float32Array((T+1)*(P+1));
    for(let i=0;i<=T;i++){const th=Math.PI*i/T,st=Math.sin(th),ct=Math.cos(th);
      for(let j=0;j<=P;j++){const ph=TAU*j/P,u=[st*Math.cos(ph),st*Math.sin(ph),ct];let s=0;for(const so of sols){const F=Chain.farField(so,u);s+=F[0]**2+F[1]**2+F[2]**2+F[3]**2+F[4]**2+F[5]**2;}v[i*(P+1)+j]=s/sols.length;}}
    info(`Far field · ${S.ns} sphere${S.ns>1?'s':''} along ${S.axis} · radius ${S.radial==='log'?`in dB (0 to −${S.farDb||40})`:'∝ intensity'}`);
    const u=Math.min(.16,.5/(halfLen()+shiftA()));
    return {kind:'pattern',T,P,values:v,radial:S.radial,db:S.farDb||40,particle:{show:S.farParticle,spheres:cen.map(c=>({c:c.map(w=>w*u),r:u}))}};
  }

  function clusterMetrics(m){
    const av=S.lesson==='chain'&&S.avg,q=av?clusterAvg():clusterQ(),one=coef(),G=S.ns*Math.PI*S.rad**2,f=(sym,Q)=>[`${useC()?'C':'Q'}<sub>${sym}</sub>`,useC()?area(Q*G):Fmt.num(Q,4)];
    m(...f('ext',q.Qext),(useC()?lv('whole chain','all spheres together'):lv('per sphere, C/(N πa²)','per sphere'))+(av?', random orientation':''));
    m(...f('sca',q.Qsca),'scattering');m(...f('abs',Math.abs(q.Qabs)<1e-9*q.Qext?0:q.Qabs),'absorption');
    m(lv('Coupling','Effect of coupling'),`× ${Fmt.num(q.Qext/one.Qext,3)}`,lv('Q<sub>ext</sub> relative to one sphere','extinction vs separate spheres'));
    if(S.units==='spec'&&jobs.spectrum){const r=jobRows(jobs.spectrum).filter(p=>p.ok);if(r.length){const pk=r.reduce((a,b)=>b.Qext>a.Qext?b:a),p1=r.reduce((a,b)=>b.single>a.single?b:a);m('Extinction peak',jobs.spectrum.done?`${Math.round(pk.x)} nm`:'…',`one sphere: ${Math.round(p1.x)} nm`);}}
    if(S.lesson==='tmat')m(lv('Orders of scattering','Exchanges'),S.msAll?lv('all (exact)','all'):String(S.msK),S.msAll?'(I − T H)⁻¹':lv('Neumann series','step by step'),!S.msAll);
    m(lv('Orders per sphere','Terms per sphere'),String(clusterNow().ch.L),lv('extra orders for close neighbours','more terms for small gaps'));
  }

  // Graphs of the chain lessons. Returns {spec, cap}; sets the data table.
  function clusterGraph(g,{s1,s2,s3,ink2,probe}){
    let spec,cap='';const word=lv('per sphere','per sphere');
    if(g==='tmatrix'){
      const C=clusterNow(),ch=C.ch,o=S.origin,Lo=Math.min(22,M.nstop(S.x*(halfLen()+o))),key=`${o}|${Lo}`;
      const T=C.T[key]||(C.T[key]=Chain.clusterT(ch,o*S.x,Lo)),D=T.D,basis=[];
      for(let mm=-Lo;mm<=Lo;mm++)for(let t=0;t<2;t++)for(let n=Math.max(1,Math.abs(mm));n<=Lo;n++)basis.push({m:mm,t,n,k:t*Chain.LL(Lo)+Chain.idx(n,mm)});
      let mx=0;for(let i=0;i<D*D;i++)mx=Math.max(mx,Math.hypot(T.TR[i],T.TI[i]));
      const lo=Math.log10(mx)-8,vals=new Float32Array(D*D);
      for(let i=0;i<D;i++)for(let j=0;j<D;j++){const a=basis[i].k*D+basis[j].k,v=Math.hypot(T.TR[a],T.TI[a]);vals[i*D+j]=v>mx*1e-12?clamp((Math.log10(v)-lo)/8,0,1):NaN;}
      const blocks=[];let st=0;for(let mm=-Lo;mm<=Lo;mm++){const len=2*(Lo-Math.max(1,Math.abs(mm))+1);blocks.push({start:st,end:st+len,label:mm%Math.max(1,Math.ceil(Lo/5))===0?`m=${mm}`:''});st+=len;}
      const lab=b=>`${b.t?'N':'M'}${sub(b.n)} (m = ${b.m})`;
      spec={type:'matrix',n:D,values:vals,key:`${CLkey}|${key}`,blocks,xlabel:lv('incident wave (column)','incoming wave (column)'),ylabel:lv('scattered wave (row)','scattered wave (row)'),
        scale:{hi:Fmt.num(mx,2),lo:Fmt.num(mx*1e-8,1),title:'|T|'},tip:(i,j)=>{const a=basis[i].k*D+basis[j].k;return `<b>${lab(basis[i])} ← ${lab(basis[j])}</b><div>T = ${Fmt.cx([T.TR[a],T.TI[a]],3)}</div>`;}};
      cap=lv(`Magnitude |T| of the T-matrix about the expansion origin (log colour scale, 8 decades; grey: zero), truncated at n = ${Lo}. Basis ordered by the azimuthal order m (the e<sup>imφ</sup> dependence around the chain axis; not the refractive index m), then M (magnetic) and N (electric) waves, then n. In the chain frame (z′ along the chain) m is conserved, so the matrix is block-diagonal.${S.ns===1&&!o?' A sphere at the origin: diagonal, T = −b<sub>n</sub> (M) and −a<sub>n</sub> (N).':''}`,
        `Each pixel is one element of the T-matrix: how strongly an incoming wave pattern (column) produces a scattered pattern (row). Bright = strong, grey = zero. Patterns are sorted into blocks by their rotation number m: how often the pattern repeats around the chain axis (this m has nothing to do with the refractive index m).${S.ns===1&&!o?' One sphere at the centre: only the diagonal is filled, with the Mie coefficients.':''}`);
      const rows=[];for(let i=0;i<D&&rows.length<4000;i++)for(let j=0;j<D;j++){const a=basis[i].k*D+basis[j].k,v=Math.hypot(T.TR[a],T.TI[a]);if(v>mx*1e-8)rows.push([basis[i].t?'N':'M',basis[i].n,basis[i].m,basis[j].t?'N':'M',basis[j].n,basis[j].m,T.TR[a],T.TI[a],v]);}
      table={title:`T-matrix about the origin (n ≤ ${Lo}, |T| > 1e-8 max)`,cols:['row type','row n','row m','col type','col n','col m','Re T','Im T','|T|'],rows};
    }else if(g==='msorders'){
      const Kmax=20,ex=clusterQ(null),pts=[];for(let K=0;K<=Kmax;K++){const q=clusterQ(K);pts.push([K,q.Qext,q.Qsca]);}
      const C=clusterNow(),rho=C.rho??(C.rho=Chain.spectralRadius(C.ch)),span=Math.max(ex.Qext,ex.Qsca),hi=span*2.2,div=rho>=1;
      const series=[{name:'Q_ext, K orders',color:s1,points:pts.map(p=>[p[0],p[1]]),label:'Q_ext'},{name:'Q_sca, K orders',color:s2,points:pts.map(p=>[p[0],p[2]]),label:'Q_sca'}];
      spec={type:'xy',x:{min:0,max:Kmax,name:'K',label:lv('orders of scattering K','number of exchanges K'),ticks:[0,2,4,6,8,10,12,14,16,18,20]},y:{min:Math.max(-.5*span,Math.min(0,...pts.map(p=>Math.min(p[1],p[2])))),max:hi,label:'efficiency Q (per sphere)'},series,
        hlines:[{y:ex.Qext,color:s1,dash:[5,4]},{y:ex.Qsca,color:s2,dash:[5,4]}],vlines:S.msAll?[]:[{x:S.msK,color:probe,label:`K = ${S.msK}`}],legend:[...series.map(s=>({name:s.name,color:s.color})),{name:'exact',color:ink2,dash:[5,4]}]};
      cap=lv(`Multiple-scattering series truncated after K orders (K = 0: independent spheres, each excited by the incident wave only). Dashed: exact solution (I − T H)⁻¹. Spectral radius of T H: ρ = ${Fmt.num(rho,3)}. ${div?'<b>ρ > 1: the series diverges</b>, as here on the blue side of the coupled resonance; only the matrix inverse works.':rho>.85?'ρ is close to 1, so the series converges only slowly.':'The series converges towards the exact values.'}`,
        `Each step K lets the light scattered by one sphere excite the others once more (K = 0: the spheres ignore each other). Dashed: the exact result. ${div?'<b>Here the steps do not settle</b>: the spheres interact so strongly that the step-by-step approach fails and the system of equations must be solved directly.':rho>.85?'The steps approach the exact result, but slowly: the interaction is strong.':'The steps approach the exact result.'}`);
      table={title:'Orders of scattering',cols:['K','Qext','Qsca','Qext exact','Qsca exact'],rows:pts.map(p=>[p[0],p[1],p[2],ex.Qext,ex.Qsca])};
    }else if(g==='angular'){
      const sx=clusterSol('x'),sy=clusterSol('y'),one=coef(),K=clamp(Math.ceil(S.x*halfLen()*12),361,1441),abs=useC(),sc=abs?1/kNm()**2:1,[unit,uf]=abs?areaUnit(sc*(sx.Qext*S.ns*Math.PI*S.x**2)):['',1],f=sc*uf;
      const P2=[],P1=[],U=[],I2=[],I1=[];let max=0,min=Infinity;
      for(let i=0;i<=K;i++){const t=180*i/K,th=t*DEG,u=[Math.sin(th),0,Math.cos(th)],Fx=Chain.farField(sx,u),Fy=Chain.farField(sy,u),a=Fx.reduce((s,v)=>s+v*v,0)*f,b=Fy.reduce((s,v)=>s+v*v,0)*f,am=M.amplitudes(one,Math.cos(th));
        P2.push([t,a]);P1.push([t,b]);U.push([t,(a+b)/2]);I2.push([t,S.ns*M.abs2(am.s2)*f]);I1.push([t,S.ns*M.abs2(am.s1)*f]);max=Math.max(max,a,b,I2[i][1],I1[i][1]);min=Math.min(min,a||Infinity,b||Infinity);}
      const log=S.scale.angular,series=[{name:'I∥ (E ∥ x)',color:s1,points:P2,label:'I∥'},{name:'I⊥ (E ∥ y)',color:s2,points:P1,label:'I⊥'}];
      if(S.pol==='unpol')series.push({name:'unpolarized mean',color:s3,points:U,width:1.6,label:'mean'});
      series.push({name:`${S.ns} independent spheres ∥`,color:s1,points:I2,dash:[5,4],width:1.2},{name:`${S.ns} independent spheres ⊥`,color:s2,points:I1,dash:[5,4],width:1.2});
      spec={type:'xy',x:{min:0,max:180,name:'θ',fmt:v=>`${Fmt.num(v,4)}°`,ticks:[0,30,60,90,120,150,180],label:'scattering angle θ (in the xz plane)'},y:{min:log?Math.max(min*.5,max*1e-8):0,max:log?max*2:max*1.08,log,label:abs?`dσ/dΩ (${unit}/sr)`:'|F|² = k² dσ/dΩ'},series,legend:[...series.slice(0,S.pol==='unpol'?3:2).map(s=>({name:s.name,color:s.color})),{name:lv('independent spheres (no coupling, no interference)','separate spheres'),color:ink2,dash:[5,4]}]};
      cap=lv(`Intensity scattered by the whole chain into the xz plane for E ∥ x (I∥) and E ∥ y (I⊥). Dashed: ${S.ns} independent spheres added incoherently. The difference comes from coupling and from interference between the waves of the spheres${S.axis==='y'||S.ns===1?'':', which produces fringes when the chain lies in the scattering plane'}.`,
        `Light scattered in each direction of the horizontal plane by the whole chain. Dashed: ${S.ns} separate spheres without any interaction or interference. The chain's waves add up with their phases, which creates the extra lobes.`);
      table={title:abs?`Differential cross section (${unit}/sr)`:'Angular intensity (|F|²)',cols:['θ (deg)','E ∥ x','E ∥ y','independent ∥','independent ⊥'],rows:P2.map((p,i)=>[p[0],p[1],P1[i][1],I2[i][1],I1[i][1]])};
    }else if(g==='spectrum'){
      const j=spectrumJob(),rows=jobRows(j),C=useC(),G=S.ns*Math.PI*S.rad**2,mxQ=Math.max(1e-30,...rows.map(r=>Math.max(r.Qext,r.single))),[unit,uf]=C?areaUnit(mxQ*G):['',1],fq=C?G*uf:1,sym=C?'C':'Q',log=S.scale.spectrum;
      const pts=k=>rows.map(r=>[r.x,r.ok?r[k]*fq:NaN]),absP=rows.some(r=>r.Qabs>1e-3*r.Qext);
      const series=[{name:absP?`${sym}_ext`:`${sym}_ext = ${sym}_sca`,color:s1,points:pts('Qext'),label:absP?`${sym}_ext`:null}];
      if(absP)series.push({name:`${sym}_sca`,color:s2,points:pts('Qsca'),label:`${sym}_sca`},{name:`${sym}_abs`,color:s3,points:pts('Qabs'),label:`${sym}_abs`});
      series.push({name:lv(`one sphere ×${S.ns}`,`separate spheres`),color:ink2,points:pts('single'),dash:[5,4],width:1.4});
      const ys=series.flatMap(q=>q.points.map(p=>p[1])).filter(v=>v>0&&Number.isFinite(v)),ymax=ys.length?Math.max(...ys):1;
      spec={type:'xy',x:{min:S.wlMin,max:S.wlMax,name:'λ₀',fmt:v=>`${Math.round(v)} nm`,label:'vacuum wavelength λ₀ (nm)'},y:log?{min:Math.max(Math.min(...ys),ymax*1e-6),max:ymax*2,log:true,label:C?`cross section C (${unit})`:`efficiency Q (${word})`}:{min:0,max:ymax*1.08,label:C?`cross section C (${unit})`:`efficiency Q (${word})`},
        series,vlines:[{x:S.wl,color:color('ink'),label:`λ₀ = ${S.wl} nm`}],legend:series.map(q=>({name:q.name,color:q.color,dash:q.dash})),strip:{x0:380,x1:750,color:wlColor}};
      cap=lv(`${C?'Cross sections of the whole chain':'Efficiencies per sphere, Q = C/(N πa²)'}, ${S.lesson==='chain'&&S.avg?'averaged over all orientations':S.pol==='unpol'?'unpolarized light along z':`light along z, E ∥ ${S.pol}`}; chain of ${S.ns} along ${S.axis}. Dashed: the same number of independent spheres. Click to set λ₀.${jobNote(j)}`,
        `${C?'Cross sections of the whole chain':'Efficiency per sphere'}${S.lesson==='chain'&&S.avg?', for chains in random orientation':''}. Dashed: the same spheres far apart (no coupling). Click to set the wavelength.${jobNote(j)}`);
      table={title:`Spectrum of the chain (${word})`,cols:['λ0 (nm)','Qext','Qsca','Qabs','Qext one sphere'],rows:rows.map(r=>[r.x,r.Qext,r.Qsca,r.Qabs,r.single])};
    }else if(g==='gap'&&S.units==='spec'){
      const j=gapJob(),rows=jobRows(j),X=r=>r.x*S.rad,wls=Array.from({length:161},(_,i)=>S.wlMin+(S.wlMax-S.wlMin)*i/160),p1=peakOf(wls,wls.map(wl=>{const p=physAt(wl),m=[p.n,p.k];return (cs()?M.coreShell(p.q*p.x,p.x,[p.nc,p.kc],m):M.coefficients(p.x,m)).Qext;}));
      const series=[{name:'E ∥ x',color:s1,points:rows.map(r=>[X(r),r.px]),label:'E ∥ x'},{name:'E ∥ y',color:s2,points:rows.map(r=>[X(r),r.py]),label:'E ∥ y'}],ys=rows.flatMap(r=>[r.px,r.py]).concat(p1);
      spec={type:'xy',x:{min:X({x:.05}),max:X({x:4}),log:true,name:'gap',fmt:v=>`${Fmt.num(v,3)} nm`,label:'gap between neighbours (nm)',grid:true},y:{min:Math.min(...ys)-10,max:Math.max(...ys)+15,ticks:(()=>{const lo=Math.min(...ys)-10,hi=Math.max(...ys)+15,st=[5,10,20,25,50,100].find(v=>(hi-lo)/v<=6)||100,t=[];for(let v=Math.ceil(lo/st)*st;v<=hi;v+=st)t.push(v);return t;})(),name:'λ',fmt:v=>`${Math.round(v)} nm`,label:'extinction peak, λ₀ (nm)'},series,
        hlines:[{y:p1,color:ink2,dash:[5,4]}],vlines:[{x:S.gapNm,color:probe,label:'current gap'}],legend:[...series.map(s=>({name:s.name,color:s.color})),{name:lv('one sphere','single sphere'),color:ink2,dash:[5,4]}]};
      cap=lv(`Wavelength of the extinction maximum versus the gap (${S.ns} spheres along ${S.axis}). Dashed: one sphere. With E along the axis the coupled mode shifts to the red, roughly exponentially as the gap closes (the "plasmon ruler"); across the axis it shifts slightly to the blue. Click to set the gap.${jobNote(j)}`,
        `Colour of the strongest extinction versus the distance between the spheres. Dashed: a single sphere. With E along the chain the band moves to longer wavelengths as the spheres approach: a ruler for nanometre distances. Click to set the gap.${jobNote(j)}`);
      table={title:'Resonance position versus gap',cols:['gap (nm)','peak E∥x (nm)','peak E∥y (nm)','peak one sphere (nm)'],rows:rows.map(r=>[X(r),r.px,r.py,p1])};
    }else if(g==='gap'){
      const j=gapJob(),rows=jobRows(j),nm=phys(),X=r=>nm?r.x*S.rad:r.x,one=coef().Qext;
      const series=[{name:'E ∥ x',color:s1,points:rows.map(r=>[X(r),r.qx]),label:'E ∥ x'},{name:'E ∥ y',color:s2,points:rows.map(r=>[X(r),r.qy]),label:'E ∥ y'}];
      const ys=rows.flatMap(r=>[r.qx,r.qy]).concat(one),cur=nm?S.gapNm:S.gap;
      spec={type:'xy',x:{min:X({x:.05}),max:X({x:4}),log:true,name:nm?'gap':'g/a',fmt:v=>nm?`${Fmt.num(v,3)} nm`:Fmt.num(v,3),label:nm?`gap between neighbours (nm) at λ₀ = ${S.wl} nm`:'gap / radius, g/a',grid:true},y:{min:0,max:Math.max(...ys)*1.12,label:'Q_ext per sphere'},series,
        hlines:[{y:one,color:ink2,dash:[5,4]}],vlines:[{x:cur,color:probe,label:'current gap'}],legend:[...series.map(s=>({name:s.name,color:s.color})),{name:lv('one sphere','single sphere'),color:ink2,dash:[5,4]}]};
      cap=lv(`Extinction per sphere of the ${S.ns}-sphere chain along ${S.axis} versus the gap, for light along z polarized along x and along y. Dashed: one sphere. Coupling fades when the gap exceeds about one diameter. At a fixed wavelength the extinction can peak at an intermediate gap: there the coupled resonance, which moves as the gap changes, passes through λ₀ (use Spectral to follow the resonance itself). Click to set the gap.${jobNote(j)}`,
        `How the extinction per sphere changes with the distance between the spheres, for the two polarizations. Dashed: a single sphere. The closer the spheres, the stronger they influence each other; at a fixed wavelength the curve can peak where the moving resonance passes that wavelength. Click to set the gap.${jobNote(j)}`);
      table={title:'Gap dependence',cols:[nm?'gap (nm)':'g/a','Qext E∥x','Qext E∥y','Qext one sphere'],rows:rows.map(r=>[X(r),r.qx,r.qy,one])};
    }else if(g==='length'){
      const j=lengthJob(),rows=jobRows(j),one=coef().Qext;
      const series=[{name:'E ∥ x',color:s1,points:rows.map(r=>[r.x,r.qx]),label:'E ∥ x'},{name:'E ∥ y',color:s2,points:rows.map(r=>[r.x,r.qy]),label:'E ∥ y'}];
      spec={type:'xy',x:{min:1,max:8,name:'N',label:`number of spheres along ${S.axis}`,ticks:[1,2,3,4,5,6,7,8]},y:{min:0,max:Math.max(one,...rows.flatMap(r=>[r.qx,r.qy]))*1.12,label:'Q_ext per sphere'},series,hlines:[{y:one,color:ink2,dash:[5,4]}],vlines:[{x:S.ns,color:probe,label:`N = ${S.ns}`}],legend:series.map(s=>({name:s.name,color:s.color}))};
      cap=lv(`Extinction per sphere versus chain length at fixed gap${phys()?` and λ₀ = ${S.wl} nm`:''}. Dashed: one sphere. The coupling effect builds up over the first few neighbours and then saturates. Click to set N.${jobNote(j)}`,
        `Extinction per sphere for chains of 1 to 8 spheres. Dashed: a single sphere. The effect of the neighbours grows over the first few spheres and then levels off. Click to set the number.${jobNote(j)}`);
      table={title:'Chain length',cols:['N','Qext E∥x','Qext E∥y'],rows:rows.map(r=>[r.x,r.qx,r.qy])};
    }
    return {spec,cap};
  }
  // Orders-of-scattering animation (lesson 07).
  let msTimer=null;
  function startMsBuild(){stopMsBuild();S.msAll=false;S.msK=0;refresh(true);$('msBuild').textContent='■ Stop';msTimer=setInterval(()=>{if(S.msK>=12){stopMsBuild();return;}S.msK++;refresh(true);},650);}
  function stopMsBuild(){if(msTimer){clearInterval(msTimer);msTimer=null;}if($('msBuild'))$('msBuild').textContent='▷ Build up';}

  /* ---------- graphs ---------- */
  let table={title:'',cols:[],rows:[]};
  const curveCache=new Map();
  const particleQ=(x,m=[S.n,S.k])=>cs()?M.coreShell(S.q*x,x,[S.nc,S.kc],m):M.coefficients(x,m);
  const cached=(key,make)=>{if(!curveCache.has(key)){if(curveCache.size>24)curveCache.clear();curveCache.set(key,make());}return curveCache.get(key);};
  // Q versus size parameter at fixed m (homogeneous or core-shell with fixed core fraction).
  const curve=kind=>cached(`${kind}|${S.n}|${S.k}|${S.struct}|${S.q}|${S.nc}|${S.kc}`,()=>{
    const [lo,hi,K,log]=kind==='rayleigh'?[0.01,10,320,true]:kind==='large'?[0.5,200,1600,false]:[0.05,200,700,true],d=[];
    for(let i=0;i<=K;i++){const x=log?lo*(hi/lo)**(i/K):lo+(hi-lo)*i/K,c=particleQ(x);d.push({x,Qext:c.Qext,Qsca:c.Qsca,Qabs:Math.max(0,c.Qext-c.Qsca),g:c.g});}return d;});
  // Q versus physical size at the current wavelength. Homogeneous: the radius varies.
  // Core-shell: the core radius varies at fixed shell thickness. R is the varied radius, Rout the outer one.
  const radiusCurve=()=>cached(`rad|${S.wl}|${S.n}|${S.k}|${S.struct}|${S.shell}|${S.nc}|${S.kc}|${S.med}|${S.cmed}|${radRange()}`,()=>{
    const [lo,hi]=primaryRange(),k=TAU*mediumN(S.wl)/S.wl,K=320,d=[],l0=Math.max(lo,.5);
    for(let i=0;i<=K;i++){const R=l0*(hi/l0)**(i/K),Rout=cs()?R+S.shell:R,x=k*Rout,q=R/Rout,c=cs()?M.coreShell(q*x,x,[S.nc,S.kc],[S.n,S.k]):M.coefficients(x,[S.n,S.k]),r=cs()?M.rayleighCoated(x,q,[S.nc,S.kc],[S.n,S.k]):M.rayleigh(x,[S.n,S.k]);
      d.push({R,Rout,x,Qext:c.Qext,Qsca:c.Qsca,Qabs:Math.max(0,c.Qext-c.Qsca),RQsca:r.Qsca,RQabs:Math.max(0,r.Qabs)});}return d;});
  function renderGraph(){
    if(populationGraph())return;
    const g=S.graph;$('plotWrap').hidden=g==='detector';$('detector').hidden=g!=='detector';
    const scaleKey=g==='qx'?(S.lesson==='rayleigh'&&!phys()?null:'qx'):['angular','polar','spectrum'].includes(g)?g:null;
    $('logYWrap').hidden=!scaleKey;if(scaleKey){$('logY').checked=S.scale[scaleKey];$('logYWrap').querySelector('span').textContent=g==='polar'?'dB scale':'log scale';}
    $('mpWrap').hidden=g!=='spectrum'||clusterLesson();$('mpoles').checked=S.mpoles;$('polarWrap').hidden=g!=='angular'||clusterLesson();$('angPolar').checked=S.angPolar;
    if(scaleKey==='angular'&&S.angPolar)$('logYWrap').querySelector('span').textContent='dB scale';
    $('dataBtn').hidden=g==='detector';
    const historical=g==='spectrum'&&plot&&MuseumSpectra.graph(S);if(historical){$('mpWrap').hidden=true;plot.set(historical.spec);$('graphCaption').textContent=historical.caption;table=historical.table;return;}
    if(g==='detector'){$('graphCaption').innerHTML=!detOn?lv('The detector is off.','The detector is off.'):lv('Complex amplitudes of all terms, added head to tail, for the selected field component at the detector (gold marker in 3D). Click the 3D view or drag the sliders to move it.','Each arrow is one term’s contribution to the field at the detector (gold marker in 3D): its length is the strength, its angle the phase. Added head to tail they give the total. Click the 3D view or drag the sliders to move the detector.');renderDetector();return;}
    const s1=color('s1'),s2=color('s2'),s3=color('s3'),ink2=color('ink-2'),probe=color('probe'),c=coef();
    let spec,cap='';
    if(designOn())({spec,cap}=designGraph(g,{s1,s2,s3,ink2,probe}));
    else if(clusterLesson())({spec,cap}=clusterGraph(g,{s1,s2,s3,ink2,probe}));
    else if(g==='angular'){
      const fwd=S.lesson==='large'&&S.fwd&&!S.angPolar,tmax=fwd?30:180,K=fwd?clamp(Math.ceil(S.x*40),600,6000):clamp(Math.ceil(S.x*24),721,4801),o=opts(),part=isPartial(),log=S.scale.angular;
      // Absolute mode: dσ/dΩ = |S|²/k² in nm²/sr or µm²/sr.
      const P1=[],P2=[],U=[],F1=[],F2=[],FR=[],abs=useC(),[unit,uf]=abs?areaUnit(M.abs2(M.amplitudes(c,1,{N:c.N}).s1)/kNm()**2):['',1],sc=abs?uf/kNm()**2:1;let max=0,min=Infinity;
      for(let i=0;i<=K;i++){const t=tmax*i/K,mu=Math.cos(t*DEG),a=M.amplitudes(c,mu,o),i1=sc*M.abs2(a.s1),i2=sc*M.abs2(a.s2);P1.push([t,i1]);P2.push([t,i2]);U.push([t,(i1+i2)/2]);max=Math.max(max,i1,i2);min=Math.min(min,i1||Infinity,i2||Infinity);
        if(part){const b=M.amplitudes(c,mu,{N:c.N});F1.push([t,sc*M.abs2(b.s1)]);F2.push([t,sc*M.abs2(b.s2)]);max=Math.max(max,sc*M.abs2(b.s1),sc*M.abs2(b.s2));}
        if(S.lesson==='large'&&t<=40)FR.push([t,sc*M.fraunhofer(S.x,t*DEG)]);}
      const series=[{name:'I∥ = |S₂|²',color:s1,points:P2,label:'I∥'},{name:'I⊥ = |S₁|²',color:s2,points:P1,label:'I⊥'}];
      if(S.pol==='unpol')series.push({name:'unpolarized mean',color:s3,points:U,width:1.6,label:'mean'});
      if(part)series.push({name:'I∥ all orders',color:s1,points:F2,dash:[5,4],width:1.2},{name:'I⊥ all orders',color:s2,points:F1,dash:[5,4],width:1.2});
      if(FR.length)series.push({name:'Fraunhofer (disc)',color:ink2,points:FR,dash:[2,3],width:1.5});
      const vlines=detOn?[{x:S.theta,color:probe,label:'detector'}]:[],rb=M.rainbowAngle(S.n);if(S.lesson==='large'&&rb)vlines.push({x:rb/DEG,color:ink2,dash:[4,3],label:'rainbow (geometric)',row:1});
      const legend=series.filter(s=>!s.name.includes('all orders')).map(s=>({name:s.name,color:s.color,dash:s.dash}));if(part)legend.push({name:'all orders',color:ink2,dash:[5,4]});
      const ymax=max*2,ymin=Math.max(min*.5,max*1e-8);
      spec={type:'xy',x:{min:0,max:tmax,name:'θ',fmt:v=>`${Fmt.num(v,4)}°`,ticks:fwd?[0,5,10,15,20,25,30]:[0,30,60,90,120,150,180],label:'scattering angle θ'},y:{min:log?ymin:0,max:log?ymax:max*1.08,log,label:abs?`dσ/dΩ (${unit}/sr)`:'|S|² = k² dσ/dΩ'},series,vlines,legend};
      cap=`${lv('Intensity scattered into the xz plane for the two incident polarizations: I∥ (E in the plane) and I⊥ (E normal to it).','Light scattered into the horizontal plane through the beam (θ = 0°: straight on), for incident light polarized in this plane (I∥) and perpendicular to it (I⊥).')}${part?lv(' Dashed: all orders (physical solution).',' Dashed: all terms (the real result).'):''}${FR.length?' Dotted: diffraction by a disc of the same radius.':''}${detClick()}`;
      if(S.lesson==='large'&&!S.angPolar)cap+=` <label class="check small inline"><input type="checkbox" id="fwdBox" ${S.fwd?'checked':''}> forward detail 0–30°</label>`;
      // Polar version: the same curves in the scattering plane, normalized to the maximum, linear or in dB.
      if(S.angPolar){
        const at=pts=>th=>{const u=th/DEG/(tmax/K),i=Math.min(K-1,Math.floor(u)),f=u-i;return (pts[i][1]*(1-f)+pts[i+1][1]*f)/max;};
        const pol=series.filter(s=>s.points!==FR).map(s=>({name:s.name,color:s.color,dash:s.dash,fn:at(s.points)})),db=clamp(10*Math.round(Math.log10(max/Math.max(min,max*1e-6))),20,60);
        spec={type:'polar',angularSamples:K,series:pol,radial:log?'log':'lin',db,legend:pol.filter(s=>!s.name.includes('all orders')).map(s=>({name:s.name,color:s.color,dash:s.dash})).concat(part?[{name:'all orders',color:ink2,dash:[5,4]}]:[]),marker:detOn?S.theta*DEG:null};
        cap=`Polar diagram of the intensity scattered into the ${lv('xz plane','horizontal plane')} (forward to the right), normalized to its maximum${log?`, radius in dB over ${db} dB`:', radius ∝ intensity'}. I∥: E in the plane; I⊥: E normal to it.${part?' Dashed: all orders.':''}${detClick()}`;
      }
      table={title:abs?`Differential cross section (${unit}/sr)`:'Angular intensity (|S|²)',cols:['θ (deg)','parallel (∥)','perpendicular (⊥)',...(part?['I∥ all orders','I⊥ all orders']:[]),...(FR.length?['Fraunhofer']:[])],rows:P1.map((p,i)=>[p[0],P2[i][1],p[1],...(part?[F2[i][1],F1[i][1]]:[]),...(FR.length?[FR[i]?.[1]??'']:[])])};
    }else if(g==='polar'){
      const o=opts(true),A=[];let max=0;for(let i=0;i<=180;i++){const a=M.amplitudes(c,Math.cos(i*DEG),o),i1=M.abs2(a.s1),i2=M.abs2(a.s2);A.push([i2,i1,(i1+i2)/2]);max=Math.max(max,i1,i2);}
      const f=k=>th=>{const t=th/DEG,i=Math.min(179,Math.floor(t)),u=t-i;return (A[i][k]*(1-u)+A[i+1][k]*u)/max;};
      const series=[{name:'I∥ (E in plane)',color:s1,fn:f(0)},{name:'I⊥ (E normal)',color:s2,fn:f(1)},{name:'unpolarized',color:s3,fn:f(2),dash:[6,4]}];
      spec={type:'polar',series,radial:S.scale.polar?'log':'lin',db:30,legend:series.map(s=>({name:s.name,color:s.color,dash:s.dash})),marker:detOn?S.theta*DEG:null};
      cap=lv('Polar diagram of the intensity in the scattering plane, normalized to its maximum (forward = right). A dipole gives I∥ ∝ cos²θ, zero at 90°, and an isotropic I⊥.','Polar diagram: the distance from the centre is the scattered intensity in that direction, relative to its maximum (forward = right). For a small particle I∥ ∝ cos²θ is zero at 90°, while I⊥ is the same in all directions.');
      table={title:'Polar diagram (relative)',cols:['θ (deg)','I∥/max','I⊥/max','unpolarized/max'],rows:A.map((r,i)=>[i,r[0]/max,r[1]/max,r[2]/max])};
    }else if(g==='qx'&&phys()){
      // x axis: the size the user sets (radius or diameter; the core for core-shell). C uses the outer radius.
      const d=radiusCurve(),abs=d.some(p=>p.Qabs>1e-3*p.Qext),C=useC(),log=S.scale.qx||C,ray=S.lesson==='rayleigh',G=p=>C?Math.PI*p.Rout*p.Rout:1,[unit,uf]=C?areaUnit(Math.max(...d.map(p=>p.Qext*G(p)))):['',1],v=(p,k)=>p[k]*G(p)*uf,sym=C?'C':'Q';
      const X=p=>sz(p.R),word=sizeWord(cs()),prim=cs()?S.core:S.rad;
      const series=[{name:abs?`${sym}_ext`:`${sym}_ext = ${sym}_sca`,color:s1,points:d.map(p=>[X(p),v(p,'Qext')]),label:abs?`${sym}_ext`:null}];
      if(abs)series.push({name:`${sym}_sca`,color:s2,points:d.map(p=>[X(p),v(p,'Qsca')]),label:`${sym}_sca`},{name:`${sym}_abs`,color:s3,points:d.map(p=>[X(p),v(p,'Qabs')]),label:`${sym}_abs`});
      if(ray)series.push({name:`${sym}_sca Rayleigh`,color:s2,points:d.map(p=>[X(p),v(p,'RQsca')]),dash:[5,4],width:1.5},...(abs?[{name:`${sym}_abs Rayleigh`,color:s3,points:d.map(p=>[X(p),v(p,'RQabs')]),dash:[5,4],width:1.5}]:[]));
      const ys=series.flatMap(s=>s.points.map(q=>q[1])).filter(y=>y>0),ymax=Math.max(...ys);
      spec={type:'xy',x:{min:X(d[0]),max:X(d.at(-1)),log:true,name:dia()?'d':'a',fmt:r=>`${Fmt.num(r,3)} nm`,label:`${word} (nm) at λ₀ = ${S.wl} nm${cs()?`, shell ${Fmt.num(S.shell,3)} nm`:''}`,grid:true},y:log?{min:Math.max(Math.min(...ys),ymax*1e-12),max:ymax*3,log:true,label:C?`cross section C (${unit})`:'efficiency Q'}:{min:0,max:ymax*1.08,label:'efficiency Q'},series,hlines:C?[]:[{y:2,color:color('axis')}],vlines:[{x:sz(prim),color:probe,label:`${word} ${Fmt.num(sz(prim),3)} nm`}],legend:series.map(s=>({name:s.name,color:s.color,dash:s.dash}))};
      cap=`${C?'Cross sections C = Q πa² (a: outer radius)':'Efficiencies'} versus ${word} at fixed λ₀ = ${S.wl} nm (m = ${Fmt.num(S.n,4)}${S.k?` + ${Fmt.num(S.k,3)}i`:''}${cs()?`, shell thickness ${Fmt.num(S.shell,3)} nm kept fixed`:''}).${ray?lv(' Dashed: quasi-static (Rayleigh) limit.',' Dashed: Rayleigh formula.'):''}${C&&!cs()?' Small particles: C ∝ a⁶ (scattering), ∝ a³ (absorption); large ones: C<sub>ext</sub> → 2πa².':''} Click to set the ${word}.`;
      table={title:`${C?'Cross sections':'Efficiencies'} vs ${word} at ${S.wl} nm`,cols:[`${word} (nm)`,'outer radius (nm)','Qext','Qsca','Qabs','Cext (nm²)','Csca (nm²)','Cabs (nm²)'],rows:d.map(p=>[X(p),p.Rout,p.Qext,p.Qsca,p.Qabs,...['Qext','Qsca','Qabs'].map(k=>p[k]*Math.PI*p.Rout*p.Rout)])};
    }else if(g==='qx'){
      const kind=S.lesson==='rayleigh'?'rayleigh':S.lesson==='large'?'large':'mie',d=curve(kind),abs=S.k>0||(cs()&&S.kc>0);
      if(kind==='rayleigh'){
        const R=d.map(p=>rayleighNow(p.x)),ys=d.flatMap((p,i)=>[p.Qsca,R[i].Qsca,abs?p.Qabs:NaN]).filter(v=>v>0);
        const series=[{name:'Q_sca exact',color:s1,points:d.map(p=>[p.x,p.Qsca]),label:'Q_sca'},{name:'Q_sca Rayleigh ∝ x⁴',color:s1,points:d.map((p,i)=>[p.x,R[i].Qsca]),dash:[5,4],width:1.5}];
        if(abs)series.push({name:'Q_abs exact',color:s2,points:d.map(p=>[p.x,p.Qabs]),label:'Q_abs'},{name:'Q_abs Rayleigh ∝ x',color:s2,points:d.map((p,i)=>[p.x,R[i].Qabs]),dash:[5,4],width:1.5});
        const lo=Math.max(1e-12,Math.min(...ys)),hi=Math.max(...ys)*3;
        spec={type:'xy',x:{min:.01,max:10,log:true,name:'x',label:'size parameter x',grid:true},y:{min:lo,max:hi,log:true,label:'efficiency Q'},series,vlines:[{x:S.x,color:probe,label:`x = ${Fmt.num(S.x,3)}`}],legend:series.map(s=>({name:s.name,color:s.color,dash:s.dash}))};
        cap='Exact Mie efficiencies (solid) against the Rayleigh formulas (dashed) on log–log axes. The x⁴ law is a straight line of slope 4.';
        table={title:'Efficiency vs size',cols:['x','Qsca exact','Qsca Rayleigh','Qabs exact','Qabs Rayleigh'],rows:d.map((p,i)=>[p.x,p.Qsca,R[i].Qsca,p.Qabs,R[i].Qabs])};
      }else{
        const log=S.scale.qx,series=[{name:abs?'Q_ext':'Q_ext = Q_sca',color:s1,points:d.map(p=>[p.x,p.Qext]),label:abs?'Q_ext':null}];
        if(abs)series.push({name:'Q_sca',color:s2,points:d.map(p=>[p.x,p.Qsca]),label:'Q_sca'},{name:'Q_abs',color:s3,points:d.map(p=>[p.x,p.Qabs]),label:'Q_abs'});
        const ymax=Math.max(...d.map(p=>p.Qext))*1.08,lin=kind==='large';
        spec={type:'xy',x:lin?{min:0,max:200,name:'x',label:'size parameter x'}:{min:.05,max:200,log:true,name:'x',label:'size parameter x',grid:true},y:log?{min:Math.max(1e-6,Math.min(...d.map(p=>p.Qsca).filter(v=>v>0))),max:ymax*2,log:true,label:'efficiency Q'}:{min:0,max:ymax,label:'efficiency Q'},series,hlines:[{y:2,color:color('axis')}],vlines:[{x:S.x,color:probe,label:`x = ${Fmt.num(S.x,4)}`}],legend:series.map(s=>({name:s.name,color:s.color}))};
        cap=`Efficiencies for m = ${S.n}${S.k?` + ${S.k}i`:''} as a function of size. Q = C/(πa²); the grey line marks Q = 2, the large-sphere limit of Q<sub>ext</sub>.${!abs?' Without absorption Q<sub>ext</sub> = Q<sub>sca</sub>.':''}${lin?' Very narrow resonance ripples are not fully resolved by the sampling.':''}`;
        table={title:'Efficiency vs size',cols:['x','Qext','Qsca','Qabs','g'],rows:d.map(p=>[p.x,p.Qext,p.Qsca,p.Qabs,p.g])};
      }
    }else if(g==='orders'){
      const n=c.N,f=n=>2*(2*n+1)/S.x**2,E=[],Mm=[];for(let i=1;i<=n;i++){E.push(f(i)*M.abs2(c.a[i]));Mm.push(f(i)*M.abs2(c.b[i]));}
      const o=opts(),active=(i,k)=>i<=o.N&&(k?o.magnetic!==false:o.electric!==false)&&(!o.solo||o.solo===i);
      spec={type:'bars',count:n,groups:[{name:'electric aₙ',color:s1,values:E},{name:'magnetic bₙ',color:s2,values:Mm}],active,selected:S.solo||0,x:{label:'multipole order n'},y:{label:'share of Q_sca'},legend:[{name:'electric aₙ',color:s1,bar:true},{name:'magnetic bₙ',color:s2,bar:true}],
        tip:i=>`<b>n = ${i}${i<5?` (${pole(i)})`:''}</b><div><i style="background:${s1}"></i>a<sub>${i}</sub> = ${Fmt.cx(c.a[i],3)}<span>${Fmt.num(E[i-1],3)}</span></div><div><i style="background:${s2}"></i>b<sub>${i}</sub> = ${Fmt.cx(c.b[i],3)}<span>${Fmt.num(Mm[i-1],3)}</span></div>`};
      cap=`Each bar is one ${lv('order','term')}'s share of Q<sub>sca</sub> = ${Fmt.num(c.Qsca,4)} (the bars add up to it).${seriesOn()?` Faded bars are not in the displayed sum. Click a bar to show that ${lv('order','term')} alone; click it again to restore all.`:''}`;
      table={title:'Multipole coefficients',cols:['n','Re a_n','Im a_n','Re b_n','Im b_n','Qsca share (a_n)','Qsca share (b_n)'],rows:E.map((v,i)=>[i+1,c.a[i+1][0],c.a[i+1][1],c.b[i+1][0],c.b[i+1][1],v,Mm[i]])};
    }else if(g==='converge'){
      const Next=Math.min(420,Math.ceil(1.5*S.x+4*Math.cbrt(S.x)+25)),cx=cached(`cv|${S.x}|${S.n}|${S.k}|${S.struct}|${S.q}|${S.nc}|${S.kc}|${Next}`,()=>cs()?M.coreShell(S.q*S.x,S.x,[S.nc,S.kc],[S.n,S.k],Next):M.coefficients(S.x,[S.n,S.k],Next));
      const A=[],B=[];for(let i=1;i<=Next;i++){A.push([i,Math.max(1e-30,Math.hypot(...cx.a[i]))]);B.push([i,Math.max(1e-30,Math.hypot(...cx.b[i]))]);}
      const vlines=[{x:S.x,color:ink2,label:'n = x'},{x:c.N,color:ink2,dash:[4,3],label:'Wiscombe N',row:1}];if(!S.auto)vlines.push({x:Neff(),color:probe,label:'your truncation',row:2});
      spec={type:'xy',x:{min:1,max:Next,name:'n',label:'multipole order n'},y:{min:1e-16,max:3,log:true,label:'|aₙ|, |bₙ|'},series:[{name:'|aₙ| electric',color:s1,points:A},{name:'|bₙ| magnetic',color:s2,points:B}],vlines,legend:[{name:'|aₙ| electric',color:s1},{name:'|bₙ| magnetic',color:s2}]};
      cap=lv('Coefficient magnitudes stay of order one up to n ≈ x (rays that hit the sphere) and then collapse (rays that miss it). The practical cutoff N lies just beyond the drop.','The size of each term stays large up to n ≈ x (rays that hit the particle) and then drops steeply (rays that miss it). The number of terms N used by the app lies just beyond the drop.');
      table={title:'Coefficient magnitudes',cols:['n','|a_n|','|b_n|'],rows:A.map((p,i)=>[p[0],p[1],B[i][1]])};
    }else if(g==='spectrum'){
      const s=spectrumData(),rows=s.rows,C=useC(),G=Math.PI*S.rad**2,[unit,uf]=C?areaUnit(Math.max(...rows.map(r=>r.Qext))*G):['',1],f=C?G*uf:1,sym=C?'C':'Q',log=S.scale.spectrum;
      const pts=k=>rows.map(r=>[r.wl,r.ok?r[k]*f:NaN]),absP=rows.some(r=>r.ok&&r.Qabs>1e-3*r.Qext),ray=S.lesson==='rayleigh';let series;
      if(S.mpoles)series=[{name:'electric dipole (a₁)',color:s1,points:pts('ED'),label:'a₁'},{name:'magnetic dipole (b₁)',color:s2,points:pts('MD'),label:'b₁'},{name:'electric quadrupole (a₂)',color:s3,points:pts('EQ'),dash:[6,3],label:'a₂'},{name:'magnetic quadrupole (b₂)',color:color('s4'),points:pts('MQ'),dash:[6,3],label:'b₂'},{name:`${sym}_sca, all orders`,color:ink2,points:pts('Qsca'),dash:[2,3],width:1.4}];
      else{series=[{name:absP?`${sym}_ext`:`${sym}_ext = ${sym}_sca`,color:s1,points:pts('Qext'),label:absP?`${sym}_ext`:null}];
        if(absP)series.push({name:`${sym}_sca`,color:s2,points:pts('Qsca'),label:`${sym}_sca`},{name:`${sym}_abs`,color:s3,points:pts('Qabs'),label:`${sym}_abs`});
        if(ray)series.push({name:`${sym}_sca Rayleigh`,color:absP?s2:s1,points:pts('RQsca'),dash:[5,4],width:1.4},...(absP?[{name:`${sym}_abs Rayleigh`,color:s3,points:pts('RQabs'),dash:[5,4],width:1.4}]:[]));}
      const ys=series.flatMap(q=>q.points.map(p=>p[1])).filter(v=>v>0&&Number.isFinite(v)),ymax=ys.length?Math.max(...ys):1,bands=[];let b0=null;
      rows.forEach((r,i)=>{if(!r.ok&&b0==null)b0=r.wl;if((r.ok||i===rows.length-1)&&b0!=null){bands.push({x0:b0,x1:r.wl,label:'no data'});b0=null;}});
      // Rayleigh lesson: log-log axes, so the λ⁻⁴ law is a straight line of slope −4.
      spec={type:'xy',x:{min:S.wlMin,max:S.wlMax,name:'λ₀',fmt:v=>`${Math.round(v)} nm`,label:`vacuum wavelength λ₀ (nm)${ray?', log scale':''}`,log:ray,ticks:ray?[300,400,500,700,1000,1500,2000].filter(v=>v>=S.wlMin&&v<=S.wlMax):S.wlMin===300&&S.wlMax===2000?[300,500,750,1000,1250,1500,1750,2000]:undefined},y:log?{min:Math.max(Math.min(...ys),ymax*1e-6),max:ymax*2,log:true,label:C?`cross section C (${unit})`:'efficiency Q'}:{min:0,max:ymax*1.08,label:C?`cross section C (${unit})`:'efficiency Q'},
        series,bands,vlines:[{x:S.wl,color:color('ink'),label:`λ₀ = ${S.wl} nm`}],legend:series.map(q=>({name:q.name,color:q.color,dash:q.dash})),strip:{x0:380,x1:750,color:wlColor}};
      cap=`${S.mpoles?'Contributions of the four lowest multipoles to scattering':C?'Absolute cross sections C = Q πa²':'Efficiencies'} from ${S.wlMin} to ${S.wlMax} nm for the particle in ${S.med==='custom'?'the custom medium':Materials.MEDIA[S.med].name.toLowerCase()}${s.peak?`; extinction peaks at ${s.peak.wl} nm`:''}.${ray&&!S.mpoles?lv(' Dashed: quasi-static (Rayleigh) limit.',' Dashed: Rayleigh formula.'):''}${bands.length?' Grey: outside the data range of a material.':''} Click to set λ₀; the colour strip marks the visible range.`;
      table={title:`Spectrum${C?' (cross sections in nm²)':''}`,cols:['λ0 (nm)','x','Qext','Qsca','Qabs','Q a1','Q b1','Q a2','Q b2',...(C?['Cext (nm²)','Csca (nm²)','Cabs (nm²)']:[]),'data in range'],
        rows:rows.map(r=>[r.wl,r.x,r.Qext,r.Qsca,r.Qabs,r.ED,r.MD,r.EQ,r.MQ,...(C?[r.Qext*G,r.Qsca*G,r.Qabs*G]:[]),r.ok?'yes':'no'])};
    }else if(g==='axis'){
      const R=S.R,ev=M.fieldEvaluator(null,{kind:'incident',N:S.pN,electric:S.pE,magnetic:S.pM}),pts=[];for(let i=0;i<=480;i++){const z=-R+2*R*i/480,e=ev([0,0,z]);pts.push([z,e[0],e[1]]);}
      axisData=pts;spec=axisSpec();cap=`${lv('Re E<sub>x</sub> on the beam axis (x = y = 0) at the current time. The truncated sum (blue)','The electric field along the beam axis at the current moment. The sum of N terms (blue)')} follows the exact plane wave (dashed) only for |kz| ≲ N = ${S.pN}; the shaded region lies outside.`;
      table={title:'Field on the beam axis',cols:['kz','Re Ex','Im Ex','exact Re','exact Im'],rows:pts.map(p=>[p[0],p[1],p[2],Math.cos(p[0]),Math.sin(p[0])])};
    }else if(g==='modes'){
      const P=planeShares(),n=P.nShow,E=P.E.slice(0,n),Mm=P.M.slice(0,n),active=(i,k)=>i<=S.pN&&(k?S.pM:S.pE);
      let inc=0;for(let i=1;i<=n;i++){if(active(i,0))inc+=E[i-1];if(active(i,1))inc+=Mm[i-1];}
      const cE=n=>(2*n+1)/(n*(n+1));
      spec={type:'bars',count:n,groups:[{name:'electric N waves',color:s1,values:E},{name:'magnetic M waves',color:s2,values:Mm}],active,selected:0,x:{label:lv('multipole order n (click a bar: sum up to this order)','order n of the term (click a bar to add terms up to it)')},y:{label:`share of |E|² within kr ≤ ${Fmt.num(S.R,3)} (%)`},
        legend:[{name:lv('electric N waves','electric terms (N)'),color:s1,bar:true},{name:lv('magnetic M waves','magnetic terms (M)'),color:s2,bar:true}],
        tip:i=>`<b>n = ${i}${i<5?` (${pole(i)})`:''}</b><div>|E<sub>${i}</sub>| = (2n+1)/[n(n+1)] = ${Fmt.num(cE(i),3)}</div><div><i style="background:${s1}"></i>electric N<sub>e1${i}</sub><span>${Fmt.num(E[i-1],3)} %</span></div><div><i style="background:${s2}"></i>magnetic M<sub>o1${i}</sub><span>${Fmt.num(Mm[i-1],3)} %</span></div><div>${lv('orders 1–'+i,'terms 1–'+i)}<span>${Fmt.num(P.cum[i-1],4)} %</span></div>`};
      cap=lv(`Share of the plane wave's field energy (|E|², averaged over the view sphere kr ≤ ${Fmt.num(S.R,3)}) carried by each order, electric (N) and magnetic (M) separately; all bars add up to 100 %. Each order enters with a fixed coefficient E<sub>n</sub> = i<sup>n</sup>(2n+1)/[n(n+1)], whatever the view; but order n is only present beyond kr ≈ n (j<sub>n</sub>(kr) ∝ (kr)<sup>n</sup> near the centre), so the view radius decides which orders are needed: orders 1–${P.need} carry 99 % of the energy in the ball (the metric <i>Needed</i> is stricter: < 1 % error right at the edge kr = R). Electric and magnetic waves contribute almost equally. Faded bars are not in the current sum (${Fmt.num(inc,3)} % of the energy).`,
        `How much of the light wave inside the region shown (kr ≤ ${Fmt.num(S.R,3)}) each term provides, electric and magnetic separately; the bars add up to 100 %. Each term enters with a fixed weight, but term n only reaches out to kr ≈ n, so a larger region needs more terms: terms 1–${P.need} give 99 % of the wave in the region (getting the very edge right takes a few more, see <i>Needed</i>). Faded bars are not in the current sum (${Fmt.num(inc,3)} %).`);
      table={title:`Field energy per order within kr <= ${S.R}`,cols:['n','|E_n|','electric N share (%)','magnetic M share (%)','cumulative (%)'],rows:E.map((v,i)=>[i+1,cE(i+1),v,Mm[i],P.cum[i]])};
    }else if(g==='error'){
      const e=errorCurve();spec={type:'xy',x:{min:0,max:S.R,name:'kr',label:'distance from the expansion centre, kr'},y:{min:1e-7,max:5,log:true,label:'RMS error |E − E_exact|/E₀'},series:[{name:'error of the truncated sum',color:s1,points:e.map(p=>[p[0],Math.max(1e-9,p[1])])}],hlines:[{y:.01,color:color('axis'),dash:[3,3]}],vlines:[{x:S.pN,color:probe,label:`kr = N = ${S.pN}`}]};
      cap=lv('Root-mean-square error of the truncated vector field over all directions at each distance. The dotted line marks 1 %. Inside kr ≈ N the error is exponentially small.','Average error of the sum of N terms at each distance from the centre. The dotted line marks 1 %. Inside kr ≈ N the error is extremely small; outside it grows quickly.');
      table={title:'Error vs distance',cols:['kr','RMS error'],rows:e};
    }else if(g==='hprofile'){
      if(S.view==='wave'){
        const R=S.R,orders=[S.hA.n,...(S.hBOn&&S.hB.n!==S.hA.n?[S.hB.n]:[])],series=orders.map((n,k)=>{const pts=[];for(let i=0;i<=400;i++){const r=R*i/400;pts.push([r,M.radial(r,n).j[n]]);}return {name:`j${sub(n)}(kr)`,color:k?s2:s1,points:pts,label:`j${sub(n)}`};});
        spec={type:'xy',x:{min:0,max:R,name:'kr',label:'kr'},y:{min:-.45,max:.45,label:'spherical Bessel function'},series,hlines:[{y:0,color:color('axis')}],vlines:orders.map((n,k)=>({x:n,color:probe,label:`kr = ${n}`,row:k})),legend:series.map(s=>({name:s.name,color:s.color}))};
        cap=lv('Radial dependence of the regular waves. j<sub>n</sub> rises like (kr)<sup>n</sup> and only reaches its first maximum just beyond kr ≈ n.','How strongly the pattern of order n is present at distance kr from the centre (spherical Bessel function j<sub>n</sub>). It stays close to zero up to about kr ≈ n.');
        table={title:'Spherical Bessel functions',cols:['kr',...series.map(s=>s.name)],rows:series[0].points.map((p,i)=>[p[0],...series.map(s=>s.points[i][1])])};
      }else{
        const {cn,cm}=hCoef(),f=M.angularEvaluator(cn,cm,10),A=[],B=[];let max=0;for(let i=0;i<=360;i++){const t=i/2,a=M.norm2(f(t*DEG,0)),b=M.norm2(f(t*DEG,Math.PI/2));A.push([t,a]);B.push([t,b]);max=Math.max(max,a,b);}
        spec={type:'xy',x:{min:0,max:180,name:'θ',fmt:v=>`${Fmt.num(v,4)}°`,ticks:[0,30,60,90,120,150,180],label:'polar angle θ'},y:{min:0,max:max*1.08,label:'|F|²'},series:[{name:'xz plane (φ = 0°)',color:s1,points:A},{name:'yz plane (φ = 90°)',color:s2,points:B}],vlines:detOn?[{x:S.theta,color:probe,label:'detector'}]:[],legend:[{name:'xz plane (φ = 0°)',color:s1},{name:'yz plane (φ = 90°)',color:s2}]};
        cap=lv('|F|² along two great circles through the poles.','Strength of the pattern versus direction θ, in two planes through the beam axis.')+detClick();
        table={title:'Angular profile',cols:['θ (deg)','|F|² xz','|F|² yz'],rows:A.map((p,i)=>[p[0],p[1],B[i][1]])};
      }
    }
    spec.zoomKey=S.lesson+'|'+S.graph;plot.set(spec);$('graphCaption').innerHTML=cap;$('fwdBox')?.addEventListener('change',e=>{S.fwd=e.target.checked;renderGraph();writeHash();});
  }
  let axisData=[];
  function axisSpec(){
    const ct=Math.cos(phase),st=Math.sin(phase),R=S.R,N=S.pN;
    return {type:'xy',x:{min:-R,max:R,name:'kz',label:'position along the beam, kz'},y:{min:-2,max:2,label:'Re Eₓ / E₀'},series:[{name:'exact plane wave',color:color('ink-2'),points:axisData.map(p=>[p[0],Math.cos(p[0]-phase)]),dash:[5,4],width:1.5},{name:`sum to N = ${N}`,color:color('s1'),points:axisData.map(p=>[p[0],p[1]*ct+p[2]*st])}],
      bands:[{x0:-R,x1:-N},{x0:N,x1:R}],vlines:[{x:-N,color:color('probe')},{x:N,color:color('probe'),label:`kr = N`}],legend:[{name:`sum to N = ${N}`,color:color('s1')},{name:'exact plane wave',color:color('ink-2'),dash:[5,4]}]};
  }

  /* ---------- refresh ---------- */
  let pendingRefresh=0;
  function refresh(now=false){if(now){pendingRefresh&&cancelAnimationFrame(pendingRefresh);pendingRefresh=0;doRefresh();return;}if(!pendingRefresh)pendingRefresh=requestAnimationFrame(()=>{pendingRefresh=0;doRefresh();});}
  function doRefresh(){queueMicrotask(()=>{window.MieLightbox?.sync();window.MieIlluminationUI?.sync();window.MieRangeControls?.sync();});if(S.lesson==='museum'){populationSync();syncControls();MuseumExplorer.show(S);writeHash();return;}derive();coef();if(S.solo>C.N)S.solo=0;if(!nearAllowed()&&S.view==='near'&&mieLesson())S.view='far';syncControls();syncSurface();populationSync();if(designOn())designSync();renderScene();renderSwatch();metrics();renderGraph();renderDetector();writeHash();}
  function refreshDetector(){syncControls();renderDetector();if(['angular','hprofile','polar'].includes(S.graph))renderGraph();writeHash();}

  /* ---------- wavelength sweep (spectral mode) ---------- */
  let sweepTimer=null;
  function startSweep(){stopSweep();const step=Math.max(2,Math.round((S.wlMax-S.wlMin)/170));if(S.wl>=S.wlMax-step)S.wl=S.wlMin;sweepTimer=setInterval(()=>{if(S.wl>=S.wlMax){stopSweep();return;}S.wl=Math.min(S.wlMax,S.wl+step);refresh(true);},110);syncControls();}
  function stopSweep(){if(sweepTimer){clearInterval(sweepTimer);sweepTimer=null;}if($('sweepBtn'))$('sweepBtn').textContent='▷ Sweep λ';}

  /* ---------- build-up animation ---------- */
  function startBuild(){
    if(S.lesson==='tmat'){startMsBuild();return;}
    stopBuild();const plane=S.lesson==='plane',target=plane?Math.max(enoughN(),S.pN):coef().N;
    if(plane)S.pN=1;else{S.auto=false;S.N=1;S.solo=0;}
    refresh(true);$('pBuild').textContent=$('sBuild').textContent='■ Stop';
    buildTimer=setInterval(()=>{const v=plane?S.pN:S.N;if(v>=target){stopBuild();return;}plane?S.pN++:S.N++;refresh(true);},plane?550:Math.max(140,650-8*target));
  }
  function stopBuild(){stopMsBuild();if(buildTimer){clearInterval(buildTimer);buildTimer=null;}$('pBuild').textContent=$('sBuild').textContent='▷ Build up';}

  /* ---------- URL hash (shareable setups) ---------- */
  const HASH=['museumAgMaterial','surfaceOn','surfaceA','museumBookX','farDb','popOn','popShape','popSize','popShell','popBeads','popQuality','farParticle','museumFigure','museumOpacity','museumLayer','museumPhase','museumX','museumDiameter','museumWavelength','museumCamera','museumCase','museumPath','museumDamping','museumFit','museumTargets','museumPopulation','sE','sM','x','n','k','pol','view','graph','auto','N','solo','radial','quantity','slice','total','pN','R','theta','phi','units','struct','q','nc','kc','wl','rad','shell','mat','matCore','med','report','mpoles','showParticle','wlMin','wlMax','core','sizeBy','angPolar','cmed','cn','ck','ccn','cck','ns','gap','gapNm','axis','origin','msAll','msK','avg','scaleBar','swatch','swPhi','tSet','tL','ta','tb','dFam','dMetric','dMed','dSel'];
  function writeHash(){const p=new URLSearchParams({l:S.lesson});for(const k of HASH)if(k in S)p.set(k,typeof S[k]==='boolean'?(S[k]?1:0):S[k]);p.set('lvl',level);p.set('det',detOn?1:0);p.set('illum',MieColour.illuminant);p.set('wb',MieColour.whiteBalance);if(S.lesson==='harmonics')p.set('h',`${S.hA.t}${S.hA.n}${S.hBOn?`,${S.hB.t}${S.hB.n},${S.hB.amp},${S.hB.phase}`:''}`);try{history.replaceState(null,'','#'+p.toString());}catch{}}
  function readHash(){
    const p=new URLSearchParams(location.hash.slice(1)),l=p.get('l');if(['phys','eng'].includes(p.get('lvl')))level=p.get('lvl');if(p.has('det'))detOn=p.get('det')==='1';if(!l||!LESSONS[l])return false;if(p.has('illum')||p.has('wb'))setIllumination(MieIlluminants.has(p.get('illum'))?p.get('illum'):MieColour.illuminant,['source','fixed'].includes(p.get('wb'))?p.get('wb'):MieColour.whiteBalance,{refreshView:false,remember:false});S=fresh(l);
    for(const k of HASH){if(!p.has(k))continue;const v=p.get(k),cur=BASE[k]??S[k];S[k]=typeof cur==='boolean'?v==='1':typeof cur==='number'?Number(v):v;}
    const h=p.get('h');if(h){const [a,b,amp,ph]=h.split(',');S.hA={t:a[0],n:+a.slice(1)};if(b){S.hBOn=true;S.hB={t:b[0],n:+b.slice(1),amp:+amp,phase:+ph};}}
    S.farDb=[40,60,80].includes(S.farDb)?S.farDb:40;S.x=clamp(S.x||1,xRange()[0],xRange()[1]);S.n=clamp(S.n||1.5,.02,6);S.k=clamp(S.k||0,0,25);S.q=clamp(S.q||.7,.02,.98);
    const known=(id,db)=>id==='custom'||id in db;if(!known(S.mat,Materials.DB))S.mat='au';if(!known(S.matCore,Materials.DB))S.matCore='sio2';if(!known(S.med,Materials.MEDIA))S.med='water';
    if(!['dim','wl','spec'].includes(S.units))S.units='dim';if(!['x','y','z'].includes(S.axis))S.axis='x';S.ns=clamp(Math.round(S.ns)||1,1,LESSONS[l].cluster?.max||8);if(!['r','d'].includes(S.sizeBy))S.sizeBy='r';if(!['homog','cs'].includes(S.struct))S.struct='homog';
    if(l==='museum')MuseumExplorer.validateState(S);
    if(!LESSONS[l].graphs.some(([g])=>g===S.graph))S.graph=LESSONS[l].graphs[0][0];if(!LESSONS[l].views.some(([v])=>v===S.view))S.view=LESSONS[l].views[0][0];
    return true;
  }

  /* ---------- export ---------- */
  function download(name,text,type){const u=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1500);}
  function downloadURL(name,url){const a=document.createElement('a');a.href=url;a.download=name;a.click();}
  const csvRows=t=>[t.cols.join(','),...t.rows.map(r=>r.map(v=>typeof v==='number'?+v.toPrecision(10):v).join(','))];
  function exportCSV(){
    const c=coef(),meta=[`# Colour with Mie (Mie Explorer v2) export; lesson=${S.lesson}; illuminant=${MieColour.illuminant}; white_balance=${MieColour.whiteBalance}; observer=CIE_2006_10deg`];
    if(mieLesson()){meta.push(`# x=${S.x}; m=${S.n}+${S.k}i; polarization=${S.pol}; N_used=${Neff()} of ${c.N}; electric=${S.sE}; magnetic=${S.sM}; solo=${S.solo}`,`# Qext=${c.Qext}; Qsca=${c.Qsca}; Qabs=${c.Qext-c.Qsca}; g=${c.g}`);}
    if(S.lesson==='plane')meta.push(`# N=${S.pN}; kR=${S.R}; electric=${S.pE}; magnetic=${S.pM}`);
    let body=[`# ${table.title}`,...csvRows(table)];
    if(mieLesson()&&S.graph!=='orders'){body.push('',`# Mie coefficients`,'n,Re a_n,Im a_n,Re b_n,Im b_n');for(let n=1;n<=c.N;n++)body.push([n,...c.a[n],...c.b[n]].join(','));}
    download(`mie-${S.lesson}-${S.graph}.csv`,[...meta,...body].join('\n'),'text/csv');toast('Data exported as CSV.');
  }
  function showTable(){
    const rows=table.rows,step=Math.max(1,Math.ceil(rows.length/240)),shown=rows.filter((_,i)=>i%step===0||i===rows.length-1),f=v=>typeof v==='number'?Fmt.num(v,5):v;
    $('dataTitle').textContent=table.title+(step>1?` (every ${step}th of ${rows.length} rows)`:'');
    $('dataTable').innerHTML=`<thead><tr>${table.cols.map(c=>`<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${shown.map(r=>`<tr>${r.map(v=>`<td>${f(v)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    $('dataDialog').showModal();
  }
  let toastT=0;function toast(t){const el=$('toast');el.textContent=t;el.hidden=false;clearTimeout(toastT);toastT=setTimeout(()=>el.hidden=true,2600);}

  /* ---------- events ---------- */
  function segHandler(id,fn){$(id).addEventListener('click',e=>{const b=e.target.closest('button[data-v]');if(b&&!b.disabled)fn(b.dataset.v);});}
  function bind(){
    renderNav();
    segHandler('level',v=>{if(v===level)return;level=v;try{localStorage.setItem('mie-level',v);}catch{}applyLevel();buildStatic();refresh(true);});
    $('lessonNav').addEventListener('click',e=>{const b=e.target.closest('[data-lesson]');if(b)setLesson(b.dataset.lesson);});
    document.querySelector('.brand').onclick=e=>{e.preventDefault();setLesson('harmonics');};
    // harmonics
    segHandler('hAType',v=>{S.hA.t=v;refresh();});segHandler('hBType',v=>{S.hB.t=v;refresh();});
    $('hAn').oninput=e=>{S.hA.n=+e.target.value;refresh();};$('hBn').oninput=e=>{S.hB.n=+e.target.value;refresh();};
    $('hBOn').onchange=e=>{S.hBOn=e.target.checked;refresh();};$('hBamp').oninput=e=>{S.hB.amp=+e.target.value;refresh();};$('hBphase').oninput=e=>{S.hB.phase=+e.target.value;refresh();};
    document.querySelectorAll('[data-hpreset]').forEach(b=>b.onclick=()=>{S.hA={n:1,t:'N'};S.hBOn=true;S.hB={n:1,t:'M',amp:1,phase:b.dataset.hpreset==='kerker'?0:180};S.view='pattern';refresh();});
    // plane
    $('pN').oninput=e=>{stopBuild();S.pN=+e.target.value;refresh();};$('pR').oninput=e=>{S.R=+e.target.value;S.r=Math.min(S.r,S.R);refresh();};
    $('pE').onchange=e=>{S.pE=e.target.checked;refresh();};$('pM').onchange=e=>{S.pM=e.target.checked;refresh();};
    $('pBuild').onclick=()=>buildTimer?stopBuild():startBuild();$('pEnough').onclick=()=>{stopBuild();S.pN=enoughN();S.pE=S.pM=true;refresh();};
    // particle
    const setX=v=>{const [a,b]=xRange();v=clamp(+v||a,a,b);const wasAll=S.auto||S.N>=C.N;S.x=v;coef();if(!wasAll)S.N=Math.min(S.N,C.N);refresh();};
    $('xSlider').oninput=e=>setX(+(10**+e.target.value).toPrecision(4));$('xNum').onchange=e=>setX(e.target.value);
    $('xNum').oninput=e=>{const v=+e.target.value,[a,b]=xRange();if(e.target.value&&v>=a&&v<=b)setX(v);};
    $('xPresets').addEventListener('click',e=>{const b=e.target.closest('[data-x]');if(b)setX(b.dataset.x);});
    // Number inputs update while typing (when valid) and are clamped when committed.
    const numInput=(id,key,lo,hi,dflt)=>{const el=$(id);el.oninput=()=>{const v=+el.value;if(el.value!==''&&Number.isFinite(v)&&v>=lo&&v<=hi){S[key]=v;refresh();}};el.onchange=()=>{S[key]=clamp(Number.isFinite(+el.value)&&el.value!==''?+el.value:dflt,lo,hi);el.value=S[key];refresh();};};
    numInput('nNum','n',.02,6,1.5);numInput('kNum','k',0,25,0);numInput('ncNum','nc',.02,6,1.45);numInput('kcNum','kc',0,25,0);
    numInput('cnNum','cn',.02,6,1.5);numInput('ckNum','ck',0,25,0);numInput('ccnNum','ccn',.02,6,1.45);numInput('cckNum','cck',0,25,0);numInput('cmedNum','cmed',1,2,1.33);
    $('material').innerHTML+=MATERIALS.map(([name,n,k],i)=>`<option value="${i}">${name} · ${n}${k?` + ${k}i`:''}</option>`).join('');
    $('material').onchange=e=>{if(e.target.value==='')return;const [,n,k]=MATERIALS[+e.target.value];S.n=n;S.k=k;refresh();};
    // physical units: wavelength, medium, materials, radius, shell
    segHandler('units',v=>{stopSweep();const was=phys();S.units=v;if(v==='spec')S.graph='spectrum';else if(S.graph==='spectrum'&&v==='dim')S.graph=lesson().graphs[0][0];if(!was&&phys()){const [lo,hi]=radRange();S.rad=clamp(S.rad,lo,hi);}refresh(true);});
    // Homogeneous -> core-shell keeps the outer size (80 % core, 20 % shell); back again keeps the outer radius.
    segHandler('struct',v=>{if(v===S.struct)return;if(v==='cs'){S.core=+(S.rad*.8).toPrecision(3);S.shell=+(S.rad*.2).toPrecision(3);}else S.rad=S.core+S.shell;S.struct=v;refresh(true);});
    segHandler('report',v=>{S.report=v;refresh();});segHandler('sizeBy',v=>{S.sizeBy=v;refresh();});
    $('qSlider').oninput=e=>{S.q=+e.target.value;refresh();};
    const setWl=v=>{S.wl=clamp(Math.round(+v||550),S.wlMin,S.wlMax);refresh();};
    $('wlSlider').oninput=e=>{stopSweep();setWl(e.target.value);};$('wlNum').onchange=e=>setWl(e.target.value);$('wlNum').oninput=e=>{const v=+e.target.value;if(v>=S.wlMin&&v<=S.wlMax)setWl(v);};
    $('sweepBtn').onclick=()=>sweepTimer?stopSweep():startSweep();
    // Spectral range: presets or min/max (at least 20 nm wide, inside 300-2000 nm).
    $('wlPresets').innerHTML=WLPRESETS.map(([l,lo,hi])=>`<button data-lo="${lo}" data-hi="${hi}" title="${lo}–${hi} nm">${l}</button>`).join('');
    $('wlPresets').addEventListener('click',e=>{const b=e.target.closest('[data-lo]');if(!b)return;stopSweep();S.wlMin=+b.dataset.lo;S.wlMax=+b.dataset.hi;refresh();});
    $('wlMinNum').onchange=e=>{const [lo]=materialDomain();S.wlMin=clamp(+e.target.value||lo,lo,S.wlMax-20);refresh();};$('wlMaxNum').onchange=e=>{const [,hi]=materialDomain();S.wlMax=clamp(+e.target.value||hi,S.wlMin+20,hi);refresh();};
    const groups=[...new Set(Object.values(Materials.DB).map(m=>m.group))];
    const matOptions=groups.map(g=>`<optgroup label="${g}">${Object.entries(Materials.DB).filter(([,m])=>m.group===g).map(([id,m])=>`<option value="${id}">${m.name}</option>`).join('')}</optgroup>`).join('')+'<option value="custom">Custom constant n + ik</option>';
    $('matSel').innerHTML=matOptions;$('coreSel').innerHTML=matOptions;
    $('medSel').innerHTML=Object.entries(Materials.MEDIA).map(([id,m])=>`<option value="${id}">${m.name}</option>`).join('')+'<option value="custom">Custom constant n</option>';
    $('matSel').onchange=e=>{S.mat=e.target.value;refresh();};$('coreSel').onchange=e=>{S.matCore=e.target.value;refresh();};$('medSel').onchange=e=>{S.med=e.target.value;refresh();};
    // The size control sets the radius, or the core radius of a core-shell particle (inputs in radius or diameter).
    const setRad=r=>{const [lo,hi]=primaryRange();if(cs())S.core=clamp(+r||S.core,lo,hi);else S.rad=clamp(+r||S.rad,lo,hi);refresh();};
    $('radSlider').oninput=e=>setRad(+(10**+e.target.value).toPrecision(4));$('radNum').onchange=e=>setRad(+e.target.value/(dia()?2:1));
    $('radPresets').addEventListener('click',e=>{const b=e.target.closest('[data-rad]');if(b)setRad(b.dataset.rad);});
    $('shellSlider').oninput=e=>{S.shell=+(+e.target.value).toPrecision(4);refresh();};$('shellNum').onchange=e=>{S.shell=clamp(+e.target.value||0,0,radRange()[1]-S.core);refresh();};
    $('materialRefs').innerHTML=`<h3>Data sources for materials</h3><ul class="refs">${Object.values(Materials.DB).map(m=>`<li><b>${m.name}</b>: ${m.src}${m.doi?` — <a href="https://doi.org/${m.doi}" target="_blank" rel="noreferrer">doi:${m.doi}</a>`:''}${m.range?` (${m.range.map(v=>Math.round(v*1000)).join('–')} nm)`:''}</li>`).join('')}${Object.values(Materials.MEDIA).filter(m=>m.fn).map(m=>`<li><b>${m.name} (medium)</b>: ${m.src}${m.doi?` — <a href="https://doi.org/${m.doi}" target="_blank" rel="noreferrer">doi:${m.doi}</a>`:''}</li>`).join('')}</ul><p>Each material identifies its source and wavelength limits. Most numerical tables are CC0 snapshots from refractiveindex.info. Default gold is the equal-weight Olmon/McPeak complex-permittivity mean, with each endpoint interpolated in wavelength before averaging. The separate endpoints and Babar–Weaver gold remain selectable. Fontijn magnetite is figure-digitized diagonal permittivity, interpolated in photon energy. Other n,k tables retain their stated interpolation.</p>`;
    // chain of spheres
    $('nsSlider').oninput=e=>{S.ns=+e.target.value;S.region=null;refresh();};
    $('gapSlider').oninput=e=>{const g=.05*(6/.05)**+e.target.value;if(phys())S.gapNm=+(g*S.rad).toPrecision(3);else S.gap=+g.toPrecision(3);S.region=null;refresh();};
    $('gapNum').onchange=e=>{const v=+e.target.value;if(!(v>0))return;if(phys())S.gapNm=clamp(v,.05*S.rad,6*S.rad);else S.gap=clamp(v,.05,6);S.region=null;refresh();};
    segHandler('axisSeg',v=>{S.axis=v;refresh(true);});
    $('originSlider').oninput=e=>{S.origin=+e.target.value;S.region=null;refresh();};$('avgBox').onchange=e=>{S.avg=e.target.checked;refresh();};
    $('msAll').onchange=e=>{stopMsBuild();S.msAll=e.target.checked;refresh();};$('msK').oninput=e=>{stopMsBuild();S.msAll=false;S.msK=+e.target.value;refresh();};
    $('msBuild').onclick=()=>msTimer?stopMsBuild():startMsBuild();
    // series
    $('auto').onchange=e=>{stopBuild();S.auto=e.target.checked;if(!S.auto)S.N=C.N;refresh();};$('nSlider').oninput=e=>{stopBuild();S.auto=false;S.N=+e.target.value;refresh();};
    $('sBuild').onclick=()=>buildTimer?stopBuild():startBuild();
    $('sE').onchange=e=>{S.sE=e.target.checked;refresh();};$('sM').onchange=e=>{S.sM=e.target.checked;refresh();};$('solo').onchange=e=>{S.solo=+e.target.value;refresh();};
    // light & display
    segHandler('pol',v=>{S.pol=v;refresh();});
    segHandler('radial',v=>{S.radial=v;refresh();});
    $('farDb').onchange=e=>{S.farDb=+e.target.value;refresh();};$('focusDirection').onclick=()=>scene?.focusDirection(S.theta*DEG,S.phi*DEG,Math.max(6,scene.camera.zoom));
    segHandler('viewSeg',v=>{S.view=v;refresh(true);scene?.home(homeKind());});
    $('quantity').onchange=e=>{S.quantity=e.target.value;refresh();};$('slice').onchange=e=>{S.slice=e.target.value;refresh(true);scene?.home(homeKind());};
    $('total').onchange=e=>{S.total=e.target.checked;refresh();};$('vectors').onchange=e=>{S.vectors=e.target.checked;refresh();};$('showParticle').onchange=e=>{S.showParticle=e.target.checked;refresh();};$('farParticle').onchange=e=>{S.farParticle=e.target.checked;refresh();};$('scaleBox').onchange=e=>{S.scaleBar=e.target.checked;refresh();};$('swatchBox').onchange=e=>{S.swatch=e.target.checked;refresh();};designInit();$('swPhi').oninput=e=>{S.swPhi=+(10**+e.target.value).toPrecision(3);refresh();};
    $('region').oninput=e=>{const [a,b]=regionRange();S.region=a*(b/a)**+e.target.value;S.r=clamp(S.r,0,S.region);refresh();};
    $('mpoles').onchange=e=>{S.mpoles=e.target.checked;renderGraph();writeHash();};$('angPolar').onchange=e=>{S.angPolar=e.target.checked;renderGraph();writeHash();};
    // tasks
    $('taskList').addEventListener('click',e=>{const b=e.target.closest('[data-task]');if(b)applyTask(lesson().tasks[+b.dataset.task]);});
    // view
    $('playBtn').onclick=()=>{play=!play;syncControls();};
    $('speedSel').onchange=e=>{speed=+e.target.value;try{localStorage.setItem('mie-speed',speed);}catch{}if(!play){play=true;syncControls();}};$('homeBtn').onclick=()=>scene?.home(homeKind());
    // graph
    $('graphTabs').addEventListener('click',e=>{const b=e.target.closest('[data-g]');if(b){S.graph=b.dataset.g;syncControls();renderGraph();writeHash();}});
    $('graphTabs').addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight'].includes(e.key))return;const bs=[...$('graphTabs').querySelectorAll('button')],i=bs.findIndex(b=>b.dataset.g===S.graph),n=bs[(i+(e.key==='ArrowRight'?1:-1)+bs.length)%bs.length];n.click();n.focus();});
    $('logY').onchange=e=>{const k=S.graph==='qx'?'qx':S.graph;S.scale[k]=e.target.checked;renderGraph();};
    $('dataBtn').onclick=showTable;$('dataCsv').onclick=()=>download(`mie-${S.lesson}-${S.graph}-table.csv`,csvRows(table).join('\n'),'text/csv');
    plot=new Plot($('plot'),{onClick:hit=>{
      if(designOn()){designClick(hit);return;}
      if(!detOn&&(hit.theta!=null||['angular','hprofile','polar'].includes(S.graph)))return;
      if(hit.x!=null&&['angular','hprofile'].includes(S.graph)&&!(S.graph==='hprofile'&&S.view==='wave')){S.theta=clamp(hit.x,0,180);S.phi=0;refreshDetector();}
      else if(hit.theta!=null&&(S.graph==='polar'||S.graph==='angular')){S.theta=hit.theta/DEG;S.phi=0;refreshDetector();}
      else if(hit.n!=null&&S.graph==='modes'&&S.lesson==='plane'){stopBuild();S.pN=clamp(hit.n,1,40);refresh();}
      else if(hit.n!=null&&S.graph==='orders'&&seriesOn()){S.solo=S.solo===hit.n?0:hit.n;refresh();}
      else if(hit.x!=null&&S.graph==='spectrum'){stopSweep();S.wl=clamp(Math.round(hit.x),S.wlMin,S.wlMax);refresh();}
      else if(hit.x!=null&&S.graph==='gap'){const g=clamp(phys()?hit.x/S.rad:hit.x,.05,6);if(phys())S.gapNm=+(g*S.rad).toPrecision(3);else S.gap=+g.toPrecision(3);refresh();}
      else if(hit.x!=null&&S.graph==='length'){S.ns=clamp(Math.round(hit.x),1,lesson().cluster?.max||8);refresh();}
      else if(hit.x!=null&&S.graph==='qx'&&phys()){const [lo,hi]=primaryRange(),r=+clamp(hit.x/(dia()?2:1),lo,hi).toPrecision(3);if(cs())S.core=r;else S.rad=r;refresh();}}});
    // detector
    $('dTheta').oninput=e=>{S.theta=+e.target.value;refreshDetector();};$('dPhi').oninput=e=>{S.phi=+e.target.value;refreshDetector();};$('dR').oninput=e=>{S.r=+e.target.value;refreshDetector();};
    $('detOn').onchange=e=>{detOn=e.target.checked;try{localStorage.setItem('mie-detector',detOn?'1':'0');}catch{}refresh(true);};
    $('dComp').onchange=e=>{S.dComp=+e.target.value;renderDetector();};$('explainBtn').onclick=openInspector;
    // Display panel over the 3D view: the header folds it. The last choice is remembered, and the panel
    // folds away by itself while the 3D view is too small for it (and opens again when there is room).
    const panel=$('displayPanel'),pBtn=$('displayToggle'),pBody=$('displayBody'),sceneEl=$('scene'),phone=matchMedia('(max-width:900px)');
    let panelPref=null;try{const v=localStorage.getItem('mie-display');if(v)panelPref=v==='open';}catch{}
    // Room: the picture is centred and about as wide as the view is tall, so the panel fits beside it
    // when (W − 0.9 H)/2 leaves its width, or over it when the view is tall.
    const roomy=()=>{if(phone.matches)return true;const W=sceneEl.clientWidth,H=sceneEl.clientHeight;return W>=600&&H>=220&&((W-.9*H)/2>=280||H>=420);};
    const setPanel=open=>{panel.classList.toggle('closed',!open);pBody.hidden=!open;pBtn.setAttribute('aria-expanded',String(open));pBtn.title=open?'Hide the display settings':'Show the display settings';};
    let wasRoomy=roomy();setPanel(wasRoomy&&panelPref!==false);
    pBtn.onclick=()=>{const open=panel.classList.contains('closed');panelPref=open;setPanel(open);try{localStorage.setItem('mie-display',open?'open':'closed');}catch{}};
    new ResizeObserver(()=>{const r=roomy();if(r!==wasRoomy){wasRoomy=r;setPanel(r&&panelPref!==false);}}).observe(sceneEl);
    // Splitter between the 3D view and the graph. The graph height is a share of the stage, kept across visits.
    const stage=$('laboratory'),split=$('splitter'),card=document.querySelector('.graph-card');
    const geom=()=>{const r=stage.getBoundingClientRect(),st=getComputedStyle(stage),pb=parseFloat(st.paddingBottom),H=r.height-parseFloat(st.paddingTop)-pb,g=parseFloat(st.rowGap)||0;
      return {bottom:r.bottom-pb,H,lo:Math.min(.45,180/H),hi:Math.max(.3,(H-$('metrics').offsetHeight-2*g-130)/H)};};
    const setSplit=(f,save=true)=>{if(f==null){stage.style.removeProperty('--graph-h');split.removeAttribute('aria-valuenow');try{localStorage.removeItem('mie-split');}catch{}return;}
      const q=geom();f=clamp(f,q.lo,q.hi);stage.style.setProperty('--graph-h',`${(100*f).toFixed(2)}%`);split.setAttribute('aria-valuenow',String(Math.round(100*f)));if(save)try{localStorage.setItem('mie-split',f.toFixed(4));}catch{}};
    const share=()=>card.offsetHeight/geom().H;
    split.addEventListener('pointerdown',e=>{if(e.button)return;e.preventDefault();split.setPointerCapture(e.pointerId);split.classList.add('drag');document.body.classList.add('resizing');
      const off=e.clientY-card.getBoundingClientRect().top,move=ev=>{const q=geom();setSplit((q.bottom-(ev.clientY-off))/q.H,false);};
      const up=()=>{split.removeEventListener('pointermove',move);split.classList.remove('drag');document.body.classList.remove('resizing');setSplit(share());};
      split.addEventListener('pointermove',move);split.addEventListener('pointerup',up,{once:true});split.addEventListener('pointercancel',up,{once:true});});
    split.addEventListener('dblclick',()=>setSplit(null));
    split.addEventListener('keydown',e=>{const d={ArrowUp:.04,ArrowDown:-.04,PageUp:.12,PageDown:-.12}[e.key];if(d){e.preventDefault();e.stopPropagation();setSplit(share()+d);}else if(e.key==='Enter'){e.preventDefault();setSplit(null);}});
    try{const f=+localStorage.getItem('mie-split');if(f>0&&f<1)setSplit(f,false);}catch{}
    // dialogs & menu
    $('theoryBtn').onclick=()=>$('theory').showModal();
    document.querySelectorAll('dialog').forEach(d=>{d.querySelector('[data-close]')?.addEventListener('click',()=>d.close());d.addEventListener('click',e=>{if(e.target===d)d.close();});});
    $('themeBtn').onclick=()=>{const dark=document.documentElement.dataset.theme?document.documentElement.dataset.theme==='dark':matchMedia('(prefers-color-scheme: dark)').matches,t=dark?'light':'dark';document.documentElement.dataset.theme=t;try{localStorage.setItem('mie-theme',t);}catch{}themeChanged();};
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{if(!document.documentElement.dataset.theme)themeChanged();});
    $('menu').addEventListener('click',async e=>{const b=e.target.closest('[data-act]');if(!b)return;$('menu').open=false;const a=b.dataset.act;
      if(S.lesson==='museum'){if(a==='image3d'||a==='imageGraph'){downloadURL(`museum-${S.museumFigure}.png`,MuseumExplorer.image());return;}if(a==='csv'){download(`museum-${S.museumFigure}.csv`,MuseumExplorer.csv(),'text/csv');return;}if(a==='reset'){MuseumExplorer.fit();setLesson('museum',true);return;}}
      if(a==='image3d'){if(scene)downloadURL(`mie-${S.lesson}-3d.png`,scene.image());else toast('3D rendering is not available.');}
      else if(a==='imageGraph'){if(S.graph==='detector')toast('Choose a graph tab first.');else downloadURL(`mie-${S.lesson}-${S.graph}.png`,plot.image());}
      else if(a==='csv')exportCSV();
      else if(a==='link'){try{await navigator.clipboard.writeText(location.href);toast('Link copied. It opens this exact setup.');}catch{toast('Copy the address bar to share this setup.');}}
      else if(a==='full'){try{document.fullscreenElement?await document.exitFullscreen():await document.documentElement.requestFullscreen();}catch{toast('Full screen is not available here.');}}
      else if(a==='reset')setLesson(S.lesson,true);});
    document.addEventListener('click',e=>{if(!e.target.closest('#menu'))$('menu').open=false;});
    document.addEventListener('keydown',e=>{if(e.target.matches('input,select,textarea'))return;const i=ORDER.indexOf(S.lesson);if(e.key==='PageDown'&&i<ORDER.length-1){e.preventDefault();setLesson(ORDER[i+1]);}if(e.key==='PageUp'&&i>0){e.preventDefault();setLesson(ORDER[i-1]);}});
  }
  function themeChanged(){Colormap.readDiv();scene?.applyTheme();refresh(true);}

  /* ---------- scene picking & animation ---------- */
  function onPick(p){
    if(clusterLesson())return;
    if(!detOn)return;
    const r=Math.hypot(...p);if(!r)return;
    S.theta=Math.acos(clamp(p[2]/r,-1,1))/DEG;S.phi=Math.atan2(p[1],p[0])/DEG;
    if(S.view==='near'||S.view==='wave'){const [a,b]=rRange();if(mieLesson()&&r<1.0)return;S.r=clamp(r,a,b);}
    S.graph='detector';syncControls();renderGraph();writeHash();
  }
  let last=0,frameCount=0;
  function loop(t){
    requestAnimationFrame(loop);const dt=Math.min(.1,(t-last)/1000);last=t;
    if(play&&timeView()&&scene){phase=(phase+dt*1.25*speed)%TAU;scene.setPhase(phase);
      if(S.lesson==='plane'&&S.graph==='axis'&&(frameCount++%2===0)&&axisData.length)plot.set(axisSpec());}
    scene?.frame();
  }

  /* ---------- start ---------- */
  inspector=new SeriesInspector($('inspector'));
  try{scene=new MieScene($('scene'),{onPick});}catch(err){$('glError').hidden=false;console.error(err);}
  bind();
  if(!readHash()){S=fresh('harmonics');}
  if(!S.graph)S.graph=lesson().graphs[0][0];
  applyLevel();buildStatic();refresh(true);scene?.home(homeKind());requestAnimationFrame(loop);
  document.fonts?.ready.then(()=>{scene?.applyTheme();renderGraph();});
  // Capture exactly the displayed design; no calculations or lesson switches on send.
  const lightboxFields=['surfaceOn','surfaceA','struct','mat','matCore','med','cn','ck','ccn','cck','cmed','rad','core','shell','popOn','popShape','popSize','popShell','popBeads','popQuality'];
  function lightboxSnapshot(){
    let p,phi,origin,target=null;
    if(designOn()){
      const d=designShown();if(!d)return null;const f=d.family;
      p={...fresh('real'),med:S.dMed,popOn:false,surfaceOn:S.surfaceOn,surfaceA:S.surfaceA};phi=d.phi;origin='inverse';target=[S.tL,S.ta,S.tb];
      if(f.kind==='sphere')Object.assign(p,{struct:'homog',mat:f.mat,rad:d.p[0]/2});
      else Object.assign(p,{struct:'cs',mat:f.shell,matCore:f.core,core:d.p[0]/2,shell:d.p[1],rad:d.p[0]/2+d.p[1]});
    }else{
      if(!phys()||clusterLesson())return null;p=S;phi=S.swPhi;origin='forward';
    }
    return {particle:Object.fromEntries(lightboxFields.map(k=>[k,p[k]])),phi,origin,target,designIlluminant:MieColour.illuminant,designWhiteBalance:MieColour.whiteBalance};
  }
  function openLightboxSample(sample){
    setLesson('real',true);Object.assign(S,structuredClone(sample.particle),{swPhi:sample.phi,units:'spec',wlMin:380,wlMax:900,wl:550,sizeBy:'d',graph:'spectrum',view:'far',radial:'lin',pol:'unpol',swatch:true,auto:true,sE:true,sM:true,solo:0,mpoles:false});
    refresh(true);scene?.home(homeKind());
  }

  function setIllumination(id,balance=MieColour.whiteBalance,{refreshView=true,remember=true}={}){
    const old=MieColour.illuminant,changed=MieColour.setIllumination(id,balance);if(!changed)return false;
    dMapKey='';dGamutKey='';dMapImg=null;dGamut=null;
    if(old!==id){clearTimeout(dEvalTimer);dEvalKey='';dRes=dFin=dPick=dMCjob=null;}
    else for(const c of dFin||[]){if(c.mcT)c.mcCss=MieColour.colour(c.mcT).css;if(c.mcS)c.mcSide=MieColour.colour(c.mcS).css;}
    if(remember)try{localStorage.setItem('mie-illumination-v1',JSON.stringify({illuminant:id,whiteBalance:balance}));}catch{}
    window.dispatchEvent(new CustomEvent('mie-illuminationchange',{detail:{illuminant:id,whiteBalance:balance}}));
    if(refreshView)refresh(true);return true;
  }

  window.MieExplorer={setIllumination,lightboxSnapshot,openLightboxSample,lightboxNotify:toast,get playing(){return play;},get state(){return S;},get level(){return level;},refresh,setLesson,population:()=>populationJobs,get phase(){return phase;},setPhase(value){phase=value;scene?.setPhase(phase);scene?.frame();},setPlaying(value){play=!!value;syncControls();},scene:()=>scene,graph:()=>plot};
})();

