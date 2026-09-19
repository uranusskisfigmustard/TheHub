(() => {
'use strict';

const ORDER=['dashboard','contracts','npcs','factions','progression','session','reference','admin'];
let queued=false;

function installStyles(){
  if(document.getElementById('wardenCanonicalHeaderStyles'))return;
  const style=document.createElement('style');
  style.id='wardenCanonicalHeaderStyles';
  style.textContent=`
    .wc-workspaces{gap:8px!important;margin-top:13px!important;align-items:center!important}
    .wc-workspace-btn{padding:8px 14px!important;letter-spacing:.08em!important;line-height:1.2!important;margin:0!important}
    @media(max-width:760px){.wc-workspace-btn{padding:8px 10px!important}}
  `;
  document.head.appendChild(style);
}

function normalize(){
  installStyles();
  const nav=document.getElementById('wardenWorkspaceNav');
  if(!nav)return false;

  const buttons=ORDER.map(key=>nav.querySelector(`:scope > .wc-workspace-btn[data-workspace="${key}"]`)).filter(Boolean);
  const current=[...nav.querySelectorAll(':scope > .wc-workspace-btn')].filter(button=>ORDER.includes(button.dataset.workspace));
  const ordered=current.length===buttons.length&&buttons.every((button,index)=>current[index]===button);
  if(!ordered)buttons.forEach(button=>nav.appendChild(button));

  if(nav.dataset.canonicalHeaderWatch!=='1'){
    nav.dataset.canonicalHeaderWatch='1';
    new MutationObserver(()=>{
      if(queued)return;
      queued=true;
      queueMicrotask(()=>{queued=false;normalize()});
    }).observe(nav,{childList:true});
  }
  return true;
}

normalize();
setTimeout(normalize,0);
setTimeout(normalize,250);
setTimeout(normalize,1000);
})();
