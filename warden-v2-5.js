(() => {
'use strict';
const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SK='mothership_hub_warden_session_v1';
const $=id=>document.getElementById(id);
const cache=new Map();
let requestSeq=0,observer=null,attachTimer=null;
function session(){return localStorage.getItem(SK)||''}
function jsonp(action,p={}){return new Promise((resolve,reject)=>{const cb='__wnp25'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script'),timer=setTimeout(()=>done(new Error('NPC portrait request timed out.')),30000);function done(err,d){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(d)}window[cb]=d=>done(null,d);sc.onerror=()=>done(new Error('Could not reach Warden portrait service.'));sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p});document.head.appendChild(sc)})}
function installStyles(){if($('npcPortraitStyles'))return;const s=document.createElement('style');s.id='npcPortraitStyles';s.textContent=`.npcportrait-wrap{margin:12px 0;display:flex;justify-content:flex-start}.npcportrait{display:block;max-width:min(240px,100%);max-height:340px;width:auto;height:auto;object-fit:contain;border:1px solid var(--line);background:#0d0f10}`;document.head.appendChild(s)}
function selected(){const d=$('npcDetail'),t=d?.querySelector('.title');const name=t?.textContent?.trim()||'';return{name,detail:d}}
function insertPortrait(name,dataUri){const s=selected();if(!s.detail||s.name!==name||!dataUri)return;let wrap=s.detail.querySelector('.npcportrait-wrap');if(wrap&&wrap.dataset.npcName===name)return;if(wrap)wrap.remove();wrap=document.createElement('div');wrap.className='npcportrait-wrap';wrap.dataset.npcName=name;const img=document.createElement('img');img.className='npcportrait';img.alt=name+' portrait';img.src=dataUri;wrap.appendChild(img);const facts=s.detail.querySelector('.npcfacts');if(facts)s.detail.insertBefore(wrap,facts);else s.detail.appendChild(wrap)}
async function loadPortrait(){const s=selected();if(!s.detail||!s.name||!session())return;const existing=s.detail.querySelector('.npcportrait-wrap');if(existing?.dataset.npcName===s.name)return;if(existing)existing.remove();if(cache.has(s.name)){const uri=cache.get(s.name);if(uri)insertPortrait(s.name,uri);return}const seq=++requestSeq,name=s.name;try{const r=await jsonp('wardennpcportrait',{session:session(),name});if(seq!==requestSeq)return;if(!r?.ok){cache.set(name,null);return}const uri=r.found&&r.dataUri?String(r.dataUri):null;cache.set(name,uri);if(uri)insertPortrait(name,uri)}catch(_){if(seq===requestSeq)cache.set(name,null)}}
function attachObserver(){const detail=$('npcDetail');if(!detail){clearTimeout(attachTimer);attachTimer=setTimeout(attachObserver,300);return}if(observer)return;observer=new MutationObserver(()=>setTimeout(loadPortrait,35));observer.observe(detail,{childList:true,subtree:true});loadPortrait()}
function clear(){requestSeq++;cache.clear();const wrap=$('npcDetail')?.querySelector('.npcportrait-wrap');if(wrap)wrap.remove()}
installStyles();attachObserver();
document.addEventListener('click',e=>{if(e.target.closest('[data-npc],#refresh,#openSessionClose'))setTimeout(loadPortrait,120);if(e.target.closest('#lock,#playerPage'))clear()},true);
})();