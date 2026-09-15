(() => {
'use strict';

const JOBS_CACHE='mothership_hub_jobs_v5';
const $=id=>document.getElementById(id);
const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,' ').trim();
let scheduled=false;

const CLOCK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.2l3.5 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function jobs(){
  try{const rows=JSON.parse(localStorage.getItem(JOBS_CACHE)||'[]');return Array.isArray(rows)?rows:[]}catch(_){return[]}
}
function payText(row){return String(row?.Pay??row?.pay??row?.basePay??'')}
function creditAmount(value){const m=String(value||'').match(/([\d,]+(?:\.\d+)?)\s*cr/i);return m?Number(m[1].replace(/,/g,'')):0}
function isBetweenSessionRow(row){return /\+\s*1\s*stress\b/i.test(payText(row))}
function betweenSessionKind(row){
  if(!row||!isBetweenSessionRow(row))return'';
  const amount=creditAmount(payText(row));
  if(amount>=1500&&amount<=2500)return'medium';
  if(amount>0&&amount<1500)return'simple';
  return'between';
}
function cardTitle(card){return String(card.querySelector('.title')?.textContent||'').trim()}
function cardJobId(card){return String(card.querySelector('[data-accept-job]')?.dataset.acceptJob||card.dataset.contractId||'').trim()}
function findJob({id='',title=''}){
  const rows=jobs(),nid=normalize(id),nt=normalize(title);
  return rows.find(r=>nid&&normalize(r?.['Job ID']||r?.jobId||r?.id)===nid)
    || rows.find(r=>nt&&normalize(r?.Title||r?.title)===nt)
    || null;
}
function rowForRecord(record){return findJob({id:record?.jobId||record?.contractId,title:record?.title})}
function kindForRecord(record){
  const row=rowForRecord(record);if(row)return betweenSessionKind(row);
  const pay=payText(record);if(!/\+\s*1\s*stress\b/i.test(pay))return'';
  const amount=creditAmount(pay);if(amount>=1500&&amount<=2500)return'medium';if(amount>0&&amount<1500)return'simple';return'between';
}
function badgeHtml(label='BETWEEN-SESSION'){return `<span class="bs-work-icon">${CLOCK_ICON}</span><span>${label}</span>`}
function mediumHelpHtml(){
  return `<details class="bs-work-help"><summary>${badgeHtml('WHAT YOU NEED TO DO')}</summary><div class="bs-work-copy"><strong>Brief completion summary required.</strong><br>Send the Warden a short description of the difficulty you encountered and how your crew handled it. A few sentences is enough. There is no required format. Mention the approach, division of work, equipment, precautions, or other decisions that mattered.<br><br>A reasonable approach may resolve the contract without further action. Risky or incomplete approaches may have additional consequences. Each participating character gains <strong>+1 Stress</strong> when the work is completed.</div></details>`;
}
function simpleHelpHtml(){
  return `<details class="bs-work-help bs-work-simple"><summary>${badgeHtml('SIMPLE BETWEEN-SESSION WORK')}</summary><div class="bs-work-copy">This is a short between-session job rather than a full-session mission. Resolve it with the Warden outside normal session play. Each participating character gains <strong>+1 Stress</strong> when the work is completed.</div></details>`;
}
function installStyles(){
  if($('betweenSessionWorkflowStyles'))return;
  const s=document.createElement('style');s.id='betweenSessionWorkflowStyles';s.textContent=`
    .bs-work-badge{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;margin-top:7px;padding:4px 7px;border:1px solid #66879a;border-radius:3px;background:rgba(64,91,105,.13);color:#b8d3df;font-size:.66rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .bs-work-badge.simple{border-color:#536249;color:#bdd2aa;background:rgba(48,66,43,.16)}
    .bs-work-icon{display:inline-flex;width:14px;height:14px;flex:0 0 14px;vertical-align:-2px}.bs-work-icon svg{display:block;width:100%;height:100%}
    .bs-work-help{margin-top:10px;padding-top:9px;border-top:1px solid #303538}
    .bs-work-help>summary{display:flex;align-items:center;gap:6px;cursor:pointer;color:#b8d3df;font-weight:800;letter-spacing:.05em;text-transform:uppercase;font-size:.76rem}
    .bs-work-simple>summary{color:#bdd2aa}
    .bs-work-copy{margin-top:9px;padding:10px 11px;border:1px solid #3d4f58;background:rgba(33,47,54,.24);color:#d5d0c4;font-size:.82rem;line-height:1.5}
    .bs-log-state{display:inline-flex;align-items:center;gap:6px;margin:0 0 10px 7px;padding:3px 7px;border:1px solid #66879a;border-radius:3px;color:#b8d3df;background:rgba(64,91,105,.13);font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .bs-log-state.simple{border-color:#536249;color:#bdd2aa;background:rgba(48,66,43,.16)}
    @media(max-width:620px){.bs-work-copy{font-size:.8rem;padding:9px}.bs-work-help>summary{font-size:.72rem}.bs-log-state{display:flex;width:max-content;max-width:100%;margin:0 0 10px}}
  `;document.head.appendChild(s)
}
function enhanceBoard(){
  if(!jobs().length)return;
  document.querySelectorAll('#cards article.card:not(.classified-card)').forEach(card=>{
    const row=findJob({id:cardJobId(card),title:cardTitle(card)});const kind=betweenSessionKind(row);if(!kind)return;
    if(!card.querySelector('.bs-work-badge')){
      const badge=document.createElement('div');badge.className='bs-work-badge'+(kind==='simple'?' simple':'');badge.innerHTML=badgeHtml('BETWEEN-SESSION');
      const pay=card.querySelector('.pay');if(pay)pay.insertAdjacentElement('afterend',badge);else card.prepend(badge);
    }
    if(!card.querySelector('.bs-work-help')){
      const anchor=card.querySelector('.summary')||card.querySelector('.player-card-meta')||card.querySelector('.qual-box')||card.querySelector('.pay');
      const html=kind==='medium'?mediumHelpHtml():simpleHelpHtml();
      if(anchor)anchor.insertAdjacentHTML('afterend',html);else card.insertAdjacentHTML('beforeend',html);
    }
  });
}
function contractRecords(){const state=window.__hubPlayerShell?.getContractState?.();return Array.isArray(state?.contracts?.active)?state.contracts.active:[]}
function enhanceLogs(){
  const records=contractRecords(),cards=[...document.querySelectorAll('#active article.card.active')];
  cards.forEach((card,i)=>{
    const title=cardTitle(card),id=String(card.dataset.contractId||'').trim();
    const r=records.find(x=>id&&String(x?.contractId||x?.jobId||'').trim()===id)||records[i]||records.find(x=>normalize(x?.title)===normalize(title));
    const kind=kindForRecord(r);if(!r||!kind)return;
    if(!card.querySelector('.bs-log-state')){
      const state=document.createElement('span');state.className='bs-log-state'+(kind==='simple'?' simple':'');state.innerHTML=badgeHtml(kind==='medium'?'AWAITING SUMMARY':'BETWEEN-SESSION // SIMPLE');
      const status=card.querySelector('.status');if(status)status.insertAdjacentElement('afterend',state);else card.prepend(state);
    }
    if(!card.querySelector('.bs-work-help')){
      const meta=card.querySelector('.meta'),html=kind==='medium'?mediumHelpHtml():simpleHelpHtml();
      if(meta)meta.insertAdjacentHTML('afterend',html);else card.insertAdjacentHTML('beforeend',html);
    }
  });
}
function run(){installStyles();const path=location.pathname.toLowerCase();if(path.endsWith('/contracts.html'))enhanceLogs();else enhanceBoard()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;run()},80)}

installStyles();run();
const cards=$('cards');if(cards)new MutationObserver(schedule).observe(cards,{childList:true});
const active=$('active');if(active)new MutationObserver(schedule).observe(active,{childList:true});
window.addEventListener('hub-player-contracts-updated',schedule);
window.addEventListener('storage',e=>{if(e.key===JOBS_CACHE)schedule()});
setTimeout(schedule,500);setTimeout(schedule,1400);
})();
