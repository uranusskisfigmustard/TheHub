(() => {
'use strict';

const $=id=>document.getElementById(id);
const STATE={qualification:'all',scheduled:false,acceptStage:'crew'};

function installStyles(){
  if($('playerBoardV1Styles'))return;
  const s=document.createElement('style');s.id='playerBoardV1Styles';s.textContent=`
    .player-qual-filter{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin-top:8px}
    .player-qual-label{color:var(--muted);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;margin-right:3px}
    .player-qual-btn{font:inherit;color:var(--muted);background:#171b1f;border:1px solid var(--line);border-radius:3px;padding:6px 9px;cursor:pointer;font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .player-qual-btn:hover{border-color:var(--accent);color:var(--text)}
    .player-qual-btn.active{border-color:var(--accent);background:rgba(212,168,75,.10);color:var(--text)}
    article.card.player-contract-card .card-head{margin-bottom:8px}
    article.card.player-contract-card .pay{font-size:1rem;line-height:1.55;margin-top:8px}
    article.card.player-contract-card .qual-box{margin-top:9px}
    .player-card-meta{margin-top:12px;padding-top:8px;border-top:1px solid #2d3235;color:var(--muted);font-size:.73rem;line-height:1.45}
    .player-card-meta span+span::before{content:' · ';color:#686c6e}
    .player-filter-hidden{display:none!important}
    .player-accept-progress{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin:0 0 16px}
    .player-accept-step{border:1px solid var(--line);background:#15191c;color:#777;padding:5px 6px;text-align:center;font-size:.62rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
    .player-accept-step.current{border-color:var(--accent);color:var(--text);background:rgba(212,168,75,.10)}
    .player-accept-step.done{border-color:#536249;color:#bdd2aa;background:rgba(48,66,43,.20)}
    .player-post-accept{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;padding-top:10px;border-top:1px solid #303538}
    .player-post-accept .accept-action{text-decoration:none;display:inline-block}
    @media(max-width:620px){.player-accept-progress{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s)
}

function installQualificationFilter(){
  if($('playerQualificationFilter'))return;
  const controls=document.querySelector('header .controls');if(!controls)return;
  const row=document.createElement('div');row.id='playerQualificationFilter';row.className='player-qual-filter';row.innerHTML='<span class="player-qual-label">QUALIFICATION VIEW</span><button type="button" class="player-qual-btn active" data-qf="all">ALL</button><button type="button" class="player-qual-btn" data-qf="ready">CREW READY</button><button type="button" class="player-qual-btn" data-qf="action">ACTION REQUIRED</button>';
  controls.insertAdjacentElement('afterend',row);
  row.addEventListener('click',e=>{const b=e.target.closest('[data-qf]');if(!b)return;STATE.qualification=b.dataset.qf||'all';row.querySelectorAll('[data-qf]').forEach(x=>x.classList.toggle('active',x===b));applyQualificationFilter()});
}

function isJobsMode(){return $('jobsTab')?.classList.contains('active')!==false}
function contractCards(){return [...document.querySelectorAll('#cards article.card:not(.classified-card)')]}
function cardReady(card){return card.classList.contains('crew-ready')||Boolean(card.querySelector('.qual-box.state-met'))}
function applyQualificationFilter(){
  const row=$('playerQualificationFilter');if(row)row.classList.toggle('hidden',!isJobsMode());
  contractCards().forEach(card=>{
    const ready=cardReady(card);const show=STATE.qualification==='all'||(STATE.qualification==='ready'&&ready)||(STATE.qualification==='action'&&!ready);
    card.classList.toggle('player-filter-hidden',!show);
  });
}

function enhanceCard(card){
  if(card.dataset.playerHierarchy==='1')return;card.dataset.playerHierarchy='1';card.classList.add('player-contract-card');
  const head=card.querySelector('.card-head'),title=head?.querySelector('.title'),pay=head?.querySelector('.pay'),employer=head?.querySelector('.employer'),type=[...card.children].find(x=>x.classList?.contains('type'));
  if(head&&title&&pay){head.innerHTML='';head.append(title,pay)}
  const meta=document.createElement('div');meta.className='player-card-meta';
  if(employer){const s=document.createElement('span');s.textContent=employer.textContent||'';meta.appendChild(s);employer.remove()}
  if(type){const s=document.createElement('span');s.textContent=type.textContent||'';meta.appendChild(s);type.remove()}
  if(meta.childNodes.length){const accept=card.querySelector('.accept-row');if(accept)card.insertBefore(meta,accept);else card.appendChild(meta)}
}

function boardCounts(){
  let jobs=null,classifieds=null;
  try{const j=JSON.parse(localStorage.getItem('mothership_hub_jobs_v5')||'null');if(Array.isArray(j))jobs=j.length}catch(_){}
  try{const c=JSON.parse(localStorage.getItem('mothership_hub_classifieds_v2')||'null');if(Array.isArray(c))classifieds=c.filter(x=>String(x?.Status||'POSTED').toUpperCase()==='POSTED').length}catch(_){}
  window.__hubPlayerShell?.setBoardCounts({jobs,classifieds});
}

function enhanceCards(){contractCards().forEach(enhanceCard);applyQualificationFilter();boardCounts()}
function scheduleEnhance(){if(STATE.scheduled)return;STATE.scheduled=true;setTimeout(()=>{STATE.scheduled=false;enhanceCards()},50)}

function installAcceptanceProgress(){
  if($('playerAcceptanceProgress'))return;
  const sub=document.querySelector('#acceptModal .accept-sub');if(!sub)return;
  const p=document.createElement('div');p.id='playerAcceptanceProgress';p.className='player-accept-progress';p.innerHTML='<div class="player-accept-step" data-step="crew">CREW</div><div class="player-accept-step" data-step="validation">VALIDATION</div><div class="player-accept-step" data-step="qualification">QUALIFICATION</div><div class="player-accept-step" data-step="accepted">ACCEPTED</div>';
  sub.insertAdjacentElement('afterend',p);updateAcceptanceProgress();
}
function setStep(name){
  const order=['crew','validation','qualification','accepted'],idx=order.indexOf(name);document.querySelectorAll('#playerAcceptanceProgress [data-step]').forEach(x=>{const i=order.indexOf(x.dataset.step);x.classList.toggle('done',i<idx);x.classList.toggle('current',i===idx)})
}
function acceptedVisible(){const t=String($('acceptResult')?.textContent||'').toUpperCase();const terminal=$('acceptTerminalBrief');return /CONTRACT ACCEPTED/.test(t)||(terminal&&!terminal.classList.contains('hidden')&&String($('acceptTerminalOutput')?.textContent||'').trim())}
function qualificationVisible(){const q=$('acceptQualificationAction');return q&&!q.classList.contains('hidden')}
function updateAcceptanceProgress(){
  if($('acceptModal')?.classList.contains('hidden')){STATE.acceptStage='crew';setStep('crew');return}
  if(acceptedVisible()){STATE.acceptStage='accepted';setStep('accepted');showPostAcceptActions();return}
  if(qualificationVisible()){STATE.acceptStage='qualification';setStep('qualification');return}
  setStep(STATE.acceptStage||'crew')
}

function showPostAcceptActions(){
  const terminal=$('acceptTerminalBrief'),result=$('acceptResult');const anchor=terminal&&!terminal.classList.contains('hidden')?terminal:result;if(!anchor||$('playerPostAcceptActions'))return;
  const box=document.createElement('div');box.id='playerPostAcceptActions';box.className='player-post-accept';box.innerHTML='<a class="accept-action" href="contracts.html">OPEN ACTIVE CONTRACT</a><button id="playerReturnBoard" class="accept-action secondary" type="button">RETURN TO BOARD</button>';
  anchor.insertAdjacentElement('afterend',box);$('playerReturnBoard').addEventListener('click',()=>{$('acceptModalClose')?.click();setTimeout(()=>{window.__hubPlayerShell?.refreshContracts?.();$('refreshBtn')?.click()},100)});
}
function clearPostAcceptActions(){$('playerPostAcceptActions')?.remove()}

function installObservers(){
  const cards=$('cards');if(cards)new MutationObserver(scheduleEnhance).observe(cards,{childList:true});
  const modal=$('acceptModal');if(modal)new MutationObserver(()=>setTimeout(updateAcceptanceProgress,20)).observe(modal,{attributes:true,childList:true,subtree:true,attributeFilter:['class']});
  const result=$('acceptResult');if(result)new MutationObserver(()=>setTimeout(updateAcceptanceProgress,10)).observe(result,{childList:true,characterData:true,subtree:true,attributes:true,attributeFilter:['class']});
  document.addEventListener('click',e=>{
    if(e.target.closest('#jobsTab,#classifiedsTab'))setTimeout(()=>{applyQualificationFilter();boardCounts()},30);
    if(e.target.closest('[data-accept-job]')){STATE.acceptStage='crew';clearPostAcceptActions();setTimeout(()=>{setStep('crew');updateAcceptanceProgress()},40)}
    if(e.target.closest('#acceptValidateBtn,#acceptContractorSubmit,#acceptAuthorizationRequest')){STATE.acceptStage='validation';setTimeout(()=>{setStep('validation');updateAcceptanceProgress()},10)}
    if(e.target.closest('#acceptCancelBtn,#acceptModalClose')){STATE.acceptStage='crew';clearPostAcceptActions();setStep('crew')}
    if(e.target.closest('#refreshBtn'))setTimeout(()=>{scheduleEnhance();boardCounts();window.__hubPlayerShell?.refreshContracts?.()},450);
  },true);
}

installStyles();installQualificationFilter();installAcceptanceProgress();installObservers();scheduleEnhance();boardCounts();
setTimeout(()=>{installQualificationFilter();installAcceptanceProgress();scheduleEnhance();boardCounts()},700);
})();