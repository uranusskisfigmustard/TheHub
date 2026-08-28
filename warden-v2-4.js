(() => {
'use strict';
const ROOT='assets/npc-portraits/';
const EXTS=['png','jpg','jpeg'];
const $=id=>document.getElementById(id);
const resolved=new Map(); // key -> URL or null
const pending=new Map();  // key -> Promise
let scheduled=null,lastRenderedKey='';
function slug(name){return String(name||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')}
function installStyles(){if($('npcPortraitStyles'))return;const s=document.createElement('style');s.id='npcPortraitStyles';s.textContent=`.npcportrait-wrap{margin:12px 0;display:flex;justify-content:flex-start}.npcportrait{display:block;max-width:min(240px,100%);max-height:340px;width:auto;height:auto;object-fit:contain;border:1px solid var(--line);background:#0d0f10}`;document.head.appendChild(s)}
function probe(url){return new Promise(resolve=>{const img=new Image();img.onload=()=>resolve(true);img.onerror=()=>resolve(false);img.src=url})}
function resolvePortrait(key){if(resolved.has(key))return Promise.resolve(resolved.get(key));if(pending.has(key))return pending.get(key);const p=(async()=>{for(const ext of EXTS){const url=ROOT+key+'.'+ext;if(await probe(url)){resolved.set(key,url);pending.delete(key);return url}}resolved.set(key,null);pending.delete(key);return null})();pending.set(key,p);return p}
function clearExisting(detail){detail?.querySelector('.npcportrait-wrap')?.remove()}
async function render(){const detail=$('npcDetail');if(!detail)return;const title=detail.querySelector('.title');if(!title){lastRenderedKey='';clearExisting(detail);return}const name=title.textContent.trim();if(!name)return;const key=slug(name);const existing=detail.querySelector('.npcportrait-wrap');if(existing?.dataset?.portraitKey===key){lastRenderedKey=key;return}if(key!==lastRenderedKey)clearExisting(detail);lastRenderedKey=key;const url=await resolvePortrait(key);const currentTitle=$('npcDetail')?.querySelector('.title')?.textContent.trim()||'';if(slug(currentTitle)!==key)return;if(!url){clearExisting($('npcDetail'));return}const current=$('npcDetail');if(!current||current.querySelector(`.npcportrait-wrap[data-portrait-key="${CSS.escape(key)}"]`))return;const wrap=document.createElement('div');wrap.className='npcportrait-wrap';wrap.dataset.portraitKey=key;const img=document.createElement('img');img.className='npcportrait';img.alt=name+' portrait';img.decoding='async';img.src=url;wrap.appendChild(img);const facts=current.querySelector('.npcfacts');if(facts)current.insertBefore(wrap,facts);else current.appendChild(wrap)}
function schedule(){clearTimeout(scheduled);scheduled=setTimeout(render,60)}
installStyles();
const detail=$('npcDetail');if(detail){const o=new MutationObserver(muts=>{if(muts.some(m=>[...m.addedNodes,...m.removedNodes].some(n=>!(n instanceof Element)||!n.closest?.('.npcportrait-wrap'))))schedule()});o.observe(detail,{childList:true,subtree:true})}
document.addEventListener('click',e=>{if(e.target.closest('[data-npc],#refresh'))setTimeout(render,80)},true);
setTimeout(render,1200);
})();
