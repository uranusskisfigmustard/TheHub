(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SESSION_KEY='mothership_hub_warden_session_v1';
const STATE_KEY='mothership_hub_warden_between_session_v1';
const JOBS_CACHE='mothership_hub_jobs_v5';
const FLOW={feed:null,active:false,compact:false,applyStress:false,contract:null,row:null,key:'',amount:0,stressPreviews:[],stressCommits:[],preparing:false};
let scheduled=false,feedLoading=false;
const normalize=v=>String(v??'').toLowerCase().replace(/\s+/g,' ').trim();
const upper=v=>String(v??'').trim().toUpperCase();
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>(Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})+'cr';
const CLOCK_ICON='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M12 7.2v5.2l3.5 2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function session(){return localStorage.getItem(SESSION_KEY)||''}
function states(){try{const x=JSON.parse(localStorage.getItem(STATE_KEY)||'{}');return x&&typeof x==='object'?x:{}}catch(_){return{}}}
function save(x){try{localStorage.setItem(STATE_KEY,JSON.stringify(x))}catch(_){}}
function jobs(){try{const x=JSON.parse(localStorage.getItem(JOBS_CACHE)||'[]');return Array.isArray(x)?x:[]}catch(_){return[]}}
function title(card){return String(card?.querySelector('.title')?.textContent||'').trim()}
function key(card){const text=String(card?.querySelector('.meta')?.textContent||'').trim();return text.split('·')[0].trim()||title(card)}
function creditAmount(value){const m=String(value||'').match(/([\d,]+(?:\.\d+)?)\s*cr/i);return m?Number(m[1].replace(/,/g,'')):0}
function stressCost(value){const m=String(value||'').match(/\+\s*(\d+)\s*stress\b/i);return m?Number(m[1]):0}
function rowValue(row,...names){for(const n of names){if(row&&row[n]!==undefined&&row[n]!==null&&String(row[n]).trim()!=='')return row[n]}return''}
function rowForCard(card){
  const id=normalize(key(card)),t=normalize(title(card));
  return jobs().find(r=>id&&normalize(r?.['Job ID']||r?.jobId||r?.id)===id)||jobs().find(r=>t&&normalize(r?.Title||r?.title)===t)||null;
}
function rowForContract(c){
  const id=normalize(c?.jobId||''),t=normalize(c?.title||'');
  return jobs().find(r=>id&&normalize(r?.['Job ID']||r?.jobId||r?.id)===id)||jobs().find(r=>t&&normalize(r?.Title||r?.title)===t)||null;
}
function kindForRow(row){
  if(!row)return'';
  const pay=String(rowValue(row,'Pay','pay'));if(!stressCost(pay))return'';
  const amount=creditAmount(pay);if(amount>=1500&&amount<=2500)return'medium';if(amount>0&&amount<1500)return'simple';return'between';
}
function kindForCard(card){return kindForRow(rowForCard(card))}
function contractKey(c){return String(c?.contractId||c?.jobId||c?.title||'').trim()}
function markerFor(c){return 'Between-session closeout '+contractKey(c)+':'}
function summaryFor(c){return String(c?.title||'Between-session job').trim()+' completed within the accepted contract scope.'}
function outcomeFor(row){const scope=String(rowValue(row,'Contract Scope','Work Type')||'accepted contract').trim();return scope+' completed within the accepted contract scope.'}
function payoutReasonFor(c,amount){return 'Posted fixed pay from the accepted Mission Board posting for '+String(c?.title||'this job')+': '+money(amount)+'.'}

