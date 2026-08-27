(() => {
  'use strict';

  const API = 'https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
  const SESSION_KEY = 'mothership_hub_warden_session_v1';
  const STATE = { feed:null, contacts:[], exclusions:[], current:null, mode:'close', priorContacts:[], backendReady:false, loading:false };
  const $ = id => document.getElementById(id);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function versionAtLeast(v, target) {
    const a=String(v||'0').split('.').map(Number), b=String(target||'0').split('.').map(Number);
    for(let i=0;i<Math.max(a.length,b.length);i++){const x=a[i]||0,y=b[i]||0;if(x>y)return true;if(x<y)return false}
    return true;
  }

  function invalidate(){const c=$('commit');if(c)c.disabled=true;const d=$('details');if(d)d.classList.add('hidden')}

  function installStyles(){
    if($('wardenV17Styles'))return;
    const s=document.createElement('style');s.id='wardenV17Styles';s.textContent=`
      #contactRewardsBox{grid-column:1/-1;border:1px solid var(--line);background:var(--panel2);padding:12px;margin:2px 0 4px}
      .contactReward{border-top:1px solid #303538;padding:12px 0}.contactReward:first-of-type{border-top:0}
      .contactHead{display:flex;gap:8px;align-items:center;justify-content:space-between;margin-bottom:8px}
      .contactGrid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.contactGrid .wide{grid-column:1/-1}
      .contactContext{font-size:12px;color:var(--muted);margin:4px 0 8px}.contactExclusions{font-size:11px;color:var(--muted);margin-top:8px}
      @media(max-width:720px){.contactGrid{grid-template-columns:1fr}.contactGrid .wide{grid-column:1}}
    `;document.head.appendChild(s);
  }

  function installDom(){
    if($('contactRewardsBox'))return;
    const anchor=$('payoutResolutionBox')||$('details');if(!anchor)return;
    const box=document.createElement('div');box.id='contactRewardsBox';
    box.innerHTML=`<div class="label">CONTACTS / FAVORS</div><div class="small">Update an existing canonical contact/favor record. No new contact, favor tier, or relationship system is created.</div><div id="contactRewardList"></div><div style="margin-top:8px"><button id="addContactReward" class="btn secondary" type="button">+ ADD CONTACT / FAVOR</button></div><div id="contactExclusions" class="contactExclusions"></div>`;
    anchor.insertAdjacentElement('afterend',box);
    $('addContactReward')?.addEventListener('click',()=>{addContactRow(null);invalidate()});
  }

  function contactOptions(selected){
    return '<option value="">SELECT EXISTING CONTACT</option>'+STATE.contacts.map(c=>`<option value="${esc(c.name)}"${String(c.name)===String(selected)?' selected':''}>${esc(c.name)} — ${esc(c.faction||'')}</option>`).join('');
  }

  function findContact(name){return STATE.contacts.find(c=>String(c.name)===String(name))||null}

  function setContactDefaults(row,c,keepExisting){
    if(!c)return;
    row.querySelector('.contactContext').textContent=[c.faction,c.role,c.lastContact?`Last contact: ${c.lastContact}`:''].filter(Boolean).join(' · ');
    if(!keepExisting){
      row.querySelector('.contactRelationship').value=c.relationship||'';
      row.querySelector('.contactReliability').value=c.reliability||'';
      row.querySelector('.contactFavor').value=c.favor||'';
      row.querySelector('.contactFavorStatus').value=c.favorStatus||'';
    }
  }

  function addContactRow(prior){
    const list=$('contactRewardList');if(!list)return;
    const row=document.createElement('div');row.className='contactReward';
    row.innerHTML=`<div class="contactHead"><strong>CONTACT / FAVOR UPDATE</strong><button type="button" class="btn secondary contactRemove">REMOVE</button></div>
      <label><span class="label">EXISTING CONTACT</span><select class="select contactName">${contactOptions(prior?.name||prior?.target||'')}</select></label>
      <div class="contactContext"></div>
      <div class="contactGrid">
        <label><span class="label">RELATIONSHIP</span><textarea class="textarea contactRelationship" maxlength="800"></textarea></label>
        <label><span class="label">RELIABILITY</span><textarea class="textarea contactReliability" maxlength="500"></textarea></label>
        <label><span class="label">FAVOR</span><textarea class="textarea contactFavor" maxlength="800"></textarea></label>
        <label><span class="label">FAVOR STATUS</span><input class="input contactFavorStatus" maxlength="160"></label>
        <label class="wide"><span class="label">FACTUAL CHANGE NOTE</span><textarea class="textarea contactNote" maxlength="1200" placeholder="What happened in play that changed this contact/favor record?"></textarea></label>
      </div>`;
    list.appendChild(row);
    const sel=row.querySelector('.contactName');
    sel.addEventListener('change',()=>{setContactDefaults(row,findContact(sel.value),false);invalidate()});
    row.querySelector('.contactRemove').addEventListener('click',()=>{row.remove();invalidate()});
    row.querySelectorAll('input,textarea').forEach(x=>x.addEventListener('input',invalidate));
    if(prior){
      const c=findContact(prior.name||prior.target);setContactDefaults(row,c,true);
      row.querySelector('.contactRelationship').value=prior.relationship||'';
      row.querySelector('.contactReliability').value=prior.reliability||'';
      row.querySelector('.contactFavor').value=prior.favor||'';
      row.querySelector('.contactFavorStatus').value=prior.favorStatus||'';
      row.querySelector('.contactNote').value=prior.note||'';
    }
  }

  function renderContacts(prior=[]){
    const list=$('contactRewardList');if(!list)return;list.innerHTML='';
    const btn=$('addContactReward');if(btn)btn.disabled=!STATE.backendReady||!STATE.contacts.length;
    const ex=$('contactExclusions');if(ex){
      const n=STATE.contacts.length;
      ex.innerHTML=STATE.backendReady?`${n} current contact record(s) available for structured update.`+(STATE.exclusions.length?` Excluded: ${STATE.exclusions.map(x=>`${esc(x.name)} (${esc(x.reason)})`).join('; ')}`:''):'Backend 6.8+ required for structured Contacts/Favors.';
    }
    (prior||[]).forEach(addContactRow);
  }

  function collectContactActions(){
    return [...document.querySelectorAll('.contactReward')].map(row=>({
      type:'CONTACT',name:row.querySelector('.contactName')?.value||'',relationship:row.querySelector('.contactRelationship')?.value||'',reliability:row.querySelector('.contactReliability')?.value||'',favor:row.querySelector('.contactFavor')?.value||'',favorStatus:row.querySelector('.contactFavorStatus')?.value||'',note:row.querySelector('.contactNote')?.value||''
    }));
  }

  function splitRewards(raw){
    let arr=[];try{arr=Array.isArray(raw)?raw:JSON.parse(String(raw||'[]'))}catch(_){arr=[]}
    return {contacts:arr.filter(x=>String(x?.type||'').toUpperCase()==='CONTACT'),base:arr.filter(x=>String(x?.type||'').toUpperCase()!=='CONTACT')};
  }

  function patchScript(script){
    if(!(script instanceof HTMLScriptElement)||!script.src)return;
    let url,api;try{url=new URL(script.src,location.href);api=new URL(API)}catch(_){return}
    if(url.origin!==api.origin||url.pathname!==api.pathname)return;
    const action=String(url.searchParams.get('action')||'').toLowerCase(), cb=url.searchParams.get('callback');
    if(STATE.backendReady&&['wardenpreview','wardenclose','wardenamend'].includes(action)){
      const split=splitRewards(url.searchParams.get('rewards')||'[]');
      url.searchParams.set('rewards',JSON.stringify(split.base.concat(collectContactActions())));script.src=url.toString();
    }
    if(!cb)return;const original=window[cb];if(typeof original!=='function'||original.__wardenV17Wrapped)return;
    const wrapped=payload=>{
      if(action==='wardenfeed'&&payload?.ok){
        STATE.feed=payload;STATE.backendReady=versionAtLeast(payload.serviceVersion,'6.8');
        const opts=payload.rewardOptions||{};STATE.contacts=Array.isArray(opts.contacts)?opts.contacts:[];STATE.exclusions=Array.isArray(opts.contactExclusions)?opts.contactExclusions:[];
      }
      if(action==='wardenfeed'&&payload?.ok&&Array.isArray(payload.history)){
        payload.history.forEach(h=>{if(h?.audit?.structuredRewards){const s=splitRewards(h.audit.structuredRewards);h.__wv17Contacts=s.contacts;h.audit.structuredRewards=s.base}});
      }
      original(payload);
      if(action==='wardenfeed'&&payload?.ok)setTimeout(()=>renderContacts([]),0);
    };wrapped.__wardenV17Wrapped=true;window[cb]=wrapped;
  }

  function installInterceptor(){const prev=Node.prototype.appendChild;if(prev.__wardenV17Patched)return;function patched(node){patchScript(node);return prev.call(this,node)}patched.__wardenV17Patched=true;Node.prototype.appendChild=patched}

  function ownJsonp(action,p={}){return new Promise((resolve,reject)=>{const cb='__wv17'+Date.now()+Math.random().toString(36).slice(2),sc=document.createElement('script');const timer=setTimeout(()=>done(new Error('Warden service timed out.')),30000);function done(err,data){clearTimeout(timer);try{delete window[cb]}catch(_){window[cb]=undefined}sc.remove();err?reject(err):resolve(data)}window[cb]=d=>done(null,d);sc.onerror=()=>done(new Error('Could not reach Warden service.'));sc.src=API+'?'+new URLSearchParams({action,callback:cb,...p});document.head.appendChild(sc)})}

  async function refreshOwnFeed(){if(STATE.loading)return;const session=localStorage.getItem(SESSION_KEY)||'';if(!session)return;STATE.loading=true;try{const r=await ownJsonp('wardenfeed',{session});if(r?.ok){STATE.feed=r;STATE.backendReady=versionAtLeast(r.serviceVersion,'6.8');const o=r.rewardOptions||{};STATE.contacts=Array.isArray(o.contacts)?o.contacts:[];STATE.exclusions=Array.isArray(o.contactExclusions)?o.contactExclusions:[];renderContacts([])}}catch(_){}finally{STATE.loading=false}}

  function watchClicks(){
    document.addEventListener('click',e=>{
      const r=e.target.closest('[data-r]');if(r){STATE.current=STATE.feed?.active?.[Number(r.dataset.r)]||null;STATE.mode='close';setTimeout(()=>renderContacts([]),0);return}
      const a=e.target.closest('[data-amend]');if(a){const h=STATE.feed?.history?.[Number(a.dataset.amend)]||null;STATE.current=h;STATE.mode='amend';const prior=h?.__wv17Contacts||[];setTimeout(()=>renderContacts(prior),0);return}
      if(e.target.closest('#x,#cancel,#lock,#playerPage')){STATE.current=null;STATE.mode='close';renderContacts([])}
      if(e.target.closest('#refresh'))setTimeout(refreshOwnFeed,300);
    },true);
  }

  installStyles();installDom();installInterceptor();watchClicks();setTimeout(refreshOwnFeed,300);
})();
