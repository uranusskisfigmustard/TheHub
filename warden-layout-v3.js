(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SK='mothership_hub_warden_session_v1';
const EK='mothership_hub_warden_session_expiry_v1';
const RECENT_KEY='mothership_hub_warden_recent_v3';
const CONTEXT_KEY='mothership_hub_warden_context_v3';
const $=id=>document.getElementById(id);

const STATE={
  feed:null,npc:null,faction:null,progression:null,sessionContext:null,version:null,portraitManifest:null,
  loading:false,loaded:false,searchIndex:[],currentContext:null,recent:[],enhanceTimer:null
};

function session(){try{return localStorage.getItem(SK)||''}catch(_){return''}}
function normalize(v){return String(v??'').toLowerCase().replace(/\s+/g,' ').trim()}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function nonempty(v){const x=normalize(v);return Boolean(x&&x!=='—'&&x!=='none'&&x!=='unknown'&&x!=='no restrictions')}
function safeParse(raw,fallback){try{return JSON.parse(raw)}catch(_){return fallback}}
function readSessionJson(key,fallback){try{return safeParse(sessionStorage.getItem(key)||'',fallback)}catch(_){return fallback}}
function writeSessionJson(key,value){try{sessionStorage.setItem(key,JSON.stringify(value))}catch(_){}}
function clearSessionKey(key){try{sessionStorage.removeItem(key)}catch(_){}}
function cssEscape(v){return window.CSS?.escape?CSS.escape(String(v)):String(v).replace(/["\\]/g,'\\$&')}
function short(v,n=120){const s=String(v??'').replace(/\s+/g,' ').trim();return s.length>n?s.slice(0,n-1)+'…':s}
function campaignDate(){return STATE.feed?.campaignDate||String($('date')?.textContent||'').replace(/^CAMPAIGN DATE\s+/i,'').trim()||'—'}

function jsonp(action,p={}){
  return new Promise((resolve,reject)=>{
    const cb='__wlay3'+Date.now()+Math.random().toString(36).slice(2);
    const sc=document.createElement('script');
    const timer=setTimeout(()=>done(new Error('Warden service timed out.')),30000);
    function done(err,d){
      clearTimeout(timer);
      try{delete window[cb]}catch(_){window[cb]=undefined}
      sc.remove();
      err?reject(err):resolve(d);
    }
    window[cb]=d=>done(null,d);
    sc.onerror=()=>done(new Error('Could not reach Warden service.'));
    sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p});
    document.head.appendChild(sc);
  });
}

function installStyles(){
  if($('wardenLayoutV3Styles'))return;
  const s=document.createElement('style');
  s.id='wardenLayoutV3Styles';
  s.textContent=`
    .wc-opsbar{max-width:var(--wc-max,1380px);margin:8px auto 0;display:grid;grid-template-columns:minmax(260px,390px) minmax(0,1fr) auto;gap:7px 10px;align-items:center}
    .wc-opsbar.hidden{display:none!important}
    .wc-global-wrap{position:relative;min-width:0}
    .wc-global-search{width:100%;border:1px solid var(--line);background:#15191c;color:var(--text);padding:7px 9px;border-radius:3px;font:inherit;font-size:.74rem}
    .wc-global-search:focus{outline:1px solid var(--accent);border-color:var(--accent)}
    .wc-search-results{position:absolute;left:0;right:0;top:calc(100% + 4px);z-index:80;border:1px solid var(--line);background:#111518;box-shadow:0 10px 28px rgba(0,0,0,.48);max-height:360px;overflow:auto}
    .wc-search-results.hidden{display:none!important}
    .wc-search-result{display:block;width:100%;border:0;border-top:1px solid #2b3034;background:transparent;color:var(--text);padding:8px 9px;text-align:left;font:inherit;cursor:pointer}
    .wc-search-result:first-child{border-top:0}
    .wc-search-result:hover,.wc-search-result:focus-visible{background:#20262a;outline:none}
    .wc-search-type{color:var(--accent);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;margin-right:6px}
    .wc-search-sub{display:block;color:var(--muted);font-size:.68rem;margin-top:2px}
    .wc-context-rail{min-width:0;display:flex;align-items:center;gap:7px;border:1px solid #30363a;background:#15191c;padding:6px 8px;border-radius:3px;overflow:hidden}
    .wc-context-label,.wc-recent-label{flex:0 0 auto;color:var(--muted);font-size:.61rem;letter-spacing:.08em;text-transform:uppercase}
    .wc-context-main{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:.72rem}
    .wc-context-main strong{color:var(--accent)}
    .wc-health{border:1px solid #384139;border-radius:10px;padding:3px 8px;color:#9fb290;background:#151a16;font-size:.63rem;letter-spacing:.07em;white-space:nowrap;cursor:help}
    .wc-health.attn{border-color:rgba(200,102,85,.8);color:#d78c7d;background:#1b1514}
    .wc-recent{grid-column:1/-1;display:flex;align-items:center;gap:5px;min-height:23px;overflow-x:auto;scrollbar-width:thin}
    .wc-recent-btn{flex:0 0 auto;border:1px solid #30363a;background:#15191c;color:var(--muted);padding:3px 6px;border-radius:9px;font:inherit;font-size:.62rem;cursor:pointer;max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .wc-recent-btn:hover{border-color:var(--accent);color:var(--text)}
    .wc-recent-empty{color:var(--muted);font-size:.65rem}
    .wc-status-consolidated{display:none!important}

    #wcLiveDashboard{margin-top:10px!important}
    .wc-live-grid{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
    .wc-live-card{border:1px solid var(--line);background:var(--panel2);padding:9px 10px;min-width:0}
    .wc-live-card strong{display:block;margin-top:3px;font-size:.86rem}
    .wc-live-list{margin-top:5px;font-size:.7rem;color:var(--muted)}
    .wc-live-list>div{border-top:1px solid #303538;padding:4px 0}
    .wc-live-list>div:first-child{border-top:0}
    .wc-live-count{font-size:1.25rem!important;color:var(--accent)}
    .wc-live-clear{color:var(--muted);font-size:.7rem;margin-top:4px}

    .wc-jump-flash{outline:2px solid var(--accent)!important;outline-offset:2px;transition:outline-color .4s}
    .wc-live-core{margin:7px 0 5px;padding:6px 8px;border-left:2px solid var(--accent);background:#181c1f;font-size:.73rem;color:var(--muted)}
    .wc-live-core strong{color:var(--text)}
    .wc-reference-toggle{display:flex;align-items:center;gap:7px;width:100%;border:1px solid #30363a;background:#171b1f;color:var(--muted);padding:6px 8px;margin:7px 0;font:inherit;font-size:.66rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;cursor:pointer}
    .wc-reference-toggle:hover{border-color:var(--accent);color:var(--text)}
    .wc-reference-hidden{display:none!important}
    .wc-reference-arrow{color:var(--accent)}
    #npcDetail>.wc-live-core{grid-column:2}
    #npcDetail>.wc-reference-toggle{grid-column:2}
    #facDetail>.wc-live-core,#facDetail>.wc-reference-toggle{width:100%}

    .wc-action-flow{display:flex;justify-content:flex-end;gap:9px;flex-wrap:wrap;align-items:center}
    .wc-action-flow-state{flex:1 0 100%;padding:5px 7px;border-left:2px solid var(--line);background:#15191c;color:var(--muted);font-size:.64rem;letter-spacing:.06em;text-transform:uppercase}
    .wc-action-flow.preview-current .wc-action-flow-state{border-left-color:var(--ok);color:#b6c7a8}
    .wc-action-flow .wc-commit{margin-left:auto}
    .wc-action-flow.preview-current .wc-commit:not(:disabled){box-shadow:0 0 0 1px rgba(212,168,75,.24),inset 0 0 0 1px rgba(212,168,75,.12)!important}

    .wc-session-cue{margin-left:auto;margin-right:7px;min-width:1.2em;text-align:center;color:var(--muted);font-size:.72rem}
    .wc-session-cue.has-content{color:#b6c7a8}
    .wc-session-toggle>span:first-child{flex:1}

    @media(min-width:901px){.wc-master-column{top:168px!important}}
    @media(max-width:1100px){.wc-live-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
    @media(max-width:900px){
      .wc-opsbar{grid-template-columns:1fr 1fr}
      .wc-health{justify-self:end}
      .wc-context-rail{grid-column:2}
      .wc-recent{grid-column:1/-1}
      .wc-live-grid{grid-template-columns:1fr 1fr}
    }
    @media(max-width:760px){
      .wc-opsbar{grid-template-columns:1fr}
      .wc-context-rail,.wc-health,.wc-recent{grid-column:1}
      .wc-health{justify-self:start}
      .wc-live-grid{grid-template-columns:1fr}
      #npcDetail>.wc-live-core,#npcDetail>.wc-reference-toggle{grid-column:1}
    }
  `;
  document.head.appendChild(s);
}

function installOpsBar(){
  if($('wcOpsBar'))return;
  const header=document.querySelector('header');
  if(!header)return;
  const bar=document.createElement('div');
  bar.id='wcOpsBar';
  bar.className='wc-opsbar hidden';
  bar.innerHTML=`
    <div class="wc-global-wrap">
      <input id="wcGlobalSearch" class="wc-global-search" type="search" autocomplete="off" spellcheck="false" placeholder="FIND NPC / FACTION / CONTRACT / CHARACTER" aria-label="Search Warden console records">
      <div id="wcGlobalResults" class="wc-search-results hidden"></div>
    </div>
    <div id="wcContextRail" class="wc-context-rail"><span class="wc-context-label">CONTEXT</span><span id="wcContextMain" class="wc-context-main">NO ACTIVE RECORD</span></div>
    <div id="wcSystemHealth" class="wc-health">SYSTEM CHECK</div>
    <div id="wcRecent" class="wc-recent"><span class="wc-recent-label">RECENT</span><span class="wc-recent-empty">NONE THIS SESSION</span></div>`;
  header.appendChild(bar);
  const q=$('wcGlobalSearch');
  q?.addEventListener('input',renderSearch);
  q?.addEventListener('focus',renderSearch);
  document.addEventListener('click',e=>{
    if(!e.target.closest('.wc-global-wrap'))$('wcGlobalResults')?.classList.add('hidden');
  },true);
}

function syncOpsVisibility(){
  const unlocked=!$('console')?.classList.contains('hidden')&&Boolean(session());
  $('wcOpsBar')?.classList.toggle('hidden',!unlocked);
}

function loadRemembered(){
  STATE.recent=readSessionJson(RECENT_KEY,[]);
  if(!Array.isArray(STATE.recent))STATE.recent=[];
  STATE.currentContext=readSessionJson(CONTEXT_KEY,null);
  renderRecent();
  renderContext();
}

function saveContext(ctx){
  STATE.currentContext=ctx||null;
  if(ctx)writeSessionJson(CONTEXT_KEY,ctx);else clearSessionKey(CONTEXT_KEY);
  renderContext();
}

function addRecent(item){
  if(!item||!['npc','faction','contract'].includes(item.type))return;
  const key=item.type+'|'+item.key;
  STATE.recent=[item,...STATE.recent.filter(x=>x&&x.type+'|'+x.key!==key)].slice(0,5);
  writeSessionJson(RECENT_KEY,STATE.recent);
  renderRecent();
}

function clearV3State(){
  clearSessionKey(RECENT_KEY);
  clearSessionKey(CONTEXT_KEY);
  STATE.recent=[];
  STATE.currentContext=null;
  STATE.feed=STATE.npc=STATE.faction=STATE.progression=STATE.sessionContext=STATE.version=STATE.portraitManifest=null;
  STATE.loaded=false;
  STATE.searchIndex=[];
  if($('wcGlobalSearch'))$('wcGlobalSearch').value='';
  if($('wcGlobalResults')){$('wcGlobalResults').innerHTML='';$('wcGlobalResults').classList.add('hidden')}
  renderRecent();
  renderContext();
  syncOpsVisibility();
}

function renderContext(){
  const host=$('wcContextMain');
  if(!host)return;
  const c=STATE.currentContext;
  if(!c){host.textContent='NO ACTIVE RECORD';return}
  const type=String(c.type||'').toUpperCase();
  host.innerHTML=`<strong>${esc(type)}</strong> · ${esc(c.label||c.key||'')}${c.sub?` · ${esc(c.sub)}`:''}`;
}

function renderRecent(){
  const host=$('wcRecent');
  if(!host)return;
  host.innerHTML='<span class="wc-recent-label">RECENT</span>';
  if(!STATE.recent.length){
    const e=document.createElement('span');e.className='wc-recent-empty';e.textContent='NONE THIS SESSION';host.appendChild(e);return;
  }
  STATE.recent.forEach(item=>{
    const b=document.createElement('button');
    b.type='button';b.className='wc-recent-btn';
    b.textContent=`${String(item.type||'').toUpperCase()}: ${item.label||item.key}`;
    b.title=item.sub||item.label||item.key||'';
    b.addEventListener('click',()=>jumpTo(item,true));
    host.appendChild(b);
  });
}

function buildSearchIndex(){
  const out=[];
  (STATE.npc?.npcs||[]).forEach(x=>out.push({
    type:'npc',workspace:'npcs',key:String(x.name||''),label:String(x.name||''),
    sub:[x.role,x.faction,x.location,x.availability].filter(Boolean).join(' · '),
    search:[x.name,x.role,x.faction,x.location,x.culturalOrigin,x.currentState,x.availability,x.openObligation].join(' ')
  }));
  (STATE.faction?.factions||[]).forEach(x=>out.push({
    type:'faction',workspace:'factions',key:String(x.name||x.canonicalName||''),label:String(x.canonicalName||x.name||''),
    sub:[x.classification,x.organizationForm,x.access].filter(Boolean).join(' · '),
    search:[x.name,x.canonicalName,x.classification,x.organizationForm,x.access,x.privileges,x.restrictions,x.nextGate,x.currentNeed].join(' ')
  }));
  (STATE.feed?.active||[]).forEach(x=>out.push({
    type:'contract',workspace:'contracts',mode:'active',key:String(x.contractId||x.jobId||x.title||''),label:String(x.title||x.contractId||x.jobId||'Contract'),
    sub:[x.contractId||x.jobId,x.employer,x.status,'ACTIVE'].filter(Boolean).join(' · '),
    search:[x.title,x.contractId,x.jobId,x.employer,(x.participants||[]).join(' '),x.status,'active contract'].join(' ')
  }));
  (STATE.feed?.history||[]).forEach(x=>out.push({
    type:'contract',workspace:'contracts',mode:'history',key:String(x.contractId||x.jobId||x.title||''),label:String(x.title||x.contractId||x.jobId||'Contract'),
    sub:[x.contractId||x.jobId,x.status,x.closedDate,'CLOSED'].filter(Boolean).join(' · '),
    search:[x.title,x.contractId,x.jobId,x.status,x.closedDate,'closed contract recent closeout'].join(' ')
  }));
  (STATE.progression?.characters||[]).forEach(c=>{
    const skills=(STATE.progression?.skills||[]).filter(x=>x.character===c.name).map(x=>x.skill).join(' ');
    const training=(STATE.progression?.activeTraining||[]).filter(x=>x.character===c.name).map(x=>x.skill+' '+x.status).join(' ');
    out.push({
      type:'character',workspace:'progression',key:String(c.name||''),label:String(c.name||''),
      sub:[c.credentialStage,c.debt,training].filter(Boolean).join(' · '),
      search:[c.name,c.credentialStage,c.debt,c.withholding,skills,training].join(' ')
    });
  });
  STATE.searchIndex=out.map(x=>({...x,_search:normalize(x.search+' '+x.label+' '+x.sub)}));
}

function scoreResult(item,q){
  const label=normalize(item.label),key=normalize(item.key),s=item._search;
  if(label===q||key===q)return 0;
  if(label.startsWith(q)||key.startsWith(q))return 1;
  if(label.includes(q)||key.includes(q))return 2;
  if(s.includes(q))return 3;
  return 99;
}

function renderSearch(){
  const input=$('wcGlobalSearch'),host=$('wcGlobalResults');
  if(!input||!host)return;
  const q=normalize(input.value);
  if(!q){host.classList.add('hidden');host.innerHTML='';return}
  const matches=STATE.searchIndex.map(x=>({x,score:scoreResult(x,q)})).filter(v=>v.score<99).sort((a,b)=>a.score-b.score||a.x.label.localeCompare(b.x.label)).slice(0,10);
  if(!matches.length){host.innerHTML='<div class="wc-search-result"><span class="wc-search-sub">NO MATCHING WARDEN RECORDS</span></div>';host.classList.remove('hidden');return}
  host.innerHTML=matches.map((v,i)=>`<button type="button" class="wc-search-result" data-wc-result="${i}"><span class="wc-search-type">${esc(v.x.type)}</span>${esc(v.x.label)}<span class="wc-search-sub">${esc(short(v.x.sub,150))}</span></button>`).join('');
  host.classList.remove('hidden');
  host.querySelectorAll('[data-wc-result]').forEach((b,i)=>b.addEventListener('click',()=>{
    jumpTo(matches[i].x,true);
    input.value='';
    host.classList.add('hidden');
  }));
}

function workspace(key){
  const b=document.querySelector(`.wc-workspace-btn[data-workspace="${cssEscape(key)}"]`);
  if(b)b.click();
}

function flash(el){
  if(!el)return;
  el.classList.add('wc-jump-flash');
  try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch(_){el.scrollIntoView()}
  setTimeout(()=>el.classList.remove('wc-jump-flash'),1400);
}

function findContract(key,mode){
  const arr=mode==='history'?(STATE.feed?.history||[]):(STATE.feed?.active||[]);
  return arr.findIndex(x=>String(x.contractId||x.jobId||x.title||'')===String(key));
}

function jumpTo(item,recordRecent=false){
  if(!item)return;
  workspace(item.workspace||({npc:'npcs',faction:'factions',contract:'contracts',character:'progression'}[item.type]||'dashboard'));
  setTimeout(()=>{
    let target=null;
    if(item.type==='npc'){
      target=document.querySelector(`#npcList .npcitem[data-npc="${cssEscape(item.key)}"]`);
      target?.click();
      const x=(STATE.npc?.npcs||[]).find(v=>String(v.name)===String(item.key));
      saveContext({type:'npc',key:item.key,label:x?.name||item.label||item.key,sub:[x?.role,x?.faction,x?.availability].filter(Boolean).join(' · '),workspace:'npcs'});
    }else if(item.type==='faction'){
      target=document.querySelector(`#facList .facitem[data-fac="${cssEscape(item.key)}"]`);
      target?.click();
      const x=(STATE.faction?.factions||[]).find(v=>String(v.name)===String(item.key)||String(v.canonicalName)===String(item.key));
      saveContext({type:'faction',key:x?.name||item.key,label:x?.canonicalName||x?.name||item.label||item.key,sub:[x?.classification,x?.organizationForm].filter(Boolean).join(' · '),workspace:'factions'});
    }else if(item.type==='contract'){
      const idx=findContract(item.key,item.mode||'active');
      if(idx>=0){
        target=item.mode==='history'?document.querySelectorAll('#history .history')[idx]:document.querySelector(`[data-r="${idx}"]`)?.closest('.card');
        const x=(item.mode==='history'?(STATE.feed?.history||[]):(STATE.feed?.active||[]))[idx];
        saveContext({type:'contract',key:item.key,label:x?.title||item.label||item.key,sub:[x?.contractId||x?.jobId,x?.status,item.mode==='history'?'CLOSED':'ACTIVE'].filter(Boolean).join(' · '),workspace:'contracts',mode:item.mode||'active'});
      }
    }else if(item.type==='character'){
      target=[...document.querySelectorAll('#progCharacters .progcard')].find(c=>normalize(c.querySelector('strong')?.textContent)===normalize(item.key));
      saveContext({type:'character',key:item.key,label:item.label||item.key,sub:item.sub||'',workspace:'progression'});
    }
    flash(target);
    if(recordRecent)addRecent({...item,label:item.label||item.key});
  },100);
}

function dashboardPanel(){
  let p=$('wcLiveDashboard');
  if(p)return p;
  const metrics=document.querySelector('#console > .metrics');
  if(!metrics)return null;
  p=document.createElement('section');
  p.id='wcLiveDashboard';
  p.className='panel';
  p.dataset.workspaces='dashboard';
  p.innerHTML='<h2>Live Session</h2><div id="wcLiveGrid" class="wc-live-grid"></div>';
  metrics.insertAdjacentElement('afterend',p);
  return p;
}

function liveList(items,empty='NONE'){
  return items.length?`<div class="wc-live-list">${items.map(x=>`<div>${esc(x)}</div>`).join('')}</div>`:`<div class="wc-live-clear">${esc(empty)}</div>`;
}

function renderDashboard(){
  const p=dashboardPanel(),grid=$('wcLiveGrid');
  if(!p||!grid)return;
  const chars=STATE.sessionContext?.characters||[];
  const training=STATE.sessionContext?.activeTraining||STATE.progression?.activeTraining||[];
  const obligations=(STATE.npc?.npcs||[]).filter(x=>nonempty(x.openObligation));
  const restrictions=(STATE.faction?.restrictions||[]).filter(x=>String(x.status||'').toUpperCase()==='ACTIVE');
  const active=STATE.feed?.active||[];
  const stressItems=chars.map(c=>`${c.name}: Stress ${c.currentStress??'—'}${c.minimumStress!==null&&c.minimumStress!==undefined?` (min ${c.minimumStress})`:''}`);
  const trainingItems=training.slice(0,4).map(t=>`${t.character||'Crew'} — ${t.skill||'Training'}${t.status?` · ${t.status}`:''}`);
  const obligationItems=obligations.slice(0,4).map(x=>`${x.name} · ${x.availability||'UNKNOWN'} — ${short(x.openObligation,70)}`);
  const restrictionItems=restrictions.slice(0,4).map(r=>`${r.scopeValue||'Institution'}${r.character?` · ${r.character}`:''} — ${r.restrictionType||'ACTIVE RESTRICTION'}`);
  grid.innerHTML=`
    <div class="wc-live-card"><span class="label">CAMPAIGN</span><strong>${esc(campaignDate())}</strong><div class="wc-live-list"><div>${active.length} active contract${active.length===1?'':'s'}</div></div></div>
    <div class="wc-live-card"><span class="label">PC STRESS</span>${liveList(stressItems,'NO CURRENT STRESS DATA')}</div>
    <div class="wc-live-card"><span class="label">ACTIVE TRAINING</span><strong class="wc-live-count">${training.length}</strong>${liveList(trainingItems,'NO ACTIVE TRAINING')}</div>
    <div class="wc-live-card"><span class="label">OPEN NPC PRESSURES</span><strong class="wc-live-count">${obligations.length}</strong>${liveList(obligationItems,'NO OPEN NPC OBLIGATIONS')}</div>
    <div class="wc-live-card"><span class="label">ACTIVE RESTRICTIONS</span><strong class="wc-live-count">${restrictions.length}</strong>${liveList(restrictionItems,'NO ACTIVE INSTITUTIONAL RESTRICTIONS')}</div>`;
}

function statusElements(){return ['npcStatus','facStatus','progStatus','adjustStatus','sessionCloseVersion'].map($).filter(Boolean)}
function statusBad(text){return /error|unavailable|required|requires backend|could not|failed/i.test(String(text||''))}
function statusGood(text){return /\bBACKEND\s+\d/i.test(String(text||''))&&!statusBad(text)}

function renderHealth(){
  const el=$('wcSystemHealth');
  if(!el)return;
  const version=STATE.version||{};
  const backend=String(version.serviceVersion||STATE.feed?.serviceVersion||'—');
  const warden=String(version.wardenVersion||STATE.feed?.wardenVersion||'—');
  const moduleErrors=statusElements().map(x=>String(x.textContent||'').trim()).filter(statusBad);
  const portraitOk=Boolean(STATE.portraitManifest?.ok);
  const versionOk=backend==='7.7'&&warden==='2.6';
  const ready=Boolean(session())&&versionOk&&portraitOk&&!moduleErrors.length;
  el.textContent=ready?'SYSTEM READY':'SYSTEM ATTENTION';
  el.classList.toggle('attn',!ready);
  let expiry='—';
  try{const e=Number(localStorage.getItem(EK)||0);if(e)expiry=new Date(e).toLocaleString()}catch(_){}
  const details=[
    `Backend ${backend} / Warden ${warden}`,
    portraitOk?`Portrait service: ${STATE.portraitManifest.available?.length||0} indexed`:'Portrait service: unavailable',
    `Session expires: ${expiry}`,
    ...moduleErrors.map(x=>'Attention: '+x)
  ];
  el.title=details.join('\n');
  statusElements().forEach(x=>x.classList.toggle('wc-status-consolidated',ready&&statusGood(x.textContent)));
}

function installHealthWatch(){
  statusElements().forEach(x=>{
    if(x.dataset.wcHealthWatch==='1')return;
    x.dataset.wcHealthWatch='1';
    new MutationObserver(()=>setTimeout(renderHealth,0)).observe(x,{childList:true,characterData:true,subtree:true});
  });
}

function installReferenceToggle(detail,type){
  if(!detail||!detail.querySelector('.title'))return;
  const existing=detail.querySelector('.wc-reference-toggle');
  const npc=type==='npc';
  const canonLabel=detail.querySelector(npc?'.wc-npc-canon-label':'.wc-fac-canon-label');
  const opLabel=detail.querySelector(npc?'.wc-npc-op-label':'.wc-fac-op-label');
  if(!canonLabel||!opLabel)return;

  let core=detail.querySelector('.wc-live-core');
  if(!core){
    core=document.createElement('div');core.className='wc-live-core';
    const anchor=detail.querySelector('.meta')||detail.querySelector('.title');
    anchor.insertAdjacentElement('afterend',core);
  }
  if(npc){
    const name=detail.querySelector('.title')?.textContent?.trim()||'';
    const x=(STATE.npc?.npcs||[]).find(v=>v.name===name);
    core.innerHTML=`<strong>${esc(x?.role||'—')}</strong> · ${esc(x?.faction||'—')} · ${esc(x?.location||'—')} · ${esc(x?.availability||'UNKNOWN')}`;
  }else{
    const name=detail.querySelector('.title')?.textContent?.trim()||'';
    const x=(STATE.faction?.factions||[]).find(v=>v.canonicalName===name||v.name===name);
    core.innerHTML=`<strong>${esc(x?.classification||'—')}</strong>${x?.organizationForm?` · ${esc(x.organizationForm)}`:''}${x?.access?` · ACCESS: ${esc(short(x.access,90))}`:''}`;
  }

  let toggle=existing;
  if(!toggle){
    toggle=document.createElement('button');
    toggle.type='button';toggle.className='wc-reference-toggle';
    toggle.dataset.open='0';
    toggle.innerHTML=`<span class="wc-reference-arrow">▸</span><span>${npc?'REFERENCE — CANON NPC MATERIAL':'REFERENCE — ACCESS / EVIDENCE DETAIL'}</span>`;
    core.insertAdjacentElement('afterend',toggle);
    toggle.addEventListener('click',()=>setReferenceOpen(detail,type,toggle.dataset.open!=='1'));
  }
  setReferenceOpen(detail,type,toggle.dataset.open==='1');
}

function referenceNodes(detail,type){
  const canon=detail.querySelector(type==='npc'?'.wc-npc-canon-label':'.wc-fac-canon-label');
  const op=detail.querySelector(type==='npc'?'.wc-npc-op-label':'.wc-fac-op-label');
  if(!canon||!op)return[];
  const direct=[...detail.children];
  const a=direct.indexOf(canon),b=direct.indexOf(op);
  if(a<0||b<0||b<=a)return[];
  return direct.slice(a,b).filter(x=>type!=='npc'||(!x.classList.contains('npcportrait-wrap')&&!x.classList.contains('npcportrait-status')));
}

function setReferenceOpen(detail,type,open){
  const toggle=detail.querySelector('.wc-reference-toggle');
  if(toggle){toggle.dataset.open=open?'1':'0';const a=toggle.querySelector('.wc-reference-arrow');if(a)a.textContent=open?'▾':'▸'}
  referenceNodes(detail,type).forEach(x=>x.classList.toggle('wc-reference-hidden',!open));
}

function enhanceReferenceDetails(){
  installReferenceToggle($('npcDetail'),'npc');
  installReferenceToggle($('facDetail'),'faction');
}

function actionCommitFor(host){
  return host.querySelector('.wc-commit')||['commit','sessionCloseCommit','adjCommit','progCommit','npcCommit','facCommit'].map($).find(x=>x&&host.contains(x))||null;
}

function updateActionFlow(host){
  if(!host)return;
  const commit=actionCommitFor(host);
  if(!commit)return;
  let label=host.querySelector('.wc-action-flow-state');
  if(!label){label=document.createElement('div');label.className='wc-action-flow-state';host.insertBefore(label,host.firstChild)}
  const ready=!commit.disabled;
  host.classList.add('wc-action-flow');
  host.classList.toggle('preview-current',ready);
  label.textContent=ready?'PREVIEW CURRENT → COMMIT AVAILABLE':'EDIT FIELDS → PREVIEW REQUIRED → COMMIT LOCKED';
}

function enhanceActionFlows(){
  const hosts=new Set([...document.querySelectorAll('.mactions,.adjactions')]);
  ['commit','sessionCloseCommit','adjCommit','progCommit','npcCommit','facCommit'].forEach(id=>{
    const c=$(id);const h=c?.closest('.mactions,.adjactions')||c?.parentElement;if(h)hosts.add(h);
  });
  hosts.forEach(host=>{
    updateActionFlow(host);
    if(host.dataset.wcActionWatch==='1')return;
    host.dataset.wcActionWatch='1';
    const c=actionCommitFor(host);
    if(c)new MutationObserver(()=>updateActionFlow(host)).observe(c,{attributes:true,attributeFilter:['disabled']});
  });
}

function sectionHasContent(section){
  if(!section)return false;
  const controls=[...section.querySelectorAll('input,textarea,select')].filter(x=>!x.disabled);
  return controls.some(x=>{
    if(x.type==='checkbox'||x.type==='radio')return x.checked;
    return nonempty(x.value);
  });
}

function updateSessionCues(){
  const host=$('wcSessionSections');
  if(!host)return;
  host.querySelectorAll('.wc-session-section').forEach(section=>{
    const btn=section.querySelector('.wc-session-toggle');if(!btn)return;
    let cue=btn.querySelector('.wc-session-cue');
    if(!cue){cue=document.createElement('span');cue.className='wc-session-cue';const arrow=btn.querySelector('.wc-session-arrow');btn.insertBefore(cue,arrow)}
    const has=sectionHasContent(section),mark=has?'✓':'—';
    if(cue.textContent!==mark)cue.textContent=mark;
    cue.classList.toggle('has-content',has);cue.title=has?'This section currently contains entered/selected information.':'No entered/selected information in this section.';
  });
}

function installSessionCueWatch(){
  const host=$('wcSessionSections');if(!host||host.dataset.wcCueWatch==='1')return;
  host.dataset.wcCueWatch='1';
  host.addEventListener('input',updateSessionCues,true);
  host.addEventListener('change',updateSessionCues,true);
  new MutationObserver(()=>setTimeout(updateSessionCues,20)).observe(host,{childList:true,subtree:true});
  updateSessionCues();
}

function contextFromNpcClick(item){
  const key=item.dataset.npc||'';
  const x=(STATE.npc?.npcs||[]).find(v=>v.name===key);
  const ctx={type:'npc',workspace:'npcs',key,label:x?.name||key,sub:[x?.role,x?.faction,x?.availability].filter(Boolean).join(' · ')};
  saveContext(ctx);addRecent(ctx);
}
function contextFromFactionClick(item){
  const key=item.dataset.fac||'';
  const x=(STATE.faction?.factions||[]).find(v=>v.name===key);
  const ctx={type:'faction',workspace:'factions',key,label:x?.canonicalName||x?.name||key,sub:[x?.classification,x?.organizationForm].filter(Boolean).join(' · ')};
  saveContext(ctx);addRecent(ctx);
}
function contextFromContractButton(btn,history=false){
  const idx=Number(btn.dataset[history?'amend':'r']);
  const x=(history?(STATE.feed?.history||[]):(STATE.feed?.active||[]))[idx];
  if(!x)return;
  const ctx={type:'contract',workspace:'contracts',mode:history?'history':'active',key:String(x.contractId||x.jobId||x.title||''),label:String(x.title||'Contract'),sub:[x.contractId||x.jobId,x.status,history?'CLOSED':'ACTIVE'].filter(Boolean).join(' · ')};
  saveContext(ctx);addRecent(ctx);
}
function contextFromSession(){
  setTimeout(()=>{
    const number=$('scNumber')?.value||'',title=$('scTitle')?.value||'';
    saveContext({type:'session',workspace:'session',key:number||'session-close',label:title||number||'SESSION CLOSE',sub:[number,campaignDate()].filter(Boolean).join(' · ')});
  },120);
}

function watchClicks(){
  document.addEventListener('click',e=>{
    const npc=e.target.closest('#npcList .npcitem[data-npc]');if(npc){contextFromNpcClick(npc);return}
    const fac=e.target.closest('#facList .facitem[data-fac]');if(fac){contextFromFactionClick(fac);return}
    const r=e.target.closest('[data-r]');if(r){contextFromContractButton(r,false);return}
    const a=e.target.closest('[data-amend]');if(a){contextFromContractButton(a,true);return}
    if(e.target.closest('#openSessionClose'))contextFromSession();
    if(e.target.closest('.wc-workspace-btn'))setTimeout(syncDashboardVisibility,0);
    if(e.target.closest('#refresh'))setTimeout(()=>loadData(true),550);
    if(e.target.closest('#lock,#playerPage'))setTimeout(clearV3State,0);
  },true);
}

function scheduleEnhance(){
  clearTimeout(STATE.enhanceTimer);
  STATE.enhanceTimer=setTimeout(()=>{
    enhanceReferenceDetails();
    enhanceActionFlows();
    installSessionCueWatch();
    updateSessionCues();
    installHealthWatch();
    renderHealth();
  },55);
}

async function loadData(refresh=false){
  if(STATE.loading||!session()||(!refresh&&STATE.loaded))return;
  STATE.loading=true;
  if(refresh)STATE.loaded=false;
  try{
    const ses=session();
    const tasks=[
      ['version',jsonp('wardenversion',{session:ses})],
      ['feed',jsonp('wardenfeed',{session:ses})],
      ['npc',jsonp('wardennpcfeed',{session:ses})],
      ['faction',jsonp('wardenfactionfeed',{session:ses})],
      ['progression',jsonp('wardenprogressionfeed',{session:ses})],
      ['sessionContext',jsonp('wardensessionpreview',{session:ses,contextOnly:'true'})],
      ['portraitManifest',jsonp('wardennpcportraitmanifest',{session:ses})]
    ];
    const results=await Promise.allSettled(tasks.map(x=>x[1]));
    results.forEach((r,i)=>{
      const key=tasks[i][0];
      if(r.status==='fulfilled'&&r.value?.ok)STATE[key]=r.value;
      else if(refresh||!STATE[key])STATE[key]=null;
    });
    STATE.loaded=Boolean(STATE.feed||STATE.npc||STATE.faction||STATE.progression);
    buildSearchIndex();
    renderDashboard();
    renderHealth();
    scheduleEnhance();
  }finally{STATE.loading=false}
}

function syncDashboardVisibility(){
  const p=$('wcLiveDashboard');if(!p)return;
  const active=document.querySelector('.wc-workspace-btn.active')?.dataset.workspace||'dashboard';
  p.classList.toggle('wc-workspace-hidden',active!=='dashboard');
}

function boot(){
  installStyles();installOpsBar();
  if(session())loadRemembered();else clearV3State();
  syncOpsVisibility();dashboardPanel();syncDashboardVisibility();enhanceActionFlows();scheduleEnhance();watchClicks();
  const consoleEl=$('console');
  if(consoleEl)new MutationObserver(()=>{
    syncOpsVisibility();
    if(!consoleEl.classList.contains('hidden')&&session()){
      loadRemembered();
      setTimeout(()=>loadData(false),280);
    }else if(!session())clearV3State();
  }).observe(consoleEl,{attributes:true,attributeFilter:['class']});
  const npcDetail=$('npcDetail'),facDetail=$('facDetail');
  if(npcDetail)new MutationObserver(scheduleEnhance).observe(npcDetail,{childList:true,subtree:false});
  if(facDetail)new MutationObserver(scheduleEnhance).observe(facDetail,{childList:true,subtree:false});
  if(session()&&!$('console')?.classList.contains('hidden'))setTimeout(()=>loadData(false),450);
  setTimeout(()=>{syncOpsVisibility();scheduleEnhance()},1200);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();

})();