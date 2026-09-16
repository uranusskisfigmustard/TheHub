(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SESSION_KEY='mothership_hub_warden_session_v1';
const $=id=>document.getElementById(id);
let submissions=[],loading=false,scheduled=false;

function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function norm(s){return String(s||'').trim().toUpperCase()}
function session(){try{return String(localStorage.getItem(SESSION_KEY)||'').trim()}catch(_){return''}}
function jsonp(action,p={}){return new Promise((resolve,reject)=>{const callback='__wardenSubmissions'+Date.now()+Math.random().toString(36).slice(2),script=document.createElement('script'),timer=setTimeout(()=>done(new Error('Warden submission service timed out.')),15000);function done(err,data){clearTimeout(timer);try{delete window[callback]}catch(_){window[callback]=undefined}script.remove();err?reject(err):resolve(data)}window[callback]=data=>done(null,data);script.onerror=()=>done(new Error('Warden submission service unavailable.'));script.src=API+'?'+new URLSearchParams({action,callback,...p,_:Date.now()});document.head.appendChild(script)})}

function installStyles(){
  if($('wardenContractSubmissionStyles'))return;
  const s=document.createElement('style');s.id='wardenContractSubmissionStyles';s.textContent=`
    .warden-submissions{margin-top:12px;padding-top:10px;border-top:1px solid #303538}
    .warden-submissions>summary{cursor:pointer;font-size:.72rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#d4a84b}
    .warden-submission-list{display:grid;gap:9px;margin-top:10px}
    .warden-submission-entry{border-left:2px solid #596064;background:#15181a;padding:9px 10px}
    .warden-submission-head{color:var(--muted);font-size:.68rem;letter-spacing:.045em;text-transform:uppercase;margin-bottom:5px}
    .warden-submission-text{white-space:pre-wrap;overflow-wrap:anywhere;font-size:.82rem;line-height:1.48;color:var(--text)}
  `;document.head.appendChild(s)
}

function cardIdentifier(card){
  const meta=card?.querySelector('.meta');
  return String(meta?.textContent||'').split(' · ')[0].trim();
}
function groupFor(identifier,title){
  const id=norm(identifier),t=norm(title);
  const direct=submissions.filter(x=>norm(x.contractId)===id||norm(x.jobId)===id);
  if(direct.length)return direct;
  return t?submissions.filter(x=>norm(x.title)===t):[];
}
function displayTimestamp(item){
  const parts=[];
  if(item.campaignDate)parts.push(item.campaignDate);
  if(item.submittedAt){
    const d=new Date(item.submittedAt);
    if(!Number.isNaN(d.getTime()))parts.push(d.toLocaleString());
  }
  return parts.join(' · ');
}
function render(){
  const cards=[...document.querySelectorAll('#cards article.card')];
  cards.forEach(card=>{
    const title=String(card.querySelector('.title')?.textContent||'').trim();
    const group=groupFor(cardIdentifier(card),title);
    const prior=card.querySelector('.warden-submissions');
    if(!group.length){if(prior)prior.remove();return}
    const signature=group.map(x=>x.submissionId||x.submittedAt||x.text).join('|');
    if(prior?.dataset.signature===signature)return;
    if(prior)prior.remove();
    const details=document.createElement('details');details.className='warden-submissions';details.dataset.signature=signature;
    details.innerHTML=`<summary>PLAYER SUBMISSIONS · ${group.length}</summary><div class="warden-submission-list">${group.map((item,index)=>`<div class="warden-submission-entry"><div class="warden-submission-head">SUBMISSION ${index+1}${displayTimestamp(item)?' · '+esc(displayTimestamp(item)):''}</div><div class="warden-submission-text">${esc(item.text)}</div></div>`).join('')}</div>`;
    const resolve=card.querySelector('[data-r]')?.parentElement;
    if(resolve)card.insertBefore(details,resolve);else card.appendChild(details);
  });
}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;render()},40)}
async function load(){
  const token=session();
  const consoleEl=$('console');
  if(!token||!consoleEl||consoleEl.classList.contains('hidden')||loading)return;
  loading=true;
  try{
    const response=await jsonp('wardensubmissions',{session:token});
    if(!response?.ok)throw new Error(response?.error||response?.message||'Could not load player submissions.');
    submissions=Array.isArray(response.submissions)?response.submissions:[];
    render();
  }catch(_){/* Base Warden console owns authentication and service errors. */}
  finally{loading=false}
}

installStyles();
const cards=$('cards');if(cards)new MutationObserver(()=>{schedule()}).observe(cards,{childList:true,subtree:false});
const consoleEl=$('console');if(consoleEl)new MutationObserver(()=>{if(!consoleEl.classList.contains('hidden'))setTimeout(load,220);else{submissions=[];document.querySelectorAll('.warden-submissions').forEach(x=>x.remove())}}).observe(consoleEl,{attributes:true,attributeFilter:['class']});
document.addEventListener('click',event=>{if(event.target.closest('#refresh'))setTimeout(load,300);if(event.target.closest('#lock,#playerPage')){submissions=[];document.querySelectorAll('.warden-submissions').forEach(x=>x.remove())}},true);
setTimeout(load,900);
})();