function jsonp(action,p={}){return new Promise((resolve,reject)=>{const cb='__wbs'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script'),timer=setTimeout(()=>done(new Error('Warden service timed out.')),30000);function done(err,data){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(data)}window[cb]=d=>done(null,d);sc.onerror=()=>done(new Error('Could not reach Warden service.'));sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p});document.head.appendChild(sc)})}

function installStyles(){
  if($('wardenBetweenSessionStyles'))return;
  const s=document.createElement('style');s.id='wardenBetweenSessionStyles';s.textContent=`
    .bsw-tag{display:inline-flex;align-items:center;gap:6px;border:1px solid #66879a;color:#b8d3df;background:rgba(64,91,105,.13);padding:3px 7px;margin:9px 6px 0 0;font-size:.7rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
    .bsw-tag.simple{border-color:#536249;color:#bdd2aa;background:rgba(48,66,43,.16)}
    .bsw-tag.clarify{border-color:#8a611f;color:#efbd74;background:rgba(83,55,15,.14)}
    .bsw-icon{display:inline-flex;width:14px;height:14px;flex:0 0 14px}.bsw-icon svg{display:block;width:100%;height:100%}
    .bsw-note{margin-top:10px;padding:8px 9px;border-left:2px solid #66879a;color:#c5c1b4;font-size:.75rem;line-height:1.45}
    .bsw-note.simple{border-left-color:#536249}.bsw-actions{display:flex!important;gap:8px!important;flex-wrap:wrap!important}.bsw-clarify{border-color:#8a611f!important}
    #bswGenerated{border-color:#536249;background:rgba(48,66,43,.10);margin-top:14px}
    #bswGenerated .bsw-generated-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px}
    #bswGenerated .bsw-generated-item{border-top:1px solid #303538;padding-top:7px}.bsw-generated-item.wide{grid-column:1/-1}
    #bswGenerated .bsw-value{margin-top:2px;white-space:pre-wrap}.bsw-auto-hidden{display:none!important}
    #bswEditFull{margin-right:auto}
    @media(max-width:620px){.bsw-actions>.btn{flex:1 1 100%;width:100%}.bsw-note{font-size:.72rem}#bswGenerated .bsw-generated-grid{grid-template-columns:1fr}.bsw-generated-item.wide{grid-column:auto}}
  `;document.head.appendChild(s)
}
function iconLabel(text){return `<span class="bsw-icon">${CLOCK_ICON}</span><span>${text}</span>`}

function updateCard(card){
  const kind=kindForCard(card);if(!kind)return;
  const k=key(card),map=states(),mode=kind==='medium'&&map[k]==='clarification'?'clarification':'awaiting';
  let tag=card.querySelector('.bsw-tag');if(!tag){tag=document.createElement('span');tag.className='bsw-tag';const tags=card.querySelectorAll('.tag');const last=tags[tags.length-1];if(last)last.insertAdjacentElement('afterend',tag);else card.querySelector('.pay')?.insertAdjacentElement('afterend',tag)}
  const tagText=kind==='medium'?(mode==='clarification'?'NEEDS CLARIFICATION':'AWAITING SUMMARY'):'SIMPLE BETWEEN-SESSION';
  tag.innerHTML=iconLabel(tagText);tag.classList.toggle('clarify',mode==='clarification');tag.classList.toggle('simple',kind==='simple');
  let note=card.querySelector('.bsw-note');if(!note){note=document.createElement('div');note.className='bsw-note';const resolve=card.querySelector('[data-r]');resolve?.parentElement?.insertAdjacentElement('beforebegin',note)}
  if(note){note.classList.toggle('simple',kind==='simple');note.textContent=kind==='medium'?'BETWEEN-SESSION WORK // Review the players’ brief description of the difficulty and how they handled it before closeout.':'SIMPLE BETWEEN-SESSION WORK // COMPLETE generates pay, +1 Stress, closeout text, and the audited preview for Warden approval.'}
  const resolve=card.querySelector('[data-r]');if(!resolve)return;resolve.textContent='COMPLETE';resolve.title=kind==='medium'?'Open audited closeout after reviewing the between-session summary.':'Generate the simple audited closeout package for review.';
  const host=resolve.parentElement;if(host)host.classList.add('bsw-actions');
  let clarify=card.querySelector('[data-bsw-clarify]');
  if(kind==='medium'){
    if(!clarify){clarify=document.createElement('button');clarify.type='button';clarify.className='btn bsw-clarify';clarify.dataset.bswClarify='1';host?.appendChild(clarify);clarify.addEventListener('click',()=>{const next=states();if(next[k]==='clarification')delete next[k];else next[k]='clarification';save(next);updateCard(card)})}
    clarify.textContent=mode==='clarification'?'MARK AWAITING SUMMARY':'NEEDS CLARIFICATION';
  }else if(clarify){clarify.remove()}
  const reject=card.querySelector('[data-warden-reject]');if(reject){reject.textContent='RETURN TO BOARD';reject.title='Cancel this acceptance and return the mission to the public board.';if(host&&reject.parentElement===host&&host.lastElementChild!==reject)host.appendChild(reject)}
}
function run(){installStyles();document.querySelectorAll('#cards article.card').forEach(updateCard)}
function schedule(){if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;run()},80)}

function installGeneratedPanel(){
  const shell=$('modal')?.querySelector('.shell');if(!shell||$('bswGenerated'))return;
  const grid=shell.querySelector('.grid');if(!grid)return;
  const box=document.createElement('div');box.id='bswGenerated';box.className='review hidden';grid.insertAdjacentElement('beforebegin',box);
  const actions=shell.querySelector('.mactions');if(actions&&!$('bswEditFull')){const b=document.createElement('button');b.id='bswEditFull';b.type='button';b.className='btn hidden';b.textContent='EDIT FULL CLOSEOUT';actions.insertBefore(b,actions.firstChild);b.addEventListener('click',showFullCloseout)}
}
function compactTargets(){
  const shell=$('modal')?.querySelector('.shell');if(!shell)return[];
  const out=[];
  const grid=shell.querySelector('.grid');if(grid)out.push(grid);
  const calc=shell.querySelector('.calc');if(calc)out.push(calc);
  if($('review'))out.push($('review'));
  shell.querySelectorAll('.rewardbox').forEach(x=>out.push(x));
  return [...new Set(out)].filter(Boolean).filter(x=>x.id!=='bswGenerated');
}
function setCompact(on){FLOW.compact=Boolean(on);compactTargets().forEach(x=>x.classList.toggle('bsw-auto-hidden',FLOW.compact));$('preview')?.classList.toggle('bsw-auto-hidden',FLOW.compact);$('bswEditFull')?.classList.toggle('hidden',!FLOW.compact)}
function showFullCloseout(){if(!FLOW.active)return;setCompact(false);$('bswGenerated')?.classList.remove('hidden');$('bswEditFull')?.classList.add('hidden');if($('commit'))$('commit').textContent='COMMIT CLOSEOUT';const note=$('result');if(note){note.textContent='Generated values remain populated. Edit anything needed, then Preview Changes again. A Completed closeout will still apply the posted +1 Stress.';note.className='notice warn'}}
function resetFlow(){FLOW.active=false;FLOW.compact=false;FLOW.applyStress=false;FLOW.contract=null;FLOW.row=null;FLOW.key='';FLOW.amount=0;FLOW.stressPreviews=[];FLOW.stressCommits=[];FLOW.preparing=false;setCompact(false);$('bswGenerated')?.classList.add('hidden');$('bswEditFull')?.classList.add('hidden')}
function dispatchInput(el){if(el)el.dispatchEvent(new Event('input',{bubbles:true}))}
function dispatchChange(el){if(el)el.dispatchEvent(new Event('change',{bubbles:true}))}
function waitFor(test,attempts=50,delay=30){return new Promise((resolve,reject)=>{let n=0;const tick=()=>{let value=null;try{value=test()}catch(_){}if(value)return resolve(value);if(++n>=attempts)return reject(new Error('The closeout form did not finish loading.'));setTimeout(tick,delay)};tick()})}

async function loadFeed(){
  if(feedLoading||!session())return FLOW.feed;feedLoading=true;
  try{const r=await jsonp('wardenfeed',{session:session()});if(r?.ok)FLOW.feed=r;return FLOW.feed}catch(_){return FLOW.feed}finally{feedLoading=false}
}
function activeContractForButton(btn){const idx=Number(btn?.dataset?.r);return Number.isInteger(idx)?FLOW.feed?.active?.[idx]||null:null}

async function stressPreviewsFor(c){
  const participants=Array.isArray(c?.participants)?c.participants.map(x=>String(x||'').trim()).filter(Boolean):[];
  if(!participants.length)throw new Error('No participant is recorded for this accepted contract.');
  const feed=await jsonp('wardenadjustfeed',{session:session()});if(!feed?.ok)throw new Error(feed?.error||'Current Stress could not be loaded.');
  const targets=Array.isArray(feed.targets)?feed.targets:[];
  const previews=[];
  for(const name of participants){
    const t=targets.find(x=>upper(x.domain)==='CHARACTER STATUS'&&upper(x.field)==='CURRENT STRESS'&&normalize(String(x.label||'').split('—')[0])===normalize(name));
    if(!t)throw new Error(name+': Current Stress is not available as an audited target.');
    const current=Number(t.currentValue);if(!Number.isInteger(current))throw new Error(name+': Current Stress is not machine-readable.');
    const next=current+1;if(next>Number(t.max??20))throw new Error(name+': +1 Stress would exceed the supported Current Stress range.');
    const reason=markerFor(c)+' +1 Stress for '+name+'.';
    const p=await jsonp('wardenadjustpreview',{session:session(),target:t.id,value:String(next),reason});
    if(!p?.ok)throw new Error(p?.error||name+': Stress preview failed.');
    previews.push({name,target:t.id,from:current,to:next,reason,stateToken:p.stateToken});
  }
  return previews;
}

function renderGenerated(){
  const box=$('bswGenerated');if(!box||!FLOW.contract)return;
  const c=FLOW.contract,stress=FLOW.stressPreviews.length?FLOW.stressPreviews.map(x=>`${esc(x.name)}: ${esc(x.from)} → ${esc(x.to)}`).join('<br>'):'Not resolved';
  box.innerHTML=`<div class="label">GENERATED BETWEEN-SESSION CLOSEOUT</div><div class="small">Review the generated values. Nothing is committed until you approve the audited closeout.</div><div class="bsw-generated-grid">
    <div class="bsw-generated-item"><span class="label">STATUS</span><div class="bsw-value">Completed</div></div>
    <div class="bsw-generated-item"><span class="label">CLOSED DATE</span><div class="bsw-value">${esc($('closed')?.value||'')}</div></div>
    <div class="bsw-generated-item"><span class="label">POSTED PAY</span><div class="bsw-value">${esc(money(FLOW.amount))}</div></div>
    <div class="bsw-generated-item"><span class="label">STRESS</span><div class="bsw-value">${stress}</div></div>
    <div class="bsw-generated-item"><span class="label">CONTRACTOR</span><div class="bsw-value">None / 0cr</div></div>
    <div class="bsw-generated-item"><span class="label">CANONICAL OUTCOME</span><div class="bsw-value">${esc($('outcome')?.value||'Preserve existing')}</div></div>
    <div class="bsw-generated-item wide"><span class="label">PLAYER-SAFE CLOSEOUT</span><div class="bsw-value">${esc($('summary')?.value||'')}</div></div>
  </div>`;
  box.classList.remove('hidden');
}

async function prepareSimpleFlow(btn,c,row){
  if(FLOW.preparing)return;FLOW.preparing=true;
  try{
    installGeneratedPanel();
    await waitFor(()=>$('modal')&&!$('modal').classList.contains('hidden')&&$('manualPayoutReason'));
    FLOW.active=true;FLOW.contract=c;FLOW.row=row;FLOW.key=contractKey(c);FLOW.amount=creditAmount(rowValue(row,'Pay','pay'));FLOW.applyStress=true;
    if(Array.isArray(c?.payoutComponents)&&c.payoutComponents.length)throw new Error('This accepted contract has payout components that require Warden judgment.');
    if(c?.qualifiedContractorConfirmed||String(c?.contractorName||'').trim()||Number(c?.contractorCompensation||0)>0)throw new Error('This accepted contract has a contractor or specialist obligation that requires Warden review.');
    $('mkicker').textContent='SIMPLE BETWEEN-SESSION CLOSEOUT';
    $('cstatus').value='Completed';dispatchChange($('cstatus'));
    $('gross').value=String(FLOW.amount);dispatchInput($('gross'));
    $('contractor').value='0';dispatchInput($('contractor'));
    const contractorName=$('contractorName');if(contractorName){contractorName.value='';dispatchInput(contractorName)}
    $('summary').value=summaryFor(c);dispatchInput($('summary'));
    $('outcome').value=outcomeFor(row);dispatchInput($('outcome'));
    const reason=$('manualPayoutReason');if(reason){reason.value=payoutReasonFor(c,FLOW.amount);dispatchInput(reason)}
    FLOW.stressPreviews=await stressPreviewsFor(c);
    renderGenerated();setCompact(true);
    if($('commit')){$('commit').textContent='APPROVE & COMMIT';$('commit').disabled=true}
    if($('preview')){$('preview').disabled=false;$('preview').click()}
  }catch(e){
    setCompact(false);FLOW.applyStress=false;
    const box=$('bswGenerated');if(box){box.innerHTML='<div class="label">AUTOMATIC CLOSEOUT NEEDS REVIEW</div><div class="small">'+esc(String(e.message||e))+'</div>';box.classList.remove('hidden')}
    const result=$('result');if(result){result.textContent='The routine closeout fields were populated where possible, but automatic resolution stopped before commit. Review the full closeout and current-state change manually.';result.className='notice warn'}
  }finally{FLOW.preparing=false}
}

async function commitStressPreviews(){
  const committed=[];
  for(const p of FLOW.stressPreviews){
    const r=await jsonp('wardenadjustcommit',{session:session(),target:p.target,value:String(p.to),reason:p.reason,stateToken:p.stateToken});
    if(!r?.ok)throw Object.assign(new Error(r?.error||p.name+': +1 Stress could not be committed.'),{committed});
    committed.push({transactionId:r.transactionId,preview:p});
  }
  return committed;
}
async function rollbackStress(committed){
  const errors=[];
  for(const x of [...(committed||[])].reverse()){
    try{const r=await jsonp('wardenadjustundo',{session:session(),transaction:x.transactionId});if(!r?.ok)throw new Error(r?.error||'Stress undo failed.')}catch(e){errors.push(String(e.message||e))}
  }
  return errors;
}
async function rollbackCloseout(tx){if(!tx)return[];try{const r=await jsonp('wardenundo',{session:session(),transaction:tx});if(!r?.ok)throw new Error(r?.error||'Closeout undo failed.');return[]}catch(e){return[String(e.message||e)]}}

function installCloseoutInterceptor(){
  const prev=Node.prototype.appendChild;if(prev.__wardenBetweenSessionPatched)return;
  function patched(node){
    if(node instanceof HTMLScriptElement&&node.src){
      let url=null;try{url=new URL(node.src,location.href)}catch(_){}
      if(url){const api=new URL(API);if(url.origin===api.origin&&url.pathname===api.pathname&&String(url.searchParams.get('action')||'').toLowerCase()==='wardenclose'&&FLOW.active&&FLOW.applyStress){
        const cb=url.searchParams.get('callback'),original=cb?window[cb]:null;
        if(cb&&typeof original==='function'&&!original.__wardenBetweenSessionWrapped){
          const wrapped=payload=>{
            if(!payload?.ok){original(payload);return}
            (async()=>{
              let committed=[];
              try{committed=await commitStressPreviews();FLOW.stressCommits=committed;original(payload)}catch(err){
                committed=err?.committed||committed;
                const stressErrors=await rollbackStress(committed);
                const closeoutErrors=await rollbackCloseout(payload.transactionId);
                const recoveryErrors=stressErrors.concat(closeoutErrors);
                FLOW.stressCommits=[];
                const base='Automatic between-session closeout stopped because the posted +1 Stress could not be committed.';
                const recovery=recoveryErrors.length?' Automatic recovery was incomplete: '+recoveryErrors.join(' | ')+' Review the Warden audit before further changes.':' No campaign changes were kept.';
                original({ok:false,error:base+recovery});
              }
            })();
          };wrapped.__wardenBetweenSessionWrapped=true;window[cb]=wrapped;
        }
      }}
    }
    return prev.call(this,node)
  }
  patched.__wardenBetweenSessionPatched=true;Node.prototype.appendChild=patched;
}

async function linkedStressHistory(c){
  const r=await jsonp('wardenadjustfeed',{session:session()});if(!r?.ok)throw new Error(r?.error||'Audited Stress history could not be loaded.');
  const marker=markerFor(c);return (r.history||[]).filter(x=>x?.canUndo&&String(x.reason||'').startsWith(marker));
}
async function reapplyStress(items,c){
  const errors=[];
  for(const item of items){
    try{
      const target=item?.after?.targetId,value=item?.after?.value;if(!target||value===undefined)throw new Error('Missing audited Stress snapshot.');
      const name=String(item?.after?.character||item?.after?.label||'participant');
      const reason=markerFor(c)+' +1 Stress for '+name+'. Reapplied after closeout Undo was refused.';
      const p=await jsonp('wardenadjustpreview',{session:session(),target,value:String(value),reason});if(!p?.ok)throw new Error(p?.error||'Stress restore preview failed.');
      const r=await jsonp('wardenadjustcommit',{session:session(),target,value:String(value),reason,stateToken:p.stateToken});if(!r?.ok)throw new Error(r?.error||'Stress restore failed.');
    }catch(e){errors.push(String(e.message||e))}
  }
  return errors;
}
function showConsole(msg,kind='warn'){const el=$('consoleResult');if(!el)return;el.textContent=msg;el.className='notice '+kind}
async function undoSimpleCloseout(c,b){
  const tx=c?.audit?.transactionId;if(!tx)return;
  if(!confirm(`UNDO CLOSEOUT for ${c.title}?\n\nThis restores the audited contract closeout and also reverses any linked +1 Stress posted by the simple between-session resolver.\n\nIf later campaign state changed, automatic undo will stop rather than overwrite it.`))return;
  const old=b.textContent;b.disabled=true;b.textContent='UNDOING…';if($('status'))$('status').textContent='UNDOING AUDITED BETWEEN-SESSION CLOSEOUT…';
  let undone=[];
  try{
    const linked=await linkedStressHistory(c);
    for(const item of linked){const r=await jsonp('wardenadjustundo',{session:session(),transaction:item.transactionId});if(!r?.ok)throw Object.assign(new Error(r?.error||'Linked Stress undo failed.'),{undone,linked});undone.push(item)}
    const r=await jsonp('wardenundo',{session:session(),transaction:tx});
    if(!r?.ok){const restoreErrors=await reapplyStress(undone,c);const suffix=restoreErrors.length?' Stress restoration also failed: '+restoreErrors.join(' | '):' Linked Stress was restored.';throw new Error((r?.error||r?.message||'Closeout Undo failed.')+suffix)}
    showConsole(`CLOSEOUT UNDONE\n\n${c.title}\nRestored status: ${r.restoredStatus||'pre-closeout state'}\nRemoved payout rows: ${Number(r.removedPayoutRows)||0}\nReverted linked Stress adjustments: ${undone.length}`,'ok');
    setTimeout(()=>$('refresh')?.click(),250);
  }catch(e){
    if(e?.linked&&Array.isArray(e.undone)&&e.undone.length){const restoreErrors=await reapplyStress(e.undone,c);if(restoreErrors.length)e.message+=' Stress restoration also failed: '+restoreErrors.join(' | ')}
    showConsole(String(e.message||e),'bad');if($('status'))$('status').textContent='UNDO STOPPED';b.disabled=false;b.textContent=old;
  }
}

function onClickCapture(e){
  const resolve=e.target.closest('[data-r]');
  if(resolve){
    const card=resolve.closest('article.card'),row=rowForCard(card);if(kindForRow(row)!=='simple'){resetFlow();return}
    let c=activeContractForButton(resolve);
    if(!c){loadFeed().then(()=>{c=activeContractForButton(resolve);if(c)setTimeout(()=>prepareSimpleFlow(resolve,c,row),90)});return}
    setTimeout(()=>prepareSimpleFlow(resolve,c,row),90);return;
  }
  const undo=e.target.closest('[data-undo]');
  if(undo){
    const idx=Number(undo.dataset.undo),c=FLOW.feed?.history?.[idx]||null,row=rowForContract(c);if(c&&kindForRow(row)==='simple'){
      e.preventDefault();e.stopImmediatePropagation();undoSimpleCloseout(c,undo);return;
    }
  }
  if(e.target.closest('#x,#cancel,#lock,#playerPage'))resetFlow();
  if(e.target.closest('#refresh'))setTimeout(()=>{loadFeed();schedule()},350);
}

function installStatusWatch(){
  const status=$('cstatus');if(!status||status.dataset.bswWatch==='1')return;status.dataset.bswWatch='1';status.addEventListener('change',()=>{
    if(!FLOW.active)return;FLOW.applyStress=upper(status.value)==='COMPLETED';
    if(!FLOW.applyStress){setCompact(false);if($('commit'))$('commit').textContent='COMMIT CLOSEOUT';const box=$('bswGenerated');if(box){box.insertAdjacentHTML('beforeend','<div class="notice warn" style="margin-top:10px">Automatic +1 Stress is linked only to the generated Completed closeout. Review this non-standard result in the full closeout form.</div>')}}
  });
}

installStyles();installGeneratedPanel();installCloseoutInterceptor();installStatusWatch();run();loadFeed();
const cards=$('cards');if(cards)new MutationObserver(schedule).observe(cards,{childList:true,subtree:true});
document.addEventListener('click',onClickCapture,true);
const modal=$('modal');if(modal)new MutationObserver(()=>{installGeneratedPanel();installStatusWatch();if(modal.classList.contains('hidden'))resetFlow()}).observe(modal,{attributes:true,attributeFilter:['class']});
setTimeout(()=>{schedule();loadFeed()},500);setTimeout(schedule,1200);
})();
