(() => {
'use strict';

const PANEL_ID='wardenModernDisplayPreview';
const STYLE_ID='wardenModernDisplayPreviewStyles';
let timers=[];
let overlays=[];
let touched=[];

const $=s=>document.querySelector(s);
const rand=(min,max)=>Math.floor(Math.random()*(max-min+1))+min;
function later(fn,ms){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);fn()},ms);timers.push(id);return id}
function removeOverlay(el){try{el.remove()}catch(_){}overlays=overlays.filter(x=>x!==el)}
function trackOverlay(el,ms){overlays.push(el);document.body.appendChild(el);later(()=>removeOverlay(el),ms);return el}
function visible(el){if(!el)return false;const r=el.getBoundingClientRect(),cs=getComputedStyle(el);return r.width>30&&r.height>12&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function pickTarget(){const selectors=['header','.statusbar','#console .metrics','#console .panel'];const els=selectors.flatMap(s=>[...document.querySelectorAll(s)]).filter(visible).filter(el=>!el.closest('#'+PANEL_ID));return els.length?els[rand(0,els.length-1)]:document.getElementById('console')}
function scrubClone(root){root.removeAttribute?.('id');root.querySelectorAll?.('[id]').forEach(x=>x.removeAttribute('id'));root.querySelectorAll?.('script,style').forEach(x=>x.remove());root.querySelectorAll?.('input,textarea,select,button,a').forEach(x=>x.setAttribute('tabindex','-1'))}
function cloneTarget(target,cls,ms){if(!target)return null;const r=target.getBoundingClientRect();const clone=target.cloneNode(true);scrubClone(clone);clone.setAttribute('aria-hidden','true');clone.classList.add('wmd-overlay','wmd-clone',cls);Object.assign(clone.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0',zIndex:'2147483000',pointerEvents:'none',overflow:'hidden'});return trackOverlay(clone,ms)}
function touch(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);touched.push([el,cls]);later(()=>{el.classList.remove(cls);touched=touched.filter(x=>x[0]!==el||x[1]!==cls)},ms)}
function reset(){
  timers.forEach(clearTimeout);timers=[];
  overlays.forEach(el=>{try{el.remove()}catch(_){}});overlays=[];
  touched.forEach(([el,cls])=>{try{el.classList.remove(cls)}catch(_){}});touched=[];
  document.documentElement.classList.remove('wmd-scale-error','wmd-major-tear','wmd-whole-drop');
  document.body.style.removeProperty('--wmd-major-x');
  document.body.style.removeProperty('--wmd-scale-x');
  document.body.style.removeProperty('--wmd-scale-y');
}

function minorFramebufferTear(){
  reset();
  const target=pickTarget();if(!target)return;
  const c=cloneTarget(target,'wmd-minor-tear',190);if(!c)return;
  const top=rand(24,70),h=rand(5,11),bottom=Math.max(0,100-top-h),x=rand(4,11)*(Math.random()<.5?-1:1);
  c.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;
  c.style.setProperty('--wmd-x',x+'px');
  c.style.setProperty('--wmd-x2',Math.round(x*-.45)+'px');
}

function partialRefresh(){
  reset();
  const target=pickTarget();if(!target)return;
  const c=cloneTarget(target,'wmd-partial-refresh',560);if(!c)return;
  c.style.setProperty('--wmd-refresh-cut',rand(35,66)+'%');
  touch(target,'wmd-refresh-under',560);
}

function frozenStrip(){
  reset();
  const target=pickTarget();if(!target)return;
  const c=cloneTarget(target,'wmd-frozen-strip',620);if(!c)return;
  const top=rand(18,74),h=rand(8,18),bottom=Math.max(0,100-top-h);
  c.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;
  touch(target,'wmd-live-jitter',620);
}

function refreshSmear(){
  reset();
  const target=pickTarget();if(!target)return;
  [2,5,9].forEach((x,i)=>{const c=cloneTarget(target,'wmd-smear',420+i*55);if(c){c.style.opacity=String(.28-i*.07);c.style.transform=`translateX(${x}px)`;c.style.filter=`blur(${.35+i*.15}px)`}});
  touch(target,'wmd-smear-source',420);
}

function repeatedFrame(){
  reset();
  const target=pickTarget();if(!target)return;
  const a=cloneTarget(target,'wmd-repeat-a',460),b=cloneTarget(target,'wmd-repeat-b',460);
  if(a){a.style.transform='translate(0,7px)';a.style.opacity='.38';a.style.clipPath='inset(0 0 48% 0)'}
  if(b){b.style.transform='translate(0,-5px)';b.style.opacity='.28';b.style.clipPath='inset(52% 0 0 0)'}
  touch(target,'wmd-repeat-source',460);
}

function digitalNoiseBurst(){
  reset();
  const layer=document.createElement('div');layer.className='wmd-overlay wmd-noise-layer';layer.setAttribute('aria-hidden','true');
  for(let i=0;i<rand(28,46);i++){
    const b=document.createElement('i');b.style.left=rand(1,97)+'vw';b.style.top=rand(3,94)+'vh';b.style.width=rand(2,28)+'px';b.style.height=rand(1,5)+'px';b.style.opacity=String((rand(25,80))/100);layer.appendChild(b)
  }
  trackOverlay(layer,370);
}

function uiRedrawFailure(){
  reset();
  const target=pickTarget();if(!target)return;
  touch(target,'wmd-ui-redraw',760);
  const c=cloneTarget(target,'wmd-ui-redraw-stale',760);if(c)c.style.opacity='.22';
}

function regionalSignalDropout(){
  reset();
  const target=pickTarget();if(!target)return;
  const r=target.getBoundingClientRect(),el=document.createElement('div');el.className='wmd-overlay wmd-region-drop';el.setAttribute('aria-hidden','true');
  const h=Math.max(34,Math.round(r.height*rand(24,48)/100)),top=r.top+rand(0,Math.max(0,Math.round(r.height-h)));
  Object.assign(el.style,{left:r.left+'px',top:top+'px',width:r.width+'px',height:h+'px'});trackOverlay(el,480);
}

function substantialFrameTear(){
  reset();
  document.body.style.setProperty('--wmd-major-x',rand(18,42)*(Math.random()<.5?-1:1)+'px');
  document.documentElement.classList.add('wmd-major-tear');later(()=>document.documentElement.classList.remove('wmd-major-tear'),720);
  const target=pickTarget();if(target){for(let i=0;i<3;i++){const c=cloneTarget(target,'wmd-major-strip',620);if(!c)continue;const top=rand(4,78),h=rand(6,16),bottom=Math.max(0,100-top-h);c.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;c.style.setProperty('--wmd-strip-x',rand(18,58)*(Math.random()<.5?-1:1)+'px')}}
}

function wholeScreenDropout(){
  reset();
  document.documentElement.classList.add('wmd-whole-drop');
  const el=document.createElement('div');el.className='wmd-overlay wmd-whole-drop-layer';el.setAttribute('aria-hidden','true');trackOverlay(el,760);
  later(()=>document.documentElement.classList.remove('wmd-whole-drop'),760);
}

function largeBlockCorruption(){
  reset();
  const layer=document.createElement('div');layer.className='wmd-overlay wmd-block-layer';layer.setAttribute('aria-hidden','true');
  for(let i=0;i<rand(7,12);i++){
    const b=document.createElement('i');b.style.left=rand(-4,88)+'vw';b.style.top=rand(2,89)+'vh';b.style.width=rand(8,32)+'vw';b.style.height=rand(18,84)+'px';b.style.setProperty('--wmd-block-shift',rand(8,45)*(Math.random()<.5?-1:1)+'px');layer.appendChild(b)
  }
  trackOverlay(layer,780);
}

function resolutionScalingError(){
  reset();
  document.body.style.setProperty('--wmd-scale-x',(rand(970,1045)/1000).toFixed(3));
  document.body.style.setProperty('--wmd-scale-y',(rand(955,1035)/1000).toFixed(3));
  document.documentElement.classList.add('wmd-scale-error');later(()=>document.documentElement.classList.remove('wmd-scale-error'),880);
}

const EFFECTS={minorTear:minorFramebufferTear,partialRefresh,frozenStrip,refreshSmear,repeatedFrame,digitalNoise:digitalNoiseBurst,uiRedraw:uiRedrawFailure,regionalDrop:regionalSignalDropout,majorTear:substantialFrameTear,wholeDrop:wholeScreenDropout,blockCorrupt:largeBlockCorruption,scaleError:resolutionScalingError,reset};

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    #${PANEL_ID}{position:relative;overflow:hidden}
    #${PANEL_ID} .wmd-intro{color:var(--muted);font-size:.78rem;margin:-4px 0 12px;max-width:900px}
    #${PANEL_ID} .wmd-subhead{margin:16px 0 8px;color:var(--accent);font-size:.72rem;font-weight:800;letter-spacing:.09em;text-transform:uppercase}
    #${PANEL_ID} .wmd-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:9px}
    #${PANEL_ID} .wmd-choice{border:1px solid var(--line);background:var(--panel2);padding:10px;min-width:0}
    #${PANEL_ID} .wmd-choice .btn{width:100%;text-align:left;padding:7px 9px;font-size:.72rem}
    #${PANEL_ID} .wmd-desc{margin-top:6px;color:var(--muted);font-size:.69rem;line-height:1.35}
    #${PANEL_ID} .wmd-reset{margin-top:10px;display:flex;justify-content:flex-end}
    .wmd-overlay{pointer-events:none!important;user-select:none!important}
    .wmd-minor-tear{animation:wmdMinorTear 190ms steps(4,end) both;filter:contrast(1.08)}
    @keyframes wmdMinorTear{0%,100%{transform:none}22%{transform:translateX(var(--wmd-x))}54%{transform:translateX(var(--wmd-x2))}78%{transform:translateX(var(--wmd-x))}}
    .wmd-partial-refresh{animation:wmdPartialRefresh 560ms steps(8,end) both;opacity:.72}
    @keyframes wmdPartialRefresh{0%{clip-path:inset(0 0 0 0)}18%{clip-path:inset(0 0 var(--wmd-refresh-cut) 0)}42%{clip-path:inset(0 0 74% 0)}66%{clip-path:inset(0 0 38% 0)}100%{clip-path:inset(0 0 100% 0);opacity:0}}
    .wmd-refresh-under{animation:wmdRefreshUnder 560ms steps(5,end) both}@keyframes wmdRefreshUnder{0%,100%{opacity:1}20%{opacity:.72}43%{opacity:.9}62%{opacity:.77}82%{opacity:.95}}
    .wmd-frozen-strip{opacity:.92;filter:brightness(.92) contrast(1.05)}
    .wmd-live-jitter{animation:wmdLiveJitter 620ms steps(7,end) both}@keyframes wmdLiveJitter{0%,100%{transform:none;filter:none}14%{transform:translateY(1px)}29%{filter:brightness(.82)}43%{transform:translateX(1px)}61%{filter:brightness(1.04)}78%{transform:translateY(-1px)}}
    .wmd-smear{mix-blend-mode:screen}.wmd-smear-source{animation:wmdSmearSource 420ms ease-out both}@keyframes wmdSmearSource{0%,100%{filter:none}35%{filter:blur(.45px)}70%{filter:blur(.2px)}}
    .wmd-repeat-source{animation:wmdRepeatSource 460ms steps(4,end) both}@keyframes wmdRepeatSource{0%,100%{opacity:1}22%{opacity:.73}46%{opacity:.92}71%{opacity:.78}}
    .wmd-noise-layer{position:fixed;inset:0;z-index:2147483500}.wmd-noise-layer i{position:absolute;display:block;background:#d7d6cf;box-shadow:0 0 0 1px rgba(0,0,0,.45);animation:wmdNoise 370ms steps(6,end) both}@keyframes wmdNoise{0%,100%{transform:none;opacity:0}12%{opacity:1}34%{transform:translateX(11px)}55%{transform:translateX(-8px)}76%{opacity:.55;transform:translateX(4px)}}
    .wmd-ui-redraw{animation:wmdUiRedraw 760ms steps(12,end) both}@keyframes wmdUiRedraw{0%{opacity:1;clip-path:inset(0)}8%{opacity:.08;clip-path:inset(0 0 82% 0)}20%{opacity:.45;clip-path:inset(0 0 67% 0)}38%{opacity:.68;clip-path:inset(0 0 43% 0)}55%{opacity:.26;clip-path:inset(0 0 36% 0)}72%{opacity:.82;clip-path:inset(0 0 14% 0)}100%{opacity:1;clip-path:inset(0)}}
    .wmd-region-drop{position:fixed;z-index:2147483550;background:#08090a;animation:wmdRegionDrop 480ms steps(5,end) both}@keyframes wmdRegionDrop{0%,100%{opacity:0}10%{opacity:.98}43%{opacity:.98}57%{opacity:.22}69%{opacity:.98}84%{opacity:.7}}
    .wmd-major-tear body{animation:wmdMajorBody 720ms steps(8,end) both}@keyframes wmdMajorBody{0%,100%{transform:none}12%{transform:translateX(var(--wmd-major-x))}24%{transform:translateX(-5px)}38%{transform:translateX(calc(var(--wmd-major-x) * .55))}54%{transform:translateX(7px)}68%{transform:translateX(calc(var(--wmd-major-x) * -.35))}84%{transform:translateX(2px)}}
    .wmd-major-strip{animation:wmdMajorStrip 620ms steps(7,end) both}@keyframes wmdMajorStrip{0%,100%{transform:none;opacity:0}9%{opacity:.92;transform:translateX(var(--wmd-strip-x))}32%{transform:translateX(-12px)}51%{transform:translateX(var(--wmd-strip-x))}74%{opacity:.58;transform:translateX(5px)}}
    .wmd-whole-drop-layer{position:fixed;inset:0;z-index:2147483645;background:#050607;animation:wmdWholeDrop 760ms steps(8,end) both}@keyframes wmdWholeDrop{0%,100%{opacity:0}8%{opacity:1}28%{opacity:1}36%{opacity:.15}45%{opacity:.98}66%{opacity:.92}74%{opacity:.2}84%{opacity:.95}}
    .wmd-block-layer{position:fixed;inset:0;z-index:2147483600}.wmd-block-layer i{position:absolute;display:block;background:repeating-linear-gradient(0deg,#d9d7cf 0 1px,#151719 1px 3px,#74736f 3px 4px,#0b0c0d 4px 7px);box-shadow:0 0 0 1px #050607;animation:wmdBlock 780ms steps(7,end) both}@keyframes wmdBlock{0%,100%{opacity:0;transform:none}9%{opacity:.9}28%{transform:translateX(var(--wmd-block-shift))}47%{transform:translateX(-7px);opacity:.72}65%{transform:translateX(var(--wmd-block-shift));opacity:.94}82%{opacity:.35}}
    .wmd-scale-error body{transform-origin:center top;animation:wmdScaleError 880ms steps(9,end) both}@keyframes wmdScaleError{0%,100%{transform:none;filter:none}10%{transform:scale(var(--wmd-scale-x),var(--wmd-scale-y));filter:blur(.35px)}24%{transform:scale(1.02,.975);filter:blur(.2px)}39%{transform:scale(.985,1.018)}54%{transform:scale(1.012,.99);filter:blur(.25px)}71%{transform:scale(.996,1.006)}86%{transform:scale(1.002,.999)}}
    @media(prefers-reduced-motion:reduce){.wmd-minor-tear,.wmd-partial-refresh,.wmd-refresh-under,.wmd-live-jitter,.wmd-smear-source,.wmd-repeat-source,.wmd-noise-layer i,.wmd-ui-redraw,.wmd-region-drop,.wmd-major-tear body,.wmd-major-strip,.wmd-whole-drop-layer,.wmd-block-layer i,.wmd-scale-error body{animation-duration:1ms!important}}
  `;document.head.appendChild(s)
}

function installPanel(){
  if(document.getElementById(PANEL_ID))return true;
  const consoleEl=document.getElementById('console');if(!consoleEl)return false;
  const panel=document.createElement('section');panel.id=PANEL_ID;panel.className='panel';panel.innerHTML=`
    <h2>Modern Display Fault Preview</h2>
    <div class="wmd-intro">WARDEN-ONLY comparison set. These simulate framebuffer, refresh, panel, and digital signal faults rather than specifically CRT electronics. Each button fires once and changes presentation only.</div>

    <div class="wmd-subhead">Frequent / Subtle</div>
    <div class="wmd-grid">
      <div class="wmd-choice"><button class="btn primary" data-wmd="minorTear">MINOR FRAMEBUFFER TEAR</button><div class="wmd-desc">A narrow band updates out of alignment for a fraction of a second.</div></div>
      <div class="wmd-choice"><button class="btn primary" data-wmd="partialRefresh">PARTIAL REFRESH</button><div class="wmd-desc">Only part of a region appears to refresh before the rest catches up.</div></div>
      <div class="wmd-choice"><button class="btn primary" data-wmd="frozenStrip">FROZEN STRIP</button><div class="wmd-desc">One horizontal region holds its prior image while the surrounding display jitters.</div></div>
      <div class="wmd-choice"><button class="btn primary" data-wmd="refreshSmear">REFRESH SMEAR</button><div class="wmd-desc">A short-lived trail follows the displayed image as the panel catches up.</div></div>
    </div>

    <div class="wmd-subhead">Occasional</div>
    <div class="wmd-grid">
      <div class="wmd-choice"><button class="btn" data-wmd="repeatedFrame">REPEATED FRAME</button><div class="wmd-desc">Pieces of the previous frame briefly appear again over the current image.</div></div>
      <div class="wmd-choice"><button class="btn" data-wmd="digitalNoise">DIGITAL NOISE BURST</button><div class="wmd-desc">Sparse monochrome pixels and short bars contaminate the picture, then clear.</div></div>
      <div class="wmd-choice"><button class="btn" data-wmd="uiRedraw">UI REDRAW FAILURE</button><div class="wmd-desc">A panel drops out and reconstructs in uneven stepped passes.</div></div>
      <div class="wmd-choice"><button class="btn" data-wmd="regionalDrop">REGIONAL SIGNAL DROPOUT</button><div class="wmd-desc">A broad portion of the image blanks, sputters, and reacquires.</div></div>
    </div>

    <div class="wmd-subhead">Rare / Severe</div>
    <div class="wmd-grid">
      <div class="wmd-choice"><button class="btn danger" data-wmd="majorTear">SUBSTANTIAL FRAME TEAR</button><div class="wmd-desc">Large horizontal regions shear apart while the full frame loses alignment.</div></div>
      <div class="wmd-choice"><button class="btn danger" data-wmd="wholeDrop">WHOLE-SCREEN DROPOUT</button><div class="wmd-desc">The complete signal disappears, sputters back, drops again, and recovers.</div></div>
      <div class="wmd-choice"><button class="btn danger" data-wmd="blockCorrupt">LARGE BLOCK CORRUPTION</button><div class="wmd-desc">Large rectangular areas fill with damaged raster data and displaced blocks.</div></div>
      <div class="wmd-choice"><button class="btn danger" data-wmd="scaleError">RESOLUTION / SCALING ERROR</button><div class="wmd-desc">The image briefly resamples at the wrong scale and aspect before locking correctly.</div></div>
    </div>
    <div class="wmd-reset"><button class="btn danger mini" data-wmd="reset">RESET MODERN DISPLAY LAYER</button></div>`;
  const existing=document.getElementById('wardenGlitchPreview');
  if(existing)existing.insertAdjacentElement('afterend',panel);else{const metrics=consoleEl.querySelector('.metrics');if(metrics)metrics.insertAdjacentElement('afterend',panel);else consoleEl.insertAdjacentElement('afterbegin',panel)}
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-wmd]');if(!b)return;const fn=EFFECTS[b.dataset.wmd];if(fn)fn()});
  return true
}

installStyles();
if(!installPanel()){let tries=0;const id=setInterval(()=>{tries++;if(installPanel()||tries>50)clearInterval(id)},250)}
})();