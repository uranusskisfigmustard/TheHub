(() => {
'use strict';
const SK='mothership_hub_warden_session_v1';
const UI_KEYS=['mothership_hub_warden_workspace_v2','mothership_hub_warden_selected_npc_v2','mothership_hub_warden_selected_faction_v2'];
function clearStaleWardenUi(){
  let token='';
  try{token=localStorage.getItem(SK)||''}catch(_){token=''}
  if(token)return;
  try{UI_KEYS.forEach(k=>sessionStorage.removeItem(k))}catch(_){}
  const dashboard=document.querySelector('.wc-workspace-btn[data-workspace="dashboard"]');
  if(dashboard&&!dashboard.classList.contains('active'))dashboard.click();
  try{UI_KEYS.forEach(k=>sessionStorage.removeItem(k))}catch(_){}
  delete document.body.dataset.wcWorkspace;
}
clearStaleWardenUi();
const consoleEl=document.getElementById('console');
if(consoleEl)new MutationObserver(()=>{if(consoleEl.classList.contains('hidden'))clearStaleWardenUi()}).observe(consoleEl,{attributes:true,attributeFilter:['class']});
})();