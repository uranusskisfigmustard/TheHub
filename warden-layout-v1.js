(() => {
'use strict';

const $ = id => document.getElementById(id);
let currentWorkspace = 'dashboard';
let applying = false;

function installStyles(){
  if ($('wardenLayoutV1Styles')) return;
  const s = document.createElement('style');
  s.id = 'wardenLayoutV1Styles';
  s.textContent = `
    :root{--wc-max:1380px;--wc-soft:#252a2e;--wc-readonly:#20252a;--wc-editable:#1b211c}
    .top,.statusin,main{max-width:var(--wc-max)!important}
    main{padding-top:14px!important}
    .panel{padding:14px!important;margin-bottom:12px!important}
    .panel h2{margin-bottom:9px}
    .wc-workspaces{max-width:var(--wc-max);margin:10px auto 0;display:flex;gap:6px;overflow-x:auto;padding:0 0 1px;scrollbar-width:thin}
    .wc-workspaces.hidden{display:none!important}
    .wc-workspace-btn{flex:0 0 auto;border:1px solid #30363a;background:#15191c;color:var(--muted);padding:7px 10px;border-radius:3px;font:inherit;font-size:.72rem;font-weight:800;letter-spacing:.065em;text-transform:uppercase;cursor:pointer;white-space:nowrap}
    .wc-workspace-btn:hover{border-color:var(--accent);color:var(--text)}
    .wc-workspace-btn.active{border-color:var(--accent);background:rgba(212,168,75,.13);color:var(--text)}
    .wc-workspace-btn .wc-count{display:inline-block;min-width:1.5em;margin-left:5px;padding:1px 5px;border:1px solid var(--line);border-radius:8px;text-align:center;font-size:.65rem;color:var(--muted)}
    .wc-workspace-btn.active .wc-count{border-color:rgba(212,168,75,.6);color:var(--accent)}
    .wc-workspace-hidden{display:none!important}
    .wc-workspace-title{margin:2px 0 11px;color:var(--muted);font-size:.72rem;letter-spacing:.09em;text-transform:uppercase}

    .metrics{grid-template-columns:minmax(230px,1.6fr) repeat(2,minmax(150px,.7fr))!important;gap:8px!important}
    .metric{padding:10px 12px!important;min-height:68px}
    .metric.wc-primary-metric{border-color:rgba(212,168,75,.72);background:linear-gradient(180deg,rgba(212,168,75,.09),var(--panel2))}
    .metric.wc-primary-metric strong{font-size:1.85rem!important;color:var(--accent)}
    .metric.wc-config-metric{grid-column:1/-1;min-height:0!important;display:flex;align-items:center;gap:12px;padding:7px 10px!important;background:#15191c}
    .metric.wc-config-metric strong{display:inline!important;margin:0!important;font-size:.76rem!important;font-weight:700;color:var(--muted)}
    .cards{grid-template-columns:repeat(auto-fill,minmax(300px,380px))!important;justify-content:start;gap:10px!important}
    .card{padding:12px!important}

    .wc-tablehead{color:var(--muted);font-size:.68rem!important;letter-spacing:.07em;text-transform:uppercase;border-bottom:1px solid var(--line)!important;padding:5px 0 7px!important}
    .wc-tablehead.history{display:grid}
    .wc-tablehead.auditrow{display:grid}
    .history{padding:8px 0!important}
    .auditrow{padding:8px 0!important}

    .shell,.adjshell,.progshell,.npcshell,.facshell{scrollbar-width:thin}
    .mactions,.adjactions{position:sticky;bottom:-20px;z-index:8;margin-left:-20px!important;margin-right:-20px!important;margin-bottom:-20px!important;padding:12px 20px 20px!important;background:linear-gradient(180deg,rgba(17,19,21,.94),#111315 35%);box-shadow:0 -10px 20px rgba(0,0,0,.22)}
    .btn.wc-preview{border-color:var(--line)!important;background:var(--panel2)!important;color:var(--text)!important}
    .btn.wc-preview:hover:not(:disabled){border-color:var(--accent)!important}
    .btn.wc-commit:not(:disabled){background:rgba(212,168,75,.20)!important;border-color:var(--accent)!important;box-shadow:inset 0 0 0 1px rgba(212,168,75,.12)}
    .btn:focus-visible,.wc-workspace-btn:focus-visible{outline:2px solid var(--accent);outline-offset:2px}

    .wc-collapsible{padding:0!important;overflow:hidden}
    .wc-collapse-toggle{width:100%;display:flex;justify-content:space-between;gap:12px;align-items:center;border:0;border-bottom:1px solid transparent;background:#171b1f;color:var(--text);padding:10px 12px;text-align:left;font:inherit;font-weight:800;letter-spacing:.06em;cursor:pointer}
    .wc-collapse-toggle:hover{background:#1d2226}
    .wc-collapsible.open>.wc-collapse-toggle{border-bottom-color:var(--line)}
    .wc-collapse-left{display:flex;align-items:center;gap:8px}
    .wc-collapse-arrow{color:var(--accent);width:1em}
    .wc-collapse-count{min-width:2em;padding:1px 6px;border:1px solid var(--line);border-radius:9px;text-align:center;color:var(--muted);font-size:.68rem}
    .wc-collapse-body{padding:11px 12px 12px}
    .wc-collapsible:not(.open)>.wc-collapse-body{display:none}
    .wc-collapsible .rewardhead{margin:0}
    #contactRewardsBox,#payoutResolutionBox{margin-bottom:5px!important}
    #review{padding:9px 10px!important;font-size:.8rem}

    #npcManager .npcgrid,#factionManager .facgrid{margin-top:8px}
    .npclist,.faclist{max-height:calc(100vh - 265px)!important;min-height:280px}
    #npcDetail{display:grid;grid-template-columns:190px minmax(0,1fr);column-gap:16px;row-gap:5px;align-items:start}
    #npcDetail>.title,#npcDetail>.meta,#npcDetail>.wc-npc-canon-label,#npcDetail>.npcfacts{grid-column:2}
    #npcDetail>.npcportrait-wrap{grid-column:1;grid-row:1 / span 4;margin:0!important;justify-content:center}
    #npcDetail>.npcportrait-status{grid-column:1;margin-top:4px!important}
    #npcDetail>.wc-npc-op-label,#npcDetail>.npcop,#npcDetail>.small{grid-column:1/-1}
    #npcDetail .npcportrait{width:180px!important;max-width:180px!important;max-height:250px!important;object-fit:contain!important}
    #npcDetail .npcfacts{gap:8px!important}
    .wc-zone-label{margin-top:5px;padding:5px 7px;border-left:2px solid var(--line);font-size:.67rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);background:#181c1f}
    .wc-zone-label.wc-readonly{border-left-color:#6d7780;background:var(--wc-readonly)}
    .wc-zone-label.wc-editable{border-left-color:var(--ok);background:var(--wc-editable);color:#b6c7a8}
    #npcDetail .npcop{margin-top:5px!important;padding-top:9px!important}

    #facDetail .wc-fac-canon-label{margin-top:8px}
    #facDetail .wc-fac-op-label{margin-top:12px}
    .facdims{grid-template-columns:repeat(5,minmax(0,1fr))!important}
    .facdim{min-width:0;overflow-wrap:anywhere}
    .wc-subhistory{margin-top:9px!important;padding:0!important;overflow:hidden}
    .wc-subhistory .wc-subhistory-toggle{width:100%;border:0;background:#171b1f;color:var(--text);padding:9px 11px;display:flex;justify-content:space-between;align-items:center;font:inherit;font-size:.72rem;font-weight:800;letter-spacing:.06em;cursor:pointer}
    .wc-subhistory .wc-subhistory-body{padding:0 11px 10px}
    .wc-subhistory:not(.open) .wc-subhistory-body{display:none}

    @media(max-width:1100px){
      .facdims{grid-template-columns:repeat(3,minmax(0,1fr))!important}
      .npcgrid,.facgrid{grid-template-columns:250px minmax(0,1fr)!important}
      #npcDetail{grid-template-columns:160px minmax(0,1fr)}
      #npcDetail .npcportrait{width:150px!important;max-width:150px!important;max-height:220px!important}
    }
    @media(max-width:900px){
      .metrics{grid-template-columns:1.25fr 1fr 1fr!important}
      .npcgrid,.facgrid{grid-template-columns:1fr!important}
      .npclist,.faclist{max-height:260px!important;min-height:0}
      .npcitem,.facitem{padding:8px 10px!important}
    }
    @media(max-width:760px){
      header{padding-bottom:8px!important}
      .wc-workspaces{margin-top:8px;padding-bottom:2px}
      main{padding:10px!important}
      .panel{padding:11px!important}
      .metrics{grid-template-columns:1fr 1fr!important}
      .metric.wc-primary-metric{grid-column:1/-1}
      .metric.wc-config-metric{grid-column:1/-1}
      .cards{grid-template-columns:1fr!important}
      .wc-tablehead{display:none!important}
      .history,.auditrow{grid-template-columns:1fr 1fr!important;gap:5px 10px!important}
      #npcDetail{grid-template-columns:1fr;display:grid}
      #npcDetail>.title,#npcDetail>.meta,#npcDetail>.wc-npc-canon-label,#npcDetail>.npcfacts,#npcDetail>.npcportrait-wrap,#npcDetail>.npcportrait-status,#npcDetail>.wc-npc-op-label,#npcDetail>.npcop,#npcDetail>.small{grid-column:1;grid-row:auto}
      #npcDetail>.npcportrait-wrap{justify-content:flex-start;margin:4px 0!important}
      .facdims{grid-template-columns:1fr 1fr!important}
      .mactions,.adjactions{bottom:-20px}
    }
    @media(max-width:520px){
      .metrics{grid-template-columns:1fr!important}
      .metric.wc-primary-metric,.metric.wc-config-metric{grid-column:1}
      .metric.wc-config-metric{align-items:flex-start;flex-direction:column;gap:2px}
      .facdims{grid-template-columns:1fr!important}
    }
  `;
  document.head.appendChild(s);
}

function panelOf(id){ return $(id)?.closest('.panel') || null; }

function installWorkspaceNav(){
  if ($('wardenWorkspaceNav')) return;
  const header = document.querySelector('header');
  if (!header) return;
  const nav = document.createElement('nav');
  nav.id = 'wardenWorkspaceNav';
  nav.className = 'wc-workspaces hidden';
  nav.setAttribute('aria-label','Warden console workspaces');
  const items = [
    ['dashboard','Dashboard'],['contracts','Contracts'],['npcs','NPCs'],['factions','Factions'],['progression','Progression'],['session','Session'],['admin','Admin']
  ];
  nav.innerHTML = items.map(([key,label]) => `<button type="button" class="wc-workspace-btn" data-workspace="${key}">${label}${key==='contracts'?'<span id="wcContractCount" class="wc-count">0</span>':''}</button>`).join('');
  header.appendChild(nav);
  nav.querySelectorAll('[data-workspace]').forEach(b => b.addEventListener('click',()=>setWorkspace(b.dataset.workspace,true)));
}

function assignWorkspaces(){
  const map = [
    [document.querySelector('#console > .metrics'),'dashboard'],
    [$('sessionClosePanel'),'session'],
    [panelOf('cards'),'dashboard contracts'],
    [panelOf('history'),'contracts'],
    [$('progressionManager'),'progression'],
    [$('npcManager'),'npcs'],
    [$('factionManager'),'factions'],
    [$('wardenAdjustPanel'),'admin'],
    [panelOf('audit'),'admin']
  ];
  map.forEach(([el,keys])=>{ if(el) el.dataset.workspaces = keys; });
  const result = $('consoleResult'); if(result) result.dataset.workspaceGlobal = '1';
}

function workspaceLabel(key){
  return ({dashboard:'Live Dashboard',contracts:'Contract Administration',npcs:'NPC Operations',factions:'Faction / Institution Operations',progression:'Progression',session:'Session Close',admin:'Audit / Corrections'})[key] || key;
}

function ensureWorkspaceTitle(){
  let el = $('wardenWorkspaceTitle');
  if (el) return el;
  const consoleEl = $('console'); if(!consoleEl) return null;
  el = document.createElement('div');
  el.id = 'wardenWorkspaceTitle';
  el.className = 'wc-workspace-title';
  consoleEl.insertBefore(el, consoleEl.firstChild);
  return el;
}

function setWorkspace(key,focusTop=false){
  currentWorkspace = key || 'dashboard';
  assignWorkspaces();
  document.querySelectorAll('#console [data-workspaces]').forEach(el=>{
    const keys = String(el.dataset.workspaces||'').split(/\s+/);
    el.classList.toggle('wc-workspace-hidden',!keys.includes(currentWorkspace));
  });
  const title = ensureWorkspaceTitle(); if(title) title.textContent = workspaceLabel(currentWorkspace);
  document.querySelectorAll('.wc-workspace-btn').forEach(b=>{
    const active = b.dataset.workspace===currentWorkspace;
    b.classList.toggle('active',active);
    b.setAttribute('aria-current',active?'page':'false');
  });
  if(focusTop) document.querySelector('main')?.scrollIntoView({behavior:'smooth',block:'start'});
}

function syncAuthVisibility(){
  const unlocked = !$('console')?.classList.contains('hidden');
  $('wardenWorkspaceNav')?.classList.toggle('hidden',!unlocked);
  if(unlocked) setWorkspace(currentWorkspace,false);
}

function enhanceMetrics(){
  const metrics = document.querySelector('#console > .metrics'); if(!metrics) return;
  const ms = [...metrics.children].filter(x=>x.classList.contains('metric'));
  if(ms[0]) ms[0].classList.add('wc-primary-metric');
  if(ms[3]) ms[3].classList.add('wc-config-metric');
  const count = $('wcContractCount');
  if(count && $('ac')) count.textContent = $('ac').textContent || '0';
}

function installTableHeaders(){
  const history = $('history');
  if(history && !history.previousElementSibling?.classList.contains('wc-history-head')){
    const h = document.createElement('div');
    h.className = 'history wc-tablehead wc-history-head';
    h.innerHTML = '<div>CONTRACT</div><div>STATUS</div><div>CLOSED</div><div class="money">PAYOUT</div><div></div>';
    history.parentElement.insertBefore(h,history);
  }
  const audit = $('audit');
  if(audit && !audit.previousElementSibling?.classList.contains('wc-audit-head')){
    const h = document.createElement('div');
    h.className = 'auditrow wc-tablehead wc-audit-head';
    h.innerHTML = '<div>TIME / STATE</div><div>EVENT</div><div>TARGET</div><div>RESULT</div>';
    audit.parentElement.insertBefore(h,audit);
  }
}

function markModalActions(){
  ['preview','sessionClosePreviewBtn','adjPreview','progPreview','npcPreview','facPreview'].forEach(id=>$(id)?.classList.add('wc-preview'));
  ['commit','sessionCloseCommit','adjCommit','progCommit','npcCommit','facCommit'].forEach(id=>$(id)?.classList.add('wc-commit'));
}

function makeCollapsible(el,label,listSelector,itemSelector){
  if(!el || el.dataset.wcCollapsible==='1') return;
  el.dataset.wcCollapsible='1';
  el.classList.add('wc-collapsible');
  const body = document.createElement('div'); body.className='wc-collapse-body';
  while(el.firstChild) body.appendChild(el.firstChild);
  const toggle = document.createElement('button');
  toggle.type='button'; toggle.className='wc-collapse-toggle';
  toggle.innerHTML=`<span class="wc-collapse-left"><span class="wc-collapse-arrow">▸</span><span>${label}</span></span><span class="wc-collapse-count">0</span>`;
  el.appendChild(toggle); el.appendChild(body);
  const update=()=>{
    const list=el.querySelector(listSelector);
    const n=list?list.querySelectorAll(itemSelector).length:0;
    toggle.querySelector('.wc-collapse-count').textContent=String(n);
    if(n>0) el.classList.add('open');
    toggle.querySelector('.wc-collapse-arrow').textContent=el.classList.contains('open')?'▾':'▸';
  };
  toggle.addEventListener('click',()=>{el.classList.toggle('open');update()});
  const list=el.querySelector(listSelector); if(list) new MutationObserver(update).observe(list,{childList:true,subtree:false});
  update();
}

function enhanceCloseout(){
  makeCollapsible(document.querySelector('.rewardbox:not(#continuityBox)'),'PROGRESSION / REWARDS','#rewardList','.reward');
  makeCollapsible($('contactRewardsBox'),'CONTACTS / FAVORS','#contactRewardList','.contactReward');
  makeCollapsible($('continuityBox'),'CONTINUITY / CONSEQUENCES','#continuityList','.continuity-effect');
}

function enhanceNpcDetail(){
  const d=$('npcDetail'); if(!d || !d.querySelector('.title')) return;
  const facts=d.querySelector('.npcfacts');
  const op=d.querySelector('.npcop');
  if(facts && !d.querySelector('.wc-npc-canon-label')){
    const l=document.createElement('div'); l.className='wc-zone-label wc-readonly wc-npc-canon-label'; l.textContent='CANON — READ ONLY';
    d.insertBefore(l,facts);
  }
  if(op && !d.querySelector('.wc-npc-op-label')){
    const l=document.createElement('div'); l.className='wc-zone-label wc-editable wc-npc-op-label'; l.textContent='OPERATIONAL STATE — EDITABLE';
    d.insertBefore(l,op);
  }
}

function enhanceFactionDetail(){
  const d=$('facDetail'); if(!d || !d.querySelector('.title')) return;
  if(!d.querySelector('.wc-fac-canon-label')){
    const meta=d.querySelector('.meta'); const l=document.createElement('div');
    l.className='wc-zone-label wc-readonly wc-fac-canon-label'; l.textContent='CANONICAL EVIDENCE / ACCESS — READ ONLY';
    if(meta) meta.insertAdjacentElement('afterend',l); else d.prepend(l);
  }
  const pressure=d.querySelector('.facpressure');
  if(pressure && !d.querySelector('.wc-fac-op-label')){
    const l=document.createElement('div'); l.className='wc-zone-label wc-editable wc-fac-op-label'; l.textContent='CURRENT PRESSURE MODEL — EDITABLE';
    d.insertBefore(l,pressure);
  }
}

function makeSubhistory(box,label){
  if(!box || box.dataset.wcSubhistory==='1') return;
  box.dataset.wcSubhistory='1'; box.classList.add('wc-subhistory');
  const body=document.createElement('div'); body.className='wc-subhistory-body';
  while(box.firstChild) body.appendChild(box.firstChild);
  const toggle=document.createElement('button'); toggle.type='button'; toggle.className='wc-subhistory-toggle';
  toggle.innerHTML=`<span>${label}</span><span class="wc-subhistory-arrow">▸</span>`;
  toggle.addEventListener('click',()=>{box.classList.toggle('open');toggle.querySelector('.wc-subhistory-arrow').textContent=box.classList.contains('open')?'▾':'▸'});
  box.appendChild(toggle); box.appendChild(body);
}

function collapseManagerHistories(){
  const npcHistory=$('npcHistory')?.closest('.npcdetail');
  const facHistory=$('facHistory')?.closest('.facdetail');
  makeSubhistory(npcHistory,'RECENT NPC OPERATIONAL UPDATES');
  makeSubhistory(facHistory,'RECENT FACTION / INSTITUTION UPDATES');
  const progHistory=$('progHistory')?.closest('.progcard');
  makeSubhistory(progHistory,'RECENT PROGRESSION ACTIONS');
}

function updateHeaderCopy(){
  const sub=document.querySelector('header .sub');
  if(sub) sub.textContent='Private campaign administration // live-session workspace';
}

function applyEnhancements(){
  if(applying) return; applying=true;
  try{
    installStyles(); installWorkspaceNav(); assignWorkspaces(); ensureWorkspaceTitle(); enhanceMetrics(); installTableHeaders(); markModalActions(); enhanceCloseout(); collapseManagerHistories(); enhanceNpcDetail(); enhanceFactionDetail(); updateHeaderCopy(); syncAuthVisibility();
  } finally { applying=false; }
}

installStyles();
applyEnhancements();

const consoleEl=$('console');
if(consoleEl) new MutationObserver(()=>setTimeout(()=>{applyEnhancements();syncAuthVisibility()},20)).observe(consoleEl,{attributes:true,attributeFilter:['class']});

const ac=$('ac'); if(ac) new MutationObserver(enhanceMetrics).observe(ac,{childList:true,characterData:true,subtree:true});
const npcDetail=$('npcDetail'); if(npcDetail) new MutationObserver(()=>setTimeout(enhanceNpcDetail,20)).observe(npcDetail,{childList:true,subtree:false});
const facDetail=$('facDetail'); if(facDetail) new MutationObserver(()=>setTimeout(enhanceFactionDetail,20)).observe(facDetail,{childList:true,subtree:false});

document.addEventListener('click',e=>{
  if(e.target.closest('#lock,#playerPage')){currentWorkspace='dashboard';setTimeout(syncAuthVisibility,20)}
  if(e.target.closest('#refresh')) setTimeout(applyEnhancements,500);
},true);

})();