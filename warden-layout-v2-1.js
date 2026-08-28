(() => {
'use strict';
const SK='mothership_hub_warden_session_v1';
const UI_KEYS=['mothership_hub_warden_workspace_v2','mothership_hub_warden_selected_npc_v2','mothership_hub_warden_selected_faction_v2'];
let cleanupTimer=null;
function hasSession(){try{return Boolean(localStorage.getItem(SK)||'')}catch(_){return false}}
function dropUiState(){
  try{UI_KEYS.forEach(k=>sessionStorage.removeItem(k))}catch(_){}
  delete document.body.dataset.wcWorkspace;
}
function clearStaleWardenUi(){
  if(hasSession())return;
  dropUiState();
  const dashboard=document.querySelector('.wc-workspace-btn[data-workspace="dashboard"]');
  if(dashboard&&!dashboard.classList.contains('active'))dashboard.click();
  clearTimeout(cleanupTimer);
  cleanupTimer=setTimeout(()=>{if(!hasSession())dropUiState()},100);
}
clearStaleWardenUi();
const consoleEl=document.getElementById('console');
if(consoleEl)new MutationObserver(()=>{if(consoleEl.classList.contains('hidden'))clearStaleWardenUi()}).observe(consoleEl,{attributes:true,attributeFilter:['class']});
document.addEventListener('click',e=>{if(e.target.closest('#lock,#playerPage')){setTimeout(clearStaleWardenUi,0);setTimeout(clearStaleWardenUi,150)}},true);
})();