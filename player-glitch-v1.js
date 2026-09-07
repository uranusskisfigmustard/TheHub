(() => {
'use strict';

const STYLE_ID='hubPlayerGlitchStylesV1';
const STATE_KEY='hub_player_glitch_state_v1';
const POLICY={
  eventsPerFiveMinutes:[2,4],
  normalDelaySeconds:[45,105],
  quietDelaySeconds:[120,180],
  quietChance:0.17,
  effects:[
    {key:'minor',weight:18,cooldown:[90,150]},
    {key:'partial',weight:15,cooldown:[120,180]},
    {key:'smear',weight:13,cooldown:[120,180]},
    {key:'lineDrop',weight:11,cooldown:[120,210]},
    {key:'frozen',weight:8,cooldown:[150,240]},
    {key:'after',weight:10,cooldown:[180,300]},
    {key:'noise',weight:9,cooldown:[210,360]},
    {key:'desync',weight:7,cooldown:[210,360]},
    {key:'scan',weight:5,cooldown:[300,480]},
    {key:'roll',weight:4,cooldown:[240,420]}
  ]
};

const rand=(a,b)=>a+Math.random()*(b-a);
const irand=(a,b)=>Math.floor(rand(a,b+1));
let timer=0,raf=0,overlays=[],touched=[],running=false,printing=false;
let saved=readState();

function readState(){try{const v=JSON.parse(sessionStorage.getItem(STATE_KEY)||'{}');return v&&typeof v==='object'?v:{}}catch(_){return{}}}
function writeState(){try{sessionStorage.setItem(STATE_KEY,JSON.stringify(saved))}catch(_){}}
function now(){return Date.now()}
function later(fn,ms){return setTimeout(fn,ms)}
function visible(el){if(!el)return false;const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>40&&r.height>14&&s.display!=='none'&&s.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function candidates(){
  const selectors=['header','.statusbar','.status','.player-system-line','.player-assignment','main .panel','main .card','main .scene','main .sheet','main section'];
  const seen=new Set(),out=[];
  for(const sel of selectors){for(const el of document.querySelectorAll(sel)){if(!seen.has(el)&&visible(el)){seen.add(el);out.push(el)}}}
  return out;
}
function pickTarget(){const list=candidates();return list.length?list[irand(0,list.length-1)]:document.querySelector('main')||document.body}
function scrub(root){root.removeAttribute?.('id');root.querySelectorAll?.('[id]').forEach(x=>x.removeAttribute('id'));root.querySelectorAll?.('script,style').forEach(x=>x.remove());root.querySelectorAll?.('input,textarea,select,button,a').forEach(x=>x.setAttribute('tabindex','-1'))}
function track(el,ms){overlays.push(el);document.body.appendChild(el);later(()=>removeOverlay(el),ms);return el}
function removeOverlay(el){try{el.remove()}catch(_){}overlays=overlays.filter(x=>x!==el)}
function cloneTarget(target,cls,ms){
  if(!target)return null;
  const r=target.getBoundingClientRect(),c=target.cloneNode(true);scrub(c);c.setAttribute('aria-hidden','true');c.classList.add('hpg-overlay','hpg-clone',cls);
  Object.assign(c.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0',zIndex:'2147483000',pointerEvents:'none',overflow:'hidden'});
  return track(c,ms);
}
function touch(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);touched.push([el,cls]);later(()=>{try{el.classList.remove(cls)}catch(_){};touched=touched.filter(x=>x[0]!==el||x[1]!==cls)},ms)}
function cleanup(){if(raf)cancelAnimationFrame(raf);raf=0;overlays.forEach(x=>{try{x.remove()}catch(_){}});overlays=[];touched.forEach(([e,c])=>{try{e.classList.remove(c)}catch(_){}});touched=[]}

function minorFramebufferTear(){
  cleanup();const t=pickTarget(),c=cloneTarget(t,'hpg-minor-tear',190);if(!c)return;
  const top=irand(24,70),h=irand(5,11),bottom=Math.max(0,100-top-h),x=irand(4,11)*(Math.random()<.5?-1:1);
  c.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;c.style.setProperty('--hpg-x',x+'px');c.style.setProperty('--hpg-x2',Math.round(x*-.45)+'px');
}
function partialRefresh(){cleanup();const t=pickTarget(),c=cloneTarget(t,'hpg-partial',560);if(!c)return;c.style.setProperty('--hpg-cut',irand(35,66)+'%');touch(t,'hpg-partial-under',560)}
function refreshSmear(){cleanup();const t=pickTarget();[2,5,9].forEach((x,i)=>{const c=cloneTarget(t,'hpg-smear',430+i*55);if(c){c.style.opacity=String(.26-i*.065);c.style.transform=`translateX(${x}px)`;c.style.filter=`blur(${.3+i*.14}px)`;c.style.mixBlendMode='screen'}});touch(t,'hpg-smear-source',430)}
function clusteredMultiLineDropout(){
  cleanup();const layer=document.createElement('div');layer.className='hpg-overlay hpg-lines';layer.setAttribute('aria-hidden','true');
  const base=18+Math.random()*64, offsets=[-3.6,-2.7,-1.9,-1.0,0,.9,1.8,2.8,3.7],count=irand(4,6);
  offsets.sort(()=>Math.random()-.5).slice(0,count).sort((a,b)=>a-b).forEach((off,i)=>{const line=document.createElement('i'),width=76+Math.random()*24,left=Math.random()*(100-width);line.style.cssText=`left:${left}vw;width:${width}vw;top:${Math.max(4,Math.min(96,base+off))}vh;height:${irand(1,2)}px;animation-delay:${i*13}ms`;layer.appendChild(line)});
  track(layer,650);
}
function frozenStrip(){
  cleanup();const t=pickTarget(),c=cloneTarget(t,'hpg-frozen',650);if(!c)return;const top=irand(18,74),h=irand(8,16),bottom=Math.max(0,100-top-h);c.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;c.style.opacity='.94';c.style.filter='brightness(.93) contrast(1.04)';touch(t,'hpg-live-jitter',650)
}
function phosphorAfterimage(){
  cleanup();const t=pickTarget(),c=cloneTarget(t,'hpg-after',760);if(!c)return;c.style.setProperty('--hpg-ax',irand(2,5)+'px');c.style.setProperty('--hpg-ay',irand(1,3)+'px')
}
function naturalDigitalNoise(){
  cleanup();const c=document.createElement('canvas');c.className='hpg-overlay';c.setAttribute('aria-hidden','true');c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483640;pointer-events:none;user-select:none;mix-blend-mode:screen;';
  const d=Math.max(1,Math.min(1.5,devicePixelRatio||1));c.width=Math.max(320,Math.round(innerWidth*d));c.height=Math.max(180,Math.round(innerHeight*d));document.body.appendChild(c);overlays.push(c);
  const ctx=c.getContext('2d',{alpha:true}),w=c.width,h=c.height,start=performance.now(),duration=760;let nextChange=0,bands=[];
  function reseed(){bands=[];for(let i=0;i<irand(1,3);i++){const bh=rand(h*.025,h*.12);bands.push({y:rand(h*.06,h*.9-bh),h:bh,density:rand(.22,.5),spacing:irand(2,8),maxLen:irand(3,16)})}}
  reseed();
  function edge(y,top,bottom){const e=Math.max(8,Math.min(28,(bottom-top)*.18));if(y<top+e)return(y-top)/e;if(y>bottom-e)return(bottom-y)/e;return 1}
  function frame(t){
    const p=(t-start)/duration;if(p>=1){removeOverlay(c);raf=0;return}
    if(t>=nextChange){if(Math.random()<.42)reseed();else bands.forEach(b=>{b.y=Math.max(0,Math.min(h-b.h,b.y+rand(-12,12)));b.density=Math.max(.12,Math.min(.6,b.density+rand(-.08,.08)))});nextChange=t+rand(55,120)}
    ctx.clearRect(0,0,w,h);const env=.55+.75*Math.sin(Math.PI*p);
    for(const b of bands){const top=Math.floor(b.y),bottom=Math.min(h,Math.ceil(b.y+b.h));for(let y=top;y<bottom;y++){const e=edge(y,top,bottom),density=b.density*(.25+.75*Math.random())*e*env;let x=irand(-20,8);while(x<w){x+=irand(1,b.spacing);if(Math.random()>density)continue;const len=irand(1,Math.max(2,b.maxLen)),lum=irand(120,235),a=rand(.035,.16)*e*env;ctx.fillStyle=`rgba(${lum},${lum},${lum},${a})`;ctx.fillRect(x,y,len,1)}if(Math.random()<.06*env){ctx.fillStyle=`rgba(220,220,215,${rand(.025,.09)*e})`;ctx.fillRect(0,y,w,1)}}}
    raf=requestAnimationFrame(frame)
  }
  raf=requestAnimationFrame(frame)
}
function horizontalLineDesync(){cleanup();const t=pickTarget();for(let i=0;i<irand(4,7);i++){const c=cloneTarget(t,'hpg-desync',500);if(!c)continue;const top=irand(5,90),h=irand(1,4),bottom=Math.max(0,100-top-h);c.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;c.style.transform=`translateX(${irand(3,18)*(Math.random()<.5?-1:1)}px)`;c.style.opacity=String(rand(.55,.9))}}
function scanlineBurst(){cleanup();const el=document.createElement('div');el.className='hpg-overlay hpg-scan';el.setAttribute('aria-hidden','true');el.style.setProperty('--hpg-band-top',irand(5,65)+'vh');track(el,420)}
function rollingInterferenceBand(){
  cleanup();const c=document.createElement('canvas');c.className='hpg-overlay';c.setAttribute('aria-hidden','true');c.style.cssText='position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483600;pointer-events:none;mix-blend-mode:screen;';const d=Math.min(1.5,devicePixelRatio||1);c.width=Math.round(innerWidth*d);c.height=Math.round(innerHeight*d);document.body.appendChild(c);overlays.push(c);
  const ctx=c.getContext('2d'),w=c.width,h=c.height,start=performance.now(),dur=1250,bh=h*.085;
  function frame(t){const p=(t-start)/dur;if(p>=1){removeOverlay(c);raf=0;return}ctx.clearRect(0,0,w,h);const y=(-bh)+(h+2*bh)*p,g=ctx.createLinearGradient(0,y,0,y+bh);g.addColorStop(0,'rgba(230,230,224,0)');g.addColorStop(.38,'rgba(225,225,219,.018)');g.addColorStop(.52,'rgba(238,238,232,.065)');g.addColorStop(.72,'rgba(12,13,14,.025)');g.addColorStop(1,'rgba(230,230,224,0)');ctx.fillStyle=g;ctx.fillRect(0,y,w,bh);for(let i=0;i<irand(5,12);i++){ctx.fillStyle=`rgba(235,235,230,${rand(.01,.035)})`;ctx.fillRect(rand(0,w*.4),y+rand(0,bh),rand(w*.08,w*.55),1)}raf=requestAnimationFrame(frame)}raf=requestAnimationFrame(frame)
}

const EFFECTS={minor:minorFramebufferTear,partial:partialRefresh,smear:refreshSmear,lineDrop:clusteredMultiLineDropout,frozen:frozenStrip,after:phosphorAfterimage,noise:naturalDigitalNoise,desync:horizontalLineDesync,scan:scanlineBurst,roll:rollingInterferenceBand};

function installStyles(){
  if(document.getElementById(STYLE_ID))return;const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    .hpg-overlay,.hpg-clone{pointer-events:none!important;user-select:none!important}
    .hpg-minor-tear{animation:hpgMinor 190ms steps(4,end) both;filter:contrast(1.08)}
    @keyframes hpgMinor{0%,100%{transform:none}22%{transform:translateX(var(--hpg-x))}54%{transform:translateX(var(--hpg-x2))}78%{transform:translateX(var(--hpg-x))}}
    .hpg-partial{animation:hpgPartial 560ms steps(8,end) both;opacity:.72}.hpg-partial-under{animation:hpgUnder 560ms steps(5,end) both}
    @keyframes hpgPartial{0%{clip-path:inset(0)}18%{clip-path:inset(0 0 var(--hpg-cut) 0)}42%{clip-path:inset(0 0 74% 0)}66%{clip-path:inset(0 0 38% 0)}100%{clip-path:inset(0 0 100% 0);opacity:0}}
    @keyframes hpgUnder{0%,100%{opacity:1}20%{opacity:.72}43%{opacity:.9}62%{opacity:.77}82%{opacity:.95}}
    .hpg-smear-source{animation:hpgSmearSource 430ms ease-out both}@keyframes hpgSmearSource{0%,100%{filter:none}35%{filter:blur(.45px)}70%{filter:blur(.2px)}}
    .hpg-lines{position:fixed;inset:0;z-index:2147483720}.hpg-lines i{position:absolute;display:block;background:#050607;opacity:.92;animation:hpgCluster 480ms steps(6,end) both}
    @keyframes hpgCluster{0%,100%{opacity:0;transform:translateX(0)}10%{opacity:.98}28%{opacity:.58;transform:translateX(2px)}42%{opacity:.95;transform:translateX(-1px)}63%{opacity:.35}78%{opacity:.88;transform:translateX(1px)}90%{opacity:.25}}
    .hpg-live-jitter{animation:hpgLive 650ms steps(7,end) both}@keyframes hpgLive{0%,100%{transform:none;filter:none}14%{transform:translateY(1px)}29%{filter:brightness(.85)}43%{transform:translateX(1px)}61%{filter:brightness(1.03)}78%{transform:translateY(-1px)}}
    .hpg-after{opacity:.28;filter:blur(.35px) brightness(1.08);mix-blend-mode:screen;animation:hpgAfter 760ms ease-out both}
    @keyframes hpgAfter{0%{opacity:0;transform:none}10%{opacity:.28;transform:translate(var(--hpg-ax),var(--hpg-ay))}42%{opacity:.16;transform:translate(2px,1px)}72%{opacity:.07;transform:translate(1px,0)}100%{opacity:0;transform:none}}
    .hpg-scan{position:fixed;inset:0;z-index:2147483500;background:repeating-linear-gradient(to bottom,transparent 0,transparent 3px,rgba(231,228,220,.11) 4px,rgba(0,0,0,.18) 5px,transparent 6px);clip-path:inset(var(--hpg-band-top) 0 calc(100vh - var(--hpg-band-top) - 22vh) 0);animation:hpgScan 420ms linear both;mix-blend-mode:screen}
    @keyframes hpgScan{0%{transform:translateY(-16vh);opacity:0}18%{opacity:.8}78%{opacity:.5}100%{transform:translateY(26vh);opacity:0}}
    @media print{.hpg-overlay,.hpg-clone{display:none!important}}
    @media(prefers-reduced-motion:reduce){.hpg-overlay,.hpg-clone{display:none!important}}
  `;document.head.appendChild(s)
}

function cooldownFor(spec){const value=rand(spec.cooldown[0],spec.cooldown[1]);saved.cooldowns=saved.cooldowns||{};saved.cooldowns[spec.key]=now()+value*1000;writeState()}
function eligible(){const n=now(),cd=saved.cooldowns||{};return POLICY.effects.filter(e=>Number(cd[e.key]||0)<=n)}
function choose(){const list=eligible();if(!list.length)return null;let total=list.reduce((a,e)=>a+e.weight,0),r=Math.random()*total;for(const e of list){r-=e.weight;if(r<=0)return e}return list[list.length-1]}
function nextDelay(){if(Math.random()<POLICY.quietChance)return rand(POLICY.quietDelaySeconds[0],POLICY.quietDelaySeconds[1])*1000;return rand(POLICY.normalDelaySeconds[0],POLICY.normalDelaySeconds[1])*1000}
function schedule(ms){if(timer)clearTimeout(timer);timer=later(runOnce,ms)}
function runOnce(){timer=0;if(!running||printing||document.hidden){schedule(15000);return}const spec=choose();if(!spec){schedule(rand(15000,30000));return}const fn=EFFECTS[spec.key];if(fn){try{fn()}catch(_){}cooldownFor(spec);saved.lastKey=spec.key;saved.lastAt=now();writeState()}schedule(nextDelay())}
function start(){if(running)return;running=true;installStyles();schedule(rand(35000,80000))}
function stop(){running=false;if(timer)clearTimeout(timer);timer=0;cleanup()}

window.addEventListener('beforeprint',()=>{printing=true;cleanup()});
window.addEventListener('afterprint',()=>{printing=false;if(running&&!timer)schedule(rand(30000,60000))});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&running&&!timer)schedule(rand(30000,60000))});

if(!matchMedia('(prefers-reduced-motion: reduce)').matches)start();
window.__hubPlayerGlitch={policy:POLICY,start,stop};
})();