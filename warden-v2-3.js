(() => {
'use strict';
const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SESSION_KEY='mothership_hub_warden_session_v1';
const $=id=>document.getElementById(id);
let checking=false;
function session(){return localStorage.getItem(SESSION_KEY)||''}
function jsonp(action,params={}){return new Promise((resolve,reject)=>{const cb='__wscv23'+Date.now()+Math.random().toString(36).slice(2),script=document.createElement('script'),timer=setTimeout(()=>done(new Error('Version check timed out.')),15000);function done(err,data){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}script.remove();err?reject(err):resolve(data)}window[cb]=data=>done(null,data);script.onerror=()=>done(new Error('Could not reach Warden service.'));script.src=API+'?'+new URLSearchParams({action,callback:cb,...params});document.head.appendChild(script)})}
function setStatus(text){const el=$('sessionCloseVersion');if(el)el.textContent=text}
async function check(){if(checking)return;const token=session();if(!$('sessionCloseVersion'))return;if(!token){setStatus('Unlock Warden Console to verify Session Close backend.');return}checking=true;try{const r=await jsonp('wardenversion',{session:token});if(!r?.ok)throw new Error(r?.error||'Version check failed.');setStatus(`BACKEND ${r.serviceVersion||'?'} // WARDEN ${r.wardenVersion||'?'} // SESSION CLOSE READY`)}catch(e){setStatus('SESSION CLOSE VERSION CHECK UNAVAILABLE')}finally{checking=false}}
function watch(){document.addEventListener('click',e=>{if(e.target.closest('#refresh'))setTimeout(check,450);if(e.target.closest('#openSessionClose'))setTimeout(check,250);if(e.target.closest('#lock,#playerPage'))setTimeout(check,50)},true);const consoleEl=$('console');if(consoleEl)new MutationObserver(()=>{if(!consoleEl.classList.contains('hidden'))setTimeout(check,350);else setStatus('Unlock Warden Console to verify Session Close backend.')}).observe(consoleEl,{attributes:true,attributeFilter:['class']})}
watch();setTimeout(check,1200);
})();