(() => {
'use strict';

const PANEL_ID='wardenGlitchPreview';
const STYLE_ID='wardenGlitchPreviewStyles';
const ACTIVE_CLASSNAMES=['wg-sync-slip','wg-brightness-pulse'];
const CONSOLE_CLASSNAMES=['wg-frame-misalignment'];
let timers=[];
let overlays=[];
let touched=[];

function rand(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function visible(el){if(!el)return false;const r=el.getBoundingClientRect();const cs=getComputedStyle(el);return r.width>20&&r.height>8&&cs.display!=='none'&&cs.visibility!=='hidden'&&r.bottom>0&&r.top<innerHeight}
function pick(selector){const els=[...document.querySelectorAll(selector)].filter(visible);return els.length?els[rand(0,els.length-1)]:null}
function later(fn,ms){const id=setTimeout(()=>{timers=timers.filter(x=>x!==id);fn()},ms);timers.push(id);return id}
function trackOverlay(el,ms){overlays.push(el);document.body.appendChild(el);later(()=>removeOverlay(el),ms);return el}
function removeOverlay(el){try{el.remove()}catch(_){}overlays=overlays.filter(x=>x!==el)}
function touch(el,cls,ms){if(!el)return;el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls);touched.push([el,cls]);later(()=>{el.classList.remove(cls);touched=touched.filter(x=>x[0]!==el||x[1]!==cls)},ms)}
function scrubClone(root){root.removeAttribute?.('id');root.querySelectorAll?.('[id]').forEach(x=>x.removeAttribute('id'));root.querySelectorAll?.('script,style').forEach(x=>x.remove());root.querySelectorAll?.('input,textarea,select,button,a').forEach(x=>x.setAttribute('tabindex','-1'))}
function cloneTarget(target,extraClass,ms){if(!target)return null;const r=target.getBoundingClientRect();const clone=target.cloneNode(true);scrubClone(clone);clone.setAttribute('aria-hidden','true');clone.classList.add('wg-clone',extraClass);Object.assign(clone.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',margin:'0',zIndex:'2147483000',pointerEvents:'none',overflow:'hidden'});return trackOverlay(clone,ms)}

function reset(){
  timers.forEach(clearTimeout);timers=[];
  overlays.forEach(el=>{try{el.remove()}catch(_){}});overlays=[];
  touched.forEach(([el,cls])=>{try{el.classList.remove(cls)}catch(_){}});touched=[];
  ACTIVE_CLASSNAMES.forEach(c=>document.documentElement.classList.remove(c));
  const consoleEl=document.getElementById('console');
  if(consoleEl)CONSOLE_CLASSNAMES.forEach(c=>consoleEl.classList.remove(c));
}

function horizontalTear(){
  reset();
  const target=pick('header, .statusbar, #console .metrics, #console .panel');
  if(!target)return;
  const clone=cloneTarget(target,'wg-tear-clone',150);
  if(!clone)return;
  const top=rand(18,70),height=rand(7,16),bottom=Math.max(0,100-top-height);
  const shift=rand(8,22)*(Math.random()<.5?-1:1);
  clone.style.clipPath=`inset(${top}% 0 ${bottom}% 0)`;
  clone.style.setProperty('--wg-shift',shift+'px');
  clone.style.setProperty('--wg-shift2',Math.round(shift*-.55)+'px');
}

function scanlineBurst(){
  reset();
  const el=document.createElement('div');el.className='wg-overlay wg-scanline-burst';el.setAttribute('aria-hidden','true');
  el.style.setProperty('--wg-band-top',rand(5,65)+'vh');
  trackOverlay(el,420);
}

function textJitter(){
  reset();
  const target=pick('h1, #status, #date, #console h2, #console .metric strong, #console .label, #console .title');
  if(!target)return;
  const a=cloneTarget(target,'wg-text-ghost-a',220),b=cloneTarget(target,'wg-text-ghost-b',220);
  if(a){const x=rand(2,5);a.style.setProperty('--wg-jx',x+'px');a.style.setProperty('--wg-jx2',Math.round(x*-.5)+'px')}
  if(b){const x=-rand(2,5);b.style.setProperty('--wg-jx',x+'px');b.style.setProperty('--wg-jx2',Math.round(x*-.5)+'px')}
  touch(target,'wg-text-jitter',220);
}

function corruptText(s){
  const glyphs=['#','?','/','\\','|','░','▒','0','1'];
  return [...String(s)].map(ch=>/[A-Za-z0-9]/.test(ch)&&Math.random()<.28?glyphs[rand(0,glyphs.length-1)]:ch).join('');
}
function characterCorruption(){
  reset();
  const target=pick('h1, #status, #date, #console h2, #console .metric strong, #console .label, #console .title, #console .small');
  if(!target)return;
  const r=target.getBoundingClientRect(),cs=getComputedStyle(target),el=document.createElement('div');
  el.className='wg-corrupt-text';el.setAttribute('aria-hidden','true');el.textContent=corruptText(target.textContent||'');
  Object.assign(el.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',minHeight:r.height+'px',font:cs.font,fontSize:cs.fontSize,fontWeight:cs.fontWeight,letterSpacing:cs.letterSpacing,lineHeight:cs.lineHeight,textTransform:cs.textTransform,color:cs.color,textAlign:cs.textAlign,padding:cs.padding,whiteSpace:'pre-wrap'});
  trackOverlay(el,190);
}

function partialRedraw(){
  reset();
  const target=pick('#console .panel, #console .metrics');
  if(target)touch(target,'wg-partial-redraw',520);
}

function staticBand(){
  reset();
  const el=document.createElement('div');el.className='wg-overlay wg-static-band';el.setAttribute('aria-hidden','true');
  el.style.top=rand(8,82)+'vh';el.style.height=rand(28,72)+'px';
  trackOverlay(el,320);
}

function syncSlip(){
  reset();
  document.documentElement.classList.add('wg-sync-slip');
  later(()=>document.documentElement.classList.remove('wg-sync-slip'),430);
}

function frameDrop(){
  reset();
  const el=document.createElement('div');el.className='wg-overlay wg-frame-drop';el.setAttribute('aria-hidden','true');
  trackOverlay(el,180);
}

function brightnessPulse(){
  reset();
  document.documentElement.classList.add('wg-brightness-pulse');
  later(()=>document.documentElement.classList.remove('wg-brightness-pulse'),360);
}

function frameMisalignment(){
  reset();
  const consoleEl=document.getElementById('console');
  if(!consoleEl)return;
  const x=rand(3,7)*(Math.random()<.5?-1:1),y=rand(1,4)*(Math.random()<.5?-1:1);
  consoleEl.style.setProperty('--wg-frame-x',x+'px');
  consoleEl.style.setProperty('--wg-frame-y',y+'px');
  consoleEl.style.setProperty('--wg-frame-x2',Math.round(x*-.45)+'px');
  consoleEl.style.setProperty('--wg-frame-y2',Math.round(y*-.5)+'px');
  consoleEl.classList.add('wg-frame-misalignment');
  later(()=>consoleEl.classList.remove('wg-frame-misalignment'),300);
}

const EFFECTS={
  tear:horizontalTear,
  scan:scanlineBurst,
  jitter:textJitter,
  corrupt:characterCorruption,
  redraw:partialRedraw,
  static:staticBand,
  sync:syncSlip,
  dropout:frameDrop,
  brightness:brightnessPulse,
  misalign:frameMisalignment,
  reset
};

function installStyles(){
  if(document.getElementById(STYLE_ID))return;
  const s=document.createElement('style');s.id=STYLE_ID;s.textContent=`
    #${PANEL_ID}{position:relative;overflow:hidden}
    .wg-intro{color:var(--muted);font-size:.78rem;margin:-4px 0 12px;max-width:850px}
    .wg-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(205px,1fr));gap:9px}
    .wg-choice{border:1px solid var(--line);background:var(--panel2);padding:10px;min-width:0}
    .wg-choice .btn{width:100%;text-align:left;padding:7px 9px;font-size:.72rem}
    .wg-desc{margin-top:6px;color:var(--muted);font-size:.69rem;line-height:1.35}
    .wg-reset-row{margin-top:10px;display:flex;justify-content:flex-end}
    .wg-overlay,.wg-clone,.wg-corrupt-text{pointer-events:none!important;user-select:none!important}
    .wg-tear-clone{animation:wgTear 150ms steps(3,end) both;filter:contrast(1.25) brightness(1.1)}
    @keyframes wgTear{0%{transform:translateX(0)}20%{transform:translateX(var(--wg-shift))}45%{transform:translateX(var(--wg-shift2))}70%{transform:translateX(var(--wg-shift))}100%{transform:translateX(0)}}
    .wg-scanline-burst{position:fixed;inset:0;z-index:2147483001;background:repeating-linear-gradient(to bottom,transparent 0,transparent 3px,rgba(231,228,220,.11) 4px,rgba(0,0,0,.18) 5px,transparent 6px);clip-path:inset(var(--wg-band-top) 0 calc(100vh - var(--wg-band-top) - 22vh) 0);animation:wgScanBurst 420ms linear both;mix-blend-mode:screen}
    @keyframes wgScanBurst{0%{transform:translateY(-16vh);opacity:0}18%{opacity:.85}78%{opacity:.55}100%{transform:translateY(26vh);opacity:0}}
    .wg-text-ghost-a,.wg-text-ghost-b{opacity:.48;animation:wgGhost 220ms steps(4,end) both;text-shadow:1px 0 rgba(231,228,220,.35)}
    .wg-text-ghost-b{opacity:.25}
    .wg-text-jitter{animation:wgTextJitter 220ms steps(5,end) both}
    @keyframes wgTextJitter{0%,100%{transform:none}20%{transform:translateX(1px)}40%{transform:translateX(-2px)}60%{transform:translate(1px,-1px)}80%{transform:translateX(-1px)}}
    @keyframes wgGhost{0%,100%{transform:none}25%{transform:translateX(var(--wg-jx))}50%{transform:translateX(var(--wg-jx2))}75%{transform:translateX(var(--wg-jx))}}
    .wg-corrupt-text{position:fixed;z-index:2147483002;background:#111315;overflow:hidden;animation:wgCorrupt 190ms steps(3,end) both}
    @keyframes wgCorrupt{0%{opacity:0}12%{opacity:1}72%{opacity:1}100%{opacity:0}}
    .wg-partial-redraw{animation:wgPartialRedraw 520ms steps(10,end) both;transform-origin:top}
    @keyframes wgPartialRedraw{0%{opacity:.05;clip-path:inset(0 0 100% 0)}18%{opacity:.45;clip-path:inset(0 0 73% 0)}42%{opacity:.7;clip-path:inset(0 0 48% 0)}68%{opacity:.88;clip-path:inset(0 0 19% 0)}100%{opacity:1;clip-path:inset(0)}}
    .wg-static-band{position:fixed;left:0;right:0;z-index:2147483003;background:repeating-linear-gradient(90deg,rgba(231,228,220,.18) 0 1px,rgba(0,0,0,.38) 1px 3px,rgba(170,167,159,.12) 3px 5px),repeating-linear-gradient(0deg,transparent 0 2px,rgba(255,255,255,.12) 3px 4px);animation:wgStatic 320ms steps(7,end) both}
    @keyframes wgStatic{0%{opacity:0;transform:translateX(0)}15%{opacity:.8}35%{transform:translateX(9px)}55%{transform:translateX(-12px)}75%{transform:translateX(5px);opacity:.65}100%{opacity:0;transform:translateX(0)}}
    .wg-sync-slip body{animation:wgSyncSlip 430ms steps(5,end) both}
    @keyframes wgSyncSlip{0%,100%{transform:translateY(0)}12%{transform:translateY(14px)}28%{transform:translateY(-7px)}47%{transform:translateY(22px)}70%{transform:translateY(-3px)}88%{transform:translateY(5px)}}
    .wg-frame-drop{position:fixed;inset:0;z-index:2147483646;background:#050607;animation:wgDrop 180ms steps(4,end) both}
    @keyframes wgDrop{0%{opacity:0}16%{opacity:.96}52%{opacity:.96}65%{opacity:.18}78%{opacity:.88}100%{opacity:0}}
    .wg-brightness-pulse body{animation:wgBrightness 360ms steps(6,end) both}
    @keyframes wgBrightness{0%,100%{filter:none}16%{filter:brightness(.56) contrast(1.18)}36%{filter:brightness(.9) contrast(1.06)}55%{filter:brightness(.67) contrast(1.22)}76%{filter:brightness(1.08) contrast(1.08)}}
    .wg-frame-misalignment{animation:wgMisalign 300ms steps(4,end) both}
    @keyframes wgMisalign{0%,100%{transform:none}20%{transform:translate(var(--wg-frame-x),var(--wg-frame-y))}50%{transform:translate(var(--wg-frame-x2),var(--wg-frame-y2))}78%{transform:translate(var(--wg-frame-x),0)}}
    @media(prefers-reduced-motion:reduce){.wg-tear-clone,.wg-scanline-burst,.wg-text-ghost-a,.wg-text-ghost-b,.wg-text-jitter,.wg-corrupt-text,.wg-partial-redraw,.wg-static-band,.wg-sync-slip body,.wg-frame-drop,.wg-brightness-pulse body,.wg-frame-misalignment{animation-duration:1ms!important}}
  `;document.head.appendChild(s);
}

function installPanel(){
  if(document.getElementById(PANEL_ID))return true;
  const consoleEl=document.getElementById('console');
  if(!consoleEl)return false;
  const panel=document.createElement('section');panel.id=PANEL_ID;panel.className='panel';
  panel.innerHTML=`
    <h2>Glitch Preview</h2>
    <div class="wg-intro">WARDEN-ONLY visual test. Each button fires one effect immediately on this console. Nothing is transmitted to player-facing pages and no displayed data is changed.</div>
    <div class="wg-grid">
      <div class="wg-choice"><button class="btn" data-wg="tear">HORIZONTAL TEAR</button><div class="wg-desc">A narrow slice of the display jumps sideways and snaps back.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="scan">SCANLINE BURST</button><div class="wg-desc">A dense interference band sweeps through part of the screen.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="jitter">TEXT JITTER / GHOST</button><div class="wg-desc">One visible label briefly doubles and loses alignment.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="corrupt">CHARACTER CORRUPTION</button><div class="wg-desc">One visible text element is temporarily overprinted with damaged characters.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="redraw">PARTIAL REDRAW</button><div class="wg-desc">A console section blanks and redraws downward in stepped passes.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="static">STATIC BAND</button><div class="wg-desc">A narrow horizontal band fills with monochrome interference.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="sync">VERTICAL SYNC SLIP</button><div class="wg-desc">The full display loses vertical hold for a fraction of a second.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="dropout">FRAME DROPOUT</button><div class="wg-desc">The display briefly cuts nearly black, sputters, and returns.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="brightness">BRIGHTNESS PULSE</button><div class="wg-desc">The screen voltage appears to sag, recover, and sag once more.</div></div>
      <div class="wg-choice"><button class="btn" data-wg="misalign">FRAME MISALIGNMENT</button><div class="wg-desc">The console image shifts a few pixels off register before correcting.</div></div>
    </div>
    <div class="wg-reset-row"><button class="btn danger mini" data-wg="reset">RESET GLITCH LAYER</button></div>`;
  const metrics=consoleEl.querySelector('.metrics');
  if(metrics)metrics.insertAdjacentElement('afterend',panel);else consoleEl.insertAdjacentElement('afterbegin',panel);
  panel.addEventListener('click',e=>{const b=e.target.closest('[data-wg]');if(!b)return;const fn=EFFECTS[b.dataset.wg];if(fn)fn()});
  return true;
}

installStyles();
if(!installPanel()){
  let tries=0;const id=setInterval(()=>{tries++;if(installPanel()||tries>40)clearInterval(id)},250);
}
})();
