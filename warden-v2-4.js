(() => {
'use strict';
const ROOT='assets/npc-portraits/';
const EXTS=['png','jpg','jpeg'];
const $=id=>document.getElementById(id);
let scheduled=null;
function slug(name){return String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function installStyles(){if($('npcPortraitStyles'))return;const s=document.createElement('style');s.id='npcPortraitStyles';s.textContent=`.npcportrait-wrap{margin:12px 0;display:flex;justify-content:flex-start}.npcportrait{display:block;max-width:min(240px,100%);max-height:340px;width:auto;height:auto;object-fit:contain;border:1px solid var(--line);background:#0d0f10}`;document.head.appendChild(s)}
function render(){const detail=$('npcDetail');if(!detail)return;const title=detail.querySelector('.title');if(!title)return;const name=title.textContent.trim();if(!name)return;const key=slug(name);let wrap=detail.querySelector('.npcportrait-wrap');if(wrap?.dataset?.portraitKey===key)return;if(wrap)wrap.remove();wrap=document.createElement('div');wrap.className='npcportrait-wrap';wrap.dataset.portraitKey=key;const img=document.createElement('img');img.className='npcportrait';img.alt=name+' portrait';img.loading='lazy';let i=0;img.onerror=()=>{i++;if(i<EXTS.length){img.src=ROOT+key+'.'+EXTS[i]}else{wrap.remove()}};img.src=ROOT+key+'.'+EXTS[i];const facts=detail.querySelector('.npcfacts');wrap.appendChild(img);if(facts)detail.insertBefore(wrap,facts);else detail.appendChild(wrap)}
function schedule(){clearTimeout(scheduled);scheduled=setTimeout(render,35)}
installStyles();
const o=new MutationObserver(schedule);o.observe(document.body,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('[data-npc],#refresh'))setTimeout(render,100)},true);
setTimeout(render,1200);
})();
