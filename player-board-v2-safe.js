(()=>{
'use strict';
// Stable player-facing baseline remains in player-shell-v1.js and player-board-v1.js.
// This layer handles safe compatibility fixes that do not alter mission content.

const ZERO_MISSIONS_SENTINEL='__NO_ACTIVE_MISSIONS__';
const JOBS_CACHE='mothership_hub_jobs_v5';
const JOBS_TIME=JOBS_CACHE+'_time';

function clearContractCache(){
  try{
    localStorage.removeItem(JOBS_CACHE);
    localStorage.removeItem(JOBS_TIME);
  }catch(_){}
}

function applyZeroMissionState(){
  const cards=document.getElementById('cards');
  if(!cards) return;
  const sentinel=[...cards.querySelectorAll('.card .title')]
    .some(el=>String(el.textContent||'').trim()===ZERO_MISSIONS_SENTINEL);
  if(!sentinel) return;

  // A successful live feed explicitly reported zero active missions.
  // That state supersedes any previously cached contract board.
  clearContractCache();
  cards.innerHTML='<div class="empty">No contracts are currently posted.</div>';
  const count=document.getElementById('count');
  if(count) count.textContent='0 of 0 contracts';
}

const cards=document.getElementById('cards');
if(cards){
  new MutationObserver(applyZeroMissionState).observe(cards,{childList:true,subtree:true});
  applyZeroMissionState();
}

if(!document.getElementById('betweenSessionWorkflowScript')){
  const s=document.createElement('script');
  s.id='betweenSessionWorkflowScript';
  s.src='between-session-workflow-v1.js?v=20260915d';
  s.defer=true;
  document.head.appendChild(s);
}
})();
