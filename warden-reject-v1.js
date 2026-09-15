(() => {
'use strict';

const API='https://script.google.com/macros/s/AKfycbzeW8vTooOCNEBia3_EMQ10r7BcbakXIwCD4ZaEOUEBOdCXl09tRHj76oxcUcsOKQK0/exec';
const SESSION_KEY='mothership_hub_warden_session_v1';

function jsonp(action, params={}) {
  return new Promise((resolve,reject)=>{
    const callback='__wardenReject'+Date.now()+Math.random().toString(36).slice(2);
    const script=document.createElement('script');
    const timer=setTimeout(()=>finish(new Error('Warden service timed out.')),15000);
    function finish(error,payload){
      clearTimeout(timer);
      try{delete window[callback]}catch(_){window[callback]=undefined}
      script.remove();
      error?reject(error):resolve(payload);
    }
    window[callback]=payload=>finish(null,payload);
    script.onerror=()=>finish(new Error('Warden service unavailable.'));
    const query=new URLSearchParams({action,callback,_:String(Date.now()),...params});
    script.src=API+'?'+query.toString();
    document.head.appendChild(script);
  });
}

function showResult(message,kind='ok') {
  const el=document.getElementById('consoleResult');
  if(!el) return;
  el.textContent=message;
  el.classList.remove('hidden','ok','bad','warn');
  el.classList.add(kind);
}

function contractIdFromCard(card) {
  const firstMeta=card.querySelector('.meta');
  const text=String(firstMeta?.textContent||'').trim();
  return text.split('·')[0].trim();
}

async function rejectMission(card,button) {
  const title=String(card.querySelector('.title')?.textContent||'this mission').trim();
  const contract=contractIdFromCard(card);
  const session=localStorage.getItem(SESSION_KEY)||'';

  if(!session) {
    showResult('WARDEN AUTHENTICATION REQUIRED.','bad');
    return;
  }
  if(!contract) {
    showResult('MISSION REJECTION ERROR // Contract identifier unavailable.','bad');
    return;
  }

  const confirmed=window.confirm(
    `Reject ${title}?\n\n`+
    'This cancels the current crew acceptance and returns the mission to the public board.\n\n'+
    'This is only allowed before closeout or payment processing has begun.'
  );
  if(!confirmed) return;

  const oldText=button.textContent;
  button.disabled=true;
  button.textContent='REJECTING…';
  const status=document.getElementById('status');
  if(status) status.textContent='REJECTING ACCEPTED MISSION…';

  try {
    const response=await jsonp('wardenreject',{session,contract});
    if(!response?.ok) throw new Error(response?.error||response?.message||'Mission rejection failed.');
    showResult(
      `MISSION REJECTED\n\n${response.title||title}\nReturned to the public Mission Board.`,
      'ok'
    );
    const refresh=document.getElementById('refresh');
    if(refresh) refresh.click();
    else window.location.reload();
  } catch(error) {
    const message=String(error?.message||error);
    showResult(
      /unknown.*action/i.test(message)
        ? 'MISSION REJECTION BACKEND NOT DEPLOYED // The Warden control is installed, but the contract service still needs the rejection endpoint.'
        : message,
      'bad'
    );
    if(status) status.textContent='WARDEN SERVICE ERROR';
  } finally {
    button.disabled=false;
    button.textContent=oldText;
  }
}

function attachRejectButtons() {
  document.querySelectorAll('#cards article.card').forEach(card=>{
    if(card.querySelector('[data-warden-reject]')) return;
    const resolve=card.querySelector('[data-r]');
    if(!resolve) return;

    const button=document.createElement('button');
    button.type='button';
    button.className='btn danger';
    button.dataset.wardenReject='1';
    button.textContent='REJECT MISSION';
    button.title='Cancel this acceptance and return the mission to the public board.';
    button.addEventListener('click',()=>rejectMission(card,button));

    const actionHost=resolve.parentElement;
    if(actionHost) {
      actionHost.style.display='flex';
      actionHost.style.gap='8px';
      actionHost.style.flexWrap='wrap';
      actionHost.appendChild(button);
    }
  });
}

const cards=document.getElementById('cards');
if(cards) new MutationObserver(attachRejectButtons).observe(cards,{childList:true,subtree:true});
attachRejectButtons();

if(!document.getElementById('wardenBetweenSessionWorkflowScript')){
  const s=document.createElement('script');
  s.id='wardenBetweenSessionWorkflowScript';
  s.src='warden-between-session-v1.js?v=20260915a';
  s.defer=true;
  document.head.appendChild(s);
}
})();
