/* Colormaps and lightweight canvas charts (line, bar, polar, phasor).
   Colors come from CSS custom properties so light/dark themes stay in one place. */
const css=name=>getComputedStyle(document.documentElement).getPropertyValue(name).trim();
const hexRGB=h=>{h=h.replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const v=parseInt(h,16);return [(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];};

const Colormap={
  // Perceptually uniform "magma"-like ramp for intensity (dark = weak, light = strong).
  heatStops:['#140e36','#3b0f70','#641a80','#8c2981','#b73779','#de4968','#f7705c','#fe9f6d','#fecf92','#fcfdbf'].map(hexRGB),
  heat(t){t=Math.max(0,Math.min(1,t));const s=this.heatStops,f=t*(s.length-1),i=Math.min(s.length-2,Math.floor(f)),u=f-i;return [0,1,2].map(k=>s[i][k]+(s[i+1][k]-s[i][k])*u);},
  // Diverging blue / neutral / red for signed field components.
  diverging(v){const n=this.div||this.readDiv();v=Math.max(-1,Math.min(1,v));const end=v<0?n.neg:n.pos,a=Math.abs(v)**.85;return [0,1,2].map(k=>n.mid[k]+(end[k]-n.mid[k])*a);},
  readDiv(){this.div={neg:hexRGB(css('--div-neg')||'#1d4f91'),mid:hexRGB(css('--div-mid')||'#f0efec'),pos:hexRGB(css('--div-pos')||'#b5302f')};return this.div;},
  gradient(kind,top=1){const steps=Array.from({length:11},(_,i)=>i/10),c=kind==='heat'?steps.map(t=>this.heat(t*top)):steps.map(t=>this.diverging(2*t-1));return `linear-gradient(90deg,${c.map((v,i)=>`rgb(${v.map(x=>Math.round(x*255)).join(',')}) ${i*10}%`).join(',')})`;}
};

const Fmt={
  num(v,d=3){if(!Number.isFinite(v))return '—';if(v===0)return '0';const a=Math.abs(v);if(a<1e-3||a>=1e5){const e=Math.floor(Math.log10(a)),m=v/10**e;return `${m.toFixed(Math.max(0,d-1))}×10${Fmt.sup(e)}`;}return Number(v.toPrecision(d)).toLocaleString('en',{maximumSignificantDigits:d});},
  sup(e){return String(e).split('').map(c=>({'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'})[c]).join('');},
  cx(z,d=4){const lim=Math.hypot(z[0],z[1])*1e-12,r=Math.abs(z[0])<lim?0:z[0],i=Math.abs(z[1])<lim?0:z[1];return `${Fmt.num(r,d)} ${i<0?'−':'+'} ${Fmt.num(Math.abs(i),d)}i`;}
};

function niceStep(span,count){const raw=span/count,p=10**Math.floor(Math.log10(raw)),f=raw/p;return (f<1.5?1:f<3?2:f<7?5:10)*p;}
function linTicks(min,max,count=5){const s=niceStep(max-min,count),out=[];for(let v=Math.ceil(min/s-1e-9)*s;v<=max+s*1e-9;v+=s)out.push(Math.abs(v)<s*1e-9?0:v);return out;}
function logTicks(min,max){const a=Math.floor(Math.log10(min)),b=Math.ceil(Math.log10(max)),span=b-a,step=span>12?3:span>7?2:1,out=[];for(let e=a;e<=b;e+=step){const v=10**e;if(v>=min*(1-1e-9)&&v<=max*(1+1e-9))out.push(v);}return out;}

class Plot{
  constructor(canvas,{onClick,onHover}={}){
    this.cv=canvas;this.onClick=onClick;this.hover=null;this.tip=document.createElement('div');this.tip.className='plot-tip';this.tip.hidden=true;canvas.parentElement.append(this.tip);
    this.polarView={zoom:1,x:0,y:0};this.pointers=new Map();this.suppressClick=false;
    this.navigation=document.createElement('div');this.navigation.className='plot-navigation';this.navigation.hidden=true;this.navigation.setAttribute('role','toolbar');this.navigation.setAttribute('aria-label','Polar diagram zoom');
    this.navigation.innerHTML='<span class="plot-gesture-hint">Wheel / pinch to zoom · drag to pan</span><button type="button" data-zoom="out" aria-label="Zoom out polar diagram">−</button><output aria-label="Polar magnification">1×</output><button type="button" data-zoom="in" aria-label="Zoom in polar diagram">+</button><button type="button" data-zoom="reset" title="Reset polar zoom and position (Home)">Reset</button>';
    canvas.parentElement.append(this.navigation);
    this.navigation.addEventListener('click',e=>{const a=e.target.closest('[data-zoom]')?.dataset.zoom;if(a==='reset')this.resetPolar();else if(a)this.zoomPolar(a==='in'?1.5:1/1.5);});
    canvas.tabIndex=0;
    const point=e=>{const r=canvas.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];};
    const gesture=()=>{const a=[...this.pointers.values()];return a.length>1?{x:(a[0][0]+a[1][0])/2,y:(a[0][1]+a[1][1])/2,d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1])}:null;};
    canvas.addEventListener('pointerdown',e=>{if(this.spec?.type!=='polar'||e.button>0)return;e.preventDefault();this.pointers.set(e.pointerId,point(e));this.dragDistance=0;this.suppressClick=false;this.gesture=gesture();canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
    canvas.addEventListener('pointermove',e=>{
      const p=point(e),old=this.pointers.get(e.pointerId);this.hover=p;
      if(old){this.pointers.set(e.pointerId,p);const g=gesture();if(g&&this.gesture){this.zoomPolar(g.d/Math.max(1,this.gesture.d),[this.gesture.x,this.gesture.y],false);this.panPolar(g.x-this.gesture.x,g.y-this.gesture.y,false);this.suppressClick=true;}else if(!g){const dx=p[0]-old[0],dy=p[1]-old[1];this.dragDistance+=Math.hypot(dx,dy);if(this.dragDistance>4){this.panPolar(dx,dy,false);this.suppressClick=true;}}this.gesture=g;this.hover=null;}
      this.draw();
    });
    const release=e=>{this.pointers.delete(e.pointerId);this.gesture=gesture();};
    canvas.addEventListener('pointerup',release);canvas.addEventListener('pointercancel',release);canvas.addEventListener('lostpointercapture',release);
    canvas.addEventListener('pointerleave',()=>{this.hover=null;this.tip.hidden=true;this.draw();});
    canvas.addEventListener('click',e=>{if(this.suppressClick||!this.map||!this.onClick)return;const hit=this.map(...point(e));if(hit)this.onClick(hit);});
    canvas.addEventListener('wheel',e=>{if(this.spec?.type!=='polar')return;e.preventDefault();const dy=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);this.zoomPolar(Math.exp(-Math.max(-400,Math.min(400,dy))*.002),point(e));},{passive:false});
    canvas.addEventListener('dblclick',e=>{if(this.spec?.type==='polar'){e.preventDefault();this.resetPolar();}});
    canvas.addEventListener('keydown',e=>{if(this.spec?.type!=='polar')return;const d={ArrowLeft:[28,0],ArrowRight:[-28,0],ArrowUp:[0,28],ArrowDown:[0,-28]}[e.key];if(d){e.preventDefault();e.stopPropagation();this.panPolar(...d);}else if(['+','=','-','Home','0'].includes(e.key)){e.preventDefault();e.stopPropagation();if(e.key==='Home'||e.key==='0')this.resetPolar();else this.zoomPolar(e.key==='-'?1/1.3:1.3);}});
    new ResizeObserver(()=>this.draw()).observe(canvas);
  }
  set(spec){if(spec.type!==this.spec?.type||spec.zoomKey!==this.spec?.zoomKey)this.polarView={zoom:1,x:0,y:0};this.spec=spec;const polar=spec.type==='polar';this.navigation.hidden=!polar;this.cv.style.touchAction=polar?'none':'';this.cv.setAttribute('aria-label',polar?'Polar diagram. Wheel or pinch to zoom, drag to pan; plus, minus and Home also work.':'Graph');this.draw();}
  resetPolar(){this.polarView={zoom:1,x:0,y:0};this.hover=null;this.draw();}
  constrainPolar(){const v=this.polarView,m=1.12*(v.zoom-1);v.x=Math.max(-m,Math.min(m,v.x));v.y=Math.max(-m,Math.min(m,v.y));}
  zoomPolar(factor,anchor=null,redraw=true){
    if(!this.polarFrame||!Number.isFinite(factor)||factor<=0)return;
    const v=this.polarView,{cx,cy,R,box}=this.polarFrame,p=anchor||[(box.l+box.r)/2,(box.t+box.b)/2],z=Math.max(1,Math.min(64,v.zoom*factor)),q=z/v.zoom;
    v.x=(p[0]-cx)/R-q*((p[0]-cx)/R-v.x);v.y=(p[1]-cy)/R-q*((p[1]-cy)/R-v.y);v.zoom=z;this.constrainPolar();this.hover=null;if(redraw)this.draw();
  }
  panPolar(dx,dy,redraw=true){if(!this.polarFrame)return;this.polarView.x+=dx/this.polarFrame.R;this.polarView.y+=dy/this.polarFrame.R;this.constrainPolar();if(redraw)this.draw();}
  ctx(){const r=this.cv.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(10,r.width),h=Math.max(10,r.height);if(this.cv.width!==Math.round(w*d)||this.cv.height!==Math.round(h*d)){this.cv.width=Math.round(w*d);this.cv.height=Math.round(h*d);}const c=this.cv.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);return {c,w,h};}
  theme(){return {ink:css('--ink'),ink2:css('--ink-2'),muted:css('--muted'),grid:css('--grid'),axis:css('--axis'),surface:css('--surface'),probe:css('--probe'),font:'12px "Atkinson Hyperlegible", system-ui, sans-serif',mono:'11px "JetBrains Mono", ui-monospace, monospace'};}
  draw(){
    if(!this.spec||!this.cv.isConnected||this.cv.offsetParent===null)return;
    const s=this.spec;this.map=null;
    if(s.type==='xy')this.drawXY(s);else if(s.type==='bars')this.drawBars(s);else if(s.type==='polar')this.drawPolar(s);else if(s.type==='matrix')this.drawMatrix(s);
  }
  legend(c,T,items,x,y){
    c.font=T.font;c.textBaseline='middle';
    for(const it of items){c.strokeStyle=it.color;c.lineWidth=it.bar?8:2;c.setLineDash(it.dash||[]);c.beginPath();c.moveTo(x,y);c.lineTo(x+16,y);c.stroke();c.setLineDash([]);c.fillStyle=T.ink2;c.textAlign='left';c.fillText(it.name,x+21,y);x+=21+c.measureText(it.name).width+16;}
  }
  frame(c,T,w,h,s,{xmin,xmax,ymin,ymax}){
    const L=s.y.label?58:48,box={l:L,t:s.legend?.length?30:12,r:w-14,b:h-(s.x.label?40:24)};
    const tx=v=>s.x.log?Math.log10(v):v,ty=v=>s.y.log?Math.log10(Math.max(v,ymin)):v;
    const X=v=>box.l+(tx(v)-tx(xmin))/(tx(xmax)-tx(xmin))*(box.r-box.l),Y=v=>box.b-(ty(Math.min(Math.max(v,ymin),ymax))-ty(ymin))/(ty(ymax)-ty(ymin))*(box.b-box.t);
    const Xi=px=>{const t=tx(xmin)+(px-box.l)/(box.r-box.l)*(tx(xmax)-tx(xmin));return s.x.log?10**t:t;};
    c.lineWidth=1;c.font=T.mono;c.fillStyle=T.muted;
    const yt=s.y.ticks||(s.y.log?logTicks(ymin,ymax):linTicks(ymin,ymax,Math.max(2,Math.round((box.b-box.t)/45))));
    c.textAlign='right';c.textBaseline='middle';
    for(const v of yt){const y=Math.round(Y(v))+.5;c.strokeStyle=T.grid;c.beginPath();c.moveTo(box.l,y);c.lineTo(box.r,y);c.stroke();c.fillText(s.y.fmt?s.y.fmt(v):s.y.log?`10${Fmt.sup(Math.round(Math.log10(v)))}`:Fmt.num(v,3),box.l-6,y);}
    const xt=s.x.ticks||(s.x.log?logTicks(xmin,xmax):linTicks(xmin,xmax,Math.max(2,Math.round((box.r-box.l)/80))));
    c.textAlign='center';c.textBaseline='top';
    let lastRight=-Infinity;
    for(const v of xt){const x=Math.round(X(v))+.5;if(s.x.grid){c.strokeStyle=T.grid;c.beginPath();c.moveTo(x,box.t);c.lineTo(x,box.b);c.stroke();}
      const t=s.x.fmt?s.x.fmt(v):s.x.log?(Math.abs(Math.log10(v)%1)<1e-9?`10${Fmt.sup(Math.round(Math.log10(v)))}`:Fmt.num(v)):Fmt.num(v,3),tw=c.measureText(t).width/2,cx=Math.min(w-2-tw,Math.max(tw+2,x));
      if(cx-tw<lastRight+8)continue;c.fillText(t,cx,box.b+6);lastRight=cx+tw;}
    c.strokeStyle=T.axis;c.beginPath();c.moveTo(box.l+.5,box.t);c.lineTo(box.l+.5,box.b+.5);c.lineTo(box.r,box.b+.5);c.stroke();
    c.fillStyle=T.ink2;c.font=T.font;
    if(s.x.label){c.textAlign='center';c.textBaseline='bottom';c.fillText(s.x.label,(box.l+box.r)/2,h-4);}
    if(s.y.label){c.save();c.translate(13,(box.t+box.b)/2);c.rotate(-Math.PI/2);c.textAlign='center';c.textBaseline='middle';c.fillText(s.y.label,0,0);c.restore();}
    if(s.legend?.length)this.legend(c,T,s.legend,box.l,14);
    return {box,X,Y,Xi};
  }
  drawXY(s){
    const {c,w,h}=this.ctx(),T=this.theme(),f=this.frame(c,T,w,h,s,{xmin:s.x.min,xmax:s.x.max,ymin:s.y.min,ymax:s.y.max}),{box,X,Y,Xi}=f;
    c.save();c.beginPath();c.rect(box.l,box.t-1,box.r-box.l,box.b-box.t+2);c.clip();
    for(const b of s.bands||[]){c.fillStyle=b.color||T.grid;c.globalAlpha=.55;c.fillRect(X(b.x0),box.t,X(b.x1)-X(b.x0),box.b-box.t);c.globalAlpha=1;
      if(b.label){c.font=T.font;const w=c.measureText(b.label).width;if(X(b.x1)-X(b.x0)>w+8){c.fillStyle=T.muted;c.textAlign='center';c.textBaseline='top';c.fillText(b.label,(X(b.x0)+X(b.x1))/2,box.t+4);}}}
    // Orientation strip (e.g. the visible spectrum) along the bottom of the plot.
    if(s.strip){const st=s.strip,step=2;for(let x=Math.max(st.x0,s.x.min);x<Math.min(st.x1,s.x.max);x+=step){c.fillStyle=st.color(x);c.fillRect(X(x),box.b-5,Math.max(1,X(x+step)-X(x))+.6,5);}}
    for(const hl of s.hlines||[]){c.strokeStyle=hl.color||T.axis;c.lineWidth=1;c.setLineDash(hl.dash||[]);c.beginPath();c.moveTo(box.l,Y(hl.y)+.5);c.lineTo(box.r,Y(hl.y)+.5);c.stroke();c.setLineDash([]);}
    for(const se of s.series){
      // Scatter series: filled dots, optionally one colour per point (se.colors), optional outline.
      if(se.dots){const r=se.radius||2;for(let i=0;i<se.points.length;i++){const [x,y]=se.points[i];if(!Number.isFinite(y))continue;c.fillStyle=se.colors?se.colors[i]:se.color;c.beginPath();c.arc(X(x),Y(y),r,0,2*Math.PI);c.fill();if(se.outline){c.strokeStyle=se.outline;c.lineWidth=se.outlineWidth||1;c.stroke();}}continue;}
      c.strokeStyle=se.color;c.lineWidth=se.width||2;c.setLineDash(se.dash||[]);c.lineJoin='round';c.beginPath();let on=false;
      // On log axes, values below the axis floor leave a gap rather than a misleading flat line.
      for(const [x,y] of se.points){if(!Number.isFinite(y)||(s.y.log&&y<s.y.min*0.999)){on=false;continue;}const px=X(x),py=Y(y);if(on)c.lineTo(px,py);else{c.moveTo(px,py);on=true;}}
      c.stroke();c.setLineDash([]);
    }
    for(const v of s.vlines||[]){if(v.x<s.x.min||v.x>s.x.max)continue;const x=Math.round(X(v.x))+.5;c.strokeStyle=v.color||T.probe;c.lineWidth=v.width||1.5;c.setLineDash(v.dash||[]);c.beginPath();c.moveTo(x,box.t);c.lineTo(x,box.b);c.stroke();c.setLineDash([]);if(v.label){c.font=T.font;c.fillStyle=T.ink2;c.textBaseline='top';const tw=c.measureText(v.label).width,right=x+5+tw<box.r;c.textAlign=right?'left':'right';c.fillText(v.label,right?x+5:x-5,box.t+3+(v.row||0)*15);}}
    c.restore();
    // Curve identities are shown once in the legend.
    this.map=(px,py)=>px>=box.l&&px<=box.r&&py>=box.t-4&&py<=box.b+4?{x:Xi(px)}:null;
    // Crosshair + tooltip.
    if(this.hover&&this.map(...this.hover)){
      const xv=Xi(this.hover[0]),x=X(xv);c.strokeStyle=T.axis;c.lineWidth=1;c.beginPath();c.moveTo(x+.5,box.t);c.lineTo(x+.5,box.b);c.stroke();
      const rows=[];for(const se of s.series){if(se.hover===false||se.dots)continue;const pts=se.points;let k=0,best=Infinity;for(let i=0;i<pts.length;i++){const d=Math.abs(pts[i][0]-xv);if(d<best){best=d;k=i;}}const y=pts[k]?.[1];if(!Number.isFinite(y))continue;c.fillStyle=se.color;c.strokeStyle=T.surface;c.lineWidth=2;c.beginPath();c.arc(X(pts[k][0]),Y(y),4,0,2*Math.PI);c.fill();c.stroke();rows.push([se.color,se.name,y]);}
      this.showTip(`<b>${s.x.name||'x'} = ${s.x.fmt?s.x.fmt(xv):Fmt.num(xv,4)}</b>`+rows.map(([col,n,y])=>`<div><i style="background:${col}"></i>${n}<span>${s.y.fmt?s.y.fmt(y):Fmt.num(y,4)}</span></div>`).join(''),x,box);
    }else this.tip.hidden=true;
  }
  drawBars(s){
    const {c,w,h}=this.ctx(),T=this.theme(),n=s.count,ymax=Math.max(1e-30,...s.groups.flatMap(g=>g.values))*1.08;
    const f=this.frame(c,T,w,h,{...s,x:{...s.x,ticks:[]}},{xmin:.5,xmax:n+.5,ymin:0,ymax}),{box,X,Y}=f,step=(box.r-box.l)/n,gw=Math.min(28,step*.8),bw=Math.max(1,(gw-2*(s.groups.length-1))/s.groups.length);
    c.font=T.mono;c.fillStyle=T.muted;c.textAlign='center';c.textBaseline='top';
    if(s.labels){c.font=T.font;c.fillStyle=T.ink2;for(let i=1;i<=n;i++)c.fillText(s.labels[i-1],X(i),box.b+6);}else{const every=Math.ceil(n/Math.max(1,Math.floor((box.r-box.l)/26)));for(let i=1;i<=n;i++)if(i===1||i%every===0)c.fillText(String(i),X(i),box.b+6);}
    let hoverN=null;if(this.hover&&this.hover[0]>=box.l&&this.hover[0]<=box.r&&this.hover[1]>=box.t&&this.hover[1]<=box.b+20)hoverN=Math.max(1,Math.min(n,Math.round((this.hover[0]-box.l)/step+.5)));
    if(s.selected){c.fillStyle=T.grid;c.fillRect(X(s.selected)-step/2,box.t,step,box.b-box.t);}
    if(hoverN){c.fillStyle=T.grid;c.globalAlpha=.6;c.fillRect(X(hoverN)-step/2,box.t,step,box.b-box.t);c.globalAlpha=1;}
    for(let i=1;i<=n;i++)s.groups.forEach((g,k)=>{const v=g.values[i-1];if(!(v>0))return;const x=X(i)-gw/2+k*(bw+2),y=Y(v),hh=box.b-y;c.globalAlpha=s.active&&!s.active(i,k)?.25:1;c.fillStyle=g.color;c.beginPath();const r=Math.min(3,bw/2,hh);c.moveTo(x,box.b);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.lineTo(x+bw-r,y);c.quadraticCurveTo(x+bw,y,x+bw,y+r);c.lineTo(x+bw,box.b);c.fill();c.globalAlpha=1;});
    this.map=(px,py)=>px>=box.l&&px<=box.r&&py>=box.t&&py<=box.b+20?{n:Math.max(1,Math.min(n,Math.round((px-box.l)/step+.5)))}:null;
    if(hoverN&&s.tip)this.showTip(s.tip(hoverN),X(hoverN),box);else this.tip.hidden=true;
  }
  drawPolar(s){
    const {c,w,h}=this.ctx(),T=this.theme();c.font=T.font;
    // Keep the legend and controls fixed while the diagram beneath them is magnified.
    const narrow=w<620,short=h<220,tiny=h<130,sideLegend=!narrow||short,LT=tiny?{...T,font:'10px system-ui, sans-serif'}:T;
    const items=(s.legend||[]).map(it=>tiny?{...it,name:it.name.includes('I∥')?'I∥':it.name.includes('I⊥')?'I⊥':it.name.includes('unpolarized')?'mean':it.name.slice(0,12)}:short&&w<430?{...it,name:it.name.includes('I∥')?'I∥ (parallel)':it.name.includes('I⊥')?'I⊥ (normal)':it.name}:it);c.font=LT.font;
    const lw=sideLegend&&items.length?Math.max(...items.map(it=>c.measureText(it.name).width))+40:0;
    this.navigation.classList.toggle('polar-short',short);
    this.navigation.classList.toggle('polar-tiny',tiny);
    let top=8;
    if(!sideLegend&&items.length){let x=10,y=12;for(const it of items){const width=c.measureText(it.name).width+48;if(x+width>w-8&&x>10){x=10;y+=19;}this.legend(c,T,[it],x,y);x+=width;}top=y+13;}
    if(tiny)top=2;
    const box={l:lw+4,r:w-5,t:top,b:h-(tiny?2:short?6:37)},cx=(box.l+box.r)/2,cy=(box.t+box.b)/2,R=Math.max(8,Math.min((box.r-box.l)/2-(tiny?14:31),(box.b-box.t)/2-(tiny?6:short?14:20)));
    this.polarFrame={cx,cy,R,box};const view=this.polarView,z=view.zoom,ox=cx+view.x*R,oy=cy+view.y*R,rr=R*z;
    this.navigation.querySelector('output').textContent=`${Fmt.num(z,3)}×`;this.navigation.querySelector('[data-zoom="out"]').disabled=z<=1;this.navigation.querySelector('[data-zoom="in"]').disabled=z>=64;
    c.save();c.beginPath();c.rect(box.l,box.t,box.r-box.l,box.b-box.t);c.clip();
    const db=s.radial==='log',range=s.db||30,rad=v=>db?Math.max(0,1+10*Math.log10(Math.max(v,1e-30))/range):v;
    c.lineWidth=1;c.font=T.mono;c.fillStyle=T.muted;c.textAlign='left';c.textBaseline='bottom';
    const rings=db?[0,1/3,2/3,1]:[.25,.5,.75,1];
    // Ring values sit along the lower-right diagonal, away from the detector marker (upper half).
    const la=-50*Math.PI/180;
    for(const t of rings){c.strokeStyle=T.grid;c.beginPath();c.arc(ox,oy,rr*t,0,2*Math.PI);c.stroke();if(t>0&&!tiny)c.fillText(db?`${Math.round((t-1)*range)} dB`:Fmt.num(t,2),ox+rr*t*Math.cos(la)+3,oy-rr*t*Math.sin(la)+12);}
    c.strokeStyle=T.axis;for(let a=0;a<360;a+=30){const t=a*Math.PI/180;c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+rr*Math.cos(t),oy-rr*Math.sin(t));c.stroke();}
    c.fillStyle=T.ink2;c.font=LT.font;c.textBaseline='middle';
    for(const [a,lab] of [[0,'0°'],[90,'90°'],[180,'180°'],[270,'90°']]){const t=a*Math.PI/180;c.textAlign=a===0?'left':a===180?'right':'center';c.fillText(lab,ox+(rr+8)*Math.cos(t),oy-(rr+(tiny?-8:short?8:12))*Math.sin(t));}
    const steps=Math.min(32768,Math.max(720,2*(s.angularSamples||360),Math.ceil(2*Math.PI*rr/2)));
    for(const se of s.series){c.strokeStyle=se.color;c.lineWidth=se.width||2;c.setLineDash(se.dash||[]);c.beginPath();
      for(let i=0;i<=steps;i++){const ang=2*Math.PI*i/steps,th=Math.min(ang,2*Math.PI-ang),v=rad(se.fn(th)),x=ox+rr*v*Math.cos(ang),y=oy-rr*v*Math.sin(ang);i?c.lineTo(x,y):c.moveTo(x,y);}
      c.closePath();c.stroke();c.setLineDash([]);}
    if(s.marker!=null){const t=s.marker;c.strokeStyle=T.probe;c.lineWidth=1.5;c.beginPath();c.moveTo(ox,oy);c.lineTo(ox+rr*Math.cos(t),oy-rr*Math.sin(t));c.stroke();}
    c.restore();
    if(sideLegend&&items.length)items.forEach((it,i)=>this.legend(c,LT,[it],12,(tiny?7:18)+(tiny?10:short?16:20)*i));
    if(!tiny&&(!short||items.length<=3)){c.font=T.mono;c.fillStyle=T.muted;c.textAlign='left';c.textBaseline='middle';c.fillText('0° forward →',short?12:box.l+7,h-(short?47:18));}
    this.map=(px,py)=>{const dx=px-ox,dy=oy-py;if(px<box.l||px>box.r||py<box.t||py>box.b||Math.hypot(dx,dy)>rr+10)return null;return {theta:Math.abs(Math.atan2(dy,dx))};};
    if(this.hover){const hit=this.map(...this.hover);if(hit){const th=hit.theta;this.showTip(`<b>θ = ${Fmt.num(th*180/Math.PI,3)}°</b>`+s.series.map(se=>`<div><i style="background:${se.color}"></i>${se.name}<span>${Fmt.num(se.fn(th),3)}</span></div>`).join(''),this.hover[0],{t:this.hover[1]-10,b:this.hover[1]+10,l:0,r:w});}else this.tip.hidden=true;}else this.tip.hidden=true;
  }
  // Matrix heat map: s.n x s.n values (row-major, already on the colour scale 0..1 or NaN for empty),
  // block separators s.blocks = [{start, end, label}], hover text s.tip(i, j), colour bar s.scale {lo, hi, title}.
  drawMatrix(s){
    const {c,w,h}=this.ctx(),T=this.theme(),n=s.n,bar=58,top=s.blocks?.length?26:12,side=Math.max(40,Math.min(w-bar-70,h-top-30)),x0=Math.max(46,(w-bar-side)/2),y0=top;
    if(!this._img||this._img.n!==n||this._img.key!==s.key){
      const cv=document.createElement('canvas');cv.width=n;cv.height=n;const g=cv.getContext('2d'),im=g.createImageData(n,n),bg=hexRGB(css('--surface-2')||'#eee');
      for(let i=0;i<n*n;i++){const v=s.values[i],col=Number.isFinite(v)?Colormap.heat(.08+.92*v):bg;im.data.set([col[0]*255,col[1]*255,col[2]*255,255],4*i);}
      g.putImageData(im,0,0);this._img={cv,n,key:s.key};}
    c.imageSmoothingEnabled=false;c.drawImage(this._img.cv,x0,y0,side,side);c.imageSmoothingEnabled=true;
    c.strokeStyle=T.axis;c.lineWidth=1;c.strokeRect(x0+.5,y0+.5,side,side);
    const P=i=>i/n*side;c.font=T.mono;c.fillStyle=T.muted;c.textBaseline='bottom';c.textAlign='center';
    let lastX=-Infinity;for(const b of s.blocks||[]){const a=P(b.start),e=P(b.end);if(b.start>0){c.strokeStyle=T.surface;c.globalAlpha=.85;c.beginPath();c.moveTo(x0+a,y0);c.lineTo(x0+a,y0+side);c.moveTo(x0,y0+a);c.lineTo(x0+side,y0+a);c.stroke();c.globalAlpha=1;}
      const cx=x0+(a+e)/2,tw=c.measureText(b.label).width;if(cx-tw/2>lastX+4&&e-a>6){c.fillText(b.label,cx,y0-4);lastX=cx+tw/2;}}
    c.fillStyle=T.ink2;c.font=T.font;c.textAlign='center';c.textBaseline='top';if(s.xlabel)c.fillText(s.xlabel,x0+side/2,y0+side+6);
    if(s.ylabel){c.save();c.translate(x0-14,y0+side/2);c.rotate(-Math.PI/2);c.textBaseline='middle';c.fillText(s.ylabel,0,0);c.restore();}
    // colour bar
    const bx=x0+side+18,bh=Math.min(side,180);for(let i=0;i<bh;i++){c.fillStyle=`rgb(${Colormap.heat(.08+.92*(1-i/bh)).map(v=>Math.round(v*255)).join(',')})`;c.fillRect(bx,y0+i,12,1);}
    c.font=T.mono;c.fillStyle=T.muted;c.textAlign='left';c.textBaseline='middle';if(s.scale){c.fillText(s.scale.hi,bx+16,y0+4);c.fillText(s.scale.lo,bx+16,y0+bh-4);c.save();c.translate(bx+6,y0+bh+8);c.font=T.font;c.fillStyle=T.ink2;c.textBaseline='top';c.textAlign='left';c.fillText(s.scale.title||'',-6,0);c.restore();}
    const cell=(px,py)=>{const i=Math.floor((py-y0)/side*n),j=Math.floor((px-x0)/side*n);return i>=0&&j>=0&&i<n&&j<n?{i,j}:null;};
    this.map=(px,py)=>{const q=cell(px,py);return q?{cell:q}:null;};
    const q=this.hover&&cell(...this.hover);if(q&&s.tip){c.strokeStyle=T.probe;c.lineWidth=1.5;const cs=Math.max(3,side/n);c.strokeRect(x0+P(q.j)-1,y0+P(q.i)-1,cs+2,cs+2);this.showTip(s.tip(q.i,q.j),this.hover[0],{t:this.hover[1]-10,b:0,l:0,r:w});}else this.tip.hidden=true;
  }
  showTip(html,x,box){
    const t=this.tip;t.innerHTML=html;t.hidden=false;const pw=this.cv.clientWidth,tw=t.offsetWidth;let left=x+12;if(left+tw>pw-4)left=x-12-tw;t.style.left=Math.max(4,left)+'px';t.style.top=(box.t+4)+'px';
  }
  image(){return this.cv.toDataURL('image/png');}
}

