(() => {
'use strict';

const ORDER=['dashboard','contracts','npcs','factions','progression','session','reference','admin'];
const GROUPS=[
  {key:'dashboard',label:'Dashboard',defaultWorkspace:'dashboard'},
  {key:'operations',label:'Operations',defaultWorkspace:'contracts'},
  {key:'world',label:'World',defaultWorkspace:'npcs'},
  {key:'campaign',label:'Campaign',defaultWorkspace:'progression'},
  {key:'admin',label:'Admin',defaultWorkspace:'admin'}
];
const WORKSPACE_GROUP={dashboard:'dashboard',contracts:'operations',session:'operations',npcs:'world',factions:'world',progression:'campaign',reference:'campaign',admin:'admin'};
const WORKSPACE_LABEL={dashboard:'Dashboard',contracts:'Contracts',session:'Session',npcs:'NPCs',factions:'Factions',progression:'Progression',reference:'Player Reference',admin:'Admin'};
let queued=false;
let normalizing=false;

function installStyles(){
  if(document.getElementById('wardenCanonicalHeaderStyles'))return;
  const style=document.createElement('style');
  style.id='wardenCanonicalHeaderStyles';
  style.textContent=`
    .wc-workspaces.wc-tiered-nav{display:block;overflow:visible!important;margin-top:13px!important;padding-bottom:0!important}
    .wc-workspaces.wc-tiered-nav.hidden{display:none!important}
    .wc-workspaces.wc-tiered-nav>.wc-nav-source{display:none!important}
    .wc-nav-primary,.wc-nav-secondary{display:flex;align-items:center;gap:8px;min-width:0}
    .wc-nav-primary{flex-wrap:wrap}.wc-nav-secondary{margin-top:7px;flex-wrap:wrap}
    .wc-primary-btn,.wc-secondary-btn{flex:0 0 auto;border:1px solid #30363a;background:#15191c;color:var(--muted);border-radius:3px;font:inherit;font-weight:800;text-transform:uppercase;cursor:pointer;white-space:nowrap;line-height:1.2}
    .wc-primary-btn{padding:8px 14px;font-size:.72rem;letter-spacing:.08em}.wc-secondary-btn{padding:7px 11px;font-size:.7rem;letter-spacing:.06em}
    .wc-primary-btn:hover,.wc-secondary-btn:hover{border-color:var(--accent);color:var(--text)}
    .wc-primary-btn.active,.wc-secondary-btn.active{border-color:var(--accent);background:rgba(212,168,75,.13);color:var(--text)}
    .wc-secondary-btn .wc-count{display:inline-block;min-width:1.5em;margin-left:5px;padding:1px 5px;border:1px solid var(--line);border-radius:8px;text-align:center;font-size:.65rem;color:var(--muted)}
    .wc-secondary-btn.active .wc-count{border-color:rgba(212,168,75,.6);color:var(--accent)}
    @media(max-width:760px){
      .wc-workspaces.wc-tiered-nav{margin-top:8px!important}
      .wc-nav-primary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;width:100%}
      .wc-primary-btn{min-width:0;padding:8px 5px;font-size:.67rem;letter-spacing:.04em;text-align:center;overflow:hidden;text-overflow:ellipsis}
      .wc-nav-secondary{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:5px;width:100%;margin-top:5px}.wc-nav-secondary:empty{display:none}
      .wc-secondary-btn{min-width:0;padding:7px 6px;font-size:.65rem;letter-spacing:.035em;text-align:center;white-space:normal}
    }
    @media(max-width:390px){.wc-primary-btn{font-size:.63rem;padding-left:3px;padding-right:3px}.wc-secondary-btn{font-size:.62rem}}
  `;
  document.head.appendChild(style);
}
function sourceButtons(nav){return [...nav.querySelectorAll(':scope > .wc-workspace-btn[data-workspace]')];}
function sourceFor(nav,key){return nav.querySelector(`:scope > .wc-workspace-btn[data-workspace="${key}"]`);}
function activeWorkspace(nav){return sourceButtons(nav).find(button=>button.classList.contains('active'))?.dataset.workspace||'dashboard';}
function ensureHosts(nav){
  let primary=nav.querySelector(':scope > .wc-nav-primary'),secondary=nav.querySelector(':scope > .wc-nav-secondary');
  if(!primary){primary=document.createElement('div');primary.className='wc-nav-primary';primary.setAttribute('aria-label','Warden console sections');nav.insertBefore(primary,nav.firstChild);}
  if(!secondary){secondary=document.createElement('div');secondary.className='wc-nav-secondary';secondary.setAttribute('aria-label','Warden console workspaces');primary.insertAdjacentElement('afterend',secondary);}
  return{primary,secondary};
}
function activateWorkspace(nav,key){sourceFor(nav,key)?.click();}
function renderPrimary(nav,primary,activeGroup){
  GROUPS.forEach(group=>{
    let button=primary.querySelector(`[data-wc-group="${group.key}"]`);
    if(!button){button=document.createElement('button');button.type='button';button.className='wc-primary-btn';button.dataset.wcGroup=group.key;button.textContent=group.label;button.addEventListener('click',()=>{const current=WORKSPACE_GROUP[activeWorkspace(nav)]||'dashboard';if(current!==group.key)activateWorkspace(nav,group.defaultWorkspace);});primary.appendChild(button);}
    const active=group.key===activeGroup;if(button.classList.contains('active')!==active)button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');
  });
}
function syncCount(proxy,source){
  const sourceCount=source?.querySelector('.wc-count');let proxyCount=proxy.querySelector('.wc-count');
  if(!sourceCount){proxyCount?.remove();return;}
  if(!proxyCount){proxyCount=document.createElement('span');proxyCount.className='wc-count';proxy.appendChild(proxyCount);}
  const text=sourceCount.textContent||'0';if(proxyCount.textContent!==text)proxyCount.textContent=text;
}
function renderSecondary(nav,secondary,workspace,activeGroup){
  const keys=ORDER.filter(key=>WORKSPACE_GROUP[key]===activeGroup&&!['dashboard','admin'].includes(key)&&sourceFor(nav,key));const wanted=new Set(keys);
  [...secondary.children].forEach(child=>{if(!wanted.has(child.dataset.wcWorkspace))child.remove();});
  keys.forEach(key=>{
    let button=secondary.querySelector(`[data-wc-workspace="${key}"]`);
    if(!button){button=document.createElement('button');button.type='button';button.className='wc-secondary-btn';button.dataset.wcWorkspace=key;const label=document.createElement('span');label.className='wc-secondary-label';label.textContent=WORKSPACE_LABEL[key]||key;button.appendChild(label);button.addEventListener('click',()=>activateWorkspace(nav,key));secondary.appendChild(button);}
    syncCount(button,sourceFor(nav,key));const active=key===workspace;if(button.classList.contains('active')!==active)button.classList.toggle('active',active);button.setAttribute('aria-current',active?'page':'false');
  });
}
function normalize(){
  if(normalizing)return false;installStyles();const nav=document.getElementById('wardenWorkspaceNav');if(!nav)return false;normalizing=true;
  try{
    if(!nav.classList.contains('wc-tiered-nav'))nav.classList.add('wc-tiered-nav');
    const sources=sourceButtons(nav);sources.forEach(button=>{if(!button.classList.contains('wc-nav-source'))button.classList.add('wc-nav-source');});
    const ordered=ORDER.map(key=>sourceFor(nav,key)).filter(Boolean),current=sources.filter(button=>ORDER.includes(button.dataset.workspace));
    if(current.length!==ordered.length||!ordered.every((button,index)=>current[index]===button))ordered.forEach(button=>nav.appendChild(button));
    const workspace=activeWorkspace(nav),activeGroup=WORKSPACE_GROUP[workspace]||'dashboard',hosts=ensureHosts(nav);renderPrimary(nav,hosts.primary,activeGroup);renderSecondary(nav,hosts.secondary,workspace,activeGroup);
    if(nav.dataset.canonicalHeaderWatch!=='1'){
      nav.dataset.canonicalHeaderWatch='1';
      new MutationObserver(mutations=>{
        const relevant=mutations.some(m=>{const target=m.target.nodeType===1?m.target:m.target.parentElement;return !target?.closest?.('.wc-nav-primary,.wc-nav-secondary');});
        if(!relevant||queued||normalizing)return;queued=true;queueMicrotask(()=>{queued=false;normalize();});
      }).observe(nav,{childList:true,subtree:true});
    }
    return true;
  }finally{normalizing=false;}
}
if(!normalize()){setTimeout(normalize,0);setTimeout(normalize,250);setTimeout(normalize,1000);}
})();
