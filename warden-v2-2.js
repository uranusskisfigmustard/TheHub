(() => {
'use strict';
const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SK='mothership_hub_warden_session_v1';
let feed=null,loading=false,scheduled=null;
const $=id=>document.getElementById(id);
function session(){return localStorage.getItem(SK)||''}
function atleast(v,t){const a=String(v||'0').split('.').map(Number),b=String(t||'0').split('.').map(Number);for(let i=0;i<Math.max(a.length,b.length);i++){if((a[i]||0)>(b[i]||0))return true;if((a[i]||0)<(b[i]||0))return false}return true}
function jsonp(action,p={}){return new Promise((resolve,reject)=>{const cb='__wv22'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script'),timer=setTimeout(()=>done(new Error('Warden service timed out.')),30000);function done(err,d){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(d)}window[cb]=d=>done(null,d);sc.onerror=()=>done(new Error('Could not reach Warden service.'));sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p});document.head.appendChild(sc)})}
function label(x){return x.organizationForm?`${x.classification} · ${x.organizationForm}`:x.classification}
function byCanonical(name){return(feed?.factions||[]).find(x=>x.canonicalName===name)||null}
function setText(el,value){if(el&&el.textContent!==value)el.textContent=value}
function annotate(){if(!feed||!atleast(feed.serviceVersion,'7.5'))return;
  document.querySelectorAll('#facList .facitem').forEach(item=>{const title=item.querySelector('strong');if(!title)return;const x=byCanonical(title.textContent.trim());if(!x)return;setText(item.querySelector('.small'),label(x))});
  const detail=$('facDetail'),title=detail?.querySelector('.title'),meta=detail?.querySelector('.meta');if(title&&meta){const x=byCanonical(title.textContent.trim());if(x)setText(meta,label(x))}
  const status=$('facStatus');if(status){const factions=feed.factions||[],maj=factions.filter(x=>x.classification==='MAJOR FACTION').length,inst=factions.length-maj,formal=factions.filter(x=>x.organizationForm==='FORMAL').length,informal=factions.filter(x=>x.organizationForm==='INFORMAL').length;setText(status,`BACKEND ${feed.serviceVersion} // WARDEN ${feed.wardenVersion} // ${maj} major factions // ${inst} institutions // ${formal} formal // ${informal} informal`)}
}
function scheduleAnnotate(){clearTimeout(scheduled);scheduled=setTimeout(annotate,40)}
async function load(){if(loading||!session()||!$('factionManager'))return;loading=true;try{const r=await jsonp('wardenfactionfeed',{session:session()});if(r?.ok){feed=r;annotate()}}catch(_){/* base v2.1 owns error display */}finally{loading=false}}
function watch(){document.addEventListener('click',e=>{if(e.target.closest('#refresh'))setTimeout(load,500);if(e.target.closest('#lock,#playerPage'))feed=null},true);const o=new MutationObserver(scheduleAnnotate);o.observe(document.body,{childList:true,subtree:true});const c=new MutationObserver(()=>{if(!$('console')?.classList.contains('hidden')&&session())setTimeout(load,450)});if($('console'))c.observe($('console'),{attributes:true,attributeFilter:['class']})}
watch();setTimeout(load,1400);
})();
