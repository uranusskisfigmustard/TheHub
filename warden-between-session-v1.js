(() => {
'use strict';

const STATE_KEY='mothership_hub_warden_between_session_v1';
const JOBS_CACHE='mothership_hub_jobs_v5';
let scheduled=false;
const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,' ').trim();
const CLOCK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.2l3.5 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function states(){try{const x=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return{}}}
function save(x){try{localStorage.setItem(STATE_KEY,JSON.stringify(x))}catch(_){}}
function jobs(){try{const x=JSON.parse(localStorage.getItem(JOBS_CACHE)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function title(card){return String(card.querySelector('.title')?.textContent||'').trim()}
function key(card){const text=String(card.querySelector('.meta')?.textContent||'').trim();return text.split('·')[0].trim()||title(card)}
function creditAmount(value){const m=String(value||'').match(/([\d,]+(?:\.\d+)?)\s*cr/i);return m?Number(m[1].replace(/,/g,'')):0}
function rowForCard(card){
  const id=normalize(key(card)),t=normalize(title(card));
  return jobs().find(r=>id&&normalize(r?.['Job ID']||r?.jobId||r?.id)===id)||jobs().find(r=>t&&normalize(r?.Title||r?.title)===t)||null;
}
function kindForCard(card){
  const row=rowForCard(card);if(!row)return'';
  const pay=String(row?.Pay??row?.pay??'');if(!/\+\s*1\s*stress\b/i.test(pay))return'';
  const amount=creditAmount(pay);if(amount>=1500&&amount<=2500)return'medium';if(amount>0&&amount<1500)return'simple';return'between';
}
function installStyles(){
  if(document.getElementById('wardenBetweenSessionStyles'))return;
  const s=document.createElement('style');s.id='wardenBetweenSessionStyles';s.textContent=`
    .bsw-tag{display:inline-flex;align-items:center;gap:6px;border:1px solid #66879a;color:#b8d3df;background:rgba(64,91,105,.13);padding:3px 7px;margin:9px 6px 0 0;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .bsw-tag.simple{border-color:#536249;color:#bdd2aa;background:rgba(48,66,43,.16)}
    .bsw-tag.clarify{border-color:#8a611f;color:#efbd74;background:rgba(83,55,15,.14)}
    .bsw-icon{display:inline-flex;width:14px;height:14px;flex:0 0 14px}.bsw-icon svg{display:block;width:100%;height:100%}
    .bsw-note{margin-top:10px;padding:8px 9px;border-left:2px solid #66879a;color:#c5c1b4;font-size:.75rem;line-height:1.45}
    .bsw-note.simple{border-left-color:#536249}
    .bsw-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}
    .bsw-clarify{border-color:#8a611f!important}
    @media(max-width:620px){.bsw-actions>.btn{flex:1 1 100%;width:100%}.bsw-note{font-size:.72rem}}
  `;document.head.appendChild(s)
}
function iconLabel(text){return `<span class="bsw-icon">${CLOCK_ICON}</span><span>${text}</span>`}
function updateCard(card){
  const kind=kindForCard(card);if(!kind)return;
  const k=key(card),map=states(),mode=kind==='medium'&&map[k]==='clarification'?'clarification':'awaiting';
  let tag=card.querySelector('.bsw-tag');if(!tag){tag=document.createElement('span');tag.className='bsw-tag';const tags=card.querySelectorAll('.tag');const last=tags[tags.length-1];if(last)last.insertAdjacentElement('afterend',tag);else card.querySelector('.pay')?.insertAdjacentElement('afterend',tag)}
  const tagText=kind==='medium'?(mode==='clarification'?'NEEDS CLARIFICATION':'AWAITING SUMMARY'):'SIMPLE BETWEEN-SESSION';
  tag.innerHTML=iconLabel(tagText);tag.classList.toggle('clarify',mode==='clarification');tag.classList.toggle('simple',kind==='simple');
  let note=card.querySelector('.bsw-note');if(!note){note=document.createElement('div');note.className='bsw-note';const resolve=card.querySelector('[data-r]');resolve?.parentElement?.insertAdjacentElement('beforebegin',note)}
  if(note){note.classList.toggle('simple',kind==='simple');note.textContent=kind==='medium'?'BETWEEN-SESSION WORK // Review the players’ brief description of the difficulty and how they handled it before closeout.':'SIMPLE BETWEEN-SESSION WORK // Resolve outside full-session play, then use normal audited closeout.'}
  const resolve=card.querySelector('[data-r]');if(!resolve)return;resolve.textContent='COMPLETE';resolve.title=kind==='medium'?'Open audited closeout after reviewing the between-session summary.':'Open normal audited closeout for this simple between-session job.';
  const host=resolve.parentElement;if(host)host.classList.add('bsw-actions');
  let clarify=card.querySelector('[data-bsw-clarify]');
  if(kind==='medium'){
    if(!clarify){clarify=document.createElement('button');clarify.type='button';clarify.className='btn bsw-clarify';clarify.dataset.bswClarify='1';host?.appendChild(clarify);clarify.addEventListener('click',()=>{const next=states();if(next[k]==='clarification')delete next[k];else next[k]='clarification';save(next);updateCard(card)})}
    clarify.textContent=mode==='clarification'?'MARK AWAITING SUMMARY':'NEEDS CLARIFICATION';
  }else if(clarify){clarify.remove()}
  const reject=card.querySelector('[data-warden-reject]');if(reject){reject.textContent='RETURN TO BOARD';reject.title='Cancel this acceptance and return the mission to the public board.';if(host&&reject.parentElement===host&&host.lastElementChild!==reject)host.appendChild(reject)}
}
function run(){installStyles();document.querySelectorAll('#cards article.card').forEach(updateCard)}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;run()},80)}

installStyles();run();
const cards=document.getElementById('cards');if(cards)new MutationObserver(schedule).observe(cards,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('#refresh'))setTimeout(schedule,350)},true);
setTimeout(schedule,500);setTimeout(schedule,1200);
})();
