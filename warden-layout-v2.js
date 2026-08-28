(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SK='mothership_hub_warden_session_v1';
const WK='mothership_hub_warden_workspace_v2';
const NK='mothership_hub_warden_selected_npc_v2';
const FK='mothership_hub_warden_selected_faction_v2';
const $=id=>document.getElementById(id);
const npcMeta=new Map();
const facMeta=new Map();
let factionRestrictions=[];
let metaLoading=false,managerScheduled=false;

function session(){return localStorage.getItem(SK)||''}
function jsonp(action,p={}){return new Promise((resolve,reject)=>{const cb='__wlay2'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script'),timer=setTimeout(()=>done(new Error('Warden service timed out.')),30000);function done(err,d){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(d)}window[cb]=d=>done(null,d);sc.onerror=()=>done(new Error('Could not reach Warden service.'));sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p});document.head.appendChild(sc)})}
function safeGet(k){try{return sessionStorage.getItem(k)||''}catch(_){return''}}
function safeSet(k,v){try{sessionStorage.setItem(k,String(v||''))}catch(_){}}
function safeRemove(k){try{sessionStorage.removeItem(k)}catch(_){}}
function clearUiState(){[WK,NK,FK].forEach(safeRemove)}

function installStyles(){
  if($('wardenLayoutV2Styles'))return;
  const s=document.createElement('style');s.id='wardenLayoutV2Styles';s.textContent=`
    .wc-master-column{align-self:start;position:sticky;top:122px;min-width:0}
    .wc-master-tools{display:flex;align-items:center;gap:7px;margin-bottom:7px}
    .wc-master-search{width:100%;border:1px solid var(--line);background:#15191c;color:var(--text);padding:8px 9px;border-radius:3px;font:inherit;font-size:.76rem}
    .wc-master-search:focus{outline:1px solid var(--accent);border-color:var(--accent)}
    .wc-master-count{flex:0 0 auto;color:var(--muted);font-size:.68rem;white-space:nowrap}
    .wc-chiprow{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}
    .wc-chip{display:inline-block;border:1px solid var(--line);border-radius:9px;padding:1px 6px;font-size:.61rem;line-height:1.45;color:var(--muted);letter-spacing:.035em}
    .wc-chip.ok{border-color:rgba(143,167,122,.65);color:#b6c7a8}
    .wc-chip.warn{border-color:rgba(212,168,75,.72);color:var(--accent)}
    .wc-chip.bad{border-color:rgba(200,102,85,.75);color:#d78c7d}
    .npcitem[hidden],.facitem[hidden]{display:none!important}
    .npchead>#npcEdit,.fachead>#facEdit{display:none!important}
    #npcDetail,#facDetail{position:relative}
    #npcDetail>.title,#facDetail>.title{padding-right:150px}
    .wc-context-action{position:absolute;right:11px;top:10px;padding:6px 8px!important;font-size:.68rem!important}
    .wc-ready{display:inline-block;margin-top:6px!important;padding:2px 6px;border:1px solid #384139;border-radius:8px;color:#9fb290!important;font-size:.64rem!important;letter-spacing:.06em}
    .wc-session-sections{display:grid;gap:8px;margin-top:12px}
    .wc-session-section{border:1px solid var(--line);background:#15191c}
    .wc-session-toggle{width:100%;display:flex;align-items:center;justify-content:space-between;gap:12px;border:0;background:#171b1f;color:var(--text);padding:9px 11px;font:inherit;font-size:.74rem;font-weight:800;letter-spacing:.06em;text-align:left;cursor:pointer}
    .wc-session-toggle:hover{background:#1d2226}
    .wc-session-arrow{color:var(--accent)}
    .wc-session-body{padding:11px}
    .wc-session-section:not(.open)>.wc-session-body{display:none}
    .wc-session-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
    .wc-session-grid>.wide,.wc-session-grid>#scStructuredState{grid-column:1/-1}
    .wc-session-grid>#scStructuredState{margin:0!important}
    .wc-session-original-grid{display:none!important}
    body[data-wc-workspace="dashboard"] .panel,body[data-wc-workspace="contracts"] .panel{padding-top:12px!important;padding-bottom:12px!important}
    @media(max-width:900px){.wc-master-column{position:static;top:auto}.wc-master-tools{margin-bottom:6px}}
    @media(max-width:760px){#npcDetail>.title,#facDetail>.title{padding-right:0}.wc-context-action{position:static;justify-self:start;margin:2px 0 6px}.wc-session-grid{grid-template-columns:1fr}.wc-session-grid>.wide,.wc-session-grid>#scStructuredState{grid-column:1}}
  `;document.head.appendChild(s)
}

function restoreWorkspace(){
  const saved=safeGet(WK);if(!saved)return;
  const b=document.querySelector(`.wc-workspace-btn[data-workspace="${CSS.escape(saved)}"]`);if(b&&!b.classList.contains('active'))b.click()
}
function persistWorkspace(){
  const active=document.querySelector('.wc-workspace-btn.active');if(!active)return;
  const key=active.dataset.workspace||'dashboard';safeSet(WK,key);document.body.dataset.wcWorkspace=key
}
function installWorkspacePersistence(){
  document.querySelectorAll('.wc-workspace-btn').forEach(b=>{if(b.dataset.wcPersist==='1')return;b.dataset.wcPersist='1';b.addEventListener('click',()=>setTimeout(persistWorkspace,0))});
  restoreWorkspace();persistWorkspace()
}

function wrapMaster(list,type){
  if(!list||list.closest('.wc-master-column'))return;
  const grid=list.parentElement;if(!grid)return;
  const col=document.createElement('div');col.className='wc-master-column';col.dataset.master=type;
  const tools=document.createElement('div');tools.className='wc-master-tools';
  const input=document.createElement('input');input.className='wc-master-search';input.type='search';input.autocomplete='off';input.spellcheck=false;input.placeholder=type==='npc'?'SEARCH NPCS — NAME / ROLE / FACTION / LOCATION / STATUS':'SEARCH FACTIONS / INSTITUTIONS';input.setAttribute('aria-label',input.placeholder);
  const count=document.createElement('span');count.className='wc-master-count';
  tools.append(input,count);grid.insertBefore(col,list);col.append(tools,list);
  input.addEventListener('input',()=>filterMaster(type));
}
function normalize(v){return String(v??'').toLowerCase().replace(/\s+/g,' ').trim()}
function nonempty(v){const x=normalize(v);return x&&x!=='—'&&x!=='none'&&x!=='no restrictions'&&x!=='unknown'}
function chip(text,kind=''){const s=document.createElement('span');s.className='wc-chip'+(kind?' '+kind:'');s.textContent=text;return s}

function annotateNpcList(){
  const list=$('npcList');if(!list)return;
  list.querySelectorAll('.npcitem[data-npc]').forEach(item=>{
    const name=item.dataset.npc||'';const m=npcMeta.get(name)||{};
    item.dataset.wcSearch=normalize([item.textContent,m.role,m.faction,m.location,m.culturalOrigin,m.availability,m.currentState,m.openObligation].join(' '));
    let row=item.querySelector('.wc-chiprow');if(!row){row=document.createElement('div');row.className='wc-chiprow';item.appendChild(row)}row.innerHTML='';
    const av=String(m.availability||'').toUpperCase();if(av)row.appendChild(chip(av,av==='AVAILABLE'?'ok':av==='UNAVAILABLE'?'bad':av==='LIMITED'?'warn':''));
    if(nonempty(m.openObligation))row.appendChild(chip('OPEN OBLIGATION','warn'));
  });
}
function hasActiveRestriction(m){return factionRestrictions.some(r=>String(r.status||'').toUpperCase()==='ACTIVE'&&(r.scopeValue===m.name||r.scopeValue===m.canonicalName))}
function annotateFactionList(){
  const list=$('facList');if(!list)return;
  list.querySelectorAll('.facitem[data-fac]').forEach(item=>{
    const key=item.dataset.fac||'';const m=facMeta.get(key)||{};
    item.dataset.wcSearch=normalize([item.textContent,m.name,m.canonicalName,m.classification,m.organizationForm,m.access,m.privileges,m.restrictions,m.nextGate,m.currentNeed].join(' '));
    let row=item.querySelector('.wc-chiprow');if(!row){row=document.createElement('div');row.className='wc-chiprow';item.appendChild(row)}row.innerHTML='';
    if(m.organizationForm)row.appendChild(chip(String(m.organizationForm).toUpperCase()));
    if(hasActiveRestriction(m))row.appendChild(chip('ACTIVE RESTRICTION','warn'));
  });
}
function filterMaster(type){
  const list=type==='npc'?$('npcList'):$('facList');if(!list)return;
  const input=list.closest('.wc-master-column')?.querySelector('.wc-master-search');const q=normalize(input?.value||'');let shown=0,total=0;
  list.querySelectorAll(type==='npc'?'.npcitem[data-npc]':'.facitem[data-fac]').forEach(item=>{total++;const visible=!q||normalize(item.dataset.wcSearch||item.textContent).includes(q);item.hidden=!visible;if(visible)shown++});
  const c=list.closest('.wc-master-column')?.querySelector('.wc-master-count');if(c)c.textContent=q?`${shown}/${total}`:`${total}`
}
function rememberSelections(){
  document.querySelectorAll('#npcList .npcitem[data-npc]').forEach(x=>{if(x.dataset.wcRemember==='1')return;x.dataset.wcRemember='1';x.addEventListener('click',()=>safeSet(NK,x.dataset.npc||''))});
  document.querySelectorAll('#facList .facitem[data-fac]').forEach(x=>{if(x.dataset.wcRemember==='1')return;x.dataset.wcRemember='1';x.addEventListener('click',()=>safeSet(FK,x.dataset.fac||''))})
}
function restoreSelection(type){
  const list=type==='npc'?$('npcList'):$('facList');if(!list)return;
  const key=safeGet(type==='npc'?NK:FK);if(!key)return;
  const selector=type==='npc'?`.npcitem[data-npc="${CSS.escape(key)}"]`:`.facitem[data-fac="${CSS.escape(key)}"]`;
  const target=list.querySelector(selector);if(target&&!target.classList.contains('active'))target.click()
}
function enhanceManagers(){
  wrapMaster($('npcList'),'npc');wrapMaster($('facList'),'fac');annotateNpcList();annotateFactionList();rememberSelections();filterMaster('npc');filterMaster('fac');restoreSelection('npc');restoreSelection('fac');installContextActions()
}
function scheduleManagers(){if(managerScheduled)return;managerScheduled=true;setTimeout(()=>{managerScheduled=false;enhanceManagers()},45)}

async function loadMeta(refresh=false){
  if(metaLoading||!session())return;metaLoading=true;if(refresh){npcMeta.clear();facMeta.clear();factionRestrictions=[]}
  try{
    const [n,f]=await Promise.allSettled([jsonp('wardennpcfeed',{session:session()}),jsonp('wardenfactionfeed',{session:session()})]);
    if(n.status==='fulfilled'&&n.value?.ok){npcMeta.clear();(n.value.npcs||[]).forEach(x=>npcMeta.set(String(x.name||''),x))}
    if(f.status==='fulfilled'&&f.value?.ok){facMeta.clear();(f.value.factions||[]).forEach(x=>{facMeta.set(String(x.name||''),x);if(x.canonicalName)facMeta.set(String(x.canonicalName),x)});factionRestrictions=Array.isArray(f.value.restrictions)?f.value.restrictions:[]}
    scheduleManagers()
  }finally{metaLoading=false}
}

function installContextAction(detailId,sourceId,label,className){
  const d=$(detailId),source=$(sourceId);if(!d||!source||!d.querySelector('.title'))return;
  let b=d.querySelector('.'+className);if(!b){b=document.createElement('button');b.type='button';b.className='btn primary wc-context-action '+className;b.textContent=label;b.addEventListener('click',()=>source.click());d.appendChild(b)}b.disabled=source.disabled
}
function installContextActions(){installContextAction('npcDetail','npcEdit','UPDATE NPC','wc-npc-action');installContextAction('facDetail','facEdit','UPDATE PRESSURE','wc-fac-action')}

function quietStatus(id){
  const el=$(id);if(!el)return;
  const text=String(el.textContent||'').trim();if(!text)return;
  if(text==='READY'&&el.dataset.wcQuietOriginal)return;
  const success=/\bBACKEND\s+\d/i.test(text)&&!/required|unavailable|error|not available/i.test(text);
  if(success){el.dataset.wcQuietOriginal=text;el.title=text;el.textContent='READY';el.classList.add('wc-ready')}
  else{el.classList.remove('wc-ready');if(el.dataset.wcQuietOriginal){delete el.dataset.wcQuietOriginal;el.removeAttribute('title')}}
}
function quietStatuses(){['npcStatus','facStatus','progStatus','adjustStatus','sessionCloseVersion'].forEach(quietStatus)}
function watchStatuses(){['npcStatus','facStatus','progStatus','adjustStatus','sessionCloseVersion'].forEach(id=>{const el=$(id);if(!el||el.dataset.wcQuietWatch==='1')return;el.dataset.wcQuietWatch='1';new MutationObserver(()=>setTimeout(()=>quietStatus(id),0)).observe(el,{childList:true,characterData:true,subtree:true})})}

function section(title,open=false){
  const box=document.createElement('section');box.className='wc-session-section'+(open?' open':'');
  const btn=document.createElement('button');btn.type='button';btn.className='wc-session-toggle';btn.setAttribute('aria-expanded',open?'true':'false');btn.innerHTML=`<span>${title}</span><span class="wc-session-arrow">${open?'▾':'▸'}</span>`;
  const body=document.createElement('div');body.className='wc-session-body';const grid=document.createElement('div');grid.className='wc-session-grid';body.appendChild(grid);box.append(btn,body);
  btn.addEventListener('click',()=>{box.classList.toggle('open');const x=box.classList.contains('open');btn.setAttribute('aria-expanded',x?'true':'false');btn.querySelector('.wc-session-arrow').textContent=x?'▾':'▸'});return{box,grid}
}
function moveField(grid,id){const el=$(id),label=el?.closest('label');if(label)grid.appendChild(label)}
function sectionSessionClose(){
  const grid=document.querySelector('#sessionCloseModal .sessionclose-grid');if(!grid||$('wcSessionSections'))return;
  const host=document.createElement('div');host.id='wcSessionSections';host.className='wc-session-sections';grid.insertAdjacentElement('beforebegin',host);
  const specs=[
    ['SESSION IDENTITY',true,['scNumber','scTitle','scRealDate','scLocations','scStart','scEnd']],
    ['WHAT HAPPENED',false,['scSummary','scDecisions','scDiscoveries']],
    ['NPCS / RELATIONSHIPS',false,['scNpc']],
    ['CHARACTER STATE',false,['scStatus']],
    ['REWARDS / OBLIGATIONS',false,['scRewards','scObligations']],
    ['CONTINUITY / UNRESOLVED',false,['scUnresolved']],
    ['REQUIRED SOURCE UPDATES',false,['scUpdates']]
  ];
  let characterGrid=null;
  specs.forEach(([title,open,ids])=>{const s=section(title,open);ids.forEach(id=>moveField(s.grid,id));host.appendChild(s.box);if(title==='CHARACTER STATE')characterGrid=s.grid});
  const structured=$('scStructuredState');if(structured&&characterGrid)characterGrid.insertBefore(structured,characterGrid.firstChild);
  grid.classList.add('wc-session-original-grid')
}

function apply(){
  installStyles();installWorkspacePersistence();sectionSessionClose();enhanceManagers();quietStatuses();watchStatuses();installContextActions()
}

installStyles();apply();
setTimeout(()=>{apply();loadMeta()},500);
setTimeout(()=>{apply();loadMeta()},1400);

const npcList=$('npcList');if(npcList)new MutationObserver(scheduleManagers).observe(npcList,{childList:true});
const facList=$('facList');if(facList)new MutationObserver(scheduleManagers).observe(facList,{childList:true});
const npcDetail=$('npcDetail');if(npcDetail)new MutationObserver(()=>setTimeout(installContextActions,25)).observe(npcDetail,{childList:true,subtree:false});
const facDetail=$('facDetail');if(facDetail)new MutationObserver(()=>setTimeout(installContextActions,25)).observe(facDetail,{childList:true,subtree:false});
const nav=$('wardenWorkspaceNav');if(nav)new MutationObserver(()=>setTimeout(persistWorkspace,0)).observe(nav,{attributes:true,subtree:true,attributeFilter:['class']});
const consoleEl=$('console');if(consoleEl)new MutationObserver(()=>{if(!consoleEl.classList.contains('hidden')&&session()){setTimeout(()=>{restoreWorkspace();persistWorkspace();loadMeta()},250)}}).observe(consoleEl,{attributes:true,attributeFilter:['class']});

['npcEdit','facEdit'].forEach(id=>{const el=$(id);if(el)new MutationObserver(installContextActions).observe(el,{attributes:true,attributeFilter:['disabled']})});

document.addEventListener('click',e=>{
  if(e.target.closest('#lock,#playerPage')){clearUiState();npcMeta.clear();facMeta.clear();factionRestrictions=[]}
  if(e.target.closest('#refresh'))setTimeout(()=>{loadMeta(true);quietStatuses();apply()},550);
  if(e.target.closest('#openSessionClose'))setTimeout(sectionSessionClose,50);
},true);

})();