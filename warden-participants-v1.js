(() => {
'use strict';

let scheduled=false;

function installStyles(){
  if(document.getElementById('wardenParticipantStyles'))return;
  const s=document.createElement('style');
  s.id='wardenParticipantStyles';
  s.textContent=`
    .warden-selected-crew{margin-top:10px;padding:9px 10px;border:1px solid #394239;background:rgba(37,49,34,.22)}
    .warden-selected-crew-label{color:#aaa79f;font-size:.66rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-bottom:6px}
    .warden-selected-crew-list{display:flex;gap:6px;flex-wrap:wrap}
    .warden-selected-crew-chip{display:inline-flex;align-items:center;padding:4px 7px;border:1px solid #66805b;border-radius:3px;background:rgba(48,66,43,.18);color:#dce8d2;font-size:.75rem;font-weight:800;letter-spacing:.035em}
    .warden-selected-crew-empty{color:#8f8c84;font-size:.75rem}
    @media(max-width:620px){.warden-selected-crew{padding:8px}.warden-selected-crew-chip{flex:1 1 auto;justify-content:center;min-width:0}}
  `;
  document.head.appendChild(s);
}

function participantsFromCard(card){
  const metas=[...card.querySelectorAll('.meta')];
  const line=metas.find(x=>/^participants\s*:/i.test(String(x.textContent||'').trim()));
  if(!line)return[];
  return String(line.textContent||'')
    .replace(/^participants\s*:\s*/i,'')
    .split(',')
    .map(x=>x.trim())
    .filter(Boolean);
}

function decorate(card){
  const participants=participantsFromCard(card);
  let box=card.querySelector('.warden-selected-crew');
  if(!box){
    box=document.createElement('div');
    box.className='warden-selected-crew';
    const metas=[...card.querySelectorAll('.meta')];
    const participantMeta=metas.find(x=>/^participants\s*:/i.test(String(x.textContent||'').trim()));
    const anchor=participantMeta||metas[metas.length-1]||card.querySelector('.title');
    if(anchor)anchor.insertAdjacentElement('afterend',box);else card.prepend(box);
  }
  const signature=participants.join('|');
  if(box.dataset.participants===signature)return;
  box.dataset.participants=signature;
  box.innerHTML='<div class="warden-selected-crew-label">SELECTED CREW</div>'+
    (participants.length
      ? '<div class="warden-selected-crew-list">'+participants.map(name=>`<span class="warden-selected-crew-chip"></span>`).join('')+'</div>'
      : '<div class="warden-selected-crew-empty">No participating character recorded.</div>');
  [...box.querySelectorAll('.warden-selected-crew-chip')].forEach((chip,i)=>{chip.textContent=participants[i]||''});
}

function run(){
  installStyles();
  document.querySelectorAll('#cards article.card').forEach(decorate);
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;run()},60)}

installStyles();run();
const cards=document.getElementById('cards');
if(cards)new MutationObserver(schedule).observe(cards,{childList:true,subtree:true});
document.addEventListener('click',e=>{if(e.target.closest('#refresh'))setTimeout(schedule,350)},true);
setTimeout(schedule,450);
setTimeout(schedule,1200);
})();
