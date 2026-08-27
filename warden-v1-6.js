(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_warden_session_v1';
  const STATE = { feed:null, current:null, mode:'close', backendReady:false, loading:false };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => (Number(n)||0).toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:2})+'cr';

  function versionAtLeast(v, target) {
    const a=String(v||'0').split('.').map(Number), b=String(target||'0').split('.').map(Number);
    for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x>y)return true;if(x<y)return false}
    return true;
  }

  function invalidate() {
    const commit=$('commit'); if(commit) commit.disabled=true;
    const details=$('details'); if(details) details.classList.add('hidden');
  }

  function installStyles() {
    if ($('wardenV16Styles')) return;
    const style=document.createElement('style');
    style.id='wardenV16Styles';
    style.textContent=`
      #payoutResolutionBox{grid-column:1/-1;border:1px solid var(--line);background:var(--panel2);padding:12px;margin:2px 0 4px}
      .paycomp{display:grid;grid-template-columns:minmax(180px,1fr) 145px;gap:10px;align-items:start;padding:10px 0;border-top:1px solid #303538}
      .paycomp:first-child{border-top:0}
      .paycomp .amount{font-weight:700;color:var(--text);white-space:nowrap}
      .paycomp select{width:100%}
      .payout-mode{margin-top:10px;padding-top:10px;border-top:1px solid var(--line)}
      .payout-manual{margin-top:10px}
      .payout-summary{margin-top:8px;font-size:12px;color:var(--muted)}
      .payout-pending{color:#d4a84b}
      @media(max-width:720px){.paycomp{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function installDom() {
    if ($('payoutResolutionBox')) return;
    const gross=$('gross');
    if (!gross || !gross.parentElement) return;
    const box=document.createElement('div');
    box.id='payoutResolutionBox';
    box.innerHTML='<div class="label">CONTRACTUAL PAYOUT RESOLUTION</div><div id="payoutResolutionBody" class="small">Backend 6.7+ required for structured payout resolution.</div>';
    gross.parentElement.insertAdjacentElement('beforebegin',box);
    const sub=document.querySelector('header .sub');
    if(sub) sub.textContent='Private campaign administration — closeout v1.6 // contractual payout resolution & audited campaign effects';
  }

  function grossLabel() {
    const gross=$('gross');
    return gross?.parentElement?.querySelector('.label') || null;
  }

  function componentDecisionsFromAudit(c) {
    const basis=c?.audit?.payoutBasis || {};
    const map={};
    if(String(basis.mode||'').toUpperCase()==='STRUCTURED' && Array.isArray(basis.components)) {
      basis.components.forEach(x=>{ if(x?.id) map[String(x.id).toUpperCase()]=x.earned?'EARNED':'NOT_EARNED'; });
    }
    return {map,basis};
  }

  function renderPayout(c, mode) {
    STATE.current=c||null; STATE.mode=mode||'close';
    const body=$('payoutResolutionBody'), gross=$('gross');
    if(!body||!gross) return;
    if(!STATE.backendReady) {
      body.innerHTML='<div class="small">Structured payout resolution is waiting for backend 6.7. Existing closeout behavior remains available.</div>';
      gross.readOnly=false; gross.disabled=false;
      const gl=grossLabel(); if(gl) gl.textContent='GROSS AUTHORIZED PAYOUT (CR)';
      return;
    }

    const components=Array.isArray(c?.payoutComponents)?c.payoutComponents:[];
    const prior=componentDecisionsFromAudit(c);
    const priorMode=String(prior.basis?.mode||'').toUpperCase();
    const priorReason=String(prior.basis?.reason||'');
    const priorGross=Number(c?.audit?.grossPayout);

    if(components.length) {
      gross.readOnly=true; gross.disabled=false;
      const gl=grossLabel(); if(gl) gl.textContent='CALCULATED GROSS PAYOUT (CR)';
      const rows=components.map(x=>{
        const id=String(x.id||'').toUpperCase();
        const decision=mode==='amend'?(prior.map[id]||'UNREVIEWED'):'UNREVIEWED';
        return `<div class="paycomp" data-payout-id="${esc(id)}" data-amount="${esc(x.amount)}">
          <div><strong>${esc(x.label||id)}</strong> <span class="amount">${esc(money(x.amount))}</span>
          <div class="small">${esc(x.kind||'COMPONENT')}${x.criteria?` · ${esc(x.criteria)}`:''}</div></div>
          <select class="select payoutDecision" aria-label="${esc(x.label||id)} payout decision">
            <option value="UNREVIEWED"${decision==='UNREVIEWED'?' selected':''}>UNREVIEWED</option>
            <option value="EARNED"${decision==='EARNED'?' selected':''}>EARNED</option>
            <option value="NOT_EARNED"${decision==='NOT_EARNED'?' selected':''}>NOT EARNED</option>
          </select>
        </div>`;
      }).join('');
      body.innerHTML=`<div class="small">Resolve every contractual pay component explicitly. Gross payout is calculated from components marked EARNED.</div>
        <div id="payoutComponents">${rows}</div>
        <div class="payout-mode"><label><input id="manualPayoutOverride" type="checkbox"${priorMode==='MANUAL_OVERRIDE'?' checked':''}> USE MANUAL PAYOUT OVERRIDE</label>
        <div class="small">Use only when the written contract cannot represent the actual authorized closeout. A reason is retained in the Warden audit.</div></div>
        <div id="payoutManualFields" class="payout-manual hidden"><label><span class="label">MANUAL PAYOUT BASIS / AUDIT REASON</span><textarea id="manualPayoutReason" class="textarea" maxlength="800" style="min-height:70px">${esc(priorMode==='MANUAL_OVERRIDE'?priorReason:'')}</textarea></label></div>
        <div id="payoutDecisionSummary" class="payout-summary"></div>`;
      if(priorMode==='MANUAL_OVERRIDE' && Number.isFinite(priorGross)) gross.value=String(priorGross);
    } else {
      gross.readOnly=false; gross.disabled=false;
      const gl=grossLabel(); if(gl) gl.textContent='GROSS AUTHORIZED PAYOUT (CR)';
      body.innerHTML=`<div class="small">This contract has no machine-readable payout components. Gross remains a deliberate Warden entry, but the basis is required and audited.</div>
        <div class="payout-manual"><label><span class="label">MANUAL PAYOUT BASIS / AUDIT REASON</span><textarea id="manualPayoutReason" class="textarea" maxlength="800" style="min-height:70px">${esc(mode==='amend'?priorReason:'')}</textarea></label></div>`;
    }

    bindPayoutControls();
    recalcStructured();
  }

  function bindPayoutControls() {
    document.querySelectorAll('.payoutDecision').forEach(x=>x.addEventListener('change',()=>{recalcStructured();invalidate()}));
    const override=$('manualPayoutOverride');
    if(override) override.addEventListener('change',()=>{recalcStructured();invalidate()});
    const reason=$('manualPayoutReason');
    if(reason) reason.addEventListener('input',invalidate);
  }

  function recalcStructured() {
    const gross=$('gross'), override=$('manualPayoutOverride'), manual=$('payoutManualFields'), summary=$('payoutDecisionSummary');
    if(!gross) return;
    const components=[...document.querySelectorAll('.paycomp')];
    if(!components.length) return;
    const manualMode=Boolean(override?.checked);
    if(manual) manual.classList.toggle('hidden',!manualMode);
    gross.readOnly=!manualMode;
    if(manualMode) {
      if(summary) summary.textContent='MANUAL OVERRIDE ACTIVE — gross is entered directly and requires an audit reason.';
      return;
    }
    let total=0, pending=0;
    components.forEach(row=>{
      const decision=row.querySelector('.payoutDecision')?.value||'UNREVIEWED';
      if(decision==='EARNED') total+=Number(row.dataset.amount)||0;
      if(decision==='UNREVIEWED') pending++;
    });
    gross.value=String(Math.round(total*100)/100);
    gross.dispatchEvent(new Event('input',{bubbles:true}));
    if(summary) {
      summary.className='payout-summary'+(pending?' payout-pending':'');
      summary.textContent=pending?`${pending} component(s) still UNREVIEWED. Current earned total: ${money(total)}.`:`All components reviewed. Calculated gross: ${money(total)}.`;
    }
  }

  function collectPayoutBasis() {
    const c=STATE.current, components=Array.isArray(c?.payoutComponents)?c.payoutComponents:[];
    const reason=String($('manualPayoutReason')?.value||'').trim();
    if(components.length) {
      if($('manualPayoutOverride')?.checked) return {mode:'MANUAL_OVERRIDE',reason};
      const reviewedIds=[], earnedIds=[];
      document.querySelectorAll('.paycomp').forEach(row=>{
        const id=String(row.dataset.payoutId||'').toUpperCase();
        const decision=row.querySelector('.payoutDecision')?.value||'UNREVIEWED';
        if(decision!=='UNREVIEWED') reviewedIds.push(id);
        if(decision==='EARNED') earnedIds.push(id);
      });
      return {mode:'STRUCTURED',reviewedIds,earnedIds};
    }
    return {mode:'MANUAL',reason};
  }

  function appendPreview(payload) {
    const details=$('details');
    if(!details || !payload?.ok) return;
    const summary=Array.isArray(payload.payoutBasisSummary)?payload.payoutBasisSummary:[];
    if(!summary.length) return;
    const old=$('payoutBasisPreview'); if(old) old.remove();
    const box=document.createElement('div');
    box.id='payoutBasisPreview'; box.className='review';
    box.innerHTML='<div class="label">CONTRACTUAL PAYOUT BASIS</div><ul>'+summary.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
    details.insertAdjacentElement('afterbegin',box);
  }

  function patchScript(script) {
    if(!(script instanceof HTMLScriptElement)||!script.src) return;
    let url, api;
    try{url=new URL(script.src,location.href);api=new URL(API)}catch(_){return}
    if(url.origin!==api.origin||url.pathname!==api.pathname) return;
    const action=String(url.searchParams.get('action')||'').toLowerCase();
    const callbackName=url.searchParams.get('callback');

    if(STATE.backendReady && ['wardenpreview','wardenclose','wardenamend'].includes(action) && STATE.current) {
      const basis=collectPayoutBasis();
      url.searchParams.set('payoutBasis',JSON.stringify(basis));
      url.searchParams.set('manualPayoutReason',String($('manualPayoutReason')?.value||''));
      script.src=url.toString();
    }

    if(!callbackName) return;
    const original=window[callbackName];
    if(typeof original!=='function'||original.__wardenV16Wrapped) return;
    const wrapped=payload=>{
      if(action==='wardenfeed'&&payload?.ok) {
        STATE.feed=payload;
        STATE.backendReady=versionAtLeast(payload.serviceVersion,'6.7');
      }
      original(payload);
      if((action==='wardenpreview')&&payload?.ok) setTimeout(()=>appendPreview(payload),0);
    };
    wrapped.__wardenV16Wrapped=true;
    window[callbackName]=wrapped;
  }

  function installInterceptor() {
    const prev=Node.prototype.appendChild;
    if(prev.__wardenV16Patched) return;
    function patched(node){patchScript(node);return prev.call(this,node)}
    patched.__wardenV16Patched=true;
    Node.prototype.appendChild=patched;
  }

  function ownJsonp(action,p={}) {
    return new Promise((resolve,reject)=>{
      const cb='__wv16'+Date.now()+Math.random().toString(36).slice(2), sc=document.createElement('script');
      const timer=setTimeout(()=>done(new Error('Warden service timed out.')),30000);
      function done(err,data){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(data)}
      window[cb]=d=>done(null,d); sc.onerror=()=>done(new Error('Could not reach Warden service.'));
      sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p}); document.head.appendChild(sc);
    });
  }

  async function refreshOwnFeed() {
    if(STATE.loading) return;
    const session=localStorage.getItem(SESSION_KEY)||''; if(!session) return;
    STATE.loading=true;
    try{
      const r=await ownJsonp('wardenfeed',{session});
      if(r?.ok){STATE.feed=r;STATE.backendReady=versionAtLeast(r.serviceVersion,'6.7')}
    }catch(_){}finally{STATE.loading=false}
  }

  function watchClicks() {
    document.addEventListener('click',e=>{
      const resolve=e.target.closest('[data-r]');
      if(resolve){const idx=Number(resolve.dataset.r);STATE.current=STATE.feed?.active?.[idx]||null;STATE.mode='close';setTimeout(()=>renderPayout(STATE.current,'close'),0);return}
      const amend=e.target.closest('[data-amend]');
      if(amend){const idx=Number(amend.dataset.amend);STATE.current=STATE.feed?.history?.[idx]||null;STATE.mode='amend';setTimeout(()=>renderPayout(STATE.current,'amend'),0);return}
      if(e.target.closest('#x,#cancel,#lock,#playerPage')){STATE.current=null;STATE.mode='close'}
      if(e.target.closest('#refresh')) setTimeout(refreshOwnFeed,300);
    },true);
  }

  installStyles();
  installDom();
  installInterceptor();
  watchClicks();
  setTimeout(refreshOwnFeed,250);
})();
