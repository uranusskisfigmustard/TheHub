(() => {
'use strict';
const $=id=>document.getElementById(id);
let scheduled=false;
function ensureCount(){const row=document.querySelector('#playerLocalControls .player-local-row');if(!row||$('playerLocalCount'))return;const s=document.createElement('span');s.id='playerLocalCount';s.className='player-local-label';row.appendChild(s)}
function updateExplanation(card){if(card.classList.contains('classified-card'))return;const ready=card.classList.contains('crew-ready')||Boolean(card.querySelector('.qual-box.state-met'));const blocked=Boolean(card.querySelector('.qual-box.state-blocked'));let el=card.querySelector('.player-qual-explain');if(!el)return;el.className='player-qual-explain '+(ready?'ready':blocked?'blocked':'action');el.textContent=ready?'READY — CREW MEETS POSTED QUALIFICATION':blocked?'BLOCKED — REQUIRED REGULATED AUTHORIZATION NOT HELD':'ACTION — POSTED QUALIFICATION REQUIRES ATTENTION'}
function updateCount(){ensureCount();const cards=[...document.querySelectorAll('#cards article.card')];const shown=cards.filter(c=>!c.classList.contains('player-filter-hidden')&&!c.classList.contains('player-watch-hidden')).length;const constrained=$('playerWatchOnly')?.classList.contains('active')||document.querySelector('#playerQualificationFilter [data-qf].active:not([data-qf="all"])');const el=$('playerLocalCount');if(el)el.textContent=constrained&&cards.length?`${shown}/${cards.length} VISIBLE`:''}
function apply(){scheduled=false;document.querySelectorAll('#cards article.card').forEach(updateExplanation);updateCount()}
function schedule(){if(scheduled)return;scheduled=true;queueMicrotask(apply)}
const cards=$('cards');if(cards)new MutationObserver(muts=>{if(muts.some(m=>m.type==='childList'||(m.type==='attributes'&&(m.target.matches?.('article.card')||m.target.matches?.('.qual-box')))))schedule()}).observe(cards,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
document.addEventListener('click',e=>{if(e.target.closest('#playerQualificationFilter [data-qf],#playerWatchOnly,#jobsTab,#classifiedsTab,#playerShowAll'))setTimeout(schedule,30)},true);
setTimeout(schedule,100);setTimeout(schedule,900);
})();