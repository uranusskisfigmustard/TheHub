(() => {
'use strict';

const ACTIVE=[];
let raf=0;

function stopCurrent(){
  if(raf) cancelAnimationFrame(raf); raf=0;
  while(ACTIVE.length){try{ACTIVE.pop().remove()}catch(_){}}
}

function makeCanvas(){
  stopCurrent();
  const c=document.createElement('canvas');
  c.setAttribute('aria-hidden','true');
  c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483640;pointer-events:none;user-select:none;mix-blend-mode:screen;';
  const scale=Math.max(1,Math.min(1.5,window.devicePixelRatio||1));
  c.width=Math.max(320,Math.round(innerWidth*scale));
  c.height=Math.max(180,Math.round(innerHeight*scale));
  document.body.appendChild(c);ACTIVE.push(c);
  return {c,ctx:c.getContext('2d',{alpha:true}),scale};
}

function rand(a,b){return a+Math.random()*(b-a)}
function irand(a,b){return Math.floor(rand(a,b+1))}

function fadeEdge(y,top,bottom){
  const edge=Math.max(8,Math.min(28,(bottom-top)*.18));
  if(y<top+edge)return (y-top)/edge;
  if(y>bottom-edge)return (bottom-y)/edge;
  return 1;
}

function drawClusteredNoise(ctx,w,h,bands,intensity=1){
  ctx.clearRect(0,0,w,h);
  ctx.save();
  ctx.globalCompositeOperation='source-over';

  for(const band of bands){
    const top=Math.max(0,Math.floor(band.y));
    const bottom=Math.min(h,Math.ceil(band.y+band.h));
    const step=band.coarse?2:1;
    for(let y=top;y<bottom;y+=step){
      const edge=fadeEdge(y,top,bottom);
      const rowBias=.25+.75*Math.random();
      const density=band.density*rowBias*edge*intensity;
      let x=irand(-20,8);
      while(x<w){
        x+=irand(1,band.spacing);
        if(Math.random()>density)continue;
        const len=irand(1,Math.max(2,band.maxLen));
        const lum=irand(120,235);
        const a=rand(.035,.16)*edge*intensity;
        ctx.fillStyle=`rgba(${lum},${lum},${lum},${a})`;
        ctx.fillRect(x,y,len,step);
        if(Math.random()<.12){
          const darkA=rand(.03,.10)*edge*intensity;
          ctx.fillStyle=`rgba(0,0,0,${darkA})`;
          ctx.fillRect(x+irand(-3,4),y,irand(2,10),step);
        }
      }

      if(Math.random()<.06*intensity){
        const a=rand(.025,.09)*edge;
        ctx.fillStyle=`rgba(220,220,215,${a})`;
        ctx.fillRect(0,y,w,1);
      }
    }

    if(Math.random()<.55){
      const streaks=irand(1,3);
      for(let i=0;i<streaks;i++){
        const yy=irand(top,bottom);
        const x=irand(-30,Math.floor(w*.7));
        const len=irand(Math.floor(w*.08),Math.floor(w*.45));
        ctx.fillStyle=`rgba(225,225,218,${rand(.03,.11)*intensity})`;
        ctx.fillRect(x,yy,len,irand(1,2));
      }
    }
  }
  ctx.restore();
}

function naturalDigitalNoise(){
  const {c,ctx}=makeCanvas(),w=c.width,h=c.height;
  const start=performance.now(),duration=760;
  let nextBandChange=0;
  let bands=[];

  function reseed(){
    const count=irand(1,3);bands=[];
    for(let i=0;i<count;i++){
      const bh=rand(h*.025,h*.12);
      bands.push({
        y:rand(h*.06,h*.9-bh),h:bh,
        density:rand(.22,.5),spacing:irand(2,8),maxLen:irand(3,16),coarse:Math.random()<.35
      });
    }
  }
  reseed();

  function frame(t){
    const p=(t-start)/duration;
    if(p>=1){stopCurrent();return}
    if(t>=nextBandChange){
      if(Math.random()<.42)reseed();
      else bands.forEach(b=>{b.y=Math.max(0,Math.min(h-b.h,b.y+rand(-12,12)));b.density=Math.max(.12,Math.min(.6,b.density+rand(-.08,.08))) });
      nextBandChange=t+rand(55,120);
    }
    const envelope=Math.sin(Math.PI*p);
    drawClusteredNoise(ctx,w,h,bands,.55+.75*envelope);

    if(Math.random()<.22){
      const y=irand(0,h-2),a=rand(.03,.09)*envelope;
      ctx.fillStyle=`rgba(235,235,230,${a})`;
      ctx.fillRect(0,y,w,1);
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
}

function naturalStaticBand(){
  const {c,ctx}=makeCanvas(),w=c.width,h=c.height;
  const start=performance.now(),duration=700;
  const bandH=rand(h*.07,h*.16);
  let y=rand(h*.12,h*.75),drift=rand(-.7,.7),phaseUntil=0;

  function frame(t){
    const p=(t-start)/duration;
    if(p>=1){stopCurrent();return}
    if(t>phaseUntil){drift=rand(-1.5,1.5);phaseUntil=t+rand(70,150)}
    y=Math.max(4,Math.min(h-bandH-4,y+drift));
    const envelope=Math.sin(Math.PI*p);
    const bands=[{y,h:bandH,density:.58,spacing:irand(1,5),maxLen:irand(4,22),coarse:false}];
    drawClusteredNoise(ctx,w,h,bands,.65+.6*envelope);

    // uneven dark dropout inside the interference, not a uniform rectangle
    if(Math.random()<.5){
      const yy=y+rand(0,bandH*.9),hh=rand(1,Math.max(2,bandH*.08));
      const x=rand(0,w*.55),ww=rand(w*.12,w*.7);
      ctx.fillStyle=`rgba(0,0,0,${rand(.035,.12)*envelope})`;
      ctx.fillRect(x,yy,ww,hh);
    }
    raf=requestAnimationFrame(frame);
  }
  raf=requestAnimationFrame(frame);
}

function relabel(){
  const d=document.querySelector('[data-wmd="digitalNoise"]');
  if(d){d.textContent='DIGITAL NOISE BURST — NATURAL';const desc=d.parentElement?.querySelector('.wmd-desc');if(desc)desc.textContent='Clustered signal interference with uneven density, streak persistence, and irregular dropout rather than a static texture.'}
  const s=document.querySelector('[data-wg="static"]');
  if(s){s.textContent='STATIC BAND — NATURAL';const desc=s.parentElement?.querySelector('.wg-desc');if(desc)desc.textContent='A drifting interference band with changing grain, streaks, and uneven dropout rather than a repeated pattern.'}
}

// Capture phase prevents the older preview handlers from also firing.
document.addEventListener('click',e=>{
  const digital=e.target.closest?.('[data-wmd="digitalNoise"]');
  if(digital){e.preventDefault();e.stopImmediatePropagation();naturalDigitalNoise();return}
  const stat=e.target.closest?.('[data-wg="static"]');
  if(stat){e.preventDefault();e.stopImmediatePropagation();naturalStaticBand();return}
  const reset=e.target.closest?.('[data-wmd="reset"],[data-wg="reset"]');
  if(reset)stopCurrent();
},true);

let tries=0;const id=setInterval(()=>{tries++;relabel();if((document.querySelector('[data-wmd="digitalNoise"]')&&document.querySelector('[data-wg="static"]'))||tries>50)clearInterval(id)},200);
})();