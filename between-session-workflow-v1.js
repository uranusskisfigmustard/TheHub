(() => {
'use strict';

const JOBS_CACHE='mothership_hub_jobs_v5';
const $=id=>document.getElementById(id);
const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,' ').trim();
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let scheduled=false;

function jobs(){
  try{const rows=JSON.parse(localStorage.getItem(JOBS_CACHE)||'[]');return Array.isArray(rows)?rows:[]}catch(_){return[]}
}
function isShortSkilled(row){return normalize(row?.['Work Type']||row?.workType)==='short skilled contract'}
function cardTitle(card){return String(card.querySelector('.title')?.textContent||'').trim()}
function cardJobId(card){return String(card.querySelector('[data-accept-job]')?.dataset.acceptJob||card.dataset.contractId||'').trim()}
function findJob({id='',title=''}){
  const rows=jobs(),nid=normalize(id),nt=normalize(title);
  return rows.find(r=>nid&&normalize(r?.['Job ID']||r?.jobId||r?.id)===nid)
    || rows.find(r=>nt&&normalize(r?.Title||r?.title)===nt)
    || null;
}
function isMediumRecord(record){
  const row=findJob({id:record?.jobId||record?.contractId,title:record?.title});
  if(row)return isShortSkilled(row);
  const type=normalize(record?.workType||record?.['Work Type']);
  if(type)return type==='short skilled contract';
  const pay=String(record?.basePay||record?.pay||record?.Pay||'');
  const m=pay.match(/([\d,]+(?:\.\d+)?)\s*cr/i);const amount=m?Number(m[1].replace(/,/g,'')):0;
  return amount>=1500&&amount<=2500&&/stress/i.test(pay);
}
function helpHtml(){
  return `<details class="bs-work-help"><summary>BETWEEN-SESSION COMPLETION</summary><div class="bs-work-copy"><strong>Brief completion summary required.</strong><br>Send the Warden a short description of the difficulty you encountered and how your crew handled it. A few sentences is enough. There is no required format. Mention the approach, division of work, equipment, precautions, or other decisions that mattered.<br><br>A reasonable approach may resolve the contract without further action. Risky or incomplete approaches may have additional consequences. Each participating character gains <strong>+1 Stress</strong> when the work is completed.</div></details>`;
}
function installStyles(){
  if($('betweenSessionWorkflowStyles'))return;
  const s=document.createElement('style');s.id='betweenSessionWorkflowStyles';s.textContent=`
    .bs-work-badge{display:inline-block;margin-top:7px;padding:3px 7px;border:1px solid #66879a;border-radius:3px;background:rgba(64,91,105,.13);color:#b8d3df;font-size:.66rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .bs-work-help{margin-top:10px;padding-top:9px;border-top:1px solid #303538}
    .bs-work-help>summary{cursor:pointer;color:#b8d3df;font-weight:800;letter-spacing:.05em;text-transform:uppercase;font-size:.76rem}
    .bs-work-copy{margin-top:9px;padding:10px 11px;border:1px solid #3d4f58;background:rgba(33,47,54,.24);color:#d5d0c4;font-size:.82rem;line-height:1.5}
    .bs-log-state{display:inline-block;margin:0 0 10px 7px;padding:3px 7px;border:1px solid #66879a;border-radius:3px;color:#b8d3df;background:rgba(64,91,105,.13);font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    @media(max-width:620px){.bs-work-copy{font-size:.8rem;padding:9px}.bs-work-help>summary{font-size:.72rem}.bs-log-state{display:block;width:max-content;max-width:100%;margin:0 0 10px}}
  `;document.head.appendChild(s)
}
function enhanceBoard(){
  const rows=jobs();if(!rows.length)return;
  document.querySelectorAll('#cards article.card:not(.classified-card)').forEach(card=>{
    const row=findJob({id:cardJobId(card),title:cardTitle(card)});if(!row||!isShortSkilled(row))return;
    if(!card.querySelector('.bs-work-badge')){
      const badge=document.createElement('div');badge.className='bs-work-badge';badge.textContent='BETWEEN-SESSION';
      const pay=card.querySelector('.pay');if(pay)pay.insertAdjacentElement('afterend',badge);else card.prepend(badge);
    }
    if(!card.querySelector('.bs-work-help')){
      const anchor=card.querySelector('.summary')||card.querySelector('.player-card-meta')||card.querySelector('.qual-box')||card.querySelector('.pay');
      if(anchor)anchor.insertAdjacentHTML('afterend',helpHtml());else card.insertAdjacentHTML('beforeend',helpHtml());
    }
  });
}
function contractRecords(){const state=window.__hubPlayerShell?.getContractState?.();return Array.isArray(state?.contracts?.active)?state.contracts.active:[]}
function enhanceLogs(){
  const records=contractRecords(),cards=[...document.querySelectorAll('#active article.card.active')];
  cards.forEach((card,i)=>{
    const title=cardTitle(card);const id=String(card.dataset.contractId||'').trim();
    const r=records.find(x=>id&&String(x?.contractId||x?.jobId||'').trim()===id)||records[i]||records.find(x=>normalize(x?.title)===normalize(title));
    if(!r||!isMediumRecord(r))return;
    if(!card.querySelector('.bs-log-state')){
      const state=document.createElement('span');state.className='bs-log-state';state.textContent='AWAITING SUMMARY';
      const status=card.querySelector('.status');if(status)status.insertAdjacentElement('afterend',state);else card.prepend(state);
    }
    if(!card.querySelector('.bs-work-help')){
      const meta=card.querySelector('.meta');if(meta)meta.insertAdjacentHTML('afterend',helpHtml());else card.insertAdjacentHTML('beforeend',helpHtml());
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
