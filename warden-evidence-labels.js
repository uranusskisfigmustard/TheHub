(() => {
'use strict';
const LABELS=['Reliability','Safety','Worker Fairness','Discretion','Legal / Commercial'];
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function improve(){
  const box=document.getElementById('progRep');
  if(!box)return;
  box.querySelectorAll('tr').forEach(tr=>{
    const td=tr.children[1];
    if(!td||td.dataset.evidenceLabels==='1')return;
    const raw=(td.textContent||'').trim();
    const vals=raw.split('/').map(s=>s.trim());
    if(vals.length!==5)return;
    td.innerHTML=LABELS.map((label,i)=>`<div class="progmini"><span class="label">${esc(label)}</span> ${esc(vals[i]||'—')}</div>`).join('');
    td.dataset.evidenceLabels='1';
  });
}
const obs=new MutationObserver(improve);
function boot(){
  const root=document.getElementById('progressionManager')||document.body;
  obs.observe(root,{childList:true,subtree:true});
  improve();
  document.addEventListener('click',e=>{if(e.target.closest('#refresh'))setTimeout(improve,700)},true);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
