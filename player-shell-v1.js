(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const JOBS_CACHE='mothership_hub_jobs_v5';
const CLASSIFIEDS_CACHE='mothership_hub_classifieds_v2';
const STATEMENTS_CACHE='hub_statement_export_v2';
const $=id=>document.getElementById(id);
const STATE={contracts:null,online:false,boardCounts:{jobs:null,classifieds:null}};

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function safeJson(key,fallback){try{return JSON.parse(localStorage.getItem(key)||'')||fallback}catch(_){return fallback}}
function pageKind(){const p=location.pathname.toLowerCase();if(p.endsWith('/contracts.html'))return'logs';if(p.endsWith('/statements.html'))return'statements';return'board'}
function apiCall(action){return new Promise((resolve,reject)=>{const callback='__playerShell'+Date.now()+Math.random().toString(36).slice(2);const script=document.createElement('script');const timer=setTimeout(()=>done(new Error('Public contract service timed out.')),15000);function done(err,payload){clearTimeout(timer);try{delete window[callback]}catch(_){window[callback]=undefined}script.remove();err?reject(err):resolve(payload)}window[callback]=payload=>done(null,payload);script.onerror=()=>done(new Error('Public contract service unavailable.'));script.src=API+'?action='+encodeURIComponent(action)+'&callback='+encodeURIComponent(callback)+'&_='+Date.now();document.head.appendChild(script)})}

function installStyles(){
  if($('playerShellStyles'))return;
  const s=document.createElement('style');s.id='playerShellStyles';s.textContent=`
    .player-system-line{border-bottom:1px solid #25292c;background:#121518;color:#8f8c84;font-size:.68rem;letter-spacing:.055em;text-transform:uppercase}
    .player-system-inner{max-width:1180px;margin:auto;padding:6px 18px;display:flex;gap:8px 14px;align-items:center;flex-wrap:wrap}
    .player-system-item{white-space:nowrap}
    .player-system-item.live{color:#a9bd98}.player-system-item.warn{color:#d4a84b}.player-system-item.bad{color:#d58a7b}
    .player-assignment{border-bottom:1px solid #394239;background:rgba(37,49,34,.34)}
    .player-assignment-inner{max-width:1180px;margin:auto;padding:8px 18px;display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
    .player-assignment-main{min-width:0;font-size:.76rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .player-assignment-label{color:#bdd2aa;font-size:.65rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;margin-right:8px}
    .player-assignment-title{font-weight:800;color:#e7e4dc}.player-assignment-meta{color:#aaa79f;margin-left:7px}
    .player-assignment-link{font:inherit;font-size:.68rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:#e7e4dc;background:#171b1f;border:1px solid #536249;border-radius:3px;padding:5px 8px;text-decoration:none;white-space:nowrap}
    .player-assignment-link:hover{border-color:#8fa77a}
    .player-nav-badge{display:inline-block;min-width:1.55em;margin-left:5px;padding:0 5px;border:1px solid #4a4f52;border-radius:9px;color:#aaa79f;font-size:.65rem;line-height:1.45;text-align:center;vertical-align:1px}
    .player-nav-badge.active-contract{border-color:#66805b;color:#bdd2aa}
    @media(max-width:760px){.player-assignment-main{white-space:normal}.player-system-inner,.player-assignment-inner{padding-left:12px;padding-right:12px}}
  `;document.head.appendChild(s)
}

function findStatusAnchor(){return document.querySelector('.statusbar')||document.querySelector('.status')||document.querySelector('header')}
function installChrome(){
  if($('playerSystemLine'))return;
  const anchor=findStatusAnchor();if(!anchor)return;
  const sys=document.createElement('div');sys.id='playerSystemLine';sys.className='player-system-line';sys.innerHTML='<div id="playerSystemInner" class="player-system-inner"></div>';
  anchor.insertAdjacentElement('afterend',sys);
  const assign=document.createElement('div');assign.id='playerAssignmentStrip';assign.className='player-assignment hidden';assign.innerHTML='<div id="playerAssignmentInner" class="player-assignment-inner"></div>';
  sys.insertAdjacentElement('afterend',assign);
}

function loadBoardCountsFromCache(){
  const jobs=safeJson(JOBS_CACHE,null);if(Array.isArray(jobs))STATE.boardCounts.jobs=jobs.length;
  const cls=safeJson(CLASSIFIEDS_CACHE,null);if(Array.isArray(cls))STATE.boardCounts.classifieds=cls.filter(x=>String(x?.Status||'POSTED').toUpperCase()==='POSTED').length;
}
function statementState(){
  if(pageKind()==='statements'){
    const t=String($('status')?.textContent||'').toUpperCase();
    if(/CACHED|STALE/.test(t))return'CACHED';
    if(/UNAVAILABLE|ERROR/.test(t))return'UNAVAILABLE';
    if(/CURRENT STATEMENT|LIVE/.test(t))return'CURRENT';
    return'LOADING';
  }
  const c=safeJson(STATEMENTS_CACHE,null);return c&&typeof c==='object'&&Object.keys(c).length?'AVAILABLE':'AVAILABLE';
}

function renderSystem(){
  const host=$('playerSystemInner');if(!host)return;
  const active=Array.isArray(STATE.contracts?.active)?STATE.contracts.active:[];
  const state=statementState();
  const items=[
    `<span class="player-system-item ${STATE.online?'live':'bad'}">${STATE.online?'BOARD LINK LIVE':'BOARD LINK DEGRADED'}</span>`,
    `<span class="player-system-item ${active.length?'live':''}">${active.length} ACTIVE CONTRACT${active.length===1?'':'S'}</span>`,
    `<span class="player-system-item ${state==='UNAVAILABLE'?'bad':state==='CACHED'?'warn':''}">STATEMENTS ${esc(state)}</span>`
  ];
  host.innerHTML=items.join('<span aria-hidden="true">·</span>');
}

function renderAssignment(){
  const strip=$('playerAssignmentStrip'),host=$('playerAssignmentInner');if(!strip||!host)return;
  const active=Array.isArray(STATE.contracts?.active)?STATE.contracts.active:[];
  if(!active.length){strip.classList.add('hidden');host.innerHTML='';return}
  const first=active[0]||{};const participants=Array.isArray(first.participants)?first.participants.filter(Boolean):[];
  const extra=active.length>1?` · +${active.length-1} MORE`:'';
  const meta=[participants.length?participants.join(', '):'',first.acceptedDate?`ACCEPTED ${first.acceptedDate}`:''].filter(Boolean).join(' · ');
  host.innerHTML=`<div class="player-assignment-main"><span class="player-assignment-label">ACTIVE ASSIGNMENT${active.length===1?'':'S'}</span><span class="player-assignment-title">${esc(first.title||first.contractId||first.jobId||'Contract')}</span>${meta?`<span class="player-assignment-meta">· ${esc(meta)}</span>`:''}${extra?`<span class="player-assignment-meta">${esc(extra)}</span>`:''}</div><a class="player-assignment-link" href="contracts.html">VIEW CONTRACT LOG</a>`;
  strip.classList.remove('hidden');
}

function navElements(){return [...document.querySelectorAll('.navrow .navbtn, .navrow .btn')]}
function navByLabel(label){return navElements().find(x=>String(x.textContent||'').replace(/\d+/g,'').trim().toUpperCase().startsWith(label))||null}
function badge(el,id,count,active=false){
  if(!el)return;let b=el.querySelector('#'+id);if(!b){b=document.createElement('span');b.id=id;b.className='player-nav-badge';el.appendChild(b)}
  if(count===null||count===undefined||Number.isNaN(Number(count))){b.remove();return}
  const text=String(count);if(b.textContent!==text)b.textContent=text;b.classList.toggle('active-contract',Boolean(active));
}
function renderNavBadges(){
  const active=Array.isArray(STATE.contracts?.active)?STATE.contracts.active.length:0;
  badge(navByLabel('CONTRACTS'),'playerContractsBadge',STATE.boardCounts.jobs,false);
  badge(navByLabel('CONTRACT LOGS'),'playerLogsBadge',active,active>0);
  badge(navByLabel('CLASSIFIEDS'),'playerClassifiedsBadge',STATE.boardCounts.classifieds,false);
}

async function loadPublicContractState(){
  try{const data=await apiCall('contractfeed');if(!data||data.ok===false)throw new Error(data?.error||'Invalid contract feed.');STATE.contracts=data;STATE.online=true}catch(_){STATE.contracts={active:[],history:[]};STATE.online=false}
  renderSystem();renderAssignment();renderNavBadges();
}

function watchPageStatus(){
  const st=$('status');if(!st)return;new MutationObserver(()=>renderSystem()).observe(st,{childList:true,characterData:true,subtree:true});
}
function watchNav(){
  const nav=document.querySelector('.navrow');if(!nav)return;new MutationObserver(()=>renderNavBadges()).observe(nav,{childList:true,subtree:true});
}

window.__hubPlayerShell={
  setBoardCounts(counts={}){if(counts.jobs!==null&&counts.jobs!==undefined&&Number.isFinite(Number(counts.jobs)))STATE.boardCounts.jobs=Number(counts.jobs);if(counts.classifieds!==null&&counts.classifieds!==undefined&&Number.isFinite(Number(counts.classifieds)))STATE.boardCounts.classifieds=Number(counts.classifieds);renderNavBadges()},
  refreshContracts:loadPublicContractState
};

installStyles();installChrome();loadBoardCountsFromCache();renderSystem();renderAssignment();renderNavBadges();watchPageStatus();watchNav();loadPublicContractState();
setTimeout(()=>{loadBoardCountsFromCache();renderNavBadges()},1200);
})();