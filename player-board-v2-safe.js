(() => {
'use strict';

const JOBS_CACHE='mothership_hub_jobs_v5';
const CLASSIFIEDS_CACHE='mothership_hub_classifieds_v2';
const SNAPSHOT_KEY='mothership_hub_board_snapshot_v2';
const WATCH_KEY='mothership_hub_board_watch_v2';
const RECENT_KEY='mothership_hub_board_recent_v2';
const UI_KEY='mothership_hub_board_ui_v2';
const $=id=>document.getElementById(id);
const STATE={watch:new Set(),recent:[],prior:null,current:null,watchOnly:false,currentAcceptId:'',scheduled:false,restoring:false};

function safeJson(store,key,fallback){try{return JSON.parse(store.getItem(key)||'')||fallback}catch(_){return fallback}}
function saveJson(store,key,value){try{store.setItem(key,JSON.stringify(value))}catch(_){}}
function normalize(v){return String(v??'').toLowerCase().replace(/\s+/g,' ').trim()}
function hashText(v){let h=2166136261,s=String(v??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function mode(){return $('classifiedsTab')?.classList.contains('active')?'classifieds':'contracts'}
function cards(){return [...document.querySelectorAll('#cards article.card')]}
function navByLabel(label){return [...document.querySelectorAll('.navrow .navbtn,.navrow .btn')].find(x=>String(x.textContent||'').replace(/\d+/g,'').trim().toUpperCase().startsWith(label))||null}
function activeQualification(){return document.querySelector('#playerQualificationFilter [data-qf].active')?.dataset.qf||'all'}

function installStyles(){
  if($('playerBoardV2SafeStyles'))return;
  const s=document.createElement('style');s.id='playerBoardV2SafeStyles';s.textContent=`
    article.card{position:relative}
    .pbs-tools{position:absolute;right:10px;top:10px;z-index:2;display:flex;gap:5px;align-items:center}
    .pbs-watch,.pbs-local-btn{font:inherit;color:#aaa79f;background:#171b1f;border:1px solid #3a3f43;border-radius:3px;padding:5px 8px;cursor:pointer;font-size:.64rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
    .pbs-watch{padding:4px 6px;font-size:.61rem}.pbs-watch:hover,.pbs-watch.active,.pbs-local-btn:hover,.pbs-local-btn.active{border-color:#d4a84b;color:#e7e4dc}.pbs-watch.active,.pbs-local-btn.active{background:rgba(212,168,75,.10)}
    .pbs-change{display:inline-block;border:1px solid #66879a;color:#b8d3df;background:rgba(64,91,105,.13);border-radius:3px;padding:2px 5px;font-size:.59rem;font-weight:800;letter-spacing:.07em}.pbs-change.updated{border-color:#8a611f;color:#efbd74}
    .pbs-change-count{display:inline-block;margin-left:5px;color:#efbd74;font-size:.61rem;letter-spacing:.04em;white-space:nowrap}
    article.card .card-head{padding-right:76px}
    .pbs-qual{margin:6px 0 10px;color:#aaa79f;font-size:.69rem;letter-spacing:.03em}.pbs-qual.ready{color:#bdd2aa}.pbs-qual.action{color:#efbd74}.pbs-qual.blocked{color:#ff8b83}
    .pbs-local{margin-top:7px}.pbs-local-row,.pbs-recent{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pbs-recent{margin-top:7px;overflow-x:auto;flex-wrap:nowrap;min-height:24px}
    .pbs-label{color:#aaa79f;font-size:.64rem;letter-spacing:.08em;text-transform:uppercase}.pbs-recent-btn{flex:0 0 auto;font:inherit;color:#aaa79f;background:#15191c;border:1px solid #30363a;border-radius:9px;padding:3px 7px;cursor:pointer;font-size:.61rem;max-width:245px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.pbs-recent-btn:hover{border-color:#d4a84b;color:#e7e4dc}
    .pbs-watch-hidden{display:none!important}.pbs-empty{margin:14px 0;padding:18px;border:1px dashed #3a3f43;background:#171b1f;color:#aaa79f;text-align:center}.pbs-empty button{margin-top:9px}
    .pbs-accepted{border-color:#536249!important;opacity:.9}.pbs-accepted-link{display:block;width:100%;text-align:center;font:inherit;font-weight:800;letter-spacing:.07em;color:#bdd2aa;background:rgba(48,66,43,.20);border:1px solid #536249;border-radius:3px;padding:10px 12px;text-decoration:none;text-transform:uppercase}
    .pbs-flash{outline:2px solid #d4a84b;outline-offset:2px}
    @media(max-width:620px){article.card .card-head{padding-right:0}.pbs-tools{position:static;justify-content:flex-end;margin:-2px 0 6px}}
  `;document.head.appendChild(s)
}

function installControls(){
  if($('pbsLocal'))return;
  const anchor=$('playerQualificationFilter')||document.querySelector('header .controls');if(!anchor)return;
  const box=document.createElement('div');box.id='pbsLocal';box.className='pbs-local';box.innerHTML='<div class="pbs-local-row"><span class="pbs-label">LOCAL VIEW</span><button id="pbsWatchOnly" class="pbs-local-btn" type="button">WATCHED ONLY</button><span id="pbsVisible" class="pbs-label"></span></div><div id="pbsRecent" class="pbs-recent"><span class="pbs-label">RECENT</span><span class="pbs-label">NONE THIS SESSION</span></div>';
  anchor.insertAdjacentElement('afterend',box);
  $('pbsWatchOnly').onclick=()=>{STATE.watchOnly=!STATE.watchOnly;$('pbsWatchOnly').classList.toggle('active',STATE.watchOnly);applyFilters();saveUi()};
}

function rowKey(row,type,index){
  if(type==='contracts')return'job:'+String(row?.['Job ID']||row?.['ID']||row?.['Title']||index).trim();
  return'classified:'+String(row?.['Listing ID']||row?.['ID']||[row?.['Title'],row?.['Category']].filter(Boolean).join('|')||index).trim();
}
function rowHash(row,type){const f=type==='contracts'?['Title','Employer','Pay','Work Type','Good Fit','Preferred Skills','Required Skills','Qualification','Summary','Details']:['Title','Price','Category','Description','Status'];return hashText(f.map(k=>String(row?.[k]??'')).join('\u001f'))}
function snapshot(){
  const out={contracts:{},classifieds:{},at:Date.now()};
  const j=safeJson(localStorage,JOBS_CACHE,[]);if(Array.isArray(j))j.forEach((r,i)=>out.contracts[rowKey(r,'contracts',i)]=rowHash(r,'contracts'));
  const c=safeJson(localStorage,CLASSIFIEDS_CACHE,[]);if(Array.isArray(c))c.filter(r=>String(r?.Status||'POSTED').toUpperCase()==='POSTED').forEach((r,i)=>out.classifieds[rowKey(r,'classifieds',i)]=rowHash(r,'classifieds'));
  return out
}
function loadState(){
  const w=safeJson(localStorage,WATCH_KEY,[]);STATE.watch=new Set(Array.isArray(w)?w:[]);
  const r=safeJson(sessionStorage,RECENT_KEY,[]);STATE.recent=Array.isArray(r)?r.slice(0,5):[];
  STATE.prior=safeJson(localStorage,SNAPSHOT_KEY,null);STATE.current=snapshot();if(!STATE.prior){STATE.prior=STATE.current;saveJson(localStorage,SNAPSHOT_KEY,STATE.current)}
}
function persistSnapshot(){saveJson(localStorage,SNAPSHOT_KEY,snapshot())}

function cardKey(card,index){
  if(card.classList.contains('classified-card')){
    const title=normalize(card.querySelector('.title')?.textContent),rows=safeJson(localStorage,CLASSIFIEDS_CACHE,[]);if(Array.isArray(rows)){const r=rows.find(x=>normalize(x?.Title)===title);if(r)return rowKey(r,'classifieds',rows.indexOf(r))}return'classified:'+title
  }
  const id=card.querySelector('[data-accept-job]')?.dataset.acceptJob;if(id)return'job:'+id;
  const title=normalize(card.querySelector('.title')?.textContent),rows=safeJson(localStorage,JOBS_CACHE,[]);if(Array.isArray(rows)){const r=rows.find(x=>normalize(x?.Title)===title);if(r)return rowKey(r,'contracts',rows.indexOf(r))}return'job:'+title
}
function cardLabel(card){return String(card.querySelector('.title')?.textContent||'Listing').trim()}
function cardMode(card){return card.classList.contains('classified-card')?'classifieds':'contracts'}
function changeState(key,type){const group=type==='classifieds'?'classifieds':'contracts',a=STATE.prior?.[group]||{},b=STATE.current?.[group]||{};if(!(key in b))return'';if(!(key in a))return'NEW';return a[key]!==b[key]?'UPDATED':''}

function qualText(card){
  if(card.classList.contains('classified-card'))return;
  const ready=card.classList.contains('crew-ready')||card.querySelector('.qual-box.state-met');const blocked=card.querySelector('.qual-box.state-blocked');let el=card.querySelector('.pbs-qual');if(!el){el=document.createElement('div');el.className='pbs-qual';const q=card.querySelector('.qual-box');if(q)q.insertAdjacentElement('afterend',el);else card.querySelector('.pay')?.insertAdjacentElement('afterend',el)}
  el.className='pbs-qual '+(ready?'ready':blocked?'blocked':'action');el.textContent=ready?'READY — CREW MEETS POSTED QUALIFICATION':blocked?'BLOCKED — REQUIRED REGULATED AUTHORIZATION NOT HELD':'ACTION — POSTED QUALIFICATION REQUIRES ATTENTION'
}
function watchButton(card,key){let b=card.querySelector('.pbs-watch');if(!b){b=document.createElement('button');b.type='button';b.className='pbs-watch';b.onclick=e=>{e.stopPropagation();STATE.watch.has(key)?STATE.watch.delete(key):STATE.watch.add(key);saveJson(localStorage,WATCH_KEY,[...STATE.watch]);renderCard(card,[...cards()].indexOf(card));addRecent(card);applyFilters();saveUi()};let tools=card.querySelector('.pbs-tools');if(!tools){tools=document.createElement('div');tools.className='pbs-tools';card.prepend(tools)}tools.appendChild(b)}const on=STATE.watch.has(key);b.textContent=on?'WATCHING':'WATCH';b.classList.toggle('active',on)}
function changeBadge(card,key,type){let el=card.querySelector('.pbs-change'),state=changeState(key,type);if(!state){el?.remove();return}if(!el){el=document.createElement('span');el.className='pbs-change';let tools=card.querySelector('.pbs-tools');if(!tools){tools=document.createElement('div');tools.className='pbs-tools';card.prepend(tools)}tools.prepend(el)}el.textContent=state;el.classList.toggle('updated',state==='UPDATED')}
function renderCard(card,index){const key=cardKey(card,index);card.dataset.pbsKey=key;watchButton(card,key);changeBadge(card,key,cardMode(card));qualText(card)}

function renderChangeCounts(){for(const [label,type,id] of [['CONTRACTS','contracts','pbsContractChanges'],['CLASSIFIEDS','classifieds','pbsClassifiedChanges']]){const nav=navByLabel(label);if(!nav)continue;const a=STATE.prior?.[type]||{},b=STATE.current?.[type]||{};const n=Object.keys(b).filter(k=>!(k in a)||a[k]!==b[k]).length;let el=nav.querySelector('#'+id);if(!n){el?.remove();continue}if(!el){el=document.createElement('span');el.id=id;el.className='pbs-change-count';nav.appendChild(el)}if(el.textContent!==`${n} NEW/UPDATED`)el.textContent=`${n} NEW/UPDATED`}}

function addRecent(card){const item={key:card.dataset.pbsKey||cardKey(card,0),label:cardLabel(card),mode:cardMode(card)};STATE.recent=[item,...STATE.recent.filter(x=>x.key!==item.key)].slice(0,5);saveJson(sessionStorage,RECENT_KEY,STATE.recent);renderRecent()}
function renderRecent(){const row=$('pbsRecent');if(!row)return;row.innerHTML='<span class="pbs-label">RECENT</span>';if(!STATE.recent.length){row.insertAdjacentHTML('beforeend','<span class="pbs-label">NONE THIS SESSION</span>');return}STATE.recent.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='pbs-recent-btn';b.textContent=`${item.mode==='classifieds'?'CLASSIFIED':'CONTRACT'}: ${item.label}`;b.onclick=()=>jumpRecent(item);row.appendChild(b)})}
function jumpRecent(item){$(item.mode==='classifieds'?'classifiedsTab':'jobsTab')?.click();STATE.watchOnly=false;$('pbsWatchOnly')?.classList.remove('active');document.querySelector('#playerQualificationFilter [data-qf="all"]')?.click();if($('search')){$('search').value='';$('search').dispatchEvent(new Event('input',{bubbles:true}))}setTimeout(()=>{refresh();const card=document.querySelector(`[data-pbs-key="${CSS.escape(item.key)}"]`);if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('pbs-flash');setTimeout(()=>card.classList.remove('pbs-flash'),1200)}},160)}

function accepted(){return window.__hubPlayerShell?.getContractState?.()?.contracts?.active||[]}
function suppressAccepted(){const a=accepted();if(!Array.isArray(a)||!a.length)return;cards().filter(c=>!c.classList.contains('classified-card')).forEach(card=>{const key=String(card.dataset.pbsKey||'').replace(/^job:/,''),title=normalize(cardLabel(card)),r=a.find(x=>String(x?.contractId||x?.jobId||'')===key||normalize(x?.title)===title);if(!r)return;const row=card.querySelector('.accept-row');if(!row||row.querySelector('.pbs-accepted-link'))return;const id=String(r.contractId||r.jobId||key);row.innerHTML=`<a class="pbs-accepted-link" href="contracts.html#contract=${encodeURIComponent(id)}">ACCEPTED // SEE CONTRACT LOG</a>`;card.classList.add('pbs-accepted')})}
function postAcceptLink(){const a=document.querySelector('#playerPostAcceptActions a');if(a&&STATE.currentAcceptId)a.href='contracts.html#contract='+encodeURIComponent(STATE.currentAcceptId)}

function applyFilters(){const list=cards();let shown=0;list.forEach(card=>{const hide=STATE.watchOnly&&!STATE.watch.has(card.dataset.pbsKey||'');card.classList.toggle('pbs-watch-hidden',hide);if(!hide&&!card.classList.contains('player-filter-hidden'))shown++});const constrained=STATE.watchOnly||activeQualification()!=='all';if($('pbsVisible'))$('pbsVisible').textContent=constrained&&list.length?`${shown}/${list.length} VISIBLE`:'';let e=$('pbsEmpty');if(!list.length||shown){e?.remove();return}if(!e){e=document.createElement('div');e.id='pbsEmpty';e.className='pbs-empty';e.innerHTML='<div>NO LISTINGS MATCH THE CURRENT LOCAL / QUALIFICATION VIEW.</div><button class="pbs-local-btn" type="button">SHOW ALL LISTINGS</button>';document.querySelector('main')?.appendChild(e);e.querySelector('button').onclick=()=>{STATE.watchOnly=false;$('pbsWatchOnly')?.classList.remove('active');document.querySelector('#playerQualificationFilter [data-qf="all"]')?.click();if($('search')){$('search').value='';$('search').dispatchEvent(new Event('input',{bubbles:true}))}setTimeout(refresh,100)}}}

function refresh(){STATE.current=snapshot();cards().forEach(renderCard);renderChangeCounts();renderRecent();suppressAccepted();postAcceptLink();applyFilters()}
function schedule(){if(STATE.scheduled)return;STATE.scheduled=true;setTimeout(()=>{STATE.scheduled=false;refresh()},80)}

function saveUi(){if(STATE.restoring)return;saveJson(sessionStorage,UI_KEY,{tab:mode(),search:$('search')?.value||'',primary:$('primaryFilter')?.value||'',secondary:$('secondaryFilter')?.value||'',qualification:activeQualification(),watchOnly:STATE.watchOnly,scrollY:window.scrollY||0})}
function restoreUi(){const d=safeJson(sessionStorage,UI_KEY,null);if(!d)return;STATE.restoring=true;if(!location.hash)$(d.tab==='classifieds'?'classifiedsTab':'jobsTab')?.click();setTimeout(()=>{if($('search')){$('search').value=d.search||'';$('search').dispatchEvent(new Event('input',{bubbles:true}))}for(const [id,v] of [['primaryFilter',d.primary],['secondaryFilter',d.secondary]]){const el=$(id);if(el&&[...el.options].some(o=>o.value===v)){el.value=v||'';el.dispatchEvent(new Event('change',{bubbles:true}))}}document.querySelector(`#playerQualificationFilter [data-qf="${CSS.escape(d.qualification||'all')}"]`)?.click();STATE.watchOnly=Boolean(d.watchOnly);$('pbsWatchOnly')?.classList.toggle('active',STATE.watchOnly);setTimeout(()=>{refresh();window.scrollTo(0,Number(d.scrollY)||0);STATE.restoring=false},180)},500)}

function installEvents(){
  const host=$('cards');if(host)new MutationObserver(m=>{if(m.some(x=>x.type==='childList'&&x.target===host))schedule()}).observe(host,{childList:true});
  document.addEventListener('click',e=>{const accept=e.target.closest('[data-accept-job]');if(accept){STATE.currentAcceptId=String(accept.dataset.acceptJob||'');const card=accept.closest('article.card');if(card)addRecent(card);saveUi()}const summary=e.target.closest('summary');if(summary){const card=summary.closest('article.card');if(card)addRecent(card)}if(e.target.closest('#jobsTab,#classifiedsTab,#playerQualificationFilter [data-qf],#clearBtn'))setTimeout(()=>{refresh();saveUi()},100);if(e.target.closest('#refreshBtn')){setTimeout(refresh,500);setTimeout(refresh,1700)}} ,true);
  ['search','primaryFilter','secondaryFilter'].forEach(id=>$(id)?.addEventListener(id==='search'?'input':'change',()=>setTimeout(()=>{refresh();saveUi()},80)));
  window.addEventListener('hub-player-contracts-updated',()=>setTimeout(refresh,80));
  window.addEventListener('pagehide',()=>{saveUi();persistSnapshot()});
}

installStyles();installControls();loadState();renderRecent();installEvents();restoreUi();
[100,350,900,1800,3500].forEach(ms=>setTimeout(refresh,ms));
})();