// Head-to-tail complex phasor chain.
function drawPhasor(canvas,{terms,start=null,K=terms.length,highlight=0}){
  const r=canvas.getBoundingClientRect(),d=Math.min(devicePixelRatio||1,2),w=Math.max(10,r.width),h=Math.max(10,r.height);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);
  const c=canvas.getContext('2d');c.setTransform(d,0,0,d,0,0);c.clearRect(0,0,w,h);
  const ink=css('--ink'),muted=css('--muted'),grid=css('--grid'),s1=css('--s1'),s2=css('--s2'),probe=css('--probe');
  const pts=[[0,0]];if(start)pts.push(start);for(const t of terms)pts.push([pts.at(-1)[0]+t[0],pts.at(-1)[1]+t[1]]);
  const off=start?1:0,end=pts[Math.min(pts.length-1,K+off)],xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
  const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),span=Math.max(maxX-minX,maxY-minY,1e-30),sc=Math.min(w-40,h-40)/span;
  const X=x=>w/2+(x-(minX+maxX)/2)*sc,Y=y=>h/2-(y-(minY+maxY)/2)*sc;
  c.strokeStyle=grid;c.lineWidth=1;c.beginPath();c.moveTo(0,Math.round(Y(0))+.5);c.lineTo(w,Math.round(Y(0))+.5);c.moveTo(Math.round(X(0))+.5,0);c.lineTo(Math.round(X(0))+.5,h);c.stroke();
  c.fillStyle=muted;c.font='11px "Atkinson Hyperlegible", sans-serif';c.textAlign='right';c.textBaseline='bottom';c.fillText('Re',w-4,Math.round(Y(0))-2);c.textAlign='left';c.textBaseline='top';c.fillText('Im',Math.round(X(0))+4,4);
  const arrow=(a,b,color,width)=>{const x0=X(a[0]),y0=Y(a[1]),x1=X(b[0]),y1=Y(b[1]),len=Math.hypot(x1-x0,y1-y0);c.strokeStyle=color;c.fillStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(x0,y0);c.lineTo(x1,y1);c.stroke();if(len<6)return;const t=Math.atan2(y1-y0,x1-x0),s=Math.min(7,len*.35);c.beginPath();c.moveTo(x1,y1);c.lineTo(x1-s*Math.cos(t-.42),y1-s*Math.sin(t-.42));c.lineTo(x1-s*Math.cos(t+.42),y1-s*Math.sin(t+.42));c.closePath();c.fill();};
  if(start)arrow(pts[0],pts[1],muted,1.6);
  for(let i=off+1;i<pts.length;i++){const n=i-off,on=n<=K;c.globalAlpha=on?1:.22;arrow(pts[i-1],pts[i],n===highlight?probe:s2,n===highlight?2:1.4);}
  c.globalAlpha=1;arrow(pts[0],end,s1,2.6);c.fillStyle=ink;c.beginPath();c.arc(X(0),Y(0),2.5,0,2*Math.PI);c.fill();
}
