(() => {
'use strict';

const $=id=>document.getElementById(id);
const STATE={contracts:null,cached:false,cacheTime:0,scheduled:false};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function credits(v){const n=Number(v||0);return n.toLocaleString('en-US',{minimumFractionDigits:n%1?2:0,maximumFractionDigits:2})+'cr'}
function normalize(v){return String(v??'').toLowerCase().replace(/\s+/g,' ').trim()}

function installStyles(){
  if($('playerLogsV1Styles'))return;
  const s=document.createElement('style');s.id='playerLogsV1Styles';s.textContent=`
    #active .card.active details.player-current-brief{margin:9px 0 12px;padding:10px;border:1px solid #536249;background:rgba(37,49,34,.24)}
    #active .card.active details.player-current-brief>summary{color:#bdd2aa}
    .player-log-target{outline:2px solid #d4a84b;outline-offset:3px;box-shadow:0 0 0 1px rgba(212,168,75,.2),0 10px 24px rgba(0,0,0,.24)!important}
    .player-log-cached{margin:0 0 14px;padding:9px 11px;border:1px solid #8a611f;background:rgba(83,55,15,.15);color:#efbd74;font-size:.72rem;letter-spacing:.04em}
  `;document.head.appendChild(s)
}

function meta(record){const rows=[];if(record.employer)rows.push(['Employer / Source',record.employer]);if(record.location)rows.push(['Location',record.location]);if(record.participants?.length)rows.push(['Participants',record.participants.join(', ')]);if(record.acceptedDate)rows.push(['Accepted',record.acceptedDate]);return rows.map(([k,v])=>`<div class="label">${esc(k)}</div><div class="value">${esc(v)}</div>`).join('')}
function renderCached(data){
  if(!STATE.cached||!data)return;const status=$('status');const activeEl=$('active'),historyEl=$('history');if(!activeEl||!historyEl)return;
  const baseFailed=/UNAVAILABLE/i.test(String(status?.textContent||''))||Boolean(activeEl.querySelector('.error'));if(!baseFailed)return;
  const active=Array.isArray(data.active)?data.active:[],history=Array.isArray(data.history)?data.history:[];
  if($('activeCount'))$('activeCount').textContent=active.length+' ACTIVE';if($('historyCount'))$('historyCount').textContent=history.length+' RECORDED';if($('total'))$('total').textContent=(active.length+history.length)+' CACHED RECORDS';
  activeEl.innerHTML=active.length?active.map(r=>`<article class="card active"><div class="title">${esc(r.title)}</div><div class="status">ACTIVE</div><div class="meta">${meta(r)}</div>${r.brief?.text?`<details><summary>View Mission Briefing</summary><pre class="brief">${esc(r.brief.text)}</pre></details>`:''}</article>`).join(''):'<div class="empty">NO ACTIVE CONTRACTS IN CACHED RECORD.</div>';
  historyEl.innerHTML=history.length?history.map(r=>{const cls=String(r.status||'').toLowerCase();return`<article class="card ${esc(cls)}"><div class="title">${esc(r.title)}</div><div class="status">${esc(r.status)}</div><div class="meta">${r.closedDate?`<div class="label">Closed</div><div class="value">${esc(r.closedDate)}</div>`:''}${r.participants?.length?`<div class="label">Participants</div><div class="value">${esc(r.participants.join(', '))}</div>`:''}</div><div class="payout">TOTAL PAYOUT // ${credits(r.totalPayout)}</div>${r.closeoutSummary?`<div class="summary">${esc(r.closeoutSummary)}</div>`:''}</article>`}).join(''):'<div class="empty">NO CLOSED CONTRACTS IN CACHED RECORD.</div>';
  if(status)status.textContent='CACHED / STALE // Contract record last known';
  let notice=$('playerLogCachedNotice');if(!notice){notice=document.createElement('div');notice.id='playerLogCachedNotice';notice.className='player-log-cached';document.querySelector('main')?.prepend(notice)}
  const when=STATE.cacheTime?new Date(STATE.cacheTime).toLocaleString():'previous session';notice.textContent='CACHED // CONTRACT LOG LAST VERIFIED '+when;
}

function annotateActive(){
  const records=Array.isArray(STATE.contracts?.active)?STATE.contracts.active:[];const cards=[...document.querySelectorAll('#active article.card.active')];
  cards.forEach((card,i)=>{const r=records[i]||records.find(x=>normalize(x?.title)===normalize(card.querySelector('.title')?.textContent));if(!r)return;card.dataset.contractId=String(r.contractId||r.jobId||'');const details=card.querySelector('details');const metaEl=card.querySelector('.meta');if(details){details.classList.add('player-current-brief');if(metaEl&&details.nextElementSibling!==metaEl)card.insertBefore(details,metaEl);if(records.length===1)details.open=true}})
}
function targetId(){const raw=String(location.hash||'');const m=raw.match(/^#contract=(.+)$/i);if(!m)return'';try{return decodeURIComponent(m[1])}catch(_){return m[1]}}
function highlightTarget(){
  const id=targetId();if(!id)return;let card=[...document.querySelectorAll('#active article.card.active')].find(c=>String(c.dataset.contractId||'')===id);
  if(!card){const r=(STATE.contracts?.active||[]).find(x=>String(x.contractId||x.jobId||'')===id);if(r)card=[...document.querySelectorAll('#active article.card.active')].find(c=>normalize(c.querySelector('.title')?.textContent)===normalize(r.title))}
  if(!card)return;card.querySelector('details')?.setAttribute('open','');card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('player-log-target');setTimeout(()=>card.classList.remove('player-log-target'),1600)
}
function enhance(){renderCached(STATE.contracts);annotateActive();highlightTarget()}
function schedule(){if(STATE.scheduled)return;STATE.scheduled=true;setTimeout(()=>{STATE.scheduled=false;enhance()},70)}
function applyState(detail){STATE.contracts=detail?.contracts||null;STATE.cached=Boolean(detail?.cached);STATE.cacheTime=Number(detail?.cacheTime||0);schedule()}

installStyles();
window.addEventListener('hub-player-contracts-updated',e=>applyState(e.detail||{}));
const initial=window.__hubPlayerShell?.getContractState?.();if(initial?.checked)applyState(initial);
const active=$('active'),history=$('history');if(active)new MutationObserver(schedule).observe(active,{childList:true});if(history)new MutationObserver(schedule).observe(history,{childList:true});
window.addEventListener('hashchange',()=>setTimeout(highlightTarget,30));
setTimeout(()=>{const s=window.__hubPlayerShell?.getContractState?.();if(s?.checked)applyState(s);else schedule()},700);
})();