(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const BOARD_SESSION_KEY='mothership_hub_board_session_v1';
const BOARD_EXPIRY_KEY='mothership_hub_board_session_expiry_v1';
const $=id=>document.getElementById(id);
let scheduled=false;

function session(){
  const shared=window.__hubBoardAuth?.getSessionToken?.();
  if(shared)return String(shared).trim();
  try{
    const token=String(localStorage.getItem(BOARD_SESSION_KEY)||'').trim();
    const expiry=Number(localStorage.getItem(BOARD_EXPIRY_KEY)||0);
    if(token&&Number.isFinite(expiry)&&expiry>Date.now()+5000)return token;
  }catch(_){}
  return'';
}
function jsonp(action,p={}){return new Promise((resolve,reject)=>{const callback='__contractSubmission'+Date.now()+Math.random().toString(36).slice(2),script=document.createElement('script'),timer=setTimeout(()=>done(new Error('Submission service timed out.')),15000);function done(err,data){clearTimeout(timer);try{delete window[callback]}catch(_){window[callback]=undefined}script.remove();err?reject(err):resolve(data)}window[callback]=data=>done(null,data);script.onerror=()=>done(new Error('Submission service unavailable.'));script.src=API+'?'+new URLSearchParams({action,callback,...p,_:Date.now()});document.head.appendChild(script)})}
function authenticationError(value){
  const message=String(value?.error||value?.message||value||'').toLowerCase();
  return message.includes('board authentication required')||message.includes('invalid board access code')||message.includes('invalid board session')||message.includes('expired board session')||message.includes('session expired')||message.includes('authentication required');
}
async function requestSession(message=''){
  const current=session();
  if(current)return current;
  const auth=window.__hubBoardAuth;
  if(!auth?.requestAuthentication)return'';
  return String(await auth.requestAuthentication(message)||'').trim();
}
async function sendSubmission(record,text){
  let token=await requestSession();
  if(!token)return{cancelled:true};

  let response=await jsonp('contractsubmit',{session:token,job:String(record.jobId||''),contract:String(record.contractId||''),text});
  if(authenticationError(response)){
    window.__hubBoardAuth?.clearSession?.();
    token=await requestSession('SESSION EXPIRED // ENTER REQUEST CODE');
    if(!token)return{cancelled:true};
    response=await jsonp('contractsubmit',{session:token,job:String(record.jobId||''),contract:String(record.contractId||''),text});
  }
  return response;
}

function installStyles(){
  if($('contractSubmissionStyles'))return;
  const s=document.createElement('style');s.id='contractSubmissionStyles';s.textContent=`
    .contract-detail-value{white-space:normal;overflow-wrap:anywhere}
    .contract-submit{margin-top:14px;padding-top:12px;border-top:1px solid #303538}
    .contract-submit-label{font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#d8d4c8}
    .contract-submit-help{margin:4px 0 8px;color:var(--muted);font-size:.75rem;line-height:1.45}
    .contract-submit-text{width:100%;min-height:112px;resize:vertical;padding:10px;color:var(--text);background:#0c0f10;border:1px solid var(--line);border-radius:3px;font:inherit;line-height:1.45}
    .contract-submit-text:focus{outline:none;border-color:var(--accent)}
    .contract-submit-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:8px}
    .contract-submit-count,.contract-submit-result{font-size:.7rem;color:var(--muted)}
    .contract-submit-result.ok{color:#bdd2aa}.contract-submit-result.bad{color:#e5aaa0}
    .contract-submit-btn{font:inherit;color:var(--text);background:rgba(212,168,75,.10);border:1px solid var(--accent);border-radius:3px;padding:8px 11px;cursor:pointer;font-size:.72rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .contract-submit-btn:hover:not(:disabled){background:rgba(212,168,75,.17)}.contract-submit-btn:disabled{opacity:.45;cursor:not-allowed}
  `;document.head.appendChild(s)
}

function contractState(){return window.__hubPlayerShell?.getContractState?.().contracts||null}
function key(record){return String(record?.contractId||record?.jobId||'').trim()}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;enhance()},35)}
function cleanLine(value){return String(value||'').replace(/^\s*[-•]\s*/,'').replace(/\s+/g,' ').trim()}
function section(text,heading,nextHeadings){
  const source=String(text||'');
  const safe=String(heading).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const next=nextHeadings.map(x=>String(x).replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('|');
  const re=new RegExp('(?:^|\\n)'+safe+'\\s*\\n([\\s\\S]*?)(?=\\n\\s*(?:'+next+')\\s*(?:\\n|$)|$)','i');
  return source.match(re)?.[1]||'';
}
function acceptedDetails(record){
  const text=String(record?.brief?.text||'');
  const paySection=section(text,'PAY',['EXPECTED WORK','AUTHORIZED / PROVIDED','ASSIGNMENT LIMITS','KNOWN RISKS','SUCCESSFUL CLOSEOUT']);
  const payLines=paySection.split(/\r?\n/).map(cleanLine).filter(Boolean);
  const workSection=section(text,'EXPECTED WORK',['AUTHORIZED / PROVIDED','ASSIGNMENT LIMITS','KNOWN RISKS','SUCCESSFUL CLOSEOUT']);
  const workLines=workSection.split(/\r?\n/).map(cleanLine).filter(Boolean);
  return {
    payoutStress:cleanLine(record?.payoutStress)||payLines.join(' · '),
    expectedWork:cleanLine(record?.expectedWork)||workLines[0]||''
  };
}
function addMetaRow(meta,label,value){
  if(!meta||!value)return;
  const l=document.createElement('div');l.className='label contract-card-extra';l.textContent=label;
  const v=document.createElement('div');v.className='value contract-detail-value contract-card-extra';v.textContent=value;
  meta.append(l,v);
}
function compactCard(card,record){
  if(!card||!record)return;
  card.querySelectorAll('.contract-card-extra').forEach(x=>x.remove());
  card.querySelectorAll('details').forEach(details=>{
    const summary=details.querySelector('summary');
    if(/mission briefing/i.test(String(summary?.textContent||'')))details.remove();
  });
  const meta=card.querySelector('.meta');
  const details=acceptedDetails(record);
  addMetaRow(meta,'Payout / Stress',details.payoutStress);
  addMetaRow(meta,'Expected Work',details.expectedWork);
}

function enhanceCard(card,record){
  if(!card||!record)return;
  compactCard(card,record);
  const recordKey=key(record);
  const prior=card.querySelector('.contract-submit');
  if(prior&&prior.dataset.contractKey===recordKey)return;
  if(prior)prior.remove();

  const box=document.createElement('section');box.className='contract-submit';box.dataset.contractKey=recordKey;
  box.innerHTML=`<div class="contract-submit-label">WHAT DO YOU DO?</div><div class="contract-submit-help">Optional. Send a declared action to the Warden for review. Submitting does not resolve the contract.</div><textarea class="contract-submit-text" maxlength="2000" placeholder="Describe what you do…" aria-label="Describe what you do"></textarea><div class="contract-submit-row"><div><span class="contract-submit-count">0 / 2000</span><span class="contract-submit-result" aria-live="polite" style="margin-left:10px"></span></div><button type="button" class="contract-submit-btn">SUBMIT TO WARDEN</button></div>`;
  card.appendChild(box);

  const textarea=box.querySelector('.contract-submit-text'),button=box.querySelector('.contract-submit-btn'),count=box.querySelector('.contract-submit-count'),result=box.querySelector('.contract-submit-result');
  textarea.addEventListener('input',()=>{count.textContent=textarea.value.length+' / 2000';result.textContent='';result.className='contract-submit-result'});
  button.addEventListener('click',async()=>{
    const text=textarea.value.trim();
    result.textContent='';result.className='contract-submit-result';
    if(!text){result.textContent='ENTER AN ACTION BEFORE SUBMITTING.';result.classList.add('bad');return}

    button.disabled=true;textarea.disabled=true;button.textContent=session()?'SUBMITTING…':'AUTHENTICATING…';
    try{
      const response=await sendSubmission(record,text);
      if(response?.cancelled){result.textContent='SUBMISSION NOT SENT // AUTHORIZATION CANCELLED.';result.classList.add('bad');return}
      if(!response?.ok||!response?.submitted)throw new Error(response?.error||response?.message||'Submission was not accepted.');
      textarea.value='';count.textContent='0 / 2000';
      result.textContent='SUBMITTED TO WARDEN'+(response.campaignDate?' // '+response.campaignDate:'');result.classList.add('ok');
    }catch(error){
      const message=String(error?.message||error);
      result.textContent=authenticationError(message)?'BOARD ACCESS REQUIRED // AUTHENTICATION FAILED.':message.toUpperCase();result.classList.add('bad');
    }finally{button.disabled=false;textarea.disabled=false;button.textContent='SUBMIT TO WARDEN'}
  });
}

function enhance(){
  const state=contractState();
  const records=Array.isArray(state?.active)?state.active:[];
  const cards=[...document.querySelectorAll('#active article.card.active')];
  cards.forEach((card,index)=>enhanceCard(card,records[index]));
}

installStyles();
window.addEventListener('hub-player-contracts-updated',schedule);
const active=$('active');if(active)new MutationObserver(schedule).observe(active,{childList:true,subtree:false});
document.addEventListener('click',event=>{if(event.target.closest('#refresh'))setTimeout(schedule,250)},true);
schedule();setTimeout(schedule,900);
})();
