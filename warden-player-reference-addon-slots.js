(() => {
'use strict';

// Legacy compatibility shim. Current player-reference data stores the canonical
// add-on slot labels directly, so this must never continuously observe/rewrite
// the Warden DOM.
const KEY='mothership_hub_player_reference_working_v1';
const ADDONS=new Set(['Emergency Disconnect','Isolation Buffer']);

function normalizeStoredDraft(){
  let value=null;
  try{value=JSON.parse(localStorage.getItem(KEY)||'null')}catch(_){value=null}
  if(!value||!Array.isArray(value.data)) return;
  let changed=false;
  value.data.forEach(category=>{
    (category?.sections||[]).forEach(section=>{
      (section?.items||[]).forEach(item=>{
        if(String(item?.title||'')!=='Grade 4 — Low-Grade Cybernetics') return;
        (item?.blocks||[]).forEach(block=>{
          if(block?.type!=='table'||!Array.isArray(block.rows)) return;
          block.rows.forEach(row=>{
            if(!Array.isArray(row)||row.length<3||!ADDONS.has(String(row[0]||'').trim())) return;
            if(String(row[2]||'')!=='N/A Add-on'){
              row[2]='N/A Add-on';
              changed=true;
            }
          });
        });
      });
    });
  });
  if(changed){
    value.savedAt=new Date().toISOString();
    try{localStorage.setItem(KEY,JSON.stringify(value))}catch(_){}
  }
}

function normalizeRenderedTables(){
  document.querySelectorAll('table tbody tr').forEach(row=>{
    const cells=row.querySelectorAll('td');
    if(cells.length<3) return;
    if(
      ADDONS.has(String(cells[0].textContent||'').trim()) &&
      String(cells[2].textContent||'')!=='N/A Add-on'
    ) cells[2].textContent='N/A Add-on';
  });
}

normalizeStoredDraft();
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',normalizeRenderedTables,{once:true});
}else{
  normalizeRenderedTables();
}
})();
