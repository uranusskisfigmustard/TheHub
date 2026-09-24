(() => {
'use strict';
const $=id=>document.getElementById(id);
function ensureStatus(){
  const detail=$('npcDetail');
  if(!detail)return null;
  let el=detail.querySelector('.npcportrait-render-status');
  if(!el){
    el=document.createElement('div');
    el.className='npcportrait-render-status';
    el.style.cssText='margin-top:5px;color:var(--muted);font-size:.7rem;letter-spacing:.02em';
    const meta=detail.querySelector('.meta');
    if(meta)meta.insertAdjacentElement('afterend',el);else detail.prepend(el);
  }
  return el;
}
function inspect(){
  const detail=$('npcDetail');
  if(!detail)return;
  const img=detail.querySelector('img.npcportrait');
  const status=ensureStatus();
  if(!img){if(status)status.textContent='PORTRAIT RENDER GUARD: NO IMAGE ELEMENT';return}
  const wrap=img.closest('.npcportrait-wrap');
  if(wrap){
    wrap.style.setProperty('display','flex','important');
    wrap.style.setProperty('align-items','flex-start','important');
    wrap.style.setProperty('justify-content','flex-start','important');
    wrap.style.setProperty('min-height','1px','important');
    wrap.style.setProperty('overflow','visible','important');
  }
  img.style.setProperty('display','block','important');
  img.style.setProperty('visibility','visible','important');
  img.style.setProperty('opacity','1','important');
  img.style.setProperty('filter','none','important');
  img.style.setProperty('transform','none','important');
  img.style.setProperty('position','relative','important');
  img.style.setProperty('z-index','1','important');
  img.style.setProperty('width','240px','important');
  img.style.setProperty('max-width','100%','important');
  img.style.setProperty('height','auto','important');
  img.style.setProperty('max-height','340px','important');
  img.style.setProperty('object-fit','contain','important');
  if(!status)return;
  const report=()=>{
    if(img.complete&&img.naturalWidth>0){status.textContent=`PORTRAIT RENDER: DECODED ${img.naturalWidth}×${img.naturalHeight}`;status.style.color='var(--ok)'}
    else if(img.complete){status.textContent='PORTRAIT RENDER: IMAGE COMPLETE WITH ZERO PIXELS';status.style.color='var(--danger)'}
    else{status.textContent='PORTRAIT RENDER: IMAGE ELEMENT PRESENT / WAITING FOR PIXELS';status.style.color='var(--muted)'}
  };
  report();
  img.addEventListener('load',report,{once:true});
  img.addEventListener('error',()=>{status.textContent='PORTRAIT RENDER: BROWSER IMAGE ERROR';status.style.color='var(--danger)'},{once:true});
  setTimeout(report,1500);
}
const attach=()=>{const d=$('npcDetail');if(!d){setTimeout(attach,300);return}new MutationObserver(()=>setTimeout(inspect,20)).observe(d,{childList:true,subtree:true,attributes:true});inspect()};
attach();
})();
