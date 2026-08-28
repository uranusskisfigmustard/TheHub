(() => {
'use strict';

const JOBS_CACHE='mothership_hub_jobs_v5';
const CLASSIFIEDS_CACHE='mothership_hub_classifieds_v2';
const SNAPSHOT_KEY='mothership_hub_board_snapshot_v1';
const WATCH_KEY='mothership_hub_board_watch_v1';
const RECENT_KEY='mothership_hub_board_recent_v1';
const UI_KEY='mothership_hub_board_ui_v1';
const $=id=>document.getElementById(id);
const STATE={watchOnly:false,watch:new Set(),recent:[],prior:null,current:null,currentAcceptId:'',scheduled:false,restoring:false};

function safeJson(storage,key,fallback){try{return JSON.parse(storage.getItem(key)||'')||fallback}catch(_){return fallback}}
function saveJson(storage,key,value){try{storage.setItem(key,JSON.stringify(value))}catch(_){}}
function normalize(v){return String(v??'').toLowerCase().replace(/\s+/g,' ').trim()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function hashText(v){let h=2166136261,s=String(v??'');for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
function mode(){return $('classifiedsTab')?.classList.contains('active')?'classifieds':'contracts'}
function cardList(){return [...document.querySelectorAll('#cards article.card')]}
function activeQualification(){return document.querySelector('#playerQualificationFilter .player-qual-btn.active')?.dataset.qf||'all'}
function navByLabel(label){return [...document.querySelectorAll('.navrow .navbtn,.navrow .btn')].find(x=>String(x.textContent||'').replace(/\d+/g,'').trim().toUpperCase().startsWith(label))||null}

function installStyles(){
  if($('playerBoardV2Styles'))return;
  const s=document.createElement('style');s.id='playerBoardV2Styles';s.textContent=`
    article.card{position:relative}
    .player-card-tools{position:absolute;right:10px;top:10px;z-index:2;display:flex;gap:5px;align-items:center}
    .player-watch-btn{font:inherit;border:1px solid #3a3f43;background:#15191c;color:#8f8c84;border-radius:3px;padding:4px 6px;font-size:.61rem;font-weight:800;letter-spacing:.055em;cursor:pointer}
    .player-watch-btn:hover,.player-watch-btn.active{border-color:#d4a84b;color:#e7e4dc}.player-watch-btn.active{background:rgba(212,168,75,.10)}
    .player-change-badge{display:inline-block;border:1px solid #66879a;color:#b8d3df;background:rgba(64,91,105,.13);border-radius:3px;padding:2px 5px;font-size:.59rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase}
    .player-change-badge.updated{border-color:#8a611f;color:#efbd74;background:rgba(83,55,15,.14)}
    .player-change-count{display:inline-block;margin-left:5px;color:#efbd74;font-size:.61rem;letter-spacing:.04em;white-space:nowrap}
    article.card .card-head{padding-right:76px}
    .player-qual-explain{margin:6px 0 10px;color:#aaa79f;font-size:.69rem;letter-spacing:.03em}
    .player-qual-explain.ready{color:#bdd2aa}.player-qual-explain.blocked{color:#ff8b83}.player-qual-explain.action{color:#efbd74}
    .player-local-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-top:7px}
    .player-local-label{color:#aaa79f;font-size:.64rem;letter-spacing:.08em;text-transform:uppercase}
    .player-local-btn{font:inherit;color:#aaa79f;background:#171b1f;border:1px solid #3a3f43;border-radius:3px;padding:5px 8px;cursor:pointer;font-size:.64rem;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
    .player-local-btn:hover,.player-local-btn.active{border-color:#d4a84b;color:#e7e4dc}.player-local-btn.active{background:rgba(212,168,75,.10)}
    .player-recent-row{display:flex;gap:5px;align-items:center;overflow-x:auto;scrollbar-width:thin;margin-top:7px;min-height:24px}
    .player-recent-btn{flex:0 0 auto;font:inherit;color:#aaa79f;background:#15191c;border:1px solid #30363a;border-radius:9px;padding:3px 7px;cursor:pointer;font-size:.61rem;max-width:245px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .player-recent-btn:hover{border-color:#d4a84b;color:#e7e4dc}
    .player-watch-hidden{display:none!important}
    .player-filter-empty{margin:14px 0;padding:18px;border:1px dashed #3a3f43;background:#171b1f;color:#aaa79f;text-align:center}
    .player-filter-empty button{margin-top:9px}
    .player-accepted-stale{border-color:#536249!important;opacity:.9}
    .player-accepted-link{display:block;width:100%;text-align:center;font:inherit;font-weight:800;letter-spacing:.07em;color:#bdd2aa;background:rgba(48,66,43,.20);border:1px solid #536249;border-radius:3px;padding:10px 12px;text-decoration:none;text-transform:uppercase}
    .player-card-flash{outline:2px solid #d4a84b;outline-offset:2px}
    @media(max-width:620px){article.card .card-head{padding-right:0}.player-card-tools{position:static;justify-content:flex-end;margin:-2px 0 6px}}
  `;document.head.appendChild(s)
}

function installLocalControls(){
  if($('playerLocalControls'))return;
  const anchor=$('playerQualificationFilter')||document.querySelector('header .controls');if(!anchor)return;
  const box=document.createElement('div');box.id='playerLocalControls';box.innerHTML=`<div class="player-local-row"><span class="player-local-label">LOCAL VIEW</span><button id="playerWatchOnly" class="player-local-btn" type="button">WATCHED ONLY</button></div><div id="playerRecentRow" class="player-recent-row"><span class="player-local-label">RECENT</span><span class="player-local-label">NONE THIS SESSION</span></div>`;
  anchor.insertAdjacentElement('afterend',box);
  $('playerWatchOnly')?.addEventListener('click',()=>{STATE.watchOnly=!STATE.watchOnly;$('playerWatchOnly').classList.toggle('active',STATE.watchOnly);applyLocalFilters();saveUi()});
  renderRecent();
}

function loadLocalState(){
  const watch=safeJson(localStorage,WATCH_KEY,[]);STATE.watch=new Set(Array.isArray(watch)?watch:[]);
  const recent=safeJson(sessionStorage,RECENT_KEY,[]);STATE.recent=Array.isArray(recent)?recent.slice(0,5):[];
  STATE.prior=safeJson(localStorage,SNAPSHOT_KEY,null);
}
function saveWatch(){saveJson(localStorage,WATCH_KEY,[...STATE.watch])}
function saveRecent(){saveJson(sessionStorage,RECENT_KEY,STATE.recent)}

function rowKey(row,type,index){
  if(type==='contracts')return'job:'+(String(row?.['Job ID']||row?.['ID']||row?.['Title']||index).trim());
  return'classified:'+(String(row?.['Listing ID']||row?.['ID']||[row?.['Title'],row?.['Category']].filter(Boolean).join('|')||index).trim());
}
function rowHash(row,type){
  const fields=type==='contracts'?['Title','Employer','Pay','Work Type','Good Fit','Preferred Skills','Required Skills','Qualification','Summary','Details']:['Title','Price','Category','Description','Status'];
  return hashText(fields.map(k=>String(row?.[k]??'')).join('\u001f'));
}
function buildSnapshot(){
  const jobs=safeJson(localStorage,JOBS_CACHE,[]),classifieds=safeJson(localStorage,CLASSIFIEDS_CACHE,[]);const snap={contracts:{},classifieds:{},at:Date.now()};
  if(Array.isArray(jobs))jobs.forEach((r,i)=>snap.contracts[rowKey(r,'contracts',i)]=rowHash(r,'contracts'));
  if(Array.isArray(classifieds))classifieds.filter(r=>String(r?.Status||'POSTED').toUpperCase()==='POSTED').forEach((r,i)=>snap.classifieds[rowKey(r,'classifieds',i)]=rowHash(r,'classifieds'));
  return snap;
}
function ensureSnapshot(){
  STATE.current=buildSnapshot();
  if(!STATE.prior){STATE.prior=STATE.current;saveJson(localStorage,SNAPSHOT_KEY,STATE.current)}
}
function persistCurrentSnapshot(){STATE.current=buildSnapshot();saveJson(localStorage,SNAPSHOT_KEY,STATE.current)}

function cardKey(card,index){
  if(card.classList.contains('classified-card')){
    const title=card.querySelector('.title')?.textContent||'',category=card.querySelector('.type')?.textContent||'';
    const rows=safeJson(localStorage,CLASSIFIEDS_CACHE,[]);if(Array.isArray(rows)){const row=rows.find(r=>normalize(r?.Title)===normalize(title)&&(!category||normalize(r?.Category)===normalize(category)));if(row)return rowKey(row,'classifieds',rows.indexOf(row))}
    return'classified:'+String(title||index).trim();
  }
  const id=card.querySelector('[data-accept-job]')?.dataset.acceptJob||'';if(id)return'job:'+String(id).trim();
  const title=card.querySelector('.title')?.textContent||'';const rows=safeJson(localStorage,JOBS_CACHE,[]);if(Array.isArray(rows)){const row=rows.find(r=>normalize(r?.Title)===normalize(title));if(row)return rowKey(row,'contracts',rows.indexOf(row))}
  return'job:'+String(title||index).trim();
}
function cardLabel(card){return String(card.querySelector('.title')?.textContent||'Listing').trim()}
function cardMode(card){return card.classList.contains('classified-card')?'classifieds':'contracts'}

function changeStateFor(key,type){
  const group=type==='classifieds'?'classifieds':'contracts';const prior=STATE.prior?.[group]||{},current=STATE.current?.[group]||{};
  if(!Object.prototype.hasOwnProperty.call(current,key))return'';
  if(!Object.prototype.hasOwnProperty.call(prior,key))return'NEW';
  if(prior[key]!==current[key])return'UPDATED';
  return'';
}
function enhanceChangeBadge(card,key,type){
  let badge=card.querySelector('.player-change-badge');const state=changeStateFor(key,type);
  if(!state){badge?.remove();return}
  if(!badge){badge=document.createElement('span');badge.className='player-change-badge';const tools=card.querySelector('.player-card-tools');tools?.prepend(badge)}
  badge.textContent=state;badge.classList.toggle('updated',state==='UPDATED');
}
function renderChangeCounts(){
  const counts={contracts:0,classifieds:0};
  for(const type of ['contracts','classifieds']){const group=STATE.current?.[type]||{},prior=STATE.prior?.[type]||{};Object.keys(group).forEach(k=>{if(!Object.prototype.hasOwnProperty.call(prior,k)||prior[k]!==group[k])counts[type]++})}
  [['CONTRACTS','playerContractChanges',counts.contracts],['CLASSIFIEDS','playerClassifiedChanges',counts.classifieds]].forEach(([label,id,n])=>{const nav=navByLabel(label);if(!nav)return;let el=nav.querySelector('#'+id);if(!n){el?.remove();return}if(!el){el=document.createElement('span');el.id=id;el.className='player-change-count';nav.appendChild(el)}el.textContent=`${n} NEW/UPDATED`});
}

function toggleWatch(key,card){
  if(STATE.watch.has(key))STATE.watch.delete(key);else STATE.watch.add(key);saveWatch();updateWatchButton(card,key);addRecent({key,label:cardLabel(card),mode:cardMode(card)});applyLocalFilters();saveUi()
}
function updateWatchButton(card,key){const b=card.querySelector('.player-watch-btn');if(!b)return;const on=STATE.watch.has(key);b.classList.toggle('active',on);b.textContent=on?'WATCHING':'WATCH';b.setAttribute('aria-pressed',on?'true':'false')}

function qualificationExplanation(card){
  if(card.classList.contains('classified-card'))return;
  const ready=card.classList.contains('crew-ready')||Boolean(card.querySelector('.qual-box.state-met'));
  const blocked=Boolean(card.querySelector('.qual-box.state-blocked'));
  let text=ready?'READY — CREW MEETS POSTED QUALIFICATION':blocked?'BLOCKED — REQUIRED REGULATED AUTHORIZATION NOT HELD':'ACTION — POSTED QUALIFICATION REQUIRES ATTENTION';
  let kind=ready?'ready':blocked?'blocked':'action';
  let el=card.querySelector('.player-qual-explain');if(!el){el=document.createElement('div');el.className='player-qual-explain';const q=card.querySelector('.qual-box');if(q)q.insertAdjacentElement('afterend',el);else card.querySelector('.pay')?.insertAdjacentElement('afterend',el)}
  el.className='player-qual-explain '+kind;el.textContent=text;
}

function enhanceCard(card,index){
  const key=cardKey(card,index);card.dataset.playerLocalKey=key;const type=cardMode(card);
  let tools=card.querySelector('.player-card-tools');if(!tools){tools=document.createElement('div');tools.className='player-card-tools';const watch=document.createElement('button');watch.type='button';watch.className='player-watch-btn';watch.addEventListener('click',e=>{e.stopPropagation();toggleWatch(key,card)});tools.appendChild(watch);card.prepend(tools)}
  updateWatchButton(card,key);enhanceChangeBadge(card,key,type);qualificationExplanation(card);
}

function acceptedRecords(){const state=window.__hubPlayerShell?.getContractState?.();return Array.isArray(state?.contracts?.active)?state.contracts.active:[]}
function applyAcceptedSuppression(){
  const active=acceptedRecords();if(!active.length)return;
  cardList().filter(c=>!c.classList.contains('classified-card')).forEach(card=>{
    const key=String(card.dataset.playerLocalKey||'').replace(/^job:/,'');const title=normalize(cardLabel(card));
    const match=active.find(r=>String(r?.contractId||r?.jobId||'').trim()===key||normalize(r?.title)===title);if(!match)return;
    const row=card.querySelector('.accept-row');if(!row||row.querySelector('.player-accepted-link'))return;
    const id=String(match.contractId||match.jobId||key).trim();row.innerHTML=`<a class="player-accepted-link" href="contracts.html${id?'#contract='+encodeURIComponent(id):''}">ACCEPTED // SEE CONTRACT LOG</a>`;card.classList.add('player-accepted-stale')
  })
}

function applyLocalFilters(){
  const cards=cardList();let shown=0;
  cards.forEach(card=>{const key=card.dataset.playerLocalKey||'';const hide=STATE.watchOnly&&!STATE.watch.has(key);card.classList.toggle('player-watch-hidden',hide);const hidden=card.classList.contains('player-watch-hidden')||card.classList.contains('player-filter-hidden');if(!hidden)shown++});
  renderFilteredEmpty(cards.length,shown)
}
function renderFilteredEmpty(total,shown){
  let box=$('playerFilteredEmpty');if(!total||shown){box?.remove();return}
  if(!box){box=document.createElement('div');box.id='playerFilteredEmpty';box.className='player-filter-empty';box.innerHTML='<div>NO LISTINGS MATCH THE CURRENT LOCAL / QUALIFICATION VIEW.</div><button id="playerShowAll" class="player-local-btn" type="button">SHOW ALL LISTINGS</button>';document.querySelector('main')?.appendChild(box);$('playerShowAll')?.addEventListener('click',resetAllFilters)}
}
function resetAllFilters(){
  STATE.watchOnly=false;$('playerWatchOnly')?.classList.remove('active');document.querySelector('#playerQualificationFilter [data-qf="all"]')?.click();
  if($('search')){$('search').value='';$('search').dispatchEvent(new Event('input',{bubbles:true}))}
  ['primaryFilter','secondaryFilter'].forEach(id=>{const el=$(id);if(el){el.value='';el.dispatchEvent(new Event('change',{bubbles:true}))}});
  setTimeout(()=>{schedule();applyLocalFilters();saveUi()},80)
}

function addRecent(item){if(!item?.key)return;STATE.recent=[item,...STATE.recent.filter(x=>x?.key!==item.key)].slice(0,5);saveRecent();renderRecent()}
function renderRecent(){
  const row=$('playerRecentRow');if(!row)return;row.innerHTML='<span class="player-local-label">RECENT</span>';
  if(!STATE.recent.length){row.insertAdjacentHTML('beforeend','<span class="player-local-label">NONE THIS SESSION</span>');return}
  STATE.recent.forEach(item=>{const b=document.createElement('button');b.type='button';b.className='player-recent-btn';b.textContent=`${item.mode==='classifieds'?'CLASSIFIED':'CONTRACT'}: ${item.label}`;b.addEventListener('click',()=>jumpToRecent(item));row.appendChild(b)})
}
function jumpToRecent(item){
  const targetTab=item.mode==='classifieds'?'classifiedsTab':'jobsTab';$(targetTab)?.click();STATE.watchOnly=false;$('playerWatchOnly')?.classList.remove('active');document.querySelector('#playerQualificationFilter [data-qf="all"]')?.click();
  if($('search')){$('search').value='';$('search').dispatchEvent(new Event('input',{bubbles:true}))}['primaryFilter','secondaryFilter'].forEach(id=>{const el=$(id);if(el){el.value='';el.dispatchEvent(new Event('change',{bubbles:true}))}});
  setTimeout(()=>{schedule();const card=document.querySelector(`[data-player-local-key="${CSS.escape(item.key)}"]`);if(card){card.scrollIntoView({behavior:'smooth',block:'center'});card.classList.add('player-card-flash');setTimeout(()=>card.classList.remove('player-card-flash'),1200)}},120)
}

function updatePostAcceptLink(){
  const a=document.querySelector('#playerPostAcceptActions a');if(!a||!STATE.currentAcceptId)return;a.href='contracts.html#contract='+encodeURIComponent(STATE.currentAcceptId)
}

function saveUi(){
  if(STATE.restoring)return;
  const data={tab:mode(),search:$('search')?.value||'',primary:$('primaryFilter')?.value||'',secondary:$('secondaryFilter')?.value||'',qualification:activeQualification(),watchOnly:STATE.watchOnly,scrollY:window.scrollY||0};saveJson(sessionStorage,UI_KEY,data)
}
function restoreUi(){
  const data=safeJson(sessionStorage,UI_KEY,null);if(!data)return;STATE.restoring=true;
  const explicitHash=String(location.hash||'').toLowerCase();if(!explicitHash){$(data.tab==='classifieds'?'classifiedsTab':'jobsTab')?.click()}
  setTimeout(()=>{
    if($('search')){$('search').value=data.search||'';$('search').dispatchEvent(new Event('input',{bubbles:true}))}
    for(const [id,val] of [['primaryFilter',data.primary],['secondaryFilter',data.secondary]]){const el=$(id);if(el&&[...el.options].some(o=>o.value===val)){el.value=val||'';el.dispatchEvent(new Event('change',{bubbles:true}))}}
    document.querySelector(`#playerQualificationFilter [data-qf="${CSS.escape(data.qualification||'all')}"]`)?.click();STATE.watchOnly=Boolean(data.watchOnly);$('playerWatchOnly')?.classList.toggle('active',STATE.watchOnly);schedule();setTimeout(()=>window.scrollTo(0,Number(data.scrollY)||0),250);STATE.restoring=false
  },350)
}

function enhance(){ensureSnapshot();cardList().forEach(enhanceCard);renderChangeCounts();applyAcceptedSuppression();applyLocalFilters();updatePostAcceptLink()}
function schedule(){if(STATE.scheduled)return;STATE.scheduled=true;setTimeout(()=>{STATE.scheduled=false;enhance()},60)}

function installEvents(){
  const cards=$('cards');if(cards)new MutationObserver(schedule).observe(cards,{childList:true,subtree:false});
  window.addEventListener('hub-player-contracts-updated',()=>setTimeout(()=>{applyAcceptedSuppression();updatePostAcceptLink()},30));
  document.addEventListener('click',e=>{
    const accept=e.target.closest('[data-accept-job]');if(accept){STATE.currentAcceptId=String(accept.dataset.acceptJob||'');const card=accept.closest('article.card');if(card)addRecent({key:card.dataset.playerLocalKey||'job:'+STATE.currentAcceptId,label:cardLabel(card),mode:'contracts'});saveUi()}
    const summary=e.target.closest('summary');if(summary){const card=summary.closest('article.card');if(card)addRecent({key:card.dataset.playerLocalKey||cardKey(card,0),label:cardLabel(card),mode:cardMode(card)})}
    const classified=e.target.closest('article.classified-card');if(classified&&!e.target.closest('.player-watch-btn'))addRecent({key:classified.dataset.playerLocalKey||cardKey(classified,0),label:cardLabel(classified),mode:'classifieds'});
    if(e.target.closest('#jobsTab,#classifiedsTab,#clearBtn,#playerQualificationFilter [data-qf]'))setTimeout(()=>{schedule();saveUi()},70)
  },true);
  ['search','primaryFilter','secondaryFilter'].forEach(id=>$(id)?.addEventListener(id==='search'?'input':'change',()=>setTimeout(saveUi,20)));
  window.addEventListener('pagehide',()=>{saveUi();persistCurrentSnapshot()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'){saveUi();persistCurrentSnapshot()}})
}

installStyles();loadLocalState();installLocalControls();installEvents();schedule();restoreUi();
setTimeout(schedule,700);setTimeout(schedule,1500);
})();