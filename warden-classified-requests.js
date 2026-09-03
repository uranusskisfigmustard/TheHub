(() => {
  'use strict';

  const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY='mothership_hub_warden_session_v1';
  const PANEL_ID='wardenClassifiedRequestsPanel';
  let installed=false, busy=false;

  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money=v=>(Number(v)||0).toLocaleString(undefined,{maximumFractionDigits:2})+'cr';

  function session(){try{return String(localStorage.getItem(SESSION_KEY)||'').trim()}catch(_){return ''}}
  function jsonp(action,p={}){return new Promise((resolve,reject)=>{const cb='__wcr'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script'),t=setTimeout(()=>done(new Error('Classified request service timed out.')),12000);function done(err,data){clearTimeout(t);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(data)}window[cb]=d=>done(null,d);sc.onerror=()=>done(new Error('Classified request service unavailable.'));sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p,_:Date.now()});document.head.appendChild(sc)})}

  function styles(){if(document.getElementById('wardenClassifiedRequestStyles'))return;const s=document.createElement('style');s.id='wardenClassifiedRequestStyles';s.textContent=`
    #${PANEL_ID} .wcr-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:12px}
    #${PANEL_ID} .wcr-card{border:1px solid #3a3f43;background:#202428;padding:13px;border-radius:4px}
    #${PANEL_ID} .wcr-title{font-weight:800;text-transform:uppercase;font-size:.96rem}
    #${PANEL_ID} .wcr-meta{color:#aaa79f;font-size:.77rem;margin-top:5px}
    #${PANEL_ID} .wcr-price{color:#d4a84b;font-weight:800;margin-top:7px}
    #${PANEL_ID} .wcr-balance{margin-top:7px;font-size:.8rem}
    #${PANEL_ID} .wcr-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
    #${PANEL_ID} .wcr-empty{color:#aaa79f;border:1px dashed #3a3f43;padding:14px}
    #${PANEL_ID} .wcr-note{margin-top:10px;color:#aaa79f;font-size:.72rem}
  `;document.head.appendChild(s)}

  function panel(){let p=document.getElementById(PANEL_ID);if(p)return p;styles();p=document.createElement('section');p.id=PANEL_ID;p.className='panel hidden';p.innerHTML=`<h2>Classified Purchase Requests</h2><div class="small" style="margin:-6px 0 12px">Approve deducts the listed price and records the item. Deny makes no financial change. Either decision keeps the listing off-market for at least six months.</div><div id="wcrResult" class="notice hidden"></div><div id="wcrCards"></div>`;const host=document.getElementById('console');const first=host?.querySelector('.metrics')?.nextSibling;if(host){const metrics=host.querySelector('.metrics');metrics?.insertAdjacentElement('afterend',p)}return p}

  function showResult(msg,kind='warn'){const el=document.getElementById('wcrResult');if(!el)return;el.textContent=msg;el.className='notice '+kind}
  function hideResult(){const el=document.getElementById('wcrResult');if(el){el.textContent='';el.className='notice hidden'}}

  function render(r){const p=panel();const cards=p.querySelector('#wcrCards');const pending=Array.isArray(r.pending)?r.pending:[];p.classList.remove('hidden');if(!pending.length){cards.innerHTML='<div class="wcr-empty">NO PENDING CLASSIFIED PURCHASE REQUESTS</div>';return}cards.innerHTML='<div class="wcr-grid">'+pending.map(x=>`<article class="wcr-card" data-request="${esc(x.requestId)}"><div class="wcr-title">${esc(x.title)}</div><div class="wcr-price">${esc(x.price)}</div><div class="wcr-meta">REQUESTED BY ${esc(x.character)}${x.campaignDate?' // '+esc(x.campaignDate):''}</div><div class="wcr-meta">${esc(x.category||'')}</div><div class="wcr-balance">PERSONAL BALANCE: <strong>${money(x.personalBalance)}</strong></div>${Number(x.personalBalance)<Number(x.numericPrice)?'<div class="wcr-note" style="color:#c86655">INSUFFICIENT CASH // add cash first or deny.</div>':''}<div class="wcr-actions"><button class="btn mini primary" data-decision="approve">APPROVE</button><button class="btn mini danger" data-decision="deny">DENY</button></div></article>`).join('')+'</div>';cards.querySelectorAll('button[data-decision]').forEach(btn=>btn.addEventListener('click',()=>resolve(btn.closest('[data-request]')?.dataset.request||'',btn.dataset.decision)))}

  async function load(){const s=session();if(!s)return;try{const r=await jsonp('wardenclassifiedrequests',{session:s});if(!r?.ok){if(String(r?.error||r?.message||'').includes('Unknown contract-service action'))return;throw new Error(r?.error||r?.message||'Could not load classified requests.')}hideResult();render(r)}catch(e){if(document.getElementById(PANEL_ID)&&!document.getElementById(PANEL_ID).classList.contains('hidden'))showResult(String(e?.message||e),'bad')}}

  async function resolve(id,decision){if(!id||busy)return;const s=session();if(!s){showResult('Warden authentication required.','bad');return}const verb=decision==='approve'?'APPROVE':'DENY';if(!confirm(verb+' this classified request?'))return;busy=true;document.querySelectorAll('#'+PANEL_ID+' button[data-decision]').forEach(b=>b.disabled=true);try{const r=await jsonp('wardenclassifiedresolve',{session:s,request:id,decision});if(!r?.ok)throw new Error(r?.error||r?.message||'Request could not be resolved.');showResult(r.message||('REQUEST '+verb+'D'),'ok');await load()}catch(e){showResult(String(e?.message||e),'bad')}finally{busy=false;document.querySelectorAll('#'+PANEL_ID+' button[data-decision]').forEach(b=>b.disabled=false)}}

  function install(){if(installed)return;installed=true;panel();const refresh=document.getElementById('refresh');refresh?.addEventListener('click',()=>setTimeout(load,150));const consoleEl=document.getElementById('console');if(consoleEl){new MutationObserver(()=>{if(!consoleEl.classList.contains('hidden'))setTimeout(load,100)}).observe(consoleEl,{attributes:true,attributeFilter:['class']})}setTimeout(load,300)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
